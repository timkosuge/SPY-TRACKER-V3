"""
generate_analog.py — Auto-runs daily in GitHub Actions after fetch_and_analyze.py
Finds optimal anchor date + top 5 historical analogs, writes analog_data.js
"""
import sqlite3, math, json
from datetime import date, timedelta

DB_PATH  = 'spy_data.db'
OUT_PATH = 'analog_data.js'

def add_td(start, n):
    d = date.fromisoformat(start)
    c = 0
    while c < n:
        d += timedelta(days=1)
        if d.weekday() < 5: c += 1
    return d.isoformat()

def pearson(a, b):
    n = len(a)
    if n < 10: return 0
    ma, mb = sum(a)/n, sum(b)/n
    num = sum((a[i]-ma)*(b[i]-mb) for i in range(n))
    da  = math.sqrt(sum((x-ma)**2 for x in a))
    db  = math.sqrt(sum((x-mb)**2 for x in b))
    return num/(da*db) if da*db else 0

def rmse(a, b):
    n = len(a)
    return math.sqrt(sum((a[i]-b[i])**2 for i in range(n))/n)

def score(corr, rm):
    return round(((corr+1)/2)*100*0.6 + max(0,(1-rm/5))*100*0.4, 2)

def main():
    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()
    cur.execute('SELECT date, open, high, low, close, volume FROM daily_ohlcv ORDER BY date')
    rows   = cur.fetchall()
    conn.close()

    dates  = [r[0] for r in rows]
    closes = [r[4] for r in rows]
    today  = dates[-1]
    ti     = len(dates)-1

    print(f"DB: {dates[0]} to {today} ({len(dates)} days)")

    # ── Step 1: Find optimal anchor (scan last 12mo to 4mo ago) ──────────────
    a_start = next((i for i,d in enumerate(dates) if d >= (date.fromisoformat(today)-timedelta(days=365)).isoformat()), 0)
    a_end   = next((i for i,d in enumerate(dates) if d >= (date.fromisoformat(today)-timedelta(days=120)).isoformat()), ti-60)

    best_anc, best_sc = None, -999
    for win in [60, 75, 86, 100, 120]:
        for ai in range(a_start, min(a_end, ti-win+1)):
            cp = closes[ai:ai+win]
            if len(cp) < win: continue
            cp_pct = [(c/cp[0]-1)*100 for c in cp]
            lim = ai - 252
            for hi in range(0, lim-win):
                hc = closes[hi:hi+win]
                if len(hc) < win or hc[0]==0: continue
                hp = [(c/hc[0]-1)*100 for c in hc]
                sc = score(pearson(cp_pct, hp), rmse(cp_pct, hp))
                if sc > best_sc:
                    best_sc = sc
                    best_anc = (dates[ai], ai, win)

    anc_date, anc_idx, _ = best_anc
    print(f"Optimal anchor: {anc_date} (sub-window score={best_sc:.1f}%)")

    # ── Step 2: Full elapsed window ───────────────────────────────────────────
    win     = ti - anc_idx + 1
    cp      = closes[anc_idx:ti+1]
    anc_px  = cp[0]
    cp_pct  = [(c/anc_px-1)*100 for c in cp]

    # ── Step 3: Top 5 distinct analogs ───────────────────────────────────────
    results = []
    lim = anc_idx - 252
    for hi in range(0, lim-win):
        hc = closes[hi:hi+win]
        if len(hc) < win or hc[0]==0: continue
        hp = [(c/hc[0]-1)*100 for c in hc]
        co = pearson(cp_pct, hp)
        rm = rmse(cp_pct, hp)
        results.append((score(co,rm), dates[hi], hi, co, rm))
    results.sort(reverse=True)

    distinct = []
    for r in results:
        if not any(abs(r[2]-d[2]) < win for d in distinct):
            distinct.append(r)
        if len(distinct) == 5: break

    # ── Step 4: Build analog objects ─────────────────────────────────────────
    colors = ['#00ff88','#ff8800','#8855ff','#00ccff','#ff3355']
    months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    cur_px = closes[ti]
    analogs = []

    for idx, (sc, hd, hi, co, rm) in enumerate(distinct):
        mn   = int(hd[5:7])
        name = f"{months[mn-1]} {hd[:4]}"
        hr   = rows[hi:hi+win+252]
        h_anc = hr[0][4]

        hist = [{'day':i+1,'date':hr[i][0],'close':round(hr[i][4],2),
                 'pct':round((hr[i][4]/h_anc-1)*100,4)} for i in range(min(win,len(hr)))]

        proj = []
        spy  = cur_px
        for i in range(win, len(hr)):
            prev = hr[i-1][4]; curr = hr[i][4]
            if prev == 0: continue
            chg  = (curr-prev)/prev
            spy  = spy*(1+chg)
            da   = i-win+1
            proj.append({'day':win+da,'days_ahead':da,'est_date':add_td(today,da),
                         'ref_date':hr[i][0],'pct_analog':round((curr/h_anc-1)*100,4),
                         'day_chg':round(chg*100,4),'proj_spy':round(spy,2),
                         'pct_from_now':round((spy/cur_px-1)*100,4),
                         'pct_from_anchor25':round((spy/anc_px-1)*100,4)})
            if da >= 252: break

        ms = {}
        if proj:
            pi = max(range(len(proj)), key=lambda i: proj[i]['proj_spy'])
            ms['peak'] = {'day':proj[pi]['day'],'est_date':proj[pi]['est_date'],
                          'proj_spy':proj[pi]['proj_spy'],'pct_from_now':proj[pi]['pct_from_now'],
                          'label':'Peak','color':'#00ff88'}
            aft = proj[pi+1:]
            if aft:
                ti2 = min(range(len(aft)), key=lambda i: aft[i]['proj_spy'])
                ms['trough'] = {'day':aft[ti2]['day'],'est_date':aft[ti2]['est_date'],
                                'proj_spy':aft[ti2]['proj_spy'],'pct_from_now':aft[ti2]['pct_from_now'],
                                'label':'Trough','color':'#ff3355'}
            ms['yearend'] = {'day':proj[-1]['day'],'est_date':proj[-1]['est_date'],
                             'proj_spy':proj[-1]['proj_spy'],'pct_from_now':proj[-1]['pct_from_now'],
                             'label':'~1yr','color':'var(--cyan)'}

        analogs.append({'name':name,'start_date':hd,'end_date':dates[hi+win-1],
                        'color':colors[idx],'corr':round(co,4),'rmse':round(rm,4),
                        'score':sc,'anchor_price':round(h_anc,2),
                        'hist':hist,'proj':proj[:252],'milestones':ms})
        print(f"  {name}: {sc:.1f}% | proj 30d=${proj[29]['proj_spy']:.2f} 60d=${proj[59]['proj_spy']:.2f}")

    cur_data = [{'day':i+1,'date':dates[anc_idx+i],'close':round(closes[anc_idx+i],2),
                 'pct':round(cp_pct[i],4)} for i in range(win)]

    def cons(td):
        ps = [a['proj'][td-1]['proj_spy'] for a in analogs if len(a['proj'])>=td]
        return round(sum(ps)/len(ps),2) if ps else 0

    out = {
        'generated': today, 'method': 'optimal_anchor_auto',
        'optimal_anchor': {'date':anc_date,'price':round(anc_px,2)},
        'current': {'anchor_date':anc_date,'anchor_price':round(anc_px,2),
                    'current_date':today,'current_price':round(cur_px,2),
                    'current_day':win,'current_pct':round(cp_pct[-1],4),'data':cur_data},
        'analogs': analogs,
        'consensus': {k:{'price':cons(td),'est_date':add_td(today,td)}
                      for k,td in [('30d',30),('60d',60),('90d',90),('120d',120)]}
    }

    with open(OUT_PATH,'w') as f:
        f.write('const ANALOG_DATA = ')
        json.dump(out, f, separators=(',',':'))
        f.write(';\n')

    sz = len(json.dumps(out))
    print(f"\n✓ {OUT_PATH}: {sz//1024}KB")
    print(f"Consensus: 30d=${cons(30):.2f} | 60d=${cons(60):.2f} | 90d=${cons(90):.2f}")

if __name__ == '__main__':
    main()
