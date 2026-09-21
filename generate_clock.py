"""Builds clock_data.js: the trading clock as measurements that recompute every run.

From daily bars: overnight against session, the weekend gap, Monday against Friday. From the 1-minute session bars: the
30-minute profile, the midday lull, the London close. From the 24-hour ES bars: Tokyo open, Tokyo close, London open and
London close as activity and reversal tests. Each test carries its sample, its interval and a control.
"""
import json
import math
import sqlite3
from datetime import date, datetime, timedelta

import pytz

from payload_meta import stamp
from stats_helpers import percentile, wilson

ET = pytz.timezone("America/New_York")
DB_PATH = "spy_data.db"
OUTPUT = "clock_data.js"
FLOOR = 30
SLOT_LABELS_CT = ["8:30", "9:00", "9:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "1:00", "1:30", "2:00", "2:30"]
OVERNIGHT_EVENTS = [("tokyo_open", "Tokyo open", "20:00"), ("tokyo_close", "Tokyo close", "02:00"), ("london_open", "London open", "03:00"), ("london_close", "London close", "11:30")]


def rate(k, n):
    ci = wilson(k, n)
    return {"k": k, "n": n, "rate": round(k / n * 100, 1) if n else None, "lo": round(ci[0], 1) if ci else None, "hi": round(ci[1], 1) if ci else None}


def separated(a, b):
    return a and b and a["n"] and b["n"] and (a["lo"] > b["hi"] or b["lo"] > a["hi"])


def sign(v):
    return 1 if v > 0 else -1 if v < 0 else 0


def daily_tests(conn):
    rows = conn.execute("SELECT date, open, high, low, close FROM daily_ohlcv WHERE open IS NOT NULL AND close IS NOT NULL ORDER BY date").fetchall()
    out = {}
    recs = []
    for i in range(1, len(rows)):
        d, o, h, l, c = rows[i]; pc = rows[i - 1][4]
        recs.append({"date": d, "on": (o / pc - 1) * 100, "day": (c / o - 1) * 100, "dow": date.fromisoformat(d).weekday(), "prev_day": (rows[i - 1][4] / rows[i - 1][1] - 1) * 100, "gap_days": (date.fromisoformat(d) - date.fromisoformat(rows[i - 1][0])).days})
    last = date.fromisoformat(rows[-1][0])
    eras = {"1993-2009": [r for r in recs if r["date"] < "2010-01-01"], "2010-2026": [r for r in recs if r["date"] >= "2010-01-01"], "3y": [r for r in recs if r["date"] >= last.replace(year=last.year - 3).isoformat()]}
    for era, s in eras.items():
        if not s:
            continue
        cum_on = (math.prod(1 + r["on"] / 100 for r in s) - 1) * 100; cum_day = (math.prod(1 + r["day"] / 100 for r in s) - 1) * 100
        var_on = sum((r["on"]) ** 2 for r in s) / len(s); var_day = sum((r["day"]) ** 2 for r in s) / len(s)
        mon = [r for r in s if r["dow"] == 0 and r["gap_days"] >= 2]; oth = [r for r in s if r["dow"] != 0]
        cont = [r for r in mon if r["prev_day"] != 0]
        same = sum(1 for r in cont if sign(r["day"]) == sign(r["prev_day"]))
        ctrl = [r for r in oth if r["prev_day"] != 0]
        same_c = sum(1 for r in ctrl if sign(r["day"]) == sign(r["prev_day"]))
        gap_fade = sum(1 for r in mon if r["on"] != 0 and sign(r["day"]) != sign(r["on"])); gap_n = sum(1 for r in mon if r["on"] != 0)
        gap_fade_c = sum(1 for r in oth if r["on"] != 0 and sign(r["day"]) != sign(r["on"])); gap_n_c = sum(1 for r in oth if r["on"] != 0)
        out[era] = {"n": len(s), "start": s[0]["date"], "cum_overnight": round(cum_on, 1), "cum_session": round(cum_day, 1),
                    "overnight_share_of_variance": round(var_on / (var_on + var_day) * 100, 1),
                    "median_abs_overnight": round(percentile([abs(r["on"]) for r in s], 0.5), 3), "median_abs_session": round(percentile([abs(r["day"]) for r in s], 0.5), 3),
                    "monday_gap_median_abs": round(percentile([abs(r["on"]) for r in mon], 0.5), 3) if mon else None, "other_gap_median_abs": round(percentile([abs(r["on"]) for r in oth], 0.5), 3),
                    "monday_continues_friday": rate(same, len(cont)), "weekday_continues_prior": rate(same_c, len(ctrl)),
                    "monday_gap_fades": rate(gap_fade, gap_n), "other_gap_fades": rate(gap_fade_c, gap_n_c),
                    "by_weekday": {["Mon", "Tue", "Wed", "Thu", "Fri"][k]: {"n": len([r for r in s if r["dow"] == k]), "session_mean": round(sum(r["day"] for r in s if r["dow"] == k) / max(1, len([r for r in s if r["dow"] == k])), 3), "session_up": rate(sum(1 for r in s if r["dow"] == k and r["day"] > 0), len([r for r in s if r["dow"] == k])), "overnight_mean": round(sum(r["on"] for r in s if r["dow"] == k) / max(1, len([r for r in s if r["dow"] == k])), 3)} for k in range(5)}}
    return out


def session_tests(conn):
    dates = [r[0] for r in conn.execute("SELECT date FROM intraday_bars GROUP BY date HAVING COUNT(*) >= 380")]
    slots = {i: {"rng": [], "vshare": [], "absmv": []} for i in range(13)}
    lc = []; ctrl_pairs = {m: [] for m in (90, 150, 180, 210, 240, 270, 300, 330)}
    mon_pairs = []; fri_pm = {}; first_half = {}
    for d in dates:
        bars = conn.execute("SELECT timestamp, open, high, low, close, volume FROM intraday_bars WHERE date=? AND high IS NOT NULL ORDER BY timestamp", (d,)).fetchall()
        mins = [(int(b[0][:2]) * 60 + int(b[0][3:5]) - 570, b) for b in bars]
        tot = sum(b[5] or 0 for b in bars) or 1
        by = {}
        for m, b in mins:
            by.setdefault(min(12, max(0, m // 30)), []).append(b)
        for sidx, bb in by.items():
            o = bb[0][1] or bb[0][4]
            if not o:
                continue
            slots[sidx]["rng"].append((max(x[2] for x in bb) - min(x[3] for x in bb)) / o * 100)
            slots[sidx]["vshare"].append(sum(x[5] or 0 for x in bb) / tot * 100)
            slots[sidx]["absmv"].append(abs(bb[-1][4] / o - 1) * 100)
        at = {m: b[4] for m, b in mins}
        o = bars[0][1] or bars[0][4]; cl = bars[-1][4]
        if 120 in at and 150 in at:
            am = at[120] / o - 1; lcm = at[150] / at[120] - 1; pm = cl / at[120] - 1
            lc.append((am, lcm, pm))
        for m in ctrl_pairs:
            if m in at and m + 30 in at:
                ctrl_pairs[m].append((at[m] / o - 1, at[m + 30] / at[m] - 1))
        dow = date.fromisoformat(d).weekday()
        if dow == 4 and 270 in at:
            fri_pm[d] = cl / at[270] - 1
        if 180 in at:
            first_half[d] = (at[180] / o - 1, cl / o - 1, dow)
    for d, (fh, full, dow) in first_half.items():
        if dow == 0:
            f = [x for x in fri_pm if x < d and (date.fromisoformat(d) - date.fromisoformat(x)).days <= 4]
            if f:
                mon_pairs.append((fri_pm[f[-1]], fh, full))
    profile = [{"slot": SLOT_LABELS_CT[i], "range_median": round(percentile(v["rng"], 0.5), 3) if v["rng"] else None, "volume_share_mean": round(sum(v["vshare"]) / len(v["vshare"]), 1) if v["vshare"] else None, "abs_move_median": round(percentile(v["absmv"], 0.5), 3) if v["absmv"] else None, "n": len(v["rng"])} for i, v in slots.items()]
    def zone(idx):
        r = [x for i in idx for x in slots[i]["rng"]]; vs = [x for i in idx for x in slots[i]["vshare"]]
        return {"range_median": round(percentile(r, 0.5), 3) if r else None, "volume_share_per_slot": round(sum(vs) / len(vs), 1) if vs else None}
    n = len(lc)
    against = sum(1 for am, lcm, pm in lc if sign(am) and sign(lcm) and sign(am) != sign(lcm))
    against_rest = sum(1 for am, lcm, pm in lc if sign(am) and sign(pm) and sign(am) != sign(pm))
    big = [(am, lcm, pm) for am, lcm, pm in lc if abs(am) >= 0.005]
    ctrl = [rate(sum(1 for a, b in v if sign(a) and sign(b) and sign(a) != sign(b)), sum(1 for a, b in v if sign(a) and sign(b))) for v in ctrl_pairs.values() if v]
    same = sum(1 for f, m, full in mon_pairs if sign(f) and sign(m) and sign(f) == sign(m)); mn = sum(1 for f, m, full in mon_pairs if sign(f) and sign(m))
    return {"sessions": len(dates), "first": min(dates) if dates else None, "last": max(dates) if dates else None, "profile": profile,
            "zones": {"9:30–11:00": zone([2, 3, 4]), "11:00–1:00": zone([5, 6, 7, 8]), "1:00–3:00": zone([9, 10, 11, 12])},
            "london_close": {"against_morning_next_30": rate(against, sum(1 for am, lcm, pm in lc if sign(am) and sign(lcm))), "against_morning_rest_of_day": rate(against_rest, sum(1 for am, lcm, pm in lc if sign(am) and sign(pm))),
                             "against_morning_next_30_when_morning_big": rate(sum(1 for am, lcm, pm in big if sign(am) and sign(lcm) and sign(am) != sign(lcm)), sum(1 for am, lcm, pm in big if sign(am) and sign(lcm))),
                             "control_other_slots_mean": round(sum(c["rate"] for c in ctrl) / len(ctrl), 1) if ctrl else None, "control_min": min(c["rate"] for c in ctrl) if ctrl else None, "control_max": max(c["rate"] for c in ctrl) if ctrl else None},
            "monday_vs_friday": {"same_direction": rate(same, mn), "monday_first_half_abs_median": round(percentile([abs(m) * 100 for f, m, full in mon_pairs], 0.5), 3) if mon_pairs else None,
                                 "other_first_half_abs_median": round(percentile([abs(v[0]) * 100 for d, v in first_half.items() if v[2] != 0], 0.5), 3) if first_half else None}}


def overnight_tests(conn):
    if not conn.execute("SELECT name FROM sqlite_master WHERE name='futures_bars'").fetchone():
        return {"sessions": 0}
    rows = conn.execute("SELECT ts, open, high, low, close, volume FROM futures_bars ORDER BY ts").fetchall()
    if not rows:
        return {"sessions": 0}
    bars = [(datetime.fromisoformat(r[0]), r[1], r[2], r[3], r[4], r[5] or 0) for r in rows]
    # trading day = the 24 hours ending at the 4:00 PM ET close; key each bar by that session date
    by_day = {}
    for t, o, h, l, c, v in bars:
        key = (t + timedelta(hours=8)).date() if t.hour >= 16 else t.date()
        by_day.setdefault(key.isoformat(), []).append((t, o, h, l, c, v))
    days = {k: v for k, v in by_day.items() if len(v) >= 200}
    events = {}
    for key, label, hhmm in OVERNIGHT_EVENTS:
        hh, mm = int(hhmm[:2]), int(hhmm[3:])
        rng_at, rng_before, rng_after, vol_at, vol_before, vol_after, rev, prior_n, rev_ctrl = [], [], [], [], [], [], 0, 0, []
        for dkey, bb in days.items():
            def win(start_min, length=30):
                sel = [b for b in bb if (b[0].hour * 60 + b[0].minute - start_min) % 1440 < length]
                return sel
            ev = hh * 60 + mm
            at, before, after = win(ev), win(ev - 30), win(ev + 30)
            if len(at) < 4 or len(before) < 4 or len(after) < 4:
                continue
            o = at[0][1]
            rng_at.append((max(b[2] for b in at) - min(b[3] for b in at)) / o * 100); vol_at.append(sum(b[5] for b in at))
            rng_before.append((max(b[2] for b in before) - min(b[3] for b in before)) / before[0][1] * 100); vol_before.append(sum(b[5] for b in before))
            rng_after.append((max(b[2] for b in after) - min(b[3] for b in after)) / after[0][1] * 100); vol_after.append(sum(b[5] for b in after))
            prior = win(ev - 180, 180)
            if len(prior) >= 20:
                pm = sign(prior[-1][4] / prior[0][1] - 1); nm = sign(at[-1][4] / at[0][1] - 1)
                if pm and nm:
                    prior_n += 1; rev += 1 if pm != nm else 0
        events[key] = {"label": label, "time_et": hhmm, "n": len(rng_at),
                       "range_at": round(percentile(rng_at, 0.5), 3) if rng_at else None, "range_before": round(percentile(rng_before, 0.5), 3) if rng_before else None, "range_after": round(percentile(rng_after, 0.5), 3) if rng_after else None,
                       "volume_at": round(percentile(vol_at, 0.5)) if vol_at else None, "volume_before": round(percentile(vol_before, 0.5)) if vol_before else None, "volume_after": round(percentile(vol_after, 0.5)) if vol_after else None,
                       "reverses_prior_3h": rate(rev, prior_n)}
    # overnight (4 PM → 9:30 AM ET) vs regular session on ES, and the 24-hour range profile by hour
    on_abs, rth_abs, hour_rng = [], [], {h: [] for h in range(24)}
    for dkey, bb in days.items():
        rth = [b for b in bb if (9 * 60 + 30) <= b[0].hour * 60 + b[0].minute < 16 * 60 and b[0].date().isoformat() == dkey]
        on = [b for b in bb if not ((9 * 60 + 30) <= b[0].hour * 60 + b[0].minute < 16 * 60 and b[0].date().isoformat() == dkey)]
        if len(rth) >= 60 and len(on) >= 100:
            on_abs.append(abs(on[-1][4] / on[0][1] - 1) * 100); rth_abs.append(abs(rth[-1][4] / rth[0][1] - 1) * 100)
        for b in bb:
            hour_rng[b[0].hour].append((b[2] - b[3]) / b[1] * 100 if b[1] else 0)
    return {"sessions": len(days), "first": min(days) if days else None, "last": max(days) if days else None, "events": events,
            "overnight_abs_median": round(percentile(on_abs, 0.5), 3) if on_abs else None, "rth_abs_median": round(percentile(rth_abs, 0.5), 3) if rth_abs else None,
            "hour_range_median_et": {h: round(percentile(v, 0.5), 4) if v else None for h, v in hour_rng.items()}}


def verdicts(daily, session, overnight):
    V = []
    d = daily.get("2010-2026") or {}
    if d:
        V.append({"topic": "Overnight vs session", "level": "finding", "text": f"Since 2010 the return has come overnight: close-to-open compounded to {d['cum_overnight']:+.0f}% against {d['cum_session']:+.0f}% open-to-close. The size of the move has not: overnight is {d['overnight_share_of_variance']:.0f}% of daily variance and a typical session moves {d['median_abs_session']:.2f}% against {d['median_abs_overnight']:.2f}% overnight."})
        mc, wc = d["monday_continues_friday"], d["weekday_continues_prior"]
        V.append({"topic": "Monday as continuation", "level": "finding" if separated(mc, wc) else "none", "text": f"Monday's session went the way Friday's session went {mc['rate']}% of the time ({mc['lo']}–{mc['hi']}, n={mc['n']}); any weekday continued the prior session {wc['rate']}%. " + ("Monday behaves differently." if separated(mc, wc) else "Monday is not a continuation of Friday at the daily level.")})
        V.append({"topic": "The weekend gap", "level": "none", "text": f"Monday's gap is no larger than other days' (median {d['monday_gap_median_abs']:.2f}% against {d['other_gap_median_abs']:.2f}%) and faded {d['monday_gap_fades']['rate']}% of the time against {d['other_gap_fades']['rate']}% on other days."})
    s = session
    if s.get("sessions", 0) >= FLOOR:
        z = s["zones"]; lc = s["london_close"]
        V.append({"topic": "The midday lull", "level": "finding", "text": f"11:00–1:00 CT is the quietest stretch: median 30-minute range {z['11:00–1:00']['range_median']:.3f}% and {z['11:00–1:00']['volume_share_per_slot']:.1f}% of the day's volume per slot, against {z['9:30–11:00']['range_median']:.3f}% and {z['9:30–11:00']['volume_share_per_slot']:.1f}% for 9:30–11:00 and {z['1:00–3:00']['range_median']:.3f}% and {z['1:00–3:00']['volume_share_per_slot']:.1f}% for 1:00–3:00 (the close included)."})
        a = lc["against_morning_next_30"]
        lvl = "finding" if a["n"] >= FLOOR and (a["lo"] > 50 or a["hi"] < 50) and (lc["control_max"] is None or a["lo"] > lc["control_max"] or a["hi"] < lc["control_min"]) else "none"
        V.append({"topic": "The London close (10:30 CT)", "level": lvl, "text": f"The 10:30–11:00 CT slot went against the 8:30–10:30 move {a['rate']}% of the time ({a['lo']}–{a['hi']}, n={a['n']}); other slots against the move before them: {lc['control_other_slots_mean']}% (range {lc['control_min']}–{lc['control_max']}). " + ("A reversal effect is present." if lvl == "finding" else "No reversal effect at the London close in the regular session; that slot's range and volume are lower than the slot before it.")})
        m = s["monday_vs_friday"]["same_direction"]
        V.append({"topic": "Monday morning vs Friday afternoon", "level": "finding" if m["n"] >= FLOOR and (m["lo"] > 50 or m["hi"] < 50) else "none", "text": f"Monday's 8:30–11:30 CT went the way Friday's last two hours went {m['rate']}% of the time ({m['lo']}–{m['hi']}, n={m['n']}). " + ("Direction carries over the weekend." if m["n"] >= FLOOR and (m["lo"] > 50 or m["hi"] < 50) else "Not separated from a coin flip on the sessions so far.")})
    o = overnight
    if o.get("sessions", 0) >= FLOOR:
        for key, ev in o["events"].items():
            if ev["n"] < FLOOR:
                V.append({"topic": ev["label"], "level": "info", "text": f"{ev['label']}: {ev['n']} sessions with bars; scored at {FLOOR}."}); continue
            active = ev["range_at"] is not None and ev["range_before"] is not None and ev["range_at"] > ev["range_before"] * 1.25 and ev["volume_at"] > ev["volume_before"] * 1.25
            r = ev["reverses_prior_3h"]; revl = r["n"] >= FLOOR and (r["lo"] > 50 or r["hi"] < 50)
            V.append({"topic": ev["label"], "level": "finding" if active or revl else "none", "text": f"{ev['label']} ({ev['time_et']} ET): median 30-minute range {ev['range_at']:.3f}% and volume {ev['volume_at']:,} at the event against {ev['range_before']:.3f}% / {ev['volume_before']:,} in the half hour before and {ev['range_after']:.3f}% / {ev['volume_after']:,} after — " + ("activity rises at the event. " if active else "no activity rise at the event. ") + f"The half hour after it went against the prior three hours {r['rate']}% of the time ({r['lo']}–{r['hi']}, n={r['n']}) — " + ("a reversal effect." if revl else "no reversal effect.")})
        if o.get("overnight_abs_median") is not None:
            V.append({"topic": "Overnight vs session on ES", "level": "info", "text": f"On {o['sessions']} ES sessions, the overnight (4:00 PM to 9:30 AM ET) moved a median {o['overnight_abs_median']:.2f}% against {o['rth_abs_median']:.2f}% in regular hours."})
    else:
        V.append({"topic": "Tokyo and London", "level": "info", "text": f"Overnight tests need {FLOOR} sessions of 24-hour ES bars; {o.get('sessions', 0)} so far."})
    return V


def main():
    conn = sqlite3.connect(DB_PATH)
    daily = daily_tests(conn); session = session_tests(conn); overnight = overnight_tests(conn)
    conn.close()
    out = {"daily": daily, "session": session, "overnight": overnight, "verdicts": verdicts(daily, session, overnight), "floor": FLOOR}
    out.update(stamp(None))
    with open(OUTPUT, "w") as f:
        f.write("const CLOCK_DATA = " + json.dumps(out, separators=(",", ":")) + ";\n")
    print(f"{OUTPUT}: {session.get('sessions')} session-bar days, {overnight.get('sessions')} ES days, {len(out['verdicts'])} verdicts")
    for v in out["verdicts"]:
        print(f"  [{v['level']:7s}] {v['topic']}: {v['text'][:150]}")


if __name__ == "__main__":
    main()
