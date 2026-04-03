// Cloudflare Pages Function — /ai
// Routes to Grok (xAI API).
// Set XAI_API_KEY in Cloudflare Pages → Settings → Environment Variables.
// Optional: set GROK_MODEL to override model (default: grok-3-mini-fast-beta)

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
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
        max_tokens: max_tokens || 600,
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
