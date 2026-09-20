import sqlite3

import fetch_and_analyze as fa

DB_PATH = "spy_data.db"


def shift(hhmm, minutes):
    h, m = map(int, hhmm.split(":"))
    t = h * 60 + m + minutes
    return f"{t // 60:02d}:{t % 60:02d}"


def main():
    conn = sqlite3.connect(DB_PATH)
    fa.init_db(conn)
    c = conn.cursor()

    central = [r[0] for r in c.execute(
        "SELECT date FROM intraday_bars GROUP BY date HAVING MIN(timestamp) = '08:30'"
    ).fetchall()]
    shifted = 0
    for d in central:
        rows = c.execute(
            "SELECT timestamp, open, high, low, close, volume, vwap FROM intraday_bars WHERE date=?", (d,)
        ).fetchall()
        c.execute("DELETE FROM intraday_bars WHERE date=?", (d,))
        c.executemany(
            "INSERT INTO intraday_bars VALUES (?,?,?,?,?,?,?,?)",
            [(d, shift(ts, 60), o, h, l, cl, v, vw) for ts, o, h, l, cl, v, vw in rows],
        )
        shifted += len(rows)
    conn.commit()
    print(f"dates shifted to Eastern: {len(central)}  rows: {shifted}")

    restorable = c.execute(
        "SELECT b.date FROM (SELECT date, COUNT(*) n FROM intraday_bars GROUP BY date) b "
        "JOIN (SELECT date, COUNT(*) n FROM intraday_1m GROUP BY date HAVING n >= 380) m ON m.date = b.date "
        "WHERE b.n < 380"
    ).fetchall()
    for (d,) in restorable:
        c.execute("DELETE FROM intraday_bars WHERE date=?", (d,))
        c.execute(
            "INSERT INTO intraday_bars (date, timestamp, open, high, low, close, volume, vwap) "
            "SELECT date, time, open, high, low, close, volume, NULL FROM intraday_1m WHERE date=? "
            "AND time >= '09:30' AND time < '16:00'", (d,)
        )
    conn.commit()
    print(f"truncated sessions restored from intraday_1m: {len(restorable)}")

    c.execute("DELETE FROM volume_analysis")
    dates = [r[0] for r in c.execute("SELECT DISTINCT date FROM intraday_bars").fetchall()]
    for d in dates:
        fa.compute_volume_analysis(conn, d)
    conn.commit()
    print(f"volume_analysis rebuilt: {len(dates)} dates")

    firsts = c.execute(
        "SELECT m, COUNT(*) FROM (SELECT date, MIN(timestamp) m FROM intraday_bars GROUP BY date) GROUP BY m"
    ).fetchall()
    mismatch = c.execute(
        "SELECT COUNT(*) FROM intraday_bars b JOIN daily_ohlcv d ON d.date = b.date "
        "WHERE b.timestamp = '09:30' AND ABS(b.open - d.open) > 0.05"
    ).fetchone()[0]
    print(f"first-bar timestamps: {firsts}")
    print(f"09:30 opens disagreeing with daily open by more than $0.05: {mismatch}")
    conn.close()


if __name__ == "__main__":
    main()
