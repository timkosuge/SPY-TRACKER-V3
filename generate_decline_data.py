"""
generate_decline_data.py
Generates decline_data.js from spy_data.db.
Counts decline events from any 20-day rolling peak (matches original 156-event count).
"""

import sqlite3, json
from datetime import date

DB_PATH = 'spy_data.db'
OUT_PATH = 'decline_data.js'
THRESHOLDS = [2, 5, 10, 15, 20, 25, 30]
PEAK_WINDOW = 20  # rolling high window

def main():
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        'SELECT date, close FROM daily_ohlcv WHERE close IS NOT NULL ORDER BY date ASC'
    ).fetchall()
    conn.close()
    
    if not rows:
        print('No data')
        return
    
    dates  = [r[0] for r in rows]
    closes = [r[1] for r in rows]
    n = len(closes)
    
    # ── Find drawdown events ────────────────────────────────────────────────
    # An event: close drops >= 2% from the rolling 20-day high (or ATH, whichever higher)
    # We track: peak -> trough -> recovery (close back above peak)
    events = []
    i = PEAK_WINDOW
    
    while i < n:
        # Rolling peak over last PEAK_WINDOW days
        window_high = max(closes[max(0, i-PEAK_WINDOW):i+1])
        c = closes[i]
        
        dd_from_peak = (c - window_high) / window_high * 100
        
        if dd_from_peak <= -2.0:
            # We're in a drawdown — find trough and recovery
            event_peak_val = window_high
            event_peak_idx = closes.index(window_high, max(0, i-PEAK_WINDOW), i+1)
            event_peak_date = dates[event_peak_idx]
            
            trough_val  = c
            trough_idx  = i
            trough_date = dates[i]
            
            j = i + 1
            while j < n:
                if closes[j] < trough_val:
                    trough_val  = closes[j]
                    trough_idx  = j
                    trough_date = dates[j]
                if closes[j] >= event_peak_val:
                    break  # recovered
                j += 1
            
            recovery_date = dates[j] if j < n else None
            dd_pct = abs((trough_val - event_peak_val) / event_peak_val * 100)
            
            events.append({
                'peak_date':     event_peak_date,
                'trough_date':   trough_date,
                'recovery_date': recovery_date,
                'dd_pct':        round(dd_pct, 2),
                'peak_val':      round(event_peak_val, 2),
                'trough_val':    round(trough_val, 2),
                'duration_td':   trough_idx - event_peak_idx,
                'recovery_td':   (j - trough_idx) if j < n else None,
                'total_td':      (j - event_peak_idx) if j < n else None,
            })
            
            # Skip ahead to after recovery to avoid double-counting
            i = j + 1
        else:
            i += 1
    
    total_events = len(events)
    
    # ── Aggregate stats ─────────────────────────────────────────────────────
    aggregate = {}
    for thresh in THRESHOLDS:
        above = [e for e in events if e['dd_pct'] >= thresh]
        nv = len(above)
        if not nv:
            aggregate[str(thresh)] = {'n': 0}
            continue
        recovered = [e for e in above if e['recovery_td'] is not None]
        row = {
            'n': nv,
            'avg_days_to_trough': round(sum(e['duration_td'] for e in above) / nv),
            'max_days_to_trough': max(e['duration_td'] for e in above),
            'avg_recovery_td':    round(sum(e['recovery_td'] for e in recovered) / len(recovered)) if recovered else None,
            'max_recovery_td':    max(e['recovery_td'] for e in recovered) if recovered else None,
            'avg_total_td':       round(sum(e['total_td'] for e in recovered) / len(recovered)) if recovered else None,
            'max_total_td':       max(e['total_td'] for e in recovered) if recovered else None,
            'pct_recovered':      round(len(recovered) / nv * 100, 1),
        }
        for t2 in THRESHOLDS:
            if t2 > thresh:
                row[f'cond_to_{t2}'] = round(len([e for e in above if e['dd_pct'] >= t2]) / nv * 100, 1)
        aggregate[str(thresh)] = row
    
    output = {
        'date_range':       {'start': dates[0], 'end': dates[-1]},
        'total_events_2pct': total_events,
        'aggregate':        aggregate,
        'drawdowns':        events,
    }
    
    with open(OUT_PATH, 'w') as f:
        f.write('const DECLINE_DATA = ')
        json.dump(output, f, separators=(',', ':'))
        f.write(';\n')
    
    print(f'decline_data.js: {total_events} events, {dates[0]} → {dates[-1]}')

if __name__ == '__main__':
    main()
