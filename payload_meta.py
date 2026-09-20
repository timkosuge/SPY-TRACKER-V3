import sqlite3
from datetime import datetime

DB_PATH = "spy_data.db"


def stamp(conn=None):
    own = sqlite3.connect(DB_PATH)
    try:
        mx = own.execute("SELECT MAX(date) FROM daily_ohlcv WHERE close IS NOT NULL").fetchone()[0]
    finally:
        own.close()
    return {"generated": datetime.now().astimezone().isoformat(timespec="seconds"), "source_max_date": mx}
