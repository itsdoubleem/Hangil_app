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
  'word-order', 'hangeul-reading',
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

for (const t of Object.keys(VOCAB)) {
  if (!usedTags.has(t)) bad('tags.json', `"${t}" is declared but nothing uses it`);
}

if (problems.length) {
  console.error(`${problems.length} problem${problems.length === 1 ? '' : 's'}:`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('content ok');
