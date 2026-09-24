// Content sanity check. Runs over data/ and reports anything that would make a
// question unfair or unanswerable on screen: a duplicate option, an answer that
// is not first (every file is authored correct-answer-first so it can be
// proof-read), a missing field, a picture id with no drawing behind it.
//
// This exists because the faults it catches are invisible in the app — a
// duplicated option just looks like a hard question.

import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
const problems = [];
const bad = (where, msg) => problems.push(`${where}: ${msg}`);

const read = async (f) => JSON.parse(await readFile(join(DATA, f), 'utf8'));

// Every multiple-choice item in the app, whatever file it came from.
function checkItem(where, it, pics) {
  const opts = it.picOptions || it.options;
  if (!Array.isArray(opts)) return bad(where, 'no options');
  if (opts.length !== 4) bad(where, `${opts.length} options, expected 4`);
  if (it.a !== 0) bad(where, `answer is index ${it.a}; author the right answer first`);
  const seen = new Set();
  for (const o of opts) {
    if (seen.has(o)) bad(where, `duplicate option "${o}"`);
    seen.add(o);
  }
  if (!it.stem) bad(where, 'no stem');
  if (!it.why) bad(where, 'no explanation (why)');
  for (const id of [...(it.picOptions || []), ...(it.pic ? [it.pic] : [])]) {
    if (!pics[id]) bad(where, `picture "${id}" is not in pictures.json`);
  }
}

const pics = (await read('pictures.json')).pics;

/* Tags.
 *
 * A tag is a string in one file and a string in another, so a typo makes a new
 * tag rather than an error: it would simply never aggregate with anything and
 * never show up, which is the hardest kind of fault to notice. Every tag used
 * anywhere has to exist in tags.json, and every tag declared there has to be
 * used by something — an unused one is either a typo at the other end or dead
 * weight on a screen that is supposed to be short.
 */
const VOCAB = (await read('tags.json')).tags;
// Set by the code rather than declared on a container: the shapes data.js works
// out per item, and the one the 한글 drill stamps on its own questions.
const DERIVED = new Set([
  'reading-sign', 'reading-blank', 'reading-meaning', 'reading-passage', 'reading-picture',
  'listening-picture', 'listening-reply', 'listening-dialogue', 'listening-word',
  'word-order', 'hangeul-reading', 'sound-changes',
]);
const usedTags = new Set();
function checkTags(where, obj) {
  if (!obj || !obj.tags) return;
  if (!Array.isArray(obj.tags)) return bad(where, 'tags is not a list');
  for (const t of obj.tags) {
    if (!VOCAB[t]) bad(where, `unknown tag "${t}" — add it to tags.json or fix the spelling`);
    usedTags.add(t);
  }
}
for (const t of DERIVED) {
  if (!VOCAB[t]) bad('tags.json', `the code sets "${t}" but it is not declared here`);
  usedTags.add(t);
}

for (const f of (await readdir(DATA)).sort()) {
  if (!f.endsWith('.json')) continue;
  const d = await read(f);

  for (const tr of d.trades || []) {
    checkTags(`${f} ${tr.id}`, tr);
    const kos = new Set();
    for (const w of tr.words) {
      for (const k of ['ko', 'rom', 'en', 'ex', 'exEn']) {
        if (!w[k]) bad(`${f} ${tr.id} word ${w.ko || '?'}`, `missing ${k}`);
      }
      if (kos.has(w.ko)) bad(`${f} ${tr.id}`, `duplicate word ${w.ko}`);
      kos.add(w.ko);
    }
    tr.items.forEach((it, i) => checkItem(`${f} ${tr.id} item ${i + 1}`, it, pics));
  }

  // hangeul.json also has a `drills` key, but it is a list of syllables to read
  // rather than exam items — hence the guard on `items`.
  for (const dr of d.drills || []) {
    if (!Array.isArray(dr.items)) continue;
    checkTags(`${f} ${dr.id}`, dr);
    dr.items.forEach((it, i) => checkItem(`${f} ${dr.id} item ${i + 1}`, it, pics));
  }

  for (const section of ['listening', 'reading']) {
    (d[section] || []).forEach((it, i) => checkItem(`${f} ${section} ${i + 1}`, it, pics));
  }

  for (const s of d.sets || []) {
    checkTags(`${f} ${s.id}`, s);
    for (const w of s.words) {
      for (const k of ['ko', 'rom', 'en']) if (!w[k]) bad(`${f} ${s.id} ${w.ko || '?'}`, `missing ${k}`);
    }
  }

  for (const u of d.units || []) {
    checkTags(`${f} ${u.id}`, u);
    u.exercises.forEach((ex, i) => {
      if (ex.type === 'choice' || !ex.type) {
        if (ex.a !== 0) bad(`${f} ${u.id} ex ${i + 1}`, `answer is index ${ex.a}; author the right answer first`);
        const seen = new Set();
        for (const o of ex.options || []) { if (seen.has(o)) bad(`${f} ${u.id} ex ${i + 1}`, `duplicate option "${o}"`); seen.add(o); }
      }
    });
  }
}

/* The alphabet lessons. Each letter family must be taught in exactly one
   lesson — a family left out is a set of letters the app never teaches, and
   nothing on screen would show it — and every example has to be a single
   block the romanizer can read, because its pronunciation is worked out from
   the block, not written down. */
{
  const { romanize } = await import(new URL('../src/js/hangul.js', import.meta.url));
  const hg = await read('hangeul.json');
  const families = new Map(hg.groups.map(g => [g.id, 0]));
  const ids = new Set();
  for (const l of hg.lessons || []) {
    const where = `hangeul.json lesson ${l.id}`;
    if (ids.has(l.id)) bad(where, 'duplicate lesson id');
    ids.add(l.id);
    for (const k of ['title', 'titleKo', 'intro', 'rules', 'examples', 'groups']) if (l[k] === undefined) bad(where, `missing ${k}`);
    if (!l.groups.length && !['finals', 'changes'].includes(l.kind)) bad(where, 'teaches no letters, so needs kind "finals" or "changes"');
    // A sound-change item is a real pronunciation question: the right answer
    // must differ from the spelling (or there is no change to learn), and no
    // wrong answer may BE the right one.
    for (const c of l.changes || []) {
      if (!c.name || !c.nameKo || !c.rule) bad(where, `change ${c.name || '?'} needs name, nameKo and rule`);
      if ((c.words || []).length < 3) bad(where, `change ${c.name}: needs at least 3 words to practise`);
      for (const w of c.words || []) {
        if (w.said === w.ko) bad(where, `${w.ko} is said as written — nothing changes`);
        if ((w.wrong || []).length < 2) bad(where, `${w.ko}: needs two wrong pronunciations`);
        if ((w.wrong || []).includes(w.said)) bad(where, `${w.ko}: the right answer is also listed as wrong`);
        if (w.said.length !== w.ko.length) bad(where, `${w.ko} → [${w.said}]: a sound change never adds or loses a block`);
      }
    }
    for (const g of l.groups || []) {
      if (!families.has(g)) bad(where, `letter family "${g}" does not exist`);
      else families.set(g, families.get(g) + 1);
    }
    for (const ex of l.examples || []) {
      if (!ex.note) bad(where, `example ${ex.ko} has no note`);
      if (!ex.ko || ex.ko.length !== 1 || !romanize(ex.ko)) bad(where, `example "${ex.ko}" is not one Hangul block`);
    }
  }
  const allWords = (hg.lessons || []).flatMap(l => (l.changes || []).flatMap(c => c.words || []));
  const seenWords = new Set();
  for (const w of allWords) {
    if (seenWords.has(w.ko)) bad('hangeul.json lessons', `${w.ko} appears twice — its review key would be ambiguous`);
    seenWords.add(w.ko);
  }
  if ((hg.lessons || []).length) {
    for (const [g, n] of families) if (n !== 1) bad('hangeul.json lessons', `letter family "${g}" is taught in ${n} lessons, expected 1`);
  }
  // The hand-written reading drill must agree with the romanizer, or a
  // review of one of its syllables would mark the drill's own answer wrong.
  for (const x of hg.drills || []) {
    if (x.ko && x.rom && romanize(x.ko) !== x.rom) bad('hangeul.json drills', `${x.ko} is "${x.rom}" here but romanizes as "${romanize(x.ko)}"`);
  }
}

/* Romanization. Every `rom` beside a `ko` — words, the alphabet lessons'
   examples, the course's sentences — has to agree with tools/romanize.mjs,
   which applies the Revised Romanization rules that work across syllables.
   A wrong `rom` is invisible on screen and gets memorised exactly as written:
   주의 was `jui` and 체류 `chelyu` for months before anything looked.

   Case is ignored, because RR capitalises names (Pillipin) and the romanizer
   cannot know which words are names. A hyphen inside a word is allowed, because
   RR allows one where a reading could be confused (안경 an-gyeong); everything
   else, spaces and punctuation included, must match. */
{
  const { romanizeWord } = await import(new URL('./romanize.mjs', import.meta.url));
  // Where the data is right and the romanizer is not, or is right by a rule
  // the romanizer cannot see. One line each, with the reason. Do not add a
  // word here to make a typo pass — fix the typo.
  const ROM_EXCEPTIONS = {
    // House convention: the h is kept where ㅎ meets ㄱ ㄷ ㅂ, even in a verb or
    // adjective, where strict RR writes the aspiration instead (makida).
    '막히다': ['makhida', 'house convention: h kept after ㄱ'],
    '깨끗하다': ['kkaekkeuthada', 'house convention: h kept after ㅅ said as ㄷ'],
    '따뜻하다': ['ttatteuthada', 'house convention: h kept after ㅅ said as ㄷ'],
    '시작하다': ['sijakhada', 'house convention: h kept after ㄱ'],
    // RR itself keeps the h in a noun (its own example: 묵호 Mukho), and the
    // romanizer cannot tell a noun from a verb.
    '낙하': ['nakha', 'a noun: RR keeps the h'],
    '괴롭힘': ['goerophim', 'a noun: RR keeps the h'],
    // Unsettled: a noun and the particle 하고. Left as written until decided.
    '밥하고': ['baphago', 'noun + particle 하고: noun rule or verb rule, undecided'],
  };
  const usedExceptions = new Set();
  const expected = (ko) => ko.replace(/[가-힣]+/g, (w) => {
    const r = romanizeWord(w);
    if (ROM_EXCEPTIONS[w] && ROM_EXCEPTIONS[w][0] !== r) { usedExceptions.add(w); return ROM_EXCEPTIONS[w][0]; }
    return r;
  });
  const norm = (s) => s.toLowerCase().replace(/(?<=[a-z])-(?=[a-z])/g, '');
  const visit = (f, o) => {
    if (Array.isArray(o)) return o.forEach(x => visit(f, x));
    if (!o || typeof o !== 'object') return;
    if (typeof o.ko === 'string' && typeof o.rom === 'string') {
      const want = expected(o.ko);
      if (norm(o.rom) !== norm(want)) bad(`${f} ${o.ko}`, `rom is "${o.rom}" but romanizes as "${want}"`);
    }
    for (const v of Object.values(o)) visit(f, v);
  };
  for (const f of (await readdir(DATA)).sort()) if (f.endsWith('.json')) visit(f, await read(f));
  for (const w of Object.keys(ROM_EXCEPTIONS)) {
    if (!usedExceptions.has(w)) bad('check-content.mjs', `romanization exception "${w}" is no longer needed — remove it`);
  }
}

for (const t of Object.keys(VOCAB)) {
  if (!usedTags.has(t)) bad('tags.json', `"${t}" is declared but nothing uses it`);
}

if (problems.length) {
  console.error(`${problems.length} problem${problems.length === 1 ? '' : 's'}:`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('content ok');
