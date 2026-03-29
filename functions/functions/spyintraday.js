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
    const change       = prevClose ? Math.round((sessionClose - prevClose) * 100) / 100 : null;
    const changePct    = prevClose && change != null ? Math.round((change / prevClose) * 10000) / 100 : null;
    const asOf = new Date(bars[bars.length - 1].t * 1000).toISOString();

    // ── CT time bucket breakdown from live 1-min bars ──────────────────────
    // Yahoo timestamps are UTC epoch seconds. CT = UTC-5 (CST) or UTC-6 (CDT).
    // Detect CT offset: CDT is UTC-5 (Mar–Nov), CST is UTC-6 (Nov–Mar).
    const janOffset = new Date(now.getFullYear(), 0, 1).getTimezoneOffset();
    const julOffset = new Date(now.getFullYear(), 6, 1).getTimezoneOffset();
    // Server is UTC so we detect DST by checking if now is in summer
    const isDST = now.getTimezoneOffset() < Math.max(janOffset, julOffset);
    const ctOffsetHrs = isDST ? -5 : -6; // CDT = UTC-5, CST = UTC-6

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
    const priceVol = {};
    let peakBar = null;

    for (const bar of bars) {
      // Convert UTC epoch → CT minutes since midnight
      const ctDate = new Date((bar.t + ctOffsetHrs * 3600) * 1000);
      const mins = ctDate.getUTCHours() * 60 + ctDate.getUTCMinutes();
      if (mins < 8*60+30 || mins >= 15*60) continue;
      const vol = bar.vol || 0;
      for (const bd of BUCKET_DEFS) {
        if (mins >= bd.start && mins < bd.end) { bvols[bd.key] += vol; break; }
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
    const buckets = BUCKET_DEFS.map(bd => ({
      key:    bd.key,
      label:  bd.label,
      volume: Math.round(bvols[bd.key]),
      pct:    Math.round(bvols[bd.key] / total * 1000) / 10,
    }));

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
