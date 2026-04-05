function renderGEXAdditions(md) {
  const gex = md.gex || {};
  const q = md.quotes || {};
  const spy = q['SPY'] || {};
  const spot = spy.price || gex.spot || 0;
  const opt = md.options_summary || {};
  const maxPainArr = md.max_pain || [];
  const vix = q['^VIX'] || {}, vix3m = q['^VIX3M'] || {}, vix6m = q['^VIX6M'] || {};
  const vvix = q['^VVIX'] || {}, skew = q['^SKEW'] || {};
  const fmtB = n => { const a=Math.abs(n||0),s=(n||0)>=0?'+':'-';if(a>=1e9)return s+'$'+(a/1e9).toFixed(2)+'B';if(a>=1e6)return s+'$'+(a/1e6).toFixed(0)+'M';return s+'$'+Math.round(a).toLocaleString(); };

  // ── HOW TO READ GEX GUIDE ─────────────────────────────────────────────────
  const guideEl = $('gexGuide');
  if(guideEl) {
    const isPos = (gex.net_gex||0) > 0;
    const regime = gex.regime || '—';
    const rc = isPos ? '#00ff88' : '#ff3355';
    guideEl.innerHTML = `
      <div style="margin-bottom:10px;padding:10px;background:${rc}11;border-left:3px solid ${rc};border-radius:3px;">
        <div style="font-family:'Orbitron',monospace;font-size:10px;color:${rc};margin-bottom:4px;">CURRENT: ${regime}</div>
        <div style="font-size:12px;color:var(--text2);line-height:1.6;">${isPos?'Dealers are <strong style="color:#00ff88">long gamma</strong> — they sell into rallies and buy into dips. This <strong style="color:#00ff88">suppresses volatility</strong> and creates mean-reversion behavior. Expect smaller moves, tighter ranges.':'Dealers are <strong style="color:#ff3355">short gamma</strong> — they must <strong style="color:#ff3355">amplify moves</strong> in whichever direction price goes. Rallies can run farther, selloffs can accelerate. Volatility expands.'}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--text2);">
        <div><span style="color:var(--cyan);">⬡ FLIP POINT</span> — Where dealer gamma flips from positive to negative. Below flip = destabilizing environment.</div>
        <div><span style="color:#00ff88;">⬡ GEX SUPPORT</span> — Strike with large positive GEX below spot. Dealers buy here, acts as price floor.</div>
        <div><span style="color:#ff3355;">⬡ GEX RESISTANCE</span> — Strike with large positive GEX above spot. Dealers sell here, acts as price ceiling.</div>
        <div><span style="color:#ffcc00;">⬡ NET GEX</span> — Sum of all dealer gamma. Positive = stabilizing. Negative = destabilizing. Current: <span style="font-family:'Share Tech Mono',monospace;color:${rc};">${fmtB(gex.net_gex)}</span></div>
      </div>`;
  }

  // ── CALL / PUT WALLS BY EXPIRY ───────────────────────────────────────────
  const wallsEl = $('gexWalls');
  if(wallsEl) {
    const wallsByExp = opt.walls_by_expiry || [];
    let html = '';

    if(wallsByExp.length) {
      // Each expiry gets a card
      wallsByExp.forEach(w => {
        const isToday = w.dte === 0;
        const borderCol = isToday ? '#ffcc00' : '#00ccff';
        const cDist = w.callWall && spot ? w.callWall - spot : null;
        const pDist = w.putWall  && spot ? w.putWall  - spot : null;
        const range = w.callWall && w.putWall ? w.callWall - w.putWall : null;

        html += `<div style="background:var(--bg3);border:1px solid var(--border);border-top:3px solid ${borderCol};border-radius:3px;padding:10px;margin-bottom:8px;">
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:${borderCol};margin-bottom:8px;letter-spacing:1px;">
            ${w.label?.toUpperCase()} ${w.exp?'· '+w.exp.slice(5):''} ${w.dte!=null?'· '+w.dte+'DTE':''}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
            <div style="text-align:center;padding:8px;background:rgba(0,255,136,0.06);border:1px solid rgba(0,255,136,0.25);border-radius:3px;">
              <div style="font-family:'Orbitron',monospace;font-size:7px;color:#00ff88;margin-bottom:3px;">CALL WALL</div>
              <div style="font-family:'Share Tech Mono',monospace;font-size:${isToday?'22':'18'}px;font-weight:bold;color:#00ff88;">$${w.callWall||'—'}</div>
              ${cDist!=null?`<div style="font-size:10px;color:#00ff88;">+${fmt(cDist,1)} pts</div>`:''}
              ${w.topCalls?.[0]?.oi?`<div style="font-size:10px;color:var(--text3);">${(w.topCalls[0].oi/1000).toFixed(0)}K OI</div>`:''}
            </div>
            <div style="text-align:center;padding:8px;background:rgba(255,51,85,0.06);border:1px solid rgba(255,51,85,0.25);border-radius:3px;">
              <div style="font-family:'Orbitron',monospace;font-size:7px;color:#ff3355;margin-bottom:3px;">PUT WALL</div>
              <div style="font-family:'Share Tech Mono',monospace;font-size:${isToday?'22':'18'}px;font-weight:bold;color:#ff3355;">$${w.putWall||'—'}</div>
              ${pDist!=null?`<div style="font-size:10px;color:${pDist>=0?'#00ff88':'#ff3355'};">${pDist>=0?'+':''}${fmt(pDist,1)} pts</div>`:''}
              ${w.topPuts?.[0]?.oi?`<div style="font-size:10px;color:var(--text3);">${(w.topPuts[0].oi/1000).toFixed(0)}K OI</div>`:''}
            </div>
          </div>
          ${range?`<div style="text-align:center;font-size:10px;color:var(--text3);">Range: $${w.putWall} — $${w.callWall} · ${fmt(range,0)} pts wide</div>`:''}
          <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:4px;">
            <div>
              <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:3px;">TOP CALLS (OI)</div>
              ${(w.topCalls||[]).slice(0,5).map((s,i) => {
                const bw = Math.round((s.oi/(w.topCalls[0]?.oi||1))*100);
                return '<div style="display:flex;align-items:center;gap:4px;padding:2px 0;">'
                  +'<span style="font-family:Share Tech Mono,monospace;font-size:11px;color:#00ff88;width:48px;text-align:right;">$'+s.strike+'</span>'
                  +'<div style="flex:1;height:7px;background:var(--bg2);border-radius:2px;overflow:hidden;">'
                  +'<div style="width:'+bw+'%;height:100%;background:rgba(0,255,136,'+(i===0?'0.7':'0.4')+');border-radius:2px;"></div></div>'
                  +'<span style="font-size:9px;color:var(--text3);width:36px;">'+Math.round(s.oi/1000)+'K</span>'
                  +'</div>';
              }).join('')}
            </div>
            <div>
              <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:3px;">TOP PUTS (OI)</div>
              ${(w.topPuts||[]).slice(0,5).map((s,i) => {
                const bw = Math.round((s.oi/(w.topPuts[0]?.oi||1))*100);
                return '<div style="display:flex;align-items:center;gap:4px;padding:2px 0;">'
                  +'<span style="font-family:Share Tech Mono,monospace;font-size:11px;color:#ff3355;width:48px;text-align:right;">$'+s.strike+'</span>'
                  +'<div style="flex:1;height:7px;background:var(--bg2);border-radius:2px;overflow:hidden;">'
                  +'<div style="width:'+bw+'%;height:100%;background:rgba(255,51,85,'+(i===0?'0.7':'0.4')+');border-radius:2px;"></div></div>'
                  +'<span style="font-size:9px;color:var(--text3);width:36px;">'+Math.round(s.oi/1000)+'K</span>'
                  +'</div>';
              }).join('')}
            </div>
          </div>
        </div>`;
      });
    } else {
      // Fallback to old single-expiry display from top_call/put_strikes
      const callStrikes = opt.top_call_strikes || [];
      const putStrikes  = opt.top_put_strikes  || [];
      const callWall = callStrikes[0]?.strike, putWall = putStrikes[0]?.strike;
      const range = callWall && putWall ? callWall - putWall : null;
      if(callWall || putWall) {
        html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
          <div style="text-align:center;padding:10px;background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.3);border-radius:4px;">
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:#00ff88;margin-bottom:4px;">CALL WALL</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:bold;color:#00ff88;">$${callWall||'—'}</div>
            ${callStrikes[0]?.oi?`<div style="font-size:11px;color:var(--text3);">${(callStrikes[0].oi/1000).toFixed(0)}K OI</div>`:''}
          </div>
          <div style="text-align:center;padding:10px;background:rgba(255,51,85,0.08);border:1px solid rgba(255,51,85,0.3);border-radius:4px;">
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:#ff3355;margin-bottom:4px;">PUT WALL</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:bold;color:#ff3355;">$${putWall||'—'}</div>
            ${putStrikes[0]?.oi?`<div style="font-size:11px;color:var(--text3);">${(putStrikes[0].oi/1000).toFixed(0)}K OI</div>`:''}
          </div>
        </div>`;
        if(range) html += `<div style="text-align:center;padding:6px;background:var(--bg3);border-radius:3px;margin-bottom:8px;">
          <span style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);">PIN RANGE: </span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:14px;color:var(--cyan);">$${putWall} — $${callWall} (${fmt(range,0)} pts)</span></div>`;
      }
    }
    wallsEl.innerHTML = html || '<div class="no-data">No wall data — refresh GEX</div>';
  }

  // ── MAX PAIN EXPIRY LADDER ────────────────────────────────────────────────
  const mpEl = $('gexMaxPain');
  if(mpEl && maxPainArr.length) {
    const prices = maxPainArr.map(m=>m.max_pain).filter(Boolean);
    const mn = Math.min(...prices, spot) * 0.998;
    const mx = Math.max(...prices, spot) * 1.002;
    const rng = mx - mn || 1;
    let html = `<div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:8px;">MAX PAIN = price where most options expire worthless</div>`;
    maxPainArr.slice(0,8).forEach(m => {
      if(!m.max_pain) return;
      const w = ((m.max_pain - mn) / rng * 80 + 10).toFixed(1);
      const diff = m.max_pain - spot;
      const dc = Math.abs(diff) < 2 ? '#00ff88' : Math.abs(diff) < 5 ? '#ffcc00' : '#ff8800';
      const isNearest = Math.abs(diff) === Math.min(...maxPainArr.map(x=>Math.abs((x.max_pain||0)-spot)));
      html += `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border);">
        <span style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);width:52px;">${m.expiry?.slice(5)||m.expiry}</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text3);width:24px;">${m.dte}d</span>
        <div style="flex:1;height:8px;background:var(--bg3);border-radius:2px;overflow:hidden;">
          <div style="width:${w}%;height:100%;background:${isNearest?'var(--cyan)':dc};border-radius:2px;opacity:0.7;"></div></div>
        <span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${isNearest?'var(--cyan)':dc};width:52px;text-align:right;">$${m.max_pain}</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:${diff>=0?'#00ff88':'#ff3355'};width:46px;text-align:right;">${diff>=0?'+':''}${fmt(diff,1)}</span>
      </div>`;
    });
    if(spot) html += `<div style="margin-top:8px;font-size:11px;color:var(--text3);text-align:right;">Current spot: $${fmt(spot,2)}</div>`;
    mpEl.innerHTML = html;
  } else if(mpEl) { mpEl.innerHTML = '<div class="no-data">No max pain data</div>'; }

  // ── DEALER POSITIONING NARRATIVE ─────────────────────────────────────────
  const dealerEl = $('gexDealer');
  if(dealerEl) {
    const isPos = (gex.net_gex||0) > 0;
    const callGex = gex.call_gex || 0, putGex = gex.put_gex || 0;
    const aboveFlip = spot > (gex.flip_point||0);
    const distFlip = gex.flip_point ? spot - gex.flip_point : null;
    const lines = [];
    if(isPos) {
      lines.push({c:'#00ff88',t:'Dealers are NET LONG GAMMA. As SPY moves up, dealers sell to hedge; as SPY moves down, dealers buy. This creates natural resistance to large moves — a volatility dampener.'});
    } else {
      lines.push({c:'#ff3355',t:'Dealers are NET SHORT GAMMA. As SPY moves up, dealers must BUY more to hedge (adding fuel); as SPY moves down, dealers must SELL (adding fuel down). Moves can become self-reinforcing.'});
    }
    if(distFlip !== null) {
      if(aboveFlip) lines.push({c:'#00ff88',t:`SPY is $${fmt(distFlip,2)} ABOVE the gamma flip point ($${gex.flip_point}). Above flip = positive GEX environment = stabilizing. Watch for the flip to act as support.`});
      else lines.push({c:'#ff3355',t:`SPY is $${fmt(Math.abs(distFlip),2)} BELOW the gamma flip point ($${gex.flip_point}). Below flip = negative GEX = destabilizing. Flip acts as resistance overhead.`});
    }
    if(callGex && putGex) {
      const cRatio = Math.abs(callGex/(putGex||1));
      if(Math.abs(putGex) > Math.abs(callGex)*2) lines.push({c:'#ff8800',t:`Put GEX (${fmtB(putGex)}) dominates call GEX (${fmtB(callGex)}). Heavy put open interest creating strong downside gamma pressure.`});
      else if(Math.abs(callGex) > Math.abs(putGex)*2) lines.push({c:'#00ff88',t:`Call GEX (${fmtB(callGex)}) dominates. Heavy call open interest providing upside support from dealer hedging.`});
    }
    if(gex.support && gex.resistance) {
      lines.push({c:'var(--cyan)',t:`Dealer-defined range: $${gex.support} (support) to $${gex.resistance} (resistance) — ${fmt(gex.resistance-gex.support,0)}-point corridor. High probability of mean reversion within this band when above flip.`});
    }
    dealerEl.innerHTML = lines.map(l=>`<div style="display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--border);">
      <div style="width:7px;height:7px;border-radius:50%;background:${l.c};flex-shrink:0;margin-top:4px;box-shadow:0 0 5px ${l.c}88;"></div>
      <span style="font-size:12px;color:var(--text2);line-height:1.6;">${l.t}</span></div>`).join('');
  }

  // ── OPTIONS FLOW SUMMARY ──────────────────────────────────────────────────
  const flowEl = $('gexFlow');
  if(flowEl) {
    const cv = opt.call_volume||0, pv = opt.put_volume||0;
    const co = opt.call_oi||0, po = opt.put_oi||0;
    const pcv = opt.pc_ratio_vol||0, pco = opt.pc_ratio_oi||0;
    const tCV = opt.total_call_vol||0, tPV = opt.total_put_vol||0;
    const tCO = opt.total_call_oi||0, tPO = opt.total_put_oi||0;
    const pcvColor = pcv>1.5?'#ff3355':pcv>0.9?'#ffcc00':'#00ff88';
    const pcoColor = pco>1.5?'#ff3355':pco>0.9?'#ffcc00':'#00ff88';
    const flowBias = pcv < 0.7 ? 'CALL HEAVY — bullish flow dominates' : pcv > 1.5 ? 'PUT HEAVY — bearish/protective flow dominates' : 'BALANCED — mixed directional conviction';
    const fbColor = pcv<0.7?'#00ff88':pcv>1.5?'#ff3355':'#ffcc00';
    flowEl.innerHTML = `
      <div style="padding:8px;background:${fbColor}11;border:1px solid ${fbColor}33;border-radius:4px;margin-bottom:10px;text-align:center;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:${fbColor};margin-bottom:2px;">FLOW BIAS (${opt.expiry||'today'})</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${fbColor};">${flowBias}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div style="text-align:center;padding:8px;background:var(--bg3);border-radius:3px;">
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:4px;">P/C VOL RATIO</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:20px;color:${pcvColor};">${fmt(pcv,2)}</div>
          <div style="font-size:10px;color:var(--text3);">${pcv>1.5?'Bearish':pcv<0.7?'Bullish':'Neutral'}</div>
        </div>
        <div style="text-align:center;padding:8px;background:var(--bg3);border-radius:3px;">
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:4px;">P/C OI RATIO</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:20px;color:${pcoColor};">${fmt(pco,2)}</div>
          <div style="font-size:10px;color:var(--text3);">${pco>1.5?'Structural put hedge':pco<0.7?'Call heavy OI':'Mixed'}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;">
        ${[['CALL VOL', cv,'#00ff88'],['PUT VOL',pv,'#ff3355'],['CALL OI',co,'#00ff88'],['PUT OI',po,'#ff3355']].map(([l,v,c])=>`
          <div style="padding:5px 8px;background:var(--bg3);border-radius:2px;display:flex;justify-content:space-between;">
            <span style="color:var(--text3);font-size:10px;">${l}</span>
            <span style="font-family:'Share Tech Mono',monospace;color:${c};">${v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':v}</span>
          </div>`).join('')}
      </div>`;
  }

  // ── VIX TERM STRUCTURE + SKEW ─────────────────────────────────────────────
  const vtEl = $('gexVixTerm');
  if(vtEl) {
    const v1 = vix.price, v3 = vix3m.price, v6 = vix6m.price;
    const contango = v1 && v3 ? v3 > v1 : null;
    const termStructure = contango === null ? 'UNKNOWN' : contango ? 'CONTANGO' : 'BACKWARDATION';
    const tsColor = contango === null ? 'var(--text3)' : contango ? '#00ff88' : '#ff3355';
    const tsDesc = contango === null ? '' : contango ? 'Normal — near-term vol cheaper than future vol. Market calm, no immediate panic.' : 'Inverted — near-term vol more expensive. Acute fear or event risk today.';
    const vvixVal = vvix.price, skewVal = skew.price;
    const vvixColor = vvixVal > 130 ? '#ff3355' : vvixVal > 100 ? '#ff8800' : '#00ff88';
    const skewColor = skewVal > 150 ? '#ff3355' : skewVal > 130 ? '#ff8800' : '#00ff88';
    const pts = [v1&&{l:'VIX (1M)',p:v1,c:vix.change},v3&&{l:'VIX3M',p:v3,c:vix3m.change},v6&&{l:'VIX6M',p:v6,c:vix6m.change}].filter(Boolean);
    const maxP = pts.length ? Math.max(...pts.map(p=>p.p)) : 30, minP = pts.length ? Math.min(...pts.map(p=>p.p)) : 15;
    const cr = v => v > 0 ? '#ff3355' : v < 0 ? '#00ff88' : 'var(--text2)';
    let html = `
      <div style="padding:8px;background:${tsColor}11;border:1px solid ${tsColor}33;border-radius:4px;margin-bottom:10px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:${tsColor};margin-bottom:3px;">VIX TERM STRUCTURE: ${termStructure}</div>
        <div style="font-size:12px;color:var(--text2);">${tsDesc}</div>
      </div>`;
    pts.forEach(p => {
      const w = ((p.p-minP)/(maxP-minP)*70+15).toFixed(1);
      const pc = p.p > 30 ? '#ff3355' : p.p > 20 ? '#ff8800' : p.p > 15 ? '#ffcc00' : '#00ff88';
      html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">
        <span style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);width:48px;">${p.l}</span>
        <div style="flex:1;height:10px;background:var(--bg3);border-radius:2px;overflow:hidden;">
          <div style="width:${w}%;height:100%;background:${pc};opacity:0.7;border-radius:2px;"></div></div>
        <span style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${pc};width:36px;text-align:right;">${fmt(p.p,1)}</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${cr(p.c)};width:40px;text-align:right;">${p.c!=null?(p.c>=0?'+':'')+fmt(p.c,2):''}</span>
      </div>`;
    });
    if(vvixVal) html += `<div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--border);margin-top:4px;">
      <div><div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);">VVIX <span style="color:var(--text3);font-size:9px;">(vol of vol)</span></div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:16px;color:${vvixColor};">${fmt(vvixVal,1)}</div>
      <div style="font-size:10px;color:var(--text3);">${vvixVal>130?'EXTREME fear of fear':vvixVal>100?'Elevated':'Normal'}</div></div>
      ${skewVal?`<div style="text-align:right;"><div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);">SKEW</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:16px;color:${skewColor};">${fmt(skewVal,1)}</div>
      <div style="font-size:10px;color:var(--text3);">${skewVal>150?'Extreme tail hedge':skewVal>130?'Heavy put demand':skewVal>110?'Normal':'Low protection'}</div></div>`:''}
    </div>`;
    vtEl.innerHTML = html;
  }
}


// ─── BREADTH TAB ADDITIONS ────────────────────────────────────────────────────
function renderBreadthAdditions(md, sd) {
  const q = md.quotes || {};
  const spy = q['SPY'] || {}, qqq = q['QQQ'] || {}, iwm = q['IWM'] || {};
  const rsp = q['RSP'] || {}, dia = q['DIA'] || {};
  const vix = q['^VIX'] || {}, vvix = q['^VVIX'] || {};
  const vix3m = q['^VIX3M'] || {}, vix6m = q['^VIX6M'] || {};
  const smh = q['SMH'] || {}, xbi = q['XBI'] || {}, kre = q['KRE'] || {};
  const gdx = q['GDX'] || {}, arkk = q['ARKK'] || {}, xrt = q['XRT'] || {};
  const tlt = q['TLT'] || {}, hyg = q['HYG'] || {}, lqd = q['LQD'] || {};
  const xlk = q['XLK']||{}, xlf=q['XLF']||{}, xle=q['XLE']||{}, xlv=q['XLV']||{};
  const xli=q['XLI']||{}, xly=q['XLY']||{}, xlp=q['XLP']||{}, xlb=q['XLB']||{};
  const xlre=q['XLRE']||{}, xlu=q['XLU']||{}, xlc=q['XLC']||{};
  const gc=q['GC=F']||{}, dxy=q['DX-Y.NYB']||{}, btc=q['BTC-USD']||{};
  const oil=q['CL=F']||{};
  const p = v => v?.pct_change || 0;
  const clr = v => v > 0 ? '#00ff88' : v < 0 ? '#ff3355' : 'var(--text2)';
  const sign = v => v >= 0 ? '+' : '';

  // ── BREADTH COMPOSITE SCORE ───────────────────────────────────────────────
  const compEl = $('breadthComposite');
  if(compEl) {
    let score = 0, maxScore = 0, items = [];
    const add = (condition, pts, label, val) => {
      maxScore += pts;
      if(condition) { score += pts; items.push({c:'#00ff88',t:label+': '+val,pts}); }
      else { items.push({c:'#ff3355',t:label+': '+val,pts:-pts}); }
    };
    if(spy.price) {
      add(p(spy)>0, 2, 'SPY direction', (p(spy)>=0?'+':'')+fmt(p(spy),2)+'%');
      add(p(rsp)>0, 1, 'Equal-weight RSP', (p(rsp)>=0?'+':'')+fmt(p(rsp),2)+'%');
      add(p(rsp)>p(spy), 1, 'Breadth (RSP>SPY)', 'RSP '+sign(p(rsp)-p(spy))+fmt(p(rsp)-p(spy),2)+'%');
      const sects = [xlk,xlf,xle,xlv,xli,xly,xlp,xlb,xlre,xlu,xlc].filter(x=>x.price);
      const upSects = sects.filter(s=>p(s)>0).length;
      add(upSects>=6, 2, 'Sectors up', upSects+'/'+sects.length);
      add(p(hyg)>-0.2, 1, 'Credit (HYG)', (p(hyg)>=0?'+':'')+fmt(p(hyg),2)+'%');
      if(vix.price) add(vix.price<25, 1, 'VIX regime', 'VIX '+fmt(vix.price,1));
      add(p(iwm)>p(spy)-1, 1, 'Small caps (IWM)', (p(iwm)>=0?'+':'')+fmt(p(iwm),2)+'%');
      const mag7 = ['AAPL','MSFT','GOOGL','AMZN','NVDA','META','TSLA'];
      const m7avg = mag7.map(s=>p(q[s]||{})).reduce((a,b)=>a+b,0)/7;
      add(m7avg>p(spy)-0.5, 1, 'MAG7 vs SPY', sign(m7avg-p(spy))+fmt(m7avg-p(spy),2)+'%');
    }
    const pct = maxScore ? Math.round((score/maxScore)*100) : 0;
    const bc = pct>=70?'#00ff88':pct>=50?'#88cc00':pct>=35?'#ff8800':'#ff3355';
    const bl = pct>=70?'BROAD — healthy participation':pct>=50?'MIXED — uneven breadth':pct>=35?'NARROW — concentration risk':'WEAK — broad deterioration';
    compEl.innerHTML = `<div style="display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:center;">
      <div style="text-align:center;padding:16px 24px;background:${bc}11;border:2px solid ${bc}44;border-radius:6px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:4px;">BREADTH SCORE</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:42px;font-weight:900;color:${bc};line-height:1;">${pct}%</div>
        <div style="font-family:'Orbitron',monospace;font-size:10px;color:${bc};margin-top:4px;">${bl.split('—')[0].trim()}</div>
      </div>
      <div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:10px;">${bl}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${items.map(it=>`<span style="font-family:'Share Tech Mono',monospace;font-size:11px;padding:2px 8px;background:${it.c}15;border:1px solid ${it.c}33;border-radius:3px;color:${it.c};">${it.t}</span>`).join('')}
        </div>
      </div>
    </div>`;
  }

  // ── FACTOR PERFORMANCE ────────────────────────────────────────────────────
  const factEl = $('breadthFactors');
  if(factEl) {
    const factors = [
      {name:'GROWTH',subs:[{sym:'QQQ',d:qqq},{sym:'ARKK',d:arkk},{sym:'SMH',d:smh},{sym:'XBI',d:xbi}]},
      {name:'VALUE',subs:[{sym:'XLF',d:xlf},{sym:'XLE',d:xle},{sym:'XLI',d:xli},{sym:'KRE',d:kre}]},
      {name:'DEFENSIVE',subs:[{sym:'XLV',d:xlv},{sym:'XLP',d:xlp},{sym:'XLU',d:xlu},{sym:'TLT',d:tlt}]},
      {name:'REAL ASSETS',subs:[{sym:'GDX',d:gdx},{sym:'GC=F',d:gc},{sym:'CL=F',d:oil},{sym:'XLE',d:xle}]},
    ];
    const maxAbs = 3;
    let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
    factors.forEach(f => {
      const valid = f.subs.filter(s=>s.d.pct_change!=null);
      if(!valid.length) return;
      const avg = valid.reduce((a,s)=>a+(s.d.pct_change||0),0)/valid.length;
      const pct = Math.min(Math.abs(avg)/maxAbs*45,45);
      const fc = avg > 0.3 ? '#00ff88' : avg < -0.3 ? '#ff3355' : '#ffcc00';
      html += `<div style="padding:8px;background:var(--bg3);border-radius:4px;border-left:3px solid ${fc};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
          <span style="font-family:'Orbitron',monospace;font-size:10px;color:var(--text2);">${f.name}</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${fc};">${sign(avg)}${fmt(avg,2)}%</span>
        </div>
        <div style="height:6px;background:var(--bg2);border-radius:3px;overflow:hidden;position:relative;">
          <div style="position:absolute;${avg>=0?'left:50%':'right:50%'};width:${pct}%;height:100%;background:${fc};opacity:0.7;border-radius:3px;"></div>
          <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--border2);"></div>
        </div>
        <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">
          ${valid.map(s=>`<span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:${clr(s.d.pct_change)};padding:1px 5px;background:var(--bg2);border-radius:2px;">${s.sym} ${sign(s.d.pct_change)}${fmt(s.d.pct_change,1)}%</span>`).join('')}
        </div>
      </div>`;
    });
    html += '</div>';
    factEl.innerHTML = html;
  }

  // ── RISK-ON / RISK-OFF PROXY MATRIX ──────────────────────────────────────
  const riskEl = $('breadthRiskMatrix');
  if(riskEl) {
    const riskOn  = [{sym:'SPY',d:spy},{sym:'IWM',d:iwm},{sym:'QQQ',d:qqq},{sym:'HYG',d:hyg},{sym:'BTC',d:btc},{sym:'OIL',d:oil}];
    const riskOff = [{sym:'TLT',d:tlt},{sym:'GLD',d:gc},{sym:'DXY',d:dxy},{sym:'XLP',d:xlp},{sym:'XLU',d:xlu},{sym:'XLV',d:xlv}];
    const roAvg = riskOn.filter(x=>x.d.pct_change!=null).reduce((a,x)=>a+(x.d.pct_change||0),0) / Math.max(riskOn.filter(x=>x.d.pct_change!=null).length,1);
    const rfAvg = riskOff.filter(x=>x.d.pct_change!=null).reduce((a,x)=>a+(x.d.pct_change||0),0) / Math.max(riskOff.filter(x=>x.d.pct_change!=null).length,1);
    const signal = roAvg > rfAvg + 0.3 ? 'RISK-ON' : rfAvg > roAvg + 0.3 ? 'RISK-OFF' : 'MIXED';
    const sc = signal==='RISK-ON'?'#00ff88':signal==='RISK-OFF'?'#ff3355':'#ffcc00';
    const makeRow = (items, label, color) => `
      <div style="margin-bottom:10px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:${color};margin-bottom:5px;letter-spacing:1px;">${label} (avg ${sign(label==='RISK-ON'?roAvg:rfAvg)}${fmt(label==='RISK-ON'?roAvg:rfAvg,2)}%)</div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:3px;">
          ${items.map(({sym,d})=>{ const pc=d.pct_change; if(pc==null) return ''; const c=clr(pc); return `<div style="background:${c}12;border:1px solid ${c}33;border-radius:3px;padding:4px 2px;text-align:center;"><div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">${sym}</div><div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${c};">${sign(pc)}${fmt(pc,1)}%</div></div>`;}).join('')}
        </div>
      </div>`;
    riskEl.innerHTML = `
      <div style="text-align:center;padding:8px;background:${sc}11;border:1px solid ${sc}33;border-radius:4px;margin-bottom:10px;">
        <div style="font-family:'Orbitron',monospace;font-size:10px;color:${sc};margin-bottom:2px;">COMPOSITE SIGNAL</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:18px;color:${sc};">${signal}</div>
      </div>
      ${makeRow(riskOn,'RISK-ON','#00ff88')}
      ${makeRow(riskOff,'RISK-OFF','#ff3355')}`;
  }

  // ── VOLATILITY REGIME ─────────────────────────────────────────────────────
  const volRegEl = $('breadthVolRegime');
  if(volRegEl) {
    const vv = vix.price||0, vx3 = vix3m.price||0, vvv = vvix.price||0;
    const regime = vv < 15 ? 'COMPLACENT' : vv < 20 ? 'LOW' : vv < 25 ? 'NORMAL' : vv < 30 ? 'ELEVATED' : vv < 40 ? 'FEAR' : 'EXTREME FEAR';
    const rc2 = vv < 15 ? '#ffcc00' : vv < 20 ? '#00ff88' : vv < 25 ? '#88cc00' : vv < 30 ? '#ff8800' : '#ff3355';
    const contango = vx3 > vv;
    const ts = contango ? 'CONTANGO (normal)' : 'BACKWARDATION (stressed)';
    const tsc = contango ? '#00ff88' : '#ff3355';
    volRegEl.innerHTML = `
      <div style="text-align:center;padding:12px;background:${rc2}11;border:2px solid ${rc2}33;border-radius:5px;margin-bottom:10px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:4px;">VIX REGIME</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:28px;color:${rc2};">${fmt(vv,1)}</div>
        <div style="font-family:'Orbitron',monospace;font-size:10px;color:${rc2};margin-top:3px;">${regime}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:12px;color:var(--text3);">VIX3M</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${vx3>vv?'#ff8800':'#00ff88'}">${fmt(vx3,1)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:12px;color:var(--text3);">Term Structure</span>
          <span style="font-family:'Orbitron',monospace;font-size:9px;color:${tsc}">${ts}</span>
        </div>
        ${vvv?`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:12px;color:var(--text3);">VVIX</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${vvv>130?'#ff3355':vvv>100?'#ff8800':'#00ff88'}">${fmt(vvv,1)}</span>
        </div>`:''}
        <div style="padding:6px 8px;background:var(--bg3);border-radius:3px;font-size:12px;color:var(--text2);">
          ${vv>30?'High VIX: options expensive, mean reversion likely. Sell vol strategies favored.':vv<15?'Low VIX: options cheap, consider protection. Complacency warning.':'Normal vol regime — standard risk management.'}
        </div>
      </div>`;
  }

}

// ─── BONDS TAB ADDITIONS ─────────────────────────────────────────────────────
function renderBondsAdditions(md) {
  const q = md.quotes || {};
  const spy = q['SPY']||{}, tlt = q['TLT']||{}, hyg = q['HYG']||{};
  const lqd = q['LQD']||{}, jnk = q['JNK']||{}, ief = q['IEF']||{}, shy = q['SHY']||{};
  const tnx = q['^TNX']||{}, irx = q['^IRX']||{}, fvx = q['^FVX']||{}, tyx = q['^TYX']||{};
  const vix = q['^VIX']||{};
  const t2=irx.price, t5=fvx.price, t10=tnx.price, t30=tyx.price;
  const p = v => v?.pct_change ?? null;
  const clr = v => v > 0 ? '#00ff88' : v < 0 ? '#ff3355' : 'var(--text2)';
  const sign = v => v >= 0 ? '+' : '';

  // ── SPY vs TLT ────────────────────────────────────────────────────────────
  const spyTltEl = $('bondsSPYvsTLT');
  if(spyTltEl) {
    const spyPct = p(spy), tltPct = p(tlt);
    const ratio = spy.price && tlt.price ? spy.price/tlt.price : null;
    const corr = (spyPct!=null&&tltPct!=null) ? (spyPct*tltPct<0?'NEGATIVE (flight-to-safety active)':'POSITIVE (risk-on, bonds selling off with stocks)') : null;
    const signal = (spyPct!=null&&tltPct!=null) ?
      (spyPct<-1&&tltPct>0.3?'CLASSIC RISK-OFF — equities down, duration bid. Defensive.':
       spyPct<-1&&tltPct<0?'STAGFLATION WARNING — both equities and bonds falling. Rare and dangerous.':
       spyPct>1&&tltPct<-0.3?'RISK-ON — equities rallying, bonds selling. Growth narrative dominant.':
       spyPct>0&&tltPct>0.3?'REFLATION — both rising. Unusual. Check for short squeeze or mean reversion.':
       'No strong directional divergence') : 'Awaiting data';
    const sc = (spyPct!=null&&tltPct!=null) ? (spyPct<-1&&tltPct<0?'#ff3355':spyPct<-1&&tltPct>0.3?'#ffcc00':spyPct>1&&tltPct<-0.3?'#00ff88':'var(--text2)') : 'var(--text3)';
    spyTltEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div style="text-align:center;padding:10px;background:var(--bg3);border-radius:3px;">
          <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:4px;">SPY</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:20px;color:${clr(spyPct)};">${spyPct!=null?sign(spyPct)+fmt(spyPct,2)+'%':'—'}</div>
          <div style="font-size:11px;color:var(--text3);">${spy.price?'$'+fmt(spy.price,2):''}</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--bg3);border-radius:3px;">
          <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:4px;">TLT (20yr+)</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:20px;color:${clr(tltPct)};">${tltPct!=null?sign(tltPct)+fmt(tltPct,2)+'%':'—'}</div>
          <div style="font-size:11px;color:var(--text3);">${tlt.price?'$'+fmt(tlt.price,2):''}</div>
        </div>
      </div>
      <div style="padding:8px;background:${sc}11;border-left:3px solid ${sc};border-radius:3px;margin-bottom:8px;">
        <div style="font-size:12px;color:var(--text2);line-height:1.5;">${signal}</div>
      </div>
      ${ratio?`<div style="font-size:11px;color:var(--text3);">SPY/TLT ratio: <span style="font-family:'Share Tech Mono',monospace;color:var(--text2);">${fmt(ratio,2)}</span> — rising = risk-on rotation, falling = risk-off</div>`:''}`;
  }

  // ── SPY vs HYG ────────────────────────────────────────────────────────────
  const spyHygEl = $('bondsSPYvsHYG');
  if(spyHygEl) {
    const spyPct = p(spy), hygPct = p(hyg);
    const diverge = (spyPct!=null&&hygPct!=null) ? spyPct-hygPct : null;
    const signal = diverge===null ? 'Awaiting data' :
      diverge > 1.5 ? 'SPY LEADING HYG — equities pricing in more optimism than credit. Watch for credit to confirm or drag SPY lower.' :
      diverge < -1.5 ? 'HYG LEADING SPY — credit rally not confirmed by equities. Potential mean-reversion bid in SPY.' :
      Math.abs(diverge) < 0.5 ? 'CONFIRMING — equities and high yield credit moving in lockstep. Strong conviction signal.' :
      'Slight divergence — monitor for continuation or reversal.';
    const sc = diverge!==null ? (Math.abs(diverge)>1.5?'#ff8800':Math.abs(diverge)<0.5&&hygPct>0?'#00ff88':'#ffcc00') : 'var(--text3)';
    spyHygEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div style="text-align:center;padding:10px;background:var(--bg3);border-radius:3px;">
          <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:4px;">SPY</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:20px;color:${clr(spyPct)};">${spyPct!=null?sign(spyPct)+fmt(spyPct,2)+'%':'—'}</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--bg3);border-radius:3px;">
          <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:4px;">HYG (Hi Yield)</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:20px;color:${clr(hygPct)};">${hygPct!=null?sign(hygPct)+fmt(hygPct,2)+'%':'—'}</div>
          <div style="font-size:11px;color:var(--text3);">${hyg.price?'$'+fmt(hyg.price,2):''}</div>
        </div>
      </div>
      ${diverge!==null?`<div style="text-align:center;margin-bottom:8px;"><span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--text3);">Spread: </span><span style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${diverge>=0?'#00ff88':'#ff3355'};">${sign(diverge)}${fmt(diverge,2)}%</span></div>`:''}
      <div style="padding:8px;background:${sc}11;border-left:3px solid ${sc};border-radius:3px;">
        <div style="font-size:12px;color:var(--text2);line-height:1.5;">${signal}</div>
      </div>`;
  }

  // ── SPY vs LQD ────────────────────────────────────────────────────────────
  const spyLqdEl = $('bondsSPYvsLQD');
  if(spyLqdEl) {
    const spyPct = p(spy), lqdPct = p(lqd);
    const diverge = (spyPct!=null&&lqdPct!=null) ? spyPct-lqdPct : null;
    const signal = diverge===null ? 'Awaiting data' :
      (spyPct<-1&&lqdPct<-0.5) ? 'CREDIT STRESS — LQD (inv grade) falling with equities. Broad credit deterioration.' :
      (spyPct<-1&&lqdPct>0) ? 'EQUITY SPECIFIC — investment grade holding. Selloff may be equity-specific, not systemic.' :
      (spyPct>1&&lqdPct<-0.3) ? 'GROWTH ROTATION — equities rallying while IG bonds sell. Rates concern but risk appetite strong.' :
      'No major divergence — credit and equity broadly aligned.';
    const sc2 = (spyPct!=null&&lqdPct!=null&&spyPct<-1&&lqdPct<-0.5)?'#ff3355':(spyPct!=null&&lqdPct!=null&&spyPct<-1&&lqdPct>0)?'#00ff88':'#ffcc00';
    spyLqdEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div style="text-align:center;padding:10px;background:var(--bg3);border-radius:3px;">
          <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:4px;">SPY</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:20px;color:${clr(spyPct)};">${spyPct!=null?sign(spyPct)+fmt(spyPct,2)+'%':'—'}</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--bg3);border-radius:3px;">
          <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:4px;">LQD (IG Corp)</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:20px;color:${clr(lqdPct)};">${lqdPct!=null?sign(lqdPct)+fmt(lqdPct,2)+'%':'—'}</div>
          <div style="font-size:11px;color:var(--text3);">${lqd.price?'$'+fmt(lqd.price,2):''}</div>
        </div>
      </div>
      <div style="padding:8px;background:${sc2}11;border-left:3px solid ${sc2};border-radius:3px;">
        <div style="font-size:12px;color:var(--text2);line-height:1.5;">${signal}</div>
      </div>`;
  }

  // ── REAL YIELD GAUGE ──────────────────────────────────────────────────────
  const ryEl = $('bondsRealYield');
  if(ryEl) {
    // Approximate real yield = nominal 10Y - implied inflation (rough proxy: 10Y - 2Y as risk free, or use fixed 2.5% inflation estimate)
    const nomYield = t10;
    const estInflation = 2.8; // approximate current CPI expectation
    const realYield = nomYield ? nomYield - estInflation : null;
    const ryColor = realYield===null?'var(--text3)':realYield>1.5?'#ff3355':realYield>0.5?'#ff8800':realYield>0?'#ffcc00':realYield>-0.5?'#00ff88':'#00ccff';
    const ryLabel = realYield===null?'—':realYield>1.5?'VERY RESTRICTIVE':realYield>0.5?'RESTRICTIVE':realYield>0?'SLIGHTLY RESTRICTIVE':realYield>-0.5?'ACCOMMODATIVE':'VERY ACCOMMODATIVE';
    const ryDesc = realYield===null?'':realYield>1?'High real yields create headwind for equities and growth assets. PE multiples compress.':realYield>0?'Mildly positive real rates — manageable for equities but watch trend.':realYield<0?'Negative real rates historically support equities, commodities, and risk assets.':'Neutral real rate — neither headwind nor tailwind.';
    ryEl.innerHTML = `
      <div style="text-align:center;padding:14px;background:${ryColor}11;border:1px solid ${ryColor}33;border-radius:5px;margin-bottom:10px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:4px;">REAL YIELD (10Y − Est. Inflation)</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:32px;font-weight:900;color:${ryColor};">${realYield!=null?(realYield>=0?'+':'')+fmt(realYield,2)+'%':'—'}</div>
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:${ryColor};margin-top:4px;">${ryLabel}</div>
      </div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:10px;line-height:1.5;">${ryDesc}</div>
      <div style="display:flex;flex-direction:column;gap:5px;font-size:12px;">
        ${nomYield?`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text3);">Nominal 10Y</span><span style="font-family:'Share Tech Mono',monospace;">${fmt(nomYield,3)}%</span></div>`:''}
        <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text3);">Est. Inflation</span><span style="font-family:'Share Tech Mono',monospace;">${fmt(estInflation,1)}%</span></div>
        ${realYield!=null?`<div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:var(--text3);">Real Yield</span><span style="font-family:'Share Tech Mono',monospace;color:${ryColor};">${realYield>=0?'+':''}${fmt(realYield,2)}%</span></div>`:''}
      </div>`;
  }

  // ── CREDIT SPREAD LADDER ──────────────────────────────────────────────────
  const csEl = $('bondsCreditLadder');
  if(csEl) {
    // Proxy credit spreads from ETF price relationships
    const ladderItems = [
      {name:'Junk (JNK)',etf:jnk,desc:'High yield junk bonds', risk:'HIGH RISK'},
      {name:'High Yield (HYG)',etf:hyg,desc:'Broad high yield index', risk:'HIGH RISK'},
      {name:'Inv Grade (LQD)',etf:lqd,desc:'Investment grade corps', risk:'MED RISK'},
      {name:'7-10yr (IEF)',etf:ief,desc:'Intermediate Treasury', risk:'LOW RISK'},
      {name:'1-3yr (SHY)',etf:shy,desc:'Short-term Treasury', risk:'LOWEST RISK'},
      {name:'20yr+ (TLT)',etf:tlt,desc:'Long-duration Treasury', risk:'DURATION RISK'},
    ];
    let html = '<div style="display:flex;flex-direction:column;gap:0;">';
    ladderItems.forEach(item => {
      if(!item.etf.price) return;
      const pc = item.etf.pct_change||0;
      const c = clr(pc);
      html += `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);">
        <div style="flex:1;">
          <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text2);">${item.name}</div>
          <div style="font-size:10px;color:var(--text3);">${item.desc}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${c};">${sign(pc)}${fmt(pc,2)}%</div>
          <div style="font-size:10px;color:var(--text3);">$${fmt(item.etf.price,2)}</div>
        </div>
      </div>`;
    });
    // Risk-off score: how many safe assets are up vs risky assets down
    const safeUp = [ief,shy].filter(e=>e.pct_change>0).length;
    const riskDn = [jnk,hyg,lqd].filter(e=>e.pct_change<0).length;
    const flee = safeUp + riskDn;
    const fc = flee>=3?'#ff3355':flee>=2?'#ff8800':flee>=1?'#ffcc00':'#00ff88';
    html += `</div><div style="margin-top:8px;padding:7px 10px;background:${fc}11;border-left:3px solid ${fc};border-radius:3px;font-size:12px;color:${fc};">${flee>=3?'FLIGHT TO SAFETY — risky credit selling, safe Treasuries bid':flee>=2?'CAUTION — mixed signals, defensive lean':flee>=1?'SLIGHT DEFENSIVE TILT':'RISK-ON — credit broadly bid'}</div>`;
    csEl.innerHTML = html;
  }

  // ── RATE OF CHANGE ────────────────────────────────────────────────────────
  const rocEl = $('bondsROC');
  if(rocEl) {
    const rates = [{l:'2YR',p:t2,c:irx.change},{l:'5YR',p:t5,c:fvx.change},{l:'10YR',p:t10,c:tnx.change},{l:'30YR',p:t30,c:tyx.change}].filter(r=>r.p);
    const rising = rates.filter(r=>(r.c||0)>0.02).length;
    const falling = rates.filter(r=>(r.c||0)<-0.02).length;
    const trend = rising > falling+1?'RATES RISING — duration pressure, borrowing costs up':falling > rising+1?'RATES FALLING — easing financial conditions, duration rallying':'RATES MIXED/FLAT — no clear directional move today';
    const tc = rising > falling+1 ? '#ff3355' : falling > rising+1 ? '#00ff88' : '#ffcc00';
    let html = `<div style="padding:8px;background:${tc}11;border-left:3px solid ${tc};border-radius:3px;margin-bottom:10px;">
      <div style="font-size:12px;color:${tc};line-height:1.5;">${trend}</div></div>
      <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:6px;">INTRADAY RATE CHANGES (bps)</div>`;
    rates.forEach(r => {
      const bps = ((r.c||0)*100).toFixed(1);
      const rc = (r.c||0)>0?'#ff3355':(r.c||0)<0?'#00ff88':'var(--text3)';
      const w = Math.min(Math.abs(r.c||0)/0.15*60,60).toFixed(1);
      html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">
        <span style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);width:36px;">${r.l}</span>
        <div style="flex:1;height:8px;background:var(--bg3);border-radius:2px;overflow:hidden;position:relative;">
          <div style="position:absolute;${(r.c||0)>=0?'left:50%':'right:50%'};width:${w}%;height:100%;background:${rc};border-radius:2px;opacity:0.8;"></div>
          <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--border2);"></div>
        </div>
        <span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${rc};width:54px;text-align:right;">${bps>0?'+':''}${bps}bps</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--text3);width:46px;text-align:right;">${fmt(r.p,3)}%</span>
      </div>`;
    });
    if(vix.price) html += `<div style="margin-top:8px;padding:6px 8px;background:var(--bg3);border-radius:3px;font-size:11px;color:var(--text3);">Rates rising + VIX ${vix.price>25?'elevated':'low'} = ${vix.price>25&&rising>1?'double headwind for equities':'mixed regime'}</div>`;
    rocEl.innerHTML = html;
  }
}

function renderBreadth(md, sd){
  const q=md.quotes||{};
  const tnx=q['^TNX'], irx=q['^IRX'];
  const spread=tnx&&irx?tnx.price-irx.price:null;
  const spy=q['SPY'], rsp=q['RSP'];
  const nya=q['^NYA'], nyhgh=q['^NYHGH'], nylow=q['^NYLOW'];
  const advD=q['^ADVN'], decD=q['^DECN'];
  const uvol=q['^UVOL'], dvol=q['^DVOL'];
  const ma50d=q['^SP500MA50'], ma200d=q['^SP500MA200'];
  const spyRspEl=$('breadthSpyRsp');
  const mag7El=$('breadthMag7');

  // ── ADVANCE / DECLINE ──────────────────────────────────────────────────────
  const adEl = $('adPanel');
  if(adEl){
    if(advD?.price && decD?.price && advD.price > 100){
      const adv=Math.round(advD.price), dec=Math.round(decD.price);
      const total=adv+dec, advPct=adv/total*100, ratio=adv/dec;
      const rc=ratio>2?'#00ff88':ratio>1?'#88cc00':ratio>0.5?'#ff8800':'#ff3355';
      adEl.innerHTML=`
        <div style="height:10px;background:var(--bg3);border-radius:3px;overflow:hidden;margin-bottom:8px;">
          <div style="width:${advPct.toFixed(1)}%;height:100%;background:#00ff88;border-radius:3px;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-family:'Share Tech Mono',monospace;font-size:16px;font-weight:bold;color:#00ff88;">${fmtK(adv)}</span>
          <span style="font-family:'Orbitron',monospace;font-size:9px;color:${rc};align-self:center;">${fmt(ratio,2)}x</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:16px;font-weight:bold;color:#ff3355;">${fmtK(dec)}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;">
          <div class="stat-card"><div class="sc-lbl">ADV</div><div class="sc-val up">${fmtK(adv)}</div></div>
          <div class="stat-card"><div class="sc-lbl">DEC</div><div class="sc-val dn">${fmtK(dec)}</div></div>
          <div class="stat-card"><div class="sc-lbl">RATIO</div><div class="sc-val" style="color:${rc}">${fmt(ratio,2)}</div></div>
        </div>`;
    } else {
      const secs=['XLK','XLF','XLE','XLV','XLI','XLY','XLP','XLB','XLRE','XLU','XLC'];
      const up=secs.filter(s=>(q[s]?.pct_change||0)>0).length;
      adEl.innerHTML=`<div style="font-size:11px;color:var(--text3);margin-bottom:6px;">Sector proxy (live A/D unavailable)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
          <div class="stat-card"><div class="sc-lbl">SECTORS UP</div><div class="sc-val up">${up}/11</div></div>
          <div class="stat-card"><div class="sc-lbl">SECTORS DN</div><div class="sc-val dn">${11-up}/11</div></div>
        </div>`;
    }
  }


  if(spyRspEl && spy && rsp) {
    const diff = (spy.pct_change||0) - (rsp.pct_change||0);
    const diffColor = diff > 0.5 ? '#ff8800' : diff < -0.5 ? '#00ff88' : '#ffcc00';
    const signal = diff > 1 ? 'NARROW — mega caps leading, weak underneath' :
                   diff > 0.3 ? 'SLIGHTLY NARROW' :
                   diff < -1 ? 'BROAD — equal weight outperforming, healthy' :
                   diff < -0.3 ? 'SLIGHTLY BROAD' : 'NEUTRAL — broad participation';
    spyRspEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;text-align:center;">
          <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:4px;">SPY (CAP-WEIGHT)</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:bold;color:${clr(spy.change)};">${sign(spy.pct_change)}${fmt(spy.pct_change,2)}%</div>
        </div>
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;text-align:center;">
          <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:4px;">RSP (EQUAL-WEIGHT)</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:bold;color:${clr(rsp.change)};">${sign(rsp.pct_change)}${fmt(rsp.pct_change,2)}%</div>
        </div>
      </div>
      <div style="background:var(--bg3);border:1px solid ${diffColor}44;border-left:3px solid ${diffColor};border-radius:3px;padding:10px;">
        <div style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${diffColor};">${sign(diff)}${fmt(diff,2)}% spread</div>
        <div style="font-size:13px;color:var(--text2);margin-top:4px;">${signal}</div>
      </div>`;
  } else if(spyRspEl) {
    spyRspEl.innerHTML = '<div class="no-data">Loading SPY/RSP data...</div>';
  }

  // ── MAG7 vs Market ──
  if(mag7El) {
    const mag7 = ['AAPL','MSFT','GOOGL','AMZN','NVDA','META','TSLA'];
    const mag7Data = mag7.map(s => q[s]).filter(Boolean);
    if(mag7Data.length > 0) {
      const avgMag7 = mag7Data.reduce((a,d) => a + (d.pct_change||0), 0) / mag7Data.length;
      const spyPct = spy?.pct_change || 0;
      const diff = avgMag7 - spyPct;
      const diffColor = diff > 0.5 ? '#ff8800' : diff < -0.5 ? '#00ff88' : '#ffcc00';
      const signal = diff > 1 ? 'MAG7 CARRYING MARKET' : diff > 0 ? 'MAG7 OUTPERFORMING' : diff < -1 ? 'BROAD MARKET LEADING' : 'MAG7 LAGGING';
      mag7El.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;text-align:center;">
            <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:4px;">MAG 7 AVG</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:bold;color:${avgMag7>=0?'#00ff88':'#ff3355'};">${sign(avgMag7)}${fmt(avgMag7,2)}%</div>
          </div>
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:12px;text-align:center;">
            <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:4px;">SPY</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:bold;color:${spyPct>=0?'#00ff88':'#ff3355'};">${sign(spyPct)}${fmt(spyPct,2)}%</div>
          </div>
        </div>
        <div style="background:var(--bg3);border:1px solid ${diffColor}44;border-left:3px solid ${diffColor};border-radius:3px;padding:10px;">
          <div style="font-family:'Orbitron',monospace;font-size:10px;letter-spacing:1px;color:${diffColor};">${signal}</div>
          <div style="font-size:13px;color:var(--text2);margin-top:4px;">MAG7 ${sign(diff)}${fmt(diff,2)}% vs SPY</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-top:8px;">
          ${mag7.map(s=>{const d=q[s];if(!d)return '';const c=d.pct_change>=0?'#00ff88':'#ff3355';return `<div style="background:var(--bg3);border:1px solid var(--border);border-radius:2px;padding:4px;text-align:center;"><div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);">${s.replace('GOOGL','GOOG')}</div><div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${c};">${sign(d.pct_change)}${fmt(d.pct_change,1)}%</div></div>`;}).join('')}
        </div>`;
    } else {
      mag7El.innerHTML = '<div class="no-data">Loading MAG7 data...</div>';
    }
  }

  // ── SP500 Internals (compact — detail panels above handle A/D, Hi/Lo, MA%) ──
  const internalsEl = $('breadthInternals');
  if(internalsEl) {
    const sectors = ['XLK','XLF','XLE','XLV','XLI','XLY','XLP','XLB','XLRE','XLU','XLC'];
    const sectorData = sectors.map(s => ({sym:s, d:q[s]})).filter(x=>x.d);
    const upSectors = sectorData.filter(x => x.d.pct_change > 0).length;
    const strongUp = sectorData.filter(x => x.d.pct_change > 1).length;
    const strongDn = sectorData.filter(x => x.d.pct_change < -1).length;
    const breadthScore = Math.round((upSectors / sectorData.length) * 100);
    const bColor = breadthScore>70?'#00ff88':breadthScore>50?'#88cc00':breadthScore>30?'#ff8800':'#ff3355';
    const bLabel = breadthScore>70?'BROAD':breadthScore>50?'MIXED':breadthScore>30?'NARROW':'WEAK';
    // Up/Down volume ratio for signal
    const uv=uvol?.price||0, dv=dvol?.price||0;
    const volRatio = uv&&dv ? uv/dv : null;
    const vrc = volRatio?volRatio>2?'#00ff88':volRatio>1?'#88cc00':volRatio>0.5?'#ff8800':'#ff3355':'var(--text3)';
    // A/D
    const adv=advD?.price||0, dec=decD?.price||0;
    const adRatio = adv&&dec ? adv/dec : null;
    const arc = adRatio?adRatio>2?'#00ff88':adRatio>1?'#88cc00':adRatio>0.5?'#ff8800':'#ff3355':'var(--text3)';
    // % above MAs
    const ma50=ma50d?.price, ma200=ma200d?.price;
    internalsEl.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:6px;">
        <div class="stat-card" style="border-top:3px solid ${bColor};">
          <div class="sc-lbl">BREADTH</div>
          <div class="sc-val" style="color:${bColor}">${breadthScore}%</div>
          <div style="font-size:9px;color:${bColor};font-family:'Orbitron',monospace;">${bLabel}</div>
        </div>
        <div class="stat-card">
          <div class="sc-lbl">SECTORS UP</div>
          <div class="sc-val up">${upSectors}/${sectorData.length}</div>
        </div>
        <div class="stat-card">
          <div class="sc-lbl">STRONG UP</div>
          <div class="sc-val up">${strongUp}</div>
        </div>
        <div class="stat-card">
          <div class="sc-lbl">STRONG DN</div>
          <div class="sc-val dn">${strongDn}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
        <div class="stat-card">
          <div class="sc-lbl">A/D RATIO</div>
          <div class="sc-val" style="color:${arc}">${adRatio?fmt(adRatio,2):'—'}</div>
        </div>
        <div class="stat-card">
          <div class="sc-lbl">VOL RATIO</div>
          <div class="sc-val" style="color:${vrc}">${volRatio?fmt(volRatio,2):'—'}</div>
        </div>
        <div class="stat-card">
          <div class="sc-lbl">NYSE COMP</div>
          <div class="sc-val ${clr(nya?.change)}">${nya?.price?fmt(nya.price,0):'—'}</div>
        </div>
      </div>`;
  }

  // Yields block removed — data lives in Bonds tab

  // ── Sector ranking ──
  const sectors=['XLK','XLF','XLE','XLV','XLI','XLY','XLP','XLB','XLRE','XLU','XLC'];
  const ranked=sectors.map(s=>({sym:s,d:q[s]})).filter(x=>x.d).sort((a,b)=>b.d.pct_change-a.d.pct_change);
  $('breadthSectors').innerHTML=`<div style="display:flex;flex-direction:column;gap:4px;">${ranked.map(({sym,d})=>{
    const c=sectorColor(d.pct_change);
    const w=Math.min(Math.abs(d.pct_change)/5*100,100);
    return `<div style="display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid var(--border);">
      <span style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;width:40px;color:${c.text}">${sym}</span>
      <span style="font-size:11px;color:var(--text3);width:100px">${SECTOR_NAMES[sym]||sym}</span>
      <div style="flex:1;height:8px;background:var(--bg3);border-radius:2px;overflow:hidden;">
        <div style="width:${w}%;height:100%;background:${c.text};opacity:0.7;border-radius:2px;"></div>
      </div>
      <span style="font-family:'Share Tech Mono',monospace;font-size:13px;width:60px;text-align:right;color:${c.text}">${sign(d.pct_change)}${fmt(d.pct_change,2)}%</span>
    </div>`;
  }).join('')}</div>`;

  // ── SPY MOVING AVERAGES ───────────────────────────────────────────────────
  const maEl = $('breadthMAs');
  if(maEl && sd && sd.length >= 20) {
    const cur = q['SPY']?.price || sd[0]?.close || 0;
    const closes = sd.map(d => parseFloat(d.close)).filter(v => v > 0);

    // Simple moving average helper
    const sma = n => {
      if(closes.length < n) return null;
      return closes.slice(0, n).reduce((a,b) => a+b, 0) / n;
    };

    // Weekly closes — take every 5th daily close (approximate)
    const weeklyCloses = closes.filter((_,i) => i % 5 === 0);
    const wsma = n => {
      if(weeklyCloses.length < n) return null;
      return weeklyCloses.slice(0, n).reduce((a,b) => a+b, 0) / n;
    };

    const dailyMAs = [
      {label:'20',  val:sma(20)},
      {label:'50',  val:sma(50)},
      {label:'100', val:sma(100)},
      {label:'20D', val:sma(200)},
    ];
    const weeklyMAs = [
      {label:'20W',  val:wsma(20)},
      {label:'50W',  val:wsma(50)},
      {label:'100W', val:wsma(100)},
    ];

    const maRow = (mas) => mas.map(m => {
      if(!m.val) return '';
      const diff = cur - m.val;
      const pct  = diff / m.val * 100;
      const c    = diff > 0 ? '#00ff88' : '#ff3355';
      const dist = (diff >= 0 ? '+' : '') + fmt(diff, 2) + ' (' + (pct >= 0 ? '+' : '') + fmt(pct, 2) + '%)';
      return '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);">'
        + '<span style="font-family:\'Orbitron\',monospace;font-size:9px;letter-spacing:1px;color:var(--text3);width:40px;">' + m.label + '</span>'
        + '<span style="font-family:\'Share Tech Mono\',monospace;font-size:14px;font-weight:bold;color:var(--text);">$' + fmt(m.val, 2) + '</span>'
        + '<div style="flex:1;height:6px;background:var(--bg3);border-radius:2px;overflow:hidden;margin:0 8px;">'
        + '<div style="width:' + Math.min(Math.abs(pct) / 10 * 100, 100).toFixed(1) + '%;height:100%;background:' + c + ';border-radius:2px;"></div></div>'
        + '<span style="font-family:\'Share Tech Mono\',monospace;font-size:12px;color:' + c + ';text-align:right;min-width:120px;">' + dist + '</span>'
        + '<span style="font-family:\'Orbitron\',monospace;font-size:8px;color:' + c + ';width:36px;text-align:right;">' + (diff > 0 ? 'ABOVE' : 'BELOW') + '</span>'
        + '</div>';
    }).join('');

    maEl.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">'
      + '<div>'
      + '<div style="font-family:\'Orbitron\',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid var(--border);">DAILY</div>'
      + maRow(dailyMAs)
      + '</div>'
      + '<div>'
      + '<div style="font-family:\'Orbitron\',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid var(--border);">WEEKLY (approx)</div>'
      + maRow(weeklyMAs)
      + '</div>'
      + '</div>'
      + '<div style="margin-top:8px;font-size:11px;color:var(--text3);text-align:right;">SPY current: $' + fmt(cur, 2) + ' · Based on ' + closes.length + ' daily closes</div>';
  } else if(maEl) {
    maEl.innerHTML = '<div class="no-data">Need historical data for MA calculations</div>';
  }
  try { renderBreadthAdditions(md, sd); } catch(e) { console.warn("breadthAdditions:", e); }
}

function renderSentiment(md){
  const q=md.quotes||{},fg=md.fear_greed||{},pcr=md.options_summary?.pc_ratio_vol,vixQ=q['^VIX']||{};
  const fgVal=fg.value!=null?fg.value:fg.score;
  const fgColor=fgVal<=25?'#ff3355':fgVal<=45?'#ff8800':fgVal<=55?'#ffcc00':fgVal<=75?'#88cc00':'#00ff88';
  const fgLbl=fgVal<=25?'EXTREME FEAR':fgVal<=45?'FEAR':fgVal<=55?'NEUTRAL':fgVal<=75?'GREED':'EXTREME GREED';
  const indicators=[
    {name:'Fear & Greed',val:fgVal!=null?fgVal+'':'—',signal:fgLbl,color:fgColor},
    {name:'VIX Level',val:fmt(vixQ.price,1),signal:vixQ.price<20?'CALM':vixQ.price<30?'ELEVATED':'FEAR',color:vixQ.price<20?'#00ff88':vixQ.price<30?'#ffcc00':'#ff3355'},
    {name:'Put/Call Ratio',val:fmt(pcr,3),signal:pcr<0.7?'BULLISH':pcr<1.0?'NEUTRAL':'BEARISH',color:pcr<0.7?'#00ff88':pcr<1.0?'#ffcc00':'#ff3355'},
  ];
  $('sentList').innerHTML=indicators.map(({name,val,signal,color})=>`
    <div class="sent-indicator">
      <div class="sent-dot" style="background:${color};box-shadow:0 0 8px ${color}66"></div>
      <span class="sent-name">${name}</span>
      <span class="sent-val" style="color:${color}">${val}</span>
      <span class="sent-signal" style="color:${color};background:${color}22;border:1px solid ${color}44">${signal}</span>
    </div>`).join('');
  // Score
  let score=0;
  if(fgVal!=null){if(fgVal>55)score+=2;else if(fgVal>45)score+=1;else if(fgVal<30)score-=2;else score-=1;}
  if(vixQ.price){if(vixQ.price<20)score+=2;else if(vixQ.price<25)score+=1;else if(vixQ.price>30)score-=2;else score-=1;}
  if(pcr){if(pcr<0.7)score+=1;else if(pcr>1.1)score-=1;}
  const maxScore=5,pct=((score+maxScore)/(maxScore*2))*100;
  const sc=score>=2?'#00ff88':score>=0?'#ffcc00':score>=-2?'#ff8800':'#ff3355';
  const sl=score>=2?'RISK ON':score>=0?'NEUTRAL':score>=-2?'CAUTIOUS':'RISK OFF';
  $('sentScore').innerHTML=`
    <div style="padding:20px;text-align:center;">
      <div style="font-family:'Orbitron',monospace;font-size:48px;font-weight:900;color:${sc}">${score>0?'+'+score:score}</div>
      <div style="font-family:'Orbitron',monospace;font-size:13px;letter-spacing:3px;color:${sc};margin-top:6px">${sl}</div>
      <div style="height:12px;background:var(--bg3);border-radius:6px;margin:16px 0;overflow:hidden;"><div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#ff3355,#ffcc00,#00ff88);border-radius:6px;"></div></div>
      <div style="display:flex;justify-content:space-between;font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text3)"><span>RISK OFF</span><span>NEUTRAL</span><span>RISK ON</span></div>
    </div>`;
  $('fgDetail').innerHTML=fgVal!=null?`
    <div style="display:flex;align-items:center;gap:20px;padding:10px;">
      <div style="text-align:center;flex:0 0 auto;">
        <div style="font-family:'Orbitron',monospace;font-size:60px;font-weight:900;color:${fgColor}">${fgVal}</div>
        <div style="font-family:'Orbitron',monospace;font-size:12px;letter-spacing:3px;color:${fgColor}">${fgLbl}</div>
      </div>
      <div style="flex:1;">
        <div style="height:16px;background:linear-gradient(90deg,#ff3355,#ff8800,#ffcc00,#88cc00,#00ff88);border-radius:8px;position:relative;margin-bottom:8px;">
          <div style="position:absolute;top:-5px;left:${fgVal}%;transform:translateX(-50%);width:6px;height:26px;background:white;border-radius:3px;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);font-family:'Share Tech Mono',monospace;">
          <span>0 EXTREME FEAR</span><span>25 FEAR</span><span>50 NEUTRAL</span><span>75 GREED</span><span>100 EXTREME GREED</span>
        </div>
      </div>
    </div>`:'<div class="no-data">Fear & Greed data unavailable</div>';

  // Load F&G history chart async
  loadFGHistory();
}

async function loadFGHistory() {
  const el = $('fgHistoryChart');
  if (!el) return;

  // Hardcoded weekly baseline digitized from CNN F&G chart (Apr 2024 → Apr 2026)
  // Format: [YYYY-MM-DD, score]
  const BASELINE = [
    ['2024-04-05',43],['2024-04-12',51],['2024-04-19',48],['2024-04-26',55],
    ['2024-05-03',56],['2024-05-10',62],['2024-05-17',68],['2024-05-24',71],
    ['2024-05-31',72],['2024-06-07',73],['2024-06-14',69],['2024-06-21',65],
    ['2024-06-28',67],['2024-07-05',64],['2024-07-12',60],['2024-07-19',52],
    ['2024-07-26',48],['2024-08-02',38],['2024-08-09',32],['2024-08-16',44],
    ['2024-08-23',54],['2024-08-30',58],['2024-09-06',52],['2024-09-13',56],
    ['2024-09-20',62],['2024-09-27',63],['2024-10-04',65],['2024-10-11',66],
    ['2024-10-18',64],['2024-10-25',66],['2024-11-01',68],['2024-11-08',76],
    ['2024-11-15',74],['2024-11-22',73],['2024-11-29',72],['2024-12-06',68],
    ['2024-12-13',64],['2024-12-20',46],['2024-12-27',50],['2025-01-03',48],
    ['2025-01-10',44],['2025-01-17',47],['2025-01-24',52],['2025-01-31',51],
    ['2025-02-07',55],['2025-02-14',53],['2025-02-21',48],['2025-02-28',42],
    ['2025-03-07',38],['2025-03-14',30],['2025-03-21',26],['2025-03-28',24],
    ['2025-04-04',22],['2025-04-11',28],['2025-04-18',32],['2025-04-25',36],
    ['2025-05-02',40],['2025-05-09',44],['2025-05-16',50],['2025-05-23',54],
    ['2025-06-06',60],['2025-06-13',64],['2025-06-20',66],['2025-06-27',65],
    ['2025-07-04',68],['2025-07-11',70],['2025-07-18',67],['2025-07-25',65],
    ['2025-08-01',62],['2025-08-08',55],['2025-08-15',50],['2025-08-22',48],
    ['2025-09-05',44],['2025-09-12',42],['2025-09-19',46],['2025-09-26',50],
    ['2025-10-03',52],['2025-10-10',56],['2025-10-17',60],['2025-10-24',62],
    ['2025-11-07',65],['2025-11-14',63],['2025-11-21',60],['2025-11-28',58],
    ['2025-12-05',55],['2025-12-12',52],['2025-12-19',48],['2025-12-26',45],
    ['2026-01-02',46],['2026-01-09',50],['2026-01-16',54],['2026-01-23',56],
    ['2026-01-30',52],['2026-02-06',50],['2026-02-13',46],['2026-02-20',42],
    ['2026-02-27',38],['2026-03-06',32],['2026-03-13',26],['2026-03-20',22],
    ['2026-03-27',20],['2026-04-03',19],
  ];

  // Start with baseline as points
  let points = BASELINE.map(([date, v]) => ({
    t: new Date(date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}),
    ts: new Date(date+'T12:00:00').getTime(),
    v,
  }));

  // Try to get live data and overlay/extend
  try {
    const r = await fetch('/fg?t='+Date.now());
    if (r.ok) {
      const d = await r.json();
      if (d.error) throw new Error(d.error);

      // If CNN returns a real time series, use it (it's more accurate)
      if (d.history && d.history.length > 10) {
        const livePoints = d.history.map(h => ({
          t: new Date(h.t).toLocaleDateString('en-US',{month:'short',day:'numeric'}),
          ts: h.t,
          v: h.v,
        }));
        // Sample to ~120 points
        const step = Math.max(1, Math.ceil(livePoints.length / 120));
        points = livePoints.filter((_,i) => i%step===0||i===livePoints.length-1);
      } else {
        // Patch in the live current value at the end
        const liveV = d.value;
        if (liveV != null) {
          const today = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'});
          const last = points[points.length-1];
          if (last.t === today) last.v = liveV;
          else points.push({t:today, ts:Date.now(), v:liveV});
        }
      }
    }
  } catch(e) { /* baseline still shows */ }

  renderFGChart(el, points, points[points.length-1]?.v);
}

function renderFGChart(el, points, currentVal) {
  const n = points.length;
  const W = 800, H = 160, PAD = {t:16, r:50, b:28, l:36};
  const cW = W - PAD.l - PAD.r, cH = H - PAD.t - PAD.b;
  const toX = i => PAD.l + (i / Math.max(n-1,1)) * cW;
  const toY = v => PAD.t + cH - (Math.min(Math.max(v,0),100) / 100 * cH);

  const fgZone = (v) => v<=25?'#ff3355':v<=45?'#ff8800':v<=55?'#ffcc00':v<=75?'#88cc00':'#00ff88';
  const fgLbl  = (v) => v<=25?'EXTREME FEAR':v<=45?'FEAR':v<=55?'NEUTRAL':v<=75?'GREED':'EXTREME GREED';

  // Zone bands
  const bands = [
    {lo:0,  hi:25,  color:'rgba(255,51,85,0.06)'},
    {lo:25, hi:45,  color:'rgba(255,136,0,0.05)'},
    {lo:45, hi:55,  color:'rgba(255,204,0,0.04)'},
    {lo:55, hi:75,  color:'rgba(136,204,0,0.05)'},
    {lo:75, hi:100, color:'rgba(0,255,136,0.06)'},
  ];
  const bandsSvg = bands.map(b =>
    `<rect x="${PAD.l}" y="${toY(b.hi).toFixed(1)}" width="${cW}" height="${(toY(b.lo)-toY(b.hi)).toFixed(1)}" fill="${b.color}"/>`
  ).join('');

  // Grid lines at 25, 50, 75
  const grid = [25,50,75].map(v => {
    const y = toY(v).toFixed(1);
    return `<line x1="${PAD.l}" x2="${PAD.l+cW}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
            <text x="${PAD.l-4}" y="${parseFloat(y)+4}" text-anchor="end" font-size="9" fill="#606080">${v}</text>`;
  }).join('');

  // Gradient polyline — color each segment by zone
  const segments = points.slice(0,-1).map((p,i) => {
    const x1=toX(i).toFixed(1), y1=toY(p.v).toFixed(1);
    const x2=toX(i+1).toFixed(1), y2=toY(points[i+1].v).toFixed(1);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${fgZone((p.v+points[i+1].v)/2)}" stroke-width="2.5" stroke-linecap="round"/>`;
  }).join('');

  // Dots only on small datasets
  const dots = n <= 30 ? points.map((p,i) =>
    `<circle cx="${toX(i).toFixed(1)}" cy="${toY(p.v).toFixed(1)}" r="2.5" fill="${fgZone(p.v)}" opacity="0.7"/>`
  ).join('') : '';

  // Current value dot + label
  const last = points[n-1];
  const lx = toX(n-1).toFixed(1), ly = toY(last.v).toFixed(1);
  const lc = fgZone(last.v);
  const currentDot = `<circle cx="${lx}" cy="${ly}" r="5" fill="${lc}" stroke="#fff" stroke-width="1.5"/>
    <text x="${parseFloat(lx)+8}" y="${parseFloat(ly)+4}" font-size="11" fill="${lc}" font-family="Share Tech Mono,monospace" font-weight="bold">${last.v}</text>`;

  // X axis labels — sample evenly
  const xStep = Math.max(1, Math.floor(n / 8));
  const xlbls = points.map((p,i) => {
    if (i % xStep !== 0 && i !== n-1) return '';
    return `<text x="${toX(i).toFixed(1)}" y="${H-4}" text-anchor="middle" font-size="8" fill="#606080">${p.t}</text>`;
  }).join('');

  // Zone label on right
  const zoneLabel = `<text x="${W-4}" y="${parseFloat(ly)+4}" font-size="8" fill="${lc}" text-anchor="end" font-family="Orbitron,monospace">${fgLbl(last.v)}</text>`;

  el.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;">
      ${bandsSvg}${grid}${segments}${dots}${currentDot}${xlbls}${zoneLabel}
    </svg>
    <div style="display:flex;gap:14px;justify-content:center;margin-top:6px;font-size:10px;font-family:'Share Tech Mono',monospace;flex-wrap:wrap;">
      <span style="color:#ff3355;">■ Extreme Fear (0–25)</span>
      <span style="color:#ff8800;">■ Fear (25–45)</span>
      <span style="color:#ffcc00;">■ Neutral (45–55)</span>
      <span style="color:#88cc00;">■ Greed (55–75)</span>
      <span style="color:#00ff88;">■ Extreme Greed (75–100)</span>
    </div>
    ${n <= 5 ? '<div style="font-size:10px;color:var(--text3);text-align:center;margin-top:4px;">Showing comparison snapshots · Full history loads when CNN API returns time series</div>' : ''}
  `;
}

function renderCommodities(md){
  const q=md.quotes||{};
  const comms=[
    {sym:'GC=F',label:'GOLD',name:'Gold Futures',unit:'$/oz'},
    {sym:'SI=F',label:'SILVER',name:'Silver Futures',unit:'$/oz'},
    {sym:'CL=F',label:'CRUDE OIL',name:'WTI Crude',unit:'$/bbl'},
    {sym:'NG=F',label:'NAT GAS',name:'Natural Gas',unit:'$/MMBtu'},
    {sym:'HG=F',label:'COPPER',name:'Copper Futures',unit:'$/lb'},
    {sym:'DX-Y.NYB',label:'DXY',name:'US Dollar Index',unit:'index'},
    {sym:'BTC-USD',label:'BITCOIN',name:'Bitcoin USD',unit:'USD'},
    {sym:'ETH-USD',label:'ETHEREUM',name:'Ethereum USD',unit:'USD'}
  ];
  $('commGrid').innerHTML=comms.map(({sym,label,name,unit})=>{
    const d=q[sym];
    if(!d)return `<div class="comm-card"><div class="comm-sym">${label}</div><div class="comm-name">${name}</div><div class="comm-price neu">—</div><div class="comm-chg">No data</div></div>`;
    return `<div class="comm-card"><div class="comm-sym">${label}</div><div class="comm-name">${name} · ${unit}</div><div class="comm-price ${clr(d.change)}">$${fmt(d.price,2)}</div><div class="comm-chg ${clr(d.change)}">${sign(d.change)}${fmt(d.change,2)} (${sign(d.pct_change)}${fmt(d.pct_change,2)}%)</div></div>`;
  }).join('');
}




// ─── BEST ANALOGS DATA ───────────────────────────────────────────────────────
// ANALOG_DATA loaded from analog_data.js

// ── Active state ─────────────────────────────────────────────────────────────
let _analogActive = null;   // null = all on; string = analog name active
let _analogTableMode = 'hist';

function renderAnalog() {
  const D = ANALOG_DATA;
  if(!D) return;
  window._analogData = D;

  // Convert corr (−1…1) and rmse to a 0–100% match score
  // Score = 50% from corr (mapped 0→100%) + 50% from rmse (inverted, capped at 5)
  const score = a => {
    const corrScore = ((a.corr + 1) / 2) * 100;          // −1→0%  1→100%
    const rmseScore = Math.max(0, (1 - a.rmse / 5)) * 100; // 0→100%, 5+ → 0%
    return Math.round(corrScore * 0.6 + rmseScore * 0.4);
  };

  const analogs = D.analogs.map(a => ({...a, score: score(a)}));
  const best = [...analogs].sort((a,b) => b.score - a.score)[0];

  _analogActive = null; // default all on

  _renderBossPanel(best, analogs);
  _renderToggles(analogs);
  _renderActiveDetail(analogs);
  _renderAnalogChart(D, analogs);
  analogShowHist();
}

function _renderBossPanel(best, analogs) {
  const nameEl = $('analogBestName');
  const barEl  = $('analogBestBar');
  const scoreEl = $('analogBestScore');
  const descEl  = $('analogBestDesc');
  if(!nameEl) return;

  nameEl.textContent = best.name.replace(' Analog','');
  nameEl.style.color = best.color;

  // Score bar
  const barW = best.score;
  const bc = best.score > 70 ? '#00ff88' : best.score > 50 ? '#ffcc00' : '#ff8800';
  barEl.innerHTML = `
    <div style="height:10px;background:var(--bg3);border-radius:5px;overflow:hidden;margin-bottom:4px;">
      <div style="width:${barW}%;height:100%;background:linear-gradient(90deg,${best.color}88,${best.color});border-radius:5px;transition:width 0.6s;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);">
      <span>0%</span><span style="color:${best.color};font-family:'Share Tech Mono',monospace;font-size:12px;">${best.score}% MATCH</span><span>100%</span>
    </div>`;

  scoreEl.textContent = `r=${best.corr.toFixed(3)} · rmse=${best.rmse.toFixed(2)} · score ${best.score}%`;
  scoreEl.style.color = best.color;

  // Show all scores ranked
  const ranked = [...analogs].sort((a,b) => b.score - a.score);
  descEl.innerHTML = ranked.map((a,i) => `
    <div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--border)33;">
      <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text3);">#${i+1}</span>
      <span style="font-family:'Orbitron',monospace;font-size:8px;color:${a.color};min-width:36px;">${a.name.replace(' Analog','')}</span>
      <div style="flex:1;height:6px;background:var(--bg3);border-radius:3px;overflow:hidden;">
        <div style="width:${a.score}%;height:100%;background:${a.color};border-radius:3px;"></div>
      </div>
      <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:${a.color};min-width:32px;text-align:right;">${a.score}%</span>
    </div>`).join('');
}

function _renderToggles(analogs) {
  const D = window._analogData;
  const curPrice = D.current.current_price;
  const cardsEl = $('analogCards');
  const toggleEl = $('analogToggles');
  if(!toggleEl || !cardsEl) return;

  // Year toggle buttons
  toggleEl.innerHTML = analogs.map(a => `
    <button id="atog_${a.name.replace(/\s/g,'_')}"
      onclick="analogToggle('${a.name}')"
      style="font-family:'Orbitron',monospace;font-size:9px;padding:5px 12px;
             background:${a.color}22;border:2px solid ${a.color};
             color:${a.color};border-radius:3px;cursor:pointer;
             transition:all 0.2s;opacity:1;">
      ${a.name.replace(' Analog','')}
    </button>`).join('');

  // Top stat cards — consensus + current
  const top4 = analogs.filter(a => !a.name.includes('2008'));
  const c30 = top4.map(a=>a.proj[29]?.proj_spy||0).filter(Boolean);
  const c60 = top4.map(a=>a.proj[59]?.proj_spy||0).filter(Boolean);
  const c90 = top4.map(a=>a.proj[89]?.proj_spy||0).filter(Boolean);
  const avg = arr => arr.reduce((a,b)=>a+b,0)/arr.length;
  const pct = (p,base) => ((p/base-1)*100);

  cardsEl.innerHTML = [
    {l:'CURRENT SPY',   v:`$${curPrice.toFixed(2)}`,           sub:`Day ${D.current.current_day} · ${D.current.current_date}`, c:'var(--cyan)'},
    {l:'CONSENSUS 30d', v:`$${avg(c30).toFixed(0)}`,           sub:`${pct(avg(c30),curPrice)>=0?'+':''}${pct(avg(c30),curPrice).toFixed(1)}% · ${top4[0].proj[29]?.est_date}`, c:pct(avg(c30),curPrice)>=0?'#00ff88':'#ff3355'},
    {l:'CONSENSUS 60d', v:`$${avg(c60).toFixed(0)}`,           sub:`${pct(avg(c60),curPrice)>=0?'+':''}${pct(avg(c60),curPrice).toFixed(1)}% · ${top4[0].proj[59]?.est_date}`, c:pct(avg(c60),curPrice)>=0?'#00ff88':'#ff3355'},
    {l:'CONSENSUS 90d', v:`$${avg(c90).toFixed(0)}`,           sub:`${pct(avg(c90),curPrice)>=0?'+':''}${pct(avg(c90),curPrice).toFixed(1)}% · ${top4[0].proj[89]?.est_date}`, c:pct(avg(c90),curPrice)>=0?'#00ff88':'#ff3355'},
    {l:'BEAR CASE (2008)',v:`$${analogs.find(a=>a.name.includes('2008'))?.proj[59]?.proj_spy.toFixed(0)||'—'}`,
     sub:`60d if 2008 repeats`, c:'#ff3355'},
  ].map(c=>`<div class="panel" style="text-align:center;border-top:3px solid ${c.c};padding:8px;">
    <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:5px;">${c.l}</div>
    <div style="font-family:'Share Tech Mono',monospace;font-size:20px;font-weight:900;color:${c.c};">${c.v}</div>
    <div style="font-size:10px;color:var(--text3);margin-top:3px;">${c.sub}</div>
  </div>`).join('');
}

function _renderActiveDetail(analogs) {
  const D = window._analogData;
  const curPrice = D.current.current_price;
  const detEl = $('analogActiveDetail');
  if(!detEl) return;

  if(!_analogActive) { detEl.style.display='none'; return; }

  const a = analogs.find(x=>x.name===_analogActive);
  if(!a) { detEl.style.display='none'; return; }

  detEl.style.display='block';
  const ms = a.milestones;
  const p30=a.proj[29], p60=a.proj[59], p90=a.proj[89];

  detEl.innerHTML = `
    <div style="background:${a.color}11;border:1px solid ${a.color}44;border-left:4px solid ${a.color};border-radius:4px;padding:12px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <div style="font-family:'Orbitron',monospace;font-size:14px;font-weight:900;color:${a.color};">${a.name.toUpperCase()}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--text3);">Match Score: <span style="color:${a.color};font-size:14px;">${a.score}%</span></div>
        <div style="font-size:11px;color:var(--text3);">r=${a.corr.toFixed(3)} · rmse=${a.rmse.toFixed(2)}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;">
        ${[
          ['30 DAYS',  p30,  top4Date(a,29)],
          ['60 DAYS',  p60,  top4Date(a,59)],
          ['90 DAYS',  p90,  top4Date(a,89)],
          ['PEAK',     a.milestones.peak,   null],
          ['TROUGH',   a.milestones.trough, null],
          ['~1 YEAR',  a.milestones.yearend,null],
        ].map(([lbl, p, d]) => {
          if(!p) return `<div style="background:var(--bg3);border-radius:3px;padding:8px;text-align:center;opacity:0.4;">
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">${lbl}</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:16px;color:var(--text3);">—</div>
          </div>`;
          const spy = p.proj_spy || p.proj_spy;
          const pctV = p.pct_from_now;
          const pc = pctV>=0?'#00ff88':'#ff3355';
          const dt = p.est_date || d || '';
          return `<div style="background:var(--bg3);border-radius:3px;padding:8px;text-align:center;border-top:2px solid ${pc};">
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:4px;">${lbl}</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:18px;font-weight:900;color:${pc};">$${spy.toFixed(0)}</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${pc};">${pctV>=0?'+':''}${pctV.toFixed(1)}%</div>
            <div style="font-size:9px;color:var(--text3);margin-top:2px;">${dt}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function top4Date(a, idx) {
  return a.proj[idx]?.est_date || '';
}

function analogToggle(name) {
  const D = window._analogData;
  if(!D) return;
  const analogs = D.analogs.map(a => ({...a, score: _analogScore(a)}));

  if(_analogActive === name) {
    _analogActive = null; // clicking active one → go back to ALL
  } else {
    _analogActive = name;
  }

  // Update button styles
  analogs.forEach(a => {
    const btn = document.getElementById('atog_' + a.name.replace(/\s/g,'_'));
    if(!btn) return;
    const isActive = _analogActive === null || _analogActive === a.name;
    btn.style.opacity = isActive ? '1' : '0.3';
    btn.style.borderWidth = _analogActive === a.name ? '3px' : '2px';
  });

  _renderActiveDetail(analogs);
  _renderAnalogChart(D, analogs);
  _analogTableMode === 'hist' ? analogShowHist() : analogShowProj();
}

function analogToggleAll() {
  const D = window._analogData;
  if(!D) return;
  _analogActive = null;
  const analogs = D.analogs.map(a => ({...a, score: _analogScore(a)}));
  analogs.forEach(a => {
    const btn = document.getElementById('atog_' + a.name.replace(/\s/g,'_'));
    if(btn) { btn.style.opacity='1'; btn.style.borderWidth='2px'; }
  });
  _renderActiveDetail(analogs);
  _renderAnalogChart(D, analogs);
  _analogTableMode === 'hist' ? analogShowHist() : analogShowProj();
}

function _analogScore(a) {
  const corrScore = ((a.corr + 1) / 2) * 100;
  const rmseScore = Math.max(0, (1 - a.rmse / 5)) * 100;
  return Math.round(corrScore * 0.6 + rmseScore * 0.4);
}

function _renderAnalogChart(D, analogs) {
  const chartEl = $('analogChart');
  if(!chartEl) return;
  chartEl.innerHTML='';
  const canvas=document.createElement('canvas');
  canvas.style.cssText='display:block;width:100%;height:100%;';
  chartEl.appendChild(canvas);

  const visAnalogs = _analogActive
    ? analogs.filter(a => a.name === _analogActive)
    : analogs;

  requestAnimationFrame(() => {
    const W=canvas.offsetWidth||900, H=canvas.offsetHeight||380;
    canvas.width=W; canvas.height=H;
    const ctx=canvas.getContext('2d');
    const pad={l:56,r:16,t:24,b:50};
    const cw=W-pad.l-pad.r, ch=H-pad.t-pad.b;
    const curDay=D.current.current_day;
    const totalDays=curDay+220;

    // Scale
    const allPcts=[...D.current.data.map(d=>d.pct)];
    visAnalogs.forEach(a=>{
      a.hist.forEach(h=>allPcts.push(h.pct));
      a.proj.forEach(p=>allPcts.push(p.pct_from_anchor25));
    });
    const minP=Math.min(...allPcts)-2, maxP=Math.max(...allPcts)+2;
    const range=maxP-minP;

    const px=day=>pad.l+((day-1)/(totalDays-1))*cw;
    const py=pct=>pad.t+ch-((pct-minP)/range)*ch;

    ctx.clearRect(0,0,W,H);

    // Grid lines
    const gridLevels=[-40,-30,-20,-15,-10,-5,0,5,10,15,20,25];
    gridLevels.forEach(pct=>{
      if(pct<minP||pct>maxP)return;
      const y=py(pct);
      ctx.strokeStyle=pct===0?'rgba(255,255,255,0.15)':'rgba(255,255,255,0.04)';
      ctx.lineWidth=pct===0?1:0.5;
      ctx.setLineDash(pct===0?[4,4]:[]);
      ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle='#505070';ctx.font='9px "Share Tech Mono",monospace';ctx.textAlign='right';
      ctx.fillText((pct>=0?'+':'')+pct+'%',pad.l-4,y+3);
    });

    // Today line
    const todayX=px(curDay);
    ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.moveTo(todayX,pad.t);ctx.lineTo(todayX,pad.t+ch);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(255,255,255,0.6)';ctx.font='8px "Orbitron",monospace';ctx.textAlign='center';
    ctx.fillText('TODAY',todayX,pad.t+10);

    // Draw analog lines
    visAnalogs.forEach(a=>{
      const alpha = _analogActive ? 'cc' : '88';
      const lw = _analogActive ? 1.8 : 1.2;

      // Historical
      ctx.strokeStyle=a.color+alpha;ctx.lineWidth=lw;
      ctx.beginPath();
      a.hist.forEach((h,i)=>i===0?ctx.moveTo(px(h.day),py(h.pct)):ctx.lineTo(px(h.day),py(h.pct)));
      ctx.stroke();

      // Projection (dashed, starting from current 2026 position)
      const lastPct=D.current.data[D.current.data.length-1].pct;
      ctx.strokeStyle=a.color+(alpha==='cc'?'99':'66');ctx.lineWidth=lw;ctx.setLineDash([6,4]);
      ctx.beginPath();ctx.moveTo(px(curDay),py(lastPct));
      a.proj.forEach(p=>ctx.lineTo(px(p.day),py(p.pct_from_anchor25)));
      ctx.stroke();ctx.setLineDash([]);

      // Analog year label at end of projection
      if(a.proj.length && _analogActive) {
        const lastP=a.proj[Math.min(a.proj.length-1,89)];
        const lx=px(lastP.day)+4, ly=py(lastP.pct_from_anchor25);
        ctx.fillStyle=a.color;ctx.font='9px "Orbitron",monospace';ctx.textAlign='left';
        ctx.fillText(a.name.replace(' Analog',''),lx,ly+3);
      }
    });

    // 2026 actual — always on top, thick
    ctx.strokeStyle='#00ccff';ctx.lineWidth=3;
    ctx.beginPath();
    D.current.data.forEach((d,i)=>i===0?ctx.moveTo(px(d.day),py(d.pct)):ctx.lineTo(px(d.day),py(d.pct)));
    ctx.stroke();

    // Current price dot
    const last=D.current.data[D.current.data.length-1];
    ctx.fillStyle='#00ccff';
    ctx.beginPath();ctx.arc(px(last.day),py(last.pct),6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#001122';
    ctx.beginPath();ctx.arc(px(last.day),py(last.pct),3,0,Math.PI*2);ctx.fill();

    // Legend
    const legItems=[{color:'#00ccff',label:'2025/26 (actual)',dash:false},...visAnalogs.map(a=>({color:a.color,label:a.name+(a.score?` ${a.score}%`:''),dash:true}))];
    const colW=Math.floor((cw)/(Math.min(legItems.length,4)));
    legItems.forEach((item,i)=>{
      const row=Math.floor(i/4), col=i%4;
      const lx=pad.l+col*colW, ly=H-34+row*14;
      ctx.strokeStyle=item.color;ctx.lineWidth=2;
      if(item.dash)ctx.setLineDash([5,4]);
      ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(lx+22,ly);ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle='rgba(255,255,255,0.55)';ctx.font='9px "Share Tech Mono",monospace';ctx.textAlign='left';
      ctx.fillText(item.label,lx+26,ly+3);
    });
  });
}

function analogShowHist() {
  _analogTableMode='hist';
  const D=window._analogData; if(!D)return;
  const tbody=$('analogTableBody'); if(!tbody)return;
  const headEl=$('analogTableHead'); if(!headEl)return;
  const analogs=D.analogs.map(a=>({...a,score:_analogScore(a)}));
  const vis=_analogActive?analogs.filter(a=>a.name===_analogActive):analogs;

  // Build header
  headEl.innerHTML=`<tr>
    <th style="padding:6px 8px;text-align:center;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);border-bottom:1px solid var(--border);">DAY</th>
    <th style="padding:6px 8px;font-family:'Orbitron',monospace;font-size:8px;color:var(--cyan);border-bottom:1px solid var(--border);">2026 DATE</th>
    <th style="padding:6px 8px;text-align:right;font-family:'Orbitron',monospace;font-size:8px;color:var(--cyan);border-bottom:1px solid var(--border);">SPY CLOSE</th>
    <th style="padding:6px 8px;text-align:right;font-family:'Orbitron',monospace;font-size:8px;color:var(--cyan);border-bottom:1px solid var(--border);">% FROM ANCHOR</th>
    ${vis.map(a=>`<th colspan="2" style="padding:6px 8px;text-align:center;font-family:'Orbitron',monospace;font-size:8px;color:${a.color};border-bottom:1px solid var(--border);">${a.name.replace(' Analog','')} (${a.score}%)</th>`).join('')}
  </tr>`;

  tbody.innerHTML=D.current.data.map(d=>{
    const cols=vis.map(a=>{
      const h=a.hist.find(h=>h.day===d.day);
      if(!h)return `<td colspan="2" style="padding:5px 6px;text-align:center;color:var(--text3);">—</td>`;
      const c=h.pct>=0?'#00ff88':'#ff3355';
      return `<td style="padding:5px 6px;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text3);">${h.date}</td>
              <td style="padding:5px 6px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:${c};">${h.pct>=0?'+':''}${h.pct.toFixed(2)}%</td>`;
    }).join('');
    const cc=d.pct>=0?'#00ff88':'#ff3355';
    return `<tr style="border-bottom:1px solid var(--border)22;">
      <td style="padding:5px 6px;text-align:center;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text3);">${d.day}</td>
      <td style="padding:5px 6px;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--cyan);">${d.date}</td>
      <td style="padding:5px 6px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);">$${d.close.toFixed(2)}</td>
      <td style="padding:5px 6px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:${cc};">${d.pct>=0?'+':''}${d.pct.toFixed(2)}%</td>
      ${cols}
    </tr>`;
  }).join('');
}

function analogShowProj() {
  _analogTableMode='proj';
  const D=window._analogData; if(!D)return;
  const tbody=$('analogTableBody'); if(!tbody)return;
  const headEl=$('analogTableHead'); if(!headEl)return;
  const analogs=D.analogs.map(a=>({...a,score:_analogScore(a)}));
  const vis=_analogActive?analogs.filter(a=>a.name===_analogActive):analogs;
  const curPrice=D.current.current_price;
  const curDay=D.current.current_day;

  headEl.innerHTML=`<tr>
    <th style="padding:6px 8px;text-align:center;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);border-bottom:1px solid var(--border);">DAY</th>
    <th style="padding:6px 8px;font-family:'Orbitron',monospace;font-size:8px;color:var(--cyan);border-bottom:1px solid var(--border);">EST DATE</th>
    ${vis.map(a=>`
      <th style="padding:6px 8px;text-align:right;font-family:'Orbitron',monospace;font-size:8px;color:${a.color};border-bottom:1px solid var(--border);">${a.name.replace(' Analog','')} SPY</th>
      <th style="padding:6px 8px;text-align:right;font-family:'Orbitron',monospace;font-size:8px;color:${a.color};border-bottom:1px solid var(--border);">% vs NOW</th>
    `).join('')}
  </tr>`;

  const maxRows=Math.max(...vis.map(a=>a.proj.length),0);
  tbody.innerHTML=Array.from({length:Math.min(maxRows,220)},(_,i)=>{
    const day=curDay+i+1;
    const estDate=vis[0]?.proj[i]?.est_date||'';
    const cols=vis.map(a=>{
      const p=a.proj[i];
      if(!p)return `<td colspan="2" style="padding:5px 6px;text-align:center;color:var(--text3);">—</td>`;
      const c=p.pct_from_now>=0?'#00ff88':'#ff3355';
      return `<td style="padding:5px 6px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);">$${p.proj_spy.toFixed(2)}</td>
              <td style="padding:5px 6px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:${c};">${p.pct_from_now>=0?'+':''}${p.pct_from_now.toFixed(2)}%</td>`;
    }).join('');
    return `<tr style="border-bottom:1px solid var(--border)22;">
      <td style="padding:5px 6px;text-align:center;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text3);">${day}</td>
      <td style="padding:5px 6px;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--cyan);">${estDate}</td>
      ${cols}
    </tr>`;
  }).join('');
}

// ─── INTRADAY PATTERN RECOGNITION ────────────────────────────────────────────
function renderIntradayPattern(md, sd) {
  const el = $('deskPatternPanel');
  if(!el || typeof INTRADAY_PATTERNS === 'undefined') {
    if(el) el.innerHTML='<div style="padding:12px;font-size:12px;color:var(--text3);">Loading pattern data...</div>';
    return;
  }
  const q = md?.quotes||{}, spy = q['SPY']||{}, today = sd?.[0]||{};
  const open_ = spy.open||today.open||0, high = spy.high||today.high||0;
  const low = spy.low||today.low||0, cur = spy.price||0;
  const prevClose = spy.prev_close||sd?.[1]?.close||0;

  // Before market open: show yesterday's completed session
  if(!open_||!prevClose) {
    const P = INTRADAY_PATTERNS;
    const yest = P[P.length-1];
    if(!yest) { el.innerHTML='<div class="no-data">No pattern data</div>'; return; }
    const ytMatches = P.filter(p=>p.gt===yest.gt&&p.f3d===yest.f3d);
    const followPct = ytMatches.length ? ytMatches.filter(p=>p.fl).length/ytMatches.length*100 : 0;
    const avgR = ytMatches.length ? ytMatches.reduce((a,p)=>a+p.dr,0)/ytMatches.length : 0;
    const gtc = yest.gt==='GAP_UP'?'#00ff88':yest.gt==='GAP_DOWN'?'#ff3355':'#ffcc00';
    const dc  = yest.f3d==='UP'?'#00ff88':'#ff3355';
    const stc = yest.st==='TREND_UP'?'#00ff88':yest.st==='TREND_DOWN'?'#ff3355':yest.st==='REVERSAL'?'#ff8800':'#ffcc00';
    el.innerHTML = `
      <div style="padding:8px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:10px;letter-spacing:1px;">LAST SESSION: ${yest.d} — TODAY'S PATTERN LOADS AT MARKET OPEN</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;">
          <div style="background:${gtc}15;border:1px solid ${gtc}33;border-top:3px solid ${gtc};border-radius:3px;padding:8px;text-align:center;">
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:4px;">GAP TYPE</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${gtc};">${yest.gt.replace('_',' ')}</div>
            <div style="font-size:10px;color:${gtc};">${yest.g>=0?'+':''}${yest.g.toFixed(2)}%</div>
          </div>
          <div style="background:${dc}15;border:1px solid ${dc}33;border-top:3px solid ${dc};border-radius:3px;padding:8px;text-align:center;">
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:4px;">FIRST 30MIN</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${dc};">${yest.f3d}</div>
            <div style="font-size:10px;color:var(--text3);">bias</div>
          </div>
          <div style="background:${stc}15;border:1px solid ${stc}33;border-top:3px solid ${stc};border-radius:3px;padding:8px;text-align:center;">
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:4px;">SESSION TYPE</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${stc};">${yest.st.replace('_',' ')}</div>
          </div>
          <div style="background:var(--bg3);border-top:3px solid ${followPct>65?'#00ff88':followPct>50?'#ffcc00':'#ff3355'};border-radius:3px;padding:8px;text-align:center;">
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:4px;">FOLLOW-THRU</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:18px;color:${followPct>65?'#00ff88':followPct>50?'#ffcc00':'#ff3355'};">${followPct.toFixed(0)}%</div>
            <div style="font-size:10px;color:var(--text3);">${ytMatches.length} sessions</div>
          </div>
          <div style="background:var(--bg3);border-top:3px solid var(--cyan);border-radius:3px;padding:8px;text-align:center;">
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:4px;">AVG RANGE</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:18px;color:var(--cyan);">$${avgR.toFixed(2)}</div>
            <div style="font-size:10px;color:var(--text3);">similar days</div>
          </div>
        </div>
      </div>`;
    return;
  }

  const gapPct = (open_-prevClose)/prevClose*100;
  const gapType = gapPct>0.3?'GAP_UP':gapPct<-0.3?'GAP_DOWN':'FLAT';
  const f30dir = cur>open_?'UP':'DOWN';
  const gapFilled = gapType==='GAP_UP'?low<=prevClose:gapType==='GAP_DOWN'?high>=prevClose:null;
  const dayRange = high-low;
  const P = INTRADAY_PATTERNS;
  const matches = P.filter(p=>p.gt===gapType&&p.f3d===f30dir);
  const avg = arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0;
  const pctFn = (arr,fn)=>arr.length?arr.filter(fn).length/arr.length*100:0;
  const followThruRate = pctFn(matches,p=>p.fl);
  const avgRange = avg(matches.map(p=>p.dr));
  const avgClose = avg(matches.map(p=>p.ocp));
  const gapFillRate = gapType!=='FLAT'?pctFn(matches.filter(p=>p.gf!==null),p=>p.gf):null;
  const stCounts = {};
  matches.forEach(p=>{stCounts[p.st]=(stCounts[p.st]||0)+1;});
  const mostLikely = Object.entries(stCounts).sort((a,b)=>b[1]-a[1])[0];
  const total = matches.length;
  const gtColor = gapType==='GAP_UP'?'#00ff88':gapType==='GAP_DOWN'?'#ff3355':'#ffcc00';
  const dirColor = f30dir==='UP'?'#00ff88':'#ff3355';
  const followColor = followThruRate>65?'#00ff88':followThruRate>50?'#ffcc00':'#ff3355';

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:start;">
      <div style="min-width:190px;display:flex;flex-direction:column;gap:6px;">
        <div style="padding:8px 12px;background:${gtColor}15;border:1px solid ${gtColor}44;border-left:3px solid ${gtColor};border-radius:3px;">
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">GAP TYPE</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:16px;color:${gtColor};">${gapType.replace('_',' ')} ${gapPct>=0?'+':''}${fmt(gapPct,2)}%</div>
        </div>
        <div style="padding:8px 12px;background:${dirColor}15;border:1px solid ${dirColor}44;border-left:3px solid ${dirColor};border-radius:3px;">
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">FIRST 30MIN</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:16px;color:${dirColor};">${f30dir} BIAS</div>
        </div>
        ${gapFilled!==null?`<div style="padding:6px 12px;background:${gapFilled?'#00ff8815':'#ff335515'};border:1px solid ${gapFilled?'#00ff8844':'#ff335544'};border-radius:3px;">
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">GAP STATUS</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${gapFilled?'#00ff88':'#ff3355'};">${gapFilled?'✓ FILLED':'✗ UNFILLED'}</div>
        </div>`:''}
      </div>
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:8px;">${total} SESSIONS — ${gapType.replace('_',' ')} + FIRST 30MIN ${f30dir}</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px;">
          ${[
            ['FOLLOW-THRU', followThruRate.toFixed(0)+'%', followColor, 'Direction continued all day'],
            ['AVG DAY RANGE', '$'+fmt(avgRange,2), 'var(--cyan)', 'Typical H-L range'],
            ['AVG CLOSE', (avgClose>=0?'+':'')+fmt(avgClose,2)+'%', avgClose>=0?'#00ff88':'#ff3355', 'Avg open-to-close'],
            gapFillRate!==null?['GAP FILL', gapFillRate.toFixed(0)+'%', gapFillRate>55?'#ff8800':'#00ff88', 'Same-day fill rate']:
            ['SESSIONS', total.toString(), 'var(--text2)', 'Matching patterns'],
          ].map(([l,v,c,sub])=>`<div style="background:var(--bg3);border-radius:3px;padding:8px;text-align:center;">
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:4px;">${l}</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:18px;font-weight:bold;color:${c};">${v}</div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px;">${sub}</div>
          </div>`).join('')}
        </div>
        ${mostLikely?`<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
          <span style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);">MOST LIKELY SESSION TYPE:</span>
          <span style="font-family:'Orbitron',monospace;font-size:10px;color:var(--cyan);padding:2px 8px;background:rgba(0,204,255,0.1);border:1px solid rgba(0,204,255,0.3);border-radius:3px;">${mostLikely[0].replace('_',' ')}</span>
          <span style="font-size:11px;color:var(--text3);">${((mostLikely[1]/total)*100).toFixed(0)}% of similar days</span>
        </div>`:''}
        <div style="display:flex;gap:4px;align-items:flex-end;height:36px;">
          ${['TREND_UP','REVERSAL','RANGE','TREND_DOWN'].map(st=>{
            const n=stCounts[st]||0, pctH=total?(n/total)*100:0;
            const c=st==='TREND_UP'?'#00ff88':st==='TREND_DOWN'?'#ff3355':st==='RANGE'?'#ffcc00':'#ff8800';
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
              <div style="font-size:9px;color:${c};">${pctH.toFixed(0)}%</div>
              <div style="width:100%;height:${Math.max(pctH*0.28,2).toFixed(0)}px;background:${c};border-radius:2px 2px 0 0;opacity:0.7;"></div>
            </div>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:4px;margin-top:3px;">
          ${['TREND UP','REVERSAL','RANGE','TREND DN'].map(l=>`<div style="flex:1;text-align:center;font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);">${l}</div>`).join('')}
        </div>
      </div>
    </div>`;
}

// ─── EXPIRY BEHAVIOR ──────────────────────────────────────────────────────────
let _expiryLookback = 'all'; // 'all' | '2026'

window.expirySetLookback = function(lb, btn) {
  _expiryLookback = lb;
  document.querySelectorAll('#optsExpiryBehavior .exp-lb-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderExpiryBehavior(window._md || {});
};

function renderExpiryBehavior(md) {
  const el = $('optsExpiryBehavior');
  if (!el) return;
  if (typeof EXPIRY_DATA === 'undefined') {
    el.innerHTML = '<div style="padding:12px;font-size:12px;color:var(--text3);">Loading expiry data...</div>';
    return;
  }

  const q = md?.quotes || {}, spy = q['SPY'] || {}, mp = md?.max_pain || [];
  const nearest = mp[0];
  const now = new Date(), dow = now.getDay();
  const E_ALL = EXPIRY_DATA;
  const E = _expiryLookback === '2026' ? E_ALL.filter(e => e.d.startsWith('2026')) : E_ALL;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const avg    = arr => arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : 0;
  const med    = arr => { if (!arr.length) return 0; const s=[...arr].sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; };
  const pctFn  = (arr, fn) => arr.length ? arr.filter(fn).length / arr.length * 100 : 0;
  const fmt2   = n => (parseFloat(n)||0).toFixed(2);
  const fmtPct = (n,d=1) => { const v=parseFloat(n)||0; return (v>=0?'+':'')+v.toFixed(d)+'%'; };
  const clr    = (v, pos='#00ff88', mid='#ffcc00', neg='#ff3355', posThresh=55, negThresh=45) =>
                   v > posThresh ? pos : v < negThresh ? neg : mid;

  const open_    = spy.open || 0, prevClose = spy.prev_close || 0;
  const gapPct   = open_ && prevClose ? (open_ - prevClose) / prevClose * 100 : 0;
  const gapType  = gapPct > 0.3 ? 'GAP_UP' : gapPct < -0.3 ? 'GAP_DOWN' : 'FLAT';
  const cur      = spy.price || 0;
  const mpDist   = nearest && cur ? nearest.max_pain - cur : null;
  const mpColor  = mpDist === null ? 'var(--text3)' : Math.abs(mpDist)<2 ? '#00ff88' : Math.abs(mpDist)<5 ? '#ffcc00' : '#ff8800';

  // Date -> record lookup (full dataset for cross-week lookups)
  const byDate = {};
  E_ALL.forEach(r => { byDate[r.d] = r; });

  function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0,10);
  }

  // ── Day stats slicer ──────────────────────────────────────────────────────
  function sliceStats(rows) {
    if (!rows.length) return null;
    const pctUp    = pctFn(rows, e => e.r > 0);
    const avgRet   = avg(rows.map(e => e.r));
    const medRet   = med(rows.map(e => e.r));
    const avgRange = avg(rows.map(e => e.dr));
    const avgCP    = avg(rows.map(e => e.cp));
    const gapUpRows    = rows.filter(e => e.g >  0.3 && e.gf !== null);
    const gapDnRows    = rows.filter(e => e.g < -0.3 && e.gf !== null);
    const gapUpFill    = gapUpRows.length ? pctFn(gapUpRows, e => e.gf) : null;
    const gapDnFill    = gapDnRows.length ? pctFn(gapDnRows, e => e.gf) : null;
    const todayGapRows = rows.filter(e => gapType==='GAP_UP'?e.g>0.3:gapType==='GAP_DOWN'?e.g<-0.3:Math.abs(e.g)<=0.3);
    const todayGapFill = (gapType !== 'FLAT' && todayGapRows.filter(e=>e.gf!==null).length)
                         ? pctFn(todayGapRows.filter(e=>e.gf!==null), e=>e.gf) : null;
    const closeHigh = pctFn(rows, e => e.cp > 0.7);
    const closeLow  = pctFn(rows, e => e.cp < 0.3);
    const bigUp   = pctFn(rows, e => e.r >  1.0);
    const bigDn   = pctFn(rows, e => e.r < -1.0);
    const flatDay = pctFn(rows, e => Math.abs(e.r) <= 0.3);
    const best  = rows.length ? Math.max(...rows.map(e => e.r)) : 0;
    const worst = rows.length ? Math.min(...rows.map(e => e.r)) : 0;
    return { n: rows.length, pctUp, avgRet, medRet, avgRange, avgCP,
             gapUpFill, gapDnFill, todayGapFill,
             closeHigh, closeLow, bigUp, bigDn, flatDay, best, worst };
  }

  // ── Week stats builder ────────────────────────────────────────────────────
  // weeksBack: 0 = opex week itself, 1 = week before, 2 = two weeks before
  function computeWeekStats(opexFridays, weeksBack) {
    const dayRows = [[], [], [], [], []]; // Mon..Fri
    const weekRets = [];
    opexFridays.forEach(fri => {
      // Reference Friday for this offset week
      const refFri = addDays(fri.d, weeksBack * -7);
      const monDate = addDays(refFri, -4);
      const monRec  = byDate[monDate];
      const friRec  = byDate[refFri];
      if (monRec && friRec && monRec.o && friRec.c) {
        weekRets.push((friRec.c - monRec.o) / monRec.o * 100);
      }
      [-4,-3,-2,-1,0].forEach((offset, i) => {
        const rec = byDate[addDays(refFri, offset)];
        if (rec) dayRows[i].push(rec);
      });
    });
    const weekAvg   = avg(weekRets);
    const weekWR    = weekRets.length ? pctFn(weekRets.map(r=>({r})), e=>e.r>0) : 0;
    const weekN     = weekRets.length;
    const weekBest  = weekRets.length ? Math.max(...weekRets) : 0;
    const weekWorst = weekRets.length ? Math.min(...weekRets) : 0;
    const days = ['Mon','Tue','Wed','Thu','Fri'].map((name, i) => ({
      name, stats: sliceStats(dayRows[i])
    }));
    return { days, weekAvg, weekWR, weekN, weekBest, weekWorst };
  }

  // ── Groupings ─────────────────────────────────────────────────────────────
  const todayDow     = dow === 0 || dow === 6 ? 1 : dow;
  const isWeekend    = dow === 0 || dow === 6;
  const isFri        = dow === 5;
  const isMonthly    = isFri && now.getDate() >= 15 && now.getDate() <= 21;

  const weeklyFridays  = E.filter(e => e.dow === 5 && !e.mo);
  const monthlyFridays = E.filter(e => e.mo);

  const todaySame  = E.filter(e => e.dow === todayDow);
  const todayGroup = isMonthly ? todaySame.filter(e => e.mo)
                   : isFri     ? todaySame.filter(e => !e.mo)
                   : todaySame;
  const todayStats = sliceStats(todayGroup);

  // Weekly: current opex week (T+0)
  const weeklyDayStats = computeWeekStats(weeklyFridays, 0);
  const weeklyStats    = sliceStats(weeklyFridays);

  // Monthly: T-2, T-1, T-0, plus Friday stats
  const monthlyT2      = computeWeekStats(monthlyFridays, 2);
  const monthlyT1      = computeWeekStats(monthlyFridays, 1);
  const monthlyT0      = computeWeekStats(monthlyFridays, 0);
  const monthlyStats   = sliceStats(monthlyFridays);

  const todayLabel = isWeekend ? 'MONDAY 0DTE (PREVIEW)'
                   : isMonthly ? 'MONTHLY OPEX'
                   : isFri     ? 'WEEKLY OPEX (FRI)'
                   : `0DTE ${['','MON','TUE','WED','THU','FRI','SAT'][todayDow]}`;
  const todayColor = isMonthly ? '#ff8800' : isFri ? '#00ffcc' : '#ffcc00';

  // ── UI builders ────────────────────────────────────────────────────────────
  function statCard(label, value, color, sub) {
    return `<div style="background:var(--bg3);border-top:2px solid ${color};border-radius:3px;padding:8px;text-align:center;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:3px;">${label}</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:15px;font-weight:bold;color:${color};">${value}</div>
      <div style="font-size:10px;color:var(--text3);margin-top:2px;">${sub}</div>
    </div>`;
  }

  function insightBar(color, text) {
    return `<div style="display:flex;gap:8px;padding:6px 10px;border-left:3px solid ${color};background:${color}11;border-radius:0 3px 3px 0;font-size:12px;color:var(--text2);line-height:1.5;">${text}</div>`;
  }

  function renderDayPanel(stats, label, color, showTodayContext) {
    if (!stats) return `<div style="color:var(--text3);font-size:12px;padding:8px;">No data for this lookback.</div>`;
    const wr    = stats.pctUp;
    const wrClr = clr(wr);
    const gapFillDisplay = showTodayContext && stats.todayGapFill !== null
      ? statCard('GAP FILL TODAY', stats.todayGapFill.toFixed(0)+'%', stats.todayGapFill>55?'#ff8800':'#00ff88', gapType.replace('_',' ')+' → fill rate')
      : stats.gapUpFill !== null
        ? statCard('GAP-UP FILL', stats.gapUpFill.toFixed(0)+'%', '#ff8800', 'same-day fill rate')
        : statCard('GAP TYPE', gapType.replace('_',' '), '#ffcc00', fmt2(Math.abs(gapPct))+'% gap today');

    const cards = `
      ${statCard('WIN RATE', wr.toFixed(0)+'%', wrClr, 'closes higher')}
      ${statCard('AVG RETURN', fmtPct(stats.avgRet,3), stats.avgRet>=0?'#00ff88':'#ff3355', 'prev close→close')}
      ${statCard('MED RETURN', fmtPct(stats.medRet,3), stats.medRet>=0?'#00ff88':'#ff3355', 'median (less skew)')}
      ${statCard('AVG RANGE', '$'+fmt2(stats.avgRange), 'var(--cyan)', 'H−L on expiry day')}
      ${statCard('AVG CLOSE POS', (stats.avgCP*100).toFixed(0)+'%', 'var(--text2)', '0%=LOD · 100%=HOD')}
      ${gapFillDisplay}
      ${statCard('CLOSE NEAR HOD', stats.closeHigh.toFixed(0)+'%', stats.closeHigh>50?'#00ff88':'#ff8800', 'closes top 30%')}
      ${statCard('BIG UP (>1%)', stats.bigUp.toFixed(0)+'%', '#00ff88', 'sessions >+1%')}
      ${statCard('BIG DN (<-1%)', stats.bigDn.toFixed(0)+'%', '#ff3355', 'sessions <-1%')}
      ${statCard('FLAT (±0.3%)', stats.flatDay.toFixed(0)+'%', '#ffcc00', 'pinned sessions')}
    `;
    const insights = [];
    insights.push(insightBar(wrClr,
      wr > 55 ? `<b>${label}</b> closes higher ${wr.toFixed(0)}% of the time — bullish lean. Avg gain: ${fmtPct(stats.avgRet,2)}.`
      : wr < 45 ? `<b>${label}</b> has a bearish lean — only ${wr.toFixed(0)}% close up. Avg loss: ${fmtPct(stats.avgRet,2)}.`
      : `<b>${label}</b> is near coin-flip (${wr.toFixed(0)}% up). No strong directional edge.`));
    insights.push(insightBar('var(--cyan)',
      `Avg range $${fmt2(stats.avgRange)}. Expect most movement inside that envelope. ` +
      `${stats.closeHigh.toFixed(0)}% close near HOD vs ${stats.closeLow.toFixed(0)}% near LOD — ` +
      (stats.closeHigh > stats.closeLow ? 'buyers tend to control into close.' : 'sellers tend to control into close.')));
    if (showTodayContext && stats.todayGapFill !== null)
      insights.push(insightBar(stats.todayGapFill>55?'#ff8800':'#00ff88',
        `Today's ${gapType.replace('_',' ')} gap fills same day ${stats.todayGapFill.toFixed(0)}% of the time on ${label}.`));
    else if (stats.gapUpFill !== null)
      insights.push(insightBar('#ff8800',
        `Gap-up opens fill same day ${stats.gapUpFill.toFixed(0)}% on ${label}. Gap-down fills: ${stats.gapDnFill!==null?stats.gapDnFill.toFixed(0)+'%':'n/a'}.`));
    if (label.includes('MONTHLY') || label.includes('OPEX'))
      insights.push(insightBar('#ff8800', `OPEX effect: dealers unwind hedges — expect elevated volatility and pin action near max pain. Watch for late-day mean reversion.`));
    insights.push(insightBar('#7878aa',
      `Range: best ${fmtPct(stats.best,2)}, worst ${fmtPct(stats.worst,2)}. Big moves (>1%) happen ${(stats.bigUp+stats.bigDn).toFixed(0)}% of sessions.`));

    return `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:8px;">${cards}</div>
    <div style="display:flex;flex-direction:column;gap:4px;">${insights.join('')}</div>
    <div style="font-size:10px;color:var(--text3);margin-top:6px;">n = ${stats.n} historical sessions · ${_expiryLookback==='2026'?'2026 only':'1993–2026 (all)'}</div>`;
  }

  // ── Per-day row in the week table ─────────────────────────────────────────
  function renderWeekRow(name, stats, color) {
    if (!stats) return '';
    const wr = stats.pctUp;
    const wrClr = clr(wr);
    const barW = Math.min(Math.round(Math.abs(stats.avgRet) / 0.5 * 80), 80);
    const barColor = stats.avgRet >= 0 ? '#00ff8880' : '#ff335580';
    return `<div style="display:grid;grid-template-columns:44px 90px 70px 80px 80px 80px 80px 44px;gap:0;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)22;">
      <div style="font-family:'Orbitron',monospace;font-size:10px;color:${color};padding:0 6px;">${name}</div>
      <div style="display:flex;align-items:center;gap:4px;padding:0 6px;">
        <div style="width:${barW}px;height:8px;background:${barColor};border-radius:2px;flex-shrink:0;min-width:2px;"></div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${stats.avgRet>=0?'#00ff88':'#ff3355'};white-space:nowrap;">${fmtPct(stats.avgRet,2)}</div>
      </div>
      <div style="text-align:center;padding:0 4px;">
        <div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${wrClr};">${wr.toFixed(0)}%</div>
        <div style="font-size:9px;color:var(--text3);">win rate</div>
      </div>
      <div style="text-align:center;padding:0 4px;">
        <div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--cyan);">$${fmt2(stats.avgRange)}</div>
        <div style="font-size:9px;color:var(--text3);">range</div>
      </div>
      <div style="text-align:center;padding:0 4px;">
        <div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${stats.medRet>=0?'#00ff88':'#ff3355'};">${fmtPct(stats.medRet,2)}</div>
        <div style="font-size:9px;color:var(--text3);">median</div>
      </div>
      <div style="text-align:center;padding:0 4px;">
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:#00ff88;">${stats.bigUp.toFixed(0)}%</div>
        <div style="font-size:9px;color:var(--text3);">big up</div>
      </div>
      <div style="text-align:center;padding:0 4px;">
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:#ff3355;">${stats.bigDn.toFixed(0)}%</div>
        <div style="font-size:9px;color:var(--text3);">big dn</div>
      </div>
      <div style="text-align:center;padding:0 4px;">
        <div style="font-size:9px;color:var(--text3);">n=${stats.n}</div>
      </div>
    </div>`;
  }

  function renderWeekBlock(weekStats, heading, subheading, color, weeklySummaryNote) {
    if (!weekStats || !weekStats.days.length) return '';
    const { days, weekAvg, weekWR, weekN, weekBest, weekWorst } = weekStats;
    const weekColor = weekAvg >= 0 ? '#00ff88' : '#ff3355';

    return `
    <div style="margin-bottom:14px;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;color:${color};letter-spacing:1px;margin-bottom:2px;">${heading}</div>
      ${subheading ? `<div style="font-size:10px;color:var(--text3);margin-bottom:8px;">${subheading}</div>` : ''}

      <!-- Week summary KPIs -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px;">
        ${statCard('WEEK WIN RATE', weekWR.toFixed(0)+'%', clr(weekWR), 'Mon open → Fri close')}
        ${statCard('AVG WEEK RETURN', fmtPct(weekAvg,2), weekAvg>=0?'#00ff88':'#ff3355', 'Mon open → Fri close')}
        ${statCard('BEST WEEK', fmtPct(weekBest,2), '#00ff88', 'of '+weekN+' periods')}
        ${statCard('WORST WEEK', fmtPct(weekWorst,2), '#ff3355', 'of '+weekN+' periods')}
      </div>

      <!-- Header row -->
      <div style="display:grid;grid-template-columns:44px 90px 70px 80px 80px 80px 80px 44px;gap:0;padding:4px 0;border-bottom:2px solid rgba(255,255,255,0.1);margin-bottom:2px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);padding:0 6px;letter-spacing:1px;">DAY</div>
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);padding:0 6px;letter-spacing:1px;">AVG RET</div>
        <div style="text-align:center;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);padding:0 4px;letter-spacing:1px;">WIN %</div>
        <div style="text-align:center;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);padding:0 4px;letter-spacing:1px;">RANGE</div>
        <div style="text-align:center;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);padding:0 4px;letter-spacing:1px;">MEDIAN</div>
        <div style="text-align:center;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);padding:0 4px;letter-spacing:1px;">BIG UP</div>
        <div style="text-align:center;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);padding:0 4px;letter-spacing:1px;">BIG DN</div>
        <div style="text-align:center;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);padding:0 4px;letter-spacing:1px;">N</div>
      </div>
      ${days.map(({name, stats}) => renderWeekRow(name, stats, color)).join('')}
      ${weeklySummaryNote ? `<div style="font-size:10px;color:var(--text3);margin-top:4px;">${weeklySummaryNote}</div>` : ''}
    </div>`;
  }

  // ── Section divider ────────────────────────────────────────────────────────
  function sectionHeader(title, n, color, icon) {
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid ${color}33;">
      <div style="font-family:'Orbitron',monospace;font-size:11px;color:${color};letter-spacing:1px;">${icon} ${title}</div>
      <div style="font-size:10px;color:var(--text3);">${n} sessions</div>
    </div>`;
  }

  // ── Max pain box ───────────────────────────────────────────────────────────
  const maxPainBox = nearest ? `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;">
      <div style="background:var(--bg3);border:1px solid ${mpColor}44;border-radius:4px;padding:8px 14px;text-align:center;min-width:110px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">MAX PAIN</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:20px;color:${mpColor};">$${fmt2(nearest.max_pain)}</div>
        <div style="font-size:10px;color:${mpColor};">${mpDist>=0?'+':''}${fmt2(mpDist)} from spot</div>
      </div>
      <div style="font-size:12px;color:var(--text2);line-height:1.5;">
        ${Math.abs(mpDist||0)<2?'<span style="color:#00ff88">● AT MAX PAIN</span> — high pin risk into close.'
         :Math.abs(mpDist||0)<5?'<span style="color:#ffcc00">● NEAR MAX PAIN</span> — gravitational pull possible.'
         :'<span style="color:#ff8800">● FAR FROM MAX PAIN</span> — less pin risk; directional move more likely.'}
      </div>
    </div>` : '';

  // ── ASSEMBLE ──────────────────────────────────────────────────────────────
  el.innerHTML = `
  <div style="padding:4px 0 8px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:6px;">
      <div style="font-family:'Orbitron',monospace;font-size:10px;color:var(--text3);letter-spacing:1px;">⬡ EXPIRY BEHAVIOR — HISTORICAL STATS FOR TODAY'S SESSION TYPE</div>
      <div style="display:flex;gap:5px;">
        <button class="exp-lb-btn${_expiryLookback==='all'?' active':''}" onclick="expirySetLookback('all',this)">1993–2026</button>
        <button class="exp-lb-btn${_expiryLookback==='2026'?' active':''}" onclick="expirySetLookback('2026',this)">2026 ONLY</button>
      </div>
    </div>

    ${maxPainBox}

    <!-- ══ TODAY panel ═══════════════════════════════════════════════════════ -->
    <div style="margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <div style="font-family:'Orbitron',monospace;font-size:10px;color:${todayColor};letter-spacing:1px;">TODAY — ${todayLabel}</div>
        ${isWeekend?'<span style="font-size:10px;color:var(--text3);">(market closed — Monday preview)</span>':''}
      </div>
      ${renderDayPanel(todayStats, todayLabel, todayColor, true)}
    </div>

    <!-- ══ WEEKLY OPEX ════════════════════════════════════════════════════════ -->
    <div style="margin-bottom:24px;border-top:2px solid #00ffcc33;padding-top:16px;">
      ${sectionHeader('WEEKLY OPEX — ALL FRIDAYS (NON-MONTHLY)', weeklyStats?.n||0, '#00ffcc', '⚡')}

      <div style="font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:14px;padding:10px;background:#00ffcc08;border-radius:4px;border-left:3px solid #00ffcc33;">
        Weekly OPEX runs <strong style="color:#00ffcc;">Mon–Fri</strong> with pins and unwinding building throughout the week.
        The table below shows how each day of an opex week trades historically — Mon open through Fri close.
      </div>

      <!-- Full opex week day-by-day -->
      ${renderWeekBlock(
        weeklyDayStats,
        'OPEX WEEK — EACH DAY\'S STATS (ALL ${weeklyFridays.length} OPEX WEEKS)',
        'Mon open price through Fri close price for each opex week',
        '#00ffcc',
        `n = ${weeklyDayStats.weekN} complete opex weeks · ${_expiryLookback==='2026'?'2026 only':'1993–2026'}`
      )}

      <!-- Friday expiry day stats -->
      <div style="border-top:1px solid var(--border)33;padding-top:12px;margin-top:4px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:#00ffcc99;letter-spacing:1px;margin-bottom:8px;">
          FRIDAY EXPIRY DAY — THE DAY OF EXPIRATION ITSELF
        </div>
        ${renderDayPanel(weeklyStats, 'WEEKLY OPEX (FRI)', '#00ffcc', false)}
      </div>
    </div>

    <!-- ══ MONTHLY OPEX ════════════════════════════════════════════════════════ -->
    <div style="margin-bottom:8px;border-top:2px solid #ff880033;padding-top:16px;">
      ${sectionHeader('MONTHLY OPEX — 3RD FRIDAY', monthlyStats?.n||0, '#ff8800', '📅')}

      <div style="font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:14px;padding:10px;background:#ff880008;border-radius:4px;border-left:3px solid #ff880033;">
        Monthly OPEX has a multi-week setup. Dealer hedging and positioning builds 2+ weeks in advance.
        The sections below show how SPY trades in the <strong style="color:#ff8800;">2 weeks leading up to OPEX</strong>,
        the <strong style="color:#ff8800;">opex week itself</strong>, and the <strong style="color:#ff8800;">Friday expiration day</strong>.
      </div>

      <!-- Timeline indicator -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;margin-bottom:16px;">
        ${[
          {label:'T−2', sub:'2 WEEKS OUT', color:'#ff880044', border:'#ff880066'},
          {label:'T−1', sub:'WEEK BEFORE', color:'#ff880066', border:'#ff880099'},
          {label:'T', sub:'OPEX WEEK', color:'#ff8800aa', border:'#ff8800'},
        ].map(x => `<div style="text-align:center;padding:6px;background:${x.color};border:1px solid ${x.border};border-radius:3px;">
          <div style="font-family:'Orbitron',monospace;font-size:11px;color:#ff8800;">${x.label}</div>
          <div style="font-size:9px;color:var(--text3);">${x.sub}</div>
        </div>`).join('<div style="display:flex;align-items:center;justify-content:center;font-size:16px;color:#ff880066;">→</div>')}
      </div>

      <!-- T-2: Two weeks before opex -->
      ${renderWeekBlock(
        monthlyT2,
        'T−2 · TWO WEEKS BEFORE MONTHLY OPEX',
        'Historical behavior of the week 2 weeks prior to the monthly expiration Friday',
        '#ff880088',
        `n = ${monthlyT2.weekN} complete periods · ${_expiryLookback==='2026'?'2026 only':'1993–2026'}`
      )}

      <!-- T-1: Week before opex -->
      ${renderWeekBlock(
        monthlyT1,
        'T−1 · WEEK BEFORE MONTHLY OPEX',
        'Historical behavior of the week immediately before the monthly expiration week',
        '#ff8800bb',
        `n = ${monthlyT1.weekN} complete periods · ${_expiryLookback==='2026'?'2026 only':'1993–2026'}`
      )}

      <!-- T: Opex week -->
      ${renderWeekBlock(
        monthlyT0,
        'T · MONTHLY OPEX WEEK (MON OPEN → FRI CLOSE)',
        'The expiration week itself — dealer unwind, pin risk, and elevated volatility',
        '#ff8800',
        `n = ${monthlyT0.weekN} complete opex weeks · ${_expiryLookback==='2026'?'2026 only':'1993–2026'}`
      )}

      <!-- Friday expiry day stats -->
      <div style="border-top:1px solid var(--border)33;padding-top:12px;margin-top:4px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:#ff880099;letter-spacing:1px;margin-bottom:8px;">
          MONTHLY OPEX FRIDAY — THE DAY OF EXPIRATION ITSELF
        </div>
        ${renderDayPanel(monthlyStats, 'MONTHLY OPEX', '#ff8800', false)}
      </div>
    </div>
  </div>`;

  if (!document.getElementById('expiry-btn-style')) {
    const s = document.createElement('style');
    s.id = 'expiry-btn-style';
    s.textContent = `.exp-lb-btn{font-family:'Orbitron',monospace;font-size:9px;padding:4px 10px;border:1px solid #444;background:var(--bg3);color:var(--text3);border-radius:3px;cursor:pointer;letter-spacing:1px;transition:all .15s;}
    .exp-lb-btn.active,.exp-lb-btn:hover{border-color:var(--cyan);color:var(--cyan);background:#00ccff18;}`;
    document.head.appendChild(s);
  }
}



// ─── MAG 7 EARNINGS SPY ANALYSIS ─────────────────────────────────────────────
let _mag7Lookback = 'all';

window.mag7SetLookback = function(lb, btn) {
  _mag7Lookback = lb;
  document.querySelectorAll('.mag7-lb-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderMag7();
};

window._mag7ActiveCompany = null;
window.mag7FilterCompany = function(co, btn) {
  _mag7ActiveCompany = _mag7ActiveCompany === co ? null : co;
  document.querySelectorAll('#mag7CompanyFilters button').forEach(b => b.classList.remove('active'));
  if(_mag7ActiveCompany && btn) btn.classList.add('active');
  _mag7RenderCompanyTable();
};

function renderMag7() {
  if(typeof MAG7_EARNINGS_DATA === 'undefined') return;
  const D = MAG7_EARNINGS_DATA;
  const allResults = D.results;

  // Sync button active states to current lookback value
  document.querySelectorAll('.mag7-lb-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById(
    _mag7Lookback === 'r2023' ? 'mag7lb-r2023' :
    _mag7Lookback === 'r2026' ? 'mag7lb-r2026' : 'mag7lb-all'
  );
  if(activeBtn) activeBtn.classList.add('active');

  // Filter by lookback
  let results;
  if(_mag7Lookback === 'r2023') results = allResults.filter(r => r.year >= 2023);
  else if(_mag7Lookback === 'r2026') results = allResults.filter(r => r.year >= 2026);
  else results = allResults;

  const n = results.length;
  const avg = key => { const v=results.map(r=>r[key]).filter(x=>x!=null); return v.length?v.reduce((a,b)=>a+b,0)/v.length:0; };
  const pctUp = key => { const v=results.map(r=>r[key]).filter(x=>x!=null); return v.length?v.filter(x=>x>0).length/v.length*100:0; };
  const clr = v => v > 0 ? '#00ff88' : v < 0 ? '#ff3355' : 'var(--text2)';
  const fmt2 = v => v != null ? (v>=0?'+':'')+v.toFixed(2)+'%' : '—';

  // ── Stat cards ──────────────────────────────────────────────────────────────
  const cardsEl = $('mag7Cards');
  if(cardsEl) {
    const windows = [
      {l:'5D PRE-EARNINGS', k:'pre5_ret', c:'#ffcc00', note:'5td before first earnings'},
      {l:'3D PRE-EARNINGS', k:'pre3_ret', c:'#ffcc00', note:'Strongest signal window'},
      {l:'DURING CLUSTER',  k:'during_ret', c:'var(--cyan)', note:'First → last earnings day'},
      {l:'3D POST-EARNINGS',k:'post3_ret', c:'#8855ff', note:'3td after last earnings'},
      {l:'5D POST-EARNINGS',k:'post5_ret', c:'#8855ff', note:'5td after last earnings'},
      {l:'FULL WINDOW',     k:'full_ret',  c:'#00ff88', note:'Pre5 through Post5'},
    ];
    cardsEl.innerHTML = `<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;">
      ${windows.map(w => {
        const a = avg(w.k), u = pctUp(w.k);
        const uc = u >= 65 ? '#00ff88' : u >= 50 ? '#ffcc00' : '#ff3355';
        return `<div class="panel" style="text-align:center;border-top:3px solid ${w.c};padding:10px;">
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:5px;">${w.l}</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:20px;font-weight:bold;color:${clr(a)};">${a>=0?'+':''}${a.toFixed(2)}%</div>
          <div style="font-size:10px;color:${uc};margin-top:3px;">${u.toFixed(0)}% up · n=${n}</div>
          <div style="font-size:9px;color:var(--text3);margin-top:2px;">${w.note}</div>
        </div>`;
      }).join('')}
    </div>`;
  }

  // ── Window bar chart ────────────────────────────────────────────────────────
  const wcEl = $('mag7WindowChart');
  if(wcEl) {
    const bars = [
      {l:'5d Pre',  v:avg('pre5_ret'),   c:'#ffcc00'},
      {l:'3d Pre',  v:avg('pre3_ret'),   c:'#ffcc00'},
      {l:'During',  v:avg('during_ret'), c:'#00ccff'},
      {l:'3d Post', v:avg('post3_ret'),  c:'#8855ff'},
      {l:'5d Post', v:avg('post5_ret'),  c:'#8855ff'},
      {l:'Full',    v:avg('full_ret'),   c:'#00ff88'},
    ];
    const maxAbs = Math.max(...bars.map(b=>Math.abs(b.v)), 0.5);
    const M7_BAR_H = 90;
    wcEl.innerHTML = `<div style="display:flex;gap:8px;align-items:flex-end;justify-content:space-around;height:${M7_BAR_H+40}px;padding:8px 4px 4px;">
      ${bars.map(b => {
        const h = Math.max(Math.abs(b.v)/maxAbs*M7_BAR_H, 4);
        const col = clr(b.v);
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:1;height:100%;justify-content:flex-end;">
          <div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${col};font-weight:bold;">${b.v>=0?'+':''}${b.v.toFixed(2)}%</div>
          <div style="width:70%;height:${h.toFixed(0)}px;background:${b.c}99;border-radius:${b.v>=0?'4px 4px 0 0':'0 0 4px 4px'};"></div>
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">${b.l}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="font-size:10px;color:var(--text3);text-align:center;margin-top:4px;">avg SPY return per window · ${n} quarters</div>`;
  }

  // ── Pre-earnings drift scatter ───────────────────────────────────────────────
  const pcEl = $('mag7PreChart');
  if(pcEl) {
    const vals = results.map(r => r.pre3_ret).filter(x=>x!=null);
    const buckets = [{l:'<-2%',min:-99,max:-2},{l:'-2 to -1',min:-2,max:-1},{l:'-1 to 0',min:-1,max:0},{l:'0 to +1',min:0,max:1},{l:'+1 to +2',min:1,max:2},{l:'>+2%',min:2,max:99}];
    const counts = buckets.map(b=>vals.filter(v=>v>=b.min&&v<b.max).length);
    const maxC = Math.max(...counts,1);
    const M7_PRE_BAR_H = 90;
    pcEl.innerHTML = `
      <div style="display:flex;gap:8px;align-items:flex-end;height:${M7_PRE_BAR_H+28}px;padding:4px 4px 0;">
        ${buckets.map((b,i)=>{
          const c=counts[i], h=c?Math.max(Math.round(c/maxC*M7_PRE_BAR_H),4):0;
          const bc = b.min>=0?'#00ff8899':'#ff335599';
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;height:100%;">
            <div style="font-size:9px;color:rgba(255,255,255,0.6);">${c||''}</div>
            <div style="width:100%;height:${h}px;background:${bc};border-radius:2px 2px 0 0;"></div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:8px;padding:2px 4px;">
        ${buckets.map(b=>`<div style="flex:1;text-align:center;font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--text3);">${b.l}</div>`).join('')}
      </div>
      <div style="text-align:center;font-size:10px;color:var(--text3);margin-top:6px;">3-day pre-earnings SPY return distribution · ${pctUp('pre3_ret').toFixed(0)}% positive · avg ${avg('pre3_ret')>=0?'+':''}${avg('pre3_ret').toFixed(2)}%</div>`;
  }

  // ── Quarter table ───────────────────────────────────────────────────────────
  const tbody = $('mag7TableBody');
  if(tbody) {
    tbody.innerHTML = [...results].reverse().map(r => {
      const c = v => v==null?'var(--text3)':v>0?'#00ff88':v<0?'#ff3355':'var(--text2)';
      return `<tr style="border-bottom:1px solid var(--border)22;">
        <td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--cyan);font-weight:bold;">${r.label}</td>
        <td style="padding:5px 8px;font-size:10px;color:var(--text3);">${r.first_date} → ${r.last_date} (${r.span_td}td)</td>
        <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:12px;color:${c(r.pre5_ret)};">${fmt2(r.pre5_ret)}</td>
        <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:12px;font-weight:bold;color:${c(r.pre3_ret)};">${fmt2(r.pre3_ret)}</td>
        <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:12px;color:${c(r.during_ret)};">${fmt2(r.during_ret)}</td>
        <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:12px;color:${c(r.post3_ret)};">${fmt2(r.post3_ret)}</td>
        <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:12px;color:${c(r.post5_ret)};">${fmt2(r.post5_ret)}</td>
        <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:13px;font-weight:bold;color:${c(r.full_ret)};">${fmt2(r.full_ret)}</td>
      </tr>`;
    }).join('');
  }

  // ── Company filter buttons ──────────────────────────────────────────────────
  const filterEl = $('mag7CompanyFilters');
  if(filterEl) {
    const companies = ['AAPL','MSFT','AMZN','GOOGL','META','TSLA','NVDA'];
    const colors    = {'AAPL':'#aaaaaa','MSFT':'#00a4ef','AMZN':'#ff9900','GOOGL':'#4285f4','META':'#0668e1','TSLA':'#e31937','NVDA':'#76b900'};
    filterEl.innerHTML = '<span style="font-family:\'Orbitron\',monospace;font-size:9px;color:var(--text3);">FILTER BY:</span>' +
      companies.map(t => `<button onclick="mag7FilterCompany('${t}',this)"
        style="font-family:'Orbitron',monospace;font-size:9px;padding:4px 10px;
               background:${colors[t]}22;border:1px solid ${colors[t]}88;
               color:${colors[t]};border-radius:3px;cursor:pointer;">
        ${t}
      </button>`).join('') +
      '<button onclick="mag7FilterCompany(null,null)" style="font-family:\'Orbitron\',monospace;font-size:9px;padding:4px 10px;background:var(--bg3);border:1px solid var(--border);color:var(--text2);border-radius:3px;cursor:pointer;">ALL</button>';
  }

  window._mag7Results = results;
  _mag7RenderCompanyTable();
}

function _mag7RenderCompanyTable() {
  const results = window._mag7Results || [];
  const tbody = $('mag7CompanyBody');
  if(!tbody) return;
  const clr = v => v==null?'var(--text3)':v>0?'#00ff88':v<0?'#ff3355':'var(--text2)';
  const fmt2 = v => v!=null?(v>=0?'+':'')+v.toFixed(3)+'%':'—';
  const colors = {'AAPL':'#aaaaaa','MSFT':'#00a4ef','AMZN':'#ff9900','GOOGL':'#4285f4','META':'#0668e1','TSLA':'#e31937','NVDA':'#76b900'};
  const co = window._mag7ActiveCompany;

  // Flatten all company_stats
  const rows = [];
  results.forEach(r => {
    r.company_stats.forEach(cs => {
      if(!co || cs.ticker === co) rows.push({...cs, quarter: r.label});
    });
  });
  rows.sort((a,b) => b.date.localeCompare(a.date));

  tbody.innerHTML = rows.map(s => {
    const tc = colors[s.ticker] || 'var(--text2)';
    return `<tr style="border-bottom:1px solid var(--border)22;">
      <td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text3);">${s.date}</td>
      <td style="padding:5px 8px;">
        <span style="font-family:'Orbitron',monospace;font-size:9px;color:${tc};padding:2px 6px;background:${tc}22;border-radius:2px;">${s.ticker}</span>
        <span style="font-size:10px;color:var(--text3);margin-left:4px;">${s.quarter}</span>
      </td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);">$${(s.open||0).toFixed(2)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:${clr(s.day_ret)};">$${(s.close||0).toFixed(2)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:${clr(s.gap)};">${fmt2(s.gap)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:12px;font-weight:bold;color:${clr(s.day_ret)};">${fmt2(s.day_ret)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--cyan);">$${(s.range||0).toFixed(2)}</td>
    </tr>`;
  }).join('');
}

// ─── HUB EVENT INSIGHT ───────────────────────────────────────────────────────
// Picks the most relevant upcoming event and renders a data-driven paragraph.
// Uses RELEASE_DATA + MAG7_EARNINGS_DATA already loaded on the page.
// Rotates through events automatically — stays accurate without manual updates.

function renderHubEventInsight() {
  const el = $('hubEventInsightContent');
  if(!el) return;

  const today = new Date().toISOString().slice(0,10);

  // ── Collect all upcoming events ──────────────────────────────────────────
  const events = [];

  if(typeof RELEASE_DATA !== 'undefined') {
    const upcoming = RELEASE_DATA.upcoming || {};
    (upcoming.cpi  ||[]).forEach(d => events.push({type:'cpi',  date:d}));
    (upcoming.nfp  ||[]).forEach(d => events.push({type:'nfp',  date:d}));
    (upcoming.fomc ||[]).forEach(d => events.push({type:'fomc', date:d}));
  }

  const mag7Windows = [
    {type:'mag7', date:'2026-04-23', label:'Q1 2026 MAG7 Earnings'},
    {type:'mag7', date:'2026-07-22', label:'Q2 2026 MAG7 Earnings'},
    {type:'mag7', date:'2026-10-21', label:'Q3 2026 MAG7 Earnings'},
  ];
  mag7Windows.filter(e => e.date >= today).forEach(e => events.push(e));

  // Sort by date, filter to future only (strictly future - not today or past)
  const future = events.filter(e => e.date > today).sort((a,b) => a.date.localeCompare(b.date));

  if(!future.length) {
    el.innerHTML = '<span style="color:var(--text3);">No upcoming events in dataset.</span>';
    return;
  }

  const next = future[0];
  const daysAway = Math.ceil((new Date(next.date+'T12:00:00') - new Date()) / (1000*60*60*24));

  // Show loading state while AI generates
  const typeColors = {cpi:'#ff8800', nfp:'#00ccff', fomc:'#8855ff', mag7:'#00ff88'};
  const typeLabels = {cpi:'CPI', nfp:'NFP', fomc:'FOMC', mag7:'MAG7'};
  const color = typeColors[next.type] || 'var(--cyan)';
  const label = typeLabels[next.type] || next.type.toUpperCase();

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
      <span style="font-family:'Orbitron',monospace;font-size:10px;color:${color};padding:3px 8px;background:${color}22;border:1px solid ${color}44;border-radius:3px;">${label}</span>
      <span style="color:var(--text3);font-size:11px;">${next.date} · ${daysAway} day${daysAway===1?'':'s'} away</span>
    </div>
    <div style="color:var(--text3);font-size:12px;font-style:italic;">Generating insight...</div>`;

  // Build stats context from RELEASE_DATA
  let statsContext = '';
  if(typeof RELEASE_DATA !== 'undefined') {
    const rd = RELEASE_DATA[next.type] || [];
    if(rd.length) {
      const last5 = rd.slice(-5);
      const avgRange = (rd.reduce((a,d)=>a+d.range,0)/rd.length).toFixed(2);
      const pctUp = (rd.filter(d=>d.day_ret>0).length/rd.length*100).toFixed(0);
      const last5up = last5.filter(d=>d.day_ret>0).length;
      const avgBefore = (rd.reduce((a,d)=>a+(d.before_ret||0),0)/rd.length).toFixed(2);
      const avgAfter  = (rd.reduce((a,d)=>a+(d.after_ret||0),0)/rd.length).toFixed(2);
      const bigMoves  = (rd.filter(d=>Math.abs(d.day_ret)>1).length/rd.length*100).toFixed(0);
      const last5Dates = last5.map(d=>`${d.date}: ${d.day_ret>=0?'+':''}${d.day_ret.toFixed(2)}% (range $${d.range.toFixed(2)})`).join(', ');
      statsContext = `Historical SPY stats for ${label} (${rd.length} events since 2020): avg day range $${avgRange}, closed up ${pctUp}% of the time, avg 5-day pre-event return ${avgBefore}%, avg 5-day post-event return ${avgAfter}%, ${bigMoves}% of events produced >1% SPY move. Last 5: ${last5Dates}. Last 5: ${last5up}/5 up.`;
    }
  }

  // Queue of next events after this one
  const queue = future.slice(1, 4);
  const queueHtml = queue.length ? `
    <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border);display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <span style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">ALSO AHEAD:</span>
      ${queue.map(e => {
        const d = Math.ceil((new Date(e.date+'T12:00:00') - new Date()) / (1000*60*60*24));
        const c = typeColors[e.type] || 'var(--cyan)';
        const l = typeLabels[e.type] || e.type.toUpperCase();
        return `<div style="display:flex;align-items:center;gap:4px;padding:3px 8px;background:${c}11;border:1px solid ${c}33;border-radius:3px;">
          <span style="font-family:'Orbitron',monospace;font-size:8px;color:${c};">${l}</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text3);">${e.date}</span>
          <span style="font-size:9px;color:var(--text3);">${d}d</span>
        </div>`;
      }).join('')}
    </div>` : '';

  // Call AI with web search to generate the insight
  const system = `You are a sharp SPY trader writing a brief market event preview for a live trading dashboard. Be specific, direct, and use real numbers. No disclaimers. No hedging language. Write 2-3 tight paragraphs in plain prose — no bullets, no headers. Focus on: what the consensus expectation is, what SPY historically does around this event, and what the key risk or opportunity is right now given current market conditions. Use the historical stats provided.`;

  const userMsg = `Write a focused preview for the upcoming ${label} release on ${next.date} (${daysAway} days away). Search for the current consensus estimate and any recent data or analyst expectations. ${statsContext} Current SPY price is around $${window._md?.quotes?.SPY?.price?.toFixed(2) || '655'}. Mention the specific consensus number if you can find it, what a beat or miss would mean for SPY right now, and what the historical stats tell us about positioning.`;

  if(typeof callAI === 'function') {
    callAI([{role:'user', content: userMsg}], system, 500).then(reply => {
      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <span style="font-family:'Orbitron',monospace;font-size:10px;color:${color};padding:3px 8px;background:${color}22;border:1px solid ${color}44;border-radius:3px;">${label}</span>
          <span style="color:var(--text3);font-size:11px;">${next.date} · ${daysAway} day${daysAway===1?'':'s'} away</span>
          <span style="font-size:9px;color:var(--text3);margin-left:auto;">AI · web search</span>
        </div>
        <div style="font-size:12px;color:var(--text2);line-height:1.7;">${reply.replace(/\n\n/g,'</p><p style=\"margin:0 0 8px;\">').replace(/\n/g,' ')}</div>
        ${queueHtml}`;
    }).catch(() => {
      // Fallback: show static stats if AI fails
      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <span style="font-family:'Orbitron',monospace;font-size:10px;color:${color};padding:3px 8px;background:${color}22;border:1px solid ${color}44;border-radius:3px;">${label}</span>
          <span style="color:var(--text3);font-size:11px;">${next.date} · ${daysAway} day${daysAway===1?'':'s'} away</span>
        </div>
        <div style="font-size:12px;color:var(--text2);line-height:1.7;">${statsContext || 'No historical data available.'}</div>
        ${queueHtml}`;
    });
  } else {
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="font-family:'Orbitron',monospace;font-size:10px;color:${color};padding:3px 8px;background:${color}22;border:1px solid ${color}44;border-radius:3px;">${label}</span>
        <span style="color:var(--text3);font-size:11px;">${next.date} · ${daysAway} day${daysAway===1?'':'s'} away</span>
      </div>
      <div style="font-size:12px;color:var(--text2);line-height:1.7;">${statsContext}</div>
      ${queueHtml}`;
  }
}
// ─── DECLINE STATS ────────────────────────────────────────────────────────────
function renderDeclines() {
  if(typeof DECLINE_DATA === 'undefined') return;
  const D = DECLINE_DATA;
  const agg = D.aggregate;

  // Header
  const totalEl = $('decl-total-events');
  const rangeEl = $('decl-date-range');
  if(totalEl) totalEl.textContent = D.total_events_2pct;
  if(rangeEl) rangeEl.textContent = D.date_range.start + ' → ' + D.date_range.end;

  const LEVELS = [2,5,10,15,20,25,30];
  const LEVEL_COLORS = {2:'#aaaaaa',5:'#ffcc00',10:'#ff8800',15:'#ff5500',20:'#ff3355',25:'#cc2244',30:'#991133'};
  const clr = l => LEVEL_COLORS[l] || '#888888';

  // ── Frequency cards ──────────────────────────────────────────────────────
  const freqEl = $('decl-freq-cards');
  if(freqEl) {
    freqEl.innerHTML = LEVELS.map(l => {
      const a = agg[String(l)];
      if(!a) return '';
      const yearsOfData = 33;
      const perYear = (a.n / yearsOfData).toFixed(1);
      return `<div class="panel" style="text-align:center;border-top:3px solid ${clr(l)};padding:10px 6px;">
        <div style="font-family:'Orbitron',monospace;font-size:22px;font-weight:bold;color:${clr(l)};margin-bottom:2px;">${l}%+</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:28px;font-weight:bold;color:var(--text);">${a.n}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px;">times since 1993</div>
        <div style="font-size:11px;color:${clr(l)};margin-top:4px;font-weight:bold;">${perYear}× per year</div>
      </div>`;
    }).join('');
  }

  // ── Conditional probability table ────────────────────────────────────────
  const condEl = $('decl-cond-table');
  if(condEl) {
    const th = s => `<th style="padding:8px 12px;text-align:center;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);border-bottom:1px solid var(--border);white-space:nowrap;">${s}</th>`;
    const thL = s => `<th style="padding:8px 12px;text-align:left;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);border-bottom:1px solid var(--border);">${s}</th>`;

    const targets = [5,10,15,20,25,30];
    condEl.innerHTML = `<thead><tr>
      ${thL('IF DECLINE REACHES...')}
      ${thL('SAMPLE SIZE')}
      ${targets.map(t=>`<th style="padding:8px 12px;text-align:center;font-family:'Orbitron',monospace;font-size:9px;color:${clr(t)};border-bottom:1px solid var(--border);">→ ${t}%</th>`).join('')}
    </tr></thead><tbody>${
      [2,5,10,15,20].map(base => {
        const a = agg[String(base)];
        if(!a) return '';
        const condKeys = {5:'cond_to_5',10:'cond_to_10',15:'cond_to_15',20:'cond_to_20',25:'cond_to_25',30:'cond_to_30'};
        return `<tr style="border-bottom:1px solid var(--border)22;">
          <td style="padding:8px 12px;font-family:'Orbitron',monospace;font-size:11px;color:${clr(base)};font-weight:bold;">${base}%+ DECLINE</td>
          <td style="padding:8px 12px;font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--text2);text-align:center;">${a.n} events</td>
          ${targets.map(t => {
            if(t <= base) return `<td style="padding:8px 12px;text-align:center;color:var(--border2);">—</td>`;
            const key = `cond_to_${t}`;
            const val = a[key];
            if(val == null) return `<td style="padding:8px 12px;text-align:center;color:var(--border2);">—</td>`;
            const bg = val >= 50 ? '#ff333522' : val >= 25 ? '#ff880022' : val >= 10 ? '#ffcc0022' : 'transparent';
            const tc = val >= 50 ? '#ff3355' : val >= 25 ? '#ff8800' : val >= 10 ? '#ffcc00' : 'var(--text3)';
            return `<td style="padding:8px 12px;text-align:center;background:${bg};border-radius:3px;">
              <span style="font-family:'Share Tech Mono',monospace;font-size:15px;font-weight:bold;color:${tc};">${val.toFixed(1)}%</span>
            </td>`;
          }).join('')}
        </tr>`;
      }).join('')
    }</tbody>`;
  }

  // ── Duration table ───────────────────────────────────────────────────────
  const durEl = $('decl-dur-table');
  if(durEl) {
    const th = (s,c='var(--text3)') => `<th style="padding:8px 12px;font-family:'Orbitron',monospace;font-size:8px;color:${c};border-bottom:1px solid var(--border);text-align:right;white-space:nowrap;">${s}</th>`;
    durEl.innerHTML = `<thead><tr>
      <th style="padding:8px 12px;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);border-bottom:1px solid var(--border);text-align:left;">DECLINE LEVEL</th>
      <th style="padding:8px 12px;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);border-bottom:1px solid var(--border);text-align:center;">EVENTS</th>
      ${th('AVG DAYS → TROUGH')} ${th('MAX DAYS → TROUGH')}
      ${th('AVG DAYS TROUGH → RECOVERY','#00ff88')} ${th('MAX','#00ff88')}
      ${th('AVG TOTAL DURATION','var(--cyan)')} ${th('MAX','var(--cyan)')}
      ${th('% FULLY RECOVERED','#00ff88')}
    </tr></thead><tbody>${
      [2,5,10,15,20,25,30].map(l => {
        const a = agg[String(l)];
        if(!a) return '';
        const f = v => v != null ? v.toLocaleString() : '—';
        const calDays = td => td != null ? `${td}td <span style="color:var(--text3);font-size:10px;">(~${Math.round(td*365/252)}cd)</span>` : '—';
        return `<tr style="border-bottom:1px solid var(--border)22;">
          <td style="padding:7px 12px;font-family:'Orbitron',monospace;font-size:11px;color:${clr(l)};font-weight:bold;">${l}%+</td>
          <td style="padding:7px 12px;text-align:center;font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--text2);">${a.n}</td>
          <td style="padding:7px 12px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:12px;">${a.avg_days_to_trough}td</td>
          <td style="padding:7px 12px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--text3);">${f(a.max_days_to_trough)}td</td>
          <td style="padding:7px 12px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:12px;color:#00ff88;">${a.avg_recovery_td != null ? a.avg_recovery_td+'td' : '—'}</td>
          <td style="padding:7px 12px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--text3);">${a.max_recovery_td != null ? a.max_recovery_td+'td' : '—'}</td>
          <td style="padding:7px 12px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--cyan);">${a.avg_total_td != null ? a.avg_total_td+'td' : '—'}</td>
          <td style="padding:7px 12px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--text3);">${a.max_total_td != null ? a.max_total_td+'td' : '—'}</td>
          <td style="padding:7px 12px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:12px;color:${a.pct_recovered===100?'#00ff88':'#ffcc00'};">${a.pct_recovered}%</td>
        </tr>`;
      }).join('')
    }</tbody>`;
  }

  // ── Depth distribution chart ─────────────────────────────────────────────
  const depthEl = $('decl-depth-chart');
  if(depthEl) {
    const buckets = [
      {l:'2–5%',   min:2,  max:5,  c:'#aaaaaa'},
      {l:'5–10%',  min:5,  max:10, c:'#ffcc00'},
      {l:'10–15%', min:10, max:15, c:'#ff8800'},
      {l:'15–20%', min:15, max:20, c:'#ff5500'},
      {l:'20–30%', min:20, max:30, c:'#ff3355'},
      {l:'30–50%', min:30, max:50, c:'#cc2244'},
      {l:'50%+',   min:50, max:999,c:'#881122'},
    ];
    const counts = buckets.map(b => D.drawdowns.filter(d => d.dd_pct >= b.min && d.dd_pct < b.max).length);
    const maxC = Math.max(...counts, 1);
    depthEl.innerHTML = `<div style="display:flex;flex-direction:column;gap:5px;padding:4px 8px;">
      ${buckets.map((b,i) => {
        const c = counts[i];
        const w = c/maxC*100;
        return `<div style="display:flex;align-items:center;gap:8px;">
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:${b.c};width:52px;flex-shrink:0;">${b.l}</div>
          <div style="flex:1;height:22px;background:var(--bg3);border-radius:2px;overflow:hidden;">
            <div style="width:${w.toFixed(1)}%;height:100%;background:${b.c}99;border-radius:2px;display:flex;align-items:center;padding-left:6px;min-width:${c?28:0}px;">
              ${c ? `<span style="font-family:'Share Tech Mono',monospace;font-size:11px;font-weight:bold;color:${b.c};">${c}</span>` : ''}
            </div>
          </div>
          <div style="font-size:10px;color:var(--text3);width:36px;text-align:right;">${c ? ((c/D.total_events_2pct)*100).toFixed(0)+'%' : ''}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="font-size:10px;color:var(--text3);text-align:right;padding:4px 8px;">of all 2%+ declines · n=${D.total_events_2pct}</div>`;
  }

  // ── Escalation chart (given 5%+, breakdown of final depth) ───────────────
  const escalEl = $('decl-escalation-chart');
  if(escalEl) {
    const base5 = D.drawdowns.filter(d => d.dd_pct >= 5);
    const n5 = base5.length;
    const stages = [
      {l:'5–10% (stopped here)',  n: base5.filter(d=>d.dd_pct<10).length,  c:'#ffcc00'},
      {l:'10–15% (stopped here)', n: base5.filter(d=>d.dd_pct>=10&&d.dd_pct<15).length, c:'#ff8800'},
      {l:'15–20% (stopped here)', n: base5.filter(d=>d.dd_pct>=15&&d.dd_pct<20).length, c:'#ff5500'},
      {l:'20–30% (stopped here)', n: base5.filter(d=>d.dd_pct>=20&&d.dd_pct<30).length, c:'#ff3355'},
      {l:'30%+ (continued)',      n: base5.filter(d=>d.dd_pct>=30).length,  c:'#881122'},
    ];
    const maxN = Math.max(...stages.map(s=>s.n),1);
    escalEl.innerHTML = `<div style="padding:8px;font-size:11px;color:var(--text3);margin-bottom:8px;">Of ${n5} declines that reached 5%:</div>
      <div style="display:flex;flex-direction:column;gap:5px;padding:4px 8px;">
        ${stages.map(s => {
          const w = s.n/maxN*100;
          const pct = (s.n/n5*100).toFixed(0);
          return `<div style="display:flex;align-items:center;gap:8px;">
            <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:${s.c};width:140px;flex-shrink:0;">${s.l}</div>
            <div style="flex:1;height:22px;background:var(--bg3);border-radius:2px;overflow:hidden;">
              <div style="width:${w.toFixed(1)}%;height:100%;background:${s.c}99;border-radius:2px;display:flex;align-items:center;padding-left:6px;min-width:${s.n?28:0}px;">
                ${s.n ? `<span style="font-family:'Share Tech Mono',monospace;font-size:11px;font-weight:bold;color:${s.c};">${s.n}</span>` : ''}
              </div>
            </div>
            <div style="font-size:11px;font-weight:bold;color:${s.c};width:36px;text-align:right;">${pct}%</div>
          </div>`;
        }).join('')}
      </div>`;
  }

  // ── Major drawdowns table ────────────────────────────────────────────────
  const majorEl = $('decl-major-table');
  if(majorEl) {
    const majors = D.drawdowns.filter(d => d.dd_pct >= 10).reverse();
    const th = (s,align='right') => `<th style="padding:7px 10px;text-align:${align};font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);border-bottom:1px solid var(--border);white-space:nowrap;">${s}</th>`;
    majorEl.innerHTML = `<thead><tr>
      ${th('PEAK DATE','left')} ${th('TROUGH DATE','left')} ${th('RECOVERY DATE','left')}
      ${th('DEPTH')} ${th('SPY PEAK')} ${th('SPY TROUGH')}
      ${th('DAYS → TROUGH')} ${th('DAYS TO RECOVER')} ${th('TOTAL DURATION')}
    </tr></thead><tbody>${
      majors.map(d => {
        const depthColor = d.dd_pct >= 30 ? '#cc2244' : d.dd_pct >= 20 ? '#ff3355' : d.dd_pct >= 15 ? '#ff5500' : '#ff8800';
        const recStr = d.recovery_date || '<span style="color:#ffcc00;">ongoing</span>';
        const recTd = d.recovery_td != null ? d.recovery_td+'td' : '<span style="color:#ffcc00;">—</span>';
        const totalTd = d.total_td != null ? d.total_td+'td' : '<span style="color:#ffcc00;">—</span>';
        return `<tr style="border-bottom:1px solid var(--border)22;">
          <td style="padding:6px 10px;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);">${d.peak_date}</td>
          <td style="padding:6px 10px;font-family:'Share Tech Mono',monospace;font-size:11px;color:#ff3355;">${d.trough_date}</td>
          <td style="padding:6px 10px;font-family:'Share Tech Mono',monospace;font-size:11px;color:#00ff88;">${recStr}</td>
          <td style="padding:6px 10px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:14px;font-weight:bold;color:${depthColor};">-${d.dd_pct}%</td>
          <td style="padding:6px 10px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);">$${d.peak_val}</td>
          <td style="padding:6px 10px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:#ff335588;">$${d.trough_val}</td>
          <td style="padding:6px 10px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--cyan);">${d.duration_td}td</td>
          <td style="padding:6px 10px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:#00ff88;">${recTd}</td>
          <td style="padding:6px 10px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);">${totalTd}</td>
        </tr>`;
      }).join('')
    }</tbody>`;
  }


  // Mirror all rendered content into the es-declines sub-panel (Stats tab)
  const _mirrorDecl = [
    ['decl-freq-cards',       'es-decl-freq-cards'],
    ['decl-cond-table',       'es-decl-cond-table'],
    ['decl-dur-table',        'es-decl-dur-table'],
    ['decl-depth-chart',      'es-decl-depth-chart'],
    ['decl-escalation-chart', 'es-decl-escalation-chart'],
    ['decl-major-table',      'es-decl-major-table'],
  ];
  _mirrorDecl.forEach(([src, dst]) => {
    const s = document.getElementById(src), d = document.getElementById(dst);
    if(s && d) d.innerHTML = s.innerHTML;
  });
  ['decl-total-events','decl-date-range'].forEach(id => {
    const s = document.getElementById(id), d = document.getElementById('es-' + id);
    if(s && d) d.textContent = s.textContent;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// INTRADAY VOLUME PROFILE — 5-min historical chart with lookback + DOW toggles
// ─────────────────────────────────────────────────────────────────────────────
let _ivpLookback = 'all';
let _ivpDow      = 'all';

window._ivpSetLookback = function(val) { _ivpLookback = val; renderIntradayVolProfile(); };
window._ivpSetDow      = function(val) { _ivpDow = val;      renderIntradayVolProfile(); };

function renderIntradayVolProfile() {
  // ── Tab intro banner ─────────────────────────────────────────────────────────
  const _ivIntro = `<div style="background:rgba(0,204,255,0.04);border:1px solid rgba(0,204,255,0.12);border-radius:4px;padding:14px 18px;margin-bottom:14px;font-size:12px;color:var(--text2);line-height:1.8;">
    <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--cyan);letter-spacing:2px;margin-bottom:8px;">⬡ WHAT IS THIS TAB?</div>
    <strong style="color:var(--text1);">Intraday Volatility</strong> tracks how SPY's realized volatility and range behave throughout the trading session.
    Where does volatility compress? Where does it expand? This is the foundation for setting realistic targets and stops for intraday trades.
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px;font-size:11px;">
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid var(--cyan);">
        <div style="color:var(--cyan);font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">RANGE BY TIME BUCKET</div>
        Average point range for each 30-minute window of the day. The open is always the widest. Use this to calibrate stop size by time of day.
      </div>
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid #ff8800;">
        <div style="color:#ff8800;font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">VOLATILITY REGIMES</div>
        High-vol vs low-vol days behave differently across all time windows. This tab separates them so you can see how the intraday structure shifts on big-range days.
      </div>
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid #ffcc00;">
        <div style="color:#ffcc00;font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">CUMULATIVE RANGE</div>
        How much of the day's total range has typically been realized by each time bucket? By noon, what percentage of the expected range is usually in?
      </div>
    </div>
  </div>`;
  const el = document.getElementById('intradayVolContent');
  if (!el) return;

  if (typeof INTRADAY_VOL_PROFILE === 'undefined') {
    el.innerHTML = '<div style="padding:40px;text-align:center;font-size:12px;color:var(--text3);">Intraday volume profile data not loaded.</div>';
    return;
  }

  const key = _ivpDow === 'all' ? _ivpLookback : `${_ivpLookback}_${_ivpDow}`;
  const profile = INTRADAY_VOL_PROFILE[key];

  if (!profile || !profile.length) {
    el.innerHTML = '<div style="padding:40px;text-align:center;font-size:12px;color:var(--text3);">Not enough data for this filter combination.</div>';
    return;
  }

  // ET → CT (subtract 1 hour)
  function etToCT(ts) {
    const [h, m] = ts.split(':').map(Number);
    let ch = h - 1; if (ch < 0) ch += 24;
    return `${ch}:${String(m).padStart(2,'0')}`;
  }
  function fmtVol(v) {
    if (v >= 1e6) return (v/1e6).toFixed(2)+'M';
    if (v >= 1e3) return (v/1e3).toFixed(0)+'K';
    return v.toFixed(0);
  }

  // Current CT time for "now" highlight
  const nowCT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const nowMins = nowCT.getHours() * 60 + nowCT.getMinutes();
  function tsToMins(ts) { const [h,m]=ts.split(':').map(Number); return h*60+m; }

  // Use pct (% of daily) for bar sizing — keeps MOC spike in proportion
  const maxPct = Math.max(...profile.map(b => b.pct));
  const minPct = Math.min(...profile.map(b => b.pct));

  // Color: blue → cyan → yellow → orange for low→high volume
  function volColor(pct) {
    const t = (pct - minPct) / (maxPct - minPct);
    if (t > 0.80) return '#ff8800';
    if (t > 0.55) return '#ffcc00';
    if (t > 0.30) return '#00ccff';
    return '#005577';
  }

  const fbtn = (lbl, active, fn) =>
    `<button onclick="${fn}" style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;padding:3px 10px;background:${active?'rgba(0,204,255,0.15)':'var(--bg3)'};border:1px solid ${active?'var(--cyan)':'var(--border)'};border-radius:3px;color:${active?'var(--cyan)':'var(--text2)'};cursor:pointer;">${lbl}</button>`;

  const curYear = new Date().getFullYear();
  const lbBtns = [
    fbtn('ALL HISTORY', _ivpLookback==='all',  "_ivpSetLookback('all')"),
    fbtn('12 MONTHS',   _ivpLookback==='12m',  "_ivpSetLookback('12m')"),
    fbtn(String(curYear), _ivpLookback==='year', "_ivpSetLookback('year')"),
  ].join(' ');

  const dowBtns = ['all','Mon','Tue','Wed','Thu','Fri'].map(d =>
    fbtn(d==='all'?'ALL DAYS':d.toUpperCase(), _ivpDow===d, `_ivpSetDow('${d}')`)
  ).join(' ');

  const nSessions = profile[0]?.n ? Math.round(profile[0].n / 5) : '?';

  // Find top 3 high/low volume slots
  const sorted = [...profile].sort((a,b) => b.pct - a.pct);
  const top3 = sorted.slice(0,3).map(b=>`${etToCT(b.ts)} CT (${b.pct.toFixed(2)}%)`).join(' · ');
  const bot3 = sorted.slice(-3).map(b=>`${etToCT(b.ts)} CT (${b.pct.toFixed(2)}%)`).join(' · ');

  const bars = profile.map(b => {
    const ctTs = etToCT(b.ts);
    const bMins = tsToMins(ctTs);
    const isNow = nowMins >= bMins && nowMins < bMins + 5;
    const barH = Math.round((b.pct / maxPct) * 100);
    const c = isNow ? 'var(--cyan)' : volColor(b.pct);
    const isHour = b.ts.endsWith(':00');
    const h = parseInt(ctTs.split(':')[0]);
    const label = isHour ? (h > 12 ? (h-12)+'pm' : h+'am') : '';
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;min-width:0;position:relative;"
               title="${ctTs} CT · ${b.pct.toFixed(2)}% of daily vol · avg ${fmtVol(b.avg)} shares${isNow?' · NOW':''}">
      ${isNow ? `<div style="position:absolute;top:-14px;font-family:'Orbitron',monospace;font-size:7px;color:var(--cyan);">NOW</div>` : ''}
      <div style="width:100%;display:flex;flex-direction:column;justify-content:flex-end;height:120px;background:var(--bg3);border-radius:2px 2px 0 0;overflow:hidden;${isNow?'border:1px solid var(--cyan);':''}">
        <div style="width:100%;background:${c};opacity:${isNow?1:0.8};height:${barH}%;border-radius:2px 2px 0 0;"></div>
      </div>
      <div style="font-family:'Orbitron',monospace;font-size:7px;color:${isHour?(isNow?'var(--cyan)':'var(--text2)'):'transparent'};white-space:nowrap;">${label||'·'}</div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div style="padding:14px 16px;max-width:1200px;margin:0 auto;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:10px;">⬡ INTRADAY VOLUME PROFILE</div>
          <div style="margin-bottom:6px;">
            <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">LOOKBACK</div>
            <div style="display:flex;gap:5px;">${lbBtns}</div>
          </div>
          <div>
            <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">DAY OF WEEK</div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;">${dowBtns}</div>
          </div>
        </div>
        <div style="text-align:right;font-size:10px;color:var(--text3);">
          <div>${profile.length} buckets · ~${nSessions} sessions</div>
          <div style="margin-top:2px;">5-min avg volume · Central Time</div>
          <div style="margin-top:2px;">bars = % of mid-session vol · top 10% trimmed · open/close 15min excluded</div>
        </div>
      </div>

      <div style="display:flex;align-items:flex-end;gap:1px;padding:18px 0 4px;overflow:hidden;margin-bottom:6px;">
        ${bars}
      </div>

      <div style="display:flex;gap:16px;flex-wrap:wrap;padding:8px;background:var(--bg3);border-radius:4px;margin-top:4px;">
        <div style="font-size:10px;">
          <span style="color:var(--text3);">HIGHEST VOL: </span>
          <span style="color:#ff8800;font-family:'Share Tech Mono',monospace;">${top3}</span>
        </div>
        <div style="font-size:10px;">
          <span style="color:var(--text3);">LOWEST VOL: </span>
          <span style="color:#005577;font-family:'Share Tech Mono',monospace;">${bot3}</span>
        </div>
      </div>
      <div style="margin-top:6px;font-size:10px;color:var(--text3);">
        <span style="display:inline-block;width:10px;height:10px;background:#ff8800;border-radius:2px;vertical-align:middle;margin-right:3px;"></span>Heaviest &nbsp;
        <span style="display:inline-block;width:10px;height:10px;background:#ffcc00;border-radius:2px;vertical-align:middle;margin-right:3px;"></span>Elevated &nbsp;
        <span style="display:inline-block;width:10px;height:10px;background:#00ccff;border-radius:2px;vertical-align:middle;margin-right:3px;"></span>Normal &nbsp;
        <span style="display:inline-block;width:10px;height:10px;background:#005577;border-radius:2px;vertical-align:middle;margin-right:3px;"></span>Light &nbsp;
        <span style="color:var(--text3);margin-left:8px;">First &amp; last 15 min excluded · 8:45–14:45 CT</span>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTRADAY VOLUME STATS — correlations, quintile analysis, cumulative curve
// ─────────────────────────────────────────────────────────────────────────────
function renderIntradayVolStats() {
  // ── Tab intro banner ─────────────────────────────────────────────────────────
  const _ivIntro = `<div style="background:rgba(0,204,255,0.04);border:1px solid rgba(0,204,255,0.12);border-radius:4px;padding:14px 18px;margin-bottom:14px;font-size:12px;color:var(--text2);line-height:1.8;">
    <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--cyan);letter-spacing:2px;margin-bottom:8px;">⬡ WHAT IS THIS TAB?</div>
    <strong style="color:var(--text1);">Intraday Volatility</strong> tracks how SPY's realized volatility and range behave throughout the trading session.
    Where does volatility compress? Where does it expand? This is the foundation for setting realistic targets and stops for intraday trades.
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px;font-size:11px;">
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid var(--cyan);">
        <div style="color:var(--cyan);font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">RANGE BY TIME BUCKET</div>
        Average point range for each 30-minute window of the day. The open is always the widest. Use this to calibrate stop size by time of day.
      </div>
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid #ff8800;">
        <div style="color:#ff8800;font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">VOLATILITY REGIMES</div>
        High-vol vs low-vol days behave differently across all time windows. This tab separates them so you can see how the intraday structure shifts on big-range days.
      </div>
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid #ffcc00;">
        <div style="color:#ffcc00;font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">CUMULATIVE RANGE</div>
        How much of the day's total range has typically been realized by each time bucket? By noon, what percentage of the expected range is usually in?
      </div>
    </div>
  </div>`;
  const el = document.getElementById('intradayVolContent');
  if (!el) return;
  if (typeof INTRADAY_VOL_STATS === 'undefined' || typeof INTRADAY_VOL_PROFILE === 'undefined') return;

  const S = INTRADAY_VOL_STATS;
  const qs = S.quintile_stats;
  const fmtM = v => v >= 1000 ? (v/1000).toFixed(1)+'B' : v.toFixed(0)+'M';
  const fmtPct = v => v.toFixed(1)+'%';
  const hours = [8,9,10,11,12,13,14];
  const hrLbl = h => h < 12 ? h+'am' : (h===12?'12pm':(h-12)+'pm');

  // ── SECTION 1: Volume Quintile Summary Cards ──────────────────────────────
  const quintileCards = qs.map(q => {
    const phData = S.power_hour_by_q[q.label] || {up:0,down:0,none:0};
    const phTotal = phData.up + phData.down + phData.none;
    const phUpPct = phTotal ? Math.round(phData.up/phTotal*100) : 0;
    const phDnPct = phTotal ? Math.round(phData.down/phTotal*100) : 0;
    return `<div style="background:var(--bg2);border:1px solid var(--border);border-top:3px solid ${q.color};border-radius:4px;padding:12px;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;color:${q.color};letter-spacing:1px;margin-bottom:6px;">${q.label.toUpperCase()} VOL</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text3);margin-bottom:8px;">${fmtM(q.vol_lo)}–${fmtM(q.vol_hi)} · ${q.n} days</div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:10px;color:var(--text3);">Avg range</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${q.color};">${fmtPct(q.avg_range)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:10px;color:var(--text3);">Median range</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);">${fmtPct(q.med_range)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:10px;color:var(--text3);">Gap fill rate</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${q.gap_fill_pct>45?'#00ff88':q.gap_fill_pct>35?'#ffcc00':'#ff8800'};">${q.gap_fill_pct}% <span style="font-size:9px;color:var(--text3);">(${q.gap_n} gaps)</span></span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="font-size:10px;color:var(--text3);">Power hour</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:10px;">
          <span style="color:#00ff88;">▲${phUpPct}%</span> <span style="color:#ff3355;">▼${phDnPct}%</span>
        </span>
      </div>
    </div>`;
  }).join('');

  // ── SECTION 2: HOD/LOD Timing Heatmap by Quintile ──────────────────────────
  function hodLodGrid(which) {
    const rows = qs.map(q => {
      const dist = which === 'hod' ? q.hod_by_hour : q.lod_by_hour;
      const total = Object.values(dist).reduce((a,b)=>a+b,0);
      const cells = hours.map(h => {
        const cnt = dist[String(h)] || 0;
        const pct = total ? cnt/total : 0;
        const intensity = Math.round(pct * 100);
        const bg = which === 'hod'
          ? `rgba(0,255,136,${(pct*2).toFixed(2)})`
          : `rgba(255,51,85,${(pct*2).toFixed(2)})`;
        return `<td style="text-align:center;padding:4px 2px;background:${bg};font-family:'Share Tech Mono',monospace;font-size:10px;color:${intensity>25?'#fff':'var(--text3)'};border-radius:2px;" title="${hrLbl(h)} CT: ${cnt} days (${Math.round(pct*100)}%)">${intensity>10?Math.round(pct*100)+'%':''}</td>`;
      }).join('');
      return `<tr>
        <td style="font-family:'Orbitron',monospace;font-size:8px;color:${q.color};padding:4px 8px 4px 0;white-space:nowrap;">${q.label.toUpperCase()}</td>
        ${cells}
      </tr>`;
    }).join('');
    const headers = hours.map(h => `<th style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);padding:2px 4px;text-align:center;">${hrLbl(h)}</th>`).join('');
    return `<table style="width:100%;border-collapse:separate;border-spacing:2px;">
      <thead><tr><th></th>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  // ── SECTION 3: Cumulative Volume Curve ────────────────────────────────────
  const curve = S.cum_curve || [];
  const midIdx = curve.findIndex(b => b.avg_cum_pct >= 50);
  const midTs = midIdx >= 0 ? curve[midIdx].ts : null;
  function etToCT(ts) { const [h,m]=ts.split(':').map(Number); return `${h-1}:${String(m).padStart(2,'0')}`; }

  const curveMaxPct = 100;
  const curveBars = curve.map(b => {
    const ct = etToCT(b.ts);
    const isHour = b.ts.endsWith(':00');
    const isMid = midTs && b.ts === midTs;
    const barH = Math.round(b.avg_cum_pct);
    const c2 = b.avg_cum_pct < 25 ? '#005577' : b.avg_cum_pct < 50 ? '#0088aa' : b.avg_cum_pct < 75 ? '#ffcc00' : '#ff8800';
    const h = parseInt(ct.split(':')[0]);
    const label = isHour ? (h<12?h+'am':(h===12?'12pm':(h-12)+'pm')) : '';
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;min-width:0;position:relative;"
               title="${ct} CT · ${b.avg_cum_pct}% of daily vol done on avg">
      ${isMid?`<div style="position:absolute;top:-14px;font-family:'Orbitron',monospace;font-size:7px;color:#ffcc00;">50%</div>`:''}
      <div style="width:100%;display:flex;flex-direction:column;justify-content:flex-end;height:60px;background:var(--bg3);border-radius:2px 2px 0 0;overflow:hidden;${isMid?'border:1px solid #ffcc00;':''}">
        <div style="width:100%;background:${c2};opacity:0.8;height:${barH}%;border-radius:2px 2px 0 0;"></div>
      </div>
      <div style="font-family:'Orbitron',monospace;font-size:7px;color:${isHour?'var(--text2)':'transparent'};white-space:nowrap;">${label||'·'}</div>
    </div>`;
  }).join('');

  // ── SECTION 4: Gap type vs volume ─────────────────────────────────────────
  const gv = S.gap_vol || {};
  const gapTypes = [
    {k:'GAP_DOWN', lbl:'GAP DOWN', c:'#ff3355'},
    {k:'FLAT',     lbl:'FLAT',     c:'#ffcc00'},
    {k:'GAP_UP',   lbl:'GAP UP',   c:'#00ff88'},
  ];
  const maxGapVol = Math.max(...gapTypes.map(g => gv[g.k]?.avg||0));
  const gapBars = gapTypes.map(g => {
    const d = gv[g.k]; if (!d) return '';
    const w = Math.round(d.avg/maxGapVol*100);
    return `<div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;">
        <span style="font-family:'Orbitron',monospace;font-size:9px;color:${g.c};">${g.lbl}</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${g.c};">${fmtM(d.avg)}M avg <span style="font-size:9px;color:var(--text3);">(${d.n} days)</span></span>
      </div>
      <div style="height:10px;background:var(--bg3);border-radius:3px;overflow:hidden;">
        <div style="width:${w}%;height:100%;background:${g.c};opacity:0.7;border-radius:3px;"></div>
      </div>
    </div>`;
  }).join('');

  const section = (title, content) => `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:14px;margin-bottom:12px;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:12px;">${title}</div>
      ${content}
    </div>`;

  // Append stats below existing vol profile content
  const statsDiv = document.getElementById('intradayVolStats');
  if (!statsDiv) return;

  statsDiv.innerHTML = _ivIntro +
    section('⬡ HOW MUCH VOLUME CHANGES EVERYTHING',
      `<div style="font-size:12px;color:var(--text2);margin-bottom:14px;line-height:1.7;">
        Not all trading days are equal — days with much heavier volume than usual behave very differently 
        from quiet low-volume days. This section sorts every historical session into five buckets 
        by total volume (Very Low through Very High) and shows how each group of days tends to behave.
        The key insight: <strong style="color:#ff8800;">high-volume days have much wider ranges</strong> and higher gap fill rates. 
        Low-volume days are tighter and more directionless.
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;">${quintileCards}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.6;">
        <strong>Avg range</strong> = how wide the day was from high to low, as a percent of price. 
        <strong>Gap fill rate</strong> = how often SPY went back to fill its opening gap on days in this volume bucket. 
        <strong>Power hour</strong> = how often the last hour moved up vs down on these days.
      </div>`) +

    section('⬡ WHEN DOES THE DAY\'S HIGH PRINT? (BY VOLUME LEVEL)',
      `<div style="font-size:12px;color:var(--text2);margin-bottom:10px;line-height:1.7;">
        This heatmap shows which hour of the day the session high was made, broken out by how heavy 
        volume was that day. Each cell shows what percent of days in that volume bucket made their high 
        during that hour. Darker green = more common. 
        <strong style="color:#00ff88;">On high-volume days, the high tends to print early</strong> — often right at the open (8am CT) or within the first hour, 
        reflecting aggressive directional moves. On low-volume days, the high drifts later into the afternoon.
      </div>
       ${hodLodGrid('hod')}`) +

    section('⬡ WHEN DOES THE DAY\'S LOW PRINT? (BY VOLUME LEVEL)',
      `<div style="font-size:12px;color:var(--text2);margin-bottom:10px;line-height:1.7;">
        Same as above but tracking the session low. The red cells show where the low was made most often.
        The open (8am CT) is the most common low time across all volume levels — the opening drive often 
        makes the day's extreme quickly on gap-down opens. High-volume days show a stronger tendency to 
        make the low at the open, consistent with panic-driven gap-down sessions.
      </div>
       ${hodLodGrid('lod')}`) +

    section('⬡ HOW VOLUME BUILDS THROUGH THE DAY',
      `<div style="font-size:12px;color:var(--text2);margin-bottom:10px;line-height:1.7;">
        This chart shows the average cumulative percent of the day's total volume that has traded 
        by each 5-minute bar. Think of it as: "by 10am CT, roughly X% of the whole day's volume has 
        already happened." The yellow marker shows the point where <strong>50% of volume is done</strong> on a typical day.
        Volume is front-loaded — the open and the first hour account for a disproportionate share 
        of activity, with a second burst in the final 30–60 minutes (power hour). The middle of the 
        day (11am–1pm CT) is the quietest period.
      </div>
       <div style="display:flex;align-items:flex-end;gap:1px;padding:18px 0 4px;">${curveBars}</div>`) +

    section('⬡ HOW MUCH VOLUME TRADES BY GAP TYPE',
      `<div style="font-size:12px;color:var(--text2);margin-bottom:10px;line-height:1.7;">
        Days that open with a gap down see significantly more total volume than flat-open or gap-up days. 
        This reflects the mechanics of fear: gap-down opens force more selling, trigger stop-losses, 
        and attract bargain hunters, all of which adds volume. Flat opens are the quietest days. 
        This pattern is consistent with the correlation between higher volume and wider ranges.
      </div>
       ${gapBars}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// WINDOW STATS — London Close & Pre-Power-Hour windows
// ─────────────────────────────────────────────────────────────────────────────
function renderWindowStats() {
  // ── Tab intro banner ─────────────────────────────────────────────────────────
  const _wsIntro = `<div style="background:rgba(0,204,255,0.04);border:1px solid rgba(0,204,255,0.12);border-radius:4px;padding:14px 18px;margin-bottom:14px;font-size:12px;color:var(--text2);line-height:1.8;">
    <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--cyan);letter-spacing:2px;margin-bottom:8px;">⬡ WHAT IS THIS TAB?</div>
    <strong style="color:var(--text1);">Intraday Windows</strong> analyzes specific time windows within the trading day — not just when the high and low form, but how each window
    performs as a standalone trade. Think of it as slicing the day into chunks and asking: if you only traded this window, what would your edge look like?
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:10px;font-size:11px;">
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid var(--cyan);">
        <div style="color:var(--cyan);font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">OPEN WINDOW (9:30–10:00)</div>
        The most volatile 30 minutes of the day. Average range, directional bias, fill rates, and how often the open direction held through the session.
      </div>
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid #00ccff;">
        <div style="color:#00ccff;font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">MIDDAY WINDOW (12:00–1:30)</div>
        The lunch lull — volume dries up, ranges compress. How consistent is the midday drift? Does it mean revert or continue the morning move?
      </div>
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid #ffcc00;">
        <div style="color:#ffcc00;font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">POWER HOUR (1:00–2:00 CT)</div>
        The most directional window of the day. High correlation with next-day gap direction. Strong power hours tend to continue; weak ones tend to reverse.
      </div>
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid #ff8800;">
        <div style="color:#ff8800;font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">CLOSE WINDOW (2:00–3:00 CT)</div>
        MOC orders, rebalancing, and institutional positioning all hit here. The close window often reverses the power hour or amplifies it — the data tells you which.
      </div>
    </div>
  </div>`;
  const el = document.getElementById('intradayWindowsContent');
  if (!el) return;
  if (typeof WINDOW_STATS === 'undefined') {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text3);">Window stats not loaded.</div>';
    return;
  }

  // ── State ──────────────────────────────────────────────────────────────────
  if (!window._wsState) window._wsState = { lb: 'all', dow: 'all' };
  const St = window._wsState;
  window._wsSetLb  = v => { St.lb  = v; renderWindowStats(); };
  window._wsSetDow = v => { St.dow = v; renderWindowStats(); };

  const fkey = St.dow === 'all' ? St.lb : `${St.lb}_${St.dow}`;
  const D = WINDOW_STATS[fkey];
  const meta = WINDOW_STATS.meta;

  const pct  = v => v == null ? '—' : v.toFixed(1) + '%';
  const move = v => v == null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(3) + '%';
  const followColor = v => v >= 70 ? '#00ff88' : v >= 55 ? '#88cc44' : v >= 45 ? '#ffcc00' : '#ff8800';
  const moveColor   = v => v == null ? 'var(--text2)' : v > 0.2 ? '#00ff88' : v < -0.2 ? '#ff3355' : v > 0 ? '#88cc44' : '#ff8855';
  const curYear = new Date().getFullYear();
  const fbtn = (lbl, active, fn) =>
    `<button onclick="${fn}" style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;padding:3px 10px;background:${active?'rgba(0,204,255,0.15)':'var(--bg3)'};border:1px solid ${active?'var(--cyan)':'var(--border)'};border-radius:3px;color:${active?'var(--cyan)':'var(--text2)'};cursor:pointer;">${lbl}</button>`;

  const lbBtns  = ['all','12m','ytd'].map(v => fbtn(v==='all'?'ALL HISTORY':v==='12m'?'12 MONTHS':String(curYear)+' YTD', St.lb===v, `_wsSetLb('${v}')`)).join(' ');
  const dowBtns = ['all','Mon','Tue','Wed','Thu','Fri'].map(v => fbtn(v==='all'?'ALL':v.toUpperCase(), St.dow===v, `_wsSetDow('${v}')`)).join(' ');

  if (!D || !D.n) {
    el.innerHTML = `<div style="padding:14px;">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">${lbBtns}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">${dowBtns}</div>
      <div style="color:var(--text3);padding:20px 0;">Not enough data for this filter.</div>
    </div>`;
    return;
  }

  const section = (title, color, html) =>
    `<div style="background:var(--bg2);border:1px solid var(--border);border-left:3px solid ${color};border-radius:4px;padding:14px;margin-bottom:12px;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:${color};margin-bottom:12px;">${title}</div>
      ${html}
    </div>`;

  const statRow = (lbl, val, color) =>
    `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <span style="font-size:11px;color:var(--text3);">${lbl}</span>
      <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${color||'var(--text2)'};">${val}</span>
    </div>`;

  // ── Summary cards for a window ─────────────────────────────────────────────
  const summaryCards = (ws, label, accentColor) => {
    const s = ws.summary;
    const p = ws.patterns;
    return `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px;">
      ${[
        ['SESSIONS', s.n, 'var(--cyan)'],
        ['DAY FOLLOW', pct(s.day_follow_pct), followColor(s.day_follow_pct)],
        ['REVERSAL RATE', pct(s.reversal_pct), s.reversal_pct>25?'#ff8800':'var(--text2)'],
        ['AVG MOVE', move(s.avg_move), moveColor(s.avg_move)],
      ].map(([l,v,c]) => `<div style="background:var(--bg3);border-radius:3px;padding:8px;text-align:center;">
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:3px;">${l}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:16px;font-weight:bold;color:${c};">${v}</div>
      </div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
      <div style="background:rgba(255,51,85,0.07);border:1px solid rgba(255,51,85,0.25);border-radius:3px;padding:10px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:#ff8800;margin-bottom:6px;">↩ REVERSAL DAYS</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:22px;color:#ff8800;">${p.reversal.n} <span style="font-size:11px;color:var(--text3);">${pct(p.reversal.pct)}</span></div>
        ${statRow('Day follows reversal', pct(p.reversal.day_follow_pct), followColor(p.reversal.day_follow_pct))}
        ${statRow('Post-window follows', pct(p.reversal.post_follow_pct), followColor(p.reversal.post_follow_pct||0))}
        ${statRow('Avg reversal move', move(p.reversal.avg_move), moveColor(p.reversal.avg_move))}
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">Window made its extreme then closed in opposite direction. ${p.reversal.day_follow_pct >= 60 ? 'Day tends to follow the reversal.' : 'Day direction mixed after reversal.'}</div>
      </div>
      <div style="background:rgba(0,255,136,0.06);border:1px solid rgba(0,255,136,0.2);border-radius:3px;padding:10px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:#00ff88;margin-bottom:6px;">→ CONTINUATION DAYS</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:22px;color:#00ff88;">${p.continuation.n} <span style="font-size:11px;color:var(--text3);">${pct(p.continuation.pct)}</span></div>
        ${statRow('Day follows cont.', pct(p.continuation.day_follow_pct), followColor(p.continuation.day_follow_pct))}
        ${statRow('Post-window follows', pct(p.continuation.post_follow_pct), followColor(p.continuation.post_follow_pct||0))}
        ${statRow('Avg continuation move', move(p.continuation.avg_move), moveColor(p.continuation.avg_move))}
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">Window closed in same direction as its dominant move. ${p.continuation.day_follow_pct >= 60 ? 'Strong day-follow when window trends.' : 'Day follow mixed on continuation.'}</div>
      </div>
    </div>`;
  };

  // ── Context breakdown (gap + entry direction) ──────────────────────────────
  const contextGrid = (ctx, label) => {
    const GAP_LABELS  = { GAP_UP: '▲ GAP UP', FLAT: '— FLAT', GAP_DOWN: '▼ GAP DOWN' };
    const GAP_COLORS  = { GAP_UP: '#00ff88', FLAT: '#ffcc00', GAP_DOWN: '#ff3355' };
    const DIR_LABELS  = { UP: '↑ UP on day', FLAT: '→ FLAT', DOWN: '↓ DOWN on day' };
    const DIR_COLORS  = { UP: '#00ff88', FLAT: '#ffcc00', DOWN: '#ff3355' };

    // By gap type
    const byGap = Object.entries(ctx.by_gap).map(([g, c]) => {
      if (!c) return '';
      return `<div style="background:var(--bg3);border-top:2px solid ${GAP_COLORS[g]};border-radius:3px;padding:8px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:${GAP_COLORS[g]};margin-bottom:4px;">${GAP_LABELS[g]}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text3);margin-bottom:4px;">${c.n} sessions</div>
        ${statRow('Day follow', pct(c.day_follow_pct), followColor(c.day_follow_pct))}
        ${statRow('Reversal rate', pct(c.reversal_pct), c.reversal_pct>25?'#ff8800':'var(--text2)')  }
        ${statRow('Avg window move', move(c.avg_move), moveColor(c.avg_move))}
        ${statRow('Post-window follow', pct(c.post_follow_pct), followColor(c.post_follow_pct||0))}
      </div>`;
    }).join('');

    // By day direction at entry
    const byEntry = Object.entries(ctx.by_entry_dir).map(([d, c]) => {
      if (!c) return '';
      return `<div style="background:var(--bg3);border-top:2px solid ${DIR_COLORS[d]};border-radius:3px;padding:8px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:${DIR_COLORS[d]};margin-bottom:4px;">${DIR_LABELS[d]}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text3);margin-bottom:4px;">${c.n} sessions</div>
        ${statRow('Day follow', pct(c.day_follow_pct), followColor(c.day_follow_pct))}
        ${statRow('Reversal rate', pct(c.reversal_pct), c.reversal_pct>25?'#ff8800':'var(--text2)')  }
        ${statRow('Avg window move', move(c.avg_move), moveColor(c.avg_move))}
        ${statRow('Post-window follow', pct(c.post_follow_pct), followColor(c.post_follow_pct||0))}
      </div>`;
    }).join('');

    // Cross table: gap × entry direction
    const gaps  = ['GAP_UP','FLAT','GAP_DOWN'];
    const dirs  = ['UP','FLAT','DOWN'];
    const crossHeader = `<tr>
      <th style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);padding:4px 6px;text-align:left;">GAP → ENTRY</th>
      ${dirs.map(d=>`<th style="font-family:'Orbitron',monospace;font-size:7px;color:${DIR_COLORS[d]};padding:4px 8px;text-align:center;">${DIR_LABELS[d]}</th>`).join('')}
    </tr>`;
    const crossRows = gaps.map(g => {
      const cells = dirs.map(di => {
        const c = ctx.cross_gap_entry[g]?.[di];
        if (!c || c.n < 3) return `<td style="text-align:center;color:var(--text3);font-size:10px;padding:4px 6px;">—</td>`;
        const fc = followColor(c.day_follow_pct);
        return `<td style="text-align:center;padding:4px 6px;">
          <div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${fc};">${pct(c.day_follow_pct)}</div>
          <div style="font-size:9px;color:var(--text3);">${c.n}d · ${move(c.avg_move)}</div>
        </td>`;
      }).join('');
      return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
        <td style="font-family:'Orbitron',monospace;font-size:8px;color:${GAP_COLORS[g]};padding:4px 6px;white-space:nowrap;">${GAP_LABELS[g]}</td>
        ${cells}
      </tr>`;
    }).join('');

    return `<div style="margin-bottom:10px;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:6px;">BY GAP TYPE</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">${byGap}</div>
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:6px;">BY DAY DIRECTION AT WINDOW ENTRY</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">${byEntry}</div>
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:6px;">DAY-FOLLOW % — GAP × ENTRY DIRECTION CROSS TABLE</div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:6px;">Day-follow % for each combination. Shows how gap context and entry direction interact.</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>${crossHeader}</thead>
        <tbody>${crossRows}</tbody>
      </table>
    </div>`;
  };

  // ── Move bins table ────────────────────────────────────────────────────────
  const moveBinsTable = (bins, postLabel) => {
    if (!bins || !bins.length) return '';
    const rows = bins.map(b => {
      const mc = moveColor(b.avg_move);
      return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
        <td style="font-size:10px;color:${mc};padding:4px 6px;white-space:nowrap;">${b.label}</td>
        <td style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text3);padding:4px 8px;text-align:center;">${b.n}</td>
        <td style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${mc};padding:4px 8px;text-align:right;">${move(b.avg_move)}</td>
        <td style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${followColor(b.day_follow_pct)};padding:4px 8px;text-align:right;">${pct(b.day_follow_pct)}</td>
        <td style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${followColor(b.post_follow_pct||0)};padding:4px 8px;text-align:right;">${pct(b.post_follow_pct)}</td>
        <td style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${moveColor(b.post_avg_move)};padding:4px 8px;text-align:right;">${move(b.post_avg_move)}</td>
        <td style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${b.reversal_pct>30?'#ff8800':'var(--text3)'};padding:4px 8px;text-align:right;">${pct(b.reversal_pct)}</td>
      </tr>`;
    }).join('');
    return `<table style="width:100%;border-collapse:collapse;">
      <thead><tr>
        ${['WINDOW MOVE','N','AVG MOVE','DAY FOLLOW',postLabel+' FOLLOW',postLabel+' AVG','REVERSAL %'].map(h=>
          `<th style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);padding:3px 8px;text-align:${h==='WINDOW MOVE'?'left':'right'};">${h}</th>`
        ).join('')}
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  };

  // ── W1+W2 Relationship ─────────────────────────────────────────────────────
  const rel = D.relationship;
  const relHtml = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
    <div style="background:var(--bg3);border-radius:3px;padding:12px;text-align:center;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:#00ff88;margin-bottom:6px;">W1 &amp; W2 SAME DIRECTION</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:28px;color:#00ff88;">${rel.same_dir_n}</div>
      <div style="font-size:10px;color:var(--text3);">${pct(rel.same_dir_pct)} of sessions</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:14px;margin-top:6px;color:${moveColor(rel.same_dir_avg_day)};">${move(rel.same_dir_avg_day)} avg day</div>
      ${statRow('Day follows W1 direction', pct(rel.same_dir_day_follow), followColor(rel.same_dir_day_follow||0))}
      <div style="font-size:10px;color:var(--text3);margin-top:6px;">Both windows trending the same way — strongest directional signal.</div>
    </div>
    <div style="background:var(--bg3);border-radius:3px;padding:12px;text-align:center;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:#ff8800;margin-bottom:6px;">W1 &amp; W2 OPPOSITE DIRECTION</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:28px;color:#ff8800;">${rel.opp_dir_n}</div>
      <div style="font-size:10px;color:var(--text3);">${pct(rel.opp_dir_pct)} of sessions</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:14px;margin-top:6px;color:${moveColor(rel.opp_dir_avg_day)};">${move(rel.opp_dir_avg_day)} avg day</div>
      ${statRow('Day follows W1 direction', pct(rel.opp_dir_day_follow), followColor(rel.opp_dir_day_follow||0))}
      <div style="font-size:10px;color:var(--text3);margin-top:6px;">Opposing windows = indecision day. Day direction is nearly a coin flip.</div>
    </div>
  </div>`;

  // ── Assemble ───────────────────────────────────────────────────────────────
  el.innerHTML = _wsIntro + `<div style="padding:14px 16px;max-width:1400px;margin:0 auto;">
    <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:6px;">⬡ KEY INTRADAY WINDOWS</div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:14px;line-height:1.7;">
      Two recurring intraday time windows tend to produce predictable directional moves in SPY — 
      the <strong style="color:var(--cyan);">London Close window</strong> (9:45–11:00am CT) when European markets are closing and institutional flows can shift,
      and the <strong style="color:#ff8800;">Pre-Power Hour window</strong> (12:45–2:00pm CT) just before the final push into the close.
      This page shows how reliably each window predicts where SPY finishes the day.
    </div>
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">LOOKBACK</div>
        <div style="display:flex;gap:5px;margin-bottom:8px;">${lbBtns}</div>
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">DAY OF WEEK</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;">${dowBtns}</div>
      </div>
      <div style="font-size:10px;color:var(--text3);text-align:right;">
        <div>${D.n} sessions · ${D.date_range}</div>
        <div style="margin-top:2px;">W1: 9:45–11:00am CT &nbsp;·&nbsp; W2: 12:45–2:00pm CT</div>
      </div>
    </div>

    ${section('⬡ WINDOW 1 · 9:45–11:00am CT — LONDON CLOSE', 'var(--cyan)',
      `<div style="font-size:12px;color:var(--text2);margin-bottom:14px;line-height:1.7;">
        This window captures the hour and fifteen minutes after 9:45am CT when London closes. 
        European institutions are finishing their trading day, often producing a burst of volume
        and a clear directional move in SPY. If this window closes higher than it opened, that 
        is called a <em>continuation</em>. If it reversed — meaning it made a big move one way and then 
        came back — that is a <em>reversal</em>. 
        <strong style="color:var(--cyan);">Day follow</strong> tells you: when this window went up, how often did SPY close the full day higher?
      </div>` +
      summaryCards(D.w1, 'W1', 'var(--cyan)') +
      `<div style="font-size:12px;color:var(--text2);margin:14px 0 10px;line-height:1.7;">
        The breakdown below slices the same data by gap type (how SPY opened that morning vs yesterday's close)
        and by which direction the day was trending when W1 started. This helps you understand whether
        the window behaves differently on gap-up days vs gap-down days, or when the market is already up 
        vs already down on the day.
      </div>` +
      contextGrid(D.w1.context, 'W1') +
      `<div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:6px;margin-top:14px;">W1 MOVE SIZE → DAY &amp; MIDDAY FOLLOW-THROUGH</div>
       <div style="font-size:12px;color:var(--text2);margin-bottom:10px;line-height:1.7;">
         How big the window's move was changes how reliable the follow-through is. 
         A move under 0.1% is basically noise — the day can go either way. 
         Moves above 0.4% show the strongest tendency to continue in the same direction through the close.
         <em>Day follow %</em> = percent of sessions where SPY closed in the same direction the window moved.
         <em>Midday follow %</em> = same check but only through midday, before W2 starts.
       </div>` +
      moveBinsTable(D.w1.move_bins, 'MIDDAY')
    )}

    ${section('⬡ WINDOW 2 · 12:45–2:00pm CT — PRE-POWER HOUR SETUP', '#ff8800',
      `<div style="font-size:12px;color:var(--text2);margin-bottom:14px;line-height:1.7;">
        This window runs from 12:45pm to 2:00pm CT, the hour before the power hour (2:00–3:00pm CT) 
        kicks in. It is essentially the setup window — the direction SPY is trending here often 
        carries into the final hour. A strong trending move in W2 can signal whether institutional 
        players are positioning long or short into the close.
        <strong style="color:#ff8800;">Day follow</strong> here means: when W2 closed higher, how often did SPY finish the full day higher?
      </div>` +
      summaryCards(D.w2, 'W2', '#ff8800') +
      `<div style="font-size:12px;color:var(--text2);margin:14px 0 10px;line-height:1.7;">
        Same context breakdown as W1 — by gap type and by whether the market was already up or down 
        when W2 started. W2 context matters more than W1 because by 12:45pm there is less session left
        for the pattern to fail, making the signal more concentrated.
      </div>` +
      contextGrid(D.w2.context, 'W2') +
      `<div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:6px;margin-top:14px;">W2 MOVE SIZE → DAY &amp; POWER HOUR FOLLOW-THROUGH</div>
       <div style="font-size:12px;color:var(--text2);margin-bottom:10px;line-height:1.7;">
         Small W2 moves (under 0.1%) are often traps — the market looks like it is going one way and 
         then power hour yanks it back. Larger W2 moves are more trustworthy but still mixed because
         the power hour has a strong tendency to produce its own momentum regardless of what happened before.
         <em>Power Hr follow %</em> = percent of sessions where power hour continued in the W2 direction.
       </div>` +
      moveBinsTable(D.w2.move_bins, 'POWER HR')
    )}

    ${section('⬡ W1 vs W2 ALIGNMENT — DO BOTH WINDOWS AGREE?', '#8855ff',
      `<div style="font-size:12px;color:var(--text2);margin-bottom:14px;line-height:1.7;">
        The most useful single signal from these windows is whether they agree with each other.
        When W1 and W2 both move in the same direction — both up, or both down — that is a 
        stronger directional read on the day than either window alone. When they point opposite 
        directions, the day is more likely to chop or be indecisive.
      </div>` +
      relHtml
    )}

    <div style="font-size:10px;color:var(--text3);padding:10px 0;line-height:1.6;">
      <strong>How to read these stats:</strong>&nbsp; 
      <em>Day follow %</em> — of all sessions in this filter, what percent did the full day close in the same direction as the window moved. 
      &nbsp;·&nbsp; <em>Reversal rate</em> — how often the window made a big move and then reversed before it closed. 
      &nbsp;·&nbsp; <em>Avg move</em> — average size of the window's net move (open-to-close within the window). 
      &nbsp;·&nbsp; All times are Central. Based on ${D.n} sessions (${D.date_range}).
    </div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GAP STATS — Power Hour (prev day) + First Hour (next day) deep dive
// ─────────────────────────────────────────────────────────────────────────────
let _gsLookback = 'all';
let _gsDow      = 'all';

// ── Gap OHLC filter state ────────────────────────────────────────────────────
let _gapOhlcPeriod  = 'all';
let _gapOhlcDows    = new Set([1,2,3,4,5]);

function gapOhlcSetPeriod(mode, btn) {
  document.querySelectorAll('#gapOHLCSection .ph-fb').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  _gapOhlcPeriod = mode;
  renderGapOHLCSections();
}

function gapOhlcToggleDow(dow, btn) {
  if (_gapOhlcDows.has(dow)) { _gapOhlcDows.delete(dow); btn.classList.remove('active'); }
  else                        { _gapOhlcDows.add(dow);    btn.classList.add('active');    }
  renderGapOHLCSections();
}

function gapOhlcDowAll() {
  _gapOhlcDows = new Set([1,2,3,4,5]);
  document.querySelectorAll('#gapOhlcDowBtns .ph-dow[data-dow]').forEach(b => {
    if (!isNaN(Number(b.dataset.dow))) b.classList.add('active');
    else b.classList.remove('active');
  });
  renderGapOHLCSections();
}

function gapOhlcDowNone() {
  _gapOhlcDows = new Set();
  document.querySelectorAll('#gapOhlcDowBtns .ph-dow[data-dow]').forEach(b => b.classList.remove('active'));
  renderGapOHLCSections();
}

function renderGapOHLCSections() {
  if (typeof _phAllData === 'undefined' || !_phAllData || _phAllData.length <= 1) return;

  const curYear = new Date().getFullYear();
  let sd = _phAllData;

  // Period filter
  if (_gapOhlcPeriod === '2020')     sd = sd.filter(d => d.date && d.date >= '2020-01-01');
  else if (_gapOhlcPeriod === 'ytd') sd = sd.filter(d => d.date && d.date.startsWith(String(curYear)));

  // DOW filter
  if (_gapOhlcDows.size > 0 && _gapOhlcDows.size < 5) {
    sd = sd.filter(d => d.date && _gapOhlcDows.has(new Date(d.date + 'T12:00:00').getDay()));
  } else if (_gapOhlcDows.size === 0) {
    sd = [];
  }

  // Update meta count
  const meta = document.getElementById('gapOhlcMeta');
  if (meta) {
    const dowNote = _gapOhlcDows.size < 5 ? ` · ${_gapOhlcDows.size} day${_gapOhlcDows.size !== 1 ? 's' : ''} selected` : '';
    meta.textContent = sd.length.toLocaleString() + ' sessions' + dowNote;
  }

  _renderGapOHLCBlocks(sd);
}

window._gsSetLookback = function(v){ _gsLookback=v; renderGapStats(); };
window._gsSetDow      = function(v){ _gsDow=v;      renderGapStats(); };

function renderGapStats() {
  // ── Tab intro banner ─────────────────────────────────────────────────────────
  const _gsIntro = `<div style="background:rgba(0,204,255,0.04);border:1px solid rgba(0,204,255,0.12);border-radius:4px;padding:14px 18px;margin-bottom:14px;font-size:12px;color:var(--text2);line-height:1.8;">
    <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--cyan);letter-spacing:2px;margin-bottom:8px;">⬡ WHAT IS THIS TAB?</div>
    <strong style="color:var(--text1);">Gap Stats</strong> analyzes what happens when SPY opens above or below the prior day's close.
    Every section here is built from 1-minute intraday bars and answers a specific question traders care about.
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px;font-size:11px;">
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid var(--cyan);">
        <div style="color:var(--cyan);font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">AT A GLANCE</div>
        Summary stats for all gap days — average gap size, fill rate, first-hour behavior, and how often the first hour predicted the close.
      </div>
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid #00ccff;">
        <div style="color:#00ccff;font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">GAP TYPE BEHAVIOR</div>
        Breaks sessions into Gap Up, Flat, and Gap Down. Shows what the power hour the day before looked like and how the next morning played out.
      </div>
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid #ffcc00;">
        <div style="color:#ffcc00;font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">POWER HOUR → GAP</div>
        If the prior day's 1–2pm CT hour was strong or weak, how did that affect the next morning's gap? Pattern recognition across hundreds of sessions.
      </div>
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid #8855ff;">
        <div style="color:#8855ff;font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">KEY PATTERNS</div>
        Momentum vs reversal days — when the first hour goes with vs against the gap. Late-session surges and fades. Gap fill rates by scenario.
      </div>
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid #ff8800;">
        <div style="color:#ff8800;font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">DAY OF WEEK</div>
        Monday gaps behave differently than Friday gaps. This section breaks down gap frequency, fill rate, and average day range by weekday.
      </div>
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid #ff3355;">
        <div style="color:#ff3355;font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">BIG GAPS + FOLLOW-THROUGH</div>
        Isolates the largest gaps (1%, 1.5%, 2%+) and shows continuation vs reversal rates, average session returns, and whether the first hour predicted direction.
      </div>
    </div>
  </div>`;
  const el = document.getElementById('gapStatsContent');
  if (!el) return;
  if (typeof GAP_STATS === 'undefined') {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text3);">Gap stats data not loaded.</div>';
    return;
  }

  // Build lookback key: year filters use yr_YYYY prefix; DOW appended as suffix
  const key = (() => {
    if (_gsDow === 'all') {
      if (_gsLookback === 'all') return 'all';
      if (_gsLookback === '12m') return '12m';
      if (_gsLookback === 'year') return 'year';
      return `yr_${_gsLookback}`;  // e.g. yr_2025
    } else {
      if (_gsLookback === 'all') return `all_${_gsDow}`;
      if (_gsLookback === '12m') return `12m_${_gsDow}`;
      if (_gsLookback === 'year') return `year_${_gsDow}`;
      return `yr_${_gsLookback}_${_gsDow}`;  // e.g. yr_2025_Mon
    }
  })();

  const D = GAP_STATS[key];
  if (!D || !D.n) {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text3);">Not enough data for this filter.</div>';
    return;
  }

  const curYear = new Date().getFullYear();

  // Detect which year keys exist in GAP_STATS
  const availableYears = [];
  for (const yr of [2024, 2025, 2026, 2027]) {
    if (GAP_STATS[`yr_${yr}`] && GAP_STATS[`yr_${yr}`].n > 0) availableYears.push(String(yr));
  }

  const fbtn = (lbl, active, fn) =>
    `<button onclick="${fn}" style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;padding:4px 12px;background:${active?'rgba(0,204,255,0.15)':'var(--bg3)'};border:1px solid ${active?'var(--cyan)':'var(--border)'};border-radius:3px;color:${active?'var(--cyan)':'var(--text2)'};cursor:pointer;transition:all 0.15s;">${lbl}</button>`;

  // Lookback buttons: All Time | 12 Months | per year
  const lbBtns = [
    fbtn('ALL TIME', _gsLookback==='all', "_gsSetLookback('all')"),
    fbtn('12 MONTHS', _gsLookback==='12m', "_gsSetLookback('12m')"),
    ...availableYears.map(yr => fbtn(yr, _gsLookback===yr, `_gsSetLookback('${yr}')`))
  ].join('');

  const dowBtns = ['all','Mon','Tue','Wed','Thu','Fri'].map(d =>
    fbtn(d==='all'?'ALL DAYS':d.toUpperCase(), _gsDow===d, `_gsSetDow('${d}')`)
  ).join('');

  const section = (title, color, html) =>
    `<div style="background:var(--bg2);border:1px solid var(--border);border-left:3px solid ${color};border-radius:4px;padding:16px;margin-bottom:14px;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:${color};margin-bottom:14px;">${title}</div>
      ${html}
    </div>`;

  const row = (lbl, val, color, note) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <div>
        <span style="font-size:11px;color:var(--text2);">${lbl}</span>
        ${note ? `<div style="font-size:10px;color:var(--text3);margin-top:1px;">${note}</div>` : ''}
      </div>
      <span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${color||'var(--text2)'};white-space:nowrap;margin-left:16px;">${val}</span>
    </div>`;

  const pct = v => (v||0).toFixed(1)+'%';
  const sgn = v => (v>=0?'+':'')+v.toFixed(3)+'%';
  const gapColor = gt => gt==='GAP_UP'?'#00ff88':gt==='GAP_DOWN'?'#ff3355':'#ffcc00';
  const qualColor = v => v>=68?'#00ff88':v>=55?'#88cc44':v>=45?'#ffcc00':'#ff8800';
  const signColor = v => v>=0?'#00ff88':'#ff3355';

  // ── SECTION 1: At-a-glance summary cards ────────────────────────────────
  const summaryHtml = `
    <div style="font-size:11px;color:var(--text2);line-height:1.7;margin-bottom:14px;">
      Showing <strong style="color:var(--cyan);">${D.n} trading day pairs</strong> from the selected period.
      Each pair looks at what the previous day did, and what gap showed up the next morning.
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
      ${[
        ['Sessions Analyzed', D.n, 'var(--cyan)', 'Day pairs with full intraday data'],
        ['Avg Gap at Open', sgn(D.avg_gap), D.avg_gap>0.05?'#00ff88':D.avg_gap<-0.05?'#ff3355':'var(--text2)', 'How much SPY gapped up or down on average'],
        ['Avg Power Hour Move', sgn(D.avg_ph_move), signColor(D.avg_ph_move), 'Net move of prev day 1–2pm CT'],
        ['Avg Power Hour Range', pct(D.avg_ph_range), '#ffcc00', 'High-to-low swing during 1–2pm CT'],
      ].map(([l,v,c,sub])=>`<div style="background:var(--bg3);border-radius:4px;padding:12px;text-align:center;">
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:4px;letter-spacing:1px;">${l}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:20px;color:${c};margin-bottom:4px;">${v}</div>
        <div style="font-size:9px;color:var(--text3);">${sub}</div>
      </div>`).join('')}
    </div>`;

  // ── SECTION 2: Gap type cards (plain English, no abbreviations) ──────────
  const gb = D.gap_breakdown || {};
  const gapCards = ['GAP_DOWN','FLAT','GAP_UP'].map(gt => {
    const g = gb[gt]; if (!g) return '';
    const c = gapColor(gt);
    const label = gt==='GAP_UP'?'Gap Up — SPY opened ABOVE prior close':gt==='GAP_DOWN'?'Gap Down — SPY opened BELOW prior close':'Flat Open — SPY opened near prior close (< 0.10%)';
    const shareOf = Math.round(g.n / D.n * 100);
    return `<div style="background:var(--bg2);border:1px solid ${c}33;border-top:3px solid ${c};border-radius:4px;padding:14px;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;color:${c};margin-bottom:4px;">${label}</div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:12px;">${g.n} sessions · ${shareOf}% of all days</div>

      <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:6px;">THE PREVIOUS DAY'S POWER HOUR (1–2pm CT)</div>
      ${row('Avg power hour move', sgn(g.avg_ph_move), signColor(g.avg_ph_move), 'Net direction of 1–2pm CT session the day before this gap')}
      ${row('Avg power hour range', pct(g.avg_ph_range), '#ffcc00', 'High-to-low swing of that power hour')}
      ${row('Late power hour move (last 15 min)', sgn(g.avg_ph_last_move), signColor(g.avg_ph_last_move), 'How the final 15 minutes of the power hour moved')}

      <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin:12px 0 6px;">THE FIRST HOUR AFTER TODAY'S OPEN (9:30–10:30am CT)</div>
      ${gt!=='FLAT'?row('Gap fill rate', g.fill_rate+'%', qualColor(g.fill_rate), 'How often SPY traded back to the prior close price during the session'):''}
      ${row('First hour direction — up', g.fh_up_pct+'%', qualColor(g.fh_up_pct), 'How often the first hour moved higher')}
      ${row('Avg first hour move', sgn(g.avg_fh_move), signColor(g.avg_fh_move), '')}
      ${row('Avg first hour range', pct(g.avg_fh_range), '#ffcc00', 'High-to-low of the 9:30–10:30am CT window')}
      ${row('First hour predicts full day', g.fh_predicts_day+'%', qualColor(g.fh_predicts_day), 'How often the first hour direction matched the direction of the full day')}

      <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin:12px 0 6px;">FULL DAY OUTCOME</div>
      ${row('Avg full day move', sgn(g.avg_day_move), signColor(g.avg_day_move), '')}
      ${row('Avg full day range', pct(g.avg_day_range), '#ffcc00', 'Total high-to-low for the session')}
    </div>`;
  }).join('');

  // ── SECTION 3: Power Hour strength → next gap table ──────────────────────
  const bins = D.ph_bins || [];
  const phBinRows = bins.map(b => {
    const upPct = Math.min(b.gap_up_pct, 100);
    const dnPct = Math.min(b.gap_dn_pct, 100);
    const phColor = b.avg_ph_move>0.2?'#00ff88':b.avg_ph_move<-0.2?'#ff3355':'#ffcc00';
    const miniBar = (p, color) =>
      `<div style="display:flex;align-items:center;gap:5px;">
         <div style="width:56px;height:7px;background:var(--bg2);border-radius:2px;overflow:hidden;flex-shrink:0;">
           <div style="width:${p}%;height:100%;background:${color};opacity:0.85;border-radius:2px;"></div>
         </div>
         <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${color};min-width:30px;">${p}%</span>
       </div>`;
    return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
      <td style="font-family:'Orbitron',monospace;font-size:10px;color:${phColor};padding:7px 10px;white-space:nowrap;">${b.label}</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text3);padding:7px 10px;text-align:center;">${b.n}</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${phColor};padding:7px 10px;text-align:right;">${sgn(b.avg_gap)}</td>
      <td style="padding:7px 10px;">${miniBar(upPct,'#00ff88')}</td>
      <td style="padding:7px 10px;">${miniBar(dnPct,'#ff3355')}</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${b.fill_rate>40?'#00ff88':'var(--text3)'};padding:7px 10px;text-align:right;">${b.fill_rate}%</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:12px;color:#ffcc00;padding:7px 10px;text-align:right;">${pct(b.avg_fh_range)}</td>
    </tr>`;
  }).join('');

  const phBinHtml = `
    <div style="font-size:11px;color:var(--text2);line-height:1.7;margin-bottom:12px;">
      How strong was the <strong>previous day's Power Hour (1–2pm CT)</strong>? This table groups all sessions by that move, then shows what gap came the next morning and how the first hour played out.
      Strong Power Hour moves — up <em>or</em> down — tend to produce larger gaps and wider first hours.
    </div>
    <div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;min-width:620px;">
      <thead><tr style="border-bottom:2px solid rgba(255,255,255,0.1);">
        ${[{h:'POWER HOUR MOVE',a:'left'},{h:'DAYS',a:'center'},{h:'AVG NEXT GAP',a:'right'},{h:'GAPPED UP',a:'left'},{h:'GAPPED DN',a:'left'},{h:'GAP FILL RATE',a:'right'},{h:'FIRST HR RANGE',a:'right'}].map(({h,a})=>
          `<th style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);padding:7px 10px;text-align:${a};letter-spacing:1px;">${h}</th>`
        ).join('')}
      </thead>
      <tbody>${phBinRows}</tbody>
    </table>
    </div>`;

  // ── SECTION 4: Key signals ────────────────────────────────────────────────
  const sig = D.signals || {};
  const signalHtml = `
    <div style="font-size:11px;color:var(--text2);line-height:1.7;margin-bottom:14px;">
      These panels extract the clearest directional patterns from the Power Hour → next morning relationship.
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div style="background:var(--bg3);border-radius:4px;padding:14px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:#ffcc00;margin-bottom:10px;letter-spacing:1px;">HOW THE POWER HOUR ENDS → NEXT GAP DIRECTION</div>
        <div style="margin-bottom:14px;">
          <div style="font-size:10px;color:var(--text3);margin-bottom:6px;">When the last 15 min of the Power Hour surges higher <span style="color:var(--text2);">(${sig.late_surge_n} sessions)</span></div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
            <div style="flex:1;height:10px;background:var(--bg2);border-radius:3px;overflow:hidden;">
              <div style="width:${sig.late_surge_gap_up}%;height:100%;background:#00ff88;opacity:0.8;border-radius:3px;"></div>
            </div>
            <span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:#00ff88;min-width:60px;">${sig.late_surge_gap_up}% gap up</span>
          </div>
          <div style="font-size:10px;color:var(--text3);">A strong late-day push tends to carry over into a gap-up the next morning.</div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:6px;">When the last 15 min of the Power Hour fades lower <span style="color:var(--text2);">(${sig.late_fade_n} sessions)</span></div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
            <div style="flex:1;height:10px;background:var(--bg2);border-radius:3px;overflow:hidden;">
              <div style="width:${sig.late_fade_gap_dn}%;height:100%;background:#ff3355;opacity:0.8;border-radius:3px;"></div>
            </div>
            <span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:#ff3355;min-width:60px;">${sig.late_fade_gap_dn}% gap dn</span>
          </div>
          <div style="font-size:10px;color:var(--text3);">A late-day fade is the single strongest predictor of a gap-down open the next morning.</div>
        </div>
      </div>
      <div style="background:var(--bg3);border-radius:4px;padding:14px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:#8855ff;margin-bottom:10px;letter-spacing:1px;">GAP FILL RATE: MOMENTUM VS MEAN REVERSION</div>
        <div style="margin-bottom:14px;">
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px;">Power Hour moved <em>same direction</em> as the gap <span style="color:var(--text2);">(${sig.momentum_n} sessions)</span></div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px;">e.g. Power Hour was up, next day gapped up — both moving the same way</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:22px;color:#ffcc00;">${sig.momentum_fill}% <span style="font-size:11px;color:var(--text3);">fill rate</span></div>
          <div style="font-size:10px;color:var(--text3);margin-top:3px;">Momentum is sustained — gap fills less often.</div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px;">Power Hour moved <em>opposite direction</em> to the gap <span style="color:var(--text2);">(${sig.reversal_n} sessions)</span></div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px;">e.g. Power Hour was up, next day gapped down — pulling in opposite directions</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:22px;color:#00ccff;">${sig.reversal_fill}% <span style="font-size:11px;color:var(--text3);">fill rate</span></div>
          <div style="font-size:10px;color:var(--text3);margin-top:3px;">Mean reversion — the market is correcting, gap fills more readily.</div>
        </div>
      </div>
      <div style="background:var(--bg3);border-radius:4px;padding:14px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:#ffcc00;margin-bottom:10px;letter-spacing:1px;">POWER HOUR VOLATILITY → NEXT MORNING RANGE</div>
        <div style="font-size:11px;color:var(--text2);margin-bottom:12px;">A wide, volatile Power Hour reliably predicts a wider first hour the next morning. Use this to size expectations before the open.</div>
        ${row('Wide Power Hour (above median) → first hour range', pct(sig.wide_ph_fh_range), '#ff8800')}
        ${row('Tight Power Hour (below median) → first hour range', pct(sig.tight_ph_fh_range), '#00ccff')}
      </div>
      <div style="background:var(--bg3);border-radius:4px;padding:14px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:#ff8800;margin-bottom:10px;letter-spacing:1px;">KEY TAKEAWAYS — ${D.n} SESSIONS</div>
        <div style="font-size:11px;color:var(--text2);line-height:1.9;">
          • <span style="color:#ff3355;">Late Power Hour fade</span> = strongest gap-down predictor<br>
          • <span style="color:#00ff88;">Late Power Hour surge</span> = leans gap-up next morning<br>
          • <span style="color:#00ccff;">PH opposes gap direction</span> = higher gap fill rate<br>
          • <span style="color:#ff8800;">Wide Power Hour</span> = expect a volatile first hour<br>
          • First hour predicts full day <span style="color:#00ff88;">69–75%</span> of the time across gap types<br>
          • Gap Down days produce the widest first hours (most opportunity)
        </div>
      </div>
    </div>`;

  // ── SECTION 5: Day-of-week breakdown (expanded) ───────────────────────────
  const dbd = D.dow_breakdown || {};
  const dayNames = {Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday'};
  const dayColors = {Mon:'#00ccff',Tue:'#ffcc00',Wed:'#00ff88',Thu:'#ff8800',Fri:'#8855ff'};
  const dowCards = ['Mon','Tue','Wed','Thu','Fri'].map(d => {
    const r = dbd[d]; if (!r||!r.n) return '';
    const c = dayColors[d];
    const upW = Math.min(r.gap_up_pct, 100); const dnW = Math.min(r.gap_dn_pct, 100);
    const flatW = Math.max(0, 100 - upW - dnW);
    const barSegment = (w, color, lbl) =>
      w > 0 ? `<div style="flex:${w};height:100%;background:${color};opacity:0.85;" title="${lbl}: ${w}%"></div>` : '';
    return `<div style="background:var(--bg2);border:1px solid var(--border);border-top:3px solid ${c};border-radius:4px;padding:14px;">
      <div style="font-family:'Orbitron',monospace;font-size:10px;color:${c};margin-bottom:4px;">${dayNames[d]}</div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:12px;">${r.n} sessions</div>

      <div style="margin-bottom:10px;">
        <div style="font-size:10px;color:var(--text3);margin-bottom:4px;">Gap direction split</div>
        <div style="display:flex;height:12px;border-radius:3px;overflow:hidden;background:var(--bg3);">
          ${barSegment(upW,'#00ff88','Gap Up')}${barSegment(flatW,'rgba(255,204,0,0.4)','Flat')}${barSegment(dnW,'#ff3355','Gap Down')}
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:4px;font-family:'Share Tech Mono',monospace;font-size:10px;">
          <span style="color:#00ff88;">▲ ${upW}% up</span>
          <span style="color:#ffcc00;">${flatW}% flat</span>
          <span style="color:#ff3355;">${dnW}% dn ▼</span>
        </div>
      </div>

      ${row('Avg gap at open', sgn(r.avg_gap), r.avg_gap>0.05?'#00ff88':r.avg_gap<-0.05?'#ff3355':'var(--text2)')}
      ${row('Avg Power Hour move (prev day)', sgn(r.avg_ph_move), signColor(r.avg_ph_move))}
      ${r.avg_fh_range!==undefined ? row('Avg first hour range', pct(r.avg_fh_range), '#ffcc00') : ''}
      ${r.avg_day_range!==undefined ? row('Avg full day range', pct(r.avg_day_range), '#ffcc00') : ''}
      ${r.fill_rate_gaps!==undefined ? row('Gap fill rate (when gapped)', r.fill_rate_gaps+'%', qualColor(r.fill_rate_gaps)) : ''}
    </div>`;
  }).join('');

  const dowNote = (() => {
    const dbd2 = D.dow_breakdown || {};
    const mon = dbd2['Mon']; const fri = dbd2['Fri'];
    const parts = [];
    if (mon && mon.n > 5) parts.push(`Monday gaps trend ${mon.avg_gap>=0?'bullish':'bearish'} (avg ${sgn(mon.avg_gap)}) — weekend news accumulates over two days.`);
    if (fri && fri.n > 5) parts.push(`Friday gaps are often smaller — traders reduce risk before the weekend.`);
    return parts.join(' ');
  })();

  // ── SECTION 6: Big gap behavior ───────────────────────────────────────────
  const bg = D.big_gaps || {};
  const bgStat = (lbl, val, color) =>
    `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <span style="font-size:11px;color:var(--text3);">${lbl}</span>
      <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${color||'var(--text2)'};">${val}</span>
    </div>`;
  const bgCard = (label, threshKey, color) => {
    const t = bg[threshKey];
    if (!t || !t.total_n) return `<div style="background:var(--bg2);border:1px solid var(--border);border-top:3px solid ${color};border-radius:4px;padding:14px;"><div style="font-family:'Orbitron',monospace;font-size:9px;color:${color};margin-bottom:8px;">${label}</div><div style="color:var(--text3);font-size:11px;">No big gaps in this filter period</div></div>`;
    const u = t.up || {}; const dn = t.down || {};
    return `<div style="background:var(--bg2);border:1px solid var(--border);border-top:3px solid ${color};border-radius:4px;padding:14px;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;color:${color};margin-bottom:4px;">${label}</div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:12px;">${t.total_n} sessions · ${t.pct_of_sessions}% of all days</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <div style="font-family:'Orbitron',monospace;font-size:7px;color:#00ff88;margin-bottom:6px;letter-spacing:1px;">GAPPED UP ▲ (${u.n||0} days)</div>
          ${u.n ? bgStat('Avg gap size', '+'+(u.avg_gap_pct||0).toFixed(2)+'%', '#00ff88') : '<div style="font-size:10px;color:var(--text3);">No data</div>'}
          ${u.n ? bgStat('Gap fill rate', (u.fill_rate||0)+'%', u.fill_rate>=50?'#ff8800':'#00ccff') : ''}
          ${u.n ? bgStat('First hour range', (u.avg_fh_range||0).toFixed(2)+'%', '#ffcc00') : ''}
          ${u.n ? bgStat('First hour up', (u.fh_up_pct||0)+'%', u.fh_up_pct>=55?'#00ff88':u.fh_up_pct<=45?'#ff3355':'#ffcc00') : ''}
          ${u.n ? bgStat('First hour predicts day', (u.fh_predicts_day||0)+'%', u.fh_predicts_day>=65?'#00ff88':'var(--text2)') : ''}
        </div>
        <div>
          <div style="font-family:'Orbitron',monospace;font-size:7px;color:#ff3355;margin-bottom:6px;letter-spacing:1px;">GAPPED DOWN ▼ (${dn.n||0} days)</div>
          ${dn.n ? bgStat('Avg gap size', (dn.avg_gap_pct||0).toFixed(2)+'%', '#ff3355') : '<div style="font-size:10px;color:var(--text3);">No data</div>'}
          ${dn.n ? bgStat('Gap fill rate', (dn.fill_rate||0)+'%', dn.fill_rate>=50?'#ff8800':'#00ccff') : ''}
          ${dn.n ? bgStat('First hour range', (dn.avg_fh_range||0).toFixed(2)+'%', '#ffcc00') : ''}
          ${dn.n ? bgStat('First hour up', (dn.fh_up_pct||0)+'%', dn.fh_up_pct>=55?'#00ff88':dn.fh_up_pct<=45?'#ff3355':'#ffcc00') : ''}
          ${dn.n ? bgStat('First hour predicts day', (dn.fh_predicts_day||0)+'%', dn.fh_predicts_day>=65?'#00ff88':'var(--text2)') : ''}
        </div>
      </div>
    </div>`;
  };

  const bigGapHtml = `
    <div style="font-size:11px;color:var(--text2);line-height:1.7;margin-bottom:12px;">
      These cards isolate only the biggest gap days — when SPY opened 1%, 1.5%, or 2%+ away from the prior close.
      Big gaps tend to produce wider first hours and higher day ranges.
      <strong>Gap fill rate</strong> shows how often the gap was fully closed by session end.
      <strong>First hour predicts day</strong> shows how reliable the first-hour direction was for the full session.
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
      ${bgCard('GAPS ≥ 1.0%','1pct','#ff8800')}
      ${bgCard('GAPS ≥ 1.5%','1pt5pct','#ff5500')}
      ${bgCard('GAPS ≥ 2.0%','2pct','#ff3355')}
    </div>`;

  // ── Data note ──────────────────────────────────────────────────────────────
  const dataNote = `<div style="font-size:10px;color:var(--text3);text-align:right;line-height:1.7;">
    <div>${D.n} session pairs · 1-min intraday bars · data from Jul 2024</div>
    <div>Power Hour = 1:00–2:00pm CT (previous day) · First Hour = 9:30–10:30am CT (current day)</div>
    <div>Gap = (today's open − prior close) ÷ prior close × 100 · Gap Fill = price touched prior close during session</div>
  </div>`;

  el.innerHTML = _gsIntro + `<div style="padding:14px 16px;max-width:1400px;margin:0 auto;">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:12px;">⬡ GAP STATS — PREVIOUS DAY POWER HOUR + NEXT MORNING ANALYSIS</div>
        <div style="margin-bottom:8px;">
          <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:5px;">TIME PERIOD</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;">${lbBtns}</div>
        </div>
        <div>
          <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:5px;">FILTER BY DAY OF WEEK</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;">${dowBtns}</div>
        </div>
      </div>
      ${dataNote}
    </div>
    ${section('⬡ AT A GLANCE — SUMMARY FOR THIS PERIOD','var(--cyan)', summaryHtml)}
    ${section('⬡ HOW EACH GAP TYPE BEHAVES — WHAT CAME BEFORE & AFTER','#00ccff', `<div style="font-size:11px;color:var(--text2);margin-bottom:14px;line-height:1.7;">Sessions are split into three groups based on how SPY opened vs the prior close. For each group, you can see what the previous day's Power Hour (1–2pm CT) looked like, and how the first hour after the open played out. <strong>Gap fill rate</strong> = how often SPY traded back to touch the prior close price during the session. <strong>First hour predicts day</strong> = how often the first-hour direction matched where SPY closed at end of day.</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">${gapCards}</div>`)}
    ${section('⬡ PREVIOUS DAY POWER HOUR STRENGTH → NEXT MORNING GAP','#ffcc00', phBinHtml)}
    ${section('⬡ KEY PATTERNS — LATE MOMENTUM, GAP FILLS, VOLATILITY','#8855ff', signalHtml)}
    ${section('⬡ GAP PATTERNS BY DAY OF WEEK','#ff8800', `${dowNote?`<div style="font-size:11px;color:var(--text2);line-height:1.7;margin-bottom:14px;">${dowNote}</div>`:''}<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;">${dowCards}</div>`)}
    ${section('⬡ LARGE GAP BEHAVIOR — 1%, 1.5%, AND 2%+ GAPS ONLY','#ff3355', bigGapHtml)}
    ${section('⬡ GAP FOLLOW-THROUGH — CONTINUATION VS REVERSAL','#00ff88', (() => {
  const gb = D.gap_breakdown || {};
  const up = gb.GAP_UP || {};
  const dn = gb.GAP_DOWN || {};
  const sig = D.signals || {};

  const ftRow = (label, val, color, note) =>
    `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <span style="font-size:11px;color:var(--text3);">${label}</span>
      <span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${color};">${val}${note?`<span style="font-size:10px;color:var(--text3);margin-left:6px;">${note}</span>`:''}</span>
    </div>`;

  const ftCard = (title, color, data, gapDir) => {
    if (!data.n) return '';
    const continued = gapDir === 'up' ? data.fh_up_pct : (100 - (data.fh_up_pct||0));
    const reversed  = 100 - continued;
    const dayMove   = data.avg_day_move || 0;
    const dayColor  = dayMove > 0.2 ? '#00ff88' : dayMove < -0.2 ? '#ff3355' : 'var(--text2)';
    const fillColor = (data.fill_rate||0) >= 50 ? '#ff8800' : '#00ccff';
    const contColor = continued >= 55 ? '#00ff88' : continued <= 45 ? '#ff3355' : '#ffcc00';
    return `<div style="background:var(--bg2);border:1px solid var(--border);border-top:3px solid ${color};border-radius:4px;padding:14px;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;color:${color};margin-bottom:4px;">${title}</div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:12px;">${data.n} sessions · avg gap ${gapDir==='up'?'+':''}${(data.avg_gap_pct||0).toFixed(2)}%</div>
      ${ftRow('Continued in gap direction', continued.toFixed(0)+'%', contColor)}
      ${ftRow('Reversed against gap', reversed.toFixed(0)+'%', reversed>=55?'#ff8800':'var(--text2)')}
      ${ftRow('Gap filled same session', (data.fill_rate||0)+'%', fillColor)}
      ${ftRow('Avg full-day return', (dayMove>=0?'+':'')+dayMove.toFixed(2)+'%', dayColor)}
      ${ftRow('Avg full-day range', '$'+(data.avg_day_range||0).toFixed(2), '#ffcc00')}
      ${ftRow('1st hour predicts close', (data.fh_predicts_day||0)+'%', (data.fh_predicts_day||0)>=65?'#00ff88':'var(--text2)', '% accuracy')}
    </div>`;
  };

  // Gap + session decline combo (from signals)
  const momentumNote = sig.momentum_n ? `${sig.momentum_n} sessions where 1st hour continued gap direction → filled ${sig.momentum_fill}% of the time` : '';
  const reversalNote = sig.reversal_n ? `${sig.reversal_n} sessions where 1st hour reversed vs gap → filled ${sig.reversal_fill}% of the time` : '';

  return `<div style="font-size:11px;color:var(--text2);line-height:1.7;margin-bottom:14px;">
    When SPY gaps, what happens <em>during the session</em>? This section breaks down how often the gap direction continued vs reversed,
    how often the gap filled, and what the average full-day return looked like.
    <strong>Continued</strong> means the first hour moved in the same direction as the gap.
    <strong>Gap filled</strong> means price traded back to the prior close at some point during the session.
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
    ${ftCard('GAP UP — FOLLOW-THROUGH', '#00ff88', up, 'up')}
    ${ftCard('GAP DOWN — FOLLOW-THROUGH', '#ff3355', dn, 'down')}
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
    <div style="background:var(--bg2);border:1px solid var(--border);border-top:3px solid #00ccff;border-radius:4px;padding:14px;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;color:#00ccff;margin-bottom:10px;">MOMENTUM DAYS — 1ST HOUR WITH GAP</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8;">${momentumNote || 'No data'}</div>
      ${sig.late_surge_n ? `<div style="margin-top:8px;font-size:11px;color:var(--text3);">${sig.late_surge_n} gap-up sessions had a late surge → gap filled ${sig.late_surge_gap_up}% of the time</div>` : ''}
    </div>
    <div style="background:var(--bg2);border:1px solid var(--border);border-top:3px solid #ff8800;border-radius:4px;padding:14px;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;color:#ff8800;margin-bottom:10px;">REVERSAL DAYS — 1ST HOUR AGAINST GAP</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8;">${reversalNote || 'No data'}</div>
      ${sig.late_fade_n ? `<div style="margin-top:8px;font-size:11px;color:var(--text3);">${sig.late_fade_n} gap-down sessions had a late fade → closed below gap ${sig.late_fade_gap_dn}% of the time</div>` : ''}
    </div>
  </div>`;
})())}
  </div>`;
}



// ─────────────────────────────────────────────────────────────────────────────
// TIME OF DAY — full intraday timing analysis tab
// ─────────────────────────────────────────────────────────────────────────────
let _todLookback = 'all';
let _todDow      = 'all';
window._todSetLb  = v => { _todLookback = v; renderTimeOfDay(); };
window._todSetDow = v => { _todDow = v;      renderTimeOfDay(); };

function renderTimeOfDay() {
  // ── Tab intro banner ─────────────────────────────────────────────────────────
  const _todIntro = `<div style="background:rgba(0,204,255,0.04);border:1px solid rgba(0,204,255,0.12);border-radius:4px;padding:14px 18px;margin-bottom:14px;font-size:12px;color:var(--text2);line-height:1.8;">
    <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--cyan);letter-spacing:2px;margin-bottom:8px;">⬡ WHAT IS THIS TAB?</div>
    <strong style="color:var(--text1);">Time of Day Stats</strong> maps SPY's intraday behavior by the clock — when does the day's high and low typically form?
    When does volume spike? When does price drift? Built from years of 1-minute bars filtered by day of week and lookback period.
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px;font-size:11px;">
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid var(--cyan);">
        <div style="color:var(--cyan);font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">HIGH OF DAY TIMING</div>
        Which 30-minute bucket most often produces the session high? The open spike at 9:30 is real — but how real, and does it vary by day of week?
      </div>
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid #ff3355;">
        <div style="color:#ff3355;font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">LOW OF DAY TIMING</div>
        When does SPY typically find its session low? Morning weakness, midday lows, and late-day capitulation all show up differently in the data.
      </div>
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid #ffcc00;">
        <div style="color:#ffcc00;font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">VOLUME BY TIME</div>
        Volume is not evenly distributed. The open and close dominate. This shows the exact volume profile through the day so you know when liquidity is thin.
      </div>
    </div>
  </div>`;
  const el = document.getElementById('todStatsContent');
  if (!el) return;
  if (typeof TOD_STATS === 'undefined' || typeof INTRADAY_SESSION_STATS === 'undefined') {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text3);">Time of day data not loaded.</div>';
    return;
  }

  const T   = TOD_STATS;
  const ALL = INTRADAY_SESSION_STATS;
  const curYear = new Date().getFullYear();

  // ── Filter sessions ────────────────────────────────────────────────────────
  const DOW_MAP = { Mon:1, Tue:2, Wed:3, Thu:4, Fri:5 };
  function sessionDow(dateStr) {
    const d = new Date(dateStr + 'T12:00:00Z');
    return d.getDay(); // 0=Sun..6=Sat
  }
  function filterSessions(sessions) {
    return sessions.filter(s => {
      if (!s.date) return false;
      if (_todLookback === 'year' && !s.date.startsWith(String(curYear))) return false;
      if (_todLookback === '12m') {
        const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 1);
        if (new Date(s.date) < cutoff) return false;
      }
      if (_todDow !== 'all') {
        const dow = sessionDow(s.date);
        if (dow !== DOW_MAP[_todDow]) return false;
      }
      return true;
    });
  }

  const sessions = filterSessions(ALL);
  const n = sessions.length;

  // ── TOD_STATS bucket filtering (same logic as intraday_data.js) ────────────
  const DOW_IDX = { Mon:0, Tue:1, Wed:2, Thu:3, Fri:4 };
  const bucketLabels = T.buckets;
  const BUCKET_COLORS = ['#ff8800','#ffcc00','#00ff88','#00ccff','#8855ff','#00ccff','#ffcc00','#ff5500'];

  let yearScale = 1.0;
  if (_todLookback === 'year') {
    const allN  = ALL.length;
    const yearN = ALL.filter(s => s.date && s.date.startsWith(String(curYear))).length;
    yearScale   = allN > 0 ? yearN / allN : 1;
  }

  function todBuckets(byDow) {
    let counts;
    if (_todDow === 'all') {
      counts = new Array(8).fill(0);
      byDow.forEach(row => row.counts.forEach((c,i) => { counts[i] += c; }));
    } else {
      const idx = DOW_IDX[_todDow];
      counts = idx !== undefined ? [...(byDow[idx]?.counts || new Array(8).fill(0))] : new Array(8).fill(0);
    }
    if (_todLookback === 'year' && yearScale < 1) counts = counts.map(c => Math.round(c * yearScale));
    const total = counts.reduce((s,c)=>s+c,0) || 1;
    return bucketLabels.map((label,i) => ({ label, count:counts[i], pct:counts[i]/total*100 }));
  }

  const hodBuckets = todBuckets(T.hod.by_dow);
  const lodBuckets = todBuckets(T.lod.by_dow);

  // ── Shared helpers ─────────────────────────────────────────────────────────
  const fbtn = (lbl, active, fn) =>
    `<button onclick="${fn}" style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;padding:3px 10px;background:${active?'rgba(0,204,255,0.15)':'var(--bg3)'};border:1px solid ${active?'var(--cyan)':'var(--border)'};border-radius:3px;color:${active?'var(--cyan)':'var(--text2)'};cursor:pointer;">${lbl}</button>`;

  const lbBtns = ['all','12m','year'].map(v =>
    fbtn(v==='all'?'ALL HISTORY':v==='12m'?'12 MONTHS':String(curYear)+' YTD', _todLookback===v, `_todSetLb('${v}')`)
  ).join(' ');
  const dowBtns = ['all','Mon','Tue','Wed','Thu','Fri'].map(d =>
    fbtn(d==='all'?'ALL DAYS':d.toUpperCase(), _todDow===d, `_todSetDow('${d}')`)
  ).join(' ');

  const _gsCollapsed = window._gsCollapsed || {};
  window._gsCollapsed = _gsCollapsed;
  const section = (title, color, body) => {
    const sid = 'gs_' + title.replace(/[^a-z0-9]/gi,'_').slice(0,20);
    const isOpen = _gsCollapsed[sid] !== true;
    return `<div style="background:var(--bg2);border:1px solid var(--border);border-left:3px solid ${color};border-radius:4px;margin-bottom:10px;overflow:hidden;">
      <div onclick="window._gsCollapsed['${sid}']=!window._gsCollapsed['${sid}'];this.parentElement.querySelector('.gs-body').style.display=window._gsCollapsed['${sid}']?'none':'block';this.querySelector('.gs-chevron').textContent=window._gsCollapsed['${sid}']?'▶':'▼';"
        style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;cursor:pointer;user-select:none;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:${color};">${title}</div>
        <span class="gs-chevron" style="font-size:9px;color:${color};">${isOpen?'▼':'▶'}</span>
      </div>
      <div class="gs-body" style="padding:0 16px 16px;display:${isOpen?'block':'none'};">${body}</div>
    </div>`;
  };

  const explain = t =>
    `<div style="font-size:11px;color:var(--text2);line-height:1.7;margin-bottom:14px;">${t}</div>`;

  const statCard = (label, value, color, note) =>
    `<div style="background:var(--bg3);border-radius:4px;padding:12px;text-align:center;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:4px;letter-spacing:1px;">${label}</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:20px;font-weight:bold;color:${color};">${value}</div>
      ${note?`<div style="font-size:9px;color:var(--text3);margin-top:3px;">${note}</div>`:''}
    </div>`;

  // ── PANEL 1: HOD/LOD bucket bar charts ────────────────────────────────────
  function bucketBar(buckets, color) {
    const maxP = Math.max(...buckets.map(b=>b.pct), 1);
    const top  = buckets.reduce((a,b)=>b.pct>a.pct?b:a);
    return buckets.map((b,i) => {
      const w   = Math.round(b.pct / maxP * 100);
      const isT = b.label === top.label;
      const c   = BUCKET_COLORS[i];
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:2px 4px;${isT?'background:rgba(255,255,255,0.03);border-radius:3px;':''}">
        <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:${isT?c:'var(--text3)'};width:82px;flex-shrink:0;white-space:nowrap;">${b.label}${isT?' ★':''}</div>
        <div style="flex:1;height:20px;background:var(--bg3);border-radius:2px;overflow:hidden;">
          <div style="width:${w}%;height:100%;background:${c};opacity:${isT?0.9:0.55};border-radius:2px;"></div>
        </div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${isT?c:'var(--text2)'};width:40px;text-align:right;font-weight:${isT?'bold':'normal'};">${b.pct.toFixed(1)}%</div>
        <div style="font-size:10px;color:var(--text3);width:30px;text-align:right;">${b.count}</div>
      </div>`;
    }).join('') +
    `<div style="font-size:10px;color:var(--text3);margin-top:6px;padding:0 4px;">★ Most common: <span style="color:${BUCKET_COLORS[buckets.indexOf(top)]};">${top.label}</span> (${top.pct.toFixed(1)}% of ${_todLookback==='year'?String(curYear)+' YTD':_todLookback==='12m'?'last 12mo':'all'} sessions)</div>`;
  }

  const hodTop = hodBuckets.reduce((a,b)=>b.pct>a.pct?b:a);
  const lodTop = lodBuckets.reduce((a,b)=>b.pct>a.pct?b:a);
  const seqHodFirst = T.sequence.hod_before_lod?.pct ?? 0;
  const seqLodFirst = T.sequence.hod_after_lod?.pct  ?? 0;

  const panel1Body = explain(`Each bar shows what percentage of sessions had their High of Day (or Low of Day) set during that time window.
    For example, if the <strong>8:30–9:00</strong> bar shows 22%, it means the session's absolute high (or low) was printed in the first 30 minutes on 22% of all days.
    <br><br>This tells you <em>when to pay attention</em>: if the HOD is most likely to be set in the first 30 minutes or in the close window, you know the morning open and the power hour are the two highest-risk/highest-opportunity windows.
    The mid-day buckets (10:30–2:00) are where extremes are set least often — that's the "grind" period with the lowest edge.
    <br><br>Data: ${n > 0 ? n : T.days} sessions · ${T.date_range.start} → ${T.date_range.end} · 1-min bars · Central Time`) +
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:#00ff88;margin-bottom:10px;letter-spacing:1px;">▲ HIGH OF DAY — WHEN IS IT SET?</div>
        ${bucketBar(hodBuckets,'#00ff88')}
      </div>
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:#ff3355;margin-bottom:10px;letter-spacing:1px;">▼ LOW OF DAY — WHEN IS IT SET?</div>
        ${bucketBar(lodBuckets,'#ff3355')}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px;">
      ${statCard('AVG HOD TIME', T.hod.avg_time+' CT', '#00ff88', 'Average time HOD is set')}
      ${statCard('AVG LOD TIME', T.lod.avg_time+' CT', '#ff3355', 'Average time LOD is set')}
      ${statCard('HOD BEFORE LOD', seqHodFirst.toFixed(0)+'%', '#ffcc00', 'HOD prints first then LOD')}
      ${statCard('LOD BEFORE HOD', seqLodFirst.toFixed(0)+'%', '#00ccff', 'LOD prints first then HOD')}
    </div>`;

  // ── PANEL 2: HOD/LOD heatmap by DOW ──────────────────────────────────────
  const dowNames = ['Mon','Tue','Wed','Thu','Fri'];
  const hodHeatRows = T.hod.by_dow.map((hd,i) => {
    const maxP = Math.max(...hd.pcts);
    const cells = hd.pcts.map((p,j) => {
      const alpha = maxP > 0 ? Math.round((p/maxP)*180) : 0;
      const hex   = alpha.toString(16).padStart(2,'0');
      return `<td style="padding:5px 4px;text-align:center;background:#00ff88${hex};border-radius:2px;">
        <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:${p===maxP?'#000':'var(--text2)'};">${p.toFixed(0)}%</div>
        <div style="font-size:8px;color:${p===maxP?'#000':'var(--text3)'};">${hd.counts[j]}</div>
      </td>`;
    }).join('');
    const total = hd.counts.reduce((a,b)=>a+b,0);
    return `<tr>
      <td style="font-family:'Orbitron',monospace;font-size:9px;color:var(--cyan);padding:5px 8px;white-space:nowrap;">${hd.dow}</td>
      ${cells}
      <td style="font-size:9px;color:var(--text3);padding:5px 6px;text-align:right;">${total}d</td>
    </tr>`;
  }).join('');

  const lodHeatRows = T.lod.by_dow.map((ld,i) => {
    const maxP = Math.max(...ld.pcts);
    const cells = ld.pcts.map((p,j) => {
      const alpha = maxP > 0 ? Math.round((p/maxP)*180) : 0;
      const hex   = alpha.toString(16).padStart(2,'0');
      return `<td style="padding:5px 4px;text-align:center;background:#ff3355${hex};border-radius:2px;">
        <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:${p===maxP?'#fff':'var(--text2)'};">${p.toFixed(0)}%</div>
        <div style="font-size:8px;color:${p===maxP?'#fff':'var(--text3)'};">${ld.counts[j]}</div>
      </td>`;
    }).join('');
    const total = ld.counts.reduce((a,b)=>a+b,0);
    return `<tr>
      <td style="font-family:'Orbitron',monospace;font-size:9px;color:var(--cyan);padding:5px 8px;white-space:nowrap;">${ld.dow}</td>
      ${cells}
      <td style="font-size:9px;color:var(--text3);padding:5px 6px;text-align:right;">${total}d</td>
    </tr>`;
  }).join('');

  const heatHeaders = bucketLabels.map(l =>
    `<th style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);padding:4px 4px;text-align:center;white-space:nowrap;">${l}</th>`
  ).join('');

  const panel2Body = explain(`These heatmaps show the same HOD/LOD timing data broken down by <strong>day of week</strong>.
    Each cell shows what percentage of sessions on that day had their high (or low) set during that time bucket.
    Darker color = more common. Numbers show percentage on top and raw session count below.
    <br><br>Day-of-week patterns are real and persistent. For example, <strong>Friday</strong> tends to see the HOD set later in the day more often — possibly because of end-of-week position squaring in the close.
    <strong>Wednesday</strong> has outsized open-hour HOD frequency on some lookbacks due to Fed days.
    Reading across a row tells you: on this day of the week, when should I be watching for the day's extreme?`) +
    `<div style="overflow-x:auto;margin-bottom:14px;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:#00ff88;margin-bottom:6px;">▲ HIGH OF DAY BY DOW</div>
      <table style="width:100%;border-collapse:separate;border-spacing:2px;">
        <thead><tr><th style="padding:4px 8px;text-align:left;"></th>${heatHeaders}<th></th></tr></thead>
        <tbody>${hodHeatRows}</tbody>
      </table>
    </div>
    <div style="overflow-x:auto;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:#ff3355;margin-bottom:6px;">▼ LOW OF DAY BY DOW</div>
      <table style="width:100%;border-collapse:separate;border-spacing:2px;">
        <thead><tr><th style="padding:4px 8px;text-align:left;"></th>${heatHeaders}<th></th></tr></thead>
        <tbody>${lodHeatRows}</tbody>
      </table>
    </div>`;

  // ── PANEL 3: Best/worst 5-min bar timing (from INTRADAY_SESSION_STATS) ─────
  function timeToMins(t) {
    if (!t) return null;
    const [h,m] = t.split(':').map(Number);
    return h*60+m;
  }
  function minsToLabel(m) {
    // Map minute to bucket label
    if (m < 9*60)   return '8:30-9:00';
    if (m < 9*60+30) return '9:00-9:30';
    if (m < 10*60+30) return '9:30-10:30';
    if (m < 12*60)   return '10:30-12:00';
    if (m < 13*60)   return '12:00-1:00';
    if (m < 14*60)   return '1:00-2:00';
    if (m < 14*60+30) return '2:00-2:30';
    return '2:30-3:00';
  }

  // Count best/worst 5m times into buckets
  const best5mCounts  = Object.fromEntries(bucketLabels.map(l=>[l,0]));
  const worst5mCounts = Object.fromEntries(bucketLabels.map(l=>[l,0]));
  let best5mTotal = 0, worst5mTotal = 0;

  sessions.forEach(s => {
    if (s.best_5m_time) {
      const bucket = minsToLabel(timeToMins(s.best_5m_time));
      if (best5mCounts[bucket] !== undefined) { best5mCounts[bucket]++; best5mTotal++; }
    }
    if (s.worst_5m_time) {
      const bucket = minsToLabel(timeToMins(s.worst_5m_time));
      if (worst5mCounts[bucket] !== undefined) { worst5mCounts[bucket]++; worst5mTotal++; }
    }
  });

  function miniBarChart(countsObj, total, color) {
    const maxC = Math.max(...Object.values(countsObj), 1);
    return bucketLabels.map((l,i) => {
      const c   = countsObj[l] || 0;
      const pct = total > 0 ? (c/total*100) : 0;
      const w   = Math.round(c/maxC*100);
      const col = BUCKET_COLORS[i];
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;padding:1px 4px;">
        <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text3);width:82px;flex-shrink:0;white-space:nowrap;">${l}</div>
        <div style="flex:1;height:18px;background:var(--bg3);border-radius:2px;overflow:hidden;">
          <div style="width:${w}%;height:100%;background:${col};opacity:0.7;border-radius:2px;"></div>
        </div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);width:40px;text-align:right;">${pct.toFixed(1)}%</div>
        <div style="font-size:10px;color:var(--text3);width:24px;text-align:right;">${c}</div>
      </div>`;
    }).join('');
  }

  const panel3Body = explain(`Every session has a single best 5-minute bar (the biggest up move in any 5-min window) and a worst 5-minute bar (the biggest down move).
    These charts show which time bucket those bars fell into most often across your filtered sessions.
    <br><br><strong>Best 5-min bar</strong> timing tells you when the strongest single-burst momentum tends to occur — useful for knowing when to have positions on for potential explosive moves.
    <strong>Worst 5-min bar</strong> timing shows when the sharpest drops happen — useful for understanding stop-risk timing.
    Note that "best" and "worst" are measured by percent move within that 5-minute candle, not by direction relative to the day.
    <br><br>Based on ${n} sessions with the current filter (${_todLookback==='all'?'all history':_todLookback==='12m'?'12 months':curYear+' YTD'}${_todDow!=='all'?' · '+_todDow:''}). Source: 1-min bars aggregated to 5-min.`) +
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:#00ff88;margin-bottom:10px;letter-spacing:1px;">▲ BEST 5-MIN BAR — WHEN DOES IT OCCUR?</div>
        ${miniBarChart(best5mCounts, best5mTotal, '#00ff88')}
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">${best5mTotal} sessions with data</div>
      </div>
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:#ff3355;margin-bottom:10px;letter-spacing:1px;">▼ WORST 5-MIN BAR — WHEN DOES IT OCCUR?</div>
        ${miniBarChart(worst5mCounts, worst5mTotal, '#ff3355')}
        <div style="font-size:10px;color:var(--text3);margin-top:6px;">${worst5mTotal} sessions with data</div>
      </div>
    </div>`;

  // ── PANEL 4: OR break timing + Gap fill timing ────────────────────────────
  const orBreakCounts = Object.fromEntries(bucketLabels.map(l=>[l,0]));
  const gapFillCounts = Object.fromEntries(bucketLabels.map(l=>[l,0]));
  let orBreakTotal = 0, gapFillTotal = 0, noBreak = 0, noFill = 0;

  sessions.forEach(s => {
    if (s.or_break_time) {
      const b = minsToLabel(timeToMins(s.or_break_time));
      if (orBreakCounts[b] !== undefined) { orBreakCounts[b]++; orBreakTotal++; }
    } else { noBreak++; }
    if (s.gap_filled && s.gap_fill_time) {
      const b = minsToLabel(timeToMins(s.gap_fill_time));
      if (gapFillCounts[b] !== undefined) { gapFillCounts[b]++; gapFillTotal++; }
    } else if (s.gap_type !== 'FLAT') { noFill++; }
  });

  const orBreakPct = n > 0 ? ((orBreakTotal/(orBreakTotal+noBreak))*100).toFixed(0) : '—';
  const gapFillableSessions = sessions.filter(s=>s.gap_type!=='FLAT');
  const gapFillPct = gapFillableSessions.length > 0 ?
    ((gapFillableSessions.filter(s=>s.gap_filled).length / gapFillableSessions.length)*100).toFixed(0) : '—';

  const panel4Body = explain(`<strong>Opening Range (OR) break timing:</strong> The Opening Range is defined as the high and low of the first 30 minutes (8:30–9:00 CT).
    An OR break occurs when price moves decisively above or below that initial range.
    This chart shows which time bucket the OR break happened in most often. Early breaks (still in the open window) suggest strong directional conviction.
    Late breaks (2:00pm+ CT) suggest the market spent the day consolidating before making its move.
    <br><br><strong>Gap fill timing:</strong> On days when SPY opens with a gap (up or down), this shows when the gap fill occurred — i.e. when price returned to touch the prior close.
    Early gap fills leave the rest of the day open for a new trend. Late gap fills often come with the power hour.
    Days where no fill occurs by close are counted separately.
    <br><br>Based on ${n} sessions. OR break rate: ${orBreakPct}% of sessions broke the OR. Gap fill rate: ${gapFillPct}% of gapping sessions filled.`) +
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px;">
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:#ffcc00;margin-bottom:10px;letter-spacing:1px;">⬡ OPENING RANGE BREAK — WHEN?</div>
        ${miniBarChart(orBreakCounts, orBreakTotal, '#ffcc00')}
        <div style="display:flex;gap:12px;margin-top:8px;font-size:10px;color:var(--text3);">
          <span>${orBreakTotal} sessions broke OR (${orBreakPct}%)</span>
          <span>${noBreak} sessions no break</span>
        </div>
      </div>
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:#8855ff;margin-bottom:10px;letter-spacing:1px;">⬡ GAP FILL — WHEN DOES IT HAPPEN?</div>
        ${miniBarChart(gapFillCounts, gapFillTotal, '#8855ff')}
        <div style="display:flex;gap:12px;margin-top:8px;font-size:10px;color:var(--text3);">
          <span>${gapFillTotal} fills (${gapFillPct}% of gaps)</span>
          <span>${gapFillableSessions.length-gapFillTotal} unfilled</span>
        </div>
      </div>
    </div>`;

  // ── PANEL 5: Intraday range stats by session phase ─────────────────────────
  // Compute average range metrics per bucket using sessions data
  const orRanges = sessions.filter(s=>s.or_range!=null).map(s=>s.or_range);
  const dayRanges= sessions.filter(s=>s.day_range_pct!=null).map(s=>s.day_range_pct);
  const lunchRanges = sessions.filter(s=>s.lunch_range_pct!=null).map(s=>s.lunch_range_pct);
  const phRanges = sessions.filter(s=>s.power_hour_pct!=null).map(s=>s.power_hour_pct);

  const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;
  const med = arr => { if(!arr.length) return null; const s=[...arr].sort((a,b)=>a-b); return s[Math.floor(s.length/2)]; };
  const f2  = v => v!=null ? v.toFixed(2)+'%' : '—';
  const f3  = v => v!=null ? v.toFixed(3) : '—';

  const phUpDays = sessions.filter(s=>s.power_hour_dir==='UP').length;
  const phDnDays = sessions.filter(s=>s.power_hour_dir==='DOWN').length;
  const phDirTotal = phUpDays + phDnDays;

  const panel5Body = explain(`These statistics describe the typical <strong>size</strong> of moves in different phases of the session, measured across your filtered sessions.
    <strong>Opening Range (OR) range</strong> is the percent spread from OR low to OR high — how wide the first 30 minutes were.
    <strong>Day range</strong> is the full session high-to-low spread as a percent of price.
    <strong>Lunch range</strong> is the range from 12:00–1:00pm CT — the quietest mid-day window.
    <strong>Power hour range</strong> covers 2:30–3:30pm CT and shows how active the late-day window is.
    <br><br>The ratio of OR range to day range tells you how much of the day's total move was "used up" in the first 30 minutes.
    A high ratio means the open set the tone early and the rest of the day was quieter. A low ratio means the day's real range built throughout the session.`) +
    `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">
      ${statCard('OR RANGE AVG', f2(avg(orRanges)), '#ffcc00', `${orRanges.length} sessions`)}
      ${statCard('OR RANGE MED', f2(med(orRanges)), '#ffcc00', 'median')}
      ${statCard('DAY RANGE AVG', f2(avg(dayRanges)), '#00ccff', `${dayRanges.length} sessions`)}
      ${statCard('DAY RANGE MED', f2(med(dayRanges)), '#00ccff', 'median')}
      ${statCard('LUNCH RANGE AVG', f2(avg(lunchRanges)), '#8855ff', `${lunchRanges.length} sessions`)}
      ${statCard('PH RANGE AVG', f2(avg(phRanges)), '#ff8800', `${phRanges.length} sessions`)}
      ${statCard('PH UP DAYS', phDirTotal>0?(phUpDays/phDirTotal*100).toFixed(0)+'%':'—', '#00ff88', `${phUpDays} of ${phDirTotal}`)}
      ${statCard('PH DOWN DAYS', phDirTotal>0?(phDnDays/phDirTotal*100).toFixed(0)+'%':'—', '#ff3355', `${phDnDays} of ${phDirTotal}`)}
    </div>
    <div style="background:var(--bg3);border-radius:4px;padding:12px;font-size:11px;color:var(--text2);line-height:1.7;">
      <strong style="color:var(--cyan);">OR-to-Day Ratio:</strong>
      ${avg(orRanges)!=null && avg(dayRanges)!=null ?
        `The average OR range is <strong style="color:#ffcc00;">${f2(avg(orRanges))}</strong> and the average day range is <strong style="color:#00ccff;">${f2(avg(dayRanges))}</strong>.
        That means the first 30 minutes accounts for roughly <strong style="color:#ffcc00;">${(avg(orRanges)/avg(dayRanges)*100).toFixed(0)}%</strong> of the typical day's total range.
        ${avg(orRanges)/avg(dayRanges) > 0.5 ?
          'The open is doing most of the work — the market tends to find its range early.' :
          'The day builds its range over time — the open is just the starting point.'}` :
        'Insufficient data for this filter.'}
    </div>`;

  // ── PANEL 6: Sequence and flow summary ────────────────────────────────────
  // Gap up vs gap down HOD/LOD timing tendency from session data
  const gapUpSessions  = sessions.filter(s=>s.gap_type==='GAP_UP');
  const gapDnSessions  = sessions.filter(s=>s.gap_type==='GAP_DOWN');
  const flatSessions   = sessions.filter(s=>s.gap_type==='FLAT');

  function sessionAvgOR(arr) { return avg(arr.filter(s=>s.or_range!=null).map(s=>s.or_range)); }
  function sessionAvgRange(arr) { return avg(arr.filter(s=>s.day_range_pct!=null).map(s=>s.day_range_pct)); }
  function sessionPHUp(arr) { const t=arr.filter(s=>s.power_hour_dir); return t.length?arr.filter(s=>s.power_hour_dir==='UP').length/t.length*100:null; }

  const gapRows = [
    ['GAP UP ▲', gapUpSessions, '#00ff88'],
    ['FLAT OPEN', flatSessions, '#ffcc00'],
    ['GAP DOWN ▼', gapDnSessions, '#ff3355'],
  ].map(([label, arr, c]) => {
    if (!arr.length) return '';
    const orA  = sessionAvgOR(arr);
    const dRA  = sessionAvgRange(arr);
    const phU  = sessionPHUp(arr);
    const fillN = arr.filter(s=>s.gap_filled).length;
    const gappingArr = arr.filter(s=>s.gap_type!=='FLAT');
    return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
      <td style="font-family:'Orbitron',monospace;font-size:9px;color:${c};padding:7px 8px;white-space:nowrap;">${label}</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text3);padding:7px 8px;text-align:center;">${arr.length}</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:11px;color:#ffcc00;padding:7px 8px;text-align:right;">${orA!=null?f2(orA):'—'}</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:11px;color:#00ccff;padding:7px 8px;text-align:right;">${dRA!=null?f2(dRA):'—'}</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${phU!=null&&phU>55?'#00ff88':phU!=null&&phU<45?'#ff3355':'#ffcc00'};padding:7px 8px;text-align:right;">${phU!=null?phU.toFixed(0)+'%':'—'}</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${label==='FLAT OPEN'?'var(--text3)':(fillN/Math.max(arr.length,1)*100)>45?'#00ff88':'var(--text2)'};padding:7px 8px;text-align:right;">${label==='FLAT OPEN'?'—':(fillN+' / '+arr.length+' ('+((fillN/arr.length)*100).toFixed(0)+'%)')}</td>
    </tr>`;
  }).join('');

  const panel6Body = explain(`This table cross-references gap type with the intraday metrics above, letting you see how the session's timing and range characteristics differ based on how SPY opened.
    <strong>Gap Up days</strong> tend to have a specific OR width, day range, and power hour direction distribution.
    <strong>Gap Down days</strong> often have wider ORs and wider day ranges due to higher early volatility.
    <strong>Flat opens</strong> are the most "random" days — no directional bias is established at the open, so the session has to build its range from scratch.
    <br><br>The Power Hour Up% column shows how often the PH (2:30–3:30 CT) closed higher than it opened, by gap type — a useful edge for afternoon positioning.
    Gap Fill % shows how often each gap type was filled (only applicable for non-flat opens).`) +
    `<div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr>
          ${['GAP TYPE','SESSIONS','OR RANGE','DAY RANGE','PH UP%','GAP FILL'].map(h=>
            `<th style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);padding:5px 8px;text-align:${h==='GAP TYPE'?'left':'right'};">${h}</th>`
          ).join('')}
        </tr></thead>
        <tbody>${gapRows}</tbody>
      </table>
    </div>`;

  // ── Assemble ──────────────────────────────────────────────────────────────
  el.innerHTML = _todIntro + `<div style="padding:14px 16px;max-width:1400px;margin:0 auto;">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:10px;">⬡ TIME OF DAY — INTRADAY TIMING ANALYSIS</div>
        <div style="margin-bottom:6px;">
          <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">LOOKBACK</div>
          <div style="display:flex;gap:5px;">${lbBtns}</div>
        </div>
        <div>
          <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">DAY OF WEEK</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;">${dowBtns}</div>
        </div>
      </div>
      <div style="font-size:10px;color:var(--text3);text-align:right;line-height:1.7;">
        <div>${n} sessions in filter · ${T.days} total available</div>
        <div>${T.date_range.start} → ${T.date_range.end}</div>
        <div>1-min intraday bars · Central Time</div>
      </div>
    </div>
    ${n < 5 ? `<div style="padding:20px;text-align:center;color:#ff8800;font-family:'Share Tech Mono',monospace;font-size:12px;">⚠ Only ${n} sessions match this filter — results may not be statistically meaningful.</div>` : ''}
    ${section('⬡ WHEN IS THE HIGH AND LOW OF DAY SET?','var(--cyan)', panel1Body)}
    ${section('⬡ HOD / LOD TIMING HEATMAP BY DAY OF WEEK','#00ccff', panel2Body)}
    ${section('⬡ BEST AND WORST 5-MINUTE BAR — WHEN DO THEY OCCUR?','#00ff88', panel3Body)}
    ${section('⬡ OPENING RANGE BREAK AND GAP FILL TIMING','#ffcc00', panel4Body)}
    ${section('⬡ SESSION PHASE RANGE STATISTICS','#8855ff', panel5Body)}
    ${section('⬡ INTRADAY METRICS BY GAP TYPE','#ff8800', panel6Body)}
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared canvas line chart for session vol panels
// series = [{label, color, data:[], n}], xLabels = CT timestamp strings
// ─────────────────────────────────────────────────────────────────────────────
function _drawSvLineChart(canvasId, series, xLabels, dataMax) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const wrap = canvas.parentElement;
  const W = Math.max(wrap ? wrap.clientWidth - 2 : 800, 400);
  const H = 240;
  canvas.width  = W;
  canvas.height = H;
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const pad = { l:52, r:16, t:16, b:32 };
  const cW  = W - pad.l - pad.r;
  const cH  = H - pad.t - pad.b;
  const n   = series[0]?.data.length || 0;
  if (!n) return;

  const hi = dataMax * 1.05;
  const toX = i => pad.l + (i / (n - 1)) * cW;
  const toY = v => pad.t + cH - (v / hi) * cH;

  // Grid
  for (let g = 0; g <= 4; g++) {
    const gv = (hi / 4) * g;
    const gy = toY(gv);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(pad.l + cW, gy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#505070';
    ctx.font = '9px "Share Tech Mono",monospace';
    ctx.textAlign = 'right';
    ctx.fillText('$' + gv.toFixed(3), pad.l - 4, gy + 3);
  }

  // Hour markers on x axis
  xLabels.forEach((lbl, i) => {
    if (!lbl.endsWith(':00')) return;
    const x   = toX(i);
    const ct  = lbl;
    const h   = parseInt(ct);
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12  = h > 12 ? h - 12 : h;
    const disp = h12 + ampm;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + cH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#404060';
    ctx.font = '9px "Share Tech Mono",monospace';
    ctx.textAlign = 'center';
    ctx.fillText(disp, x, pad.t + cH + 18);
  });

  // Lines
  series.forEach(s => {
    if (!s.data.length) return;
    ctx.strokeStyle = s.color;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    s.data.forEach((v, i) => {
      const x = toX(i), y = toY(v);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    // End-of-line dot
    const lastX = toX(s.data.length - 1);
    const lastY = toY(s.data[s.data.length - 1]);
    ctx.fillStyle = s.color;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION VOLATILITY STATS — full analysis tab
// ─────────────────────────────────────────────────────────────────────────────
let _svStLookback = 'all';
let _svStDow      = 'all';
window._svStSetLb  = v => { _svStLookback = v; renderSessionVolStats(); };
window._svStSetDow = v => { _svStDow = v;      renderSessionVolStats(); };

function renderSessionVolStats() {
  // ── Tab intro banner ─────────────────────────────────────────────────────────
  const _svIntro = `<div style="background:rgba(0,204,255,0.04);border:1px solid rgba(0,204,255,0.12);border-radius:4px;padding:14px 18px;margin-bottom:14px;font-size:12px;color:var(--text2);line-height:1.8;">
    <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--cyan);letter-spacing:2px;margin-bottom:8px;">⬡ WHAT IS THIS TAB?</div>
    <strong style="color:var(--text1);">Session Volume Profile</strong> shows where volume actually traded throughout the day — not just total volume, but <em>where price was</em> when volume happened.
    High-volume nodes (HVNs) act as magnets and support/resistance. Low-volume nodes are air pockets where price moves fast.
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:10px;font-size:11px;">
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid var(--cyan);">
        <div style="color:var(--cyan);font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">VOLUME AT PRICE</div>
        The horizontal bar chart showing how much volume traded at each price level. The widest bars are where the market spent the most time and has the most interest.
      </div>
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid #ffcc00;">
        <div style="color:#ffcc00;font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">HIGH VOLUME NODES (HVN)</div>
        Price levels with unusually high volume concentration. These tend to act as support/resistance and are often where price stalls or reverses. Watch for retests.
      </div>
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid #ff8800;">
        <div style="color:#ff8800;font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">LOW VOLUME NODES (LVN)</div>
        Price gaps in the volume profile — levels where little trading occurred. Price tends to move through these quickly, making them useful for projecting targets.
      </div>
      <div style="background:var(--bg2);border-radius:3px;padding:8px 10px;border-left:2px solid #8855ff;">
        <div style="color:#8855ff;font-family:'Orbitron',monospace;font-size:8px;margin-bottom:4px;">POINT OF CONTROL (POC)</div>
        The single price level with the highest volume for the session. Often acts as a gravitational center — price rotates back to POC when momentum fades.
      </div>
    </div>
  </div>`;
  const el = document.getElementById('sessionVolContent');
  if (!el) return;
  if (typeof SESSION_VOL_PROFILE === 'undefined') {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text3);">Session vol profile data not loaded.</div>';
    return;
  }

  const curYear = new Date().getFullYear();
  const fbtn = (lbl, active, fn) =>
    `<button onclick="${fn}" style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;padding:3px 10px;background:${active?'rgba(0,204,255,0.15)':'var(--bg3)'};border:1px solid ${active?'var(--cyan)':'var(--border)'};border-radius:3px;color:${active?'var(--cyan)':'var(--text2)'};cursor:pointer;">${lbl}</button>`;

  const lbBtns = ['all','12m','year'].map(v =>
    fbtn(v==='all'?'ALL HISTORY':v==='12m'?'12 MONTHS':String(curYear)+' YTD', _svStLookback===v, `_svStSetLb('${v}')`)
  ).join(' ');
  const dowBtns = ['all','Mon','Tue','Wed','Thu','Fri'].map(d =>
    fbtn(d==='all'?'ALL DAYS':d.toUpperCase(), _svStDow===d, `_svStSetDow('${d}')`)
  ).join(' ');

  const key = _svStDow === 'all' ? _svStLookback : `${_svStLookback}_${_svStDow}`;
  const profile = SESSION_VOL_PROFILE[key];

  if (!profile || !profile.length) {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text3);">Not enough data for this filter.</div>';
    return;
  }

  // ET→CT conversion
  function etToCT(ts) {
    const [h, m] = ts.split(':').map(Number);
    let ch = h - 1; if (ch < 0) ch += 24;
    return `${ch}:${String(m).padStart(2,'0')}`;
  }
  function tsToMins(ts) { const [h,m]=ts.split(':').map(Number); return h*60+m; }

  const nowCT   = new Date(new Date().toLocaleString('en-US',{timeZone:'America/Chicago'}));
  const nowMins = nowCT.getHours()*60+nowCT.getMinutes();

  const avgs   = profile.map(b=>b.avg);
  const maxAvg = Math.max(...avgs);
  const minAvg = Math.min(...avgs);
  const sorted = [...profile].sort((a,b)=>b.avg-a.avg);
  const nSessions = profile[0]?.n ? Math.round(profile[0].n / 5) : '?';
  const openBar = profile[0];
  const openCT  = etToCT(openBar.ts);

  function volColor(v) {
    const pct = (v - minAvg) / (maxAvg - minAvg || 1);
    if (pct > 0.75) return '#ff3355';
    if (pct > 0.50) return '#ff8800';
    if (pct > 0.25) return '#ffcc00';
    return '#00cc88';
  }

  const _gsCollapsed = window._gsCollapsed || {};
  window._gsCollapsed = _gsCollapsed;
  const section = (title, color, body) => {
    const sid = 'gs_' + title.replace(/[^a-z0-9]/gi,'_').slice(0,20);
    const isOpen = _gsCollapsed[sid] !== true;
    return `<div style="background:var(--bg2);border:1px solid var(--border);border-left:3px solid ${color};border-radius:4px;margin-bottom:10px;overflow:hidden;">
      <div onclick="window._gsCollapsed['${sid}']=!window._gsCollapsed['${sid}'];this.parentElement.querySelector('.gs-body').style.display=window._gsCollapsed['${sid}']?'none':'block';this.querySelector('.gs-chevron').textContent=window._gsCollapsed['${sid}']?'▶':'▼';"
        style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;cursor:pointer;user-select:none;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:${color};">${title}</div>
        <span class="gs-chevron" style="font-size:9px;color:${color};">${isOpen?'▼':'▶'}</span>
      </div>
      <div class="gs-body" style="padding:0 16px 16px;display:${isOpen?'block':'none'};">${body}</div>
    </div>`;
  };

  const explain = text =>
    `<div style="font-size:11px;color:var(--text2);line-height:1.7;margin-bottom:14px;">${text}</div>`;

  // ── PANEL 1: Main bar chart ───────────────────────────────────────────────
  const bars1 = profile.map(b => {
    const ctTs  = etToCT(b.ts);
    const bMins = tsToMins(ctTs);
    const isNow = nowMins >= bMins && nowMins < bMins + 5;
    const barH  = Math.round((b.avg / maxAvg) * 100);
    const c     = isNow ? 'var(--cyan)' : volColor(b.avg);
    const isHour = b.ts.endsWith(':00');
    const label  = isHour ? ctTs.replace(':00','')+(parseInt(ctTs)>=12?'pm':'am') : '';
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;min-width:0;position:relative;" title="${ctTs} CT · $${b.avg.toFixed(4)} avg range${isNow?' · NOW':''}">
      ${isNow?`<div style="position:absolute;top:-14px;font-family:'Orbitron',monospace;font-size:7px;color:var(--cyan);">NOW</div>`:''}
      <div style="width:100%;display:flex;flex-direction:column;justify-content:flex-end;height:80px;background:var(--bg3);border-radius:2px 2px 0 0;overflow:hidden;${isNow?'border:1px solid var(--cyan);':''}">
        <div style="width:100%;background:${c};opacity:${isNow?1:0.8};height:${barH}%;border-radius:2px 2px 0 0;"></div>
      </div>
      <div style="font-family:'Orbitron',monospace;font-size:7px;color:${isHour?(isNow?'var(--cyan)':'var(--text2)'):'transparent'};white-space:nowrap;">${label||'·'}</div>
    </div>`;
  }).join('');

  const top3  = sorted.slice(0,3).map(b=>`<span style="color:#ff3355;">${etToCT(b.ts)} CT</span> <span style="color:var(--text3);font-size:10px;">($${b.avg.toFixed(3)})</span>`).join(' · ');
  const bot3  = sorted.slice(-3).map(b=>`<span style="color:#00cc88;">${etToCT(b.ts)} CT</span> <span style="color:var(--text3);font-size:10px;">($${b.avg.toFixed(3)})</span>`).join(' · ');
  const openPremium = openBar.avg;
  const midBars = profile.filter(b=>{ const m=tsToMins(etToCT(b.ts)); return m>=660&&m<780; }); // 11am–1pm CT
  const midAvg  = midBars.length ? midBars.reduce((a,b)=>a+b.avg,0)/midBars.length : 0;
  const openMult = midAvg>0 ? (openPremium/midAvg).toFixed(1) : '—';

  const summaryCards = [
    ['SESSIONS',     `~${nSessions}`,            'var(--cyan)',  'Total historical sessions used (all days × 5-min buckets, top 10% trimmed per bucket)'],
    ['OPEN PREMIUM', `${openMult}×`,             '#ff8800',     'How many times more volatile the open (8:30 CT) is vs the quietest mid-day period (11am–1pm CT)'],
    ['PEAK WINDOW',  etToCT(sorted[0].ts)+' CT', '#ff3355',     'The single 5-min window with the highest average dollar range across all historical sessions'],
    ['QUIETEST',     etToCT(sorted[sorted.length-1].ts)+' CT', '#00cc88', 'The calmest 5-min window of the session on average'],
    ['DATA RANGE',   `${_svStLookback==='all'?'All history':_svStLookback==='12m'?'12 months':curYear+' YTD'}${_svStDow!=='all'?' · '+_svStDow:''}`, 'var(--text2)', 'Current filter selection'],
  ].map(([l,v,c,tip])=>`<div style="background:var(--bg3);border-radius:4px;padding:12px;text-align:center;" title="${tip}">
    <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:4px;letter-spacing:1px;">${l}</div>
    <div style="font-family:'Share Tech Mono',monospace;font-size:18px;font-weight:bold;color:${c};">${v}</div>
  </div>`).join('');

  const panel1 = explain(`Each bar is one 5-minute window of the trading session, running from 8:30 CT (open) to 4:00 CT (close).
    The height represents the <strong>average dollar range</strong> SPY moved within that 5-minute window, measured across approximately <strong>${nSessions} historical sessions</strong>.
    The range for each bar is the session high minus the session low within that 5-minute candle, then averaged across all matching days.
    The top 10% most extreme bars are trimmed to reduce the effect of outlier days (e.g. flash crashes, circuit breakers).
    Color scale: <span style="color:#ff3355;">red = high vol</span>, <span style="color:#ff8800;">orange = elevated</span>, <span style="color:#ffcc00;">yellow = normal</span>, <span style="color:#00cc88;">green = quiet</span>.
    <br><br>The open spike at 8:30 CT is structural — the market is absorbing overnight news, gap reactions, and pre-market orders all at once.
    The close spike (3:50–4:00 CT) reflects end-of-day position squaring and index rebalancing.
    The mid-day trough (roughly 11am–1pm CT) is the quietest period of most sessions.`) +
    `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px;">${summaryCards}</div>
    <div style="display:flex;align-items:flex-end;gap:1px;padding:18px 0 4px;overflow:hidden;margin-bottom:8px;">${bars1}</div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;padding:8px;background:var(--bg3);border-radius:4px;margin-bottom:8px;">
      <div style="font-size:10px;">MOST VOLATILE: ${top3}</div>
      <div style="font-size:10px;">LEAST VOLATILE: ${bot3}</div>
    </div>
    <div style="font-size:10px;color:var(--text3);">
      <span style="display:inline-block;width:10px;height:10px;background:#ff3355;border-radius:2px;vertical-align:middle;margin-right:3px;"></span>High vol &nbsp;
      <span style="display:inline-block;width:10px;height:10px;background:#ff8800;border-radius:2px;vertical-align:middle;margin-right:3px;"></span>Elevated &nbsp;
      <span style="display:inline-block;width:10px;height:10px;background:#ffcc00;border-radius:2px;vertical-align:middle;margin-right:3px;"></span>Normal &nbsp;
      <span style="display:inline-block;width:10px;height:10px;background:#00cc88;border-radius:2px;vertical-align:middle;margin-right:3px;"></span>Quiet
    </div>`;

  // ── PANEL 2: DOW overlay — canvas line chart ────────────────────────────
  const DAYS = ['Mon','Tue','Wed','Thu','Fri'];
  const DAY_COLORS = { Mon:'#00ccff', Tue:'#00ff88', Wed:'#ffcc00', Thu:'#ff8800', Fri:'#ff3355' };
  const dayProfiles = {};
  DAYS.forEach(d => {
    const k = _svStLookback === 'all' ? `all_${d}` : `${_svStLookback}_${d}`;
    dayProfiles[d] = SESSION_VOL_PROFILE[k] || [];
  });
  const allDayAvgs = DAYS.flatMap(d => dayProfiles[d].map(b=>b.avg));
  const dayMax = Math.max(...allDayAvgs, 0.01);

  const dowNotes = DAYS.map(d => {
    const dp  = dayProfiles[d];
    if (!dp.length) return '';
    const nD  = dp[0]?.n ? Math.round(dp[0].n/5) : '?';
    const avgV = dp.reduce((a,b)=>a+b.avg,0)/dp.length;
    return `<div style="display:flex;align-items:center;gap:6px;font-size:10px;">
      <div style="width:22px;height:3px;background:${DAY_COLORS[d]};border-radius:2px;"></div>
      <span style="color:${DAY_COLORS[d]};font-family:'Orbitron',monospace;font-size:8px;">${d.toUpperCase()}</span>
      <span style="color:var(--text3);">avg $${avgV.toFixed(3)} · ~${nD} sessions</span>
    </div>`;
  }).join('');

  const panel2 = explain(`This chart overlays all five days of the week on the same axis so you can see how each day's <strong>intraday volatility profile differs by time of day</strong>.
    Each line is the average 5-min range for sessions on that day of the week, using the same lookback filter selected above.
    <br><br>Key things to notice: <strong>Friday afternoons</strong> often have elevated volatility as traders close positions before the weekend.
    <strong>Wednesday middays</strong> can be spiky around Fed meeting releases. <strong>Monday openings</strong> tend to be quieter than the rest of the week.
    The shape of the curve is consistent across days — open spike, mid-day trough, close surge — but the magnitude differs.
    A day-of-week with a persistently higher line is structurally more volatile throughout the session.`) +
    `<canvas id="svDowCanvas" style="width:100%;display:block;border-radius:4px;"></canvas>
    <div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:10px;">${dowNotes}</div>`;

  // ── PANEL 3: Volatility decay curve ──────────────────────────────────────
  const decayCurve = profile.map((b,i) => {
    const pctOfOpen = openBar.avg > 0 ? (b.avg / openBar.avg * 100) : 0;
    const ctTs = etToCT(b.ts);
    const isHour = b.ts.endsWith(':00');
    const label  = isHour ? ctTs.replace(':00','')+(parseInt(ctTs)>=12?'pm':'am') : '';
    const barH   = Math.min(100, Math.round(pctOfOpen));
    const c      = pctOfOpen > 85 ? '#ff3355' : pctOfOpen > 60 ? '#ff8800' : pctOfOpen > 40 ? '#ffcc00' : '#00cc88';
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;min-width:0;" title="${ctTs} CT · ${pctOfOpen.toFixed(0)}% of open vol">
      <div style="width:100%;display:flex;flex-direction:column;justify-content:flex-end;height:70px;background:var(--bg3);border-radius:2px 2px 0 0;overflow:hidden;">
        <div style="width:100%;background:${c};opacity:0.8;height:${barH}%;"></div>
      </div>
      <div style="font-family:'Orbitron',monospace;font-size:7px;color:${isHour?'var(--text2)':'transparent'};white-space:nowrap;">${label||'·'}</div>
    </div>`;
  }).join('');

  const halfOpenIdx = profile.findIndex(b => b.avg <= openBar.avg * 0.5);
  const halfOpenTs  = halfOpenIdx >= 0 ? etToCT(profile[halfOpenIdx].ts)+' CT' : '—';

  const panel3 = explain(`This shows how fast opening volatility decays through the session. Each bar represents that 5-minute window's average range <strong>as a percentage of the opening bar's range</strong>.
    The opening bar (8:30 CT) is always 100%. Everything else is relative to it.
    <br><br>This is useful for understanding <strong>how long the "open premium" lasts</strong> — the window of above-average activity following the market open.
    Based on the current data, vol drops to ~50% of its open value around <strong>${halfOpenTs}</strong>.
    After that, the session settles into its mid-day baseline. The close surge (3:50–4:00 CT) is visible as a secondary bump.
    If you trade the open, this curve tells you how long you have before conditions normalize.`) +
    `<div style="display:flex;align-items:flex-end;gap:1px;padding:18px 0 4px;overflow:hidden;">${decayCurve}</div>
    <div style="font-size:10px;color:var(--text3);margin-top:6px;">100% = opening bar range ($${openBar.avg.toFixed(3)}) · vol reaches 50% of open around ${halfOpenTs}</div>`;

  // ── PANEL 4: Lookback comparison — canvas line chart ─────────────────────
  const lbKeys = ['all','12m','year'];
  const lbLabels = { all:'ALL HISTORY', '12m':'12 MONTHS', year:String(curYear)+' YTD' };
  const lbColors = { all:'#8888ff', '12m':'#00ccff', year:'#ff8800' };
  const lbProfiles = {};
  lbKeys.forEach(k => {
    const pk = _svStDow === 'all' ? k : `${k}_${_svStDow}`;
    lbProfiles[k] = SESSION_VOL_PROFILE[pk] || [];
  });
  const lbMax = Math.max(...lbKeys.flatMap(k => lbProfiles[k].map(b=>b.avg)), 0.01);

  const lbNotes = lbKeys.map(k => {
    const dp = lbProfiles[k];
    if (!dp.length) return '';
    const avgV = dp.length ? dp.reduce((a,b)=>a+b.avg,0)/dp.length : 0;
    const nD   = dp[0]?.n ? Math.round(dp[0].n/5) : '?';
    return `<div style="display:flex;align-items:center;gap:6px;font-size:10px;">
      <div style="width:22px;height:3px;background:${lbColors[k]};border-radius:2px;"></div>
      <span style="color:${lbColors[k]};font-family:'Orbitron',monospace;font-size:8px;">${lbLabels[k]}</span>
      <span style="color:var(--text3);">avg $${avgV.toFixed(3)} · ~${nD} sessions</span>
    </div>`;
  }).join('');

  const panel4 = explain(`This overlays three lookback periods on the same chart to show whether <strong>recent market conditions are more or less volatile than the historical norm</strong>.
    If the ${curYear} YTD line sits consistently above the All History line, it means this year's intraday moves have been structurally larger — the market is in a higher-volatility regime.
    If YTD is below, conditions have been unusually calm.
    <br><br>This matters for trade sizing and stop placement: if you calibrate stops based on long-term averages during a high-vol regime, you'll get stopped out too often.
    Conversely, stops sized for a high-vol period will be too wide during quiet stretches.
    The gap between ${curYear} (orange) and All History (purple) is the "regime premium" — how much more (or less) volatile today's market is vs history.`) +
    `<canvas id="svLbCanvas" style="width:100%;display:block;border-radius:4px;"></canvas>
    <div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:10px;">${lbNotes}</div>`;

  // ── PANEL 5: Summary stats table ──────────────────────────────────────────
  // Compute time blocks
  const blocks = [
    { label:'OPEN AUCTION',    ct:'8:30–9:00',  from:'09:30', to:'10:00' },
    { label:'FIRST HOUR',      ct:'8:30–9:30',  from:'09:30', to:'10:30' },
    { label:'MID-MORNING',     ct:'9:30–11:00', from:'10:30', to:'12:00' },
    { label:'LUNCH / DEAD ZONE',ct:'11:00–1:00',from:'12:00', to:'14:00' },
    { label:'AFTERNOON',       ct:'1:00–2:30',  from:'14:00', to:'15:30' },
    { label:'POWER HOUR',      ct:'2:30–3:30',  from:'15:30', to:'16:30' },
    { label:'CLOSE AUCTION',   ct:'3:30–4:00',  from:'16:30', to:'17:00' },
  ].map(blk => {
    const bars = profile.filter(b => b.ts >= blk.from && b.ts < blk.to);
    if (!bars.length) return null;
    const avg  = bars.reduce((a,b)=>a+b.avg,0)/bars.length;
    const pctOfPeak = maxAvg > 0 ? avg/maxAvg*100 : 0;
    const relBar = Math.round(pctOfPeak);
    const c = pctOfPeak>75?'#ff3355':pctOfPeak>50?'#ff8800':pctOfPeak>30?'#ffcc00':'#00cc88';
    return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
      <td style="font-family:'Orbitron',monospace;font-size:8px;color:var(--cyan);padding:6px 8px;white-space:nowrap;">${blk.label}</td>
      <td style="font-size:10px;color:var(--text3);padding:6px 8px;white-space:nowrap;">${blk.ct} CT</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${c};padding:6px 8px;text-align:right;">$${avg.toFixed(3)}</td>
      <td style="padding:6px 10px;">
        <div style="display:flex;align-items:center;gap:4px;">
          <div style="width:${relBar}px;max-width:120px;height:8px;background:${c};border-radius:2px;opacity:0.8;"></div>
          <span style="font-size:10px;color:var(--text3);">${relBar}%</span>
        </div>
      </td>
    </tr>`;
  }).filter(Boolean).join('');

  const panel5 = explain(`This table aggregates the 5-minute bars into meaningful session blocks and shows the average range per bar within each block, expressed in dollars.
    The bar chart shows each block's volatility as a percentage of the peak period (the most volatile block = 100%).
    <br><br><strong>How to use this:</strong> If you're trading the open auction, expect moves of roughly $${(profile.slice(0,6).reduce((a,b)=>a+b.avg,0)/6).toFixed(2)} per 5-minute bar on average.
    During the lunch dead zone, expect about $${midAvg.toFixed(3)} per bar — much tighter, choppy, less directional.
    Power hour and close can re-accelerate significantly. Position sizing and stop width should reflect which block you're trading in.`) +
    `<table style="width:100%;border-collapse:collapse;">
      <thead><tr>
        ${['BLOCK','TIME (CT)','AVG 5-MIN RANGE','REL TO PEAK'].map(h=>`<th style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);padding:4px 8px;text-align:${h==='BLOCK'||h==='TIME (CT)'?'left':'right'};">${h}</th>`).join('')}
      </thead>
      <tbody>${blocks}</tbody>
    </table>`;

  el.innerHTML = `<div style="padding:14px 16px;max-width:1400px;margin:0 auto;">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:10px;">⬡ SESSION VOLATILITY — INTRADAY ANALYSIS</div>
        <div style="margin-bottom:6px;">
          <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">LOOKBACK</div>
          <div style="display:flex;gap:5px;">${lbBtns}</div>
        </div>
        <div>
          <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">DAY OF WEEK</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;">${dowBtns}</div>
        </div>
      </div>
      <div style="font-size:10px;color:var(--text3);text-align:right;line-height:1.6;">
        <div>~${nSessions} sessions · 5-min bars · 1-min source data</div>
        <div>avg range = mean(high−low) per bar · top 10% trimmed</div>
        <div>All times Central. ET source timestamps converted.</div>
      </div>
    </div>
    ${section('⬡ 5-MIN VOLATILITY PROFILE — AVERAGE RANGE BY TIME OF DAY','var(--cyan)',panel1)}
    ${section('⬡ DAY-OF-WEEK COMPARISON — VOLATILITY SHAPE BY DAY','#00ccff',panel2)}
    ${section('⬡ VOLATILITY DECAY CURVE — % OF OPEN RANGE BY TIME','#ff8800',panel3)}
    ${section('⬡ REGIME COMPARISON — IS TODAY MORE VOLATILE THAN HISTORY?','#8855ff',panel4)}
    ${section('⬡ SESSION BLOCK SUMMARY — AVERAGE VOLATILITY BY PHASE','#00cc88',panel5)}
  </div>`;

  // Draw canvas charts now that DOM elements exist
  setTimeout(() => {
    _drawSvLineChart('svDowCanvas', DAYS.map(d => ({
      label: d, color: DAY_COLORS[d],
      data: dayProfiles[d].map(b=>b.avg),
      n: dayProfiles[d][0]?.n ? Math.round(dayProfiles[d][0].n/5) : 0
    })), profile.map(b=>etToCT(b.ts)), dayMax);

    _drawSvLineChart('svLbCanvas', lbKeys.filter(k=>lbProfiles[k].length).map(k => ({
      label: lbLabels[k], color: lbColors[k],
      data: lbProfiles[k].map(b=>b.avg),
      n: lbProfiles[k][0]?.n ? Math.round(lbProfiles[k][0].n/5) : 0
    })), profile.map(b=>etToCT(b.ts)), lbMax);
  }, 20);
}

// ═══════════════════════════════════════════════════════
// LIVE SPY CHART — 1-min intraday candlestick
// ═══════════════════════════════════════════════════════
let _liveChartInterval = null;

async function renderLiveChart() {
  const el = document.getElementById('liveChartContent');
  if (!el) return;

  el.innerHTML = `
    <div id="lcWrap" style="padding:14px 16px;max-width:1400px;margin:0 auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);">⬡ SPY CHART</div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div id="lcStatus" style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text3);">Fetching data…</div>
          <div id="lcPrice" style="font-family:'Share Tech Mono',monospace;font-size:18px;font-weight:bold;color:var(--text1);">—</div>
          <div id="lcChange" style="font-family:'Share Tech Mono',monospace;font-size:13px;">—</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <div style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);">CHART TYPE</div>
          <button id="lcTypeCand" onclick="window._lcSetType('candle')" style="font-family:'Orbitron',monospace;font-size:9px;padding:4px 10px;border-radius:2px;border:1px solid var(--cyan);background:var(--cyan);color:#000;cursor:pointer;">CANDLE</button>
          <button id="lcTypeLine" onclick="window._lcSetType('line')" style="font-family:'Orbitron',monospace;font-size:9px;padding:4px 10px;border-radius:2px;border:1px solid var(--border);background:transparent;color:var(--text2);cursor:pointer;">LINE</button>
        </div>
      </div>
      <div class="panel" style="padding:10px;position:relative;overflow:hidden;">
        <canvas id="lcCanvas" style="width:100%;display:block;"></canvas>
        <div id="lcTooltip" style="display:none;position:absolute;background:var(--bg2);border:1px solid var(--border2);border-radius:3px;padding:8px 12px;font-family:'Share Tech Mono',monospace;font-size:11px;pointer-events:none;z-index:10;white-space:nowrap;"></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-top:10px;" id="lcStats"></div>
    </div>`;

  let _chartType = 'candle';
  let _lastBars  = null;
  let _lastDaily = null; // cached sd for closed-market redraw

  window._lcSetType = function(t) {
    _chartType = t;
    document.getElementById('lcTypeCand').style.background = t==='candle' ? 'var(--cyan)' : 'transparent';
    document.getElementById('lcTypeCand').style.color      = t==='candle' ? '#000' : 'var(--text2)';
    document.getElementById('lcTypeLine').style.background = t==='line'   ? 'var(--cyan)' : 'transparent';
    document.getElementById('lcTypeLine').style.color      = t==='line'   ? '#000' : 'var(--text2)';
    if (_lastBars)  drawLiveChart(_lastBars, _chartType);
    else if (_lastDaily) drawDailyChart(_lastDaily, _chartType);
  };

  // ── shared canvas helpers ──────────────────────────────────────────────────
  function drawWatermark(ctx, W, H) {
    ctx.save();
    ctx.translate(W/2, H/2);
    ctx.rotate(-Math.PI / 8);
    ctx.font = 'bold 64px "Orbitron", monospace';
    ctx.fillStyle = 'rgba(0,204,255,0.04)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPY // TRACKER', 0, 0);
    ctx.restore();
  }

  // ── CLOSED-MARKET: 20-day OHLC candle chart + volume bars + overlays ──────
  async function fetchAndDraw() {
    try {
      const r = await fetch('/spyintraday?t=' + Date.now());
      if (!r.ok) throw new Error('fetch failed');
      const d = await r.json();

      const statusEl = document.getElementById('lcStatus');
      const priceEl  = document.getElementById('lcPrice');
      const changeEl = document.getElementById('lcChange');

      if (!d?.available || !d.rawBars?.length) {
        // ── MARKET CLOSED ─────────────────────────────────────────────────────
        const sd  = (typeof _sd !== 'undefined') ? _sd : [];
        const md2 = (typeof _md !== 'undefined') ? _md : {};
        const spyQ = md2?.quotes?.['SPY'] || {};
        const last = sd[0] || {}, prev = sd[1] || {};

        const price  = spyQ.price   || last.close  || 0;
        const chg    = spyQ.change  || (last.close && prev.close ? last.close - prev.close : null);
        const chgPct = spyQ.pct_change || (chg && prev.close ? chg/prev.close*100 : null);
        const up     = (chg ?? 0) >= 0;
        const col    = up ? 'var(--green)' : 'var(--red)';

        if (priceEl && price) { priceEl.textContent = '$' + price.toFixed(2); priceEl.style.color = col; }
        if (changeEl && chg != null) {
          changeEl.textContent = (up?'+':'') + chg.toFixed(2) + (chgPct != null ? ' (' + (up?'+':'') + chgPct.toFixed(2) + '%)' : '');
          changeEl.style.color = col;
        }
        if (statusEl) { statusEl.textContent = '◉ MARKET CLOSED · last session: ' + (last.date || '—'); statusEl.style.color = 'var(--text3)'; }

        // Stat cards — last session OHLC
        const statsEl = document.getElementById('lcStats');
        if (statsEl && last.open) {
          const f2 = v => v != null ? '$' + v.toFixed(2) : '—';
          const m  = last.measurements || {};
          const oc  = m.oc_pts  ?? m.open_to_close;
          const rng = m.range_pts ?? m.day_range;
          const vol30 = sd.slice(0,30).filter(r=>r.volume>0);
          const avg30 = vol30.length ? Math.round(vol30.reduce((a,r)=>a+r.volume,0)/vol30.length) : 0;
          const vPct  = last.volume && avg30 ? last.volume/avg30*100 : null;
          statsEl.innerHTML = [
            { l:'PREV OPEN',  v:f2(last.open),  c:'var(--text1)' },
            { l:'PREV HIGH',  v:f2(last.high),  c:'var(--green)' },
            { l:'PREV LOW',   v:f2(last.low),   c:'var(--red)'   },
            { l:'PREV CLOSE', v:f2(last.close), c:(last.close??0)>=(last.open??0)?'var(--green)':'var(--red)' },
            { l:'O→C',        v:oc!=null?(oc>=0?'+':'')+oc.toFixed(2):'—', c:(oc??0)>=0?'var(--green)':'var(--red)' },
            { l:'DAY RANGE',  v:rng!=null?'$'+rng.toFixed(2):'—', c:'var(--cyan)' },
            { l:'VOLUME',     v:last.volume?(last.volume/1e6).toFixed(1)+'M'+(vPct?' ('+vPct.toFixed(0)+'%)':''):'—', c:'var(--text2)' },
          ].map(c=>`<div class="panel" style="padding:10px;text-align:center;"><div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:4px;">${c.l}</div><div style="font-family:'Share Tech Mono',monospace;font-size:14px;font-weight:bold;color:${c.c};">${c.v}</div></div>`).join('');
        }

        // Draw daily OHLC chart
        _lastBars  = null;
        _lastDaily = sd;
        drawDailyChart(sd, _chartType);
        return;
      }

      // ── MARKET OPEN / LIVE ────────────────────────────────────────────────
      _lastBars  = d.rawBars;
      _lastDaily = null;

      const chg = d.changePct, up = (chg ?? 0) >= 0;
      if (priceEl)  { priceEl.textContent = '$' + d.close.toFixed(2); priceEl.style.color = up ? 'var(--green)' : 'var(--red)'; }
      if (changeEl) { changeEl.textContent = chg != null ? (up?'+':'')+chg.toFixed(2)+'%' : '—'; changeEl.style.color = up ? 'var(--green)' : 'var(--red)'; }
      if (statusEl) { statusEl.textContent = '● LIVE · ' + d.bars + ' bars · ' + new Date(d.asOf).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',timeZone:'America/Chicago'})+' CT'; statusEl.style.color = 'var(--green)'; }

      drawLiveChart(d.rawBars, _chartType);
      renderLcStats(d);

    } catch(e) {
      const s = document.getElementById('lcStatus');
      if (s) { s.textContent = 'Error: ' + e.message; s.style.color = 'var(--red)'; }
    }
  }

  function renderLcStats(d) {
    const el = document.getElementById('lcStats');
    if (!el) return;
    const f2 = v => v != null ? v.toFixed(2) : '—';
    const sd2 = (typeof _sd !== 'undefined') ? _sd : [];
    const vol30 = sd2.slice(0,30).filter(r=>r.volume>0);
    const avg30 = vol30.length ? Math.round(vol30.reduce((a,r)=>a+r.volume,0)/vol30.length) : 0;
    const vPct  = d.volume && avg30 ? d.volume/avg30*100 : null;
    el.innerHTML = [
      { l:'OPEN',   v:d.open  !=null?'$'+f2(d.open):'—',  c:'var(--text1)' },
      { l:'HIGH',   v:d.high  !=null?'$'+f2(d.high):'—',  c:'var(--green)' },
      { l:'LOW',    v:d.low   !=null?'$'+f2(d.low) :'—',  c:'var(--red)'   },
      { l:'LAST',   v:d.close !=null?'$'+f2(d.close):'—', c:(d.close??0)>=(d.open??0)?'var(--green)':'var(--red)' },
      { l:'VWAP',   v:d.vwap  !=null?'$'+f2(d.vwap) :'—', c:'#ff66cc' },
      { l:'VOLUME', v:d.volume!=null?(d.volume/1e6).toFixed(1)+'M':'—', c:'var(--cyan)' },
      { l:'VS AVG', v:vPct!=null?(vPct>=0?'':'')+vPct.toFixed(0)+'%':'—', c:vPct&&vPct>130?'#ff8800':vPct&&vPct>100?'var(--green)':'var(--text2)' },
    ].map(c=>`<div class="panel" style="padding:10px;text-align:center;"><div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:4px;">${c.l}</div><div style="font-family:'Share Tech Mono',monospace;font-size:14px;font-weight:bold;color:${c.c};">${c.v}</div></div>`).join('');
  }

  // ── DAILY CHART (closed market) ────────────────────────────────────────────
  function drawDailyChart(sd, type) {
    const canvas = document.getElementById('lcCanvas');
    if (!canvas || !sd || sd.length < 2) return;
    const recent = sd.slice(0, 30).reverse().filter(d => d.open && d.high && d.low && d.close);
    if (recent.length < 2) return;

    const wrap = canvas.parentElement;
    const W = Math.max(wrap ? wrap.clientWidth - 20 : 700, 400);
    const VOL_H = 52; // volume strip height
    const H = Math.max(380, Math.round(W * 0.34)) + VOL_H;
    canvas.width = W; canvas.height = H;
    canvas.style.height = H + 'px';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Watermark
    drawWatermark(ctx, W, H - VOL_H);

    const pad = { l:58, r:18, t:28, b:24 };
    const chartH = H - VOL_H - pad.t - pad.b;
    const chartW = W - pad.l - pad.r;
    const n = recent.length;

    // Price range — include overlays in range calculation
    const md2 = (typeof _md !== 'undefined') ? _md : {};
    const wems = md2.weekly_em || [];
    const wem  = wems.find(w=>!w.week_close) || wems[0];
    const SPY_ATH = 697.84;

    const allPrices = recent.flatMap(d => [d.high, d.low]);
    if (wem?.wem_high) allPrices.push(wem.wem_high);
    if (wem?.wem_low)  allPrices.push(wem.wem_low);
    const minP = Math.min(...allPrices) * 0.9985;
    const maxP = Math.max(...allPrices, SPY_ATH <= Math.max(...allPrices)*1.01 ? SPY_ATH : 0) * 1.0015;
    const rng  = maxP - minP || 1;

    const px = i  => pad.l + (i + 0.5) * (chartW / n);
    const py = v  => pad.t + chartH - ((v - minP) / rng) * chartH;

    // ── Grid ─────────────────────────────────────────────────────────────────
    const gridCount = 6;
    for (let g = 0; g <= gridCount; g++) {
      const gv = minP + (rng / gridCount) * g;
      const gy = py(gv);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(pad.l + chartW, gy); ctx.stroke();
      ctx.fillStyle = '#505070'; ctx.font = '9px "Share Tech Mono",monospace'; ctx.textAlign = 'right';
      ctx.fillText(gv.toFixed(0), pad.l - 4, gy + 3);
    }

    // ── Key level overlays ────────────────────────────────────────────────────
    const drawLevel = (price, color, label, dash=[4,3]) => {
      if (!price || price < minP || price > maxP) return;
      const y = py(price);
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + chartW, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color; ctx.font = 'bold 8px "Orbitron",monospace'; ctx.textAlign = 'right';
      ctx.fillText(label, pad.l + chartW - 2, y - 3);
    };

    // WEM high/low
    if (wem?.wem_high) drawLevel(wem.wem_high, 'rgba(0,255,136,0.45)', 'WEM HI');
    if (wem?.wem_low)  drawLevel(wem.wem_low,  'rgba(255,51,85,0.45)',  'WEM LO');
    if (wem?.wem_mid)  drawLevel(wem.wem_mid,  'rgba(255,204,0,0.25)',  'WEM MID', [2,4]);

    // Prev week close
    const dow = new Date().getDay();
    const daysFromMon = dow===0?6:dow-1;
    const monDate = new Date(); monDate.setDate(monDate.getDate()-daysFromMon);
    const monStr  = monDate.toISOString().slice(0,10);
    const prevWeekRows = (typeof _sd !== 'undefined') ? _sd.filter(r=>r.date<monStr) : [];
    const pwClose = prevWeekRows[0]?.close;
    if (pwClose) drawLevel(pwClose, 'rgba(136,85,255,0.55)', 'PW CLOSE');

    // ATH
    if (SPY_ATH <= maxP && SPY_ATH >= minP) drawLevel(SPY_ATH, 'rgba(255,136,0,0.4)', 'ATH');

    // ── Gap markers ───────────────────────────────────────────────────────────
    for (let i = 1; i < recent.length; i++) {
      const gap = recent[i].open - recent[i-1].close;
      if (Math.abs(gap) < 0.30) continue;
      const x   = px(i);
      const col = gap > 0 ? 'rgba(0,255,136,0.5)' : 'rgba(255,51,85,0.5)';
      // Shaded vertical strip for the gap zone
      const y1  = py(recent[i-1].close);
      const y2  = py(recent[i].open);
      const barW = chartW / n;
      ctx.fillStyle = gap > 0 ? 'rgba(0,255,136,0.07)' : 'rgba(255,51,85,0.07)';
      ctx.fillRect(x - barW * 0.5, Math.min(y1,y2), barW, Math.abs(y2-y1));
      // Small triangle at the gap
      const triY = gap > 0 ? Math.min(y1,y2) - 6 : Math.max(y1,y2) + 6;
      ctx.fillStyle = col;
      ctx.beginPath();
      if (gap > 0) { ctx.moveTo(x, triY-5); ctx.lineTo(x-4, triY+1); ctx.lineTo(x+4, triY+1); }
      else         { ctx.moveTo(x, triY+5); ctx.lineTo(x-4, triY-1); ctx.lineTo(x+4, triY-1); }
      ctx.closePath(); ctx.fill();
    }

    // ── Candles / Line ────────────────────────────────────────────────────────
    const bW = Math.max(2, Math.floor(chartW / n * 0.6));

    if (type === 'line') {
      // Line + area
      const closes = recent.map(d => d.close);
      const lineCol = closes[closes.length-1] >= closes[0] ? '#00ff88' : '#ff3355';
      const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + chartH);
      grad.addColorStop(0, lineCol + '30'); grad.addColorStop(1, lineCol + '03');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(px(0), py(closes[0]));
      closes.forEach((c, i) => ctx.lineTo(px(i), py(c)));
      ctx.lineTo(px(n-1), pad.t + chartH); ctx.lineTo(px(0), pad.t + chartH);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = lineCol; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
      ctx.beginPath();
      closes.forEach((c, i) => i===0 ? ctx.moveTo(px(i), py(c)) : ctx.lineTo(px(i), py(c)));
      ctx.stroke();
    } else {
      // OHLC candles
      recent.forEach((d, i) => {
        const x   = px(i);
        const up  = d.close >= d.open;
        const col = up ? '#00ff88' : '#ff3355';
        const oY  = py(d.open), cY = py(d.close), hY = py(d.high), lY = py(d.low);
        // Wick
        ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(x, hY); ctx.lineTo(x, lY); ctx.stroke();
        // Body
        const bTop = Math.min(oY, cY), bH = Math.max(1, Math.abs(cY - oY));
        ctx.fillStyle = up ? col + 'cc' : col + 'cc';
        ctx.fillRect(x - bW/2, bTop, bW, bH);
        // Outline on doji
        if (bH <= 2) { ctx.strokeStyle = col; ctx.strokeRect(x - bW/2, bTop, bW, bH); }
      });
    }

    // ── Smart annotations: top 3 biggest moves ────────────────────────────────
    const moves = recent.map((d, i) => {
      const m = d.measurements || {};
      const oc = m.oc_pts ?? m.open_to_close ?? (d.close - d.open);
      return { i, d, oc };
    }).filter(x => x.oc != null);
    const sorted = [...moves].sort((a,b) => Math.abs(b.oc) - Math.abs(a.oc));
    const top3   = sorted.slice(0, 3);

    top3.forEach(({i, d, oc}) => {
      const x    = px(i);
      const up   = oc >= 0;
      const col  = up ? 'rgba(0,255,136,0.9)' : 'rgba(255,51,85,0.9)';
      const bgC  = up ? 'rgba(0,255,136,0.12)' : 'rgba(255,51,85,0.12)';
      const pct  = d.open ? (oc/d.open*100) : 0;
      const label = (up?'+':'') + pct.toFixed(2) + '%';

      // Dot on the candle tip
      const dotY = up ? py(d.high) - 8 : py(d.low) + 8;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, dotY, 3.5, 0, Math.PI*2); ctx.fill();

      // Connecting line to label box
      const boxY = up ? pad.t + 8 : pad.t + chartH - 28;
      ctx.strokeStyle = col; ctx.lineWidth = 0.8; ctx.setLineDash([2,3]);
      ctx.beginPath(); ctx.moveTo(x, dotY + (up?4:-4)); ctx.lineTo(x, boxY + (up?0:20)); ctx.stroke();
      ctx.setLineDash([]);

      // Label box
      const tw = ctx.measureText(label).width + 12;
      const bx = Math.max(pad.l + 2, Math.min(x - tw/2, pad.l + chartW - tw - 2));
      ctx.fillStyle = bgC;
      ctx.strokeStyle = col; ctx.lineWidth = 1;
      const br = 3;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(bx, boxY, tw, 18, br) : ctx.rect(bx, boxY, tw, 18);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = col; ctx.font = 'bold 9px "Share Tech Mono",monospace'; ctx.textAlign = 'center';
      ctx.fillText(label, bx + tw/2, boxY + 12);
    });

    // ── Volume bars (bottom strip) ────────────────────────────────────────────
    const volY0 = pad.t + chartH + pad.b;
    const vols  = recent.map(d => d.volume || 0);
    const maxV  = Math.max(...vols, 1);
    const avg30vols = vols.slice().sort((a,b)=>a-b);
    const medV  = avg30vols[Math.floor(avg30vols.length/2)] || maxV;

    recent.forEach((d, i) => {
      const x   = px(i);
      const vh  = Math.round((d.volume / maxV) * (VOL_H - 6));
      const up  = d.close >= d.open;
      const col = d.volume > medV * 1.4 ? (up ? '#00ff88' : '#ff3355') : (up ? '#00ff8855' : '#ff335555');
      ctx.fillStyle = col;
      ctx.fillRect(x - bW/2, volY0 + (VOL_H - 6 - vh), bW, vh);
    });

    // Vol axis label
    ctx.fillStyle = '#404060'; ctx.font = '8px "Orbitron",monospace'; ctx.textAlign = 'left';
    ctx.fillText('VOL', pad.l - 32, volY0 + VOL_H/2 + 3);

    // ── X-axis date labels ────────────────────────────────────────────────────
    const step = Math.max(1, Math.floor(n / 8));
    ctx.fillStyle = '#404060'; ctx.font = '9px "Share Tech Mono",monospace'; ctx.textAlign = 'center';
    recent.forEach((d, i) => {
      if (i % step !== 0 && i !== n-1) return;
      ctx.fillText(d.date.slice(5), px(i), volY0 + VOL_H - 2);
    });

    // ── Chart header ──────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '9px "Orbitron",monospace'; ctx.textAlign = 'left';
    ctx.fillText('LAST ' + n + ' SESSIONS — DAILY OHLC · MARKET CLOSED', pad.l, pad.t - 10);

    // Tooltip for daily chart
    canvas.onmousemove = function(e) {
      const rect = canvas.getBoundingClientRect();
      const mx   = (e.clientX - rect.left) * (W / rect.width);
      const idx  = Math.max(0, Math.min(n-1, Math.floor((mx - pad.l) / (chartW / n))));
      const d    = recent[idx];
      if (!d) return;
      const tip = document.getElementById('lcTooltip');
      if (!tip) return;
      const up  = d.close >= d.open;
      const col = up ? '#00ff88' : '#ff3355';
      const m   = d.measurements || {};
      const oc  = m.oc_pts ?? m.open_to_close;
      const rng2= m.range_pts ?? m.day_range;
      tip.style.display = 'block'; tip.style.color = col;
      tip.innerHTML = `<div style="color:var(--text2);margin-bottom:4px;font-weight:bold;">${d.date}</div>O <b>$${(d.open||0).toFixed(2)}</b> &nbsp; H <b>$${(d.high||0).toFixed(2)}</b> &nbsp; L <b>$${(d.low||0).toFixed(2)}</b> &nbsp; C <b>$${(d.close||0).toFixed(2)}</b><br>O→C <b style="color:${col}">${oc!=null?(oc>=0?'+':'')+oc.toFixed(2):''}</b> &nbsp; Range <b>$${rng2!=null?rng2.toFixed(2):'—'}</b> &nbsp; Vol <b>${d.volume?(d.volume/1e6).toFixed(1)+'M':'—'}</b>`;
      tip.style.left = (mx + 14 > W - 320 ? mx - 330 : mx + 14) + 'px';
      tip.style.top  = '10px';
    };
    canvas.onmouseleave = () => { const t=document.getElementById('lcTooltip'); if(t) t.style.display='none'; };
  }

  // ── LIVE INTRADAY CHART ────────────────────────────────────────────────────
  function drawLiveChart(bars, type) {
    const canvas = document.getElementById('lcCanvas');
    if (!canvas) return;

    const wrap = canvas.parentElement;
    const VOL_H = 48;
    const W = Math.max(wrap ? wrap.clientWidth - 20 : 700, 400);
    const H = Math.max(340, Math.round(W * 0.32)) + VOL_H;
    canvas.width = W; canvas.height = H; canvas.style.height = H + 'px';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    drawWatermark(ctx, W, H - VOL_H);

    const style  = getComputedStyle(document.documentElement);
    const cGreen = style.getPropertyValue('--green').trim() || '#00ff88';
    const cRed   = style.getPropertyValue('--red').trim()   || '#ff4455';
    const cCyan  = style.getPropertyValue('--cyan').trim()  || '#00ccff';

    const pad   = { t:22, r:62, b:24, l:12 };
    const chartW = W - pad.l - pad.r;
    const chartH = H - VOL_H - pad.t - pad.b;

    const prices = bars.flatMap(b => [b.h, b.l]);
    const minP   = Math.min(...prices), maxP = Math.max(...prices);
    const rng    = (maxP - minP) || 1, padP = rng * 0.06;
    const lo = minP - padP, hi = maxP + padP;

    const toY = p => pad.t + chartH - ((p - lo) / (hi - lo)) * chartH;
    const toX = i => pad.l + (i / Math.max(bars.length - 1, 1)) * chartW;

    // Grid
    for (let g = 0; g <= 6; g++) {
      const p = lo + (hi - lo) * g / 6, y = toY(p);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 0.5; ctx.setLineDash([3,4]);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + chartW, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#505070'; ctx.font = '10px "Share Tech Mono",monospace'; ctx.textAlign = 'left';
      ctx.fillText('$' + p.toFixed(2), pad.l + chartW + 4, y + 4);
    }

    // Open dashed line
    const openY = toY(bars[0].o);
    ctx.strokeStyle = 'rgba(255,204,0,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(pad.l, openY); ctx.lineTo(pad.l + chartW, openY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,204,0,0.5)'; ctx.font = '8px "Orbitron",monospace'; ctx.textAlign = 'left';
    ctx.fillText('OPEN $' + bars[0].o.toFixed(2), pad.l + chartW + 4, openY + 3);

    // Key level overlays (WEM)
    const md2 = (typeof _md !== 'undefined') ? _md : {};
    const wem  = (md2.weekly_em||[]).find(w=>!w.week_close) || (md2.weekly_em||[])[0];
    const drawLvl = (price, color, label) => {
      if (!price || price < lo || price > hi) return;
      const y = toY(price);
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash([3,4]);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + chartW, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color; ctx.font = 'bold 8px "Orbitron",monospace'; ctx.textAlign = 'left';
      ctx.fillText(label, pad.l + chartW + 4, y - 2);
    };
    if (wem?.wem_high) drawLvl(wem.wem_high, 'rgba(0,255,136,0.5)', 'WEM HI');
    if (wem?.wem_low)  drawLvl(wem.wem_low,  'rgba(255,51,85,0.5)', 'WEM LO');



    // VWAP line
    const lv = (typeof _spyIntraday !== 'undefined') ? _spyIntraday : null;
    if (lv?.vwap && lv.vwap >= lo && lv.vwap <= hi) {
      const vy = toY(lv.vwap);
      ctx.strokeStyle = 'rgba(255,102,204,0.6)'; ctx.lineWidth = 1; ctx.setLineDash([2,3]);
      ctx.beginPath(); ctx.moveTo(pad.l, vy); ctx.lineTo(pad.l + chartW, vy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,102,204,0.7)'; ctx.font = 'bold 8px "Orbitron",monospace'; ctx.textAlign = 'left';
      ctx.fillText('VWAP', pad.l + 4, vy - 3);
    }

    // Time labels
    const step = Math.max(1, Math.floor(bars.length / 10));
    ctx.fillStyle = '#404060'; ctx.font = '9px "Share Tech Mono",monospace'; ctx.textAlign = 'center';
    bars.forEach((b, i) => {
      if (i % step !== 0 && i !== bars.length - 1) return;
      const lbl = new Date(b.t * 1000).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',timeZone:'America/Chicago',hour12:false});
      ctx.fillText(lbl, toX(i), pad.t + chartH + pad.b - 2);
    });

    // Line or candles
    if (type === 'line') {
      const last = bars[bars.length-1], first = bars[0];
      const lineCol = last.c >= first.o ? cGreen : cRed;
      const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + chartH);
      grad.addColorStop(0, lineCol + '30'); grad.addColorStop(1, lineCol + '03');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.moveTo(toX(0), toY(bars[0].c));
      bars.forEach((b,i) => ctx.lineTo(toX(i), toY(b.c)));
      ctx.lineTo(toX(bars.length-1), pad.t+chartH); ctx.lineTo(toX(0), pad.t+chartH);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = lineCol; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
      ctx.beginPath(); bars.forEach((b,i) => i===0?ctx.moveTo(toX(i),toY(b.c)):ctx.lineTo(toX(i),toY(b.c))); ctx.stroke();
      // Last price dot
      const lx = toX(bars.length-1), ly = toY(last.c);
      ctx.fillStyle = lineCol; ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, Math.PI*2); ctx.fill();
    } else {
      const cW = Math.max(1, Math.floor(chartW / bars.length) - 1);
      bars.forEach((b,i) => {
        const x = toX(i), up = b.c >= b.o, col = up ? cGreen : cRed;
        ctx.strokeStyle = col; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, toY(b.h)); ctx.lineTo(x, toY(b.l)); ctx.stroke();
        const bTop = Math.min(toY(b.o), toY(b.c)), bH = Math.max(1, Math.abs(toY(b.c)-toY(b.o)));
        ctx.fillStyle = col + 'cc'; ctx.fillRect(x - cW/2, bTop, cW, bH);
      });
    }

    // Volume strip
    const vols  = bars.map(b => b.v || 0);
    const maxV  = Math.max(...vols, 1);
    const medV  = [...vols].sort((a,b)=>a-b)[Math.floor(vols.length/2)] || maxV;
    const volY0 = pad.t + chartH + pad.b;
    bars.forEach((b, i) => {
      const vh  = Math.round((b.v / maxV) * (VOL_H - 5));
      const up  = b.c >= b.o;
      const col = b.v > medV * 1.4 ? (up ? cGreen : cRed) : (up ? cGreen+'44' : cRed+'44');
      ctx.fillStyle = col;
      ctx.fillRect(toX(i) - Math.max(1, Math.floor(chartW/bars.length*0.5)/2), volY0 + (VOL_H - 5 - vh), Math.max(1, Math.floor(chartW/bars.length*0.5)), vh);
    });

    // Tooltip
    canvas.onmousemove = function(e) {
      const rect = canvas.getBoundingClientRect();
      const mx   = (e.clientX - rect.left) * (W / rect.width);
      const idx  = Math.round(((mx - pad.l) / chartW) * (bars.length - 1));
      const b    = bars[Math.max(0, Math.min(bars.length-1, idx))];
      if (!b) return;
      const tip  = document.getElementById('lcTooltip');
      if (!tip) return;
      const up   = b.c >= b.o;
      const t    = new Date(b.t*1000).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',timeZone:'America/Chicago',hour12:false});
      tip.style.display = 'block'; tip.style.color = up ? cGreen : cRed;
      tip.innerHTML = `<div style="color:var(--text2);margin-bottom:4px;">${t} CT</div>O <b>$${b.o.toFixed(2)}</b> &nbsp; H <b>$${b.h.toFixed(2)}</b> &nbsp; L <b>$${b.l.toFixed(2)}</b> &nbsp; C <b>$${b.c.toFixed(2)}</b> &nbsp; V <b>${((b.v||0)/1000).toFixed(0)}K</b>`;
      const tx = toX(idx);
      tip.style.left = (tx + 14 > W - 280 ? tx - 290 : tx + 14) + 'px';
      tip.style.top  = '10px';
    };
    canvas.onmouseleave = () => { const t=document.getElementById('lcTooltip'); if(t) t.style.display='none'; };
  }

  // Initial fetch
  await fetchAndDraw();

  // Auto-refresh every 60s while tab is active
  if (_liveChartInterval) clearInterval(_liveChartInterval);
  _liveChartInterval = setInterval(() => {
    const panel = document.getElementById('panel-live-chart');
    if (panel && panel.classList.contains('active')) fetchAndDraw();
  }, 60000);
}

// Stop refresh when leaving live-chart tab
(function() {
  const _origSwitch = window.switchGroupSub;
  if (_origSwitch) {
    window.switchGroupSub = function(id, el) {
      if (id !== 'live-chart' && _liveChartInterval) {
        clearInterval(_liveChartInterval);
        _liveChartInterval = null;
      }
      return _origSwitch(id, el);
    };
  }
})();

// ─────────────────────────────────────────────────────────────────────────────
// LARGE GAP STATS — threshold-based analysis for gaps ≥1%, 1.5%, 2%, 3%
// Data from large_gap_stats.js (computed from full SPY history in spy_data.json)
// ─────────────────────────────────────────────────────────────────────────────

window._lgActive = '1.0';  // active threshold tab

function renderLargeGapStats() {
  const el = document.getElementById('largeGapStatsSection');
  if (!el) return;
  if (typeof LARGE_GAP_STATS === 'undefined') {
    el.innerHTML = '<div style="padding:20px;color:var(--text3);font-size:12px;">Large gap stats data not loaded.</div>';
    return;
  }

  const D = LARGE_GAP_STATS;
  const overall = D.overall;
  const thr = window._lgActive;
  const bucket = D.buckets[thr];
  if (!bucket) return;

  const fmt1  = v => v != null ? (v >= 0 ? '+' : '') + v.toFixed(1) + '%' : '—';
  const fmt2  = v => v != null ? (v >= 0 ? '+' : '') + v.toFixed(2) + '%' : '—';
  const fmt3  = v => v != null ? (v >= 0 ? '+' : '') + v.toFixed(3) + '%' : '—';
  const fmtN  = v => v != null ? v.toLocaleString() : '—';
  const fmtVol = v => v > 1e6 ? (v/1e6).toFixed(1)+'M' : v > 1e3 ? (v/1e3).toFixed(0)+'K' : String(v);

  const fillColor = v => v >= 50 ? '#00ff88' : v >= 35 ? '#ffcc00' : '#ff8800';
  const retColor  = v => v > 0.1 ? '#00ff88' : v < -0.1 ? '#ff3355' : 'var(--text2)';

  // Tab buttons
  const tabs = D.thresholds.map(t => {
    const key = String(t);
    const active = key === thr;
    const freq = overall.freq[key];
    return `<button onclick="window._lgActive='${key}';renderLargeGapStats();"
      style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;padding:5px 14px;
             background:${active ? 'rgba(0,204,255,0.15)' : 'var(--bg3)'};
             border:1px solid ${active ? 'var(--cyan)' : 'var(--border)'};
             border-radius:3px;color:${active ? 'var(--cyan)' : 'var(--text2)'};cursor:pointer;">
      ≥${t}%
      <span style="display:block;font-size:8px;color:${active ? 'var(--cyan)' : 'var(--text3)'};margin-top:1px;">
        ${freq ? freq.up_n + '↑ ' + freq.dn_n + '↓' : ''}
      </span>
    </button>`;
  }).join('');

  // Frequency overview bar
  const freq = overall.freq[thr];
  const totalSess = overall.total_sessions;
  const freqPct = freq ? ((freq.up_n + freq.dn_n) / totalSess * 100).toFixed(1) : '—';

  // Direction card renderer
  function dirCard(label, s, color, borderColor) {
    if (!s) return '';
    const dow = s.dow || {};
    const dowDays = ['Mon','Tue','Wed','Thu','Fri'];
    const dowRows = dowDays.map(d => {
      const ds = dow[d];
      if (!ds || !ds.n) return '';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);width:28px;">${d.toUpperCase()}</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text3);width:24px;text-align:center;">${ds.n}</span>
        <div style="flex:1;margin:0 6px;height:6px;background:var(--bg2);border-radius:2px;overflow:hidden;">
          <div style="width:${Math.min(ds.fill_rate,100)}%;height:100%;background:${fillColor(ds.fill_rate)};opacity:0.8;border-radius:2px;"></div>
        </div>
        <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:${fillColor(ds.fill_rate)};width:34px;text-align:right;">${ds.fill_rate}%</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:${retColor(ds.avg_oc)};width:48px;text-align:right;">${fmt2(ds.avg_oc)}</span>
      </div>`;
    }).join('');

    // Notable instances
    const notable = (s.notable || []).slice(0, 3).map(g =>
      `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:10px;">
        <span style="color:var(--text3);font-family:'Share Tech Mono',monospace;">${g.date}</span>
        <span style="color:${color};font-family:'Share Tech Mono',monospace;">${g.gap_pct >= 0 ? '+' : ''}${g.gap_pct}%</span>
        <span style="color:${retColor(g.close - g.open)};font-family:'Share Tech Mono',monospace;">${g.close >= g.open ? '+' : ''}${(g.close - g.open).toFixed(2)}</span>
        <span style="color:${g.filled ? '#00ff88' : '#ff8800'};font-size:9px;font-family:'Orbitron',monospace;">${g.filled ? 'FILLED' : 'OPEN'}</span>
      </div>`
    ).join('');

    return `
    <div style="background:var(--bg2);border:1px solid ${borderColor}33;border-top:3px solid ${borderColor};border-radius:4px;padding:14px;">
      <div style="font-family:'Orbitron',monospace;font-size:10px;color:${borderColor};letter-spacing:1px;margin-bottom:10px;">
        ${label} <span style="font-size:8px;color:var(--text3);font-weight:normal;">(${s.n} sessions)</span>
      </div>

      <!-- Key stats grid -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px;">
        ${[
          ['FILL RATE', s.fill_rate + '%', fillColor(s.fill_rate)],
          ['FADE RATE', s.fade_rate + '%', retColor(-s.fade_rate * 0.3)],
          ['AVG OPEN→CLOSE', fmt2(s.avg_oc_pct), retColor(s.avg_oc_pct)],
          ['AVG DAY RANGE', s.avg_range_pct.toFixed(2) + '%', '#ffcc00'],
        ].map(([l,v,c]) => `
          <div style="background:var(--bg3);border-radius:3px;padding:8px;text-align:center;border-top:2px solid ${c};">
            <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:3px;">${l}</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:15px;color:${c};">${v}</div>
          </div>`).join('')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <!-- Left: more stats -->
        <div>
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:6px;">BEHAVIOR</div>
          ${[
            ['Avg gap size',  fmt2(s.avg_gap_pct), retColor(s.avg_gap_pct)],
            ['Continuation rate', s.cont_rate + '%', s.cont_rate > 50 ? '#00ff88' : '#ff8800'],
            ['Max gap seen', (s.max_gap_pct >= 0 ? '+' : '') + s.max_gap_pct + '%', '#ffcc00'],
            ['Avg volume',   fmtVol(s.avg_volume), 'var(--text2)'],
          ].map(([l,v,c]) => `
            <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <span style="font-size:11px;color:var(--text3);">${l}</span>
              <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${c};">${v}</span>
            </div>`).join('')}
        </div>

        <!-- Right: fill rate visual -->
        <div>
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:6px;">SAME-DAY FILL RATE</div>
          <div style="position:relative;height:60px;background:var(--bg3);border-radius:4px;overflow:hidden;margin-bottom:4px;">
            <div style="position:absolute;left:0;top:0;height:100%;width:${s.fill_rate}%;background:${fillColor(s.fill_rate)};opacity:0.25;"></div>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
              <span style="font-family:'Share Tech Mono',monospace;font-size:28px;font-weight:bold;color:${fillColor(s.fill_rate)};">${s.fill_rate}%</span>
            </div>
          </div>
          <div style="font-size:10px;color:var(--text3);text-align:center;">
            ${s.fill_rate >= 50 ? 'Gaps fill more often than not' : s.fill_rate >= 35 ? 'Gaps fill ~1 in 3 sessions' : 'Most gaps remain open'}
          </div>
        </div>
      </div>

      <!-- DOW breakdown -->
      <div style="margin-top:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:6px;">BY DAY OF WEEK</div>
        <div style="display:flex;justify-content:space-between;padding:2px 0;margin-bottom:3px;">
          <span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);width:28px;">DAY</span>
          <span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);width:24px;text-align:center;">N</span>
          <div style="flex:1;margin:0 6px;"></div>
          <span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);width:34px;text-align:right;">FILL%</span>
          <span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);width:48px;text-align:right;">AVG O→C</span>
        </div>
        ${dowRows || '<div style="font-size:11px;color:var(--text3);">No DOW data</div>'}
      </div>

      <!-- Notable instances -->
      ${notable ? `
      <div style="margin-top:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:6px;">LARGEST INSTANCES</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);">DATE</span>
          <span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);">GAP</span>
          <span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);">DAY CHG</span>
          <span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);">STATUS</span>
        </div>
        ${notable}
      </div>` : ''}
    </div>`;
  }

  // Year-over-year comparison (combined both directions)
  const combined = bucket.combined;
  const years = combined ? combined.years : {};
  const yearKeys = Object.keys(years).sort();
  const yearRows = yearKeys.map(y => {
    const ys = years[y];
    const bar = Math.min(ys.fill_rate, 100);
    return `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
      <span style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);width:36px;">${y}</span>
      <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text3);width:24px;text-align:right;">${ys.n}</span>
      <div style="flex:1;height:8px;background:var(--bg3);border-radius:2px;overflow:hidden;">
        <div style="width:${bar}%;height:100%;background:${fillColor(ys.fill_rate)};opacity:0.75;border-radius:2px;"></div>
      </div>
      <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:${fillColor(ys.fill_rate)};width:36px;text-align:right;">${ys.fill_rate}%</span>
      <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:${retColor(ys.avg_oc)};width:48px;text-align:right;">${fmt2(ys.avg_oc)}</span>
    </div>`;
  }).join('');

  el.innerHTML = `
  <div style="background:var(--bg2);border:1px solid var(--border);border-left:3px solid var(--cyan);border-radius:4px;padding:14px;">

    <!-- Header -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:10px;color:var(--cyan);letter-spacing:2px;margin-bottom:3px;">⬡ LARGE GAP ANALYSIS — BY THRESHOLD</div>
        <div style="font-size:11px;color:var(--text3);">
          ${overall.total_sessions.toLocaleString()} sessions · ${overall.date_range.from} → ${overall.date_range.to} · gaps of equal or greater magnitude to threshold
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">${tabs}</div>
    </div>

    <!-- Frequency summary -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;padding:10px;background:var(--bg3);border-radius:4px;">
      ${freq ? [
        ['GAP UP SESSIONS', freq.up_n, freq.up_pct + '% of all days', '#00ff88'],
        ['GAP DOWN SESSIONS', freq.dn_n, freq.dn_pct + '% of all days', '#ff3355'],
        ['TOTAL ≥' + thr + '%', freq.up_n + freq.dn_n, freqPct + '% frequency', 'var(--cyan)'],
        ['BASELINE (ALL DAYS)', overall.total_sessions, 'full history', 'var(--text2)'],
      ].map(([l,v,sub,c]) => `
        <div style="text-align:center;">
          <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:3px;">${l}</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:18px;font-weight:bold;color:${c};">${typeof v === 'number' ? v.toLocaleString() : v}</div>
          <div style="font-size:10px;color:var(--text3);">${sub}</div>
        </div>`).join('') : ''}
    </div>

    <!-- Up and Down cards side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
      ${dirCard('▲ GAP UP ≥ +' + thr + '%', bucket.up,   '#00ff88', '#00ff88')}
      ${dirCard('▼ GAP DOWN ≥ −' + thr + '%', bucket.down, '#ff3355', '#ff3355')}
    </div>

    <!-- Year-over-year -->
    ${yearKeys.length ? `
    <div style="background:var(--bg3);border-radius:4px;padding:12px;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:8px;">
        YEAR-BY-YEAR FILL RATE & RETURN — COMBINED (≥${thr}% EITHER DIRECTION)
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);width:36px;">YEAR</span>
        <span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);width:24px;text-align:right;">N</span>
        <div style="flex:1;margin:0 8px;"></div>
        <span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);width:36px;text-align:right;">FILL%</span>
        <span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);width:48px;text-align:right;">AVG O→C</span>
      </div>
      ${yearRows}
      <div style="font-size:10px;color:var(--text3);margin-top:8px;">Fill = gap closed same day · AVG O→C = avg open-to-close return on that session</div>
    </div>` : ''}

  </div>`;
}
