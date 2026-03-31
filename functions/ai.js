// Cloudflare Pages Function — /ai
// Routes to Grok (xAI) primary, with model config via env var.
// Set XAI_API_KEY in Cloudflare Pages environment variables.

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
      return new Response(JSON.stringify({ error: 'XAI_API_KEY not configured in Cloudflare env vars' }), {
        status: 500, headers: CORS
      });
    }

    // Build messages array — system prompt goes as first message with role 'system'
    const fullMessages = [];
    if (system) fullMessages.push({ role: 'system', content: system });
    fullMessages.push(...(messages || []));

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: env.GROK_MODEL || 'grok-3-mini',
        max_tokens: max_tokens || 800,
        messages: fullMessages,
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || `xAI API error ${response.status}` }), {
        status: response.status, headers: CORS
      });
    }

    const content = data.choices?.[0]?.message?.content || '';
    return new Response(JSON.stringify({ content }), { headers: CORS });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
}
