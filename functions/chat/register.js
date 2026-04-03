// functions/chat/register.js
// POST /chat/register  { username, password }

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

async function hashPassword(password, salt) {
  const s = salt || crypto.randomUUID().replace(/-/g, '');
  const data = new TextEncoder().encode(s + password);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('');
  return { hash: `${s}:${hashHex}` };
}

function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
}

const SESSION_TTL = 60 * 60 * 24 * 30;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return preflight();
  if (request.method !== 'POST') return err('Method not allowed', 405);

  const db = env.CHAT_DB;
  if (!db) return err('Chat database not configured', 503);

  let body;
  try { body = await request.json(); }
  catch { return err('Invalid JSON'); }

  const username = (body.username || '').trim();
  const password = (body.password || '').trim();

  if (!username || username.length < 2 || username.length > 24)
    return err('Username must be 2-24 characters');
  if (!/^[a-zA-Z0-9_\-]+$/.test(username))
    return err('Username may only contain letters, numbers, _ and -');
  if (!password || password.length < 6)
    return err('Password must be at least 6 characters');

  const existing = await db.prepare(
    'SELECT id FROM chat_users WHERE username = ? COLLATE NOCASE'
  ).bind(username).first();
  if (existing) return err('Username already taken', 409);

  const { hash } = await hashPassword(password);

  const result = await db.prepare(
    'INSERT INTO chat_users (username, password) VALUES (?, ?) RETURNING id'
  ).bind(username, hash).first();

  const token = generateToken();
  const now   = Math.floor(Date.now() / 1000);
  await db.prepare(
    'INSERT INTO chat_sessions (token, user_id, username, created_at, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(token, result.id, username, now, now + SESSION_TTL).run();

  return json({ ok: true, token, username });
}
