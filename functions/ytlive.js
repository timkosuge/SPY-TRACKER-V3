const CHANNELS = {
  UCIALMKvObZNtJ6AmdCLP7Lg: 'Bloomberg Television',
  'UC4-aIBtpNAPqEcMhAyFN6iQ': 'Notting Hill Gate Cam',
};

export function liveVideoId(html) {
  const canon = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})"/);
  if (!canon) return null;
  if (!/"isLiveNow":true|"isLive":true/.test(html)) return null;
  return canon[1];
}

export async function onRequestGet(context) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' };
  const channel = new URL(context.request.url).searchParams.get('channel') || '';
  if (!CHANNELS[channel]) {
    return new Response(JSON.stringify({ error: 'channel not served', channel }), { status: 404, headers: { ...headers, 'Cache-Control': 'no-store' } });
  }
  const cacheKey = new Request(`https://ytlive.cache/${channel}`);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;
  let videoId = null, error = null;
  try {
    const r = await fetch(`https://www.youtube.com/channel/${channel}/live`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=YES+1',
      },
    });
    if (r.ok) videoId = liveVideoId(await r.text());
    else error = `youtube HTTP ${r.status}`;
    if (!videoId && !error) error = 'channel is not live';
  } catch (e) {
    error = e.message;
  }
  const res = new Response(JSON.stringify({ channel, name: CHANNELS[channel], videoId, error }), { headers: videoId ? headers : { ...headers, 'Cache-Control': 'public, max-age=120' } });
  context.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
