import './setup.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const D = await import('../src/js/data.js');

const d = await D.load();

test('every content file loads', () => {
  assert.deepEqual(d.missing, []);
  assert.equal(d.units.length, 24);
  assert.ok(d.sets.length >= 12);
  assert.equal(d.trades.length, 8); // the EPS-TOPIK's own eight — never a ninth
  assert.equal(d.mocks.length, 2);
});

test('every key the app hands out resolves back to its content', () => {
  let n = 0;
  for (const u of d.units) u.exercises.forEach((_, i) => { assert.ok(D.resolve(D.unitKey(u.id, i)), u.id); n++; });
  for (const dr of d.drills) dr.items.forEach((_, i) => { assert.ok(D.resolve(D.drillKey(dr.id, i)), dr.id); n++; });
  for (const tr of d.trades) {
    tr.items.forEach((_, i) => { assert.ok(D.resolve(D.tradeKey(tr.id, i)), tr.id); n++; });
    for (const w of tr.words) assert.ok(D.resolve(D.vocabKey(w.ko)), w.ko);
  }
  for (const s of d.sets) for (const w of s.words) assert.ok(D.resolve(D.vocabKey(w.ko)), w.ko);
  for (const g of d.hangeul.groups) for (const L of g.letters) assert.ok(D.resolve(`l:${L.ch}`), L.ch);
  assert.ok(D.resolve('h:가'));
  assert.ok(n > 300);
});

test('keys for content that is not there resolve to null', () => {
  for (const k of ['u:nope:0', 'u:g1:9999', 'w:없는말없는말', 'd:nope:0', 't:nope:0', 'l:A', 'h:AB', 'h:a', 's:없는말', 'x:y', '']) {
    assert.equal(D.resolve(k), null, k);
  }
});

test('exam items never land in the Korean deck', () => {
  for (const k of ['d:signs:0', 't:rubber:0']) { assert.ok(D.isExamKey(k)); assert.ok(!D.isKoreanKey(k)); }
  for (const k of ['u:g1:0', 'w:공장', 'h:가', 'l:ㄱ', 's:국물']) { assert.ok(D.isKoreanKey(k)); assert.ok(!D.isExamKey(k)); }
});

test('tags are inherited and shape tags derived', () => {
  const u = d.units.find(x => (x.tags || []).length);
  for (const ex of u.exercises) for (const t of u.tags) assert.ok(ex.tags.includes(t));
  const build = d.units.flatMap(x => x.exercises).find(ex => ex.type === 'build');
  assert.ok(build.tags.includes('word-order'));
  for (const [tag, keys] of Object.entries(d.byTag)) {
    assert.ok(d.tags[tag] || tag.includes('-'), tag);
    for (const k of keys) assert.ok(D.resolve(k), `${tag} -> ${k}`);
  }
});
