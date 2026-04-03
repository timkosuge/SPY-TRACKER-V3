export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const r = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.cnn.com/markets/fear-and-greed',
        'Accept': 'application/json'
      }
    });
    const d = await r.json();
    const fg = d && d.fear_and_greed;
    if (!fg || !fg.score) throw new Error('No data');

    // Build history array from fear_and_greed_historical if present
    // CNN returns keys like: previous_close, previous_1_week, previous_1_month, previous_1_year
    const historical = [];

    // Also check for a time series array (some CNN API versions return this)
    if (d.fear_and_greed_historical && Array.isArray(d.fear_and_greed_historical.data)) {
      for (const [ts, val] of d.fear_and_greed_historical.data) {
        historical.push({ t: ts, v: Math.round(val) });
      }
    }

    // Fallback: use the snapshot comparison values
    const snapshots = {
      now:        { v: Math.round(fg.score),                label: fg.rating },
      prev_close: fg.previous_close   != null ? { v: Math.round(fg.previous_close),   label: fg.previous_close_rating   } : null,
      prev_week:  fg.previous_1_week  != null ? { v: Math.round(fg.previous_1_week),  label: fg.previous_1_week_rating  } : null,
      prev_month: fg.previous_1_month != null ? { v: Math.round(fg.previous_1_month), label: fg.previous_1_month_rating } : null,
      prev_year:  fg.previous_1_year  != null ? { v: Math.round(fg.previous_1_year),  label: fg.previous_1_year_rating  } : null,
    };

    return new Response(JSON.stringify({
      value:     Math.round(fg.score),
      label:     fg.rating,
      snapshots,
      history:   historical,  // array of {t: unix_ms, v: score} oldest→newest
    }), { headers: corsHeaders });

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}
