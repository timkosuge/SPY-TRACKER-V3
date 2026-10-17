import os
import sqlite3
import sys
import unittest
from datetime import date, timedelta

sys.path.insert(0, ".")
import fetch_and_analyze as fa


class OptionChainCapture(unittest.TestCase):
    def test_chain_is_stored_as_returned(self):
        conn = sqlite3.connect(":memory:")
        self.addCleanup(conn.close)
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
        self.addCleanup(conn.close)
        self.assertEqual(fa.store_option_chain(conn, {}, "2026-09-21"), 0)


class ChainBand(unittest.TestCase):
    def _conn(self):
        conn = sqlite3.connect(":memory:")
        self.addCleanup(conn.close)
        conn.execute("""CREATE TABLE option_chain (
            captured_at TEXT, session_date TEXT, spot REAL, expiry TEXT, cp TEXT, strike REAL,
            bid REAL, ask REAL, iv REAL, open_interest INTEGER, volume INTEGER, gamma REAL,
            PRIMARY KEY (captured_at, expiry, cp, strike))""")
        return conn

    @staticmethod
    def _contract(strike, exp):
        return {"exp": exp, "cp": "C", "strike": strike, "bid": 1.0, "ask": 1.1,
                "iv": 0.18, "oi": 1, "vol": 1, "gamma": 0.01}

    def test_strikes_far_from_spot_are_not_stored(self):
        conn = self._conn()
        chain = [self._contract(760.0, date(2026, 9, 25)),
                 self._contract(1480.0, date(2026, 9, 25)),
                 self._contract(50.0, date(2026, 9, 25))]
        self.assertEqual(fa.store_option_chain(conn, {"chain": chain, "spot": 761.5}, "2026-09-21"), 1)
        self.assertEqual([r[0] for r in conn.execute("SELECT strike FROM option_chain")], [760.0])

    def test_expiries_past_the_horizon_are_not_stored(self):
        conn = self._conn()
        chain = [self._contract(760.0, date(2026, 9, 25)),
                 self._contract(761.0, date(2029, 1, 19))]
        self.assertEqual(fa.store_option_chain(conn, {"chain": chain, "spot": 761.5}, "2026-09-21"), 1)
        self.assertEqual([r[0] for r in conn.execute("SELECT expiry FROM option_chain")], ["2026-09-25"])

    def test_band_edges_are_kept(self):
        conn = self._conn()
        edge_strike = 761.5 * (1 + fa.CHAIN_STRIKE_PCT / 100)
        edge_expiry = date(2026, 9, 21) + timedelta(days=fa.CHAIN_MAX_DTE)
        chain = [self._contract(edge_strike, edge_expiry)]
        self.assertEqual(fa.store_option_chain(conn, {"chain": chain, "spot": 761.5}, "2026-09-21"), 1)

    def test_a_chain_with_no_spot_stores_nothing(self):
        conn = self._conn()
        chain = [self._contract(760.0, date(2026, 9, 25))]
        self.assertEqual(fa.store_option_chain(conn, {"chain": chain, "spot": 0}, "2026-09-21"), 0)


class ChainPrune(unittest.TestCase):
    def _seed(self, sessions):
        conn = sqlite3.connect(":memory:")
        self.addCleanup(conn.close)
        conn.execute("""CREATE TABLE option_chain (
            captured_at TEXT, session_date TEXT, spot REAL, expiry TEXT, cp TEXT, strike REAL,
            bid REAL, ask REAL, iv REAL, open_interest INTEGER, volume INTEGER, gamma REAL,
            PRIMARY KEY (captured_at, expiry, cp, strike))""")
        for i in range(sessions):
            d = (date(2026, 1, 5) + timedelta(days=i)).isoformat()
            conn.execute("INSERT INTO option_chain VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                         (f"{d}T09:45:00-05:00", d, 700.0, d, "C", 700.0, 1.0, 1.1, 0.18, 1, 1, 0.01))
        conn.commit()
        return conn

    def test_sessions_past_the_window_are_dropped(self):
        conn = self._seed(25)
        fa.prune_option_chain(conn, keep_sessions=20)
        self.assertEqual(conn.execute("SELECT COUNT(DISTINCT session_date) FROM option_chain").fetchone()[0], 20)

    def test_nothing_is_dropped_below_the_window(self):
        conn = self._seed(5)
        self.assertEqual(fa.prune_option_chain(conn, keep_sessions=20), 0)
        self.assertEqual(conn.execute("SELECT COUNT(DISTINCT session_date) FROM option_chain").fetchone()[0], 5)

    def test_the_newest_sessions_are_the_ones_kept(self):
        conn = self._seed(25)
        fa.prune_option_chain(conn, keep_sessions=20)
        oldest = conn.execute("SELECT MIN(session_date) FROM option_chain").fetchone()[0]
        self.assertEqual(oldest, (date(2026, 1, 5) + timedelta(days=5)).isoformat())


if __name__ == "__main__":
    unittest.main()
