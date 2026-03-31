/**
 * intraday_data.js — SPY Intraday Analytics Tab
 * Reads INTRADAY_SESSION_STATS from intraday_library.js
 */

(function () {
  'use strict';

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fmt   = (v, d = 2) => v == null ? '—' : Number(v).toFixed(d);
  const fmtp  = (v, d = 2) => v == null ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(d) + '%';
  const fmtd  = (v) => v == null ? '' : '$' + Math.abs(v).toFixed(2);  // dollar amount
  const cls   = (v) => v == null ? '' : v >= 0 ? 'up' : 'down';
  const pct   = (n, d) => d ? Math.round(n / d * 100) : 0;

  // Get current SPY price from live dashboard data
  function getSPYPrice() {
    return window._md?.quotes?.['SPY']?.price
        || window._spyIntraday?.close
        || null;
  }

  // Format pct + dollar equivalent: "+0.98% · $6.21"
  function fmtPD(pctVal, spy, sign = true) {
    if (pctVal == null) return '—';
    const pStr = (sign ? (pctVal >= 0 ? '+' : '') : '') + Number(pctVal).toFixed(2) + '%';
    if (!spy) return pStr;
    const dVal = Math.abs(spy * pctVal / 100);
    return `${pStr} <span style="color:var(--text3);font-size:0.85em">·&thinsp;$${dVal.toFixed(2)}</span>`;
  }

  // Convert ET "HH:MM" timestamp → CT display string
  // ET bars are stored as ET; CT = ET - 1hr
  function etToCT(t) {
    if (!t || !t.includes(':')) return t;
    let [h, m] = t.split(':').map(Number);
    h -= 1;
    if (h < 0) h += 24;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 || 12;
    return `${h12}:${String(m).padStart(2,'0')} CT`;
  }

  // Convert ET "HH:MM" → CT for display in tables (short form)
  function etToCTShort(t) {
    if (!t || !t.includes(':')) return t || '—';
    let [h, m] = t.split(':').map(Number);
    h -= 1;
    if (h < 0) h += 24;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 || 12;
    return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
  }

  // ── Data guard ─────────────────────────────────────────────────────────────
  function getData() {
    if (typeof INTRADAY_SESSION_STATS === 'undefined' || !INTRADAY_SESSION_STATS.length) return null;
    return INTRADAY_SESSION_STATS;
  }

  // ── Trading days since date (skip weekends) ────────────────────────────────
  function tradingDaysSince(dateStr) {
    const start = new Date(dateStr + 'T12:00:00');
    const end   = new Date();
    let count = 0;
    const cur = new Date(start);
    cur.setDate(cur.getDate() + 1);
    while (cur <= end) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  // ── Main render ───────────────────────────────────────────────────────────
  function renderIntraday() {
    const el = document.getElementById('intradayContent');
    if (!el) return;

    const raw = getData();
    if (!raw) {
      el.innerHTML = `<div class="no-data" style="padding:40px;text-align:center;">
        <div style="font-size:13px;color:var(--text3);margin-bottom:8px;">NO INTRADAY DATA YET</div>
        <div style="font-size:11px;color:var(--text3);">Data accumulates daily after the pipeline runs.<br>Check back after market close.</div>
      </div>`;
      return;
    }

    const spy = getSPYPrice(); // live SPY price for dollar conversions
    const n   = raw.length;
    const latest = raw[0];

    // ── Aggregate stats ────────────────────────────────────────────────────
    const gapUp   = raw.filter(d => d.gap_type === 'GAP_UP');
    const gapDown = raw.filter(d => d.gap_type === 'GAP_DOWN');
    const flat    = raw.filter(d => d.gap_type === 'FLAT');

    const gapUpFilled   = gapUp.filter(d => d.gap_filled === 1);
    const gapDownFilled = gapDown.filter(d => d.gap_filled === 1);

    const withOR   = raw.filter(d => d.or_range != null);
    const avgOR    = withOR.length ? withOR.reduce((s,d) => s + d.or_range, 0) / withOR.length : null;

    const orBreakUp    = raw.filter(d => d.or_break_dir === 'UP');
    const orBreakDown  = raw.filter(d => d.or_break_dir === 'DOWN');
    const noBreak      = raw.filter(d => d.or_break_dir == null);
    const orBreakUpHolds   = orBreakUp.filter(d => d.close_price > d.or_high);
    const orBreakDownHolds = orBreakDown.filter(d => d.close_price < d.or_low);

    const initUp   = raw.filter(d => d.initial_move_dir === 'UP');
    const initDown = raw.filter(d => d.initial_move_dir === 'DOWN');
    const initUpCont   = initUp.filter(d => d.close_price > d.open_price);
    const initDownCont = initDown.filter(d => d.close_price < d.open_price);

    const phUp  = raw.filter(d => d.power_hour_dir === 'UP');
    const phDown= raw.filter(d => d.power_hour_dir === 'DOWN');
    const avgPH = raw.filter(d => d.power_hour_pct != null);
    const avgPHpct = avgPH.length ? avgPH.reduce((s,d) => s + d.power_hour_pct, 0) / avgPH.length : null;

    const withLunch  = raw.filter(d => d.lunch_range_pct != null);
    const avgLunch   = withLunch.length ? withLunch.reduce((s,d) => s + d.lunch_range_pct, 0) / withLunch.length : null;

    const avgRangeArr = raw.filter(d => d.day_range_pct != null);
    const avgRangePct = avgRangeArr.length ? avgRangeArr.reduce((s,d) => s + d.day_range_pct, 0) / avgRangeArr.length : null;

    // Best/worst 5m times histogram
    const bestTimes = {}; const worstTimes = {};
    raw.forEach(d => {
      if (d.best_5m_time)  bestTimes[d.best_5m_time]  = (bestTimes[d.best_5m_time]  || 0) + 1;
      if (d.worst_5m_time) worstTimes[d.worst_5m_time] = (worstTimes[d.worst_5m_time] || 0) + 1;
    });
    const topBestTimes  = Object.entries(bestTimes).sort((a,b) => b[1]-a[1]).slice(0,5);
    const topWorstTimes = Object.entries(worstTimes).sort((a,b) => b[1]-a[1]).slice(0,5);

    // Average gap fill time
    function avgFillBucket(arr) {
      const filled = arr.filter(d => d.gap_fill_time);
      if (!filled.length) return null;
      const mins = filled.map(d => {
        const [h, m] = d.gap_fill_time.split(':').map(Number);
        return (h * 60 + m) - (9 * 60 + 30); // minutes after ET open
      });
      const avg = mins.reduce((s,v) => s + v, 0) / mins.length;
      const totalMins = avg + 9*60+30;
      // Convert ET → CT (-1hr)
      const ctMins = totalMins - 60;
      const h = Math.floor(ctMins / 60);
      const m = Math.round(ctMins % 60);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12  = h % 12 || 12;
      return `${h12}:${String(m).padStart(2,'0')} ${ampm} CT`;
    }

    // OR break timing buckets (ET → CT)
    const orBreakTimes = {};
    raw.filter(d => d.or_break_time).forEach(d => {
      let [h, m] = d.or_break_time.split(':').map(Number);
      h -= 1; // ET → CT
      const bucket = m < 30 ? `${h}:00` : `${h}:30`;
      orBreakTimes[bucket] = (orBreakTimes[bucket] || 0) + 1;
    });
    const topORBreakTimes = Object.entries(orBreakTimes).sort((a,b) => b[1]-a[1]).slice(0,5);

    // ── Recent sessions table ─────────────────────────────────────────────
    const recentRows = raw.slice(0, 20).map(d => {
      const dayOC = d.open_price && d.close_price ? (d.close_price - d.open_price) / d.open_price * 100 : null;
      const dayOCdol = dayOC != null && d.open_price ? Math.abs(d.close_price - d.open_price) : null;
      return `
      <tr>
        <td style="text-align:left;color:var(--text2)">${d.date}</td>
        <td class="${cls(d.gap_pct)}">${fmtp(d.gap_pct)}</td>
        <td style="color:var(--text2);font-size:10px">${d.gap_type === 'GAP_UP' ? '▲ UP' : d.gap_type === 'GAP_DOWN' ? '▼ DN' : '— FLAT'}</td>
        <td>${d.or_range != null ? fmt(d.or_range) + '%' : '—'}</td>
        <td style="color:${d.gap_filled === 1 ? 'var(--green)' : d.gap_filled === 0 ? 'var(--red)' : 'var(--text3)'}">
          ${d.gap_filled === 1 ? '✓ YES' : d.gap_filled === 0 ? '✗ NO' : '—'}
        </td>
        <td style="color:${d.or_break_dir === 'UP' ? 'var(--green)' : d.or_break_dir === 'DOWN' ? 'var(--red)' : 'var(--text3)'}">
          ${d.or_break_dir === 'UP' ? '▲ UP' : d.or_break_dir === 'DOWN' ? '▼ DN' : 'HELD'}
          ${d.or_break_time ? `<span style="color:var(--text3);font-size:9px"> @${etToCTShort(d.or_break_time)}</span>` : ''}
        </td>
        <td style="color:${d.power_hour_dir === 'UP' ? 'var(--green)' : d.power_hour_dir === 'DOWN' ? 'var(--red)' : 'var(--text3)'}">
          ${d.power_hour_pct != null ? fmtp(d.power_hour_pct) : '—'}
        </td>
        <td class="${cls(dayOC)}">
          ${dayOC != null ? fmtp(dayOC) : '—'}
          ${dayOCdol != null ? `<span style="color:var(--text3);font-size:9px"> $${dayOCdol.toFixed(2)}</span>` : ''}
        </td>
      </tr>`;
    }).join('');

    // ── Bar chart helper ───────────────────────────────────────────────────
    function timeBar(label, count, maxCount, color) {
      const w = Math.round(count / maxCount * 120);
      // label is already in CT (converted above for OR break; best/worst come from ET storage)
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);width:52px">${label}</span>
        <div style="width:${w}px;height:10px;background:${color};border-radius:2px;"></div>
        <span style="font-size:10px;color:var(--text3)">${count}x</span>
      </div>`;
    }

    const maxBest  = topBestTimes.length  ? topBestTimes[0][1]  : 1;
    const maxWorst = topWorstTimes.length ? topWorstTimes[0][1] : 1;
    const maxORB   = topORBreakTimes.length ? topORBreakTimes[0][1] : 1;

    // Best/worst times: stored as ET HH:MM → convert to CT for display
    const bestBars  = topBestTimes.map(([t,c])  => timeBar(etToCT(t), c, maxBest,  'var(--green)')).join('');
    const worstBars = topWorstTimes.map(([t,c]) => timeBar(etToCT(t), c, maxWorst, 'var(--red)')).join('');
    // OR break buckets already converted to CT above
    const orbBars   = topORBreakTimes.map(([t,c]) => {
      const ampm = parseInt(t) >= 12 ? 'PM' : 'AM';
      const h12  = parseInt(t) % 12 || 12;
      const label = `${h12}:${t.split(':')[1]} ${ampm}`;
      return timeBar(label, c, maxORB, 'var(--cyan)');
    }).join('');

    // ── Gap distribution ───────────────────────────────────────────────────
    const gapBuckets = { '>1%': 0, '0.5–1%': 0, '0.25–0.5%': 0, 'FLAT': 0, '-0.25 to -0.5%': 0, '-0.5 to -1%': 0, '<-1%': 0 };
    raw.forEach(d => {
      const g = d.gap_pct;
      if      (g >  1.0)  gapBuckets['>1%']++;
      else if (g >  0.5)  gapBuckets['0.5–1%']++;
      else if (g >  0.25) gapBuckets['0.25–0.5%']++;
      else if (g >= -0.25) gapBuckets['FLAT']++;
      else if (g >= -0.5) gapBuckets['-0.25 to -0.5%']++;
      else if (g >= -1.0) gapBuckets['-0.5 to -1%']++;
      else                gapBuckets['<-1%']++;
    });
    const maxGB = Math.max(...Object.values(gapBuckets), 1);
    const gapBucketRows = Object.entries(gapBuckets).map(([label, count]) => {
      const w = Math.round(count / maxGB * 100);
      const isUp = label.startsWith('>') || label.startsWith('0');
      const color = label === 'FLAT' ? 'var(--text3)' : isUp ? 'var(--green)' : 'var(--red)';
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
        <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text2);width:110px;text-align:right">${label}</span>
        <div style="width:${w}px;height:12px;background:${color};border-radius:2px;opacity:0.8;"></div>
        <span style="font-size:10px;color:var(--text3)">${count}d (${pct(count,n)}%)</span>
      </div>`;
    }).join('');

    // ── Data age (trading days, not calendar days) ─────────────────────────
    const latestDate = latest.date;
    const tdaysOld   = tradingDaysSince(latestDate);
    const dataAge    = tdaysOld === 0 ? '🟢 Updated today'
                     : tdaysOld === 1 ? '🟡 1 trading day old'
                     : `🔴 ${tdaysOld} trading days old`;

    // ── Dollar helpers for KPI cards ───────────────────────────────────────
    const spyLabel = spy ? ` <span style="font-size:9px;color:var(--text3)">≈ $${(spy * Math.abs(avgRangePct||0) / 100).toFixed(2)}</span>` : '';
    const orDolLabel = spy && avgOR ? ` <span style="font-size:9px;color:var(--text3)">≈ $${(spy * avgOR / 100).toFixed(2)}</span>` : '';
    const phDolLabel = spy && avgPHpct != null ? ` <span style="font-size:9px;color:var(--text3)">≈ $${(spy * Math.abs(avgPHpct) / 100).toFixed(2)}</span>` : '';
    const lunchDolLabel = spy && avgLunch ? ` <span style="font-size:9px;color:var(--text3)">≈ $${(spy * avgLunch / 100).toFixed(2)}</span>` : '';

    // ── Render ─────────────────────────────────────────────────────────────
    el.innerHTML = `
<div style="padding:12px 16px;max-width:1200px;margin:0 auto;">

  <!-- Header -->
  <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
    <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);">INTRADAY ANALYTICS</div>
    <div style="font-size:10px;color:var(--text3);">${n} sessions · Latest: ${latestDate} · ${dataAge}${spy ? ` · SPY $${spy.toFixed(2)}` : ''}</div>
  </div>

  <!-- Top KPI row -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:16px;">
    ${kpiCard('AVG DAY RANGE', fmtp(avgRangePct), null, `H→L move${spy && avgRangePct ? ' · $' + (spy * avgRangePct / 100).toFixed(2) : ''}`)}
    ${kpiCard('AVG OR RANGE', avgOR != null ? fmt(avgOR) + '%' : '—', null, `first 30-min${spy && avgOR ? ' · $' + (spy * avgOR / 100).toFixed(2) : ''}`)}
    ${kpiCard('GAP UP FILL', gapUp.length ? Math.round(gapUpFilled.length/gapUp.length*100)+'%' : '—', null, `${gapUpFilled.length} of ${gapUp.length} gaps filled`)}
    ${kpiCard('GAP DOWN FILL', gapDown.length ? Math.round(gapDownFilled.length/gapDown.length*100)+'%' : '—', null, `${gapDownFilled.length} of ${gapDown.length} gaps filled`)}
    ${kpiCard('OR BREAK UP', raw.length ? Math.round(orBreakUp.length/raw.length*100)+'%' : '—', null, `holds close above OR: ${orBreakUp.length ? Math.round(orBreakUpHolds.length/orBreakUp.length*100)+'%' : '—'}`)}
    ${kpiCard('OR BREAK DOWN', raw.length ? Math.round(orBreakDown.length/raw.length*100)+'%' : '—', null, `holds close below OR: ${orBreakDown.length ? Math.round(orBreakDownHolds.length/orBreakDown.length*100)+'%' : '—'}`)}
    ${kpiCard('AVG POWER HOUR', fmtp(avgPHpct), avgPHpct, `${phUp.length} up / ${phDown.length} down days${spy && avgPHpct != null ? ' · $' + (spy * Math.abs(avgPHpct) / 100).toFixed(2) : ''}`)}
    ${kpiCard('AVG LUNCH RANGE', avgLunch != null ? fmt(avgLunch) + '%' : '—', null, `compression window${spy && avgLunch ? ' · $' + (spy * avgLunch / 100).toFixed(2) : ''}`)}
  </div>

  <!-- Two column: Gap + Opening Range -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">

    <!-- Gap Analysis -->
    <div class="stat-box" style="padding:14px;">
      <div class="es-section" style="margin-bottom:10px;">GAP ANALYSIS — HOW SPY OPENS</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8;margin-bottom:12px;">
        Across ${n} sessions, SPY has gapped up <span style="color:var(--green);font-weight:bold">${gapUp.length} times (${pct(gapUp.length,n)}%)</span>,
        gapped down <span style="color:var(--red);font-weight:bold">${gapDown.length} times (${pct(gapDown.length,n)}%)</span>,
        and opened flat <span style="color:var(--text3)">${flat.length} times (${pct(flat.length,n)}%)</span>.
        Gap-ups fill <span style="color:var(--green)">${gapUp.length ? Math.round(gapUpFilled.length/gapUp.length*100) : '—'}%</span> of the time
        (avg by <span style="color:var(--cyan)">${avgFillBucket(gapUp) || '—'}</span>),
        gap-downs fill <span style="color:var(--red)">${gapDown.length ? Math.round(gapDownFilled.length/gapDown.length*100) : '—'}%</span>
        (avg by <span style="color:var(--cyan)">${avgFillBucket(gapDown) || '—'}</span>).
      </div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:6px;letter-spacing:1px;">GAP SIZE DISTRIBUTION</div>
      ${gapBucketRows}
    </div>

    <!-- Opening Range -->
    <div class="stat-box" style="padding:14px;">
      <div class="es-section" style="margin-bottom:10px;">OPENING RANGE — FIRST 30 MIN (8:30–9:00 CT)</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8;margin-bottom:12px;">
        The opening range averages <span style="color:var(--cyan)">${avgOR != null ? fmt(avgOR) + '%' : '—'}${spy && avgOR ? ' ($' + (spy * avgOR / 100).toFixed(2) + ')' : ''}</span> high-to-low.
        Price breaks above the OR high <span style="color:var(--green)">${Math.round(orBreakUp.length/n*100)}% of days</span>
        and below the OR low <span style="color:var(--red)">${Math.round(orBreakDown.length/n*100)}% of days</span>.
        When it breaks up, the day closes above the OR high <span style="color:var(--green)">${orBreakUp.length ? Math.round(orBreakUpHolds.length/orBreakUp.length*100) : '—'}%</span> of the time.
        When it breaks down, it closes below the OR low <span style="color:var(--red)">${orBreakDown.length ? Math.round(orBreakDownHolds.length/orBreakDown.length*100) : '—'}%</span> of the time.
      </div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:6px;letter-spacing:1px;">MOST COMMON OR BREAK TIMES (CT)</div>
      ${orbBars || '<div style="font-size:11px;color:var(--text3)">Not enough data yet</div>'}
      <div style="margin-top:8px;font-size:10px;color:var(--text3);">
        ${noBreak.length} sessions (${pct(noBreak.length,n)}%) never broke the opening range at all.
      </div>
    </div>

  </div>

  <!-- Three column: Initial Move, Best Times, Worst Times -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">

    <!-- Initial Move -->
    <div class="stat-box" style="padding:14px;">
      <div class="es-section" style="margin-bottom:10px;">FIRST 15 MIN DIRECTION (8:30–8:45 CT)</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8;margin-bottom:10px;">
        SPY moves up in the first 15 min <span style="color:var(--green)">${initUp.length} times (${pct(initUp.length,n)}%)</span>
        and continues higher to close <span style="color:var(--cyan)">${initUp.length ? Math.round(initUpCont.length/initUp.length*100) : '—'}%</span> of those days.
        It moves down <span style="color:var(--red)">${initDown.length} times (${pct(initDown.length,n)}%)</span>
        and closes lower <span style="color:var(--cyan)">${initDown.length ? Math.round(initDownCont.length/initDown.length*100) : '—'}%</span> of those days.
      </div>
      <div style="font-size:10px;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">EDGE SUMMARY</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.6;">
        The first 15-min direction predicts the day's close direction
        <span style="color:var(--cyan);font-weight:bold">
        ${Math.round(((initUpCont.length + initDownCont.length) / n) * 100)}%
        </span> of the time overall — a meaningful but not reliable edge.
      </div>
    </div>

    <!-- Best Times -->
    <div class="stat-box" style="padding:14px;">
      <div class="es-section" style="margin-bottom:6px;">🟢 HIGHEST VOLATILITY WINDOWS (CT)</div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:8px;">Times most often producing the largest up-moves in a 5-min window</div>
      ${bestBars || '<div style="font-size:11px;color:var(--text3)">Not enough data yet</div>'}
      <div style="margin-top:12px;font-size:10px;color:var(--text3);letter-spacing:1px;">POWER HOUR (3:00–4:00 PM CT)</div>
      <div style="margin-top:4px;font-size:11px;color:var(--text2);line-height:1.7;">
        Closes higher than it opened in the final hour
        <span style="color:var(--green)">${phUp.length} days (${pct(phUp.length,n)}%)</span>.
        Average move: <span style="color:${(avgPHpct||0)>=0?'var(--green)':'var(--red)'}">${fmtp(avgPHpct)}${spy && avgPHpct != null ? ' ($' + (spy * Math.abs(avgPHpct) / 100).toFixed(2) + ')' : ''}</span>.
      </div>
    </div>

    <!-- Worst Times -->
    <div class="stat-box" style="padding:14px;">
      <div class="es-section" style="margin-bottom:6px;">🔴 WEAKEST WINDOWS (CT)</div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:8px;">Times most often producing the largest down-moves in a 5-min window</div>
      ${worstBars || '<div style="font-size:11px;color:var(--text3)">Not enough data yet</div>'}
      <div style="margin-top:12px;font-size:10px;color:var(--text3);letter-spacing:1px;">LUNCH LULL (10:30 AM–12:00 PM CT)</div>
      <div style="margin-top:4px;font-size:11px;color:var(--text2);line-height:1.7;">
        Average range during this window:
        <span style="color:var(--text2)">${avgLunch != null ? fmt(avgLunch) + '%' : '—'}${spy && avgLunch ? ' ($' + (spy * avgLunch / 100).toFixed(2) + ')' : ''}</span>.
        Tighter-than-average compression here often precedes a vol expansion into the afternoon.
      </div>
    </div>

  </div>

  <!-- Recent Sessions Table -->
  <div class="stat-box" style="padding:14px;margin-bottom:12px;">
    <div class="es-section" style="margin-bottom:10px;">RECENT SESSIONS (LAST 20) — ALL TIMES CT</div>
    <div style="overflow-x:auto;">
      <table class="data-table" style="font-size:11px;">
        <thead><tr>
          <th style="text-align:left">DATE</th>
          <th>GAP %</th>
          <th>TYPE</th>
          <th>OR RANGE</th>
          <th>GAP FILL</th>
          <th>OR BREAK</th>
          <th>POWER HR</th>
          <th>DAY O→C</th>
        </tr></thead>
        <tbody>${recentRows}</tbody>
      </table>
    </div>
  </div>

  <!-- What to watch -->
  <div class="stat-box" style="padding:14px;margin-bottom:12px;">
    <div class="es-section" style="margin-bottom:8px;">PATTERN PLAYBOOK — WHAT TO WATCH FOR TODAY</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
      <div>
        <div style="font-size:11px;color:var(--cyan);margin-bottom:6px;letter-spacing:1px;">COMPRESSION → EXPANSION</div>
        <div style="font-size:11px;color:var(--text2);line-height:1.7;">
          When the lunch lull (10:30 AM–noon CT) produces a range tighter than the ${avgLunch != null ? fmt(avgLunch) + '%' : '—'} average${spy && avgLunch ? ' ($' + (spy * avgLunch / 100).toFixed(2) + ')' : ''},
          expect a volatility expansion into early afternoon. Low range = coiled spring.
        </div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--cyan);margin-bottom:6px;letter-spacing:1px;">OPENING RANGE TRADE</div>
        <div style="font-size:11px;color:var(--text2);line-height:1.7;">
          The OR (8:30–9:00 CT) sets the day's initial high/low boundaries.
          A clean break ${orBreakUp.length > orBreakDown.length ? 'above the OR high' : 'below the OR low'} has
          closed ${orBreakUp.length > orBreakDown.length
            ? (orBreakUp.length ? Math.round(orBreakUpHolds.length/orBreakUp.length*100) : '—')
            : (orBreakDown.length ? Math.round(orBreakDownHolds.length/orBreakDown.length*100) : '—')}%
          of days in that direction. Most breaks happen by ${topORBreakTimes[0] ? (() => {
            const t = topORBreakTimes[0][0];
            const h = parseInt(t); const min = t.split(':')[1];
            const ampm = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 || 12;
            return `${h12}:${min} ${ampm} CT`;
          })() : '—'}.
        </div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--cyan);margin-bottom:6px;letter-spacing:1px;">GAP FILL ODDS</div>
        <div style="font-size:11px;color:var(--text2);line-height:1.7;">
          Gap-ups fill ${gapUp.length ? Math.round(gapUpFilled.length/gapUp.length*100) : '—'}% of the time
          (avg fill by ${avgFillBucket(gapUp) || '—'}).
          Gap-downs fill ${gapDown.length ? Math.round(gapDownFilled.length/gapDown.length*100) : '—'}% of the time
          (avg fill by ${avgFillBucket(gapDown) || '—'}).
          Larger gaps fill less reliably — watch the distribution above.
        </div>
      </div>
    </div>
  </div>

</div>`;
  }

  // ── KPI card helper ────────────────────────────────────────────────────────
  function kpiCard(label, val, rawVal, sub) {
    const color = rawVal == null ? 'var(--text2)' : rawVal >= 0 ? 'var(--green)' : 'var(--red)';
    return `<div class="stat-box" style="padding:10px;text-align:center;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:4px">${label}</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:17px;color:${color}">${val}</div>
      ${sub ? `<div style="font-size:9px;color:var(--text3);margin-top:2px">${sub}</div>` : ''}
    </div>`;
  }

  // ── Tab switch hook ────────────────────────────────────────────────────────
  const _origSwitch = window.switchTab;
  window.switchTab = function (name) {
    if (typeof _origSwitch === 'function') _origSwitch(name);
    if (name === 'intraday') {
      setTimeout(renderIntraday, 50);
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    const panel = document.getElementById('panel-intraday');
    if (panel && panel.classList.contains('active')) {
      renderIntraday();
    }
  });

})();
