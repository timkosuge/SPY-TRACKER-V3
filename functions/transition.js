/**
 * TRANSITION TAB — SPY TRACKER V3
 * Civilizational Transition Dashboard
 * All data: FRED public CSV (aggregates BLS, BEA, Federal Reserve Board)
 * No API key required. Fetches fresh on every tab open.
 */

// ─── AI CAPEX TRAJECTORY ─────────────────────────────────────────────────────
// Sources: Company filings (Amazon, Alphabet, Microsoft, Meta, Nvidia, Oracle, Apple, Broadcom)
// Goldman Sachs Research 2025, RBC Wealth Management, Morgan Stanley Cloud Capex Tracker
const AI_CAPEX = [
  { y:2015, b:32,  pct:0.17 }, { y:2016, b:40,  pct:0.21 },
  { y:2017, b:49,  pct:0.25 }, { y:2018, b:64,  pct:0.31 },
  { y:2019, b:81,  pct:0.38 }, { y:2020, b:107, pct:0.51 },
  { y:2021, b:143, pct:0.63 }, { y:2022, b:172, pct:0.70 },
  { y:2023, b:168, pct:0.65 }, { y:2024, b:285, pct:1.05 },
  { y:2025, b:427, pct:1.52, est:true },
  { y:2026, b:562, pct:1.89, est:true },
  { y:2027, b:637, pct:2.02, est:true },
];

// ─── HISTORICAL TRANSITIONS ───────────────────────────────────────────────────
const HIST_TRANSITIONS = [
  {
    name:'Railway Mania', period:'1840–1870', peak_pct_gdp:6.0,
    survivors:'Companies owning the actual rail networks (not equipment manufacturers)',
    notes:'Most railway companies failed. The networks themselves survived and transformed commerce. Infrastructure builders were wiped out; infrastructure owners thrived.',
  },
  {
    name:'Electrification Boom', period:'1910–1940', peak_pct_gdp:3.2,
    survivors:'GE, Westinghouse — companies that became infrastructure for the electric economy',
    notes:'Policy errors (Smoot-Hawley, Fed tightening) extended the bridge collapse into the Great Depression. The technology was real. The financing structure broke first.',
  },
  {
    name:'Internet Buildout', period:'1995–2005', peak_pct_gdp:1.8,
    survivors:'Amazon, Google — companies that became the intelligence/distribution layer',
    notes:'Cisco lost 80% and never recovered. The infrastructure builders were picks and shovels. The survivors owned the new layer the economy ran on top of.',
  },
  {
    name:'AI Infrastructure', period:'2020–2030?', peak_pct_gdp:null,
    survivors:'Companies that own the intelligence layer itself — model weights + distribution at scale',
    notes:'Currently ~1.05% of GDP. Railway peak was 6%. We are early in the buildout phase. Analyst estimates have undershot actual spending by 30%+ for two consecutive years.',
  }
];

// ─── DEBT BRIDGE SCENARIOS ────────────────────────────────────────────────────
function computeDebtBridgeScenarios() {
  const currentDebt = 36.2, currentGDP = 29.7;
  const baseGrowth = 0.025, deficitRate = 0.055;
  const scenarios = [
    { name:'Conservative', label:'AI adds 1.5%/yr', extra:0.015, color:'#ffcc00' },
    { name:'Base Case',    label:'AI adds 3%/yr',   extra:0.030, color:'#00ccff' },
    { name:'Bull Case',    label:'AI adds 6%/yr',   extra:0.060, color:'#00ff88' },
  ];
  return scenarios.map(s => {
    const points = [];
    let debt = currentDebt, gdp = currentGDP;
    for (let yr = 2025; yr <= 2040; yr++) {
      const growth = baseGrowth + (yr >= 2027 ? s.extra : s.extra * 0.3);
      gdp  = gdp * (1 + growth);
      debt = debt + gdp * deficitRate * (1 - growth * 2);
      points.push({ y:yr, debt_gdp: Math.round((debt/gdp)*100*10)/10 });
    }
    return { ...s, points };
  });
}

// ─── OUTCOME PROBABILITIES ────────────────────────────────────────────────────
function computeOutcomes(bridgeScore, prodSignal, ulcSignal) {
  let arrival = 25, collapse = 20, falseDawn = 25, darkArrival = 15, infinite = 15;
  if (bridgeScore > 60) { arrival += 15; infinite -= 10; }
  if (bridgeScore < 30) { collapse += 10; arrival -= 10; }
  if (prodSignal && prodSignal.solow_resolved) { arrival += 20; falseDawn -= 10; infinite -= 10; }
  if (ulcSignal && ulcSignal.trend === 'falling') { arrival += 5; darkArrival += 5; }
  const total = arrival + collapse + falseDawn + darkArrival + infinite;
  const sc = 100 / total;
  return {
    arrival:         Math.round(arrival * sc),
    bridge_collapse: Math.round(collapse * sc),
    false_dawn:      Math.round(falseDawn * sc),
    dark_arrival:    Math.round(darkArrival * sc),
    infinite_bridge: Math.round(infinite * sc),
  };
}

// ─── FRED CSV FETCH (no API key) ──────────────────────────────────────────────
async function fetchFREDcsv(seriesId, limit) {
  try {
    const url = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=' + seriesId;
    const r = await fetch(url, { headers:{ 'User-Agent':'Mozilla/5.0', Accept:'text/csv' } });
    if (!r.ok) return null;
    const text = await r.text();
    const lines = text.trim().split('\n').filter(function(l){ return !l.startsWith('DATE') && l.includes(','); });
    return lines.slice(-limit).map(function(l) {
      var parts = l.split(',');
      var date = parts[0] ? parts[0].trim() : '';
      var val  = parts[1] ? parts[1].trim() : '';
      return { d: date.slice(0,7), v: (val === '.' || val === '' || val == null) ? null : parseFloat(val) };
    }).filter(function(p){ return p.v != null; });
  } catch(e) { return null; }
}

// ─── BRIDGE SCORE ─────────────────────────────────────────────────────────────
function computeBridgeScore(prodSignal, ulcSignal, laborSubRate, capQuality) {
  var score = 35;
  var factors = [];

  // Factor 1: capex vs internet peak (1.8% GDP)
  var latestCapex = 1.05;
  for (var i = AI_CAPEX.length - 1; i >= 0; i--) {
    if (!AI_CAPEX[i].est) { latestCapex = AI_CAPEX[i].pct; break; }
  }
  var capexProgress = (latestCapex / 1.8) * 100;
  if (capexProgress > 80) { score += 15; factors.push({ f:'Capex vs Internet Peak', v:capexProgress.toFixed(0)+'%', signal:'LATE BRIDGE' }); }
  else if (capexProgress > 50) { score += 8; factors.push({ f:'Capex vs Internet Peak', v:capexProgress.toFixed(0)+'%', signal:'MID BRIDGE' }); }
  else { factors.push({ f:'Capex vs Internet Peak', v:capexProgress.toFixed(0)+'%', signal:'EARLY BRIDGE' }); }

  // Factor 2: productivity acceleration
  if (prodSignal) {
    if (prodSignal.solow_resolved) { score += 20; factors.push({ f:'Productivity Acceleration', v:prodSignal.recent_avg+'%', signal:'SOLOW RESOLVING' }); }
    else if (prodSignal.vs_longrun > 0) { score += 8; factors.push({ f:'Productivity Acceleration', v:'+'+prodSignal.vs_longrun+'pp above avg', signal:'EMERGING' }); }
    else { factors.push({ f:'Productivity Acceleration', v:prodSignal.vs_longrun+'pp vs avg', signal:'NOT YET VISIBLE' }); }
  }

  // Factor 3: labor substitution rate
  if (laborSubRate != null) {
    if (laborSubRate > 10) { score += 15; factors.push({ f:'Labor Substitution Rate', v:laborSubRate.toFixed(1)+'%', signal:'ACCELERATING' }); }
    else if (laborSubRate > 4) { score += 5; factors.push({ f:'Labor Substitution Rate', v:laborSubRate.toFixed(1)+'%', signal:'EMERGING' }); }
    else { factors.push({ f:'Labor Substitution Rate', v:laborSubRate.toFixed(1)+'%', signal:'EARLY' }); }
  }

  // Factor 4: unit labor costs
  if (ulcSignal) {
    if (ulcSignal.trend === 'falling') { score += 8; factors.push({ f:'Unit Labor Costs', v:(ulcSignal.current||0).toFixed(1), signal:'FALLING — AI LEVERAGE' }); }
    else { factors.push({ f:'Unit Labor Costs', v:(ulcSignal.current||0).toFixed(1), signal:'RISING — HUMAN ECONOMY' }); }
  }

  // Factor 5: capital quality (software share of investment)
  if (capQuality != null) {
    if (capQuality > 40) { score += 5; factors.push({ f:'Capital Quality (SW %)', v:capQuality.toFixed(1)+'%', signal:'HIGH — PRODUCTIVE INVESTMENT' }); }
    else { factors.push({ f:'Capital Quality (SW %)', v:capQuality.toFixed(1)+'%', signal:'MODERATE' }); }
  }

  return { score: Math.min(95, Math.max(5, score)), factors: factors };
}

// ─── STATE ────────────────────────────────────────────────────────────────────
var _transitionData = null;
var _transitionLoading = false;

// ─── MAIN ENTRY ───────────────────────────────────────────────────────────────
async function renderTransition() {
  var el = document.getElementById('transitionContent');
  if (!el) return;
  if (_transitionLoading) return;
  if (_transitionData) { _renderTransitionHTML(_transitionData); return; }

  _transitionLoading = true;
  el.innerHTML = '<div style="padding:60px;text-align:center;">'
    + '<div style="font-family:\'Orbitron\',monospace;font-size:10px;letter-spacing:3px;color:#8855ff;margin-bottom:12px;">⬡ LOADING TRANSITION DATA</div>'
    + '<div style="font-size:12px;color:var(--text3);">Fetching live data from FRED (BLS · BEA · Federal Reserve Board)...</div>'
    + '</div>';

  try {
    var results = await Promise.all([
      fetchFREDcsv('PRS85006092', 24),   // nonfarm productivity YoY%
      fetchFREDcsv('ULCNFB', 24),        // unit labor costs
      fetchFREDcsv('CEU5000000001', 36), // information sector employment
      fetchFREDcsv('PRS85006151', 24),   // labor share of output
      fetchFREDcsv('GFDEGDQ188S', 20),   // federal debt % GDP
      fetchFREDcsv('Y033RC1Q027SBEA', 20), // private software investment
      fetchFREDcsv('PNFIQ', 20),         // total private nonresidential fixed investment
    ]);

    var productivity     = results[0];
    var unitLaborCosts   = results[1];
    var infoEmploy       = results[2];
    var laborShare       = results[3];
    var debtGDP          = results[4];
    var softwareInvest   = results[5];
    var privNonresInvest = results[6];

    // Productivity signal
    var prodSignal = null;
    if (productivity && productivity.length >= 4) {
      var recent4 = productivity.slice(-4);
      var avg = recent4.reduce(function(a,b){ return a+b.v; }, 0) / recent4.length;
      var longRunAvg = 2.2;
      prodSignal = {
        recent_avg:     Math.round(avg * 10) / 10,
        vs_longrun:     Math.round((avg - longRunAvg) * 10) / 10,
        solow_resolved: avg > longRunAvg * 1.5,
        history:        productivity.slice(-16),
      };
    }

    // Unit labor costs
    var ulcSignal = null;
    if (unitLaborCosts && unitLaborCosts.length >= 2) {
      var ulcLatest = unitLaborCosts[unitLaborCosts.length - 1];
      var ulcPrev   = unitLaborCosts[Math.max(0, unitLaborCosts.length - 5)];
      ulcSignal = {
        current: ulcLatest.v,
        change:  ulcLatest.v - ulcPrev.v,
        trend:   ulcLatest.v < ulcPrev.v ? 'falling' : 'rising',
        date:    ulcLatest.d,
        history: unitLaborCosts.slice(-16),
      };
    }

    // Info sector displacement
    var dispSignal = null;
    if (infoEmploy && infoEmploy.length >= 12) {
      var ieLatest  = infoEmploy[infoEmploy.length - 1];
      var ieYearAgo = infoEmploy[infoEmploy.length - 13] || infoEmploy[0];
      var iePeak    = Math.max.apply(null, infoEmploy.map(function(p){ return p.v; }));
      dispSignal = {
        current:        ieLatest.v,
        yoy_change:     ieLatest.v - ieYearAgo.v,
        yoy_pct:        ((ieLatest.v - ieYearAgo.v) / ieYearAgo.v) * 100,
        pct_below_peak: ((iePeak - ieLatest.v) / iePeak) * 100,
        peak: iePeak, date: ieLatest.d,
        history: infoEmploy.slice(-24),
      };
    }

    // Labor share
    var laborShareData = null;
    if (laborShare && laborShare.length >= 2) {
      var lsLatest     = laborShare[laborShare.length - 1];
      var lsFiveYrsAgo = laborShare[Math.max(0, laborShare.length - 21)];
      laborShareData = {
        current:    lsLatest.v,
        date:       lsLatest.d,
        change_5yr: lsLatest.v - lsFiveYrsAgo.v,
        history:    laborShare.slice(-20),
      };
    }

    // Labor substitution rate
    var laborSubRate = null;
    if (productivity && productivity.length >= 8) {
      var pRecent = productivity.slice(-8);
      laborSubRate = ((pRecent[pRecent.length-1].v - pRecent[0].v) / Math.abs(pRecent[0].v || 1)) * 100;
    }

    // Capital quality
    var capQuality = null;
    if (softwareInvest && privNonresInvest && privNonresInvest.length && softwareInvest.length) {
      var sw  = softwareInvest[softwareInvest.length - 1].v || 0;
      var tot = privNonresInvest[privNonresInvest.length - 1].v || 1;
      capQuality = Math.round((sw / tot) * 100 * 10) / 10;
    }

    var currentDebtGDP = debtGDP ? debtGDP[debtGDP.length - 1] : null;

    var bridgeResult = computeBridgeScore(prodSignal, ulcSignal, laborSubRate, capQuality);
    var outcomes     = computeOutcomes(bridgeResult.score, prodSignal, ulcSignal);
    var debtScenarios = computeDebtBridgeScenarios();

    _transitionData = {
      bridge_score:        bridgeResult.score,
      score_factors:       bridgeResult.factors,
      outcomes:            outcomes,
      productivity_signal: prodSignal,
      ulc_signal:          ulcSignal,
      displacement_signal: dispSignal,
      labor_share:         laborShareData,
      debt_gdp_current:    currentDebtGDP,
      debt_scenarios:      debtScenarios,
      ai_capex:            AI_CAPEX,
      historical_transitions: HIST_TRANSITIONS,
      updated:             new Date().toISOString(),
    };

    _transitionLoading = false;
    _renderTransitionHTML(_transitionData);
  } catch(e) {
    _transitionLoading = false;
    el.innerHTML = '<div style="padding:40px;text-align:center;color:#ff3355;">'
      + '<div style="font-family:\'Orbitron\',monospace;font-size:10px;margin-bottom:8px;">DATA UNAVAILABLE</div>'
      + '<div style="font-size:12px;color:var(--text3);">' + e.message + '</div>'
      + '</div>';
  }
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
function _renderTransitionHTML(data) {
  var el = document.getElementById('transitionContent');
  if (!el || !data) return;

  var score     = data.bridge_score || 35;
  var outcomes  = data.outcomes || {};
  var prod      = data.productivity_signal || {};
  var ulc       = data.ulc_signal || {};
  var disp      = data.displacement_signal || {};
  var ls        = data.labor_share || {};
  var capex     = data.ai_capex || [];
  var hist      = data.historical_transitions || [];
  var debtScens = data.debt_scenarios || [];

  var fmt1 = function(v) { return v == null ? '—' : Number(v).toFixed(1); };

  // Phase
  var phase = score >= 95 ? { label:'THE POP',      sub:'Transformation becoming visible. Field narrowing.',                    color:'#ff3355', glow:'rgba(255,51,85,0.3)' }
    : score >= 80 ?          { label:'PRE-POP',      sub:'Infrastructure sufficient. Survivors hardening.',                      color:'#ff8800', glow:'rgba(255,136,0,0.3)' }
    : score >= 60 ?          { label:'LATE BRIDGE',  sub:'Productivity beginning to show. Concentration narrowing.',             color:'#ffcc00', glow:'rgba(255,204,0,0.3)' }
    : score >= 30 ?          { label:'MID BRIDGE',   sub:'Building at scale. Transformation not yet visible in aggregate data.', color:'#00ccff', glow:'rgba(0,204,255,0.3)' }
    :                        { label:'EARLY BRIDGE', sub:'Infrastructure deployment underway. Long runway ahead.',               color:'#8855ff', glow:'rgba(136,85,255,0.3)' };

  var outColors = {
    arrival:         { label:'ARRIVAL',         color:'#00ff88', desc:'Transformation completes. Bridge holds. Pop is clean.' },
    bridge_collapse: { label:'BRIDGE COLLAPSE', color:'#ff3355', desc:'Funding breaks before transformation completes. 1929 scenario.' },
    false_dawn:      { label:'FALSE DAWN',      color:'#ff8800', desc:'Partial transformation. Not enough to justify debt carried.' },
    dark_arrival:    { label:'DARK ARRIVAL',    color:'#ffcc00', desc:'Transformation succeeds. Distributional failure fractures society.' },
    infinite_bridge: { label:'INFINITE BRIDGE', color:'#8855ff', desc:'Bubble self-sustains indefinitely. Transformation always almost here.' },
  };

  // Mini sparkline
  var miniChart = function(history, color, h) {
    h = h || 60;
    if (!history || history.length < 2) return '';
    var vals = history.map(function(p){ return p.v; }).filter(function(v){ return v != null; });
    if (vals.length < 2) return '';
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var range = max - min || Math.abs(min)*0.1 || 1;
    var W = 300, H = h, P = 3;
    var x = function(i){ return P + (i/(vals.length-1))*(W-P*2); };
    var y = function(v){ return H - P - ((v-min)/range)*(H-P*2); };
    var pts = vals.map(function(v,i){ return x(i).toFixed(1)+','+y(v).toFixed(1); }).join(' ');
    var fill = x(0).toFixed(1)+','+H+' '+pts+' '+x(vals.length-1).toFixed(1)+','+H;
    var cid = color.replace('#','');
    return '<svg width="100%" viewBox="0 0 '+(W+40)+' '+(H+14)+'" style="display:block;margin-top:8px;overflow:visible;">'
      + '<defs><linearGradient id="tg'+cid+'" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="'+color+'" stop-opacity="0.3"/>'
      + '<stop offset="100%" stop-color="'+color+'" stop-opacity="0.02"/>'
      + '</linearGradient></defs>'
      + '<polygon points="'+fill+'" fill="url(#tg'+cid+')"/>'
      + '<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="1.5" stroke-linejoin="round"/>'
      + '<circle cx="'+x(vals.length-1).toFixed(1)+'" cy="'+y(vals[vals.length-1]).toFixed(1)+'" r="3" fill="'+color+'"/>'
      + '<text x="'+(W+4)+'" y="'+(y(vals[vals.length-1])+3).toFixed(1)+'" fill="'+color+'" font-size="9" font-family="Share Tech Mono,monospace">'+fmt1(vals[vals.length-1])+'</text>'
      + '<text x="'+P+'" y="'+(H+12)+'" fill="rgba(255,255,255,0.25)" font-size="8" font-family="Share Tech Mono,monospace">'+(history[0]?history[0].d:'')+'</text>'
      + '<text x="'+(W-20)+'" y="'+(H+12)+'" fill="rgba(255,255,255,0.25)" font-size="8" font-family="Share Tech Mono,monospace">'+(history[history.length-1]?history[history.length-1].d:'')+'</text>'
      + '</svg>';
  };

  // Capex bar chart
  var capexChart = function() {
    var W = 420, H = 100, P = 8;
    var maxB = Math.max.apply(null, capex.map(function(d){ return d.b; }));
    var bW = (W - P*2) / capex.length - 2;
    var bars = capex.map(function(d, i) {
      var bH = (d.b / maxB) * (H - 20);
      var bX = P + i * ((W-P*2)/capex.length);
      var bY = H - bH - 4;
      var col = d.est ? 'rgba(136,85,255,0.5)' : (d.y >= 2023 ? '#00ccff' : 'rgba(0,204,255,0.35)');
      var lbl = d.y >= 2020 ? String(d.y).slice(2) : '';
      return '<rect x="'+bX.toFixed(1)+'" y="'+bY.toFixed(1)+'" width="'+bW.toFixed(1)+'" height="'+bH.toFixed(1)+'" fill="'+col+'" rx="1"/>'
        + (lbl ? '<text x="'+(bX+bW/2).toFixed(1)+'" y="'+H+'" text-anchor="middle" fill="rgba(255,255,255,0.35)" font-size="7" font-family="Orbitron,monospace">'+lbl+'</text>' : '')
        + (!d.est && d.y >= 2024 ? '<text x="'+(bX+bW/2).toFixed(1)+'" y="'+(bY-3).toFixed(1)+'" text-anchor="middle" fill="#00ccff" font-size="7" font-family="Share Tech Mono,monospace">$'+d.b+'B</text>' : '');
    }).join('');
    return '<svg width="100%" viewBox="0 0 '+W+' '+(H+10)+'" style="display:block;margin-top:6px;">'
      + bars
      + '<text x="'+(W-2)+'" y="16" text-anchor="end" fill="rgba(136,85,255,0.7)" font-size="8" font-family="Orbitron,monospace">— EST</text>'
      + '</svg>';
  };

  // Debt scenario chart
  var debtChart = function() {
    if (!debtScens.length) return '';
    var W = 340, H = 100, P = 6;
    var allVals = debtScens.reduce(function(a,s){ return a.concat(s.points.map(function(p){ return p.debt_gdp; })); }, []);
    var min = Math.min.apply(null,allVals)*0.95, max = Math.max.apply(null,allVals)*1.02;
    var years = debtScens[0].points.map(function(p){ return p.y; });
    var x = function(i){ return P + (i/(years.length-1))*(W-P*2); };
    var y = function(v){ return H - P - ((v-min)/(max-min))*(H-P*2); };
    var lines = debtScens.map(function(s) {
      var pts = s.points.map(function(p,i){ return x(i).toFixed(1)+','+y(p.debt_gdp).toFixed(1); }).join(' ');
      var last = s.points[s.points.length-1];
      return '<polyline points="'+pts+'" fill="none" stroke="'+s.color+'" stroke-width="1.5" stroke-linejoin="round"/>'
        + '<text x="'+(x(s.points.length-1)+4).toFixed(1)+'" y="'+(y(last.debt_gdp)+3).toFixed(1)+'" fill="'+s.color+'" font-size="8" font-family="Share Tech Mono,monospace">'+last.debt_gdp+'%</text>';
    }).join('');
    var xLbls = [0, Math.floor(years.length/2), years.length-1].map(function(i){
      return '<text x="'+x(i).toFixed(1)+'" y="'+(H+10)+'" text-anchor="middle" fill="rgba(255,255,255,0.25)" font-size="8" font-family="Share Tech Mono,monospace">'+years[i]+'</text>';
    }).join('');
    var curV = (data.debt_gdp_current && data.debt_gdp_current.v) ? data.debt_gdp_current.v : 124;
    var curY = y(curV).toFixed(1);
    return '<svg width="100%" viewBox="0 0 '+(W+60)+' '+(H+16)+'" style="display:block;overflow:visible;">'
      + '<line x1="'+P+'" y1="'+curY+'" x2="'+(W-P).toFixed(1)+'" y2="'+curY+'" stroke="rgba(255,255,255,0.15)" stroke-dasharray="2,3" stroke-width="1"/>'
      + '<text x="'+(P+2)+'" y="'+(parseFloat(curY)-3).toFixed(1)+'" fill="rgba(255,255,255,0.3)" font-size="7" font-family="Orbitron,monospace">NOW '+curV+'%</text>'
      + lines + xLbls + '</svg>';
  };

  // Score factors
  var factorsHTML = (data.score_factors||[]).map(function(f) {
    var sigColor = (f.signal.indexOf('ACCEL')>=0||f.signal.indexOf('RESOLV')>=0||f.signal.indexOf('FALLING')>=0||f.signal.indexOf('HIGH')>=0) ? '#00ff88'
      : (f.signal.indexOf('EARLY')>=0||f.signal.indexOf('NOT YET')>=0) ? '#8855ff' : '#ffcc00';
    return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);">'
      + '<div style="font-family:\'Orbitron\',monospace;font-size:8px;color:var(--text3);min-width:180px;">'+f.f+'</div>'
      + '<div style="font-family:\'Share Tech Mono\',monospace;font-size:11px;color:var(--text2);min-width:90px;">'+f.v+'</div>'
      + '<div style="font-family:\'Orbitron\',monospace;font-size:8px;letter-spacing:1px;color:'+sigColor+';">'+f.signal+'</div>'
      + '</div>';
  }).join('');

  // Historical analog cards
  var histHTML = hist.map(function(h) {
    var isCurrent = !h.peak_pct_gdp;
    return '<div style="background:'+(isCurrent?'rgba(0,204,255,0.06)':'var(--bg2)')+';border:'+(isCurrent?'1px solid rgba(0,204,255,0.3)':'1px solid var(--border)')+';border-radius:4px;padding:12px 14px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">'
      + '<div><div style="font-family:\'Orbitron\',monospace;font-size:9px;color:'+(isCurrent?'var(--cyan)':'var(--text2)')+';letter-spacing:1px;">'+h.name+'</div>'
      + '<div style="font-size:10px;color:var(--text3);">'+h.period+'</div></div>'
      + (h.peak_pct_gdp
          ? '<div style="text-align:right;"><div style="font-family:\'Share Tech Mono\',monospace;font-size:18px;color:var(--text1);">'+h.peak_pct_gdp+'%</div><div style="font-size:9px;color:var(--text3);">peak capex/GDP</div></div>'
          : '<div style="text-align:right;"><div style="font-family:\'Share Tech Mono\',monospace;font-size:14px;color:var(--cyan);">~1.05% now</div><div style="font-size:9px;color:var(--text3);">est. 2.5–3% peak</div></div>')
      + '</div>'
      + '<div style="font-size:11px;color:var(--text2);line-height:1.6;margin-bottom:6px;">'+h.notes+'</div>'
      + '<div style="font-size:10px;color:var(--text3);font-style:italic;">Survivors: '+h.survivors+'</div>'
      + '</div>';
  }).join('');

  // Outcome cards
  var outcomeHTML = Object.keys(outColors).map(function(k) {
    var o = outColors[k];
    var pct = outcomes[k] || 0;
    return '<div class="panel" style="border-top:3px solid '+o.color+';">'
      + '<div style="font-family:\'Orbitron\',monospace;font-size:8px;color:'+o.color+';letter-spacing:1px;margin-bottom:6px;">'+o.label+'</div>'
      + '<div style="font-family:\'Share Tech Mono\',monospace;font-size:32px;font-weight:900;color:var(--text1);margin-bottom:4px;">'+pct+'%</div>'
      + '<div style="height:4px;background:var(--bg3);border-radius:2px;margin-bottom:8px;"><div style="width:'+pct+'%;height:100%;background:'+o.color+';border-radius:2px;"></div></div>'
      + '<div style="font-size:11px;color:var(--text2);line-height:1.5;">'+o.desc+'</div>'
      + '</div>';
  }).join('');

  // Debt scenario tiles
  var debtTilesHTML = debtScens.map(function(s) {
    var end = s.points[s.points.length-1];
    var mid = s.points[Math.floor(s.points.length/2)];
    return '<div style="background:var(--bg3);border-radius:3px;padding:10px;border-top:2px solid '+s.color+';">'
      + '<div style="font-family:\'Orbitron\',monospace;font-size:8px;color:'+s.color+';margin-bottom:4px;">'+s.name.toUpperCase()+'</div>'
      + '<div style="font-size:10px;color:var(--text3);margin-bottom:6px;">'+s.label+'</div>'
      + '<div style="font-family:\'Share Tech Mono\',monospace;font-size:14px;color:var(--text2);">'+mid.debt_gdp+'% by '+mid.y+'</div>'
      + '<div style="font-family:\'Share Tech Mono\',monospace;font-size:20px;color:'+s.color+';">'+end.debt_gdp+'% by '+end.y+'</div>'
      + '</div>';
  }).join('');

  var updatedStr = data.updated ? new Date(data.updated).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'recently';

  el.innerHTML =
    '<div style="padding:14px 16px;max-width:1400px;margin:0 auto;">'

    // ── PHASE HEADER
    + '<div class="panel" style="margin-bottom:16px;background:linear-gradient(135deg,var(--bg2),'+phase.glow+' 200%);border-left:4px solid '+phase.color+';position:relative;overflow:hidden;">'
    + '<div style="position:absolute;top:0;right:0;width:200px;height:100%;background:radial-gradient(ellipse at right,'+phase.glow+',transparent);pointer-events:none;"></div>'
    + '<div style="font-family:\'Orbitron\',monospace;font-size:8px;letter-spacing:3px;color:var(--text3);margin-bottom:8px;">⬡ CIVILIZATIONAL TRANSITION MONITOR</div>'
    + '<div style="display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center;">'
    + '<div><div style="font-family:\'Orbitron\',monospace;font-size:32px;font-weight:900;color:'+phase.color+';margin-bottom:4px;">'+phase.label+'</div>'
    + '<div style="font-size:13px;color:var(--text2);line-height:1.6;">'+phase.sub+'</div>'
    + '<div style="font-size:11px;color:var(--text3);margin-top:6px;">The bridge between the old economy and the new one. Every indicator here asks: are we still building, or approaching arrival?</div></div>'
    + '<div style="text-align:center;min-width:100px;">'
    + '<div style="font-family:\'Share Tech Mono\',monospace;font-size:48px;font-weight:900;color:'+phase.color+';line-height:1;">'+score+'</div>'
    + '<div style="font-size:9px;color:var(--text3);font-family:\'Orbitron\',monospace;letter-spacing:1px;">BRIDGE SCORE</div>'
    + '<div style="font-size:9px;color:var(--text3);">0 = early · 100 = pop</div></div></div>'
    + '<div style="position:relative;height:8px;background:linear-gradient(90deg,#8855ff,#00ccff,#ffcc00,#ff8800,#ff3355);border-radius:4px;margin:14px 0 8px;">'
    + '<div style="position:absolute;left:'+score+'%;top:-4px;transform:translateX(-50%);width:3px;height:16px;background:#fff;border-radius:2px;box-shadow:0 0 8px rgba(255,255,255,0.9);"></div></div>'
    + '<div style="display:flex;justify-content:space-between;font-size:8px;color:var(--text3);font-family:\'Orbitron\',monospace;margin-bottom:12px;">'
    + '<span>EARLY<br>BRIDGE</span><span>MID<br>BRIDGE</span><span>LATE<br>BRIDGE</span><span>PRE-<br>POP</span><span>THE<br>POP</span></div>'
    + '<div style="border-top:1px solid var(--border);padding-top:10px;">'
    + '<div style="font-family:\'Orbitron\',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:6px;">SCORE COMPONENTS</div>'
    + factorsHTML + '</div></div>'

    // ── AI NARRATIVE
    + '<div class="panel" id="transitionAIPanel" style="margin-bottom:16px;border-left:4px solid #8855ff;">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
    + '<div><div style="font-family:\'Orbitron\',monospace;font-size:9px;letter-spacing:2px;color:#8855ff;">⬡ AI TRANSITION ANALYSIS</div>'
    + '<div style="font-size:10px;color:var(--text3);margin-top:2px;">Generated from live transition indicators · Updated on load</div></div>'
    + '<button onclick="refreshTransitionAI()" style="background:rgba(136,85,255,0.1);border:1px solid rgba(136,85,255,0.3);color:#8855ff;padding:5px 12px;border-radius:3px;cursor:pointer;font-family:\'Orbitron\',monospace;font-size:8px;letter-spacing:1px;">↻ REFRESH</button></div>'
    + '<div id="transitionAIText" style="font-size:13px;color:var(--text2);line-height:1.9;"><span style="color:var(--text3);font-style:italic;">Generating analysis...</span></div>'
    + '</div>'

    // ── OUTCOME SCENARIOS
    + '<div style="font-family:\'Orbitron\',monospace;font-size:10px;letter-spacing:2px;color:#8855ff;margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid rgba(136,85,255,0.3);">⬡ OUTCOME SCENARIOS — NOT FORECASTS, MODEL OUTPUTS</div>'
    + '<div style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.06);border-radius:4px;padding:12px 14px;margin-bottom:12px;font-size:12px;color:var(--text2);line-height:1.7;">The old vocabulary does not apply here. "Soft landing" and "hard landing" describe oscillations around a stable mean. We are not oscillating — we are transitioning between two fundamentally different economic regimes. These are the five actual scenarios.</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:20px;">'+outcomeHTML+'</div>'

    // ── AI CAPEX
    + '<div style="font-family:\'Orbitron\',monospace;font-size:10px;letter-spacing:2px;color:#00ccff;margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid rgba(0,204,255,0.3);">⬡ AI INFRASTRUCTURE CAPEX — THE FUEL</div>'
    + '<div class="panel" style="margin-bottom:16px;">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">'
    + '<div style="text-align:center;background:var(--bg3);border-radius:3px;padding:10px;"><div style="font-family:\'Orbitron\',monospace;font-size:8px;color:var(--text3);margin-bottom:4px;">2024 ACTUAL</div><div style="font-family:\'Share Tech Mono\',monospace;font-size:22px;color:#00ccff;">$285B</div><div style="font-size:10px;color:var(--text3);">1.05% of US GDP</div></div>'
    + '<div style="text-align:center;background:var(--bg3);border-radius:3px;padding:10px;"><div style="font-family:\'Orbitron\',monospace;font-size:8px;color:var(--text3);margin-bottom:4px;">2025 ESTIMATE</div><div style="font-family:\'Share Tech Mono\',monospace;font-size:22px;color:#8855ff;">$427B</div><div style="font-size:10px;color:var(--text3);">+50% YoY · 1.52% GDP</div></div>'
    + '<div style="text-align:center;background:var(--bg3);border-radius:3px;padding:10px;"><div style="font-family:\'Orbitron\',monospace;font-size:8px;color:var(--text3);margin-bottom:4px;">RAILWAY PEAK (1840s)</div><div style="font-family:\'Share Tech Mono\',monospace;font-size:22px;color:var(--text3);">6.0%</div><div style="font-size:10px;color:var(--text3);">of GDP — we are early</div></div>'
    + '</div>'
    + capexChart()
    + '<div style="font-size:11px;color:var(--text2);margin-top:12px;line-height:1.7;border-top:1px solid var(--border);padding-top:10px;"><strong style="color:var(--text1);">What this measures:</strong> Annual capital expenditure by the 8 largest AI infrastructure companies (Amazon, Alphabet, Microsoft, Meta, Nvidia, Oracle, Apple, Broadcom). This is the primary funding mechanism of the transition — every dollar of elevated equity valuation is ultimately financing this buildout. Analyst estimates have undershot actual spending by 30%+ for two consecutive years. Purple bars are estimates.</div>'
    + '<div style="font-size:10px;color:var(--text3);margin-top:6px;font-style:italic;">Sources: Company filings, Goldman Sachs Research, RBC Wealth Management, Morgan Stanley Cloud Capex Tracker.</div>'
    + '</div>'

    // ── LABOR SUBSTITUTION
    + '<div style="font-family:\'Orbitron\',monospace;font-size:10px;letter-spacing:2px;color:#00ff88;margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid rgba(0,255,136,0.3);">⬡ LABOR SUBSTITUTION SIGNAL — IS AI DOING THE WORK YET?</div>'
    + '<div style="background:rgba(0,255,136,0.04);border:1px solid rgba(0,255,136,0.1);border-radius:4px;padding:12px 14px;margin-bottom:12px;font-size:12px;color:var(--text2);line-height:1.7;">The most important question in this transition is not whether AI will replace human labor — it is <strong style="color:var(--text1);">when that replacement becomes measurable in aggregate data</strong>. Output rising while hours worked stay flat means something other than humans did the marginal work. This is the Solow Paradox resolving in real time.</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin-bottom:16px;">'

    // Productivity card
    + '<div class="panel" style="border-top:3px solid #00ff88;">'
    + '<div style="font-family:\'Orbitron\',monospace;font-size:9px;color:#00ff88;margin-bottom:4px;">NONFARM PRODUCTIVITY GROWTH</div>'
    + '<div style="font-size:10px;color:var(--text3);margin-bottom:8px;">FRED: PRS85006092 · BLS · Quarterly</div>'
    + '<div style="font-family:\'Share Tech Mono\',monospace;font-size:28px;color:var(--text1);">'+fmt1(prod.recent_avg)+'%</div>'
    + '<div style="font-size:11px;color:'+((prod.vs_longrun||0)>0?'#00ff88':'var(--text3)')+';">'+((prod.vs_longrun||0)>0?'+':'')+fmt1(prod.vs_longrun)+'pp vs 1950–1999 avg (2.2%)</div>'
    + miniChart(prod.history, '#00ff88')
    + '<div style="font-size:11px;color:var(--text2);margin-top:8px;line-height:1.6;border-top:1px solid var(--border);padding-top:8px;">The Solow Paradox: "You can see the computer age everywhere except in the productivity statistics." It resolved for the internet — productivity surged 1995–2005. <strong style="color:'+(prod.solow_resolved?'#00ff88':'#ffcc00')+'">'+(prod.solow_resolved?'Signal: RESOLVING':'Signal: NOT YET VISIBLE')+'</strong></div>'
    + '</div>'

    // ULC card
    + '<div class="panel" style="border-top:3px solid '+(ulc.trend==='falling'?'#00ff88':'#ff8800')+'">'
    + '<div style="font-family:\'Orbitron\',monospace;font-size:9px;color:'+(ulc.trend==='falling'?'#00ff88':'#ff8800')+';margin-bottom:4px;">UNIT LABOR COSTS</div>'
    + '<div style="font-size:10px;color:var(--text3);margin-bottom:8px;">FRED: ULCNFB · BLS · When falling, AI is doing marginal work</div>'
    + '<div style="font-family:\'Share Tech Mono\',monospace;font-size:28px;color:var(--text1);">'+fmt1(ulc.current)+'</div>'
    + '<div style="font-size:11px;color:'+(ulc.trend==='falling'?'#00ff88':'#ff8800')+'">'+(ulc.trend==='falling'?'▼ FALLING — AI leverage appearing':'▲ RISING — human economy still dominant')+'</div>'
    + miniChart(ulc.history, ulc.trend==='falling'?'#00ff88':'#ff8800')
    + '<div style="font-size:11px;color:var(--text2);margin-top:8px;line-height:1.6;border-top:1px solid var(--border);padding-top:8px;">When output grows faster than labor cost, something other than additional human labor is driving that output. Falling unit labor costs with rising output is the most direct measurable signal of AI doing productive work at scale.</div>'
    + '</div>'

    // Info employment card
    + '<div class="panel" style="border-top:3px solid '+((disp.yoy_pct||0)<-1?'#00ff88':'#8855ff')+'">'
    + '<div style="font-family:\'Orbitron\',monospace;font-size:9px;color:'+((disp.yoy_pct||0)<-1?'#00ff88':'#8855ff')+';margin-bottom:4px;">INFORMATION SECTOR EMPLOYMENT</div>'
    + '<div style="font-size:10px;color:var(--text3);margin-bottom:8px;">FRED: CEU5000000001 · BLS · Knowledge worker displacement</div>'
    + '<div style="font-family:\'Share Tech Mono\',monospace;font-size:28px;color:var(--text1);">'+(disp.current?(disp.current/1000).toFixed(1)+'M':'—')+'</div>'
    + '<div style="font-size:11px;color:'+((disp.yoy_pct||0)<0?'#00ff88':'var(--text3)')+';">'+fmt1(disp.yoy_pct)+'% YoY · '+fmt1(disp.pct_below_peak)+'% below peak</div>'
    + miniChart(disp.history, '#8855ff')
    + '<div style="font-size:11px;color:var(--text2);margin-top:8px;line-height:1.6;border-top:1px solid var(--border);padding-top:8px;">The information sector is ground zero for AI displacement. When employment falls here while output per worker rises, the substitution is becoming real. These jobs do not come back in the same form.</div>'
    + '</div>'

    // Labor share card
    + '<div class="panel" style="border-top:3px solid '+((ls.change_5yr||0)<-1?'#00ff88':'#ffcc00')+'">'
    + '<div style="font-family:\'Orbitron\',monospace;font-size:9px;color:'+((ls.change_5yr||0)<-1?'#00ff88':'#ffcc00')+';margin-bottom:4px;">LABOR SHARE OF OUTPUT</div>'
    + '<div style="font-size:10px;color:var(--text3);margin-bottom:8px;">FRED: PRS85006151 · BLS · Falling = capital replacing labor</div>'
    + '<div style="font-family:\'Share Tech Mono\',monospace;font-size:28px;color:var(--text1);">'+fmt1(ls.current)+'%</div>'
    + '<div style="font-size:11px;color:'+((ls.change_5yr||0)<0?'#00ff88':'var(--text3)')+';">'+((ls.change_5yr||0)>0?'+':'')+fmt1(ls.change_5yr)+'pp over 5 years</div>'
    + miniChart(ls.history, (ls.change_5yr||0)<-1?'#00ff88':'#ffcc00')
    + '<div style="font-size:11px;color:var(--text2);margin-top:8px;line-height:1.6;border-top:1px solid var(--border);padding-top:8px;">The share of total economic output going to workers as wages. A structural decline means capital — increasingly, AI — is capturing a larger share of value creation. This is the distributional signal: it measures who benefits from the transition.</div>'
    + '</div>'
    + '</div>'

    // ── DEBT BRIDGE
    + '<div style="font-family:\'Orbitron\',monospace;font-size:10px;letter-spacing:2px;color:#ffcc00;margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid rgba(255,204,0,0.3);">⬡ THE DEBT BRIDGE — HOW LONG CAN IT HOLD?</div>'
    + '<div class="panel" style="margin-bottom:16px;">'
    + '<div style="font-size:12px;color:var(--text2);line-height:1.8;margin-bottom:12px;"><strong style="color:var(--text1);">The central insight:</strong> Current US debt of ~$36T looks unsustainable against current GDP of ~$29.7T. But debt sustainability is not a function of current GDP — it is a function of <em>future GDP</em>. If AI delivers the productivity gains it is being valued for, the denominator expands dramatically. These three scenarios show what debt/GDP looks like through 2040 under different AI productivity assumptions. The question is not whether the debt is sustainable today. It is whether the transformation arrives before the debt becomes binding.</div>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">'+debtTilesHTML+'</div>'
    + debtChart()
    + '<div style="font-size:10px;color:var(--text3);margin-top:8px;font-style:italic;">Model assumptions: $36.2T current debt, ~5.5% annual deficit, ~2yr productivity lag. FRED: GFDEGDQ188S (BEA). Scenarios only — not forecasts.</div>'
    + '</div>'

    // ── HISTORICAL TRANSITIONS
    + '<div style="font-family:\'Orbitron\',monospace;font-size:10px;letter-spacing:2px;color:var(--text3);margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--border);">⬡ HISTORICAL INFRASTRUCTURE TRANSITIONS — THE PRECEDENTS</div>'
    + '<div style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.06);border-radius:4px;padding:12px 14px;margin-bottom:12px;font-size:12px;color:var(--text2);line-height:1.7;">Every major infrastructure transition followed the same arc: capital floods in, most companies fail, the networks survive, productivity eventually vindicates the investment. The question for each was never whether the technology was real — it was whether the financing structure could survive the interval between commitment and delivery.</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;margin-bottom:16px;">'+histHTML+'</div>'

    // ── SURVIVOR FRAMEWORK
    + '<div style="font-family:\'Orbitron\',monospace;font-size:10px;letter-spacing:2px;color:#ff8800;margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid rgba(255,136,0,0.3);">⬡ THE SURVIVOR FRAMEWORK — WHO MAKES IT THROUGH THE POP</div>'
    + '<div class="panel" style="margin-bottom:16px;border-left:4px solid #ff8800;">'
    + '<div style="font-size:12px;color:var(--text2);line-height:1.8;margin-bottom:12px;">The pop does not destroy the transformation. It destroys the vehicle. Cisco lost 80% in 2000 and never recovered — because Cisco was infrastructure for the internet, not the internet itself. The survivors of every transition are the companies that ended up owning the <strong style="color:var(--text1);">intelligence layer</strong> — the thing the entire economy ran on top of.</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;">'
    + [
        { era:'Railways (1840s)',        died:'Equipment makers, most railway cos',               survived:'Companies owning the actual rail networks',                          color:'var(--text3)' },
        { era:'Electrification (1920s)', died:'Utility speculators, most appliance cos',          survived:'GE, Westinghouse — companies that became electrical infrastructure',   color:'var(--text3)' },
        { era:'Internet (2000)',          died:'Cisco (−80%), Webvan, Pets.com, 4,000+ cos',      survived:'Amazon, Google — companies that became the layer everything runs on', color:'var(--text3)' },
        { era:'AI (?)',                   died:'GPU manufacturers? Cloud infra? Most AI apps?',   survived:'Companies owning model weights + universal distribution at scale',     color:'#ff8800' },
      ].map(function(r){
        return '<div style="background:var(--bg3);border-radius:3px;padding:10px;border-top:2px solid '+r.color+';">'
          + '<div style="font-family:\'Orbitron\',monospace;font-size:8px;color:'+r.color+';margin-bottom:6px;">'+r.era+'</div>'
          + '<div style="font-size:10px;color:#ff3355;margin-bottom:4px;line-height:1.4;">✕ '+r.died+'</div>'
          + '<div style="font-size:10px;color:#00ff88;line-height:1.4;">✓ '+r.survived+'</div>'
          + '</div>';
      }).join('')
    + '</div>'
    + '<div style="margin-top:12px;padding:10px 12px;background:rgba(255,136,0,0.06);border-radius:3px;font-size:11px;color:var(--text2);line-height:1.7;"><strong style="color:#ff8800;">The critical diagnostic:</strong> Watch for the moment when AI infrastructure companies (hyperscalers, GPU makers, data center builders) begin selling off while a small number of AI-native companies continue to appreciate. That spread — builders down, intelligence-layer up — is the pop beginning. The field is narrowing to its survivors.</div>'
    + '</div>'

    // ── DATA SOURCES FOOTER
    + '<div style="border-top:1px solid var(--border);padding-top:12px;margin-top:8px;">'
    + '<div style="font-family:\'Orbitron\',monospace;font-size:8px;color:var(--text3);margin-bottom:6px;">WHERE DOES THIS DATA COME FROM?</div>'
    + '<div style="font-size:11px;color:var(--text3);line-height:1.8;">All data is sourced from <strong style="color:var(--text2);">FRED</strong> — the Federal Reserve Economic Database maintained by the St. Louis Federal Reserve Bank. FRED is the gold standard source for US economic data, used by the Federal Reserve itself, the IMF, the World Bank, and every major financial institution. It aggregates data from the <strong style="color:var(--text2);">Bureau of Labor Statistics (BLS)</strong>, the <strong style="color:var(--text2);">Bureau of Economic Analysis (BEA)</strong>, the <strong style="color:var(--text2);">Federal Reserve Board</strong>, and other official sources. Data updates on FRED\'s own schedule — productivity &amp; labor quarterly, employment monthly. This dashboard fetches fresh data every time you open the tab.</div>'
    + '<div style="font-size:10px;color:var(--text3);margin-top:8px;text-align:right;">Productivity &amp; labor: BLS via FRED · Debt projections: model outputs · AI capex: company filings + GS/RBC/MS research · Updated ' + updatedStr + '</div>'
    + '</div>'

    + '</div>';
}

// ─── AI NARRATIVE ─────────────────────────────────────────────────────────────
async function _generateTransitionAI(data) {
  var el = document.getElementById('transitionAIText');
  if (!el) return;

  var score    = data.bridge_score || 35;
  var outcomes = data.outcomes || {};
  var prod     = data.productivity_signal || {};
  var ulc      = data.ulc_signal || {};
  var disp     = data.displacement_signal || {};
  var fmt1     = function(v){ return v == null ? '—' : Number(v).toFixed(1); };
  var phaseLabel = score >= 80 ? 'Pre-Pop' : score >= 60 ? 'Late Bridge' : score >= 30 ? 'Mid Bridge' : 'Early Bridge';

  var context = 'BRIDGE PHASE: Score ' + score + '/100 — ' + phaseLabel + '\n\n'
    + 'OUTCOME PROBABILITIES:\n'
    + '- Arrival (clean transition): ' + (outcomes.arrival||0) + '%\n'
    + '- Bridge Collapse (1929 scenario): ' + (outcomes.bridge_collapse||0) + '%\n'
    + '- False Dawn: ' + (outcomes.false_dawn||0) + '%\n'
    + '- Dark Arrival: ' + (outcomes.dark_arrival||0) + '%\n'
    + '- Infinite Bridge: ' + (outcomes.infinite_bridge||0) + '%\n\n'
    + 'AI INFRASTRUCTURE CAPEX:\n'
    + '- 2024 actual: $285B (1.05% of GDP)\n'
    + '- 2025 estimate: $427B (1.52% of GDP)\n'
    + '- Analyst estimates undershot actual by 30%+ for 2 consecutive years\n'
    + '- Railway peak was 6% of GDP — we are early\n\n'
    + 'PRODUCTIVITY SIGNAL (FRED PRS85006092, BLS):\n'
    + '- Recent nonfarm productivity: ' + fmt1(prod.recent_avg) + '% (long-run avg 2.2%)\n'
    + '- vs long-run: ' + fmt1(prod.vs_longrun) + 'pp\n'
    + '- Solow Paradox resolved: ' + (prod.solow_resolved ? 'YES' : 'NOT YET') + '\n\n'
    + 'UNIT LABOR COSTS (FRED ULCNFB, BLS): ' + (ulc.trend||'unknown') + '\n'
    + 'INFO SECTOR EMPLOYMENT (FRED CEU5000000001, BLS): ' + (disp.current ? (disp.current/1000).toFixed(1)+'M' : '—') + ' workers, ' + fmt1(disp.yoy_pct) + '% YoY';

  var system = 'You are the most sophisticated macroeconomic analyst alive, deeply fluent in the Transitional Inflation Hypothesis — the idea that what appears to be a bubble may actually be a purposive bridge between two fundamentally different economic regimes. You understand that standard cyclical terminology (soft landing, hard landing, stagflation) does not apply here. We are not oscillating around a mean — we are transitioning between regimes.\n\nThe five possible outcomes are: ARRIVAL (transformation completes, bridge holds, pop is clean), BRIDGE COLLAPSE (financing breaks before completion — the 1929 scenario), FALSE DAWN (partial transformation, not enough to justify debt carried), DARK ARRIVAL (transformation succeeds but distributional failure fractures society), INFINITE BRIDGE (perpetual anticipation, transformation always almost here).\n\nWrite for an intelligent audience that understands markets but may not be economists. Be direct, insightful, intellectually honest about uncertainty. Write in flowing prose — no bullet points. 4-5 substantial paragraphs. Connect the data to the theory. Tell the story of where we are in the transition, what the signals are saying, and what the most important things to watch are. This is not financial advice — this is the most honest possible reading of a civilizational inflection point.';

  try {
    var resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1400,
        system: system,
        messages: [{ role: 'user', content: 'Here is the current transition data:\n' + context + '\n\nWrite your analysis of where we are in the civilizational transition. Be thorough, honest, and brilliant.' }]
      })
    });
    if (!resp.ok) throw new Error('API ' + resp.status);
    var json = await resp.json();
    var text = (json.content || []).map(function(b){ return b.text || ''; }).join('');
    if (el) {
      el.innerHTML = text.split('\n\n').filter(function(p){ return p.trim(); })
        .map(function(p){ return '<p style="margin:0 0 14px;line-height:1.9;">' + p.trim() + '</p>'; }).join('');
    }
  } catch(e) {
    if (el) el.innerHTML = '<span style="color:var(--text3);font-style:italic;">AI analysis unavailable: ' + e.message + '</span>';
  }
}

async function refreshTransitionAI() {
  var el = document.getElementById('transitionAIText');
  if (el) el.innerHTML = '<span style="color:var(--text3);font-style:italic;">Regenerating...</span>';
  if (_transitionData) await _generateTransitionAI(_transitionData);
}
