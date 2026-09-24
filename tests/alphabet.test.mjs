import './setup.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const { load } = await import('../src/js/data.js');
const A = await import('../src/js/alphabet.js');
const { parts } = await import('../src/js/hangul.js');

const d = await load();

// Vowels a Korean speaker today does not tell apart by ear. Two options that
// differ only by one of these cannot both stand on "which one did you hear?".
const SAID_ALIKE = [['ㅐ', 'ㅔ'], ['ㅒ', 'ㅖ'], ['ㅙ', 'ㅞ'], ['ㅚ', 'ㅞ'], ['ㅙ', 'ㅚ']];
// After ㅈ ㅉ ㅊ the y-glide is not said at all: 져 is said 저.
const AFTER_J = [['ㅕ', 'ㅓ'], ['ㅑ', 'ㅏ'], ['ㅛ', 'ㅗ'], ['ㅠ', 'ㅜ'], ['ㅖ', 'ㅔ'], ['ㅒ', 'ㅐ']];

function alike(x, y) {
  const a = parts(x), b = parts(y);
  if (a.initial !== b.initial || a.final !== b.final) return false;
  const pair = (list) => list.some(([p, q]) => (a.vowel === p && b.vowel === q) || (a.vowel === q && b.vowel === p));
  return pair(SAID_ALIKE) || (['ㅈ', 'ㅉ', 'ㅊ'].includes(a.initial) && pair(AFTER_J));
}

test('no "which one did you hear?" question offers two options said alike', () => {
  let heard = 0;
  for (let run = 0; run < 150; run++) {
    A.lessons(d).forEach((lesson, n) => {
      for (const q of A.lessonQuestions(d, n)) {
        if (!q.audio) continue;
        heard++;
        for (let i = 0; i < q.options.length; i++) {
          for (let j = i + 1; j < q.options.length; j++) {
            assert.ok(!alike(q.options[i], q.options[j]), `lesson ${n + 1}: ${q.options.join(' ')} (answer ${q.audio})`);
          }
        }
      }
    });
  }
  assert.ok(heard > 1000);
});

test('every generated question has its answer among its options, once', () => {
  A.lessons(d).forEach((lesson, n) => {
    for (const q of A.lessonQuestions(d, n)) {
      assert.equal(new Set(q.options).size, q.options.length, q.options.join(' '));
      assert.ok(q.answer >= 0 && q.answer < q.options.length);
    }
  });
});

test('a lesson only asks about letters taught by then', () => {
  A.lessons(d).forEach((lesson, n) => {
    if (lesson.kind === 'changes') return;
    const have = A.known(d, n);
    for (const q of A.lessonQuestions(d, n)) {
      const syl = q.audio || q.display;
      const p = parts(syl);
      if (!p) continue; // a single letter
      if (lesson.kind === 'finals') continue; // uses plain letters on top by design
      assert.ok(have.has(p.initial) && have.has(p.vowel), `lesson ${n + 1}: ${syl}`);
    }
  });
});
