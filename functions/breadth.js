// Cloudflare Pages Function — /breadth
// Fetches NYSE breadth data: A/D, Up/Down Volume, 52W Hi/Lo
// Tries Barchart internal API first, falls back to calculated proxies

export async function onRequest(context) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  try {
    const base = new URL(context.request.url).origin;
    const r = await fetch(`${base}/breadth_data.json`, { cf: { cacheEverything: false } });
    if (r.ok) {
      const d = await r.json();
      if (d && d.advancing != null) return new Response(JSON.stringify({ source: 'computed_sp500', ...d }), { headers });
    }
  } catch (e) {}
  return new Response(JSON.stringify({ source: 'unavailable', error: 'Constituent breadth has not been computed yet' }), { headers, status: 503 });
}
