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
        self.assertIn("What optionality costs", topics)
        self.assertTrue(any("Chain pricing appears once" in x["text"] for x in v))


if __name__ == "__main__":
    unittest.main()
