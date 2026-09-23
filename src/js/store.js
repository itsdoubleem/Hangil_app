// Everything the app remembers. It lives in this browser's localStorage and
// nowhere else — there is no server to send it to.

import { today, addDays, daysBetween } from './util.js';

const KEY = 'hangil.v1';

const FRESH = {
  lang: 'en',
  theme: 'auto',
  rate: 1,             // speech speed — see the migration note below
  rom: true,           // show romanization
  webVoice: '',        // a browser voice picked in Settings, by voiceURI; '' = the best on-device one
  trade: '',           // the 업종 chosen in Settings, or '' for none. Optional on
                       // purpose: only manufacturing applicants get job-related
                       // questions, so the app must work with no trade set.
  done: {},            // unitId -> { at, score } — the course units only
  letters: {},         // alphabet lessonId -> { at, score }
  drills: {},          // exam drillId -> { at, best, total } — the paper's question types
  srs: {},             // itemKey -> { due, ivl, ease, reps, lapses }
  seen: {},            // vocab set / letter group -> at
  streak: { last: null, count: 0, best: 0 },
  answered: { right: 0, wrong: 0 },
  tags: {},            // tagId -> { right, wrong } — what you are good and bad at
  mocks: [],           // { id, at, score, max, listening, reading }
  last: null,          // last route, for "carry on"
};

let state = load();

// The first version shipped at 0.85, on the theory that slower is easier to
// follow. It is not: slowing a neural voice smears it, and it was the single
// biggest reason the Korean sounded synthetic. Anyone still sitting on that
// exact old default gets moved to 1; a rate they chose themselves is left alone.
if (state.rate === 0.85) { state.rate = 1; }

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(FRESH);
    return Object.assign(structuredClone(FRESH), JSON.parse(raw));
  } catch { return structuredClone(FRESH); }
}

let pending = 0;
function write() {
  clearTimeout(pending); pending = 0;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
function save() {
  clearTimeout(pending);
  pending = setTimeout(write, 120);
}
// An answer given in the last 120ms before the app is swiped away would
// otherwise never be written. Going to the background is the moment to flush.
document.addEventListener('visibilitychange', () => { if (document.hidden && pending) write(); });
window.addEventListener('pagehide', () => { if (pending) write(); });

// Every due date written before `dates: 2` came out of an addDays() that worked
// in UTC, and east of Greenwich that landed each one a day early — an item meant
// for tomorrow was due the same day. Push them back to where they were meant to
// be, once. West of Greenwich the old arithmetic happened to be right, so
// nothing moves there. Items missed on the day (ivl 0) were never scheduled
// forward and stay as they are.
if (!state.dates) {
  if (new Date().getTimezoneOffset() < 0) {
    for (const it of Object.values(state.srs)) {
      if (it && it.ivl > 0 && it.due) it.due = addDays(it.due, 1);
    }
  }
  state.dates = 2;
  save();
}

export const get = () => state;
export function set(patch) { Object.assign(state, patch); save(); }

export function touchDay() {
  const t = today(), s = state.streak;
  if (s.last === t) return;
  s.count = s.last && daysBetween(s.last, t) === 1 ? s.count + 1 : 1;
  s.best = Math.max(s.best || 0, s.count);
  s.last = t;
  save();
}

export function markLesson(id, score) {
  state.done[id] = { at: today(), score };
  touchDay();
  save();
}

export function markLetters(id, score) {
  state.letters[id] = { at: today(), score };
  touchDay();
  save();
}

// The best first-attempt score on each exam drill, so the exam screen can show
// which of the paper's question types still needs work.
export function recordDrill(id, right, total) {
  const prev = state.drills[id];
  state.drills[id] = { at: today(), total, best: Math.max(right, prev ? prev.best : 0) };
  save();
}

export function markSeen(id) { state.seen[id] = today(); touchDay(); save(); }

export function setLast(route, label) { state.last = { route, label }; save(); }

/* ---- spaced repetition -------------------------------------------------
   A short SM-2. Get it right and the gap widens; get it wrong and the item
   comes back today with its gap reset. Nothing here is clever — the value is
   that a thing you missed in unit 3 will find you again in unit 11.        */

export function schedule(key, right) {
  const t = today();
  const it = state.srs[key] || { due: t, ivl: 0, ease: 2.4, reps: 0, lapses: 0 };
  if (right) {
    it.reps += 1;
    it.ivl = it.reps === 1 ? 1 : it.reps === 2 ? 3 : Math.min(180, Math.round(it.ivl * it.ease));
    it.ease = Math.min(2.8, it.ease + 0.05);
    it.due = addDays(t, it.ivl);
    state.answered.right += 1;
  } else {
    it.reps = 0; it.lapses += 1; it.ivl = 0;
    it.ease = Math.max(1.6, it.ease - 0.2);
    it.due = t;
    state.answered.wrong += 1;
  }
  state.srs[key] = it;
  touchDay();
  save();
  return it;
}

// `which` picks a deck — see isKoreanKey / isExamKey in data.js. Without it,
// both.
export function dueKeys(limit = 40, which = () => true) {
  const t = today();
  return Object.entries(state.srs)
    .filter(([k, v]) => v.due <= t && which(k))
    .sort((a, b) => a[1].due.localeCompare(b[1].due) || a[1].ivl - b[1].ivl)
    .slice(0, limit)
    .map(([k]) => k);
}

// A key whose content has gone — a unit renumbered, a question removed — can
// never be shown, so it must not sit in the deck inflating the due count.
export function forget(key) { if (state.srs[key]) { delete state.srs[key]; save(); } }

export const dueCount = (which = () => true) => {
  const t = today();
  return Object.entries(state.srs).filter(([k, v]) => v.due <= t && which(k)).length;
};

export const deckCount = (which = () => true) => Object.keys(state.srs).filter(which).length;

/* Every answer, counted against whatever the question was about.
 *
 * This is the only record of WHY something was missed rather than just THAT it
 * was. The review deck schedules items; this is what lets the app name the
 * weak spot out loud.
 */
export function recordTags(tags, right) {
  if (!tags || !tags.length) return;
  for (const t of tags) {
    const e = state.tags[t] || (state.tags[t] = { right: 0, wrong: 0 });
    if (right) e.right += 1; else e.wrong += 1;
  }
  save();
}

// Only tags with enough answers behind them to mean anything. Two wrong out of
// two is not a weak spot, it is a small sample, and telling someone to go and
// fix it would be inventing a finding.
export const MIN_ATTEMPTS = 6;

export function tagStats(min = MIN_ATTEMPTS) {
  return Object.entries(state.tags)
    .map(([id, e]) => ({ id, ...e, n: e.right + e.wrong, pct: (e.right + e.wrong) ? e.right / (e.right + e.wrong) : 0 }))
    .filter(x => x.n >= min)
    .sort((a, b) => a.pct - b.pct || b.n - a.n);
}

export function recordMock(rec) { state.mocks.unshift(rec); state.mocks = state.mocks.slice(0, 20); touchDay(); save(); }

export function exportAll() {
  return JSON.stringify({ app: 'hangil', version: 1, exported: new Date().toISOString(), state }, null, 2);
}

export function importAll(text) {
  const parsed = JSON.parse(text);
  if (!parsed || parsed.app !== 'hangil' || !parsed.state) throw new Error('Not a HANGIL backup file.');
  state = Object.assign(structuredClone(FRESH), parsed.state);
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function wipe() {
  state = structuredClone(FRESH);
  try { localStorage.removeItem(KEY); } catch {}
}
