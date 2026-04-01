"""
generate_window_stats.py
W1: 9:45-11:00 CT  /  W2: 12:45-14:00 CT
Full pattern breakdown: gap context, day direction at entry, reversal/continuation,
move bins, cross table. Lookback x DOW filters.
"""
import sqlite3, json, statistics
from datetime import date, datetime, timedelta
from collections import defaultdict

DB_PATH  = 'spy_data.db'
OUT_PATH = 'window_stats.js'

W1_START, W1_END   = '09:45', '11:00'
W2_START, W2_END   = '12:45', '14:00'
POST_W1_END        = '12:45'
POST_W2_END        = '15:00'
GAP_THRESH         = 0.15
ENTRY_THRESH       = 0.10

def _avg(lst):  return round(statistics.mean(lst), 3) if lst else None
def _med(lst):  return round(statistics.median(lst), 3) if lst else None

def extract_window(bars, ts0, ts1):
    w = [b for b in bars if ts0 <= b[0] < ts1]
    if not w: return None
    o=w[0][1]; cl=w[-1][4]
    hi=max(b[2] for b in w); lo=min(b[3] for b in w)
    move=(cl-o)/o*100; rng=(hi-lo)/o*100
    mx_up=(hi-o)/o*100; mx_dn=(o-lo)/o*100
    dom='up' if mx_up>mx_dn else 'down'
    return dict(open=o, close=cl, high=hi, low=lo, move=move, range=rng,
                max_up=mx_up, max_dn=mx_dn,
                reversal=(dom=='up' and move<0) or (dom=='down' and move>0),
                squeeze=rng<0.15)

def build_sessions(conn):
    today_str = date.today().isoformat()
    # open/close/gap from daily_ohlcv
    daily = {}
    for date_str, open_p, close_p, prev_close in conn.execute('''
        SELECT d.date, d.open, d.close,
               LAG(d.close) OVER (ORDER BY d.date) AS prev_close
        FROM daily_ohlcv d ORDER BY d.date
    ''').fetchall():
        if not open_p or not close_p: continue
        gap = (open_p - prev_close) / prev_close * 100 if prev_close else 0
        cat = 'GAP_UP' if gap > GAP_THRESH else ('GAP_DOWN' if gap < -GAP_THRESH else 'FLAT')
        daily[date_str] = dict(open=open_p, close=close_p, gap_pct=round(gap,3), gap_cat=cat)
    # or_break from intraday_session_stats if available
    or_breaks = {}
    try:
        for r in conn.execute('SELECT date, or_break_dir FROM intraday_session_stats').fetchall():
            or_breaks[r[0]] = r[1] or 'NONE'
    except: pass
    # 1m bars
    day_bars = defaultdict(list)
    for r in conn.execute(
        'SELECT date,timestamp,open,high,low,close,volume FROM intraday_bars ORDER BY date,timestamp'
    ).fetchall():
        day_bars[r[0]].append(r[1:])

    sessions = []
    for date_str, bars in sorted(day_bars.items()):
        if date_str == today_str or date_str not in daily: continue
        d = daily[date_str]
        open_p = d['open']; close_p = d['close']
        w1 = extract_window(bars, W1_START, W1_END)
        w2 = extract_window(bars, W2_START, W2_END)
        if not w1 or not w2: continue
        post_w1 = extract_window(bars, W1_END,      POST_W1_END)
        post_w2 = extract_window(bars, W2_END,      POST_W2_END)
        day_move = (close_p - open_p) / open_p * 100
        def entry_dir(window):
            vs = (window['open'] - open_p) / open_p * 100
            return ('UP' if vs > ENTRY_THRESH else 'DOWN' if vs < -ENTRY_THRESH else 'FLAT'), round(vs,3)
        w1_dir, w1_vs = entry_dir(w1)
        w2_dir, w2_vs = entry_dir(w2)
        sessions.append(dict(
            date=date_str, dow=datetime.strptime(date_str,'%Y-%m-%d').strftime('%a'),
            gap_cat=d['gap_cat'], gap_pct=d['gap_pct'],
            or_break=or_breaks.get(date_str,'NONE'),
            day_move=day_move,
            w1=w1, w2=w2, post_w1=post_w1, post_w2=post_w2,
            w1_dir=w1_dir, w1_vs=w1_vs, w2_dir=w2_dir, w2_vs=w2_vs,
        ))
    return sessions

def _cell(records, wkey, post_key):
    if not records: return None
    n=len(records)
    moves=[r[wkey]['move'] for r in records]
    rev_n=sum(1 for r in records if r[wkey]['reversal'])
    sq_n =sum(1 for r in records if r[wkey]['squeeze'])
    df   =sum(1 for r in records if (r[wkey]['move']>0)==(r['day_move']>0))
    has_post=[r for r in records if r.get(post_key)]
    pf = round(sum(1 for r in has_post if (r[wkey]['move']>0)==(r[post_key]['move']>0))/len(has_post)*100,1) if has_post else None
    pm = _avg([r[post_key]['move'] for r in has_post]) if has_post else None
    return dict(n=n, avg_move=_avg(moves), med_move=_med(moves),
                pct_up=round(sum(1 for m in moves if m>0)/n*100,1),
                reversal_pct=round(rev_n/n*100,1), squeeze_pct=round(sq_n/n*100,1),
                day_follow_pct=round(df/n*100,1), avg_day_move=_avg([r['day_move'] for r in records]),
                post_follow_pct=pf, post_avg_move=pm)

def _patterns(records, wkey, post_key):
    if not records: return {}
    n=len(records)
    rev =[r for r in records if     r[wkey]['reversal']]
    cont=[r for r in records if not r[wkey]['reversal']]
    sq  =[r for r in records if     r[wkey]['squeeze']]
    def df(lst):
        if not lst: return None
        return round(sum(1 for r in lst if (r[wkey]['move']>0)==(r['day_move']>0))/len(lst)*100,1)
    def ps(lst):
        h=[r for r in lst if r.get(post_key)]
        if not h: return None, None
        return (round(sum(1 for r in h if (r[wkey]['move']>0)==(r[post_key]['move']>0))/len(h)*100,1),
                _avg([r[post_key]['move'] for r in h]))
    rpf,rpm=ps(rev); cpf,cpm=ps(cont)
    return dict(
        reversal=dict(n=len(rev),pct=round(len(rev)/n*100,1),
                      avg_move=_avg([r[wkey]['move'] for r in rev]),
                      day_follow_pct=df(rev),post_follow_pct=rpf,post_avg_move=rpm),
        continuation=dict(n=len(cont),pct=round(len(cont)/n*100,1),
                          avg_move=_avg([r[wkey]['move'] for r in cont]),
                          day_follow_pct=df(cont),post_follow_pct=cpf,post_avg_move=cpm),
        squeeze=dict(n=len(sq),pct=round(len(sq)/n*100,1),day_follow_pct=df(sq)),
    )

def _context(records, wkey, post_key):
    ekey='w1_dir' if wkey=='w1' else 'w2_dir'
    by_gap  ={g: _cell([r for r in records if r['gap_cat']==g], wkey, post_key)
              for g in ('GAP_UP','FLAT','GAP_DOWN')}
    by_entry={d: _cell([r for r in records if r[ekey]==d], wkey, post_key)
              for d in ('UP','FLAT','DOWN')}
    by_or   ={d: _cell([r for r in records if r['or_break']==d], wkey, post_key)
              for d in ('UP','DOWN')}
    cross={}
    for gap in ('GAP_UP','FLAT','GAP_DOWN'):
        cross[gap]={edir: _cell([r for r in records if r['gap_cat']==gap and r[ekey]==edir],
                                wkey, post_key)
                   for edir in ('UP','FLAT','DOWN')}
    return dict(by_gap=by_gap, by_entry_dir=by_entry, by_or_break=by_or, cross_gap_entry=cross)

def _move_bins(records, wkey, post_key):
    BINS=[('<-0.6%',-99,-0.6),('-0.6–-0.4',-0.6,-0.4),('-0.4–-0.2',-0.4,-0.2),
          ('-0.2–0',-0.2,0.0),('0–+0.2',0.0,0.2),('+0.2–+0.4',0.2,0.4),
          ('+0.4–+0.6',0.4,0.6),('>+0.6%',0.6,99)]
    out=[]
    for label,lo,hi in BINS:
        sub=[r for r in records if lo<r[wkey]['move']<=hi]
        if not sub: continue
        c=_cell(sub,wkey,post_key); c['label']=label; out.append(c)
    return out

def _relationship(records):
    n=len(records)
    same=[r for r in records if (r['w1']['move']>0)==(r['w2']['move']>0)]
    opp =[r for r in records if (r['w1']['move']>0)!=(r['w2']['move']>0)]
    def df(lst,wkey):
        if not lst: return None
        return round(sum(1 for r in lst if (r[wkey]['move']>0)==(r['day_move']>0))/len(lst)*100,1)
    return dict(
        same_dir_n=len(same), same_dir_pct=round(len(same)/n*100,1) if n else 0,
        same_dir_avg_day=_avg([r['day_move'] for r in same]),
        same_dir_day_follow=df(same,'w1'),
        opp_dir_n=len(opp),  opp_dir_pct=round(len(opp)/n*100,1)  if n else 0,
        opp_dir_avg_day=_avg([r['day_move'] for r in opp]),
        opp_dir_day_follow=df(opp,'w1'),
    )

def _block(records, wkey, post_key):
    if not records: return None
    return dict(summary=_cell(records,wkey,post_key),
                patterns=_patterns(records,wkey,post_key),
                context=_context(records,wkey,post_key),
                move_bins=_move_bins(records,wkey,post_key))

def main():
    conn = sqlite3.connect(DB_PATH)
    sessions = build_sessions(conn)
    conn.close()
    if not sessions: print('window_stats.js: no sessions'); return

    today   = date.today()
    cut_12m = (today - timedelta(days=365)).isoformat()
    cut_ytd = f'{today.year}-01-01'
    LB = {'all': lambda r: True, '12m': lambda r: r['date']>=cut_12m, 'ytd': lambda r: r['date']>=cut_ytd}
    DW = {'all': lambda r: True, **{d: (lambda r,d=d: r['dow']==d) for d in ('Mon','Tue','Wed','Thu','Fri')}}

    output = {'meta': dict(
        w1_label='9:45–11:00 CT (London Close Window)',
        w2_label='12:45–14:00 CT (Pre-Power Hour Setup)',
        n_sessions=len(sessions),
        date_range=f"{sessions[0]['date']} → {sessions[-1]['date']}",
        generated=today.isoformat(),
    )}
    for lb_key, lb_fn in LB.items():
        for dow_key, dow_fn in DW.items():
            sub=[r for r in sessions if lb_fn(r) and dow_fn(r)]
            if len(sub)<5: continue
            fkey = lb_key if dow_key=='all' else f'{lb_key}_{dow_key}'
            output[fkey]=dict(n=len(sub),
                date_range=f"{sub[0]['date']} → {sub[-1]['date']}",
                w1=_block(sub,'w1','post_w1'),
                w2=_block(sub,'w2','post_w2'),
                relationship=_relationship(sub))

    with open(OUT_PATH,'w') as f:
        f.write('const WINDOW_STATS = ')
        json.dump(output, f, separators=(',',':'))
        f.write(';\n')

    d=output.get('all',{})
    if d:
        w1s=d['w1']['summary']; w2s=d['w2']['summary']
        print(f"window_stats.js: {len(sessions)} sessions {sessions[0]['date']} → {sessions[-1]['date']}")
        print(f"  W1 avg={w1s['avg_move']:+.3f}% range={w1s["avg_move"]:.3f}% rev={w1s['reversal_pct']}% day_follow={w1s['day_follow_pct']}%")
        print(f"  W2 avg={w2s['avg_move']:+.3f}% range={w2s["avg_move"]:.3f}% rev={w2s['reversal_pct']}% day_follow={w2s['day_follow_pct']}%")
        rel=d['relationship']
        print(f"  Same dir: {rel['same_dir_pct']}%  Opp: {rel['opp_dir_pct']}%")
        print(f"  Filter keys ({len([k for k in output if k!='meta'])}): {list(output.keys())[1:7]} …")

if __name__=='__main__':
    main()
