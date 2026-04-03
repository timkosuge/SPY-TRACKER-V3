// functions/chat/register.js
// POST /chat/register  { username, password }

import { json, err, preflight, hashPassword, generateToken } from './_utils.js';

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

  if (!username || username.length < 2 || username.length > 24)
    return err('Username must be 2–24 characters');
  if (!/^[a-zA-Z0-9_\-]+$/.test(username))
    return err('Username may only contain letters, numbers, _ and -');
  if (!password || password.length < 6)
    return err('Password must be at least 6 characters');

  // Check if username taken
  const existing = await db.prepare(
    'SELECT id FROM chat_users WHERE username = ? COLLATE NOCASE'
  ).bind(username).first();
  if (existing) return err('Username already taken', 409);

  // Hash password
  const { hash } = await hashPassword(password);

  // Insert user
  const result = await db.prepare(
    'INSERT INTO chat_users (username, password) VALUES (?, ?) RETURNING id'
  ).bind(username, hash).first();

  // Create session
  const token = generateToken();
  const now   = Math.floor(Date.now() / 1000);
  await db.prepare(
    'INSERT INTO chat_sessions (token, user_id, username, created_at, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(token, result.id, username, now, now + SESSION_TTL).run();

  return json({ ok: true, token, username });
}
