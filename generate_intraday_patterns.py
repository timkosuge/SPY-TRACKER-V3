"""
generate_intraday_patterns.py
Generates intraday_patterns.js from spy_data.db intraday_bars table.

Fields per record:
  d    = date
  g    = gap % (open vs prev_close)
  gt   = gap type (GAP_UP / GAP_DOWN / FLAT)
  gf   = gap filled bool (null if flat)
  f3d  = first-30min direction (UP/DOWN)
  f3r  = first-30min return %
  f3v  = first-30min volume
  fhh  = first-hour high
  fhl  = first-hour low
  fhv  = first-hour volume
  st   = session trend label (TREND_UP / TREND_DOWN / RANGE / REVERSAL_UP / REVERSAL_DOWN)
  fl   = false breakout (OR break that reversed by close)
  dr   = day range $ (H-L)
  cp   = close position 0-1
  ocp  = open-to-close %
  o/h/l/c = OHLC
  pc   = prev_close
"""

import sqlite3, json
from datetime import date, timedelta
from collections import defaultdict

DB_PATH = 'spy_data.db'
OUT_PATH = 'intraday_patterns.js'

def classify_session(open_p, close_p, high_p, low_p, first30_close, prev_close):
    """Classify session type."""
    oc = (close_p - open_p) / open_p * 100 if open_p else 0
    intraday_range = (high_p - low_p) / open_p * 100 if open_p else 0
    
    # Reversal: first 30 went one way, day ended opposite
    f30_dir = 'UP' if first30_close >= open_p else 'DOWN'
    day_dir = 'UP' if close_p >= open_p else 'DOWN'
    is_reversal = f30_dir != day_dir
    
    if is_reversal and day_dir == 'UP':
        return 'REVERSAL_UP'
    if is_reversal and day_dir == 'DOWN':
        return 'REVERSAL_DOWN'
    if oc > 0.5:
        return 'TREND_UP'
    if oc < -0.5:
        return 'TREND_DOWN'
    return 'RANGE'

def main():
    conn = sqlite3.connect(DB_PATH)
    
    # Pull all daily OHLCV
    daily = {}
    for row in conn.execute('SELECT date, open, high, low, close FROM daily_ohlcv').fetchall():
        daily[row[0]] = {'o': row[1], 'h': row[2], 'l': row[3], 'c': row[4]}
    
    # Sorted dates for prev_close lookup
    sorted_dates = sorted(daily.keys())
    prev_close_map = {}
    for i, d in enumerate(sorted_dates):
        if i > 0:
            prev_close_map[d] = daily[sorted_dates[i-1]]['c']
    
    # Get all dates with intraday bars
    bar_dates = [r[0] for r in conn.execute(
        'SELECT DISTINCT date FROM intraday_bars ORDER BY date DESC'
    ).fetchall()]
    
    records = []
    for d_str in bar_dates:
        day = daily.get(d_str)
        if not day or not day['o'] or not day['c']:
            continue
        
        pc = prev_close_map.get(d_str)
        o, h, l, c = day['o'], day['h'], day['l'], day['c']
        
        # Gap
        gap_pct = round((o - pc) / pc * 100, 3) if pc else None
        if gap_pct is None:      gt = None
        elif gap_pct > 0.25:     gt = 'GAP_UP'
        elif gap_pct < -0.25:    gt = 'GAP_DOWN'
        else:                    gt = 'FLAT'
        
        # Gap fill
        gf = None
        if gt == 'GAP_UP' and pc:
            bars_all = conn.execute(
                'SELECT low FROM intraday_bars WHERE date=? ORDER BY timestamp', (d_str,)
            ).fetchall()
            gf = any(r[0] <= pc for r in bars_all)
        elif gt == 'GAP_DOWN' and pc:
            bars_all = conn.execute(
                'SELECT high FROM intraday_bars WHERE date=? ORDER BY timestamp', (d_str,)
            ).fetchall()
            gf = any(r[0] >= pc for r in bars_all)
        
        # First 30 min bars (9:30–9:59 ET = stored as 09:30–09:59)
        f30_bars = conn.execute(
            "SELECT open, high, low, close, volume FROM intraday_bars "
            "WHERE date=? AND timestamp >= '09:30' AND timestamp <= '09:59' ORDER BY timestamp",
            (d_str,)
        ).fetchall()
        
        f3d = None; f3r = None; f3v = None
        if f30_bars:
            f30_open  = f30_bars[0][0]
            f30_close = f30_bars[-1][3]
            f3v = int(sum(r[4] or 0 for r in f30_bars))
            if f30_open:
                f3r = round((f30_close - f30_open) / f30_open * 100, 3)
                f3d = 'UP' if f3r >= 0 else 'DOWN'
        
        # First hour bars (9:30–10:29)
        fh_bars = conn.execute(
            "SELECT high, low, volume FROM intraday_bars "
            "WHERE date=? AND timestamp >= '09:30' AND timestamp <= '10:29' ORDER BY timestamp",
            (d_str,)
        ).fetchall()
        
        fhh = round(max(r[0] for r in fh_bars), 2) if fh_bars else None
        fhl = round(min(r[1] for r in fh_bars), 2) if fh_bars else None
        fhv = int(sum(r[2] or 0 for r in fh_bars)) if fh_bars else None
        
        # Session trend
        f30_close_val = f30_bars[-1][3] if f30_bars else o
        st = classify_session(o, c, h, l, f30_close_val, pc)
        
        # OR range & false breakout
        or_bars = conn.execute(
            "SELECT high, low, close FROM intraday_bars "
            "WHERE date=? AND timestamp >= '09:30' AND timestamp <= '09:59' ORDER BY timestamp",
            (d_str,)
        ).fetchall()
        or_high = max(r[0] for r in or_bars) if or_bars else h
        or_low  = min(r[1] for r in or_bars) if or_bars else l
        
        # False breakout: price broke OR but closed back inside
        fl = False
        if or_bars:
            post_or = conn.execute(
                "SELECT high, low, close FROM intraday_bars "
                "WHERE date=? AND timestamp >= '10:00' ORDER BY timestamp",
                (d_str,)
            ).fetchall()
            if post_or:
                broke_up = any(r[0] > or_high for r in post_or)
                broke_dn = any(r[1] < or_low  for r in post_or)
                day_close = post_or[-1][2]
                if broke_up and day_close < or_high:
                    fl = True
                elif broke_dn and day_close > or_low:
                    fl = True
        
        # Day stats
        dr   = round(h - l, 2) if h and l else None
        cp   = round((c - l) / (h - l), 3) if h and l and h != l else None
        ocp  = round((c - o) / o * 100, 3) if o else None
        
        rec = {
            'd':   d_str,
            'g':   gap_pct,
            'gt':  gt,
            'gf':  gf,
            'f3d': f3d,
            'f3r': f3r,
            'f3v': f3v,
            'fhh': fhh,
            'fhl': fhl,
            'fhv': fhv,
            'st':  st,
            'fl':  fl,
            'dr':  dr,
            'cp':  cp,
            'ocp': ocp,
            'o':   round(o, 2),
            'h':   round(h, 2),
            'l':   round(l, 2),
            'c':   round(c, 2),
            'pc':  round(pc, 2) if pc else None,
        }
        records.append(rec)
    
    conn.close()
    
    with open(OUT_PATH, 'w') as f:
        f.write('const INTRADAY_PATTERNS = ')
        json.dump(records, f, separators=(',', ':'))
        f.write(';\n')
    
    print(f'intraday_patterns.js: {len(records)} records')
    if records:
        dates = sorted(r['d'] for r in records)
        print(f'  Range: {dates[0]} → {dates[-1]}')

if __name__ == '__main__':
    main()
