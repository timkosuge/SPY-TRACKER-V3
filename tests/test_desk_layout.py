import json
import re
import subprocess
import unittest

import generate_clock as K
import generate_strategies as G


class DecisionRows(unittest.TestCase):
    def test_each_line_is_a_question_an_answer_and_one_reason(self):
        r = lambda k, n: G.rate(k, n)
        mk = lambda id, role, mode, e, hold=None: {"id": id, "name": id, "role": role, "mode": mode, "hold": hold, "n": 100, "either_side": {"0.75": e, "1.5": e}, "exits": {"close": {"n": 100, "long": r(50, 100), "short": r(50, 100)}, "3": {"n": 100, "long": r(50, 100), "short": r(50, 100)}}, "peak_min_median": 240, "contracts": {"scored": 0}}
        results = [mk("A0", "control", "A", r(35, 100)), mk("A4", "trade", "A", r(75, 100)), mk("A5", "avoid", "A", r(10, 100)), mk("B0", "control", "B", r(50, 100), 3), mk("B5", "avoid", "B", r(15, 100), 3)]
        today = {"prior_class": "narrow", "vix": 14.8, "vix_bucket": "under 15", "dd_bucket": "within 2%"}
        d = G.decide(results, [], today, ["B0", "B5"], ["A0", "A4", "A5"], 760.0, [{"id": "close", "label": "Close"}])
        rows = {x["q"]: x for x in d["rows"]}
        self.assertEqual(rows["Hold 3 sessions?"]["a"], "No")
        self.assertEqual(rows["Day trade?"]["a"], "Only if the 9:00 CT range is wide")
        self.assertEqual(rows["If the range is narrow?"]["a"], "Stay out")
        self.assertEqual(rows["Which direction?"]["a"], "No edge either way")
        self.assertEqual(rows["When does the move land?"]["a"], "Around 12:30 CT")
        for x in d["rows"]:
            self.assertIn(x["tone"], ("go", "stop", "info"))
            self.assertLessEqual(len(x["a"]), 40, x)
        self.assertIn("Normal: 35%", rows["Day trade?"]["why"])


class ClockHeadlines(unittest.TestCase):
    def test_every_verdict_gets_a_headline_that_matches_its_result(self):
        daily = {"2010-2026": {"cum_overnight": 207.0, "cum_session": 123.0, "median_abs_session": 0.39, "median_abs_overnight": 0.28,
                               "monday_continues_friday": G.rate(48, 100), "weekday_continues_prior": G.rate(50, 100),
                               "monday_gap_median_abs": 0.31, "other_gap_median_abs": 0.28,
                               "monday_gap_fades": G.rate(52, 100), "other_gap_fades": G.rate(49, 100), "overnight_share_of_variance": 42.0}}
        V = K.add_headlines(K.verdicts(daily, {"sessions": 0}, {"sessions": 0}), daily, {"sessions": 0}, {"sessions": 0})
        heads = {v["topic"]: v for v in V}
        self.assertEqual(heads["Overnight vs session"]["headline"], "The gain is made overnight. The movement happens in the session.")
        self.assertEqual(heads["Monday as continuation"]["headline"], "Monday does not continue Friday.")
        for v in V:
            self.assertTrue(v["headline"])

    def test_event_times_are_stated_in_central(self):
        self.assertEqual(K.ct_time("20:00"), "7:00 PM CT")
        self.assertEqual(K.ct_time("03:00"), "2:00 AM CT")
        self.assertEqual(K.ct_time("11:30"), "10:30 AM CT")
        self.assertEqual(K.ct_time("00:30"), "11:30 PM CT")


FOLD = r"""
const fs = require('fs');
global.window = {};
const src = fs.readFileSync('shared.js', 'utf8').replace(/\r\n/g, '\n');
const i = src.indexOf('function evidenceFold');
eval(src.slice(i).replace('function evidenceFold', 'global.evidenceFold = function'));
const closed = evidenceFold('x', 'LABEL', '<p>body</p>');
window._folds = { x: true };
const opened = evidenceFold('x', 'LABEL', '<p>body</p>');
process.stdout.write(JSON.stringify({ closed, opened }));
"""


class Fold(unittest.TestCase):
    def test_a_fold_stays_open_across_a_re_render(self):
        out = json.loads(subprocess.run(["node", "-e", FOLD], capture_output=True, text=True, encoding="utf-8", check=True).stdout)
        self.assertNotIn(" open", out["closed"].split(">")[0])
        self.assertIn(" open", out["opened"].split(">")[0])
        self.assertIn("<p>body</p>", out["opened"])


class Order(unittest.TestCase):
    def read(self, name):
        with open(name, encoding="utf-8") as f:
            return f.read().replace("\r\n", "\n")

    def test_the_range_filter_shows_the_call_and_the_live_steps_before_the_fold(self):
        s = self.read("range_filter_panel.js")
        page = s[s.index("el.innerHTML = `"):]
        self.assertLess(page.index("renderDecisionCard"), page.index("STEP 1"))
        self.assertLess(page.index("STEP 2"), page.index("evidenceFold('rfEvidence'"))
        self.assertLess(page.index("evidenceFold('rfEvidence'"), page.index("REGIME AT THE CLOSE"))
        self.assertLess(page.index("evidenceFold('rfEvidence'"), page.index("MODE A"))

    def test_the_strategy_lab_shows_the_call_and_the_setups_before_the_fold(self):
        s = self.read("strategy_lab_panel.js")
        page = s[s.index("    el.innerHTML = `"):]
        self.assertLess(page.index("decisionCard(false)"), page.index("${edgeHtml}"))
        self.assertLess(page.index("${edgeHtml}"), page.index("evidenceFold('labEvidence'"))
        self.assertLess(page.index("evidenceFold('labEvidence'"), page.index("SCORECARD"))

    def test_the_clock_shows_what_held_then_what_did_not_before_the_fold(self):
        s = self.read("clock_panel.js")
        page = s[s.index("el.innerHTML = `"):]
        self.assertLess(page.index("WHAT HOLDS UP"), page.index("TESTED AND NOT SUPPORTED"))
        self.assertLess(page.index("TESTED AND NOT SUPPORTED"), page.index("evidenceFold('clockEvidence'"))
        self.assertLess(page.index("evidenceFold('clockEvidence'"), page.index("30-MINUTE SLOTS"))

    def test_the_clock_reads_a_payload_written_before_headlines_existed(self):
        s = self.read("clock_panel.js")
        self.assertNotIn("${v.headline}", s)
        self.assertIn("${v.headline || v.text}", s)
        self.assertIn("${v.why || ''}", s)

    def test_setups_are_named_in_words_not_codes(self):
        s = self.read("strategy_lab_panel.js")
        edge = s[s.index("const unstable = id"):s.index("    el.innerHTML = `")]
        self.assertNotIn("${s.id}</", edge)
        self.assertIn("CN[n] || n", edge)


if __name__ == "__main__":
    unittest.main()
