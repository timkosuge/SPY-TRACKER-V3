"""Builds margin_data.js: FINRA margin debt every month since 1997, what changed, and how current it is.

The committed history is the floor; months the pipeline fetched from FINRA are merged over it. FINRA publishes a month's
figures in the third week of the following month, so the month the site should have is known from the date alone, and the
payload says plainly when the latest month is behind it.
"""
import json
import sqlite3
from datetime import date, datetime

import pytz

from fetch_margin import DB_PATH, read_history_csv
from payload_meta import stamp

OUTPUT = "margin_data.js"
PUBLISHED_BY_DAY = 25
ET = pytz.timezone("America/New_York")
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def month_words(m):
    return f"{MONTHS[int(m[5:7]) - 1]} {m[:4]}" if m else None


def shift(m, k):
    y, mo = int(m[:4]), int(m[5:7]) - 1 + k
    return f"{y + mo // 12:04d}-{mo % 12 + 1:02d}"


def expected_month(today):
    """The latest month FINRA should have published by today: last month once it is the 25th, otherwise the month before."""
    this = f"{today.year:04d}-{today.month:02d}"
    return shift(this, -1 if today.day >= PUBLISHED_BY_DAY else -2)


def merged(conn):
    rows = {m: (d, fc, fm, "committed history") for m, d, fc, fm in read_history_csv()}
    fetch = None
    if conn is not None:
        try:
            for m, d, fc, fm in conn.execute("SELECT month, debit, free_cash, free_margin FROM margin_monthly"):
                rows[m] = (d, fc, fm, "fetched from FINRA")
            r = conn.execute("SELECT attempted_at, http_status, ok, latest, detail FROM margin_fetch_log ORDER BY attempted_at DESC LIMIT 1").fetchone()
            last_ok = conn.execute("SELECT attempted_at FROM margin_fetch_log WHERE ok = 1 ORDER BY attempted_at DESC LIMIT 1").fetchone()
            if r:
                fetch = {"attempted_at": r[0], "http_status": r[1], "ok": bool(r[2]), "latest": r[3], "detail": r[4], "last_success": last_ok[0] if last_ok else None}
        except sqlite3.Error:
            pass
    return [(m, *rows[m]) for m in sorted(rows)], fetch


def build(rows, fetch, today):
    if not rows:
        return {"available": False}
    by = {m: r for m, *r in rows}
    m, d, fc, fm, src = rows[-1]
    prev = by.get(shift(m, -1)); yr = by.get(shift(m, -12))
    rec_m, rec = max(((r[0], r[1]) for r in rows), key=lambda x: x[1])
    exp = expected_month(today)
    behind = (int(exp[:4]) * 12 + int(exp[5:7])) - (int(m[:4]) * 12 + int(m[5:7]))
    net = d - (fc or 0) - (fm or 0)
    return {"available": True, "latest": {"month": m, "month_words": month_words(m), "debit": d, "free_cash": fc, "free_margin": fm, "net": net, "source": src},
            "change_mom": (d - prev[0]) if prev else None, "change_mom_pct": round((d / prev[0] - 1) * 100, 2) if prev else None,
            "change_yoy_pct": round((d / yr[0] - 1) * 100, 1) if yr else None,
            "record": {"month": rec_m, "month_words": month_words(rec_m), "debit": rec, "pct_from_record": round((d / rec - 1) * 100, 1)},
            "expected_month": exp, "expected_words": month_words(exp), "months_behind": max(0, behind), "current": behind <= 0,
            "fetch": fetch, "units": "millions of dollars",
            "series": [[r[0], r[1]] for r in rows], "first": rows[0][0]}


def main():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("SELECT 1")
    except sqlite3.Error:
        conn = None
    try:
        rows, fetch = merged(conn)
    except sqlite3.DatabaseError:
        rows, fetch = merged(None)
    out = build(rows, fetch, datetime.now(ET).date())
    out.update(stamp(None))
    with open(OUTPUT, "w") as f:
        f.write("const MARGIN_DATA = " + json.dumps(out, separators=(",", ":")) + ";\n")
    L = out.get("latest") or {}
    print(f"{OUTPUT}: {len(rows)} months through {L.get('month_words')}, ${L.get('debit', 0) / 1e6:.2f}T; expected {out.get('expected_words')}; "
          + ("current" if out.get("current") else f"{out.get('months_behind')} month(s) behind") + (f"; last fetch: {fetch['detail']}" if fetch else "; no fetch attempted yet"))


if __name__ == "__main__":
    main()
