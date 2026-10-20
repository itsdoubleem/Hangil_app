import './setup.mjs';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
const store = await import('../src/js/store.js');
const { today, addDays } = await import('../src/js/util.js');

beforeEach(() => store.wipe());

test('a first right answer is due tomorrow, then in three days', () => {
  const t = today();
  let it = store.schedule('u:g1:0', true);
  assert.equal(it.ivl, 1);
  assert.equal(it.due, addDays(t, 1));
  it = store.schedule('u:g1:0', true);
  assert.equal(it.ivl, 3);
  assert.equal(it.due, addDays(t, 3));
  it = store.schedule('u:g1:0', true);
  assert.ok(it.ivl > 3 && it.ivl <= 180);
});

test('a wrong answer comes back today with its gap reset', () => {
  store.schedule('w:공장', true);
  store.schedule('w:공장', true);
  const it = store.schedule('w:공장', false);
  assert.equal(it.ivl, 0);
  assert.equal(it.reps, 0);
  assert.equal(it.lapses, 1);
  assert.equal(it.due, today());
  assert.ok(it.ease >= 1.6);
});

test('ease and interval stay inside their bounds', () => {
  for (let i = 0; i < 40; i++) store.schedule('k', false);
  assert.equal(store.get().srs.k.ease, 1.6);
  for (let i = 0; i < 40; i++) store.schedule('k', true);
  assert.equal(store.get().srs.k.ease, 2.8);
  assert.equal(store.get().srs.k.ivl, 180);
});

test('dueKeys and dueCount keep the two decks apart', async () => {
  const { isKoreanKey, isExamKey } = await import('../src/js/data.js');
  for (const k of ['u:g1:0', 'w:공장', 'h:가', 'l:ㄱ', 's:국물', 'd:signs:0', 't:rubber:3']) store.schedule(k, false);
  store.schedule('u:g1:1', true); // due tomorrow, not today
  assert.deepEqual(new Set(store.dueKeys(40, isKoreanKey)), new Set(['u:g1:0', 'w:공장', 'h:가', 'l:ㄱ', 's:국물']));
  assert.deepEqual(new Set(store.dueKeys(40, isExamKey)), new Set(['d:signs:0', 't:rubber:3']));
  assert.equal(store.dueCount(isKoreanKey), 5);
  assert.equal(store.dueCount(isExamKey), 2);
  assert.equal(store.dueCount(), 7);
  assert.equal(store.dueKeys(3).length, 3);
});

test('forget removes one key and nothing else', () => {
  store.schedule('a', false);
  store.schedule('b', false);
  store.forget('a');
  store.forget('not-there');
  assert.deepEqual(Object.keys(store.get().srs), ['b']);
});

test(`a tag is not reported until it has ${store.MIN_ATTEMPTS} answers behind it`, () => {
  for (let i = 0; i < store.MIN_ATTEMPTS - 1; i++) store.recordTags(['ey-vs-eseo'], false);
  assert.deepEqual(store.tagStats(), []);
  store.recordTags(['ey-vs-eseo'], true);
  const [s] = store.tagStats();
  assert.equal(s.id, 'ey-vs-eseo');
  assert.equal(s.n, store.MIN_ATTEMPTS);
  assert.equal(s.right, 1);
});

test('tagStats puts the worst first', () => {
  for (let i = 0; i < 6; i++) { store.recordTags(['good'], true); store.recordTags(['bad'], i === 0); }
  assert.deepEqual(store.tagStats().map(x => x.id), ['bad', 'good']);
});

test('an empty tag list records nothing', () => {
  store.recordTags([], false);
  store.recordTags(undefined, false);
  assert.deepEqual(store.get().tags, {});
});

test('a backup round-trips, and anything else is refused', () => {
  store.schedule('u:g1:0', true);
  store.set({ trade: 'rubber' });
  const text = store.exportAll();
  store.wipe();
  assert.deepEqual(store.get().srs, {});
  store.importAll(text);
  assert.ok(store.get().srs['u:g1:0']);
  assert.equal(store.get().trade, 'rubber');
  assert.throws(() => store.importAll('{"app":"other","state":{}}'), /Not a HANGIL backup/);
  assert.throws(() => store.importAll('not json'));
});

test('a walk-through keeps its card, and forgets it at zero', () => {
  assert.equal(store.placeOf('hangeul/l3'), 0);
  store.setPlace('hangeul/l3', 16);
  assert.equal(store.placeOf('hangeul/l3'), 16);
  assert.equal(store.placeOf('hangeul/l4'), 0);
  store.setPlace('hangeul/l3', 0);
  assert.equal(store.placeOf('hangeul/l3'), 0);
  assert.equal('hangeul/l3' in store.get().place, false);
});

test('the screen last open is remembered', () => {
  store.setAt('#/hangeul/lesson/l3');
  assert.equal(store.get().at, '#/hangeul/lesson/l3');
});

test('progress counts cards then the practice, and holds once walked', () => {
  // 21 cards and a practice: 22 steps.
  assert.equal(store.stepsDone('hangeul/l3', 21, false), 0);
  store.setPlace('hangeul/l3', 16);
  assert.equal(store.stepsDone('hangeul/l3', 21, false), 16 / 22);
  // Finishing the walk-through forgets the card, but not the progress.
  store.setPlace('hangeul/l3', 0);
  store.markWalked('hangeul/l3');
  assert.equal(store.stepsDone('hangeul/l3', 21, false), 21 / 22);
  assert.equal(store.stepsDone('hangeul/l3', 21, true), 1);
  // A place past the end, left by a lesson that has since lost cards, is capped.
  store.setPlace('course/u1', 40);
  assert.equal(store.stepsDone('course/u1', 10, false), 10 / 11);
});

test('a vocabulary set counts words right across drills, not one sample', () => {
  const set = Array.from({ length: 18 }, (_, i) => `w:${i}`);
  // A drill asks 12 of an 18-word set: all 12 right is two thirds of the set.
  store.markSet('v01', set.slice(0, 12), set);
  assert.equal(store.get().sets.v01.score, 12 / 18);
  // The next drill adds what it got right; a word already right stays right.
  store.markSet('v01', ['w:0', ...set.slice(12)], set);
  assert.equal(store.get().sets.v01.score, 1);
});

test('a word no longer in the set stops counting', () => {
  store.markSet('v02', ['w:a', 'w:b'], ['w:a', 'w:b']);
  assert.equal(store.get().sets.v02.score, 1);
  // w:b was edited out of the set and w:c added: one of two, not 100%.
  store.markSet('v02', [], ['w:a', 'w:c']);
  assert.equal(store.get().sets.v02.score, 0.5);
  assert.deepEqual(store.get().sets.v02.right, ['w:a']);
});

test('a lesson, unit or set keeps its best score, not its latest', () => {
  store.markLetters('a8', 1);
  store.markLetters('a8', 0.78);
  assert.equal(store.get().letters.a8.score, 1);
  store.markLesson('g01', 0.6);
  store.markLesson('g01', 0.9);
  assert.equal(store.get().done.g01.score, 0.9);
});

test('a drill best never exceeds its total when the set shrinks', () => {
  store.recordDrill('d09', 9, 10);
  store.recordDrill('d09', 5, 8);
  const r = store.get().drills.d09;
  assert.ok(r.best <= r.total, `best ${r.best}/${r.total}`);
  assert.equal(r.best, 8);
});

test('a vocabulary score from the old one-drill rule is cleared, not kept', () => {
  const old = { app: 'hangil', version: 1, state: { sets: { v01: { at: '2026-10-20', score: 1 }, v02: { at: '2026-10-20', right: ['w:a'], score: 0.5 } } } };
  store.importAll(JSON.stringify(old));
  assert.equal(store.get().sets.v01, undefined);
  assert.equal(store.get().sets.v02.score, 0.5);
});
