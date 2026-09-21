import math
import sqlite3
import unittest

import fetch_and_analyze as fa


class RowValidity(unittest.TestCase):
    def test_finite_row_is_valid(self):
        self.assertTrue(fa.ohlc_row_is_valid(761.31, 762.0, 757.97, 761.69))

    def test_nan_close_is_rejected(self):
        self.assertFalse(fa.ohlc_row_is_valid(761.31, 762.0, 757.97, float("nan")))

    def test_zero_open_is_rejected(self):
        self.assertFalse(fa.ohlc_row_is_valid(0.0, 762.0, 757.97, 761.69))

    def test_inf_is_rejected(self):
        self.assertFalse(fa.ohlc_row_is_valid(761.31, math.inf, 757.97, 761.69))


class MeasurementGate(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.addCleanup(self.conn.close)
        fa.init_db(self.conn)
        rows = [
            ("2026-09-15", 750.0, 755.0, 748.0, 754.0, 1000),
            ("2026-09-16", 754.0, 756.0, 748.0, 748.55, 1000),
            ("2026-09-17", 748.0, 752.0, 747.0, 751.0, 1000),
        ]
        self.conn.executemany("INSERT INTO daily_ohlcv (date,open,high,low,close,volume) VALUES (?,?,?,?,?,?)", rows)
        for d, *_ in rows:
            fa.compute_measurements(self.conn, d)

    def test_consistent_rows_are_not_recomputed(self):
        self.assertEqual(fa.measurement_dates_needing_recompute(self.conn), [])

    def test_stale_open_to_close_is_recomputed(self):
        self.conn.execute("UPDATE daily_measurements SET open_to_close = 0.29 WHERE date = '2026-09-16'")
        self.assertEqual(fa.measurement_dates_needing_recompute(self.conn), ["2026-09-16"])

    def test_stale_day_range_is_recomputed(self):
        self.conn.execute("UPDATE daily_measurements SET day_range = 1.0 WHERE date = '2026-09-17'")
        self.assertEqual(fa.measurement_dates_needing_recompute(self.conn), ["2026-09-17"])

    def test_null_day_over_day_with_prior_day_is_recomputed(self):
        self.conn.execute("UPDATE daily_measurements SET close_to_prev_close = NULL WHERE date = '2026-09-17'")
        self.assertEqual(fa.measurement_dates_needing_recompute(self.conn), ["2026-09-17"])

    def test_first_row_null_day_over_day_is_left_alone(self):
        self.conn.execute("UPDATE daily_measurements SET close_to_prev_close = NULL WHERE date = '2026-09-15'")
        self.assertEqual(fa.measurement_dates_needing_recompute(self.conn), [])

    def test_null_close_row_is_skipped(self):
        self.conn.execute("INSERT INTO daily_ohlcv (date,open,high,low,close,volume) VALUES ('2026-09-18', 761.31, 762.0, 757.97, NULL, 1000)")
        self.assertEqual(fa.measurement_dates_needing_recompute(self.conn), [])


class VwapColumnMigration(unittest.TestCase):
    def test_existing_vwap_column_is_dropped(self):
        conn = sqlite3.connect(":memory:")
        self.addCleanup(conn.close)
        conn.execute("CREATE TABLE daily_ohlcv (date TEXT PRIMARY KEY, open REAL, high REAL, low REAL, close REAL, volume INTEGER, vwap REAL)")
        fa.init_db(conn)
        cols = [r[1] for r in conn.execute("PRAGMA table_info(daily_ohlcv)")]
        self.assertNotIn("vwap", cols)


if __name__ == "__main__":
    unittest.main()
