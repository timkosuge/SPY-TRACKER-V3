import json
import os
import re
import sqlite3
import subprocess
import sys
import unittest
from datetime import date, timedelta

sys.path.insert(0, ".")
from trading_days import add_trading_days, is_trading_day, nyse_holidays, trading_days_between


class Calendar(unittest.TestCase):
    def test_known_closures_and_open_days(self):
        self.assertFalse(is_trading_day(date(2027, 9, 6)))
        self.assertFalse(is_trading_day(date(2027, 3, 26)))
        self.assertFalse(is_trading_day(date(2027, 6, 18)))
        self.assertFalse(is_trading_day(date(2025, 1, 9)))
        self.assertTrue(is_trading_day(date(2021, 12, 31)))
        self.assertTrue(is_trading_day(date(2026, 9, 18)))

    def test_adding_trading_days_skips_closures(self):
        self.assertEqual(add_trading_days(date(2026, 9, 3), 1), date(2026, 9, 4))
        self.assertEqual(add_trading_days(date(2026, 9, 4), 1), date(2026, 9, 8))
        self.assertEqual(trading_days_between(date(2026, 9, 4), date(2026, 9, 8)), 1)

    def test_page_calendar_matches(self):
        with open("intraday_data.js", encoding="utf-8") as f:
            src = f.read()
        i = src.index("function nyseHolidays(y){")
        j = src.index("window.isTradingDay = isTradingDay", i)
        js = "const window={};\n" + src[i:j] + "\nprocess.stdout.write(JSON.stringify([2024,2025,2026,2027,2028].map(y=>[...nyseHolidays(y)].sort())));"
        out = json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True, encoding="utf-8", check=True).stdout)
        for y, days in zip((2024, 2025, 2026, 2027, 2028), out):
            self.assertEqual(days, sorted(d.isoformat() for d in nyse_holidays(y)), y)


def has_database():
    try:
        with open("spy_data.db", "rb") as f:
            return f.read(16) == b"SQLite format 3\x00"
    except OSError:
        return False


@unittest.skipUnless(has_database(), "spy_data.db is not present locally")
class AgainstSessions(unittest.TestCase):
    def test_calendar_reproduces_every_session_since_2000(self):
        conn = sqlite3.connect("spy_data.db")
        dates = [r[0] for r in conn.execute("SELECT date FROM daily_ohlcv WHERE date>='2000-01-01' ORDER BY date")]
        conn.close()
        stored = set(dates)
        self.assertEqual([d for d in dates if not is_trading_day(date.fromisoformat(d))], [])
        d = date(2000, 1, 3)
        end = date.fromisoformat(dates[-1])
        missing = []
        while d <= end:
            if is_trading_day(d) and d.isoformat() not in stored:
                missing.append(d.isoformat())
            d += timedelta(days=1)
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
