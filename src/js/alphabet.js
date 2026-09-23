// The alphabet as a course: eight short lessons, each a walk-through and then
// practice built from the letters met so far.
//
// The letters themselves live in data/hangeul.json, grouped by family for the
// reference page and the chart. The lessons there say which families to teach
// in which order — plain vowels, then plain consonants, and the rarer letters
// after, the order a classroom uses — and this file turns that into cards and
// questions. Nothing here is a word list: every syllable is composed from the
// letters a learner already has, so a lesson can never ask about a letter it
// has not taught.

import { shuffle } from './util.js';
import { compose, romanize, naive, neighbours, parts, VOWELS } from './hangul.js';

// Closing letters the 받침 lesson practises: the seven sounds, plus the letters
// that are NOT said as they look, which is the point of the lesson.
const TAUGHT_FINALS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅇ', 'ㅅ', 'ㅈ', 'ㅊ', 'ㅌ', 'ㅍ', 'ㅆ', 'ㄲ'];
const PLAIN_VOWELS = ['ㅏ', 'ㅓ', 'ㅗ', 'ㅜ', 'ㅡ', 'ㅣ'];
const PLAIN_CONSONANTS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅎ'];

export const lessons = (d) => (d.hangeul && d.hangeul.lessons) || [];
const isFinals = (lesson) => lesson.kind === 'finals';
const isChanges = (lesson) => lesson.kind === 'changes';
const isVowel = (ch) => VOWELS.includes(ch);

export function lettersOf(d, lesson) {
  return lesson.groups.flatMap(id => (d.hangeul.groups.find(g => g.id === id) || { letters: [] }).letters);
}

export function letter(d, ch) {
  for (const g of d.hangeul.groups) for (const L of g.letters) if (L.ch === ch) return L;
  return null;
}

// Everything a learner has met by the end of lesson `n`. ㅇ is there from the
// first lesson, because a vowel cannot be written on its own without it.
export function known(d, n) {
  const out = new Set(['ㅇ']);
  lessons(d).slice(0, n + 1).forEach(l => {
    lettersOf(d, l).forEach(L => out.add(L.ch));
    if (isFinals(l)) TAUGHT_FINALS.forEach(f => out.add(f));
  });
  return out;
}

const lessonOfLetter = (d, ch) => {
  const i = lessons(d).findIndex(l => lettersOf(d, l).some(L => L.ch === ch));
  return i < 0 ? 0 : i;
};

// The lesson by which every part of a syllable has been taught.
function lessonOfSyllable(d, syl) {
  const p = parts(syl);
  if (!p) return 0;
  let n = Math.max(lessonOfLetter(d, p.initial), lessonOfLetter(d, p.vowel));
  if (p.final) n = Math.max(n, lessons(d).findIndex(isFinals));
  return n;
}

// The letters wrong options may be built from, for a syllable first taught in
// lesson `n`. For the 받침 lesson that is deliberately narrow: the lesson is
// about the bottom of the block, so the top of it stays plain, and blocks like
// 윛 or 뙉 — real code points that nobody will ever read — never appear.
function optionLetters(d, n) {
  const lesson = lessons(d)[n];
  if (lesson && isFinals(lesson)) return new Set([...PLAIN_CONSONANTS, ...PLAIN_VOWELS, ...TAUGHT_FINALS]);
  return known(d, n);
}

/* ---- the walk-through ----------------------------------------------------- */

export function lessonCards(d, lesson) {
  const cards = [{ kind: 'title', form: lesson.titleKo, goal: lesson.title }];
  lesson.intro.forEach((text, i) => cards.push({ kind: 'rule', text, label: i === 0 ? 'Start here' : 'And' }));
  // The sound changes: each rule is met on two real words BEFORE it is
  // stated, the same order the course uses — try to read it, check, then learn
  // why it came out that way.
  for (const c of (lesson.changes || [])) {
    for (const w of c.words.slice(0, 2)) cards.push({ kind: 'syllable', ko: w.ko, rom: `said [${w.said}]`, note: `${c.name}, ${c.nameKo}` });
    cards.push({ kind: 'note', text: c.rule, label: `${c.name} · ${c.nameKo}` });
  }
  for (const L of lettersOf(d, lesson)) cards.push({ kind: 'letter', letter: L });
  for (const text of lesson.rules) cards.push({ kind: 'note', text, label: 'The rule' });
  for (const ex of lesson.examples) cards.push({ kind: 'syllable', ko: ex.ko, rom: romanize(ex.ko), note: ex.note });
  return cards;
}

/* ---- the questions --------------------------------------------------------- */

const TAGS = ['hangeul-reading'];

// Which sound does this letter make? Wrong options are other letters of the
// same kind the learner has met — a vowel against vowels.
export function letterQuestion(d, ch, key) {
  const L = letter(d, ch);
  if (!L) return null;
  const have = known(d, lessonOfLetter(d, ch));
  const same = d.hangeul.groups.flatMap(g => g.letters)
    .filter(x => x.ch !== ch && isVowel(x.ch) === isVowel(ch) && x.rom !== L.rom);
  const met = shuffle(same.filter(x => have.has(x.ch)));
  const rest = shuffle(same.filter(x => !have.has(x.ch)));
  const wrong = [...met, ...rest].slice(0, 3);
  const opts = shuffle([L, ...wrong]);
  return {
    key, tags: TAGS, type: 'choice',
    display: L.ch, stemEn: 'What sound does this letter make?',
    options: opts.map(x => x.rom), answer: opts.indexOf(L),
    why: `${L.ch} — ${L.hint}.${isVowel(ch) ? '' : ` Its name is ${L.say}.`}`,
    sayAfter: L.say,
  };
}

// Pick three wrong options that each differ from `syl` by one letter. A block
// with a closing letter is being asked about that letter, so its wrong options
// differ at the bottom first: 밥 against 밤 and 반, not against 갑.
function confusable(syl, have) {
  const all = shuffle(neighbours(syl, have));
  const p = parts(syl);
  const ordered = (p && p.final)
    ? (() => {
        const sameTop = all.filter(x => { const q = parts(x); return q.initial === p.initial && q.vowel === p.vowel; });
        return [...sameTop, ...all.filter(x => !sameTop.includes(x))];
      })()
    : all;
  // One per SOUND. 밋, 밑 and 믿 are all said mit, and two options that sound
  // alike cannot be told apart by ear — nor be two different answers to
  // "how is this said?".
  const seen = new Set(), out = [];
  for (const x of ordered) {
    const r = romanize(x);
    if (seen.has(r)) continue;
    seen.add(r); out.push(x);
    if (out.length === 3) break;
  }
  return out;
}

// How is this block said? The best wrong option, when there is one, is the
// spelling-out a learner would guess before meeting the 받침 rule: 옷 as "os".
export function readQuestion(d, syl, key, have = optionLetters(d, lessonOfSyllable(d, syl))) {
  const right = romanize(syl);
  if (!right) return null;
  const pool = [naive(syl), ...confusable(syl, have).map(romanize)].filter(Boolean);
  const wrong = [...new Set(pool)].filter(r => r !== right).slice(0, 3);
  const opts = shuffle([right, ...wrong]);
  return {
    key, tags: TAGS, type: 'choice',
    display: syl, stemEn: 'How is this said?',
    options: opts, answer: opts.indexOf(right),
    why: `${syl} is said ${right}.`,
    sayAfter: syl,
  };
}

// Which one did you hear? Four blocks that differ by a single letter, so the
// only way to get it right is to hear that letter — 자, 차 or 짜.
export function listenQuestion(d, syl, key, have = optionLetters(d, lessonOfSyllable(d, syl))) {
  const wrong = confusable(syl, have);
  if (wrong.length < 2) return readQuestion(d, syl, key, have);
  const opts = shuffle([syl, ...wrong]);
  return {
    key, tags: [...TAGS, 'listening-word'], type: 'choice',
    audio: syl, stemEn: 'Which one did you hear?',
    options: opts, answer: opts.indexOf(syl),
    why: `It was ${syl}, said ${romanize(syl)}.`,
  };
}

// Syllables worth practising in a lesson: every new letter paired with the
// letters already known, so each block exercises something just taught.
function lessonSyllables(d, n) {
  const lesson = lessons(d)[n];
  const have = known(d, n);
  const fresh = lettersOf(d, lesson).map(L => L.ch);
  // A new letter is paired with PLAIN partners, so every block is one a
  // learner could meet on a sign, and the only unfamiliar thing in it is the
  // letter being taught.
  const initials = PLAIN_CONSONANTS.filter(c => have.has(c));
  const out = new Set();

  if (isFinals(lesson)) {
    // ㅡ is left out on top of a closing letter: 븍 and 슻 teach nothing 북 and 숫 do not.
    const vowels = PLAIN_VOWELS.filter(v => v !== 'ㅡ');
    const tops = PLAIN_CONSONANTS.filter(c => c !== 'ㄹ');
    for (let k = 0; k < 80 && out.size < 12; k++) {
      const f = TAUGHT_FINALS[k % TAUGHT_FINALS.length];
      const s = compose(shuffle(tops)[0], shuffle(vowels)[0], f);
      if (s) out.add(s);
    }
    return shuffle([...out]);
  }
  for (const ch of fresh) {
    const partners = isVowel(ch) ? initials : PLAIN_VOWELS;
    for (const p of shuffle(partners).slice(0, 2)) {
      const s = isVowel(ch) ? compose(p, ch) : compose(ch, p);
      if (s) out.add(s);
    }
  }
  return shuffle([...out]);
}

/* ---- the sound changes --------------------------------------------------- */

export const changeKey = (ko) => `s:${ko}`;

// Every word in the sound-changes lesson, with the change it shows.
export function changeWords(d) {
  const out = [];
  for (const l of lessons(d)) for (const c of (l.changes || [])) for (const w of c.words) out.push({ ...w, change: c });
  return out;
}

// How is this word actually said? The options are pronunciations, written in
// brackets the way a dictionary does. One wrong option is always the word
// said exactly as written — the mistake the whole lesson exists to fix.
export function changeQuestion(d, ko, key) {
  const w = changeWords(d).find(x => x.ko === ko);
  if (!w) return null;
  const wrong = [...new Set([w.ko, ...w.wrong])].filter(x => x !== w.said).slice(0, 3);
  const opts = shuffle([w.said, ...wrong]);
  return {
    key, tags: ['sound-changes'], type: 'choice',
    display: w.ko, stemEn: 'How is this actually said?',
    options: opts.map(x => `[${x}]`), answer: opts.indexOf(w.said),
    why: `${w.ko} is said [${w.said}] — ${w.change.name.toLowerCase()} (${w.change.nameKo}).`,
    sayAfter: w.ko,
  };
}

export const letterKey = (ch) => `l:${ch}`;
export const syllableKey = (syl) => `h:${syl}`;

// A lesson's practice: its new letters, then reading blocks, then hearing them.
export function lessonQuestions(d, n) {
  const lesson = lessons(d)[n];
  if (isChanges(lesson)) {
    // Three words per rule, in the lesson's order, so each rule is practised
    // while it is fresh rather than all six arriving at once, shuffled.
    return lesson.changes.flatMap(c => shuffle(c.words).slice(0, 3))
      .map(w => changeQuestion(d, w.ko, changeKey(w.ko))).filter(Boolean);
  }
  const have = optionLetters(d, n);
  const qs = [];
  for (const L of lettersOf(d, lesson)) qs.push(letterQuestion(d, L.ch, letterKey(L.ch)));
  const syl = lessonSyllables(d, n);
  const reading = syl.slice(0, isFinals(lesson) ? 8 : 6);
  const hearing = syl.slice(reading.length, reading.length + 4);
  // Too few new blocks to split (lesson one has only ㅇ to pair with): hear the
  // same ones instead of hearing nothing.
  const heard = hearing.length ? hearing : reading.slice(0, 4);
  for (const s of reading) qs.push(readQuestion(d, s, syllableKey(s), have));
  for (const s of heard) qs.push(listenQuestion(d, s, syllableKey(s), have));
  return qs.filter(Boolean);
}

// From a review key, either way round: mostly reading, sometimes by ear.
export function syllableQuestion(d, syl, key) {
  return Math.random() < 0.3 ? listenQuestion(d, syl, key) : readQuestion(d, syl, key);
}
