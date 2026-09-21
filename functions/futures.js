function sessionStartEpoch(now) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(now).filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  const etMins = Number(p.hour) * 60 + Number(p.minute);
  const utcGuess = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
  const offsetMs = utcGuess - now.getTime();
  const startLocalMs = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), 18, 0) - (etMins < 18 * 60 ? 864e5 : 0);
  return Math.floor((startLocalMs - offsetMs) / 1000);
}

function sessionPayload(bars) {
  const start = sessionStartEpoch(new Date());
  const inSession = bars.filter(b => b.t >= start);
  const use = inSession.length >= 2 ? inSession : bars;
  const first = use[0], last = use[use.length - 1];
  return {
    bars: use, session_start: start, session_in_window: inSession.length >= 2,
    last_price: last?.c ?? null, session_open: first?.o ?? first?.c ?? null,
    change: last && first ? last.c - (first.o ?? first.c) : null,
    change_pct: last && first && (first.o ?? first.c) ? (last.c - (first.o ?? first.c)) / (first.o ?? first.c) * 100 : null,
    bar_count: use.length,
  };
}

export async function onRequestGet(context) {
  const corsHeaders = {
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
          return new Response(JSON.stringify({
            symbol: 'ES1!', name: 'S&P 500 Futures', source: 'polygon', ...sessionPayload(bars) }), { headers: corsHeaders });
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
            symbol: 'ES=F', name: 'S&P 500 Futures', source: 'yahoo_v8', ...sessionPayload(bars)
          }), { headers: corsHeaders });
        }
      }
    }
  } catch(e) {}

  return new Response(JSON.stringify({ error: 'Futures unavailable from Polygon and Yahoo', bars: [] }), { headers: corsHeaders, status: 502 });
}
