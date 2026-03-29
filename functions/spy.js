export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };
  try {
    const r = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&range=1d',
      { headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' } }
    );
    const data = await r.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    const q = result?.indicators?.quote?.[0];
    if (!meta || !q) throw new Error('No data');
    return new Response(JSON.stringify({
      open: q.open?.[0],
      high: q.high?.[0],
      low: q.low?.[0],
      close: meta.regularMarketPrice,
      volume: q.volume?.[0],
      prev_close: meta.previousClose || meta.chartPreviousClose
    }), { headers: corsHeaders });
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}
