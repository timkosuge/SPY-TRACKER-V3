// Cloudflare Pages Function — /premarket
// Fetches SPY pre-market OHLC (3:00am – 8:30am CT) from Yahoo Finance
// Returns: { high, low, mid, open, last, change, changePct, from, to, bars }

export async function onRequest(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
  };

  try {
    // Yahoo Finance chart API — 1m bars, 1d range
    // period1/period2 in unix seconds
    const now = new Date();

    // Pre-market window: 3:00am CT – 8:30am CT, adjusted for DST via Intl
    // Cloudflare Workers run in UTC so we can't use getTimezoneOffset()
    const ctOffsetHrs = (() => {
      const s = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago', hour: 'numeric', hour12: false, timeZoneName: 'shortOffset'
      }).format(now);
      const m = s.match(/GMT([+-]\d+)/);
      return m ? parseInt(m[1]) : -5;
    })();
    const todayStr = now.toISOString().slice(0, 10);
    // 3:00am CT in UTC = 3:00 - ctOffsetHrs hours  (e.g. CDT=-5 → 8:00 UTC, CST=-6 → 9:00 UTC)
    const pmStartUTC = 3 - ctOffsetHrs; // hours offset from midnight UTC
    const pmEndUTC   = 8.5 - ctOffsetHrs; // 8:30am CT in UTC hours
    const pmStart = new Date(`${todayStr}T${String(pmStartUTC).padStart(2,'0')}:00:00Z`);
    const pmEnd   = new Date(`${todayStr}T${String(Math.floor(pmEndUTC)).padStart(2,'0')}:${pmEndUTC%1===0.5?'30':'00'}:00Z`);

    const p1 = Math.floor(pmStart.getTime() / 1000);
    const p2 = Math.floor(Math.min(pmEnd.getTime(), now.getTime()) / 1000);

    if (p2 <= p1) {
      return new Response(JSON.stringify({ error: 'Pre-market session not started yet', available: false }), { headers });
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1m&period1=${p1}&period2=${p2}&includePrePost=true`;

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)',
        'Accept': 'application/json',
      }
    });

    if (!resp.ok) throw new Error(`Yahoo returned ${resp.status}`);

    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('No chart data returned');

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const opens  = quotes.open  || [];
    const highs  = quotes.high  || [];
    const lows   = quotes.low   || [];
    const closes = quotes.close || [];
    const vols   = quotes.volume || [];

    if (!timestamps.length) {
      return new Response(JSON.stringify({ error: 'No pre-market bars found', available: false }), { headers });
    }

    // Filter to actual pre-market window (some bars may be from extended hours outside range)
    const bars = timestamps.map((t, i) => ({
      t, open: opens[i], high: highs[i], low: lows[i], close: closes[i], vol: vols[i]
    })).filter(b => b.high != null && b.low != null && b.close != null);

    if (!bars.length) {
      return new Response(JSON.stringify({ error: 'No valid bars in pre-market window', available: false }), { headers });
    }

    const pmHigh  = Math.max(...bars.map(b => b.high));
    const pmLow   = Math.min(...bars.map(b => b.low));
    const pmMid   = (pmHigh + pmLow) / 2;
    const pmOpen  = bars[0].open;
    const pmLast  = bars[bars.length - 1].close;
    const pmVol   = bars.reduce((a, b) => a + (b.vol || 0), 0);

    // Previous close from meta
    const prevClose = result.meta?.previousClose || result.meta?.chartPreviousClose || null;
    const change    = prevClose ? pmLast - prevClose : null;
    const changePct = prevClose && change != null ? (change / prevClose) * 100 : null;

    const fromTime = new Date(bars[0].t * 1000).toISOString();
    const toTime   = new Date(bars[bars.length - 1].t * 1000).toISOString();

    return new Response(JSON.stringify({
      available: true,
      high:       Math.round(pmHigh   * 100) / 100,
      low:        Math.round(pmLow    * 100) / 100,
      mid:        Math.round(pmMid    * 100) / 100,
      open:       Math.round(pmOpen   * 100) / 100,
      last:       Math.round(pmLast   * 100) / 100,
      prevClose:  prevClose ? Math.round(prevClose * 100) / 100 : null,
      change:     change    != null ? Math.round(change    * 100) / 100 : null,
      changePct:  changePct != null ? Math.round(changePct * 100) / 100 : null,
      volume:     pmVol,
      bars:       bars.length,
      from:       fromTime,
      to:         toTime,
    }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, available: false }), { headers, status: 200 });
  }
}
