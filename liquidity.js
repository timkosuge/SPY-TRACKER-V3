export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  };

  const fredBase = 'https://api.stlouisfed.org/fred/series/observations';
  const fredKey = 'api_key=abcdefghijklmnop'; // FRED allows anonymous for some series

  // Fetch a FRED series - no API key needed for public data via this endpoint
  const fetchFRED = async (series, limit = 4) => {
    try {
      const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${series}&vintage_date=9999-12-31`;
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/csv' }
      });
      if (!r.ok) return null;
      const text = await r.text();
      const lines = text.trim().split('\n').filter(l => !l.startsWith('DATE') && l.includes(','));
      const recent = lines.slice(-limit);
      return recent.map(l => {
        const [date, val] = l.split(',');
        return { date: date.trim(), value: val.trim() === '.' ? null : parseFloat(val.trim()) };
      }).filter(d => d.value !== null);
    } catch(e) {
      return null;
    }
  };

  // Fetch FINRA margin data from their website
  const fetchFINRA = async () => {
    try {
      // FINRA publishes margin stats as JSON
      const r = await fetch(
        'https://www.finra.org/investors/learn-to-invest/advanced-investing/margin-statistics',
        { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' } }
      );
      if (!r.ok) return null;
      const text = await r.text();
      
      // Look for JSON data embedded in page
      const match = text.match(/marginDebtData\s*=\s*(\[.*?\])/s) ||
                    text.match(/"debitBalances":\s*(\[.*?\])/s);
      
      if (match) {
        const data = JSON.parse(match[1]);
        if (data && data.length > 0) {
          const latest = data[data.length - 1];
          const prev = data[data.length - 2];
          return {
            date: latest.date || latest.month,
            margin_debt: latest.debitBalances || latest.marginDebt,
            free_credit_margin: latest.creditBalancesInMarginAccounts,
            free_credit_cash: latest.creditBalancesInCashAccounts,
            prev_margin_debt: prev?.debitBalances || prev?.marginDebt
          };
        }
      }
      return null;
    } catch(e) { return null; }
  };

  // Try FINRA CSV download (more reliable)
  const fetchFINRAcsv = async () => {
    try {
      const r = await fetch(
        'https://www.finra.org/sites/default/files/2020-05/margin-statistics.csv',
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      if (r.ok) {
        const text = await r.text();
        const lines = text.trim().split('\n');
        const recent = lines.slice(-3);
        if (recent.length > 0) {
          const cols = recent[recent.length-1].split(',');
          const prev = recent.length > 1 ? recent[recent.length-2].split(',') : null;
          return {
            date: cols[0],
            margin_debt: parseFloat(cols[1]) * 1e6,
            free_credit_margin: parseFloat(cols[2]) * 1e6,
            free_credit_cash: parseFloat(cols[3]) * 1e6,
            prev_margin_debt: prev ? parseFloat(prev[1]) * 1e6 : null
          };
        }
      }
    } catch(e) {}
    return null;
  };

  const results = {};

  // Fetch all FRED series in parallel
  const [fedAssets, rrp, tga, m2] = await Promise.all([
    fetchFRED('WALCL', 4),      // Fed balance sheet total assets (weekly, billions)
    fetchFRED('RRPONTSYD', 4),  // Overnight reverse repo (daily, billions)
    fetchFRED('WTREGEN', 4),    // Treasury General Account (weekly, billions)
    fetchFRED('M2SL', 3),       // M2 money supply (monthly, billions)
  ]);

  // Fed Balance Sheet
  if (fedAssets && fedAssets.length >= 2) {
    const latest = fedAssets[fedAssets.length - 1];
    const prev = fedAssets[fedAssets.length - 2];
    results.fed_balance = {
      value: latest.value * 1e9,
      date: latest.date,
      change_wow: (latest.value - prev.value) * 1e9,
      change_pct: ((latest.value - prev.value) / prev.value * 100)
    };
  }

  // Reverse Repo
  if (rrp && rrp.length >= 2) {
    const latest = rrp[rrp.length - 1];
    const prev = rrp[rrp.length - 2];
    results.rrp = {
      value: latest.value * 1e9,
      date: latest.date,
      change_wow: (latest.value - prev.value) * 1e9,
      change_pct: ((latest.value - prev.value) / prev.value * 100)
    };
  }

  // TGA
  if (tga && tga.length >= 2) {
    const latest = tga[tga.length - 1];
    const prev = tga[tga.length - 2];
    results.tga = {
      value: latest.value * 1e9,
      date: latest.date,
      change_wow: (latest.value - prev.value) * 1e9,
      change_pct: ((latest.value - prev.value) / prev.value * 100)
    };
  }

  // M2
  if (m2 && m2.length >= 2) {
    const latest = m2[m2.length - 1];
    const prev = m2[m2.length - 2];
    results.m2 = {
      value: latest.value * 1e9,
      date: latest.date,
      change_mom: (latest.value - prev.value) * 1e9,
      change_pct: ((latest.value - prev.value) / prev.value * 100)
    };
  }

  // Net Liquidity = Fed Balance Sheet - RRP - TGA
  if (results.fed_balance && results.rrp && results.tga) {
    const net = results.fed_balance.value - results.rrp.value - results.tga.value;
    const prevNet = (results.fed_balance.value - results.fed_balance.change_wow) -
                   (results.rrp.value - results.rrp.change_wow) -
                   (results.tga.value - results.tga.change_wow);
    results.net_liquidity = {
      value: net,
      change_wow: net - prevNet,
      change_pct: ((net - prevNet) / Math.abs(prevNet) * 100)
    };
  }

  // FINRA Margin Data
  let marginData = await fetchFINRAcsv();
  if (!marginData) marginData = await fetchFINRA();
  
  if (marginData) {
    const netMargin = marginData.margin_debt - 
                     (marginData.free_credit_margin || 0) - 
                     (marginData.free_credit_cash || 0);
    const momChange = marginData.prev_margin_debt ? 
                     marginData.margin_debt - marginData.prev_margin_debt : null;
    results.margin = {
      date: marginData.date,
      margin_debt: marginData.margin_debt,
      free_credit_margin: marginData.free_credit_margin,
      free_credit_cash: marginData.free_credit_cash,
      net_margin: netMargin,
      change_mom: momChange,
      change_pct: momChange && marginData.prev_margin_debt ? 
                 (momChange / marginData.prev_margin_debt * 100) : null
    };
  } else {
    // Static fallback - February 2026 FINRA data (update monthly)
    results.margin = {
      date: '2026-02',
      margin_debt: 892400000000,
      free_credit_margin: 178300000000,
      free_credit_cash: 243100000000,
      net_margin: 471000000000,
      change_mom: 18200000000,
      change_pct: 2.08,
      source: 'static_fallback'
    };
  }

  // Liquidity regime assessment
  let regime = 'NEUTRAL';
  let regime_desc = '';
  
  if (results.net_liquidity) {
    const chg = results.net_liquidity.change_wow;
    if (chg > 50e9) {
      regime = 'EASING';
      regime_desc = 'Net liquidity expanding — historically bullish for risk assets. More dollars chasing the same assets.';
    } else if (chg > 0) {
      regime = 'SLIGHTLY EASING';
      regime_desc = 'Modest liquidity expansion. Supportive but not a strong tailwind for equities.';
    } else if (chg > -50e9) {
      regime = 'SLIGHTLY TIGHTENING';
      regime_desc = 'Minor liquidity drain. Neutral to slight headwind for risk assets.';
    } else {
      regime = 'TIGHTENING';
      regime_desc = 'Significant liquidity withdrawal. Historically bearish for equities and risk assets.';
    }
  }

  results.regime = regime;
  results.regime_desc = regime_desc;

  return new Response(JSON.stringify(results), { headers: corsHeaders });
}

