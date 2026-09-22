"""Builds the Setup Engine's day-frame from spy_data.db and writes chains_data.js.

One row per session: endpoint, adverse excursion, the same for holds of 2 to 5 sessions, the calendar,
event and weekly-range flags the registry reads, and the minute of the session low where intraday bars exist.
"""
import csv
import json
import os
import sqlite3
from datetime import date, datetime

import pytz

from conditions import public_registry
from payload_meta import session_closed, stamp
from stats_helpers import wilson
from generate_expiry_data import monthly_opex_date

ET = pytz.timezone("America/New_York")
DB_PATH = "spy_data.db"
OUTPUT = "chains_data.js"
MAX_HOLD = 5
PAIN_PCT_DEFAULT = 0.32


def load_release_dates():
    out = {}
    for key in ("cpi", "nfp", "fomc"):
        path = os.path.join("release_dates", f"{key}_dates.csv")
        dates = set()
        if os.path.exists(path):
            with open(path, newline="") as f:
                for row in csv.reader(f):
                    if row and len(row[0]) == 10 and row[0][:2] == "20":
                        dates.add(row[0])
        out[key] = dates
    return out


def build_frame(conn):
    rows = conn.execute("SELECT date, open, high, low, close FROM daily_ohlcv WHERE open IS NOT NULL AND close IS NOT NULL AND high IS NOT NULL AND low IS NOT NULL ORDER BY date").fetchall()
    rows = [r for r in rows if session_closed(r[0])]
    wem = {}
    for ws, we, hi, lo in conn.execute("SELECT week_start, week_end, static_wem_high, static_wem_low FROM weekly_em WHERE static_wem_high IS NOT NULL AND static_wem_low IS NOT NULL"):
        wem[(ws, we)] = (hi, lo)
    worst_min = {}
    if conn.execute("SELECT name FROM sqlite_master WHERE name='intraday_bars'").fetchone():
        for d, ts in conn.execute("""SELECT date, MIN(timestamp) FROM intraday_bars b WHERE low = (SELECT MIN(low) FROM intraday_bars WHERE date=b.date AND low IS NOT NULL) GROUP BY date"""):
            try:
                t = ts[-5:] if len(ts) <= 8 else ts[11:16]
                h, m = int(t[:2]), int(t[3:])
                worst_min[d] = (h * 60 + m) - (9 * 60 + 30)
            except (TypeError, ValueError):
                pass
    releases = load_release_dates()
    vix = {}
    if conn.execute("SELECT name FROM sqlite_master WHERE name='vix_daily'").fetchone():
        vix = {d: c for d, c in conn.execute("SELECT date, close FROM vix_daily WHERE close IS NOT NULL")}
    closes = [r[4] for r in rows]
    frame = []
    n = len(rows)
    for i, (d, o, h, l, c) in enumerate(rows):
        dt = date.fromisoformat(d)
        prev = rows[i - 1] if i > 0 else None
        gap_pct = (o / prev[4] - 1) * 100 if prev and prev[4] else None
        prior_oc_pct = (prev[4] / prev[1] - 1) * 100 if prev and prev[1] else None
        holds = []
        for k in range(1, MAX_HOLD + 1):
            if i + k - 1 >= n:
                holds.append(None)
                continue
            seg = rows[i:i + k]
            close_k = seg[-1][4]
            low_k = min(r[3] for r in seg)
            high_k = max(r[2] for r in seg)
            holds.append([round((close_k - o) / o * 100, 4), round((o - low_k) / o * 100, 4), round((high_k - o) / o * 100, 4)])
        week_key = next((k for k in wem if k[0] <= d <= k[1]), None)
        wh, wl = wem[week_key] if week_key else (None, None)
        nxt = rows[i + 1][0] if i + 1 < n else None
        frame.append({
            "date": d, "open": round(o, 4), "high": round(h, 4), "low": round(l, 4), "close": round(c, 4),
            "gap_pct": round(gap_pct, 4) if gap_pct is not None else None,
            "prior_oc_pct": round(prior_oc_pct, 4) if prior_oc_pct is not None else None,
            "weekday": dt.weekday(),
            "is_monthly_opex": dt == monthly_opex_date(dt.year, dt.month),
            "is_month_first": prev is None or prev[0][:7] != d[:7],
            "is_month_last": nxt is None or nxt[:7] != d[:7],
            "wem_high": wh, "wem_low": wl,
            "is_cpi": d in releases["cpi"], "is_nfp": d in releases["nfp"], "is_fomc": d in releases["fomc"],
            "vix": round(vix[prev[0]], 2) if prev and prev[0] in vix else None,
            "dd20": round((prev[4] / max(closes[max(0, i - 20):i]) - 1) * 100, 3) if prev else None,
            "holds": holds,
            "worst_min": worst_min.get(d),
        })
    return frame


def earliest_by_requirement(frame):
    out = {"daily_ohlcv": date.fromisoformat(frame[0]["date"]) if frame else None}
    w = [r["date"] for r in frame if r["wem_high"] is not None]
    out["weekly_em"] = date.fromisoformat(w[0]) if w else None
    e = [r["date"] for r in frame if r["is_cpi"] or r["is_nfp"] or r["is_fomc"]]
    out["release_dates"] = date.fromisoformat(e[0]) if e else None
    v = [r["date"] for r in frame if r["vix"] is not None]
    out["vix_daily"] = date.fromisoformat(v[0]) if v else None
    return out


def eras(frame):
    last = date.fromisoformat(frame[-1]["date"])
    def back(years):
        try:
            return last.replace(year=last.year - years)
        except ValueError:
            return last.replace(year=last.year - years, day=28)
    return {"3y": back(3).isoformat(), "5y": back(5).isoformat(), "all": frame[0]["date"]}


def base_rates(frame, era_starts):
    out = {}
    for key, start in era_starts.items():
        sub = [r for r in frame if r["date"] >= start and r["holds"][0] is not None]
        k = sum(1 for r in sub if r["holds"][0][0] > 0)
        ci = wilson(k, len(sub))
        out[key] = {"start": start, "n": len(sub), "hits": k, "rate": round(k / len(sub) * 100, 2) if sub else None, "lo": round(ci[0], 2) if ci else None, "hi": round(ci[1], 2) if ci else None}
    return out


def main():
    conn = sqlite3.connect(DB_PATH)
    frame = build_frame(conn)
    conn.close()
    if not frame:
        raise SystemExit("no sessions")
    ebr = earliest_by_requirement(frame)
    era_starts = eras(frame)
    keys = ["date", "open", "high", "low", "close", "gap_pct", "prior_oc_pct", "weekday", "is_monthly_opex", "is_month_first", "is_month_last", "wem_high", "wem_low", "is_cpi", "is_nfp", "is_fomc", "vix", "dd20", "holds", "worst_min"]
    compact = [[r[k] for k in keys] for r in frame]
    out = {
        "keys": keys,
        "rows": compact,
        "registry": public_registry(),
        "earliest_by_requirement": {k: (v.isoformat() if v else None) for k, v in ebr.items()},
        "eras": era_starts,
        "base_rates": base_rates(frame, era_starts),
        "current_price": frame[-1]["close"],
        "pain_pct_default": PAIN_PCT_DEFAULT,
        "max_hold": MAX_HOLD,
        "intraday_coverage": {"sessions": sum(1 for r in frame if r["worst_min"] is not None),
                              "first": next((r["date"] for r in frame if r["worst_min"] is not None), None),
                              "last": next((r["date"] for r in reversed(frame) if r["worst_min"] is not None), None)},
    }
    out.update(stamp(None))
    with open(OUTPUT, "w") as f:
        f.write("const CHAINS_DATA = " + json.dumps(out, separators=(",", ":")) + ";\n")
    br = out["base_rates"]["3y"]
    print(f"{OUTPUT}: {len(frame)} sessions, eras {era_starts}, 3y base rate {br['rate']}% ({br['lo']}–{br['hi']}, n={br['n']}), intraday coverage {out['intraday_coverage']['sessions']} sessions, {os.path.getsize(OUTPUT)//1024} KB")


if __name__ == "__main__":
    main()
