"""
ONE-TIME WEM DATA IMPORT
Imports your historical WEM data from CSV into spy_data.db

Steps:
1. Upload your CSV file to the repo root and name it: SPY_WEM_DATA.csv
2. Add this file (import_wem.py) to the repo root
3. Run manually via GitHub Actions (add a workflow_dispatch job)
   OR run locally if you have Python

After running, delete both files from the repo — they are one-time tools.
"""

import sqlite3, math, os
import pandas as pd
from datetime import datetime

DB_PATH  = "spy_data.db"
CSV_PATH = "SPY_WEM_DATA.csv"

def parse_date(val):
    if pd.isna(val) or str(val).strip() == "": return None
    for fmt in ["%m/%d/%Y", "%Y-%m-%d", "%m/%d/%y"]:
        try: return datetime.strptime(str(val).strip(), fmt).strftime("%Y-%m-%d")
        except: pass
    return None

def parse_float(val):
    if pd.isna(val): return None
    s = str(val).strip().replace("$","").replace(",","").replace("%","")
    if s in ("NaN","N?A","N/A","","—"): return None
    try: return round(float(s), 4)
    except: return None

def parse_bool(val):
    if pd.isna(val): return None
    s = str(val).strip().upper()
    if s == "YES": return 1
    if s == "NO":  return 0
    return None

def parse_str(val):
    if pd.isna(val): return None
    s = str(val).strip()
    if s in ("NaN","N?A","N/A","","—"): return None
    # Fix typos from spreadsheet
    day_fix = {
        "TUESDSDAY":"TUESDAY","TUESSDAY":"TUESDAY","TUESDDAY":"TUESDAY",
        "TUESSDDAY":"TUESDAY","WEDNESSDAY":"WEDNESDAY","THURDSDAY":"THURSDAY",
    }
    return day_fix.get(s.upper(), s.upper())

def ensure_table(conn):
    conn.execute("""CREATE TABLE IF NOT EXISTS weekly_em (
        week_start TEXT PRIMARY KEY, week_end TEXT,
        friday_close REAL, atm_iv REAL, vix_iv REAL, dte INTEGER,
        wem_high REAL, wem_mid REAL, wem_low REAL, wem_range REAL,
        atm_straddle_high REAL, atm_straddle_low REAL,
        week_open REAL, week_high REAL, week_low REAL, week_close REAL,
        weekly_gap REAL, gap_filled INTEGER, gap_fill_day TEXT,
        closed_inside INTEGER, breach INTEGER, breach_side TEXT,
        breach_amount REAL, breach_day TEXT, max_pain REAL)""")
    conn.commit()

def main():
    if not os.path.exists(CSV_PATH):
        print(f"ERROR: {CSV_PATH} not found in current directory.")
        print("Rename your CSV file to SPY_WEM_DATA.csv and place it in the repo root.")
        return

    if not os.path.exists(DB_PATH):
        print(f"ERROR: {DB_PATH} not found. Run fetch_and_analyze.py first to create the database.")
        return

    print(f"Reading {CSV_PATH}...")
    df = pd.read_csv(CSV_PATH)
    print(f"  {len(df)} rows in CSV")

    conn = sqlite3.connect(DB_PATH)
    ensure_table(conn)

    # Check existing rows
    existing = conn.execute("SELECT COUNT(*) FROM weekly_em").fetchone()[0]
    print(f"  {existing} rows already in weekly_em table")

    inserted = 0
    skipped  = 0

    # Data rows start at index 4
    # Column layout (confirmed from inspection):
    # 0=WEEK START, 1=WEEK END, 2=MAX PAIN, 3=RANGE+/-, 4=WEM MID,
    # 5=WEM HIGH, 6=WEM LOW, 7=WEEK HIGH, 8=WEEK LOW, 9=WEEK OPEN,
    # 10=WEEK CLOSE, 11=GAP AMOUNT, 12=GAP FILLED, 13=GAP FILL DAY,
    # 14=INSIDE/OUTSIDE, 15=BREACH Y/N, 16=BREACH SIDE, 17=BREACH AMT, 18=BREACH DAY

    for idx, row in df.iterrows():
        if idx < 4: continue

        week_start = parse_date(row.iloc[0])
        week_end   = parse_date(row.iloc[1])
        if not week_start or not week_end:
            skipped += 1
            continue

        max_pain      = parse_float(row.iloc[2])
        wem_half      = parse_float(row.iloc[3])   # ± amount
        wem_mid       = parse_float(row.iloc[4])
        wem_high      = parse_float(row.iloc[5])
        wem_low       = parse_float(row.iloc[6])
        week_high     = parse_float(row.iloc[7])
        week_low      = parse_float(row.iloc[8])
        week_open     = parse_float(row.iloc[9])
        week_close    = parse_float(row.iloc[10])
        weekly_gap    = parse_float(row.iloc[11])
        gap_filled    = parse_bool(row.iloc[12])
        gap_fill_day  = parse_str(row.iloc[13])
        inside_raw    = parse_str(row.iloc[14])
        closed_inside = 1 if inside_raw == "INSIDE" else 0 if inside_raw == "OUTSIDE" else None
        breach_raw    = parse_bool(row.iloc[15])
        breach_side   = parse_str(row.iloc[16])
        breach_amount = parse_float(row.iloc[17])
        breach_day    = parse_str(row.iloc[18])

        # Full range = 2 × half range
        wem_range_full = round(wem_half * 2, 4) if wem_half else None

        # friday_close = wem_mid (anchor price)
        friday_close = wem_mid

        # Back-calculate ATM IV from: wem = price × iv × sqrt(6/365)
        atm_iv = None
        if wem_half and friday_close and friday_close > 0:
            atm_iv = round(wem_half / (friday_close * math.sqrt(6/365)), 6)

        conn.execute("""INSERT OR REPLACE INTO weekly_em VALUES
            (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (week_start, week_end,
             friday_close, atm_iv, None, 6,
             wem_high, wem_mid, wem_low, wem_range_full,
             wem_high, wem_low,
             week_open, week_high, week_low, week_close,
             weekly_gap, gap_filled, gap_fill_day,
             closed_inside, breach_raw, breach_side,
             breach_amount, breach_day, max_pain))
        inserted += 1
        iv_str = str(round(atm_iv,4)) if atm_iv else "—"
        print(f"  ✓ {week_start} → {week_end}: Mid=${wem_mid} ±${wem_half} IV={iv_str} "
              f"Inside={closed_inside} Breach={'YES' if breach_raw else 'NO'} {breach_side or ''}")

    conn.commit()
    conn.close()

    print(f"\n{'='*50}")
    print(f"Import complete: {inserted} weeks inserted, {skipped} rows skipped")
    print(f"{'='*50}")
    print("\nNext steps:")
    print("1. Run the workflow manually to regenerate market_data.json")
    print("2. Cloudflare will redeploy automatically")
    print("3. Check the EXPECTED MOVE tab — it should now show all history")
    print("4. Delete SPY_WEM_DATA.csv and import_wem.py from the repo")

if __name__ == "__main__":
    main()
