// ─── SPY OPTIONS TRADE JOURNAL ─────────────────────────────────────────────
// Persists to localStorage under key 'spyTradeJournal'

(function() {

const STORE_KEY = 'spyTradeJournal';
let _trades = [];
let _sortKey = 'date';
let _sortDir = -1; // -1 = desc, 1 = asc
let _direction = 'CALL';
let _outcome = 'OPEN';
let _pnlChart = null;

// ── Persistence ──────────────────────────────────────────────────────────────

function tjLoad() {
  try { _trades = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch(e) { _trades = []; }
}

function tjSave() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(_trades)); } catch(e) {}
}

// ── Form helpers ─────────────────────────────────────────────────────────────

window.tjSetDir = function(dir) {
  _direction = dir;
  const callBtn = document.getElementById('tj_dir_call');
  const putBtn  = document.getElementById('tj_dir_put');
  if (!callBtn || !putBtn) return;
  if (dir === 'CALL') {
    callBtn.style.cssText = 'flex:1;padding:7px 4px;font-family:\'Orbitron\',monospace;font-size:9px;border-radius:3px;cursor:pointer;background:var(--green);color:#000;border:none;font-weight:bold;';
    putBtn.style.cssText  = 'flex:1;padding:7px 4px;font-family:\'Orbitron\',monospace;font-size:9px;border-radius:3px;cursor:pointer;background:var(--bg3);color:var(--text3);border:1px solid var(--border);';
  } else {
    putBtn.style.cssText  = 'flex:1;padding:7px 4px;font-family:\'Orbitron\',monospace;font-size:9px;border-radius:3px;cursor:pointer;background:var(--red);color:#000;border:none;font-weight:bold;';
    callBtn.style.cssText = 'flex:1;padding:7px 4px;font-family:\'Orbitron\',monospace;font-size:9px;border-radius:3px;cursor:pointer;background:var(--bg3);color:var(--text3);border:1px solid var(--border);';
  }
};

window.tjSetOutcome = function(out) {
  _outcome = out;
  const btns = { WIN: 'tj_out_win', LOSS: 'tj_out_loss', BE: 'tj_out_be', OPEN: 'tj_out_open' };
  const colors = { WIN: 'var(--green)', LOSS: 'var(--red)', BE: 'var(--yellow)', OPEN: 'var(--cyan)' };
  Object.entries(btns).forEach(([k, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (k === out) {
      el.style.background = colors[k];
      el.style.color = '#000';
      el.style.border = 'none';
      el.style.fontWeight = 'bold';
    } else {
      el.style.background = 'var(--bg3)';
      el.style.color = 'var(--text3)';
      el.style.border = '1px solid var(--border)';
      el.style.fontWeight = 'normal';
    }
  });
};

function tjGetVal(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

window.tjClearForm = function() {
  ['tj_date','tj_time','tj_strike','tj_expiry','tj_entry','tj_exit','tj_qty','tj_spy_price','tj_notes','tj_lesson'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const setupEl = document.getElementById('tj_setup');
  if (setupEl) setupEl.value = '';
  const typeEl = document.getElementById('tj_type');
  if (typeEl) typeEl.value = 'Buy to Open';
  tjSetDir('CALL');
  tjSetOutcome('OPEN');
  // prefill today's date
  tjPrefillDate();
};

function tjPrefillDate() {
  const dateEl = document.getElementById('tj_date');
  if (dateEl && !dateEl.value) {
    const now = new Date();
    // display in CT — offset from UTC
    const ct = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    dateEl.value = ct.toISOString().slice(0,10);
  }
  const timeEl = document.getElementById('tj_time');
  if (timeEl && !timeEl.value) {
    const ct = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    timeEl.value = ct.toTimeString().slice(0,5);
  }
  // auto-fill spy price from live data if available
  const spyEl = document.getElementById('tj_spy_price');
  if (spyEl && !spyEl.value) {
    // try to grab live price from the dashboard
    const priceEl = document.querySelector('.spy-price');
    if (priceEl) {
      const raw = priceEl.textContent.replace(/[^0-9.]/g,'');
      if (raw) spyEl.value = raw;
    }
  }
}

// ── Add trade ─────────────────────────────────────────────────────────────────

window.tjAddTrade = function() {
  const date    = tjGetVal('tj_date');
  const time    = tjGetVal('tj_time');
  const strike  = parseFloat(tjGetVal('tj_strike'));
  const expiry  = tjGetVal('tj_expiry');
  const entry   = parseFloat(tjGetVal('tj_entry'));
  const exitRaw = tjGetVal('tj_exit');
  const exit    = exitRaw !== '' ? parseFloat(exitRaw) : null;
  const qty     = parseInt(tjGetVal('tj_qty') || '1', 10) || 1;
  const spyPx   = parseFloat(tjGetVal('tj_spy_price')) || null;
  const setup   = tjGetVal('tj_setup');
  const type    = tjGetVal('tj_type');
  const notes   = tjGetVal('tj_notes');
  const lesson  = tjGetVal('tj_lesson');

  if (!date) { alert('Date is required.'); return; }
  if (isNaN(entry) || entry <= 0) { alert('Entry price is required.'); return; }

  // P&L per contract = (exit - entry) * 100  [for long options; flip for shorts]
  const isSell = type && (type.includes('Sell to Open') || type.includes('Sell to Close'));
  let pnl = null;
  if (exit !== null && !isNaN(exit)) {
    pnl = isSell
      ? (entry - exit) * 100 * qty
      : (exit - entry) * 100 * qty;
  }

  // pnl% relative to cost basis
  const cost = entry * 100 * qty;
  const pnlPct = (pnl !== null && cost > 0) ? (pnl / cost * 100) : null;

  const trade = {
    id:        Date.now() + Math.random(),
    date, time,
    direction: _direction,
    type,
    strike:    isNaN(strike) ? null : strike,
    expiry,
    entry,
    exit,
    qty,
    spyPx,
    setup,
    outcome:   _outcome,
    notes,
    lesson,
    pnl,
    pnlPct,
  };

  _trades.unshift(trade);
  tjSave();
  tjRender();
  tjClearForm();
};

// ── Edit (inline exit price update) ──────────────────────────────────────────

window.tjUpdateExit = function(id, newExit) {
  const t = _trades.find(t => t.id === id);
  if (!t) return;
  const exit = parseFloat(newExit);
  if (isNaN(exit)) return;
  t.exit = exit;
  const isSell = t.type && (t.type.includes('Sell to Open') || t.type.includes('Sell to Close'));
  t.pnl = isSell ? (t.entry - exit) * 100 * t.qty : (exit - t.entry) * 100 * t.qty;
  const cost = t.entry * 100 * t.qty;
  t.pnlPct = cost > 0 ? (t.pnl / cost * 100) : null;
  if (t.outcome === 'OPEN') {
    t.outcome = t.pnl >= 0 ? (t.pnl === 0 ? 'BE' : 'WIN') : 'LOSS';
  }
  tjSave();
  tjRender();
};

window.tjDeleteTrade = function(id) {
  _trades = _trades.filter(t => t.id !== id);
  tjSave();
  tjRender();
};

window.tjClearAll = function() {
  if (!confirm('Delete ALL trade journal entries? This cannot be undone.')) return;
  _trades = [];
  tjSave();
  tjRender();
};

// ── Sort ──────────────────────────────────────────────────────────────────────

window.tjSortBy = function(key) {
  if (_sortKey === key) _sortDir *= -1;
  else { _sortKey = key; _sortDir = -1; }
  tjRender();
};

function tjSort(arr) {
  return [...arr].sort((a, b) => {
    let va = a[_sortKey], vb = b[_sortKey];
    if (_sortKey === 'date') { va = (a.date + a.time); vb = (b.date + b.time); }
    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;
    if (typeof va === 'string') return _sortDir * va.localeCompare(vb);
    return _sortDir * (va - vb);
  });
}

// ── Filter ────────────────────────────────────────────────────────────────────

window.tjClearFilters = function() {
  ['tj_filt_dir','tj_filt_outcome','tj_filt_setup'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const s = document.getElementById('tj_filt_search'); if (s) s.value = '';
  tjRender();
};

function tjFiltered() {
  const dir     = (document.getElementById('tj_filt_dir')     || {}).value || '';
  const outcome = (document.getElementById('tj_filt_outcome') || {}).value || '';
  const setup   = (document.getElementById('tj_filt_setup')   || {}).value || '';
  const search  = ((document.getElementById('tj_filt_search') || {}).value || '').toLowerCase();
  return _trades.filter(t => {
    if (dir && t.direction !== dir) return false;
    if (outcome && t.outcome !== outcome) return false;
    if (setup && t.setup !== setup) return false;
    if (search && !(
      (t.notes||'').toLowerCase().includes(search) ||
      (t.lesson||'').toLowerCase().includes(search) ||
      (t.setup||'').toLowerCase().includes(search) ||
      String(t.strike||'').includes(search)
    )) return false;
    return true;
  });
}

// ── Summary strip ─────────────────────────────────────────────────────────────

function tjRenderSummary(filtered) {
  const el = document.getElementById('tjSummaryStrip');
  if (!el) return;

  const closed = filtered.filter(t => t.pnl !== null);
  const wins   = closed.filter(t => t.pnl > 0);
  const losses = closed.filter(t => t.pnl < 0);
  const totalPnl = closed.reduce((a, t) => a + t.pnl, 0);
  const winRate = closed.length ? (wins.length / closed.length * 100) : 0;
  const avgWin  = wins.length   ? wins.reduce((a,t)=>a+t.pnl,0)   / wins.length   : 0;
  const avgLoss = losses.length ? losses.reduce((a,t)=>a+t.pnl,0) / losses.length : 0;
  const rr = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : null;
  const profitFactor = losses.length && Math.abs(losses.reduce((a,t)=>a+t.pnl,0)) > 0
    ? wins.reduce((a,t)=>a+t.pnl,0) / Math.abs(losses.reduce((a,t)=>a+t.pnl,0))
    : null;

  const pnlColor = totalPnl >= 0 ? 'var(--green)' : 'var(--red)';
  const wrColor  = winRate >= 50 ? 'var(--green)' : 'var(--red)';
  const fmt$ = v => (v >= 0 ? '+' : '') + '$' + v.toFixed(0);

  function box(label, val, color) {
    return `<div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:8px 10px;text-align:center;">
      <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">${label}</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:16px;font-weight:bold;color:${color};">${val}</div>
    </div>`;
  }

  el.innerHTML =
    box('TOTAL P&amp;L', fmt$(totalPnl), pnlColor) +
    box('WIN RATE', closed.length ? winRate.toFixed(0)+'%' : '—', wrColor) +
    box('TRADES', filtered.length + (filtered.filter(t=>t.outcome==='OPEN').length ? ' ('+filtered.filter(t=>t.outcome==='OPEN').length+' open)' : ''), 'var(--text2)') +
    box('AVG WIN', wins.length ? fmt$(avgWin) : '—', 'var(--green)') +
    box('AVG LOSS', losses.length ? fmt$(avgLoss) : '—', 'var(--red)') +
    box('R:R', rr !== null ? rr.toFixed(2) : '—', rr && rr >= 1 ? 'var(--green)' : 'var(--yellow)') +
    box('PROF. FACTOR', profitFactor !== null ? profitFactor.toFixed(2) : '—', profitFactor && profitFactor >= 1 ? 'var(--green)' : 'var(--red)');
}

// ── P&L Chart ─────────────────────────────────────────────────────────────────

function tjRenderPnlChart(filtered) {
  const canvas = document.getElementById('tjPnlChart');
  if (!canvas) return;

  // Only closed trades, sorted chronologically
  const closed = [...filtered].filter(t => t.pnl !== null)
    .sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));

  if (_pnlChart) { try { _pnlChart.destroy(); } catch(e) {} _pnlChart = null; }

  if (!closed.length) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  let cum = 0;
  const labels = [];
  const data   = [0];
  closed.forEach(t => {
    cum += t.pnl;
    labels.push(t.date.slice(5)); // MM-DD
    data.push(parseFloat(cum.toFixed(2)));
  });
  labels.unshift('');

  const color = cum >= 0 ? '#00ff88' : '#ff3355';

  // SVG-based renderer — no Chart.js dependency
  const W = 600, H = 80;
  const PAD = { t: 8, r: 12, b: 20, l: 44 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;

  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const range = maxV - minV || 1;

  const xScale = i => PAD.l + (i / (data.length - 1)) * cW;
  const yScale = v => PAD.t + cH - ((v - minV) / range) * cH;

  // Zero line
  const zeroY = yScale(0).toFixed(1);
  const zeroLine = (minV < 0 && maxV > 0)
    ? `<line x1="${PAD.l}" x2="${PAD.l + cW}" y1="${zeroY}" y2="${zeroY}" stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-dasharray="3,3"/>`
    : '';

  // Filled area path
  const pts = data.map((v, i) => `${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`).join(' ');
  const firstX = xScale(0).toFixed(1);
  const lastX  = xScale(data.length - 1).toFixed(1);
  const baseY  = yScale(Math.max(minV, 0)).toFixed(1);
  const areaPath = `M${firstX},${baseY} L${firstX},${yScale(data[0]).toFixed(1)} ` +
    data.slice(1).map((v, i) => `L${xScale(i+1).toFixed(1)},${yScale(v).toFixed(1)}`).join(' ') +
    ` L${lastX},${baseY} Z`;

  const showDots = data.length <= 30;
  const dots = showDots
    ? data.map((v, i) => `<circle cx="${xScale(i).toFixed(1)}" cy="${yScale(v).toFixed(1)}" r="2" fill="${color}"/>`)
        .join('')
    : '';

  // X axis labels — up to 8 evenly spaced
  const maxLabels = 8;
  const labelStep = Math.max(1, Math.ceil((labels.length) / maxLabels));
  const xlbls = labels.map((lbl, i) => {
    if (lbl === '' || (i % labelStep !== 0 && i !== labels.length - 1)) return '';
    const x = xScale(i).toFixed(1);
    return `<text x="${x}" y="${H - 3}" text-anchor="middle" font-size="8" fill="#606080" font-family="Share Tech Mono,monospace">${lbl}</text>`;
  }).join('');

  // Y axis: min, 0 (if in range), max
  const yTicks = [...new Set([minV, maxV, (minV < 0 && maxV > 0) ? 0 : null].filter(v => v !== null))];
  const ylbls = yTicks.map(v => {
    const y = (yScale(v) + 3).toFixed(1);
    const label = (v >= 0 ? '+$' : '-$') + Math.abs(v).toFixed(0);
    return `<text x="${PAD.l - 4}" y="${y}" text-anchor="end" font-size="8" fill="#606080" font-family="Share Tech Mono,monospace">${label}</text>`;
  }).join('');

  // Polyline
  const polyline = `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`;

  canvas.outerHTML; // no-op, just confirming canvas exists
  // Replace canvas with svg
  const wrapper = canvas.parentElement;
  const svgStr = `<svg id="tjPnlSvg" viewBox="0 0 ${W} ${H}" style="width:100%;height:80px;display:block;">
    ${zeroLine}
    <path d="${areaPath}" fill="${color}22"/>
    ${polyline}
    ${dots}
    ${xlbls}
    ${ylbls}
  </svg>`;

  // Insert SVG replacing canvas (keep canvas hidden for future re-renders)
  const existing = document.getElementById('tjPnlSvg');
  if (existing) {
    existing.outerHTML = svgStr;
  } else {
    canvas.insertAdjacentHTML('afterend', svgStr);
    canvas.style.display = 'none';
  }
}

// ── Extended stats panel ──────────────────────────────────────────────────────

function tjRenderStats(filtered) {
  const el = document.getElementById('tjStatsPanel');
  if (!el) return;

  const closed = filtered.filter(t => t.pnl !== null && t.outcome !== 'OPEN');
  if (!closed.length) { el.innerHTML = ''; return; }

  const wins   = closed.filter(t => t.pnl > 0);
  const losses = closed.filter(t => t.pnl < 0);
  const bes    = closed.filter(t => t.pnl === 0);

  const totalPnl  = closed.reduce((a, t) => a + t.pnl, 0);
  const avgWin    = wins.length   ? wins.reduce((a,t)=>a+t.pnl,0)/wins.length : 0;
  const avgLoss   = losses.length ? losses.reduce((a,t)=>a+t.pnl,0)/losses.length : 0;
  const largestW  = wins.length   ? Math.max(...wins.map(t=>t.pnl))   : 0;
  const largestL  = losses.length ? Math.min(...losses.map(t=>t.pnl)) : 0;
  const expectancy = wins.length && losses.length
    ? (wins.length/closed.length)*avgWin + (losses.length/closed.length)*avgLoss : null;

  // ── Streak analysis ──
  const chronoAll = [...closed].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  let curWStreak=0, maxWStreak=0, curLStreak=0, maxLStreak=0;
  let latestWStreak=0, latestLStreak=0;
  chronoAll.forEach(t => {
    if (t.pnl > 0) {
      curWStreak++; curLStreak=0;
      if (curWStreak > maxWStreak) maxWStreak = curWStreak;
    } else if (t.pnl < 0) {
      curLStreak++; curWStreak=0;
      if (curLStreak > maxLStreak) maxLStreak = curLStreak;
    } else {
      curWStreak=0; curLStreak=0;
    }
  });
  latestWStreak = curWStreak;
  latestLStreak = curLStreak;

  // ── Daily P&L ──
  const byDay = {};
  closed.forEach(t => {
    if (!t.date) return;
    byDay[t.date] = (byDay[t.date] || 0) + t.pnl;
  });
  const dayEntries = Object.entries(byDay).sort((a,b)=>a[0].localeCompare(b[0]));
  const greenDays  = dayEntries.filter(([,v])=>v>0).length;
  const redDays    = dayEntries.filter(([,v])=>v<0).length;
  const flatDays   = dayEntries.filter(([,v])=>v===0).length;
  const bestDay    = dayEntries.length ? dayEntries.reduce((a,b)=>b[1]>a[1]?b:a) : null;
  const worstDay   = dayEntries.length ? dayEntries.reduce((a,b)=>b[1]<a[1]?b:a) : null;

  // ── DOW breakdown ──
  const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dowStats = {};
  closed.forEach(t => {
    if (!t.date) return;
    const d = DOW[new Date(t.date+'T12:00:00').getDay()];
    if (!dowStats[d]) dowStats[d] = { pnl:0, wins:0, total:0 };
    dowStats[d].pnl += t.pnl;
    dowStats[d].total++;
    if (t.pnl > 0) dowStats[d].wins++;
  });
  const tradingDOW = ['Mon','Tue','Wed','Thu','Fri'].filter(d=>dowStats[d]);

  // ── Hour breakdown (CT) ──
  const hourStats = {};
  closed.forEach(t => {
    if (!t.time) return;
    const [hStr] = t.time.split(':');
    const h = parseInt(hStr, 10);
    if (!hourStats[h]) hourStats[h] = { pnl:0, wins:0, total:0 };
    hourStats[h].pnl += t.pnl;
    hourStats[h].total++;
    if (t.pnl > 0) hourStats[h].wins++;
  });
  const sortedHours = Object.entries(hourStats).sort((a,b)=>+a[0]-+b[0]);

  // ── Calendar heatmap (last 8 weeks) ──
  const today = new Date();
  const calDays = [];
  for (let i = 55; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0,10);
    calDays.push({ key, dow: d.getDay(), pnl: byDay[key] ?? null });
  }
  // Align to start of week
  const startDow = calDays[0].dow; // 0=Sun
  const padDays = Array(startDow).fill(null);
  const calCells = [...padDays, ...calDays];
  const allPnlVals = dayEntries.map(([,v])=>Math.abs(v));
  const maxAbsPnl  = allPnlVals.length ? Math.max(...allPnlVals, 1) : 1;

  function calColor(pnl) {
    if (pnl === null) return 'var(--bg3)';
    if (pnl === 0)    return 'var(--border)';
    if (pnl > 0) {
      const intensity = Math.min(pnl / maxAbsPnl, 1);
      return `rgba(0,255,136,${0.15 + intensity * 0.75})`;
    }
    const intensity = Math.min(Math.abs(pnl) / maxAbsPnl, 1);
    return `rgba(255,51,85,${0.15 + intensity * 0.75})`;
  }

  const calWeeks = [];
  for (let i = 0; i < calCells.length; i += 7) {
    calWeeks.push(calCells.slice(i, i+7));
  }

  const calHtml = `
    <div style="display:flex;gap:3px;flex-wrap:nowrap;">
      ${calWeeks.map(week => `
        <div style="display:flex;flex-direction:column;gap:3px;">
          ${week.map(d => {
            if (!d) return '<div style="width:14px;height:14px;"></div>';
            const pnlTip = d.pnl !== null ? (d.pnl >= 0 ? '+$' : '-$') + Math.abs(d.pnl).toFixed(0) : 'no trades';
            return `<div style="width:14px;height:14px;border-radius:2px;background:${calColor(d.pnl)};cursor:default;"
              title="${d.key}: ${pnlTip}"></div>`;
          }).join('')}
        </div>`).join('')}
    </div>
    <div style="display:flex;gap:12px;margin-top:6px;font-size:9px;color:var(--text3);font-family:'Share Tech Mono',monospace;">
      <span>■ <span style="color:var(--green)">profit</span></span>
      <span>■ <span style="color:var(--red)">loss</span></span>
      <span>■ <span style="color:var(--text3)">no trades</span></span>
    </div>`;

  // ── Dollar helpers ──
  const fmt$ = v => (v >= 0 ? '+$' : '-$') + Math.abs(v).toFixed(0);
  const fmtPnl = v => `<span style="color:${v>=0?'var(--green)':'var(--red)'}">${fmt$(v)}</span>`;

  // ── Render ──
  el.innerHTML = `
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">

    <!-- Streak box -->
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:10px;">STREAK STATS</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        ${[
          ['MAX WIN STREAK',  maxWStreak + ' trades', 'var(--green)'],
          ['MAX LOSS STREAK', maxLStreak + ' trades', 'var(--red)'],
          ['CURRENT W',  latestWStreak + ' in a row', latestWStreak > 0 ? 'var(--green)' : 'var(--text3)'],
          ['CURRENT L',  latestLStreak + ' in a row', latestLStreak > 0 ? 'var(--red)'   : 'var(--text3)'],
        ].map(([l,v,c])=>`<div>
          <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:2px;">${l}</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${c};">${v}</div>
        </div>`).join('')}
      </div>
    </div>

    <!-- Edge box -->
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:10px;">EDGE METRICS</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        ${[
          ['EXPECTANCY',  expectancy !== null ? fmt$(expectancy) : '—',  expectancy && expectancy >= 0 ? 'var(--green)' : 'var(--red)'],
          ['LARGEST WIN', largestW ? fmt$(largestW) : '—', 'var(--green)'],
          ['LARGEST LOSS',largestL ? fmt$(largestL) : '—', 'var(--red)'],
          ['OPEN TRADES', filtered.filter(t=>t.outcome==='OPEN').length + ' open', 'var(--cyan)'],
        ].map(([l,v,c])=>`<div>
          <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:2px;">${l}</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${c};">${v}</div>
        </div>`).join('')}
      </div>
    </div>

    <!-- Daily P&L box -->
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:10px;">DAILY RESULTS</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        ${[
          ['GREEN DAYS',  greenDays + ' days', 'var(--green)'],
          ['RED DAYS',    redDays   + ' days', 'var(--red)'],
          ['BEST DAY',    bestDay  ? fmt$(bestDay[1])  : '—', 'var(--green)'],
          ['WORST DAY',   worstDay ? fmt$(worstDay[1]) : '—', 'var(--red)'],
        ].map(([l,v,c])=>`<div>
          <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:2px;">${l}</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${c};">${v}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">

    <!-- DOW breakdown -->
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:10px;">P&amp;L BY DAY OF WEEK</div>
      ${tradingDOW.length ? tradingDOW.map(d => {
        const s = dowStats[d];
        const wr = s.total ? Math.round(s.wins/s.total*100) : 0;
        const barW = Math.round(Math.abs(s.pnl)/maxAbsPnl*100);
        const c = s.pnl >= 0 ? 'var(--green)' : 'var(--red)';
        return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border)22;">
          <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text2);width:28px;">${d}</div>
          <div style="flex:1;height:10px;background:var(--bg2);border-radius:2px;overflow:hidden;">
            <div style="width:${barW}%;height:100%;background:${c}88;border-radius:2px;"></div>
          </div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${c};width:60px;text-align:right;">${fmt$(s.pnl)}</div>
          <div style="font-size:9px;color:var(--text3);width:42px;text-align:right;">${wr}% (${s.total})</div>
        </div>`;
      }).join('') : '<div style="font-size:11px;color:var(--text3);">No data</div>'}
    </div>

    <!-- Calendar heatmap -->
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:8px;">DAILY P&amp;L HEATMAP — LAST 8 WEEKS</div>
      <div style="display:flex;gap:6px;margin-bottom:6px;">
        ${['S','M','T','W','T','F','S'].map(d=>`<div style="width:14px;font-size:8px;color:var(--text3);text-align:center;">${d}</div>`).join('')}
      </div>
      ${calHtml}
    </div>
  </div>

  ${sortedHours.length >= 2 ? `
  <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;margin-top:10px;">
    <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:10px;">P&amp;L BY HOUR OF DAY (CT)</div>
    <div style="display:flex;gap:4px;align-items:flex-end;height:60px;">
      ${(()=>{
        const mx = Math.max(...sortedHours.map(([,s])=>Math.abs(s.pnl)),1);
        return sortedHours.map(([h,s])=>{
          const pct = Math.abs(s.pnl)/mx;
          const barH = Math.max(4, Math.round(pct*52));
          const c = s.pnl >= 0 ? 'var(--green)' : 'var(--red)';
          const ap = +h >= 12 ? 'pm' : 'am';
          const h12 = +h % 12 || 12;
          return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;min-width:0;" title="${h12}${ap} CT: ${fmt$(s.pnl)} (${s.total} trades, ${Math.round(s.wins/s.total*100)}% win)">
            <div style="width:100%;height:${barH}px;background:${c}99;border-radius:2px 2px 0 0;"></div>
            <div style="font-size:8px;color:var(--text3);white-space:nowrap;">${h12}${ap}</div>
          </div>`;
        }).join('');
      })()}
    </div>
  </div>` : ''}`;
}

// ── Setup breakdown panel ─────────────────────────────────────────────────────

function tjRenderSetupBreakdown(filtered) {
  const el = document.getElementById('tjSetupBreakdownPanel');
  if (!el) return;

  const bySetup = {};
  filtered.forEach(t => {
    const key = t.setup || 'Untagged';
    if (!bySetup[key]) bySetup[key] = { wins:0, losses:0, be:0, pnl:0, count:0 };
    bySetup[key].count++;
    bySetup[key].pnl += t.pnl || 0;
    if (t.outcome === 'WIN')  bySetup[key].wins++;
    if (t.outcome === 'LOSS') bySetup[key].losses++;
    if (t.outcome === 'BE')   bySetup[key].be++;
  });

  const rows = Object.entries(bySetup).sort((a,b) => b[1].count - a[1].count);
  if (!rows.length) { el.innerHTML = ''; return; }

  const maxPnl = Math.max(...rows.map(r => Math.abs(r[1].pnl)), 1);

  el.innerHTML = `
    <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);letter-spacing:1px;margin-bottom:10px;">SETUP BREAKDOWN</div>
    <div style="display:grid;grid-template-columns:140px 60px 1fr 80px 70px;gap:4px;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:6px;padding:0 2px;">
      <div>SETUP</div><div style="text-align:center;">TRADES</div><div>P&amp;L BAR</div><div style="text-align:right;">NET P&amp;L</div><div style="text-align:right;">WIN%</div>
    </div>` +
    rows.map(([setup, s]) => {
      const wr = s.wins + s.losses > 0 ? (s.wins / (s.wins + s.losses) * 100) : 0;
      const barW = Math.round(Math.abs(s.pnl) / maxPnl * 100);
      const c = s.pnl >= 0 ? 'var(--green)' : 'var(--red)';
      return `<div style="display:grid;grid-template-columns:140px 60px 1fr 80px 70px;gap:4px;align-items:center;padding:4px 2px;border-bottom:1px solid var(--border)22;">
        <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${setup}</div>
        <div style="text-align:center;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);">${s.count}</div>
        <div style="height:12px;background:var(--bg3);border-radius:2px;overflow:hidden;">
          <div style="width:${barW}%;height:100%;background:${c}88;border-radius:2px;"></div>
        </div>
        <div style="text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:${c};font-weight:bold;">${s.pnl >= 0 ? '+' : ''}$${s.pnl.toFixed(0)}</div>
        <div style="text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:${wr>=50?'var(--green)':'var(--red)'};">${wr.toFixed(0)}%</div>
      </div>`;
    }).join('');
}

// ── Populate setup filter dropdown ────────────────────────────────────────────

function tjPopulateSetupFilter() {
  const el = document.getElementById('tj_filt_setup');
  if (!el) return;
  const setups = [...new Set(_trades.map(t => t.setup).filter(Boolean))].sort();
  const cur = el.value;
  el.innerHTML = '<option value="">ALL SETUPS</option>' +
    setups.map(s => `<option${s===cur?' selected':''}>${s}</option>`).join('');
}

// ── Main render ───────────────────────────────────────────────────────────────

window.tjRender = function() {
  tjPopulateSetupFilter();
  const filtered = tjFiltered();
  const sorted   = tjSort(filtered);

  tjRenderSummary(filtered);
  tjRenderPnlChart(filtered);
  tjRenderStats(filtered);
  tjRenderSetupBreakdown(filtered);

  const tbody = document.getElementById('tjTradeBody');
  if (!tbody) return;

  if (!sorted.length) {
    tbody.innerHTML = '<tr><td colspan="14" style="text-align:center;color:var(--text3);padding:24px;font-size:12px;">No trades match current filters.</td></tr>';
    return;
  }

  tbody.innerHTML = sorted.map(t => {
    const dirColor = t.direction === 'CALL' ? 'var(--green)' : 'var(--red)';
    const outColor = { WIN:'var(--green)', LOSS:'var(--red)', BE:'var(--yellow)', OPEN:'var(--cyan)' }[t.outcome] || 'var(--text3)';
    const pnlColor = t.pnl === null ? 'var(--text3)' : t.pnl >= 0 ? 'var(--green)' : 'var(--red)';
    const pnlStr   = t.pnl === null ? '—' : (t.pnl >= 0 ? '+' : '') + '$' + t.pnl.toFixed(0);
    const pnlPctStr= t.pnlPct === null ? '—' : (t.pnlPct >= 0 ? '+' : '') + t.pnlPct.toFixed(1) + '%';
    const exitField = t.exit !== null
      ? `<span style="color:var(--text2);">$${t.exit.toFixed(2)}</span>`
      : `<input type="number" step="0.01" placeholder="exit" onblur="tjUpdateExit(${t.id},this.value)"
           style="width:62px;background:var(--bg3);border:1px solid var(--border);border-radius:2px;padding:2px 4px;color:var(--cyan);font-family:'Share Tech Mono',monospace;font-size:11px;outline:none;"/>`;
    const noteShort = (t.notes||'').length > 40 ? t.notes.slice(0,40)+'…' : (t.notes||'—');
    const titleAttr = [t.notes, t.lesson ? ('📌 '+t.lesson) : ''].filter(Boolean).join('\n\n');

    return `<tr title="${escHtml(titleAttr)}">
      <td style="text-align:left;padding-left:12px;white-space:nowrap;">${t.date}${t.time?' <span style="color:var(--text3);font-size:10px;">'+t.time+'</span>':''}</td>
      <td style="color:${dirColor};font-weight:bold;">${t.direction}</td>
      <td style="color:var(--text2);">${t.strike !== null ? '$'+t.strike : '—'}</td>
      <td style="color:var(--text3);font-size:10px;">${t.expiry || '—'}</td>
      <td style="color:var(--text3);font-size:10px;white-space:nowrap;">${t.type}</td>
      <td style="color:var(--purple);font-size:10px;">${t.setup || '—'}</td>
      <td>$${t.entry.toFixed(2)}</td>
      <td>${exitField}</td>
      <td>${t.qty}</td>
      <td style="color:${pnlColor};font-weight:bold;">${pnlStr}</td>
      <td style="color:${pnlColor};font-size:11px;">${pnlPctStr}</td>
      <td style="color:${outColor};font-family:'Orbitron',monospace;font-size:9px;font-weight:bold;">${t.outcome}</td>
      <td style="text-align:left;color:var(--text3);font-size:10px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(noteShort)}</td>
      <td style="text-align:right;padding-right:10px;">
        <button onclick="tjDeleteTrade(${t.id})"
          style="background:none;border:none;color:#ff335555;cursor:pointer;font-size:12px;padding:2px 4px;" title="Delete">✕</button>
      </td>
    </tr>`;
  }).join('');
};

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Export / Import ───────────────────────────────────────────────────────────

window.tjExportCSV = function() {
  const cols = ['date','time','direction','type','strike','expiry','entry','exit','qty','spyPx','setup','outcome','pnl','pnlPct','notes','lesson'];
  const header = cols.join(',');
  const rows = _trades.map(t => cols.map(k => {
    const v = t[k] ?? '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? '"'+s.replace(/"/g,'""')+'"' : s;
  }).join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'spy_trades_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
};

window.tjExportJSON = function() {
  const blob = new Blob([JSON.stringify(_trades, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'spy_trades_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
};

window.tjImportJSON = function(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('Expected array');
      if (!confirm(`Import ${imported.length} trades? This will MERGE with existing ${_trades.length} trades.`)) return;
      // Merge by id — no duplicates
      const existingIds = new Set(_trades.map(t => t.id));
      let added = 0;
      imported.forEach(t => { if (!existingIds.has(t.id)) { _trades.push(t); added++; } });
      tjSave();
      tjRender();
      alert(`Imported ${added} new trades.`);
    } catch(err) {
      alert('Import failed: ' + err.message);
    }
    input.value = '';
  };
  reader.readAsText(file);
};

// ── Subtab switching ──────────────────────────────────────────────────────────

window.switchJournalSubtab = function(tab) {
  ['trades','chart'].forEach(t => {
    const panel = document.getElementById('jpanel-'+t);
    const btn   = document.getElementById('jsubtab-'+t);
    if (!panel || !btn) return;
    if (t === tab) {
      panel.style.display = '';
      btn.style.borderBottomColor = t === 'trades' ? 'var(--green)' : 'var(--cyan)';
      btn.style.color = t === 'trades' ? 'var(--green)' : 'var(--cyan)';
    } else {
      panel.style.display = 'none';
      btn.style.borderBottomColor = 'transparent';
      btn.style.color = 'var(--text3)';
    }
  });
  if (tab === 'trades') tjRender();
};

// ── Init ──────────────────────────────────────────────────────────────────────

function tjInit() {
  tjLoad();
  tjPrefillDate();
  tjSetDir('CALL');
  tjSetOutcome('OPEN');
  tjRender();
}

// Hook into the dashboard's switchTab so journal tab triggers render
const _origSwitchTab = window.switchTab;
window.switchTab = function(id, ...args) {
  if (typeof _origSwitchTab === 'function') _origSwitchTab(id, ...args);
  if (id === 'journal') {
    setTimeout(() => { tjInit(); }, 50);
  }
};

// Also init on DOMContentLoaded in case journal is the active tab
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tjInit);
} else {
  tjInit();
}

})();
