(function () {
  const S = { chain: [], era: '3y', hold: 1, pain: null, evaluated: 0, bootstrap: null, bootstrapKey: null };
  const CAT_LABELS = { vix_regime: 'VIX AT THE PRIOR CLOSE', drawdown: 'PRIOR CLOSE VS 20-SESSION HIGH', gap: 'GAP AT THE OPEN', prior_session: 'PRIOR SESSION', weekday: 'WEEKDAY', calendar: 'CALENDAR', weekly_range: 'STATIC WEEKLY RANGE', event: 'SCHEDULED RELEASES' };
  const FLOOR = 30, LIST_FLOOR = 10;

  function data() { return (typeof CHAINS_DATA !== 'undefined') ? CHAINS_DATA : null; }
  function rows() {
    const D = data(); if (!D) return [];
    if (!S._rows) { const K = D.keys; S._rows = D.rows.map(r => { const o = {}; K.forEach((k, i) => o[k] = r[i]); return o; }); }
    return S._rows;
  }
  function pain() { const D = data(); return S.pain != null ? S.pain : (D ? D.pain_pct_default : 0.32); }

  const TESTS = {
    gap_up_030: r => r.gap_pct != null && r.gap_pct > 0.30, gap_up_060: r => r.gap_pct != null && r.gap_pct > 0.60, gap_up_100: r => r.gap_pct != null && r.gap_pct > 1.0,
    gap_down_030: r => r.gap_pct != null && r.gap_pct < -0.30, gap_down_060: r => r.gap_pct != null && r.gap_pct < -0.60, gap_down_100: r => r.gap_pct != null && r.gap_pct < -1.0,
    gap_flat: r => r.gap_pct != null && Math.abs(r.gap_pct) <= 0.25,
    prior_red: r => r.prior_oc_pct != null && r.prior_oc_pct < 0, prior_green: r => r.prior_oc_pct != null && r.prior_oc_pct > 0,
    prior_big_red: r => r.prior_oc_pct != null && r.prior_oc_pct < -1.0, prior_big_green: r => r.prior_oc_pct != null && r.prior_oc_pct > 1.0,
    monday: r => r.weekday === 0, tuesday: r => r.weekday === 1, wednesday: r => r.weekday === 2, thursday: r => r.weekday === 3, friday: r => r.weekday === 4,
    monthly_opex: r => !!r.is_monthly_opex, month_first: r => !!r.is_month_first, month_last: r => !!r.is_month_last,
    open_above_wem_high: r => r.wem_high != null && r.open > r.wem_high, open_below_wem_low: r => r.wem_low != null && r.open < r.wem_low, open_inside_wem: r => r.wem_low != null && r.open >= r.wem_low && r.open <= r.wem_high,
    vix_under_15: r => r.vix != null && r.vix < 15, vix_15_20: r => r.vix != null && r.vix >= 15 && r.vix < 20, vix_20_30: r => r.vix != null && r.vix >= 20 && r.vix < 30, vix_over_30: r => r.vix != null && r.vix >= 30,
    dd_over_5: r => r.dd20 != null && r.dd20 < -5, dd_2_5: r => r.dd20 != null && r.dd20 >= -5 && r.dd20 < -2, dd_within_2: r => r.dd20 != null && r.dd20 >= -2,
    cpi_day: r => !!r.is_cpi, nfp_day: r => !!r.is_nfp, fomc_day: r => !!r.is_fomc, no_event: r => !(r.is_cpi || r.is_nfp || r.is_fomc),
  };

  function registry() { const D = data(); return D ? D.registry : []; }
  function cond(name) { return registry().find(c => c.name === name); }

  function chainStart() {
    const D = data(); const era = D.eras[S.era]; let start = era, bound = null;
    S.chain.forEach(n => { const c = cond(n); (c.requires || []).forEach(req => { const e = D.earliest_by_requirement[req]; if (e && e > start) { start = e; bound = c.label; } }); });
    return { start, bound, eraStart: era };
  }

  function pct(values, q) { if (!values.length) return null; const s = [...values].sort((a, b) => a - b); const pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos); return s[lo] + (s[hi] - s[lo]) * (pos - lo); }

  function summarize(set) {
    const h = S.hold - 1, P = pain();
    const usable = set.filter(r => r.holds[h]);
    const hits = usable.filter(r => r.holds[h][0] > 0).length;
    const adverse = usable.map(r => r.holds[h][1]);
    const touch = adverse.filter(a => a >= P).length;
    const ret = usable.map(r => r.holds[h][0]);
    return { n: usable.length, hits, rate: usable.length ? hits / usable.length * 100 : null, ci: wilson95(hits, usable.length),
      medRet: pct(ret, 0.5), avgRet: usable.length ? ret.reduce((a, b) => a + b, 0) / usable.length : null,
      adv50: pct(adverse, 0.5), adv75: pct(adverse, 0.75), adv90: pct(adverse, 0.9),
      touch, touchRate: usable.length ? touch / usable.length * 100 : null, touchCi: wilson95(touch, usable.length), rows: usable };
  }

  function ladder() {
    const { start, bound, eraStart } = chainStart();
    let pool = rows().filter(r => r.date >= start);
    const steps = [{ label: 'Pool', name: null, ...summarize(pool) }];
    S.chain.forEach(n => { pool = pool.filter(TESTS[n]); steps.push({ label: cond(n).label, name: n, ...summarize(pool) }); });
    const poolN = steps[0].n; steps.forEach(s => s.share = poolN ? s.n / poolN * 100 : null);
    return { steps, start, bound, eraStart };
  }

  // two-sided binomial probability of the observed hits against the era's base rate; BH across the chains evaluated this session
  function binomTwoSided(k, n, p) {
    if (!n) return 1;
    const logC = (n, k) => { let s = 0; for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i); return s; };
    const pmf = i => Math.exp(logC(n, i) + i * Math.log(p) + (n - i) * Math.log(1 - p));
    const obs = pmf(k); let total = 0;
    for (let i = 0; i <= n; i++) { const v = pmf(i); if (v <= obs * (1 + 1e-9)) total += v; }
    return Math.min(1, total);
  }
  const FAMILY = [];
  function recordChain(key, pval) { const f = FAMILY.find(x => x.key === key); if (f) f.p = pval; else FAMILY.push({ key, p: pval }); }
  function bhAdjusted(key) {
    const sorted = [...FAMILY].sort((a, b) => a.p - b.p); const m = sorted.length; let adj = new Array(m); let prev = 1;
    for (let i = m - 1; i >= 0; i--) { const v = Math.min(prev, sorted[i].p * m / (i + 1)); adj[i] = v; prev = v; }
    const idx = sorted.findIndex(x => x.key === key); return { adjusted: idx >= 0 ? adj[idx] : null, family: m };
  }

  function bootstrap(final, base, hold) {
    // stationary block bootstrap of the pooled sessions' outcomes with the condition mask held fixed
    const pool = base.rows, mask = new Set(final.rows.map(r => r.date)); const idx = pool.map((r, i) => mask.has(r.date) ? i : -1).filter(i => i >= 0);
    const out = pool.map(r => r.holds[hold - 1] ? (r.holds[hold - 1][0] > 0 ? 1 : 0) : null);
    const N = pool.length, reps = 2000, q = 1 / 5; const rates = [];
    let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let r = 0; r < reps; r++) {
      const series = new Array(N); let pos = Math.floor(rnd() * N);
      for (let i = 0; i < N; i++) { if (i > 0 && rnd() < q) pos = Math.floor(rnd() * N); series[i] = out[pos]; pos = (pos + 1) % N; }
      let k = 0, n = 0; idx.forEach(i => { if (series[i] != null) { n++; k += series[i]; } });
      rates.push(n ? k / n * 100 : null);
    }
    const valid = rates.filter(v => v != null).sort((a, b) => a - b);
    const percentile = valid.length ? valid.filter(v => v < final.rate).length / valid.length * 100 : null;
    return { reps: valid.length, percentile, p50: pct(valid, 0.5), p95: pct(valid, 0.95) };
  }

  const money = v => { const D = data(); return (v == null || !D) ? '—' : '$' + (v / 100 * D.current_price).toFixed(2); };
  const f1 = v => v == null ? '—' : v.toFixed(1); const f2 = v => v == null ? '—' : v.toFixed(2); const f3 = v => v == null ? '—' : v.toFixed(3);
  const rateCell = (rate, ci, n, k) => n >= FLOOR ? `<span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${rate >= 50 ? 'var(--green)' : 'var(--red)'};">${f1(rate)}%</span> <span style="font-size:9px;color:var(--text3);">${ci ? `${ci.lo.toFixed(1)}–${ci.hi.toFixed(1)}` : ''} · ${k}/${n}</span>` : `<span style="color:var(--text3);">n=${n} — too few</span>`;

  function dateList(step) {
    const h = S.hold - 1; const D = data();
    return `<div style="font-size:10px;color:var(--text3);margin-top:4px;line-height:1.7;">${step.rows.map(r => { const [oc, adv] = r.holds[h]; const pts = oc / 100 * r.open; return `${fmtDate(r.date, 'short')}: ${pts >= 0 ? '+' : ''}${pts.toFixed(2)} (${oc >= 0 ? '+' : ''}${oc.toFixed(2)}%), worst −${adv.toFixed(2)}%`; }).join(' · ')}</div>`;
  }

  function worstMinuteHistogram(step) {
    const D = data(); const withMin = step.rows.filter(r => r.worst_min != null && r.worst_min >= 0 && r.worst_min <= 390);
    if (!withMin.length) return `<div style="font-size:10px;color:var(--text3);">No intraday coverage in this cell.</div>`;
    const bins = new Array(13).fill(0); withMin.forEach(r => bins[Math.min(12, Math.floor(r.worst_min / 30))]++);
    const max = Math.max(...bins, 1); const labels = ['9:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '1:00', '1:30', '2:00', '2:30', '3:00', '3:30'];
    return `<div style="display:flex;align-items:flex-end;gap:2px;height:60px;">${bins.map((b, i) => `<div title="${labels[i]} ET · ${b}" style="flex:1;background:${i < 2 ? 'var(--green)' : i > 10 ? 'var(--red)' : 'var(--cyan)'};height:${Math.round(b / max * 100)}%;opacity:0.8;"></div>`).join('')}</div>
      <div style="display:flex;justify-content:space-between;font-size:8px;color:var(--text3);"><span>9:30</span><span>12:30</span><span>3:30 ET</span></div>
      <div style="font-size:9px;color:var(--text3);margin-top:2px;">Minute of the session low, ${withMin.length} of ${step.n} sessions with 1-minute bars (${D.intraday_coverage.first} → ${D.intraday_coverage.last}). Hold-1 only.</div>`;
  }

  function render() {
    const el = document.getElementById('setupEngineContent'); if (!el) return;
    const D = data();
    if (!D) { el.innerHTML = '<div class="no-data">chains_data.js is not loaded yet — it is written by the daily pipeline.</div>'; return; }
    const L = ladder(); const base = D.base_rates[S.era] || { rate: null }; const final = L.steps[L.steps.length - 1];
    S.evaluated++;
    const chainKey = S.era + '|' + S.hold + '|' + S.chain.join('>');
    let pRaw = null, bh = null;
    if (S.chain.length && final.n >= FLOOR && base.rate != null) { pRaw = binomTwoSided(final.hits, final.n, base.rate / 100); recordChain(chainKey, pRaw); bh = bhAdjusted(chainKey); }
    const cats = {}; registry().forEach(c => (cats[c.category] = cats[c.category] || []).push(c));
    const usedCats = new Set(S.chain.map(n => cond(n).category));
    const chips = Object.keys(cats).map(cat => `<div style="margin-bottom:6px;"><div style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);margin-bottom:3px;">${CAT_LABELS[cat] || cat}</div>${cats[cat].map(c => { const on = S.chain.includes(c.name); const blocked = !on && usedCats.has(cat); return `<button ${blocked ? 'disabled' : ''} onclick="window._seToggle('${c.name}')" title="${blocked ? 'One condition per category' : ''}" style="font-family:'Share Tech Mono',monospace;font-size:10px;margin:2px;padding:3px 8px;border-radius:3px;cursor:${blocked ? 'not-allowed' : 'pointer'};background:${on ? 'rgba(0,204,255,0.18)' : 'var(--bg3)'};border:1px solid ${on ? 'var(--cyan)' : 'var(--border)'};color:${on ? 'var(--cyan)' : blocked ? 'var(--dim)' : 'var(--text2)'};">${c.label}</button>`; }).join('')}</div>`).join('');
    const eraBtn = (k, l) => `<button onclick="window._seEra('${k}')" style="font-family:'Orbitron',monospace;font-size:9px;padding:3px 10px;margin-right:4px;background:${S.era === k ? 'rgba(0,204,255,0.15)' : 'var(--bg3)'};border:1px solid ${S.era === k ? 'var(--cyan)' : 'var(--border)'};color:${S.era === k ? 'var(--cyan)' : 'var(--text3)'};cursor:pointer;">${l}</button>`;
    const holdBtn = k => `<button onclick="window._seHold(${k})" style="font-family:'Orbitron',monospace;font-size:9px;padding:3px 8px;margin-right:3px;background:${S.hold === k ? 'rgba(0,204,255,0.15)' : 'var(--bg3)'};border:1px solid ${S.hold === k ? 'var(--cyan)' : 'var(--border)'};color:${S.hold === k ? 'var(--cyan)' : 'var(--text3)'};cursor:pointer;">${k}</button>`;
    const P = pain(); const isAll = S.era === 'all';
    const dollars = v => isAll ? '' : ` <span style="color:var(--text3);">(${money(v)})</span>`;
    const head = ['STEP', 'CONDITION ADDED', 'n', 'SHARE OF POOL', `HIT RATE · OPEN→CLOSE OF HOLD ${S.hold}`, 'MEDIAN RETURN', 'ADVERSE EXCURSION 50 / 75 / 90th PCT', `TOUCHED −${P.toFixed(2)}% OF OPEN`].map(h => `<th style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);text-align:left;padding:6px 8px;border-bottom:1px solid var(--border);">${h}</th>`).join('');
    const body = L.steps.map((s, i) => {
      const suppressed = s.n < FLOOR;
      return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);vertical-align:top;">
        <td style="padding:6px 8px;color:var(--text3);font-family:'Share Tech Mono',monospace;">${i}</td>
        <td style="padding:6px 8px;color:var(--text);">${s.label}</td>
        <td style="padding:6px 8px;font-family:'Share Tech Mono',monospace;color:${suppressed ? 'var(--red)' : 'var(--text)'};">${s.n.toLocaleString()}</td>
        <td style="padding:6px 8px;font-family:'Share Tech Mono',monospace;color:var(--text3);">${f1(s.share)}%</td>
        <td style="padding:6px 8px;">${rateCell(s.rate, s.ci, s.n, s.hits)}</td>
        <td style="padding:6px 8px;font-family:'Share Tech Mono',monospace;color:${suppressed ? 'var(--text3)' : s.medRet >= 0 ? 'var(--green)' : 'var(--red)'};">${suppressed ? '—' : f2(s.medRet) + '%' + dollars(s.medRet)}</td>
        <td style="padding:6px 8px;font-family:'Share Tech Mono',monospace;color:var(--text2);">${suppressed ? '—' : `${f3(s.adv50)}% / ${f3(s.adv75)}% / ${f3(s.adv90)}%${dollars(s.adv50)}`}</td>
        <td style="padding:6px 8px;">${suppressed ? '<span style="color:var(--text3);">—</span>' : rateCell(s.touchRate, s.touchCi, s.n, s.touch).replace("color:var(--green)", "color:var(--red)").replace("color:var(--red)", "color:var(--red)")}</td>
      </tr>${s.n < FLOOR && s.n >= 1 ? `<tr><td colspan="8" style="padding:2px 8px 8px;">${dateList(s)}</td></tr>` : ''}`;
    }).join('');
    let honesty = '';
    if (S.chain.length) {
      if (final.n >= FLOOR && pRaw != null) {
        const survives = bh.adjusted != null && bh.adjusted <= 0.10;
        honesty += `<div style="margin-top:8px;font-size:11px;color:var(--text2);">Against the ${S.era === 'all' ? 'all-history' : S.era.replace('y', '-year')} base rate of ${f1(base.rate)}% (${f1(base.lo)}–${f1(base.hi)}, n=${base.n}): two-sided binomial p = ${pRaw.toFixed(3)}; Benjamini–Hochberg across the ${bh.family} chain${bh.family === 1 ? '' : 's'} evaluated this session, adjusted p = ${bh.adjusted.toFixed(3)} — <strong style="color:${survives ? 'var(--green)' : 'var(--red)'};">${survives ? 'survives' : 'does not survive'}</strong> a false-discovery rate of 0.10.</div>`;
        if (S.bootstrapKey === chainKey && S.bootstrap) {
          const b = S.bootstrap;
          honesty += `<div style="margin-top:4px;font-size:11px;color:var(--text2);">Stationary block bootstrap, ${b.reps.toLocaleString()} replications, mean block 5 sessions, condition mask fixed: the observed ${f1(final.rate)}% sits at the ${f1(b.percentile)}th percentile of the null (median ${f1(b.p50)}%, 95th ${f1(b.p95)}%).</div>`;
        } else {
          honesty += `<div style="margin-top:4px;"><button onclick="window._seBootstrap()" style="font-family:'Orbitron',monospace;font-size:9px;padding:4px 10px;background:var(--bg3);border:1px solid var(--border);color:var(--cyan);cursor:pointer;">RUN BLOCK BOOTSTRAP (2,000 REPLICATIONS)</button></div>`;
        }
      } else if (final.n < FLOOR) {
        honesty += `<div style="margin-top:8px;font-size:11px;color:var(--red);">Final cell has n=${final.n}; no rate, no test. The dates are listed above.</div>`;
      }
    }
    const boundNote = L.bound ? `<span style="color:var(--yellow);">Pool starts ${fmtDate(L.start)} because "${L.bound}" cannot be evaluated earlier — not at the era's ${fmtDate(L.eraStart)}.</span>` : `Pool starts ${fmtDate(L.start)}.`;
    el.innerHTML = `
      <div style="font-size:12px;color:var(--text2);line-height:1.7;margin-bottom:10px;">
        Chain conditions from the registry. Every row is the sample that survives all rows above it. Endpoint (open-to-close of the hold) and path (adverse excursion from the open, worst low of the whole hold) are shown side by side. Rates render only at n ≥ ${FLOOR}; below that the dates are listed instead. Dollar figures use the current price ($${D.current_price.toFixed(2)}) and are hidden on all-history, where the price level makes them meaningless.
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;margin-bottom:10px;">
        <div><div style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);margin-bottom:3px;">ERA</div>${eraBtn('3y', 'LAST 3 YEARS')}${eraBtn('5y', 'LAST 5 YEARS')}${eraBtn('all', 'ALL HISTORY')}</div>
        <div><div style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);margin-bottom:3px;">HOLD (SESSIONS, OPEN OF DAY 1 TO CLOSE OF DAY N)</div>${[1, 2, 3, 4, 5].map(holdBtn).join('')}</div>
        <div><div style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);margin-bottom:3px;">PAIN THRESHOLD (% OF OPEN)</div>${[0.25, 0.32, 0.50, 0.75, 1.00].map(v => `<button onclick="window._sePain(${v})" style="font-family:'Orbitron',monospace;font-size:9px;padding:3px 8px;margin-right:3px;background:${P === v ? 'rgba(255,51,85,0.15)' : 'var(--bg3)'};border:1px solid ${P === v ? 'var(--red)' : 'var(--border)'};color:${P === v ? 'var(--red)' : 'var(--text3)'};cursor:pointer;">${v.toFixed(2)}% ${isAll ? '' : '· ' + money(v)}</button>`).join('')}</div>
        <div style="margin-left:auto;font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text3);">chains evaluated this session: <span style="color:var(--yellow);">${S.evaluated}</span></div>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;">
        <div>${chips}</div>
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:8px 10px;font-size:11px;color:var(--text2);line-height:1.7;">
          <div style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);margin-bottom:3px;">CHAIN</div>
          ${S.chain.length ? S.chain.map((n, i) => `${i + 1}. ${cond(n).label}`).join('<br>') : '<span style="color:var(--text3);">No conditions selected — the pool is the era.</span>'}
          <div style="margin-top:6px;font-size:10px;">${boundNote}</div>
          ${S.chain.length ? `<button onclick="window._seClear()" style="margin-top:6px;font-family:'Orbitron',monospace;font-size:8px;padding:3px 8px;background:var(--bg2);border:1px solid var(--border);color:var(--text3);cursor:pointer;">CLEAR</button>` : ''}
        </div>
      </div>
      <div style="overflow-x:auto;margin-top:10px;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
      ${honesty}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:8px 10px;">
          <div style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);margin-bottom:4px;">TIME OF THE WORST POINT — FINAL CELL</div>
          ${S.hold === 1 ? worstMinuteHistogram(final) : '<div style="font-size:10px;color:var(--text3);">Shown for hold 1 only; multi-day holds use the daily lows.</div>'}
        </div>
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:8px 10px;font-size:10px;color:var(--text3);line-height:1.7;">
          <div style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);margin-bottom:4px;">BASIS</div>
          Sessions ${fmtDate(D.rows[0][0])} → ${fmtDate(D.rows[D.rows.length - 1][0])}, from daily_ohlcv; eras roll forward from the latest session. Hit = close of day N above the open of day 1. Adverse excursion = open of day 1 minus the lowest low through day N, as a percent of that open. Pain threshold stored as a percent; the dollar equivalent is at the current price. Static weekly range and release conditions start where their tables start. Regenerated by the pipeline; frame stamped ${D.generated ? fmtDate(D.generated.slice(0, 10)) : '—'}.
        </div>
      </div>`;
  }

  window._seToggle = n => { const i = S.chain.indexOf(n); if (i >= 0) S.chain.splice(i, 1); else S.chain.push(n); S.bootstrap = null; render(); };
  window._seClear = () => { S.chain = []; S.bootstrap = null; render(); };
  window._seEra = k => { S.era = k; S.bootstrap = null; render(); };
  window._seHold = k => { S.hold = k; S.bootstrap = null; render(); };
  window._sePain = v => { S.pain = v; render(); };
  window._seBootstrap = () => { const L = ladder(); const final = L.steps[L.steps.length - 1]; S.bootstrap = bootstrap(final, L.steps[0], S.hold); S.bootstrapKey = S.era + '|' + S.hold + '|' + S.chain.join('>'); S.evaluated--; render(); };
  window.renderSetupEngine = render;
})();
