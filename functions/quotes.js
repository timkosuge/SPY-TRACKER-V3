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

    const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,regularMarketPreviousClose,preMarketPrice,preMarketChange,preMarketChangePercent,postMarketPrice`;

    const resp = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SPYTracker/3.0)',
        'Accept': 'application/json',
      }
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
