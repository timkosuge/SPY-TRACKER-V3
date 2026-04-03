// functions/chat/messages.js
// GET  /chat/messages?since=<unix_ts>&limit=<n>   — fetch messages
// POST /chat/messages  { content }                 — send a message

import { json, err, preflight, validateSession, detectMediaType } from './_utils.js';

const MAX_CONTENT  = 2000;   // characters
const MAX_MESSAGES = 100;    // max fetch per call
const RATE_LIMIT_S = 1;      // min seconds between posts per user

// Simple in-memory rate limiter (resets per Worker instance)
const lastPost = new Map();

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return preflight();

  const db = env.CHAT_DB;
  if (!db) return err('Chat database not configured', 503);

  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();

  if (request.method === 'GET') {
    // Public read — no auth required, but pass token to annotate "mine"
    const url    = new URL(request.url);
    const since  = parseInt(url.searchParams.get('since') || '0', 10);
    const limit  = Math.min(parseInt(url.searchParams.get('limit') || '60', 10), MAX_MESSAGES);

    let rows;
    if (since > 0) {
      rows = await db.prepare(
        'SELECT id, username, content, msg_type, created_at FROM chat_messages WHERE created_at > ? ORDER BY created_at ASC LIMIT ?'
      ).bind(since, limit).all();
    } else {
      // Initial load — last N messages
      rows = await db.prepare(
        'SELECT id, username, content, msg_type, created_at FROM chat_messages ORDER BY created_at DESC LIMIT ?'
      ).bind(limit).all();
      rows.results = rows.results.reverse();
    }

    return json({ messages: rows.results || [] });
  }

  if (request.method === 'POST') {
    // Auth required to post
    const session = await validateSession(db, token);
    if (!session) return err('Not authenticated', 401);

    // Rate limit
    const last = lastPost.get(session.user_id) || 0;
    const now  = Date.now() / 1000;
    if (now - last < RATE_LIMIT_S) return err('Slow down', 429);
    lastPost.set(session.user_id, now);

    let body;
    try { body = await request.json(); }
    catch { return err('Invalid JSON'); }

    const content = (body.content || '').trim();
    if (!content)             return err('Message cannot be empty');
    if (content.length > MAX_CONTENT) return err(`Message too long (max ${MAX_CONTENT} chars)`);

    const msgType = detectMediaType(content);
    const ts = Math.floor(Date.now() / 1000);

    const result = await db.prepare(
      'INSERT INTO chat_messages (user_id, username, content, msg_type, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id, username, content, msg_type, created_at'
    ).bind(session.user_id, session.username, content, msgType, ts).first();

    // Update last_seen
    await db.prepare('UPDATE chat_users SET last_seen = ? WHERE id = ?')
      .bind(ts, session.user_id).run();

    // Prune old messages — keep last 1000
    await db.prepare(
      'DELETE FROM chat_messages WHERE id NOT IN (SELECT id FROM chat_messages ORDER BY created_at DESC LIMIT 1000)'
    ).run();

    return json({ ok: true, message: result });
  }

  return err('Method not allowed', 405);
}
