import { etEpoch, isTradingDay } from './_nyse.js';

// Cloudflare Pages Function — /weekopen
// Returns SPY's Monday open price (first trading day of current week)
// Uses Yahoo Finance v8 chart API (no crumb/cookie needed for this endpoint)

export async function onRequestGet(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  try {
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    // Determine Monday of the current week in ET
    const now = new Date();
    const etFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const etParts = etFmt.formatToParts(now);
    const getPart = t => etParts.find(p => p.type === t)?.value || '';
    const etYear = parseInt(getPart('year'));
    const etMonth = parseInt(getPart('month')) - 1;
    const etDay = parseInt(getPart('day'));

    const etDate = new Date(etYear, etMonth, etDay);
    const dow = etDate.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    const daysFromMon = dow === 0 ? 6 : dow - 1;
    const monDate = new Date(etDate);
    monDate.setDate(etDate.getDate() - daysFromMon);

    const pad = n => String(n).padStart(2, '0');
    const monStr = `${monDate.getFullYear()}-${pad(monDate.getMonth()+1)}-${pad(monDate.getDate())}`;

    let firstSession = new Date(monStr + 'T12:00:00Z');
    while (!isTradingDay(firstSession)) firstSession = new Date(firstSession.getTime() + 864e5);
    const firstStr = firstSession.toISOString().slice(0, 10);
    const p1 = etEpoch(firstStr, 9 * 60 + 30);
    const p2 = Math.floor(now.getTime() / 1000);

    if (p2 <= p1) {
      return new Response(JSON.stringify({ error: 'Market not open yet', available: false }), { headers });
    }

    // Fetch daily bars for this week — no crumb/cookie needed for v8 chart endpoint
    const yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&period1=${p1}&period2=${p2}`;

    const resp = await fetch(yUrl, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' }
    });

    if (!resp.ok) throw new Error(`Yahoo ${resp.status}`);

    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('No chart data');

    const opens = result.indicators?.quote?.[0]?.open || [];
    const timestamps = result.timestamp || [];

    if (!opens.length || opens[0] == null) throw new Error('No open data');

    // First bar = Monday's open (or first trading day of the week)
    const weekOpen = Math.round(opens[0] * 100) / 100;
    const weekOpenDate = timestamps[0]
      ? new Date(timestamps[0] * 1000).toISOString().slice(0, 10)
      : firstStr;

    return new Response(JSON.stringify({
      available: true,
      weekOpen,
      weekOpenDate,
      monStr,
      firstSession: firstStr,
      daysFromMon,
    }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, available: false }), { headers });
  }
}
