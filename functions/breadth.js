// Cloudflare Pages Function — /breadth
// Fetches NYSE breadth data: A/D, Up/Down Volume, 52W Hi/Lo
// Tries Barchart internal API first, falls back to calculated proxies

export async function onRequest(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
  };

  // Try Barchart's internal API (powers their market overview page)
  try {
    const url = 'https://www.barchart.com/proxies/core-api/v1/quotes/get?' +
      'symbols=ADSPD,UVOLD,DVOLD,NHNLD&' +
      'fields=symbol,name,lastPrice,priceChange&' +
      'meta=field.shortName,field.type';

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.barchart.com/stocks/market-performance',
        'Accept': 'application/json',
        'x-xsrf-token': 'not-needed',
      }
    });

    if (resp.ok) {
      const data = await resp.json();
      const quotes = {};
      (data.data || []).forEach(q => {
        quotes[q.symbol] = q.raw || q;
      });

      // ADSPD = Advance/Decline, UVOLD = Up Volume, DVOLD = Down Volume, NHNLD = New Hi/Lo
      const adv    = quotes['ADSPD']?.lastPrice;
      const uvol   = quotes['UVOLD']?.lastPrice;
      const dvol   = quotes['DVOLD']?.lastPrice;
      const hiLo   = quotes['NHNLD']?.lastPrice;

      if (adv || uvol) {
        return new Response(JSON.stringify({
          source: 'barchart',
          advancing: adv ? Math.round(adv) : null,
          declining: quotes['ADSPD'] ? Math.round(Math.abs(quotes['ADSPD'].priceChange || 0)) : null,
          upVolume:  uvol ? Math.round(uvol * 1e6) : null,
          downVolume:dvol ? Math.round(dvol * 1e6) : null,
          newHighs:  hiLo ? Math.round(Math.max(hiLo, 0)) : null,
          newLows:   hiLo ? Math.round(Math.abs(Math.min(hiLo, 0))) : null,
          timestamp: new Date().toISOString(),
        }), { headers });
      }
    }
  } catch(e) {
    // Barchart blocked or failed — fall through
    console.log('Barchart failed:', e.message);
  }

  // Fallback: try WSJ market data API
  try {
    const url = 'https://www.wsj.com/market-data/stocks/marketsdiary';
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)',
        'Accept': 'application/json',
      }
    });

    if (resp.ok) {
      const data = await resp.json();
      // WSJ returns { Issues: { Advancing, Declining, Unchanged }, Volume: { Up, Down } }
      const issues = data?.MarketDiary?.Issues || {};
      const vol    = data?.MarketDiary?.Volume || {};
      const hiLo   = data?.MarketDiary?.NewHighsLows || {};

      return new Response(JSON.stringify({
        source: 'wsj',
        advancing:  issues.Advancing  ? parseInt(issues.Advancing)  : null,
        declining:  issues.Declining  ? parseInt(issues.Declining)  : null,
        upVolume:   vol.Up            ? parseInt(vol.Up)            : null,
        downVolume: vol.Down          ? parseInt(vol.Down)          : null,
        newHighs:   hiLo.NewHighs     ? parseInt(hiLo.NewHighs)     : null,
        newLows:    hiLo.NewLows      ? parseInt(hiLo.NewLows)      : null,
        timestamp:  new Date().toISOString(),
      }), { headers });
    }
  } catch(e) {
    console.log('WSJ failed:', e.message);
  }

  // Both failed
  return new Response(JSON.stringify({
    source: 'unavailable',
    error: 'All breadth data sources unavailable',
    timestamp: new Date().toISOString(),
  }), { headers });
}
