// Cloudflare Pages Function — /premarket
// Gets SPY pre-market high/low/mid (4:00am – 9:30am ET) via Polygon

export async function onRequest(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
  };

  try {
    const API_KEY = context.env.POLYGON_API_KEY;
    if (!API_KEY) throw new Error('POLYGON_API_KEY not set');

    // Today's date in ET
    const etDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());

    // Fetch 1m bars for today including pre-market
    // Polygon's /aggs endpoint with extended hours
    const url = `https://api.polygon.io/v2/aggs/ticker/SPY/range/1/minute/${etDate}/${etDate}?adjusted=true&sort=asc&limit=1000&extended_hours=true&apiKey=${API_KEY}`;

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Polygon ${resp.status}`);

    const data = await resp.json();
    if (data.status === 'ERROR') throw new Error(data.error || 'Polygon error');

    const results = data.results || [];
    if (!results.length) throw new Error('No bars returned');

    // PM window: 4:00am–9:30am ET in unix ms
    // Build window from etDate
    const pmStart = new Date(`${etDate}T04:00:00`);
    const pmEnd   = new Date(`${etDate}T09:30:00`);
    // Convert to ET-aware timestamps
    const pmStartMs = new Date(pmStart.toLocaleString('en-US', { timeZone: 'America/New_York' }) ).getTime();

    // Simpler: Polygon timestamps are unix ms UTC
    // 4:00am ET = 8:00 UTC (EDT) or 9:00 UTC (EST)
    // Determine offset from first bar or use Intl
    const now = new Date();
    const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit' });
    const utcStr = now.toLocaleString('en-US', { hour12: false, hour: '2-digit' });
    const etOffsetHrs = parseInt(utcStr) - parseInt(etStr);

    const pmStartTs = new Date(`${etDate}T04:00:00Z`).getTime() - etOffsetHrs * 3600000;
    const pmEndTs   = new Date(`${etDate}T09:30:00Z`).getTime() - etOffsetHrs * 3600000;

    const pmBars = results.filter(b => b.t >= pmStartTs && b.t < pmEndTs);

    if (!pmBars.length) {
      return new Response(JSON.stringify({
        available: false, error: 'No PM bars in window',
        debug: { etDate, pmStartTs, pmEndTs, totalBars: results.length,
                 firstT: results[0]?.t, lastT: results[results.length-1]?.t }
      }), { headers });
    }

    const high = Math.round(Math.max(...pmBars.map(b => b.h)) * 100) / 100;
    const low  = Math.round(Math.min(...pmBars.map(b => b.l)) * 100) / 100;
    const mid  = Math.round(((high + low) / 2) * 100) / 100;

    return new Response(JSON.stringify({
      available: true, high, low, mid,
      bars: pmBars.length,
      from: new Date(pmBars[0].t).toISOString(),
      to:   new Date(pmBars[pmBars.length - 1].t).toISOString(),
    }), { headers });

  } catch(e) {
    return new Response(JSON.stringify({ available: false, error: e.message }), { headers });
  }
}
