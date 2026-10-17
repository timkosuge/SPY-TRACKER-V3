import json
import re
import subprocess
import unittest

import generate_options_env as O


def env(**over):
    o = {"today": {"verdict": "ordinary", "implied_30d": 12.00, "realized_20d": 9.16, "spread": 5.65, "spread_percentile_3y": 64.0,
                   "expected_daily_move_pct": 0.933, "typical_move_priced_pct": 0.629, "delivered_daily_move_pct": 0.45,
                   "close": 600.00, "priced_dollars": 3.77, "delivered_dollars": 2.70, "gap_dollars": 1.07,
                   "term": {"vix9d": 12.27, "vix": 14.81, "vix3m": 18.24}, "term_shape": "upward"},
         "premium": {"2010_on": {"n": 4182, "median_premium": 4.5, "overpriced": {"rate": 83.7}},
                     "by_vix": {"under 15": {"n": 1448, "median_premium": 3.46}, "15 to 20": {"n": 1540, "median_premium": 4.1},
                                "20 to 30": {"n": 958, "median_premium": 5.9}, "over 30": {"n": 256, "median_premium": 9.02}}},
         "term_structure": {"upward": {"n": 3107, "median_premium": 4.27}},
         "chain": {"available": True, "captured_at": "2026-04-28T12:00:00-04:00",
                   "buckets": {"2 to 4|at the money": {"n": 32, "median_spread_pct": 0.9}, "5 to 9|2 to 4%": {"n": 40, "median_spread_pct": 13.2}}},
         "weekly_range": {"n": 38, "held": {"rate": 84.2}, "median_overshoot_high": 1.12, "median_overshoot_low": 1.24}}
    o.update(over)
    return o


class Answers(unittest.TestCase):
    def rows(self, o=None):
        return {r["q"]: r for r in O.answer_rows(o or env())}

    def test_the_typical_priced_move_is_the_median_not_one_standard_deviation(self):
        self.assertAlmostEqual(O.MEDIAN_ABS_NORMAL, 0.6745, places=4)
        r = self.rows()["Is SPY moving as much as the index is charging for?"]
        self.assertEqual(r["a"], "Less than priced")
        self.assertIn("0.63%", r["why"])
        self.assertNotIn("0.93%", r["why"])

    def test_the_regime_line_never_compares_a_regime_with_itself(self):
        r = self.rows()["Does today's VIX of 12.00 change that?"]
        self.assertEqual(r["a"], "The cheapest level to buy in")
        self.assertEqual(r["why"].count("under 15"), 1)
        self.assertIn("with VIX over 30, 9.02 points", r["why"])

    def test_the_most_expensive_corner_is_described_in_words(self):
        r = self.rows()["What does it cost to get in and out?"]
        self.assertEqual(r["a"], "0.9% of the contract's price")
        self.assertIn("contracts 5 to 9 days out, 2 to 4% from spot, at 13.2%", r["why"])
        self.assertNotIn("|", r["why"])

    def test_the_index_line_names_the_index_rather_than_contracts(self):
        self.assertEqual(self.rows()["Is the 30-day index expensive?"]["a"], "Fairly priced")
        with open("options_env_panel.js", encoding="utf-8") as f:
            panel = f.read()
        self.assertIn("30-DAY INDEX VOLATILITY IS", panel)
        self.assertNotIn("CONTRACTS ARE FAIRLY PRICED", panel)

    def test_the_headline_prices_short_dated_contracts_not_the_index(self):
        with open("options_env_panel.js", encoding="utf-8") as f:
            panel = f.read()
        self.assertIn("CONTRACTS UNDER ${SD.max_days} DAYS ARE ${SD_WORD[SD.band]} TO HOLD", panel)
        self.assertIn("NOT A READING ON THE CONTRACTS NAMED ABOVE", panel)

    def test_no_chain_is_said_plainly(self):
        r = self.rows(env(chain={"available": False}))["What does it cost to get in and out?"]
        self.assertEqual(r["a"], "No chain captured yet")


class Layout(unittest.TestCase):
    def test_the_answer_and_the_unsupported_line_come_before_the_fold(self):
        with open("options_env_panel.js", encoding="utf-8") as f:
            s = f.read().replace("\r\n", "\n")
        page = s[s.index("    el.innerHTML = `"):]
        self.assertLess(page.index("${rows"), page.index("TESTED AND NOT SUPPORTED"))
        self.assertLess(page.index("TESTED AND NOT SUPPORTED"), page.index("evidenceFold('oeEvidence'"))
        self.assertLess(page.index("evidenceFold('oeEvidence'"), page.index("WHAT THE INDEX CHARGED AGAINST WHAT SPY THEN DELIVERED"))


if __name__ == "__main__":
    unittest.main()


class MissingPrice(unittest.TestCase):
    def test_a_session_with_no_priced_move_still_builds_its_rows(self):
        o = env()
        o["today"]["priced_dollars"] = None
        o["today"]["delivered_dollars"] = None
        rows = {r["q"]: r for r in O.answer_rows(o)}
        self.assertIn("0.63%", rows["Is the 30-day index expensive?"]["why"])

    def test_money_falls_back_to_the_percentage_then_to_words(self):
        self.assertEqual(O.money(6.48, 0.85), "$6.48")
        self.assertEqual(O.money(None, 0.85), "0.85%")
        self.assertEqual(O.money(None, None), "an unmeasured amount")
