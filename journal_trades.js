// ─── SPY OPTIONS TRADE JOURNAL ─────────────────────────────────────────────
// Persists to localStorage under key 'spyTradeJournal'

(function() {

const STORE_KEY = 'spyTradeJournal';
let _trades = [];
let _sortKey = 'date';
let _sortDir = -1;
let _direction = 'CALL';
let _outcome = 'OPEN';
let _editId = null; // trade being edited

// ── Persistence ──────────────────────────────────────────────────────────────
function tjLoad() {
  try { _trades = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch(e) { _trades = []; }
}
function tjSave() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(_trades)); } catch(e) {
    alert('Storage full — export your trades to JSON to free space.');
  }
}

// ── Form helpers ──────────────────────────────────────────────────────────────
window.tjSetDir = function(dir) {
  _direction = dir;
  ['CALL','PUT'].forEach(d => {
    const el = document.getElementById('tj_dir_'+d.toLowerCase());
    if (!el) return;
    const active = d === dir;
    el.style.background = active ? (d==='CALL'?'var(--green)':'var(--red)') : 'var(--bg3)';
    el.style.color = active ? '#000' : 'var(--text3)';
    el.style.border = active ? 'none' : '1px solid var(--border)';
    el.style.fontWeight = active ? 'bold' : 'normal';
  });
};

window.tjSetOutcome = function(out) {
  _outcome = out;
  const colors = { WIN:'var(--green)', LOSS:'var(--red)', BE:'var(--yellow)', OPEN:'var(--cyan)' };
  ['WIN','LOSS','BE','OPEN'].forEach(k => {
    const el = document.getElementById('tj_out_'+k.toLowerCase());
    if (!el) return;
    const active = k === out;
    el.style.background = active ? colors[k] : 'var(--bg3)';
    el.style.color = active ? '#000' : 'var(--text3)';
    el.style.border = active ? 'none' : '1px solid var(--border)';
    el.style.fontWeight = active ? 'bold' : 'normal';
  });
};

function tjGetVal(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

function tjPrefillDate() {
  const dateEl = document.getElementById('tj_date');
  if (dateEl && !dateEl.value) {
    const ct = new Date(new Date().toLocaleString('en-US',{timeZone:'America/Chicago'}));
    dateEl.value = ct.toISOString().slice(0,10);
  }
  const timeEl = document.getElementById('tj_time');
  if (timeEl && !timeEl.value) {
    const ct = new Date(new Date().toLocaleString('en-US',{timeZone:'America/Chicago'}));
    timeEl.value = ct.toTimeString().slice(0,5);
  }
  const spyEl = document.getElementById('tj_spy_price');
  if (spyEl && !spyEl.value) {
    const priceEl = document.querySelector('.spy-price');
    if (priceEl) { const raw=priceEl.textContent.replace(/[^0-9.]/g,''); if(raw) spyEl.value=raw; }
  }
}

window.tjClearForm = function() {
  ['tj_date','tj_time','tj_exit_time','tj_strike','tj_expiry','tj_entry','tj_exit',
   'tj_qty','tj_spy_price','tj_spy_exit','tj_notes','tj_lesson','tj_screenshot_data'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const setupEl = document.getElementById('tj_setup'); if (setupEl) setupEl.value='';
  const typeEl = document.getElementById('tj_type'); if (typeEl) typeEl.value='Buy to Open';
  const previewEl = document.getElementById('tj_screenshot_preview');
  if (previewEl) previewEl.innerHTML = '';
  _editId = null;
  const btn = document.getElementById('tj_submit_btn');
  if (btn) { btn.textContent='+ LOG TRADE'; btn.style.background='var(--green)'; }
  const lbl = document.getElementById('tj_form_label');
  if (lbl) lbl.textContent = '⬡ LOG TRADE';
  tjSetDir('CALL');
  tjSetOutcome('OPEN');
  tjPrefillDate();
};

// ── Holding time calculator ───────────────────────────────────────────────────
function calcHoldingTime(date, entryTime, exitTime) {
  if (!date || !entryTime || !exitTime) return null;
  try {
    const entry = new Date(`${date}T${entryTime}:00`);
    const exit  = new Date(`${date}T${exitTime}:00`);
    const mins  = Math.round((exit - entry) / 60000);
    if (mins < 0 || mins > 480) return null; // sanity check
    if (mins < 60) return mins + 'm';
    return Math.floor(mins/60) + 'h ' + (mins%60) + 'm';
  } catch(e) { return null; }
}

function calcHoldingMins(date, entryTime, exitTime) {
  if (!date || !entryTime || !exitTime) return null;
  try {
    const mins = Math.round((new Date(`${date}T${exitTime}:00`) - new Date(`${date}T${entryTime}:00`)) / 60000);
    return (mins >= 0 && mins <= 480) ? mins : null;
  } catch(e) { return null; }
}

// ── Screenshot handling ───────────────────────────────────────────────────────
window.tjHandleScreenshot = function(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { alert('Image too large (max 2MB). Resize before uploading.'); input.value=''; return; }
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    const hiddenEl = document.getElementById('tj_screenshot_data');
    if (hiddenEl) hiddenEl.value = dataUrl;
    const preview = document.getElementById('tj_screenshot_preview');
    if (preview) preview.innerHTML = `<img src="${dataUrl}" style="width:100%;border-radius:3px;margin-top:6px;cursor:pointer;max-height:120px;object-fit:cover;" onclick="tjViewScreenshot('${dataUrl.slice(0,30)}')" title="Click to expand"/>`;
  };
  reader.readAsDataURL(file);
};

window.tjPasteScreenshot = function(e) {
  const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      const fakeInput = { files: [file] };
      tjHandleScreenshot(fakeInput);
      break;
    }
  }
};

window.tjViewScreenshot = function(partial) {
  // Find the trade with this screenshot and open full-size
  const trade = _trades.find(t => t.screenshot && t.screenshot.startsWith(partial));
  const src = trade ? trade.screenshot : document.getElementById('tj_screenshot_data')?.value;
  if (!src) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
  overlay.innerHTML = `<img src="${src}" style="max-width:95vw;max-height:95vh;border-radius:4px;box-shadow:0 0 40px rgba(0,0,0,0.8);">`;
  overlay.onclick = () => document.body.removeChild(overlay);
  document.body.appendChild(overlay);
};

window.tjViewTradeScreenshot = function(id) {
  const t = _trades.find(t => t.id === id);
  if (!t?.screenshot) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
  overlay.innerHTML = `<img src="${t.screenshot}" style="max-width:95vw;max-height:95vh;border-radius:4px;">`;
  overlay.onclick = () => document.body.removeChild(overlay);
  document.body.appendChild(overlay);
};

// ── Add / Edit trade ──────────────────────────────────────────────────────────
window.tjAddTrade = function() {
  const date     = tjGetVal('tj_date');
  const time     = tjGetVal('tj_time');
  const exitTime = tjGetVal('tj_exit_time');
  const strike   = parseFloat(tjGetVal('tj_strike'));
  const expiry   = tjGetVal('tj_expiry');
  const entry    = parseFloat(tjGetVal('tj_entry'));
  const exitRaw  = tjGetVal('tj_exit');
  const exit     = exitRaw !== '' ? parseFloat(exitRaw) : null;
  const qty      = parseInt(tjGetVal('tj_qty') || '1', 10) || 1;
  const spyPx    = parseFloat(tjGetVal('tj_spy_price')) || null;
  const spyExit  = parseFloat(tjGetVal('tj_spy_exit')) || null;
  const setup    = tjGetVal('tj_setup');
  const type     = tjGetVal('tj_type');
  const notes    = tjGetVal('tj_notes');
  const lesson   = tjGetVal('tj_lesson');
  const screenshot = tjGetVal('tj_screenshot_data') || null;

  if (!date) { alert('Date is required.'); return; }
  if (isNaN(entry) || entry <= 0) { alert('Entry price is required.'); return; }

  const isSell = type?.includes('Sell to Open') || type?.includes('Sell to Close');
  let pnl = null;
  if (exit !== null && !isNaN(exit)) {
    pnl = isSell ? (entry - exit) * 100 * qty : (exit - entry) * 100 * qty;
  }
  const cost = entry * 100 * qty;
  const pnlPct = (pnl !== null && cost > 0) ? (pnl / cost * 100) : null;
  const holdingTime = calcHoldingTime(date, time, exitTime);
  const holdingMins = calcHoldingMins(date, time, exitTime);

  if (_editId !== null) {
    // Update existing trade
    const idx = _trades.findIndex(t => t.id === _editId);
    if (idx >= 0) {
      _trades[idx] = { ..._trades[idx],
        date, time, exitTime, direction:_direction, type,
        strike: isNaN(strike)?null:strike, expiry, entry, exit, qty,
        spyPx, spyExit, setup, outcome:_outcome, notes, lesson,
        pnl, pnlPct, holdingTime, holdingMins,
        screenshot: screenshot || _trades[idx].screenshot || null,
      };
    }
    _editId = null;
  } else {
    const trade = {
      id: Date.now() + Math.random(),
      date, time, exitTime,
      direction: _direction, type,
      strike: isNaN(strike) ? null : strike,
      expiry, entry, exit, qty, spyPx, spyExit,
      setup, outcome: _outcome, notes, lesson,
      pnl, pnlPct, holdingTime, holdingMins,
      screenshot: screenshot || null,
    };
    _trades.unshift(trade);
  }
  tjSave();
  tjRender();
  tjClearForm();
};

// ── Edit trade ────────────────────────────────────────────────────────────────
window.tjEditTrade = function(id) {
  const t = _trades.find(t => t.id === id);
  if (!t) return;
  _editId = id;

  // Populate form
  const set = (elId, val) => { const el=document.getElementById(elId); if(el&&val!=null) el.value=val; };
  set('tj_date', t.date);
  set('tj_time', t.time);
  set('tj_exit_time', t.exitTime);
  set('tj_strike', t.strike);
  set('tj_expiry', t.expiry);
  set('tj_entry', t.entry);
  set('tj_exit', t.exit);
  set('tj_qty', t.qty);
  set('tj_spy_price', t.spyPx);
  set('tj_spy_exit', t.spyExit);
  set('tj_setup', t.setup);
  set('tj_type', t.type);
  set('tj_notes', t.notes);
  set('tj_lesson', t.lesson);

  // Screenshot preview
  if (t.screenshot) {
    const preview = document.getElementById('tj_screenshot_preview');
    if (preview) preview.innerHTML = `<img src="${t.screenshot}" style="width:100%;border-radius:3px;margin-top:6px;max-height:120px;object-fit:cover;cursor:pointer;" onclick="tjViewTradeScreenshot(${id})" title="Click to expand"/>`;
    const hiddenEl = document.getElementById('tj_screenshot_data');
    if (hiddenEl) hiddenEl.value = t.screenshot;
  }

  tjSetDir(t.direction || 'CALL');
  tjSetOutcome(t.outcome || 'OPEN');

  // Update button/label
  const btn = document.getElementById('tj_submit_btn');
  if (btn) { btn.textContent = '✓ SAVE CHANGES'; btn.style.background = 'var(--cyan)'; btn.style.color = '#000'; }
  const lbl = document.getElementById('tj_form_label');
  if (lbl) lbl.textContent = '⬡ EDIT TRADE';

  // Scroll form into view
  const formEl = document.getElementById('tj_form_panel');
  if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ── Quick exit update (inline in table) ──────────────────────────────────────
window.tjUpdateExit = function(id, newExit) {
  const t = _trades.find(t => t.id === id);
  if (!t) return;
  const exit = parseFloat(newExit);
  if (isNaN(exit)) return;
  t.exit = exit;
  const isSell = t.type?.includes('Sell to Open') || t.type?.includes('Sell to Close');
  t.pnl = isSell ? (t.entry - exit)*100*t.qty : (exit - t.entry)*100*t.qty;
  const cost = t.entry * 100 * t.qty;
  t.pnlPct = cost > 0 ? (t.pnl / cost * 100) : null;
  if (t.outcome === 'OPEN') t.outcome = t.pnl > 0 ? 'WIN' : t.pnl < 0 ? 'LOSS' : 'BE';
  tjSave();
  tjRender();
};

window.tjDeleteTrade = function(id) {
  if (!confirm('Delete this trade entry?')) return;
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

// ── Sort / Filter ─────────────────────────────────────────────────────────────
window.tjSortBy = function(key) {
  if (_sortKey === key) _sortDir *= -1;
  else { _sortKey = key; _sortDir = -1; }
  tjRender();
};

function tjSort(arr) {
  return [...arr].sort((a, b) => {
    let va = a[_sortKey], vb = b[_sortKey];
    if (_sortKey === 'date') { va = (a.date||'')+(a.time||''); vb = (b.date||'')+(b.time||''); }
    if (va == null) return 1; if (vb == null) return -1;
    if (typeof va === 'string') return _sortDir * va.localeCompare(vb);
    return _sortDir * (va - vb);
  });
}

window.tjClearFilters = function() {
  ['tj_filt_dir','tj_filt_outcome','tj_filt_setup'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const s = document.getElementById('tj_filt_search'); if (s) s.value = '';
  tjRender();
};

function tjFiltered() {
  const dir     = (document.getElementById('tj_filt_dir')     ||{}).value||'';
  const outcome = (document.getElementById('tj_filt_outcome') ||{}).value||'';
  const setup   = (document.getElementById('tj_filt_setup')   ||{}).value||'';
  const search  = ((document.getElementById('tj_filt_search') ||{}).value||'').toLowerCase();
  return _trades.filter(t => {
    if (dir && t.direction !== dir) return false;
    if (outcome && t.outcome !== outcome) return false;
    if (setup && t.setup !== setup) return false;
    if (search && !((t.notes||'').toLowerCase().includes(search)||(t.lesson||'').toLowerCase().includes(search)||(t.setup||'').toLowerCase().includes(search)||String(t.strike||'').includes(search))) return false;
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
  const open   = filtered.filter(t => t.outcome === 'OPEN');
  const totalPnl = closed.reduce((a,t) => a+t.pnl, 0);
  const winRate  = closed.length ? wins.length/closed.length*100 : 0;
  const avgWin   = wins.length   ? wins.reduce((a,t)=>a+t.pnl,0)/wins.length   : 0;
  const avgLoss  = losses.length ? losses.reduce((a,t)=>a+t.pnl,0)/losses.length : 0;
  const rr = avgLoss !== 0 ? Math.abs(avgWin/avgLoss) : null;
  const pf = losses.length && Math.abs(losses.reduce((a,t)=>a+t.pnl,0)) > 0
    ? wins.reduce((a,t)=>a+t.pnl,0) / Math.abs(losses.reduce((a,t)=>a+t.pnl,0)) : null;
  const avgHold = (() => {
    const held = closed.filter(t => t.holdingMins != null);
    if (!held.length) return null;
    const avg = held.reduce((a,t)=>a+t.holdingMins,0)/held.length;
    return avg < 60 ? Math.round(avg)+'m' : Math.floor(avg/60)+'h '+Math.round(avg%60)+'m';
  })();

  const pnlColor = totalPnl >= 0 ? 'var(--green)' : 'var(--red)';
  const wrColor  = winRate  >= 50 ? 'var(--green)' : 'var(--red)';
  const fmt$ = v => (v>=0?'+':'')+' $'+Math.abs(v).toFixed(0);

  function box(label, val, color, sub='') {
    return `<div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:8px 10px;text-align:center;">
      <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">${label}</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:15px;font-weight:bold;color:${color};">${val}</div>
      ${sub?`<div style="font-size:9px;color:var(--text3);margin-top:2px;">${sub}</div>`:''}
    </div>`;
  }

  el.innerHTML =
    box('TOTAL P&L', fmt$(totalPnl), pnlColor, `${closed.length} closed`) +
    box('WIN RATE', closed.length ? winRate.toFixed(0)+'%' : '—', wrColor, `${wins.length}W / ${losses.length}L`) +
    box('OPEN', open.length ? open.length+' trade'+(open.length>1?'s':'') : '—', 'var(--cyan)', 'positions') +
    box('AVG WIN', wins.length ? fmt$(avgWin) : '—', 'var(--green)') +
    box('AVG LOSS', losses.length ? fmt$(avgLoss) : '—', 'var(--red)') +
    box('R:R', rr !== null ? rr.toFixed(2) : '—', rr&&rr>=1?'var(--green)':'var(--yellow)') +
    box('AVG HOLD', avgHold || '—', 'var(--text2)', 'per trade') +
    box('PROF. FACTOR', pf !== null ? pf.toFixed(2) : '—', pf&&pf>=1?'var(--green)':'var(--red)');
}

// ── P&L equity curve ─────────────────────────────────────────────────────────
function tjRenderPnlChart(filtered) {
  const canvas = document.getElementById('tjPnlChart');
  if (!canvas) return;
  const closed = [...filtered].filter(t=>t.pnl!==null).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  if (!closed.length) {
    const existing = document.getElementById('tjPnlSvg'); if (existing) existing.remove();
    return;
  }
  let cum = 0;
  const labels = [''];
  const data   = [0];
  closed.forEach(t => { cum+=t.pnl; labels.push(t.date.slice(5)); data.push(parseFloat(cum.toFixed(2))); });

  const color = cum >= 0 ? '#00ff88' : '#ff3355';
  const W=600, H=80, PAD={t:8,r:12,b:20,l:50};
  const cW=W-PAD.l-PAD.r, cH=H-PAD.t-PAD.b;
  const minV=Math.min(...data), maxV=Math.max(...data), range=maxV-minV||1;
  const xScale=i=>PAD.l+(i/(data.length-1))*cW;
  const yScale=v=>PAD.t+cH-((v-minV)/range)*cH;
  const zeroY=yScale(0).toFixed(1);
  const zeroLine=(minV<0&&maxV>0)?`<line x1="${PAD.l}" x2="${PAD.l+cW}" y1="${zeroY}" y2="${zeroY}" stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-dasharray="3,3"/>`:'' ;
  const pts=data.map((v,i)=>`${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`).join(' ');
  const firstX=xScale(0).toFixed(1), lastX=xScale(data.length-1).toFixed(1);
  const baseY=yScale(Math.max(minV,0)).toFixed(1);
  const areaPath=`M${firstX},${baseY} L${firstX},${yScale(data[0]).toFixed(1)} `+data.slice(1).map((v,i)=>`L${xScale(i+1).toFixed(1)},${yScale(v).toFixed(1)}`).join(' ')+` L${lastX},${baseY} Z`;
  const labelStep=Math.max(1,Math.ceil(labels.length/8));
  const xlbls=labels.map((l,i)=>{ if(!l||(i%labelStep!==0&&i!==labels.length-1))return''; return `<text x="${xScale(i).toFixed(1)}" y="${H-3}" text-anchor="middle" font-size="8" fill="#606080" font-family="Share Tech Mono,monospace">${l}</text>`; }).join('');
  const yTicks=[...new Set([minV,maxV,(minV<0&&maxV>0)?0:null].filter(v=>v!==null))];
  const ylbls=yTicks.map(v=>`<text x="${PAD.l-4}" y="${(yScale(v)+3).toFixed(1)}" text-anchor="end" font-size="8" fill="#606080" font-family="Share Tech Mono,monospace">${v>=0?'+$':'-$'}${Math.abs(v).toFixed(0)}</text>`).join('');
  const svgStr=`<svg id="tjPnlSvg" viewBox="0 0 ${W} ${H}" style="width:100%;height:80px;display:block;">${zeroLine}<path d="${areaPath}" fill="${color}22"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>${xlbls}${ylbls}</svg>`;
  const existing=document.getElementById('tjPnlSvg');
  if (existing) existing.outerHTML=svgStr; else { canvas.insertAdjacentHTML('afterend',svgStr); canvas.style.display='none'; }
}

// ── Extended stats ────────────────────────────────────────────────────────────
function tjRenderStats(filtered) {
  const el = document.getElementById('tjStatsPanel');
  if (!el) return;
  const closed = filtered.filter(t=>t.pnl!==null&&t.outcome!=='OPEN');
  if (!closed.length) { el.innerHTML=''; return; }

  const wins=closed.filter(t=>t.pnl>0), losses=closed.filter(t=>t.pnl<0);
  const totalPnl=closed.reduce((a,t)=>a+t.pnl,0);
  const avgWin=wins.length?wins.reduce((a,t)=>a+t.pnl,0)/wins.length:0;
  const avgLoss=losses.length?losses.reduce((a,t)=>a+t.pnl,0)/losses.length:0;
  const largestW=wins.length?Math.max(...wins.map(t=>t.pnl)):0;
  const largestL=losses.length?Math.min(...losses.map(t=>t.pnl)):0;
  const expectancy=wins.length&&losses.length?(wins.length/closed.length)*avgWin+(losses.length/closed.length)*avgLoss:null;

  // Streak
  const chrono=[...closed].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  let cW=0,mW=0,cL=0,mL=0;
  chrono.forEach(t=>{ if(t.pnl>0){cW++;cL=0;if(cW>mW)mW=cW;}else if(t.pnl<0){cL++;cW=0;if(cL>mL)mL=cL;}else{cW=0;cL=0;} });

  // Daily
  const byDay={};
  closed.forEach(t=>{ if(!t.date)return; byDay[t.date]=(byDay[t.date]||0)+t.pnl; });
  const dayEntries=Object.entries(byDay).sort((a,b)=>a[0].localeCompare(b[0]));
  const greenDays=dayEntries.filter(([,v])=>v>0).length;
  const redDays=dayEntries.filter(([,v])=>v<0).length;
  const bestDay=dayEntries.length?dayEntries.reduce((a,b)=>b[1]>a[1]?b:a):null;
  const worstDay=dayEntries.length?dayEntries.reduce((a,b)=>b[1]<a[1]?b:a):null;

  // DOW
  const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dowStats={};
  closed.forEach(t=>{
    if(!t.date)return;
    const d=DOW[new Date(t.date+'T12:00:00').getDay()];
    if(!dowStats[d]) dowStats[d]={pnl:0,wins:0,losses:0,total:0,holdMins:[]};
    dowStats[d].pnl+=t.pnl; dowStats[d].total++;
    if(t.pnl>0)dowStats[d].wins++; else if(t.pnl<0)dowStats[d].losses++;
    if(t.holdingMins!=null)dowStats[d].holdMins.push(t.holdingMins);
  });
  const tradingDOW=['Mon','Tue','Wed','Thu','Fri'].filter(d=>dowStats[d]);
  const maxAbsPnl=Math.max(...dayEntries.map(([,v])=>Math.abs(v)),1);
  const maxDowPnl=Math.max(...tradingDOW.map(d=>Math.abs(dowStats[d].pnl)),1);

  // Holding time distribution
  const heldTrades=closed.filter(t=>t.holdingMins!=null);
  const buckets={'<5m':0,'5–15m':0,'15–30m':0,'30–60m':0,'1–2h':0,'>2h':0};
  heldTrades.forEach(t=>{
    const m=t.holdingMins;
    if(m<5)buckets['<5m']++;
    else if(m<15)buckets['5–15m']++;
    else if(m<30)buckets['15–30m']++;
    else if(m<60)buckets['30–60m']++;
    else if(m<120)buckets['1–2h']++;
    else buckets['>2h']++;
  });
  const maxBucket=Math.max(...Object.values(buckets),1);

  // Hour breakdown
  const hourStats={};
  closed.forEach(t=>{
    if(!t.time)return;
    const h=parseInt(t.time.split(':')[0],10);
    if(!hourStats[h])hourStats[h]={pnl:0,wins:0,total:0};
    hourStats[h].pnl+=t.pnl; hourStats[h].total++;
    if(t.pnl>0)hourStats[h].wins++;
  });
  const sortedHours=Object.entries(hourStats).sort((a,b)=>+a[0]-+b[0]);

  // Calendar heatmap
  const today=new Date();
  const calDays=[];
  for(let i=55;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);const key=d.toISOString().slice(0,10);calDays.push({key,dow:d.getDay(),pnl:byDay[key]??null});}
  const padDays=Array(calDays[0].dow).fill(null);
  const calCells=[...padDays,...calDays];
  const calWeeks=[];
  for(let i=0;i<calCells.length;i+=7)calWeeks.push(calCells.slice(i,i+7));
  function calColor(pnl){
    if(pnl===null)return'var(--bg3)';if(pnl===0)return'var(--border)';
    const intensity=Math.min(Math.abs(pnl)/maxAbsPnl,1);
    return pnl>0?`rgba(0,255,136,${0.15+intensity*0.75})`:`rgba(255,51,85,${0.15+intensity*0.75})`;
  }

  const fmt$=v=>(v>=0?'+$':'-$')+Math.abs(v).toFixed(0);
  const fmtPnl=v=>`<span style="color:${v>=0?'var(--green)':'var(--red)'}">${fmt$(v)}</span>`;

  el.innerHTML=`
  <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);letter-spacing:2px;margin-bottom:10px;">⬡ EXTENDED STATS</div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">

    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:8px;">STREAKS</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        ${[['MAX WIN',mW+' trades','var(--green)'],['MAX LOSS',mL+' trades','var(--red)'],
           ['CURRENT W',cW+' in a row',cW>0?'var(--green)':'var(--text3)'],['CURRENT L',cL+' in a row',cL>0?'var(--red)':'var(--text3)']
        ].map(([l,v,c])=>`<div><div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:2px;">${l}</div><div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${c};">${v}</div></div>`).join('')}
      </div>
    </div>

    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:8px;">EDGE METRICS</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        ${[['EXPECTANCY',expectancy!==null?fmt$(expectancy):'—',expectancy&&expectancy>=0?'var(--green)':'var(--red)'],
           ['LARGEST WIN',largestW?fmt$(largestW):'—','var(--green)'],
           ['LARGEST LOSS',largestL?fmt$(largestL):'—','var(--red)'],
           ['TOTAL P&L',fmt$(totalPnl),totalPnl>=0?'var(--green)':'var(--red)']
        ].map(([l,v,c])=>`<div><div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:2px;">${l}</div><div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${c};">${v}</div></div>`).join('')}
      </div>
    </div>

    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:8px;">DAILY RESULTS</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        ${[['GREEN DAYS',greenDays+' days','var(--green)'],['RED DAYS',redDays+' days','var(--red)'],
           ['BEST DAY',bestDay?fmt$(bestDay[1]):'—','var(--green)'],['WORST DAY',worstDay?fmt$(worstDay[1]):'—','var(--red)']
        ].map(([l,v,c])=>`<div><div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:2px;">${l}</div><div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${c};">${v}</div></div>`).join('')}
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">

    <!-- DOW breakdown — enhanced -->
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:8px;">P&L BY DAY OF WEEK</div>
      <div style="display:grid;grid-template-columns:36px 1fr 64px 52px 48px;gap:3px;font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:4px;">
        <div></div><div>BAR</div><div style="text-align:right;">NET P&L</div><div style="text-align:right;">WIN%</div><div style="text-align:right;">TRADES</div>
      </div>
      ${tradingDOW.length?tradingDOW.map(d=>{
        const s=dowStats[d];
        const wr=s.total?Math.round(s.wins/s.total*100):0;
        const barW=Math.round(Math.abs(s.pnl)/maxDowPnl*100);
        const c=s.pnl>=0?'var(--green)':'var(--red)';
        const avgH=s.holdMins.length?(()=>{const avg=s.holdMins.reduce((a,b)=>a+b,0)/s.holdMins.length;return avg<60?Math.round(avg)+'m':Math.floor(avg/60)+'h'+Math.round(avg%60)+'m';})():'';
        return `<div style="display:grid;grid-template-columns:36px 1fr 64px 52px 48px;gap:3px;align-items:center;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
          <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text2);">${d}${avgH?`<div style="font-size:7px;color:var(--text3);">${avgH}</div>`:''}  </div>
          <div style="height:10px;background:var(--bg2);border-radius:2px;overflow:hidden;"><div style="width:${barW}%;height:100%;background:${c}88;border-radius:2px;"></div></div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${c};text-align:right;">${fmt$(s.pnl)}</div>
          <div style="font-size:10px;color:${wr>=50?'var(--green)':'var(--red)'};text-align:right;">${wr}%</div>
          <div style="font-size:10px;color:var(--text3);text-align:right;">${s.total}</div>
        </div>`;
      }).join(''):'<div style="font-size:11px;color:var(--text3);">No data</div>'}
    </div>

    <!-- Holding time distribution -->
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:8px;">HOLDING TIME DISTRIBUTION</div>
      ${heldTrades.length?`
      <div style="display:flex;gap:6px;align-items:flex-end;height:60px;margin-bottom:6px;">
        ${Object.entries(buckets).map(([label,count])=>{
          const barH=Math.max(2,Math.round(count/maxBucket*52));
          const wr=heldTrades.filter(t=>{
            const m=t.holdingMins;
            if(label==='<5m')return m<5;
            if(label==='5–15m')return m>=5&&m<15;
            if(label==='15–30m')return m>=15&&m<30;
            if(label==='30–60m')return m>=30&&m<60;
            if(label==='1–2h')return m>=60&&m<120;
            return m>=120;
          });
          const winPct=wr.length?Math.round(wr.filter(t=>t.pnl>0).length/wr.length*100):0;
          const c=winPct>=50?'var(--green)':'var(--red)';
          return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;" title="${count} trades, ${winPct}% win rate">
            <div style="font-size:8px;color:${c};">${winPct}%</div>
            <div style="width:100%;height:${barH}px;background:${c}88;border-radius:2px 2px 0 0;"></div>
            <div style="font-size:8px;color:var(--text3);white-space:nowrap;">${label}</div>
            <div style="font-size:8px;color:var(--text2);">${count}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="font-size:9px;color:var(--text3);text-align:center;">${heldTrades.length} trades with hold time · bar color = win rate</div>
      `:'<div style="font-size:11px;color:var(--text3);">Log exit times to see holding time stats</div>'}
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">

    <!-- Hour of day -->
    ${sortedHours.length>=2?`
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:8px;">P&L BY HOUR (CT)</div>
      <div style="display:flex;gap:4px;align-items:flex-end;height:60px;">
        ${(()=>{const mx=Math.max(...sortedHours.map(([,s])=>Math.abs(s.pnl)),1);
          return sortedHours.map(([h,s])=>{
            const pct=Math.abs(s.pnl)/mx;
            const barH=Math.max(4,Math.round(pct*52));
            const c=s.pnl>=0?'var(--green)':'var(--red)';
            const h12=+h%12||12,ap=+h>=12?'p':'a';
            return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;min-width:0;" title="${h12}${ap}m: ${fmt$(s.pnl)} (${s.total} trades, ${Math.round(s.wins/s.total*100)}% win)">
              <div style="width:100%;height:${barH}px;background:${c}99;border-radius:2px 2px 0 0;"></div>
              <div style="font-size:7px;color:var(--text3);white-space:nowrap;">${h12}${ap}</div>
            </div>`;
          }).join('');})()}
      </div>
    </div>`:''}

    <!-- Calendar heatmap -->
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:6px;">DAILY HEATMAP — 8 WEEKS</div>
      <div style="display:flex;gap:2px;margin-bottom:4px;">
        ${['S','M','T','W','T','F','S'].map(d=>`<div style="flex:1;font-size:8px;color:var(--text3);text-align:center;">${d}</div>`).join('')}
      </div>
      <div style="display:flex;gap:2px;">
        ${calWeeks.map(week=>`<div style="display:flex;flex-direction:column;gap:2px;flex:1;">
          ${week.map(d=>{ if(!d)return'<div style="flex:1;aspect-ratio:1;"></div>';
            const pnlTip=d.pnl!==null?(d.pnl>=0?'+$':'-$')+Math.abs(d.pnl).toFixed(0):'no trades';
            return `<div style="flex:1;aspect-ratio:1;border-radius:2px;background:${calColor(d.pnl)};" title="${d.key}: ${pnlTip}"></div>`;
          }).join('')}
        </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:5px;font-size:8px;color:var(--text3);font-family:'Share Tech Mono',monospace;">
        <span style="color:var(--green)">■</span> profit &nbsp;
        <span style="color:var(--red)">■</span> loss &nbsp;
        <span style="color:var(--text3)">■</span> none
      </div>
    </div>
  </div>`;
}

// ── Setup breakdown ───────────────────────────────────────────────────────────
function tjRenderSetupBreakdown(filtered) {
  const el = document.getElementById('tjSetupBreakdownPanel');
  if (!el) return;
  const bySetup={};
  filtered.forEach(t=>{
    const key=t.setup||'Untagged';
    if(!bySetup[key])bySetup[key]={wins:0,losses:0,be:0,pnl:0,count:0,holdMins:[]};
    bySetup[key].count++; bySetup[key].pnl+=t.pnl||0;
    if(t.outcome==='WIN')bySetup[key].wins++;
    if(t.outcome==='LOSS')bySetup[key].losses++;
    if(t.outcome==='BE')bySetup[key].be++;
    if(t.holdingMins!=null)bySetup[key].holdMins.push(t.holdingMins);
  });
  const rows=Object.entries(bySetup).sort((a,b)=>b[1].count-a[1].count);
  if(!rows.length){el.innerHTML='';return;}
  const maxPnl=Math.max(...rows.map(r=>Math.abs(r[1].pnl)),1);

  el.innerHTML=`
    <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);letter-spacing:1px;margin-bottom:8px;">⬡ SETUP BREAKDOWN</div>
    <div style="display:grid;grid-template-columns:130px 50px 1fr 70px 60px 60px;gap:4px;font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">
      <div>SETUP</div><div style="text-align:center;">TRADES</div><div>P&L</div><div style="text-align:right;">NET</div><div style="text-align:right;">WIN%</div><div style="text-align:right;">AVG HOLD</div>
    </div>`+
    rows.map(([setup,s])=>{
      const wr=s.wins+s.losses>0?s.wins/(s.wins+s.losses)*100:0;
      const barW=Math.round(Math.abs(s.pnl)/maxPnl*100);
      const c=s.pnl>=0?'var(--green)':'var(--red)';
      const avgH=s.holdMins.length?(()=>{const avg=s.holdMins.reduce((a,b)=>a+b,0)/s.holdMins.length;return avg<60?Math.round(avg)+'m':Math.floor(avg/60)+'h'+Math.round(avg%60)+'m';})():'—';
      return `<div style="display:grid;grid-template-columns:130px 50px 1fr 70px 60px 60px;gap:4px;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${setup}</div>
        <div style="text-align:center;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);">${s.count}</div>
        <div style="height:10px;background:var(--bg2);border-radius:2px;overflow:hidden;"><div style="width:${barW}%;height:100%;background:${c}88;border-radius:2px;"></div></div>
        <div style="text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:${c};font-weight:bold;">${s.pnl>=0?'+':''}$${s.pnl.toFixed(0)}</div>
        <div style="text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:${wr>=50?'var(--green)':'var(--red)'};">${wr.toFixed(0)}%</div>
        <div style="text-align:right;font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text3);">${avgH}</div>
      </div>`;
    }).join('');
}

// ── Setup filter population ───────────────────────────────────────────────────
function tjPopulateSetupFilter() {
  const el = document.getElementById('tj_filt_setup');
  if (!el) return;
  const setups=[...new Set(_trades.map(t=>t.setup).filter(Boolean))].sort();
  const cur=el.value;
  el.innerHTML='<option value="">ALL SETUPS</option>'+setups.map(s=>`<option${s===cur?' selected':''}>${s}</option>`).join('');
}

// ── Main render ───────────────────────────────────────────────────────────────
window.tjRender = function() {
  tjPopulateSetupFilter();
  const filtered=tjFiltered();
  const sorted=tjSort(filtered);
  tjRenderSummary(filtered);
  tjRenderPnlChart(filtered);
  tjRenderStats(filtered);
  tjRenderSetupBreakdown(filtered);

  const tbody=document.getElementById('tjTradeBody');
  if (!tbody) return;

  if (!sorted.length) {
    tbody.innerHTML='<tr><td colspan="16" style="text-align:center;color:var(--text3);padding:24px;font-size:12px;">No trades logged yet. Use the form to add your first trade.</td></tr>';
    return;
  }

  tbody.innerHTML=sorted.map(t=>{
    const dirColor=t.direction==='CALL'?'var(--green)':'var(--red)';
    const outColor={WIN:'var(--green)',LOSS:'var(--red)',BE:'var(--yellow)',OPEN:'var(--cyan)'}[t.outcome]||'var(--text3)';
    const pnlColor=t.pnl===null?'var(--text3)':t.pnl>=0?'var(--green)':'var(--red)';
    const pnlStr=t.pnl===null?'—':(t.pnl>=0?'+':'')+'$'+t.pnl.toFixed(0);
    const pnlPctStr=t.pnlPct===null?'—':(t.pnlPct>=0?'+':'')+t.pnlPct.toFixed(1)+'%';
    const exitField=t.exit!==null
      ?`<span style="color:var(--text2);">$${t.exit.toFixed(2)}</span>`
      :`<input type="number" step="0.01" placeholder="fill exit" onblur="tjUpdateExit(${t.id},this.value)" style="width:70px;background:var(--bg3);border:1px solid var(--cyan)44;border-radius:2px;padding:2px 4px;color:var(--cyan);font-family:'Share Tech Mono',monospace;font-size:11px;outline:none;" title="Enter exit price to close this trade"/>`;
    const noteShort=(t.notes||'').length>35?t.notes.slice(0,35)+'…':(t.notes||'—');
    const screenshotBtn=t.screenshot?`<button onclick="tjViewTradeScreenshot(${t.id})" style="background:none;border:none;color:var(--cyan);cursor:pointer;font-size:11px;padding:1px 3px;" title="View screenshot">📷</button>`:'';
    const outLabel=t.outcome==='OPEN'?'<span style="animation:pulse 2s infinite;display:inline-block;">●</span> OPEN':t.outcome;

    return `<tr>
      <td style="text-align:left;padding-left:10px;white-space:nowrap;font-size:11px;">${t.date}<br><span style="color:var(--text3);font-size:9px;">${t.time||''}</span></td>
      <td style="color:${dirColor};font-weight:bold;">${t.direction}</td>
      <td style="color:var(--text2);">${t.strike!==null?'$'+t.strike:'—'}</td>
      <td style="color:var(--text3);font-size:10px;">${t.expiry||'—'}</td>
      <td style="color:var(--purple);font-size:10px;">${t.setup||'—'}</td>
      <td>$${t.entry.toFixed(2)}</td>
      <td>${exitField}</td>
      <td>${t.qty}</td>
      <td style="color:${pnlColor};font-weight:bold;">${pnlStr}</td>
      <td style="color:${pnlColor};font-size:10px;">${pnlPctStr}</td>
      <td style="color:var(--text3);font-size:10px;">${t.holdingTime||'—'}</td>
      <td style="color:${outColor};font-family:'Orbitron',monospace;font-size:9px;font-weight:bold;">${outLabel}</td>
      <td style="text-align:left;color:var(--text3);font-size:10px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escHtml(t.notes||'')}">${escHtml(noteShort)}</td>
      <td style="text-align:center;">${screenshotBtn}</td>
      <td style="text-align:right;white-space:nowrap;">
        <button onclick="tjEditTrade(${t.id})" style="background:none;border:none;color:var(--cyan);cursor:pointer;font-size:11px;padding:2px 4px;" title="Edit trade">✏</button>
        <button onclick="tjDeleteTrade(${t.id})" style="background:none;border:none;color:#ff335555;cursor:pointer;font-size:11px;padding:2px 4px;" title="Delete">✕</button>
      </td>
    </tr>`;
  }).join('');
};

function escHtml(str){return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ── Export / Import ───────────────────────────────────────────────────────────
window.tjExportCSV = function() {
  const cols=['date','time','exitTime','direction','type','strike','expiry','entry','exit','qty','spyPx','spyExit','setup','outcome','pnl','pnlPct','holdingTime','notes','lesson'];
  const header=cols.join(',');
  const rows=_trades.map(t=>cols.map(k=>{const v=t[k]??'';const s=String(v);return s.includes(',')||s.includes('"')||s.includes('\n')?'"'+s.replace(/"/g,'""')+'"':s;}).join(','));
  const csv=[header,...rows].join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='spy_trades_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
};

window.tjExportJSON = function() {
  const blob=new Blob([JSON.stringify(_trades,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='spy_trades_'+new Date().toISOString().slice(0,10)+'.json';a.click();
};

window.tjImportJSON = function(input) {
  const file=input.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try {
      const imported=JSON.parse(e.target.result);
      if(!Array.isArray(imported))throw new Error('Expected array');
      if(!confirm(`Import ${imported.length} trades? Will MERGE with existing ${_trades.length} trades (no duplicates).`))return;
      const existingIds=new Set(_trades.map(t=>t.id));
      let added=0;
      imported.forEach(t=>{if(!existingIds.has(t.id)){_trades.push(t);added++;}});
      tjSave();tjRender();
      alert(`Imported ${added} new trades.`);
    } catch(err){alert('Import failed: '+err.message);}
    input.value='';
  };
  reader.readAsText(file);
};

// ── Subtab switching ──────────────────────────────────────────────────────────
window.switchJournalSubtab = function(tab) {
  ['trades','chart'].forEach(t=>{
    const panel=document.getElementById('jpanel-'+t);
    const btn=document.getElementById('jsubtab-'+t);
    if(!panel||!btn)return;
    if(t===tab){panel.style.display='';btn.style.borderBottomColor=t==='trades'?'var(--green)':'var(--cyan)';btn.style.color=t==='trades'?'var(--green)':'var(--cyan)';}
    else{panel.style.display='none';btn.style.borderBottomColor='transparent';btn.style.color='var(--text3)';}
  });
  if(tab==='trades')tjRender();
};

// ── Init ──────────────────────────────────────────────────────────────────────
function tjInit(){
  tjLoad();tjPrefillDate();tjSetDir('CALL');tjSetOutcome('OPEN');tjRender();
  // Paste screenshot anywhere on journal tab
  document.addEventListener('paste', e=>{
    if(document.getElementById('panel-journal')?.classList.contains('active'))tjPasteScreenshot(e);
  });
}

const _origSwitchTab=window.switchTab;
window.switchTab=function(id,...args){
  if(typeof _origSwitchTab==='function')_origSwitchTab(id,...args);
  if(id==='journal')setTimeout(()=>{tjInit();},50);
};

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',tjInit);}
else{tjInit();}

})();
