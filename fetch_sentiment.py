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
import sqlite3
import re
import requests
from datetime import date, datetime, timezone, timedelta

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


def survey_week_end(d):
    """AAII's survey week ends Wednesday; the spreadsheet dates the same survey on the Thursday after."""
    while d.weekday() != 2:
        d = d - timedelta(days=1)
    return d


AAII_XLS_URL = "https://www.aaii.com/files/surveys/sentiment.xls"


def parse_aaii_workbook(content):
    """Every week in AAII's survey spreadsheet, dated to the Wednesday the survey week ends."""
    import io as _io
    try:
        import xlrd
    except ImportError:
        print("  AAII spreadsheet: xlrd is not installed")
        return []
    try:
        book = xlrd.open_workbook(file_contents=content)
    except Exception as e:
        print(f"  AAII spreadsheet: not a workbook ({e})")
        return []
    sheet = book.sheet_by_index(0)
    out = []
    for row in range(sheet.nrows):
        cell = sheet.cell(row, 0)
        if cell.ctype != xlrd.XL_CELL_DATE:
            continue
        try:
            y, m, day = xlrd.xldate_as_tuple(cell.value, book.datemode)[:3]
            vals = [sheet.cell_value(row, c) for c in (1, 2, 3)]
            bull, neu, bear = (round(float(v) * 100, 1) for v in vals)
        except (ValueError, TypeError, IndexError):
            continue
        if not (99 <= bull + neu + bear <= 101):
            continue
        d = survey_week_end(date(y, m, day)).isoformat()
        out.append({"date": d, "bullish": bull, "neutral": neu, "bearish": bear,
                    "spread": round(bull - bear, 1), "source": "aaii_xls"})
    out.sort(key=lambda x: x["date"])
    return out


def last_survey_wednesday_et():
    """AAII's survey week ends Wednesday; a scrape with no date on the page is the most recent Wednesday in New York."""
    from zoneinfo import ZoneInfo
    d = datetime.now(ZoneInfo("America/New_York")).date()
    while d.weekday() != 2:
        d = d - timedelta(days=1)
    return d.isoformat()


# ── AAII ───────────────────────────────────────────────────────────────────────

def fetch_aaii():
    """AAII's survey spreadsheet first, its web page second. Returns the latest week or None."""

    # Method 1 — AAII's own survey spreadsheet: the current week and the whole history
    try:
        r = SESSION.get(
            AAII_XLS_URL,
            timeout=45,
            headers={"Referer": "https://www.aaii.com/sentimentsurvey", "Accept": "application/vnd.ms-excel,*/*"},
        )
        if r.status_code == 200 and r.content[:5] != b"<html" and len(r.content) > 100000:
            weeks = parse_aaii_workbook(r.content)
            if weeks:
                global AAII_FULL_SERIES
                AAII_FULL_SERIES = weeks
                latest = weeks[-1]
                print(f"  AAII (spreadsheet): {len(weeks)} weeks, latest {latest['date']} bull={latest['bullish']}% neu={latest['neutral']}% bear={latest['bearish']}%")
                return {
                    "date":       latest["date"],
                    "bullish":    latest["bullish"],
                    "neutral":    latest["neutral"],
                    "bearish":    latest["bearish"],
                    "spread":     latest["spread"],
                    "avg_bullish": 37.5,
                    "avg_bearish": 31.0,
                    "source":     "aaii_xls",
                }
            print("  AAII spreadsheet: no usable rows parsed")
        else:
            print(f"  AAII spreadsheet: HTTP {r.status_code}, {len(r.content)} bytes — not the workbook")
    except Exception as e:
        print(f"  AAII spreadsheet failed: {e}")

    # Method 3 — AAII HTML page scrape
    try:
        r = SESSION.get(
            "https://www.aaii.com/sentimentsurvey",
            timeout=15,
            headers={"Accept": "text/html"},
        )
        if r.status_code == 200:
            text = r.text
            found = {}
            for key, cls in (("bullish", "bull"), ("neutral", "neut"), ("bearish", "bear")):
                m = re.search(r'ssv2-snum\s+' + cls + r'"[^>]*>\s*([\d.]+)\s*%', text)
                if m:
                    found[key] = float(m.group(1))
            if len(found) == 3:
                total = sum(found.values())
                if 99 <= total <= 101:
                    m_date = re.search(r"Week ending[^<]{0,30}([A-Z][a-z]+ \d{1,2},? \d{4})", text)
                    try:
                        date_str = datetime.strptime(m_date.group(1).replace(",", ""), "%B %d %Y").date().isoformat() if m_date else last_survey_wednesday_et()
                    except ValueError:
                        date_str = last_survey_wednesday_et()
                    print(f"  AAII (HTML): bull={found['bullish']}% neu={found['neutral']}% bear={found['bearish']}% sum={total:.1f}% week ending {date_str}")
                    return {
                        "date":       date_str,
                        "bullish":    found["bullish"],
                        "neutral":    found["neutral"],
                        "bearish":    found["bearish"],
                        "spread":     round(found["bullish"] - found["bearish"], 2),
                        "avg_bullish": 37.5,
                        "avg_bearish": 31.0,
                        "source":     "aaii_html",
                    }
                print(f"  AAII HTML: figures do not sum to 100 ({found}, sum={total:.1f}) — skipping")
            else:
                print(f"  AAII HTML: the page's survey markers were not found ({len(found)} of 3)")
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
CFTC_FIN_ZIP = "https://www.cftc.gov/files/dea/history/fut_fin_txt_{year}.zip"
CFTC_CONTRACT = "13874A"
COT_FIELDS = [
    ("open_interest", "Open_Interest_All"),
    ("dealer_long", "Dealer_Positions_Long_All"), ("dealer_short", "Dealer_Positions_Short_All"),
    ("asset_long", "Asset_Mgr_Positions_Long_All"), ("asset_short", "Asset_Mgr_Positions_Short_All"),
    ("lev_long", "Lev_Money_Positions_Long_All"), ("lev_short", "Lev_Money_Positions_Short_All"),
    ("other_long", "Other_Rept_Positions_Long_All"), ("other_short", "Other_Rept_Positions_Short_All"),
    ("nonrept_long", "NonRept_Positions_Long_All"), ("nonrept_short", "NonRept_Positions_Short_All"),
]


def _cot_num(v):
    try:
        return int(float((v or "0").replace(",", "").strip() or 0))
    except ValueError:
        return None


def _cot_date(row):
    for key in ("Report_Date_as_YYYY-MM-DD", "Report_Date_as_YYYY_MM_DD"):
        raw = (row.get(key) or "").strip()
        if not raw:
            continue
        for fmt in ("%Y-%m-%d", "%Y %b %d %I:%M:%S %p", "%Y %b %d"):
            try:
                return datetime.strptime(raw, fmt).date().isoformat()
            except ValueError:
                continue
    return None


def fetch_cot_weeks():
    """Every E-Mini S&P 500 report in the CFTC's financial-futures archive for this year and last, newest last."""
    out = {}
    for year in (datetime.now().year, datetime.now().year - 1):
        try:
            r = SESSION.get(CFTC_FIN_ZIP.format(year=year), timeout=45)
            if r.status_code != 200:
                print(f"  COT archive {year}: HTTP {r.status_code}")
                continue
            with zipfile.ZipFile(io.BytesIO(r.content)) as zf:
                names = [n for n in zf.namelist() if n.lower().endswith((".txt", ".csv"))]
                if not names:
                    continue
                with zf.open(names[0]) as f:
                    for row in csv.DictReader(io.TextIOWrapper(f, encoding="latin-1")):
                        if CFTC_CONTRACT not in (row.get("CFTC_Contract_Market_Code") or ""):
                            continue
                        d = _cot_date(row)
                        if d:
                            out[d] = {k: _cot_num(row.get(src)) for k, src in COT_FIELDS}
        except Exception as e:
            print(f"  COT archive {year} failed: {e}")
    weeks = [dict(report_date=d, **v) for d, v in sorted(out.items())]
    if weeks:
        print(f"  COT archive: {len(weeks)} reports, {weeks[0]['report_date']} -> {weeks[-1]['report_date']}")
    return weeks


def fetch_cot():
    """The latest E-Mini S&P 500 report with its week-over-week changes, or None."""
    weeks = fetch_cot_weeks()
    if not weeks:
        print("  COT: no reports retrieved.")
        return None
    latest = weeks[-1]
    prev = weeks[-2] if len(weeks) > 1 else None
    net = lambda w, side: (w.get(side + "_long") or 0) - (w.get(side + "_short") or 0)
    out = {"report_date": latest["report_date"], "oi": latest.get("open_interest"), "source": "cftc_fin_zip"}
    for side, prefix in (("dealer", "dealer"), ("asset", "asset"), ("lev", "lev"), ("other", "other"), ("nonrept", "nonrept")):
        out[f"{prefix}_l"] = latest.get(side + "_long")
        out[f"{prefix}_s"] = latest.get(side + "_short")
        out[f"{prefix}_net"] = net(latest, side)
        if prev:
            out[f"chg_{prefix}_net"] = net(latest, side) - net(prev, side)
    print(f"  COT (CFTC archive): report {out['report_date']} dealer net={out['dealer_net']:+,} leveraged net={out['lev_net']:+,}")
    return out


def store_aaii_weeks(weeks, db_path="spy_data.db"):
    """Upsert every survey week into aaii_weekly; the table is the site's own history."""
    if not weeks:
        return 0
    try:
        with open(db_path, "rb") as f:
            if f.read(16) != b"SQLite format 3\x00":
                return 0
    except OSError:
        return 0
    try:
        conn = sqlite3.connect(db_path)
        conn.execute("""CREATE TABLE IF NOT EXISTS aaii_weekly (
            week_end TEXT PRIMARY KEY, bullish REAL, neutral REAL, bearish REAL, spread REAL, source TEXT)""")
        conn.executemany("INSERT OR REPLACE INTO aaii_weekly VALUES (?,?,?,?,?,?)",
                         [(w["date"], w["bullish"], w["neutral"], w["bearish"], w["spread"], w.get("source", "aaii_xls")) for w in weeks])
        conn.commit()
        n = conn.execute("SELECT COUNT(*) FROM aaii_weekly").fetchone()[0]
        conn.close()
        print(f"  aaii_weekly: {len(weeks)} weeks upserted, table holds {n}")
        return len(weeks)
    except sqlite3.Error as e:
        print(f"  aaii_weekly store failed: {e}")
        return 0


def store_cot_weeks(weeks, db_path="spy_data.db"):
    """Upsert every retrieved report into cot_weekly; the table is the site's own history."""
    if not weeks:
        return 0
    try:
        with open(db_path, "rb") as f:
            if f.read(16) != b"SQLite format 3\x00":
                return 0
    except OSError:
        return 0
    try:
        conn = sqlite3.connect(db_path)
        conn.execute("""CREATE TABLE IF NOT EXISTS cot_weekly (
            report_date TEXT PRIMARY KEY, open_interest INTEGER,
            dealer_long INTEGER, dealer_short INTEGER, asset_long INTEGER, asset_short INTEGER,
            lev_long INTEGER, lev_short INTEGER, other_long INTEGER, other_short INTEGER,
            nonrept_long INTEGER, nonrept_short INTEGER, source TEXT)""")
        cols = ["report_date"] + [k for k, _ in COT_FIELDS] + ["source"]
        rows = [tuple([w["report_date"]] + [w.get(k) for k, _ in COT_FIELDS] + ["cftc_fin_zip"]) for w in weeks]
        conn.executemany(f"INSERT OR REPLACE INTO cot_weekly ({','.join(cols)}) VALUES ({','.join('?' * len(cols))})", rows)
        conn.commit()
        n = conn.execute("SELECT COUNT(*) FROM cot_weekly").fetchone()[0]
        conn.close()
        print(f"  cot_weekly: {len(rows)} reports upserted, table holds {n}")
        return len(rows)
    except sqlite3.Error as e:
        print(f"  cot_weekly store failed: {e}")
        return 0


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
        else:
            aaii['spread'] = round(vals[0] - vals[2], 1)

    print("=== Fetching COT (E-Mini S&P 500) ===")
    cot_weeks = fetch_cot_weeks()
    store_cot_weeks(cot_weeks)
    cot = None
    if cot_weeks:
        latest, prev = cot_weeks[-1], (cot_weeks[-2] if len(cot_weeks) > 1 else None)
        net = lambda w, side: (w.get(side + "_long") or 0) - (w.get(side + "_short") or 0)
        cot = {"report_date": latest["report_date"], "oi": latest.get("open_interest"), "source": "cftc_fin_zip"}
        for side in ("dealer", "asset", "lev", "other", "nonrept"):
            cot[f"{side}_l"] = latest.get(side + "_long")
            cot[f"{side}_s"] = latest.get(side + "_short")
            cot[f"{side}_net"] = net(latest, side)
            if prev:
                cot[f"chg_{side}_net"] = net(latest, side) - net(prev, side)
        print(f"  COT: report {cot['report_date']} dealer net={cot['dealer_net']:+,} leveraged net={cot['lev_net']:+,}")

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

    stale = []
    for key, date_field, max_age, label in (("aaii", "date", 10, "AAII"), ("cot", "report_date", 12, "COT")):
        block = output.get(key)
        age = block.get("age_days") if block else None
        if not block or age is None or age > max_age:
            stale.append(f"{label} is {age if age is not None else 'un'}dated{'' if age is None else f' {age} days old'} (allowed {max_age})")

    print(f"\nOK sentiment_data.json written ({NOW_UTC})")
    if output["aaii"]:
        a = output["aaii"]
        print(f"  AAII  -> bull={a.get('bullish')}%  bear={a.get('bearish')}%  spread={a.get('spread')}  [{a.get('source')}]")
    if output["cot"]:
        c = output["cot"]
        net = c.get("lev_net", c.get("nc_net"))
        print(f"  COT   -> report {c.get('report_date')}  leveraged/non-commercial net={net}  [{c.get('source')}]")

    if stale:
        print("\nFAILED sentiment sources are stale: " + "; ".join(stale))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
