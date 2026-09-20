import glob
import json
import re
import sqlite3
import unittest

import fetch_and_analyze as fa


def has_database():
    try:
        with open("spy_data.db", "rb") as f:
            return f.read(16) == b"SQLite format 3\x00"
    except OSError:
        return False


@unittest.skipUnless(has_database(), "spy_data.db is not present locally")
class Reproduction(unittest.TestCase):
    def test_large_gap_generator_matches_its_frozen_payload_at_the_cutoff(self):
        import generate_large_gap_stats as g
        conn = sqlite3.connect("spy_data.db")
        with open("large_gap_stats.js", encoding="utf-8") as f:
            frozen = json.loads(re.search(r"=\s*(\{.*\})\s*;?\s*$", f.read(), re.S).group(1))
        mine = g.build(conn, cutoff=frozen["overall"]["date_range"]["to"])
        self.assertEqual(mine["overall"]["freq"]["1.0"]["up_n"], frozen["overall"]["freq"]["1.0"]["up_n"])
        self.assertEqual(mine["overall"]["freq"]["1.0"]["dn_n"], frozen["overall"]["freq"]["1.0"]["dn_n"])
        self.assertEqual(mine["overall"]["total_sessions"], frozen["overall"]["total_sessions"])


@unittest.skipUnless(has_database(), "spy_data.db is not present locally")
class Stamps(unittest.TestCase):
    OWNED = ["large_gap_stats.js", "release_data.js", "edge_stats_data.js"]
    PIPELINE = ["gap_stats.js", "window_stats.js", "tod_stats.js", "decline_data.js", "relief_data.js", "analog_data.js",
                "intraday_vol_stats.js", "intraday_vol_profile.js", "session_vol_profile.js"]

    def test_generators_in_this_repo_stamp_their_payloads(self):
        for f in self.OWNED:
            with open(f, encoding="utf-8") as fh:
                s = fh.read()
            self.assertIn('"generated"', s, f)
            self.assertIn('"source_max_date"', s, f)

    def test_every_stamped_payload_matches_the_database(self):
        conn = sqlite3.connect("spy_data.db")
        mx = conn.execute("SELECT MAX(date) FROM daily_ohlcv WHERE close IS NOT NULL").fetchone()[0]
        for f in self.OWNED + self.PIPELINE:
            with open(f, encoding="utf-8") as fh:
                s = fh.read()
            m = re.search(r'"source_max_date"\s*:\s*"([0-9-]+)"', s)
            if m is None and f in self.PIPELINE:
                continue
            self.assertIsNotNone(m, f)
            self.assertEqual(m.group(1), mx, f)


if __name__ == "__main__":
    unittest.main()
