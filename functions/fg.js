export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  // Try CNN graphdata endpoint (returns current + historical)
  const endpoints = [
    'https://production.dataviz.cnn.io/index/fearandgreed/graphdata',
    'https://production.dataviz.cnn.io/index/fearandgreed/graphdata/2024-01-01',
  ];

  for (const url of endpoints) {
    try {
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
          'Referer': 'https://www.cnn.com/markets/fear-and-greed',
          'Origin': 'https://www.cnn.com',
          'Accept': 'application/json',
        }
      });

      if (!r.ok) continue;
      const d = await r.json();
      const fg = d?.fear_and_greed;
      if (!fg?.score) continue;

      // Extract history time series
      const history = [];
      const hist = d?.fear_and_greed_historical;
      if (hist?.data && Array.isArray(hist.data)) {
        for (const pt of hist.data) {
          // CNN format: [timestamp_ms, score] or {x: ts, y: score}
          if (Array.isArray(pt) && pt.length >= 2) {
            history.push({ t: pt[0], v: Math.round(pt[1]) });
          } else if (pt && typeof pt === 'object' && pt.x != null) {
            history.push({ t: pt.x, v: Math.round(pt.y ?? pt.score ?? 0) });
          }
        }
      }

      return new Response(JSON.stringify({
        value:      Math.round(fg.score),
        label:      fg.rating || '',
        timestamp:  fg.timestamp || null,
        snapshots: {
          prev_close: fg.previous_close   != null ? { v: Math.round(fg.previous_close),   label: fg.previous_close_rating   } : null,
          prev_week:  fg.previous_1_week  != null ? { v: Math.round(fg.previous_1_week),  label: fg.previous_1_week_rating  } : null,
          prev_month: fg.previous_1_month != null ? { v: Math.round(fg.previous_1_month), label: fg.previous_1_month_rating } : null,
          prev_year:  fg.previous_1_year  != null ? { v: Math.round(fg.previous_1_year),  label: fg.previous_1_year_rating  } : null,
        },
        history,  // [{t: unix_ms, v: score}] oldest→newest
        source: 'cnn_live',
      }), { headers: corsHeaders });

    } catch(e) { /* try next */ }
  }

  return new Response(JSON.stringify({ error: 'CNN F&G API unavailable' }), {
    status: 500, headers: corsHeaders
  });
}
