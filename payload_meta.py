import sqlite3
from datetime import date, datetime

import pytz

DB_PATH = "spy_data.db"
ET = pytz.timezone("America/New_York")
SESSION_CLOSE_MIN = 16 * 60


def session_closed(day, now=None):
    if isinstance(day, str):
        day = date.fromisoformat(day[:10])
    now = now or datetime.now(ET)
    return day < now.date() or (day == now.date() and now.hour * 60 + now.minute >= SESSION_CLOSE_MIN)


def last_closed_date(conn, now=None):
    for (d,) in conn.execute("SELECT date FROM daily_ohlcv WHERE close IS NOT NULL ORDER BY date DESC LIMIT 5"):
        if session_closed(d, now):
            return d
    return None


def stamp(conn=None):
    mx = None
    try:
        own = sqlite3.connect(DB_PATH)
        try:
            mx = last_closed_date(own)
        finally:
            own.close()
    except sqlite3.Error:
        pass
    return {"generated": datetime.now(ET).isoformat(timespec="seconds"), "source_max_date": mx}
