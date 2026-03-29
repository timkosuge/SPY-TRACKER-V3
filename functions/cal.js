export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  // ── Source 1: ForexFactory CDN ───────────────────────────────────────────────
  try {
    const r = await fetch('https://cdn-nfs.faireconomy.media/ff_calendar_thisweek.json', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://www.forexfactory.com',
        'Referer': 'https://www.forexfactory.com/'
      }
    });
    if (r.ok) {
      const data = await r.json();
      const events = data
        .filter(e => e.country === 'USD')
        .map(e => ({
          date: (e.date || '').substring(0, 10),
          time: e.time || '',
          event: e.title || '',
          impact: e.impact || 'Low',
          forecast: e.forecast || '',
          previous: e.previous || '',
          actual: e.actual || ''
        }))
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
      if (events.length > 0) {
        return new Response(JSON.stringify({ source: 'forexfactory', events }), { headers: corsHeaders });
      }
    }
  } catch(e) {}

  // ── Source 2: Myfxbook ───────────────────────────────────────────────────────
  try {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 6);
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    const r = await fetch(
      `https://www.myfxbook.com/forex-economic-calendar-data?startDate=${fmt(monday)}%2000:00:00&endDate=${fmt(friday)}%2023:59:00`,
      { headers: { 'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'XMLHttpRequest' } }
    );
    if (r.ok) {
      const data = await r.json();
      if (data && Array.isArray(data)) {
        const events = data
          .filter(e => e.country === 'USD' || e.country === 'US')
          .map(e => ({
            date: (e.date || '').substring(0, 10),
            time: (e.date || '').substring(11, 16),
            event: e.name || e.title || '',
            impact: e.impact === 3 ? 'High' : e.impact === 2 ? 'Medium' : 'Low',
            forecast: e.forecast || '',
            previous: e.previous || '',
            actual: e.actual || ''
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
        if (events.length > 0) {
          return new Response(JSON.stringify({ source: 'myfxbook', events }), { headers: corsHeaders });
        }
      }
    }
  } catch(e) {}

  // ── Source 3: FMP ────────────────────────────────────────────────────────────
  try {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const nextFriday = new Date(monday);
    nextFriday.setDate(monday.getDate() + 11);
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    const r = await fetch(
      `https://financialmodelingprep.com/api/v3/economic_calendar?from=${fmt(monday)}&to=${fmt(nextFriday)}&apikey=demo`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data) && data.length > 0) {
        const events = data
          .filter(e => (e.country || '').toUpperCase().includes('US'))
          .map(e => ({
            date: (e.date || '').substring(0, 10),
            time: (e.date || '').substring(11, 16),
            event: e.event || '',
            impact: e.impact === 'High' ? 'High' : e.impact === 'Medium' ? 'Medium' : 'Low',
            forecast: e.estimate != null ? String(e.estimate) : '',
            previous: e.previous != null ? String(e.previous) : '',
            actual: e.actual != null ? String(e.actual) : ''
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
        if (events.length > 0) {
          return new Response(JSON.stringify({ source: 'fmp', events }), { headers: corsHeaders });
        }
      }
    }
  } catch(e) {}

  // ── Dynamic fallback: algorithmically compute upcoming major events ───────────
  // This never goes stale — it always looks forward from today.
  //
  // Release schedule rules (approximate, but correct ~95% of the time):
  //   CPI       — 2nd or 3rd Wednesday of month+1 (BLS releases ~10-12 days after month end)
  //   NFP       — First Friday of the month (BLS Jobs report)
  //   PCE       — Last Friday of month (BEA)
  //   GDP       — Last Wednesday of month (advance/final alternating)
  //   Retail    — 2nd Wednesday or Thursday of month
  //   PPI       — Day after CPI (Thursday)
  //   JOLTS     — ~2nd Tuesday of month

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const todayStr = todayDate.toISOString().slice(0, 10);

  function addDays(d, n) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }

  function toStr(d) {
    return d.toISOString().slice(0, 10);
  }

  // Get the Nth weekday of a given month/year
  // weekday: 0=Sun,1=Mon,...,5=Fri,6=Sat; n: 1=first, 2=second, etc.
  function nthWeekday(year, month, weekday, n) {
    const d = new Date(year, month, 1);
    let count = 0;
    while (true) {
      if (d.getDay() === weekday) {
        count++;
        if (count === n) return new Date(d);
      }
      d.setDate(d.getDate() + 1);
      if (d.getMonth() !== month) return null; // safety
    }
  }

  // Get the last weekday of a given month/year
  function lastWeekday(year, month, weekday) {
    const lastDay = new Date(year, month + 1, 0); // last day of month
    while (lastDay.getDay() !== weekday) lastDay.setDate(lastDay.getDate() - 1);
    return new Date(lastDay);
  }

  // Generate events for several months ahead
  const events = [];
  const monthsAhead = 4;

  for (let offset = -1; offset <= monthsAhead; offset++) {
    const d = new Date(todayDate);
    d.setMonth(d.getMonth() + offset);
    const y = d.getFullYear();
    const m = d.getMonth(); // 0-indexed

    // NFP — first Friday of month (reports previous month's jobs)
    const nfp = nthWeekday(y, m, 5, 1);
    if (nfp) events.push({ date: toStr(nfp), time: '08:30', event: 'Nonfarm Payrolls', impact: 'High', forecast: '', previous: '', actual: '' });

    // CPI — typically 2nd Wednesday of the month (for prior month data)
    const cpi = nthWeekday(y, m, 3, 2);
    if (cpi) events.push({ date: toStr(cpi), time: '08:30', event: 'CPI (Consumer Price Index)', impact: 'High', forecast: '', previous: '', actual: '' });

    // PPI — day after CPI (Thursday), same week
    if (cpi) {
      const ppi = addDays(cpi, 1);
      events.push({ date: toStr(ppi), time: '08:30', event: 'PPI (Producer Price Index)', impact: 'Medium', forecast: '', previous: '', actual: '' });
    }

    // PCE — last Friday of the month
    const pce = lastWeekday(y, m, 5);
    if (pce) events.push({ date: toStr(pce), time: '08:30', event: 'PCE Price Index', impact: 'High', forecast: '', previous: '', actual: '' });

    // Retail Sales — 2nd Wednesday of month
    const retail = nthWeekday(y, m, 3, 2);
    // (same week as CPI, but different day — actually Retail is usually Wed or Thu of the same week)
    if (retail) {
      const retailActual = addDays(retail, -1); // day before CPI ~= Tues, or offset by schedule
      // Only add if different from CPI date
      if (toStr(retailActual) !== toStr(retail)) {
        events.push({ date: toStr(retailActual), time: '08:30', event: 'Retail Sales', impact: 'Medium', forecast: '', previous: '', actual: '' });
      }
    }

    // JOLTS — 2nd Tuesday of month
    const jolts = nthWeekday(y, m, 2, 2);
    if (jolts) events.push({ date: toStr(jolts), time: '10:00', event: 'JOLTS Job Openings', impact: 'Medium', forecast: '', previous: '', actual: '' });

    // Consumer Confidence — last Tuesday of month
    const cc = lastWeekday(y, m, 2);
    if (cc) events.push({ date: toStr(cc), time: '10:00', event: 'Consumer Confidence', impact: 'Medium', forecast: '', previous: '', actual: '' });

    // Initial Jobless Claims — every Thursday
    // Just mark one per month (the 2nd Thursday) to avoid flooding the list
    const claims = nthWeekday(y, m, 4, 2);
    if (claims) events.push({ date: toStr(claims), time: '08:30', event: 'Initial Jobless Claims', impact: 'Medium', forecast: '', previous: '', actual: '' });
  }

  // Filter to this week and next week, deduplicate, sort
  const cutoff = addDays(todayDate, 14); // show 2 weeks ahead
  const filtered = events
    .filter(e => e.date >= todayStr && e.date <= toStr(cutoff))
    .filter((e, i, arr) => arr.findIndex(x => x.date === e.date && x.event === e.event) === i)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  return new Response(JSON.stringify({ source: 'dynamic_fallback', events: filtered }), { headers: corsHeaders });
}
