import json
import sqlite3
import sys
import unittest

sys.path.insert(0, ".")
import generate_strategies as G


class Registry(unittest.TestCase):
    def test_every_strategy_uses_known_conditions_and_has_a_control(self):
        reg = G.load_registry()
        ids = [s["id"] for s in reg["strategies"]]
        self.assertIn("A0", ids)
        self.assertIn("B0", ids)
        for s in reg["strategies"]:
            for n in s["entry"]:
                self.assertIn(n, G.CONDS, n)
            if s["mode"] == "B":
                self.assertIn(s["hold"], (1, 2, 3, 4, 5))


class Outcomes(unittest.TestCase):
    def test_target_before_stop_and_stop_before_target(self):
        path = {"first_hit": {"up_0.3": 6, "up_0.5": 10, "up_0.75": 40, "down_0.3": 25}}
        self.assertEqual(G.stop_target_outcome(path, "up", 0.5, 0.3), "target")
        self.assertEqual(G.stop_target_outcome(path, "up", 0.75, 0.3), "stop")
        self.assertEqual(G.stop_target_outcome(path, "up", 1.0, 0.5), "close")
        self.assertEqual(G.stop_target_outcome(path, "down", 0.5, 0.3), "stop")
        self.assertEqual(G.stop_target_outcome(path, "down", 0.5, 1.0), "close")

    def test_intraday_path_measures_from_the_10_00_bar(self):
        conn = sqlite3.connect(":memory:")
        self.addCleanup(conn.close)
        conn.execute("CREATE TABLE intraday_bars (date TEXT, timestamp TEXT, open REAL, high REAL, low REAL, close REAL, volume INTEGER, vwap REAL)")
        rows = []
        for i in range(390):
            h, m = divmod(9 * 60 + 30 + i, 60)
            ts = f"{h:02d}:{m:02d}"
            if ts == "10:00":
                o, hi, lo, c = 100.0, 100.1, 99.9, 100.0
            elif ts == "12:30":
                o, hi, lo, c = 100.6, 100.9, 100.5, 100.8
            elif ts == "14:00":
                o, hi, lo, c = 100.2, 100.3, 99.5, 99.6
            else:
                o, hi, lo, c = 100.0, 100.2, 99.8, 100.1
            rows.append(("2026-09-18", ts, o, hi, lo, c, 0, None))
        conn.executemany("INSERT INTO intraday_bars VALUES (?,?,?,?,?,?,?,?)", rows)
        exits = [{"id": "1130", "bar": "12:30"}, {"id": "close", "bar": "15:59"}]
        p = G.intraday_paths(conn, exits)["2026-09-18"]
        self.assertEqual(p["entry"], 100.0)
        self.assertAlmostEqual(p["exits"]["1130"], 0.8, places=6)
        self.assertAlmostEqual(p["mfe_up"], 0.9, places=6)
        self.assertAlmostEqual(p["mfe_down"], 0.5, places=6)
        self.assertIn("up_0.5", p["first_hit"])
        self.assertNotIn("down_0.75", p["first_hit"])

    def test_option_best_uses_entry_ask_and_exit_bid_at_min_dte(self):
        conn = sqlite3.connect(":memory:")
        self.addCleanup(conn.close)
        conn.execute("CREATE TABLE option_chain (captured_at TEXT, session_date TEXT, spot REAL, expiry TEXT, cp TEXT, strike REAL, bid REAL, ask REAL, iv REAL, open_interest INTEGER, volume INTEGER, gamma REAL)")
        rows = [("2026-09-18T10:02:00-04:00", "2026-09-18", 760, "2026-09-22", "C", 762, 1.0, 1.1, 0.2, 1, 1, 0),
                ("2026-09-18T10:02:00-04:00", "2026-09-18", 760, "2026-09-19", "C", 762, 0.5, 0.6, 0.2, 1, 1, 0),
                ("2026-09-18T13:31:00-04:00", "2026-09-18", 765, "2026-09-22", "C", 762, 3.3, 3.4, 0.2, 1, 1, 0),
                ("2026-09-18T13:31:00-04:00", "2026-09-18", 765, "2026-09-19", "C", 762, 3.0, 3.1, 0.2, 1, 1, 0)]
        conn.executemany("INSERT INTO option_chain VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", rows)
        best = G.option_best(conn, "2026-09-18", "13:30", 2)
        self.assertEqual((best["expiry"], best["strike"], best["contracts_compared"]), ("2026-09-22", 762, 1))
        self.assertAlmostEqual(best["return_pct"], (3.3 / 1.1 - 1) * 100, places=1)


class Decision(unittest.TestCase):
    def test_verdict_reads_the_roles(self):
        r = lambda k, n: G.rate(k, n)
        mk = lambda id, role, mode, e, hold=None: {"id": id, "name": id, "role": role, "mode": mode, "hold": hold, "n": 100, "either_side": {"0.75": e, "1.5": e}, "exits": {"close": {"n": 100, "long": r(50, 100), "short": r(50, 100)}, "3": {"n": 100, "long": r(50, 100), "short": r(50, 100)}}, "peak_min_median": 240, "contracts": {"scored": 0}}
        results = [mk("A0", "control", "A", r(35, 100)), mk("A4", "trade", "A", r(75, 100)), mk("A5", "avoid", "A", r(10, 100)), mk("B0", "control", "B", r(50, 100), 3), mk("B5", "avoid", "B", r(15, 100), 3), mk("B1", "trade", "B", r(80, 100), 3)]
        today = {"prior_class": "narrow", "vix": 14.8, "vix_bucket": "under 15", "dd_bucket": "within 2%"}
        d = G.decide(results, [], today, ["B0", "B5"], ["A0", "A4", "A5"], 760.0, [{"id": "close", "label": "Close"}])
        self.assertEqual(d["verdict"], "NO HOLD · DAY TRADE ONLY IF THE 9:00 CT RANGE IS WIDE")
        self.assertTrue(any("no trade" in l for l in d["lines"]))
        self.assertTrue(any("stay out" in l for l in d["lines"]))
        d = G.decide(results, [], today, ["B0", "B1"], ["A0"], 760.0, [{"id": "close", "label": "Close"}])
        self.assertEqual(d["hold"], "HOLD CANDIDATE")
        self.assertEqual(d["day"], "NO DAY TRADE")


class Findings(unittest.TestCase):
    def test_a_finding_needs_non_overlapping_intervals(self):
        self.assertTrue(G.separated(G.rate(60, 80), G.rate(30, 80)))
        self.assertFalse(G.separated(G.rate(42, 80), G.rate(38, 80)))


if __name__ == "__main__":
    unittest.main()
