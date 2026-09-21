import re
import sqlite3
import unittest

import fetch_and_analyze as F


class Export(unittest.TestCase):
    def table(self):
        conn = sqlite3.connect(":memory:")
        self.addCleanup(conn.close)
        conn.execute("""CREATE TABLE weekly_em (week_start TEXT PRIMARY KEY, week_end TEXT, friday_close REAL, week_close REAL,
            closed_inside INTEGER, breach INTEGER, breach_side TEXT, weekly_gap REAL, gap_filled INTEGER, max_pain REAL,
            static_wem_high REAL, static_wem_low REAL, static_wem_range REAL, static_wem_iv REAL,
            static_band_status TEXT, breach_intraweek INTEGER)""")
        conn.execute("ALTER TABLE weekly_em DROP COLUMN max_pain")
        conn.executemany("INSERT INTO weekly_em VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [
            ("2026-09-21", "2026-09-25", 761.69, None, None, None, None, None, None, 772.36, 751.02, 21.35, 0.1012, "ok", None),
            ("2026-09-14", "2026-09-18", 764.29, 761.69, 1, 0, None, 1.2, 1, 780.0, 748.0, 32.0, 0.14, "vix", 0),
        ])
        return conn

    def test_every_value_lands_under_its_own_name_after_a_column_is_dropped(self):
        rows = F.weekly_em_rows(self.table().cursor())
        now = rows[0]
        self.assertEqual((now["static_wem_low"], now["static_wem_high"], now["static_wem_range"]), (751.02, 772.36, 21.35))
        self.assertEqual((now["static_wem_iv"], now["static_band_status"]), (0.1012, "ok"))
        self.assertNotIn("max_pain", now)
        self.assertIn("breach_intraweek", now)

    def test_the_stats_count_the_closed_weeks_with_a_band(self):
        stats = F.build_wem_stats(F.weekly_em_rows(self.table().cursor()))
        self.assertEqual((stats["total_weeks"], stats["weeks_vix_implied"], stats["pct_inside"]), (1, 1, 100.0))

    def test_the_export_takes_names_from_the_query_not_a_typed_list(self):
        with open("fetch_and_analyze.py", encoding="utf-8") as f:
            s = f.read()
        self.assertIn("weekly_em = weekly_em_rows(c)", s)
        self.assertNotIn('"breach_day","max_pain"', s)


class Panel(unittest.TestCase):
    def setUp(self):
        with open("dashboard2.js", encoding="utf-8") as f:
            s = f.read()
        start = s.index("  if(zEl) {\n    const W = Math.max(zEl.offsetWidth||500, 380);")
        i, depth = s.index("{", start), 0
        while True:
            depth += {"{": 1, "}": -1}.get(s[i], 0)
            i += 1
            if depth == 0:
                break
        self.block, self.src = s[start:i], s

    def test_the_panel_is_redrawn_when_its_tab_opens(self):
        with open("dashboard1.js", encoding="utf-8") as f:
            self.assertIn("if(id==='wem' && _md) { try { renderWEM(_md); }", f.read())

    def test_the_curve_gets_the_widest_column_and_no_removed_variable_is_used(self):
        self.assertIn("const bX  = Math.round(W * 0.52);", self.block)
        self.assertIsNone(re.search(r"[^\w.]col[^\w]", self.block.replace("color", "").replace("col-", "")))

    def test_no_svg_text_is_smaller_than_ten_pixels(self):
        sizes = [int(x) for x in re.findall(r'font-size="(\d+)"', self.block)]
        self.assertTrue(sizes)
        self.assertGreaterEqual(min(sizes), 10)

    def test_price_and_midpoint_are_compared_in_cents(self):
        self.assertIn("const mid2  = cur ? Math.round(_sMid * 100) / 100 : 0;", self.src)
        self.assertIn("const price2 = Math.round((spy.price || mid2 || 0) * 100) / 100;", self.src)


if __name__ == "__main__":
    unittest.main()
