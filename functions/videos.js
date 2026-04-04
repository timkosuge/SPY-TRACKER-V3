// functions/videos.js
// GET  /videos?action=list             → all videos (newest first)
// GET  /videos?action=topics           → distinct topic list
// POST /videos { action:'add', password, url, title, topic, notes }   → add video
// POST /videos { action:'delete', password, id }                       → delete video

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });
const err  = (m, s = 400) => json({ error: m }, s);

async function ensureTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS video_library (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      url        TEXT NOT NULL,
      video_id   TEXT,
      topic      TEXT DEFAULT 'General',
      notes      TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    )
  `).run();
}

function extractVideoId(url) {
  if (!url) return null;
  url = url.trim();
  let m;
  m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/); if (m) return m[1];
  m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/); if (m) return m[1];
  m = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/); if (m) return m[1];
  m = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/); if (m) return m[1];
  m = url.match(/\/live\/([a-zA-Z0-9_-]{11})/); if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return err('DB binding not configured', 500);

  try { await ensureTable(db); } catch (e) { return err('DB init failed: ' + e.message, 500); }

  const url    = new URL(request.url);
  const action = url.searchParams.get('action') || 'list';

  if (action === 'list') {
    const topic = url.searchParams.get('topic') || null;
    try {
      let result;
      if (topic && topic !== 'ALL') {
        result = await db.prepare(
          'SELECT * FROM video_library WHERE topic=? ORDER BY created_at DESC'
        ).bind(topic).all();
      } else {
        result = await db.prepare(
          'SELECT * FROM video_library ORDER BY created_at DESC'
        ).all();
      }
      return json({ videos: result.results || [] });
    } catch (e) { return err('Query failed: ' + e.message, 500); }
  }

  if (action === 'topics') {
    try {
      const result = await db.prepare(
        "SELECT DISTINCT topic FROM video_library ORDER BY topic ASC"
      ).all();
      const topics = (result.results || []).map(r => r.topic).filter(Boolean);
      return json({ topics });
    } catch (e) { return err('Query failed: ' + e.message, 500); }
  }

  return err('Unknown action');
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return err('DB binding not configured', 500);

  try { await ensureTable(db); } catch (e) { return err('DB init failed: ' + e.message, 500); }

  let body;
  try { body = await request.json(); } catch { return err('Invalid JSON'); }

  const PASSWORD = env.BLOG_PASSWORD || env.CFP_PASSWORD || 'Tetsuo314!';

  if (body.action === 'add') {
    if (body.password !== PASSWORD) return err('Wrong password', 403);
    const title = (body.title || '').trim();
    const url   = (body.url   || '').trim();
    if (!title || !url) return err('Title and URL required');
    const topic    = (body.topic || 'General').trim().slice(0, 50) || 'General';
    const notes    = (body.notes || '').trim().slice(0, 500);
    const videoId  = extractVideoId(url);
    const now      = Math.floor(Date.now() / 1000);
    try {
      const result = await db.prepare(
        'INSERT INTO video_library (title, url, video_id, topic, notes, created_at) VALUES (?,?,?,?,?,?) RETURNING id'
      ).bind(title, url, videoId, topic, notes, now).first();
      return json({ ok: true, id: result?.id });
    } catch (e) { return err('Insert failed: ' + e.message, 500); }
  }

  if (body.action === 'delete') {
    if (body.password !== PASSWORD) return err('Wrong password', 403);
    if (!body.id) return err('id required');
    try {
      await db.prepare('DELETE FROM video_library WHERE id=?').bind(body.id).run();
      return json({ ok: true });
    } catch (e) { return err('Delete failed: ' + e.message, 500); }
  }

  return err('Unknown action');
}
