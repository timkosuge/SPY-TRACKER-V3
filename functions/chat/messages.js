// functions/chat/messages.js
// GET  /chat/messages?since=&limit=&search=
// POST /chat/messages  { content, reply_to_id? }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const json = (data, status=200) => new Response(JSON.stringify(data),
  { status, headers:{'Content-Type':'application/json',...CORS} });
const err  = (msg, status=400) => json({error:msg}, status);
const preflight = () => new Response(null, {status:204, headers:CORS});

async function validateSession(db, token) {
  if (!token) return null;
  const now = Math.floor(Date.now()/1000);
  return await db.prepare(
    'SELECT user_id, username FROM chat_sessions WHERE token=? AND expires_at>?'
  ).bind(token, now).first() || null;
}

function detectMediaType(content) {
  const t = content.trim();
  if (!/^https?:\/\//i.test(t) || t.includes(' ')) return 'text';
  if (/\.(gif)(\?|$)/i.test(t)) return 'gif';
  if (/\.(mp4|webm|mov|ogg)(\?|$)/i.test(t)) return 'video';
  if (/\.(jpg|jpeg|png|webp|avif|bmp|svg)(\?|$)/i.test(t)) return 'image';
  if (/tenor\.com|giphy\.com|media\.giphy\.com/i.test(t)) return 'gif';
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(t)) return 'video';
  return 'text';
}

async function isAdmin(db, userId) {
  // First registered user is admin
  const first = await db.prepare('SELECT id FROM chat_users ORDER BY id ASC LIMIT 1').first();
  return first && first.id === userId;
}

async function isBanned(db, userId) {
  const ban = await db.prepare('SELECT user_id FROM chat_bans WHERE user_id=?').bind(userId).first();
  return !!ban;
}

async function getReactions(db, messageIds) {
  if (!messageIds.length) return {};
  const placeholders = messageIds.map(() => '?').join(',');
  const rows = await db.prepare(
    `SELECT message_id, emoji, username FROM chat_reactions WHERE message_id IN (${placeholders})`
  ).bind(...messageIds).all();
  const out = {};
  for (const r of (rows.results||[])) {
    if (!out[r.message_id]) out[r.message_id] = {};
    if (!out[r.message_id][r.emoji]) out[r.message_id][r.emoji] = [];
    out[r.message_id][r.emoji].push(r.username);
  }
  return out;
}

const lastPost = new Map();

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return preflight();

  const db = env.CHAT_DB;
  if (!db) return err('Chat database not configured', 503);

  const token = (request.headers.get('Authorization')||'').replace('Bearer ','').trim();
  const session = await validateSession(db, token);

  // ── GET messages ────────────────────────────────────────────────────────
  if (request.method === 'GET') {
    const url    = new URL(request.url);
    const since  = parseInt(url.searchParams.get('since')||'0', 10);
    const limit  = Math.min(parseInt(url.searchParams.get('limit')||'60', 10), 100);
    const search = (url.searchParams.get('search')||'').trim();

    let rows;
    if (search) {
      rows = await db.prepare(
        `SELECT id,username,content,msg_type,created_at,reply_to_id,reply_to_username,reply_to_preview
         FROM chat_messages WHERE content LIKE ? ORDER BY created_at DESC LIMIT ?`
      ).bind(`%${search}%`, limit).all();
      rows.results = (rows.results||[]).reverse();
    } else if (since > 0) {
      rows = await db.prepare(
        `SELECT id,username,content,msg_type,created_at,reply_to_id,reply_to_username,reply_to_preview
         FROM chat_messages WHERE created_at>? ORDER BY created_at ASC LIMIT ?`
      ).bind(since, limit).all();
    } else {
      rows = await db.prepare(
        `SELECT id,username,content,msg_type,created_at,reply_to_id,reply_to_username,reply_to_preview
         FROM chat_messages ORDER BY created_at DESC LIMIT ?`
      ).bind(limit).all();
      rows.results = (rows.results||[]).reverse();
    }

    const messages = rows.results||[];
    const ids = messages.map(m=>m.id);
    const reactions = await getReactions(db, ids);
    messages.forEach(m => { m.reactions = reactions[m.id]||{}; });

    // Pins
    const pins = await db.prepare(
      'SELECT message_id FROM chat_pins'
    ).all();
    const pinnedIds = new Set((pins.results||[]).map(p=>p.message_id));
    messages.forEach(m => { m.pinned = pinnedIds.has(m.id); });

    return json({ messages });
  }

  // ── POST — requires auth ─────────────────────────────────────────────────
  if (request.method !== 'POST') return err('Method not allowed', 405);
  if (!session) return err('Not authenticated', 401);

  if (await isBanned(db, session.user_id)) return err('You are banned', 403);

  const url  = new URL(request.url);
  const action = url.searchParams.get('action');

  // ── Reactions ────────────────────────────────────────────────────────────
  if (action === 'react') {
    let body; try { body = await request.json(); } catch { return err('Invalid JSON'); }
    const { message_id, emoji } = body;
    if (!message_id || !emoji) return err('message_id and emoji required');
    const allowed = ['👍','❤️','😂','🔥','💀','📈','📉','💰','🎯','😮'];
    if (!allowed.includes(emoji)) return err('Emoji not allowed');

    // Toggle: insert or delete
    const existing = await db.prepare(
      'SELECT id FROM chat_reactions WHERE message_id=? AND user_id=? AND emoji=?'
    ).bind(message_id, session.user_id, emoji).first();

    if (existing) {
      await db.prepare('DELETE FROM chat_reactions WHERE message_id=? AND user_id=? AND emoji=?')
        .bind(message_id, session.user_id, emoji).run();
    } else {
      await db.prepare(
        'INSERT OR IGNORE INTO chat_reactions (message_id,user_id,username,emoji) VALUES (?,?,?,?)'
      ).bind(message_id, session.user_id, session.username, emoji).run();
    }

    // Return updated reactions for this message
    const rows = await db.prepare(
      'SELECT emoji, username FROM chat_reactions WHERE message_id=?'
    ).bind(message_id).all();
    const reactions = {};
    for (const r of (rows.results||[])) {
      if (!reactions[r.emoji]) reactions[r.emoji] = [];
      reactions[r.emoji].push(r.username);
    }
    return json({ ok:true, message_id, reactions });
  }

  // ── Pin ──────────────────────────────────────────────────────────────────
  if (action === 'pin') {
    if (!await isAdmin(db, session.user_id)) return err('Admin only', 403);
    let body; try { body = await request.json(); } catch { return err('Invalid JSON'); }
    const { message_id } = body;
    const existing = await db.prepare('SELECT id FROM chat_pins WHERE message_id=?').bind(message_id).first();
    if (existing) {
      await db.prepare('DELETE FROM chat_pins WHERE message_id=?').bind(message_id).run();
      return json({ ok:true, pinned:false });
    } else {
      await db.prepare('INSERT INTO chat_pins (message_id,pinned_by) VALUES (?,?)')
        .bind(message_id, session.username).run();
      return json({ ok:true, pinned:true });
    }
  }

  // ── Delete message ───────────────────────────────────────────────────────
  if (action === 'delete') {
    let body; try { body = await request.json(); } catch { return err('Invalid JSON'); }
    const { message_id } = body;
    const msg = await db.prepare('SELECT user_id FROM chat_messages WHERE id=?').bind(message_id).first();
    if (!msg) return err('Message not found', 404);
    const admin = await isAdmin(db, session.user_id);
    if (msg.user_id !== session.user_id && !admin) return err('Not allowed', 403);
    await db.prepare('DELETE FROM chat_messages WHERE id=?').bind(message_id).run();
    return json({ ok:true });
  }

  // ── Ban user (admin only) ────────────────────────────────────────────────
  if (action === 'ban') {
    if (!await isAdmin(db, session.user_id)) return err('Admin only', 403);
    let body; try { body = await request.json(); } catch { return err('Invalid JSON'); }
    const { username, reason } = body;
    const user = await db.prepare('SELECT id FROM chat_users WHERE username=? COLLATE NOCASE').bind(username).first();
    if (!user) return err('User not found', 404);
    await db.prepare('INSERT OR REPLACE INTO chat_bans (user_id,banned_by,reason) VALUES (?,?,?)')
      .bind(user.id, session.username, reason||'').run();
    return json({ ok:true });
  }

  // ── Heartbeat (presence) ─────────────────────────────────────────────────
  if (action === 'heartbeat') {
    const now = Math.floor(Date.now()/1000);
    await db.prepare(
      'INSERT OR REPLACE INTO chat_presence (user_id,username,last_seen) VALUES (?,?,?)'
    ).bind(session.user_id, session.username, now).run();
    // Return who's online (seen in last 2 min)
    const online = await db.prepare(
      'SELECT username FROM chat_presence WHERE last_seen>?'
    ).bind(now - 120).all();
    return json({ ok:true, online: (online.results||[]).map(r=>r.username) });
  }

  // ── Send message ─────────────────────────────────────────────────────────
  const last = lastPost.get(session.user_id)||0;
  const now  = Date.now()/1000;
  if (now - last < 1) return err('Slow down', 429);
  lastPost.set(session.user_id, now);

  let body; try { body = await request.json(); } catch { return err('Invalid JSON'); }
  const content = (body.content||'').trim();
  if (!content) return err('Message cannot be empty');
  if (content.length > 2000) return err('Message too long');

  const msgType = detectMediaType(content);
  const ts = Math.floor(Date.now()/1000);

  // Handle reply
  let replyId = null, replyUser = null, replyPreview = null;
  if (body.reply_to_id) {
    const orig = await db.prepare(
      'SELECT id,username,content FROM chat_messages WHERE id=?'
    ).bind(body.reply_to_id).first();
    if (orig) {
      replyId = orig.id;
      replyUser = orig.username;
      replyPreview = orig.content.slice(0, 80);
    }
  }

  const result = await db.prepare(
    `INSERT INTO chat_messages (user_id,username,content,msg_type,created_at,reply_to_id,reply_to_username,reply_to_preview)
     VALUES (?,?,?,?,?,?,?,?) RETURNING id,username,content,msg_type,created_at,reply_to_id,reply_to_username,reply_to_preview`
  ).bind(session.user_id, session.username, content, msgType, ts, replyId, replyUser, replyPreview).first();

  result.reactions = {};
  result.pinned = false;

  await db.prepare('UPDATE chat_users SET last_seen=? WHERE id=?').bind(ts, session.user_id).run();
  await db.prepare(
    'DELETE FROM chat_messages WHERE id NOT IN (SELECT id FROM chat_messages ORDER BY created_at DESC LIMIT 1000)'
  ).run();

  return json({ ok:true, message:result });
}
