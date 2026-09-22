"""One-time seed of cot_weekly from a CFTC Traders in Financial Futures export.

Reads a TFF CSV, keeps the E-Mini S&P 500 contract (CFTC code 13874A) and writes one row per report week.
Safe to re-run: rows are replaced by report date.
"""
import csv
import sqlite3
import sys
from datetime import datetime

CONTRACT_CODE = "13874A"
DB_PATH = "spy_data.db"
FIELDS = [
    ("open_interest", "Open_Interest_All"),
    ("dealer_long", "Dealer_Positions_Long_All"), ("dealer_short", "Dealer_Positions_Short_All"),
    ("asset_long", "Asset_Mgr_Positions_Long_All"), ("asset_short", "Asset_Mgr_Positions_Short_All"),
    ("lev_long", "Lev_Money_Positions_Long_All"), ("lev_short", "Lev_Money_Positions_Short_All"),
    ("other_long", "Other_Rept_Positions_Long_All"), ("other_short", "Other_Rept_Positions_Short_All"),
    ("nonrept_long", "NonRept_Positions_Long_All"), ("nonrept_short", "NonRept_Positions_Short_All"),
]


def create(conn):
    conn.execute("""CREATE TABLE IF NOT EXISTS cot_weekly (
        report_date TEXT PRIMARY KEY, open_interest INTEGER,
        dealer_long INTEGER, dealer_short INTEGER, asset_long INTEGER, asset_short INTEGER,
        lev_long INTEGER, lev_short INTEGER, other_long INTEGER, other_short INTEGER,
        nonrept_long INTEGER, nonrept_short INTEGER, source TEXT)""")


def parse_date(raw):
    raw = (raw or "").strip()
    for fmt in ("%Y %b %d %I:%M:%S %p", "%Y-%m-%d", "%Y %b %d"):
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def num(v):
    try:
        return int(float((v or "0").replace(",", "").strip() or 0))
    except ValueError:
        return None


def rows_from(path):
    out = []
    with open(path, newline="", encoding="latin-1") as f:
        for row in csv.DictReader(f):
            if CONTRACT_CODE not in (row.get("CFTC_Contract_Market_Code") or ""):
                continue
            d = parse_date(row.get("Report_Date_as_YYYY_MM_DD"))
            if not d:
                continue
            out.append(tuple([d] + [num(row.get(src)) for _, src in FIELDS] + ["cftc_tff_export"]))
    out.sort()
    return out


def main():
    if len(sys.argv) < 2:
        raise SystemExit("usage: python seed_cot_history.py <tff_export.csv>")
    rows = rows_from(sys.argv[1])
    if not rows:
        raise SystemExit(f"no rows for contract {CONTRACT_CODE} in {sys.argv[1]}")
    conn = sqlite3.connect(DB_PATH)
    create(conn)
    conn.executemany(f"INSERT OR REPLACE INTO cot_weekly VALUES ({','.join('?' * (len(FIELDS) + 2))})", rows)
    conn.commit()
    n, first, last = conn.execute("SELECT COUNT(*), MIN(report_date), MAX(report_date) FROM cot_weekly").fetchone()
    conn.close()
    print(f"cot_weekly: {len(rows)} rows read, table now holds {n} reports, {first} -> {last}")


if __name__ == "__main__":
    main()
