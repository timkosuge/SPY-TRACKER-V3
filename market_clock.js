(function () {
  const iso = d => d.toISOString().slice(0, 10);
  const mk = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
  const obs = d => { const w = d.getUTCDay(); return w === 6 ? new Date(d.getTime() - 864e5) : w === 0 ? new Date(d.getTime() + 864e5) : d; };
  const nth = (y, m, wd, n) => { const d = mk(y, m, 1); d.setUTCDate(1 + ((wd - d.getUTCDay() + 7) % 7) + 7 * (n - 1)); return d; };
  const last = (y, m, wd) => { const d = new Date(Date.UTC(y, m, 0)); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - wd + 7) % 7)); return d; };
  const easter = y => { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d2 = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d2 - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451); return mk(y, Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1); };
  const SPECIAL = { '2001-09-11': 'Closure', '2001-09-12': 'Closure', '2001-09-13': 'Closure', '2001-09-14': 'Closure', '2004-06-11': 'National Day of Mourning', '2007-01-02': 'National Day of Mourning', '2012-10-29': 'Hurricane Sandy', '2012-10-30': 'Hurricane Sandy', '2018-12-05': 'National Day of Mourning', '2025-01-09': 'National Day of Mourning' };
  const cache = {};
  function nyseHolidayMap(y) {
    if (cache[y]) return cache[y];
    const m = {};
    m[iso(mk(y, 1, 1).getUTCDay() === 0 ? mk(y, 1, 2) : mk(y, 1, 1))] = "New Year's Day";
    m[iso(nth(y, 1, 1, 3))] = 'Martin Luther King Jr. Day';
    m[iso(nth(y, 2, 1, 3))] = "Presidents' Day";
    m[iso(new Date(easter(y).getTime() - 2 * 864e5))] = 'Good Friday';
    m[iso(last(y, 5, 1))] = 'Memorial Day';
    if (y >= 2022) m[iso(obs(mk(y, 6, 19)))] = 'Juneteenth';
    m[iso(obs(mk(y, 7, 4)))] = 'Independence Day';
    m[iso(nth(y, 9, 1, 1))] = 'Labor Day';
    m[iso(nth(y, 11, 4, 4))] = 'Thanksgiving Day';
    m[iso(obs(mk(y, 12, 25)))] = 'Christmas Day';
    Object.keys(SPECIAL).forEach(k => { if (k.startsWith(String(y))) m[k] = SPECIAL[k]; });
    cache[y] = m; return m;
  }
  function nyseHolidays(y) { return new Set(Object.keys(nyseHolidayMap(y))); }
  function isTradingDay(d) { const w = d.getUTCDay(); return w !== 0 && w !== 6 && !nyseHolidays(d.getUTCFullYear()).has(iso(d)); }
  function earlyCloseMap(y) {
    const m = {};
    const thx = nth(y, 11, 4, 4); const after = new Date(thx.getTime() + 864e5); m[iso(after)] = 'Day after Thanksgiving';
    const xmasEve = mk(y, 12, 24); if (isTradingDay(xmasEve) && mk(y, 12, 25).getUTCDay() !== 6) m[iso(xmasEve)] = 'Christmas Eve';
    const jul3 = mk(y, 7, 3); if (isTradingDay(jul3) && mk(y, 7, 4).getUTCDay() >= 1 && mk(y, 7, 4).getUTCDay() <= 5) m[iso(jul3)] = 'Day before Independence Day';
    return m;
  }
  function etParts(now) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' }).formatToParts(now).filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, mins: Number(p.hour) * 60 + Number(p.minute), secs: Number(p.second), weekday: p.weekday };
  }
  function nyseSession(now) {
    now = now || new Date();
    const et = etParts(now);
    const d = new Date(et.date + 'T12:00:00Z');
    const y = d.getUTCFullYear();
    const holiday = nyseHolidayMap(y)[et.date] || null;
    const weekend = et.weekday === 'Sat' || et.weekday === 'Sun';
    const trading = !weekend && !holiday;
    const early = trading ? (earlyCloseMap(y)[et.date] || null) : null;
    const closeMins = early ? 13 * 60 : 16 * 60;
    const openMins = 9 * 60 + 30;
    let state;
    if (!trading) state = weekend ? 'weekend' : 'holiday';
    else if (et.mins < 4 * 60) state = 'overnight';
    else if (et.mins < openMins) state = 'pre';
    else if (et.mins < closeMins) state = 'open';
    else if (et.mins < 20 * 60) state = 'after';
    else state = 'overnight';
    let next = new Date(d);
    if (!(trading && et.mins < openMins)) { do { next = new Date(next.getTime() + 864e5); } while (!isTradingDay(next)); }
    const nextOpenDate = iso(next);
    const secsToOpen = state === 'pre' ? (openMins - et.mins) * 60 - et.secs : null;
    const secsToClose = state === 'open' ? (closeMins - et.mins) * 60 - et.secs : null;
    return { etDate: et.date, etMins: et.mins, etSecs: et.secs, weekday: et.weekday, isTradingDay: trading, holiday, earlyClose: early, openMins, closeMins, state, secsToOpen, secsToClose, nextOpenDate };
  }
  function upcomingClosures(now, n) {
    const et = etParts(now || new Date());
    const y = Number(et.date.slice(0, 4));
    const out = [];
    for (const yy of [y, y + 1]) {
      const hm = nyseHolidayMap(yy), em = earlyCloseMap(yy);
      Object.keys(hm).forEach(k => out.push({ date: k, name: hm[k], full: true }));
      Object.keys(em).forEach(k => out.push({ date: k, name: em[k] + ' · closes 1:00 PM ET', full: false }));
    }
    return out.filter(x => x.date >= et.date).sort((a, b) => a.date.localeCompare(b.date)).slice(0, n || 4);
  }
  function zoneClock(now, tz, withSeconds, withZone) {
    return now.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', ...(withSeconds ? { second: '2-digit' } : {}), hour12: false, ...(withZone ? { timeZoneName: 'short' } : {}) });
  }
  function zoneMinutes(now, tz) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', weekday: 'short' }).formatToParts(now).filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
    return { mins: Number(p.hour) * 60 + Number(p.minute), weekday: p.weekday };
  }
  window.nyseHolidays = nyseHolidays; window.nyseHolidayMap = nyseHolidayMap; window.isTradingDay = isTradingDay;
  window.nyseSession = nyseSession; window.upcomingClosures = upcomingClosures; window.zoneClock = zoneClock; window.zoneMinutes = zoneMinutes; window.nyseEarlyCloses = earlyCloseMap;
})();
