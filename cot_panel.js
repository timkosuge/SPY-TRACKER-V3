(function () {
  const data = () => (typeof COT_DATA !== 'undefined') ? COT_DATA : null;
  const LEVEL = { finding: ['FINDING', 'var(--green)'], none: ['NOT SUPPORTED', 'var(--red)'], info: ['READING', 'var(--cyan)'] };
  const CAT = [['dealer', 'var(--purple)'], ['asset', 'var(--cyan)'], ['lev', '#ff8800'], ['other', 'var(--text3)'], ['nonrept', 'var(--dim)']];
  const f1 = v => v == null ? '—' : Number(v).toFixed(1);
  const sgn = v => v == null ? '—' : (v >= 0 ? '+' : '') + Math.round(v).toLocaleString('en-US');
  const th = h => `<th style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);text-align:left;padding:5px 8px;border-bottom:1px solid var(--border);">${h}</th>`;
  const rc = r => (!r || !r.n) ? '—' : `<span style="font-family:'Share Tech Mono',monospace;color:var(--text);">${f1(r.rate)}%</span> <span style="font-size:9px;color:var(--text3);">${f1(r.lo)}–${f1(r.hi)} · n=${r.n}</span>`;

  function chart(series) {
    if (!series || series.length < 2) return '';
    const W = 960, H = 240, P = { t: 14, r: 16, b: 26, l: 74 };
    const cW = W - P.l - P.r, cH = H - P.t - P.b;
    const keys = ['dealer_net', 'asset_net', 'lev_net'];
    const all = series.flatMap(s => keys.map(k => s[k])).filter(v => v != null);
    const min = Math.min(...all), max = Math.max(...all);
    const x = i => P.l + i / (series.length - 1) * cW;
    const y = v => P.t + cH - (v - min) / (max - min || 1) * cH;
    const line = (k, col) => `<polyline points="${series.map((s, i) => `${x(i).toFixed(1)},${y(s[k]).toFixed(1)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="1.6" opacity="0.9"/>`;
    const zero = (min <= 0 && max >= 0) ? `<line x1="${P.l}" y1="${y(0).toFixed(1)}" x2="${W - P.r}" y2="${y(0).toFixed(1)}" stroke="var(--border)" stroke-dasharray="4,3"/>` : '';
    const ticks = [0, Math.floor(series.length / 2), series.length - 1].map(i => `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9" fill="var(--text3)" font-family="Share Tech Mono,monospace">${series[i].d}</text>`).join('');
    const yl = [max, (max + min) / 2, min].map(v => `<text x="${P.l - 6}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="var(--text3)" font-family="Share Tech Mono,monospace">${Math.round(v / 1000)}k</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;">${zero}${line('dealer_net', 'var(--purple)')}${line('asset_net', 'var(--cyan)')}${line('lev_net', '#ff8800')}${ticks}${yl}</svg>`;
  }

  function render() {
    const el = document.getElementById('cotPositioningContent'); if (!el) return;
    const D = data();
    if (!D) { el.innerHTML = '<div class="no-data">cot_data.js is not loaded yet — it is written by the weekly sentiment run.</div>'; return; }
    if (!D.available) { el.innerHTML = `<div class="no-data">Positioning history holds ${D.weeks} reports; it fills from the weekly sentiment run.</div>`; return; }
    const S = D.standing;
    const cards = CAT.map(([k, col]) => { const c = S[k]; if (!c) return ''; const p = c.percentile.all;
      return `<div class="panel" style="border-top:2px solid ${col};margin:0;">
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:4px;">${c.label.toUpperCase()}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:20px;color:${c.net >= 0 ? 'var(--green)' : 'var(--red)'};">${sgn(c.net)}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px;">${c.pct_oi >= 0 ? '+' : ''}${f1(c.pct_oi)}% of open interest</div>
        <div style="font-size:11px;color:var(--text2);margin-top:4px;">${f1(p)}th percentile since ${D.first.slice(0, 4)}</div>
        <div style="font-size:11px;color:${(c.change || 0) >= 0 ? 'var(--green)' : 'var(--red)'};">${sgn(c.change)} on the week</div>
        <div style="font-size:9px;color:var(--text3);margin-top:3px;">1-year ${f1(c.percentile['1y'])}th · 5-year ${f1(c.percentile['5y'])}th</div>
      </div>`; }).join('');
    const verd = (D.verdicts || []).map(v => { const [lab, col] = LEVEL[v.level] || LEVEL.info; return `<div style="padding:4px 0 4px 8px;border-left:2px solid ${col};margin-bottom:5px;"><span style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:${col};">${lab}</span> <span style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text);margin-left:6px;">${v.topic.toUpperCase()}</span><div style="font-size:12px;color:var(--text2);line-height:1.7;margin-top:2px;">${v.text}</div></div>`; }).join('');
    const rows = Object.entries(D.tests || {}).map(([key, t]) => { const cat = key.split('|')[0];
      return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
        <td style="padding:5px 8px;color:var(--text);">${t.label}</td>
        <td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:var(--text3);">${t.horizon} sessions</td>
        <td style="padding:5px 8px;">${rc(t.base)}</td>
        ${['most short', 'most long', 'sold hardest', 'bought hardest'].map(k => `<td style="padding:5px 8px;background:${t.separated[k] ? 'rgba(0,255,136,0.08)' : 'transparent'};">${rc(t.cells[k])}${t.median && t.median[k] != null ? `<div style="font-size:9px;color:var(--text3);">median ${t.median[k] >= 0 ? '+' : ''}${t.median[k]}%</div>` : ''}</td>`).join('')}
      </tr>`; }).join('');
    el.innerHTML = `
      <div class="panel" style="margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:6px;">E-MINI S&P 500 FUTURES · CFTC CODE 13874A · REPORT OF ${fmtDate(D.last).toUpperCase()}, FIRST TRADEABLE SESSION ${D.latest.entry_date ? fmtDate(D.latest.entry_date).toUpperCase() : '—'}</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;">${cards}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:8px;">Net is long minus short. Open interest ${D.latest.open_interest ? D.latest.open_interest.toLocaleString('en-US') : '—'} contracts. Percentiles run over ${D.weeks.toLocaleString('en-US')} weekly reports, ${fmtDate(D.first, 'short')} → ${fmtDate(D.last, 'short')}. The report covers positions as of its Tuesday and is published the following Friday afternoon.</div>
      </div>
      <div class="panel" style="margin-bottom:12px;border-left:4px solid var(--purple);">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--purple);margin-bottom:8px;">⬡ WHAT THE POSITIONING SAYS — RECOMPUTED EVERY RUN</div>
        ${verd}
      </div>
      <div class="panel" style="margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ NET POSITION BY CATEGORY — <span style="color:var(--purple);">━ DEALER</span> <span style="color:var(--cyan);">━ ASSET MANAGER</span> <span style="color:#ff8800;">━ LEVERAGED FUNDS</span></div>
        ${chart(D.series)}
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">Every weekly report since ${fmtDate(D.first, 'short')}. Contracts, in thousands.</div>
      </div>
      <div class="panel">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ WHAT EACH EXTREME HAS PRECEDED — SHARE OF REPORTS AFTER WHICH SPY CLOSED HIGHER</div>
        <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${['CATEGORY', 'HORIZON', 'EVERY REPORT', 'MOST SHORT (BOTTOM 20%)', 'MOST LONG (TOP 20%)', 'SOLD HARDEST (BOTTOM 20% OF WEEKLY CHANGE)', 'BOUGHT HARDEST (TOP 20% OF WEEKLY CHANGE)'].map(th).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">Measured from the close of the first session that could act on the report. A cell is highlighted only when its 95% interval does not overlap the every-report rate. Nothing highlighted means positioning described where money sat and did not precede direction.</div>
      </div>`;
  }
  window.renderCotPositioning = render;
})();
