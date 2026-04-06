// Cloudflare Pages Function — /premarket
// Gets SPY pre-market high/low/mid (4:00am – 9:30am ET) via Yahoo Finance

export async function onRequest(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
  };

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/SPY?interval=1m&range=1d&includePrePost=true`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    if (!resp.ok) throw new Error(`Yahoo ${resp.status}`);

    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('No data');

    const timestamps = result.timestamp || [];
    const q     = result.indicators?.quote?.[0] || {};
    const highs = q.high   || [];
    const lows  = q.low    || [];

    // Today's date string in CT
    const ctDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());

    // Convert each bar's unix timestamp to CT date+time and filter strictly
    // to today's 3:00am–8:30am CT window (= 4:00am–9:30am ET)
    const ctFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    });

    const pmBars = timestamps.map((t, i) => {
      const parts = ctFmt.formatToParts(new Date(t * 1000));
      const get = type => parts.find(p => p.type === type)?.value || '0';
      const date = `${get('year')}-${get('month')}-${get('day')}`;
      const mins = parseInt(get('hour')) * 60 + parseInt(get('minute'));
      return { t, h: highs[i], l: lows[i], date, mins };
    }).filter(b =>
      b.date === ctDate &&   // must be today in CT
      b.mins >= 180 &&       // >= 3:00am CT
      b.mins < 510 &&        // < 8:30am CT
      b.h != null && b.l != null &&
      b.h > 0 && b.l > 0
    );

    if (!pmBars.length) {
      return new Response(JSON.stringify({
        available: false, error: 'No PM bars found',
        debug: { ctDate, totalBars: timestamps.length }
      }), { headers });
    }

    const high = Math.round(Math.max(...pmBars.map(b => b.h)) * 100) / 100;
    const low  = Math.round(Math.min(...pmBars.map(b => b.l)) * 100) / 100;
    const mid  = Math.round(((high + low) / 2) * 100) / 100;

    return new Response(JSON.stringify({
      available: true, high, low, mid,
      bars: pmBars.length,
      from: new Date(pmBars[0].t * 1000).toISOString(),
      to:   new Date(pmBars[pmBars.length - 1].t * 1000).toISOString(),
    }), { headers });

  } catch(e) {
    return new Response(JSON.stringify({ available: false, error: e.message }), { headers });
  }
}
