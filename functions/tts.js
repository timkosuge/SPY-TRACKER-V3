// Cloudflare Pages Function — /tts
// Proxies text to xAI TTS API, returns MP3 audio
// Keeps XAI_API_KEY server-side

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const CORS = { 'Access-Control-Allow-Origin': '*' };

  try {
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
