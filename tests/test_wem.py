import sqlite3
import unittest
from datetime import date

import fetch_and_analyze as fa


def db_with_week():
    conn = sqlite3.connect(":memory:")
    fa.init_db(conn)
    conn.executemany("INSERT INTO daily_ohlcv (date,open,high,low,close,volume) VALUES (?,?,?,?,?,?)", [
        ("2026-09-11", 758.0, 762.0, 755.0, 760.00, 1),
        ("2026-09-14", 761.0, 766.0, 758.0, 764.00, 1),
        ("2026-09-15", 764.0, 772.5, 763.0, 771.00, 1),
        ("2026-09-16", 771.0, 773.0, 760.0, 762.00, 1),
        ("2026-09-17", 762.0, 765.0, 749.0, 751.00, 1),
        ("2026-09-18", 751.0, 758.0, 748.0, 757.00, 1),
    ])
    conn.execute("INSERT INTO weekly_em (week_start, week_end, friday_close, static_wem_low, static_wem_high, static_wem_range, static_wem_iv, static_band_status) "
                 "VALUES ('2026-09-14','2026-09-18',760.0,750.0,770.0,20.0,0.12,'ok')")
    return conn


class ScoringAgainstTheStaticBand(unittest.TestCase):
    def test_settled_week_is_scored_against_static_low_and_high(self):
        conn = db_with_week()
        fa.score_week(conn, "2026-09-14", "2026-09-18", 760.0, settled=True)
        row = conn.execute("SELECT week_open, week_high, week_low, week_close, weekly_gap, closed_inside, breach, breach_side, breach_day, breach_intraweek FROM weekly_em").fetchone()
        self.assertEqual(row[:4], (761.0, 773.0, 748.0, 757.0))
        self.assertEqual(row[4], 1.0)
        self.assertEqual(row[5], 1)
        self.assertEqual((row[6], row[7], row[8]), (1, "HIGH", "TUESDAY"))
        self.assertEqual(row[9], 1)

    def test_open_week_has_no_close_and_no_inside_verdict(self):
        conn = db_with_week()
        fa.score_week(conn, "2026-09-14", "2026-09-18", 760.0, settled=False)
        row = conn.execute("SELECT week_close, closed_inside, breach FROM weekly_em").fetchone()
        self.assertIsNone(row[0]); self.assertIsNone(row[1]); self.assertEqual(row[2], 1)

    def test_unavailable_band_yields_no_outcomes(self):
        conn = db_with_week()
        conn.execute("UPDATE weekly_em SET static_band_status='unavailable'")
        fa.score_week(conn, "2026-09-14", "2026-09-18", 760.0, settled=True)
        row = conn.execute("SELECT week_close, closed_inside, breach, breach_intraweek FROM weekly_em").fetchone()
        self.assertEqual(row[0], 757.0)
        self.assertEqual(row[1:], (None, None, None))

    def test_gap_sign_follows_open_minus_prior_close(self):
        conn = db_with_week()
        fa.score_week(conn, "2026-09-14", "2026-09-18", 763.0, settled=True)
        self.assertEqual(conn.execute("SELECT weekly_gap FROM weekly_em").fetchone()[0], -2.0)


class StaticCapture(unittest.TestCase):
    def test_capture_uses_seven_calendar_days_and_no_multiplier(self):
        conn = db_with_week()
        fa.set_next_week_static_wem(conn, "2026-09-18", 0.20)
        row = conn.execute("SELECT static_wem_low, static_wem_high, static_band_status FROM weekly_em WHERE week_start='2026-09-21'").fetchone()
        half = fa.expected_move(757.0, 0.20, 7)
        self.assertAlmostEqual(row[0], round(757.0 - half, 2), places=2)
        self.assertAlmostEqual(row[1], round(757.0 + half, 2), places=2)
        self.assertEqual(row[2], "ok")

    def test_capture_is_written_once(self):
        conn = db_with_week()
        fa.set_next_week_static_wem(conn, "2026-09-18", 0.20)
        fa.set_next_week_static_wem(conn, "2026-09-18", 0.50)
        self.assertEqual(conn.execute("SELECT static_wem_iv FROM weekly_em WHERE week_start='2026-09-21'").fetchone()[0], 0.20)

    def test_null_close_does_not_raise_and_writes_nothing(self):
        conn = sqlite3.connect(":memory:")
        fa.init_db(conn)
        conn.execute("INSERT INTO daily_ohlcv (date,open,high,low,close,volume) VALUES ('2026-09-18', 751.0, 758.0, 748.0, NULL, 1)")
        fa.set_next_week_static_wem(conn, "2026-09-18", 0.20)
        self.assertEqual(conn.execute("SELECT COUNT(*) FROM weekly_em").fetchone()[0], 0)


class WeeklyExpiry(unittest.TestCase):
    def test_same_day_expiry_is_never_the_weekly(self):
        friday = date(2026, 9, 18)
        exps = [date(2026, 9, 18), date(2026, 9, 21), date(2026, 9, 25), date(2026, 10, 2)]
        self.assertEqual(fa.pick_weekly_expiry(exps, friday), date(2026, 9, 25))

    def test_midweek_picks_this_friday(self):
        self.assertEqual(fa.pick_weekly_expiry([date(2026, 9, 16), date(2026, 9, 18)], date(2026, 9, 16)), date(2026, 9, 18))


class Stats(unittest.TestCase):
    def test_stats_count_only_scored_weeks_and_carry_the_window(self):
        rows = [
            dict(week_start="2026-01-05", week_end="2026-01-09", week_close=1, static_band_status="ok", static_wem_range=20.0, closed_inside=1, breach=0, breach_intraweek=0, weekly_gap=1.0, friday_close=700.0, gap_filled=1, breach_side=None, breach_amount=None, breach_day=None),
            dict(week_start="2026-01-12", week_end="2026-01-16", week_close=1, static_band_status="unavailable", static_wem_range=20.0, closed_inside=None, breach=None, breach_intraweek=None, weekly_gap=1.0, friday_close=700.0, gap_filled=1, breach_side=None, breach_amount=None, breach_day=None),
        ]
        st = fa.build_wem_stats(rows)
        self.assertEqual(st["total_weeks"], 1)
        self.assertEqual(st["window"], {"from": "2026-01-05", "to": "2026-01-09"})
        self.assertEqual(st["pct_inside"], 100.0)


if __name__ == "__main__":
    unittest.main()
