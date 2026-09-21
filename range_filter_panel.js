(function () {
  const S = { era: '3y' };
  const CLS = { wide: { l: 'WIDE', c: 'var(--green)' }, middle: { l: 'MIDDLE', c: 'var(--yellow)' }, narrow: { l: 'NARROW', c: 'var(--red)' } };
  const data = () => (typeof RANGE_FILTER !== 'undefined') ? RANGE_FILTER : null;
  const f1 = v => v == null ? '—' : v.toFixed(1), f2 = v => v == null ? '—' : v.toFixed(2), f3 = v => v == null ? '—' : v.toFixed(3);
  const dollars = pct => { const D = data(); return (pct == null || !D) ? '—' : '$' + (pct / 100 * D.current_price).toFixed(2); };
  const badge = cls => cls ? `<span style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;padding:2px 8px;border:1px solid ${CLS[cls].c};color:${CLS[cls].c};border-radius:2px;">${CLS[cls].l}</span>` : '<span style="color:var(--text3);">—</span>';
  const rateCell = (r, floor) => (!r || r.n < floor) ? `<span style="color:var(--text3);">${r ? `n=${r.n}` : '—'}</span>` : `<span style="font-family:'Share Tech Mono',monospace;color:var(--text);">${f1(r.rate)}%</span> <span style="font-size:9px;color:var(--text3);">${f1(r.lo)}–${f1(r.hi)}</span>`;
  const minuteToCT = m => { const t = 8 * 60 + 30 + m; return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} CT`; };

  function liveOR() {
    const I = window._spyIntraday; const D = data();
    if (!I || !I.rawBars || !I.rawBars.length || !D) return { state: 'none' };
    const bars = I.rawBars.filter(b => b.h != null && b.l != null);
    if (!I.session_live) return { state: 'closed' };
    if (bars.length < D.or_minutes) return { state: 'forming', have: bars.length };
    const orb = bars.slice(0, D.or_minutes); const o = orb[0].o ?? orb[0].c;
    const orPct = (Math.max(...orb.map(b => b.h)) - Math.min(...orb.map(b => b.l))) / o * 100;
    const cls = orPct >= D.or_thresholds.wide_pct ? 'wide' : orPct <= D.or_thresholds.narrow_pct ? 'narrow' : 'middle';
    const rest = bars.slice(D.or_minutes); let exc = null;
    if (rest.length) { const entry = rest[0].o ?? rest[0].c; exc = { entry, up: (Math.max(...rest.map(b => b.h)) - entry) / entry * 100, dn: (entry - Math.min(...rest.map(b => b.l))) / entry * 100, minutes: rest.length }; }
    return { state: 'formed', orPct, cls, exc };
  }

  function render() {
    const el = document.getElementById('rangeFilterContent'); if (!el) return;
    const D = data();
    if (!D) { el.innerHTML = '<div class="no-data">range_filter.js is not loaded yet — it is written by the daily pipeline.</div>'; return; }
    const L = D.latest_session; const T = D.day_thresholds, O = D.or_thresholds; const floor = D.floor;
    const candidate = L.class === 'wide' ? 'CANDIDATE' : L.class === 'narrow' ? 'NO TRADE' : 'MIDDLE — SIZE DOWN';
    const candColor = L.class === 'wide' ? 'var(--green)' : L.class === 'narrow' ? 'var(--red)' : 'var(--yellow)';
    const live = liveOR();
    const cellFor = (pc, oc) => D.table_a[`${pc}/${oc}`];
    let liveHtml = '';
    if (live.state === 'formed') {
      const cell = cellFor(L.class, live.cls);
      liveHtml = `<div style="font-family:'Share Tech Mono',monospace;font-size:20px;color:var(--text);">${f2(live.orPct)}% <span style="font-size:12px;color:var(--text3);">(${dollars(live.orPct)})</span> ${badge(live.cls)}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:4px;">Setup ${badge(L.class)} day + ${badge(live.cls)} OR: ${cell && cell.n >= floor ? `median best one-sided move after 9:00 CT ${f2(cell.median_best)}% (${dollars(cell.median_best)}); reaches 0.5% on ${f1(cell.ge_050.rate)}%, 0.75% on ${f1(cell.ge_075.rate)}%, 1.0% on ${f1(cell.ge_100.rate)}% of ${cell.n} sessions` : `too few sessions in this cell (n=${cell ? cell.n : 0})`}.</div>
        ${live.exc ? `<div style="font-size:11px;color:var(--text2);margin-top:4px;">Since the 9:00 CT price ($${live.exc.entry.toFixed(2)}), ${live.exc.minutes} minutes: up ${f2(live.exc.up)}% / down ${f2(live.exc.dn)}% so far.</div>` : ''}`;
    } else if (live.state === 'forming') {
      liveHtml = `<div style="font-size:12px;color:var(--yellow);">Opening range forming — ${live.have} of ${D.or_minutes} minutes. Classed at 9:00 CT.</div>`;
    } else if (live.state === 'closed') {
      liveHtml = `<div style="font-size:12px;color:var(--text3);">Market closed. The opening range is measured live from 8:30 to 9:00 CT on the next session.</div>`;
    } else {
      liveHtml = `<div style="font-size:12px;color:var(--text3);">No live bars yet.</div>`;
    }
    const gridHead = ['PRIOR DAY \\ OPENING RANGE', 'WIDE OR', 'MIDDLE OR', 'NARROW OR'];
    const gridRows = ['wide', 'middle', 'narrow'].map(pc => `<tr>
      <td style="padding:6px 8px;">${badge(pc)}</td>${['wide', 'middle', 'narrow'].map(oc => { const c = cellFor(pc, oc); const on = pc === L.class && live.state === 'formed' && oc === live.cls; return `<td style="padding:6px 8px;vertical-align:top;${on ? 'background:rgba(0,204,255,0.08);border:1px solid var(--cyan);' : ''}">
        <div style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${c.n >= floor ? 'var(--text)' : 'var(--text3)'};">${c.n >= floor ? f2(c.median_best) + '%' : '—'} <span style="font-size:9px;color:var(--text3);">n=${c.n}</span></div>
        <div style="font-size:10px;color:var(--text2);line-height:1.6;">≥0.5% ${rateCell(c.ge_050, floor)}<br>≥0.75% ${rateCell(c.ge_075, floor)}<br>≥1.0% ${rateCell(c.ge_100, floor)}</div>
        ${c.n >= floor ? `<div style="font-size:9px;color:var(--text3);margin-top:3px;">other side ${f2(c.median_adverse)}% · peak ${minuteToCT(c.peak_min_median)} (${minuteToCT(c.peak_min_q25)}–${minuteToCT(c.peak_min_q75)}) · with OR ${f1(c.side_with_or.rate)}%</div>` : ''}
      </td>`; }).join('')}</tr>`).join('');
    const B = D.table_b[S.era];
    const holdRows = ['wide', 'middle', 'narrow'].map(pc => ['1', '3', '5'].map((k, i) => { const c = B[pc][k]; return `<tr>
      ${i === 0 ? `<td rowspan="3" style="padding:6px 8px;vertical-align:top;">${badge(pc)}</td>` : ''}
      <td style="padding:6px 8px;font-family:'Share Tech Mono',monospace;color:var(--text2);">${k}</td>
      <td style="padding:6px 8px;font-family:'Share Tech Mono',monospace;color:var(--text3);">${c.n.toLocaleString()}</td>
      <td style="padding:6px 8px;font-family:'Share Tech Mono',monospace;color:var(--text);">${c.n >= floor ? f2(c.median_best) + '%' + (S.era === 'all' ? '' : ` <span style="color:var(--text3);font-size:9px;">${dollars(c.median_best)}</span>`) : '—'}</td>
      <td style="padding:6px 8px;">${rateCell(c.ge_100, floor)}</td><td style="padding:6px 8px;">${rateCell(c.ge_150, floor)}</td><td style="padding:6px 8px;">${rateCell(c.ge_200, floor)}</td></tr>`; }).join('')).join('');
    const ww = cellFor('wide', 'wide'), nn = cellFor('narrow', 'narrow'), w3 = B.wide['3'], n3 = B.narrow['3'], w5 = B.wide['5'];
    const eraBtn = (k, l) => `<button onclick="window._rfEra('${k}')" style="font-family:'Orbitron',monospace;font-size:9px;padding:3px 10px;margin-right:4px;background:${S.era === k ? 'rgba(0,204,255,0.15)' : 'var(--bg3)'};border:1px solid ${S.era === k ? 'var(--cyan)' : 'var(--border)'};color:${S.era === k ? 'var(--cyan)' : 'var(--text3)'};cursor:pointer;">${l}</button>`;
    const logRows = D.log.map(r => `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
      <td style="padding:4px 8px;white-space:nowrap;">${fmtDate(r.date, 'short')}</td>
      <td style="padding:4px 8px;">${badge(r.prior_class)} <span style="font-size:9px;color:var(--text3);">${f2(r.prior_range_pct)}%</span></td>
      <td style="padding:4px 8px;">${r.or_class ? `${badge(r.or_class)} <span style="font-size:9px;color:var(--text3);">${f2(r.or_pct)}%</span>` : '<span style="color:var(--text3);">no bars</span>'}</td>
      <td style="padding:4px 8px;font-family:'Share Tech Mono',monospace;color:${r.best_pct == null ? 'var(--text3)' : r.best_pct >= 0.75 ? 'var(--green)' : r.best_pct >= 0.5 ? 'var(--yellow)' : 'var(--text2)'};">${r.best_pct == null ? '—' : f2(r.best_pct) + '% ' + (r.best_side || '')}${r.peak_min != null ? ` <span style="font-size:9px;color:var(--text3);">peak ${minuteToCT(r.peak_min)}</span>` : ''}</td>
      <td style="padding:4px 8px;font-family:'Share Tech Mono',monospace;color:var(--text2);">${f2(r.day_range_pct)}%</td>
      <td style="padding:4px 8px;font-family:'Share Tech Mono',monospace;color:${r.oc_pct >= 0 ? 'var(--green)' : 'var(--red)'};">${r.oc_pct >= 0 ? '+' : ''}${f2(r.oc_pct)}%</td></tr>`).join('');
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <div class="panel" style="border-left:4px solid ${candColor};margin:0;">
          <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:4px;">STEP 1 — LATEST SESSION'S RANGE DECIDES ${fmtDate(D.next_session).toUpperCase()}</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:20px;color:var(--text);">${f2(L.range_pct)}% <span style="font-size:12px;color:var(--text3);">($${L.range_pts.toFixed(2)} on ${fmtDate(L.date, 'short')})</span> ${badge(L.class)}</div>
          <div style="font-family:'Orbitron',monospace;font-size:14px;color:${candColor};margin-top:6px;letter-spacing:2px;">${candidate}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:6px;">Wide ≥ ${f2(T.wide_pct)}% (${dollars(T.wide_pct)}), narrow ≤ ${f2(T.narrow_pct)}% (${dollars(T.narrow_pct)}) — quartiles of the ${T.n} sessions since ${fmtDate(T.window_start, 'short')}, rolled forward each run. Dollars at $${D.current_price.toFixed(2)}.</div>
        </div>
        <div class="panel" style="border-left:4px solid var(--cyan);margin:0;">
          <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:4px;">STEP 2 — OPENING RANGE AT 9:00 CT (LIVE)</div>
          ${liveHtml}
          <div style="font-size:10px;color:var(--text3);margin-top:6px;">Wide ≥ ${f2(O.wide_pct)}% (${dollars(O.wide_pct)}), narrow ≤ ${f2(O.narrow_pct)}% (${dollars(O.narrow_pct)}) — quartiles of the ${O.n} sessions with 1-minute bars since ${fmtDate(O.window_start, 'short')}.</div>
        </div>
      </div>
      <div class="panel" style="margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ MODE A — DAY TRADE ON A 2+ DTE CONTRACT · BEST ONE-SIDED MOVE AFTER THE OPENING RANGE CLOSES</div>
        <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${gridHead.map(h => `<th style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);text-align:left;padding:6px 8px;border-bottom:1px solid var(--border);">${h}</th>`).join('')}</tr></thead><tbody>${gridRows}</tbody></table></div>
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">Each cell: median of the largest move from the 9:00 CT price in either direction, and the share of sessions reaching each size, with 95% Wilson intervals; "other side" is the median move against the winning side; "peak" is when the best move landed; "with OR" is how often the winning side matched the opening range's direction. ${D.table_a_coverage.sessions} sessions with 1-minute bars, ${fmtDate(D.table_a_coverage.first, 'short')} → ${fmtDate(D.table_a_coverage.last, 'short')}. Rates need n ≥ ${floor}.</div>
      </div>
      <div class="panel" style="margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;"><div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);">⬡ MODE B — HELD ON A WEEK OR MORE OF TIME · BEST ONE-SIDED MOVE FROM THE NEXT OPEN</div><div style="margin-left:auto;">${eraBtn('3y', 'LAST 3 YEARS')}${eraBtn('all', 'ALL HISTORY')}</div></div>
        <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${['PRIOR DAY', 'HOLD (SESSIONS)', 'n', 'MEDIAN BEST MOVE', '≥1.0%', '≥1.5%', '≥2.0%'].map(h => `<th style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);text-align:left;padding:6px 8px;border-bottom:1px solid var(--border);">${h}</th>`).join('')}</tr></thead><tbody>${holdRows}</tbody></table></div>
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">From the next session's open through the close of session N: the larger of (highest high − open) and (open − lowest low), as a percent of the open. Sessions from ${fmtDate(B.start, 'short')}; daily bars, all sessions.</div>
      </div>
      <div class="panel" style="margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ THE RULES, WITH TODAY'S NUMBERS</div>
        <div style="font-size:12px;color:var(--text2);line-height:1.8;">
          1. At the close, class the day's range. Wide is ${f2(T.wide_pct)}% (${dollars(T.wide_pct)}) or more; narrow is ${f2(T.narrow_pct)}% (${dollars(T.narrow_pct)}) or less. Narrow → no trade tomorrow, in either mode.<br>
          2. Mode A: at 9:00 CT, class the opening range. Wide is ${f2(O.wide_pct)}% (${dollars(O.wide_pct)}) or more. Wide day + wide OR → enter at 9:00 CT, not later; the move reached 0.75% on ${ww.n >= floor ? f1(ww.ge_075.rate) : '—'}% of ${ww.n} sessions, median ${f2(ww.median_best)}% (${dollars(ww.median_best)}). Narrow OR → no trade${nn.n >= floor ? ` (narrow/narrow reached 0.75% on ${f1(nn.ge_075.rate)}%)` : ''}.<br>
          3. Mode A exit: the best move lands at a median of ${ww.n >= floor ? minuteToCT(ww.peak_min_median) : '—'} on wide/wide days; do not hold into the last hour on the strength of the trend.<br>
          4. Mode B: wide day → enter the next open, hold three to five sessions. ≥1.5% arrived on ${w3.n >= floor ? f1(w3.ge_150.rate) : '—'}% of 3-session holds and ${w5.n >= floor ? f1(w5.ge_150.rate) : '—'}% of 5-session holds, against ${n3.n >= floor ? f1(n3.ge_150.rate) : '—'}% after a narrow day.<br>
          5. <strong style="color:var(--text);">The filter does not predict direction.</strong> On wide/wide days the winning side matched the opening range's direction ${ww.n >= floor ? f1(ww.side_with_or.rate) : '—'}% of the time, and the other side moved a median ${f2(ww.median_adverse)}% (${dollars(ww.median_adverse)}) against a one-sided position. A single leg with a stop inside that noise is a coin flip paid out unevenly. The filter says when a move is coming and how big; which way has to come from somewhere else.
        </div>
      </div>
      <div class="panel">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ THE RECORD — LAST ${D.log.length} SESSIONS</div>
        <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${['SESSION', 'PRIOR DAY', 'OPENING RANGE', 'BEST MOVE AFTER 9:00 CT', 'DAY RANGE', 'OPEN→CLOSE'].map(h => `<th style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);text-align:left;padding:6px 8px;border-bottom:1px solid var(--border);">${h}</th>`).join('')}</tr></thead><tbody>${logRows}</tbody></table></div>
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">Prior-day and opening-range classes use the thresholds in force now; frame stamped ${D.generated ? fmtDate(D.generated.slice(0, 10)) : '—'}, data through ${fmtDate(D.as_of)}.</div>
      </div>`;
  }
  window._rfEra = k => { S.era = k; render(); };
  window.renderRangeFilter = render;
})();
