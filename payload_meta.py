import sqlite3
from datetime import datetime

import pytz

DB_PATH = "spy_data.db"


def stamp(conn=None):
    mx = None
    try:
        own = sqlite3.connect(DB_PATH)
        try:
            mx = own.execute("SELECT MAX(date) FROM daily_ohlcv WHERE close IS NOT NULL").fetchone()[0]
        finally:
            own.close()
    except sqlite3.Error:
        pass
    return {"generated": datetime.now(pytz.timezone("America/New_York")).isoformat(timespec="seconds"), "source_max_date": mx}
