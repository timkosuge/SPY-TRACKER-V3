/**
 * functions/sentiment.js
 *
 * Priority order:
 *  1. D1 database override (set via POST from dashboard UI)
 *  2. sentiment_data.json (committed to repo by GitHub Actions weekly)
 *  3. AAII XLS direct download (live attempt)
 *  4. AAII HTML scrape (live attempt)
 *  5. Static hardcoded fallback (last resort, clearly labeled)
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Content-Type': 'application/json',
};

function json(data) {
  return new Response(JSON.stringify(data), { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// ── POST /sentiment — save manual AAII override to D1 ─────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return json({ error: 'DB not configured' }, 500);

  try {
    const body = await request.json();
    const { password, date, bullish, neutral, bearish } = body;

    // Simple password check — set AAII_PASSWORD in CF Pages env vars
    const pw = env.AAII_PASSWORD || 'spytracker';
    if (password !== pw) return json({ error: 'Unauthorized' }, 401);

    if (!date || bullish == null || neutral == null || bearish == null) {
      return json({ error: 'Missing fields' }, 400);
    }

    const spread = Math.round((bullish - bearish) * 10) / 10;

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS aaii_override (
        id INTEGER PRIMARY KEY,
        date TEXT, bullish REAL, neutral REAL, bearish REAL,
        spread REAL, updated_at TEXT
      )
    `).run();

    await db.prepare(`
      INSERT INTO aaii_override (id, date, bullish, neutral, bearish, spread, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        date=excluded.date, bullish=excluded.bullish, neutral=excluded.neutral,
        bearish=excluded.bearish, spread=excluded.spread, updated_at=excluded.updated_at
    `).bind(date, bullish, neutral, bearish, spread, new Date().toISOString()).run();

    return json({ ok: true, date, bullish, neutral, bearish, spread });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;

  // ── 1. D1 override (set via dashboard UI) ─────────────────────────────────
  try {
    const db = env.DB;
    if (db) {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS aaii_override (
          id INTEGER PRIMARY KEY,
          date TEXT, bullish REAL, neutral REAL, bearish REAL,
          spread REAL, updated_at TEXT
        )
      `).run();
      const row = await db.prepare('SELECT * FROM aaii_override WHERE id=1').first();
      if (row && row.bullish) {
        console.log(`sentiment.js: served from D1 override (${row.date})`);
        return json({
          date:        row.date,
          bullish:     row.bullish,
          neutral:     row.neutral,
          bearish:     row.bearish,
          spread:      row.spread,
          avg_bullish: 37.5,
          avg_bearish: 31.0,
          stale:       false,
          source:      'manual_override',
          updated:     row.updated_at,
        });
      }
    }
  } catch (e) {
    console.warn('sentiment.js: D1 check failed:', e.message);
  }

  // ── 2. sentiment_data.json via same-origin fetch ───────────────────────────
  // Cloudflare Pages serves static assets at the same origin — fetch it directly.
  try {
    const base = new URL(request.url).origin;
    const r = await fetch(`${base}/sentiment_data.json?t=${Date.now()}`, {
      cf: { cacheEverything: false },
      headers: { 'Cache-Control': 'no-cache, no-store' },
    });
    if (r.ok) {
      const data = await r.json();
      const aaii = data?.aaii;
      if (
        aaii &&
        typeof aaii.bullish === 'number' &&
        typeof aaii.bearish === 'number'
      ) {
        console.log(`sentiment.js: served from sentiment_data.json (${aaii.source})`);
        return json({
          date:        aaii.date,
          bullish:     aaii.bullish,
          neutral:     aaii.neutral,
          bearish:     aaii.bearish,
          spread:      aaii.spread,
          avg_bullish: aaii.avg_bullish ?? 37.5,
          avg_bearish: aaii.avg_bearish ?? 31.0,
          stale:       aaii.stale ?? false,
          source:      aaii.source,
          updated:     data.updated,
        });
      }
    }
  } catch (e) {
    console.warn('sentiment.js: sentiment_data.json fetch failed:', e.message);
  }

  // ── 2. AAII XLS direct download ───────────────────────────────────────────
  try {
    const r = await fetch('https://www.aaii.com/files/surveys/sentiment.xls', {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.aaii.com/sentimentsurvey',
      },
    });
    if (r.ok) {
      const text = await r.text();
      const lines = text.split('\n').filter(l => l.trim());
      for (let i = lines.length - 1; i >= 0; i--) {
        const cols = lines[i].split('\t');
        if (cols.length >= 4) {
          const bull = parseFloat(cols[1]);
          const neu  = parseFloat(cols[2]);
          const bear = parseFloat(cols[3]);
          if (!isNaN(bull) && bull > 0 && bull < 100) {
            return json({
              date:        cols[0]?.trim(),
              bullish:     Math.round(bull * 100) / 100,
              neutral:     Math.round(neu  * 100) / 100,
              bearish:     Math.round(bear * 100) / 100,
              spread:      Math.round((bull - bear) * 100) / 100,
              avg_bullish: 37.5,
              avg_bearish: 31.0,
              source:      'aaii_xls_live',
            });
          }
        }
      }
    }
  } catch (e) {}

  // ── 3. AAII HTML scrape ───────────────────────────────────────────────────
  try {
    const r = await fetch('https://www.aaii.com/sentimentsurvey', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    });
    if (r.ok) {
      const text = await r.text();
      const m = text.match(/(\d{1,2}\.\d)%.*?(\d{1,2}\.\d)%.*?(\d{1,2}\.\d)%/s);
      if (m) {
        const [, bull, neu, bear] = m.map(Number);
        return json({
          bullish:     bull,
          neutral:     neu,
          bearish:     bear,
          spread:      Math.round((bull - bear) * 100) / 100,
          avg_bullish: 37.5,
          avg_bearish: 31.0,
          source:      'aaii_html_live',
        });
      }
    }
  } catch (e) {}

  // ── 4. Static fallback ────────────────────────────────────────────────────
  // Update this manually if the GitHub Actions job fails for multiple weeks.
  return json({
    date:        '2026-03-27',
    bullish:     21.5,
    neutral:     26.3,
    bearish:     52.2,
    spread:      -30.7,
    avg_bullish: 37.5,
    avg_bearish: 31.0,
    stale:       true,
    source:      'static_fallback',
    note:        'All live sources failed. Run fetch_sentiment.py to update.',
  });
}
