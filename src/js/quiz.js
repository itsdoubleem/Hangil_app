// One question runner for the whole app. Lessons, vocabulary, exam drills and
// the review deck all hand it the same normalised shape and get the same
// behaviour: answer, see why, move on.

import { h, clear, shuffle, icon } from './util.js';
import * as store from './store.js';
import * as tts from './tts.js';
import { data } from './data.js';

/* The picture questions.
 *
 * A 그림 문제 on the real paper tests whether you can match a picture to Korean.
 * The first version of this app printed the Korean word where the picture should
 * have been, which quietly turned every one of them into a reading question —
 * a different skill, and the easier one.
 *
 * The drawings are original line art in data/pictures.json, stroked in
 * currentColor so they work on either theme. They are not traced from anywhere.
 */
export function picture(id, cls = 'pic') {
  const d = data();
  const img = d && d.images ? d.images[id] : null;

  // An official picture, if this build has one for this id. It shadows the
  // drawing rather than replacing it in the data, so removing the file puts the
  // drawing back and no question has to be touched either way.
  if (img && img.file) {
    const el = h('img', {
      class: cls,
      src: `content/images/${img.file}`,
      alt: img.alt || (d.pics[id] ? d.pics[id].en : id),
      loading: 'eager',
      decoding: 'async',
    });
    // A manifest can outlive the file it names. If it does, fall back to the
    // drawing rather than showing a broken box in the middle of an exam question.
    el.addEventListener('error', () => {
      if (d.pics && d.pics[id]) el.replaceWith(drawing(id, cls, d.pics[id]));
    }, { once: true });
    return el;
  }

  return drawing(id, cls, d && d.pics ? d.pics[id] : null);
}

function drawing(id, cls, def) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', cls);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '4');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('role', 'img');
  if (def) {
    svg.innerHTML = def.d;
    svg.setAttribute('aria-label', def.en);
  }
  return svg;
}

export const picName = (id) => {
  const d = data();
  if (!d) return { ko: id, en: id };
  const img = d.images ? d.images[id] : null;
  // An image-only id carries its own names; otherwise the drawing's names stand,
  // so replacing a drawing with a photo does not lose the Korean word for it.
  if (img && (img.ko || img.en) && !(d.pics && d.pics[id])) {
    return { ko: img.ko || id, en: img.en || id };
  }
  return (d.pics && d.pics[id]) ? d.pics[id] : { ko: (img && img.ko) || id, en: (img && img.en) || id };
};

export function speakBtn(text, lines) {
  const b = h('button', { class: 'speak', type: 'button', 'aria-label': 'Play audio' }, icon('sound'));
  b.addEventListener('click', async e => {
    e.stopPropagation(); e.preventDefault();
    b.dataset.on = '1';
    if (lines) await tts.sayLines(lines); else await tts.say(text);
    b.dataset.on = '0';
  });
  return b;
}

/* ---- normalising -------------------------------------------------------
   Every question in data/ is authored with the right answer first, because that
   is far easier to proof-read. Nothing may reach the screen in that order, so
   the options are shuffled here — in one place, so a new content file cannot
   forget to do it.                                                          */

export function mix(options, answer) {
  const order = shuffle(options.map((_, i) => i));
  return { options: order.map(i => options[i]), answer: order.indexOf(answer) };
}

// The same shuffle, for options that are drawings rather than words.
export function mixPics(picOptions, answer) {
  const order = shuffle(picOptions.map((_, i) => i));
  return { picOptions: order.map(i => picOptions[i]), answer: order.indexOf(answer) };
}


export function fromExercise(ex, key) {
  const base = { key, tags: ex.tags || [], why: ex.why || null };
  if (ex.type === 'build') {
    return { ...base, type: 'build', stemEn: ex.qEn, tiles: ex.tiles, answer: ex.a };
  }
  if (ex.type === 'match') {
    return { ...base, type: 'match', stemEn: 'Match each one to its meaning.', pairs: ex.pairs };
  }
  if (ex.type === 'listen') {
    return { ...base, type: 'choice', audio: ex.ko, stemEn: ex.q || 'What did you hear?', ...mix(ex.options, ex.a) };
  }
  return { ...base, type: 'choice', stem: ex.q, stemEn: ex.qEn, ...mix(ex.options, ex.a) };
}

export function fromExamItem(item, key) {
  return {
    key, tags: item.tags || [], type: 'choice',
    stem: item.stem, display: item.display, passage: item.passage,
    lines: item.lines || null,
    audio: item.audio || (item.lines ? null : undefined),
    pic: item.pic || null,
    ...(item.picOptions ? mixPics(item.picOptions, item.a) : mix(item.options, item.a)),
    why: item.why || null,
  };
}

export function fromWord(word, siblings, key, mode) {
  const pool = siblings.filter(w => w.ko !== word.ko);
  const wrong = shuffle(pool).slice(0, 3);
  // A word asked by ear is a listening question as well as a vocabulary one, so
  // the shape tag is added here rather than in the data — the same word is both,
  // depending on how it was asked.
  const tags = word.tags || [];
  if (mode === 'listen') {
    const opts = shuffle([word, ...wrong]);
    return { key, tags: [...tags, 'listening-word'], type: 'choice', audio: word.ko, stemEn: 'What did you hear?',
      options: opts.map(w => w.en), answer: opts.indexOf(word), why: `${word.ko} — ${word.en}` };
  }
  const opts = shuffle([word, ...wrong]);
  return { key, tags, type: 'choice', stemEn: word.en, hint: word.exEn ? null : undefined,
    options: opts.map(w => w.ko), answer: opts.indexOf(word),
    why: word.ex ? `${word.ex} — ${word.exEn}` : null };
}

/* ---- the runner -------------------------------------------------------- */

export class Quiz {
  constructor(root, questions, opts = {}) {
    this.root = root;
    this.qs = questions;
    this.i = 0;
    this.right = 0;
    this.wrong = [];
    this.first = null;         // the score before any retry — the honest one
    this.opts = opts;          // { title, onDone(result), review: bool }
    this.render();
  }

  answer(ok, q) {
    if (ok) this.right += 1; else this.wrong.push(q);
    if (q.key) store.schedule(q.key, ok);
    store.recordTags(q.tags, ok);
    // A reading question is answered from the page, so the sound comes after:
    // hearing it before would give the answer away, and never hearing it would
    // leave the learner not knowing whether they read it right in their head.
    if (q.sayAfter) tts.say(q.sayAfter);
  }

  next() {
    // A dialogue still playing belongs to the question just left.
    tts.stop();
    this.i += 1;
    if (this.i >= this.qs.length) this.finish(); else this.render();
  }

  // The end of a set is the one moment the app can say well done, so it is a
  // screen rather than a line of text: a ring that fills to the score, and a
  // colour that tells you how it went before you read the number.
  finish() {
    const total = this.qs.length;
    // Retrying the missed ones replays a smaller set, and its score is not the
    // lesson's score: 2 out of 2 on a retry would otherwise overwrite 4 out of 6.
    if (!this.first) this.first = { right: this.right, total };
    const pct = Math.round((this.right / total) * 100);
    const tone = pct === 100 ? 'review' : pct >= 60 ? 'course' : 'exam';
    const R = 54, C = 2 * Math.PI * R;

    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ring.setAttribute('viewBox', '0 0 128 128');
    ring.setAttribute('aria-hidden', 'true');
    ring.innerHTML =
      `<circle class="track" cx="64" cy="64" r="${R}"/>` +
      `<circle class="fill" cx="64" cy="64" r="${R}" stroke-dasharray="${C}" ` +
      `stroke-dashoffset="${C * (1 - this.right / total)}" style="--dash:${C}"/>`;

    const box = clear(this.root);
    box.style.setProperty('--c', `var(--c-${tone})`);
    box.append(
      h('div', { class: 'result' },
        h('div', { class: 'result__ring' }, ring,
          h('div', { class: 'result__inner' },
            h('p', { class: 'result__score' }, `${this.right}`),
            h('p', { class: 'result__out' }, `of ${total}`))),
        h('h2', { style: 'margin-top: var(--s5)' }, pct === 100 ? 'All correct' : pct >= 60 ? 'Well done' : 'Keep going'),
        h('p', { class: 'lead' }, this.wrong.length
          ? `${this.wrong.length} to come back to. They are in your review deck now, and will find you again in a day or two.`
          : 'These come back at longer and longer gaps from here.'),
      ),
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn btn--accent btn--wide', onclick: () => { tts.stop(); this.opts.onDone && this.opts.onDone(this.first); } }, 'Carry on'),
        this.wrong.length ? h('button', {
          class: 'btn btn--ghost btn--wide',
          onclick: () => { this.qs = this.wrong; this.wrong = []; this.right = 0; this.i = 0; this.render(); }
        }, 'Retry the missed ones') : null,
      ),
    );
  }

  render() {
    const q = this.qs[this.i];
    const box = clear(this.root);
    box.append(
      h('p', { class: 'q__count' }, `${this.i + 1} / ${this.qs.length}`),
      h('div', { class: 'bar' }, h('i', { style: `width:${(this.i / this.qs.length) * 100}%` })),
    );
    if (q.from) box.append(h('p', { class: 'tiny' }, `from ${q.from}`));

    if (q.pic) box.append(h('div', { class: 'q__picbox' }, picture(q.pic, 'pic pic--big')));
    if (q.display) box.append(h('div', { class: 'q__display' }, q.display));
    if (q.passage) box.append(h('div', { class: 'q__passage' }, q.passage));

    if (q.lines) {
      box.append(h('div', { class: 'btnrow' },
        h('button', { class: 'btn btn--ghost', onclick: () => tts.sayLines(q.lines) }, 'Play the conversation'),
      ));
    } else if (q.audio) {
      box.append(h('div', { class: 'btnrow' },
        h('button', { class: 'btn btn--ghost', onclick: () => tts.say(q.audio) }, 'Play'),
      ));
    }

    if (q.stem) box.append(h('p', { class: 'q__stem' }, q.stem));
    if (q.stemEn) box.append(h('p', { class: q.stem ? 'q__hint' : 'q__stem q__stem--en' }, q.stemEn));

    if (q.type === 'choice') this.choice(box, q);
    else if (q.type === 'build') this.build(box, q);
    else if (q.type === 'match') this.match(box, q);
  }

  verdict(box, ok, q, extra) {
    const v = h('div', { class: `verdict verdict--${ok ? 'right' : 'wrong'}` });
    v.append(h('b', {}, ok ? 'Correct.' : 'Not that one.'));
    if (extra) v.append(' ' + extra);
    if (q.why) v.append(' ' + q.why);
    box.append(v);
    const btn = h('button', { class: 'btn btn--wide', onclick: () => this.next() },
      this.i + 1 >= this.qs.length ? 'See the result' : 'Next');
    box.append(btn);
    btn.focus({ preventScroll: true });
  }

  choice(box, q) {
    if (q.picOptions) return this.pickPicture(box, q);
    const list = h('div', { class: 'opts' });
    const btns = q.options.map((opt, idx) => {
      const b = h('button', { class: 'opt', type: 'button' },
        h('i', {}, 'ABCD'[idx] || String(idx + 1)), h('span', {}, opt));
      b.addEventListener('click', () => {
        if (b.disabled) return;
        const ok = idx === q.answer;
        btns.forEach((x, j) => {
          x.disabled = true;
          if (j === q.answer) x.dataset.state = 'right';
          else if (j === idx) x.dataset.state = 'wrong';
        });
        this.answer(ok, q);
        this.verdict(box, ok, q);
      });
      return b;
    });
    list.append(...btns);
    box.append(list);
  }

  // Four drawings, pick the one you heard. The answer is only revealed after a
  // choice, and the Korean name is shown then — before that, naming them would
  // give the answer away.
  pickPicture(box, q) {
    const grid = h('div', { class: 'picopts' });
    const btns = q.picOptions.map((id, idx) => {
      const b = h('button', { class: 'picopt', type: 'button', 'aria-label': `Option ${'ABCD'[idx]}` },
        h('i', {}, 'ABCD'[idx] || String(idx + 1)),
        picture(id, 'pic'));
      b.addEventListener('click', () => {
        if (b.disabled) return;
        const ok = idx === q.answer;
        btns.forEach((x, j) => {
          x.disabled = true;
          if (j === q.answer) x.dataset.state = 'right';
          else if (j === idx) x.dataset.state = 'wrong';
          x.append(h('span', { class: 'picopt__name ko' }, picName(q.picOptions[j]).ko));
        });
        this.answer(ok, q);
        this.verdict(box, ok, q);
      });
      return b;
    });
    grid.append(...btns);
    box.append(grid);
  }

  build(box, q) {
    const slot = h('div', { class: 'tilerow tilerow--slot' });
    const pool = h('div', { class: 'tilerow' });
    const chosen = [];
    const redraw = () => {
      clear(slot); clear(pool);
      chosen.forEach((word, i) => slot.append(h('button', {
        class: 'wtile', type: 'button',
        onclick: () => { bank.push(chosen.splice(i, 1)[0]); redraw(); },
      }, word)));
      bank.forEach((word, i) => pool.append(h('button', {
        class: 'wtile', type: 'button',
        onclick: () => { chosen.push(bank.splice(i, 1)[0]); redraw(); check(); },
      }, word)));
    };
    const bank = shuffle(q.tiles);
    const check = () => {
      if (chosen.length !== q.answer.length) return;
      const ok = chosen.every((w, i) => w === q.answer[i]);
      slot.querySelectorAll('.wtile').forEach(b => { b.disabled = true; });
      pool.querySelectorAll('.wtile').forEach(b => { b.disabled = true; });
      this.answer(ok, q);
      this.verdict(box, ok, q, ok ? null : `The order is ${q.answer.join(' ')}.`);
    };
    box.append(slot, pool);
    redraw();
  }

  match(box, q) {
    const left = shuffle(q.pairs.map((p, i) => ({ t: p[0], i })));
    const right = shuffle(q.pairs.map((p, i) => ({ t: p[1], i })));
    const grid = h('div', { class: 'pairs' });
    let sel = null, done = 0, missed = false;
    const make = (item, side) => {
      const b = h('button', { class: 'pair', type: 'button' }, h('span', {}, item.t));
      b.addEventListener('click', () => {
        if (b.dataset.state === 'done') return;
        if (!sel) { sel = { b, item, side }; b.dataset.state = 'sel'; return; }
        if (sel.b === b) { sel.b.dataset.state = ''; sel = null; return; }
        if (sel.side === side) { sel.b.dataset.state = ''; sel = { b, item, side }; b.dataset.state = 'sel'; return; }
        if (sel.item.i === item.i) {
          sel.b.dataset.state = 'done'; b.dataset.state = 'done';
          done += 1; sel = null;
          if (done === q.pairs.length) {
            this.answer(!missed, q);
            this.verdict(box, !missed, q, missed ? 'You matched them all, but not first time.' : null);
          }
        } else {
          missed = true;
          const a = sel.b; a.dataset.state = 'miss'; b.dataset.state = 'miss';
          setTimeout(() => { if (a.dataset.state === 'miss') a.dataset.state = ''; if (b.dataset.state === 'miss') b.dataset.state = ''; }, 420);
          sel = null;
        }
      });
      return b;
    };
    for (let i = 0; i < q.pairs.length; i++) grid.append(make(left[i], 'l'), make(right[i], 'r'));
    box.append(grid);
  }
}
