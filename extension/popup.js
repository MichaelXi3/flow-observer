const $ = id => document.getElementById(id);
$('ver').textContent = 'v' + chrome.runtime.getManifest().version;

const hours = min => (min < 60 ? `${Math.round(min)} minutes` : `${(min / 60).toFixed(1).replace(/\.0$/, '')} hours`);

// Seven-day focus line, newest point marked with its value.
function spark(focus) {
  const today = midnight(new Date());
  const days = [...Array(7)].map((_, i) => addDays(today, i - 6));
  const vals = days.map(d => (focus.get(dayKey(d)) || 0) / 60);
  const W = 300, H = 92, T = 22, B = 16, L = 6, R = 6;
  const max = Math.max(1, ...vals);
  const x = i => L + (i * (W - L - R)) / 6, y = v => T + (1 - v / max) * (H - T - B);
  const pts = vals.map((v, i) => [x(i), y(v)]);
  // Smooth curve through the points (Catmull–Rom → cubic Bézier).
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < 6; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const cy = v => Math.min(y(0), Math.max(T, v));
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${cy(p1[1] + (p2[1] - p0[1]) / 6)} ${p2[0] - (p3[0] - p1[0]) / 6},${cy(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]},${p2[1]}`;
  }
  const [lx, ly] = pts[6], label = `${vals[6].toFixed(1)}h`, cw = label.length * 6.4 + 10;
  const wd = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  $('spark').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Focus hours for each of the last 7 days">
    <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#14805c" stop-opacity=".18"/><stop offset="1" stop-color="#14805c" stop-opacity="0"/></linearGradient></defs>
    <line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" style="stroke:var(--grid)"/>
    <path d="${d} L${lx},${y(0)} L${L},${y(0)} Z" fill="url(#g)"/>
    <path d="${d}" fill="none" style="stroke:var(--ink)" stroke-width="2" stroke-linecap="round"/>
    <circle cx="${lx}" cy="${ly}" r="4.5" style="fill:var(--paper);stroke:var(--ink)" stroke-width="2"/>
    <g class="chip"><rect x="${Math.min(lx - cw / 2, W - cw)}" y="${ly - 22}" width="${cw}" height="15" rx="3"/><text x="${Math.min(lx, W - cw / 2)}" y="${ly - 11.5}" text-anchor="middle">${label}</text></g>
    ${days.map((dd, i) => `<text x="${x(i)}" y="${H - 2}" text-anchor="${i === 0 ? 'start' : i === 6 ? 'end' : 'middle'}"${i === 6 ? ' style="fill:var(--ink)"' : ''}>${wd[dd.getDay()]}</text>`).join('')}
  </svg>`;
}

async function render() {
  const data = await store.get();
  const list = prepare(data);
  const s = summary(list);
  const h = new Date().getHours();
  $('hello').textContent = h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  $('headline').textContent = s.today ? `${hours(s.today)} of focus today.` : 'No focus yet today.';

  $('pill').classList.toggle('warn', !!data.error);
  $('pillText').textContent = data.error === 'login' ? 'Signed out' : data.error ? 'Sync failed' : data.syncedAt ? `Synced ${ago(data.syncedAt).replace(' min', 'm').replace(' h', 'h').replace(' d', 'd')}` : 'Syncing';
  $('msg').textContent = data.error === 'login' ? 'Sign in at freedom.to so your sessions can sync.'
    : data.error ? 'Couldn’t reach freedom.to. It will retry within the hour.'
    : !list.length && data.syncedAt ? 'No sessions yet. Start one in Freedom and it shows up here.' : '';
  $('msg').hidden = !$('msg').textContent;

  $('week').textContent = `${(s.last7 / 60).toFixed(1)}h`;
  const delta = s.prev7 ? Math.round(((s.last7 - s.prev7) / s.prev7) * 100) : null;
  $('delta').hidden = delta == null;
  if (delta != null) { $('delta').className = `delta ${delta >= 0 ? 'up' : 'down'}`; $('delta').textContent = `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}%`; }
  $('streak').textContent = `${s.streak}-day streak`;
  spark(s.focus);
}

async function sync() {
  $('pillText').textContent = 'Syncing';
  await chrome.runtime.sendMessage('sync');
  render();
}

$('viewStats').onclick = () => { chrome.tabs.create({ url: 'stats.html' }); window.close(); };
$('goDashboard').onclick = () => { chrome.tabs.create({ url: 'https://freedom.to/dashboard' }); window.close(); };
$('syncNow').onclick = sync;

render().then(async () => {
  const { syncedAt, error } = await store.get();
  if (error || !syncedAt || Date.now() - Date.parse(syncedAt) > 10 * 60000) sync();
});
