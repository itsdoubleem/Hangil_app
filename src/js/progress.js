// What a list card says about progress: its line, its tint, its score, and
// where you are. Kept apart from views.js so it can be tested without a page.
// The rules are in docs/design/DESIGN.md, "Progress on a card".

import * as store from './store.js';
import { t } from './i18n.js';

export const pct = (x) => `${Math.round(x * 100)}%`;

// Before the practice, the line is how far through the walk-through you are.
// After it, the line IS the score, and only 100% turns the card its colour: a
// line and a number side by side read as one quantity, so they must never
// disagree (a "78%" card with a full line did, and looked finished when it
// was not).
export function marks(deck, cards, rec) {
  if (rec && typeof rec.score === 'number') {
    return { line: rec.score, done: rec.score >= 1, score: pct(rec.score) };
  }
  return { line: store.stepsDone(deck, cards, false), done: false, score: null };
}

// Where you are in something not yet finished, for its card's meta line. A
// walk-through being gone through again says the card you are on, even if it
// was walked before: that is where it reopens.
export function where(deck, cards, next = 'practiceNext') {
  const at = store.placeOf(deck);
  if (at) return ` · ${t('cardOf').replace('%a', Math.min(at, cards - 1) + 1).replace('%b', cards)}`;
  return store.walkedOf(deck) ? ` · ${t(next)}` : '';
}
