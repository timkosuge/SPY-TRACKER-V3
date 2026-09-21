"""Scores every strategy in strategies.json on every session that met its entry, and writes strategies_data.js.

A day-trade record holds the percent from the 9:00 CT price at each exit time, the best and worst points on each side and
when they came, and every target/stop outcome. A hold record holds the same from the next open through each close. Where the
option chain was captured at entry and exit, the contract that made the most from ask to bid is recorded as measured.
"""
import json
import sqlite3
from datetime import date, datetime, timedelta

import pytz

from payload_meta import stamp
from stats_helpers import percentile, wilson
from generate_range_filter import DD_BUCKETS, VIX_BUCKETS, bucket, classify, daily_rows, quartiles, vix_closes, year_before

ET = pytz.timezone("America/New_York")
DB_PATH = "spy_data.db"
OUTPUT = "strategies_data.js"
FLOOR = 30
ENTRY_BAR = "10:00"
OR_MINUTES = 30


def load_registry():
    with open("strategies.json") as f:
        return json.load(f)


def rate(k, n):
    ci = wilson(k, n)
    return {"k": k, "n": n, "rate": round(k / n * 100, 1) if n else None, "lo": round(ci[0], 1) if ci else None, "hi": round(ci[1], 1) if ci else None}


def session_context(rows, vix, day_q):
    """Per session date: yesterday's class, the VIX bucket and drawdown bucket at yesterday's close."""
    closes = [r[4] for r in rows]
    ctx = {}
    for i in range(1, len(rows)):
        pd_ = rows[i - 1]
        rp = (pd_[2] - pd_[3]) / pd_[4] * 100
        hi20 = max(closes[max(0, i - 20):i])
        ctx[rows[i][0]] = {"prior_class": classify(rp, day_q), "vix": vix.get(pd_[0]), "vix_bucket": bucket(vix.get(pd_[0]), VIX_BUCKETS),
                           "dd": (closes[i - 1] / hi20 - 1) * 100, "dd_bucket": bucket((closes[i - 1] / hi20 - 1) * 100, DD_BUCKETS)}
    return ctx


CONDS = {
    "prior_wide": lambda c: c["prior_class"] == "wide", "prior_middle": lambda c: c["prior_class"] == "middle", "prior_narrow": lambda c: c["prior_class"] == "narrow",
    "or_wide": lambda c: c.get("or_class") == "wide", "or_middle": lambda c: c.get("or_class") == "middle", "or_narrow": lambda c: c.get("or_class") == "narrow",
    "vix_under_15": lambda c: c["vix"] is not None and c["vix"] < 15, "vix_15_20": lambda c: c["vix"] is not None and 15 <= c["vix"] < 20,
    "vix_20_30": lambda c: c["vix"] is not None and 20 <= c["vix"] < 30, "vix_over_30": lambda c: c["vix"] is not None and c["vix"] >= 30, "vix_over_20": lambda c: c["vix"] is not None and c["vix"] >= 20,
    "dd_over_5": lambda c: c["dd"] is not None and c["dd"] < -5, "dd_2_5": lambda c: c["dd"] is not None and -5 <= c["dd"] < -2, "dd_within_2": lambda c: c["dd"] is not None and c["dd"] >= -2,
}


def intraday_paths(conn, exits):
    """Per session with bars: OR percent, and the path from the 10:00 ET open."""
    if not conn.execute("SELECT name FROM sqlite_master WHERE name='intraday_bars'").fetchone():
        return {}
    out = {}
    for (d,) in conn.execute("SELECT date FROM intraday_bars GROUP BY date HAVING COUNT(*) >= 380"):
        bars = conn.execute("SELECT timestamp, open, high, low, close FROM intraday_bars WHERE date=? AND high IS NOT NULL AND low IS NOT NULL ORDER BY timestamp", (d,)).fetchall()
        ts = {b[0]: b for b in bars}
        if ENTRY_BAR not in ts:
            continue
        orb = bars[:OR_MINUTES]
        o0 = orb[0][1] or orb[0][4]
        entry = ts[ENTRY_BAR][1] or ts[ENTRY_BAR][4]
        rest = [b for b in bars if b[0] >= ENTRY_BAR]
        up_path, dn_path, hi, lo = [], [], -1e9, 1e9
        first_hit = {}
        for i, b in enumerate(rest):
            hi = max(hi, b[2]); lo = min(lo, b[3])
            for th in (0.3, 0.5, 0.75, 1.0):
                for side, moved in (("up", (b[2] - entry) / entry * 100), ("down", (entry - b[3]) / entry * 100)):
                    if moved >= th and (side, th) not in first_hit:
                        first_hit[(side, th)] = i
        peak_up = max(range(len(rest)), key=lambda i: rest[i][2]); peak_dn = min(range(len(rest)), key=lambda i: rest[i][3])
        out[d] = {"or_pct": (max(b[2] for b in orb) - min(b[3] for b in orb)) / o0 * 100, "entry": entry,
                  "exits": {e["id"]: round(((ts[e["bar"]][4] if e["bar"] in ts else rest[-1][4]) - entry) / entry * 100, 4) for e in exits},
                  "mfe_up": round((hi - entry) / entry * 100, 4), "mfe_down": round((entry - lo) / entry * 100, 4),
                  "peak_up_min": peak_up, "peak_down_min": peak_dn,
                  "first_hit": {f"{s}_{th}": i for (s, th), i in first_hit.items()}}
    return out


def stop_target_outcome(path, side, target, stop):
    """Which came first from the entry on that side: the target, the stop, or neither (then the close decides)."""
    hits = path["first_hit"]
    t = hits.get(f"{side}_{target}")
    other = "down" if side == "up" else "up"
    s = None
    for th in (0.3, 0.5, 0.75, 1.0):
        if th >= stop and f"{other}_{th}" in hits:
            s = hits[f"{other}_{th}"] if s is None else min(s, hits[f"{other}_{th}"])
    if t is not None and (s is None or t < s):
        return "target"
    if s is not None:
        return "stop"
    return "close"


def option_best(conn, session_date, exit_bar_et, min_dte):
    """The contract that made the most from the entry capture's ask to the exit capture's bid, DTE at or above min_dte."""
    if not conn.execute("SELECT name FROM sqlite_master WHERE name='option_chain'").fetchone():
        return None
    caps = [r[0] for r in conn.execute("SELECT DISTINCT captured_at FROM option_chain WHERE session_date=? ORDER BY captured_at", (session_date,))]
    if len(caps) < 2:
        return None
    def nearest(hhmm):
        target = datetime.fromisoformat(f"{session_date}T{hhmm}:00")
        best = min(caps, key=lambda c: abs((datetime.fromisoformat(c).replace(tzinfo=None) - target).total_seconds()))
        return best if abs((datetime.fromisoformat(best).replace(tzinfo=None) - target).total_seconds()) <= 25 * 60 else None
    c_in, c_out = nearest(ENTRY_BAR), nearest(exit_bar_et)
    if not c_in or not c_out or c_in == c_out:
        return None
    min_exp = (date.fromisoformat(session_date) + timedelta(days=min_dte)).isoformat()
    rows = conn.execute("""SELECT a.expiry, a.cp, a.strike, a.ask, b.bid FROM option_chain a JOIN option_chain b
                           ON a.expiry=b.expiry AND a.cp=b.cp AND a.strike=b.strike AND b.captured_at=?
                           WHERE a.captured_at=? AND a.expiry>=? AND a.ask>0 AND b.bid>0""", (c_out, c_in, min_exp)).fetchall()
    if not rows:
        return None
    best = max(rows, key=lambda r: r[4] / r[3])
    return {"expiry": best[0], "cp": best[1], "strike": best[2], "entry_ask": best[3], "exit_bid": best[4], "return_pct": round((best[4] / best[3] - 1) * 100, 1), "contracts_compared": len(rows), "entry_capture": c_in, "exit_capture": c_out}


def separated(a, b):
    """Two rates whose 95% intervals do not overlap."""
    return a and b and a["n"] and b["n"] and a["lo"] is not None and b["lo"] is not None and (a["lo"] > b["hi"] or b["lo"] > a["hi"])


def analyze(results, reg, exits_a):
    """Nightly findings: each one a sentence with the numbers behind it, produced only when the evidence supports it."""
    F = []
    byid = {r["id"]: r for r in results}
    exit_labels = {e["id"]: e["label"] for e in exits_a}
    floor = FLOOR
    TH = lambda st: "0.75" if st["mode"] == "A" else "1.5"
    WORDS = {"prior_wide": "a wide day", "prior_narrow": "a narrow day", "prior_middle": "a middle day", "or_wide": "a wide opening range", "or_narrow": "a narrow opening range", "vix_under_15": "VIX under 15", "vix_15_20": "VIX 15 to 20", "vix_20_30": "VIX 20 to 30", "vix_over_30": "VIX over 30", "vix_over_20": "VIX over 20", "dd_over_5": "more than 5% below the 20-session high", "dd_2_5": "2 to 5% below the 20-session high", "dd_within_2": "within 2% of the 20-session high"}
    words = lambda names: " and ".join(WORDS.get(n, n) for n in names)
    big = lambda tr, st: max(tr["mfe_up"], tr["mfe_down"]) >= float(TH(st))
    for st in results:
        ctrl = byid.get("A0" if st["mode"] == "A" else "B0")
        if st["id"] in ("A0", "B0") or not ctrl:
            continue
        if st["n"] < floor:
            F.append({"strategy": st["id"], "level": "none", "text": f"{st['id']} has {st['n']} trades; nothing is scored below {floor}."})
            continue
        # 1 magnitude against the control
        th = TH(st); e, c = st["either_side"][th], ctrl["either_side"][th]
        if separated(e, c):
            F.append({"strategy": st["id"], "level": "finding", "text": f"{st['id']} reaches a {th}% move on {e['rate']}% of {e['n']} trades ({e['lo']}–{e['hi']}) against {c['rate']}% when taken every session — the intervals do not overlap."})
        else:
            F.append({"strategy": st["id"], "level": "none", "text": f"{st['id']} does not separate from the every-session control on size of move: {e['rate']}% ({e['lo']}–{e['hi']}) against {c['rate']}%."})
        # 2 direction against the control, at the best exit
        best_exit, best_val = None, None
        for eid, ag in st["exits"].items():
            if ag["n"] >= floor and (best_val is None or ag["long"]["rate"] > best_val):
                best_exit, best_val = eid, ag["long"]["rate"]
        if best_exit:
            L, CL = st["exits"][best_exit]["long"], ctrl["exits"].get(best_exit, {}).get("long")
            lab = exit_labels.get(best_exit, f"day {best_exit}")
            if CL and separated(L, CL):
                F.append({"strategy": st["id"], "level": "finding", "text": f"Long {st['id']} exited at {lab} closed above entry on {L['rate']}% of {L['n']} trades ({L['lo']}–{L['hi']}) against {CL['rate']}% for every session — a directional difference the intervals support. Read it against the sample's own drift: this is the period the record covers, not a law."})
            elif CL:
                F.append({"strategy": st["id"], "level": "none", "text": f"Direction: long {st['id']} at its best exit ({lab}) wins {L['rate']}% ({L['lo']}–{L['hi']}) against {CL['rate']}% for every session — not separated. The filter still says nothing about which way."})
        # 3 best exit by expectancy on the target/stop grid, long and short
        if st["mode"] == "A" and st.get("target_stop"):
            for side, word in (("up", "long"), ("down", "short")):
                cells = {k: v for k, v in st["target_stop"].items() if k.startswith(side + "_") and v["n"] >= floor}
                if not cells:
                    continue
                k, v = max(cells.items(), key=lambda kv: kv[1]["expectancy_pct"])
                _, t, sp = k.split("_")
                ck = ctrl["target_stop"].get(k)
                ctext = f"; every session under the same rule: {ck['expectancy_pct']:+.3f}%" if ck else ""
                lvl = "finding" if v["expectancy_pct"] > 0 and (not ck or v["expectancy_pct"] > ck["expectancy_pct"] + 0.05) else "none"
                F.append({"strategy": st["id"], "level": lvl, "text": f"Best {word} rule for {st['id']}: target +{t}%, stop −{sp}% — expectancy {v['expectancy_pct']:+.3f}% per trade, win rate {v['win']['rate']}% (breakeven {v['breakeven_win_rate']}%), {v['target']} targets / {v['stop']} stops / {v['close']} closes{ctext}."})
            short_neg = all(v["expectancy_pct"] <= 0 for k, v in st["target_stop"].items() if k.startswith("down_") and v["n"] >= floor)
            if short_neg and any(k.startswith("down_") and v["n"] >= floor for k, v in st["target_stop"].items()):
                F.append({"strategy": st["id"], "level": "caution", "text": f"Every short rule on {st['id']} has zero or negative expectancy on this record."})
        # 4 timing: when the best move lands
        if st["mode"] == "A" and st.get("peak_min_median") is not None:
            m = st["peak_min_median"]; t = 8 * 60 + 30 + m
            F.append({"strategy": st["id"], "level": "info", "text": f"{st['id']}: the day's best move landed at a median of {t // 60}:{t % 60:02d} CT."})
        # 5 decay: first half of the record against the second
        rec_vals = [max(tr["mfe_up"], tr["mfe_down"]) >= 0.75 for tr in st.get("_trades", [])]
        # 6 regime inside the strategy
        if st.get("_trades"):
            by_b = {}
            for tr in st["_trades"]:
                by_b.setdefault(tr["vix_bucket"], []).append(big(tr, st))
            cells = {b: rate(sum(v), len(v)) for b, v in by_b.items() if b and len(v) >= floor}
            if len(cells) >= 2:
                hi_b, hi_r = max(cells.items(), key=lambda kv: kv[1]["rate"]); lo_b, lo_r = min(cells.items(), key=lambda kv: kv[1]["rate"])
                if separated(hi_r, lo_r):
                    F.append({"strategy": st["id"], "level": "finding", "text": f"{st['id']} depends on the regime: {TH(st)}% moves on {hi_r['rate']}% of trades with VIX {hi_b} against {lo_r['rate']}% with VIX {lo_b} — a condition worth adding to the entry."})
            h = len(st["_trades"]) // 2
            if h >= floor:
                a = st["_trades"][:h]; b = st["_trades"][h:]
                ra = rate(sum(1 for tr in a if big(tr, st)), len(a)); rb = rate(sum(1 for tr in b if big(tr, st)), len(b))
                if separated(ra, rb):
                    F.append({"strategy": st["id"], "level": "caution", "text": f"{st['id']} is not stable across its own record: {TH(st)}% moves on {ra['rate']}% of the first {len(a)} trades and {rb['rate']}% of the last {len(b)}."})
            last20 = st["_trades"][-20:]
            if len(last20) == 20 and st["n"] >= 60:
                r20 = rate(sum(1 for tr in last20 if big(tr, st)), 20)
                if r20["hi"] < st["either_side"][TH(st)]["rate"]:
                    F.append({"strategy": st["id"], "level": "caution", "text": f"{st['id']}'s last 20 trades ran at {r20['rate']}% against its record of {st['either_side'][TH(st)]['rate']}% — below the interval; watch it."})
    # 7 redundant conditions: a strategy whose entry contains another's
    for st in results:
        for base in results:
            if st is base or st["mode"] != base["mode"] or st.get("hold") != base.get("hold") or base["id"] in ("A0", "B0") or not set(base["entry"]) or not set(base["entry"]) < set(st["entry"]):
                continue
            th = TH(st); e, b = st["either_side"][th], base["either_side"][th]
            if e["n"] >= floor and b["n"] >= floor:
                extra = sorted(set(st["entry"]) - set(base["entry"]))
                if separated(e, b) and e["rate"] > b["rate"]:
                    F.append({"strategy": st["id"], "level": "finding", "text": f"Requiring {words(extra)} on top of {base['id']} ({st['id']}) lifts {th}% moves from {b['rate']}% to {e['rate']}% and keeps {e['n']} of {b['n']} trades."})
                else:
                    F.append({"strategy": st["id"], "level": "none", "text": f"Requiring {words(extra)} on top of {base['id']} ({st['id']}) drops {b['n'] - e['n']} of {b['n']} trades without a measurable gain ({b['rate']}% → {e['rate']}%)."})
    # 8 contracts, once captured
    for st in results:
        bc = [tr["best_contract"] for tr in st.get("_trades", []) if tr.get("best_contract")]
        scored = [(tr, tr["best_contract"]) for tr in st.get("_trades", []) if tr.get("best_contract") and any(tr["best_contract"].values())]
        if len(scored) >= 10:
            for eid in ("1130", "1330", "close"):
                picks = [(tr, c[eid]) for tr, c in scored if c.get(eid)]
                if len(picks) >= 10:
                    dtes = [(date.fromisoformat(c["expiry"]) - date.fromisoformat(tr["date"])).days for tr, c in picks]
                    dist = [abs(c["strike"] - tr["entry"]) for tr, c in picks]
                    rets = [c["return_pct"] for tr, c in picks]
                    F.append({"strategy": st["id"], "level": "finding", "text": f"{st['id']} best contract to {exit_labels[eid]} over {len(picks)} scored trades: median {round(percentile(dtes, 0.5))} days to expiry, {round(percentile(dist, 0.5), 1)} points from spot, median return {round(percentile(rets, 0.5), 1)}%."})
        elif st["mode"] == "A" and st["id"] != "A0":
            F.append({"strategy": st["id"], "level": "info", "text": f"{st['id']}: contract scoring needs 10 trades with chains captured at entry and exit; {len(scored)} so far."})
    return F


def decide(results, findings, today, armed_b, armed_a_pending, price, exits_a):
    """The next session in plain sentences: trade or no trade, the size edge, the direction edge, the timing, the contract."""
    byid = {r["id"]: r for r in results}
    labels = {e["id"]: e["label"] for e in exits_a}
    lines = []
    ctx = f"Yesterday was a {today['prior_class']} day, VIX closed at {today['vix']:.2f} ({today['vix_bucket']}), and the market is {today['dd_bucket']} of its 20-session high."
    live = [i for i in armed_b if i != "B0"]; pending = [i for i in armed_a_pending if i != "A0"]
    scored = lambda st: st["n"] >= FLOOR
    def size_line(st, ctrl, th):
        e, c = st["either_side"][th], ctrl["either_side"][th]
        if separated(e, c) and e["rate"] > c["rate"]:
            return "significant", f"a {th}% move came on {e['rate']:.0f}% of {e['n']} sessions like this against {c['rate']:.0f}% on an ordinary session"
        if separated(e, c):
            return "negative", f"a {th}% move came on only {e['rate']:.0f}% of {e['n']} sessions like this against {c['rate']:.0f}% on an ordinary session"
        return "none", f"a {th}% move came on {e['rate']:.0f}% of {e['n']} sessions like this against {c['rate']:.0f}% on an ordinary session — not a measurable difference"
    def direction_line(st, ctrl):
        best = None
        for eid, ag in st["exits"].items():
            if ag["n"] >= FLOOR:
                L, C = ag["long"], (ctrl["exits"].get(eid) or {}).get("long")
                if C and separated(L, C) and L["rate"] > C["rate"] and (best is None or L["rate"] > best[1]["rate"]):
                    best = (eid, L, C)
                S, CS = ag["short"], (ctrl["exits"].get(eid) or {}).get("short")
                if CS and separated(S, CS) and S["rate"] > CS["rate"] and (best is None or S["rate"] > best[1]["rate"]):
                    best = (eid, S, CS, "short")
        if not best:
            return "Neither side has a directional edge on this record; the size of the move is the edge, not its direction."
        side = "short" if len(best) == 4 else "long"
        lab = labels.get(best[0], f"day {best[0]}")
        return f"The {side} side has an edge on this record: it closed in profit on {best[1]['rate']:.0f}% of {best[1]['n']} trades exited at {lab} ({best[1]['lo']:.0f}–{best[1]['hi']:.0f}) against {best[2]['rate']:.0f}% on an ordinary session. This is measured on the period the record covers and no further."
    def timing_line(st):
        if st["mode"] == "A" and st.get("peak_min_median") is not None:
            t = 8 * 60 + 30 + st["peak_min_median"]; return f"The best move typically lands around {t // 60}:{t % 60:02d} CT; the record does not support holding into the last hour."
        return f"Measured from the next open to the close of session {st['hold']}."
    def contract_line(st):
        c = st.get("contracts") or {}
        if c.get("scored", 0) >= 10:
            f = [x for x in findings if x["strategy"] == st["id"] and "best contract" in x["text"]]
            return f[0]["text"] if f else ""
        return f"Contract guidance needs ten trades with the option chain captured at entry and exit; {c.get('scored', 0)} so far."
    hold_v, day_v = "NO HOLD", "NO DAY TRADE"
    avoid = [byid[i] for i in live if byid[i].get("role") == "avoid" and scored(byid[i])]
    trades = [byid[i] for i in live if byid[i].get("role") == "trade" and scored(byid[i])]
    ctrl_b = byid["B0"]
    if trades:
        st = max(trades, key=lambda x: x["either_side"]["1.5"]["rate"])
        kind, why = size_line(st, ctrl_b, "1.5")
        hold_v = "HOLD CANDIDATE" if kind == "significant" else "NO HOLD"
        lines.append(f"Multi-day: {st['name']} — size edge {kind}: {why}. {direction_line(st, ctrl_b)} {timing_line(st)}")
    elif avoid:
        st = avoid[0]; kind, why = size_line(st, ctrl_b, "1.5")
        lines.append(f"Multi-day: no trade — {why}. {direction_line(st, ctrl_b)}")
    else:
        lines.append("Multi-day: no hold strategy has its conditions met.")
    day_trades = [byid[i] for i in pending if byid[i].get("role") == "trade" and scored(byid[i])]
    day_avoid = [byid[i] for i in pending if byid[i].get("role") == "avoid" and scored(byid[i])]
    if day_trades:
        st = max(day_trades, key=lambda x: x["either_side"]["0.75"]["rate"]); ctrl = byid["A0"]
        kind, why = size_line(st, ctrl, "0.75")
        day_v = "DAY TRADE ONLY IF THE 9:00 CT RANGE IS WIDE" if kind == "significant" else "NO DAY TRADE"
        lines.append(f"Day trade: if the 9:00 CT opening range comes in wide, {st['name'].lower()} applies — size edge {kind}: {why}. {direction_line(st, ctrl)} {timing_line(st)} {contract_line(st)}")
        if day_avoid:
            a = day_avoid[0]; e = a["either_side"]["0.75"]
            lines.append(f"If the opening range comes in narrow instead, stay out: a 0.75% move came on only {e['rate']:.0f}% of {e['n']} such sessions.")
    elif day_avoid:
        a = day_avoid[0]; e = a["either_side"]["0.75"]
        lines.append(f"Day trade: no trade if the opening range is narrow — a 0.75% move came on only {e['rate']:.0f}% of {e['n']} such sessions.")
    else:
        lines.append("Day trade: no day-trade strategy has its conditions met before the opening range.")
    return {"verdict": f"{hold_v} · {day_v}", "hold": hold_v, "day": day_v, "context": ctx, "lines": [l for l in lines if l]}


def main():
    reg = load_registry()
    exits_a = reg["exits_a"]
    conn = sqlite3.connect(DB_PATH)
    rows = daily_rows(conn)
    vix = vix_closes(conn)
    paths = intraday_paths(conn, exits_a)
    last = date.fromisoformat(rows[-1][0]); y1 = year_before(last).isoformat()
    day_q = quartiles([(r[2] - r[3]) / r[4] * 100 for r in rows if r[0] >= y1])
    or_q = quartiles([v["or_pct"] for d, v in paths.items() if d >= y1]) if paths else {"q25": None, "q75": None, "n": 0}
    ctx = session_context(rows, vix, day_q)
    for d, v in paths.items():
        if d in ctx:
            ctx[d]["or_class"] = classify(v["or_pct"], or_q)
    by_date = {r[0]: i for i, r in enumerate(rows)}
    have_chains = bool(conn.execute("SELECT name FROM sqlite_master WHERE name='option_chain'").fetchone()) and conn.execute("SELECT COUNT(*) FROM option_chain").fetchone()[0] > 0
    chain_first = conn.execute("SELECT MIN(session_date) FROM option_chain").fetchone()[0] if have_chains else None

    results = []
    for st in reg["strategies"]:
        tests = [CONDS[n] for n in st["entry"]]
        trades = []
        if st["mode"] == "A":
            for d in sorted(paths):
                c = ctx.get(d)
                if not c or not all(t(c) for t in tests):
                    continue
                p = paths[d]
                tr = {"date": d, "entry": round(p["entry"], 2), "or_pct": round(p["or_pct"], 3), "exits": p["exits"], "mfe_up": p["mfe_up"], "mfe_down": p["mfe_down"],
                      "peak_up_min": p["peak_up_min"], "peak_down_min": p["peak_down_min"], "prior_class": c["prior_class"], "vix_bucket": c["vix_bucket"], "dd_bucket": c["dd_bucket"],
                      "outcomes": {f"{side}_{t}_{s}": stop_target_outcome(p, side, t, s) for side in ("up", "down") for t in reg["targets"] for s in reg["stops"]}}
                if have_chains and d >= chain_first:
                    tr["best_contract"] = {e["id"]: option_best(conn, d, e["bar"], reg["min_dte"]) for e in exits_a if e["id"] in ("1130", "1330", "close")}
                trades.append(tr)
        else:
            k = st["hold"]
            for d, c in ctx.items():
                if not all(t(c) for t in tests):
                    continue
                i = by_date[d]
                if i + k - 1 >= len(rows):
                    continue
                o = rows[i][1]
                seg = rows[i:i + k]
                closes = {str(j + 1): round((seg[j][4] - o) / o * 100, 4) for j in range(k)}
                hi = max(r[2] for r in seg); lo = min(r[3] for r in seg)
                trades.append({"date": d, "entry": round(o, 2), "exits": closes, "mfe_up": round((hi - o) / o * 100, 4), "mfe_down": round((o - lo) / o * 100, 4),
                               "prior_class": c["prior_class"], "vix_bucket": c["vix_bucket"], "dd_bucket": c["dd_bucket"]})
        # aggregates: per exit, long / short / either-side
        exit_ids = [e["id"] for e in exits_a] if st["mode"] == "A" else [str(j + 1) for j in range(st["hold"])]
        agg = {}
        for eid in exit_ids:
            vals = [t["exits"][eid] for t in trades if eid in t["exits"]]
            n = len(vals)
            agg[eid] = {"n": n, "long": rate(sum(1 for v in vals if v > 0), n), "short": rate(sum(1 for v in vals if v < 0), n),
                        "median_abs": round(percentile([abs(v) for v in vals], 0.5), 3) if vals else None, "median_long": round(percentile(vals, 0.5), 3) if vals else None}
        either = {}
        for th in (0.5, 0.75, 1.0, 1.5, 2.0):
            n = len(trades); k = sum(1 for t in trades if max(t["mfe_up"], t["mfe_down"]) >= th)
            either[str(th)] = rate(k, n)
        st_out = {**{k: v for k, v in st.items()}, "n": len(trades), "exits": agg, "either_side": either, "first": trades[0]["date"] if trades else None, "last": trades[-1]["date"] if trades else None}
        if st["mode"] == "A":
            tg = {}
            for side in ("up", "down"):
                for t in reg["targets"]:
                    for s in reg["stops"]:
                        key = f"{side}_{t}_{s}"
                        outs = [tr["outcomes"][key] for tr in trades]
                        n = len(outs)
                        pnl = [t if o == "target" else -s if o == "stop" else (tr["exits"]["close"] if side == "up" else -tr["exits"]["close"]) for tr, o in zip(trades, outs)]
                        wins = sum(1 for v in pnl if v > 0)
                        tg[key] = {"n": n, "target": sum(1 for o in outs if o == "target"), "stop": sum(1 for o in outs if o == "stop"), "close": sum(1 for o in outs if o == "close"), "win": rate(wins, n),
                                   "expectancy_pct": round(sum(pnl) / n, 3) if n else None, "breakeven_win_rate": round(s / (t + s) * 100, 1)}
            st_out["target_stop"] = tg
            st_out["peak_min_median"] = round(percentile([(t["peak_up_min"] if t["mfe_up"] >= t["mfe_down"] else t["peak_down_min"]) for t in trades], 0.5)) if trades else None
            chains_scored = [t for t in trades if t.get("best_contract") and any(t["best_contract"].values())]
            st_out["contracts"] = {"scored": len(chains_scored), "since": chain_first}
        st_out["recent"] = trades[-15:][::-1]
        st_out["_trades"] = trades
        results.append(st_out)

    findings = analyze(results, reg, exits_a)

    for r in results:
        r.pop("_trades", None)
    latest = rows[-1][0]
    today_ctx = {"date": latest, "prior_class": classify((rows[-1][2] - rows[-1][3]) / rows[-1][4] * 100, day_q), "vix": vix.get(latest), "vix_bucket": bucket(vix.get(latest), VIX_BUCKETS),
                 "dd": (rows[-1][4] / max(r[4] for r in rows[-20:]) - 1) * 100}
    today_ctx["dd_bucket"] = bucket(today_ctx["dd"], DD_BUCKETS)
    armed_b = [st["id"] for st in reg["strategies"] if st["mode"] == "B" and all(CONDS[n](today_ctx) for n in st["entry"])]
    armed_a_pending = [st["id"] for st in reg["strategies"] if st["mode"] == "A" and all(CONDS[n](today_ctx) for n in st["entry"] if not n.startswith("or_"))]
    decision = decide(results, findings, {**today_ctx, "dd_bucket": today_ctx["dd_bucket"]}, armed_b, armed_a_pending, rows[-1][4], exits_a)
    out = {"as_of": latest, "current_price": rows[-1][4], "strategies": results, "findings": findings, "decision": decision, "exits_a": exits_a, "targets": reg["targets"], "stops": reg["stops"], "min_dte": reg["min_dte"], "floor": FLOOR,
           "or_thresholds": {"wide_pct": round(or_q["q75"], 3) if or_q["q75"] is not None else None, "narrow_pct": round(or_q["q25"], 3) if or_q["q25"] is not None else None},
           "today": {**today_ctx, "dd": round(today_ctx["dd"], 2), "armed_b": armed_b, "armed_a_pending_or": armed_a_pending},
           "chains": {"available": have_chains, "since": chain_first}}
    out.update(stamp(None))
    conn.close()
    with open(OUTPUT, "w") as f:
        f.write("const STRATEGIES_DATA = " + json.dumps(out, separators=(",", ":")) + ";\n")
    for r in results:
        e = r["exits"].get("1330") or r["exits"].get("3") or {}
        print(f"  {r['id']} {r['name'][:44]:44s} n={r['n']:4d}  long {e.get('long', {}).get('rate')}%  short {e.get('short', {}).get('rate')}%  either≥0.75% {r['either_side']['0.75']['rate']}%")
    print(f"{OUTPUT}: {len(results)} strategies, chains {'from ' + chain_first if have_chains else 'not yet captured'}, armed for {latest}: B {armed_b}, A pending OR {armed_a_pending}")


if __name__ == "__main__":
    main()
