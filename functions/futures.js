export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  };

  const POLYGON_KEY = context.env?.POLYGON_API_KEY;

  // ── Source 1: Polygon.io (preferred, already used by the workflow) ──────────
  if (POLYGON_KEY) {
    try {
      const now   = new Date();
      const to    = now.toISOString().slice(0, 19);
      const fromTs = new Date(now.getTime() - 30 * 60 * 60 * 1000);
      const from   = fromTs.toISOString().slice(0, 19);

      const url = `https://api.polygon.io/v2/aggs/ticker/ES1!/range/5/minute/${from}/${to}?adjusted=false&sort=asc&limit=1000&apiKey=${POLYGON_KEY}`;
      const r = await fetch(url, { headers: { 'User-Agent': 'SPYTracker/1.0' } });

      if (r.ok) {
        const data = await r.json();
        if (data.results && data.results.length >= 2) {
          const bars = data.results.map(b => ({
            t: Math.floor(b.t / 1000),
            o: b.o, h: b.h, l: b.l, c: b.c, v: b.v
          }));
          const last = bars[bars.length - 1];
          const first = bars[0];
          return new Response(JSON.stringify({
            symbol: 'ES1!', name: 'S&P 500 Futures', source: 'polygon',
            bars, last_price: last?.c, open_price: first?.c,
            change: last && first ? last.c - first.c : null,
            change_pct: last && first ? ((last.c - first.c) / first.c * 100) : null,
            bar_count: bars.length
          }), { headers: corsHeaders });
        }
      }
    } catch(e) {}
  }

  // ── Source 2: Yahoo Finance query2 with browser-like headers ────────────────
  try {
    const symbol = 'ES=F';
    const now    = Math.floor(Date.now() / 1000);
    const start  = now - 30 * 60 * 60;
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m&period1=${start}&period2=${now}&includePrePost=true&corsDomain=finance.yahoo.com`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://finance.yahoo.com/quote/ES=F/',
        'Origin': 'https://finance.yahoo.com',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site'
      }
    });
    if (r.ok) {
      const data = await r.json();
      const result = data?.chart?.result?.[0];
      if (result) {
        const timestamps = result.timestamp || [];
        const quote      = result.indicators?.quote?.[0] || {};
        const bars = timestamps
          .map((t, i) => ({ t, o: quote.open?.[i], h: quote.high?.[i], l: quote.low?.[i], c: quote.close?.[i], v: quote.volume?.[i] }))
          .filter(b => b.c != null && b.c > 0);
        if (bars.length >= 2) {
          const last = bars[bars.length - 1];
          const first = bars[0];
          return new Response(JSON.stringify({
            symbol: 'ES=F', name: 'S&P 500 Futures', source: 'yahoo_v8',
            bars, last_price: last?.c, open_price: first?.c,
            change: last && first ? last.c - first.c : null,
            change_pct: last && first ? ((last.c - first.c) / first.c * 100) : null,
            bar_count: bars.length
          }), { headers: corsHeaders });
        }
      }
    }
  } catch(e) {}

  // ── Source 3: Stooq CSV (no auth, reliable fallback) ────────────────────────
  try {
    const r = await fetch('https://stooq.com/q/d/l/?s=%40ES.F&i=5', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (r.ok) {
      const text = await r.text();
      const lines = text.trim().split('\n').slice(1);
      const bars = [];
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length < 5) continue;
        const [date, time, open, high, low, close, volume] = parts;
        if (!close || isNaN(parseFloat(close))) continue;
        const t = Math.floor(new Date(`${date}T${time || '00:00:00'}`).getTime() / 1000);
        if (!isNaN(t)) bars.push({ t, o: parseFloat(open), h: parseFloat(high), l: parseFloat(low), c: parseFloat(close), v: parseInt(volume) || 0 });
      }
      const cutoff = Math.floor(Date.now() / 1000) - 30 * 60 * 60;
      const recent = bars.filter(b => b.t >= cutoff);
      if (recent.length >= 2) {
        const last = recent[recent.length - 1];
        const first = recent[0];
        return new Response(JSON.stringify({
          symbol: '@ES.F', name: 'S&P 500 Futures', source: 'stooq',
          bars: recent, last_price: last?.c, open_price: first?.c,
          change: last && first ? last.c - first.c : null,
          change_pct: last && first ? ((last.c - first.c) / first.c * 100) : null,
          bar_count: recent.length
        }), { headers: corsHeaders });
      }
    }
  } catch(e) {}

  return new Response(JSON.stringify({ error: 'All futures data sources unavailable', bars: [] }), {
    status: 503, headers: corsHeaders
  });
}
