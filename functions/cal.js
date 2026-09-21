import { etParts } from './_nyse.js';

const FEED = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

export function toEvents(feed) {
  return (Array.isArray(feed) ? feed : [])
    .filter(e => e && e.country === 'USD' && e.date)
    .map(e => {
      const p = etParts(new Date(e.date));
      const hh = String(Math.floor(p.mins / 60)).padStart(2, '0'), mm = String(p.mins % 60).padStart(2, '0');
      return { date: p.date, time: `${hh}:${mm}`, event: e.title || '', impact: e.impact || 'Low', forecast: e.forecast || '', previous: e.previous || '', actual: e.actual || '' };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

export async function onRequestGet() {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' };
  let error;
  try {
    const r = await fetch(FEED, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
    if (r.ok) {
      const events = toEvents(await r.json());
      if (events.length) return new Response(JSON.stringify({ source: 'forexfactory', time_zone: 'America/New_York', events }), { headers });
      error = 'the feed returned no US events';
    } else {
      error = `the feed answered HTTP ${r.status}`;
    }
  } catch (e) {
    error = `the feed could not be reached: ${e.message}`;
  }
  return new Response(JSON.stringify({ source: 'unavailable', time_zone: 'America/New_York', events: [], error }), { headers: { ...headers, 'Cache-Control': 'no-store' } });
}
