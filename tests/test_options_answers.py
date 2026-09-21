import json
import re
import subprocess
import unittest

import generate_options_env as O


def env(**over):
    o = {"today": {"verdict": "ordinary", "implied_30d": 14.81, "realized_20d": 9.16, "spread": 5.65, "spread_percentile_3y": 64.0,
                   "expected_daily_move_pct": 0.933, "typical_move_priced_pct": 0.629, "delivered_daily_move_pct": 0.45,
                   "term": {"vix9d": 12.27, "vix": 14.81, "vix3m": 18.24}, "term_shape": "upward"},
         "premium": {"2010_on": {"n": 4182, "median_premium": 4.5, "overpriced": {"rate": 83.7}},
                     "by_vix": {"under 15": {"median_premium": 3.46}, "15 to 20": {"median_premium": 4.1}, "20 to 30": {"median_premium": 5.9}, "over 30": {"median_premium": 9.02}}},
         "term_structure": {"upward": {"median_premium": 4.27}},
         "chain": {"available": True, "buckets": {"2 to 4|at the money": {"median_spread_pct": 0.9}, "5 to 9|2 to 4%": {"median_spread_pct": 13.2}}},
         "weekly_range": {"n": 38, "held": {"rate": 84.2}, "median_overshoot_high": 1.12, "median_overshoot_low": 1.24}}
    o.update(over)
    return o


class Answers(unittest.TestCase):
    def rows(self, o=None):
        return {r["q"]: r for r in O.answer_rows(o or env())}

    def test_the_typical_priced_move_is_the_median_not_one_standard_deviation(self):
        self.assertAlmostEqual(O.MEDIAN_ABS_NORMAL, 0.6745, places=4)
        r = self.rows()["Is SPY moving a lot?"]
        self.assertEqual(r["a"], "Less than priced")
        self.assertIn("0.63%", r["why"])
        self.assertNotIn("0.93%", r["why"])

    def test_the_regime_line_never_compares_a_regime_with_itself(self):
        r = self.rows()["Does VIX under 15 change that?"]
        self.assertEqual(r["a"], "The least overcharged regime")
        self.assertEqual(r["why"].count("under 15"), 1)
        self.assertIn("+9.02 with VIX over 30", r["why"])

    def test_the_most_expensive_corner_is_described_in_words(self):
        r = self.rows()["What does it cost to trade?"]
        self.assertEqual(r["a"], "0.9% at the money")
        self.assertIn("contracts 5 to 9 days out, 2 to 4% from spot, at 13.2%", r["why"])
        self.assertNotIn("|", r["why"])

    def test_verdict_words_match_between_the_card_and_the_line(self):
        self.assertEqual(self.rows()["Are contracts expensive right now?"]["a"], "Fairly priced")
        with open("options_env_panel.js", encoding="utf-8") as f:
            self.assertIn("CONTRACTS ARE FAIRLY PRICED", f.read())

    def test_no_chain_is_said_plainly(self):
        r = self.rows(env(chain={"available": False}))["What does it cost to trade?"]
        self.assertEqual(r["a"], "No chain captured yet")


class Layout(unittest.TestCase):
    def test_the_answer_and_the_unsupported_line_come_before_the_fold(self):
        with open("options_env_panel.js", encoding="utf-8") as f:
            s = f.read().replace("\r\n", "\n")
        page = s[s.index("    el.innerHTML = `"):]
        self.assertLess(page.index("${rows"), page.index("TESTED AND NOT SUPPORTED"))
        self.assertLess(page.index("TESTED AND NOT SUPPORTED"), page.index("evidenceFold('oeEvidence'"))
        self.assertLess(page.index("evidenceFold('oeEvidence'"), page.index("WHAT WAS CHARGED AGAINST WHAT CAME"))


if __name__ == "__main__":
    unittest.main()
