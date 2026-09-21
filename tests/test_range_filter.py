import json
import os
import sqlite3
import subprocess
import tempfile
import sys
import unittest

RF_PATH = os.path.join(tempfile.gettempdir(), "rf_data.json").replace("\\", "/")

sys.path.insert(0, ".")
import generate_range_filter as R


class Classification(unittest.TestCase):
    def test_quartiles_and_classes(self):
        q = R.quartiles([0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2])
        self.assertEqual((q["q25"], q["q75"]), (0.6, 1.0))
        self.assertEqual(R.classify(1.0, q), "wide")
        self.assertEqual(R.classify(0.6, q), "narrow")
        self.assertEqual(R.classify(0.8, q), "middle")
        self.assertIsNone(R.classify(None, q))


class OpeningRange(unittest.TestCase):
    def test_or_and_best_excursion_are_measured_from_the_or_close(self):
        conn = sqlite3.connect(":memory:")
        conn.execute("CREATE TABLE intraday_bars (date TEXT, timestamp TEXT, open REAL, high REAL, low REAL, close REAL, volume INTEGER, vwap REAL)")
        rows = []
        for i in range(390):
            h, m = divmod(9 * 60 + 30 + i, 60)
            ts = f"{h:02d}:{m:02d}"
            if i < 30:
                o, hi, lo, c = 100.0, 100.5, 99.8, 100.2
            elif i == 30:
                o, hi, lo, c = 100.2, 100.3, 100.1, 100.2
            elif i == 200:
                o, hi, lo, c = 100.2, 101.4, 100.2, 101.0
            else:
                o, hi, lo, c = 100.2, 100.4, 99.9, 100.2
            rows.append(("2026-09-18", ts, o, hi, lo, c, 0, None))
        conn.executemany("INSERT INTO intraday_bars VALUES (?,?,?,?,?,?,?,?)", rows)
        s = R.intraday_sessions(conn)["2026-09-18"]
        self.assertAlmostEqual(s["or_pct"], 0.7, places=6)
        self.assertAlmostEqual(s["best_pct"], (101.4 - 100.2) / 100.2 * 100, places=6)
        self.assertEqual(s["best_side"], "up")
        self.assertEqual(s["peak_min"], 200)
        self.assertAlmostEqual(s["adverse_pct"], (100.2 - 99.9) / 100.2 * 100, places=6)


class Panel(unittest.TestCase):
    def test_panel_renders_today_and_the_live_setup(self):
        cell = lambda n: {"n": n, "median_best": 1.0, "stability": {"holds": True}, "ge_050": {"k": n, "n": n, "rate": 90.0, "lo": 80.0, "hi": 95.0}, "ge_075": {"k": n, "n": n, "rate": 80.0, "lo": 70.0, "hi": 88.0}, "ge_100": {"k": n, "n": n, "rate": 50.0, "lo": 40.0, "hi": 60.0}, "median_adverse": 0.3, "peak_min_median": 300, "peak_min_q25": 200, "peak_min_q75": 350, "side_with_or": {"k": n // 2, "n": n, "rate": 50.0, "lo": 40.0, "hi": 60.0}}
        hold = lambda n: {"n": n, "median_best": 1.8, "stability": {"holds": True}, "ge_100": {"k": n, "n": n, "rate": 85.0, "lo": 80.0, "hi": 90.0}, "ge_150": {"k": n, "n": n, "rate": 60.0, "lo": 50.0, "hi": 70.0}, "ge_200": {"k": n, "n": n, "rate": 40.0, "lo": 30.0, "hi": 50.0}}
        data = {"as_of": "2026-09-18", "next_session": "2026-09-21", "current_price": 760.0,
                "day_thresholds": {"wide_pct": 1.2, "narrow_pct": 0.6, "window_start": "2025-09-18", "n": 252},
                "or_thresholds": {"wide_pct": 0.5, "narrow_pct": 0.25, "window_start": "2025-09-18", "n": 250},
                "latest_session": {"date": "2026-09-18", "range_pct": 1.5, "range_pts": 11.4, "class": "wide", "vix": 17.5, "vix_bucket": "15 to 20", "dd_pct": -3.1, "dd_bucket": "2 to 5% below"},
                "table_a": {f"{p}/{o}": cell(40) for p in ("wide", "middle", "narrow") for o in ("wide", "middle", "narrow")},
                "table_a_coverage": {"sessions": 500, "first": "2024-07-11", "last": "2026-09-18"},
                "table_b": {k: {"start": "2023-09-18", **{p: {"1": hold(100), "3": hold(100), "5": hold(100)} for p in ("wide", "middle", "narrow")}} for k in ("3y", "all")},
                "table_b_regime": {k: {"vix": {b: {"1": hold(100), "3": hold(100), "5": hold(100)} for b in ("under 15", "15 to 20", "20 to 30", "over 30")}, "dd": {b: {"1": hold(100), "3": hold(100), "5": hold(100)} for b in ("more than 5% below", "2 to 5% below", "within 2%")}} for k in ("3y", "all")},
                "table_b_cells": {k: {"15 to 20|2 to 5% below|wide": {"1": hold(40), "3": hold(40), "5": hold(40)}} for k in ("3y", "all")},
                "table_a_regime": {"vix": {b: {o: cell(35) for o in ("wide", "middle", "narrow")} for b in ("under 15", "15 to 20", "20 to 30", "over 30")}, "dd": {b: {o: cell(35) for o in ("wide", "middle", "narrow")} for b in ("more than 5% below", "2 to 5% below", "within 2%")}},
                "vix_buckets": ["under 15", "15 to 20", "20 to 30", "over 30"], "dd_buckets": ["more than 5% below", "2 to 5% below", "within 2%"], "vix_coverage": {"sessions": 8488, "last": "2026-09-18"},
                "log": [{"date": "2026-09-18", "prior_class": "narrow", "prior_vix": "15 to 20", "prior_dd": "within 2%", "prior_range_pct": 0.5, "or_pct": 0.3, "or_class": "middle", "best_pct": 0.3, "best_side": "up", "peak_min": 385, "day_range_pct": 0.53, "oc_pct": 0.05}],
                "or_minutes": 30, "floor": 30, "generated": "2026-09-20T18:00:00-04:00"}
        with open(RF_PATH, "w") as f:
            json.dump(data, f)
        bars = [{"t": i, "o": 100.0, "h": 100.6, "l": 99.9, "c": 100.2} for i in range(30)] + [{"t": 30, "o": 100.2, "h": 100.9, "l": 100.1, "c": 100.8}]
        js = r"""
const fs=require('fs'); const window={}; global.window=window;
eval(fs.readFileSync('shared.js','utf8').replace(/^const /gm,'var ')); global.fmtDate=fmtDate;
global.RANGE_FILTER=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
window._spyIntraday={session_live:true, rawBars:JSON.parse(process.argv[2])};
let html=''; global.document={getElementById:()=>({set innerHTML(v){html=v;}})};
eval(fs.readFileSync('range_filter_panel.js','utf8'));
window.renderRangeFilter(); process.stdout.write(html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' '));
"""
        out = subprocess.run(["node", "-e", js, RF_PATH, json.dumps(bars)], capture_output=True, text=True, encoding="utf-8", check=True).stdout
        self.assertIn("CANDIDATE", out)
        self.assertIn("1.50% ($11.40 on Sep 18, 2026) WIDE", out)
        self.assertIn("0.70% ($5.32) WIDE", out)
        self.assertIn("Setup WIDE day + WIDE OR", out)
        self.assertIn("Wide ≥ 1.20% ($9.12)", out)
        self.assertIn("VIX CLOSE 17.50 15 to 20", out)
        self.assertIn("reached a 1.5% one-sided move on 60.0% of 40 three-session holds", out)

    def test_stability_splits_the_cell_in_date_order(self):
        st = R.stability([2.0] * 40 + [0.5] * 40, 1.5)
        self.assertEqual((st["first"]["rate"], st["second"]["rate"], st["holds"]), (100.0, 0.0, False))
        st = R.stability([2.0, 0.5] * 40, 1.5)
        self.assertTrue(st["holds"])
        self.assertIsNone(R.stability([2.0] * 20, 1.5)["holds"])

    def test_buckets_are_words(self):
        self.assertEqual(R.bucket(14.9, R.VIX_BUCKETS), "under 15")
        self.assertEqual(R.bucket(30.0, R.VIX_BUCKETS), "over 30")
        self.assertEqual(R.bucket(-2.0, R.DD_BUCKETS), "within 2%")
        self.assertEqual(R.bucket(-2.01, R.DD_BUCKETS), "2 to 5% below")
        self.assertIsNone(R.bucket(None, R.VIX_BUCKETS))


if __name__ == "__main__":
    unittest.main()
