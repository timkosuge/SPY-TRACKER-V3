// Cloudflare Pages Function — /premarket
// Gets SPY pre-market high/low/mid (4:00am – 9:30am ET) via Yahoo Finance

export async function onRequest(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
  };

  try {
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
    const highs      = q.high   || [];
    const lows       = q.low    || [];
    const closes     = q.close  || [];
    const vols       = q.volume || [];

    const gmtoff     = result.meta?.gmtoffset ?? -14400; // EDT=-14400, EST=-18000
    const prevClose  = result.meta?.previousClose || result.meta?.chartPreviousClose || null;

    // PM window in seconds-of-day UTC
    const pmStartSec = 4 * 3600 - gmtoff;    // 4:00am ET
    const pmEndSec   = 9.5 * 3600 - gmtoff;  // 9:30am ET

    // Compute median volume of PM bars to filter outliers
    const allPM = timestamps.map((t, i) => ({
      t, h: highs[i], l: lows[i], c: closes[i], v: vols[i] ?? 0
    })).filter(b => {
      const s = b.t % 86400;
      return s >= pmStartSec && s < pmEndSec && b.h != null && b.l != null && b.h > 0 && b.l > 0;
    });

    if (!allPM.length) {
      return new Response(JSON.stringify({
        available: false, error: 'No PM bars found',
        debug: { gmtoff, pmStartSec, pmEndSec, totalBars: timestamps.length }
      }), { headers });
    }

    // Filter out near-zero volume bars (bad ticks) — keep bars with vol > 0
    // Also sanity check: within 1.5% of prevClose
    const sanityMin = prevClose ? prevClose * 0.985 : 0;
    const sanityMax = prevClose ? prevClose * 1.015 : Infinity;
    const pmBars = allPM.filter(b =>
      b.v > 0 &&
      b.l >= sanityMin &&
      b.h <= sanityMax
    );

    const bars = pmBars.length ? pmBars : allPM; // fallback to unfiltered if too aggressive

    const high = Math.round(Math.max(...bars.map(b => b.h)) * 100) / 100;
    const low  = Math.round(Math.min(...bars.map(b => b.l)) * 100) / 100;
    const mid  = Math.round(((high + low) / 2) * 100) / 100;

    return new Response(JSON.stringify({
      available: true, high, low, mid,
      bars: bars.length,
      from: new Date(bars[0].t * 1000).toISOString(),
      to:   new Date(bars[bars.length - 1].t * 1000).toISOString(),
    }), { headers });

  } catch(e) {
    return new Response(JSON.stringify({ available: false, error: e.message }), { headers });
  }
}
