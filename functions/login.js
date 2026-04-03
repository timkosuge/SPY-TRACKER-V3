// functions/chat/login.js
// POST /chat/login  { username, password }

import { json, err, preflight, verifyPassword, generateToken } from './_utils.js';

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days

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
  if (!username || !password) return err('Username and password required');

  const user = await db.prepare(
    'SELECT id, username, password FROM chat_users WHERE username = ? COLLATE NOCASE'
  ).bind(username).first();

  if (!user) return err('Invalid username or password', 401);

  const ok = await verifyPassword(password, user.password);
  if (!ok) return err('Invalid username or password', 401);

  // Update last_seen
  await db.prepare('UPDATE chat_users SET last_seen = unixepoch() WHERE id = ?')
    .bind(user.id).run();

  // Create session
  const token = generateToken();
  const now   = Math.floor(Date.now() / 1000);
  await db.prepare(
    'INSERT INTO chat_sessions (token, user_id, username, created_at, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(token, user.id, user.username, now, now + SESSION_TTL).run();

  return json({ ok: true, token, username: user.username });
}
