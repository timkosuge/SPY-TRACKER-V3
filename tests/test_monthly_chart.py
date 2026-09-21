import json
import subprocess
import unittest

HARNESS = r"""
const fs = require('fs');
global.window = {};
global.document = { readyState: 'complete', querySelectorAll: () => [], getElementById: id => ({ clientWidth: id === 'wide' ? 1800 : 0 }) };
eval(fs.readFileSync('shared.js', 'utf8').replace(/\r\n/g, '\n').replace(/^const /gm, 'var '));
const series = []; for (let k = 0; k < 36; k++) { const y = 2023 + Math.floor((k + 8) / 12), m = (k + 8) % 12 + 1; series.push([`${y}-${String(m).padStart(2, '0')}`, 50 + (k % 9) * 3]); }
series[20][1] = 90;
const wide = monthlyChart({ series, width: panelWidth('wide'), height: 150, refs: [60, 75], mark: { month: series[20][0], label: 'Record' } });
const out = {
  wideBox: wide.match(/viewBox="0 0 (\d+) (\d+)"/).slice(1).map(Number),
  wideAttr: /width="\d+" height="\d+"/.test(wide),
  hiddenFallback: panelWidth('hidden', 600),
  ticks: [...wide.matchAll(/>([A-Z][a-z]{2} \d{4})</g)].map(m => m[1]),
  dashed: (wide.match(/stroke-dasharray/g) || []).length,
  record: /Record</.test(wide),
  words: monthWords('2026-07'),
  empty: monthlyChart({ series: [['2026-07', 1]] }),
};
process.stdout.write(JSON.stringify(out));
"""


class MonthlyChart(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.out = json.loads(subprocess.run(["node", "-e", HARNESS], capture_output=True, text=True, encoding="utf-8", check=True).stdout)

    def test_it_is_drawn_at_the_panels_real_width(self):
        self.assertEqual(self.out["wideBox"], [1772, 150])
        self.assertTrue(self.out["wideAttr"])
        self.assertEqual(self.out["hiddenFallback"], 600)

    def test_the_axis_carries_dates_in_words(self):
        self.assertEqual(len(self.out["ticks"]), 6)
        self.assertEqual(self.out["ticks"][0], "Sep 2023")
        self.assertEqual(self.out["ticks"][-1], "Aug 2026")
        self.assertEqual(self.out["words"], "July 2026")

    def test_reference_lines_and_the_marked_month_are_drawn(self):
        self.assertEqual(self.out["dashed"], 2)
        self.assertTrue(self.out["record"])

    def test_too_little_data_draws_nothing(self):
        self.assertEqual(self.out["empty"], "")


class NoFixedWidthCharts(unittest.TestCase):
    def test_michigan_and_margin_use_the_shared_chart(self):
        with open("dashboard2.js", encoding="utf-8") as f:
            s = f.read()
        mi = s[s.index("async function loadMichiganSentiment"):s.index("async function loadMarginDebtSentiment")]
        mg = s[s.index("async function loadMarginDebtSentiment"):]
        mg = mg[:mg.index("\n}\n")]
        for block in (mi, mg):
            self.assertIn("monthlyChart(", block)
            self.assertNotIn("const W = 500", block)
        self.assertIn("monthWords((umcs.latest_date", mi)


if __name__ == "__main__":
    unittest.main()
