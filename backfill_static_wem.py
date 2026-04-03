"""
One-time script: adds static_wem columns to weekly_em table and seeds
next week's (2026-04-06) static WEM row from today's (2026-04-02) close.
Run once via GitHub Actions, then delete.
"""
import sqlite3, math, json
from datetime import date, timedelta

DB = "spy_data.db"
conn = sqlite3.connect(DB)
c = conn.cursor()

# ── Step 1: Apply migration ───────────────────────────────────────────────────
print("Step 1: Adding static_wem columns if missing...")
for col, typ in [('static_wem_high','REAL'),('static_wem_low','REAL'),
                 ('static_wem_range','REAL'),('static_wem_iv','REAL')]:
    try:
        c.execute(f"ALTER TABLE weekly_em ADD COLUMN {col} {typ}")
        print(f"  Added: {col}")
    except Exception:
        print(f"  Already exists: {col}")
conn.commit()

# ── Step 2: Seed next week's static WEM row ───────────────────────────────────
print("\nStep 2: Seeding next week static WEM (2026-04-06 to 2026-04-10)...")

week_start = "2026-04-06"
week_end   = "2026-04-10"

# Today's close (last available)
row = c.execute(
    "SELECT date, close FROM daily_ohlcv ORDER BY date DESC LIMIT 1"
).fetchone()
if not row:
    print("ERROR: No close price found in daily_ohlcv")
    exit(1)
print(f"  Using close: {row[0]} = {row[1]:.2f}")
fri_close = row[1]

# IV from current week
iv_row = c.execute(
    "SELECT atm_iv FROM weekly_em WHERE week_start='2026-03-30'"
).fetchone()
if not iv_row or not iv_row[0]:
    print("ERROR: No IV found for week 2026-03-30")
    exit(1)
iv = iv_row[0]
print(f"  Using IV: {iv*100:.2f}%")

# TheoTrade formula: close * iv * sqrt(6/365) * 0.70
half    = fri_close * iv * math.sqrt(6 / 365) * 0.70
s_high  = round(fri_close + half, 2)
s_low   = round(fri_close - half, 2)
s_range = round(half * 2, 2)
print(f"  Static WEM: Mid={fri_close:.2f} High={s_high} Low={s_low} ±{half:.2f}")

# Delete any wrong row that may exist, insert correct one
c.execute("DELETE FROM weekly_em WHERE week_start=?", (week_start,))
conn.execute(
    """INSERT INTO weekly_em
       (week_start, week_end, friday_close,
        static_wem_high, static_wem_low, static_wem_range, static_wem_iv)
       VALUES (?,?,?,?,?,?,?)""",
    (week_start, week_end, fri_close, s_high, s_low, s_range, iv)
)
conn.commit()
print(f"  Row inserted: {week_start} → {week_end}")

# ── Step 3: Re-export market_data.json ───────────────────────────────────────
print("\nStep 3: Re-exporting market_data.json...")
with open("market_data.json") as f:
    md = json.load(f)

rows = c.execute(
    "SELECT * FROM weekly_em ORDER BY week_start DESC LIMIT 52"
).fetchall()
cols = ["week_start","week_end","friday_close","atm_iv","vix_iv","dte",
        "wem_high","wem_mid","wem_low","wem_range",
        "atm_straddle_high","atm_straddle_low",
        "week_open","week_high","week_low","week_close",
        "weekly_gap","gap_filled","gap_fill_day",
        "closed_inside","breach","breach_side","breach_amount","breach_day","max_pain",
        "static_wem_high","static_wem_low","static_wem_range","static_wem_iv"]
weekly_em = [dict(zip(cols, r)) for r in rows]
md["weekly_em"] = weekly_em

with open("market_data.json", "w") as f:
    json.dump(md, f)

print(f"  Exported {len(weekly_em)} weeks")
print(f"  First row (next week): { {k:v for k,v in weekly_em[0].items() if v is not None} }")
print("\nDone. You can delete this script now.")
