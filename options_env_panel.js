(function () {
  const data = () => (typeof OPTIONS_ENV !== 'undefined') ? OPTIONS_ENV : null;
  const LEVEL = { finding: ['FINDING', 'var(--green)'], none: ['NOT SUPPORTED', 'var(--red)'], info: ['NOTE', 'var(--cyan)'] };
  const f1 = v => v == null ? '—' : Number(v).toFixed(1), f2 = v => v == null ? '—' : Number(v).toFixed(2);
  const f0 = v => v == null ? '—' : Math.round(Number(v));
  const dol = v => v == null ? '—' : '$' + Number(v).toFixed(2);
  const tile = (label, value, note, col) => `<div><span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);">${label}</span><br><span style="font-family:'Share Tech Mono',monospace;font-size:20px;color:${col || 'var(--text)'};">${value}</span><div style="font-size:10px;color:var(--text3);max-width:235px;line-height:1.4;">${note}</div></div>`;
  const sgn = v => v == null ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(2);
  const rc = r => (!r || !r.n) ? '—' : `<span style="font-family:'Share Tech Mono',monospace;color:var(--text);">${f1(r.rate)}%</span> <span style="font-size:9px;color:var(--text3);">${f1(r.lo)}–${f1(r.hi)} · n=${r.n.toLocaleString()}</span>`;
  const th = h => `<th style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);text-align:left;padding:5px 8px;border-bottom:1px solid var(--border);">${h}</th>`;
  const CHEAP = 'var(--green)', FAIR = 'var(--yellow)', RICH = 'var(--red)';

  function gauge(T) {
    const p = T && T.spread_percentile_3y;
    if (p == null) return '';
    const W = 620, H = 74, L = 10, R = 10, bW = W - L - R, bY = 30, bH = 16;
    const x = v => L + bW * v / 100;
    const zone = (a, b, col) => `<rect x="${x(a).toFixed(1)}" y="${bY}" width="${(x(b) - x(a)).toFixed(1)}" height="${bH}" fill="${col}" opacity="0.28"/>`;
    const txt = (xx, yy, s, anchor, col, size) => `<text x="${xx.toFixed(1)}" y="${yy.toFixed(1)}" text-anchor="${anchor}" font-size="${size || 10}" fill="${col || 'var(--text3)'}" font-family="Share Tech Mono,monospace">${s}</text>`;
    const nx = x(Math.max(0, Math.min(100, p)));
    const col = p >= 75 ? RICH : p <= 25 ? CHEAP : FAIR;
    let g = zone(0, 25, CHEAP) + zone(25, 75, FAIR) + zone(75, 100, RICH);
    g += `<rect x="${L}" y="${bY}" width="${bW}" height="${bH}" fill="none" stroke="var(--border)"/>`;
    [25, 75].forEach(v => { g += `<line x1="${x(v).toFixed(1)}" x2="${x(v).toFixed(1)}" y1="${bY}" y2="${bY + bH}" stroke="rgba(255,255,255,0.45)" stroke-dasharray="4,3"/>`; });
    g += `<polygon points="${nx.toFixed(1)},${bY - 3} ${(nx - 6).toFixed(1)},${bY - 13} ${(nx + 6).toFixed(1)},${bY - 13}" fill="${col}"/>`;
    g += `<line x1="${nx.toFixed(1)}" x2="${nx.toFixed(1)}" y1="${bY}" y2="${bY + bH}" stroke="${col}" stroke-width="2"/>`;
    g += txt(nx, bY - 17, `${f1(p)}th`, nx < 60 ? 'start' : nx > W - 60 ? 'end' : 'middle', col, 12);
    g += txt(L, bY + bH + 14, 'CHEAP', 'start', CHEAP) + txt(L + bW / 2, bY + bH + 14, 'FAIRLY PRICED', 'middle', FAIR) + txt(W - R, bY + bH + 14, 'EXPENSIVE', 'end', RICH);
    return `<div style="margin:10px 0 4px;"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="max-width:100%;height:auto;display:block;">${g}</svg></div>`;
  }

  const OE_WINS = [['3Y', '3 YEARS', null], ['3M', '3 MONTHS', 63], ['1M', '1 MONTH', 21], ['1W', '1 WEEK', 5]];

  function history(D) {
    const h = D && D.history, all = h && h.days;
    if (!all || all.length < 30) return '';
    const win = OE_WINS.find(w => w[0] === window._oeWin) || OE_WINS[0];
    const days = win[2] ? all.slice(-Math.min(win[2], all.length)) : all;
    if (days.length < 2) return '';
    const btns = OE_WINS.filter(w => !w[2] || all.length > w[2]).map(w => `<button onclick="window._oeWin='${w[0]}';renderOptionsEnv()" style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;padding:3px 8px;margin-right:4px;cursor:pointer;background:${w[0] === win[0] ? 'var(--cyan)' : 'var(--bg3)'};color:${w[0] === win[0] ? 'var(--bg)' : 'var(--text3)'};border:1px solid var(--border);">${w[0]}</button>`).join('');
    const W = 620, H = 168, L = 44, R = 10, T0 = 10, B = 22;
    const cW = W - L - R, cH = H - T0 - B;
    const vals = days.map(r => r.s);
    const srt = [...vals].sort((a, b) => a - b);
    const q = f => srt[Math.min(srt.length - 1, Math.max(0, Math.round(f * (srt.length - 1))))];
    const pad = (q(0.99) - q(0.01)) * 0.12 || 1;
    const lo = win[2] ? q(0.01) - pad : Math.min(q(0.01) - pad, h.cheap_at_or_below);
    const hi = win[2] ? q(0.99) + pad : Math.max(q(0.99) + pad, h.expensive_at_or_above);
    const clamped = vals.filter(v => v < lo || v > hi).length;
    const cl = v => Math.max(lo, Math.min(hi, v));
    const y = v => T0 + cH - (cl(v) - lo) / ((hi - lo) || 1) * cH;
    const x = i => L + cW * i / ((days.length - 1) || 1);
    const txt = (xx, yy, s, anchor, col) => `<text x="${xx.toFixed(1)}" y="${yy.toFixed(1)}" text-anchor="${anchor}" font-size="10" fill="${col || 'var(--text3)'}" font-family="Share Tech Mono,monospace">${s}</text>`;
    const vis = v => v != null && v >= lo && v <= hi;
    const above = h.expensive_at_or_above != null && lo > h.expensive_at_or_above;
    let g = `<rect x="${L}" y="${T0}" width="${cW}" height="${cH}" fill="rgba(255,255,255,0.015)"/>`;
    if (above) g += `<rect x="${L}" y="${T0}" width="${cW}" height="${cH}" fill="var(--red)" opacity="0.07"/>`;
    if (vis(h.expensive_at_or_above)) g += `<rect x="${L}" y="${T0}" width="${cW}" height="${(y(h.expensive_at_or_above) - T0).toFixed(1)}" fill="var(--red)" opacity="0.07"/>`;
    if (vis(h.cheap_at_or_below)) g += `<rect x="${L}" y="${y(h.cheap_at_or_below).toFixed(1)}" width="${cW}" height="${(T0 + cH - y(h.cheap_at_or_below)).toFixed(1)}" fill="var(--green)" opacity="0.07"/>`;
    [[h.expensive_at_or_above, RICH, 'EXPENSIVE'], [h.cheap_at_or_below, CHEAP, 'CHEAP']].forEach(([v, col, lab]) => {
      if (!vis(v)) return;
      g += `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="${col}" stroke-dasharray="5,4" opacity="0.8"/>`;
      g += txt(L + 4, y(v) + (lab === 'EXPENSIVE' ? -4 : 11), `${lab} ${(v >= 0 ? '+' : '')}${v.toFixed(1)}`, 'start', col);
    });
    if (lo < 0 && hi > 0) g += `<line x1="${L}" x2="${W - R}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" stroke="rgba(255,255,255,0.18)"/>`;
    [hi, (hi + lo) / 2, lo].forEach(v => { g += txt(L - 5, y(v) + 4, (v >= 0 ? '+' : '') + v.toFixed(1), 'end'); });
    g += `<polyline points="${days.map((r, i) => `${x(i).toFixed(1)},${y(r.s).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--cyan)" stroke-width="1.4" stroke-linejoin="round"/>`;
    const last = days[days.length - 1];
    g += `<circle cx="${x(days.length - 1).toFixed(1)}" cy="${y(last.s).toFixed(1)}" r="3.2" fill="${last.s >= h.expensive_at_or_above ? RICH : last.s <= h.cheap_at_or_below ? CHEAP : FAIR}"/>`;
    if (days.length <= 25) days.forEach((r, i) => { g += `<circle cx="${x(i).toFixed(1)}" cy="${y(r.s).toFixed(1)}" r="1.9" fill="var(--cyan)" opacity="0.75"/>`; });
    const dfmt = days.length > 70 ? { month: 'short', year: 'numeric' } : { month: 'short', day: 'numeric' };
    [0, Math.floor((days.length - 1) / 2), days.length - 1].forEach((i, k) => {
      const lab = new Date(days[i].d + 'T00:00:00Z').toLocaleDateString('en-US', { ...dfmt, timeZone: 'UTC' });
      g += txt(x(i), H - 6, lab, k === 0 ? 'start' : k === 2 ? 'end' : 'middle');
    });
    return `<div style="margin:2px 0 8px;">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:3px;">
        <div style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);">WHAT OPTIONS CHARGE ABOVE WHAT SPY DELIVERS · LAST ${win[1]} · ${days.length} SESSIONS${clamped ? ` · ${clamped} DAY${clamped === 1 ? '' : 'S'} BEYOND THE SCALE` : ''}</div>
        <div style="flex:none;">${btns}</div>
      </div>
      <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="max-width:100%;height:auto;display:block;">${g}</svg>
      <div style="font-size:9px;color:var(--text3);margin-top:3px;">The cheap and expensive lines are the three-year quartiles, so they mean the same thing at every zoom.${above ? ` Every session in this window sits above the expensive line (+${h.expensive_at_or_above.toFixed(1)}), which is why it is off the bottom of the scale.` : ''}</div></div>`;
  }
  const GRID_COLORS = [['#00e08a', 'VERY CHEAP'], ['#9ad94a', 'CHEAP'], ['#ffcc00', 'FAIR'], ['#ff9933', 'EXPENSIVE'], ['#ff3355', 'VERY EXPENSIVE']];

  function gridBand(cents, hourly, bands) {
    if (cents == null || !hourly) return null;
    const share = cents / hourly * 100;
    for (let i = 0; i < bands.length; i++) if (share <= bands[i]) return i;
    return bands.length;
  }

  function gridSide(G, side, label) {
    const rows = G[side] || [];
    if (!rows.length) return '';
    const sign = side === 'calls' ? 1 : -1;
    const cols = rows[0].cells.length;
    const head = ['DAYS TO EXPIRY'].concat([...Array(cols).keys()].map(n => n === 0 ? 'AT THE MONEY' : (n * sign > 0 ? '+' : '') + (n * sign)));
    const body = rows.map(r => `<tr><td style="padding:4px 7px;font-family:'Share Tech Mono',monospace;color:var(--text2);white-space:nowrap;">${r.days}</td>${r.cells.map(c => {
      const b = gridBand(c, G.hourly_move_cents, G.bands);
      if (c == null || b == null) return `<td style="padding:4px 7px;text-align:center;color:var(--text3);">—</td>`;
      const col = GRID_COLORS[b][0];
      return `<td style="padding:4px 7px;text-align:center;background:${col}2e;border-left:2px solid ${col};font-family:'Share Tech Mono',monospace;color:var(--text);white-space:nowrap;">${c}¢</td>`;
    }).join('')}</tr>`).join('');
    return `<div style="margin-bottom:10px;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:3px;">${label}</div>
      <div style="overflow-x:auto;"><table style="border-collapse:collapse;font-size:11px;min-width:420px;"><thead><tr>${head.map(th).join('')}</tr></thead><tbody>${body}</tbody></table></div></div>`;
  }

  function grid(D) {
    const G = D && D.grid;
    if (!G || !G.hourly_move_cents) return '';
    const key = GRID_COLORS.map(([col, lab], i) => {
      const lo = i === 0 ? 0 : G.bands[i - 1], hi = i < G.bands.length ? G.bands[i] : null;
      const cents = v => Math.round(v / 100 * G.hourly_move_cents);
      return `<span style="display:inline-block;margin-right:12px;white-space:nowrap;"><span style="display:inline-block;width:9px;height:9px;background:${col};margin-right:4px;"></span><span style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);">${lab}</span> <span style="font-size:9px;color:var(--text3);">${hi ? `under ${cents(hi)}¢` : `over ${cents(G.bands[G.bands.length - 1])}¢`}</span></span>`;
    }).join('');
    return `<div class="panel" style="margin-bottom:12px;border-left:4px solid var(--cyan);">
      <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:3px;">⬡ WHAT EACH CONTRACT NEEDS FROM SPY IN AN HOUR</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.6;margin-bottom:8px;">Cents SPY has to travel in the direction you are holding, within one hour, for the contract to pay back its decay and its spread. Columns are dollars from the ${G.atm_strike} strike. Color is that cost against a typical hour's ${G.hourly_move_cents}¢ of travel${G.stale ? `; ${G.stale} contract${G.stale === 1 ? '' : 's'} left blank for a stale quote` : ''}.</div>
      <div style="margin-bottom:9px;">${key}</div>
      ${gridSide(G, 'calls', 'CALLS — BUYING A MOVE UP')}
      ${gridSide(G, 'puts', 'PUTS — BUYING A MOVE DOWN')}
    </div>`;
  }

  function render() {
    const el = document.getElementById('optionsEnvContent'); if (!el) return;
    const D = data();
    if (!D) { el.innerHTML = '<div class="no-data">options_env.js is not loaded yet — it is written by the daily pipeline.</div>'; return; }
    const T = D.today; const floor = D.floor;
    const C2 = D.cost_to_hold || {};
    const H = { ...C2, breakeven: (C2.breakeven_cents_per_hour || {})[C2.nearest_expiry_days] };
    const vcol = T.verdict === 'expensive' ? 'var(--red)' : T.verdict === 'cheap' ? 'var(--green)' : 'var(--yellow)';
    const vtext = T.verdict === 'expensive' ? 'CONTRACTS ARE EXPENSIVE' : T.verdict === 'cheap' ? 'CONTRACTS ARE CHEAP' : 'CONTRACTS ARE FAIRLY PRICED';
    const verd = (D.verdicts || []).map(v => { const [lab, col] = LEVEL[v.level] || LEVEL.info; return `<div style="padding:4px 0 4px 8px;border-left:2px solid ${col};margin-bottom:5px;"><span style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:${col};">${lab}</span> <span style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text);margin-left:6px;">${v.topic.toUpperCase()}</span><div style="font-size:12px;color:var(--text2);line-height:1.7;margin-top:2px;">${v.text}</div></div>`; }).join('');
    const P = D.premium || {}; const bv = P.by_vix || {};
    const premRows = [['Since 2010', P['2010_on']], ['Last 3 years', P['3y']], ['All history', P.all]].filter(x => x[1]).map(([lab, b]) => `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:5px 8px;color:var(--text);">${lab}</td><td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:var(--text3);">${b.n.toLocaleString()}</td><td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:${b.median_premium > 0 ? 'var(--red)' : 'var(--green)'};">${sgn(b.median_premium)} pts</td><td style="padding:5px 8px;">${rc(b.overpriced)}</td><td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:var(--text2);">${f2(b.median_implied)}</td><td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:var(--text2);">${f2(b.median_realized_after)}</td></tr>`).join('');
    const vixRows = Object.entries(bv).filter(([, b]) => b).map(([k, b]) => `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);${k === (T.implied_30d < 15 ? 'under 15' : T.implied_30d < 20 ? '15 to 20' : T.implied_30d < 30 ? '20 to 30' : 'over 30') ? 'background:rgba(0,204,255,0.08);' : ''}"><td style="padding:5px 8px;color:var(--text);">VIX ${k}</td><td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:var(--text3);">${b.n.toLocaleString()}</td><td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:${b.median_premium > 0 ? 'var(--red)' : 'var(--green)'};">${sgn(b.median_premium)} pts</td><td style="padding:5px 8px;">${rc(b.overpriced)}</td><td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:var(--text2);">${f2(b.median_realized_after)}</td></tr>`).join('');
    const TS = D.term_structure || {};
    const tsRows = Object.entries(TS).map(([k, b]) => `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);${k === T.term_shape ? 'background:rgba(0,204,255,0.08);' : ''}"><td style="padding:5px 8px;color:var(--text);">${k.charAt(0).toUpperCase() + k.slice(1)}${k === T.term_shape ? ' <span style="font-size:9px;color:var(--cyan);">today</span>' : ''}</td><td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:var(--text3);">${b.n.toLocaleString()}</td><td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:${b.median_premium > 0 ? 'var(--red)' : 'var(--green)'};">${sgn(b.median_premium)} pts</td><td style="padding:5px 8px;">${rc(b.overpriced)}</td><td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:var(--text2);">${f2(b.median_realized_after)}</td></tr>`).join('');
    const C = D.chain || {};
    const DTE = ['0 to 1', '2 to 4', '5 to 9', '10 to 30', 'over 30'], DIST = ['at the money', 'within 1%', '1 to 2%', '2 to 4%', 'over 4%'];
    const chainTable = C.available && C.buckets ? `<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${['DAYS TO EXPIRY \\ DISTANCE FROM SPOT', ...DIST].map(th).join('')}</tr></thead><tbody>${DTE.map(dt => `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:5px 8px;color:var(--text);">${dt}</td>${DIST.map(ds => { const b = C.buckets[`${dt}|${ds}`]; return `<td style="padding:5px 8px;">${b ? `<span style="font-family:'Share Tech Mono',monospace;color:${b.median_spread_pct > 10 ? 'var(--red)' : b.median_spread_pct > 4 ? 'var(--yellow)' : 'var(--green)'};">${f1(b.median_spread_pct)}%</span><div style="font-size:9px;color:var(--text3);">mid $${f2(b.median_mid)} · IV ${f1(b.median_iv)}% · OI ${b.median_open_interest.toLocaleString()}</div>` : '<span style="color:var(--text3);">—</span>'}</td>`; }).join('')}</tr>`).join('')}</tbody></table>` : `<div style="font-size:11px;color:var(--text3);">No chain captured yet. Every pipeline run stores the full CBOE chain; this table fills on the first capture.</div>`;
    const W = D.weekly_range || {};
    const tone = { go: 'var(--green)', stop: 'var(--red)', info: 'var(--text)' };
    const rows = (D.rows || []).map(r => `<div style="display:grid;grid-template-columns:minmax(170px,240px) minmax(150px,240px) 1fr;gap:12px;align-items:baseline;padding:7px 0;border-top:1px solid rgba(255,255,255,0.05);">
        <div style="font-size:11px;color:var(--text3);">${r.q}</div>
        <div style="font-size:14px;font-weight:700;color:${tone[r.tone] || 'var(--text)'};">${r.a}</div>
        <div style="font-size:11px;color:var(--text2);line-height:1.5;">${r.why}</div>
      </div>`).join('');
    const unsupported = (D.verdicts || []).filter(v => v.level === 'none');
    el.innerHTML = `
      <div class="panel" style="border-left:4px solid ${vcol};margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:4px;">THE OPTIONS ENVIRONMENT · CLOSE OF ${fmtDate(D.as_of).toUpperCase()}</div>
        <div style="font-family:'Orbitron',monospace;font-size:16px;letter-spacing:2px;color:${vcol};margin-bottom:6px;">${vtext}</div>
        ${gauge(T)}
        ${history(D)}
        ${rows || (D.verdicts || []).filter(v => v.level === 'finding').map(v => `<div style="font-size:12px;color:var(--text2);line-height:1.7;padding:3px 0;">${v.text}</div>`).join('')}
        <div style="font-size:10px;color:var(--text3);margin-top:8px;">Expensive or cheap is today's gap between what options charge and what SPY has delivered, placed against the last three years: top quarter is expensive, bottom quarter is cheap.</div>
      </div>
      ${unsupported.length ? `<div class="panel" style="margin-bottom:12px;border-left:4px solid var(--red);"><div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--red);margin-bottom:6px;">⬡ TESTED AND NOT SUPPORTED</div>${unsupported.map(v => `<div style="font-size:12px;color:var(--text2);padding:2px 0;"><span style="color:var(--red);">✕</span> ${v.headline || v.text} <span style="color:var(--text3);font-size:11px;">${v.headline ? (v.why || '') : ''}</span></div>`).join('')}</div>` : ''}
      ${evidenceFold('oeEvidence', 'SHOW THE EVIDENCE — THE MEASURES, EVERY FINDING, EVERY TABLE', `
      <div class="panel" style="border-left:4px solid ${vcol};margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:4px;">THE OPTIONS ENVIRONMENT · CLOSE OF ${fmtDate(D.as_of).toUpperCase()}</div>
        <div style="font-family:'Orbitron',monospace;font-size:16px;letter-spacing:2px;color:${vcol};margin-bottom:6px;">${vtext}</div>
        <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:baseline;margin-bottom:6px;">
          ${tile('PRICED TO MOVE, A TYPICAL SESSION', dol(T.priced_dollars), `VIX ${f2(T.implied_30d)}, above ${f0(T.implied_percentile_3y)}% of the last three years`)}
          ${tile('ACTUALLY MOVED, LAST 20 SESSIONS', dol(T.delivered_dollars), 'the middle session, close to close')}
          ${tile('PAID FOR AND NOT DELIVERED', T.gap_dollars == null ? '—' : `${dol(T.gap_dollars)} a day`, `a wider gap than ${f0(T.spread_percentile_3y)}% of the last three years`, vcol)}
          ${H.breakeven == null
            ? tile('IF YOU HOLD AN HOUR, SPY MUST MOVE', '—', 'needs a chain capture')
            : tile('IF YOU HOLD AN HOUR, SPY MUST MOVE', `${Math.round(H.breakeven)}¢ your way`, `${H.nearest_expiry_days} days to expiry, at the money${H.typical_hourly_move_dollars ? `. A typical hour moves ${Math.round(H.typical_hourly_move_dollars * 100)}¢` : ''}`)}
        </div>
        <div style="font-size:10px;color:var(--text3);">Priced to move is what the option market charges for a middle-of-the-road session; actually moved is what SPY delivered on one. The gap between them is what a buyer pays for and has not been getting, and its place in the last three years is what makes contracts expensive or cheap here: the top quarter is expensive, the bottom quarter is cheap. Break-even is a day's decay spread across the ${f1(H.session_hours || 6.5)}-hour session, divided by the contract's delta. It is where SPY has to be when you sell against where it was when you bought, in the direction you are positioned; the path in between does not matter. Hold longer and it scales with the time held.</div>
      </div>
      ${grid(D)}
      <div class="panel" style="margin-bottom:12px;border-left:4px solid var(--purple);">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--purple);margin-bottom:8px;">⬡ WHAT THIS MEANS — RECOMPUTED EVERY RUN</div>
        ${verd}
      </div>
      <div class="panel" style="margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ WHAT WAS CHARGED AGAINST WHAT CAME — IMPLIED VOLATILITY MINUS THE REALIZED VOLATILITY OF THE NEXT ${D.forward_sessions} SESSIONS</div>
        <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${['PERIOD', 'SESSIONS', 'MEDIAN OVERCHARGE', 'SHARE OF SESSIONS OVERCHARGED', 'MEDIAN IMPLIED', 'MEDIAN REALIZED AFTER'].map(th).join('')}</tr></thead><tbody>${premRows}</tbody></table></div>
        <div style="overflow-x:auto;margin-top:10px;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${['REGIME AT THE TIME (SINCE 2010)', 'SESSIONS', 'MEDIAN OVERCHARGE', 'SHARE OVERCHARGED', 'MEDIAN REALIZED AFTER'].map(th).join('')}</tr></thead><tbody>${vixRows}</tbody></table></div>
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">A positive overcharge means implied volatility was higher than the volatility that followed — the buyer paid more than the market delivered. Highlighted row is the regime in force today.</div>
      </div>
      <div class="panel" style="margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ TERM STRUCTURE — 9-DAY ${f2(T.term && T.term.vix9d)} · 30-DAY ${f2(T.term && T.term.vix)} · 3-MONTH ${f2(T.term && T.term.vix3m)} · VOLATILITY OF VOLATILITY ${f2(T.term && T.term.vvix)}</div>
        <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${['CURVE SHAPE', 'SESSIONS', 'MEDIAN OVERCHARGE AFTER', 'SHARE OVERCHARGED', 'MEDIAN REALIZED AFTER'].map(th).join('')}</tr></thead><tbody>${tsRows || `<tr><td colspan="5" style="padding:6px 8px;color:var(--text3);">Scored at ${floor} sessions per shape.</td></tr>`}</tbody></table></div>
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">Inverted means the 9-day index sits above the 3-month — near-term fear priced above the horizon. Flat is within one point. Upward is the ordinary state.</div>
      </div>
      <div class="panel" style="margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ WHAT THE CHAIN CHARGES TO TRADE — MEDIAN BID-ASK SPREAD AS A PERCENT OF THE CONTRACT'S OWN PRICE</div>
        <div style="overflow-x:auto;">${chainTable}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">${C.available ? `Last capture ${C.captured_at ? fmtDate(C.captured_at.slice(0, 10)) : '—'}, spot $${f2(C.spot)}, ${C.rows.toLocaleString()} contract rows across ${C.sessions} session${C.sessions === 1 ? '' : 's'}. ` : ''}The spread is the round-trip cost paid before the trade is right or wrong: a contract quoted 1.00 bid and 1.10 ask costs 9.5% of its own price to enter and exit.</div>
      </div>
      <div class="panel">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ THE WEEKLY EXPECTED MOVE'S OWN RECORD</div>
        <div style="font-size:12px;color:var(--text2);line-height:1.8;">${W.n ? `The range held on ${W.held.rate != null ? `${f1(W.held.rate)}% of ${W.n} weeks (${f1(W.held.lo)}–${f1(W.held.hi)})` : `${W.n} weeks`}, ${fmtDate(W.first, 'short')} → ${fmtDate(W.last, 'short')}. When price broke above the range the median overshoot was ${f2(W.median_overshoot_high)}% past it; when it broke below, ${f2(W.median_overshoot_low)}%.` : 'No scored weeks yet.'}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">The range is the one locked at the prior Friday's close and never revised. Held means the week's high stayed at or under the top and its low stayed at or above the bottom.</div>
      </div>`)}`;
  }
  window.renderOptionsEnv = render;
})();
