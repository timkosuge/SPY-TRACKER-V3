import csv
import json
import sqlite3
import statistics as st
from datetime import date, datetime, timedelta

DB_PATH = "spy_data.db"
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]


def r(v, n=2):
    return round(v, n) if v is not None else None


def mean(v, n=2): return r(st.mean(v), n) if v else 0
def median(v, n=2): return r(st.median(v), n) if v else 0
def win(v): return r(sum(1 for a in v if a > 0) / len(v) * 100, 1) if v else 0
def mx(v, n=2): return r(max(v), n) if v else 0
def mn(v, n=2): return r(min(v), n) if v else 0


def load_daily(conn, cutoff=None):
    q = "SELECT date, open, high, low, close, volume FROM daily_ohlcv WHERE open > 0 AND close IS NOT NULL"
    if cutoff:
        q += f" AND date <= '{cutoff}'"
    rows = conn.execute(q + " ORDER BY date").fetchall()
    out = []
    for i, (d, o, h, l, c, v) in enumerate(rows):
        pc = rows[i - 1][4] if i else None
        out.append(dict(date=d, dt=date.fromisoformat(d), open=o, high=h, low=l, close=c, volume=v or 0,
                        ret=(c - pc) / pc * 100 if pc else None, oc=(c - o) / o * 100, rng=h - l))
    return out


def load_csv(path, cutoff=None):
    with open(path, newline="") as f:
        rows = [x for x in csv.DictReader(f) if x.get("OPEN")]
    out = []
    for x in rows:
        if cutoff and x["DATE"] > cutoff:
            continue
        out.append(dict(date=x["DATE"], dt=date.fromisoformat(x["DATE"]), open=float(x["OPEN"]), high=float(x["HIGH"]),
                        low=float(x["LOW"]), close=float(x["CLOSE"]), ret=float(x["Return_%"]), tr=float(x["True_Range"]),
                        days=int(x["Trading_Days"])))
    return out


def stats(vals, n=2):
    return dict(avg=mean(vals, n), median=median(vals, n), win_rate=win(vals), count=len(vals), best=mx(vals, n), worst=mn(vals, n))


def seasonality(monthly, daily):
    out = []
    for m in range(1, 13):
        mr = [x for x in monthly if x["dt"].month == m]
        dr = [x for x in daily if x["dt"].month == m and x["ret"] is not None]
        rets = [x["ret"] for x in mr]
        out.append(dict(month=MONTHS[m - 1], avg_return=mean(rets), median_return=median(rets),
                        win_rate=win(rets), avg_vol=mean([x["tr"] for x in mr]),
                        count=len(rets), best=mx(rets), worst=mn(rets),
                        daily_avg=mean([x["ret"] for x in dr]), daily_win_rate=win([x["ret"] for x in dr]),
                        daily_count=len(dr)))
    return out


def quarterly(monthly, daily):
    out = []
    names = ["Q1 (Jan–Mar)", "Q2 (Apr–Jun)", "Q3 (Jul–Sep)", "Q4 (Oct–Dec)"]
    for q in range(1, 5):
        ms = range(3 * q - 2, 3 * q + 1)
        mr = [x for x in monthly if x["dt"].month in ms]
        dr = [x for x in daily if x["dt"].month in ms and x["ret"] is not None]
        rets = [x["ret"] for x in mr]
        out.append(dict(quarter=names[q - 1], q_num=q, monthly_avg=mean(rets), monthly_win_rate=win(rets),
                        monthly_count=len(rets), daily_avg=mean([x["ret"] for x in dr]),
                        daily_win_rate=win([x["ret"] for x in dr]), daily_count=len(dr),
                        avg_vol=mean([x["tr"] for x in mr]), best=mx(rets), worst=mn(rets)))
    return out


def yearly_summary(yearly):
    rets = [x["ret"] for x in yearly]
    s = stats(rets)
    s["years"] = [dict(year=x["dt"].year, **{"return": x["ret"]}, true_range=x["tr"], green=x["ret"] > 0) for x in yearly]
    return s


def week_of_month(weekly):
    out = []
    for w in range(1, 6):
        rets = [x["ret"] for x in weekly if (x["dt"].day - 1) // 7 + 1 == w]
        if not rets:
            continue
        out.append(dict(week=f"Week {w}", avg_return=mean(rets), median_return=median(rets), win_rate=win(rets), count=len(rets), best=mx(rets), worst=mn(rets)))
    return out


def day_of_week(daily):
    out = []
    for k, name in enumerate(DAYS):
        rows = [x for x in daily if x["dt"].weekday() == k and x["ret"] is not None]
        rets = [x["ret"] for x in rows]
        idx = {x["date"]: i for i, x in enumerate(daily)}
        after_green, after_red = [], []
        for x in rows:
            i = idx[x["date"]]
            if i and daily[i - 1]["ret"] is not None:
                (after_green if daily[i - 1]["ret"] > 0 else after_red).append(x["ret"])
        out.append(dict(day=name, avg_return=mean(rets, 4), median_return=median(rets, 4), win_rate=win(rets), avg_range=mean([x["rng"] for x in rows]),
                        count=len(rets), best=mx(rets), worst=mn(rets), after_green_avg=mean(after_green), after_red_avg=mean(after_red)))
    return out


def daily_seasonality(daily):
    out = []
    for m in range(1, 13):
        rets = [x["ret"] for x in daily if x["dt"].month == m and x["ret"] is not None]
        out.append(dict(month=MONTHS[m - 1], avg_return=mean(rets), win_rate=win(rets), count=len(rets), best=mx(rets), worst=mn(rets)))
    return out


def streak_stats(rets, with_after=True, with_three=False):
    max_g = max_r = cur_g = cur_r = 0
    for v in rets:
        if v > 0:
            cur_g += 1; cur_r = 0
        else:
            cur_r += 1; cur_g = 0
        max_g = max(max_g, cur_g); max_r = max(max_r, cur_r)
    out = dict(max_green=max_g, max_red=max_r)
    if not with_after:
        return out
    def after(n, green):
        vals = []
        for i in range(n, len(rets)):
            seg = rets[i - n:i]
            if all((v > 0) == green for v in seg):
                vals.append(rets[i])
        return vals
    a2g, a2r = after(2, True), after(2, False)
    out.update(after_2green_avg=mean(a2g), after_2green_winrate=win(a2g), after_2red_avg=mean(a2r), after_2red_winrate=win(a2r))
    ag, ar = after(1, True), after(1, False)
    out.update(p_green_after_green=win(ag), p_green_after_red=win(ar))
    if with_three:
        a3g, a3r = after(3, True), after(3, False)
        out.update(after_3green_avg=mean(a3g), after_3green_winrate=win(a3g), after_3red_avg=mean(a3r), after_3red_winrate=win(a3r))
    return out


def streaks(weekly, monthly, yearly, daily):
    mo = streak_stats([x["ret"] for x in monthly], with_after=True)
    return dict(
        weekly=streak_stats([x["ret"] for x in weekly], with_three=True),
        monthly=dict(max_green=mo["max_green"], max_red=mo["max_red"], p_green_after_green=mo["p_green_after_green"]),
        yearly=streak_stats([x["ret"] for x in yearly], with_after=False),
        daily=streak_stats([x["ret"] for x in daily if x["ret"] is not None]),
    )


def santa(monthly, daily):
    nov = [x["ret"] for x in monthly if x["dt"].month == 11]; dec = [x["ret"] for x in monthly if x["dt"].month == 12]
    rest = [x["ret"] for x in monthly if x["dt"].month not in (11, 12)]
    novd = [x["ret"] for x in daily if x["dt"].month == 11 and x["ret"] is not None]
    decd = [x["ret"] for x in daily if x["dt"].month == 12 and x["ret"] is not None]
    return dict(nov_avg=mean(nov), nov_win=win(nov), dec_avg=mean(dec), dec_win=win(dec),
                novdec_avg=mean(nov + dec), novdec_win=win(nov + dec), rest_avg=mean(rest), rest_win=win(rest),
                count=len(dec), nov_daily_avg=mean(novd), nov_daily_win=win(novd), dec_daily_avg=mean(decd), dec_daily_win=win(decd))


def build_window(daily, weekly, monthly, yearly, label):
    return dict(
        seasonality=seasonality(monthly, daily),
        quarterly=quarterly(monthly, daily),
        yearly_summary=yearly_summary(yearly),
        santa=santa(monthly, daily),
        streaks=streaks(weekly, monthly, yearly, daily),
        recovery=recovery(weekly) if len(weekly) > 1 else {},
        vol_edge=vol_edge(weekly, daily) if len(weekly) >= 5 and len(daily) >= 5 else {},
        week_of_month=week_of_month(weekly),
        day_of_week=day_of_week(daily),
        holidays=holidays(weekly, daily),
        daily_seasonality=daily_seasonality(daily),
        daily_vol_edge=daily_vol_edge(daily) if len(daily) >= 5 else {},
        releases=releases(weekly, daily) if len(weekly) > 2 else {},
        meta=dict(label=label, weekly_count=len(weekly), monthly_count=len(monthly), daily_count=len([x for x in daily if x["ret"] is not None])),
    )


def build(conn, cutoff=None, csv_cutoff=None):
    daily = load_daily(conn, cutoff)
    weekly = load_csv("data/SPY_weekly.csv", csv_cutoff)
    monthly = load_csv("data/SPY_monthly.csv", csv_cutoff)
    yearly = load_csv("data/SPY_yearly.csv", csv_cutoff)
    year = daily[-1]["dt"].year
    complete_years = [y for y in yearly if y["dt"].year != year]
    out = {
        "all_time": build_window(daily, weekly, monthly, complete_years, f"All Time ({daily[0]['dt'].year}–{year})"),
        "since_2020": build_window([x for x in daily if x["dt"].year >= 2020], [x for x in weekly if x["dt"].year >= 2020],
                                   [x for x in monthly if x["dt"].year >= 2020], [y for y in complete_years if y["dt"].year >= 2020], "Since 2020"),
        "current_year": build_window([x for x in daily if x["dt"].year == year], [x for x in weekly if x["dt"].year == year],
                                     [x for x in monthly if x["dt"].year == year], [y for y in yearly if y["dt"].year == year], f"{year} YTD"),
        "current_year_num": year,
        "political": political(yearly, daily),
        "source_max_date": daily[-1]["date"],
    }
    return out


def main():
    conn = sqlite3.connect(DB_PATH)
    data = build(conn)
    data["generated"] = datetime.now().astimezone().isoformat(timespec="seconds")
    with open("edge_stats_data.js", "w", encoding="utf-8") as f:
        f.write("const ES_DATA = " + json.dumps(data, ensure_ascii=False) + ";\n")
    m = data["all_time"]["meta"]
    print(f"edge_stats_data.js: {m['daily_count']} sessions, {m['weekly_count']} weeks, {m['monthly_count']} months through {data['source_max_date']}")
    conn.close()



PARTY = {}
for y in range(1993, 2001): PARTY[y] = "dem"
for y in range(2001, 2009): PARTY[y] = "rep"
for y in range(2009, 2017): PARTY[y] = "dem"
for y in range(2017, 2021): PARTY[y] = "rep"
for y in range(2021, 2025): PARTY[y] = "dem"
for y in range(2025, 2033): PARTY[y] = "rep"


def q4_return(daily, year):
    ys = [x for x in daily if x["dt"].year == year]
    q4 = [x for x in ys if x["dt"].month >= 10]
    pre = [x for x in ys if x["dt"].month < 10]
    if not q4 or not pre:
        return None
    return (q4[-1]["close"] - pre[-1]["close"]) / pre[-1]["close"] * 100


def cycle_block(years, daily, q4=False):
    rets = [y["ret"] for y in years]
    out = stats(rets)
    if years:
        out["best_year"] = max(years, key=lambda y: y["ret"])["dt"].year
        out["worst_year"] = min(years, key=lambda y: y["ret"])["dt"].year
    out["years"] = [dict(year=y["dt"].year, ret=y["ret"]) for y in years]
    return out


def annual_close_to_close(daily):
    byy = {}
    for x in daily:
        byy.setdefault(x["dt"].year, []).append(x)
    years = sorted(byy)
    return [dict(dt=date(y, 12, 31), ret=r((byy[y][-1]["close"] - byy[y - 1][-1]["close"]) / byy[y - 1][-1]["close"] * 100),
                 days=len(byy[y])) for y in years if y - 1 in byy]


def political(yearly, daily):
    full = [y for y in annual_close_to_close(daily) if y["days"] >= 240]
    def sel(fn): return [y for y in full if y["dt"].year >= 1994 and fn(y["dt"].year)]
    election = sel(lambda y: y % 4 == 0)
    midterm = sel(lambda y: y % 4 == 2)
    year1 = sel(lambda y: y % 4 == 1)
    year3 = sel(lambda y: y % 4 == 3)
    out = dict(election=cycle_block(election, daily), midterm=cycle_block(midterm, daily),
               year1=cycle_block(year1, daily), year3=cycle_block(year3, daily))
    for party in ("dem", "rep"):
        rets = [y["ret"] for y in full if PARTY.get(y["dt"].year) == party]
        out[party] = stats(rets)
    for name, grp in (("election_q4", election), ("midterm_q4", midterm), ("year1_q4", year1), ("year3_q4", year3)):
        q = [q4_return(daily, y["dt"].year) for y in grp]
        q = [v for v in q if v is not None]
        out[name] = dict(avg=mean(q), win_rate=win(q), count=len(q))
    return out


def recovery(weekly):
    closes = [x["close"] for x in weekly]
    out = {}
    for dd in (5, 10, 15, 20):
        events = []
        peak = closes[0]; in_dd = False; cross = None
        for i, c in enumerate(closes):
            if c >= peak:
                if in_dd:
                    events.append(i - cross)
                    in_dd = False
                peak = c
            elif not in_dd and (peak - c) / peak * 100 >= dd:
                in_dd = True; cross = i
        out[f"dd{dd}"] = dict(count=len(events), avg_weeks=mean(events, 1), median_weeks=median(events, 1), max_weeks=max(events) if events else 0)
    return out


BUCKET_NAMES = ["Very Low (0–20%)", "Low (20–40%)", "Medium (40–60%)", "High (60–80%)", "Very High (80–100%)"]


def quintile_buckets(rows, key, ret_key="ret", rounded=False):
    vals = sorted(x[key] for x in rows)
    n = len(vals)
    cuts = [vals[int(n * k / 5)] for k in range(1, 5)]
    edges = [vals[0]] + cuts + [vals[-1]]
    out = []
    for b in range(5):
        lo = edges[b]; hi = edges[b + 1]
        if rounded:
            members = [i for i, x in enumerate(rows) if (r(x[key]) > r(lo) if b else True) and r(x[key]) <= r(hi)]
            tlo = r(lo if b == 0 else lo + 0.01)
        else:
            members = [i for i, x in enumerate(rows) if (x[key] > lo if b else True) and x[key] <= hi]
            tlo = r(min(rows[i][key] for i in members)) if members else r(lo)
        self_r = [rows[i][ret_key] for i in members if rows[i][ret_key] is not None]
        after_r = [rows[i + 1][ret_key] for i in members if i + 1 < len(rows) and rows[i + 1][ret_key] is not None]
        out.append(dict(bucket=BUCKET_NAMES[b], threshold_low=tlo, threshold_high=r(hi),
                        self_avg=mean(self_r), self_winrate=win(self_r), after_avg=mean(after_r), after_winrate=win(after_r), count=len(members)))
    return out, cuts


def vol_edge(weekly, daily):
    wb, wcuts = quintile_buckets(weekly, "tr", rounded=True)
    dl = [x for x in daily if x["ret"] is not None]
    db, dcuts = quintile_buckets(dl, "rng")
    hi, lo = wcuts[3], wcuts[0]
    hi_idx = [i for i, x in enumerate(weekly) if x["tr"] >= hi]
    lo_idx = [i for i, x in enumerate(weekly) if x["tr"] < lo]
    consec = []; run = 0
    for x in weekly:
        if x["tr"] >= hi:
            run += 1
        else:
            if run >= 2:
                consec.append(x["ret"])
            run = 0
    rets = [x["ret"] for x in weekly]
    return dict(
        weekly_buckets=wb, daily_buckets=db,
        after_consec_hivol_avg=mean(consec), after_consec_hivol_winrate=win(consec),
        weekly_avg_tr=mean([x["tr"] for x in weekly]), daily_avg_tr=mean([x["rng"] for x in dl]),
        hi_vol_threshold=r(hi), lo_vol_threshold=r(lo),
        hi_vol_self_avg=mean([weekly[i]["ret"] for i in hi_idx]), hi_vol_self_winrate=win([weekly[i]["ret"] for i in hi_idx]),
        lo_vol_self_avg=mean([weekly[i]["ret"] for i in lo_idx]),
        risk_adj_all=r(st.mean(rets) / st.mean([x["tr"] for x in weekly]), 4) if weekly else 0,
    )


def daily_vol_edge(daily):
    dl = [x for x in daily if x["ret"] is not None]
    vals = sorted(x["rng"] for x in dl); n = len(vals)
    hi, lo = vals[int(n * 4 / 5)], vals[int(n / 5)]
    after_hi = [dl[i + 1]["ret"] for i in range(len(dl) - 1) if dl[i]["rng"] >= hi]
    after_lo = [dl[i + 1]["ret"] for i in range(len(dl) - 1) if dl[i]["rng"] < lo]
    self_hi = [x["ret"] for x in dl if x["rng"] >= hi]
    return dict(hi_vol_threshold=r(hi), lo_vol_threshold=r(lo), after_hivol_avg=mean(after_hi), after_hivol_winrate=win(after_hi),
                after_lovol_avg=mean(after_lo), after_lovol_winrate=win(after_lo), hi_vol_self_avg=mean(self_hi), hi_vol_self_winrate=win(self_hi))


def release_weeks(weekly, daily, kind):
    """Index of the weekly row containing each release. Registry dates from 2020; before that, the
    calendar rule: CPI in the week whose last session falls on the 10th–16th, NFP in the first full week."""
    last_session = {}
    for x in daily:
        wk = (x["dt"] + timedelta(days=4 - x["dt"].weekday())).isoformat()
        last_session[wk] = x["dt"]
    widx = {x["date"]: i for i, x in enumerate(weekly)}
    registry = {}
    try:
        with open(f"release_dates/{kind}_dates.csv", newline="") as f:
            for row in csv.DictReader(f):
                registry.setdefault(row["Date"][:7], row["Date"])
    except FileNotFoundError:
        pass
    out = []
    months = sorted({x["date"][:7] for x in weekly})
    for m in months:
        if m in registry:
            d = date.fromisoformat(registry[m])
            wk = (d + timedelta(days=4 - d.weekday())).isoformat()
            if wk in widx:
                out.append(widx[wk])
            continue
        for x in weekly:
            if x["date"][:7] != m:
                continue
            ls = last_session.get(x["date"])
            if not ls:
                continue
            if kind == "cpi" and 10 <= ls.day <= 16:
                out.append(widx[x["date"]]); break
            if kind == "nfp" and 3 <= ls.day <= 9:
                out.append(widx[x["date"]]); break
    return sorted(set(out))


def releases(weekly, daily):
    cc = [None] + [(weekly[i]["close"] - weekly[i - 1]["close"]) / weekly[i - 1]["close"] * 100 for i in range(1, len(weekly))]
    out = {}
    for kind in ("cpi", "nfp"):
        sel = release_weeks(weekly, daily, kind)
        blk = {}
        for name, off in (("before", -1), ("during", 0), ("after", 1)):
            v = [cc[i + off] for i in sel if 0 <= i + off < len(cc) and cc[i + off] is not None]
            blk[name] = stats(v)
        out[kind] = blk
    return out


HOLIDAY_RULES = {
    "thanksgiving": lambda y: nth_weekday(y, 11, 3, 4),
    "christmas": lambda y: date(y, 12, 25),
    "new_year": lambda y: date(y, 1, 1),
    "july4": lambda y: date(y, 7, 4),
    "memorial": lambda y: last_weekday(y, 5, 0),
    "labor": lambda y: nth_weekday(y, 9, 0, 1),
    "mlk": lambda y: nth_weekday(y, 1, 0, 3),
    "presidents": lambda y: nth_weekday(y, 2, 0, 3),
}


def nth_weekday(y, m, weekday, n):
    d = date(y, m, 1)
    d += timedelta(days=(weekday - d.weekday()) % 7)
    return d + timedelta(weeks=n - 1)


def last_weekday(y, m, weekday):
    d = date(y + (m == 12), (m % 12) + 1, 1) - timedelta(days=1)
    return d - timedelta(days=(d.weekday() - weekday) % 7)


def week_of(d):
    return (d + timedelta(days=4 - d.weekday())).isoformat()


def holidays(weekly, daily):
    widx = {x["date"]: i for i, x in enumerate(weekly)}
    dl = [x for x in daily if x["ret"] is not None]
    years = sorted({x["dt"].year for x in dl})
    out = {}
    for name, fn in HOLIDAY_RULES.items():
        wk_rets, day_rets = [], []
        for y in years:
            h = fn(y); wk = week_of(h)
            if wk in widx:
                wk_rets.append(weekly[widx[wk]]["ret"])
            day_rets += [x["ret"] for x in dl if week_of(x["dt"]) == wk]
        if name not in ("mlk", "presidents"):
            out[f"{name}_week"] = stats(wk_rets)
        out[f"{name}_daily"] = stats(day_rets)
    short = [i for i, x in enumerate(weekly) if x["days"] < 5]
    out["short_week"] = stats([weekly[i]["ret"] for i in short])
    out["after_short_week"] = stats([weekly[i + 1]["ret"] for i in short if i + 1 < len(weekly)])
    jan_first5, dec_last5, jan_first2 = [], [], []
    for y in years:
        jan = [x["ret"] for x in dl if x["dt"].year == y and x["dt"].month == 1]
        dec = [x["ret"] for x in dl if x["dt"].year == y and x["dt"].month == 12]
        jan_first5 += jan[:5]; jan_first2 += jan[:2]; dec_last5 += dec[-5:]
    out["tax_loss_sell"] = stats([x["ret"] for x in dl if x["dt"].month == 12 and x["dt"].day >= 15])
    out["tax_loss_buy"] = stats(dec_last5 + jan_first2)
    out["january_effect"] = stats(jan_first5)
    out["sell_in_may"] = stats([x["ret"] for x in dl if 5 <= x["dt"].month <= 10])
    out["buy_in_nov"] = stats([x["ret"] for x in dl if x["dt"].month >= 11 or x["dt"].month <= 4])
    out["triple_witching"] = stats([x["ret"] for x in dl if x["dt"].month in (3, 6, 9, 12) and x["dt"].weekday() == 4 and 15 <= x["dt"].day <= 21])
    out["q4_earnings_oct"] = stats([x["ret"] for x in dl if x["dt"].month == 10 and x["dt"].day >= 15])
    out["q4_earnings_nov"] = stats([x["ret"] for x in dl if x["dt"].month == 11 and x["dt"].day <= 15])
    return out

if __name__ == "__main__":
    main()
