const iso = d => d.toISOString().slice(0, 10);
const mk = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const obs = d => { const w = d.getUTCDay(); return w === 6 ? new Date(d.getTime() - 864e5) : w === 0 ? new Date(d.getTime() + 864e5) : d; };
const nth = (y, m, wd, n) => { const d = mk(y, m, 1); d.setUTCDate(1 + ((wd - d.getUTCDay() + 7) % 7) + 7 * (n - 1)); return d; };
const last = (y, m, wd) => { const d = new Date(Date.UTC(y, m, 0)); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - wd + 7) % 7)); return d; };
const easter = y => { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d2 = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d2 - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451); return mk(y, Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1); };
const SPECIAL = ['2001-09-11', '2001-09-12', '2001-09-13', '2001-09-14', '2004-06-11', '2007-01-02', '2012-10-29', '2012-10-30', '2018-12-05', '2025-01-09'];

export function nyseHolidays(y) {
  const s = new Set([iso(mk(y, 1, 1).getUTCDay() === 0 ? mk(y, 1, 2) : mk(y, 1, 1)), iso(nth(y, 1, 1, 3)), iso(nth(y, 2, 1, 3)), iso(new Date(easter(y).getTime() - 2 * 864e5)), iso(last(y, 5, 1)), iso(obs(mk(y, 7, 4))), iso(nth(y, 9, 1, 1)), iso(nth(y, 11, 4, 4)), iso(obs(mk(y, 12, 25)))]);
  if (y >= 2022) s.add(iso(obs(mk(y, 6, 19))));
  SPECIAL.forEach(x => { if (x.startsWith(String(y))) s.add(x); });
  return s;
}

export function isTradingDay(d) { const w = d.getUTCDay(); return w !== 0 && w !== 6 && !nyseHolidays(d.getUTCFullYear()).has(iso(d)); }

export function earlyClose(dateIso) {
  const y = Number(dateIso.slice(0, 4));
  const thx = nth(y, 11, 4, 4); const after = iso(new Date(thx.getTime() + 864e5));
  if (dateIso === after) return true;
  if (dateIso === `${y}-12-24` && isTradingDay(mk(y, 12, 24)) && mk(y, 12, 25).getUTCDay() !== 6) return true;
  if (dateIso === `${y}-07-03` && isTradingDay(mk(y, 7, 3)) && mk(y, 7, 4).getUTCDay() >= 1 && mk(y, 7, 4).getUTCDay() <= 5) return true;
  return false;
}

export function etParts(now) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(now).filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, mins: Number(p.hour) * 60 + Number(p.minute) };
}

export function etEpoch(dateIso, mins) {
  const guess = Date.UTC(Number(dateIso.slice(0, 4)), Number(dateIso.slice(5, 7)) - 1, Number(dateIso.slice(8, 10)), Math.floor(mins / 60), mins % 60);
  const p = etParts(new Date(guess));
  const offset = (p.mins - mins) * 60000 + (p.date === dateIso ? 0 : (p.date > dateIso ? 864e5 : -864e5));
  return Math.floor((guess - offset) / 1000);
}

export function lastSession(now) {
  const p = etParts(now);
  let d = new Date(p.date + 'T12:00:00Z');
  if (!isTradingDay(d) || p.mins < 9 * 60 + 30) {
    do { d = new Date(d.getTime() - 864e5); } while (!isTradingDay(d));
  }
  return iso(d);
}
