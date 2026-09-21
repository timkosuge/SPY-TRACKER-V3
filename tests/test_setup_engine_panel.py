import json
import os
import subprocess
import tempfile
import unittest

FRAME_PATH = os.path.join(tempfile.gettempdir(), "se_frame.json")

HARNESS = r"""
const fs=require('fs');
const window={}; global.window=window;
eval(fs.readFileSync('shared.js','utf8').replace(/^const /gm,'var '));
global.wilson95=wilson95; global.fmtDate=fmtDate;
global.CHAINS_DATA=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
let html=''; global.document={getElementById:id=>({set innerHTML(v){html=v;}})};
eval(fs.readFileSync('setup_engine.js','utf8'));
const text=()=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const out={};
window._seToggle('gap_up_030'); out.one=text();
window._seToggle('prior_red'); out.two=text();
window._seToggle('monday'); out.three=text();
process.stdout.write(JSON.stringify(out));
"""


def frame(n_days, gap_up_hit=True):
    rows = []
    d = 20260101
    for i in range(n_days):
        date = f"2026-{(i // 28) + 1:02d}-{(i % 28) + 1:02d}"
        gap = 0.5 if i % 2 == 0 else -0.1
        prior = -0.4 if i % 3 == 0 else 0.3
        hit = 1.0 if (gap > 0.3 and gap_up_hit) else -0.5
        rows.append([date, 100.0, 101.0, 99.0, 100.0 + hit, gap, prior, i % 5, False, False, False, None, None, False, False, False, [[hit, 1.0, 1.0]] + [None] * 4, None])
    return {"keys": ["date", "open", "high", "low", "close", "gap_pct", "prior_oc_pct", "weekday", "is_monthly_opex", "is_month_first", "is_month_last", "wem_high", "wem_low", "is_cpi", "is_nfp", "is_fomc", "holds", "worst_min"],
            "rows": rows, "registry": [{"name": n, "label": n, "category": c, "requires": ["daily_ohlcv"]} for n, c in (("gap_up_030", "gap"), ("prior_red", "prior_session"), ("monday", "weekday"))],
            "earliest_by_requirement": {"daily_ohlcv": "2026-01-01"}, "eras": {"3y": "2026-01-01", "5y": "2026-01-01", "all": "2026-01-01"},
            "base_rates": {k: {"start": "2026-01-01", "n": n_days, "hits": n_days // 2, "rate": 50.0, "lo": 40.0, "hi": 60.0} for k in ("3y", "5y", "all")},
            "current_price": 700.0, "pain_pct_default": 0.32, "max_hold": 5, "intraday_coverage": {"sessions": 0, "first": None, "last": None}, "generated": "2026-09-20T18:00:00-04:00"}


class Panel(unittest.TestCase):
    def run_harness(self, data):
        with open(FRAME_PATH, "w") as f:
            json.dump(data, f)
        r = subprocess.run(["node", "-e", HARNESS, FRAME_PATH], capture_output=True, text=True, encoding="utf-8", check=True)
        return json.loads(r.stdout)

    def test_ladder_rates_and_suppression(self):
        out = self.run_harness(frame(224))
        self.assertIn("gap_up_030 112", out["one"])
        self.assertRegex(out["one"], r"100\.0% [\d.]+–[\d.]+ · 112/112")
        self.assertIn("— survives a false-discovery rate", out["one"])
        self.assertRegex(out["three"], r"monday \d+ [\d.]+% n=\d+ — too few")
        self.assertIn("chains evaluated this session: 3", out["three"])

    def test_dollar_figures_hidden_on_all_history(self):
        d = frame(120)
        with open(FRAME_PATH, "w") as f:
            json.dump(d, f)
        js = HARNESS.replace("window._seToggle('gap_up_030'); out.one=text();", "window._seEra('all'); window._seToggle('gap_up_030'); out.one=html;")
        r = subprocess.run(["node", "-e", js, FRAME_PATH], capture_output=True, text=True, encoding="utf-8", check=True)
        out = json.loads(r.stdout)
        table = out["one"].split("<tbody>")[1].split("</tbody>")[0]
        self.assertNotIn("($", table)
        self.assertIn("%", table)


if __name__ == "__main__":
    unittest.main()
