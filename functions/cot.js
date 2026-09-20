/**
 * functions/cot.js — TFF (Traders in Financial Futures) for S&P 500 Consolidated
 * 5 groups: Dealer, Asset Manager, Leveraged Money, Other Reportable, Non-Reportable
 *
 * GET /cot           → current week snapshot
 * GET /cot?history=1 → full historical array (64+ weeks from CSV baseline)
 */

const CORS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const json = (d, s=200) => new Response(JSON.stringify(d), { status:s, headers:CORS });

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const wantHistory = url.searchParams.get('history') === '1';

  // Try to fetch latest from Nasdaq Data Link TFF dataset
  // TFF S&P 500 Consolidated code: 13874A_FO_ALL (futures only)
  const NASDAQ_TFF = 'https://data.nasdaq.com/api/v3/datasets/CFTC/13874A_FO_ALL.json';

  if (wantHistory) {
    // Try live first, fall back to embedded history
    try {
      const r = await fetch(`${NASDAQ_TFF}?rows=104`, { headers:{'User-Agent':'Mozilla/5.0'} });
      if (r.ok) {
        const data = await r.json();
        const rows = data?.dataset?.data;
        const cols = data?.dataset?.column_names;
        if (rows?.length && cols?.length) {
          const col = (n,row) => { const i=cols.indexOf(n); return i>=0?row[i]:null; };
          const hist = rows.reverse().map(row => {
            const dl=col('Dealer Long',row)||0, ds=col('Dealer Short',row)||0;
            const al=col('Asset Manager Long',row)||0, as_=col('Asset Manager Short',row)||0;
            const ll=col('Leveraged Money Long',row)||0, ls=col('Leveraged Money Short',row)||0;
            const ol=col('Other Reportable Long',row)||0, os=col('Other Reportable Short',row)||0;
            const nl=col('Non-Reportable Long',row)||0, ns=col('Non-Reportable Short',row)||0;
            return { date:col('Date',row), oi:col('Open Interest',row)||0,
              dealer_l:dl, dealer_s:ds, dealer_net:dl-ds,
              asset_l:al, asset_s:as_, asset_net:al-as_,
              lev_l:ll, lev_s:ls, lev_net:ll-ls,
              other_l:ol, other_s:os, other_net:ol-os,
              nonrept_l:nl, nonrept_s:ns, nonrept_net:nl-ns,
            };
          });
          return json({ history: hist, source: 'nasdaq_tff_live' });
        }
      }
    } catch(e) {}
    try {
      const base = new URL(request.url).origin;
      const hr = await fetch(`${base}/sentiment_history.json`, { cf:{cacheEverything:false} });
      if (hr.ok) { const h = await hr.json(); return json({ history: (h.cot || []).map(r => ({ ...r, date: r.report_date })), source: 'recorded_history' }); }
    } catch(e) {}
    return json({ history: [], source: 'none', error: 'No COT history recorded yet' });
  }

  // Current snapshot — get from sentiment_data.json first, then Nasdaq, then embedded
  try {
    const base = new URL(request.url).origin;
    const r = await fetch(`${base}/sentiment_data.json`, { cf:{cacheEverything:false} });
    if (r.ok) {
      const data = await r.json();
      const cot = data?.cot;
      if (cot && typeof cot.lev_net === 'number') {
        const days = cot.report_date
          ? Math.floor((Date.now()-new Date(cot.report_date+'T12:00:00Z').getTime())/86400000)
          : null;
        return json({ ...cot, days_since_report: days, updated: data.updated });
      }
    }
  } catch(e) {}

  return json({ error: 'No COT report in sentiment_data.json' }, 503);
}
