// Cloudflare Pages Function — /ollama
// Optional proxy to a user-supplied Ollama endpoint (for remote tunnel access).
// When running locally, the browser calls Ollama directly. This proxy is only
// needed if the user exposes Ollama via a tunnel and stores the URL here.

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

export async function onRequestGet(context) {
  // GET /ollama?action=tags  →  list models from Ollama
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const ollamaUrl = env.OLLAMA_URL || url.searchParams.get('base') || 'http://localhost:11434';

  if (action === 'tags') {
    try {
      const r = await fetch(`${ollamaUrl}/api/tags`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!r.ok) throw new Error(`Ollama returned ${r.status}`);
      const data = await r.json();
      return new Response(JSON.stringify({ ok: true, models: data.models || [] }), { headers: CORS });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 502, headers: CORS });
    }
  }

  return new Response(JSON.stringify({ ok: false, error: 'Unknown action' }), { status: 400, headers: CORS });
}

export async function onRequestPost(context) {
  // POST /ollama  →  proxy a chat request to Ollama
  const { request, env } = context;
  try {
    const body = await request.json();
    const { messages, model, system, stream, base_url } = body;
    const ollamaUrl = env.OLLAMA_URL || base_url || 'http://localhost:11434';

    const ollamaBody = {
      model: model || 'llama3.2:latest',
      messages: system
        ? [{ role: 'system', content: system }, ...(messages || [])]
        : (messages || []),
      stream: stream === true,
      options: { temperature: 0.3, num_predict: body.max_tokens || 800 }
    };

    const r = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollamaBody)
    });

    if (!r.ok) {
      const txt = await r.text();
      return new Response(JSON.stringify({ error: `Ollama ${r.status}: ${txt}` }), { status: 502, headers: CORS });
    }

    // Non-streaming: parse the response JSON
    const data = await r.json();
    const content = data.message?.content || data.response || '';
    return new Response(JSON.stringify({ ok: true, content }), { headers: CORS });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
}
