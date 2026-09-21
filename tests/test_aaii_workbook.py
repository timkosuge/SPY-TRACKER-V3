import unittest
from datetime import date

import fetch_sentiment as fs


class SurveyWeek(unittest.TestCase):
    def test_both_sources_land_on_the_same_wednesday(self):
        self.assertEqual(fs.survey_week_end(date(2026, 9, 17)), date(2026, 9, 16))
        self.assertEqual(fs.survey_week_end(date(2026, 9, 16)), date(2026, 9, 16))
        self.assertEqual(fs.survey_week_end(date(2026, 9, 18)), date(2026, 9, 16))


@unittest.skipUnless(False, "xlwt is not installed; the workbook fixture cannot be written")
class Workbook(unittest.TestCase):
    def book(self, rows):
        xlwt = __import__("xlwt")
        wb = xlwt.Workbook()
        sh = wb.add_sheet("s")
        style = xlwt.XFStyle()
        style.num_format_str = "M/D/YYYY"
        sh.write(0, 0, "American Association of Individual Investors")
        sh.write(3, 0, "Date")
        for i, (d, b, n, br) in enumerate(rows):
            sh.write(5 + i, 0, d, style)
            sh.write(5 + i, 1, b)
            sh.write(5 + i, 2, n)
            sh.write(5 + i, 3, br)
        import io
        buf = io.BytesIO()
        wb.save(buf)
        return buf.getvalue()

    def test_decimals_become_percentages_dated_to_the_survey_week(self):
        content = self.book([(date(2026, 9, 10), 0.380, 0.227, 0.393), (date(2026, 9, 17), 0.288, 0.179, 0.533)])
        weeks = fs.parse_aaii_workbook(content)
        self.assertEqual(len(weeks), 2)
        self.assertEqual(weeks[-1], {"date": "2026-09-16", "bullish": 28.8, "neutral": 17.9, "bearish": 53.3, "spread": -24.5, "source": "aaii_xls"})
        self.assertEqual(weeks[0]["date"], "2026-09-09")

    def test_rows_that_do_not_sum_to_one_hundred_are_dropped(self):
        content = self.book([(date(2026, 9, 17), 0.288, 0.375, 0.288)])
        self.assertEqual(fs.parse_aaii_workbook(content), [])

    def test_a_challenge_page_is_not_a_workbook(self):
        self.assertEqual(fs.parse_aaii_workbook(b"<html>Incapsula</html>"), [])


class LoudFailure(unittest.TestCase):
    def test_the_run_exits_non_zero_when_a_source_is_stale(self):
        with open("fetch_sentiment.py", encoding="utf-8") as f:
            src = f.read()
        self.assertIn("raise SystemExit(1)", src)
        self.assertIn("sentiment sources are stale", src)

    def test_the_commit_step_runs_even_when_the_job_fails(self):
        with open(".github/workflows/sentiment_update.yml", encoding="utf-8") as f:
            wf = f.read()
        self.assertIn("if: always()", wf)
        self.assertIn("xlrd", wf)


if __name__ == "__main__":
    unittest.main()
