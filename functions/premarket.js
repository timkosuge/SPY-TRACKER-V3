// Cloudflare Pages Function — /premarket
// Gets SPY pre-market high/low/mid (4:00am – 9:30am ET)

export async function onRequest(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
  };

  try {
    // Fetch today's 1m bars including pre/post market
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/SPY?interval=1m&range=1d&includePrePost=true`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    if (!resp.ok) throw new Error(`Yahoo ${resp.status}`);

    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('No data');

    const timestamps = result.timestamp || [];
    const q          = result.indicators?.quote?.[0] || {};
    const highs      = q.high  || [];
    const lows       = q.low   || [];

    // gmtoffset is in seconds: EDT=-14400, EST=-18000
    const gmtoff = result.meta?.gmtoffset ?? -14400;

    // PM window in seconds-of-day (UTC):
    // 4:00am ET  = 4*3600 - gmtoff  (e.g. EDT: 4*3600+14400 = 28800 = 8:00 UTC)
    // 9:30am ET  = 9.5*3600 - gmtoff (e.g. EDT: 34200+14400 = 48600 = 13:30 UTC)
    const pmStartSec = 4 * 3600 - gmtoff;
    const pmEndSec   = 9.5 * 3600 - gmtoff;

    const pmBars = timestamps.map((t, i) => ({
      t, high: highs[i], low: lows[i]
    })).filter(b => {
      if (b.high == null || b.low == null || b.high <= 0 || b.low <= 0) return false;
      const secOfDay = b.t % 86400;
      return secOfDay >= pmStartSec && secOfDay < pmEndSec;
    });

    if (!pmBars.length) {
      const sample = timestamps.slice(0, 3).map(t => ({ t, secOfDay: t % 86400 }));
      return new Response(JSON.stringify({
        available: false, error: 'No PM bars found',
        debug: { gmtoff, pmStartSec, pmEndSec, totalBars: timestamps.length, sample }
      }), { headers });
    }

    const high = Math.round(Math.max(...pmBars.map(b => b.high)) * 100) / 100;
    const low  = Math.round(Math.min(...pmBars.map(b => b.low))  * 100) / 100;
    const mid  = Math.round(((high + low) / 2) * 100) / 100;

    return new Response(JSON.stringify({
      available: true, high, low, mid,
      bars: pmBars.length,
      from: new Date(pmBars[0].t * 1000).toISOString(),
      to:   new Date(pmBars[pmBars.length - 1].t * 1000).toISOString(),
    }), { headers });

  } catch(e) {
    return new Response(JSON.stringify({ available: false, error: e.message }), { headers });
  }
}
