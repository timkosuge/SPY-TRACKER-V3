#!/usr/bin/env python3
"""
generate_tod_stats.py
Reads intraday_bars from spy_data.db, computes time-of-day stats for
HOD and LOD, and writes tod_stats.js for the dashboard.

Stats computed:
  - HOD / LOD frequency by 8 CT time buckets
  - HOD / LOD frequency by DOW (Mon-Fri)
  - HOD / LOD cross-matrix (what bucket sets HOD when LOD was in bucket X)
  - Avg time-of-day for HOD and LOD
  - % of days where HOD is set before LOD, after, or same bucket
  - % of days where first 30min contains HOD or LOD
"""
import sqlite3, json, os
from datetime import datetime

DB_PATH = "spy_data.db"

BUCKET_DEFS = [
    ("8:30-9:00",   8*60+30,  9*60),
    ("9:00-9:30",   9*60,     9*60+30),
    ("9:30-10:30",  9*60+30,  10*60+30),
    ("10:30-12:00", 10*60+30, 12*60),
    ("12:00-1:00",  12*60,    13*60),
    ("1:00-2:00",   13*60,    14*60),
    ("2:00-2:30",   14*60,    14*60+30),
    ("2:30-3:00",   14*60+30, 15*60),
]
BUCKET_LABELS = [b[0] for b in BUCKET_DEFS]

def ts_to_mins(ts_str):
    h, m = map(int, ts_str.split(":"))
    return h * 60 + m

def bucket_idx(ts_str):
    mins = ts_to_mins(ts_str)
    for i, (_, start, end) in enumerate(BUCKET_DEFS):
        if start <= mins < end:
            return i
    return None

def main():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: {DB_PATH} not found")
        return

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    dates = [r[0] for r in c.execute(
        "SELECT DISTINCT date FROM intraday_bars ORDER BY date"
    ).fetchall()]

    print(f"Processing {len(dates)} days of intraday bars...")

    hod_bucket_counts  = [0] * 8
    lod_bucket_counts  = [0] * 8
    # DOW: 0=Mon...4=Fri
    hod_by_dow = [[0]*8 for _ in range(5)]
    lod_by_dow = [[0]*8 for _ in range(5)]
    # HOD before/after/same bucket as LOD
    hod_before_lod = 0
    hod_after_lod  = 0
    hod_same_lod   = 0
    # First 30 min (8:30-9:00 bucket idx=0)
    hod_first30 = 0
    lod_first30 = 0
    # Last 30 min (2:30-3:00 bucket idx=7)
    hod_last30  = 0
    lod_last30  = 0

    hod_mins_list = []
    lod_mins_list = []
    days_ok = 0

    for date in dates:
        bars = c.execute(
            "SELECT timestamp, high, low FROM intraday_bars WHERE date=? ORDER BY timestamp",
            (date,)
        ).fetchall()
        session = [(ts, h, l) for ts, h, l in bars if h and l and ts_to_mins(ts) >= 8*60+30]
        if len(session) < 10:
            continue

        max_bar = max(session, key=lambda x: x[1])
        min_bar = min(session, key=lambda x: x[2])
        hod_ts, lod_ts = max_bar[0], min_bar[0]

        hbi = bucket_idx(hod_ts)
        lbi = bucket_idx(lod_ts)
        if hbi is None or lbi is None:
            continue

        # DOW from date string
        dt = datetime.strptime(date, "%Y-%m-%d")
        dow = dt.weekday()  # 0=Mon...4=Fri
        if 0 <= dow <= 4:
            hod_by_dow[dow][hbi] += 1
            lod_by_dow[dow][lbi] += 1

        hod_bucket_counts[hbi] += 1
        lod_bucket_counts[lbi] += 1
        hod_mins_list.append(ts_to_mins(hod_ts))
        lod_mins_list.append(ts_to_mins(lod_ts))

        if hbi < lbi:   hod_before_lod += 1
        elif hbi > lbi: hod_after_lod  += 1
        else:           hod_same_lod   += 1

        if hbi == 0: hod_first30 += 1
        if lbi == 0: lod_first30 += 1
        if hbi == 7: hod_last30  += 1
        if lbi == 7: lod_last30  += 1

        days_ok += 1

    conn.close()
    print(f"Days with valid bars: {days_ok}")

    def pct(n): return round(n / days_ok * 100, 1) if days_ok else 0
    def avg_mins(lst):
        if not lst: return None
        m = sum(lst) // len(lst)
        return f"{m//60:02d}:{m%60:02d}"

    DOW_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"]

    output = {
        "days": days_ok,
        "date_range": {"start": dates[0], "end": dates[-1]},
        "buckets": BUCKET_LABELS,
        "hod": {
            "by_bucket": [
                {"label": BUCKET_LABELS[i], "count": hod_bucket_counts[i], "pct": pct(hod_bucket_counts[i])}
                for i in range(8)
            ],
            "by_dow": [
                {"dow": DOW_NAMES[d], "counts": hod_by_dow[d], "pcts": [pct(hod_by_dow[d][i]) for i in range(8)]}
                for d in range(5)
            ],
            "avg_time": avg_mins(hod_mins_list),
            "pct_first30": pct(hod_first30),
            "pct_last30":  pct(hod_last30),
        },
        "lod": {
            "by_bucket": [
                {"label": BUCKET_LABELS[i], "count": lod_bucket_counts[i], "pct": pct(lod_bucket_counts[i])}
                for i in range(8)
            ],
            "by_dow": [
                {"dow": DOW_NAMES[d], "counts": lod_by_dow[d], "pcts": [pct(lod_by_dow[d][i]) for i in range(8)]}
                for d in range(5)
            ],
            "avg_time": avg_mins(lod_mins_list),
            "pct_first30": pct(lod_first30),
            "pct_last30":  pct(lod_last30),
        },
        "sequence": {
            "hod_before_lod": {"count": hod_before_lod, "pct": pct(hod_before_lod)},
            "hod_after_lod":  {"count": hod_after_lod,  "pct": pct(hod_after_lod)},
            "hod_same_lod":   {"count": hod_same_lod,   "pct": pct(hod_same_lod)},
        },
    }

    js = f"const TOD_STATS = {json.dumps(output, separators=(',', ':'))};"
    with open("tod_stats.js", "w") as f:
        f.write(js)
    print(f"tod_stats.js written — {len(js):,} chars, {days_ok} days")
    print(f"HOD avg time: {output['hod']['avg_time']}  LOD avg time: {output['lod']['avg_time']}")
    print(f"HOD first-30min: {output['hod']['pct_first30']}%  LOD first-30min: {output['lod']['pct_first30']}%")

if __name__ == "__main__":
    main()
