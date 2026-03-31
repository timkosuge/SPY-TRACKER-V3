// Cloudflare Pages Function — /quotes
// Server-side proxy for Yahoo Finance multi-symbol quotes.
// Eliminates CORS failures from browser-direct or third-party proxy fetches.
// Usage: GET /quotes?symbols=SPY,QQQ,VXX,...
// Returns: { quotes: { SYMBOL: { price, change, pct_change, volume, open, high, low, prev_close } } }

export async function onRequestGet(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  };

  try {
    const url = new URL(context.request.url);
    const symbols = url.searchParams.get('symbols') || 'SPY';

    // Yahoo v7 now requires a crumb + cookie. Fetch both first.
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const consentResp = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': UA },
      redirect: 'follow',
    });
    const cookieHeader = consentResp.headers.get('set-cookie') || '';
    const cookieVal = cookieHeader.split(',').map(s => s.trim()).find(s => s.startsWith('A3=')) || '';
    const cookie = cookieVal ? cookieVal.split(';')[0] : '';

    const crumbResp = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'User-Agent': UA,
        'Accept': '*/*',
        ...(cookie ? { 'Cookie': cookie } : {}),
      },
    });
    const crumb = crumbResp.ok ? (await crumbResp.text()).trim() : null;

    const fields = 'regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,regularMarketPreviousClose,preMarketPrice,preMarketChange,preMarketChangePercent,postMarketPrice';
    const base = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=${fields}`;
    const yahooUrl = crumb ? `${base}&crumb=${encodeURIComponent(crumb)}` : base;

    const resp = await fetch(yahooUrl, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json',
        ...(cookie ? { 'Cookie': cookie } : {}),
      },
    });

    if (!resp.ok) throw new Error(`Yahoo returned ${resp.status}`);

    const data = await resp.json();
    const results = data?.quoteResponse?.result || [];

    if (!results.length) throw new Error('No results from Yahoo');

    const quotes = {};
    for (const q of results) {
      quotes[q.symbol] = {
        price:     q.regularMarketPrice,
        change:    q.regularMarketChange,
        pct_change: q.regularMarketChangePercent,
        volume:    q.regularMarketVolume,
        open:      q.regularMarketOpen,
        high:      q.regularMarketDayHigh,
        low:       q.regularMarketDayLow,
        prev_close: q.regularMarketPreviousClose,
        // Extended hours
        pre_market_price:  q.preMarketPrice  || null,
        pre_market_change: q.preMarketChange || null,
        post_market_price: q.postMarketPrice || null,
      };
    }

    return new Response(JSON.stringify({ quotes, count: results.length, ts: Date.now() }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, quotes: {} }), { status: 200, headers });
  }
}
