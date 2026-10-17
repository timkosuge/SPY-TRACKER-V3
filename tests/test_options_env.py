import math
import sqlite3
import sys
import unittest

sys.path.insert(0, ".")
import generate_options_env as O


class Measures(unittest.TestCase):
    def test_realized_volatility_is_annualized_from_closes(self):
        closes = [100 * (1.01 ** i) for i in range(30)]
        self.assertAlmostEqual(O.realized(closes, 20), 0.0, places=6)
        alt = [100, 101, 100, 101, 100, 101]
        self.assertGreater(O.realized(alt, 5), 10)

    def test_percentile_rank(self):
        self.assertEqual(O.pct_rank([1, 2, 3, 4], 3), 50.0)
        self.assertEqual(O.pct_rank([1, 2, 3, 4], 5), 100.0)
        self.assertIsNone(O.pct_rank([1, 2], None))


class Build(unittest.TestCase):
    def frame(self, vix_level, drift):
        conn = sqlite3.connect(":memory:")
        self.addCleanup(conn.close)
        conn.execute("CREATE TABLE daily_ohlcv (date TEXT, open REAL, high REAL, low REAL, close REAL, volume INTEGER)")
        conn.execute("CREATE TABLE vix_daily (date TEXT PRIMARY KEY, open REAL, high REAL, low REAL, close REAL)")
        conn.execute("CREATE TABLE vol_term_daily (date TEXT PRIMARY KEY, vix9d REAL, vix REAL, vix3m REAL, vvix REAL)")
        conn.execute("CREATE TABLE weekly_em (week_start TEXT, static_wem_high REAL, static_wem_low REAL, week_open REAL, week_high REAL, week_low REAL, week_close REAL, static_band_status TEXT)")
        px = 100.0
        for i in range(120):
            d = f"2026-{i // 28 + 1:02d}-{i % 28 + 1:02d}"
            px *= (1 + (drift if i % 2 == 0 else -drift))
            conn.execute("INSERT INTO daily_ohlcv VALUES (?,?,?,?,?,0)", (d, px, px * 1.002, px * 0.998, px))
            conn.execute("INSERT INTO vix_daily VALUES (?,?,?,?,?)", (d, 0, 0, 0, vix_level))
            conn.execute("INSERT INTO vol_term_daily VALUES (?,?,?,?,?)", (d, vix_level - 2, vix_level, vix_level + 3, 90))
        return conn

    def test_premium_is_implied_minus_the_volatility_that_followed(self):
        conn = self.frame(30.0, 0.001)
        o = O.build(conn)
        self.assertGreater(o["premium"]["all"]["median_premium"], 20)
        self.assertEqual(o["premium"]["all"]["overpriced"]["rate"], 100.0)
        self.assertEqual(o["today"]["term_shape"], "upward")

    def test_cheap_when_realized_exceeds_implied(self):
        conn = self.frame(8.0, 0.02)
        o = O.build(conn)
        self.assertLess(o["premium"]["all"]["median_premium"], 0)
        self.assertEqual(o["premium"]["all"]["overpriced"]["rate"], 0.0)

    def test_chain_buckets_report_the_spread_as_a_percent_of_price(self):
        conn = self.frame(16.0, 0.003)
        conn.execute("CREATE TABLE option_chain (captured_at TEXT, session_date TEXT, spot REAL, expiry TEXT, cp TEXT, strike REAL, bid REAL, ask REAL, iv REAL, open_interest INTEGER, volume INTEGER, gamma REAL)")
        rows = [("2026-09-18T10:02:00-04:00", "2026-09-18", 100.0, "2026-09-22", "C", 100.0, 1.00, 1.10, 0.18, 500, 10, 0.01) for _ in range(6)]
        conn.executemany("INSERT INTO option_chain VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", rows)
        o = O.build(conn)
        b = o["chain"]["buckets"]["2 to 4|at the money"]
        self.assertAlmostEqual(b["median_spread_pct"], 9.5, places=1)
        self.assertEqual(b["median_open_interest"], 500)

    def test_verdicts_name_the_state_and_never_invent_a_chain(self):
        conn = self.frame(30.0, 0.001)
        v = O.verdicts(O.build(conn))
        topics = [x["topic"] for x in v]
        self.assertIn("How often the index charges more than SPY delivers", topics)
        self.assertTrue(any("Chain pricing appears once" in x["text"] for x in v))


if __name__ == "__main__":
    unittest.main()



class SpreadHistory(Build):
    def test_history_runs_to_the_last_session(self):
        conn = self.frame(16.0, 0.003)
        o = O.build(conn)
        h = o["history"]
        self.assertGreater(len(h["days"]), 50)
        self.assertEqual(h["days"][-1]["d"], o["as_of"])

    def test_history_carries_the_date_the_spread_and_its_two_sides(self):
        o = O.build(self.frame(16.0, 0.003))
        self.assertEqual(sorted(o["history"]["days"][0].keys()), ["d", "i", "r", "s"])

    def test_the_spread_is_what_is_charged_less_what_was_delivered(self):
        d = O.build(self.frame(16.0, 0.003))["history"]["days"][-1]
        self.assertAlmostEqual(d["s"], d["i"] - d["r"], places=2)

    def test_history_days_are_in_order(self):
        o = O.build(self.frame(16.0, 0.003))
        ds = [r["d"] for r in o["history"]["days"]]
        self.assertEqual(ds, sorted(ds))

    def test_the_cheap_band_sits_below_the_expensive_band(self):
        o = O.build(self.frame(16.0, 0.003))
        h = o["history"]
        self.assertLessEqual(h["cheap_at_or_below"], h["expensive_at_or_above"])

    def test_the_spread_matches_implied_minus_trailing_realized(self):
        conn = self.frame(16.0, 0.003)
        o = O.build(conn)
        last = o["history"]["days"][-1]
        self.assertAlmostEqual(last["s"], o["today"]["spread"], places=2)


class CostToHold(Build):
    def test_at_the_money_delta_is_about_half_and_theta_is_negative(self):
        from stats_helpers import delta_theta
        d, t = delta_theta(100.0, 100.0, 0.20, 30 / 365.0, True)
        self.assertAlmostEqual(d, 0.5, places=1)
        self.assertLess(t, 0)
        dp, tp = delta_theta(100.0, 100.0, 0.20, 30 / 365.0, False)
        self.assertAlmostEqual(dp, -0.5, places=1)
        self.assertAlmostEqual(t, tp, places=6)

    def test_delta_theta_refuses_a_contract_with_no_time_or_no_volatility(self):
        from stats_helpers import delta_theta
        self.assertIsNone(delta_theta(100.0, 100.0, 0.20, 0, True))
        self.assertIsNone(delta_theta(100.0, 100.0, 0.0, 0.1, True))

    def chain_conn(self):
        conn = self.frame(16.0, 0.003)
        conn.execute("CREATE TABLE option_chain (captured_at TEXT, session_date TEXT, spot REAL, expiry TEXT, cp TEXT, strike REAL, bid REAL, ask REAL, iv REAL, open_interest INTEGER, volume INTEGER, gamma REAL)")
        rows = []
        for expiry in ("2026-04-30", "2026-05-28"):
            for cp in ("C", "P"):
                for k in (100.0, 100.5):
                    rows += [("2026-04-28T12:00:00-04:00", "2026-04-28", 100.0, expiry, cp, k, 1.00, 1.10, 0.15, 500, 10, 0.01)] * 3
        conn.executemany("INSERT INTO option_chain VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", rows)
        return conn

    def test_breakeven_is_reported_in_cents_for_each_expiry(self):
        o = O.build(self.chain_conn())
        be = o["cost_to_hold"]["breakeven_cents_per_hour"]
        self.assertEqual(sorted(be), [2, 30])
        self.assertTrue(all(v > 0 for v in be.values()))

    def test_the_nearer_expiry_costs_more_per_hour_to_hold(self):
        be = O.build(self.chain_conn())["cost_to_hold"]["breakeven_cents_per_hour"]
        self.assertGreater(be[2], be[30])

    def test_the_nearest_expiry_is_the_one_reported(self):
        c = O.build(self.chain_conn())["cost_to_hold"]
        self.assertEqual(c["nearest_expiry_days"], 2)

    def test_cost_to_hold_survives_a_database_with_no_minute_bars(self):
        c = O.build(self.chain_conn())["cost_to_hold"]
        self.assertIsNone(c["typical_hourly_move_dollars"])
        self.assertIsNone(c.get("share_of_hour_eaten_pct"))

    def test_cost_to_hold_is_present_without_a_chain(self):
        c = O.build(self.frame(16.0, 0.003))["cost_to_hold"]
        self.assertIsNone(c["breakeven_cents_per_hour"])
        self.assertIsNone(c["nearest_expiry_days"])

    def test_the_headline_dollars_are_the_close_times_the_percentages(self):
        t = O.build(self.frame(16.0, 0.003))["today"]
        self.assertAlmostEqual(t["priced_dollars"], t["close"] * t["typical_move_priced_pct"] / 100, places=1)
        self.assertAlmostEqual(t["delivered_dollars"], t["close"] * t["delivered_daily_move_pct"] / 100, places=1)
        self.assertAlmostEqual(t["gap_dollars"], t["priced_dollars"] - t["delivered_dollars"], places=1)


class Grid(Build):
    def chain(self, spread=0.02, stale_strike=None):
        conn = self.frame(16.0, 0.003)
        conn.execute("CREATE TABLE option_chain (captured_at TEXT, session_date TEXT, spot REAL, expiry TEXT, cp TEXT, strike REAL, bid REAL, ask REAL, iv REAL, open_interest INTEGER, volume INTEGER, gamma REAL)")
        rows = []
        for expiry in ("2026-04-30", "2026-05-02"):
            for cp in ("C", "P"):
                for k in range(93, 108):
                    s = 1.00 if k == stale_strike else spread
                    rows.append(("2026-04-28T12:00:00-04:00", "2026-04-28", 100.0, expiry, cp, float(k), 1.00, 1.00 + s, 0.15, 500, 10, 0.01))
        conn.executemany("INSERT INTO option_chain VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", rows)
        return conn

    def test_price_is_intrinsic_once_there_is_no_time_left(self):
        self.assertAlmostEqual(O.bs_price(105.0, 100.0, 0.2, 0, True), 5.0)
        self.assertAlmostEqual(O.bs_price(105.0, 100.0, 0.2, 0, False), 0.0)

    def test_a_longer_hold_needs_a_bigger_move(self):
        one = O.breakeven_move(100.0, 100.0, 0.15, 5, True, 0.02)
        four = O.breakeven_move(100.0, 100.0, 0.15, 5, True, 0.02, hours=4)
        self.assertGreater(four, one)

    def test_a_wider_spread_needs_a_bigger_move(self):
        tight = O.breakeven_move(100.0, 100.0, 0.15, 5, True, 0.02)
        wide = O.breakeven_move(100.0, 100.0, 0.15, 5, True, 0.20)
        self.assertGreater(wide, tight)

    def test_the_grid_carries_only_the_side_a_directional_buyer_would_use(self):
        g = O.build(self.chain())["grid"]
        self.assertEqual(len(g["calls"][0]["cells"]), O.GRID_STRIKES + 1)
        self.assertEqual(len(g["puts"][0]["cells"]), O.GRID_STRIKES + 1)
        self.assertTrue(all(c is None or c > 0 for r in g["calls"] for c in r["cells"]))

    def test_further_from_the_money_costs_more(self):
        g = O.build(self.chain())["grid"]
        cells = [c for c in g["calls"][0]["cells"] if c is not None]
        self.assertGreater(cells[-1], cells[0])

    def test_a_stale_quote_is_left_blank_rather_than_coloured_expensive(self):
        g = O.build(self.chain(stale_strike=103))["grid"]
        self.assertGreater(g["stale"], 0)
        self.assertIsNone(g["calls"][0]["cells"][3])

    def test_the_grid_is_absent_without_a_chain(self):
        self.assertIsNone(O.build(self.frame(16.0, 0.003))["grid"])

    def test_the_bands_span_cheap_to_very_expensive_as_implied_rises(self):
        shares = [O.breakeven_move(763.25, 763.0, iv, 3, True, 0.02) / 0.74 * 100 for iv in (0.11, 0.35)]
        self.assertLess(shares[0], O.GRID_BANDS[1])
        self.assertGreater(shares[1], O.GRID_BANDS[-1])
