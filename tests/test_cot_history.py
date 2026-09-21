import sqlite3
import unittest
from datetime import date

import generate_cot as C
import fetch_sentiment as fs


class Parsing(unittest.TestCase):
    def test_the_report_date_is_read_from_either_column_name(self):
        self.assertEqual(fs._cot_date({"Report_Date_as_YYYY-MM-DD": "2026-09-15"}), "2026-09-15")
        self.assertEqual(fs._cot_date({"Report_Date_as_YYYY_MM_DD": "2026 Sep 15 12:00:00 AM"}), "2026-09-15")
        self.assertIsNone(fs._cot_date({}))

    def test_numbers_survive_their_thousands_separators(self):
        self.assertEqual(fs._cot_num("2,446,519"), 2446519)
        self.assertEqual(fs._cot_num(""), 0)
        self.assertIsNone(fs._cot_num("n/a"))

    def test_the_archive_url_is_the_one_that_exists(self):
        self.assertIn("fut_fin_txt_", fs.CFTC_FIN_ZIP)
        self.assertNotIn("tff_fut_txt_", fs.CFTC_FIN_ZIP)


class Timing(unittest.TestCase):
    def test_the_first_tradeable_session_follows_the_friday_release(self):
        self.assertEqual(C.first_tradeable("2026-09-15"), date(2026, 9, 21))
        self.assertEqual(C.first_tradeable("2026-11-24"), date(2026, 11, 30))


class Build(unittest.TestCase):
    def frame(self):
        conn = sqlite3.connect(":memory:")
        self.addCleanup(conn.close)
        conn.execute("""CREATE TABLE cot_weekly (report_date TEXT PRIMARY KEY, open_interest INTEGER,
            dealer_long INTEGER, dealer_short INTEGER, asset_long INTEGER, asset_short INTEGER,
            lev_long INTEGER, lev_short INTEGER, other_long INTEGER, other_short INTEGER,
            nonrept_long INTEGER, nonrept_short INTEGER, source TEXT)""")
        conn.execute("CREATE TABLE daily_ohlcv (date TEXT, open REAL, high REAL, low REAL, close REAL, volume INTEGER)")
        rows = [("2026-09-01", 1000, 100, 500, 600, 100, 200, 300, 10, 10, 10, 10, "t"),
                ("2026-09-08", 1100, 110, 520, 620, 110, 210, 280, 10, 10, 10, 10, "t"),
                ("2026-09-15", 1200, 120, 540, 640, 120, 220, 260, 10, 10, 10, 10, "t")]
        conn.executemany("INSERT INTO cot_weekly VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", rows)
        px = 100.0
        d = date(2026, 9, 1)
        while d <= date(2026, 12, 31):
            if d.weekday() < 5:
                px *= 1.001
                conn.execute("INSERT INTO daily_ohlcv VALUES (?,?,?,?,?,0)", (d.isoformat(), px, px, px, px))
            d = date.fromordinal(d.toordinal() + 1)
        return conn

    def test_nets_changes_and_percentiles(self):
        out = C.build(self.frame())
        self.assertTrue(out["available"])
        self.assertEqual(out["weeks"], 3)
        s = out["standing"]
        self.assertEqual(s["dealer"]["net"], 120 - 540)
        self.assertEqual(s["lev"]["net"], 220 - 260)
        self.assertEqual(s["lev"]["change"], (220 - 260) - (210 - 280))
        self.assertEqual(s["dealer"]["percentile"]["all"], 0.0)
        self.assertEqual(s["lev"]["percentile"]["all"], 66.7)

    def test_the_entry_date_is_a_session_after_the_release(self):
        out = C.build(self.frame())
        self.assertEqual(out["latest"]["entry_date"], "2026-09-21")

    def test_no_claim_is_made_below_the_sample_floor(self):
        out = C.build(self.frame())
        self.assertEqual(out["tests"], {})
        self.assertTrue(any(v["level"] == "info" for v in C.verdicts(out)))


if __name__ == "__main__":
    unittest.main()
