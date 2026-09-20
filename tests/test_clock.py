import sqlite3
import unittest
from datetime import datetime, timezone

import fetch_and_analyze as fa
import migrate_clock


class WriterClock(unittest.TestCase):
    def test_bars_are_stamped_eastern_and_filtered_to_the_session(self):
        conn = sqlite3.connect(":memory:")
        fa.init_db(conn)
        pre   = int(datetime(2026, 9, 21, 13, 29, tzinfo=timezone.utc).timestamp() * 1000)
        open_ = int(datetime(2026, 9, 21, 13, 30, tzinfo=timezone.utc).timestamp() * 1000)
        last  = int(datetime(2026, 9, 21, 19, 59, tzinfo=timezone.utc).timestamp() * 1000)
        after = int(datetime(2026, 9, 21, 20, 0, tzinfo=timezone.utc).timestamp() * 1000)
        bars = [{"t": t, "o": 1, "h": 1, "l": 1, "c": 1, "v": 10} for t in (pre, open_, last, after)]
        fa.store_intraday_and_volume(conn, "2026-09-21", bars)
        stamps = [r[0] for r in conn.execute("SELECT timestamp FROM intraday_bars ORDER BY timestamp")]
        self.assertEqual(stamps, ["09:30", "15:59"])

    def test_volume_analysis_is_written_from_the_stored_bars(self):
        conn = sqlite3.connect(":memory:")
        fa.init_db(conn)
        conn.executemany("INSERT INTO intraday_bars VALUES (?,?,?,?,?,?,?,?)", [
            ("2026-09-21", "09:30", 1, 1, 1, 1, 100, None),
            ("2026-09-21", "15:59", 1, 1, 1, 1, 300, None),
        ])
        fa.compute_volume_analysis(conn, "2026-09-21")
        row = conn.execute("SELECT total_volume, vol_930_1000, vol_1530_1600, peak_volume_time FROM volume_analysis").fetchone()
        self.assertEqual(row, (400, 100, 300, "15:59"))

    def test_to_ct_shifts_one_hour_back(self):
        self.assertEqual(fa.to_ct("09:30"), "08:30")
        self.assertEqual(fa.to_ct("15:59"), "14:59")
        self.assertIsNone(fa.to_ct(None))


class VolumeBuckets(unittest.TestCase):
    def test_buckets_cover_the_session_exactly_once(self):
        edges = [(s, e) for _, _, s, e in fa.VOLUME_BUCKETS]
        self.assertEqual(edges[0][0], fa.SESSION_START_ET)
        self.assertEqual(edges[-1][1], fa.SESSION_END_ET)
        for (s1, e1), (s2, e2) in zip(edges, edges[1:]):
            self.assertEqual(e1, s2)

    def test_old_schema_is_rebuilt(self):
        conn = sqlite3.connect(":memory:")
        conn.execute("CREATE TABLE volume_analysis (date TEXT PRIMARY KEY, total_volume INTEGER, vol_830_900 INTEGER)")
        fa.init_db(conn)
        cols = [r[1] for r in conn.execute("PRAGMA table_info(volume_analysis)")]
        self.assertIn("vol_1530_1600", cols)
        self.assertNotIn("vol_830_900", cols)


class Migration(unittest.TestCase):
    def test_shift_moves_a_central_stamp_to_eastern(self):
        self.assertEqual(migrate_clock.shift("08:30", 60), "09:30")
        self.assertEqual(migrate_clock.shift("14:59", 60), "15:59")


if __name__ == "__main__":
    unittest.main()
