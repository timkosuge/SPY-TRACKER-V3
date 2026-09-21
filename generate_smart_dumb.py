"""Builds smart_dumb.js: institutional against small-trader positioning, and what each extreme has preceded.

Raw net positions measure a category's structural role, not its stance — the sell side is short almost every week. Each
category is therefore converted to a COT index: where this week's net sits between its own three-year low and high, from 0
to 100. Institutions are the leveraged funds and asset managers; small traders are the non-reportable position and the
retail survey. The composite is the gap between them. Forward returns run from the first session that could act on the
report, and every claim carries its interval.
"""
import json
import math
import sqlite3
from datetime import date, timedelta

from payload_meta import stamp
from stats_helpers import percentile, wilson
from trading_days import add_trading_days

DB_PATH = "spy_data.db"
OUTPUT = "smart_dumb.js"
LOOKBACK = 156
FLOOR = 30
HORIZONS = [5, 21, 63]
CATEGORIES = [("lev", "Leveraged Funds", "institutional"), ("asset", "Asset Manager / Institutional", "institutional"),
              ("nonrept", "Non-Reportable (small traders)", "small"), ("other", "Other Reportable", "small"),
              ("dealer", "Dealer / Intermediary", "sell side")]


def rate(k, n):
    ci = wilson(k, n)
    return {"k": k, "n": n, "rate": round(k / n * 100, 1) if n else None, "lo": round(ci[0], 1) if ci else None, "hi": round(ci[1], 1) if ci else None}


def separated(a, b):
    return a and b and a["n"] and b["n"] and a["lo"] is not None and b["lo"] is not None and (a["lo"] > b["hi"] or b["lo"] > a["hi"])


def beats_base(cell, base_rate):
    return cell["n"] >= FLOOR and base_rate is not None and (cell["lo"] > base_rate or cell["hi"] < base_rate)


def cot_index(values, i, look=LOOKBACK):
    window = values[max(0, i - look + 1):i + 1]
    lo, hi = min(window), max(window)
    return None if hi == lo else round((values[i] - lo) / (hi - lo) * 100, 1)


def first_tradeable(week_end, days_after):
    return add_trading_days(date.fromisoformat(week_end) + timedelta(days=days_after), 0)


def build(conn):
    have = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    if "cot_weekly" not in have:
        return {"available": False, "reason": "no positioning history"}
    cot = conn.execute("""SELECT report_date, dealer_long, dealer_short, asset_long, asset_short, lev_long, lev_short,
                                 other_long, other_short, nonrept_long, nonrept_short FROM cot_weekly ORDER BY report_date""").fetchall()
    if len(cot) < LOOKBACK:
        return {"available": False, "reason": f"{len(cot)} reports; the index needs {LOOKBACK}"}
    aaii = {r[0]: r[1] for r in conn.execute("SELECT week_end, spread FROM aaii_weekly ORDER BY week_end")} if "aaii_weekly" in have else {}
    closes = dict(conn.execute("SELECT date, close FROM daily_ohlcv WHERE close IS NOT NULL"))
    dates = sorted(closes)
    idx = {d: i for i, d in enumerate(dates)}

    order = ["dealer", "asset", "lev", "other", "nonrept"]
    weeks = []
    for r in cot:
        w = {"d": r[0]}
        for i, cat in enumerate(order):
            w[cat] = r[1 + 2 * i] - r[2 + 2 * i]
        weeks.append(w)
    for cat in order:
        series = [w[cat] for w in weeks]
        for i, w in enumerate(weeks):
            w[cat + "_idx"] = cot_index(series, i)

    aaii_dates = sorted(aaii)
    aaii_series = [aaii[d] for d in aaii_dates]
    aaii_idx = {}
    for i, d in enumerate(aaii_dates):
        v = cot_index(aaii_series, i)
        if v is not None:
            aaii_idx[d] = v

    def nearest_aaii(report_date):
        """The survey week on or before the report's Tuesday."""
        candidates = [d for d in aaii_dates if d <= report_date]
        return aaii_idx.get(candidates[-1]) if candidates else None

    rows = []
    for w in weeks:
        if w["lev_idx"] is None:
            continue
        a = nearest_aaii(w["d"])
        mean = lambda vals: (sum(vals) / len(vals)) if vals else None
        inst = mean([v for v in (w["lev_idx"], w["asset_idx"]) if v is not None])
        small = mean([v for v in (w["nonrept_idx"], w["other_idx"], a) if v is not None])
        if inst is None or small is None:
            continue
        rec = {"d": w["d"], "institutional": round(inst, 1), "small": round(small, 1), "spread": round(inst - small, 1),
               "institutional_parts": [c for c in ("lev", "asset") if w[c + "_idx"] is not None],
               "small_parts": [c for c in ("nonrept", "other") if w[c + "_idx"] is not None] + (["survey"] if a is not None else []),
               "aaii_idx": a, **{c + "_idx": w[c + "_idx"] for c in order}, **{c + "_net": w[c] for c in order}}
        entry = first_tradeable(w["d"], 6).isoformat()
        while entry not in idx and entry <= dates[-1]:
            entry = (date.fromisoformat(entry) + timedelta(days=1)).isoformat()
        if entry in idx:
            rec["entry"] = entry
            i = idx[entry]
            for h in HORIZONS:
                if i + h < len(dates):
                    rec[f"f{h}"] = round((closes[dates[i + h]] / closes[entry] - 1) * 100, 3)
        rows.append(rec)

    latest = rows[-1]
    tests = {}
    for field, label in (("spread", "Institutions minus small traders"), ("institutional", "Institutional positioning"), ("small", "Small-trader positioning"), ("aaii_idx", "Retail survey")):
        for h in HORIZONS:
            sub = [r for r in rows if f"f{h}" in r and r.get(field) is not None]
            if len(sub) < FLOOR * 4:
                continue
            base = rate(sum(1 for r in sub if r[f"f{h}"] > 0), len(sub))
            vals = sorted(r[field] for r in sub)
            q1, q4 = percentile(vals, 0.2), percentile(vals, 0.8)
            low = [r for r in sub if r[field] <= q1]
            high = [r for r in sub if r[field] >= q4]
            cells = {"bottom fifth": rate(sum(1 for r in low if r[f"f{h}"] > 0), len(low)),
                     "top fifth": rate(sum(1 for r in high if r[f"f{h}"] > 0), len(high))}
            half = len(sub) // 2
            stab = {}
            for name, g in (("bottom fifth", low), ("top fifth", high)):
                a = [r for r in g if r["d"] <= sub[half]["d"]]
                b = [r for r in g if r["d"] > sub[half]["d"]]
                ra, rb = rate(sum(1 for r in a if r[f"f{h}"] > 0), len(a)), rate(sum(1 for r in b if r[f"f{h}"] > 0), len(b))
                stab[name] = {"first": ra, "second": rb,
                              "holds": None if (len(a) < FLOOR or len(b) < FLOOR) else bool(ra["lo"] <= rb["hi"] and rb["lo"] <= ra["hi"])}
            tests[f"{field}|{h}"] = {"field": field, "label": label, "horizon": h, "base": base, "cells": cells,
                                     "median": {"bottom fifth": round(percentile([r[f"f{h}"] for r in low], 0.5), 3), "top fifth": round(percentile([r[f"f{h}"] for r in high], 0.5), 3)},
                                     "thresholds": {"bottom fifth": round(q1, 1), "top fifth": round(q4, 1)},
                                     "separated": {k: beats_base(v, base["rate"]) for k, v in cells.items()},
                                     "tails_separated": bool(separated(cells["bottom fifth"], cells["top fifth"])), "stability": stab}

    series = [{"d": r["d"], "inst": r["institutional"], "small": r["small"], "spread": r["spread"], "px": closes.get(r.get("entry"))} for r in rows]
    return {"available": True, "weeks": len(rows), "first": rows[0]["d"], "last": latest["d"], "lookback_weeks": LOOKBACK,
            "latest": {k: latest.get(k) for k in ("d", "entry", "institutional", "small", "spread", "aaii_idx")} | {c + "_idx": latest[c + "_idx"] for c in order} | {c + "_net": latest[c + "_net"] for c in order},
            "categories": [{"key": k, "label": l, "side": s} for k, l, s in CATEGORIES],
            "aaii_weeks": len(aaii_idx), "tests": tests, "series": series, "horizons": HORIZONS, "floor": FLOOR}


def verdicts(d):
    if not d.get("available"):
        return [{"level": "info", "topic": "Positioning index", "text": f"Not built yet: {d.get('reason')}."}]
    L = d["latest"]
    V = [{"level": "info", "topic": "Where the sides stand", "text": f"Institutions read {L['institutional']:.0f} of 100, small traders {L['small']:.0f} — a gap of {L['spread']:+.0f}. Each figure is where this week's net position sits between its own three-year low and high, so a structurally short category is not read as bearish. Leveraged funds {L['lev_idx']:.0f}, asset managers {L['asset_idx']:.0f}, non-reportable {L['nonrept_idx']:.0f}" + (f", retail survey {L['aaii_idx']:.0f}" if L.get("aaii_idx") is not None else "") + f", sell side {L['dealer_idx']:.0f}."}]
    any_sep = False
    for key, t in sorted(d["tests"].items()):
        hits = [k for k, v in t["separated"].items() if v]
        if hits:
            any_sep = True
            for k in hits:
                c = t["cells"][k]
                hold = t["stability"][k]["holds"]
                V.append({"level": "finding", "topic": f"{t['label']} — {t['horizon']} sessions", "text": f"With {t['label'].lower()} in its {k} (at or {'below' if k.startswith('bottom') else 'above'} {t['thresholds'][k]}), SPY closed higher {t['horizon']} sessions later on {c['rate']}% of {c['n']} reports ({c['lo']}–{c['hi']}) against {t['base']['rate']}% for every report. Median {t['median'][k]:+.2f}%. " + ("The rate agrees across both halves of the record." if hold else "The two halves of the record disagree — treat it as unproven." if hold is False else "Too few reports in each half to check stability.")})
        elif t["tails_separated"]:
            any_sep = True
            V.append({"level": "finding", "topic": f"{t['label']} — {t['horizon']} sessions", "text": f"The two extremes of {t['label'].lower()} differ from each other: {t['cells']['bottom fifth']['rate']}% against {t['cells']['top fifth']['rate']}% — though neither separates from the every-report rate of {t['base']['rate']}%."})
    if not any_sep:
        t = d["tests"].get("spread|21") or next(iter(d["tests"].values()), None)
        if t:
            V.append({"level": "none", "topic": "Does the gap precede anything", "text": f"No extreme of institutional or small-trader positioning separates from the base rate at any horizon tested. At {t['horizon']} sessions the base rate is {t['base']['rate']}% over {t['base']['n']} reports; the widest gap between the two extremes is {abs(t['cells']['bottom fifth']['rate'] - t['cells']['top fifth']['rate']):.1f} points, inside the intervals. On this record the two sides describe who held what, not what came next."})
    a = d["tests"].get("aaii_idx|63")
    if a and not a["separated"]["bottom fifth"]:
        V.append({"level": "none", "topic": "The contrarian read on retail", "text": f"Retail at its most bearish preceded a higher SPY {a['cells']['bottom fifth']['rate']}% of the time over {a['horizon']} sessions against {a['base']['rate']}% for every week — the direction the contrarian reading expects, but the interval ({a['cells']['bottom fifth']['lo']}–{a['cells']['bottom fifth']['hi']}) contains the base rate, so it is not a measured edge."})
    return V


def main():
    conn = sqlite3.connect(DB_PATH)
    out = build(conn)
    conn.close()
    out["verdicts"] = verdicts(out)
    out.update(stamp(None))
    with open(OUTPUT, "w") as f:
        f.write("const SMART_DUMB = " + json.dumps(out, separators=(",", ":")) + ";\n")
    if out.get("available"):
        L = out["latest"]
        print(f"{OUTPUT}: {out['weeks']} reports {out['first']} → {out['last']}; institutions {L['institutional']}, small traders {L['small']}, gap {L['spread']:+}; {out['aaii_weeks']} survey weeks")
        for v in out["verdicts"]:
            print(f"  [{v['level']:7s}] {v['text'][:150]}")
    else:
        print(f"{OUTPUT}: {out.get('reason')}")


if __name__ == "__main__":
    main()
