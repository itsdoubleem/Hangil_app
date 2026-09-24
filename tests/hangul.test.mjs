import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compose, split, parts, romanize, naive, neighbours, INITIALS, VOWELS, FINALS } from '../src/js/hangul.js';

test('compose builds the code point from its three parts', () => {
  assert.equal(compose('ㄱ', 'ㅏ'), '가');
  assert.equal(compose('ㅎ', 'ㅏ', 'ㄴ'), '한');
  assert.equal(compose('ㄱ', 'ㅡ', 'ㄹ'), '글');
  assert.equal(compose('ㅎ', 'ㅣ', 'ㅎ'), '힣');
});

test('compose refuses anything that is not a letter in that slot', () => {
  assert.equal(compose('ㅏ', 'ㄱ'), null);
  assert.equal(compose('ㄱ', 'ㅏ', 'ㄸ'), null); // ㄸ is never a closing letter
  assert.equal(compose('a', 'ㅏ'), null);
});

test('split and parts are the inverse of compose for every syllable', () => {
  for (let n = 0xAC00; n <= 0xD7A3; n++) {
    const syl = String.fromCharCode(n);
    const p = parts(syl);
    assert.equal(compose(p.initial, p.vowel, p.final), syl);
  }
  assert.equal(INITIALS.length * VOWELS.length * FINALS.length, 11172);
});

test('split rejects anything outside the syllable block', () => {
  assert.equal(split('A'), null);
  assert.equal(split('ㄱ'), null); // a bare letter is not a syllable
  assert.equal(split('힤'), null);
  assert.equal(parts('x'), null);
  assert.equal(romanize('?'), null);
});

test('romanize follows the Revised Romanization for a syllable on its own', () => {
  const cases = { 가: 'ga', 까: 'kka', 아: 'a', 한: 'han', 글: 'geul', 밥: 'bap', 옷: 'ot' };
  for (const [syl, rom] of Object.entries(cases)) assert.equal(romanize(syl), rom, syl);
  assert.equal(romanize('의'), 'ui');
  assert.equal(romanize('왜'), 'wae');
  assert.equal(romanize('밖'), 'bak');
  assert.equal(romanize('강'), 'gang');
});

test('naive spells out a closing letter only where it is not said as written', () => {
  assert.equal(naive('옷'), 'os');
  assert.equal(naive('낮'), 'naj');
  assert.equal(naive('밥'), 'bab');
  assert.equal(naive('산'), null); // ㄴ is said as it looks
  assert.equal(naive('가'), null); // no closing letter
});

test('neighbours differ by exactly one part and use only known letters', () => {
  const known = new Set(['ㅈ', 'ㅊ', 'ㅉ', 'ㄱ', 'ㅏ', 'ㅓ', 'ㅇ']);
  const out = neighbours('자', known);
  assert.ok(out.length > 0);
  for (const x of out) {
    const a = parts('자'), b = parts(x);
    const diff = ['initial', 'vowel', 'final'].filter(k => a[k] !== b[k]);
    assert.equal(diff.length, 1, x);
    assert.ok(known.has(b.initial) && known.has(b.vowel), x);
  }
  assert.deepEqual(neighbours('A', known), []);
});

test('neighbours never offers a closing letter said the same way', () => {
  // 밑 and 밋 are both said "mit"; neither may stand against 믿.
  const known = new Set(['ㅁ', 'ㅣ', 'ㄷ', 'ㅌ', 'ㅅ', 'ㄴ', 'ㅂ']);
  const out = neighbours('믿', known);
  assert.ok(!out.includes('밑') && !out.includes('밋'));
  assert.ok(out.includes('민') && out.includes('밉'));
});

test('said() gives syllables that sound alike the same key', async () => {
  const { said } = await import('../src/js/hangul.js');
  for (const [a, b] of [['재', '제'], ['얘', '예'], ['괘', '궤'], ['괴', '궤'], ['져', '저'], ['쟈', '자'], ['계', '게'], ['희', '히'], ['밑', '밋']]) {
    assert.equal(said(a), said(b), `${a} ${b}`);
  }
  for (const [a, b] of [['가', '거'], ['예', '에'], ['례', '레'], ['의', '이'], ['여', '어'], ['자', '차']]) {
    assert.notEqual(said(a), said(b), `${a} ${b}`);
  }
  assert.equal(said('x'), null);
});
