// functions/transition.js — Civilizational Transition Dashboard
// Combines FRED data with hardcoded AI capex trajectory and computed composite indicators
// All indicators are FORWARD-LOOKING composites, not backward-looking measures

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
  'Cache-Control': 'max-age=7200',
};
const json = (d, s=200) => new Response(JSON.stringify(d), { status:s, headers:CORS });

// ─── AI INFRASTRUCTURE CAPEX TRAJECTORY ─────────────────────────────────────
// Sources: Company filings (Amazon, Alphabet, Microsoft, Meta, Oracle, Apple, Broadcom, Nvidia)
// Goldman Sachs Research 2025, RBC Wealth Management, Morgan Stanley Cloud Capex Tracker
// pct_gdp = capex as % of US nominal GDP
const AI_CAPEX_TRAJECTORY = [
  { y: 2015, b: 32,  pct: 0.17 },
  { y: 2016, b: 40,  pct: 0.21 },
  { y: 2017, b: 49,  pct: 0.25 },
  { y: 2018, b: 64,  pct: 0.31 },
  { y: 2019, b: 81,  pct: 0.38 },
  { y: 2020, b: 107, pct: 0.51 },
  { y: 2021, b: 143, pct: 0.63 },
  { y: 2022, b: 172, pct: 0.70 },
  { y: 2023, b: 168, pct: 0.65 },
  { y: 2024, b: 285, pct: 1.05 },
  { y: 2025, b: 427, pct: 1.52, est: true },
  { y: 2026, b: 562, pct: 1.89, est: true },
  { y: 2027, b: 637, pct: 2.02, est: true },
];

// ─── HISTORICAL INFRASTRUCTURE TRANSITIONS ───────────────────────────────────
// Peak capex/GDP, total transition duration, pop characteristics
const HISTORICAL_TRANSITIONS = [
  {
    name: 'Railway Mania',
    period: '1840–1870',
    peak_pct_gdp: 6.0,
    peak_year: 1847,
    pop_year: 1847,
    new_floor_year: 1855,
    survivors: 'Companies owning rail networks (not equipment manufacturers)',
    productivity_lag_years: 8,
    notes: 'Most railway companies failed. The networks themselves survived and transformed commerce.'
  },
  {
    name: 'Electrification Boom',
    period: '1910–1940',
    peak_pct_gdp: 3.2,
    peak_year: 1929,
    pop_year: 1929,
    new_floor_year: 1945,
    survivors: 'GE, Westinghouse — companies that became infrastructure for the electric economy',
    productivity_lag_years: 16,
    notes: 'Policy errors (Smoot-Hawley, Fed tightening) extended the bridge collapse into the Great Depression.'
  },
  {
    name: 'Internet Buildout',
    period: '1995–2005',
    peak_pct_gdp: 1.8,
    peak_year: 2000,
    pop_year: 2000,
    new_floor_year: 2005,
    survivors: 'Amazon, Google — companies that became the intelligence/distribution layer',
    productivity_lag_years: 5,
    notes: 'Cisco lost 80% and never recovered. The infrastructure builders were picked and shovels. The survivors owned the new layer.'
  },
  {
    name: 'AI Infrastructure',
    period: '2020–2030?',
    peak_pct_gdp: null, // building toward estimated 2.5-3%
    peak_year: null,    // est 2026-2027
    pop_year: null,     // est 2027-2030
    new_floor_year: null,
    survivors: 'Companies that own the intelligence layer itself — model weights + distribution at scale',
    productivity_lag_years: null,
    notes: 'Currently ~1.05% of GDP. Railway peak was 6%. We are early in the buildout phase.'
  }
];

// ─── DEBT BRIDGE SCENARIOS ───────────────────────────────────────────────────
// Project US debt/GDP under three AI productivity scenarios
// Base: current debt ~$36.2T, current GDP ~$29.7T (2025)
function computeDebtBridgeScenarios() {
  const currentDebt = 36.2;   // $T
  const currentGDP  = 29.7;   // $T 2025
  const baseGDPGrowth = 0.025; // 2.5% baseline real growth
  const deficitRate = 0.055;   // ~5.5% of GDP deficit annually

  const scenarios = [
    { name: 'Conservative', label: 'AI adds 1.5%/yr', extra: 0.015, color: '#ffcc00' },
    { name: 'Base Case',    label: 'AI adds 3%/yr',   extra: 0.030, color: '#00ccff' },
    { name: 'Bull Case',    label: 'AI adds 6%/yr',   extra: 0.060, color: '#00ff88' },
  ];

  return scenarios.map(s => {
    const points = [];
    let debt = currentDebt;
    let gdp  = currentGDP;
    for (let yr = 2025; yr <= 2040; yr++) {
      const growth = baseGDPGrowth + (yr >= 2027 ? s.extra : s.extra * 0.3); // productivity lag
      gdp  = gdp * (1 + growth);
      debt = debt + gdp * deficitRate * (1 - growth * 2); // growth reduces deficit
      points.push({ y: yr, debt_gdp: Math.round((debt/gdp)*100*10)/10 });
    }
    return { ...s, points };
  });
}

// ─── FRED FETCH ───────────────────────────────────────────────────────────────
async function fetchFRED(apiKey, seriesId, limit=20) {
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'SPY-Tracker/1.0' } });
    if (!r.ok) return null;
    const data = await r.json();
    return (data.observations||[])
      .filter(o => o.value !== '.' && o.value !== 'NA')
      .map(o => ({ d: o.date, v: parseFloat(o.value) }))
      .reverse();
  } catch(e) { return null; }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type' } });
}

export async function onRequestGet(context) {
  const apiKey = context.env?.FRED_API_KEY;
  if (!apiKey) return json({ error: 'FRED_API_KEY not configured' }, 500);

  // Fetch all FRED series in parallel
  const [
    productivity,      // nonfarm business output per hour
    productivityInfo,  // information sector productivity
    unitLaborCosts,    // unit labor costs - falling = AI doing work
    softwareInvest,    // private software investment
    rdInvest,          // R&D investment
    privNonresInvest,  // total private nonresidential fixed investment
    infoEmploy,        // information sector employment
    profServEmploy,    // professional services employment
    totalEmploy,       // total nonfarm employment
    debtGDP,           // federal debt as % of GDP
    corpProfits,       // corporate profits after tax
    laborShare,        // labor share of income (falling = capital replacing labor)
    tfpGrowth,         // total factor productivity
    outputPerWorker,   // business sector output per worker
  ] = await Promise.all([
    fetchFRED(apiKey, 'PRS85006092', 24),  // Nonfarm productivity
    fetchFRED(apiKey, 'PRS88006092', 16),  // Nonfinancial corporate productivity
    fetchFRED(apiKey, 'ULCNFB', 24),       // Unit labor costs nonfarm business
    fetchFRED(apiKey, 'Y033RC1Q027SBEA', 20), // Software investment
    fetchFRED(apiKey, 'Y054RC1Q027SBEA', 20), // R&D investment
    fetchFRED(apiKey, 'PNFIQ', 20),        // Private nonresidential fixed investment
    fetchFRED(apiKey, 'CEU5000000001', 36), // Information employment (thousands)
    fetchFRED(apiKey, 'CEU6000000001', 36), // Professional services employment
    fetchFRED(apiKey, 'PAYEMS', 36),        // Total nonfarm employment
    fetchFRED(apiKey, 'GFDEGDQ188S', 20),  // Federal debt % of GDP
    fetchFRED(apiKey, 'CP', 24),            // Corporate profits after tax
    fetchFRED(apiKey, 'PRS85006151', 20),  // Labor share of output - nonfarm business
    fetchFRED(apiKey, 'PRS85006092', 8),   // Nonfarm productivity (dupe for trend calc)
    fetchFRED(apiKey, 'PRS84006162', 20),  // Output per worker
  ]);

  // ── LABOR SUBSTITUTION RATE ────────────────────────────────────────────────
  // Key signal: output growing faster than hours worked = something else doing the work
  // Computed as rolling output growth / hours growth in information sector
  let laborSubstitutionRate = null;
  let laborSubstitutionTrend = 'unknown';
  if (productivity && productivity.length >= 8) {
    const recent = productivity.slice(-8);
    const first  = recent[0].v, last = recent[recent.length-1].v;
    const prodGrowth = ((last - first) / first) * 100;
    laborSubstitutionRate = prodGrowth;
    laborSubstitutionTrend = prodGrowth > 8 ? 'accelerating' : prodGrowth > 3 ? 'emerging' : 'early';
  }

  // ── CAPITAL FORMATION QUALITY ──────────────────────────────────────────────
  // Software + R&D as share of total private investment = productive vs consumptive
  let capitalQualityPct = null;
  if (softwareInvest && rdInvest && privNonresInvest) {
    const sw = softwareInvest[softwareInvest.length-1]?.v || 0;
    const rd = rdInvest[rdInvest.length-1]?.v || 0;
    const tot = privNonresInvest[privNonresInvest.length-1]?.v || 1;
    capitalQualityPct = Math.round(((sw + rd) / tot) * 100 * 10) / 10;
  }

  // ── LABOR SHARE DECLINE RATE ───────────────────────────────────────────────
  // Falling labor share = capital (AI) replacing labor = transition signal
  let laborShareData = null;
  if (laborShare && laborShare.length >= 2) {
    const latest = laborShare[laborShare.length-1];
    const fiveYearsAgo = laborShare[Math.max(0, laborShare.length-21)];
    laborShareData = {
      current: latest.v,
      date: latest.d,
      change_5yr: latest.v - fiveYearsAgo.v,
      history: laborShare.slice(-20).map(p => ({ d: p.d.slice(0,7), v: p.v }))
    };
  }

  // ── PRODUCTIVITY ACCELERATION SIGNAL ──────────────────────────────────────
  // Compare recent productivity growth to long-run average (2.2% 1950-1999)
  let productivitySignal = null;
  if (productivity && productivity.length >= 4) {
    const recent4 = productivity.slice(-4);
    const avgRecent = recent4.reduce((a,b) => a+b.v, 0) / recent4.length;
    const longRunAvg = 2.2; // 1950-1999 average
    productivitySignal = {
      recent_avg: Math.round(avgRecent * 10) / 10,
      vs_longrun: Math.round((avgRecent - longRunAvg) * 10) / 10,
      solow_resolved: avgRecent > longRunAvg * 1.5,
      history: productivity.slice(-16).map(p => ({ d: p.d.slice(0,7), v: p.v }))
    };
  }

  // ── UNIT LABOR COST SIGNAL ─────────────────────────────────────────────────
  // Falling ULC with rising output = AI doing the marginal work
  let ulcSignal = null;
  if (unitLaborCosts && unitLaborCosts.length >= 2) {
    const latest = unitLaborCosts[unitLaborCosts.length-1];
    const prev   = unitLaborCosts[unitLaborCosts.length-5] || unitLaborCosts[0];
    ulcSignal = {
      current: latest.v,
      change: latest.v - prev.v,
      trend: latest.v < prev.v ? 'falling' : 'rising',
      date: latest.d,
      history: unitLaborCosts.slice(-16).map(p => ({ d: p.d.slice(0,7), v: p.v }))
    };
  }

  // ── KNOWLEDGE SECTOR EMPLOYMENT DISPLACEMENT ──────────────────────────────
  // Information sector: should OUTPUT rise while EMPLOYMENT falls
  let displacementSignal = null;
  if (infoEmploy && infoEmploy.length >= 12) {
    const latest = infoEmploy[infoEmploy.length-1];
    const yearAgo = infoEmploy[infoEmploy.length-13] || infoEmploy[0];
    const peak = Math.max(...infoEmploy.map(p => p.v));
    displacementSignal = {
      current: latest.v,
      yoy_change: latest.v - yearAgo.v,
      yoy_pct: ((latest.v - yearAgo.v) / yearAgo.v) * 100,
      pct_below_peak: ((peak - latest.v) / peak) * 100,
      peak,
      date: latest.d,
      history: infoEmploy.slice(-24).map(p => ({ d: p.d.slice(0,7), v: p.v }))
    };
  }

  // ── DEBT BRIDGE SCENARIOS ─────────────────────────────────────────────────
  const debtScenarios = computeDebtBridgeScenarios();
  let currentDebtGDP = null;
  if (debtGDP && debtGDP.length > 0) {
    currentDebtGDP = debtGDP[debtGDP.length-1];
  }

  // ── BRIDGE PHASE SCORE (0-100) ────────────────────────────────────────────
  // 0-30: Early bridge | 30-60: Mid bridge (building) | 60-80: Late bridge
  // 80-95: Pre-pop (infrastructure sufficient, survivors hardening)
  // 95-100: The pop (transformation visible, field narrowing)
  let bridgeScore = 35; // default: mid bridge
  const scoreFactors = [];

  // Factor 1: Capex trajectory (where are we relative to historical peaks?)
  const latestCapexPct = AI_CAPEX_TRAJECTORY.filter(d => !d.est).slice(-1)[0]?.pct || 1.05;
  const railwayPeak = 6.0, internetPeak = 1.8;
  const capexProgress = (latestCapexPct / internetPeak) * 100; // vs internet analog
  if (capexProgress > 80) { bridgeScore += 15; scoreFactors.push({ f: 'Capex vs Internet Peak', v: capexProgress.toFixed(0)+'%', signal: 'LATE BRIDGE' }); }
  else if (capexProgress > 50) { bridgeScore += 8; scoreFactors.push({ f: 'Capex vs Internet Peak', v: capexProgress.toFixed(0)+'%', signal: 'MID BRIDGE' }); }
  else { scoreFactors.push({ f: 'Capex vs Internet Peak', v: capexProgress.toFixed(0)+'%', signal: 'EARLY BRIDGE' }); }

  // Factor 2: Productivity acceleration signal
  if (productivitySignal) {
    if (productivitySignal.solow_resolved) { bridgeScore += 20; scoreFactors.push({ f: 'Productivity Acceleration', v: productivitySignal.recent_avg+'%', signal: 'SOLOW RESOLVING' }); }
    else if (productivitySignal.vs_longrun > 0) { bridgeScore += 8; scoreFactors.push({ f: 'Productivity Acceleration', v: '+'+productivitySignal.vs_longrun+'pp above avg', signal: 'EMERGING' }); }
    else { scoreFactors.push({ f: 'Productivity Acceleration', v: productivitySignal.vs_longrun+'pp vs avg', signal: 'NOT YET VISIBLE' }); }
  }

  // Factor 3: Labor substitution
  if (laborSubstitutionRate !== null) {
    if (laborSubstitutionRate > 10) { bridgeScore += 15; scoreFactors.push({ f: 'Labor Substitution Rate', v: laborSubstitutionRate.toFixed(1)+'%', signal: 'ACCELERATING' }); }
    else if (laborSubstitutionRate > 4) { bridgeScore += 5; scoreFactors.push({ f: 'Labor Substitution Rate', v: laborSubstitutionRate.toFixed(1)+'%', signal: 'EMERGING' }); }
    else { scoreFactors.push({ f: 'Labor Substitution Rate', v: laborSubstitutionRate.toFixed(1)+'%', signal: 'EARLY' }); }
  }

  // Factor 4: ULC signal
  if (ulcSignal) {
    if (ulcSignal.trend === 'falling') { bridgeScore += 8; scoreFactors.push({ f: 'Unit Labor Costs', v: ulcSignal.current.toFixed(1), signal: 'FALLING — AI LEVERAGE' }); }
    else { scoreFactors.push({ f: 'Unit Labor Costs', v: ulcSignal.current.toFixed(1), signal: 'RISING — HUMAN ECONOMY' }); }
  }

  bridgeScore = Math.min(95, Math.max(5, bridgeScore));

  // ── OUTCOME PROBABILITIES ─────────────────────────────────────────────────
  // Based on bridge score and macro conditions
  const outcomes = computeOutcomeProbabilities(bridgeScore, productivitySignal, ulcSignal);

  return json({
    // Core composites
    bridge_score: bridgeScore,
    score_factors: scoreFactors,
    outcomes,

    // Labor & productivity
    labor_substitution_rate: laborSubstitutionRate,
    labor_substitution_trend: laborSubstitutionTrend,
    productivity_signal: productivitySignal,
    ulc_signal: ulcSignal,
    labor_share: laborShareData,
    displacement_signal: displacementSignal,

    // Capital formation
    capital_quality_pct: capitalQualityPct,
    software_invest: softwareInvest ? { latest: softwareInvest.slice(-1)[0], history: softwareInvest.slice(-16).map(p=>({d:p.d.slice(0,7),v:p.v})) } : null,

    // Debt bridge
    debt_gdp_current: currentDebtGDP,
    debt_scenarios: debtScenarios,

    // Reference data
    ai_capex: AI_CAPEX_TRAJECTORY,
    historical_transitions: HISTORICAL_TRANSITIONS,

    updated: new Date().toISOString()
  });
}

function computeOutcomeProbabilities(bridgeScore, prodSignal, ulcSignal) {
  // Derive outcome probabilities from composite signals
  // These are model outputs, not forecasts
  let arrival = 25, bridgeCollapse = 20, falseDawn = 25, darkArrival = 15, infiniteBridge = 15;

  if (bridgeScore > 60) { arrival += 15; infiniteBridge -= 10; }
  if (bridgeScore < 30) { bridgeCollapse += 10; arrival -= 10; }
  if (prodSignal?.solow_resolved) { arrival += 20; falseDawn -= 10; infiniteBridge -= 10; }
  if (ulcSignal?.trend === 'falling') { arrival += 5; darkArrival += 5; }

  // Normalize to 100
  const total = arrival + bridgeCollapse + falseDawn + darkArrival + infiniteBridge;
  const scale = 100 / total;

  return {
    arrival:          Math.round(arrival * scale),
    bridge_collapse:  Math.round(bridgeCollapse * scale),
    false_dawn:       Math.round(falseDawn * scale),
    dark_arrival:     Math.round(darkArrival * scale),
    infinite_bridge:  Math.round(infiniteBridge * scale),
  };
}
