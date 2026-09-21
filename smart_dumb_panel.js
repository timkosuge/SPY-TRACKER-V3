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

  function chart(series) {
    if (!series || series.length < 2) return '';
    const W = 960, H = 250, P = { t: 14, r: 52, b: 26, l: 40 };
    const cW = W - P.l - P.r, cH = H - P.t - P.b;
    const x = i => P.l + i / (series.length - 1) * cW;
    const y = v => P.t + cH - (v / 100) * cH;
    const px = series.map(s => s.px).filter(v => v != null);
    const pmin = Math.min(...px), pmax = Math.max(...px);
    const py = v => P.t + cH - (Math.log(v / pmin) / Math.log(pmax / pmin)) * cH;
    const line = (fn, col, w) => `<polyline points="${series.map((s, i) => fn(s) == null ? null : `${x(i).toFixed(1)},${(fn === (t => t.px) ? py(s.px) : y(fn(s))).toFixed(1)}`).filter(Boolean).join(' ')}" fill="none" stroke="${col}" stroke-width="${w}" opacity="0.9"/>`;
    const mid = `<line x1="${P.l}" y1="${y(50).toFixed(1)}" x2="${W - P.r}" y2="${y(50).toFixed(1)}" stroke="var(--border)" stroke-dasharray="4,3"/>`;
    const ticks = [0, Math.floor(series.length / 2), series.length - 1].map(i => `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9" fill="var(--text3)" font-family="Share Tech Mono,monospace">${series[i].d}</text>`).join('');
    const yl = [100, 50, 0].map(v => `<text x="${P.l - 5}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="var(--text3)" font-family="Share Tech Mono,monospace">${v}</text>`).join('');
    const pl = [pmax, pmin].map(v => `<text x="${W - P.r + 5}" y="${(py(v) + 3).toFixed(1)}" font-size="9" fill="var(--text3)" font-family="Share Tech Mono,monospace">$${Math.round(v)}</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;">${mid}${line(s => s.px, 'var(--text3)', 1)}${line(s => s.inst, 'var(--cyan)', 1.8)}${line(s => s.small, '#ff8800', 1.8)}${ticks}${yl}${pl}</svg>`;
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
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ THE TWO SIDES AGAINST SPY — <span style="color:var(--cyan);">━ INSTITUTIONS</span> <span style="color:#ff8800;">━ SMALL TRADERS</span> <span style="color:var(--text3);">━ SPY (LOG SCALE, RIGHT)</span></div>
        ${chart(D.series)}
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">Both indexes run 0 to 100 on the left. The dashed line is the middle of each category's own three-year range.</div>
      </div>
      <div class="panel">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ WHAT EACH EXTREME HAS PRECEDED — SHARE OF REPORTS AFTER WHICH SPY CLOSED HIGHER</div>
        <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${['MEASURE', 'HORIZON', 'EVERY REPORT', 'BOTTOM FIFTH OF THE MEASURE', 'TOP FIFTH OF THE MEASURE'].map(th).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">Measured from the close of the first session that could act on the report. A cell is highlighted only when its 95% interval excludes the every-report rate. ● green means the rate agrees across both halves of the record; ● red means the halves disagree and the cell should not be relied on; · means too few reports to split.</div>
      </div>`;
  }
  window.renderSmartDumb = render;
})();
