"""
generate_relief_data.py
Generates relief_data.js from spy_data.db.

Algorithm:
  - Scan for clean pullbacks of the specified depth from a rolling 20-day peak.
  - "Clean" = no single day's rally exceeds 1.5% of the drop threshold during the decline.
  - Track the subsequent bounce from trough until price stalls (drops >1% from bounce high).
  - Bucket bounces by SIZE and DURATION — not Fibonacci levels.
  - Compute failure rate (bounce <2%), sustained rate (>10 days), forward returns.

Output schema per threshold:
{
  count, avg_drop, avg_days_drop,
  avg_bounce_pct, med_bounce_pct, pct_25_bounce, pct_75_bounce,
  avg_days_bounce, med_days_bounce,
  failed_pct,       # bounce ended <2%
  small_pct,        # 2-5%
  medium_pct,       # 5-10%
  large_pct,        # 10-20%
  xlarge_pct,       # >20%
  quick_pct,        # <3 days
  brief_pct,        # 3-10 days
  sustained_pct,    # 10-30 days
  extended_pct,     # >30 days
  size_buckets: [{label, count, pct, avg_days, avg_fwd_1mo}]
  dur_buckets:  [{label, count, pct, avg_bounce, avg_fwd_1mo}]
  fwd: {1mo: {avg, win, n}, 2mo: ..., 3mo: ...}
  events: [most recent 15]
}
"""

import sqlite3, json, statistics
from datetime import date, timedelta

DB_PATH      = 'spy_data.db'
OUT_PATH     = 'relief_data.js'
THRESHOLDS   = [2, 5, 7, 10]
PEAK_WINDOW  = 20     # rolling high lookback
MAX_INTERLUDE = 0.015 # max single-day bounce allowed during the drop (1.5%)
BOUNCE_END_DD = 0.01  # bounce ends when price drops >1% from its intraday high

FWD_WINDOWS = {'1mo': 21, '2mo': 42, '3mo': 63}

SIZE_BUCKETS = [
    {'label': '<2%  (failed)',  'lo': 0,   'hi': 2},
    {'label': '2–5%',           'lo': 2,   'hi': 5},
    {'label': '5–10%',          'lo': 5,   'hi': 10},
    {'label': '10–20%',         'lo': 10,  'hi': 20},
    {'label': '>20%',           'lo': 20,  'hi': 9999},
]

DUR_BUCKETS = [
    {'label': '1–2 days  (quick)',    'lo': 0,  'hi': 3},
    {'label': '3–10 days  (brief)',   'lo': 3,  'hi': 11},
    {'label': '11–30 days  (sustained)', 'lo': 11, 'hi': 31},
    {'label': '>30 days  (extended)', 'lo': 31, 'hi': 9999},
]


def pct_rank(values, v):
    """What percent of values are <= v."""
    if not values:
        return None
    return round(sum(1 for x in values if x <= v) / len(values) * 100, 1)


def med(lst):
    return round(statistics.median(lst), 2) if lst else None


def avg(lst):
    return round(sum(lst) / len(lst), 2) if lst else None


def main():
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        'SELECT date, open, high, low, close FROM daily_ohlcv '
        'WHERE close IS NOT NULL ORDER BY date ASC'
    ).fetchall()
    conn.close()

    if not rows:
        print('No data')
        return

    dates  = [r[0] for r in rows]
    opens  = [r[1] for r in rows]
    highs  = [r[2] for r in rows]
    lows   = [r[3] for r in rows]
    closes = [r[4] for r in rows]
    n      = len(closes)

    # ── Find relief rally events for each threshold ─────────────────────────
    all_results = {}

    for thresh in THRESHOLDS:
        clean_interlude = thresh * MAX_INTERLUDE  # max 1-day bounce % during drop

        events = []
        i = PEAK_WINDOW

        while i < n:
            # Rolling peak
            window_high = max(closes[max(0, i - PEAK_WINDOW):i + 1])
            c = closes[i]
            dd_from_peak = (c - window_high) / window_high * 100

            if dd_from_peak > -thresh:
                i += 1
                continue

            # We hit the threshold — record peak
            peak_val  = window_high
            peak_idx  = closes.index(window_high, max(0, i - PEAK_WINDOW), i + 1)
            peak_date = dates[peak_idx]

            # Walk forward to find trough — abort if a 1-day bounce exceeds clean_interlude
            trough_val  = c
            trough_idx  = i
            trough_date = dates[i]
            clean = True

            j = i + 1
            while j < n:
                daily_chg = (closes[j] - closes[j - 1]) / closes[j - 1] * 100
                if daily_chg > clean_interlude and closes[j] > trough_val:
                    # Interlude bounce exceeded — this is not a clean drop
                    if closes[j - 1] < trough_val:
                        # snap to previous trough
                        trough_val  = closes[j - 1]
                        trough_idx  = j - 1
                        trough_date = dates[j - 1]
                    # Allow the first bounce attempt; track where it leads
                    break
                if closes[j] < trough_val:
                    trough_val  = closes[j]
                    trough_idx  = j
                    trough_date = dates[j]
                if closes[j] >= peak_val:
                    break  # recovered to peak during drop scan — unusual
                j += 1

            actual_drop = (trough_val - peak_val) / peak_val * 100  # negative
            if actual_drop > -thresh:
                i = j + 1
                continue

            # ── Track the bounce from trough ────────────────────────────────
            # Bounce ends when: price drops >1% from bounce high, OR 63 trading days pass
            bounce_high     = trough_val
            bounce_high_idx = trough_idx
            bounce_end_idx  = trough_idx
            bounce_end_val  = trough_val

            k = trough_idx + 1
            while k < min(n, trough_idx + 64):
                if highs[k] > bounce_high:
                    bounce_high     = highs[k]
                    bounce_high_idx = k
                # End when close drops >1% below the running high
                if closes[k] < bounce_high * (1 - BOUNCE_END_DD):
                    bounce_end_idx = k
                    bounce_end_val = closes[k]
                    break
                bounce_end_idx = k
                bounce_end_val = closes[k]
                k += 1

            bounce_pct  = (bounce_high - trough_val) / trough_val * 100
            days_bounce = bounce_high_idx - trough_idx  # days to reach bounce high

            # ── Forward returns from trough ──────────────────────────────────
            fwd = {}
            for key, td in FWD_WINDOWS.items():
                fwd_idx = trough_idx + td
                if fwd_idx < n:
                    fwd[key] = round((closes[fwd_idx] - trough_val) / trough_val * 100, 2)
                else:
                    fwd[key] = None

            events.append({
                'peak_date':   peak_date,
                'trough_date': trough_date,
                'bounce_date': dates[bounce_high_idx],
                'drop_pct':    round(abs(actual_drop), 2),
                'days_drop':   trough_idx - peak_idx,
                'bounce_pct':  round(bounce_pct, 2),
                'days_bounce': days_bounce,
                '1mo':  fwd.get('1mo'),
                '2mo':  fwd.get('2mo'),
                '3mo':  fwd.get('3mo'),
            })

            # Skip ahead past the bounce to avoid double-counting
            i = bounce_end_idx + 1

        # ── Aggregate ────────────────────────────────────────────────────────
        if not events:
            all_results[str(thresh)] = {'count': 0}
            continue

        bounce_pcts  = [e['bounce_pct']  for e in events]
        days_bounces = [e['days_bounce'] for e in events]
        drop_pcts    = [e['drop_pct']    for e in events]
        days_drops   = [e['days_drop']   for e in events]

        # Size buckets
        size_buckets_out = []
        for sb in SIZE_BUCKETS:
            subset = [e for e in events if sb['lo'] <= e['bounce_pct'] < sb['hi']]
            fwd1 = [e['1mo'] for e in subset if e['1mo'] is not None]
            size_buckets_out.append({
                'label':       sb['label'],
                'count':       len(subset),
                'pct':         round(len(subset) / len(events) * 100, 1),
                'avg_days':    avg([e['days_bounce'] for e in subset]) or 0,
                'avg_fwd_1mo': avg(fwd1),
            })

        # Duration buckets
        dur_buckets_out = []
        for db in DUR_BUCKETS:
            subset = [e for e in events if db['lo'] <= e['days_bounce'] < db['hi']]
            fwd1 = [e['1mo'] for e in subset if e['1mo'] is not None]
            dur_buckets_out.append({
                'label':        db['label'],
                'count':        len(subset),
                'pct':          round(len(subset) / len(events) * 100, 1),
                'avg_bounce':   avg([e['bounce_pct'] for e in subset]) or 0,
                'avg_fwd_1mo':  avg(fwd1),
            })

        # Forward return aggregates
        fwd_agg = {}
        for key in ('1mo', '2mo', '3mo'):
            vals = [e[key] for e in events if e[key] is not None]
            fwd_agg[key] = {
                'avg': avg(vals),
                'win': round(sum(1 for v in vals if v > 0) / len(vals) * 100) if vals else None,
                'n':   len(vals),
            }

        # Percentiles
        sorted_bp = sorted(bounce_pcts)
        p25 = sorted_bp[len(sorted_bp) // 4]
        p75 = sorted_bp[3 * len(sorted_bp) // 4]

        all_results[str(thresh)] = {
            'count':          len(events),
            'avg_drop':       avg(drop_pcts),
            'avg_days_drop':  avg(days_drops),
            'avg_bounce_pct': avg(bounce_pcts),
            'med_bounce_pct': med(bounce_pcts),
            'pct_25_bounce':  round(p25, 2),
            'pct_75_bounce':  round(p75, 2),
            'avg_days_bounce': avg(days_bounces),
            'med_days_bounce': med(days_bounces),
            # Quick summary pcts
            'failed_pct':    round(sum(1 for b in bounce_pcts if b < 2)   / len(events) * 100, 1),
            'small_pct':     round(sum(1 for b in bounce_pcts if 2 <= b < 5)  / len(events) * 100, 1),
            'medium_pct':    round(sum(1 for b in bounce_pcts if 5 <= b < 10) / len(events) * 100, 1),
            'large_pct':     round(sum(1 for b in bounce_pcts if 10 <= b < 20)/ len(events) * 100, 1),
            'xlarge_pct':    round(sum(1 for b in bounce_pcts if b >= 20)     / len(events) * 100, 1),
            'quick_pct':     round(sum(1 for d in days_bounces if d < 3)  / len(events) * 100, 1),
            'brief_pct':     round(sum(1 for d in days_bounces if 3 <= d < 11)/ len(events) * 100, 1),
            'sustained_pct': round(sum(1 for d in days_bounces if 11 <= d < 31)/len(events) * 100, 1),
            'extended_pct':  round(sum(1 for d in days_bounces if d >= 31) / len(events) * 100, 1),
            'size_buckets':  size_buckets_out,
            'dur_buckets':   dur_buckets_out,
            'fwd':           fwd_agg,
            'events':        list(reversed(events))[:20],  # most recent first
        }

    meta = {
        'date_range': {'start': dates[0], 'end': dates[-1]},
        'generated':  date.today().isoformat(),
    }

    output = {'meta': meta, **all_results}

    with open(OUT_PATH, 'w') as f:
        f.write('const RELIEF_DATA = ')
        json.dump(output, f, separators=(',', ':'))
        f.write(';\n')

    for t in THRESHOLDS:
        k = str(t)
        if k in all_results and all_results[k].get('count'):
            d = all_results[k]
            print(f"≥{t}%: {d['count']} events | avg bounce {d['avg_bounce_pct']}% "
                  f"(med {d['med_bounce_pct']}%) | avg {d['avg_days_bounce']}d | "
                  f"failed {d['failed_pct']}% | sustained {d['sustained_pct']}%")
    print(f'Written: {OUT_PATH}')


if __name__ == '__main__':
    main()
