import csv
import json
import sqlite3
from datetime import datetime

from payload_meta import session_closed

DB_PATH = "spy_data.db"
REGISTRY = {"cpi": "release_dates/cpi_dates.csv", "nfp": "release_dates/nfp_dates.csv", "fomc": "release_dates/fomc_dates.csv"}


def load_registry():
    out = {}
    for kind, path in REGISTRY.items():
        with open(path, newline="") as f:
            out[kind] = [(r["Date"], (r.get("Notes") or "").strip()) for r in csv.DictReader(f)]
    return out


def event_record(rows, idx, dates, d, note):
    i = idx.get(d)
    if i is None:
        later = [x for x in dates if x > d]
        if not later:
            return None
        i = idx[later[0]]
    r = rows[i]
    if i == 0 or i + 5 >= len(rows):
        return None
    p = rows[i - 1]
    o, h, l, c = r[1], r[2], r[3], r[4]
    return {
        "date": d, "year": int(d[:4]), "notes": note, "is_unscheduled": "unscheduled" in note.lower(),
        "gap": round((o - p[4]) / p[4] * 100, 3),
        "day_ret": round((c - p[4]) / p[4] * 100, 3),
        "oc_ret": round((c - o) / o * 100, 3),
        "range": round(h - l, 2),
        "close_pos": round((c - l) / (h - l), 3) if h != l else None,
        "before_ret": round((p[4] - rows[i - 5][1]) / rows[i - 5][1] * 100, 3),
        "after_ret": round((rows[i + 5][4] - rows[i + 1][1]) / rows[i + 1][1] * 100, 3),
        "open": round(o, 2), "high": round(h, 2), "low": round(l, 2), "close": round(c, 2),
    }


def build(conn, cutoff=None):
    q = "SELECT date, open, high, low, close FROM daily_ohlcv WHERE open > 0 AND close IS NOT NULL"
    if cutoff:
        q += f" AND date <= '{cutoff}'"
    rows = conn.execute(q + " ORDER BY date").fetchall()
    rows = [r for r in rows if session_closed(r[0])]
    dates = [r[0] for r in rows]
    idx = {d: i for i, d in enumerate(dates)}
    last = dates[-1]
    data = {"upcoming": {}}
    for kind, entries in load_registry().items():
        hist, upcoming = [], []
        for d, note in entries:
            if d > last:
                upcoming.append(d)
                continue
            rec = event_record(rows, idx, dates, d, note)
            if rec:
                hist.append(rec)
        data[kind] = hist
        data["upcoming"][kind] = upcoming
    data["source_max_date"] = last
    return data


def main():
    conn = sqlite3.connect(DB_PATH)
    data = build(conn)
    data["generated"] = datetime.now().astimezone().isoformat(timespec="seconds")
    with open("release_data.js", "w") as f:
        f.write("const RELEASE_DATA = " + json.dumps(data) + ";\n")
    print(f"release_data.js: cpi {len(data['cpi'])}, nfp {len(data['nfp'])}, fomc {len(data['fomc'])}, upcoming {sum(len(v) for v in data['upcoming'].values())}")
    conn.close()


if __name__ == "__main__":
    main()
