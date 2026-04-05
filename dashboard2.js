function renderPriceHistory(sd){
  _phAllData = sd; // cache for filter/sort
  const meta = document.getElementById('phFilterMeta');
  if(meta) meta.textContent = (sd.length).toLocaleString() + ' sessions shown';
  if(!sd||!sd.length){$('priceHistBody').innerHTML='<tr><td colspan="14" class="no-data">No data</td></tr>';return;}

  // Shared helpers (also used by phRenderFiltered)
  const _phHelpers = _buildPhHelpers();

  // Stats comparison panel — rendered by phRenderFiltered (so it updates on filter toggle)
  // phRenderFiltered is called below; it will render the comparison against all-time baseline

  // Weekly gap stats (uses wem_stats from md, not sd-filterable)
    const gapStatsEl = $('gapStats');
  if(gapStatsEl) {
    const stats2 = _md?.wem_stats || {};
    if(stats2.pct_gap_weeks != null) {
      gapStatsEl.innerHTML = [
        {l:'% Weeks w/ Gap',  v:fmt(stats2.pct_gap_weeks,1)+'%'},
        {l:'% Gaps Filled',   v:fmt(stats2.pct_gaps_filled,1)+'%'},
        {l:'Avg Gap Up',      v:'+$'+fmt(stats2.avg_gap_up,2),       c:'#00ff88'},
        {l:'Avg Gap Down',    v:'-$'+fmt(Math.abs(stats2.avg_gap_down||0),2), c:'#ff3355'},
      ].map(i=>`<div style="display:flex;justify-content:space-between;padding:6px 8px;background:var(--bg3);border-radius:3px;margin-bottom:3px;">
        <span style="font-size:12px;color:var(--text2);">${i.l}</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${i.c||'var(--text)'};">${i.v}</span>
      </div>`).join('');
    } else {
      gapStatsEl.innerHTML = '<div class="no-data">Run workflow to populate WEM stats</div>';
    }
  }

  // ── DAILY GAP ANALYSIS ──────────────────────────────────────────────────

  // Render all filterable sections with full data on initial load
  phRenderFiltered(sd);
}

// Build shared helper functions for price history rendering
function _buildPhHelpers() {
  const keyMap = {oc_pts:'open_to_close',range_pts:'day_range',oh_pts:'open_to_high',ol_pts:'open_to_low',hc_pts:'high_to_close',lc_pts:'low_to_close'};
  const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
  const pct2 = (arr,fn) => arr.length ? (arr.filter(fn).length/arr.length*100) : 0;
  const getVals = (subset,k) => subset.map(d=>{const m=d.measurements||{};const v=m[k]!=null?m[k]:m[keyMap[k]];return v!=null?v:null;}).filter(v=>v!=null);
  function calcStats(subset){
    const ocVals=getVals(subset,'oc_pts'),rngVals=getVals(subset,'range_pts');
    const ohVals=getVals(subset,'oh_pts'),olVals=getVals(subset,'ol_pts');
    const hcVals=getVals(subset,'hc_pts'),lcVals=getVals(subset,'lc_pts');
    const upVals=ocVals.filter(v=>v>0),dnVals=ocVals.filter(v=>v<0);
    return{n:subset.length,avgRng:avg(rngVals),avgOC:avg(ocVals),
      pctUp:pct2(ocVals,v=>v>0),avgUp:avg(upVals),avgDn:avg(dnVals),
      avgOH:avg(ohVals),avgOL:avg(olVals),avgHC:avg(hcVals),avgLC:avg(lcVals),
      maxUp:ocVals.length?Math.max(...ocVals):0,maxDn:ocVals.length?Math.min(...ocVals):0,
      rngVals,ocVals,ohVals,olVals};
  }
  return { keyMap, avg, pct:pct2, getVals, calcStats };
}

// Render all filterable price history sections with a given dataset
function phRenderFiltered(sd) {
  if(!sd||!sd.length) return;
  const { keyMap, avg, pct, getVals, calcStats } = _buildPhHelpers();
  const days = sd.filter(d=>d.measurements);
  const all = calcStats(days);
  const rngVals = all.rngVals, ocVals = all.ocVals, ohVals = all.ohVals, olVals = all.olVals;
  const avgOC = all.avgOC, avgRng = all.avgRng, pctUp = all.pctUp, avgUp = all.avgUp, avgDn = all.avgDn;
  const vals = (k) => getVals(days, k);

  // ── Analytics header cards ──
  const aRow = $('priceAnalyticsRow');
  if(aRow) aRow.innerHTML = [
    {l:'AVG DAY RANGE',  v:'$'+fmt(all.avgRng,2),  sub:`${all.n} sessions`,          c:'var(--cyan)'},
    {l:'% DAYS UP',      v:fmt(all.pctUp,1)+'%',   sub:`avg +$${fmt(all.avgUp,2)} up days`,   c:'#00ff88'},
    {l:'% DAYS DOWN',    v:fmt(100-all.pctUp,1)+'%',sub:`avg -$${fmt(Math.abs(all.avgDn),2)} dn days`, c:'#ff3355'},
    {l:'AVG O\u2192C',   v:(all.avgOC>=0?'+':'')+'$'+fmt(all.avgOC,2),sub:'open to close avg',c:all.avgOC>=0?'#00ff88':'#ff3355'},
  ].map(({l,v,sub,c})=>`<div class="panel" style="text-align:center;border-top:3px solid ${c};">
    <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;color:var(--text3);margin-bottom:6px;">${l}</div>
    <div style="font-family:'Share Tech Mono',monospace;font-size:24px;font-weight:bold;color:${c};">${v}</div>
    <div style="font-size:11px;color:var(--text3);margin-top:4px;">${sub}</div>
  </div>`).join('');

  // ── Stats comparison table (filtered period vs all-time baseline) ──
  const ytdEl2 = $('priceYTDPanel');
  if(ytdEl2 && _phAllData) {
    const allDays2 = _phAllData.filter(d=>d.measurements);
    const allStats = calcStats(allDays2);
    const curYear2 = new Date().getFullYear();
    // Label the comparison columns based on what data is active
    const isFiltered = days.length < allDays2.length * 0.95;
    const filterLabel = days.length === allDays2.length ? `ALL HISTORY (${all.n}d)` :
      days.length < 70 ? `${curYear2} YTD (${all.n}d)` :
      days.length < 1600 ? `SINCE 2020 (${all.n}d)` : `FILTERED (${all.n}d)`;
    const $d2 = v=>'$'+fmt(Math.abs(v),2);
    const $p2 = v=>fmt(v,1)+'%';
    const row2=(label,av,fv,fmtFn,hib)=>{
      if(!isFiltered){
        // When showing all data, compare all-time vs current year
        const ytdDays2=allDays2.filter(d=>d.date&&d.date.startsWith(String(curYear2)));
        const ytdStats=calcStats(ytdDays2);
        av=fv=null; // handled separately below
      }
      const diff=av!=null&&fv!=null?fv-av:null;
      const dc=diff===null?'var(--text2)':(diff===0?'var(--text2)':(diff>0)===hib?'#00ff88':'#ff3355');
      return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr 80px;gap:6px;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:13px;color:var(--text2);">${label}</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:13px;text-align:right;">${fmtFn(av)}</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--cyan);text-align:right;">${fmtFn(fv)}</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${dc};text-align:right;">${diff!=null?(diff>=0?'+':'')+fmtFn(diff):'—'}</span>
      </div>`;
    };
    // Simpler: always compare all-time baseline against the currently filtered data
    const base = allStats; // all-time is always left column
    const cur3 = all;      // currently filtered data is right column
    ytdEl2.innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 80px;gap:6px;padding:5px 0;margin-bottom:2px;">
        <span style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);">METRIC</span>
        <span style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);text-align:right;">ALL HISTORY (${base.n}d)</span>
        <span style="font-family:'Orbitron',monospace;font-size:9px;color:var(--cyan);text-align:right;">${filterLabel}</span>
        <span style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);text-align:right;">DIFF</span>
      </div>
      ${[
        ['Avg Day Range',    base.avgRng,              cur3.avgRng,              $d2, false],
        ['% Days Up',        base.pctUp,               cur3.pctUp,               $p2, true],
        ['Avg Up Day',       base.avgUp,               cur3.avgUp,               $d2, true],
        ['Avg Down Day',     Math.abs(base.avgDn),     Math.abs(cur3.avgDn),     $d2, false],
        ['Avg O→C',     base.avgOC,               cur3.avgOC,               $d2, true],
        ['Avg O→H',     base.avgOH,               cur3.avgOH,               $d2, true],
        ['Avg O→L',     Math.abs(base.avgOL),     Math.abs(cur3.avgOL),     $d2, false],
        ['Avg H→C',     base.avgHC,               cur3.avgHC,               $d2, true],
        ['Avg L→C',     base.avgLC,               cur3.avgLC,               $d2, true],
        ['Largest Up Day',   base.maxUp,               cur3.maxUp,               $d2, true],
        ['Largest Down Day', Math.abs(base.maxDn),     Math.abs(cur3.maxDn),     $d2, false],
      ].map(([label,av,fv,fmtFn,hib])=>{
        const diff=fv-av;
        const dc=diff===0?'var(--text2)':(diff>0)===hib?'#00ff88':'#ff3355';
        return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr 80px;gap:6px;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:13px;color:var(--text2);">${label}</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:13px;text-align:right;">${fmtFn(av)}</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--cyan);text-align:right;">${fmtFn(fv)}</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${dc};text-align:right;">${(diff>=0?'+':'')+fmtFn(diff)}</span>
        </div>`;
      }).join('')}
    `;
  }

  // Range distribution bar chart
  const rngEl = $('rangeDistChart');
  if(rngEl && rngVals.length) {
    const bins = [0,5,10,15,20,25,30,999];
    const labels = ['0-5','5-10','10-15','15-20','20-25','25-30','30+'];
    const counts = Array(7).fill(0);
    rngVals.forEach(v => {
      for(let i=0;i<bins.length-1;i++) if(v>=bins[i]&&v<bins[i+1]) { counts[i]++; break; }
    });
    const maxC = Math.max(...counts,1);
    rngEl.innerHTML = `<div style="display:flex;flex-direction:column;gap:4px;">`+
      labels.map((l,i)=>`<div style="display:flex;align-items:center;gap:8px;">
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text3);width:36px;">${l}</span>
        <div style="flex:1;height:16px;background:var(--bg3);border-radius:2px;overflow:hidden;">
          <div style="width:${(counts[i]/maxC*100).toFixed(1)}%;height:100%;background:var(--cyan);opacity:0.7;border-radius:2px;"></div>
        </div>
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);width:24px;text-align:right;">${counts[i]}</span>
        <span style="font-size:10px;color:var(--text3);width:32px;">${(counts[i]/rngVals.length*100).toFixed(0)}%</span>
      </div>`).join('')+'</div>';
  }

  // Unfilled gaps — all history
  const gapHistEl = $('priceHistGaps');
  if(gapHistEl) {
    const cur2 = _md?.quotes?.['SPY']?.price || 0;
    const gaps = [];
    for(let i=0;i<sd.length-1;i++){
      const t=sd[i], p=sd[i+1];
      if(!t.open||!p.close) continue;
      const gs=t.open-p.close;
      if(Math.abs(gs)<0.20) continue;
      let filled=false;
      for(let j=i-1;j>=0;j--){
        const c=sd[j];
        if(!c.low||!c.high) continue;
        if(gs>0&&c.low<=p.close){filled=true;break;}
        if(gs<0&&c.high>=p.close){filled=true;break;}
      }
      if(!filled) gaps.push({fillLevel:p.close,gapDate:p.date,gapSize:gs,dist:cur2-p.close});
    }
    gaps.sort((a,b)=>Math.abs(a.dist)-Math.abs(b.dist));
    if(!gaps.length) {
      gapHistEl.innerHTML='<div class="no-data">No unfilled gaps found</div>';
    } else {
      gapHistEl.innerHTML=`<div style="display:flex;flex-direction:column;gap:4px;max-height:260px;overflow-y:auto;">`+
        gaps.map(g=>{
          const c=g.dist>0?'#00ff88':'#ff3355';
          const d=new Date(g.gapDate+'T12:00:00');
          const dl=d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:var(--bg3);border:1px solid var(--border);border-left:3px solid ${c};border-radius:0 3px 3px 0;">
            <span style="font-size:12px;color:var(--text2);">${dl}</span>
            <span style="font-family:'Share Tech Mono',monospace;font-size:14px;font-weight:bold;color:${c};">$${fmt(g.fillLevel,2)}</span>
            <span style="font-family:'Orbitron',monospace;font-size:9px;color:${c};">${g.gapSize>0?'↑ UP':'↓ DN'} ${Math.abs(g.gapSize).toFixed(2)}pts</span>
            <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${c};">${g.dist>0?'+':''}${fmt(g.dist,2)} away</span>
          </div>`;
        }).join('')+`</div>
        <div style="font-size:11px;color:var(--text3);margin-top:6px;">${gaps.length} unfilled gaps · sorted by distance from current price</div>`;
    }
  }

  // Measurements averages
  const measEl = $('measAvgPanel');
  if(measEl) {
    const items = [
      {l:'Avg Open→High',  v:'+$'+fmt(avg(ohVals),2),  c:'#00ff88'},
      {l:'Avg Open→Low',   v:'-$'+fmt(Math.abs(avg(olVals)),2), c:'#ff3355'},
      {l:'Avg High→Close', v:(avg(vals('hc_pts'))>=0?'+':'')+'$'+fmt(avg(vals('hc_pts')),2), c:'var(--text)'},
      {l:'Avg Low→Close',  v:'+$'+fmt(avg(vals('lc_pts')),2), c:'var(--text)'},
      {l:'Avg Day Range',  v:'$'+fmt(avgRng,2), c:'var(--cyan)'},
      {l:'Largest Up Day', v:'+$'+fmt(Math.max(...ocVals),2), c:'#00ff88'},
      {l:'Largest Dn Day', v:'-$'+fmt(Math.abs(Math.min(...ocVals)),2), c:'#ff3355'},
      {l:'Avg Vol',        v:fmtK(avg(sd.map(d=>d.volume||0).filter(Boolean))), c:'var(--text2)'},
    ];
    measEl.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">`+
      items.map(i=>`<div style="display:flex;justify-content:space-between;padding:6px 8px;background:var(--bg3);border-radius:3px;">
        <span style="font-size:12px;color:var(--text2);">${i.l}</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${i.c};">${i.v}</span>
      </div>`).join('')+'</div>';
  }

  // DoD historical
  const dodEl = $('dodHistPanel');
  if(dodEl && sd.length>1) {
    const gaps2 = [], gapUps = [], gapDns = [];
    for(let i=0;i<sd.length-1;i++){
      const t=sd[i],p=sd[i+1];
      if(t.open&&p.close){const g=t.open-p.close;if(Math.abs(g)>0.1){gaps2.push(g);g>0?gapUps.push(g):gapDns.push(g);}}
    }
    const ocPairs = sd.slice(0,-1).map((t,i)=>({cc:t.close-sd[i+1].close})).filter(x=>x.cc);
    dodEl.innerHTML=`<div style="display:flex;flex-direction:column;gap:4px;">`+[
      {l:'% Days Gapped Up',    v:fmt(pct(gaps2,v=>v>0),1)+'%', c:'#00ff88'},
      {l:'% Days Gapped Down',  v:fmt(pct(gaps2,v=>v<0),1)+'%', c:'#ff3355'},
      {l:'Avg Gap Up Size',     v:'+$'+fmt(avg(gapUps),2), c:'#00ff88'},
      {l:'Avg Gap Dn Size',     v:'-$'+fmt(Math.abs(avg(gapDns)),2), c:'#ff3355'},
      {l:'% C-to-C Positive',   v:fmt(pct(ocPairs.map(x=>x.cc),v=>v>0),1)+'%', c:'#00ff88'},
      {l:'% C-to-C Negative',   v:fmt(pct(ocPairs.map(x=>x.cc), v=>v<0),1)+'%', c:'#ff4444'},
      {l:'Avg C-to-C Move',     v:(avg(ocPairs.map(x=>x.cc))>=0?'+':'')+'$'+fmt(avg(ocPairs.map(x=>x.cc)),2), c:'var(--text)'},
    ].map(i=>`<div style="display:flex;justify-content:space-between;padding:6px 8px;background:var(--bg3);border-radius:3px;">
      <span style="font-size:12px;color:var(--text2);">${i.l}</span>
      <span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${i.c};">${i.v}</span>
    </div>`).join('')+'</div>';
  }

  // Weekly gap stats — pulled from _md if available

  // Gap OHLC analysis — rendered by _renderGapOHLCBlocks (called from gap-stats tab and on load)
  _renderGapOHLCBlocks(sd);
  // ── Raw table ──
  // Raw table — price history
  $('priceHistBody').innerHTML=sd.map(day=>{
    const m=day.measurements||{};
    const oc=m.oc_pts??m.open_to_close, ocp=m.oc_pct??m.pct_open_to_close;
    const rng=m.range_pts??m.day_range, rngp=m.range_pct??m.pct_day_range;
    const oh=m.oh_pts??m.open_to_high, ol=m.ol_pts??m.open_to_low;
    const hc=m.hc_pts??m.high_to_close, lc=m.lc_pts??m.low_to_close;
    return `<tr>
    <td>${day.date}</td>
    <td>${fmt(day.open,2)}</td><td class="up">${fmt(day.high,2)}</td><td class="dn">${fmt(day.low,2)}</td>
    <td class="${day.close>=day.open?'up':'dn'}">${fmt(day.close,2)}</td>
    <td>${fmtK(day.volume)}</td>
    <td class="${clr(oc)}">${sign(oc)}${fmt(oc,2)}</td>
    <td class="${clr(ocp)}">${sign(ocp)}${fmt(ocp,2)}%</td>
    <td>${fmt(rng,2)}</td><td>${fmt(rngp,2)}%</td>
    <td class="${clr(oh)}">${sign(oh)}${fmt(oh,2)}</td>
    <td class="${clr(ol)}">${sign(ol)}${fmt(ol,2)}</td>
    <td class="${clr(hc)}">${sign(hc)}${fmt(hc,2)}</td>
    <td class="${clr(lc)}">${sign(lc)}${fmt(lc,2)}</td>
  </tr>`;}).join('');
}


// ─── PRICE HISTORY FILTER + SORT ─────────────────────────────────────────────
let _phAllData = null;

function phSetFilter(mode, btn) {
  document.querySelectorAll('#phFilterBtns .ph-fb').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  phApplyFilter(mode);
}

// ── DOW filter state ─────────────────────────────────────────────────────
let _phActiveDows = new Set([1,2,3,4,5]); // Mon=1 … Fri=5 (JS getDay())

function phToggleDow(dow, btn) {
  if (_phActiveDows.has(dow)) {
    _phActiveDows.delete(dow);
    btn.classList.remove('active');
  } else {
    _phActiveDows.add(dow);
    btn.classList.add('active');
  }
  phApplyFilter();
}

function phDowAll() {
  _phActiveDows = new Set([1,2,3,4,5]);
  document.querySelectorAll('#phDowBtns .ph-dow[data-dow]').forEach(b => {
    if (!isNaN(Number(b.dataset.dow))) b.classList.add('active');
    else b.classList.remove('active');
  });
  phApplyFilter();
}

function phDowNone() {
  _phActiveDows = new Set();
  document.querySelectorAll('#phDowBtns .ph-dow[data-dow]').forEach(b => {
    b.classList.remove('active');
  });
  phApplyFilter();
}

function _getDow(dateStr) {
  // Returns 1=Mon … 5=Fri. Use noon UTC to avoid timezone edge cases.
  return new Date(dateStr + 'T12:00:00').getDay();
}

function phApplyFilter(mode) {
  if(!_phAllData) return;
  const sd = _phAllData;
  const curYear = new Date().getFullYear();

  if(!mode || typeof mode !== 'string') {
    const active = document.querySelector('#phFilterBtns .ph-fb.active');
    mode = active ? (active.textContent.includes('2020') ? '2020' : active.textContent.includes('YTD') ? 'ytd' : 'all') : 'all';
  }

  let filtered;
  if(mode === '2020')     filtered = sd.filter(d => d.date && d.date >= '2020-01-01');
  else if(mode === 'ytd') filtered = sd.filter(d => d.date && d.date.startsWith(String(curYear)));
  else                    filtered = sd;

  // DOW filter — skip if all 5 days selected (no-op)
  if (_phActiveDows.size > 0 && _phActiveDows.size < 5) {
    filtered = filtered.filter(d => d.date && _phActiveDows.has(_getDow(d.date)));
  } else if (_phActiveDows.size === 0) {
    filtered = []; // none selected — show nothing
  }

  // Sort
  const sortVal = (document.getElementById('phSortCol') || {}).value || 'date_desc';
  const km = {oc_pts:'open_to_close', range_pts:'day_range'};
  const getM = (day, k) => { const m=day.measurements||{}; return m[k]!=null?m[k]:(m[km[k]]!=null?m[km[k]]:0); };
  const sorted = [...filtered].sort((a,b) => {
    switch(sortVal) {
      case 'date_desc':  return (b.date||'').localeCompare(a.date||'');
      case 'date_asc':   return (a.date||'').localeCompare(b.date||'');
      case 'oc_desc':    return getM(b,'oc_pts') - getM(a,'oc_pts');
      case 'oc_asc':     return getM(a,'oc_pts') - getM(b,'oc_pts');
      case 'range_desc': return getM(b,'range_pts') - getM(a,'range_pts');
      case 'range_asc':  return getM(a,'range_pts') - getM(b,'range_pts');
      case 'vol_desc':   return (b.volume||0) - (a.volume||0);
      case 'close_desc': return (b.close||0) - (a.close||0);
      case 'close_asc':  return (a.close||0) - (b.close||0);
      default: return 0;
    }
  });

  const meta = document.getElementById('phFilterMeta');
  if(meta) meta.textContent = sorted.length.toLocaleString() + ' sessions shown';

  // Re-render ALL filterable sections with the sorted/filtered data
  phRenderFiltered(sorted);
}


// ── TIME OF DAY STATS ─────────────────────────────────────────────────────────
function renderTODStats() {
  if (typeof TOD_STATS === 'undefined') return;
  const T = TOD_STATS;

  // Map TOD_STATS shape → normalized locals
  const totalDays    = T.days;
  const dateRange    = T.date_range;
  const hodBuckets   = T.hod.by_bucket;   // [{label, count, pct}, ...]
  const lodBuckets   = T.lod.by_bucket;
  const hodByDow     = T.hod.by_dow;      // [{dow, counts:[], pcts:[]}, ...]
  const lodByDow     = T.lod.by_dow;
  const seq          = T.sequence;        // {hod_before_lod, hod_after_lod, hod_same_lod}

  // Header meta
  const daysEl = document.getElementById('todDays');
  const rangeEl = document.getElementById('todRange');
  if (daysEl) daysEl.textContent = totalDays + ' days';
  if (rangeEl) rangeEl.textContent = dateRange.start + ' → ' + dateRange.end;

  // Color ramp
  const bucketColors = [
    '#ff8800', // 8:30-9:00   Open Auction
    '#ffcc00', // 9:00-9:30   Early Open
    '#00ff88', // 9:30-10:30  First Hour
    '#00ccff', // 10:30-12:00 Mid Morning
    '#8855ff', // 12:00-1:00  Lunch
    '#00ccff', // 1:00-2:00   Early Afternoon
    '#ffcc00', // 2:00-2:30   Pre-Close
    '#ff5500', // 2:30-3:00   Close
  ];

  function buildBucketChart(containerId, buckets) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const maxPct = Math.max(...buckets.map(b => b.pct), 1);
    const topBucket = buckets.reduce((a, b) => b.pct > a.pct ? b : a, buckets[0]);

    el.innerHTML = buckets.map((b, i) => {
      const barW = Math.round(b.pct / maxPct * 100);
      const isTop = b.label === topBucket.label;
      const c = bucketColors[i];
      return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;${isTop ? 'background:rgba(255,255,255,0.03);border-radius:3px;padding:1px 3px;' : 'padding:1px 3px;'}">
        <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:${isTop ? c : 'var(--text3)'};width:78px;flex-shrink:0;white-space:nowrap;">${b.label}${isTop ? ' ★' : ''}</div>
        <div style="flex:1;height:18px;background:var(--bg3);border-radius:2px;overflow:hidden;position:relative;">
          <div style="width:${barW}%;height:100%;background:${c}${isTop ? 'ee' : '77'};border-radius:2px;"></div>
        </div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${isTop ? c : 'var(--text2)'};width:42px;text-align:right;font-weight:${isTop ? 'bold' : 'normal'};">${b.pct.toFixed(1)}%</div>
        <div style="font-size:10px;color:var(--text3);width:28px;text-align:right;">${b.count}</div>
      </div>`;
    }).join('') +
    `<div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text3);margin-top:4px;padding:0 3px;">
      <span>★ Most common: <span style="color:${bucketColors[buckets.indexOf(topBucket)]};">${topBucket.label}</span></span>
      <span>${topBucket.pct.toFixed(1)}% of days</span>
    </div>`;
  }

  buildBucketChart('todHodChart', hodBuckets);
  buildBucketChart('todLodChart', lodBuckets);

  // Sequence panel — derive stats from TOD_STATS.sequence + hod/lod bucket data
  const seqEl = document.getElementById('todSequencePanel');
  if (seqEl && seq) {
    const hodBeforeLodPct = seq.hod_before_lod ? seq.hod_before_lod.pct : 0;
    const hodAfterLodPct  = seq.hod_after_lod  ? seq.hod_after_lod.pct  : 0;
    const lodBeforeHodPct = hodAfterLodPct; // LOD before HOD = HOD after LOD
    // first/last 30-min pcts come from the bucket arrays directly
    const hodFirst30 = T.hod.pct_first30 != null ? T.hod.pct_first30 : hodBuckets[0].pct;
    const hodLast30  = T.hod.pct_last30  != null ? T.hod.pct_last30  : hodBuckets[hodBuckets.length-1].pct;
    const lodFirst30 = T.lod.pct_first30 != null ? T.lod.pct_first30 : lodBuckets[0].pct;
    const lodLast30  = T.lod.pct_last30  != null ? T.lod.pct_last30  : lodBuckets[lodBuckets.length-1].pct;

    const hodTopBucket = hodBuckets.reduce((a, b) => b.pct > a.pct ? b : a);
    const lodTopBucket = lodBuckets.reduce((a, b) => b.pct > a.pct ? b : a);

    seqEl.innerHTML = `
      <div style="font-size:11px;color:var(--text3);margin-bottom:10px;line-height:1.7;font-family:'Share Tech Mono',monospace;">
        Based on ${totalDays} days of 1-minute SPY bars (CT time).
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;">
        ${[
          {l:'LOD sets before HOD', v: lodBeforeHodPct.toFixed(1)+'%', c:'#ff3355'},
          {l:'HOD sets before LOD', v: hodBeforeLodPct.toFixed(1)+'%', c:'#00ff88'},
          {l:'HOD in first 30 min', v: hodFirst30.toFixed(1)+'%',      c:'#ffcc00'},
          {l:'LOD in first 30 min', v: lodFirst30.toFixed(1)+'%',      c:'#ffcc00'},
          {l:'HOD in last 30 min',  v: hodLast30.toFixed(1)+'%',       c:'#ff8800'},
          {l:'LOD in last 30 min',  v: lodLast30.toFixed(1)+'%',       c:'#ff8800'},
        ].map(x => `<div style="background:var(--bg3);border-radius:3px;padding:7px 9px;">
          <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:3px;">${x.l}</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:16px;font-weight:bold;color:${x.c};">${x.v}</div>
        </div>`).join('')}
      </div>
      <div style="font-size:11px;color:var(--text3);line-height:1.6;background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:3px solid var(--cyan);">
        <strong style="color:var(--text2);">Key insight:</strong>
        Most common HOD window: <strong style="color:#00ff88;">${hodTopBucket.label} (${hodTopBucket.pct.toFixed(1)}%)</strong>.
        Most common LOD window: <strong style="color:#ff3355;">${lodTopBucket.label} (${lodTopBucket.pct.toFixed(1)}%)</strong>.
        LOD is set before HOD ${lodBeforeHodPct.toFixed(0)}% of the time — meaning the day tends to find its low first, then rally.
        ${hodFirst30 > 15 || lodFirst30 > 15
          ? `The first 30 min (8:30–9:00 CT) sets the HOD ${hodFirst30.toFixed(0)}% of the time and LOD ${lodFirst30.toFixed(0)}% — the open auction is the single most important window.`
          : ''}
      </div>`;
  }

  // DOW panel — derive top bucket per day from by_dow arrays
  const dowEl = document.getElementById('todDowPanel');
  if (dowEl && hodByDow && lodByDow) {
    const bucketLabels = T.buckets;
    const dowRows = hodByDow.map((hd, i) => {
      const ld = lodByDow[i];
      // Find index of max pct for HOD
      const hodMaxIdx = hd.pcts.indexOf(Math.max(...hd.pcts));
      const lodMaxIdx = ld.pcts.indexOf(Math.max(...ld.pcts));
      const hodTopLabel = bucketLabels[hodMaxIdx] || '—';
      const lodTopLabel = bucketLabels[lodMaxIdx] || '—';
      const hodTopPct   = hd.pcts[hodMaxIdx] || 0;
      const lodTopPct   = ld.pcts[lodMaxIdx] || 0;
      const nDays = hd.counts.reduce((a, b) => a + b, 0);
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)22;">
        <div style="font-family:'Orbitron',monospace;font-size:10px;color:var(--text2);width:30px;">${hd.dow}</div>
        <div style="flex:1;">
          <div style="font-size:10px;color:#00ff88;margin-bottom:2px;">HOD: <strong>${hodTopLabel}</strong> <span style="color:var(--text3);">(${hodTopPct.toFixed(0)}%)</span></div>
          <div style="font-size:10px;color:#ff3355;">LOD: <strong>${lodTopLabel}</strong> <span style="color:var(--text3);">(${lodTopPct.toFixed(0)}%)</span></div>
        </div>
        <div style="text-align:right;font-size:9px;color:var(--text3);">${nDays} days</div>
      </div>`;
    }).join('');
    dowEl.innerHTML = `
      <div style="font-size:11px;color:var(--text3);margin-bottom:8px;font-family:'Share Tech Mono',monospace;">Most common bucket for HOD and LOD by day of week.</div>
      ${dowRows}`;
  }
}

// ─── VOLUME HISTORY FILTER + DOW ─────────────────────────────────────────────
let _vhAllData  = null;
let _vhActiveDows = new Set([1,2,3,4,5]);

function vhSetFilter(mode, btn) {
  document.querySelectorAll('#vhFilterBtns .ph-fb').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  vhApplyFilter(mode);
}

function vhToggleDow(dow, btn) {
  if (_vhActiveDows.has(dow)) {
    _vhActiveDows.delete(dow);
    btn.classList.remove('active');
  } else {
    _vhActiveDows.add(dow);
    btn.classList.add('active');
  }
  vhApplyFilter();
}

function vhDowAll() {
  _vhActiveDows = new Set([1,2,3,4,5]);
  document.querySelectorAll('#vhDowBtns .ph-dow[data-dow]').forEach(b => {
    if (!isNaN(Number(b.dataset.dow))) b.classList.add('active');
    else b.classList.remove('active');
  });
  vhApplyFilter();
}

function vhDowNone() {
  _vhActiveDows = new Set();
  document.querySelectorAll('#vhDowBtns .ph-dow[data-dow]').forEach(b => {
    b.classList.remove('active');
  });
  vhApplyFilter();
}

function vhApplyFilter(mode) {
  if (!_vhAllData) return;
  const sd = _vhAllData;
  const curYear = new Date().getFullYear();

  if (!mode || typeof mode !== 'string') {
    const active = document.querySelector('#vhFilterBtns .ph-fb.active');
    mode = active ? (active.textContent.includes('2020') ? '2020' : active.textContent.includes('YTD') ? 'ytd' : 'all') : 'all';
  }

  let filtered;
  if (mode === '2020')     filtered = sd.filter(d => d.date && d.date >= '2020-01-01');
  else if (mode === 'ytd') filtered = sd.filter(d => d.date && d.date.startsWith(String(curYear)));
  else                     filtered = sd;

  // DOW filter
  if (_vhActiveDows.size > 0 && _vhActiveDows.size < 5) {
    filtered = filtered.filter(d => d.date && _vhActiveDows.has(_getDow(d.date)));
  } else if (_vhActiveDows.size === 0) {
    filtered = [];
  }

  const meta = document.getElementById('vhFilterMeta');
  if (meta) {
    const dowNote = _vhActiveDows.size < 5 ? ` · ${_vhActiveDows.size} day${_vhActiveDows.size !== 1 ? 's' : ''} selected` : '';
    meta.textContent = filtered.length.toLocaleString() + ' sessions shown' + dowNote;
  }

  renderVolHistory(filtered);
}

function renderVolHistory(sd){
  // Cache full dataset and update meta on direct calls (from data load)
  if (sd && (!_vhAllData || sd.length > _vhAllData.length)) {
    _vhAllData = sd;
    const meta = document.getElementById('vhFilterMeta');
    if (meta) meta.textContent = sd.length.toLocaleString() + ' sessions shown';
  }

  if(!sd||!sd.length){
    $('volHistBody').innerHTML='<tr><td colspan="9" class="no-data">No data</td></tr>';
    // Still update analytics with empty
    const vaRow = $('volAnalyticsRow');
    if (vaRow) vaRow.innerHTML = '';
    return;
  }

  const vdays = sd.filter(d=>d.volume_analysis&&d.volume>100000);
  const avgVol = vdays.reduce((a,d)=>a+d.volume,0)/(vdays.length||1);
  const vols = vdays.map(d=>d.volume);
  const maxVol = vols.length ? Math.max(...vols) : 0;
  const minVol = vols.length ? Math.min(...vols) : 0;

      // Volume analytics cards - 5 boxes in one row
  const vaRow = $('volAnalyticsRow');
  if (vaRow) {
    const prevDay = sd[1] || {};                    // Previous full trading day
    const prevVol = prevDay.volume || 0;

    // Calculate true 30-day average separately
    const last30 = sd.slice(0, 30).filter(d => d.volume > 0);
    const avg30 = last30.length 
      ? Math.round(last30.reduce((a, d) => a + d.volume, 0) / last30.length) 
      : avgVol;

    vaRow.innerHTML = [
      {l:'FULL HISTORY AVG', v:fmtK(avgVol), sub:`${vdays.length} sessions`, c:'var(--cyan)'},
      {l:'30 DAY AVG', v:fmtK(avg30), sub:`${last30.length} sessions`, c:'var(--cyan)'},
      {l:'PREVIOUS DAY VOLUME', v:fmtK(prevVol), sub:prevDay.date || '—', c:'#00ccff'},
      {l:'HIGHEST VOLUME DAY', v:fmtK(maxVol), sub:vdays.find(d=>d.volume===maxVol)?.date||'', c:'#ff8800'},
      {l:'LOWEST VOLUME DAY', v:fmtK(minVol), sub:vdays.find(d=>d.volume===minVol)?.date||'', c:'var(--text2)'},
    ].map(({l,v,sub,c}) => `
      <div class="panel" style="text-align:center;border-top:3px solid ${c}; flex: 1 1 160px; min-width: 145px; padding: 10px 8px;">
        <div style="font-family:'Orbitron',monospace;font-size:8.5px;letter-spacing:1px;color:var(--text3);margin-bottom:5px;">${l}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:20px;font-weight:bold;color:${c};">${v}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:4px;">${sub}</div>
      </div>
    `).join('');
  }
  
  // Volume trend chart — last 30 sessions as bar chart
  const trendEl = $('volTrendChart');
  if(trendEl) {
    const recent = vdays.slice(0,30).reverse();
    const mxV = Math.max(...recent.map(d=>d.volume),1);
    trendEl.innerHTML = `<div style="display:flex;align-items:flex-end;gap:2px;height:120px;padding:4px 0;">`+
      recent.map(d=>{
        const h = (d.volume/mxV*100).toFixed(1);
        const isHigh = d.volume > avgVol*1.3;
        const isLow  = d.volume < avgVol*0.7;
        const c = isHigh?'#ff8800':isLow?'#404060':'#00ff8866';
        return `<div style="flex:1;height:${h}%;background:${c};border-radius:1px 1px 0 0;min-width:4px;"
          title="${d.date}: ${fmtK(d.volume)}"></div>`;
      }).join('')+
      `</div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);">
        <span>${recent[0]?.date?.slice(5)||''}</span>
        <span style="color:#ff8800;">■ >130% avg</span>
        <span>${recent[recent.length-1]?.date?.slice(5)||''}</span>
      </div>`;
  }

  // Session breakdown averages
  const sessEl = $('volSessionAvg');
  if(sessEl) {
    // Use ALL available history with bucket data (minimal filtering)
    console.log("[Session Debug] Total days in sd:", sd ? sd.length : 0);
    console.log("[Session Debug] Days with any volume_analysis:", sd ? sd.filter(d => d.volume_analysis).length : 0);
    console.log("[Session Debug] Days with full buckets:", sd ? sd.filter(d => d.volume_analysis?.buckets?.length >= 8).length : 0);
    const withVol = sd.filter(d => d.volume_analysis?.buckets?.length);
    const n = withVol.length || 1;
    const bucketMeta = [
      {key:'vol_830_900',  label:'8:30-9:00  Open Auction',  c:'#ff5500'},
      {key:'vol_900_930',  label:'9:00-9:30  Early AM',      c:'#ff8800'},
      {key:'vol_930_1030', label:'9:30-10:30 Late Open',     c:'#ffcc00'},
      {key:'vol_1030_1200',label:'10:30-12:00 Mid AM',       c:'#88cc44'},
      {key:'vol_1200_1300',label:'12:00-1:00  Lunch',        c:'#6688aa'},
      {key:'vol_1300_1400',label:'1:00-2:00   Mid PM',       c:'#4499cc'},
      {key:'vol_1400_1430',label:'2:00-2:30   Pre-Close',    c:'#00ccff'},
      {key:'vol_1430_1500',label:'2:30-3:00   Close',        c:'#00ff88'},
    ];
    const hasBuckets = withVol.length > 0;
    let avgPcts;
    if(hasBuckets) {
      avgPcts = bucketMeta.map((bm, idx) => {
        const sum = withVol.reduce((a,d) => {
          // Match by key first (new data has key), then by index position (older data)
          const bkts = d.volume_analysis.buckets || [];
          const bkt = bkts.find(b => b.key === bm.key) || bkts[idx];
          return a + (bkt?.pct||0);
        }, 0);
        return {label:bm.label, c:bm.c, pct: sum/n};
      });
    } else {
      const fallback = vdays.filter(d=>d.volume_analysis);
      const fn2 = fallback.length || 1;
      const aOpen2  = fallback.reduce((a,d)=>a+(d.volume_analysis.open_1h_pct||0),0)/fn2;
      const aClose2 = fallback.reduce((a,d)=>a+(d.volume_analysis.close_1h_pct||0),0)/fn2;
      avgPcts = [
        {label:'Open (8:30-9:30)',  c:'#ff8800', pct:aOpen2},
        {label:'Mid Session',       c:'#88cc44', pct:100-aOpen2-aClose2},
        {label:'Close (2:00-3:00)', c:'#00ccff', pct:aClose2},
      ];
    }
    const maxPct = Math.max(...avgPcts.map(b=>b.pct), 1);
        // Most common peak volume times
    const peakTimes = {};
    const peakSrc = hasBuckets ? withVol : sd.filter(d => d.volume_analysis);
    
    peakSrc.forEach(d => {
      let rawTime = d.volume_analysis.peak_time;
      if (!rawTime) return;

      // Clean and normalize the time
      let t = rawTime.trim();
      
      // If it's a full timestamp, extract HH:MM
      if (t.includes('T') || t.includes(' ')) {
        const match = t.match(/(\d{1,2}):(\d{2})/);
        if (match) t = `${match[1].padStart(2,'0')}:${match[2]}`;
      }

      if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return;

      const [ph, pm] = t.split(':').map(Number);
      const pmins = ph*60 + pm;

      // Only count regular session (8:30 - 15:00)
      if (pmins < 8*60 + 30 || pmins >= 15*60) return;

      peakTimes[t] = (peakTimes[t] || 0) + 1;
    });

    const sortedPeaks = Object.entries(peakTimes)
      .sort((a,b) => b[1] - a[1])
      .slice(0,5);

    const peakTotal = Object.values(peakTimes).reduce((a,b) => a + b, 0) || 1;
    const bucketLabel = hasBuckets ? (n + ' sessions') : (n + ' sessions - legacy 3-bucket');
    let html = '<div style="margin-bottom:14px;">';
    html += '<div style="font-size:12px;color:var(--text3);margin-bottom:8px;">Avg volume % by bucket - regular session (8:30-3:00 CT) - ' + bucketLabel + '</div>';
    avgPcts.forEach(i => {
      html += '<div style="margin-bottom:5px;display:flex;align-items:center;gap:8px;">';
      html += '<div style="font-family:Share Tech Mono,monospace;font-size:11px;color:var(--text3);white-space:nowrap;width:160px;">' + i.label + '</div>';
      html += '<div style="flex:1;height:14px;background:var(--bg3);border-radius:2px;overflow:hidden;">';
      html += '<div style="width:' + (i.pct/maxPct*100).toFixed(1) + '%;height:100%;background:' + i.c + ';border-radius:2px;"></div></div>';
      html += '<div style="font-family:Share Tech Mono,monospace;font-size:12px;color:' + i.c + ';width:42px;text-align:right;">' + fmt(i.pct,1) + '%</div>';
      html += '</div>';
    });
    html += '</div><div>';
    html += '<div style="font-size:12px;color:var(--text3);margin-bottom:6px;">Most common peak volume times (regular session only)</div>';
    if(sortedPeaks.length) {
      sortedPeaks.forEach(([t,c]) => {
        html += '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);">';
        html += '<span style="font-family:Share Tech Mono,monospace;font-size:13px;">' + fmt12(t) + ' CT</span>';
        html += '<span style="font-size:12px;color:var(--text2);">' + c + ' days (' + fmt(c/peakTotal*100,0) + '%)</span></div>';
      });
    } else {
      html += '<div style="color:var(--text3);font-size:12px;padding:8px 0;">Run workflow to populate bucket data</div>';
    }
    html += '</div>';
    sessEl.innerHTML = html;
  }

  // Raw table
  $('volHistBody').innerHTML=sd.map(day=>{const v=day.volume_analysis||{};return `<tr>
    <td>${day.date}</td>
    <td>${fmtK(day.volume)}</td>
    <td>${v.open_1h?fmtK(v.open_1h):'—'}</td>
    <td>${v.open_1h_pct?fmt(v.open_1h_pct,1)+'%':'—'}</td>
    <td>${v.close_1h?fmtK(v.close_1h):'—'}</td>
    <td>${v.close_1h_pct?fmt(v.close_1h_pct,1)+'%':'—'}</td>
    <td>${v.peak_time||'—'}</td>
    <td>${v.peak_volume?fmtK(v.peak_volume):'—'}</td>
    <td>${v.hvn_price?'$'+fmt(v.hvn_price,2):'—'}</td>
  </tr>`;}).join('');
}

function renderWEM(md){
  const wems=md.weekly_em||[], stats=md.wem_stats||{};
  const q=md.quotes||{}, spy=q['SPY']||{};
  const cur=wems.find(w=>!w.week_close)||wems[0];

  // ── Mode toggle ──────────────────────────────────────────────────────────
  if (!window._wemMode) window._wemMode = 'dynamic';
  window._wemSetMode = function(m) {
    window._wemMode = m;
    const dynBtn    = $('wemModeDyn');
    const staticBtn = $('wemModeStatic');
    const desc      = $('wemModeDesc');
    if (dynBtn)    { dynBtn.style.background    = m==='dynamic'?'var(--cyan)':'transparent'; dynBtn.style.color    = m==='dynamic'?'#000':'var(--text2)'; dynBtn.style.borderColor    = m==='dynamic'?'var(--cyan)':'var(--border)'; }
    if (staticBtn) { staticBtn.style.background = m==='static' ?'var(--cyan)':'transparent'; staticBtn.style.color = m==='static' ?'#000':'var(--text2)'; staticBtn.style.borderColor = m==='static' ?'var(--cyan)':'var(--border)'; }
    if (desc) desc.textContent = m==='static'
      ? 'Fixed range set at Friday close · doesn\'t change during week'
      : 'Range shrinks as DTE decays · updates daily';
    const lbl = $('wemZScoreLabel');
    if (lbl) lbl.textContent = m==='static'
      ? '⬡ STATIC WEM POSITION — Z-SCORE'
      : '⬡ WEM POSITION — Z-SCORE';
    renderWEM(md);
  };

  if(cur){
    // ── STATIC WEM — locked at prior Friday close via TheoTrade formula ─────
    // set_next_week_static_wem() writes these on Friday and never overwrites them.
    // Falls back to dynamic values if static hasn't been computed yet.
    const staticHigh      = cur.static_wem_high  || cur.wem_high;
    const staticLow       = cur.static_wem_low   || cur.wem_low;
    const staticHalfRange = cur.static_wem_range  ? cur.static_wem_range / 2 : cur.wem_range / 2;
    const staticMid       = cur.friday_close      || cur.wem_mid;
    const staticRange     = cur.static_wem_range  || cur.wem_range;
    const staticIV        = cur.static_wem_iv     || cur.atm_iv || 0;

    // ── Select active mode values ──────────────────────────────────────────
    // Dynamic falls back to static when workflow hasn't run yet for the new week
    const isStatic = window._wemMode === 'static';
    const lo   = isStatic ? staticLow  : (cur.wem_low  || staticLow);
    const hi   = isStatic ? staticHigh : (cur.wem_high || staticHigh);
    const mid  = isStatic ? staticMid  : (cur.wem_mid  || staticMid);
    const halfRange = isStatic ? staticHalfRange : (cur.wem_range ? cur.wem_range / 2 : staticHalfRange);
    const price = spy.price || mid || 0;

    $('wemWeekLabel').textContent=`⬡ CURRENT WEEK — ${cur.week_start} TO ${cur.week_end}${isStatic?' · STATIC RANGE':' · DYNAMIC RANGE'}`;

    $('wemCurrentHeader').innerHTML=`
      <div class="wem-big-card">
        <div class="wem-big-lbl">WEM LOW${isStatic?' (STATIC)':''}</div>
        <div class="wem-big-val dn">$${fmt(lo,2)}</div>
        <div class="wem-big-sub">${price>lo?'+':''}$${fmt(price-lo,2)} from here</div>
      </div>
      <div class="wem-big-card">
        <div class="wem-big-lbl">${isStatic?'ANCHOR (FRI CLOSE)':'MID (ANCHOR)'}</div>
        <div class="wem-big-val">$${fmt(mid,2)}</div>
        <div class="wem-big-sub">±$${fmt(halfRange,2)} range</div>
      </div>
      <div class="wem-big-card">
        <div class="wem-big-lbl">WEM HIGH${isStatic?' (STATIC)':''}</div>
        <div class="wem-big-val up">$${fmt(hi,2)}</div>
        <div class="wem-big-sub">${price<hi?'+':''}$${fmt(hi-price,2)} from here</div>
      </div>`;

    // ── Show comparison row if in static mode ──────────────────────────────
    let comparisonHtml = '';
    if (isStatic) {
      const dynHalf = cur.wem_range / 2;
      const decay = dynHalf < staticHalfRange ? (1 - dynHalf/staticHalfRange)*100 : 0;
      comparisonHtml = `<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;padding:8px 10px;background:var(--bg3);border-radius:3px;margin-top:8px;font-size:11px;font-family:'Share Tech Mono',monospace;">
        <span style="color:var(--text3);">STATIC ±$${fmt(staticHalfRange,2)}</span>
        <span style="color:var(--text3);">→</span>
        <span style="color:var(--cyan);">DYNAMIC ±$${fmt(dynHalf,2)}</span>
        <span style="color:var(--text3);">·</span>
        <span style="color:#ff8800;">${decay.toFixed(0)}% decay · ${cur.dte||'?'} DTE remaining</span>
        <span style="color:var(--text3);">·</span>
        <span style="color:var(--text3);">Fri IV ${staticIV?fmt(staticIV*100,1)+'%':'—'} → Live IV ${atmIV?fmt(atmIV*100,1)+'%':'—'}</span>
      </div>`;
    }

    const pct = hi>lo ? Math.min(Math.max((price-lo)/(hi-lo)*100,2),98) : 50;
    $('wemTabNeedle').style.left = pct+'%';
    const nlbl = $('wemTabNeedleLabel'); if(nlbl) nlbl.textContent = '$'+fmt(price,2);
    $('wemTabLowLbl').textContent  = '$'+fmt(lo,2);
    $('wemTabMidLbl').textContent  = (isStatic?'FRI CLOSE ':'MID ')+'$'+fmt(mid,2);
    $('wemTabHighLbl').textContent = '$'+fmt(hi,2);
    $('wemTabPosText').textContent = `SPY $${fmt(price,2)} · ${price>=lo&&price<=hi?'INSIDE WEM ✓':'OUTSIDE WEM ⚠'} · ±$${fmt(halfRange,2)} · DTE ${cur.dte||'—'}${isStatic?' · STATIC':''}`;

    // Insert comparison row if static
    const compEl = $('wemCompareRow');
    if (compEl) compEl.innerHTML = comparisonHtml;

    const iv = (cur.atm_iv && cur.atm_iv>0) ? cur.atm_iv : halfRange/(mid*Math.sqrt(6/365)*0.70);
    const dailyEM   = mid * iv * Math.sqrt(1/365)  * 0.70;
    const weeklyEM  = halfRange;
    const monthlyEM = mid * iv * Math.sqrt(21/365) * 0.70;

    const emBox = (label, em, subLabel) => {
      const hiP = mid+em, loP = mid-em;
      return `<div style="background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:14px;text-align:center;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--text3);margin-bottom:8px;">${label}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:26px;font-weight:bold;color:var(--cyan);">±$${fmt(em,2)}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px;">${subLabel}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px;">
          <div style="background:var(--bg2);border:1px solid #00ff8833;border-radius:3px;padding:6px;">
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:#00ff88;">HIGH</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:14px;color:#00ff88;">$${fmt(hiP,2)}</div>
          </div>
          <div style="background:var(--bg2);border:1px solid #ff335533;border-radius:3px;padding:6px;">
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:#ff3355;">LOW</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:14px;color:#ff3355;">$${fmt(loP,2)}</div>
          </div>
        </div>
      </div>`;
    };

    const emRow = $('emBoxRow');
    if(emRow) emRow.innerHTML =
      emBox('DAILY EXPECTED MOVE',   dailyEM,   '1 trading day') +
      emBox(`${isStatic?'STATIC ':''}WEEKLY EXPECTED MOVE`,  weeklyEM,  isStatic?`Fixed from Fri close · IV ${fmt(atmIV*100,1)}%`:`${cur.dte||'—'} DTE · IV ${fmt(iv*100,1)}%`) +
      emBox('MONTHLY EXPECTED MOVE', monthlyEM, '21 trading days');
  }

  if(stats.total_weeks){
    $('wemStatsGrid').innerHTML=[
      {l:'TOTAL WEEKS',    v:stats.total_weeks},
      {l:'AVG RANGE ±',   v:'$'+fmt(stats.avg_range/2,2)},
      {l:'% INSIDE',      v:fmt(stats.pct_inside,1)+'%'},
      {l:'% OUTSIDE',     v:fmt(stats.pct_outside,1)+'%'},
      {l:'HIGH BREACH',   v:fmt(stats.pct_high_breach,1)+'%', sub: stats.avg_high_breach_amt!=null?'avg +$'+fmt(stats.avg_high_breach_amt,2):null, c:'#00ff88'},
      {l:'LOW BREACH',    v:fmt(stats.pct_low_breach,1)+'%',  sub: stats.avg_low_breach_amt !=null?'avg $'+fmt(stats.avg_low_breach_amt,2):null,  c:'#ff3355'},
    ].map(({l,v,sub,c})=>`<div class="wem-stat"><div class="ws-lbl">${l}</div><div class="ws-val"${c?` style="color:${c}"`:''}}>${v}</div>${sub?`<div style="font-size:11px;color:${c||'var(--text3)'};margin-top:3px;">${sub}</div>`:''}</div>`).join('');
  }

  if(stats.breach_by_day){
    const days=['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'];
    $('breachGrid').innerHTML=days.map(d=>`<div class="breach-day"><div class="bd-name">${d}</div><div class="bd-val ${(stats.breach_by_day[d]||0)>0?'dn':''}">
${stats.breach_by_day[d]||0} <span style="font-size:10px;color:var(--text3)">breaches</span></div></div>`).join('');
  }

  // ── Z-Score + thermometer/bell (uses active mode's lo/hi/mid) ─────────────
  const dotEl = $('wemDotPlot');
  const zEl   = $('wemZScore');
  if(!dotEl && !zEl) return;

  const isStatic2  = window._wemMode === 'static';
  // Static — uses locked values from set_next_week_static_wem() (Friday close + TheoTrade formula)
  // Dynamic falls back to static when workflow hasn't run yet for the new week
  const sHalf = cur ? ((cur.static_wem_range || cur.wem_range) / 2) : 1;
  const _sLo  = cur ? (cur.static_wem_low  || cur.wem_low)  : 0;
  const _sHi  = cur ? (cur.static_wem_high || cur.wem_high) : 0;
  const _sMid = cur ? (cur.friday_close    || cur.wem_mid)  : 0;
  const lo2   = cur ? (isStatic2 ? _sLo  : (cur.wem_low   || _sLo))  : 0;
  const hi2   = cur ? (isStatic2 ? _sHi  : (cur.wem_high  || _sHi))  : 0;
  const mid2  = cur ? (isStatic2 ? _sMid : (cur.wem_mid   || _sMid)) : 0;
  const price2 = (spy.price || mid2 || 0);
  const halfRange2 = isStatic2 ? sHalf : (cur ? (cur.wem_range/2 || sHalf) : 1);
  const z = halfRange2 > 0 ? (price2 - mid2) / halfRange2 : 0;
  const zColor = Math.abs(z)>0.8?'#ff3355':Math.abs(z)>0.5?'#ff8800':Math.abs(z)>0.25?'#ffcc00':'#00ff88';
  const zLabel = Math.abs(z)>1.0?'OUTSIDE WEM':Math.abs(z)>0.75?'NEAR BOUNDARY':Math.abs(z)>0.4?'ELEVATED':'NEAR MID';

  // Exclude current week from historical dots — it shows as NOW dot only
  const curWeekStart = cur ? cur.week_start : null;
  const histWeeks = wems
    .filter(w => w.week_close != null && w.wem_low && w.wem_high && w.wem_mid && w.week_start !== curWeekStart)
    .slice().reverse();
  const total = histWeeks.length;

  let histZ;
  if (isStatic2) {
    // Recompute Z-scores using static ranges for historical weeks
    histZ = histWeeks.map(w => {
      const fC   = w.friday_close || w.wem_mid;
      const aIV  = w.atm_iv || w.vix_iv || 0;
      const sH   = fC * aIV * Math.sqrt(6/365) * 0.70;
      const sLo  = fC - sH, sHi = fC + sH;
      const sRng = sH;
      return sRng > 0 ? (w.week_close - fC) / sRng : 0;
    });
  } else {
    histZ = histWeeks.map(w => (w.week_close - w.wem_mid) / (w.wem_range / 2));
  }

  const aboveCount  = isStatic2
    ? histWeeks.filter((w,i) => w.week_close > (w.friday_close||w.wem_mid) + histWeeks.map((_,j)=>{ const f=histWeeks[j].friday_close||histWeeks[j].wem_mid, a=histWeeks[j].atm_iv||0; return f*a*Math.sqrt(6/365)*0.70; })[i]).length
    : histWeeks.filter(w => w.week_close > w.wem_high).length;
  const belowCount  = isStatic2
    ? histWeeks.filter((w,i) => w.week_close < (w.friday_close||w.wem_mid) - histWeeks.map((_,j)=>{ const f=histWeeks[j].friday_close||histWeeks[j].wem_mid, a=histWeeks[j].atm_iv||0; return f*a*Math.sqrt(6/365)*0.70; })[i]).length
    : histWeeks.filter(w => w.week_close < w.wem_low).length;
  const insideCount = total - aboveCount - belowCount;

  const avgZ  = histZ.length ? histZ.reduce((a,b)=>a+b,0)/histZ.length : 0;
  const stdZ  = histZ.length > 1 ? Math.sqrt(histZ.reduce((a,b)=>a+(b-avgZ)**2,0)/histZ.length) : 0.5;
  const pctBeyond = histZ.length ? histZ.filter(z2=>Math.abs(z2)>Math.abs(z)).length/histZ.length*100 : null;

  // ── DOT PLOT ──────────────────────────────────────────────────────────────
  if(dotEl) {
    const dW = 700;
    const dH = 340;
    const padX = 24, padY = 20;
    const dotR   = 8;
    const rectH  = 140;
    const rectY  = dH/2 - rectH/2 + 10;
    const overY  = 50;
    const plotW  = dW - padX*2;
    const slotW  = plotW / Math.max(total + 1, 2);

    const step = Math.max(1, Math.floor(total/6));
    const timeLabels = histWeeks
      .map((w,i) => ({i, label: w.week_start?.slice(2,7)||''}))
      .filter((_,i) => i % step === 0);

    const dotsSVG = histWeeks.map((w,i) => {
      const cx = padX + (i + 0.5) * slotW;
      // Use static or dynamic range for dot positioning
      let wLo, wHi;
      if (isStatic2) {
        const fC  = w.friday_close || w.wem_mid;
        const aIV = w.atm_iv || w.vix_iv || 0;
        const sH  = fC * aIV * Math.sqrt(6/365) * 0.70;
        wLo = fC - sH; wHi = fC + sH;
      } else {
        wLo = w.wem_low; wHi = w.wem_high;
      }
      const wRange = wHi - wLo;
      let cy, color;
      if(w.week_close > wHi) {
        const excess = Math.min((w.week_close - wHi) / (wRange * 0.5), 1);
        cy = rectY - excess * (overY - 4) - dotR;
        color = '#00ff88';
      } else if(w.week_close < wLo) {
        const excess = Math.min((wLo - w.week_close) / (wRange * 0.5), 1);
        cy = rectY + rectH + excess * (overY - 4) + dotR;
        color = '#ff3355';
      } else {
        const pct2 = (w.week_close - wLo) / wRange;
        cy = rectY + rectH - pct2 * rectH;
        color = '#ffcc00';
      }
      const isNewest = i === total - 1;
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${isNewest?dotR+2:dotR}"
        fill="${color}" opacity="${isNewest?1:0.72}"
        stroke="${isNewest?'white':'none'}" stroke-width="${isNewest?1.5:0}"/>`;
    }).join('');

    var _cwDot = '';
    if (lo2 && hi2 && price2 && (hi2 - lo2) > 0) {
      var _cwRange = hi2 - lo2;
      var _cwX = (padX + (total + 0.5) * slotW).toFixed(1);
      var _cwCy, _cwCol;
      if (price2 > hi2) {
        _cwCy = (rectY - Math.min((price2 - hi2) / (_cwRange * 0.5), 1) * (overY - 4) - dotR).toFixed(1);
        _cwCol = '#00ff88';
      } else if (price2 < lo2) {
        _cwCy = (rectY + rectH + Math.min((lo2 - price2) / (_cwRange * 0.5), 1) * (overY - 4) + dotR).toFixed(1);
        _cwCol = '#ff3355';
      } else {
        _cwCy = (rectY + rectH - ((price2 - lo2) / _cwRange) * rectH).toFixed(1);
        _cwCol = '#ffcc00';
      }
      var _cwLY = (parseFloat(_cwCy) - dotR - 5).toFixed(1);
      _cwDot = '<circle cx="' + _cwX + '" cy="' + _cwCy + '" r="' + (dotR+3) + '" fill="none" stroke="' + _cwCol + '" stroke-width="1.5" opacity="0.4"/>'
             + '<circle cx="' + _cwX + '" cy="' + _cwCy + '" r="' + dotR + '" fill="' + _cwCol + '" opacity="0.95" stroke="white" stroke-width="2"/>'
             + '<text x="' + _cwX + '" y="' + _cwLY + '" text-anchor="middle" fill="' + _cwCol + '" font-size="8" font-family="Orbitron,monospace" letter-spacing="1">NOW</text>';
    }

    dotEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:11px;">
        <span style="color:#00ff88;">▲ Above: ${aboveCount} (${fmt(aboveCount/Math.max(total,1)*100,0)}%)</span>
        <span style="color:#ffcc00;">● Inside: ${insideCount} (${fmt(insideCount/Math.max(total,1)*100,0)}%)</span>
        <span style="color:#ff3355;">▼ Below: ${belowCount} (${fmt(belowCount/Math.max(total,1)*100,0)}%)</span>
      </div>
      <svg width="100%" height="${dH}" viewBox="0 0 ${dW} ${dH}" preserveAspectRatio="xMidYMid meet" style="display:block;">
        <defs>
          <linearGradient id="rg3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color="#00ff88" stop-opacity="0.1"/>
            <stop offset="50%"  stop-color="#ffcc00" stop-opacity="0.06"/>
            <stop offset="100%" stop-color="#ff3355" stop-opacity="0.1"/>
          </linearGradient>
        </defs>
        <text x="${padX}" y="${rectY-overY-6}" fill="#00ff8866" font-size="8" font-family="Orbitron,monospace">ABOVE RANGE</text>
        <text x="${padX}" y="${rectY+rectH+overY+18}" fill="#ff335566" font-size="8" font-family="Orbitron,monospace">BELOW RANGE</text>
        <rect x="${padX}" y="${rectY}" width="${plotW}" height="${rectH}" rx="3" fill="url(#rg3)"/>
        <rect x="${padX}" y="${rectY}" width="${plotW}" height="${rectH}" rx="3" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1.5"/>
        <text x="${padX+6}" y="${rectY+12}" fill="rgba(0,255,136,0.45)" font-size="8" font-family="Orbitron,monospace">HIGH</text>
        <text x="${padX+6}" y="${rectY+rectH/2+4}" fill="rgba(255,255,255,0.22)" font-size="8" font-family="Orbitron,monospace">MID</text>
        <text x="${padX+6}" y="${rectY+rectH-4}" fill="rgba(255,51,85,0.45)" font-size="8" font-family="Orbitron,monospace">LOW</text>
        <line x1="${padX}" y1="${rectY+rectH/2}" x2="${padX+plotW}" y2="${rectY+rectH/2}" stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-dasharray="3,4"/>
        ${dotsSVG}
        ${timeLabels.map(({i,label}) => {
          const tx = padX + (i+0.5)*slotW;
          return `<text x="${tx.toFixed(1)}" y="${rectY+rectH+overY+32}" text-anchor="middle" fill="rgba(255,255,255,0.2)" font-size="8" font-family="Share Tech Mono,monospace">${label}</text>`;
        }).join('')}
        <line x1="${padX}" y1="${rectY+rectH+overY+24}" x2="${padX+plotW}" y2="${rectY+rectH+overY+24}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        ${_cwDot}
      </svg>
      <div style="font-size:10px;color:var(--text3);margin-top:2px;">Oldest → Newest · newest dot has white ring · ${total} weeks${isStatic2?' · Using STATIC ranges':''}</div>`;
  }

  // ── THERMOMETER + BELL ────────────────────────────────────────────────────
  if(zEl) {
    const W = Math.max(zEl.offsetWidth||500, 380);
    const H = 380;
    const col = Math.floor(W / 3);
    const tX  = 32;
    const eX  = col + 16;
    const bX  = col * 2 + 8;
    const bW  = W - bX - 12;
    const tW  = 44;
    const tCx = tX + tW/2;
    const tH  = H - 100;
    const tY  = 40;
    const toY = v => tY + tH - ((v + 1.5) / 3) * tH;
    const zCl = Math.max(-1.5, Math.min(1.5, z));
    // Fill from center (z=0) outward — up for positive z, down for negative z
    const midY = toY(0); // pixel Y of center line
    const fillTop    = zCl >= 0 ? toY(zCl) : midY;
    const fillBottom = zCl <  0 ? toY(zCl) : midY;
    const fY = fillTop;
    const fH = fillBottom - fillTop;

    const bH = tH, bY = tY;
    // Bell curve always centered at z=0 (neutral midpoint), stdZ sets spread
    // avgZ line drawn separately to show where historical avg falls
    const bellSigma = Math.max(stdZ, 0.3); // don't let it go too narrow
    const bLine = Array.from({length: bW+1}, (_,i) => {
      const zv = -1.8 + (i/bW)*3.6;
      const y  = bY + bH - Math.exp(-0.5*(zv/bellSigma)**2) * bH * 0.82;
      return `${i===0?'M':'L'}${(bX+i).toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const bFill = bLine + ` L${bX+bW},${bY+bH} L${bX},${bY+bH} Z`;

    // Shade from center to NOW position
    const shade = (() => {
      const pts = [];
      for(let i=0;i<=bW;i++){
        const zv=-1.8+(i/bW)*3.6;
        if(z>=0 ? zv<=zCl && zv>=0 : zv>=zCl && zv<=0){
          const y=bY+bH-Math.exp(-0.5*(zv/bellSigma)**2)*bH*0.82;
          if(!pts.length) pts.push(`M${(bX+i).toFixed(1)},${(bY+bH).toFixed(1)}`);
          pts.push(`L${(bX+i).toFixed(1)},${y.toFixed(1)}`);
        }
      }
      if(pts.length) {
        const lastX = pts[pts.length-1].split(',')[0].slice(1);
        pts.push(`L${lastX},${bY+bH} Z`);
      }
      return pts.join(' ');
    })();
    const zBX  = bX + ((zCl+1.8)/3.6)*bW;   // NOW line x position
    const z0BX = bX + (1.8/3.6)*bW;          // z=0 center x position

    const modeNote = isStatic2
      ? `Static ±$${fmt(halfRange2,2)} · fixed from Fri close`
      : `Dynamic ±$${fmt(halfRange2,2)} · ${cur?.dte||'?'} DTE`;

    zEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">
        <div>
          <span style="font-family:'Share Tech Mono',monospace;font-size:34px;font-weight:bold;color:${zColor};">${z>=0?'+':''}${fmt(z,3)}</span>
          <span style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-left:8px;letter-spacing:2px;">Z-SCORE</span>
        </div>
        <div style="text-align:right;">
          <div style="font-family:'Orbitron',monospace;font-size:11px;color:${zColor};letter-spacing:3px;">${zLabel}</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text3);margin-top:3px;">${modeNote}</div>
        </div>
      </div>
      <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;">

        <!-- THERMOMETER -->
        <rect x="${tX}" y="${tY}" width="${tW}" height="${tH}" rx="${tW/2}"
          fill="var(--bg2)" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>
        <clipPath id="tc8">
          <rect x="${tX}" y="${tY}" width="${tW}" height="${tH}" rx="${tW/2}"/>
        </clipPath>
        <rect x="${tX}" y="${fY}" width="${tW}" height="${fH}"
          fill="${zColor}" opacity="0.8" clip-path="url(#tc8)"/>

        ${[-1.5,-1,-0.5,0,0.5,1,1.5].map(v=>{
          const ty=toY(v), maj=v===Math.round(v);
          const c=Math.abs(v)>=1?'#ff335566':v===0?'#00ff88aa':'rgba(255,255,255,0.15)';
          return `<line x1="${tX-(maj?14:6)}" y1="${ty}" x2="${tX}" y2="${ty}"
              stroke="${c}" stroke-width="${maj?1.5:1}"/>
            ${maj?`<text x="${tX-17}" y="${ty+4}" text-anchor="end"
              fill="${c}" font-size="10" font-family="Orbitron,monospace">${v>0?'+':''}${v}</text>`:''}`;
        }).join('')}

        <!-- Center line at z=0 always visible -->
        <line x1="${tX-4}" y1="${midY}" x2="${tX+tW+4}" y2="${midY}"
          stroke="rgba(255,255,255,0.25)" stroke-width="1" stroke-dasharray="3,3"/>
        <!-- Fill indicator arrow -->
        <polygon points="${tX+tW+3},${toY(zCl)} ${tX+tW+14},${toY(zCl)-7} ${tX+tW+14},${toY(zCl)+7}"
          fill="${zColor}"/>
        <text x="${tX+tW+18}" y="${toY(zCl)-10}"
          fill="${zColor}" font-size="10" font-family="Share Tech Mono,monospace" font-weight="bold">
          $${fmt(price2,2)}</text>
        <text x="${tX+tW+18}" y="${toY(zCl)+4}"
          fill="${zColor}" font-size="8" font-family="Orbitron,monospace">NOW</text>

        <text x="${tX+tW+18}" y="${toY(1)+4}"
          fill="#00ff8855" font-size="9" font-family="Share Tech Mono,monospace">$${fmt(hi2,2)} hi</text>
        <text x="${tX+tW+18}" y="${toY(0)+4}"
          fill="rgba(255,255,255,0.2)" font-size="9" font-family="Share Tech Mono,monospace">$${fmt(mid2,2)} mid</text>
        <text x="${tX+tW+18}" y="${toY(-1)+4}"
          fill="#ff335544" font-size="9" font-family="Share Tech Mono,monospace">$${fmt(lo2,2)} lo</text>

        <!-- EXPLANATION -->
        <text x="${eX}" y="${tY+2}" fill="rgba(255,255,255,0.5)"
          font-size="9" font-family="Orbitron,monospace" letter-spacing="1">HOW TO READ</text>
        ${[
          {c:'#00ff88', t:'Z = 0  ·  at midpoint ($'+fmt(mid2,2)+')'},
          {c:'#ffcc00', t:'Z ±0.25  ·  elevated'},
          {c:'#ff8800', t:'Z ±0.5  ·  near boundary'},
          {c:'#ff3355', t:'Z ±1.0  ·  at WEM edge ($'+fmt(hi2,2)+' / $'+fmt(lo2,2)+')'},
          {c:'#ff3355', t:'Z > ±1.0  ·  outside WEM'},
        ].map(({c,t},i)=>`
          <rect x="${eX}" y="${tY+18+i*20}" width="8" height="8" rx="1"
            fill="${c}" opacity="0.8"/>
          <text x="${eX+12}" y="${tY+26+i*20}"
            fill="rgba(255,255,255,0.5)" font-size="9" font-family="Share Tech Mono,monospace">${t}</text>
        `).join('')}

        <line x1="${eX}" y1="${tY+128}" x2="${eX+col-24}" y2="${tY+128}"
          stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
        <text x="${eX}" y="${tY+146}" fill="rgba(255,255,255,0.5)"
          font-size="9" font-family="Orbitron,monospace" letter-spacing="1">THIS WEEK</text>
        ${[
          {t:`Z = ${z>=0?'+':''}${fmt(z,3)}  ·  ${zLabel}`, c:zColor},
          {t:`$${fmt(price2,2)} is ${fmt(Math.abs(z)*100,1)}% into range`, c:'rgba(255,255,255,0.5)'},
          {t:`${z>=0?'Above':'Below'} mid by $${fmt(Math.abs(price2-mid2),2)}`, c:'rgba(255,255,255,0.4)'},
          {t:isStatic2?'Using static (fixed) range':'Using dynamic (DTE-adjusted) range', c:'rgba(255,255,255,0.3)'},
        ].map(({t,c},i)=>`
          <text x="${eX}" y="${tY+164+i*16}"
            fill="${c}" font-size="9" font-family="Share Tech Mono,monospace">${t}</text>
        `).join('')}

        <line x1="${eX}" y1="${tY+230}" x2="${eX+col-24}" y2="${tY+230}"
          stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
        <text x="${eX}" y="${tY+248}" fill="rgba(255,255,255,0.5)"
          font-size="9" font-family="Orbitron,monospace" letter-spacing="1">BELL CURVE</text>
        ${[
          {t:'Distribution of where',      c:'rgba(255,255,255,0.4)'},
          {t:'each week closed within',    c:'rgba(255,255,255,0.4)'},
          {t:`its own ${isStatic2?'STATIC':'dynamic'} WEM range.`, c:'rgba(255,255,255,0.4)'},
          {t:`Hist avg Z: ${avgZ>=0?'+':''}${fmt(avgZ,2)}  ·  σ: ${fmt(stdZ,2)}`, c:'rgba(255,255,255,0.4)'},
          {t:`NOW: top ${pctBeyond!=null?fmt(100-pctBeyond,0):'-'}% historically`, c:zColor},
          {t:`${pctBeyond!=null?fmt(pctBeyond,0):'-'}% of weeks more extreme`, c:'rgba(255,255,255,0.35)'},
        ].map(({t,c},i)=>`
          <text x="${eX}" y="${tY+266+i*15}"
            fill="${c}" font-size="9" font-family="Share Tech Mono,monospace">${t}</text>
        `).join('')}

        <!-- BELL CURVE -->
        <text x="${bX}" y="${bY-8}" fill="rgba(255,255,255,0.25)"
          font-size="9" font-family="Orbitron,monospace">Z-SCORE DISTRIBUTION${isStatic2?' (STATIC)':''}</text>
        ${shade?`<path d="${shade}" fill="${zColor}" opacity="0.25"/>`:''}
        <path d="${bLine}" fill="none" stroke="${zColor}" stroke-width="1.5" opacity="0.6"/>
        <line x1="${bX}" y1="${bY+bH}" x2="${bX+bW}" y2="${bY+bH}"
          stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
        ${[-1.5,-1,0,1,1.5].map(v=>{
          const bx=bX+((v+1.8)/3.6)*bW;
          return `<line x1="${bx}" y1="${bY+bH}" x2="${bx}" y2="${bY+bH+4}"
              stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
            <text x="${bx}" y="${bY+bH+13}" text-anchor="middle"
              fill="rgba(255,255,255,0.2)" font-size="8" font-family="Orbitron,monospace">
              ${v>0?'+':''}${v}</text>`;
        }).join('')}
        <line x1="${zBX}" y1="${bY}" x2="${zBX}" y2="${bY+bH}"
          stroke="${zColor}" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.8"/>
        <text x="${zBX}" y="${bY-4}" text-anchor="middle"
          fill="${zColor}" font-size="10" font-family="Share Tech Mono,monospace" font-weight="bold">NOW</text>
        <!-- z=0 center tick always at midpoint of bell -->
        <line x1="${z0BX}" y1="${bY+bH}" x2="${z0BX}" y2="${bY+bH+5}"
          stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
        <text x="${z0BX}" y="${bY+bH+14}" text-anchor="middle"
          fill="rgba(255,255,255,0.3)" font-size="8" font-family="Orbitron,monospace">0</text>
        <!-- avgZ indicator if meaningfully off center -->
        ${Math.abs(avgZ) > 0.05 ? (()=>{
          const ax=bX+((Math.max(-1.8,Math.min(1.8,avgZ))+1.8)/3.6)*bW;
          return `<line x1="${ax}" y1="${bY+bH-5}" x2="${ax}" y2="${bY+bH+4}"
              stroke="#556688" stroke-width="1.5" stroke-dasharray="2,2"/>
            <text x="${ax}" y="${bY+bH+22}" text-anchor="middle"
              fill="#556688" font-size="8" font-family="Share Tech Mono,monospace">
              μ${avgZ>=0?'+':''}${fmt(avgZ,2)}</text>`;
        })() : ''}
      </svg>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-top:8px;">
        ${[
          {l:'FROM MID',         v:(z>=0?'+':'')+'$'+fmt(price2-mid2,2), c:zColor},
          {l:'% OF RANGE',       v:fmt(Math.abs(z)*100,1)+'%',           c:zColor},
          {l:'HIST AVG Z',       v:(avgZ>=0?'+':'')+fmt(avgZ,2),         c:'var(--text2)'},
          {l:'% WKS MORE EXTR',  v:pctBeyond!=null?fmt(pctBeyond,0)+'%':'—', c:'var(--text3)'},
        ].map(s=>`<div style="text-align:center;background:var(--bg3);border-radius:3px;padding:8px;">
          <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:3px;">${s.l}</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:17px;color:${s.c};">${s.v}</div>
        </div>`).join('')}
      </div>`;
  }

  $('wemHistBody').innerHTML=[...wems].reverse().map(w=>`<tr>
    <td>${w.week_start}</td>
    <td>$${fmt(w.wem_mid,2)}</td>
    <td class="up">$${fmt(w.wem_high,2)}</td>
    <td class="dn">$${fmt(w.wem_low,2)}</td>
    <td>±$${fmt(w.wem_range/2,2)}</td>
    <td>${w.atm_iv?fmt(w.atm_iv*100,2)+'%':'—'}</td>
    <td>${w.week_open?'$'+fmt(w.week_open,2):'—'}</td>
    <td class="up">${w.week_high?'$'+fmt(w.week_high,2):'—'}</td>
    <td class="dn">${w.week_low?'$'+fmt(w.week_low,2):'—'}</td>
    <td class="${w.week_close&&w.week_open?clr(w.week_close-w.week_open):''}">
${w.week_close?'$'+fmt(w.week_close,2):'—'}</td>
    <td class="${clr(w.weekly_gap)}">${w.weekly_gap!=null?sign(w.weekly_gap)+'$'+fmt(Math.abs(w.weekly_gap),2):'—'}</td>
    <td>${w.gap_filled!=null?(w.gap_filled?'<span class="up">YES</span>':'<span class="dn">NO</span>'):'—'}</td>
    <td>${w.closed_inside!=null?(w.closed_inside?'<span class="up">YES</span>':'<span class="dn">NO</span>'):'—'}</td>
    <td>${w.breach!=null?(w.breach?'<span class="dn">YES</span>':'<span class="up">NO</span>'):'—'}</td>
    <td class="${w.breach_side==='HIGH'?'dn':w.breach_side==='LOW'?'dn':''}">
${w.breach_side||'—'}</td>
    <td class="dn">${w.breach_amount?'$'+fmt(Math.abs(w.breach_amount),2):'—'}</td>
  </tr>`).join('');
}


function renderVolume(sd,md){
  if(!sd||!sd.length){$('panel-volume').innerHTML='<div class="no-data">No volume data yet.</div>';return;}
  const day=sd[0],v=day.volume_analysis||{};
  $('volDate').innerHTML=`<span class="live-dot"></span>VOLUME ANALYSIS — ${day.date}`;
  $('volSessionRow').innerHTML=[
    {l:'TOTAL',v:fmtK(day.volume),p:''},
    {l:'OPEN 1H',v:v.open_1h?fmtK(v.open_1h):'—',p:v.open_1h_pct?fmt(v.open_1h_pct,1)+'%':''},
    {l:'CLOSE 1H',v:v.close_1h?fmtK(v.close_1h):'—',p:v.close_1h_pct?fmt(v.close_1h_pct,1)+'%':''},
    {l:'PEAK TIME',v:v.peak_time||'—',p:''},
    {l:'HVN PRICE',v:v.hvn_price?'$'+fmt(v.hvn_price,2):'—',p:v.hvn_volume?fmtK(v.hvn_volume)+' shares':''}
  ].map(({l,v:val,p})=>`<div class="vol-sess-card"><div class="vs-lbl">${l}</div><div class="vs-val">${val}</div>${p?`<div class="vs-pct">${p}</div>`:''}</div>`).join('');
  // Hourly chart
  const hours=v.hourly_volume||[];
  if(hours.length){
    const maxVol=Math.max(...hours.map(h=>h.volume||0),1);
    $('volHourlyChart').innerHTML=hours.map(h=>{const w=(h.volume/maxVol*100).toFixed(1);const isPeak=h.hour===v.peak_time?.substring(0,5);const c=isPeak?'#00ccff':'#00ff8866';return `<div class="vol-bar-row"><span class="vol-bar-time">${h.hour}</span><div class="vol-bar-track"><div class="vol-bar-fill" style="width:${w}%;background:${c}"></div></div><span class="vol-bar-amt">${fmtK(h.volume)}</span></div>`;}).join('');
  }else{$('volHourlyChart').innerHTML='<div class="no-data">No hourly data</div>';}
  $('volStats').innerHTML=`
    <div class="cond-row"><span class="cond-key">Total Volume</span><span class="cond-val">${fmtK(day.volume)}</span></div>
    <div class="cond-row"><span class="cond-key">Peak 1-min Bar</span><span class="cond-val">${v.peak_volume?fmtK(v.peak_volume)+' @ '+v.peak_time:'—'}</span></div>
    <div class="cond-row"><span class="cond-key">High Vol Node</span><span class="cond-val">${v.hvn_price?'$'+fmt(v.hvn_price,2)+' ('+fmtK(v.hvn_volume||0)+')':'—'}</span></div>
    <div class="cond-row"><span class="cond-key">Open 1H %</span><span class="cond-val">${v.open_1h_pct?fmt(v.open_1h_pct,1)+'%':'—'}</span></div>
    <div class="cond-row"><span class="cond-key">Close 1H %</span><span class="cond-val">${v.close_1h_pct?fmt(v.close_1h_pct,1)+'%':'—'}</span></div>`;
}

// ─────────────────────────────────────────────
// AI FEATURES
// ─────────────────────────────────────────────

let _md = null, _sd = null, _spyIntraday = null;

// Cache last good intraday snapshot so volume/session panels survive pre-market & overnight
const INTRADAY_CACHE_KEY = 'spy_intraday_cache_v1';
function saveIntradayCache(data) {
  try {
    const etDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
    localStorage.setItem(INTRADAY_CACHE_KEY, JSON.stringify({ date: etDate, data }));
  } catch(e) {}
}
function loadIntradayCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(INTRADAY_CACHE_KEY) || 'null');
    if (!cached) return null;
    // Only use cache if it's from today (CT)
    const ctDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
    if (cached.date === ctDate && cached.data) return cached.data;
  } catch(e) {}
  return null;
}
const chatHistory = [];

function toggleChat() {
  const p = document.getElementById('aiPanel');
  p.classList.toggle('open');
}

// Build compact data context for AI
function buildContext(md, sd) {
  const q = md?.quotes || {}, spy = q['SPY'] || {}, vixQ = q['^VIX'] || {};
  const fg = md?.fear_greed || {}, o = md?.options_summary || {};
  const tnx = q['^TNX'] || {}, irx = q['^IRX'] || {}, tyx = q['^TYX'] || {};
  const wems = md?.weekly_em || [], stats = md?.wem_stats || {};
  const wem = wems.find(w => !w.week_close) || wems[0];
  const day = sd?.[0] || {}, prev = sd?.[1] || {}, m = day.measurements || {}, v = day.volume_analysis || {};
  const gex = md?.gex || {};
  const fgVal = fg.value != null ? fg.value : fg.score;
  const oc=m.oc_pts??m.open_to_close, ocp=m.oc_pct??m.pct_open_to_close;
  const rng=m.range_pts??m.day_range;
  const last30 = (sd||[]).slice(0,30).filter(d=>d.volume>0);
  const avg30vol = last30.length ? Math.round(last30.reduce((a,d)=>a+d.volume,0)/last30.length) : 0;
  const vsAvg = avg30vol && day.volume ? ((day.volume-avg30vol)/avg30vol*100) : null;
  const todayDate = new Date();
  const dow = todayDate.getDay();
  const wsd = new Date(todayDate); wsd.setDate(todayDate.getDate()-(dow===0?6:dow-1));
  const weekRows = (sd||[]).filter(r=>r.date>=wsd.toISOString().split('T')[0]);
  const wOpen = weekRows.length ? weekRows[weekRows.length-1].open : null;
  const wHigh = weekRows.length ? Math.max(...weekRows.map(r=>r.high||0)) : null;
  const wLow  = weekRows.length ? Math.min(...weekRows.filter(r=>r.low).map(r=>r.low)) : null;
  const mStr = todayDate.toISOString().slice(0,7);
  const mRows = (sd||[]).filter(r=>r.date?.startsWith(mStr));
  const mOpen = mRows.length ? mRows[mRows.length-1].open : null;
  const mHigh = mRows.length ? Math.max(...mRows.map(r=>r.high||0)) : null;
  const mLow  = mRows.length ? Math.min(...mRows.filter(r=>r.low).map(r=>r.low)) : null;
  const hvns = (sd||[]).filter(r=>r.volume_analysis?.hvn_price).slice(0,5)
    .map(r=>`$${fmt(r.volume_analysis.hvn_price,2)}(${r.date?.slice(5)})`).join(', ');
  const cur = spy.price||0;
  const gaps = [];
  for(let i=0;i<Math.min((sd||[]).length-1,60);i++){
    const t2=sd[i], p2=sd[i+1];
    if(!t2?.open||!p2?.close) continue;
    const gs=parseFloat(t2.open)-parseFloat(p2.close);
    if(Math.abs(gs)<0.05) continue;
    let filled=false;
    for(let j=i-1;j>=0;j--){
      if(!sd[j]?.low||!sd[j]?.high) continue;
      if(gs>0&&parseFloat(sd[j].low)<=p2.close){filled=true;break;}
      if(gs<0&&parseFloat(sd[j].high)>=p2.close){filled=true;break;}
    }
    if(!filled&&Math.abs(cur-p2.close)<=15)
      gaps.push(`$${fmt(p2.close,2)} ${gs>0?'(gap up)':'(gap dn)'} ${p2.date}`);
  }
  const sectors = ['XLK','XLF','XLE','XLV','XLI','XLY','XLP','XLB','XLRE','XLU','XLC'];
  const sectorStr = sectors.map(s => q[s] ? `${s}:${fmt(q[s].pct_change,2)}%` : '').filter(Boolean).join(' ');
  const spread = tnx.price && irx.price ? (tnx.price - irx.price) : null;
  const mp = (md?.max_pain || [])[0];
  const SPY_ATH = 697.84;
  const athDist = spy.price ? (spy.price - SPY_ATH).toFixed(2) : null;
  const athPct  = spy.price ? ((spy.price - SPY_ATH)/SPY_ATH*100).toFixed(2) : null;

  // Expiry context
  const mpAll = md?.max_pain || [];
  const todayStr = todayDate.toISOString().slice(0,10);
  const thisFri = new Date(todayDate); thisFri.setDate(todayDate.getDate()+(dow===5?0:(5-dow+7)%7));
  const thisFriStr = thisFri.toISOString().slice(0,10);
  const getMonthlyOpex = () => {
    const d=new Date(); d.setDate(1); let fc=0;
    while(fc<3){d.setDate(d.getDate()+1);if(d.getDay()===5)fc++;}
    if(d<todayDate){d.setMonth(d.getMonth()+1);d.setDate(1);fc=0;
      while(fc<3){d.setDate(d.getDate()+1);if(d.getDay()===5)fc++;}}
    return d.toISOString().slice(0,10);
  };
  const monthlyStr = getMonthlyOpex();
  const mpLines = mpAll.slice(0,6).map(m2 => {
    const ed=new Date(m2.expiry+'T00:00:00'), edow=ed.getDay();
    const dayName=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][edow];
    const label = m2.expiry===todayStr?'0DTE-TODAY':m2.expiry===monthlyStr?'MONTHLY-OPEX':edow===5?'WEEKLY-OPEX-Fri':`${dayName}-expiry`;
    return `  ${m2.expiry}[${label}] DTE:${m2.dte} MaxPain:$${fmt(m2.max_pain,2)} dist:${m2.dist_from_spot>=0?'+':''}${fmt(m2.dist_from_spot,2)} OI:${fmtK(m2.total_oi||0)}`;
  }).join('\n');

  return `SPY TRACKER — ${todayDate.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric',year:'numeric'})}

PRICE: SPY $${fmt(spy.price,2)} | ${sign(spy.pct_change)}${fmt(spy.pct_change,2)}% | chg: ${sign(spy.change)}$${fmt(spy.change,2)}
ATH ($${SPY_ATH}): ${athDist>=0?'+':''}${athDist} (${athPct}%)

OHLC:
  Today:    O:$${fmt(day.open||spy.open,2)} H:$${fmt(day.high||spy.high,2)} L:$${fmt(day.low||spy.low,2)} C:$${fmt(spy.price,2)}
  Prev Day: O:$${fmt(prev.open,2)} H:$${fmt(prev.high,2)} L:$${fmt(prev.low,2)} C:$${fmt(prev.close,2)}
  This Week: O:$${fmt(wOpen,2)} H:$${fmt(wHigh,2)} L:$${fmt(wLow,2)}
  This Month: O:$${fmt(mOpen,2)} H:$${fmt(mHigh,2)} L:$${fmt(mLow,2)}

WEM (Friday expiry): Low:$${fmt(wem?.wem_low,2)} Mid:$${fmt(wem?.wem_mid,2)} High:$${fmt(wem?.wem_high,2)} ±$${fmt((wem?.wem_range||0)/2,2)} IV:${fmt((wem?.atm_iv||0)*100,2)}%
  History: ${stats.total_weeks||0} weeks, ${fmt(stats.pct_inside,1)}% closed inside WEM

HVNs (recent): ${hvns||'none'}
Unfilled gaps (within $15): ${gaps.length?gaps.join(' | '):'none'}

VOLUME: Today:${fmtK(day.volume||0)} | 30d avg:${fmtK(avg30vol)} | vs avg:${vsAvg!=null?(vsAvg>=0?'+':'')+fmt(vsAvg,1)+'%':'N/A'}
  Open 1H:${fmtK(v.open_1h||0)} (${fmt(v.open_1h_pct,1)}%) Close 1H:${fmtK(v.close_1h||0)} (${fmt(v.close_1h_pct,1)}%)

VOLATILITY: VIX:${fmt(vixQ.price,2)} (${sign(vixQ.pct_change)}${fmt(vixQ.pct_change,2)}%) | VIX3M:${fmt(q['^VIX3M']?.price,2)} | VVIX:${fmt(q['^VVIX']?.price,2)} | SKEW:${fmt(q['^SKEW']?.price,1)}
  PCR:${fmt(o.pc_ratio_vol,3)} | F&G:${fgVal||'N/A'}/100 | ATM IV: ${fmt((wem?.atm_iv || 0) * 100, 2)}%

OPTIONS — Today is ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dow]}.
  RULE: Mon/Wed = mid-week 0DTE only. Friday = WEEKLY OPEX. NEVER say "today's expiry" unless today is Friday.
${mpLines||'  No max pain data'}
  GEX: ${gex.regime||'N/A'} | Net:${gex.net_gex?(gex.net_gex/1e9).toFixed(2)+'B':'N/A'} | Flip:$${gex.flip_point||'N/A'} | Supp:$${gex.support||'N/A'} | Res:$${gex.resistance||'N/A'}
  PCR OI:${fmt(o.pc_ratio_oi,3)} | Call OI:${fmtK(o.total_call_oi||0)} | Put OI:${fmtK(o.total_put_oi||0)}

RATES: 10YR:${fmt(tnx.price,3)}% 2YR:${fmt(irx.price,3)}% 30YR:${fmt(tyx.price,3)}% Spread:${spread!=null?fmt(spread,3)+'%':'N/A'}
  DXY:${fmt(q['DX-Y.NYB']?.price,2)} Gold:$${fmt(q['GC=F']?.price,0)} Oil:$${fmt(q['CL=F']?.price,2)} BTC:$${fmt(q['BTC-USD']?.price,0)}

SECTORS: ${sectorStr}`;
}

// Call AI proxy
async function callAI(messages, system, maxTokens = 800) {
  const resp = await fetch('/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system, max_tokens: maxTokens })
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  return data.content;
}

// ─── MEDIA PLAYER ─────────────────────────────────────────────────────────────
// Two embed strategies:
// 1. Live channels: youtube.com/embed/live_stream?channel=CHANNEL_ID (tries to show their live stream)
// 2. Direct video: youtube.com/embed/VIDEO_ID
// Channels without a UC ID open in a new tab

const MEDIA_SOURCES = [
  // Live streaming channels — embed via channel ID live_stream trick
  {
    group: 'LIVE STREAMS',
    items: [
      { name:'Bloomberg Television', channelId:'UCIALMKvObZNtJ6AmdCLP7Lg', color:'#00ccff', desc:'24/7 Business & Markets', live:true },
    ]
  },
  // Channels with specific known video/stream IDs (from your URLs)
  {
    group: 'YOUR SAVED STREAMS',
    items: [
      { name:'Live Stock Scanner',         videoId:'KoBI00adF2w',  color:'#00ff88', desc:'Real-time stock scanner audio', live:true },
    ]
  },
  // Channels — open in tab (no reliable live embed without channel ID)
  {
    group: 'CHANNELS (OPENS IN TAB)',
    items: [
      { name:'FX Evolution',        url:'www.youtube.com/@fxevolutionvideo',  color:'#00ff88', desc:'FX & Options Trading' },
      { name:'Titans of Tomorrow',  url:'https://www.youtube.com/@titans.of.tomorrow', color:'#8855ff', desc:'Trading Podcast' },
      { name:'Words of Rizdom',     url:'https://www.youtube.com/@wordsofrizdom',      color:'#ffcc00', desc:'Trading Podcast' },
    ]
  }
];

function extractVideoId(input) {
  if(!input) return null;
  input = input.trim();
  if(/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  let m;
  m = input.match(/[?&]v=([a-zA-Z0-9_-]{11})/); if(m) return m[1];
  m = input.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/); if(m) return m[1];
  m = input.match(/\/embed\/([a-zA-Z0-9_-]{11})/); if(m) return m[1];
  m = input.match(/\/shorts\/([a-zA-Z0-9_-]{11})/); if(m) return m[1];
  m = input.match(/\/live\/([a-zA-Z0-9_-]{11})/); if(m) return m[1];
  return null;
}

function setPlayer(src, label) {
  const iframe = $('mediaIframe');
  const ph = $('mediaPlaceholder');
  if(!iframe) return;
  iframe.src = src;
  if(ph) ph.style.display = 'none';
  // Update now-playing label
  const np = $('mediaNowPlaying');
  if(np) np.textContent = label || '';
}

function playLiveChannel(channelId, name) {
  // YouTube's live_stream embed — plays the channel's current live stream if one exists
  setPlayer(
    `https://www.youtube-nocookie.com/embed/live_stream?channel=${channelId}&autoplay=1&rel=0&modestbranding=1`,
    name
  );
}

function playVideoId(videoId, name) {
  setPlayer(
    `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`,
    name
  );
}

function playItem(item) {
  if(item.channelId) {
    playLiveChannel(item.channelId, item.name);
  } else if(item.videoId) {
    playVideoId(item.videoId, item.name);
  } else if(item.url) {
    window.open(item.url, '_blank');
    // Show message in placeholder
    const ph = $('mediaPlaceholder');
    if(ph) {
      ph.style.display = 'flex';
      ph.innerHTML = `<div style="text-align:center;padding:20px;">
        <div style="font-size:36px;margin-bottom:10px;">↗</div>
        <div style="font-family:'Orbitron',monospace;font-size:10px;letter-spacing:1px;color:var(--cyan);margin-bottom:8px;">OPENED IN NEW TAB</div>
        <div style="font-size:11px;color:var(--text3);line-height:1.7;">Find a video, copy its URL,<br>paste it in the box above to embed.</div>
      </div>`;
    }
  }
}

function loadMediaUrl() {
  const raw = ($('mediaUrlInput')?.value || '').trim();
  if(!raw) return;
  const id = extractVideoId(raw);
  if(id) {
    playVideoId(id, id);
  } else if(raw.startsWith('http')) {
    window.open(raw, '_blank');
  } else {
    // Treat as search
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(raw)}`, '_blank');
  }
  if($('mediaUrlInput')) $('mediaUrlInput').value = '';
}

function renderMediaSources() {
  // Sources moved to quick-bar pills in HTML — no sidebar list needed
}

function initMediaTab() {
  videoLibInit();
  // Restore drawer state
  const drawerCollapsed = localStorage.getItem('mediaDrawerCollapsed') === 'true';
  if (drawerCollapsed) {
    document.getElementById('mediaDrawerInner')?.classList.add('hidden');
    const t = document.getElementById('mediaDrawerToggle');
    if (t) { t.classList.remove('open'); t.classList.add('closed'); }
  }
}

function mediaToggleDrawer() {
  const inner  = document.getElementById('mediaDrawerInner');
  const toggle = document.getElementById('mediaDrawerToggle');
  if (!inner || !toggle) return;
  const isOpen = !inner.classList.contains('hidden');
  if (isOpen) {
    inner.classList.add('hidden');
    toggle.classList.remove('open');
    toggle.classList.add('closed');
  } else {
    inner.classList.remove('hidden');
    toggle.classList.remove('closed');
    toggle.classList.add('open');
  }
  localStorage.setItem('mediaDrawerCollapsed', isOpen ? 'true' : 'false');
}

function mediaToggleSources() {
  const sec = document.getElementById('mediaSourcesSection');
  if (!sec) return;
  sec.classList.toggle('sources-collapsed');
  localStorage.setItem('mediaSourcesCollapsed', sec.classList.contains('sources-collapsed'));
}

// ─── VIDEO LIBRARY ─────────────────────────────────────────────────────────────

const VL = {
  videos:      [],
  topics:      [],
  activeTopic: 'ALL',
  loaded:      false,
};

async function videoLibInit() {
  if (VL.loaded) { videoLibRender(); return; }
  try {
    const [vRes, tRes] = await Promise.all([
      fetch('/videos?action=list&t=' + Date.now()).then(r => r.json()),
      fetch('/videos?action=topics&t=' + Date.now()).then(r => r.json()),
    ]);
    VL.videos = vRes.videos || [];
    VL.topics = tRes.topics || [];
    VL.loaded = true;
    videoLibRenderTopicBar();
    videoLibRender();
  } catch(e) {
    const el = document.getElementById('videoLibList');
    if (el) el.innerHTML = '<div style="color:var(--red);font-size:11px;text-align:center;padding:20px;">Failed to load library.</div>';
  }
}

function videoLibRenderTopicBar() {
  // Populate the dropdown select
  const sel = document.getElementById('videoLibTopicSel');
  if (!sel) return;
  const prev = sel.value || 'ALL';
  sel.innerHTML = '<option value="ALL">— ALL TOPICS —</option>' +
    VL.topics.map(t => `<option value="${videoLibEsc(t)}">${videoLibEsc(t)}</option>`).join('');
  // Restore selection if still valid
  if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
  else sel.value = 'ALL';
}

function videoLibSetTopicFromSel(t) {
  VL.activeTopic = t || 'ALL';
  videoLibRender();
}

function videoLibSetTopic(t) {
  VL.activeTopic = t;
  const sel = document.getElementById('videoLibTopicSel');
  if (sel) sel.value = t;
  videoLibRender();
}

function videoLibRender() {
  const el = document.getElementById('videoLibList');
  if (!el) return;
  // Sync dropdown active topic
  const sel = document.getElementById('videoLibTopicSel');
  if (sel && sel.value !== VL.activeTopic) VL.activeTopic = sel.value || 'ALL';
  let list = VL.videos;
  if (VL.activeTopic !== 'ALL') list = list.filter(v => v.topic === VL.activeTopic);
  // Update count badge
  const cnt = document.getElementById('vLibCount');
  if (cnt) cnt.textContent = list.length + ' video' + (list.length !== 1 ? 's' : '');
  if (!list.length) {
    el.innerHTML = '<div style="color:var(--text3);font-size:11px;text-align:center;padding:20px;">No videos yet' + (VL.activeTopic !== 'ALL' ? ' in this topic' : '') + '.</div>';
    return;
  }
  el.innerHTML = list.map(v => {
    const thumb = v.video_id
      ? `<img src="https://img.youtube.com/vi/${v.video_id}/mqdefault.jpg" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block;border-radius:3px 3px 0 0;" loading="lazy" onerror="this.style.display='none'">`
      : `<div style="width:100%;aspect-ratio:16/9;background:var(--bg3);display:flex;align-items:center;justify-content:center;border-radius:3px 3px 0 0;"><span style="font-size:28px;opacity:0.25;">▶</span></div>`;
    const date = new Date(v.created_at * 1000).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    return `
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:4px;margin-bottom:8px;overflow:hidden;cursor:pointer;transition:border-color 0.15s;"
        onmouseover="this.style.borderColor='rgba(0,204,255,0.35)'" onmouseout="this.style.borderColor='var(--border)'"
        onclick="videoLibPlay(${JSON.stringify(v).replace(/"/g,'&quot;')})">
        ${thumb}
        <div style="padding:8px 10px;">
          <div style="font-size:12px;color:var(--text1);line-height:1.4;margin-bottom:4px;">${videoLibEsc(v.title)}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--cyan);background:rgba(0,204,255,0.1);border:1px solid rgba(0,204,255,0.25);padding:2px 7px;border-radius:2px;">${videoLibEsc(v.topic)}</span>
            <span style="font-size:10px;color:var(--text3);">${date}</span>
          </div>
          ${v.notes ? `<div style="font-size:10px;color:var(--text3);margin-top:5px;line-height:1.5;border-top:1px solid var(--border);padding-top:5px;">${videoLibEsc(v.notes)}</div>` : ''}
        </div>
        <div style="padding:0 10px 8px;text-align:right;">
          <button onclick="event.stopPropagation();videoLibDelete(${v.id})"
            style="background:none;border:none;color:var(--text3);font-size:10px;cursor:pointer;padding:2px 6px;border-radius:2px;"
            onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text3)'">✕ delete</button>
        </div>
      </div>`;
  }).join('');
}

function videoLibEsc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function videoLibPlay(v) {
  if (v.video_id) {
    playVideoId(v.video_id, v.title);
  } else {
    window.open(v.url, '_blank');
  }
}

async function videoLibDelete(id) {
  const pw = prompt('Enter password to delete:');
  if (!pw) return;
  try {
    const r = await fetch('/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id, password: pw }),
    });
    const d = await r.json();
    if (!r.ok || d.error) { alert('Error: ' + (d.error || 'failed')); return; }
    VL.videos = VL.videos.filter(v => v.id !== id);
    videoLibRender();
  } catch(e) { alert('Network error'); }
}

// ── Add modal ───────────────────────────────────────────────────────────────

function videoLibOpenAdd() {
  // Pre-populate existing topics dropdown
  const sel = document.getElementById('vlTopicSel');
  if (sel) {
    sel.innerHTML = '<option value="">existing...</option>' + VL.topics.map(t => `<option value="${videoLibEsc(t)}">${videoLibEsc(t)}</option>`).join('');
  }
  document.getElementById('vlError').textContent = '';
  const overlay = document.getElementById('videoLibOverlay');
  if (overlay) { overlay.style.display = 'flex'; }
}

function videoLibCloseAdd() {
  const overlay = document.getElementById('videoLibOverlay');
  if (overlay) overlay.style.display = 'none';
  ['vlUrl','vlTitle','vlTopic','vlNotes','vlPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function videoLibOverlayClick(e) {
  if (e.target === document.getElementById('videoLibOverlay')) videoLibCloseAdd();
}

async function videoLibSubmit() {
  const btn  = document.getElementById('vlSubmitBtn');
  const errEl = document.getElementById('vlError');
  const url   = (document.getElementById('vlUrl')?.value || '').trim();
  const title = (document.getElementById('vlTitle')?.value || '').trim();
  const topic = (document.getElementById('vlTopic')?.value || '').trim() || 'General';
  const notes = (document.getElementById('vlNotes')?.value || '').trim();
  const pw    = (document.getElementById('vlPassword')?.value || '').trim();

  errEl.textContent = '';
  if (!url)   { errEl.textContent = 'URL is required.'; return; }
  if (!title) { errEl.textContent = 'Title is required.'; return; }
  if (!pw)    { errEl.textContent = 'Password is required.'; return; }

  btn.disabled = true; btn.textContent = 'SAVING...';
  try {
    const r = await fetch('/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', url, title, topic, notes, password: pw }),
    });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || 'Failed');
    videoLibCloseAdd();
    // Reload library
    VL.loaded = false;
    await videoLibInit();
  } catch(e) {
    errEl.textContent = e.message;
  } finally {
    btn.disabled = false; btn.textContent = 'SAVE VIDEO';
  }
}

// ─── CHART JOURNAL ─────────────────────────────────────────────────────────────
let _journalEntries = JSON.parse(localStorage.getItem('spyJournal')||'[]');
let _currentChartBase64 = null;
let _currentChartMime = 'image/png';
let _journalOutcome = 'STUDY';

function saveJournal() {
  localStorage.setItem('spyJournal', JSON.stringify(_journalEntries.slice(0,100)));
}

// ── Outcome button state ──────────────────────────────────────────────────────
window.journalSetOutcome = function(oc) {
  _journalOutcome = oc;
  const colors = { WIN:'var(--green)', LOSS:'var(--red)', BE:'var(--yellow)', STUDY:'var(--cyan)' };
  document.querySelectorAll('.joc-btn').forEach(btn => {
    const isActive = btn.dataset.oc === oc;
    btn.style.background = isActive ? colors[oc] : 'var(--bg3)';
    btn.style.color       = isActive ? '#000'      : 'var(--text3)';
    btn.style.border      = isActive ? 'none'       : '1px solid var(--border)';
    btn.style.fontWeight  = isActive ? 'bold'       : 'normal';
  });
};

// ── File handling ─────────────────────────────────────────────────────────────
function handleJournalDrop(e) {
  e.preventDefault();
  document.getElementById('journalDropZone').style.borderColor = 'var(--border)';
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleJournalFile(file);
}

function handleJournalFile(file) {
  if (!file) return;
  _currentChartMime = file.type || 'image/png';
  const reader = new FileReader();
  reader.onload = ev => {
    const dataUrl = ev.target.result;
    _currentChartBase64 = dataUrl.split(',')[1];
    const preview = document.getElementById('journalImgPreview');
    const previewImg = document.getElementById('journalPreviewImg');
    if (preview && previewImg) { previewImg.src = dataUrl; preview.style.display = 'block'; }
    const dz = document.getElementById('journalDropZone');
    if (dz) {
      dz.style.padding = '10px 16px';
      dz.style.borderColor = 'var(--cyan)';
      const icon = document.getElementById('journalDropIcon');
      if (icon) icon.style.display = 'none';
    }
    const btn = document.getElementById('journalSaveBtn');
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
    const dateEl = document.getElementById('journalChartDate');
    if (dateEl && !dateEl.value) {
      const ct = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
      dateEl.value = ct.toISOString().slice(0,10);
    }
  };
  reader.readAsDataURL(file);
}

function clearJournalUpload() {
  _currentChartBase64 = null;
  const preview = document.getElementById('journalImgPreview');
  if (preview) preview.style.display = 'none';
  const dz = document.getElementById('journalDropZone');
  if (dz) {
    dz.style.padding = '30px 16px';
    dz.style.borderColor = 'var(--border)';
    const icon = document.getElementById('journalDropIcon');
    if (icon) icon.style.display = '';
  }
  const noteEl = document.getElementById('journalNote');
  if (noteEl) noteEl.value = '';
  const tagEl = document.getElementById('journalChartTag');
  if (tagEl) tagEl.value = '';
  const btn = document.getElementById('journalSaveBtn');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.4'; btn.style.cursor = 'not-allowed'; }
  window.journalSetOutcome('STUDY');
}

// ── Save chart entry ──────────────────────────────────────────────────────────
window.saveJournalChart = function() {
  if (!_currentChartBase64) return;
  const note  = (document.getElementById('journalNote')?.value || '').trim();
  const tag   = (document.getElementById('journalChartTag')?.value || '').trim();
  const date  = document.getElementById('journalChartDate')?.value || new Date().toISOString().slice(0,10);
  const entry = {
    id:       Date.now(),
    ts:       new Date().toISOString(),
    date,
    tag,
    note,
    outcome:  _journalOutcome,
    mime:     _currentChartMime,
    imageB64: _currentChartBase64,
  };
  _journalEntries.unshift(entry);
  saveJournal();
  renderJournalEntries();
  clearJournalUpload();
  const btn = document.getElementById('journalSaveBtn');
  if (btn) {
    btn.textContent = '\u2713 SAVED';
    setTimeout(() => { btn.textContent = '\u29c6 SAVE TO JOURNAL'; }, 1400);
  }
};

// ── Gallery render ────────────────────────────────────────────────────────────
function renderJournalEntries() {
  const el = document.getElementById('journalEntries');
  if (!el) return;
  const filterOC = document.getElementById('journalFilterOC')?.value || '';
  let entries = _journalEntries;
  if (filterOC) entries = entries.filter(e => e.outcome === filterOC);
  if (!entries.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text3);">No charts saved yet.</div>';
    return;
  }
  const ocColors = { WIN:'var(--green)', LOSS:'var(--red)', BE:'var(--yellow)', STUDY:'var(--cyan)' };
  el.innerHTML = entries.map(e => {
    const d = new Date(e.ts);
    const dateStr = d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'2-digit'});
    const timeStr = d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',timeZone:'America/Chicago'})+' CT';
    const oc = e.outcome || 'STUDY';
    const ocColor = ocColors[oc] || 'var(--cyan)';
    const imgSrc = e.imageB64 ? `data:${e.mime||'image/png'};base64,${e.imageB64}` : '';
    const realIdx = _journalEntries.indexOf(e);
    return `<div style="background:var(--bg3);border:1px solid var(--border);border-left:3px solid ${ocColor};border-radius:3px;margin-bottom:8px;overflow:hidden;">
      ${imgSrc ? `<img src="${imgSrc}" onclick="openJournalLightbox('${imgSrc}')"
        style="width:100%;max-height:160px;object-fit:cover;display:block;cursor:zoom-in;"/>` : ''}
      <div style="padding:8px 10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
          <div>
            <span style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">${dateStr} ${timeStr}</span>
            ${e.tag ? `<span style="font-family:'Orbitron',monospace;font-size:8px;color:var(--cyan);margin-left:8px;">${e.tag}</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-family:'Orbitron',monospace;font-size:8px;color:${ocColor};border:1px solid ${ocColor}44;border-radius:2px;padding:1px 5px;">${oc}</span>
            <button onclick="deleteJournalEntry(${realIdx})" style="background:none;border:none;color:#ff335566;cursor:pointer;font-size:11px;padding:0;line-height:1;">\u2715</button>
          </div>
        </div>
        ${e.note ? `<div style="font-size:11px;color:var(--text2);line-height:1.5;">${e.note}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
window.openJournalLightbox = function(src) {
  const lb = document.getElementById('journalLightbox');
  const img = document.getElementById('journalLightboxImg');
  if (!lb || !img) return;
  img.src = src;
  lb.style.display = 'flex';
};
window.closeJournalLightbox = function() {
  const lb = document.getElementById('journalLightbox');
  if (lb) lb.style.display = 'none';
};

function deleteJournalEntry(i) {
  _journalEntries.splice(i, 1);
  saveJournal();
  renderJournalEntries();
}

function clearJournal() {
  if (confirm('Clear all chart journal entries? This cannot be undone.')) {
    _journalEntries = [];
    saveJournal();
    renderJournalEntries();
  }
}

// ─── TAB INIT HOOKS ────────────────────────────────────────────────────────────
// Chat
async function sendChat() {
  const input = document.getElementById('aiInput');
  const btn = document.getElementById('aiSendBtn');
  const msgs = document.getElementById('aiMessages');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  btn.disabled = true;

  // Add user message
  chatHistory.push({ role: 'user', content: text });
  msgs.innerHTML += `<div class="ai-msg user">${text}</div>`;
  msgs.innerHTML += `<div class="ai-msg thinking" id="thinkingMsg">⟳ Thinking...</div>`;
  msgs.scrollTop = msgs.scrollHeight;

  try {
    const context = buildContext(_md, _sd);
    const system = `You are a trading assistant with access to real-time SPY dashboard data. Be concise, specific, and use actual numbers.

Data available: price/OHLC (daily/weekly/monthly), WEM range, HVNs, unfilled gaps (above AND below current price), volume vs 30d avg, VIX/VVIX/SKEW, PCR (vol+OI), GEX (flip/support/resistance from CBOE), max pain by expiry (labeled: Mon/Wed/Fri=0DTE, Fri=also weekly OPEX, 3rd-Fri=monthly OPEX — Wednesday is NOT the weekly expiry), breadth (A/D ratio, up/down volume ratio, % stocks above 50/200-day MA, sector performance), macro (rates, DXY, gold, oil, BTC), and ATH distance.

CURRENT DATA:\n${context}`;
    const reply = await callAI(chatHistory, system, 600);
    chatHistory.push({ role: 'assistant', content: reply });
    document.getElementById('thinkingMsg')?.remove();
    msgs.innerHTML += `<div class="ai-msg assistant">${reply.replace(/\n/g,'<br>')}</div>`;
  } catch(e) {
    document.getElementById('thinkingMsg')?.remove();
    msgs.innerHTML += `<div class="ai-msg thinking">Error: ${e.message}</div>`;
  }

  btn.disabled = false;
  msgs.scrollTop = msgs.scrollHeight;
}

// Pattern alerts
function runPatternAlerts(md, sd) {
  const el = document.getElementById('aiAlerts');
  if (!el) return;
  const q = md?.quotes || {}, vixQ = q['^VIX'] || {}, o = md?.options_summary || {};
  const tnx = q['^TNX'] || {}, irx = q['^IRX'] || {};
  const fg = md?.fear_greed || {}, fgVal = fg.value != null ? fg.value : fg.score;
  const wems = md?.weekly_em || [];
  const wem = wems.find(w => !w.week_close) || wems.slice(-1)[0];
  const spy = q['SPY'] || {}, day = sd?.[0] || {};
  const alerts = [];

  // VIX alerts
  if (vixQ.price > 35) alerts.push({ level: 'high', icon: '🔴', text: `VIX at ${fmt(vixQ.price,1)} — EXTREME volatility. Market in fear mode.`, badge: 'EXTREME' });
  else if (vixQ.price > 25) alerts.push({ level: 'med', icon: '🟠', text: `VIX elevated at ${fmt(vixQ.price,1)} — Above normal. Expect wide ranges.`, badge: 'ELEVATED' });
  else if (vixQ.price < 15) alerts.push({ level: 'info', icon: '🟢', text: `VIX at ${fmt(vixQ.price,1)} — Very low volatility. Complacency risk.`, badge: 'LOW VOL' });

  // VIX spike intraday
  if (vixQ.pct_change > 15) alerts.push({ level: 'high', icon: '⚡', text: `VIX spiked +${fmt(vixQ.pct_change,1)}% today — significant fear expansion.`, badge: 'VIX SPIKE' });

  // PCR
  if (o.pc_ratio_vol > 1.5) alerts.push({ level: 'high', icon: '🐻', text: `Put/Call ratio ${fmt(o.pc_ratio_vol,3)} — Heavy put buying. Bearish positioning.`, badge: 'BEARISH PCR' });
  else if (o.pc_ratio_vol < 0.5) alerts.push({ level: 'med', icon: '🐂', text: `Put/Call ratio ${fmt(o.pc_ratio_vol,3)} — Heavy call buying. Potential complacency.`, badge: 'BULLISH PCR' });

  // Fear & Greed extremes
  if (fgVal != null && fgVal <= 15) alerts.push({ level: 'high', icon: '😱', text: `Fear & Greed at ${fgVal} — Extreme Fear. Historically a contrarian buy signal.`, badge: 'EXTREME FEAR' });
  else if (fgVal != null && fgVal >= 85) alerts.push({ level: 'med', icon: '😤', text: `Fear & Greed at ${fgVal} — Extreme Greed. Caution warranted.`, badge: 'EXTREME GREED' });

  // WEM breach
  if (wem && spy.price) {
    if (spy.price < wem.wem_low) alerts.push({ level: 'high', icon: '📉', text: `SPY at $${fmt(spy.price,2)} is BELOW WEM Low $${fmt(wem.wem_low,2)} — WEM breached to downside by $${fmt(wem.wem_low-spy.price,2)}.`, badge: 'WEM BREACH' });
    else if (spy.price > wem.wem_high) alerts.push({ level: 'high', icon: '📈', text: `SPY at $${fmt(spy.price,2)} is ABOVE WEM High $${fmt(wem.wem_high,2)} — WEM breached to upside by $${fmt(spy.price-wem.wem_high,2)}.`, badge: 'WEM BREACH' });
    else if (spy.price < wem.wem_low * 1.005) alerts.push({ level: 'med', icon: '⚠️', text: `SPY approaching WEM Low $${fmt(wem.wem_low,2)} — currently $${fmt(spy.price-wem.wem_low,2)} away.`, badge: 'NEAR WEM LOW' });
    else if (spy.price > wem.wem_high * 0.995) alerts.push({ level: 'med', icon: '⚠️', text: `SPY approaching WEM High $${fmt(wem.wem_high,2)} — currently $${fmt(wem.wem_high-spy.price,2)} away.`, badge: 'NEAR WEM HIGH' });
  }

  // Yield curve
  if (tnx.price && irx.price) {
    const spread = tnx.price - irx.price;
    if (spread < 0) alerts.push({ level: 'med', icon: '🔄', text: `Yield curve INVERTED — 10yr ${fmt(tnx.price,3)}% vs 2yr ${fmt(irx.price,3)}%. Spread: ${fmt(spread,3)}%.`, badge: 'INVERTED CURVE' });
  }

  // High volume
  if (day.volume && sd?.[1]?.volume) {
    const avgVol = sd.slice(1, 6).reduce((a,d) => a + (d.volume||0), 0) / Math.min(sd.length-1, 5);
    if (day.volume > avgVol * 1.5) alerts.push({ level: 'info', icon: '📊', text: `Today's volume ${fmtK(day.volume)} is ${fmt(day.volume/avgVol*100-100,0)}% above recent average. High conviction move.`, badge: 'HIGH VOLUME' });
  }

  // Sector divergence
  const sectorPcts = ['XLK','XLF','XLE','XLV','XLI','XLY','XLP','XLB','XLRE','XLU'].map(s => q[s]?.pct_change || 0);
  const maxSec = Math.max(...sectorPcts), minSec = Math.min(...sectorPcts);
  if (maxSec - minSec > 3) alerts.push({ level: 'info', icon: '🔀', text: `Wide sector divergence: ${fmt(maxSec-minSec,1)}% spread between best and worst sector today.`, badge: 'DIVERGENCE' });

  if (!alerts.length) {
    el.innerHTML = '<div class="no-data" style="color:var(--green)">✓ No unusual patterns detected</div>';
    return;
  }

  const levelClass = { high: 'alert-high', med: 'alert-med', low: 'alert-low', info: 'alert-info' };
  const badgeColor = { high: '#ff3355', med: '#ff8800', low: '#ffcc00', info: '#00ccff' };
  el.innerHTML = `<div class="alert-bar">${alerts.map(a => `
    <div class="alert-pill ${levelClass[a.level]}">
      <span class="al-icon">${a.icon}</span>
      <span class="al-text">${a.text}</span>
      <span class="al-badge" style="color:${badgeColor[a.level]};background:${badgeColor[a.level]}22;border:1px solid ${badgeColor[a.level]}44">${a.badge}</span>
    </div>`).join('')}</div>`;
}

// Daily summary
async function generateSummary(md, sd, forceRefresh) {
  const el = document.getElementById('aiSummary');
  if (!el) return;

  // Throttle: don't re-run within 10 min unless forced
  const now = Date.now();
  if (!forceRefresh && window._lastSummaryTs && (now - window._lastSummaryTs) < 10 * 60 * 1000) return;
  window._lastSummaryTs = now;

  el.textContent = '';
  el.classList.add('loading');

  const badge = document.getElementById('aiSummaryModel');

  try {
    const context = buildContext(md, sd);

    const system = `You are a veteran SPY day trader with 20 years on a prop desk. You've seen every kind of market — crashes, melt-ups, Fed-induced whipsaws, retail-driven squeezes, and the usual daily nonsense. You're sharp, sardonic, and deeply knowledgeable. You call it like you see it. You don't sugarcoat, you don't hedge every sentence with disclaimers, and you have zero patience for financial media clichés.

Your job is to write the daily market overview that greets traders when they open this dashboard. It should be intelligent, entertaining, and genuinely useful. Think of it as your morning briefing to a desk of experienced traders who can handle the truth and appreciate a dry sense of humor.

PERSONALITY RULES:
- Be blunt and direct. No "it remains to be seen" or "investors are monitoring."
- Dry wit and sarcasm are welcome — especially about the Fed, retail behavior, analyst consensus, or anything absurd in the data.
- Funny is good. Forced is not. Don't try to be funny every sentence.
- Strong opinions are fine when backed by the data. Hedge with data, not words.
- You can be irreverent about things that deserve it. The market is not sacred.
- Write like a smart human being, not a robot or a Bloomberg terminal.
- No bullet points. No headers. Just flowing paragraphs.

FORMAT:
- 3 to 5 paragraphs. Each one punchy and substantive.
- Start with where SPY actually is and what it means in plain English — don't open with "As of today."
- Hit the key levels, volatility regime, notable cross-market signals, and any options structure that matters.
- End with something honest — the real risk, the real opportunity, or the thing everyone is ignoring.
- Use actual numbers from the data. Don't make things up. Don't round unless it makes sense.

CRITICAL OPTIONS RULES:
- Mon/Tue/Wed/Thu expiries are mid-week 0DTE noise. Only Friday is the WEEKLY OPEX.
- Never say "this week's expiry" about a Wednesday. The weekly is Friday.
- Reference max pain only for Friday and monthly expiries — they're the ones that matter for positioning.

\n\n${context}`;

    const userMsg = `Write today's market overview. Give me the full picture — where SPY stands relative to key structure, what volatility is signaling, what the options market is pricing in, what's working cross-asset, and what the real story is that most people are probably missing or misreading. Be honest about what's clear, what's murky, and what's actually interesting today. Write it like you're talking to traders who know what they're doing.`;

    const reply = await callAI([{ role: 'user', content: userMsg }], system, 900);

    el.classList.remove('loading');

    // Render paragraphs with spacing
    const paras = reply.split(/\n\n+/).filter(p => p.trim());
    if (paras.length > 1) {
      el.innerHTML = paras.map(p => `<div class="ov-para">${p.trim().replace(/\n/g, '<br>')}</div>`).join('');
    } else {
      el.innerHTML = reply.replace(/\n/g, '<br>');
    }

    if (badge) badge.textContent = '● GROK';

  } catch(e) {
    el.classList.remove('loading');
    el.innerHTML = `<span style="color:var(--text3);font-size:12px;">Overview unavailable — ${e.message}</span>`;
    if (badge) { badge.textContent = '● ERROR'; badge.style.color = '#ff3355'; }
  }
}

async function generateTradeIdeas(md, sd) {
  const el = document.getElementById('aiTradeIdeas');
  if (!el) return;
  try {
    const context = buildContext(md, sd);
    const reply = await callAI(
      [{ role: 'user', content: 'Give 3 specific SPY trade setups. Use OHLC levels, WEM range, HVNs, unfilled gaps, GEX levels (flip/support/resistance), and volatility regime. Each on one line: DIRECTION · SETUP · KEY LEVEL · INVALIDATION. Use actual dollar levels.' }],
      `You are a professional SPY trader with access to full market data including price structure, GEX (flip/support/resistance), max pain by expiry (labeled correctly — Wed=0DTE, Fri=weekly OPEX), breadth, and volume. Be specific with real numbers.\n\n${context}`,
      300
    );
    el.innerHTML = reply.split('\n').filter(l=>l.trim()).map((line,i) => {
      const isBull = /call|bull|long/i.test(line);
      const isBear = /put|bear|short/i.test(line);
      const c = isBull?'#00ff88':isBear?'#ff3355':'#00ccff';
      return `<div style="padding:7px 10px;margin-bottom:5px;background:var(--bg3);border-left:3px solid ${c};border-radius:0 3px 3px 0;font-size:12px;line-height:1.5;color:var(--text2);">
        <span style="font-family:'Orbitron',monospace;font-size:8px;color:${c};margin-right:6px;">${i+1}</span>${line.trim()}
      </div>`;
    }).join('');
  } catch(e) {
    el.innerHTML = `<div class="no-data">Unavailable — ${e.message}</div>`;
  }
}

// Level analysis
async function generateLevelAnalysis(md, sd) {
  const el = document.getElementById('aiLevelAnalysis');
  if (!el) return;
  try {
    const q = md.quotes||{}, spy = q['SPY']||{};
    const cur = spy.price||0;
    const today = sd?.[0]||{}, prev = sd?.[1]||{};

    // Today OHLC
    const dOpen = spy.open||today.open, dHigh = spy.high||today.high, dLow = spy.low||today.low;

    // Previous day
    const prevClose=prev.close, prevHigh=prev.high, prevLow=prev.low, prevOpen=prev.open;

    // Weekly (current week rows)
    const todayDate = new Date();
    const dow = todayDate.getDay();
    const wsd = new Date(todayDate);
    wsd.setDate(todayDate.getDate() - (dow===0?6:dow-1));
    const ws = wsd.toISOString().split('T')[0];
    const weekRows = (sd||[]).filter(r=>r.date>=ws);
    const wOpen = weekRows.length ? weekRows[weekRows.length-1].open : null;
    const wHigh = weekRows.length ? Math.max(...weekRows.map(r=>r.high||0)) : null;
    const wLow  = weekRows.length ? Math.min(...weekRows.filter(r=>r.low).map(r=>r.low)) : null;

    // Monthly
    const mStr = todayDate.toISOString().slice(0,7);
    const mRows = (sd||[]).filter(r=>r.date?.startsWith(mStr));
    const mOpen = mRows.length ? mRows[mRows.length-1].open : null;
    const mHigh = mRows.length ? Math.max(...mRows.map(r=>r.high||0)) : null;
    const mLow  = mRows.length ? Math.min(...mRows.filter(r=>r.low).map(r=>r.low)) : null;

    // Pre-market
    const pmPrice = spy.pre_market_price||spy.preMarketPrice||null;

    // WEM — objective, IV-derived
    const wems = md.weekly_em||[];
    const wem = wems.find(w=>!w.week_close)||wems[0];

    // HVN last 5 sessions
    const hvns = (sd||[]).slice(0,5)
      .filter(r=>r.volume_analysis?.hvn_price)
      .map(r=>`$${fmt(r.volume_analysis.hvn_price,2)} (${r.date?.slice(5)})`);

    // Unfilled gaps within $20
    const gaps = [];
    for(let i=0;i<(sd||[]).length-1;i++){
      const t2=sd[i], p2=sd[i+1];
      if(!t2.open||!p2.close) continue;
      const gs=t2.open-p2.close;
      if(Math.abs(gs)<0.20) continue;
      let filled=false;
      for(let j=i-1;j>=0;j--){
        const c=sd[j];
        if(!c.low||!c.high) continue;
        if(gs>0&&c.low<=p2.close){filled=true;break;}
        if(gs<0&&c.high>=p2.close){filled=true;break;}
      }
      if(!filled&&Math.abs(cur-p2.close)<=20)
        gaps.push(`$${fmt(p2.close,2)} ${gs>0?'(gap up)':'(gap down)'} from ${p2.date}`);
    }

    const context = `SPY: $${fmt(cur,2)}

TODAY OHLC: O $${fmt(dOpen,2)} | H $${fmt(dHigh,2)} | L $${fmt(dLow,2)}
PREV DAY: O $${fmt(prevOpen,2)} | H $${fmt(prevHigh,2)} | L $${fmt(prevLow,2)} | C $${fmt(prevClose,2)}
THIS WEEK: O $${fmt(wOpen,2)} | H $${fmt(wHigh,2)} | L $${fmt(wLow,2)}
THIS MONTH: O $${fmt(mOpen,2)} | H $${fmt(mHigh,2)} | L $${fmt(mLow,2)}
PRE-MARKET: ${pmPrice?'$'+fmt(pmPrice,2):'not available'}
WEM RANGE (IV-derived): Low $${fmt(wem?.wem_low,2)} / Mid $${fmt(wem?.wem_mid,2)} / High $${fmt(wem?.wem_high,2)} (±$${fmt((wem?.wem_range||0)/2,2)})
HIGH VOLUME NODES (last 5 days): ${hvns.length?hvns.join(', '):'none found'}
UNFILLED GAPS within $20: ${gaps.length?gaps.join(', '):'none found'}`;

    const reply = await callAI(
      [{ role: 'user', content: `Analyze these objective price levels in 3-4 sentences. Where is price relative to key OHLC levels? Which levels are acting as support or resistance right now? Are any gaps or HVNs nearby that matter? What is the single most important level to watch?\n\n${context}` }],
      'You are a technical analyst who uses only objective price action levels: OHLC structure, volume nodes, unfilled gaps, and IV-derived expected move ranges. No GEX, no sentiment, no indicators. Be specific with exact dollar levels from the data provided.',
      400
    );
    el.innerHTML = `<div style="font-size:13px;line-height:1.7;color:var(--text2);">${reply.replace(/\n/g,'<br>')}</div>`;
  } catch(e) {
    el.innerHTML = `<div class="no-data">Unavailable — ${e.message}</div>`;
  }
}


async function generateVolumeAnalysis(md, sd) {
  const el = document.getElementById('aiVolumeAnalysis');
  if (!el) return;
  try {
    const q = md.quotes||{}, spy = q['SPY']||{};
    const today = sd?.[0]||{};
    const va = today.volume_analysis||{};

    // Today's volume
    const todayVol = today.volume || spy.volume || 0;

    // 30-day average
    const last30 = (sd||[]).slice(0,30).filter(d=>d.volume>0);
    const avg30 = last30.length ? Math.round(last30.reduce((a,d)=>a+d.volume,0)/last30.length) : 0;

    // 5-day average
    const last5 = (sd||[]).slice(0,5).filter(d=>d.volume>0);
    const avg5 = last5.length ? Math.round(last5.reduce((a,d)=>a+d.volume,0)/last5.length) : 0;

    // Today vs averages
    const vsAvg30 = avg30 ? ((todayVol-avg30)/avg30*100) : null;
    const vsAvg5  = avg5  ? ((todayVol-avg5)/avg5*100)   : null;

    // Highest volume days in last 30 (top 3)
    const topVolDays = [...last30].sort((a,b)=>b.volume-a.volume).slice(0,3)
      .map(d=>`${d.date}: ${fmtK(d.volume)}`);

    // Lowest volume days (context)
    const lowVolDays = [...last30].sort((a,b)=>a.volume-b.volume).slice(0,2)
      .map(d=>`${d.date}: ${fmtK(d.volume)}`);

    // Weekly volume (current week)
    const todayDate = new Date();
    const dow = todayDate.getDay();
    const wsd = new Date(todayDate);
    wsd.setDate(todayDate.getDate() - (dow===0?6:dow-1));
    const ws = wsd.toISOString().split('T')[0];
    const weekRows = (sd||[]).filter(r=>r.date>=ws&&r.volume>0);
    const weekVol = weekRows.reduce((a,d)=>a+d.volume,0);
    const avgWeekVol = last30.length>=5 ? Math.round(
      Array.from({length:6},(_,i)=>{
        const rows=(sd||[]).slice(i*5,(i+1)*5).filter(d=>d.volume>0);
        return rows.reduce((a,d)=>a+d.volume,0);
      }).filter(v=>v>0).reduce((a,b)=>a+b,0) / 6
    ) : 0;

    // HVN prices last 5 sessions
    const hvns = (sd||[]).slice(0,5)
      .filter(r=>r.volume_analysis?.hvn_price)
      .map(r=>`$${fmt(r.volume_analysis.hvn_price,2)} on ${r.date?.slice(5)} (${fmtK(r.volume_analysis.hvn_volume||0)} shares)`);

    // Session breakdown today
    const openPct  = va.open_1h_pct  || null;
    const closePct = va.close_1h_pct || null;
    const peakTime = va.peak_time    || null;
    const peakVol  = va.peak_volume  || null;

    // Volume trend — last 10 days direction
    const last10 = (sd||[]).slice(0,10).filter(d=>d.volume>0).map(d=>d.volume);
    const trend = last10.length >= 4
      ? (last10.slice(0,5).reduce((a,b)=>a+b,0)/5) > (last10.slice(5).reduce((a,b)=>a+b,0)/Math.max(last10.slice(5).length,1))
        ? 'declining over the last 10 sessions'
        : 'expanding over the last 10 sessions'
      : 'insufficient data';

    const context = `SPY Volume Analysis

TODAY: ${fmtK(todayVol)} shares
30-DAY AVG: ${fmtK(avg30)} | Today is ${vsAvg30!=null?(vsAvg30>=0?'+':'')+fmt(vsAvg30,1)+'% vs 30d avg':'N/A'}
5-DAY AVG:  ${fmtK(avg5)}  | Today is ${vsAvg5!=null?(vsAvg5>=0?'+':'')+fmt(vsAvg5,1)+'% vs 5d avg':'N/A'}

VOLUME TREND: ${trend}

THIS WEEK TOTAL: ${fmtK(weekVol)} (avg weekly ~${fmtK(avgWeekVol)})

TOP VOLUME DAYS (last 30): ${topVolDays.join(' | ')}
LOWEST VOLUME DAYS (last 30): ${lowVolDays.join(' | ')}

TODAY SESSION BREAKDOWN:
  Open 1H (8:30-9:30 CT): ${openPct?fmt(openPct,1)+'% of daily volume':'N/A'}
  Close 1H (2:00-3:00 CT): ${closePct?fmt(closePct,1)+'% of daily volume':'N/A'}
  Peak volume bar: ${peakTime||'N/A'}${peakVol?' — '+fmtK(peakVol)+' shares':''}

HIGH VOLUME NODE PRICES (price levels with most volume concentration):
${hvns.length ? hvns.join('\n') : 'No HVN data available'}`;

    const reply = await callAI(
      [{ role: 'user', content: `Give a thorough volume analysis in 4-5 sentences based on this data. Comment on: is today's volume above or below average and what that suggests, the volume trend (expanding/contracting), any notable concentration at specific price levels (HVNs), and what the open/close session breakdown tells us about conviction. Be specific with numbers.\n\n${context}` }],
      'You are a volume analysis expert. Focus on what volume tells us about conviction, participation, and likely follow-through. Use the actual numbers. Explain what high or low volume at specific price levels means for those levels as support or resistance.',
      450
    );
    el.innerHTML = `<div style="font-size:13px;line-height:1.7;color:var(--text2);">${reply.replace(/\n/g,'<br>')}</div>`;
  } catch(e) {
    el.innerHTML = `<div class="no-data">Unavailable — ${e.message}</div>`;
  }
}

// Risk assessment
async function generateRiskAssessment(md, sd) {
  const el = document.getElementById('aiRiskAssessment');
  if (!el) return;
  try {
    const context = buildContext(md, sd);
    const reply = await callAI(
      [{ role: 'user', content: 'Top 2 risks to bulls and top 2 risks to bears today. Use price structure vs OHLC/WEM, volume conviction, breadth (A/D, up/down vol, % above MAs), volatility regime, GEX, and macro. Format: BULL RISKS: [1] / [2] — BEAR RISKS: [1] / [2]. One sentence conclusion on which side faces more risk. Use actual numbers.' }],
      `You are a risk manager. Full data including breadth (A/D ratio, up/down volume, % stocks above 50/200-day MA), GEX regime, max pain (correctly labeled by expiry type), OHLC structure, WEM range, and macro available.\n\n${context}`,
      350
    );
    const parts = reply.split(/BEAR RISKS:/i);
    if(parts.length === 2) {
      const bullPart = parts[0].replace(/BULL RISKS:/i,'').trim();
      const bearRest = parts[1].split('—');
      const bearPart = bearRest[0].trim();
      const conclusion = bearRest.slice(1).join('—').trim();
      el.innerHTML = `
        <div style="margin-bottom:8px;padding:8px;background:#00ff8811;border-left:3px solid #00ff88;border-radius:0 3px 3px 0;">
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:#00ff88;margin-bottom:4px;">BULL RISKS</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.5;">${bullPart}</div>
        </div>
        <div style="margin-bottom:8px;padding:8px;background:#ff335511;border-left:3px solid #ff3355;border-radius:0 3px 3px 0;">
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:#ff3355;margin-bottom:4px;">BEAR RISKS</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.5;">${bearPart}</div>
        </div>
        ${conclusion?`<div style="font-size:12px;color:var(--text3);font-style:italic;padding-top:4px;">${conclusion}</div>`:''}`;
    } else {
      el.innerHTML = `<div style="font-size:13px;line-height:1.7;color:var(--text2);">${reply.replace(/\n/g,'<br>')}</div>`;
    }
  } catch(e) {
    el.innerHTML = `<div class="no-data">Unavailable — ${e.message}</div>`;
  }
}

// Event impact
async function generateEventImpact(md, sd) {
  const el = document.getElementById('aiEventImpact');
  if (!el) return;
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const todayStr = today.toISOString().slice(0,10);

    // Re-use the same nthWeekdayDate logic inline
    function _nthWD(year, month, weekday, n) {
      const d = new Date(year, month, 1); let count = 0;
      for (let i = 0; i < 31; i++) {
        if (d.getMonth() !== month) break;
        if (d.getDay() === weekday) { count++; if (count === n) return d.toISOString().slice(0,10); }
        d.setDate(d.getDate() + 1);
      }
      return null;
    }

    // Build dynamic CPI/NFP — use RELEASE_DATA.upcoming if available, else algorithmic fallback
    const dynEvents = [];
    const upcomingCpi = (typeof RELEASE_DATA !== 'undefined' && RELEASE_DATA?.upcoming?.cpi) || [];
    const upcomingNfp = (typeof RELEASE_DATA !== 'undefined' && RELEASE_DATA?.upcoming?.nfp) || [];
    if (upcomingCpi.length || upcomingNfp.length) {
      upcomingCpi.filter(d => d >= todayStr).forEach(d => dynEvents.push({ name: 'CPI', dates: [d] }));
      upcomingNfp.filter(d => d >= todayStr).forEach(d => dynEvents.push({ name: 'NFP', dates: [d] }));
    } else {
      for (let offset = 0; offset <= 4; offset++) {
        const d = new Date(today); d.setMonth(d.getMonth() + offset);
        const y = d.getFullYear(), m = d.getMonth();
        const cpi = _nthWD(y, m, 3, 2);
        const nfp = _nthWD(y, m, 5, 1);
        if (cpi && cpi >= todayStr) dynEvents.push({ name: 'CPI', dates: [cpi] });
        if (nfp && nfp >= todayStr) dynEvents.push({ name: 'NFP', dates: [nfp] });
      }
    }

    const knownEarnings = [
      {name:'TSLA ER',  dates:['2026-04-21','2026-07-20','2026-10-19']},
      {name:'GOOGL ER', dates:['2026-04-28','2026-07-27','2026-10-26']},
      {name:'MSFT ER',  dates:['2026-04-29','2026-07-28','2026-10-27']},
      {name:'META ER',  dates:['2026-04-29','2026-07-28','2026-10-27']},
      {name:'AAPL ER',  dates:['2026-04-30','2026-07-30','2026-10-29']},
      {name:'AMZN ER',  dates:['2026-05-01','2026-07-30','2026-10-29']},
      {name:'NVDA ER',  dates:['2026-05-28','2026-08-27','2026-11-19']},
    ];

    const fomcDates = ['2026-04-29','2026-06-17','2026-07-29','2026-09-16','2026-10-28','2026-12-16','2027-01-27'];

    const events = [
      ...dynEvents,
      ...knownEarnings,
      { name: 'FOMC', dates: fomcDates.filter(d => d >= todayStr) },
    ];
    const upcoming = events.flatMap(e => e.dates.map(d => ({
      name: e.name,
      date: d,
      days: Math.ceil((new Date(d+'T12:00:00') - today) / 86400000)
    }))).filter(e => e.days >= 0 && e.days <= 30).sort((a,b) => a.days - b.days).slice(0,5);

    if(!upcoming.length) {
      el.innerHTML = '<div class="no-data">No major events in next 30 days</div>';
      return;
    }

    const wem = md.weekly_em?.find(w=>!w.week_close)||md.weekly_em?.[0];
    const eventStr = upcoming.map(e=>`${e.name} in ${e.days} days (${e.date})`).join(', ');
    const vix = md.quotes?.['^VIX']?.price||0;
    const pcr = md.options_summary?.pc_ratio_vol||0;
    const gex = md.gex||{};
    const reply = await callAI(
      [{ role: 'user', content: `Upcoming events: ${eventStr}. WEM: $${wem?.wem_low?.toFixed(2)||'?'}-$${wem?.wem_high?.toFixed(2)||'?'} (±$${((wem?.wem_range||0)/2).toFixed(2)}). VIX: ${vix.toFixed(1)}. PCR: ${fmt(pcr,3)}. ATM IV: ${fmt((wem?.atm_iv||0)*100,2)}%. GEX: ${gex.regime||'N/A'} (flip $${gex.flip_point||'N/A'}). In 2-3 sentences: which event poses the most structural risk, what the current positioning data suggests about market expectations, and whether IV is pricing the risk adequately.` }],
      'You are a volatility trader. Assess event risk using WEM range, VIX term structure, PCR, GEX regime, and IV vs historical realized vol. Be specific with numbers.',
      300
    );
    el.innerHTML = `
      <div style="margin-bottom:10px;">
        ${upcoming.map(e=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:12px;color:var(--text2);">${e.name}</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${e.days<=3?'#ff3355':e.days<=7?'#ff8800':'#00ccff'};">${e.days}d · ${e.date.slice(5)}</span>
        </div>`).join('')}
      </div>
      <div style="font-size:12px;line-height:1.6;color:var(--text2);border-top:1px solid var(--border);padding-top:8px;">${reply.replace(/\n/g,'<br>')}</div>`;
  } catch(e) {
    el.innerHTML = `<div class="no-data">Unavailable — ${e.message}</div>`;
  }
}

// ─────────────────────────────────────────────
// KEY EVENTS COUNTDOWN
// ─────────────────────────────────────────────
async function renderKeyEvents() {
  const el = $('keyEventsDisplay');
  if (!el) return;

  const today = new Date();
  today.setHours(0,0,0,0);

  const daysUntil = dateStr => {
    const d = new Date(dateStr + 'T00:00:00');
    return Math.round((d - today) / 86400000);
  };

  const urgencyColor = days => {
    if (days <= 3) return '#ff3355';
    if (days <= 7) return '#ff8800';
    if (days <= 14) return '#ffcc00';
    return '#00ccff';
  };

  const typeColors = { FOMC:'#8855ff', CPI:'#ff8800', NFP:'#00ccff', EARNINGS:'#ffcc00' };

  // ── Dynamic event date computation — never goes stale ─────────────────────
  // Computes approximate release dates algorithmically for any future month.
  // CPI  = 2nd Wednesday of the month (reporting prior month)
  // NFP  = 1st Friday of the month
  // These match the actual BLS schedule ~95% of the time.
  function nthWeekdayDate(year, month, weekday, n) {
    // weekday: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat; n: 1-based
    const d = new Date(year, month, 1);
    let count = 0;
    for (let i = 0; i < 31; i++) {
      if (d.getMonth() !== month) break;
      if (d.getDay() === weekday) { count++; if (count === n) return d.toISOString().slice(0,10); }
      d.setDate(d.getDate() + 1);
    }
    return null;
  }

  function computeCpiNfpDates(monthsAhead = 9) {
    const today = new Date(); today.setHours(0,0,0,0);
    const todayStr = today.toISOString().slice(0,10);
    const result = [];
    // Prefer RELEASE_DATA.upcoming which has actual BLS-published dates
    const upcomingCpi = (typeof RELEASE_DATA !== 'undefined' && RELEASE_DATA?.upcoming?.cpi) || [];
    const upcomingNfp = (typeof RELEASE_DATA !== 'undefined' && RELEASE_DATA?.upcoming?.nfp) || [];
    if (upcomingCpi.length || upcomingNfp.length) {
      upcomingCpi.filter(d => d >= todayStr).forEach(d => result.push({ name: 'CPI REPORT',       date: d, type: 'CPI', icon: '📊' }));
      upcomingNfp.filter(d => d >= todayStr).forEach(d => result.push({ name: 'NONFARM PAYROLLS', date: d, type: 'NFP', icon: '💼' }));
    } else {
      // Algorithmic fallback (less accurate — CPI is not always 2nd Wednesday)
      for (let offset = 0; offset <= monthsAhead; offset++) {
        const d = new Date(today); d.setMonth(d.getMonth() + offset);
        const y = d.getFullYear(), m = d.getMonth();
        const cpi = nthWeekdayDate(y, m, 3, 2);
        const nfp = nthWeekdayDate(y, m, 5, 1);
        if (cpi && cpi >= todayStr) result.push({ name: 'CPI REPORT',       date: cpi, type: 'CPI', icon: '📊' });
        if (nfp && nfp >= todayStr) result.push({ name: 'NONFARM PAYROLLS', date: nfp, type: 'NFP', icon: '💼' });
      }
    }
    return result;
  }

  // ── Earnings: known upcoming cycle + algorithmic next-quarter fallback ──────
  // Known Q1 2026 earnings (April/May report season). After these pass the
  // algorithmic fallback below kicks in — MAG7 typically reports in:
  //   Q1 results → late April / early May
  //   Q2 results → late July / early August
  //   Q3 results → late October / early November
  //   Q4 results → late January / early February
  const KNOWN_EARNINGS = [
    { name: 'TSLA EARNINGS',  date: '2026-04-21', type: 'EARNINGS', icon: '⚡' },
    { name: 'GOOGL EARNINGS', date: '2026-04-28', type: 'EARNINGS', icon: '🔍' },
    { name: 'MSFT EARNINGS',  date: '2026-04-29', type: 'EARNINGS', icon: '💻' },
    { name: 'META EARNINGS',  date: '2026-04-29', type: 'EARNINGS', icon: '📱' },
    { name: 'AAPL EARNINGS',  date: '2026-04-30', type: 'EARNINGS', icon: '🍎' },
    { name: 'AMZN EARNINGS',  date: '2026-05-01', type: 'EARNINGS', icon: '📦' },
    { name: 'NVDA EARNINGS',  date: '2026-05-28', type: 'EARNINGS', icon: '🎮' },
    // Q2 2026 season — approx dates (update when confirmed)
    { name: 'TSLA EARNINGS',  date: '2026-07-20', type: 'EARNINGS', icon: '⚡' },
    { name: 'GOOGL EARNINGS', date: '2026-07-27', type: 'EARNINGS', icon: '🔍' },
    { name: 'MSFT EARNINGS',  date: '2026-07-28', type: 'EARNINGS', icon: '💻' },
    { name: 'META EARNINGS',  date: '2026-07-28', type: 'EARNINGS', icon: '📱' },
    { name: 'AAPL EARNINGS',  date: '2026-07-30', type: 'EARNINGS', icon: '🍎' },
    { name: 'AMZN EARNINGS',  date: '2026-07-30', type: 'EARNINGS', icon: '📦' },
    { name: 'NVDA EARNINGS',  date: '2026-08-27', type: 'EARNINGS', icon: '🎮' },
    // Q3 2026 season — approx dates
    { name: 'TSLA EARNINGS',  date: '2026-10-19', type: 'EARNINGS', icon: '⚡' },
    { name: 'GOOGL EARNINGS', date: '2026-10-26', type: 'EARNINGS', icon: '🔍' },
    { name: 'MSFT EARNINGS',  date: '2026-10-27', type: 'EARNINGS', icon: '💻' },
    { name: 'META EARNINGS',  date: '2026-10-27', type: 'EARNINGS', icon: '📱' },
    { name: 'AAPL EARNINGS',  date: '2026-10-29', type: 'EARNINGS', icon: '🍎' },
    { name: 'AMZN EARNINGS',  date: '2026-10-29', type: 'EARNINGS', icon: '📦' },
    { name: 'NVDA EARNINGS',  date: '2026-11-19', type: 'EARNINGS', icon: '🎮' },
  ];

  // ── Build full events list ──────────────────────────────────────────────────
  const today0 = new Date(); today0.setHours(0,0,0,0);
  const todayStr0 = today0.toISOString().slice(0,10);

  let events = [
    ...computeCpiNfpDates(9),
    ...KNOWN_EARNINGS.filter(e => e.date >= todayStr0),
  ];

  // ── FOMC: try live fetch, fall back to known 2026 schedule ─────────────────
  try {
    const r = await fetch('/fomc?t=' + Date.now());
    if (r.ok) {
      const data = await r.json();
      if (data.meetings && data.meetings.length > 0) {
        data.meetings.forEach(m => {
          events.push({ name: 'FOMC DECISION', date: m.date, type: 'FOMC', icon: '🏦' });
          if (m.press_conference) events.push({ name: 'FOMC PRESS CONF', date: m.date, type: 'FOMC', icon: '🎙️' });
        });
      }
    }
  } catch(e) {
    // Known 2026 + approx 2027 Q1 schedule
    ['2026-04-29','2026-06-17','2026-07-29','2026-09-16','2026-10-28','2026-12-16',
     '2027-01-27','2027-03-17'].forEach(d => {
      if (d >= todayStr0) events.push({ name: 'FOMC DECISION', date: d, type: 'FOMC', icon: '🏦' });
    });
  }

  // Filter future, sort by date
  const upcoming = events
    .map(e => ({ ...e, days: daysUntil(e.date) }))
    .filter(e => e.days >= 0)
    .sort((a, b) => a.days - b.days);

  const nextFOMC     = upcoming.find(e => e.type === 'FOMC' && e.name.includes('DECISION'));
  const nextCPI      = upcoming.find(e => e.type === 'CPI');
  const nextNFP      = upcoming.find(e => e.type === 'NFP');
  const nextEarnings = upcoming.filter(e => e.type === 'EARNINGS').slice(0, 4);

  const bigCard = e => {
    if (!e) return '';
    const c = typeColors[e.type];
    const uc = urgencyColor(e.days);
    const d = new Date(e.date + 'T00:00:00');
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `<div style="background:var(--bg3);border:1px solid ${c}44;border-top:3px solid ${c};border-radius:4px;padding:14px;text-align:center;">
      <div style="font-size:20px;margin-bottom:6px;">${e.icon}</div>
      <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:${c};margin-bottom:6px;">${e.type}</div>
      <div style="font-family:'Orbitron',monospace;font-size:11px;color:var(--text);margin-bottom:8px;">${e.name}</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:32px;font-weight:900;color:${uc};">${e.days}</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text3);">days away</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--text2);margin-top:4px;">${dateStr}</div>
    </div>`;
  };

  const earningsCards = nextEarnings.map(e => {
    const c = typeColors.EARNINGS;
    const uc = urgencyColor(e.days);
    const d = new Date(e.date + 'T00:00:00');
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const ticker = e.name.split(' ')[0];
    return `<div style="background:var(--bg3);border:1px solid ${c}33;border-left:3px solid ${c};border-radius:3px;padding:10px;display:flex;justify-content:space-between;align-items:center;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:16px;">${e.icon}</span>
        <div>
          <div style="font-family:'Orbitron',monospace;font-size:11px;font-weight:700;color:${c};">${ticker}</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text3);">${dateStr}</div>
        </div>
      </div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:20px;font-weight:bold;color:${uc};">${e.days}d</div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;align-items:start;">
      ${bigCard(nextFOMC)}
      ${bigCard(nextCPI)}
      ${bigCard(nextNFP)}
      <div style="grid-column:span 1;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:#ffcc00;margin-bottom:8px;">⬡ MAG 7 EARNINGS</div>
        <div style="display:flex;flex-direction:column;gap:6px;">${earningsCards}</div>
      </div>
    </div>`;
}


// VOLATILITY STATS TAB RENDER
// ─────────────────────────────────────────────
function renderVolStats() {
  // Use existing esRenderVolEdge() then mirror output into vs-* elements
  if (typeof esRenderVolEdge === 'function') {
    esRenderVolEdge();
    const copy = (from, to) => {
      const src = document.getElementById(from);
      const dst = document.getElementById(to);
      if (src && dst) dst.innerHTML = src.innerHTML;
    };
    copy('es-wvol-rows', 'vs-wvol-rows');
    copy('es-dvol-rows', 'vs-dvol-rows');
    copy('es-risk-cards', 'vs-risk-cards');
    copy('es-consec-vol-cards', 'vs-consec-vol-cards');
    copy('es-vol-explainer', 'vs-vol-explainer');
  }

  // ES_DATA and esLookback live in the edgestats inline script — access via window
  const _esData = typeof window.ES_DATA !== 'undefined' ? window.ES_DATA
                : typeof ES_DATA !== 'undefined' ? ES_DATA : null;
  if (!_esData) { 
    setTimeout(renderVolStats, 500);
    return;
  }
  const _lb = typeof window.esLookback !== 'undefined' ? window.esLookback
            : typeof esLookback !== 'undefined' ? esLookback : 'all_time';
  const D = _esData[_lb] || _esData['all_time'];
  if (!D) return;
  const ve = D.vol_edge;
  if (!ve) return;

  // Weekly buckets
  const wvolEl = document.getElementById('vs-wvol-rows');
  if (wvolEl && ve.weekly_buckets) {
    wvolEl.innerHTML = ve.weekly_buckets.map(b => {
      const sc = b.self_avg >= 0 ? '#00ff88' : '#ff3355';
      const ac = b.after_avg >= 0 ? '#00ff88' : '#ff3355';
      return `<div class="es-vol-bucket">
        <div>${b.bucket}</div>
        <div>$${b.threshold_low.toFixed(2)}</div>
        <div>$${b.threshold_high.toFixed(2)}</div>
        <div style="color:${sc};">${b.self_avg >= 0 ? '+' : ''}${b.self_avg.toFixed(2)}%</div>
        <div>${b.self_winrate.toFixed(1)}%</div>
        <div style="color:${ac};">${b.after_avg >= 0 ? '+' : ''}${b.after_avg.toFixed(2)}%</div>
      </div>`;
    }).join('');
  }

  // Daily buckets
  const dvolEl = document.getElementById('vs-dvol-rows');
  if (dvolEl && ve.daily_buckets) {
    dvolEl.innerHTML = ve.daily_buckets.map(b => {
      const sc = b.self_avg >= 0 ? '#00ff88' : '#ff3355';
      const ac = b.after_avg >= 0 ? '#00ff88' : '#ff3355';
      return `<div class="es-vol-bucket">
        <div>${b.bucket}</div>
        <div>$${b.threshold_low.toFixed(2)}</div>
        <div>$${b.threshold_high.toFixed(2)}</div>
        <div style="color:${sc};">${b.self_avg >= 0 ? '+' : ''}${b.self_avg.toFixed(2)}%</div>
        <div>${b.self_winrate.toFixed(1)}%</div>
        <div style="color:${ac};">${b.after_avg >= 0 ? '+' : ''}${b.after_avg.toFixed(2)}%</div>
      </div>`;
    }).join('');
  }

  // Risk + consec cards
  const riskEl = document.getElementById('vs-risk-cards');
  if (riskEl) {
    riskEl.innerHTML = [
      { lbl: 'Risk-Adj (All)', val: ve.risk_adj_all?.toFixed(4) || '—', sub: 'return per $ of range' },
      { lbl: 'High-Vol Self', val: (ve.hi_vol_self_avg >= 0 ? '+' : '') + (ve.hi_vol_self_avg?.toFixed(2) || '—') + '%', sub: ve.hi_vol_self_winrate?.toFixed(1) + '% up' },
      { lbl: 'Low-Vol Self',  val: (ve.lo_vol_self_avg >= 0 ? '+' : '') + (ve.lo_vol_self_avg?.toFixed(2) || '—') + '%', sub: 'during low-vol weeks' },
    ].map(c => `<div class="es-card"><div class="es-card-label">${c.lbl}</div><div class="es-card-val neu">${c.val}</div><div class="es-card-sub">${c.sub}</div></div>`).join('');
  }

  const consecEl = document.getElementById('vs-consec-vol-cards');
  if (consecEl && ve.after_consec_hivol_avg != null) {
    consecEl.innerHTML = [
      { lbl: 'After 2+ High-Vol Wks Avg', val: (ve.after_consec_hivol_avg >= 0 ? '+' : '') + ve.after_consec_hivol_avg.toFixed(2) + '%', cls: ve.after_consec_hivol_avg >= 0 ? 'up' : 'dn' },
      { lbl: 'Win Rate', val: ve.after_consec_hivol_winrate?.toFixed(1) + '%', cls: ve.after_consec_hivol_winrate >= 55 ? 'up' : 'dn' },
    ].map(c => `<div class="es-card"><div class="es-card-label">${c.lbl}</div><div class="es-card-val ${c.cls}">${c.val}</div></div>`).join('');
  }

  // ── Charts: next-period return by vol bucket ────────────────────────────
  function renderVolBucketChart(containerId, buckets, periodLabel) {
    const el = document.getElementById(containerId);
    if (!el || !buckets || !buckets.length) return;
    const bucketColors = ['#00ff88','#88cc00','#ffcc00','#ff8800','#ff3355'];
    // Find max absolute value for scale
    const maxAbs = Math.max(...buckets.map(b => Math.abs(b.after_avg || 0)), 0.1);
    const maxW = 140; // max bar half-width px

    el.innerHTML = `
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:10px;">
        NEXT ${periodLabel} AVG RETURN BY CURRENT VOLATILITY BUCKET
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${buckets.map((b, i) => {
          const v = b.after_avg || 0;
          const color = bucketColors[i];
          const barW = Math.round(Math.abs(v) / maxAbs * maxW);
          const isPos = v >= 0;
          const wr = b.after_winrate != null ? b.after_winrate.toFixed(1)+'%' : '';
          return `<div style="display:flex;align-items:center;gap:8px;">
            <div style="font-size:10px;color:${color};width:72px;flex-shrink:0;font-family:'Share Tech Mono',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${b.bucket}</div>
            <div style="flex:1;height:22px;background:var(--bg3);border-radius:2px;position:relative;overflow:hidden;">
              <div style="position:absolute;top:0;bottom:0;left:50%;width:1px;background:rgba(255,255,255,0.1);"></div>
              <div style="position:absolute;top:2px;bottom:2px;${isPos?'left:50%':'right:50%'};width:${barW}px;background:${color}99;border-radius:2px;"></div>
              <div style="position:absolute;top:0;bottom:0;${isPos?'left:calc(50% + '+barW+'px + 4px)':'right:calc(50% + '+barW+'px + 4px)'};display:flex;align-items:center;">
                <span style="font-family:'Share Tech Mono',monospace;font-size:11px;font-weight:bold;color:${color};">${isPos?'+':''}${v.toFixed(3)}%</span>
                ${wr ? `<span style="font-size:9px;color:var(--text3);margin-left:4px;">${wr} WR</span>` : ''}
              </div>
            </div>
            <div style="font-size:9px;color:var(--text3);width:48px;text-align:right;font-family:'Share Tech Mono',monospace;">$${(b.threshold_low||0).toFixed(1)}–${(b.threshold_high||0).toFixed(1)}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:center;gap:20px;margin-top:8px;">
        <div style="font-size:10px;color:#ff3355;">◀ Negative return next ${periodLabel.toLowerCase()}</div>
        <div style="font-size:10px;color:var(--text3);">│</div>
        <div style="font-size:10px;color:#00ff88;">Positive return next ${periodLabel.toLowerCase()} ▶</div>
      </div>`;
  }

  if (ve.weekly_buckets) renderVolBucketChart('vs-wvol-chart', ve.weekly_buckets, 'WEEK');
  if (ve.daily_buckets)  renderVolBucketChart('vs-dvol-chart',  ve.daily_buckets,  'DAY');

  // ── Win-rate sparkline for each bucket (who wins more?) ─────────────────
  // Also add 'after_winrate' to the rows if data has it
  const addWRToRows = (rowsId, buckets) => {
    const el = document.getElementById(rowsId);
    if (!el || !buckets) return;
    const rows = el.querySelectorAll('.es-vol-bucket');
    rows.forEach((row, i) => {
      const b = buckets[i];
      if (!b) return;
      const wr = b.after_winrate != null ? b.after_winrate : b.self_winrate;
      const wrColor = wr > 60 ? '#00ff88' : wr > 50 ? '#ffcc00' : '#ff3355';
      // Check if we already added wr cell
      if (!row.querySelector('.wr-cell')) {
        const wrCell = document.createElement('div');
        wrCell.className = 'wr-cell';
        wrCell.style.cssText = `font-size:11px;color:${wrColor};font-family:'Share Tech Mono',monospace;padding:7px 9px;`;
        wrCell.textContent = wr != null ? wr.toFixed(1)+'%' : '—';
        // Don't append to avoid layout issues — just colorize existing cell
      }
    });
  };

  // Lookback + meta
  const lbEl = document.getElementById('vs-vol-lb');
  if (lbEl) {
    lbEl.innerHTML = `<div class="es-lookback">
      <button class="es-lb-btn ${_lb==='all_time'?'active':''}" onclick="if(typeof esSetLookback==='function')esSetLookback('all_time');else window.esLookback='all_time';renderVolStats();">ALL TIME</button>
      <button class="es-lb-btn ${_lb==='since_2020'?'active':''}" onclick="if(typeof esSetLookback==='function')esSetLookback('since_2020');else window.esLookback='since_2020';renderVolStats();">SINCE 2020</button>
      <button class="es-lb-btn ${_lb==='current_year'?'active':''}" onclick="if(typeof esSetLookback==='function')esSetLookback('current_year');else window.esLookback='current_year';renderVolStats();">2026 YTD</button>
    </div>`;
  }
}

window.vsSubTab = function(id, el) {
  document.querySelectorAll('#panel-volstats .es-subtab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
};


// GEX RENDER
// ─────────────────────────────────────────────
function renderGEX(md) {
  // Render into the GEX tab panel only
  const targets = [$('gexContent')].filter(Boolean);
  if(!targets.length) return;
  const gex = md.gex;
  const spy = md.quotes?.['SPY'] || {};
  const spot = spy.price || gex?.spot || 0;

  if (!gex || !gex.flip_point) {
    const noDataMsg = `
      <div style="padding:16px;display:flex;align-items:center;gap:16px;">
        <div style="font-size:28px;opacity:0.3;">⬡</div>
        <div>
          <div style="font-family:'Orbitron',monospace;font-size:11px;color:var(--text3);margin-bottom:4px;">GEX DATA NOT YET AVAILABLE</div>
          <div style="font-size:12px;color:var(--text3);line-height:1.6;">
            Loading live CBOE data... If this persists, the /gex function may not be deployed yet.<br>
            Data updates every 5 minutes during market hours.
          </div>
        </div>
      </div>`;
    targets.forEach(el => el.innerHTML = noDataMsg);
    return;
  }

  const isPos = gex.net_gex > 0;
  const regimeColor = gex.net_gex > 1e9 ? '#00ff88' : gex.net_gex > 0 ? '#88cc00' : gex.net_gex > -1e9 ? '#ff8800' : '#ff3355';
  const fmtB = n => {
    const abs = Math.abs(n);
    const sign = n >= 0 ? '+' : '-';
    if (abs >= 1e9) return sign + '$' + (abs/1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return sign + '$' + (abs/1e6).toFixed(0) + 'M';
    return sign + '$' + Math.round(abs).toLocaleString();
  };

  const maxGex = gex.strikes ? Math.max(...gex.strikes.map(s => Math.abs(s.gex)), 1) : 1;
  const barChart = gex.strikes ? gex.strikes.map(s => {
    const w = (Math.abs(s.gex) / maxGex * 50).toFixed(1);
    const color = s.gex > 0 ? '#00ff88' : '#ff3355';
    const isSpot = Math.abs(s.strike - spot) < 2.5;
    const isFlip = gex.flip_point && Math.abs(s.strike - gex.flip_point) < 1.5;
    return `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;${isSpot?'background:rgba(0,204,255,0.08);border-radius:3px;padding:3px 6px;':''}${isFlip?'background:rgba(255,204,0,0.06);border-radius:3px;padding:3px 6px;':''}">
      <span style="font-family:'Share Tech Mono',monospace;font-size:12px;width:55px;text-align:right;color:${isSpot?'var(--cyan)':isFlip?'#ffcc00':'var(--text2)'}">$${s.strike}</span>
      <div style="flex:1;height:16px;background:var(--bg3);border-radius:2px;overflow:hidden;position:relative;">
        ${s.gex>0
          ?`<div style="position:absolute;left:50%;width:${w}%;height:100%;background:${color}88;border-radius:0 2px 2px 0;"></div>`
          :`<div style="position:absolute;right:50%;width:${w}%;height:100%;background:${color}88;border-radius:2px 0 0 2px;"></div>`}
        <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--border2);"></div>
      </div>
      <span style="font-family:'Share Tech Mono',monospace;font-size:11px;width:76px;color:${color};text-align:right;">${fmtB(s.gex)}</span>
      ${isSpot?'<span style="font-family:\'Orbitron\',monospace;font-size:7px;color:var(--cyan);width:32px;">SPOT</span>':isFlip?'<span style="font-family:\'Orbitron\',monospace;font-size:7px;color:#ffcc00;width:32px;">FLIP</span>':'<span style="width:32px;"></span>'}
    </div>`;
  }).join('') : '';

  const html = `
    <div style="display:grid;grid-template-columns:auto 1fr 1fr 1fr;gap:12px;align-items:center;margin-bottom:14px;">
      <!-- Regime -->
      <div style="padding:12px 20px;background:${regimeColor}11;border:1px solid ${regimeColor}44;border-left:4px solid ${regimeColor};border-radius:4px;min-width:220px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:2px;color:var(--text3);margin-bottom:6px;">GEX REGIME</div>
        <div style="font-family:'Orbitron',monospace;font-size:16px;font-weight:900;color:${regimeColor};margin-bottom:6px;">${gex.regime}</div>
        <div style="font-size:11px;color:var(--text2);line-height:1.5;">${gex.regime_desc}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text3);margin-top:6px;">Net: ${fmtB(gex.net_gex)}</div>
      </div>
      <!-- Support -->
      <div style="text-align:center;padding:12px;background:rgba(255,51,85,0.06);border:1px solid rgba(255,51,85,0.3);border-radius:4px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:#ff3355;margin-bottom:6px;">GEX SUPPORT</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:28px;font-weight:bold;color:#ff3355;">$${gex.support||'—'}</div>
        ${gex.support&&spot?`<div style="font-size:11px;color:var(--text3);margin-top:4px;">${fmt(spot-gex.support,2)} pts below</div>`:''}
        <div style="font-size:10px;color:rgba(255,51,85,0.6);margin-top:4px;">Dealers buy here</div>
      </div>
      <!-- Flip -->
      <div style="text-align:center;padding:12px;background:rgba(0,204,255,0.06);border:1px solid rgba(0,204,255,0.3);border-radius:4px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--cyan);margin-bottom:6px;">GAMMA FLIP</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:28px;font-weight:bold;color:var(--cyan);">$${gex.flip_point||'—'}</div>
        ${gex.flip_point&&spot?`<div style="font-family:'Orbitron',monospace;font-size:9px;margin-top:6px;padding:2px 8px;border-radius:2px;display:inline-block;
          color:${spot>gex.flip_point?'#00ff88':'#ff3355'};background:${spot>gex.flip_point?'rgba(0,255,136,0.12)':'rgba(255,51,85,0.12)'};">
          ${spot>gex.flip_point?'✓ ABOVE — CONTAINED':'⚠ BELOW — VOLATILE'}</div>`:''}
        <div style="font-size:10px;color:rgba(0,204,255,0.6);margin-top:4px;">Zero GEX crossing</div>
      </div>
      <!-- Resistance -->
      <div style="text-align:center;padding:12px;background:rgba(0,255,136,0.06);border:1px solid rgba(0,255,136,0.3);border-radius:4px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:#00ff88;margin-bottom:6px;">GEX RESISTANCE</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:28px;font-weight:bold;color:#00ff88;">$${gex.resistance||'—'}</div>
        ${gex.resistance&&spot?`<div style="font-size:11px;color:var(--text3);margin-top:4px;">${fmt(gex.resistance-spot,2)} pts above</div>`:''}
        <div style="font-size:10px;color:rgba(0,255,136,0.6);margin-top:4px;">Dealers sell here</div>
      </div>
    </div>

    ${barChart ? `
    <div>
      <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;color:var(--text3);margin-bottom:8px;display:flex;justify-content:space-between;">
        <span>GEX BY STRIKE — green=call GEX (stabilizing) · red=put GEX (destabilizing)</span>
        <span style="color:var(--cyan);">SPOT=$${fmt(spot,2)} highlighted</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px;">
        ${gex.strikes.slice(0, Math.ceil(gex.strikes.length/2)).map(s => {
          const w = (Math.abs(s.gex) / maxGex * 50).toFixed(1);
          const color = s.gex > 0 ? '#00ff88' : '#ff3355';
          const isSpot = Math.abs(s.strike - spot) < 2.5;
          const isFlip = gex.flip_point && Math.abs(s.strike - gex.flip_point) < 1.5;
          return `<div style="display:flex;align-items:center;gap:8px;padding:2px 0;${isSpot?'background:rgba(0,204,255,0.08);border-radius:2px;padding:2px 4px;':''}${isFlip?'background:rgba(255,204,0,0.06);border-radius:2px;padding:2px 4px;':''}">
            <span style="font-family:'Share Tech Mono',monospace;font-size:11px;width:52px;text-align:right;color:${isSpot?'var(--cyan)':isFlip?'#ffcc00':'var(--text2)'}">$${s.strike}</span>
            <div style="flex:1;height:14px;background:var(--bg3);border-radius:2px;overflow:hidden;position:relative;">
              ${s.gex>0?`<div style="position:absolute;left:50%;width:${w}%;height:100%;background:${color}88;border-radius:0 2px 2px 0;"></div>`:`<div style="position:absolute;right:50%;width:${w}%;height:100%;background:${color}88;border-radius:2px 0 0 2px;"></div>`}
              <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--border2);"></div>
            </div>
            <span style="font-family:'Share Tech Mono',monospace;font-size:10px;width:68px;color:${color};text-align:right;">${fmtB(s.gex)}</span>
          </div>`;
        }).join('')}
        ${gex.strikes.slice(Math.ceil(gex.strikes.length/2)).map(s => {
          const w = (Math.abs(s.gex) / maxGex * 50).toFixed(1);
          const color = s.gex > 0 ? '#00ff88' : '#ff3355';
          const isSpot = Math.abs(s.strike - spot) < 2.5;
          const isFlip = gex.flip_point && Math.abs(s.strike - gex.flip_point) < 1.5;
          return `<div style="display:flex;align-items:center;gap:8px;padding:2px 0;${isSpot?'background:rgba(0,204,255,0.08);border-radius:2px;padding:2px 4px;':''}${isFlip?'background:rgba(255,204,0,0.06);border-radius:2px;padding:2px 4px;':''}">
            <span style="font-family:'Share Tech Mono',monospace;font-size:11px;width:52px;text-align:right;color:${isSpot?'var(--cyan)':isFlip?'#ffcc00':'var(--text2)'}">$${s.strike}</span>
            <div style="flex:1;height:14px;background:var(--bg3);border-radius:2px;overflow:hidden;position:relative;">
              ${s.gex>0?`<div style="position:absolute;left:50%;width:${w}%;height:100%;background:${color}88;border-radius:0 2px 2px 0;"></div>`:`<div style="position:absolute;right:50%;width:${w}%;height:100%;background:${color}88;border-radius:2px 0 0 2px;"></div>`}
              <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--border2);"></div>
            </div>
            <span style="font-family:'Share Tech Mono',monospace;font-size:10px;width:68px;color:${color};text-align:right;">${fmtB(s.gex)}</span>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}`;

  targets.forEach(el => el.innerHTML = html);
}
async function renderLiquidity() {
  const el = $('liquidityContent');
  if (!el) return;

  const fmtT = n => {
    if (!n && n !== 0) return '—';
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if (abs >= 1e12) return sign + '$' + (abs/1e12).toFixed(2) + 'T';
    if (abs >= 1e9)  return sign + '$' + (abs/1e9).toFixed(1) + 'B';
    if (abs >= 1e6)  return sign + '$' + (abs/1e6).toFixed(1) + 'M';
    return sign + '$' + Math.round(abs).toLocaleString();
  };
  const chgColor = n => n > 0 ? '#00ff88' : n < 0 ? '#ff3355' : '#ffcc00';
  const chgSign  = n => n > 0 ? '+' : '';
  const fmtPct   = n => n == null ? '—' : (n > 0 ? '+' : '') + n.toFixed(2) + '%';

  const buildHTML = d => {
    const regimeColor = d.regime === 'EASING' ? '#00ff88' :
                        d.regime === 'SLIGHTLY EASING' ? '#88cc00' :
                        d.regime === 'SLIGHTLY TIGHTENING' ? '#ff8800' : '#ff3355';
    const isStatic = !d.fed_balance?.value || d.fed_balance?.source === 'static';

    const metricCard = (label, value, change, changePct, date, color, desc) => `
      <div class="panel" style="border-top:3px solid ${color};">
        <div style="font-family:'Orbitron',monospace;font-size:10px;letter-spacing:2px;color:${color};margin-bottom:8px;">${label}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:28px;font-weight:900;color:var(--text);margin-bottom:4px;">${fmtT(value)}</div>
        ${change != null ? `<div style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${chgColor(change)};">${chgSign(change)}${fmtT(change)} (${fmtPct(changePct)})</div>` : ''}
        <div style="font-size:11px;color:var(--text3);margin-top:4px;">${date || ''}</div>
        ${desc ? `<div style="font-size:12px;color:var(--text2);margin-top:6px;line-height:1.4;">${desc}</div>` : ''}
      </div>`;

    return `
      ${isStatic ? `<div style="background:rgba(255,51,85,0.1);border:1px solid rgba(255,51,85,0.4);border-radius:4px;padding:12px 14px;margin-bottom:10px;">
        <div style="font-family:'Orbitron',monospace;font-size:10px;letter-spacing:2px;color:#ff3355;margin-bottom:6px;">⚠ PLACEHOLDER DATA — NOT REAL</div>
        <div style="font-size:13px;color:var(--text2);line-height:1.6;">The numbers below are <strong style="color:#ff3355;">estimates I hardcoded</strong> — not live FRED data. The live feed from the Federal Reserve is not loading. All dollar figures are approximate and may be significantly wrong. Do not trade on this data.</div>
      </div>` : ''}

      <div class="panel" style="margin-bottom:10px;border-left:4px solid ${regimeColor};">
        <div style="display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:center;">
          <div>
            <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--text3);margin-bottom:6px;">LIQUIDITY REGIME</div>
            <div style="font-family:'Orbitron',monospace;font-size:24px;font-weight:900;color:${regimeColor};">${d.regime}</div>
          </div>
          <div style="font-size:14px;color:var(--text2);line-height:1.6;">${d.regime_desc}</div>
        </div>
      </div>

      ${d.net_liquidity ? `
      <div class="panel" style="margin-bottom:10px;background:rgba(0,204,255,0.04);border-color:rgba(0,204,255,0.3);">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center;">
          <div>
            <div style="font-family:'Orbitron',monospace;font-size:10px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">NET LIQUIDITY = FED BALANCE SHEET − RRP − TGA</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:42px;font-weight:900;color:${chgColor(d.net_liquidity.change_wow)};">${fmtT(d.net_liquidity.value)}</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:16px;color:${chgColor(d.net_liquidity.change_wow)};margin-top:6px;">${chgSign(d.net_liquidity.change_wow)}${fmtT(d.net_liquidity.change_wow)} this week</div>
          </div>
          <div style="font-size:13px;color:var(--text2);line-height:1.8;">
            <div>The single most important liquidity metric for stocks.</div>
            <div style="margin-top:8px;color:var(--text3);">Rising → more money chasing assets → stocks go up</div>
            <div style="color:var(--text3);">Falling → money drained from system → stocks face headwinds</div>
            <div style="margin-top:8px;color:var(--cyan);">Historically correlates strongly with SPY direction.</div>
          </div>
        </div>
      </div>` : ''}

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:10px;">
        ${metricCard('FED BALANCE SHEET', d.fed_balance?.value, d.fed_balance?.change_wow, d.fed_balance?.change_pct, d.fed_balance?.date, '#8855ff', 'Total Fed assets. Rising = QE/easing. Falling = QT/tightening.')}
        ${metricCard('REVERSE REPO (RRP)', d.rrp?.value, d.rrp?.change_wow, d.rrp?.change_pct, d.rrp?.date, '#ff8800', 'Cash parked at Fed overnight. Draining RRP = liquidity entering markets = bullish.')}
        ${metricCard('TREASURY GEN. ACCOUNT', d.tga?.value, d.tga?.change_wow, d.tga?.change_pct, d.tga?.date, '#ff3355', "Treasury's Fed account. Rising TGA drains liquidity. Falling TGA injects liquidity.")}
        ${metricCard('M2 MONEY SUPPLY', d.m2?.value, d.m2?.change_mom, d.m2?.change_pct, d.m2?.date, '#00ff88', 'Total money in circulation. Leads stocks by 6-12 months.')}
      </div>

      ${d.margin ? `
      <div class="panel">
        <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:12px;">⬡ FINRA MARGIN DEBT & LEVERAGE — ${d.margin.date}${d.margin.source==='static_fallback'?' (estimated)':''}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;text-align:center;">
            <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;color:#ff3355;margin-bottom:6px;">MARGIN DEBT</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:900;color:#ff3355;">${fmtT(d.margin.margin_debt)}</div>
            ${d.margin.change_mom != null ? `<div style="font-size:12px;color:${chgColor(d.margin.change_mom)};margin-top:4px;">${chgSign(d.margin.change_mom)}${fmtT(d.margin.change_mom)} M/M</div>` : ''}
          </div>
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;text-align:center;">
            <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;color:#00ff88;margin-bottom:6px;">FREE CREDIT (MARGIN ACCTS)</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:900;color:#00ff88;">${fmtT(d.margin.free_credit_margin)}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:4px;">Idle cash in margin accounts</div>
          </div>
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;text-align:center;">
            <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;color:#00ff88;margin-bottom:6px;">FREE CREDIT (CASH ACCTS)</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:900;color:#00ff88;">${fmtT(d.margin.free_credit_cash)}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:4px;">Idle cash in cash accounts</div>
          </div>
          <div style="background:var(--bg3);border:1px solid ${chgColor(d.margin.net_margin)}44;border-left:3px solid ${chgColor(d.margin.net_margin)};border-radius:3px;padding:12px;text-align:center;">
            <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;color:var(--text3);margin-bottom:6px;">NET LEVERAGE</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:900;color:${chgColor(d.margin.net_margin)};">${fmtT(d.margin.net_margin)}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:4px;">Debt minus all free credit</div>
          </div>
        </div>
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;">
          <div style="font-family:'Orbitron',monospace;font-size:10px;letter-spacing:1px;color:var(--text3);margin-bottom:8px;">WHAT MARGIN DEBT TELLS YOU</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;font-size:13px;color:var(--text2);">
            <div><span style="color:#ff3355;">■</span> <strong>Rising fast</strong> — market overleveraged, vulnerable to forced selling on any dip</div>
            <div><span style="color:#ffcc00;">■</span> <strong>Stable</strong> — healthy leverage, normal market conditions</div>
            <div><span style="color:#00ff88;">■</span> <strong>Falling fast</strong> — deleveraging underway, often marks capitulation bottoms</div>
          </div>
        </div>
      </div>` : ''}`;
  };
  // Static fallback — always shown immediately, replaced by live data if available
  const staticFallback = {
    regime: 'TIGHTENING',
    regime_desc: 'Fed QT ongoing. Balance sheet declining. RRP near zero — that liquidity buffer is gone. Net liquidity is falling, which historically creates headwinds for equities.',
    net_liquidity: { value: 5.61e12, change_wow: -23e9 },
    fed_balance: { value: 6.73e12, change_wow: -15e9, change_pct: -0.22, date: 'Mar 2026', source: 'static' },
    rrp: { value: 412e9, change_wow: -8e9, change_pct: -1.90, date: 'Mar 2026' },
    tga: { value: 823e9, change_wow: 16e9, change_pct: 1.98, date: 'Mar 2026' },
    m2: { value: 21.4e12, change_mom: 180e9, change_pct: 0.85, date: 'Feb 2026' },
    margin: { date: 'Feb 2026', margin_debt: 892.4e9, free_credit_margin: 178.3e9, free_credit_cash: 243.1e9, net_margin: 471e9, change_mom: 18.2e9, change_pct: 2.08, source: 'static_fallback' }
  };

  // Show static immediately
  el.innerHTML = buildHTML(staticFallback);

  // Then try to fetch live data and replace
  try {
    const r = await fetch('/liquidity?t=' + Date.now());
    if (r.ok) {
      const d = await r.json();
      if (d && (d.fed_balance || d.net_liquidity)) {
        el.innerHTML = buildHTML(d);
      }
    }
  } catch(e) {
    // Static fallback already showing, nothing to do
  }
}

// ─────────────────────────────────────────────
// AAII SENTIMENT
// ─────────────────────────────────────────────
async function loadAAII() {
  const el = $('aaiiPanel');
  if (!el) return;

  // Historical AAII data — 26 weeks (oldest first). Update weekly.
  const AAII_HISTORY = [
    {d:'Oct 8',  bull:37.7, neu:24.6, bear:37.7},
    {d:'Oct 15', bull:45.3, neu:22.2, bear:32.5},
    {d:'Oct 22', bull:43.8, neu:21.4, bear:34.8},
    {d:'Oct 29', bull:44.0, neu:19.1, bear:36.9},
    {d:'Nov 5',  bull:38.0, neu:25.8, bear:36.3},
    {d:'Nov 12', bull:31.6, neu:19.2, bear:49.1},
    {d:'Nov 19', bull:32.6, neu:23.9, bear:43.6},
    {d:'Nov 26', bull:32.0, neu:25.3, bear:42.7},
    {d:'Dec 3',  bull:44.3, neu:24.9, bear:30.8},
    {d:'Dec 10', bull:44.6, neu:24.8, bear:30.6},
    {d:'Dec 17', bull:44.1, neu:22.7, bear:33.2},
    {d:'Dec 24', bull:37.4, neu:27.8, bear:34.8},
    {d:'Dec 31', bull:42.0, neu:31.0, bear:27.0},
    {d:'Jan 7',  bull:42.5, neu:27.5, bear:30.0},
    {d:'Jan 14', bull:49.5, neu:22.3, bear:28.2},
    {d:'Jan 21', bull:43.2, neu:24.1, bear:32.7},
    {d:'Jan 28', bull:44.4, neu:24.8, bear:30.8},
    {d:'Feb 4',  bull:39.7, neu:31.3, bear:29.0},
    {d:'Feb 11', bull:38.5, neu:23.3, bear:38.1},
    {d:'Feb 18', bull:34.5, neu:28.5, bear:36.9},
    {d:'Feb 25', bull:33.2, neu:27.0, bear:39.8},
    {d:'Mar 4',  bull:33.1, neu:31.4, bear:35.5},
    {d:'Mar 11', bull:31.9, neu:21.7, bear:46.4},
    {d:'Mar 18', bull:30.4, neu:17.6, bear:52.0},
    {d:'Mar 25', bull:32.1, neu:18.1, bear:49.8},
    {d:'Apr 1',  bull:33.6, neu:15.0, bear:51.4},
    {d:'Apr 4',  bull:21.5, neu:26.3, bear:52.2},
  ];

  try {
    const r = await fetch('/sentiment?t='+Date.now());
    if (!r.ok) throw new Error('AAII fetch failed');
    const d = await r.json();

    // Validate — scraper sometimes grabs wrong numbers; require plausible sum and spread
    const rawBull = d.bullish, rawBear = d.bearish, rawNeu = d.neutral;
    const sum = (rawBull||0) + (rawBear||0) + (rawNeu||0);
    // Reject round numbers (60/20/20 type scrape failures) and historically impossible readings
    const isRound = rawBull % 10 === 0 && rawNeu % 10 === 0 && rawBear % 10 === 0;
    const dataValid = rawBull && rawBear && sum > 85 && sum < 115 && rawBull < 57 && rawBear < 75 && !isRound;

    const lastH = AAII_HISTORY[AAII_HISTORY.length-1];
    const bull = dataValid ? rawBull : lastH.bull;
    const bear = dataValid ? rawBear : lastH.bear;
    const neu  = dataValid ? rawNeu  : lastH.neu;
    const spread = bull - bear;
    const spreadColor = spread > 0 ? '#00ff88' : spread < 0 ? '#ff3355' : '#ffcc00';
    const avgBull = d.avg_bullish || 37.5, avgBear = d.avg_bearish || 31.0;
    const dateLabel = d.date ? new Date(d.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';

    el.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">'
      +'<div style="background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.3);border-radius:4px;padding:12px;text-align:center;">'
      +'<div style="font-family:\'Orbitron\',monospace;font-size:10px;color:#00ff88;margin-bottom:6px;letter-spacing:1px;">BULLISH</div>'
      +'<div style="font-family:\'Share Tech Mono\',monospace;font-size:32px;font-weight:bold;color:#00ff88">'+fmt(bull,1)+'%</div>'
      +'<div style="font-size:12px;color:var(--text3);margin-top:4px">avg '+avgBull+'%</div></div>'
      +'<div style="background:rgba(255,204,0,0.08);border:1px solid rgba(255,204,0,0.3);border-radius:4px;padding:12px;text-align:center;">'
      +'<div style="font-family:\'Orbitron\',monospace;font-size:10px;color:#ffcc00;margin-bottom:6px;letter-spacing:1px;">NEUTRAL</div>'
      +'<div style="font-family:\'Share Tech Mono\',monospace;font-size:32px;font-weight:bold;color:#ffcc00">'+fmt(neu,1)+'%</div>'
      +'<div style="font-size:12px;color:var(--text3);margin-top:4px">avg 31.5%</div></div>'
      +'<div style="background:rgba(255,51,85,0.08);border:1px solid rgba(255,51,85,0.3);border-radius:4px;padding:12px;text-align:center;">'
      +'<div style="font-family:\'Orbitron\',monospace;font-size:10px;color:#ff3355;margin-bottom:6px;letter-spacing:1px;">BEARISH</div>'
      +'<div style="font-family:\'Share Tech Mono\',monospace;font-size:32px;font-weight:bold;color:#ff3355">'+fmt(bear,1)+'%</div>'
      +'<div style="font-size:12px;color:var(--text3);margin-top:4px">avg '+avgBear+'%</div></div></div>'
      +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:12px;display:flex;justify-content:space-between;align-items:center;">'
      +'<div><div style="font-family:\'Orbitron\',monospace;font-size:10px;color:var(--text3);letter-spacing:1px;">BULL-BEAR SPREAD</div>'
      +'<div style="font-family:\'Share Tech Mono\',monospace;font-size:28px;font-weight:bold;color:'+spreadColor+'">'+(spread>0?'+':'')+fmt(spread,1)+'%</div></div>'
      +'<div style="text-align:right;"><div style="font-family:\'Orbitron\',monospace;font-size:10px;color:var(--text3);letter-spacing:1px;">SIGNAL</div>'
      +'<div style="font-family:\'Orbitron\',monospace;font-size:13px;letter-spacing:2px;color:'+spreadColor+';margin-top:4px;padding:4px 10px;background:'+spreadColor+'22;border:1px solid '+spreadColor+'44;border-radius:3px;">'
      +(spread < -20 ? 'CONTRARIAN BUY' : spread < -10 ? 'BEARISH EXTREME' : spread < 0 ? 'BEARISH' : spread > 20 ? 'CONTRARIAN SELL' : spread > 10 ? 'BULLISH EXTREME' : 'BULLISH')
      +'</div></div></div>'
      +'<div style="margin-top:8px;font-size:12px;color:var(--text3);text-align:center;">'
      +(dataValid&&dateLabel?'Week ending '+dateLabel+' · ':'Using cached data · ')
      +'AAII survey published weekly — extreme readings are contrarian signals'
      +(dataValid?'':' <span style="color:#ffcc00;">(live fetch invalid — showing last known good)</span>')
      +'</div>';

    // Append live reading if it's a newer date than last hardcoded entry
    const hist = AAII_HISTORY.slice();
    if (dataValid && dateLabel && dateLabel !== lastH.d) {
      hist.push({d: dateLabel, bull, neu, bear});
    } else if (dataValid) {
      hist[hist.length-1] = {d: lastH.d, bull, neu, bear};
    }
    renderAAIIChart(hist);

  } catch(e) {
    el.innerHTML = '<div class="no-data">AAII unavailable — '+e.message+'</div>';
    renderAAIIChart(AAII_HISTORY);
  }
}

function renderAAIIChart(data) {
  const el = $('aaiiChart');
  if (!el) return;
  const W = 800, H = 200, PAD = {t:10, r:20, b:30, l:36};
  const cW = W - PAD.l - PAD.r, cH = H - PAD.t - PAD.b;
  const n = data.length;
  const xStep = cW / (n - 1);
  const yScale = v => PAD.t + cH - (v / 60 * cH);

  const line = (key, color) => {
    const pts = data.map((d,i) => (PAD.l + i*xStep).toFixed(1)+','+yScale(d[key]).toFixed(1));
    return '<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linejoin="round"/>'
      +'<circle cx="'+(PAD.l+(n-1)*xStep).toFixed(1)+'" cy="'+yScale(data[n-1][key]).toFixed(1)+'" r="3" fill="'+color+'"/>';
  };

  // Grid lines at 20, 40, 60%
  const grid = [20,30,40,50,60].map(v=>{
    const y = yScale(v).toFixed(1);
    return '<line x1="'+PAD.l+'" x2="'+(PAD.l+cW)+'" y1="'+y+'" y2="'+y+'" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>'
      +'<text x="'+(PAD.l-4)+'" y="'+(parseFloat(y)+4)+'" text-anchor="end" font-size="9" fill="#9090c0">'+v+'%</text>';
  }).join('');

  // X labels — every 3rd
  const xlbls = data.map((d,i)=>{
    if(i % 3 !== 0 && i !== n-1) return '';
    const x = (PAD.l + i*xStep).toFixed(1);
    return '<text x="'+x+'" y="'+(H-4)+'" text-anchor="middle" font-size="8" fill="#9090c0">'+d.d+'</text>';
  }).join('');

  // 37.5% avg bull line
  const avgY = yScale(37.5).toFixed(1);
  const avgLine = '<line x1="'+PAD.l+'" x2="'+(PAD.l+cW)+'" y1="'+avgY+'" y2="'+avgY+'" stroke="rgba(0,255,136,0.2)" stroke-width="1" stroke-dasharray="4,3"/>';

  el.innerHTML = '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;display:block;">'
    + grid + avgLine
    + line('bull','#00ff88')
    + line('neu','#ffcc00')
    + line('bear','#ff3355')
    + xlbls
    + '<text x="'+(PAD.l+cW-2)+'" y="'+(yScale(data[n-1].bull)-6)+'" font-size="8" fill="#00ff88" text-anchor="end">BULL '+fmt(data[n-1].bull,1)+'%</text>'
    + '<text x="'+(PAD.l+cW-2)+'" y="'+(yScale(data[n-1].bear)+12)+'" font-size="8" fill="#ff3355" text-anchor="end">BEAR '+fmt(data[n-1].bear,1)+'%</text>'
    + '</svg>'
    + '<div style="display:flex;gap:16px;justify-content:center;margin-top:6px;font-size:11px;font-family:\'Share Tech Mono\',monospace;">'
    + '<span style="color:#00ff88;">⬤ Bullish</span><span style="color:#ffcc00;">⬤ Neutral</span><span style="color:#ff3355;">⬤ Bearish</span>'
    + '<span style="color:rgba(0,255,136,0.5);font-size:10px;">- - Bull avg 37.5%</span></div>';
}

// ─────────────────────────────────────────────
// COT REPORT
// ─────────────────────────────────────────────
async function loadCOT() {
  const el = $('cotPanel');
  if (!el) return;
  try {
    const r = await fetch('/cot');
    if (!r.ok) throw new Error('COT fetch failed');
    const d = await r.json();
    const fmtN = n => { if(n==null)return'—'; const a=Math.abs(n),s=n>=0?'+':'-'; return s+'$'+(a>=1e6?(a/1e6).toFixed(2)+'M':a>=1e3?(a/1e3).toFixed(0)+'K':Math.round(a)); };
    const fmtK = n => { if(n==null)return'—'; const a=Math.abs(n); return (a>=1e6?(a/1e6).toFixed(2)+'M':a>=1e3?(a/1e3).toFixed(0)+'K':Math.round(a)); };
    const clrN = n => n>0?'#00ff88':n<0?'#ff3355':'#ffcc00';
    const days = d.days_since_report;
    const freshnessColor = days==null?'var(--text3)':days<=7?'#00ff88':days<=14?'#ffcc00':'#ff3355';
    const freshnessLabel = days==null?'':days===0?'Updated today':days===1?'1 day ago':`${days} days ago`;

    // TFF groups
    const groups = [
      { label:'LEVERAGED MONEY / SPECULATORS', sublabel:'Hedge Funds & CTAs — fast money, most predictive signal',
        l:d.lev_l, s:d.lev_s, net:d.lev_net, chg:d.chg_lev_net, color:'#ff8800', key:'lev' },
      { label:'ASSET MANAGER', sublabel:'Pensions / Mutual Funds — institutional conviction',
        l:d.asset_l, s:d.asset_s, net:d.asset_net, chg:d.chg_asset_net, color:'#00ccff', key:'asset' },
      { label:'DEALER / INTERMEDIARY', sublabel:'Banks / Prime Brokers — typically short as hedge',
        l:d.dealer_l, s:d.dealer_s, net:d.dealer_net, chg:d.chg_dealer_net, color:'#8855ff', key:'dealer' },
      { label:'NON-REPORTABLE', sublabel:'Small traders / retail',
        l:d.nonrept_l, s:d.nonrept_s, net:d.nonrept_net, chg:null, color:'#606080', key:'nr' },
    ];

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text3);">
          Report: <span style="color:var(--text2);">${d.report_date||d.date||'—'}</span>
          ${d.stale?'<span style="color:#ffcc00;margin-left:6px;">(CACHED)</span>':''}
          · OI: <span style="color:var(--text2);">${fmtK(d.oi)}</span>
        </div>
        <span style="color:${freshnessColor};font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;">${freshnessLabel}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        ${groups.map(g => `
          <div style="background:var(--bg3);border:1px solid var(--border);border-left:3px solid ${g.color};border-radius:4px;padding:10px;">
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:${g.color};letter-spacing:1px;margin-bottom:2px;">${g.label}</div>
            <div style="font-size:10px;color:var(--text3);margin-bottom:6px;">${g.sublabel}</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:bold;color:${clrN(g.net)}">${fmtN(g.net)}</div>
            <div style="display:flex;gap:10px;margin-top:5px;font-size:11px;">
              <span style="color:#00ff88">▲ ${fmtK(g.l)}</span>
              <span style="color:#ff3355">▼ ${fmtK(g.s)}</span>
              ${g.chg!=null?`<span style="color:${clrN(g.chg)};margin-left:4px;">W/W ${fmtN(g.chg)}</span>`:''}
            </div>
          </div>`).join('')}
      </div>
      <div style="margin-top:8px;font-size:10px;color:var(--text3);text-align:center;">
        TFF Report · S&P 500 Consolidated · CFTC · Released Fridays
      </div>`;

    loadCOTHistory();
  } catch(e) {
    el.innerHTML = `<div class="no-data">COT unavailable — ${e.message}</div>`;
  }
}

async function loadCOTHistory() {
  const el = $('cotHistoryChart');
  if (!el) return;
  try {
    const r = await fetch('/cot?history=1');
    if (!r.ok) throw new Error('fetch failed');
    const d = await r.json();
    const hist = d.history || [];
    if (!hist.length) { el.innerHTML = '<div class="no-data" style="padding:12px;">COT history unavailable</div>'; return; }
    renderCOTChart(el, hist);
  } catch(e) {
    el.innerHTML = `<div class="no-data" style="padding:12px;">COT history: ${e.message}</div>`;
  }
}

function renderCOTChart(el, hist) {
  const n = hist.length;
  const W = 960, H = 220, PAD = {t:16, r:60, b:28, l:72};
  const cW = W-PAD.l-PAD.r, cH = H-PAD.t-PAD.b;

  const series = [
    { key:'asset_net',  label:'Asset Manager / Institutional', color:'#00ccff', width:1.5, dash:'6,3' },
    { key:'lev_net',    label:'Leveraged Money / Speculators',  color:'#ff8800', width:2.5, dash:'' },
    { key:'dealer_net', label:'Dealer / Intermediary',          color:'#8855ff', width:1.5, dash:'' },
  ];

  // Scale Y axis to lev+dealer range (asset mgr is always large long and distorts scale)
  // Asset mgr still drawn but may clip at top — that's fine, it's the least actionable line
  const scalingVals = hist.flatMap(h => [h.lev_net||0, h.dealer_net||0]);
  const allVals     = hist.flatMap(h => series.map(s => h[s.key]||0));
  const minV = Math.min(...scalingVals), maxV = Math.max(...scalingVals);
  const padV = (maxV-minV)*0.15;
  const lo = minV-padV, hi = maxV+padV;

  const toX = i => PAD.l + (i/Math.max(n-1,1))*cW;
  const toY = v => PAD.t + cH - ((v-lo)/(hi-lo))*cH;
  const fmtV = v => {
    const a=Math.abs(v), s=v>=0?'+':'-';
    return s+'$'+(a>=1e6?(a/1e6).toFixed(2)+'M':a>=1e3?(a/1e3).toFixed(0)+'K':Math.round(a));
  };

  // Zero line
  const zY = toY(0).toFixed(1);
  const zeroLine = `<line x1="${PAD.l}" x2="${PAD.l+cW}" y1="${zY}" y2="${zY}" stroke="rgba(255,255,255,0.25)" stroke-width="1" stroke-dasharray="5,4"/>
    <text x="${PAD.l-5}" y="${parseFloat(zY)+4}" text-anchor="end" font-size="9" fill="#909090" font-family="Share Tech Mono,monospace">0</text>`;

  // Grid — pick ~4 clean rounded levels, skip if too close to zero line
  const range = hi - lo;
  const rawStep = range / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep)||1)));
  const gStep = Math.round(rawStep/mag)*mag || mag;
  let grid = '';
  for (let v = Math.ceil(lo/gStep)*gStep; v <= hi; v += gStep) {
    if (Math.abs(v) < gStep*0.3) continue; // skip near-zero duplicates
    const y = toY(v).toFixed(1);
    if (parseFloat(y) < PAD.t || parseFloat(y) > PAD.t+cH) continue;
    grid += `<line x1="${PAD.l}" x2="${PAD.l+cW}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
      <text x="${PAD.l-5}" y="${parseFloat(y)+4}" text-anchor="end" font-size="9" fill="#606080" font-family="Share Tech Mono,monospace">${fmtV(v)}</text>`;
  }

  // Subtle zero-band shading (just a thin stripe, not full fill)
  const bandH = Math.max(2, Math.abs(toY(-gStep*0.15)-toY(gStep*0.15)));
  const zeroBand = `<rect x="${PAD.l}" y="${parseFloat(zY)-1}" width="${cW}" height="2" fill="rgba(255,255,255,0.08)"/>`;

  // Lines (with optional dash pattern)
  const polyline = (key, color, w, dash='') => {
    const pts = hist.map((h,i) => `${toX(i).toFixed(1)},${toY(h[key]||0).toFixed(1)}`).join(' ');
    const dashAttr = dash ? `stroke-dasharray="${dash}"` : '';
    return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${dashAttr} clip-path="url(#cotClip)"/>`;
  };

  // End-of-line labels on right side
  const endLabels = series.map(s => {
    const v = hist[n-1][s.key]||0;
    const x = toX(n-1), y = toY(v);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${s.color}" stroke="#0a0a12" stroke-width="1.5"/>
      <text x="${(x+10).toFixed(1)}" y="${(y+4).toFixed(1)}" font-size="9" fill="${s.color}" font-family="Share Tech Mono,monospace" font-weight="bold">${fmtV(v)}</text>`;
  }).join('');

  // X axis labels — month/year marks
  const step = Math.max(1, Math.floor(n/10));
  let xlbls = '';
  hist.forEach((h,i) => {
    if (i%step!==0 && i!==n-1) return;
    const label = (h.date||'').slice(2,7).replace('-','/');
    xlbls += `<text x="${toX(i).toFixed(1)}" y="${H-6}" text-anchor="middle" font-size="8" fill="#505070" font-family="Share Tech Mono,monospace">${label}</text>`;
  });

  el.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;border-radius:4px;">
      <defs>
        <clipPath id="cotClip">
          <rect x="${PAD.l}" y="${PAD.t}" width="${cW}" height="${cH}"/>
        </clipPath>
      </defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="#08080f" rx="4"/>
      <rect x="${PAD.l}" y="${PAD.t}" width="${cW}" height="${cH}" fill="#0a0a14"/>
      ${grid}${zeroLine}${zeroBand}
      ${series.map(s => polyline(s.key, s.color, s.width, s.dash)).join('')}
      ${endLabels}${xlbls}
    </svg>
    <div style="display:flex;gap:24px;justify-content:center;flex-wrap:wrap;margin-top:8px;font-size:10px;font-family:'Share Tech Mono',monospace;">
      <span style="color:#ff8800;">━━ Leveraged Money / Speculators (Hedge Funds): <b>${fmtV(hist[n-1].lev_net||0)}</b></span>
      <span style="color:#8855ff;">━━ Dealer / Intermediary (Banks): <b>${fmtV(hist[n-1].dealer_net||0)}</b></span>
      <span style="color:#00ccff;opacity:0.7;">╌╌ Asset Manager (Institutions): <b>${fmtV(hist[n-1].asset_net||0)}</b></span>
    </div>
    <div style="text-align:center;font-size:10px;color:var(--text3);margin-top:3px;">
      Y-axis scaled to Lev Money + Dealer range · Asset Mgr line may clip (always large net long) · ${n} weeks · TFF Report
    </div>`;
}

// All symbols to fetch live
const LIVE_SYMBOLS = [
  // Core
  'SPY','QQQ','IWM','DIA','VXX','RSP',
  // Indices (needed for ratios)
  '^GSPC','ES=F',
  // MAG7
  'AAPL','MSFT','GOOGL','AMZN','NVDA','META','TSLA',
  // Sectors (11)
  'XLK','XLF','XLE','XLV','XLI','XLY','XLP','XLB','XLRE','XLU','XLC',
  // Sub-sectors
  'SMH','XBI','KRE','XRT','ITB','XOP','GDX','ARKK','XHB',
  // Commodities
  'GC=F','SI=F','CL=F','NG=F','HG=F',
  // Crypto
  'BTC-USD','ETH-USD',
  // FX/Macro
  'DX-Y.NYB',
  // Bonds
  '^TNX','^IRX','^TYX','^FVX','TLT','IEF','SHY','HYG','LQD','JNK',
  // Volatility
  '^VIX','^VIX3M','^VIX6M','^VVIX','^SKEW',
  // Breadth
  '^ADVN','^DECN','^NYA','^NYHGH','^NYLOW'
];

// Fetch live quotes — primary: our own /quotes Cloudflare function (server-side, no CORS)
// Fallbacks: Yahoo direct, then third-party CORS proxies
async function fetchLiveQuotes(symbols) {
  const chunk = symbols.join(',');
  const yahooFields = 'regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,regularMarketPreviousClose';
  const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(chunk)}&fields=${yahooFields}`;

  // Primary: our own Cloudflare function — server-side, no CORS issues
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8000); // 8s timeout
    const r = await fetch(`/quotes?symbols=${encodeURIComponent(chunk)}`, {
      headers: { 'Accept': 'application/json' },
      signal: ctrl.signal
    });
    clearTimeout(tid);
    if (r.ok) {
      const data = await r.json();
      if (data.quotes && Object.keys(data.quotes).length > 0) return data.quotes;
    }
  } catch(e) { /* CF function not deployed yet or timed out — fall through */ }

  // Fallback 1: Yahoo direct (blocked by CORS in most browsers — expected)
  try {
    const r = await fetch(yahooUrl, { headers: { 'Accept': 'application/json' } });
    if (r.ok) {
      const data = await r.json();
      const q = parseYahooQuotes(data);
      if (q && Object.keys(q).length > 0) return q;
    }
  } catch(e) { /* CORS blocked — expected, falling through to proxy */ }

  // Fallback 2: allorigins CORS proxy
  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;
    const r = await fetch(proxy);
    const wrapper = await r.json();
    const data = JSON.parse(wrapper.contents);
    const q = parseYahooQuotes(data);
    if (q && Object.keys(q).length > 0) return q;
  } catch(e) {}

  // Fallback 3: corsproxy.io
  try {
    const proxy2 = `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`;
    const r = await fetch(proxy2);
    const data = await r.json();
    return parseYahooQuotes(data);
  } catch(e) {}

  return null;
}

function parseYahooQuotes(data) {
  const results = data?.quoteResponse?.result || [];
  const quotes = {};
  results.forEach(q => {
    quotes[q.symbol] = {
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      pct_change: q.regularMarketChangePercent,
      volume: q.regularMarketVolume,
      open: q.regularMarketOpen,
      high: q.regularMarketDayHigh,
      low: q.regularMarketDayLow,
      prev_close: q.regularMarketPreviousClose
    };
  });
  return quotes;
}

// Fetch SPY intraday OHLC via Cloudflare function
async function fetchSPYIntraday() {
  try {
    const r = await fetch('/spyintraday');
    if (r.ok) {
      const d = await r.json();
      // Always return the response — callers check d.available themselves.
      // Checking d.open here meant pre-market responses (available:false, no open)
      // were silently dropped, preventing the volume panel from updating.
      if (d) return d;
    }
  } catch(e) {}
  return null;
}

// Compute today's HVN from live intraday bars and inject into desk
async function updateLiveHVN(spyData) {
  const el = $('deskHvnLive');
  if (!el) return;
  // spyintraday gives us OHLCV but not per-bar. We can show a placeholder
  // showing today's session high-volume price estimate (use mid of day range as proxy)
  if (!spyData?.available) return;
  const { open, high, low, close, volume } = spyData;
  if (!open || !high || !low) return;
  // Simple HVN estimate: price with most activity is near VWAP which we approximate
  // as the midpoint weighted toward close (since we don't have per-bar data here)
  const hvnEst = close || ((high + low + open) / 3);
  const todayStr = new Date().toISOString().split('T')[0];
  const grid = $('deskHvnGrid');
  // If today already has a card in the grid, don't add
  if (grid && grid.innerHTML.includes(todayStr.slice(5))) return;
  const cur3 = parseFloat(close || 0);
  const dist = hvnEst && cur3 ? cur3 - hvnEst : null;
  const dc = dist > 0 ? '#00ff88' : dist < 0 ? '#ff3355' : 'var(--text2)';
  const d = new Date();
  const dayLabel = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
  el.innerHTML = `
    <div style="background:var(--bg3);border:1px solid var(--cyan);border-radius:3px;padding:10px;text-align:center;margin-bottom:8px;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--cyan);margin-bottom:4px;">${dayLabel} TODAY (LIVE)</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:18px;font-weight:bold;color:var(--cyan);">$${fmt(hvnEst,2)}</div>
      <div style="font-size:10px;color:var(--text3);margin-top:2px;">Session mid est · Vol: ${fmtK(volume||0)}</div>
    </div>`;
}

// Fetch live Fear & Greed via Cloudflare function
async function fetchLiveFG() {
  try {
    const r = await fetch('/fg');
    if (r.ok) {
      const d = await r.json();
      if (d.value) return { value: d.value, label: d.label };
    }
  } catch(e) {}
  return null;
}

// Live update indicator in top bar
function setLiveStatus(status, time) {
  // existing status indicators (topbar live dot etc.)
  const dot = document.querySelector('.live-dot');
  if (dot) {
    dot.style.background = status === 'live' ? 'var(--green)' : status === 'updating' ? 'var(--yellow)' : 'var(--red)';
  }
  // Update Trading Desk timestamp strip
  updateDeskTimestamp(status, time);
}

// Fix 4: Update the Trading Desk last-updated bar
function updateDeskTimestamp(status, liveTime) {
  const el = document.getElementById('deskUpdateBar');
  if (!el) return;
  const interval = isMarketOpen() ? '15s' : '60s';
  const statusColor = status === 'live' ? '#00ff88' : status === 'updating' ? '#ffcc00' : '#ff3355';
  const statusLabel = status === 'live' ? '● LIVE' : status === 'updating' ? '⟳ UPDATING' : '✕ OFFLINE';
  const staticLabel = _lastStaticRefresh
    ? new Date(_lastStaticRefresh).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Chicago' }) + ' CT'
    : 'pending';
  el.innerHTML = `
    <span style="color:${statusColor};font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;">${statusLabel}</span>
    <span style="color:var(--border2);">·</span>
    <span style="color:var(--text3);">QUOTES</span>
    <span style="color:var(--text2);">${liveTime || '—'}</span>
    <span style="color:var(--border2);">·</span>
    <span style="color:var(--text3);">INTERVAL</span>
    <span style="color:var(--cyan);">${interval}</span>
    <span style="color:var(--border2);">·</span>
    <span style="color:var(--text3);">STATIC DATA</span>
    <span style="color:var(--text2);">${staticLabel}</span>
    <span style="color:var(--border2);">·</span>
    <span style="color:var(--text3);">STATIC REFRESH</span>
    <span style="color:var(--cyan);">15 MIN</span>
  `;
}

function updateStaticTimestamp() {
  updateDeskTimestamp('live', _lastLiveSuccess
    ? _lastLiveSuccess.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Chicago' }) + ' CT'
    : '—');
}

// Live-patch the key price level bar on every quote tick
function updateLevelBar(price) {
  const el = document.getElementById('deskLevelBar');
  if (!el || !price) return;
  const lv = window._spyLevels;
  if (!lv) return;

  // Update stored current price
  lv.cur = price;

  const fmt2 = n => n == null ? '—' : '$' + Number(n).toFixed(2);
  const dist = (level) => {
    if (level == null || !price) return { d: null, p: null };
    return { d: price - level, p: (price - level) / level * 100 };
  };
  const sign = n => n >= 0 ? '+' : '';

  const levels = [
    { lbl: 'ALL-TIME HIGH', sub: fmt2(lv.SPY_ATH),         lvl: lv.SPY_ATH,        accent: '#ff8800' },
    { lbl: '-10% FROM ATH', sub: fmt2(lv.ath10),           lvl: lv.ath10,           accent: '#ffcc00' },
    { lbl: '-20% FROM ATH', sub: fmt2(lv.ath20),           lvl: lv.ath20,           accent: '#ff3355' },
    { lbl: 'PREV WK CLOSE', sub: fmt2(lv.prevWeekClose),   lvl: lv.prevWeekClose,   accent: '#00ccff' },
    { lbl: 'CUR WK OPEN',   sub: fmt2(lv.weekOpen),        lvl: lv.weekOpen,        accent: '#00ccff' },
    { lbl: 'PREV MO CLOSE', sub: fmt2(lv.prevMonthClose),  lvl: lv.prevMonthClose,  accent: '#8855ff' },
    { lbl: 'PREV YR CLOSE', sub: fmt2(lv.prevYearClose),   lvl: lv.prevYearClose,   accent: '#8855ff' },
    { lbl: 'CUR YR OPEN',   sub: fmt2(lv.yearOpen),        lvl: lv.yearOpen,        accent: '#8855ff' },
  ];

  // Also patch live CHG/OPEN cell in price panel on every tick
  const chgOpenEl = document.getElementById('deskChgOpen');
  if (chgOpenEl) {
    const todayOpenLive = window._spyLevels?.todayOpen || 0;
    const chgFromOpen = price && todayOpenLive ? price - todayOpenLive : null;
    const chgFromOpenPct = chgFromOpen && todayOpenLive ? chgFromOpen / todayOpenLive * 100 : null;
    const cc2 = n => n >= 0 ? '#00ff88' : '#ff3355';
    const cs2 = n => n >= 0 ? '+' : '';
    if (chgFromOpen != null) {
      chgOpenEl.style.color = cc2(chgFromOpen);
      chgOpenEl.innerHTML = `<div style="font-family:'Share Tech Mono',monospace;font-size:12px;font-weight:bold;">${cs2(chgFromOpen)}${chgFromOpen.toFixed(2)}</div><div style="font-size:10px;">${cs2(chgFromOpenPct)}${chgFromOpenPct.toFixed(2)}%</div>`;
    }
  }

  el.innerHTML = levels.map(({ lbl, sub, lvl, accent }) => {
    const { d, p } = dist(lvl);
    const abv = d != null && d >= 0;
    const dc  = d == null ? 'var(--text3)' : abv ? '#00ff88' : '#ff3355';
    const distLine = d != null
      ? `<div style="color:${dc};font-size:11px;margin-top:2px;">${sign(d)}$${Math.abs(d).toFixed(2)}</div>
         <div style="color:${dc};font-size:10px;">${sign(p)}${Math.abs(p).toFixed(2)}%</div>`
      : `<div style="color:var(--text3);font-size:11px;">—</div>`;
    return `<div style="padding:7px 8px;background:var(--bg2);text-align:center;border-right:1px solid var(--border);">
      <div style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:0.5px;color:${accent};margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${lbl}</div>
      <div style="font-size:12px;font-weight:bold;color:var(--text2);">${sub}</div>
      ${distLine}
    </div>`;
  }).join('');
}

// Merge live quotes into market data object
function mergeLiveData(md, liveQuotes, liveFG) {
  const merged = JSON.parse(JSON.stringify(md)); // deep clone
  if (liveQuotes) {
    merged.quotes = merged.quotes || {};
    Object.assign(merged.quotes, liveQuotes);
  }
  if (liveFG) merged.fear_greed = liveFG;
  merged.updated = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Chicago' }) + ' CT';
  // Keep todayOpen in _spyLevels current so CHG/OPEN cell stays accurate
  if (window._spyLevels && merged.quotes?.['SPY']?.open) {
    window._spyLevels.todayOpen = merged.quotes['SPY'].open;
  }
  return merged;
}

// Live refresh — 15s during market hours, 60s otherwise
let _liveInterval = null;
let _lastLiveSuccess = null;
let _lastStaticRefresh = null; // tracks when market_data.json was last re-fetched

// Returns true if US equities market is currently open (ET, weekdays 9:30–16:00)
function isMarketOpen() {
  const et = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const dow = et.getDay();
  if (dow === 0 || dow === 6) return false;
  const mins = et.getHours() * 60 + et.getMinutes();
  return mins >= 9 * 60 + 30 && mins < 16 * 60;
}

// Returns true if pre-market or market hours (4 AM–4 PM ET weekdays)
function isExtendedHours() {
  const et = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const dow = et.getDay();
  if (dow === 0 || dow === 6) return false;
  const mins = et.getHours() * 60 + et.getMinutes();
  return mins >= 4 * 60 && mins < 16 * 60;
}

// Fetch and cache the current week's opening price (Monday open, or first trading day)
// Sources tried in order: intraday (if Mon), market_data weekly_em, _sd rows, /quotes
async function fetchWeekOpen() {
  try {
    const pad = n => String(n).padStart(2, '0');
    const ctNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    const dow = ctNow.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const daysFromMon = dow === 0 ? 6 : dow - 1;
    const monCT = new Date(ctNow);
    monCT.setDate(ctNow.getDate() - daysFromMon);
    const monStr = `${monCT.getFullYear()}-${pad(monCT.getMonth()+1)}-${pad(monCT.getDate())}`;

    const applyWeekOpen = (val) => {
      if (!val || isNaN(val)) return false;
      window._spyWeekOpen = val;
      if (window._spyLevels) {
        window._spyLevels.weekOpen = val;
        updateLevelBar(window._spyLevels?.cur);
      }
      try { localStorage.setItem('spy_week_open_v2', JSON.stringify({ monStr, weekOpen: val })); } catch(e) {}
      return true;
    };

    // ── Check localStorage cache first ──────────────────────────────────────
    try {
      const cached = JSON.parse(localStorage.getItem('spy_week_open_v2') || 'null');
      if (cached && cached.monStr === monStr && cached.weekOpen) {
        applyWeekOpen(cached.weekOpen);
        if (!isWeekend && dow !== 1) return; // Tue-Fri: cache is good enough
      }
    } catch(e) {}

    // ── Source 1: /weekopen — server-side Yahoo fetch, works any day ─────────
    try {
      const r = await fetch('/weekopen?t=' + Date.now());
      if (r.ok) {
        const d = await r.json();
        if (d.available && d.weekOpen) {
          if (applyWeekOpen(d.weekOpen)) return;
        }
      }
    } catch(e) { console.warn('[fetchWeekOpen] /weekopen failed:', e.message); }

    // ── Source 2: market_data.json weekly_em week_open ───────────────────────
    if (_md) {
      const wems = _md.weekly_em || [];
      const curWem = wems.find(w => !w.week_close) || wems[0];
      if (curWem && curWem.week_open) {
        if (applyWeekOpen(curWem.week_open)) return;
      }
    }

    // ── Source 3: _sd daily data — first trading day of this week ───────────
    if (_sd && _sd.length) {
      const ctTodayStr = `${ctNow.getFullYear()}-${pad(ctNow.getMonth()+1)}-${pad(ctNow.getDate())}`;
      const weekRows = _sd.filter(r => r.date >= monStr && r.date <= ctTodayStr);
      const firstDay = weekRows.length ? weekRows[weekRows.length - 1] : null;
      if (firstDay && firstDay.open) {
        if (applyWeekOpen(firstDay.open)) return;
      }
    }

    // ── Source 4: /spyintraday on Monday only ────────────────────────────────
    if (!isWeekend && dow === 1) {
      try {
        const r = await fetch('/spyintraday?t=' + Date.now());
        if (r.ok) {
          const d = await r.json();
          if (d.available && d.open) {
            if (window._spyLevels) window._spyLevels.todayOpen = d.open;
            applyWeekOpen(d.open);
          }
        }
      } catch(e) {}
    }

  } catch(e) { console.warn('fetchWeekOpen error:', e); }
}

// Schedules the next live-quote refresh at the appropriate interval
function scheduleLiveRefresh() {
  if (_liveInterval) clearTimeout(_liveInterval);
  const delay = isMarketOpen() ? 15000 : 60000;
  _liveInterval = setTimeout(async () => {
    await refreshLiveData();
    scheduleLiveRefresh(); // reschedule after each cycle
  }, delay);
}

// Lightweight WEM price update — runs every tick without rebuilding heavy SVG charts
function updateWEMPrice(price) {
  if (!price || !_md) return;
  const wems = _md.weekly_em || [];
  const cur  = wems.find(w => !w.week_close) || wems[0];
  if (!cur) return;
  const lo = cur.wem_low, hi = cur.wem_high, mid = cur.wem_mid;
  const halfRange = cur.wem_range / 2;
  if (!lo || !hi || !mid) return;

  // Needle position
  const pct = hi > lo ? Math.min(Math.max((price - lo) / (hi - lo) * 100, 2), 98) : 50;
  const needle = $('wemTabNeedle');
  if (needle) needle.style.left = pct + '%';
  const nlbl = $('wemTabNeedleLabel'); if(nlbl) nlbl.textContent = '$'+fmt(price,2);

  // Position text
  const posText = $('wemTabPosText');
  if (posText) {
    const dte = cur.dte || '—';
    posText.textContent = `SPY $${fmt(price,2)} · ${price>=lo&&price<=hi?'INSIDE WEM ✓':'OUTSIDE WEM ⚠'} · ±$${fmt(halfRange,2)} · DTE ${dte}`;
  }

  // Big cards — "from here" distances
  const header = $('wemCurrentHeader');
  if (header) {
    header.innerHTML = `
      <div class="wem-big-card">
        <div class="wem-big-lbl">WEM LOW</div>
        <div class="wem-big-val dn">$${fmt(lo,2)}</div>
        <div class="wem-big-sub">${price>lo?'+':''}$${fmt(price-lo,2)} from here</div>
      </div>
      <div class="wem-big-card">
        <div class="wem-big-lbl">MID (ANCHOR)</div>
        <div class="wem-big-val">$${fmt(mid,2)}</div>
        <div class="wem-big-sub">±$${fmt(halfRange,2)} range</div>
      </div>
      <div class="wem-big-card">
        <div class="wem-big-lbl">WEM HIGH</div>
        <div class="wem-big-val up">$${fmt(hi,2)}</div>
        <div class="wem-big-sub">${price<hi?'+':''}$${fmt(hi-price,2)} from here</div>
      </div>`;
  }

  // Z-score thermometer + bell curve — re-render fully if WEM tab is visible
  const wemPanel = $('panel-wem');
  if (wemPanel && wemPanel.classList.contains('active') && _md) {
    try { renderWEM(_md); } catch(e) {}
    return; // renderWEM already updated needle/header/posText above
  }
}


async function refreshLiveData() {
  if (!_md) return;
  setLiveStatus('updating');

  // Fix 3: Re-fetch market_data.json every 15 min to pick up workflow updates
  const now = Date.now();
  const staticRefreshInterval = 15 * 60 * 1000;
  if (!_lastStaticRefresh || now - _lastStaticRefresh > staticRefreshInterval) {
    try {
      const [freshMd, freshSd] = await Promise.all([
        fetch('market_data.json?t=' + now).then(r => r.json()),
        fetch('spy_data.json?t=' + now).then(r => r.json()).catch(() => null)
      ]);
      if (freshMd) {
        // Preserve any live patches already on _md (quotes, gex, fear_greed)
        freshMd.quotes = _md.quotes;
        freshMd.fear_greed = _md.fear_greed;
        if (_md.gex?.flip_point) freshMd.gex = _md.gex;
        if (_md.max_pain?.length) freshMd.max_pain = _md.max_pain;
        _md = freshMd;
      }
      if (freshSd && freshSd.length) _sd = freshSd;
      _lastStaticRefresh = now;
      updateStaticTimestamp();
      fetchWeekOpen(); // refresh week open from fresh sd data
      // Re-render WEM fully on static refresh — WEM levels and IV can change
      try { renderWEM(_md); } catch(e) {}
    } catch(e) {
      console.warn('Static JSON re-fetch failed:', e);
    }
  }

  try {
    const [liveQuotes, liveFG, spyOHLC] = await Promise.all([
      fetchLiveQuotes(LIVE_SYMBOLS),
      fetchLiveFG(),
      fetchSPYIntraday()
    ]);

    // Even if full quote fetch fails, spyOHLC gives us SPY price from /spyintraday
    // Build a minimal quotes object from intraday data so desk always updates
    let effectiveQuotes = liveQuotes;
    if ((!liveQuotes || Object.keys(liveQuotes).length === 0) && spyOHLC?.available) {
      effectiveQuotes = {
        'SPY': {
          price:      spyOHLC.close,
          change:     spyOHLC.change,
          pct_change: spyOHLC.changePct,
          volume:     spyOHLC.volume,
          open:       spyOHLC.open,
          high:       spyOHLC.high,
          low:        spyOHLC.low,
          prev_close: spyOHLC.prev_close,
        }
      };
      console.log('Using spyOHLC as quote fallback, SPY:', spyOHLC.close);
    }
    
    // Always patch SPY from spyOHLC first — this is the most accurate source
    // (Cloudflare function hitting Yahoo v8 chart, 1-min bars, no CORS issues)
    if (spyOHLC?.available) {
      _spyIntraday = spyOHLC;
      saveIntradayCache(spyOHLC);
      _md.quotes = _md.quotes || {};
      _md.quotes['SPY'] = _md.quotes['SPY'] || {};
      // Override all SPY fields with live intraday data
      _md.quotes['SPY'].price      = spyOHLC.close;
      _md.quotes['SPY'].open       = spyOHLC.open;
      _md.quotes['SPY'].high       = spyOHLC.high;
      _md.quotes['SPY'].low        = spyOHLC.low;
      _md.quotes['SPY'].volume     = spyOHLC.volume;
      _md.quotes['SPY'].prev_close = spyOHLC.prev_close;
      _md.quotes['SPY'].change     = spyOHLC.change;
      _md.quotes['SPY'].pct_change = spyOHLC.changePct;
    }

    if (effectiveQuotes && Object.keys(effectiveQuotes).length > 0) {
      // swap liveQuotes reference so rest of code works unchanged
      const liveQuotes = effectiveQuotes;
      const merged = mergeLiveData(_md, liveQuotes, liveFG);
      // Re-apply spyOHLC on top of merged quotes — liveQuotes may have overwritten with stale data
      if (spyOHLC?.available && merged.quotes['SPY']) {
        merged.quotes['SPY'].price      = spyOHLC.close;
        merged.quotes['SPY'].open       = spyOHLC.open;
        merged.quotes['SPY'].high       = spyOHLC.high;
        merged.quotes['SPY'].low        = spyOHLC.low;
        merged.quotes['SPY'].volume     = spyOHLC.volume;
        merged.quotes['SPY'].prev_close = spyOHLC.prev_close;
        merged.quotes['SPY'].change     = spyOHLC.change;
        merged.quotes['SPY'].pct_change = spyOHLC.changePct;
      }
      _md = merged;
      
      // Re-render all live-data-dependent tabs
      renderHub(merged, _sd);
      renderDesk(merged, _sd);
      updateLevelBar(merged.quotes?.['SPY']?.price);
      updateWEMPrice(merged.quotes?.['SPY']?.price);
      renderOverview(merged);
      loadFuturesChart();

      renderVolatility(merged);
      renderBreadth(merged, _sd);
      renderSentiment(merged);
      runPatternAlerts(merged, _sd);
      renderGEX(merged);
      
      _lastLiveSuccess = new Date();
      setLiveStatus('live', _lastLiveSuccess.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Chicago' }) + ' CT');
    } else if (spyOHLC?.available) {
      // Quotes fetch failed but we have live SPY intraday — render with that
      renderHub(_md, _sd);
      renderDesk(_md, _sd);
      updateLevelBar(_md.quotes?.['SPY']?.price);
      updateWEMPrice(_md.quotes?.['SPY']?.price);
      _lastLiveSuccess = new Date();
      setLiveStatus('live', _lastLiveSuccess.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Chicago' }) + ' CT (SPY only)');
    } else {
      setLiveStatus('offline', 'fetch failed');
    }
  } catch(e) {
    console.error('Live refresh error:', e);
    setLiveStatus('offline', 'error');
  }
}

async function fetchLiveGEX() {
  try {
    const r = await fetch('/gex');
    if (!r.ok) return null;
    const d = await r.json();
    if (d.error) return null;
    return d;
  } catch(e) { return null; }
}

// ─────────────────────────────────────────────
// MAIN LOAD
// ─────────────────────────────────────────────
async function loadData(){
  try{
    // Fetch static data + live OHLC + F&G + live GEX all at once
    const [md, sd, spyOHLC, liveFG, liveGEX] = await Promise.all([
      fetch('market_data.json?t='+Date.now()).then(r=>r.json()),
      fetch('spy_data.json?t='+Date.now()).then(r=>r.json()).catch(()=>[]),
      fetchSPYIntraday(),
      fetchLiveFG(),
      fetchLiveGEX()
    ]);

    // Patch SPY quotes with real intraday OHLC immediately
    if (spyOHLC && spyOHLC.available && md.quotes && md.quotes['SPY']) {
      md.quotes['SPY'].open       = spyOHLC.open       || md.quotes['SPY'].open;
      md.quotes['SPY'].high       = spyOHLC.high       || md.quotes['SPY'].high;
      md.quotes['SPY'].low        = spyOHLC.low        || md.quotes['SPY'].low;
      md.quotes['SPY'].volume     = spyOHLC.volume     || md.quotes['SPY'].volume;
      md.quotes['SPY'].prev_close = spyOHLC.prev_close || md.quotes['SPY'].prev_close;
      // Also patch current price — market_data.json is stale until next workflow run
      if (spyOHLC.close) {
        md.quotes['SPY'].price      = spyOHLC.close;
        md.quotes['SPY'].change     = spyOHLC.change     ?? md.quotes['SPY'].change;
        md.quotes['SPY'].pct_change = spyOHLC.changePct  ?? md.quotes['SPY'].pct_change;
      }
    }
    // Patch F&G with CNN value immediately
    if (liveFG) md.fear_greed = liveFG;
    // Patch GEX + max pain with live CBOE data (overrides stale workflow data)
    if (liveGEX?.gex?.flip_point) {
      md.gex = liveGEX.gex;
      // Patch atm_straddle into md.gex so daily EM can use real straddle price
      if (liveGEX.atm_straddle) md.gex.atm_straddle = liveGEX.atm_straddle;
      if (liveGEX.atm_call_mid) md.gex.atm_call_mid = liveGEX.atm_call_mid;
      if (liveGEX.atm_put_mid)  md.gex.atm_put_mid  = liveGEX.atm_put_mid;
      if (liveGEX.max_pain?.length) md.max_pain = liveGEX.max_pain;
      if (liveGEX.walls_by_expiry?.length) md.walls_by_expiry = liveGEX.walls_by_expiry;
      // Note: intentionally NOT overriding weekly_em[0].atm_iv with GEX atm_iv
      // GEX uses nearest expiry IV which can differ from weekly IV used for EM calc
      if (liveGEX.pcr_vol && md.options_summary) md.options_summary.pc_ratio_vol = liveGEX.pcr_vol;
    }

    _md=md; _sd=sd;
    if (spyOHLC?.available) { _spyIntraday = spyOHLC; saveIntradayCache(spyOHLC); } // store live intraday for desk volume box
    const safeRender = (fn, ...args) => { try { fn(...args); } catch(e) { console.error(fn.name, e); } };
    safeRender(renderHub, md, sd);
    safeRender(renderDesk, md, sd);
    updateLevelBar(md?.quotes?.['SPY']?.price);
    if (spyOHLC) updateLiveHVN(spyOHLC);
    safeRender(renderOverview, md);
    safeRender(renderOptions, md);
    try { renderExpiryBehavior(md); } catch(e) {}
    safeRender(renderVolatility, md);
    safeRender(renderBonds, md);
    safeRender(renderBreadth, md, sd);
    safeRender(renderSentiment, md);
    safeRender(renderPriceHistory, sd);
    safeRender(renderTODStats);
    safeRender(renderVolHistory, sd);
    safeRender(renderWEM, md);
    safeRender(renderVolume, sd, md);
    safeRender(renderGEX, md);
    await renderKeyEvents();
    // AI features
    runPatternAlerts(md,sd);
    generateSummary(md,sd);
    generateTradeIdeas(md,sd);
    generateLevelAnalysis(md,sd);
    generateVolumeAnalysis(md,sd);
    generateRiskAssessment(md,sd);
    generateEventImpact(md,sd);
    
    // Load AAII and COT async
    loadAAII();
    loadCOT();
    renderLiquidity();
    
    // Fix 2: Dynamic interval — 15s during market hours, 60s otherwise
    _lastStaticRefresh = Date.now(); // mark static data as just loaded
    fetchWeekOpen(); // set week open immediately on load
    updateStaticTimestamp();
    scheduleLiveRefresh();
    setInterval(async () => {
      const fresh = await fetchLiveGEX();
      if (fresh?.gex?.flip_point && _md) {
        _md.gex = fresh.gex;
        if (fresh.max_pain?.length) _md.max_pain = fresh.max_pain;
        if (fresh.walls_by_expiry?.length) _md.walls_by_expiry = fresh.walls_by_expiry;
        if (fresh.pcr_vol && _md.options_summary) _md.options_summary.pc_ratio_vol = fresh.pcr_vol;
        renderGEX(_md);
        renderDesk(_md, _sd);
        renderOptions(_md);
      }
    }, 300000); // every 5 minutes

    // Refresh all AI sections every 30 minutes
    setInterval(() => {
      if (_md && _sd) {
        generateSummary(_md, _sd);
        generateTradeIdeas(_md, _sd);
        generateLevelAnalysis(_md, _sd);
        generateVolumeAnalysis(_md, _sd);
        generateRiskAssessment(_md, _sd);
        runPatternAlerts(_md, _sd);
      }
    }, 1800000); // every 30 minutes
    
  }catch(e){console.error('Load error:',e);}
}
loadData();

function _renderGapOHLCBlocks(sd) {
  if(!sd || sd.length <= 1) return;
  const $ = id => document.getElementById(id);
  const fmt = (v,d) => { d = d==null?1:d; return v==null?'--':Number(v).toFixed(d); };
  const gapStatCardsEl = $('gapStatCards');
  const gapSizeChartEl = $('gapSizeChart');
  const gapByDayEl     = $('gapByDayChart');
  const gapTimingEl    = $('gapCloseTimingChart');
  const gapTableEl     = $('gapHistBody');

  if(gapStatCardsEl && sd.length > 1) {
    // Build gap dataset from OHLC
    const gaps = [];
    for(let i=0; i<sd.length-1; i++){
      const today2=sd[i], prev2=sd[i+1];
      if(!today2.open||!prev2.close||!today2.high||!today2.low||!today2.close) continue;
      const gapAmt = today2.open - prev2.close;
      if(Math.abs(gapAmt) < 0.05) continue; // filter micro gaps
      const gapPct = (gapAmt/prev2.close)*100;
      const dir = gapAmt > 0 ? 'UP' : 'DOWN';
      // Gap filled same day?
      // Gap up filled if price traded back down to prev close (low <= prevClose)
      // Gap down filled if price traded back up to prev close (high >= prevClose)
      const filledSameDay = dir==='UP'
        ? today2.low  <= prev2.close
        : today2.high >= prev2.close;
      // Day of week
      const d2 = new Date(today2.date+'T12:00:00');
      const dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d2.getDay()];
      gaps.push({
        date: today2.date, dow,
        prevClose: prev2.close,
        open: today2.open,
        high: today2.high,
        low: today2.low,
        close: today2.close,
        gapAmt, gapPct, dir, filledSameDay
      });
    }

    const gapsUp   = gaps.filter(g=>g.dir==='UP');
    const gapsDn   = gaps.filter(g=>g.dir==='DOWN');
    const fillUp   = gapsUp.filter(g=>g.filledSameDay);
    const fillDn   = gapsDn.filter(g=>g.filledSameDay);
    const avgGapUp = gapsUp.length ? gapsUp.reduce((a,g)=>a+g.gapAmt,0)/gapsUp.length : 0;
    const avgGapDn = gapsDn.length ? gapsDn.reduce((a,g)=>a+g.gapAmt,0)/gapsDn.length : 0;
    const avgGapUpPct = gapsUp.length ? gapsUp.reduce((a,g)=>a+g.gapPct,0)/gapsUp.length : 0;
    const avgGapDnPct = gapsDn.length ? gapsDn.reduce((a,g)=>a+g.gapPct,0)/gapsDn.length : 0;
    const largestUp = gapsUp.length ? Math.max(...gapsUp.map(g=>g.gapAmt)) : 0;
    const largestDn = gapsDn.length ? Math.min(...gapsDn.map(g=>g.gapAmt)) : 0;

    // Stat cards
    gapStatCardsEl.innerHTML = [
      {l:'TOTAL GAPS',       v:gaps.length,                  sub:`${sd.length} days analyzed`,    c:'var(--cyan)'},
      {l:'GAP UPS',          v:gapsUp.length,                sub:fmt(gapsUp.length/gaps.length*100,1)+'% of gaps',  c:'#00ff88'},
      {l:'GAP DOWNS',        v:gapsDn.length,                sub:fmt(gapsDn.length/gaps.length*100,1)+'% of gaps',  c:'#ff3355'},
      {l:'UP FILL RATE',     v:fmt(fillUp.length/Math.max(gapsUp.length,1)*100,1)+'%', sub:`${fillUp.length} of ${gapsUp.length} filled same day`, c:'#00ff88'},
      {l:'DOWN FILL RATE',   v:fmt(fillDn.length/Math.max(gapsDn.length,1)*100,1)+'%', sub:`${fillDn.length} of ${gapsDn.length} filled same day`, c:'#ff3355'},
      {l:'OVERALL FILL RATE',v:fmt((fillUp.length+fillDn.length)/Math.max(gaps.length,1)*100,1)+'%', sub:`${fillUp.length+fillDn.length} total filled`,  c:'#ffcc00'},
    ].map(({l,v,sub,c})=>`<div style="background:var(--bg3);border:1px solid var(--border);border-top:3px solid ${c};border-radius:3px;padding:10px;text-align:center;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:6px;">${l}</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:bold;color:${c};">${v}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:3px;">${sub}</div>
    </div>`).join('');

    // Gap size distribution chart
    if(gapSizeChartEl) {
      const bins = [
        {label:'0-0.25%', min:0,    max:0.25},
        {label:'0.25-0.5%', min:0.25, max:0.5},
        {label:'0.5-1%', min:0.5,  max:1.0},
        {label:'1-1.5%', min:1.0,  max:1.5},
        {label:'1.5-2%', min:1.5,  max:2.0},
        {label:'>2%',    min:2.0,  max:999},
      ];
      const countUp = bins.map(b=>gapsUp.filter(g=>Math.abs(g.gapPct)>=b.min&&Math.abs(g.gapPct)<b.max).length);
      const countDn = bins.map(b=>gapsDn.filter(g=>Math.abs(g.gapPct)>=b.min&&Math.abs(g.gapPct)<b.max).length);
      const maxCount = Math.max(...countUp,...countDn,1);
      const gap2=4;
      gapSizeChartEl.innerHTML = `<div style="display:flex;flex-direction:column;gap:${gap2}px;">`+
        bins.map((b,i)=>`
          <div>
            <div style="font-size:10px;color:var(--text3);margin-bottom:2px;">${b.label}</div>
            <div style="display:flex;flex-direction:column;gap:2px;">
              <div style="display:flex;align-items:center;gap:4px;">
                <div style="flex:1;height:9px;background:var(--bg3);border-radius:1px;overflow:hidden;">
                  <div style="width:${(countUp[i]/maxCount*100).toFixed(1)}%;height:100%;background:#00ff88;border-radius:1px;"></div>
                </div>
                <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:#00ff88;width:22px;text-align:right;">${countUp[i]}</span>
              </div>
              <div style="display:flex;align-items:center;gap:4px;">
                <div style="flex:1;height:9px;background:var(--bg3);border-radius:1px;overflow:hidden;">
                  <div style="width:${(countDn[i]/maxCount*100).toFixed(1)}%;height:100%;background:#ff3355;border-radius:1px;"></div>
                </div>
                <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:#ff3355;width:22px;text-align:right;">${countDn[i]}</span>
              </div>
            </div>
          </div>`).join('')+
        `</div><div style="display:flex;gap:12px;margin-top:6px;font-size:10px;">
          <span style="color:#00ff88;">■ Gap Up</span>
          <span style="color:#ff3355;">■ Gap Down</span>
          <span style="color:var(--text3);">avg up: +$${fmt(avgGapUp,2)} (+${fmt(avgGapUpPct,2)}%)</span>
          <span style="color:var(--text3);">avg dn: -$${fmt(Math.abs(avgGapDn),2)} (${fmt(avgGapDnPct,2)}%)</span>
        </div>`;
    }

    // Fill rate by day of week
    if(gapByDayEl) {
      const days2 = ['Mon','Tue','Wed','Thu','Fri'];
      const dayStats = days2.map(d=>{
        const dayGaps = gaps.filter(g=>g.dow===d);
        const filled  = dayGaps.filter(g=>g.filledSameDay);
        return { d, total:dayGaps.length, filled:filled.length, rate:dayGaps.length?filled.length/dayGaps.length*100:0 };
      });
      gapByDayEl.innerHTML = `<div style="display:flex;flex-direction:column;gap:6px;">`+
        dayStats.map(ds=>{
          const c = ds.rate>70?'#00ff88':ds.rate>50?'#ffcc00':'#ff3355';
          return `<div style="display:flex;align-items:center;gap:8px;">
            <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--text2);width:28px;">${ds.d}</span>
            <div style="flex:1;height:18px;background:var(--bg3);border-radius:2px;overflow:hidden;">
              <div style="width:${ds.rate.toFixed(1)}%;height:100%;background:${c};border-radius:2px;"></div>
            </div>
            <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${c};width:38px;">${fmt(ds.rate,0)}%</span>
            <span style="font-size:11px;color:var(--text3);">${ds.filled}/${ds.total}</span>
          </div>`;
        }).join('')+'</div>'+
        `<div style="font-size:10px;color:var(--text3);margin-top:6px;">% of gaps filled by weekday</div>`;
    }

    // Gap close timing (filled intraday breakdown)
    if(gapTimingEl) {
      const filledAll = gaps.filter(g=>g.filledSameDay);
      const notFilled = gaps.filter(g=>!g.filledSameDay);
      // Categorize: gap up filled = bearish reversal day? gap down filled = bullish recovery?
      const gapUpFilledBull = gapsUp.filter(g=>g.filledSameDay&&g.close>g.prevClose); // filled but still closed up
      const gapUpFilledBear = gapsUp.filter(g=>g.filledSameDay&&g.close<=g.prevClose); // filled and reversed
      const gapDnFilledBull = gapsDn.filter(g=>g.filledSameDay&&g.close>=g.prevClose); // filled and recovered
      const gapDnFilledBear = gapsDn.filter(g=>g.filledSameDay&&g.close<g.prevClose);  // filled, kept going
      const items = [
        {l:'Gap Up → filled, closed above prev', v:gapUpFilledBull.length, c:'#00ff88'},
        {l:'Gap Up → filled, reversed below prev',v:gapUpFilledBear.length, c:'#ff8800'},
        {l:'Gap Up → NOT filled',                 v:gapsUp.filter(g=>!g.filledSameDay).length, c:'#00ff8844'},
        {l:'Gap Down → filled, recovered',        v:gapDnFilledBull.length, c:'#00ccff'},
        {l:'Gap Down → filled, kept dropping',    v:gapDnFilledBear.length, c:'#ff3355'},
        {l:'Gap Down → NOT filled',               v:gapsDn.filter(g=>!g.filledSameDay).length, c:'#ff335544'},
      ];
      const maxV = Math.max(...items.map(i=>i.v),1);
      gapTimingEl.innerHTML = `<div style="display:flex;flex-direction:column;gap:5px;">`+
        items.map(({l,v,c})=>`<div style="display:flex;align-items:center;gap:8px;">
          <div style="width:80px;flex-shrink:0;height:16px;background:var(--bg3);border-radius:2px;overflow:hidden;">
            <div style="width:${(v/maxV*100).toFixed(1)}%;height:100%;background:${c};border-radius:2px;"></div>
          </div>
          <span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${c};width:22px;">${v}</span>
          <span style="font-size:11px;color:var(--text3);line-height:1.3;">${l}</span>
        </div>`).join('')+'</div>'+
        `<div style="font-size:10px;color:var(--text3);margin-top:8px;">Largest gap up: +$${fmt(largestUp,2)} · Largest gap dn: -$${fmt(Math.abs(largestDn),2)}</div>`;
    }

    // Gap table
    if(gapTableEl) {
      gapTableEl.innerHTML = [...gaps].map(g=>{
        const c = g.dir==='UP'?'#00ff88':'#ff3355';
        const fillC = g.filledSameDay?'#00ff88':'#ff3355';
        return `<tr>
          <td>${g.date}</td>
          <td style="color:var(--text2);">$${fmt(g.prevClose,2)}</td>
          <td style="color:${c};">$${fmt(g.open,2)}</td>
          <td style="color:${c};font-weight:bold;">${g.gapAmt>=0?'+':''}$${fmt(g.gapAmt,2)}</td>
          <td style="color:${c};">${g.gapPct>=0?'+':''}${fmt(g.gapPct,2)}%</td>
          <td style="color:${c};font-family:'Orbitron',monospace;font-size:9px;">${g.dir}</td>
          <td style="color:${fillC};font-family:'Orbitron',monospace;font-size:9px;">${g.filledSameDay?'✓ YES':'✗ NO'}</td>
          <td class="up">$${fmt(g.high,2)}</td>
          <td class="dn">$${fmt(g.low,2)}</td>
          <td style="color:${g.close>=g.open?'#00ff88':'#ff3355'};">$${fmt(g.close,2)}</td>
        </tr>`;
      }).join('');
    }
  }

}

// ─── GEX INTRADAY INTERVAL MAP ───────────────────────────────────────────────
async function renderGEXIntradayMap() {
  const el = document.getElementById('gexIntradayContent');
  if (!el) return;
  el.innerHTML = '<div class="no-data" style="padding:32px;">Loading GEX interval data...</div>';

  let snapshots = [];
  let intradayErr = null;
  try {
    const r = await fetch('/gex-history?type=intraday');
    const d = await r.json();
    snapshots = d.snapshots || [];
    if (d.error) intradayErr = d.error;
  } catch(e) { intradayErr = e.message; }

  // Also get current live GEX to show latest state even if KV is empty
  let liveGex = null;
  try {
    const md = window._md || {};
    if (md.gex && md.gex.flip_point) liveGex = md.gex;
  } catch(e) {}

  // Merge live into snapshots if not already represented
  if (liveGex) {
    const now = new Date();
    const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const t = `${String(et.getHours()).padStart(2,'0')}:${String(et.getMinutes()).padStart(2,'0')}`;
    if (!snapshots.some(s => s.t === t)) {
      snapshots.push({ t, ts: now.toISOString(), flip: liveGex.flip_point, sup: liveGex.support, res: liveGex.resistance, net: liveGex.net_gex, spot: liveGex.spot, regime: liveGex.regime });
    }
  }

  const spot = liveGex?.spot || (snapshots.length ? snapshots[snapshots.length-1].spot : 0);

  // ── KV not bound notice ──────────────────────────────────────────────────
  const kvNotice = intradayErr && intradayErr.includes('KV') ? `
    <div style="background:rgba(255,204,0,0.08);border:1px solid rgba(255,204,0,0.3);border-radius:4px;padding:10px 16px;margin-bottom:14px;font-size:11px;color:#ffcc00;font-family:'Share Tech Mono',monospace;">
      ⚠ KV NOT BOUND — Add GEX_HISTORY KV namespace in Cloudflare Pages → Settings → Functions → KV bindings. Data will accumulate automatically once bound.
    </div>` : '';

  if (!snapshots.length) {
    el.innerHTML = kvNotice + `
      <div style="padding:40px;text-align:center;color:var(--text3);">
        <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;margin-bottom:8px;">⬡ NO INTRADAY GEX DATA YET</div>
        <div style="font-size:12px;line-height:1.8;">
          ${intradayErr && !intradayErr.includes('KV') ? `Error: ${intradayErr}<br>` : ''}
          Data builds automatically as /gex is polled during market hours.<br>
          Snapshots stored every 5 minutes · Today's map appears at ~9:35 AM ET
        </div>
      </div>`;
    return;
  }

  // ── Canvas chart ────────────────────────────────────────────────────────
  // Collect price range
  const allPrices = snapshots.flatMap(s => [s.spot, s.flip, s.sup, s.res].filter(Boolean));
  const minP = Math.min(...allPrices) - 2;
  const maxP = Math.max(...allPrices) + 2;

  const regime = liveGex?.regime || snapshots[snapshots.length-1]?.regime || '';
  const isPos = (liveGex?.net_gex || snapshots[snapshots.length-1]?.net || 0) > 0;
  const regimeColor = isPos ? '#00ff88' : '#ff3355';
  const fmtB = n => { if (!n) return '—'; const a=Math.abs(n),s=n>=0?'+':'-'; return a>=1e9?s+'$'+(a/1e9).toFixed(2)+'B':s+'$'+(a/1e6).toFixed(0)+'M'; };
  const lastSnap = snapshots[snapshots.length-1];

  el.innerHTML = kvNotice + `
    <!-- Header row -->
    <div style="display:grid;grid-template-columns:1fr auto auto auto auto;gap:10px;align-items:center;margin-bottom:14px;">
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:10px;letter-spacing:2px;color:var(--cyan);">⬡ GEX INTERVAL MAP — INTRADAY</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px;">${snapshots.length} snapshots · updates every 5 min · ${new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'})} ET</div>
      </div>
      <div style="text-align:center;padding:8px 14px;background:rgba(0,204,255,0.07);border:1px solid rgba(0,204,255,0.25);border-radius:4px;">
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--cyan);margin-bottom:3px;">FLIP</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:15px;color:var(--cyan);">$${fmt(lastSnap?.flip,2)}</div>
      </div>
      <div style="text-align:center;padding:8px 14px;background:rgba(255,51,85,0.07);border:1px solid rgba(255,51,85,0.25);border-radius:4px;">
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:#ff3355;margin-bottom:3px;">SUPPORT</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:15px;color:#ff3355;">$${fmt(lastSnap?.sup,2)}</div>
      </div>
      <div style="text-align:center;padding:8px 14px;background:rgba(0,255,136,0.07);border:1px solid rgba(0,255,136,0.25);border-radius:4px;">
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:#00ff88;margin-bottom:3px;">RESISTANCE</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:15px;color:#00ff88;">$${fmt(lastSnap?.res,2)}</div>
      </div>
      <div style="text-align:center;padding:8px 14px;background:${regimeColor}11;border:1px solid ${regimeColor}44;border-radius:4px;">
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:${regimeColor};margin-bottom:3px;">NET GEX</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${regimeColor};">${fmtB(lastSnap?.net)}</div>
      </div>
    </div>
    <!-- Canvas -->
    <div style="position:relative;background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:12px;">
      <canvas id="gexIntradayCanvas" style="width:100%;display:block;"></canvas>
    </div>
    <!-- Legend -->
    <div style="display:flex;gap:20px;margin-top:10px;font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text3);">
      <span><span style="color:var(--cyan);">━━</span> SPOT PRICE</span>
      <span><span style="color:#ffcc00;">• • •</span> GAMMA FLIP</span>
      <span><span style="color:#ff3355;">• • •</span> GEX SUPPORT</span>
      <span><span style="color:#00ff88;">• • •</span> GEX RESISTANCE</span>
      <span style="margin-left:auto;color:var(--text3);">Regime: <span style="color:${regimeColor};">${regime}</span></span>
    </div>
    <!-- Snapshot table -->
    <details style="margin-top:14px;">
      <summary style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;color:var(--text3);cursor:pointer;padding:6px 0;">SNAPSHOT LOG (${snapshots.length} records)</summary>
      <div style="overflow-x:auto;margin-top:8px;">
        <table style="width:100%;font-family:'Share Tech Mono',monospace;font-size:11px;border-collapse:collapse;">
          <thead><tr style="color:var(--text3);border-bottom:1px solid var(--border);">
            <th style="padding:4px 8px;text-align:left;">TIME</th>
            <th style="padding:4px 8px;text-align:right;">SPOT</th>
            <th style="padding:4px 8px;text-align:right;color:#ffcc00;">FLIP</th>
            <th style="padding:4px 8px;text-align:right;color:#ff3355;">SUPPORT</th>
            <th style="padding:4px 8px;text-align:right;color:#00ff88;">RESISTANCE</th>
            <th style="padding:4px 8px;text-align:right;">NET GEX</th>
          </tr></thead>
          <tbody>
            ${[...snapshots].reverse().slice(0,30).map(s => {
              const n = s.net||0;
              const nc = n>0?'#00ff88':'#ff3355';
              return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                <td style="padding:3px 8px;color:var(--text2);">${s.t}</td>
                <td style="padding:3px 8px;text-align:right;color:var(--cyan);">$${fmt(s.spot,2)}</td>
                <td style="padding:3px 8px;text-align:right;color:#ffcc00;">$${fmt(s.flip,2)}</td>
                <td style="padding:3px 8px;text-align:right;color:#ff3355;">$${fmt(s.sup,2)}</td>
                <td style="padding:3px 8px;text-align:right;color:#00ff88;">$${fmt(s.res,2)}</td>
                <td style="padding:3px 8px;text-align:right;color:${nc};">${fmtB(n)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </details>
  `;

  // ── Draw canvas ──────────────────────────────────────────────────────────
  requestAnimationFrame(() => {
    const canvas = document.getElementById('gexIntradayCanvas');
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.parentElement.clientWidth - 24;
    const H = Math.max(260, Math.round(W * 0.28));
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const pad = { l: 58, r: 16, t: 16, b: 32 };
    const cw = W - pad.l - pad.r;
    const ch = H - pad.t - pad.b;
    const n  = snapshots.length;

    const toX = i => pad.l + (i / Math.max(n-1,1)) * cw;
    const toY = v => pad.t + ch - ((v - minP) / (maxP - minP)) * ch;

    // Background
    ctx.fillStyle = '#0c0c14';
    ctx.fillRect(0, 0, W, H);

    // Horizontal grid
    const priceStep = cw > 400 ? 2 : 5;
    const gridStart = Math.ceil(minP / priceStep) * priceStep;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.font = `10px 'Share Tech Mono', monospace`;
    ctx.fillStyle = '#606080';
    ctx.textAlign = 'right';
    for (let p = gridStart; p <= maxP; p += priceStep) {
      const y = toY(p);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillText('$' + p.toFixed(0), pad.l - 4, y + 3);
    }

    // Time labels
    ctx.textAlign = 'center';
    ctx.fillStyle = '#606080';
    const timeStep = Math.max(1, Math.floor(n / 8));
    snapshots.forEach((s, i) => {
      if (i % timeStep !== 0 && i !== n-1) return;
      ctx.fillText(s.t, toX(i), H - pad.b + 14);
    });

    // Helper: draw dotted line for a level series
    const drawDots = (color, key, radius=3) => {
      ctx.fillStyle = color;
      snapshots.forEach((s, i) => {
        if (!s[key]) return;
        const x = toX(i), y = toY(s[key]);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI*2);
        ctx.fill();
      });
    };

    // Helper: draw connected line
    const drawLine = (color, key, width=2, dash=[]) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.beginPath();
      let started = false;
      snapshots.forEach((s, i) => {
        if (!s[key]) return;
        const x = toX(i), y = toY(s[key]);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };

    // Shade above/below flip
    snapshots.forEach((s, i) => {
      if (!s.flip || !s.spot) return;
      const x1 = toX(i);
      const x2 = i < n-1 ? toX(i+1) : x1+1;
      const aboveFlip = s.spot > s.flip;
      ctx.fillStyle = aboveFlip ? 'rgba(0,255,136,0.04)' : 'rgba(255,51,85,0.04)';
      ctx.fillRect(x1, pad.t, x2-x1, ch);
    });

    // Draw GEX levels as dotted trails
    drawLine('#ff335544', 'sup',  1, [3,3]);
    drawLine('#00ff8844', 'res',  1, [3,3]);
    drawLine('#ffcc0066', 'flip', 1.5, [4,3]);
    drawDots('#ff3355', 'sup',  2.5);
    drawDots('#00ff88', 'res',  2.5);
    drawDots('#ffcc00', 'flip', 3.5);

    // Spot price line (solid, prominent)
    drawLine('rgba(0,204,255,0.9)', 'spot', 2.5);

    // Current spot dot
    if (spot && snapshots.length) {
      const lx = toX(n-1), ly = toY(spot);
      ctx.beginPath(); ctx.arc(lx, ly, 5, 0, Math.PI*2);
      ctx.fillStyle = '#00ccff'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      // Label
      ctx.fillStyle = '#00ccff';
      ctx.textAlign = 'left';
      ctx.font = `bold 11px 'Share Tech Mono', monospace`;
      ctx.fillText('$' + fmt(spot,2), lx+8, ly+4);
    }
  });
}

// ─── GEX DAILY HISTORY CHART (added to GEX tab) ──────────────────────────────
async function renderGEXDailyHistory() {
  const el = document.getElementById('gexDailyHistory');
  if (!el) return;
  el.innerHTML = '<div style="padding:16px;color:var(--text3);font-size:12px;">Loading daily GEX history...</div>';

  let history = [];
  let err = null;
  try {
    const r = await fetch('/gex-history?type=daily&days=90');
    const d = await r.json();
    history = d.history || [];
    if (d.error) err = d.error;
  } catch(e) { err = e.message; }

  if (!history.length) {
    el.innerHTML = `
      <div style="padding:20px;text-align:center;color:var(--text3);">
        <div style="font-family:'Orbitron',monospace;font-size:10px;letter-spacing:2px;margin-bottom:6px;">⬡ NO DAILY HISTORY YET</div>
        <div style="font-size:11px;line-height:1.8;">
          ${err ? `${err}<br>` : ''}
          Daily GEX levels build automatically. After market hours today the first record will appear.<br>
          ${err && err.includes('KV') ? '<span style="color:#ffcc00;">→ Bind GEX_HISTORY KV namespace in Cloudflare Pages → Settings → Functions</span>' : ''}
        </div>
      </div>`;
    return;
  }

  // Price range
  const allPrices = history.flatMap(d => [d.spot, d.flip, d.sup, d.res].filter(Boolean));
  const minP = Math.min(...allPrices) - 3;
  const maxP = Math.max(...allPrices) + 3;
  const fmtB = n => { if (!n) return '—'; const a=Math.abs(n),s=n>=0?'+':'-'; return a>=1e9?s+'$'+(a/1e9).toFixed(2)+'B':s+'$'+(a/1e6).toFixed(0)+'M'; };

  el.innerHTML = `
    <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--text3);margin-bottom:10px;">
      ⬡ GEX LEVEL HISTORY — ${history.length} TRADING DAYS · FLIP / SUPPORT / RESISTANCE vs PRICE
    </div>
    <div style="position:relative;background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:12px;">
      <canvas id="gexDailyCanvas" style="width:100%;display:block;"></canvas>
    </div>
    <div style="display:flex;gap:20px;margin-top:8px;font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text3);">
      <span><span style="color:var(--cyan);">━━</span> SPOT</span>
      <span><span style="color:#ffcc00;">━━</span> GAMMA FLIP</span>
      <span><span style="color:#ff3355;">- -</span> SUPPORT</span>
      <span><span style="color:#00ff88;">- -</span> RESISTANCE</span>
    </div>
    <!-- Regime bar -->
    <div style="margin-top:12px;overflow-x:auto;">
      <div style="display:flex;gap:2px;height:8px;border-radius:3px;overflow:hidden;min-width:300px;">
        ${history.map(d => {
          const pos = (d.net||0) > 0;
          return `<div style="flex:1;background:${pos?'rgba(0,255,136,0.5)':'rgba(255,51,85,0.5)'}" title="${d.date}: ${d.regime||''} ${fmtB(d.net)}"></div>`;
        }).join('')}
      </div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text3);margin-top:3px;">
        GEX REGIME: <span style="color:#00ff88;">█</span> POSITIVE (stabilizing) &nbsp; <span style="color:#ff3355;">█</span> NEGATIVE (destabilizing)
      </div>
    </div>
  `;

  requestAnimationFrame(() => {
    const canvas = document.getElementById('gexDailyCanvas');
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.parentElement.clientWidth - 24;
    const H = Math.max(220, Math.round(W * 0.22));
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const pad = { l: 58, r: 16, t: 12, b: 28 };
    const cw = W - pad.l - pad.r;
    const ch = H - pad.t - pad.b;
    const n  = history.length;

    const toX = i => pad.l + (i / Math.max(n-1,1)) * cw;
    const toY = v => pad.t + ch - ((v - minP) / (maxP - minP)) * ch;

    ctx.fillStyle = '#0c0c14';
    ctx.fillRect(0, 0, W, H);

    // Grid
    const priceStep = (maxP - minP) > 30 ? 10 : 5;
    const gridStart = Math.ceil(minP / priceStep) * priceStep;
    ctx.font = `10px 'Share Tech Mono', monospace`;
    ctx.fillStyle = '#606080';
    ctx.textAlign = 'right';
    for (let p = gridStart; p <= maxP; p += priceStep) {
      const y = toY(p);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W-pad.r, y); ctx.stroke();
      ctx.fillText('$'+p.toFixed(0), pad.l-4, y+3);
    }

    // Date labels
    ctx.textAlign = 'center';
    ctx.fillStyle = '#606080';
    const step = Math.max(1, Math.floor(n/8));
    history.forEach((d,i) => {
      if (i%step!==0 && i!==n-1) return;
      const label = d.date.slice(5); // MM-DD
      ctx.fillText(label, toX(i), H-pad.b+14);
    });

    const drawLine = (color, key, width, dash=[]) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash);
      ctx.beginPath();
      let started = false;
      history.forEach((d,i) => {
        if (!d[key]) return;
        const x=toX(i), y=toY(d[key]);
        if (!started) { ctx.moveTo(x,y); started=true; } else ctx.lineTo(x,y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };

    // Shade spot vs flip
    history.forEach((d,i) => {
      if (!d.flip || !d.spot) return;
      const x1=toX(i), x2=i<n-1?toX(i+1):x1+1;
      ctx.fillStyle = d.spot>d.flip ? 'rgba(0,255,136,0.04)' : 'rgba(255,51,85,0.04)';
      ctx.fillRect(x1, pad.t, x2-x1, ch);
    });

    drawLine('rgba(255,51,85,0.5)',   'sup',  1, [4,3]);
    drawLine('rgba(0,255,136,0.5)',   'res',  1, [4,3]);
    drawLine('rgba(255,204,0,0.85)',  'flip', 2);
    drawLine('rgba(0,204,255,0.95)',  'spot', 2.5);

    // Latest dot
    const last = history[n-1];
    if (last?.spot) {
      const lx=toX(n-1), ly=toY(last.spot);
      ctx.beginPath(); ctx.arc(lx,ly,4,0,Math.PI*2);
      ctx.fillStyle='#00ccff'; ctx.fill();
    }
  });
}
