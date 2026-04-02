// Cloudflare Pages Function — /spyintraday
// Fetches SPY regular-session intraday OHLC from Yahoo Finance 1m bars
// Returns: { open, high, low, close, volume, change, changePct, prev_close, bars, asOf,
//            open_1h, open_1h_pct, close_1h, close_1h_pct, peak_time, peak_volume,
//            hvn_price, hvn_volume, buckets }

export async function onRequest(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
  };

  try {
    // Yahoo Finance chart API — 1m bars for today
    const now   = new Date();
    const today = now.toISOString().slice(0, 10);

    // Regular session: 9:30am–4:00pm ET = 14:30–21:00 UTC
    const p1 = Math.floor(new Date(`${today}T13:00:00Z`).getTime() / 1000); // give 30m buffer before open
    const p2 = Math.floor(Math.min(new Date(`${today}T21:30:00Z`).getTime(), now.getTime()) / 1000);

    if (p2 <= p1) {
      return new Response(JSON.stringify({ error: 'Market not open yet', available: false }), { headers });
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1m&period1=${p1}&period2=${p2}&includePrePost=false`;

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)',
        'Accept': 'application/json',
      }
    });

    if (!resp.ok) throw new Error(`Yahoo returned ${resp.status}`);

    const data   = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('No chart data');

    const meta       = result.meta || {};
    const timestamps = result.timestamp || [];
    const quotes     = result.indicators?.quote?.[0] || {};
    const opens      = quotes.open   || [];
    const highs      = quotes.high   || [];
    const lows       = quotes.low    || [];
    const closes     = quotes.close  || [];
    const vols       = quotes.volume || [];

    // Filter to valid bars
    const bars = timestamps.map((t, i) => ({
      t,
      open:  opens[i],
      high:  highs[i],
      low:   lows[i],
      close: closes[i],
      vol:   vols[i],
    })).filter(b => b.close != null && b.open != null);

    if (!bars.length) {
      return new Response(JSON.stringify({ error: 'No valid bars', available: false }), { headers });
    }

    const sessionOpen  = bars[0].open;
    const sessionHigh  = Math.max(...bars.map(b => b.high  ?? b.close));
    const sessionLow   = Math.min(...bars.map(b => b.low   ?? b.close));
    const sessionClose = bars[bars.length - 1].close;
    const sessionVol   = bars.reduce((a, b) => a + (b.vol || 0), 0);
    const prevClose    = meta.previousClose || meta.chartPreviousClose || null;

    // VWAP = sum(typical_price * volume) / sum(volume)
    const vwapNum = bars.reduce((a, b) => a + ((((b.high??b.close) + (b.low??b.close) + b.close) / 3) * (b.vol||0)), 0);
    const vwap    = sessionVol > 0 ? Math.round(vwapNum / sessionVol * 100) / 100 : null;
    const change       = prevClose ? Math.round((sessionClose - prevClose) * 100) / 100 : null;
    const changePct    = prevClose && change != null ? Math.round((change / prevClose) * 10000) / 100 : null;
    const asOf = new Date(bars[bars.length - 1].t * 1000).toISOString();

    // ── CT time bucket breakdown from live 1-min bars ──────────────────────
    // Yahoo timestamps are UTC epoch seconds. CT = UTC-5 (CDT) or UTC-6 (CST).
    // Cloudflare Workers always run in UTC — getTimezoneOffset() is always 0, useless.
    // Use Intl to get the real current CT offset (handles DST automatically).
    const ctOffsetHrs = (() => {
      const ctStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        hour: 'numeric', hour12: false,
        timeZoneName: 'shortOffset'
      }).format(now);
      const m = ctStr.match(/GMT([+-]\d+)/);
      return m ? parseInt(m[1]) : -5;
    })();

    const BUCKET_DEFS = [
      { key: 'vol_830_900',   label: '8:30-9:00',   start: 8*60+30, end: 9*60     },
      { key: 'vol_900_930',   label: '9:00-9:30',   start: 9*60,    end: 9*60+30  },
      { key: 'vol_930_1030',  label: '9:30-10:30',  start: 9*60+30, end: 10*60+30 },
      { key: 'vol_1030_1200', label: '10:30-12:00', start: 10*60+30,end: 12*60    },
      { key: 'vol_1200_1300', label: '12:00-1:00',  start: 12*60,   end: 13*60    },
      { key: 'vol_1300_1400', label: '1:00-2:00',   start: 13*60,   end: 14*60    },
      { key: 'vol_1400_1430', label: '2:00-2:30',   start: 14*60,   end: 14*60+30 },
      { key: 'vol_1430_1500', label: '2:30-3:00',   start: 14*60+30,end: 15*60    },
    ];

    const bvols = Object.fromEntries(BUCKET_DEFS.map(b => [b.key, 0]));
    // Track OHLC per bucket for session volatility panel
    const bOHLC = Object.fromEntries(BUCKET_DEFS.map(b => [b.key, { high: null, low: null, open: null, close: null, bars: 0 }]));
    const priceVol = {};
    let peakBar = null;

    for (const bar of bars) {
      // Convert UTC epoch → CT minutes since midnight
      const ctDate = new Date((bar.t + ctOffsetHrs * 3600) * 1000);
      const mins = ctDate.getUTCHours() * 60 + ctDate.getUTCMinutes();
      if (mins < 8*60+30 || mins >= 15*60) continue;
      const vol = bar.vol || 0;
      for (const bd of BUCKET_DEFS) {
        if (mins >= bd.start && mins < bd.end) {
          bvols[bd.key] += vol;
          const o = bOHLC[bd.key];
          const h = bar.high ?? bar.close, l = bar.low ?? bar.close, c = bar.close;
          if (o.open === null) o.open = bar.open ?? c;
          if (o.high === null || h > o.high) o.high = h;
          if (o.low  === null || l < o.low)  o.low  = l;
          o.close = c;
          o.bars++;
          break;
        }
      }
      const pk = Math.round((bar.close ?? bar.open) * 10) / 10;
      priceVol[pk] = (priceVol[pk] || 0) + vol;
      if (!peakBar || vol > peakBar.vol) {
        const hh = String(ctDate.getUTCHours()).padStart(2,'0');
        const mm = String(ctDate.getUTCMinutes()).padStart(2,'0');
        peakBar = { time: `${hh}:${mm}`, vol, price: bar.close ?? bar.open };
      }
    }

    const total = sessionVol || 1;
    const buckets = BUCKET_DEFS.map(bd => {
      const o = bOHLC[bd.key];
      const range = (o.high !== null && o.low !== null) ? Math.round((o.high - o.low) * 100) / 100 : null;
      return {
        key:    bd.key,
        label:  bd.label,
        volume: Math.round(bvols[bd.key]),
        pct:    Math.round(bvols[bd.key] / total * 1000) / 10,
        high:   o.high   !== null ? Math.round(o.high  * 100) / 100 : null,
        low:    o.low    !== null ? Math.round(o.low   * 100) / 100 : null,
        open:   o.open   !== null ? Math.round(o.open  * 100) / 100 : null,
        close:  o.close  !== null ? Math.round(o.close * 100) / 100 : null,
        range,
      };
    });

    const open_1h    = bvols['vol_830_900'] + bvols['vol_900_930'];
    const close_1h   = bvols['vol_1400_1430'] + bvols['vol_1430_1500'];
    const open_1h_pct  = Math.round(open_1h  / total * 1000) / 10;
    const close_1h_pct = Math.round(close_1h / total * 1000) / 10;

    // HVN — price level with most volume concentration
    let hvnPrice = null, hvnVolume = 0;
    for (const [price, vol] of Object.entries(priceVol)) {
      if (vol > hvnVolume) { hvnVolume = vol; hvnPrice = parseFloat(price); }
    }

    return new Response(JSON.stringify({
      available:    true,
      open:         Math.round(sessionOpen  * 100) / 100,
      high:         Math.round(sessionHigh  * 100) / 100,
      low:          Math.round(sessionLow   * 100) / 100,
      close:        Math.round(sessionClose * 100) / 100,
      volume:       sessionVol,
      prev_close:   prevClose ? Math.round(prevClose * 100) / 100 : null,
      change,
      changePct,
      bars:         bars.length,
      asOf,
      vwap,
      rawBars:      bars.map(b => ({
        t: b.t,
        o: b.open  != null ? Math.round(b.open  * 100) / 100 : null,
        h: b.high  != null ? Math.round(b.high  * 100) / 100 : null,
        l: b.low   != null ? Math.round(b.low   * 100) / 100 : null,
        c: b.close != null ? Math.round(b.close * 100) / 100 : null,
        v: b.vol   || 0,
      })),
      // Intraday volume breakdown (CT time buckets)
      open_1h:      Math.round(open_1h),
      open_1h_pct,
      close_1h:     Math.round(close_1h),
      close_1h_pct,
      peak_time:    peakBar?.time || null,
      peak_volume:  peakBar ? Math.round(peakBar.vol) : null,
      hvn_price:    hvnPrice,
      hvn_volume:   Math.round(hvnVolume),
      buckets,
    }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, available: false }), { headers, status: 200 });
  }
}
