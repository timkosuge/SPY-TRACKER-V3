import sqlite3
import sys
import unittest
from datetime import datetime, timedelta

sys.path.insert(0, ".")
import generate_clock as K


class Daily(unittest.TestCase):
    def test_overnight_and_session_split_and_monday_pairing(self):
        conn = sqlite3.connect(":memory:")
        self.addCleanup(conn.close)
        conn.execute("CREATE TABLE daily_ohlcv (date TEXT, open REAL, high REAL, low REAL, close REAL, volume INTEGER)")
        rows = [("2026-09-10", 100, 101, 99, 100), ("2026-09-11", 101, 102, 100, 102), ("2026-09-14", 103, 104, 102, 104), ("2026-09-15", 103, 104, 102, 103.5)]
        conn.executemany("INSERT INTO daily_ohlcv VALUES (?,?,?,?,?,0)", rows)
        d = K.daily_tests(conn)["3y"]
        self.assertEqual(d["n"], 3)
        self.assertEqual(d["monday_continues_friday"]["n"], 1)
        self.assertEqual(d["monday_continues_friday"]["k"], 1)
        self.assertAlmostEqual(d["cum_overnight"], ((101 / 100) * (103 / 102) * (103 / 104) - 1) * 100, places=1)


class Overnight(unittest.TestCase):
    def test_session_day_key_and_event_windows(self):
        conn = sqlite3.connect(":memory:")
        self.addCleanup(conn.close)
        conn.execute("CREATE TABLE futures_bars (ts TEXT PRIMARY KEY, open REAL, high REAL, low REAL, close REAL, volume INTEGER)")
        t = datetime.fromisoformat("2026-09-14T18:00-04:00")
        rows = []
        for i in range(288 * 2):
            tt = t + timedelta(minutes=5 * i)
            if tt.hour == 17:
                continue
            hot = tt.hour == 20 and tt.minute < 30
            rows.append((tt.isoformat(timespec="minutes"), 100.0, 100.4 if hot else 100.1, 99.6 if hot else 99.9, 100.0, 5000 if hot else 1000))
        conn.executemany("INSERT INTO futures_bars VALUES (?,?,?,?,?,?)", rows)
        o = K.overnight_tests(conn)
        self.assertEqual(o["sessions"], 2)
        ev = o["events"]["tokyo_open"]
        self.assertEqual(ev["n"], 2)
        self.assertGreater(ev["range_at"], ev["range_before"] * 2)
        self.assertGreater(ev["volume_at"], ev["volume_before"] * 2)


class Verdicts(unittest.TestCase):
    def test_no_effect_is_stated_as_not_supported(self):
        v = K.verdicts({}, {"sessions": 0}, {"sessions": 0})
        self.assertEqual(v[-1]["level"], "info")
        self.assertIn("need 30 sessions", v[-1]["text"])


if __name__ == "__main__":
    unittest.main()
