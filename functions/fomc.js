const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function parseFedCalendar(html) {
  const out = [];
  const yearRe = /<h4><a id="\d+">(\d{4}) FOMC Meetings<\/a><\/h4>([\s\S]*?)(?=<h4><a id="\d+">\d{4} FOMC Meetings|$)/g;
  let y;
  while ((y = yearRe.exec(html)) !== null) {
    const year = Number(y[1]);
    const rowRe = /fomc-meeting__month[^>]*><strong>([\s\S]*?)<\/strong>[\s\S]*?fomc-meeting__date[^>]*>([\s\S]*?)</g;
    let r;
    while ((r = rowRe.exec(y[2])) !== null) {
      const monthText = r[1].replace(/<[^>]+>/g, '').trim();
      const dayText = r[2].replace(/<[^>]+>/g, '').trim();
      const monthName = monthText.split('/').pop().trim();
      const month = MONTHS.indexOf(monthName) + 1;
      const days = dayText.replace('*', '').split('-').map(s => parseInt(s, 10)).filter(n => !isNaN(n));
      if (!month || !days.length) continue;
      const day = days[days.length - 1];
      out.push({ date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, display: `${MONTHS[month - 1]} ${day}, ${year}`, projections: dayText.includes('*') });
    }
  }
  return out;
}

export async function onRequestGet(context) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' };
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
  try {
    const r = await fetch('https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', { headers: { 'User-Agent': 'Mozilla/5.0' }, cf: { cacheTtl: 3600 } });
    if (r.ok) {
      const meetings = parseFedCalendar(await r.text()).filter(m => m.date >= today).sort((a, b) => a.date.localeCompare(b.date));
      if (meetings.length) return new Response(JSON.stringify({ source: 'federalreserve.gov', meetings }), { headers });
    }
  } catch (e) {}
  try {
    const base = new URL(context.request.url).origin;
    const r = await fetch(`${base}/release_dates/fomc_dates.csv`);
    if (r.ok) {
      const meetings = (await r.text()).split('\n').map(l => l.trim().split(',')[0]).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= today).sort()
        .map(d => ({ date: d, display: new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) }));
      if (meetings.length) return new Response(JSON.stringify({ source: 'release_dates/fomc_dates.csv', meetings }), { headers });
    }
  } catch (e) {}
  return new Response(JSON.stringify({ source: 'none', meetings: [], error: 'No FOMC schedule available' }), { headers, status: 503 });
}
