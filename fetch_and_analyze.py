"""
SPY Daily Price Action Tracker — Full Build
Fetches: SPY OHLCV + intraday, market quotes, options data (via yfinance),
         VIX term structure, breadth, commodities, WEM calculations
"""

import os, sqlite3, requests, json, math
from datetime import datetime, date, timedelta
import pytz

API_KEY  = os.environ.get("POLYGON_API_KEY", "YOUR_API_KEY_HERE")
SYMBOL   = "SPY"
DB_PATH  = "spy_data.db"
CT       = pytz.timezone("America/Chicago")
BASE_URL = "https://api.polygon.io"

# ── DB Setup ───────────────────────────────────────────────────────────────────
def init_db(conn):
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS daily_ohlcv (
        date TEXT PRIMARY KEY, open REAL, high REAL, low REAL,
        close REAL, volume INTEGER, vwap REAL)""")
    c.execute("""CREATE TABLE IF NOT EXISTS daily_measurements (
        date TEXT PRIMARY KEY,
        open_to_close REAL, open_to_high REAL, open_to_low REAL,
        high_to_close REAL, low_to_close REAL, day_range REAL,
        open_to_prev_open REAL, close_to_prev_close REAL,
        high_to_prev_high REAL, low_to_prev_low REAL,
        pct_open_to_close REAL, pct_open_to_high REAL, pct_open_to_low REAL,
        pct_high_to_close REAL, pct_low_to_close REAL, pct_day_range REAL,
        pct_open_to_prev_open REAL, pct_close_to_prev_close REAL,
        pct_high_to_prev_high REAL, pct_low_to_prev_low REAL)""")
    c.execute("""CREATE TABLE IF NOT EXISTS intraday_bars (
        date TEXT, timestamp TEXT, open REAL, high REAL, low REAL,
        close REAL, volume INTEGER, vwap REAL, PRIMARY KEY (date, timestamp))""")
    # ── New: persistent 1m and 5m intraday bars (grow daily, never purge) ──
    c.execute("""CREATE TABLE IF NOT EXISTS intraday_1m (
        date TEXT, time TEXT, open REAL, high REAL, low REAL,
        close REAL, volume INTEGER,
        PRIMARY KEY (date, time))""")
    c.execute("""CREATE TABLE IF NOT EXISTS intraday_5m (
        date TEXT, time TEXT, open REAL, high REAL, low REAL,
        close REAL, volume INTEGER,
        PRIMARY KEY (date, time))""")
    # ── New: one row per session — derived stats for fast querying ──────────
    c.execute("""CREATE TABLE IF NOT EXISTS intraday_session_stats (
        date TEXT PRIMARY KEY,
        gap_pct REAL,
        gap_type TEXT,
        or_high REAL,
        or_low REAL,
        or_range REAL,
        initial_move_dir TEXT,
        initial_move_pct REAL,
        gap_filled INTEGER,
        gap_fill_time TEXT,
        or_break_dir TEXT,
        or_break_time TEXT,
        or_break_pct REAL,
        best_5m_time TEXT,
        best_5m_pct REAL,
        worst_5m_time TEXT,
        worst_5m_pct REAL,
        power_hour_dir TEXT,
        power_hour_pct REAL,
        lunch_range_pct REAL,
        open_price REAL,
        close_price REAL,
        prev_close REAL,
        day_range_pct REAL
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS volume_analysis (
        date TEXT PRIMARY KEY, total_volume INTEGER,
        vol_830_900 INTEGER, vol_900_930 INTEGER, vol_930_1030 INTEGER,
        vol_1030_1200 INTEGER, vol_1200_1300 INTEGER, vol_1300_1400 INTEGER,
        vol_1400_1430 INTEGER, vol_1430_1500 INTEGER,
        peak_volume_time TEXT, peak_volume_price REAL,
        peak_volume_amount INTEGER, hvn_price REAL, hvn_volume INTEGER)""")
    # Add new 30-min bucket columns if upgrading from old schema
    for col in ['vol_830_900','vol_900_930','vol_1400_1430','vol_1430_1500']:
        try: c.execute(f"ALTER TABLE volume_analysis ADD COLUMN {col} INTEGER")
        except: pass
    c.execute("""CREATE TABLE IF NOT EXISTS weekly_em (
        week_start TEXT PRIMARY KEY, week_end TEXT,
        friday_close REAL, atm_iv REAL, vix_iv REAL, dte INTEGER,
        wem_high REAL, wem_mid REAL, wem_low REAL, wem_range REAL,
        atm_straddle_high REAL, atm_straddle_low REAL,
        week_open REAL, week_high REAL, week_low REAL, week_close REAL,
        weekly_gap REAL, gap_filled INTEGER, gap_fill_day TEXT,
        closed_inside INTEGER, breach INTEGER, breach_side TEXT,
        breach_amount REAL, breach_day TEXT, max_pain REAL)""")
    conn.commit()
    print("DB initialized.")


# ── Polygon Helpers ────────────────────────────────────────────────────────────
def get_daily_bar(target_date):
    url = f"{BASE_URL}/v1/open-close/{SYMBOL}/{target_date}"
    r = requests.get(url, params={"adjusted":"true","apiKey":API_KEY}, timeout=30)
    r.raise_for_status()
    d = r.json()
    if d.get("status") != "OK":
        raise ValueError(f"Polygon: {d.get('status')} — {d.get('message','')}")
    return d

def get_intraday_bars(target_date):
    """Fetch 1-minute bars. Tries Polygon first, falls back to yfinance."""
    # Polygon
    if API_KEY and API_KEY != "YOUR_API_KEY_HERE":
        try:
            url = f"{BASE_URL}/v2/aggs/ticker/{SYMBOL}/range/1/minute/{target_date}/{target_date}"
            r = requests.get(url, params={"adjusted":"true","sort":"asc","limit":50000,"apiKey":API_KEY}, timeout=30)
            r.raise_for_status()
            d = r.json()
            if d.get("status") in ("OK","DELAYED") and d.get("results"):
                print(f"  Polygon: {len(d['results'])} bars for {target_date}")
                return d["results"]
            else:
                print(f"  Polygon: no bars for {target_date} (status={d.get('status')}) - trying yfinance")
        except Exception as e:
            print(f"  Polygon error for {target_date}: {e} - trying yfinance")
    # yfinance fallback
    try:
        import yfinance as yf
        from datetime import datetime as _dt, timedelta as _td
        next_day = (_dt.strptime(target_date, "%Y-%m-%d") + _td(days=1)).strftime("%Y-%m-%d")
        hist = yf.Ticker(SYMBOL).history(start=target_date, end=next_day, interval="1m", prepost=False)
        if hist.empty:
            print(f"  yfinance: no intraday bars for {target_date}")
            return []
        bars = []
        for ts, row in hist.iterrows():
            bars.append({
                "t": int(ts.timestamp() * 1000),
                "o": float(row["Open"]),  "h": float(row["High"]),
                "l": float(row["Low"]),   "c": float(row["Close"]),
                "v": float(row["Volume"]), "vw": float(row["Close"]),
            })
        print(f"  yfinance: {len(bars)} bars for {target_date}")
        return bars
    except Exception as e:
        print(f"  yfinance intraday error for {target_date}: {e}")
        return []


# ── Store / Compute SPY ────────────────────────────────────────────────────────
def store_daily(conn, target_date, bar):
    conn.execute("INSERT OR REPLACE INTO daily_ohlcv VALUES (?,?,?,?,?,?,?)",
                 (target_date, bar["open"], bar["high"], bar["low"], bar["close"],
                  int(bar.get("volume",0) or 0), bar.get("vwap")))
    conn.commit()
    print(f"Daily: O={bar['open']} H={bar['high']} L={bar['low']} C={bar['close']} V={bar.get('volume',0):,}")

def compute_measurements(conn, target_date):
    c = conn.cursor()
    row = c.execute("SELECT open,high,low,close FROM daily_ohlcv WHERE date=?", (target_date,)).fetchone()
    if not row: return
    o,h,l,cl = row
    prev = c.execute("SELECT open,high,low,close FROM daily_ohlcv WHERE date<? ORDER BY date DESC LIMIT 1", (target_date,)).fetchone()
    def pct(v,b): return round((v/b)*100,4) if b else None
    otc=round(cl-o,4); oth=round(h-o,4); otl=round(o-l,4)
    htc=round(cl-h,4); ltc=round(cl-l,4); rng=round(h-l,4)
    otpo=round(o-prev[0],4) if prev else None
    ctpc=round(cl-prev[3],4) if prev else None
    htph=round(h-prev[1],4) if prev else None
    ltpl=round(l-prev[2],4) if prev else None
    conn.execute("INSERT OR REPLACE INTO daily_measurements VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (target_date,otc,oth,otl,htc,ltc,rng,otpo,ctpc,htph,ltpl,
         pct(otc,o),pct(oth,o),pct(otl,o),pct(htc,h),pct(ltc,l),pct(rng,l),
         pct(otpo,prev[0]) if prev else None, pct(ctpc,prev[3]) if prev else None,
         pct(htph,prev[1]) if prev else None, pct(ltpl,prev[2]) if prev else None))
    conn.commit()
    print(f"Measurements: O→C={otc:+.2f} ({pct(otc,o):+.2f}%) Range={rng:.2f}")

def store_intraday_and_volume(conn, target_date, bars):
    if not bars: print("No intraday bars."); return
    c = conn.cursor()
    # Buckets in CT (market hours 8:30 CT - 15:00 CT)
    buckets = {
        "vol_830_900":  (8*60+30, 9*60),    # Open Auction
        "vol_900_930":  (9*60,    9*60+30),  # Early AM
        "vol_930_1030": (9*60+30, 10*60+30), # Late Open
        "vol_1030_1200":(10*60+30,12*60),    # Mid AM
        "vol_1200_1300":(12*60,   13*60),    # Lunch
        "vol_1300_1400":(13*60,   14*60),    # Mid PM
        "vol_1400_1430":(14*60,   14*60+30), # Pre-Close
        "vol_1430_1500":(14*60+30,15*60),    # Close Auction
    }
    bvols = {k:0 for k in buckets}
    price_vol = {}; peak_bar = None
    for bar in bars:
        ts_ct  = datetime.utcfromtimestamp(bar["t"]/1000).replace(tzinfo=pytz.utc).astimezone(CT)
        ts_str = ts_ct.strftime("%H:%M")
        mins   = ts_ct.hour*60+ts_ct.minute
        if not (8*60+30 <= mins < 15*60): continue  # 8:30-15:00 CT
        vol = bar.get("v",0)
        c.execute("INSERT OR REPLACE INTO intraday_bars VALUES (?,?,?,?,?,?,?,?)",
                  (target_date,ts_str,bar["o"],bar["h"],bar["l"],bar["c"],vol,bar.get("vw")))
        for bn,(bs,be) in buckets.items():
            if bs <= mins < be: bvols[bn] += vol
        pk = round(bar["c"]*10)/10
        price_vol[pk] = price_vol.get(pk,0)+vol
        if peak_bar is None or vol > peak_bar["v"]:
            peak_bar = {"t":ts_str,"c":bar["c"],"v":vol}
    conn.commit()
    hvn   = max(price_vol, key=price_vol.get) if price_vol else None
    total = sum(b.get("v",0) for b in bars)
    conn.execute("""INSERT OR REPLACE INTO volume_analysis
        (date, total_volume,
         vol_830_900, vol_900_930, vol_930_1030,
         vol_1030_1200, vol_1200_1300, vol_1300_1400,
         vol_1400_1430, vol_1430_1500,
         peak_volume_time, peak_volume_price, peak_volume_amount,
         hvn_price, hvn_volume)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (target_date, total,
         bvols["vol_830_900"], bvols["vol_900_930"], bvols["vol_930_1030"],
         bvols["vol_1030_1200"], bvols["vol_1200_1300"], bvols["vol_1300_1400"],
         bvols["vol_1400_1430"], bvols["vol_1430_1500"],
         peak_bar["t"] if peak_bar else None,
         peak_bar["c"] if peak_bar else None,
         peak_bar["v"] if peak_bar else None,
         hvn, price_vol[hvn] if hvn else None))
    print(f"Intraday: {len(bars)} bars. Peak={peak_bar['v']:,}@{peak_bar['t']} HVN=${hvn}")


# ── Options via yfinance ────────────────────────────────────────────────────────
def fetch_spy_options_cboe():
    """
    Fetch SPY options chain from CBOE's free delayed JSON endpoint.
    Computes: max pain, GEX, PCR, IV metrics — all from real options data.
    Data is ~15min delayed but has actual gamma values from CBOE.
    """
    import math, re
    from datetime import datetime, timedelta

    url = "https://cdn.cboe.com/api/global/delayed_quotes/options/SPY.json"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://www.cboe.com/",
    }

    try:
        resp = requests.get(url, headers=headers, timeout=20)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"  CBOE fetch error: {e}")
        return {}

    try:
        raw        = data["data"]
        spot       = float(raw.get("current_price", 0))
        options    = raw.get("options", [])
        if not spot or not options:
            print("  CBOE: no spot or options data")
            return {}

        print(f"  CBOE: SPY spot=${spot:.2f}, {len(options)} option rows")

        today = datetime.now(CT).date()

        # ── Parse all options ──────────────────────────────────────────────────
        # Symbol format: SPY YYMMDD C/P NNNNNMMM (e.g. SPY260328C00655000)
        pattern = re.compile(r'^SPY(\d{6})([CP])(\d+)$')
        parsed = []
        for opt in options:
            sym = opt.get("option", "")
            m   = pattern.match(sym)
            if not m:
                continue
            exp_str = "20" + m.group(1)        # YYYYMMDD
            cp      = m.group(2)               # C or P
            strike  = int(m.group(3)) / 1000   # e.g. 655000 → 655.0

            try:
                exp_date = datetime.strptime(exp_str, "%Y%m%d").date()
            except:
                continue

            dte = (exp_date - today).days
            if dte < 0:
                continue

            iv  = float(opt.get("iv",            0) or 0)
            oi  = int(  opt.get("open_interest",  0) or 0)
            vol = int(  opt.get("volume",         0) or 0)
            gam = float(opt.get("gamma",          0) or 0)  # CBOE provides gamma directly
            bid = float(opt.get("bid",            0) or 0)
            ask = float(opt.get("ask",            0) or 0)

            parsed.append({
                "sym": sym, "exp": exp_date, "exp_str": exp_str,
                "dte": dte, "cp": cp, "strike": strike,
                "iv": iv, "oi": oi, "vol": vol, "gamma": gam,
                "bid": bid, "ask": ask,
                "mid": (bid + ask) / 2,
            })

        if not parsed:
            print("  CBOE: no valid options parsed")
            return {}

        # ── Identify key expiries ──────────────────────────────────────────────
        # Nearest expiry (0DTE or next), nearest weekly, nearest monthly
        expiry_dates = sorted(set(o["exp"] for o in parsed))
        # Get the next 5 unique expiry dates
        near_expiries = expiry_dates[:8]
        nearest_exp   = expiry_dates[0] if expiry_dates else None

        # ── PCR — all expiries combined ────────────────────────────────────────
        total_call_vol = sum(o["vol"] for o in parsed if o["cp"] == "C")
        total_put_vol  = sum(o["vol"] for o in parsed if o["cp"] == "P")
        total_call_oi  = sum(o["oi"]  for o in parsed if o["cp"] == "C")
        total_put_oi   = sum(o["oi"]  for o in parsed if o["cp"] == "P")
        pcr_vol = round(total_put_vol / total_call_vol, 3) if total_call_vol else None
        pcr_oi  = round(total_put_oi  / total_call_oi,  3) if total_call_oi  else None
        print(f"  PCR vol={pcr_vol} OI={pcr_oi} | Call vol={total_call_vol:,} Put vol={total_put_vol:,}")

        # ── ATM IV ─────────────────────────────────────────────────────────────
        atm_iv = None
        if nearest_exp:
            atm_opts = [o for o in parsed
                        if o["exp"] == nearest_exp
                        and o["cp"] == "C"
                        and abs(o["strike"] - spot) < 5
                        and o["iv"] > 0]
            if atm_opts:
                closest = min(atm_opts, key=lambda x: abs(x["strike"] - spot))
                atm_iv = round(closest["iv"], 4)
                print(f"  ATM IV ({nearest_exp}): {atm_iv*100:.2f}%")

        # ── IV metrics from nearest monthly (30+ DTE) ──────────────────────────
        iv_rank = None
        monthly_exp = next((e for e in expiry_dates if (e - today).days >= 25), None)

        # ── Max Pain per expiry ────────────────────────────────────────────────
        max_pain_list = []
        for exp in near_expiries:
            # Use strikes within ±20% of spot for OI map
            exp_opts = [o for o in parsed
                        if o["exp"] == exp
                        and o["oi"] > 0
                        and spot * 0.80 <= o["strike"] <= spot * 1.20]
            if not exp_opts:
                continue

            strikes = sorted(set(o["strike"] for o in exp_opts))
            strike_oi = {}
            for o in exp_opts:
                s = o["strike"]
                if s not in strike_oi:
                    strike_oi[s] = {"call": 0, "put": 0}
                if o["cp"] == "C":
                    strike_oi[s]["call"] += o["oi"]
                else:
                    strike_oi[s]["put"] += o["oi"]

            # Max pain = strike that minimizes total ITM payout to option buyers
            # ITM only: calls with strike < spot, puts with strike > spot
            # Call ITM when candidate price s > strike k: payout = (s-k) × OI × 100
            # Put ITM when candidate price s < strike k: payout = (k-s) × OI × 100
            itm_call_strikes = {k: v for k, v in strike_oi.items() if k < spot}
            itm_put_strikes  = {k: v for k, v in strike_oi.items() if k > spot}
            pain = {}
            for s in strike_oi:
                loss  = sum(itm_call_strikes[k]["call"] * max(s - k, 0) * 100 for k in itm_call_strikes)
                loss += sum(itm_put_strikes[k]["put"]   * max(k - s, 0) * 100 for k in itm_put_strikes)
                pain[s] = loss

            if pain:
                mp = min(pain, key=pain.get)
                total_oi = sum(strike_oi[s]["call"] + strike_oi[s]["put"] for s in strike_oi)
                dte = (exp - today).days
                max_pain_list.append({
                    "expiry":   exp.strftime("%Y-%m-%d"),
                    "dte":      dte,
                    "max_pain": mp,
                    "total_oi": total_oi,
                    "dist_from_spot": round(mp - spot, 2),
                })
                print(f"  Max pain {exp}: ${mp} (OI:{total_oi:,}, dist:{mp-spot:+.2f})")

        # ── Options summary for nearest expiry ─────────────────────────────────
        options_summary = {}
        if nearest_exp:
            near = [o for o in parsed if o["exp"] == nearest_exp]
            near_calls = [o for o in near if o["cp"] == "C"]
            near_puts  = [o for o in near if o["cp"] == "P"]

            top_call_strikes = sorted(
                [{"strike": o["strike"], "oi": o["oi"], "vol": o["vol"]} for o in near_calls],
                key=lambda x: x["oi"], reverse=True
            )[:5]
            top_put_strikes  = sorted(
                [{"strike": o["strike"], "oi": o["oi"], "vol": o["vol"]} for o in near_puts],
                key=lambda x: x["oi"], reverse=True
            )[:5]

            nc_vol  = sum(o["vol"] for o in near_calls)
            np_vol  = sum(o["vol"] for o in near_puts)
            nc_oi   = sum(o["oi"]  for o in near_calls)
            np_oi   = sum(o["oi"]  for o in near_puts)

            options_summary = {
                "expiry":           nearest_exp.strftime("%Y-%m-%d"),
                "dte":              (nearest_exp - today).days,
                "call_volume":      nc_vol,
                "put_volume":       np_vol,
                "call_oi":          nc_oi,
                "put_oi":           np_oi,
                "pc_ratio_vol":     pcr_vol,
                "pc_ratio_oi":      pcr_oi,
                "total_call_vol":   total_call_vol,
                "total_put_vol":    total_put_vol,
                "total_call_oi":    total_call_oi,
                "total_put_oi":     total_put_oi,
                "top_call_strikes": top_call_strikes,
                "top_put_strikes":  top_put_strikes,
            }

        # ── GEX — using CBOE's actual gamma values ─────────────────────────────
        gex = compute_gex_cboe(parsed, spot, near_expiries)

        return {
            "max_pain":        max_pain_list,
            "options_summary": options_summary,
            "atm_iv":          atm_iv,
            "spot":            float(spot),
            "gex":             gex,
            "source":          "cboe",
        }

    except Exception as e:
        print(f"  CBOE options parse error: {e}")
        import traceback; traceback.print_exc()
        return {}


def compute_gex_cboe(parsed, spot, near_expiries):
    """
    Compute GEX from CBOE data which includes actual gamma values.
    GEX = OI × gamma × spot² × 0.01 × 100
    Calls: dealers short calls → long gamma (+GEX stabilizing)
    Puts:  dealers long puts  → short gamma (-GEX destabilizing)
    """
    import math
    from datetime import datetime

    gex_by_strike = {}
    total_call_gex = 0.0
    total_put_gex  = 0.0

    today = datetime.now(CT).date()

    for o in parsed:
        if o["exp"] not in near_expiries:
            continue
        if o["strike"] < spot * 0.75 or o["strike"] > spot * 1.25:
            continue
        if o["oi"] == 0:
            continue

        strike = o["strike"]
        oi     = o["oi"]
        dte    = max(o["dte"], 1)

        # Use CBOE gamma if available, otherwise compute via Black-Scholes
        gamma = o["gamma"]
        if gamma == 0 and o["iv"] > 0:
            iv = o["iv"]
            t  = dte / 365.0
            try:
                d1 = (math.log(spot / strike) + 0.5 * iv**2 * t) / (iv * math.sqrt(t))
                gamma = math.exp(-0.5 * d1**2) / (spot * iv * math.sqrt(2 * math.pi * t))
            except:
                continue

        if gamma == 0:
            continue

        # GEX in dollars per 1% move
        gex_val = oi * gamma * spot**2 * 0.01 * 100

        if o["cp"] == "C":
            gex_by_strike[strike] = gex_by_strike.get(strike, 0) + gex_val
            total_call_gex += gex_val
        else:
            gex_by_strike[strike] = gex_by_strike.get(strike, 0) - gex_val
            total_put_gex -= gex_val

    if not gex_by_strike:
        return None

    total_net_gex = total_call_gex + total_put_gex

    # Flip point — where cumulative GEX crosses zero
    strikes_sorted = sorted(gex_by_strike.keys())
    flip_point = None
    for i in range(len(strikes_sorted) - 1):
        s1, s2 = strikes_sorted[i], strikes_sorted[i+1]
        g1, g2 = gex_by_strike[s1], gex_by_strike[s2]
        if g1 * g2 < 0:
            flip_point = round(s1 + (s2 - s1) * abs(g1) / (abs(g1) + abs(g2)), 2)
            break

    # Resistance = largest positive GEX above spot
    above   = {s: g for s, g in gex_by_strike.items() if s > spot and g > 0}
    resistance = max(above, key=above.get) if above else None

    # Support = most negative GEX below spot
    below   = {s: g for s, g in gex_by_strike.items() if s < spot and g < 0}
    support = min(below, key=below.get) if below else None

    # Top strikes by absolute GEX for display
    top_strikes = sorted(gex_by_strike.items(), key=lambda x: abs(x[1]), reverse=True)[:20]
    top_strikes = sorted(top_strikes, key=lambda x: x[0])

    # Regime
    if total_net_gex > 1e9:
        regime = "STRONGLY STABILIZING"
        regime_desc = "Dealers are heavily long gamma. Strong resistance to large moves."
    elif total_net_gex > 0:
        regime = "STABILIZING"
        regime_desc = "Dealers long gamma — they buy dips and sell rips, containing moves."
    elif total_net_gex > -1e9:
        regime = "SLIGHTLY DESTABILIZING"
        regime_desc = "Dealers slightly short gamma. Moves may extend further than normal."
    else:
        regime = "DESTABILIZING"
        regime_desc = "Dealers short gamma — they amplify moves in either direction."

    print(f"  GEX (CBOE): Net={total_net_gex/1e9:.2f}B Flip=${flip_point} Res=${resistance} Sup=${support} [{regime}]")

    return {
        "net_gex":    round(total_net_gex),
        "call_gex":   round(total_call_gex),
        "put_gex":    round(total_put_gex),
        "flip_point": flip_point,
        "resistance": resistance,
        "support":    support,
        "regime":     regime,
        "regime_desc":regime_desc,
        "strikes":    [{"strike": s, "gex": round(g)} for s, g in top_strikes],
        "spot":       spot,
        "source":     "cboe",
    }

def fetch_spy_options_yf_fallback():
    """Minimal yfinance fallback — PCR and max pain only, no GEX."""
    try:
        import yfinance as yf
        import pandas as pd
        spy   = yf.Ticker("SPY")
        spot  = spy.fast_info.last_price
        if not spot: return {}
        avail = spy.options
        if not avail: return {}
        today = datetime.now(CT).date()
        exps  = [e for e in avail if (datetime.strptime(e,"%Y-%m-%d").date()-today).days <= 60][:5]
        max_pain_list=[]; atm_iv=None; options_summary={}
        for i,exp in enumerate(exps):
            try:
                ch=spy.option_chain(exp); calls=ch.calls; puts=ch.puts
                soi={}; cv=coi=pv=poi=0; cr=[]; pr=[]
                for _,r in calls.iterrows():
                    s=float(r['strike']); oi=int(r['openInterest']) if pd.notna(r['openInterest']) else 0; v=int(r['volume']) if pd.notna(r['volume']) else 0
                    if oi<=0: continue
                    soi.setdefault(s,{'call':0,'put':0})['call']+=oi; cv+=v; coi+=oi; cr.append({'strike':s,'oi':oi,'vol':v})
                for _,r in puts.iterrows():
                    s=float(r['strike']); oi=int(r['openInterest']) if pd.notna(r['openInterest']) else 0; v=int(r['volume']) if pd.notna(r['volume']) else 0
                    if oi<=0: continue
                    soi.setdefault(s,{'call':0,'put':0})['put']+=oi; pv+=v; poi+=oi; pr.append({'strike':s,'oi':oi,'vol':v})
                itm_calls_yf={k:v for k,v in soi.items() if k<spot}; itm_puts_yf={k:v for k,v in soi.items() if k>spot}; pain={s:sum(itm_calls_yf[k]['call']*max(s-k,0) for k in itm_calls_yf)+sum(itm_puts_yf[k]['put']*max(k-s,0) for k in itm_puts_yf) for s in soi}
                if pain:
                    mp=min(pain,key=pain.get); toi=sum(d['call']+d['put'] for d in soi.values())
                    max_pain_list.append({"expiry":exp,"max_pain":mp,"total_oi":toi,"dist_from_spot":round(mp-spot,2)})
                if i==0:
                    try:
                        idx=(calls['strike']-spot).abs().idxmin(); iv=calls.loc[idx,'impliedVolatility']
                        if pd.notna(iv) and iv>0: atm_iv=float(iv)
                    except: pass
                    options_summary={"expiry":exp,"call_volume":cv,"put_volume":pv,"call_oi":coi,"put_oi":poi,
                        "pc_ratio_vol":round(pv/cv,3) if cv else None,"pc_ratio_oi":round(poi/coi,3) if coi else None,
                        "top_call_strikes":sorted(cr,key=lambda x:x['oi'],reverse=True)[:5],
                        "top_put_strikes":sorted(pr,key=lambda x:x['oi'],reverse=True)[:5]}
            except Exception as e: print(f"  yf fallback {exp}: {e}")
        return {"max_pain":max_pain_list,"options_summary":options_summary,"atm_iv":atm_iv,"spot":float(spot),"gex":None,"source":"yfinance_fallback"}
    except Exception as e:
        print(f"  yf fallback error: {e}"); return {}

# ── Weekly Expected Move ───────────────────────────────────────────────────────
def compute_weekly_em(conn, target_date, atm_iv_override=None, is_next_week=False):
    """Calculate and store weekly expected move using Don Kaufman ATM straddle method."""
    try:
        today    = datetime.strptime(target_date, "%Y-%m-%d").date()
        weekday  = today.weekday()
        monday   = today - timedelta(days=weekday)
        friday   = monday + timedelta(days=4)

        if is_next_week:
            monday = monday + timedelta(days=7)
            friday = friday + timedelta(days=7)

        prev_friday  = monday - timedelta(days=3)
        week_start   = monday.strftime("%Y-%m-%d")
        week_end     = friday.strftime("%Y-%m-%d")
        prev_fri_str = prev_friday.strftime("%Y-%m-%d")

        c = conn.cursor()
        prev_row = c.execute(
            "SELECT close FROM daily_ohlcv WHERE date<=? ORDER BY date DESC LIMIT 1",
            (prev_fri_str,)
        ).fetchone()
        if not prev_row:
            print(f"  No previous Friday close for WEM ({prev_fri_str}).")
            return
        prev_close = prev_row[0]
        dte = max((friday - today).days + 1, 1)

        vix_iv = None
        iv_to_use = None

        if atm_iv_override is not None:
            # ATM IV provided from options chain
            iv_to_use = atm_iv_override
            wem = prev_close * iv_to_use * math.sqrt(6/365) * 0.70
            print(f"  WEM from ATM IV ({iv_to_use*100:.2f}%): ±${wem:.2f}")
        else:
            # Use VIX with TOS TheoTrade formula: close × IV × √(6/365) × 0.70
            try:
                import yfinance as yf
                vix_price = yf.Ticker("^VIX").fast_info.last_price
                vix_iv = float(vix_price) / 100 if vix_price else None
                iv_to_use = vix_iv
            except:
                iv_to_use = None
            if iv_to_use is None:
                print("  No VIX available for WEM — skipping.")
                return
            wem = prev_close * iv_to_use * math.sqrt(6/365) * 0.70
            print(f"  WEM from VIX ({iv_to_use*100:.2f}%): ±${wem:.2f}")

        wem_high  = round(prev_close + wem, 2)
        wem_low   = round(prev_close - wem, 2)
        wem_mid   = round(prev_close, 2)
        wem_range = round(wem * 2, 2)

        week_rows = c.execute(
            "SELECT open,high,low,close,date FROM daily_ohlcv WHERE date>=? AND date<=? ORDER BY date",
            (week_start, week_end)
        ).fetchall()

        week_open  = week_rows[0][0]  if week_rows else None
        week_high  = max(r[1] for r in week_rows) if week_rows else None
        week_low   = min(r[2] for r in week_rows) if week_rows else None
        week_close = week_rows[-1][3] if week_rows else None

        weekly_gap   = round(week_open - prev_close, 2) if week_open else None
        gap_filled   = None
        gap_fill_day = None
        if weekly_gap and week_rows:
            if weekly_gap > 0:
                for r in week_rows:
                    if r[2] <= prev_close:
                        gap_filled   = 1
                        gap_fill_day = datetime.strptime(r[4], "%Y-%m-%d").strftime("%A").upper()
                        break
                if gap_filled is None: gap_filled = 0
            elif weekly_gap < 0:
                for r in week_rows:
                    if r[1] >= prev_close:
                        gap_filled   = 1
                        gap_fill_day = datetime.strptime(r[4], "%Y-%m-%d").strftime("%A").upper()
                        break
                if gap_filled is None: gap_filled = 0

        closed_inside = None
        if week_close:
            closed_inside = 1 if wem_low <= week_close <= wem_high else 0

        breach = None
        breach_side = None
        breach_amount = None
        breach_day = None
        if week_rows:
            for r in week_rows:
                if r[3] > wem_high:
                    breach = 1; breach_side = "HIGH"
                    breach_amount = round(r[3] - wem_high, 2)
                    breach_day = datetime.strptime(r[4], "%Y-%m-%d").strftime("%A").upper()
                    break
                elif r[3] < wem_low:
                    breach = 1; breach_side = "LOW"
                    breach_amount = round(r[3] - wem_low, 2)  # negative when close < low
                    breach_day = datetime.strptime(r[4], "%Y-%m-%d").strftime("%A").upper()
                    break
            if breach is None: breach = 0

        conn.execute(
            "INSERT OR REPLACE INTO weekly_em VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (week_start, week_end, prev_close, iv_to_use, vix_iv, dte,
             wem_high, wem_mid, wem_low, wem_range, wem_high, wem_low,
             week_open, week_high, week_low, week_close,
             weekly_gap, gap_filled, gap_fill_day,
             closed_inside, breach, breach_side, breach_amount, breach_day, None)
        )
        conn.commit()
        print(f"  WEM {'(next week)' if is_next_week else ''}: Mid={wem_mid} High={wem_high} Low={wem_low} (±{round(wem,2)}, IV={iv_to_use:.4f})")

    except Exception as e:
        print(f"  WEM error: {e}")


# ── JSON Exports ───────────────────────────────────────────────────────────────
def export_spy_json(conn):
    c = conn.cursor()
    dates = [r[0] for r in c.execute(
        "SELECT date FROM daily_ohlcv ORDER BY date DESC").fetchall()]
    output = []
    for d in dates:
        ohlcv = c.execute("SELECT open,high,low,close,volume,vwap FROM daily_ohlcv WHERE date=?", (d,)).fetchone()
        meas  = c.execute("SELECT * FROM daily_measurements WHERE date=?", (d,)).fetchone()
        vol   = c.execute("SELECT * FROM volume_analysis WHERE date=?", (d,)).fetchone()
        entry = {"date": d}
        if ohlcv:
            entry.update({
                "open": ohlcv[0], "high": ohlcv[1], "low": ohlcv[2],
                "close": ohlcv[3], "volume": ohlcv[4], "vwap": ohlcv[5]
            })
        if meas:
            # Export with both naming conventions so dashboard always works
            entry["measurements"] = {
                "open_to_close":   meas[1],  "oc_pts": meas[1],
                "open_to_high":    meas[2],  "oh_pts": meas[2],
                "open_to_low":     meas[3],  "ol_pts": meas[3],
                "high_to_close":   meas[4],  "hc_pts": meas[4],
                "low_to_close":    meas[5],  "lc_pts": meas[5],
                "day_range":       meas[6],  "range_pts": meas[6],
                "open_to_prev_open":    meas[7],
                "close_to_prev_close":  meas[8],
                "high_to_prev_high":    meas[9],
                "low_to_prev_low":      meas[10],
                "pct_open_to_close":  meas[11], "oc_pct": meas[11],
                "pct_open_to_high":   meas[12], "oh_pct": meas[12],
                "pct_open_to_low":    meas[13], "ol_pct": meas[13],
                "pct_high_to_close":  meas[14], "hc_pct": meas[14],
                "pct_low_to_close":   meas[15], "lc_pct": meas[15],
                "pct_day_range":      meas[16], "range_pct": meas[16],
                "pct_open_to_prev_open":    meas[17],
                "pct_close_to_prev_close":  meas[18],
                "pct_high_to_prev_high":    meas[19],
                "pct_low_to_prev_low":      meas[20],
            }
        if vol:
            # Read by column name — works with both old and new schema
            vol_row = c.execute("SELECT * FROM volume_analysis WHERE date=?", (d,)).fetchone()
            vd = dict(zip([desc[0] for desc in c.description], vol_row))
            def fv(k): return float(vd.get(k) or 0)
            total = fv("total_volume")
            # Support both old schema (vol_930_1000..vol_1500_1600 ET)
            # and new schema (vol_830_900..vol_1430_1500 CT)
            # New schema takes priority if populated
            has_new = fv("vol_830_900") + fv("vol_900_930") > 0
            if has_new:
                b = {
                    "vol_830_900":  fv("vol_830_900"),
                    "vol_900_930":  fv("vol_900_930"),
                    "vol_930_1030": fv("vol_930_1030"),
                    "vol_1030_1200":fv("vol_1030_1200"),
                    "vol_1200_1300":fv("vol_1200_1300"),
                    "vol_1300_1400":fv("vol_1300_1400"),
                    "vol_1400_1430":fv("vol_1400_1430"),
                    "vol_1430_1500":fv("vol_1430_1500"),
                }
                open_1h  = b["vol_830_900"] + b["vol_900_930"]
                close_1h = b["vol_1400_1430"] + b["vol_1430_1500"]
                buckets = [
                    {"label":"8:30-9:00",   "volume": b["vol_830_900"],  "pct": round(b["vol_830_900"]/total*100,1)  if total else 0},
                    {"label":"9:00-9:30",   "volume": b["vol_900_930"],  "pct": round(b["vol_900_930"]/total*100,1)  if total else 0},
                    {"label":"9:30-10:30",  "volume": b["vol_930_1030"], "pct": round(b["vol_930_1030"]/total*100,1) if total else 0},
                    {"label":"10:30-12:00", "volume": b["vol_1030_1200"],"pct": round(b["vol_1030_1200"]/total*100,1) if total else 0},
                    {"label":"12:00-1:00",  "volume": b["vol_1200_1300"],"pct": round(b["vol_1200_1300"]/total*100,1) if total else 0},
                    {"label":"1:00-2:00",   "volume": b["vol_1300_1400"],"pct": round(b["vol_1300_1400"]/total*100,1) if total else 0},
                    {"label":"2:00-2:30",   "volume": b["vol_1400_1430"],"pct": round(b["vol_1400_1430"]/total*100,1) if total else 0},
                    {"label":"2:30-3:00",   "volume": b["vol_1430_1500"],"pct": round(b["vol_1430_1500"]/total*100,1) if total else 0},
                ]
            else:
                # Old schema — 1-hour ET buckets (9:30-16:00)
                b = {
                    "vol_930_1000": fv("vol_930_1000"),
                    "vol_1000_1100":fv("vol_1000_1100"),
                    "vol_1100_1200":fv("vol_1100_1200"),
                    "vol_1200_1300":fv("vol_1200_1300"),
                    "vol_1300_1400":fv("vol_1300_1400"),
                    "vol_1400_1500":fv("vol_1400_1500"),
                    "vol_1500_1600":fv("vol_1500_1600"),
                }
                open_1h  = b["vol_930_1000"]
                close_1h = b["vol_1500_1600"]
                buckets = [
                    {"label":"9:30-10:00",  "volume": b["vol_930_1000"], "pct": round(b["vol_930_1000"]/total*100,1)  if total else 0},
                    {"label":"10:00-11:00", "volume": b["vol_1000_1100"],"pct": round(b["vol_1000_1100"]/total*100,1) if total else 0},
                    {"label":"11:00-12:00", "volume": b["vol_1100_1200"],"pct": round(b["vol_1100_1200"]/total*100,1) if total else 0},
                    {"label":"12:00-1:00",  "volume": b["vol_1200_1300"],"pct": round(b["vol_1200_1300"]/total*100,1) if total else 0},
                    {"label":"1:00-2:00",   "volume": b["vol_1300_1400"],"pct": round(b["vol_1300_1400"]/total*100,1) if total else 0},
                    {"label":"2:00-3:00",   "volume": b["vol_1400_1500"],"pct": round(b["vol_1400_1500"]/total*100,1) if total else 0},
                    {"label":"3:00-4:00",   "volume": b["vol_1500_1600"],"pct": round(b["vol_1500_1600"]/total*100,1) if total else 0},
                ]
            entry["volume_analysis"] = {
                "total_volume":  total,
                "open_1h":       open_1h,
                "open_1h_pct":   round(open_1h/total*100,1)  if total else None,
                "close_1h":      close_1h,
                "close_1h_pct":  round(close_1h/total*100,1) if total else None,
                "peak_time":     vd.get("peak_volume_time"),
                "peak_volume":   vd.get("peak_volume_amount"),
                "hvn_price":     vd.get("hvn_price"),
                "hvn_volume":    vd.get("hvn_volume"),
                "buckets":       buckets,
            }
        output.append(entry)
    with open("spy_data.json","w") as f:
        json.dump(output, f)
    print(f"spy_data.json: {len(output)} days")


def build_wem_stats(weekly_em_list):
    completed = [d for d in weekly_em_list if d["week_close"] is not None]
    if not completed: return {}
    ranges        = [d["wem_range"] for d in completed if d["wem_range"]]
    inside        = [d for d in completed if d["closed_inside"] == 1]
    breaches      = [d for d in completed if d["breach"] == 1]
    gaps          = [d for d in completed if d["weekly_gap"] is not None]
    gaps_filled   = [d for d in gaps if d["gap_filled"] == 1]
    high_breaches = [d for d in breaches if d["breach_side"] == "HIGH"]
    low_breaches  = [d for d in breaches if d["breach_side"] == "LOW"]
    gap_up        = [d for d in gaps if (d["weekly_gap"] or 0) > 0.10]
    gap_down      = [d for d in gaps if (d["weekly_gap"] or 0) < -0.10]
    return {
        "total_weeks":       len(completed),
        "avg_range":         round(sum(ranges)/len(ranges),2) if ranges else None,
        "pct_inside":        round(len(inside)/len(completed)*100,1),
        "pct_outside":       round((len(completed)-len(inside))/len(completed)*100,1),
        "weeks_with_breach": len(breaches),
        "weeks_no_breach":   len(completed)-len(breaches),
        "pct_high_breach":   round(len(high_breaches)/len(completed)*100,1),
        "pct_low_breach":    round(len(low_breaches)/len(completed)*100,1),
        "avg_breach_amt":    round(sum(d["breach_amount"] for d in breaches if d["breach_amount"])/len(breaches),2) if breaches else None,
        "avg_high_breach_amt": round(sum(abs(d["breach_amount"]) for d in high_breaches if d["breach_amount"] is not None)/len(high_breaches),2) if high_breaches else None,
        "avg_low_breach_amt":  round(sum(d["breach_amount"] for d in low_breaches  if d["breach_amount"] is not None)/len(low_breaches), 2) if low_breaches  else None,
        "pct_gap_weeks":     round(len(gap_up+gap_down)/len(completed)*100,1) if completed else None,
        "pct_gaps_filled":   round(len(gaps_filled)/len(gaps)*100,1) if gaps else None,
        "avg_gap_up":        round(sum(d["weekly_gap"] for d in gap_up)/len(gap_up),2) if gap_up else None,
        "avg_gap_down":      round(sum(d["weekly_gap"] for d in gap_down)/len(gap_down),2) if gap_down else None,
        "breach_by_day": {
            day: len([d for d in breaches if d["breach_day"]==day])
            for day in ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"]
        }
    }


def fetch_econ_calendar():
    """Fetch USD economic calendar with multiple fallbacks."""
    # Method 1: market-calendar-tool
    try:
        from market_calendar_tool import scrape_calendar, clean_calendar_data
        today = datetime.now(CT).date()
        monday = today - timedelta(days=today.weekday())
        friday = monday + timedelta(days=4)
        raw  = scrape_calendar(date_from=monday.strftime("%Y-%m-%d"), date_to=friday.strftime("%Y-%m-%d"))
        data = clean_calendar_data(raw)
        df = data.base
        if df is not None and not df.empty:
            events = []
            for _, row in df.iterrows():
                currency = str(row.get("currency","")).strip().upper()
                if currency not in ("USD","$","US"): continue
                impact_raw = str(row.get("impact","")).strip().lower()
                impact = "High" if "high" in impact_raw else "Medium" if "medium" in impact_raw else "Low"
                events.append({
                    "date": str(row.get("date",""))[:10],
                    "time": str(row.get("time","")),
                    "event": str(row.get("event","")),
                    "impact": impact,
                    "previous": str(row.get("previous","") or ""),
                    "forecast": str(row.get("forecast","") or ""),
                    "actual": str(row.get("actual","") or ""),
                })
            events.sort(key=lambda x: (x["date"], x["time"]))
            if events:
                print(f"  Econ calendar (market-calendar-tool): {len(events)} USD events")
                return events
    except ImportError:
        print("  market-calendar-tool not installed, trying fallback...")
    except Exception as e:
        print(f"  market-calendar-tool error: {e}")

    # Method 2: ForexFactory CDN
    try:
        headers = {"User-Agent": "Mozilla/5.0", "Referer": "https://www.forexfactory.com/"}
        r = requests.get("https://cdn-nfs.faireconomy.media/ff_calendar_thisweek.json", headers=headers, timeout=15)
        if r.status_code == 200:
            events = []
            for e in r.json():
                if e.get("country") != "USD": continue
                events.append({
                    "date": e.get("date","")[:10],
                    "time": e.get("time",""),
                    "event": e.get("title",""),
                    "impact": {"High":"High","Medium":"Medium","Low":"Low"}.get(e.get("impact","Low"),"Low"),
                    "previous": e.get("previous",""),
                    "forecast": e.get("forecast",""),
                    "actual": e.get("actual",""),
                })
            events.sort(key=lambda x: (x["date"], x["time"]))
            if events:
                print(f"  Econ calendar (FF CDN): {len(events)} USD events")
                return events
    except Exception as e:
        print(f"  FF CDN error: {e}")

    print("  Econ calendar: all sources failed")
    return []


def export_market_data(conn, options_data=None):
    """Fetch all market data and write market_data.json."""
    output = {"updated": datetime.now(CT).strftime("%Y-%m-%d %H:%M CT")}

    # ── Quotes ────────────────────────────────────────────────────────────────
    try:
        import yfinance as yf
        symbols = [
            "SPY","QQQ","IWM","DIA","VXX","RSP",
            "AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA",
            "XLK","XLF","XLE","XLV","XLI","XLY","XLP","XLB","XLRE","XLU","XLC",
            "SMH","XBI","KRE","XRT","ITB","XOP","GDX","ARKK","XHB",
            "GC=F","SI=F","CL=F","NG=F","HG=F",
            "BTC-USD","ETH-USD","DX-Y.NYB",
            "^VIX","^VIX3M","^VIX6M","^TNX","^IRX","^FVX",
            "^VVIX","^SKEW","^NYA","^NYHGH","^NYLOW",
            "^ADVN","^DECN","^UVOL","^DVOL",
            "^SP500MA50","^SP500MA200",
            "TLT","HYG","LQD","JNK",
            "^GSPC","ES=F"
        ]
        print("Fetching market quotes...")
        quotes = {}
        tickers = yf.Tickers(" ".join(symbols))
        for sym in symbols:
            try:
                info  = tickers.tickers[sym].fast_info
                price = float(info.last_price) if info.last_price else None
                prev  = float(info.previous_close) if info.previous_close else None
                chg   = round(price-prev,4) if price and prev else None
                pchg  = round((chg/prev)*100,4) if chg and prev else None
                q_data = {"price":round(price,2) if price else None,
                               "change":chg,"pct_change":pchg}
                # Add extra fields for SPY
                if sym == "SPY":
                    try:
                        q_data["open"] = float(info.open) if hasattr(info,'open') and info.open else None
                        q_data["high"] = float(info.day_high) if hasattr(info,'day_high') and info.day_high else None
                        q_data["low"] = float(info.day_low) if hasattr(info,'day_low') and info.day_low else None
                        q_data["prev_close"] = round(prev,2) if prev else None
                        q_data["volume"] = int(info.shares) if hasattr(info,'shares') and info.shares else None
                        # Pre/post market
                        t = tickers.tickers[sym]
                        ticker_info = t.info
                        q_data["pre_market_price"] = ticker_info.get("preMarketPrice")
                        q_data["post_market_price"] = ticker_info.get("postMarketPrice")
                    except: pass
                quotes[sym] = q_data
            except:
                quotes[sym] = {"price":None,"change":None,"pct_change":None}
        output["quotes"] = quotes
        print(f"  Quotes: {len([q for q in quotes.values() if q['price']])} loaded")
    except Exception as e:
        print(f"  Quotes error: {e}")
        output["quotes"] = {}

    # ── Options + Max Pain ────────────────────────────────────────────────────
    if options_data:
        output["max_pain"]        = options_data.get("max_pain", [])
        output["options_summary"] = options_data.get("options_summary", {})
        output["top_call_strikes"] = options_data.get("options_summary", {}).get("top_call_strikes", [])
        output["top_put_strikes"]  = options_data.get("options_summary", {}).get("top_put_strikes", [])
        output["gex"]             = options_data.get("gex", None)
        print(f"  Max pain: {len(output['max_pain'])} expirations")
    else:
        output["max_pain"]        = []
        output["options_summary"] = {}
        output["top_call_strikes"] = []
        output["top_put_strikes"]  = []

    # ── Fear & Greed (CNN via direct request) ─────────────────────────────────
    try:
        r = requests.get(
            "https://production.dataviz.cnn.io/index/fearandgreed/graphdata",
            headers={"User-Agent":"Mozilla/5.0","Referer":"https://www.cnn.com/markets/fear-and-greed"},
            timeout=10)
        if r.status_code == 200:
            fg = r.json().get("fear_and_greed", {})
            if fg.get("score"):
                output["fear_greed"] = {
                    "value": round(fg["score"]),
                    "label": fg.get("rating",""),
                }
                print(f"  F&G (CNN): {output['fear_greed']['value']}")
            else:
                raise ValueError("No score in response")
        else:
            raise ValueError(f"Status {r.status_code}")
    except Exception as e:
        # Fallback to alternative.me
        try:
            r2 = requests.get("https://api.alternative.me/fng/", timeout=10)
            d = r2.json().get("data", [{}])[0]
            output["fear_greed"] = {
                "value": int(d.get("value", 0)),
                "label": d.get("value_classification", ""),
            }
            print(f"  F&G (alt): {output['fear_greed']['value']}")
        except Exception as e2:
            print(f"  F&G error: {e2}")
            output["fear_greed"] = {}

    # ── Economic Calendar ─────────────────────────────────────────────────────
    output["econ_calendar"] = fetch_econ_calendar()

    # ── MOVE Index from FRED ───────────────────────────────────────────────────
    try:
        move_url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=ICEMOVE"
        r = requests.get(move_url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        if r.status_code == 200:
            lines = [l for l in r.text.strip().split('\n') if ',' in l and not l.startswith('DATE')]
            # Find the most recent non-missing value (FRED lags 1 day, latest row may be '.')
            valid = [(l.split(',')[0], l.split(',')[1]) for l in lines if l.split(',')[1] not in ('.','')]
            if len(valid) >= 2:
                latest_date, latest_raw = valid[-1]
                prev_date,   prev_raw   = valid[-2]
                val      = float(latest_raw)
                prev_val = float(prev_raw)
                output["move_index"] = {
                    "value":      val,
                    "date":       latest_date,
                    "change":     round(val - prev_val, 2),
                    "change_pct": round((val - prev_val)/prev_val*100, 2) if prev_val else None
                }
                print(f"  MOVE Index: {val} (as of {latest_date})")
    except Exception as e:
        print(f"  MOVE error: {e}")

    # ── Weekly EM from DB ─────────────────────────────────────────────────────
    try:
        c = conn.cursor()
        rows = c.execute("SELECT * FROM weekly_em ORDER BY week_start DESC LIMIT 52").fetchall()
        cols = ["week_start","week_end","friday_close","atm_iv","vix_iv","dte",
                "wem_high","wem_mid","wem_low","wem_range",
                "atm_straddle_high","atm_straddle_low",
                "week_open","week_high","week_low","week_close",
                "weekly_gap","gap_filled","gap_fill_day",
                "closed_inside","breach","breach_side","breach_amount","breach_day","max_pain"]
        weekly_em = [dict(zip(cols,r)) for r in rows]
        output["weekly_em"]  = weekly_em
        output["wem_stats"]  = build_wem_stats(weekly_em)
        print(f"  WEM history: {len(weekly_em)} weeks")
    except Exception as e:
        print(f"  WEM export error: {e}")
        output["weekly_em"] = []
        output["wem_stats"] = {}

    # ── Single write ──────────────────────────────────────────────────────────
    with open("market_data.json","w") as f:
        json.dump(output, f)
    print("market_data.json exported.")


# ── Print Summary ──────────────────────────────────────────────────────────────
def print_summary(conn, target_date):
    c = conn.cursor()
    row = c.execute("SELECT * FROM daily_measurements WHERE date=?", (target_date,)).fetchone()
    va  = c.execute("SELECT * FROM volume_analysis WHERE date=?", (target_date,)).fetchone()
    print(f"\n{'='*60}\n  SPY {target_date}\n{'='*60}")
    if row: print(f"  O→C: {row[1]:+.4f} ({row[11]:+.2f}%)  Range: {row[6]:.4f} ({row[16]:.2f}%)")
    if va:  print(f"  Vol: {va[1]:,}  Peak: {va[11]:,}@{va[9]}  HVN: ${va[12]}")
    print('='*60)


# ── Intraday 1m / 5m Storage ───────────────────────────────────────────────────
def fetch_and_store_intraday_1m(conn, target_date):
    """Fetch 1-min bars from yfinance and upsert into intraday_1m. Max lookback ~7 days."""
    try:
        import yfinance as yf
        from datetime import datetime as _dt, timedelta as _td
        next_day = (_dt.strptime(target_date, "%Y-%m-%d") + _td(days=1)).strftime("%Y-%m-%d")
        hist = yf.Ticker("SPY").history(start=target_date, end=next_day, interval="1m", prepost=False)
        if hist.empty:
            print(f"  1m: no bars for {target_date}")
            return 0
        c = conn.cursor()
        inserted = 0
        for ts, row in hist.iterrows():
            # Normalize to ET HH:MM
            import pytz as _tz
            et = ts.astimezone(_tz.timezone("America/New_York"))
            t_str = et.strftime("%H:%M")
            mins = et.hour * 60 + et.minute
            if not (9 * 60 + 30 <= mins < 16 * 60):
                continue
            c.execute(
                "INSERT OR IGNORE INTO intraday_1m VALUES (?,?,?,?,?,?,?)",
                (target_date, t_str,
                 round(float(row["Open"]), 4), round(float(row["High"]), 4),
                 round(float(row["Low"]), 4),  round(float(row["Close"]), 4),
                 int(row["Volume"]))
            )
            inserted += c.rowcount
        conn.commit()
        print(f"  1m {target_date}: {inserted} new bars (session total in DB: {c.execute('SELECT COUNT(*) FROM intraday_1m WHERE date=?', (target_date,)).fetchone()[0]})")
        return inserted
    except Exception as e:
        print(f"  1m error {target_date}: {e}")
        return 0


def fetch_and_store_intraday_5m(conn, target_date):
    """Fetch 5-min bars from yfinance and upsert into intraday_5m. Max lookback ~60 days."""
    try:
        import yfinance as yf
        from datetime import datetime as _dt, timedelta as _td
        next_day = (_dt.strptime(target_date, "%Y-%m-%d") + _td(days=1)).strftime("%Y-%m-%d")
        hist = yf.Ticker("SPY").history(start=target_date, end=next_day, interval="5m", prepost=False)
        if hist.empty:
            print(f"  5m: no bars for {target_date}")
            return 0
        c = conn.cursor()
        inserted = 0
        for ts, row in hist.iterrows():
            import pytz as _tz
            et = ts.astimezone(_tz.timezone("America/New_York"))
            t_str = et.strftime("%H:%M")
            mins = et.hour * 60 + et.minute
            if not (9 * 60 + 30 <= mins < 16 * 60):
                continue
            c.execute(
                "INSERT OR IGNORE INTO intraday_5m VALUES (?,?,?,?,?,?,?)",
                (target_date, t_str,
                 round(float(row["Open"]), 4), round(float(row["High"]), 4),
                 round(float(row["Low"]), 4),  round(float(row["Close"]), 4),
                 int(row["Volume"]))
            )
            inserted += c.rowcount
        conn.commit()
        print(f"  5m {target_date}: {inserted} new bars")
        return inserted
    except Exception as e:
        print(f"  5m error {target_date}: {e}")
        return 0


def compute_session_stats(conn, target_date):
    """
    Derive per-session trading stats from intraday_1m and store in intraday_session_stats.
    Computes: gap, opening range, initial move, gap fill, OR break, best/worst 5m,
    power hour, lunch range.
    """
    try:
        c = conn.cursor()
        bars = c.execute(
            "SELECT time, open, high, low, close, volume FROM intraday_1m WHERE date=? ORDER BY time",
            (target_date,)
        ).fetchall()
        if len(bars) < 10:
            return

        # Session open/close price from daily_ohlcv
        daily = c.execute(
            "SELECT open, close FROM daily_ohlcv WHERE date=?", (target_date,)
        ).fetchone()
        prev = c.execute(
            "SELECT close FROM daily_ohlcv WHERE date<? ORDER BY date DESC LIMIT 1", (target_date,)
        ).fetchone()
        if not daily or not prev:
            return

        day_open   = daily[0]
        day_close  = daily[1]
        prev_close = prev[0]

        # ── Gap ─────────────────────────────────────────────────────────────
        gap_pct = round((day_open - prev_close) / prev_close * 100, 4)
        if gap_pct > 0.25:   gap_type = "GAP_UP"
        elif gap_pct < -0.25: gap_type = "GAP_DOWN"
        else:                  gap_type = "FLAT"

        # ── Opening Range: first 30 bars (30 minutes) ────────────────────────
        or_bars = bars[:30]
        or_high = max(b[2] for b in or_bars)
        or_low  = min(b[3] for b in or_bars)
        or_range = round((or_high - or_low) / day_open * 100, 4)

        # ── Initial move: direction at bar 15 (15 min in) ────────────────────
        bar15 = bars[14] if len(bars) > 14 else bars[-1]
        initial_move_dir = "UP" if bar15[4] >= day_open else "DOWN"
        initial_move_pct = round((bar15[4] - day_open) / day_open * 100, 4)

        # ── Gap fill: did price cross prev_close during session? ─────────────
        gap_filled = None
        gap_fill_time = None
        if gap_type == "GAP_UP":
            for b in bars:
                if b[3] <= prev_close:
                    gap_filled = 1
                    gap_fill_time = b[0]
                    break
            if gap_filled is None: gap_filled = 0
        elif gap_type == "GAP_DOWN":
            for b in bars:
                if b[2] >= prev_close:
                    gap_filled = 1
                    gap_fill_time = b[0]
                    break
            if gap_filled is None: gap_filled = 0

        # ── OR break: first time price closes outside opening range ──────────
        or_break_dir  = None
        or_break_time = None
        or_break_pct  = None
        for b in bars[30:]:
            if b[4] > or_high:
                or_break_dir  = "UP"
                or_break_time = b[0]
                or_break_pct  = round((b[4] - or_high) / or_high * 100, 4)
                break
            elif b[4] < or_low:
                or_break_dir  = "DOWN"
                or_break_time = b[0]
                or_break_pct  = round((b[4] - or_low) / or_low * 100, 4)
                break

        # ── Best and worst individual 1-min bars (by % move) ─────────────────
        bar_pcts = [(b[0], round((b[4] - b[1]) / b[1] * 100, 4)) for b in bars if b[1] > 0]
        best  = max(bar_pcts, key=lambda x: x[1])
        worst = min(bar_pcts, key=lambda x: x[1])

        # ── Power hour (15:00–16:00 ET) ──────────────────────────────────────
        ph_bars = [b for b in bars if b[0] >= "15:00"]
        power_hour_dir = None
        power_hour_pct = None
        if ph_bars:
            ph_start = ph_bars[0][1]   # open of first bar
            ph_end   = ph_bars[-1][4]  # close of last bar
            power_hour_pct = round((ph_end - ph_start) / ph_start * 100, 4)
            power_hour_dir = "UP" if power_hour_pct >= 0 else "DOWN"

        # ── Lunch range (11:30–13:00 ET) ─────────────────────────────────────
        lunch_bars = [b for b in bars if "11:30" <= b[0] < "13:00"]
        lunch_range_pct = None
        if lunch_bars:
            lh = max(b[2] for b in lunch_bars)
            ll = min(b[3] for b in lunch_bars)
            lunch_range_pct = round((lh - ll) / ll * 100, 4)

        day_range_pct = round((max(b[2] for b in bars) - min(b[3] for b in bars)) / day_open * 100, 4)

        c.execute("""INSERT OR REPLACE INTO intraday_session_stats VALUES
            (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (target_date, gap_pct, gap_type,
             or_high, or_low, or_range,
             initial_move_dir, initial_move_pct,
             gap_filled, gap_fill_time,
             or_break_dir, or_break_time, or_break_pct,
             best[0], best[1], worst[0], worst[1],
             power_hour_dir, power_hour_pct,
             lunch_range_pct,
             day_open, day_close, prev_close, day_range_pct))
        conn.commit()
        print(f"  Session stats {target_date}: gap={gap_pct:+.2f}% OR={or_range:.2f}% OR_break={or_break_dir} PH={power_hour_pct}")
    except Exception as e:
        print(f"  Session stats error {target_date}: {e}")
        import traceback; traceback.print_exc()


def export_intraday_json(conn):
    """Export session stats derived from intraday_bars to intraday_library.js for the frontend."""
    from collections import defaultdict
    c = conn.cursor()

    dates = [r[0] for r in c.execute(
        'SELECT DISTINCT date FROM intraday_bars ORDER BY date DESC'
    ).fetchall()]

    if not dates:
        print("  intraday_library.js: no intraday_bars data yet")
        return

    # Build prev_close lookup from daily_ohlcv
    daily = {}
    for r in c.execute('SELECT date, open, high, low, close FROM daily_ohlcv').fetchall():
        daily[r[0]] = {'open': r[1], 'high': r[2], 'low': r[3], 'close': r[4]}

    records = []
    for i, date in enumerate(dates):
        bars = c.execute(
            'SELECT timestamp, open, high, low, close, volume FROM intraday_bars WHERE date=? ORDER BY timestamp',
            (date,)
        ).fetchall()
        if not bars:
            continue
        session = [(t, o, h, l, cl, v) for t, o, h, l, cl, v in bars if '09:30' <= t <= '15:59']
        if not session:
            continue

        open_price  = session[0][1]
        close_price = session[-1][4]
        day_high    = max(b[2] for b in session)
        day_low     = min(b[3] for b in session)
        day_range_pct = round((day_high - day_low) / open_price * 100, 3) if open_price else None

        prev_date  = dates[i + 1] if i + 1 < len(dates) else None
        prev_close = daily.get(prev_date, {}).get('close') if prev_date else None
        gap_pct    = round((open_price - prev_close) / prev_close * 100, 3) if prev_close else None
        if gap_pct is None:       gap_type = None
        elif gap_pct > 0.25:      gap_type = 'GAP_UP'
        elif gap_pct < -0.25:     gap_type = 'GAP_DOWN'
        else:                     gap_type = 'FLAT'

        or_bars  = [(t, o, h, l, cl, v) for t, o, h, l, cl, v in session if t <= '09:59']
        or_high  = max(b[2] for b in or_bars) if or_bars else None
        or_low   = min(b[3] for b in or_bars) if or_bars else None
        or_range = round((or_high - or_low) / or_low * 100, 3) if or_high and or_low else None

        post_or = [(t, o, h, l, cl, v) for t, o, h, l, cl, v in session if t >= '10:00']
        or_break_dir = None; or_break_time = None
        if or_high and or_low and post_or:
            for t, o, h, l, cl, v in post_or:
                if cl > or_high:   or_break_dir = 'UP';   or_break_time = t; break
                elif cl < or_low:  or_break_dir = 'DOWN'; or_break_time = t; break

        gap_filled = None; gap_fill_time = None
        if gap_type == 'GAP_UP' and prev_close:
            for t, o, h, l, cl, v in session:
                if l <= prev_close: gap_filled = 1; gap_fill_time = t; break
            if gap_filled is None: gap_filled = 0
        elif gap_type == 'GAP_DOWN' and prev_close:
            for t, o, h, l, cl, v in session:
                if h >= prev_close: gap_filled = 1; gap_fill_time = t; break
            if gap_filled is None: gap_filled = 0

        init_bars = [(t, o, h, l, cl, v) for t, o, h, l, cl, v in session if t <= '09:44']
        init_move_dir = None; init_move_pct = None
        if init_bars:
            init_close    = init_bars[-1][4]
            init_move_pct = round((init_close - open_price) / open_price * 100, 3) if open_price else None
            init_move_dir = 'UP' if (init_move_pct or 0) > 0 else 'DOWN'

        buckets = defaultdict(list)
        for t, o, h, l, cl, v in session:
            hh, mm = int(t[:2]), int(t[3:])
            buckets[f'{hh:02d}:{(mm // 5) * 5:02d}'].append(cl)
        best_5m_time = None; best_5m_pct = None; worst_5m_time = None; worst_5m_pct = None
        best_p = None; worst_p = None
        for bt, closes in buckets.items():
            if len(closes) < 2: continue
            pct = (closes[-1] - closes[0]) / closes[0] * 100 if closes[0] else 0
            if best_p is None or pct > best_p:  best_p  = pct; best_5m_time  = bt; best_5m_pct  = round(pct, 3)
            if worst_p is None or pct < worst_p: worst_p = pct; worst_5m_time = bt; worst_5m_pct = round(pct, 3)

        ph_bars = [(t, o, h, l, cl, v) for t, o, h, l, cl, v in session if '15:00' <= t <= '15:59']
        power_hour_dir = None; power_hour_pct = None
        if ph_bars:
            ph_open = ph_bars[0][1]; ph_close = ph_bars[-1][4]
            power_hour_pct = round((ph_close - ph_open) / ph_open * 100, 3) if ph_open else None
            power_hour_dir = 'UP' if (power_hour_pct or 0) >= 0 else 'DOWN'

        lunch_bars = [(t, o, h, l, cl, v) for t, o, h, l, cl, v in session if '11:30' <= t <= '12:59']
        lunch_range_pct = None
        if lunch_bars:
            lh = max(b[2] for b in lunch_bars); ll = min(b[3] for b in lunch_bars)
            lunch_range_pct = round((lh - ll) / ll * 100, 3) if ll else None

        rec = {
            'date': date, 'gap_pct': gap_pct, 'gap_type': gap_type,
            'or_high':  round(or_high,  2) if or_high  else None,
            'or_low':   round(or_low,   2) if or_low   else None,
            'or_range': or_range,
            'initial_move_dir': init_move_dir, 'initial_move_pct': init_move_pct,
            'gap_filled': gap_filled, 'gap_fill_time': gap_fill_time,
            'or_break_dir': or_break_dir, 'or_break_time': or_break_time, 'or_break_pct': None,
            'best_5m_time': best_5m_time, 'best_5m_pct': best_5m_pct,
            'worst_5m_time': worst_5m_time, 'worst_5m_pct': worst_5m_pct,
            'power_hour_dir': power_hour_dir, 'power_hour_pct': power_hour_pct,
            'lunch_range_pct': lunch_range_pct,
            'open_price':  round(open_price,  2) if open_price  else None,
            'close_price': round(close_price, 2) if close_price else None,
            'prev_close':  round(prev_close,  2) if prev_close  else None,
            'day_range_pct': day_range_pct,
        }
        # Attach bars for the most recent session (for live chart use)
        if i == 0:
            rec['bars_1m'] = [
                {'t': t, 'o': o, 'h': h, 'l': l, 'c': cl, 'v': v}
                for t, o, h, l, cl, v in session
            ]
        records.append(rec)

    with open('intraday_library.js', 'w') as f:
        f.write('const INTRADAY_SESSION_STATS = ')
        json.dump(records, f)
        f.write(';\n')
    print(f'  intraday_library.js: {len(records)} sessions exported')


# ── Main ───────────────────────────────────────────────────────────────────────
def get_trading_days_to_process(conn):
    """
    Return a list of all trading days that need processing:
    - Any weekday up to and including today (CT) that is missing from daily_ohlcv
    - Plus today if market has closed (after 4 PM CT) or it's a new day not yet added
    - Skips weekends. Does not skip holidays (Polygon will 404, which is caught gracefully).
    """
    now_ct  = datetime.now(CT)
    today   = now_ct.date()
    market_closed_today = now_ct.hour >= 16  # after 4 PM CT market is closed

    # Build the set of weekdays in the last 10 days that could be trading days
    candidates = []
    for i in range(10):
        d = today - timedelta(days=i)
        if d.weekday() < 5:  # Mon–Fri only
            candidates.append(d)

    # Get dates already in the DB with complete data
    existing_ohlcv = set(
        r[0] for r in conn.execute("SELECT date FROM daily_ohlcv").fetchall()
    )
    existing_vol = set(
        r[0] for r in conn.execute(
            "SELECT date FROM volume_analysis WHERE hvn_price IS NOT NULL"
        ).fetchall()
    )

    to_process = []
    for d in sorted(candidates):  # oldest first
        d_str = d.strftime("%Y-%m-%d")
        is_today = (d == today)

        # For today: only add if market has closed (we have a final bar)
        # or if OHLCV is completely missing (first run of the day)
        if is_today:
            if market_closed_today or d_str not in existing_ohlcv:
                to_process.append(d_str)
        else:
            # Past days: add if OHLCV missing OR volume_analysis incomplete
            if d_str not in existing_ohlcv or d_str not in existing_vol:
                to_process.append(d_str)

    return to_process


def main():
    now_ct  = datetime.now(CT)
    today   = now_ct.date()
    print(f"\nSPY Tracker — {now_ct.strftime('%Y-%m-%d %H:%M CT')}")

    conn = sqlite3.connect(DB_PATH)
    try:
        init_db(conn)

        # ── Step 1: Determine which days need processing ──────────────────────
        dates_to_process = get_trading_days_to_process(conn)
        print(f"\nDays to process: {dates_to_process if dates_to_process else 'none (all up to date)'}")

        # ── Step 2: yfinance OHLC backfill — cheap, no API key, gets everything ─
        print("\n── Daily OHLC Backfill (yfinance) ───────────────────────────")
        try:
            import yfinance as yf
            spy_yf = yf.Ticker("SPY")
            hist   = spy_yf.history(period="max", interval="1d", auto_adjust=False)
            tomorrow_str = (today + timedelta(days=1)).strftime("%Y-%m-%d")
            backfilled = 0
            for dt, row in hist.iterrows():
                d_str = dt.strftime("%Y-%m-%d")
                if d_str >= tomorrow_str:
                    continue  # never write future dates
                o = float(row['Open']);  h = float(row['High'])
                l = float(row['Low']);   c = float(row['Close'])
                v = int(row['Volume'])
                if not o or not c:
                    continue
                conn.execute("INSERT OR REPLACE INTO daily_ohlcv VALUES (?,?,?,?,?,?,?)",
                             (d_str, o, h, l, c, v, None))
                backfilled += 1
            if backfilled:
                conn.commit()
                print(f"  Synced {backfilled} days of OHLC from yfinance")
            else:
                print("  OHLC already up to date")

            # Compute measurements for any day missing them
            missing_meas = [r[0] for r in conn.execute(
                "SELECT o.date FROM daily_ohlcv o "
                "LEFT JOIN daily_measurements m ON o.date = m.date "
                "WHERE m.date IS NULL ORDER BY o.date"
            ).fetchall()]
            for nd in missing_meas:
                try:
                    compute_measurements(conn, nd)
                except Exception as e:
                    print(f"  Measurements error {nd}: {e}")
            if missing_meas:
                conn.commit()
                print(f"  Computed measurements for {len(missing_meas)} days")
        except Exception as e:
            print(f"  yfinance backfill error: {e}")

        # Re-check after backfill — dates_to_process may now only need intraday
        dates_to_process = get_trading_days_to_process(conn)

        # ── Step 3: Polygon intraday for any day still missing volume_analysis ─
        print("\n── Intraday / HVN (Polygon) ─────────────────────────────────")
        # Collect all dates missing volume analysis (not just today)
        need_intraday = [r[0] for r in conn.execute(
            "SELECT d.date FROM daily_ohlcv d "
            "LEFT JOIN volume_analysis v ON d.date = v.date "
            "WHERE v.date IS NULL OR v.hvn_price IS NULL "
            "ORDER BY d.date DESC LIMIT 30"
        ).fetchall()]
        if need_intraday:
            print(f"  Fetching intraday for: {need_intraday}")
            for d_str in need_intraday:
                try:
                    bars = get_intraday_bars(d_str)
                    if bars:
                        store_intraday_and_volume(conn, d_str, bars)
                        print(f"  ✓ {d_str}: {len(bars)} bars")
                    else:
                        print(f"  – {d_str}: no bars returned (market may still be open or holiday)")
                except Exception as e:
                    print(f"  ✗ {d_str}: {e}")
        else:
            print("  All volume analysis up to date")

        # ── Step 4: Options, WEM, JSON exports ───────────────────────────────
        # Use today as the reference date for WEM/options (or most recent weekday)
        ref = today
        if ref.weekday() == 5: ref -= timedelta(days=1)
        if ref.weekday() == 6: ref -= timedelta(days=2)
        ref_str = ref.strftime("%Y-%m-%d")

        print("\n── Options Data ─────────────────────────────────────────────")
        options_data = fetch_spy_options_cboe()
        if not options_data or not options_data.get("max_pain"):
            print("  CBOE unavailable, falling back to yfinance options...")
            options_data = fetch_spy_options_yf_fallback()

        print("\n── Weekly Expected Move ─────────────────────────────────────")
        try:
            compute_weekly_em(conn, ref_str, atm_iv_override=None)
        except Exception as e:
            print(f"  WEM error: {e}")

        if ref.weekday() == 4:
            try:
                print("  Friday — computing next week's WEM...")
                compute_weekly_em(conn, ref_str, atm_iv_override=None, is_next_week=True)
            except Exception as e:
                print(f"  Next week WEM error: {e}")

        print("\n── JSON Export ──────────────────────────────────────────────")
        try:
            export_spy_json(conn)
        except Exception as e:
            print(f"  spy_data.json error: {e}")

        try:
            export_market_data(conn, options_data=options_data)
        except Exception as e:
            print(f"  market_data.json error: {e}")

        # ── Step 5: Intraday 1m + 5m accumulation ────────────────────────────
        print("\n── Intraday 1m / 5m Accumulation ───────────────────────────")
        # Determine which recent trading days are missing intraday data
        # 1m: only fetch last 7 calendar days (yfinance limit)
        # 5m: fetch last 60 calendar days (yfinance limit)
        from datetime import timedelta as _td2
        try:
            today_str  = today.strftime("%Y-%m-%d")
            # Dates to try for 1m (last 7 trading days)
            candidate_1m = []
            for i in range(8):
                d = today - _td2(days=i)
                if d.weekday() < 5:
                    candidate_1m.append(d.strftime("%Y-%m-%d"))

            # Dates to try for 5m (last 60 calendar days of trading days)
            candidate_5m = []
            for i in range(65):
                d = today - _td2(days=i)
                if d.weekday() < 5:
                    candidate_5m.append(d.strftime("%Y-%m-%d"))

            # Only fetch if bars not already in DB for that date
            existing_1m = set(r[0] for r in conn.execute(
                "SELECT DISTINCT date FROM intraday_1m WHERE date >= ?",
                ((today - _td2(days=8)).strftime("%Y-%m-%d"),)
            ).fetchall())

            existing_5m = set(r[0] for r in conn.execute(
                "SELECT DISTINCT date FROM intraday_5m WHERE date >= ?",
                ((today - _td2(days=65)).strftime("%Y-%m-%d"),)
            ).fetchall())

            # Always re-fetch today to get latest bars
            to_fetch_1m = [d for d in candidate_1m if d not in existing_1m or d == today_str]
            to_fetch_5m = [d for d in candidate_5m if d not in existing_5m or d == today_str]

            print(f"  1m: fetching {len(to_fetch_1m)} dates: {to_fetch_1m[:3]}{'...' if len(to_fetch_1m)>3 else ''}")
            for d_str in to_fetch_1m:
                fetch_and_store_intraday_1m(conn, d_str)

            print(f"  5m: fetching {len(to_fetch_5m)} dates")
            for d_str in to_fetch_5m:
                fetch_and_store_intraday_5m(conn, d_str)

            # Compute session stats for any date with 1m bars but missing stats
            missing_stats = [r[0] for r in conn.execute("""
                SELECT DISTINCT i.date FROM intraday_1m i
                LEFT JOIN intraday_session_stats s ON i.date = s.date
                WHERE s.date IS NULL
                ORDER BY i.date DESC LIMIT 60
            """).fetchall()]
            # Also recompute today always (bars may have been updated)
            if today_str not in missing_stats and today_str in existing_1m | set(to_fetch_1m):
                missing_stats.insert(0, today_str)
            print(f"  Computing session stats for {len(missing_stats)} dates")
            for d_str in missing_stats:
                compute_session_stats(conn, d_str)

            # Export intraday JS
            export_intraday_json(conn)

            # Update GitHub Actions commit list
            print("  Intraday accumulation complete")
        except Exception as e:
            print(f"  Intraday accumulation error: {e}")
            import traceback; traceback.print_exc()

        print_summary(conn, ref_str)

    finally:
        conn.close()
        print("\nDone.")


if __name__ == "__main__":
    main()


# ── Re-import WEM from CSV (run once to fix historical data) ──────────────────
def reimport_wem_from_csv(conn, csv_path):
    """Re-import WEM history from spreadsheet CSV using actual Range +/- values."""
    import csv
    from datetime import datetime

    c = conn.cursor()
    updated = 0

    with open(csv_path, 'r') as f:
        reader = csv.reader(f)
        rows = list(reader)

    # Find header row
    header_row = None
    data_start = None
    for i, row in enumerate(rows):
        if row and row[0] == 'WEEK START':
            header_row = row
            data_start = i + 1
            break

    if not header_row:
        print("Could not find header row in CSV")
        return

    # Map column names
    col = {name.strip(): idx for idx, name in enumerate(header_row)}

    for row in rows[data_start:]:
        if not row or not row[0] or not row[0].strip():
            continue
        try:
            # Parse dates
            week_start_raw = row[col.get('WEEK START', 0)].strip()
            if not week_start_raw or week_start_raw == '':
                continue

            # Handle both MM/DD/YYYY and YYYY-MM-DD
            for fmt in ('%m/%d/%Y', '%Y-%m-%d'):
                try:
                    ws = datetime.strptime(week_start_raw, fmt).strftime('%Y-%m-%d')
                    break
                except:
                    ws = None

            if not ws:
                continue

            range_val = row[col.get('Range +/-', 3)].strip().replace('$','').replace(',','')
            wem_mid   = row[col.get('WEM MID', 4)].strip().replace('$','').replace(',','')

            if not range_val or not wem_mid:
                continue

            range_half = float(range_val)
            mid        = float(wem_mid)
            wem_high   = round(mid + range_half, 2)
            wem_low    = round(mid - range_half, 2)
            wem_range  = round(range_half * 2, 2)

            # Update existing row
            existing = c.execute("SELECT 1 FROM weekly_em WHERE week_start=?", (ws,)).fetchone()
            if existing:
                c.execute("""UPDATE weekly_em SET
                    wem_high=?, wem_mid=?, wem_low=?, wem_range=?,
                    friday_close=?
                    WHERE week_start=?""",
                    (wem_high, mid, wem_low, wem_range, mid, ws))
                updated += 1
                print(f"  Updated {ws}: Mid={mid} ±{range_half} → {wem_high}/{wem_low}")

        except Exception as e:
            print(f"  Row error: {e} — {row[:6]}")

    conn.commit()
    print(f"Re-imported {updated} WEM rows from CSV")
