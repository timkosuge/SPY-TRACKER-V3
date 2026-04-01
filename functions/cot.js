/**
 * functions/cot.js
 *
 * Priority order:
 *  1. sentiment_data.json (committed to repo by GitHub Actions weekly)
 *  2. Nasdaq Data Link (Quandl) free API — structured JSON, no key needed
 *  3. CFTC HTML scrape — fragile but authoritative
 *  4. Static hardcoded fallback (last resort, clearly labeled)
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

function json(data) {
  return new Response(JSON.stringify(data), { headers: CORS });
}

export async function onRequestGet(context) {
  const { request } = context;

  // ── 1. sentiment_data.json via same-origin fetch ──────────────────────────
  try {
    const base = new URL(request.url).origin;
    const r = await fetch(`${base}/sentiment_data.json`, {
      cf: { cacheEverything: false },
    });
    if (r.ok) {
      const data = await r.json();
      const cot = data?.cot;
      if (cot && typeof cot.nc_net === 'number') {
        console.log(`cot.js: served from sentiment_data.json (${cot.source})`);
        return json({
          report_date:    cot.report_date,
          nc_long:        cot.nc_long,
          nc_short:       cot.nc_short,
          nc_net:         cot.nc_net,
          nc_net_change:  cot.nc_net_change,
          c_long:         cot.c_long,
          c_short:        cot.c_short,
          c_net:          cot.c_net,
          open_interest:  cot.open_interest,
          stale:          cot.stale ?? false,
          source:         cot.source,
          updated:        data.updated,
        });
      }
    }
  } catch (e) {
    console.warn('cot.js: sentiment_data.json fetch failed:', e.message);
  }

  // ── 2. Nasdaq Data Link (Quandl) free endpoint ────────────────────────────
  try {
    const r = await fetch(
      'https://data.nasdaq.com/api/v3/datasets/CFTC/13874A_F_L_ALL.json?rows=2',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (r.ok) {
      const data = await r.json();
      const rows     = data?.dataset?.data;
      const colNames = data?.dataset?.column_names;
      if (rows?.length && colNames?.length) {
        const col = (name, row) => {
          const i = colNames.indexOf(name);
          return i >= 0 ? row[i] : null;
        };
        const latest = rows[0];
        const prev   = rows[1];

        const ncLong  = col('Noncommercial Long',  latest);
        const ncShort = col('Noncommercial Short', latest);
        const cLong   = col('Commercial Long',     latest);
        const cShort  = col('Commercial Short',    latest);
        const oi      = col('Open Interest',        latest);
        const ncNet   = ncLong != null && ncShort != null ? ncLong - ncShort : null;
        const cNet    = cLong  != null && cShort  != null ? cLong  - cShort  : null;

        let ncNetChange = null;
        if (prev) {
          const pNcL = col('Noncommercial Long',  prev);
          const pNcS = col('Noncommercial Short', prev);
          if (pNcL != null && pNcS != null && ncNet != null) {
            ncNetChange = ncNet - (pNcL - pNcS);
          }
        }

        return json({
          report_date:   col('Date', latest),
          nc_long:       ncLong,
          nc_short:      ncShort,
          nc_net:        ncNet,
          nc_net_change: ncNetChange,
          c_long:        cLong,
          c_short:       cShort,
          c_net:         cNet,
          open_interest: oi,
          source:        'nasdaq_data_link_live',
        });
      }
    }
  } catch (e) {}

  // ── 3. CFTC HTML scrape ───────────────────────────────────────────────────
  try {
    const r = await fetch('https://www.cftc.gov/dea/futures/financial_lf.htm', {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
    });
    if (r.ok) {
      const text = r.text ? await r.text() : '';
      const idx = text.search(/E-MINI S.?P 500/i);
      if (idx > -1) {
        const section = text.substring(idx, idx + 2000);
        const numbers = section.match(/[\d,]{4,}/g);
        if (numbers?.length >= 6) {
          const ci = n => parseInt(n.replace(/,/g, ''));
          return json({
            report_date:   new Date().toISOString().split('T')[0],
            nc_long:       ci(numbers[0]),
            nc_short:      ci(numbers[1]),
            nc_net:        ci(numbers[0]) - ci(numbers[1]),
            nc_net_change: null,
            c_long:        ci(numbers[3]),
            c_short:       ci(numbers[4]),
            c_net:         ci(numbers[3]) - ci(numbers[4]),
            open_interest: null,
            source:        'cftc_html_live',
          });
        }
      }
    }
  } catch (e) {}

  // ── 4. Static fallback ────────────────────────────────────────────────────
  // Update report_date and values manually from https://www.cftc.gov if needed.
  return json({
    report_date:   '2026-03-25',
    nc_long:       287453,
    nc_short:      412891,
    nc_net:        -125438,
    nc_net_change: -8234,
    c_long:        398201,
    c_short:       289334,
    c_net:         108867,
    open_interest: 2341892,
    stale:         true,
    source:        'static_fallback',
    note:          'All live sources failed. Run fetch_sentiment.py to update.',
  });
}
