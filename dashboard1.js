const fmt=(n,d=2)=>n==null||isNaN(n)?'—':Number(n).toFixed(d);
const fmtK=n=>n>=1e9?(n/1e9).toFixed(1)+'B':n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(0)+'K':String(Math.round(n));
const clr=n=>n>0?'up':n<0?'dn':'neu';
const sign=n=>n>0?'+':'';
const fmt12=t=>{if(!t||!t.includes(':'))return t||'—';const[h,m]=t.split(':').map(Number);const ampm=h>=12?'PM':'AM';const h12=h%12||12;return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;};
const $=id=>document.getElementById(id);

function switchTab(id){
  const keys=['hub','desk','overview','wem','options','gex','volatility','bonds','breadth','sentiment','pricehistory','volhistory','media','journal','ai'];
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  const i=keys.indexOf(id);
  if(i>=0)document.querySelectorAll('.tab')[i].classList.add('active');
  const p=$('panel-'+id);if(p)p.classList.add('active');
  // Tab-specific init
  if(id==='media') initMediaTab();
  if(id==='journal') renderJournalEntries();
  if(id==='gex' && _md) { renderGEX(_md); renderGEXAdditions(_md); }
  if(id==='analog') { renderAnalog(); }
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
  const today=new Date().toISOString().split('T')[0];
  const todayRow=rows.find(r=>r.date===today)||null;
  const prevRow=rows.find(r=>r.date!==today)||null;

  // Previous week
  const getWeekOf = (dateStr) => {
    const d=new Date(dateStr+'T12:00:00'); const day=d.getDay();
    const mon=new Date(d); mon.setDate(d.getDate()-(day===0?6:day-1));
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
  const thisWeekRows = rows.filter(r=>r.date>=thisWeek&&r.date<=today);
  const weekOpen = thisWeekRows.length ? thisWeekRows[thisWeekRows.length-1]?.open : null;

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
    <!-- HEADER ROW 1: Ratios + date -->
    <div style="display:flex;gap:16px;align-items:center;margin-bottom:6px;padding:4px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:3px;font-family:'Share Tech Mono',monospace;font-size:11px;">
      <span style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);">SPX:SPY</span>
      <span style="color:var(--cyan);font-weight:bold;">${spxSpyRatio?fmt(spxSpyRatio,4):(spx&&(cur||prevClose)?fmt(spx/(cur||prevClose),4):'—')}</span>
      <span style="color:var(--border2);">·</span>
      <span style="font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);">ES:SPY</span>
      <span style="color:#ffcc00;font-weight:bold;">${esSpyRatio?fmt(esSpyRatio,4):(es&&(cur||prevClose)?fmt(es/(cur||prevClose),4):'—')}</span>
      <span style="margin-left:auto;font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);">${new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span>
    </div>

    <!-- HEADER ROW 2: Key price levels — all update live via updateLevelBar() -->
    <div id="deskLevelBar" style="display:grid;grid-template-columns:repeat(8,1fr);gap:1px;margin-bottom:8px;background:var(--border);border:1px solid var(--border);border-radius:3px;overflow:hidden;font-family:'Share Tech Mono',monospace;"></div>

    <!-- PRICE PANEL: Equal cells,  L→R -->
    <div class="panel" style="margin-bottom:10px;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">⬡ SPY PRICE DATA </div>
      <div style="display:grid;grid-template-columns:repeat(14,1fr);gap:4px;">
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
          {lbl:'CHG',        val:'chg', clr:changeAmt!=null?cc(changeAmt):'var(--text2)', grp:'TODAY', isChg:true},
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
        <div style="flex:6;text-align:center;color:var(--cyan);border-top:1px solid rgba(0,204,255,0.3);padding-top:1px;">TODAY</div>
      </div>
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
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px;">
          <div style="text-align:center;"><div style="font-family:'Orbitron',monospace;font-size:8px;color:#ff3355;">LOW</div><div style="font-family:'Share Tech Mono',monospace;font-size:18px;color:#ff3355;">$${fmt(wem.wem_low,2)}</div></div>
          <div style="text-align:center;"><div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);">ANCHOR</div><div style="font-family:'Share Tech Mono',monospace;font-size:18px;">$${fmt(wem.wem_mid,2)}</div></div>
          <div style="text-align:center;"><div style="font-family:'Orbitron',monospace;font-size:8px;color:#00ff88;">HIGH</div><div style="font-family:'Share Tech Mono',monospace;font-size:18px;color:#00ff88;">$${fmt(wem.wem_high,2)}</div></div>
        </div>
        ${cur?`<div style="font-family:'Orbitron',monospace;font-size:9px;text-align:center;padding:4px;border-radius:3px;color:${cur>wem.wem_high||cur<wem.wem_low?'#ff3355':'#00ff88'};background:${cur>wem.wem_high||cur<wem.wem_low?'rgba(255,51,85,0.1)':'rgba(0,255,136,0.1)'};">${cur>wem.wem_high?'▲ ABOVE WEM HIGH':cur<wem.wem_low?'▼ BELOW WEM LOW':'✓ INSIDE WEM RANGE'}</div>`:''}
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

    <!-- SESSION + DOD + VOLUME + GAPS -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 2fr;gap:10px;margin-bottom:10px;">
      <div class="panel">
        <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:10px;">⬡ TODAY'S SESSION</div>
        <div id="deskOhlcv"></div>
      </div>
      <div class="panel">
        <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:10px;">⬡ DAY OVER DAY</div>
        <div id="deskDod"></div>
      </div>
      <div class="panel">
        <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:10px;">⬡ </div>
        <div id="deskVolSummary"></div>
      </div>
      <div class="panel">
        <div style="font-family:'Orbitron',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:10px;">⬡ UNFILLED GAPS — ALL HISTORY</div>
        <div id="deskGaps"></div>
      </div>
    </div>`;

  // Fill today's session from live quotes
  renderDeskSession(md,sd);
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
  fetch('/premarket').then(r=>r.ok?r.json():null).then(pm=>{
    if(pm?.available && pm.high) {
      setPM(pm.high, pm.mid, pm.low);
    } else {
      setPM(null,null,null);
    }
  }).catch(()=>setPM(null,null,null));

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
  if(volSumEl && sd && sd.length){
    // _spyIntraday is set in dashboard2.js from the /spyintraday function (live 1-min bars)
    const liveIntra = typeof _spyIntraday !== 'undefined' ? _spyIntraday : null;
    const day0=sd[0]||{}, v2static=day0.volume_analysis||{};
    // Use live intraday fields when available (market hours), else fall back to sd[0]
    const v2 = liveIntra?.available ? liveIntra : v2static;
    const isLive = liveIntra?.available;
    const vol=spy.volume||(isLive?liveIntra.volume:0)||day0.volume||0;
    const last30=sd.slice(0,30).filter(d=>d.volume>0);
    const avg30=last30.length?Math.round(last30.reduce((a,d)=>a+d.volume,0)/last30.length):85000000;
    const volPct=vol&&avg30?(vol/avg30*100):0;
    const volColor=volPct>130?'#ff8800':volPct>80?'#00ff88':'#ffcc00';
    const srcLabel = isLive
      ? `<div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--cyan);margin-bottom:4px;letter-spacing:1px;">● LIVE INTRADAY · ${liveIntra.bars} bars · as of ${liveIntra.asOf?.slice(11,16)} UTC</div>`
      : `<div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);margin-bottom:4px;letter-spacing:1px;">PRIOR SESSION · ${day0.date||''}</div>`;
    volSumEl.innerHTML=srcLabel+`
      <div style="text-align:center;margin-bottom:12px;">
        <div style="font-family:'Share Tech Mono',monospace;font-size:26px;font-weight:bold;">${fmtK(vol)}</div>
        <div style="height:8px;background:var(--bg3);border-radius:3px;overflow:hidden;margin:6px 0;">
          <div style="width:${Math.min(volPct,100)}%;height:100%;background:${volColor};border-radius:3px;"></div>
        </div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:16px;color:${volColor};">${fmt(volPct,1)}% of 30d avg</div>
      </div>`+
      [
        {l:'30d Avg',   v:fmtK(avg30)},
        {l:'Open 1H',  v:v2.open_1h?fmtK(v2.open_1h)+'  '+fmt(v2.open_1h_pct,1)+'%':'—'},
        {l:'Close 1H', v:v2.close_1h?fmtK(v2.close_1h)+'  '+fmt(v2.close_1h_pct,1)+'%':'—'},
        {l:'Peak Time',v:v2.peak_time?v2.peak_time.slice(0,5)+'  '+fmtK(v2.peak_volume||0):'—'},
        {l:'HVN Price',v:v2.hvn_price?'$'+fmt(v2.hvn_price,2)+'  '+fmtK(v2.hvn_volume||0):'—'},
      ].map(i=>fmtRow(i.l,i.v)).join('');
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

  // ── ROW 4A: Session Vol Profile (hourly) ──────────────────────────────────
  const profEl=$('volSessionProfile');
  if(profEl){
    // Historical avg bar range by hour from intraday data — hardcoded from DB analysis
    // (computed: avg 1-min bar H-L by hour across all history)
    const hourlyAvg=[
      {h:'08',lbl:'8am',avg:0.410,note:'Pre-open + open print'},
      {h:'09',lbl:'9am',avg:0.383,note:'First 30min + cash open'},
      {h:'10',lbl:'10am',avg:0.323,note:'Morning continuation'},
      {h:'11',lbl:'11am',avg:0.286,note:'Midmorning lull'},
      {h:'12',lbl:'12pm',avg:0.271,note:'Lunch hour — low vol'},
      {h:'13',lbl:'1pm', avg:0.260,note:'Early afternoon'},
      {h:'14',lbl:'2pm', avg:0.283,note:'FOMC/news window'},
      {h:'15',lbl:'3pm', avg:0.278,note:'Power hour + close'},
    ];
    const maxAvg=Math.max(...hourlyAvg.map(h=>h.avg));

    // Get current CT hour to highlight
    const nowCT=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Chicago'}));
    const curHour=nowCT.getHours().toString().padStart(2,'0');

    profEl.innerHTML=`
      <div style="font-size:11px;color:var(--text3);margin-bottom:8px;">Avg 1-min bar range by hour · all history · Central Time</div>
      <div style="display:flex;flex-direction:column;gap:5px;">
        ${hourlyAvg.map(h=>{
          const w=(h.avg/maxAvg*100).toFixed(1);
          const isCur=h.h===curHour;
          const c=isCur?'var(--cyan)':h.avg>0.37?'#ff8800':h.avg>0.30?'#ffcc00':'#00ccff';
          return `<div style="display:flex;align-items:center;gap:8px;${isCur?'background:rgba(0,204,255,0.06);border-radius:3px;padding:2px 4px;':''}">
            <span style="font-family:'Orbitron',monospace;font-size:9px;color:${isCur?'var(--cyan)':'var(--text3)'};width:32px;">${h.lbl}</span>
            <div style="flex:1;height:14px;background:var(--bg3);border-radius:2px;overflow:hidden;">
              <div style="width:${w}%;height:100%;background:${c};opacity:0.75;border-radius:2px;"></div>
            </div>
            <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${c};width:40px;text-align:right;">$${h.avg.toFixed(3)}</span>
            <span style="font-size:10px;color:${isCur?'var(--cyan)':'var(--text3)'};width:140px;">${h.note}${isCur?' ← NOW':''}</span>
          </div>`;
        }).join('')}
      </div>
      <div style="margin-top:10px;padding:8px;background:var(--bg3);border-radius:4px;font-size:12px;color:var(--text2);line-height:1.5;">
        💡 <strong style="color:var(--text);">Day trading edge:</strong> Highest vol = open (8-9am CT) and close (3pm). Lunch (12-1pm) = tightest spreads, smallest bars. Best R:R setups typically 8:30–10am and 2:30–4pm.
      </div>`;
  }

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

  // ── CALL WALL vs PUT WALL ─────────────────────────────────────────────────
  const wallsEl = $('gexWalls');
  if(wallsEl) {
    const callStrikes = opt.top_call_strikes || [];
    const putStrikes = opt.top_put_strikes || [];
    const topCall = callStrikes[0];
    const topPut = putStrikes[0];
    let html = '';
    if(topCall || topPut) {
      const callWall = topCall?.strike, putWall = topPut?.strike;
      const range = callWall && putWall ? callWall - putWall : null;
      html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
        <div style="text-align:center;padding:10px;background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.3);border-radius:4px;">
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:#00ff88;margin-bottom:4px;">CALL WALL</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:bold;color:#00ff88;">$${callWall||'—'}</div>
          ${topCall?.oi?`<div style="font-size:11px;color:var(--text3);">${(topCall.oi/1000).toFixed(0)}K OI</div>`:''}
          ${callWall&&spot?`<div style="font-size:11px;color:var(--text3);">+${fmt(callWall-spot,1)} pts away</div>`:''}
        </div>
        <div style="text-align:center;padding:10px;background:rgba(255,51,85,0.08);border:1px solid rgba(255,51,85,0.3);border-radius:4px;">
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:#ff3355;margin-bottom:4px;">PUT WALL</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:bold;color:#ff3355;">$${putWall||'—'}</div>
          ${topPut?.oi?`<div style="font-size:11px;color:var(--text3);">${(topPut.oi/1000).toFixed(0)}K OI</div>`:''}
          ${putWall&&spot?`<div style="font-size:11px;color:var(--text3);">${fmt(putWall-spot,1)} pts away</div>`:''}
        </div>
      </div>`;
      if(range) html += `<div style="text-align:center;padding:6px;background:var(--bg3);border-radius:3px;margin-bottom:10px;"><span style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);">PIN RANGE: </span><span style="font-family:'Share Tech Mono',monospace;font-size:14px;color:var(--cyan);">$${putWall} — $${callWall} (${fmt(range,0)} pts)</span></div>`;
    }
    html += `<div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:6px;margin-top:4px;">TOP CALL STRIKES (OI)</div>`;
    callStrikes.slice(0,5).forEach(s => {
      const w = Math.min((s.oi/((callStrikes[0]?.oi||1))*80),80);
      html += `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;">
        <span style="font-family:'Share Tech Mono',monospace;font-size:12px;width:55px;text-align:right;color:#00ff88;">$${s.strike}</span>
        <div style="flex:1;height:10px;background:var(--bg3);border-radius:2px;overflow:hidden;">
          <div style="width:${w}%;height:100%;background:rgba(0,255,136,0.6);border-radius:2px;"></div></div>
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;width:50px;color:var(--text3);">${(s.oi/1000).toFixed(0)}K</span>
      </div>`;
    });
    html += `<div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--text3);margin-bottom:6px;margin-top:8px;">TOP PUT STRIKES (OI)</div>`;
    putStrikes.slice(0,5).forEach(s => {
      const w = Math.min((s.oi/((putStrikes[0]?.oi||1))*80),80);
      html += `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;">
        <span style="font-family:'Share Tech Mono',monospace;font-size:12px;width:55px;text-align:right;color:#ff3355;">$${s.strike}</span>
        <div style="flex:1;height:10px;background:var(--bg3);border-radius:2px;overflow:hidden;">
          <div style="width:${w}%;height:100%;background:rgba(255,51,85,0.6);border-radius:2px;"></div></div>
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;width:50px;color:var(--text3);">${(s.oi/1000).toFixed(0)}K</span>
      </div>`;
    });
    wallsEl.innerHTML = html || '<div class="no-data">No OI data</div>';
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
const ANALOG_DATA = {"generated":"2026-03-27","current":{"anchor_date":"2025-11-21","anchor_price":659.03,"current_date":"2026-03-27","current_price":634.09,"current_day":86,"current_pct":-3.7843,"data":[{"day":1,"date":"2025-11-21","close":659.03,"pct":0.0},{"day":2,"date":"2025-11-24","close":668.73,"pct":1.4719},{"day":3,"date":"2025-11-25","close":675.02,"pct":2.4263},{"day":4,"date":"2025-11-26","close":679.68,"pct":3.1334},{"day":5,"date":"2025-11-28","close":683.39,"pct":3.6963},{"day":6,"date":"2025-12-01","close":680.27,"pct":3.2229},{"day":7,"date":"2025-12-02","close":681.53,"pct":3.4141},{"day":8,"date":"2025-12-03","close":683.89,"pct":3.7722},{"day":9,"date":"2025-12-04","close":684.39,"pct":3.8481},{"day":10,"date":"2025-12-05","close":685.69,"pct":4.0453},{"day":11,"date":"2025-12-08","close":683.63,"pct":3.7328},{"day":12,"date":"2025-12-09","close":683.04,"pct":3.6432},{"day":13,"date":"2025-12-10","close":687.57,"pct":4.3306},{"day":14,"date":"2025-12-11","close":689.17,"pct":4.5734},{"day":15,"date":"2025-12-12","close":681.76,"pct":3.449},{"day":16,"date":"2025-12-15","close":680.73,"pct":3.2927},{"day":17,"date":"2025-12-16","close":678.87,"pct":3.0105},{"day":18,"date":"2025-12-17","close":671.4,"pct":1.877},{"day":19,"date":"2025-12-18","close":676.47,"pct":2.6463},{"day":20,"date":"2025-12-19","close":680.59,"pct":3.2715},{"day":21,"date":"2025-12-22","close":684.83,"pct":3.9148},{"day":22,"date":"2025-12-23","close":687.96,"pct":4.3898},{"day":23,"date":"2025-12-24","close":690.38,"pct":4.757},{"day":24,"date":"2025-12-26","close":690.31,"pct":4.7464},{"day":25,"date":"2025-12-29","close":687.85,"pct":4.3731},{"day":26,"date":"2025-12-30","close":687.01,"pct":4.2456},{"day":27,"date":"2025-12-31","close":681.92,"pct":3.4733},{"day":28,"date":"2026-01-02","close":683.17,"pct":3.663},{"day":29,"date":"2026-01-05","close":687.72,"pct":4.3534},{"day":30,"date":"2026-01-06","close":691.81,"pct":4.974},{"day":31,"date":"2026-01-07","close":689.58,"pct":4.6356},{"day":32,"date":"2026-01-08","close":689.51,"pct":4.625},{"day":33,"date":"2026-01-09","close":694.07,"pct":5.3169},{"day":34,"date":"2026-01-12","close":695.16,"pct":5.4823},{"day":35,"date":"2026-01-13","close":693.77,"pct":5.2714},{"day":36,"date":"2026-01-14","close":690.36,"pct":4.7539},{"day":37,"date":"2026-01-15","close":692.24,"pct":5.0392},{"day":38,"date":"2026-01-16","close":691.66,"pct":4.9512},{"day":39,"date":"2026-01-20","close":677.58,"pct":2.8147},{"day":40,"date":"2026-01-21","close":685.4,"pct":4.0013},{"day":41,"date":"2026-01-22","close":688.98,"pct":4.5446},{"day":42,"date":"2026-01-23","close":689.23,"pct":4.5825},{"day":43,"date":"2026-01-26","close":692.73,"pct":5.1136},{"day":44,"date":"2026-01-27","close":695.49,"pct":5.5324},{"day":45,"date":"2026-01-28","close":695.42,"pct":5.5217},{"day":46,"date":"2026-01-29","close":694.04,"pct":5.3123},{"day":47,"date":"2026-01-30","close":691.97,"pct":4.9982},{"day":48,"date":"2026-02-02","close":695.41,"pct":5.5202},{"day":49,"date":"2026-02-03","close":689.53,"pct":4.628},{"day":50,"date":"2026-02-04","close":686.19,"pct":4.1212},{"day":51,"date":"2026-02-05","close":677.62,"pct":2.8208},{"day":52,"date":"2026-02-06","close":690.62,"pct":4.7934},{"day":53,"date":"2026-02-09","close":693.95,"pct":5.2987},{"day":54,"date":"2026-02-10","close":692.12,"pct":5.021},{"day":55,"date":"2026-02-11","close":691.96,"pct":4.9967},{"day":56,"date":"2026-02-12","close":681.27,"pct":3.3747},{"day":57,"date":"2026-02-13","close":681.75,"pct":3.4475},{"day":58,"date":"2026-02-17","close":682.85,"pct":3.6144},{"day":59,"date":"2026-02-18","close":686.29,"pct":4.1364},{"day":60,"date":"2026-02-19","close":684.48,"pct":3.8617},{"day":61,"date":"2026-02-20","close":689.43,"pct":4.6128},{"day":62,"date":"2026-02-23","close":682.39,"pct":3.5446},{"day":63,"date":"2026-02-24","close":687.35,"pct":4.2972},{"day":64,"date":"2026-02-25","close":693.15,"pct":5.1773},{"day":65,"date":"2026-02-26","close":689.3,"pct":4.5931},{"day":66,"date":"2026-02-27","close":685.99,"pct":4.0909},{"day":67,"date":"2026-03-02","close":686.38,"pct":4.15},{"day":68,"date":"2026-03-03","close":680.33,"pct":3.232},{"day":69,"date":"2026-03-04","close":685.13,"pct":3.9604},{"day":70,"date":"2026-03-05","close":681.31,"pct":3.3807},{"day":71,"date":"2026-03-06","close":672.38,"pct":2.0257},{"day":72,"date":"2026-03-09","close":678.27,"pct":2.9194},{"day":73,"date":"2026-03-10","close":677.18,"pct":2.754},{"day":74,"date":"2026-03-11","close":676.33,"pct":2.6251},{"day":75,"date":"2026-03-12","close":666.06,"pct":1.0667},{"day":76,"date":"2026-03-13","close":662.29,"pct":0.4947},{"day":77,"date":"2026-03-16","close":669.03,"pct":1.5174},{"day":78,"date":"2026-03-17","close":670.79,"pct":1.7844},{"day":79,"date":"2026-03-18","close":661.43,"pct":0.3642},{"day":80,"date":"2026-03-19","close":659.8,"pct":0.1168},{"day":81,"date":"2026-03-20","close":648.57,"pct":-1.5872},{"day":82,"date":"2026-03-23","close":655.38,"pct":-0.5538},{"day":83,"date":"2026-03-24","close":653.18,"pct":-0.8877},{"day":84,"date":"2026-03-25","close":656.82,"pct":-0.3353},{"day":85,"date":"2026-03-26","close":645.09,"pct":-2.1152},{"day":86,"date":"2026-03-27","close":634.09,"pct":-3.7843}]},"analogs":[{"name":"2012 Analog","start_date":"2012-02-01","corr":0.8165,"rmse":1.397,"color":"#00ff88","anchor_price":132.47,"hist":[{"day":1,"date":"2012-02-01","close":132.47,"pct":0.0},{"day":2,"date":"2012-02-02","close":132.68,"pct":0.1585},{"day":3,"date":"2012-02-03","close":134.54,"pct":1.5626},{"day":4,"date":"2012-02-06","close":134.45,"pct":1.4947},{"day":5,"date":"2012-02-07","close":134.79,"pct":1.7513},{"day":6,"date":"2012-02-08","close":135.19,"pct":2.0533},{"day":7,"date":"2012-02-09","close":135.36,"pct":2.1816},{"day":8,"date":"2012-02-10","close":134.36,"pct":1.4267},{"day":9,"date":"2012-02-13","close":135.36,"pct":2.1816},{"day":10,"date":"2012-02-14","close":135.19,"pct":2.0533},{"day":11,"date":"2012-02-15","close":134.56,"pct":1.5777},{"day":12,"date":"2012-02-16","close":136.05,"pct":2.7025},{"day":13,"date":"2012-02-17","close":136.41,"pct":2.9743},{"day":14,"date":"2012-02-21","close":136.47,"pct":3.0196},{"day":15,"date":"2012-02-22","close":136.03,"pct":2.6874},{"day":16,"date":"2012-02-23","close":136.63,"pct":3.1403},{"day":17,"date":"2012-02-24","close":136.93,"pct":3.3668},{"day":18,"date":"2012-02-27","close":137.16,"pct":3.5404},{"day":19,"date":"2012-02-28","close":137.56,"pct":3.8424},{"day":20,"date":"2012-02-29","close":137.02,"pct":3.4347},{"day":21,"date":"2012-03-01","close":137.73,"pct":3.9707},{"day":22,"date":"2012-03-02","close":137.31,"pct":3.6537},{"day":23,"date":"2012-03-05","close":136.75,"pct":3.2309},{"day":24,"date":"2012-03-06","close":134.75,"pct":1.7211},{"day":25,"date":"2012-03-07","close":135.69,"pct":2.4307},{"day":26,"date":"2012-03-08","close":137.04,"pct":3.4498},{"day":27,"date":"2012-03-09","close":137.57,"pct":3.8499},{"day":28,"date":"2012-03-12","close":137.58,"pct":3.8575},{"day":29,"date":"2012-03-13","close":140.06,"pct":5.7296},{"day":30,"date":"2012-03-14","close":139.91,"pct":5.6164},{"day":31,"date":"2012-03-15","close":140.72,"pct":6.2278},{"day":32,"date":"2012-03-16","close":140.3,"pct":5.9108},{"day":33,"date":"2012-03-19","close":140.85,"pct":6.326},{"day":34,"date":"2012-03-20","close":140.44,"pct":6.0165},{"day":35,"date":"2012-03-21","close":140.21,"pct":5.8428},{"day":36,"date":"2012-03-22","close":139.2,"pct":5.0804},{"day":37,"date":"2012-03-23","close":139.65,"pct":5.4201},{"day":38,"date":"2012-03-26","close":141.61,"pct":6.8997},{"day":39,"date":"2012-03-27","close":141.17,"pct":6.5675},{"day":40,"date":"2012-03-28","close":140.47,"pct":6.0391},{"day":41,"date":"2012-03-29","close":140.23,"pct":5.8579},{"day":42,"date":"2012-03-30","close":140.81,"pct":6.2958},{"day":43,"date":"2012-04-02","close":141.84,"pct":7.0733},{"day":44,"date":"2012-04-03","close":141.26,"pct":6.6355},{"day":45,"date":"2012-04-04","close":139.86,"pct":5.5786},{"day":46,"date":"2012-04-05","close":139.79,"pct":5.5258},{"day":47,"date":"2012-04-09","close":138.22,"pct":4.3406},{"day":48,"date":"2012-04-10","close":135.9,"pct":2.5893},{"day":49,"date":"2012-04-11","close":137.0,"pct":3.4196},{"day":50,"date":"2012-04-12","close":138.79,"pct":4.7709},{"day":51,"date":"2012-04-13","close":137.14,"pct":3.5253},{"day":52,"date":"2012-04-16","close":137.05,"pct":3.4574},{"day":53,"date":"2012-04-17","close":139.08,"pct":4.9898},{"day":54,"date":"2012-04-18","close":138.61,"pct":4.635},{"day":55,"date":"2012-04-19","close":137.72,"pct":3.9632},{"day":56,"date":"2012-04-20","close":137.95,"pct":4.1368},{"day":57,"date":"2012-04-23","close":136.79,"pct":3.2611},{"day":58,"date":"2012-04-24","close":137.31,"pct":3.6537},{"day":59,"date":"2012-04-25","close":139.19,"pct":5.0728},{"day":60,"date":"2012-04-26","close":140.16,"pct":5.8051},{"day":61,"date":"2012-04-27","close":140.39,"pct":5.9787},{"day":62,"date":"2012-04-30","close":139.87,"pct":5.5862},{"day":63,"date":"2012-05-01","close":140.74,"pct":6.2429},{"day":64,"date":"2012-05-02","close":140.32,"pct":5.9259},{"day":65,"date":"2012-05-03","close":139.25,"pct":5.1181},{"day":66,"date":"2012-05-04","close":137.0,"pct":3.4196},{"day":67,"date":"2012-05-07","close":137.1,"pct":3.4951},{"day":68,"date":"2012-05-08","close":136.55,"pct":3.0799},{"day":69,"date":"2012-05-09","close":135.74,"pct":2.4685},{"day":70,"date":"2012-05-10","close":136.02,"pct":2.6799},{"day":71,"date":"2012-05-11","close":135.61,"pct":2.3703},{"day":72,"date":"2012-05-14","close":134.11,"pct":1.238},{"day":73,"date":"2012-05-15","close":133.34,"pct":0.6567},{"day":74,"date":"2012-05-16","close":132.83,"pct":0.2718},{"day":75,"date":"2012-05-17","close":130.86,"pct":-1.2154},{"day":76,"date":"2012-05-18","close":129.74,"pct":-2.0608},{"day":77,"date":"2012-05-21","close":131.97,"pct":-0.3774},{"day":78,"date":"2012-05-22","close":132.2,"pct":-0.2038},{"day":79,"date":"2012-05-23","close":132.27,"pct":-0.151},{"day":80,"date":"2012-05-24","close":132.53,"pct":0.0453},{"day":81,"date":"2012-05-25","close":132.1,"pct":-0.2793},{"day":82,"date":"2012-05-29","close":133.7,"pct":0.9285},{"day":83,"date":"2012-05-30","close":131.76,"pct":-0.536},{"day":84,"date":"2012-05-31","close":131.47,"pct":-0.7549},{"day":85,"date":"2012-06-01","close":128.16,"pct":-3.2536},{"day":86,"date":"2012-06-04","close":128.1,"pct":-3.2989}],"proj":[{"day":87,"days_ahead":1,"est_date":"2026-03-30","ref_date":"2012-06-05","pct_analog":-2.5666,"day_chg":0.7572,"proj_spy":638.89,"pct_from_now":0.7572,"pct_from_anchor25":-3.0558},{"day":88,"days_ahead":2,"est_date":"2026-03-31","ref_date":"2012-06-06","pct_analog":-0.3774,"day_chg":2.2468,"proj_spy":653.25,"pct_from_now":3.0211,"pct_from_anchor25":-0.8776},{"day":89,"days_ahead":3,"est_date":"2026-04-01","ref_date":"2012-06-07","pct_analog":-0.3171,"day_chg":0.0606,"proj_spy":653.64,"pct_from_now":3.0835,"pct_from_anchor25":-0.8175},{"day":90,"days_ahead":4,"est_date":"2026-04-02","ref_date":"2012-06-08","pct_analog":0.4756,"day_chg":0.7952,"proj_spy":658.84,"pct_from_now":3.9032,"pct_from_anchor25":-0.0289},{"day":91,"days_ahead":5,"est_date":"2026-04-03","ref_date":"2012-06-11","pct_analog":-0.8002,"day_chg":-1.2697,"proj_spy":650.47,"pct_from_now":2.5839,"pct_from_anchor25":-1.2982},{"day":92,"days_ahead":6,"est_date":"2026-04-06","ref_date":"2012-06-12","pct_analog":0.3397,"day_chg":1.1491,"proj_spy":657.95,"pct_from_now":3.7627,"pct_from_anchor25":-0.1641},{"day":93,"days_ahead":7,"est_date":"2026-04-07","ref_date":"2012-06-13","pct_analog":-0.302,"day_chg":-0.6395,"proj_spy":653.74,"pct_from_now":3.0991,"pct_from_anchor25":-0.8025},{"day":94,"days_ahead":8,"est_date":"2026-04-08","ref_date":"2012-06-14","pct_analog":0.7549,"day_chg":1.06,"proj_spy":660.67,"pct_from_now":4.192,"pct_from_anchor25":0.249},{"day":95,"days_ahead":9,"est_date":"2026-04-09","ref_date":"2012-06-15","pct_analog":1.2607,"day_chg":0.502,"proj_spy":663.99,"pct_from_now":4.7151,"pct_from_anchor25":0.7523},{"day":96,"days_ahead":10,"est_date":"2026-04-10","ref_date":"2012-06-18","pct_analog":1.4569,"day_chg":0.1938,"proj_spy":665.27,"pct_from_now":4.918,"pct_from_anchor25":0.9476},{"day":97,"days_ahead":11,"est_date":"2026-04-13","ref_date":"2012-06-19","pct_analog":2.4383,"day_chg":0.9673,"proj_spy":671.71,"pct_from_now":5.9329,"pct_from_anchor25":1.924},{"day":98,"days_ahead":12,"est_date":"2026-04-14","ref_date":"2012-06-20","pct_analog":2.2722,"day_chg":-0.1621,"proj_spy":670.62,"pct_from_now":5.7611,"pct_from_anchor25":1.7587},{"day":99,"days_ahead":13,"est_date":"2026-04-15","ref_date":"2012-06-21","pct_analog":-0.0226,"day_chg":-2.2439,"proj_spy":655.57,"pct_from_now":3.388,"pct_from_anchor25":-0.5246},{"day":100,"days_ahead":14,"est_date":"2026-04-16","ref_date":"2012-06-22","pct_analog":0.7473,"day_chg":0.7702,"proj_spy":660.62,"pct_from_now":4.1842,"pct_from_anchor25":0.2415},{"day":101,"days_ahead":15,"est_date":"2026-04-17","ref_date":"2012-06-25","pct_analog":-0.8681,"day_chg":-1.6035,"proj_spy":650.03,"pct_from_now":2.5137,"pct_from_anchor25":-1.3658},{"day":102,"days_ahead":16,"est_date":"2026-04-20","ref_date":"2012-06-26","pct_analog":-0.3699,"day_chg":0.5026,"proj_spy":653.3,"pct_from_now":3.0289,"pct_from_anchor25":-0.8701},{"day":103,"days_ahead":17,"est_date":"2026-04-21","ref_date":"2012-06-27","pct_analog":0.5284,"day_chg":0.9017,"proj_spy":659.19,"pct_from_now":3.9578,"pct_from_anchor25":0.0237},{"day":104,"days_ahead":18,"est_date":"2026-04-22","ref_date":"2012-06-28","pct_analog":0.2416,"day_chg":-0.2854,"proj_spy":657.31,"pct_from_now":3.6612,"pct_from_anchor25":-0.2617},{"day":105,"days_ahead":19,"est_date":"2026-04-23","ref_date":"2012-06-29","pct_analog":2.7402,"day_chg":2.4927,"proj_spy":673.69,"pct_from_now":6.2451,"pct_from_anchor25":2.2244},{"day":106,"days_ahead":20,"est_date":"2026-04-24","ref_date":"2012-07-02","pct_analog":3.0497,"day_chg":0.3012,"proj_spy":675.72,"pct_from_now":6.5652,"pct_from_anchor25":2.5324},{"day":107,"days_ahead":21,"est_date":"2026-04-27","ref_date":"2012-07-03","pct_analog":3.7291,"day_chg":0.6593,"proj_spy":680.17,"pct_from_now":7.2678,"pct_from_anchor25":3.2084},{"day":108,"days_ahead":22,"est_date":"2026-04-28","ref_date":"2012-07-05","pct_analog":3.2611,"day_chg":-0.4512,"proj_spy":677.11,"pct_from_now":6.7838,"pct_from_anchor25":2.7427},{"day":109,"days_ahead":23,"est_date":"2026-04-29","ref_date":"2012-07-06","pct_analog":2.2798,"day_chg":-0.9504,"proj_spy":670.67,"pct_from_now":5.7689,"pct_from_anchor25":1.7663},{"day":110,"days_ahead":24,"est_date":"2026-04-30","ref_date":"2012-07-09","pct_analog":2.1514,"day_chg":-0.1255,"proj_spy":669.83,"pct_from_now":5.6362,"pct_from_anchor25":1.6386},{"day":111,"days_ahead":25,"est_date":"2026-05-01","ref_date":"2012-07-10","pct_analog":1.2607,"day_chg":-0.872,"proj_spy":663.99,"pct_from_now":4.7151,"pct_from_anchor25":0.7523},{"day":112,"days_ahead":26,"est_date":"2026-05-04","ref_date":"2012-07-11","pct_analog":1.2758,"day_chg":0.0149,"proj_spy":664.09,"pct_from_now":4.7307,"pct_from_anchor25":0.7673},{"day":113,"days_ahead":27,"est_date":"2026-05-05","ref_date":"2012-07-12","pct_analog":0.7851,"day_chg":-0.4845,"proj_spy":660.87,"pct_from_now":4.2233,"pct_from_anchor25":0.2791},{"day":114,"days_ahead":28,"est_date":"2026-05-06","ref_date":"2012-07-13","pct_analog":2.476,"day_chg":1.6778,"proj_spy":671.96,"pct_from_now":5.9719,"pct_from_anchor25":1.9615},{"day":115,"days_ahead":29,"est_date":"2026-05-07","ref_date":"2012-07-16","pct_analog":2.2345,"day_chg":-0.2357,"proj_spy":670.37,"pct_from_now":5.7221,"pct_from_anchor25":1.7212},{"day":116,"days_ahead":30,"est_date":"2026-05-08","ref_date":"2012-07-17","pct_analog":2.9365,"day_chg":0.6867,"proj_spy":674.98,"pct_from_now":6.4481,"pct_from_anchor25":2.4197},{"day":117,"days_ahead":31,"est_date":"2026-05-11","ref_date":"2012-07-18","pct_analog":3.6989,"day_chg":0.7407,"proj_spy":679.98,"pct_from_now":7.2365,"pct_from_anchor25":3.1783},{"day":118,"days_ahead":32,"est_date":"2026-05-12","ref_date":"2012-07-19","pct_analog":3.9707,"day_chg":0.2621,"proj_spy":681.76,"pct_from_now":7.5176,"pct_from_anchor25":3.4487},{"day":119,"days_ahead":33,"est_date":"2026-05-13","ref_date":"2012-07-20","pct_analog":3.0196,"day_chg":-0.9148,"proj_spy":675.52,"pct_from_now":6.534,"pct_from_anchor25":2.5023},{"day":120,"days_ahead":34,"est_date":"2026-05-14","ref_date":"2012-07-23","pct_analog":1.9778,"day_chg":-1.0112,"proj_spy":668.69,"pct_from_now":5.4567,"pct_from_anchor25":1.4658},{"day":121,"days_ahead":35,"est_date":"2026-05-15","ref_date":"2012-07-24","pct_analog":1.1021,"day_chg":-0.8587,"proj_spy":662.95,"pct_from_now":4.5511,"pct_from_anchor25":0.5945},{"day":122,"days_ahead":36,"est_date":"2026-05-18","ref_date":"2012-07-25","pct_analog":1.1248,"day_chg":0.0224,"proj_spy":663.1,"pct_from_now":4.5746,"pct_from_anchor25":0.6171},{"day":123,"days_ahead":37,"est_date":"2026-05-19","ref_date":"2012-07-26","pct_analog":2.7931,"day_chg":1.6497,"proj_spy":674.04,"pct_from_now":6.2998,"pct_from_anchor25":2.277},{"day":124,"days_ahead":38,"est_date":"2026-05-20","ref_date":"2012-07-27","pct_analog":4.6878,"day_chg":1.8433,"proj_spy":686.46,"pct_from_now":8.2592,"pct_from_anchor25":4.1623},{"day":125,"days_ahead":39,"est_date":"2026-05-21","ref_date":"2012-07-30","pct_analog":4.6878,"day_chg":0.0,"proj_spy":686.46,"pct_from_now":8.2592,"pct_from_anchor25":4.1623},{"day":126,"days_ahead":40,"est_date":"2026-05-22","ref_date":"2012-07-31","pct_analog":3.9556,"day_chg":-0.6994,"proj_spy":681.66,"pct_from_now":7.502,"pct_from_anchor25":3.4337},{"day":127,"days_ahead":41,"est_date":"2026-05-25","ref_date":"2012-08-01","pct_analog":3.865,"day_chg":-0.0871,"proj_spy":681.07,"pct_from_now":7.4083,"pct_from_anchor25":3.3436},{"day":128,"days_ahead":42,"est_date":"2026-05-26","ref_date":"2012-08-02","pct_analog":3.1479,"day_chg":-0.6905,"proj_spy":676.36,"pct_from_now":6.6667,"pct_from_anchor25":2.63},{"day":129,"days_ahead":43,"est_date":"2026-05-27","ref_date":"2012-08-03","pct_analog":5.1936,"day_chg":1.9833,"proj_spy":689.78,"pct_from_now":8.7822,"pct_from_anchor25":4.6655},{"day":130,"days_ahead":44,"est_date":"2026-05-28","ref_date":"2012-08-06","pct_analog":5.3974,"day_chg":0.1937,"proj_spy":691.11,"pct_from_now":8.993,"pct_from_anchor25":4.8683},{"day":131,"days_ahead":45,"est_date":"2026-05-29","ref_date":"2012-08-07","pct_analog":5.9259,"day_chg":0.5014,"proj_spy":694.58,"pct_from_now":9.5394,"pct_from_anchor25":5.3941},{"day":132,"days_ahead":46,"est_date":"2026-06-01","ref_date":"2012-08-08","pct_analog":6.0542,"day_chg":0.1212,"proj_spy":695.42,"pct_from_now":9.6721,"pct_from_anchor25":5.5218},{"day":133,"days_ahead":47,"est_date":"2026-06-02","ref_date":"2012-08-09","pct_analog":6.1448,"day_chg":0.0854,"proj_spy":696.01,"pct_from_now":9.7658,"pct_from_anchor25":5.6119},{"day":134,"days_ahead":48,"est_date":"2026-06-03","ref_date":"2012-08-10","pct_analog":6.3184,"day_chg":0.1636,"proj_spy":697.15,"pct_from_now":9.9453,"pct_from_anchor25":5.7846},{"day":135,"days_ahead":49,"est_date":"2026-06-04","ref_date":"2012-08-13","pct_analog":6.2656,"day_chg":-0.0497,"proj_spy":696.81,"pct_from_now":9.8907,"pct_from_anchor25":5.7321},{"day":136,"days_ahead":50,"est_date":"2026-06-05","ref_date":"2012-08-14","pct_analog":6.2807,"day_chg":0.0142,"proj_spy":696.9,"pct_from_now":9.9063,"pct_from_anchor25":5.7471},{"day":137,"days_ahead":51,"est_date":"2026-06-08","ref_date":"2012-08-15","pct_analog":6.4014,"day_chg":0.1136,"proj_spy":697.7,"pct_from_now":10.0312,"pct_from_anchor25":5.8673},{"day":138,"days_ahead":52,"est_date":"2026-06-09","ref_date":"2012-08-16","pct_analog":7.1865,"day_chg":0.7379,"proj_spy":702.84,"pct_from_now":10.8431,"pct_from_anchor25":6.6484},{"day":139,"days_ahead":53,"est_date":"2026-06-10","ref_date":"2012-08-17","pct_analog":7.33,"day_chg":0.1338,"proj_spy":703.79,"pct_from_now":10.9914,"pct_from_anchor25":6.7911},{"day":140,"days_ahead":54,"est_date":"2026-06-11","ref_date":"2012-08-20","pct_analog":7.3375,"day_chg":0.007,"proj_spy":703.83,"pct_from_now":10.9992,"pct_from_anchor25":6.7986},{"day":141,"days_ahead":55,"est_date":"2026-06-12","ref_date":"2012-08-21","pct_analog":7.0129,"day_chg":-0.3024,"proj_spy":701.71,"pct_from_now":10.6635,"pct_from_anchor25":6.4756},{"day":142,"days_ahead":56,"est_date":"2026-06-15","ref_date":"2012-08-22","pct_analog":7.0582,"day_chg":0.0423,"proj_spy":702.0,"pct_from_now":10.7104,"pct_from_anchor25":6.5207},{"day":143,"days_ahead":57,"est_date":"2026-06-16","ref_date":"2012-08-23","pct_analog":6.1825,"day_chg":-0.8179,"proj_spy":696.26,"pct_from_now":9.8048,"pct_from_anchor25":5.6494},{"day":144,"days_ahead":58,"est_date":"2026-06-17","ref_date":"2012-08-24","pct_analog":6.8242,"day_chg":0.6043,"proj_spy":700.47,"pct_from_now":10.4684,"pct_from_anchor25":6.2879},{"day":145,"days_ahead":59,"est_date":"2026-06-18","ref_date":"2012-08-27","pct_analog":6.8468,"day_chg":0.0212,"proj_spy":700.62,"pct_from_now":10.4918,"pct_from_anchor25":6.3104},{"day":146,"days_ahead":60,"est_date":"2026-06-19","ref_date":"2012-08-28","pct_analog":6.7411,"day_chg":-0.0989,"proj_spy":699.92,"pct_from_now":10.3825,"pct_from_anchor25":6.2052},{"day":147,"days_ahead":61,"est_date":"2026-06-22","ref_date":"2012-08-29","pct_analog":6.8242,"day_chg":0.0778,"proj_spy":700.47,"pct_from_now":10.4684,"pct_from_anchor25":6.2879},{"day":148,"days_ahead":62,"est_date":"2026-06-23","ref_date":"2012-08-30","pct_analog":6.0542,"day_chg":-0.7208,"proj_spy":695.42,"pct_from_now":9.6721,"pct_from_anchor25":5.5218},{"day":149,"days_ahead":63,"est_date":"2026-06-24","ref_date":"2012-08-31","pct_analog":6.56,"day_chg":0.4769,"proj_spy":698.74,"pct_from_now":10.1952,"pct_from_anchor25":6.025},{"day":150,"days_ahead":64,"est_date":"2026-06-25","ref_date":"2012-09-04","pct_analog":6.4618,"day_chg":-0.0921,"proj_spy":698.09,"pct_from_now":10.0937,"pct_from_anchor25":5.9273},{"day":151,"days_ahead":65,"est_date":"2026-06-26","ref_date":"2012-09-05","pct_analog":6.3713,"day_chg":-0.0851,"proj_spy":697.5,"pct_from_now":10.0,"pct_from_anchor25":5.8372},{"day":152,"days_ahead":66,"est_date":"2026-06-29","ref_date":"2012-09-06","pct_analog":8.5302,"day_chg":2.0297,"proj_spy":711.66,"pct_from_now":12.2326,"pct_from_anchor25":7.9854},{"day":153,"days_ahead":67,"est_date":"2026-06-30","ref_date":"2012-09-07","pct_analog":8.953,"day_chg":0.3895,"proj_spy":714.43,"pct_from_now":12.6698,"pct_from_anchor25":8.406},{"day":154,"days_ahead":68,"est_date":"2026-07-01","ref_date":"2012-09-10","pct_analog":8.334,"day_chg":-0.5681,"proj_spy":710.37,"pct_from_now":12.0297,"pct_from_anchor25":7.7901},{"day":155,"days_ahead":69,"est_date":"2026-07-02","ref_date":"2012-09-11","pct_analog":8.6359,"day_chg":0.2787,"proj_spy":712.35,"pct_from_now":12.3419,"pct_from_anchor25":8.0905},{"day":156,"days_ahead":70,"est_date":"2026-07-03","ref_date":"2012-09-12","pct_analog":8.9983,"day_chg":0.3335,"proj_spy":714.72,"pct_from_now":12.7166,"pct_from_anchor25":8.451},{"day":157,"days_ahead":71,"est_date":"2026-07-06","ref_date":"2012-09-13","pct_analog":10.659,"day_chg":1.5236,"proj_spy":725.61,"pct_from_now":14.434,"pct_from_anchor25":10.1034},{"day":158,"days_ahead":72,"est_date":"2026-07-07","ref_date":"2012-09-14","pct_analog":11.1497,"day_chg":0.4434,"proj_spy":728.83,"pct_from_now":14.9415,"pct_from_anchor25":10.5917},{"day":159,"days_ahead":73,"est_date":"2026-07-08","ref_date":"2012-09-17","pct_analog":10.7723,"day_chg":-0.3396,"proj_spy":726.36,"pct_from_now":14.5511,"pct_from_anchor25":10.2161},{"day":160,"days_ahead":74,"est_date":"2026-07-09","ref_date":"2012-09-18","pct_analog":10.6817,"day_chg":-0.0818,"proj_spy":725.76,"pct_from_now":14.4574,"pct_from_anchor25":10.126},{"day":161,"days_ahead":75,"est_date":"2026-07-10","ref_date":"2012-09-19","pct_analog":10.7421,"day_chg":0.0546,"proj_spy":726.16,"pct_from_now":14.5199,"pct_from_anchor25":10.1861},{"day":162,"days_ahead":76,"est_date":"2026-07-13","ref_date":"2012-09-20","pct_analog":10.7496,"day_chg":0.0068,"proj_spy":726.21,"pct_from_now":14.5277,"pct_from_anchor25":10.1936},{"day":163,"days_ahead":77,"est_date":"2026-07-14","ref_date":"2012-09-21","pct_analog":10.1155,"day_chg":-0.5726,"proj_spy":722.05,"pct_from_now":13.872,"pct_from_anchor25":9.5627},{"day":164,"days_ahead":78,"est_date":"2026-07-15","ref_date":"2012-09-24","pct_analog":9.9494,"day_chg":-0.1508,"proj_spy":720.96,"pct_from_now":13.7002,"pct_from_anchor25":9.3974},{"day":165,"days_ahead":79,"est_date":"2026-07-16","ref_date":"2012-09-25","pct_analog":8.7793,"day_chg":-1.0642,"proj_spy":713.29,"pct_from_now":12.4902,"pct_from_anchor25":8.2332},{"day":166,"days_ahead":80,"est_date":"2026-07-17","ref_date":"2012-09-26","pct_analog":8.1679,"day_chg":-0.5621,"proj_spy":709.28,"pct_from_now":11.8579,"pct_from_anchor25":7.6248},{"day":167,"days_ahead":81,"est_date":"2026-07-20","ref_date":"2012-09-27","pct_analog":9.187,"day_chg":0.9421,"proj_spy":715.96,"pct_from_now":12.9118,"pct_from_anchor25":8.6388},{"day":168,"days_ahead":82,"est_date":"2026-07-21","ref_date":"2012-09-28","pct_analog":8.6812,"day_chg":-0.4632,"proj_spy":712.65,"pct_from_now":12.3888,"pct_from_anchor25":8.1356},{"day":169,"days_ahead":83,"est_date":"2026-07-22","ref_date":"2012-10-01","pct_analog":8.9681,"day_chg":0.2639,"proj_spy":714.53,"pct_from_now":12.6854,"pct_from_anchor25":8.421},{"day":170,"days_ahead":84,"est_date":"2026-07-23","ref_date":"2012-10-02","pct_analog":9.0813,"day_chg":0.1039,"proj_spy":715.27,"pct_from_now":12.8025,"pct_from_anchor25":8.5337},{"day":171,"days_ahead":85,"est_date":"2026-07-24","ref_date":"2012-10-03","pct_analog":9.5267,"day_chg":0.4083,"proj_spy":718.19,"pct_from_now":13.2631,"pct_from_anchor25":8.9768},{"day":172,"days_ahead":86,"est_date":"2026-07-27","ref_date":"2012-10-04","pct_analog":10.3118,"day_chg":0.7168,"proj_spy":723.34,"pct_from_now":14.0749,"pct_from_anchor25":9.7579},{"day":173,"days_ahead":87,"est_date":"2026-07-28","ref_date":"2012-10-05","pct_analog":10.3193,"day_chg":0.0068,"proj_spy":723.39,"pct_from_now":14.0827,"pct_from_anchor25":9.7655},{"day":174,"days_ahead":88,"est_date":"2026-07-29","ref_date":"2012-10-08","pct_analog":9.9419,"day_chg":-0.3421,"proj_spy":720.91,"pct_from_now":13.6924,"pct_from_anchor25":9.3899},{"day":175,"days_ahead":89,"est_date":"2026-07-30","ref_date":"2012-10-09","pct_analog":8.8548,"day_chg":-0.9887,"proj_spy":713.78,"pct_from_now":12.5683,"pct_from_anchor25":8.3083},{"day":176,"days_ahead":90,"est_date":"2026-07-31","ref_date":"2012-10-10","pct_analog":8.1603,"day_chg":-0.638,"proj_spy":709.23,"pct_from_now":11.8501,"pct_from_anchor25":7.6173},{"day":177,"days_ahead":91,"est_date":"2026-08-03","ref_date":"2012-10-11","pct_analog":8.2207,"day_chg":0.0558,"proj_spy":709.63,"pct_from_now":11.9126,"pct_from_anchor25":7.6774},{"day":178,"days_ahead":92,"est_date":"2026-08-04","ref_date":"2012-10-12","pct_analog":7.8659,"day_chg":-0.3278,"proj_spy":707.3,"pct_from_now":11.5457,"pct_from_anchor25":7.3244},{"day":179,"days_ahead":93,"est_date":"2026-08-05","ref_date":"2012-10-15","pct_analog":8.7642,"day_chg":0.8328,"proj_spy":713.19,"pct_from_now":12.4746,"pct_from_anchor25":8.2182},{"day":180,"days_ahead":94,"est_date":"2026-08-06","ref_date":"2012-10-16","pct_analog":9.8664,"day_chg":1.0133,"proj_spy":720.42,"pct_from_now":13.6144,"pct_from_anchor25":9.3148},{"day":181,"days_ahead":95,"est_date":"2026-08-07","ref_date":"2012-10-17","pct_analog":10.3646,"day_chg":0.4535,"proj_spy":723.68,"pct_from_now":14.1296,"pct_from_anchor25":9.8105},{"day":182,"days_ahead":96,"est_date":"2026-08-10","ref_date":"2012-10-18","pct_analog":10.0778,"day_chg":-0.2599,"proj_spy":721.8,"pct_from_now":13.8329,"pct_from_anchor25":9.5251},{"day":183,"days_ahead":97,"est_date":"2026-08-11","ref_date":"2012-10-19","pct_analog":8.2434,"day_chg":-1.6664,"proj_spy":709.77,"pct_from_now":11.936,"pct_from_anchor25":7.6999},{"day":184,"days_ahead":98,"est_date":"2026-08-12","ref_date":"2012-10-22","pct_analog":8.2585,"day_chg":0.014,"proj_spy":709.87,"pct_from_now":11.9516,"pct_from_anchor25":7.715},{"day":185,"days_ahead":99,"est_date":"2026-08-13","ref_date":"2012-10-23","pct_analog":6.7562,"day_chg":-1.3876,"proj_spy":700.02,"pct_from_now":10.3981,"pct_from_anchor25":6.2203},{"day":186,"days_ahead":100,"est_date":"2026-08-14","ref_date":"2012-10-24","pct_analog":6.4543,"day_chg":-0.2828,"proj_spy":698.04,"pct_from_now":10.0859,"pct_from_anchor25":5.9198},{"day":187,"days_ahead":101,"est_date":"2026-08-17","ref_date":"2012-10-25","pct_analog":6.7638,"day_chg":0.2907,"proj_spy":700.07,"pct_from_now":10.4059,"pct_from_anchor25":6.2278},{"day":188,"days_ahead":102,"est_date":"2026-08-18","ref_date":"2012-10-26","pct_analog":6.7034,"day_chg":-0.0566,"proj_spy":699.68,"pct_from_now":10.3435,"pct_from_anchor25":6.1677},{"day":189,"days_ahead":103,"est_date":"2026-08-19","ref_date":"2012-10-31","pct_analog":6.7034,"day_chg":0.0,"proj_spy":699.68,"pct_from_now":10.3435,"pct_from_anchor25":6.1677},{"day":190,"days_ahead":104,"est_date":"2026-08-20","ref_date":"2012-11-01","pct_analog":7.8206,"day_chg":1.047,"proj_spy":707.0,"pct_from_now":11.4988,"pct_from_anchor25":7.2793},{"day":191,"days_ahead":105,"est_date":"2026-08-21","ref_date":"2012-11-02","pct_analog":6.8619,"day_chg":-0.8892,"proj_spy":700.72,"pct_from_now":10.5074,"pct_from_anchor25":6.3254},{"day":192,"days_ahead":106,"est_date":"2026-08-24","ref_date":"2012-11-05","pct_analog":7.0809,"day_chg":0.2049,"proj_spy":702.15,"pct_from_now":10.7338,"pct_from_anchor25":6.5432},{"day":193,"days_ahead":107,"est_date":"2026-08-25","ref_date":"2012-11-06","pct_analog":7.9188,"day_chg":0.7825,"proj_spy":707.65,"pct_from_now":11.6003,"pct_from_anchor25":7.377},{"day":194,"days_ahead":108,"est_date":"2026-08-26","ref_date":"2012-11-07","pct_analog":5.4729,"day_chg":-2.2664,"proj_spy":691.61,"pct_from_now":9.071,"pct_from_anchor25":4.9434},{"day":195,"days_ahead":109,"est_date":"2026-08-27","ref_date":"2012-11-08","pct_analog":4.2047,"day_chg":-1.2024,"proj_spy":683.29,"pct_from_now":7.7596,"pct_from_anchor25":3.6816},{"day":196,"days_ahead":110,"est_date":"2026-08-28","ref_date":"2012-11-09","pct_analog":4.2953,"day_chg":0.0869,"proj_spy":683.89,"pct_from_now":7.8532,"pct_from_anchor25":3.7717},{"day":197,"days_ahead":111,"est_date":"2026-08-31","ref_date":"2012-11-12","pct_analog":4.3784,"day_chg":0.0796,"proj_spy":684.43,"pct_from_now":7.9391,"pct_from_anchor25":3.8543},{"day":198,"days_ahead":112,"est_date":"2026-09-01","ref_date":"2012-11-13","pct_analog":4.016,"day_chg":-0.3472,"proj_spy":682.06,"pct_from_now":7.5644,"pct_from_anchor25":3.4938},{"day":199,"days_ahead":113,"est_date":"2026-09-02","ref_date":"2012-11-14","pct_analog":2.6119,"day_chg":-1.3499,"proj_spy":672.85,"pct_from_now":6.1124,"pct_from_anchor25":2.0967},{"day":200,"days_ahead":114,"est_date":"2026-09-03","ref_date":"2012-11-15","pct_analog":2.4383,"day_chg":-0.1692,"proj_spy":671.71,"pct_from_now":5.9329,"pct_from_anchor25":1.924},{"day":201,"days_ahead":115,"est_date":"2026-09-04","ref_date":"2012-11-16","pct_analog":2.9441,"day_chg":0.4937,"proj_spy":675.03,"pct_from_now":6.4559,"pct_from_anchor25":2.4272},{"day":202,"days_ahead":116,"est_date":"2026-09-07","ref_date":"2012-11-19","pct_analog":5.0276,"day_chg":2.0239,"proj_spy":688.69,"pct_from_now":8.6105,"pct_from_anchor25":4.5003},{"day":203,"days_ahead":117,"est_date":"2026-09-08","ref_date":"2012-11-20","pct_analog":5.0728,"day_chg":0.0431,"proj_spy":688.99,"pct_from_now":8.6573,"pct_from_anchor25":4.5453},{"day":204,"days_ahead":118,"est_date":"2026-09-09","ref_date":"2012-11-21","pct_analog":5.2691,"day_chg":0.1868,"proj_spy":690.27,"pct_from_now":8.8603,"pct_from_anchor25":4.7406},{"day":205,"days_ahead":119,"est_date":"2026-09-10","ref_date":"2012-11-23","pct_analog":6.7034,"day_chg":1.3625,"proj_spy":699.68,"pct_from_now":10.3435,"pct_from_anchor25":6.1677},{"day":206,"days_ahead":120,"est_date":"2026-09-11","ref_date":"2012-11-26","pct_analog":6.4769,"day_chg":-0.2122,"proj_spy":698.19,"pct_from_now":10.1093,"pct_from_anchor25":5.9424},{"day":207,"days_ahead":121,"est_date":"2026-09-14","ref_date":"2012-11-27","pct_analog":5.9334,"day_chg":-0.5105,"proj_spy":694.63,"pct_from_now":9.5472,"pct_from_anchor25":5.4016},{"day":208,"days_ahead":122,"est_date":"2026-09-15","ref_date":"2012-11-28","pct_analog":6.7864,"day_chg":0.8052,"proj_spy":700.22,"pct_from_now":10.4294,"pct_from_anchor25":6.2503},{"day":209,"days_ahead":123,"est_date":"2026-09-16","ref_date":"2012-11-29","pct_analog":7.2847,"day_chg":0.4666,"proj_spy":703.49,"pct_from_now":10.9446,"pct_from_anchor25":6.746},{"day":210,"days_ahead":124,"est_date":"2026-09-17","ref_date":"2012-11-30","pct_analog":7.3073,"day_chg":0.0211,"proj_spy":703.64,"pct_from_now":10.968,"pct_from_anchor25":6.7686},{"day":211,"days_ahead":125,"est_date":"2026-09-18","ref_date":"2012-12-03","pct_analog":6.7789,"day_chg":-0.4924,"proj_spy":700.17,"pct_from_now":10.4215,"pct_from_anchor25":6.2428},{"day":212,"days_ahead":126,"est_date":"2026-09-21","ref_date":"2012-12-04","pct_analog":6.6279,"day_chg":-0.1414,"proj_spy":699.18,"pct_from_now":10.2654,"pct_from_anchor25":6.0926},{"day":213,"days_ahead":127,"est_date":"2026-09-22","ref_date":"2012-12-05","pct_analog":6.8166,"day_chg":0.177,"proj_spy":700.42,"pct_from_now":10.4606,"pct_from_anchor25":6.2804},{"day":214,"days_ahead":128,"est_date":"2026-09-23","ref_date":"2012-12-06","pct_analog":7.179,"day_chg":0.3392,"proj_spy":702.8,"pct_from_now":10.8353,"pct_from_anchor25":6.6409},{"day":215,"days_ahead":129,"est_date":"2026-09-24","ref_date":"2012-12-07","pct_analog":7.5036,"day_chg":0.3029,"proj_spy":704.92,"pct_from_now":11.171,"pct_from_anchor25":6.9639},{"day":216,"days_ahead":130,"est_date":"2026-09-25","ref_date":"2012-12-10","pct_analog":7.5489,"day_chg":0.0421,"proj_spy":705.22,"pct_from_now":11.2178,"pct_from_anchor25":7.0089},{"day":217,"days_ahead":131,"est_date":"2026-09-28","ref_date":"2012-12-11","pct_analog":8.2811,"day_chg":0.6808,"proj_spy":710.02,"pct_from_now":11.975,"pct_from_anchor25":7.7375},{"day":218,"days_ahead":132,"est_date":"2026-09-29","ref_date":"2012-12-12","pct_analog":8.334,"day_chg":0.0488,"proj_spy":710.37,"pct_from_now":12.0297,"pct_from_anchor25":7.7901},{"day":219,"days_ahead":133,"est_date":"2026-09-30","ref_date":"2012-12-13","pct_analog":7.6697,"day_chg":-0.6132,"proj_spy":706.01,"pct_from_now":11.3427,"pct_from_anchor25":7.1291},{"day":220,"days_ahead":134,"est_date":"2026-10-01","ref_date":"2012-12-14","pct_analog":7.2696,"day_chg":-0.3716,"proj_spy":703.39,"pct_from_now":10.929,"pct_from_anchor25":6.731},{"day":221,"days_ahead":135,"est_date":"2026-10-02","ref_date":"2012-12-17","pct_analog":8.5302,"day_chg":1.1752,"proj_spy":711.66,"pct_from_now":12.2326,"pct_from_anchor25":7.9854},{"day":222,"days_ahead":136,"est_date":"2026-10-05","ref_date":"2012-12-18","pct_analog":9.738,"day_chg":1.1129,"proj_spy":719.58,"pct_from_now":13.4816,"pct_from_anchor25":9.1871},{"day":223,"days_ahead":137,"est_date":"2026-10-06","ref_date":"2012-12-19","pct_analog":8.9228,"day_chg":-0.7429,"proj_spy":714.23,"pct_from_now":12.6386,"pct_from_anchor25":8.3759},{"day":224,"days_ahead":138,"est_date":"2026-10-07","ref_date":"2012-12-20","pct_analog":9.5493,"day_chg":0.5752,"proj_spy":718.34,"pct_from_now":13.2865,"pct_from_anchor25":8.9993},{"day":225,"days_ahead":139,"est_date":"2026-10-08","ref_date":"2012-12-21","pct_analog":7.7904,"day_chg":-1.6056,"proj_spy":706.8,"pct_from_now":11.4676,"pct_from_anchor25":7.2493},{"day":226,"days_ahead":140,"est_date":"2026-10-09","ref_date":"2012-12-24","pct_analog":7.4583,"day_chg":-0.3081,"proj_spy":704.63,"pct_from_now":11.1241,"pct_from_anchor25":6.9188},{"day":227,"days_ahead":141,"est_date":"2026-10-12","ref_date":"2012-12-26","pct_analog":7.0054,"day_chg":-0.4215,"proj_spy":701.66,"pct_from_now":10.6557,"pct_from_anchor25":6.4681},{"day":228,"days_ahead":142,"est_date":"2026-10-13","ref_date":"2012-12-27","pct_analog":6.8619,"day_chg":-0.134,"proj_spy":700.72,"pct_from_now":10.5074,"pct_from_anchor25":6.3254},{"day":229,"days_ahead":143,"est_date":"2026-10-14","ref_date":"2012-12-28","pct_analog":5.707,"day_chg":-1.0808,"proj_spy":693.14,"pct_from_now":9.313,"pct_from_anchor25":5.1762},{"day":230,"days_ahead":144,"est_date":"2026-10-15","ref_date":"2012-12-31","pct_analog":7.5036,"day_chg":1.6996,"proj_spy":704.92,"pct_from_now":11.171,"pct_from_anchor25":6.9639},{"day":231,"days_ahead":145,"est_date":"2026-10-16","ref_date":"2013-01-02","pct_analog":10.2589,"day_chg":2.563,"proj_spy":722.99,"pct_from_now":14.0203,"pct_from_anchor25":9.7054},{"day":232,"days_ahead":146,"est_date":"2026-10-19","ref_date":"2013-01-03","pct_analog":10.0098,"day_chg":-0.2259,"proj_spy":721.36,"pct_from_now":13.7627,"pct_from_anchor25":9.4575},{"day":233,"days_ahead":147,"est_date":"2026-10-20","ref_date":"2013-01-04","pct_analog":10.4929,"day_chg":0.4392,"proj_spy":724.53,"pct_from_now":14.2623,"pct_from_anchor25":9.9382},{"day":234,"days_ahead":148,"est_date":"2026-10-21","ref_date":"2013-01-07","pct_analog":10.191,"day_chg":-0.2733,"proj_spy":722.55,"pct_from_now":13.95,"pct_from_anchor25":9.6378},{"day":235,"days_ahead":149,"est_date":"2026-10-22","ref_date":"2013-01-08","pct_analog":9.8739,"day_chg":-0.2877,"proj_spy":720.47,"pct_from_now":13.6222,"pct_from_anchor25":9.3223},{"day":236,"days_ahead":150,"est_date":"2026-10-23","ref_date":"2013-01-09","pct_analog":10.1532,"day_chg":0.2542,"proj_spy":722.3,"pct_from_now":13.911,"pct_from_anchor25":9.6002},{"day":237,"days_ahead":151,"est_date":"2026-10-26","ref_date":"2013-01-10","pct_analog":11.0289,"day_chg":0.795,"proj_spy":728.04,"pct_from_now":14.8165,"pct_from_anchor25":10.4715},{"day":238,"days_ahead":152,"est_date":"2026-10-27","ref_date":"2013-01-11","pct_analog":11.0214,"day_chg":-0.0068,"proj_spy":727.99,"pct_from_now":14.8087,"pct_from_anchor25":10.464},{"day":239,"days_ahead":153,"est_date":"2026-10-28","ref_date":"2013-01-14","pct_analog":10.9459,"day_chg":-0.068,"proj_spy":727.5,"pct_from_now":14.7307,"pct_from_anchor25":10.3889},{"day":240,"days_ahead":154,"est_date":"2026-10-29","ref_date":"2013-01-15","pct_analog":11.0214,"day_chg":0.068,"proj_spy":727.99,"pct_from_now":14.8087,"pct_from_anchor25":10.464},{"day":241,"days_ahead":155,"est_date":"2026-10-30","ref_date":"2013-01-16","pct_analog":11.0063,"day_chg":-0.0136,"proj_spy":727.89,"pct_from_now":14.7931,"pct_from_anchor25":10.449},{"day":242,"days_ahead":156,"est_date":"2026-11-02","ref_date":"2013-01-17","pct_analog":11.7234,"day_chg":0.646,"proj_spy":732.59,"pct_from_now":15.5347,"pct_from_anchor25":11.1625},{"day":243,"days_ahead":157,"est_date":"2026-11-03","ref_date":"2013-01-18","pct_analog":11.9725,"day_chg":0.223,"proj_spy":734.23,"pct_from_now":15.7923,"pct_from_anchor25":11.4104},{"day":244,"days_ahead":158,"est_date":"2026-11-04","ref_date":"2013-01-22","pct_analog":12.5764,"day_chg":0.5393,"proj_spy":738.19,"pct_from_now":16.4169,"pct_from_anchor25":12.0112},{"day":245,"days_ahead":159,"est_date":"2026-11-05","ref_date":"2013-01-23","pct_analog":12.7576,"day_chg":0.1609,"proj_spy":739.38,"pct_from_now":16.6042,"pct_from_anchor25":12.1915},{"day":246,"days_ahead":160,"est_date":"2026-11-06","ref_date":"2013-01-24","pct_analog":12.7878,"day_chg":0.0268,"proj_spy":739.57,"pct_from_now":16.6354,"pct_from_anchor25":12.2215},{"day":247,"days_ahead":161,"est_date":"2026-11-09","ref_date":"2013-01-25","pct_analog":13.4219,"day_chg":0.5622,"proj_spy":743.73,"pct_from_now":17.2912,"pct_from_anchor25":12.8525},{"day":248,"days_ahead":162,"est_date":"2026-11-10","ref_date":"2013-01-28","pct_analog":13.286,"day_chg":-0.1198,"proj_spy":742.84,"pct_from_now":17.1507,"pct_from_anchor25":12.7173},{"day":249,"days_ahead":163,"est_date":"2026-11-11","ref_date":"2013-01-29","pct_analog":13.7314,"day_chg":0.3931,"proj_spy":745.76,"pct_from_now":17.6112,"pct_from_anchor25":13.1604},{"day":250,"days_ahead":164,"est_date":"2026-11-12","ref_date":"2013-01-30","pct_analog":13.286,"day_chg":-0.3916,"proj_spy":742.84,"pct_from_now":17.1507,"pct_from_anchor25":12.7173},{"day":251,"days_ahead":165,"est_date":"2026-11-13","ref_date":"2013-01-31","pct_analog":13.0067,"day_chg":-0.2466,"proj_spy":741.01,"pct_from_now":16.8618,"pct_from_anchor25":12.4394},{"day":252,"days_ahead":166,"est_date":"2026-11-16","ref_date":"2013-02-01","pct_analog":14.1692,"day_chg":1.0287,"proj_spy":748.63,"pct_from_now":18.064,"pct_from_anchor25":13.5961}],"milestones":{"peak":{"day":252,"est_date":"2026-11-16","proj_spy":748.63,"pct_from_now":18.064,"label":"Peak","color":"#00ff88"},"yearend":{"day":252,"est_date":"2026-11-16","proj_spy":748.63,"pct_from_now":18.064,"label":"End (~1yr)","color":"var(--cyan)"}}},{"name":"2018 Analog","start_date":"2018-07-05","corr":0.7828,"rmse":1.636,"color":"#ff8800","anchor_price":273.11,"hist":[{"day":1,"date":"2018-07-05","close":273.11,"pct":0.0},{"day":2,"date":"2018-07-06","close":275.42,"pct":0.8458},{"day":3,"date":"2018-07-09","close":277.9,"pct":1.7539},{"day":4,"date":"2018-07-10","close":278.9,"pct":2.12},{"day":5,"date":"2018-07-11","close":276.86,"pct":1.3731},{"day":6,"date":"2018-07-12","close":279.37,"pct":2.2921},{"day":7,"date":"2018-07-13","close":279.59,"pct":2.3727},{"day":8,"date":"2018-07-16","close":279.34,"pct":2.2811},{"day":9,"date":"2018-07-17","close":280.47,"pct":2.6949},{"day":10,"date":"2018-07-18","close":281.06,"pct":2.9109},{"day":11,"date":"2018-07-19","close":280.0,"pct":2.5228},{"day":12,"date":"2018-07-20","close":279.68,"pct":2.4056},{"day":13,"date":"2018-07-23","close":280.2,"pct":2.596},{"day":14,"date":"2018-07-24","close":281.61,"pct":3.1123},{"day":15,"date":"2018-07-25","close":284.01,"pct":3.9911},{"day":16,"date":"2018-07-26","close":283.34,"pct":3.7457},{"day":17,"date":"2018-07-27","close":281.42,"pct":3.0427},{"day":18,"date":"2018-07-30","close":279.95,"pct":2.5045},{"day":19,"date":"2018-07-31","close":281.33,"pct":3.0098},{"day":20,"date":"2018-08-01","close":280.86,"pct":2.8377},{"day":21,"date":"2018-08-02","close":282.39,"pct":3.3979},{"day":22,"date":"2018-08-03","close":283.6,"pct":3.841},{"day":23,"date":"2018-08-06","close":284.64,"pct":4.2218},{"day":24,"date":"2018-08-07","close":285.58,"pct":4.5659},{"day":25,"date":"2018-08-08","close":285.46,"pct":4.522},{"day":26,"date":"2018-08-09","close":285.07,"pct":4.3792},{"day":27,"date":"2018-08-10","close":283.16,"pct":3.6798},{"day":28,"date":"2018-08-13","close":282.1,"pct":3.2917},{"day":29,"date":"2018-08-14","close":283.9,"pct":3.9508},{"day":30,"date":"2018-08-15","close":281.78,"pct":3.1746},{"day":31,"date":"2018-08-16","close":284.06,"pct":4.0094},{"day":32,"date":"2018-08-17","close":285.06,"pct":4.3755},{"day":33,"date":"2018-08-20","close":285.67,"pct":4.5989},{"day":34,"date":"2018-08-21","close":286.34,"pct":4.8442},{"day":35,"date":"2018-08-22","close":286.17,"pct":4.782},{"day":36,"date":"2018-08-23","close":285.79,"pct":4.6428},{"day":37,"date":"2018-08-24","close":287.51,"pct":5.2726},{"day":38,"date":"2018-08-27","close":289.78,"pct":6.1038},{"day":39,"date":"2018-08-28","close":289.92,"pct":6.155},{"day":40,"date":"2018-08-29","close":291.48,"pct":6.7262},{"day":41,"date":"2018-08-30","close":290.3,"pct":6.2942},{"day":42,"date":"2018-08-31","close":290.31,"pct":6.2978},{"day":43,"date":"2018-09-04","close":289.81,"pct":6.1148},{"day":44,"date":"2018-09-05","close":289.03,"pct":5.8292},{"day":45,"date":"2018-09-06","close":288.16,"pct":5.5106},{"day":46,"date":"2018-09-07","close":287.6,"pct":5.3056},{"day":47,"date":"2018-09-10","close":288.1,"pct":5.4886},{"day":48,"date":"2018-09-11","close":289.05,"pct":5.8365},{"day":49,"date":"2018-09-12","close":289.12,"pct":5.8621},{"day":50,"date":"2018-09-13","close":290.83,"pct":6.4882},{"day":51,"date":"2018-09-14","close":290.88,"pct":6.5065},{"day":52,"date":"2018-09-17","close":289.34,"pct":5.9427},{"day":53,"date":"2018-09-18","close":290.91,"pct":6.5175},{"day":54,"date":"2018-09-19","close":291.22,"pct":6.631},{"day":55,"date":"2018-09-20","close":293.58,"pct":7.4951},{"day":56,"date":"2018-09-21","close":291.99,"pct":6.913},{"day":57,"date":"2018-09-24","close":291.02,"pct":6.5578},{"day":58,"date":"2018-09-25","close":290.75,"pct":6.4589},{"day":59,"date":"2018-09-26","close":289.88,"pct":6.1404},{"day":60,"date":"2018-09-27","close":290.69,"pct":6.437},{"day":61,"date":"2018-09-28","close":290.72,"pct":6.448},{"day":62,"date":"2018-10-01","close":291.73,"pct":6.8178},{"day":63,"date":"2018-10-02","close":291.56,"pct":6.7555},{"day":64,"date":"2018-10-03","close":291.72,"pct":6.8141},{"day":65,"date":"2018-10-04","close":289.44,"pct":5.9793},{"day":66,"date":"2018-10-05","close":287.82,"pct":5.3861},{"day":67,"date":"2018-10-08","close":287.82,"pct":5.3861},{"day":68,"date":"2018-10-09","close":287.4,"pct":5.2323},{"day":69,"date":"2018-10-10","close":278.3,"pct":1.9003},{"day":70,"date":"2018-10-11","close":272.17,"pct":-0.3442},{"day":71,"date":"2018-10-12","close":275.95,"pct":1.0399},{"day":72,"date":"2018-10-15","close":274.4,"pct":0.4723},{"day":73,"date":"2018-10-16","close":280.4,"pct":2.6693},{"day":74,"date":"2018-10-17","close":280.45,"pct":2.6876},{"day":75,"date":"2018-10-18","close":276.4,"pct":1.2046},{"day":76,"date":"2018-10-19","close":276.25,"pct":1.1497},{"day":77,"date":"2018-10-22","close":275.01,"pct":0.6957},{"day":78,"date":"2018-10-23","close":273.61,"pct":0.1831},{"day":79,"date":"2018-10-24","close":265.32,"pct":-2.8523},{"day":80,"date":"2018-10-25","close":270.08,"pct":-1.1094},{"day":81,"date":"2018-10-26","close":265.33,"pct":-2.8487},{"day":82,"date":"2018-10-29","close":263.86,"pct":-3.3869},{"day":83,"date":"2018-10-30","close":267.77,"pct":-1.9553},{"day":84,"date":"2018-10-31","close":270.63,"pct":-0.9081},{"day":85,"date":"2018-11-01","close":273.51,"pct":0.1465},{"day":86,"date":"2018-11-02","close":271.89,"pct":-0.4467}],"proj":[{"day":87,"days_ahead":1,"est_date":"2026-03-30","ref_date":"2018-11-05","pct_analog":0.1025,"day_chg":0.5517,"proj_spy":637.59,"pct_from_now":0.5517,"pct_from_anchor25":-3.2535},{"day":88,"days_ahead":2,"est_date":"2026-03-31","ref_date":"2018-11-06","pct_analog":0.736,"day_chg":0.6328,"proj_spy":641.62,"pct_from_now":1.188,"pct_from_anchor25":-2.6413},{"day":89,"days_ahead":3,"est_date":"2026-04-01","ref_date":"2018-11-07","pct_analog":2.8926,"day_chg":2.1409,"proj_spy":655.36,"pct_from_now":3.3543,"pct_from_anchor25":-0.557},{"day":90,"days_ahead":4,"est_date":"2026-04-02","ref_date":"2018-11-08","pct_analog":2.7059,"day_chg":-0.1815,"proj_spy":654.17,"pct_from_now":3.1667,"pct_from_anchor25":-0.7375},{"day":91,"days_ahead":5,"est_date":"2026-04-03","ref_date":"2018-11-09","pct_analog":1.7026,"day_chg":-0.9768,"proj_spy":647.78,"pct_from_now":2.159,"pct_from_anchor25":-1.7071},{"day":92,"days_ahead":6,"est_date":"2026-04-06","ref_date":"2018-11-12","pct_analog":-0.1977,"day_chg":-1.8685,"proj_spy":635.68,"pct_from_now":0.2501,"pct_from_anchor25":-3.5437},{"day":93,"days_ahead":7,"est_date":"2026-04-07","ref_date":"2018-11-13","pct_analog":-0.3845,"day_chg":-0.1871,"proj_spy":634.49,"pct_from_now":0.0625,"pct_from_anchor25":-3.7242},{"day":94,"days_ahead":8,"est_date":"2026-04-08","ref_date":"2018-11-14","pct_analog":-1.0655,"day_chg":-0.6837,"proj_spy":630.15,"pct_from_now":-0.6216,"pct_from_anchor25":-4.3824},{"day":95,"days_ahead":9,"est_date":"2026-04-09","ref_date":"2018-11-15","pct_analog":-0.033,"day_chg":1.0437,"proj_spy":636.73,"pct_from_now":0.4156,"pct_from_anchor25":-3.3845},{"day":96,"days_ahead":10,"est_date":"2026-04-10","ref_date":"2018-11-16","pct_analog":0.227,"day_chg":0.2601,"proj_spy":638.38,"pct_from_now":0.6767,"pct_from_anchor25":-3.1332},{"day":97,"days_ahead":11,"est_date":"2026-04-13","ref_date":"2018-11-19","pct_analog":-1.4683,"day_chg":-1.6914,"proj_spy":627.58,"pct_from_now":-1.0262,"pct_from_anchor25":-4.7717},{"day":98,"days_ahead":12,"est_date":"2026-04-14","ref_date":"2018-11-20","pct_analog":-3.2917,"day_chg":-1.8506,"proj_spy":615.97,"pct_from_now":-2.8578,"pct_from_anchor25":-6.534},{"day":99,"days_ahead":13,"est_date":"2026-04-15","ref_date":"2018-11-21","pct_analog":-2.9622,"day_chg":0.3408,"proj_spy":618.07,"pct_from_now":-2.5268,"pct_from_anchor25":-6.2155},{"day":100,"days_ahead":14,"est_date":"2026-04-16","ref_date":"2018-11-23","pct_analog":-3.6103,"day_chg":-0.6679,"proj_spy":613.94,"pct_from_now":-3.1778,"pct_from_anchor25":-6.8419},{"day":101,"days_ahead":15,"est_date":"2026-04-17","ref_date":"2018-11-26","pct_analog":-2.0541,"day_chg":1.6144,"proj_spy":623.85,"pct_from_now":-1.6146,"pct_from_anchor25":-5.3379},{"day":102,"days_ahead":16,"est_date":"2026-04-20","ref_date":"2018-11-27","pct_analog":-1.7246,"day_chg":0.3364,"proj_spy":625.95,"pct_from_now":-1.2836,"pct_from_anchor25":-5.0194},{"day":103,"days_ahead":17,"est_date":"2026-04-21","ref_date":"2018-11-28","pct_analog":0.5382,"day_chg":2.3025,"proj_spy":640.36,"pct_from_now":0.9894,"pct_from_anchor25":-2.8324},{"day":104,"days_ahead":18,"est_date":"2026-04-22","ref_date":"2018-11-29","pct_analog":0.3186,"day_chg":-0.2185,"proj_spy":638.96,"pct_from_now":0.7687,"pct_from_anchor25":-3.0447},{"day":105,"days_ahead":19,"est_date":"2026-04-23","ref_date":"2018-11-30","pct_analog":0.93,"day_chg":0.6095,"proj_spy":642.86,"pct_from_now":1.3829,"pct_from_anchor25":-2.4538},{"day":106,"days_ahead":20,"est_date":"2026-04-24","ref_date":"2018-12-03","pct_analog":2.2665,"day_chg":1.3241,"proj_spy":651.37,"pct_from_now":2.7254,"pct_from_anchor25":-1.1621},{"day":107,"days_ahead":21,"est_date":"2026-04-27","ref_date":"2018-12-04","pct_analog":-1.0472,"day_chg":-3.2402,"proj_spy":630.27,"pct_from_now":-0.6032,"pct_from_anchor25":-4.3647},{"day":108,"days_ahead":22,"est_date":"2026-04-28","ref_date":"2018-12-06","pct_analog":-1.1973,"day_chg":-0.1517,"proj_spy":629.31,"pct_from_now":-0.754,"pct_from_anchor25":-4.5098},{"day":109,"days_ahead":23,"est_date":"2026-04-29","ref_date":"2018-12-07","pct_analog":-3.4931,"day_chg":-2.3236,"proj_spy":614.69,"pct_from_now":-3.0601,"pct_from_anchor25":-6.7286},{"day":110,"days_ahead":24,"est_date":"2026-04-30","ref_date":"2018-12-10","pct_analog":-3.31,"day_chg":0.1897,"proj_spy":615.85,"pct_from_now":-2.8762,"pct_from_anchor25":-6.5517},{"day":111,"days_ahead":25,"est_date":"2026-05-01","ref_date":"2018-12-11","pct_analog":-3.288,"day_chg":0.0227,"proj_spy":615.99,"pct_from_now":-2.8541,"pct_from_anchor25":-6.5304},{"day":112,"days_ahead":26,"est_date":"2026-05-04","ref_date":"2018-12-12","pct_analog":-2.8011,"day_chg":0.5035,"proj_spy":619.09,"pct_from_now":-2.3649,"pct_from_anchor25":-6.0598},{"day":113,"days_ahead":27,"est_date":"2026-05-05","ref_date":"2018-12-13","pct_analog":-2.834,"day_chg":-0.0339,"proj_spy":618.88,"pct_from_now":-2.398,"pct_from_anchor25":-6.0916},{"day":114,"days_ahead":28,"est_date":"2026-05-06","ref_date":"2018-12-14","pct_analog":-4.6282,"day_chg":-1.8465,"proj_spy":607.46,"pct_from_now":-4.2002,"pct_from_anchor25":-7.8256},{"day":115,"days_ahead":29,"est_date":"2026-05-07","ref_date":"2018-12-17","pct_analog":-6.4992,"day_chg":-1.9618,"proj_spy":595.54,"pct_from_now":-6.0797,"pct_from_anchor25":-9.6339},{"day":116,"days_ahead":30,"est_date":"2026-05-08","ref_date":"2018-12-18","pct_analog":-6.6017,"day_chg":-0.1096,"proj_spy":594.89,"pct_from_now":-6.1827,"pct_from_anchor25":-9.733},{"day":117,"days_ahead":31,"est_date":"2026-05-11","ref_date":"2018-12-19","pct_analog":-8.0004,"day_chg":-1.4976,"proj_spy":585.98,"pct_from_now":-7.5876,"pct_from_anchor25":-11.0848},{"day":118,"days_ahead":32,"est_date":"2026-05-12","ref_date":"2018-12-20","pct_analog":-9.498,"day_chg":-1.6278,"proj_spy":576.44,"pct_from_now":-9.0919,"pct_from_anchor25":-12.5322},{"day":119,"days_ahead":33,"est_date":"2026-05-13","ref_date":"2018-12-21","pct_analog":-11.867,"day_chg":-2.6176,"proj_spy":561.35,"pct_from_now":-11.4716,"pct_from_anchor25":-14.8218},{"day":120,"days_ahead":34,"est_date":"2026-05-14","ref_date":"2018-12-24","pct_analog":-14.1957,"day_chg":-2.6423,"proj_spy":546.52,"pct_from_now":-13.8107,"pct_from_anchor25":-17.0724},{"day":121,"days_ahead":35,"est_date":"2026-05-15","ref_date":"2018-12-26","pct_analog":-9.8605,"day_chg":5.0525,"proj_spy":574.13,"pct_from_now":-9.456,"pct_from_anchor25":-12.8825},{"day":122,"days_ahead":36,"est_date":"2026-05-18","ref_date":"2018-12-27","pct_analog":-9.1685,"day_chg":0.7677,"proj_spy":578.54,"pct_from_now":-8.7609,"pct_from_anchor25":-12.2137},{"day":123,"days_ahead":37,"est_date":"2026-05-19","ref_date":"2018-12-28","pct_analog":-9.2856,"day_chg":-0.129,"proj_spy":577.79,"pct_from_now":-8.8786,"pct_from_anchor25":-12.3269},{"day":124,"days_ahead":38,"est_date":"2026-05-20","ref_date":"2018-12-31","pct_analog":-8.4911,"day_chg":0.8759,"proj_spy":582.85,"pct_from_now":-8.0805,"pct_from_anchor25":-11.559},{"day":125,"days_ahead":39,"est_date":"2026-05-21","ref_date":"2019-01-02","pct_analog":-8.3959,"day_chg":0.104,"proj_spy":583.46,"pct_from_now":-7.9849,"pct_from_anchor25":-11.467},{"day":126,"days_ahead":40,"est_date":"2026-05-22","ref_date":"2019-01-03","pct_analog":-10.5818,"day_chg":-2.3863,"proj_spy":569.54,"pct_from_now":-10.1806,"pct_from_anchor25":-13.5797},{"day":127,"days_ahead":41,"est_date":"2026-05-25","ref_date":"2019-01-04","pct_analog":-7.5867,"day_chg":3.3496,"proj_spy":588.61,"pct_from_now":-7.172,"pct_from_anchor25":-10.685},{"day":128,"days_ahead":42,"est_date":"2026-05-26","ref_date":"2019-01-07","pct_analog":-6.858,"day_chg":0.7885,"proj_spy":593.25,"pct_from_now":-6.4401,"pct_from_anchor25":-9.9807},{"day":129,"days_ahead":43,"est_date":"2026-05-27","ref_date":"2019-01-08","pct_analog":-5.9829,"day_chg":0.9395,"proj_spy":598.83,"pct_from_now":-5.5611,"pct_from_anchor25":-9.135},{"day":130,"days_ahead":44,"est_date":"2026-05-28","ref_date":"2019-01-09","pct_analog":-5.5435,"day_chg":0.4673,"proj_spy":601.63,"pct_from_now":-5.1197,"pct_from_anchor25":-8.7103},{"day":131,"days_ahead":45,"est_date":"2026-05-29","ref_date":"2019-01-10","pct_analog":-5.2103,"day_chg":0.3528,"proj_spy":603.75,"pct_from_now":-4.785,"pct_from_anchor25":-8.3883},{"day":132,"days_ahead":46,"est_date":"2026-06-01","ref_date":"2019-01-11","pct_analog":-5.1737,"day_chg":0.0386,"proj_spy":603.98,"pct_from_now":-4.7482,"pct_from_anchor25":-8.3529},{"day":133,"days_ahead":47,"est_date":"2026-06-02","ref_date":"2019-01-14","pct_analog":-5.7523,"day_chg":-0.6101,"proj_spy":600.3,"pct_from_now":-5.3294,"pct_from_anchor25":-8.912},{"day":134,"days_ahead":48,"est_date":"2026-06-03","ref_date":"2019-01-15","pct_analog":-4.6721,"day_chg":1.1461,"proj_spy":607.18,"pct_from_now":-4.2444,"pct_from_anchor25":-7.8681},{"day":135,"days_ahead":49,"est_date":"2026-06-04","ref_date":"2019-01-16","pct_analog":-4.4414,"day_chg":0.242,"proj_spy":608.65,"pct_from_now":-4.0127,"pct_from_anchor25":-7.6452},{"day":136,"days_ahead":50,"est_date":"2026-06-05","ref_date":"2019-01-17","pct_analog":-3.7164,"day_chg":0.7587,"proj_spy":613.26,"pct_from_now":-3.2844,"pct_from_anchor25":-6.9445},{"day":137,"days_ahead":51,"est_date":"2026-06-08","ref_date":"2019-01-18","pct_analog":-2.4349,"day_chg":1.331,"proj_spy":621.43,"pct_from_now":-1.9971,"pct_from_anchor25":-5.7059},{"day":138,"days_ahead":52,"est_date":"2026-06-09","ref_date":"2019-01-22","pct_analog":-3.7531,"day_chg":-1.351,"proj_spy":613.03,"pct_from_now":-3.3212,"pct_from_anchor25":-6.9799},{"day":139,"days_ahead":53,"est_date":"2026-06-10","ref_date":"2019-01-23","pct_analog":-3.5517,"day_chg":0.2092,"proj_spy":614.31,"pct_from_now":-3.1189,"pct_from_anchor25":-6.7852},{"day":140,"days_ahead":54,"est_date":"2026-06-11","ref_date":"2019-01-24","pct_analog":-3.5004,"day_chg":0.0531,"proj_spy":614.64,"pct_from_now":-3.0674,"pct_from_anchor25":-6.7357},{"day":141,"days_ahead":55,"est_date":"2026-06-12","ref_date":"2019-01-25","pct_analog":-2.6839,"day_chg":0.8461,"proj_spy":619.84,"pct_from_now":-2.2472,"pct_from_anchor25":-5.9465},{"day":142,"days_ahead":56,"est_date":"2026-06-15","ref_date":"2019-01-28","pct_analog":-3.4235,"day_chg":-0.76,"proj_spy":615.13,"pct_from_now":-2.9902,"pct_from_anchor25":-6.6614},{"day":143,"days_ahead":57,"est_date":"2026-06-16","ref_date":"2019-01-29","pct_analog":-3.5517,"day_chg":-0.1327,"proj_spy":614.31,"pct_from_now":-3.1189,"pct_from_anchor25":-6.7852},{"day":144,"days_ahead":58,"est_date":"2026-06-17","ref_date":"2019-01-30","pct_analog":-2.0248,"day_chg":1.5831,"proj_spy":624.04,"pct_from_now":-1.5852,"pct_from_anchor25":-5.3096},{"day":145,"days_ahead":59,"est_date":"2026-06-18","ref_date":"2019-01-31","pct_analog":-1.1644,"day_chg":0.8782,"proj_spy":629.52,"pct_from_now":-0.7209,"pct_from_anchor25":-4.478},{"day":146,"days_ahead":60,"est_date":"2026-06-19","ref_date":"2019-02-01","pct_analog":-1.1168,"day_chg":0.0482,"proj_spy":629.82,"pct_from_now":-0.6731,"pct_from_anchor25":-4.432},{"day":147,"days_ahead":61,"est_date":"2026-06-22","ref_date":"2019-02-04","pct_analog":-0.4211,"day_chg":0.7035,"proj_spy":634.25,"pct_from_now":0.0257,"pct_from_anchor25":-3.7596},{"day":148,"days_ahead":62,"est_date":"2026-06-23","ref_date":"2019-02-05","pct_analog":-0.0037,"day_chg":0.4192,"proj_spy":636.91,"pct_from_now":0.445,"pct_from_anchor25":-3.3562},{"day":149,"days_ahead":63,"est_date":"2026-06-24","ref_date":"2019-02-06","pct_analog":-0.1355,"day_chg":-0.1318,"proj_spy":636.07,"pct_from_now":0.3126,"pct_from_anchor25":-3.4836},{"day":150,"days_ahead":64,"est_date":"2026-06-25","ref_date":"2019-02-07","pct_analog":-1.0875,"day_chg":-0.9533,"proj_spy":630.01,"pct_from_now":-0.6436,"pct_from_anchor25":-4.4036},{"day":151,"days_ahead":65,"est_date":"2026-06-26","ref_date":"2019-02-08","pct_analog":-0.9666,"day_chg":0.1222,"proj_spy":630.78,"pct_from_now":-0.5223,"pct_from_anchor25":-4.2869},{"day":152,"days_ahead":66,"est_date":"2026-06-29","ref_date":"2019-02-11","pct_analog":-0.9117,"day_chg":0.0555,"proj_spy":631.13,"pct_from_now":-0.4671,"pct_from_anchor25":-4.2338},{"day":153,"days_ahead":67,"est_date":"2026-06-30","ref_date":"2019-02-12","pct_analog":0.3625,"day_chg":1.2859,"proj_spy":639.24,"pct_from_now":0.8128,"pct_from_anchor25":-3.0023},{"day":154,"days_ahead":68,"est_date":"2026-07-01","ref_date":"2019-02-13","pct_analog":0.6884,"day_chg":0.3247,"proj_spy":641.32,"pct_from_now":1.1402,"pct_from_anchor25":-2.6873},{"day":155,"days_ahead":69,"est_date":"2026-07-02","ref_date":"2019-02-14","pct_analog":0.465,"day_chg":-0.2218,"proj_spy":639.9,"pct_from_now":0.9158,"pct_from_anchor25":-2.9032},{"day":156,"days_ahead":70,"est_date":"2026-07-03","ref_date":"2019-02-15","pct_analog":1.5598,"day_chg":1.0897,"proj_spy":646.87,"pct_from_now":2.0155,"pct_from_anchor25":-1.8451},{"day":157,"days_ahead":71,"est_date":"2026-07-06","ref_date":"2019-02-19","pct_analog":1.7356,"day_chg":0.1731,"proj_spy":647.99,"pct_from_now":2.1921,"pct_from_anchor25":-1.6752},{"day":158,"days_ahead":72,"est_date":"2026-07-07","ref_date":"2019-02-20","pct_analog":1.9406,"day_chg":0.2015,"proj_spy":649.3,"pct_from_now":2.398,"pct_from_anchor25":-1.4771},{"day":159,"days_ahead":73,"est_date":"2026-07-08","ref_date":"2019-02-21","pct_analog":1.5781,"day_chg":-0.3556,"proj_spy":646.99,"pct_from_now":2.0339,"pct_from_anchor25":-1.8274},{"day":160,"days_ahead":74,"est_date":"2026-07-09","ref_date":"2019-02-22","pct_analog":2.2079,"day_chg":0.62,"proj_spy":651.0,"pct_from_now":2.6665,"pct_from_anchor25":-1.2187},{"day":161,"days_ahead":75,"est_date":"2026-07-10","ref_date":"2019-02-25","pct_analog":2.347,"day_chg":0.1361,"proj_spy":651.88,"pct_from_now":2.8063,"pct_from_anchor25":-1.0843},{"day":162,"days_ahead":76,"est_date":"2026-07-13","ref_date":"2019-02-26","pct_analog":2.2738,"day_chg":-0.0715,"proj_spy":651.42,"pct_from_now":2.7327,"pct_from_anchor25":-1.155},{"day":163,"days_ahead":77,"est_date":"2026-07-14","ref_date":"2019-02-27","pct_analog":2.2299,"day_chg":-0.043,"proj_spy":651.14,"pct_from_now":2.6886,"pct_from_anchor25":-1.1975},{"day":164,"days_ahead":78,"est_date":"2026-07-15","ref_date":"2019-02-28","pct_analog":2.0395,"day_chg":-0.1863,"proj_spy":649.93,"pct_from_now":2.4973,"pct_from_anchor25":-1.3815},{"day":165,"days_ahead":79,"est_date":"2026-07-16","ref_date":"2019-03-01","pct_analog":2.6766,"day_chg":0.6244,"proj_spy":653.98,"pct_from_now":3.1373,"pct_from_anchor25":-0.7658},{"day":166,"days_ahead":80,"est_date":"2026-07-17","ref_date":"2019-03-04","pct_analog":2.3031,"day_chg":-0.3637,"proj_spy":651.6,"pct_from_now":2.7621,"pct_from_anchor25":-1.1267},{"day":167,"days_ahead":81,"est_date":"2026-07-20","ref_date":"2019-03-05","pct_analog":2.164,"day_chg":-0.136,"proj_spy":650.72,"pct_from_now":2.6224,"pct_from_anchor25":-1.2612},{"day":168,"days_ahead":82,"est_date":"2026-07-21","ref_date":"2019-03-06","pct_analog":1.5452,"day_chg":-0.6057,"proj_spy":646.78,"pct_from_now":2.0008,"pct_from_anchor25":-1.8593},{"day":169,"days_ahead":83,"est_date":"2026-07-22","ref_date":"2019-03-07","pct_analog":0.6957,"day_chg":-0.8365,"proj_spy":641.37,"pct_from_now":1.1475,"pct_from_anchor25":-2.6803},{"day":170,"days_ahead":84,"est_date":"2026-07-23","ref_date":"2019-03-08","pct_analog":0.4943,"day_chg":-0.2,"proj_spy":640.08,"pct_from_now":0.9452,"pct_from_anchor25":-2.8749},{"day":171,"days_ahead":85,"est_date":"2026-07-24","ref_date":"2019-03-11","pct_analog":1.9516,"day_chg":1.4501,"proj_spy":649.37,"pct_from_now":2.4091,"pct_from_anchor25":-1.4665},{"day":172,"days_ahead":86,"est_date":"2026-07-27","ref_date":"2019-03-12","pct_analog":2.3361,"day_chg":0.3771,"proj_spy":651.81,"pct_from_now":2.7952,"pct_from_anchor25":-1.0949},{"day":173,"days_ahead":87,"est_date":"2026-07-28","ref_date":"2019-03-13","pct_analog":3.0134,"day_chg":0.6619,"proj_spy":656.13,"pct_from_now":3.4757,"pct_from_anchor25":-0.4402},{"day":174,"days_ahead":88,"est_date":"2026-07-29","ref_date":"2019-03-14","pct_analog":2.9475,"day_chg":-0.064,"proj_spy":655.71,"pct_from_now":3.4095,"pct_from_anchor25":-0.5039},{"day":175,"days_ahead":89,"est_date":"2026-07-30","ref_date":"2019-03-15","pct_analog":3.0025,"day_chg":0.0533,"proj_spy":656.06,"pct_from_now":3.4646,"pct_from_anchor25":-0.4508},{"day":176,"days_ahead":90,"est_date":"2026-07-31","ref_date":"2019-03-18","pct_analog":3.3759,"day_chg":0.3626,"proj_spy":658.44,"pct_from_now":3.8398,"pct_from_anchor25":-0.0899},{"day":177,"days_ahead":91,"est_date":"2026-08-03","ref_date":"2019-03-19","pct_analog":3.4016,"day_chg":0.0248,"proj_spy":658.6,"pct_from_now":3.8655,"pct_from_anchor25":-0.0651},{"day":178,"days_ahead":92,"est_date":"2026-08-04","ref_date":"2019-03-20","pct_analog":3.0903,"day_chg":-0.301,"proj_spy":656.62,"pct_from_now":3.5529,"pct_from_anchor25":-0.3659},{"day":179,"days_ahead":93,"est_date":"2026-08-05","ref_date":"2019-03-21","pct_analog":4.2547,"day_chg":1.1295,"proj_spy":664.03,"pct_from_now":4.7225,"pct_from_anchor25":0.7594},{"day":180,"days_ahead":94,"est_date":"2026-08-06","ref_date":"2019-03-22","pct_analog":2.2482,"day_chg":-1.9246,"proj_spy":651.25,"pct_from_now":2.707,"pct_from_anchor25":-1.1798},{"day":181,"days_ahead":95,"est_date":"2026-08-07","ref_date":"2019-03-25","pct_analog":2.1713,"day_chg":-0.0752,"proj_spy":650.76,"pct_from_now":2.6297,"pct_from_anchor25":-1.2541},{"day":182,"days_ahead":96,"est_date":"2026-08-10","ref_date":"2019-03-26","pct_analog":2.9329,"day_chg":0.7454,"proj_spy":655.62,"pct_from_now":3.3947,"pct_from_anchor25":-0.5181},{"day":183,"days_ahead":97,"est_date":"2026-08-11","ref_date":"2019-03-27","pct_analog":2.3946,"day_chg":-0.5229,"proj_spy":652.19,"pct_from_now":2.8541,"pct_from_anchor25":-1.0383},{"day":184,"days_ahead":98,"est_date":"2026-08-12","ref_date":"2019-03-28","pct_analog":2.7828,"day_chg":0.379,"proj_spy":654.66,"pct_from_now":3.244,"pct_from_anchor25":-0.6632},{"day":185,"days_ahead":99,"est_date":"2026-08-13","ref_date":"2019-03-29","pct_analog":3.4309,"day_chg":0.6306,"proj_spy":658.79,"pct_from_now":3.895,"pct_from_anchor25":-0.0368},{"day":186,"days_ahead":100,"est_date":"2026-08-14","ref_date":"2019-04-01","pct_analog":4.6575,"day_chg":1.1859,"proj_spy":666.6,"pct_from_now":5.1271,"pct_from_anchor25":1.1487},{"day":187,"days_ahead":101,"est_date":"2026-08-17","ref_date":"2019-04-02","pct_analog":4.7087,"day_chg":0.049,"proj_spy":666.93,"pct_from_now":5.1786,"pct_from_anchor25":1.1982},{"day":188,"days_ahead":102,"est_date":"2026-08-18","ref_date":"2019-04-03","pct_analog":4.8735,"day_chg":0.1574,"proj_spy":667.98,"pct_from_now":5.3441,"pct_from_anchor25":1.3575},{"day":189,"days_ahead":103,"est_date":"2026-08-19","ref_date":"2019-04-04","pct_analog":5.1518,"day_chg":0.2653,"proj_spy":669.75,"pct_from_now":5.6236,"pct_from_anchor25":1.6264},{"day":190,"days_ahead":104,"est_date":"2026-08-20","ref_date":"2019-04-05","pct_analog":5.6607,"day_chg":0.484,"proj_spy":672.99,"pct_from_now":6.1348,"pct_from_anchor25":2.1183},{"day":191,"days_ahead":105,"est_date":"2026-08-21","ref_date":"2019-04-08","pct_analog":5.7413,"day_chg":0.0762,"proj_spy":673.5,"pct_from_now":6.2157,"pct_from_anchor25":2.1962},{"day":192,"days_ahead":106,"est_date":"2026-08-24","ref_date":"2019-04-09","pct_analog":5.1994,"day_chg":-0.5125,"proj_spy":670.05,"pct_from_now":5.6714,"pct_from_anchor25":1.6724},{"day":193,"days_ahead":107,"est_date":"2026-08-25","ref_date":"2019-04-10","pct_analog":5.5582,"day_chg":0.3411,"proj_spy":672.34,"pct_from_now":6.0318,"pct_from_anchor25":2.0192},{"day":194,"days_ahead":108,"est_date":"2026-08-26","ref_date":"2019-04-11","pct_analog":5.5289,"day_chg":-0.0278,"proj_spy":672.15,"pct_from_now":6.0024,"pct_from_anchor25":1.9909},{"day":195,"days_ahead":109,"est_date":"2026-08-27","ref_date":"2019-04-12","pct_analog":6.2429,"day_chg":0.6766,"proj_spy":676.7,"pct_from_now":6.7196,"pct_from_anchor25":2.681},{"day":196,"days_ahead":110,"est_date":"2026-08-28","ref_date":"2019-04-15","pct_analog":6.1733,"day_chg":-0.0655,"proj_spy":676.26,"pct_from_now":6.6497,"pct_from_anchor25":2.6137},{"day":197,"days_ahead":111,"est_date":"2026-08-31","ref_date":"2019-04-16","pct_analog":6.2429,"day_chg":0.0655,"proj_spy":676.7,"pct_from_now":6.7196,"pct_from_anchor25":2.681},{"day":198,"days_ahead":112,"est_date":"2026-09-01","ref_date":"2019-04-17","pct_analog":5.9829,"day_chg":-0.2447,"proj_spy":675.04,"pct_from_now":6.4585,"pct_from_anchor25":2.4297},{"day":199,"days_ahead":113,"est_date":"2026-09-02","ref_date":"2019-04-18","pct_analog":6.1916,"day_chg":0.1969,"proj_spy":676.37,"pct_from_now":6.6681,"pct_from_anchor25":2.6314},{"day":200,"days_ahead":114,"est_date":"2026-09-03","ref_date":"2019-04-22","pct_analog":6.2832,"day_chg":0.0862,"proj_spy":676.96,"pct_from_now":6.7601,"pct_from_anchor25":2.7199},{"day":201,"days_ahead":115,"est_date":"2026-09-04","ref_date":"2019-04-23","pct_analog":7.2388,"day_chg":0.8992,"proj_spy":683.04,"pct_from_now":7.72,"pct_from_anchor25":3.6435},{"day":202,"days_ahead":116,"est_date":"2026-09-07","ref_date":"2019-04-24","pct_analog":7.0009,"day_chg":-0.2219,"proj_spy":681.53,"pct_from_now":7.481,"pct_from_anchor25":3.4135},{"day":203,"days_ahead":117,"est_date":"2026-09-08","ref_date":"2019-04-25","pct_analog":6.9349,"day_chg":-0.0616,"proj_spy":681.11,"pct_from_now":7.4148,"pct_from_anchor25":3.3498},{"day":204,"days_ahead":118,"est_date":"2026-09-09","ref_date":"2019-04-26","pct_analog":7.4329,"day_chg":0.4657,"proj_spy":684.28,"pct_from_now":7.915,"pct_from_anchor25":3.8311},{"day":205,"days_ahead":119,"est_date":"2026-09-10","ref_date":"2019-04-29","pct_analog":7.6013,"day_chg":0.1568,"proj_spy":685.35,"pct_from_now":8.0841,"pct_from_anchor25":3.9939},{"day":206,"days_ahead":120,"est_date":"2026-09-11","ref_date":"2019-04-30","pct_analog":7.6563,"day_chg":0.051,"proj_spy":685.7,"pct_from_now":8.1393,"pct_from_anchor25":4.0469},{"day":207,"days_ahead":121,"est_date":"2026-09-14","ref_date":"2019-05-01","pct_analog":6.8471,"day_chg":-0.7516,"proj_spy":680.55,"pct_from_now":7.3265,"pct_from_anchor25":3.2649},{"day":208,"days_ahead":122,"est_date":"2026-09-15","ref_date":"2019-05-02","pct_analog":6.6164,"day_chg":-0.2159,"proj_spy":679.08,"pct_from_now":7.0948,"pct_from_anchor25":3.0419},{"day":209,"days_ahead":123,"est_date":"2026-09-16","ref_date":"2019-05-03","pct_analog":7.6599,"day_chg":0.9788,"proj_spy":685.72,"pct_from_now":8.143,"pct_from_anchor25":4.0505},{"day":210,"days_ahead":124,"est_date":"2026-09-17","ref_date":"2019-05-06","pct_analog":7.2169,"day_chg":-0.4115,"proj_spy":682.9,"pct_from_now":7.698,"pct_from_anchor25":3.6223},{"day":211,"days_ahead":125,"est_date":"2026-09-18","ref_date":"2019-05-07","pct_analog":5.4264,"day_chg":-1.67,"proj_spy":671.5,"pct_from_now":5.8994,"pct_from_anchor25":1.8918},{"day":212,"days_ahead":126,"est_date":"2026-09-21","ref_date":"2019-05-08","pct_analog":5.2799,"day_chg":-0.1389,"proj_spy":670.56,"pct_from_now":5.7523,"pct_from_anchor25":1.7503},{"day":213,"days_ahead":127,"est_date":"2026-09-22","ref_date":"2019-05-09","pct_analog":4.9614,"day_chg":-0.3026,"proj_spy":668.54,"pct_from_now":5.4323,"pct_from_anchor25":1.4424},{"day":214,"days_ahead":128,"est_date":"2026-09-23","ref_date":"2019-05-10","pct_analog":5.4886,"day_chg":0.5023,"proj_spy":671.89,"pct_from_now":5.962,"pct_from_anchor25":1.952},{"day":215,"days_ahead":129,"est_date":"2026-09-24","ref_date":"2019-05-13","pct_analog":2.8377,"day_chg":-2.513,"proj_spy":655.01,"pct_from_now":3.2991,"pct_from_anchor25":-0.6101},{"day":216,"days_ahead":130,"est_date":"2026-09-25","ref_date":"2019-05-14","pct_analog":3.7677,"day_chg":0.9044,"proj_spy":660.93,"pct_from_now":4.2333,"pct_from_anchor25":0.2888},{"day":217,"days_ahead":131,"est_date":"2026-09-28","ref_date":"2019-05-15","pct_analog":4.3755,"day_chg":0.5857,"proj_spy":664.8,"pct_from_now":4.8439,"pct_from_anchor25":0.8762},{"day":218,"days_ahead":132,"est_date":"2026-09-29","ref_date":"2019-05-16","pct_analog":5.3422,"day_chg":0.9261,"proj_spy":670.96,"pct_from_now":5.8149,"pct_from_anchor25":1.8104},{"day":219,"days_ahead":133,"est_date":"2026-09-30","ref_date":"2019-05-17","pct_analog":4.6611,"day_chg":-0.6465,"proj_spy":666.62,"pct_from_now":5.1307,"pct_from_anchor25":1.1522},{"day":220,"days_ahead":134,"est_date":"2026-10-01","ref_date":"2019-05-20","pct_analog":3.9691,"day_chg":-0.6612,"proj_spy":662.22,"pct_from_now":4.4356,"pct_from_anchor25":0.4834},{"day":221,"days_ahead":135,"est_date":"2026-10-02","ref_date":"2019-05-21","pct_analog":4.9065,"day_chg":0.9016,"proj_spy":668.19,"pct_from_now":5.3772,"pct_from_anchor25":1.3893},{"day":222,"days_ahead":136,"est_date":"2026-10-05","ref_date":"2019-05-22","pct_analog":4.5842,"day_chg":-0.3071,"proj_spy":666.13,"pct_from_now":5.0535,"pct_from_anchor25":1.0779},{"day":223,"days_ahead":137,"est_date":"2026-10-06","ref_date":"2019-05-23","pct_analog":3.3064,"day_chg":-1.2219,"proj_spy":657.99,"pct_from_now":3.7699,"pct_from_anchor25":-0.1571},{"day":224,"days_ahead":138,"est_date":"2026-10-07","ref_date":"2019-05-24","pct_analog":3.5407,"day_chg":0.2268,"proj_spy":659.49,"pct_from_now":4.0053,"pct_from_anchor25":0.0694},{"day":225,"days_ahead":139,"est_date":"2026-10-08","ref_date":"2019-05-28","pct_analog":2.5777,"day_chg":-0.9301,"proj_spy":653.35,"pct_from_now":3.038,"pct_from_anchor25":-0.8613},{"day":226,"days_ahead":140,"est_date":"2026-10-09","ref_date":"2019-05-29","pct_analog":1.8894,"day_chg":-0.6711,"proj_spy":648.97,"pct_from_now":2.3465,"pct_from_anchor25":-1.5266},{"day":227,"days_ahead":141,"est_date":"2026-10-12","ref_date":"2019-05-30","pct_analog":2.1676,"day_chg":0.2731,"proj_spy":650.74,"pct_from_now":2.6261,"pct_from_anchor25":-1.2577},{"day":228,"days_ahead":142,"est_date":"2026-10-13","ref_date":"2019-05-31","pct_analog":0.7909,"day_chg":-1.3475,"proj_spy":641.97,"pct_from_now":1.2431,"pct_from_anchor25":-2.5883},{"day":229,"days_ahead":143,"est_date":"2026-10-14","ref_date":"2019-06-03","pct_analog":0.5346,"day_chg":-0.2543,"proj_spy":640.34,"pct_from_now":0.9857,"pct_from_anchor25":-2.836},{"day":230,"days_ahead":144,"est_date":"2026-10-15","ref_date":"2019-06-04","pct_analog":2.7169,"day_chg":2.1707,"proj_spy":654.24,"pct_from_now":3.1777,"pct_from_anchor25":-0.7269},{"day":231,"days_ahead":145,"est_date":"2026-10-16","ref_date":"2019-06-05","pct_analog":3.6066,"day_chg":0.8662,"proj_spy":659.91,"pct_from_now":4.0715,"pct_from_anchor25":0.1331},{"day":232,"days_ahead":146,"est_date":"2026-10-19","ref_date":"2019-06-06","pct_analog":4.2803,"day_chg":0.6503,"proj_spy":664.2,"pct_from_now":4.7482,"pct_from_anchor25":0.7842},{"day":233,"days_ahead":147,"est_date":"2026-10-20","ref_date":"2019-06-07","pct_analog":5.3239,"day_chg":1.0007,"proj_spy":670.84,"pct_from_now":5.7965,"pct_from_anchor25":1.7927},{"day":234,"days_ahead":148,"est_date":"2026-10-21","ref_date":"2019-06-10","pct_analog":5.8072,"day_chg":0.4589,"proj_spy":673.92,"pct_from_now":6.2819,"pct_from_anchor25":2.2599},{"day":235,"days_ahead":149,"est_date":"2026-10-22","ref_date":"2019-06-11","pct_analog":5.7816,"day_chg":-0.0242,"proj_spy":673.76,"pct_from_now":6.2562,"pct_from_anchor25":2.2351},{"day":236,"days_ahead":150,"est_date":"2026-10-23","ref_date":"2019-06-12","pct_analog":5.5948,"day_chg":-0.1765,"proj_spy":672.57,"pct_from_now":6.0686,"pct_from_anchor25":2.0546},{"day":237,"days_ahead":151,"est_date":"2026-10-26","ref_date":"2019-06-13","pct_analog":6.0305,"day_chg":0.4126,"proj_spy":675.35,"pct_from_now":6.5063,"pct_from_anchor25":2.4757},{"day":238,"days_ahead":152,"est_date":"2026-10-27","ref_date":"2019-06-14","pct_analog":5.9134,"day_chg":-0.1105,"proj_spy":674.6,"pct_from_now":6.3886,"pct_from_anchor25":2.3625},{"day":239,"days_ahead":153,"est_date":"2026-10-28","ref_date":"2019-06-17","pct_analog":5.9536,"day_chg":0.038,"proj_spy":674.86,"pct_from_now":6.4291,"pct_from_anchor25":2.4014},{"day":240,"days_ahead":154,"est_date":"2026-10-29","ref_date":"2019-06-18","pct_analog":7.0631,"day_chg":1.0471,"proj_spy":681.92,"pct_from_now":7.5435,"pct_from_anchor25":3.4737},{"day":241,"days_ahead":155,"est_date":"2026-10-30","ref_date":"2019-06-19","pct_analog":7.3048,"day_chg":0.2257,"proj_spy":683.46,"pct_from_now":7.7862,"pct_from_anchor25":3.7072},{"day":242,"days_ahead":156,"est_date":"2026-11-02","ref_date":"2019-06-20","pct_analog":8.33,"day_chg":0.9554,"proj_spy":689.99,"pct_from_now":8.8161,"pct_from_anchor25":4.6981},{"day":243,"days_ahead":157,"est_date":"2026-11-03","ref_date":"2019-06-21","pct_analog":7.6489,"day_chg":-0.6287,"proj_spy":685.65,"pct_from_now":8.132,"pct_from_anchor25":4.0399},{"day":244,"days_ahead":158,"est_date":"2026-11-04","ref_date":"2019-06-24","pct_analog":7.5171,"day_chg":-0.1224,"proj_spy":684.81,"pct_from_now":7.9996,"pct_from_anchor25":3.9125},{"day":245,"days_ahead":159,"est_date":"2026-11-05","ref_date":"2019-06-25","pct_analog":6.4626,"day_chg":-0.9808,"proj_spy":678.1,"pct_from_now":6.9403,"pct_from_anchor25":2.8933},{"day":246,"days_ahead":160,"est_date":"2026-11-06","ref_date":"2019-06-26","pct_analog":6.3564,"day_chg":-0.0997,"proj_spy":677.42,"pct_from_now":6.8336,"pct_from_anchor25":2.7907},{"day":247,"days_ahead":161,"est_date":"2026-11-09","ref_date":"2019-06-27","pct_analog":6.7336,"day_chg":0.3546,"proj_spy":679.82,"pct_from_now":7.2125,"pct_from_anchor25":3.1552},{"day":248,"days_ahead":162,"est_date":"2026-11-10","ref_date":"2019-06-28","pct_analog":7.2828,"day_chg":0.5146,"proj_spy":683.32,"pct_from_now":7.7642,"pct_from_anchor25":3.686},{"day":249,"days_ahead":163,"est_date":"2026-11-11","ref_date":"2019-07-01","pct_analog":8.2568,"day_chg":0.9079,"proj_spy":689.53,"pct_from_now":8.7425,"pct_from_anchor25":4.6273},{"day":250,"days_ahead":164,"est_date":"2026-11-12","ref_date":"2019-07-02","pct_analog":8.5387,"day_chg":0.2604,"proj_spy":691.32,"pct_from_now":9.0257,"pct_from_anchor25":4.8998},{"day":251,"days_ahead":165,"est_date":"2026-11-13","ref_date":"2019-07-03","pct_analog":9.4065,"day_chg":0.7995,"proj_spy":696.85,"pct_from_now":9.8974,"pct_from_anchor25":5.7385},{"day":252,"days_ahead":166,"est_date":"2026-11-16","ref_date":"2019-07-05","pct_analog":9.282,"day_chg":-0.1138,"proj_spy":696.06,"pct_from_now":9.7723,"pct_from_anchor25":5.6182}],"milestones":{"peak":{"day":251,"est_date":"2026-11-13","proj_spy":696.85,"pct_from_now":9.8974,"label":"Peak","color":"#00ff88"},"trough":{"day":252,"est_date":"2026-11-16","proj_spy":696.06,"pct_from_now":9.7723,"label":"Trough","color":"#ff3355"},"yearend":{"day":252,"est_date":"2026-11-16","proj_spy":696.06,"pct_from_now":9.7723,"label":"End (~1yr)","color":"var(--cyan)"}}},{"name":"2007 Analog","start_date":"2007-04-17","corr":0.7855,"rmse":1.769,"color":"#8855ff","anchor_price":147.09,"hist":[{"day":1,"date":"2007-04-17","close":147.09,"pct":0.0},{"day":2,"date":"2007-04-18","close":147.27,"pct":0.1224},{"day":3,"date":"2007-04-19","close":147.23,"pct":0.0952},{"day":4,"date":"2007-04-20","close":148.62,"pct":1.0402},{"day":5,"date":"2007-04-23","close":148.06,"pct":0.6595},{"day":6,"date":"2007-04-24","close":148.12,"pct":0.7003},{"day":7,"date":"2007-04-25","close":149.48,"pct":1.6249},{"day":8,"date":"2007-04-26","close":149.65,"pct":1.7404},{"day":9,"date":"2007-04-27","close":149.53,"pct":1.6589},{"day":10,"date":"2007-04-30","close":148.29,"pct":0.8158},{"day":11,"date":"2007-05-01","close":148.67,"pct":1.0742},{"day":12,"date":"2007-05-02","close":149.54,"pct":1.6656},{"day":13,"date":"2007-05-03","close":150.35,"pct":2.2163},{"day":14,"date":"2007-05-04","close":150.92,"pct":2.6038},{"day":15,"date":"2007-05-07","close":150.95,"pct":2.6242},{"day":16,"date":"2007-05-08","close":150.75,"pct":2.4883},{"day":17,"date":"2007-05-09","close":151.16,"pct":2.767},{"day":18,"date":"2007-05-10","close":149.58,"pct":1.6928},{"day":19,"date":"2007-05-11","close":150.86,"pct":2.5631},{"day":20,"date":"2007-05-14","close":150.53,"pct":2.3387},{"day":21,"date":"2007-05-15","close":150.57,"pct":2.3659},{"day":22,"date":"2007-05-16","close":151.6,"pct":3.0662},{"day":23,"date":"2007-05-17","close":151.3,"pct":2.8622},{"day":24,"date":"2007-05-18","close":152.62,"pct":3.7596},{"day":25,"date":"2007-05-21","close":152.54,"pct":3.7052},{"day":26,"date":"2007-05-22","close":152.42,"pct":3.6236},{"day":27,"date":"2007-05-23","close":152.44,"pct":3.6372},{"day":28,"date":"2007-05-24","close":151.06,"pct":2.699},{"day":29,"date":"2007-05-25","close":151.69,"pct":3.1273},{"day":30,"date":"2007-05-29","close":152.24,"pct":3.5013},{"day":31,"date":"2007-05-30","close":153.48,"pct":4.3443},{"day":32,"date":"2007-05-31","close":153.32,"pct":4.2355},{"day":33,"date":"2007-06-01","close":154.08,"pct":4.7522},{"day":34,"date":"2007-06-04","close":154.1,"pct":4.7658},{"day":35,"date":"2007-06-05","close":153.49,"pct":4.3511},{"day":36,"date":"2007-06-06","close":151.84,"pct":3.2293},{"day":37,"date":"2007-06-07","close":149.1,"pct":1.3665},{"day":38,"date":"2007-06-08","close":151.04,"pct":2.6854},{"day":39,"date":"2007-06-11","close":151.3,"pct":2.8622},{"day":40,"date":"2007-06-12","close":149.65,"pct":1.7404},{"day":41,"date":"2007-06-13","close":151.89,"pct":3.2633},{"day":42,"date":"2007-06-14","close":152.86,"pct":3.9228},{"day":43,"date":"2007-06-15","close":153.07,"pct":4.0655},{"day":44,"date":"2007-06-18","close":152.89,"pct":3.9432},{"day":45,"date":"2007-06-19","close":153.27,"pct":4.2015},{"day":46,"date":"2007-06-20","close":151.14,"pct":2.7534},{"day":47,"date":"2007-06-21","close":151.98,"pct":3.3245},{"day":48,"date":"2007-06-22","close":150.55,"pct":2.3523},{"day":49,"date":"2007-06-25","close":149.83,"pct":1.8628},{"day":50,"date":"2007-06-26","close":148.29,"pct":0.8158},{"day":51,"date":"2007-06-27","close":150.4,"pct":2.2503},{"day":52,"date":"2007-06-28","close":150.38,"pct":2.2367},{"day":53,"date":"2007-06-29","close":150.43,"pct":2.2707},{"day":54,"date":"2007-07-02","close":151.79,"pct":3.1953},{"day":55,"date":"2007-07-03","close":152.34,"pct":3.5692},{"day":56,"date":"2007-07-05","close":152.18,"pct":3.4605},{"day":57,"date":"2007-07-06","close":152.98,"pct":4.0044},{"day":58,"date":"2007-07-09","close":153.1,"pct":4.0859},{"day":59,"date":"2007-07-10","close":150.92,"pct":2.6038},{"day":60,"date":"2007-07-11","close":151.99,"pct":3.3313},{"day":61,"date":"2007-07-12","close":154.39,"pct":4.963},{"day":62,"date":"2007-07-13","close":154.85,"pct":5.2757},{"day":63,"date":"2007-07-16","close":154.83,"pct":5.2621},{"day":64,"date":"2007-07-17","close":154.75,"pct":5.2077},{"day":65,"date":"2007-07-18","close":154.47,"pct":5.0173},{"day":66,"date":"2007-07-19","close":155.07,"pct":5.4253},{"day":67,"date":"2007-07-20","close":153.5,"pct":4.3579},{"day":68,"date":"2007-07-23","close":153.97,"pct":4.6774},{"day":69,"date":"2007-07-24","close":151.3,"pct":2.8622},{"day":70,"date":"2007-07-25","close":151.61,"pct":3.073},{"day":71,"date":"2007-07-26","close":148.02,"pct":0.6323},{"day":72,"date":"2007-07-27","close":145.11,"pct":-1.3461},{"day":73,"date":"2007-07-30","close":147.38,"pct":0.1972},{"day":74,"date":"2007-07-31","close":145.72,"pct":-0.9314},{"day":75,"date":"2007-08-01","close":146.43,"pct":-0.4487},{"day":76,"date":"2007-08-02","close":147.6,"pct":0.3467},{"day":77,"date":"2007-08-03","close":143.8,"pct":-2.2367},{"day":78,"date":"2007-08-06","close":146.21,"pct":-0.5983},{"day":79,"date":"2007-08-07","close":147.77,"pct":0.4623},{"day":80,"date":"2007-08-08","close":149.83,"pct":1.8628},{"day":81,"date":"2007-08-09","close":145.39,"pct":-1.1558},{"day":82,"date":"2007-08-10","close":144.71,"pct":-1.618},{"day":83,"date":"2007-08-13","close":145.23,"pct":-1.2645},{"day":84,"date":"2007-08-14","close":143.01,"pct":-2.7738},{"day":85,"date":"2007-08-15","close":141.04,"pct":-4.1131},{"day":86,"date":"2007-08-16","close":142.1,"pct":-3.3925}],"proj":[{"day":87,"days_ahead":1,"est_date":"2026-03-30","ref_date":"2007-08-17","pct_analog":-1.618,"day_chg":1.8367,"proj_spy":645.74,"pct_from_now":1.8367,"pct_from_anchor25":-2.0171},{"day":88,"days_ahead":2,"est_date":"2026-03-31","ref_date":"2007-08-20","pct_analog":-1.6656,"day_chg":-0.0484,"proj_spy":645.42,"pct_from_now":1.7875,"pct_from_anchor25":-2.0645},{"day":89,"days_ahead":3,"est_date":"2026-04-01","ref_date":"2007-08-21","pct_analog":-1.4685,"day_chg":0.2005,"proj_spy":646.72,"pct_from_now":1.9915,"pct_from_anchor25":-1.8682},{"day":90,"days_ahead":4,"est_date":"2026-04-02","ref_date":"2007-08-22","pct_analog":-0.2991,"day_chg":1.1868,"proj_spy":654.39,"pct_from_now":3.202,"pct_from_anchor25":-0.7036},{"day":91,"days_ahead":5,"est_date":"2026-04-03","ref_date":"2007-08-23","pct_analog":-0.3875,"day_chg":-0.0886,"proj_spy":653.81,"pct_from_now":3.1105,"pct_from_anchor25":-0.7916},{"day":92,"days_ahead":6,"est_date":"2026-04-06","ref_date":"2007-08-24","pct_analog":0.843,"day_chg":1.2353,"proj_spy":661.89,"pct_from_now":4.3842,"pct_from_anchor25":0.434},{"day":93,"days_ahead":7,"est_date":"2026-04-07","ref_date":"2007-08-27","pct_analog":-0.0952,"day_chg":-0.9304,"proj_spy":655.73,"pct_from_now":3.4131,"pct_from_anchor25":-0.5004},{"day":94,"days_ahead":8,"est_date":"2026-04-08","ref_date":"2007-08-28","pct_analog":-2.2911,"day_chg":-2.198,"proj_spy":641.32,"pct_from_now":1.14,"pct_from_anchor25":-2.6875},{"day":95,"days_ahead":9,"est_date":"2026-04-09","ref_date":"2007-08-29","pct_analog":-0.3739,"day_chg":1.9621,"proj_spy":653.9,"pct_from_now":3.1246,"pct_from_anchor25":-0.778},{"day":96,"days_ahead":10,"est_date":"2026-04-10","ref_date":"2007-08-30","pct_analog":-0.6391,"day_chg":-0.2661,"proj_spy":652.16,"pct_from_now":2.8501,"pct_from_anchor25":-1.0421},{"day":97,"days_ahead":11,"est_date":"2026-04-13","ref_date":"2007-08-31","pct_analog":0.3399,"day_chg":0.9853,"proj_spy":658.59,"pct_from_now":3.8635,"pct_from_anchor25":-0.0671},{"day":98,"days_ahead":12,"est_date":"2026-04-14","ref_date":"2007-09-04","pct_analog":1.3529,"day_chg":1.0096,"proj_spy":665.24,"pct_from_now":4.912,"pct_from_anchor25":0.9418},{"day":99,"days_ahead":13,"est_date":"2026-04-15","ref_date":"2007-09-05","pct_analog":0.4759,"day_chg":-0.8653,"proj_spy":659.48,"pct_from_now":4.0042,"pct_from_anchor25":0.0683},{"day":100,"days_ahead":14,"est_date":"2026-04-16","ref_date":"2007-09-06","pct_analog":0.7071,"day_chg":0.2301,"proj_spy":661.0,"pct_from_now":4.2435,"pct_from_anchor25":0.2986},{"day":101,"days_ahead":15,"est_date":"2026-04-17","ref_date":"2007-09-07","pct_analog":-0.6934,"day_chg":-1.3907,"proj_spy":651.81,"pct_from_now":2.7938,"pct_from_anchor25":-1.0963},{"day":102,"days_ahead":16,"est_date":"2026-04-20","ref_date":"2007-09-10","pct_analog":-0.8838,"day_chg":-0.1917,"proj_spy":650.56,"pct_from_now":2.5968,"pct_from_anchor25":-1.2859},{"day":103,"days_ahead":17,"est_date":"2026-04-21","ref_date":"2007-09-11","pct_analog":0.2719,"day_chg":1.1661,"proj_spy":658.14,"pct_from_now":3.7931,"pct_from_anchor25":-0.1348},{"day":104,"days_ahead":18,"est_date":"2026-04-22","ref_date":"2007-09-12","pct_analog":0.5303,"day_chg":0.2576,"proj_spy":659.84,"pct_from_now":4.0605,"pct_from_anchor25":0.1225},{"day":105,"days_ahead":19,"est_date":"2026-04-23","ref_date":"2007-09-13","pct_analog":1.2373,"day_chg":0.7033,"proj_spy":664.48,"pct_from_now":4.7924,"pct_from_anchor25":0.8267},{"day":106,"days_ahead":20,"est_date":"2026-04-24","ref_date":"2007-09-14","pct_analog":1.2305,"day_chg":-0.0067,"proj_spy":664.43,"pct_from_now":4.7854,"pct_from_anchor25":0.8199},{"day":107,"days_ahead":21,"est_date":"2026-04-27","ref_date":"2007-09-17","pct_analog":0.6867,"day_chg":-0.5373,"proj_spy":660.86,"pct_from_now":4.2224,"pct_from_anchor25":0.2782},{"day":108,"days_ahead":22,"est_date":"2026-04-28","ref_date":"2007-09-18","pct_analog":3.6508,"day_chg":2.944,"proj_spy":680.32,"pct_from_now":7.2906,"pct_from_anchor25":3.2304},{"day":109,"days_ahead":23,"est_date":"2026-04-29","ref_date":"2007-09-19","pct_analog":4.2627,"day_chg":0.5903,"proj_spy":684.34,"pct_from_now":7.924,"pct_from_anchor25":3.8398},{"day":110,"days_ahead":24,"est_date":"2026-04-30","ref_date":"2007-09-20","pct_analog":3.5285,"day_chg":-0.7042,"proj_spy":679.52,"pct_from_now":7.164,"pct_from_anchor25":3.1085},{"day":111,"days_ahead":25,"est_date":"2026-05-01","ref_date":"2007-09-21","pct_analog":3.3177,"day_chg":-0.2036,"proj_spy":678.13,"pct_from_now":6.9458,"pct_from_anchor25":2.8986},{"day":112,"days_ahead":26,"est_date":"2026-05-04","ref_date":"2007-09-24","pct_analog":3.1273,"day_chg":-0.1842,"proj_spy":676.88,"pct_from_now":6.7488,"pct_from_anchor25":2.709},{"day":113,"days_ahead":27,"est_date":"2026-05-05","ref_date":"2007-09-25","pct_analog":2.9234,"day_chg":-0.1978,"proj_spy":675.54,"pct_from_now":6.5376,"pct_from_anchor25":2.5059},{"day":114,"days_ahead":28,"est_date":"2026-05-06","ref_date":"2007-09-26","pct_analog":3.4673,"day_chg":0.5284,"proj_spy":679.11,"pct_from_now":7.1006,"pct_from_anchor25":3.0476},{"day":115,"days_ahead":29,"est_date":"2026-05-07","ref_date":"2007-09-27","pct_analog":4.0791,"day_chg":0.5914,"proj_spy":683.13,"pct_from_now":7.734,"pct_from_anchor25":3.657},{"day":116,"days_ahead":30,"est_date":"2026-05-08","ref_date":"2007-09-28","pct_analog":3.7324,"day_chg":-0.3331,"proj_spy":680.85,"pct_from_now":7.3751,"pct_from_anchor25":3.3116},{"day":117,"days_ahead":31,"est_date":"2026-05-11","ref_date":"2007-10-01","pct_analog":4.9018,"day_chg":1.1273,"proj_spy":688.53,"pct_from_now":8.5855,"pct_from_anchor25":4.4762},{"day":118,"days_ahead":32,"est_date":"2026-05-12","ref_date":"2007-10-02","pct_analog":4.759,"day_chg":-0.1361,"proj_spy":687.59,"pct_from_now":8.4377,"pct_from_anchor25":4.3341},{"day":119,"days_ahead":33,"est_date":"2026-05-13","ref_date":"2007-10-03","pct_analog":4.5482,"day_chg":-0.2012,"proj_spy":686.21,"pct_from_now":8.2196,"pct_from_anchor25":4.1242},{"day":120,"days_ahead":34,"est_date":"2026-05-14","ref_date":"2007-10-04","pct_analog":4.7114,"day_chg":0.1561,"proj_spy":687.28,"pct_from_now":8.3885,"pct_from_anchor25":4.2867},{"day":121,"days_ahead":35,"est_date":"2026-05-15","ref_date":"2007-10-05","pct_analog":5.9555,"day_chg":1.1882,"proj_spy":695.45,"pct_from_now":9.6763,"pct_from_anchor25":5.5257},{"day":122,"days_ahead":36,"est_date":"2026-05-18","ref_date":"2007-10-08","pct_analog":5.3913,"day_chg":-0.5326,"proj_spy":691.74,"pct_from_now":9.0922,"pct_from_anchor25":4.9638},{"day":123,"days_ahead":37,"est_date":"2026-05-19","ref_date":"2007-10-09","pct_analog":6.3838,"day_chg":0.9418,"proj_spy":698.26,"pct_from_now":10.1196,"pct_from_anchor25":5.9523},{"day":124,"days_ahead":38,"est_date":"2026-05-20","ref_date":"2007-10-10","pct_analog":6.2071,"day_chg":-0.1662,"proj_spy":697.1,"pct_from_now":9.9367,"pct_from_anchor25":5.7763},{"day":125,"days_ahead":39,"est_date":"2026-05-21","ref_date":"2007-10-11","pct_analog":5.6972,"day_chg":-0.4801,"proj_spy":693.75,"pct_from_now":9.4089,"pct_from_anchor25":5.2684},{"day":126,"days_ahead":40,"est_date":"2026-05-22","ref_date":"2007-10-12","pct_analog":6.2819,"day_chg":0.5532,"proj_spy":697.59,"pct_from_now":10.0141,"pct_from_anchor25":5.8508},{"day":127,"days_ahead":41,"est_date":"2026-05-25","ref_date":"2007-10-15","pct_analog":5.3845,"day_chg":-0.8444,"proj_spy":691.7,"pct_from_now":9.0851,"pct_from_anchor25":4.957},{"day":128,"days_ahead":42,"est_date":"2026-05-26","ref_date":"2007-10-16","pct_analog":4.5482,"day_chg":-0.7935,"proj_spy":686.21,"pct_from_now":8.2196,"pct_from_anchor25":4.1242},{"day":129,"days_ahead":43,"est_date":"2026-05-27","ref_date":"2007-10-17","pct_analog":4.8678,"day_chg":0.3056,"proj_spy":688.31,"pct_from_now":8.5503,"pct_from_anchor25":4.4424},{"day":130,"days_ahead":44,"est_date":"2026-05-28","ref_date":"2007-10-18","pct_analog":4.4871,"day_chg":-0.363,"proj_spy":685.81,"pct_from_now":8.1562,"pct_from_anchor25":4.0632},{"day":131,"days_ahead":45,"est_date":"2026-05-29","ref_date":"2007-10-19","pct_analog":1.754,"day_chg":-2.6157,"proj_spy":667.87,"pct_from_now":5.3272,"pct_from_anchor25":1.3413},{"day":132,"days_ahead":46,"est_date":"2026-06-01","ref_date":"2007-10-22","pct_analog":2.3455,"day_chg":0.5813,"proj_spy":671.75,"pct_from_now":5.9395,"pct_from_anchor25":1.9303},{"day":133,"days_ahead":47,"est_date":"2026-06-02","ref_date":"2007-10-23","pct_analog":3.1749,"day_chg":0.8104,"proj_spy":677.2,"pct_from_now":6.798,"pct_from_anchor25":2.7564},{"day":134,"days_ahead":48,"est_date":"2026-06-03","ref_date":"2007-10-24","pct_analog":2.9846,"day_chg":-0.1845,"proj_spy":675.95,"pct_from_now":6.601,"pct_from_anchor25":2.5668},{"day":135,"days_ahead":49,"est_date":"2026-06-04","ref_date":"2007-10-25","pct_analog":3.2293,"day_chg":0.2377,"proj_spy":677.55,"pct_from_now":6.8543,"pct_from_anchor25":2.8106},{"day":136,"days_ahead":50,"est_date":"2026-06-05","ref_date":"2007-10-26","pct_analog":4.4395,"day_chg":1.1723,"proj_spy":685.5,"pct_from_now":8.107,"pct_from_anchor25":4.0158},{"day":137,"days_ahead":51,"est_date":"2026-06-08","ref_date":"2007-10-29","pct_analog":4.7862,"day_chg":0.332,"proj_spy":687.77,"pct_from_now":8.4659,"pct_from_anchor25":4.3611},{"day":138,"days_ahead":52,"est_date":"2026-06-09","ref_date":"2007-10-30","pct_analog":4.0587,"day_chg":-0.6942,"proj_spy":683.0,"pct_from_now":7.7129,"pct_from_anchor25":3.6366},{"day":139,"days_ahead":53,"est_date":"2026-06-10","ref_date":"2007-10-31","pct_analog":5.1397,"day_chg":1.0388,"proj_spy":690.09,"pct_from_now":8.8318,"pct_from_anchor25":4.7132},{"day":140,"days_ahead":54,"est_date":"2026-06-11","ref_date":"2007-11-01","pct_analog":2.6786,"day_chg":-2.3408,"proj_spy":673.94,"pct_from_now":6.2843,"pct_from_anchor25":2.2621},{"day":141,"days_ahead":55,"est_date":"2026-06-12","ref_date":"2007-11-02","pct_analog":2.7942,"day_chg":0.1126,"proj_spy":674.7,"pct_from_now":6.4039,"pct_from_anchor25":2.3772},{"day":142,"days_ahead":56,"est_date":"2026-06-15","ref_date":"2007-11-05","pct_analog":2.0124,"day_chg":-0.7606,"proj_spy":669.57,"pct_from_now":5.5946,"pct_from_anchor25":1.5986},{"day":143,"days_ahead":57,"est_date":"2026-06-16","ref_date":"2007-11-06","pct_analog":3.3857,"day_chg":1.3462,"proj_spy":678.58,"pct_from_now":7.0162,"pct_from_anchor25":2.9663},{"day":144,"days_ahead":58,"est_date":"2026-06-17","ref_date":"2007-11-07","pct_analog":0.5575,"day_chg":-2.7356,"proj_spy":660.02,"pct_from_now":4.0887,"pct_from_anchor25":0.1496},{"day":145,"days_ahead":59,"est_date":"2026-06-18","ref_date":"2007-11-08","pct_analog":0.0476,"day_chg":-0.5071,"proj_spy":656.67,"pct_from_now":3.5609,"pct_from_anchor25":-0.3582},{"day":146,"days_ahead":60,"est_date":"2026-06-19","ref_date":"2007-11-09","pct_analog":-1.3257,"day_chg":-1.3727,"proj_spy":647.66,"pct_from_now":2.1393,"pct_from_anchor25":-1.726},{"day":147,"days_ahead":61,"est_date":"2026-06-22","ref_date":"2007-11-12","pct_analog":-2.3047,"day_chg":-0.9921,"proj_spy":641.23,"pct_from_now":1.126,"pct_from_anchor25":-2.701},{"day":148,"days_ahead":62,"est_date":"2026-06-23","ref_date":"2007-11-13","pct_analog":0.6731,"day_chg":3.048,"proj_spy":660.77,"pct_from_now":4.2083,"pct_from_anchor25":0.2647},{"day":149,"days_ahead":63,"est_date":"2026-06-24","ref_date":"2007-11-14","pct_analog":0.3943,"day_chg":-0.2769,"proj_spy":658.94,"pct_from_now":3.9198,"pct_from_anchor25":-0.0129},{"day":150,"days_ahead":64,"est_date":"2026-06-25","ref_date":"2007-11-15","pct_analog":-1.0538,"day_chg":-1.4424,"proj_spy":649.44,"pct_from_now":2.4208,"pct_from_anchor25":-1.4551},{"day":151,"days_ahead":65,"est_date":"2026-06-26","ref_date":"2007-11-16","pct_analog":-0.8838,"day_chg":0.1718,"proj_spy":650.56,"pct_from_now":2.5968,"pct_from_anchor25":-1.2859},{"day":152,"days_ahead":66,"est_date":"2026-06-29","ref_date":"2007-11-19","pct_analog":-2.2639,"day_chg":-1.3924,"proj_spy":641.5,"pct_from_now":1.1682,"pct_from_anchor25":-2.6604},{"day":153,"days_ahead":67,"est_date":"2026-06-30","ref_date":"2007-11-20","pct_analog":-1.6656,"day_chg":0.6121,"proj_spy":645.42,"pct_from_now":1.7875,"pct_from_anchor25":-2.0645},{"day":154,"days_ahead":68,"est_date":"2026-07-01","ref_date":"2007-11-21","pct_analog":-3.678,"day_chg":-2.0465,"proj_spy":632.22,"pct_from_now":-0.2956,"pct_from_anchor25":-4.0687},{"day":155,"days_ahead":69,"est_date":"2026-07-02","ref_date":"2007-11-23","pct_analog":-2.0124,"day_chg":1.7293,"proj_spy":643.15,"pct_from_now":1.4286,"pct_from_anchor25":-2.4098},{"day":156,"days_ahead":70,"est_date":"2026-07-03","ref_date":"2007-11-26","pct_analog":-4.1743,"day_chg":-2.2063,"proj_spy":628.96,"pct_from_now":-0.8093,"pct_from_anchor25":-4.563},{"day":157,"days_ahead":71,"est_date":"2026-07-06","ref_date":"2007-11-27","pct_analog":-3.0729,"day_chg":1.1494,"proj_spy":636.19,"pct_from_now":0.3308,"pct_from_anchor25":-3.4661},{"day":158,"days_ahead":72,"est_date":"2026-07-07","ref_date":"2007-11-28","pct_analog":0.0272,"day_chg":3.1984,"proj_spy":656.54,"pct_from_now":3.5398,"pct_from_anchor25":-0.3785},{"day":159,"days_ahead":73,"est_date":"2026-07-08","ref_date":"2007-11-29","pct_analog":0.0612,"day_chg":0.034,"proj_spy":656.76,"pct_from_now":3.5749,"pct_from_anchor25":-0.3447},{"day":160,"days_ahead":74,"est_date":"2026-07-09","ref_date":"2007-11-30","pct_analog":1.0674,"day_chg":1.0056,"proj_spy":663.36,"pct_from_now":4.6165,"pct_from_anchor25":0.6574},{"day":161,"days_ahead":75,"est_date":"2026-07-10","ref_date":"2007-12-03","pct_analog":0.4011,"day_chg":-0.6592,"proj_spy":658.99,"pct_from_now":3.9268,"pct_from_anchor25":-0.0062},{"day":162,"days_ahead":76,"est_date":"2026-07-13","ref_date":"2007-12-04","pct_analog":-0.4963,"day_chg":-0.8938,"proj_spy":653.1,"pct_from_now":2.9979,"pct_from_anchor25":-0.8999},{"day":163,"days_ahead":77,"est_date":"2026-07-14","ref_date":"2007-12-05","pct_analog":1.1694,"day_chg":1.674,"proj_spy":664.03,"pct_from_now":4.722,"pct_from_anchor25":0.759},{"day":164,"days_ahead":78,"est_date":"2026-07-15","ref_date":"2007-12-06","pct_analog":2.6174,"day_chg":1.4314,"proj_spy":673.54,"pct_from_now":6.221,"pct_from_anchor25":2.2012},{"day":165,"days_ahead":79,"est_date":"2026-07-16","ref_date":"2007-12-07","pct_analog":2.5971,"day_chg":-0.0199,"proj_spy":673.4,"pct_from_now":6.1999,"pct_from_anchor25":2.1809},{"day":166,"days_ahead":80,"est_date":"2026-07-17","ref_date":"2007-12-10","pct_analog":3.3925,"day_chg":0.7753,"proj_spy":678.62,"pct_from_now":7.0232,"pct_from_anchor25":2.9731},{"day":167,"days_ahead":81,"est_date":"2026-07-20","ref_date":"2007-12-11","pct_analog":0.5575,"day_chg":-2.742,"proj_spy":660.02,"pct_from_now":4.0887,"pct_from_anchor25":0.1496},{"day":168,"days_ahead":82,"est_date":"2026-07-21","ref_date":"2007-12-12","pct_analog":1.5501,"day_chg":0.9871,"proj_spy":666.53,"pct_from_now":5.1161,"pct_from_anchor25":1.1381},{"day":169,"days_ahead":83,"est_date":"2026-07-22","ref_date":"2007-12-13","pct_analog":1.3393,"day_chg":-0.2075,"proj_spy":665.15,"pct_from_now":4.898,"pct_from_anchor25":0.9282},{"day":170,"days_ahead":84,"est_date":"2026-07-23","ref_date":"2007-12-14","pct_analog":0.0544,"day_chg":-1.2679,"proj_spy":656.71,"pct_from_now":3.5679,"pct_from_anchor25":-0.3515},{"day":171,"days_ahead":85,"est_date":"2026-07-24","ref_date":"2007-12-17","pct_analog":-1.3733,"day_chg":-1.4269,"proj_spy":647.34,"pct_from_now":2.0901,"pct_from_anchor25":-1.7734},{"day":172,"days_ahead":86,"est_date":"2026-07-27","ref_date":"2007-12-18","pct_analog":-0.8226,"day_chg":0.5583,"proj_spy":650.96,"pct_from_now":2.6601,"pct_from_anchor25":-1.2249},{"day":173,"days_ahead":87,"est_date":"2026-07-28","ref_date":"2007-12-19","pct_analog":-0.8226,"day_chg":0.0,"proj_spy":650.96,"pct_from_now":2.6601,"pct_from_anchor25":-1.2249},{"day":174,"days_ahead":88,"est_date":"2026-07-29","ref_date":"2007-12-20","pct_analog":-0.1972,"day_chg":0.6307,"proj_spy":655.06,"pct_from_now":3.3075,"pct_from_anchor25":-0.602},{"day":175,"days_ahead":89,"est_date":"2026-07-30","ref_date":"2007-12-21","pct_analog":0.7071,"day_chg":0.906,"proj_spy":661.0,"pct_from_now":4.2435,"pct_from_anchor25":0.2986},{"day":176,"days_ahead":90,"est_date":"2026-07-31","ref_date":"2007-12-24","pct_analog":1.4549,"day_chg":0.7426,"proj_spy":665.91,"pct_from_now":5.0176,"pct_from_anchor25":1.0434},{"day":177,"days_ahead":91,"est_date":"2026-08-03","ref_date":"2007-12-26","pct_analog":1.6725,"day_chg":0.2144,"proj_spy":667.33,"pct_from_now":5.2428,"pct_from_anchor25":1.26},{"day":178,"days_ahead":92,"est_date":"2026-08-04","ref_date":"2007-12-27","pct_analog":0.3943,"day_chg":-1.2571,"proj_spy":658.94,"pct_from_now":3.9198,"pct_from_anchor25":-0.0129},{"day":179,"days_ahead":93,"est_date":"2026-08-05","ref_date":"2007-12-28","pct_analog":0.1428,"day_chg":-0.2506,"proj_spy":657.29,"pct_from_now":3.6594,"pct_from_anchor25":-0.2634},{"day":180,"days_ahead":94,"est_date":"2026-08-06","ref_date":"2007-12-31","pct_analog":-0.5983,"day_chg":-0.74,"proj_spy":652.43,"pct_from_now":2.8923,"pct_from_anchor25":-1.0015},{"day":181,"days_ahead":95,"est_date":"2026-08-07","ref_date":"2008-01-02","pct_analog":-1.4685,"day_chg":-0.8755,"proj_spy":646.72,"pct_from_now":1.9915,"pct_from_anchor25":-1.8682},{"day":182,"days_ahead":96,"est_date":"2026-08-10","ref_date":"2008-01-03","pct_analog":-1.5161,"day_chg":-0.0483,"proj_spy":646.41,"pct_from_now":1.9423,"pct_from_anchor25":-1.9156},{"day":183,"days_ahead":97,"est_date":"2026-08-11","ref_date":"2008-01-04","pct_analog":-3.9296,"day_chg":-2.4506,"proj_spy":630.56,"pct_from_now":-0.556,"pct_from_anchor25":-4.3193},{"day":184,"days_ahead":98,"est_date":"2026-08-12","ref_date":"2008-01-07","pct_analog":-4.0111,"day_chg":-0.0849,"proj_spy":630.03,"pct_from_now":-0.6404,"pct_from_anchor25":-4.4005},{"day":185,"days_ahead":99,"est_date":"2026-08-13","ref_date":"2008-01-08","pct_analog":-5.5612,"day_chg":-1.6148,"proj_spy":619.86,"pct_from_now":-2.2449,"pct_from_anchor25":-5.9443},{"day":186,"days_ahead":100,"est_date":"2026-08-14","ref_date":"2008-01-09","pct_analog":-4.5686,"day_chg":1.051,"proj_spy":626.37,"pct_from_now":-1.2175,"pct_from_anchor25":-4.9557},{"day":187,"days_ahead":101,"est_date":"2026-08-17","ref_date":"2008-01-10","pct_analog":-3.9432,"day_chg":0.6554,"proj_spy":630.48,"pct_from_now":-0.57,"pct_from_anchor25":-4.3328},{"day":188,"days_ahead":102,"est_date":"2026-08-18","ref_date":"2008-01-11","pct_analog":-4.7182,"day_chg":-0.8069,"proj_spy":625.39,"pct_from_now":-1.3723,"pct_from_anchor25":-5.1047},{"day":189,"days_ahead":103,"est_date":"2026-08-19","ref_date":"2008-01-14","pct_analog":-3.95,"day_chg":0.8063,"proj_spy":630.43,"pct_from_now":-0.5771,"pct_from_anchor25":-4.3396},{"day":190,"days_ahead":104,"est_date":"2026-08-20","ref_date":"2008-01-15","pct_analog":-6.0643,"day_chg":-2.2013,"proj_spy":616.55,"pct_from_now":-2.7657,"pct_from_anchor25":-6.4454},{"day":191,"days_ahead":105,"est_date":"2026-08-21","ref_date":"2008-01-16","pct_analog":-6.8733,"day_chg":-0.8613,"proj_spy":611.24,"pct_from_now":-3.6031,"pct_from_anchor25":-7.2511},{"day":192,"days_ahead":106,"est_date":"2026-08-24","ref_date":"2008-01-17","pct_analog":-9.2868,"day_chg":-2.5916,"proj_spy":595.4,"pct_from_now":-6.1013,"pct_from_anchor25":-9.6548},{"day":193,"days_ahead":107,"est_date":"2026-08-25","ref_date":"2008-01-18","pct_analog":-10.2182,"day_chg":-1.0268,"proj_spy":589.29,"pct_from_now":-7.0655,"pct_from_anchor25":-10.5824},{"day":194,"days_ahead":108,"est_date":"2026-08-26","ref_date":"2008-01-22","pct_analog":-11.1292,"day_chg":-1.0147,"proj_spy":583.31,"pct_from_now":-8.0084,"pct_from_anchor25":-11.4897},{"day":195,"days_ahead":109,"est_date":"2026-08-27","ref_date":"2008-01-23","pct_analog":-8.9945,"day_chg":2.4021,"proj_spy":597.32,"pct_from_now":-5.7987,"pct_from_anchor25":-9.3636},{"day":196,"days_ahead":110,"est_date":"2026-08-28","ref_date":"2008-01-24","pct_analog":-8.2263,"day_chg":0.8442,"proj_spy":602.36,"pct_from_now":-5.0035,"pct_from_anchor25":-8.5985},{"day":197,"days_ahead":111,"est_date":"2026-08-31","ref_date":"2008-01-25","pct_analog":-9.552,"day_chg":-1.4446,"proj_spy":593.66,"pct_from_now":-6.3758,"pct_from_anchor25":-9.9189},{"day":198,"days_ahead":112,"est_date":"2026-09-01","ref_date":"2008-01-28","pct_analog":-8.0563,"day_chg":1.6536,"proj_spy":603.48,"pct_from_now":-4.8276,"pct_from_anchor25":-8.4292},{"day":199,"days_ahead":113,"est_date":"2026-09-02","ref_date":"2008-01-29","pct_analog":-7.6008,"day_chg":0.4954,"proj_spy":606.47,"pct_from_now":-4.3561,"pct_from_anchor25":-7.9756},{"day":200,"days_ahead":114,"est_date":"2026-09-03","ref_date":"2008-01-30","pct_analog":-8.2806,"day_chg":-0.7358,"proj_spy":602.01,"pct_from_now":-5.0598,"pct_from_anchor25":-8.6527},{"day":201,"days_ahead":115,"est_date":"2026-09-04","ref_date":"2008-01-31","pct_analog":-6.6082,"day_chg":1.8234,"proj_spy":612.98,"pct_from_now":-3.3286,"pct_from_anchor25":-6.987},{"day":202,"days_ahead":116,"est_date":"2026-09-07","ref_date":"2008-02-01","pct_analog":-5.1057,"day_chg":1.6088,"proj_spy":622.85,"pct_from_now":-1.7734,"pct_from_anchor25":-5.4906},{"day":203,"days_ahead":117,"est_date":"2026-09-08","ref_date":"2008-02-04","pct_analog":-6.3023,"day_chg":-1.2609,"proj_spy":614.99,"pct_from_now":-3.012,"pct_from_anchor25":-6.6823},{"day":204,"days_ahead":118,"est_date":"2026-09-09","ref_date":"2008-02-05","pct_analog":-8.8109,"day_chg":-2.6774,"proj_spy":598.53,"pct_from_now":-5.6087,"pct_from_anchor25":-9.1808},{"day":205,"days_ahead":119,"est_date":"2026-09-10","ref_date":"2008-02-06","pct_analog":-9.5452,"day_chg":-0.8052,"proj_spy":593.71,"pct_from_now":-6.3688,"pct_from_anchor25":-9.9121},{"day":206,"days_ahead":120,"est_date":"2026-09-11","ref_date":"2008-02-07","pct_analog":-8.9469,"day_chg":0.6614,"proj_spy":597.63,"pct_from_now":-5.7495,"pct_from_anchor25":-9.3163},{"day":207,"days_ahead":121,"est_date":"2026-09-14","ref_date":"2008-02-08","pct_analog":-9.5316,"day_chg":-0.6421,"proj_spy":593.8,"pct_from_now":-6.3547,"pct_from_anchor25":-9.8985},{"day":208,"days_ahead":122,"est_date":"2026-09-15","ref_date":"2008-02-11","pct_analog":-9.0693,"day_chg":0.511,"proj_spy":596.83,"pct_from_now":-5.8761,"pct_from_anchor25":-9.4381},{"day":209,"days_ahead":123,"est_date":"2026-09-16","ref_date":"2008-02-12","pct_analog":-8.2263,"day_chg":0.9271,"proj_spy":602.36,"pct_from_now":-5.0035,"pct_from_anchor25":-8.5985},{"day":210,"days_ahead":124,"est_date":"2026-09-17","ref_date":"2008-02-13","pct_analog":-7.2881,"day_chg":1.0223,"proj_spy":608.52,"pct_from_now":-4.0324,"pct_from_anchor25":-7.6641},{"day":211,"days_ahead":125,"est_date":"2026-09-18","ref_date":"2008-02-14","pct_analog":-8.1039,"day_chg":-0.88,"proj_spy":603.17,"pct_from_now":-4.8769,"pct_from_anchor25":-8.4766},{"day":212,"days_ahead":126,"est_date":"2026-09-21","ref_date":"2008-02-15","pct_analog":-8.1243,"day_chg":-0.0222,"proj_spy":603.03,"pct_from_now":-4.898,"pct_from_anchor25":-8.497},{"day":213,"days_ahead":127,"est_date":"2026-09-22","ref_date":"2008-02-19","pct_analog":-7.8659,"day_chg":0.2812,"proj_spy":604.73,"pct_from_now":-4.6305,"pct_from_anchor25":-8.2397},{"day":214,"days_ahead":128,"est_date":"2026-09-23","ref_date":"2008-02-20","pct_analog":-7.594,"day_chg":0.2952,"proj_spy":606.51,"pct_from_now":-4.3491,"pct_from_anchor25":-7.9688},{"day":215,"days_ahead":129,"est_date":"2026-09-24","ref_date":"2008-02-21","pct_analog":-8.3622,"day_chg":-0.8314,"proj_spy":601.47,"pct_from_now":-5.1443,"pct_from_anchor25":-8.7339},{"day":216,"days_ahead":130,"est_date":"2026-09-25","ref_date":"2008-02-22","pct_analog":-7.7979,"day_chg":0.6158,"proj_spy":605.17,"pct_from_now":-4.5602,"pct_from_anchor25":-8.172},{"day":217,"days_ahead":131,"est_date":"2026-09-28","ref_date":"2008-02-25","pct_analog":-6.6354,"day_chg":1.2609,"proj_spy":612.8,"pct_from_now":-3.3568,"pct_from_anchor25":-7.0141},{"day":218,"days_ahead":132,"est_date":"2026-09-29","ref_date":"2008-02-26","pct_analog":-5.9351,"day_chg":0.75,"proj_spy":617.4,"pct_from_now":-2.632,"pct_from_anchor25":-6.3167},{"day":219,"days_ahead":133,"est_date":"2026-09-30","ref_date":"2008-02-27","pct_analog":-6.0303,"day_chg":-0.1012,"proj_spy":616.78,"pct_from_now":-2.7305,"pct_from_anchor25":-6.4115},{"day":220,"days_ahead":134,"est_date":"2026-10-01","ref_date":"2008-02-28","pct_analog":-6.9481,"day_chg":-0.9767,"proj_spy":610.75,"pct_from_now":-3.6805,"pct_from_anchor25":-7.3256},{"day":221,"days_ahead":135,"est_date":"2026-10-02","ref_date":"2008-02-29","pct_analog":-9.0217,"day_chg":-2.2284,"proj_spy":597.14,"pct_from_now":-5.8269,"pct_from_anchor25":-9.3907},{"day":222,"days_ahead":136,"est_date":"2026-10-05","ref_date":"2008-03-03","pct_analog":-9.2392,"day_chg":-0.2391,"proj_spy":595.71,"pct_from_now":-6.0521,"pct_from_anchor25":-9.6074},{"day":223,"days_ahead":137,"est_date":"2026-10-06","ref_date":"2008-03-04","pct_analog":-9.586,"day_chg":-0.382,"proj_spy":593.44,"pct_from_now":-6.411,"pct_from_anchor25":-9.9527},{"day":224,"days_ahead":138,"est_date":"2026-10-07","ref_date":"2008-03-05","pct_analog":-9.0149,"day_chg":0.6316,"proj_spy":597.19,"pct_from_now":-5.8198,"pct_from_anchor25":-9.384},{"day":225,"days_ahead":139,"est_date":"2026-10-08","ref_date":"2008-03-06","pct_analog":-10.8981,"day_chg":-2.0698,"proj_spy":584.83,"pct_from_now":-7.7692,"pct_from_anchor25":-11.2595},{"day":226,"days_ahead":140,"est_date":"2026-10-09","ref_date":"2008-03-07","pct_analog":-11.8159,"day_chg":-1.0301,"proj_spy":578.8,"pct_from_now":-8.7192,"pct_from_anchor25":-12.1736},{"day":227,"days_ahead":141,"est_date":"2026-10-12","ref_date":"2008-03-10","pct_analog":-12.9784,"day_chg":-1.3183,"proj_spy":571.17,"pct_from_now":-9.9226,"pct_from_anchor25":-13.3314},{"day":228,"days_ahead":142,"est_date":"2026-10-13","ref_date":"2008-03-11","pct_analog":-9.8511,"day_chg":3.5938,"proj_spy":591.7,"pct_from_now":-6.6854,"pct_from_anchor25":-10.2168},{"day":229,"days_ahead":143,"est_date":"2026-10-14","ref_date":"2008-03-12","pct_analog":-10.6941,"day_chg":-0.9351,"proj_spy":586.17,"pct_from_now":-7.5581,"pct_from_anchor25":-11.0564},{"day":230,"days_ahead":144,"est_date":"2026-10-15","ref_date":"2008-03-13","pct_analog":-10.497,"day_chg":0.2208,"proj_spy":587.46,"pct_from_now":-7.354,"pct_from_anchor25":-10.86},{"day":231,"days_ahead":145,"est_date":"2026-10-16","ref_date":"2008-03-14","pct_analog":-11.8839,"day_chg":-1.5496,"proj_spy":578.36,"pct_from_now":-8.7896,"pct_from_anchor25":-12.2413},{"day":232,"days_ahead":146,"est_date":"2026-10-19","ref_date":"2008-03-17","pct_analog":-12.7745,"day_chg":-1.0107,"proj_spy":572.51,"pct_from_now":-9.7115,"pct_from_anchor25":-13.1283},{"day":233,"days_ahead":147,"est_date":"2026-10-20","ref_date":"2008-03-18","pct_analog":-9.1509,"day_chg":4.1543,"proj_spy":596.29,"pct_from_now":-5.9606,"pct_from_anchor25":-9.5194},{"day":234,"days_ahead":148,"est_date":"2026-10-21","ref_date":"2008-03-19","pct_analog":-11.4012,"day_chg":-2.477,"proj_spy":581.52,"pct_from_now":-8.2899,"pct_from_anchor25":-11.7606},{"day":235,"days_ahead":149,"est_date":"2026-10-22","ref_date":"2008-03-20","pct_analog":-10.2046,"day_chg":1.3505,"proj_spy":589.38,"pct_from_now":-7.0514,"pct_from_anchor25":-10.5689},{"day":236,"days_ahead":150,"est_date":"2026-10-23","ref_date":"2008-03-24","pct_analog":-8.4098,"day_chg":1.9988,"proj_spy":601.16,"pct_from_now":-5.1935,"pct_from_anchor25":-8.7813},{"day":237,"days_ahead":151,"est_date":"2026-10-26","ref_date":"2008-03-25","pct_analog":-8.3214,"day_chg":0.0965,"proj_spy":601.74,"pct_from_now":-5.102,"pct_from_anchor25":-8.6933},{"day":238,"days_ahead":152,"est_date":"2026-10-27","ref_date":"2008-03-26","pct_analog":-9.4432,"day_chg":-1.2236,"proj_spy":594.38,"pct_from_now":-6.2632,"pct_from_anchor25":-9.8105},{"day":239,"days_ahead":153,"est_date":"2026-10-28","ref_date":"2008-03-27","pct_analog":-9.7287,"day_chg":-0.3153,"proj_spy":592.5,"pct_from_now":-6.5588,"pct_from_anchor25":-10.0949},{"day":240,"days_ahead":154,"est_date":"2026-10-29","ref_date":"2008-03-28","pct_analog":-10.5922,"day_chg":-0.9565,"proj_spy":586.83,"pct_from_now":-7.4525,"pct_from_anchor25":-10.9548},{"day":241,"days_ahead":155,"est_date":"2026-10-30","ref_date":"2008-03-31","pct_analog":-10.2794,"day_chg":0.3498,"proj_spy":588.89,"pct_from_now":-7.1288,"pct_from_anchor25":-10.6434},{"day":242,"days_ahead":156,"est_date":"2026-11-02","ref_date":"2008-04-01","pct_analog":-7.1249,"day_chg":3.516,"proj_spy":609.59,"pct_from_now":-3.8635,"pct_from_anchor25":-7.5016},{"day":243,"days_ahead":157,"est_date":"2026-11-03","ref_date":"2008-04-02","pct_analog":-7.0637,"day_chg":0.0659,"proj_spy":609.99,"pct_from_now":-3.8001,"pct_from_anchor25":-7.4407},{"day":244,"days_ahead":158,"est_date":"2026-11-04","ref_date":"2008-04-03","pct_analog":-6.8326,"day_chg":0.2487,"proj_spy":611.51,"pct_from_now":-3.5609,"pct_from_anchor25":-7.2105},{"day":245,"days_ahead":159,"est_date":"2026-11-05","ref_date":"2008-04-04","pct_analog":-6.9345,"day_chg":-0.1095,"proj_spy":610.84,"pct_from_now":-3.6664,"pct_from_anchor25":-7.312},{"day":246,"days_ahead":160,"est_date":"2026-11-06","ref_date":"2008-04-07","pct_analog":-6.8869,"day_chg":0.0511,"proj_spy":611.15,"pct_from_now":-3.6172,"pct_from_anchor25":-7.2646},{"day":247,"days_ahead":161,"est_date":"2026-11-09","ref_date":"2008-04-08","pct_analog":-6.9821,"day_chg":-0.1022,"proj_spy":610.53,"pct_from_now":-3.7157,"pct_from_anchor25":-7.3594},{"day":248,"days_ahead":162,"est_date":"2026-11-10","ref_date":"2008-04-09","pct_analog":-7.6552,"day_chg":-0.7236,"proj_spy":606.11,"pct_from_now":-4.4124,"pct_from_anchor25":-8.0298},{"day":249,"days_ahead":163,"est_date":"2026-11-11","ref_date":"2008-04-10","pct_analog":-7.526,"day_chg":0.1399,"proj_spy":606.96,"pct_from_now":-4.2787,"pct_from_anchor25":-7.9011},{"day":250,"days_ahead":164,"est_date":"2026-11-12","ref_date":"2008-04-11","pct_analog":-9.3208,"day_chg":-1.9409,"proj_spy":595.18,"pct_from_now":-6.1365,"pct_from_anchor25":-9.6886},{"day":251,"days_ahead":165,"est_date":"2026-11-13","ref_date":"2008-04-14","pct_analog":-9.6268,"day_chg":-0.3374,"proj_spy":593.17,"pct_from_now":-6.4532,"pct_from_anchor25":-9.9933},{"day":252,"days_ahead":166,"est_date":"2026-11-16","ref_date":"2008-04-15","pct_analog":-9.416,"day_chg":0.2332,"proj_spy":594.55,"pct_from_now":-6.235,"pct_from_anchor25":-9.7834}],"milestones":{"peak":{"day":123,"est_date":"2026-05-19","proj_spy":698.26,"pct_from_now":10.1196,"label":"Peak","color":"#00ff88"},"trough":{"day":227,"est_date":"2026-10-12","proj_spy":571.17,"pct_from_now":-9.9226,"label":"Trough","color":"#ff3355"},"yearend":{"day":252,"est_date":"2026-11-16","proj_spy":594.55,"pct_from_now":-6.235,"label":"End (~1yr)","color":"var(--cyan)"}}},{"name":"2016 Analog","start_date":"2016-07-07","corr":0.732,"rmse":1.384,"color":"#00ccff","anchor_price":209.53,"hist":[{"day":1,"date":"2016-07-07","close":209.53,"pct":0.0},{"day":2,"date":"2016-07-08","close":212.65,"pct":1.489},{"day":3,"date":"2016-07-11","close":213.4,"pct":1.847},{"day":4,"date":"2016-07-12","close":214.95,"pct":2.5867},{"day":5,"date":"2016-07-13","close":214.92,"pct":2.5724},{"day":6,"date":"2016-07-14","close":216.12,"pct":3.1451},{"day":7,"date":"2016-07-15","close":215.83,"pct":3.0067},{"day":8,"date":"2016-07-18","close":216.41,"pct":3.2835},{"day":9,"date":"2016-07-19","close":216.19,"pct":3.1785},{"day":10,"date":"2016-07-20","close":217.09,"pct":3.6081},{"day":11,"date":"2016-07-21","close":216.27,"pct":3.2167},{"day":12,"date":"2016-07-22","close":217.24,"pct":3.6797},{"day":13,"date":"2016-07-25","close":216.65,"pct":3.3981},{"day":14,"date":"2016-07-26","close":216.75,"pct":3.4458},{"day":15,"date":"2016-07-27","close":216.52,"pct":3.336},{"day":16,"date":"2016-07-28","close":216.77,"pct":3.4554},{"day":17,"date":"2016-07-29","close":217.12,"pct":3.6224},{"day":18,"date":"2016-08-01","close":216.94,"pct":3.5365},{"day":19,"date":"2016-08-02","close":215.55,"pct":2.8731},{"day":20,"date":"2016-08-03","close":216.18,"pct":3.1738},{"day":21,"date":"2016-08-04","close":216.41,"pct":3.2835},{"day":22,"date":"2016-08-05","close":218.18,"pct":4.1283},{"day":23,"date":"2016-08-08","close":218.05,"pct":4.0662},{"day":24,"date":"2016-08-09","close":218.18,"pct":4.1283},{"day":25,"date":"2016-08-10","close":217.64,"pct":3.8706},{"day":26,"date":"2016-08-11","close":218.65,"pct":4.3526},{"day":27,"date":"2016-08-12","close":218.46,"pct":4.2619},{"day":28,"date":"2016-08-15","close":219.09,"pct":4.5626},{"day":29,"date":"2016-08-16","close":217.96,"pct":4.0233},{"day":30,"date":"2016-08-17","close":218.37,"pct":4.219},{"day":31,"date":"2016-08-18","close":218.86,"pct":4.4528},{"day":32,"date":"2016-08-19","close":218.54,"pct":4.3001},{"day":33,"date":"2016-08-22","close":218.53,"pct":4.2953},{"day":34,"date":"2016-08-23","close":218.97,"pct":4.5053},{"day":35,"date":"2016-08-24","close":217.85,"pct":3.9708},{"day":36,"date":"2016-08-25","close":217.7,"pct":3.8992},{"day":37,"date":"2016-08-26","close":217.29,"pct":3.7035},{"day":38,"date":"2016-08-29","close":218.36,"pct":4.2142},{"day":39,"date":"2016-08-30","close":218.0,"pct":4.0424},{"day":40,"date":"2016-08-31","close":217.38,"pct":3.7465},{"day":41,"date":"2016-09-01","close":217.39,"pct":3.7513},{"day":42,"date":"2016-09-02","close":218.37,"pct":4.219},{"day":43,"date":"2016-09-06","close":219.03,"pct":4.534},{"day":44,"date":"2016-09-07","close":219.01,"pct":4.5244},{"day":45,"date":"2016-09-08","close":218.51,"pct":4.2858},{"day":46,"date":"2016-09-09","close":213.28,"pct":1.7897},{"day":47,"date":"2016-09-12","close":216.34,"pct":3.2501},{"day":48,"date":"2016-09-13","close":213.23,"pct":1.7659},{"day":49,"date":"2016-09-14","close":213.15,"pct":1.7277},{"day":50,"date":"2016-09-15","close":215.28,"pct":2.7442},{"day":51,"date":"2016-09-16","close":213.37,"pct":1.8327},{"day":52,"date":"2016-09-19","close":213.41,"pct":1.8518},{"day":53,"date":"2016-09-20","close":213.42,"pct":1.8565},{"day":54,"date":"2016-09-21","close":215.82,"pct":3.002},{"day":55,"date":"2016-09-22","close":217.18,"pct":3.651},{"day":56,"date":"2016-09-23","close":215.99,"pct":3.0831},{"day":57,"date":"2016-09-26","close":214.24,"pct":2.2479},{"day":58,"date":"2016-09-27","close":215.57,"pct":2.8826},{"day":59,"date":"2016-09-28","close":216.64,"pct":3.3933},{"day":60,"date":"2016-09-29","close":214.68,"pct":2.4579},{"day":61,"date":"2016-09-30","close":216.3,"pct":3.231},{"day":62,"date":"2016-10-03","close":215.78,"pct":2.9829},{"day":63,"date":"2016-10-04","close":214.68,"pct":2.4579},{"day":64,"date":"2016-10-05","close":215.63,"pct":2.9113},{"day":65,"date":"2016-10-06","close":215.78,"pct":2.9829},{"day":66,"date":"2016-10-07","close":215.04,"pct":2.6297},{"day":67,"date":"2016-10-10","close":216.16,"pct":3.1642},{"day":68,"date":"2016-10-11","close":213.43,"pct":1.8613},{"day":69,"date":"2016-10-12","close":213.71,"pct":1.9949},{"day":70,"date":"2016-10-13","close":213.01,"pct":1.6609},{"day":71,"date":"2016-10-14","close":213.12,"pct":1.7134},{"day":72,"date":"2016-10-17","close":212.38,"pct":1.3602},{"day":73,"date":"2016-10-18","close":213.71,"pct":1.9949},{"day":74,"date":"2016-10-19","close":214.28,"pct":2.267},{"day":75,"date":"2016-10-20","close":213.88,"pct":2.0761},{"day":76,"date":"2016-10-21","close":213.98,"pct":2.1238},{"day":77,"date":"2016-10-24","close":214.89,"pct":2.5581},{"day":78,"date":"2016-10-25","close":214.17,"pct":2.2145},{"day":79,"date":"2016-10-26","close":213.74,"pct":2.0093},{"day":80,"date":"2016-10-27","close":213.17,"pct":1.7372},{"day":81,"date":"2016-10-28","close":212.54,"pct":1.4365},{"day":82,"date":"2016-10-31","close":212.55,"pct":1.4413},{"day":83,"date":"2016-11-01","close":211.01,"pct":0.7063},{"day":84,"date":"2016-11-02","close":209.74,"pct":0.1002},{"day":85,"date":"2016-11-03","close":208.78,"pct":-0.3579},{"day":86,"date":"2016-11-04","close":208.55,"pct":-0.4677}],"proj":[{"day":87,"days_ahead":1,"est_date":"2026-03-30","ref_date":"2016-11-07","pct_analog":1.7277,"day_chg":2.2057,"proj_spy":648.08,"pct_from_now":2.2057,"pct_from_anchor25":-1.6621},{"day":88,"days_ahead":2,"est_date":"2026-03-31","ref_date":"2016-11-08","pct_analog":2.1858,"day_chg":0.4504,"proj_spy":651.0,"pct_from_now":2.666,"pct_from_anchor25":-1.2192},{"day":89,"days_ahead":3,"est_date":"2026-04-01","ref_date":"2016-11-09","pct_analog":3.2692,"day_chg":1.0602,"proj_spy":657.9,"pct_from_now":3.7545,"pct_from_anchor25":-0.1719},{"day":90,"days_ahead":4,"est_date":"2026-04-02","ref_date":"2016-11-10","pct_analog":3.5269,"day_chg":0.2496,"proj_spy":659.54,"pct_from_now":4.0134,"pct_from_anchor25":0.0772},{"day":91,"days_ahead":5,"est_date":"2026-04-03","ref_date":"2016-11-11","pct_analog":3.2883,"day_chg":-0.2305,"proj_spy":658.02,"pct_from_now":3.7737,"pct_from_anchor25":-0.1535},{"day":92,"days_ahead":6,"est_date":"2026-04-06","ref_date":"2016-11-14","pct_analog":3.3694,"day_chg":0.0786,"proj_spy":658.54,"pct_from_now":3.8552,"pct_from_anchor25":-0.0751},{"day":93,"days_ahead":7,"est_date":"2026-04-07","ref_date":"2016-11-15","pct_analog":4.176,"day_chg":0.7803,"proj_spy":663.67,"pct_from_now":4.6655,"pct_from_anchor25":0.7046},{"day":94,"days_ahead":8,"est_date":"2026-04-08","ref_date":"2016-11-16","pct_analog":3.9803,"day_chg":-0.1878,"proj_spy":662.43,"pct_from_now":4.4689,"pct_from_anchor25":0.5155},{"day":95,"days_ahead":9,"est_date":"2026-04-09","ref_date":"2016-11-17","pct_analog":4.5149,"day_chg":0.5141,"proj_spy":665.83,"pct_from_now":5.006,"pct_from_anchor25":1.0322},{"day":96,"days_ahead":10,"est_date":"2026-04-10","ref_date":"2016-11-18","pct_analog":4.281,"day_chg":-0.2238,"proj_spy":664.34,"pct_from_now":4.771,"pct_from_anchor25":0.8061},{"day":97,"days_ahead":11,"est_date":"2026-04-13","ref_date":"2016-11-21","pct_analog":5.0685,"day_chg":0.7551,"proj_spy":669.36,"pct_from_now":5.5622,"pct_from_anchor25":1.5674},{"day":98,"days_ahead":12,"est_date":"2026-04-14","ref_date":"2016-11-22","pct_analog":5.2737,"day_chg":0.1953,"proj_spy":670.67,"pct_from_now":5.7684,"pct_from_anchor25":1.7658},{"day":99,"days_ahead":13,"est_date":"2026-04-15","ref_date":"2016-11-23","pct_analog":5.331,"day_chg":0.0544,"proj_spy":671.03,"pct_from_now":5.8259,"pct_from_anchor25":1.8211},{"day":100,"days_ahead":14,"est_date":"2026-04-16","ref_date":"2016-11-25","pct_analog":5.7223,"day_chg":0.3715,"proj_spy":673.52,"pct_from_now":6.2191,"pct_from_anchor25":2.1994},{"day":101,"days_ahead":15,"est_date":"2026-04-17","ref_date":"2016-11-28","pct_analog":5.226,"day_chg":-0.4695,"proj_spy":670.36,"pct_from_now":5.7204,"pct_from_anchor25":1.7196},{"day":102,"days_ahead":16,"est_date":"2026-04-20","ref_date":"2016-11-29","pct_analog":5.4312,"day_chg":0.195,"proj_spy":671.67,"pct_from_now":5.9266,"pct_from_anchor25":1.918},{"day":103,"days_ahead":17,"est_date":"2026-04-21","ref_date":"2016-11-30","pct_analog":5.1783,"day_chg":-0.2399,"proj_spy":670.06,"pct_from_now":5.6725,"pct_from_anchor25":1.6735},{"day":104,"days_ahead":18,"est_date":"2026-04-22","ref_date":"2016-12-01","pct_analog":4.7917,"day_chg":-0.3675,"proj_spy":667.6,"pct_from_now":5.2841,"pct_from_anchor25":1.2998},{"day":105,"days_ahead":19,"est_date":"2026-04-23","ref_date":"2016-12-02","pct_analog":4.8442,"day_chg":0.0501,"proj_spy":667.93,"pct_from_now":5.3368,"pct_from_anchor25":1.3505},{"day":106,"days_ahead":20,"est_date":"2026-04-24","ref_date":"2016-12-05","pct_analog":5.4742,"day_chg":0.6009,"proj_spy":671.94,"pct_from_now":5.9698,"pct_from_anchor25":1.9595},{"day":107,"days_ahead":21,"est_date":"2026-04-27","ref_date":"2016-12-06","pct_analog":5.8082,"day_chg":0.3167,"proj_spy":674.07,"pct_from_now":6.3054,"pct_from_anchor25":2.2825},{"day":108,"days_ahead":22,"est_date":"2026-04-28","ref_date":"2016-12-07","pct_analog":7.1923,"day_chg":1.3081,"proj_spy":682.89,"pct_from_now":7.696,"pct_from_anchor25":3.6204},{"day":109,"days_ahead":23,"est_date":"2026-04-29","ref_date":"2016-12-08","pct_analog":7.4548,"day_chg":0.2449,"proj_spy":684.56,"pct_from_now":7.9597,"pct_from_anchor25":3.8741},{"day":110,"days_ahead":24,"est_date":"2026-04-30","ref_date":"2016-12-09","pct_analog":8.1038,"day_chg":0.604,"proj_spy":688.7,"pct_from_now":8.6118,"pct_from_anchor25":4.5016},{"day":111,"days_ahead":25,"est_date":"2026-05-01","ref_date":"2016-12-12","pct_analog":7.9798,"day_chg":-0.1148,"proj_spy":687.91,"pct_from_now":8.4872,"pct_from_anchor25":4.3816},{"day":112,"days_ahead":26,"est_date":"2026-05-04","ref_date":"2016-12-13","pct_analog":8.7004,"day_chg":0.6674,"proj_spy":692.5,"pct_from_now":9.2112,"pct_from_anchor25":5.0783},{"day":113,"days_ahead":27,"est_date":"2026-05-05","ref_date":"2016-12-14","pct_analog":7.8032,"day_chg":-0.8254,"proj_spy":686.78,"pct_from_now":8.3098,"pct_from_anchor25":4.2109},{"day":114,"days_ahead":28,"est_date":"2026-05-06","ref_date":"2016-12-15","pct_analog":8.247,"day_chg":0.4117,"proj_spy":689.61,"pct_from_now":8.7557,"pct_from_anchor25":4.64},{"day":115,"days_ahead":29,"est_date":"2026-05-07","ref_date":"2016-12-16","pct_analog":7.4023,"day_chg":-0.7804,"proj_spy":684.23,"pct_from_now":7.907,"pct_from_anchor25":3.8234},{"day":116,"days_ahead":30,"est_date":"2026-05-08","ref_date":"2016-12-19","pct_analog":7.6361,"day_chg":0.2177,"proj_spy":685.72,"pct_from_now":8.1419,"pct_from_anchor25":4.0495},{"day":117,"days_ahead":31,"est_date":"2026-05-11","ref_date":"2016-12-20","pct_analog":8.0514,"day_chg":0.3858,"proj_spy":688.36,"pct_from_now":8.5591,"pct_from_anchor25":4.4508},{"day":118,"days_ahead":32,"est_date":"2026-05-12","ref_date":"2016-12-21","pct_analog":7.7507,"day_chg":-0.2783,"proj_spy":686.45,"pct_from_now":8.257,"pct_from_anchor25":4.1602},{"day":119,"days_ahead":33,"est_date":"2026-05-13","ref_date":"2016-12-22","pct_analog":7.5646,"day_chg":-0.1727,"proj_spy":685.26,"pct_from_now":8.07,"pct_from_anchor25":3.9803},{"day":120,"days_ahead":34,"est_date":"2026-05-14","ref_date":"2016-12-23","pct_analog":7.722,"day_chg":0.1464,"proj_spy":686.26,"pct_from_now":8.2282,"pct_from_anchor25":4.1325},{"day":121,"days_ahead":35,"est_date":"2026-05-15","ref_date":"2016-12-27","pct_analog":7.9893,"day_chg":0.2481,"proj_spy":687.97,"pct_from_now":8.4968,"pct_from_anchor25":4.3909},{"day":122,"days_ahead":36,"est_date":"2026-05-18","ref_date":"2016-12-28","pct_analog":7.0968,"day_chg":-0.8265,"proj_spy":682.28,"pct_from_now":7.6001,"pct_from_anchor25":3.5281},{"day":123,"days_ahead":37,"est_date":"2026-05-19","ref_date":"2016-12-29","pct_analog":7.073,"day_chg":-0.0223,"proj_spy":682.13,"pct_from_now":7.5761,"pct_from_anchor25":3.5051},{"day":124,"days_ahead":38,"est_date":"2026-05-20","ref_date":"2016-12-30","pct_analog":6.6816,"day_chg":-0.3655,"proj_spy":679.64,"pct_from_now":7.1829,"pct_from_anchor25":3.1268},{"day":125,"days_ahead":39,"est_date":"2026-05-21","ref_date":"2017-01-03","pct_analog":7.4977,"day_chg":0.765,"proj_spy":684.84,"pct_from_now":8.0029,"pct_from_anchor25":3.9157},{"day":126,"days_ahead":40,"est_date":"2026-05-22","ref_date":"2017-01-04","pct_analog":8.1373,"day_chg":0.5949,"proj_spy":688.91,"pct_from_now":8.6454,"pct_from_anchor25":4.5339},{"day":127,"days_ahead":41,"est_date":"2026-05-25","ref_date":"2017-01-05","pct_analog":8.0514,"day_chg":-0.0794,"proj_spy":688.36,"pct_from_now":8.5591,"pct_from_anchor25":4.4508},{"day":128,"days_ahead":42,"est_date":"2026-05-26","ref_date":"2017-01-06","pct_analog":8.4379,"day_chg":0.3578,"proj_spy":690.83,"pct_from_now":8.9475,"pct_from_anchor25":4.8245},{"day":129,"days_ahead":43,"est_date":"2026-05-27","ref_date":"2017-01-09","pct_analog":8.08,"day_chg":-0.3301,"proj_spy":688.54,"pct_from_now":8.5879,"pct_from_anchor25":4.4785},{"day":130,"days_ahead":44,"est_date":"2026-05-28","ref_date":"2017-01-10","pct_analog":8.08,"day_chg":0.0,"proj_spy":688.54,"pct_from_now":8.5879,"pct_from_anchor25":4.4785},{"day":131,"days_ahead":45,"est_date":"2026-05-29","ref_date":"2017-01-11","pct_analog":8.3854,"day_chg":0.2826,"proj_spy":690.49,"pct_from_now":8.8948,"pct_from_anchor25":4.7738},{"day":132,"days_ahead":46,"est_date":"2026-06-01","ref_date":"2017-01-12","pct_analog":8.1134,"day_chg":-0.251,"proj_spy":688.76,"pct_from_now":8.6214,"pct_from_anchor25":4.5108},{"day":133,"days_ahead":47,"est_date":"2026-06-02","ref_date":"2017-01-13","pct_analog":8.3616,"day_chg":0.2296,"proj_spy":690.34,"pct_from_now":8.8708,"pct_from_anchor25":4.7507},{"day":134,"days_ahead":48,"est_date":"2026-06-03","ref_date":"2017-01-17","pct_analog":7.9798,"day_chg":-0.3523,"proj_spy":687.91,"pct_from_now":8.4872,"pct_from_anchor25":4.3816},{"day":135,"days_ahead":49,"est_date":"2026-06-04","ref_date":"2017-01-18","pct_analog":8.2184,"day_chg":0.221,"proj_spy":689.43,"pct_from_now":8.7269,"pct_from_anchor25":4.6123},{"day":136,"days_ahead":50,"est_date":"2026-06-05","ref_date":"2017-01-19","pct_analog":7.8175,"day_chg":-0.3705,"proj_spy":686.87,"pct_from_now":8.3241,"pct_from_anchor25":4.2248},{"day":137,"days_ahead":51,"est_date":"2026-06-08","ref_date":"2017-01-20","pct_analog":8.2136,"day_chg":0.3674,"proj_spy":689.4,"pct_from_now":8.7221,"pct_from_anchor25":4.6077},{"day":138,"days_ahead":52,"est_date":"2026-06-09","ref_date":"2017-01-23","pct_analog":7.932,"day_chg":-0.2602,"proj_spy":687.6,"pct_from_now":8.4392,"pct_from_anchor25":4.3355},{"day":139,"days_ahead":53,"est_date":"2026-06-10","ref_date":"2017-01-24","pct_analog":8.6241,"day_chg":0.6412,"proj_spy":692.01,"pct_from_now":9.1345,"pct_from_anchor25":5.0045},{"day":140,"days_ahead":54,"est_date":"2026-06-11","ref_date":"2017-01-25","pct_analog":9.5643,"day_chg":0.8656,"proj_spy":698.0,"pct_from_now":10.0791,"pct_from_anchor25":5.9133},{"day":141,"days_ahead":55,"est_date":"2026-06-12","ref_date":"2017-01-26","pct_analog":9.4497,"day_chg":-0.1045,"proj_spy":697.27,"pct_from_now":9.964,"pct_from_anchor25":5.8026},{"day":142,"days_ahead":56,"est_date":"2026-06-15","ref_date":"2017-01-27","pct_analog":9.2779,"day_chg":-0.157,"proj_spy":696.18,"pct_from_now":9.7914,"pct_from_anchor25":5.6365},{"day":143,"days_ahead":57,"est_date":"2026-06-16","ref_date":"2017-01-30","pct_analog":8.6002,"day_chg":-0.6202,"proj_spy":691.86,"pct_from_now":9.1105,"pct_from_anchor25":4.9814},{"day":144,"days_ahead":58,"est_date":"2026-06-17","ref_date":"2017-01-31","pct_analog":8.5907,"day_chg":-0.0088,"proj_spy":691.8,"pct_from_now":9.1009,"pct_from_anchor25":4.9722},{"day":145,"days_ahead":59,"est_date":"2026-06-18","ref_date":"2017-02-01","pct_analog":8.6336,"day_chg":0.0396,"proj_spy":692.07,"pct_from_now":9.1441,"pct_from_anchor25":5.0137},{"day":146,"days_ahead":60,"est_date":"2026-06-19","ref_date":"2017-02-02","pct_analog":8.7052,"day_chg":0.0659,"proj_spy":692.53,"pct_from_now":9.216,"pct_from_anchor25":5.0829},{"day":147,"days_ahead":61,"est_date":"2026-06-22","ref_date":"2017-02-03","pct_analog":9.4545,"day_chg":0.6893,"proj_spy":697.3,"pct_from_now":9.9688,"pct_from_anchor25":5.8072},{"day":148,"days_ahead":62,"est_date":"2026-06-23","ref_date":"2017-02-06","pct_analog":9.2588,"day_chg":-0.1788,"proj_spy":696.05,"pct_from_now":9.7722,"pct_from_anchor25":5.6181},{"day":149,"days_ahead":63,"est_date":"2026-06-24","ref_date":"2017-02-07","pct_analog":9.2636,"day_chg":0.0044,"proj_spy":696.09,"pct_from_now":9.777,"pct_from_anchor25":5.6227},{"day":150,"days_ahead":64,"est_date":"2026-06-25","ref_date":"2017-02-08","pct_analog":9.4068,"day_chg":0.131,"proj_spy":697.0,"pct_from_now":9.9209,"pct_from_anchor25":5.7611},{"day":151,"days_ahead":65,"est_date":"2026-06-26","ref_date":"2017-02-09","pct_analog":10.0558,"day_chg":0.5933,"proj_spy":701.13,"pct_from_now":10.573,"pct_from_anchor25":6.3885},{"day":152,"days_ahead":66,"est_date":"2026-06-29","ref_date":"2017-02-10","pct_analog":10.4901,"day_chg":0.3946,"proj_spy":703.9,"pct_from_now":11.0093,"pct_from_anchor25":6.8084},{"day":153,"days_ahead":67,"est_date":"2026-06-30","ref_date":"2017-02-13","pct_analog":11.0915,"day_chg":0.5443,"proj_spy":707.73,"pct_from_now":11.6135,"pct_from_anchor25":7.3897},{"day":154,"days_ahead":68,"est_date":"2026-07-01","ref_date":"2017-02-14","pct_analog":11.5353,"day_chg":0.3995,"proj_spy":710.56,"pct_from_now":12.0595,"pct_from_anchor25":7.8187},{"day":155,"days_ahead":69,"est_date":"2026-07-02","ref_date":"2017-02-15","pct_analog":12.1176,"day_chg":0.522,"proj_spy":714.27,"pct_from_now":12.6444,"pct_from_anchor25":8.3816},{"day":156,"days_ahead":70,"est_date":"2026-07-03","ref_date":"2017-02-16","pct_analog":12.0221,"day_chg":-0.0851,"proj_spy":713.66,"pct_from_now":12.5485,"pct_from_anchor25":8.2893},{"day":157,"days_ahead":71,"est_date":"2026-07-06","ref_date":"2017-02-17","pct_analog":12.1987,"day_chg":0.1576,"proj_spy":714.78,"pct_from_now":12.726,"pct_from_anchor25":8.46},{"day":158,"days_ahead":72,"est_date":"2026-07-07","ref_date":"2017-02-21","pct_analog":12.8669,"day_chg":0.5955,"proj_spy":719.04,"pct_from_now":13.3973,"pct_from_anchor25":9.1059},{"day":159,"days_ahead":73,"est_date":"2026-07-08","ref_date":"2017-02-22","pct_analog":12.7667,"day_chg":-0.0888,"proj_spy":718.4,"pct_from_now":13.2966,"pct_from_anchor25":9.009},{"day":160,"days_ahead":74,"est_date":"2026-07-09","ref_date":"2017-02-23","pct_analog":12.843,"day_chg":0.0677,"proj_spy":718.89,"pct_from_now":13.3733,"pct_from_anchor25":9.0828},{"day":161,"days_ahead":75,"est_date":"2026-07-10","ref_date":"2017-02-24","pct_analog":12.9862,"day_chg":0.1269,"proj_spy":719.8,"pct_from_now":13.5171,"pct_from_anchor25":9.2213},{"day":162,"days_ahead":76,"est_date":"2026-07-13","ref_date":"2017-02-27","pct_analog":13.1628,"day_chg":0.1563,"proj_spy":720.93,"pct_from_now":13.6946,"pct_from_anchor25":9.392},{"day":163,"days_ahead":77,"est_date":"2026-07-14","ref_date":"2017-02-28","pct_analog":12.8573,"day_chg":-0.2699,"proj_spy":718.98,"pct_from_now":13.3877,"pct_from_anchor25":9.0967},{"day":164,"days_ahead":78,"est_date":"2026-07-15","ref_date":"2017-03-01","pct_analog":14.4371,"day_chg":1.3998,"proj_spy":729.04,"pct_from_now":14.9748,"pct_from_anchor25":10.6238},{"day":165,"days_ahead":79,"est_date":"2026-07-16","ref_date":"2017-03-02","pct_analog":13.7164,"day_chg":-0.6297,"proj_spy":724.45,"pct_from_now":14.2508,"pct_from_anchor25":9.9271},{"day":166,"days_ahead":80,"est_date":"2026-07-17","ref_date":"2017-03-03","pct_analog":13.788,"day_chg":0.063,"proj_spy":724.91,"pct_from_now":14.3227,"pct_from_anchor25":9.9963},{"day":167,"days_ahead":81,"est_date":"2026-07-20","ref_date":"2017-03-06","pct_analog":13.4492,"day_chg":-0.2978,"proj_spy":722.75,"pct_from_now":13.9823,"pct_from_anchor25":9.6688},{"day":168,"days_ahead":82,"est_date":"2026-07-21","ref_date":"2017-03-07","pct_analog":13.1103,"day_chg":-0.2987,"proj_spy":720.59,"pct_from_now":13.6418,"pct_from_anchor25":9.3412},{"day":169,"days_ahead":83,"est_date":"2026-07-22","ref_date":"2017-03-08","pct_analog":12.9003,"day_chg":-0.1857,"proj_spy":719.25,"pct_from_now":13.4308,"pct_from_anchor25":9.1382},{"day":170,"days_ahead":84,"est_date":"2026-07-23","ref_date":"2017-03-09","pct_analog":13.0435,"day_chg":0.1268,"proj_spy":720.17,"pct_from_now":13.5747,"pct_from_anchor25":9.2766},{"day":171,"days_ahead":85,"est_date":"2026-07-24","ref_date":"2017-03-10","pct_analog":13.4396,"day_chg":0.3504,"proj_spy":722.69,"pct_from_now":13.9727,"pct_from_anchor25":9.6595},{"day":172,"days_ahead":86,"est_date":"2026-07-27","ref_date":"2017-03-13","pct_analog":13.4969,"day_chg":0.0505,"proj_spy":723.05,"pct_from_now":14.0302,"pct_from_anchor25":9.7149},{"day":173,"days_ahead":87,"est_date":"2026-07-28","ref_date":"2017-03-14","pct_analog":13.0626,"day_chg":-0.3827,"proj_spy":720.29,"pct_from_now":13.5939,"pct_from_anchor25":9.2951},{"day":174,"days_ahead":88,"est_date":"2026-07-29","ref_date":"2017-03-15","pct_analog":14.0409,"day_chg":0.8653,"proj_spy":726.52,"pct_from_now":14.5768,"pct_from_anchor25":10.2408},{"day":175,"days_ahead":89,"est_date":"2026-07-30","ref_date":"2017-03-16","pct_analog":13.8166,"day_chg":-0.1967,"proj_spy":725.09,"pct_from_now":14.3515,"pct_from_anchor25":10.024},{"day":176,"days_ahead":90,"est_date":"2026-07-31","ref_date":"2017-03-17","pct_analog":13.1246,"day_chg":-0.608,"proj_spy":720.68,"pct_from_now":13.6562,"pct_from_anchor25":9.355},{"day":177,"days_ahead":91,"est_date":"2026-08-03","ref_date":"2017-03-20","pct_analog":13.0005,"day_chg":-0.1097,"proj_spy":719.89,"pct_from_now":13.5315,"pct_from_anchor25":9.2351},{"day":178,"days_ahead":92,"est_date":"2026-08-04","ref_date":"2017-03-21","pct_analog":11.5497,"day_chg":-1.284,"proj_spy":710.65,"pct_from_now":12.0738,"pct_from_anchor25":7.8326},{"day":179,"days_ahead":93,"est_date":"2026-08-05","ref_date":"2017-03-22","pct_analog":11.8122,"day_chg":0.2353,"proj_spy":712.32,"pct_from_now":12.3376,"pct_from_anchor25":8.0863},{"day":180,"days_ahead":94,"est_date":"2026-08-06","ref_date":"2017-03-23","pct_analog":11.6928,"day_chg":-0.1067,"proj_spy":711.56,"pct_from_now":12.2177,"pct_from_anchor25":7.971},{"day":181,"days_ahead":95,"est_date":"2026-08-07","ref_date":"2017-03-24","pct_analog":11.6117,"day_chg":-0.0726,"proj_spy":711.04,"pct_from_now":12.1362,"pct_from_anchor25":7.8926},{"day":182,"days_ahead":96,"est_date":"2026-08-10","ref_date":"2017-03-27","pct_analog":11.4972,"day_chg":-0.1026,"proj_spy":710.31,"pct_from_now":12.0211,"pct_from_anchor25":7.7818},{"day":183,"days_ahead":97,"est_date":"2026-08-11","ref_date":"2017-03-28","pct_analog":12.3085,"day_chg":0.7277,"proj_spy":715.48,"pct_from_now":12.8363,"pct_from_anchor25":8.5661},{"day":184,"days_ahead":98,"est_date":"2026-08-12","ref_date":"2017-03-29","pct_analog":12.4135,"day_chg":0.0935,"proj_spy":716.15,"pct_from_now":12.9417,"pct_from_anchor25":8.6676},{"day":185,"days_ahead":99,"est_date":"2026-08-13","ref_date":"2017-03-30","pct_analog":12.7714,"day_chg":0.3184,"proj_spy":718.43,"pct_from_now":13.3014,"pct_from_anchor25":9.0136},{"day":186,"days_ahead":100,"est_date":"2026-08-14","ref_date":"2017-03-31","pct_analog":12.509,"day_chg":-0.2328,"proj_spy":716.76,"pct_from_now":13.0376,"pct_from_anchor25":8.7599},{"day":187,"days_ahead":101,"est_date":"2026-08-17","ref_date":"2017-04-03","pct_analog":12.3133,"day_chg":-0.1739,"proj_spy":715.51,"pct_from_now":12.841,"pct_from_anchor25":8.5707},{"day":188,"days_ahead":102,"est_date":"2026-08-18","ref_date":"2017-04-04","pct_analog":12.3849,"day_chg":0.0637,"proj_spy":715.97,"pct_from_now":12.913,"pct_from_anchor25":8.6399},{"day":189,"days_ahead":103,"est_date":"2026-08-19","ref_date":"2017-04-05","pct_analog":12.0508,"day_chg":-0.2973,"proj_spy":713.84,"pct_from_now":12.5773,"pct_from_anchor25":8.317},{"day":190,"days_ahead":104,"est_date":"2026-08-20","ref_date":"2017-04-06","pct_analog":12.3658,"day_chg":0.2811,"proj_spy":715.85,"pct_from_now":12.8938,"pct_from_anchor25":8.6215},{"day":191,"days_ahead":105,"est_date":"2026-08-21","ref_date":"2017-04-07","pct_analog":12.2512,"day_chg":-0.1019,"proj_spy":715.12,"pct_from_now":12.7787,"pct_from_anchor25":8.5108},{"day":192,"days_ahead":106,"est_date":"2026-08-24","ref_date":"2017-04-10","pct_analog":12.318,"day_chg":0.0595,"proj_spy":715.54,"pct_from_now":12.8458,"pct_from_anchor25":8.5754},{"day":193,"days_ahead":107,"est_date":"2026-08-25","ref_date":"2017-04-11","pct_analog":12.1844,"day_chg":-0.119,"proj_spy":714.69,"pct_from_now":12.7116,"pct_from_anchor25":8.4462},{"day":194,"days_ahead":108,"est_date":"2026-08-26","ref_date":"2017-04-12","pct_analog":11.6928,"day_chg":-0.4382,"proj_spy":711.56,"pct_from_now":12.2177,"pct_from_anchor25":7.971},{"day":195,"days_ahead":109,"est_date":"2026-08-27","ref_date":"2017-04-13","pct_analog":10.9674,"day_chg":-0.6495,"proj_spy":706.94,"pct_from_now":11.4888,"pct_from_anchor25":7.2697},{"day":196,"days_ahead":110,"est_date":"2026-08-28","ref_date":"2017-04-17","pct_analog":11.9506,"day_chg":0.886,"proj_spy":713.2,"pct_from_now":12.4766,"pct_from_anchor25":8.2201},{"day":197,"days_ahead":111,"est_date":"2026-08-31","ref_date":"2017-04-18","pct_analog":11.6165,"day_chg":-0.2984,"proj_spy":711.07,"pct_from_now":12.141,"pct_from_anchor25":7.8972},{"day":198,"days_ahead":112,"est_date":"2026-09-01","ref_date":"2017-04-19","pct_analog":11.4113,"day_chg":-0.1839,"proj_spy":709.77,"pct_from_now":11.9348,"pct_from_anchor25":7.6988},{"day":199,"days_ahead":113,"est_date":"2026-09-02","ref_date":"2017-04-20","pct_analog":12.318,"day_chg":0.8139,"proj_spy":715.54,"pct_from_now":12.8458,"pct_from_anchor25":8.5754},{"day":200,"days_ahead":114,"est_date":"2026-09-03","ref_date":"2017-04-21","pct_analog":11.9601,"day_chg":-0.3187,"proj_spy":713.26,"pct_from_now":12.4862,"pct_from_anchor25":8.2293},{"day":201,"days_ahead":115,"est_date":"2026-09-04","ref_date":"2017-04-24","pct_analog":13.1914,"day_chg":1.0998,"proj_spy":721.11,"pct_from_now":13.7233,"pct_from_anchor25":9.4196},{"day":202,"days_ahead":116,"est_date":"2026-09-07","ref_date":"2017-04-25","pct_analog":13.85,"day_chg":0.5819,"proj_spy":725.3,"pct_from_now":14.385,"pct_from_anchor25":10.0563},{"day":203,"days_ahead":117,"est_date":"2026-09-08","ref_date":"2017-04-26","pct_analog":13.7785,"day_chg":-0.0629,"proj_spy":724.85,"pct_from_now":14.3131,"pct_from_anchor25":9.9871},{"day":204,"days_ahead":118,"est_date":"2026-09-09","ref_date":"2017-04-27","pct_analog":13.8739,"day_chg":0.0839,"proj_spy":725.46,"pct_from_now":14.409,"pct_from_anchor25":10.0794},{"day":205,"days_ahead":119,"est_date":"2026-09-10","ref_date":"2017-04-28","pct_analog":13.6257,"day_chg":-0.2179,"proj_spy":723.88,"pct_from_now":14.1597,"pct_from_anchor25":9.8395},{"day":206,"days_ahead":120,"est_date":"2026-09-11","ref_date":"2017-05-01","pct_analog":13.9121,"day_chg":0.252,"proj_spy":725.7,"pct_from_now":14.4474,"pct_from_anchor25":10.1163},{"day":207,"days_ahead":121,"est_date":"2026-09-14","ref_date":"2017-05-02","pct_analog":13.955,"day_chg":0.0377,"proj_spy":725.97,"pct_from_now":14.4905,"pct_from_anchor25":10.1578},{"day":208,"days_ahead":122,"est_date":"2026-09-15","ref_date":"2017-05-03","pct_analog":13.8166,"day_chg":-0.1215,"proj_spy":725.09,"pct_from_now":14.3515,"pct_from_anchor25":10.024},{"day":209,"days_ahead":123,"est_date":"2026-09-16","ref_date":"2017-05-04","pct_analog":13.9503,"day_chg":0.1174,"proj_spy":725.94,"pct_from_now":14.4857,"pct_from_anchor25":10.1532},{"day":210,"days_ahead":124,"est_date":"2026-09-17","ref_date":"2017-05-05","pct_analog":14.3989,"day_chg":0.3937,"proj_spy":728.8,"pct_from_now":14.9365,"pct_from_anchor25":10.5869},{"day":211,"days_ahead":125,"est_date":"2026-09-18","ref_date":"2017-05-08","pct_analog":14.3798,"day_chg":-0.0167,"proj_spy":728.68,"pct_from_now":14.9173,"pct_from_anchor25":10.5684},{"day":212,"days_ahead":126,"est_date":"2026-09-21","ref_date":"2017-05-09","pct_analog":14.2748,"day_chg":-0.0918,"proj_spy":728.01,"pct_from_now":14.8118,"pct_from_anchor25":10.4669},{"day":213,"days_ahead":127,"est_date":"2026-09-22","ref_date":"2017-05-10","pct_analog":14.48,"day_chg":0.1796,"proj_spy":729.32,"pct_from_now":15.018,"pct_from_anchor25":10.6653},{"day":214,"days_ahead":128,"est_date":"2026-09-23","ref_date":"2017-05-11","pct_analog":14.2462,"day_chg":-0.2043,"proj_spy":727.83,"pct_from_now":14.783,"pct_from_anchor25":10.4392},{"day":215,"days_ahead":129,"est_date":"2026-09-24","ref_date":"2017-05-12","pct_analog":14.0553,"day_chg":-0.1671,"proj_spy":726.61,"pct_from_now":14.5912,"pct_from_anchor25":10.2547},{"day":216,"days_ahead":130,"est_date":"2026-09-25","ref_date":"2017-05-15","pct_analog":14.6853,"day_chg":0.5524,"proj_spy":730.62,"pct_from_now":15.2242,"pct_from_anchor25":10.8637},{"day":217,"days_ahead":131,"est_date":"2026-09-28","ref_date":"2017-05-16","pct_analog":14.5803,"day_chg":-0.0916,"proj_spy":729.96,"pct_from_now":15.1187,"pct_from_anchor25":10.7622},{"day":218,"days_ahead":132,"est_date":"2026-09-29","ref_date":"2017-05-17","pct_analog":12.5471,"day_chg":-1.7744,"proj_spy":717.0,"pct_from_now":13.076,"pct_from_anchor25":8.7968},{"day":219,"days_ahead":133,"est_date":"2026-09-30","ref_date":"2017-05-18","pct_analog":13.0005,"day_chg":0.4028,"proj_spy":719.89,"pct_from_now":13.5315,"pct_from_anchor25":9.2351},{"day":220,"days_ahead":134,"est_date":"2026-10-01","ref_date":"2017-05-19","pct_analog":13.7355,"day_chg":0.6504,"proj_spy":724.57,"pct_from_now":14.27,"pct_from_anchor25":9.9456},{"day":221,"days_ahead":135,"est_date":"2026-10-02","ref_date":"2017-05-22","pct_analog":14.313,"day_chg":0.5077,"proj_spy":728.25,"pct_from_now":14.8502,"pct_from_anchor25":10.5038},{"day":222,"days_ahead":136,"est_date":"2026-10-05","ref_date":"2017-05-23","pct_analog":14.5659,"day_chg":0.2213,"proj_spy":729.86,"pct_from_now":15.1043,"pct_from_anchor25":10.7483},{"day":223,"days_ahead":137,"est_date":"2026-10-06","ref_date":"2017-05-24","pct_analog":14.8332,"day_chg":0.2333,"proj_spy":731.57,"pct_from_now":15.3728,"pct_from_anchor25":11.0067},{"day":224,"days_ahead":138,"est_date":"2026-10-07","ref_date":"2017-05-25","pct_analog":15.382,"day_chg":0.4779,"proj_spy":735.06,"pct_from_now":15.9242,"pct_from_anchor25":11.5373},{"day":225,"days_ahead":139,"est_date":"2026-10-08","ref_date":"2017-05-26","pct_analog":15.3582,"day_chg":-0.0207,"proj_spy":734.91,"pct_from_now":15.9003,"pct_from_anchor25":11.5142},{"day":226,"days_ahead":140,"est_date":"2026-10-09","ref_date":"2017-05-30","pct_analog":15.258,"day_chg":-0.0869,"proj_spy":734.27,"pct_from_now":15.7996,"pct_from_anchor25":11.4173},{"day":227,"days_ahead":141,"est_date":"2026-10-12","ref_date":"2017-05-31","pct_analog":15.2293,"day_chg":-0.0248,"proj_spy":734.09,"pct_from_now":15.7708,"pct_from_anchor25":11.3896},{"day":228,"days_ahead":142,"est_date":"2026-10-13","ref_date":"2017-06-01","pct_analog":16.1457,"day_chg":0.7952,"proj_spy":739.93,"pct_from_now":16.6914,"pct_from_anchor25":12.2754},{"day":229,"days_ahead":143,"est_date":"2026-10-14","ref_date":"2017-06-02","pct_analog":16.5322,"day_chg":0.3328,"proj_spy":742.39,"pct_from_now":17.0798,"pct_from_anchor25":12.6491},{"day":230,"days_ahead":144,"est_date":"2026-10-15","ref_date":"2017-06-05","pct_analog":16.4463,"day_chg":-0.0737,"proj_spy":741.84,"pct_from_now":16.9935,"pct_from_anchor25":12.5661},{"day":231,"days_ahead":145,"est_date":"2026-10-16","ref_date":"2017-06-06","pct_analog":16.0741,"day_chg":-0.3197,"proj_spy":739.47,"pct_from_now":16.6195,"pct_from_anchor25":12.2062},{"day":232,"days_ahead":146,"est_date":"2026-10-19","ref_date":"2017-06-07","pct_analog":16.2888,"day_chg":0.185,"proj_spy":740.84,"pct_from_now":16.8353,"pct_from_anchor25":12.4138},{"day":233,"days_ahead":147,"est_date":"2026-10-20","ref_date":"2017-06-08","pct_analog":16.3461,"day_chg":0.0492,"proj_spy":741.21,"pct_from_now":16.8928,"pct_from_anchor25":12.4692},{"day":234,"days_ahead":148,"est_date":"2026-10-21","ref_date":"2017-06-09","pct_analog":16.1695,"day_chg":-0.1518,"proj_spy":740.08,"pct_from_now":16.7154,"pct_from_anchor25":12.2985},{"day":235,"days_ahead":149,"est_date":"2026-10-22","ref_date":"2017-06-12","pct_analog":16.1457,"day_chg":-0.0205,"proj_spy":739.93,"pct_from_now":16.6914,"pct_from_anchor25":12.2754},{"day":236,"days_ahead":150,"est_date":"2026-10-23","ref_date":"2017-06-13","pct_analog":16.7136,"day_chg":0.489,"proj_spy":743.55,"pct_from_now":17.262,"pct_from_anchor25":12.8244},{"day":237,"days_ahead":151,"est_date":"2026-10-26","ref_date":"2017-06-14","pct_analog":16.5657,"day_chg":-0.1268,"proj_spy":742.6,"pct_from_now":17.1134,"pct_from_anchor25":12.6814},{"day":238,"days_ahead":152,"est_date":"2026-10-27","ref_date":"2017-06-15","pct_analog":16.3413,"day_chg":-0.1924,"proj_spy":741.18,"pct_from_now":16.888,"pct_from_anchor25":12.4646},{"day":239,"days_ahead":153,"est_date":"2026-10-28","ref_date":"2017-06-16","pct_analog":15.802,"day_chg":-0.4636,"proj_spy":737.74,"pct_from_now":16.3462,"pct_from_anchor25":11.9433},{"day":240,"days_ahead":154,"est_date":"2026-10-29","ref_date":"2017-06-19","pct_analog":16.7661,"day_chg":0.8325,"proj_spy":743.88,"pct_from_now":17.3148,"pct_from_anchor25":12.8752},{"day":241,"days_ahead":155,"est_date":"2026-10-30","ref_date":"2017-06-20","pct_analog":15.9786,"day_chg":-0.6744,"proj_spy":738.86,"pct_from_now":16.5236,"pct_from_anchor25":12.1139},{"day":242,"days_ahead":156,"est_date":"2026-11-02","ref_date":"2017-06-21","pct_analog":15.95,"day_chg":-0.0247,"proj_spy":738.68,"pct_from_now":16.4948,"pct_from_anchor25":12.0863},{"day":243,"days_ahead":157,"est_date":"2026-11-03","ref_date":"2017-06-22","pct_analog":15.8975,"day_chg":-0.0453,"proj_spy":738.35,"pct_from_now":16.4421,"pct_from_anchor25":12.0355},{"day":244,"days_ahead":158,"est_date":"2026-11-04","ref_date":"2017-06-23","pct_analog":16.0359,"day_chg":0.1194,"proj_spy":739.23,"pct_from_now":16.5812,"pct_from_anchor25":12.1693},{"day":245,"days_ahead":159,"est_date":"2026-11-05","ref_date":"2017-06-26","pct_analog":16.1122,"day_chg":0.0658,"proj_spy":739.72,"pct_from_now":16.6579,"pct_from_anchor25":12.2431},{"day":246,"days_ahead":160,"est_date":"2026-11-06","ref_date":"2017-06-27","pct_analog":15.1768,"day_chg":-0.8056,"proj_spy":733.76,"pct_from_now":15.7181,"pct_from_anchor25":11.3389},{"day":247,"days_ahead":161,"est_date":"2026-11-09","ref_date":"2017-06-28","pct_analog":16.2077,"day_chg":0.895,"proj_spy":740.32,"pct_from_now":16.7538,"pct_from_anchor25":12.3354},{"day":248,"days_ahead":162,"est_date":"2026-11-10","ref_date":"2017-06-29","pct_analog":15.1864,"day_chg":-0.8789,"proj_spy":733.82,"pct_from_now":15.7276,"pct_from_anchor25":11.3481},{"day":249,"days_ahead":163,"est_date":"2026-11-11","ref_date":"2017-06-30","pct_analog":15.4011,"day_chg":0.1864,"proj_spy":735.19,"pct_from_now":15.9434,"pct_from_anchor25":11.5557},{"day":250,"days_ahead":164,"est_date":"2026-11-12","ref_date":"2017-07-03","pct_analog":15.5968,"day_chg":0.1696,"proj_spy":736.43,"pct_from_now":16.14,"pct_from_anchor25":11.7449},{"day":251,"days_ahead":165,"est_date":"2026-11-13","ref_date":"2017-07-05","pct_analog":15.8641,"day_chg":0.2312,"proj_spy":738.13,"pct_from_now":16.4085,"pct_from_anchor25":12.0032},{"day":252,"days_ahead":166,"est_date":"2026-11-16","ref_date":"2017-07-06","pct_analog":14.8046,"day_chg":-0.9144,"proj_spy":731.39,"pct_from_now":15.344,"pct_from_anchor25":10.979}],"milestones":{"peak":{"day":240,"est_date":"2026-10-29","proj_spy":743.88,"pct_from_now":17.3148,"label":"Peak","color":"#00ff88"},"trough":{"day":252,"est_date":"2026-11-16","proj_spy":731.39,"pct_from_now":15.344,"label":"Trough","color":"#ff3355"},"yearend":{"day":252,"est_date":"2026-11-16","proj_spy":731.39,"pct_from_now":15.344,"label":"End (~1yr)","color":"var(--cyan)"}}},{"name":"2008 Analog","start_date":"2008-03-13","corr":0.8512,"rmse":2.635,"color":"#ff3355","anchor_price":131.65,"hist":[{"day":1,"date":"2008-03-13","close":131.65,"pct":0.0},{"day":2,"date":"2008-03-14","close":129.61,"pct":-1.5496},{"day":3,"date":"2008-03-17","close":128.3,"pct":-2.5446},{"day":4,"date":"2008-03-18","close":133.63,"pct":1.504},{"day":5,"date":"2008-03-19","close":130.32,"pct":-1.0102},{"day":6,"date":"2008-03-20","close":132.08,"pct":0.3266},{"day":7,"date":"2008-03-24","close":134.72,"pct":2.3319},{"day":8,"date":"2008-03-25","close":134.85,"pct":2.4307},{"day":9,"date":"2008-03-26","close":133.2,"pct":1.1774},{"day":10,"date":"2008-03-27","close":132.78,"pct":0.8583},{"day":11,"date":"2008-03-28","close":131.51,"pct":-0.1063},{"day":12,"date":"2008-03-31","close":131.97,"pct":0.2431},{"day":13,"date":"2008-04-01","close":136.61,"pct":3.7676},{"day":14,"date":"2008-04-02","close":136.7,"pct":3.8359},{"day":15,"date":"2008-04-03","close":137.04,"pct":4.0942},{"day":16,"date":"2008-04-04","close":136.89,"pct":3.9803},{"day":17,"date":"2008-04-07","close":136.96,"pct":4.0334},{"day":18,"date":"2008-04-08","close":136.82,"pct":3.9271},{"day":19,"date":"2008-04-09","close":135.83,"pct":3.1751},{"day":20,"date":"2008-04-10","close":136.02,"pct":3.3194},{"day":21,"date":"2008-04-11","close":133.38,"pct":1.3141},{"day":22,"date":"2008-04-14","close":132.93,"pct":0.9723},{"day":23,"date":"2008-04-15","close":133.24,"pct":1.2078},{"day":24,"date":"2008-04-16","close":136.85,"pct":3.9499},{"day":25,"date":"2008-04-17","close":137.05,"pct":4.1018},{"day":26,"date":"2008-04-18","close":138.48,"pct":5.188},{"day":27,"date":"2008-04-21","close":138.55,"pct":5.2412},{"day":28,"date":"2008-04-22","close":137.94,"pct":4.7778},{"day":29,"date":"2008-04-23","close":137.72,"pct":4.6107},{"day":30,"date":"2008-04-24","close":138.32,"pct":5.0665},{"day":31,"date":"2008-04-25","close":139.6,"pct":6.0387},{"day":32,"date":"2008-04-28","close":139.63,"pct":6.0615},{"day":33,"date":"2008-04-29","close":139.08,"pct":5.6438},{"day":34,"date":"2008-04-30","close":138.26,"pct":5.0209},{"day":35,"date":"2008-05-01","close":141.12,"pct":7.1933},{"day":36,"date":"2008-05-02","close":141.51,"pct":7.4896},{"day":37,"date":"2008-05-05","close":140.83,"pct":6.973},{"day":38,"date":"2008-05-06","close":142.05,"pct":7.8997},{"day":39,"date":"2008-05-07","close":139.52,"pct":5.978},{"day":40,"date":"2008-05-08","close":139.16,"pct":5.7045},{"day":41,"date":"2008-05-09","close":138.9,"pct":5.507},{"day":42,"date":"2008-05-12","close":140.46,"pct":6.692},{"day":43,"date":"2008-05-13","close":140.48,"pct":6.7072},{"day":44,"date":"2008-05-14","close":140.77,"pct":6.9275},{"day":45,"date":"2008-05-15","close":142.53,"pct":8.2643},{"day":46,"date":"2008-05-16","close":142.66,"pct":8.3631},{"day":47,"date":"2008-05-19","close":143.05,"pct":8.6593},{"day":48,"date":"2008-05-20","close":141.89,"pct":7.7782},{"day":49,"date":"2008-05-21","close":139.49,"pct":5.9552},{"day":50,"date":"2008-05-22","close":139.51,"pct":5.9704},{"day":51,"date":"2008-05-23","close":137.64,"pct":4.5499},{"day":52,"date":"2008-05-27","close":138.66,"pct":5.3247},{"day":53,"date":"2008-05-28","close":139.3,"pct":5.8109},{"day":54,"date":"2008-05-29","close":140.0,"pct":6.3426},{"day":55,"date":"2008-05-30","close":140.35,"pct":6.6084},{"day":56,"date":"2008-06-02","close":138.9,"pct":5.507},{"day":57,"date":"2008-06-03","close":138.09,"pct":4.8918},{"day":58,"date":"2008-06-04","close":138.02,"pct":4.8386},{"day":59,"date":"2008-06-05","close":140.78,"pct":6.9351},{"day":60,"date":"2008-06-06","close":136.29,"pct":3.5245},{"day":61,"date":"2008-06-09","close":136.62,"pct":3.7752},{"day":62,"date":"2008-06-10","close":135.94,"pct":3.2586},{"day":63,"date":"2008-06-11","close":133.94,"pct":1.7395},{"day":64,"date":"2008-06-12","close":134.45,"pct":2.1269},{"day":65,"date":"2008-06-13","close":136.15,"pct":3.4182},{"day":66,"date":"2008-06-16","close":136.23,"pct":3.4789},{"day":67,"date":"2008-06-17","close":135.57,"pct":2.9776},{"day":68,"date":"2008-06-18","close":134.25,"pct":1.9749},{"day":69,"date":"2008-06-19","close":134.42,"pct":2.1041},{"day":70,"date":"2008-06-20","close":131.58,"pct":-0.0532},{"day":71,"date":"2008-06-23","close":131.45,"pct":-0.1519},{"day":72,"date":"2008-06-24","close":131.19,"pct":-0.3494},{"day":73,"date":"2008-06-25","close":131.81,"pct":0.1215},{"day":74,"date":"2008-06-26","close":128.23,"pct":-2.5978},{"day":75,"date":"2008-06-27","close":127.53,"pct":-3.1295},{"day":76,"date":"2008-06-30","close":127.98,"pct":-2.7877},{"day":77,"date":"2008-07-01","close":128.38,"pct":-2.4839},{"day":78,"date":"2008-07-02","close":126.18,"pct":-4.155},{"day":79,"date":"2008-07-03","close":126.31,"pct":-4.0562},{"day":80,"date":"2008-07-07","close":125.02,"pct":-5.0361},{"day":81,"date":"2008-07-08","close":127.24,"pct":-3.3498},{"day":82,"date":"2008-07-09","close":124.79,"pct":-5.2108},{"day":83,"date":"2008-07-10","close":125.3,"pct":-4.8234},{"day":84,"date":"2008-07-11","close":123.84,"pct":-5.9324},{"day":85,"date":"2008-07-14","close":122.72,"pct":-6.7831},{"day":86,"date":"2008-07-15","close":120.99,"pct":-8.0972}],"proj":[{"day":87,"days_ahead":1,"est_date":"2026-03-30","ref_date":"2008-07-16","pct_analog":-5.8412,"day_chg":2.4547,"proj_spy":649.66,"pct_from_now":2.4547,"pct_from_anchor25":-1.4225},{"day":88,"days_ahead":2,"est_date":"2026-03-31","ref_date":"2008-07-17","pct_analog":-4.8994,"day_chg":1.0003,"proj_spy":656.15,"pct_from_now":3.4796,"pct_from_anchor25":-0.4364},{"day":89,"days_ahead":3,"est_date":"2026-04-01","ref_date":"2008-07-18","pct_analog":-4.3069,"day_chg":0.623,"proj_spy":660.24,"pct_from_now":4.1243,"pct_from_anchor25":0.1839},{"day":90,"days_ahead":4,"est_date":"2026-04-02","ref_date":"2008-07-21","pct_analog":-4.2537,"day_chg":0.0556,"proj_spy":660.61,"pct_from_now":4.1822,"pct_from_anchor25":0.2396},{"day":91,"days_ahead":5,"est_date":"2026-04-03","ref_date":"2008-07-22","pct_analog":-3.1675,"day_chg":1.1345,"proj_spy":668.1,"pct_from_now":5.3641,"pct_from_anchor25":1.3767},{"day":92,"days_ahead":6,"est_date":"2026-04-06","ref_date":"2008-07-23","pct_analog":-2.6434,"day_chg":0.5413,"proj_spy":671.72,"pct_from_now":5.9344,"pct_from_anchor25":1.9254},{"day":93,"days_ahead":7,"est_date":"2026-04-07","ref_date":"2008-07-24","pct_analog":-4.6639,"day_chg":-2.0754,"proj_spy":657.78,"pct_from_now":3.7358,"pct_from_anchor25":-0.1899},{"day":94,"days_ahead":8,"est_date":"2026-04-08","ref_date":"2008-07-25","pct_analog":-4.6867,"day_chg":-0.0239,"proj_spy":657.62,"pct_from_now":3.7111,"pct_from_anchor25":-0.2137},{"day":95,"days_ahead":9,"est_date":"2026-04-09","ref_date":"2008-07-28","pct_analog":-6.0843,"day_chg":-1.4664,"proj_spy":647.98,"pct_from_now":2.1903,"pct_from_anchor25":-1.677},{"day":96,"days_ahead":10,"est_date":"2026-04-10","ref_date":"2008-07-29","pct_analog":-4.079,"day_chg":2.1352,"proj_spy":661.81,"pct_from_now":4.3723,"pct_from_anchor25":0.4225},{"day":97,"days_ahead":11,"est_date":"2026-04-13","ref_date":"2008-07-30","pct_analog":-2.3699,"day_chg":1.7818,"proj_spy":673.61,"pct_from_now":6.2319,"pct_from_anchor25":2.2117},{"day":98,"days_ahead":12,"est_date":"2026-04-14","ref_date":"2008-07-31","pct_analog":-3.6612,"day_chg":-1.3226,"proj_spy":664.7,"pct_from_now":4.8268,"pct_from_anchor25":0.8598},{"day":99,"days_ahead":13,"est_date":"2026-04-15","ref_date":"2008-08-01","pct_analog":-4.1701,"day_chg":-0.5283,"proj_spy":661.19,"pct_from_now":4.2731,"pct_from_anchor25":0.327},{"day":100,"days_ahead":14,"est_date":"2026-04-16","ref_date":"2008-08-04","pct_analog":-5.0589,"day_chg":-0.9274,"proj_spy":655.05,"pct_from_now":3.3061,"pct_from_anchor25":-0.6034},{"day":101,"days_ahead":15,"est_date":"2026-04-17","ref_date":"2008-08-05","pct_analog":-2.499,"day_chg":2.6962,"proj_spy":672.72,"pct_from_now":6.0914,"pct_from_anchor25":2.0765},{"day":102,"days_ahead":16,"est_date":"2026-04-20","ref_date":"2008-08-06","pct_analog":-2.0661,"day_chg":0.4441,"proj_spy":675.7,"pct_from_now":6.5625,"pct_from_anchor25":2.5298},{"day":103,"days_ahead":17,"est_date":"2026-04-21","ref_date":"2008-08-07","pct_analog":-3.5245,"day_chg":-1.4892,"proj_spy":665.64,"pct_from_now":4.9756,"pct_from_anchor25":1.003},{"day":104,"days_ahead":18,"est_date":"2026-04-22","ref_date":"2008-08-08","pct_analog":-1.7319,"day_chg":1.8581,"proj_spy":678.01,"pct_from_now":6.9262,"pct_from_anchor25":2.8797},{"day":105,"days_ahead":19,"est_date":"2026-04-23","ref_date":"2008-08-11","pct_analog":-0.714,"day_chg":1.0358,"proj_spy":685.03,"pct_from_now":8.0337,"pct_from_anchor25":3.9454},{"day":106,"days_ahead":20,"est_date":"2026-04-24","ref_date":"2008-08-12","pct_analog":-1.747,"day_chg":-1.0405,"proj_spy":677.9,"pct_from_now":6.9097,"pct_from_anchor25":2.8638},{"day":107,"days_ahead":21,"est_date":"2026-04-27","ref_date":"2008-08-13","pct_analog":-2.3395,"day_chg":-0.603,"proj_spy":673.82,"pct_from_now":6.265,"pct_from_anchor25":2.2435},{"day":108,"days_ahead":22,"est_date":"2026-04-28","ref_date":"2008-08-14","pct_analog":-1.6027,"day_chg":0.7544,"proj_spy":678.9,"pct_from_now":7.0667,"pct_from_anchor25":3.0149},{"day":109,"days_ahead":23,"est_date":"2026-04-29","ref_date":"2008-08-15","pct_analog":-1.1242,"day_chg":0.4863,"proj_spy":682.2,"pct_from_now":7.5874,"pct_from_anchor25":3.5159},{"day":110,"days_ahead":24,"est_date":"2026-04-30","ref_date":"2008-08-18","pct_analog":-2.4763,"day_chg":-1.3674,"proj_spy":672.87,"pct_from_now":6.1162,"pct_from_anchor25":2.1004},{"day":111,"days_ahead":25,"est_date":"2026-05-01","ref_date":"2008-08-19","pct_analog":-3.5397,"day_chg":-1.0904,"proj_spy":665.54,"pct_from_now":4.9591,"pct_from_anchor25":0.9871},{"day":112,"days_ahead":26,"est_date":"2026-05-04","ref_date":"2008-08-20","pct_analog":-3.0915,"day_chg":0.4646,"proj_spy":668.63,"pct_from_now":5.4467,"pct_from_anchor25":1.4563},{"day":113,"days_ahead":27,"est_date":"2026-05-05","ref_date":"2008-08-21","pct_analog":-2.9244,"day_chg":0.1724,"proj_spy":669.78,"pct_from_now":5.6286,"pct_from_anchor25":1.6312},{"day":114,"days_ahead":28,"est_date":"2026-05-06","ref_date":"2008-08-22","pct_analog":-1.5192,"day_chg":1.4476,"proj_spy":679.48,"pct_from_now":7.1576,"pct_from_anchor25":3.1024},{"day":115,"days_ahead":29,"est_date":"2026-05-07","ref_date":"2008-08-25","pct_analog":-3.5169,"day_chg":-2.0285,"proj_spy":665.69,"pct_from_now":4.9839,"pct_from_anchor25":1.0109},{"day":116,"days_ahead":30,"est_date":"2026-05-08","ref_date":"2008-08-26","pct_analog":-3.2358,"day_chg":0.2913,"proj_spy":667.63,"pct_from_now":5.2897,"pct_from_anchor25":1.3052},{"day":117,"days_ahead":31,"est_date":"2026-05-11","ref_date":"2008-08-27","pct_analog":-2.294,"day_chg":0.9734,"proj_spy":674.13,"pct_from_now":6.3146,"pct_from_anchor25":2.2913},{"day":118,"days_ahead":32,"est_date":"2026-05-12","ref_date":"2008-08-28","pct_analog":-1.109,"day_chg":1.2128,"proj_spy":682.31,"pct_from_now":7.6039,"pct_from_anchor25":3.5318},{"day":119,"days_ahead":33,"est_date":"2026-05-13","ref_date":"2008-08-29","pct_analog":-2.1724,"day_chg":-1.0754,"proj_spy":674.97,"pct_from_now":6.4468,"pct_from_anchor25":2.4185},{"day":120,"days_ahead":34,"est_date":"2026-05-14","ref_date":"2008-09-02","pct_analog":-2.7801,"day_chg":-0.6212,"proj_spy":670.78,"pct_from_now":5.7856,"pct_from_anchor25":1.7823},{"day":121,"days_ahead":35,"est_date":"2026-05-15","ref_date":"2008-09-03","pct_analog":-2.8637,"day_chg":-0.0859,"proj_spy":670.2,"pct_from_now":5.6947,"pct_from_anchor25":1.6948},{"day":122,"days_ahead":36,"est_date":"2026-05-18","ref_date":"2008-09-04","pct_analog":-5.7881,"day_chg":-3.0106,"proj_spy":650.02,"pct_from_now":2.5126,"pct_from_anchor25":-1.3668},{"day":123,"days_ahead":37,"est_date":"2026-05-19","ref_date":"2008-09-05","pct_analog":-5.4918,"day_chg":0.3144,"proj_spy":652.07,"pct_from_now":2.8349,"pct_from_anchor25":-1.0567},{"day":124,"days_ahead":38,"est_date":"2026-05-20","ref_date":"2008-09-08","pct_analog":-3.5397,"day_chg":2.0656,"proj_spy":665.54,"pct_from_now":4.9591,"pct_from_anchor25":0.9871},{"day":125,"days_ahead":39,"est_date":"2026-05-21","ref_date":"2008-09-09","pct_analog":-6.4033,"day_chg":-2.9687,"proj_spy":645.78,"pct_from_now":1.8431,"pct_from_anchor25":-2.011},{"day":126,"days_ahead":40,"est_date":"2026-05-22","ref_date":"2008-09-10","pct_analog":-6.0235,"day_chg":0.4058,"proj_spy":648.4,"pct_from_now":2.2564,"pct_from_anchor25":-1.6134},{"day":127,"days_ahead":41,"est_date":"2026-05-25","ref_date":"2008-09-11","pct_analog":-4.6639,"day_chg":1.4468,"proj_spy":657.78,"pct_from_now":3.7358,"pct_from_anchor25":-0.1899},{"day":128,"days_ahead":42,"est_date":"2026-05-26","ref_date":"2008-09-12","pct_analog":-4.2233,"day_chg":0.4621,"proj_spy":660.82,"pct_from_now":4.2152,"pct_from_anchor25":0.2714},{"day":129,"days_ahead":43,"est_date":"2026-05-27","ref_date":"2008-09-15","pct_analog":-8.7809,"day_chg":-4.7585,"proj_spy":629.37,"pct_from_now":-0.7439,"pct_from_anchor25":-4.5001},{"day":130,"days_ahead":44,"est_date":"2026-05-28","ref_date":"2008-09-16","pct_analog":-7.2541,"day_chg":1.6737,"proj_spy":639.91,"pct_from_now":0.9174,"pct_from_anchor25":-2.9016},{"day":131,"days_ahead":45,"est_date":"2026-05-29","ref_date":"2008-09-17","pct_analog":-11.4242,"day_chg":-4.4963,"proj_spy":611.14,"pct_from_now":-3.6201,"pct_from_anchor25":-7.2675},{"day":132,"days_ahead":46,"est_date":"2026-06-01","ref_date":"2008-09-18","pct_analog":-8.796,"day_chg":2.9672,"proj_spy":629.27,"pct_from_now":-0.7604,"pct_from_anchor25":-4.516},{"day":133,"days_ahead":47,"est_date":"2026-06-02","ref_date":"2008-09-19","pct_analog":-5.7197,"day_chg":3.373,"proj_spy":650.49,"pct_from_now":2.587,"pct_from_anchor25":-1.2953},{"day":134,"days_ahead":48,"est_date":"2026-06-03","ref_date":"2008-09-22","pct_analog":-7.8542,"day_chg":-2.2639,"proj_spy":635.77,"pct_from_now":0.2645,"pct_from_anchor25":-3.5299},{"day":135,"days_ahead":49,"est_date":"2026-06-04","ref_date":"2008-09-23","pct_analog":-9.9506,"day_chg":-2.2752,"proj_spy":621.3,"pct_from_now":-2.0167,"pct_from_anchor25":-5.7247},{"day":136,"days_ahead":50,"est_date":"2026-06-05","ref_date":"2008-09-24","pct_analog":-9.662,"day_chg":0.3205,"proj_spy":623.29,"pct_from_now":-1.7026,"pct_from_anchor25":-5.4225},{"day":137,"days_ahead":51,"est_date":"2026-06-08","ref_date":"2008-09-25","pct_analog":-8.2491,"day_chg":1.5639,"proj_spy":633.04,"pct_from_now":-0.1653,"pct_from_anchor25":-3.9434},{"day":138,"days_ahead":52,"est_date":"2026-06-09","ref_date":"2008-09-26","pct_analog":-8.2036,"day_chg":0.0497,"proj_spy":633.36,"pct_from_now":-0.1157,"pct_from_anchor25":-3.8957},{"day":139,"days_ahead":53,"est_date":"2026-06-10","ref_date":"2008-09-29","pct_analog":-15.3969,"day_chg":-7.8362,"proj_spy":583.73,"pct_from_now":-7.9428,"pct_from_anchor25":-11.4266},{"day":140,"days_ahead":54,"est_date":"2026-06-11","ref_date":"2008-09-30","pct_analog":-11.8952,"day_chg":4.139,"proj_spy":607.89,"pct_from_now":-4.1326,"pct_from_anchor25":-7.7605},{"day":141,"days_ahead":55,"est_date":"2026-06-12","ref_date":"2008-10-01","pct_analog":-11.842,"day_chg":0.0603,"proj_spy":608.25,"pct_from_now":-4.0747,"pct_from_anchor25":-7.7049},{"day":142,"days_ahead":56,"est_date":"2026-06-15","ref_date":"2008-10-02","pct_analog":-15.0399,"day_chg":-3.6274,"proj_spy":586.19,"pct_from_now":-7.5543,"pct_from_anchor25":-11.0528},{"day":143,"days_ahead":57,"est_date":"2026-06-16","ref_date":"2008-10-03","pct_analog":-16.1869,"day_chg":-1.35,"proj_spy":578.28,"pct_from_now":-8.8024,"pct_from_anchor25":-12.2536},{"day":144,"days_ahead":58,"est_date":"2026-06-17","ref_date":"2008-10-06","pct_analog":-20.4557,"day_chg":-5.0933,"proj_spy":548.82,"pct_from_now":-13.4474,"pct_from_anchor25":-16.7228},{"day":145,"days_ahead":59,"est_date":"2026-06-18","ref_date":"2008-10-07","pct_analog":-24.0182,"day_chg":-4.4786,"proj_spy":524.24,"pct_from_now":-17.3237,"pct_from_anchor25":-20.4525},{"day":146,"days_ahead":60,"est_date":"2026-06-19","ref_date":"2008-10-08","pct_analog":-25.9324,"day_chg":-2.5192,"proj_spy":511.03,"pct_from_now":-19.4066,"pct_from_anchor25":-22.4565},{"day":147,"days_ahead":61,"est_date":"2026-06-22","ref_date":"2008-10-09","pct_analog":-31.1052,"day_chg":-6.9839,"proj_spy":475.34,"pct_from_now":-25.0351,"pct_from_anchor25":-27.8721},{"day":148,"days_ahead":62,"est_date":"2026-06-23","ref_date":"2008-10-10","pct_analog":-32.7763,"day_chg":-2.4256,"proj_spy":463.81,"pct_from_now":-26.8535,"pct_from_anchor25":-29.6216},{"day":149,"days_ahead":63,"est_date":"2026-06-24","ref_date":"2008-10-13","pct_analog":-23.0156,"day_chg":14.5198,"proj_spy":531.16,"pct_from_now":-16.2327,"pct_from_anchor25":-19.4028},{"day":150,"days_ahead":64,"est_date":"2026-06-25","ref_date":"2008-10-14","pct_analog":-24.155,"day_chg":-1.48,"proj_spy":523.3,"pct_from_now":-17.4725,"pct_from_anchor25":-20.5956},{"day":151,"days_ahead":65,"est_date":"2026-06-26","ref_date":"2008-10-15","pct_analog":-31.6217,"day_chg":-9.8448,"proj_spy":471.78,"pct_from_now":-25.5972,"pct_from_anchor25":-28.4128},{"day":152,"days_ahead":66,"est_date":"2026-06-29","ref_date":"2008-10-16","pct_analog":-28.7733,"day_chg":4.1657,"proj_spy":491.43,"pct_from_now":-22.4977,"pct_from_anchor25":-25.4307},{"day":153,"days_ahead":67,"est_date":"2026-06-30","ref_date":"2008-10-17","pct_analog":-29.1986,"day_chg":-0.5972,"proj_spy":488.5,"pct_from_now":-22.9606,"pct_from_anchor25":-25.876},{"day":154,"days_ahead":68,"est_date":"2026-07-01","ref_date":"2008-10-20","pct_analog":-24.9449,"day_chg":6.0079,"proj_spy":517.85,"pct_from_now":-18.3321,"pct_from_anchor25":-21.4227},{"day":155,"days_ahead":69,"est_date":"2026-07-02","ref_date":"2008-10-21","pct_analog":-27.1857,"day_chg":-2.9855,"proj_spy":502.39,"pct_from_now":-20.7703,"pct_from_anchor25":-23.7686},{"day":156,"days_ahead":70,"est_date":"2026-07-03","ref_date":"2008-10-22","pct_analog":-31.1508,"day_chg":-5.4454,"proj_spy":475.03,"pct_from_now":-25.0847,"pct_from_anchor25":-27.9198},{"day":157,"days_ahead":71,"est_date":"2026-07-06","ref_date":"2008-10-23","pct_analog":-30.3532,"day_chg":1.1584,"proj_spy":480.53,"pct_from_now":-24.2169,"pct_from_anchor25":-27.0848},{"day":158,"days_ahead":72,"est_date":"2026-07-07","ref_date":"2008-10-24","pct_analog":-33.8853,"day_chg":-5.0714,"proj_spy":456.16,"pct_from_now":-28.0602,"pct_from_anchor25":-30.7826},{"day":159,"days_ahead":73,"est_date":"2026-07-08","ref_date":"2008-10-27","pct_analog":-36.2324,"day_chg":-3.5501,"proj_spy":439.97,"pct_from_now":-30.6141,"pct_from_anchor25":-33.2399},{"day":160,"days_ahead":74,"est_date":"2026-07-09","ref_date":"2008-10-28","pct_analog":-28.7809,"day_chg":11.6855,"proj_spy":491.38,"pct_from_now":-22.506,"pct_from_anchor25":-25.4386},{"day":161,"days_ahead":75,"est_date":"2026-07-10","ref_date":"2008-10-29","pct_analog":-29.2974,"day_chg":-0.7253,"proj_spy":487.82,"pct_from_now":-23.068,"pct_from_anchor25":-25.9794},{"day":162,"days_ahead":76,"est_date":"2026-07-13","ref_date":"2008-10-30","pct_analog":-26.8515,"day_chg":3.4594,"proj_spy":504.69,"pct_from_now":-20.4066,"pct_from_anchor25":-23.4187},{"day":163,"days_ahead":77,"est_date":"2026-07-14","ref_date":"2008-10-31","pct_analog":-26.4489,"day_chg":0.5504,"proj_spy":507.47,"pct_from_now":-19.9686,"pct_from_anchor25":-22.9973},{"day":164,"days_ahead":78,"est_date":"2026-07-15","ref_date":"2008-11-03","pct_analog":-26.2362,"day_chg":0.2892,"proj_spy":508.94,"pct_from_now":-19.7372,"pct_from_anchor25":-22.7746},{"day":165,"days_ahead":79,"est_date":"2026-07-16","ref_date":"2008-11-04","pct_analog":-23.7296,"day_chg":3.3982,"proj_spy":526.23,"pct_from_now":-17.0097,"pct_from_anchor25":-20.1503},{"day":166,"days_ahead":80,"est_date":"2026-07-17","ref_date":"2008-11-05","pct_analog":-26.935,"day_chg":-4.2028,"proj_spy":504.12,"pct_from_now":-20.4976,"pct_from_anchor25":-23.5062},{"day":167,"days_ahead":81,"est_date":"2026-07-20","ref_date":"2008-11-06","pct_analog":-30.9837,"day_chg":-5.5411,"proj_spy":476.18,"pct_from_now":-24.9029,"pct_from_anchor25":-27.7448},{"day":168,"days_ahead":82,"est_date":"2026-07-21","ref_date":"2008-11-07","pct_analog":-28.7049,"day_chg":3.3018,"proj_spy":491.91,"pct_from_now":-22.4233,"pct_from_anchor25":-25.3591},{"day":169,"days_ahead":83,"est_date":"2026-07-22","ref_date":"2008-11-10","pct_analog":-29.6392,"day_chg":-1.3105,"proj_spy":485.46,"pct_from_now":-23.44,"pct_from_anchor25":-26.3373},{"day":170,"days_ahead":84,"est_date":"2026-07-23","ref_date":"2008-11-11","pct_analog":-31.8116,"day_chg":-3.0876,"proj_spy":470.47,"pct_from_now":-25.8038,"pct_from_anchor25":-28.6116},{"day":171,"days_ahead":85,"est_date":"2026-07-24","ref_date":"2008-11-12","pct_analog":-34.812,"day_chg":-4.4001,"proj_spy":449.77,"pct_from_now":-29.0685,"pct_from_anchor25":-31.7528},{"day":172,"days_ahead":86,"est_date":"2026-07-27","ref_date":"2008-11-13","pct_analog":-30.7482,"day_chg":6.234,"proj_spy":477.81,"pct_from_now":-24.6467,"pct_from_anchor25":-27.4983},{"day":173,"days_ahead":87,"est_date":"2026-07-28","ref_date":"2008-11-14","pct_analog":-34.2043,"day_chg":-4.9907,"proj_spy":453.96,"pct_from_now":-28.4073,"pct_from_anchor25":-31.1166},{"day":174,"days_ahead":88,"est_date":"2026-07-29","ref_date":"2008-11-17","pct_analog":-35.0779,"day_chg":-1.3276,"proj_spy":447.94,"pct_from_now":-29.3578,"pct_from_anchor25":-32.0311},{"day":175,"days_ahead":89,"est_date":"2026-07-30","ref_date":"2008-11-18","pct_analog":-33.8549,"day_chg":1.8837,"proj_spy":456.37,"pct_from_now":-28.0271,"pct_from_anchor25":-30.7508},{"day":176,"days_ahead":90,"est_date":"2026-07-31","ref_date":"2008-11-19","pct_analog":-38.0934,"day_chg":-6.4079,"proj_spy":427.13,"pct_from_now":-32.6391,"pct_from_anchor25":-35.1882},{"day":177,"days_ahead":91,"est_date":"2026-08-03","ref_date":"2008-11-20","pct_analog":-42.6889,"day_chg":-7.4233,"proj_spy":395.42,"pct_from_now":-37.6395,"pct_from_anchor25":-39.9994},{"day":178,"days_ahead":92,"est_date":"2026-08-04","ref_date":"2008-11-21","pct_analog":-39.5974,"day_chg":5.3943,"proj_spy":416.75,"pct_from_now":-34.2756,"pct_from_anchor25":-36.7628},{"day":179,"days_ahead":93,"est_date":"2026-08-05","ref_date":"2008-11-24","pct_analog":-35.4121,"day_chg":6.9291,"proj_spy":445.63,"pct_from_now":-29.7215,"pct_from_anchor25":-32.3811},{"day":180,"days_ahead":94,"est_date":"2026-08-06","ref_date":"2008-11-25","pct_analog":-34.9335,"day_chg":0.7409,"proj_spy":448.93,"pct_from_now":-29.2008,"pct_from_anchor25":-31.88},{"day":181,"days_ahead":95,"est_date":"2026-08-07","ref_date":"2008-11-26","pct_analog":-32.4193,"day_chg":3.8641,"proj_spy":466.28,"pct_from_now":-26.465,"pct_from_anchor25":-29.2478},{"day":182,"days_ahead":96,"est_date":"2026-08-10","ref_date":"2008-11-28","pct_analog":-31.5686,"day_chg":1.2588,"proj_spy":472.15,"pct_from_now":-25.5393,"pct_from_anchor25":-28.3572},{"day":183,"days_ahead":97,"est_date":"2
