/**
 * functions/cot.js
 * COT E-Mini S&P 500 — current + historical
 * GET /cot          → current week snapshot
 * GET /cot?history=1&rows=52 → last N weeks of history
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const json = (d, s=200) => new Response(JSON.stringify(d), { status:s, headers:CORS });

const NASDAQ_BASE = 'https://data.nasdaq.com/api/v3/datasets/CFTC/13874A_F_L_ALL.json';

function parseNasdaq(data) {
  const rows     = data?.dataset?.data;
  const colNames = data?.dataset?.column_names;
  if (!rows?.length || !colNames?.length) return null;
  const col = (name, row) => { const i = colNames.indexOf(name); return i>=0 ? row[i] : null; };
  return rows.map((row, i) => {
    const ncL  = col('Noncommercial Long',  row);
    const ncS  = col('Noncommercial Short', row);
    const cL   = col('Commercial Long',     row);
    const cS   = col('Commercial Short',    row);
    const oi   = col('Open Interest',        row);
    const ncNet = ncL!=null&&ncS!=null ? ncL-ncS : null;
    const cNet  = cL!=null&&cS!=null   ? cL-cS   : null;
    // W/W change vs next row (rows are newest-first)
    const prev = rows[i+1];
    let ncNetChange = null;
    if (prev) {
      const pL = col('Noncommercial Long',  prev);
      const pS = col('Noncommercial Short', prev);
      if (pL!=null&&pS!=null&&ncNet!=null) ncNetChange = ncNet - (pL-pS);
    }
    return {
      date:          col('Date', row),
      nc_long:       ncL,
      nc_short:      ncS,
      nc_net:        ncNet,
      nc_net_change: ncNetChange,
      c_long:        cL,
      c_short:       cS,
      c_net:         cNet,
      open_interest: oi,
    };
  });
}

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const wantHistory = url.searchParams.get('history') === '1';
  const rows = Math.min(parseInt(url.searchParams.get('rows') || '104', 10), 260);

  // ── History mode ─────────────────────────────────────────────────────────
  if (wantHistory) {
    try {
      const r = await fetch(`${NASDAQ_BASE}?rows=${rows}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (r.ok) {
        const data = await r.json();
        const parsed = parseNasdaq(data);
        if (parsed?.length) {
          // Return oldest-first for charting
          return json({ history: parsed.reverse(), source: 'nasdaq_data_link' });
        }
      }
    } catch(e) {}
    return json({ history: [], error: 'COT history unavailable' });
  }

  // ── Current snapshot ─────────────────────────────────────────────────────

  // 1. sentiment_data.json (GitHub Actions updates this weekly)
  try {
    const base = new URL(request.url).origin;
    const r = await fetch(`${base}/sentiment_data.json`, { cf: { cacheEverything: false } });
    if (r.ok) {
      const data = await r.json();
      const cot = data?.cot;
      if (cot && typeof cot.nc_net === 'number') {
        // Calculate days since report for freshness indicator
        const daysSince = cot.report_date
          ? Math.floor((Date.now() - new Date(cot.report_date+'T12:00:00Z').getTime()) / 86400000)
          : null;
        return json({ ...cot, days_since_report: daysSince, updated: data.updated });
      }
    }
  } catch(e) {}

  // 2. Nasdaq Data Link live
  try {
    const r = await fetch(`${NASDAQ_BASE}?rows=2`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (r.ok) {
      const data = await r.json();
      const parsed = parseNasdaq(data);
      if (parsed?.length) {
        const latest = parsed[0];
        const daysSince = latest.date
          ? Math.floor((Date.now() - new Date(latest.date+'T12:00:00Z').getTime()) / 86400000)
          : null;
        return json({ ...latest, report_date: latest.date, days_since_report: daysSince, source: 'nasdaq_data_link_live' });
      }
    }
  } catch(e) {}

  // 3. Static fallback
  return json({
    report_date: '2026-03-25', nc_long: 13874, nc_short: 1879423,
    nc_net: -1865549, nc_net_change: null, c_long: 790910,
    c_short: 45599, c_net: 745311, open_interest: null,
    days_since_report: 9, stale: true, source: 'static_fallback',
  });
}
