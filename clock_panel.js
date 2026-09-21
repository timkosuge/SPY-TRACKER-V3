(function () {
  const data = () => (typeof CLOCK_DATA !== 'undefined') ? CLOCK_DATA : null;
  const f1 = v => v == null ? '—' : Number(v).toFixed(1), f2 = v => v == null ? '—' : Number(v).toFixed(2), f3 = v => v == null ? '—' : Number(v).toFixed(3);
  const rc = r => (!r || !r.n) ? '—' : `<span style="font-family:'Share Tech Mono',monospace;color:var(--text);">${f1(r.rate)}%</span> <span style="font-size:9px;color:var(--text3);">${f1(r.lo)}–${f1(r.hi)} · n=${r.n}</span>`;
  const th = h => `<th style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);text-align:left;padding:5px 8px;border-bottom:1px solid var(--border);">${h}</th>`;
  function render() {
    const el = document.getElementById('clockSessionsContent'); if (!el) return;
    const D = data();
    if (!D) { el.innerHTML = '<div class="no-data">clock_data.js is not loaded yet — it is written by the daily pipeline.</div>'; return; }
    const S = D.session; const prof = S.profile || []; const maxR = Math.max(...prof.map(p => p.range_median || 0), 0.001); const maxV = Math.max(...prof.map(p => p.volume_share_mean || 0), 0.001);
    const bars = prof.map(p => `<div style="flex:1;text-align:center;"><div style="display:flex;align-items:flex-end;justify-content:center;gap:2px;height:80px;"><div title="range ${f3(p.range_median)}%" style="width:40%;background:var(--cyan);height:${Math.round((p.range_median || 0) / maxR * 100)}%;opacity:0.85;"></div><div title="volume ${f1(p.volume_share_mean)}%" style="width:40%;background:var(--yellow);height:${Math.round((p.volume_share_mean || 0) / maxV * 100)}%;opacity:0.7;"></div></div><div style="font-size:8px;color:var(--text3);margin-top:2px;">${p.slot}</div><div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text2);">${f3(p.range_median)}%</div><div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text3);">${f1(p.volume_share_mean)}%</div></div>`).join('');
    const O = D.overnight; const hr = O.hour_range_median_et || {}; const hours = Object.keys(hr).map(Number).sort((a, b) => a - b);
    const ctOf = h => { const c = (h + 23) % 24; return `${c === 0 ? 12 : c > 12 ? c - 12 : c}${c < 12 ? 'a' : 'p'}`; };
    const maxH = Math.max(...hours.map(h => hr[h] || 0), 0.0001);
    const hourBars = hours.map(h => `<div style="flex:1;text-align:center;"><div style="display:flex;align-items:flex-end;justify-content:center;height:60px;"><div title="${ctOf(h)} CT · median 5-minute range ${f3((hr[h] || 0))}%" style="width:60%;background:${(h >= 9 && h < 16) ? 'var(--cyan)' : 'var(--purple)'};height:${Math.round((hr[h] || 0) / maxH * 100)}%;opacity:0.85;"></div></div><div style="font-size:7px;color:var(--text3);margin-top:2px;">${ctOf(h)}</div></div>`).join('');
    const evRows = Object.values(O.events || {}).map(e => `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:5px 8px;color:var(--text);">${e.label}</td><td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:var(--text3);">${ctOf(Number(e.time_et.slice(0, 2)))}${e.time_et.slice(2)} CT</td><td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:var(--text3);">${e.n}</td><td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;">${f3(e.range_before)}% → <span style="color:var(--text);">${f3(e.range_at)}%</span> → ${f3(e.range_after)}%</td><td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;">${e.volume_before != null ? e.volume_before.toLocaleString() : '—'} → <span style="color:var(--text);">${e.volume_at != null ? e.volume_at.toLocaleString() : '—'}</span> → ${e.volume_after != null ? e.volume_after.toLocaleString() : '—'}</td><td style="padding:5px 8px;">${rc(e.reverses_prior_3h)}</td></tr>`).join('');
    const d10 = D.daily['2010-2026'] || {}, d3 = D.daily['3y'] || {};
    const wk = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(k => { const a = (d10.by_weekday || {})[k] || {}, b = (d3.by_weekday || {})[k] || {}; return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:5px 8px;color:var(--text);">${k}</td><td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:${(a.session_mean || 0) >= 0 ? 'var(--green)' : 'var(--red)'};">${a.session_mean != null ? (a.session_mean >= 0 ? '+' : '') + f3(a.session_mean) + '%' : '—'}</td><td style="padding:5px 8px;">${rc(a.session_up)}</td><td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:${(a.overnight_mean || 0) >= 0 ? 'var(--green)' : 'var(--red)'};">${a.overnight_mean != null ? (a.overnight_mean >= 0 ? '+' : '') + f3(a.overnight_mean) + '%' : '—'}</td><td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:${(b.session_mean || 0) >= 0 ? 'var(--green)' : 'var(--red)'};">${b.session_mean != null ? (b.session_mean >= 0 ? '+' : '') + f3(b.session_mean) + '%' : '—'}</td><td style="padding:5px 8px;">${rc(b.session_up)}</td></tr>`; }).join('');
    const V = D.verdicts || [];
    const held = V.filter(v => v.level === 'finding'), not = V.filter(v => v.level === 'none'), notes = V.filter(v => v.level === 'info');
    const heldHtml = held.map(v => `<div style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.05);">
        <div style="font-size:14px;font-weight:700;color:var(--green);">${v.headline || v.text}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px;">${v.why || ''}</div></div>`).join('');
    const notHtml = not.map(v => `<div style="font-size:12px;color:var(--text2);padding:3px 0;"><span style="color:var(--red);">✕</span> ${v.headline || v.text} <span style="color:var(--text3);font-size:11px;">${v.why || ''}</span></div>`).join('');
    el.innerHTML = `
      <div class="panel" style="margin-bottom:12px;border-left:4px solid var(--green);">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--green);margin-bottom:4px;">⬡ WHAT HOLDS UP — ${held.length} OF ${held.length + not.length} TESTS</div>
        ${heldHtml || '<div style="font-size:12px;color:var(--text2);">Nothing has held up yet.</div>'}
        <div style="font-size:10px;color:var(--text3);margin-top:8px;">Stated only when the difference is larger than the uncertainty around it. The overnight tests use futures data that grows daily, so those can firm up or fall away.</div>
      </div>
      <div class="panel" style="margin-bottom:12px;border-left:4px solid var(--red);">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--red);margin-bottom:6px;">⬡ TESTED AND NOT SUPPORTED</div>
        ${notHtml || '<div style="font-size:12px;color:var(--text2);">Nothing.</div>'}
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">Not supported means the data does not show it on the sessions measured, not that it can never happen.</div>
      </div>
      ${evidenceFold('clockEvidence', 'SHOW THE EVIDENCE — THE SESSION BY HALF HOUR, AROUND THE CLOCK, BY WEEKDAY', `
      ${notes.map(v => `<div style="font-size:11px;color:var(--text3);margin-bottom:8px;">${v.text}</div>`).join('')}
      <div class="panel" style="margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ THE REGULAR SESSION IN 30-MINUTE SLOTS (CT) — MEDIAN RANGE (BLUE) AND SHARE OF THE DAY'S VOLUME (YELLOW)</div>
        <div style="display:flex;gap:2px;">${bars}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">${S.sessions} sessions, ${fmtDate(S.first, 'short')} → ${fmtDate(S.last, 'short')}. Range is the slot's high minus low as a percent of its open; volume is the slot's share of the session's total.</div>
      </div>
      <div class="panel" style="margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ AROUND THE CLOCK ON ES FUTURES — MEDIAN 5-MINUTE RANGE BY HOUR (CT) · REGULAR SESSION IN BLUE</div>
        ${hours.length ? `<div style="display:flex;gap:1px;">${hourBars}</div>` : '<div style="font-size:11px;color:var(--text3);">No ES bars stored yet.</div>'}
        <div style="overflow-x:auto;margin-top:10px;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${['EVENT', 'TIME', 'n', 'MEDIAN 30-MIN RANGE: BEFORE → AT → AFTER', 'MEDIAN 30-MIN VOLUME: BEFORE → AT → AFTER', 'NEXT 30 MIN AGAINST THE PRIOR 3 HOURS'].map(th).join('')}</tr></thead><tbody>${evRows || '<tr><td colspan="6" style="padding:6px 8px;color:var(--text3);">Scored once 30 sessions of ES bars exist.</td></tr>'}</tbody></table></div>
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">${O.sessions ? `${O.sessions} ES sessions, ${fmtDate(O.first, 'short')} → ${fmtDate(O.last, 'short')}. Overnight (4:00 PM to 9:30 AM ET) median move ${f2(O.overnight_abs_median)}% against ${f2(O.rth_abs_median)}% in regular hours.` : ''} "Against the prior 3 hours" at 50% means the event has no reversal effect.</div>
      </div>
      <div class="panel">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ BY WEEKDAY — OPEN-TO-CLOSE AND OVERNIGHT</div>
        <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${['DAY', 'SESSION MEAN 2010–2026', 'SESSION UP 2010–2026', 'OVERNIGHT MEAN 2010–2026', 'SESSION MEAN LAST 3 YEARS', 'SESSION UP LAST 3 YEARS'].map(th).join('')}</tr></thead><tbody>${wk}</tbody></table></div>
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">Overnight is the prior close to the open; session is the open to the close. Since 2010 the compounded overnight return is ${d10.cum_overnight != null ? (d10.cum_overnight >= 0 ? '+' : '') + f1(d10.cum_overnight) + '%' : '—'} against ${d10.cum_session != null ? (d10.cum_session >= 0 ? '+' : '') + f1(d10.cum_session) + '%' : '—'} for the session; overnight carries ${f1(d10.overnight_share_of_variance)}% of the daily variance.</div>
      </div>`)}`;
  }
  window.renderClockSessions = render;
})();
