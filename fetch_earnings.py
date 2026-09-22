import json
from datetime import datetime

import pytz

OUTPUT = "earnings_data.js"
SYMBOLS = ["TSLA", "GOOGL", "MSFT", "META", "AAPL", "AMZN", "NVDA"]
ET = pytz.timezone("America/New_York")


def next_report(symbol):
    import yfinance as yf
    info = yf.Ticker(symbol).get_info()
    ts = info.get("earningsTimestampStart") or info.get("earningsTimestamp")
    if not ts:
        return None
    return {"symbol": symbol, "date": datetime.fromtimestamp(ts, ET).date().isoformat(),
            "estimated": bool(info.get("isEarningsDateEstimate")), "carried": False}


def previous():
    try:
        with open(OUTPUT, encoding="utf-8") as f:
            body = f.read().split("=", 1)[1].strip().rstrip(";")
        return {r["symbol"]: r for r in json.loads(body).get("records", [])}
    except (OSError, ValueError, IndexError):
        return {}


def main():
    today = datetime.now(ET).date().isoformat()
    old, records, problems = previous(), [], []
    for sym in SYMBOLS:
        try:
            rec = next_report(sym)
        except Exception as e:
            rec = None
            problems.append(f"{sym}: {e}")
        if rec and rec["date"] >= today:
            records.append(rec)
        elif sym in old and old[sym]["date"] >= today:
            records.append(dict(old[sym], carried=True))
            problems.append(f"{sym}: no upcoming date from Yahoo; kept {old[sym]['date']}")
        else:
            problems.append(f"{sym}: no upcoming date")
    records.sort(key=lambda r: (r["date"], r["symbol"]))
    payload = {"records": records, "source": "Yahoo Finance earnings calendar", "problems": problems,
               "generated": datetime.now(ET).isoformat(timespec="seconds")}
    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write("const EARNINGS_DATA = " + json.dumps(payload, separators=(",", ":")) + ";\n")
    print(f"{OUTPUT}: " + ", ".join(f"{r['symbol']} {r['date']}{' (estimated)' if r['estimated'] else ''}" for r in records))
    for p in problems:
        print(f"  {p}")


if __name__ == "__main__":
    main()
