import re
import unittest

import fetch_sentiment as fs

PAGE = """
<div class="ssv2-gauge-week">Week ending September 16, 2026</div>
<div class="ssv2-sbar"><div class="ssv2-slabel bull">Bullish</div><div class="ssv2-snum bull">28.8%</div><div class="ssv2-savg">Avg 37.5%</div></div>
<div class="ssv2-sbar"><div class="ssv2-slabel neut">Neutral</div><div class="ssv2-snum neut">17.9%</div><div class="ssv2-savg">Avg 31.0%</div></div>
<div class="ssv2-sbar"><div class="ssv2-slabel bear">Bearish</div><div class="ssv2-snum bear">53.3%</div><div class="ssv2-savg">Avg 31.5%</div></div>
"""

PUBLISHED = {"2026-09-16": (28.8, 17.9, 53.3), "2026-09-09": (38.0, 22.7, 39.3), "2026-09-02": (39.7, 22.7, 37.6),
             "2026-08-26": (32.9, 22.6, 44.4), "2026-07-15": (44.9, 22.2, 32.9), "2026-04-22": (46.0, 19.5, 34.4)}


def parse(text):
    found = {}
    for key, cls in (("bullish", "bull"), ("neutral", "neut"), ("bearish", "bear")):
        m = re.search(r'ssv2-snum\s+' + cls + r'"[^>]*>\s*([\d.]+)\s*%', text)
        if m:
            found[key] = float(m.group(1))
    return found if len(found) == 3 else None


class Parse(unittest.TestCase):
    def test_each_figure_comes_from_its_own_marker(self):
        f = parse(PAGE)
        self.assertEqual((f["bullish"], f["neutral"], f["bearish"]), (28.8, 17.9, 53.3))
        self.assertEqual(round(f["bullish"] - f["bearish"], 1), -24.5)

    def test_the_week_ending_date_is_read_from_the_page(self):
        m = re.search(r"Week ending[^<]{0,30}([A-Z][a-z]+ \d{1,2},? \d{4})", PAGE)
        self.assertEqual(m.group(1), "September 16, 2026")

    def test_a_missing_marker_returns_nothing_rather_than_a_guess(self):
        self.assertIsNone(parse(PAGE.replace('ssv2-snum bear', 'ssv2-snum x')))


class Gate(unittest.TestCase):
    def gate(self, bull, neu, bear):
        vals = [bull, neu, bear]
        total = sum(v for v in vals if v is not None) if all(v is not None for v in vals) else None
        return total is not None and 99 <= total <= 101 and not any(v < 0 or v > 100 for v in vals)

    def test_every_published_week_passes(self):
        for d, (b, n, br) in PUBLISHED.items():
            self.assertTrue(self.gate(b, n, br), d)

    def test_the_readings_the_old_scrape_produced_are_refused(self):
        self.assertFalse(self.gate(28.8, 37.5, 28.8))
        self.assertFalse(self.gate(75.0, 17.9, 70.3))


class SurveyWeek(unittest.TestCase):
    def test_the_fallback_date_is_a_wednesday(self):
        from datetime import date
        d = date.fromisoformat(fs.last_survey_wednesday_et())
        self.assertEqual(d.weekday(), 2)


if __name__ == "__main__":
    unittest.main()
