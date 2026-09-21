import json
import re
import subprocess
import unittest


def run(expr):
    with open("shared.js", encoding="utf-8") as f:
        src = f.read()
    head = src[:src.index("const $=id=>")]
    js = head + "\nprocess.stdout.write(JSON.stringify(" + expr + "));"
    return json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True, encoding="utf-8", check=True).stdout)


class Formatters(unittest.TestCase):
    def test_missing_is_a_dash_everywhere(self):
        self.assertEqual(run("[fmt(null), fmtPct(null), fmtK(null), fmt(NaN), fmtPct(undefined)]"), ["—", "—", "—", "—", "—"])

    def test_percent_is_signed_and_zero_is_unsigned(self):
        self.assertEqual(run("[fmtPct(1.234), fmtPct(-0.5,1), fmtPct(0)]"), ["+1.23%", "-0.5%", "0.00%"])

    def test_k_formatter_keeps_the_sign(self):
        self.assertEqual(run("[fmtK(-1500000), fmtK(2500), fmtK(0)]"), ["-1.5M", "3K", "0"])

    def test_dates_read_as_words_without_timezone_drift(self):
        self.assertEqual(run("[fmtDate('2026-09-19'), fmtDate('2026-09-19','short'), fmtDate('2027-01-01'), fmtDate(null)]"), ["September 19, 2026", "Sep 19, 2026", "January 1, 2027", "—"])

    def test_enum_labels(self):
        self.assertEqual(run("[labelEnum('GAP_UP'), labelEnum('trend_down'), labelEnum('rising'), labelEnum(null)]"), ["Gap Up", "Trend Down", "Rising", "—"])

    def test_no_forked_percent_formatter_remains(self):
        for f in ("dashboard1b.js", "dashboard2.js", "edge_stats.js", "intraday_data.js"):
            with open(f, encoding="utf-8") as fh:
                self.assertNotRegex(fh.read(), r"const fmtPct\s*=", f)


if __name__ == "__main__":
    unittest.main()
