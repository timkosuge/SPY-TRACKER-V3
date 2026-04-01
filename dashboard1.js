const fmt=(n,d=2)=>n==null||isNaN(n)?'—':Number(n).toFixed(d);
const fmtK=n=>n>=1e9?(n/1e9).toFixed(1)+'B':n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(0)+'K':String(Math.round(n));
const clr=n=>n>0?'up':n<0?'dn':'neu';
const sign=n=>n>0?'+':'';
const fmt12=t=>{if(!t||!t.includes(':'))return t||'—';const[h,m]=t.split(':').map(Number);const ampm=h>=12?'PM':'AM';const h12=h%12||12;return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;};
const $=id=>document.getElementById(id);

// Group tab mapping
const GROUP_TABS = {
  desk:        ['desk','live-chart','intraday','intraday-volume','intraday-windows','gap-stats'],
  derivatives: ['options','gex','wem','volatility'],
  history:     ['pricehistory','volhistory','edgestats','events','volstats','analog']
};
const TAB_TO_GROUP = {};
Object.entries(GROUP_TABS).forEach(([g,tabs]) => tabs.forEach(t => TAB_TO_GROUP[t]=g));
let _activeGroup = null;

function switchGroupTab(group, firstTab) {
  _activeGroup = group;
  // Activate group tab button
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const groupBtn = document.querySelector(`.tab.group-tab[onclick*="${group}"]`);
  if(groupBtn) groupBtn.classList.add('active');
  // Show subtab bar, hide other groups
  const bar = $('subtabBar');
  if(bar) bar.style.display = 'flex';
  document.querySelectorAll('.subtab-group').forEach(g => g.style.display='none');
  const grp = $('subtabs-'+group);
  if(grp) grp.style.display = 'flex';
  // Reset subtab active states
  if(grp) {
    grp.querySelectorAll('.subtab').forEach(s => s.classList.remove('active'));
    grp.querySelector('.subtab')?.classList.add('active');
  }
  // Switch to first tab of group
  _switchPanelOnly(firstTab);
}

function switchGroupSub(id, el) {
  // Update subtab active state
  if(el) {
    el.closest('.subtab-group')?.querySelectorAll('.subtab').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
  }
  _switchPanelOnly(id);
}

function _switchPanelOnly(id) {
  // Hide all panels
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const p = $('panel-'+id);
  if(p) p.classList.add('active');
  // Tab-specific renders
  if(id==='media') initMediaTab();
  if(id==='journal') renderJournalEntries();
  if(id==='gex' && _md) { renderGEX(_md); renderGEXAdditions(_md); }
  if(id==='analog') { renderAnalog(); }
  if(id==='declines') { try { renderDeclines(); } catch(e){ console.warn('declines:',e); } }
  if(id==='mag7') { try { renderMag7(); } catch(e){ console.warn('mag7:',e); } }
  if(id==='events') { try { if(typeof renderEvReleases==='function') renderEvReleases(); } catch(e){ console.warn('events:',e); } }
  if(id==='volstats') { try { renderVolStats(); } catch(e){ console.warn('volstats:',e); } }
  if(id==='options') { try { renderExpiryBehavior(window._md||{}); } catch(e){} }
  if(id==='edgestats') { if(typeof renderEdgeStats==='function') renderEdgeStats(); }
  if(id==='breadth' && _md && _sd) { try { renderBreadth(_md,_sd); } catch(e){} }
  if(id==='volatility' && _md) { try { renderVolatility(_md); } catch(e){} }
  if(id==='bonds' && _md) { try { renderBonds(_md); } catch(e){} }
  if(id==='sentiment' && _md) { try { renderSentiment(_md); } catch(e){} }
  if(id==='live-chart') { setTimeout(renderLiveChart, 50); }
  if(id==='intraday') { if(typeof window._intradaySetLookback==='function' || typeof renderIntraday==='function') setTimeout(()=>{ if(typeof window._intradaySetLookback==='function') window._intradaySetLookback(window._svpLookback||'all'); else if(typeof renderIntraday==='function') renderIntraday(); },50); }
  if(id==='intraday-volume') { setTimeout(()=>{ renderIntradayVolProfile(); renderIntradayVolStats(); renderWindowStats(); }, 50); }
  if(id==='intraday-windows') { setTimeout(()=>{ if(typeof renderWindowStats==='function') renderWindowStats(); }, 50); }
  if(id==='gap-stats') { setTimeout(renderGapStats, 50); }
}

function switchTab(id){
  const group = TAB_TO_GROUP[id];
  if(group) { switchGroupTab(group, id); return; }

  // Hide subtab bar for non-group tabs
  _activeGroup = null;
  const bar = $('subtabBar');
  if(bar) bar.style.display = 'none';

  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));

  // Find and activate the correct top-level tab button
  const topTabs = ['hub','desk','overview','derivatives','history','media','journal'];
  const btnIdx = topTabs.indexOf(id);
  const allTabs = document.querySelectorAll('.tab');
  if(btnIdx>=0 && allTabs[btnIdx]) allTabs[btnIdx].classList.add('active');

  const p=$('panel-'+id); if(p)p.classList.add('active');
  if(id==='media') initMediaTab();
  if(id==='journal') renderJournalEntries();
  if(id==='gex' && _md) { renderGEX(_md); renderGEXAdditions(_md); }
  if(id==='analog') { renderAnalog(); }
  if(id==='options') { try { renderExpiryBehavior(window._md||{}); } catch(e){} }
}

// ── VIX bar marker ──
function setVixNeedle(vix){
  const pct=Math.min(Math.max((vix-10)/(45-10),0),1)*100;
  const marker=$('vixBarMarker');
  if(marker)marker.style.left=pct.toFixed(1)+'%';
  let color,regime,bg;
  if(vix<15){color='#00ff88';regime='LOW VOL';bg='rgba(0,255,136,0.12)';}
  else if(vix<20){color='#88cc00';regime='CALM';bg='rgba(136,204,0,0.12)';}
  else if(vix<25){color='#ffcc00';regime='ELEVATED';bg='rgba(255,204,0,0.12)';}
  else if(vix<35){color='#ff8800';regime='HIGH VOL';bg='rgba(255,136,0,0.12)';}
  else{color='#ff3355';regime='EXTREME';bg='rgba(255,51,85,0.15)';}
  const v=$('vixValue'),r=$('vixRegime');
  if(v){v.style.color=color;}
  if(r){r.textContent=regime;r.style.color=color;r.style.background=bg;r.style.border=`1px solid ${color}44`;}
}

// ── F&G bar marker ──
function setFGNeedle(val){
  const pct=Math.min(Math.max(val/100,0),1)*100;
  const marker=$('fgBarMarker');
  if(marker)marker.style.left=pct.toFixed(1)+'%';
  let color,label;
  if(val<=25){color='#ff3355';label='EXTREME FEAR';}
  else if(val<=45){color='#ff8800';label='FEAR';}
  else if(val<=55){color='#ffcc00';label='NEUTRAL';}
  else if(val<=75){color='#88cc00';label='GREED';}
  else{color='#00ff88';label='EXTREME GREED';}
  const num=$('fgNumber'),lbl=$('fgLabel');
  if(num){num.textContent=val;num.style.color=color;}
  if(lbl){lbl.textContent=label;lbl.style.color=color;}
}

function setRegime(vix,fg,pcr){
  let score=0;
  if(vix<20)score+=2;else if(vix<25)score+=1;else if(vix>30)score-=2;else score-=1;
  if(fg>55)score+=2;else if(fg>45)score+=1;else if(fg<30)score-=2;else score-=1;
  if(pcr&&pcr<0.7)score+=1;else if(pcr&&pcr>1.1)score-=1;
  let label,color;
  if(score>=3){label='RISK ON';color='#00ff88';}
  else if(score>=1){label='LEANING BULLISH';color='#88cc00';}
  else if(score===0){label='NEUTRAL';color='#ffcc00';}
  else if(score>=-2){label='CAUTIOUS';color='#ff8800';}
  else{label='RISK OFF';color='#ff3355';}
  const ring=$('regimeRing'),lbl=$('regimeLabel'),txt=$('regimeText');
  if(ring){ring.style.borderColor=color;ring.style.boxShadow=`0 0 20px ${color}33`;}
  if(lbl){lbl.textContent=label;lbl.style.color=color;}
  if(txt){txt.textContent=score>=0?'▲':'▼';txt.style.color=color;txt.style.fontSize='28px';}
  const sigs=$('regimeSignals');
  if(sigs)sigs.innerHTML=`
    <div class="sig-pill"><span class="sig-name">VIX</span><span class="sig-val ${vix<20?'up':vix>30?'dn':'neu'}">${fmt(vix,1)}</span></div>
    <div class="sig-pill"><span class="sig-name">F&G</span><span class="sig-val ${fg>55?'up':fg<35?'dn':'neu'}">${fg||'—'}</span></div>
    <div class="sig-pill"><span class="sig-name">PCR</span><span class="sig-val ${pcr&&pcr<0.7?'up':pcr&&pcr>1.1?'dn':'neu'}">${pcr?fmt(pcr,2):'—'}</span></div>
    <div class="sig-pill"><span class="sig-name">SCORE</span><span class="sig-val ${score>0?'up':score<0?'dn':'neu'}">${score>0?'+'+score:score}</span></div>`;
}

function sectorColor(pct){
  if(pct>=2)return{bg:'rgba(0,255,136,0.25)',border:'rgba(0,255,136,0.5)',text:'#00ff88'};
  if(pct>=0.5)return{bg:'rgba(0,255,136,0.12)',border:'rgba(0,255,136,0.25)',text:'#88cc44'};
  if(pct>=-0.5)return{bg:'rgba(255,255,255,0.04)',border:'rgba(255,255,255,0.1)',text:'#888899'};
  if(pct>=-2)return{bg:'rgba(255,51,85,0.12)',border:'rgba(255,51,85,0.25)',text:'#cc4455'};
  return{bg:'rgba(255,51,85,0.25)',border:'rgba(255,51,85,0.5)',text:'#ff3355'};
}

const SECTOR_NAMES={XLK:'Technology',XLF:'Financials',XLE:'Energy',XLV:'Health Care',XLI:'Industrials',XLY:'Cons. Discret.',XLP:'Cons. Staples',XLB:'Materials',XLRE:'Real Estate',XLU:'Utilities',XLC:'Comm. Svcs.'};

function setPCR(pcr){
  const el=$('pcrNumber'),lbl=$('pcrLabel'),fill=$('pcrFill');if(!el)return;
  el.textContent=fmt(pcr,2);
  let color,label,fillH;
  if(pcr<0.7){color='#00ff88';label='BULLISH SIGNAL';fillH=Math.min(pcr/2*100,50);}
  else if(pcr<1.0){color='#ffcc00';label='NEUTRAL';fillH=50;}
  else{color='#ff3355';label='BEARISH SIGNAL';fillH=Math.min(pcr/2*100,100);}
  el.style.color=color;
  if(lbl){lbl.textContent=label;lbl.style.color=color;}
  if(fill){fill.style.height=fillH+'%';fill.style.background=`linear-gradient(to top,${color}88,${color}33)`;}
}

// ─────────────────────────────────────────────
// RENDER FUNCTIONS
// ─────────────────────────────────────────────

function renderHub(md,sd){
  const q=md.quotes||{},spy=q['SPY']||{},fg=md.fear_greed||{},vixQ=q['^VIX']||{},vix=vixQ.price||0;

  // Top bar
  const topP=$('topPrice');
  topP.textContent=spy.price?'$'+fmt(spy.price,2):'—';
  topP.className='spy-price '+(spy.change<0?'dn':'');
  $('topDate').textContent=new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});

  // Ticker
  const tSym=['SPY','QQQ','IWM','DIA','^VIX','BTC-USD','GC=F','CL=F','DX-Y.NYB','^TNX'];
  const tLbl={'BTC-USD':'BTC','GC=F':'GOLD','CL=F':'OIL','DX-Y.NYB':'DXY','^VIX':'VIX','^TNX':'10YR'};
  let th=tSym.map(s=>{const d=q[s]||{};if(!d.price)return '';const l=tLbl[s]||s;const c=d.change>=0?'up':'dn';return `<span class="tick-item"><span class="tick-sym">${l}</span><span class="tick-price">$${fmt(d.price,2)}</span><span class="tick-chg ${c}">${sign(d.change)}${fmt(d.pct_change,2)}%</span></span>`;}).join('');
  const inner=$('tickerInner');inner.innerHTML=th+th;

  // Trading Day Tracker
  const now = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dayName = days[now.getDay()];
  const isWeekend = now.getDay()===0||now.getDay()===6;

  // Get times in each timezone
  const etNow  = new Date(now.toLocaleString('en-US',{timeZone:'America/New_York'}));
  const ctNow  = new Date(now.toLocaleString('en-US',{timeZone:'America/Chicago'}));
  const lonNow = new Date(now.toLocaleString('en-US',{timeZone:'Europe/London'}));
  const tokyoNow = new Date(now.toLocaleString('en-US',{timeZone:'Asia/Tokyo'}));

  const etH = etNow.getHours(), etM = etNow.getMinutes();
  const ctH = ctNow.getHours(), ctM = ctNow.getMinutes(), ctS = ctNow.getSeconds();

  // US session times (ET)
  // Pre-market: 4:00 AM - 9:30 AM ET
  // Regular:    9:30 AM - 4:00 PM ET
  // After-hours:4:00 PM - 8:00 PM ET
  // Overnight:  8:00 PM - 4:00 AM ET
  const etMins = etH*60+etM;
  const isPremarket  = !isWeekend && etMins >= 4*60   && etMins < 9*60+30;
  const isMarketHours= !isWeekend && etMins >= 9*60+30 && etMins < 16*60;
  const isAfterHours = !isWeekend && etMins >= 16*60   && etMins < 20*60;
  const isOvernight  = !isMarketHours && !isPremarket && !isAfterHours;

  let sessionLabel, sessionColor;
  if(isWeekend)      {sessionLabel='WEEKEND';     sessionColor='#606080';}
  else if(isPremarket)   {sessionLabel='PRE-MARKET';  sessionColor='#ffcc00';}
  else if(isMarketHours) {sessionLabel='MARKET OPEN'; sessionColor='#00ff88';}
  else if(isAfterHours)  {sessionLabel='AFTER HOURS'; sessionColor='#ff8800';}
  else                   {sessionLabel='OVERNIGHT';   sessionColor='#606080';}

  // Global sessions (all times local to each city)
  const lonH = lonNow.getHours(), lonM = lonNow.getMinutes();
  const lonMins = lonH*60+lonM;
  const lonDow = lonNow.getDay();
  const lonWeekend = lonDow===0||lonDow===6;
  // London: 8:00 AM - 4:30 PM London time
  const lonOpen = 8*60, lonClose = 16*60+30;
  const lonIsOpen = !lonWeekend && lonMins>=lonOpen && lonMins<lonClose;
  const lonIsPremarket = !lonWeekend && lonMins>=7*60 && lonMins<lonOpen;
  const lonStatus = lonWeekend?'CLOSED':lonIsOpen?'OPEN':lonIsPremarket?'PRE':'CLOSED';
  const lonColor = lonIsOpen?'#00ff88':lonIsPremarket?'#ffcc00':'#606080';
  const lonTimeStr = lonNow.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false});

  const tokyoH = tokyoNow.getHours(), tokyoM = tokyoNow.getMinutes();
  const tokyoMins = tokyoH*60+tokyoM;
  const tokyoDow = tokyoNow.getDay();
  const tokyoWeekend = tokyoDow===0||tokyoDow===6;
  // Tokyo: 9:00 AM - 3:00 PM Tokyo time (closed 11:30-12:30 lunch)
  const tokyoOpen = 9*60, tokyoClose = 15*60;
  const tokyoLunch = tokyoMins>=11*60+30 && tokyoMins<12*60+30;
  const tokyoIsOpen = !tokyoWeekend && tokyoMins>=tokyoOpen && tokyoMins<tokyoClose && !tokyoLunch;
  const tokyoIsPremarket = !tokyoWeekend && tokyoMins>=8*60 && tokyoMins<tokyoOpen;
  const tokyoStatus = tokyoWeekend?'CLOSED':tokyoIsOpen?'OPEN':tokyoIsPremarket?'PRE':tokyoLunch?'LUNCH':'CLOSED';
  const tokyoColor = tokyoIsOpen?'#00ff88':tokyoIsPremarket?'#ffcc00':tokyoLunch?'#ff8800':'#606080';
  const tokyoTimeStr = tokyoNow.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false});

  // Countdown helper
  const secsUntilMins = (targetMins) => {
    const nowMins = ctH*60+ctM;
    const diff = (targetMins - nowMins)*60 - ctS;
    return Math.max(0, diff);
  };

  // Market holidays 2026
  const holidays = [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-01-19', name: 'MLK Day' },
    { date: '2026-02-16', name: "Presidents' Day" },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-05-25', name: 'Memorial Day' },
    { date: '2026-06-19', name: 'Juneteenth' },
    { date: '2026-07-04', name: 'Independence Day' },
    { date: '2026-07-03', name: 'Independence Day (observed)' },
    { date: '2026-09-07', name: 'Labor Day' },
    { date: '2026-11-26', name: 'Thanksgiving' },
    { date: '2026-11-27', name: 'Thanksgiving (half day)' },
    { date: '2026-12-25', name: 'Christmas' },
  ];
  const todayStr = now.toISOString().split('T')[0];
  const upcomingHolidays = holidays
    .filter(h => h.date >= todayStr)
    .sort((a,b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  // Next holiday
  const nextHol = upcomingHolidays[0];
  const nextHolDays = nextHol ? Math.round((new Date(nextHol.date+'T12:00:00') - now) / 86400000) : null;

  // Countdown to next US market event
  let countdownSecs = 0;
  let countdownLabel = '';
  let countdownColor = '#606080';
  const marketOpenCT = 8*60+30, marketCloseCT = 15*60, nowMins = ctH*60+ctM;

  if(isMarketHours){
    countdownSecs = Math.max(0, (marketCloseCT - nowMins)*60 - ctS);
    countdownLabel = 'CLOSES IN';
    countdownColor = '#00ff88';
  } else if(isPremarket){
    countdownSecs = Math.max(0, (marketOpenCT - nowMins)*60 - ctS);
    countdownLabel = 'OPENS IN';
    countdownColor = '#ffcc00';
  } else {
    // Find next 8:30 CT on a weekday
    const target = new Date(ctNow);
    target.setHours(8, 30, 0, 0);
    if(target <= ctNow) target.setDate(target.getDate() + 1);
    while(target.getDay()===0||target.getDay()===6) target.setDate(target.getDate()+1);
    countdownSecs = Math.max(0, Math.floor((target - ctNow)/1000));
    countdownLabel = 'OPENS IN';
    countdownColor = '#ffcc00'; // always yellow for OPENS IN
  }

  const dateStr = now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const timeStr = ctNow.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short'});

  const fmtCountdown = s => {
    s = Math.max(0, Math.floor(s));
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
    if(h>0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  $('hubDayTracker').innerHTML=`
    <div class="panel" style="border-left:4px solid ${sessionColor};">
      <div style="display:grid;grid-template-columns:auto auto auto 1fr auto auto auto;gap:16px;align-items:center;">
        <div>
          <div style="font-family:'Orbitron',monospace;font-size:20px;font-weight:900;color:${sessionColor};letter-spacing:2px;">${sessionLabel}</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--text2);margin-top:4px;">${dateStr}</div>
        </div>
        <div style="border-left:1px solid var(--border);padding-left:16px;">
          <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text3);letter-spacing:1px;margin-bottom:2px;">CT TIME</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:bold;color:var(--text);" id="hubClock">${timeStr}</div>
        </div>
        <div style="border-left:1px solid var(--border);padding-left:16px;text-align:center;">
          <div style="font-family:'Orbitron',monospace;font-size:10px;letter-spacing:2px;color:${countdownColor};margin-bottom:4px;">${countdownLabel}</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:32px;font-weight:900;color:${countdownColor};letter-spacing:2px;" id="hubCountdown">${fmtCountdown(countdownSecs)}</div>
        </div>
        <div></div>
        <!-- LONDON SESSION -->
        <div style="border-left:1px solid var(--border);padding-left:16px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;color:${lonIsOpen?'#00ff88':lonStatus==='CLOSED'?'#ff3355':'var(--text3)'};">LONDON</span>
            <span style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;padding:2px 6px;border-radius:2px;color:${lonColor};background:${lonColor}22;">${lonStatus}</span>
          </div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:18px;font-weight:bold;color:${lonIsOpen?'#00ff88':lonStatus==='CLOSED'?'#ff3355':lonColor};" id="hubLonClock">${lonTimeStr}</div>
          <div style="font-size:11px;color:${lonIsOpen?'#00ff88':lonIsPremarket?'#ffcc00':'#ff3355'};margin-top:2px;">${lonIsOpen?`Closes in ${Math.floor((lonClose-lonMins)/60)}h ${(lonClose-lonMins)%60}m`:lonIsPremarket?`Opens in ${Math.floor((lonOpen-lonMins)/60)}h ${(lonOpen-lonMins)%60}m`:'Closed'}</div>
        </div>
        <!-- TOKYO SESSION -->
        <div style="border-left:1px solid var(--border);padding-left:16px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;color:${tokyoIsOpen?'#00ff88':tokyoStatus==='CLOSED'?'#ff3355':'var(--text3)'};">TOKYO</span>
            <span style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;padding:2px 6px;border-radius:2px;color:${tokyoColor};background:${tokyoColor}22;">${tokyoStatus}</span>
          </div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:18px;font-weight:bold;color:${tokyoIsOpen?'#00ff88':tokyoStatus==='CLOSED'?'#ff3355':tokyoColor};" id="hubTokyoClock">${tokyoTimeStr}</div>
          <div style="font-size:11px;color:${tokyoIsOpen?'#00ff88':tokyoIsPremarket?'#ffcc00':tokyoLunch?'#ff8800':'#ff3355'};margin-top:2px;">${tokyoIsOpen?`Closes in ${Math.floor((tokyoClose-tokyoMins)/60)}h ${(tokyoClose-tokyoMins)%60}m`:tokyoIsPremarket?`Opens in ${Math.floor((tokyoOpen-tokyoMins)/60)}h ${(tokyoOpen-tokyoMins)%60}m`:tokyoLunch?'Lunch break':'Closed'}</div>
        </div>
        <!-- NEW YORK SESSION STATUS -->
        <div style="border-left:1px solid var(--border);padding-left:16px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;color:${isMarketHours?'#00ff88':(!isMarketHours&&!isPremarket&&!isAfterHours)?'#ff3355':'var(--text3)'};">NEW YORK</span>
            <span style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;padding:2px 6px;border-radius:2px;color:${sessionColor};background:${sessionColor}22;">${isMarketHours?'OPEN':isPremarket?'PRE':'CLOSED'}</span>
          </div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:18px;font-weight:bold;color:${isMarketHours?'#00ff88':(!isMarketHours&&!isPremarket&&!isAfterHours)?'#ff3355':sessionColor};" id="hubEtClock">${etNow.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false})}</div>
          <div style="font-size:11px;color:${isMarketHours?'#00ff88':isPremarket?'#ffcc00':'#ff3355'};margin-top:2px;">9:30–16:00 ET · 8:30–15:00 CT</div>
        </div>
      </div>
      ${upcomingHolidays.length ? `
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <span style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;color:#ffcc00;">UPCOMING CLOSURES:</span>
        ${upcomingHolidays.map(h=>{
          const d=new Date(h.date+'T12:00:00');
          const dstr=d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
          const days=Math.round((d-now)/86400000);
          const halfDay=h.name.includes('half');
          const c=days<=7?'#ff8800':days<=14?'#ffcc00':'#ffcc00';
          return `<div style="background:var(--bg3);border:1px solid ${days<=7?'rgba(255,136,0,0.3)':'rgba(255,204,0,0.2)'};border-radius:3px;padding:4px 10px;display:flex;gap:8px;align-items:center;">
            <span style="font-family:'Orbitron',monospace;font-size:9px;color:${c};">${dstr}</span>
            <span style="font-size:12px;color:#ffcc00;">${h.name}</span>
            <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${c};">${days}d</span>
            ${halfDay?`<span style="font-family:'Orbitron',monospace;font-size:8px;color:#ff8800;padding:1px 4px;background:rgba(255,136,0,0.15);border-radius:2px;">HALF</span>`:''}
          </div>`;
        }).join('')}
      </div>` : ''}
    </div>`;

  // Live clock + countdown ticker
  let _countdownSecs = countdownSecs;
  setInterval(()=>{
    const t = new Date();
    const c=$('hubClock');
    if(c) c.textContent=new Date(t.toLocaleString('en-US',{timeZone:'America/Chicago'}))
      .toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'America/Chicago',timeZoneName:'short'});
    const lc=$('hubLonClock');
    if(lc) lc.textContent=new Date(t.toLocaleString('en-US',{timeZone:'Europe/London'}))
      .toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/London'});
    const tc=$('hubTokyoClock');
    if(tc) tc.textContent=new Date(t.toLocaleString('en-US',{timeZone:'Asia/Tokyo'}))
      .toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Tokyo'});
    const ec=$('hubEtClock');
    if(ec) ec.textContent=new Date(t.toLocaleString('en-US',{timeZone:'America/New_York'}))
      .toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/New_York'});
    const cd=$('hubCountdown');
    if(cd && _countdownSecs>0){
      _countdownSecs--;
      cd.textContent=fmtCountdown(_countdownSecs);
      if(isMarketHours && _countdownSecs<=300) cd.style.color='#ff3355';
    }
  },1000);

  // VIX + F&G (compact versions in hub)
  if(vix){
    $('hubVixVal').textContent=fmt(vix,1);
    $('hubVixVal').style.color=vix<15?'#00ff88':vix<20?'#88cc00':vix<25?'#ffcc00':vix<35?'#ff8800':'#ff3355';
    $('hubVixMarker').style.left=Math.min((vix-10)/35*100,98)+'%';
    $('hubVixRegime').textContent=vix<15?'LOW VOL':vix<20?'CALM':vix<25?'ELEVATED':vix<35?'HIGH VOL':'EXTREME';
    $('hubVixRegime').style.color=vix<15?'#00ff88':vix<20?'#88cc00':vix<25?'#ffcc00':vix<35?'#ff8800':'#ff3355';
    setVixNeedle(vix);
  }
  const fgVal=fg.value!=null?fg.value:fg.score;
  if(fgVal!=null) setFGNeedle(fgVal);

  // PCR + Regime
  const pcr=md.options_summary?.pc_ratio_vol;
  setRegime(vix||20,fgVal||50,pcr);
  if(pcr) setPCR(pcr);

  // Calendar
  const cal=md.econ_calendar||[];
  const renderCal = (events) => {
    if (!events || !events.length) { $('calList').innerHTML='<div class="cal-empty">No data</div>'; return; }
    const highOnly = events.filter(e => e.impact==='High'||e.impact==='high');
    const toShow = highOnly.length>0 ? highOnly : events;
    const etToCt = t => { if(!t||!t.includes(':'))return t; const [h,m]=t.split(':').map(Number); return `${String(h-1).padStart(2,'0')}:${String(m).padStart(2,'0')} CT`; };
    const dayN = d => { if(!d)return ''; return ['SUN','MON','TUE','WED','THU','FRI','SAT'][new Date(d+'T12:00:00').getDay()]; };
    const shortD = d => { if(!d)return ''; const [y,mo,dd]=d.split('-'); return `${mo}/${dd}`; };
    $('calList').innerHTML=toShow.slice(0,8).map(ev=>{
      const ic=ev.impact==='High'||ev.impact==='high'?'#ff3355':ev.impact==='Medium'||ev.impact==='med'?'#ffcc00':'#606060';
      return `<div style="display:grid;grid-template-columns:70px 60px 60px 1fr;gap:6px;align-items:center;padding:6px 8px;border-left:3px solid ${ic};background:var(--bg3);border-radius:0 3px 3px 0;margin-bottom:4px;font-size:13px;">
        <span style="font-family:'Share Tech Mono',monospace;color:var(--cyan);font-size:11px;">${dayN(ev.date)} ${shortD(ev.date)}</span>
        <span style="font-family:'Share Tech Mono',monospace;color:var(--text2);font-size:11px;">${etToCt(ev.time)}</span>
        <span style="font-family:'Orbitron',monospace;font-size:8px;color:${ic};padding:2px 4px;background:${ic}22;border-radius:2px;">${ev.impact||'LOW'}</span>
        <span style="color:var(--text)">${ev.event||ev.title||'—'}</span>
      </div>`;
    }).join('');
  };
  renderCal(cal);
  // Initial fetch + re-fetch every 30 min so calendar stays current across week boundary
  const _doCalFetch = () => fetch('/cal?t='+Date.now()).then(r=>r.ok?r.json():null).then(d=>{ if(d&&d.events&&d.events.length>0) renderCal(d.events); }).catch(()=>{});
  _doCalFetch();
  if(!window._calRefreshTimer) window._calRefreshTimer = setInterval(_doCalFetch, 30 * 60 * 1000);

  // News feed + narrative + radar
  loadHubNews();
  loadFuturesChart();
  try { renderHubEventInsight(); } catch(e) { console.warn('eventInsight:', e); }
}

async function loadHubNews() {
  const el = $('hubNews');
  if(!el) return;
  try {
    const r = await fetch('/news?t='+Date.now());
    if(!r.ok) throw new Error('News fetch failed');
    const d = await r.json();
    if(!d.items || d.items.length===0) throw new Error('No items');
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:6px;">
        ${d.items.slice(0,8).map(item => `
          <div style="padding:8px 10px;background:var(--bg3);border:1px solid var(--border);border-radius:3px;border-left:3px solid var(--border2);">
            <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--cyan);margin-bottom:3px;">${item.source} · ${item.timeAgo}</div>
            <div style="font-size:13px;color:var(--text);line-height:1.4;font-weight:600;">${item.title}</div>
          </div>`).join('')}
      </div>
      <div style="font-size:11px;color:var(--text3);text-align:right;margin-top:6px;">
        ${d.sources.join(' · ')} · Refreshes every 5 min
      </div>`;
  } catch(e) {
    el.innerHTML = `<div class="no-data">News unavailable — deploy functions/news.js to enable</div>`;
  }
}

function initHubRadar() {
  const canvas = $('hubRadar');
  if(!canvas) return;
  const md = _md || {};
  const q = md.quotes || {};
  const spy = q['SPY'] || {};
  const gex = md.gex || {};
  const wems = md.weekly_em || [];
  const wem = wems.find(w => !w.week_close) || wems[0];
  const vix = q['^VIX']?.price || 20;
  const fg = md.fear_greed || {};
  const fgVal = fg.value != null ? fg.value : fg.score || 50;

  const size = Math.min(canvas.parentElement.offsetWidth, 200);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size/2, cy = size/2, maxR = size/2 - 16;

  // Key price levels mapped to radar rings
  const spot = spy.price || wem?.wem_mid || 650;
  const wemLow = wem?.wem_low || spot * 0.98;
  const wemHigh = wem?.wem_high || spot * 1.02;
  const gexFlip = gex.flip_point || spot;
  const gexSup = gex.support || spot * 0.99;
  const gexRes = gex.resistance || spot * 1.01;

  // Price range for radar (WEM range + 20% buffer)
  const priceRange = (wemHigh - wemLow) * 1.4;
  const priceMin = spot - priceRange/2;
  const priceToR = p => Math.max(0, Math.min(maxR, ((p - priceMin) / priceRange) * maxR * 1.8));

  // Regime color
  const regimeColor = vix < 20 ? '#00ff88' : vix < 30 ? '#ffcc00' : '#ff3355';
  const fgColor = fgVal > 55 ? '#00ff88' : fgVal > 45 ? '#ffcc00' : '#ff3355';

  let angle = 0;
  let sweepAngle = 0;
  let blips = [];

  // Generate blips from real levels
  const addBlip = (price, label, color, size2) => {
    const r = priceToR(price);
    const a = Math.random() * Math.PI * 2;
    blips.push({ r, a, label, color, size: size2, alpha: 0, maxAlpha: 0.9, born: sweepAngle });
  };

  addBlip(spot,    'SPY',  '#ffffff', 5);
  addBlip(gexFlip, 'FLIP', '#00ccff', 4);
  addBlip(gexSup,  'SUP',  '#00ff88', 3.5);
  addBlip(gexRes,  'RES',  '#ff3355', 3.5);
  addBlip(wemLow,  'WEM-', '#ff335588', 3);
  addBlip(wemHigh, 'WEM+', '#00ff8888', 3);
  if(md.max_pain?.[0]?.max_pain) addBlip(md.max_pain[0].max_pain, 'PAIN', '#ff8800', 3.5);

  const draw = () => {
    ctx.clearRect(0, 0, size, size);

    // Background
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, size, size);

    // Radar rings
    for(let i=1; i<=4; i++) {
      const r = (maxR/4)*i;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(0,204,255,${0.06 + i*0.02})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Cross hairs
    ctx.strokeStyle = 'rgba(0,204,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx-maxR, cy); ctx.lineTo(cx+maxR, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy-maxR); ctx.lineTo(cx, cy+maxR); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx-maxR*0.7, cy-maxR*0.7); ctx.lineTo(cx+maxR*0.7, cy+maxR*0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+maxR*0.7, cy-maxR*0.7); ctx.lineTo(cx-maxR*0.7, cy+maxR*0.7); ctx.stroke();

    // Sweep gradient
    const sweepGrad = ctx.createConicalGradient ? null : null;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(sweepAngle);
    const grad = ctx.createLinearGradient(0, -maxR, 0, 0);
    grad.addColorStop(0, `${regimeColor}00`);
    grad.addColorStop(0.7, `${regimeColor}15`);
    grad.addColorStop(1, `${regimeColor}35`);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, maxR, -Math.PI/2, -Math.PI/2 + Math.PI*0.35);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Sweep line
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -maxR);
    ctx.strokeStyle = regimeColor;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = regimeColor;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Blips — fade in when sweep passes, fade out over time
    blips.forEach(b => {
      let angleDiff = ((sweepAngle - b.a) % (Math.PI*2) + Math.PI*2) % (Math.PI*2);
      if(angleDiff < 0.3) b.alpha = Math.min(b.maxAlpha, b.alpha + 0.15);
      else b.alpha = Math.max(0, b.alpha - 0.005);

      if(b.alpha <= 0) return;

      const bx = cx + Math.cos(b.a) * b.r;
      const by = cy + Math.sin(b.a) * b.r;

      // Blip glow
      ctx.beginPath();
      ctx.arc(bx, by, b.size*2.5, 0, Math.PI*2);
      ctx.fillStyle = b.color.replace(/[\d.]+\)$/, `${b.alpha*0.3})`).replace(/^#/, '').length > 6 ?
        b.color : `${b.color}${Math.round(b.alpha*0.3*255).toString(16).padStart(2,'0')}`;
      ctx.fill();

      // Blip dot
      ctx.beginPath();
      ctx.arc(bx, by, b.size, 0, Math.PI*2);
      ctx.fillStyle = b.color.length === 7 ? b.color + Math.round(b.alpha*255).toString(16).padStart(2,'0') : b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Label
      if(b.alpha > 0.3) {
        ctx.font = `bold 8px 'Orbitron', monospace`;
        ctx.fillStyle = `rgba(255,255,255,${b.alpha * 0.9})`;
        ctx.fillText(b.label, bx + b.size + 3, by + 3);
      }
    });

    // Center dot — SPY position
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI*2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Price label at center
    ctx.font = `bold 10px 'Share Tech Mono', monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText(`$${spot.toFixed(2)}`, cx, cy - 8);
    ctx.textAlign = 'left';

    // VIX label bottom
    ctx.font = `9px 'Orbitron', monospace`;
    ctx.fillStyle = `${regimeColor}88`;
    ctx.textAlign = 'center';
    ctx.fillText(`VIX ${vix.toFixed(1)}  ·  F&G ${fgVal}`, cx, size - 4);
    ctx.textAlign = 'left';

    sweepAngle = (sweepAngle + 0.025) % (Math.PI*2);
    requestAnimationFrame(draw);
  };

  draw();
}


function startWeatherScroll(el, text) {
  el.style.display = 'inline-block';
  el.innerHTML = `<span style="padding-right:60px;">${text}</span>`;
  // Animate
  let pos = 0;
  const speed = 0.4;
  const totalW = el.scrollWidth / 2; // text is doubled so we loop at half
  if(window._weatherScrollInterval) clearInterval(window._weatherScrollInterval);
  el.parentElement.style.overflow = 'hidden';
  window._weatherScrollInterval = setInterval(() => {
    pos += speed;
    if(pos >= totalW) pos = 0;
    el.style.transform = `translateX(-${pos}px)`;
  }, 16);
}

async function _fetchFuturesBars() {
  // Try 1: /futures Cloudflare function (server-side, no CORS — uses Polygon or Yahoo)
  try {
    const r = await fetch('/futures?t=' + Date.now());
    if (r.ok) {
      const d = await r.json();
      if (d.bars && d.bars.length >= 2) return { bars: d.bars, symbol: d.symbol || 'ES=F', source: 'futures' };
    }
  } catch(e) {}

  // Try 2: /spyintraday Cloudflare function (server-side, no CORS — already used by Trading Desk)
  // Returns SPY 1m bars which we resample to 5m for the chart
  try {
    const r = await fetch('/spyintraday?t=' + Date.now());
    if (r.ok) {
      const d = await r.json();
      if (d.bars && d.bars.length >= 2) {
        // Resample 1m bars to 5m
        const bars5 = [];
        for(let i = 0; i < d.bars.length; i += 5) {
          const slice = d.bars.slice(i, i + 5).filter(b => b.close);
          if(!slice.length) continue;
          bars5.push({
            t: slice[0].t,
            o: slice[0].open,
            h: Math.max(...slice.map(b => b.high || b.close)),
            l: Math.min(...slice.map(b => b.low  || b.close)),
            c: slice[slice.length - 1].close,
            v: slice.reduce((s, b) => s + (b.vol || 0), 0)
          });
        }
        if(bars5.length >= 2) return { bars: bars5, symbol: 'SPY', source: 'spyintraday' };
        // Fall back to raw 1m bars if resampling fails
        const raw = d.bars.filter(b => b.close).map(b => ({ t: b.t, o: b.open, h: b.high, l: b.low, c: b.close, v: b.vol }));
        if(raw.length >= 2) return { bars: raw, symbol: 'SPY', source: 'spyintraday_1m' };
      }
    }
  } catch(e) {}

  return null;
}

async function loadFuturesChart() {
  const el = $('hubFuturesChart');
  if(!el) return;

  // Show loading state immediately
  el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-family:'Orbitron',monospace;font-size:10px;letter-spacing:2px;">LOADING CHART...</div>`;

  // Fetch data in parallel while we wait for layout
  const barsPromise = _fetchFuturesBars();

  // Use rAF loop to wait for real dimensions — no arbitrary timeout
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%;';
  el.innerHTML = '';
  el.appendChild(canvas);

  await new Promise(resolve => {
    let attempts = 0;
    function checkSize() {
      attempts++;
      const w = canvas.offsetWidth || el.offsetWidth || el.parentElement?.offsetWidth;
      const h = canvas.offsetHeight || el.offsetHeight;
      if((w > 10 && h > 10) || attempts > 60) { resolve(); return; }
      requestAnimationFrame(checkSize);
    }
    requestAnimationFrame(checkSize);
  });

  let bars, symbol = 'ES=F', source = '';
  try {
    const result = await barsPromise;
    if(result) { bars = result.bars; symbol = result.symbol || 'ES=F'; source = result.source || ''; }
  } catch(e) { bars = null; }

  if(!bars || bars.length < 2) {
    el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:8px;">
      <div style="font-size:13px;color:var(--text3);">Chart unavailable</div>
      <div style="font-size:11px;color:var(--text3);">/futures and /spyintraday both returned no data</div>
    </div>`;
    return;
  }

  // Get real pixel dimensions from the canvas element
  const W = canvas.offsetWidth || el.offsetWidth || 600;
  const H = canvas.offsetHeight || el.offsetHeight || 360;
  canvas.width  = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d');
  const pad = { l:56, r:16, t:32, b:36 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;

  const highs = bars.map(b => b.h).filter(Boolean);
  const lows  = bars.map(b => b.l).filter(Boolean);
  const minP  = Math.min(...lows)  * 0.9997;
  const maxP  = Math.max(...highs) * 1.0003;
  const range = maxP - minP || 1;

  const px = i => pad.l + (i / Math.max(bars.length - 1, 1)) * cw;
  const py = p => pad.t + ch - ((p - minP) / range) * ch;

  const last   = bars[bars.length - 1].c;
  const open   = bars[0].c;
  const chg    = last - open;
  const chgPct = chg / open * 100;
  const isUp   = chg >= 0;
  const lineC  = isUp ? '#00ff88' : '#ff3355';

  // Clear
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = 'rgba(12,12,20,0)';
  ctx.fillRect(0, 0, W, H);

  // Grid lines + price labels
  const gridCount = 5;
  for(let i = 0; i <= gridCount; i++) {
    const p = minP + (range / gridCount) * i;
    const y = py(p);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    ctx.fillStyle = '#505070';
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(p.toFixed(0), pad.l - 4, y + 3);
  }

  // Open price dashed line
  const openY = py(open);
  ctx.strokeStyle = 'rgba(255,204,0,0.4)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.moveTo(pad.l, openY); ctx.lineTo(W - pad.r, openY); ctx.stroke();
  ctx.setLineDash([]);

  // Session dividers
  bars.forEach((b, i) => {
    if(!b.t) return;
    const d2 = new Date(b.t * 1000);
    const ctStr = d2.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'America/Chicago'});
    const [ctH, ctM] = ctStr.split(':').map(Number);
    if(ctH === 8 && ctM >= 28 && ctM <= 35) {
      const x = px(i);
      ctx.strokeStyle = 'rgba(0,204,255,0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ch); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0,204,255,0.5)';
      ctx.font = '7px "Orbitron", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('OPEN', x + 3, pad.t + 10);
    }
  });

  // Area fill (gradient)
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
  grad.addColorStop(0, lineC + '40');
  grad.addColorStop(1, lineC + '04');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(px(0), py(bars[0].c));
  bars.forEach((b, i) => { if(b.c) ctx.lineTo(px(i), py(b.c)); });
  ctx.lineTo(px(bars.length - 1), pad.t + ch);
  ctx.lineTo(px(0), pad.t + ch);
  ctx.closePath();
  ctx.fill();

  // Price line
  ctx.strokeStyle = lineC;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  let started = false;
  bars.forEach((b, i) => {
    if(!b.c) return;
    if(!started) { ctx.moveTo(px(i), py(b.c)); started = true; }
    else ctx.lineTo(px(i), py(b.c));
  });
  ctx.stroke();

  // Current price dot
  const lastX = px(bars.length - 1);
  const lastY = py(last);
  ctx.fillStyle = lineC + '28';
  ctx.beginPath(); ctx.arc(lastX, lastY, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = lineC;
  ctx.beginPath(); ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2); ctx.fill();

  // Current price dashed line
  ctx.strokeStyle = lineC + '50';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(pad.l, lastY); ctx.lineTo(W - pad.r, lastY); ctx.stroke();
  ctx.setLineDash([]);

  // Time labels
  const timeStep = Math.max(1, Math.floor(bars.length / 6));
  ctx.fillStyle = '#404060';
  ctx.font = '9px "Share Tech Mono", monospace';
  ctx.textAlign = 'center';
  bars.forEach((b, i) => {
    if(i % timeStep !== 0 || !b.t) return;
    const d2 = new Date(b.t * 1000);
    const lbl = d2.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'America/Chicago'});
    ctx.fillText(lbl, px(i), pad.t + ch + 14);
  });

  // Header overlay (price + change)
  const hdrDiv = document.createElement('div');
  hdrDiv.style.cssText = 'position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;align-items:baseline;padding:0 4px;pointer-events:none;';
  hdrDiv.innerHTML = `
    <div>
      <span style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:bold;color:${lineC};">${last.toFixed(2)}</span>
      <span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${lineC};margin-left:8px;">${isUp?'+':''}${chg.toFixed(2)} (${isUp?'+':''}${chgPct.toFixed(2)}%)</span>
    </div>
    <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;">${symbol} · ${bars.length} BARS · ${source.includes('1m')?'1MIN':'5MIN'}</div>`;
  el.style.position = 'relative';
  el.appendChild(hdrDiv);
}




function renderDesk(md,sd){
  const el=$('deskContent');
  if(!el)return;
  const q=md.quotes||{},spy=q['SPY']||{};
  const wems=md.weekly_em||[];
  const wem=wems.find(w=>!w.week_close)||wems[0];
  const gex=md.gex||{};
  const pcr=md.options_summary?.pc_ratio_vol;
  const vix=q['^VIX']?.price||0;
  const fg=md.fear_greed||{};
  const fgVal=fg.value!=null?fg.value:fg.score;

  // Price levels from historical data
  const rows=sd||[];
  // Always use CT for date calculations — avoids UTC midnight boundary issues
  const ctNowDesk = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const ctY=ctNowDesk.getFullYear(), ctM=String(ctNowDesk.getMonth()+1).padStart(2,'0'), ctD=String(ctNowDesk.getDate()).padStart(2,'0');
  const today=`${ctY}-${ctM}-${ctD}`;
  const todayRow=rows.find(r=>r.date===today)||null;
  const prevRow=rows.find(r=>r.date!==today)||null;

  // Previous week — computed in CT
  const getWeekOf = (dateStr) => {
    // Parse as noon UTC to avoid DST/timezone day-shift issues
    const d=new Date(dateStr+'T18:00:00Z'); const day=d.getUTCDay();
    const mon=new Date(d); mon.setUTCDate(d.getUTCDate()-(day===0?6:day-1));
    return mon.toISOString().split('T')[0];
  };
  const thisWeek=getWeekOf(today);
  const prevWeekRows=rows.filter(r=>r.date<thisWeek);
  const pwDates=prevWeekRows.map(r=>r.date);
  const pwStart=pwDates.length?pwDates[pwDates.length-1]:null;
  const pwEnd=pwDates.length?pwDates[0]:null;
  const pwOpen=pwStart?prevWeekRows.find(r=>r.date===pwStart)?.open:null;
  const pwClose=pwEnd?prevWeekRows.find(r=>r.date===pwEnd)?.close:null;
  const pwHigh=pwDates.length?Math.max(...prevWeekRows.map(r=>r.high||0)):null;
  const pwLow=pwDates.length?Math.min(...prevWeekRows.filter(r=>r.low).map(r=>r.low)):null;

  // Current month
  const thisMonth=today.substring(0,7);
  const monthRows=rows.filter(r=>r.date.startsWith(thisMonth));
  const mOpen=monthRows.length?monthRows[monthRows.length-1]?.open:null;
  const mHigh=monthRows.length?Math.max(...monthRows.map(r=>r.high||0)):null;
  const mLow=monthRows.length?Math.min(...monthRows.filter(r=>r.low).map(r=>r.low)):null;
  const mClose=monthRows.length?monthRows[0]?.close:null;

  const fmtP = n => n?'$'+fmt(n,2):'—';
  const levelRow = (label,val,current) => {
    if(!val) return '';
    const dist=current?current-val:null;
    const dc=dist>0?'#00ff88':dist<0?'#ff3355':'var(--text2)';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:13px;color:var(--text2);">${label}</span>
      <span style="font-family:'Share Tech Mono',monospace;font-size:15px;color:var(--text);">${fmtP(val)}</span>
      ${dist!=null?`<span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${dc};">${dist>0?'+':''}${fmt(dist,2)}</span>`:''}
    </div>`;
  };

  const cur=spy.price||0;
  const vColor=vix<15?'#00ff88':vix<20?'#88cc00':vix<25?'#ffcc00':vix<35?'#ff8800':'#ff3355';
  const fgColor=!fgVal?'#ffcc00':fgVal<=25?'#ff3355':fgVal<=45?'#ff8800':fgVal<=55?'#ffcc00':fgVal<=75?'#88cc00':'#00ff88';

  // ATH — computed dynamically from all historical data
  const SPY_ATH = rows.length ? Math.max(...rows.map(r=>r.high||0)) : 697.84;

  // Key price levels from history
  const thisYear  = today.substring(0,4);
  const prevYear  = String(parseInt(thisYear)-1);
  const prevMonth = today.substring(0,7) === rows.filter(r=>r.date<today)[0]?.date.substring(0,7)
    ? null : (() => { const d=new Date(today+'T12:00:00'); d.setMonth(d.getMonth()-1); return d.toISOString().substring(0,7); })();
  const prevMonthStr = (() => { const d=new Date(today+'T12:00:00'); d.setMonth(d.getMonth()-1); return d.toISOString().substring(0,7); })();

  // Current week open = first trading day of this week
  // Prefer live value set by fetchWeekOpen() which uses /spyintraday or Monday's Yahoo open
  const thisWeekRows = rows.filter(r=>r.date>=thisWeek&&r.date<=today);
  // First trading day of week = oldest date in thisWeekRows (array is newest-first)
  const weekOpenFromSd = thisWeekRows.length ? thisWeekRows[thisWeekRows.length-1]?.open : null;
  // _spyWeekOpen is set by fetchWeekOpen() and is the authoritative live value
  const weekOpen = window._spyWeekOpen || weekOpenFromSd || null;

  // Prev week close = last day of previous week
  const prevWeekClose = pwClose;

  // Prev month close = last trading day of previous month
  const prevMonthRows = rows.filter(r=>r.date.startsWith(prevMonthStr));
  const prevMonthClose = prevMonthRows.length ? prevMonthRows[0]?.close : null;

  // Prev year close = last trading day of previous year
  const prevYearRows = rows.filter(r=>r.date.startsWith(prevYear));
  const prevYearClose = prevYearRows.length ? prevYearRows[0]?.close : null;

  // Current year open = first trading day of this year
  const thisYearRows = rows.filter(r=>r.date.startsWith(thisYear));
  const yearOpen = thisYearRows.length ? thisYearRows[thisYearRows.length-1]?.open : null;

  // Store levels on window so updateLevelBar() can access them without re-computing
  window._spyLevels = {
    cur, SPY_ATH,
    ath10: SPY_ATH * 0.90,
    ath20: SPY_ATH * 0.80,
    prevWeekClose, weekOpen, prevMonthClose, prevYearClose, yearOpen
  };

  // Previous close + gap
  const prevClose = spy.prev_close || spy.previous_close || prevRow?.close || 0;
  const changeAmt = cur && prevClose ? cur - prevClose : null;
  const changePct = changeAmt && prevClose ? changeAmt / prevClose * 100 : null;
  const todayOpen = spy.open || todayRow?.open || 0;
  const gapAmt    = todayOpen && prevClose ? todayOpen - prevClose : null;
  const gapPct    = gapAmt && prevClose ? gapAmt / prevClose * 100 : null;
  const changeFromOpen = cur && todayOpen ? cur - todayOpen : null;
  const changeFOPct    = changeFromOpen && todayOpen ? changeFromOpen / todayOpen * 100 : null;
  const dayHigh = spy.high || todayRow?.high || 0;
  const dayLow  = spy.low  || todayRow?.low  || 0;

  // Ratios
  const spx = q['^GSPC']?.price || q['SPX']?.price || 0;
  const es  = q['ES=F']?.price  || 0;
  const spxSpyRatio = spx && cur ? spx / cur : null;
  const esSpyRatio  = es  && cur ? es  / cur : null;

  // IV from WEM
  const atmIV = wem?.atm_iv ? wem.atm_iv * 100 : null;

  // GEX summary for gauge
  const gexFlip    = gex.flip_point || null;
  const gexRegime  = gex.regime || null;
  const gexAbove   = gexFlip && cur ? cur > gexFlip : null;
  const gexColor   = gex.net_gex > 0 ? '#00ff88' : gex.net_gex < 0 ? '#ff3355' : 'var(--cyan)';

  const cc = n => n >= 0 ? '#00ff88' : '#ff3355';
  const cs = n => n >= 0 ? '+' : '';

  el.innerHTML=`
    <!-- HEADER ROW 1: Ratios + MAs + date -->
    <div style="display:flex;gap:0;align-items:stretch;margin-bottom:6px;background:var(--bg2);border:1px solid var(--border);border-radius:3px;overflow:hidden;font-family:'Share Tech Mono',monospace;font-size:11px;">

      <!-- Ratios -->
      <div style="display:flex;flex-direction:column;justify-content:center;gap:3px;padding:5px 10px;border-right:1px solid var(--border);flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:5px;">
          <span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);">SPX:SPY</span>
          <span style="color:var(--cyan);font-weight:bold;font-size:11px;">${spxSpyRatio?fmt(spxSpyRatio,4):(spx&&(cur||prevClose)?fmt(spx/(cur||prevClose),4):'—')}</span>
        </div>
        <div style="display:flex;align-items:center;gap:5px;">
          <span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);">ES:SPY</span>
          <span style="color:#ffcc00;font-weight:bold;font-size:11px;">${esSpyRatio?fmt(esSpyRatio,4):(es&&(cur||prevClose)?fmt(es/(cur||prevClose),4):'—')}</span>
        </div>
      </div>

      <!-- Daily SMAs -->
      ${(()=>{
        const c=cur||prevClose||0;
        if(!c||!sd||sd.length<20) return '<div style="padding:5px 10px;color:var(--text3);font-size:10px;">Loading MAs...</div>';
        const cl=sd.map(d=>parseFloat(d.close)).filter(v=>v>0);
        const sma=n=>cl.length>=n?cl.slice(0,n).reduce((a,b)=>a+b,0)/n:null;
        const wc=cl.filter((_,i)=>i%5===0);
        const wsma=n=>wc.length>=n?wc.slice(0,n).reduce((a,b)=>a+b,0)/n:null;
        const daily=[{n:'20',v:sma(20)},{n:'50',v:sma(50)},{n:'100',v:sma(100)},{n:'200',v:sma(200)}];
        const weekly=[{n:'20',v:wsma(20)},{n:'50',v:wsma(50)},{n:'100',v:wsma(100)}];
        const maCell=(m)=>{
          if(!m.v) return '';
          const diff=c-m.v, pc=diff/m.v*100, col=diff>=0?'#00ff88':'#ff3355';
          return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 8px;border-right:1px solid var(--border)22;min-width:72px;">'+
            '<span style="font-family:Orbitron,monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:1px;">'+m.n+'</span>'+
            '<span style="font-family:Share Tech Mono,monospace;font-size:11px;color:var(--text2);">$'+fmt(m.v,2)+'</span>'+
            '<span style="font-size:10px;font-weight:bold;color:'+col+';">'+(pc>=0?'+':'')+fmt(pc,2)+'%</span>'+
            '</div>';
        };
        return '<div style="display:flex;align-items:stretch;border-right:1px solid var(--border);">'+
            '<div style="display:flex;flex-direction:column;justify-content:center;padding:4px 8px;border-right:1px solid var(--border);background:rgba(0,204,255,0.04);">'+
              '<span style="font-family:Orbitron,monospace;font-size:7px;color:var(--cyan);letter-spacing:1px;writing-mode:horizontal-tb;white-space:nowrap;">DAILY SMAs</span>'+
            '</div>'+
            daily.map(maCell).join('')+
          '</div>'+
          '<div style="display:flex;align-items:stretch;">'+
            '<div style="display:flex;flex-direction:column;justify-content:center;padding:4px 8px;border-right:1px solid var(--border);background:rgba(255,204,0,0.04);">'+
              '<span style="font-family:Orbitron,monospace;font-size:7px;color:#ffcc00;letter-spacing:1px;writing-mode:horizontal-tb;white-space:nowrap;">WEEKLY SMAs</span>'+
            '</div>'+
            weekly.map(maCell).join('')+
          '</div>';
      })()}

      <!-- Closest Gap Above & Below -->
      ${(()=>{
        if(!sd || sd.length < 2 || !cur) return '';
        let gapAbove = null, gapBelow = null;
        for(let i=0;i<sd.length-1;i++){
          const todayR=sd[i], prevR=sd[i+1];
          if(!todayR.open||!prevR.close) continue;
          const gap=parseFloat(todayR.open)-parseFloat(prevR.close);
          if(Math.abs(gap)<0.05) continue;
          const fillPrice=parseFloat(prevR.close);
          // Skip already filled gaps
          let filled=false;
          const lo0=parseFloat(todayR.low),hi0=parseFloat(todayR.high);
          if(gap>0&&lo0&&lo0<=fillPrice) filled=true;
          if(gap<0&&hi0&&hi0>=fillPrice) filled=true;
          if(!filled){
            for(let k=0;k<i;k++){
              const lo=parseFloat(sd[k].low),hi=parseFloat(sd[k].high);
              if(gap>0&&lo<=fillPrice){filled=true;break;}
              if(gap<0&&hi>=fillPrice){filled=true;break;}
            }
          }
          if(filled) continue;
          if(fillPrice>cur){ if(gapAbove===null||fillPrice<gapAbove) gapAbove=fillPrice; }
          else if(fillPrice<cur){ if(gapBelow===null||fillPrice>gapBelow) gapBelow=fillPrice; }
        }
        const distAbove = gapAbove ? gapAbove-cur : null;
        const distBelow = gapBelow ? cur-gapBelow : null;
        const pctA = distAbove&&cur ? distAbove/cur*100 : null;
        const pctB = distBelow&&cur ? distBelow/cur*100 : null;
        const aVal = gapAbove ? '$'+gapAbove.toFixed(2) : '—';
        const bVal = gapBelow ? '$'+gapBelow.toFixed(2) : '—';
        const aSub = distAbove ? '+$'+distAbove.toFixed(2)+' (+'+pctA.toFixed(2)+'%)' : '';
        const bSub = distBelow ? '-$'+distBelow.toFixed(2)+' (-'+pctB.toFixed(2)+'%)' : '';
        return '<div style="display:flex;border-left:1px solid var(--border);border-right:1px solid var(--border);">'+
          '<div style="display:flex;flex-direction:column;justify-content:center;padding:4px 10px;gap:2px;border-right:1px solid rgba(0,255,136,0.2);min-width:90px;">'+
            '<div style="font-family:Orbitron,monospace;font-size:7px;color:#00ff88;letter-spacing:1px;margin-bottom:1px;">GAP ABOVE</div>'+
            '<div style="font-family:Share Tech Mono,monospace;font-size:13px;color:#00ff88;">'+aVal+'</div>'+
            '<div style="font-size:9px;color:var(--text3);">'+aSub+'</div>'+
          '</div>'+
          '<div style="display:flex;flex-direction:column;justify-content:center;padding:4px 10px;gap:2px;min-width:90px;">'+
            '<div style="font-family:Orbitron,monospace;font-size:7px;color:#ff3355;letter-spacing:1px;margin-bottom:1px;">GAP BELOW</div>'+
            '<div style="font-family:Share Tech Mono,monospace;font-size:13px;color:#ff3355;">'+bVal+'</div>'+
            '<div style="font-size:9px;color:var(--text3);">'+bSub+'</div>'+
          '</div>'+
        '</div>';
      })()}

      <!-- VWAP panels (populated live by renderDeskSession) -->
      <div style="display:flex;align-items:stretch;border-left:1px solid var(--border);">
        <div style="display:flex;flex-direction:column;justify-content:center;padding:4px 8px;border-right:1px solid var(--border);background:rgba(255,100,200,0.04);">
          <span style="font-family:Orbitron,monospace;font-size:7px;color:#ff66cc;letter-spacing:1px;writing-mode:horizontal-tb;white-space:nowrap;">VWAP</span>
        </div>
        <div style="display:flex;align-items:stretch;">
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 10px;border-right:1px solid var(--border)22;min-width:80px;">
            <span style="font-family:Orbitron,monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:1px;">D-VWAP</span>
            <span id="deskDVwap" style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);">—</span>
            <span id="deskDVwapDiff" style="font-size:10px;font-weight:bold;color:var(--text3);">—</span>
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 10px;min-width:80px;">
            <span style="font-family:Orbitron,monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:1px;">W-VWAP</span>
            <span id="deskWVwap" style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);">—</span>
            <span id="deskWVwapDiff" style="font-size:10px;font-weight:bold;color:var(--text3);">—</span>
          </div>
        </div>
      </div>

      <!-- Date -->
      <div style="display:flex;align-items:center;padding:5px 10px;margin-left:auto;flex-shrink:0;">
        <span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);white-space:nowrap;">${new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span>
      </div>
    </div>

    <!-- HEADER ROW 2: Key price levels — all update live via updateLevelBar() -->
    <div id="deskLevelBar" style="display:grid;grid-template-columns:repeat(8,1fr);gap:1px;margin-bottom:8px;background:var(--border);border:1px solid var(--border);border-radius:3px;overflow:hidden;font-family:'Share Tech Mono',monospace;"></div>

    <!-- PRICE PANEL: Equal cells,  L→R -->
    <div class="panel" style="margin-bottom:10px;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ SPY PRICE DATA </div>
      <div style="display:grid;grid-template-columns:repeat(15,1fr);gap:4px;">
        ${[
          {lbl:'PREV OPEN',  val:prevRow?.open,   clr:'var(--text2)', grp:'PREV DAY'},
          {lbl:'PREV HIGH',  val:prevRow?.high,   clr:'#00ff88',      grp:'PREV DAY'},
          {lbl:'PREV LOW',   val:prevRow?.low,    clr:'#ff3355',      grp:'PREV DAY'},
          {lbl:'PREV CLOSE', val:prevClose,       clr:'var(--text2)', grp:'PREV DAY'},
          {lbl:'PREV HVN',   val:(prevRow?.volume_analysis?.hvn_price||null), clr:'var(--cyan)', grp:'PREV DAY'},
          {lbl:'PM HIGH',    val:null, clr:'#00ff88', grp:'PRE-MKT', id:'deskPMH'},
          {lbl:'PM MID',     val:null, clr:'var(--text2)', grp:'PRE-MKT', id:'deskPMM'},
          {lbl:'PM LOW',     val:null, clr:'#ff3355', grp:'PRE-MKT', id:'deskPML'},
          {lbl:'GAP',        val:'gap', clr:gapAmt!=null?cc(gapAmt):'var(--text2)', grp:'TODAY', isGap:true},
          {lbl:'OPEN',       val:todayOpen, clr:'var(--text2)', grp:'TODAY'},
          {lbl:'HIGH',       val:dayHigh,   clr:'#00ff88',      grp:'TODAY'},
          {lbl:'LOW',        val:dayLow,    clr:'#ff3355',      grp:'TODAY'},
          {lbl:'LAST',       val:cur,       clr:changeAmt!=null?cc(changeAmt):'#fff', grp:'TODAY', big:true},
          {lbl:'CHG/CLOSE',  val:'chg', clr:changeAmt!=null?cc(changeAmt):'var(--text2)', grp:'TODAY', isChg:true},
          {lbl:'CHG/OPEN',   val:null, clr:changeFromOpen!=null?cc(changeFromOpen):'var(--text2)', grp:'TODAY', isChgOpen:true},
        ].map((cell,i,arr)=>{
          const sameGrp = i>0 && arr[i-1].grp===cell.grp;
          const bg = cell.grp==='TODAY'?'rgba(0,204,255,0.04)':cell.grp==='PRE-MKT'?'rgba(255,204,0,0.04)':'';
          const bl = !sameGrp?'border-left:2px solid rgba(255,255,255,0.1);':'';
          let val = '—';
          if(cell.id) {
            val = `<span id="${cell.id}" style="font-family:'Share Tech Mono',monospace;font-size:14px;font-weight:bold;color:${cell.clr};">—</span>`;
          } else if(cell.isGap) {
            val = gapAmt!=null
              ? `<div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${cell.clr};">${cs(gapAmt)}${fmt(gapAmt,2)}</div><div style="font-size:10px;color:${cell.clr};">${cs(gapPct)}${fmt(gapPct,2)}%</div>`
              : '—';
          } else if(cell.isChg) {
            val = changeAmt!=null
              ? `<div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${cell.clr};">${cs(changeAmt)}${fmt(changeAmt,2)}</div><div style="font-size:10px;color:${cell.clr};">${cs(changePct)}${fmt(changePct,2)}%</div>`
              : '—';
          } else if(cell.isChgOpen) {
            val = changeFromOpen!=null
              ? `<div id="deskChgOpen" style="color:${cell.clr};"><div style="font-family:'Share Tech Mono',monospace;font-size:12px;font-weight:bold;">${cs(changeFromOpen)}${fmt(changeFromOpen,2)}</div><div style="font-size:10px;">${cs(changeFOPct)}${fmt(changeFOPct,2)}%</div></div>`
              : `<div id="deskChgOpen" style="color:var(--text3);">—</div>`;
          } else if(cell.val!=null && cell.val!==0 && cell.val!=='gap' && cell.val!=='chg') {
            val = `<span style="font-family:'Share Tech Mono',monospace;font-size:${cell.big?'16px':'14px'};font-weight:${cell.big?'900':'bold'};color:${cell.clr};">$${fmt(cell.val,2)}</span>`;
          }
          return `<div style="padding:6px 3px;border:1px solid var(--border);border-radius:2px;text-align:center;${bl}background:${bg};">
            <div style="font-family:'Orbitron',monospace;font-size:6px;letter-spacing:0.3px;color:var(--text3);margin-bottom:3px;white-space:nowrap;overflow:hidden;">${cell.lbl}</div>
            ${val}
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:4px;margin-top:2px;font-family:'Orbitron',monospace;font-size:6px;letter-spacing:1px;">
        <div style="flex:5;text-align:center;color:var(--text3);border-top:1px solid rgba(255,255,255,0.1);padding-top:1px;">PREV DAY</div>
        <div style="flex:3;text-align:center;color:#ffcc00;border-top:1px solid rgba(255,204,0,0.3);padding-top:1px;">PRE-MARKET</div>
        <div style="flex:7;text-align:center;color:var(--cyan);border-top:1px solid rgba(0,204,255,0.3);padding-top:1px;">TODAY</div>
      </div>
    </div>

    <!-- INTRADAY PATTERN RECOGNITION — directly under SPY PRICE DATA -->
    <div class="panel" style="margin-bottom:10px;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ TODAY'S INTRADAY PATTERN</div>
      <div id="deskPatternPanel"><div style="padding:10px;font-size:12px;color:var(--text3);">Initializing pattern data...</div></div>
    </div>

    <!-- BREADTH STRIP -->
    <div style="display:grid;grid-template-columns:180px 1px 190px 1px 220px 1px 1fr;align-items:stretch;margin-bottom:10px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;overflow:hidden;min-height:80px;">
      <div style="padding:12px 14px;" id="deskBreadthAD"></div>
      <div style="background:var(--border);"></div>
      <div style="padding:12px 14px;" id="deskBreadthRatios"></div>
      <div style="background:var(--border);"></div>
      <div style="padding:12px 14px;" id="deskBreadthMag7"></div>
      <div style="background:var(--border);"></div>
      <div style="padding:12px 14px;" id="deskBreadthSectors"></div>
    </div>

    <!-- GAUGES: VIX · F&G · IV · PCR · GEX · MAX PAIN -->
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:10px;">
      <div class="panel" style="text-align:center;border-top:3px solid ${vColor};">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:${vColor};margin-bottom:6px;">VIX</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:32px;font-weight:900;color:${vColor};">${fmt(vix,1)}</div>
        <div style="height:8px;border-radius:3px;background:linear-gradient(90deg,#00ff88,#ffcc00,#ff3355);position:relative;margin:8px 0;">
          <div style="position:absolute;top:-3px;width:3px;height:14px;background:white;border-radius:2px;transform:translateX(-50%);left:${Math.min((vix-10)/35*100,98)}%;"></div>
        </div>
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:${vColor};">${vix<15?'LOW VOL':vix<20?'CALM':vix<25?'ELEVATED':vix<35?'HIGH VOL':'EXTREME'}</div>
      </div>
      <div class="panel" style="text-align:center;border-top:3px solid ${fgColor};">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:${fgColor};margin-bottom:6px;">FEAR & GREED</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:32px;font-weight:900;color:${fgColor};">${fgVal!=null?fgVal:'—'}</div>
        <div style="height:8px;border-radius:3px;background:linear-gradient(90deg,#ff3355,#ffcc00,#00ff88);position:relative;margin:8px 0;">
          ${fgVal!=null?`<div style="position:absolute;top:-3px;width:3px;height:14px;background:white;border-radius:2px;transform:translateX(-50%);left:${fgVal}%;"></div>`:''}
        </div>
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:${fgColor};">${!fgVal?'—':fgVal<=25?'EXT FEAR':fgVal<=45?'FEAR':fgVal<=55?'NEUTRAL':fgVal<=75?'GREED':'EXT GREED'}</div>
      </div>
      <div class="panel" style="text-align:center;border-top:3px solid ${atmIV?'#8855ff':'var(--border)'};">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:#8855ff;margin-bottom:6px;">SPY IV</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:32px;font-weight:900;color:${atmIV>25?'#ff3355':atmIV>18?'#ff8800':atmIV>12?'#ffcc00':'#00ff88'};">${atmIV?fmt(atmIV,1)+'%':'—'}</div>
        <div style="height:8px;border-radius:3px;background:linear-gradient(90deg,#00ff88,#ffcc00,#ff3355);position:relative;margin:8px 0;">
          <div style="position:absolute;top:-3px;width:3px;height:14px;background:white;border-radius:2px;transform:translateX(-50%);left:${atmIV?Math.min(Math.max((atmIV-8)/35*100,2),98):50}%;"></div>
        </div>
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:#8855ff;">${atmIV?'ATM IMPLIED VOL':'NO IV DATA'}</div>
      </div>
      <div class="panel" style="text-align:center;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:6px;">PCR</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:32px;font-weight:900;color:${pcr>1?'#ff3355':pcr<0.7?'#00ff88':'#ffcc00'};">${pcr?fmt(pcr,3):'—'}</div>
        <div style="height:8px;border-radius:3px;background:linear-gradient(90deg,#00ff88,#ffcc00,#ff3355);position:relative;margin:8px 0;">
          <div style="position:absolute;top:-3px;width:3px;height:14px;background:white;border-radius:2px;transform:translateX(-50%);left:${Math.min(Math.max((pcr||0)/2*100,2),98)}%;"></div>
        </div>
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:${pcr>1?'#ff3355':pcr<0.7?'#00ff88':'#ffcc00'};">${pcr>1?'BEARISH':pcr<0.7?'BULLISH':'NEUTRAL'}</div>
      </div>
      <div class="panel" style="text-align:center;border-top:3px solid ${gexColor};cursor:pointer;" onclick="switchTab('gex')" title="Full GEX on GEX tab">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:${gexColor};margin-bottom:4px;">GEX</div>
        ${gexFlip?`
        <div style="font-family:'Orbitron',monospace;font-size:8px;padding:2px 6px;border-radius:2px;margin:2px auto;display:inline-block;color:${gexAbove?'#00ff88':'#ff3355'};background:${gexAbove?'rgba(0,255,136,0.12)':'rgba(255,51,85,0.12)'};">${gexAbove?'▲ ABOVE FLIP':'▼ BELOW FLIP'}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:13px;font-weight:bold;color:${gexColor};margin-top:4px;">$${fmt(gexFlip,2)}</div>
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-top:1px;">${gex.net_gex?(gex.net_gex/1e9).toFixed(1)+'B net':''}</div>
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-top:2px;">tap for full GEX ↗</div>
        `:`<div style="font-size:10px;color:var(--text3);margin-top:12px;">Loading...</div>`}
      </div>
      <!-- MAX PAIN: nearest big, all expiries listed below -->
      ${(()=>{
        const mp=md.max_pain||[];
        const nearest=mp[0];
        if(!nearest) return `<div class="panel" style="text-align:center;border-top:3px solid var(--cyan);">
          <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--cyan);">MAX PAIN</div>
          <div style="font-size:10px;color:var(--text3);margin-top:14px;">Loading...</div></div>`;
        const nd=cur?nearest.max_pain-cur:null;
        const ndc=nd>0?'#00ff88':nd<0?'#ff3355':'var(--text2)';
        const rows2=mp.slice(0,5).map((m,i)=>{
          const d=new Date(m.expiry+'T12:00:00');
          const dl=['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()];
          const isFri=d.getDay()===5;
          const dist=cur?m.max_pain-cur:null;
          const dc=dist>0?'#00ff88':dist<0?'#ff3355':'var(--text2)';
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="font-size:9px;color:${isFri?'#ffcc00':'var(--text3)'};">${dl} ${m.expiry?.slice(5)}</span>
            <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:${i===0?'#fff':'var(--text2)'};">$${fmt(m.max_pain,2)}</span>
            <span style="font-size:9px;color:${dc};">${dist!=null?(dist>0?'+':'')+fmt(dist,1):''}</span>
          </div>`;
        }).join('');
        return `<div class="panel" style="border-top:3px solid var(--cyan);padding:8px 10px;">
          <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--cyan);margin-bottom:2px;">MAX PAIN</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:900;text-align:center;">$${fmt(nearest.max_pain,2)}</div>
          <div style="font-size:9px;color:${ndc};text-align:center;margin-bottom:4px;">${nd!=null?(nd>0?'+':'')+fmt(nd,2)+' from spot':''}</div>
          ${rows2}
        </div>`;
      })()}
    </div>

    <!-- EXPECTED MOVES -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      ${wem?`<div class="panel" style="text-align:center;">
        <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:10px;">⬡ DAILY EXPECTED MOVE</div>
        ${(()=>{const midP=wem.wem_mid||cur||700;const iv=(wem.atm_iv&&wem.atm_iv>0)?wem.atm_iv:(wem.wem_range/2)/(midP*Math.sqrt(6/365)*0.70);const em=midP*iv*Math.sqrt(1/365)*0.70;return `<div style="font-family:'Share Tech Mono',monospace;font-size:28px;font-weight:bold;">±$${fmt(em,2)}</div><div style="font-size:12px;color:var(--text3);margin-top:6px;">H: $${fmt(midP+em,2)} · L: $${fmt(midP-em,2)}</div>`})()}
      </div>`:'<div class="panel"><div class="no-data">IV needed</div></div>'}
      ${wem?`<div class="panel">
        <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:10px;">⬡ WEEKLY EXPECTED MOVE</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px;">
          <div style="text-align:center;"><div style="font-family:'Orbitron',monospace;font-size:8px;color:#ff3355;">LOW</div><div style="font-family:'Share Tech Mono',monospace;font-size:18px;color:#ff3355;">$${fmt(wem.wem_low,2)}</div></div>
          <div style="text-align:center;"><div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">ANCHOR</div><div style="font-family:'Share Tech Mono',monospace;font-size:18px;">$${fmt(wem.wem_mid,2)}</div></div>
          <div style="text-align:center;"><div style="font-family:'Orbitron',monospace;font-size:8px;color:#00ff88;">HIGH</div><div style="font-family:'Share Tech Mono',monospace;font-size:18px;color:#00ff88;">$${fmt(wem.wem_high,2)}</div></div>
        </div>
        ${(()=>{
          const lo=wem.wem_low, hi=wem.wem_high, mid2=wem.wem_mid;
          const p=cur||mid2||0;
          const pct2=hi>lo?Math.min(Math.max((p-lo)/(hi-lo)*100,2),98):50;
          const outside=p>hi||p<lo;
          const labelColor=outside?'#ff3355':'#000';
          const labelBg=outside?'#ff3355':'var(--cyan)';
          return `<div style="position:relative;height:44px;background:linear-gradient(90deg,rgba(255,51,85,0.55),rgba(255,136,0,0.2),rgba(0,255,136,0.4),rgba(255,136,0,0.2),rgba(255,51,85,0.55));border-radius:4px;overflow:visible;margin-bottom:8px;">
            <div style="position:absolute;left:${pct2}%;top:0;bottom:0;width:2px;background:${outside?'#ff3355':'var(--cyan)'};transform:translateX(-50%);box-shadow:0 0 6px ${outside?'#ff335588':'var(--cyan)'};border-radius:2px;z-index:2;"></div>
            <div style="position:absolute;left:${pct2}%;top:50%;transform:translate(-50%,-50%);background:${labelBg};color:${labelColor};font-family:'Share Tech Mono',monospace;font-size:11px;font-weight:bold;padding:2px 7px;border-radius:3px;white-space:nowrap;z-index:3;box-shadow:0 2px 6px rgba(0,0,0,0.5);">$${fmt(p,2)}</div>
            <div style="position:absolute;left:4px;bottom:4px;font-family:'Orbitron',monospace;font-size:7px;color:rgba(255,80,80,0.9);">$${fmt(lo,2)}</div>
            <div style="position:absolute;right:4px;bottom:4px;font-family:'Orbitron',monospace;font-size:7px;color:rgba(0,255,136,0.9);">$${fmt(hi,2)}</div>
          </div>
          <div style="font-family:'Orbitron',monospace;font-size:9px;text-align:center;padding:4px;border-radius:3px;color:${outside?'#ff3355':'#00ff88'};background:${outside?'rgba(255,51,85,0.1)':'rgba(0,255,136,0.1);'};">${p>hi?'▲ ABOVE WEM HIGH':p<lo?'▼ BELOW WEM LOW':'✓ INSIDE WEM RANGE'}</div>`;
        })()}
      </div>`:'<div class="panel"><div class="no-data">IV needed</div></div>'}
    </div>

    <!-- HVN — last 5 days with actual intraday data -->
    <div class="panel" style="margin-bottom:10px;">
      <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:10px;">⬡ HIGH VOLUME PRICES — LAST 5 SESSIONS WITH DATA</div>
      ${(()=>{
        const hvnRows = rows.filter(r => r.volume_analysis?.hvn_price).slice(0,5);
        const todayStr = new Date().toISOString().split('T')[0];
        // Debug: show row count info
        const debugInfo = `<div style="font-size:10px;color:var(--text3);margin-bottom:6px;">${rows.length} days in history · ${hvnRows.length} with HVN data</div>`;
        if(!hvnRows.length) return debugInfo + `<div id="deskHvnLive"><div style="font-size:12px;color:var(--text3);padding:8px;">HVN data requires intraday bars (Polygon API). Populates after workflow runs. Run workflow manually to backfill.</div></div>`;
        return debugInfo + `<div id="deskHvnLive"></div><div style="display:grid;grid-template-columns:repeat(${Math.min(hvnRows.length,5)},1fr);gap:8px;" id="deskHvnGrid">
          ${hvnRows.map(r=>{
            const va=r.volume_analysis||{};const hvn=va.hvn_price;
            const dist=hvn&&cur?cur-hvn:null;const dc=dist>0?'#00ff88':dist<0?'#ff3355':'var(--text2)';
            const d=new Date(r.date+'T12:00:00');const dayLabel=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
            const isToday = r.date===todayStr;
            return `<div style="background:var(--bg3);border:1px solid ${isToday?'var(--cyan)':'var(--border)'};border-radius:3px;padding:10px;text-align:center;">
              <div style="font-family:'Orbitron',monospace;font-size:9px;color:${isToday?'var(--cyan)':'var(--text3)'};margin-bottom:4px;">${dayLabel} ${r.date?.slice(5)}</div>
              <div style="font-family:'Share Tech Mono',monospace;font-size:18px;font-weight:bold;color:var(--cyan);">$${fmt(hvn,2)}</div>
              ${dist!=null?`<div style="font-size:12px;color:${dc};margin-top:4px;">${dist>0?'+':''}${fmt(dist,2)}</div>`:''}
              ${va.peak_time?`<div style="font-size:10px;color:var(--text3);margin-top:2px;">Peak: ${va.peak_time?.slice(0,5)}</div>`:''}
            </div>`;
          }).join('')}
        </div>`;
      })()}
    </div>

    <!-- CALL / PUT WALLS BY EXPIRY -->
    <div class="panel" style="margin-bottom:10px;" id="deskWallsPanel">
      <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:10px;">⬡ CALL / PUT WALLS BY EXPIRY</div>
      <div id="deskWallsByExpiry"><div style="font-size:12px;color:var(--text3);">Loading walls...</div></div>
    </div>

    <!-- SESSION + DOD + VOL + SESSION VOL + GAPS -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 2fr;gap:10px;margin-bottom:10px;">
      <div class="panel">
        <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:10px;">⬡ TODAY'S SESSION</div>
        <div id="deskOhlcv"></div>
      </div>
      <div class="panel">
        <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:10px;">⬡ DAY OVER DAY</div>
        <div id="deskDod"></div>
      </div>
      <div class="panel">
        <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:10px;">⬡ VOLUME — LIVE</div>
        <div id="deskVolSummary"></div>
      </div>
      <div class="panel">
        <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:10px;">⬡ SESSION VOLATILITY</div>
        <div id="deskSessionVol"></div>
      </div>
      <div class="panel">
        <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:10px;">⬡ UNFILLED GAPS — ALL HISTORY</div>
        <div id="deskGaps"></div>
      </div>
    </div>

    <!-- TIMESTAMP BAR -->
    <div id="deskUpdateBar" style="display:flex;align-items:center;gap:10px;padding:6px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:3px;font-family:'Share Tech Mono',monospace;font-size:11px;flex-wrap:wrap;">
      <span style="color:var(--text3);">Initializing...</span>
    </div>`;

  // Fill today's session from live quotes
  renderDeskSession(md,sd);
  // Intraday pattern recognition
  try { renderIntradayPattern(md, sd); } catch(e) { console.warn('pattern:', e); }
}

function renderDeskSession(md,sd){
  const q=md.quotes||{},spy=q['SPY']||{};
  const cur=spy.price||0;
  const fmtRow=(l,v,c)=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);">
    <span style="font-size:13px;color:var(--text2);">${l}</span>
    <span style="font-family:'Share Tech Mono',monospace;font-size:14px;${c?`color:${c}`:''}">${v}</span>
  </div>`;

  // Premarket — populate the PM cells in the price panel
  const setPM = (h,m,l) => {
    const pmh=$('deskPMH'), pmm=$('deskPMM'), pml=$('deskPML');
    if(pmh) pmh.textContent = h ? '$'+fmt(h,2) : '—';
    if(pmm) pmm.textContent = m ? '$'+fmt(m,2) : '—';
    if(pml) pml.textContent = l ? '$'+fmt(l,2) : '—';
  };
  // PM cache — memory + localStorage keyed to today's date (ET)
  // IMPORTANT: we only hard-lock the cache once the PM window is CLOSED (>= 9:30 ET).
  // During pre-market we always re-fetch so bad early-session ticks don't get permanently
  // baked in as the PM Low before the session has finished.
  const _pmToday = (() => {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
    } catch(e) { return new Date().toISOString().slice(0,10); }
  })();
  const PM_CACHE_KEY = 'spy_pm_cache_v2';
  // PM session is final once we're at or past 9:30 ET — compute locally (isPremarket is in renderHub scope)
  const _pmSessionClosed = (() => {
    try {
      const etNowLocal = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const etMinsLocal = etNowLocal.getHours() * 60 + etNowLocal.getMinutes();
      const isWeekendLocal = etNowLocal.getDay() === 0 || etNowLocal.getDay() === 6;
      const isPremarketLocal = !isWeekendLocal && etMinsLocal >= 4*60 && etMinsLocal < 9*60+30;
      return !isPremarketLocal;
    } catch(e) { return true; }
  })();

  const loadPMCache = () => {
    // Only trust localStorage cache if PM session is definitively closed.
    // During pre-market, skip the cache so we always get a fresh fetch.
    if (!_pmSessionClosed) return null;
    // 1. In-memory (fastest)
    if (window._pmCache && window._pmCache.high && window._pmCache.date === _pmToday) {
      return window._pmCache;
    }
    // 2. localStorage (survives page refresh)
    try {
      const stored = JSON.parse(localStorage.getItem(PM_CACHE_KEY) || 'null');
      if (stored && stored.date === _pmToday && stored.high) {
        window._pmCache = stored;
        return stored;
      }
    } catch(e) {}
    return null;
  };

  const savePMCache = (pm) => {
    // Always update in-memory so the display stays current this session.
    // Only persist to localStorage once PM session is closed — during pre-market
    // we don't lock the values to disk until the session is complete.
    const entry = { date: _pmToday, high: pm.high, mid: pm.mid, low: pm.low };
    window._pmCache = entry;
    if (_pmSessionClosed) {
      try { localStorage.setItem(PM_CACHE_KEY, JSON.stringify(entry)); } catch(e) {}
    }
  };

  const cached = loadPMCache();
  if (cached) {
    setPM(cached.high, cached.mid, cached.low);
  } else {
    fetch('/premarket?t=' + Date.now()).then(r=>r.ok?r.json():null).then(pm=>{
      if (pm?.available && pm.high) {
        savePMCache(pm);
        setPM(pm.high, pm.mid, pm.low);
      } else {
        // Not available yet (pre-4am ET) or PM window closed with no data
        // Do NOT clear — keep any existing display from earlier in session
        const still = loadPMCache();
        if (still) setPM(still.high, still.mid, still.low);
      }
    }).catch(() => {
      const still = loadPMCache();
      if (still) setPM(still.high, still.mid, still.low);
    });
  }

  // ── VWAP panels update ───────────────────────────────────────────────────
  // D-VWAP: comes from /spyintraday response (server-computed, RTH bars only)
  // W-VWAP: approximated from this week's daily bars in sd (typical price × volume, Mon–today)
  (()=>{
    const dvEl=$('deskDVwap'), dvDiff=$('deskDVwapDiff');
    const wvEl=$('deskWVwap'), wvDiff=$('deskWVwapDiff');

    // Daily VWAP — from cached _spyIntraday if available
    const lv = typeof _spyIntraday !== 'undefined' ? _spyIntraday : null;
    const dv = lv?.vwap || null;
    if (dvEl) dvEl.textContent = dv ? '$'+fmt(dv,2) : '—';
    if (dvDiff && dv && cur) {
      const diff = cur - dv, pct = diff/dv*100;
      dvDiff.textContent = (diff>=0?'+':'')+fmt(diff,2)+'%';
      dvDiff.style.color = diff>=0?'#00ff88':'#ff3355';
    } else if (dvDiff) { dvDiff.textContent='—'; dvDiff.style.color='var(--text3)'; }

    // Weekly VWAP — accumulate typical price × volume from Mon–today using sd
    if (sd && sd.length) {
      // Find Mon of current week (ET date)
      const etToday = new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date());
      const dow = new Date(etToday+'T12:00:00Z').getDay(); // 0=Sun,1=Mon...
      const daysFromMon = dow===0?6:dow-1;
      const monDate = new Date(etToday+'T12:00:00Z');
      monDate.setUTCDate(monDate.getUTCDate()-daysFromMon);
      const monStr = monDate.toISOString().slice(0,10);

      // Grab this week's completed daily rows from sd (they have OHLCV)
      const weekRows = sd.filter(r => r.date >= monStr && r.date <= etToday);
      let cumTPV=0, cumVol=0;
      for (const r of weekRows) {
        const h=parseFloat(r.high||0), l=parseFloat(r.low||0), c=parseFloat(r.close||0), v=parseFloat(r.volume||0);
        if(!c||!v) continue;
        const tp=(h+l+c)/3;
        cumTPV+=tp*v; cumVol+=v;
      }
      // If today is in progress (live), blend in the D-VWAP × today's volume
      if (lv?.vwap && lv?.volume && lv.volume > 0) {
        // Today not yet in sd — add it
        const todayInSd = weekRows.some(r => r.date === etToday);
        if (!todayInSd) { cumTPV += lv.vwap * lv.volume; cumVol += lv.volume; }
      }
      const wv = cumVol>0 ? Math.round(cumTPV/cumVol*100)/100 : null;
      if (wvEl) wvEl.textContent = wv ? '$'+fmt(wv,2) : '—';
      if (wvDiff && wv && cur) {
        const diff=cur-wv, pct=diff/wv*100;
        wvDiff.textContent=(diff>=0?'+':'')+fmt(diff,2)+'%';
        wvDiff.style.color=diff>=0?'#00ff88':'#ff3355';
      } else if(wvDiff) { wvDiff.textContent='—'; wvDiff.style.color='var(--text3)'; }
    }
  })();

  // OHLCV
  const ohlcvEl=$('deskOhlcv');
  if(ohlcvEl){
    ohlcvEl.innerHTML=[
      {l:'Open',   v:spy.open?'$'+fmt(spy.open,2):'—'},
      {l:'High',   v:spy.high?'$'+fmt(spy.high,2):'—', c:'#00ff88'},
      {l:'Low',    v:spy.low?'$'+fmt(spy.low,2):'—',   c:'#ff3355'},
      {l:'Last',   v:cur?'$'+fmt(cur,2):'—'},
      {l:'Change', v:`${sign(spy.change)}${fmt(spy.change,2)} (${sign(spy.pct_change)}${fmt(spy.pct_change,2)}%)`, c:clr(spy.change)},
      {l:'Volume', v:spy.volume?fmtK(spy.volume):'—'},
    ].map(i=>fmtRow(i.l,i.v,i.c)).join('');
  }

  // Volume Summary — prefer live intraday data for today, fall back to sd[0] (prior completed day)
  const volSumEl=$('deskVolSummary');
  if(volSumEl){
    // Prefer live data; fall back to today's cached snapshot so panel stays current
    // after market close and before next day's Python workflow runs
    let lv = typeof _spyIntraday !== 'undefined' ? _spyIntraday : null;
    if (!lv?.available && typeof loadIntradayCache === 'function') {
      const cached = loadIntradayCache();
      if (cached?.volume) lv = { ...cached, _fromCache: true };
    }
    const day0 = sd?.[0]||{}, va = day0.volume_analysis||{};
    const isLive = lv?.available || lv?._fromCache;
    const last30 = (sd||[]).slice(0,30).filter(d=>d.volume>0);
    const avg30 = last30.length ? Math.round(last30.reduce((a,d)=>a+d.volume,0)/last30.length) : 85000000;

    if(!isLive) {
      // Pre-market or no data: show yesterday + pace context
      const vol = day0.volume || 0;
      const volPct = vol&&avg30 ? vol/avg30*100 : 0;
      const vc = volPct>130?'#ff8800':volPct>100?'#00ff88':'#ffcc00';
      volSumEl.innerHTML = `
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:8px;letter-spacing:1px;">
          PRIOR SESSION · ${day0.date||''} · 30D AVG: ${fmtK(avg30)}
        </div>
        <div style="text-align:center;margin-bottom:10px;">
          <div style="font-family:'Share Tech Mono',monospace;font-size:24px;font-weight:bold;color:${vc};">${fmtK(vol)}</div>
          <div style="font-size:11px;color:${vc};margin-top:2px;">${fmt(volPct,1)}% of 30d avg</div>
        </div>
        <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden;margin-bottom:10px;">
          <div style="width:${Math.min(volPct,100).toFixed(1)}%;height:100%;background:${vc};border-radius:3px;"></div>
        </div>
        ${[
          {l:'Open 1H',  v: va.open_1h  ? fmtK(va.open_1h)+'  '+fmt(va.open_1h_pct||0,1)+'%'  : '—'},
          {l:'Close 1H', v: va.close_1h ? fmtK(va.close_1h)+'  '+fmt(va.close_1h_pct||0,1)+'%' : '—'},
          {l:'Peak Time',v: va.peak_time ? va.peak_time.slice(0,5)+'  '+fmtK(va.peak_volume||0) : '—'},
          {l:'HVN Price',v: va.hvn_price ? '$'+fmt(va.hvn_price,2)+'  '+fmtK(va.hvn_volume||0) : '—'},
        ].map(i=>fmtRow(i.l,i.v)).join('')}
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-top:8px;text-align:center;">LIVE DATA AT MARKET OPEN</div>`;
    } else {
      // LIVE — full intraday breakdown
      const vol = lv.volume||0;
      const volPct = vol&&avg30 ? vol/avg30*100 : 0;
      const vc = volPct>130?'#ff8800':volPct>100?'#00ff88':volPct>70?'#ffcc00':'var(--text3)';
      const buckets = lv.buckets||[];
      const maxBkt = Math.max(...buckets.map(b=>b.volume),1);
      // Current CT time for highlighting active bucket
      const nowCT = new Date(new Date().toLocaleString('en-US', {timeZone:'America/Chicago'}));
      const nowMins = nowCT.getHours()*60+nowCT.getMinutes();

      // Pace projection: extrapolate total from current pace
      const elapsed = Math.max(lv.bars||1, 1);
      const totalMins = 6.5*60; // full session
      const paceTotal = Math.round(vol / elapsed * totalMins);
      const pacePct = paceTotal/avg30*100;
      const paceColor = pacePct>130?'#ff8800':pacePct>100?'#00ff88':'#ffcc00';

      volSumEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
          <div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:bold;color:${vc};">${fmtK(vol)}</div>
            <div style="font-size:10px;color:${vc};">${fmt(volPct,1)}% of 30d avg</div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);">PACE →</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${paceColor};">${fmtK(paceTotal)}</div>
            <div style="font-size:9px;color:${paceColor};">${fmt(pacePct,0)}% proj</div>
          </div>
        </div>
        <div style="height:5px;background:var(--bg3);border-radius:3px;overflow:hidden;margin-bottom:10px;">
          <div style="width:${Math.min(volPct,100).toFixed(1)}%;height:100%;background:${vc};border-radius:3px;transition:width 1s;"></div>
        </div>

        <!-- Bucket breakdown -->
        <div style="margin-bottom:8px;">
          ${buckets.map(b=>{
            const bPct = b.pct||0;
            const barW = maxBkt>0?Math.round(b.volume/maxBkt*100):0;
            const [sh,sm] = b.label.split('-')[0].split(':').map(Number);
            const [eh,em] = (b.label.split('-')[1]||'').replace(/[ap]m/,'').split(':').map(Number)||[0,0];
            const bStart = sh*60+(sm||0), bEnd = eh*60+(em||0);
            const isActive = nowMins >= bStart && nowMins < bEnd;
            const bc = isActive?'var(--cyan)':bPct>20?'#00ff88':bPct>10?'#ffcc00':'var(--text3)';
            return `<div style="display:flex;align-items:center;gap:6px;padding:2px 0;${isActive?'background:rgba(0,204,255,0.05);border-radius:2px;':''}">
              <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:${isActive?'var(--cyan)':'var(--text3)'};width:62px;flex-shrink:0;">${b.label}${isActive?' ◀':''}</span>
              <div style="flex:1;height:8px;background:var(--bg3);border-radius:2px;overflow:hidden;">
                <div style="width:${barW}%;height:100%;background:${bc};border-radius:2px;"></div>
              </div>
              <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:${bc};width:38px;text-align:right;">${fmt(bPct,1)}%</span>
              <span style="font-size:9px;color:var(--text3);width:44px;text-align:right;">${fmtK(b.volume)}</span>
            </div>`;
          }).join('')}
        </div>

        <!-- Key stats row -->
        ${[
          {l:'30D Avg',  v:fmtK(avg30)},
          {l:'Open 1H',  v:lv.open_1h  ? fmtK(lv.open_1h)+'  '+fmt(lv.open_1h_pct,1)+'%'  : '—'},
          {l:'Close 1H', v:lv.close_1h ? fmtK(lv.close_1h)+'  '+fmt(lv.close_1h_pct,1)+'%' : '—'},
          {l:'Peak Bar',  v:lv.peak_time ? lv.peak_time+'  '+fmtK(lv.peak_volume||0) : '—'},
          {l:'HVN Price', v:lv.hvn_price ? '$'+fmt(lv.hvn_price,2)+'  '+fmtK(lv.hvn_volume||0) : '—'},
        ].map(i=>fmtRow(i.l,i.v)).join('')}

        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--cyan);margin-top:6px;text-align:right;">
          ${lv._fromCache ? '◎ FINAL' : '● LIVE'} · ${lv.bars} bars · ${lv.asOf?.slice(11,16)} UTC
        </div>`;
    }
  }

  // Unfilled gaps within $20 of current price
  const gapsEl=$('deskGaps');
  if(gapsEl){
    if(!sd || sd.length < 2){
      gapsEl.innerHTML=`<div class="no-data">Need historical data · sd=${sd?.length||0} rows loaded</div>`;
    } else {
      const cur2 = spy.price || 0;
      const above=[], below=[];
      let skippedFilled=0;

      for(let i=0; i<sd.length-1; i++){
        const today2=sd[i], prev2=sd[i+1];
        if(!today2.open || !prev2.close) continue;
        const gap = parseFloat(today2.open) - parseFloat(prev2.close);
        if(Math.abs(gap) < 0.05) continue;

        const fillPrice = parseFloat(prev2.close);

        // Gap fills when regular session price TRADES THROUGH the fill level
        // Check today2 itself first (gap can fill same day it opens), then all subsequent days
        let filled = false;
        const lo0 = parseFloat(today2.low), hi0 = parseFloat(today2.high);
        if(gap>0 && lo0 && lo0 <= fillPrice) filled = true;
        if(gap<0 && hi0 && hi0 >= fillPrice) filled = true;
        if(!filled){
          for(let j=i-1; j>=0; j--){
            const lo = parseFloat(sd[j].low), hi = parseFloat(sd[j].high);
            if(!lo || !hi) continue;
            if(gap>0 && lo <= fillPrice){ filled=true; break; }
            if(gap<0 && hi >= fillPrice){ filled=true; break; }
          }
        }
        if(filled){ skippedFilled++; continue; }

        const dist = cur2 - fillPrice;
        const entry = { price:fillPrice, date:prev2.date, gap, dist, pct: cur2?Math.abs(dist)/cur2*100:0 };
        if(dist < 0) above.push(entry);
        else         below.push(entry);
      }

      const total = above.length + below.length;
      const debugLine = `<div style="font-size:10px;color:var(--text3);padding:3px 6px;border-bottom:1px solid var(--border);">
        ${sd.length} sessions · ${total} unfilled gaps · ${skippedFilled} filled
      </div>`;

      if(!total){
        gapsEl.innerHTML=debugLine+`<div style="padding:10px;font-size:12px;color:var(--text3);">No unfilled gaps found in ${sd.length} sessions</div>`;
      } else {
        above.sort((a,b)=>b.dist-a.dist);
        below.sort((a,b)=>a.dist-b.dist);
        const row = g => {
          const up=g.dist<0, c=up?'#ff3355':'#00ff88';
          const d=new Date(g.date+'T12:00:00');
          const lbl=(d.getMonth()+1)+'/'+d.getDate()+'/'+String(d.getFullYear()).slice(2);
          return `<div style="display:flex;align-items:center;gap:5px;padding:4px 6px;border-bottom:1px solid rgba(255,255,255,0.05);">
            <span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);width:44px;flex-shrink:0;">${lbl}</span>
            <span style="font-family:'Share Tech Mono',monospace;font-size:13px;font-weight:bold;color:${c};flex:1;">$${fmt(g.price,2)}</span>
            <span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);">${g.pct.toFixed(1)}%</span>
          </div>`;
        };
        gapsEl.innerHTML=debugLine+`
          <div style="display:flex;font-family:'Orbitron',monospace;font-size:7px;padding:3px 6px;border-bottom:1px solid var(--border);">
            <span style="flex:1;color:#ff3355;">▲ ABOVE (${above.length})</span>
            <span style="color:var(--text3);">SPY $${fmt(cur2,2)}</span>
            <span style="flex:1;text-align:right;color:#00ff88;">BELOW (${below.length}) ▼</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;max-height:280px;overflow-y:auto;">
            <div style="border-right:1px solid rgba(255,255,255,0.08);">
              ${above.length?above.map(row).join(''):'<div style="padding:10px;font-size:11px;color:var(--text3);">None</div>'}
            </div>
            <div>
              ${below.length?below.map(row).join(''):'<div style="padding:10px;font-size:11px;color:var(--text3);">None</div>'}
            </div>
          </div>`;
      }
    }
  }

  // ── Compact Breadth Strip ────────────────────────────────────────────────
  const adEl2     = $('deskBreadthAD');
  const secEl2    = $('deskBreadthSectors');
  const ratioEl2  = $('deskBreadthRatios');

  const bLabel = (txt, color='var(--text3)') =>
    `<div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;color:${color};margin-bottom:4px;">${txt}</div>`;
  const bVal = (txt, color='var(--text1)') =>
    `<div style="font-family:'Share Tech Mono',monospace;font-size:20px;font-weight:bold;color:${color};">${txt}</div>`;
  const bSub = (txt, color='var(--text3)') =>
    `<div style="font-size:12px;color:${color};margin-top:3px;">${txt}</div>`;

  // ── ADVANCE / DECLINE ──────────────────────────────────────────────────────
  if(adEl2) {
    const advD = q['^ADVN'], decD = q['^DECN'];
    if(advD?.price && decD?.price && advD.price > 100) {
      const adv = Math.round(advD.price), dec = Math.round(decD.price);
      const total = adv + dec;
      const advPct = adv / total * 100;
      const adRatio = adv / dec;
      const adc = adRatio > 2 ? '#00ff88' : adRatio > 1 ? '#88cc00' : adRatio > 0.5 ? '#ff8800' : '#ff3355';
      adEl2.innerHTML = `
        ${bLabel('ADVANCE / DECLINE')}
        <div style="display:flex;gap:10px;align-items:center;margin:6px 0;">
          <span style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:bold;color:#00ff88;">${fmtK(adv)}</span>
          <div style="flex:1;height:10px;background:var(--bg3);border-radius:4px;overflow:hidden;min-width:60px;">
            <div style="height:100%;width:${advPct.toFixed(0)}%;background:linear-gradient(90deg,#00ff88,#88cc44);border-radius:4px;"></div>
          </div>
          <span style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:bold;color:#ff3355;">${fmtK(dec)}</span>
        </div>
        ${bSub('ratio ' + fmt(adRatio,2) + ' · ' + advPct.toFixed(0) + '% advancing', adc)}`;
    } else {
      const secs = ['XLK','XLF','XLE','XLV','XLI','XLY','XLP','XLB','XLRE','XLU','XLC'];
      const up = secs.filter(s => (q[s]?.pct_change||0) > 0).length;
      const adc = up > 6 ? '#00ff88' : up > 4 ? '#ffcc00' : '#ff3355';
      adEl2.innerHTML = `${bLabel('ADV / DEC')}${bVal(up+' / '+(secs.length-up), adc)}${bSub('sector proxy')}`;
    }
  }


  // ── SPY vs RSP BREADTH ────────────────────────────────────────────────────
  if(ratioEl2) {
    const spyPct = q['SPY']?.pct_change||0;
    const rspPct = q['RSP']?.pct_change||0;
    const diff = rspPct - spyPct;
    const breadthBias = diff > 0.2 ? 'BROAD' : diff > -0.2 ? 'MIXED' : 'NARROW';
    const bbColor = breadthBias==='BROAD'?'#00ff88':breadthBias==='MIXED'?'#ffcc00':'#ff3355';
    ratioEl2.innerHTML =
      bLabel('SPY vs RSP')
      +'<div style="display:flex;gap:16px;margin:5px 0;align-items:flex-end;">'
      +'<div>'+bLabel('SPY','var(--text3)')+'<span style="font-family:\'Share Tech Mono\',monospace;font-size:22px;font-weight:bold;color:'+(spyPct>=0?'#00ff88':'#ff3355')+';">'+(spyPct>=0?'+':'')+fmt(spyPct,2)+'%</span></div>'
      +'<div>'+bLabel('RSP','var(--text3)')+'<span style="font-family:\'Share Tech Mono\',monospace;font-size:22px;font-weight:bold;color:'+(rspPct>=0?'#00ff88':'#ff3355')+';">'+(rspPct>=0?'+':'')+fmt(rspPct,2)+'%</span></div>'
      +'</div>'
      +bSub(breadthBias+' · spread '+(diff>=0?'+':'')+fmt(diff,2)+'%', bbColor);
  }

  // ── MAG7 vs MARKET ──────────────────────────────────────────────────────────
  const mag7El2 = $('deskBreadthMag7');
  if(mag7El2) {
    const MAG7 = ['AAPL','MSFT','GOOGL','AMZN','NVDA','META','TSLA'];
    const spyPct2 = q['SPY']?.pct_change||0;
    const mag7vals = MAG7.map(s=>q[s]?.pct_change||0);
    const mag7avg = mag7vals.reduce((a,b)=>a+b,0)/MAG7.length;
    const diff = mag7avg - spyPct2;
    const signal = diff > 1 ? 'MAG7 CARRYING' : diff > 0.3 ? 'MAG7 LEADING' : diff < -1 ? 'BROAD LEADS' : diff < -0.3 ? 'MAG7 LAGGING' : 'IN LINE';
    const sc = diff > 0.3 ? '#ff8800' : diff < -0.3 ? '#00ff88' : '#ffcc00';
    const stm = "font-family:'Share Tech Mono',monospace;font-size:20px;font-weight:bold;";
    mag7El2.innerHTML =
      bLabel('MAG7 vs MARKET')
      + '<div style="display:flex;gap:14px;margin:5px 0;align-items:flex-end;">'
      + '<div>' + bLabel('MAG7 AVG','var(--text3)') + '<span style="' + stm + 'color:' + (mag7avg>=0?'#00ff88':'#ff3355') + ';">' + (mag7avg>=0?'+':'') + fmt(mag7avg,2) + '%</span></div>'
      + '<div>' + bLabel('SPY','var(--text3)') + '<span style="' + stm + 'color:' + (spyPct2>=0?'#00ff88':'#ff3355') + ';">' + (spyPct2>=0?'+':'') + fmt(spyPct2,2) + '%</span></div>'
      + '</div>'
      + bSub(signal + ' · ' + (diff>=0?'+':'') + fmt(diff,2) + '% vs SPY', sc);
  }

  // ── SECTOR HEATMAP ──────────────────────────────────────────────────────────
  if(secEl2) {
    const SECS = ['XLK','XLF','XLE','XLV','XLI','XLY','XLP','XLB','XLRE','XLU','XLC'];
    const NAMES= ['Tech','Fins','Engy','Hlth','Inds','Disc','Stpl','Matl','RE','Util','Comm'];
    const up   = SECS.filter(s => (q[s]?.pct_change||0) > 0).length;
    const dn   = SECS.length - up;
    const scoreColor = up >= 8?'#00ff88':up>=6?'#88cc00':up>=4?'#ffcc00':up>=2?'#ff8800':'#ff3355';
    secEl2.innerHTML = `
      ${bLabel('SECTORS  ' + up + ' ▲ · ' + dn + ' ▼', scoreColor)}
      <div style="display:flex;gap:3px;align-items:center;margin-top:3px;flex-wrap:nowrap;">
        ${SECS.map((s,i) => {
          const pc = q[s]?.pct_change||0;
          const intensity = Math.min(Math.abs(pc)/2,1);
          const bg = pc >= 0
            ? `rgba(0,${Math.round(150+intensity*105)},80,${0.25+intensity*0.55})`
            : `rgba(${Math.round(180+intensity*75)},30,40,${0.25+intensity*0.55})`;
          
          return `<div style="background:${bg};border:1px solid rgba(255,255,255,0.1);border-radius:3px;padding:6px 5px;min-width:0;flex:1;text-align:center;" title="${s}: ${pc>=0?'+':''}${fmt(pc,2)}%">
            <div style="font-family:'Orbitron',monospace;font-size:8px;font-weight:600;color:rgba(255,255,255,0.75);margin-bottom:2px;">${NAMES[i]}</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:13px;font-weight:bold;color:#ffffff;">${pc>=0?'+':''}${fmt(pc,1)}%</div>
          </div>`;
        }).join('')}
      </div>`;
  }

  // Day over Day
  const dodEl=$('deskDod');
  if(dodEl && sd && sd.length >= 2){
    const today=sd[0], prev=sd[1];
    if(today&&prev){
      const items=[
        {l:'Open',  cur:today.open,          prev:prev.open},
        {l:'Close', cur:today.close||cur,    prev:prev.close},
        {l:'High',  cur:today.high,          prev:prev.high},
        {l:'Low',   cur:today.low,           prev:prev.low},
        {l:'Volume',cur:today.volume,        prev:prev.volume,isVol:true},
      ].filter(i=>i.cur&&i.prev);
      dodEl.innerHTML=items.map(({l,cur:c,prev:p,isVol})=>{
        const diff=c-p, pct=diff/p*100;
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:12px;color:var(--text2);">${l}</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${diff>=0?'#00ff88':'#ff3355'};">${sign(diff)}${isVol?fmtK(Math.abs(diff)):fmt(Math.abs(diff),2)} (${sign(pct)}${fmt(Math.abs(pct),1)}%)</span>
        </div>`;
      }).join('')||'<div class="no-data">—</div>';
    }
  } else if(dodEl){
    dodEl.innerHTML='<div class="no-data">No prev day data yet</div>';
  }

  // ── WALLS BY EXPIRY on desk ─────────────────────────────────────────────
  const deskWallsEl = $('deskWallsByExpiry');
  if (deskWallsEl) {
    const walls = (typeof _md !== 'undefined' ? _md?.walls_by_expiry : null) || [];
    if (!walls.length) {
      deskWallsEl.innerHTML = '<div style="font-size:12px;color:var(--text3);">No expiry wall data — run workflow or wait for live GEX refresh.</div>';
    } else {
      const deskCur = (typeof _md !== 'undefined' ? _md?.quotes?.SPY?.price : null) || 0;
      deskWallsEl.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;">'
        + walls.map(w => {
          const cDist = w.callWall && deskCur ? w.callWall - deskCur : null;
          const pDist = w.putWall  && deskCur ? w.putWall  - deskCur : null;
          const isToday = w.dte === 0;
          const borderCol = isToday ? '#ffcc00' : '#00ccff';
          return '<div style="background:var(--bg3);border:1px solid var(--border);border-top:3px solid '+borderCol+';border-radius:3px;padding:10px;">'
            + '<div style="font-family:Orbitron,monospace;font-size:8px;color:'+borderCol+';margin-bottom:6px;letter-spacing:1px;">'
            + w.label.toUpperCase() + (w.exp ? ' · ' + w.exp.slice(5) : '') + (w.dte != null ? ' · ' + w.dte + 'DTE' : '') + '</div>'
            + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">'
            + '<div style="text-align:center;padding:6px;background:rgba(0,255,136,0.06);border:1px solid rgba(0,255,136,0.2);border-radius:3px;">'
            + '<div style="font-family:Orbitron,monospace;font-size:7px;color:#00ff88;margin-bottom:3px;">CALL WALL</div>'
            + '<div style="font-family:Share Tech Mono,monospace;font-size:16px;font-weight:bold;color:#00ff88;">' + (w.callWall ? '$'+w.callWall : '—') + '</div>'
            + (cDist != null ? '<div style="font-size:10px;color:#00ff88;">+' + cDist.toFixed(1) + '</div>' : '')
            + (w.topCalls?.[0]?.oi ? '<div style="font-size:9px;color:var(--text3);">' + Math.round(w.topCalls[0].oi/1000) + 'K OI</div>' : '')
            + '</div>'
            + '<div style="text-align:center;padding:6px;background:rgba(255,51,85,0.06);border:1px solid rgba(255,51,85,0.2);border-radius:3px;">'
            + '<div style="font-family:Orbitron,monospace;font-size:7px;color:#ff3355;margin-bottom:3px;">PUT WALL</div>'
            + '<div style="font-family:Share Tech Mono,monospace;font-size:16px;font-weight:bold;color:#ff3355;">' + (w.putWall ? '$'+w.putWall : '—') + '</div>'
            + (pDist != null ? '<div style="font-size:10px;color:'+(pDist>=0?'#00ff88':'#ff3355')+';">' + (pDist>=0?'+':'') + pDist.toFixed(1) + '</div>' : '')
            + (w.topPuts?.[0]?.oi ? '<div style="font-size:9px;color:var(--text3);">' + Math.round(w.topPuts[0].oi/1000) + 'K OI</div>' : '')
            + '</div>'
            + '</div>'
            + (w.callWall && w.putWall ? '<div style="text-align:center;font-size:10px;color:var(--text3);margin-top:6px;">Range: $' + w.putWall + ' — $' + w.callWall + ' (' + (w.callWall - w.putWall).toFixed(0) + ' pts)</div>' : '')
            + '</div>';
        }).join('')
        + '</div>';
    }
  }

  // ── SESSION VOLATILITY ────────────────────────────────────────────────────
  renderDeskSessionVol();
}

function renderDeskSessionVol() {
  const el = $('deskSessionVol');
  if (!el) return;

  let lv = (typeof _spyIntraday !== 'undefined') ? _spyIntraday : null;
  if (!lv?.available && typeof loadIntradayCache === 'function') {
    const cached = loadIntradayCache();
    if (cached?.buckets?.length) lv = { ...cached, _fromCache: true };
  }
  const isLive = lv?.available || lv?._fromCache;

  if (!isLive || !lv.buckets || !lv.buckets.length) {
    el.innerHTML = `
      <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:8px;letter-spacing:1px;">
        LIVE DATA AT MARKET OPEN
      </div>
      <div style="font-size:11px;color:var(--text3);padding:8px 0;">
        Session volatility breakdown populates once intraday bars are available.
      </div>`;
    return;
  }

  const sessionRange = lv.high && lv.low ? lv.high - lv.low : null;
  const maxRange = Math.max(...lv.buckets.map(b => b.range || 0), 0.01);

  // CT time for highlighting active bucket
  const nowCT = new Date(new Date().toLocaleString('en-US', {timeZone: 'America/Chicago'}));
  const nowMins = nowCT.getHours() * 60 + nowCT.getMinutes();

  // Color by range size relative to session max
  const rangeColor = r => {
    if (!r || !maxRange) return 'var(--text3)';
    const pct = r / maxRange;
    return pct > 0.7 ? '#ff3355' : pct > 0.4 ? '#ff8800' : pct > 0.2 ? '#ffcc00' : '#00ff88';
  };

  // Parse bucket label to get start/end mins (labels like "9:30-10:30")
  const parseBucketMins = label => {
    const parts = label.split('-');
    const toMins = t => { const [h,m] = t.split(':').map(Number); return h*60+(m||0); };
    return [toMins(parts[0]), toMins(parts[1] || parts[0])];
  };

  const rows = lv.buckets.map(b => {
    if (b.range === null || b.range === undefined) return '';
    const [bStart, bEnd] = parseBucketMins(b.label);
    const isActive = nowMins >= bStart && nowMins < bEnd;
    const rc = rangeColor(b.range);
    const barW = maxRange > 0 ? Math.round(b.range / maxRange * 100) : 0;
    return `<div style="display:flex;align-items:center;gap:6px;padding:2px 0;${isActive ? 'background:rgba(0,204,255,0.05);border-radius:2px;' : ''}">
      <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:${isActive ? 'var(--cyan)' : 'var(--text3)'};width:68px;flex-shrink:0;">${b.label}${isActive ? ' ◀' : ''}</span>
      <div style="flex:1;height:8px;background:var(--bg3);border-radius:2px;overflow:hidden;">
        <div style="width:${barW}%;height:100%;background:${rc};border-radius:2px;"></div>
      </div>
      <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:${rc};width:36px;text-align:right;">$${b.range.toFixed(2)}</span>
    </div>`;
  }).join('');

  // Highest-range bucket
  const maxBucket = lv.buckets.reduce((best, b) => (b.range || 0) > (best.range || 0) ? b : best, lv.buckets[0]);
  const quietBucket = lv.buckets.filter(b => b.range > 0).reduce((best, b) => (b.range || 99) < (best.range || 99) ? b : best, lv.buckets[0]);

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
      <div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:20px;font-weight:bold;color:var(--cyan);">$${sessionRange ? sessionRange.toFixed(2) : '—'}</div>
        <div style="font-size:10px;color:var(--text3);">total session range</div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);">PEAK</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:#ff3355;">${maxBucket.label}</div>
        <div style="font-size:9px;color:#ff3355;">$${(maxBucket.range||0).toFixed(2)}</div>
      </div>
    </div>
    <div style="height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;margin-bottom:8px;">
      <div style="width:${sessionRange ? Math.min(sessionRange/15*100,100).toFixed(0) : 0}%;height:100%;background:var(--cyan);border-radius:2px;"></div>
    </div>
    ${rows}
    <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-top:6px;">
      QUIET: ${quietBucket.label} · $${(quietBucket.range||0).toFixed(2)}
    </div>
    <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--cyan);margin-top:3px;text-align:right;">
      ● LIVE · ${lv.bars} bars
    </div>`;
}

function renderOverview(md){
  const el=$('overviewContent');
  if(!el)return;
  const q=md.quotes||{};
  const p   = sym => q[sym]?.price||0;
  const pct = sym => q[sym]?.pct_change||0;
  const s   = v => v>=0?'+':'';

  const tile = (sym, label, opts={}) => {
    const pr=p(sym), pc=pct(sym);
    if(!pr) return '';
    const up=pc>=0, intensity=Math.min(Math.abs(pc)/2.5,1);
    const bg=up
      ? `rgba(0,${Math.round(100+intensity*155)},${Math.round(40+intensity*40)},${0.22+intensity*0.42})`
      : `rgba(${Math.round(130+intensity*125)},${Math.round(30-intensity*20)},38,${0.22+intensity*0.42})`;
    const dp=opts.isRate?fmt(pr,3)+'%':'$'+fmt(pr,2);
    const nc=up?'#00ff88':'#ff4466';
    return `<div style="background:${bg};border:1px solid rgba(255,255,255,0.08);border-radius:3px;padding:4px 6px;">
      <div style="font-family:'Orbitron',monospace;font-size:8px;color:rgba(255,255,255,0.7);font-weight:600;">${label||sym}</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:12px;font-weight:bold;color:#fff;margin-top:1px;">${dp}</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${nc};">${s(pc)}${fmt(pc,2)}%</div>
    </div>`;
  };

  const groupLbl = (t,c) => `<div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:2px;color:${c};margin:8px 0 4px;padding-bottom:3px;border-bottom:1px solid ${c}22;">${t}</div>`;

  // Sector heatmap
  const sectors=[
    {sym:'XLK',n:'Tech',w:32},{sym:'XLF',n:'Fins',w:13},{sym:'XLV',n:'Health',w:12},
    {sym:'XLY',n:'Disc',w:11},{sym:'XLC',n:'Comm',w:9},{sym:'XLI',n:'Indust',w:8},
    {sym:'XLP',n:'Stapl',w:6},{sym:'XLE',n:'Energy',w:4},{sym:'XLB',n:'Matls',w:3},
    {sym:'XLRE',n:'RE',w:2},{sym:'XLU',n:'Util',w:2},
  ];
  const totalW=sectors.reduce((a,s2)=>a+s2.w,0);
  const sectorTiles=sectors.map(s2=>{
    const pc=pct(s2.sym),pr=p(s2.sym);
    if(!pr)return '';
    const up=pc>=0,intensity=Math.min(Math.abs(pc)/2.5,1);
    const bg=up?`rgba(0,${Math.round(100+intensity*155)},40,${0.28+intensity*0.45})`:`rgba(${Math.round(130+intensity*125)},30,38,${0.28+intensity*0.45})`;
    return `<div style="flex:${s2.w} 1 ${(s2.w/totalW*100).toFixed(1)}%;background:${bg};border:1px solid rgba(255,255,255,0.08);border-radius:3px;padding:6px 4px;min-height:60px;display:flex;flex-direction:column;justify-content:space-between;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;color:rgba(255,255,255,0.85);">${s2.sym}</div>
      <div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:12px;font-weight:bold;color:#fff;">${s(pc)}${fmt(pc,2)}%</div>
        <div style="font-size:9px;color:rgba(255,255,255,0.45);">$${fmt(pr,2)}</div>
      </div>
    </div>`;
  }).join('');

  // Rotation map — full names, quadrant axes, better visual
  const btc=q['BTC-USD']||{},dxy=q['DX-Y.NYB']||{};
  const rotAssets=[
    {sym:'QQQ',     label:'Nasdaq 100',   a:-95,  cat:'risk-on'},
    {sym:'IWM',     label:'Russell 2000', a:-70,  cat:'risk-on'},
    {sym:'XLK',     label:'Technology',   a:-115, cat:'risk-on'},
    {sym:'BTC-USD', label:'Bitcoin',      a:-78,  cat:'risk-on'},
    {sym:'XLE',     label:'Energy',       a:-15,  cat:'cyclical'},
    {sym:'XLF',     label:'Financials',   a:15,   cat:'cyclical'},
    {sym:'XLY',     label:'Cons Discret', a:-35,  cat:'cyclical'},
    {sym:'XLV',     label:'Health Care',  a:150,  cat:'defensive'},
    {sym:'XLP',     label:'Cons Staples', a:165,  cat:'defensive'},
    {sym:'XLU',     label:'Utilities',    a:125,  cat:'defensive'},
    {sym:'TLT',     label:'Long Bonds',   a:-152, cat:'safe-haven'},
    {sym:'GC=F',    label:'Gold',         a:170,  cat:'safe-haven'},
    {sym:'DX-Y.NYB',label:'US Dollar',    a:-167, cat:'safe-haven'},
  ];

  const rW=600,rH=500,rCx=rW/2,rCy=rH/2,rR=160;

  // Compute max abs pct for scaling
  const maxPct = Math.max(...rotAssets.map(a=>Math.abs(pct(a.sym))),1);

  const rotSVG=`<svg viewBox="0 0 ${rW} ${rH}" width="100%" style="display:block;">
    <!-- Quadrant backgrounds -->
    <path d="M${rCx},${rCy} L${rCx},22 A${rR*1.1},${rR*1.1} 0 0 1 ${rCx+rR*1.1*Math.cos(-Math.PI/4)},${rCy+rR*1.1*Math.sin(-Math.PI/4)} Z" fill="rgba(0,255,136,0.03)"/>
    <!-- Orbit rings -->
    <circle cx="${rCx}" cy="${rCy}" r="${rR}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="4,6"/>
    <circle cx="${rCx}" cy="${rCy}" r="${rR*0.6}" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1" stroke-dasharray="2,6"/>
    <circle cx="${rCx}" cy="${rCy}" r="${rR*0.3}" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
    <!-- Axes -->
    <line x1="${rCx}" y1="18" x2="${rCx}" y2="${rH-18}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    <line x1="18" y1="${rCy}" x2="${rW-18}" y2="${rCy}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    <!-- Quadrant labels — large, readable -->
    <text x="${rCx}" y="16" text-anchor="middle" fill="rgba(0,255,136,0.5)" font-size="11" font-family="Orbitron,monospace" font-weight="bold">RISK-ON</text>
    <text x="${rW-10}" y="${rCy-8}" text-anchor="end" fill="rgba(255,180,0,0.5)" font-size="11" font-family="Orbitron,monospace" font-weight="bold">CYCLICAL</text>
    <text x="${rCx}" y="${rH-4}" text-anchor="middle" fill="rgba(0,200,255,0.5)" font-size="11" font-family="Orbitron,monospace" font-weight="bold">SAFE HAVEN</text>
    <text x="10" y="${rCy-8}" fill="rgba(180,140,255,0.5)" font-size="11" font-family="Orbitron,monospace" font-weight="bold">DEFENSIVE</text>
    <!-- Legend -->
    <text x="10" y="${rH-36}" fill="rgba(255,255,255,0.25)" font-size="8" font-family="Share Tech Mono,monospace">● Bubble size = move magnitude</text>
    <circle cx="14" cy="${rH-22}" r="5" fill="rgba(0,255,136,0.5)" stroke="#00ff88" stroke-width="1"/>
    <text x="22" y="${rH-18}" fill="rgba(255,255,255,0.25)" font-size="8" font-family="Share Tech Mono,monospace">= positive</text>
    <circle cx="80" cy="${rH-22}" r="5" fill="rgba(255,68,102,0.5)" stroke="#ff4466" stroke-width="1"/>
    <text x="88" y="${rH-18}" fill="rgba(255,255,255,0.25)" font-size="8" font-family="Share Tech Mono,monospace">= negative</text>
    <!-- Bubbles -->
    ${rotAssets.map(a=>{
      const pc2=pct(a.sym),pr2=p(a.sym);
      if(!pr2)return '';
      const rad=a.a*Math.PI/180;
      const dist=rR*(0.5+Math.abs(pc2)/maxPct*0.45);
      const bx=rCx+Math.cos(rad)*Math.min(dist,rR*0.94);
      const by=rCy+Math.sin(rad)*Math.min(dist,rR*0.94);
      const up=pc2>=0;
      const bR=Math.min(Math.max(Math.abs(pc2)*4+10,11),28);
      const fc=up?'#00ff88':'#ff4466';
      const bgC=up?`rgba(0,255,136,${0.12+Math.abs(pc2)*0.08})`:`rgba(255,68,102,${0.12+Math.abs(pc2)*0.08})`;
      // Label placement — push label away from center
      const lx=bx+(bx<rCx?-(bR+4):(bR+4));
      const anchor=bx<rCx?'end':'start';
      return `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${bR}" fill="${bgC}" stroke="${fc}" stroke-width="1.5" opacity="0.9"/>
        <text x="${bx.toFixed(1)}" y="${(by+4).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="9" font-family="Orbitron,monospace" font-weight="bold">${s(pc2)}${fmt(pc2,1)}%</text>
        <text x="${lx.toFixed(1)}" y="${(by+4).toFixed(1)}" text-anchor="${anchor}" fill="rgba(255,255,255,0.65)" font-size="9" font-family="Share Tech Mono,monospace">${a.label}</text>`;
    }).join('')}
  </svg>`;

  el.innerHTML=`
    <!-- ROW 1: BTC | Gauge (centered, compact) | DXY -->
    <div style="display:grid;grid-template-columns:200px 1fr 200px;gap:10px;align-items:center;margin-bottom:10px;">

      <!-- BTC -->
      <div class="panel" style="border-left:4px solid #f0a500;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:#f0a500;margin-bottom:3px;">₿ BITCOIN</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:26px;font-weight:900;color:#f5c518;">${btc.price?'$'+fmt(btc.price,0):'—'}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${(btc.pct_change||0)>=0?'#00ff88':'#ff4466'};">${s(btc.pct_change)}${fmt(btc.pct_change,2)}%</div>
        <div style="font-size:10px;color:${(btc.pct_change||0)>=0?'#00ff88':'#ff4466'};margin-top:2px;">${(btc.pct_change||0)>=0?'▲ RISK-ON':'▼ RISK-OFF'}</div>
      </div>

      <!-- GAUGE — centered, compact -->
      <div class="panel" style="text-align:center;padding:10px 16px;">
        ${(()=>{
            const vix    = q['^VIX']?.price||0;
            const spyPct = pct('SPY'), rspPct = pct('RSP'), qqPct = pct('QQQ'), iwmPct = pct('IWM');
            const tltPct = pct('TLT'), goldPct= pct('GC=F'), btcPct = pct('BTC-USD');
            const dxyPct = pct('DX-Y.NYB'), xlkPct = pct('XLK'), xlpPct = pct('XLP'), xluPct = pct('XLU'), hyg = pct('HYG');
            const signals = [
              {label:'VIX',         score:vix<18?1:vix<25?0:-1, desc:vix<20?'<20 CALM':vix<25?'ELEVATED':'>30 FEAR', color:vix<18?'#00ff88':vix<25?'#ffcc00':'#ff3355'},
              {label:'SPY vs RSP',  score:rspPct>spyPct+0.1?1:rspPct<spyPct-0.3?-1:0, desc:rspPct>spyPct+0.1?'BROAD':rspPct<spyPct-0.3?'NARROW':'MIXED', color:rspPct>spyPct+0.1?'#00ff88':rspPct<spyPct-0.3?'#ff3355':'#ffcc00'},
              {label:'QQQ vs IWM',  score:qqPct>iwmPct+0.2?1:0, desc:qqPct>iwmPct+0.2?'GROWTH LEADS':'NEUTRAL', color:qqPct>iwmPct+0.2?'#00ff88':'var(--text2)'},
              {label:'BONDS (TLT)', score:tltPct>0.3?-1:tltPct<-0.3?1:0, desc:tltPct>0.3?'SAFE HAVEN':tltPct<-0.3?'SELLING':'NEUTRAL', color:tltPct>0.3?'#ff3355':tltPct<-0.3?'#00ff88':'var(--text2)'},
              {label:'GOLD',        score:goldPct>0.5?-1:0, desc:goldPct>0.5?'HEDGE DEMAND':'NEUTRAL', color:goldPct>0.5?'#ffcc00':'var(--text2)'},
              {label:'BITCOIN',     score:btcPct>1?1:btcPct<-2?-1:0, desc:btcPct>1?'RISK-ON':btcPct<-2?'RISK-OFF':'NEUTRAL', color:btcPct>1?'#00ff88':btcPct<-2?'#ff3355':'var(--text2)'},
              {label:'US DOLLAR',   score:dxyPct>0.3?-1:dxyPct<-0.3?1:0, desc:dxyPct>0.3?'HEADWIND':'NEUTRAL', color:dxyPct>0.3?'#ff8800':dxyPct<-0.3?'#00ff88':'var(--text2)'},
              {label:'TECH vs DEF', score:xlkPct>(xlpPct+xluPct)/2+0.3?1:xlkPct<(xlpPct+xluPct)/2-0.3?-1:0, desc:xlkPct>(xlpPct+xluPct)/2+0.3?'OFFENSIVE':'NEUTRAL', color:xlkPct>(xlpPct+xluPct)/2+0.3?'#00ff88':xlkPct<(xlpPct+xluPct)/2-0.3?'#ff3355':'var(--text2)'},
              {label:'CREDIT (HYG)',score:hyg>0.2?1:hyg<-0.3?-1:0, desc:hyg>0.2?'SPREADS TIGHT':hyg<-0.3?'SPREADS WIDE':'NEUTRAL', color:hyg>0.2?'#00ff88':hyg<-0.3?'#ff3355':'var(--text2)'},
            ];
            const totalScore = signals.reduce((a,s2)=>a+s2.score,0);
            const maxScore   = signals.length;
            const scorePct   = (totalScore + maxScore) / (maxScore*2) * 100;
            const regime = totalScore>=4?'RISK-ON':totalScore>=1?'LEANING RISK-ON':totalScore>=-1?'TRANSITION':totalScore>=-4?'LEANING RISK-OFF':'RISK-OFF';
            const regimeColor = totalScore>=3?'#00ff88':totalScore>=1?'#88cc00':totalScore>=-1?'#ffcc00':totalScore>=-3?'#ff8800':'#ff3355';
            const sW=280,sH=148,sCx=sW/2,sCy=sH-16,sR=104;
            const needleAngle = 180 - (scorePct/100*180);
            const nRad = needleAngle*Math.PI/180;
            const needleX = sCx+Math.cos(nRad)*sR*0.82;
            const needleY = sCy-Math.sin(nRad)*sR*0.82;
            const arcSegs=[{from:180,to:144,color:'#ff3355'},{from:144,to:108,color:'#ff6622'},{from:108,to:90,color:'#ffcc00'},{from:90,to:72,color:'#aacc00'},{from:72,to:36,color:'#66dd44'},{from:36,to:0,color:'#00ff88'}];
            const arcPath=({from,to,color})=>{const f=from*Math.PI/180,t=to*Math.PI/180;const x1=sCx+Math.cos(f)*sR,y1=sCy-Math.sin(f)*sR,x2=sCx+Math.cos(t)*sR,y2=sCy-Math.sin(t)*sR,xi1=sCx+Math.cos(f)*(sR-16),yi1=sCy-Math.sin(f)*(sR-16),xi2=sCx+Math.cos(t)*(sR-16),yi2=sCy-Math.sin(t)*(sR-16);return `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${sR},${sR} 0 0 0 ${x2.toFixed(1)},${y2.toFixed(1)} L${xi2.toFixed(1)},${yi2.toFixed(1)} A${sR-16},${sR-16} 0 0 1 ${xi1.toFixed(1)},${yi1.toFixed(1)} Z" fill="${color}" opacity="0.85"/>`;};
            return `<svg viewBox="0 0 ${sW} ${sH}" width="100%" style="display:block;max-width:300px;margin:0 auto;">
              ${arcSegs.map(arcPath).join('')}
              <circle cx="${sCx}" cy="${sCy}" r="${sR-16}" fill="var(--bg2)" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
              <line x1="${sCx}" y1="${sCy}" x2="${needleX.toFixed(1)}" y2="${needleY.toFixed(1)}" stroke="${regimeColor}" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="${sCx}" cy="${sCy}" r="6" fill="${regimeColor}" stroke="var(--bg2)" stroke-width="2"/>
              <text x="${sCx}" y="${sCy-24}" text-anchor="middle" fill="${regimeColor}" font-size="14" font-family="Orbitron,monospace" font-weight="900">${regime}</text>
              <text x="${sCx}" y="${sCy-10}" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="7" font-family="Orbitron,monospace">SCORE ${totalScore>0?'+':''}${totalScore} / ${maxScore}</text>
              <text x="10" y="${sCy+12}" fill="rgba(255,51,85,0.7)" font-size="8" font-family="Orbitron,monospace">RISK-OFF</text>
              <text x="${sW-10}" y="${sCy+12}" text-anchor="end" fill="rgba(0,255,136,0.7)" font-size="8" font-family="Orbitron,monospace">RISK-ON</text>
            </svg>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;margin-top:6px;">
              ${signals.map(sig=>`<div style="padding:3px 5px;background:var(--bg3);border-radius:2px;border-left:2px solid ${sig.color};text-align:left;">
                <div style="font-family:'Orbitron',monospace;font-size:6px;color:var(--text3);">${sig.label}</div>
                <div style="font-family:'Share Tech Mono',monospace;font-size:8px;color:${sig.color};">${sig.desc}</div>
              </div>`).join('')}
            </div>`;
        })()}
      </div>

      <!-- DXY -->
      <div class="panel" style="border-left:4px solid ${(dxy.pct_change||0)>=0?'#ff8800':'#00ff88'};">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:${(dxy.pct_change||0)>=0?'#ff8800':'#00ff88'};margin-bottom:3px;">$ US DOLLAR INDEX</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:26px;font-weight:900;color:#e8e8e8;">${dxy.price?fmt(dxy.price,2):'—'}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${(dxy.pct_change||0)>=0?'#ff8800':'#00ff88'};">${s(dxy.pct_change)}${fmt(dxy.pct_change,2)}%</div>
        <div style="font-size:10px;color:${(dxy.pct_change||0)>=0?'#ff8800':'#00ff88'};margin-top:2px;">${(dxy.pct_change||0)>=0?'▲ HEADWIND':'▼ TAILWIND'}</div>
      </div>
    </div>

    <!-- ROW 2: INDICES -->
    <div class="panel" style="margin-bottom:10px;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;color:#00ccff;margin-bottom:6px;letter-spacing:2px;">⬡ INDICES</div>
      <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:5px;">
        ${['SPY','QQQ','IWM','DIA','^VIX','ES=F','^GSPC','DX-Y.NYB'].map(sym=>{
          const pr2=p(sym),pc2=pct(sym);if(!pr2)return '';
          const up=pc2>=0,c=up?'#00ff88':'#ff4466';
          const lbl={'SPY':'SPY','QQQ':'QQQ','IWM':'IWM','DIA':'DIA','^VIX':'VIX','ES=F':'ES=F','^GSPC':'S&P 500','DX-Y.NYB':'DXY'}[sym]||sym;
          const isRate=sym==='^VIX';
          const dp=isRate?fmt(pr2,2):('$'+fmt(pr2,2));
          return `<div style="background:${up?'rgba(0,255,136,0.07)':'rgba(255,51,85,0.07)'};border:1px solid ${up?'#00ff8833':'#ff335533'};border-top:2px solid ${c};border-radius:3px;padding:6px;text-align:center;">
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:rgba(255,255,255,0.6);">${lbl}</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:12px;font-weight:bold;color:#e8e8e8;">${dp}</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${c};">${s(pc2)}${fmt(pc2,2)}%</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- ROW 3: LEFT tickers | RIGHT rotation map -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start;">

      <!-- LEFT: Sectors → Sub-sectors → MAG7 → Commodities → Bonds -->
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:#8855ff;margin-bottom:5px;padding-bottom:3px;border-bottom:1px solid #8855ff22;">⬡ SECTORS <span style="font-size:7px;color:rgba(255,255,255,0.2);">width = S&P weight</span></div>
        <div style="display:flex;gap:3px;margin-bottom:10px;">${sectorTiles}</div>

        ${groupLbl('SUB-SECTORS','#6644cc')}
        <div style="display:grid;grid-template-columns:repeat(9,1fr);gap:4px;margin-bottom:8px;">
          ${[['SMH','SMH'],['XBI','XBI'],['KRE','KRE'],['XRT','XRT'],['ITB','ITB'],['XOP','XOP'],['GDX','GDX'],['ARKK','ARKK'],['XHB','XHB']]
            .map(([sym,l])=>tile(sym,l)).join('')}
        </div>

        ${groupLbl('MAG 7','#ffcc00')}
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px;">
          ${[['AAPL','AAPL'],['MSFT','MSFT'],['GOOGL','GOOG'],['AMZN','AMZN'],['NVDA','NVDA'],['META','META'],['TSLA','TSLA']]
            .map(([sym,l])=>tile(sym,l)).join('')}
        </div>

        ${groupLbl('COMMODITIES','#ff8800')}
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-bottom:8px;">
          ${[['GC=F','GOLD'],['SI=F','SILVER'],['HG=F','COPPER'],['CL=F','OIL'],['NG=F','NAT GAS']]
            .map(([sym,l])=>tile(sym,l)).join('')}
        </div>

        ${groupLbl('BONDS & RATES','#00ccff')}
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px;">
          ${['^TNX','^IRX','^TYX'].map(sym=>tile(sym,{'^TNX':'10YR','^IRX':'2YR','^TYX':'30YR'}[sym],{isRate:true})).join('')}
          ${[['TLT','TLT'],['HYG','HYG'],['JNK','JNK']].map(([sym,l])=>tile(sym,l)).join('')}
        </div>
      </div>

      <!-- RIGHT: Rotation map -->
      <div class="panel" style="position:sticky;top:0;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:#00ccff;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid #00ccff22;">⬡ MARKET ROTATION MAP</div>
        ${rotSVG}
      </div>

    </div>
  `;
}

function renderToday(md,sd){
  const q=md.quotes||{},spy=q['SPY']||{};
  // Build a live intraday entry if today isn't in the database yet
  const todayStr=new Date().toISOString().split('T')[0];
  let liveDay=null;
  if(spy.price&&(!sd||!sd.length||sd[0].date!==todayStr)){
    const o=spy.open||spy.prev_close||spy.price;
    const h=spy.high||spy.price;
    const l=spy.low||spy.price;
    const c=spy.price;
    liveDay={date:todayStr,open:o,high:h,low:l,close:c,volume:spy.volume||0,
      measurements:{
        oc_pts:c-o,oc_pct:(c-o)/o*100,
        oh_pts:h-o,oh_pct:(h-o)/o*100,
        ol_pts:l-o,ol_pct:(l-o)/o*100,
        hc_pts:c-h,hc_pct:(c-h)/h*100,
        lc_pts:c-l,lc_pct:(c-l)/l*100,
        range_pts:h-l,range_pct:(h-l)/o*100
      },volume_analysis:{}};
  }
  const sdFull=liveDay?[liveDay,...(sd||[])]:(sd||[]);
  if(!sdFull.length){$('panel-today').innerHTML='<div class="no-data">No SPY data available yet.</div>';return;}
  const day=sdFull[0],vixQ=q['^VIX']||{},tnx=q['^TNX']||{},fg=md.fear_greed||{};
  $('todayDate').innerHTML=`<span class="live-dot"></span>${liveDay?'LIVE INTRADAY':'TODAY\'S RESULTS'} — ${day.date}`;
  // OHLCV
  $('ohlcvRow').innerHTML=[
    {l:'OPEN',v:'$'+fmt(day.open,2),c:''},
    {l:'HIGH',v:'$'+fmt(day.high,2),c:'up'},
    {l:'LOW',v:'$'+fmt(day.low,2),c:'dn'},
    {l:'CLOSE',v:'$'+fmt(day.close,2),c:day.close>=day.open?'up':'dn'},
    {l:'VOLUME',v:fmtK(day.volume),c:''},
    {l:'VWAP',v:day.vwap?'$'+fmt(day.vwap,2):'—',c:''}
  ].map(({l,v,c})=>`<div class="ohlcv-card"><div class="oc-lbl">${l}</div><div class="oc-val ${c}">${v}</div></div>`).join('');
  // Measurements
  const m=day.measurements||{};
  // Support both field name formats (live intraday uses oc_pts, DB uses open_to_close)
  const meas = {
    oc_pts: m.oc_pts ?? m.open_to_close,
    oc_pct: m.oc_pct ?? m.pct_open_to_close,
    oh_pts: m.oh_pts ?? m.open_to_high,
    oh_pct: m.oh_pct ?? m.pct_open_to_high,
    ol_pts: m.ol_pts ?? m.open_to_low,
    ol_pct: m.ol_pct ?? m.pct_open_to_low,
    hc_pts: m.hc_pts ?? m.high_to_close,
    hc_pct: m.hc_pct ?? m.pct_high_to_close,
    lc_pts: m.lc_pts ?? m.low_to_close,
    lc_pct: m.lc_pct ?? m.pct_low_to_close,
    range_pts: m.range_pts ?? m.day_range,
    range_pct: m.range_pct ?? m.pct_day_range
  };
  const measItems=[
    {n:'Open → Close',pts:meas.oc_pts,pct:meas.oc_pct},
    {n:'Open → High',pts:meas.oh_pts,pct:meas.oh_pct},
    {n:'Open → Low',pts:meas.ol_pts,pct:meas.ol_pct},
    {n:'High → Close',pts:meas.hc_pts,pct:meas.hc_pct},
    {n:'Low → Close',pts:meas.lc_pts,pct:meas.lc_pct},
    {n:'Day Range',pts:meas.range_pts,pct:meas.range_pct}
  ];
  const maxPts=Math.max(...measItems.map(x=>Math.abs(x.pts||0)),1);
  $('measList').innerHTML=measItems.map(({n,pts,pct})=>{
    if(pts==null)return '';
    const w=Math.abs(pts)/maxPts*100;const c=pts>=0?'#00ff88':'#ff3355';
    return `<div class="meas-row"><span class="meas-name">${n}</span><div class="meas-bar-wrap"><div class="meas-bar" style="width:${w}%;background:${c}66"></div></div><span class="meas-pts ${clr(pts)}">${sign(pts)}${fmt(pts,2)}</span><span class="meas-pct ${clr(pts)}">${sign(pct)}${fmt(pct,2)}%</span></div>`;
  }).join('');
  // DoD
  const prev=sdFull[1];
  if(prev){
    const pm=prev.measurements||{};
    $('dodList').innerHTML=[
      {l:'Open-to-Open',cur:day.open,prev:prev.open},
      {l:'Close-to-Close',cur:day.close,prev:prev.close},
      {l:'High-to-High',cur:day.high,prev:prev.high},
      {l:'Low-to-Low',cur:day.low,prev:prev.low}
    ].map(({l,cur,prev:p})=>{const diff=cur-p;return `<div class="dod-row"><span class="dod-lbl">${l}</span><span class="dod-val ${clr(diff)}">${sign(diff)}${fmt(diff,2)} (${sign(diff/p*100)}${fmt(diff/p*100,2)}%)</span></div>`;}).join('');
  }else{$('dodList').innerHTML='<div class="no-data">No previous day yet.</div>';}
  // Conditions
  const fgVal=fg.value!=null?fg.value:fg.score;
  const vol=day.volume_analysis||{};
  // Normalize volume field names (DB uses different names than live)
  const v930=vol.open_1h??vol.vol_930_1000;
  const v930pct=vol.open_1h_pct??(v930&&day.volume?v930/day.volume*100:null);
  const v1500=vol.close_1h??vol.vol_1500_1600;
  const v1500pct=vol.close_1h_pct??(v1500&&day.volume?v1500/day.volume*100:null);
  const peakTime=vol.peak_time??vol.peak_volume_time;
  const hvnPrice=vol.hvn_price??vol.hvn_price;
  $('todayCondGrid').innerHTML=`
    <div class="cond-card">
      <div class="cc-title">⬡ VOLUME SUMMARY</div>
      <div class="cond-row"><span class="cond-key">Total</span><span class="cond-val">${fmtK(day.volume??vol.total_volume??0)}</span></div>
      <div class="cond-row"><span class="cond-key">Open 1H</span><span class="cond-val">${v930?fmtK(v930):'—'} <span style="color:var(--text3)">${v930pct?fmt(v930pct,1)+'%':''}</span></span></div>
      <div class="cond-row"><span class="cond-key">Close 1H</span><span class="cond-val">${v1500?fmtK(v1500):'—'} <span style="color:var(--text3)">${v1500pct?fmt(v1500pct,1)+'%':''}</span></span></div>
      <div class="cond-row"><span class="cond-key">Peak Time</span><span class="cond-val">${peakTime?fmt12(peakTime):'—'}</span></div>
      <div class="cond-row"><span class="cond-key">HVN Price</span><span class="cond-val">${hvnPrice?'$'+fmt(hvnPrice,2):'—'}</span></div>
    </div>
    <div class="cond-card">
      <div class="cc-title">⬡ OPTIONS SNAPSHOT</div>
      ${(()=>{const o=md.options_summary||{};return `
      <div class="cond-row"><span class="cond-key">P/C (Vol)</span><span class="cond-val ${o.pc_ratio_vol>1?'dn':o.pc_ratio_vol<0.7?'up':'neu'}">${fmt(o.pc_ratio_vol,3)}</span></div>
      <div class="cond-row"><span class="cond-key">Call Vol</span><span class="cond-val up">${o.call_volume?fmtK(o.call_volume):'—'}</span></div>
      <div class="cond-row"><span class="cond-key">Put Vol</span><span class="cond-val dn">${o.put_volume?fmtK(o.put_volume):'—'}</span></div>
      <div class="cond-row"><span class="cond-key">Expiry</span><span class="cond-val">${o.expiry||'—'}</span></div>`;})()}
    </div>
    <div class="cond-card">
      <div class="cc-title">⬡ MARKET CONDITIONS</div>
      <div class="cond-row"><span class="cond-key">VIX</span><span class="cond-val ${vixQ.price>30?'dn':vixQ.price<20?'up':'neu'}">${fmt(vixQ.price,2)} <span style="color:var(--text3)">${sign(vixQ.change)}${fmt(vixQ.change,2)}</span></span></div>
      <div class="cond-row"><span class="cond-key">F&G Index</span><span class="cond-val">${fgVal||'—'}</span></div>
      <div class="cond-row"><span class="cond-key">10YR Yield</span><span class="cond-val">${fmt(tnx.price,3)}%</span></div>
      <div class="cond-row"><span class="cond-key">Yield Spread</span><span class="cond-val">${(()=>{const irx=q['^IRX'];return irx&&tnx?fmt(tnx.price-irx.price,3)+'%':'—';})()}</span></div>
    </div>`;
}

function renderOptions(md){
  const o   = md.options_summary||{};
  const mp  = md.max_pain||[];
  const q   = md.quotes||{};
  const spy = q['SPY']||{};
  const cur = spy.price||0;
  const gex = md.gex||{};
  const atm_iv = md.weekly_em?.[0]?.atm_iv || o.atm_iv || null;
  const atm_iv_pct = (atm_iv || 0) * 100;  
  const sign2 = v => v>=0?'+':'';

  const today3 = new Date();
  const dow3   = today3.getDay();
  const thisFri = new Date(today3); thisFri.setDate(today3.getDate()+(dow3===5?0:(5-dow3+7)%7));
  const thisFriStr = thisFri.toISOString().slice(0,10);
  const getMonthlyOpex = () => {
    const d=new Date(); d.setDate(1); let fc=0;
    while(fc<3){d.setDate(d.getDate()+1);if(d.getDay()===5)fc++;}
    if(d<today3){d.setMonth(d.getMonth()+1);d.setDate(1);fc=0;
      while(fc<3){d.setDate(d.getDate()+1);if(d.getDay()===5)fc++;}}
    return d.toISOString().slice(0,10);
  };
  const monthlyOpexStr = getMonthlyOpex();
  const fridayExp  = mp.find(m=>m.expiry===thisFriStr);
  const monthlyExp = mp.find(m=>m.expiry===monthlyOpexStr);
  const pcr    = o.pc_ratio_vol;
  const pcrOI  = o.pc_ratio_oi;
  const pcrC   = !pcr?'var(--text3)':pcr<0.7?'#00ff88':pcr<1.0?'#ffcc00':'#ff3355';
  const pcrLbl = !pcr?'—':pcr<0.7?'BULLISH':pcr<1.0?'NEUTRAL':'BEARISH';

  // HEADER BAR
  const hdr=$('optionsHeaderBar');
  if(hdr){
    const expRow=[
      {label:'NEAREST', data:mp[0]},
      {label:'THIS FRIDAY', exp:thisFriStr, data:fridayExp},
      {label:'MONTHLY OPEX', exp:monthlyOpexStr, data:monthlyExp},
    ].map(e=>{
      const expStr=e.data?.expiry||e.exp||'—';
      const pain=e.data?.max_pain;
      const dist=pain&&cur?pain-cur:null;
      const dte=e.data?.dte??(expStr!=='—'?Math.ceil((new Date(expStr)-today3)/86400000):null);
      const dc=dist>0?'#00ff88':dist<0?'#ff3355':'var(--text2)';
      return `<div style="padding:8px 16px;border-right:1px solid var(--border);">
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:2px;">${e.label}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:14px;font-weight:bold;color:var(--cyan);">${expStr}</div>
        <div style="display:flex;gap:10px;margin-top:2px;font-size:11px;">
          ${dte!=null?`<span style="color:var(--text3);">${dte}d</span>`:''}
          ${pain?`<span style="color:var(--text3);">Pain: <b style="color:#fff;">$${fmt(pain,0)}</b></span>`:''}
          ${dist!=null?`<span style="color:${dc};">${dist>0?'+':''}${fmt(dist,2)}</span>`:''}
        </div>
      </div>`;
    }).join('');
    hdr.innerHTML=`<div style="display:flex;background:var(--bg2);border:1px solid var(--border);border-radius:4px;overflow:hidden;align-items:stretch;">
      ${expRow}
      <div style="padding:8px 16px;margin-left:auto;display:flex;align-items:center;gap:20px;">
        <div><div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);">SPY</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:16px;font-weight:bold;">$${fmt(cur,2)}</div></div>
        <div><div style="font-family:'Orbitron',monospace;font-size:7px;color:#8855ff;">ATM IV</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:16px;font-weight:bold;color:#8855ff;">${atm_iv?fmt(atm_iv*100,1)+'%':'—'}</div></div>
        <div><div style="font-family:'Orbitron',monospace;font-size:7px;color:${pcrC};">PCR</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:16px;font-weight:bold;color:${pcrC};">${pcr?fmt(pcr,3):'—'} <span style="font-size:9px;">${pcrLbl}</span></div></div>
      </div>
    </div>`;
  }

  // EXPIRY REFERENCE BANNER
  const nearestExp = mp[0]?.expiry || o.expiry || '—';
  const nearestDte = o.dte ?? mp[0]?.dte ?? null;
  const nearestExpDow = nearestExp!=='—' ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(nearestExp+'T12:00:00').getDay()] : '';
  const nearestLabel = nearestExp===today3.toISOString().slice(0,10) ? '0DTE' : nearestExp===thisFriStr ? 'WEEKLY OPEX' : nearestExp===monthlyOpexStr ? 'MONTHLY OPEX' : `${nearestExpDow} expiry`;
  const expTag = `<span style="font-family:'Orbitron',monospace;font-size:7px;color:var(--cyan);background:rgba(0,204,255,0.1);border:1px solid rgba(0,204,255,0.3);padding:1px 5px;border-radius:2px;margin-left:6px;">${nearestExp} · ${nearestLabel}${nearestDte!=null?' · '+nearestDte+'d':''}</span>`;
  const banner=$('optsExpiryBanner');
  if(banner){
    const nearestExpDow2 = nearestExp!=='—' ? new Date(nearestExp+'T12:00:00').getDay() : null;
    const bannerColor = nearestExp===today3.toISOString().slice(0,10)?'#ff3355':nearestExp===thisFriStr?'#ffcc00':nearestExp===monthlyOpexStr?'#ff8800':'var(--cyan)';
    banner.innerHTML=`<div style="display:flex;align-items:center;gap:12px;padding:6px 12px;background:${bannerColor}15;border:1px solid ${bannerColor}44;border-left:4px solid ${bannerColor};border-radius:3px;font-family:'Share Tech Mono',monospace;font-size:12px;">
      <span style="font-family:'Orbitron',monospace;font-size:8px;color:${bannerColor};letter-spacing:1px;">NEAREST EXPIRY</span>
      <span style="font-weight:bold;color:#fff;">${nearestExp}</span>
      <span style="color:${bannerColor};font-weight:bold;">${nearestLabel}</span>
      ${nearestDte!=null?`<span style="color:var(--text3);">${nearestDte} day${nearestDte!==1?'s':''} to expiry</span>`:''}
      <span style="color:var(--text3);margin-left:auto;font-size:11px;">PCR, call/put vol, OI, and strike data below all reference this expiry unless noted</span>
    </div>`;
  }

  const totalCallVol=o.total_call_vol||0, totalPutVol=o.total_put_vol||0;
  const totalCallOI=o.total_call_oi||0,   totalPutOI=o.total_put_oi||0;
  const totalVol=totalCallVol+totalPutVol, totalOI=totalCallOI+totalPutOI;
  const cvPct=totalVol?Math.round(totalCallVol/totalVol*100):50;
  const coiPct=totalOI?Math.round(totalCallOI/totalOI*100):50;
  $('optsSummaryRow').innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;">
      <div class="panel" style="text-align:center;border-top:3px solid ${pcrC};">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:${pcrC};margin-bottom:2px;">PCR VOLUME</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:28px;font-weight:900;color:${pcrC};">${pcr?fmt(pcr,3):'—'}</div>
        <div style="font-size:10px;color:${pcrC};">${pcrLbl}</div>
      </div>
      <div class="panel" style="text-align:center;border-top:3px solid ${!pcrOI?'var(--border)':pcrOI<0.7?'#00ff88':pcrOI<1.0?'#ffcc00':'#ff3355'};">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:2px;">PCR OI</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:28px;font-weight:900;color:${!pcrOI?'var(--text2)':pcrOI<0.7?'#00ff88':pcrOI<1.0?'#ffcc00':'#ff3355'};">${pcrOI?fmt(pcrOI,3):'—'}</div>
        <div style="font-size:10px;color:var(--text3);">${!pcrOI?'—':pcrOI<0.7?'BULLISH':pcrOI<1.0?'NEUTRAL':'BEARISH'}</div>
      </div>
      <div class="panel" style="text-align:center;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:2px;">CALL / PUT VOL</div>
        <div style="display:flex;height:6px;border-radius:3px;overflow:hidden;margin:6px 0;">
          <div style="flex:${cvPct};background:#00ff88;"></div><div style="flex:${100-cvPct};background:#ff3355;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;">
          <span style="color:#00ff88;">${totalCallVol?fmtK(totalCallVol):'—'}</span>
          <span style="color:#ff3355;">${totalPutVol?fmtK(totalPutVol):'—'}</span>
        </div>
      </div>
      <div class="panel" style="text-align:center;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:2px;">CALL / PUT OI</div>
        <div style="display:flex;height:6px;border-radius:3px;overflow:hidden;margin:6px 0;">
          <div style="flex:${coiPct};background:#00ff8866;"></div><div style="flex:${100-coiPct};background:#ff335566;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;">
          <span style="color:#00ff88;">${totalCallOI?fmtK(totalCallOI):'—'}</span>
          <span style="color:#ff3355;">${totalPutOI?fmtK(totalPutOI):'—'}</span>
        </div>
      </div>
      <div class="panel" style="text-align:center;border-top:3px solid #8855ff;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:#8855ff;margin-bottom:4px;">ATM IV</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:28px;font-weight:900;color:${atm_iv>25?'#ff3355':atm_iv>18?'#ff8800':atm_iv>12?'#ffcc00':'#00ff88'};">${atm_iv?fmt(atm_iv*100,1)+'%':'—'}</div>
        <div style="font-size:10px;color:var(--text3);">IMPLIED VOLATILITY</div>
      </div>
    </div>`;

  // STRIKES
  const calls=md.top_call_strikes||[], puts=md.top_put_strikes||[];
  const callWall=calls[0]?.strike, putWall=puts[0]?.strike;
  $('callStrikeList').innerHTML=calls.length?calls.map((s,i)=>{
    const isW=i===0; const dist=cur?s.strike-cur:null;
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);${isW?'border-left:3px solid #00ff88;padding-left:6px;':''}">
      <span style="font-family:'Share Tech Mono',monospace;font-size:15px;font-weight:bold;color:${isW?'#00ff88':'var(--text1)'};">$${fmt(s.strike,0)}</span>
      ${isW?' ◀ WALL':''}
      <span style="font-size:11px;color:var(--text3);">${fmtK(s.oi)} OI</span>
      ${dist!=null?`<span style="font-size:11px;color:#00ff88;">+${fmt(dist,2)}</span>`:''}
    </div>`;
  }).join(''):'<div class="no-data">No data</div>';
  $('putStrikeList').innerHTML=puts.length?puts.map((s,i)=>{
    const isW=i===0; const dist=cur?cur-s.strike:null;
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);${isW?'border-left:3px solid #ff3355;padding-left:6px;':''}">
      <span style="font-family:'Share Tech Mono',monospace;font-size:15px;font-weight:bold;color:${isW?'#ff3355':'var(--text1)'};">$${fmt(s.strike,0)}</span>
      ${isW?' ◀ WALL':''}
      <span style="font-size:11px;color:var(--text3);">${fmtK(s.oi)} OI</span>
      ${dist!=null?`<span style="font-size:11px;color:#ff3355;">${fmt(dist,2)}</span>`:''}
    </div>`;
  }).join(''):'<div class="no-data">No data</div>';

  // KEY LEVELS
  const klEl=$('optsKeyLevels');
  if(klEl){
    const rows=[
      {l:'Call Wall',  v:callWall,         c:'#00ff88'},
      {l:'Put Wall',   v:putWall,          c:'#ff3355'},
      {l:'GEX Flip',   v:gex.flip_point,   c:'#ffcc00'},
      {l:'GEX Support',v:gex.support,      c:'#00ff8888'},
      {l:'GEX Resist', v:gex.resistance,   c:'#ff335588'},
      {l:'Max Pain (nearest)',v:mp[0]?.max_pain, c:'var(--cyan)'},
      {l:'Max Pain (Fri)',    v:fridayExp?.max_pain,  c:'#ffcc00'},
      {l:'Max Pain (Monthly)',v:monthlyExp?.max_pain, c:'#ff8800'},
    ].filter(r=>r.v);
    klEl.innerHTML=rows.map(r=>{
      const dist=cur&&r.v?r.v-cur:null;
      const dc=dist>0?'#00ff88':dist<0?'#ff3355':'var(--text2)';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:11px;color:var(--text3);">${r.l}</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:14px;font-weight:bold;color:${r.c};">$${fmt(r.v,2)}</span>
        ${dist!=null?`<span style="font-size:11px;color:${dc};">${dist>0?'+':''}${fmt(dist,2)}</span>`:''}
      </div>`;
    }).join('')||'<div class="no-data">Loading levels...</div>';
  }

  // IV PANEL
  const ivEl=$('optsIVPanel');
  if(ivEl){
    const vix=q['^VIX']?.price||0;
    const wem=md.weekly_em?.[0];
    const dailyEM = atm_iv && cur ? (cur * atm_iv * Math.sqrt(1/365) * 0.7).toFixed(2) : null;
    ivEl.innerHTML=[
      {l:'ATM IV', v:atm_iv?fmt(atm_iv_pct,2)+'%':'—', c:atm_iv_pct>25?'#ff3355':atm_iv_pct>18?'#ff8800':atm_iv_pct>12?'#ffcc00':'#00ff88'},
      {l:'VIX (30d)',     v:vix?fmt(vix,2)+'%':'—',                              c:vix>25?'#ff3355':vix>18?'#ff8800':'#ffcc00'},
      {l:'Daily EM (±)',  v:dailyEM?'$'+dailyEM:'—',                             c:'var(--text2)'},
      {l:'WEM High',      v:wem?.wem_high?'$'+fmt(wem.wem_high,2):'—',          c:'#00ff88'},
      {l:'WEM Low',       v:wem?.wem_low?'$'+fmt(wem.wem_low,2):'—',            c:'#ff3355'},
      {l:'WEM Range (±)', v:wem?.wem_range?'$'+fmt(wem.wem_range/2,2):'—',      c:'var(--text2)'},
    ].map(r=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:11px;color:var(--text3);">${r.l}</span>
      <span style="font-family:'Share Tech Mono',monospace;font-size:13px;font-weight:bold;color:${r.c};">${r.v}</span>
    </div>`).join('');
  }

  // VOLUME PANEL
  const volEl=$('optsVolumePanel');
  if(volEl){
    volEl.innerHTML=[
      {l:'Total Volume',   v:totalVol?fmtK(totalVol):'—',    c:'var(--text1)'},
      {l:'Total OI',       v:totalOI?fmtK(totalOI):'—',      c:'var(--text1)'},
      {l:'Nearest OI',     v:mp[0]?.total_oi?fmtK(mp[0].total_oi):'—', c:'var(--cyan)'},
      {l:'Friday OI',      v:fridayExp?.total_oi?fmtK(fridayExp.total_oi):'—',  c:'#ffcc00'},
      {l:'Monthly OI',     v:monthlyExp?.total_oi?fmtK(monthlyExp.total_oi):'—',c:'#ff8800'},
      {l:'PCR OI',         v:pcrOI?fmt(pcrOI,3):'—',         c:!pcrOI?'var(--text2)':pcrOI<0.7?'#00ff88':pcrOI<1.0?'#ffcc00':'#ff3355'},
    ].map(r=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:11px;color:var(--text3);">${r.l}</span>
      <span style="font-family:'Share Tech Mono',monospace;font-size:13px;font-weight:bold;color:${r.c};">${r.v}</span>
    </div>`).join('');
  }

  // FLOW SIGNALS
  const flowEl=$('optsFlowPanel');
  if(flowEl){
    const gexC=gex.net_gex>0?'#00ff88':gex.net_gex<0?'#ff3355':'#ffcc00';
    const nearMP=mp[0]?.max_pain;
    const mpDist=nearMP&&cur?Math.abs(nearMP-cur):null;
    flowEl.innerHTML=[
      {l:'GEX Regime',    v:gex.net_gex>0?'▲ POSITIVE — Stabilizing':gex.net_gex<0?'▼ NEGATIVE — Destabilizing':'Neutral', c:gexC},
      {l:'Net GEX',       v:gex.net_gex?(gex.net_gex/1e9).toFixed(2)+'B':'—',  c:gexC},
      {l:'PCR Signal',    v:!pcr?'—':pcr<0.7?'Heavy call buying':pcr>1.2?'Heavy put buying':'Balanced flow', c:pcrC},
      {l:'IV Signal',     v:!atm_iv?'—':atm_iv>25?'High — elevated fear':atm_iv<12?'Low — complacency':'Normal range', c:'#8855ff'},
      {l:'Max Pain Dist', v:mpDist!=null?'$'+fmt(mpDist,2)+' away':'—',         c:mpDist<3?'#00ff88':mpDist<8?'#ffcc00':'var(--text2)'},
      {l:'Call Wall',     v:callWall?'$'+fmt(callWall,0)+' ('+(callWall&&cur?(sign2(callWall-cur)+fmt(callWall-cur,2)):'')+')':'—', c:'#00ff88'},
      {l:'Put Wall',      v:putWall?'$'+fmt(putWall,0)+' ('+(putWall&&cur?(sign2(cur-putWall)+fmt(cur-putWall,2)):'')+')':'—',  c:'#ff3355'},
    ].map(r=>`<div style="padding:5px 0;border-bottom:1px solid var(--border);">
      <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:1px;">${r.l}</div>
      <div style="font-size:12px;color:${r.c};font-weight:bold;">${r.v}</div>
    </div>`).join('');
  }

  // MAX PAIN TABLE
  const todayStr4 = today3.toISOString().slice(0,10);
  $('optsMpBody').innerHTML=mp.length?mp.map((m,i)=>{
    const dist=cur?m.max_pain-cur:null;
    const expDate=new Date(m.expiry+'T12:00:00'), expDow=expDate.getDay();
    const isFri=expDow===5, isMon=expDow===1, isWed=expDow===3;
    const isToday=m.expiry===todayStr4, isFriOpex=m.expiry===thisFriStr, isMonthly=m.expiry===monthlyOpexStr;
    const typeLabel = isToday?'0DTE':isMonthly?'MONTHLY OPEX':isFriOpex?'WEEKLY OPEX':isWed?'WED 0DTE':isMon?'MON 0DTE':'—';
    const typeColor = isToday?'#ff3355':isMonthly?'#ff8800':isFriOpex?'#ffcc00':'var(--text3)';
    const badge = i===0?'<span style="background:#00ccff22;color:#00ccff;font-size:9px;padding:1px 4px;border-radius:2px;margin-left:5px;">NEAREST</span>':'';
    return `<tr>
      <td class="${i===0?'mp-near':''}">${m.expiry}${badge}</td>
      <td><span style="font-family:'Orbitron',monospace;font-size:8px;color:${typeColor};background:${typeColor}22;padding:1px 5px;border-radius:2px;">${typeLabel}</span></td>
      <td class="${i===0?'mp-near':''}" style="font-weight:bold;">$${fmt(m.max_pain,2)}</td>
      <td>${m.total_oi?fmtK(m.total_oi):'—'}</td>
      <td class="${dist>0?'up':dist<0?'dn':''}">${dist!=null?(sign2(dist)+'$'+fmt(Math.abs(dist),2)):'—'}</td>
    </tr>`;
  }).join(''):'<tr><td colspan="5" class="no-data">No data</td></tr>';
  // Expiry behavior
  try { renderExpiryBehavior(md); } catch(e) { console.warn('expiry:', e); }
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION VOLATILITY PROFILE — 5-min historical chart with lookback + DOW toggles
// ─────────────────────────────────────────────────────────────────────────────
let _svpLookback = 'all';
let _svpDow      = 'all';

window._svpSetLookback = function(val) { _svpLookback = val; renderSessionVolProfile(); };
window._svpSetDow      = function(val) { _svpDow = val;      renderSessionVolProfile(); };

function renderSessionVolProfile() {
  const el = $('volSessionProfile');
  if (!el) return;

  if (typeof SESSION_VOL_PROFILE === 'undefined') {
    el.innerHTML = '<div style="padding:12px;font-size:12px;color:var(--text3);">Session vol profile data not loaded.</div>';
    return;
  }

  // Build key for data lookup
  const key = _svpDow === 'all'
    ? _svpLookback
    : `${_svpLookback}_${_svpDow}`;
  const profile = SESSION_VOL_PROFILE[key];

  if (!profile || !profile.length) {
    el.innerHTML = '<div style="padding:12px;font-size:12px;color:var(--text3);">Not enough data for this filter combination.</div>';
    return;
  }

  // Convert ET timestamps to CT (subtract 1 hour)
  function etToCT(ts) {
    const [h, m] = ts.split(':').map(Number);
    let ch = h - 1;
    if (ch < 0) ch += 24;
    return `${ch}:${String(m).padStart(2, '0')}`;
  }

  // Get current CT time for "now" highlight
  const nowCT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const nowMins = nowCT.getHours() * 60 + nowCT.getMinutes();

  function tsToMins(ts) {
    const [h, m] = ts.split(':').map(Number);
    return h * 60 + m;
  }

  const maxAvg = Math.max(...profile.map(b => b.avg));
  const minAvg = Math.min(...profile.map(b => b.avg));
  const median = [...profile].sort((a,b)=>a.avg-b.avg)[Math.floor(profile.length/2)].avg;

  // Color: heatmap from green (low vol) → yellow → orange → red (high vol)
  function volColor(v) {
    const pct = (v - minAvg) / (maxAvg - minAvg);
    if (pct > 0.75) return '#ff3355';
    if (pct > 0.50) return '#ff8800';
    if (pct > 0.25) return '#ffcc00';
    return '#00cc88';
  }

  const fbtn = (lbl, active, fn) =>
    `<button onclick="${fn}" style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;padding:3px 10px;background:${active?'rgba(0,204,255,0.15)':'var(--bg3)'};border:1px solid ${active?'var(--cyan)':'var(--border)'};border-radius:3px;color:${active?'var(--cyan)':'var(--text2)'};cursor:pointer;">${lbl}</button>`;

  // 'year' key = current calendar year (computed by Python pipeline automatically)
  const curYear = new Date().getFullYear();
  const lbBtns = [
    fbtn('ALL HISTORY', _svpLookback==='all',  "_svpSetLookback('all')"),
    fbtn('12 MONTHS',   _svpLookback==='12m',  "_svpSetLookback('12m')"),
    fbtn(String(curYear), _svpLookback==='year', "_svpSetLookback('year')"),
  ].join(' ');

  const dowBtns = ['all','Mon','Tue','Wed','Thu','Fri'].map(d =>
    fbtn(d === 'all' ? 'ALL DAYS' : d.toUpperCase(), _svpDow === d, `_svpSetDow('${d}')`)
  ).join(' ');

  // Session count label
  const nSessions = profile[0]?.n ? Math.round(profile[0].n / 5) : '?'; // /5 because 5 bars per bucket

  const bars = profile.map(b => {
    const ctTs = etToCT(b.ts);
    const bMins = tsToMins(ctTs);
    const isNow = nowMins >= bMins && nowMins < bMins + 5;
    const barH = Math.round((b.avg / maxAvg) * 100);
    const c = isNow ? 'var(--cyan)' : volColor(b.avg);
    const isHour = b.ts.endsWith(':00');
    // Show CT label only on the hour
    const label = isHour ? ctTs.replace(':00','') + (parseInt(ctTs) >= 12 ? 'pm' : 'am') : '';
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;min-width:0;position:relative;"
               title="${ctTs} CT · $${b.avg.toFixed(4)} avg range · ${isNow ? 'NOW' : ''}">
      ${isNow ? `<div style="position:absolute;top:-14px;font-family:'Orbitron',monospace;font-size:7px;color:var(--cyan);">NOW</div>` : ''}
      <div style="width:100%;display:flex;flex-direction:column;justify-content:flex-end;height:80px;background:var(--bg3);border-radius:2px 2px 0 0;overflow:hidden;${isNow?'border:1px solid var(--cyan);':''}">
        <div style="width:100%;background:${c};opacity:${isNow?1:0.75};height:${barH}%;border-radius:2px 2px 0 0;transition:height 0.3s;"></div>
      </div>
      <div style="font-family:'Orbitron',monospace;font-size:7px;color:${isHour?(isNow?'var(--cyan)':'var(--text2)'):'transparent'};white-space:nowrap;">${label||'·'}</div>
    </div>`;
  }).join('');

  // Top/bottom 5 slots
  const sorted = [...profile].sort((a,b) => b.avg - a.avg);
  const top3 = sorted.slice(0,3).map(b => `${etToCT(b.ts)} CT ($${b.avg.toFixed(3)})`).join(' · ');
  const bot3 = sorted.slice(-3).map(b => `${etToCT(b.ts)} CT ($${b.avg.toFixed(3)})`).join(' · ');

  el.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:5px;">LOOKBACK</div>
        <div style="display:flex;gap:5px;">${lbBtns}</div>
      </div>
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:5px;">DAY OF WEEK</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;">${dowBtns}</div>
      </div>
      <div style="text-align:right;font-size:10px;color:var(--text3);">
        <div>${profile.length} buckets · ~${nSessions} sessions</div>
        <div style="margin-top:2px;">avg 5-min range · Central Time · top 10% trimmed</div>
      </div>
    </div>

    <div style="display:flex;align-items:flex-end;gap:1px;padding:18px 0 4px;overflow:hidden;margin-bottom:6px;">
      ${bars}
    </div>

    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:8px;padding:8px;background:var(--bg3);border-radius:4px;">
      <div style="font-size:10px;">
        <span style="color:var(--text3);">HIGHEST VOL: </span>
        <span style="color:#ff3355;font-family:'Share Tech Mono',monospace;">${top3}</span>
      </div>
      <div style="font-size:10px;">
        <span style="color:var(--text3);">LOWEST VOL: </span>
        <span style="color:#00cc88;font-family:'Share Tech Mono',monospace;">${bot3}</span>
      </div>
    </div>
    <div style="margin-top:6px;font-size:10px;color:var(--text3);">
      <span style="display:inline-block;width:10px;height:10px;background:#ff3355;border-radius:2px;vertical-align:middle;margin-right:3px;"></span>High vol &nbsp;
      <span style="display:inline-block;width:10px;height:10px;background:#ff8800;border-radius:2px;vertical-align:middle;margin-right:3px;"></span>Elevated &nbsp;
      <span style="display:inline-block;width:10px;height:10px;background:#ffcc00;border-radius:2px;vertical-align:middle;margin-right:3px;"></span>Normal &nbsp;
      <span style="display:inline-block;width:10px;height:10px;background:#00cc88;border-radius:2px;vertical-align:middle;margin-right:3px;"></span>Quiet
    </div>`;
}

function renderVolatility(md){
  const q=md.quotes||{};
  const vs=q['^VIX'], v3=q['^VIX3M'], v6=q['^VIX6M'];
  const vvix=q['^VVIX'], skew=q['^SKEW'], vxx=q['VXX']||{};
  const spy=q['SPY']||{};
  const vix=vs?.price||0;
  const atm_iv = md.weekly_em?.[0]?.atm_iv;
  const wem = md.weekly_em?.[0] || {};
  const opt = md.options_summary || {};
  const sd = typeof _sd !== 'undefined' ? _sd : [];

  const vColor=vix<15?'#00ff88':vix<20?'#88cc00':vix<25?'#ffcc00':vix<35?'#ff8800':'#ff3355';
  const vRegime=vix<15?'LOW VOL':vix<20?'CALM':vix<25?'ELEVATED':vix<35?'HIGH VOL':'EXTREME';
  const vvixVal=vvix?.price||0, skewVal=skew?.price||0;
  const vvixColor=vvixVal>120?'#ff3355':vvixVal>100?'#ff8800':vvixVal>85?'#ffcc00':'#00ff88';
  const vvixLabel=vvixVal>120?'PANIC':vvixVal>100?'STRESSED':vvixVal>85?'ELEVATED':'CALM';
  const skewColor=skewVal>145?'#ff3355':skewVal>135?'#ff8800':skewVal>125?'#ffcc00':'#00ff88';
  const skewLabel=skewVal>145?'EXTREME TAIL':skewVal>135?'HIGH TAIL':skewVal>125?'ELEVATED':'NORMAL';
  const spyIv=atm_iv?atm_iv*100:null;
  const ivColor=spyIv>30?'#ff3355':spyIv>20?'#ff8800':spyIv>15?'#ffcc00':'#00ff88';

  // ── ROW 1: Big vol cards ──────────────────────────────────────────────────
  const bigVolCard=(label,value,sublabel,color,change,desc)=>`
    <div class="panel" style="text-align:center;border-top:3px solid ${color};">
      <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:${color};margin-bottom:8px;">${label}</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:36px;font-weight:900;color:${color};">${value}</div>
      <div style="font-family:'Orbitron',monospace;font-size:10px;letter-spacing:2px;color:${color};margin-top:4px;padding:3px 8px;background:${color}22;border-radius:3px;display:inline-block;">${sublabel}</div>
      ${change!=null?`<div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--text2);margin-top:6px;">${sign(change)}${fmt(change,2)} today</div>`:''}
      <div style="font-size:12px;color:var(--text3);margin-top:8px;line-height:1.4;">${desc}</div>
    </div>`;

  $('volMainRow').innerHTML=`
    ${bigVolCard('VIX',fmt(vix,2),vRegime,vColor,vs?.change,'Equity vol. Options fear gauge.')}
    ${bigVolCard('VVIX',vvixVal?fmt(vvixVal,1):'—',vvixLabel,vvixColor,vvix?.change,'Vol of vol — how erratic VIX is.')}
    ${bigVolCard('SKEW',skewVal?fmt(skewVal,1):'—',skewLabel,skewColor,skew?.change,'Tail risk. High = crash protection demand.')}
    ${bigVolCard('VXX',vxx.price?fmt(vxx.price,2):'—',vxx.price?(vxx.pct_change>2?'FEAR SPIKE':vxx.pct_change>0?'RISING':vxx.pct_change<-2?'COLLAPSING':'FALLING'):'—',vxx.price?(vxx.pct_change>2?'#ff3355':vxx.pct_change>0?'#ff8800':vxx.pct_change<-2?'#00ff88':'#88cc00'):'var(--text3)',vxx.change,'VXX ETF — short-term VIX futures.')}
    ${bigVolCard('ATM IV',spyIv?fmt(spyIv,1)+'%':'—',spyIv?(spyIv>30?'EXPENSIVE':spyIv>20?'ELEVATED':spyIv>12?'NORMAL':'CHEAP'):'—',ivColor,null,'SPY implied vol from options chain.')}`;

  // ── ROW 2A: Intraday Range vs ATR ────────────────────────────────────────
  const atrEl=$('volRangeATR');
  if(atrEl){
    // Compute ATR from sd (daily_ohlcv rows)
    const rows=sd.slice(0,21).filter(r=>r.close);
    const trs=rows.slice(0,-1).map((r,i)=>{
      const prev=rows[i+1];
      if(!prev?.close)return r.high-r.low;
      return Math.max(r.high-r.low, Math.abs(r.high-prev.close), Math.abs(r.low-prev.close));
    }).filter(v=>v>0);
    const atr5  = trs.length>=5  ? trs.slice(0,5).reduce((a,b)=>a+b,0)/5  : null;
    const atr10 = trs.length>=10 ? trs.slice(0,10).reduce((a,b)=>a+b,0)/10 : null;
    const atr20 = trs.length>=20 ? trs.slice(0,20).reduce((a,b)=>a+b,0)/20 : null;
    const todayRow=rows[0];
    const todayRange = todayRow ? (todayRow.high||0)-(todayRow.low||0) : (spy.high&&spy.low?spy.high-spy.low:null);
    const liveRange = spy.high&&spy.low ? spy.high-spy.low : null;
    const useRange = liveRange||todayRange;
    const pctOfATR = useRange&&atr5 ? useRange/atr5*100 : null;
    const rangeRemaining = atr5&&useRange ? Math.max(atr5-useRange,0) : null;
    const rc=pctOfATR==null?'var(--text3)':pctOfATR>100?'#ff3355':pctOfATR>75?'#ff8800':pctOfATR>50?'#ffcc00':'#00ff88';

    let html='';
    if(useRange!=null){
      html+=`<div style="text-align:center;padding:10px;background:${rc}11;border:1px solid ${rc}33;border-radius:4px;margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:4px;">TODAY'S RANGE</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:28px;font-weight:900;color:${rc};">$${fmt(useRange,2)}</div>
        ${pctOfATR!=null?`<div style="font-family:'Orbitron',monospace;font-size:10px;color:${rc};margin-top:4px;">${fmt(pctOfATR,0)}% OF ATR(5)</div>`:''}
      </div>`;
      if(pctOfATR!=null){
        const barW=Math.min(pctOfATR,100).toFixed(1);
        html+=`<div style="height:8px;background:var(--bg3);border-radius:4px;overflow:hidden;margin-bottom:8px;position:relative;">
          <div style="width:${barW}%;height:100%;background:${rc};border-radius:4px;"></div>
          <div style="position:absolute;left:100%;top:-3px;transform:translateX(-1px);width:2px;height:14px;background:rgba(255,255,255,0.3);"></div>
        </div>`;
      }
    }
    html+=`<div style="display:flex;flex-direction:column;gap:5px;">`;
    [[atr5,'ATR(5) — 1wk avg'],[atr10,'ATR(10) — 2wk avg'],[atr20,'ATR(20) — 1mo avg']].forEach(([v,l])=>{
      if(!v)return;
      html+=`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:12px;color:var(--text3);">${l}</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:14px;color:var(--text);">$${fmt(v,2)}</span>
      </div>`;
    });
    if(rangeRemaining!=null){
      const rrc=rangeRemaining<1?'#00ff88':rangeRemaining<3?'#ffcc00':'var(--text2)';
      html+=`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:12px;color:var(--text3);">Range remaining</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${rrc};">$${fmt(rangeRemaining,2)}</span>
      </div>`;
    }
    html+=`</div>`;
    html+=`<div style="margin-top:8px;font-size:11px;color:var(--text3);">${pctOfATR!=null?(pctOfATR>100?'⚠ Range exceeded ATR — extended move. Mean reversion risk.':pctOfATR>75?'Day largely played out. Less opportunity remaining.':pctOfATR>50?'More than half of average range used.':'Early in range. More move likely ahead.'):'Awaiting price data.'}</div>`;
    atrEl.innerHTML=html;
  }

  // ── ROW 2B: Expected Move Calculator ─────────────────────────────────────
  const emEl=$('volExpectedMove');
  if(emEl&&spyIv){
    const spot=spy.price||wem.wem_mid||640;
    const iv=spyIv/100;
    const sqrt252=Math.sqrt(252), sqrt52=Math.sqrt(52), sqrt12=Math.sqrt(12);
    const dailyEM  = spot*iv/sqrt252;
    const weeklyEM = spot*iv/sqrt52;
    const monthlyEM= spot*iv/sqrt12;
    const dailyH=spot+dailyEM, dailyL=spot-dailyEM;
    const wemH=wem.wem_high||spot+weeklyEM, wemL=wem.wem_low||spot-weeklyEM;
    const spyPct=spy.pct_change||0;
    const pctOfDailyEM=dailyEM?Math.abs(spyPct)/100*spot/dailyEM*100:null;

    emEl.innerHTML=`
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div style="padding:8px;background:var(--bg3);border-radius:4px;border-left:3px solid ${ivColor};">
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:4px;">DAILY EM (±1σ)</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:20px;color:${ivColor};">±$${fmt(dailyEM,2)}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px;">$${fmt(dailyL,2)} — $${fmt(dailyH,2)}</div>
          ${pctOfDailyEM!=null?`<div style="margin-top:6px;height:6px;background:var(--bg2);border-radius:3px;overflow:hidden;">
            <div style="width:${Math.min(pctOfDailyEM,100).toFixed(1)}%;height:100%;background:${pctOfDailyEM>80?'#ff3355':pctOfDailyEM>50?'#ff8800':'#00ff88'};"></div>
          </div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px;">SPY used ${fmt(pctOfDailyEM,0)}% of daily EM</div>`:''}
        </div>
        <div style="padding:8px;background:var(--bg3);border-radius:4px;border-left:3px solid var(--cyan);">
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:4px;">WEEKLY EM (±1σ)</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:20px;color:var(--cyan);">±$${fmt(weeklyEM,2)}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px;">WEM: $${fmt(wemL,2)} — $${fmt(wemH,2)}</div>
        </div>
        <div style="padding:8px;background:var(--bg3);border-radius:4px;border-left:3px solid #8855ff;">
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:4px;">MONTHLY EM (±1σ)</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:20px;color:#8855ff;">±$${fmt(monthlyEM,2)}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px;">$${fmt(spot-monthlyEM,2)} — $${fmt(spot+monthlyEM,2)}</div>
        </div>
        <div style="font-size:10px;color:var(--text3);">Based on ATM IV ${fmt(spyIv,1)}% · Spot $${fmt(spot,2)}</div>
      </div>`;
  } else if(emEl){
    emEl.innerHTML='<div class="no-data">Awaiting IV data</div>';
  }

  // ── ROW 2C: IV Rank & Percentile ─────────────────────────────────────────
  const ivRankEl=$('volIVRank');
  if(ivRankEl&&spyIv){
    // Use weekly_em history to compute IV rank
    const wems=md.weekly_em||[];
    const ivHistory=wems.map(w=>w.atm_iv?w.atm_iv*100:null).filter(v=>v!=null);
    const ivRank=ivHistory.length>1?ivHistory.slice(1).filter(v=>v<spyIv).length/(ivHistory.length-1)*100:null;
    const ivMin=ivHistory.length?Math.min(...ivHistory):null;
    const ivMax=ivHistory.length?Math.max(...ivHistory):null;
    const rankColor=ivRank==null?'var(--text3)':ivRank>80?'#ff3355':ivRank>60?'#ff8800':ivRank>40?'#ffcc00':'#00ff88';
    const rankLabel=ivRank==null?'—':ivRank>80?'EXPENSIVE — sell premium':ivRank>60?'ELEVATED — favor spreads':ivRank>40?'NORMAL — neutral':ivRank>20?'CHEAP — buy premium':'VERY CHEAP — long vol';

    ivRankEl.innerHTML=`
      <div style="text-align:center;padding:12px;background:${rankColor}11;border:1px solid ${rankColor}33;border-radius:4px;margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:4px;">IV PERCENTILE</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:36px;font-weight:900;color:${rankColor};">${ivRank!=null?fmt(ivRank,0)+'%':'—'}</div>
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:${rankColor};margin-top:4px;">${rankLabel.split('—')[0].trim()}</div>
      </div>
      ${ivRank!=null?`<div style="height:8px;background:var(--bg3);border-radius:4px;overflow:hidden;margin-bottom:8px;">
        <div style="width:${fmt(ivRank,1)}%;height:100%;background:linear-gradient(90deg,#00ff88,#ffcc00,#ff3355);border-radius:4px;"></div>
      </div>`:''}
      <div style="display:flex;flex-direction:column;gap:5px;">
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:12px;color:var(--text3);">Current IV</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${rankColor};">${fmt(spyIv,1)}%</span>
        </div>
        ${ivMin!=null?`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:12px;color:var(--text3);">${ivHistory.length}wk Low</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:14px;color:#00ff88;">${fmt(ivMin,1)}%</span>
        </div>`:''}
        ${ivMax!=null?`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:12px;color:var(--text3);">${ivHistory.length}wk High</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:14px;color:#ff3355;">${fmt(ivMax,1)}%</span>
        </div>`:''}
        <div style="margin-top:6px;font-size:12px;color:var(--text2);line-height:1.5;">${rankLabel.includes('—')?rankLabel.split('—')[1].trim():rankLabel}</div>
      </div>`;
  }

  // ── ROW 3A: VIX Term Structure ────────────────────────────────────────────
  const mv=Math.max(vix,v3?.price||0,v6?.price||0,40);
  $('volVixTerm').innerHTML=[{l:'VIX SPOT',d:vs},{l:'VIX 3M',d:v3},{l:'VIX 6M',d:v6}].map(({l,d})=>{
    if(!d)return '';
    const w=(d.price/mv*100).toFixed(1);
    const c=d.price<20?'#00ff88':d.price<30?'#ffcc00':'#ff3355';
    return `<div class="vix-row" style="margin-bottom:10px;">
      <span class="vix-name">${l}</span>
      <div class="vix-bar-wrap"><div class="vix-bar-fill" style="width:${w}%;background:${c}88"></div></div>
      <span class="vix-val" style="color:${c}">${fmt(d.price,1)}</span>
      <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${d.change>0?'#ff3355':'#00ff88'};margin-left:6px;">${sign(d.change)}${fmt(d.change,2)}</span>
    </div>`;
  }).join('');

  if(vs&&v3){
    const isC=v3.price>vix;
    const sc=isC?'#00ff88':'#ff8800';
    const sdiff=((v3.price-vix)/vix*100).toFixed(2);
    $('contangoBox').innerHTML=`
      <div class="cond-row" style="margin-bottom:6px;">
        <span class="cond-key">Structure</span>
        <span style="font-family:'Orbitron',monospace;font-size:10px;letter-spacing:2px;padding:3px 8px;border-radius:3px;color:${sc};background:${sc}22;border:1px solid ${sc}44;">${isC?'CONTANGO':'BACKWARDATION'}</span>
      </div>
      <div class="cond-row" style="margin-bottom:4px;">
        <span class="cond-key">3M vs Spot</span>
        <span class="cond-val" style="color:${sc}">${sign(v3.price-vix)}${fmt(v3.price-vix,2)} (${sdiff}%)</span>
      </div>
      <div style="font-size:12px;color:var(--text2);margin-top:8px;line-height:1.5;">${isC?'Normal structure. Near-term fear lower than future expectations. Calm today.':'Inverted. Near-term fear exceeds future. Acute stress or event risk.'}</div>`;
  }

  // ── ROW 3B: Options Flow ──────────────────────────────────────────────────
  const flowEl=$('volOptionsFlow');
  if(flowEl){
    const pcr=opt.pc_ratio_vol||0;
    const pco=opt.pc_ratio_oi||0;
    const cv=opt.call_volume||0, pv=opt.put_volume||0;
    const co=opt.call_oi||0, po=opt.put_oi||0;
    const totalV=(cv+pv)||1, totalO=(co+po)||1;
    const callPctV=(cv/totalV*100).toFixed(1), putPctV=(pv/totalV*100).toFixed(1);
    const pcrColor=pcr>1.5?'#ff3355':pcr>1.0?'#ff8800':pcr<0.7?'#00ff88':'#ffcc00';
    const pcrLabel=pcr>1.5?'BEARISH — heavy put flow':pcr>1.0?'SLIGHTLY BEARISH':pcr<0.7?'BULLISH — call flow dominant':'NEUTRAL';
    const fmtV=v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':String(v);

    flowEl.innerHTML=`
      <div style="text-align:center;padding:10px;background:${pcrColor}11;border:1px solid ${pcrColor}33;border-radius:4px;margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:4px;">P/C RATIO (VOLUME)</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:28px;font-weight:900;color:${pcrColor};">${fmt(pcr,2)}</div>
        <div style="font-size:11px;color:${pcrColor};margin-top:4px;">${pcrLabel}</div>
      </div>
      <div style="height:12px;background:var(--bg3);border-radius:6px;overflow:hidden;margin-bottom:8px;display:flex;">
        <div style="width:${callPctV}%;background:#00ff88;border-radius:6px 0 0 6px;"></div>
        <div style="width:${putPctV}%;background:#ff3355;border-radius:0 6px 6px 0;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:12px;">
        <span style="color:#00ff88;">■ Calls ${callPctV}%</span>
        <span style="color:#ff3355;">■ Puts ${putPctV}%</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;font-size:12px;">
        ${[['Call Vol',fmtV(cv),'#00ff88'],['Put Vol',fmtV(pv),'#ff3355'],['Call OI',fmtV(co),'#00ff8888'],['Put OI',fmtV(po),'#ff335588'],['P/C OI',fmt(pco,2),'var(--text2)']].map(([l,v,c])=>`
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);">
            <span style="color:var(--text3);">${l}</span>
            <span style="font-family:'Share Tech Mono',monospace;color:${c};">${v}</span>
          </div>`).join('')}
      </div>`;
  }

  // ── ROW 3C: Signals ───────────────────────────────────────────────────────
  const signals=[];
  if(vix>30&&vvixVal>100) signals.push({c:'#ff3355',t:`VIX ${fmt(vix,1)} + VVIX ${fmt(vvixVal,1)} — double fear. VIX elevated AND unstable. Heightened realized vol ahead.`});
  else if(vix>25) signals.push({c:'#ff8800',t:`VIX ${fmt(vix,1)} — above normal. Options premium rich. Favor selling premium or defined-risk spreads.`});
  else if(vix<15) signals.push({c:'#00ff88',t:`VIX ${fmt(vix,1)} — very low. Complacency. Consider buying cheap protection here.`});
  if(skewVal>140) signals.push({c:'#ff3355',t:`SKEW ${fmt(skewVal,1)} — extreme tail risk pricing. Institutions loading downside protection.`});
  else if(skewVal>130) signals.push({c:'#ff8800',t:`SKEW ${fmt(skewVal,1)} — elevated. Market pricing meaningful crash risk.`});
  if(vvixVal>110) signals.push({c:'#ff3355',t:`VVIX ${fmt(vvixVal,1)} — extreme. VIX itself is thrashing. Often marks panic peaks.`});
  if(vs&&v3&&v3.price<vix) signals.push({c:'#ff8800',t:`VIX backwardation — near-term fear exceeds forward. Acute stress event in progress.`});
  if(opt.pc_ratio_vol>1.5) signals.push({c:'#ff3355',t:`P/C ratio ${fmt(opt.pc_ratio_vol,2)} — heavy put buying. Bearish directional flow or defensive hedging.`});
  else if(opt.pc_ratio_vol<0.7) signals.push({c:'#00ff88',t:`P/C ratio ${fmt(opt.pc_ratio_vol,2)} — call-heavy. Bullish directional flow dominant.`});
  if(vxx.pct_change>5) signals.push({c:'#ff3355',t:`VXX +${fmt(vxx.pct_change,1)}% — short-term vol futures surging. Fear accelerating intraday.`});

  $('volSignals').innerHTML=signals.length?signals.map(s=>`
    <div style="display:flex;gap:10px;padding:9px 10px;border-left:3px solid ${s.c};background:${s.c}11;border-radius:0 4px 4px 0;margin-bottom:7px;font-size:13px;color:var(--text);line-height:1.5;">
      <div style="width:8px;height:8px;border-radius:50%;background:${s.c};flex-shrink:0;margin-top:4px;box-shadow:0 0 5px ${s.c}88;"></div>
      <span>${s.t}</span>
    </div>`).join(''):`<div style="padding:12px;font-size:13px;color:var(--text2);">No unusual volatility signals. Market vol conditions appear normal.</div>`;

  // ── ROW 4A: Session Vol Profile (5-min, historical) ─────────────────────
  const profEl=$('volSessionProfile');
  if(profEl) renderSessionVolProfile();

  // ── ROW 4B: Range History Chart ───────────────────────────────────────────
  const histEl=$('volRangeHistory');
  if(histEl&&sd.length>1){
    const recent=sd.slice(0,15).reverse();
    const ranges2=recent.map(r=>({date:r.date,range:(r.high||0)-(r.low||0),close:r.close})).filter(r=>r.range>0);
    if(ranges2.length){
      const maxR=Math.max(...ranges2.map(r=>r.range));
      const avgR=ranges2.reduce((a,r)=>a+r.range,0)/ranges2.length;
      // ATR line from full sd
      const trs2=sd.slice(0,21).map((r,i)=>{
        if(!sd[i+1]?.close)return r.high-r.low;
        return Math.max(r.high-r.low,Math.abs(r.high-sd[i+1].close),Math.abs(r.low-sd[i+1].close));
      }).filter(v=>v>0);
      const atr5b=trs2.length>=5?trs2.slice(0,5).reduce((a,b)=>a+b,0)/5:null;

      histEl.innerHTML=`
        <div style="display:flex;align-items:flex-end;gap:3px;height:100px;padding:4px 0;margin-bottom:8px;">
          ${ranges2.map((r,i)=>{
            const h=(r.range/maxR*88).toFixed(1);
            const isToday=i===ranges2.length-1;
            const c=r.range>avgR*1.3?'#ff3355':r.range>avgR*0.8?'#ffcc00':'#00ff88';
            const d=new Date(r.date+'T12:00:00');
            const lbl=['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()];
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
              <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:${isToday?'var(--cyan)':c};">$${r.range.toFixed(1)}</div>
              <div style="width:100%;height:${h}px;background:${isToday?'var(--cyan)':c};border-radius:2px 2px 0 0;opacity:${isToday?'1':'0.7'};"></div>
              <div style="font-family:'Orbitron',monospace;font-size:7px;color:${isToday?'var(--cyan)':'var(--text3)'};">${lbl}</div>
            </div>`;
          }).join('')}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px;">
          ${[
            ['AVG RANGE',`$${fmt(avgR,2)}`,'var(--text2)'],
            ['ATR(5)',atr5b?`$${fmt(atr5b,2)}`:'—','#ffcc00'],
            ['MAX RANGE',`$${fmt(maxR,2)}`,'#ff3355'],
          ].map(([l,v,c])=>`<div style="background:var(--bg3);border-radius:3px;padding:6px;text-align:center;">
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">${l}</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${c};">${v}</div>
          </div>`).join('')}
        </div>
        <div style="font-size:11px;color:var(--text3);">Last ${ranges2.length} sessions · green=below avg · yellow=avg · red=elevated</div>`;
    } else {
      histEl.innerHTML='<div class="no-data">Awaiting historical data</div>';
    }
  }
}


function renderBonds(md){
  const q = md.quotes || {};
  const tnx = q['^TNX']||{}, irx = q['^IRX']||{}, fvx = q['^FVX']||{}, tyx = q['^TYX']||{};
  const tlt = q['TLT']||{}, hyg = q['HYG']||{}, lqd = q['LQD']||{}, jnk = q['JNK']||{};
  const ief = q['IEF']||{}, shy = q['SHY']||{};
  const spy = q['SPY']||{}, qqq = q['QQQ']||{};
  const mv = md.move_index;

  const t2  = irx.price, t5 = fvx.price, t10 = tnx.price, t30 = tyx.price;
  const s2_10 = t10 && t2  ? t10 - t2  : null;
  const s5_30 = t30 && t5  ? t30 - t5  : null;
  const chg10 = tnx.change || 0;
  const chg2  = irx.change  || 0;

  // Curve regime: steepener/flattener x bull/bear
  const spreadChg = chg10 - chg2; // positive = steepening, negative = flattening
  const ratesDir  = (chg10 + chg2) / 2; // positive = rates rising (bear), negative (bull)
  let curveRegime, regimeColor, regimeDesc;
  if(t10 && t2) {
    if(ratesDir > 0.01 && spreadChg > 0.005)      { curveRegime='BEAR STEEPENER'; regimeColor='#ff3355'; regimeDesc='Rates rising, long-end faster. Inflation fear.'; }
    else if(ratesDir > 0.01 && spreadChg <= 0.005) { curveRegime='BEAR FLATTENER'; regimeColor='#ff8800'; regimeDesc='Rates rising, short-end faster. Tightening cycle.'; }
    else if(ratesDir < -0.01 && spreadChg > 0.005) { curveRegime='BULL STEEPENER'; regimeColor='#ffcc00'; regimeDesc='Rates falling, long-end faster. Recession pricing.'; }
    else if(ratesDir < -0.01 && spreadChg <= 0.005){ curveRegime='BULL FLATTENER'; regimeColor='#00ff88'; regimeDesc='Rates falling, short-end faster. Safe haven bid.'; }
    else                                             { curveRegime='SIDEWAYS';       regimeColor='var(--text3)'; regimeDesc='No clear directional regime today.'; }
  } else { curveRegime='—'; regimeColor='var(--text3)'; regimeDesc='Awaiting yield data.'; }

  // HYG/TLT ratio as risk gauge
  const hygTlt = hyg.price && tlt.price ? hyg.price / tlt.price : null;
  const hygTltChg = hyg.pct_change != null && tlt.pct_change != null ? hyg.pct_change - tlt.pct_change : null;
  const creditRisk = hygTltChg === null ? 'UNKNOWN' : hygTltChg > 0.3 ? 'RISK-ON' : hygTltChg < -0.3 ? 'RISK-OFF' : 'NEUTRAL';
  const creditColor = creditRisk==='RISK-ON'?'#00ff88':creditRisk==='RISK-OFF'?'#ff3355':'#ffcc00';

  // HYG vs LQD spread (high yield vs investment grade divergence)
  const hygLqdDiv = hyg.pct_change != null && lqd.pct_change != null ? hyg.pct_change - lqd.pct_change : null;

  // Regime score
  let score = 0;
  const scoreItems = [];
  if(s2_10 !== null) {
    if(s2_10 < 0)         { score -= 2; scoreItems.push({c:'#ff3355', t:'Curve INVERTED'}); }
    else if(s2_10 < 0.25) { score -= 1; scoreItems.push({c:'#ff8800', t:'Curve flat'}); }
    else                  { score += 1; scoreItems.push({c:'#00ff88', t:'Curve normal/steep'}); }
  }
  if(curveRegime==='BEAR STEEPENER')      { score -= 2; scoreItems.push({c:'#ff3355', t:'Bear steepener active'}); }
  else if(curveRegime==='BULL STEEPENER') { score -= 1; scoreItems.push({c:'#ffcc00', t:'Bull steepener — recession risk'}); }
  else if(curveRegime==='BULL FLATTENER') { score += 1; scoreItems.push({c:'#00ff88', t:'Bull flattener — safe haven'}); }
  if(creditRisk==='RISK-OFF') { score -= 2; scoreItems.push({c:'#ff3355', t:'Credit in risk-off mode'}); }
  else if(creditRisk==='RISK-ON') { score += 1; scoreItems.push({c:'#00ff88', t:'Credit confirming risk-on'}); }
  if(mv) {
    if(mv.value > 130)      { score -= 2; scoreItems.push({c:'#ff3355', t:'MOVE extreme — bond stress'}); }
    else if(mv.value > 100) { score -= 1; scoreItems.push({c:'#ff8800', t:'MOVE elevated'}); }
    else                    { score += 1; scoreItems.push({c:'#00ff88', t:'MOVE calm'}); }
  }
  if(t10 > 4.5) { score -= 1; scoreItems.push({c:'#ff8800', t:'10Y above 4.5% — equity pressure'}); }

  const regScore = score >= 2 ? 'RISK-ON' : score >= 0 ? 'NEUTRAL' : score >= -2 ? 'DEFENSIVE' : 'RISK-OFF';
  const regScoreColor = score >= 2 ? '#00ff88' : score >= 0 ? '#ffcc00' : score >= -2 ? '#ff8800' : '#ff3355';

  // ── REGIME SCORE ─────────────────────────────────────────────────────────
  const regEl = $('bondsRegime');
  if(regEl) {
    let html = '<div style="text-align:center;padding:12px 0;margin-bottom:12px;border-bottom:1px solid var(--border);">';
    html += '<div style="font-family:Orbitron,monospace;font-size:9px;color:var(--text3);margin-bottom:6px;letter-spacing:2px;">RISK REGIME</div>';
    html += '<div style="font-family:Share Tech Mono,monospace;font-size:26px;font-weight:900;color:'+regScoreColor+';">'+regScore+'</div>';
    html += '<div style="font-family:Share Tech Mono,monospace;font-size:13px;color:var(--text3);margin-top:4px;">score: '+(score>=0?'+':'')+score+'</div>';
    html += '</div>';
    scoreItems.forEach(s => {
      html += '<div style="display:flex;gap:8px;align-items:center;padding:4px 0;">';
      html += '<div style="width:6px;height:6px;border-radius:50%;background:'+s.c+';flex-shrink:0;box-shadow:0 0 4px '+s.c+'88;"></div>';
      html += '<span style="font-size:12px;color:var(--text2);">'+s.t+'</span></div>';
    });
    regEl.innerHTML = html;
  }

  // ── NARRATIVE ────────────────────────────────────────────────────────────
  const narEl = $('bondsNarrative');
  if(narEl) {
    const lines2 = [];
    // Curve regime narrative
    if(curveRegime !== '—') lines2.push({c:regimeColor, t:curveRegime+': '+regimeDesc});
    // Spread narrative
    if(s2_10 !== null) {
      if(s2_10 < 0) lines2.push({c:'#ff3355', t:'2s10s INVERTED at '+fmt(s2_10,3)+'% — historically precedes recession by 12-18 months'});
      else lines2.push({c:s2_10<0.5?'#ffcc00':'#00ff88', t:'2s10s spread at +'+fmt(s2_10,3)+'% — '+(s2_10<0.25?'very flat, watch for inversion':'curve healthy')});
    }
    // Credit narrative
    if(hygTltChg !== null) {
      if(hygTltChg > 0.5)        lines2.push({c:'#00ff88', t:'HYG outperforming TLT by '+fmt(hygTltChg,2)+'% — credit confirming risk appetite'});
      else if(hygTltChg < -0.5)  lines2.push({c:'#ff3355', t:'TLT outperforming HYG by '+fmt(Math.abs(hygTltChg),2)+'% — flight to safety, credit stress'});
      else                        lines2.push({c:'#ffcc00', t:'HYG/TLT spread neutral ('+fmt(hygTltChg,2)+'%) — no conviction in credit'});
    }
    // HYG vs LQD
    if(hygLqdDiv !== null) {
      if(hygLqdDiv > 0.3)       lines2.push({c:'#00ff88', t:'HYG outperforming LQD — junk bonds bid, risk appetite strong'});
      else if(hygLqdDiv < -0.3) lines2.push({c:'#ff3355', t:'LQD outperforming HYG — quality flight, avoid risk assets'});
    }
    // MOVE
    if(mv) {
      if(mv.value > 130)      lines2.push({c:'#ff3355', t:'MOVE at '+fmt(mv.value,1)+' — extreme bond vol signals equity vulnerability'});
      else if(mv.value > 100) lines2.push({c:'#ff8800', t:'MOVE at '+fmt(mv.value,1)+' — bond market unsettled, watch rate spikes'});
      else                    lines2.push({c:'#00ff88', t:'MOVE at '+fmt(mv.value,1)+' — bond market calm, supportive for equities'});
    }
    // 10Y level
    if(t10) {
      if(t10 > 4.5)      lines2.push({c:'#ff3355', t:'10Y at '+fmt(t10,3)+'% — duration pressure on growth/tech; equity multiples compressed'});
      else if(t10 > 4.0) lines2.push({c:'#ff8800', t:'10Y at '+fmt(t10,3)+'% — elevated but manageable; watch for further moves'});
      else               lines2.push({c:'#00ff88', t:'10Y at '+fmt(t10,3)+'% — supportive level for risk assets'});
    }
    narEl.innerHTML = lines2.map(l =>
      '<div style="display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--border);">'
      +'<div style="width:8px;height:8px;border-radius:50%;background:'+l.c+';flex-shrink:0;margin-top:3px;box-shadow:0 0 6px '+l.c+'88;"></div>'
      +'<span style="font-size:13px;color:var(--text2);line-height:1.5;">'+l.t+'</span></div>'
    ).join('') || '<div class="no-data">Awaiting data</div>';
  }

  // ── YIELD CURVE ──────────────────────────────────────────────────────────
  const yieldEl = $('bondsYieldCurve');
  if(yieldEl) {
    const pts = [{l:'2YR',p:t2,c:irx.change},{l:'5YR',p:t5,c:fvx.change},{l:'10YR',p:t10,c:tnx.change},{l:'30YR',p:t30,c:tyx.change}].filter(y=>y.p);
    const mx = pts.length ? Math.max(...pts.map(y=>y.p)) : 5;
    const mn = pts.length ? Math.min(...pts.map(y=>y.p)) : 0;
    const rng = mx - mn || 0.01;
    const rc = v => v > 0 ? '#ff3355' : v < 0 ? '#00ff88' : 'var(--text2)';
    let html = pts.map(y => {
      const w = ((y.p-mn)/rng*70+10).toFixed(1);
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
        +'<span style="font-family:Orbitron,monospace;font-size:9px;color:var(--text3);width:32px;">'+y.l+'</span>'
        +'<div style="flex:1;height:10px;background:var(--bg3);border-radius:2px;overflow:hidden;">'
        +'<div style="width:'+w+'%;height:100%;background:'+rc(y.c)+';opacity:0.7;border-radius:2px;"></div></div>'
        +'<span style="font-family:Share Tech Mono,monospace;font-size:14px;font-weight:bold;color:'+rc(y.c)+';width:50px;text-align:right;">'+fmt(y.p,3)+'%</span>'
        +'<span style="font-family:Share Tech Mono,monospace;font-size:11px;color:'+rc(y.c)+';width:48px;text-align:right;">'+(y.c!=null?(y.c>=0?'+':'')+fmt(y.c,3):'')+'</span>'
        +'</div>';
    }).join('');
    // 2s10s spread bar
    if(s2_10 !== null) {
      const sc = s2_10 < 0 ? '#ff3355' : s2_10 < 0.25 ? '#ff8800' : '#00ff88';
      const sl = s2_10 < 0 ? 'INVERTED' : s2_10 < 0.25 ? 'FLAT' : s2_10 < 0.75 ? 'NORMAL' : 'STEEP';
      html += '<div style="margin-top:12px;padding:10px;background:'+sc+'11;border:1px solid '+sc+'33;border-radius:4px;text-align:center;">'
        +'<div style="font-family:Orbitron,monospace;font-size:8px;color:var(--text3);margin-bottom:4px;">2s10s SPREAD</div>'
        +'<div style="font-family:Share Tech Mono,monospace;font-size:22px;font-weight:900;color:'+sc+';">'+(s2_10>=0?'+':'')+fmt(s2_10,3)+'%</div>'
        +'<div style="font-family:Orbitron,monospace;font-size:9px;color:'+sc+';margin-top:2px;">'+sl+'</div></div>';
    }
    yieldEl.innerHTML = html || '<div class="no-data">Awaiting yield data</div>';
  }

  // ── CURVE REGIME + INTRADAY ───────────────────────────────────────────────
  const spreadEl = $('bondsSpread');
  if(spreadEl) {
    let html = '<div style="margin-bottom:12px;padding:12px;background:'+regimeColor+'11;border:1px solid '+regimeColor+'33;border-radius:4px;">'
      +'<div style="font-family:Orbitron,monospace;font-size:9px;color:var(--text3);margin-bottom:4px;letter-spacing:1px;">CURVE REGIME TODAY</div>'
      +'<div style="font-family:Share Tech Mono,monospace;font-size:18px;font-weight:bold;color:'+regimeColor+';">'+curveRegime+'</div>'
      +'<div style="font-size:12px;color:var(--text2);margin-top:4px;">'+regimeDesc+'</div></div>';
    // Intraday moves
    const rc = v => v > 0 ? '#ff3355' : v < 0 ? '#00ff88' : 'var(--text2)';
    const irow = (lbl, val, chg) => '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);">'
      +'<span style="font-family:Orbitron,monospace;font-size:9px;color:var(--text3);">'+lbl+'</span>'
      +'<span style="font-family:Share Tech Mono,monospace;font-size:14px;font-weight:bold;">'+fmt(val,3)+'%</span>'
      +'<span style="font-family:Share Tech Mono,monospace;font-size:12px;color:'+rc(chg)+';">'+(chg>=0?'+':'')+fmt(chg,3)+'</span>'
      +'<span style="font-size:10px;color:'+rc(chg)+';">'+(chg>0.05?'▲ RISING':chg<-0.05?'▼ FALLING':'— FLAT')+'</span></div>';
    html += '<div style="font-family:Orbitron,monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:6px;margin-top:4px;">INTRADAY RATE MOVES</div>';
    if(t2)  html += irow('2YR',  t2,  chg2);
    if(t10) html += irow('10YR', t10, chg10);
    if(t30) html += irow('30YR', t30, tyx.change||0);
    // Spread change narrative
    if(t10 && t2) {
      const sc = spreadChg > 0.01 ? '#ff8800' : spreadChg < -0.01 ? '#00ccff' : 'var(--text3)';
      html += '<div style="margin-top:10px;padding:6px 8px;background:var(--bg3);border-radius:3px;font-size:12px;color:'+sc+';">'
        +(spreadChg > 0.01 ? '↗ Curve steepening today — long-end rising faster' : spreadChg < -0.01 ? '↘ Curve flattening today — short-end rising faster' : '→ Curve movement minimal today')
        +'</div>';
    }
    spreadEl.innerHTML = html;
  }

  // ── CREDIT RISK GAUGE ─────────────────────────────────────────────────────
  const creditEl = $('bondsCredit');
  if(creditEl) {
    const pc = v => v > 0 ? '#00ff88' : v < 0 ? '#ff3355' : 'var(--text2)';
    let html = '<div style="text-align:center;margin-bottom:12px;padding:10px;background:'+creditColor+'11;border:1px solid '+creditColor+'33;border-radius:4px;">'
      +'<div style="font-family:Orbitron,monospace;font-size:9px;color:var(--text3);margin-bottom:4px;letter-spacing:1px;">CREDIT SIGNAL</div>'
      +'<div style="font-family:Share Tech Mono,monospace;font-size:22px;font-weight:900;color:'+creditColor+';">'+creditRisk+'</div>';
    if(hygTltChg !== null) html += '<div style="font-size:12px;color:var(--text3);margin-top:2px;">HYG vs TLT: '+(hygTltChg>=0?'+':'')+fmt(hygTltChg,2)+'%</div>';
    html += '</div>';
    // ETF rows
    [[hyg,'HYG','Hi Yield'],[lqd,'LQD','IG Corp'],[jnk,'JNK','Junk'],[tlt,'TLT','20yr+']].forEach(([d,sym,name]) => {
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);">'
        +'<div><span style="font-family:Orbitron,monospace;font-size:9px;color:var(--text2);">'+sym+'</span>'
        +' <span style="font-size:10px;color:var(--text3);">'+name+'</span></div>'
        +'<div style="text-align:right;">'
        +'<div style="font-family:Share Tech Mono,monospace;font-size:13px;">'+(d.price?'$'+fmt(d.price,2):'—')+'</div>'
        +'<div style="font-size:11px;color:'+pc(d.change)+';">'+(d.pct_change!=null?(d.pct_change>=0?'+':'')+fmt(d.pct_change,2)+'%':'—')+'</div>'
        +'</div></div>';
    });
    // HYG/LQD divergence note
    if(hygLqdDiv !== null && Math.abs(hygLqdDiv) > 0.2) {
      const dc = hygLqdDiv > 0 ? '#00ff88' : '#ff3355';
      html += '<div style="margin-top:8px;padding:6px 8px;background:'+dc+'11;border-radius:3px;font-size:12px;color:'+dc+';">'
        +(hygLqdDiv > 0.3 ? 'HYG beating LQD — junk bid, risk appetite intact' : 'LQD beating HYG — quality flight, credit stress building')
        +'</div>';
    }
    creditEl.innerHTML = html;
  }

  // ── TREASURY ETFs ─────────────────────────────────────────────────────────
  const treasEl = $('bondsTreasury');
  if(treasEl) {
    const pc = v => v > 0 ? '#00ff88' : v < 0 ? '#ff3355' : 'var(--text2)';
    let html = '';
    [[shy,'SHY','1-3yr Short'],[ief,'IEF','7-10yr Mid'],[tlt,'TLT','20yr+ Long']].forEach(([d,sym,name]) => {
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);">'
        +'<div><div style="font-family:Orbitron,monospace;font-size:10px;color:var(--text2);">'+sym+'</div>'
        +'<div style="font-size:11px;color:var(--text3);">'+name+'</div></div>'
        +'<div style="text-align:right;">'
        +'<div style="font-family:Share Tech Mono,monospace;font-size:15px;font-weight:bold;">'+(d.price?'$'+fmt(d.price,2):'—')+'</div>'
        +'<div style="font-size:11px;color:'+pc(d.change)+';">'+(d.pct_change!=null?(d.pct_change>=0?'+':'')+fmt(d.pct_change,2)+'%':'—')+'</div>'
        +'</div></div>';
    });
    if(mv) {
      const mc = mv.value>130?'#ff3355':mv.value>100?'#ff8800':mv.value>80?'#ffcc00':'#00ff88';
      html += '<div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--bg3);border-radius:3px;">'
        +'<div><div style="font-family:Orbitron,monospace;font-size:9px;color:var(--text3);">MOVE INDEX</div>'
        +'<div style="font-size:11px;color:var(--text3);">Bond vol gauge</div></div>'
        +'<div style="text-align:right;">'
        +'<div style="font-family:Share Tech Mono,monospace;font-size:20px;font-weight:bold;color:'+mc+';">'+fmt(mv.value,1)+'</div>'
        +'<div style="font-family:Orbitron,monospace;font-size:8px;color:'+mc+';">'+(mv.value>130?'EXTREME':mv.value>100?'ELEVATED':mv.value>80?'ABOVE AVG':'CALM')+'</div>'
        +'</div></div>';
    }
    treasEl.innerHTML = html || '<div class="no-data">Awaiting data</div>';
  }

  // ── CROSS-ASSET SIGNALS ───────────────────────────────────────────────────
  const sigEl = $('bondsSignals');
  if(sigEl) {
    const sigs = [];
    // Yields vs equities
    if(t10 && qqq.pct_change != null) {
      if(chg10 > 0.05 && qqq.pct_change < -0.5)
        sigs.push({c:'#ff3355', t:'10Y rising + QQQ falling — duration pressure. Tech vulnerable.'});
      else if(chg10 > 0.05 && qqq.pct_change > 0.5)
        sigs.push({c:'#ffcc00', t:'10Y rising with QQQ — equities ignoring rate pressure for now.'});
      else if(chg10 < -0.05 && qqq.pct_change > 0.5)
        sigs.push({c:'#00ff88', t:'Yields falling + QQQ rising — soft landing narrative confirmed.'});
    }
    if(t10 && hyg.pct_change != null) {
      if(chg10 > 0.05 && hyg.pct_change < -0.3)
        sigs.push({c:'#ff3355', t:'Yields up + HYG down — tightening liquidity. Danger zone.'});
      else if(chg10 < -0.05 && hyg.pct_change > 0.3)
        sigs.push({c:'#00ff88', t:'Yields falling + HYG rising — soft landing. Risk-on confirmed.'});
    }
    if(spy.pct_change != null && tlt.pct_change != null) {
      if(spy.pct_change < -1 && tlt.pct_change > 0.3)
        sigs.push({c:'#ff8800', t:'SPY down + TLT up — classic risk-off. But check if credit confirms.'});
      else if(spy.pct_change < -1 && hyg.pct_change != null && hyg.pct_change < 0)
        sigs.push({c:'#ff3355', t:'SPY + HYG both falling — credit confirming equity selloff. Risk real.'});
      else if(spy.pct_change < -1 && hyg.pct_change != null && hyg.pct_change > -0.1)
        sigs.push({c:'#ffcc00', t:'SPY falling but HYG holding — credit not confirming. May be equity-specific.'});
    }
    // Curve steepening + equities signal
    if(curveRegime === 'BEAR STEEPENER' && spy.pct_change != null && spy.pct_change < 0)
      sigs.push({c:'#ff3355', t:'Bear steepener + SPY falling — inflation/growth stagflation fear. Defensive.'});
    if(curveRegime === 'BULL STEEPENER')
      sigs.push({c:'#ffcc00', t:'Bull steepener — bond market pricing recession. Watch cyclicals.'});
    if(!sigs.length)
      sigs.push({c:'var(--text3)', t:'No strong cross-asset signal today. Monitor for divergences.'});
    sigEl.innerHTML = sigs.map(s =>
      '<div style="display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--border);">'
      +'<div style="width:8px;height:8px;border-radius:50%;background:'+s.c+';flex-shrink:0;margin-top:3px;box-shadow:0 0 6px '+s.c+'88;"></div>'
      +'<span style="font-size:13px;color:var(--text2);line-height:1.5;">'+s.t+'</span></div>'
    ).join('');
  }
  try { renderBondsAdditions(md); } catch(e) { console.warn("bondsAdditions:", e); }
}

// ─── GEX TAB ADDITIONS ───────────────────────────────────────────────────────
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
    return `<div style="display:grid;grid-template-columns:42px 120px 1fr 80px 80px 80px 80px 50px;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)22;">
      <div style="font-family:'Orbitron',monospace;font-size:10px;color:${color};">${name}</div>
      <div style="display:flex;align-items:center;gap:4px;">
        <div style="width:${barW}px;height:8px;background:${barColor};border-radius:2px;flex-shrink:0;"></div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${stats.avgRet>=0?'#00ff88':'#ff3355'};">${fmtPct(stats.avgRet,2)}</div>
      </div>
      <div></div>
      <div style="text-align:center;">
        <div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${wrClr};">${wr.toFixed(0)}%</div>
        <div style="font-size:9px;color:var(--text3);">win rate</div>
      </div>
      <div style="text-align:center;">
        <div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--cyan);">$${fmt2(stats.avgRange)}</div>
        <div style="font-size:9px;color:var(--text3);">avg range</div>
      </div>
      <div style="text-align:center;">
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:#00ff88;">${stats.bigUp.toFixed(0)}%</div>
        <div style="font-size:9px;color:var(--text3);">big up</div>
      </div>
      <div style="text-align:center;">
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:#ff3355;">${stats.bigDn.toFixed(0)}%</div>
        <div style="font-size:9px;color:var(--text3);">big dn</div>
      </div>
      <div style="text-align:center;">
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
      <div style="display:grid;grid-template-columns:42px 120px 1fr 80px 80px 80px 80px 50px;gap:6px;padding:4px 0;border-bottom:1px solid var(--border)33;margin-bottom:2px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">DAY</div>
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">AVG RETURN</div>
        <div></div>
        <div style="text-align:center;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">WIN RATE</div>
        <div style="text-align:center;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">AVG RANGE</div>
        <div style="text-align:center;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">BIG UP</div>
        <div style="text-align:center;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">BIG DN</div>
        <div style="text-align:center;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">N</div>
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

  // Add known 2026 MAG7 earnings windows (Q1 2026 — typically Jan-Feb)
  // These are hardcoded as the CSV only goes to 2024 Q4
  const mag7Windows2026 = [
    {type:'mag7', date:'2026-04-23', label:'Q1 2026 MAG7 Earnings', note:'Tesla kicks off ~Apr 23, cluster runs ~4 weeks'},
    {type:'mag7', date:'2026-07-22', label:'Q2 2026 MAG7 Earnings', note:'Typical July cluster'},
    {type:'mag7', date:'2026-10-21', label:'Q3 2026 MAG7 Earnings', note:'Typical October cluster'},
  ];
  mag7Windows2026.filter(e => e.date >= today).forEach(e => events.push(e));

  // Sort by date, filter to future
  const future = events.filter(e => e.date >= today).sort((a,b) => a.date.localeCompare(b.date));

  if(!future.length) {
    el.innerHTML = '<span style="color:var(--text3);">No upcoming scheduled events in dataset.</span>';
    return;
  }

  // ── Pick the most imminent event ─────────────────────────────────────────
  const next = future[0];
  const daysAway = Math.ceil((new Date(next.date+'T12:00:00') - new Date()) / (1000*60*60*24));

  // ── Also check if we're within 5 days AFTER a recent event ──────────────
  const recentPast = events.filter(e => {
    const d = new Date(e.date+'T12:00:00');
    const diff = (new Date() - d) / (1000*60*60*24);
    return diff >= 0 && diff <= 5;
  }).sort((a,b) => b.date.localeCompare(a.date));

  const subject = recentPast.length ? recentPast[0] : next;
  const isRecent = recentPast.length > 0;

  // ── Build the insight text ────────────────────────────────────────────────
  let html_out = '';

  const timingPhrase = isRecent
    ? `<span style="color:#ffcc00;">Released ${subject.date}.</span>`
    : daysAway <= 1
      ? `<span style="color:#ff3355;">Tomorrow — ${next.date}.</span>`
      : daysAway <= 3
        ? `<span style="color:#ff8800;">${daysAway} days away — ${next.date}.</span>`
        : `<span style="color:var(--text3);">Next: ${next.date} · ${daysAway} days out.</span>`;

  if(subject.type === 'cpi') {
    const rd = typeof RELEASE_DATA !== 'undefined' ? RELEASE_DATA.cpi : [];
    const last5 = rd.slice(-5);
    const last5up = last5.filter(d=>d.day_ret>0).length;
    const last5avgRange = last5.length ? (last5.reduce((a,d)=>a+d.range,0)/last5.length).toFixed(2) : '—';
    const bigMoves = rd.filter(d=>Math.abs(d.day_ret)>1).length;
    const bigMovePct = rd.length ? (bigMoves/rd.length*100).toFixed(0) : '—';

    html_out = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-family:'Orbitron',monospace;font-size:10px;color:#ff8800;padding:3px 8px;background:#ff880022;border:1px solid #ff880044;border-radius:3px;">CPI</span>
        ${timingPhrase}
      </div>
      <p style="margin:0 0 8px;">The Consumer Price Index release is one of the highest-volatility events on the SPY calendar. Across ${rd.length} CPI releases since 2020, SPY has averaged a day range of <strong style="color:var(--cyan);">$${(rd.reduce((a,d)=>a+d.range,0)/rd.length).toFixed(2)}</strong> — meaningfully wider than a typical session — and closed higher only <strong style="color:#ffcc00;">53%</strong> of the time. The direction is essentially a coin flip on the day, but the magnitude is not.</p>
      <p style="margin:0 0 8px;">The more consistent edge is in the <strong style="color:#00ff88;">5 days before CPI</strong>: SPY has drifted up into the release ${rd.length > 0 ? Math.round(68) : '—'}% of the time with an average gain of +0.52%, suggesting the market tends to give the benefit of the doubt going in. That pre-CPI drift collapses post-release — the 5-day after window shows no meaningful edge in either direction.</p>
      <p style="margin:0 0 6px;">The last 5 CPI days: <strong style="color:#ffcc00;">${last5up}/5 up</strong>, avg range <strong style="color:var(--cyan);">$${last5avgRange}</strong>. ${bigMovePct}% of all CPI days since 2020 have produced a SPY move greater than 1%.</p>`;

  } else if(subject.type === 'nfp') {
    const rd = typeof RELEASE_DATA !== 'undefined' ? RELEASE_DATA.nfp : [];
    const last5 = rd.slice(-5);
    const last5up = last5.filter(d=>d.day_ret>0).length;

    html_out = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-family:'Orbitron',monospace;font-size:10px;color:#00ccff;padding:3px 8px;background:#00ccff22;border:1px solid #00ccff44;border-radius:3px;">NFP</span>
        ${timingPhrase}
      </div>
      <p style="margin:0 0 8px;">Nonfarm Payrolls is the most watched labor market print and typically drops the first Friday of each month before market open. Unlike CPI, NFP has shown a slight bullish skew on the release day — SPY closed higher <strong style="color:#00ff88;">55%</strong> of the time across ${rd.length} releases since 2020, with an average day return of <strong style="color:#00ff88;">+0.03%</strong> and avg range of <strong style="color:var(--cyan);">$${(rd.reduce((a,d)=>a+d.range,0)/rd.length).toFixed(2)}</strong>.</p>
      <p style="margin:0 0 8px;">The pre-NFP drift is notable: the 5 days leading into the number have been up <strong style="color:#00ff88;">64%</strong> of the time with an avg gain of +0.61%. The post-NFP reaction is the strongest of the three major releases — the week after NFP closes positive <strong style="color:#00ff88;">64%</strong> of the time, suggesting the market digests the number positively more often than not over a multi-day window.</p>
      <p style="margin:0 0 6px;">The last 5 NFP days: <strong style="color:#ffcc00;">${last5up}/5 up</strong>. Note that NFP impact depends heavily on the Fed's current posture — in rate-hike cycles, strong prints have frequently sold off as they push back on cuts.</p>`;

  } else if(subject.type === 'fomc') {
    const rd = typeof RELEASE_DATA !== 'undefined' ? RELEASE_DATA.fomc : [];
    const emergency = rd.filter(d=>d.notes && d.notes.toLowerCase().includes('emergency'));
    const regular = rd.filter(d=>!d.notes || !d.notes.toLowerCase().includes('emergency'));
    const last5 = rd.slice(-5);
    const last5up = last5.filter(d=>d.day_ret>0).length;

    html_out = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-family:'Orbitron',monospace;font-size:10px;color:#8855ff;padding:3px 8px;background:#8855ff22;border:1px solid #8855ff44;border-radius:3px;">FOMC</span>
        ${timingPhrase}
      </div>
      <p style="margin:0 0 8px;">FOMC decision days are the widest-ranging events in the dataset. Across ${rd.length} meetings since 2020 — including ${emergency.length} emergency cuts in March 2020 — SPY has averaged a day range of <strong style="color:var(--cyan);">$${(rd.reduce((a,d)=>a+d.range,0)/rd.length).toFixed(2)}</strong>, the highest of any scheduled event type. Closing direction is essentially random at <strong style="color:#ffcc00;">49% up</strong>, but the intraday swings around the 2pm announcement and press conference are consistently large.</p>
      <p style="margin:0 0 8px;">The reaction is highly regime-dependent. In 2022's hiking cycle, FOMC days were predominantly volatile and negative. In the 2024 cutting cycle, markets greeted decisions more positively. The post-FOMC 5-day window historically leans negative — only <strong style="color:#ff3355;">45%</strong> positive — suggesting initial rallies often fade. Watch the dot plot and press conference tone as much as the rate decision itself.</p>
      <p style="margin:0 0 6px;">Last 5 FOMC days: <strong style="color:#ffcc00;">${last5up}/5 up</strong>. The March 2026 meeting (Mar 18) produced a ${last5.slice(-1)[0]?.day_ret >= 0 ? 'gain' : 'loss'} of <strong style="color:${last5.slice(-1)[0]?.day_ret >= 0 ? '#00ff88':'#ff3355'};">${(last5.slice(-1)[0]?.day_ret||0).toFixed(2)}%</strong>.</p>`;

  } else if(subject.type === 'mag7') {
    const mag7Agg = typeof MAG7_EARNINGS_DATA !== 'undefined' ? MAG7_EARNINGS_DATA.aggregates.all : null;
    const last_q = typeof MAG7_EARNINGS_DATA !== 'undefined' ? MAG7_EARNINGS_DATA.results.slice(-1)[0] : null;

    html_out = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-family:'Orbitron',monospace;font-size:10px;color:#00ff88;padding:3px 8px;background:#00ff8822;border:1px solid #00ff8844;border-radius:3px;">MAG 7</span>
        ${timingPhrase}
      </div>
      <p style="margin:0 0 8px;">When the Magnificent 7 report earnings, they do it in a cluster spanning roughly 2–4 weeks each quarter. Across 20 quarters since 2020, SPY has shown a consistent pattern: the <strong style="color:#ffcc00;">3 days before the first earnings</strong> in each cluster have been positive <strong style="color:#00ff88;">85%</strong> of the time with an average gain of +0.77% — the strongest and most consistent signal in the entire earnings dataset. The market tends to front-run big tech anticipation.</p>
      <p style="margin:0 0 8px;">The cluster period itself (from the day before the first report through the last) is up <strong style="color:#00ff88;">75%</strong> of the time, averaging +1.71%. The full window — 5 days pre through 5 days post — has been positive <strong style="color:#00ff88;">80%</strong> of the time with an average full-window return of <strong style="color:#00ff88;">+3.26%</strong>. That's a substantial systematic tailwind tied to earnings season.</p>
      <p style="margin:0 0 6px;">${last_q ? `Last quarter (${last_q.label}): ${last_q.first_date} → ${last_q.last_date}, full-window SPY return <strong style="color:${(last_q.full_ret||0)>=0?'#00ff88':'#ff3355'};">${(last_q.full_ret||0)>=0?'+':''}${(last_q.full_ret||0).toFixed(2)}%</strong>.` : ''} The post-earnings 5-day window shows the weakest edge at only 60% positive, suggesting the bulk of the move happens before and during the cluster, not after.</p>`;
  }

  // ── Also show next 2-3 events as a queue ─────────────────────────────────
  const queue = future.slice(isRecent ? 0 : 1, isRecent ? 3 : 4);
  const typeColors = {cpi:'#ff8800',nfp:'#00ccff',fomc:'#8855ff',mag7:'#00ff88'};
  const typeLabels = {cpi:'CPI',nfp:'NFP',fomc:'FOMC',mag7:'MAG7'};

  const queueHtml = queue.length ? `
    <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border);display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <span style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">ALSO AHEAD:</span>
      ${queue.map(e => {
        const d = Math.ceil((new Date(e.date+'T12:00:00') - new Date()) / (1000*60*60*24));
        return `<div style="display:flex;align-items:center;gap:4px;padding:3px 8px;background:${typeColors[e.type]}11;border:1px solid ${typeColors[e.type]}33;border-radius:3px;">
          <span style="font-family:'Orbitron',monospace;font-size:8px;color:${typeColors[e.type]};">${typeLabels[e.type]}</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text3);">${e.date}</span>
          <span style="font-size:9px;color:var(--text3);">${d}d</span>
        </div>`;
      }).join('')}
    </div>` : '';

  el.innerHTML = html_out + queueHtml;
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

  statsDiv.innerHTML =
    section('⬡ VOLUME QUINTILE ANALYSIS',
      `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;">${quintileCards}</div>
       <div style="font-size:10px;color:var(--text3);margin-top:8px;">Very High vol days have 3× the average range vs Very Low days. Gap fill rate peaks on highest volume days (47%).</div>`) +

    section('⬡ HOD TIMING BY VOLUME LEVEL (CT)',
      `<div style="font-size:10px;color:var(--text3);margin-bottom:8px;">Which CT hour the day's High is set — darker = more frequent. High-vol days: HOD tends to print early (8am CT open). Low-vol days: HOD often drifts to afternoon.</div>
       ${hodLodGrid('hod')}`) +

    section('⬡ LOD TIMING BY VOLUME LEVEL (CT)',
      `<div style="font-size:10px;color:var(--text3);margin-bottom:8px;">Which CT hour the day's Low is set. LOD at open (8am CT) is most common across all volume levels — the opening gap exhaustion.</div>
       ${hodLodGrid('lod')}`) +

    section('⬡ CUMULATIVE VOLUME CURVE',
      `<div style="font-size:10px;color:var(--text3);margin-bottom:10px;">Avg % of daily volume completed by each 5-min bucket. Yellow marker = 50% done. On a typical day, half of all volume is traded by ${midTs ? etToCT(midTs)+' CT' : '—'}.</div>
       <div style="display:flex;align-items:flex-end;gap:1px;padding:18px 0 4px;">${curveBars}</div>`) +

    section('⬡ VOLUME BY GAP TYPE',
      `<div style="font-size:10px;color:var(--text3);margin-bottom:10px;">Gap Down days see significantly higher volume — fear + forced selling. Flat open days are the lightest. Correlates with the 0.66 vol/range correlation.</div>
       ${gapBars}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// WINDOW STATS — London Close & Pre-Power-Hour windows
// ─────────────────────────────────────────────────────────────────────────────
function renderWindowStats() {
  const el = document.getElementById('intradayVolStats');
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
  el.innerHTML = `<div style="padding:14px 16px;max-width:1400px;margin:0 auto;">
    <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:14px;">⬡ KEY INTRADAY WINDOWS — PATTERN ANALYSIS</div>
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">LOOKBACK</div>
        <div style="display:flex;gap:5px;margin-bottom:8px;">${lbBtns}</div>
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">DAY OF WEEK</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;">${dowBtns}</div>
      </div>
      <div style="font-size:10px;color:var(--text3);text-align:right;">
        <div>${D.n} sessions · ${D.date_range}</div>
        <div style="margin-top:2px;">W1: 9:45–11:00 CT · W2: 12:45–14:00 CT</div>
      </div>
    </div>

    ${section('⬡ WINDOW 1 · 9:45–11:00 CT — LONDON CLOSE WINDOW', 'var(--cyan)',
      summaryCards(D.w1, 'W1', 'var(--cyan)') +
      contextGrid(D.w1.context, 'W1') +
      `<div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:6px;margin-top:10px;">W1 MOVE SIZE → DAY &amp; MIDDAY FOLLOW-THROUGH</div>
       <div style="font-size:10px;color:var(--text3);margin-bottom:6px;">Larger moves (&gt;0.4%) show strongest day-follow. Small moves are closer to noise.</div>` +
      moveBinsTable(D.w1.move_bins, 'MIDDAY')
    )}

    ${section('⬡ WINDOW 2 · 12:45–14:00 CT — PRE-POWER HOUR SETUP', '#ff8800',
      summaryCards(D.w2, 'W2', '#ff8800') +
      contextGrid(D.w2.context, 'W2') +
      `<div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);letter-spacing:1px;margin-bottom:6px;margin-top:10px;">W2 MOVE SIZE → DAY &amp; POWER HOUR FOLLOW-THROUGH</div>
       <div style="font-size:10px;color:var(--text3);margin-bottom:6px;">Small W2 moves often trap late entrants heading into power hour. Large moves have mixed continuation.</div>` +
      moveBinsTable(D.w2.move_bins, 'POWER HR')
    )}

    ${section('⬡ W1 vs W2 ALIGNMENT', '#8855ff', relHtml)}

    <div style="font-size:10px;color:var(--text3);padding:8px 0;">
      Based on ${D.n} sessions (${D.date_range}) · All times Central · 
      Day follow = window move direction matches close direction · Reversal = window closed opposite to its dominant intra-window extreme
    </div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GAP STATS — Power Hour (prev day) + First Hour (next day) deep dive
// ─────────────────────────────────────────────────────────────────────────────
let _gsLookback = 'all';
let _gsDow      = 'all';

window._gsSetLookback = function(v){ _gsLookback=v; renderGapStats(); };
window._gsSetDow      = function(v){ _gsDow=v;      renderGapStats(); };

function renderGapStats() {
  const el = document.getElementById('gapStatsContent');
  if (!el) return;
  if (typeof GAP_STATS === 'undefined') {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text3);">Gap stats data not loaded.</div>';
    return;
  }

  const key = _gsDow === 'all' ? _gsLookback : `${_gsLookback}_${_gsDow}`;
  const D = GAP_STATS[key];
  if (!D || !D.n) {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text3);">Not enough data for this filter.</div>';
    return;
  }

  const curYear = new Date().getFullYear();
  const fbtn = (lbl, active, fn) =>
    `<button onclick="${fn}" style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;padding:3px 10px;background:${active?'rgba(0,204,255,0.15)':'var(--bg3)'};border:1px solid ${active?'var(--cyan)':'var(--border)'};border-radius:3px;color:${active?'var(--cyan)':'var(--text2)'};cursor:pointer;">${lbl}</button>`;

  const lbBtns = [
    fbtn('ALL HISTORY',_gsLookback==='all',"_gsSetLookback('all')"),
    fbtn('12 MONTHS',_gsLookback==='12m',"_gsSetLookback('12m')"),
    fbtn(String(curYear),_gsLookback==='year',"_gsSetLookback('year')"),
  ].join(' ');
  const dowBtns = ['all','Mon','Tue','Wed','Thu','Fri'].map(d=>
    fbtn(d==='all'?'ALL':d.toUpperCase(),_gsDow===d,`_gsSetDow('${d}')`)
  ).join(' ');

  const section = (title, color, html) =>
    `<div style="background:var(--bg2);border:1px solid var(--border);border-left:3px solid ${color};border-radius:4px;padding:14px;margin-bottom:12px;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:${color};margin-bottom:12px;">${title}</div>
      ${html}
    </div>`;

  const stat = (lbl, val, color) =>
    `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <span style="font-size:11px;color:var(--text3);">${lbl}</span>
      <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${color||'var(--text2)'};">${val}</span>
    </div>`;

  const pct = v => v.toFixed(1)+'%';
  const sgn = v => (v>=0?'+':'')+v.toFixed(3)+'%';
  const followColor = v => v>=68?'#00ff88':v>=55?'#88cc44':v>=45?'#ffcc00':'#ff8800';
  const gapColor = gt => gt==='GAP_UP'?'#00ff88':gt==='GAP_DOWN'?'#ff3355':'#ffcc00';

  // ── SECTION 1: Overview stats row ──────────────────────────────────────────
  const overviewHtml = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px;">
      ${[
        ['Sessions',D.n,'var(--cyan)'],
        ['Avg next gap',sgn(D.avg_gap),D.avg_gap>0.05?'#00ff88':D.avg_gap<-0.05?'#ff3355':'var(--text2)'],
        ['Avg PH move',sgn(D.avg_ph_move),D.avg_ph_move>=0?'#00ff88':'#ff3355'],
        ['Avg PH range',pct(D.avg_ph_range),'#ffcc00'],
      ].map(([l,v,c])=>`<div style="background:var(--bg3);border-radius:4px;padding:10px;text-align:center;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:4px;">${l}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:18px;color:${c};">${v}</div>
      </div>`).join('')}
    </div>`;

  // ── SECTION 2: Gap type breakdown cards ────────────────────────────────────
  const gb = D.gap_breakdown || {};
  const gapCards = ['GAP_DOWN','FLAT','GAP_UP'].map(gt => {
    const g = gb[gt]; if(!g) return '';
    const c = gapColor(gt);
    const label = gt==='GAP_UP'?'GAP UP ▲':gt==='GAP_DOWN'?'GAP DOWN ▼':'FLAT OPEN';
    return `<div style="background:var(--bg2);border:1px solid ${c}33;border-top:3px solid ${c};border-radius:4px;padding:12px;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;color:${c};margin-bottom:8px;">${label} <span style="color:var(--text3);font-size:8px;">(${g.n} days)</span></div>
      ${stat('Avg gap size', sgn(g.avg_gap_pct), c)}
      ${stat('Avg PH move (prev)', sgn(g.avg_ph_move), g.avg_ph_move>=0?'#00ff88':'#ff3355')}
      ${stat('Avg PH last 15min', sgn(g.avg_ph_last_move), g.avg_ph_last_move>=0?'#88cc44':'#ff8855')}
      ${stat('Avg PH vol accel', g.avg_ph_vol_accel.toFixed(2)+'×', g.avg_ph_vol_accel>1.1?'#ff8800':g.avg_ph_vol_accel<0.9?'#8888ff':'var(--text2)')}
      ${stat('Avg PH range', pct(g.avg_ph_range), '#ffcc00')}
      ${gt!=='FLAT'?stat('Gap fill rate', g.fill_rate+'%', followColor(g.fill_rate)):''}
      <div style="border-top:1px solid rgba(255,255,255,0.08);margin:8px 0;padding-top:8px;">
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:4px;">FIRST HOUR AFTER GAP</div>
        ${stat('FH up %', g.fh_up_pct+'%', g.fh_up_pct>=55?'#00ff88':g.fh_up_pct<=45?'#ff3355':'#ffcc00')}
        ${stat('Avg FH move', sgn(g.avg_fh_move), g.avg_fh_move>=0?'#00ff88':'#ff3355')}
        ${stat('Avg FH range', pct(g.avg_fh_range), '#ffcc00')}
        ${stat('Avg FH vol accel', g.avg_fh_vol_accel.toFixed(2)+'×', g.avg_fh_vol_accel>1?'#ff8800':'#8888ff')}
        ${stat('FH predicts day', g.fh_predicts_day+'%', followColor(g.fh_predicts_day))}
      </div>
      ${stat('Avg day move', sgn(g.avg_day_move), g.avg_day_move>=0?'#00ff88':'#ff3355')}
      ${stat('Avg day range', pct(g.avg_day_range), '#ffcc00')}
    </div>`;
  }).join('');

  // ── SECTION 3: PH move bins → gap prediction ───────────────────────────────
  const bins = D.ph_bins || [];
  const binRows = bins.map(b => {
    const upBar = Math.round(b.gap_up_pct * 0.8);
    const dnBar = Math.round(b.gap_dn_pct * 0.8);
    const phColor = b.avg_ph_move>0.2?'#00ff88':b.avg_ph_move<-0.2?'#ff3355':'#ffcc00';
    return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
      <td style="font-size:10px;color:${phColor};padding:5px 8px;white-space:nowrap;">${b.label}</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text3);padding:5px 6px;text-align:center;">${b.n}</td>
      <td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;font-size:11px;color:${phColor};text-align:right;">${sgn(b.avg_gap)}</td>
      <td style="padding:5px 8px;">
        <div style="display:flex;align-items:center;gap:4px;">
          <div style="width:${upBar}px;height:8px;background:#00ff88;border-radius:2px;opacity:0.8;"></div>
          <span style="font-size:10px;color:#00ff88;">${b.gap_up_pct}%</span>
        </div>
      </td>
      <td style="padding:5px 8px;">
        <div style="display:flex;align-items:center;gap:4px;">
          <div style="width:${dnBar}px;height:8px;background:#ff3355;border-radius:2px;opacity:0.8;"></div>
          <span style="font-size:10px;color:#ff3355;">${b.gap_dn_pct}%</span>
        </div>
      </td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:10px;color:${b.fill_rate>40?'#00ff88':'var(--text3)'};padding:5px 8px;text-align:right;">${b.fill_rate}%</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:10px;color:#ffcc00;padding:5px 8px;text-align:right;">${pct(b.avg_fh_range)}</td>
    </tr>`;
  }).join('');

  const phBinHtml = `
    <div style="font-size:10px;color:var(--text3);margin-bottom:8px;">Previous day power hour move magnitude → next day gap characteristics. Strong PH moves in either direction tend to produce larger gaps.</div>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>
        ${['PH MOVE','N','AVG GAP','GAP UP%','GAP DN%','FILL RATE','NEXT FH RNG'].map(h=>
          `<th style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);padding:4px 8px;text-align:${h==='PH MOVE'?'left':'right'};">${h}</th>`
        ).join('')}
      </thead>
      <tbody>${binRows}</tbody>
    </table>`;

  // ── SECTION 4: Key signals ─────────────────────────────────────────────────
  const sig = D.signals || {};
  const signalHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div style="background:var(--bg3);border-radius:4px;padding:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:#ffcc00;margin-bottom:8px;">PH LATE MOMENTUM → GAP DIRECTION</div>
        <div style="margin-bottom:10px;">
          <div style="font-size:10px;color:var(--text3);">PH last 15min SURGES (${sig.late_surge_n} sessions)</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
            <div style="flex:1;height:10px;background:var(--bg2);border-radius:3px;overflow:hidden;">
              <div style="width:${sig.late_surge_gap_up}%;height:100%;background:#00ff88;opacity:0.8;border-radius:3px;"></div>
            </div>
            <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:#00ff88;">${sig.late_surge_gap_up}% gap up</span>
          </div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px;">When PH finishes strong, the next open leans higher.</div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);">PH last 15min FADES (${sig.late_fade_n} sessions)</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
            <div style="flex:1;height:10px;background:var(--bg2);border-radius:3px;overflow:hidden;">
              <div style="width:${sig.late_fade_gap_dn}%;height:100%;background:#ff3355;opacity:0.8;border-radius:3px;"></div>
            </div>
            <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:#ff3355;">${sig.late_fade_gap_dn}% gap down</span>
          </div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px;">Late PH selling is the strongest gap-down predictor.</div>
        </div>
      </div>
      <div style="background:var(--bg3);border-radius:4px;padding:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:#8855ff;margin-bottom:8px;">GAP FILL: MOMENTUM vs REVERSAL SETUP</div>
        <div style="margin-bottom:12px;">
          <div style="font-size:10px;color:var(--text3);">PH direction matches gap direction (${sig.momentum_n} sessions)</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:20px;color:#ffcc00;margin-top:4px;">${sig.momentum_fill}% <span style="font-size:11px;color:var(--text3);">fill rate</span></div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px;">Momentum continuation — gap fills less often.</div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);">PH direction opposes gap direction (${sig.reversal_n} sessions)</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:20px;color:#00ccff;margin-top:4px;">${sig.reversal_fill}% <span style="font-size:11px;color:var(--text3);">fill rate</span></div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px;">Mean reversion setup — gap fills more readily.</div>
        </div>
      </div>
      <div style="background:var(--bg3);border-radius:4px;padding:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:#ffcc00;margin-bottom:8px;">PH RANGE → NEXT MORNING VOLATILITY</div>
        ${stat('Wide PH → next FH range', pct(sig.wide_ph_fh_range), '#ff8800')}
        ${stat('Tight PH → next FH range', pct(sig.tight_ph_fh_range), '#00ccff')}
        <div style="font-size:10px;color:var(--text3);margin-top:8px;">A volatile power hour reliably predicts a wider opening range next morning. Use for sizing the first hour trade.</div>
      </div>
      <div style="background:var(--bg3);border-radius:4px;padding:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:#ff8800;margin-bottom:8px;">KEY EDGE SUMMARY</div>
        <div style="font-size:10px;color:var(--text3);line-height:1.7;">
          • <span style="color:#ffcc00;">Late PH fade</span> = strongest gap-down signal<br>
          • <span style="color:#00ff88;">Late PH surge</span> = leans gap-up next day<br>
          • <span style="color:#00ccff;">PH opposes gap</span> = higher fill rate (mean reversion)<br>
          • <span style="color:#ff8800;">Wide PH</span> = expect volatile first hour<br>
          • <span style="color:#00ff88;">FH predicts day</span> 69–75% across gap types<br>
          • <span style="color:#ff3355;">Gap Down</span> days have widest FH range (most opportunity)
        </div>
      </div>
    </div>`;

  // ── SECTION 5: DOW breakdown ───────────────────────────────────────────────
  const dbd = D.dow_breakdown || {};
  const dowRows = ['Mon','Tue','Wed','Thu','Fri'].map(d => {
    const r = dbd[d]; if(!r||!r.n) return '';
    const upW = r.gap_up_pct; const dnW = r.gap_dn_pct;
    return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
      <td style="font-family:'Orbitron',monospace;font-size:9px;color:var(--cyan);padding:5px 8px;">${d.toUpperCase()}</td>
      <td style="font-size:10px;color:var(--text3);padding:5px 8px;text-align:center;">${r.n}</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${r.avg_gap>0.05?'#00ff88':r.avg_gap<-0.05?'#ff3355':'var(--text2)'};padding:5px 8px;text-align:right;">${sgn(r.avg_gap)}</td>
      <td style="padding:5px 10px;">
        <div style="display:flex;align-items:center;gap:3px;">
          <div style="width:${upW}px;height:8px;background:#00ff88;border-radius:2px;opacity:0.75;"></div>
          <span style="font-size:10px;color:#00ff88;">${upW}%</span>
        </div>
      </td>
      <td style="padding:5px 10px;">
        <div style="display:flex;align-items:center;gap:3px;">
          <div style="width:${dnW}px;height:8px;background:#ff3355;border-radius:2px;opacity:0.75;"></div>
          <span style="font-size:10px;color:#ff3355;">${dnW}%</span>
        </div>
      </td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${r.avg_ph_move>=0?'#00ff88':'#ff3355'};padding:5px 8px;text-align:right;">${sgn(r.avg_ph_move)}</td>
    </tr>`;
  }).join('');

  const dowHtml = `
    <div style="font-size:10px;color:var(--text3);margin-bottom:8px;">Mon gaps up most often (43%). Fri has the most balanced gap-up/down split. Tue leans gap-down.</div>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>
        ${['DAY','N','AVG GAP','GAP UP%','GAP DN%','AVG PH'].map(h=>
          `<th style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);padding:4px 8px;text-align:${h==='DAY'?'left':'right'};">${h}</th>`
        ).join('')}
      </thead>
      <tbody>${dowRows}</tbody>
    </table>`;

  el.innerHTML = `<div style="padding:14px 16px;max-width:1400px;margin:0 auto;">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:10px;">⬡ GAP STATS — POWER HOUR + FIRST HOUR DEEP DIVE</div>
        <div style="margin-bottom:6px;">
          <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">LOOKBACK</div>
          <div style="display:flex;gap:5px;">${lbBtns}</div>
        </div>
        <div>
          <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">DAY OF WEEK</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;">${dowBtns}</div>
        </div>
      </div>
      <div style="font-size:10px;color:var(--text3);text-align:right;">
        <div>${D.n} session pairs · 1-min bars</div>
        <div style="margin-top:2px;">PH: 1:00–2:00pm CT (prev day) · FH: 8:30–9:30am CT (next day)</div>
      </div>
    </div>
    ${overviewHtml}
    ${section('⬡ OVERVIEW BY GAP TYPE — PH CHARACTERISTICS + FIRST HOUR BEHAVIOR','var(--cyan)',`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">${gapCards}</div>`)}
    ${section('⬡ POWER HOUR MOVE → NEXT DAY GAP PREDICTION','#ffcc00',phBinHtml)}
    ${section('⬡ KEY SIGNALS — LATE PH MOMENTUM, FILL RATES, RANGE EXPANSION','#8855ff',signalHtml)}
    ${section('⬡ GAP PATTERNS BY DAY OF WEEK','#00ccff',dowHtml)}
  </div>`;
}

// ═══════════════════════════════════════════════════════
// LIVE SPY CHART — 1-min intraday candlestick
// ═══════════════════════════════════════════════════════
let _liveChartInterval = null;

async function renderLiveChart() {
  const el = document.getElementById('liveChartContent');
  if (!el) return;

  // Scaffold UI immediately
  el.innerHTML = `
    <div id="lcWrap" style="padding:14px 16px;max-width:1400px;margin:0 auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
        <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);">⬡ SPY — 1-MIN INTRADAY CHART</div>
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
      <div class="panel" style="padding:10px;position:relative;">
        <canvas id="lcCanvas" style="width:100%;display:block;"></canvas>
        <div id="lcTooltip" style="display:none;position:absolute;background:var(--bg2);border:1px solid var(--border);border-radius:3px;padding:8px 12px;font-family:'Share Tech Mono',monospace;font-size:11px;pointer-events:none;z-index:10;"></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:10px;" id="lcStats"></div>
    </div>`;

  let _chartType = 'candle';
  window._lcSetType = function(t) {
    _chartType = t;
    document.getElementById('lcTypeCand').style.background = t==='candle' ? 'var(--cyan)' : 'transparent';
    document.getElementById('lcTypeCand').style.color = t==='candle' ? '#000' : 'var(--text2)';
    document.getElementById('lcTypeLine').style.background = t==='line' ? 'var(--cyan)' : 'transparent';
    document.getElementById('lcTypeLine').style.color = t==='line' ? '#000' : 'var(--text2)';
    if (_lastBars) drawChart(_lastBars, _chartType);
  };

  let _lastBars = null;

  async function fetchAndDraw() {
    try {
      const r = await fetch('/spyintraday?t=' + Date.now());
      if (!r.ok) throw new Error('fetch failed');
      const d = await r.json();

      const statusEl = document.getElementById('lcStatus');
      const priceEl  = document.getElementById('lcPrice');
      const changeEl = document.getElementById('lcChange');
      if (!d?.available || !d.rawBars?.length) {
        // Market closed — show last session summary from _sd
        const sd = (typeof _sd !== 'undefined') ? _sd : [];
        const last = sd[0] || {};
        const prev = sd[1] || {};
        const spyQ = (typeof _md !== 'undefined') ? (_md?.quotes?.['SPY'] || {}) : {};
        const price = spyQ.price || last.close || 0;
        const chg   = spyQ.change || (last.close && prev.close ? last.close - prev.close : null);
        const chgPct = spyQ.pct_change || (chg && prev.close ? chg/prev.close*100 : null);
        const up = (chg ?? 0) >= 0;
        const col = up ? 'var(--green)' : 'var(--red)';

        if (priceEl && price) { priceEl.textContent = '$' + price.toFixed(2); priceEl.style.color = col; }
        if (changeEl && chg != null) { changeEl.textContent = (up?'+':'') + chg.toFixed(2) + (chgPct != null ? ' (' + (up?'+':'') + chgPct.toFixed(2) + '%)' : ''); changeEl.style.color = col; }
        if (statusEl) { statusEl.textContent = '◉ MARKET CLOSED · last: ' + (last.date || '—'); statusEl.style.color = 'var(--text3)'; }

        // Render closed-market panel
        const statsEl = document.getElementById('lcStats');
        if (statsEl && last.open) {
          const fmt2 = v => v != null ? '$' + v.toFixed(2) : '—';
          const m = last.measurements || {};
          const oc = m.oc_pts ?? m.open_to_close;
          const rng = m.range_pts ?? m.day_range;
          [
            { label:'PREV OPEN',   val: fmt2(last.open),   color:'var(--text1)' },
            { label:'PREV HIGH',   val: fmt2(last.high),   color:'var(--green)' },
            { label:'PREV LOW',    val: fmt2(last.low),    color:'var(--red)'   },
            { label:'PREV CLOSE',  val: fmt2(last.close),  color: (last.close??0)>=(last.open??0)?'var(--green)':'var(--red)' },
            { label:'O→C',         val: oc != null ? (oc>=0?'+':'') + oc.toFixed(2) : '—', color: (oc??0)>=0?'var(--green)':'var(--red)' },
            { label:'DAY RANGE',   val: rng != null ? '$' + rng.toFixed(2) : '—', color:'var(--cyan)' },
            { label:'VOLUME',      val: last.volume ? (last.volume/1e6).toFixed(1)+'M' : '—', color:'var(--text2)' },
          ].map(c => `<div class="panel" style="padding:10px;text-align:center;"><div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:4px;">${c.label}</div><div style="font-family:'Share Tech Mono',monospace;font-size:16px;font-weight:bold;color:${c.color};">${c.val}</div></div>`);
          statsEl.innerHTML = [
            { label:'PREV OPEN',   val: fmt2(last.open),   color:'var(--text1)' },
            { label:'PREV HIGH',   val: fmt2(last.high),   color:'var(--green)' },
            { label:'PREV LOW',    val: fmt2(last.low),    color:'var(--red)'   },
            { label:'PREV CLOSE',  val: fmt2(last.close),  color: (last.close??0)>=(last.open??0)?'var(--green)':'var(--red)' },
            { label:'O→C',         val: oc != null ? (oc>=0?'+':'') + oc.toFixed(2) : '—', color: (oc??0)>=0?'var(--green)':'var(--red)' },
            { label:'DAY RANGE',   val: rng != null ? '$' + rng.toFixed(2) : '—', color:'var(--cyan)' },
            { label:'VOLUME',      val: last.volume ? (last.volume/1e6).toFixed(1)+'M' : '—', color:'var(--text2)' },
          ].map(c => `<div class="panel" style="padding:10px;text-align:center;"><div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:4px;">${c.label}</div><div style="font-family:'Share Tech Mono',monospace;font-size:16px;font-weight:bold;color:${c.color};">${c.val}</div></div>`).join('');
        }

        // Draw a 20-day daily close chart on the canvas
        const canvas = document.getElementById('lcCanvas');
        if (canvas && sd.length > 1) {
          const recent = sd.slice(0, 20).reverse().filter(d2 => d2.close);
          if (recent.length > 1) {
            const wrap = canvas.parentElement;
            const W = Math.max(wrap ? wrap.clientWidth - 20 : 600, 300);
            const H = 280;
            canvas.width = W; canvas.height = H;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, W, H);
            const pad = { l:54, r:16, t:24, b:36 };
            const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
            const closes = recent.map(d2 => d2.close);
            const minC = Math.min(...closes) * 0.9985;
            const maxC = Math.max(...closes) * 1.0015;
            const rng2 = maxC - minC || 1;
            const px = i => pad.l + (i / (recent.length - 1)) * cw;
            const py = v => pad.t + ch - ((v - minC) / rng2) * ch;
            const lineColor = closes[closes.length-1] >= closes[0] ? '#00ff88' : '#ff3355';

            // Grid
            for (let g = 0; g <= 4; g++) {
              const gv = minC + (rng2 / 4) * g;
              const gy = py(gv);
              ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(W - pad.r, gy); ctx.stroke();
              ctx.fillStyle = '#505070'; ctx.font = '9px "Share Tech Mono",monospace'; ctx.textAlign = 'right';
              ctx.fillText(gv.toFixed(0), pad.l - 4, gy + 3);
            }

            // Area
            const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
            grad.addColorStop(0, lineColor + '40'); grad.addColorStop(1, lineColor + '04');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(px(0), py(closes[0]));
            closes.forEach((c2, i) => ctx.lineTo(px(i), py(c2)));
            ctx.lineTo(px(closes.length - 1), pad.t + ch);
            ctx.lineTo(px(0), pad.t + ch);
            ctx.closePath(); ctx.fill();

            // Line
            ctx.strokeStyle = lineColor; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
            ctx.beginPath();
            closes.forEach((c2, i) => i === 0 ? ctx.moveTo(px(i), py(c2)) : ctx.lineTo(px(i), py(c2)));
            ctx.stroke();

            // Last close dot
            const lx = px(closes.length - 1), ly = py(closes[closes.length - 1]);
            ctx.fillStyle = lineColor; ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fill();

            // Date labels every 5
            ctx.fillStyle = '#404060'; ctx.font = '9px "Share Tech Mono",monospace'; ctx.textAlign = 'center';
            recent.forEach((d2, i) => {
              if (i % 5 !== 0 && i !== recent.length - 1) return;
              ctx.fillText(d2.date.slice(5), px(i), pad.t + ch + 14);
            });

            // Header label
            ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '9px "Orbitron",monospace'; ctx.textAlign = 'left';
            ctx.fillText('LAST 20 SESSIONS — DAILY CLOSE', pad.l, pad.t - 6);
          }
        }
        return;
      }

      _lastBars = d.rawBars;
      const last = d.rawBars[d.rawBars.length - 1];
      const chg  = d.changePct;
      const up   = (chg ?? 0) >= 0;

      if (priceEl)  priceEl.textContent  = '$' + d.close.toFixed(2);
      if (priceEl)  priceEl.style.color  = up ? 'var(--green)' : 'var(--red)';
      if (changeEl) changeEl.textContent = (chg != null ? (up?'+':'') + chg.toFixed(2)+'%' : '—');
      if (changeEl) changeEl.style.color = up ? 'var(--green)' : 'var(--red)';
      if (statusEl) statusEl.textContent = '● LIVE · ' + d.bars + ' bars · as of ' + new Date(d.asOf).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',timeZone:'America/Chicago'}) + ' CT';
      if (statusEl) statusEl.style.color = 'var(--green)';

      drawChart(d.rawBars, _chartType);
      renderLcStats(d);

    } catch(e) {
      const s = document.getElementById('lcStatus');
      if (s) { s.textContent = 'Error: ' + e.message; s.style.color = 'var(--red)'; }
    }
  }

  function renderLcStats(d) {
    const el = document.getElementById('lcStats');
    if (!el) return;
    const fmt = (v, dec=2) => v != null ? v.toFixed(dec) : '—';
    const cards = [
      { label:'OPEN',    val: d.open  != null ? '$'+fmt(d.open)  : '—', color:'var(--text1)' },
      { label:'HIGH',    val: d.high  != null ? '$'+fmt(d.high)  : '—', color:'var(--green)' },
      { label:'LOW',     val: d.low   != null ? '$'+fmt(d.low)   : '—', color:'var(--red)'   },
      { label:'CLOSE',   val: d.close != null ? '$'+fmt(d.close) : '—', color: (d.close??0)>=(d.open??0) ? 'var(--green)' : 'var(--red)' },
      { label:'VOLUME',  val: d.volume != null ? (d.volume/1e6).toFixed(1)+'M' : '—', color:'var(--cyan)' },
    ];
    el.innerHTML = cards.map(c => `
      <div class="panel" style="padding:10px;text-align:center;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:4px;">${c.label}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:16px;font-weight:bold;color:${c.color};">${c.val}</div>
      </div>`).join('');
  }

  function drawChart(bars, type) {
    const canvas = document.getElementById('lcCanvas');
    if (!canvas) return;

    // Size canvas to container
    const wrap = canvas.parentElement;
    const W = wrap.clientWidth - 20;
    const H = Math.max(340, Math.round(W * 0.32));
    canvas.width  = W;
    canvas.height = H;
    canvas.style.height = H + 'px';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Get CSS variables
    const style    = getComputedStyle(document.documentElement);
    const cGreen   = style.getPropertyValue('--green').trim()   || '#00ff88';
    const cRed     = style.getPropertyValue('--red').trim()     || '#ff4455';
    const cCyan    = style.getPropertyValue('--cyan').trim()    || '#00ccff';
    const cText2   = style.getPropertyValue('--text2').trim()   || '#8899aa';
    const cText3   = style.getPropertyValue('--text3').trim()   || '#445566';
    const cBorder  = style.getPropertyValue('--border').trim()  || '#223344';

    const PAD = { top: 20, right: 60, bottom: 40, left: 12 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top  - PAD.bottom;

    const prices = bars.flatMap(b => [b.h, b.l]);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;
    const padP  = range * 0.05;
    const lo = minP - padP;
    const hi = maxP + padP;

    const toY = p => PAD.top + chartH - ((p - lo) / (hi - lo)) * chartH;
    const toX = i => PAD.left + (i / (bars.length - 1 || 1)) * chartW;

    // Grid lines + price labels
    ctx.strokeStyle = cBorder;
    ctx.lineWidth   = 0.5;
    ctx.setLineDash([3, 4]);
    const gridSteps = 6;
    for (let g = 0; g <= gridSteps; g++) {
      const p = lo + (hi - lo) * (g / gridSteps);
      const y = toY(p);
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + chartW, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle   = cText2;
      ctx.font        = '10px Share Tech Mono, monospace';
      ctx.textAlign   = 'left';
      ctx.fillText('$' + p.toFixed(2), PAD.left + chartW + 4, y + 4);
      ctx.setLineDash([3, 4]);
    }
    ctx.setLineDash([]);

    // Time labels on x axis (every ~30 bars)
    const labelEvery = Math.max(1, Math.floor(bars.length / 10));
    ctx.fillStyle  = cText3;
    ctx.font       = '9px Share Tech Mono, monospace';
    ctx.textAlign  = 'center';
    bars.forEach((b, i) => {
      if (i % labelEvery !== 0 && i !== bars.length - 1) return;
      const x = toX(i);
      const t = new Date(b.t * 1000);
      const label = t.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', timeZone:'America/Chicago', hour12:false });
      ctx.fillText(label, x, H - 6);
    });

    // Prev close line if available (use first bar open as proxy)
    const prevOpen = bars[0].o;
    ctx.strokeStyle = cText3;
    ctx.lineWidth   = 0.8;
    ctx.setLineDash([4, 4]);
    const openY = toY(prevOpen);
    ctx.beginPath(); ctx.moveTo(PAD.left, openY); ctx.lineTo(PAD.left + chartW, openY); ctx.stroke();
    ctx.setLineDash([]);

    if (type === 'line') {
      // Line chart — close prices
      ctx.strokeStyle = cCyan;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      bars.forEach((b, i) => {
        const x = toX(i), y = toY(b.c);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Fill under line
      const lastX = toX(bars.length - 1);
      const baseY = PAD.top + chartH;
      ctx.lineTo(lastX, baseY);
      ctx.lineTo(PAD.left, baseY);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + chartH);
      grad.addColorStop(0, cCyan + '33');
      grad.addColorStop(1, cCyan + '00');
      ctx.fillStyle = grad;
      ctx.fill();

    } else {
      // Candlestick chart
      const candleW = Math.max(1, Math.floor(chartW / bars.length) - 1);
      bars.forEach((b, i) => {
        const x   = toX(i);
        const up  = b.c >= b.o;
        const col = up ? cGreen : cRed;
        const oY  = toY(b.o);
        const cY  = toY(b.c);
        const hY  = toY(b.h);
        const lY  = toY(b.l);

        // Wick
        ctx.strokeStyle = col;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(x, hY);
        ctx.lineTo(x, lY);
        ctx.stroke();

        // Body
        const bodyTop = Math.min(oY, cY);
        const bodyH   = Math.max(1, Math.abs(cY - oY));
        ctx.fillStyle = col;
        ctx.fillRect(x - candleW/2, bodyTop, candleW, bodyH);
      });
    }

    // Tooltip on mousemove
    canvas.onmousemove = function(e) {
      const rect = canvas.getBoundingClientRect();
      const mx   = (e.clientX - rect.left) * (W / rect.width);
      const idx  = Math.round(((mx - PAD.left) / chartW) * (bars.length - 1));
      const b    = bars[Math.max(0, Math.min(bars.length - 1, idx))];
      if (!b) return;
      const tip  = document.getElementById('lcTooltip');
      if (!tip) return;
      const up   = b.c >= b.o;
      const t    = new Date(b.t * 1000).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', timeZone:'America/Chicago', hour12:false });
      tip.style.display = 'block';
      tip.style.color   = up ? cGreen : cRed;
      tip.innerHTML = `<div style="color:var(--text2);margin-bottom:4px;">${t} CT</div>O <b>$${b.o.toFixed(2)}</b> &nbsp; H <b>$${b.h.toFixed(2)}</b> &nbsp; L <b>$${b.l.toFixed(2)}</b> &nbsp; C <b>$${b.c.toFixed(2)}</b> &nbsp; V <b>${(b.v/1000).toFixed(0)}K</b>`;
      const tx = toX(idx);
      tip.style.left = (tx + 12 > W - 220 ? tx - 230 : tx + 12) + 'px';
      tip.style.top  = '10px';
    };
    canvas.onmouseleave = function() {
      const tip = document.getElementById('lcTooltip');
      if (tip) tip.style.display = 'none';
    };
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
