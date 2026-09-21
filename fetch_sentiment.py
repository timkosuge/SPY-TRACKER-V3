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
from datetime import datetime, timezone, timedelta

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    )
})

NOW_UTC = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
AAII_FULL_SERIES = []


def last_thursday_et():
    """AAII publishes its survey on Thursdays; a scrape with no date on the page is the most recent Thursday in New York."""
    from zoneinfo import ZoneInfo
    d = datetime.now(ZoneInfo("America/New_York")).date()
    while d.weekday() != 3:
        d = d - timedelta(days=1)
    return d.isoformat()


# ── AAII ───────────────────────────────────────────────────────────────────────

def fetch_aaii():
    """
    Try three methods in order:
    1. Stooq mirror CSV (most reliable, structured data)
    2. AAII XLS (tab-separated) direct download
    3. AAII HTML page scrape (fragile, last resort)
    Returns dict with bullish/neutral/bearish/spread/date/source or None.
    """

    # Method 1 — Stooq (most reliable — tried first)
    try:
        r = SESSION.get(
            "https://stooq.com/q/d/l/?s=aaii_bull&i=w",
            timeout=15,
        )
        if r.status_code == 200 and "Date" in r.text:
            lines = [l for l in r.text.strip().split("\n") if l.strip()]
            bull_rows = {}
            for l in lines[1:]:
                c = l.split(",")
                if len(c) >= 5 and c[4] not in ("", "N/A"):
                    bull_rows[c[0]] = float(c[4])
            last = lines[-1].split(",")
            bull_date = last[0]
            bull = float(last[4])

            r2 = SESSION.get(
                "https://stooq.com/q/d/l/?s=aaii_bear&i=w",
                timeout=15,
            )
            bear = None
            bear_rows = {}
            if r2.status_code == 200 and "Date" in r2.text:
                lines2 = [l for l in r2.text.strip().split("\n") if l.strip()]
                for l in lines2[1:]:
                    c = l.split(",")
                    if len(c) >= 5 and c[4] not in ("", "N/A"):
                        bear_rows[c[0]] = float(c[4])
                bear = float(lines2[-1].split(",")[4])
            global AAII_FULL_SERIES
            AAII_FULL_SERIES = [{"date": d, "bullish": round(b, 2), "bearish": round(bear_rows[d], 2) if d in bear_rows else None,
                                 "neutral": max(0.0, round(100.0 - b - bear_rows[d], 2)) if d in bear_rows else None,
                                 "spread": round(b - bear_rows[d], 2) if d in bear_rows else None, "source": "stooq"}
                                for d, b in sorted(bull_rows.items())]

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

    # Method 2 — AAII XLS download (tab-separated)
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

    # Method 3 — AAII HTML scrape (fragile, last resort)
    try:
        r = SESSION.get(
            "https://www.aaii.com/sentimentsurvey",
            timeout=15,
            headers={"Accept": "text/html"},
        )
        if r.status_code == 200:
            text = r.text
            # Strategy 1: Look for the survey results table near "Bullish" "Neutral" "Bearish" labels
            # The actual survey data appears near these keywords in the page
            bull, neu, bear = None, None, None

            # Try to find percentages near "Bullish" label in the survey section
            m_bull = re.search(r'Bullish[^<]{0,200}?(\d{1,2}\.\d)\s*%', text, re.S | re.I)
            m_neu  = re.search(r'Neutral[^<]{0,200}?(\d{1,2}\.\d)\s*%', text, re.S | re.I)
            m_bear = re.search(r'Bearish[^<]{0,200}?(\d{1,2}\.\d)\s*%', text, re.S | re.I)

            if m_bull and m_neu and m_bear:
                bull = float(m_bull.group(1))
                neu  = float(m_neu.group(1))
                bear = float(m_bear.group(1))
                total = bull + neu + bear
                # Validate: must sum near 100 and be plausible
                # Extra sanity: reject suspiciously round numbers and impossible extremes
                is_round = (bull % 10 == 0 and neu % 10 == 0 and bear % 10 == 0)
                if 85 <= total <= 115 and bull < 57 and bear < 75 and not is_round:
                    print(f"  AAII (HTML label scrape): bull={bull}% bear={bear}% sum={total:.1f}%")
                    return {
                        "date":       last_thursday_et(),
                        "bullish":    bull,
                        "neutral":    neu,
                        "bearish":    bear,
                        "spread":     round(bull - bear, 2),
                        "avg_bullish": 37.5,
                        "avg_bearish": 31.0,
                        "source":     "aaii_html",
                    }
                else:
                    print(f"  AAII HTML label scrape: values failed validation ({bull}/{neu}/{bear}, sum={total:.1f}) — skipping")

            # Strategy 2: find a block of 3 consecutive plausible percentages
            matches = re.findall(r'(\d{1,2}\.\d)\s*%', text)
            for i in range(len(matches) - 2):
                b, n, br = float(matches[i]), float(matches[i+1]), float(matches[i+2])
                total = b + n + br
                is_round = (b % 10 == 0 and n % 10 == 0 and br % 10 == 0)
                if 85 <= total <= 115 and b < 57 and br < 75 and n < 60 and not is_round:
                    print(f"  AAII (HTML window scrape): bull={b}% neu={n}% bear={br}% sum={total:.1f}%")
                    return {
                        "date":       last_thursday_et(),
                        "bullish":    b,
                        "neutral":    n,
                        "bearish":    br,
                        "spread":     round(b - br, 2),
                        "avg_bullish": 37.5,
                        "avg_bearish": 31.0,
                        "source":     "aaii_html",
                    }
            print("  AAII HTML: no valid triplet found in page")
    except Exception as e:
        print(f"  AAII HTML scrape failed: {e}")

    print("  AAII: all methods failed, no update.")
    return None


# ── COT (TFF — Traders in Financial Futures) ─────────────────────────────────
#
# Uses the TFF report which gives 5 categories including Leveraged Money (hedge funds)
# S&P 500 Consolidated = code 13874A_FO_ALL on Nasdaq Data Link
# Also parses CFTC ZIP directly as fallback
#
NASDAQ_TFF_URL = "https://data.nasdaq.com/api/v3/datasets/CFTC/13874A_FO_ALL.json?rows=2"
CFTC_FIN_ZIP   = "https://www.cftc.gov/files/dea/history/tff_fut_txt_{year}.zip"

def fetch_cot():
    """
    Fetch TFF report for S&P 500 Consolidated (all 5 groups).
    Returns dict with dealer/asset/lev_money/other/nonrept fields or None.
    """

    # Method 1 — Nasdaq Data Link TFF (free, structured JSON)
    try:
        r = SESSION.get(NASDAQ_TFF_URL, timeout=15)
        if r.status_code == 200:
            data = r.json()
            rows     = data.get("dataset", {}).get("data", [])
            col_names = data.get("dataset", {}).get("column_names", [])
            if rows and col_names:
                def col(name, row):
                    try: return row[col_names.index(name)]
                    except: return None

                latest = rows[0]
                prev   = rows[1] if len(rows) > 1 else None

                dl  = col("Dealer Long",               latest) or 0
                ds  = col("Dealer Short",              latest) or 0
                al  = col("Asset Manager Long",        latest) or 0
                as_ = col("Asset Manager Short",       latest) or 0
                ll  = col("Leveraged Money Long",      latest) or 0
                ls  = col("Leveraged Money Short",     latest) or 0
                ol  = col("Other Reportable Long",     latest) or 0
                os_ = col("Other Reportable Short",    latest) or 0
                nl  = col("Non-Reportable Long",       latest) or 0
                ns  = col("Non-Reportable Short",      latest) or 0
                oi  = col("Open Interest",             latest) or 0
                date_str = col("Date", latest)

                lev_net   = int(ll - ls)
                asset_net = int(al - as_)
                dealer_net = int(dl - ds)

                # W/W change for leveraged money
                chg_lev = None
                chg_asset = None
                chg_dealer = None
                if prev:
                    pl  = col("Leveraged Money Long",  prev) or 0
                    ps  = col("Leveraged Money Short", prev) or 0
                    pal = col("Asset Manager Long",    prev) or 0
                    pas = col("Asset Manager Short",   prev) or 0
                    pdl = col("Dealer Long",           prev) or 0
                    pds = col("Dealer Short",          prev) or 0
                    chg_lev    = lev_net   - int(pl - ps)
                    chg_asset  = asset_net - int(pal - pas)
                    chg_dealer = dealer_net - int(pdl - pds)

                print(f"  COT TFF (Nasdaq DL): lev_net={lev_net:+,} asset_net={asset_net:+,} date={date_str}")
                return {
                    "report_date":    date_str,
                    "oi":             int(oi),
                    "dealer_l":       int(dl),  "dealer_s":  int(ds),  "dealer_net":  dealer_net,
                    "asset_l":        int(al),  "asset_s":   int(as_), "asset_net":   asset_net,
                    "lev_l":          int(ll),  "lev_s":     int(ls),  "lev_net":     lev_net,
                    "other_l":        int(ol),  "other_s":   int(os_), "other_net":   int(ol-os_),
                    "nonrept_l":      int(nl),  "nonrept_s": int(ns),  "nonrept_net": int(nl-ns),
                    "chg_dealer_net": chg_dealer,
                    "chg_asset_net":  chg_asset,
                    "chg_lev_net":    chg_lev,
                    "source":         "nasdaq_tff",
                }
    except Exception as e:
        print(f"  COT TFF Nasdaq DL failed: {e}")

    # Method 2 — CFTC ZIP (TFF futures only)
    for year in [datetime.now().year, datetime.now().year - 1]:
        try:
            url = CFTC_FIN_ZIP.format(year=year)
            r = SESSION.get(url, timeout=30)
            if r.status_code != 200:
                continue
            with zipfile.ZipFile(io.BytesIO(r.content)) as zf:
                csv_names = [n for n in zf.namelist() if n.lower().endswith((".txt", ".csv"))]
                if not csv_names:
                    continue
                with zf.open(csv_names[0]) as f:
                    reader = csv.DictReader(io.TextIOWrapper(f, encoding="latin-1"))
                    rows = [row for row in reader if "S&P 500" in row.get("Market_and_Exchange_Names","").upper()]
            if not rows:
                continue
            rows.sort(key=lambda r: r.get("Report_Date_as_YYYY_MM_DD",""), reverse=True)
            latest = rows[0]
            prev   = rows[1] if len(rows) > 1 else None

            def gi(field):
                try: return int(latest.get(field,"0").replace(",","") or 0)
                except: return 0

            dl  = gi("Dealer_Positions_Long_All");   ds  = gi("Dealer_Positions_Short_All")
            al  = gi("Asset_Mgr_Positions_Long_All");as_ = gi("Asset_Mgr_Positions_Short_All")
            ll  = gi("Lev_Money_Positions_Long_All");ls  = gi("Lev_Money_Positions_Short_All")
            ol  = gi("Other_Rept_Positions_Long_All");os_= gi("Other_Rept_Positions_Short_All")
            nl  = gi("NonRept_Positions_Long_All");  ns  = gi("NonRept_Positions_Short_All")
            oi  = gi("Open_Interest_All")
            date_raw = latest.get("Report_Date_as_YYYY_MM_DD","")
            try:
                date_str = datetime.strptime(date_raw.strip(), "%Y %b %d 12:00:00 AM").strftime("%Y-%m-%d")
            except:
                date_str = date_raw

            lev_net    = ll - ls
            asset_net  = al - as_
            dealer_net = dl - ds

            chg_lev = chg_asset = chg_dealer = None
            if prev:
                def pi(field):
                    try: return int(prev.get(field,"0").replace(",","") or 0)
                    except: return 0
                chg_lev    = lev_net    - (pi("Lev_Money_Positions_Long_All")   - pi("Lev_Money_Positions_Short_All"))
                chg_asset  = asset_net  - (pi("Asset_Mgr_Positions_Long_All")   - pi("Asset_Mgr_Positions_Short_All"))
                chg_dealer = dealer_net - (pi("Dealer_Positions_Long_All")       - pi("Dealer_Positions_Short_All"))

            print(f"  COT TFF (CFTC ZIP {year}): lev_net={lev_net:+,} date={date_str}")
            return {
                "report_date":    date_str,
                "oi":             oi,
                "dealer_l":       dl,  "dealer_s":  ds,  "dealer_net":  dealer_net,
                "asset_l":        al,  "asset_s":   as_, "asset_net":   asset_net,
                "lev_l":          ll,  "lev_s":     ls,  "lev_net":     lev_net,
                "other_l":        ol,  "other_s":   os_, "other_net":   ol-os_,
                "nonrept_l":      nl,  "nonrept_s": ns,  "nonrept_net": nl-ns,
                "chg_dealer_net": chg_dealer,
                "chg_asset_net":  chg_asset,
                "chg_lev_net":    chg_lev,
                "source":         f"cftc_tff_zip_{year}",
            }
        except Exception as e:
            print(f"  COT TFF CFTC ZIP {year} failed: {e}")

    print("  COT TFF: all methods failed.")
    return None


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    OUTPUT_FILE = "sentiment_data.json"
    HISTORY_FILE = "sentiment_history.json"

    # Load existing data so we can preserve last-known-good values if a source fails
    try:
        with open(OUTPUT_FILE) as f:
            existing = json.load(f)
    except Exception:
        existing = {}

    print("=== Fetching AAII sentiment ===")

    aaii = fetch_aaii()
    if aaii:
        vals = [aaii.get(k) for k in ('bullish', 'neutral', 'bearish')]
        total = sum(v for v in vals if v is not None) if all(v is not None for v in vals) else None
        if total is None or not (99 <= total <= 101) or any(v < 0 or v > 100 for v in vals):
            print(f"  AAII: rejected reading that does not sum to 100 ({vals}) — keeping existing.")
            aaii = None

    print("=== Fetching COT (E-Mini S&P 500) ===")
    cot = fetch_cot()

    output = {
        "updated": NOW_UTC,
        "aaii":    aaii or existing.get("aaii"),
        "cot":     cot  or existing.get("cot"),
    }

    def age_days(date_str):
        try:
            return (datetime.now(timezone.utc).date() - datetime.strptime(date_str[:10], "%Y-%m-%d").date()).days
        except Exception:
            return None
    for key, date_field in (("aaii", "date"), ("cot", "report_date")):
        block = output.get(key)
        if not block:
            continue
        age = age_days(block.get(date_field) or "")
        block["age_days"] = age
        block["stale"] = age is None or age > 14
        if not (aaii if key == "aaii" else cot):
            block["carried_from_previous_run"] = True
            print(f"  {key.upper()}: fetch failed — carrying previous data ({block.get(date_field)}).")

    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    try:
        with open(HISTORY_FILE) as f:
            history = json.load(f)
    except Exception:
        history = {"aaii": [], "cot": []}
    if AAII_FULL_SERIES:
        have = {h.get("date") for h in history["aaii"]}
        history["aaii"].extend(h for h in AAII_FULL_SERIES if h["date"] not in have)
        history["aaii"].sort(key=lambda h: h["date"])
    if aaii and aaii.get("date") and not any(h.get("date") == aaii["date"] for h in history["aaii"]):
        history["aaii"].append({k: aaii.get(k) for k in ("date", "bullish", "neutral", "bearish", "spread", "source")})
        history["aaii"].sort(key=lambda h: h["date"])
    if cot and cot.get("report_date") and not any(h.get("report_date") == cot["report_date"] for h in history["cot"]):
        history["cot"].append({k: cot.get(k) for k in cot if k in ("report_date", "open_interest", "dealer_net", "asset_net", "lev_net", "other_net", "nonrept_net", "chg_dealer_net", "chg_asset_net", "chg_lev_net", "source")})
        history["cot"].sort(key=lambda h: h["report_date"])
    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=1)
    print(f"  history: aaii {len(history['aaii'])} weeks, cot {len(history['cot'])} reports")

    print(f"\n✓ sentiment_data.json written ({NOW_UTC})")
    if output["aaii"]:
        a = output["aaii"]
        print(f"  AAII  → bull={a.get('bullish')}%  bear={a.get('bearish')}%  spread={a.get('spread')}  [{a.get('source')}]")
    if output["cot"]:
        c = output["cot"]
        net = c.get("lev_net", c.get("nc_net"))
        print(f"  COT   → report {c.get('report_date')}  leveraged/non-commercial net={net}  [{c.get('source')}]")


if __name__ == "__main__":
    main()
