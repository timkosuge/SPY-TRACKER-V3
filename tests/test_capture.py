import os
import sqlite3
import sys
import unittest
from datetime import date

sys.path.insert(0, ".")
import fetch_and_analyze as fa


class OptionChainCapture(unittest.TestCase):
    def test_chain_is_stored_as_returned(self):
        conn = sqlite3.connect(":memory:")
        conn.execute("""CREATE TABLE option_chain (
            captured_at TEXT, session_date TEXT, spot REAL, expiry TEXT, cp TEXT, strike REAL,
            bid REAL, ask REAL, iv REAL, open_interest INTEGER, volume INTEGER, gamma REAL,
            PRIMARY KEY (captured_at, expiry, cp, strike))""")
        chain = [{"exp": date(2026, 9, 25), "cp": "C", "strike": 760.0, "bid": 1.2, "ask": 1.3, "iv": 0.18, "oi": 100, "vol": 5, "gamma": 0.01},
                 {"exp": date(2026, 9, 25), "cp": "P", "strike": 760.0, "bid": 2.0, "ask": 2.1, "iv": 0.19, "oi": 200, "vol": 7, "gamma": 0.02}]
        n = fa.store_option_chain(conn, {"chain": chain, "spot": 761.5}, "2026-09-21")
        self.assertEqual(n, 2)
        rows = conn.execute("SELECT session_date, spot, expiry, cp, strike, bid, ask, iv, open_interest, volume, gamma FROM option_chain ORDER BY cp").fetchall()
        self.assertEqual(rows[0], ("2026-09-21", 761.5, "2026-09-25", "C", 760.0, 1.2, 1.3, 0.18, 100, 5, 0.01))
        self.assertEqual(rows[1][3], "P")
        self.assertRegex(conn.execute("SELECT captured_at FROM option_chain").fetchone()[0], r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-0[45]:00$")

    def test_empty_chain_stores_nothing(self):
        conn = sqlite3.connect(":memory:")
        self.assertEqual(fa.store_option_chain(conn, {}, "2026-09-21"), 0)


if __name__ == "__main__":
    unittest.main()
