import unittest
from datetime import datetime, timedelta

import fetch_release_dates as F

CALENDAR = """
<h4><a id="1">2023 FOMC Meetings</a></h4>
<div class="fomc-meeting__month"><strong>Jan/Feb</strong></div><div class="fomc-meeting__date">31-1</div>
<a href="/newsevents/pressreleases/monetary20230201a.htm">Statement</a>
<div class="fomc-meeting__month"><strong>Oct/Nov</strong></div><div class="fomc-meeting__date">31-1</div>
<h4><a id="2">2025 FOMC Meetings</a></h4>
<div class="fomc-meeting__month"><strong>August</strong></div><div class="fomc-meeting__date">22 (notation vote)</div>
<a href="/newsevents/pressreleases/monetary20250822a.htm">Statement</a>
<div class="fomc-meeting__month"><strong>September</strong></div><div class="fomc-meeting__date">16-17*</div>
<a href="/newsevents/pressreleases/monetary20250917a.htm">Statement</a>
"""

HISTORICAL = """
<h5 class="panel-heading">January 28-29 Meeting - 2020</h5><p><a href="/newsevents/pressreleases/monetary20200129a.htm">Statement</a></p>
<h5 class="panel-heading">March 2 (unscheduled) Meeting - 2020</h5><p><a href="/newsevents/pressreleases/monetary20200303a.htm">Statement</a></p>
<h5 class="panel-heading">March 15 (unscheduled) Meeting - 2020</h5><p><a href="/newsevents/pressreleases/monetary20200315a.htm">Statement</a>
<a href="/newsevents/pressreleases/monetary20200323a.htm">Statement</a></p>
<h5 class="panel-heading">March 17-18 (cancelled) Meeting - 2020</h5>
<h5 class="panel-heading">July 28-29 Meeting - 2020</h5><p><a href="/newsevents/pressreleases/monetary20200729a.htm">Statement</a>
<a href="/newsevents/pressreleases/monetary20200827a.htm">Statement on Longer-Run Goals</a></p>
"""

ICS = """BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;TZID=US-Eastern:20261014T083000
SUMMARY:Consumer Price Index
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=US-Eastern:20261002T083000
SUMMARY:Employment Situation
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=US-Eastern:20261106T100000
SUMMARY:Employment Situation of Veterans
END:VEVENT
END:VCALENDAR"""


class Fed(unittest.TestCase):
    def test_two_month_meetings_notation_votes_and_statement_days(self):
        self.assertEqual(F.fed_calendar_meetings(CALENDAR), [("2023-02-01", ""), ("2023-11-01", ""), ("2025-09-17", "")])

    def test_historical_page_uses_the_statement_day_and_skips_cancelled_meetings(self):
        self.assertEqual(F.fed_historical_meetings(HISTORICAL, 2020),
                         [("2020-01-29", ""), ("2020-03-03", "unscheduled"), ("2020-03-15", "unscheduled"), ("2020-07-29", "")])


class Bls(unittest.TestCase):
    def test_calendar_matches_the_exact_release_name(self):
        self.assertEqual(F.bls_ics_dates(ICS, "Employment Situation"), ["2026-10-02"])
        self.assertEqual(F.bls_ics_dates(ICS, "Consumer Price Index"), ["2026-10-14"])

    def test_archive_dates_come_from_the_release_file_names(self):
        html = '<a href="/news.release/archives/cpi_09112026.htm">x</a><a href="/news.release/archives/cpi_09112026.pdf">x</a><a href="/news.release/archives/cpi_11122020.pdf">x</a>'
        self.assertEqual(F.bls_archive_dates(html, "cpi"), ["2020-11-12", "2026-09-11"])


class Guard(unittest.TestCase):
    def rows(self, n_past, future=True):
        today = datetime.now(F.ET).date()
        past = [(today - timedelta(days=30 * i)).isoformat() for i in range(n_past, 0, -1)]
        return [(d, "") for d in past + ([(today + timedelta(days=20)).isoformat()] if future else [])]

    def test_a_full_fetch_is_used(self):
        years = datetime.now(F.ET).year - 2020 + 1
        self.assertIsNone(F.usable("cpi", self.rows(12 * years), []))

    def test_a_fetch_with_nothing_ahead_is_refused(self):
        self.assertIn("already past", F.usable("cpi", self.rows(80, future=False), []))

    def test_a_thin_fetch_is_refused(self):
        self.assertIn("fewer than", F.usable("cpi", self.rows(10), []))

    def test_a_fetch_much_shorter_than_the_file_is_refused(self):
        years = datetime.now(F.ET).year - 2020 + 1
        rows = self.rows(12 * years)
        self.assertIn("on file", F.usable("cpi", rows, rows * 2))



class RouteParser(unittest.TestCase):
    def test_the_fomc_route_reads_two_month_meetings_and_skips_notation_votes(self):
        import json
        import subprocess
        js = ("const src=require('fs').readFileSync('functions/fomc.js','utf8').replace(/export async function[\\s\\S]*/,'');"
              "const f=new Function(src+';return parseFedCalendar;')();"
              "console.log(JSON.stringify(f(process.argv[1]).map(m=>m.date)));")
        out = subprocess.run(["node", "-e", js, CALENDAR], capture_output=True, text=True, encoding="utf-8", check=True).stdout
        self.assertEqual(json.loads(out), ["2023-02-01", "2023-11-01", "2025-09-17"])



class TreasuryHoldings(unittest.TestCase):
    def test_the_current_table_is_read(self):
        import generate_tic_holdings as g
        text = ("Table 5: Major Foreign Holders of Treasury Securities\t\t\r\n\t\t\r\n"
                "Country\t2026-07\t2026-06\r\nJapan\t1103.9\t1116.7\r\nChina, Mainland\t618.0\t633.4\r\n"
                "United Kingdom\t998.3\t939.9\r\nGrand Total\t9248.1\t9298.5\r\n")
        got = g.parse(text)
        self.assertEqual(got["japan"], {"2026-07": 1103.9, "2026-06": 1116.7})
        self.assertEqual(got["total"]["2026-07"], 9248.1)

    def test_the_current_table_is_read_first(self):
        import generate_tic_holdings as g
        self.assertTrue(g.SOURCES[0].endswith("slt_table5.txt"))
        self.assertFalse(any(u.endswith("/mfh.txt") for u in g.SOURCES))


if __name__ == "__main__":
    unittest.main()
