(function(){
let rrThreshold = 2;
window.rrTab = function rrTab(t, btn) {
  rrThreshold = t;
  document.querySelectorAll('.rr-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderRelief();
};
function renderRelief() {
  const el = document.getElementById('rr-content');
  if (!el) return;
  const d = typeof RELIEF_DATA !== 'undefined' ? RELIEF_DATA[String(rrThreshold)] : null;
  if (!d) { el.innerHTML = '<p style="color:var(--text3)">Relief rally data is not loaded.</p>'; return; }
  const fc = n => n >= 0 ? '#00ff88' : '#ff3355';
  const pct = n => n != null ? (n>=0?'+':'')+n.toFixed(1)+'%' : '—';
  const bars = (buckets, colors, valueLabel, valueKey) => {
    const maxCount = Math.max(...buckets.map(b => b.count), 1);
    return buckets.map((b,i) => {
      const c = colors[i] || '#888';
      return `<div style="display:grid;grid-template-columns:150px 1fr 48px 52px 70px;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:${c};text-align:right;">${b.label}</div>
        <div style="height:22px;background:var(--bg3);border-radius:3px;overflow:hidden;"><div style="width:${Math.round(b.count / maxCount * 100)}%;height:100%;background:${c};opacity:0.75;border-radius:3px;"></div></div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${c};text-align:right;font-weight:bold;">${b.count}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--text3);text-align:right;">${b.pct.toFixed(0)}%</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text3);text-align:right;">${valueLabel(b[valueKey])}</div>
      </div>`;
    }).join('');
  };
  const header = (a,b,c,d2,e) => `<div style="display:grid;grid-template-columns:150px 1fr 48px 52px 70px;gap:10px;padding:0 0 6px;border-bottom:1px solid var(--border);margin-bottom:2px;font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;">
      <div style="text-align:right;">${a}</div><div>${b}</div><div style="text-align:right;">${c}</div><div style="text-align:right;">${d2}</div><div style="text-align:right;">${e}</div></div>`;
  const sizeColors = ['#ff3355','#ffcc00','#88cc00','#00ff88','#00ccff'];
  const durColors  = ['#ff8800','#ffcc00','#00ff88','#00ccff'];
  const evRows = d.events.map(e => `<tr>
      <td style="color:var(--text3)">${e.peak_date}</td>
      <td style="color:#ff3355">-${e.drop_pct.toFixed(1)}%</td>
      <td style="color:var(--text3)">${e.days_drop}d</td>
      <td style="color:var(--text3)">${e.trough_date}</td>
      <td style="color:#00ff88">+${e.bounce_pct.toFixed(1)}%</td>
      <td style="color:var(--text3)">${e.days_bounce}d</td>
      <td style="color:${e['1mo'] != null ? fc(e['1mo']) : 'var(--text3)'}">${pct(e['1mo'])}</td>
      <td style="color:${e['3mo'] != null ? fc(e['3mo']) : 'var(--text3)'}">${pct(e['3mo'])}</td>
    </tr>`).join('');
  const range = (RELIEF_DATA.meta && RELIEF_DATA.meta.date_range) ? `${RELIEF_DATA.meta.date_range.start.slice(0,4)}–${RELIEF_DATA.meta.date_range.end.slice(0,4)}` : '';
  el.innerHTML = `
    <div class="rr-stat-grid">
      <div class="rr-stat">
        <div class="rr-stat-lbl">EVENTS (${range})</div>
        <div class="rr-stat-val" style="color:var(--cyan)">${d.count}</div>
        <div class="rr-stat-sub">avg drop ${d.avg_drop}% over ${d.avg_days_drop}d</div>
      </div>
      <div class="rr-stat">
        <div class="rr-stat-lbl">AVG BOUNCE</div>
        <div class="rr-stat-val" style="color:#00ff88">+${d.avg_bounce_pct}%</div>
        <div class="rr-stat-sub">median +${d.med_bounce_pct}% · avg ${d.avg_days_bounce}d</div>
      </div>
      <div class="rr-stat">
        <div class="rr-stat-lbl">FAILED BOUNCES (&lt;2%)</div>
        <div class="rr-stat-val" style="color:#ffcc00">${d.failed_pct.toFixed(0)}%</div>
        <div class="rr-stat-sub">sustained more than 10 days: ${(d.sustained_pct + d.extended_pct).toFixed(1)}%</div>
      </div>
      <div class="rr-stat" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;padding:0;overflow:hidden;">
        ${['1mo','2mo','3mo'].map(k => {
          const f = d.fwd[k];
          if (!f) return `<div style="padding:10px 8px;text-align:center;border-right:1px solid var(--border);"><div class="rr-stat-lbl">${k.toUpperCase()} FWD</div><div class="rr-stat-val" style="font-size:13px">—</div></div>`;
          return `<div style="padding:10px 8px;text-align:center;border-right:1px solid var(--border);"><div class="rr-stat-lbl">${k.toUpperCase()} FWD</div><div class="rr-stat-val" style="font-size:14px;color:${fc(f.avg)}">${pct(f.avg)}</div><div class="rr-stat-sub">${f.win}% win · n=${f.n}</div></div>`;
        }).join('')}
      </div>
    </div>

    <div class="es-section" style="margin-bottom:12px;">BOUNCE SIZE DISTRIBUTION</div>
    <div style="margin-bottom:20px;padding:0 4px;">${header('BOUNCE','FREQUENCY','COUNT','OF TOTAL','AVG DAYS')}${bars(d.size_buckets, sizeColors, v => v != null ? v.toFixed(1)+'d' : '—', 'avg_days')}</div>

    <div class="es-section" style="margin-bottom:12px;">BOUNCE DURATION DISTRIBUTION</div>
    <div style="margin-bottom:20px;padding:0 4px;">${header('DURATION','FREQUENCY','COUNT','OF TOTAL','AVG BOUNCE')}${bars(d.dur_buckets, durColors, v => v != null ? '+'+v.toFixed(1)+'%' : '—', 'avg_bounce')}</div>

    <div class="es-section" style="margin-bottom:8px;">RECENT EVENTS (MOST RECENT FIRST)</div>
    <div style="overflow-x:auto;">
      <table class="rr-evt-table">
        <thead><tr><th>PEAK DATE</th><th>DROP</th><th>DAYS ↓</th><th>TROUGH</th><th>BOUNCE</th><th>DAYS ↑</th><th>+1MO</th><th>+3MO</th></tr></thead>
        <tbody>${evRows}</tbody>
      </table>
    </div>
    <p class="es-foot" style="margin-top:12px;">* Pullback = decline of at least the threshold from a rolling 20-day peak with no single-day rally exceeding 1.5% during the decline. Bounce tracked from the trough until price drops more than 1% from the bounce high or 63 trading days pass. Forward returns measured from the trough close over 21, 42 and 63 trading days.</p>
  `;
}

let esLookback = 'all_time';
window.ES_DATA = ES_DATA;
window.esLookback = esLookback;
function ES() { return ES_DATA[esLookback]; }
function esFmt(n,d=2){const v=parseFloat(n)||0;return `<span class="${v>=0?'up':'dn'}">${v>=0?'+':''}${v.toFixed(d)}%</span>`;}
function esWr(n){const v=parseFloat(n)||0;return `<span class="${v>=65?'up':v>=50?'neu':'dn'}">${v.toFixed(1)}%</span>`;}
function esN(n,d=2){return (parseFloat(n)||0).toFixed(d);}
function mkLB(id){
  const el=document.getElementById(id); if(!el)return;
  el.innerHTML=`<div class="es-lookback">
    <button class="es-lb-btn ${esLookback==='all_time'?'active':''}" onclick="esSetLookback('all_time')">ALL TIME (1993–2026)</button>
    <button class="es-lb-btn ${esLookback==='since_2020'?'active':''}" onclick="esSetLookback('since_2020')">SINCE 2020</button>
    <button class="es-lb-btn ${esLookback==='current_year'?'active':''}" onclick="esSetLookback('current_year')">2026 YTD</button>
  </div>`;
}
function mkMeta(id){
  const el=document.getElementById(id); if(!el)return;
  const m=ES().meta;
  el.textContent=`${m.daily_count.toLocaleString()} days · ${m.weekly_count.toLocaleString()} weeks · ${m.monthly_count} months`;
}
window.esSetLookback=function(lb){
  esLookback=lb; window.esLookback=lb; esRenderAll();
};
window.esSub=function(id,el){
  document.querySelectorAll('.es-subtab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.es-panel').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('es-'+id).classList.add('active');
  if(id==='relief') renderRelief();
  if(id==='wom') { esRenderWOM(); }
};

// ---- DAY OF WEEK ----
const esPM = (v, se, digits) => se != null ? `±${esN(2*se, digits==null?2:digits)}` : '';
const esSep = (a, b) => (a && b && a.se != null && b.se != null) ? Math.abs((a.avg_return ?? a.avg) - (b.avg_return ?? b.avg)) / Math.sqrt(a.se**2 + b.se**2) : null;
const esRankNote = (top, next, what) => { const z = esSep(top, next); return z == null ? '' : z >= 2 ? `${what} leads by more than two standard errors.` : `${what} leads, but the gap to the next is inside two standard errors — the ranking is not established.`; };

function esRenderDOW(){
  mkLB('es-dow-lb'); mkMeta('es-dow-meta');
  const d=ES().day_of_week;
  const maxR=Math.max(...d.map(x=>Math.abs(x.avg_return||0)))||0.1;
  document.getElementById('es-dow-bars').innerHTML=`<div style="display:flex;align-items:flex-end;gap:14px;height:120px;">
    ${d.map(x=>{const h=Math.max((Math.abs(x.avg_return)/maxR)*100,3);const col=x.avg_return>=0?'var(--green)':'var(--red)';
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:120px;justify-content:flex-end;">
        <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${col}">${x.avg_return>=0?'+':''}${esN(x.avg_return,2)}%</span>
        <div style="width:100%;height:${h}px;background:${col};opacity:0.75;border-radius:4px 4px 0 0;"></div>
        <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text3)">${x.day.slice(0,3).toUpperCase()}</span></div>`;}).join('')}
  </div>`;
  document.getElementById('es-dow-tbody').innerHTML=d.map(x=>`<tr>
    <td>${x.day}</td><td>${esFmt(x.avg_return)} <span style="color:var(--text3);font-size:10px;">${esPM(x.avg_return, x.se, 3)}</span></td><td>${esFmt(x.median_return)}</td>
    <td>${esWr(x.win_rate)}</td><td style="color:var(--text3)">$${esN(x.avg_range)}</td>
    <td class="up">+${esN(x.best)}%</td><td class="dn">${esN(x.worst)}%</td>
    <td style="color:var(--text3)">${x.count.toLocaleString()}</td></tr>`).join('');
  document.getElementById('es-dow-context-tbl').innerHTML=`<thead><tr><th>Day</th><th>After Up Day (avg)</th><th>After Down Day (avg)</th><th>Interpretation</th></tr></thead><tbody>
    ${d.map(x=>`<tr><td>${x.day}</td><td>${esFmt(x.after_green_avg)}</td><td>${esFmt(x.after_red_avg)}</td>
      <td style="text-align:left;color:var(--text3);font-size:12px;">${(() => { const diff = (x.after_red_avg||0)-(x.after_green_avg||0); const s2 = x.se != null ? x.se*Math.SQRT2 : null; return s2 != null && Math.abs(diff) > 2*s2 ? (diff > 0 ? 'After a down day the mean is higher — beyond two standard errors' : 'After an up day the mean is higher — beyond two standard errors') : 'Difference inside two standard errors — no established effect'; })()}</td></tr>`).join('')}
    </tbody>`;
  const ds=ES().streaks?.daily||{};
  document.getElementById('es-daily-mom-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">GREEN AFTER GREEN DAY</div><div class="es-card-val ${parseFloat(ds.p_green_after_green||0)>=55?'up':'neu'}">${esN(ds.p_green_after_green||0,1)}%</div><div class="es-card-sub">prob next day up</div></div>
    <div class="es-card"><div class="es-card-label">GREEN AFTER RED DAY</div><div class="es-card-val ${parseFloat(ds.p_green_after_red||0)>=55?'up':'neu'}">${esN(ds.p_green_after_red||0,1)}%</div><div class="es-card-sub">mean reversion signal</div></div>
    <div class="es-card"><div class="es-card-label">MAX DAILY GREEN STREAK</div><div class="es-card-val up">${ds.max_green||0}</div><div class="es-card-sub">consecutive up days</div></div>
    <div class="es-card"><div class="es-card-label">MAX DAILY RED STREAK</div><div class="es-card-val dn">${ds.max_red||0}</div><div class="es-card-sub">consecutive down days</div></div>
    <div class="es-card"><div class="es-card-label">AFTER 2+ GREEN DAYS</div><div class="es-card-val ${(ds.after_2green_avg||0)>=0?'up':'dn'}">${(ds.after_2green_avg||0)>=0?'+':''}${esN(ds.after_2green_avg||0)}%</div><div class="es-card-sub">${esN(ds.after_2green_winrate||0,1)}% win rate</div></div>
    <div class="es-card"><div class="es-card-label">AFTER 2+ RED DAYS</div><div class="es-card-val ${(ds.after_2red_avg||0)>=0?'up':'dn'}">${(ds.after_2red_avg||0)>=0?'+':''}${esN(ds.after_2red_avg||0)}%</div><div class="es-card-sub">${esN(ds.after_2red_winrate||0,1)}% win rate</div></div>`;
}

// ---- WEEK OF MONTH ----
function esRenderWOM(){
  mkLB('es-wom-lb'); mkMeta('es-wom-meta');
  const wom=ES().week_of_month;
  const avgAll=wom.reduce((s,w)=>s+(w.avg_return||0),0)/wom.length;
  const maxR=Math.max(...wom.map(w=>Math.abs(w.avg_return||0)))||0.1;
  document.getElementById('es-wom-bars').innerHTML=`<div style="display:flex;align-items:flex-end;gap:14px;height:110px;">
    ${wom.map(w=>{const h=Math.max((Math.abs(w.avg_return)/maxR)*95,3);const col=(w.avg_return||0)>=0?'var(--green)':'var(--red)';
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:110px;justify-content:flex-end;">
        <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${col}">${(w.avg_return||0)>=0?'+':''}${esN(w.avg_return)}%</span>
        <div style="width:100%;height:${h}px;background:${col};opacity:0.75;border-radius:4px 4px 0 0;"></div>
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text3)">${w.week}</span></div>`;}).join('')}
  </div>`;
  document.getElementById('es-wom-tbody').innerHTML=wom.map(w=>{const e=(w.avg_return||0)-avgAll;
    return `<tr${(w.avg_return||0)===Math.max(...wom.map(x=>x.avg_return||0))?' class="row-highlight"':''}>
      <td>${w.week}</td><td>${esFmt(w.avg_return)}</td><td>${esFmt(w.median_return)}</td>
      <td>${esWr(w.win_rate)}</td>
      <td class="up">+${esN(w.best)}%</td><td class="dn">${esN(w.worst)}%</td>
      <td style="color:var(--text3)">${(w.count||0).toLocaleString()}</td>
      <td>${e>=0?`<span class="up">+${e.toFixed(2)}%</span>`:`<span class="dn">${e.toFixed(2)}%</span>`}</td></tr>`;}).join('');
  const best=wom.reduce((a,b)=>(b.avg_return||0)>(a.avg_return||0)?b:a);
  const worst=wom.reduce((a,b)=>(b.avg_return||0)<(a.avg_return||0)?b:a);
  const _womRanked=[...wom].sort((a,b)=>(b.avg_return||0)-(a.avg_return||0));
  document.getElementById('es-wom-insight').innerHTML=`<strong>${best.week} has the highest mean</strong> (avg <span class="up">+${esN(best.avg_return)}%</span> ${esPM(best.avg_return,best.se)}, ${esN(best.win_rate,1)}% WR); ${esRankNote(_womRanked[0],_womRanked[1],best.week)} Weeks are assigned to the month their Monday falls in. ${best.week} (avg <span class="up">+${esN(best.avg_return)}%</span>, ${esN(best.win_rate,1)}% WR) is the strongest — consistent with institutional rebalancing and 401k inflows hitting at month-start. ${worst.week} (avg ${esFmt(worst.avg_return)}) is the weakest. Edge = <span class="up">+${esN((best.avg_return||0)-(worst.avg_return||0))}%</span> between best and worst week.`;

  // Render the 12-month grid
  renderWOMMonthGrid();
}

// ── WOM EVENT YEAR / LOOKBACK FILTERS ────────────────────────────────────────
const WOM_LOOKBACKS = [
  { label: 'ALL TIME',  key: 'all',     fn: y => true },
  { label: '2020–NOW',  key: 'since2020', fn: y => y >= 2020 },
  { label: '2026 YTD',  key: '2026',    fn: y => y === 2026 },
];
const WOM_FILTERS = [
  { label: 'ALL YEARS',      key: 'all',        fn: y => true },
  { label: 'ELECTION YRS',   key: 'election',   fn: y => [1996,2000,2004,2008,2012,2016,2020,2024].includes(y) },
  { label: 'MIDTERM YRS',    key: 'midterm',    fn: y => [1994,1998,2002,2006,2010,2014,2018,2022].includes(y) },
  { label: 'YEAR 1 (POST-E)',key: 'year1',      fn: y => [1997,2001,2005,2009,2013,2017,2021,2025].includes(y) },
  { label: 'YEAR 3',         key: 'year3',      fn: y => [1999,2003,2007,2011,2015,2019,2023].includes(y) },
  { label: 'BULL YEARS',     key: 'bull',       fn: y => [1995,1996,1997,1998,1999,2003,2009,2010,2012,2013,2014,2016,2017,2019,2020,2021,2023,2024].includes(y) },
  { label: 'BEAR YEARS',     key: 'bear',       fn: y => [2000,2001,2002,2008,2011,2015,2018,2022].includes(y) },
  { label: 'HIGH VOL YRS',   key: 'hivol',      fn: y => [2008,2009,2020,2021,2022].includes(y) },
];

let _womLB = 'all', _womFilter = 'all';

function renderWOMMonthGrid() {
  const grid = document.getElementById('wom-month-grid');
  const lbBtns = document.getElementById('wom-lb-btns');
  const filterBtns = document.getElementById('wom-filter-btns');
  if (!grid) return;

  // Build lookback buttons
  if (lbBtns && !lbBtns.hasChildNodes()) {
    WOM_LOOKBACKS.forEach(lb => {
      const b = document.createElement('button');
      b.textContent = lb.label;
      b.className = 'es-lb-btn' + (lb.key === _womLB ? ' active' : '');
      b.style.cssText = `font-family:'Orbitron',monospace;font-size:8px;padding:4px 10px;background:${lb.key===_womLB?'rgba(0,204,255,0.15)':'transparent'};border:1px solid ${lb.key===_womLB?'var(--cyan)':'var(--border2)'};color:${lb.key===_womLB?'var(--cyan)':'var(--text3)'};border-radius:2px;cursor:pointer;letter-spacing:1px;`;
      b.onclick = () => { _womLB = lb.key; renderWOMMonthGrid(); };
      lbBtns.appendChild(b);
    });
  } else if (lbBtns) {
    lbBtns.querySelectorAll('button').forEach((b, i) => {
      const active = WOM_LOOKBACKS[i].key === _womLB;
      b.style.background = active ? 'rgba(0,204,255,0.15)' : 'transparent';
      b.style.borderColor = active ? 'var(--cyan)' : 'var(--border2)';
      b.style.color = active ? 'var(--cyan)' : 'var(--text3)';
    });
  }

  // Build filter buttons
  if (filterBtns && !filterBtns.hasChildNodes()) {
    WOM_FILTERS.forEach(f => {
      const b = document.createElement('button');
      b.textContent = f.label;
      const active = f.key === _womFilter;
      b.style.cssText = `font-family:'Orbitron',monospace;font-size:8px;padding:3px 8px;background:${active?'rgba(255,204,0,0.12)':'transparent'};border:1px solid ${active?'#ffcc00':'var(--border2)'};color:${active?'#ffcc00':'var(--text3)'};border-radius:2px;cursor:pointer;letter-spacing:1px;`;
      b.onclick = () => { _womFilter = f.key; renderWOMMonthGrid(); };
      filterBtns.appendChild(b);
    });
  } else if (filterBtns) {
    filterBtns.querySelectorAll('button').forEach((b, i) => {
      const active = WOM_FILTERS[i].key === _womFilter;
      b.style.background = active ? 'rgba(255,204,0,0.12)' : 'transparent';
      b.style.borderColor = active ? '#ffcc00' : 'var(--border2)';
      b.style.color = active ? '#ffcc00' : 'var(--text3)';
    });
  }

  const sd = window._sd;
  if (!sd || !sd.length) {
    grid.innerHTML = '<div style="color:var(--text3);padding:20px;">Loading SPY data...</div>';
    return;
  }

  const lbFn = WOM_LOOKBACKS.find(l => l.key === _womLB)?.fn || (y => true);
  const filterFn = WOM_FILTERS.find(f => f.key === _womFilter)?.fn || (y => true);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const WEEKS = ['W1','W2','W3','W4','W5'];

  // Build lookup: date -> close
  const closeMap = {};
  sd.forEach(d => { if (d.close) closeMap[d.date] = d.close; });

  // For each day, classify month + week-of-month, compute weekly return buckets
  // Group by year-month-week, collect Mon open → Fri close returns
  const weekData = {}; // key: `${yr}-${mo}-${wk}` -> {open, close, mo, wk, yr}

  sd.forEach(d => {
    if (!d.date || !d.close || !d.open) return;
    const dt = new Date(d.date + 'T12:00:00');
    const yr = dt.getFullYear();
    const mo = dt.getMonth(); // 0-11
    const dayOfMo = dt.getDate();
    const wk = dayOfMo <= 7 ? 0 : dayOfMo <= 14 ? 1 : dayOfMo <= 21 ? 2 : dayOfMo <= 28 ? 3 : 4;
    const key = `${yr}-${mo}-${wk}`;
    if (!weekData[key]) weekData[key] = { yr, mo, wk, bars: [] };
    weekData[key].bars.push({ date: d.date, open: d.open, close: d.close });
  });

  // For each week bucket, compute weekly return (first bar open → last bar close)
  const weekReturns = []; // {yr, mo, wk, ret}
  Object.values(weekData).forEach(w => {
    if (w.bars.length < 3) return; // skip partial weeks
    w.bars.sort((a, b) => a.date.localeCompare(b.date));
    const open = w.bars[0].open;
    const close = w.bars[w.bars.length - 1].close;
    if (!open || !close) return;
    const ret = (close - open) / open * 100;
    weekReturns.push({ yr: w.yr, mo: w.mo, wk: w.wk, ret });
  });

  // Filter by lookback and event year
  const filtered = weekReturns.filter(w => lbFn(w.yr) && filterFn(w.yr));

  // Aggregate by month × week
  const stats = {}; // [mo][wk] -> {rets:[]}
  for (let mo = 0; mo < 12; mo++) {
    stats[mo] = {};
    for (let wk = 0; wk < 5; wk++) stats[mo][wk] = [];
  }
  filtered.forEach(w => {
    if (stats[w.mo] && stats[w.mo][w.wk] !== undefined) {
      stats[w.mo][w.wk].push(w.ret);
    }
  });

  const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;
  const winRate = arr => arr.length ? arr.filter(v=>v>0).length/arr.length*100 : null;
  const seOf = arr => { if (arr.length < 2) return null; const m = avg(arr); return Math.sqrt(arr.reduce((a,v)=>a+(v-m)**2,0)/(arr.length-1)) / Math.sqrt(arr.length); };
  const MIN_N = 8;

  const buildChart = (mo) => {
    const weeks = [0,1,2,3,4].map(wk => {
      const rets = stats[mo][wk];
      return { label: WEEKS[wk], avg: avg(rets), wr: winRate(rets), n: rets.length, se: seOf(rets) };
    }).filter(w => w.n >= MIN_N);

    if (!weeks.length) return '<div style="color:var(--text3);font-size:11px;padding:8px;">No data</div>';

    const maxAbs = Math.max(...weeks.map(w => Math.abs(w.avg || 0)), 0.1);
    // Fixed viewBox: 200 wide, 80 tall — bars live in rows 10–60, labels above/below
    const VW = 200, VH = 80;
    const barZone = 42; // px height available for bars (rows 12–54)
    const zeroY = 54;   // baseline (zero line)
    const n = weeks.length;
    const barW = Math.min(28, (VW - 16) / n - 6);
    const totalBarW = n * barW + (n - 1) * 6;
    const startX = (VW - totalBarW) / 2;

    const bars = weeks.map((w, i) => {
      const x = startX + i * (barW + 6);
      const col = (w.avg || 0) >= 0 ? '#00ff88' : '#ff3355';
      const pct = Math.abs(w.avg || 0) / maxAbs;
      const bh = Math.max(pct * barZone, 2);
      const by = (w.avg || 0) >= 0 ? zeroY - bh : zeroY;
      const cx = x + barW / 2;
      // value label: above positive bars, below negative bars
      const valY = (w.avg || 0) >= 0 ? by - 2 : by + bh + 8;
      return `
        <rect x="${x.toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" fill="${col}" opacity="0.8" rx="1.5"/>
        <text x="${cx.toFixed(1)}" y="${valY.toFixed(1)}" text-anchor="middle" font-size="7" fill="${col}" font-family="Share Tech Mono,monospace">${(w.avg>=0?'+':'')}${w.avg.toFixed(2)}%</text>
        <text x="${cx.toFixed(1)}" y="${(zeroY+10).toFixed(1)}" text-anchor="middle" font-size="7" fill="var(--text3)" font-family="Orbitron,monospace">${w.label}</text>
        <text x="${cx.toFixed(1)}" y="${(zeroY+18).toFixed(1)}" text-anchor="middle" font-size="6.5" fill="${col}" font-family="Share Tech Mono,monospace">${w.wr.toFixed(0)}%</text>`;
    }).join('');

    return `<svg width="100%" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMid meet" style="display:block;overflow:hidden;">
      <line x1="4" y1="${zeroY}" x2="${VW-4}" y2="${zeroY}" stroke="var(--border2)" stroke-width="0.75"/>
      ${bars}
    </svg>`;
  };

  // Build cumulative line chart for one month
  const buildLine = (mo) => {
    const weeks = [0,1,2,3,4].map(wk => {
      const rets = stats[mo][wk];
      return avg(rets);
    });

    const validWeeks = weeks.map((v,i) => ({v, i})).filter(w => w.v !== null);
    if (validWeeks.length < 2) return '';

    let cum = 0;
    const cumPts = [];
    validWeeks.forEach(w => { cum += w.v; cumPts.push({ i: w.i, v: cum }); });

    const VW = 200, VH = 36;
    const pad = 6;
    const minV = Math.min(...cumPts.map(p=>p.v));
    const maxV = Math.max(...cumPts.map(p=>p.v));
    const range = maxV - minV || 0.1;
    const px = i => pad + (i / 4) * (VW - pad * 2);
    const py = v => (VH - pad) - ((v - minV) / range) * (VH - pad * 2);
    const pts = cumPts.map(p => `${px(p.i).toFixed(1)},${py(p.v).toFixed(1)}`).join(' ');
    const lastCol = cum >= 0 ? '#00ff88' : '#ff3355';
    const lastPt = cumPts[cumPts.length - 1];
    const labelX = px(lastPt.i) > VW * 0.7 ? px(lastPt.i) - 2 : px(lastPt.i) + 2;
    const labelAnchor = px(lastPt.i) > VW * 0.7 ? 'end' : 'start';

    return `<svg width="100%" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMid meet" style="display:block;margin-top:3px;overflow:hidden;">
      <line x1="${pad}" y1="${py(0).toFixed(1)}" x2="${VW-pad}" y2="${py(0).toFixed(1)}" stroke="var(--border2)" stroke-width="0.5" stroke-dasharray="2,2"/>
      <polyline points="${pts}" fill="none" stroke="${lastCol}" stroke-width="1.5" opacity="0.9"/>
      <circle cx="${px(lastPt.i).toFixed(1)}" cy="${py(lastPt.v).toFixed(1)}" r="2" fill="${lastCol}"/>
      <text x="${labelX.toFixed(1)}" y="${(py(lastPt.v)-2).toFixed(1)}" text-anchor="${labelAnchor}" font-size="6.5" fill="${lastCol}" font-family="Share Tech Mono,monospace">${cum>=0?'+':''}${cum.toFixed(2)}%</text>
    </svg>`;
  };

  // Build all 12 month panels
  const totalWeeks = filtered.length;
  const yearSet = [...new Set(filtered.map(w => w.yr))].sort();

  // Helper: narrative for a month
  const buildNarrative = (mo) => {
    const wkStats = [0,1,2,3,4].map(wk => {
      const rets = stats[mo][wk];
      return { wk, avg: avg(rets), wr: winRate(rets), n: rets.length, se: seOf(rets) };
    }).filter(w => w.n >= MIN_N);

    if (wkStats.length < 2) return '';

    const bestW  = wkStats.reduce((a,b) => (b.avg > a.avg ? b : a));
    const worstW = wkStats.reduce((a,b) => (b.avg < a.avg ? b : a));
    const allPos = wkStats.every(w => w.avg > 0);
    const allNeg = wkStats.every(w => w.avg < 0);
    const edge   = (bestW.avg - worstW.avg).toFixed(2);
    const wkName = ['W1','W2','W3','W4','W5'];
    const bestCol  = bestW.avg  >= 0 ? '#00ff88' : '#ff3355';
    const worstCol = worstW.avg >= 0 ? '#00ff88' : '#ff3355';

    const ranked = [...wkStats].sort((a,b)=>b.avg-a.avg);
    const gapSE = (ranked[0].se != null && ranked[1].se != null) ? Math.sqrt(ranked[0].se**2 + ranked[1].se**2) : null;
    const established = gapSE != null && (ranked[0].avg - ranked[1].avg) > 2 * gapSE;
    let pattern = established ? `${wkName[bestW.wk]} leads by more than two standard errors.` : `${wkName[bestW.wk]} has the highest mean, but the gap to ${wkName[ranked[1].wk]} is inside two standard errors.`;
    if (allPos) pattern += ' Every week window is positive on average.';
    if (allNeg) pattern += ' Every week window is negative on average.';

    // Consistency note
    const wrSpread = bestW.wr - worstW.wr;
    const consistency = wrSpread > 30 ? 'High week-to-week variance.' : wrSpread > 15 ? 'Moderate variance across weeks.' : 'Relatively consistent across weeks.';

    return `<div style="margin-top:6px;padding:5px 6px;background:rgba(0,204,255,0.04);border-left:2px solid var(--border2);border-radius:2px;">
      <div style="font-size:8px;color:var(--text2);font-family:'Share Tech Mono',monospace;line-height:1.6;">
        Best: <span style="color:${bestCol};font-weight:bold;">${wkName[bestW.wk]} ${bestW.avg>=0?'+':''}${bestW.avg.toFixed(2)}% · ${bestW.wr.toFixed(0)}%WR</span>
        &nbsp;|&nbsp;
        Worst: <span style="color:${worstCol};">${wkName[worstW.wk]} ${worstW.avg>=0?'+':''}${worstW.avg.toFixed(2)}% · ${worstW.wr.toFixed(0)}%WR</span>
        &nbsp;|&nbsp;
        Edge: <span style="color:var(--cyan);">${edge}%</span>
      </div>
      <div style="font-size:8px;color:var(--text3);font-family:'Share Tech Mono',monospace;margin-top:2px;">${pattern} ${consistency}</div>
    </div>`;
  };

  // Build summary insight across all months for the current filter
  const buildSummary = () => {
    const monthAvgs = MONTHS.map((mon, mo) => {
      const wkStats = [0,1,2,3,4].map(wk => ({ wk, a: avg(stats[mo][wk]), n: stats[mo][wk].length })).filter(w => w.n >= 2);
      const best = wkStats.length ? wkStats.reduce((a,b) => b.a > a.a ? b : a) : null;
      return { mon, mo, best };
    }).filter(m => m.best);

    const w1Months = monthAvgs.filter(m => m.best.wk === 0).map(m => m.mon);
    const w4Months = monthAvgs.filter(m => m.best.wk >= 3).map(m => m.mon);

    // Which week wins most often across all months?
    const wkWins = [0,1,2,3,4].map(wk => monthAvgs.filter(m => m.best.wk === wk).length);
    const topWk = wkWins.indexOf(Math.max(...wkWins));
    const wkName = ['W1 (days 1–7)','W2 (days 8–14)','W3 (days 15–21)','W4 (days 22–28)','W5 (days 29+)'];

    let summary = `Across ${yearSet.length} year${yearSet.length!==1?'s':''} of data, `;
    summary += `<strong style="color:var(--cyan);">${wkName[topWk]}</strong> has the highest mean in the most calendar months (${wkWins[topWk]}/12); a month's cell needs ${MIN_N} or more observations to count. `;
    if (w1Months.length >= 4) summary += `W1 has the highest mean in <strong>${w1Months.join(', ')}</strong>; see each month's note for whether the lead clears two standard errors. `;
    if (w4Months.length >= 3) summary += `Late-month strength shows up in <strong>${w4Months.join(', ')}</strong>. `;
    summary += `Edge labels show avg return spread between best and worst week within each month.`;
    return summary;
  };

  const summaryEl = document.getElementById('wom-summary');
  if (summaryEl) summaryEl.innerHTML = buildSummary();

  grid.innerHTML = MONTHS.map((mon, mo) => {
    const moWeeks = filtered.filter(w => w.mo === mo);

    return `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div style="font-family:'Orbitron',monospace;font-size:10px;letter-spacing:2px;color:var(--cyan);">${mon}</div>
        <div style="font-size:9px;color:var(--text3);font-family:'Share Tech Mono',monospace;">${moWeeks.length}wk · ${yearSet.length}yr</div>
      </div>
      ${buildChart(mo)}
      <div style="font-size:8px;color:var(--text3);margin-top:3px;font-family:'Share Tech Mono',monospace;">win% · cumul drift →</div>
      ${buildLine(mo)}
      ${buildNarrative(mo)}
    </div>`;
  }).join('');
}

// ---- SEASONALITY ----
function esRenderSeasonality(){
  mkLB('es-sea-lb'); mkMeta('es-sea-meta');
  const s=ES().seasonality;
  const maxAbs=Math.max(...s.map(m=>Math.abs(m.avg_return||0)))||0.1;
  document.getElementById('es-season-bars').innerHTML=s.map(m=>{
    const pct=(Math.abs(m.avg_return||0)/maxAbs)*46,pos=(m.avg_return||0)>=0;
    const col=pos?'var(--green)':'var(--red)',wc=(m.win_rate||0)>=65?'var(--green)':(m.win_rate||0)>=55?'var(--yellow)':'var(--red)';
    return `<div class="es-bar-row"><div class="es-bar-lbl">${m.month}</div>
      <div class="es-bar-outer"><div class="es-bar-mid"></div>
        <div class="es-bar-fill ${pos?'pos':'neg'}" style="width:${pct}%"></div></div>
      <div class="es-bar-val" style="color:${col}">${pos?'+':''}${esN(m.avg_return)}%</div>
      <div class="es-wr-pill" style="color:${wc}">${esN(m.win_rate,1)}% WR</div></div>`;}).join('');
  const ranked=[...s].sort((a,b)=>(b.avg_return||0)-(a.avg_return||0));
  document.getElementById('es-season-tbody').innerHTML=s.map(m=>{
    const r=ranked.findIndex(x=>x.month===m.month)+1;
    const b=r===1?' <span class="es-badge top">HIGHEST MEAN</span>':r===12?' <span class="es-badge bot">LOWEST MEAN</span>':'';
    return `<tr>
      <td>${m.month}${b}</td>
      <td>${esFmt(m.avg_return)}</td><td>${esFmt(m.median_return)}</td><td>${esWr(m.win_rate)}</td>
      <td>${esFmt(m.daily_avg)}</td><td>${esWr(m.daily_win_rate)}</td>
      <td style="color:var(--text3)">$${esN(m.avg_vol)}</td>
      <td class="up">+${esN(m.best)}%</td><td class="dn">${esN(m.worst)}%</td>
      <td style="color:var(--text3)">${m.count}</td></tr>`;}).join('');
  const top3=ranked.slice(0,3),bot3=ranked.slice(-3).reverse();
  const _rankNote = esRankNote(ranked[0], ranked[1], ranked[0]?.month); const _rankNoteEl=document.getElementById('es-season-ranknote'); if(_rankNoteEl) _rankNoteEl.textContent=_rankNote;
  document.getElementById('es-season-cards').innerHTML=
    top3.map(m=>`<div class="es-card"><div class="es-card-label">${m.month} · HIGHEST MEANS</div><div class="es-card-val up">+${esN(m.avg_return)}% <span style="font-size:11px;color:var(--text3);">${esPM(m.avg_return,m.se)}</span></div><div class="es-card-sub">${esN(m.win_rate,1)}% monthly WR</div></div>`).join('')+
    bot3.map(m=>`<div class="es-card"><div class="es-card-label">${m.month} · LOWEST MEANS</div><div class="es-card-val ${(m.avg_return||0)>=0?'up':'dn'}">${(m.avg_return||0)>=0?'+':''}${esN(m.avg_return)}% <span style="font-size:11px;color:var(--text3);">${esPM(m.avg_return,m.se)}</span></div><div class="es-card-sub">${esN(m.win_rate,1)}% monthly WR</div></div>`).join('');
}

// ---- QUARTERLY ----
function esRenderQuarterly(){
  mkLB('es-q-lb'); mkMeta('es-q-meta');
  const q=ES().quarterly;
  document.getElementById('es-q-cards').innerHTML=q.map(x=>`
    <div class="es-card"><div class="es-card-label">${x.quarter.split(' ')[0]}</div>
      <div class="es-card-val ${(x.monthly_avg||0)>=0?'up':'dn'}">${(x.monthly_avg||0)>=0?'+':''}${esN(x.monthly_avg)}%</div>
      <div class="es-card-sub">${esN(x.monthly_win_rate,1)}% WR · ${x.monthly_count} months</div></div>`).join('');
  document.getElementById('es-q-tbody').innerHTML=q.map(x=>`<tr>
    <td>${x.quarter}</td>
    <td>${esFmt(x.monthly_avg)}</td><td>${esWr(x.monthly_win_rate)}</td>
    <td>${esFmt(x.daily_avg)}</td><td>${esWr(x.daily_win_rate)}</td>
    <td style="color:var(--text3)">$${esN(x.avg_vol)}</td>
    <td class="up">+${esN(x.best)}%</td><td class="dn">${esN(x.worst)}%</td>
    <td style="color:var(--text3)">${x.monthly_count}</td></tr>`).join('');
  const best=q.reduce((a,b)=>(b.monthly_avg||0)>(a.monthly_avg||0)?b:a);
  const worst=q.reduce((a,b)=>(b.monthly_avg||0)<(a.monthly_avg||0)?b:a);
  document.getElementById('es-q-insight').innerHTML=`<strong>${best.quarter.split(' ')[0]} has the highest mean</strong> — avg <span class="up">+${esN(best.monthly_avg)}%</span> per month, ${esN(best.monthly_win_rate,1)}% win rate, vs <strong>${worst.quarter.split(' ')[0]}</strong> the weakest at ${esFmt(worst.monthly_avg)}/month. Q4 seasonal strength is driven by end-of-year fund positioning, tax considerations, and the Santa Rally window in November. Daily edge in Q4: <span class="up">+${esN(q.find(x=>x.q_num===4)?.daily_avg||0)}%</span>/day vs <span class="${(q.find(x=>x.q_num===3)?.daily_avg||0)>=0?'up':'dn'}">${(q.find(x=>x.q_num===3)?.daily_avg||0)>=0?'+':''}${esN(q.find(x=>x.q_num===3)?.daily_avg||0)}%</span>/day in Q3 (the weakest).`;
}

// ---- YEARLY ----
function esRenderYearly(){
  mkLB('es-yr-lb'); mkMeta('es-yr-meta');
  const ys=ES().yearly_summary;
  document.getElementById('es-yr-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">AVG ANNUAL RETURN</div><div class="es-card-val up">+${esN(ys.avg)}%</div><div class="es-card-sub">${ys.count} years sampled</div></div>
    <div class="es-card"><div class="es-card-label">MEDIAN ANNUAL RETURN</div><div class="es-card-val up">+${esN(ys.median)}%</div><div class="es-card-sub">50th percentile year</div></div>
    <div class="es-card"><div class="es-card-label">ANNUAL WIN RATE</div><div class="es-card-val up">${esN(ys.win_rate,1)}%</div><div class="es-card-sub">% of positive years</div></div>
    <div class="es-card"><div class="es-card-label">BEST YEAR</div><div class="es-card-val up">+${esN(ys.best)}%</div><div class="es-card-sub">single best calendar year</div></div>
    <div class="es-card"><div class="es-card-label">WORST YEAR</div><div class="es-card-val dn">${esN(ys.worst)}%</div><div class="es-card-sub">single worst calendar year</div></div>`;
  document.getElementById('es-yr-grid').innerHTML=(ys.years||[]).map(y=>`
    <div class="es-yr-cell ${y.green?'up':'dn'}">
      <div style="font-family:'Orbitron',monospace;font-size:10px;color:var(--text3)">${y.year}</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${y.green?'var(--green)':'var(--red)'};margin-top:3px">${y.green?'+':''}${esN(y.return)}%</div>
    </div>`).join('');
}

// ---- STREAKS ----
function esRenderStreaks(){
  mkLB('es-str-lb'); mkMeta('es-str-meta');
  const s=ES().streaks;
  const sw=s.weekly||{},sm=s.monthly||{},sy=s.yearly||{},sd=s.daily||{};
  document.getElementById('es-streak-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">DAILY MAX GREEN</div><div class="es-card-val up">${sd.max_green||0}</div><div class="es-card-sub">consecutive up days</div></div>
    <div class="es-card"><div class="es-card-label">DAILY MAX RED</div><div class="es-card-val dn">${sd.max_red||0}</div><div class="es-card-sub">consecutive down days</div></div>
    <div class="es-card"><div class="es-card-label">WEEKLY MAX GREEN</div><div class="es-card-val up">${sw.max_green||0}</div><div class="es-card-sub">consecutive up weeks</div></div>
    <div class="es-card"><div class="es-card-label">WEEKLY MAX RED</div><div class="es-card-val dn">${sw.max_red||0}</div><div class="es-card-sub">consecutive down weeks</div></div>
    <div class="es-card"><div class="es-card-label">MONTHLY MAX GREEN</div><div class="es-card-val up">${sm.max_green||0}</div><div class="es-card-sub">consecutive up months</div></div>
    <div class="es-card"><div class="es-card-label">MONTHLY MAX RED</div><div class="es-card-val dn">${sm.max_red||0}</div><div class="es-card-sub">consecutive down months</div></div>
    <div class="es-card"><div class="es-card-label">YEARLY MAX GREEN</div><div class="es-card-val up">${sy.max_green||0}</div><div class="es-card-sub">consecutive up years</div></div>
    <div class="es-card"><div class="es-card-label">YEARLY MAX RED</div><div class="es-card-val dn">${sy.max_red||0}</div><div class="es-card-sub">consecutive down years</div></div>`;
  document.getElementById('es-momentum-tbl').innerHTML=`<thead><tr><th>Timeframe</th><th>Condition</th><th>Prob Next Green</th><th>Interpretation</th></tr></thead><tbody>
    <tr><td>Daily</td><td>After green day</td><td>${esWr(sd.p_green_after_green||0)}</td><td style="text-align:left;color:var(--text3)">Slight momentum — marginal follow-through edge</td></tr>
    <tr><td>Daily</td><td>After red day</td><td>${esWr(sd.p_green_after_red||0)}</td><td style="text-align:left;color:var(--text3)">Mean reversion — SPY tends to bounce after down days</td></tr>
    <tr><td>Weekly</td><td>After green week</td><td>${esWr(sw.p_green_after_green||0)}</td><td style="text-align:left;color:var(--text3)">${(sw.p_green_after_green||0)>55?'Momentum — positive weekly follow-through':'Near random — weekly direction weakly autocorrelated'}</td></tr>
    <tr><td>Weekly</td><td>After red week</td><td>${esWr(sw.p_green_after_red||0)}</td><td style="text-align:left;color:var(--text3)">${(sw.p_green_after_red||0)>55?'Mean reversion — bounces common after down weeks':'Near random — no significant reversion'}</td></tr>
    <tr><td>Monthly</td><td>After green month</td><td>${esWr(sm.p_green_after_green||0)}</td><td style="text-align:left;color:var(--text3)">Strong momentum — monthly continuation is the dominant edge</td></tr>
    </tbody>`;
  document.getElementById('es-after2g-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">WEEKLY AVG NEXT WEEK</div><div class="es-card-val ${(sw.after_2green_avg||0)>=0?'up':'dn'}">${(sw.after_2green_avg||0)>=0?'+':''}${esN(sw.after_2green_avg||0)}%</div><div class="es-card-sub">after 2+ green weeks</div></div>
    <div class="es-card"><div class="es-card-label">WEEKLY WIN RATE</div><div class="es-card-val neu">${esN(sw.after_2green_winrate||0,1)}%</div><div class="es-card-sub">momentum fades short-term</div></div>
    <div class="es-card"><div class="es-card-label">DAILY AVG NEXT DAY</div><div class="es-card-val ${(sd.after_2green_avg||0)>=0?'up':'dn'}">${(sd.after_2green_avg||0)>=0?'+':''}${esN(sd.after_2green_avg||0)}%</div><div class="es-card-sub">after 2+ green days</div></div>
    <div class="es-card"><div class="es-card-label">DAILY WIN RATE</div><div class="es-card-val neu">${esN(sd.after_2green_winrate||0,1)}%</div><div class="es-card-sub">daily follow-through</div></div>`;
  document.getElementById('es-after2r-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">WEEKLY AVG NEXT WEEK</div><div class="es-card-val up">+${esN(sw.after_2red_avg||0)}%</div><div class="es-card-sub">after 2+ red weeks</div></div>
    <div class="es-card"><div class="es-card-label">WEEKLY WIN RATE</div><div class="es-card-val up">${esN(sw.after_2red_winrate||0,1)}%</div><div class="es-card-sub">mean reversion bounce edge</div></div>
    <div class="es-card"><div class="es-card-label">DAILY AVG NEXT DAY</div><div class="es-card-val ${(sd.after_2red_avg||0)>=0?'up':'dn'}">${(sd.after_2red_avg||0)>=0?'+':''}${esN(sd.after_2red_avg||0)}%</div><div class="es-card-sub">after 2+ red days</div></div>
    <div class="es-card"><div class="es-card-label">DAILY WIN RATE</div><div class="es-card-val up">${esN(sd.after_2red_winrate||0,1)}%</div><div class="es-card-sub">daily bounce probability</div></div>`;
  document.getElementById('es-after3g-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">AVG NEXT WEEK</div><div class="es-card-val ${(sw.after_3green_avg||0)>=0?'up':'dn'}">${(sw.after_3green_avg||0)>=0?'+':''}${esN(sw.after_3green_avg||0)}%</div><div class="es-card-sub">after 3+ green weeks</div></div>
    <div class="es-card"><div class="es-card-label">WIN RATE</div><div class="es-card-val neu">${esN(sw.after_3green_winrate||0,1)}%</div><div class="es-card-sub">extended run then what?</div></div>`;
  document.getElementById('es-after3r-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">AVG NEXT WEEK</div><div class="es-card-val ${(sw.after_3red_avg||0)>=0?'up':'dn'}">${(sw.after_3red_avg||0)>=0?'+':''}${esN(sw.after_3red_avg||0)}%</div><div class="es-card-sub">after 3+ red weeks</div></div>
    <div class="es-card"><div class="es-card-label">WIN RATE</div><div class="es-card-val up">${esN(sw.after_3red_winrate||0,1)}%</div><div class="es-card-sub">capitulation bounce edge</div></div>`;
}

// ---- VOL EDGE ----
function esRenderVolEdge(){
  mkLB('es-vol-lb'); mkMeta('es-vol-meta');
  const v=ES().vol_edge;
  document.getElementById('es-vol-explainer').innerHTML=`<strong>How to read this:</strong> SPY weeks and days are sorted into 5 volatility buckets by True Range (High−Low). <strong>During return</strong> = what SPY did in that period. <strong>Next period avg</strong> = what happened the FOLLOWING week/day. This shows whether high-vol days predict bounces, and whether low-vol periods precede big moves. Risk-adj = avg return ÷ avg true range — higher is more efficient.`;
  const bucketColor=(i)=>['rgba(0,255,136,0.7)','rgba(0,204,255,0.7)','rgba(255,204,0,0.7)','rgba(255,136,0,0.7)','rgba(255,51,85,0.7)'][i];
  const wb=v.weekly_buckets||[];
  document.getElementById('es-wvol-rows').innerHTML=wb.map((b,i)=>`
    <div class="es-vol-bucket" style="background:${i%2?'rgba(255,255,255,0.01)':'transparent'}">
      <div>${b.bucket} <div class="es-vol-bar" style="width:${(i+1)*20}%;background:${bucketColor(i)}"></div></div>
      <div style="color:var(--text3)">${esN(b.threshold_low)}%</div>
      <div style="color:var(--text3)">${esN(b.threshold_high)}%</div>
      <div>${esFmt(b.self_avg)}</div>
      <div>${esWr(b.self_winrate)}</div>
      <div style="color:${(b.after_avg||0)>=0?'var(--green)':'var(--red)'};font-weight:bold">${(b.after_avg||0)>=0?'+':''}${esN(b.after_avg)}%</div>
    </div>`).join('');
  const db=v.daily_buckets||[];
  document.getElementById('es-dvol-rows').innerHTML=db.map((b,i)=>`
    <div class="es-vol-bucket" style="background:${i%2?'rgba(255,255,255,0.01)':'transparent'}">
      <div>${b.bucket} <div class="es-vol-bar" style="width:${(i+1)*20}%;background:${bucketColor(i)}"></div></div>
      <div style="color:var(--text3)">${esN(b.threshold_low)}%</div>
      <div style="color:var(--text3)">${esN(b.threshold_high)}%</div>
      <div>${esFmt(b.self_avg)}</div>
      <div>${esWr(b.self_winrate)}</div>
      <div style="color:${(b.after_avg||0)>=0?'var(--green)':'var(--red)'};font-weight:bold">${(b.after_avg||0)>=0?'+':''}${esN(b.after_avg)}%</div>
    </div>`).join('');
  const wAvgTR=v.weekly_avg_tr||1, dAvgTR=v.daily_avg_tr||1;
  document.getElementById('es-risk-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">WEEKLY RISK-ADJ (AVG)</div><div class="es-card-val neu">${esN(v.risk_adj_all,4)}</div><div class="es-card-sub">return per $1 of weekly range</div></div>
    <div class="es-card"><div class="es-card-label">WEEKLY AVG TRUE RANGE</div><div class="es-card-val neu">$${esN(wAvgTR)}</div><div class="es-card-sub">avg weekly High−Low</div></div>
    <div class="es-card"><div class="es-card-label">DAILY AVG TRUE RANGE</div><div class="es-card-val neu">$${esN(dAvgTR)}</div><div class="es-card-sub">avg daily High−Low</div></div>
    <div class="es-card"><div class="es-card-label">HI-VOL SELF RETURN</div><div class="es-card-val ${(v.hi_vol_self_avg||0)>=0?'up':'dn'}">${(v.hi_vol_self_avg||0)>=0?'+':''}${esN(v.hi_vol_self_avg||0)}%</div><div class="es-card-sub">during high-vol weeks (top 20%)</div></div>`;
  document.getElementById('es-consec-vol-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">NEXT WEEK AVG RETURN</div><div class="es-card-val ${(v.after_consec_hivol_avg||0)>=0?'up':'dn'}">${(v.after_consec_hivol_avg||0)>=0?'+':''}${esN(v.after_consec_hivol_avg||0)}%</div><div class="es-card-sub">after 2+ high-vol weeks in a row</div></div>
    <div class="es-card"><div class="es-card-label">NEXT WEEK WIN RATE</div><div class="es-card-val ${(v.after_consec_hivol_winrate||0)>=55?'up':'neu'}">${esN(v.after_consec_hivol_winrate||0,1)}%</div><div class="es-card-sub">bounce probability elevated</div></div>`;
}

// ---- RECOVERY ----
function esRenderRecovery(){
  mkLB('es-rec-lb'); mkMeta('es-rec-meta');
  const r=ES().recovery;
  const rows=[{l:'-5% or more',k:'dd5'},{l:'-10% or more',k:'dd10'},{l:'-15% or more',k:'dd15'},{l:'-20% or more',k:'dd20'}];
  document.getElementById('es-rec-cards').innerHTML=rows.map(({l,k})=>`
    <div class="es-card"><div class="es-card-label">${l} EVENTS</div>
      <div class="es-card-val neu">${r[k]?.count||0}</div>
      <div class="es-card-sub">median ${r[k]?.median_weeks||0}w recovery</div></div>`).join('');
  document.getElementById('es-rec-tbody').innerHTML=rows.map(({l,k})=>`<tr>
    <td>${l}</td><td style="color:var(--yellow)">${r[k]?.count||0}</td>
    <td style="color:var(--orange)">${r[k]?.avg_weeks||0} wks</td>
    <td style="color:var(--cyan)">${r[k]?.median_weeks||0} wks</td>
    <td style="color:var(--red)">${r[k]?.max_weeks||0} wks</td>
    <td style="color:var(--text3)">${((r[k]?.avg_weeks||0)/4.33).toFixed(1)} mo</td></tr>`).join('');
  const mxW=Math.max(r.dd5?.avg_weeks||0,r.dd10?.avg_weeks||0,r.dd15?.avg_weeks||0,r.dd20?.avg_weeks||0,1);
  document.getElementById('es-rec-visual').innerHTML=rows.map(({l,k})=>`
    <div style="margin-bottom:18px;">
      <div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--text3);margin-bottom:7px;">${l}</div>
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:4px;">
        <span style="font-size:11px;color:var(--text3);width:52px;font-family:'Share Tech Mono',monospace">AVG</span>
        <div style="flex:1;height:9px;background:var(--bg2);border-radius:5px;overflow:hidden;">
          <div style="width:${Math.min((r[k]?.avg_weeks||0)/mxW*100,100)}%;height:100%;background:var(--orange);border-radius:5px;"></div></div>
        <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--orange);width:58px">${r[k]?.avg_weeks||0}w</span>
      </div>
      <div style="display:flex;align-items:center;gap:9px;">
        <span style="font-size:11px;color:var(--text3);width:52px;font-family:'Share Tech Mono',monospace">MEDIAN</span>
        <div style="flex:1;height:9px;background:var(--bg2);border-radius:5px;overflow:hidden;">
          <div style="width:${Math.min((r[k]?.median_weeks||0)/mxW*100,100)}%;height:100%;background:var(--cyan);border-radius:5px;"></div></div>
        <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--cyan);width:58px">${r[k]?.median_weeks||0}w</span>
      </div>
    </div>`).join('');
  document.getElementById('es-rec-insight').innerHTML=`<strong>Key takeaway:</strong> The average recovery time is heavily skewed by a few extreme events (2008, 2020). The <span class="neu">median</span> is far more representative — a -10% drawdown has a median recovery of <span class="cyan" style="color:var(--cyan)">${r.dd10?.median_weeks||0} weeks</span> (${((r.dd10?.median_weeks||0)/4.33).toFixed(1)} months). Note that the average is distorted by multi-year bear markets. In post-2020 data, recoveries have been faster.`;
}

// ---- HOLIDAYS ----
function esRenderHolidays(){
  mkLB('es-hol-lb'); mkMeta('es-hol-meta');
  const h=ES().holidays, s=ES().santa, base=ES().baseline||{}, avg=base.weekly||0, avgDaily=base.daily||0;
  const sw=h.short_week||{}, asw=h.after_short_week||{};
  document.getElementById('es-sw-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">SHORT WEEK AVG RETURN</div><div class="es-card-val ${(sw.avg||0)>=0?'up':'dn'}">${(sw.avg||0)>=0?'+':''}${esN(sw.avg)}%</div><div class="es-card-sub">vs ${avg>=0?'+':''}${esN(avg)}% full week avg</div></div>
    <div class="es-card"><div class="es-card-label">SHORT WEEK WIN RATE</div><div class="es-card-val ${(sw.win_rate||0)>=60?'up':'neu'}">${esN(sw.win_rate,1)}%</div><div class="es-card-sub">${sw.count||0} short weeks sampled</div></div>
    <div class="es-card"><div class="es-card-label">SHORT WEEK EDGE</div><div class="es-card-val ${((sw.avg||0)-avg)>=0?'up':'dn'}">${((sw.avg||0)-avg)>=0?'+':''}${esN((sw.avg||0)-avg)}%</div><div class="es-card-sub">vs average full week</div></div>
    <div class="es-card"><div class="es-card-label">WEEK AFTER SHORT WEEK</div><div class="es-card-val ${(asw.avg||0)>=0?'up':'dn'}">${(asw.avg||0)>=0?'+':''}${esN(asw.avg)}%</div><div class="es-card-sub">${esN(asw.win_rate,1)}% WR · ${asw.count||0} weeks</div></div>`;
  document.getElementById('es-santa-boxes').innerHTML=`
    <div class="es-box"><div class="es-box-label">NOVEMBER <span class="es-badge top">#1 MONTH</span></div>
      <div class="es-box-row"><span class="es-box-lbl">Monthly Avg</span><span class="up">+${esN(s.nov_avg)}%</span></div>
      <div class="es-box-row"><span class="es-box-lbl">Monthly WR</span><span class="up">${esN(s.nov_win,1)}%</span></div>
      <div class="es-box-row"><span class="es-box-lbl">Daily Avg</span>${esFmt(s.nov_daily_avg)}</div>
      <div class="es-box-row"><span class="es-box-lbl">Daily WR</span><span class="${(s.nov_daily_win||0)>=55?'up':'neu'}">${esN(s.nov_daily_win||0,1)}%</span></div></div>
    <div class="es-box"><div class="es-box-label">DECEMBER</div>
      <div class="es-box-row"><span class="es-box-lbl">Monthly Avg</span>${esFmt(s.dec_avg)}</div>
      <div class="es-box-row"><span class="es-box-lbl">Monthly WR</span><span class="neu">${esN(s.dec_win,1)}%</span></div>
      <div class="es-box-row"><span class="es-box-lbl">Daily Avg</span>${esFmt(s.dec_daily_avg)}</div>
      <div class="es-box-row"><span class="es-box-lbl">Daily WR</span><span class="${(s.dec_daily_win||0)>=55?'up':'neu'}">${esN(s.dec_daily_win||0,1)}%</span></div></div>
    <div class="es-box"><div class="es-box-label">NOV+DEC vs REST OF YEAR</div>
      <div class="es-box-row"><span class="es-box-lbl">Nov+Dec Avg</span>${esFmt(s.novdec_avg)}</div>
      <div class="es-box-row"><span class="es-box-lbl">Nov+Dec WR</span><span class="up">${esN(s.novdec_win,1)}%</span></div>
      <div class="es-box-row"><span class="es-box-lbl">Rest of Year Avg</span>${esFmt(s.rest_avg)}</div>
      <div class="es-box-row"><span class="es-box-lbl">Edge</span><span class="up">+${esN((s.novdec_avg||0)-(s.rest_avg||0))}%/mo</span></div></div>`;
  document.getElementById('es-santa-tbl').innerHTML=`<thead><tr><th>Period</th><th>Avg Return</th><th>Win Rate</th><th>vs Rest of Year</th></tr></thead><tbody>
    <tr><td>November</td><td>${esFmt(s.nov_avg)}</td><td>${esWr(s.nov_win)}</td><td><span class="up">+${esN((s.nov_avg||0)-(s.rest_avg||0))}%</span></td></tr>
    <tr><td>December</td><td>${esFmt(s.dec_avg)}</td><td>${esWr(s.dec_win)}</td><td>${esFmt((s.dec_avg||0)-(s.rest_avg||0))}</td></tr>
    <tr><td>Nov+Dec Combined</td><td>${esFmt(s.novdec_avg)}</td><td>${esWr(s.novdec_win)}</td><td><span class="up">+${esN((s.novdec_avg||0)-(s.rest_avg||0))}%</span></td></tr>
    <tr><td>Jan–Oct (Baseline)</td><td>${esFmt(s.rest_avg)}</td><td>${esWr(s.rest_win)}</td><td><span class="neu">BASELINE</span></td></tr>
    </tbody>`;

  const holItems=[
    {k:'thanksgiving',label:'🦃 Thanksgiving Week',w:'thanksgiving_week',d:'thanksgiving_daily',window:'Nov 21–27'},
    {k:'christmas',label:'🎄 Christmas Week',w:'christmas_week',d:'christmas_daily',window:'Dec 21–27'},
    {k:'new_year',label:'🎆 New Year Window',w:'new_year_week',d:'new_year_daily',window:'Dec 28–Jan 3'},
    {k:'july4',label:'🇺🇸 July 4th Week',w:'july4_week',d:'july4_daily',window:'Jul 1–7'},
    {k:'memorial',label:'🪖 Memorial Day Week',w:'memorial_week',d:'memorial_daily',window:'May 24–31'},
    {k:'labor',label:'⚒️ Labor Day Week',w:'labor_week',d:'labor_daily',window:'Sep 1–7'},
    {k:'mlk',label:'✊ MLK Day (daily)',d:'mlk_daily',window:'Jan 15–21'},
    {k:'presidents',label:'🏛️ Presidents Day (daily)',d:'presidents_daily',window:'Feb 15–21'},
  ];
  document.getElementById('es-hol-grid').innerHTML=holItems.map(({label,w,d,window})=>{
    const wd=w?h[w]:null, dd=d?h[d]:null;
    const primary=wd||dd||{};
    const e=primary.avg!=null?primary.avg-(wd?avg:avgDaily):null;
    return `<div class="es-hcard">
      <div class="es-hcard-title">${label}</div>
      <div class="es-hrow"><span class="es-hrow-lbl">${wd?'Weekly':'Daily'} Avg</span><span class="es-hrow-val ${(primary.avg||0)>=0?'up':'dn'}">${(primary.avg||0)>=0?'+':''}${esN(primary.avg)}%</span></div>
      <div class="es-hrow"><span class="es-hrow-lbl">Win Rate</span><span class="es-hrow-val" style="color:${(primary.win_rate||0)>=60?'var(--green)':(primary.win_rate||0)>=50?'var(--yellow)':'var(--red)'}">${esN(primary.win_rate,1)}%</span></div>
      ${dd&&wd?`<div class="es-hrow"><span class="es-hrow-lbl">Daily Avg</span><span class="es-hrow-val ${(dd.avg||0)>=0?'up':'dn'}">${(dd.avg||0)>=0?'+':''}${esN(dd.avg)}%</span></div>`:''}
      <div class="es-hrow"><span class="es-hrow-lbl">Edge vs Avg ${wd?'Week':'Day'}</span><span class="es-hrow-val ${(e||0)>=0?'up':'dn'}">${e==null?'—':(e>=0?'+':'')+esN(e,3)+'%'}</span></div>
      <div style="font-size:10px;color:var(--dim);margin-top:8px;font-family:'Share Tech Mono',monospace">${window} · ${primary.count||0} years</div>
    </div>`;}).join('');

  const seasonalItems=[
    {label:'📉 Tax Loss Harvesting (SELL)',key:'tax_loss_sell',window:'Dec 15–31 daily',desc:'Year-end tax selling pressure'},
    {label:'📈 Tax Loss Bounce (BUY)',key:'tax_loss_buy',window:'Jan 1–10 daily',desc:'Stocks sold in Dec bought back'},
    {label:'🗓️ January Effect',key:'january_effect',window:'First 5 trading days of Jan',desc:'Small-cap / loser rebound'},
    {label:'🌱 Sell in May (May–Oct)',key:'sell_in_may',window:'May–Oct daily avg',desc:'Classic seasonal edge'},
    {label:'🍂 Buy in Nov (Nov–Apr)',key:'buy_in_nov',window:'Nov–Apr daily avg',desc:'Strong half of the year'},
    {label:'⚡ Triple Witching',key:'triple_witching',window:'3rd Fri of Mar/Jun/Sep/Dec',desc:'Options/futures expiry volatility'},
  ];
  document.getElementById('es-seasonal-grid').innerHTML=seasonalItems.map(({label,key,window,desc})=>{
    const x=h[key]||{};
    const e=x.avg!=null?x.avg-avgDaily:null;
    return `<div class="es-hcard">
      <div class="es-hcard-title">${label}</div>
      <div class="es-hrow"><span class="es-hrow-lbl">Avg Return</span><span class="es-hrow-val ${(x.avg||0)>=0?'up':'dn'}">${(x.avg||0)>=0?'+':''}${esN(x.avg)}%</span></div>
      <div class="es-hrow"><span class="es-hrow-lbl">Win Rate</span><span class="es-hrow-val" style="color:${(x.win_rate||0)>=55?'var(--green)':(x.win_rate||0)>=45?'var(--yellow)':'var(--red)'}">${esN(x.win_rate,1)}%</span></div>
      <div class="es-hrow"><span class="es-hrow-lbl">Edge vs Avg Day</span><span class="es-hrow-val ${(e||0)>=0?'up':'dn'}">${e==null?'—':(e>=0?'+':'')+esN(e,3)+'%'}</span></div>
      <div style="font-size:10px;color:var(--dim);margin-top:8px;font-family:'Share Tech Mono',monospace">${window}${key==='triple_witching'?' · SPY goes ex-dividend the same day; the drop includes the dividend':''}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px">${desc}</div>
    </div>`;}).join('');

  // Full detail table
  const allHolRows=[
    {name:'Short Week',w:'short_week',wl:'< 5 trading days'},
    {name:'Thanksgiving',w:'thanksgiving_week',d:'thanksgiving_daily',wl:'Nov 21–27'},
    {name:'Christmas',w:'christmas_week',d:'christmas_daily',wl:'Dec 21–27'},
    {name:'New Year',w:'new_year_week',d:'new_year_daily',wl:'Dec 28–Jan 3'},
    {name:'July 4th',w:'july4_week',d:'july4_daily',wl:'Jul 1–7'},
    {name:'Memorial Day',w:'memorial_week',d:'memorial_daily',wl:'May 24–31'},
    {name:'Labor Day',w:'labor_week',d:'labor_daily',wl:'Sep 1–7'},
    {name:'MLK Day',d:'mlk_daily',wl:'Jan 15–21 daily'},
    {name:'Presidents Day',d:'presidents_daily',wl:'Feb 15–21 daily'},
    {name:'Tax Loss Sell',d:'tax_loss_sell',wl:'Dec 15–31 daily'},
    {name:'Tax Loss Buy',d:'tax_loss_buy',wl:'Jan 1–10 daily'},
    {name:'January Effect',d:'january_effect',wl:'First 5 days of Jan'},
    {name:'Sell in May',d:'sell_in_may',wl:'May–Oct daily'},
    {name:'Buy in Nov',d:'buy_in_nov',wl:'Nov–Apr daily'},
    {name:'Triple Witching',d:'triple_witching',wl:'3rd Fri Mar/Jun/Sep/Dec'},
  ];
  document.getElementById('es-hol-tbody').innerHTML=allHolRows.map(({name,w,d,wl})=>{
    const x=(w?h[w]:null)||(d?h[d]:null)||{};
    const e=x.avg!=null?x.avg-(w?avg:avgDaily):null;
    return `<tr>
      <td>${name}</td><td style="text-align:left;color:var(--text3);font-size:12px">${wl}</td>
      <td>${esFmt(x.avg||0)}</td><td>${esFmt(x.median||0)}</td><td>${esWr(x.win_rate||0)}</td>
      <td style="color:var(--text3)">${x.count||0}</td>
      <td class="up">+${esN(x.best||0)}%</td><td class="dn">${esN(x.worst||0)}%</td>
    </tr>`;}).join('');
}

// ---- DATA RELEASES (v2 — exact dates from release_data.js) ----
let _relType = 'cpi';
let _relLookback = 'all';

const REL_COLORS = { cpi:'#ff8800', nfp:'#00ccff', fomc:'#8855ff' };
const REL_LABELS = { cpi:'CPI', nfp:'NFP', fomc:'FOMC' };

window.relSetLookback = function(lb, btn) {
  _relLookback = lb;
  document.querySelectorAll('#es-releases .rel-lb-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  esRenderReleases();
};

window.relSetType = function(type, btn) {
  _relType = type;
  document.querySelectorAll('#es-releases .rel-type-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  esRenderReleases();
};

function esRenderReleases(){
  if(typeof RELEASE_DATA === 'undefined') {
    const el = document.getElementById('rel-stat-cards');
    if(el) el.innerHTML = '<div class="no-data">Loading release data...</div>';
    return;
  }

  const today = etToday();
  const oneYrAgo = (()=>{const d=new Date(etToday()+'T12:00:00Z'); d.setUTCFullYear(d.getUTCFullYear()-1); return d.toISOString().slice(0,10);})();
  const color = REL_COLORS[_relType];
  const label = REL_LABELS[_relType];

  // Filter by lookback
  let data = RELEASE_DATA[_relType] || [];
  if(_relLookback === '1yr') data = data.filter(d => d.date >= oneYrAgo);
  else if(_relLookback === '2026') data = data.filter(d => d.date.startsWith('2026'));

  // ── Upcoming banner ──────────────────────────────────────────────────────
  const bannerEl = document.getElementById('rel-upcoming-banner');
  if(bannerEl) {
    const upcoming = (RELEASE_DATA.upcoming[_relType] || []).filter(d => d >= today);
    const next = upcoming[0];
    if(next) {
      const nextDate = new Date(next+'T12:00:00');
      const daysAway = Math.ceil((nextDate - new Date()) / (1000*60*60*24));
      bannerEl.innerHTML = `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:${color}15;border:1px solid ${color}44;border-left:4px solid ${color};border-radius:4px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:${color};letter-spacing:1px;">NEXT ${label}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:16px;color:${color};">${next}</div>
        <div style="font-size:12px;color:var(--text3);">${daysAway} calendar days away</div>
        ${upcoming.slice(1,4).length ? `<div style="font-size:11px;color:var(--text3);margin-left:auto;">Also upcoming: ${upcoming.slice(1,4).join(' · ')}</div>` : ''}
      </div>`;
    } else {
      bannerEl.innerHTML = '';
    }
  }

  if(!data.length) {
    document.getElementById('rel-stat-cards').innerHTML = '<div class="no-data">No events in selected period</div>';
    document.getElementById('rel-table-body').innerHTML = '';
    return;
  }

  // ── Aggregate stats ──────────────────────────────────────────────────────
  const n = data.length;
  const avg = arr => arr.reduce((a,b)=>a+b,0)/arr.length;
  const pctUp = (arr, fn) => arr.filter(fn).length/arr.length*100;

  const dayRets   = data.map(d=>d.day_ret);
  const ocRets    = data.filter(d=>d.oc_ret!=null).map(d=>d.oc_ret);
  const dayRanges = data.map(d=>d.range);
  const beforeRets = data.filter(d=>d.before_ret!==null).map(d=>d.before_ret);
  const afterRets  = data.filter(d=>d.after_ret!==null).map(d=>d.after_ret);
  const gaps       = data.map(d=>d.gap);

  const statCards = document.getElementById('rel-stat-cards');
  if(statCards) {
    const stats = [
      { l:'EVENTS',        v: n,                                          sub: `${_relLookback==='all'?'2020–2026':_relLookback==='1yr'?'Last 12 mo':'2026 YTD'}`, c:'var(--text2)' },
      { l:'DAY-OF % UP (OPEN→CLOSE)',   v: pctUp(ocRets,r=>r>0).toFixed(0)+'%',     sub: `avg ${avg(ocRets)>=0?'+':''}${avg(ocRets).toFixed(3)}% · n=${ocRets.length}`, c: pctUp(ocRets,r=>r>0)>55?'#00ff88':pctUp(ocRets,r=>r>0)>45?'#ffcc00':'#ff3355' },
      { l:'AVG DAY RANGE', v: '$'+avg(dayRanges).toFixed(2),             sub: `high–low on event day`, c:'var(--cyan)' },
      { l:'BEFORE 5 DAYS', v: pctUp(beforeRets,r=>r>0).toFixed(0)+'%',  sub: `avg ${avg(beforeRets)>=0?'+':''}${avg(beforeRets).toFixed(3)}%`, c: pctUp(beforeRets,r=>r>0)>55?'#00ff88':'#ff8800' },
      { l:'AFTER 5 DAYS',  v: pctUp(afterRets,r=>r>0).toFixed(0)+'%',   sub: `avg ${avg(afterRets)>=0?'+':''}${avg(afterRets).toFixed(3)}%`, c: pctUp(afterRets,r=>r>0)>55?'#00ff88':'#ff3355' },
      { l:'AVG GAP',       v: (avg(gaps)>=0?'+':'')+avg(gaps).toFixed(3)+'%', sub: `open vs prev close`, c: avg(gaps)>=0?'#00ff88':'#ff3355' },
    ];
    statCards.innerHTML = `<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;">
      ${stats.map(s=>`<div class="panel" style="text-align:center;border-top:3px solid ${s.c};padding:10px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:5px;">${s.l}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:20px;font-weight:bold;color:${s.c};">${s.v}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:3px;">${s.sub}</div>
      </div>`).join('')}
    </div>`;
  }

  // ── Return distribution chart — pure HTML (no canvas offsetWidth issues) ──
  const retCanvas = document.getElementById('relReturnChart');
  if(retCanvas) {
    const buckets = [
      {label:'< −4%', min:-99, max:-4},
      {label:'−4 to −2', min:-4, max:-2},
      {label:'−2 to −1', min:-2, max:-1},
      {label:'−1 to 0',  min:-1, max:0},
      {label:'0 to +1',  min:0,  max:1},
      {label:'+1 to +2', min:1,  max:2},
      {label:'+2 to +4', min:2,  max:4},
      {label:'> +4%',   min:4,  max:99},
    ];
    const counts = buckets.map(b => dayRets.filter(r => r >= b.min && r < b.max).length);
    const maxC = Math.max(...counts, 1);
    const isPos = b => b.min >= 0;
    const BAR_H = 100;
    retCanvas.innerHTML = `<div style="display:flex;align-items:flex-end;gap:3px;height:${BAR_H+30}px;padding:4px 4px 0;">
      ${buckets.map((b,i) => {
        const c = counts[i];
        const h = c ? Math.max(Math.round(c/maxC*BAR_H), 4) : 0;
        const bc = b.min >= 0 ? '#00ff88' : b.max <= 0 ? '#ff3355' : '#ffcc00';
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;height:100%;">
          <div style="font-size:9px;color:rgba(255,255,255,0.6);">${c||''}</div>
          <div style="width:100%;height:${h}px;background:${bc}99;border-radius:2px 2px 0 0;"></div>
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;gap:3px;padding:2px 4px 0;">
      ${buckets.map(b=>`<div style="flex:1;text-align:center;font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--text3);white-space:nowrap;overflow:hidden;">${b.label}</div>`).join('')}
    </div>`;
  }

  // ── Before/Day-Of/After window chart — pure HTML ─────────────────────────
  const winCanvas = document.getElementById('relWindowChart');
  if(winCanvas) {
    const avgB = avg(beforeRets), avgD = avg(dayRets), avgA = avg(afterRets);
    const vals = [
      {l:'5d BEFORE', v:avgB, n:beforeRets.length, wu:pctUp(beforeRets,r=>r>0)},
      {l:'DAY-OF',    v:avgD, n:n,                 wu:pctUp(dayRets,r=>r>0)},
      {l:'5d AFTER',  v:avgA, n:afterRets.length,  wu:pctUp(afterRets,r=>r>0)},
    ];
    const maxAbs = Math.max(...vals.map(v=>Math.abs(v.v)), 0.3);
    const WIN_BAR_H = 90; // max bar height in px
    const midLine = WIN_BAR_H + 10; // baseline y offset — bars go up or down from here
    const totalH = midLine * 2 + 30;
    winCanvas.innerHTML = `<div style="display:flex;gap:12px;align-items:center;justify-content:space-around;height:${totalH}px;padding:8px;">
      ${vals.map(v => {
        const bc = v.v>=0?'#00ff88':'#ff3355';
        const barH = Math.max(Math.abs(v.v)/maxAbs*WIN_BAR_H, 4);
        const isPos = v.v >= 0;
        // Each bar column: fixed height, content laid out with flexbox
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;height:100%;justify-content:center;">
          ${isPos ? `<div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${bc};font-weight:bold;">${v.v>=0?'+':''}${v.v.toFixed(3)}%</div>
          <div style="width:60%;height:${barH.toFixed(0)}px;background:${bc}99;border-radius:4px 4px 0 0;"></div>
          <div style="width:60%;height:2px;background:#444;"></div>
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:${bc};letter-spacing:1px;">${v.l}</div>
          <div style="font-size:10px;color:var(--text3);">${v.wu.toFixed(0)}% up · n=${v.n}</div>`
          : `<div style="font-family:'Orbitron',monospace;font-size:8px;color:${bc};letter-spacing:1px;">${v.l}</div>
          <div style="font-size:10px;color:var(--text3);">${v.wu.toFixed(0)}% up · n=${v.n}</div>
          <div style="width:60%;height:2px;background:#444;"></div>
          <div style="width:60%;height:${barH.toFixed(0)}px;background:${bc}99;border-radius:0 0 4px 4px;"></div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${bc};font-weight:bold;">${v.v.toFixed(3)}%</div>`}
        </div>`;
      }).join('')}
    </div>`;
  }

  // ── Event log table ──────────────────────────────────────────────────────
  const headEl = document.getElementById('rel-table-head');
  const bodyEl = document.getElementById('rel-table-body');
  const tableLabel = document.getElementById('rel-table-label');
  if(tableLabel) tableLabel.textContent = `⬡ ${label} EVENT LOG — ${data.length} EVENTS`;
  if(headEl) {
    const thStyle = `style="padding:6px 8px;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);border-bottom:1px solid var(--border);text-align:right;"`;
    const thStyleL = `style="padding:6px 8px;font-family:'Orbitron',monospace;font-size:8px;color:${color};border-bottom:1px solid var(--border);text-align:left;"`;
    headEl.innerHTML = `<th ${thStyleL}>DATE</th><th ${thStyleL}>NOTES</th>
      <th ${thStyle}>OPEN</th><th ${thStyle}>HIGH</th><th ${thStyle}>LOW</th><th ${thStyle}>CLOSE</th>
      <th ${thStyle}>GAP</th><th ${thStyle}>DAY RETURN</th><th ${thStyle}>DAY RANGE</th>
      <th ${thStyle}>5d BEFORE</th><th ${thStyle}>5d AFTER</th>`;
  }
  if(bodyEl) {
    const fmt2 = v => v != null ? (v>=0?'+':'')+v.toFixed(3)+'%' : '—';
    const clr  = v => v == null ? 'var(--text3)' : v>0?'#00ff88':v<0?'#ff3355':'var(--text2)';
    bodyEl.innerHTML = [...data].reverse().map(d => `<tr style="border-bottom:1px solid var(--border)22;">
      <td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;font-size:11px;color:${color};">${d.date}</td>
      <td style="padding:5px 8px;font-size:10px;color:var(--text3);">${d.notes||'—'}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);">$${d.open.toFixed(2)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:#00ff8888;">$${d.high.toFixed(2)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:#ff335588;">$${d.low.toFixed(2)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:${d.day_ret>=0?'#00ff88':'#ff3355'};">$${d.close.toFixed(2)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:${clr(d.gap)};">${fmt2(d.gap)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:12px;font-weight:bold;color:${clr(d.day_ret)};">${fmt2(d.day_ret)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--cyan);">$${d.range.toFixed(2)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:${clr(d.before_ret)};">${fmt2(d.before_ret)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:${clr(d.after_ret)};">${fmt2(d.after_ret)}</td>
    </tr>`).join('');
  }
}

// ---- POLITICAL CYCLE ----
function esRenderPolitical(){
  // Always uses all_time data — political cycle analysis requires full history
  const p = ES_DATA.political;
  if(!p) return;
  const winC = w => w>=75?'var(--green)':w>=60?'#88cc44':w>=50?'var(--yellow)':'var(--red)';

  const cycles = [
    {k:'year1',   label:'YEAR 1',        sub:'Post-election year', color:'#00ccff'},
    {k:'year3',   label:'YEAR 3',        sub:'Pre-election year',  color:'#00ff88'},
    {k:'election',label:'ELECTION YEAR', sub:'Year 4',             color:'#ffcc00'},
    {k:'midterm', label:'MIDTERM YEAR',  sub:'Year 2',             color:'#ff8800'},
  ];

  // Summary cards
  const sumEl = document.getElementById('es-pol-summary-cards');
  if(sumEl) sumEl.innerHTML = cycles.map(({k,label,sub,color})=>{
    const d=p[k];
    return `<div class="es-card" style="border-top:3px solid ${color};">
      <div class="es-card-label" style="color:${color};">${label}</div>
      <div class="es-card-val ${d.avg>=0?'up':'dn'}" style="font-size:24px;">${d.avg>=0?'+':''}${esN(d.avg)}%</div>
      <div class="es-card-sub"><span style="color:${winC(d.win_rate)}">${d.win_rate}%</span> win rate · ${d.count} yrs</div>
      <div style="font-size:10px;color:var(--text3);margin-top:5px;">${sub} · median ${d.median>=0?'+':''}${esN(d.median)}%</div>
      <div style="font-size:10px;margin-top:3px;">Best <span class="up">+${esN(d.best)}%</span> (${d.best_year}) · Worst <span class="dn">${esN(d.worst)}%</span> (${d.worst_year})</div>
    </div>`;
  }).join('');

  // Bar chart
  const barsEl = document.getElementById('es-pol-bars');
  const maxV = Math.max(...cycles.map(c=>Math.abs(p[c.k].avg)))||1;
  if(barsEl) barsEl.innerHTML = cycles.map(({k,label,color})=>{
    const d=p[k]; const w=Math.abs(d.avg)/maxV*88;
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <span style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;color:${color};width:150px;flex-shrink:0;">${label}</span>
      <div style="flex:1;height:24px;background:var(--bg3);border-radius:3px;overflow:hidden;">
        <div style="width:${w}%;height:100%;background:${color};opacity:0.75;border-radius:3px;"></div>
      </div>
      <span style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${color};width:65px;text-align:right;">${d.avg>=0?'+':''}${esN(d.avg)}%</span>
      <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${winC(d.win_rate)};width:55px;text-align:right;">${d.win_rate}% W</span>
    </div>`;
  }).join('');

  // Year-by-year tables
  const tablesEl = document.getElementById('es-pol-tables');
  if(tablesEl) tablesEl.innerHTML = cycles.map(({k,label,color})=>{
    const d=p[k]; if(!d.years) return '';
    return `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:14px;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1.5px;color:${color};margin-bottom:10px;">${label}</div>
      ${d.years.map(({year,ret})=>`
        <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border);">
          <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--text2);width:40px;">${year}</span>
          <div style="flex:1;height:7px;background:var(--bg3);border-radius:2px;overflow:hidden;">
            <div style="width:${Math.min(Math.abs(ret)/40*100,100)}%;height:100%;background:${ret>=0?'rgba(0,255,136,0.7)':'rgba(255,51,85,0.7)'};${ret<0?'margin-left:auto;':''}border-radius:2px;"></div>
          </div>
          <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${ret>=0?'var(--green)':'var(--red)'};width:65px;text-align:right;">${ret>=0?'+':''}${esN(ret)}%</span>
        </div>`).join('')}
    </div>`;
  }).join('');

  // Party cards
  const partyEl = document.getElementById('es-pol-party-cards');
  if(partyEl) partyEl.innerHTML = `
    <div class="es-card" style="border-top:3px solid #4488ff;">
      <div class="es-card-label" style="color:#4488ff;">🔵 DEMOCRATIC PRESIDENCY</div>
      <div class="es-card-val up">+${esN(p.dem.avg)}%</div>
      <div class="es-card-sub"><span style="color:${winC(p.dem.win_rate)}">${p.dem.win_rate}%</span> win rate · ${p.dem.count} yrs</div>
      <div style="font-size:10px;color:var(--text3);margin-top:5px;">Clinton 1993–2000 · Obama 2009–2016 · Biden 2021–2024</div>
      <div style="font-size:10px;margin-top:3px;">Best <span class="up">+${esN(p.dem.best)}%</span> · Worst <span class="dn">${esN(p.dem.worst)}%</span></div>
    </div>
    <div class="es-card" style="border-top:3px solid #ff4444;">
      <div class="es-card-label" style="color:#ff4444;">🔴 REPUBLICAN PRESIDENCY</div>
      <div class="es-card-val up">+${esN(p.rep.avg)}%</div>
      <div class="es-card-sub"><span style="color:${winC(p.rep.win_rate)}">${p.rep.win_rate}%</span> win rate · ${p.rep.count} yrs</div>
      <div style="font-size:10px;color:var(--text3);margin-top:5px;">Bush 2001–2008 · Trump 2017–2020 · Trump 2025+</div>
      <div style="font-size:10px;margin-top:3px;">Best <span class="up">+${esN(p.rep.best)}%</span> · Worst <span class="dn">${esN(p.rep.worst)}%</span></div>
    </div>
    <div class="es-card">
      <div class="es-card-label">⚠️ CONTEXT</div>
      <div class="es-card-val neu" style="font-size:14px;line-height:1.3;">Correlation ≠ Causation</div>
      <div style="font-size:10px;color:var(--text3);margin-top:8px;line-height:1.5;">The Dem/Rep gap is largely explained by <em>when</em> each party was in power — dot-com bust + GFC both fell on Republican terms. Markets respond to rates, earnings, and cycles — not party affiliation.</div>
    </div>`;

  // Q4 cards
  const q4El = document.getElementById('es-pol-q4-cards');
  if(q4El) q4El.innerHTML = [
    {k:'year1_q4',   label:'YEAR 1 Q4',   color:'#00ccff'},
    {k:'year3_q4',   label:'YEAR 3 Q4',   color:'#00ff88'},
    {k:'midterm_q4', label:'MIDTERM Q4',  color:'#ff8800'},
    {k:'election_q4',label:'ELECTION Q4', color:'#ffcc00'},
  ].map(({k,label,color})=>{
    const d=p[k];
    return `<div class="es-card" style="border-top:3px solid ${color};">
      <div class="es-card-label" style="color:${color};">${label}</div>
      <div class="es-card-val ${d.avg>=0?'up':'dn'}">${d.avg>=0?'+':''}${esN(d.avg)}%</div>
      <div class="es-card-sub"><span style="color:${winC(d.win_rate)}">${d.win_rate}%</span> win rate · ${d.count} yrs</div>
      <div style="font-size:10px;color:var(--text3);margin-top:4px;">Oct–Dec performance</div>
    </div>`;
  }).join('');
}

function esRenderAll(){
  esRenderDOW(); esRenderWOM(); esRenderSeasonality(); esRenderQuarterly();
  esRenderYearly(); esRenderStreaks(); esRenderVolEdge(); esRenderRecovery(); esRenderHolidays();
  if(typeof renderDeclines==='function') renderDeclines();
  esRenderReleases(); esRenderPolitical();
}
esRenderAll();

// ── EVENTS TAB helpers ──────────────────────────────────────────────────────
window.evSub = function(id, el) {
  document.querySelectorAll('#panel-events .es-subtab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#panel-events .es-panel').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('ev-' + id).classList.add('active');
  if (id === 'holidays') renderEvHolidays();
  if (id === 'releases') renderEvReleases();
};

window.renderEvHolidays = function() {
  esRenderHolidays();
  const copy = (from, to) => { const s=document.getElementById(from),d=document.getElementById(to); if(s&&d) d.innerHTML=s.innerHTML; };
  copy('es-sw-cards','ev-sw-cards'); copy('es-santa-boxes','ev-santa-boxes');
  copy('es-santa-tbl','ev-santa-tbl'); copy('es-hol-grid','ev-hol-grid');
  copy('es-seasonal-grid','ev-seasonal-grid'); copy('es-hol-tbody','ev-hol-tbody');
  const lbEl=document.getElementById('ev-hol-lb');
  if(lbEl) lbEl.innerHTML=`<div class="es-lookback">
    <button class="es-lb-btn ${esLookback==='all_time'?'active':''}" onclick="esSetLookback('all_time');renderEvHolidays();">ALL TIME</button>
    <button class="es-lb-btn ${esLookback==='since_2020'?'active':''}" onclick="esSetLookback('since_2020');renderEvHolidays();">SINCE 2020</button>
    <button class="es-lb-btn ${esLookback==='current_year'?'active':''}" onclick="esSetLookback('current_year');renderEvHolidays();">2026 YTD</button>
  </div>`;
  const metaEl=document.getElementById('ev-hol-meta');
  if(metaEl){const m=ES().meta;metaEl.textContent=`${m.daily_count.toLocaleString()} days`;}
};

let _evRelLookback='all', _evRelType='cpi';
window.evRelLookback = function(lb,btn) {
  _relLookback=lb; // sync the underlying variable
  document.querySelectorAll('#ev-releases .rel-lb-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  // also sync the hidden es-releases buttons so esRenderReleases reads correct state
  document.querySelectorAll('#es-releases .rel-lb-btn').forEach((b,i)=>{
    const lbs=['all','1yr','2026'];
    b.classList.toggle('active', lbs[i]===lb);
  });
  renderEvReleases();
};
window.evRelType = function(type,btn) {
  _relType=type; // sync underlying variable
  document.querySelectorAll('#ev-releases .rel-type-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  // sync hidden es-releases type buttons
  ['cpi','nfp','fomc'].forEach(t=>{
    const b=document.getElementById('reltab-'+t);
    if(b) b.classList.toggle('active',t===type);
  });
  renderEvReleases();
};

window.renderEvReleases = function() {
  esRenderReleases();
  // Sync ev lookback button active state to match current _relLookback
  const lbMap={'all':'ev-rel-lb-all','1yr':'ev-rel-lb-1yr','2026':'ev-rel-lb-2026'};
  Object.entries(lbMap).forEach(([lb,id])=>{
    const b=document.getElementById(id);
    if(b) b.classList.toggle('active', (typeof _relLookback!=='undefined'?_relLookback:'all')===lb);
  });
  // Sync ev type button active state
  ['cpi','nfp','fomc'].forEach(t=>{
    const b=document.getElementById('ev-reltab-'+t);
    if(b) b.classList.toggle('active',(typeof _relType!=='undefined'?_relType:'cpi')===t);
  });
  const copy=(from,to)=>{const s=document.getElementById(from),d=document.getElementById(to);if(s&&d)d.innerHTML=s.innerHTML;};
  copy('rel-stat-cards','ev-stat-cards');
  copy('rel-upcoming-banner','ev-upcoming-banner');
  copy('rel-table-head','ev-table-head');
  copy('rel-table-body','ev-table-body');
  copy('relReturnChart','evReturnChart2');
  copy('relWindowChart','evWindowChart2');
  const l1=document.getElementById('ev-chart-label'),s1=document.getElementById('rel-chart-label');
  if(l1&&s1) l1.textContent=s1.textContent;
  const l2=document.getElementById('ev-table-label'),s2=document.getElementById('rel-table-label');
  if(l2&&s2) l2.textContent=s2.textContent;
};

window.vsSubTab = function(id,el) {
  document.querySelectorAll('#panel-volstats .es-subtab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
};

// Render releases on first events tab open
window.renderEvReleases();

})();
