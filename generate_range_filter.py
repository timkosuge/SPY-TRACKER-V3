"""Builds range_filter.js: the range filter as a live rule.

Three conditions known at the close: the VIX close (regime), the drawdown from the 20-session high (state), and the day's range
classed wide / middle / narrow against the quartiles of the trailing twelve months. The 30-minute opening range is classed the same
way against the sessions with 1-minute bars. Every table is recomputed on each run with its interval, and each cell reports whether
its rate holds in both halves of the sample.
"""
import json
import sqlite3
from datetime import date, datetime

import pytz

from payload_meta import stamp
from stats_helpers import percentile, wilson
from trading_days import add_trading_days

ET = pytz.timezone("America/New_York")
DB_PATH = "spy_data.db"
OUTPUT = "range_filter.js"
OR_MINUTES = 30
FLOOR = 30
VIX_BUCKETS = [("under 15", 0, 15), ("15 to 20", 15, 20), ("20 to 30", 20, 30), ("over 30", 30, 1e9)]
DD_BUCKETS = [("more than 5% below", -1e9, -5), ("2 to 5% below", -5, -2), ("within 2%", -2, 1e9)]


def bucket(v, buckets):
    if v is None:
        return None
    for name, lo, hi in buckets:
        if lo <= v < hi:
            return name
    return None


def stability(vals, th, floor=FLOOR):
    """Rate on each half of a cell's sessions (in date order); holds when both halves clear the floor and their intervals overlap."""
    h = len(vals) // 2
    a, b = vals[:h], vals[h:]
    ra, rb = rate(sum(1 for v in a if v >= th), len(a)), rate(sum(1 for v in b if v >= th), len(b))
    ok = len(a) >= floor and len(b) >= floor and ra["lo"] <= rb["hi"] and rb["lo"] <= ra["hi"] and (ra["rate"] > 50) == (rb["rate"] > 50)
    return {"first": ra, "second": rb, "holds": bool(ok) if len(a) >= floor and len(b) >= floor else None}


def rate(k, n):
    ci = wilson(k, n)
    return {"k": k, "n": n, "rate": round(k / n * 100, 1) if n else None, "lo": round(ci[0], 1) if ci else None, "hi": round(ci[1], 1) if ci else None}


def quartiles(values):
    return {"q25": percentile(values, 0.25), "q75": percentile(values, 0.75), "n": len(values)}


def classify(v, q):
    if v is None or q["q25"] is None:
        return None
    return "wide" if v >= q["q75"] else "narrow" if v <= q["q25"] else "middle"


def daily_rows(conn):
    return conn.execute("SELECT date, open, high, low, close FROM daily_ohlcv WHERE open IS NOT NULL AND high IS NOT NULL AND low IS NOT NULL AND close IS NOT NULL ORDER BY date").fetchall()


def vix_closes(conn):
    if not conn.execute("SELECT name FROM sqlite_master WHERE name='vix_daily'").fetchone():
        return {}
    return {d: c for d, c in conn.execute("SELECT date, close FROM vix_daily WHERE close IS NOT NULL")}


def year_before(d):
    try:
        return d.replace(year=d.year - 1)
    except ValueError:
        return d.replace(year=d.year - 1, day=28)


def intraday_sessions(conn):
    """Per session with 1-minute bars: OR as percent of the OR's first open, and the best one-sided excursion after the OR closes."""
    if not conn.execute("SELECT name FROM sqlite_master WHERE name='intraday_bars'").fetchone():
        return {}
    out = {}
    dates = [r[0] for r in conn.execute("SELECT date FROM intraday_bars GROUP BY date HAVING COUNT(*) >= 380")]
    for d in dates:
        bars = conn.execute("SELECT timestamp, open, high, low, close FROM intraday_bars WHERE date=? AND high IS NOT NULL AND low IS NOT NULL ORDER BY timestamp", (d,)).fetchall()
        if len(bars) < 380:
            continue
        orb = bars[:OR_MINUTES]
        rest = bars[OR_MINUTES:]
        o = orb[0][1] or orb[0][4]
        if not o:
            continue
        or_high, or_low = max(b[2] for b in orb), min(b[3] for b in orb)
        entry = rest[0][1] or rest[0][4]
        up = max(b[2] for b in rest) - entry
        dn = entry - min(b[3] for b in rest)
        best = max(up, dn)
        peak_idx = max(range(len(rest)), key=lambda i: max(rest[i][2] - entry, entry - rest[i][3]))
        out[d] = {"or_pct": (or_high - or_low) / o * 100, "or_dir": "up" if orb[-1][4] >= o else "down",
                  "entry": entry, "best_pct": best / entry * 100, "best_side": "up" if up >= dn else "down",
                  "peak_min": OR_MINUTES + peak_idx, "adverse_pct": min(up, dn) / entry * 100}
    return out


def main():
    conn = sqlite3.connect(DB_PATH)
    rows = daily_rows(conn)
    intra = intraday_sessions(conn)
    vix = vix_closes(conn)
    conn.close()
    last = date.fromisoformat(rows[-1][0])
    y1 = year_before(last).isoformat()
    y3 = year_before(year_before(year_before(last))).isoformat()
    by_date = {r[0]: i for i, r in enumerate(rows)}

    range_pct = {r[0]: (r[2] - r[3]) / r[4] * 100 for r in rows}
    day_q = quartiles([range_pct[r[0]] for r in rows if r[0] >= y1])
    or_q = quartiles([v["or_pct"] for d, v in intra.items() if d >= y1]) if intra else {"q25": None, "q75": None, "n": 0}
    current_price = rows[-1][4]

    prior_class, prior_vix, prior_dd = {}, {}, {}
    closes = [r[4] for r in rows]
    for i in range(1, len(rows)):
        d = rows[i][0]; pd_ = rows[i - 1][0]
        prior_class[d] = classify(range_pct[pd_], day_q)
        prior_vix[d] = bucket(vix.get(pd_), VIX_BUCKETS)
        hi20 = max(closes[max(0, i - 20):i])
        prior_dd[d] = bucket((closes[i - 1] / hi20 - 1) * 100, DD_BUCKETS)

    def cell_a(cell):
        bests = [c["best_pct"] for c in cell]
        out = {"n": len(cell), "median_best": round(percentile(bests, 0.5), 3) if bests else None,
               "ge_050": rate(sum(1 for b in bests if b >= 0.5), len(cell)), "ge_075": rate(sum(1 for b in bests if b >= 0.75), len(cell)), "ge_100": rate(sum(1 for b in bests if b >= 1.0), len(cell)),
               "stability": stability(bests, 0.75)}
        if cell:
            out.update({"median_adverse": round(percentile([c["adverse_pct"] for c in cell], 0.5), 3),
                        "peak_min_median": round(percentile([c["peak_min"] for c in cell], 0.5)), "peak_min_q25": round(percentile([c["peak_min"] for c in cell], 0.25)), "peak_min_q75": round(percentile([c["peak_min"] for c in cell], 0.75)),
                        "side_with_or": rate(sum(1 for c in cell if c["best_side"] == c["or_dir"]), len(cell))})
        return out

    # Mode A regime rows: VIX bucket × OR class and drawdown × OR class
    regime_a = {"vix": {}, "dd": {}}
    for d, v in sorted(intra.items()):
        oc = classify(v["or_pct"], or_q)
        if not oc:
            continue
        for key, val in (("vix", prior_vix.get(d)), ("dd", prior_dd.get(d))):
            if val:
                regime_a[key].setdefault(val, {}).setdefault(oc, []).append(v)
    table_a_regime = {"vix": {vb: {oc: cell_a(regime_a["vix"].get(vb, {}).get(oc, [])) for oc in ("wide", "middle", "narrow")} for vb, _, _ in VIX_BUCKETS},
                      "dd": {db: {oc: cell_a(regime_a["dd"].get(db, {}).get(oc, [])) for oc in ("wide", "middle", "narrow")} for db, _, _ in DD_BUCKETS}}

    # Table A: day-trade grid, sessions with bars — prior day class × opening range class → excursion after the OR
    grid = {}
    for d, v in sorted(intra.items()):
        pc, oc = prior_class.get(d), classify(v["or_pct"], or_q)
        if not pc or not oc:
            continue
        grid.setdefault(pc, {}).setdefault(oc, []).append(v)
    table_a = {}
    for pc in ("wide", "middle", "narrow"):
        for oc in ("wide", "middle", "narrow"):
            table_a[f"{pc}/{oc}"] = cell_a(grid.get(pc, {}).get(oc, []))

    # Table B: multi-day holds from the next open, daily bars, by era
    def hold_stats(sub_idx, k):
        bests = []
        for i in sorted(sub_idx):
            if i + k - 1 >= len(rows):
                continue
            o = rows[i][1]
            hi = max(r[2] for r in rows[i:i + k]); lo = min(r[3] for r in rows[i:i + k])
            bests.append(max(hi - o, o - lo) / o * 100)
        n = len(bests)
        return {"n": n, "median_best": round(percentile(bests, 0.5), 3) if bests else None,
                "ge_100": rate(sum(1 for b in bests if b >= 1.0), n), "ge_150": rate(sum(1 for b in bests if b >= 1.5), n), "ge_200": rate(sum(1 for b in bests if b >= 2.0), n),
                "stability": stability(bests, 1.5)}
    table_b, table_b_regime, table_b_cells = {}, {}, {}
    for era_key, start in (("3y", y3), ("all", rows[0][0])):
        table_b[era_key] = {"start": start}
        table_b_regime[era_key] = {"vix": {}, "dd": {}}
        table_b_cells[era_key] = {}
        dates_in = [d for d in prior_class if d >= start]
        for pc in ("wide", "middle", "narrow"):
            idx = [by_date[d] for d in dates_in if prior_class[d] == pc]
            table_b[era_key][pc] = {str(k): hold_stats(idx, k) for k in (1, 3, 5)}
        for vb, _, _ in VIX_BUCKETS:
            idx = [by_date[d] for d in dates_in if prior_vix.get(d) == vb]
            table_b_regime[era_key]["vix"][vb] = {str(k): hold_stats(idx, k) for k in (1, 3, 5)}
        for db, _, _ in DD_BUCKETS:
            idx = [by_date[d] for d in dates_in if prior_dd.get(d) == db]
            table_b_regime[era_key]["dd"][db] = {str(k): hold_stats(idx, k) for k in (1, 3, 5)}
        for vb, _, _ in VIX_BUCKETS:
            for db, _, _ in DD_BUCKETS:
                for pc in ("wide", "middle", "narrow"):
                    idx = [by_date[d] for d in dates_in if prior_vix.get(d) == vb and prior_dd.get(d) == db and prior_class[d] == pc]
                    table_b_cells[era_key][f"{vb}|{db}|{pc}"] = {str(k): hold_stats(idx, k) for k in (1, 3, 5)}

    # Recent log: the rule's record, newest first
    log = []
    for r in rows[-25:][::-1]:
        d = r[0]; v = intra.get(d)
        log.append({"date": d, "prior_class": prior_class.get(d), "prior_vix": prior_vix.get(d), "prior_dd": prior_dd.get(d), "prior_range_pct": round(range_pct[rows[by_date[d] - 1][0]], 3) if by_date[d] > 0 else None,
                    "or_pct": round(v["or_pct"], 3) if v else None, "or_class": classify(v["or_pct"], or_q) if v else None,
                    "best_pct": round(v["best_pct"], 3) if v else None, "best_side": v["best_side"] if v else None, "peak_min": v["peak_min"] if v else None,
                    "day_range_pct": round(range_pct[d], 3), "oc_pct": round((r[4] - r[1]) / r[1] * 100, 3)})

    today_class = classify(range_pct[rows[-1][0]], day_q)
    today_vix = vix.get(rows[-1][0]); today_vix_b = bucket(today_vix, VIX_BUCKETS)
    today_dd = (closes[-1] / max(closes[-20:]) - 1) * 100; today_dd_b = bucket(today_dd, DD_BUCKETS)
    next_session = add_trading_days(last, 1).isoformat()
    out = {
        "as_of": rows[-1][0], "next_session": next_session, "current_price": current_price,
        "day_thresholds": {"wide_pct": round(day_q["q75"], 3), "narrow_pct": round(day_q["q25"], 3), "window_start": y1, "n": day_q["n"]},
        "or_thresholds": {"wide_pct": round(or_q["q75"], 3) if or_q["q75"] is not None else None, "narrow_pct": round(or_q["q25"], 3) if or_q["q25"] is not None else None, "window_start": y1, "n": or_q["n"]},
        "latest_session": {"date": rows[-1][0], "range_pct": round(range_pct[rows[-1][0]], 3), "range_pts": round(rows[-1][2] - rows[-1][3], 2), "class": today_class,
                           "vix": round(today_vix, 2) if today_vix is not None else None, "vix_bucket": today_vix_b, "dd_pct": round(today_dd, 2), "dd_bucket": today_dd_b},
        "table_a": table_a, "table_a_regime": table_a_regime, "table_a_coverage": {"sessions": len(intra), "first": min(intra) if intra else None, "last": max(intra) if intra else None},
        "table_b": table_b, "table_b_regime": table_b_regime, "table_b_cells": table_b_cells,
        "vix_buckets": [b[0] for b in VIX_BUCKETS], "dd_buckets": [b[0] for b in DD_BUCKETS], "vix_coverage": {"sessions": len(vix), "last": max(vix) if vix else None},
        "log": log, "or_minutes": OR_MINUTES, "floor": FLOOR,
    }
    out.update(stamp(None))
    with open(OUTPUT, "w") as f:
        f.write("const RANGE_FILTER = " + json.dumps(out, separators=(",", ":")) + ";\n")
    ww = table_a["wide/wide"]; cellkey = f"{today_vix_b}|{today_dd_b}|{today_class}"; tc = table_b_cells["3y"].get(cellkey, {}).get("3")
    print(f"{OUTPUT}: as of {rows[-1][0]}, latest session {today_class} ({out['latest_session']['range_pct']}%), VIX {today_vix} ({today_vix_b}), drawdown {today_dd:.2f}% ({today_dd_b}); today's 3y cell {cellkey}: n={tc['n'] if tc else 0}; wide/wide n={ww['n']} ≥0.75% {ww['ge_075']['rate']}% holds={ww['stability']['holds']}")


if __name__ == "__main__":
    main()
