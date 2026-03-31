/**
 * intraday.js — SPY Intraday Analytics Tab
 * Reads from INTRADAY_SESSION_STATS (exported by fetch_and_analyze.py as intraday_data.js)
 * Displays: gap stats, opening range stats, time-of-day heatmap, best/worst times,
 *           initial move analysis, power hour, lunch lull, pre-move patterns.
 */

(function () {
  'use strict';

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fmt  = (v, d = 2) => v == null ? '—' : Number(v).toFixed(d);
  const fmtp = (v, d = 2) => v == null ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(d) + '%';
  const cls  = (v) => v == null ? '' : v >= 0 ? 'up' : 'down';
  const pct  = (n, d) => d ? Math.round(n / d * 100) : 0;

  // ── Data guard ─────────────────────────────────────────────────────────────
  function getData() {
    if (typeof INTRADAY_SESSION_STATS === 'undefined' || !INTRADAY_SESSION_STATS.length) return null;
    return INTRADAY_SESSION_STATS;
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

    const n = raw.length;
    const latest = raw[0];

    // ── Aggregate stats ────────────────────────────────────────────────────
    const gapUp   = raw.filter(d => d.gap_type === 'GAP_UP');
    const gapDown = raw.filter(d => d.gap_type === 'GAP_DOWN');
    const flat    = raw.filter(d => d.gap_type === 'FLAT');

    const gapUpFilled   = gapUp.filter(d => d.gap_filled === 1);
    const gapDownFilled = gapDown.filter(d => d.gap_filled === 1);

    const withOR = raw.filter(d => d.or_range != null);
    const avgOR  = withOR.length ? (withOR.reduce((s, d) => s + d.or_range, 0) / withOR.length) : null;

    const orBreakUp   = raw.filter(d => d.or_break_dir === 'UP');
    const orBreakDown = raw.filter(d => d.or_break_dir === 'DOWN');
    const noBreak     = raw.filter(d => d.or_break_dir == null);

    // After OR break UP, how often does day close above OR high?
    const orBreakUpHolds = orBreakUp.filter(d => d.close_price > d.or_high);
    const orBreakDownHolds = orBreakDown.filter(d => d.close_price < d.or_low);

    // Initial move continuation
    const initUp   = raw.filter(d => d.initial_move_dir === 'UP');
    const initDown = raw.filter(d => d.initial_move_dir === 'DOWN');
    const initUpCont   = initUp.filter(d => d.close_price > d.open_price);
    const initDownCont = initDown.filter(d => d.close_price < d.open_price);

    // Power hour
    const phUp   = raw.filter(d => d.power_hour_dir === 'UP');
    const phDown = raw.filter(d => d.power_hour_dir === 'DOWN');
    const avgPH  = raw.filter(d => d.power_hour_pct != null);
    const avgPHpct = avgPH.length ? avgPH.reduce((s, d) => s + d.power_hour_pct, 0) / avgPH.length : null;

    // Lunch range
    const withLunch = raw.filter(d => d.lunch_range_pct != null);
    const avgLunch  = withLunch.length ? withLunch.reduce((s, d) => s + d.lunch_range_pct, 0) / withLunch.length : null;

    // Avg day range
    const avgRange = raw.filter(d => d.day_range_pct != null);
    const avgRangePct = avgRange.length ? avgRange.reduce((s, d) => s + d.day_range_pct, 0) / avgRange.length : null;

    // Best/worst 5m time histogram
    const bestTimes  = {};
    const worstTimes = {};
    raw.forEach(d => {
      if (d.best_5m_time)  bestTimes[d.best_5m_time]  = (bestTimes[d.best_5m_time]  || 0) + 1;
      if (d.worst_5m_time) worstTimes[d.worst_5m_time] = (worstTimes[d.worst_5m_time] || 0) + 1;
    });

    const topBestTimes  = Object.entries(bestTimes).sort((a,b) => b[1]-a[1]).slice(0,5);
    const topWorstTimes = Object.entries(worstTimes).sort((a,b) => b[1]-a[1]).slice(0,5);

    // Gap-by-gap-type avg fill time (hours:mins approximation)
    function avgFillBucket(arr) {
      const filled = arr.filter(d => d.gap_fill_time);
      if (!filled.length) return null;
      // Convert "HH:MM" to minutes since 09:30
      const mins = filled.map(d => {
        const [h, m] = d.gap_fill_time.split(':').map(Number);
        return (h * 60 + m) - (9 * 60 + 30);
      });
      const avg = mins.reduce((s, v) => s + v, 0) / mins.length;
      const h = Math.floor((avg + 9*60+30) / 60);
      const m = Math.round((avg + 9*60+30) % 60);
      return `${h}:${m.toString().padStart(2,'0')}`;
    }

    // OR break timing
    const orBreakTimes = {};
    raw.filter(d => d.or_break_time).forEach(d => {
      // Bucket into 30-min windows
      const [h, m] = d.or_break_time.split(':').map(Number);
      const bucket = m < 30 ? `${h}:00` : `${h}:30`;
      orBreakTimes[bucket] = (orBreakTimes[bucket] || 0) + 1;
    });
    const topORBreakTimes = Object.entries(orBreakTimes).sort((a,b) => b[1]-a[1]).slice(0,5);

    // ── Build recent session table (last 20) ───────────────────────────────
    const recentRows = raw.slice(0, 20).map(d => `
      <tr>
        <td style="text-align:left;color:var(--text2)">${d.date}</td>
        <td class="${cls(d.gap_pct)}">${fmtp(d.gap_pct)}</td>
        <td style="color:var(--text2);font-size:11px">${d.gap_type}</td>
        <td>${d.or_range != null ? fmt(d.or_range) + '%' : '—'}</td>
        <td style="color:${d.gap_filled === 1 ? 'var(--green)' : d.gap_filled === 0 ? 'var(--red)' : 'var(--text3)'}">${d.gap_filled === 1 ? 'YES' : d.gap_filled === 0 ? 'NO' : '—'}</td>
        <td style="color:${d.or_break_dir === 'UP' ? 'var(--green)' : d.or_break_dir === 'DOWN' ? 'var(--red)' : 'var(--text3)'}">${d.or_break_dir || 'NONE'}</td>
        <td style="color:${d.power_hour_dir === 'UP' ? 'var(--green)' : 'var(--red)'}">${d.power_hour_pct != null ? fmtp(d.power_hour_pct) : '—'}</td>
        <td class="${cls(d.close_price - d.open_price)}">${d.open_price && d.close_price ? fmtp((d.close_price - d.open_price)/d.open_price*100) : '—'}</td>
      </tr>`).join('');

    // ── Best/worst times bar chart (text-based) ────────────────────────────
    function timeBar(label, count, maxCount, color) {
      const w = Math.round(count / maxCount * 120);
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);width:42px">${label}</span>
        <div style="width:${w}px;height:10px;background:${color};border-radius:2px;"></div>
        <span style="font-size:10px;color:var(--text3)">${count}x</span>
      </div>`;
    }

    const maxBest  = topBestTimes.length  ? topBestTimes[0][1]  : 1;
    const maxWorst = topWorstTimes.length ? topWorstTimes[0][1] : 1;
    const maxORB   = topORBreakTimes.length ? topORBreakTimes[0][1] : 1;

    const bestBars  = topBestTimes.map(([t,c])  => timeBar(t, c, maxBest,  'var(--green)')).join('');
    const worstBars = topWorstTimes.map(([t,c]) => timeBar(t, c, maxWorst, 'var(--red)')).join('');
    const orbBars   = topORBreakTimes.map(([t,c]) => timeBar(t, c, maxORB, 'var(--cyan)')).join('');

    // ── Gap pct distribution bucketing ────────────────────────────────────
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
        <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text2);width:100px;text-align:right">${label}</span>
        <div style="width:${w}px;height:12px;background:${color};border-radius:2px;opacity:0.8;"></div>
        <span style="font-size:10px;color:var(--text3)">${count}d (${pct(count,n)}%)</span>
      </div>`;
    }).join('');

    // ── Data age indicator ─────────────────────────────────────────────────
    const latestDate = latest.date;
    const daysOld = Math.round((new Date() - new Date(latestDate)) / 86400000);
    const dataAge = daysOld <= 1 ? '🟢 Current' : daysOld <= 3 ? `🟡 ${daysOld}d old` : `🔴 ${daysOld}d old`;

    // ── Render ─────────────────────────────────────────────────────────────
    el.innerHTML = `
<div style="padding:12px 16px;max-width:1200px;margin:0 auto;">

  <!-- Header -->
  <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
    <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);">INTRADAY ANALYTICS</div>
    <div style="font-size:10px;color:var(--text3);">${n} sessions · Latest: ${latestDate} · ${dataAge}</div>
  </div>

  <!-- Top KPI row -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:16px;">
    ${kpiCard('AVG DAY RANGE', fmtp(avgRangePct), null, 'intraday move from H to L')}
    ${kpiCard('AVG OR RANGE', avgOR != null ? fmt(avgOR) + '%' : '—', null, 'first 30-min range')}
    ${kpiCard('GAP UP FILL', gapUp.length ? Math.round(gapUpFilled.length/gapUp.length*100)+'%' : '—', null, `${gapUpFilled.length}/${gapUp.length} gaps filled`)}
    ${kpiCard('GAP DOWN FILL', gapDown.length ? Math.round(gapDownFilled.length/gapDown.length*100)+'%' : '—', null, `${gapDownFilled.length}/${gapDown.length} gaps filled`)}
    ${kpiCard('OR BREAK UP', raw.length ? Math.round(orBreakUp.length/raw.length*100)+'%' : '—', null, `holds: ${orBreakUp.length ? Math.round(orBreakUpHolds.length/orBreakUp.length*100)+'%' : '—'}`)}
    ${kpiCard('OR BREAK DOWN', raw.length ? Math.round(orBreakDown.length/raw.length*100)+'%' : '—', null, `holds: ${orBreakDown.length ? Math.round(orBreakDownHolds.length/orBreakDown.length*100)+'%' : '—'}`)}
    ${kpiCard('AVG POWER HOUR', fmtp(avgPHpct), avgPHpct, `UP ${phUp.length}d / DN ${phDown.length}d`)}
    ${kpiCard('AVG LUNCH RANGE', avgLunch != null ? fmt(avgLunch) + '%' : '—', null, 'low vol compression window')}
  </div>

  <!-- Two column layout -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">

    <!-- Gap Analysis -->
    <div class="stat-box" style="padding:14px;">
      <div class="es-section" style="margin-bottom:10px;">GAP ANALYSIS</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
        <div style="text-align:center;">
          <div style="font-size:18px;font-family:'Share Tech Mono',monospace;color:var(--green)">${gapUp.length}</div>
          <div style="font-size:9px;color:var(--text3);letter-spacing:1px">GAP UP</div>
          <div style="font-size:10px;color:var(--text2)">${pct(gapUp.length,n)}%</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:18px;font-family:'Share Tech Mono',monospace;color:var(--text3)">${flat.length}</div>
          <div style="font-size:9px;color:var(--text3);letter-spacing:1px">FLAT</div>
          <div style="font-size:10px;color:var(--text2)">${pct(flat.length,n)}%</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:18px;font-family:'Share Tech Mono',monospace;color:var(--red)">${gapDown.length}</div>
          <div style="font-size:9px;color:var(--text3);letter-spacing:1px">GAP DOWN</div>
          <div style="font-size:10px;color:var(--text2)">${pct(gapDown.length,n)}%</div>
        </div>
      </div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:6px;letter-spacing:1px">GAP SIZE DISTRIBUTION</div>
      ${gapBucketRows}
      <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <div style="font-size:11px;color:var(--text2)">Gap Up avg fill time: <span style="color:var(--cyan)">${avgFillBucket(gapUp) || '—'}</span></div>
        <div style="font-size:11px;color:var(--text2)">Gap Down avg fill time: <span style="color:var(--cyan)">${avgFillBucket(gapDown) || '—'}</span></div>
      </div>
    </div>

    <!-- Opening Range -->
    <div class="stat-box" style="padding:14px;">
      <div class="es-section" style="margin-bottom:10px;">OPENING RANGE (0–30 MIN)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
        ${statRow2('Avg OR Range', avgOR != null ? fmt(avgOR)+'%' : '—')}
        ${statRow2('Breaks UP', orBreakUp.length + ' (' + pct(orBreakUp.length,n) + '%)')}
        ${statRow2('Breaks DOWN', orBreakDown.length + ' (' + pct(orBreakDown.length,n) + '%)')}
        ${statRow2('No Break', noBreak.length + ' (' + pct(noBreak.length,n) + '%)')}
        ${statRow2('Break UP → Close Above', orBreakUp.length ? Math.round(orBreakUpHolds.length/orBreakUp.length*100)+'%' : '—')}
        ${statRow2('Break DOWN → Close Below', orBreakDown.length ? Math.round(orBreakDownHolds.length/orBreakDown.length*100)+'%' : '—')}
      </div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:6px;letter-spacing:1px">TOP OR BREAK TIMES (30-MIN BUCKETS)</div>
      ${orbBars || '<div style="font-size:11px;color:var(--text3)">Not enough data yet</div>'}
    </div>

  </div>

  <!-- Three column: Initial Move, Best Times, Worst Times -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">

    <!-- Initial Move -->
    <div class="stat-box" style="padding:14px;">
      <div class="es-section" style="margin-bottom:10px;">INITIAL MOVE (FIRST 15 MIN)</div>
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:11px;color:var(--text2)">Opens UP</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--green)">${initUp.length} (${pct(initUp.length,n)}%)</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:11px;color:var(--text2)">→ Continues UP (day)</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--cyan)">${initUp.length ? Math.round(initUpCont.length/initUp.length*100)+'%' : '—'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:11px;color:var(--text2)">Opens DOWN</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--red)">${initDown.length} (${pct(initDown.length,n)}%)</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:11px;color:var(--text2)">→ Continues DOWN (day)</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--cyan)">${initDown.length ? Math.round(initDownCont.length/initDown.length*100)+'%' : '—'}</span>
        </div>
      </div>
      <div style="font-size:10px;color:var(--text3);letter-spacing:1px;margin-bottom:6px">CONTINUATION EDGE</div>
      <div style="font-size:11px;color:var(--text2)">
        When price opens ${initUp.length > initDown.length ? 'up' : 'down'} in first 15 min,
        it continues in that direction to close <span style="color:var(--cyan)">
        ${initUp.length > initDown.length
          ? (initUp.length ? Math.round(initUpCont.length/initUp.length*100) : '—')
          : (initDown.length ? Math.round(initDownCont.length/initDown.length*100) : '—')}%
        </span> of the time.
      </div>
    </div>

    <!-- Best Times -->
    <div class="stat-box" style="padding:14px;">
      <div class="es-section" style="margin-bottom:10px;">🟢 BEST MOVE TIMES</div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:8px;">Times of day with most frequent largest up-bars</div>
      ${bestBars || '<div style="font-size:11px;color:var(--text3)">Not enough data yet</div>'}
      <div style="margin-top:12px;font-size:10px;color:var(--text3);letter-spacing:1px">POWER HOUR (15:00–16:00)</div>
      <div style="margin-top:4px;display:flex;justify-content:space-between;">
        <span style="font-size:11px;color:var(--text2)">UP days</span>
        <span style="font-family:'Share Tech Mono',monospace;color:var(--green)">${phUp.length} (${pct(phUp.length,n)}%)</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="font-size:11px;color:var(--text2)">Avg PH move</span>
        <span style="font-family:'Share Tech Mono',monospace;color:${(avgPHpct||0)>=0?'var(--green)':'var(--red)'}">${fmtp(avgPHpct)}</span>
      </div>
    </div>

    <!-- Worst Times -->
    <div class="stat-box" style="padding:14px;">
      <div class="es-section" style="margin-bottom:10px;">🔴 WORST MOVE TIMES</div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:8px;">Times of day with most frequent largest down-bars</div>
      ${worstBars || '<div style="font-size:11px;color:var(--text3)">Not enough data yet</div>'}
      <div style="margin-top:12px;font-size:10px;color:var(--text3);letter-spacing:1px">LUNCH LULL (11:30–13:00)</div>
      <div style="margin-top:4px;display:flex;justify-content:space-between;">
        <span style="font-size:11px;color:var(--text2)">Avg range</span>
        <span style="font-family:'Share Tech Mono',monospace;color:var(--text2)">${avgLunch != null ? fmt(avgLunch)+'%' : '—'}</span>
      </div>
      <div style="font-size:10px;color:var(--text3);margin-top:4px;">Lower range = liquidity dry-up, potential setup window before PM move</div>
    </div>

  </div>

  <!-- Recent Sessions Table -->
  <div class="stat-box" style="padding:14px;margin-bottom:12px;">
    <div class="es-section" style="margin-bottom:10px;">RECENT SESSIONS (LAST 20)</div>
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

  <!-- Pre-move compression note -->
  <div class="stat-box" style="padding:14px;margin-bottom:12px;">
    <div class="es-section" style="margin-bottom:8px;">PRE-MOVE PATTERNS — WHAT TO WATCH FOR</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
      <div>
        <div style="font-size:11px;color:var(--cyan);margin-bottom:4px;">TIGHT RANGE → EXPANSION</div>
        <div style="font-size:11px;color:var(--text2);line-height:1.6">
          When the lunch lull (11:30–1pm) produces a range &lt; avg (${avgLunch != null ? fmt(avgLunch)+'%' : '—'}),
          watch for a vol spike break in early PM. Compression precedes expansion.
        </div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--cyan);margin-bottom:4px;">OPENING RANGE SETUP</div>
        <div style="font-size:11px;color:var(--text2);line-height:1.6">
          The OR (9:30–10:00) defines the day's initial battleground.
          A clean break of OR ${orBreakUp.length > orBreakDown.length ? 'to the upside' : 'to the downside'}
          has held ${orBreakUp.length > orBreakDown.length
            ? (orBreakUp.length ? Math.round(orBreakUpHolds.length/orBreakUp.length*100)+'%' : '—')
            : (orBreakDown.length ? Math.round(orBreakDownHolds.length/orBreakDown.length*100)+'%' : '—')}
          of the time.
        </div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--cyan);margin-bottom:4px;">DATA ACCUMULATION</div>
        <div style="font-size:11px;color:var(--text2);line-height:1.6">
          ${n} sessions collected. Patterns become statistically meaningful above 60 sessions.
          The pipeline saves 1-min and 5-min bars daily — check back as the DB grows.
        </div>
      </div>
    </div>
  </div>

</div>`;
  }

  // ── Small component helpers ────────────────────────────────────────────────
  function kpiCard(label, val, raw, sub) {
    const color = raw == null ? 'var(--text2)' : raw >= 0 ? 'var(--green)' : 'var(--red)';
    return `<div class="stat-box" style="padding:10px;text-align:center;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:4px">${label}</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:17px;color:${color}">${val}</div>
      ${sub ? `<div style="font-size:9px;color:var(--text3);margin-top:2px">${sub}</div>` : ''}
    </div>`;
  }

  function statRow2(label, val) {
    return `<div>
      <div style="font-size:9px;color:var(--text3);letter-spacing:1px">${label}</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--text2)">${val}</div>
    </div>`;
  }

  // ── Tab switch hook ────────────────────────────────────────────────────────
  // Piggyback on the existing switchTab function
  const _origSwitch = window.switchTab;
  window.switchTab = function (name) {
    if (typeof _origSwitch === 'function') _origSwitch(name);
    if (name === 'intraday') {
      // Small defer so the panel is visible before we paint
      setTimeout(renderIntraday, 50);
    }
  };

  // Also render if the tab is somehow already active on load
  document.addEventListener('DOMContentLoaded', function () {
    const panel = document.getElementById('panel-intraday');
    if (panel && panel.classList.contains('active')) {
      renderIntraday();
    }
  });

})();
