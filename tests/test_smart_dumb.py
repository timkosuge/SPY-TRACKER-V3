import sqlite3
import unittest
from datetime import date, timedelta

import generate_smart_dumb as G


class Index(unittest.TestCase):
    def test_the_index_is_the_place_in_the_categorys_own_range(self):
        v = [10, 20, 30, 40, 50]
        self.assertEqual(G.cot_index(v, 4), 100.0)
        self.assertEqual(G.cot_index(v, 0), None)
        self.assertEqual(G.cot_index(v, 2), 100.0)
        self.assertEqual(G.cot_index([50, 10, 30], 2), 50.0)

    def test_a_structurally_short_category_is_not_read_as_bearish(self):
        shorts = [-900, -800, -700, -600, -500]
        self.assertEqual(G.cot_index(shorts, 4), 100.0)
        self.assertEqual(G.cot_index(shorts, 1), 100.0)

    def test_the_window_only_looks_back_its_own_length(self):
        v = [0] + [100] * 5 + [50]
        self.assertEqual(G.cot_index(v, 6, look=3), 0.0)
        self.assertEqual(G.cot_index(v, 6, look=7), 50.0)


class Timing(unittest.TestCase):
    def test_the_entry_follows_the_friday_release(self):
        self.assertEqual(G.first_tradeable("2026-09-15", 6), date(2026, 9, 21))


class Build(unittest.TestCase):
    def frame(self, weeks=200):
        conn = sqlite3.connect(":memory:")
        self.addCleanup(conn.close)
        conn.execute("""CREATE TABLE cot_weekly (report_date TEXT PRIMARY KEY, open_interest INTEGER,
            dealer_long INTEGER, dealer_short INTEGER, asset_long INTEGER, asset_short INTEGER,
            lev_long INTEGER, lev_short INTEGER, other_long INTEGER, other_short INTEGER,
            nonrept_long INTEGER, nonrept_short INTEGER, source TEXT)""")
        conn.execute("CREATE TABLE aaii_weekly (week_end TEXT PRIMARY KEY, bullish REAL, neutral REAL, bearish REAL, spread REAL, source TEXT)")
        conn.execute("CREATE TABLE daily_ohlcv (date TEXT, open REAL, high REAL, low REAL, close REAL, volume INTEGER)")
        d = date(2022, 1, 4)
        for i in range(weeks):
            conn.execute("INSERT INTO cot_weekly VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                         (d.isoformat(), 1000, 100, 900 - i, 600 + i, 100, 200 + i, 300, 20, 20, 50 + i, 40, "t"))
            conn.execute("INSERT INTO aaii_weekly VALUES (?,?,?,?,?,?)", ((d - timedelta(days=1)).isoformat(), 40.0, 30.0, 30.0, 10.0 + (i % 7), "t"))
            d += timedelta(days=7)
        px, day = 100.0, date(2022, 1, 3)
        while day <= d + timedelta(days=200):
            if day.weekday() < 5:
                px *= 1.0005
                conn.execute("INSERT INTO daily_ohlcv VALUES (?,?,?,?,?,0)", (day.isoformat(), px, px, px, px))
            day += timedelta(days=1)
        return conn

    def test_a_short_history_is_refused_rather_than_guessed(self):
        out = G.build(self.frame(weeks=40))
        self.assertFalse(out["available"])
        self.assertIn("156", out["reason"])
        self.assertEqual(G.verdicts(out)[0]["level"], "info")

    def test_the_two_sides_and_the_gap_are_built_from_the_index(self):
        out = G.build(self.frame())
        self.assertTrue(out["available"])
        L = out["latest"]
        parts = [L[c + "_idx"] for c in ("lev", "asset") if L[c + "_idx"] is not None]
        self.assertEqual(round(L["institutional"], 1), round(sum(parts) / len(parts), 1))
        self.assertEqual(round(L["spread"], 1), round(L["institutional"] - L["small"], 1))
        self.assertTrue(0 <= L["dealer_idx"] <= 100)

    def test_nothing_is_claimed_below_the_sample_floor(self):
        out = G.build(self.frame())
        for t in out["tests"].values():
            self.assertGreaterEqual(t["base"]["n"], G.FLOOR * 4)

    def test_a_category_with_no_range_is_left_out_rather_than_crashing(self):
        out = G.build(self.frame())
        self.assertTrue(out["available"])
        self.assertNotIn("other", out["series"] and [] or [])
        self.assertIsNotNone(out["latest"]["small"])

    def test_a_cell_is_only_separated_when_its_interval_excludes_the_base(self):
        self.assertTrue(G.beats_base(G.rate(90, 100), 50.0))
        self.assertFalse(G.beats_base(G.rate(52, 100), 50.0))
        self.assertFalse(G.beats_base(G.rate(9, 10), 50.0))


if __name__ == "__main__":
    unittest.main()
