"""
fetch_sentiment.py
------------------
Fetches AAII Investor Sentiment and CFTC Commitments of Traders (COT)
data for E-Mini S&P 500 futures and writes sentiment_data.json.

Run weekly via GitHub Actions (see .github/workflows/sentiment_update.yml).
AAII releases every Thursday after market close.
COT releases every Friday at 3:30 PM ET for the prior Tuesday's positions.

Output: sentiment_data.json  (committed to repo, read by Cloudflare functions)
"""

import json
import io
import zipfile
import csv
import re
import requests
from datetime import datetime, timezone

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    )
})

NOW_UTC = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ── AAII ───────────────────────────────────────────────────────────────────────

def fetch_aaii():
    """
    Try three methods in order:
    1. AAII XLS (actually tab-separated) direct download
    2. Stooq mirror CSV (reliable, updates weekly)
    3. AAII HTML page scrape (fragile but worth trying)
    Returns dict with bullish/neutral/bearish/spread/date/source or None.
    """

    # Method 1 — AAII direct XLS download (tab-separated)
    try:
        r = SESSION.get(
            "https://www.aaii.com/files/surveys/sentiment.xls",
            timeout=15,
            headers={"Referer": "https://www.aaii.com/sentimentsurvey"},
        )
        if r.status_code == 200 and len(r.content) > 500:
            text = r.content.decode("utf-8", errors="replace")
            lines = [l for l in text.split("\n") if l.strip()]
            # Walk backwards to find the last valid data row
            for line in reversed(lines):
                cols = line.split("\t")
                if len(cols) >= 4:
                    try:
                        bull = float(cols[1])
                        neu  = float(cols[2])
                        bear = float(cols[3])
                        if 0 < bull < 100 and 0 < bear < 100:
                            date_raw = cols[0].strip()
                            print(f"  AAII (XLS): bull={bull:.1f}% bear={bear:.1f}% date={date_raw}")
                            return {
                                "date":     date_raw,
                                "bullish":  round(bull, 2),
                                "neutral":  round(neu,  2),
                                "bearish":  round(bear, 2),
                                "spread":   round(bull - bear, 2),
                                "avg_bullish": 37.5,
                                "avg_bearish": 31.0,
                                "source":   "aaii_xls",
                            }
                    except (ValueError, IndexError):
                        continue
    except Exception as e:
        print(f"  AAII XLS failed: {e}")

    # Method 2 — Stooq (carries AAII data, reliable CSV)
    try:
        r = SESSION.get(
            "https://stooq.com/q/d/l/?s=aaii_bull&i=w",
            timeout=15,
        )
        if r.status_code == 200 and "Date" in r.text:
            lines = [l for l in r.text.strip().split("\n") if l.strip()]
            # CSV: Date,Open,High,Low,Close,Volume
            # "Close" is the bullish %. Grab last row.
            last = lines[-1].split(",")
            bull_date = last[0]
            bull = float(last[4])  # Close = weekly bullish %

            # Also grab bearish
            r2 = SESSION.get(
                "https://stooq.com/q/d/l/?s=aaii_bear&i=w",
                timeout=15,
            )
            bear = None
            if r2.status_code == 200 and "Date" in r2.text:
                lines2 = [l for l in r2.text.strip().split("\n") if l.strip()]
                bear = float(lines2[-1].split(",")[4])

            neu = max(0.0, round(100.0 - bull - (bear or 0), 2)) if bear else None
            print(f"  AAII (Stooq): bull={bull:.1f}% bear={bear}% date={bull_date}")
            return {
                "date":       bull_date,
                "bullish":    round(bull, 2),
                "neutral":    neu,
                "bearish":    round(bear, 2) if bear else None,
                "spread":     round(bull - bear, 2) if bear else None,
                "avg_bullish": 37.5,
                "avg_bearish": 31.0,
                "source":     "stooq",
            }
    except Exception as e:
        print(f"  AAII Stooq failed: {e}")

    # Method 3 — AAII HTML scrape
    try:
        r = SESSION.get(
            "https://www.aaii.com/sentimentsurvey",
            timeout=15,
            headers={"Accept": "text/html"},
        )
        if r.status_code == 200:
            text = r.text
            # Look for three consecutive percentages (bull / neutral / bear)
            m = re.search(
                r"(\d{1,2}\.\d)\s*%.*?(\d{1,2}\.\d)\s*%.*?(\d{1,2}\.\d)\s*%",
                text,
                re.S,
            )
            if m:
                bull, neu, bear = float(m.group(1)), float(m.group(2)), float(m.group(3))
                print(f"  AAII (HTML scrape): bull={bull}% bear={bear}%")
                return {
                    "date":       datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "bullish":    bull,
                    "neutral":    neu,
                    "bearish":    bear,
                    "spread":     round(bull - bear, 2),
                    "avg_bullish": 37.5,
                    "avg_bearish": 31.0,
                    "source":     "aaii_html",
                }
    except Exception as e:
        print(f"  AAII HTML scrape failed: {e}")

    print("  AAII: all methods failed, no update.")
    return None


# ── COT ────────────────────────────────────────────────────────────────────────

# CFTC publishes COT for financial futures as a ZIP of CSVs.
# The E-Mini S&P 500 contract code is 13874A (legacy) or search by name.
CFTC_FIN_ZIP = "https://www.cftc.gov/files/dea/history/fin_fut_txt_{year}.zip"
CFTC_FIN_CURRENT = "https://www.cftc.gov/files/dea/history/fin_fut_txt_{year}.zip"

# Nasdaq Data Link (Quandl) free endpoint — no key needed for COT
NASDAQ_COT_URL = (
    "https://data.nasdaq.com/api/v3/datasets/CFTC/13874A_F_L_ALL.json?rows=3"
)


def fetch_cot():
    """
    Try three methods in order:
    1. Nasdaq Data Link (Quandl) — most reliable, structured JSON
    2. CFTC ZIP download + CSV parse — authoritative source
    3. CFTC HTML page scrape — fragile fallback
    Returns dict with nc_long/nc_short/nc_net/c_long/c_short/c_net/date/source or None.
    """

    # Method 1 — Nasdaq Data Link (free, no key)
    try:
        r = SESSION.get(NASDAQ_COT_URL, timeout=15)
        if r.status_code == 200:
            data = r.json()
            rows = data.get("dataset", {}).get("data", [])
            col_names = data.get("dataset", {}).get("column_names", [])
            if rows and col_names:
                def col(name, row):
                    try:
                        return row[col_names.index(name)]
                    except (ValueError, IndexError):
                        return None

                latest = rows[0]
                prev   = rows[1] if len(rows) > 1 else None

                nc_long  = col("Noncommercial Long",  latest)
                nc_short = col("Noncommercial Short", latest)
                c_long   = col("Commercial Long",     latest)
                c_short  = col("Commercial Short",    latest)
                oi       = col("Open Interest",        latest)
                date_str = col("Date",                 latest)

                nc_net = (nc_long - nc_short) if nc_long and nc_short else None
                c_net  = (c_long  - c_short)  if c_long  and c_short  else None

                # Week-over-week change in non-commercial net
                nc_net_prev = None
                if prev:
                    prev_nc_l = col("Noncommercial Long",  prev)
                    prev_nc_s = col("Noncommercial Short", prev)
                    if prev_nc_l and prev_nc_s:
                        nc_net_prev = prev_nc_l - prev_nc_s

                nc_net_change = round(nc_net - nc_net_prev, 0) if nc_net and nc_net_prev else None

                print(f"  COT (Nasdaq DL): nc_net={nc_net:+,.0f} date={date_str}")
                return {
                    "report_date":    date_str,
                    "nc_long":        int(nc_long)  if nc_long  else None,
                    "nc_short":       int(nc_short) if nc_short else None,
                    "nc_net":         int(nc_net)   if nc_net   else None,
                    "nc_net_change":  int(nc_net_change) if nc_net_change else None,
                    "c_long":         int(c_long)   if c_long   else None,
                    "c_short":        int(c_short)  if c_short  else None,
                    "c_net":          int(c_net)    if c_net    else None,
                    "open_interest":  int(oi)       if oi       else None,
                    "source":         "nasdaq_data_link",
                }
    except Exception as e:
        print(f"  COT Nasdaq DL failed: {e}")

    # Method 2 — CFTC official ZIP (current year + prior year fallback)
    for year in [datetime.now().year, datetime.now().year - 1]:
        try:
            url = CFTC_FIN_ZIP.format(year=year)
            r = SESSION.get(url, timeout=30)
            if r.status_code != 200:
                continue

            with zipfile.ZipFile(io.BytesIO(r.content)) as zf:
                # Find the financial futures CSV inside the ZIP
                csv_names = [n for n in zf.namelist() if n.lower().endswith(".txt") or n.lower().endswith(".csv")]
                if not csv_names:
                    continue
                with zf.open(csv_names[0]) as f:
                    reader = csv.DictReader(io.TextIOWrapper(f, encoding="latin-1"))
                    rows = []
                    for row in reader:
                        name = row.get("Market and Exchange Names", "")
                        if "E-MINI S&P 500" in name.upper():
                            rows.append(row)

                if not rows:
                    continue

                # Most recent row first
                rows.sort(key=lambda r: r.get("As of Date in Form YYYY-MM-DD", ""), reverse=True)
                latest = rows[0]
                prev   = rows[1] if len(rows) > 1 else None

                def gi(field):
                    try:
                        return int(latest.get(field, "0").replace(",", "") or 0)
                    except:
                        return None

                nc_long  = gi("Noncommercial Positions-Long (All)")
                nc_short = gi("Noncommercial Positions-Short (All)")
                c_long   = gi("Commercial Positions-Long (All)")
                c_short  = gi("Commercial Positions-Short (All)")
                oi       = gi("Open Interest (All)")
                date_str = latest.get("As of Date in Form YYYY-MM-DD", "")

                nc_net = (nc_long - nc_short) if nc_long and nc_short else None
                c_net  = (c_long  - c_short)  if c_long  and c_short  else None

                nc_net_change = None
                if prev:
                    try:
                        prev_nc_l = int(prev.get("Noncommercial Positions-Long (All)",  "0").replace(",", "") or 0)
                        prev_nc_s = int(prev.get("Noncommercial Positions-Short (All)", "0").replace(",", "") or 0)
                        nc_net_change = nc_net - (prev_nc_l - prev_nc_s)
                    except:
                        pass

                print(f"  COT (CFTC ZIP {year}): nc_net={nc_net:+,.0f} date={date_str}")
                return {
                    "report_date":   date_str,
                    "nc_long":       nc_long,
                    "nc_short":      nc_short,
                    "nc_net":        nc_net,
                    "nc_net_change": int(nc_net_change) if nc_net_change else None,
                    "c_long":        c_long,
                    "c_short":       c_short,
                    "c_net":         c_net,
                    "open_interest": oi,
                    "source":        f"cftc_zip_{year}",
                }
        except Exception as e:
            print(f"  COT CFTC ZIP {year} failed: {e}")

    # Method 3 — CFTC HTML page scrape (legacy fallback)
    try:
        r = SESSION.get(
            "https://www.cftc.gov/dea/futures/financial_lf.htm",
            timeout=15,
        )
        if r.status_code == 200:
            text = r.text
            idx = re.search(r"E-MINI S.?P 500", text, re.I)
            if idx:
                section = text[idx.start(): idx.start() + 2000]
                numbers = re.findall(r"[\d,]{5,}", section)
                if len(numbers) >= 6:
                    def ci(s):
                        return int(s.replace(",", ""))
                    nc_long  = ci(numbers[0])
                    nc_short = ci(numbers[1])
                    c_long   = ci(numbers[3])
                    c_short  = ci(numbers[4])
                    print(f"  COT (CFTC HTML): nc_net={nc_long-nc_short:+,}")
                    return {
                        "report_date":   datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                        "nc_long":       nc_long,
                        "nc_short":      nc_short,
                        "nc_net":        nc_long - nc_short,
                        "nc_net_change": None,
                        "c_long":        c_long,
                        "c_short":       c_short,
                        "c_net":         c_long - c_short,
                        "open_interest": None,
                        "source":        "cftc_html",
                    }
    except Exception as e:
        print(f"  COT CFTC HTML failed: {e}")

    print("  COT: all methods failed, no update.")
    return None


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    OUTPUT_FILE = "sentiment_data.json"

    # Load existing data so we can preserve last-known-good values if a source fails
    try:
        with open(OUTPUT_FILE) as f:
            existing = json.load(f)
    except Exception:
        existing = {}

    print("=== Fetching AAII sentiment ===")
    aaii = fetch_aaii()

    print("=== Fetching COT (E-Mini S&P 500) ===")
    cot = fetch_cot()

    output = {
        "updated": NOW_UTC,
        "aaii":    aaii or existing.get("aaii"),
        "cot":     cot  or existing.get("cot"),
    }

    # Flag if we're serving stale data
    if not aaii and existing.get("aaii"):
        output["aaii"]["stale"] = True
        print("  AAII: using cached data from previous run.")
    if not cot and existing.get("cot"):
        output["cot"]["stale"] = True
        print("  COT: using cached data from previous run.")

    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n✓ sentiment_data.json written ({NOW_UTC})")
    if output["aaii"]:
        a = output["aaii"]
        print(f"  AAII  → bull={a.get('bullish')}%  bear={a.get('bearish')}%  spread={a.get('spread')}  [{a.get('source')}]")
    if output["cot"]:
        c = output["cot"]
        print(f"  COT   → nc_net={c.get('nc_net'):+,}  Δ={c.get('nc_net_change')}  [{c.get('source')}]")


if __name__ == "__main__":
    main()
