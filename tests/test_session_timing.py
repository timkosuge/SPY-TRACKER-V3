import json
import os
import re
import sqlite3
import subprocess
import tempfile
import unittest
from datetime import datetime

import pytz

import generate_range_filter as R
import generate_strategies as G

ET = pytz.timezone("America/New_York")


def clock(now_hhmm, dow, event="schedule", schedule="30 13-21 * * 1-5"):
    with open(".github/workflows/spy_tracker.yml", encoding="utf-8") as f:
        s = f.read()
    body = s[s.index("- name: Session clock"):]
    body = body[body.index("run: |") + 6:body.index("- name:", 10)]
    script = "\n".join(l[10:] if l.startswith("          ") else l for l in body.split("\n"))
    script = script.replace("${{ github.event_name == 'workflow_dispatch' }}", "true" if event == "workflow_dispatch" else "false")
    script = script.replace("${{ github.event.schedule }}", schedule)
    fd, path = tempfile.mkstemp(dir=".", prefix="clock_", suffix=".out")
    os.close(fd)
    try:
        name = os.path.basename(path)
        fake = f'date() {{ case "$*" in *%H%M*) echo {now_hhmm};; *%u*) echo {dow};; *%M*) echo {now_hhmm[2:]};; esac; }}\nGITHUB_OUTPUT={name}\n'
        subprocess.run(["bash", "-c", fake + script], capture_output=True, text=True, check=True)
        with open(path, encoding="utf-8") as f:
            out = f.read()
    finally:
        os.remove(path)
    return dict(re.findall(r"^(run|close)=(\w+)\r?$", out, re.M))


class Clock(unittest.TestCase):
    def test_a_post_close_run_that_starts_late_still_does_the_close_work(self):
        self.assertEqual(clock("1845", 1), {"run": "true", "close": "true"})
        self.assertEqual(clock("1805", 1), {"run": "true", "close": "true"})

    def test_close_work_never_runs_in_a_run_that_is_not_allowed(self):
        self.assertEqual(clock("1845", 6), {"run": "false", "close": "false"})
        self.assertEqual(clock("0800", 2), {"run": "false", "close": "false"})

    def test_intraday_runs_do_not_do_close_work(self):
        self.assertEqual(clock("1459", 1), {"run": "true", "close": "false"})

    def test_only_the_ten_oclock_schedule_is_trimmed_to_ten(self):
        self.assertEqual(clock("1000", 1, schedule="0 14,15 * * 1-5"), {"run": "true", "close": "false"})
        self.assertEqual(clock("1100", 1, schedule="0 14,15 * * 1-5"), {"run": "false", "close": "false"})
        self.assertEqual(clock("1107", 1), {"run": "true", "close": "false"})

    def test_a_manual_run_always_does_everything(self):
        self.assertEqual(clock("0300", 7, event="workflow_dispatch", schedule=""), {"run": "true", "close": "true"})


class FinishedSessions(unittest.TestCase):
    def db(self):
        conn = sqlite3.connect(":memory:")
        self.addCleanup(conn.close)
        conn.execute("CREATE TABLE daily_ohlcv (date TEXT PRIMARY KEY, open REAL, high REAL, low REAL, close REAL)")
        conn.executemany("INSERT INTO daily_ohlcv VALUES (?,?,?,?,?)", [
            ("2026-09-18", 764.0, 765.0, 761.0, 761.69), ("2026-09-21", 766.25, 774.62, 766.03, 773.1)])
        return conn

    def test_an_unfinished_session_is_left_out_until_the_close(self):
        mid = ET.localize(datetime(2026, 9, 21, 14, 59))
        after = ET.localize(datetime(2026, 9, 21, 16, 0))
        self.assertEqual([r[0] for r in R.daily_rows(self.db(), mid)], ["2026-09-18"])
        self.assertEqual([r[0] for r in R.daily_rows(self.db(), after)], ["2026-09-18", "2026-09-21"])

    def test_both_call_generators_read_through_it(self):
        with open("generate_strategies.py", encoding="utf-8") as f:
            self.assertIn("rows = daily_rows(conn)", f.read())


class NarrowSide(unittest.TestCase):
    def test_the_any_narrow_strategy_mirrors_any_wide(self):
        with open("strategies.json", encoding="utf-8") as f:
            S = {s["id"]: s for s in json.load(f)["strategies"]}
        self.assertEqual((S["A6"]["entry"], S["A6"]["role"], S["A6"]["mode"]), (["or_narrow"], "avoid", "A"))
        self.assertEqual(S["A4"]["entry"], ["or_wide"])

    def test_the_card_shows_the_narrow_side_when_only_the_mirror_is_armed(self):
        r = lambda k, n: G.rate(k, n)
        mk = lambda id, role, mode, e, hold=None: {"id": id, "name": id, "role": role, "mode": mode, "hold": hold, "n": 100, "either_side": {"0.75": e, "1.5": e}, "exits": {"close": {"n": 100, "long": r(50, 100), "short": r(50, 100)}, "3": {"n": 100, "long": r(50, 100), "short": r(50, 100)}}, "peak_min_median": 240, "contracts": {"scored": 0}}
        results = [mk("A0", "control", "A", r(36, 100)), mk("A4", "trade", "A", r(70, 100)), mk("A6", "avoid", "A", r(25, 166)),
                   mk("B0", "control", "B", r(50, 100), 3)]
        today = {"prior_class": "middle", "vix": 15.01, "vix_bucket": "15 to 20", "dd_bucket": "within 2%"}
        d = G.decide(results, [], today, ["B0"], ["A0", "A4", "A6"], 773.0, [{"id": "close", "label": "Close"}])
        rows = {x["q"]: x for x in d["rows"]}
        self.assertEqual(rows["Day trade?"]["a"], "Only if the 9:00 CT range is wide")
        self.assertEqual(rows["If the range is narrow?"]["a"], "Stay out")
        self.assertIn("15% of 166", rows["If the range is narrow?"]["why"])

if __name__ == "__main__":
    unittest.main()
