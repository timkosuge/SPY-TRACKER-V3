// Cloudflare Pages Function — /ai
// Routes to Grok (xAI API).
// Set XAI_API_KEY in Cloudflare Pages → Settings → Environment Variables.
// Optional: set GROK_MODEL to override model (default: grok-3-mini-fast-beta)

const CORS = {
  'Content-Type': 'application/json',
};

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

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const gate = await limit(env, 'ai', request.headers.get('CF-Connecting-IP') || 'unknown', 30, 400);
    if (!gate.ok) return new Response(JSON.stringify({ error: gate.error }), { status: gate.status, headers: CORS });
    const body = await request.json();
    const { messages, system, max_tokens } = body;

    const apiKey = env.XAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'XAI_API_KEY not set. Go to Cloudflare Pages → your project → Settings → Environment Variables and add XAI_API_KEY.',
      }), { status: 500, headers: CORS });
    }

    // System prompt first, then conversation history
    const fullMessages = [];
    if (system) fullMessages.push({ role: 'system', content: system });
    fullMessages.push(...(messages || []));

    const model = env.GROK_MODEL || 'grok-3-mini-fast-beta';

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: Math.min(Number(max_tokens) || 600, 600),
        messages: fullMessages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data.error?.message || `xAI API returned ${response.status}`;
      return new Response(JSON.stringify({ error: msg }), { status: response.status, headers: CORS });
    }

    const content = data.choices?.[0]?.message?.content || '';
    return new Response(JSON.stringify({ content }), { headers: CORS });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
}
