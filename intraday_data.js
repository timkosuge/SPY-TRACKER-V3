/**
 * intraday_data.js — SPY Intraday Analytics Tab
 * Reads INTRADAY_SESSION_STATS from intraday_library.js
 * Re-renders on every live dashboard refresh cycle (same cadence as Trading Desk)
 */

(function () {
  'use strict';

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fmt  = (v, d=2) => v == null ? '—' : Number(v).toFixed(d);
  const fmtp = (v, d=2) => v == null ? '—' : (v>=0?'+':'')+Number(v).toFixed(d)+'%';
  const cls  = (v) => v==null?'':v>=0?'up':'down';
  const pct  = (n,d) => d ? Math.round(n/d*100) : 0;

  function getSPYPrice() {
    return window._md?.quotes?.['SPY']?.price || window._spyIntraday?.close || null;
  }

  // pct + dollar: "+0.98% · $6.21"
  function pd(pVal, spy, abs=false) {
    if (pVal==null) return '—';
    const p = (abs?'':pVal>=0?'+':'')+Number(pVal).toFixed(2)+'%';
    if (!spy) return p;
    const d = Math.abs(spy*pVal/100);
    return `${p} <span style="color:var(--text3);font-size:0.85em">·&thinsp;$${d.toFixed(2)}</span>`;
  }

  // ET "HH:MM" → CT 12-hr string
  function ct(t) {
    if (!t||!t.includes(':')) return t||'—';
    let [h,m] = t.split(':').map(Number);
    h -= 1; if(h<0) h+=24;
    const ap=h>=12?'PM':'AM'; const h12=h%12||12;
    return `${h12}:${String(m).padStart(2,'0')} ${ap} CT`;
  }
  // ET "HH:MM" → CT short (no "CT" suffix, for table)
  function ctShort(t) {
    if (!t||!t.includes(':')) return t||'—';
    let [h,m] = t.split(':').map(Number);
    h -= 1; if(h<0) h+=24;
    const ap=h>=12?'PM':'AM'; const h12=h%12||12;
    return `${h12}:${String(m).padStart(2,'0')} ${ap}`;
  }

  function getData() {
    if (typeof INTRADAY_SESSION_STATS==='undefined'||!INTRADAY_SESSION_STATS.length) return null;
    return INTRADAY_SESSION_STATS;
  }

  // Trading days since a date (skip weekends)
  function tradingDaysSince(dateStr) {
    const start=new Date(dateStr+'T12:00:00'), end=new Date();
    let count=0; const cur=new Date(start); cur.setDate(cur.getDate()+1);
    while(cur<=end){ const d=cur.getDay(); if(d!==0&&d!==6) count++; cur.setDate(cur.getDate()+1); }
    return count;
  }

  // ── Reversal stats computed from raw session data ─────────────────────────
  // Uses initial_move_dir + close_price vs open_price
  // Returns {up_rev, up_hold, dn_rev, dn_hold, total} for 15m and 30m windows
  function computeReversals(raw, windowKey) {
    // windowKey: 'initial_move_dir' for 15m (we'll use a proxy)
    // Since intraday_library only stores direction not exact 15m/30m closes,
    // we use initial_move_dir (first 15 min) vs day close direction
    let up_rev=0, up_hold=0, dn_rev=0, dn_hold=0;
    raw.forEach(d => {
      const dir = d[windowKey];
      if (!dir || d.close_price==null || d.open_price==null) return;
      const dayUp = d.close_price > d.open_price;
      if (dir==='UP')  { dayUp ? up_hold++ : up_rev++; }
      else              { dayUp ? dn_rev++  : dn_hold++; }
    });
    const total = up_rev+up_hold+dn_rev+dn_hold;
    return {up_rev, up_hold, dn_rev, dn_hold, total};
  }

  // ── Main render ───────────────────────────────────────────────────────────
  function renderIntraday() {
    const el = document.getElementById('intradayContent');
    if (!el) return;
    const raw = getData();
    if (!raw) {
      el.innerHTML = `<div class="no-data" style="padding:40px;text-align:center;">
        <div style="font-size:13px;color:var(--text3);margin-bottom:8px;">NO INTRADAY DATA YET</div>
        <div style="font-size:11px;color:var(--text3);">Data accumulates daily after the pipeline runs.</div>
      </div>`;
      return;
    }

    const spy = getSPYPrice();
    const n   = raw.length;
    const latest = raw[0];

    // ── Core aggregates ───────────────────────────────────────────────────
    const gapUp   = raw.filter(d=>d.gap_type==='GAP_UP');
    const gapDown = raw.filter(d=>d.gap_type==='GAP_DOWN');
    const flat    = raw.filter(d=>d.gap_type==='FLAT');
    const gapUpFilled   = gapUp.filter(d=>d.gap_filled===1);
    const gapDownFilled = gapDown.filter(d=>d.gap_filled===1);

    const withOR  = raw.filter(d=>d.or_range!=null);
    const avgOR   = withOR.length ? withOR.reduce((s,d)=>s+d.or_range,0)/withOR.length : null;

    // Only count OR breaks where or_break_dir is explicitly set
    const orBreakUp   = raw.filter(d=>d.or_break_dir==='UP');
    const orBreakDown = raw.filter(d=>d.or_break_dir==='DOWN');
    const noBreak     = raw.filter(d=>d.or_break_dir==null||d.or_break_dir==='');
    const orBreakUpHolds   = orBreakUp.filter(d=>d.close_price>d.or_high);
    const orBreakDownHolds = orBreakDown.filter(d=>d.close_price<d.or_low);

    const phUp  = raw.filter(d=>d.power_hour_dir==='UP');
    const phDown= raw.filter(d=>d.power_hour_dir==='DOWN');
    const avgPHpct = phUp.length+phDown.length
      ? raw.filter(d=>d.power_hour_pct!=null).reduce((s,d)=>s+d.power_hour_pct,0)/raw.filter(d=>d.power_hour_pct!=null).length
      : null;

    const avgLunch = raw.filter(d=>d.lunch_range_pct!=null).length
      ? raw.filter(d=>d.lunch_range_pct!=null).reduce((s,d)=>s+d.lunch_range_pct,0)/raw.filter(d=>d.lunch_range_pct!=null).length
      : null;

    const avgRangePct = raw.filter(d=>d.day_range_pct!=null).length
      ? raw.filter(d=>d.day_range_pct!=null).reduce((s,d)=>s+d.day_range_pct,0)/raw.filter(d=>d.day_range_pct!=null).length
      : null;

    // ── Reversal stats — 15-min window (initial_move_dir) ─────────────────
    const rev15 = computeReversals(raw, 'initial_move_dir');
    // 30-min window proxy: or_break_dir as first 30-min direction signal
    // Since we don't have a 30m_dir field directly, compute from or_break timing:
    // if or_break happens at/before 10:00 ET (9:00 CT) it's within OR window
    // Better: use close_price vs open_price polarity at 30m.
    // We stored open and close; use or_high/or_low midpoint as 30m proxy direction.
    // Most reliable: use or_break_dir as the 30m direction (first 30 min establishes this)
    const rev30 = (() => {
      let up_rev=0, up_hold=0, dn_rev=0, dn_hold=0;
      raw.forEach(d => {
        // 30-min direction: price relative to open at end of OR window
        // Approximate using: if or_break_dir=UP → first 30m moved up, if DOWN → moved down
        // For "no break" sessions: compare or_high-open vs open-or_low to guess direction
        let dir = d.or_break_dir; // UP/DOWN
        if (!dir && d.or_high!=null && d.or_low!=null && d.open_price!=null) {
          dir = (d.or_high-d.open_price) > (d.open_price-d.or_low) ? 'UP' : 'DOWN';
        }
        if (!dir || d.close_price==null || d.open_price==null) return;
        const dayUp = d.close_price > d.open_price;
        if (dir==='UP')  { dayUp ? up_hold++ : up_rev++; }
        else              { dayUp ? dn_rev++  : dn_hold++; }
      });
      return {up_rev, up_hold, dn_rev, dn_hold, total: up_rev+up_hold+dn_rev+dn_hold};
    })();

    // ── Best/worst times histogram ────────────────────────────────────────
    const bestTimes={}, worstTimes={};
    raw.forEach(d=>{
      if(d.best_5m_time)  bestTimes[d.best_5m_time]  =(bestTimes[d.best_5m_time] ||0)+1;
      if(d.worst_5m_time) worstTimes[d.worst_5m_time]=(worstTimes[d.worst_5m_time]||0)+1;
    });
    const topBest  = Object.entries(bestTimes).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const topWorst = Object.entries(worstTimes).sort((a,b)=>b[1]-a[1]).slice(0,5);

    // ── OR break timing (ET→CT) ────────────────────────────────────────────
    const orBreakTimes={};
    raw.filter(d=>d.or_break_time).forEach(d=>{
      let [h,m]=d.or_break_time.split(':').map(Number);
      h-=1; // ET→CT
      const bucket=m<30?`${h}:00`:`${h}:30`;
      orBreakTimes[bucket]=(orBreakTimes[bucket]||0)+1;
    });
    const topORB = Object.entries(orBreakTimes).sort((a,b)=>b[1]-a[1]).slice(0,5);

    // ── Gap fill time ─────────────────────────────────────────────────────
    function avgFillTime(arr) {
      const filled=arr.filter(d=>d.gap_fill_time);
      if(!filled.length) return null;
      const mins=filled.map(d=>{const[h,m]=d.gap_fill_time.split(':').map(Number);return(h*60+m)-(9*60+30);});
      const avg=mins.reduce((s,v)=>s+v,0)/mins.length;
      const ctMins=avg+9*60+30-60; // ET→CT
      const h=Math.floor(ctMins/60),m=Math.round(ctMins%60);
      const ap=h>=12?'PM':'AM'; const h12=h%12||12;
      return `${h12}:${String(m).padStart(2,'0')} ${ap} CT`;
    }

    // ── Gap distribution ───────────────────────────────────────────────────
    const gapB={'>1%':0,'0.5–1%':0,'0.25–0.5%':0,'FLAT':0,'-0.25–-0.5%':0,'-0.5–-1%':0,'<-1%':0};
    raw.forEach(d=>{
      const g=d.gap_pct;
      if(g>1) gapB['>1%']++;
      else if(g>0.5) gapB['0.5–1%']++;
      else if(g>0.25) gapB['0.25–0.5%']++;
      else if(g>=-0.25) gapB['FLAT']++;
      else if(g>=-0.5) gapB['-0.25–-0.5%']++;
      else if(g>=-1) gapB['-0.5–-1%']++;
      else gapB['<-1%']++;
    });
    const maxGB=Math.max(...Object.values(gapB),1);
    const gapBars=Object.entries(gapB).map(([label,count])=>{
      const w=Math.round(count/maxGB*100);
      const isUp=label.startsWith('>')||label.startsWith('0');
      const col=label==='FLAT'?'var(--text3)':isUp?'var(--green)':'var(--red)';
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
        <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text2);width:100px;text-align:right">${label}</span>
        <div style="width:${w}px;height:11px;background:${col};border-radius:2px;opacity:0.8;"></div>
        <span style="font-size:10px;color:var(--text3)">${count}d (${pct(count,n)}%)</span>
      </div>`;
    }).join('');

    // ── Bar chart helper ───────────────────────────────────────────────────
    function tbar(label,count,maxCount,color) {
      const w=Math.round(count/maxCount*110);
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);width:62px">${label}</span>
        <div style="width:${w}px;height:10px;background:${color};border-radius:2px;"></div>
        <span style="font-size:10px;color:var(--text3)">${count}x</span>
      </div>`;
    }

    const maxBest  = topBest.length  ? topBest[0][1]  : 1;
    const maxWorst = topWorst.length ? topWorst[0][1] : 1;
    const maxORB2  = topORB.length   ? topORB[0][1]   : 1;

    const bestBars  = topBest.map(([t,c]) =>tbar(ct(t),c,maxBest, 'var(--green)')).join('');
    const worstBars = topWorst.map(([t,c])=>tbar(ct(t),c,maxWorst,'var(--red)')).join('');
    const orbBars   = topORB.map(([t,c])  =>{
      const h=parseInt(t),min=t.split(':')[1];
      const ap=h>=12?'PM':'AM'; const h12=h%12||12;
      return tbar(`${h12}:${min} ${ap}`,c,maxORB2,'var(--cyan)');
    }).join('');

    // ── Recent sessions table ─────────────────────────────────────────────
    const rows=raw.slice(0,20).map(d=>{
      const dayOC=d.open_price&&d.close_price?(d.close_price-d.open_price)/d.open_price*100:null;
      const dol=dayOC!=null&&d.open_price?Math.abs(d.close_price-d.open_price):null;
      return `<tr>
        <td style="text-align:left;color:var(--text2)">${d.date}</td>
        <td class="${cls(d.gap_pct)}">${fmtp(d.gap_pct)}</td>
        <td style="color:${d.gap_type==='GAP_UP'?'var(--green)':d.gap_type==='GAP_DOWN'?'var(--red)':'var(--text3)'}">
          ${d.gap_type==='GAP_UP'?'▲ UP':d.gap_type==='GAP_DOWN'?'▼ DN':'FLAT'}</td>
        <td>${d.or_range!=null?fmt(d.or_range)+'%':'—'}</td>
        <td style="color:${d.gap_filled===1?'var(--green)':d.gap_filled===0?'var(--red)':'var(--text3)'}">
          ${d.gap_filled===1?'✓':d.gap_filled===0?'✗':'—'}</td>
        <td style="color:${d.or_break_dir==='UP'?'var(--green)':d.or_break_dir==='DOWN'?'var(--red)':'var(--text3)'}">
          ${d.or_break_dir==='UP'?'▲':d.or_break_dir==='DOWN'?'▼':'—'}
          ${d.or_break_time?`<span style="color:var(--text3);font-size:9px">@${ctShort(d.or_break_time)}</span>`:''}</td>
        <td style="color:${d.power_hour_dir==='UP'?'var(--green)':d.power_hour_dir==='DOWN'?'var(--red)':'var(--text3)'}">
          ${d.power_hour_pct!=null?fmtp(d.power_hour_pct):'—'}</td>
        <td class="${cls(dayOC)}">${dayOC!=null?fmtp(dayOC):'—'}${dol!=null?`<span style="color:var(--text3);font-size:9px"> $${dol.toFixed(2)}</span>`:''}</td>
      </tr>`;
    }).join('');

    // ── Data freshness ────────────────────────────────────────────────────
    const tdOld=tradingDaysSince(latest.date);
    const dataAge=tdOld===0?'🟢 Updated today':tdOld===1?'🟡 1 trading day old':`🔴 ${tdOld} trading days old`;

    // ── Reversal panel rows ───────────────────────────────────────────────
    function revRow(label, holds, reverts, total, holdColor, revColor) {
      if(!total) return '';
      const hPct=Math.round(holds/total*100), rPct=Math.round(reverts/total*100);
      const barW=Math.round(hPct/100*140);
      return `<div style="margin-bottom:10px;">
        <div style="font-size:10px;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">${label}</div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <div>
            <span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${holdColor}">${hPct}%</span>
            <span style="font-size:10px;color:var(--text3);margin-left:3px;">hold direction (${holds}d)</span>
          </div>
          <div>
            <span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${revColor}">${rPct}%</span>
            <span style="font-size:10px;color:var(--text3);margin-left:3px;">reverse by close (${reverts}d)</span>
          </div>
        </div>
        <div style="display:flex;height:6px;border-radius:3px;overflow:hidden;margin-top:5px;background:rgba(255,51,85,0.3);">
          <div style="width:${barW}px;background:${holdColor};"></div>
        </div>
      </div>`;
    }

    // ── Render ────────────────────────────────────────────────────────────
    el.innerHTML = `
<div style="padding:12px 16px;max-width:1200px;margin:0 auto;">

  <!-- Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
    <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);">INTRADAY ANALYTICS</div>
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="font-size:10px;color:var(--text3);">${n} sessions · Latest: ${latest.date} · ${dataAge}${spy?` · SPY $${spy.toFixed(2)}`:''}</div>
      <div id="intradayRefreshDot" style="width:6px;height:6px;border-radius:50%;background:var(--text3);"></div>
    </div>
  </div>

  <!-- KPI strip -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:14px;">
    ${kpi('AVG DAY RANGE', fmtp(avgRangePct), null, `H→L${spy&&avgRangePct?' · $'+(spy*avgRangePct/100).toFixed(2):''}`)}
    ${kpi('AVG OR RANGE',  avgOR!=null?fmt(avgOR)+'%':'—', null, `first 30 min${spy&&avgOR?' · $'+(spy*avgOR/100).toFixed(2):''}`)}
    ${kpi('GAP UP FILL',   gapUp.length?Math.round(gapUpFilled.length/gapUp.length*100)+'%':'—', null, `${gapUpFilled.length} of ${gapUp.length} up gaps`)}
    ${kpi('GAP DOWN FILL', gapDown.length?Math.round(gapDownFilled.length/gapDown.length*100)+'%':'—', null, `${gapDownFilled.length} of ${gapDown.length} dn gaps`)}
    ${kpi('OR BREAK UP',   n?Math.round(orBreakUp.length/n*100)+'%':'—', null, `closes above OR: ${orBreakUp.length?Math.round(orBreakUpHolds.length/orBreakUp.length*100)+'%':'—'}`)}
    ${kpi('OR BREAK DOWN', n?Math.round(orBreakDown.length/n*100)+'%':'—', null, `closes below OR: ${orBreakDown.length?Math.round(orBreakDownHolds.length/orBreakDown.length*100)+'%':'—'}`)}
    ${kpi('AVG POWER HOUR',fmtp(avgPHpct), avgPHpct, `${phUp.length}↑ ${phDown.length}↓${spy&&avgPHpct!=null?' · $'+(spy*Math.abs(avgPHpct)/100).toFixed(2):''}`)}
    ${kpi('LUNCH RANGE',   avgLunch!=null?fmt(avgLunch)+'%':'—', null, `compression${spy&&avgLunch?' · $'+(spy*avgLunch/100).toFixed(2):''}`)}
  </div>

  <!-- Row 1: Opening Reversals (NEW) + Gap Analysis -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">

    <!-- Opening Reversals -->
    <div class="stat-box" style="padding:14px;">
      <div class="es-section" style="margin-bottom:4px;">OPENING MOVE REVERSALS</div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:12px;">
        How often does an early directional move hold vs. reverse by end of day?
        All times CT. Threshold: move must be ≥0.10% in the window.
      </div>

      <div style="font-size:10px;color:var(--text3);letter-spacing:1px;margin-bottom:8px;">FIRST 15 MIN MOVE (8:30–8:44 CT) — ${rev15.total} qualifying sessions</div>
      ${revRow('Opens UP first 15 min →', rev15.up_hold, rev15.up_rev, rev15.up_hold+rev15.up_rev, 'var(--green)', 'var(--red)')}
      ${revRow('Opens DOWN first 15 min →', rev15.dn_hold, rev15.dn_rev, rev15.dn_hold+rev15.dn_rev, 'var(--red)', 'var(--green)')}

      <div style="border-top:1px solid var(--border);margin:10px 0;"></div>

      <div style="font-size:10px;color:var(--text3);letter-spacing:1px;margin-bottom:8px;">FIRST 30 MIN MOVE (8:30–9:00 CT) — ${rev30.total} qualifying sessions</div>
      ${revRow('Opens UP first 30 min →', rev30.up_hold, rev30.up_rev, rev30.up_hold+rev30.up_rev, 'var(--green)', 'var(--red)')}
      ${revRow('Opens DOWN first 30 min →', rev30.dn_hold, rev30.dn_rev, rev30.dn_hold+rev30.dn_rev, 'var(--red)', 'var(--green)')}

      <div style="margin-top:10px;font-size:11px;color:var(--text2);line-height:1.6;">
        <span style="color:var(--cyan);">Takeaway:</span>
        When SPY moves ${rev15.dn_rev>rev15.up_rev?'down':'up'} in the first 15 min,
        it's more likely to reverse — reversing
        ${rev15.dn_rev>rev15.up_rev
          ? Math.round(rev15.dn_rev/(rev15.dn_hold+rev15.dn_rev)*100)
          : Math.round(rev15.up_rev/(rev15.up_hold+rev15.up_rev)*100)}%
        of the time. Early ${rev15.dn_rev>rev15.up_rev?'weakness':'strength'} is the less reliable signal.
      </div>
    </div>

    <!-- Gap Analysis -->
    <div class="stat-box" style="padding:14px;">
      <div class="es-section" style="margin-bottom:10px;">GAP ANALYSIS</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8;margin-bottom:12px;">
        SPY has gapped <span style="color:var(--green)">up ${gapUp.length}x (${pct(gapUp.length,n)}%)</span>,
        <span style="color:var(--red)">down ${gapDown.length}x (${pct(gapDown.length,n)}%)</span>,
        and opened flat <span style="color:var(--text3)">${flat.length}x (${pct(flat.length,n)}%)</span>.
        Gap-ups fill <span style="color:var(--green)">${gapUp.length?Math.round(gapUpFilled.length/gapUp.length*100):'—'}%</span>
        avg by <span style="color:var(--cyan)">${avgFillTime(gapUp)||'—'}</span>.
        Gap-downs fill <span style="color:var(--red)">${gapDown.length?Math.round(gapDownFilled.length/gapDown.length*100):'—'}%</span>
        avg by <span style="color:var(--cyan)">${avgFillTime(gapDown)||'—'}</span>.
      </div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:6px;letter-spacing:1px;">GAP SIZE DISTRIBUTION</div>
      ${gapBars}
    </div>

  </div>

  <!-- Row 2: Opening Range + Initial Move + Times -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">

    <!-- Opening Range -->
    <div class="stat-box" style="padding:14px;">
      <div class="es-section" style="margin-bottom:10px;">OPENING RANGE (8:30–9:00 CT)</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8;margin-bottom:10px;">
        Avg OR width: <span style="color:var(--cyan)">${avgOR!=null?fmt(avgOR)+'%':'—'}${spy&&avgOR?' ($'+(spy*avgOR/100).toFixed(2)+')':''}</span>.
        Breaks above <span style="color:var(--green)">${Math.round(orBreakUp.length/n*100)}%</span> of days
        (closes above OR high: <span style="color:var(--green)">${orBreakUp.length?Math.round(orBreakUpHolds.length/orBreakUp.length*100):'—'}%</span>).
        Breaks below <span style="color:var(--red)">${Math.round(orBreakDown.length/n*100)}%</span> of days
        (closes below OR low: <span style="color:var(--red)">${orBreakDown.length?Math.round(orBreakDownHolds.length/orBreakDown.length*100):'—'}%</span>).
      </div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:6px;letter-spacing:1px;">MOST COMMON BREAK TIMES (CT)</div>
      ${orbBars||'<span style="font-size:11px;color:var(--text3)">—</span>'}
    </div>

    <!-- Best times -->
    <div class="stat-box" style="padding:14px;">
      <div class="es-section" style="margin-bottom:6px;">🟢 STRONGEST 5-MIN WINDOWS (CT)</div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:8px;">Most frequent times of the largest up-moves</div>
      ${bestBars||'<div style="font-size:11px;color:var(--text3)">Not enough data</div>'}
      <div style="margin-top:12px;font-size:10px;color:var(--text3);letter-spacing:1px;">POWER HOUR (3:00–4:00 PM CT)</div>
      <div style="margin-top:4px;font-size:11px;color:var(--text2);line-height:1.7;">
        Closes higher ${phUp.length}d (${pct(phUp.length,n)}%).
        Avg move: <span style="color:${(avgPHpct||0)>=0?'var(--green)':'var(--red)'}">${fmtp(avgPHpct)}${spy&&avgPHpct!=null?' ($'+(spy*Math.abs(avgPHpct)/100).toFixed(2)+')':''}</span>.
      </div>
    </div>

    <!-- Worst times -->
    <div class="stat-box" style="padding:14px;">
      <div class="es-section" style="margin-bottom:6px;">🔴 WEAKEST 5-MIN WINDOWS (CT)</div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:8px;">Most frequent times of the largest down-moves</div>
      ${worstBars||'<div style="font-size:11px;color:var(--text3)">Not enough data</div>'}
      <div style="margin-top:12px;font-size:10px;color:var(--text3);letter-spacing:1px;">LUNCH LULL (10:30 AM–12:00 PM CT)</div>
      <div style="margin-top:4px;font-size:11px;color:var(--text2);line-height:1.7;">
        Avg range: <span style="color:var(--text2)">${avgLunch!=null?fmt(avgLunch)+'%':'—'}${spy&&avgLunch?' ($'+(spy*avgLunch/100).toFixed(2)+')':''}</span>.
        Tight compression here often precedes an afternoon vol expansion.
      </div>
    </div>

  </div>

  <!-- Recent Sessions Table -->
  <div class="stat-box" style="padding:14px;margin-bottom:12px;">
    <div class="es-section" style="margin-bottom:10px;">RECENT SESSIONS (LAST 20) — TIMES IN CT</div>
    <div style="overflow-x:auto;">
      <table class="data-table" style="font-size:11px;">
        <thead><tr>
          <th style="text-align:left">DATE</th>
          <th>GAP %</th><th>TYPE</th><th>OR WIDTH</th>
          <th>GAP FILL</th><th>OR BREAK</th>
          <th>PWR HR</th><th>DAY O→C</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>

  <!-- Pattern Playbook -->
  <div class="stat-box" style="padding:14px;margin-bottom:12px;">
    <div class="es-section" style="margin-bottom:8px;">PATTERN PLAYBOOK</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
      <div>
        <div style="font-size:11px;color:var(--cyan);margin-bottom:6px;">FADE THE OPEN</div>
        <div style="font-size:11px;color:var(--text2);line-height:1.7;">
          Early moves (first 15 min) reverse by EOD
          ${Math.round(((rev15.up_rev+rev15.dn_rev)/rev15.total)*100)}% of the time.
          The weaker signal is an early ${rev15.dn_rev>rev15.up_rev?'flush down':'rip up'} —
          those reverse ${rev15.dn_rev>rev15.up_rev
            ? Math.round(rev15.dn_rev/(rev15.dn_hold+rev15.dn_rev)*100)
            : Math.round(rev15.up_rev/(rev15.up_hold+rev15.up_rev)*100)}% of the time.
        </div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--cyan);margin-bottom:6px;">OR BREAKOUT TRADE</div>
        <div style="font-size:11px;color:var(--text2);line-height:1.7;">
          Clean OR breaks (8:30–9:00 CT) that close in the direction of the break happen
          ${orBreakUp.length>orBreakDown.length
            ? Math.round(orBreakUpHolds.length/orBreakUp.length*100)
            : Math.round(orBreakDownHolds.length/orBreakDown.length*100)}% of the time.
          Most breaks occur by ${topORB[0]?(()=>{const t=topORB[0][0];const h=parseInt(t),min=t.split(':')[1];const ap=h>=12?'PM':'AM';const h12=h%12||12;return `${h12}:${min} ${ap} CT`;})():'—'}.
        </div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--cyan);margin-bottom:6px;">COMPRESSION → EXPANSION</div>
        <div style="font-size:11px;color:var(--text2);line-height:1.7;">
          When the lunch lull (10:30 AM–noon CT) range is tighter than avg
          (${avgLunch!=null?fmt(avgLunch)+'%':'—'}${spy&&avgLunch?' / $'+(spy*avgLunch/100).toFixed(2):''}),
          watch for a vol expansion into early afternoon. Low range = coiled spring.
        </div>
      </div>
    </div>
  </div>

</div>`;

    // Flash refresh dot green briefly
    const dot=document.getElementById('intradayRefreshDot');
    if(dot){ dot.style.background='var(--green)'; setTimeout(()=>{ dot.style.background='var(--text3)'; },800); }
  }

  // ── KPI card ──────────────────────────────────────────────────────────────
  function kpi(label,val,rawVal,sub) {
    const color=rawVal==null?'var(--text2)':rawVal>=0?'var(--green)':'var(--red)';
    return `<div class="stat-box" style="padding:10px;text-align:center;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:4px">${label}</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:17px;color:${color}">${val}</div>
      ${sub?`<div style="font-size:9px;color:var(--text3);margin-top:2px">${sub}</div>`:''}
    </div>`;
  }

  // ── Hook into live refresh cycle ──────────────────────────────────────────
  // Patch refreshLiveData so intraday tab re-renders on every dashboard refresh
  const _origRefresh = window.refreshLiveData;
  window.refreshLiveData = async function(...args) {
    const result = typeof _origRefresh==='function' ? await _origRefresh(...args) : undefined;
    // Only re-render if intraday panel is currently visible
    const panel = document.getElementById('panel-intraday');
    if (panel && panel.classList.contains('active')) {
      renderIntraday();
    }
    return result;
  };

  // ── Hook into tab switch ───────────────────────────────────────────────────
  const _origSwitch = window.switchTab;
  window.switchTab = function(name) {
    if (typeof _origSwitch==='function') _origSwitch(name);
    if (name==='intraday') setTimeout(renderIntraday, 50);
  };

  document.addEventListener('DOMContentLoaded', function() {
    const panel=document.getElementById('panel-intraday');
    if (panel&&panel.classList.contains('active')) renderIntraday();
  });

})();
