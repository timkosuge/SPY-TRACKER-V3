import json
import sqlite3
import subprocess
import unittest
from datetime import date, timedelta

import generate_smart_dumb as G

HARNESS = r"""
const fs = require('fs');
global.window = {};
const shared = fs.readFileSync('shared.js', 'utf8').replace(/\r\n/g, '\n');
eval(shared.replace(/^const /gm, 'var '));
global.fmtDate = fmtDate; global.evidenceFold = evidenceFold;
const weeks = [], daily = [];
const start = Date.UTC(2006, 5, 20);
for (let w = 0; w < 1060; w++) {
  const d = new Date(start + w * 7 * 864e5).toISOString().slice(0, 10);
  weeks.push({ d, inst: 40 + (w % 20), small: 45 + (w % 15), spread: 0, px: 100 * Math.pow(1.0015, w) });
}
const last = weeks[weeks.length - 1];
last.inst = 90; last.small = 10;
for (let k = 0; k < 1300; k++) { const d = new Date(Date.parse(last.d) - (1299 - k) * 864e5).toISOString().slice(0, 10); daily.push([d, 500 + k * 0.1]); }
global.SMART_DUMB = { available: true, weeks: weeks.length, first: weeks[0].d, last: last.d, lookback_weeks: 156, aaii_weeks: 2000,
  latest: { d: last.d, entry: last.d, institutional: 90, small: 10, spread: 80, lev_idx: 90, asset_idx: 90, nonrept_idx: 10, other_idx: 10, dealer_idx: 50, aaii_idx: 10, lev_net: 1, asset_net: 1, nonrept_net: 1, other_net: 1, dealer_net: 1 },
  categories: [], tests: {}, verdicts: [], series: weeks, daily_px: daily, extremes: { hi: 72.3, lo: 27.7, since: weeks[0].d } };
let html = ''; let width = 1800; global.document = { getElementById: () => ({ clientWidth: width, set innerHTML(v) { html = v; } }) };
eval(fs.readFileSync('smart_dumb_panel.js', 'utf8').replace(/\r\n/g, '\n'));
const out = {};
for (const r of ['6m', 'all']) {
  window._sdRange = r; window.renderSmartDumb();
  const svg = html.match(/<svg viewBox="0 0 \d+[\s\S]*?<\/svg>/)[0];
  const polys = [...svg.matchAll(/<polyline points="([^"]+)"/g)].map(m => m[1].split(' ').length);
  const vb = svg.match(/viewBox="0 0 (\d+) (\d+)"/); const labels = [...svg.matchAll(/text-anchor="end" font-size="11"[^>]*>(\d+)</g)].map(m => +m[1]);
  out[r] = { vbW: +vb[1], widthAttr: /width="\d+" height="\d+"/.test(svg), leftLabels: labels, polys, callouts: [...svg.matchAll(/font-weight="700"[^>]*>([^<]+)</g)].map(m => m[1]), log: /SPY \(log scale\)/.test(html), dashed: (svg.match(/stroke-dasharray/g) || []).length, legend: (html.match(/Last = \d+/g) || []) };
}
width = 1000; window._sdRange = '6m'; window.renderSmartDumb(); out.narrow = +html.match(/viewBox="0 0 (\d+)/)[1];
process.stdout.write(JSON.stringify(out));
"""


class Chart(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.out = json.loads(subprocess.run(["node", "-e", HARNESS], capture_output=True, text=True, encoding="utf-8", check=True).stdout)

    def test_the_default_view_is_six_months(self):
        price, smart, dumb = self.out["6m"]["polys"]
        self.assertLessEqual(smart, 28)
        self.assertEqual(smart, dumb)
        self.assertGreater(price, 100)

    def test_the_full_view_draws_every_week_on_a_log_price_scale(self):
        price, smart, dumb = self.out["all"]["polys"]
        self.assertEqual(smart, 1060)
        self.assertTrue(self.out["all"]["log"])
        self.assertFalse(self.out["6m"]["log"])

    def test_an_extreme_reading_is_called_out_in_words(self):
        c = self.out["6m"]["callouts"]
        self.assertIn("Smart money is higher than on 9 weeks in 10 since 2006", c)
        self.assertIn("Dumb money is lower than on 9 weeks in 10 since 2006", c)

    def test_both_extremes_are_drawn_and_the_latest_values_labelled(self):
        self.assertEqual(self.out["6m"]["dashed"], 2)
        self.assertEqual(self.out["6m"]["legend"], ["Last = 90", "Last = 10"])


class Layout(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.out = Chart.out if hasattr(Chart, "out") else json.loads(subprocess.run(["node", "-e", HARNESS], capture_output=True, text=True, encoding="utf-8", check=True).stdout)

    def test_the_chart_is_drawn_at_the_panels_real_width_so_text_keeps_its_size(self):
        self.assertEqual(self.out["6m"]["vbW"], 1770)
        self.assertEqual(self.out["narrow"], 970)
        self.assertTrue(self.out["6m"]["widthAttr"])

    def test_the_left_scale_is_fitted_and_always_shows_both_extremes(self):
        labels = self.out["6m"]["leftLabels"]
        self.assertIn(72, labels)
        self.assertIn(28, labels)
        self.assertEqual(labels, sorted(labels))


class Payload(unittest.TestCase):
    def test_extremes_are_the_pooled_tenth_and_ninetieth_percentile(self):
        vals = sorted([10.0, 20, 30, 40, 50, 60, 70, 80, 90, 100])
        self.assertEqual(round(G.percentile(vals, 0.9), 1), 91.0)
        with open("generate_smart_dumb.py", encoding="utf-8") as f:
            s = f.read()
        self.assertIn('percentile(pooled, 0.9)', s)
        self.assertIn('percentile(pooled, 0.1)', s)

    def test_daily_price_is_kept_for_five_years_only(self):
        self.assertEqual(G.DAILY_PRICE_YEARS, 5)


if __name__ == "__main__":
    unittest.main()
