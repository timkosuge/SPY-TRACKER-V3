/**
 * functions/gex-history.js
 *
 * Stores and retrieves GEX snapshots for two chart types:
 *  1. Intraday interval map  — 5-min snapshots for today (KV key: gex:intraday:YYYY-MM-DD)
 *  2. Daily history chart    — one record per trading day (KV key: gex:daily)
 *
 * GET  /gex-history?type=intraday[&date=YYYY-MM-DD]  → today's 5-min snapshots
 * GET  /gex-history?type=daily[&days=90]             → daily history (default 90 days)
 * POST /gex-history  body: { snapshot }              → internal write (called by /gex)
 *
 * Cloudflare KV binding required: GEX_HISTORY (set in Pages dashboard)
 * Without KV the endpoint returns empty arrays gracefully.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

// ET timezone helpers
function toET(date) {
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
}
function etDateStr(date) {
  const et = toET(date);
  return `${et.getFullYear()}-${String(et.getMonth()+1).padStart(2,'0')}-${String(et.getDate()).padStart(2,'0')}`;
}
function etTimeStr(date) {
  const et = toET(date);
  return `${String(et.getHours()).padStart(2,'0')}:${String(et.getMinutes()).padStart(2,'0')}`;
}
function isMarketHours(date) {
  const et = toET(date);
  const mins = et.getHours()*60 + et.getMinutes();
  const day  = et.getDay();
  return day >= 1 && day <= 5 && mins >= 570 && mins <= 960; // 9:30–4:00
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const kv = env.GEX_HISTORY; // Cloudflare KV namespace binding

  // ── POST: store a snapshot ──────────────────────────────────────────────
  if (request.method === 'POST') {
    if (!kv) return json({ ok: false, error: 'KV not bound' });
    try {
      const body = await request.json();
      const snap = body.snapshot;
      if (!snap || !snap.flip_point) return json({ ok: false, error: 'Invalid snapshot' });

      const now = new Date();
      const dateStr = etDateStr(now);
      const timeStr = etTimeStr(now);
      const entry = {
        t: timeStr,
        ts: now.toISOString(),
        flip:  snap.flip_point,
        sup:   snap.support,
        res:   snap.resistance,
        net:   snap.net_gex,
        spot:  snap.spot,
        regime: snap.regime,
      };

      // ── 1. Intraday: append to today's array ────────────────────────────
      if (isMarketHours(now)) {
        const intradayKey = `gex:intraday:${dateStr}`;
        let existing = [];
        try {
          const raw = await kv.get(intradayKey, 'json');
          if (Array.isArray(raw)) existing = raw;
        } catch(e) {}
        // Deduplicate by minute
        const alreadyThisMin = existing.some(e => e.t === timeStr);
        if (!alreadyThisMin) {
          existing.push(entry);
          // Keep max 100 snapshots per day (500 min session / 5 min interval)
          if (existing.length > 100) existing = existing.slice(-100);
          await kv.put(intradayKey, JSON.stringify(existing), { expirationTtl: 86400 * 3 }); // 3 days
        }
      }

      // ── 2. Daily: upsert today's summary ────────────────────────────────
      const dailyKey = 'gex:daily';
      let daily = [];
      try {
        const raw = await kv.get(dailyKey, 'json');
        if (Array.isArray(raw)) daily = raw;
      } catch(e) {}

      const todayIdx = daily.findIndex(d => d.date === dateStr);
      const dayEntry = {
        date: dateStr,
        flip:  snap.flip_point,
        sup:   snap.support,
        res:   snap.resistance,
        net:   snap.net_gex,
        spot:  snap.spot,
        regime: snap.regime,
        updated: now.toISOString(),
      };
      if (todayIdx >= 0) {
        daily[todayIdx] = dayEntry;
      } else {
        daily.push(dayEntry);
        daily.sort((a,b) => a.date.localeCompare(b.date));
        if (daily.length > 365) daily = daily.slice(-365);
      }
      await kv.put(dailyKey, JSON.stringify(daily));

      return json({ ok: true, date: dateStr, time: timeStr });
    } catch(e) {
      return json({ ok: false, error: e.message }, 500);
    }
  }

  // ── GET ─────────────────────────────────────────────────────────────────
  const type = url.searchParams.get('type') || 'intraday';

  if (type === 'intraday') {
    if (!kv) return json({ snapshots: [], error: 'KV not bound' });
    const now = new Date();
    const dateStr = url.searchParams.get('date') || etDateStr(now);
    try {
      const raw = await kv.get(`gex:intraday:${dateStr}`, 'json');
      return json({ date: dateStr, snapshots: Array.isArray(raw) ? raw : [] });
    } catch(e) {
      return json({ date: dateStr, snapshots: [], error: e.message });
    }
  }

  if (type === 'daily') {
    if (!kv) return json({ history: [], error: 'KV not bound' });
    const days = parseInt(url.searchParams.get('days') || '90', 10);
    try {
      const raw = await kv.get('gex:daily', 'json');
      const all = Array.isArray(raw) ? raw : [];
      return json({ history: all.slice(-days) });
    } catch(e) {
      return json({ history: [], error: e.message });
    }
  }

  return json({ error: 'Unknown type' }, 400);
}
