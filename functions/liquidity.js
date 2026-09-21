export async function onRequestGet(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  };

  const apiKey = context.env?.FRED_API_KEY;
  const errors = [];
  const fetchFRED = async (series, limit = 4) => {
    if (!apiKey) { errors.push(`${series}: FRED_API_KEY not set`); return null; }
    try {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit * 3}`;
      const r = await fetch(url, { headers: { 'User-Agent': 'SPY-Tracker/1.0' } });
      if (!r.ok) { errors.push(`${series}: FRED HTTP ${r.status}`); return null; }
      const data = await r.json();
      const obs = (data.observations || [])
        .map(o => ({ date: o.date, value: o.value === '.' ? null : parseFloat(o.value) }))
        .filter(o => o.value !== null)
        .reverse();
      return obs.slice(-limit);
    } catch (e) {
      errors.push(`${series}: ${e.message}`);
      return null;
    }
  };
  const SCALE = { WALCL: 1e6, WTREGEN: 1e6, RRPONTSYD: 1e9, M2SL: 1e9 };

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
      value: latest.value * SCALE.WALCL,
      date: latest.date,
      change_wow: (latest.value - prev.value) * SCALE.WALCL,
      change_pct: ((latest.value - prev.value) / prev.value * 100)
    };
  }

  // Reverse Repo
  if (rrp && rrp.length >= 2) {
    const latest = rrp[rrp.length - 1];
    const prev = rrp[rrp.length - 2];
    results.rrp = {
      value: latest.value * SCALE.RRPONTSYD,
      date: latest.date,
      change_wow: (latest.value - prev.value) * SCALE.RRPONTSYD,
      change_pct: ((latest.value - prev.value) / prev.value * 100)
    };
  }

  // TGA
  if (tga && tga.length >= 2) {
    const latest = tga[tga.length - 1];
    const prev = tga[tga.length - 2];
    results.tga = {
      value: latest.value * SCALE.WTREGEN,
      date: latest.date,
      change_wow: (latest.value - prev.value) * SCALE.WTREGEN,
      change_pct: ((latest.value - prev.value) / prev.value * 100)
    };
  }

  // M2
  if (m2 && m2.length >= 2) {
    const latest = m2[m2.length - 1];
    const prev = m2[m2.length - 2];
    results.m2 = {
      value: latest.value * SCALE.M2SL,
      date: latest.date,
      change_mom: (latest.value - prev.value) * SCALE.M2SL,
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

  if (errors.length) results.errors = errors;
  return new Response(JSON.stringify(results), { headers: corsHeaders });
}

