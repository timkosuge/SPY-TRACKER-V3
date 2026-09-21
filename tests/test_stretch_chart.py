import json
import re
import subprocess
import unittest

HARNESS = r"""
const fs = require('fs');
global.window = {};
global.document = { readyState: 'complete', querySelectorAll: () => [], getElementById: () => null };
eval(fs.readFileSync('shared.js', 'utf8').replace(/\r\n/g, '\n').replace(/^const /gm, 'var '));
const series = [['2025-05', 326.9], ['2025-09', 330], ['2026-01', 333], ['2026-05', 336], ['2026-08', 337.8]];
const one = stretchChart({ series, color: '#f00', labels: true, format: v => v.toFixed(1) });
const two = stretchChart({ series, color: '#0cf', extra: [{ color: '#f35', values: [330, null, 331, 332, 333] }], fill: false, height: 180, labels: true });
const bare = stretchChart({ series, color: '#0cf', height: 50 });
process.stdout.write(JSON.stringify({
  stretches: /preserveAspectRatio="none"/.test(one) && /vector-effect="non-scaling-stroke"/.test(one),
  noSvgText: !/<text/.test(one),
  dates: [...one.matchAll(/<span>([A-Z][a-z]{2} \d{4})<\/span>/g)].map(m => m[1]),
  values: [...one.matchAll(/<span>(\d+\.\d)<\/span>/g)].map(m => m[1]),
  lines: (two.match(/<polyline/g) || []).length,
  filled: /<polygon/.test(two),
  dots: (two.match(/border-radius:50%/g) || []).length,
  bareLabels: /<span>[A-Z]/.test(bare),
  period: [periodLabel('2026-09-18', 'daily'), periodLabel('2026-08-01', 'monthly'), periodLabel('2026-04-01', 'quarterly'), periodLabel('2026-09-16', 'weekly')],
  short: [shortDateLabel('2026-07'), shortDateLabel('2026-07-04')],
}));
"""


class StretchChart(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.out = json.loads(subprocess.run(["node", "-e", HARNESS], capture_output=True, text=True, encoding="utf-8", check=True).stdout)

    def test_the_line_stretches_and_its_labels_are_page_text(self):
        self.assertTrue(self.out["stretches"])
        self.assertTrue(self.out["noSvgText"])

    def test_labels_carry_dates_in_words_and_the_value_range(self):
        self.assertEqual(self.out["dates"], ["May 2025", "Jan 2026", "Aug 2026"])
        self.assertEqual(self.out["values"], ["337.8", "332.4", "326.9"])

    def test_a_second_line_shares_the_scale_without_shading(self):
        self.assertEqual(self.out["lines"], 2)
        self.assertFalse(self.out["filled"])
        self.assertEqual(self.out["dots"], 2)

    def test_a_sparkline_carries_no_labels(self):
        self.assertFalse(self.out["bareLabels"])

    def test_dates_follow_each_series_frequency(self):
        self.assertEqual(self.out["period"], ["September 18, 2026", "August 2026", "Q2 2026", "September 16, 2026"])
        self.assertEqual(self.out["short"], ["Jul 2026", "Jul 4, 2026"])


class NoFixedWidthDrawers(unittest.TestCase):
    def test_macro_and_sovereign_charts_use_the_stretching_drawer(self):
        with open("dashboard2.js", encoding="utf-8") as f:
            s = f.read()
        self.assertIn("const lineChart = (history, color, unit, height=80) => stretchChart(", s)
        self.assertIn("const spark = (history, color = '#00ccff', h = 50) => stretchChart(", s)
        for fixed in ("const W = 400", "const W = 200", "const W = 800, H = 180"):
            self.assertNotIn(fixed, s)
        card = s[s.index("const seriesCard"):]
        card = card[:card.index("\n  };\n")]
        self.assertNotIn("${s.latest_date}", card)
        self.assertNotIn("${s.year_ago_date}", card)


class Volatility(unittest.TestCase):
    def test_render_volatility_uses_no_undeclared_rows(self):
        with open("dashboard1.js", encoding="utf-8") as f:
            s = f.read()
        start = s.index("function renderVolatility")
        depth, i = 0, s.index("{", start)
        while True:
            depth += {"{": 1, "}": -1}.get(s[i], 0)
            i += 1
            if depth == 0:
                break
        body = re.sub(r"/\*.*?\*/", "", s[start:i], flags=re.S)
        body = re.sub(r"(^|[\s;{}])//[^\n]*", r"\1", body)
        used = re.findall(r"(?<![.\w])rows(?!\w)", body)
        declared = re.findall(r"(?:const|let|var)\s+rows\b|\(\s*rows\s*[,)]|\brows\s*=>", body)
        self.assertTrue(not used or declared, f"renderVolatility reads 'rows' {len(used)} time(s) without declaring it")
        self.assertIn("const todayRow=sd[0];", body)


if __name__ == "__main__":
    unittest.main()
