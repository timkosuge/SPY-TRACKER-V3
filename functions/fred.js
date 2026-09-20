// functions/fred.js
// Fetches macro data from FRED API for the macro dashboard tab
// FRED_API_KEY must be set in Cloudflare Pages environment variables

const CORS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'max-age=3600', // cache 1hr - FRED data updates daily/weekly
};

const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: CORS });

// FRED series definitions with metadata
const SERIES = {
  // INFLATION
  CPIAUCSL:  { name: 'CPI (All Items)',        cat: 'inflation', unit: 'Index',    freq: 'monthly', good_direction: 'down' },
  CPILFESL:  { name: 'Core CPI (ex Food/Energy)', cat: 'inflation', unit: 'Index', freq: 'monthly', good_direction: 'down', show_yoy: true },
  PCEPI:     { name: 'PCE Price Index',        cat: 'inflation', unit: 'Index',    freq: 'monthly', good_direction: 'down', show_yoy: true },
  PCEPILFE:  { name: 'Core PCE (Fed target)',  cat: 'inflation', unit: 'Index',    freq: 'monthly', good_direction: 'down', show_yoy: true },
  T10YIE:    { name: '10Y Breakeven Inflation',cat: 'inflation', unit: '%',        freq: 'daily',   good_direction: 'stable' },

  // EMPLOYMENT
  UNRATE:    { name: 'Unemployment Rate',      cat: 'employment', unit: '%',       freq: 'monthly', good_direction: 'down' },
  PAYEMS:    { name: 'Nonfarm Payrolls',        cat: 'employment', unit: 'K jobs',  freq: 'monthly', good_direction: 'up', display: 'change' },
  ICSA:      { name: 'Initial Jobless Claims',  cat: 'employment', unit: 'K',       freq: 'weekly',  good_direction: 'down' },
  JTSJOL:    { name: 'Job Openings (JOLTS)',    cat: 'employment', unit: 'M',       freq: 'monthly', good_direction: 'stable' },
  U6RATE:    { name: 'U-6 Underemployment',    cat: 'employment', unit: '%',       freq: 'monthly', good_direction: 'down' },

  // GROWTH
  A191RL1Q225SBEA: { name: 'Real GDP Growth',  cat: 'growth', unit: '%',          freq: 'quarterly', good_direction: 'up' },
  RETAILSMNSA: { name: 'Retail Sales',         cat: 'growth', unit: '$B',          freq: 'monthly', good_direction: 'up' },
  INDPRO:    { name: 'Industrial Production',  cat: 'growth', unit: 'Index',       freq: 'monthly', good_direction: 'up' },
  HOUST:     { name: 'Housing Starts',         cat: 'growth', unit: 'K units',     freq: 'monthly', good_direction: 'stable' },

  // MONETARY / LIQUIDITY
  WALCL:     { name: 'Fed Balance Sheet',      cat: 'liquidity', unit: '$B',       freq: 'weekly',  good_direction: 'up' },
  M2SL:      { name: 'M2 Money Supply',        cat: 'liquidity', unit: '$B',       freq: 'monthly', good_direction: 'up' },
  RRPONTSYD: { name: 'Reverse Repo (RRP)',     cat: 'liquidity', unit: '$B',       freq: 'daily',   good_direction: 'down' },
  WTREGEN:   { name: 'Treasury General Acct',  cat: 'liquidity', unit: '$B',       freq: 'weekly',  good_direction: 'stable' },

  // RATES & CREDIT
  FEDFUNDS:  { name: 'Fed Funds Rate',         cat: 'rates', unit: '%',            freq: 'monthly', good_direction: 'stable' },
  DGS10:     { name: '10Y Treasury Yield',     cat: 'rates', unit: '%',            freq: 'daily',   good_direction: 'stable' },
  DGS2:      { name: '2Y Treasury Yield',      cat: 'rates', unit: '%',            freq: 'daily',   good_direction: 'stable' },
  T10Y2Y:    { name: 'Yield Curve (10Y-2Y)',   cat: 'rates', unit: '%',            freq: 'daily',   good_direction: 'up' },
  BAMLH0A0HYM2: { name: 'HY Credit Spread',   cat: 'rates', unit: '%',            freq: 'daily',   good_direction: 'down' },

  // RATES — additional
  DFII10:         { name: '10Y Real Yield (TIPS)',          cat: 'rates',    unit: '%',    freq: 'daily',   good_direction: 'stable' },
  DGS30:          { name: '30Y Treasury Yield',             cat: 'rates',    unit: '%',    freq: 'daily',   good_direction: 'stable' },
  T10Y3M:         { name: 'Yield Curve (10Y-3M)',           cat: 'rates',    unit: '%',    freq: 'daily',   good_direction: 'up' },
  MORTGAGE30US:   { name: '30Y Fixed Mortgage Rate',        cat: 'rates',    unit: '%',    freq: 'weekly',  good_direction: 'down' },
  BAMLC0A0CM:     { name: 'IG Credit Spread',               cat: 'rates',    unit: '%',    freq: 'daily',   good_direction: 'down' },

  // EMPLOYMENT — additional
  CCSA:           { name: 'Continuing Jobless Claims',      cat: 'employment', unit: 'K', freq: 'weekly',  good_direction: 'down' },
  JTSQUL:         { name: 'Quits Rate',                     cat: 'employment', unit: '%', freq: 'monthly', good_direction: 'up' },
  CES0500000003:  { name: 'Avg Hourly Earnings',            cat: 'employment', unit: '$/hr', freq: 'monthly', good_direction: 'stable' },
  OPHNFB:         { name: 'Nonfarm Business Productivity',  cat: 'employment', unit: '%', freq: 'quarterly', good_direction: 'up' },

  // GROWTH — additional
  PERMIT:         { name: 'Building Permits',               cat: 'growth',   unit: 'K',    freq: 'monthly', good_direction: 'up' },
  PCE:            { name: 'Personal Consumption Expenditures', cat: 'growth', unit: '$B',  freq: 'monthly', good_direction: 'up' },
  DSPIC96:        { name: 'Real Disposable Personal Income', cat: 'growth',  unit: '$B',   freq: 'monthly', good_direction: 'up' },
  BOPGSTB:        { name: 'US Trade Balance',               cat: 'growth',   unit: '$B',   freq: 'monthly', good_direction: 'up' },
  ISRATIO:        { name: 'Inventory to Sales Ratio',        cat: 'growth',   unit: 'ratio', freq: 'monthly', good_direction: 'down' },
  CSUSHPISA:      { name: 'Case-Shiller Home Price Index',  cat: 'growth',   unit: 'Index', freq: 'monthly', good_direction: 'stable' },

  // MONETARY — additional
  WSHOMCG:        { name: 'Fed MBS Holdings',               cat: 'liquidity', unit: '$B', freq: 'weekly',  good_direction: 'stable' },
  TREAST:      { name: 'Fed Treasury Holdings',          cat: 'liquidity', unit: '$B', freq: 'weekly',  good_direction: 'stable' },
  BOGMBASE:       { name: 'Monetary Base',                  cat: 'liquidity', unit: '$B', freq: 'weekly',  good_direction: 'stable' },
  TOTRESNS:       { name: 'Bank Reserves at Fed',           cat: 'liquidity', unit: '$B', freq: 'monthly', good_direction: 'stable' },

  // CONSUMER — additional
  DRCCLACBS:      { name: 'Credit Card Delinquency Rate',   cat: 'consumer', unit: '%',   freq: 'quarterly', good_direction: 'down' },
  DRSFRMACBS:     { name: 'Mortgage Delinquency Rate',      cat: 'consumer', unit: '%',   freq: 'quarterly', good_direction: 'down' },
  REVOLSL:        { name: 'Revolving Consumer Credit',      cat: 'consumer', unit: '$B',  freq: 'monthly', good_direction: 'stable' },
  TOTALSL:        { name: 'Total Consumer Credit',          cat: 'consumer', unit: '$B',  freq: 'monthly', good_direction: 'stable' },

  // SOVEREIGN DEBT — US TREASURY FOREIGN HOLDINGS (TIC Data, monthly, $B)
  FDHBJA:    { name: 'Japan US Treasury Holdings',  cat: 'sovereign', unit: '$B', freq: 'monthly', good_direction: 'up' },
  FDHBCHI:   { name: 'China US Treasury Holdings',  cat: 'sovereign', unit: '$B', freq: 'monthly', good_direction: 'stable' },
  FDHBFIN:   { name: 'Total Foreign UST Holdings',  cat: 'sovereign', unit: '$B', freq: 'monthly', good_direction: 'up' },

  // JAPAN ECONOMY
  DEXJPUS:           { name: 'USD/JPY Exchange Rate',    cat: 'japan', unit: '¥/$',  freq: 'daily',   good_direction: 'stable' },
  IRLTLT01JPM156N:   { name: 'Japan 10Y Bond Yield',     cat: 'japan', unit: '%',    freq: 'monthly', good_direction: 'stable' },
  JPNURQPDS:         { name: 'Japan Unemployment Rate',  cat: 'japan', unit: '%',    freq: 'quarterly', good_direction: 'down' },
  JPNCPIALLMINMEI:   { name: 'Japan CPI',                cat: 'japan', unit: 'Index',freq: 'monthly', good_direction: 'stable' },
  JPNRGDPEXP:        { name: 'Japan Real GDP',            cat: 'japan', unit: '$B',   freq: 'quarterly', good_direction: 'up' },

  // DOLLAR & GLOBAL
  DTWEXBGS:  { name: 'Trade-Weighted Dollar (Broad)', cat: 'dollar', unit: 'Index', freq: 'weekly',  good_direction: 'stable' },
  DEXCHUS:   { name: 'USD/CNY Exchange Rate',         cat: 'dollar', unit: 'CNY/$', freq: 'daily',   good_direction: 'stable' },
  DEXUSEU:   { name: 'USD/EUR Exchange Rate',         cat: 'dollar', unit: '$/EUR', freq: 'daily',   good_direction: 'stable' },
  GOLDAMGBD228NLBM: { name: 'Gold Price (London Fix)', cat: 'dollar', unit: '$/oz', freq: 'daily',   good_direction: 'up' },

  // FISCAL & DEBT
  GFDEBTN:          { name: 'Federal Debt Outstanding',      cat: 'fiscal', unit: '$B',  freq: 'quarterly', good_direction: 'stable' },
  GFDEGDQ188S:      { name: 'Federal Debt to GDP',           cat: 'fiscal', unit: '%',   freq: 'quarterly', good_direction: 'down' },
  FYFSD:            { name: 'Federal Budget Surplus/Deficit', cat: 'fiscal', unit: '$B',  freq: 'annual',    good_direction: 'up' },
  INTGSTUSESM193N:  { name: 'Interest Payments as % GDP',    cat: 'fiscal', unit: '%',   freq: 'monthly',   good_direction: 'down' },

  // CONSUMER
  UMCSENT:   { name: 'Consumer Sentiment',     cat: 'consumer', unit: 'Index',     freq: 'monthly', good_direction: 'up' },
  PSAVERT:   { name: 'Personal Savings Rate',  cat: 'consumer', unit: '%',         freq: 'monthly', good_direction: 'stable' },
};

async function fetchSeries(apiKey, seriesId) {
  try {
    const start = new Date(); start.setMonth(start.getMonth() - 16);
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=420&observation_start=${start.toISOString().slice(0, 10)}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'SPY-Tracker/1.0' } });
    if (!r.ok) {
      let msg = `HTTP ${r.status}`;
      try { msg = (await r.json()).error_message || msg; } catch (e) {}
      return { obs: null, error: msg };
    }
    const data = await r.json();
    const obs = (data.observations || [])
      .filter(o => o.value !== '.' && o.value !== 'NA')
      .map(o => ({ date: o.date, value: parseFloat(o.value) }))
      .reverse();
    return obs.length > 0 ? { obs, error: null } : { obs: null, error: 'no observations' };
  } catch (e) {
    return { obs: null, error: e.message };
  }
}

async function fetchMeta(apiKey, seriesId, kv) {
  const key = `fred:meta:${seriesId}`;
  if (kv) {
    try { const cached = await kv.get(key, 'json'); if (cached) return cached; } catch (e) {}
  }
  try {
    const r = await fetch(`https://api.stlouisfed.org/fred/series?series_id=${seriesId}&api_key=${apiKey}&file_type=json`, { headers: { 'User-Agent': 'SPY-Tracker/1.0' } });
    if (!r.ok) return null;
    const ss = (await r.json()).seriess?.[0];
    if (!ss) return null;
    const meta = { title: ss.title, units: ss.units, units_short: ss.units_short, frequency: ss.frequency_short, seasonal_adjustment: ss.seasonal_adjustment_short, last_updated: ss.last_updated };
    if (kv) { try { await kv.put(key, JSON.stringify(meta), { expirationTtl: 86400 * 30 }); } catch (e) {} }
    return meta;
  } catch (e) {
    return null;
  }
}

function yearAgoObservation(obs, latest, frequency) {
  const target = new Date(latest.date + 'T12:00:00Z'); target.setUTCFullYear(target.getUTCFullYear() - 1);
  const tolDays = { D: 4, W: 4, BW: 8, M: 16, Q: 46, SA: 92, A: 183 }[frequency] ?? 16;
  let best = null, bestGap = Infinity;
  for (const o of obs) {
    const gap = Math.abs(new Date(o.date + 'T12:00:00Z') - target) / 86400000;
    if (gap < bestGap) { best = o; bestGap = gap; }
  }
  return bestGap <= tolDays ? best : null;
}

function calcStats(obs, frequency) {
  if (!obs || obs.length < 2) return null;
  const latest = obs[obs.length - 1];
  const prev   = obs[obs.length - 2];
  const yearAgo = yearAgoObservation(obs, latest, frequency);

  const change     = latest.value - prev.value;
  const changePct  = prev.value !== 0 ? (change / Math.abs(prev.value)) * 100 : null;
  const changeYoy  = yearAgo ? latest.value - yearAgo.value : null;
  const changeYoyPct = yearAgo && yearAgo.value !== 0 ? ((latest.value - yearAgo.value) / Math.abs(yearAgo.value)) * 100 : null;

  // Trend: the last three readings against the series' own typical step size
  const last3 = obs.slice(-3).map(o => o.value);
  let trend = 'flat';
  if (last3.length === 3) {
    const steps = obs.slice(1).map((o, i) => Math.abs(o.value - obs[i].value)).sort((a, b) => a - b);
    const typical = steps.length ? steps[Math.floor(steps.length / 2)] : 0;
    const slope = (last3[2] - last3[0]) / 2;
    if (typical > 0 && slope > 0.5 * typical) trend = 'rising';
    else if (typical > 0 && slope < -0.5 * typical) trend = 'falling';
  }

  return {
    latest: latest.value,
    latest_date: latest.date,
    prev: prev.value,
    change,
    change_pct: changePct,
    change_yoy: changeYoy,
    change_yoy_pct: changeYoyPct,
    year_ago_date: yearAgo ? yearAgo.date : null,
    trend,
    history: obs.slice(-36).map(o => ({ d: o.date.slice(0,7), v: o.value })),
  };
}

// Compute macro regime score
function computeRegime(stats) {
  const scores = [];
  const signals = [];

  // Inflation signal
  const cpi = stats.CPIAUCSL;
  const corePce = stats.PCEPILFE;
  if (corePce) {
    const yoy = corePce.change_yoy_pct;
    if (yoy != null) {
      if (yoy < 2.0) { scores.push(2); signals.push({ label: 'Inflation', val: 'BENIGN', color: '#00ff88', detail: `Core PCE ${yoy.toFixed(1)}% YoY — at or below Fed target` }); }
      else if (yoy < 2.5) { scores.push(1); signals.push({ label: 'Inflation', val: 'MODERATE', color: '#88cc00', detail: `Core PCE ${yoy.toFixed(1)}% YoY — near target, Fed comfortable` }); }
      else if (yoy < 3.5) { scores.push(0); signals.push({ label: 'Inflation', val: 'ELEVATED', color: '#ff8800', detail: `Core PCE ${yoy.toFixed(1)}% YoY — above target, Fed on alert` }); }
      else { scores.push(-2); signals.push({ label: 'Inflation', val: 'HOT', color: '#ff3355', detail: `Core PCE ${yoy.toFixed(1)}% YoY — significantly above target, restrictive policy` }); }
    }
  }

  // Employment signal
  const unrate = stats.UNRATE;
  if (unrate) {
    const rate = unrate.latest;
    const trend = unrate.trend;
    if (rate < 4.0 && trend !== 'rising') { scores.push(2); signals.push({ label: 'Employment', val: 'STRONG', color: '#00ff88', detail: `${rate.toFixed(1)}% unemployment — near full employment` }); }
    else if (rate < 4.5) { scores.push(1); signals.push({ label: 'Employment', val: 'SOLID', color: '#88cc00', detail: `${rate.toFixed(1)}% unemployment — healthy labor market` }); }
    else if (rate < 5.5) { scores.push(0); signals.push({ label: 'Employment', val: 'SOFTENING', color: '#ff8800', detail: `${rate.toFixed(1)}% unemployment — labor market loosening` }); }
    else { scores.push(-2); signals.push({ label: 'Employment', val: 'WEAK', color: '#ff3355', detail: `${rate.toFixed(1)}% unemployment — labor market deteriorating` }); }
  }

  // Yield curve signal
  const curve = stats.T10Y2Y;
  if (curve) {
    const spread = curve.latest;
    if (spread > 0.5) { scores.push(2); signals.push({ label: 'Yield Curve', val: 'NORMAL', color: '#00ff88', detail: `10Y-2Y spread +${spread.toFixed(2)}% — healthy term premium, growth expected` }); }
    else if (spread > 0) { scores.push(1); signals.push({ label: 'Yield Curve', val: 'FLAT', color: '#ffcc00', detail: `10Y-2Y spread +${spread.toFixed(2)}% — flattening, slowing growth signals` }); }
    else if (spread > -0.5) { scores.push(-1); signals.push({ label: 'Yield Curve', val: 'INVERTED', color: '#ff8800', detail: `10Y-2Y spread ${spread.toFixed(2)}% — inverted, historically precedes recession` }); }
    else { scores.push(-2); signals.push({ label: 'Yield Curve', val: 'DEEPLY INVERTED', color: '#ff3355', detail: `10Y-2Y spread ${spread.toFixed(2)}% — deep inversion, strong recession signal` }); }
  }

  // Credit spread signal
  const hy = stats.BAMLH0A0HYM2;
  if (hy) {
    const spread = hy.latest;
    if (spread < 3.5) { scores.push(2); signals.push({ label: 'Credit', val: 'TIGHT', color: '#00ff88', detail: `HY spread ${spread.toFixed(2)}% — markets pricing low default risk` }); }
    else if (spread < 5.0) { scores.push(1); signals.push({ label: 'Credit', val: 'NORMAL', color: '#88cc00', detail: `HY spread ${spread.toFixed(2)}% — normal risk pricing` }); }
    else if (spread < 7.0) { scores.push(-1); signals.push({ label: 'Credit', val: 'WIDE', color: '#ff8800', detail: `HY spread ${spread.toFixed(2)}% — elevated stress in credit markets` }); }
    else { scores.push(-2); signals.push({ label: 'Credit', val: 'DISTRESSED', color: '#ff3355', detail: `HY spread ${spread.toFixed(2)}% — severe credit stress, recession/crisis pricing` }); }
  }

  // Consumer signal
  const sentiment = stats.UMCSENT;
  if (sentiment) {
    const val = sentiment.latest;
    if (val > 90) { scores.push(2); signals.push({ label: 'Consumer', val: 'CONFIDENT', color: '#00ff88', detail: `Michigan Sentiment ${val.toFixed(0)} — consumers optimistic, spending likely strong` }); }
    else if (val > 75) { scores.push(1); signals.push({ label: 'Consumer', val: 'POSITIVE', color: '#88cc00', detail: `Michigan Sentiment ${val.toFixed(0)} — moderate confidence` }); }
    else if (val > 60) { scores.push(0); signals.push({ label: 'Consumer', val: 'CAUTIOUS', color: '#ff8800', detail: `Michigan Sentiment ${val.toFixed(0)} — consumers worried, spending may slow` }); }
    else { scores.push(-2); signals.push({ label: 'Consumer', val: 'PESSIMISTIC', color: '#ff3355', detail: `Michigan Sentiment ${val.toFixed(0)} — recession-era pessimism` }); }
  }

  const total = scores.reduce((a,b) => a+b, 0);
  const max = scores.length * 2;
  const score = max > 0 ? Math.round((total / max) * 100) : 0;

  let regime, color;
  if (score >= 60)      { regime = 'GOLDILOCKS';  color = '#00ff88'; }
  else if (score >= 30) { regime = 'EXPANSION';   color = '#88cc00'; }
  else if (score >= 0)  { regime = 'MIXED';        color = '#ffcc00'; }
  else if (score >= -30){ regime = 'SLOWDOWN';     color = '#ff8800'; }
  else                  { regime = 'CONTRACTION';  color = '#ff3355'; }

  return { score, regime, color, signals };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type' } });
}

export async function onRequestGet(context) {
  const apiKey = context.env?.FRED_API_KEY;
  if (!apiKey) return json({ error: 'FRED_API_KEY not configured' }, 500);

  const seriesIds = Object.keys(SERIES);

  const BATCH = 40;
  const results = {};
  const errors = {};
  const kv = context.env?.GEX_HISTORY;
  const refresh = new URL(context.request.url).searchParams.get('refresh') === '1';
  if (kv && !refresh) {
    try {
      const cached = await kv.get('fred:response', 'json');
      if (cached && cached.fetched_at && Date.now() - cached.fetched_at < 15 * 60 * 1000) return json(cached);
    } catch (e) {}
  }

  for (let i = 0; i < seriesIds.length; i += BATCH) {
    const batch = seriesIds.slice(i, i + BATCH);
    const fetched = await Promise.all(batch.map(id => fetchSeries(apiKey, id)));
    const metas = await Promise.all(batch.map(id => fetchMeta(apiKey, id, kv)));
    batch.forEach((id, j) => {
      const { obs, error } = fetched[j];
      const meta = metas[j] || {};
      if (obs) results[id] = { ...calcStats(obs, meta.frequency || SERIES[id].freq?.[0]?.toUpperCase()), ...SERIES[id], units: meta.units || null, fred_title: meta.title || null, frequency: meta.frequency || null, last_updated: meta.last_updated || null };
      else errors[id] = error;
    });
  }

  const regime = computeRegime(results);
  const seriesCount = Object.keys(results).length;
  const asOf = Object.values(results).map(s => s.latest_date).filter(Boolean).sort().pop() || null;

  const throttled = Object.values(errors).some(e => /429/.test(String(e)));
  const payload = { series: results, regime, seriesCount, errors, throttled, as_of: asOf, fetched_at: Date.now(), updated: new Date().toISOString() };
  if (kv && !throttled && seriesCount > 0) { try { await kv.put('fred:response', JSON.stringify(payload), { expirationTtl: 3600 }); } catch (e) {} }
  return json(payload);
}
