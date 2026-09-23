/* The walk-through: one idea per card, tapped through in order.
 *
 * The lesson page that already exists is a reference — the whole explanation on
 * one scroll, which is the right shape when you are looking something up. It is
 * the wrong shape when you are meeting the grammar for the first time on a phone,
 * because everything arrives at once and nothing makes you stop.
 *
 * Three rules this deck keeps, and they are the reason it exists:
 *
 *   1. THE EXAMPLE COMES BEFORE THE RULE. You see a real sentence, then read what
 *      it was doing. Rule-first teaching asks you to hold an abstraction with
 *      nothing to hang it on.
 *   2. THE ENGLISH IS HIDDEN UNTIL YOU ASK. A translation sitting next to the
 *      Korean is read instead of the Korean. One tap is a small enough price to
 *      make you try first, and trying first is the part that sticks.
 *   3. MINIMAL PAIRS DO THE TEACHING. The same sentence with and without the
 *      grammar, side by side, so the only thing that can explain the difference
 *      in meaning is the thing that changed.
 */

import { h, clear, icon } from './util.js';
import * as store from './store.js';
import { speakBtn } from './quiz.js';

// A word or sentence whose English is behind a tap. Used everywhere in the deck,
// so the "try before you look" habit is the same on every card.
export function hidden(text, { cls = 'reveal' } = {}) {
  const el = h('button', { class: cls, type: 'button' }, h('span', { class: 'reveal__hint' }, 'Show meaning'));
  el.addEventListener('click', () => {
    if (el.dataset.on === '1') return;
    el.dataset.on = '1';
    clear(el).append(h('span', {}, text));
  });
  return el;
}

function ko(text) {
  return h('div', { class: 'deck__ko ko' }, h('span', {}, text), speakBtn(text));
}

const RENDER = {
  // What you will be able to do, and the form that does it.
  title: (c) => h('div', { class: 'deck__body deck__body--mid' },
    h('p', { class: 'deck__form ko' }, c.form),
    h('p', { class: 'deck__goal' }, c.goal)),

  // The centrepiece. Two sentences that differ by one thing.
  pair: (c) => {
    const box = h('div', { class: 'deck__body' });
    box.append(h('p', { class: 'deck__label' }, 'What changes'));
    box.append(h('div', { class: 'pair' },
      h('div', { class: 'pair__side' }, ko(c.a), hidden(c.aEn)),
      h('div', { class: 'pair__mark' }, icon('down')),
      h('div', { class: 'pair__side pair__side--b' }, ko(c.b), hidden(c.bEn)),
    ));
    box.append(h('p', { class: 'deck__note' }, c.note));
    return box;
  },

  example: (c) => {
    const box = h('div', { class: 'deck__body' });
    box.append(h('p', { class: 'deck__label' }, c.label || 'A sentence'));
    box.append(ko(c.ko));
    if (c.rom && store.get().rom) box.append(h('p', { class: 'deck__rom' }, c.rom));
    box.append(hidden(c.en));
    return box;
  },

  rule: (c) => h('div', { class: 'deck__body' },
    h('p', { class: 'deck__label' }, c.label || 'Why'),
    h('p', { class: 'deck__text' }, c.text)),

  table: (c) => {
    const tb = h('table');
    tb.append(h('thead', {}, h('tr', {}, ...c.table.head.map(x => h('th', {}, x)))));
    tb.append(h('tbody', {}, ...c.table.rows.map(r => h('tr', {}, ...r.map(x => h('td', {}, x))))));
    return h('div', { class: 'deck__body' },
      h('p', { class: 'deck__label' }, 'The whole rule, in one place'),
      h('div', { class: 'tablewrap' }, tb));
  },

  note: (c) => h('div', { class: 'deck__body' },
    h('p', { class: 'deck__label' }, c.label || 'Worth knowing'),
    h('p', { class: 'deck__text' }, c.text)),

  // A vocabulary card: the Korean first, everything else on request.
  // One letter of the alphabet: big, its sound, a button to hear it, and one
  // real word it turns up in — the word's English behind a tap, as everywhere.
  letter: (c) => {
    const L = c.letter;
    const box = h('div', { class: 'deck__body' });
    box.append(h('div', { class: 'sheetcard__glyph ko' }, L.ch));
    box.append(h('p', { class: 'sheetcard__rom' }, L.rom));
    box.append(h('div', { class: 'btnrow', style: 'justify-content:center' },
      h('span', { class: 'deck__ko ko', style: 'margin:0' }, h('span', {}, L.say), speakBtn(L.say))));
    box.append(h('p', { class: 'deck__text' }, L.hint));
    if (L.from) box.append(h('p', { class: 'deck__note' }, 'Built from ', h('b', { class: 'ko' }, L.from), '.'));
    if (L.ex) {
      box.append(h('hr', { class: 'hr' }));
      box.append(h('p', { class: 'deck__label' }, 'In a word'));
      box.append(ko(L.ex.ko));
      if (store.get().rom) box.append(h('p', { class: 'deck__rom' }, L.ex.rom));
      box.append(hidden(L.ex.en));
    }
    return box;
  },

  // A block to read. How it is said is behind the tap: try it first.
  syllable: (c) => {
    const box = h('div', { class: 'deck__body' });
    box.append(h('p', { class: 'deck__label' }, 'Read it, then check'));
    box.append(h('div', { class: 'sheetcard__glyph ko' }, c.ko));
    box.append(h('div', { class: 'btnrow', style: 'justify-content:center' }, speakBtn(c.ko)));
    box.append(hidden(`${c.rom} — ${c.note}`));
    return box;
  },

  word: (c) => {
    const box = h('div', { class: 'deck__body' });
    box.append(ko(c.word.ko));
    if (c.word.rom && store.get().rom) box.append(h('p', { class: 'deck__rom' }, c.word.rom));
    box.append(hidden(c.word.en));
    if (c.word.ex) {
      box.append(h('hr', { class: 'hr' }));
      box.append(ko(c.word.ex));
      box.append(hidden(c.word.exEn));
    }
    return box;
  },
};

export class Deck {
  constructor(box, cards, { onDone, doneLabel = 'Practise it' } = {}) {
    this.box = box;
    this.cards = cards.filter(Boolean);
    this.onDone = onDone;
    this.doneLabel = doneLabel;
    this.i = 0;
    this.draw();
  }

  draw() {
    const c = this.cards[this.i];
    const last = this.i === this.cards.length - 1;
    clear(this.box);

    this.box.append(h('div', { class: 'bar' },
      h('i', { style: `width:${((this.i + 1) / this.cards.length) * 100}%` })));
    this.box.append(h('p', { class: 'deck__count' }, `${this.i + 1} / ${this.cards.length}`));

    const card = h('div', { class: 'deck__card', key: String(this.i) });
    card.append((RENDER[c.kind] || RENDER.rule)(c));
    this.box.append(card);

    this.box.append(h('div', { class: 'deck__nav' },
      h('button', {
        class: 'btn btn--ghost', disabled: this.i === 0,
        onclick: () => { this.i--; this.draw(); },
      }, 'Back'),
      h('button', {
        class: 'btn btn--accent btn--wide',
        onclick: () => {
          if (last) { this.onDone && this.onDone(); return; }
          this.i++; this.draw();
        },
      }, last ? this.doneLabel : 'Next'),
    ));
  }
}

/* Builds the card order for a grammar unit.
 *
 * The zip of examples and explanations is deliberate: example, then the rule that
 * explains it, then the next example. A unit usually has more sentences than
 * paragraphs, so the leftovers run on at the end rather than being dropped.
 */
export function unitCards(u) {
  const cards = [{ kind: 'title', form: u.form, goal: u.goal }];

  for (const p of (u.pairs || [])) cards.push({ kind: 'pair', ...p });

  const ex = u.examples || [];
  const rules = u.explain || [];
  const n = Math.max(ex.length, rules.length);
  for (let i = 0; i < n; i++) {
    if (ex[i]) cards.push({ kind: 'example', ...ex[i], label: i === 0 ? 'Look at this first' : 'Another one' });
    if (rules[i]) cards.push({ kind: 'rule', text: rules[i], label: i === 0 ? 'What just happened' : 'Why' });
  }

  if (u.table) cards.push({ kind: 'table', table: u.table });
  // The pitfalls land last, once there is something for them to be a pitfall in.
  for (const nt of (u.notes || [])) cards.push({ kind: 'note', text: nt });
  return cards;
}
