import json
import re
import unittest

import payload_meta

WRITERS = ["generate_window_stats.py", "generate_decline_data.py", "generate_relief_data.py", "generate_release_data.py",
           "generate_tod_stats.py", "generate_expiry_data.py", "generate_intraday_patterns.py", "generate_large_gap_stats.py",
           "generate_edge_stats.py", "generate_chains.py", "generate_range_filter.py", "generate_strategies.py",
           "generate_clock.py", "generate_options_env.py", "generate_tic_holdings.py", "fetch_and_analyze.py"]


class Stamp(unittest.TestCase):
    def test_the_stamp_is_eastern_never_utc(self):
        s = payload_meta.stamp()
        self.assertRegex(s["generated"], r"-0[45]:00$")
        self.assertNotIn("+00:00", s["generated"])

    def test_the_health_reader_tolerates_either_spacing(self):
        import generate_health as H
        import tempfile, os, pathlib
        d = tempfile.mkdtemp()
        cwd = os.getcwd()
        try:
            os.chdir(d)
            pathlib.Path("a.js").write_text('const A = {"x":1,"generated": "2026-09-20T21:00:00-04:00", "source_max_date": "2026-09-18"};\n')
            pathlib.Path("b.js").write_text('const B = {"x":1,"generated":"2026-09-20T21:00:00-04:00","source_max_date":"2026-09-18"};\n')
            for f in ("a.js", "b.js"):
                m = H.payload_meta(f)
                self.assertEqual(m["source_max_date"], "2026-09-18", f)
                self.assertTrue(m["generated"].endswith("-04:00"), f)
        finally:
            os.chdir(cwd)

    def test_every_writer_stamps_its_payload(self):
        import os
        missing = []
        for src in WRITERS:
            if not os.path.exists(src):
                continue
            with open(src, encoding="utf-8") as fh:
                s = fh.read()
            if "stamp(" not in s and "payload_stamp(" not in s and "source_max_date" not in s:
                missing.append(src)
        self.assertEqual(missing, [])


class AaiiGate(unittest.TestCase):
    def gate(self, bull, neu, bear):
        if bull is None or bear is None or not (0 <= bull <= 100) or not (0 <= bear <= 100) or bull + bear > 105:
            return None
        out = {"bullish": bull, "neutral": neu, "bearish": bear}
        total = (bull + neu + bear) if neu is not None else None
        if total is None or not (90 <= total <= 110):
            out["neutral"] = round(100.0 - bull - bear, 1)
            out["neutral_derived"] = True
        out["spread"] = round(bull - bear, 1)
        return out

    def test_a_real_week_that_sums_to_95_is_kept(self):
        g = self.gate(28.8, 37.5, 28.8)
        self.assertIsNotNone(g)
        self.assertEqual(g["neutral"], 37.5)
        self.assertEqual(g["spread"], 0.0)

    def test_neutral_is_derived_when_the_three_do_not_fit(self):
        g = self.gate(30.0, 5.0, 40.0)
        self.assertEqual(g["neutral"], 30.0)
        self.assertTrue(g["neutral_derived"])

    def test_a_garbled_parse_is_still_rejected(self):
        self.assertIsNone(self.gate(75.0, 17.9, 70.3))
        self.assertIsNone(self.gate(None, 30.0, 30.0))


if __name__ == "__main__":
    unittest.main()
