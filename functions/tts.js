// Cloudflare Pages Function — /tts
// Proxies text to xAI TTS API, returns MP3 audio
// Keeps XAI_API_KEY server-side

async function limit(env, name, ip, perIpHour, globalDay) {
  const kv = env.MUSIC_KV;
  if (!kv) return { ok: false, status: 503, error: 'Not configured' };
  const now = new Date();
  const hour = now.toISOString().slice(0, 13);
  const day = now.toISOString().slice(0, 10);
  const ipKey = `rl:${name}:ip:${ip}:${hour}`;
  const dayKey = `rl:${name}:day:${day}`;
  const [ipCount, dayCount] = await Promise.all([kv.get(ipKey), kv.get(dayKey)]);
  if ((Number(dayCount) || 0) >= globalDay) return { ok: false, status: 429, error: 'Daily limit reached' };
  if ((Number(ipCount) || 0) >= perIpHour) return { ok: false, status: 429, error: 'Rate limit reached' };
  await Promise.all([
    kv.put(ipKey, String((Number(ipCount) || 0) + 1), { expirationTtl: 3600 }),
    kv.put(dayKey, String((Number(dayCount) || 0) + 1), { expirationTtl: 86400 }),
  ]);
  return { ok: true };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const CORS = {};

  try {
    const gate = await limit(env, 'tts', request.headers.get('CF-Connecting-IP') || 'unknown', 10, 100);
    if (!gate.ok) return new Response(JSON.stringify({ error: gate.error }), { status: gate.status, headers: { ...CORS, 'Content-Type': 'application/json' } });
    const apiKey = env.XAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'XAI_API_KEY not set' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    const { text, voice_id = 'eve' } = await request.json();
    if (!text) return new Response(JSON.stringify({ error: 'No text' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
    });

    const resp = await fetch('https://api.x.ai/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.slice(0, 1500), // keep costs low, VEGA responses are short
        voice_id,
        language: 'en',
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return new Response(JSON.stringify({ error: err }), {
        status: resp.status, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    // Stream MP3 back to client
    const audio = await resp.arrayBuffer();
    return new Response(audio, {
      headers: {
        ...CORS,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      }
    });

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }
}
