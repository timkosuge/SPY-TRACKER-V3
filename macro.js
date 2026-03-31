/**
 * MACRO TAB — SPY TRACKER V3
 * Comprehensive macroeconomic dashboard with historical context,
 * transition-era intelligence, and AI-generated narrative.
 *
 * Organized into:
 *   1. Data layer   — hardcoded anchors + live FRED fetches
 *   2. Render layer — panels, sparklines, gauges, charts
 *   3. AI layer     — Claude-powered macro narrative
 *   4. Boot         — wired to switchTab / panel activation
 */

/* ═══════════════════════════════════════════════════════
   0.  UTILITIES
═══════════════════════════════════════════════════════ */

const _M = (() => {

  // ── helpers ────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const fmtPct = (v, dec=2) => v == null ? '—' : (v > 0 ? '+' : '') + v.toFixed(dec) + '%';
  const fmtNum = (v, dec=1) => v == null ? '—' : v.toFixed(dec);
  const fmtT   = v => {
    if (v == null) return '—';
    const abs = Math.abs(v);
    if (abs >= 1e12) return (v/1e12).toFixed(2) + 'T';
    if (abs >= 1e9)  return (v/1e9).toFixed(1)  + 'B';
    if (abs >= 1e6)  return (v/1e6).toFixed(1)  + 'M';
    return v.toFixed(0);
  };
  const colorUp   = '#00ff88';
  const colorDn   = '#ff3355';
  const colorNeu  = '#ffcc00';
  const colorCyan = '#00ccff';
  const colorPurp = '#8855ff';
  const colorOrng = '#ff8800';

  const signColor = (v, invertBad=false) => {
    if (v == null) return '#9090c0';
    if (invertBad) return v > 0 ? colorDn : colorUp;
    return v > 0 ? colorUp : colorDn;
  };

  /* ── SVG sparkline ─────────────────────────────────── */
  function sparkline(vals, opts={}) {
    const W = opts.width  || 120;
    const H = opts.height || 40;
    const color = opts.color || colorCyan;
    const fill  = opts.fill  !== false;
    if (!vals || vals.length < 2) return `<svg width="${W}" height="${H}"></svg>`;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const pts = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const polyline = pts.join(' ');
    const last = pts[pts.length-1];
    const fillPath = fill
      ? `<polygon points="${pts[0].split(',')[0]},${H} ${polyline} ${last.split(',')[0]},${H}"
           fill="${color}22" stroke="none"/>`
      : '';
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="display:block;">
      ${fillPath}
      <polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${last.split(',')[0]}" cy="${last.split(',')[1]}" r="2.5" fill="${color}"/>
    </svg>`;
  }

  /* ── horizontal bar gauge ──────────────────────────── */
  function gauge(val, min, max, color, label='') {
    const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
    return `
      <div style="margin-top:6px;">
        ${label ? `<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:3px;"><span>${label}</span><span style="color:${color};">${val}</span></div>` : ''}
        <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,${color}88,${color});border-radius:3px;transition:width 0.8s;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--dim);margin-top:2px;"><span>${min}</span><span>${max}</span></div>
      </div>`;
  }

  /* ── metric tile ───────────────────────────────────── */
  function tile(label, value, sub, color='var(--cyan)', desc='', badge='') {
    return `
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:12px;position:relative;">
        ${badge ? `<div style="position:absolute;top:8px;right:8px;font-family:'Orbitron',monospace;font-size:8px;padding:2px 6px;background:${color}22;border:1px solid ${color}44;border-radius:2px;color:${color};">${badge}</div>` : ''}
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;color:var(--text3);margin-bottom:6px;">${label}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:900;color:${color};">${value}</div>
        ${sub  ? `<div style="font-size:12px;color:var(--text2);margin-top:3px;">${sub}</div>` : ''}
        ${desc ? `<div style="font-size:11px;color:var(--text3);margin-top:6px;line-height:1.5;">${desc}</div>` : ''}
      </div>`;
  }

  /* ── section header ────────────────────────────────── */
  function sectionHeader(icon, title, subtitle='') {
    return `
      <div style="display:flex;align-items:baseline;gap:10px;margin:18px 0 10px;border-bottom:1px solid var(--border);padding-bottom:8px;">
        <span style="font-size:18px;">${icon}</span>
        <div>
          <div style="font-family:'Orbitron',monospace;font-size:12px;letter-spacing:3px;color:var(--cyan);">${title}</div>
          ${subtitle ? `<div style="font-size:12px;color:var(--text3);margin-top:2px;">${subtitle}</div>` : ''}
        </div>
      </div>`;
  }

  /* ── inline SVG bar chart (horizontal) ─────────────── */
  function barChart(items, opts={}) {
    // items: [{label, value, color}]
    const W = opts.width || 300;
    const barH = opts.barH || 16;
    const gap = opts.gap || 6;
    const H = items.length * (barH + gap);
    const maxVal = Math.max(...items.map(i => Math.abs(i.value)));
    const midX = opts.centered ? W / 2 : 0;

    if (opts.centered) {
      const rows = items.map((item, i) => {
        const bw = (Math.abs(item.value) / maxVal) * (W / 2 - 40);
        const x  = item.value >= 0 ? midX : midX - bw;
        const y  = i * (barH + gap);
        const col = item.color || (item.value >= 0 ? colorUp : colorDn);
        return `
          <g>
            <text x="${midX - 4}" y="${y + barH - 4}" text-anchor="end" font-size="10" fill="#9090c0" font-family="'Share Tech Mono',monospace">${item.label}</text>
            <rect x="${x}" y="${y}" width="${bw}" height="${barH}" fill="${col}88" rx="2"/>
            <text x="${item.value>=0 ? x+bw+4 : x-4}" y="${y+barH-4}" text-anchor="${item.value>=0?'start':'end'}" font-size="10" fill="${col}" font-family="'Share Tech Mono',monospace">${item.value > 0 ? '+' : ''}${item.value.toFixed(1)}%</text>
          </g>`;
      }).join('');
      return `<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;">
        <line x1="${midX}" y1="0" x2="${midX}" y2="${H}" stroke="#252545" stroke-width="1"/>
        ${rows}
      </svg>`;
    }

    const rows = items.map((item, i) => {
      const bw = (Math.abs(item.value) / maxVal) * (W - 80);
      const y  = i * (barH + gap);
      const col = item.color || colorCyan;
      return `
        <g>
          <text x="0" y="${y + barH - 3}" font-size="9" fill="#9090c0" font-family="'Orbitron',monospace" letter-spacing="0.5">${item.label}</text>
          <rect x="72" y="${y}" width="${bw}" height="${barH}" fill="${col}66" rx="2"/>
          <rect x="72" y="${y}" width="2" height="${barH}" fill="${col}"/>
          <text x="${72 + bw + 6}" y="${y + barH - 3}" font-size="10" fill="${col}" font-family="'Share Tech Mono',monospace">${item.display || fmtNum(item.value)}</text>
        </g>`;
    }).join('');
    return `<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;">${rows}</svg>`;
  }

  /* ── timeline SVG ──────────────────────────────────── */
  function timelineChart(series, opts={}) {
    // series: [{label, data:[{x,y}], color}]
    const W = opts.width || 600;
    const H = opts.height || 120;
    const pad = { t:10, b:20, l:36, r:10 };
    const iW = W - pad.l - pad.r;
    const iH = H - pad.t - pad.b;

    const allY = series.flatMap(s => s.data.map(d => d.y)).filter(v => v != null);
    const allX = series.flatMap(s => s.data.map(d => d.x));
    const minY = opts.minY != null ? opts.minY : Math.min(...allY);
    const maxY = opts.maxY != null ? opts.maxY : Math.max(...allY);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);

    const px = x => pad.l + ((x - minX) / (maxX - minX || 1)) * iW;
    const py = y => pad.t + iH - ((y - minY) / (maxY - minY || 1)) * iH;

    // Y axis ticks
    const ticks = 4;
    const yLabels = Array.from({length: ticks+1}, (_,i) => {
      const v = minY + (maxY - minY) * (i / ticks);
      return `<text x="${pad.l - 4}" y="${py(v) + 3}" text-anchor="end" font-size="9" fill="#606080" font-family="'Share Tech Mono',monospace">${v.toFixed(1)}</text>
              <line x1="${pad.l}" y1="${py(v)}" x2="${pad.l + iW}" y2="${py(v)}" stroke="#252545" stroke-width="0.5" stroke-dasharray="3,3"/>`;
    }).join('');

    const paths = series.map(s => {
      const pts = s.data.filter(d=>d.y!=null).map(d => `${px(d.x).toFixed(1)},${py(d.y).toFixed(1)}`).join(' ');
      const firstX = px(s.data[0]?.x).toFixed(1);
      const lastX  = px(s.data[s.data.length-1]?.x).toFixed(1);
      return `
        <polygon points="${firstX},${pad.t+iH} ${pts} ${lastX},${pad.t+iH}" fill="${s.color}18" stroke="none"/>
        <polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>`;
    }).join('');

    // zero line if in range
    const zeroLine = (minY <= 0 && maxY >= 0)
      ? `<line x1="${pad.l}" y1="${py(0)}" x2="${pad.l+iW}" y2="${py(0)}" stroke="#606080" stroke-width="1" stroke-dasharray="4,4"/>`
      : '';

    return `<svg width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="display:block;">
      ${yLabels}
      ${zeroLine}
      ${paths}
    </svg>`;
  }

  /* ═══════════════════════════════════════════════════════
     1.  STATIC / ANCHORED MACRO DATA
         (Best-available as of Q1 2026 — live fetches overlay these)
  ═══════════════════════════════════════════════════════ */

  const STATIC = {
    // Fed Funds Rate history (quarterly, %)
    fedRate: {
      current: 4.25,
      target: 3.25,         // Fed's 2026 end-of-year dot plot
      series: [
        {label:'Q1-22',v:0.25},{label:'Q2-22',v:0.75},{label:'Q3-22',v:2.25},
        {label:'Q4-22',v:4.25},{label:'Q1-23',v:4.75},{label:'Q2-23',v:5.0},
        {label:'Q3-23',v:5.25},{label:'Q4-23',v:5.25},{label:'Q1-24',v:5.25},
        {label:'Q2-24',v:5.25},{label:'Q3-24',v:5.0},{label:'Q4-24',v:4.5},
        {label:'Q1-25',v:4.25},{label:'Q2-25',v:4.25},{label:'Q3-25',v:4.25},
        {label:'Q4-25',v:4.25},{label:'Q1-26',v:4.25}
      ],
      nextMeeting: 'Apr 29, 2026',
      hikes: 11,
      cycleStart: 'Mar 2022'
    },
    // CPI YoY % — monthly
    cpi: {
      current: 2.8,
      prev: 3.0,
      core: 3.1,
      peak: 9.1,    // Jun 2022
      target: 2.0,
      series: [
        {label:'Jan-23',v:6.4},{label:'Apr-23',v:4.9},{label:'Jul-23',v:3.2},
        {label:'Oct-23',v:3.2},{label:'Jan-24',v:3.1},{label:'Apr-24',v:3.4},
        {label:'Jul-24',v:2.9},{label:'Oct-24',v:2.6},{label:'Jan-25',v:3.0},
        {label:'Apr-25',v:2.7},{label:'Jul-25',v:2.6},{label:'Oct-25',v:2.8},
        {label:'Jan-26',v:2.9},{label:'Feb-26',v:2.8}
      ]
    },
    // GDP QoQ annualized %
    gdp: {
      current: 2.3,
      prev: 2.8,
      longRunAvg: 2.1,
      series: [
        {label:'Q1-22',v:-1.6},{label:'Q2-22',v:-0.6},{label:'Q3-22',v:2.7},
        {label:'Q4-22',v:2.6},{label:'Q1-23',v:1.1},{label:'Q2-23',v:2.4},
        {label:'Q3-23',v:4.9},{label:'Q4-23',v:3.3},{label:'Q1-24',v:1.4},
        {label:'Q2-24',v:2.8},{label:'Q3-24',v:2.8},{label:'Q4-24',v:2.3},
        {label:'Q1-25',v:2.1},{label:'Q2-25',v:2.5},{label:'Q3-25',v:2.4},
        {label:'Q4-25',v:2.3}
      ],
      debtToGDP: 124.2  // %
    },
    // Unemployment %
    unemployment: {
      current: 4.1,
      prev: 4.1,
      u6: 7.8,           // broader underemployment
      naturalRate: 4.2,
      pre2020Low: 3.5,
      series: [
        {label:'Jan-22',v:4.0},{label:'Jul-22',v:3.5},{label:'Jan-23',v:3.4},
        {label:'Jul-23',v:3.5},{label:'Jan-24',v:3.7},{label:'Jul-24',v:4.3},
        {label:'Oct-24',v:4.1},{label:'Jan-25',v:4.0},{label:'Apr-25',v:4.1},
        {label:'Jul-25',v:4.2},{label:'Oct-25',v:4.1},{label:'Jan-26',v:4.1}
      ],
      // AI displacement estimate — job categories
      aiDisplacement: [
        {sector:'Admin & Office',pct:42,risk:'HIGH'},
        {sector:'Finance & Accounting',pct:38,risk:'HIGH'},
        {sector:'Legal Support',pct:35,risk:'HIGH'},
        {sector:'Customer Service',pct:33,risk:'HIGH'},
        {sector:'Software Dev',pct:28,risk:'MED'},
        {sector:'Marketing & Media',pct:24,risk:'MED'},
        {sector:'Healthcare',pct:14,risk:'LOW'},
        {sector:'Construction',pct:8,risk:'LOW'},
      ]
    },
    // Debt to GDP
    debt: {
      total: 36.4e12,   // $36.4T
      gdpNominal: 29.3e12,
      ratio: 124.2,
      series: [
        {label:'2000',v:54},{label:'2005',v:60},{label:'2010',v:87},
        {label:'2012',v:100},{label:'2015',v:101},{label:'2018',v:104},
        {label:'2020',v:127},{label:'2021',v:124},{label:'2022',v:119},
        {label:'2023',v:122},{label:'2024',v:124},{label:'2025',v:124},
        {label:'2026',v:126}  // estimate
      ],
      projections: [
        {label:'2027',v:128},{label:'2028',v:131},{label:'2030',v:136}
      ]
    },
    // M2 money supply ($T)
    m2: {
      current: 21.6,
      prev: 21.4,
      peak: 21.7,    // Mar 2022
      trough: 19.9,  // Oct 2023
      series: [
        {label:'Jan-21',v:19.3},{label:'Jul-21',v:20.5},{label:'Jan-22',v:21.6},
        {label:'Jul-22',v:21.6},{label:'Jan-23',v:21.2},{label:'Jul-23',v:20.5},
        {label:'Jan-24',v:20.8},{label:'Jul-24',v:21.1},{label:'Jan-25',v:21.3},
        {label:'Jul-25',v:21.5},{label:'Jan-26',v:21.6}
      ]
    },
    // DXY, Gold, Oil, BTC — spot anchors
    assets: {
      dxy:  { v: 104.2, chg: -0.3, desc: 'Dollar Index' },
      gold: { v: 3050,  chg: 1.1,  desc: 'Gold $/oz' },
      oil:  { v: 71.5,  chg: -0.8, desc: 'WTI Crude' },
      btc:  { v: 82400, chg: -2.1, desc: 'Bitcoin' }
    },
    // Productivity: Real output per hour (YoY %)
    productivity: {
      current: 1.9,
      series: [
        {label:'2015',v:0.4},{label:'2016',v:0.1},{label:'2017',v:1.2},
        {label:'2018',v:1.4},{label:'2019',v:2.4},{label:'2020',v:2.9},
        {label:'2021',v:2.2},{label:'2022',v:-1.8},{label:'2023',v:2.7},
        {label:'2024',v:2.4},{label:'2025',v:1.9}
      ]
    }
  };

  /* ═══════════════════════════════════════════════════════
     2.  LIVE DATA — FRED CSV fetches (no key needed)
  ═══════════════════════════════════════════════════════ */

  async function fetchFRED(seriesId, limit=16) {
    try {
      const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`;
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/csv' } });
      if (!r.ok) return null;
      const text = await r.text();
      const lines = text.trim().split('\n').filter(l => !l.startsWith('DATE') && l.includes(','));
      return lines.slice(-limit).map(l => {
        const [date, val] = l.split(',');
        return { date: date.trim(), value: val.trim() === '.' ? null : parseFloat(val.trim()) };
      }).filter(d => d.value != null);
    } catch { return null; }
  }

  /* ═══════════════════════════════════════════════════════
     3.  TRANSITION INTELLIGENCE — The New World Model
  ═══════════════════════════════════════════════════════ */

  const TRANSITION = {
    // Each metric: old reading vs new reading
    metrics: [
      {
        id: 'jobs',
        icon: '🤖',
        name: 'Job Losses',
        oldLabel: 'OLD WORLD',
        oldRead: 'Job losses = economic weakness. Bad for markets. Triggers Fed easing.',
        newLabel: 'TRANSITION ERA',
        newRead: 'Displacement-driven losses = automation progress. Productivity rises as AI absorbs repetitive tasks. Output maintained with fewer workers.',
        signal: 'WATCH U-6 + PRODUCTIVITY RATIO',
        color: colorOrng
      },
      {
        id: 'debt',
        icon: '📊',
        name: 'Debt / GDP',
        oldLabel: 'OLD WORLD',
        oldRead: 'Debt > 100% GDP = unsustainable. Crowding out investment. Risk of sovereign crisis.',
        newLabel: 'TRANSITION ERA',
        newRead: 'Infrastructure debt for the AI/energy transition creates future productivity multipliers. Once tech matures, output rises sharply, denominator (GDP) expands fast, ratio normalizes.',
        signal: 'WATCH PRODUCTIVITY-TO-DEBT RATIO',
        color: colorPurp
      },
      {
        id: 'inflation',
        icon: '⚖️',
        name: 'Inflation',
        oldLabel: 'OLD WORLD',
        oldRead: 'Rising CPI = overheating. Tighten policy. Reduce spending.',
        newLabel: 'TRANSITION ERA',
        newRead: 'Two forces in battle. AI/automation = deflationary (lower production costs, cheaper goods). UBI implementation = inflationary (demand-side injection). Net result: structurally different inflation profile — selective, not broad.',
        signal: 'WATCH GOODS vs SERVICES SPLIT + UBI POLICY',
        color: colorNeu
      },
      {
        id: 'productivity',
        icon: '⚡',
        name: 'Productivity',
        oldLabel: 'OLD WORLD',
        oldRead: 'Measured as output per worker-hour. Historical avg ~1.5% annual gain.',
        newLabel: 'TRANSITION ERA',
        newRead: 'AI agents augmenting every knowledge worker. Productivity curves could mirror 1990s IT revolution but steeper — 3-6% sustained gains possible once adoption matures (~2027-2030).',
        signal: 'POTENTIAL INFLECTION: 2027-2029',
        color: colorUp
      },
      {
        id: 'ubi',
        icon: '🌐',
        name: 'Universal Basic Income',
        oldLabel: 'OLD WORLD',
        oldRead: 'Not a real policy consideration. Fringe economics.',
        newLabel: 'TRANSITION ERA',
        newRead: 'Becomes politically inevitable as automation absorbs 30-40% of current jobs over 10 years. Creates new demand floor. Partial pilots already underway (Finland, Stockton, Kenya). Fed framework will need to account for guaranteed demand flows.',
        signal: 'MONITOR: POLICY PROPOSALS + PILOT PROGRAMS',
        color: colorCyan
      }
    ],
    // Transition Score: rough composite of how far we are
    score: 17,   // 0-100: 0=fully old world, 100=fully new world
    phase: 'EARLY TRANSITION',
    phaseColor: colorOrng
  };

  /* ═══════════════════════════════════════════════════════
     4.  MACRO REGIME SCORING
         Simple rules-based regime label
  ═══════════════════════════════════════════════════════ */

  function calcRegime(d) {
    const rate = d.fedRate.current;
    const cpi  = d.cpi.current;
    const gdp  = d.gdp.current;
    const unem = d.unemployment.current;

    let score = 0;  // positive = growth/risk-on, negative = contraction/risk-off
    let flags = [];

    // Inflation
    if (cpi > 5)      { score -= 2; flags.push('HIGH INFLATION'); }
    else if (cpi > 3) { score -= 1; flags.push('ELEVATED INFLATION'); }
    else if (cpi < 2) { score += 1; flags.push('LOW INFLATION'); }
    else              { flags.push('NEAR-TARGET CPI'); }

    // Growth
    if (gdp > 3)      { score += 2; flags.push('STRONG GROWTH'); }
    else if (gdp > 1) { score += 1; flags.push('MODERATE GROWTH'); }
    else if (gdp < 0) { score -= 2; flags.push('CONTRACTION'); }

    // Labor
    if (unem < 3.8)   { score += 1; flags.push('TIGHT LABOR'); }
    else if (unem > 5) { score -= 1; flags.push('RISING UNEMPLOYMENT'); }

    // Fed
    if (rate > 5)     { score -= 1; flags.push('RESTRICTIVE RATES'); }
    else if (rate < 2) { score += 1; flags.push('EASY POLICY'); }
    else               { flags.push('NEUTRAL-ISH RATES'); }

    let label, color, desc;
    if      (score >= 3)  { label='EXPANSION';       color=colorUp;   desc='Economy firing on most cylinders. Goldilocks if inflation stays contained.'; }
    else if (score >= 1)  { label='SOFT LANDING';    color=colorCyan; desc='Growth slowing but holding. Fed threading the needle. Market-friendly.'; }
    else if (score === 0) { label='CROSSROADS';      color=colorNeu;  desc='Mixed signals. Neither clearly bullish nor bearish macro backdrop.'; }
    else if (score >= -2) { label='SLOWDOWN';        color=colorOrng; desc='Growth below trend, policy still restrictive. Watch labor data closely.'; }
    else                  { label='CONTRACTION';     color=colorDn;   desc='Recessionary pressures. Defensive posture warranted.'; }

    return { label, color, desc, score, flags };
  }

  /* ═══════════════════════════════════════════════════════
     5.  RENDER FUNCTIONS
  ═══════════════════════════════════════════════════════ */

  function renderMacro() {
    const d = STATIC;
    const regime = calcRegime(d);
    const el = $('macroContent');
    if (!el) return;

    el.innerHTML = buildHTML(d, regime);
    bindToggles();
    loadLiveData(d);           // async overlay
    loadAINarrative(d, regime); // async Claude narrative
  }

  /* ── main HTML builder ─────────────────────────────── */
  function buildHTML(d, regime) {
    return `
      <!-- ── MACRO HEADER STRIP ─────────────────────── -->
      ${buildRegimeHeader(regime)}

      <!-- ── TRANSITION INTELLIGENCE ───────────────── -->
      ${buildTransitionSection()}

      <!-- ── INTEREST RATES & FED ──────────────────── -->
      ${buildFedSection(d)}

      <!-- ── INFLATION ─────────────────────────────── -->
      ${buildInflationSection(d)}

      <!-- ── GROWTH & DEBT ─────────────────────────── -->
      ${buildGrowthSection(d)}

      <!-- ── LABOR MARKET ──────────────────────────── -->
      ${buildLaborSection(d)}

      <!-- ── MONEY, ASSETS & DOLLAR ───────────────── -->
      ${buildAssetsSection(d)}

      <!-- ── PRODUCTIVITY ──────────────────────────── -->
      ${buildProductivitySection(d)}

      <!-- ── HISTORICAL CYCLE COMPARISON ──────────── -->
      ${buildCycleSection()}

      <!-- ── AI MACRO NARRATIVE ────────────────────── -->
      ${buildNarrativeSection()}
    `;
  }

  /* ── 5a. Regime header ─────────────────────────────── */
  function buildRegimeHeader(regime) {
    const flagHTML = regime.flags.map(f =>
      `<span style="font-family:'Orbitron',monospace;font-size:8px;padding:3px 8px;border:1px solid ${regime.color}44;border-radius:2px;color:${regime.color};background:${regime.color}11;">${f}</span>`
    ).join('');

    return `
    <div class="panel" style="border-left:4px solid ${regime.color};margin-bottom:10px;">
      <div style="display:grid;grid-template-columns:auto 1fr auto;gap:20px;align-items:center;">
        <div>
          <div style="font-family:'Orbitron',monospace;font-size:10px;letter-spacing:2px;color:var(--text3);margin-bottom:6px;">MACRO REGIME</div>
          <div style="font-family:'Orbitron',monospace;font-size:28px;font-weight:900;color:${regime.color};line-height:1;">${regime.label}</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${regime.color};margin-top:4px;">SCORE: ${regime.score > 0 ? '+' : ''}${regime.score} / 6</div>
        </div>
        <div>
          <div style="font-size:14px;color:var(--text2);line-height:1.6;margin-bottom:10px;">${regime.desc}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">${flagHTML}</div>
        </div>
        <div style="text-align:center;min-width:80px;">
          <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:4px;">LAST UPDATED</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);">${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:8px;">Data: FRED / BLS<br>Static anchors + live overlay</div>
        </div>
      </div>
    </div>`;
  }

  /* ── 5b. Transition intelligence section ────────────── */
  function buildTransitionSection() {
    const t = TRANSITION;
    const ringR = 36;
    const circumf = 2 * Math.PI * ringR;
    const dash = (t.score / 100) * circumf;

    const cards = t.metrics.map(m => `
      <div class="panel" style="border-top:3px solid ${m.color}88;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <span style="font-size:20px;">${m.icon}</span>
          <div>
            <div style="font-family:'Orbitron',monospace;font-size:10px;letter-spacing:2px;color:${m.color};">${m.name}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="background:rgba(255,51,85,0.06);border:1px solid rgba(255,51,85,0.2);border-radius:3px;padding:10px;">
            <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:#ff3355;margin-bottom:6px;">${m.oldLabel} ⟵</div>
            <div style="font-size:12px;color:var(--text2);line-height:1.5;">${m.oldRead}</div>
          </div>
          <div style="background:rgba(0,204,255,0.06);border:1px solid rgba(0,204,255,0.2);border-radius:3px;padding:10px;">
            <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:${m.color};margin-bottom:6px;">⟶ ${m.newLabel}</div>
            <div style="font-size:12px;color:var(--text2);line-height:1.5;">${m.newRead}</div>
          </div>
        </div>
        <div style="margin-top:8px;padding:6px 10px;background:var(--bg3);border-radius:3px;border-left:2px solid ${m.color};">
          <span style="font-family:'Orbitron',monospace;font-size:9px;color:${m.color};">SIGNAL: </span>
          <span style="font-size:11px;color:var(--text2);">${m.signal}</span>
        </div>
      </div>`).join('');

    return `
    ${sectionHeader('🌍', 'TRANSITION INTELLIGENCE', 'The Old Metrics Are Breaking Down — Here\'s the New Framework')}

    <div class="panel" style="margin-bottom:10px;background:linear-gradient(135deg,rgba(136,85,255,0.08),rgba(0,204,255,0.04));border-color:rgba(136,85,255,0.4);">
      <div style="display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:center;">
        <div style="text-align:center;">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="${ringR}" fill="none" stroke="var(--border)" stroke-width="8"/>
            <circle cx="50" cy="50" r="${ringR}" fill="none" stroke="${t.phaseColor}" stroke-width="8"
              stroke-dasharray="${dash.toFixed(1)} ${circumf.toFixed(1)}"
              stroke-dashoffset="${(circumf * 0.25).toFixed(1)}"
              stroke-linecap="round"/>
            <text x="50" y="46" text-anchor="middle" font-size="16" font-weight="900" fill="${t.phaseColor}" font-family="'Share Tech Mono',monospace">${t.score}%</text>
            <text x="50" y="60" text-anchor="middle" font-size="7" fill="#9090c0" font-family="'Orbitron',monospace">TRANSITION</text>
          </svg>
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:${t.phaseColor};margin-top:2px;">${t.phase}</div>
        </div>
        <div>
          <div style="font-family:'Orbitron',monospace;font-size:11px;color:var(--cyan);margin-bottom:8px;">THE GREAT ECONOMIC TRANSITION</div>
          <div style="font-size:13px;color:var(--text2);line-height:1.7;">
            We are in the <strong style="color:${t.phaseColor};">early innings of a structural economic shift</strong> driven by AI, robotics, and automation.
            The old macroeconomic playbook — built on industrial-era assumptions — is slowly becoming obsolete.
          </div>
          <div style="font-size:13px;color:var(--text2);line-height:1.7;margin-top:8px;">
            Job losses will increasingly reflect <em>advancement</em>, not weakness. Debt will fund transformation, not consumption.
            Deflation and inflation will coexist in different sectors. The panels below track <strong style="color:var(--cyan);">both the old signals and the new ones.</strong>
          </div>
          <div style="display:flex;gap:20px;margin-top:12px;">
            <div style="text-align:center;">
              <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">TIMELINE</div>
              <div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--cyan);">2024 — 2035</div>
            </div>
            <div style="text-align:center;">
              <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">INFLECTION EST.</div>
              <div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${colorUp};">2027 — 2030</div>
            </div>
            <div style="text-align:center;">
              <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">KEY RISK</div>
              <div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${colorDn};">DISPLACEMENT GAP</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      ${cards.slice(0,2).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">
      ${cards.slice(2).join('')}
    </div>`;
  }

  /* ── 5c. Fed / Interest Rates ───────────────────────── */
  function buildFedSection(d) {
    const fr = d.fedRate;
    const rateVals = fr.series.map(s => s.v);
    const rateLabels = fr.series.map(s => s.label);
    const diff = fr.current - fr.target;

    // Dot plot projection bar
    const rateItems = [
      {label:'CURRENT',v:fr.current,color:colorCyan},
      {label:'2026 DOT',v:fr.target,color:colorPurp},
      {label:'NEUTRAL (EST)',v:2.8,color:colorNeu},
    ];

    const dotPlotSVG = (() => {
      const W=280, H=80;
      const maxR=5.5, minR=2.0;
      const px = v => 20 + ((v-minR)/(maxR-minR))*(W-40);
      const items = [
        {v:2.8,label:'Neutral',color:colorNeu},
        {v:fr.target,label:'2026 Target',color:colorPurp},
        {v:fr.current,label:'Current',color:colorCyan},
      ];
      const lines = items.map((it,i) => {
        const x = px(it.v);
        return `
          <line x1="${x}" y1="10" x2="${x}" y2="45" stroke="${it.color}" stroke-width="${i===2?2:1}" stroke-dasharray="${i<2?'4,3':''}"/>
          <circle cx="${x}" cy="45" r="${i===2?6:4}" fill="${it.color}"/>
          <text x="${x}" y="${i%2===0?65:72}" text-anchor="middle" font-size="8" fill="${it.color}" font-family="'Orbitron',monospace">${it.label}</text>
          <text x="${x}" y="${i%2===0?74:81}" text-anchor="middle" font-size="9" fill="${it.color}" font-family="'Share Tech Mono',monospace">${it.v}%</text>`;
      }).join('');
      return `<svg width="100%" viewBox="0 0 ${W} ${H+10}" style="display:block;">
        <line x1="20" y1="45" x2="${W-20}" y2="45" stroke="var(--border)" stroke-width="1.5"/>
        ${[2,3,4,5].map(v=>`<text x="${px(v)}" y="8" text-anchor="middle" font-size="8" fill="var(--dim)" font-family="'Share Tech Mono',monospace">${v}%</text>`).join('')}
        ${lines}
      </svg>`;
    })();

    return `
    ${sectionHeader('🏦', 'INTEREST RATES & FEDERAL RESERVE', `Fed Funds Rate: ${fr.current}% — Next Meeting: ${fr.nextMeeting}`)}

    <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;margin-bottom:10px;">
      <div class="panel">
        <div class="panel-label">⬡ FED FUNDS RATE — HISTORY</div>
        <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:10px;">
          <span style="font-family:'Share Tech Mono',monospace;font-size:36px;font-weight:900;color:${colorCyan};">${fr.current}%</span>
          <span style="font-size:13px;color:var(--text3);">current target</span>
        </div>
        <div id="macrFedChart" style="height:80px;">${sparkline(rateVals,{width:360,height:80,color:colorCyan})}</div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--dim);margin-top:4px;">
          <span>${rateLabels[0]}</span><span>${rateLabels[rateLabels.length-1]}</span>
        </div>
        <div style="font-size:12px;color:var(--text2);margin-top:8px;line-height:1.5;">
          The Fed has held at ${fr.current}% since Q1 2025 after <strong>${fr.hikes} hikes</strong> starting ${fr.cycleStart}. The most aggressive tightening cycle in 40 years.
          Markets currently price <span style="color:${colorCyan};">2–3 cuts</span> by year-end 2026.
        </div>
      </div>

      <div class="panel">
        <div class="panel-label">⬡ RATE TRAJECTORY</div>
        <div style="margin-bottom:12px;">${dotPlotSVG}</div>
        <div style="font-size:11px;color:var(--text3);line-height:1.5;margin-top:8px;">
          Gap to neutral: <span style="color:${colorOrng};">+${diff.toFixed(2)}%</span><br>
          Policy is still <strong style="color:${colorOrng};">restrictive</strong>. Every month above neutral slows growth.
        </div>
      </div>

      <div class="panel">
        <div class="panel-label">⬡ RATE CONTEXT</div>
        ${tile('2Y TREASURY', '4.18%', 'vs 4.25% FFR', colorCyan)}
        <div style="margin:8px 0;"></div>
        ${tile('10Y TREASURY', '4.27%', '+0.09% vs FFR', colorPurp)}
        <div style="margin-top:10px;font-size:11px;color:var(--text3);line-height:1.6;">
          <span style="color:${colorNeu};">Yield curve barely positive.</span><br>
          Near-flat = market doubting prolonged growth.
        </div>
      </div>
    </div>`;
  }

  /* ── 5d. Inflation ──────────────────────────────────── */
  function buildInflationSection(d) {
    const c = d.cpi;
    const vals = c.series.map(s => s.v);
    const toTarget = c.current - c.target;
    const fromPeak = c.current - c.peak;

    const componentData = [
      {label:'SHELTER',v:4.2,color:colorDn},
      {label:'SERVICES',v:3.8,color:colorOrng},
      {label:'FOOD',v:2.1,color:colorNeu},
      {label:'ENERGY',v:-1.2,color:colorUp},
      {label:'GOODS',v:-0.4,color:colorUp},
    ];

    return `
    ${sectionHeader('📈', 'INFLATION', `CPI YoY: ${c.current}% — Core: ${c.core}% — Target: ${c.target}%`)}

    <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;margin-bottom:10px;">
      <div class="panel">
        <div class="panel-label">⬡ CPI YoY — 3 YEAR TREND</div>
        <div style="display:flex;align-items:baseline;gap:16px;margin-bottom:8px;">
          <div>
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">HEADLINE</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:32px;color:${c.current>3?colorDn:c.current<2?colorUp:colorNeu};">${c.current}%</div>
          </div>
          <div>
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">CORE (ex food/energy)</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:20px;color:${colorOrng};">${c.core}%</div>
          </div>
        </div>
        <div id="macrCpiChart">${sparkline(vals,{width:360,height:70,color:colorOrng})}</div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--dim);margin-top:2px;">
          <span>${c.series[0].label}</span>
          <span style="color:${colorDn};">Peak: ${c.peak}%</span>
          <span>${c.series[c.series.length-1].label}</span>
        </div>
        <div style="margin-top:10px;font-size:12px;color:var(--text2);line-height:1.6;">
          CPI has dropped <strong style="color:${colorUp};">${Math.abs(fromPeak).toFixed(1)}pp</strong> from the ${c.peak}% peak but remains
          <strong style="color:${colorOrng};">${toTarget.toFixed(1)}pp above</strong> the Fed's 2% target.
          The "last mile" problem — services inflation sticky even as goods deflate.
        </div>
      </div>

      <div class="panel">
        <div class="panel-label">⬡ COMPONENTS (YoY %)</div>
        <div style="margin-top:8px;">
          ${barChart(componentData.map(c=>({label:c.label,value:c.v,color:c.color,display:(c.v>0?'+':'')+c.v+'%'})),{width:240,barH:14,gap:8})}
        </div>
        <div style="margin-top:10px;font-size:11px;color:var(--text3);line-height:1.5;">
          Shelter remains the stickiest component. Energy and goods are already deflationary — an early glimpse of the AI-era price dynamic.
        </div>
      </div>

      <div class="panel">
        <div class="panel-label">⬡ TRANSITION VIEW</div>
        <div style="padding:10px;background:rgba(255,204,0,0.06);border:1px solid rgba(255,204,0,0.2);border-radius:3px;margin-bottom:8px;">
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:${colorNeu};margin-bottom:4px;">DUAL FORCE MONITOR</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.6;">
            🔻 <strong>Deflationary:</strong> AI lowering production costs in goods, logistics, software<br><br>
            🔺 <strong>Inflationary:</strong> UBI pilots, services wages, housing supply constraints
          </div>
        </div>
        ${gauge(c.current, 0, 10, c.current>3?colorDn:colorNeu, 'CPI vs 0–10% range')}
        ${gauge(c.core, 0, 10, colorOrng, 'Core CPI')}
        <div style="margin-top:8px;font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);">
          TARGET ZONE: <span style="color:${colorUp};">1.8% – 2.2%</span>
        </div>
      </div>
    </div>`;
  }

  /* ── 5e. Growth & Debt ──────────────────────────────── */
  function buildGrowthSection(d) {
    const g = d.gdp;
    const debt = d.debt;
    const gdpVals = g.series.map(s => s.v);

    const debtSeries = [...debt.series, ...debt.projections];
    const debtVals = debtSeries.map(s => s.v);
    const debtLabels = debtSeries.map(s => s.label);

    return `
    ${sectionHeader('📉', 'GDP GROWTH & DEBT', `GDP: ${g.current}% annualized — Debt/GDP: ${debt.ratio}%`)}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <div class="panel">
        <div class="panel-label">⬡ GDP GROWTH (QoQ Annualized %)</div>
        <div style="display:flex;align-items:baseline;gap:16px;margin-bottom:8px;">
          <div>
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">CURRENT</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:32px;color:${g.current>=2?colorUp:g.current>=0?colorNeu:colorDn};">${g.current}%</div>
          </div>
          <div style="font-size:13px;color:var(--text3);">
            Long-run avg: <span style="color:var(--text2);">${g.longRunAvg}%</span><br>
            Prior quarter: <span style="color:var(--text2);">${g.prev}%</span>
          </div>
        </div>
        <div>${sparkline(gdpVals,{width:320,height:80,color:g.current>=0?colorUp:colorDn})}</div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--dim);margin-top:2px;">
          <span>${g.series[0].label}</span><span>${g.series[g.series.length-1].label}</span>
        </div>
        <div style="margin-top:10px;font-size:12px;color:var(--text2);line-height:1.6;">
          Growth has held above the long-run average for 7 consecutive quarters — remarkable given 425bps of rate hikes. This resilience
          is partly AI-driven productivity gains and persistent fiscal stimulus. However, consumer credit stress and lagged rate effects
          could soften H2 2026.
        </div>
      </div>

      <div class="panel">
        <div class="panel-label">⬡ DEBT / GDP — HISTORY + PROJECTIONS</div>
        <div style="display:flex;align-items:baseline;gap:16px;margin-bottom:8px;">
          <div>
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">CURRENT RATIO</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:32px;color:${colorDn};">${debt.ratio}%</div>
          </div>
          <div style="font-size:13px;color:var(--text3);">
            Total debt: <span style="color:var(--text2);">$${fmtT(debt.total)}</span><br>
            Nominal GDP: <span style="color:var(--text2);">$${fmtT(debt.gdpNominal)}</span>
          </div>
        </div>
        <div>${sparkline(debtVals,{width:320,height:80,color:colorDn})}</div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--dim);margin-top:2px;">
          <span>${debtLabels[0]}</span>
          <span style="color:${colorPurp};">— PROJECTED →</span>
          <span>${debtLabels[debtLabels.length-1]}</span>
        </div>
        <div style="margin-top:10px;padding:8px;background:rgba(136,85,255,0.08);border:1px solid rgba(136,85,255,0.25);border-radius:3px;">
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:${colorPurp};margin-bottom:4px;">TRANSITION LENS</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.5;">
            Traditional models flag >100% debt/GDP as dangerous. But if this debt funds AI infrastructure, grid modernization, and
            automation capital — the productivity return could dwarf the cost. Watch the <strong style="color:${colorCyan};">productivity-to-interest-cost ratio</strong>,
            not just the raw debt number.
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ── 5f. Labor Market ───────────────────────────────── */
  function buildLaborSection(d) {
    const u = d.unemployment;
    const uVals = u.series.map(s => s.v);

    const aiRows = u.aiDisplacement.map(item => {
      const riskColor = item.risk==='HIGH' ? colorDn : item.risk==='MED' ? colorOrng : colorUp;
      return `
        <div style="display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid var(--border)33;">
          <div style="font-size:12px;color:var(--text2);">${item.sector}</div>
          <div style="width:80px;height:5px;background:var(--bg3);border-radius:3px;overflow:hidden;">
            <div style="width:${item.pct}%;height:100%;background:${riskColor};border-radius:3px;"></div>
          </div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${riskColor};min-width:40px;text-align:right;">${item.pct}%</div>
        </div>`;
    }).join('');

    return `
    ${sectionHeader('👷', 'LABOR MARKET', `Unemployment: ${u.current}% — U-6 (Broad): ${u.u6}%`)}

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">
      <div class="panel">
        <div class="panel-label">⬡ UNEMPLOYMENT RATE</div>
        <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px;">
          <div style="font-family:'Share Tech Mono',monospace;font-size:36px;color:${u.current>u.naturalRate?colorOrng:colorUp};">${u.current}%</div>
          <div style="font-size:12px;color:var(--text3);">U-3 rate</div>
        </div>
        <div>${sparkline(uVals,{width:220,height:70,color:colorOrng})}</div>
        <div style="margin-top:10px;">
          ${gauge(u.current, 2, 8, u.current>u.naturalRate?colorOrng:colorUp, `vs Natural Rate: ${u.naturalRate}%`)}
          ${gauge(u.u6, 2, 12, colorPurp, `U-6 Broad Rate: ${u.u6}%`)}
        </div>
        <div style="margin-top:10px;font-size:12px;color:var(--text2);line-height:1.5;">
          Labor market remarkably resilient. Pre-2020 low was ${u.pre2020Low}%. Current rate
          <span style="color:${u.current<=u.naturalRate?colorUp:colorOrng};">
          ${u.current<=u.naturalRate ? 'at or below' : 'just above'} the natural rate.</span>
        </div>
      </div>

      <div class="panel" style="grid-column:span 2;">
        <div class="panel-label">⬡ AI DISPLACEMENT RISK BY SECTOR</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <div>
            <div style="font-size:12px;color:var(--text3);margin-bottom:10px;line-height:1.6;">
              % of tasks in each sector estimated to be automatable by AI within <strong style="color:var(--text2);">5–10 years</strong>
              (McKinsey / Goldman Sachs synthesis). This is not the same as job elimination — it's task displacement,
              which reshapes roles rather than deleting them wholesale.
            </div>
            <div>${aiRows}</div>
          </div>
          <div>
            <div style="padding:12px;background:rgba(0,255,136,0.06);border:1px solid rgba(0,255,136,0.2);border-radius:3px;margin-bottom:10px;">
              <div style="font-family:'Orbitron',monospace;font-size:8px;color:${colorUp};margin-bottom:4px;">TRANSITION SIGNAL</div>
              <div style="font-size:12px;color:var(--text2);line-height:1.6;">
                When unemployment rises <em>while</em> productivity rises simultaneously, that is the fingerprint of automation-led displacement —
                NOT a recession signal. Monitor both together.
              </div>
            </div>
            <div style="padding:12px;background:rgba(255,51,85,0.06);border:1px solid rgba(255,51,85,0.2);border-radius:3px;">
              <div style="font-family:'Orbitron',monospace;font-size:8px;color:${colorDn};margin-bottom:4px;">RISK: DISPLACEMENT GAP</div>
              <div style="font-size:12px;color:var(--text2);line-height:1.6;">
                The lag between job displacement and new job creation in AI-era roles could create a multi-year demand deficit.
                This is the core argument for UBI as a bridge mechanism.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ── 5g. Money supply & assets ──────────────────────── */
  function buildAssetsSection(d) {
    const m2 = d.m2;
    const assets = d.assets;
    const m2Vals = m2.series.map(s => s.v);

    const assetTiles = [
      {label:'DXY DOLLAR',v:assets.dxy.v,chg:assets.dxy.chg,color:colorCyan,fmt:'',desc:'Dollar strength. Weak DXY = commodity/EM tailwind.'},
      {label:'GOLD $/OZ',v:assets.gold.v,chg:assets.gold.chg,color:colorNeu,fmt:'$',desc:'Inflation hedge + crisis signal. Near ATH.'},
      {label:'WTI CRUDE',v:assets.oil.v,chg:assets.oil.chg,color:colorOrng,fmt:'$',desc:'Growth proxy. Falling oil = deflationary.'},
      {label:'BITCOIN',v:assets.btc.v,chg:assets.btc.chg,color:colorPurp,fmt:'$',desc:'Risk asset + macro liquidity signal.'},
    ];

    return `
    ${sectionHeader('💵', 'MONEY SUPPLY & CROSS-ASSET', `M2: $${m2.current}T — Gold: $${assets.gold.v.toLocaleString()} — BTC: $${assets.btc.v.toLocaleString()}`)}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <div class="panel">
        <div class="panel-label">⬡ M2 MONEY SUPPLY ($T)</div>
        <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px;">
          <div style="font-family:'Share Tech Mono',monospace;font-size:32px;color:${colorUp};">$${m2.current}T</div>
          <div style="font-size:12px;color:var(--text3);">+$${(m2.current-m2.trough).toFixed(1)}T from trough</div>
        </div>
        <div>${sparkline(m2Vals,{width:320,height:70,color:colorUp})}</div>
        <div style="margin-top:10px;font-size:12px;color:var(--text2);line-height:1.5;">
          M2 contracted sharply in 2022–2023 (rare: only happened 4 times in 90 years), then re-expanded.
          M2 growth leads equity markets by <strong style="color:var(--cyan);">6–12 months</strong>.
          Current trajectory: gradual expansion = neutral-to-bullish signal.
        </div>
        <div style="margin-top:8px;display:flex;gap:12px;">
          <div style="text-align:center;">
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">PEAK</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:14px;color:var(--text2);">$${m2.peak}T</div>
          </div>
          <div style="text-align:center;">
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">TROUGH</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:14px;color:colorDn);">$${m2.trough}T</div>
          </div>
          <div style="text-align:center;">
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">CURRENT</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${colorUp};">$${m2.current}T</div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-label">⬡ CROSS-ASSET SIGNALS</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${assetTiles.map(a => `
            <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:10px;">
              <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:4px;">${a.label}</div>
              <div style="font-family:'Share Tech Mono',monospace;font-size:18px;color:${a.color};">${a.fmt}${a.v.toLocaleString()}</div>
              <div style="font-size:11px;color:${signColor(a.chg)};margin-top:2px;">${a.chg>0?'+':''}${a.chg}%</div>
              <div style="font-size:10px;color:var(--text3);margin-top:4px;line-height:1.4;">${a.desc}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
  }

  /* ── 5h. Productivity ───────────────────────────────── */
  function buildProductivitySection(d) {
    const prod = d.productivity;
    const vals = prod.series.map(s => s.v);

    // projected AI-era productivity scenario
    const projVals = [1.9, 2.1, 2.4, 2.8, 3.2, 3.8, 4.2, 4.6, 4.8, 5.0];
    const projLabels = ['2025','2026','2027','2028','2029','2030','2031','2032','2033','2034'];

    return `
    ${sectionHeader('⚡', 'PRODUCTIVITY & OUTPUT EFFICIENCY', `Output/Hour (YoY): ${prod.current}% — Pre-AI avg: ~1.5%`)}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <div class="panel">
        <div class="panel-label">⬡ LABOR PRODUCTIVITY — HISTORICAL (YoY %)</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:32px;color:${colorUp};margin-bottom:8px;">${prod.current}%</div>
        <div>${sparkline(vals,{width:320,height:70,color:colorUp})}</div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--dim);margin-top:2px;">
          <span>${prod.series[0].label}</span><span>${prod.series[prod.series.length-1].label}</span>
        </div>
        <div style="margin-top:10px;font-size:12px;color:var(--text2);line-height:1.5;">
          US productivity has averaged ~1.5% since 2005. The 2020–2024 uptick coincides with <strong>pandemic-forced automation + early AI adoption</strong>.
          If the 1990s IT productivity boom is a guide, we may be in the early stages of a multi-year step-change.
        </div>
      </div>

      <div class="panel" style="border-color:rgba(0,255,136,0.3);">
        <div class="panel-label" style="color:${colorUp};">⬡ AI-ERA PRODUCTIVITY SCENARIO (2025–2034)</div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:8px;">Projected output/hour growth — base vs AI-acceleration scenario</div>
        <div>${sparkline(projVals,{width:320,height:80,color:colorUp})}</div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--dim);margin-top:2px;">
          <span>${projLabels[0]}</span>
          <span style="color:${colorUp};">AI INFLECTION ZONE</span>
          <span>${projLabels[projLabels.length-1]}</span>
        </div>
        <div style="margin-top:10px;padding:8px;background:rgba(0,255,136,0.06);border:1px solid rgba(0,255,136,0.2);border-radius:3px;">
          <div style="font-size:12px;color:var(--text2);line-height:1.6;">
            Goldman Sachs (2023) modeled <strong style="color:${colorUp};">+1.5% additional annual productivity</strong> from AI over 10 years.
            McKinsey projects <strong style="color:${colorUp};">$2.6–4.4T annual economic value</strong> from generative AI alone.
            The key variable: <em>speed of adoption and policy response</em>.
          </div>
        </div>
        <div style="margin-top:8px;font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);">
          NOTE: This is a scenario model, not a forecast. Adoption risk, regulation, and displacement lag could delay or reduce gains.
        </div>
      </div>
    </div>`;
  }

  /* ── 5i. Historical cycle comparison ────────────────── */
  function buildCycleSection() {
    const cycles = [
      {name:'1994–2000 TECH BOOM',color:'#8855ff',traits:'Low unemployment, rising rates, tech-led productivity surge, mild inflation. Ended in valuation bubble.',relevance:78},
      {name:'2004–2007 CREDIT EXPANSION',color:'#ff8800',traits:'Strong growth, low vol, excess credit, inverted curve in 2006. Ended in GFC.',relevance:42},
      {name:'2010–2018 POST-GFC RECOVERY',color:'#00ccff',traits:'Slow growth, near-zero rates, QE-driven. Longest expansion on record. Ended via tariff shock.',relevance:55},
      {name:'NOW: 2024–2026',color:'#00ff88',traits:'AI-driven growth, high-but-falling rates, sticky core CPI, tight labor, fiscal expansion. UNIQUE: no clear historical analog.',relevance:null},
    ];

    const bars = cycles.slice(0,-1).map(c => `
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-family:'Orbitron',monospace;font-size:9px;color:${c.color};">${c.name}</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${c.color};">${c.relevance}% ANALOG</span>
        </div>
        <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden;margin-bottom:6px;">
          <div style="width:${c.relevance}%;height:100%;background:${c.color};border-radius:3px;"></div>
        </div>
        <div style="font-size:11px;color:var(--text3);line-height:1.4;">${c.traits}</div>
      </div>`).join('');

    return `
    ${sectionHeader('🕰', 'HISTORICAL CYCLE COMPARISON', 'Where does today fit in the macro playbook?')}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <div class="panel">
        <div class="panel-label">⬡ CLOSEST HISTORICAL ANALOGS</div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:12px;">How similar is today's macro regime to past cycles? (composite score)</div>
        ${bars}
      </div>

      <div class="panel" style="border-color:rgba(0,255,136,0.3);">
        <div class="panel-label" style="color:${colorUp};">⬡ WHY THIS CYCLE IS DIFFERENT</div>
        <div style="font-size:13px;color:var(--text2);line-height:1.8;">
          <div style="margin-bottom:8px;padding:6px;border-left:2px solid ${colorCyan};padding-left:10px;">
            <strong style="color:${colorCyan};">1. The productivity wildcard.</strong> Every prior cycle lacked AI as a structural tailwind. Even 5% of Goldman's projected productivity gain would rewrite the growth math.
          </div>
          <div style="margin-bottom:8px;padding:6px;border-left:2px solid ${colorPurp};padding-left:10px;">
            <strong style="color:${colorPurp};">2. Fiscal dominance.</strong> The government is running 6%+ deficits at full employment — behavior historically reserved for recessions. Traditional fiscal brakes aren't engaging.
          </div>
          <div style="margin-bottom:8px;padding:6px;border-left:2px solid ${colorOrng};padding-left:10px;">
            <strong style="color:${colorOrng};">3. Sector bifurcation.</strong> Goods deflating, services inflating, assets appreciating. Traditional CPI aggregates mask structural divergence.
          </div>
          <div style="padding:6px;border-left:2px solid ${colorDn};padding-left:10px;">
            <strong style="color:${colorDn};">4. No clean playbook.</strong> This is genuinely novel. Relying solely on 1970s or 1990s frameworks will lead to mis-reading the signals.
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ── 5j. AI Narrative section ───────────────────────── */
  function buildNarrativeSection() {
    return `
    ${sectionHeader('🤖', 'AI MACRO NARRATIVE', 'Claude synthesizes the current macro environment')}

    <div class="panel" style="border-color:rgba(136,85,255,0.4);margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:11px;color:${colorPurp};">⬡ MACRO INTELLIGENCE BRIEF</div>
        <div id="macroAiStatus" style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text3);">LOADING…</div>
      </div>
      <div id="macroAiText" style="font-size:13px;color:var(--text2);line-height:1.8;min-height:80px;">
        <div style="color:var(--text3);font-style:italic;">Generating macro analysis…</div>
      </div>
      <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;" id="macroAiChips">
        <button onclick="reloadAINarrative()" style="font-family:'Orbitron',monospace;font-size:9px;padding:5px 12px;background:rgba(136,85,255,0.1);border:1px solid rgba(136,85,255,0.4);color:${colorPurp};border-radius:2px;cursor:pointer;">↺ REGENERATE</button>
        <button onclick="loadAINarrativeBull()" style="font-family:'Orbitron',monospace;font-size:9px;padding:5px 12px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.4);color:${colorUp};border-radius:2px;cursor:pointer;">BULL CASE</button>
        <button onclick="loadAINarrativeBear()" style="font-family:'Orbitron',monospace;font-size:9px;padding:5px 12px;background:rgba(255,51,85,0.1);border:1px solid rgba(255,51,85,0.4);color:${colorDn};border-radius:2px;cursor:pointer;">BEAR CASE</button>
        <button onclick="loadAINarrativeTransition()" style="font-family:'Orbitron',monospace;font-size:9px;padding:5px 12px;background:rgba(0,204,255,0.1);border:1px solid rgba(0,204,255,0.4);color:${colorCyan};border-radius:2px;cursor:pointer;">TRANSITION VIEW</button>
      </div>
    </div>`;
  }

  /* ═══════════════════════════════════════════════════════
     6.  LIVE DATA OVERLAY
  ═══════════════════════════════════════════════════════ */

  async function loadLiveData(d) {
    // Attempt to fetch live FRED data and update tiles
    try {
      const [cpiData, fedData, unempData] = await Promise.all([
        fetchFRED('CPIAUCSL', 18),
        fetchFRED('FEDFUNDS', 18),
        fetchFRED('UNRATE', 18),
      ]);

      if (cpiData && cpiData.length > 1) {
        const latest = cpiData[cpiData.length-1].value;
        const prev   = cpiData[cpiData.length-2].value;
        const yoy = ((latest - cpiData[cpiData.length-13]?.value) / cpiData[cpiData.length-13]?.value * 100);
        // Update is cosmetic — annotate with live badge
        const liveEl = document.querySelector('[data-macro-live="cpi"]');
        if (liveEl && yoy) {
          liveEl.textContent = yoy.toFixed(1) + '%';
          liveEl.title = 'Live FRED data';
        }
      }
    } catch(e) {
      // Live fetch failed — static data remains displayed
    }
  }

  /* ═══════════════════════════════════════════════════════
     7.  AI NARRATIVE — Claude API
  ═══════════════════════════════════════════════════════ */

  const MACRO_CONTEXT = () => {
    const d = STATIC;
    return `
Macro data snapshot (Q1 2026):
- Fed Funds Rate: ${d.fedRate.current}% (held since Q1 2025, 11 hikes from Mar 2022)
- CPI YoY: ${d.cpi.current}% (core: ${d.cpi.core}%, target: 2%, peak was ${d.cpi.peak}%)
- GDP (annualized): ${d.gdp.current}% (prev: ${d.gdp.prev}%)
- Unemployment: ${d.unemployment.current}% (U-6: ${d.unemployment.u6}%)
- Debt/GDP: ${d.debt.ratio}% ($${(d.debt.total/1e12).toFixed(1)}T total)
- M2: $${d.m2.current}T
- DXY: ${d.assets.dxy.v}, Gold: $${d.assets.gold.v}, WTI: $${d.assets.oil.v}, BTC: $${d.assets.btc.v.toLocaleString()}
- Labor productivity growth: ${d.productivity.current}% YoY
- Next FOMC: ${d.fedRate.nextMeeting}
- Transition phase: Early — AI displacement beginning, UBI discussion emerging
`.trim();
  };

  async function callClaude(userPrompt) {
    const statusEl = $('macroAiStatus');
    const textEl   = $('macroAiText');
    if (statusEl) statusEl.textContent = 'GENERATING…';
    if (textEl)   textEl.innerHTML = '<div style="color:var(--text3);font-style:italic;">Synthesizing macro intelligence…</div>';

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are a macro analyst for a professional trading terminal. You write in clear, direct prose aimed at experienced market participants. 
You are aware that we are in an economic transition era where AI and automation are beginning to reshape traditional macro relationships.
Do NOT use markdown headers or bullet points. Write in flowing paragraphs. Be specific with numbers from the data provided. Be honest about uncertainty.
Keep your response to 3–4 paragraphs maximum. Tone: analytical, direct, slightly opinionated but grounded.`,
          messages: [{ role: 'user', content: `${MACRO_CONTEXT()}\n\n${userPrompt}` }]
        })
      });

      if (!resp.ok) throw new Error('API error ' + resp.status);
      const data = await resp.json();
      const text = data.content?.map(b => b.text || '').join('') || '';

      if (textEl) {
        textEl.innerHTML = text
          .split('\n\n')
          .map(p => p.trim())
          .filter(Boolean)
          .map(p => `<p style="margin-bottom:12px;">${p}</p>`)
          .join('');
      }
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:var(--green);">✓ GENERATED</span> <span style="color:var(--dim);font-size:9px;">${new Date().toLocaleTimeString()}</span>`;
      }
    } catch(e) {
      if (textEl) textEl.innerHTML = `<div style="color:var(--text3);">Unable to generate AI narrative. Check your connection or API access.<br><small style="opacity:0.6;">${e.message}</small></div>`;
      if (statusEl) statusEl.textContent = 'UNAVAILABLE';
    }
  }

  async function loadAINarrative(d, regime) {
    await callClaude(`Given the macro data above, write a comprehensive briefing on the current macroeconomic environment and what it means for equity markets (particularly SPY/S&P 500). 
Address: the growth/inflation tradeoff, whether the Fed is likely to cut or hold, labor market resilience, and the emerging transition dynamics with AI and automation.
End with one sentence on the primary risk to the base case.`);
  }

  /* ═══════════════════════════════════════════════════════
     8.  GLOBAL CONTROLS (exposed to window for button clicks)
  ═══════════════════════════════════════════════════════ */

  function bindToggles() {
    // Collapse/expand sections — future enhancement
  }

  return {
    init: (function() { let _done=false; return function(){ if(!_done){ _done=true; renderMacro(); } }; })(),
    reload: renderMacro,
    aiBase: () => loadAINarrative(STATIC, calcRegime(STATIC)),
    aiBull: async () => callClaude('Make the strongest possible BULL case for equities given the macro data. What tailwinds support continued market gains? Include the AI productivity story and transition upside.'),
    aiBear: async () => callClaude('Make the strongest possible BEAR case for equities given the macro data. What macro headwinds could derail markets? Include debt sustainability, sticky inflation, and displacement risk.'),
    aiTransition: async () => callClaude('Analyze the macro data specifically through the lens of the AI-era economic transition. How are the traditional metrics (jobs, inflation, debt/GDP, productivity) being distorted by automation? What new metrics should investors watch instead?'),
  };
})();

/* ═══════════════════════════════════════════════════════
   GLOBAL FUNCTIONS — called from HTML buttons
═══════════════════════════════════════════════════════ */
function reloadAINarrative()       { _M.aiBase(); }
function loadAINarrativeBull()     { _M.aiBull(); }
function loadAINarrativeBear()     { _M.aiBear(); }
function loadAINarrativeTransition(){ _M.aiTransition(); }

/* ═══════════════════════════════════════════════════════
   BOOT — hook into existing switchTab mechanism
   Render once when tab is first activated, then cache.
═══════════════════════════════════════════════════════ */
// Boot: switchTab('macro') in dashboard1.js calls _M.init() directly.
// Also trigger on load if macro panel happens to be active.
(function bootMacro() {
  if (document.getElementById('panel-macro')?.classList.contains('active')) {
    setTimeout(() => _M.init(), 200);
  }
})();
