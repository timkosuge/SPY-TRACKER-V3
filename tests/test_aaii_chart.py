import json
import re
import subprocess
import unittest

HARNESS = r"""
const fs=require('fs');
const src=fs.readFileSync('dashboard2.js','utf8').replace(/\r\n/g,'\n');
const i=src.indexOf("const AAII_RANGES"), j=src.indexOf("function renderAAIIChart");
const k=src.indexOf("\n}\n", j)+3;
global.window={}; const els={aaiiChart:{innerHTML:''}, aaiiChartLabel:{textContent:''}};
global.document={getElementById:id=>els[id]}; global.$=id=>els[id];
global.fmt=(v,d)=>Number(v).toFixed(d); global.fmtDate=d=>d;
eval(src.slice(i,k).replace('const AAII_RANGES','var AAII_RANGES').replace('function renderAAIIChart','global.renderAAIIChart = function'));
const hist=[];
for (let w=0; w<2000; w++){ const d=new Date(Date.UTC(1988,0,6)+w*7*864e5).toISOString().slice(0,10); const b=20+((w*37)%50), br=15+((w*53)%55); hist.push({d, bull:b, neu:Math.max(0,100-b-br), bear:br}); }
hist.push(hist[hist.length-1]);
const out={};
for (const r of ['26w','1y','5y','all']) {
  window._aaiiRange=r; renderAAIIChart(r==='26w'?hist:undefined);
  const h=els.aaiiChart.innerHTML;
  const polys=(h.match(/<polyline points="([^"]+)"/g)||[]).map(p=>p.replace(/^<polyline points="/,'').replace(/"$/,'').split(' ').map(q=>q.split(',').map(Number)));
  const ys=polys.flat().map(p=>p[1]);
  out[r]={label:els.aaiiChartLabel.textContent, lines:polys.length, points:polys[0].length, dateLabels:(h.match(/font-size="9" fill="#9090c0">[A-Z][a-z]{2} /g)||[]).length, ymin:Math.min(...ys), ymax:Math.max(...ys)};
}
process.stdout.write(JSON.stringify(out));
"""


class AaiiChart(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.out = json.loads(subprocess.run(["node", "-e", HARNESS], capture_output=True, text=True, encoding="utf-8", check=True).stdout)

    def test_each_range_draws_only_its_weeks_and_the_label_says_so(self):
        self.assertEqual(self.out["26w"]["points"], 26)
        self.assertEqual(self.out["1y"]["points"], 52)
        self.assertEqual(self.out["5y"]["points"], 260)
        self.assertEqual(self.out["all"]["points"], 2000)
        self.assertIn("26 WEEKS", self.out["26w"]["label"])
        self.assertIn("2,000 WEEKS SINCE 1988", self.out["all"]["label"])

    def test_long_ranges_draw_the_spread_short_ranges_draw_three_lines(self):
        self.assertEqual(self.out["26w"]["lines"], 3)
        self.assertEqual(self.out["all"]["lines"], 1)

    def test_the_axis_carries_six_dates_however_many_weeks_are_drawn(self):
        for r in ("26w", "1y", "5y", "all"):
            self.assertEqual(self.out[r]["dateLabels"], 6, r)

    def test_nothing_is_drawn_outside_the_plot(self):
        for r in ("26w", "1y", "5y", "all"):
            self.assertGreaterEqual(self.out[r]["ymin"], 12, r)
            self.assertLessEqual(self.out[r]["ymax"], 190, r)


class NoUnmeasuredClaims(unittest.TestCase):
    def test_leveraged_money_is_not_described_as_predictive(self):
        with open("dashboard2.js", encoding="utf-8") as f:
            self.assertNotIn("most predictive signal", f.read())


if __name__ == "__main__":
    unittest.main()
