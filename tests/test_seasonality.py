import sys
import unittest
from datetime import date, timedelta

sys.path.insert(0, ".")
import generate_edge_stats as ge


def day(d, o, c):
    return dict(date=d.isoformat(), dt=d, open=o, high=max(o, c) + 1, low=min(o, c) - 1, close=c, volume=1,
                ret=None, oc=(c - o) / o * 100, rng=2.0, rng_pct=2.0 / o * 100)


class Streaks(unittest.TestCase):
    def test_an_unchanged_period_is_neither_green_nor_red(self):
        out = ge.streak_stats([1.0, 0.0, -1.0, -1.0, 0.0, 1.0, 1.0, 1.0])
        self.assertEqual(out["max_red"], 2)
        self.assertEqual(out["max_green"], 3)


class Seasonality(unittest.TestCase):
    def test_one_day_month_is_not_a_month(self):
        monthly = [dict(dt=date(1993, 1, 29), ret=0.5, tr=1.0, days=1), dict(dt=date(1994, 1, 31), ret=2.0, tr=1.0, days=20)]
        jan = ge.seasonality(monthly, [])[0]
        self.assertEqual(jan["count"], 1)
        self.assertEqual(jan["avg_return"], 2.0)

    def test_a_week_belongs_to_the_month_of_its_monday(self):
        weekly = [dict(dt=date(2026, 10, 2), ret=1.0), dict(dt=date(2026, 10, 9), ret=3.0)]
        wom = {w["week"]: w for w in ge.week_of_month(weekly)}
        self.assertEqual(wom["Week 4"]["count"], 1)
        self.assertEqual(wom["Week 1"]["count"], 1)
        self.assertEqual(wom["Week 1"]["avg_return"], 3.0)


class Baseline(unittest.TestCase):
    def test_every_window_carries_the_baseline_its_edges_are_measured_against(self):
        daily = [day(date(2025, 1, 2) + timedelta(days=i), 100, 100 + (i % 3) - 1) for i in range(30)]
        for i in range(1, len(daily)):
            daily[i]["ret"] = (daily[i]["close"] - daily[i - 1]["close"]) / daily[i - 1]["close"] * 100
        weekly = [dict(date=(date(2025, 1, 3) + timedelta(days=7 * k)).isoformat(), dt=date(2025, 1, 3) + timedelta(days=7 * k), open=100, high=102, low=98, close=101, ret=1.0 * (k % 2), tr=4.0, tr_pct=4.0, days=5) for k in range(6)]
        monthly = [dict(dt=date(2025, 1, 31), ret=1.5, tr=5.0, days=21)]
        yearly = [dict(dt=date(2024, 12, 31), ret=10.0, tr=50.0, days=252)]
        w = ge.build_window(daily, weekly, monthly, yearly, "t")
        self.assertIn("baseline", w)
        self.assertAlmostEqual(w["baseline"]["weekly"], 0.5, places=3)
        self.assertEqual(w["baseline"]["monthly"], 1.5)


class Political(unittest.TestCase):
    def test_same_years_and_basis_as_the_yearly_panel(self):
        yearly = [dict(dt=date(y, 12, 31), ret=float(y % 7), tr=10.0, days=252) for y in range(2016, 2027)]
        daily = [day(date(2026, 9, 18), 100, 101)]
        p = ge.political(yearly, daily)
        self.assertEqual(p["count"], 10)
        self.assertEqual([y["year"] for y in p["election"]["years"]], [2016, 2020, 2024])
        self.assertEqual(p["election"]["years"][0]["ret"], float(2016 % 7))
        self.assertNotIn(2026, [y["year"] for y in p["midterm"]["years"]])


if __name__ == "__main__":
    unittest.main()
