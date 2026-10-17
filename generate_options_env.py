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
from stats_helpers import delta_theta, percentile, wilson

ET = pytz.timezone("America/New_York")
DB_PATH = "spy_data.db"
OUTPUT = "options_env.js"
FLOOR = 30
FORWARD = 21
MEDIAN_ABS_NORMAL = 0.6745
SESSION_HOURS = 6.5
ATM_WITHIN = 1.0
HOUR_WINDOWS_FROM = 60
GRID_STRIKES = 7
GRID_MAX_DTE = 14
GRID_STALE_MULTIPLE = 3
GRID_BANDS = [25, 35, 50, 70]
SHORT_DTE = 5
SHORT_STRIKES = 2
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


def typical_hourly_move(conn, sessions=HOUR_WINDOWS_FROM):
    """Median dollars SPY travels in an hour, measured from the minute bars; None without them."""
    if not conn.execute("SELECT name FROM sqlite_master WHERE name='intraday_1m'").fetchone():
        return None
    days = [r[0] for r in conn.execute("SELECT DISTINCT date FROM intraday_1m ORDER BY date DESC LIMIT ?", (sessions,))]
    if not days:
        return None
    moves = []
    for d in days:
        p = [r[0] for r in conn.execute("SELECT close FROM intraday_1m WHERE date=? ORDER BY time", (d,))]
        moves += [abs(p[i + 60] - p[i]) for i in range(0, len(p) - 60, 15)]
    return percentile(moves, 0.5) if moves else None


def bs_price(spot, strike, iv, years, call):
    """Black-Scholes price at a zero rate; intrinsic value once there is no time left."""
    if years <= 0:
        return max(0.0, (spot - strike) if call else (strike - spot))
    rt = iv * math.sqrt(years)
    d1 = (math.log(spot / strike) + 0.5 * iv * iv * years) / rt
    nc = lambda x: 0.5 * (1 + math.erf(x / math.sqrt(2)))
    return spot * nc(d1) - strike * nc(d1 - rt) if call else strike * nc(rt - d1) - spot * nc(-d1)


def breakeven_move(spot, strike, iv, days, call, spread, hours=1.0):
    """Dollars SPY must travel in the held direction over `hours` for the contract to return its cost and its spread."""
    if days <= 0 or iv <= 0:
        return None
    target = bs_price(spot, strike, iv, days / 365.0, call) + spread
    later = (days - hours / SESSION_HOURS) / 365.0
    lo, hi = 0.0, spot * 0.1
    for _ in range(60):
        mid = (lo + hi) / 2
        if bs_price(spot + mid if call else spot - mid, strike, iv, later, call) < target:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def build_grid(crows, spot, session_date, hourly_dollars):
    """Break-even move for each expiry and strike a directional buyer would use: calls at and above spot, puts at and below."""
    atm = round(spot)
    live = []
    for expiry, cp, strike, bid, ask, iv, *_ in crows:
        if not iv or not bid or not ask or ask <= 0:
            continue
        off = int(round(strike - atm))
        days = (date.fromisoformat(expiry) - date.fromisoformat(session_date)).days
        if abs(off) > GRID_STRIKES or not 0 < days <= GRID_MAX_DTE:
            continue
        if (cp == "C" and off < 0) or (cp == "P" and off > 0):
            continue
        live.append({"days": days, "expiry": expiry, "off": off, "cp": cp, "strike": strike, "iv": iv, "spread": ask - bid})
    if not live:
        return None
    wide = {}
    for d in {x["days"] for x in live}:
        wide[d] = percentile([x["spread"] for x in live if x["days"] == d], 0.5) * GRID_STALE_MULTIPLE
    out = {"atm_strike": atm, "spot": round(spot, 2), "bands": GRID_BANDS, "max_strikes": GRID_STRIKES,
           "hourly_move_cents": round(hourly_dollars * 100) if hourly_dollars else None, "stale": 0}
    for side, cp, sign in (("calls", "C", 1), ("puts", "P", -1)):
        rows_out = []
        for d in sorted({x["days"] for x in live}):
            cells = []
            for n in range(GRID_STRIKES + 1):
                m = [x for x in live if x["days"] == d and x["cp"] == cp and x["off"] == n * sign]
                if not m or m[0]["spread"] > wide[d]:
                    out["stale"] += 1 if m else 0
                    cells.append(None)
                    continue
                x = m[0]
                be = breakeven_move(spot, x["strike"], x["iv"], d, cp == "C", x["spread"])
                cells.append(round(be * 100) if be is not None else None)
            if any(c is not None for c in cells):
                rows_out.append({"days": d, "expiry": [x["expiry"] for x in live if x["days"] == d][0], "cells": cells})
        out[side] = rows_out
    return out


def atm_by_expiry(grid):
    """The at-the-money break-even for each expiry, taken from the grid so one calculation serves the whole page."""
    if not grid:
        return None
    out = {}
    for side in ("calls", "puts"):
        for r in grid.get(side, []):
            if r["cells"] and r["cells"][0] is not None:
                out.setdefault(r["days"], []).append(r["cells"][0])
    return {d: round(percentile(v, 0.5)) for d, v in sorted(out.items()) if v}


def short_dated_summary(grid, hourly_dollars):
    """What the contracts a day trader uses actually cost: the median break-even near the money and close to expiry."""
    if not grid or not hourly_dollars:
        return None
    cells = [c for side in ("calls", "puts") for r in grid.get(side, [])
             if r["days"] <= SHORT_DTE for c in r["cells"][:SHORT_STRIKES + 1] if c is not None]
    if not cells:
        return None
    med = percentile(cells, 0.5)
    share = med / (hourly_dollars * 100) * 100
    return {"median_breakeven_cents": round(med), "share_of_hour_pct": round(share, 1),
            "band": next((i for i, b in enumerate(GRID_BANDS) if share <= b), len(GRID_BANDS)),
            "max_days": SHORT_DTE, "max_strikes": SHORT_STRIKES, "n": len(cells),
            "low_cents": min(cells), "high_cents": max(cells)}


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
    priced_pct = out["today"]["typical_move_priced_pct"]
    delivered_pct = out["today"]["delivered_daily_move_pct"]
    out["today"]["close"] = round(closes[-1], 2)
    out["today"]["priced_dollars"] = round(closes[-1] * priced_pct / 100, 2) if priced_pct else None
    out["today"]["delivered_dollars"] = round(closes[-1] * delivered_pct / 100, 2) if delivered_pct else None
    out["today"]["gap_dollars"] = round(closes[-1] * (priced_pct - delivered_pct) / 100, 2) if (priced_pct and delivered_pct) else None

    # the spread day by day over the window the verdict is measured against
    hist = []
    for i, d in enumerate(dates):
        if d < y3 or d not in vix or i < 21:
            continue
        tr = realized(closes[:i + 1], 20)
        if tr is None:
            continue
        hist.append({"d": d, "s": round(vix[d] - tr, 2), "i": round(vix[d], 2), "r": round(tr, 2)})
    out["history"] = {"days": hist,
                      "cheap_at_or_below": round(percentile(spreads_3y, 0.25), 2) if spreads_3y else None,
                      "expensive_at_or_above": round(percentile(spreads_3y, 0.75), 2) if spreads_3y else None}

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
            chain["captured_stamp"] = capture_stamp(latest)
    out["chain"] = chain
    hourly = typical_hourly_move(conn)
    out["grid"] = build_grid(crows, chain["spot"], crows[0][9], hourly) if (chain.get("available") and chain.get("spot")) else None
    be_by_dte = atm_by_expiry(out["grid"])
    near = min(be_by_dte) if be_by_dte else None
    out["cost_to_hold"] = {"typical_hourly_move_dollars": round(hourly, 2) if hourly else None,
                           "breakeven_cents_per_hour": be_by_dte, "nearest_expiry_days": near,
                           "session_hours": SESSION_HOURS}
    out["today"]["short_dated"] = short_dated_summary(out["grid"], hourly)
    be = (be_by_dte or {}).get(near)
    if hourly and be:
        out["cost_to_hold"]["share_of_hour_eaten_pct"] = round(be / (hourly * 100) * 100, 1)
    return out


def capture_stamp(iso):
    """The chain capture time as a reader sees dates: October 17, 2026 at 11:10 AM CT."""
    if not iso:
        return None
    try:
        t = datetime.fromisoformat(iso).astimezone(pytz.timezone("America/Chicago"))
    except ValueError:
        return None
    return f"{t.strftime('%B')} {t.day}, {t.year} at {t.strftime('%-I:%M %p')} CT"


def money(dollars, pct):
    """A dollar figure when the price was available, otherwise the percentage it would have come from."""
    return f"${dollars:.2f}" if dollars is not None else (f"{pct:.2f}%" if pct is not None else "an unmeasured amount")


def verdicts(o):
    V = []
    t = o["today"]; p = o["premium"]
    if p.get("2010_on"):
        b = p["2010_on"]
        V.append({"level": "finding", "topic": "How often the index charges more than SPY delivers", "text": f"On {b['overpriced']['rate']}% of {b['n']:,} sessions since 2010, the 30-day index was higher than the movement SPY went on to deliver over the following {FORWARD} sessions. Allowing for sample size, the true rate is between {b['overpriced']['lo']}% and {b['overpriced']['hi']}%. The middle case was {b['median_premium']:.2f} points too high: {b['median_implied']:.1f} charged against {b['median_realized_after']:.1f} delivered. A buyer of those contracts started that far behind."})
    if p.get("by_vix"):
        cells = {k: v for k, v in p["by_vix"].items() if v}
        if len(cells) >= 2:
            hi = max(cells.items(), key=lambda kv: kv[1]["median_premium"]); lo = min(cells.items(), key=lambda kv: kv[1]["median_premium"])
            V.append({"level": "finding", "topic": "Whether a high VIX makes contracts cheaper", "text": f"It does not. The index ran furthest above what SPY delivered when volatility was already high: {hi[1]['median_premium']:.2f} points too high with VIX {hi[0]} ({hi[1]['n']:,} sessions), against {lo[1]['median_premium']:.2f} points with VIX {lo[0]} ({lo[1]['n']:,} sessions). A high VIX is the most expensive state to buy in, not a discount."})
    if t.get("verdict"):
        V.append({"level": "finding", "topic": "Where today's reading sits", "text": f"The 30-day index is charging {t['implied_30d']:.2f} against the {t['realized_20d']:.2f} SPY actually delivered over the last 20 sessions, a difference of {t['spread']:.2f} points. That difference is wider than on {t['spread_percentile_3y']:.0f}% of the {len(o['history']['days']):,} sessions in the last three years. The index on its own is higher than on {t['implied_percentile_3y']:.0f}% of them."})
        V.append({"level": "info", "topic": "What the index prices a session to move", "text": f"At {t['implied_30d']:.2f}, the index prices a middle-of-the-road session at {t['typical_move_priced_pct']:.2f}%, which is {money(t['priced_dollars'], t['typical_move_priced_pct'])} at today's price of ${t['close']:.2f}. The middle session over the last 20 moved {t['delivered_daily_move_pct']:.2f}%, or {money(t['delivered_dollars'], t['delivered_daily_move_pct'])}. Measuring each session's high against its low instead of close against close, the last 20 ran at {t['realized_20d_high_low']:.2f}."})
    if t.get("term_shape") and o.get("term_structure", {}).get(t["term_shape"]):
        ts = o["term_structure"][t["term_shape"]]
        others = {k: v for k, v in o["term_structure"].items() if k != t["term_shape"]}
        cmp = "; ".join(f"{k}, {v['median_premium']:.2f} points too high over {v['n']:,} sessions" for k, v in others.items())
        V.append({"level": "finding", "topic": "Whether near and far expiries are priced differently", "text": f"Today they are {t['term_shape']}: 9-day {t['term'].get('vix9d')}, 30-day {t['term'].get('vix')}, 3-month {t['term'].get('vix3m')}. On the {ts['n']:,} past sessions with this same shape, the 30-day index ended up {ts['median_premium']:.2f} points above what SPY delivered over the following {FORWARD} sessions, which came in at {ts['median_realized_after']:.1f}. The other shapes: {cmp}."})
    if o.get("spread_predicts"):
        sp = o["spread_predicts"]
        gap = sp["top_quartile_median_premium"] - sp["bottom_quartile_median_premium"]
        V.append({"level": "none" if abs(gap) < 1.0 else "finding", "topic": "Whether today's difference predicts the next 21 sessions",
                  "headline": "Today's difference does not predict how far the index will run above delivered movement." if abs(gap) < 1.0 else "Today's difference predicts how far the index will run above delivered movement.",
                  "why": f"The widest quarter was followed by {sp['top_quartile_median_premium']:.2f} points, the narrowest by {sp['bottom_quartile_median_premium']:.2f} — {abs(gap):.2f} points apart.", "text": f"Sessions since 2010 were sorted by how wide the difference was that day and split into quarters. The widest quarter ({sp['n_top']:,} sessions) was followed by the index running {sp['top_quartile_median_premium']:.2f} points above delivered movement; the narrowest quarter ({sp['n_bottom']:,} sessions), {sp['bottom_quartile_median_premium']:.2f} points. " + ("Those are {:.2f} points apart, too close together to act on.".format(abs(gap)) if abs(gap) < 1.0 else "Those are {:.2f} points apart, a difference worth acting on.".format(abs(gap)))})
    w = o.get("weekly_range") or {}
    if w.get("n", 0) >= FLOOR:
        V.append({"level": "info", "topic": "Whether the weekly expected range holds", "text": f"The range is locked at each Friday's close and never revised. It has contained the whole of the following week on {w['held']['rate']}% of {w['n']} weeks; allowing for sample size, the true rate is between {w['held']['lo']}% and {w['held']['hi']}%. When price did break out, it ran a middle case of {w['median_overshoot_high']:.2f}% past the top, or {w['median_overshoot_low']:.2f}% past the bottom."})
    elif w.get("n"):
        V.append({"level": "info", "topic": "The weekly expected move", "text": f"{w['n']} scored weeks; the range record is reported at {FLOOR}."})
    c = o.get("chain") or {}
    if c.get("available") and c.get("buckets"):
        atm = c["buckets"].get("2 to 4|at the money") or c["buckets"].get("5 to 9|at the money")
        wide = max(c["buckets"].items(), key=lambda kv: kv[1]["median_spread_pct"])
        if atm:
            V.append({"level": "finding", "topic": "What it costs to get in and out", "text": f"From the chain captured {c.get('captured_stamp') or 'at the last run'}, an at-the-money contract 2 to 9 days from expiry cost {atm['median_spread_pct']:.1f}% of its own price to cross the bid-ask spread, measured across {atm['n']:,} contracts. The widest corner is contracts {wide[0].split('|')[0]} days from expiry and {wide[0].split('|')[1]} away from the current price, at {wide[1]['median_spread_pct']:.1f}%. That is the round-trip cost paid before the trade is right or wrong."})
    else:
        V.append({"level": "info", "topic": "The chain", "text": "Chain pricing appears once the option chain has been captured; capture runs with every pipeline run."})
    return V


def answer_rows(o):
    sd = o["today"].get("short_dated")
    lead = []
    if sd:
        word = ["cheap", "inexpensive", "fairly priced", "expensive", "very expensive"][sd["band"]]
        hourly = (o.get("cost_to_hold") or {}).get("typical_hourly_move_dollars")
        lead.append({"q": f"What does a {sd['max_days']}-day contract cost to hold?", "a": f"{word.capitalize()}, {sd['median_breakeven_cents']}c an hour",
                     "tone": "stop" if sd["band"] >= 3 else "go" if sd["band"] <= 1 else "info",
                     "why": f"At the money to {sd['max_strikes']} dollars out, {sd['max_days']} days to expiry or less, SPY has to travel a median {sd['median_breakeven_cents']} cents your way in an hour to cover decay and spread"
                            + (f", against a typical hour's {round(hourly * 100)} cents of travel." if hourly else ".")})
    return lead + _index_rows(o)


def _index_rows(o):
    """The page's questions, each as a short answer and the one figure behind it."""
    R = []
    t = o["today"]; p = o["premium"]
    if t.get("verdict"):
        a = {"expensive": "Expensive", "cheap": "Cheap", "ordinary": "Fairly priced"}[t["verdict"]]
        R.append({"q": "Is the 30-day index expensive?", "a": a, "tone": {"expensive": "stop", "cheap": "go"}.get(t["verdict"], "info"),
                  "why": f"The index prices a middle session at {money(t['priced_dollars'], t['typical_move_priced_pct'])} of movement; the last 20 sessions delivered {money(t['delivered_dollars'], t['delivered_daily_move_pct'])}. That difference is wider than on {t['spread_percentile_3y']:.0f}% of the last three years of sessions."})
    if t.get("typical_move_priced_pct") and t.get("delivered_daily_move_pct") is not None:
        ratio = t["delivered_daily_move_pct"] / t["typical_move_priced_pct"]
        a = "Much less than priced" if ratio < 0.6 else "Less than priced" if ratio < 0.85 else "More than priced" if ratio > 1.15 else "About as priced"
        R.append({"q": "Is SPY moving as much as the index is charging for?", "a": a, "tone": "info",
                  "why": f"The index prices a middle session to move {t['typical_move_priced_pct']:.2f}%, or {money(t['priced_dollars'], None)}. The middle session over the last 20 moved {t['delivered_daily_move_pct']:.2f}%, or {money(t['delivered_dollars'], None)}."})
    b = p.get("2010_on")
    if b:
        R.append({"q": "How often has the index charged more than SPY delivered?", "a": f"{b['overpriced']['rate']:.0f}% of sessions", "tone": "stop",
                  "why": f"Measured on {b['n']:,} sessions since 2010: the 30-day index against the movement SPY delivered over the following {FORWARD} sessions. The middle case was {b['median_premium']:.1f} points too high, which is about ${t['close'] * b['median_premium'] / 100 / (252 ** 0.5):.2f} of daily movement at today's price."})
    bv = {k: v for k, v in (p.get("by_vix") or {}).items() if v}
    if t.get("implied_30d") is not None and bv:
        now = next((k for k, lo, hi in VIX_BUCKETS if lo <= t["implied_30d"] < hi), None)
        lo_k = min(bv, key=lambda k: bv[k]["median_premium"]); hi_k = max(bv, key=lambda k: bv[k]["median_premium"])
        if now in bv:
            a = "The cheapest level to buy in" if now == lo_k else "The most expensive level to buy in" if now == hi_k else "A middle level"
            others = [k for k in (lo_k, hi_k) if k != now]
            R.append({"q": f"Does today's VIX of {t['implied_30d']:.2f} change that?", "a": a, "tone": "go" if now == lo_k else "stop" if now == hi_k else "info",
                      "why": f"With VIX {now}, the index has run {bv[now]['median_premium']:.2f} points above delivered movement across {bv[now]['n']:,} sessions" + "".join(f"; with VIX {k}, {bv[k]['median_premium']:.2f} points across {bv[k]['n']:,}" for k in others) + "."})
    ts = (o.get("term_structure") or {}).get(t.get("term_shape") or "")
    if t.get("term_shape"):
        shape = {"upward": "Upward, the normal shape", "flat": "Flat", "inverted": "Inverted, near-term fear"}[t["term_shape"]]
        tm = t.get("term") or {}
        R.append({"q": "Are near and far expiries priced differently?", "a": shape, "tone": "stop" if t["term_shape"] == "inverted" else "info",
                  "why": f"The index read at three lengths: 9-day {tm.get('vix9d')}, 30-day {tm.get('vix')}, 3-month {tm.get('vix3m')}." + (f" On the {ts['n']:,} past sessions shaped this way, the index ran {ts['median_premium']:.2f} points above what SPY then delivered." if ts else "")})
    c = o.get("chain") or {}
    if c.get("available") and c.get("buckets"):
        atm = c["buckets"].get("2 to 4|at the money") or c["buckets"].get("5 to 9|at the money")
        wide = max(c["buckets"].items(), key=lambda kv: kv[1]["median_spread_pct"])
        wd, wx = wide[0].split("|")
        wide_words = f"contracts {wd} days out, {wx if wx == 'at the money' else wx + ' from spot'}"
        if atm:
            R.append({"q": "What does it cost to get in and out?", "a": f"{atm['median_spread_pct']:.1f}% of the contract's price", "tone": "info",
                      "why": f"The bid-ask spread at the money, 2 to 9 days from expiry, across {atm['n']:,} contracts in the chain captured {c.get('captured_stamp') or 'at the last run'}. The widest corner is {wide_words}, at {wide[1]['median_spread_pct']:.1f}%."})
    else:
        R.append({"q": "What does it cost to get in and out?", "a": "No chain captured yet", "tone": "info", "why": "The bid-ask spread by strike and expiry appears once the option chain has been captured. Capture runs with every pipeline run."})
    w = o.get("weekly_range") or {}
    if w.get("n", 0) >= FLOOR:
        R.append({"q": "Does the weekly expected range hold?", "a": f"{w['held']['rate']:.0f}% of {w['n']} weeks", "tone": "info",
                  "why": f"The range is locked at each Friday's close and never revised. On the weeks it broke, price ran a middle case of {w['median_overshoot_high']:.2f}% past the top or {w['median_overshoot_low']:.2f}% past the bottom."})
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
