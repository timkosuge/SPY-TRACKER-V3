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
