"""Builds cot_data.js from cot_weekly: positioning by category with its place in history, and what it has preceded.

Each category's net (long minus short) and its weekly change, every week since 2006, with the latest reading's percentile
over three windows. Forward SPY returns are measured from the first session after each report's publication — the report
covers Tuesday and is released the following Friday afternoon, so the first tradeable session is the Monday after.
"""
import json
import sqlite3
from datetime import date, timedelta

from payload_meta import stamp
from stats_helpers import percentile, wilson
from trading_days import add_trading_days, is_trading_day

DB_PATH = "spy_data.db"
OUTPUT = "cot_data.js"
FLOOR = 30
CATEGORIES = [("dealer", "Dealer / Intermediary"), ("asset", "Asset Manager / Institutional"), ("lev", "Leveraged Funds"), ("other", "Other Reportable"), ("nonrept", "Non-Reportable")]
HORIZONS = [5, 21]


def rate(k, n):
    ci = wilson(k, n)
    return {"k": k, "n": n, "rate": round(k / n * 100, 1) if n else None, "lo": round(ci[0], 1) if ci else None, "hi": round(ci[1], 1) if ci else None}


def separated(a, b):
    return a and b and a["n"] and b["n"] and a["lo"] is not None and b["lo"] is not None and (a["lo"] > b["hi"] or b["lo"] > a["hi"])


def pct_rank(values, v):
    if v is None or not values:
        return None
    return round(sum(1 for x in values if x < v) / len(values) * 100, 1)


def first_tradeable(report_date):
    """The report covers Tuesday and is published the Friday after; the first session that can act on it is the next Monday."""
    d = date.fromisoformat(report_date) + timedelta(days=6)
    return add_trading_days(d, 0)


def build(conn):
    if not conn.execute("SELECT name FROM sqlite_master WHERE name='cot_weekly'").fetchone():
        return {"available": False, "weeks": 0}
    rows = conn.execute("""SELECT report_date, open_interest, dealer_long, dealer_short, asset_long, asset_short,
                                  lev_long, lev_short, other_long, other_short, nonrept_long, nonrept_short
                           FROM cot_weekly ORDER BY report_date""").fetchall()
    if len(rows) < 2:
        return {"available": False, "weeks": len(rows)}
    keys = ["report_date", "open_interest", "dealer_long", "dealer_short", "asset_long", "asset_short", "lev_long", "lev_short", "other_long", "other_short", "nonrept_long", "nonrept_short"]
    weeks = []
    for i, r in enumerate(rows):
        w = dict(zip(keys, r))
        rec = {"report_date": w["report_date"], "open_interest": w["open_interest"]}
        for cat, _ in CATEGORIES:
            net = (w.get(cat + "_long") or 0) - (w.get(cat + "_short") or 0)
            rec[cat + "_net"] = net
            rec[cat + "_pct_oi"] = round(net / w["open_interest"] * 100, 2) if w["open_interest"] else None
        if i:
            p = weeks[-1]
            for cat, _ in CATEGORIES:
                rec["chg_" + cat + "_net"] = rec[cat + "_net"] - p[cat + "_net"]
        weeks.append(rec)

    closes = dict(conn.execute("SELECT date, close FROM daily_ohlcv WHERE close IS NOT NULL"))
    dates = sorted(closes)
    idx = {d: i for i, d in enumerate(dates)}
    for w in weeks:
        entry = first_tradeable(w["report_date"]).isoformat()
        while entry not in idx and entry <= dates[-1]:
            entry = (date.fromisoformat(entry) + timedelta(days=1)).isoformat()
        if entry not in idx:
            continue
        i = idx[entry]
        w["entry_date"] = entry
        for h in HORIZONS:
            if i + h < len(dates):
                w[f"fwd{h}"] = round((closes[dates[i + h]] / closes[entry] - 1) * 100, 3)

    latest = weeks[-1]
    last = date.fromisoformat(latest["report_date"])
    windows = {"all": weeks, "5y": [w for w in weeks if w["report_date"] >= last.replace(year=last.year - 5).isoformat()],
               "1y": [w for w in weeks if w["report_date"] >= last.replace(year=last.year - 1).isoformat()]}
    standing = {}
    for cat, label in CATEGORIES:
        standing[cat] = {"label": label, "net": latest[cat + "_net"], "pct_oi": latest.get(cat + "_pct_oi"),
                         "change": latest.get("chg_" + cat + "_net"),
                         "percentile": {k: pct_rank([w[cat + "_net"] for w in v], latest[cat + "_net"]) for k, v in windows.items()},
                         "min": min(w[cat + "_net"] for w in weeks), "max": max(w[cat + "_net"] for w in weeks)}

    tests = {}
    for cat, label in CATEGORIES:
        nets = sorted(w[cat + "_net"] for w in weeks)
        q1, q4 = percentile(nets, 0.2), percentile(nets, 0.8)
        for h in HORIZONS:
            have = [w for w in weeks if f"fwd{h}" in w]
            if len(have) < FLOOR * 3:
                continue
            base = rate(sum(1 for w in have if w[f"fwd{h}"] > 0), len(have))
            low = [w for w in have if w[cat + "_net"] <= q1]
            high = [w for w in have if w[cat + "_net"] >= q4]
            cells = {"most short": rate(sum(1 for w in low if w[f"fwd{h}"] > 0), len(low)), "most long": rate(sum(1 for w in high if w[f"fwd{h}"] > 0), len(high))}
            chgs = sorted(w["chg_" + cat + "_net"] for w in weeks if "chg_" + cat + "_net" in w)
            cq1, cq4 = percentile(chgs, 0.2), percentile(chgs, 0.8)
            sold = [w for w in have if w.get("chg_" + cat + "_net") is not None and w["chg_" + cat + "_net"] <= cq1]
            bought = [w for w in have if w.get("chg_" + cat + "_net") is not None and w["chg_" + cat + "_net"] >= cq4]
            cells["sold hardest"] = rate(sum(1 for w in sold if w[f"fwd{h}"] > 0), len(sold))
            cells["bought hardest"] = rate(sum(1 for w in bought if w[f"fwd{h}"] > 0), len(bought))
            tests[f"{cat}|{h}"] = {"label": label, "horizon": h, "base": base, "cells": cells,
                                   "median": {k: round(percentile([w[f"fwd{h}"] for w in v], 0.5), 3) for k, v in (("most short", low), ("most long", high), ("sold hardest", sold), ("bought hardest", bought)) if v},
                                   "separated": {k: bool(separated(v, base)) for k, v in cells.items()}}

    series = [{"d": w["report_date"], "oi": w["open_interest"], **{c + "_net": w[c + "_net"] for c, _ in CATEGORIES}} for w in weeks]
    return {"available": True, "weeks": len(weeks), "first": weeks[0]["report_date"], "last": latest["report_date"],
            "latest": {"report_date": latest["report_date"], "open_interest": latest["open_interest"], "entry_date": first_tradeable(latest["report_date"]).isoformat()},
            "standing": standing, "tests": tests, "series": series, "horizons": HORIZONS, "floor": FLOOR}


def verdicts(d):
    if not d.get("available"):
        return [{"level": "info", "topic": "Positioning", "text": f"The positioning history holds {d.get('weeks', 0)} reports; it is written by the weekly sentiment run."}]
    V = []
    s = d["standing"]
    for cat in ("dealer", "lev", "asset"):
        c = s[cat]
        p = c["percentile"]["all"]
        where = "the most long it has been" if p >= 98 else "the most short it has been" if p <= 2 else f"the {p:.0f}th percentile of {d['weeks']:,} reports since {d['first'][:4]}"
        V.append({"level": "info", "topic": c["label"], "text": f"{c['label']} is net {c['net']:+,} contracts ({c['pct_oi']:+.1f}% of open interest), {where}. The week's change was {c['change']:+,}." if c["change"] is not None else f"{c['label']} is net {c['net']:+,} contracts, {where}."})
    for key, t in sorted(d["tests"].items()):
        cat = key.split("|")[0]
        if cat not in ("lev", "dealer"):
            continue
        hits = [k for k, v in t["separated"].items() if v]
        if hits:
            for k in hits:
                c = t["cells"][k]
                V.append({"level": "finding", "topic": f"{t['label']} — {t['horizon']} sessions", "text": f"When {t['label'].lower()} was {k}, SPY closed higher {t['horizon']} sessions later on {c['rate']}% of {c['n']} reports ({c['lo']}–{c['hi']}), against {t['base']['rate']}% for every report — the intervals do not overlap. Median return {t['median'].get(k)}%."})
        else:
            V.append({"level": "none", "topic": f"{t['label']} — {t['horizon']} sessions", "text": f"Neither extreme of {t['label'].lower()} positioning separates from the base rate of {t['base']['rate']}% over {t['base']['n']} reports. Positioning describes where money sat, not what came next."})
    return V


def main():
    conn = sqlite3.connect(DB_PATH)
    out = build(conn)
    conn.close()
    out["verdicts"] = verdicts(out)
    out.update(stamp(None))
    with open(OUTPUT, "w") as f:
        f.write("const COT_DATA = " + json.dumps(out, separators=(",", ":")) + ";\n")
    if out.get("available"):
        s = out["standing"]
        print(f"{OUTPUT}: {out['weeks']} reports {out['first']} → {out['last']}; dealer net {s['dealer']['net']:+,} ({s['dealer']['percentile']['all']:.0f}th pct), leveraged {s['lev']['net']:+,} ({s['lev']['percentile']['all']:.0f}th pct)")
        for v in out["verdicts"]:
            print(f"  [{v['level']:7s}] {v['text'][:130]}")
    else:
        print(f"{OUTPUT}: no positioning history yet")


if __name__ == "__main__":
    main()
