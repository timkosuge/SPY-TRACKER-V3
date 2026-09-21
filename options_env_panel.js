(function () {
  const data = () => (typeof OPTIONS_ENV !== 'undefined') ? OPTIONS_ENV : null;
  const LEVEL = { finding: ['FINDING', 'var(--green)'], none: ['NOT SUPPORTED', 'var(--red)'], info: ['NOTE', 'var(--cyan)'] };
  const f1 = v => v == null ? '—' : Number(v).toFixed(1), f2 = v => v == null ? '—' : Number(v).toFixed(2);
  const sgn = v => v == null ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(2);
  const rc = r => (!r || !r.n) ? '—' : `<span style="font-family:'Share Tech Mono',monospace;color:var(--text);">${f1(r.rate)}%</span> <span style="font-size:9px;color:var(--text3);">${f1(r.lo)}–${f1(r.hi)} · n=${r.n.toLocaleString()}</span>`;
  const th = h => `<th style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);text-align:left;padding:5px 8px;border-bottom:1px solid var(--border);">${h}</th>`;
  function render() {
    const el = document.getElementById('optionsEnvContent'); if (!el) return;
    const D = data();
    if (!D) { el.innerHTML = '<div class="no-data">options_env.js is not loaded yet — it is written by the daily pipeline.</div>'; return; }
    const T = D.today; const floor = D.floor;
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
        ${rows || (D.verdicts || []).filter(v => v.level === 'finding').map(v => `<div style="font-size:12px;color:var(--text2);line-height:1.7;padding:3px 0;">${v.text}</div>`).join('')}
        <div style="font-size:10px;color:var(--text3);margin-top:8px;">Expensive or cheap is today's gap between what options charge and what SPY has delivered, placed against the last three years: top quarter is expensive, bottom quarter is cheap.</div>
      </div>
      ${unsupported.length ? `<div class="panel" style="margin-bottom:12px;border-left:4px solid var(--red);"><div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--red);margin-bottom:6px;">⬡ TESTED AND NOT SUPPORTED</div>${unsupported.map(v => `<div style="font-size:12px;color:var(--text2);padding:2px 0;"><span style="color:var(--red);">✕</span> ${v.headline || v.text} <span style="color:var(--text3);font-size:11px;">${v.headline ? (v.why || '') : ''}</span></div>`).join('')}</div>` : ''}
      ${evidenceFold('oeEvidence', 'SHOW THE EVIDENCE — THE MEASURES, EVERY FINDING, EVERY TABLE', `
      <div class="panel" style="border-left:4px solid ${vcol};margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:4px;">THE OPTIONS ENVIRONMENT · CLOSE OF ${fmtDate(D.as_of).toUpperCase()}</div>
        <div style="font-family:'Orbitron',monospace;font-size:16px;letter-spacing:2px;color:${vcol};margin-bottom:6px;">${vtext}</div>
        <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:baseline;margin-bottom:6px;">
          <div><span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);">30-DAY IMPLIED (VIX)</span><br><span style="font-family:'Share Tech Mono',monospace;font-size:20px;color:var(--text);">${f2(T.implied_30d)}</span> <span style="font-size:10px;color:var(--text3);">${f1(T.implied_percentile_3y)}th pct, 3 yr</span></div>
          <div><span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);">REALIZED, LAST 20 SESSIONS</span><br><span style="font-family:'Share Tech Mono',monospace;font-size:20px;color:var(--text);">${f2(T.realized_20d)}</span> <span style="font-size:10px;color:var(--text3);">5-session ${f2(T.realized_5d)} · high-low ${f2(T.realized_20d_high_low)}</span></div>
          <div><span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);">WHAT IS CHARGED ABOVE WHAT IS DELIVERED</span><br><span style="font-family:'Share Tech Mono',monospace;font-size:20px;color:${vcol};">${sgn(T.spread)} pts</span> <span style="font-size:10px;color:var(--text3);">${f1(T.spread_percentile_3y)}th pct, 3 yr</span></div>
          <div><span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);">TYPICAL SESSION: PRICED vs DELIVERED</span><br><span style="font-family:'Share Tech Mono',monospace;font-size:20px;color:var(--text);">${f2(T.typical_move_priced_pct != null ? T.typical_move_priced_pct : T.expected_daily_move_pct)}%</span> <span style="font-size:10px;color:var(--text3);">against ${f2(T.delivered_daily_move_pct)}% median</span></div>
        </div>
        <div style="font-size:10px;color:var(--text3);">Expensive or cheap is this spread's place in the last three years: at or above the 75th percentile is expensive, at or below the 25th is cheap. Implied volatility is the 30-day index; realized is annualized from closes, with the high-low estimate beside it.</div>
      </div>
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
