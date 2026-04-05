// functions/fred.js
// Fetches macro data from FRED API for the macro dashboard tab
// FRED_API_KEY must be set in Cloudflare Pages environment variables

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
  'Cache-Control': 'max-age=3600', // cache 1hr - FRED data updates daily/weekly
};

const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: CORS });

// FRED series definitions with metadata
const SERIES = {
  // INFLATION
  CPIAUCSL:  { name: 'CPI (All Items)',        cat: 'inflation', unit: 'Index',    freq: 'monthly', good_direction: 'down' },
  CPILFESL:  { name: 'Core CPI (ex Food/Energy)', cat: 'inflation', unit: 'Index', freq: 'monthly', good_direction: 'down' },
  PCEPI:     { name: 'PCE Price Index',        cat: 'inflation', unit: 'Index',    freq: 'monthly', good_direction: 'down' },
  PCEPILFE:  { name: 'Core PCE (Fed target)',  cat: 'inflation', unit: 'Index',    freq: 'monthly', good_direction: 'down' },
  T10YIE:    { name: '10Y Breakeven Inflation',cat: 'inflation', unit: '%',        freq: 'daily',   good_direction: 'stable' },

  // EMPLOYMENT
  UNRATE:    { name: 'Unemployment Rate',      cat: 'employment', unit: '%',       freq: 'monthly', good_direction: 'down' },
  PAYEMS:    { name: 'Nonfarm Payrolls',        cat: 'employment', unit: 'K jobs',  freq: 'monthly', good_direction: 'up' },
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

  // CONSUMER
  UMCSENT:   { name: 'Consumer Sentiment',     cat: 'consumer', unit: 'Index',     freq: 'monthly', good_direction: 'up' },
  PSAVERT:   { name: 'Personal Savings Rate',  cat: 'consumer', unit: '%',         freq: 'monthly', good_direction: 'stable' },
};

async function fetchSeries(apiKey, seriesId, limit = 48) {
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}&observation_start=2020-01-01`;
    const r = await fetch(url, { headers: { 'User-Agent': 'SPY-Tracker/1.0' } });
    if (!r.ok) return null;
    const data = await r.json();
    const obs = (data.observations || [])
      .filter(o => o.value !== '.' && o.value !== 'NA')
      .map(o => ({ date: o.date, value: parseFloat(o.value) }))
      .reverse(); // oldest first for charting
    return obs.length > 0 ? obs : null;
  } catch(e) {
    return null;
  }
}

function calcStats(obs) {
  if (!obs || obs.length < 2) return null;
  const latest = obs[obs.length - 1];
  const prev   = obs[obs.length - 2];
  const yearAgo = obs.find(o => {
    const d = new Date(o.date);
    const ld = new Date(latest.date);
    return Math.abs(d.getFullYear() - ld.getFullYear()) === 1 &&
           Math.abs(d.getMonth() - ld.getMonth()) <= 1;
  }) || obs[0];

  const change     = latest.value - prev.value;
  const changePct  = prev.value !== 0 ? (change / Math.abs(prev.value)) * 100 : null;
  const changeYoy  = yearAgo ? latest.value - yearAgo.value : null;
  const changeYoyPct = yearAgo && yearAgo.value !== 0 ? ((latest.value - yearAgo.value) / Math.abs(yearAgo.value)) * 100 : null;

  // Trend: compare last 3 readings
  const last3 = obs.slice(-3).map(o => o.value);
  let trend = 'flat';
  if (last3.length === 3) {
    const slope = (last3[2] - last3[0]) / 2;
    if (slope > 0.1) trend = 'rising';
    else if (slope < -0.1) trend = 'falling';
  }

  return {
    latest: latest.value,
    latest_date: latest.date,
    prev: prev.value,
    change,
    change_pct: changePct,
    change_yoy: changeYoy,
    change_yoy_pct: changeYoyPct,
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

  // Fetch all series in parallel (batched to avoid rate limits)
  const seriesIds = Object.keys(SERIES);
  const results = {};

  const batches = [];
  for (let i = 0; i < seriesIds.length; i += 5) {
    batches.push(seriesIds.slice(i, i + 5));
  }

  for (const batch of batches) {
    const fetched = await Promise.all(batch.map(id => fetchSeries(apiKey, id, 36)));
    batch.forEach((id, i) => {
      const obs = fetched[i];
      if (obs) {
        results[id] = { ...calcStats(obs), ...SERIES[id] };
      }
    });
  }

  const regime = computeRegime(results);

  return json({ series: results, regime, updated: new Date().toISOString() });
}
