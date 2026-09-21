import sqlite3
import sys
import unittest
from datetime import date

sys.path.insert(0, ".")
import conditions as C
import generate_chains as G
from stats_helpers import percentile, wilson


class Registry(unittest.TestCase):
    def test_thresholds_are_enumerated_not_free_form(self):
        names = [c["name"] for c in C.CONDITIONS]
        self.assertIn("gap_up_030", names)
        self.assertIn("gap_up_060", names)
        self.assertEqual(len(names), len(set(names)))

    def test_nested_conditions_in_one_category_are_refused(self):
        with self.assertRaises(C.ChainError):
            C.validate_chain(["gap_up_030", "gap_up_060"])
        with self.assertRaises(C.ChainError):
            C.validate_chain(["monday", "friday"])
        self.assertEqual([c["name"] for c in C.validate_chain(["gap_up_030", "prior_red", "monday"])], ["gap_up_030", "prior_red", "monday"])

    def test_regime_conditions_are_registered_one_per_category(self):
        with self.assertRaises(C.ChainError):
            C.validate_chain(["vix_under_15", "vix_over_30"])
        self.assertEqual([c["category"] for c in C.validate_chain(["vix_20_30", "dd_2_5", "gap_up_030"])], ["vix_regime", "drawdown", "gap"])

    def test_pool_start_names_the_binding_condition(self):
        conds = C.validate_chain(["gap_up_030", "open_above_wem_high"])
        start, bound = C.pool_start(conds, {"daily_ohlcv": date(1993, 1, 29), "weekly_em": date(2025, 12, 29)})
        self.assertEqual((start, bound), (date(2025, 12, 29), "open_above_wem_high"))


class Frame(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.addCleanup(self.conn.close)
        self.conn.execute("CREATE TABLE daily_ohlcv (date TEXT, open REAL, high REAL, low REAL, close REAL, volume INTEGER)")
        self.conn.execute("CREATE TABLE weekly_em (week_start TEXT, week_end TEXT, static_wem_high REAL, static_wem_low REAL)")
        rows = [("2026-09-14", 100.0, 101.0, 99.0, 100.5), ("2026-09-15", 101.0, 103.0, 100.0, 102.0), ("2026-09-16", 102.5, 104.0, 98.0, 99.0),
                ("2026-09-17", 99.0, 100.0, 97.0, 99.5), ("2026-09-18", 100.0, 100.5, 96.0, 97.0)]
        self.conn.executemany("INSERT INTO daily_ohlcv VALUES (?,?,?,?,?,0)", rows)
        self.conn.execute("INSERT INTO weekly_em VALUES ('2026-09-14','2026-09-18',103.5,98.5)")

    def test_gap_prior_and_adverse_excursion(self):
        f = G.build_frame(self.conn)
        r = {x["date"]: x for x in f}
        self.assertAlmostEqual(r["2026-09-15"]["gap_pct"], (101.0 / 100.5 - 1) * 100, places=4)
        self.assertAlmostEqual(r["2026-09-15"]["prior_oc_pct"], 0.5, places=4)
        oc, adverse, favorable = r["2026-09-16"]["holds"][0]
        self.assertAlmostEqual(oc, (99.0 - 102.5) / 102.5 * 100, places=4)
        self.assertAlmostEqual(adverse, (102.5 - 98.0) / 102.5 * 100, places=4)
        self.assertAlmostEqual(favorable, (104.0 - 102.5) / 102.5 * 100, places=4)

    def test_multi_day_hold_uses_the_worst_low_of_the_whole_hold(self):
        f = G.build_frame(self.conn)
        r = {x["date"]: x for x in f}
        oc3, adverse3, _ = r["2026-09-15"]["holds"][2]
        self.assertAlmostEqual(oc3, (99.5 - 101.0) / 101.0 * 100, places=4)
        self.assertAlmostEqual(adverse3, (101.0 - 97.0) / 101.0 * 100, places=4)
        self.assertIsNone(r["2026-09-17"]["holds"][2])

    def test_frame_carries_vix_and_drawdown_from_the_prior_close(self):
        self.conn.execute("CREATE TABLE vix_daily (date TEXT PRIMARY KEY, open REAL, high REAL, low REAL, close REAL)")
        self.conn.execute("INSERT INTO vix_daily VALUES ('2026-09-15', 0, 0, 0, 18.5)")
        f = G.build_frame(self.conn)
        r = {x["date"]: x for x in f}
        self.assertEqual(r["2026-09-16"]["vix"], 18.5)
        self.assertIsNone(r["2026-09-15"]["vix"])
        self.assertAlmostEqual(r["2026-09-17"]["dd20"], (99.0 / 102.0 - 1) * 100, places=3)

    def test_weekly_range_and_month_flags(self):
        f = G.build_frame(self.conn)
        r = {x["date"]: x for x in f}
        self.assertEqual((r["2026-09-16"]["wem_high"], r["2026-09-16"]["wem_low"]), (103.5, 98.5))
        self.assertTrue(r["2026-09-14"]["is_month_first"])
        self.assertTrue(r["2026-09-18"]["is_month_last"])


class Helpers(unittest.TestCase):
    def test_wilson_and_percentile(self):
        lo, hi = wilson(365, 751)
        self.assertAlmostEqual(lo, 45.0, places=0)
        self.assertAlmostEqual(hi, 52.2, places=0)
        self.assertIsNone(wilson(0, 0))
        self.assertEqual(percentile([1, 2, 3, 4, 5], 0.5), 3)
        self.assertEqual(percentile([1, 2, 3, 4], 0.5), 2.5)


if __name__ == "__main__":
    unittest.main()
