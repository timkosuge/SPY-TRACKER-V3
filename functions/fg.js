export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const r = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.cnn.com/markets/fear-and-greed',
        'Accept': 'application/json'
      }
    });
    const d = await r.json();
    const fg = d && d.fear_and_greed;
    if (fg && fg.score) {
      return new Response(JSON.stringify({ value: Math.round(fg.score), label: fg.rating }), { headers: corsHeaders });
    }
    throw new Error('No data');
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}
