(function () {
  const data = () => (typeof SMART_DUMB !== 'undefined') ? SMART_DUMB : null;
  const LEVEL = { finding: ['FINDING', 'var(--green)'], none: ['NOT SUPPORTED', 'var(--red)'], info: ['READING', 'var(--cyan)'] };
  const f0 = v => v == null ? '—' : Math.round(v), f1 = v => v == null ? '—' : Number(v).toFixed(1);
  const th = h => `<th style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);text-align:left;padding:5px 8px;border-bottom:1px solid var(--border);">${h}</th>`;
  const rc = r => (!r || !r.n) ? '—' : `<span style="font-family:'Share Tech Mono',monospace;color:var(--text);">${f1(r.rate)}%</span> <span style="font-size:9px;color:var(--text3);">${f1(r.lo)}–${f1(r.hi)} · n=${r.n}</span>`;
  const holdsMark = st => !st || st.holds == null ? '<span style="color:var(--text3);" title="too few reports to split">·</span>' : st.holds ? '<span style="color:var(--green);" title="agrees across both halves">●</span>' : '<span style="color:var(--red);" title="the two halves disagree">●</span>';

  function gauge(label, v, col) {
    return `<div style="margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);"><span>${label}</span><span style="font-family:'Share Tech Mono',monospace;color:${col};">${f0(v)}</span></div>
      <div style="height:8px;background:var(--bg3);border:1px solid var(--border);border-radius:2px;position:relative;">
        <div style="position:absolute;left:0;top:0;bottom:0;width:${Math.max(0, Math.min(100, v || 0))}%;background:${col};opacity:0.75;"></div>
      </div></div>`;
  }

  const SD_RANGES = [['6m', '6 MONTHS', 182], ['1y', '1 YEAR', 365], ['3y', '3 YEARS', 1096], ['5y', '5 YEARS', 1826], ['all', 'ALL SINCE 2006', Infinity]];
  const SMART = '#4aa3ff', DUMB = '#e0455a';
  function chart(D, width) {
    const series = D.series || [];
    if (series.length < 2) return '';
    const X = D.extremes || { hi: 80, lo: 20 };
    const HI = X.hi, LO = X.lo, since = X.since ? X.since.slice(0, 4) : '';
    const key = window._sdRange || '6m';
    const range = SD_RANGES.find(r => r[0] === key) || SD_RANGES[0];
    const t = d => Date.parse(d + 'T12:00:00Z');
    const tEnd = t(series[series.length - 1].d);
    const tStart = range[2] === Infinity ? t(series[0].d) : tEnd - range[2] * 864e5;
    const wk = series.filter(r => t(r.d) >= tStart && r.inst != null && r.small != null);
    const useDaily = range[2] !== Infinity && (D.daily_px || []).length && t(D.daily_px[0][0]) <= tStart + 7 * 864e5;
    const px = (useDaily ? D.daily_px.map(([d, c]) => ({ d, c })) : series.filter(r => r.px != null).map(r => ({ d: r.d, c: r.px }))).filter(r => t(r.d) >= tStart);
    if (wk.length < 2) return '<div style="font-size:11px;color:var(--text3);">Not enough weeks in this range.</div>';
    const W = Math.max(640, Math.round(width || 960)), H = 420, L = 40, R = 60, T = 10, B = 26;
    const cW = W - L - R, cH = H - T - B;
    const pTop = T + 6, pH = cH * 0.34, iTop = T + cH * 0.40, iH = cH * 0.60;
    const tMin = Math.min(t(wk[0].d), px.length ? t(px[0].d) : Infinity), tMax = tEnd;
    const x = d => L + (t(d) - tMin) / (tMax - tMin || 1) * cW;
    const pMin = Math.min(...px.map(r => r.c)), pMax = Math.max(...px.map(r => r.c));
    const logScale = pMax / pMin > 2;
    const f = v => logScale ? Math.log(v) : v;
    const fMin = f(pMin), fMax = f(pMax);
    const py = v => pTop + pH - (f(v) - fMin) / ((fMax - fMin) || 1) * pH;
    const vals = wk.flatMap(r => [r.inst, r.small]);
    const lo = Math.max(0, Math.floor((Math.min(...vals, LO) - 4) / 10) * 10);
    const hi = Math.min(100, Math.ceil((Math.max(...vals, HI) + 4) / 10) * 10);
    const iy = v => iTop + iH - (v - lo) / ((hi - lo) || 1) * iH;
    const poly = (pts, col, w) => `<polyline points="${pts.join(' ')}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round"/>`;
    const txt = (xx, yy, s, anchor, col) => `<text x="${xx.toFixed(1)}" y="${yy.toFixed(1)}" text-anchor="${anchor}" font-size="11" fill="${col || 'var(--text3)'}" font-family="Share Tech Mono,monospace">${s}</text>`;
    let g = `<rect x="${L}" y="${T}" width="${cW}" height="${cH}" fill="rgba(255,255,255,0.015)"/>`;
    [pMin, logScale ? Math.sqrt(pMin * pMax) : (pMin + pMax) / 2, pMax].forEach(v => { g += txt(W - R + 6, py(v) + 4, '$' + Math.round(v), 'start'); });
    const levels = [...new Set([lo, LO, 50, HI, hi].filter(v => v >= lo && v <= hi))];
    levels.forEach(v => {
      const yy = iy(v), dash = v === HI || v === LO;
      g += `<line x1="${L}" x2="${W - R}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="${dash ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.06)'}" ${dash ? 'stroke-dasharray="5,4"' : ''}/>`;
      g += txt(L - 6, yy + 4, Math.round(v), 'end');
    });
    for (let k = 0; k < 6; k++) {
      const tt = tMin + k * (tMax - tMin) / 5, d = new Date(tt).toISOString().slice(0, 10);
      const lab = new Date(tt).toLocaleDateString('en-US', range[2] <= 400 ? { month: 'short', day: 'numeric', timeZone: 'UTC' } : { month: 'short', year: 'numeric', timeZone: 'UTC' });
      g += txt(x(d), H - 8, lab, k === 0 ? 'start' : k === 5 ? 'end' : 'middle');
    }
    const last = wk[wk.length - 1], lx = x(last.d);
    const dot = (v, col) => `<circle cx="${lx.toFixed(1)}" cy="${iy(v).toFixed(1)}" r="3.5" fill="${col}"/>`;
    const call = (v, col, who) => {
      const where = v >= HI ? `higher than on 9 weeks in 10 since ${since}` : v <= LO ? `lower than on 9 weeks in 10 since ${since}` : null;
      if (!where) return '';
      const yy = iy(v), above = v <= LO;
      const bx = Math.max(L + 4, lx - 340), by = above ? yy - 44 : yy + 16;
      return `<line x1="${(bx + 330).toFixed(1)}" y1="${(above ? by + 26 : by).toFixed(1)}" x2="${(lx - 4).toFixed(1)}" y2="${yy.toFixed(1)}" stroke="#f5a623" stroke-width="1.2"/>
        <rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="330" height="26" fill="var(--bg2, #111)" stroke="#f5a623" stroke-width="1.2" rx="2"/>
        <text x="${(bx + 165).toFixed(1)}" y="${(by + 17).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="${col}">${who} is ${where}</text>`;
    };
    const btns = SD_RANGES.map(r => `<button onclick="window._sdRange='${r[0]}';renderSmartDumb()" style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;padding:3px 8px;margin-right:4px;cursor:pointer;background:${r[0] === range[0] ? 'var(--cyan)' : 'var(--bg3)'};color:${r[0] === range[0] ? 'var(--bg)' : 'var(--text3)'};border:1px solid var(--border);">${r[1]}</button>`).join('');
    const legend = `<div style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center;font-size:12px;font-family:'Share Tech Mono',monospace;margin:4px 0 6px;">
        <span style="color:var(--text2);">━ SPY${logScale ? ' (log scale)' : ''}, right axis</span>
        <span style="color:${SMART};">━ Smart money (Last = ${Math.round(last.inst)})</span>
        <span style="color:${DUMB};">━ Dumb money (Last = ${Math.round(last.small)})</span>
        <span style="color:var(--text3);">- - Extremes: ${Math.round(HI)} and ${Math.round(LO)}, left axis</span></div>`;
    return `<div style="margin-bottom:4px;">${btns}</div>${legend}
      <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="max-width:100%;height:auto;display:block;">${g}
        ${poly(px.map(r => `${x(r.d).toFixed(1)},${py(r.c).toFixed(1)}`), 'var(--text2)', 1.4)}${poly(wk.map(r => `${x(r.d).toFixed(1)},${iy(r.inst).toFixed(1)}`), SMART, 2)}${poly(wk.map(r => `${x(r.d).toFixed(1)},${iy(r.small).toFixed(1)}`), DUMB, 2)}${dot(last.inst, SMART)}${dot(last.small, DUMB)}
        ${call(last.inst, SMART, 'Smart money')}${call(last.small, DUMB, 'Dumb money')}
      </svg>
      <div style="font-size:11px;color:var(--text3);margin-top:4px;">Smart money is leveraged funds and asset managers. Dumb money is traders under the reporting threshold, other reportable traders and the AAII survey. Each line is where that group's position sits between its own three-year low (0) and high (100); the dashed lines are where both lines have sat on only one week in ten since ${since} (above ${Math.round(HI)} or below ${Math.round(LO)}), and a callout appears when the latest reading is past either. The left scale is fitted to the lines in view and always includes both extremes. Positions are reported weekly, so the lines move in weekly steps; price is daily${range[2] === Infinity ? ' except in the full-history view, which is weekly' : ''}.</div>`;
  }

  function render() {
    const el = document.getElementById('smartDumbContent'); if (!el) return;
    const D = data();
    if (!D) { el.innerHTML = '<div class="no-data">smart_dumb.js is not loaded yet — it is written by the daily pipeline.</div>'; return; }
    if (!D.available) { el.innerHTML = `<div class="no-data">Not built yet: ${D.reason}.</div>`; return; }
    const L = D.latest;
    const verd = (D.verdicts || []).map(v => { const [lab, col] = LEVEL[v.level] || LEVEL.info; return `<div style="padding:4px 0 4px 8px;border-left:2px solid ${col};margin-bottom:5px;"><span style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:${col};">${lab}</span> <span style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text);margin-left:6px;">${v.topic.toUpperCase()}</span><div style="font-size:12px;color:var(--text2);line-height:1.7;margin-top:2px;">${v.text}</div></div>`; }).join('');
    const gapCol = L.spread >= 0 ? 'var(--cyan)' : '#ff8800';
    const rows = Object.values(D.tests || {}).map(t => `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
      <td style="padding:5px 8px;color:var(--text);">${t.label}</td>
      <td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:var(--text3);">${t.horizon} sessions</td>
      <td style="padding:5px 8px;">${rc(t.base)}</td>
      <td style="padding:5px 8px;background:${t.separated['bottom fifth'] ? 'rgba(0,255,136,0.08)' : 'transparent'};">${rc(t.cells['bottom fifth'])}<div style="font-size:9px;color:var(--text3);">at or below ${t.thresholds['bottom fifth']} · median ${t.median['bottom fifth'] >= 0 ? '+' : ''}${t.median['bottom fifth']}% ${holdsMark(t.stability['bottom fifth'])}</div></td>
      <td style="padding:5px 8px;background:${t.separated['top fifth'] ? 'rgba(0,255,136,0.08)' : 'transparent'};">${rc(t.cells['top fifth'])}<div style="font-size:9px;color:var(--text3);">at or above ${t.thresholds['top fifth']} · median ${t.median['top fifth'] >= 0 ? '+' : ''}${t.median['top fifth']}% ${holdsMark(t.stability['top fifth'])}</div></td>
    </tr>`).join('');
    const cats = (D.categories || []).map(c => `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;color:var(--text);">${c.label}</td><td style="padding:4px 8px;font-size:10px;color:var(--text3);">${c.side}</td><td style="padding:4px 8px;font-family:'Share Tech Mono',monospace;color:${(L[c.key + '_net'] || 0) >= 0 ? 'var(--green)' : 'var(--red)'};">${L[c.key + '_net'] != null ? (L[c.key + '_net'] >= 0 ? '+' : '') + L[c.key + '_net'].toLocaleString('en-US') : '—'}</td><td style="padding:4px 8px;font-family:'Share Tech Mono',monospace;color:var(--text);">${f0(L[c.key + '_idx'])}</td></tr>`).join('');
    el.innerHTML = `
      <div class="panel" style="margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:8px;">POSITIONING INDEX · REPORT OF ${fmtDate(D.last).toUpperCase()} · EACH FIGURE IS WHERE THIS WEEK'S NET SITS BETWEEN ITS OWN THREE-YEAR LOW AND HIGH</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;align-items:start;">
          <div>${gauge('INSTITUTIONS — leveraged funds and asset managers', L.institutional, 'var(--cyan)')}${gauge('SMALL TRADERS — non-reportable, other reportable' + (L.aaii_idx != null ? ', retail survey' : ''), L.small, '#ff8800')}${gauge('SELL SIDE — dealers and intermediaries', L.dealer_idx, 'var(--purple)')}</div>
          <div style="text-align:center;">
            <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);">INSTITUTIONS MINUS SMALL TRADERS</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:34px;color:${gapCol};">${L.spread >= 0 ? '+' : ''}${f0(L.spread)}</div>
            <div style="font-size:10px;color:var(--text3);">${L.spread >= 0 ? 'Institutions are further into their own range than small traders' : 'Small traders are further into their own range than institutions'}</div>
          </div>
          <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${['CATEGORY', 'SIDE', 'NET CONTRACTS', 'INDEX'].map(th).join('')}</tr></thead><tbody>${cats}</tbody></table></div>
        </div>
        <div style="font-size:10px;color:var(--text3);margin-top:8px;">${D.weeks.toLocaleString('en-US')} weekly reports, ${fmtDate(D.first, 'short')} → ${fmtDate(D.last, 'short')}, with ${D.aaii_weeks.toLocaleString('en-US')} survey weeks. The index uses each category's own ${D.lookback_weeks}-week low and high, so a category that is short almost every week by the nature of its business does not read as bearish.</div>
      </div>
      <div class="panel" style="margin-bottom:12px;border-left:4px solid var(--purple);">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--purple);margin-bottom:8px;">⬡ WHAT THIS SAYS — RECOMPUTED EVERY RUN</div>
        ${verd}
      </div>
      <div class="panel" style="margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ SMART MONEY / DUMB MONEY</div>
        ${chart(D, sdChartWidth())}
      </div>
      <div class="panel">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ WHAT EACH EXTREME HAS PRECEDED — SHARE OF REPORTS AFTER WHICH SPY CLOSED HIGHER</div>
        <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${['MEASURE', 'HORIZON', 'EVERY REPORT', 'BOTTOM FIFTH OF THE MEASURE', 'TOP FIFTH OF THE MEASURE'].map(th).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">Measured from the close of the first session that could act on the report. A cell is highlighted only when its 95% interval excludes the every-report rate. ● green means the rate agrees across both halves of the record; ● red means the halves disagree and the cell should not be relied on; · means too few reports to split.</div>
      </div>`;
  }
  function sdChartWidth() {
    const host = document.getElementById('smartDumbContent');
    return host && host.clientWidth ? host.clientWidth - 30 : 960;
  }
  window.renderSmartDumb = render;
  if (typeof window.addEventListener === 'function') {
    let pending = null;
    window.addEventListener('resize', () => {
      clearTimeout(pending);
      pending = setTimeout(() => { const host = document.getElementById('smartDumbContent'); if (host && host.clientWidth) render(); }, 200);
    });
  }
})();
