// functions/chat/_utils.js
// Shared utilities for chat Workers

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export function err(msg, status = 400) {
  return json({ error: msg }, status);
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS });
}

// Simple but solid password hashing using Web Crypto (SHA-256 + salt)
export async function hashPassword(password, salt) {
  const s = salt || crypto.randomUUID().replace(/-/g, '');
  const encoder = new TextEncoder();
  const data = encoder.encode(s + password);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  const hashHex = hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
  return { hash: `${s}:${hashHex}`, salt: s };
}

export async function verifyPassword(password, stored) {
  const [salt] = stored.split(':');
  const { hash } = await hashPassword(password, salt);
  return hash === stored;
}

export function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function validateSession(db, token) {
  if (!token) return null;
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare(
    'SELECT user_id, username FROM chat_sessions WHERE token = ? AND expires_at > ?'
  ).bind(token, now).first();
  return row || null;
}

// Strip a URL to detect media type
export function detectMediaType(content) {
  const trimmed = content.trim();
  const isURL = /^https?:\/\//i.test(trimmed) && !trimmed.includes(' ');
  if (!isURL) return 'text';
  if (/\.(gif)(\?|$)/i.test(trimmed)) return 'gif';
  if (/\.(mp4|webm|mov|ogg)(\?|$)/i.test(trimmed)) return 'video';
  if (/\.(jpg|jpeg|png|webp|avif|bmp|svg)(\?|$)/i.test(trimmed)) return 'image';
  // Tenor / Giphy URLs
  if (/tenor\.com|giphy\.com/i.test(trimmed)) return 'gif';
  // YouTube / generic video hosts
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(trimmed)) return 'video';
  return 'text';
}
