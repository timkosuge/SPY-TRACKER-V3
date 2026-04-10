/* ═══════════════════════════════════════════════════════════════════════════
   IGNITION.JS — THE BUILDOUT TAB
   Extracted from index.html to keep index under Cloudflare Pages size limit.
   Loaded via <script src="ignition.js"> in index.html.
   Entry point: loadIgnitionData() called by _switchPanelOnly('ignition').
═══════════════════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════

const DEFAULT_CONSTRAINTS = [
  // AI / Compute
  {id:'power',     name:'POWER & GRID',       score:22, status:'critical',    metrics:[{key:'Grid queue backlog',val:'~2,600 GW',cls:'dn'},{key:'Avg interconnect wait',val:'5+ years',cls:'dn'},{key:'DC power demand YoY',val:'+26%',cls:'warn'},{key:'Nuclear restarts online',val:'1 of 5+',cls:'warn'},{key:'Utility capex trend',val:'Accelerating',cls:'up'}]},
  {id:'chips',     name:'CHIPS & HARDWARE',   score:48, status:'constrained', metrics:[{key:'NVDA rev growth',val:'+78% YoY',cls:'up'},{key:'CoWoS lead time',val:'52+ weeks',cls:'dn'},{key:'HBM supply',val:'Tight',cls:'warn'},{key:'Alt suppliers',val:'Growing',cls:'up'},{key:'ASML backlog',val:'$40B+',cls:'warn'}]},
  {id:'cooling',   name:'COOLING & PHYSICAL', score:33, status:'critical',    metrics:[{key:'Liquid cooling adoption',val:'~18%',cls:'warn'},{key:'Vertiv backlog',val:'18-24 mo',cls:'dn'},{key:'Water conflicts',val:'Rising',cls:'dn'},{key:'Modular DC growth',val:'+40% YoY',cls:'up'}]},
  {id:'dcenter',   name:'DATA CENTERS',       score:41, status:'constrained', metrics:[{key:'Global capacity',val:'~65,000 MW',cls:''},{key:'Under construction',val:'+18,000 MW',cls:'up'},{key:'Avg permit time',val:'2-3 years',cls:'dn'},{key:'Hyperscaler capex',val:'$200B+ 2025',cls:'up'}]},
  {id:'monetize',  name:'MONETIZATION',       score:28, status:'critical',    metrics:[{key:'AI rev / capex',val:'~0.24x',cls:'dn'},{key:'Enterprise adoption',val:'~31%',cls:'warn'},{key:'Killer app status',val:'TBD',cls:'warn'},{key:'AI-native profitable',val:'Few',cls:'dn'}]},
  // Robotics
  {id:'robotics',  name:'ROBOTICS ECONOMICS', score:24, status:'critical',    metrics:[{key:'Humanoid robot cost',val:'~$30-50k',cls:'warn'},{key:'Reliability (MTBF)',val:'Improving',cls:'up'},{key:'Use case breadth',val:'Narrow still',cls:'dn'},{key:'Labor cost parity',val:'3-5 yrs out',cls:'warn'}]},
  // Energy
  {id:'storage',   name:'ENERGY STORAGE',     score:44, status:'constrained', metrics:[{key:'Li-ion cost trend',val:'-14% YoY',cls:'up'},{key:'Grid storage deployed',val:'+80% YoY',cls:'up'},{key:'Duration (hrs)',val:'4h avg',cls:'warn'},{key:'Long-duration tech',val:'Early',cls:'dn'}]},
  {id:'permitting',name:'PERMITTING & POLICY', score:18, status:'critical',    metrics:[{key:'Fed permit timeline',val:'3-7 years',cls:'dn'},{key:'FERC reform progress',val:'Slow',cls:'dn'},{key:'IRA credit status',val:'At risk',cls:'warn'},{key:'State-level action',val:'Mixed',cls:'warn'}]},
  // Sovereignty
  {id:'semisov',   name:'SEMI SOVEREIGNTY',   score:31, status:'critical',    metrics:[{key:'Non-Taiwan advanced %',val:'~12%',cls:'dn'},{key:'CHIPS Act disbursed',val:'~$8B',cls:'warn'},{key:'Intel 18A timeline',val:'2025-26',cls:'warn'},{key:'TSMC AZ progress',val:'On track',cls:'up'}]},
  // Materials
  {id:'materials', name:'CRITICAL MATERIALS', score:26, status:'critical',    metrics:[{key:'Copper supply deficit',val:'4M tons/yr',cls:'dn'},{key:'Lithium oversupply',val:'Temporary',cls:'warn'},{key:'Rare earth ex-China',val:'<5% supply',cls:'dn'},{key:'Uranium supply',val:'Tightening',cls:'warn'}]},
  // Workforce
  {id:'workforce', name:'SKILLED WORKFORCE',  score:20, status:'critical',    metrics:[{key:'Electrician shortage',val:'~80k gap',cls:'dn'},{key:'Chip fab operators',val:'Constrained',cls:'dn'},{key:'AI/ML engineers',val:'Scarce',cls:'dn'},{key:'Trade school enrollment',val:'Rising',cls:'up'}]},
];

const DEFAULT_CAPEX = [
  {co:'MSFT',capex:63.9,rev:13.0},{co:'GOOGL',capex:75.0,rev:20.0},
  {co:'AMZN',capex:78.0,rev:29.0},{co:'META',capex:40.0,rev:6.0},
];
const DEFAULT_NOTE = 'Q1 2026 — Based on Q4 2025 earnings + public data';

// ── Groups by wave ──────────────────────────────────────────────────────────
const WAVE_GROUPS = {
  ai: [
    {id:'power',     name:'POWER & GRID',            color:'#ff6600', wave:'ai',       thesis:'The single biggest constraint. Grid interconnect queue is 2,600 GW. Data centers will consume 35% of new US power by 2030. Whoever solves dispatchable clean power wins the next decade.', tickers:[{sym:'VST',name:'Vistra'},{sym:'CEG',name:'Constellation'},{sym:'NRG',name:'NRG Energy'},{sym:'GEV',name:'GE Vernova'},{sym:'ETN',name:'Eaton'},{sym:'PWR',name:'Quanta'},{sym:'FIX',name:'Comfort Systems'},{sym:'AGX',name:'Argan'}]},
    {id:'nuclear',   name:'NUCLEAR',                 color:'#00ff88', wave:'ai',       thesis:'Only 24/7 carbon-free power that scales to DC demand. Political tailwinds across party lines. Crane Nuclear Station restarted. SMRs on deck. Uranium supply tightening as demand is locked in by long-term contracts.',tickers:[{sym:'CEG',name:'Constellation'},{sym:'CCJ',name:'Cameco'},{sym:'LEU',name:'Centrus'},{sym:'SMR',name:'NuScale'},{sym:'OKLO',name:'Oklo'},{sym:'NNE',name:'Nano Nuclear'},{sym:'BWXT',name:'BWX Tech'},{sym:'UEC',name:'Uranium Energy'},{sym:'DNN',name:'Denison Mines'}]},
    {id:'chips',     name:'CHIPS & HARDWARE',        color:'#ffcc00', wave:'ai',       thesis:'The supply bottleneck everyone is racing to solve. NVDA is the keystone; the ecosystem beneath it — packaging, memory, EDA, test — is equally constrained and less well understood.',tickers:[{sym:'NVDA',name:'NVIDIA'},{sym:'AMD',name:'AMD'},{sym:'AVGO',name:'Broadcom'},{sym:'MRVL',name:'Marvell'},{sym:'ARM',name:'ARM Holdings'},{sym:'TSM',name:'TSMC'},{sym:'ASML',name:'ASML'},{sym:'LRCX',name:'Lam Research'},{sym:'KLAC',name:'KLA'},{sym:'AMAT',name:'Appl Materials'},{sym:'SMH',name:'Semi ETF'}]},
    {id:'cooling',   name:'COOLING & PHYSICAL INFRA',color:'#00ccff', wave:'ai',       thesis:'Unsexy but binding. Every MW of AI compute needs ~1.5x in cooling. Liquid cooling is replacing air. Vertiv is the bellwether. Modine and Johnson Controls are the unsexy plays.',tickers:[{sym:'VRT',name:'Vertiv'},{sym:'SMCI',name:'Super Micro'},{sym:'MOD',name:'Modine'},{sym:'JCI',name:'Johnson Controls'}]},
    {id:'dcenter',   name:'DATA CENTERS / REITs',    color:'#8855ff', wave:'ai',       thesis:'The real estate of the AI economy. Long permitting cycles create durable moats for incumbents. Hyperscalers are signing 20-year leases. Land and power access is the competitive advantage.',tickers:[{sym:'EQIX',name:'Equinix'},{sym:'DLR',name:'Digital Realty'},{sym:'IRON',name:'Iron Mountain'},{sym:'AMT',name:'American Tower'}]},
    {id:'hyper',     name:'HYPERSCALERS — THE BUYERS',color:'#ff3355',wave:'ai',       thesis:"Their capex IS the fuel for the entire buildout. Watch revenue vs spend ratio compress toward 1:1 — that's the inflection. When MSFT/GOOGL/AMZN start explicitly calling out AI revenue, the thesis begins to validate.",tickers:[{sym:'MSFT',name:'Microsoft'},{sym:'GOOGL',name:'Alphabet'},{sym:'AMZN',name:'Amazon'},{sym:'META',name:'Meta'},{sym:'ORCL',name:'Oracle'}]},
    {id:'aisoft',    name:'AI SOFTWARE / MONETIZATION',color:'#ff8800',wave:'ai',      thesis:'Must show the revenue to justify the buildout. Enterprise adoption is still early — under 35%. The killer app has not arrived. When it does, this group reprices dramatically.',tickers:[{sym:'CRM',name:'Salesforce'},{sym:'NOW',name:'ServiceNow'},{sym:'PLTR',name:'Palantir'},{sym:'SNOW',name:'Snowflake'},{sym:'PATH',name:'UiPath'},{sym:'AI',name:'C3.ai'},{sym:'DDOG',name:'Datadog'},{sym:'SAIC',name:'SAIC'}]},
    {id:'shovels',   name:'PICKS & SHOVELS',         color:'#9090c0', wave:'ai',       thesis:'EDA, test equipment, connectors. Essential to everyone in the stack. Pure utilization plays with less narrative risk. Often overlooked, persistently in demand.',tickers:[{sym:'CDNS',name:'Cadence'},{sym:'SNPS',name:'Synopsys'},{sym:'KEYS',name:'Keysight'},{sym:'COHU',name:'Cohu'},{sym:'ONTO',name:'Onto Innovation'},{sym:'ANSS',name:'Ansys'},{sym:'PTC',name:'PTC'}]},
  ],
  robotics: [
    {id:'robots',    name:'ROBOTICS & HUMANOIDS',    color:'#00ccff', wave:'robotics', thesis:'Physical AI. The same inference chips that power LLMs are going into robot brains. Tesla Optimus, Figure, 1X, Boston Dynamics. Cost curves are falling fast. When a humanoid costs less than a forklift operator the economics flip permanently.',tickers:[{sym:'TSLA',name:'Tesla (Optimus)'},{sym:'ISRG',name:'Intuitive Surgical'},{sym:'TER',name:'Teradyne'},{sym:'CGNX',name:'Cognex'},{sym:'SYM',name:'Symbotic'},{sym:'IRBT',name:'iRobot'}]},
    {id:'automation',name:'INDUSTRIAL AUTOMATION',   color:'#ff8800', wave:'robotics', thesis:'Factories going lights-out. Warehouses fully automated. Rockwell and Emerson are the picks-and-shovels plays. ABB is the global infrastructure layer. Every manufacturer is being forced to automate as labor costs rise.',tickers:[{sym:'ROK',name:'Rockwell Auto'},{sym:'EMR',name:'Emerson Electric'},{sym:'ABB',name:'ABB Ltd'},{sym:'HON',name:'Honeywell'},{sym:'FANUY',name:'FANUC (OTC)'},{sym:'PEGA',name:'Pegasystems'},{sym:'AZPN',name:'Aspen Tech'}]},
  ],
  energy: [
    {id:'solar',     name:'SOLAR & WIND',            color:'#ffcc00', wave:'energy',   thesis:'Cost of solar has fallen 99% since 1976. Still accelerating. FSLR is the US-made play benefiting from IRA credits and tariff protection. Enphase owns the residential edge.',tickers:[{sym:'FSLR',name:'First Solar'},{sym:'ENPH',name:'Enphase'},{sym:'SEDG',name:'SolarEdge'},{sym:'RUN',name:'Sunrun'},{sym:'ARRY',name:'Array Tech'}]},
    {id:'storage2',  name:'ENERGY STORAGE',          color:'#00ff88', wave:'energy',   thesis:'The missing piece. Solar and wind are cheap but intermittent. Storage is what makes them dispatchable. Fluence, Bloom, and AES are building grid-scale storage at massive scale.',tickers:[{sym:'FLNC',name:'Fluence Energy'},{sym:'BE',name:'Bloom Energy'},{sym:'PLUG',name:'Plug Power'},{sym:'GNRC',name:'Generac'},{sym:'AES',name:'AES Corp'},{sym:'BEP',name:'Brookfield Renewables'}]},
    {id:'utilities2',name:'CLEAN UTILITIES',         color:'#ff6600', wave:'energy',   thesis:'NextEra is the largest renewable energy producer on earth. Clean utilities are playing both sides — selling power to data centers AND building the transmission to deliver it.',tickers:[{sym:'NEE',name:'NextEra'},{sym:'VST',name:'Vistra'},{sym:'CEG',name:'Constellation'},{sym:'XLU',name:'Utilities ETF'}]},
  ],
  semisov: [
    {id:'domesticfab',name:'DOMESTIC FAB',           color:'#ffcc00', wave:'semisov',  thesis:'The CHIPS Act is the largest industrial policy in US history. Every major economy has concluded it cannot depend on Taiwan for advanced semiconductors. A decade-long buildout of domestic capacity regardless of AI demand.',tickers:[{sym:'INTC',name:'Intel'},{sym:'GFS',name:'GlobalFoundries'},{sym:'ON',name:'ON Semi'},{sym:'TXN',name:'Texas Instruments'},{sym:'MPWR',name:'Monolithic Power'},{sym:'QCOM',name:'Qualcomm'}]},
    {id:'specchips',  name:'SPECIALTY CHIPS',        color:'#8855ff', wave:'semisov',  thesis:'GaN, SiC, and wide-bandgap semiconductors for power electronics, EVs, defense, and 5G. Less commoditized than NVDA. Strategic importance to sovereign supply chains.',tickers:[{sym:'WOLF',name:'Wolfspeed'},{sym:'SWKS',name:'Skyworks'},{sym:'ONTO',name:'Onto Innovation'},{sym:'COHU',name:'Cohu'}]},
  ],
  materials: [
    {id:'copper',    name:'COPPER — THE METAL OF ELECTRIFICATION',color:'#ff8800',wave:'materials',thesis:"You cannot build a grid, a data center, a robot, an EV, or a chip fab without copper. Supply deficit is structural — 4M tons/year by 2030 on current projections. Freeport-McMoRan is the pure play.",tickers:[{sym:'FCX',name:'Freeport-McMoRan'},{sym:'SCCO',name:'Southern Copper'},{sym:'AA',name:'Alcoa'},{sym:'COPX',name:'Copper Miners ETF'}]},
    {id:'uranium',   name:'URANIUM & RARE EARTHS',   color:'#00ff88', wave:'materials',thesis:'Nuclear demand is locking in multi-decade uranium contracts. China controls 90%+ of rare earth processing — the most dangerous strategic dependency in the buildout. MP Materials is the only significant US rare earth miner.',tickers:[{sym:'CCJ',name:'Cameco'},{sym:'NXE',name:'NexGen Energy'},{sym:'UUUU',name:'Energy Fuels'},{sym:'UEC',name:'Uranium Energy'},{sym:'MP',name:'MP Materials'},{sym:'REMX',name:'Rare Earth ETF'},{sym:'URA',name:'Uranium ETF'}]},
    {id:'lithium',   name:'LITHIUM & BATTERY MATERIALS',color:'#00ccff',wave:'materials',thesis:'Oversupplied now but structurally constrained long-term as EV and grid storage demand scales. Albemarle is the largest US lithium producer. SQM is the low-cost Chilean play. Current weakness is a potential setup.',tickers:[{sym:'ALB',name:'Albemarle'},{sym:'SQM',name:'SQM'},{sym:'LTHM',name:'Livent'},{sym:'LIT',name:'Lithium ETF'}]},
    {id:'mining',    name:'DIVERSIFIED MINING',      color:'#9090c0', wave:'materials', thesis:'Vale, Rio, BHP are the picks-and-shovels of the entire buildout. Iron ore, copper, nickel, aluminium. Every ton of infrastructure built requires their output. Boring but foundational.',tickers:[{sym:'VALE',name:'Vale'},{sym:'RIO',name:'Rio Tinto'},{sym:'BHP',name:'BHP'},{sym:'GDX',name:'Gold Miners ETF'}]},
  ],
  frontier: [
    {id:'quantum',   name:'QUANTUM COMPUTING',       color:'#8855ff', wave:'frontier', thesis:'Further out but same pattern — massive capex now, revenue TBD, infrastructure being built before the killer app is clear. IonQ is the pure play. IBM has the most mature commercial offering. QTUM ETF for diversified exposure.',tickers:[{sym:'IONQ',name:'IonQ'},{sym:'RGTI',name:'Rigetti'},{sym:'QUBT',name:'Quantum Computing'},{sym:'QTUM',name:'Quantum ETF'},{sym:'IBM',name:'IBM'}]},
    {id:'space',     name:'SPACE & CONNECTIVITY',    color:'#00ccff', wave:'frontier', thesis:'Low earth orbit as infrastructure layer. Starlink proved the model. Rocket Lab is the emerging launch provider. ASTS is the mobile broadband wildcard. Space is becoming industrial infrastructure, not exploration.',tickers:[{sym:'RKLB',name:'Rocket Lab'},{sym:'ASTS',name:'AST SpaceMobile'},{sym:'LUNR',name:'Intuitive Machines'},{sym:'SPIR',name:'Spire Global'},{sym:'LMT',name:'Lockheed Martin'},{sym:'NOC',name:'Northrop Grumman'},{sym:'RTX',name:'RTX Corp'}]},
    {id:'industrialai',name:'INDUSTRIAL AI / DIGITAL TWIN',color:'#ff8800',wave:'frontier',thesis:'The software layer that runs the physical buildout. Digital twins, simulation, industrial AI. PTC and Ansys are embedded in every major manufacturer. DDOG monitors the infrastructure. Slow and sticky — the best kind of software business.',tickers:[{sym:'PTC',name:'PTC'},{sym:'ANSS',name:'Ansys'},{sym:'DDOG',name:'Datadog'},{sym:'AZPN',name:'Aspen Tech'},{sym:'PEGA',name:'Pegasystems'}]},
  ],
};

// ── Rotation ETFs ────────────────────────────────────────────────────────────
const ROT_GROUPS = [
  {name:'SEMIS',    etf:'SMH',  label:'Semi ETF'},
  {name:'TECH',     etf:'XLK',  label:'Tech ETF'},
  {name:'POWER',    etf:'XLU',  label:'Utilities ETF'},
  {name:'ENERGY',   etf:'XLE',  label:'Energy ETF'},
  {name:'ROBOTICS', etf:'BOTZ', label:'Robotics ETF'},
  {name:'URANIUM',  etf:'URA',  label:'Uranium ETF'},
  {name:'COPPER',   etf:'COPX', label:'Copper ETF'},
  {name:'LITHIUM',  etf:'LIT',  label:'Lithium ETF'},
  {name:'RARE ERTH',etf:'REMX', label:'Rare Earth ETF'},
  {name:'GROWTH',   etf:'ARKK', label:'ARK Innovation'},
  {name:'SPACE',    etf:'ROBO', label:'Robo/Space'},
  {name:'REITs',    etf:'XLRE', label:'Real Estate ETF'},
];

// ── Historical Episodes ──────────────────────────────────────────────────────
const EPISODES = [
  {era:'Railroad Mania',     period:'1840–1850', ratio:'~5:1',      dur:'10 yrs', dd:'-60%',  rec:'15 yrs', built:'US continental rail',          v:'boom'},
  {era:'Electrification',    period:'1900–1930', ratio:'~4:1',      dur:'30 yrs', dd:'-35%',  rec:'5 yrs',  built:'Power grid + appliances',      v:'boom'},
  {era:'Interstate Highway', period:'1950–1970', ratio:'Gov funded',dur:'20 yrs', dd:'N/A',   rec:'N/A',    built:'47,000 mi of highway',         v:'boom'},
  {era:'Fiber / Dot-com',    period:'1995–2002', ratio:'~8:1',      dur:'7 yrs',  dd:'-78%',  rec:'15 yrs', built:'Global internet backbone',     v:'mixed'},
  {era:'Shale Revolution',   period:'2008–2016', ratio:'~3:1',      dur:'8 yrs',  dd:'-60%',  rec:'4 yrs',  built:'US energy independence',      v:'mixed'},
  {era:'AI / Great Buildout',period:'2022–????', ratio:'~4.2:1',    dur:'Active', dd:'TBD',   rec:'TBD',    built:'Power·Chips·DCs·Robots·Grid',  v:'active'},
];

const THESIS = [
  {title:'THE FORCING FUNCTION',body:"Capital floods in because the prize is real — general intelligence plus physical automation plus sovereign manufacturing. The infrastructure to deliver all of it doesn't exist yet. The investment itself builds what's needed. The buildout happens whether the valuations hold or not.",signal:'Watch: Does hyperscaler + government capex guidance increase or decrease each quarter?'},
  {title:'THE SIMULTANEITY',body:"What makes this unique is that six infrastructure waves are happening at once and they feed each other. AI demands power → drives nuclear → drives uranium → drives mining. Robots demand chips → drives fabs → drives CHIPS Act → drives domestic materials. It is one system.",signal:'Watch: Correlation between AI capex announcements and energy/materials stock moves.'},
  {title:'CONSTRAINT SEQUENCING',body:"Bottlenecks resolve in sequence. Chips ease → attention shifts to power. Power eases → permitting becomes the focus. Monetization pressure builds → software companies that can show ROI win. Rotation between our groups tells you which constraint the market is pricing as next.",signal:'Watch: XLU vs SMH relative performance. Power outperforming = energy seen as binding.'},
  {title:'THE RAILROAD ANALOG',body:"Railroad investors mostly lost money. The bubble wiped capital. But America got a continental rail network that created a century of downstream wealth. The AI/buildout investor may face the same fate — painful correction, infrastructure stays and compounds for everyone else.",signal:'Watch: Does the infrastructure being built retain standalone value if AI revenues disappoint?'},
  {title:'WHEN IS IT EARNED?',body:"The AI piece of the thesis validates when AI-attributed revenue covers the capital deployed. Currently ~$0.24 revenue per $1 capex. Historical inflection when this crosses 0.6–0.7x trending to parity. The energy and materials pieces validate when construction contracts are signed — less speculative.",signal:'Watch: MSFT/GOOGL/AMZN AI revenue disclosures. Track the ratio every quarter.'},
  {title:'WHAT BREAKS THE THESIS',body:"(1) A superior non-compute AI architecture. (2) Regulation halts deployment before revenue materializes. (3) Energy constraints prove fundamentally unsolvable. (4) Enterprise adoption plateaus. (5) Geopolitical shock disrupts supply chains at a scale that slows the buildout faster than policy can respond.",signal:'Watch: Model efficiency curves (intelligence per watt). If 10x improvement, buildout math changes.'},
];

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
function loadState(){try{const s=localStorage.getItem('ignition_v2');if(s)return JSON.parse(s);}catch(e){}return{constraints:DEFAULT_CONSTRAINTS,capex:DEFAULT_CAPEX,note:DEFAULT_NOTE};}
function saveState(s){localStorage.setItem('ignition_v2',JSON.stringify(s));}
let STATE=loadState();

function scoreColor(s){if(s<30)return'var(--red)';if(s<50)return'var(--yellow)';if(s<70)return'var(--orange)';return'var(--green)';}
function scoreFill(s){if(s<30)return'#ff3355';if(s<50)return'#ffcc00';if(s<70)return'#ff8800';return'#00ff88';}
function phase(i){if(i<20)return'PRE-IGNITION';if(i<40)return'EARLY BUILDOUT';if(i<55)return'MID BUILDOUT';if(i<70)return'LATE BUILDOUT';if(i<85)return'VALIDATION';return'EARNED';}

// ── Tab switching (internal to panel-ignition) ────────────────────────────────────────────
function switchTab(id){
  document.querySelectorAll('.ig-tab').forEach((t,i)=>{
    const ids=['overview','ai','robotics','energy','semisov','materials','frontier','thesis'];
    t.classList.toggle('active',ids[i]===id);
  });
  document.querySelectorAll('.tab-section').forEach(s=>s.classList.remove('active'));
  document.getElementById('tab-'+id)?.classList.add('active');
}

// ── Render constraints ───────────────────────────────────────────────────────
function renderConstraints(){
  const el=document.getElementById('constraintGrid');
  if(!el) return;
  el.innerHTML=STATE.constraints.map(c=>
    '<div class="cc">' +
    '<div class="cc-top"><div class="cc-name">'+c.name+'</div><div class="cc-score" style="color:'+scoreColor(c.score)+'">'+c.score+'</div></div>' +
    '<div class="cc-track"><div class="cc-fill" style="width:'+c.score+'%;background:'+scoreFill(c.score)+'"></div></div>' +
    '<div class="cc-rows">'+c.metrics.map(m=>'<div class="cc-row"><span class="cc-k">'+m.key+'</span><span class="cc-v '+m.cls+'">'+m.val+'</span></div>').join('')+'</div>' +
    '<span class="cc-tag tag-'+c.status+'">'+c.status.toUpperCase()+'</span>' +
    '</div>'
  ).join('');
  const avg=Math.round(STATE.constraints.reduce((a,b)=>a+b.score,0)/STATE.constraints.length);
  const numEl=document.getElementById('igIndexNum');
  const phEl=document.getElementById('igPhaseTag');
  if(numEl){numEl.textContent=avg;numEl.style.color=scoreColor(avg);}
  if(phEl){phEl.textContent=phase(avg);}
}

// ── Render capex ─────────────────────────────────────────────────────────────
function renderCapex(){
  const tC=STATE.capex.reduce((a,b)=>a+b.capex,0);
  const tR=STATE.capex.reduce((a,b)=>a+b.rev,0);
  const ratio=(tC/tR).toFixed(1);
  const pct=Math.min((tR/tC)*100,100);
  const cosEl=document.getElementById('capexCos');
  const compEl=document.getElementById('capexComposite');
  const noteEl=document.getElementById('capexNote');
  if(cosEl) cosEl.innerHTML=STATE.capex.map(d=>
    '<div class="capex-co">' +
    '<div class="capex-co-name">'+d.co+'</div>' +
    '<div class="capex-co-capex">$'+d.capex+'B capex</div>' +
    '<div class="capex-co-rev">$'+d.rev+'B AI rev</div>' +
    '<div class="capex-co-ratio">'+(d.capex/d.rev).toFixed(1)+'x</div>' +
    '</div>'
  ).join('');
  if(compEl) compEl.innerHTML=
    '<div class="capex-comp-num">'+ratio+'x</div>' +
    '<div class="capex-comp-detail">' +
    '<div class="capex-comp-lbl">COMPOSITE RATIO — CAPEX ÷ AI REVENUE</div>' +
    '<div class="capex-comp-sub">$'+tC.toFixed(0)+'B deployed · $'+tR.toFixed(0)+'B AI revenue returned · '+pct.toFixed(0)+'% coverage</div>' +
    '<div class="capex-bar-wrap"><div class="capex-bar" style="width:'+pct.toFixed(1)+'%"></div></div>' +
    '</div>';
  if(noteEl) noteEl.innerHTML='Railroad era peaked at <strong>~5:1</strong>. Fiber/dot-com hit <strong>~8:1</strong> before collapse. Current AI buildout: <strong>'+ratio+':1</strong>. Historical inflection when ratio compresses through <strong>~2:1</strong> on its way to parity. That compression IS the signal — track it every quarter.';
}

// ── Render rotation ──────────────────────────────────────────────────────────
function renderRotation(quotes){
  const spyPct=quotes['SPY']?.pct_change??0;
  const cards=ROT_GROUPS.map(g=>{
    const q=quotes[g.etf];const pct=q?.pct_change??null;
    const vs=pct!==null?+(pct-spyPct).toFixed(2):null;
    const cls=pct===null?'':pct>=0?'up':'dn';
    const bw=pct===null?50:Math.min(Math.max((pct+5)/10*100,0),100);
    const bc=pct===null?'var(--border2)':pct>=0?'#00ff88':'#ff3355';
    return{g,pct,vs,cls,bw,bc};
  });
  const valid=cards.filter(c=>c.pct!==null);
  const mx=valid.length?Math.max(...valid.map(c=>c.pct)):null;
  const mn=valid.length?Math.min(...valid.map(c=>c.pct)):null;
  const rotEl=document.getElementById('rotGrid');
  if(rotEl) rotEl.innerHTML=cards.map(({g,pct,vs,cls,bw,bc})=>{
    const win=pct!==null&&pct===mx;const lag=pct!==null&&pct===mn&&mn!==mx;
    return '<div class="rot-card '+(win?'rot-winner':'')+' '+(lag?'rot-laggard':'')+'">' +
      '<div class="rot-name">'+g.name+(win?' ▲':'')+'</div>' +
      '<div class="rot-pct '+cls+'">'+(pct!==null?(pct>=0?'+':'')+pct.toFixed(2)+'%':'—')+'</div>' +
      '<div class="rot-bar-track"><div class="rot-bar-fill" style="width:'+bw+'%;background:'+bc+'"></div></div>' +
      '<div class="rot-vs '+(vs===null?'':(vs>=0?'up':'dn'))+'">'+(vs!==null?(vs>=0?'▲ +':'▼ ')+Math.abs(vs)+'% vs SPY':'—')+'</div>' +
      '<div class="rot-etf">'+g.etf+' · '+g.label+'</div>' +
      '</div>';
  }).join('');
  const sig=document.getElementById('rotSignal');
  if(sig && valid.length>=2){
    const ldr=cards.find(c=>c.pct===mx);const lag=cards.find(c=>c.pct===mn&&mn!==mx);
    const spread=mx!==null&&mn!==null?(mx-mn).toFixed(2):'—';
    const pu=quotes['XLU']?.pct_change??null;const ps=quotes['SMH']?.pct_change??null;
    let msg='↳ Leader: <strong style="color:var(--green)">'+(ldr?.g.name??'—')+'</strong> · Laggard: <strong style="color:var(--red)">'+(lag?.g.name??'—')+'</strong> · Spread: '+spread+'%';
    if(pu!==null&&ps!==null){
      const d=(pu-ps).toFixed(2);
      msg+='<br>↳ Power vs Chips: '+(parseFloat(d)>0?'POWER outperforming by '+Math.abs(d)+'% → energy constraint most pressing':'CHIPS outperforming by '+Math.abs(d)+'% → silicon supply most pressing');
    }
    sig.innerHTML=msg;
  }else if(sig){sig.textContent='↳ Load market_data.json for live rotation signal';}
}

// ── Render stock groups ──────────────────────────────────────────────────────
function renderGroupsInto(containerId, groups, quotes){
  const wrap=document.getElementById(containerId);
  if(!wrap)return;
  wrap.innerHTML=groups.map((g,i)=>{
    const av=g.tickers.map(t=>quotes[t.sym]?.pct_change).filter(v=>v!=null);
    const avg=av.length?av.reduce((a,b)=>a+b,0)/av.length:null;
    const ac=avg===null?'':avg>=0?'up':'dn';
    const as=avg!==null?(avg>=0?'+':'')+avg.toFixed(2)+'% avg':'— no data';
    const stocks=g.tickers.map(t=>{
      const q=quotes[t.sym];const p=q?.price??null;const pc=q?.pct_change??null;
      const cls=pc===null?'':pc>=0?'up':'dn';
      return '<div class="sc"><div class="sc-sym">'+t.sym+'</div><div class="sc-name">'+t.name+'</div>' +
        '<div class="sc-price '+(p!==null?cls:'na')+'">'+(p!==null?'$'+p.toFixed(2):'no data')+'</div>' +
        '<div class="sc-chg '+cls+'">'+(pc!==null?(pc>=0?'+':'')+pc.toFixed(2)+'%':'')+'</div></div>';
    }).join('');
    return '<div class="grp-block '+(i===0?'open':'')+'" id="grp-'+g.id+'">' +
      '<div class="grp-hdr" onclick="toggleGrp(\''+g.id+'\')">' +
      '<div class="grp-hdr-l">' +
      '<div class="grp-dot" style="background:'+g.color+';box-shadow:0 0 8px '+g.color+'55"></div>' +
      '<div><div class="grp-title">'+g.name+'</div><div class="grp-wave">'+g.wave.toUpperCase()+' WAVE</div></div>' +
      '</div>' +
      '<div class="grp-hdr-r"><div class="grp-avg '+ac+'">'+as+'</div><div class="grp-chev">▼</div></div>' +
      '</div>' +
      '<div class="grp-body">' +
      '<div class="grp-thesis-full" style="border-left-color:'+g.color+'">'+g.thesis+'</div>' +
      '<div class="stock-grid">'+stocks+'</div>' +
      '</div>' +
      '</div>';
  }).join('');
}
function toggleGrp(id){document.getElementById('grp-'+id)?.classList.toggle('open');}

function renderEpisodes(){
  const el=document.getElementById('epBody');
  if(!el) return;
  el.innerHTML=EPISODES.map(e=>'<tr>' +
    '<td class="ep-era">'+e.era+'</td><td>'+e.period+'</td>' +
    '<td style="color:var(--ig2)">'+e.ratio+'</td><td>'+e.dur+'</td>' +
    '<td class="'+(e.dd.startsWith('-')?'outcome-bust':'')+'">'+e.dd+'</td><td>'+e.rec+'</td>' +
    '<td style="font-size:10px">'+e.built+'</td>' +
    '<td><span class="outcome-'+e.v+'">'+e.v.toUpperCase()+'</span></td>' +
    '</tr>').join('');
}

function renderThesis(){
  const el=document.getElementById('thesisGrid');
  if(!el) return;
  el.innerHTML=THESIS.map(t=>
    '<div class="thesis-card">' +
    '<div class="thesis-title">'+t.title+'</div>' +
    '<div class="thesis-body">'+t.body+'</div>' +
    '<div class="thesis-signal">↳ '+t.signal+'</div>' +
    '</div>'
  ).join('');
}

// ── Admin ────────────────────────────────────────────────────────────────────
function openAdmin(){buildAdminForms();document.getElementById('adminOverlay').style.display='block';document.body.style.overflow='hidden';document.getElementById('adminUpdateNote').value=STATE.note||DEFAULT_NOTE;}
function closeAdmin(){document.getElementById('adminOverlay').style.display='none';document.body.style.overflow='';}
function adminOut(e){if(e.target===document.getElementById('adminOverlay'))closeAdmin();}

function buildAdminForms(){
  document.getElementById('adminConstraintForms').innerHTML=STATE.constraints.map((c,ci)=>
    '<div class="adm-constraint">' +
    '<div class="adm-c-name">'+c.name+'</div>' +
    '<div class="adm-row"><label>Score (0–100)</label>' +
    '<input type="range" min="0" max="100" value="'+c.score+'" id="adm-r-'+ci+'"' +
    ' oninput="document.getElementById(\'adm-d-'+ci+'\').textContent=this.value;document.getElementById(\'adm-d-'+ci+'\').style.color=scoreColor(+this.value)">' +
    '<div class="adm-score-display" id="adm-d-'+ci+'" style="color:'+scoreColor(c.score)+'">'+c.score+'</div>' +
    '</div>' +
    '<div class="adm-row"><label>Status</label>' +
    '<select id="adm-s-'+ci+'">'+['critical','constrained','easing','resolving'].map(s=>'<option value="'+s+'"'+(c.status===s?' selected':'')+'>'+s+'</option>').join('')+'</select>' +
    '</div>' +
    '<div style="font-family:\'Orbitron\',monospace;font-size:7px;letter-spacing:1px;color:var(--text3);margin:7px 0 3px">METRICS</div>' +
    c.metrics.map((m,mi)=>'<div class="adm-metric-row">' +
      '<input type="text" id="adm-mk-'+ci+'-'+mi+'" value="'+m.key+'">' +
      '<input type="text" id="adm-mv-'+ci+'-'+mi+'" value="'+m.val+'">' +
      '<select id="adm-mc-'+ci+'-'+mi+'">' +
      '<option value=""'+(m.cls===''?' selected':'')+'>neutral</option>' +
      '<option value="up"'+(m.cls==='up'?' selected':'')+'>up</option>' +
      '<option value="dn"'+(m.cls==='dn'?' selected':'')+'>dn</option>' +
      '<option value="warn"'+(m.cls==='warn'?' selected':'')+'>warn</option>' +
      '</select></div>'
    ).join('') +
    '</div>'
  ).join('');
  document.getElementById('adminCapexForms').innerHTML=STATE.capex.map((d,di)=>
    '<div class="adm-capex-row"><span>'+d.co+'</span>' +
    '<input type="number" step="0.1" id="adm-cap-'+di+'" value="'+d.capex+'">' +
    '<input type="number" step="0.1" id="adm-rev-'+di+'" value="'+d.rev+'">' +
    '</div>'
  ).join('');
}

function adminSave(){
  STATE.constraints=STATE.constraints.map((c,ci)=>({...c,
    score:parseInt(document.getElementById('adm-r-'+ci)?.value??c.score),
    status:document.getElementById('adm-s-'+ci)?.value??c.status,
    metrics:c.metrics.map((m,mi)=>({
      key:document.getElementById('adm-mk-'+ci+'-'+mi)?.value??m.key,
      val:document.getElementById('adm-mv-'+ci+'-'+mi)?.value??m.val,
      cls:document.getElementById('adm-mc-'+ci+'-'+mi)?.value??m.cls,
    }))
  }));
  STATE.capex=STATE.capex.map((d,di)=>({...d,
    capex:parseFloat(document.getElementById('adm-cap-'+di)?.value??d.capex),
    rev:parseFloat(document.getElementById('adm-rev-'+di)?.value??d.rev),
  }));
  STATE.note=document.getElementById('adminUpdateNote')?.value??STATE.note;
  saveState(STATE);closeAdmin();
  renderConstraints();renderCapex();
  const stampEl=document.getElementById('stampEl');
  if(stampEl) stampEl.textContent='Constraint scores manually curated · Prices from market_data.json · '+STATE.note;
}

document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAdmin();});

// ── Admin AI Generate ────────────────────────────────────────────────────────
async function adminAIGenerate() {
  const btn = document.getElementById('aiGenBtn');
  const status = document.getElementById('aiGenStatus');
  if(!btn || !status) return;
  btn.disabled = true;
  btn.textContent = '⬡ GENERATING...';
  status.textContent = 'Asking AI to assess each constraint...';

  const constraintNames = STATE.constraints.map(c => c.name).join(', ');
  const prompt = 'You are assessing the current state of the AI/tech buildout constraints as of today. For each of the following constraints, provide:\n1. A score from 0-100 (0 = completely unresolved/critical, 100 = fully resolved)\n2. A status: critical, constrained, easing, or resolving\n3. 3-5 current metrics with values and direction (up/dn/warn/neutral)\n\nConstraints to assess: ' + constraintNames + '\n\nRespond ONLY with a JSON array in this exact format, no other text:\n[\n  {\n    "name": "POWER & GRID",\n    "score": 22,\n    "status": "critical",\n    "metrics": [\n      {"key": "Grid queue backlog", "val": "~2,600 GW", "cls": "dn"},\n      {"key": "DC power demand YoY", "val": "+26%", "cls": "warn"}\n    ]\n  }\n]\nUse current real-world data. Be specific with numbers.';

  try {
    const resp = await fetch('/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: 'You are a technology sector analyst with deep knowledge of AI infrastructure, semiconductors, energy, and materials supply chains. Return only valid JSON arrays, no markdown, no preamble.',
        prompt: prompt
      })
    });
    if (!resp.ok) throw new Error('AI request failed: ' + resp.status);
    const data = await resp.json();
    const text = data.text || data.content || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) throw new Error('Expected array');
    // Merge AI scores into STATE, preserving IDs
    parsed.forEach(ai => {
      const idx = STATE.constraints.findIndex(c => c.name === ai.name);
      if (idx >= 0) {
        STATE.constraints[idx].score = Math.max(0, Math.min(100, ai.score || 0));
        STATE.constraints[idx].status = ai.status || STATE.constraints[idx].status;
        if (Array.isArray(ai.metrics) && ai.metrics.length) {
          STATE.constraints[idx].metrics = ai.metrics.map(m => ({
            key: m.key || '', val: m.val || '', cls: m.cls || ''
          }));
        }
      }
    });
    saveState(STATE);
    buildAdminForms();
    status.textContent = '✓ AI scores applied — review and save.';
    status.style.color = 'var(--green)';
  } catch(e) {
    status.textContent = '✗ Error: ' + e.message;
    status.style.color = 'var(--red)';
  } finally {
    btn.disabled = false;
    btn.textContent = '⬡ AI GENERATE SCORES';
  }
}

// ── Price long-press (on topbar SPY price display) ───────────────────────────
let _priceLongPressTimer = null;
function _priceLongPressStart() {
  _priceLongPressTimer = setTimeout(() => {
    _priceLongPressTimer = null;
    // Long-press on price: switch to live chart
    if (typeof switchGroupTab === 'function') switchGroupTab('desk', 'live-chart');
  }, 1200);
}
function _priceLongPressCancel() {
  if (_priceLongPressTimer) { clearTimeout(_priceLongPressTimer); _priceLongPressTimer = null; }
}
window._priceLongPressStart = _priceLongPressStart;
window._priceLongPressCancel = _priceLongPressCancel;

// ── Logo long-press (easter egg / dev shortcut) ──────────────────────────────
let _logoLongPressTimer = null;
function _logoLongPressStart() {
  _logoLongPressTimer = setTimeout(() => {
    _logoLongPressTimer = null;
    // Long-press action: open admin panel if on ignition tab, else no-op
    if (typeof openAdmin === 'function' && document.getElementById('panel-ignition')?.classList.contains('active')) {
      openAdmin();
    }
  }, 1200);
}
function _logoLongPressCancel() {
  if (_logoLongPressTimer) { clearTimeout(_logoLongPressTimer); _logoLongPressTimer = null; }
}
function _logoTap() {
  if (_logoLongPressTimer) return; // was a long press, ignore tap
  // Short tap: go to Market Hub
  if (typeof switchTab === 'function') switchTab('hub');
}
window._logoLongPressStart = _logoLongPressStart;
window._logoLongPressCancel = _logoLongPressCancel;
window._logoTap = _logoTap;

// ═══════════════════════════════════════════
// DASHBOARD ENTRY POINT
// Called by _switchPanelOnly('ignition') in dashboard1.js
// ═══════════════════════════════════════════
function loadIgnitionData() {
  try {
    const md = window._md || {};
    const quotes = md.quotes || {};

    renderConstraints();
    renderCapex();
    renderRotation(quotes);

    const waves = ['ai','robotics','energy','semisov','materials','frontier'];
    waves.forEach(w => {
      const grpData = WAVE_GROUPS[w] || [];
      if (grpData.length) renderGroupsInto('groups-' + w, grpData, quotes);
    });

    renderEpisodes();
    renderThesis();

    const stampEl = document.getElementById('stampEl');
    if (stampEl) stampEl.textContent = 'Constraint scores manually curated · Prices from market_data.json · ' + (STATE.note || DEFAULT_NOTE);
  } catch(e) {
    console.warn('loadIgnitionData error:', e);
  }
}
window.loadIgnitionData = loadIgnitionData;
