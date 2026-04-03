// functions/chat/messages.js
// GET  /chat/messages?since=<unix_ts>&limit=<n>
// POST /chat/messages  { content }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json', ...CORS },
});
const err  = (msg, status = 400) => json({ error: msg }, status);
const preflight = () => new Response(null, { status: 204, headers: CORS });

async function validateSession(db, token) {
  if (!token) return null;
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare(
    'SELECT user_id, username FROM chat_sessions WHERE token = ? AND expires_at > ?'
  ).bind(token, now).first();
  return row || null;
}

function detectMediaType(content) {
  const trimmed = content.trim();
  const isURL = /^https?:\/\//i.test(trimmed) && !trimmed.includes(' ');
  if (!isURL) return 'text';
  if (/\.(gif)(\?|$)/i.test(trimmed)) return 'gif';
  if (/\.(mp4|webm|mov|ogg)(\?|$)/i.test(trimmed)) return 'video';
  if (/\.(jpg|jpeg|png|webp|avif|bmp|svg)(\?|$)/i.test(trimmed)) return 'image';
  if (/tenor\.com|giphy\.com/i.test(trimmed)) return 'gif';
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(trimmed)) return 'video';
  return 'text';
}

const MAX_CONTENT  = 2000;
const MAX_MESSAGES = 100;
const lastPost = new Map();

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return preflight();

  const db = env.CHAT_DB;
  if (!db) return err('Chat database not configured', 503);

  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();

  if (request.method === 'GET') {
    const url   = new URL(request.url);
    const since = parseInt(url.searchParams.get('since') || '0', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '60', 10), MAX_MESSAGES);

    let rows;
    if (since > 0) {
      rows = await db.prepare(
        'SELECT id, username, content, msg_type, created_at FROM chat_messages WHERE created_at > ? ORDER BY created_at ASC LIMIT ?'
      ).bind(since, limit).all();
    } else {
      rows = await db.prepare(
        'SELECT id, username, content, msg_type, created_at FROM chat_messages ORDER BY created_at DESC LIMIT ?'
      ).bind(limit).all();
      rows.results = (rows.results || []).reverse();
    }
    return json({ messages: rows.results || [] });
  }

  if (request.method === 'POST') {
    const session = await validateSession(db, token);
    if (!session) return err('Not authenticated', 401);

    const last = lastPost.get(session.user_id) || 0;
    const now  = Date.now() / 1000;
    if (now - last < 1) return err('Slow down', 429);
    lastPost.set(session.user_id, now);

    let body;
    try { body = await request.json(); }
    catch { return err('Invalid JSON'); }

    const content = (body.content || '').trim();
    if (!content) return err('Message cannot be empty');
    if (content.length > MAX_CONTENT) return err('Message too long');

    const msgType = detectMediaType(content);
    const ts = Math.floor(Date.now() / 1000);

    const result = await db.prepare(
      'INSERT INTO chat_messages (user_id, username, content, msg_type, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id, username, content, msg_type, created_at'
    ).bind(session.user_id, session.username, content, msgType, ts).first();

    await db.prepare('UPDATE chat_users SET last_seen = ? WHERE id = ?')
      .bind(ts, session.user_id).run();

    await db.prepare(
      'DELETE FROM chat_messages WHERE id NOT IN (SELECT id FROM chat_messages ORDER BY created_at DESC LIMIT 1000)'
    ).run();

    return json({ ok: true, message: result });
  }

  return err('Method not allowed', 405);
}
