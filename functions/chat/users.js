// functions/chat/users.js
// GET /chat/users — returns all registered users with last_seen

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return preflight();
  if (request.method !== 'GET') return err('Method not allowed', 405);

  const db = env.CHAT_DB;
  if (!db) return err('Chat database not configured', 503);

  const token = (request.headers.get('Authorization')||'').replace('Bearer ','').trim();
  const session = await validateSession(db, token);
  if (!session) return err('Not authenticated', 401);

  const rows = await db.prepare(
    'SELECT username, last_seen FROM chat_users ORDER BY last_seen DESC NULLS LAST'
  ).all();

  return json({ users: rows.results||[] });
}
