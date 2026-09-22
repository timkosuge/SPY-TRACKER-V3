import glob
import json
import os
import re
import tempfile
import unittest

import fetch_and_analyze as fa

WRAPPED = ("EXPIRY_DATA", "INTRADAY_SESSION_STATS", "INTRADAY_PATTERNS")


class LibraryReader(unittest.TestCase):
    def read(self, text):
        fd, path = tempfile.mkstemp(suffix=".js")
        os.close(fd)
        self.addCleanup(os.remove, path)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        return fa.library_sessions(path)

    def test_the_stamped_library_is_read(self):
        body = {"records": [{"date": "2026-09-18", "or_range": 0.3}, {"date": "2026-09-21", "or_range": 0.221}],
                "generated": "2026-09-21T22:10:44-04:00", "source_max_date": "2026-09-21"}
        got = self.read("const INTRADAY_SESSION_STATS = " + json.dumps(body) + ";\n")
        self.assertEqual(sorted(got), ["2026-09-18", "2026-09-21"])
        self.assertEqual(got["2026-09-21"]["or_range"], 0.221)

    def test_a_plain_list_library_is_read(self):
        got = self.read('const INTRADAY_SESSION_STATS = [{"date": "2026-09-18"}];\n')
        self.assertEqual(list(got), ["2026-09-18"])

    def test_no_export_parses_the_library_as_a_bare_list(self):
        with open("fetch_and_analyze.py", encoding="utf-8") as f:
            self.assertNotIn("INTRADAY_SESSION_STATS = (\\[", f.read())


class PageReaders(unittest.TestCase):
    def test_every_page_use_of_a_wrapped_payload_goes_through_payload_rows(self):
        found = []
        for p in sorted(glob.glob("*.js")) + ["index.html"]:
            if p in ("expiry_data.js", "intraday_library.js", "intraday_patterns.js"):
                continue
            with open(p, encoding="utf-8", errors="ignore") as f:
                lines = f.read().split("\n")
            for i, line in enumerate(lines, 1):
                code = line.split("//")[0]
                for var in WRAPPED:
                    for m in re.finditer(rf"\b{var}\b", code):
                        before = code[:m.start()]
                        if before.rstrip().endswith("payloadRows(") or re.search(r"typeof\s*$", before):
                            continue
                        found.append(f"{p}:{i}")
        self.assertEqual(found, [])


if __name__ == "__main__":
    unittest.main()
