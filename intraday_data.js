/**
 * intraday_data.js — SPY Intraday Analytics Tab
 */

(function () {
  'use strict';

  let _lookback = 'all';
  let _dow      = 'all';
  let _orWindow = '30'; // '15' or '30'
  const DOW_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const fmt  = (v,d=2) => v==null?'\u2014':Number(v).toFixed(d);
  const fmtp = (v,d=2) => v==null?'\u2014':(v>=0?'+':'')+Number(v).toFixed(d)+'%';
  const cls  = (v) => v==null?'':v>=0?'up':'down';
  const pct  = (n,d) => d?Math.round(n/d*100):0;

  function getSPYPrice() {
    return window._md?.quotes?.['SPY']?.price || window._spyIntraday?.close || null;
  }

  function ct(t) {
    if(!t||!t.includes(':')) return t||'\u2014';
    let [h,m]=t.split(':').map(Number); h-=1; if(h<0)h+=24;
    const ap=h>=12?'PM':'AM'; const h12=h%12||12;
    return h12+':'+String(m).padStart(2,'0')+' '+ap+' CT';
  }
  function ctShort(t) {
    if(!t||!t.includes(':')) return t||'\u2014';
    let [h,m]=t.split(':').map(Number); h-=1; if(h<0)h+=24;
    const ap=h>=12?'PM':'AM'; const h12=h%12||12;
    return h12+':'+String(m).padStart(2,'0')+' '+ap;
  }

  function getData() {
    if(typeof INTRADAY_SESSION_STATS==='undefined'||!INTRADAY_SESSION_STATS.length) return null;
    return INTRADAY_SESSION_STATS;
  }

  function applyFilters(raw) {
    let data=raw;
    if(_lookback==='2026') data=data.filter(d=>d.date&&d.date.startsWith('2026'));
    if(_dow!=='all') {
      const target=DOW_NAMES.indexOf(_dow);
      data=data.filter(d=>d.date&&new Date(d.date+'T12:00:00').getDay()===target);
    }
    return data;
  }

  function tradingDaysSince(dateStr) {
    const start=new Date(dateStr+'T12:00:00'),end=new Date();
    let count=0; const cur=new Date(start); cur.setDate(cur.getDate()+1);
    while(cur<=end){const d=cur.getDay();if(d!==0&&d!==6)count++;cur.setDate(cur.getDate()+1);}
    return count;
  }

  function computeRev15(data) {
    let up_rev=0,up_hold=0,dn_rev=0,dn_hold=0;
    data.forEach(d=>{
      const dir=d.initial_move_dir;
      if(!dir||d.close_price==null||d.open_price==null) return;
      const dayUp=d.close_price>d.open_price;
      if(dir==='UP'){dayUp?up_hold++:up_rev++;}else{dayUp?dn_rev++:dn_hold++;}
    });
    return {up_rev,up_hold,dn_rev,dn_hold,total:up_rev+up_hold+dn_rev+dn_hold};
  }

  function computeRev30(data) {
    let up_rev=0,up_hold=0,dn_rev=0,dn_hold=0;
    data.forEach(d=>{
      let dir=d.or_break_dir;
      if(!dir&&d.or_high!=null&&d.or_low!=null&&d.open_price!=null)
        dir=(d.or_high-d.open_price)>(d.open_price-d.or_low)?'UP':'DOWN';
      if(!dir||d.close_price==null||d.open_price==null) return;
      const dayUp=d.close_price>d.open_price;
      if(dir==='UP'){dayUp?up_hold++:up_rev++;}else{dayUp?dn_rev++:dn_hold++;}
    });
    return {up_rev,up_hold,dn_rev,dn_hold,total:up_rev+up_hold+dn_rev+dn_hold};
  }

  function computeOpenHour(data) {
    let up=0,dn=0,pcts=[];
    data.forEach(d=>{
      if(d.open_price==null||d.or_high==null||d.or_low==null) return;
      const dir=d.or_break_dir||d.initial_move_dir;
      if(!dir) return;
      const proxy=dir==='UP'?(d.or_high-d.open_price)/d.open_price*100:-(d.open_price-d.or_low)/d.open_price*100;
      pcts.push(proxy);
      if(dir==='UP')up++;else dn++;
    });
    const avg=pcts.length?pcts.reduce((s,v)=>s+v,0)/pcts.length:null;
    return {up,dn,total:up+dn,avgPct:avg};
  }

  function avgFillTime(arr) {
    const filled=arr.filter(d=>d.gap_fill_time);
    if(!filled.length) return null;
    const mins=filled.map(d=>{const[h,m]=d.gap_fill_time.split(':').map(Number);return(h*60+m)-(9*60+30);});
    const avg=mins.reduce((s,v)=>s+v,0)/mins.length;
    const ctMins=avg+9*60+30-60;
    const h=Math.floor(ctMins/60),m=Math.round(ctMins%60);
    return (h%12||12)+':'+String(m).padStart(2,'0')+' '+(h>=12?'PM':'AM')+' CT';
  }

  // ── Component helpers ─────────────────────────────────────────────────────

  function kpi(label,val,rawVal,sub) {
    const color=rawVal==null?'var(--text2)':rawVal>=0?'var(--green)':'var(--red)';
    return '<div class="stat-box" style="padding:10px;text-align:center;">'
      +'<div style="font-family:\'Orbitron\',monospace;font-size:8px;letter-spacing:1px;color:var(--text3);margin-bottom:4px">'+label+'</div>'
      +'<div style="font-family:\'Share Tech Mono\',monospace;font-size:17px;color:'+color+'">'+val+'</div>'
      +(sub?'<div style="font-size:9px;color:var(--text3);margin-top:2px">'+sub+'</div>':'')
      +'</div>';
  }

  // Session box: shows pct + dollar inline, then up/dn breakdown
  function sessionBox(title,timeLabel,upCount,dnCount,total,avgPct,spy,color) {
    const upPct=total?Math.round(upCount/total*100):0;
    const dnPct=total?Math.round(dnCount/total*100):0;
    const pctStr=fmtp(avgPct);
    const dolPart=spy&&avgPct!=null?'<span style="color:var(--text3);font-size:13px;margin-left:6px;">\u00b7 $'+(spy*Math.abs(avgPct)/100).toFixed(2)+'</span>':'';
    return '<div class="stat-box" style="padding:12px;text-align:center;">'
      +'<div style="font-family:\'Orbitron\',monospace;font-size:8px;letter-spacing:1.5px;color:var(--text3);margin-bottom:2px">'+title+'</div>'
      +'<div style="font-size:9px;color:var(--text3);margin-bottom:8px">'+timeLabel+'</div>'
      +'<div style="font-family:\'Share Tech Mono\',monospace;font-size:18px;color:'+color+'">'+pctStr+dolPart+'</div>'
      +'<div style="display:flex;justify-content:center;gap:14px;margin-top:8px;">'
        +'<div><span style="font-size:13px;font-family:\'Share Tech Mono\',monospace;color:var(--green)">'+upPct+'%</span> <span style="font-size:9px;color:var(--text3)">up ('+upCount+'d)</span></div>'
        +'<div><span style="font-size:13px;font-family:\'Share Tech Mono\',monospace;color:var(--red)">'+dnPct+'%</span> <span style="font-size:9px;color:var(--text3)">dn ('+dnCount+'d)</span></div>'
      +'</div>'
      +'</div>';
  }

  function fbtn(label,active,onclick) {
    const bg=active?'var(--cyan)':'var(--bg3)';
    const fg=active?'#000':'var(--text2)';
    const bd=active?'var(--cyan)':'var(--border)';
    return '<button onclick="'+onclick+'" style="padding:3px 10px;font-family:\'Share Tech Mono\',monospace;font-size:10px;background:'+bg+';color:'+fg+';border:1px solid '+bd+';border-radius:3px;cursor:pointer;">'+label+'</button>';
  }

  function tbar(label,count,maxCount,color,barWidth) {
    const bw=barWidth||200;
    const w=Math.round(count/maxCount*bw);
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">'
      +'<span style="font-family:\'Share Tech Mono\',monospace;font-size:10px;color:var(--text2);width:72px;text-align:right;flex-shrink:0;">'+label+'</span>'
      +'<div style="width:'+w+'px;height:10px;background:'+color+';border-radius:2px;flex-shrink:0;"></div>'
      +'<span style="font-size:10px;color:var(--text3)">'+count+'x</span>'
      +'</div>';
  }

  function revRow(label,holds,reverts,total,holdColor,revColor) {
    if(!total) return '<div style="font-size:11px;color:var(--text3);padding:4px 0;">Not enough data.</div>';
    const hPct=Math.round(holds/total*100),rPct=Math.round(reverts/total*100);
    const barW=Math.round(hPct/100*140);
    return '<div style="margin-bottom:10px;">'
      +'<div style="font-size:10px;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">'+label+'</div>'
      +'<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">'
        +'<div><span style="font-family:\'Share Tech Mono\',monospace;font-size:13px;color:'+holdColor+'">'+hPct+'%</span>'
          +' <span style="font-size:10px;color:var(--text3);">hold direction ('+holds+'d)</span></div>'
        +'<div><span style="font-family:\'Share Tech Mono\',monospace;font-size:13px;color:'+revColor+'">'+rPct+'%</span>'
          +' <span style="font-size:10px;color:var(--text3);">reverse by close ('+reverts+'d)</span></div>'
      +'</div>'
      +'<div style="display:flex;height:6px;border-radius:3px;overflow:hidden;margin-top:5px;background:rgba(255,51,85,0.3);">'
        +'<div style="width:'+barW+'px;background:'+holdColor+';border-radius:3px;"></div>'
      +'</div>'
      +'</div>';
  }

  // ── Main render ───────────────────────────────────────────────────────────
  function renderIntraday() {
    const el=document.getElementById('intradayContent');
    if(!el) return;
    const allRaw=getData();
    if(!allRaw) {
      el.innerHTML='<div class="no-data" style="padding:40px;text-align:center;">'
        +'<div style="font-size:13px;color:var(--text3);margin-bottom:8px;">NO INTRADAY DATA YET</div>'
        +'<div style="font-size:11px;color:var(--text3);">Data accumulates daily after the pipeline runs.</div>'
        +'</div>';
      return;
    }

    const spy  = getSPYPrice();
    const raw  = applyFilters(allRaw);
    const n    = raw.length;
    const latest = allRaw[0];

    // dollar helper for sub-labels
    function dol(pVal) {
      if(pVal==null||!spy) return '';
      return ' \u00b7 $'+(spy*Math.abs(pVal)/100).toFixed(2);
    }

    const gapUp         = raw.filter(d=>d.gap_type==='GAP_UP');
    const gapDown       = raw.filter(d=>d.gap_type==='GAP_DOWN');
    const flat          = raw.filter(d=>d.gap_type==='FLAT');
    const gapUpFilled   = gapUp.filter(d=>d.gap_filled===1);
    const gapDownFilled = gapDown.filter(d=>d.gap_filled===1);
    const withOR        = raw.filter(d=>d.or_range!=null);
    const avgOR         = withOR.length?withOR.reduce((s,d)=>s+d.or_range,0)/withOR.length:null;
    const orBreakUp     = raw.filter(d=>d.or_break_dir==='UP');
    const orBreakDown   = raw.filter(d=>d.or_break_dir==='DOWN');
    const orBreakUpHolds   =orBreakUp.filter(d=>d.close_price>d.or_high);
    const orBreakDownHolds =orBreakDown.filter(d=>d.close_price<d.or_low);
    const phUp    = raw.filter(d=>d.power_hour_dir==='UP');
    const phDown  = raw.filter(d=>d.power_hour_dir==='DOWN');
    const phData  = raw.filter(d=>d.power_hour_pct!=null);
    const avgPHpct= phData.length?phData.reduce((s,d)=>s+d.power_hour_pct,0)/phData.length:null;
    const lunchData = raw.filter(d=>d.lunch_range_pct!=null);
    const avgLunch  = lunchData.length?lunchData.reduce((s,d)=>s+d.lunch_range_pct,0)/lunchData.length:null;
    const rangeData   = raw.filter(d=>d.day_range_pct!=null);
    const avgRangePct = rangeData.length?rangeData.reduce((s,d)=>s+d.day_range_pct,0)/rangeData.length:null;

    const rev15 = computeRev15(raw);
    const rev30 = computeRev30(raw);
    const openHr= computeOpenHour(raw);

    // ── OR break timing chart ─────────────────────────────────────────────
    // or_break_time is stored in ET (format HH:MM)
    // 30-min OR (8:30-9:00 CT = 9:30-10:00 ET): break can happen 9:00 CT onward
    // 15-min OR (8:30-8:44 CT = 9:30-9:44 ET): break can happen 8:44 CT onward
    // Both use the same or_break_time field; we just show different window labels
    // and filter to the relevant post-OR window (8:44 CT+ for 15min, 9:00 CT+ for 30min)

    // CT window bounds for display (in minutes since midnight CT)
    const is15 = (_orWindow === '15');
    // 15-min OR window: 8:30-8:44 CT, so breaks start at 8:44 CT = 8*60+44
    // 30-min OR window: 8:30-9:00 CT, so breaks start at 9:00 CT = 9*60
    // Both show up to 10:30 CT = 10*60+30
    const breakStartCT = is15 ? (8*60+44) : (9*60);
    const breakEndCT   = 10*60+30;

    const orBreak5 = {};
    raw.filter(d=>d.or_break_time).forEach(d=>{
      const[h,m]=d.or_break_time.split(':').map(Number);
      // ET to CT: subtract 1 hour
      const ctTot=(h-1)*60+m;
      if(ctTot<breakStartCT||ctTot>breakEndCT) return;
      const ctH=Math.floor(ctTot/60);
      const ctM=Math.floor((ctTot%60)/5)*5; // 5-min bucket
      const bucket=ctH+':'+String(ctM).padStart(2,'0');
      orBreak5[bucket]=(orBreak5[bucket]||0)+1;
    });

    // Also include sessions where break happened within the OR window itself
    // (before the window ended) — these count as "immediate" breaks
    const immediateBreaks = is15
      ? raw.filter(d=>d.or_break_time&&(()=>{const[h,m]=d.or_break_time.split(':').map(Number);const ct=(h-1)*60+m;return ct<8*60+44;})()).length
      : 0; // 30-min OR can't break before window ends by definition

    const orBreak5sorted=Object.entries(orBreak5).sort((a,b)=>{
      const[ah,am]=a[0].split(':').map(Number);
      const[bh,bm]=b[0].split(':').map(Number);
      return (ah*60+am)-(bh*60+bm);
    });
    const maxORB5=orBreak5sorted.length?Math.max(...orBreak5sorted.map(x=>x[1])):1;

    const orBreak5Bars=orBreak5sorted.map(([t,c])=>{
      const[h,m]=t.split(':').map(Number);
      const ap=h>=12?'PM':'AM'; const h12=h%12||12;
      const label=h12+':'+String(m).padStart(2,'0')+' '+ap;
      return tbar(label,c,maxORB5,'var(--cyan)',220);
    }).join('');

    // Gap distribution
    const gapB={'>1%':0,'0.5-1%':0,'0.25-0.5%':0,'FLAT':0,'-0.25--0.5%':0,'-0.5--1%':0,'<-1%':0};
    raw.forEach(d=>{
      const g=d.gap_pct; if(g==null) return;
      if(g>1)gapB['>1%']++;
      else if(g>0.5)gapB['0.5-1%']++;
      else if(g>0.25)gapB['0.25-0.5%']++;
      else if(g>=-0.25)gapB['FLAT']++;
      else if(g>=-0.5)gapB['-0.25--0.5%']++;
      else if(g>=-1)gapB['-0.5--1%']++;
      else gapB['<-1%']++;
    });
    const maxGB=Math.max(...Object.values(gapB),1);
    const gapBars=Object.entries(gapB).map(([label,count])=>{
      const w=Math.round(count/maxGB*160);
      const isUp=label.startsWith('>')||label.startsWith('0');
      const col=label==='FLAT'?'var(--text3)':isUp?'var(--green)':'var(--red)';
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">'
        +'<span style="font-family:\'Share Tech Mono\',monospace;font-size:10px;color:var(--text2);width:100px;text-align:right;flex-shrink:0;">'+label+'</span>'
        +'<div style="width:'+w+'px;height:12px;background:'+col+';border-radius:2px;opacity:0.85;flex-shrink:0;"></div>'
        +'<span style="font-size:10px;color:var(--text3)">'+count+'d ('+pct(count,n)+'%)</span>'
        +'</div>';
    }).join('');

    // Best/worst 5-min windows
    const bestTimes={},worstTimes={};
    raw.forEach(d=>{
      if(d.best_5m_time)  bestTimes[d.best_5m_time] =(bestTimes[d.best_5m_time] ||0)+1;
      if(d.worst_5m_time) worstTimes[d.worst_5m_time]=(worstTimes[d.worst_5m_time]||0)+1;
    });
    const topBest =Object.entries(bestTimes).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const topWorst=Object.entries(worstTimes).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const maxBest =topBest.length ?topBest[0][1] :1;
    const maxWorst=topWorst.length?topWorst[0][1]:1;
    const bestBars =topBest.map(([t,c]) =>tbar(ct(t),c,maxBest, 'var(--green)',200)).join('');
    const worstBars=topWorst.map(([t,c])=>tbar(ct(t),c,maxWorst,'var(--red)',  200)).join('');

    // Recent sessions table
    const rows=raw.slice(0,20).map(d=>{
      const dayOC=d.open_price&&d.close_price?(d.close_price-d.open_price)/d.open_price*100:null;
      const dolAmt=dayOC!=null?Math.abs(d.close_price-d.open_price):null;
      const dowName=d.date?DOW_NAMES[new Date(d.date+'T12:00:00').getDay()]:'';
      return '<tr>'
        +'<td style="text-align:left;color:var(--text2)">'+d.date+' <span style="color:var(--text3);font-size:9px">'+dowName+'</span></td>'
        +'<td class="'+cls(d.gap_pct)+'">'+fmtp(d.gap_pct)+'</td>'
        +'<td style="color:'+(d.gap_type==='GAP_UP'?'var(--green)':d.gap_type==='GAP_DOWN'?'var(--red)':'var(--text3)')+'">'+
          (d.gap_type==='GAP_UP'?'\u25b2 UP':d.gap_type==='GAP_DOWN'?'\u25bc DN':'FLAT')+'</td>'
        +'<td>'+(d.or_range!=null?fmt(d.or_range)+'%':'\u2014')+'</td>'
        +'<td style="color:'+(d.gap_filled===1?'var(--green)':d.gap_filled===0?'var(--red)':'var(--text3)')+'">'+
          (d.gap_filled===1?'\u2713':d.gap_filled===0?'\u2717':'\u2014')+'</td>'
        +'<td style="color:'+(d.or_break_dir==='UP'?'var(--green)':d.or_break_dir==='DOWN'?'var(--red)':'var(--text3)')+'">'+
          (d.or_break_dir==='UP'?'\u25b2':d.or_break_dir==='DOWN'?'\u25bc':'\u2014')+
          (d.or_break_time?' <span style="color:var(--text3);font-size:9px">@'+ctShort(d.or_break_time)+'</span>':'')+'</td>'
        +'<td style="color:'+(d.power_hour_dir==='UP'?'var(--green)':d.power_hour_dir==='DOWN'?'var(--red)':'var(--text3)')+'">'+
          (d.power_hour_pct!=null?fmtp(d.power_hour_pct):'\u2014')+'</td>'
        +'<td class="'+cls(dayOC)+'">'+
          (dayOC!=null?fmtp(dayOC):'\u2014')+
          (dolAmt!=null?' <span style="color:var(--text3);font-size:9px">$'+dolAmt.toFixed(2)+'</span>':'')+'</td>'
        +'</tr>';
    }).join('');

    const tdOld=tradingDaysSince(latest.date);
    const dataAge=tdOld===0?'\ud83d\udfe2 Updated today':tdOld===1?'\ud83d\udfe1 1 trading day old':'\ud83d\udd34 '+tdOld+' trading days old';
    const filterLabel=(_lookback==='all'?'All time':'2026 only')+(_dow!=='all'?' \u00b7 '+_dow+' only':'')+' \u00b7 '+n+' sessions';

    const lbBtns=fbtn('ALL TIME',_lookback==='all',"window._intradaySetLookback('all')")+' '+fbtn('2026',_lookback==='2026',"window._intradaySetLookback('2026')");
    const dowBtns=['all','Mon','Tue','Wed','Thu','Fri'].map(d=>fbtn(d==='all'?'ALL':d.toUpperCase(),_dow===d,"window._intradaySetDOW('"+d+"')")).join(' ');
    const orBtns=fbtn('15-MIN OR',_orWindow==='15',"window._intradaySetOR('15')")+' '+fbtn('30-MIN OR',_orWindow==='30',"window._intradaySetOR('30')");

    if(!n){el.innerHTML='<div style="padding:40px;text-align:center;color:var(--text3);font-size:12px;">No sessions match this filter.</div>';return;}

    // OR window labels for the chart
    const orLabel=is15?'15-MIN OR (8:30\u20138:44 CT)':'30-MIN OR (8:30\u20139:00 CT)';
    const orBreakWindowLabel=is15?'Breaks visible 8:44\u201310:30 AM CT':'Breaks visible 9:00\u201310:30 AM CT';
    const orRevData=is15?rev15:rev30;
    const orRevUpLabel=is15?'Opens UP first 15 min \u2192':'Opens UP first 30 min \u2192';
    const orRevDnLabel=is15?'Opens DOWN first 15 min \u2192':'Opens DOWN first 30 min \u2192';
    const orRevUpTotal=is15?rev15.up_hold+rev15.up_rev:rev30.up_hold+rev30.up_rev;
    const orRevDnTotal=is15?rev15.dn_hold+rev15.dn_rev:rev30.dn_hold+rev30.dn_rev;

    el.innerHTML=
'<div style="padding:12px 16px;max-width:1200px;margin:0 auto;">'

// ── Header + filters ──
+'<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:10px;">'
  +'<div>'
    +'<div style="font-family:\'Orbitron\',monospace;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;">INTRADAY ANALYTICS</div>'
    +'<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:5px;"><span style="font-size:10px;color:var(--text3);width:60px;">LOOKBACK:</span>'+lbBtns+'</div>'
    +'<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;"><span style="font-size:10px;color:var(--text3);width:60px;">DAY:</span>'+dowBtns+'</div>'
  +'</div>'
  +'<div style="text-align:right;">'
    +'<div style="font-size:10px;color:var(--text3);">'+filterLabel+'</div>'
    +'<div style="font-size:10px;color:var(--text3);">Latest: '+latest.date+' \u00b7 '+dataAge+(spy?' \u00b7 SPY $'+spy.toFixed(2):'')+'</div>'
    +'<div id="intradayRefreshDot" style="width:6px;height:6px;border-radius:50%;background:var(--text3);margin-top:4px;margin-left:auto;"></div>'
  +'</div>'
+'</div>'

// ── Session rhythm strip ──
+'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;">'
  +sessionBox('OPENING HOUR','8:30\u20139:30 AM CT',openHr.up,openHr.dn,openHr.total,openHr.avgPct,spy,(openHr.avgPct||0)>=0?'var(--green)':'var(--red)')
  +'<div class="stat-box" style="padding:12px;text-align:center;">'
    +'<div style="font-family:\'Orbitron\',monospace;font-size:8px;letter-spacing:1.5px;color:var(--text3);margin-bottom:2px">LUNCH LULL</div>'
    +'<div style="font-size:9px;color:var(--text3);margin-bottom:8px">10:30 AM\u201312:00 PM CT</div>'
    +'<div style="font-family:\'Share Tech Mono\',monospace;font-size:18px;color:var(--text2)">'
      +(avgLunch!=null?fmt(avgLunch)+'%':'\u2014')
      +(spy&&avgLunch?'<span style="color:var(--text3);font-size:13px;margin-left:6px;">\u00b7 $'+(spy*avgLunch/100).toFixed(2)+'</span>':'')
    +'</div>'
    +'<div style="font-size:10px;color:var(--text3);margin-top:8px;line-height:1.5;">Avg range (no direction).<br>Tight \u2192 watch for PM vol expansion.</div>'
  +'</div>'
  +sessionBox('POWER HOUR','3:00\u20134:00 PM CT',phUp.length,phDown.length,phUp.length+phDown.length,avgPHpct,spy,(avgPHpct||0)>=0?'var(--green)':'var(--red)')
+'</div>'

// ── KPI strip ──
+'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:14px;">'
  +kpi('AVG DAY RANGE',  fmtp(avgRangePct), null,   'H to L'+dol(avgRangePct))
  +kpi('AVG OR RANGE',   avgOR!=null?fmt(avgOR)+'%':'\u2014', null, '30-min range'+dol(avgOR))
  +kpi('GAP UP FILL',    gapUp.length?Math.round(gapUpFilled.length/gapUp.length*100)+'%':'\u2014', null, gapUpFilled.length+' of '+gapUp.length)
  +kpi('GAP DOWN FILL',  gapDown.length?Math.round(gapDownFilled.length/gapDown.length*100)+'%':'\u2014', null, gapDownFilled.length+' of '+gapDown.length)
  +kpi('OR BREAK UP',    n?Math.round(orBreakUp.length/n*100)+'%':'\u2014', null, 'holds above OR: '+(orBreakUp.length?Math.round(orBreakUpHolds.length/orBreakUp.length*100)+'%':'\u2014'))
  +kpi('OR BREAK DOWN',  n?Math.round(orBreakDown.length/n*100)+'%':'\u2014', null, 'holds below OR: '+(orBreakDown.length?Math.round(orBreakDownHolds.length/orBreakDown.length*100)+'%':'\u2014'))
+'</div>'

// ── Row 1: Reversals + Gap ──
+'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">'

  +'<div class="stat-box" style="padding:14px;">'
    +'<div class="es-section" style="margin-bottom:4px;">OPENING MOVE REVERSALS</div>'
    +'<div style="font-size:10px;color:var(--text3);margin-bottom:12px;">How often does an early move hold vs. reverse by end of day? All times CT.</div>'
    +'<div style="font-size:10px;color:var(--text3);letter-spacing:1px;margin-bottom:8px;">FIRST 15 MIN (8:30\u20138:44 CT) \u2014 '+rev15.total+' sessions</div>'
    +revRow('Opens UP first 15 min \u2192',  rev15.up_hold,rev15.up_rev,rev15.up_hold+rev15.up_rev,'var(--green)','var(--red)')
    +revRow('Opens DOWN first 15 min \u2192',rev15.dn_hold,rev15.dn_rev,rev15.dn_hold+rev15.dn_rev,'var(--red)','var(--green)')
    +'<div style="border-top:1px solid var(--border);margin:10px 0;"></div>'
    +'<div style="font-size:10px;color:var(--text3);letter-spacing:1px;margin-bottom:8px;">FIRST 30 MIN (8:30\u20139:00 CT) \u2014 '+rev30.total+' sessions</div>'
    +revRow('Opens UP first 30 min \u2192',  rev30.up_hold,rev30.up_rev,rev30.up_hold+rev30.up_rev,'var(--green)','var(--red)')
    +revRow('Opens DOWN first 30 min \u2192',rev30.dn_hold,rev30.dn_rev,rev30.dn_hold+rev30.dn_rev,'var(--red)','var(--green)')
    +'<div style="margin-top:10px;font-size:11px;color:var(--text2);line-height:1.6;">'
      +'<span style="color:var(--cyan);">Takeaway:</span> '
      +'When SPY moves '+(rev15.dn_rev>rev15.up_rev?'down':'up')+' in the first 15 min, '
      +'it\'s more likely to reverse \u2014 reversing '
      +(rev15.dn_rev>rev15.up_rev
        ?(rev15.dn_hold+rev15.dn_rev?Math.round(rev15.dn_rev/(rev15.dn_hold+rev15.dn_rev)*100):0)
        :(rev15.up_hold+rev15.up_rev?Math.round(rev15.up_rev/(rev15.up_hold+rev15.up_rev)*100):0))
      +'% of the time.'
    +'</div>'
  +'</div>'

  // Gap Analysis
  +'<div class="stat-box" style="padding:14px;">'
    +'<div class="es-section" style="margin-bottom:10px;">GAP ANALYSIS</div>'
    +'<div style="font-size:11px;color:var(--text2);line-height:1.8;margin-bottom:14px;">'
      +'Gapped <span style="color:var(--green)">up '+gapUp.length+'x ('+pct(gapUp.length,n)+'%)</span>, '
      +'<span style="color:var(--red)">down '+gapDown.length+'x ('+pct(gapDown.length,n)+'%)</span>, '
      +'flat <span style="color:var(--text3)">'+flat.length+'x</span>.<br>'
      +'Gap-ups fill <span style="color:var(--green)">'+(gapUp.length?Math.round(gapUpFilled.length/gapUp.length*100):0)+'%</span>'
      +' avg by <span style="color:var(--cyan)">'+(avgFillTime(gapUp)||'\u2014')+'</span>.<br>'
      +'Gap-downs fill <span style="color:var(--red)">'+(gapDown.length?Math.round(gapDownFilled.length/gapDown.length*100):0)+'%</span>'
      +' avg by <span style="color:var(--cyan)">'+(avgFillTime(gapDown)||'\u2014')+'</span>.'
    +'</div>'
    +'<div style="font-size:10px;color:var(--text3);margin-bottom:8px;letter-spacing:1px;">GAP SIZE DISTRIBUTION</div>'
    +gapBars
  +'</div>'

+'</div>'

// ── OR Break Timing (with toggle) ──
+'<div class="stat-box" style="padding:14px;margin-bottom:12px;">'
  +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:8px;">'
    +'<div class="es-section">WHEN DOES THE OPENING RANGE BREAK? \u2014 5-MIN BUCKETS</div>'
    +'<div style="display:flex;gap:6px;align-items:center;">'
      +'<span style="font-size:10px;color:var(--text3);">OR WINDOW:</span>'+orBtns
    +'</div>'
  +'</div>'
  +'<div style="font-size:10px;color:var(--text3);margin-bottom:4px;">'
    +'<strong style="color:var(--cyan);">'+orLabel+'</strong> \u2014 '
    +(is15
      ?'The 15-min OR is the high/low set in the first 15 minutes (8:30\u20138:44 CT). An OR break is when price closes outside that range. <em>Since most breaks happen just after the window closes, the chart starts at 8:44 CT.</em>'
      :'The 30-min OR is the high/low set in the first 30 minutes (8:30\u20139:00 CT). An OR break is when price first closes above the OR high or below the OR low. <em>The chart starts at 9:00 CT when the window closes.</em>'
    )
  +'</div>'
  +'<div style="font-size:10px;color:var(--text3);margin-bottom:12px;">'+orBreakWindowLabel+' \u2014 earlier breaks = stronger directional conviction.</div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">'
    +'<div>'
      +(orBreak5Bars||'<div style="font-size:11px;color:var(--text3);">Not enough data</div>')
    +'</div>'
    +'<div>'
      +'<div style="font-size:10px;color:var(--cyan);letter-spacing:1px;margin-bottom:10px;">'+orLabel+' DIRECTION STATS</div>'
      +revRow(orRevUpLabel, orRevData.up_hold, orRevData.up_rev, orRevUpTotal, 'var(--green)','var(--red)')
      +revRow(orRevDnLabel, orRevData.dn_hold, orRevData.dn_rev, orRevDnTotal, 'var(--red)','var(--green)')
      +'<div style="margin-top:10px;font-size:11px;color:var(--text2);line-height:1.7;">'
        +'OR breaks above <span style="color:var(--green)">'+Math.round(orBreakUp.length/n*100)+'%</span> of days, '
        +'below <span style="color:var(--red)">'+Math.round(orBreakDown.length/n*100)+'%</span>.<br>'
        +'Avg OR width: <span style="color:var(--cyan)">'+(avgOR!=null?fmt(avgOR)+'%':'\u2014')+(spy&&avgOR?' ($'+(spy*avgOR/100).toFixed(2)+')':'')+'</span>.'
      +'</div>'
    +'</div>'
  +'</div>'
+'</div>'

// ── Best/Worst 5-min windows ──
+'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">'
  +'<div class="stat-box" style="padding:14px;">'
    +'<div class="es-section" style="margin-bottom:6px;">\ud83d\udfe2 STRONGEST 5-MIN WINDOWS (CT)</div>'
    +'<div style="font-size:10px;color:var(--text3);margin-bottom:8px;">Times most often producing the largest single up-moves</div>'
    +(bestBars||'<div style="font-size:11px;color:var(--text3)">Not enough data</div>')
  +'</div>'
  +'<div class="stat-box" style="padding:14px;">'
    +'<div class="es-section" style="margin-bottom:6px;">\ud83d\udd34 WEAKEST 5-MIN WINDOWS (CT)</div>'
    +'<div style="font-size:10px;color:var(--text3);margin-bottom:8px;">Times most often producing the largest single down-moves</div>'
    +(worstBars||'<div style="font-size:11px;color:var(--text3)">Not enough data</div>')
  +'</div>'
+'</div>'

// ── Recent Sessions ──
+'<div class="stat-box" style="padding:14px;margin-bottom:12px;">'
  +'<div class="es-section" style="margin-bottom:10px;">RECENT SESSIONS (LAST 20 IN FILTER) \u2014 TIMES IN CT</div>'
  +'<div style="overflow-x:auto;">'
    +'<table class="data-table" style="font-size:11px;">'
      +'<thead><tr>'
        +'<th style="text-align:left">DATE</th>'
        +'<th>GAP %</th><th>TYPE</th><th>OR WIDTH</th>'
        +'<th>GAP FILL</th><th>OR BREAK</th>'
        +'<th>PWR HR</th><th>DAY O\u2192C</th>'
      +'</tr></thead>'
      +'<tbody>'+rows+'</tbody>'
    +'</table>'
  +'</div>'
+'</div>'

+'</div>';

    const dot=document.getElementById('intradayRefreshDot');
    if(dot){dot.style.background='var(--green)';setTimeout(()=>{if(dot)dot.style.background='var(--text3)';},800);}
  }

  window._intradaySetLookback=function(val){_lookback=val;renderIntraday();};
  window._intradaySetDOW=function(val){_dow=val;renderIntraday();};
  window._intradaySetOR=function(val){_orWindow=val;renderIntraday();};

  const _origRefresh=window.refreshLiveData;
  window.refreshLiveData=async function(...args){
    const result=typeof _origRefresh==='function'?await _origRefresh(...args):undefined;
    const panel=document.getElementById('panel-intraday');
    if(panel&&panel.classList.contains('active')) renderIntraday();
    return result;
  };

  const _origSwitch=window.switchTab;
  window.switchTab=function(name){
    if(typeof _origSwitch==='function') _origSwitch(name);
    if(name==='intraday') setTimeout(renderIntraday,50);
  };

  document.addEventListener('DOMContentLoaded',function(){
    const panel=document.getElementById('panel-intraday');
    if(panel&&panel.classList.contains('active')) renderIntraday();
  });

})();
