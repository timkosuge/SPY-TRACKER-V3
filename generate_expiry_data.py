"""
generate_expiry_data.py
Generates expiry_data.js from spy_data.db — all trading days with expiry metadata.
Run after fetch_and_analyze.py so the DB is current.

Fields per record:
  d   = date (YYYY-MM-DD)
  dow = weekday number (1=Mon..5=Fri)
  dn  = weekday name abbreviated
  mo  = true if 3rd Friday of month (monthly OPEX)
  g   = gap % from prev close to open
  r   = return % (prev close to close)
  dr  = day range $ (high - low)
  cp  = close position 0-1 (0=LOD, 1=HOD)
  gf  = gap filled same day (bool, null if no gap)
  o/h/l/c = OHLC
  pc  = prev close
"""

import sqlite3, json, math
from datetime import date, timedelta

DB_PATH = 'spy_data.db'
OUT_PATH = 'expiry_data.js'

DOW_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

def is_monthly_opex(d):
    """3rd Friday of the month."""
    if d.weekday() != 4:  # not Friday
        return False
    # Count Fridays in this month up to this date
    first = d.replace(day=1)
    friday_count = 0
    cur = first
    while cur <= d:
        if cur.weekday() == 4:
            friday_count += 1
        cur += timedelta(days=1)
    return friday_count == 3

def main():
    conn = sqlite3.connect(DB_PATH)
    
    # Pull all daily data sorted oldest first
    rows = conn.execute(
        'SELECT date, open, high, low, close, volume FROM daily_ohlcv ORDER BY date ASC'
    ).fetchall()
    
    if not rows:
        print('No data in DB')
        return
    
    # Build prev_close lookup
    records = []
    prev_close = None
    prev_open = None
    
    for row in rows:
        d_str, o, h, l, c, vol = row
        if not o or not c or not h or not l:
            prev_close = c
            continue
        
        d = date.fromisoformat(d_str)
        dow = d.isoweekday()  # 1=Mon..7=Sun; we only have weekdays so 1-5
        dn = DOW_NAMES[dow] if dow <= 5 else ''
        mo = is_monthly_opex(d)
        
        # Gap from prev close to today's open
        gap_pct = None
        gf = None
        if prev_close and o:
            gap_pct = round((o - prev_close) / prev_close * 100, 3)
            # Gap fill: did price trade back to prev_close during the day?
            if gap_pct > 0.25 and prev_close:
                gf = bool(l <= prev_close)
            elif gap_pct < -0.25 and prev_close:
                gf = bool(h >= prev_close)
            # else flat gap, gf stays None
        
        # Return: prev close to today's close
        ret = None
        if prev_close and c:
            ret = round((c - prev_close) / prev_close * 100, 3)
        
        # Day range $
        dr = round(h - l, 2) if h and l else None
        
        # Close position (0=LOD, 1=HOD)
        cp = None
        if h and l and c and h != l:
            cp = round((c - l) / (h - l), 3)
        
        rec = {
            'd':   d_str,
            'dow': dow,
            'dn':  dn,
            'mo':  mo,
            'g':   gap_pct,
            'r':   ret,
            'dr':  dr,
            'cp':  cp,
            'gf':  gf,
            'o':   round(o, 2) if o else None,
            'h':   round(h, 2) if h else None,
            'l':   round(l, 2) if l else None,
            'c':   round(c, 2) if c else None,
            'pc':  round(prev_close, 2) if prev_close else None,
        }
        records.append(rec)
        prev_close = c
        prev_open = o
    
    conn.close()
    
    # Sort newest first (matches existing format)
    records.reverse()
    
    with open(OUT_PATH, 'w') as f:
        f.write('const EXPIRY_DATA = ')
        json.dump(records, f, separators=(',', ':'))
        f.write(';\n')
    
    print(f'expiry_data.js: {len(records)} records, {records[-1]["d"]} → {records[0]["d"]}')

if __name__ == '__main__':
    main()
