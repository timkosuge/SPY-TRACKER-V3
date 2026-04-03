// functions/blog.js
// GET  /blog?action=list               → list all posts (summary)
// GET  /blog?action=post&id=X          → single post + comments
// POST /blog { action:'publish', password, title, body, tags }  → create post
// POST /blog { action:'comment', postId, author, body }         → add comment
// POST /blog { action:'delete', password, postId }              → delete post

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (d, s=200) => new Response(JSON.stringify(d), { status:s, headers:{'Content-Type':'application/json',...CORS} });
const err  = (m, s=400) => json({ error:m }, s);

// Use prepare().run() — db.exec() is unreliable across D1 versions
async function ensureTables(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS blog_posts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      body       TEXT NOT NULL,
      tags       TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      read_time  INTEGER DEFAULT 1
    )`
  ).run();
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS blog_comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id    INTEGER NOT NULL,
      author     TEXT NOT NULL DEFAULT 'Anonymous',
      body       TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`
  ).run();
}

function readTime(body) {
  return Math.max(1, Math.round(body.split(/\s+/).length / 200));
}

export async function onRequestOptions() {
  return new Response(null, { status:204, headers:CORS });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return err('DB binding not configured', 500);

  try {
    await ensureTables(db);
  } catch(e) {
    return err('DB init failed: ' + e.message, 500);
  }

  const url    = new URL(request.url);
  const action = url.searchParams.get('action') || 'list';

  if (action === 'list') {
    try {
      const { results } = await db.prepare(
        'SELECT id, title, tags, created_at, read_time, substr(body,1,300) AS excerpt FROM blog_posts ORDER BY created_at DESC'
      ).all();
      return json({ posts: results || [] });
    } catch(e) {
      return err('Query failed: ' + e.message, 500);
    }
  }

  if (action === 'post') {
    try {
      const id   = url.searchParams.get('id');
      const post = await db.prepare('SELECT * FROM blog_posts WHERE id=?').bind(id).first();
      if (!post) return err('Post not found', 404);
      const { results: comments } = await db.prepare(
        'SELECT * FROM blog_comments WHERE post_id=? ORDER BY created_at ASC'
      ).bind(id).all();
      return json({ post, comments: comments || [] });
    } catch(e) {
      return err('Query failed: ' + e.message, 500);
    }
  }

  return err('Unknown action');
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return err('DB binding not configured', 500);

  try {
    await ensureTables(db);
  } catch(e) {
    return err('DB init failed: ' + e.message, 500);
  }

  let body;
  try { body = await request.json(); } catch { return err('Invalid JSON'); }

  const BLOG_PASSWORD = env.BLOG_PASSWORD || env.CFP_PASSWORD || 'Tetsuo314!';

  if (body.action === 'publish') {
    if (body.password !== BLOG_PASSWORD) return err('Wrong password', 403);
    const title = (body.title || '').trim();
    const text  = (body.body  || '').trim();
    if (!title || !text) return err('Title and body required');
    const tags = (body.tags || '').trim();
    const now  = Math.floor(Date.now() / 1000);
    const rt   = readTime(text);
    try {
      const result = await db.prepare(
        'INSERT INTO blog_posts (title, body, tags, created_at, read_time) VALUES (?,?,?,?,?) RETURNING id'
      ).bind(title, text, tags, now, rt).first();
      return json({ ok: true, id: result?.id });
    } catch(e) {
      return err('Insert failed: ' + e.message, 500);
    }
  }

  if (body.action === 'delete') {
    if (body.password !== BLOG_PASSWORD) return err('Wrong password', 403);
    try {
      await db.prepare('DELETE FROM blog_posts WHERE id=?').bind(body.postId).run();
      await db.prepare('DELETE FROM blog_comments WHERE post_id=?').bind(body.postId).run();
      return json({ ok: true });
    } catch(e) {
      return err('Delete failed: ' + e.message, 500);
    }
  }

  if (body.action === 'comment') {
    const postId = body.postId;
    const author = (body.author || 'Anonymous').trim().slice(0, 50);
    const text   = (body.body || '').trim();
    if (!postId || !text) return err('postId and body required');
    if (text.length > 2000) return err('Comment too long');
    const now = Math.floor(Date.now() / 1000);
    try {
      const result = await db.prepare(
        'INSERT INTO blog_comments (post_id, author, body, created_at) VALUES (?,?,?,?) RETURNING id'
      ).bind(postId, author, text, now).first();
      return json({ ok: true, id: result?.id });
    } catch(e) {
      return err('Insert failed: ' + e.message, 500);
    }
  }

  return err('Unknown action');
}
