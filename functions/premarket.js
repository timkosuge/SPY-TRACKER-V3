// Cloudflare Pages Function — /premarket
// Fetches SPY pre-market OHLC (4:00am – 9:30am ET) from Yahoo Finance
// Returns: { high, low, mid, open, last, change, changePct, from, to, bars }

export async function onRequest(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
  };

  try {
    const now = new Date();

    // ── Determine today's date in ET and the ET UTC offset ──────────────────
    // Use formatToParts for reliable parsing — avoids regex on locale-formatted strings
    const etFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: 'numeric', hour12: false, timeZoneName: 'shortOffset'
    });
    const etParts = etFmt.formatToParts(now);
    const getPart = type => etParts.find(p => p.type === type)?.value || '';
    const todayStr = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;

    // ET UTC offset from timeZoneName "GMT-4" (EDT) or "GMT-5" (EST)
    const tzName = getPart('timeZoneName');
    const offsetMatch = tzName.match(/GMT([+-]\d+)/);
    const etOffsetHrs = offsetMatch ? parseInt(offsetMatch[1]) : -4; // default EDT

    // Pre-market window in UTC:
    //   4:00am ET  → 4  - etOffsetHrs UTC  (EDT=-4 → 8 UTC, EST=-5 → 9 UTC)
    //   9:30am ET  → 9.5 - etOffsetHrs UTC  (EDT=-4 → 13.5, EST=-5 → 14.5)
    const pmStartHrUTC = 4   - etOffsetHrs;
    const pmEndHrUTC   = 9.5 - etOffsetHrs;

    const pmStart = new Date(`${todayStr}T${String(pmStartHrUTC).padStart(2,'0')}:00:00Z`);
    const pmEndH  = Math.floor(pmEndHrUTC);
    const pmEndM  = (pmEndHrUTC % 1 === 0.5) ? '30' : '00';
    const pmEnd   = new Date(`${todayStr}T${String(pmEndH).padStart(2,'00')}:${pmEndM}:00Z`);

    const p1 = Math.floor(pmStart.getTime() / 1000);
    // Cap at actual PM close — never let RTH bars bleed in
    const p2 = Math.floor(Math.min(pmEnd.getTime(), now.getTime()) / 1000);

    if (p2 <= p1) {
      return new Response(JSON.stringify({
        error: 'Pre-market session not started yet',
        available: false,
        debug: { todayStr, etOffsetHrs, tzName }
      }), { headers });
    }

    // ── Fetch 1m bars from Yahoo ─────────────────────────────────────────────
    // includePrePost=true required to get PM bars. Yahoo ignores period2 for
    // extended hours so we MUST filter timestamps server-side.
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1m&period1=${p1}&period2=${p2}&includePrePost=true`;

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)',
        'Accept': 'application/json',
      }
    });

    if (!resp.ok) throw new Error(`Yahoo returned ${resp.status}`);

    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('No chart data returned');

    const timestamps = result.timestamp || [];
    const quotes     = result.indicators?.quote?.[0] || {};
    const opens      = quotes.open   || [];
    const highs      = quotes.high   || [];
    const lows       = quotes.low    || [];
    const closes     = quotes.close  || [];
    const vols       = quotes.volume || [];

    if (!timestamps.length) {
      return new Response(JSON.stringify({ error: 'No pre-market bars found', available: false }), { headers });
    }

    // Strict filter: only bars inside [p1, p2] with valid OHLC
    // This is the critical step — Yahoo bleeds RTH bars in with includePrePost
    const bars = timestamps.map((t, i) => ({
      t, open: opens[i], high: highs[i], low: lows[i], close: closes[i], vol: vols[i]
    })).filter(b =>
      b.t >= p1 &&
      b.t <  p2 &&          // strict < not <= so the 9:30 open bar never bleeds in
      b.high  != null &&
      b.low   != null &&
      b.close != null &&
      b.high  > 0 &&
      b.low   > 0
    );

    if (!bars.length) {
      return new Response(JSON.stringify({
        error: 'No valid bars in pre-market window',
        available: false,
        debug: { p1, p2, totalBars: timestamps.length, todayStr, etOffsetHrs }
      }), { headers });
    }

    const pmHigh  = Math.max(...bars.map(b => b.high));
    const pmLow   = Math.min(...bars.map(b => b.low));
    const pmMid   = (pmHigh + pmLow) / 2;
    const pmOpen  = bars[0].open ?? bars[0].close;
    const pmLast  = bars[bars.length - 1].close;
    const pmVol   = bars.reduce((a, b) => a + (b.vol || 0), 0);

    // Previous close from meta
    const prevClose = result.meta?.previousClose || result.meta?.chartPreviousClose || null;
    const change    = prevClose ? pmLast - prevClose : null;
    const changePct = prevClose && change != null ? (change / prevClose) * 100 : null;

    const fromTime = new Date(bars[0].t * 1000).toISOString();
    const toTime   = new Date(bars[bars.length - 1].t * 1000).toISOString();

    return new Response(JSON.stringify({
      available:  true,
      high:       Math.round(pmHigh  * 100) / 100,
      low:        Math.round(pmLow   * 100) / 100,
      mid:        Math.round(pmMid   * 100) / 100,
      open:       Math.round(pmOpen  * 100) / 100,
      last:       Math.round(pmLast  * 100) / 100,
      prevClose:  prevClose ? Math.round(prevClose * 100) / 100 : null,
      change:     change    != null ? Math.round(change    * 100) / 100 : null,
      changePct:  changePct != null ? Math.round(changePct * 100) / 100 : null,
      volume:     pmVol,
      bars:       bars.length,
      from:       fromTime,
      to:         toTime,
      debug:      { todayStr, etOffsetHrs, tzName, p1, p2 }
    }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, available: false }), { headers, status: 200 });
  }
}
