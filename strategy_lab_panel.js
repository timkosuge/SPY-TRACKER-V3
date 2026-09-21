(function () {
  const S = { open: null };
  const data = () => (typeof STRATEGIES_DATA !== 'undefined') ? STRATEGIES_DATA : null;
  const f1 = v => v == null ? '—' : Number(v).toFixed(1), f2 = v => v == null ? '—' : Number(v).toFixed(2), f3 = v => v == null ? '—' : Number(v).toFixed(3);
  const sgn = v => v == null ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(3) + '%';
  const LEVEL = { finding: ['FINDING', 'var(--green)'], caution: ['CAUTION', 'var(--red)'], none: ['NO SEPARATION', 'var(--text3)'], info: ['NOTE', 'var(--cyan)'] };
  const rc = (r, floor) => (!r || r.n < floor) ? `<span style="color:var(--text3);">${r ? 'n=' + r.n : '—'}</span>` : `<span style="font-family:'Share Tech Mono',monospace;color:var(--text);">${f1(r.rate)}%</span> <span style="font-size:9px;color:var(--text3);">${f1(r.lo)}–${f1(r.hi)}</span>`;
  const sep = (a, b) => a && b && a.n && b.n && (a.lo > b.hi || b.lo > a.hi);
  const COND = { prior_wide: 'Wide day', prior_middle: 'Middle day', prior_narrow: 'Narrow day', or_wide: 'Wide opening range', or_middle: 'Middle opening range', or_narrow: 'Narrow opening range', vix_under_15: 'VIX under 15', vix_15_20: 'VIX 15 to 20', vix_20_30: 'VIX 20 to 30', vix_over_30: 'VIX over 30', vix_over_20: 'VIX over 20', dd_over_5: 'More than 5% below the 20-session high', dd_2_5: '2 to 5% below the 20-session high', dd_within_2: 'Within 2% of the 20-session high' };
  const condLabel = n => COND[n] || n;
  const exitOrder = (D, s) => s.mode === 'A' ? D.exits_a.map(e => e.id).filter(k => s.exits[k]) : Object.keys(s.exits).sort((a, b) => Number(a) - Number(b));
  const money = pct => { const D = data(); return (pct == null || !D) ? '' : ` ($${(pct / 100 * D.current_price).toFixed(2)})`; };

  function render() {
    const el = document.getElementById('strategyLabContent'); if (!el) return;
    const D = data();
    if (!D) { el.innerHTML = '<div class="no-data">strategies_data.js is not loaded yet — it is written by the daily pipeline.</div>'; return; }
    const floor = D.floor; const byId = Object.fromEntries(D.strategies.map(s => [s.id, s]));
    const th = s => s.mode === 'A' ? '0.75' : '1.5';
    const findings = D.findings || [];
    const order = ['finding', 'caution', 'none', 'info'];
    const findingsHtml = order.map(lv => { const rows = findings.filter(f => f.level === lv); if (!rows.length) return ''; const [lab, col] = LEVEL[lv]; return `<div style="margin-bottom:8px;"><div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:${col};margin-bottom:4px;">${lab} · ${rows.length}</div>${rows.map(f => `<div style="font-size:11px;color:var(--text2);line-height:1.6;padding:3px 0 3px 8px;border-left:2px solid ${col};margin-bottom:3px;"><span style="font-family:'Share Tech Mono',monospace;color:var(--text);">${f.strategy}</span> · ${f.text}</div>`).join('')}</div>`; }).join('');
    const T = D.today;
    const armed = [...T.armed_b.filter(id => id !== 'B0').map(id => `${id} ${byId[id].name} (hold ${byId[id].hold})`), ...T.armed_a_pending_or.filter(id => id !== 'A0').map(id => `${id} ${byId[id].name} — waits for the 9:00 CT opening range`)];
    const scoreRows = D.strategies.map(s => { const ctrl = byId[s.mode === 'A' ? 'A0' : 'B0']; const e = s.either_side[th(s)], c = ctrl.either_side[th(s)]; const isCtrl = s.id === 'A0' || s.id === 'B0';
      const bestLong = s.target_stop ? Object.entries(s.target_stop).filter(([k, v]) => k.startsWith('up_') && v.n >= floor).sort((a, b) => b[1].expectancy_pct - a[1].expectancy_pct)[0] : null;
      const bestShort = s.target_stop ? Object.entries(s.target_stop).filter(([k, v]) => k.startsWith('down_') && v.n >= floor).sort((a, b) => b[1].expectancy_pct - a[1].expectancy_pct)[0] : null;
      const exitKeys = exitOrder(D, s); const lastExit = s.exits[exitKeys[exitKeys.length - 1]];
      return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;${isCtrl ? 'color:var(--text3);' : ''}" onclick="window._slOpen('${s.id}')">
        <td style="padding:6px 8px;font-family:'Share Tech Mono',monospace;color:var(--cyan);">${s.id}</td>
        <td style="padding:6px 8px;color:${isCtrl ? 'var(--text3)' : 'var(--text)'};">${s.name}${s.hold ? ` <span style="font-size:9px;color:var(--text3);">hold ${s.hold}</span>` : ''}</td>
        <td style="padding:6px 8px;font-family:'Share Tech Mono',monospace;color:var(--text3);">${s.n.toLocaleString()}</td>
        <td style="padding:6px 8px;">${rc(e, floor)}${!isCtrl && sep(e, c) ? ` <span style="color:${e.rate > c.rate ? 'var(--green)' : 'var(--red)'};font-size:9px;">${e.rate > c.rate ? '▲' : '▼'} vs ${f1(c.rate)}%</span>` : (!isCtrl ? ` <span style="color:var(--text3);font-size:9px;">= ${f1(c.rate)}%</span>` : '')}</td>
        <td style="padding:6px 8px;">${lastExit ? rc(lastExit.long, floor) : '—'}</td>
        <td style="padding:6px 8px;">${lastExit ? rc(lastExit.short, floor) : '—'}</td>
        <td style="padding:6px 8px;font-family:'Share Tech Mono',monospace;color:${bestLong ? (bestLong[1].expectancy_pct > 0 ? 'var(--green)' : 'var(--red)') : 'var(--text3)'};">${bestLong ? `${sgn(bestLong[1].expectancy_pct)} <span style="font-size:9px;color:var(--text3);">+${bestLong[0].split('_')[1]} / −${bestLong[0].split('_')[2]}</span>` : '—'}</td>
        <td style="padding:6px 8px;font-family:'Share Tech Mono',monospace;color:${bestShort ? (bestShort[1].expectancy_pct > 0 ? 'var(--green)' : 'var(--red)') : 'var(--text3)'};">${bestShort ? `${sgn(bestShort[1].expectancy_pct)} <span style="font-size:9px;color:var(--text3);">+${bestShort[0].split('_')[1]} / −${bestShort[0].split('_')[2]}</span>` : '—'}</td>
        <td style="padding:6px 8px;font-size:10px;color:var(--text3);white-space:nowrap;">${s.first ? `${fmtDate(s.first, 'short')} → ${fmtDate(s.last, 'short')}` : '—'}</td>
      </tr>`; }).join('');
    let detail = '';
    if (S.open && byId[S.open]) {
      const s = byId[S.open]; const ctrl = byId[s.mode === 'A' ? 'A0' : 'B0'];
      const keys = exitOrder(D, s); const exitHead = keys.map(k => s.mode === 'A' ? (D.exits_a.find(e => e.id === k) || {}).label || k : `Day ${k}`);
      const exitGrid = `<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${['EXIT', ...exitHead].map(h => `<th style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);text-align:left;padding:5px 8px;border-bottom:1px solid var(--border);">${h}</th>`).join('')}</tr></thead><tbody>
        ${[['Long closes above entry', 'long'], ['Short closes below entry', 'short']].map(([lab, side]) => `<tr><td style="padding:5px 8px;color:var(--text2);">${lab}</td>${keys.map(k => `<td style="padding:5px 8px;">${rc(s.exits[k][side], floor)}<div style="font-size:9px;color:var(--text3);">control ${f1((ctrl.exits[k] || {})[side] && ctrl.exits[k][side].rate)}%</div></td>`).join('')}</tr>`).join('')}
        <tr><td style="padding:5px 8px;color:var(--text2);">Median move, either side</td>${keys.map(k => `<td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:var(--text);">${s.exits[k].n >= floor ? f3(s.exits[k].median_abs) + '%' : '—'}<div style="font-size:9px;color:var(--text3);">control ${f3((ctrl.exits[k] || {}).median_abs)}%</div></td>`).join('')}</tr>
      </tbody></table>`;
      let tsGrid = '';
      if (s.target_stop) {
        tsGrid = `<table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:10px;"><thead><tr>${['RULE', 'n', 'TARGETS', 'STOPS', 'TO THE CLOSE', 'WIN RATE', 'BREAKEVEN', 'EXPECTANCY PER TRADE', 'CONTROL'].map(h => `<th style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);text-align:left;padding:5px 8px;border-bottom:1px solid var(--border);">${h}</th>`).join('')}</tr></thead><tbody>
          ${Object.entries(s.target_stop).map(([k, v]) => { const [side, t, sp] = k.split('_'); const c = ctrl.target_stop[k]; return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:4px 8px;color:var(--text2);">${side === 'up' ? 'Long' : 'Short'} · target +${t}% · stop −${sp}%</td><td style="padding:4px 8px;font-family:'Share Tech Mono',monospace;color:var(--text3);">${v.n}</td><td style="padding:4px 8px;font-family:'Share Tech Mono',monospace;">${v.target}</td><td style="padding:4px 8px;font-family:'Share Tech Mono',monospace;">${v.stop}</td><td style="padding:4px 8px;font-family:'Share Tech Mono',monospace;">${v.close}</td><td style="padding:4px 8px;">${rc(v.win, floor)}</td><td style="padding:4px 8px;font-family:'Share Tech Mono',monospace;color:var(--text3);">${f1(v.breakeven_win_rate)}%</td><td style="padding:4px 8px;font-family:'Share Tech Mono',monospace;color:${v.expectancy_pct > 0 ? 'var(--green)' : 'var(--red)'};">${v.n >= floor ? sgn(v.expectancy_pct) + money(v.expectancy_pct) : '—'}</td><td style="padding:4px 8px;font-family:'Share Tech Mono',monospace;color:var(--text3);">${c ? sgn(c.expectancy_pct) : '—'}</td></tr>`; }).join('')}
        </tbody></table>
        <div style="font-size:10px;color:var(--text3);margin-top:4px;">Payouts: the target if it came first, minus the stop if the stop came first, the signed close otherwise. Breakeven is the win rate at which target and stop net to zero. Control is every session under the same rule.</div>`;
      }
      const recent = s.recent.map(tr => { const ex = Object.entries(tr.exits); const last = ex[ex.length - 1][1]; const bc = tr.best_contract && (tr.best_contract['1330'] || tr.best_contract['close']); return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
        <td style="padding:4px 8px;white-space:nowrap;">${fmtDate(tr.date, 'short')}</td><td style="padding:4px 8px;font-family:'Share Tech Mono',monospace;">$${tr.entry.toFixed(2)}</td>
        <td style="padding:4px 8px;font-size:10px;color:var(--text3);">${tr.prior_class || '—'} · VIX ${tr.vix_bucket || '—'} · ${tr.dd_bucket || '—'}${tr.or_pct != null ? ` · OR ${f2(tr.or_pct)}%` : ''}</td>
        <td style="padding:4px 8px;font-family:'Share Tech Mono',monospace;color:var(--green);">+${f2(tr.mfe_up)}%</td><td style="padding:4px 8px;font-family:'Share Tech Mono',monospace;color:var(--red);">−${f2(tr.mfe_down)}%</td>
        <td style="padding:4px 8px;font-family:'Share Tech Mono',monospace;color:${last >= 0 ? 'var(--green)' : 'var(--red)'};">${sgn(last)}</td>
        <td style="padding:4px 8px;font-size:10px;">${bc ? `${bc.cp === 'C' ? 'Call' : 'Put'} ${bc.strike} ${fmtDate(bc.expiry, 'short')} · ${bc.entry_ask.toFixed(2)} → ${bc.exit_bid.toFixed(2)} (${bc.return_pct >= 0 ? '+' : ''}${f1(bc.return_pct)}%) of ${bc.contracts_compared}` : '<span style="color:var(--text3);">no chain at entry and exit</span>'}</td></tr>`; }).join('');
      detail = `<div class="panel" style="margin-bottom:12px;border-left:4px solid var(--cyan);">
        <div style="display:flex;align-items:baseline;gap:10px;"><div style="font-family:'Orbitron',monospace;font-size:10px;letter-spacing:2px;color:var(--cyan);">${s.id} — ${s.name.toUpperCase()}</div><div style="font-size:10px;color:var(--text3);">${s.note || ''}</div><button onclick="window._slOpen(null)" style="margin-left:auto;font-family:'Orbitron',monospace;font-size:8px;padding:2px 8px;background:var(--bg3);border:1px solid var(--border);color:var(--text3);cursor:pointer;">CLOSE</button></div>
        <div style="font-size:11px;color:var(--text2);margin:6px 0 8px;">Entry: ${s.entry.length ? s.entry.map(condLabel).join(' + ') : 'every session'}${s.mode === 'A' ? ' · at 9:00 CT when the opening range closes' : ` · at the next open, held ${s.hold} session${s.hold > 1 ? 's' : ''}`}. ${s.n.toLocaleString()} trades, ${s.first ? fmtDate(s.first, 'short') + ' → ' + fmtDate(s.last, 'short') : ''}.</div>
        <div style="overflow-x:auto;">${exitGrid}</div>${tsGrid}
        <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin:12px 0 4px;">LAST ${s.recent.length} TRADES · BEST CONTRACT MEASURED FROM THE 9:00 CT ASK TO THE EXIT'S BID, ${D.min_dte}+ DAYS TO EXPIRY${D.chains.available ? ` · CHAINS SINCE ${fmtDate(D.chains.since, 'short').toUpperCase()}` : ' · NO CHAINS CAPTURED YET'}</div>
        <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${['SESSION', 'ENTRY', 'CONTEXT', 'BEST UP', 'BEST DOWN', 'FINAL EXIT', 'BEST CONTRACT TO 1:30 CT (OR CLOSE)'].map(h => `<th style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);text-align:left;padding:5px 8px;border-bottom:1px solid var(--border);">${h}</th>`).join('')}</tr></thead><tbody>${recent}</tbody></table></div>
      </div>`;
    }
    el.innerHTML = `
      ${decisionCard(false)}
      <div class="panel" style="margin-bottom:12px;border-left:4px solid var(--purple);">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--purple);margin-bottom:8px;">⬡ FINDINGS — RECOMPUTED EVERY RUN, DATA THROUGH ${fmtDate(D.as_of).toUpperCase()}</div>
        ${findingsHtml || '<div style="color:var(--text3);font-size:11px;">No strategy has enough trades to score yet.</div>'}
        <div style="font-size:10px;color:var(--text3);margin-top:4px;">A finding is stated only when the 95% Wilson intervals do not overlap. "No separation" means the strategy did not beat taking the same trade every session on that measure. A caution means the strategy's own record disagrees with itself. Every figure is on SPY's move from the entry price; option returns are measured separately per trade where the chain was captured.</div>
      </div>
      <div class="panel" style="margin-bottom:12px;border-left:4px solid ${armed.length ? 'var(--green)' : 'var(--text3)'};">
        <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:4px;">ARMED FOR THE NEXT SESSION — FROM THE CLOSE OF ${fmtDate(T.date).toUpperCase()}: ${T.prior_class ? T.prior_class.toUpperCase() : '—'} DAY · VIX ${T.vix != null ? T.vix.toFixed(2) : '—'} (${T.vix_bucket || '—'}) · ${T.dd_bucket ? T.dd_bucket.toUpperCase() : '—'} OF THE 20-SESSION HIGH</div>
        ${armed.length ? armed.map(a => `<div style="font-size:12px;color:var(--text);line-height:1.7;">${a}</div>`).join('') : '<div style="font-size:12px;color:var(--text3);">Nothing armed. Only the controls would trade.</div>'}
      </div>
      <div class="panel" style="margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ SCORECARD — CLICK A ROW FOR ITS EXIT GRID, TARGET AND STOP RULES, AND TRADES</div>
        <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${['ID', 'STRATEGY', 'TRADES', 'REACHED THE SIZE TARGET (0.75% DAY / 1.5% HOLD), EITHER SIDE', 'LONG WON AT FINAL EXIT', 'SHORT WON AT FINAL EXIT', 'BEST LONG RULE', 'BEST SHORT RULE', 'RECORD'].map(h => `<th style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);text-align:left;padding:6px 8px;border-bottom:1px solid var(--border);">${h}</th>`).join('')}</tr></thead><tbody>${scoreRows}</tbody></table></div>
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">A0 and B0 are the controls: the same trade on every session. ▲ / ▼ marks a strategy whose size-target rate is separated from its control. Best rule is the target/stop pair with the highest expectancy at n ≥ ${floor}. Strategies live in strategies.json; a change there is scored on the next run.</div>
      </div>
      ${detail}`;
  }
  function decisionCard(compact) {
    const D = data(); if (!D || !D.decision) return '';
    const d = D.decision; const holdOk = /CANDIDATE/.test(d.hold); const dayOk = /ONLY IF/.test(d.day);
    const col = holdOk || dayOk ? 'var(--green)' : 'var(--red)';
    return `<div class="panel" style="border-left:4px solid ${col};margin-bottom:12px;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:4px;">DECISION FOR THE NEXT SESSION · FROM THE CLOSE OF ${fmtDate(D.as_of).toUpperCase()}</div>
      <div style="font-family:'Orbitron',monospace;font-size:${compact ? 13 : 16}px;letter-spacing:2px;color:${col};margin-bottom:6px;">${d.verdict}</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:6px;">${d.context}</div>
      ${d.lines.map(l => `<div style="font-size:12px;color:var(--text2);line-height:1.7;padding:3px 0 3px 8px;border-left:2px solid var(--border);margin-bottom:3px;">${l}</div>`).join('')}
      <div style="font-size:10px;color:var(--text3);margin-top:4px;">Every rate is on SPY's move from the entry price against the same trade taken every session; an edge is stated only when the intervals do not overlap. Recomputed nightly from the strategy record.</div>
    </div>`;
  }
  window.renderDecisionCard = decisionCard;
  window._slOpen = id => { S.open = id; render(); const el = document.getElementById('strategyLabContent'); if (id && el) { const d = el.querySelector('.panel[style*="var(--cyan)"]'); if (d) d.scrollIntoView({ block: 'nearest' }); } };
  window.renderStrategyLab = render;
})();
