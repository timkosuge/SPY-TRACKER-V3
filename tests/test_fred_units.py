import json
import subprocess
import unittest


def fred_value(cases):
    """Run the page's fredValue formatter under node for a list of (value, units) pairs."""
    with open("dashboard2.js", encoding="utf-8") as f:
        src = f.read()
    i = src.index("function fredValue(")
    j = src.index("\nwindow.fredValue = fredValue;", i)
    js = src[i:j] + "\nconst out = " + json.dumps(cases) + ".map(([v,u]) => fredValue(v,u));\nprocess.stdout.write(JSON.stringify(out));"
    return json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True, encoding="utf-8", check=True).stdout)


class FredUnits(unittest.TestCase):
    def test_values_render_in_their_own_units(self):
        out = fred_value([
            [6746548, "Millions of Dollars"],
            [0.576, "Billions of Dollars"],
            [159075, "Thousands of Persons"],
            [196000, "Number"],
            [7271, "Level in Thousands"],
            [4.33, "Percent"],
            [130.658, "Index 2017=100"],
            [36.44, "Dollars per Hour"],
        ])
        self.assertEqual(out, ["$6.75T", "$576.0M", "159.07M", "196K", "7.27M", "4.33%", "130.7", "$36.44"])

    def test_missing_value_is_a_dash(self):
        self.assertEqual(fred_value([[None, "Percent"]]), ["—"])


class SentimentValidation(unittest.TestCase):
    def test_a_garbled_reading_is_rejected_and_nothing_is_hand_entered(self):
        with open("fetch_sentiment.py", encoding="utf-8") as f:
            src = f.read()
        self.assertIn("99 <= total <= 101", src)
        self.assertIn("ssv2-snum", src)
        self.assertNotIn("MANUAL_AAII", src)


if __name__ == "__main__":
    unittest.main()
