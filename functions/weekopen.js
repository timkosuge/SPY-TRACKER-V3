// Cloudflare Pages Function — /weekopen
// Returns SPY's Monday open price (first trading day of current week)
// Uses server-side Yahoo Finance chart API with crumb+cookie auth

export async function onRequestGet(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
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

    // period1 = Monday 9:30am ET in UTC
    // During EDT (summer): 9:30am ET = 13:30 UTC; during EST (winter): 14:30 UTC
    // Use 14:00 UTC as a safe universal time that covers both (market is open by then)
    const p1 = Math.floor(new Date(monStr + 'T14:00:00Z').getTime() / 1000);
    const p2 = Math.floor(now.getTime() / 1000);

    if (p2 <= p1) {
      return new Response(JSON.stringify({ error: 'Market not open yet', available: false }), { headers });
    }

    // Fetch crumb + cookie (required for Yahoo v8)
    const consentResp = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': UA }, redirect: 'follow'
    });
    const cookieHeader = consentResp.headers.get('set-cookie') || '';
    const cookieVal = cookieHeader.split(',').map(s => s.trim()).find(s => s.startsWith('A3=')) || '';
    const cookie = cookieVal ? cookieVal.split(';')[0] : '';

    const crumbResp = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, 'Accept': '*/*', ...(cookie ? { Cookie: cookie } : {}) }
    });
    const crumb = crumbResp.ok ? (await crumbResp.text()).trim() : null;

    // Fetch daily bars for this week
    let yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&period1=${p1}&period2=${p2}`;
    if (crumb) yUrl += `&crumb=${encodeURIComponent(crumb)}`;

    const resp = await fetch(yUrl, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }
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
      : monStr;

    return new Response(JSON.stringify({
      available: true,
      weekOpen,
      weekOpenDate,
      monStr,
      daysFromMon,
    }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, available: false }), { headers });
  }
}
