// Stats page: charts the Freedom sessions synced into chrome.storage.local.

const $ = id => document.getElementById(id);
const DAY = 86400000;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const md = d => `${MON[d.getMonth()]} ${d.getDate()}`;
const mdw = d => `${WD[d.getDay()]} ${md(d)}`;
const hm = ms => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kindLabel = { focus: 'Focus', sleep: 'Sleep', ignore: 'Ignored' };

let sessions = [];

// ---------- tooltip ----------
const tip = $('tip');
function bindTip(root, html) {
  root.onmousemove = e => {
    const t = e.target.closest('[data-i]');
    if (!t) return (tip.hidden = true);
    tip.innerHTML = html(t.dataset.i);
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = Math.min(innerWidth - r.width - 8, e.clientX + 14) + 'px';
    tip.style.top = Math.min(innerHeight - r.height - 8, e.clientY + 14) + 'px';
  };
  root.onmouseleave = () => (tip.hidden = true);
}
const ttRow = (kind, label, value) => `<div class="row"><i class="sw ${kind}"></i><span>${label}</span><span>${value}</span></div>`;

// ---------- KPIs ----------
function renderKpis(s) {
  const delta = s.prev7 ? Math.round(((s.last7 - s.prev7) / s.prev7) * 100) : null;
  const first = sessions[0] ? new Date(sessions[0].startMs) : new Date();
  const k = (label, v, unit, d, cls = '') => `<div class="kpi ${cls}"><div class="label">${label}</div><div class="v">${v}<small>${unit}</small></div><div class="d">${d}</div></div>`;
  $('kpis').innerHTML = [
    k('Focus · last 7 days', (s.last7 / 60).toFixed(1), 'h', delta == null ? 'No data the week before' : `${(s.prev7 / 60).toFixed(1)}h the week before · ${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}%`, 'feature'),
    k('Daily average', (s.last7 / 60 / 7).toFixed(1), 'h', 'Over the last 7 days'),
    k('Streak', s.streak, s.streak === 1 ? 'day' : 'days', 'Days with 30+ min of focus'),
    k('Sleep blocks', s.nights, '/ 7 nights', 'Nights with a sleep session'),
    k('Total focus', Math.round(s.total / 60), 'h', `Since ${md(first)}`),
  ].join('');
}

// ---------- 21-day timeline ----------
function renderTimeline() {
  const N = 21, L = 84, W = 1000, RH = 16, G = 6, T = 18;
  const H = T + N * (RH + G);
  const x = h => L + (h / 24) * (W - L - 8);
  const today = midnight(new Date());
  const rows = [...Array(N)].map((_, i) => addDays(today, -i));
  const idx = new Map(rows.map((d, i) => [dayKey(d), i]));
  const items = [];
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Focus and sleep sessions over the last 21 days">`;
  for (let h = 0; h <= 24; h += 3) s += `<line class="grid-line" x1="${x(h)}" x2="${x(h)}" y1="${T - 4}" y2="${H}"/><text x="${x(h)}" y="11" text-anchor="middle">${pad(h)}:00</text>`;
  rows.forEach((d, i) => { s += `<text x="0" y="${T + i * (RH + G) + RH - 4}" class="${i === 0 ? 'strong' : ''}">${i === 0 ? 'Today' : mdw(d)}</text>`; });
  for (const ses of sessions) for (const p of pieces(ses)) {
    const i = idx.get(p.day);
    if (i == null) continue;
    const m0 = midnight(new Date(p.a)).getTime();
    const x0 = x((p.a - m0) / 3600000), x1 = x((p.b - m0) / 3600000);
    items.push(ses);
    s += `<rect class="${ses.kind} hit" data-i="${items.length - 1}" x="${x0}" y="${T + i * (RH + G)}" width="${Math.max(2, x1 - x0 - 1)}" height="${RH}" rx="3"/>`;
  }
  const now = new Date(), nx = x(now.getHours() + now.getMinutes() / 60);
  s += `<line x1="${nx}" x2="${nx}" y1="${T - 2}" y2="${T + RH + 2}" style="stroke:var(--text);stroke-width:2"/>`;
  $('timeline').innerHTML = s + '</svg>';
  bindTip($('timeline'), i => {
    const t = items[i];
    return `<div class="tt-h">${esc(t.name)}</div><div class="row"><span>${mdw(new Date(t.startMs))}, ${hm(t.startMs)}–${hm(t.endMs)}</span></div>${ttRow(t.kind, kindLabel[t.kind], fmtH((t.endMs - t.startMs) / 60000))}`;
  });
}

// ---------- calendar heatmap ----------
function renderCalendar(focus) {
  const today = midnight(new Date());
  const firstMon = monday(sessions[0] ? new Date(sessions[0].startMs) : today);
  const weeks = Math.max(13, Math.min(53, Math.round((monday(today) - firstMon) / (7 * DAY)) + 1));
  const start = addDays(monday(today), -(weeks - 1) * 7);
  const C = 18, G = 4, L = 30, T = 16;
  const W = L + weeks * (C + G) + 24, H = T + 7 * (C + G) + 28;
  const level = m => (m <= 0 ? 0 : m < 60 ? 1 : m < 120 ? 2 : m < 180 ? 3 : m < 240 ? 4 : 5);
  const days = [];
  let s = `<svg viewBox="0 0 ${W} ${H}" style="width:${W}px;max-width:100%" role="img" aria-label="Hours of focus per day">`;
  ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].forEach((t, r) => t && (s += `<text x="0" y="${T + r * (C + G) + C - 4}">${t}</text>`));
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const wd = addDays(start, w * 7);
    if (wd.getMonth() !== lastMonth) { s += `<text x="${L + w * (C + G)}" y="10">${MON[wd.getMonth()]}</text>`; lastMonth = wd.getMonth(); }
    for (let r = 0; r < 7; r++) {
      const d = addDays(start, w * 7 + r);
      if (d > today) continue;
      const m = focus.get(dayKey(d)) || 0;
      days.push([d, m]);
      s += `<rect data-i="${days.length - 1}" class="hit" x="${L + w * (C + G)}" y="${T + r * (C + G)}" width="${C}" height="${C}" rx="3" style="fill:var(--seq-${level(m)})"/>`;
    }
  }
  const ly = T + 7 * (C + G) + 10;
  s += `<text x="${W - 6 * (C + G) - 34}" y="${ly + 12}" text-anchor="end">0</text>`;
  for (let l = 0; l <= 5; l++) s += `<rect x="${W - (6 - l) * (C + G) - 30}" y="${ly}" width="${C}" height="${C}" rx="3" style="fill:var(--seq-${l})"/>`;
  s += `<text x="${W - 26}" y="${ly + 12}">4h+</text>`;
  $('calendar').innerHTML = s + '</svg>';
  bindTip($('calendar'), i => `<div class="tt-h">${mdw(days[i][0])}</div>${ttRow('focus', 'Focus', days[i][1] ? fmtH(days[i][1]) : '—')}`);
}

// ---------- weekly bars ----------
function renderWeekly(focus) {
  const N = 12, W = 480, H = 220, L = 30, B = 22, T = 14;
  const thisMon = monday(new Date());
  const weeks = [...Array(N)].map((_, i) => { const m = addDays(thisMon, -(N - 1 - i) * 7); return [m, sumDays(focus, m, 7) / 60]; });
  const max = Math.max(5, Math.ceil(Math.max(...weeks.map(w => w[1])) / 5) * 5);
  const y = v => T + (1 - v / max) * (H - T - B);
  const bw = (W - L) / N;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Hours of focus per week, last 12 weeks">`;
  for (let v = 0; v <= max; v += max / 5) s += `<line class="grid-line" x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}h</text>`;
  weeks.forEach(([m, h], i) => {
    const x0 = L + i * bw + 3, top = y(h);
    if (h > 0) s += `<path class="focus" d="M${x0},${y(0)} V${top + 4} q0,-4 4,-4 H${x0 + bw - 10} q4,0 4,4 V${y(0)} Z"/>`;
    s += `<rect class="hit" data-i="${i}" x="${L + i * bw}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent" stroke="none"/>`;
    if (i % 2 === 1 || i === N - 1) s += `<text x="${x0 + (bw - 6) / 2}" y="${H - 6}" text-anchor="middle">${md(m)}</text>`;
  });
  const last = weeks[N - 1];
  if (last[1] > 0) s += `<text class="strong" x="${L + (N - 1) * bw + bw / 2}" y="${y(last[1]) - 5}" text-anchor="middle">${last[1].toFixed(1)}</text>`;
  $('weekly').innerHTML = s + '</svg>';
  bindTip($('weekly'), i => `<div class="tt-h">Week of ${md(weeks[i][0])}${+i === N - 1 ? ' (so far)' : ''}</div>${ttRow('focus', 'Focus', weeks[i][1].toFixed(1) + ' h')}`);
}

// ---------- by session name ----------
function renderByName() {
  const m = new Map();
  for (const s of sessions) {
    const e = m.get(s.name) || { name: s.name, kind: s.kind, min: 0, n: 0 };
    e.min += (s.endMs - s.startMs) / 60000; e.n++;
    m.set(s.name, e);
  }
  const rows = [...m.values()].sort((a, b) => (a.kind === b.kind ? b.min - a.min : a.kind === 'focus' ? -1 : 1));
  if (!rows.length) return ($('byName').innerHTML = '<div class="empty">No sessions yet</div>');
  const W = 480, L = 150, RH = 22, G = 10, H = rows.length * (RH + G);
  const max = Math.max(...rows.map(r => r.min), 1);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Total time per Freedom session name">`;
  rows.forEach((r, i) => {
    const y = i * (RH + G), w = Math.max(3, ((W - L - 80) * r.min) / max);
    s += `<text x="0" y="${y + 15}" class="strong">${esc(r.name.length > 20 ? r.name.slice(0, 19) + '…' : r.name)}</text>`;
    s += `<rect class="${r.kind} hit" data-i="${i}" x="${L}" y="${y}" width="${w}" height="${RH}" rx="4"/>`;
    s += `<text x="${L + w + 6}" y="${y + 15}">${(r.min / 60).toFixed(1)}h · ${r.n}×</text>`;
  });
  $('byName').innerHTML = s + '</svg>';
  bindTip($('byName'), i => `<div class="tt-h">${esc(rows[i].name)}</div>${ttRow(rows[i].kind, `${kindLabel[rows[i].kind]} · ${rows[i].n} sessions`, fmtH(rows[i].min))}<div class="row"><span>Average</span><span>${fmtH(rows[i].min / rows[i].n)}</span></div>`);
}

// ---------- session types ----------
function renderKinds(data) {
  const counts = new Map();
  for (const s of Object.values(data.sessions)) counts.set(s.name, (counts.get(s.name) || 0) + 1);
  const names = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a));
  if (!names.length) return ($('kinds').innerHTML = '<div class="empty">Your Freedom session names will appear here after the first sync.</div>');
  $('kinds').innerHTML = names.map(n => {
    const k = kindOf(n, data.kinds);
    return `<div class="kind-row"><span class="n" title="${esc(n)}">${esc(n)}<span class="c">${counts.get(n)}×</span></span>
      <span class="seg">${['focus', 'sleep', 'ignore'].map(v => `<button data-name="${esc(n)}" data-kind="${v}" class="${k === v ? 'on' : ''}">${kindLabel[v].replace('Ignored', 'Ignore')}</button>`).join('')}</span></div>`;
  }).join('');
  $('kinds').onclick = async e => {
    const b = e.target.closest('button[data-kind]');
    if (!b) return;
    const { kinds } = await store.get();
    kinds[b.dataset.name] = b.dataset.kind;
    await store.set({ kinds });
  };
}

function renderBanner(data) {
  const b = $('banner');
  b.hidden = !data.error && !!data.syncedAt;
  b.innerHTML = data.error === 'login' ? 'You’re not signed in to Freedom. <a href="https://freedom.to/log-in" target="_blank">Sign in at freedom.to</a> and your sessions will sync.'
    : data.error ? 'Couldn’t reach freedom.to. Flow Observer will try again within the hour.'
    : 'Syncing your Freedom history for the first time…';
}

async function render() {
  const data = await store.get();
  sessions = prepare(data);
  $('sync').textContent = data.syncedAt ? `${Object.keys(data.sessions).length} sessions · synced ${ago(data.syncedAt)}` : 'Not synced yet';
  renderBanner(data);
  const s = summary(sessions);
  renderKpis(s);
  renderTimeline();
  renderCalendar(s.focus);
  renderWeekly(s.focus);
  renderByName();
  renderKinds(data);
}

// Faint topographic lines behind the hero: stacked sine waves, generated once.
$('contours').innerHTML = [...Array(16)].map((_, i) => {
  const y0 = 40 + i * 24, a = 18 + (i % 5) * 6, ph = i * 0.7;
  let d = `M0,${y0}`;
  for (let x = 0; x <= 1200; x += 40) d += ` L${x},${(y0 + a * Math.sin(x / 190 + ph) + 10 * Math.sin(x / 70 + ph * 2)).toFixed(1)}`;
  return `<path d="${d}"/>`;
}).join('');

$('syncNow').onclick = async () => { $('sync').textContent = 'Syncing…'; await chrome.runtime.sendMessage('sync'); render(); };
chrome.storage.onChanged.addListener(render); // re-draw after a sync or a type change
render();
setInterval(render, 60000);
