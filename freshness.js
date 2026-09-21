(function () {
  const PAYLOADS = [
    ['Analog', typeof ANALOG_DATA !== 'undefined' ? ANALOG_DATA : null],
    ['Gap stats', typeof GAP_STATS !== 'undefined' ? GAP_STATS : null],
    ['Window stats', typeof WINDOW_STATS !== 'undefined' ? WINDOW_STATS : null],
    ['Time of day', typeof TOD_STATS !== 'undefined' ? TOD_STATS : null],
    ['Declines', typeof DECLINE_DATA !== 'undefined' ? DECLINE_DATA : null],
    ['Relief', typeof RELIEF_DATA !== 'undefined' ? RELIEF_DATA : null],
    ['Large gaps', typeof LARGE_GAP_STATS !== 'undefined' ? LARGE_GAP_STATS : null],
    ['Releases', typeof RELEASE_DATA !== 'undefined' ? RELEASE_DATA : null],
    ['Edge stats', typeof ES_DATA !== 'undefined' ? ES_DATA : null],
    ['Session volume', typeof SESSION_VOL_PROFILE !== 'undefined' ? SESSION_VOL_PROFILE : null],
    ['Intraday volume', typeof INTRADAY_VOL_PROFILE !== 'undefined' ? INTRADAY_VOL_PROFILE : null],
    ['Intraday vol stats', typeof INTRADAY_VOL_STATS !== 'undefined' ? INTRADAY_VOL_STATS : null],
  ];
  function fmt(iso) {
    if (!iso) return '—';
    const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  function render() {
    const el = document.getElementById('freshnessBar');
    if (!el) return;
    const stamped = PAYLOADS.filter(([, p]) => p && p.source_max_date);
    if (!stamped.length) { el.textContent = ''; return; }
    const dates = stamped.map(([, p]) => p.source_max_date);
    const newest = dates.slice().sort().pop();
    const behind = stamped.filter(([, p]) => p.source_max_date < newest).map(([n, p]) => `${n} (${fmt(p.source_max_date)})`);
    const gen = stamped.map(([, p]) => p.generated).filter(Boolean).sort().pop();
    let text = `Data through ${fmt(newest)}`;
    const md = window._md; if (md && md.updated) { const u = new Date(md.updated); text += ` · quotes ${isNaN(u) ? md.updated : u.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) + ' CT'}`; }
    if (gen) text += ` · built ${new Date(gen).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} CT`;
    el.style.color = behind.length ? '#ff8800' : 'var(--text3)';
    el.textContent = behind.length ? `${text} · behind: ${behind.join(', ')}` : text;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
  setTimeout(render, 4000);
})();
