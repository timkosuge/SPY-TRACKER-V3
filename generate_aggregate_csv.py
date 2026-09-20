import csv
import sqlite3
from calendar import monthrange
from datetime import date, timedelta

DB_PATH = "spy_data.db"
HEADER = ["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOL", "Return_%", "True_Range", "Avg_Daily_Vol", "Trading_Days"]


def period_rows(rows, keyfn, datefn):
    groups = {}
    for d, o, h, l, c, v in rows:
        k = keyfn(d)
        g = groups.setdefault(k, {"first": d, "open": o, "high": h, "low": l, "close": c, "vol": 0, "n": 0})
        g["high"] = max(g["high"], h); g["low"] = min(g["low"], l); g["close"] = c
        g["vol"] += int(v or 0); g["n"] += 1
    out = []
    for k in sorted(groups):
        g = groups[k]
        o, h, l, c = (round(g[x], 2) for x in ("open", "high", "low", "close"))
        out.append([datefn(k), o, h, l, c, float(g["vol"]), round((g["close"] - g["open"]) / g["open"] * 100, 2),
                    round(g["high"] - g["low"], 2), round(g["vol"] / g["n"]), g["n"]])
    return out


def week_key(d):
    dt = date.fromisoformat(d)
    return (dt + timedelta(days=4 - dt.weekday())).isoformat()


def month_key(d):
    return d[:7]


def month_end(k):
    y, m = map(int, k.split("-"))
    return f"{y:04d}-{m:02d}-{monthrange(y, m)[1]:02d}"


def build(conn, cutoff=None):
    q = "SELECT date, open, high, low, close, volume FROM daily_ohlcv WHERE open > 0 AND close IS NOT NULL"
    if cutoff:
        q += f" AND date <= '{cutoff}'"
    rows = conn.execute(q + " ORDER BY date").fetchall()
    return {
        "data/SPY_weekly.csv": period_rows(rows, week_key, lambda k: k),
        "data/SPY_monthly.csv": period_rows(rows, month_key, month_end),
        "data/SPY_yearly.csv": period_rows(rows, lambda d: d[:4], lambda k: f"{k}-12-31"),
    }


def main():
    conn = sqlite3.connect(DB_PATH)
    for path, rows in build(conn).items():
        with open(path, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(HEADER)
            w.writerows(rows)
        print(f"{path}: {len(rows)} rows through {rows[-1][0]}")
    conn.close()


if __name__ == "__main__":
    main()
