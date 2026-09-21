import base64
import json
import os
import sqlite3
import subprocess
import tempfile
import unittest
from datetime import date

import fetch_margin as F
import generate_margin as G

WORKBOOK = base64.b64decode(
    "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"
)


class Workbook(unittest.TestCase):
    def test_every_month_is_read_in_order_with_blanks_kept_blank(self):
        rows = F.parse_workbook(WORKBOOK)
        self.assertEqual([r[0] for r in rows], ["1997-01", "2026-06", "2026-07", "2026-08"])
        self.assertEqual(rows[-1], ("2026-08", 1453832, 207641, 217499))
        self.assertIsNone(rows[0][3])

    def test_a_different_layout_is_refused(self):
        from openpyxl import Workbook as W
        import io
        wb = W(); wb.active.append(["Month", "Debt"]); wb.active.append(["2026-08", 1])
        b = io.BytesIO(); wb.save(b)
        with self.assertRaises(ValueError):
            F.parse_workbook(b.getvalue())


class Fetch(unittest.TestCase):
    def run_fetch(self, page, workbook):
        asked = []

        class R:
            def __init__(self, status, content):
                self.status_code, self.content = status, content

        class S:
            def get(self, url, **k):
                asked.append((url, k.get("headers", {}).get("Referer")))
                return R(*(page if url == F.FINRA_PAGE else workbook))

        orig = F._session
        try:
            F._session = lambda: S()
            return F.fetch(), asked
        finally:
            F._session = orig

    def test_the_page_is_opened_before_the_workbook_on_the_same_connection(self):
        (rows, status, detail), asked = self.run_fetch((200, b"<html>page</html>"), (200, WORKBOOK))
        self.assertEqual((len(rows), status, detail), (4, 200, "workbook fetched from FINRA"))
        self.assertEqual(asked, [(F.FINRA_PAGE, None), (F.FINRA_XLSX, F.FINRA_PAGE)])

    def test_a_refusal_is_reported_not_hidden(self):
        (rows, status, detail), _ = self.run_fetch((403, b""), (403, b"<html>denied</html>"))
        self.assertEqual((rows, status, detail), (None, 403, "FINRA answered HTTP 403"))

    def test_a_challenge_page_is_not_mistaken_for_the_workbook(self):
        (rows, status, detail), _ = self.run_fetch((200, b""), (200, b"<html>challenge</html>"))
        self.assertIsNone(rows)
        self.assertEqual(detail, "FINRA answered with a page, not the workbook")

    def test_the_connection_negotiates_like_chrome(self):
        with open("fetch_margin.py", encoding="utf-8") as f:
            src = f.read()
        self.assertIn('Session(impersonate="chrome")', src)
        self.assertNotIn("import requests\n", src)


class Currency(unittest.TestCase):
    def test_the_month_finra_should_have_published(self):
        self.assertEqual(G.expected_month(date(2026, 9, 21)), "2026-07")
        self.assertEqual(G.expected_month(date(2026, 9, 25)), "2026-08")
        self.assertEqual(G.expected_month(date(2027, 1, 10)), "2026-11")

    def test_changes_record_and_how_far_behind(self):
        rows = [("2025-08", 1000, 1, 1, "h"), ("2026-06", 1500, 1, 1, "h"), ("2026-07", 1400, 1, 1, "h"), ("2026-08", 1450, 200, 250, "h")]
        out = G.build(rows, None, date(2026, 9, 26))
        self.assertTrue(out["current"])
        self.assertEqual(out["latest"]["month_words"], "August 2026")
        self.assertEqual(out["latest"]["net"], 1000)
        self.assertEqual(out["change_mom_pct"], round((1450 / 1400 - 1) * 100, 2))
        self.assertEqual(out["change_yoy_pct"], 45.0)
        self.assertEqual((out["record"]["month"], out["record"]["pct_from_record"]), ("2026-06", round((1450 / 1500 - 1) * 100, 1)))
        late = G.build(rows, None, date(2026, 11, 30))
        self.assertEqual((late["current"], late["months_behind"], late["expected_words"]), (False, 2, "October 2026"))


class Merge(unittest.TestCase):
    def test_fetched_months_override_the_committed_history_and_the_last_attempt_is_reported(self):
        conn = sqlite3.connect(":memory:")
        self.addCleanup(conn.close)
        F.create(conn)
        conn.execute("INSERT INTO margin_monthly VALUES ('2099-01', 7, 1, 1, 'finra_xlsx')")
        conn.execute("INSERT INTO margin_fetch_log VALUES ('2099-02-20T16:00:00-05:00', 403, 0, 0, NULL, 'FINRA answered HTTP 403')")
        rows, fetch = G.merged(conn)
        self.assertEqual(rows[-1][:2], ("2099-01", 7))
        self.assertEqual(rows[-1][4], "fetched from FINRA")
        self.assertFalse(fetch["ok"])
        self.assertIsNone(fetch["last_success"])

    def test_the_committed_history_is_complete_and_unique(self):
        rows = F.read_history_csv()
        months = [r[0] for r in rows]
        self.assertGreaterEqual(len(rows), 356)
        self.assertEqual(months[0], "1997-01")
        self.assertGreaterEqual(months[-1], "2026-08")
        self.assertEqual(len(months), len(set(months)))


class NoFixedFigures(unittest.TestCase):
    def test_no_typed_in_margin_figures_remain(self):
        with open("dashboard2.js", encoding="utf-8") as f:
            d = f.read()
        for s in ("MARGIN_HISTORY", "892", "$936B", "static_fallback"):
            self.assertNotIn(s, d)
        with open("functions/liquidity.js", encoding="utf-8") as f:
            l = f.read().lower()
        self.assertNotIn("finra", l)
        self.assertNotIn("margin", l)

    def test_the_fetch_runs_before_the_database_is_pushed(self):
        with open(".github/workflows/spy_tracker.yml", encoding="utf-8") as f:
            s = f.read()
        self.assertLess(s.index("python fetch_margin.py"), s.index("name: Push database to data branch"))
        self.assertIn("margin_data.js", s)


MICHIGAN = r"""
const fs = require('fs');
const store = {};
global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
const src = fs.readFileSync('dashboard2.js', 'utf8').replace(/\r\n/g, '\n');
const a = src.indexOf('function fredCacheable'), b = src.indexOf('async function loadMichiganSentiment');
eval(src.slice(a, b).replace(/^function (\w+)/gm, 'global.$1 = function').replace(/^async function (\w+)/gm, 'global.$1 = async function'));
const out = {};
out.throttled = fredCacheable({ series: { A: 1 }, throttled: true });
out.complete = fredCacheable({ series: { A: 1 }, throttled: false });
fredCacheWrite({ series: { A: 1 }, throttled: true });
out.keptPartial = localStorage.getItem('spy_fred_cache') !== null;
store.spy_fred_cache = JSON.stringify({ ts: Date.now(), data: { series: { A: 1 }, throttled: true } });
out.readPartial = fredCacheRead() !== null;
let fetched = 0;
global.fetch = async () => { fetched++; return { ok: true, json: async () => ({ series: { UMCSENT: { latest: 55.2 } }, throttled: false }) }; };
(async () => {
  store.spy_fred_cache = JSON.stringify({ ts: Date.now(), data: { series: { A: 1 }, throttled: false } });
  let d = fredCacheRead();
  if (!d || !(d.series || {}).UMCSENT) d = await fredFetch();
  out.refetched = fetched;
  out.michigan = d.series.UMCSENT.latest;
  process.stdout.write(JSON.stringify(out));
})();
"""


class Michigan(unittest.TestCase):
    def test_a_rate_limited_answer_is_never_kept_and_a_missing_series_is_fetched_fresh(self):
        out = json.loads(subprocess.run(["node", "-e", MICHIGAN], capture_output=True, text=True, encoding="utf-8", check=True).stdout)
        self.assertEqual((out["throttled"], out["complete"]), (False, True))
        self.assertFalse(out["keptPartial"])
        self.assertFalse(out["readPartial"])
        self.assertEqual(out["refetched"], 1)
        self.assertEqual(out["michigan"], 55.2)

    def test_the_michigan_panel_fetches_fresh_when_its_series_is_missing(self):
        with open("dashboard2.js", encoding="utf-8") as f:
            s = f.read()
        self.assertIn("if (!fredData || !(fredData.series || {}).UMCSENT) fredData = await fredFetch();", s)


if __name__ == "__main__":
    unittest.main()
