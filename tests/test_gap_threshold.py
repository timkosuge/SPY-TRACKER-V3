import re
import unittest


class OneGapThreshold(unittest.TestCase):
    def test_every_producer_and_the_page_use_the_same_threshold(self):
        with open("fetch_and_analyze.py", encoding="utf-8") as f:
            py = f.read()
        with open("dashboard2.js", encoding="utf-8") as f:
            js = f.read()
        py_val = float(re.search(r"^GAP_THRESHOLD_PCT\s*=\s*([0-9.]+)", py, re.M).group(1))
        js_val = float(re.search(r"^const GAP_THRESHOLD_PCT\s*=\s*([0-9.]+)", js, re.M).group(1))
        self.assertEqual(py_val, js_val)
        for f in ("generate_expiry_data.py", "generate_window_stats.py"):
            with open(f, encoding="utf-8") as fh:
                src = fh.read()
            self.assertIn("from fetch_and_analyze import GAP_THRESHOLD_PCT", src, f)
            self.assertNotRegex(src, r"gap\w*\s*[<>]\s*-?0\.(15|25)\b", f)
        self.assertNotRegex(py, r"gap_pct\s*[<>]\s*-?0\.25")
        self.assertNotIn("Math.abs(gapAmt) < 0.05", js)
        self.assertNotIn("Math.abs(gs)<0.20", js)


if __name__ == "__main__":
    unittest.main()
