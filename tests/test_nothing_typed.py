import glob
import re
import unittest

DATE = re.compile(r"""['"](20\d\d-[01]\d-[0-3]\d)['"]""")
ONE_OFF = ("repair_", "migrate_", "seed_")


def production_files():
    for f in sorted(glob.glob("*.py") + glob.glob("*.js") + glob.glob("functions/*.js")) + ["index.html"]:
        if f.startswith(ONE_OFF) or f.startswith("tests"):
            continue
        with open(f, encoding="utf-8", errors="ignore") as fh:
            head = fh.read(300)
        if re.match(r"\s*const [A-Z_0-9]+ *= *[\[{]", head):
            continue
        yield f


class NothingTyped(unittest.TestCase):
    def test_no_recent_or_future_date_is_typed_into_production_code(self):
        found = []
        for f in production_files():
            with open(f, encoding="utf-8", errors="ignore") as fh:
                for i, line in enumerate(fh, 1):
                    if "SPECIAL" in line:
                        continue
                    for d in DATE.findall(line):
                        if d >= "2025-01-01":
                            found.append(f"{f}:{i} {d}")
        self.assertEqual(found, [])

    def test_no_typed_fallback_reading_is_served_as_data(self):
        with open("functions/sentiment.js", encoding="utf-8") as f:
            s = f.read()
        self.assertNotIn("static_fallback", s)
        self.assertNotIn("37.5", s)


if __name__ == "__main__":
    unittest.main()
