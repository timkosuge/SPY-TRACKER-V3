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


// ─── 2015 ANALOG DATA ────────────────────────────────────────────────────────
const ANALOG_DATA = {"generated":"2026-03-27","anchor_2014":{"date":"2014-10-15","price":186.43},"anchor_2025":{"date":"2025-11-21","price":659.03},"current":{"day":86,"date":"2026-03-27","price":634.09},"hist":[{"day":1,"date_2015":"2014-10-15","close_2015":186.43,"pct_2015":0.0,"date_2026":"2025-11-21","close_2026":659.03,"pct_2026":0.0,"divergence":0.0},{"day":2,"date_2015":"2014-10-16","close_2015":186.27,"pct_2015":-0.0858,"date_2026":"2025-11-24","close_2026":668.73,"pct_2026":1.4719,"divergence":1.5577},{"day":3,"date_2015":"2014-10-17","close_2015":188.47,"pct_2015":1.0942,"date_2026":"2025-11-25","close_2026":675.02,"pct_2026":2.4263,"divergence":1.332},{"day":4,"date_2015":"2014-10-20","close_2015":190.3,"pct_2015":2.0759,"date_2026":"2025-11-26","close_2026":679.68,"pct_2026":3.1334,"divergence":1.0575},{"day":5,"date_2015":"2014-10-21","close_2015":194.07,"pct_2015":4.0981,"date_2026":"2025-11-28","close_2026":683.39,"pct_2026":3.6963,"divergence":-0.4017},{"day":6,"date_2015":"2014-10-22","close_2015":192.69,"pct_2015":3.3578,"date_2026":"2025-12-01","close_2026":680.27,"pct_2026":3.2229,"divergence":-0.1349},{"day":7,"date_2015":"2014-10-23","close_2015":194.93,"pct_2015":4.5594,"date_2026":"2025-12-02","close_2026":681.53,"pct_2026":3.4141,"divergence":-1.1452},{"day":8,"date_2015":"2014-10-24","close_2015":196.43,"pct_2015":5.3639,"date_2026":"2025-12-03","close_2026":683.89,"pct_2026":3.7722,"divergence":-1.5917},{"day":9,"date_2015":"2014-10-27","close_2015":196.16,"pct_2015":5.2191,"date_2026":"2025-12-04","close_2026":684.39,"pct_2026":3.8481,"divergence":-1.371},{"day":10,"date_2015":"2014-10-28","close_2015":198.41,"pct_2015":6.426,"date_2026":"2025-12-05","close_2026":685.69,"pct_2026":4.0453,"divergence":-2.3807},{"day":11,"date_2015":"2014-10-29","close_2015":198.11,"pct_2015":6.2651,"date_2026":"2025-12-08","close_2026":683.63,"pct_2026":3.7328,"divergence":-2.5323},{"day":12,"date_2015":"2014-10-30","close_2015":199.38,"pct_2015":6.9463,"date_2026":"2025-12-09","close_2026":683.04,"pct_2026":3.6432,"divergence":-3.3031},{"day":13,"date_2015":"2014-10-31","close_2015":201.66,"pct_2015":8.1693,"date_2026":"2025-12-10","close_2026":687.57,"pct_2026":4.3306,"divergence":-3.8387},{"day":14,"date_2015":"2014-11-03","close_2015":201.77,"pct_2015":8.2283,"date_2026":"2025-12-11","close_2026":689.17,"pct_2026":4.5734,"divergence":-3.6549},{"day":15,"date_2015":"2014-11-04","close_2015":201.07,"pct_2015":7.8528,"date_2026":"2025-12-12","close_2026":681.76,"pct_2026":3.449,"divergence":-4.4038},{"day":16,"date_2015":"2014-11-05","close_2015":202.34,"pct_2015":8.534,"date_2026":"2025-12-15","close_2026":680.73,"pct_2026":3.2927,"divergence":-5.2413},{"day":17,"date_2015":"2014-11-06","close_2015":203.15,"pct_2015":8.9685,"date_2026":"2025-12-16","close_2026":678.87,"pct_2026":3.0105,"divergence":-5.958},{"day":18,"date_2015":"2014-11-07","close_2015":203.34,"pct_2015":9.0704,"date_2026":"2025-12-17","close_2026":671.4,"pct_2026":1.877,"divergence":-7.1934},{"day":19,"date_2015":"2014-11-10","close_2015":203.98,"pct_2015":9.4137,"date_2026":"2025-12-18","close_2026":676.47,"pct_2026":2.6463,"divergence":-6.7674},{"day":20,"date_2015":"2014-11-11","close_2015":204.18,"pct_2015":9.521,"date_2026":"2025-12-19","close_2026":680.59,"pct_2026":3.2715,"divergence":-6.2495},{"day":21,"date_2015":"2014-11-12","close_2015":203.96,"pct_2015":9.403,"date_2026":"2025-12-22","close_2026":684.83,"pct_2026":3.9148,"divergence":-5.4882},{"day":22,"date_2015":"2014-11-13","close_2015":204.19,"pct_2015":9.5264,"date_2026":"2025-12-23","close_2026":687.96,"pct_2026":4.3898,"divergence":-5.1366},{"day":23,"date_2015":"2014-11-14","close_2015":204.24,"pct_2015":9.5532,"date_2026":"2025-12-24","close_2026":690.38,"pct_2026":4.757,"divergence":-4.7962},{"day":24,"date_2015":"2014-11-17","close_2015":204.37,"pct_2015":9.6229,"date_2026":"2025-12-26","close_2026":690.31,"pct_2026":4.7464,"divergence":-4.8766},{"day":25,"date_2015":"2014-11-18","close_2015":205.55,"pct_2015":10.2559,"date_2026":"2025-12-29","close_2026":687.85,"pct_2026":4.3731,"divergence":-5.8828},{"day":26,"date_2015":"2014-11-19","close_2015":205.22,"pct_2015":10.0789,"date_2026":"2025-12-30","close_2026":687.01,"pct_2026":4.2456,"divergence":-5.8332},{"day":27,"date_2015":"2014-11-20","close_2015":205.58,"pct_2015":10.272,"date_2026":"2025-12-31","close_2026":681.92,"pct_2026":3.4733,"divergence":-6.7987},{"day":28,"date_2015":"2014-11-21","close_2015":206.68,"pct_2015":10.862,"date_2026":"2026-01-02","close_2026":683.17,"pct_2026":3.663,"divergence":-7.199},{"day":29,"date_2015":"2014-11-24","close_2015":207.26,"pct_2015":11.1731,"date_2026":"2026-01-05","close_2026":687.72,"pct_2026":4.3534,"divergence":-6.8197},{"day":30,"date_2015":"2014-11-25","close_2015":207.11,"pct_2015":11.0926,"date_2026":"2026-01-06","close_2026":691.81,"pct_2026":4.974,"divergence":-6.1187},{"day":31,"date_2015":"2014-11-26","close_2015":207.64,"pct_2015":11.3769,"date_2026":"2026-01-07","close_2026":689.58,"pct_2026":4.6356,"divergence":-6.7413},{"day":32,"date_2015":"2014-11-28","close_2015":207.2,"pct_2015":11.1409,"date_2026":"2026-01-08","close_2026":689.51,"pct_2026":4.625,"divergence":-6.5159},{"day":33,"date_2015":"2014-12-01","close_2015":205.76,"pct_2015":10.3685,"date_2026":"2026-01-09","close_2026":694.07,"pct_2026":5.3169,"divergence":-5.0516},{"day":34,"date_2015":"2014-12-02","close_2015":207.09,"pct_2015":11.0819,"date_2026":"2026-01-12","close_2026":695.16,"pct_2026":5.4823,"divergence":-5.5996},{"day":35,"date_2015":"2014-12-03","close_2015":207.89,"pct_2015":11.511,"date_2026":"2026-01-13","close_2026":693.77,"pct_2026":5.2714,"divergence":-6.2396},{"day":36,"date_2015":"2014-12-04","close_2015":207.66,"pct_2015":11.3877,"date_2026":"2026-01-14","close_2026":690.36,"pct_2026":4.7539,"divergence":-6.6337},{"day":37,"date_2015":"2014-12-05","close_2015":208.0,"pct_2015":11.57,"date_2026":"2026-01-15","close_2026":692.24,"pct_2026":5.0392,"divergence":-6.5308},{"day":38,"date_2015":"2014-12-08","close_2015":206.61,"pct_2015":10.8244,"date_2026":"2026-01-16","close_2026":691.66,"pct_2026":4.9512,"divergence":-5.8732},{"day":39,"date_2015":"2014-12-09","close_2015":206.47,"pct_2015":10.7493,"date_2026":"2026-01-20","close_2026":677.58,"pct_2026":2.8147,"divergence":-7.9346},{"day":40,"date_2015":"2014-12-10","close_2015":203.16,"pct_2015":8.9739,"date_2026":"2026-01-21","close_2026":685.4,"pct_2026":4.0013,"divergence":-4.9725},{"day":41,"date_2015":"2014-12-11","close_2015":204.19,"pct_2015":9.5264,"date_2026":"2026-01-22","close_2026":688.98,"pct_2026":4.5446,"divergence":-4.9818},{"day":42,"date_2015":"2014-12-12","close_2015":200.89,"pct_2015":7.7563,"date_2026":"2026-01-23","close_2026":689.23,"pct_2026":4.5825,"divergence":-3.1738},{"day":43,"date_2015":"2014-12-15","close_2015":199.51,"pct_2015":7.016,"date_2026":"2026-01-26","close_2026":692.73,"pct_2026":5.1136,"divergence":-1.9025},{"day":44,"date_2015":"2014-12-16","close_2015":197.91,"pct_2015":6.1578,"date_2026":"2026-01-27","close_2026":695.49,"pct_2026":5.5324,"divergence":-0.6254},{"day":45,"date_2015":"2014-12-17","close_2015":201.79,"pct_2015":8.239,"date_2026":"2026-01-28","close_2026":695.42,"pct_2026":5.5217,"divergence":-2.7173},{"day":46,"date_2015":"2014-12-18","close_2015":206.78,"pct_2015":10.9156,"date_2026":"2026-01-29","close_2026":694.04,"pct_2026":5.3123,"divergence":-5.6033},{"day":47,"date_2015":"2014-12-19","close_2015":206.52,"pct_2015":10.7762,"date_2026":"2026-01-30","close_2026":691.97,"pct_2026":4.9982,"divergence":-5.7779},{"day":48,"date_2015":"2014-12-22","close_2015":207.47,"pct_2015":11.2857,"date_2026":"2026-02-02","close_2026":695.41,"pct_2026":5.5202,"divergence":-5.7655},{"day":49,"date_2015":"2014-12-23","close_2015":207.75,"pct_2015":11.4359,"date_2026":"2026-02-03","close_2026":689.53,"pct_2026":4.628,"divergence":-6.8079},{"day":50,"date_2015":"2014-12-24","close_2015":207.77,"pct_2015":11.4467,"date_2026":"2026-02-04","close_2026":686.19,"pct_2026":4.1212,"divergence":-7.3255},{"day":51,"date_2015":"2014-12-26","close_2015":208.44,"pct_2015":11.806,"date_2026":"2026-02-05","close_2026":677.62,"pct_2026":2.8208,"divergence":-8.9852},{"day":52,"date_2015":"2014-12-29","close_2015":208.72,"pct_2015":11.9562,"date_2026":"2026-02-06","close_2026":690.62,"pct_2026":4.7934,"divergence":-7.1628},{"day":53,"date_2015":"2014-12-30","close_2015":207.6,"pct_2015":11.3555,"date_2026":"2026-02-09","close_2026":693.95,"pct_2026":5.2987,"divergence":-6.0568},{"day":54,"date_2015":"2014-12-31","close_2015":205.54,"pct_2015":10.2505,"date_2026":"2026-02-10","close_2026":692.12,"pct_2026":5.021,"divergence":-5.2295},{"day":55,"date_2015":"2015-01-02","close_2015":205.43,"pct_2015":10.1915,"date_2026":"2026-02-11","close_2026":691.96,"pct_2026":4.9967,"divergence":-5.1948},{"day":56,"date_2015":"2015-01-05","close_2015":201.72,"pct_2015":8.2015,"date_2026":"2026-02-12","close_2026":681.27,"pct_2026":3.3747,"divergence":-4.8268},{"day":57,"date_2015":"2015-01-06","close_2015":199.82,"pct_2015":7.1823,"date_2026":"2026-02-13","close_2026":681.75,"pct_2026":3.4475,"divergence":-3.7348},{"day":58,"date_2015":"2015-01-07","close_2015":202.31,"pct_2015":8.5179,"date_2026":"2026-02-17","close_2026":682.85,"pct_2026":3.6144,"divergence":-4.9036},{"day":59,"date_2015":"2015-01-08","close_2015":205.9,"pct_2015":10.4436,"date_2026":"2026-02-18","close_2026":686.29,"pct_2026":4.1364,"divergence":-6.3072},{"day":60,"date_2015":"2015-01-09","close_2015":204.25,"pct_2015":9.5586,"date_2026":"2026-02-19","close_2026":684.48,"pct_2026":3.8617,"divergence":-5.6968},{"day":61,"date_2015":"2015-01-12","close_2015":202.65,"pct_2015":8.7003,"date_2026":"2026-02-20","close_2026":689.43,"pct_2026":4.6128,"divergence":-4.0875},{"day":62,"date_2015":"2015-01-13","close_2015":202.08,"pct_2015":8.3946,"date_2026":"2026-02-23","close_2026":682.39,"pct_2026":3.5446,"divergence":-4.85},{"day":63,"date_2015":"2015-01-14","close_2015":200.86,"pct_2015":7.7402,"date_2026":"2026-02-24","close_2026":687.35,"pct_2026":4.2972,"divergence":-3.443},{"day":64,"date_2015":"2015-01-15","close_2015":199.02,"pct_2015":6.7532,"date_2026":"2026-02-25","close_2026":693.15,"pct_2026":5.1773,"divergence":-1.5759},{"day":65,"date_2015":"2015-01-16","close_2015":201.63,"pct_2015":8.1532,"date_2026":"2026-02-26","close_2026":689.3,"pct_2026":4.5931,"divergence":-3.5601},{"day":66,"date_2015":"2015-01-20","close_2015":202.06,"pct_2015":8.3838,"date_2026":"2026-02-27","close_2026":685.99,"pct_2026":4.0909,"divergence":-4.293},{"day":67,"date_2015":"2015-01-21","close_2015":203.08,"pct_2015":8.931,"date_2026":"2026-03-02","close_2026":686.38,"pct_2026":4.15,"divergence":-4.7809},{"day":68,"date_2015":"2015-01-22","close_2015":206.1,"pct_2015":10.5509,"date_2026":"2026-03-03","close_2026":680.33,"pct_2026":3.232,"divergence":-7.3189},{"day":69,"date_2015":"2015-01-23","close_2015":204.97,"pct_2015":9.9448,"date_2026":"2026-03-04","close_2026":685.13,"pct_2026":3.9604,"divergence":-5.9844},{"day":70,"date_2015":"2015-01-26","close_2015":205.45,"pct_2015":10.2022,"date_2026":"2026-03-05","close_2026":681.31,"pct_2026":3.3807,"divergence":-6.8215},{"day":71,"date_2015":"2015-01-27","close_2015":202.74,"pct_2015":8.7486,"date_2026":"2026-03-06","close_2026":672.38,"pct_2026":2.0257,"divergence":-6.7229},{"day":72,"date_2015":"2015-01-28","close_2015":200.14,"pct_2015":7.354,"date_2026":"2026-03-09","close_2026":678.27,"pct_2026":2.9194,"divergence":-4.4345},{"day":73,"date_2015":"2015-01-29","close_2015":201.99,"pct_2015":8.3463,"date_2026":"2026-03-10","close_2026":677.18,"pct_2026":2.754,"divergence":-5.5923},{"day":74,"date_2015":"2015-01-30","close_2015":199.45,"pct_2015":6.9839,"date_2026":"2026-03-11","close_2026":676.33,"pct_2026":2.6251,"divergence":-4.3588},{"day":75,"date_2015":"2015-02-02","close_2015":201.92,"pct_2015":8.3088,"date_2026":"2026-03-12","close_2026":666.06,"pct_2026":1.0667,"divergence":-7.242},{"day":76,"date_2015":"2015-02-03","close_2015":204.84,"pct_2015":9.875,"date_2026":"2026-03-13","close_2026":662.29,"pct_2026":0.4947,"divergence":-9.3804},{"day":77,"date_2015":"2015-02-04","close_2015":204.06,"pct_2015":9.4566,"date_2026":"2026-03-16","close_2026":669.03,"pct_2026":1.5174,"divergence":-7.9393},{"day":78,"date_2015":"2015-02-05","close_2015":206.12,"pct_2015":10.5616,"date_2026":"2026-03-17","close_2026":670.79,"pct_2026":1.7844,"divergence":-8.7772},{"day":79,"date_2015":"2015-02-06","close_2015":205.55,"pct_2015":10.2559,"date_2026":"2026-03-18","close_2026":661.43,"pct_2026":0.3642,"divergence":-9.8917},{"day":80,"date_2015":"2015-02-09","close_2015":204.63,"pct_2015":9.7624,"date_2026":"2026-03-19","close_2026":659.8,"pct_2026":0.1168,"divergence":-9.6456},{"day":81,"date_2015":"2015-02-10","close_2015":206.81,"pct_2015":10.9317,"date_2026":"2026-03-20","close_2026":648.57,"pct_2026":-1.5872,"divergence":-12.5189},{"day":82,"date_2015":"2015-02-11","close_2015":206.93,"pct_2015":10.9961,"date_2026":"2026-03-23","close_2026":655.38,"pct_2026":-0.5538,"divergence":-11.5499},{"day":83,"date_2015":"2015-02-12","close_2015":208.92,"pct_2015":12.0635,"date_2026":"2026-03-24","close_2026":653.18,"pct_2026":-0.8877,"divergence":-12.9512},{"day":84,"date_2015":"2015-02-13","close_2015":209.78,"pct_2015":12.5248,"date_2026":"2026-03-25","close_2026":656.82,"pct_2026":-0.3353,"divergence":-12.8602},{"day":85,"date_2015":"2015-02-17","close_2015":210.11,"pct_2015":12.7018,"date_2026":"2026-03-26","close_2026":645.09,"pct_2026":-2.1152,"divergence":-14.8171},{"day":86,"date_2015":"2015-02-18","close_2015":210.13,"pct_2015":12.7126,"date_2026":"2026-03-27","close_2026":634.09,"pct_2026":-3.7843,"divergence":-16.4969}],"proj":[{"day":87,"days_ahead":1,"est_date_2026":"2026-03-30","ref_date_2015":"2015-02-19","pct_2015":12.6321,"day_chg_2015":-0.0714,"projected_spy":633.64,"pct_from_now":-0.0714,"pct_from_anchor25":-3.853},{"day":88,"days_ahead":2,"est_date_2026":"2026-03-31","ref_date_2015":"2015-02-20","pct_2015":13.308,"day_chg_2015":0.6001,"projected_spy":637.44,"pct_from_now":0.5282,"pct_from_anchor25":-3.2761},{"day":89,"days_ahead":3,"est_date_2026":"2026-04-01","ref_date_2015":"2015-02-23","pct_2015":13.2919,"day_chg_2015":-0.0142,"projected_spy":637.35,"pct_from_now":0.514,"pct_from_anchor25":-3.2898},{"day":90,"days_ahead":4,"est_date_2026":"2026-04-02","ref_date_2015":"2015-02-24","pct_2015":13.6137,"day_chg_2015":0.2841,"projected_spy":639.16,"pct_from_now":0.7995,"pct_from_anchor25":-3.0151},{"day":91,"days_ahead":5,"est_date_2026":"2026-04-03","ref_date_2015":"2015-02-25","pct_2015":13.5171,"day_chg_2015":-0.085,"projected_spy":638.62,"pct_from_now":0.7138,"pct_from_anchor25":-3.0975},{"day":92,"days_ahead":6,"est_date_2026":"2026-04-06","ref_date_2015":"2015-02-26","pct_2015":13.383,"day_chg_2015":-0.1181,"projected_spy":637.86,"pct_from_now":0.5949,"pct_from_anchor25":-3.212},{"day":93,"days_ahead":7,"est_date_2026":"2026-04-07","ref_date_2015":"2015-02-27","pct_2015":12.9968,"day_chg_2015":-0.3406,"projected_spy":635.69,"pct_from_now":0.2522,"pct_from_anchor25":-3.5417},{"day":94,"days_ahead":8,"est_date_2026":"2026-04-08","ref_date_2015":"2015-03-02","pct_2015":13.7102,"day_chg_2015":0.6313,"projected_spy":639.7,"pct_from_now":0.8852,"pct_from_anchor25":-2.9327},{"day":95,"days_ahead":9,"est_date_2026":"2026-04-09","ref_date_2015":"2015-03-03","pct_2015":13.2436,"day_chg_2015":-0.4104,"projected_spy":637.08,"pct_from_now":0.4711,"pct_from_anchor25":-3.331},{"day":96,"days_ahead":10,"est_date_2026":"2026-04-10","ref_date_2015":"2015-03-04","pct_2015":12.7662,"day_chg_2015":-0.4216,"projected_spy":634.39,"pct_from_now":0.0476,"pct_from_anchor25":-3.7386},{"day":97,"days_ahead":11,"est_date_2026":"2026-04-13","ref_date_2015":"2015-03-05","pct_2015":12.8896,"day_chg_2015":0.1094,"projected_spy":635.09,"pct_from_now":0.157,"pct_from_anchor25":-3.6332},{"day":98,"days_ahead":12,"est_date_2026":"2026-04-14","ref_date_2015":"2015-03-06","pct_2015":11.3018,"day_chg_2015":-1.4064,"projected_spy":626.15,"pct_from_now":-1.2516,"pct_from_anchor25":-4.9886},{"day":99,"days_ahead":13,"est_date_2026":"2026-04-15","ref_date_2015":"2015-03-09","pct_2015":11.7631,"day_chg_2015":0.4145,"projected_spy":628.75,"pct_from_now":-0.8423,"pct_from_anchor25":-4.5948},{"day":100,"days_ahead":14,"est_date_2026":"2026-04-16","ref_date_2015":"2015-03-10","pct_2015":9.9501,"day_chg_2015":-1.6222,"projected_spy":618.55,"pct_from_now":-2.4509,"pct_from_anchor25":-6.1425},{"day":101,"days_ahead":15,"est_date_2026":"2026-04-17","ref_date_2015":"2015-03-11","pct_2015":9.6927,"day_chg_2015":-0.2342,"projected_spy":617.1,"pct_from_now":-2.6793,"pct_from_anchor25":-6.3623},{"day":102,"days_ahead":16,"est_date_2026":"2026-04-20","ref_date_2015":"2015-03-12","pct_2015":11.0873,"day_chg_2015":1.2714,"projected_spy":624.95,"pct_from_now":-1.442,"pct_from_anchor25":-5.1717},{"day":103,"days_ahead":17,"est_date_2026":"2026-04-21","ref_date_2015":"2015-03-13","pct_2015":10.4061,"day_chg_2015":-0.6132,"projected_spy":621.11,"pct_from_now":-2.0464,"pct_from_anchor25":-5.7533},{"day":104,"days_ahead":18,"est_date_2026":"2026-04-22","ref_date_2015":"2015-03-16","pct_2015":11.8811,"day_chg_2015":1.3361,"projected_spy":629.41,"pct_from_now":-0.7376,"pct_from_anchor25":-4.4941},{"day":105,"days_ahead":19,"est_date_2026":"2026-04-23","ref_date_2015":"2015-03-17","pct_2015":11.5486,"day_chg_2015":-0.2972,"projected_spy":627.54,"pct_from_now":-1.0327,"pct_from_anchor25":-4.778},{"day":106,"days_ahead":20,"est_date_2026":"2026-04-24","ref_date_2015":"2015-03-18","pct_2015":12.8896,"day_chg_2015":1.2022,"projected_spy":635.09,"pct_from_now":0.157,"pct_from_anchor25":-3.6332},{"day":107,"days_ahead":21,"est_date_2026":"2026-04-27","ref_date_2015":"2015-03-19","pct_2015":12.3746,"day_chg_2015":-0.4561,"projected_spy":632.19,"pct_from_now":-0.2998,"pct_from_anchor25":-4.0728},{"day":108,"days_ahead":22,"est_date_2026":"2026-04-28","ref_date_2015":"2015-03-20","pct_2015":12.8627,"day_chg_2015":0.4344,"projected_spy":634.93,"pct_from_now":0.1333,"pct_from_anchor25":-3.6561},{"day":109,"days_ahead":23,"est_date_2026":"2026-04-29","ref_date_2015":"2015-03-23","pct_2015":12.6428,"day_chg_2015":-0.1949,"projected_spy":633.7,"pct_from_now":-0.0619,"pct_from_anchor25":-3.8439},{"day":110,"days_ahead":24,"est_date_2026":"2026-04-30","ref_date_2015":"2015-03-24","pct_2015":12.0099,"day_chg_2015":-0.5619,"projected_spy":630.14,"pct_from_now":-0.6234,"pct_from_anchor25":-4.3842},{"day":111,"days_ahead":25,"est_date_2026":"2026-05-01","ref_date_2015":"2015-03-25","pct_2015":10.3685,"day_chg_2015":-1.4654,"projected_spy":620.9,"pct_from_now":-2.0797,"pct_from_anchor25":-5.7853},{"day":112,"days_ahead":26,"est_date_2026":"2026-05-04","ref_date_2015":"2015-03-26","pct_2015":10.1057,"day_chg_2015":-0.2381,"projected_spy":619.42,"pct_from_now":-2.3129,"pct_from_anchor25":-6.0097},{"day":113,"days_ahead":27,"est_date_2026":"2026-05-05","ref_date_2015":"2015-03-27","pct_2015":10.3578,"day_chg_2015":0.229,"projected_spy":620.84,"pct_from_now":-2.0892,"pct_from_anchor25":-5.7945},{"day":114,"days_ahead":28,"est_date_2026":"2026-05-06","ref_date_2015":"2015-03-30","pct_2015":11.7041,"day_chg_2015":1.22,"projected_spy":628.42,"pct_from_now":-0.8947,"pct_from_anchor25":-4.6452},{"day":115,"days_ahead":29,"est_date_2026":"2026-05-07","ref_date_2015":"2015-03-31","pct_2015":10.7279,"day_chg_2015":-0.874,"projected_spy":622.92,"pct_from_now":-1.7608,"pct_from_anchor25":-5.4785},{"day":116,"days_ahead":30,"est_date_2026":"2026-05-08","ref_date_2015":"2015-04-01","pct_2015":10.3363,"day_chg_2015":-0.3536,"projected_spy":620.72,"pct_from_now":-2.1082,"pct_from_anchor25":-5.8128},{"day":117,"days_ahead":31,"est_date_2026":"2026-05-11","ref_date_2015":"2015-04-02","pct_2015":10.7333,"day_chg_2015":0.3597,"projected_spy":622.96,"pct_from_now":-1.7561,"pct_from_anchor25":-5.474},{"day":118,"days_ahead":32,"est_date_2026":"2026-05-12","ref_date_2015":"2015-04-06","pct_2015":11.4788,"day_chg_2015":0.6733,"projected_spy":627.15,"pct_from_now":-1.0946,"pct_from_anchor25":-4.8375},{"day":119,"days_ahead":33,"est_date_2026":"2026-05-13","ref_date_2015":"2015-04-07","pct_2015":11.1838,"day_chg_2015":-0.2646,"projected_spy":625.49,"pct_from_now":-1.3563,"pct_from_anchor25":-5.0893},{"day":120,"days_ahead":34,"est_date_2026":"2026-05-14","ref_date_2015":"2015-04-08","pct_2015":11.5593,"day_chg_2015":0.3377,"projected_spy":627.6,"pct_from_now":-1.0232,"pct_from_anchor25":-4.7688},{"day":121,"days_ahead":35,"est_date_2026":"2026-05-15","ref_date_2015":"2015-04-09","pct_2015":12.0528,"day_chg_2015":0.4423,"projected_spy":630.38,"pct_from_now":-0.5854,"pct_from_anchor25":-4.3476},{"day":122,"days_ahead":36,"est_date_2026":"2026-05-18","ref_date_2015":"2015-04-10","pct_2015":12.6643,"day_chg_2015":0.5457,"projected_spy":633.82,"pct_from_now":-0.0428,"pct_from_anchor25":-3.8256},{"day":123,"days_ahead":37,"est_date_2026":"2026-05-19","ref_date_2015":"2015-04-13","pct_2015":12.1547,"day_chg_2015":-0.4523,"projected_spy":630.95,"pct_from_now":-0.4949,"pct_from_anchor25":-4.2606},{"day":124,"days_ahead":38,"est_date_2026":"2026-05-20","ref_date_2015":"2015-04-14","pct_2015":12.3693,"day_chg_2015":0.1913,"projected_spy":632.16,"pct_from_now":-0.3046,"pct_from_anchor25":-4.0774},{"day":125,"days_ahead":39,"est_date_2026":"2026-05-21","ref_date_2015":"2015-04-15","pct_2015":12.8735,"day_chg_2015":0.4487,"projected_spy":635.0,"pct_from_now":0.1428,"pct_from_anchor25":-3.647},{"day":126,"days_ahead":40,"est_date_2026":"2026-05-22","ref_date_2015":"2015-04-16","pct_2015":12.8413,"day_chg_2015":-0.0285,"projected_spy":634.81,"pct_from_now":0.1142,"pct_from_anchor25":-3.6745},{"day":127,"days_ahead":41,"est_date_2026":"2026-05-25","ref_date_2015":"2015-04-17","pct_2015":11.5432,"day_chg_2015":-1.1504,"projected_spy":627.51,"pct_from_now":-1.0375,"pct_from_anchor25":-4.7825},{"day":128,"days_ahead":42,"est_date_2026":"2026-05-26","ref_date_2015":"2015-04-20","pct_2015":12.5624,"day_chg_2015":0.9137,"projected_spy":633.25,"pct_from_now":-0.1333,"pct_from_anchor25":-3.9126},{"day":129,"days_ahead":43,"est_date_2026":"2026-05-27","ref_date_2015":"2015-04-21","pct_2015":12.4283,"day_chg_2015":-0.1191,"projected_spy":632.49,"pct_from_now":-0.2522,"pct_from_anchor25":-4.027},{"day":130,"days_ahead":44,"est_date_2026":"2026-05-28","ref_date_2015":"2015-04-22","pct_2015":12.9808,"day_chg_2015":0.4914,"projected_spy":635.6,"pct_from_now":0.2379,"pct_from_anchor25":-3.5554},{"day":131,"days_ahead":45,"est_date_2026":"2026-05-29","ref_date_2015":"2015-04-23","pct_2015":13.265,"day_chg_2015":0.2516,"projected_spy":637.2,"pct_from_now":0.4902,"pct_from_anchor25":-3.3127},{"day":132,"days_ahead":46,"est_date_2026":"2026-06-01","ref_date_2015":"2015-04-24","pct_2015":13.5279,"day_chg_2015":0.232,"projected_spy":638.68,"pct_from_now":0.7234,"pct_from_anchor25":-3.0884},{"day":133,"days_ahead":47,"est_date_2026":"2026-06-02","ref_date_2015":"2015-04-27","pct_2015":13.0558,"day_chg_2015":-0.4158,"projected_spy":636.02,"pct_from_now":0.3046,"pct_from_anchor25":-3.4913},{"day":134,"days_ahead":48,"est_date_2026":"2026-06-03","ref_date_2015":"2015-04-28","pct_2015":13.4152,"day_chg_2015":0.3179,"projected_spy":638.04,"pct_from_now":0.6234,"pct_from_anchor25":-3.1845},{"day":135,"days_ahead":49,"est_date_2026":"2026-06-04","ref_date_2015":"2015-04-29","pct_2015":12.9486,"day_chg_2015":-0.4115,"projected_spy":635.42,"pct_from_now":0.2094,"pct_from_anchor25":-3.5829},{"day":136,"days_ahead":50,"est_date_2026":"2026-06-05","ref_date_2015":"2015-04-30","pct_2015":11.8168,"day_chg_2015":-1.002,"projected_spy":629.05,"pct_from_now":-0.7947,"pct_from_anchor25":-4.549},{"day":137,"days_ahead":51,"est_date_2026":"2026-06-08","ref_date_2015":"2015-05-01","pct_2015":13.029,"day_chg_2015":1.0841,"projected_spy":635.87,"pct_from_now":0.2808,"pct_from_anchor25":-3.5142},{"day":138,"days_ahead":52,"est_date_2026":"2026-06-09","ref_date_2015":"2015-05-04","pct_2015":13.3509,"day_chg_2015":0.2847,"projected_spy":637.68,"pct_from_now":0.5663,"pct_from_anchor25":-3.2395},{"day":139,"days_ahead":53,"est_date_2026":"2026-06-10","ref_date_2015":"2015-05-05","pct_2015":12.0528,"day_chg_2015":-1.1452,"projected_spy":630.38,"pct_from_now":-0.5854,"pct_from_anchor25":-4.3476},{"day":140,"days_ahead":54,"est_date_2026":"2026-06-11","ref_date_2015":"2015-05-06","pct_2015":11.5915,"day_chg_2015":-0.4117,"projected_spy":627.78,"pct_from_now":-0.9946,"pct_from_anchor25":-4.7413},{"day":141,"days_ahead":55,"est_date_2026":"2026-06-12","ref_date_2015":"2015-05-07","pct_2015":12.0367,"day_chg_2015":0.399,"projected_spy":630.29,"pct_from_now":-0.5996,"pct_from_anchor25":-4.3613},{"day":142,"days_ahead":56,"est_date_2026":"2026-06-15","ref_date_2015":"2015-05-08","pct_2015":13.5118,"day_chg_2015":1.3166,"projected_spy":638.59,"pct_from_now":0.7091,"pct_from_anchor25":-3.1021},{"day":143,"days_ahead":57,"est_date_2026":"2026-06-16","ref_date_2015":"2015-05-11","pct_2015":12.97,"day_chg_2015":-0.4773,"projected_spy":635.54,"pct_from_now":0.2284,"pct_from_anchor25":-3.5646},{"day":144,"days_ahead":58,"est_date_2026":"2026-06-17","ref_date_2015":"2015-05-12","pct_2015":12.6321,"day_chg_2015":-0.2991,"projected_spy":633.64,"pct_from_now":-0.0714,"pct_from_anchor25":-3.853},{"day":145,"days_ahead":59,"est_date_2026":"2026-06-18","ref_date_2015":"2015-05-13","pct_2015":12.6535,"day_chg_2015":0.0191,"projected_spy":633.76,"pct_from_now":-0.0523,"pct_from_anchor25":-3.8347},{"day":146,"days_ahead":60,"est_date_2026":"2026-06-19","ref_date_2015":"2015-05-14","pct_2015":13.8283,"day_chg_2015":1.0428,"projected_spy":640.37,"pct_from_now":0.9899,"pct_from_anchor25":-2.8319},{"day":147,"days_ahead":61,"est_date_2026":"2026-06-22","ref_date_2015":"2015-05-15","pct_2015":13.9516,"day_chg_2015":0.1084,"projected_spy":641.06,"pct_from_now":1.0993,"pct_from_anchor25":-2.7266},{"day":148,"days_ahead":62,"est_date_2026":"2026-06-23","ref_date_2015":"2015-05-18","pct_2015":14.3056,"day_chg_2015":0.3107,"projected_spy":643.05,"pct_from_now":1.4134,"pct_from_anchor25":-2.4244},{"day":149,"days_ahead":63,"est_date_2026":"2026-06-24","ref_date_2015":"2015-05-19","pct_2015":14.2681,"day_chg_2015":-0.0329,"projected_spy":642.84,"pct_from_now":1.3801,"pct_from_anchor25":-2.4565},{"day":150,"days_ahead":64,"est_date_2026":"2026-06-25","ref_date_2015":"2015-05-20","pct_2015":14.1876,"day_chg_2015":-0.0704,"projected_spy":642.39,"pct_from_now":1.3087,"pct_from_anchor25":-2.5252},{"day":151,"days_ahead":65,"est_date_2026":"2026-06-26","ref_date_2015":"2015-05-21","pct_2015":14.5202,"day_chg_2015":0.2912,"projected_spy":644.26,"pct_from_now":1.6038,"pct_from_anchor25":-2.2413},{"day":152,"days_ahead":66,"est_date_2026":"2026-06-29","ref_date_2015":"2015-05-22","pct_2015":14.2466,"day_chg_2015":-0.2389,"projected_spy":642.72,"pct_from_now":1.3611,"pct_from_anchor25":-2.4748},{"day":153,"days_ahead":67,"est_date_2026":"2026-06-30","ref_date_2015":"2015-05-26","pct_2015":13.0183,"day_chg_2015":-1.0752,"projected_spy":635.81,"pct_from_now":0.2713,"pct_from_anchor25":-3.5234},{"day":154,"days_ahead":68,"est_date_2026":"2026-07-01","ref_date_2015":"2015-05-27","pct_2015":14.0911,"day_chg_2015":0.9492,"projected_spy":641.85,"pct_from_now":1.223,"pct_from_anchor25":-2.6076},{"day":155,"days_ahead":69,"est_date_2026":"2026-07-02","ref_date_2015":"2015-05-28","pct_2015":13.9624,"day_chg_2015":-0.1128,"projected_spy":641.12,"pct_from_now":1.1088,"pct_from_anchor25":-2.7175},{"day":156,"days_ahead":70,"est_date_2026":"2026-07-03","ref_date_2015":"2015-05-29","pct_2015":13.2543,"day_chg_2015":-0.6213,"projected_spy":637.14,"pct_from_now":0.4807,"pct_from_anchor25":-3.3219},{"day":157,"days_ahead":71,"est_date_2026":"2026-07-06","ref_date_2015":"2015-06-01","pct_2015":13.485,"day_chg_2015":0.2037,"projected_spy":638.44,"pct_from_now":0.6853,"pct_from_anchor25":-3.125},{"day":158,"days_ahead":72,"est_date_2026":"2026-07-07","ref_date_2015":"2015-06-02","pct_2015":13.3723,"day_chg_2015":-0.0993,"projected_spy":637.8,"pct_from_now":0.5853,"pct_from_anchor25":-3.2212},{"day":159,"days_ahead":73,"est_date_2026":"2026-07-08","ref_date_2015":"2015-06-03","pct_2015":13.6727,"day_chg_2015":0.2649,"projected_spy":639.49,"pct_from_now":0.8519,"pct_from_anchor25":-2.9647},{"day":160,"days_ahead":74,"est_date_2026":"2026-07-09","ref_date_2015":"2015-06-04","pct_2015":12.7126,"day_chg_2015":-0.8447,"projected_spy":634.09,"pct_from_now":-0.0,"pct_from_anchor25":-3.7843},{"day":161,"days_ahead":75,"est_date_2026":"2026-07-10","ref_date_2015":"2015-06-05","pct_2015":12.5195,"day_chg_2015":-0.1713,"projected_spy":633.0,"pct_from_now":-0.1713,"pct_from_anchor25":-3.9492},{"day":162,"days_ahead":76,"est_date_2026":"2026-07-13","ref_date_2015":"2015-06-08","pct_2015":11.8275,"day_chg_2015":-0.615,"projected_spy":629.11,"pct_from_now":-0.7852,"pct_from_anchor25":-4.5399},{"day":163,"days_ahead":77,"est_date_2026":"2026-07-14","ref_date_2015":"2015-06-09","pct_2015":11.8114,"day_chg_2015":-0.0144,"projected_spy":629.02,"pct_from_now":-0.7995,"pct_from_anchor25":-4.5536},{"day":164,"days_ahead":78,"est_date_2026":"2026-07-15","ref_date_2015":"2015-06-10","pct_2015":13.1524,"day_chg_2015":1.1993,"projected_spy":636.56,"pct_from_now":0.3902,"pct_from_anchor25":-3.4089},{"day":165,"days_ahead":79,"est_date_2026":"2026-07-16","ref_date_2015":"2015-06-11","pct_2015":13.5171,"day_chg_2015":0.3224,"projected_spy":638.62,"pct_from_now":0.7138,"pct_from_anchor25":-3.0975},{"day":166,"days_ahead":80,"est_date_2026":"2026-07-17","ref_date_2015":"2015-06-12","pct_2015":12.6482,"day_chg_2015":-0.7655,"projected_spy":633.73,"pct_from_now":-0.0571,"pct_from_anchor25":-3.8393},{"day":167,"days_ahead":81,"est_date_2026":"2026-07-20","ref_date_2015":"2015-06-15","pct_2015":12.1654,"day_chg_2015":-0.4285,"projected_spy":631.01,"pct_from_now":-0.4854,"pct_from_anchor25":-4.2514},{"day":168,"days_ahead":82,"est_date_2026":"2026-07-21","ref_date_2015":"2015-06-16","pct_2015":12.7769,"day_chg_2015":0.5452,"projected_spy":634.45,"pct_from_now":0.0571,"pct_from_anchor25":-3.7294},{"day":169,"days_ahead":83,"est_date_2026":"2026-07-22","ref_date_2015":"2015-06-17","pct_2015":12.9593,"day_chg_2015":0.1617,"projected_spy":635.48,"pct_from_now":0.2189,"pct_from_anchor25":-3.5737},{"day":170,"days_ahead":84,"est_date_2026":"2026-07-23","ref_date_2015":"2015-06-18","pct_2015":14.134,"day_chg_2015":1.0399,"projected_spy":642.09,"pct_from_now":1.2611,"pct_from_anchor25":-2.571},{"day":171,"days_ahead":85,"est_date_2026":"2026-07-24","ref_date_2015":"2015-06-19","pct_2015":13.0773,"day_chg_2015":-0.9258,"projected_spy":636.14,"pct_from_now":0.3236,"pct_from_anchor25":-3.473},{"day":172,"days_ahead":86,"est_date_2026":"2026-07-27","ref_date_2015":"2015-06-22","pct_2015":13.6566,"day_chg_2015":0.5123,"projected_spy":639.4,"pct_from_now":0.8376,"pct_from_anchor25":-2.9785},{"day":173,"days_ahead":87,"est_date_2026":"2026-07-28","ref_date_2015":"2015-06-23","pct_2015":13.7371,"day_chg_2015":0.0708,"projected_spy":639.85,"pct_from_now":0.909,"pct_from_anchor25":-2.9098},{"day":174,"days_ahead":88,"est_date_2026":"2026-07-29","ref_date_2015":"2015-06-24","pct_2015":12.911,"day_chg_2015":-0.7263,"projected_spy":635.21,"pct_from_now":0.1761,"pct_from_anchor25":-3.6149},{"day":175,"days_ahead":89,"est_date_2026":"2026-07-30","ref_date_2015":"2015-06-25","pct_2015":12.5677,"day_chg_2015":-0.304,"projected_spy":633.28,"pct_from_now":-0.1285,"pct_from_anchor25":-3.908},{"day":176,"days_ahead":90,"est_date_2026":"2026-07-31","ref_date_2015":"2015-06-26","pct_2015":12.5463,"day_chg_2015":-0.0191,"projected_spy":633.15,"pct_from_now":-0.1475,"pct_from_anchor25":-3.9263},{"day":177,"days_ahead":91,"est_date_2026":"2026-08-03","ref_date_2015":"2015-06-29","pct_2015":10.1861,"day_chg_2015":-2.097,"projected_spy":619.88,"pct_from_now":-2.2415,"pct_from_anchor25":-5.941},{"day":178,"days_ahead":92,"est_date_2026":"2026-08-04","ref_date_2015":"2015-06-30","pct_2015":10.4168,"day_chg_2015":0.2093,"projected_spy":621.17,"pct_from_now":-2.0368,"pct_from_anchor25":-5.7441},{"day":179,"days_ahead":93,"est_date_2026":"2026-08-05","ref_date_2015":"2015-07-01","pct_2015":11.3018,"day_chg_2015":0.8016,"projected_spy":626.15,"pct_from_now":-1.2516,"pct_from_anchor25":-4.9886},{"day":180,"days_ahead":94,"est_date_2026":"2026-08-06","ref_date_2015":"2015-07-02","pct_2015":11.1999,"day_chg_2015":-0.0916,"projected_spy":625.58,"pct_from_now":-1.342,"pct_from_anchor25":-5.0756},{"day":181,"days_ahead":95,"est_date_2026":"2026-08-07","ref_date_2015":"2015-07-06","pct_2015":10.8834,"day_chg_2015":-0.2846,"projected_spy":623.8,"pct_from_now":-1.6228,"pct_from_anchor25":-5.3457},{"day":182,"days_ahead":96,"est_date_2026":"2026-08-10","ref_date_2015":"2015-07-07","pct_2015":11.5808,"day_chg_2015":0.6289,"projected_spy":627.72,"pct_from_now":-1.0041,"pct_from_anchor25":-4.7505},{"day":183,"days_ahead":97,"est_date_2026":"2026-08-11","ref_date_2015":"2015-07-08","pct_2015":9.7087,"day_chg_2015":-1.6777,"projected_spy":617.19,"pct_from_now":-2.665,"pct_from_anchor25":-6.3485},{"day":184,"days_ahead":98,"est_date_2026":"2026-08-12","ref_date_2015":"2015-07-09","pct_2015":9.9072,"day_chg_2015":0.1809,"projected_spy":618.31,"pct_from_now":-2.4889,"pct_from_anchor25":-6.1791},{"day":185,"days_ahead":99,"est_date_2026":"2026-08-13","ref_date_2015":"2015-07-10","pct_2015":11.2911,"day_chg_2015":1.2592,"projected_spy":626.09,"pct_from_now":-1.2611,"pct_from_anchor25":-4.9978},{"day":186,"days_ahead":100,"est_date_2026":"2026-08-14","ref_date_2015":"2015-07-13","pct_2015":12.5195,"day_chg_2015":1.1037,"projected_spy":633.0,"pct_from_now":-0.1713,"pct_from_anchor25":-3.9492},{"day":187,"days_ahead":101,"est_date_2026":"2026-08-17","ref_date_2015":"2015-07-14","pct_2015":13.0076,"day_chg_2015":0.4338,"projected_spy":635.75,"pct_from_now":0.2617,"pct_from_anchor25":-3.5325},{"day":188,"days_ahead":102,"est_date_2026":"2026-08-18","ref_date_2015":"2015-07-15","pct_2015":12.97,"day_chg_2015":-0.0332,"projected_spy":635.54,"pct_from_now":0.2284,"pct_from_anchor25":-3.5646},{"day":189,"days_ahead":103,"est_date_2026":"2026-08-19","ref_date_2015":"2015-07-16","pct_2015":13.8765,"day_chg_2015":0.8024,"projected_spy":640.64,"pct_from_now":1.0327,"pct_from_anchor25":-2.7907},{"day":190,"days_ahead":104,"est_date_2026":"2026-08-20","ref_date_2015":"2015-07-17","pct_2015":13.9731,"day_chg_2015":0.0848,"projected_spy":641.18,"pct_from_now":1.1184,"pct_from_anchor25":-2.7083},{"day":191,"days_ahead":105,"est_date_2026":"2026-08-21","ref_date_2015":"2015-07-20","pct_2015":14.0321,"day_chg_2015":0.0518,"projected_spy":641.51,"pct_from_now":1.1707,"pct_from_anchor25":-2.658},{"day":192,"days_ahead":106,"est_date_2026":"2026-08-24","ref_date_2015":"2015-07-21","pct_2015":13.5815,"day_chg_2015":-0.3951,"projected_spy":638.98,"pct_from_now":0.7709,"pct_from_anchor25":-3.0426},{"day":193,"days_ahead":107,"est_date_2026":"2026-08-25","ref_date_2015":"2015-07-22","pct_2015":13.3777,"day_chg_2015":-0.1795,"projected_spy":637.83,"pct_from_now":0.5901,"pct_from_anchor25":-3.2166},{"day":194,"days_ahead":108,"est_date_2026":"2026-08-26","ref_date_2015":"2015-07-23","pct_2015":12.7394,"day_chg_2015":-0.563,"projected_spy":634.24,"pct_from_now":0.0238,"pct_from_anchor25":-3.7615},{"day":195,"days_ahead":109,"est_date_2026":"2026-08-27","ref_date_2015":"2015-07-24","pct_2015":11.57,"day_chg_2015":-1.0372,"projected_spy":627.66,"pct_from_now":-1.0137,"pct_from_anchor25":-4.7596},{"day":196,"days_ahead":110,"est_date_2026":"2026-08-28","ref_date_2015":"2015-07-27","pct_2015":10.921,"day_chg_2015":-0.5817,"projected_spy":624.01,"pct_from_now":-1.5895,"pct_from_anchor25":-5.3137},{"day":197,"days_ahead":111,"est_date_2026":"2026-08-31","ref_date_2015":"2015-07-28","pct_2015":12.2834,"day_chg_2015":1.2283,"projected_spy":631.68,"pct_from_now":-0.3807,"pct_from_anchor25":-4.1507},{"day":198,"days_ahead":112,"est_date_2026":"2026-09-01","ref_date_2015":"2015-07-29","pct_2015":13.0558,"day_chg_2015":0.6879,"projected_spy":636.02,"pct_from_now":0.3046,"pct_from_anchor25":-3.4913},{"day":199,"days_ahead":113,"est_date_2026":"2026-09-02","ref_date_2015":"2015-07-30","pct_2015":13.0827,"day_chg_2015":0.0237,"projected_spy":636.17,"pct_from_now":0.3284,"pct_from_anchor25":-3.4684},{"day":200,"days_ahead":114,"est_date_2026":"2026-09-03","ref_date_2015":"2015-07-31","pct_2015":12.911,"day_chg_2015":-0.1518,"projected_spy":635.21,"pct_from_now":0.1761,"pct_from_anchor25":-3.6149},{"day":201,"days_ahead":115,"est_date_2026":"2026-09-04","ref_date_2015":"2015-08-03","pct_2015":12.5302,"day_chg_2015":-0.3373,"projected_spy":633.06,"pct_from_now":-0.1618,"pct_from_anchor25":-3.94},{"day":202,"days_ahead":116,"est_date_2026":"2026-09-07","ref_date_2015":"2015-08-04","pct_2015":12.3103,"day_chg_2015":-0.1954,"projected_spy":631.83,"pct_from_now":-0.3569,"pct_from_anchor25":-4.1278},{"day":203,"days_ahead":117,"est_date_2026":"2026-09-08","ref_date_2015":"2015-08-05","pct_2015":12.6804,"day_chg_2015":0.3295,"projected_spy":633.91,"pct_from_now":-0.0286,"pct_from_anchor25":-3.8118},{"day":204,"days_ahead":118,"est_date_2026":"2026-09-09","ref_date_2015":"2015-08-06","pct_2015":11.7578,"day_chg_2015":-0.8188,"projected_spy":628.72,"pct_from_now":-0.8471,"pct_from_anchor25":-4.5994},{"day":205,"days_ahead":119,"est_date_2026":"2026-09-10","ref_date_2015":"2015-08-07","pct_2015":11.5432,"day_chg_2015":-0.192,"projected_spy":627.51,"pct_from_now":-1.0375,"pct_from_anchor25":-4.7825},{"day":206,"days_ahead":120,"est_date_2026":"2026-09-11","ref_date_2015":"2015-08-10","pct_2015":12.9486,"day_chg_2015":1.2599,"projected_spy":635.42,"pct_from_now":0.2094,"pct_from_anchor25":-3.5829},{"day":207,"days_ahead":121,"est_date_2026":"2026-09-14","ref_date_2015":"2015-08-11","pct_2015":11.9294,"day_chg_2015":-0.9023,"projected_spy":629.68,"pct_from_now":-0.6948,"pct_from_anchor25":-4.4529},{"day":208,"days_ahead":122,"est_date_2026":"2026-09-15","ref_date_2015":"2015-08-12","pct_2015":12.0635,"day_chg_2015":0.1198,"projected_spy":630.44,"pct_from_now":-0.5758,"pct_from_anchor25":-4.3384},{"day":209,"days_ahead":123,"est_date_2026":"2026-09-16","ref_date_2015":"2015-08-13","pct_2015":11.9241,"day_chg_2015":-0.1244,"projected_spy":629.65,"pct_from_now":-0.6996,"pct_from_anchor25":-4.4574},{"day":210,"days_ahead":124,"est_date_2026":"2026-09-17","ref_date_2015":"2015-08-14","pct_2015":12.3317,"day_chg_2015":0.3642,"projected_spy":631.95,"pct_from_now":-0.3379,"pct_from_anchor25":-4.1095},{"day":211,"days_ahead":125,"est_date_2026":"2026-09-18","ref_date_2015":"2015-08-17","pct_2015":12.9593,"day_chg_2015":0.5587,"projected_spy":635.48,"pct_from_now":0.2189,"pct_from_anchor25":-3.5737},{"day":212,"days_ahead":126,"est_date_2026":"2026-09-21","ref_date_2015":"2015-08-18","pct_2015":12.6321,"day_chg_2015":-0.2897,"projected_spy":633.64,"pct_from_now":-0.0714,"pct_from_anchor25":-3.853},{"day":213,"days_ahead":127,"est_date_2026":"2026-09-22","ref_date_2015":"2015-08-19","pct_2015":11.7417,"day_chg_2015":-0.7905,"projected_spy":628.63,"pct_from_now":-0.8614,"pct_from_anchor25":-4.6131},{"day":214,"days_ahead":128,"est_date_2026":"2026-09-23","ref_date_2015":"2015-08-20","pct_2015":9.4084,"day_chg_2015":-2.0881,"projected_spy":615.5,"pct_from_now":-2.9315,"pct_from_anchor25":-6.6049},{"day":215,"days_ahead":129,"est_date_2026":"2026-09-24","ref_date_2015":"2015-08-21","pct_2015":6.1149,"day_chg_2015":-3.0102,"projected_spy":596.97,"pct_from_now":-5.8535,"pct_from_anchor25":-9.4164},{"day":216,"days_ahead":130,"est_date_2026":"2026-09-25","ref_date_2015":"2015-08-24","pct_2015":1.6467,"day_chg_2015":-4.2107,"projected_spy":571.84,"pct_from_now":-9.8177,"pct_from_anchor25":-13.2305},{"day":217,"days_ahead":131,"est_date_2026":"2026-09-28","ref_date_2015":"2015-08-25","pct_2015":0.4506,"day_chg_2015":-1.1768,"projected_spy":565.11,"pct_from_now":-10.879,"pct_from_anchor25":-14.2516},{"day":218,"days_ahead":132,"est_date_2026":"2026-09-29","ref_date_2015":"2015-08-26","pct_2015":4.3073,"day_chg_2015":3.8394,"projected_spy":586.8,"pct_from_now":-7.4573,"pct_from_anchor25":-10.9594},{"day":219,"days_ahead":133,"est_date_2026":"2026-09-30","ref_date_2015":"2015-08-27","pct_2015":6.8873,"day_chg_2015":2.4735,"projected_spy":601.32,"pct_from_now":-5.1682,"pct_from_anchor25":-8.757},{"day":220,"days_ahead":134,"est_date_2026":"2026-10-01","ref_date_2015":"2015-08-28","pct_2015":6.8927,"day_chg_2015":0.005,"projected_spy":601.35,"pct_from_now":-5.1635,"pct_from_anchor25":-8.7524},{"day":221,"days_ahead":135,"est_date_2026":"2026-10-02","ref_date_2015":"2015-08-31","pct_2015":6.0291,"day_chg_2015":-0.8079,"projected_spy":596.49,"pct_from_now":-5.9297,"pct_from_anchor25":-9.4896},{"day":222,"days_ahead":136,"est_date_2026":"2026-10-05","ref_date_2015":"2015-09-01","pct_2015":2.8644,"day_chg_2015":-2.9848,"projected_spy":578.69,"pct_from_now":-8.7374,"pct_from_anchor25":-12.1911},{"day":223,"days_ahead":137,"est_date_2026":"2026-10-06","ref_date_2015":"2015-09-02","pct_2015":4.8168,"day_chg_2015":1.8981,"projected_spy":589.67,"pct_from_now":-7.0052,"pct_from_anchor25":-10.5244},{"day":224,"days_ahead":138,"est_date_2026":"2026-10-07","ref_date_2015":"2015-09-03","pct_2015":4.8919,"day_chg_2015":0.0716,"projected_spy":590.09,"pct_from_now":-6.9386,"pct_from_anchor25":-10.4603},{"day":225,"days_ahead":139,"est_date_2026":"2026-10-08","ref_date_2015":"2015-09-04","pct_2015":3.3042,"day_chg_2015":-1.5137,"projected_spy":581.16,"pct_from_now":-8.3472,"pct_from_anchor25":-11.8157},{"day":226,"days_ahead":140,"est_date_2026":"2026-10-09","ref_date_2015":"2015-09-08","pct_2015":5.9003,"day_chg_2015":2.5131,"projected_spy":595.77,"pct_from_now":-6.0439,"pct_from_anchor25":-9.5995},{"day":227,"days_ahead":141,"est_date_2026":"2026-10-12","ref_date_2015":"2015-09-09","pct_2015":4.4843,"day_chg_2015":-1.3372,"projected_spy":587.8,"pct_from_now":-7.3002,"pct_from_anchor25":-10.8083},{"day":228,"days_ahead":142,"est_date_2026":"2026-10-13","ref_date_2015":"2015-09-10","pct_2015":5.0528,"day_chg_2015":0.5442,"projected_spy":591.0,"pct_from_now":-6.7958,"pct_from_anchor25":-10.323},{"day":229,"days_ahead":143,"est_date_2026":"2026-10-14","ref_date_2015":"2015-09-11","pct_2015":5.5302,"day_chg_2015":0.4544,"projected_spy":593.68,"pct_from_now":-6.3722,"pct_from_anchor25":-9.9154},{"day":230,"days_ahead":144,"est_date_2026":"2026-10-15","ref_date_2015":"2015-09-14","pct_2015":5.1387,"day_chg_2015":-0.3711,"projected_spy":591.48,"pct_from_now":-6.7197,"pct_from_anchor25":-10.2497},{"day":231,"days_ahead":145,"est_date_2026":"2026-10-16","ref_date_2015":"2015-09-15","pct_2015":6.4528,"day_chg_2015":1.2499,"projected_spy":598.87,"pct_from_now":-5.5537,"pct_from_anchor25":-9.1279},{"day":232,"days_ahead":146,"est_date_2026":"2026-10-19","ref_date_2015":"2015-09-16","pct_2015":7.3754,"day_chg_2015":0.8667,"projected_spy":604.06,"pct_from_now":-4.7352,"pct_from_anchor25":-8.3403},{"day":233,"days_ahead":147,"est_date_2026":"2026-10-20","ref_date_2015":"2015-09-17","pct_2015":7.134,"day_chg_2015":-0.2248,"projected_spy":602.71,"pct_from_now":-4.9493,"pct_from_anchor25":-8.5464},{"day":234,"days_ahead":148,"est_date_2026":"2026-10-21","ref_date_2015":"2015-09-18","pct_2015":4.8383,"day_chg_2015":-2.1429,"projected_spy":589.79,"pct_from_now":-6.9862,"pct_from_anchor25":-10.5061},{"day":235,"days_ahead":149,"est_date_2026":"2026-10-22","ref_date_2015":"2015-09-21","pct_2015":5.38,"day_chg_2015":0.5168,"projected_spy":592.84,"pct_from_now":-6.5055,"pct_from_anchor25":-10.0437},{"day":236,"days_ahead":150,"est_date_2026":"2026-10-23","ref_date_2015":"2015-09-22","pct_2015":4.0122,"day_chg_2015":-1.298,"projected_spy":585.14,"pct_from_now":-7.719,"pct_from_anchor25":-11.2113},{"day":237,"days_ahead":151,"est_date_2026":"2026-10-26","ref_date_2015":"2015-09-23","pct_2015":3.846,"day_chg_2015":-0.1599,"projected_spy":584.21,"pct_from_now":-7.8666,"pct_from_anchor25":-11.3532},{"day":238,"days_ahead":152,"est_date_2026":"2026-10-27","ref_date_2015":"2015-09-24","pct_2015":3.4705,"day_chg_2015":-0.3616,"projected_spy":582.1,"pct_from_now":-8.1997,"pct_from_anchor25":-11.6737},{"day":239,"days_ahead":153,"est_date_2026":"2026-10-28","ref_date_2015":"2015-09-25","pct_2015":3.4437,"day_chg_2015":-0.0259,"projected_spy":581.95,"pct_from_now":-8.2235,"pct_from_anchor25":-11.6966},{"day":240,"days_ahead":154,"est_date_2026":"2026-10-29","ref_date_2015":"2015-09-28","pct_2015":0.8475,"day_chg_2015":-2.5097,"projected_spy":567.34,"pct_from_now":-10.5268,"pct_from_anchor25":-13.9128},{"day":241,"days_ahead":155,"est_date_2026":"2026-10-30","ref_date_2015":"2015-09-29","pct_2015":0.9065,"day_chg_2015":0.0585,"projected_spy":567.67,"pct_from_now":-10.4745,"pct_from_anchor25":-13.8624},{"day":242,"days_ahead":156,"est_date_2026":"2026-11-02","ref_date_2015":"2015-09-30","pct_2015":2.7893,"day_chg_2015":1.8658,"projected_spy":578.26,"pct_from_now":-8.8041,"pct_from_anchor25":-12.2552},{"day":243,"days_ahead":157,"est_date_2026":"2026-11-03","ref_date_2015":"2015-10-01","pct_2015":3.0575,"day_chg_2015":0.2609,"projected_spy":579.77,"pct_from_now":-8.5661,"pct_from_anchor25":-12.0263},{"day":244,"days_ahead":158,"est_date_2026":"2026-11-04","ref_date_2015":"2015-10-02","pct_2015":4.5969,"day_chg_2015":1.4938,"projected_spy":588.43,"pct_from_now":-7.2003,"pct_from_anchor25":-10.7122},{"day":245,"days_ahead":159,"est_date_2026":"2026-11-05","ref_date_2015":"2015-10-05","pct_2015":6.4582,"day_chg_2015":1.7795,"projected_spy":598.9,"pct_from_now":-5.5489,"pct_from_anchor25":-9.1233},{"day":246,"days_ahead":160,"est_date_2026":"2026-11-06","ref_date_2015":"2015-10-06","pct_2015":6.0934,"day_chg_2015":-0.3426,"projected_spy":596.85,"pct_from_now":-5.8726,"pct_from_anchor25":-9.4347},{"day":247,"days_ahead":161,"est_date_2026":"2026-11-09","ref_date_2015":"2015-10-07","pct_2015":6.9624,"day_chg_2015":0.8191,"projected_spy":601.74,"pct_from_now":-5.1016,"pct_from_anchor25":-8.6929},{"day":248,"days_ahead":162,"est_date_2026":"2026-11-10","ref_date_2015":"2015-10-08","pct_2015":7.9279,"day_chg_2015":0.9027,"projected_spy":607.17,"pct_from_now":-4.245,"pct_from_anchor25":-7.8687},{"day":249,"days_ahead":163,"est_date_2026":"2026-11-11","ref_date_2015":"2015-10-09","pct_2015":7.9923,"day_chg_2015":0.0596,"projected_spy":607.54,"pct_from_now":-4.1879,"pct_from_anchor25":-7.8138},{"day":250,"days_ahead":164,"est_date_2026":"2026-11-12","ref_date_2015":"2015-10-12","pct_2015":8.0942,"day_chg_2015":0.0944,"projected_spy":608.11,"pct_from_now":-4.0975,"pct_from_anchor25":-7.7268},{"day":251,"days_ahead":165,"est_date_2026":"2026-11-13","ref_date_2015":"2015-10-13","pct_2015":7.413,"day_chg_2015":-0.6302,"projected_spy":604.28,"pct_from_now":-4.7019,"pct_from_anchor25":-8.3083},{"day":252,"days_ahead":166,"est_date_2026":"2026-11-16","ref_date_2015":"2015-10-14","pct_2015":6.898,"day_chg_2015":-0.4794,"projected_spy":601.38,"pct_from_now":-5.1587,"pct_from_anchor25":-8.7478},{"day":253,"days_ahead":167,"est_date_2026":"2026-11-17","ref_date_2015":"2015-10-15","pct_2015":8.5394,"day_chg_2015":1.5355,"projected_spy":610.61,"pct_from_now":-3.7025,"pct_from_anchor25":-7.3467},{"day":254,"days_ahead":168,"est_date_2026":"2026-11-18","ref_date_2015":"2015-10-16","pct_2015":9.0329,"day_chg_2015":0.4547,"projected_spy":613.39,"pct_from_now":-3.2646,"pct_from_anchor25":-6.9255},{"day":255,"days_ahead":169,"est_date_2026":"2026-11-19","ref_date_2015":"2015-10-19","pct_2015":9.0865,"day_chg_2015":0.0492,"projected_spy":613.69,"pct_from_now":-3.2171,"pct_from_anchor25":-6.8797},{"day":256,"days_ahead":170,"est_date_2026":"2026-11-20","ref_date_2015":"2015-10-20","pct_2015":8.9471,"day_chg_2015":-0.1278,"projected_spy":612.91,"pct_from_now":-3.3408,"pct_from_anchor25":-6.9987},{"day":257,"days_ahead":171,"est_date_2026":"2026-11-23","ref_date_2015":"2015-10-21","pct_2015":8.2712,"day_chg_2015":-0.6204,"projected_spy":609.1,"pct_from_now":-3.9404,"pct_from_anchor25":-7.5756},{"day":258,"days_ahead":172,"est_date_2026":"2026-11-24","ref_date_2015":"2015-10-22","pct_2015":10.1003,"day_chg_2015":1.6894,"projected_spy":619.39,"pct_from_now":-2.3176,"pct_from_anchor25":-6.0143},{"day":259,"days_ahead":173,"est_date_2026":"2026-11-25","ref_date_2015":"2015-10-23","pct_2015":11.3072,"day_chg_2015":1.0962,"projected_spy":626.18,"pct_from_now":-1.2469,"pct_from_anchor25":-4.984},{"day":260,"days_ahead":174,"est_date_2026":"2026-11-26","ref_date_2015":"2015-10-26","pct_2015":11.0336,"day_chg_2015":-0.2458,"projected_spy":624.64,"pct_from_now":-1.4896,"pct_from_anchor25":-5.2175},{"day":261,"days_ahead":175,"est_date_2026":"2026-11-27","ref_date_2015":"2015-10-27","pct_2015":10.8191,"day_chg_2015":-0.1932,"projected_spy":623.44,"pct_from_now":-1.6799,"pct_from_anchor25":-5.4007},{"day":262,"days_ahead":176,"est_date_2026":"2026-11-30","ref_date_2015":"2015-10-28","pct_2015":12.0796,"day_chg_2015":1.1375,"projected_spy":630.53,"pct_from_now":-0.5616,"pct_from_anchor25":-4.3247},{"day":263,"days_ahead":177,"est_date_2026":"2026-12-01","ref_date_2015":"2015-10-29","pct_2015":12.0152,"day_chg_2015":-0.0574,"projected_spy":630.17,"pct_from_now":-0.6187,"pct_from_anchor25":-4.3796},{"day":264,"days_ahead":178,"est_date_2026":"2026-12-02","ref_date_2015":"2015-10-30","pct_2015":11.5325,"day_chg_2015":-0.431,"projected_spy":627.45,"pct_from_now":-1.047,"pct_from_anchor25":-4.7917},{"day":265,"days_ahead":179,"est_date_2026":"2026-12-03","ref_date_2015":"2015-11-02","pct_2015":12.852,"day_chg_2015":1.1831,"projected_spy":634.87,"pct_from_now":0.1237,"pct_from_anchor25":-3.6653},{"day":266,"days_ahead":180,"est_date_2026":"2026-12-04","ref_date_2015":"2015-11-03","pct_2015":13.1792,"day_chg_2015":0.2899,"projected_spy":636.72,"pct_from_now":0.414,"pct_from_anchor25":-3.386},{"day":267,"days_ahead":181,"est_date_2026":"2026-12-07","ref_date_2015":"2015-11-04","pct_2015":12.8359,"day_chg_2015":-0.3033,"projected_spy":634.78,"pct_from_now":0.1095,"pct_from_anchor25":-3.679},{"day":268,"days_ahead":182,"est_date_2026":"2026-12-08","ref_date_2015":"2015-11-05","pct_2015":12.7233,"day_chg_2015":-0.0998,"projected_spy":634.15,"pct_from_now":0.0095,"pct_from_anchor25":-3.7752},{"day":269,"days_ahead":183,"est_date_2026":"2026-12-09","ref_date_2015":"2015-11-06","pct_2015":12.6643,"day_chg_2015":-0.0523,"projected_spy":633.82,"pct_from_now":-0.0428,"pct_from_anchor25":-3.8256},{"day":270,"days_ahead":184,"est_date_2026":"2026-12-10","ref_date_2015":"2015-11-09","pct_2015":11.6129,"day_chg_2015":-0.9332,"projected_spy":627.9,"pct_from_now":-0.9756,"pct_from_anchor25":-4.723},{"day":271,"days_ahead":185,"est_date_2026":"2026-12-11","ref_date_2015":"2015-11-10","pct_2015":11.8704,"day_chg_2015":0.2307,"projected_spy":629.35,"pct_from_now":-0.7472,"pct_from_anchor25":-4.5032},{"day":272,"days_ahead":186,"est_date_2026":"2026-12-14","ref_date_2015":"2015-11-11","pct_2015":11.4306,"day_chg_2015":-0.3932,"projected_spy":626.88,"pct_from_now":-1.1374,"pct_from_anchor25":-4.8787},{"day":273,"days_ahead":187,"est_date_2026":"2026-12-15","ref_date_2015":"2015-11-12","pct_2015":9.875,"day_chg_2015":-1.396,"projected_spy":618.13,"pct_from_now":-2.5175,"pct_from_anchor25":-6.2066},{"day":274,"days_ahead":188,"est_date_2026":"2026-12-16","ref_date_2015":"2015-11-13","pct_2015":8.6413,"day_chg_2015":-1.1228,"projected_spy":611.19,"pct_from_now":-3.6121,"pct_from_anchor25":-7.2597},{"day":275,"days_ahead":189,"est_date_2026":"2026-12-17","ref_date_2015":"2015-11-16","pct_2015":10.2934,"day_chg_2015":1.5207,"projected_spy":620.48,"pct_from_now":-2.1463,"pct_from_anchor25":-5.8494},{"day":276,"days_ahead":190,"est_date_2026":"2026-12-18","ref_date_2015":"2015-11-17","pct_2015":10.213,"day_chg_2015":-0.0729,"projected_spy":620.03,"pct_from_now":-2.2177,"pct_from_anchor25":-5.9181},{"day":277,"days_ahead":191,"est_date_2026":"2026-12-21","ref_date_2015":"2015-11-18","pct_2015":11.9616,"day_chg_2015":1.5866,"projected_spy":629.87,"pct_from_now":-0.6663,"pct_from_anchor25":-4.4254},{"day":278,"days_ahead":192,"est_date_2026":"2026-12-22","ref_date_2015":"2015-11-19","pct_2015":11.865,"day_chg_2015":-0.0862,"projected_spy":629.32,"pct_from_now":-0.7519,"pct_from_anchor25":-4.5078},{"day":279,"days_ahead":193,"est_date_2026":"2026-12-23","ref_date_2015":"2015-11-20","pct_2015":12.2727,"day_chg_2015":0.3644,"projected_spy":631.62,"pct_from_now":-0.3902,"pct_from_anchor25":-4.1598},{"day":280,"days_ahead":194,"est_date_2026":"2026-12-24","ref_date_2015":"2015-11-23","pct_2015":12.144,"day_chg_2015":-0.1147,"projected_spy":630.89,"pct_from_now":-0.5044,"pct_from_anchor25":-4.2697},{"day":281,"days_ahead":195,"est_date_2026":"2026-12-25","ref_date_2015":"2015-11-24","pct_2015":12.2942,"day_chg_2015":0.1339,"projected_spy":631.74,"pct_from_now":-0.3712,"pct_from_anchor25":-4.1415},{"day":282,"days_ahead":196,"est_date_2026":"2026-12-28","ref_date_2015":"2015-11-25","pct_2015":12.2781,"day_chg_2015":-0.0143,"projected_spy":631.65,"pct_from_now":-0.3855,"pct_from_anchor25":-4.1552},{"day":283,"days_ahead":197,"est_date_2026":"2026-12-29","ref_date_2015":"2015-11-27","pct_2015":12.4068,"day_chg_2015":0.1147,"projected_spy":632.37,"pct_from_now":-0.2713,"pct_from_anchor25":-4.0453},{"day":284,"days_ahead":198,"est_date_2026":"2026-12-30","ref_date_2015":"2015-11-30","pct_2015":11.9401,"day_chg_2015":-0.4152,"projected_spy":629.74,"pct_from_now":-0.6853,"pct_from_anchor25":-4.4437},{"day":285,"days_ahead":199,"est_date_2026":"2026-12-31","ref_date_2015":"2015-12-01","pct_2015":13.0076,"day_chg_2015":0.9536,"projected_spy":635.75,"pct_from_now":0.2617,"pct_from_anchor25":-3.5325},{"day":286,"days_ahead":200,"est_date_2026":"2027-01-01","ref_date_2015":"2015-12-02","pct_2015":11.8543,"day_chg_2015":-1.0205,"projected_spy":629.26,"pct_from_now":-0.7614,"pct_from_anchor25":-4.517},{"day":287,"days_ahead":201,"est_date_2026":"2027-01-04","ref_date_2015":"2015-12-03","pct_2015":10.288,"day_chg_2015":-1.4003,"projected_spy":620.45,"pct_from_now":-2.1511,"pct_from_anchor25":-5.854},{"day":288,"days_ahead":202,"est_date_2026":"2027-01-05","ref_date_2015":"2015-12-04","pct_2015":12.439,"day_chg_2015":1.9503,"projected_spy":632.55,"pct_from_now":-0.2427,"pct_from_anchor25":-4.0179},{"day":289,"days_ahead":203,"est_date_2026":"2027-01-06","ref_date_2015":"2015-12-07","pct_2015":11.7578,"day_chg_2015":-0.6059,"projected_spy":628.72,"pct_from_now":-0.8471,"pct_from_anchor25":-4.5994},{"day":290,"days_ahead":204,"est_date_2026":"2027-01-07","ref_date_2015":"2015-12-08","pct_2015":11.0068,"day_chg_2015":-0.672,"projected_spy":624.49,"pct_from_now":-1.5134,"pct_from_anchor25":-5.2404},{"day":291,"days_ahead":205,"est_date_2026":"2027-01-08","ref_date_2015":"2015-12-09","pct_2015":10.1432,"day_chg_2015":-0.778,"projected_spy":619.64,"pct_from_now":-2.2795,"pct_from_anchor25":-5.9776},{"day":292,"days_ahead":206,"est_date_2026":"2027-01-11","ref_date_2015":"2015-12-10","pct_2015":10.4275,"day_chg_2015":0.2581,"projected_spy":621.23,"pct_from_now":-2.0273,"pct_from_anchor25":-5.735},{"day":293,"days_ahead":207,"est_date_2026":"2027-01-12","ref_date_2015":"2015-12-11","pct_2015":8.2873,"day_chg_2015":-1.9381,"projected_spy":609.19,"pct_from_now":-3.9261,"pct_from_anchor25":-7.5619},{"day":294,"days_ahead":208,"est_date_2026":"2027-01-13","ref_date_2015":"2015-12-14","pct_2015":8.8344,"day_chg_2015":0.5052,"projected_spy":612.27,"pct_from_now":-3.4407,"pct_from_anchor25":-7.0949},{"day":295,"days_ahead":209,"est_date_2026":"2027-01-14","ref_date_2015":"2015-12-15","pct_2015":9.9769,"day_chg_2015":1.0498,"projected_spy":618.7,"pct_from_now":-2.4271,"pct_from_anchor25":-6.1196},{"day":296,"days_ahead":210,"est_date_2026":"2027-01-15","ref_date_2015":"2015-12-16","pct_2015":11.5861,"day_chg_2015":1.4632,"projected_spy":627.75,"pct_from_now":-0.9994,"pct_from_anchor25":-4.7459},{"day":297,"days_ahead":211,"est_date_2026":"2027-01-18","ref_date_2015":"2015-12-17","pct_2015":9.8858,"day_chg_2015":-1.5238,"projected_spy":618.19,"pct_from_now":-2.508,"pct_from_anchor25":-6.1974},{"day":298,"days_ahead":212,"est_date_2026":"2027-01-19","ref_date_2015":"2015-12-18","pct_2015":7.2896,"day_chg_2015":-2.3626,"projected_spy":603.58,"pct_from_now":-4.8113,"pct_from_anchor25":-8.4136},{"day":299,"days_ahead":213,"est_date_2026":"2027-01-20","ref_date_2015":"2015-12-21","pct_2015":8.1747,"day_chg_2015":0.8249,"projected_spy":608.56,"pct_from_now":-4.0261,"pct_from_anchor25":-7.6581},{"day":300,"days_ahead":214,"est_date_2026":"2027-01-21","ref_date_2015":"2015-12-22","pct_2015":9.1563,"day_chg_2015":0.9074,"projected_spy":614.08,"pct_from_now":-3.1552,"pct_from_anchor25":-6.8201},{"day":301,"days_ahead":215,"est_date_2026":"2027-01-22","ref_date_2015":"2015-12-23","pct_2015":10.508,"day_chg_2015":1.2383,"projected_spy":621.69,"pct_from_now":-1.9559,"pct_from_anchor25":-5.6663},{"day":302,"days_ahead":216,"est_date_2026":"2027-01-25","ref_date_2015":"2015-12-24","pct_2015":10.3256,"day_chg_2015":-0.165,"projected_spy":620.66,"pct_from_now":-2.1177,"pct_from_anchor25":-5.8219},{"day":303,"days_ahead":217,"est_date_2026":"2027-01-26","ref_date_2015":"2015-12-28","pct_2015":10.0735,"day_chg_2015":-0.2285,"projected_spy":619.24,"pct_from_now":-2.3414,"pct_from_anchor25":-6.0371},{"day":304,"days_ahead":218,"est_date_2026":"2027-01-27","ref_date_2015":"2015-12-29","pct_2015":11.2482,"day_chg_2015":1.0672,"projected_spy":625.85,"pct_from_now":-1.2992,"pct_from_anchor25":-5.0344},{"day":305,"days_ahead":219,"est_date_2026":"2027-01-28","ref_date_2015":"2015-12-30","pct_2015":10.4597,"day_chg_2015":-0.7088,"projected_spy":621.42,"pct_from_now":-1.9988,"pct_from_anchor25":-5.7075},{"day":306,"days_ahead":220,"est_date_2026":"2027-01-29","ref_date_2015":"2015-12-31","pct_2015":9.3547,"day_chg_2015":-1.0003,"projected_spy":615.2,"pct_from_now":-2.9791,"pct_from_anchor25":-6.6507}],"milestones":{"peak1":{"day":151,"est_date":"2026-06-26","proj_spy":644.26,"pct_from_now":1.6038,"label":"Peak 1","color":"#00ff88","pct_2015":14.52},"trough1":{"day":217,"est_date":"2026-09-28","proj_spy":565.11,"pct_from_now":-10.879,"label":"Trough 1","color":"#ff3355","pct_2015":0.45},"peak2":{"day":266,"est_date":"2026-12-04","proj_spy":636.72,"pct_from_now":0.414,"label":"Peak 2","color":"#00ff88","pct_2015":13.18},"trough2":{"day":298,"est_date":"2027-01-19","proj_spy":603.58,"pct_from_now":-4.8113,"label":"Trough 2","color":"#ff8800","pct_2015":7.29},"yearend":{"day":306,"est_date":"2027-01-29","proj_spy":615.2,"pct_from_now":-2.9791,"label":"Year End","color":"var(--cyan)","pct_2015":9.35}}};

function renderAnalog() {
  const D = ANALOG_DATA;
  const hist = D.hist;
  const proj = D.proj;
  const ms = D.milestones;
  const curPrice = D.current.price;
  const anchor25 = D.anchor_2025.price;
  const anchor14 = D.anchor_2014.price;
  const curDay = D.current.day;

  // ── HEADER CARDS ────────────────────────────────────────────────────────────
  const cardsEl = $('analogCards');
  if(cardsEl) {
    const cur2015pct = hist[hist.length-1].pct_2015;
    const cur2026pct = hist[hist.length-1].pct_2026;
    const div = cur2026pct - cur2015pct;
    const divColor = div > 0 ? '#00ff88' : '#ff3355';
    const nextMilestone = Object.values(ms).find(m => m.day > curDay);

    cardsEl.innerHTML = [
      {
        label: 'CYCLE DAY',
        val: `Day ${curDay}`,
        sub: `of 306 total days`,
        color: 'var(--cyan)'
      },
      {
        label: '2015 WAS HERE',
        val: `${cur2015pct >= 0 ? '+' : ''}${cur2015pct.toFixed(2)}%`,
        sub: `from Oct 2014 low`,
        color: '#ffcc00'
      },
      {
        label: '2026 IS HERE',
        val: `${cur2026pct >= 0 ? '+' : ''}${cur2026pct.toFixed(2)}%`,
        sub: `from Nov 2025 low`,
        color: cur2026pct >= 0 ? '#00ff88' : '#ff3355'
      },
      {
        label: 'DIVERGENCE',
        val: `${div >= 0 ? '+' : ''}${div.toFixed(2)}%`,
        sub: `2026 vs 2015 pace`,
        color: divColor
      },
      {
        label: nextMilestone ? `NEXT: ${nextMilestone.label.toUpperCase()}` : 'CYCLE COMPLETE',
        val: nextMilestone ? `$${nextMilestone.proj_spy.toFixed(2)}` : '—',
        sub: nextMilestone ? `${nextMilestone.est_date} · ${nextMilestone.pct_from_now >= 0 ? '+' : ''}${nextMilestone.pct_from_now.toFixed(2)}% from now` : '',
        color: nextMilestone?.color || 'var(--text3)'
      }
    ].map(c => `
      <div class="panel" style="text-align:center;border-top:3px solid ${c.color};">
        <div style="font-family:'Orbitron',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:6px;">${c.label}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:900;color:${c.color};">${c.val}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px;">${c.sub}</div>
      </div>`).join('');
  }

  // ── OVERLAY CHART (Canvas) ───────────────────────────────────────────────────
  const chartEl = $('analogChart');
  if(chartEl) {
    chartEl.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%;';
    chartEl.appendChild(canvas);

    requestAnimationFrame(() => {
      const W = canvas.offsetWidth || 900;
      const H = canvas.offsetHeight || 320;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      const pad = {l:52, r:20, t:20, b:36};
      const cw = W - pad.l - pad.r;
      const ch = H - pad.t - pad.b;

      // All pct values combined for scale
      const allPcts2015 = [...hist.map(h => h.pct_2015), ...proj.map(p => p.pct_2015)];
      const allPcts2026 = [...hist.map(h => h.pct_2026), ...proj.map(p => p.pct_from_anchor25)];
      const allPcts = [...allPcts2015, ...allPcts2026];
      const minP = Math.min(...allPcts) - 1;
      const maxP = Math.max(...allPcts) + 1;
      const range = maxP - minP;
      const totalDays = hist.length + proj.length;

      const px = day => pad.l + ((day - 1) / (totalDays - 1)) * cw;
      const py = pct => pad.t + ch - ((pct - minP) / range) * ch;

      ctx.clearRect(0, 0, W, H);

      // Zero line
      const zeroY = py(0);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(pad.l, zeroY); ctx.lineTo(W - pad.r, zeroY); ctx.stroke();
      ctx.setLineDash([]);

      // Grid lines
      [-10,-5,0,5,10,15,20].forEach(pct => {
        if(pct < minP || pct > maxP) return;
        const y = py(pct);
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
        ctx.fillStyle = '#505070';
        ctx.font = '9px "Share Tech Mono",monospace';
        ctx.textAlign = 'right';
        ctx.fillText((pct >= 0 ? '+' : '') + pct + '%', pad.l - 4, y + 3);
      });

      // Milestone vertical lines
      Object.values(ms).forEach(m => {
        const x = px(m.day);
        ctx.strokeStyle = m.color + '44';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ch); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = m.color;
        ctx.font = '7px "Orbitron",monospace';
        ctx.textAlign = 'center';
        ctx.fillText(m.label.toUpperCase(), x, pad.t - 4);
      });

      // Today divider
      const todayX = px(curDay);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(todayX, pad.t); ctx.lineTo(todayX, pad.t + ch); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '8px "Orbitron",monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TODAY', todayX, pad.t + 10);

      // Draw 2015 line (full — historical + projection reference)
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      hist.forEach((h, i) => {
        const x = px(h.day); const y = py(h.pct_2015);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      proj.forEach(p => {
        ctx.lineTo(px(p.day), py(p.pct_2015));
      });
      ctx.stroke();

      // Draw 2026 historical (solid cyan)
      ctx.strokeStyle = 'var(--cyan)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      hist.forEach((h, i) => {
        const x = px(h.day); const y = py(h.pct_2026);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw 2026 projection (dashed cyan)
      ctx.strokeStyle = '#00ccff88';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      // Start from last historical point
      const lastH = hist[hist.length - 1];
      ctx.moveTo(px(lastH.day), py(lastH.pct_2026));
      proj.forEach(p => {
        ctx.lineTo(px(p.day), py(p.pct_from_anchor25));
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Current dot
      ctx.fillStyle = 'var(--cyan)';
      ctx.beginPath();
      ctx.arc(todayX, py(lastH.pct_2026), 5, 0, Math.PI * 2);
      ctx.fill();

      // Legend
      const legendItems = [
        {color:'#ffcc00', label:'2014/2015 actual', dash:false},
        {color:'#00ccff', label:'2025/2026 actual', dash:false},
        {color:'#00ccff88', label:'2026 projected (if 2015 repeats)', dash:true},
      ];
      legendItems.forEach((item, i) => {
        const lx = pad.l + i * 220;
        const ly = H - 10;
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2;
        if(item.dash) ctx.setLineDash([6,4]);
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 24, ly); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '9px "Share Tech Mono",monospace';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, lx + 28, ly + 3);
      });
    });
  }

  // ── ROADMAP ─────────────────────────────────────────────────────────────────
  const roadmapEl = $('analogRoadmap');
  if(roadmapEl) {
    roadmapEl.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:12px;">
        ${Object.entries(ms).map(([k, m]) => {
          const isPast = m.day <= curDay;
          const isCurrent = !isPast && m.day === Object.values(ms).find(x => x.day > curDay)?.day;
          const bc = isPast ? 'var(--bg3)' : m.color + '11';
          const bc2 = isPast ? 'var(--border)' : m.color + '44';
          return `<div style="padding:12px;background:${bc};border:1px solid ${bc2};border-top:3px solid ${isPast?'var(--border2)':m.color};border-radius:4px;text-align:center;${isCurrent?'box-shadow:0 0 12px '+m.color+'44;':''}">
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:${isPast?'var(--text3)':m.color};margin-bottom:4px;letter-spacing:1px;">${m.label.toUpperCase()}</div>
            <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:6px;">Day ${m.day}</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:20px;font-weight:900;color:${isPast?'var(--text3)':m.color};">$${m.proj_spy.toFixed(0)}</div>
            <div style="font-size:11px;color:${isPast?'var(--text3)':m.color};margin-top:2px;">${m.pct_from_now >= 0 ? '+' : ''}${m.pct_from_now.toFixed(2)}% from now</div>
            <div style="font-size:10px;color:var(--text3);margin-top:4px;">${m.est_date}</div>
            ${isPast ? '<div style="font-size:9px;color:var(--text3);margin-top:4px;">PASSED</div>' : ''}
            ${isCurrent ? `<div style="font-family:'Orbitron',monospace;font-size:8px;color:${m.color};margin-top:4px;animation:pulse 1s infinite;">▶ NEXT</div>` : ''}
          </div>`;
        }).join('')}
      </div>
      <div style="padding:10px;background:var(--bg3);border-radius:4px;font-size:12px;color:var(--text2);line-height:1.7;">
        <strong style="color:var(--text);">How to read this:</strong> If 2026 tracks the 2015 analog, each projected price applies the exact same daily % move that SPY made in 2015 to today's price of $${curPrice.toFixed(2)}. 
        The <span style="color:#ffcc00;">2026 is currently ${Math.abs(hist[hist.length-1].divergence).toFixed(2)}% ${hist[hist.length-1].divergence < 0 ? 'behind' : 'ahead of'} 2015 pace</span> at the same cycle day.
        The next key level is <span style="color:${Object.values(ms).find(m=>m.day>curDay)?.color}">${Object.values(ms).find(m=>m.day>curDay)?.label} at $${Object.values(ms).find(m=>m.day>curDay)?.proj_spy.toFixed(2)}</span>, projected around ${Object.values(ms).find(m=>m.day>curDay)?.est_date}.
        The deepest projected pullback is <span style="color:#ff3355;">Trough 1 at $${ms.trough1.proj_spy.toFixed(2)} (${ms.trough1.pct_from_now.toFixed(2)}% from now)</span>, equivalent to the Aug 2015 flash crash.
      </div>`;
  }

  // ── DAY BY DAY TABLE ─────────────────────────────────────────────────────────
  const ctrlEl = $('analogTableControls');
  if(ctrlEl) {
    ctrlEl.innerHTML = `
      <button onclick="analogShowAll()" style="font-family:'Orbitron',monospace;font-size:9px;padding:4px 10px;background:var(--cyan)22;border:1px solid var(--cyan);color:var(--cyan);border-radius:3px;cursor:pointer;">ALL DAYS</button>
      <button onclick="analogShowHist()" style="font-family:'Orbitron',monospace;font-size:9px;padding:4px 10px;background:var(--bg3);border:1px solid var(--border);color:var(--text2);border-radius:3px;cursor:pointer;">HISTORICAL ONLY</button>
      <button onclick="analogShowProj()" style="font-family:'Orbitron',monospace;font-size:9px;padding:4px 10px;background:var(--bg3);border:1px solid var(--border);color:var(--text2);border-radius:3px;cursor:pointer;">PROJECTIONS ONLY</button>
      <span style="font-size:11px;color:var(--text3);margin-left:8px;">${hist.length} historical + ${proj.length} projected days</span>`;
  }

  window._analogHist = hist;
  window._analogProj = proj;
  analogShowAll();
}

function _analogBuildRows(rows) {
  const tbody = $('analogTableBody');
  if(!tbody) return;
  tbody.innerHTML = rows.map(r => {
    const isProj = !r.date_2026;
    const divColor = r.divergence != null ? (r.divergence > 0 ? '#00ff88' : r.divergence < 0 ? '#ff3355' : 'var(--text3)') : '#ffcc00';
    const rowBg = isProj ? 'rgba(0,204,255,0.03)' : (r.divergence != null && Math.abs(r.divergence) > 5 ? 'rgba(255,51,85,0.04)' : '');
    return `<tr style="border-bottom:1px solid var(--border);background:${rowBg}">
      <td style="padding:5px 8px;text-align:center;font-family:'Share Tech Mono',monospace;color:var(--text3);">${r.day}</td>
      <td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:#ffcc00;">${r.date_2015 || r.ref_date_2015 || '—'}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;color:var(--text2);">${r.close_2015 != null ? '$'+r.close_2015.toFixed(2) : '—'}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;color:#ffcc00;">${r.pct_2015 != null ? (r.pct_2015>=0?'+':'')+r.pct_2015.toFixed(2)+'%' : '—'}</td>
      <td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;color:var(--cyan);">${r.date_2026 || r.est_date_2026 || '—'}${isProj ? ' <span style=\'font-size:9px;color:var(--text3);\'>est</span>' : ''}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;color:var(--text2);">${r.close_2026 != null ? '$'+r.close_2026.toFixed(2) : (r.projected_spy != null ? '<span style=\'color:var(--cyan)44;\'>$'+r.projected_spy.toFixed(2)+'</span>' : '—')}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;color:${r.pct_2026 != null ? (r.pct_2026>=0?'#00ff88':'#ff3355') : 'var(--cyan)44'};">${r.pct_2026 != null ? (r.pct_2026>=0?'+':'')+r.pct_2026.toFixed(2)+'%' : (r.pct_from_anchor25 != null ? '<span style=\'color:var(--cyan)44;\'>'+(r.pct_from_anchor25>=0?'+':'')+r.pct_from_anchor25.toFixed(2)+'%</span>' : '—')}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;color:${divColor};">${r.divergence != null ? (r.divergence>=0?'+':'')+r.divergence.toFixed(2)+'%' : '<span style=\'color:#ffcc0055;\'>proj</span>'}</td>
    </tr>`;
  }).join('');
}

function analogShowAll() {
  const all = [...(window._analogHist||[]), ...(window._analogProj||[])];
  _analogBuildRows(all);
}
function analogShowHist() { _analogBuildRows(window._analogHist||[]); }
function analogShowProj() { _analogBuildRows(window._analogProj||[]); }

