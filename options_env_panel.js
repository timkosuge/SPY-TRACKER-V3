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
    g += txt(nx, bY - 17, `WIDER THAN ${Math.round(p)}% OF THE LAST THREE YEARS`, nx < 200 ? 'start' : nx > W - 200 ? 'end' : 'middle', col, 11);
    g += txt(L, bY + bH + 14, 'CHEAP', 'start', CHEAP) + txt(L + bW / 2, bY + bH + 14, 'FAIRLY PRICED', 'middle', FAIR) + txt(W - R, bY + bH + 14, 'EXPENSIVE', 'end', RICH);
    return `<div style="margin:10px 0 4px;">
      <div style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);margin-bottom:2px;">WHERE THE 30-DAY INDEX SITS AGAINST ITS OWN LAST THREE YEARS — NOT A READING ON THE CONTRACTS NAMED ABOVE</div>
      <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="max-width:100%;height:auto;display:block;">${g}</svg></div>`;
  }

  const OE_WINS = [['3Y', '3 YEARS', null], ['3M', '3 MONTHS', 63], ['1M', '1 MONTH', 21], ['1W', '1 WEEK', 5]];

  function history(D) {
    const h = D && D.history, all = h && h.days;
    if (!all || all.length < 30) return '';
    const win = OE_WINS.find(w => w[0] === window._oeWin) || OE_WINS[0];
    const days = win[2] ? all.slice(-Math.min(win[2], all.length)) : all;
    if (days.length < 2) return '';
    const both = window._oeMode === 'both' && days.some(r => r.i != null);
    const modes = [['gap', 'THE DIFFERENCE'], ['both', 'BOTH LINES']].map(m => `<button onclick="window._oeMode='${m[0]}';renderOptionsEnv()" style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;padding:3px 8px;margin-right:4px;cursor:pointer;background:${(m[0] === 'both') === both ? 'var(--cyan)' : 'var(--bg3)'};color:${(m[0] === 'both') === both ? 'var(--bg)' : 'var(--text3)'};border:1px solid var(--border);">${m[1]}</button>`).join('');
    const btns = OE_WINS.filter(w => !w[2] || all.length > w[2]).map(w => `<button onclick="window._oeWin='${w[0]}';renderOptionsEnv()" style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;padding:3px 8px;margin-right:4px;cursor:pointer;background:${w[0] === win[0] ? 'var(--cyan)' : 'var(--bg3)'};color:${w[0] === win[0] ? 'var(--bg)' : 'var(--text3)'};border:1px solid var(--border);">${w[0]}</button>`).join('');
    const W = 620, H = 168, L = 44, R = 10, T0 = 10, B = 22;
    const cW = W - L - R, cH = H - T0 - B;
    const vals = both ? days.flatMap(r => [r.i, r.r]).filter(v => v != null) : days.map(r => r.s);
    const srt = [...vals].sort((a, b) => a - b);
    const q = f => srt[Math.min(srt.length - 1, Math.max(0, Math.round(f * (srt.length - 1))))];
    const pad = (q(0.99) - q(0.01)) * 0.12 || 1;
    const lo = (both || win[2]) ? q(0.01) - pad : Math.min(q(0.01) - pad, h.cheap_at_or_below);
    const hi = (both || win[2]) ? q(0.99) + pad : Math.max(q(0.99) + pad, h.expensive_at_or_above);
    const clamped = vals.filter(v => v < lo || v > hi).length;
    const cl = v => Math.max(lo, Math.min(hi, v));
    const y = v => T0 + cH - (cl(v) - lo) / ((hi - lo) || 1) * cH;
    const x = i => L + cW * i / ((days.length - 1) || 1);
    const txt = (xx, yy, s, anchor, col) => `<text x="${xx.toFixed(1)}" y="${yy.toFixed(1)}" text-anchor="${anchor}" font-size="10" fill="${col || 'var(--text3)'}" font-family="Share Tech Mono,monospace">${s}</text>`;
    const vis = v => !both && v != null && v >= lo && v <= hi;
    const above = !both && h.expensive_at_or_above != null && lo > h.expensive_at_or_above;
    let g = `<rect x="${L}" y="${T0}" width="${cW}" height="${cH}" fill="rgba(255,255,255,0.015)"/>`;
    if (above) g += `<rect x="${L}" y="${T0}" width="${cW}" height="${cH}" fill="var(--red)" opacity="0.07"/>`;
    if (vis(h.expensive_at_or_above)) g += `<rect x="${L}" y="${T0}" width="${cW}" height="${(y(h.expensive_at_or_above) - T0).toFixed(1)}" fill="var(--red)" opacity="0.07"/>`;
    if (vis(h.cheap_at_or_below)) g += `<rect x="${L}" y="${y(h.cheap_at_or_below).toFixed(1)}" width="${cW}" height="${(T0 + cH - y(h.cheap_at_or_below)).toFixed(1)}" fill="var(--green)" opacity="0.07"/>`;
    [[h.expensive_at_or_above, RICH, 'EXPENSIVE'], [h.cheap_at_or_below, CHEAP, 'CHEAP']].forEach(([v, col, lab]) => {
      if (!vis(v)) return;
      g += `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="${col}" stroke-dasharray="5,4" opacity="0.8"/>`;
      g += txt(L + 4, y(v) + (lab === 'EXPENSIVE' ? -4 : 11), `${lab} AT ${v.toFixed(1)} POINTS`, 'start', col);
    });
    if (lo < 0 && hi > 0) g += `<line x1="${L}" x2="${W - R}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" stroke="rgba(255,255,255,0.18)"/>`;
    [hi, (hi + lo) / 2, lo].forEach(v => { g += txt(L - 5, y(v) + 4, v.toFixed(1), 'end'); });
    const last = days[days.length - 1];
    if (!both) {
      g += `<polyline points="${days.map((r, i) => `${x(i).toFixed(1)},${y(r.s).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--cyan)" stroke-width="1.4" stroke-linejoin="round"/>`;
      g += `<circle cx="${x(days.length - 1).toFixed(1)}" cy="${y(last.s).toFixed(1)}" r="3.2" fill="${last.s >= h.expensive_at_or_above ? RICH : last.s <= h.cheap_at_or_below ? CHEAP : FAIR}"/>`;
    }
    if (both) {
      const band = days.map((r, i) => `${x(i).toFixed(1)},${y(r.i).toFixed(1)}`).join(' ') + ' ' +
                   days.map((r, i) => `${x(days.length - 1 - i).toFixed(1)},${y(days[days.length - 1 - i].r).toFixed(1)}`).join(' ');
      g += `<polygon points="${band}" fill="var(--red)" opacity="0.13"/>`;
      g += `<polyline points="${days.map((r, i) => `${x(i).toFixed(1)},${y(r.i).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--red)" stroke-width="1.4" stroke-linejoin="round"/>`;
      g += `<polyline points="${days.map((r, i) => `${x(i).toFixed(1)},${y(r.r).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--cyan)" stroke-width="1.4" stroke-linejoin="round"/>`;
      const last = days[days.length - 1];
      g += txt(W - R - 2, y(last.i) - 5, `WHAT THE INDEX CHARGES ${f1(last.i)}`, 'end', 'var(--red)');
      g += txt(W - R - 2, y(last.r) + 13, `WHAT SPY DELIVERED ${f1(last.r)}`, 'end', 'var(--cyan)');
    }
    if (!both && days.length <= 25) days.forEach((r, i) => { g += `<circle cx="${x(i).toFixed(1)}" cy="${y(r.s).toFixed(1)}" r="1.9" fill="var(--cyan)" opacity="0.75"/>`; });
    const dfmt = days.length > 70 ? { month: 'short', year: 'numeric' } : { month: 'short', day: 'numeric' };
    [0, Math.floor((days.length - 1) / 2), days.length - 1].forEach((i, k) => {
      const lab = new Date(days[i].d + 'T00:00:00Z').toLocaleDateString('en-US', { ...dfmt, timeZone: 'UTC' });
      g += txt(x(i), H - 6, lab, k === 0 ? 'start' : k === 2 ? 'end' : 'middle');
    });
    return `<div style="margin:2px 0 8px;">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:3px;">
        <div style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);">${both ? 'WHAT THE INDEX CHARGES AGAINST WHAT SPY DELIVERED' : 'HOW FAR THE INDEX SITS ABOVE WHAT SPY DELIVERED'} · VOLATILITY POINTS · LAST ${win[1]} · ${days.length} SESSIONS${clamped ? ` · ${clamped} DAY${clamped === 1 ? '' : 'S'} BEYOND THE SCALE` : ''}</div>
        <div style="flex:none;">${modes}${btns}</div>
      </div>
      <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="max-width:100%;height:auto;display:block;">${g}</svg>
      <div style="font-size:9px;color:var(--text3);margin-top:3px;">${both ? 'The shaded band is the distance between the two lines. It widens when the index rises faster than SPY delivers, and closes when SPY catches up or the index falls back. ' : ''}The two dashed lines are fixed at the same place in every view, so cheap and expensive mean one thing at every zoom: expensive is where the widest quarter of the last three years of sessions begins, cheap is where the narrowest quarter ends.${above ? ` Every session in this window sits above the expensive line (+${h.expensive_at_or_above.toFixed(1)}), which is why it is off the bottom of the scale.` : ''}</div></div>`;
  }
    const inkOn = hex => {
    const v = i => { const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * v(0) + 0.7152 * v(1) + 0.0722 * v(2) > 0.4 ? '#0b0f1a' : '#ffffff';
  };
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
    const head = ['DAYS'].concat([...Array(cols).keys()].map(n => n === 0 ? 'ATM' : (n * sign > 0 ? '+' : '') + (n * sign)));
    const body = rows.map(r => `<tr><td style="padding:4px 7px;font-family:'Share Tech Mono',monospace;color:var(--text2);white-space:nowrap;">${r.days}</td>${r.cells.map(c => {
      const b = gridBand(c, G.hourly_move_cents, G.bands);
      if (c == null || b == null) return `<td style="padding:4px 7px;text-align:center;color:var(--text3);">—</td>`;
      const col = GRID_COLORS[b][0];
      return `<td style="padding:5px 7px;text-align:center;background:${col};font-family:'Share Tech Mono',monospace;color:${inkOn(col)};white-space:nowrap;">${c}¢</td>`;
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
      return `<span style="display:inline-block;margin-right:12px;white-space:nowrap;"><span style="display:inline-block;width:11px;height:11px;background:${col};margin-right:4px;vertical-align:-1px;"></span><span style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);">${lab}</span> <span style="font-size:9px;color:var(--text3);">${hi ? `under ${cents(hi)}¢` : `over ${cents(G.bands[G.bands.length - 1])}¢`}</span></span>`;
    }).join('');
    return `<div class="panel" style="margin-bottom:12px;border-left:4px solid var(--cyan);">
      <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:3px;">⬡ WHAT EACH CONTRACT NEEDS FROM SPY IN AN HOUR</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.6;margin-bottom:8px;">Each cell is the cents SPY has to travel in the direction you are holding, within one hour, for that contract to pay back its decay and its bid-ask spread. Rows are days to expiry. Columns are dollars away from the ${G.atm_strike} strike, which is the one nearest SPY's ${dol(G.spot)}. Calls are shown at and above that strike and puts at and below, because those are the ones a directional buyer uses. Color compares the cost to a typical hour's ${G.hourly_move_cents}¢ of travel, on fixed thresholds, so a calm board reads green and an expensive one reads red${G.stale ? `. ${G.stale} contract${G.stale === 1 ? ' is' : 's are'} left blank because the quote was more than three times its expiry's usual bid-ask spread, which means a stale quote rather than an expensive contract` : ''}.${D.chain && D.chain.captured_stamp ? ` Chain captured ${D.chain.captured_stamp}.` : ''}</div>
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
    const SD = T.short_dated;
    const SD_WORD = ['CHEAP', 'INEXPENSIVE', 'FAIRLY PRICED', 'EXPENSIVE', 'VERY EXPENSIVE'];
    const ixcol = T.verdict === 'expensive' ? 'var(--red)' : T.verdict === 'cheap' ? 'var(--green)' : 'var(--yellow)';
    const vcol = SD ? GRID_COLORS[SD.band][0] : ixcol;
    const vtext = SD
      ? `CONTRACTS UNDER ${SD.max_days} DAYS ARE ${SD_WORD[SD.band]} TO HOLD`
      : (T.verdict === 'expensive' ? '30-DAY INDEX VOLATILITY IS EXPENSIVE' : T.verdict === 'cheap' ? '30-DAY INDEX VOLATILITY IS CHEAP' : '30-DAY INDEX VOLATILITY IS FAIRLY PRICED');
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
    const rows = (D.rows || []).map(r => `<div class="oe-row" style="display:grid;grid-template-columns:minmax(170px,240px) minmax(150px,240px) 1fr;gap:12px;align-items:baseline;padding:7px 0;border-top:1px solid rgba(255,255,255,0.05);">
        <div style="font-size:11px;color:var(--text3);">${r.q}</div>
        <div style="font-size:14px;font-weight:700;color:${tone[r.tone] || 'var(--text)'};">${r.a}</div>
        <div style="font-size:11px;color:var(--text2);line-height:1.5;">${r.why}</div>
      </div>`).join('');
    const unsupported = (D.verdicts || []).filter(v => v.level === 'none');
    el.innerHTML = `
      <style>
        @media (max-width: 620px) {
          #optionsEnvContent .oe-row { grid-template-columns: 1fr !important; gap: 2px !important; }
          #optionsEnvContent svg { width: 100% !important; height: auto !important; }
        }
      </style>
      <div class="panel" style="border-left:4px solid ${vcol};margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:4px;">THE OPTIONS ENVIRONMENT · CLOSE OF ${fmtDate(D.as_of).toUpperCase()}</div>
        <div style="font-family:'Orbitron',monospace;font-size:16px;letter-spacing:2px;color:${vcol};margin-bottom:6px;">${vtext}</div>
        ${SD ? `<div style="font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:8px;">Measured on the ${SD.n} contracts at the money to ${SD.max_strikes} dollars from it, ${SD.max_days} days to expiry or less, in the chain captured ${(D.chain && D.chain.captured_stamp) || 'the last run'}. The middle one needs SPY to travel ${SD.median_breakeven_cents}¢ in your direction within an hour to cover its decay and its bid-ask spread; the range across all ${SD.n} is ${SD.low_cents}¢ to ${SD.high_cents}¢. A typical hour has moved SPY ${H.typical_hourly_move_dollars ? Math.round(H.typical_hourly_move_dollars * 100) + '¢' : 'an unmeasured amount'}, measured over the last 60 sessions of one-minute bars.</div>` : ''}
        ${gauge(T)}
        ${history(D)}
        ${rows || (D.verdicts || []).filter(v => v.level === 'finding').map(v => `<div style="font-size:12px;color:var(--text2);line-height:1.7;padding:3px 0;">${v.text}</div>`).join('')}
        <div style="font-size:10px;color:var(--text3);margin-top:8px;">Everything in this section is the 30-day index: today's gap between what it charges and what SPY has delivered, placed against the last three years, where the top quarter is expensive and the bottom quarter cheap. The headline above prices the short-dated contracts instead, and the two can disagree.</div>
      </div>
      ${unsupported.length ? `<div class="panel" style="margin-bottom:12px;border-left:4px solid var(--red);"><div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--red);margin-bottom:6px;">⬡ TESTED AND NOT SUPPORTED</div>${unsupported.map(v => `<div style="font-size:12px;color:var(--text2);padding:2px 0;"><span style="color:var(--red);">✕</span> ${v.headline || v.text} <span style="color:var(--text3);font-size:11px;">${v.headline ? (v.why || '') : ''}</span></div>`).join('')}</div>` : ''}
      ${evidenceFold('oeEvidence', 'SHOW THE EVIDENCE — THE MEASURES, EVERY FINDING, EVERY TABLE', `
      <div class="panel" style="border-left:4px solid ${vcol};margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:4px;">THE NUMBERS BEHIND THE HEADLINE · CLOSE OF ${fmtDate(D.as_of).toUpperCase()}</div>
        <div style="font-family:'Orbitron',monospace;font-size:16px;letter-spacing:2px;color:${vcol};margin-bottom:6px;">THE SAME READING, WITH EVERY MEASURE BEHIND IT</div>
        <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:baseline;margin-bottom:6px;">
          ${SD ? tile('AT THE MONEY, A FEW DAYS OUT', `${SD.median_breakeven_cents}¢ an hour`, `${SD.low_cents}–${SD.high_cents}¢ across ${SD.n} contracts, against a typical hour's ${H.typical_hourly_move_dollars ? Math.round(H.typical_hourly_move_dollars * 100) : '—'}¢`, vcol) : ''}
          ${tile('PRICED TO MOVE, A TYPICAL SESSION', dol(T.priced_dollars), `VIX ${f2(T.implied_30d)}, above ${f0(T.implied_percentile_3y)}% of the last three years`)}
          ${tile('ACTUALLY MOVED, LAST 20 SESSIONS', dol(T.delivered_dollars), 'the middle session, close to close')}
          ${tile('PAID FOR AND NOT DELIVERED', T.gap_dollars == null ? '—' : `${dol(T.gap_dollars)} a day`, `a wider gap than ${f0(T.spread_percentile_3y)}% of the last three years`, ixcol)}
        </div>
        <div style="font-size:10px;color:var(--text3);line-height:1.6;">
          <div style="margin-bottom:5px;"><b style="color:var(--text2);">What a volatility point is.</b> Volatility is quoted as a percent per year. The index at ${f2(T.implied_30d)} means the market is pricing SPY to move about ${f2(T.expected_daily_move_pct)}% on a bigger-than-usual day. One point is worth about $${(T.close / Math.sqrt(252) / 100).toFixed(2)} of daily movement at today's price of $${f2(T.close)}.</div>
          <div style="margin-bottom:5px;"><b style="color:var(--text2);">Two different measurements on this page.</b> ${SD ? `The headline prices the contracts a day trader actually uses: at the money to ${SD.max_strikes} dollars from it, ${SD.max_days} days to expiry or less. ` : ''}Everything in this section prices the 30-day index instead. The index is a weighted reading across every strike, and far out-of-the-money puts carry most of its weight, so it mostly measures what crash protection costs. The two can disagree and both still be correct.</div>
          <div style="margin-bottom:5px;"><b style="color:var(--text2);">Priced to move, and actually moved.</b> Priced to move is what the index charges for a middle-of-the-road session. Actually moved is what SPY delivered on the middle session of the last 20. The difference is what a buyer paid for and did not get. Where that difference falls among the last three years of sessions is what the word expensive means here: the widest quarter is expensive, the narrowest quarter is cheap.</div>
          <div><b style="color:var(--text2);">Break-even.</b> One day of decay spread evenly across the ${f1(H.session_hours || 6.5)}-hour session, divided by the contract's delta, which is the share of SPY's move the contract captures. It is how far SPY must sit from your entry when you sell, in the direction you bought. The path in between does not count, only the two end points. Hold two hours and it roughly doubles.</div>
        </div>
      </div>
      ${grid(D)}
      <div class="panel" style="margin-bottom:12px;border-left:4px solid var(--purple);">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--purple);margin-bottom:8px;">⬡ WHAT THIS MEANS — RECOMPUTED EVERY RUN</div>
        ${verd}
      </div>
      <div class="panel" style="margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ WHAT THE INDEX CHARGED AGAINST WHAT SPY THEN DELIVERED OVER THE FOLLOWING ${D.forward_sessions} SESSIONS</div>
        <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${['PERIOD', 'SESSIONS', 'MIDDLE CASE, POINTS CHARGED ABOVE DELIVERED', 'SHARE WHERE CHARGED BEAT DELIVERED', 'MIDDLE CASE CHARGED', 'MIDDLE CASE DELIVERED AFTER'].map(th).join('')}</tr></thead><tbody>${premRows}</tbody></table></div>
        <div style="overflow-x:auto;margin-top:10px;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${['VIX LEVEL AT THE TIME (SINCE 2010)', 'SESSIONS', 'MIDDLE CASE, POINTS CHARGED ABOVE DELIVERED', 'SHARE WHERE CHARGED BEAT DELIVERED', 'MIDDLE CASE DELIVERED AFTER'].map(th).join('')}</tr></thead><tbody>${vixRows}</tbody></table></div>
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">Each row compares the 30-day index on a given day against the movement SPY actually delivered over the ${D.forward_sessions} sessions that followed it. A positive number means the index charged more than SPY went on to deliver, so a buyer on that day started behind. The highlighted row is the VIX level in force today.</div>
      </div>
      <div class="panel" style="margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ THE INDEX READ AT THREE LENGTHS — 9-DAY ${f2(T.term && T.term.vix9d)} · 30-DAY ${f2(T.term && T.term.vix)} · 3-MONTH ${f2(T.term && T.term.vix3m)} · HOW MUCH THE INDEX ITSELF MOVES (VVIX) ${f2(T.term && T.term.vvix)}</div>
        <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${['SHAPE', 'SESSIONS', 'MIDDLE CASE, POINTS CHARGED ABOVE DELIVERED', 'SHARE WHERE CHARGED BEAT DELIVERED', 'MIDDLE CASE DELIVERED AFTER'].map(th).join('')}</tr></thead><tbody>${tsRows || `<tr><td colspan="5" style="padding:6px 8px;color:var(--text3);">Scored at ${floor} sessions per shape.</td></tr>`}</tbody></table></div>
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">Upward means the 3-month index sits above the 9-day, which is the ordinary state. Inverted means the 9-day sits above the 3-month, so the market is charging more for the next two weeks than for the next quarter. Flat means the three readings sit within one point of each other.</div>
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
