import json
import re
import sqlite3
from datetime import datetime

import pytz

from fetch_and_analyze import measurement_dates_needing_recompute
from trading_days import is_trading_day

ET = pytz.timezone("America/New_York")
DB_PATH = "spy_data.db"
OUTPUT = "health.json"
PAYLOADS = ["analog_data.js", "decline_data.js", "edge_stats_data.js", "expiry_data.js", "gap_stats.js", "intraday_library.js",
            "intraday_patterns.js", "intraday_vol_profile.js", "intraday_vol_stats.js", "large_gap_stats.js", "relief_data.js", "cot_data.js", "smart_dumb.js", "margin_data.js",
            "session_vol_profile.js", "tod_stats.js", "window_stats.js"]


def payload_meta(path):
    try:
        with open(path, encoding="utf-8") as f:
            s = f.read()
    except OSError:
        return None
    m = re.search(r'"source_max_date"\s*:\s*"?([0-9-]+|null)"?', s)
    g = re.search(r'"generated"\s*:\s*"([^"]+)"', s)
    return {"source_max_date": (m.group(1) if m and m.group(1) != "null" else None), "generated": g.group(1) if g else None}


def main():
    conn = sqlite3.connect(DB_PATH)
    now = datetime.now(ET)
    rows = []
    d, c = conn.execute("SELECT date, close FROM daily_ohlcv ORDER BY date DESC LIMIT 1").fetchone()
    rows.append({"name": "Daily close", "value": f"{d} close {'present' if c is not None else 'NULL'}", "ok": c is not None, "detail": "newest daily_ohlcv row"})
    ib = conn.execute("SELECT date, COUNT(*) FROM intraday_bars WHERE date=(SELECT MAX(date) FROM intraday_bars)").fetchone()
    if ib and ib[0]:
        expected = 390
        rows.append({"name": "Intraday bars", "value": f"{ib[0]} · {ib[1]} of {expected} bars", "ok": ib[1] >= 380, "detail": "newest session in intraday_bars against a full 390-minute session"})
    else:
        rows.append({"name": "Intraday bars", "value": "none", "ok": False, "detail": "no rows in intraday_bars"})
    mx = conn.execute("SELECT MAX(date) FROM daily_ohlcv WHERE close IS NOT NULL").fetchone()[0]
    stale = []
    for p in PAYLOADS:
        m = payload_meta(p)
        if not m or m["source_max_date"] != mx:
            stale.append(f"{p} ({m['source_max_date'] if m else 'missing'})")
    rows.append({"name": "Generated payloads", "value": f"{len(PAYLOADS) - len(stale)} of {len(PAYLOADS)} at {mx}", "ok": not stale, "detail": ("stale: " + ", ".join(stale)) if stale else "every payload's source_max_date equals the newest daily close"})
    try:
        with open("sentiment_data.json", encoding="utf-8") as f:
            sd = json.load(f)
        aaii = (sd.get("aaii") or {}).get("date"); cot = (sd.get("cot") or {}).get("report_date")
        age = lambda ds: (now.date() - datetime.strptime(ds, "%Y-%m-%d").date()).days if ds else None
        a_age, c_age = age(aaii), age(cot)
        rows.append({"name": "Sentiment", "value": f"AAII {aaii} ({a_age}d) · COT {cot} ({c_age}d)", "ok": a_age is not None and a_age <= 10 and c_age is not None and c_age <= 10, "detail": "AAII and COT report dates in sentiment_data.json; both publish weekly"})
    except Exception as e:
        rows.append({"name": "Sentiment", "value": "unreadable", "ok": False, "detail": str(e)})
    bad = measurement_dates_needing_recompute(conn)
    rows.append({"name": "Measurements", "value": f"{len(bad)} rows disagree", "ok": len(bad) == 0, "detail": "daily_measurements rows whose values do not reproduce from daily_ohlcv"})
    conn.close()
    out = {"generated_at": now.isoformat(timespec="seconds"), "session_date": now.date().isoformat(), "is_trading_day": is_trading_day(now.date()), "rows": rows}
    with open(OUTPUT, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"{OUTPUT}: {sum(1 for r in rows if r['ok'])} of {len(rows)} rows ok")


if __name__ == "__main__":
    main()
