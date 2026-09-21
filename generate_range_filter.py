"""Builds range_filter.js: the range filter as a live rule.

Yesterday's range (high minus low, percent of close) is classed wide / middle / narrow against the quartiles of the trailing
twelve months. The 30-minute opening range is classed the same way against the sessions with 1-minute bars. Every table is
recomputed from the database on each run; the thresholds roll with the data.
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
    conn.close()
    last = date.fromisoformat(rows[-1][0])
    y1 = year_before(last).isoformat()
    y3 = year_before(year_before(year_before(last))).isoformat()
    by_date = {r[0]: i for i, r in enumerate(rows)}

    range_pct = {r[0]: (r[2] - r[3]) / r[4] * 100 for r in rows}
    day_q = quartiles([range_pct[r[0]] for r in rows if r[0] >= y1])
    or_q = quartiles([v["or_pct"] for d, v in intra.items() if d >= y1]) if intra else {"q25": None, "q75": None, "n": 0}
    current_price = rows[-1][4]

    prior_class = {}
    for i in range(1, len(rows)):
        prior_class[rows[i][0]] = classify(range_pct[rows[i - 1][0]], day_q)

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
            cell = grid.get(pc, {}).get(oc, [])
            bests = [c["best_pct"] for c in cell]
            table_a[f"{pc}/{oc}"] = {"n": len(cell), "median_best": round(percentile(bests, 0.5), 3) if bests else None,
                                    "ge_050": rate(sum(1 for b in bests if b >= 0.5), len(cell)), "ge_075": rate(sum(1 for b in bests if b >= 0.75), len(cell)), "ge_100": rate(sum(1 for b in bests if b >= 1.0), len(cell)),
                                    "median_adverse": round(percentile([c["adverse_pct"] for c in cell], 0.5), 3) if cell else None,
                                    "peak_min_median": round(percentile([c["peak_min"] for c in cell], 0.5)) if cell else None,
                                    "peak_min_q25": round(percentile([c["peak_min"] for c in cell], 0.25)) if cell else None,
                                    "peak_min_q75": round(percentile([c["peak_min"] for c in cell], 0.75)) if cell else None,
                                    "side_with_or": rate(sum(1 for c in cell if c["best_side"] == c["or_dir"]), len(cell))}

    # Table B: multi-day holds from the next open, daily bars, by era
    def hold_stats(sub_idx, k):
        bests = []
        for i in sub_idx:
            if i + k - 1 >= len(rows):
                continue
            o = rows[i][1]
            hi = max(r[2] for r in rows[i:i + k]); lo = min(r[3] for r in rows[i:i + k])
            bests.append(max(hi - o, o - lo) / o * 100)
        n = len(bests)
        return {"n": n, "median_best": round(percentile(bests, 0.5), 3) if bests else None,
                "ge_100": rate(sum(1 for b in bests if b >= 1.0), n), "ge_150": rate(sum(1 for b in bests if b >= 1.5), n), "ge_200": rate(sum(1 for b in bests if b >= 2.0), n)}
    table_b = {}
    for era_key, start in (("3y", y3), ("all", rows[0][0])):
        table_b[era_key] = {"start": start}
        for pc in ("wide", "middle", "narrow"):
            idx = [by_date[d] for d, c in prior_class.items() if c == pc and d >= start]
            table_b[era_key][pc] = {str(k): hold_stats(idx, k) for k in (1, 3, 5)}

    # Recent log: the rule's record, newest first
    log = []
    for r in rows[-25:][::-1]:
        d = r[0]; v = intra.get(d)
        log.append({"date": d, "prior_class": prior_class.get(d), "prior_range_pct": round(range_pct[rows[by_date[d] - 1][0]], 3) if by_date[d] > 0 else None,
                    "or_pct": round(v["or_pct"], 3) if v else None, "or_class": classify(v["or_pct"], or_q) if v else None,
                    "best_pct": round(v["best_pct"], 3) if v else None, "best_side": v["best_side"] if v else None, "peak_min": v["peak_min"] if v else None,
                    "day_range_pct": round(range_pct[d], 3), "oc_pct": round((r[4] - r[1]) / r[1] * 100, 3)})

    today_class = classify(range_pct[rows[-1][0]], day_q)
    next_session = add_trading_days(last, 1).isoformat()
    out = {
        "as_of": rows[-1][0], "next_session": next_session, "current_price": current_price,
        "day_thresholds": {"wide_pct": round(day_q["q75"], 3), "narrow_pct": round(day_q["q25"], 3), "window_start": y1, "n": day_q["n"]},
        "or_thresholds": {"wide_pct": round(or_q["q75"], 3) if or_q["q75"] is not None else None, "narrow_pct": round(or_q["q25"], 3) if or_q["q25"] is not None else None, "window_start": y1, "n": or_q["n"]},
        "latest_session": {"date": rows[-1][0], "range_pct": round(range_pct[rows[-1][0]], 3), "range_pts": round(rows[-1][2] - rows[-1][3], 2), "class": today_class},
        "table_a": table_a, "table_a_coverage": {"sessions": len(intra), "first": min(intra) if intra else None, "last": max(intra) if intra else None},
        "table_b": table_b, "log": log, "or_minutes": OR_MINUTES, "floor": FLOOR,
    }
    out.update(stamp(None))
    with open(OUTPUT, "w") as f:
        f.write("const RANGE_FILTER = " + json.dumps(out, separators=(",", ":")) + ";\n")
    ww = table_a["wide/wide"]
    print(f"{OUTPUT}: as of {rows[-1][0]}, latest session {today_class} ({out['latest_session']['range_pct']}%), wide day ≥{out['day_thresholds']['wide_pct']}% narrow ≤{out['day_thresholds']['narrow_pct']}%, wide OR ≥{out['or_thresholds']['wide_pct']}%; wide/wide n={ww['n']} median {ww['median_best']}% ≥0.75% {ww['ge_075']['rate']}%")


if __name__ == "__main__":
    main()
