import sqlite3
from datetime import date

import fetch_and_analyze as fa

DB_PATH = "spy_data.db"
IMPORTED_DTE = 6


def main():
    conn = sqlite3.connect(DB_PATH)
    fa.init_db(conn)
    c = conn.cursor()
    rows = c.execute("SELECT week_start, dte, atm_iv, static_wem_iv, static_wem_low, static_wem_high, static_wem_range, wem_low, wem_high, wem_range FROM weekly_em ORDER BY week_start").fetchall()
    ok = unavailable = 0
    for ws, dte, atm_iv, s_iv, s_lo, s_hi, s_rng, w_lo, w_hi, w_rng in rows:
        if s_iv is None and dte == IMPORTED_DTE and w_lo and w_hi:
            c.execute("UPDATE weekly_em SET static_wem_low=?, static_wem_high=?, static_wem_range=?, static_wem_iv=?, static_band_status='ok' WHERE week_start=?",
                      (w_lo, w_hi, w_rng, atm_iv, ws))
            ok += 1
        elif ws == "2026-04-06" and s_iv:
            mid = (s_lo + s_hi) / 2
            half = (s_hi - s_lo) / 2 / 0.70
            c.execute("UPDATE weekly_em SET static_wem_low=?, static_wem_high=?, static_wem_range=?, static_band_status='ok' WHERE week_start=?",
                      (round(mid - half, 2), round(mid + half, 2), round(half * 2, 2), ws))
            ok += 1
        else:
            c.execute("UPDATE weekly_em SET static_band_status='unavailable' WHERE week_start=?", (ws,))
            unavailable += 1
    conn.commit()
    print(f"static band status: ok={ok} unavailable={unavailable}")

    today = date.today()
    for ws, we, fc in c.execute("SELECT week_start, week_end, friday_close FROM weekly_em ORDER BY week_start").fetchall():
        if fc is None:
            prev = c.execute("SELECT close FROM daily_ohlcv WHERE date<? AND close IS NOT NULL ORDER BY date DESC LIMIT 1", (ws,)).fetchone()
            fc = prev[0] if prev else None
        settled = date.fromisoformat(we) < today
        fa.score_week(conn, ws, we, fc, settled)
    conn.commit()

    for label, q in (
        ("settled weeks without a close", "SELECT COUNT(*) FROM weekly_em WHERE week_close IS NULL AND week_end < date('now')"),
        ("scored weeks (status ok, closed)", "SELECT SUM(closed_inside), COUNT(*) FROM weekly_em WHERE week_close IS NOT NULL AND static_band_status='ok'"),
        ("weeks marked unavailable", "SELECT COUNT(*) FROM weekly_em WHERE static_band_status='unavailable'"),
        ("gap sign disagreements with daily_ohlcv", "SELECT COUNT(*) FROM weekly_em w JOIN daily_ohlcv d ON d.date=(SELECT MIN(date) FROM daily_ohlcv WHERE date>=w.week_start AND date<=w.week_end) WHERE w.weekly_gap IS NOT NULL AND ABS(w.weekly_gap-(d.open-w.friday_close))>0.011"),
    ):
        print(f"{label}: {c.execute(q).fetchone()}")
    conn.close()


if __name__ == "__main__":
    main()
