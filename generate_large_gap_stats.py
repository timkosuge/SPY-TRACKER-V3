import json
import sqlite3
from datetime import datetime

DB_PATH = "spy_data.db"
THRESHOLDS = [1.0, 1.5, 2.0, 3.0]
DOW = ["Mon", "Tue", "Wed", "Thu", "Fri"]
YEARS_SHOWN = 8


def load_sessions(conn, cutoff=None):
    q = "SELECT date, open, high, low, close, volume FROM daily_ohlcv WHERE open > 0 AND close IS NOT NULL"
    if cutoff:
        q += f" AND date <= '{cutoff}'"
    rows = conn.execute(q + " ORDER BY date").fetchall()
    out = []
    for i in range(1, len(rows)):
        d, o, h, l, c, v = rows[i]
        pc = rows[i - 1][4]
        gap = (o - pc) / pc * 100
        out.append(dict(
            date=d, open=o, high=h, low=l, close=c, volume=v or 0, prev_close=pc, gap=gap,
            oc=(c - o) / o * 100, rng=(h - l) / o * 100,
            filled=(l <= pc) if gap > 0 else (h >= pc),
            faded=(c < o) if gap > 0 else (c > o),
            cont=(c > pc) if gap > 0 else (c < pc),
            dow=datetime.strptime(d, "%Y-%m-%d").weekday(),
        ))
    return out


def r(v, n=1):
    return round(v, n) if v is not None else None


def summarize(evts, last_year, notable_desc):
    n = len(evts)
    if not n:
        return None
    dow = {}
    for k, name in enumerate(DOW):
        sub = [e for e in evts if e["dow"] == k]
        if sub:
            dow[name] = dict(n=len(sub), fill_rate=r(sum(e["filled"] for e in sub) / len(sub) * 100),
                             avg_gap=r(sum(e["gap"] for e in sub) / len(sub), 3), avg_oc=r(sum(e["oc"] for e in sub) / len(sub), 3))
    years = {}
    for y in sorted({e["date"][:4] for e in evts})[-YEARS_SHOWN:]:
        sub = [e for e in evts if e["date"].startswith(y)]
        years[y] = dict(n=len(sub), fill_rate=r(sum(e["filled"] for e in sub) / len(sub) * 100),
                        avg_oc=r(sum(e["oc"] for e in sub) / len(sub), 3))
    notable = sorted(evts, key=lambda e: e["gap"], reverse=notable_desc)[:5]
    return dict(
        n=n,
        fill_rate=r(sum(e["filled"] for e in evts) / n * 100),
        fade_rate=r(sum(e["faded"] for e in evts) / n * 100),
        cont_rate=r(sum(e["cont"] for e in evts) / n * 100),
        avg_gap_pct=r(sum(e["gap"] for e in evts) / n, 3),
        avg_oc_pct=r(sum(e["oc"] for e in evts) / n, 3),
        avg_range_pct=r(sum(e["rng"] for e in evts) / n, 3),
        max_gap_pct=r(max(e["gap"] for e in evts), 2),
        min_gap_pct=r(min(e["gap"] for e in evts), 2),
        avg_volume=int(sum(e["volume"] for e in evts) / n),
        dow=dow, years=years,
        notable=[dict(date=e["date"], gap_pct=r(e["gap"], 2), open=r(e["open"], 2), close=r(e["close"], 2), filled=bool(e["filled"])) for e in notable],
    )


def build(conn, cutoff=None):
    S = load_sessions(conn, cutoff)
    last_year = int(S[-1]["date"][:4])
    buckets = {}
    freq = {}
    for t in THRESHOLDS:
        up = [e for e in S if e["gap"] >= t]
        dn = [e for e in S if e["gap"] <= -t]
        key = f"{t:.1f}"
        buckets[key] = dict(threshold=t, up=summarize(up, last_year, True), down=summarize(dn, last_year, False),
                            combined=summarize(sorted(up + dn, key=lambda e: e["date"]), last_year, False))
        freq[key] = dict(up_n=len(up), dn_n=len(dn), up_pct=r(len(up) / len(S) * 100), dn_pct=r(len(dn) / len(S) * 100))
    return dict(thresholds=THRESHOLDS, buckets=buckets,
                overall=dict(total_sessions=len(S), date_range=dict(**{"from": S[0]["date"], "to": S[-1]["date"]}), freq=freq))


def main():
    conn = sqlite3.connect(DB_PATH)
    data = build(conn)
    data["generated"] = datetime.now().astimezone().isoformat(timespec="seconds")
    data["source_max_date"] = conn.execute("SELECT MAX(date) FROM daily_ohlcv WHERE close IS NOT NULL").fetchone()[0]
    with open("large_gap_stats.js", "w") as f:
        f.write("const LARGE_GAP_STATS = " + json.dumps(data) + ";\n")
    print(f"large_gap_stats.js: {data['overall']['total_sessions']} sessions through {data['overall']['date_range']['to']}")
    conn.close()


if __name__ == "__main__":
    main()
