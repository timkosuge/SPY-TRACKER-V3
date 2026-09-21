import json
import subprocess
import unittest


def run(expr):
    with open("journal_trades.js", encoding="utf-8") as f:
        src = f.read()
    i = src.index("const PNL_RULE = ")
    j = src.index("function tjLoad() {", i)
    js = src[i:j] + "\nprocess.stdout.write(JSON.stringify(" + expr + "));"
    return json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True, encoding="utf-8", check=True).stdout)


class JournalPnl(unittest.TestCase):
    def test_long_round_trip_closed_by_a_sell_is_a_gain(self):
        self.assertEqual(run("tjPnl(1.20, 2.00, 2, 'Sell to Close', 0)"), 160)
        self.assertEqual(run("tjOutcome(tjPnl(1.20, 2.00, 2, 'Sell to Close', 0))"), "WIN")

    def test_short_round_trip_closed_by_a_buy_gains_when_price_falls(self):
        self.assertEqual(run("tjPnl(2.00, 1.20, 1, 'Buy to Close', 0)"), 80)
        self.assertEqual(run("tjPnl(2.00, 1.20, 1, 'Sell to Open', 0)"), 80)
        self.assertEqual(run("tjPnl(1.20, 2.00, 1, 'Buy to Open', 0)"), 80)

    def test_fees_reduce_the_result(self):
        self.assertEqual(run("tjPnl(1.20, 2.00, 2, 'Sell to Close', 2.60)"), 157.4)

    def test_money_carries_its_sign(self):
        self.assertEqual(run("[tjFmtMoney(342), tjFmtMoney(-342), tjFmtMoney(0), tjFmtMoney(null)]"), ["+$342", "-$342", "+$0", "—"])
        self.assertEqual(run("[tjFmtK(-1500), tjFmtK(2500000), tjFmtK(null)]"), ["-1.5K", "2.50M", "—"])

    def test_no_utc_date_slicing_remains(self):
        with open("journal_trades.js", encoding="utf-8") as f:
            src = f.read()
        self.assertNotIn("includes('Sell to Close')", src.split("function tjIsShort")[1].split("\n")[0])
        self.assertEqual(src.count("toISOString().slice(0,10)"), 1)
        self.assertNotIn("toTimeString()", src)


if __name__ == "__main__":
    unittest.main()
