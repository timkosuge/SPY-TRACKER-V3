// Cloudflare Pages Function — /gex-history
// Reads GEX snapshots from KV namespace GEX_HISTORY
// ?type=intraday  → today's intraday snapshots
// ?type=daily     → historical daily snapshots

export async function onRequest(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
  };

  try {
    const kv = context.env?.GEX_HISTORY;
    if (!kv) {
      return new Response(JSON.stringify({
        error: 'KV NOT BOUND — Add GEX_HISTORY KV namespace in Cloudflare Pages → Settings → Functions → KV bindings',
        snapshots: []
      }), { headers });
    }

    const url = new URL(context.request.url);
    const type = url.searchParams.get('type') || 'intraday';

    if (type === 'intraday') {
      // Support ?date=YYYY-MM-DD to fetch a specific day (for fallback to last trading day)
      const reqDate = url.searchParams.get('date');
      const etDate = reqDate || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
      const key = `gex:intraday:${etDate}`;
      const data = await kv.get(key, 'json');
      return new Response(JSON.stringify({
        snapshots: Array.isArray(data) ? data : [],
        date: etDate
      }), { headers });
    }

    if (type === 'daily') {
      const data = await kv.get('gex:daily', 'json');
      return new Response(JSON.stringify({
        snapshots: Array.isArray(data) ? data : []
      }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Unknown type', snapshots: [] }), { headers });

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message, snapshots: [] }), { headers });
  }
}
