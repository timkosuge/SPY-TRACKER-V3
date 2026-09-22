"""Builds options_env.js: what optionality costs against what SPY actually delivers.

Four measures, each recomputed every run. The premium: the 30-day implied volatility against the realized volatility that
followed, by regime, with the current reading's percentile. The term structure: 9-day against 30-day against 3-month, and what
each shape has preceded. The chain: the spread paid at each distance from spot and days to expiry, once chains are captured.
The weekly expected move: how often the range held, and by how much it missed.
"""
import json
import math
import sqlite3
from datetime import date, datetime, timedelta

import pytz

from payload_meta import session_closed, stamp
from stats_helpers import percentile, wilson

ET = pytz.timezone("America/New_York")
DB_PATH = "spy_data.db"
OUTPUT = "options_env.js"
FLOOR = 30
FORWARD = 21
MEDIAN_ABS_NORMAL = 0.6745
VIX_BUCKETS = [("under 15", 0, 15), ("15 to 20", 15, 20), ("20 to 30", 20, 30), ("over 30", 30, 1e9)]


def rate(k, n):
    ci = wilson(k, n)
    return {"k": k, "n": n, "rate": round(k / n * 100, 1) if n else None, "lo": round(ci[0], 1) if ci else None, "hi": round(ci[1], 1) if ci else None}


def bucket(v, buckets):
    if v is None:
        return None
    for name, lo, hi in buckets:
        if lo <= v < hi:
            return name
    return None


def pct_rank(values, v):
    if v is None or not values:
        return None
    return round(sum(1 for x in values if x < v) / len(values) * 100, 1)


def realized(closes, window):
    """Annualized close-to-close volatility in percent, over the last `window` returns."""
    if len(closes) < window + 1:
        return None
    lr = [math.log(closes[i] / closes[i - 1]) for i in range(len(closes) - window, len(closes))]
    m = sum(lr) / len(lr)
    var = sum((x - m) ** 2 for x in lr) / (len(lr) - 1) if len(lr) > 1 else 0
    return math.sqrt(var) * math.sqrt(252) * 100


def build(conn):
    rows = [r for r in conn.execute("SELECT date, open, high, low, close FROM daily_ohlcv WHERE close IS NOT NULL AND high IS NOT NULL ORDER BY date") if session_closed(r[0])]
    closes = [r[4] for r in rows]
    dates = [r[0] for r in rows]
    idx = {d: i for i, d in enumerate(dates)}
    vix = {d: c for d, c in conn.execute("SELECT date, close FROM vix_daily WHERE close IS NOT NULL")} if conn.execute("SELECT name FROM sqlite_master WHERE name='vix_daily'").fetchone() else {}
    term = {d: {"vix9d": a, "vix": b, "vix3m": c, "vvix": v} for d, a, b, c, v in conn.execute("SELECT date, vix9d, vix, vix3m, vvix FROM vol_term_daily")} if conn.execute("SELECT name FROM sqlite_master WHERE name='vol_term_daily'").fetchone() else {}
    recs = []
    for i, d in enumerate(dates):
        if d not in vix or i < 21 or i + FORWARD >= len(dates):
            continue
        fwd = realized(closes[i:i + FORWARD + 1], FORWARD)
        trail = realized(closes[:i + 1], 20)
        if fwd is None or trail is None:
            continue
        recs.append({"date": d, "vix": vix[d], "fwd": fwd, "trail": trail, "premium": vix[d] - fwd, "spread": vix[d] - trail})
    last = date.fromisoformat(dates[-1])
    y3 = last.replace(year=last.year - 3).isoformat()
    out = {"as_of": dates[-1], "forward_sessions": FORWARD}

    def block(sub):
        if not sub:
            return None
        prem = [r["premium"] for r in sub]
        return {"n": len(sub), "median_premium": round(percentile(prem, 0.5), 2), "overpriced": rate(sum(1 for p in prem if p > 0), len(sub)),
                "median_implied": round(percentile([r["vix"] for r in sub], 0.5), 2), "median_realized_after": round(percentile([r["fwd"] for r in sub], 0.5), 2)}
    out["premium"] = {"all": block(recs), "2010_on": block([r for r in recs if r["date"] >= "2010-01-01"]), "3y": block([r for r in recs if r["date"] >= y3]),
                      "by_vix": {b: block([r for r in recs if r["date"] >= "2010-01-01" and bucket(r["vix"], VIX_BUCKETS) == b]) for b, _, _ in VIX_BUCKETS}}

    # today's reading: what is charged now against what has been delivered, and where that sits historically
    today_vix = vix.get(dates[-1]); today_trail = realized(closes, 20); today_trail5 = realized(closes, 5)
    hl = [math.log(r[2] / r[3]) for r in rows[-20:] if r[2] and r[3]]
    today_park = math.sqrt(sum(x * x for x in hl) / (4 * math.log(2) * len(hl))) * math.sqrt(252) * 100 if hl else None
    spreads_3y = [r["spread"] for r in recs if r["date"] >= y3]
    vix_3y = [r["vix"] for r in recs if r["date"] >= y3]
    t = term.get(dates[-1], {})
    shape = None
    if t.get("vix9d") and t.get("vix") and t.get("vix3m"):
        shape = "inverted" if t["vix9d"] > t["vix3m"] else "flat" if abs(t["vix3m"] - t["vix9d"]) < 1.0 else "upward"
    today_spread = (today_vix - today_trail) if (today_vix is not None and today_trail is not None) else None
    verdict = None
    if today_spread is not None and spreads_3y:
        p = pct_rank(spreads_3y, today_spread)
        verdict = "expensive" if p >= 75 else "cheap" if p <= 25 else "ordinary"
    out["today"] = {"implied_30d": round(today_vix, 2) if today_vix else None, "realized_20d": round(today_trail, 2) if today_trail else None,
                    "realized_5d": round(today_trail5, 2) if today_trail5 else None, "realized_20d_high_low": round(today_park, 2) if today_park else None,
                    "spread": round(today_spread, 2) if today_spread is not None else None, "spread_percentile_3y": pct_rank(spreads_3y, today_spread),
                    "implied_percentile_3y": pct_rank(vix_3y, today_vix), "verdict": verdict,
                    "term": {k: (round(v, 2) if v is not None else None) for k, v in t.items()}, "term_shape": shape,
                    "expected_daily_move_pct": round(today_vix / math.sqrt(252), 3) if today_vix else None,
                    "typical_move_priced_pct": round(today_vix / math.sqrt(252) * MEDIAN_ABS_NORMAL, 3) if today_vix else None,
                    "delivered_daily_move_pct": round(percentile([abs(closes[i] / closes[i - 1] - 1) * 100 for i in range(len(closes) - 20, len(closes))], 0.5), 3)}

    # does the spread at decision time say anything about the premium that follows
    sub = [r for r in recs if r["date"] >= "2010-01-01"]
    if sub:
        sp = sorted(r["spread"] for r in sub); q1, q3 = percentile(sp, 0.25), percentile(sp, 0.75)
        hi = [r["premium"] for r in sub if r["spread"] >= q3]; lo = [r["premium"] for r in sub if r["spread"] <= q1]
        out["spread_predicts"] = {"top_quartile_median_premium": round(percentile(hi, 0.5), 2), "bottom_quartile_median_premium": round(percentile(lo, 0.5), 2), "n_top": len(hi), "n_bottom": len(lo)}

    # term structure: what each shape has preceded
    shapes = {}
    for r in recs:
        tt = term.get(r["date"])
        if not tt or not tt.get("vix9d") or not tt.get("vix3m"):
            continue
        sh = "inverted" if tt["vix9d"] > tt["vix3m"] else "flat" if abs(tt["vix3m"] - tt["vix9d"]) < 1.0 else "upward"
        shapes.setdefault(sh, []).append(r)
    out["term_structure"] = {sh: {"n": len(v), "median_premium": round(percentile([x["premium"] for x in v], 0.5), 2), "overpriced": rate(sum(1 for x in v if x["premium"] > 0), len(v)),
                                  "median_realized_after": round(percentile([x["fwd"] for x in v], 0.5), 2)} for sh, v in shapes.items() if len(v) >= FLOOR}

    # the weekly expected move's own record
    wem = conn.execute("SELECT week_start, static_wem_high, static_wem_low, week_high, week_low, week_close, static_band_status FROM weekly_em WHERE static_wem_high IS NOT NULL AND week_high IS NOT NULL ORDER BY week_start").fetchall()
    inside = sum(1 for w in wem if w[3] <= w[1] and w[4] >= w[2])
    over = [(w[3] - w[1]) / w[1] * 100 for w in wem if w[3] > w[1]]
    under = [(w[2] - w[4]) / w[2] * 100 for w in wem if w[4] < w[2]]
    out["weekly_range"] = {"n": len(wem), "held": rate(inside, len(wem)),
                           "median_overshoot_high": round(percentile(over, 0.5), 3) if over else None, "median_overshoot_low": round(percentile(under, 0.5), 3) if under else None,
                           "first": wem[0][0] if wem else None, "last": wem[-1][0] if wem else None}

    # the chain itself, once captured
    chain = {"available": False}
    if conn.execute("SELECT name FROM sqlite_master WHERE name='option_chain'").fetchone():
        n = conn.execute("SELECT COUNT(*) FROM option_chain").fetchone()[0]
        if n:
            latest = conn.execute("SELECT MAX(captured_at) FROM option_chain").fetchone()[0]
            crows = conn.execute("SELECT expiry, cp, strike, bid, ask, iv, open_interest, volume, spot, session_date FROM option_chain WHERE captured_at=?", (latest,)).fetchall()
            spot = crows[0][8] if crows else None
            buckets = {}
            for expiry, cp, strike, bid, ask, iv, oi, vol, sp, sd in crows:
                if not bid or not ask or ask <= 0:
                    continue
                dte = (date.fromisoformat(expiry) - date.fromisoformat(sd)).days
                dteb = "0 to 1" if dte <= 1 else "2 to 4" if dte <= 4 else "5 to 9" if dte <= 9 else "10 to 30" if dte <= 30 else "over 30"
                dist = abs(strike - sp) / sp * 100
                db = "at the money" if dist <= 0.5 else "within 1%" if dist <= 1 else "1 to 2%" if dist <= 2 else "2 to 4%" if dist <= 4 else "over 4%"
                key = f"{dteb}|{db}"
                buckets.setdefault(key, []).append({"spread_pct": (ask - bid) / ((ask + bid) / 2) * 100, "mid": (ask + bid) / 2, "iv": iv, "oi": oi or 0, "vol": vol or 0})
            chain = {"available": True, "rows": n, "captured_at": latest, "spot": spot, "sessions": conn.execute("SELECT COUNT(DISTINCT session_date) FROM option_chain").fetchone()[0],
                     "buckets": {k: {"n": len(v), "median_spread_pct": round(percentile([x["spread_pct"] for x in v], 0.5), 1), "median_mid": round(percentile([x["mid"] for x in v], 0.5), 2),
                                     "median_iv": round(percentile([x["iv"] for x in v if x["iv"]], 0.5) * 100, 1) if any(x["iv"] for x in v) else None,
                                     "median_open_interest": round(percentile([x["oi"] for x in v], 0.5))} for k, v in sorted(buckets.items()) if len(v) >= 5}}
    out["chain"] = chain
    return out


def verdicts(o):
    V = []
    t = o["today"]; p = o["premium"]
    if p.get("2010_on"):
        b = p["2010_on"]
        V.append({"level": "finding", "topic": "What optionality costs", "text": f"Thirty-day implied volatility has exceeded the volatility that followed on {b['overpriced']['rate']}% of {b['n']:,} sessions since 2010 ({b['overpriced']['lo']}–{b['overpriced']['hi']}), by a median of {b['median_premium']:+.2f} points: {b['median_implied']:.1f} charged against {b['median_realized_after']:.1f} delivered. Buying premium starts behind by that much on a typical day."})
    if p.get("by_vix"):
        cells = {k: v for k, v in p["by_vix"].items() if v}
        if len(cells) >= 2:
            hi = max(cells.items(), key=lambda kv: kv[1]["median_premium"]); lo = min(cells.items(), key=lambda kv: kv[1]["median_premium"])
            V.append({"level": "finding", "topic": "The premium by regime", "text": f"The overcharge is largest when volatility is already high: a median {hi[1]['median_premium']:+.2f} points with VIX {hi[0]} against {lo[1]['median_premium']:+.2f} with VIX {lo[0]}. High volatility is not a discount for a buyer; it is the most expensive state."})
    if t.get("verdict"):
        V.append({"level": "finding", "topic": "Where today sits", "text": f"Contracts are {t['verdict']} right now: 30-day implied {t['implied_30d']:.2f} against {t['realized_20d']:.2f} realized over the last 20 sessions — a spread of {t['spread']:+.2f} points, the {t['spread_percentile_3y']:.0f}th percentile of the last three years. Implied volatility itself is at the {t['implied_percentile_3y']:.0f}th percentile."})
        V.append({"level": "info", "topic": "What is priced against what moves", "text": f"At {t['implied_30d']:.2f} implied, the typical session is priced to move {t['typical_move_priced_pct']:.2f}% (one standard deviation is {t['expected_daily_move_pct']:.2f}%); the typical session over the last 20 moved {t['delivered_daily_move_pct']:.2f}%. Measured on highs and lows rather than closes, the last 20 sessions ran at {t['realized_20d_high_low']:.2f}."})
    if t.get("term_shape") and o.get("term_structure", {}).get(t["term_shape"]):
        ts = o["term_structure"][t["term_shape"]]
        others = {k: v for k, v in o["term_structure"].items() if k != t["term_shape"]}
        cmp = "; ".join(f"{k}: {v['median_premium']:+.2f} over {v['n']:,}" for k, v in others.items())
        V.append({"level": "finding", "topic": "Term structure", "text": f"The curve is {t['term_shape']} today — 9-day {t['term'].get('vix9d')}, 30-day {t['term'].get('vix')}, 3-month {t['term'].get('vix3m')}. That shape has been followed by a median premium of {ts['median_premium']:+.2f} points over {ts['n']:,} sessions, with realized volatility of {ts['median_realized_after']:.1f} after. Other shapes: {cmp}."})
    if o.get("spread_predicts"):
        sp = o["spread_predicts"]
        gap = sp["top_quartile_median_premium"] - sp["bottom_quartile_median_premium"]
        V.append({"level": "none" if abs(gap) < 1.0 else "finding", "topic": "Does today's spread predict tomorrow's",
                  "headline": "Today's gap does not predict the overcharge that follows." if abs(gap) < 1.0 else "Today's gap predicts the overcharge that follows.",
                  "why": f"Widest gaps were followed by {sp['top_quartile_median_premium']:+.2f} points, narrowest by {sp['bottom_quartile_median_premium']:+.2f}.", "text": f"When implied ran furthest above trailing realized, the premium that followed was a median {sp['top_quartile_median_premium']:+.2f} points ({sp['n_top']:,} sessions); when it ran closest, {sp['bottom_quartile_median_premium']:+.2f} ({sp['n_bottom']:,}). " + ("The spread you can see does not tell you much about the overcharge that follows." if abs(gap) < 1.0 else "The spread carries information about the premium that follows.")})
    w = o.get("weekly_range") or {}
    if w.get("n", 0) >= FLOOR:
        V.append({"level": "info", "topic": "The weekly expected move", "text": f"The static weekly range has held on {w['held']['rate']}% of {w['n']} weeks ({w['held']['lo']}–{w['held']['hi']}). When it broke high the median overshoot was {w['median_overshoot_high']:.2f}%; low, {w['median_overshoot_low']:.2f}%."})
    elif w.get("n"):
        V.append({"level": "info", "topic": "The weekly expected move", "text": f"{w['n']} scored weeks; the range record is reported at {FLOOR}."})
    c = o.get("chain") or {}
    if c.get("available") and c.get("buckets"):
        atm = c["buckets"].get("2 to 4|at the money") or c["buckets"].get("5 to 9|at the money")
        wide = max(c["buckets"].items(), key=lambda kv: kv[1]["median_spread_pct"])
        if atm:
            V.append({"level": "finding", "topic": "What the chain charges to trade", "text": f"At the last capture, an at-the-money contract 2 to 9 days out cost a median {atm['median_spread_pct']:.1f}% of its own price to cross the spread. The widest corner of the chain is {wide[0].replace('|', ', ')} at {wide[1]['median_spread_pct']:.1f}% — that is the round-trip cost before the trade is right or wrong."})
    else:
        V.append({"level": "info", "topic": "The chain", "text": "Chain pricing appears once the option chain has been captured; capture runs with every pipeline run."})
    return V


def answer_rows(o):
    """The page's questions, each as a short answer and the one figure behind it."""
    R = []
    t = o["today"]; p = o["premium"]
    if t.get("verdict"):
        a = {"expensive": "Expensive", "cheap": "Cheap", "ordinary": "Fairly priced"}[t["verdict"]]
        R.append({"q": "Are contracts expensive right now?", "a": a, "tone": {"expensive": "stop", "cheap": "go"}.get(t["verdict"], "info"),
                  "why": f"The market charges {t['implied_30d']:.2f} for the next 30 days; the last 20 sessions delivered {t['realized_20d']:.2f}. That gap of {t['spread']:+.2f} sits at the {t['spread_percentile_3y']:.0f}th percentile of the last three years."})
    if t.get("typical_move_priced_pct") and t.get("delivered_daily_move_pct") is not None:
        ratio = t["delivered_daily_move_pct"] / t["typical_move_priced_pct"]
        a = "Much less than priced" if ratio < 0.6 else "Less than priced" if ratio < 0.85 else "More than priced" if ratio > 1.15 else "About as priced"
        R.append({"q": "Is SPY moving a lot?", "a": a, "tone": "info",
                  "why": f"Options price the typical session to move {t['typical_move_priced_pct']:.2f}%; the typical session over the last 20 moved {t['delivered_daily_move_pct']:.2f}%."})
    b = p.get("2010_on")
    if b:
        R.append({"q": "What does a buyer start against?", "a": f"About {b['median_premium']:.1f} points of overcharge", "tone": "stop",
                  "why": f"Since 2010, implied volatility was higher than the volatility that followed on {b['overcharged' if 'overcharged' in b else 'overpriced']['rate']:.0f}% of {b['n']:,} sessions."})
    bv = {k: v for k, v in (p.get("by_vix") or {}).items() if v}
    if t.get("implied_30d") is not None and bv:
        now = next((k for k, lo, hi in VIX_BUCKETS if lo <= t["implied_30d"] < hi), None)
        lo_k = min(bv, key=lambda k: bv[k]["median_premium"]); hi_k = max(bv, key=lambda k: bv[k]["median_premium"])
        if now in bv:
            a = "The least overcharged regime" if now == lo_k else "The most overcharged regime" if now == hi_k else "A middle regime"
            others = [k for k in (lo_k, hi_k) if k != now]
            R.append({"q": f"Does VIX {now} change that?", "a": a, "tone": "go" if now == lo_k else "stop" if now == hi_k else "info",
                      "why": f"The overcharge has been {bv[now]['median_premium']:+.2f} points with VIX {now}" + "".join(f", against {bv[k]['median_premium']:+.2f} with VIX {k}" for k in others) + "."})
    ts = (o.get("term_structure") or {}).get(t.get("term_shape") or "")
    if t.get("term_shape"):
        shape = {"upward": "Upward, the normal shape", "flat": "Flat", "inverted": "Inverted, near-term fear"}[t["term_shape"]]
        tm = t.get("term") or {}
        R.append({"q": "What is the volatility curve saying?", "a": shape, "tone": "stop" if t["term_shape"] == "inverted" else "info",
                  "why": f"9-day {tm.get('vix9d')}, 30-day {tm.get('vix')}, 3-month {tm.get('vix3m')}." + (f" After this shape the overcharge has been {ts['median_premium']:+.2f} points." if ts else "")})
    c = o.get("chain") or {}
    if c.get("available") and c.get("buckets"):
        atm = c["buckets"].get("2 to 4|at the money") or c["buckets"].get("5 to 9|at the money")
        wide = max(c["buckets"].items(), key=lambda kv: kv[1]["median_spread_pct"])
        wd, wx = wide[0].split("|")
        wide_words = f"contracts {wd} days out, {wx if wx == 'at the money' else wx + ' from spot'}"
        if atm:
            R.append({"q": "What does it cost to trade?", "a": f"{atm['median_spread_pct']:.1f}% at the money", "tone": "info",
                      "why": f"The bid-ask spread as a share of the contract's price, 2 to 9 days out. The most expensive to cross is {wide_words}, at {wide[1]['median_spread_pct']:.1f}%."})
    else:
        R.append({"q": "What does it cost to trade?", "a": "No chain captured yet", "tone": "info", "why": "The bid-ask spread by strike and expiry appears once the option chain has been captured."})
    w = o.get("weekly_range") or {}
    if w.get("n", 0) >= FLOOR:
        R.append({"q": "Does the weekly expected move hold?", "a": f"{w['held']['rate']:.0f}% of weeks", "tone": "info",
                  "why": f"Over {w['n']} weeks. When it broke, price ran a median {w['median_overshoot_high']:.2f}% past the top or {w['median_overshoot_low']:.2f}% past the bottom."})
    return R


def main():
    conn = sqlite3.connect(DB_PATH)
    out = build(conn)
    conn.close()
    out["verdicts"] = verdicts(out)
    out["rows"] = answer_rows(out)
    out["floor"] = FLOOR
    out.update(stamp(None))
    with open(OUTPUT, "w") as f:
        f.write("const OPTIONS_ENV = " + json.dumps(out, separators=(",", ":")) + ";\n")
    print(f"{OUTPUT}: verdict {out['today'].get('verdict')}, implied {out['today'].get('implied_30d')} vs realized {out['today'].get('realized_20d')}, {len(out['verdicts'])} verdicts")
    for v in out["verdicts"]:
        print(f"  [{v['level']:7s}] {v['topic']}: {v['text'][:140]}")


if __name__ == "__main__":
    main()
