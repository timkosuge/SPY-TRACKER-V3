import csv
import re
import sqlite3
from datetime import date, datetime, timedelta

import pytz

DB_PATH = "spy_data.db"
START = "2020-01-01"
ET = pytz.timezone("America/New_York")
BLS_ICS = "https://www.bls.gov/schedule/news_release/bls.ics"
BLS_ARCHIVE = "https://www.bls.gov/bls/news-release/{slug}.htm"
FED_CALENDAR = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
FED_HISTORICAL = "https://www.federalreserve.gov/monetarypolicy/fomchistorical{year}.htm"
BLS_SERIES = {"cpi": ("cpi", "Consumer Price Index"), "nfp": ("empsit", "Employment Situation")}
MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]


def _session():
    from curl_cffi import requests as browser_requests
    return browser_requests.Session(impersonate="chrome")


def bls_archive_dates(html, slug):
    return sorted({f"{m[4:]}-{m[:2]}-{m[2:4]}" for m in re.findall(rf"archives/{slug}_(\d{{8}})\.(?:htm|pdf)", html)})


def bls_ics_dates(ics, summary):
    out = set()
    for ev in re.findall(r"BEGIN:VEVENT(.*?)END:VEVENT", ics, re.S):
        su = re.search(r"SUMMARY:(.*)", ev)
        dt = re.search(r"DTSTART[^:]*:(\d{8})", ev)
        if su and dt and su.group(1).strip() == summary:
            d = dt.group(1)
            out.add(f"{d[:4]}-{d[4:6]}-{d[6:]}")
    return sorted(out)


def _month(text):
    key = text.strip().split("/")[-1].strip()[:3].lower()
    return MONTHS.index(key) + 1 if key in MONTHS else None


def _decision(year, month, last_day, statements):
    end = date(year, month, last_day)
    for d in sorted(statements):
        if end <= date.fromisoformat(d) <= end + timedelta(days=1):
            return d
    return end.isoformat()


def _statements(block):
    return {f"{a}-{b}-{c}" for a, b, c in re.findall(r"pressreleases/monetary(\d{4})(\d{2})(\d{2})a\.htm", block)}


def fed_calendar_meetings(html):
    out = []
    for year, body in re.findall(r'<h4><a id="\d+">(\d{4}) FOMC Meetings</a></h4>([\s\S]*?)(?=<h4><a id="\d+">\d{4} FOMC Meetings|$)', html):
        starts = [m.start() for m in re.finditer(r"fomc-meeting__month", body)] + [len(body)]
        for a, b in zip(starts, starts[1:]):
            block = body[a:b]
            m = re.search(r"fomc-meeting__month[^>]*><strong>([\s\S]*?)</strong>[\s\S]*?fomc-meeting__date[^>]*>([\s\S]*?)<", block)
            if m:
                out += _meeting(int(year), re.sub(r"<[^>]+>", "", m.group(1)), re.sub(r"<[^>]+>", "", m.group(2)), block)
    return out


def fed_historical_meetings(html, year):
    out = []
    heads = list(re.finditer(r"<h5[^>]*>\s*([A-Za-z/]+)\s+([\d\-]+)([^<]*?)(?:Meeting|Conference Call)\s*-\s*" + str(year) + r"\s*</h5>", html))
    for i, h in enumerate(heads):
        block = html[h.end():heads[i + 1].start() if i + 1 < len(heads) else len(html)]
        out += _meeting(year, h.group(1), h.group(2) + h.group(3), block)
    return out


def _meeting(year, month_text, day_text, block):
    day_text = day_text.lower()
    if "notation" in day_text or "cancel" in day_text:
        return []
    month, days = _month(month_text), [int(x) for x in re.findall(r"\d+", day_text)]
    if not month or not days:
        return []
    return [(_decision(year, month, days[-1], _statements(block)), "unscheduled" if "unscheduled" in day_text else "")]


def fetch_all(session=None):
    s = session or _session()
    result, problems = {}, []
    try:
        ics = s.get(BLS_ICS, timeout=40).text
    except Exception as e:
        ics = ""
        problems.append(f"BLS calendar: {e}")
    for key, (slug, summary) in BLS_SERIES.items():
        try:
            archive = bls_archive_dates(s.get(BLS_ARCHIVE.format(slug=slug), timeout=40).text, slug)
            today = datetime.now(ET).date().isoformat()
            dates = sorted({d for d in archive if d <= today} | set(bls_ics_dates(ics, summary)))
            result[key] = [(d, "") for d in dates if d >= START]
        except Exception as e:
            problems.append(f"{key}: {e}")
    try:
        meetings = fed_calendar_meetings(s.get(FED_CALENDAR, timeout=40).text)
        first_year = min(int(d[:4]) for d, _ in meetings)
        for y in range(int(START[:4]), first_year):
            meetings += fed_historical_meetings(s.get(FED_HISTORICAL.format(year=y), timeout=40).text, y)
        result["fomc"] = sorted({d: n for d, n in meetings if d >= START}.items())
    except Exception as e:
        problems.append(f"fomc: {e}")
    return result, problems


def usable(key, rows, previous):
    if not rows:
        return "no dates parsed"
    today = datetime.now(ET).date().isoformat()
    if rows[-1][0] < today:
        return f"latest date {rows[-1][0]} is already past"
    years = int(today[:4]) - int(START[:4]) + 1
    per_year = {"cpi": 11, "nfp": 11, "fomc": 8}[key]
    if len([d for d, _ in rows if d <= today]) < (years - 1) * per_year:
        return f"only {len(rows)} dates, fewer than {per_year} a year"
    if previous and len(rows) < len(previous) * 0.9:
        return f"{len(rows)} dates against {len(previous)} on file"
    return None


def read_csv(key):
    try:
        with open(f"release_dates/{key}_dates.csv", newline="") as f:
            return [(r["Date"], r.get("Notes") or "") for r in csv.DictReader(f)]
    except FileNotFoundError:
        return []


def write_csv(key, rows):
    with open(f"release_dates/{key}_dates.csv", "w", newline="") as f:
        f.write("Date,Notes\n")
        for d, n in rows:
            f.write(f"{d},{n}\n")


def main():
    result, problems = fetch_all()
    now = datetime.now(ET).isoformat(timespec="seconds")
    log = []
    for key in ("cpi", "nfp", "fomc"):
        rows, previous = result.get(key, []), read_csv(key)
        why = usable(key, rows, previous) if key in result else "not fetched"
        if why is None:
            write_csv(key, rows)
            detail = f"{len(rows)} dates, {rows[0][0]} to {rows[-1][0]}"
        else:
            detail = f"kept the file on disk: {why}"
        log.append((f"{now} {key}", key, 1 if why is None else 0, len(rows), rows[-1][0] if rows else None, detail))
        print(f"release dates {key}: {detail}")
    for p in problems:
        print(f"release dates: {p}")
    try:
        with open(DB_PATH, "rb") as f:
            if f.read(16) != b"SQLite format 3\x00":
                return
    except OSError:
        return
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("CREATE TABLE IF NOT EXISTS release_fetch_log (attempt TEXT PRIMARY KEY, kind TEXT, ok INTEGER, dates INTEGER, latest TEXT, detail TEXT)")
        conn.executemany("INSERT OR REPLACE INTO release_fetch_log VALUES (?,?,?,?,?,?)", log)
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        print(f"release dates: log not written: {e}")


if __name__ == "__main__":
    main()
