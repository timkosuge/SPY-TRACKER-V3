const fmt=(n,d=2)=>n==null||isNaN(n)?'—':Number(n).toFixed(d);
const fmtK=n=>n==null||isNaN(n)?'—':(n<0?'-':'')+(Math.abs(n)>=1e9?(Math.abs(n)/1e9).toFixed(1)+'B':Math.abs(n)>=1e6?(Math.abs(n)/1e6).toFixed(1)+'M':Math.abs(n)>=1e3?(Math.abs(n)/1e3).toFixed(0)+'K':String(Math.round(Math.abs(n))));
const fmtPct=(n,d=2)=>n==null||isNaN(n)?'—':(n>0?'+':'')+Number(n).toFixed(d)+'%';
const fmtDate=(iso,style)=>{ if(!iso||!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso||'—'; const d=new Date(iso.slice(0,10)+'T12:00:00Z'); return d.toLocaleDateString('en-US', style==='short'?{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}:{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}); };
const labelEnum=v=>v==null||v===''?'—':String(v).split('_').map(w=>w?w[0].toUpperCase()+w.slice(1).toLowerCase():w).join(' ');
const etToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date());
const clr=n=>n>0?'up':n<0?'dn':'neu';
const sign=n=>n>0?'+':'';
const fmt12=t=>{if(!t||!t.includes(':'))return t||'—';const[h,m]=t.split(':').map(Number);const ampm=h>=12?'PM':'AM';const h12=h%12||12;return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;};
function wilson95(k, n) {
  if (!n) return null;
  const z = 1.96, p = k / n, d = 1 + z*z/n, c = p + z*z/(2*n), r = z * Math.sqrt(p*(1-p)/n + z*z/(4*n*n));
  return { lo: Math.max(0, (c - r) / d) * 100, hi: Math.min(1, (c + r) / d) * 100 };
}
const payloadRows=v=>v==null?[]:(Array.isArray(v)?v:(v.records||[]));
const $=id=>document.getElementById(id);
const _liveIds = {};
function liveEmbedSrc(channel, params) {
  const q = params ? '?' + params : '';
  const fallback = 'https://www.youtube.com/embed/live_stream?channel=' + channel + (params ? '&' + params : '');
  if (!_liveIds[channel]) {
    _liveIds[channel] = fetch('/ytlive?channel=' + encodeURIComponent(channel))
      .then(r => r.ok ? r.json() : null).then(d => (d && d.videoId) || null).catch(() => null);
  }
  return _liveIds[channel].then(id => id ? 'https://www.youtube.com/embed/' + id + q : fallback);
}
function mountLiveEmbeds(root) {
  (root || document).querySelectorAll('iframe[data-live-channel]').forEach(f => {
    liveEmbedSrc(f.dataset.liveChannel, f.dataset.embedParams || '').then(src => { if (f.getAttribute('src') !== src) f.setAttribute('src', src); });
  });
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mountLiveEmbeds());
  else mountLiveEmbeds();
}
function evidenceFold(key, label, body) {
  window._folds = window._folds || {};
  return '<details class="evidence-fold"' + (window._folds[key] ? ' open' : '') + ' ontoggle="window._folds=window._folds||{};window._folds[\'' + key + '\']=this.open" style="margin-top:4px;">'
    + '<summary style="cursor:pointer;list-style:none;font-family:\'Orbitron\',monospace;font-size:9px;letter-spacing:2px;color:var(--cyan);padding:10px 14px;border:1px solid var(--border);border-radius:4px;background:var(--bg3);margin-bottom:12px;">\u25B8 ' + label + '</summary>'
    + body + '</details>';
}
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function monthWords(m) { return m ? MONTH_NAMES[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4) : ''; }
function panelWidth(id, fallback) {
  const el = typeof document !== 'undefined' && document.getElementById ? document.getElementById(id) : null;
  return el && el.clientWidth ? el.clientWidth - 28 : (fallback || 600);
}
function monthlyChart(o) {
  const pts = (o.series || []).filter(r => r[1] != null);
  if (pts.length < 2) return '';
  const W = Math.max(320, Math.round(o.width || 600)), H = o.height || 150, L = 6, R = 64, T = 12, B = 22;
  const cW = W - L - R, cH = H - T - B;
  const vals = pts.map(r => r[1]);
  const refs = (o.refs || []).filter(r => r >= Math.min(...vals) && r <= Math.max(...vals));
  const lo = o.floor != null ? o.floor : Math.min(...vals), hi = Math.max(...vals);
  const x = i => L + i / (pts.length - 1) * cW;
  const y = v => T + cH - (v - lo) / ((hi - lo) || 1) * cH;
  const fmt = o.format || (v => String(Math.round(v)));
  const col = o.color || 'var(--cyan)';
  const text = (xx, yy, s, anchor, fill) => `<text x="${xx.toFixed(1)}" y="${yy.toFixed(1)}" text-anchor="${anchor}" font-size="11" fill="${fill || 'var(--text3)'}" font-family="Share Tech Mono,monospace">${s}</text>`;
  const line = pts.map((r, i) => `${x(i).toFixed(1)},${y(r[1]).toFixed(1)}`).join(' ');
  let g = `<polygon points="${x(0).toFixed(1)},${T + cH} ${line} ${x(pts.length - 1).toFixed(1)},${T + cH}" fill="${col}" opacity="0.1"/>`;
  refs.forEach(v => { g += `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="rgba(255,255,255,0.25)" stroke-dasharray="4,3"/>` + text(W - R + 6, y(v) + 4, fmt(v), 'start'); });
  [lo, hi].forEach(v => { g += text(W - R + 6, y(v) + 4, fmt(v), 'start'); });
  g += `<polyline points="${line}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="round"/>`;
  if (o.mark) {
    const k = pts.findIndex(r => r[0] === o.mark.month);
    if (k >= 0) g += `<circle cx="${x(k).toFixed(1)}" cy="${y(pts[k][1]).toFixed(1)}" r="3.5" fill="#ff3355"/>` + text(Math.min(x(k), W - R - 4), y(pts[k][1]) - 7 < T + 8 ? y(pts[k][1]) + 16 : y(pts[k][1]) - 7, o.mark.label, x(k) > W - R - 120 ? 'end' : 'middle', '#ff3355');
  }
  g += `<circle cx="${x(pts.length - 1).toFixed(1)}" cy="${y(vals[vals.length - 1]).toFixed(1)}" r="3.5" fill="${col}"/>`;
  const ticks = Math.min(6, pts.length);
  for (let k = 0; k < ticks; k++) {
    const i = Math.round(k * (pts.length - 1) / (ticks - 1));
    const m = pts[i][0];
    g += text(x(i), H - 6, MONTH_NAMES[+m.slice(5, 7) - 1].slice(0, 3) + ' ' + m.slice(0, 4), k === 0 ? 'start' : k === ticks - 1 ? 'end' : 'middle');
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="max-width:100%;height:auto;display:block;margin-top:8px;">${g}</svg>`;
}
function shortDateLabel(d) {
  if (!d) return '';
  const s = String(d);
  const m = MONTH_NAMES[+s.slice(5, 7) - 1];
  if (!m) return s;
  return s.length >= 10 ? `${m.slice(0, 3)} ${+s.slice(8, 10)}, ${s.slice(0, 4)}` : `${m.slice(0, 3)} ${s.slice(0, 4)}`;
}
function stretchChart(o) {
  const pts = (o.series || []).filter(r => r[1] != null);
  if (pts.length < 2) return '';
  const H = o.height || 80, VW = 1000, P = 4;
  const vals = pts.map(r => r[1]);
  const extra = (o.extra || []).map(e => ({ color: e.color, values: e.values.slice(0, pts.length) }));
  const every = vals.concat(...extra.map(e => e.values.filter(v => v != null)));
  const min = Math.min(...every), max = Math.max(...every);
  const range = max - min || Math.abs(min) * 0.1 || 1;
  const x = i => i / (pts.length - 1) * VW;
  const y = v => P + (1 - (v - min) / range) * (H - 2 * P);
  const col = o.color || 'var(--cyan)';
  const path = values => values.map((v, i) => v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`).filter(Boolean).join(' ');
  const line = path(vals);
  const dot = (values, c) => { const k = values.map(v => v != null).lastIndexOf(true); return k < 0 ? '' : `<span style="position:absolute;left:${(x(k) / VW * 100).toFixed(2)}%;top:${(y(values[k]) / H * 100).toFixed(1)}%;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:${c};"></span>`; };
  const svg = `<svg viewBox="0 0 ${VW} ${H}" preserveAspectRatio="none" style="display:block;width:100%;height:${H}px;">
      ${o.fill === false ? '' : `<polygon points="0,${H} ${line} ${VW},${H}" fill="${col}" opacity="0.14"/>`}
      <polyline points="${line}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      ${extra.map(e => `<polyline points="${path(e.values)}" fill="none" stroke="${e.color}" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`).join('')}
    </svg>${dot(vals, col)}${extra.map(e => dot(e.values, e.color)).join('')}`;
  if (!o.labels) return `<div style="position:relative;margin-top:${o.gap != null ? o.gap : 6}px;">${svg}</div>`;
  const fmt = o.format || (v => v.toFixed(1));
  const label = 'font-family:Share Tech Mono,monospace;font-size:11px;color:var(--text3);';
  const mid = Math.floor((pts.length - 1) / 2);
  return `<div style="display:grid;grid-template-columns:1fr auto;column-gap:8px;margin-top:10px;">
    <div style="position:relative;">${svg}</div>
    <div style="display:flex;flex-direction:column;justify-content:space-between;height:${H}px;${label}"><span>${fmt(max)}</span><span>${fmt((min + max) / 2)}</span><span>${fmt(min)}</span></div>
    <div style="display:flex;justify-content:space-between;margin-top:3px;${label}"><span>${shortDateLabel(pts[0][0])}</span><span>${shortDateLabel(pts[mid][0])}</span><span>${shortDateLabel(pts[pts.length - 1][0])}</span></div>
  </div>`;
}
function periodLabel(d, freq) {
  if (!d) return '';
  const s = String(d), m = +s.slice(5, 7);
  if (!m) return s;
  if (/quarter/i.test(freq || '')) return `Q${Math.floor((m - 1) / 3) + 1} ${s.slice(0, 4)}`;
  if (/month/i.test(freq || '') || s.length < 10) return `${MONTH_NAMES[m - 1]} ${s.slice(0, 4)}`;
  return `${MONTH_NAMES[m - 1]} ${+s.slice(8, 10)}, ${s.slice(0, 4)}`;
}
