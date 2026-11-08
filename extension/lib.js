// Shared by the background worker, the popup and the stats page.
// All data lives in chrome.storage.local; nothing leaves the browser.

const FREEDOM = 'https://freedom.to';
const MIN_SESSION_SEC = 120; // started and cancelled right away: ignore
const DEFAULT_SLEEP = /sleep|睡|bedtime/i;

// ---------- storage ----------
// { sessions: {id: session}, kinds: {name: 'focus'|'sleep'|'ignore'}, syncedAt, error }
const store = {
  get: () => chrome.storage.local.get({ sessions: {}, kinds: {}, syncedAt: null, error: null }),
  set: v => chrome.storage.local.set(v),
};

// ---------- sync ----------
// Freedom's website loads Session History from /concluded_sessions (newest first, 10 per page).
// We call it with the user's existing freedom.to login and stop at the first page we already have.
async function syncFreedom() {
  const { sessions } = await store.get();
  let added = 0;
  try {
    for (let page = 1; page <= 200; page++) {
      const r = await fetch(`${FREEDOM}/concluded_sessions?page=${page}`, { headers: { Accept: 'application/json' }, credentials: 'include' });
      if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) throw new Error('login');
      const j = await r.json();
      const list = j.concluded_sessions || [];
      let seen = false;
      for (const s of list) {
        if (sessions[s.id]) seen = true; else added++;
        sessions[s.id] = { id: s.id, name: String(s.name || ''), type: s.type || null, start: s.start_at, end: s.end_at, duration: Number(s.duration) || 0 };
      }
      if (seen || !j.meta?.next_page) break;
    }
    await store.set({ sessions, syncedAt: new Date().toISOString(), error: null });
  } catch (e) {
    await store.set({ error: e.message === 'login' ? 'login' : 'network' });
  }
  return added;
}

// ---------- time helpers ----------
const pad = n => String(n).padStart(2, '0');
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const midnight = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const monday = d => addDays(midnight(d), -((d.getDay() + 6) % 7));

const kindOf = (name, kinds) => kinds[name] || (DEFAULT_SLEEP.test(name) ? 'sleep' : 'focus');

// Sessions ready to chart: real lengths, a kind, and never extending past "now".
function prepare({ sessions, kinds }) {
  return Object.values(sessions)
    .filter(s => s.duration >= MIN_SESSION_SEC)
    .map(s => ({ ...s, startMs: Date.parse(s.start), endMs: Math.min(Date.parse(s.end), Date.now()), kind: kindOf(s.name, kinds) }))
    .filter(s => s.kind !== 'ignore' && s.endMs > s.startMs)
    .sort((a, b) => a.startMs - b.startMs);
}

// Cut a session at local midnights so 23:00–07:00 counts toward both days.
function* pieces(s) {
  for (let a = s.startMs; a < s.endMs;) {
    const b = Math.min(s.endMs, addDays(new Date(a), 1).getTime());
    yield { day: dayKey(new Date(a)), a, b };
    a = b;
  }
}

function minutesByDay(list, kind) {
  const m = new Map();
  for (const s of list) if (s.kind === kind)
    for (const p of pieces(s)) m.set(p.day, (m.get(p.day) || 0) + (p.b - p.a) / 60000);
  return m;
}
const sumDays = (m, from, n) => { let t = 0; for (let i = 0; i < n; i++) t += m.get(dayKey(addDays(from, i))) || 0; return t; };

// The headline numbers, used by both the popup and the stats page.
function summary(list) {
  const focus = minutesByDay(list, 'focus'), sleep = minutesByDay(list, 'sleep');
  const today = midnight(new Date());
  let streak = 0;
  for (let d = (focus.get(dayKey(today)) || 0) >= 30 ? today : addDays(today, -1); (focus.get(dayKey(d)) || 0) >= 30; d = addDays(d, -1)) streak++;
  return {
    focus, sleep,
    today: focus.get(dayKey(today)) || 0,
    last7: sumDays(focus, addDays(today, -6), 7),
    prev7: sumDays(focus, addDays(today, -13), 7),
    streak,
    nights: [...Array(7)].filter((_, i) => (sleep.get(dayKey(addDays(today, -i))) || 0) > 0).length,
    total: [...focus.values()].reduce((a, b) => a + b, 0),
  };
}

const fmtH = min => (min < 60 ? `${Math.round(min)}m` : `${Math.floor(min / 60)}h ${pad(Math.round(min % 60))}m`);
function ago(iso) {
  if (!iso) return 'never';
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
}
