"""
Run this once locally to fix the two bad WEM rows caused by the
Thursday short-week bug. Then commit spy_data.db to GitHub.

Usage:
    python fix_wem_db.py
    python fix_wem_db.py path/to/spy_data.db   # if not in current dir
"""
import sqlite3
import sys

db_path = sys.argv[1] if len(sys.argv) > 1 else "spy_data.db"

print(f"Opening {db_path}...")
conn = sqlite3.connect(db_path)

# Show current state before
print("\nBefore fix:")
rows = conn.execute(
    "SELECT week_start, week_end, dte, week_close, closed_inside "
    "FROM weekly_em WHERE week_start >= '2026-04-06' ORDER BY week_start"
).fetchall()
for r in rows:
    print(" ", r)

# Fix 1: clear bogus week_close from current week (Apr 6-10)
conn.execute("""
    UPDATE weekly_em SET
        week_close    = NULL,
        closed_inside = NULL,
        week_high     = NULL,
        week_low      = NULL,
        dte           = 1
    WHERE week_start = '2026-04-06'
""")
print("\n✓ Cleared week_close from 2026-04-06 row")

# Fix 2: delete premature next-week row
deleted = conn.execute(
    "DELETE FROM weekly_em WHERE week_start = '2026-04-12'"
).rowcount
print(f"✓ Deleted {deleted} premature 2026-04-12 row(s)")

conn.commit()

# Show state after
print("\nAfter fix:")
rows = conn.execute(
    "SELECT week_start, week_end, dte, week_close, closed_inside "
    "FROM weekly_em WHERE week_start >= '2026-04-06' ORDER BY week_start"
).fetchall()
for r in rows:
    print(" ", r)

conn.close()
print("\nDone. Now commit spy_data.db to GitHub.")
