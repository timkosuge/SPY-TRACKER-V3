import json
import subprocess
import sys
import unittest

sys.path.insert(0, ".")
from trading_days import nyse_holidays


def run_js(expr):
    with open("market_clock.js", encoding="utf-8") as f:
        src = f.read()
    js = "const window={};\n" + src + "\nprocess.stdout.write(JSON.stringify(" + expr + "));"
    return json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True, encoding="utf-8", check=True).stdout)


class MarketClock(unittest.TestCase):
    def test_early_closes_match_the_sessions_in_the_data(self):
        self.assertEqual(sorted(run_js("Object.keys(window.nyseEarlyCloses(2024))")), ["2024-07-03", "2024-11-29", "2024-12-24"])
        self.assertEqual(sorted(run_js("Object.keys(window.nyseEarlyCloses(2025))")), ["2025-07-03", "2025-11-28", "2025-12-24"])
        self.assertEqual(sorted(run_js("Object.keys(window.nyseEarlyCloses(2026))")), ["2026-11-27", "2026-12-24"])

    def test_session_state_on_holidays_and_early_closes(self):
        s = run_js("[window.nyseSession(new Date('2026-11-26T18:30:00Z')).state, window.nyseSession(new Date('2026-11-27T17:30:00Z')).state, window.nyseSession(new Date('2026-11-27T18:30:00Z')).state, window.nyseSession(new Date('2026-12-25T15:00:00Z')).state, window.nyseSession(new Date('2026-09-21T14:00:00Z')).state, window.nyseSession(new Date('2026-09-19T20:00:00Z')).state]")
        self.assertEqual(s, ["holiday", "open", "after", "holiday", "open", "weekend"])

    def test_weekday_is_taken_in_new_york(self):
        self.assertEqual(run_js("window.nyseSession(new Date('2026-09-22T01:00:00Z')).weekday"), "Mon")

    def test_page_holidays_match_python(self):
        for y in (2025, 2026, 2027):
            self.assertEqual(sorted(run_js(f"[...window.nyseHolidays({y})]")), sorted(d.isoformat() for d in nyse_holidays(y)))

    def test_clocks_convert_once(self):
        self.assertEqual(run_js("[window.zoneClock(new Date('2026-09-19T20:00:00Z'),'Europe/London'), window.zoneClock(new Date('2026-09-19T20:00:00Z'),'Asia/Tokyo'), window.zoneClock(new Date('2026-09-19T20:00:00Z'),'America/New_York')]"), ["21:00", "05:00", "16:00"])


if __name__ == "__main__":
    unittest.main()
