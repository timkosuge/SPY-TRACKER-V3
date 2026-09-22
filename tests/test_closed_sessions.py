import json
import os
import re
import sqlite3
import tempfile
import unittest
from datetime import date, datetime, timedelta

import pytz

import fetch_and_analyze as fa
import payload_meta as P

ET = pytz.timezone("America/New_York")


def weekdays_before(day, n):
    out = []
    d = day - timedelta(days=1)
    while len(out) < n:
        if d.weekday() < 5:
            out.append(d)
        d -= timedelta(days=1)
    return sorted(out)


def next_weekday(day):
    d = day + timedelta(days=1)
    while d.weekday() >= 5:
        d += timedelta(days=1)
    return d


class Rule(unittest.TestCase):
    def test_a_session_counts_only_from_four_pm_eastern(self):
        mid = ET.localize(datetime(2026, 9, 21, 13, 59))
        after = ET.localize(datetime(2026, 9, 21, 16, 0))
        self.assertFalse(P.session_closed("2026-09-21", mid))
        self.assertTrue(P.session_closed("2026-09-21", after))
        self.assertTrue(P.session_closed(date(2026, 9, 18), mid))
        self.assertFalse(P.session_closed("2026-09-22", after))

    def test_the_last_closed_session_skips_an_unfinished_row(self):
        c = sqlite3.connect(":memory:")
        self.addCleanup(c.close)
        c.execute("CREATE TABLE daily_ohlcv (date TEXT, close REAL)")
        c.executemany("INSERT INTO daily_ohlcv VALUES (?,?)", [("2026-09-18", 761.69), ("2026-09-21", 774.34)])
        self.assertEqual(P.last_closed_date(c, ET.localize(datetime(2026, 9, 21, 13, 59))), "2026-09-18")
        self.assertEqual(P.last_closed_date(c, ET.localize(datetime(2026, 9, 21, 16, 30))), "2026-09-21")


class Generators(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        today = datetime.now(ET).date()
        cls.unfinished = next_weekday(today).isoformat()
        cls.conn = sqlite3.connect(":memory:")
        fa.init_db(cls.conn)
        px = 500.0
        rows = []
        for i, d in enumerate(weekdays_before(today, 400)):
            o = px
            px = px * (1 + (0.012 if i % 7 == 0 else -0.004 if i % 3 == 0 else 0.003))
            rows.append((d.isoformat(), o, max(o, px) * 1.004, min(o, px) * 0.996, px, 1000000))
        rows.append((cls.unfinished, px, px * 1.01, px * 0.99, px * 1.005, 500000))
        cls.conn.executemany("INSERT INTO daily_ohlcv (date,open,high,low,close,volume) VALUES (?,?,?,?,?,?)", rows)
        cls.conn.commit()

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()

    def absent(self, out):
        self.assertNotIn(self.unfinished, json.dumps(out, default=str))

    def test_large_gap_stats(self):
        import generate_large_gap_stats as g
        self.absent(g.build(self.conn))

    def test_release_data(self):
        import generate_release_data as g
        self.absent(g.build(self.conn))

    def test_edge_stats(self):
        import generate_edge_stats as g
        self.absent(g.build(self.conn))

    def test_period_aggregates(self):
        import generate_aggregate_csv as g
        without = sqlite3.connect(":memory:")
        self.addCleanup(without.close)
        self.conn.backup(without)
        without.execute("DELETE FROM daily_ohlcv WHERE date=?", (self.unfinished,))
        self.assertEqual(g.build(self.conn), g.build(without))

    def test_options_environment(self):
        import generate_options_env as g
        self.absent(g.build(self.conn))

    def test_setup_engine_day_frame(self):
        import generate_chains as g
        self.absent(g.build_frame(self.conn))

    def test_range_filter_rows(self):
        import generate_range_filter as g
        self.absent(g.daily_rows(self.conn))


class StaticWeeklyRange(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.addCleanup(self.conn.close)
        fa.init_db(self.conn)

    def test_the_lock_waits_for_the_session_to_close(self):
        friday = next_weekday(datetime.now(ET).date())
        while friday.weekday() != 4:
            friday += timedelta(days=1)
        self.conn.execute("INSERT INTO daily_ohlcv (date,open,high,low,close,volume) VALUES (?,?,?,?,?,?)", (friday.isoformat(), 760, 762, 758, 761, 1))
        fa.set_next_week_static_wem(self.conn, friday.isoformat(), atm_iv=0.2)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM weekly_em").fetchone()[0], 0)

    def test_a_closed_friday_locks_on_its_close(self):
        self.conn.execute("INSERT INTO daily_ohlcv (date,open,high,low,close,volume) VALUES ('2026-09-18',761.31,762,757.97,761.69,1)")
        fa.set_next_week_static_wem(self.conn, "2026-09-18", atm_iv=0.1012)
        fc, hi, lo, st = self.conn.execute("SELECT friday_close, static_wem_high, static_wem_low, static_band_status FROM weekly_em WHERE week_start='2026-09-21'").fetchone()
        self.assertEqual((fc, st), (761.69, "ok"))
        self.assertAlmostEqual((hi + lo) / 2, 761.69, places=2)

    def test_a_band_centered_off_its_close_is_rebuilt_from_vix_and_rescored(self):
        rows = [("2026-04-02", 646.42, 658.20, 645.11, 655.83), ("2026-04-06", 656, 662, 651.06, 660), ("2026-04-07", 660, 668, 658, 665),
                ("2026-04-08", 665, 675, 663, 672), ("2026-04-09", 672, 682.03, 670, 680), ("2026-04-10", 680, 681, 677, 679.46)]
        self.conn.executemany("INSERT INTO daily_ohlcv (date,open,high,low,close,volume) VALUES (?,?,?,?,?,1)", rows)
        self.conn.execute("""INSERT INTO weekly_em (week_start, week_end, friday_close, static_wem_high, static_wem_low, static_wem_range, static_wem_iv, static_band_status)
                             VALUES ('2026-04-06','2026-04-10',655.83,684.68,625.8,58.88,0.2454,'ok')""")
        self.conn.execute("""INSERT INTO weekly_em (week_start, week_end, friday_close, static_wem_high, static_wem_low, static_wem_range, static_wem_iv, static_band_status)
                             VALUES ('2026-09-21','2026-09-25',761.69,772.36,751.02,21.34,0.1012,'ok')""")
        orig = fa.vix_close_on
        fa.vix_close_on = lambda d: 0.2387 if d == "2026-04-02" else None
        self.addCleanup(setattr, fa, "vix_close_on", orig)
        fa.repair_offcenter_static_bands(self.conn, date(2026, 9, 22))
        hi, lo, st, iv, inside, side = self.conn.execute("SELECT static_wem_high, static_wem_low, static_band_status, static_wem_iv, closed_inside, breach_side FROM weekly_em WHERE week_start='2026-04-06'").fetchone()
        self.assertEqual((st, iv), ("vix", 0.2387))
        self.assertAlmostEqual((hi + lo) / 2, 655.83, places=2)
        self.assertEqual((inside, side), (0, "HIGH"))
        self.assertEqual(self.conn.execute("SELECT static_wem_high, static_wem_low, static_band_status FROM weekly_em WHERE week_start='2026-09-21'").fetchone(), (772.36, 751.02, "ok"))

    def test_a_holiday_thursday_locks_the_following_monday_to_friday(self):
        self.conn.execute("INSERT INTO daily_ohlcv (date,open,high,low,close,volume) VALUES ('2026-04-02',646.42,658.2,645.11,655.83,1)")
        fa.set_next_week_static_wem(self.conn, "2026-04-02", atm_iv=0.2454)
        self.assertEqual(self.conn.execute("SELECT week_start, week_end FROM weekly_em").fetchall(), [("2026-04-06", "2026-04-10")])

    def test_a_week_left_without_a_range_is_locked_from_the_prior_close_on_vix(self):
        self.conn.execute("INSERT INTO daily_ohlcv (date,open,high,low,close,volume) VALUES ('2026-09-18',761.31,762,757.97,761.69,1)")
        self.conn.execute("INSERT INTO weekly_em (week_start, week_end, static_band_status) VALUES ('2026-09-21','2026-09-25','unavailable')")
        orig = fa.vix_close_on
        fa.vix_close_on = lambda d: 0.1501 if d == "2026-09-18" else None
        self.addCleanup(setattr, fa, "vix_close_on", orig)
        fa.lock_missed_static_band(self.conn, date(2026, 9, 22))
        fc, hi, lo, st, iv = self.conn.execute("SELECT friday_close, static_wem_high, static_wem_low, static_band_status, static_wem_iv FROM weekly_em WHERE week_start='2026-09-21'").fetchone()
        self.assertEqual((fc, st, iv), (761.69, "vix", 0.1501))
        self.assertAlmostEqual((hi + lo) / 2, 761.69, places=2)

    def test_a_week_that_has_a_range_is_left_alone(self):
        self.conn.execute("INSERT INTO daily_ohlcv (date,open,high,low,close,volume) VALUES ('2026-09-18',761.31,762,757.97,761.69,1)")
        self.conn.execute("""INSERT INTO weekly_em (week_start, week_end, friday_close, static_wem_high, static_wem_low, static_wem_iv, static_band_status)
                             VALUES ('2026-09-21','2026-09-25',761.69,772.36,751.02,0.1012,'ok')""")
        orig = fa.vix_close_on
        fa.vix_close_on = lambda d: self.fail("VIX looked up for a week that already has a range")
        self.addCleanup(setattr, fa, "vix_close_on", orig)
        fa.lock_missed_static_band(self.conn, date(2026, 9, 22))
        self.assertEqual(self.conn.execute("SELECT static_wem_high, static_wem_low, static_band_status FROM weekly_em WHERE week_start='2026-09-21'").fetchone(), (772.36, 751.02, "ok"))


class Coverage(unittest.TestCase):
    def test_every_workflow_script_reading_daily_data_applies_the_rule(self):
        with open(".github/workflows/spy_tracker.yml", encoding="utf-8") as f:
            scripts = sorted(set(re.findall(r"python (\w+\.py)", f.read())))
        missing = []
        for p in scripts:
            if not os.path.exists(p):
                continue
            with open(p, encoding="utf-8") as f:
                s = f.read()
            reads = "FROM daily_ohlcv" in s or "HAVING COUNT(*) >= 380" in s or "FROM intraday_bars" in s
            if reads and not re.search(r"\b(session_closed|last_closed_date|daily_rows)\(", s):
                missing.append(p)
        self.assertEqual(missing, [])

    def test_no_script_takes_the_newest_daily_date_directly(self):
        found = []
        for p in sorted(os.listdir(".")):
            if p.endswith(".py") and p != "payload_meta.py":
                with open(p, encoding="utf-8") as f:
                    if "MAX(date) FROM daily_ohlcv" in f.read():
                        found.append(p)
        self.assertEqual(found, [])


if __name__ == "__main__":
    unittest.main()
