import glob
import json
import subprocess
import unittest

import fetch_and_analyze as F

FEED = [
    {"title": "Unemployment Claims", "country": "USD", "date": "2026-09-24T08:30:00-04:00", "impact": "Medium", "forecast": "", "previous": ""},
    {"title": "CPI m/m", "country": "USD", "date": "2026-12-10T08:30:00-05:00", "impact": "High", "forecast": "", "previous": ""},
    {"title": "German Ifo", "country": "EUR", "date": "2026-09-24T04:00:00-04:00", "impact": "High"},
    {"title": "Goolsbee Speaks", "country": "USD", "date": "2026-09-21T06:30:00-04:00", "impact": "Low"},
    {"title": "Undated", "country": "USD", "date": "", "impact": "High"},
]

ROUTE = r"""
import('./functions/cal.js').then(async m => {
  const feed = JSON.parse(process.argv[1]);
  const out = { events: m.toEvents(feed) };
  globalThis.fetch = async () => new Response('not found', { status: 404 });
  out.down = await (await m.onRequestGet()).json();
  globalThis.fetch = async () => new Response(JSON.stringify(feed), { status: 200 });
  out.up = await (await m.onRequestGet()).json();
  process.stdout.write(JSON.stringify(out));
});
"""

RENDER = r"""
const fs = require('fs');
const src = fs.readFileSync('dashboard1.js', 'utf8').replace(/\r\n/g, '\n');
const a = src.indexOf('  const calMessage'), b = src.indexOf('  if (cal.length) renderCal(cal);', a);
const el = { style: {}, innerHTML: '' };
const $ = () => el;
const nyseSession = () => ({ etDate: '2026-09-22' });
eval(src.slice(a, b) + `
renderCal([
  { date: '2026-09-21', time: '08:30', event: 'Past High', impact: 'High' },
  { date: '2026-09-24', time: '08:30', event: 'Unemployment Claims', impact: 'Medium' },
  { date: '2026-09-23', time: '10:00', event: 'Small Thing', impact: 'Low' },
  { date: '2026-09-25', time: '08:30', event: 'Big Thing', impact: 'High' },
]);
const shown = el.innerHTML;
renderCal([{ date: '2026-09-23', time: '10:00', event: 'Small Thing', impact: 'Low' }]);
process.stdout.write(JSON.stringify({ shown, onlyLow: el.innerHTML }));`);
"""


class Feed(unittest.TestCase):
    def test_the_pipeline_keeps_us_events_in_eastern_time(self):
        ev = F.econ_events(FEED)
        self.assertEqual([(e["date"], e["time"], e["event"]) for e in ev],
                         [("2026-09-21", "06:30", "Goolsbee Speaks"), ("2026-09-24", "08:30", "Unemployment Claims"), ("2026-12-10", "08:30", "CPI m/m")])

    def test_the_route_matches_the_pipeline_and_says_when_the_feed_is_down(self):
        out = json.loads(subprocess.run(["node", "-e", ROUTE, json.dumps(FEED)], capture_output=True, text=True, encoding="utf-8", check=True).stdout)
        self.assertEqual([(e["date"], e["time"], e["event"]) for e in out["events"]],
                         [(e["date"], e["time"], e["event"]) for e in F.econ_events(FEED)])
        self.assertEqual((out["down"]["source"], out["down"]["events"], out["down"]["error"]), ("unavailable", [], "the feed answered HTTP 404"))
        self.assertEqual((out["up"]["source"], len(out["up"]["events"])), ("forexfactory", 3))


class Panel(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.out = json.loads(subprocess.run(["node", "-e", RENDER], capture_output=True, text=True, encoding="utf-8", check=True).stdout)

    def test_high_and_medium_upcoming_releases_are_shown_with_dates_in_words(self):
        shown = self.out["shown"]
        self.assertIn("Unemployment Claims", shown)
        self.assertIn("Big Thing", shown)
        self.assertNotIn("Small Thing", shown)
        self.assertNotIn("Past High", shown)
        self.assertIn("Thu, Sep 24", shown)
        self.assertLess(shown.index("Unemployment Claims"), shown.index("Big Thing"))

    def test_a_week_with_only_small_releases_says_so(self):
        self.assertIn("No high- or medium-impact US releases left this week.", self.out["onlyLow"])


class NoDeadSources(unittest.TestCase):
    def test_the_dead_host_the_guessing_fallback_and_the_dropped_library_are_gone(self):
        for path in glob.glob("*.py") + glob.glob("*.js") + glob.glob("functions/*.js") + ["requirements.txt"]:
            with open(path, encoding="utf-8", errors="replace") as f:
                s = f.read()
            for gone in ("cdn-nfs.faireconomy.media", "dynamic_fallback", "market_calendar_tool", "market-calendar-tool", "myfxbook", "apikey=demo"):
                self.assertNotIn(gone, s, f"{gone} in {path}")


if __name__ == "__main__":
    unittest.main()
