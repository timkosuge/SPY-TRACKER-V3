import sqlite3

import fetch_and_analyze as fa

DB_PATH = "spy_data.db"


def main():
    conn = sqlite3.connect(DB_PATH)
    fa.init_db(conn)
    fixed = conn.execute(
        "UPDATE daily_ohlcv SET close = 761.69 WHERE date = '2026-09-18' AND close IS NULL"
    ).rowcount
    conn.commit()
    print(f"close repaired: {fixed}")
    dates = fa.measurement_dates_needing_recompute(conn)
    for d in dates:
        fa.compute_measurements(conn, d)
    conn.commit()
    print(f"measurements recomputed: {len(dates)}")
    for label, q in (
        ("null closes", "SELECT COUNT(*) FROM daily_ohlcv WHERE close IS NULL"),
        ("mismatched measurements", "SELECT COUNT(*) FROM daily_ohlcv o JOIN daily_measurements m ON o.date=m.date WHERE o.close IS NOT NULL AND ABS(m.open_to_close-(o.close-o.open))>1e-4"),
        ("sign flips", "SELECT COUNT(*) FROM daily_ohlcv o JOIN daily_measurements m ON o.date=m.date WHERE o.close IS NOT NULL AND m.open_to_close*(o.close-o.open)<0"),
    ):
        print(f"{label}: {conn.execute(q).fetchone()[0]}")
    conn.close()


if __name__ == "__main__":
    main()
