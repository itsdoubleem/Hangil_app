// Tiny DOM + helpers. No framework: the whole app is a few hundred lines of this.

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const today = () => new Date().toISOString().slice(0, 10);

export function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

export function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function mmss(sec) {
  const m = Math.floor(Math.max(0, sec) / 60), s = Math.max(0, sec) % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// An inline icon. Paths are plain strokes so they inherit colour from CSS.
export function icon(name) {
  const p = {
    today:  '<path d="M3 5.5h18v15H3z"/><path d="M8 3v5M16 3v5M3 10.5h18"/><path d="M7.5 14.5h3v3h-3z"/>',
    course: '<path d="M4 4h7a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H4z"/><path d="M20 4h-3.5A2.5 2.5 0 0 0 14 6.5V20a2.5 2.5 0 0 1 2.5-2.5H20z"/>',
    exam:   '<path d="M6 3h9l5 5v13H6z"/><path d="M14 3v6h6"/><path d="M9.5 13.5l2 2 3.5-4"/>',
    review: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>',
    me:     '<path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6"/><circle cx="12" cy="8" r="4"/>',
    sound:  '<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a8 8 0 0 1 0 11"/>',
    back:   '<path d="M15 19l-7-7 7-7"/>',
    chev:   '<path d="M9 5l7 7-7 7"/>',
    flame:  '<path d="M12 3s5 4.5 5 9a5 5 0 0 1-10 0c0-1.7.8-3.2 1.6-4.3.3 1.3 1 2.1 1.7 2.1 1 0 1.3-1.2 1.3-3 0-1.6-.6-3-.6-3z"/>',
    // section marks — each screen has one, so a card is recognisable before it is read
    //
    // There is deliberately no 'hangeul' icon. It used to be one: three strokes
    // and a box that together formed a syllable-shaped block which was not a
    // syllable. In an app whose whole job is teaching people to read 한글, a mark
    // that looks like a word and says nothing is worse than no mark at all — a
    // learner who has just been taught how blocks are built will try to read it.
    // The card shows the real character 가 instead; see `glyph` in views.js.
    vocab:  '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M8 7.5h7M8 11h5"/>',
    play:   '<path d="M7 4.5l12 7.5-12 7.5z"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    spark:  '<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>',
    check:  '<path d="M4 12.5l5 5 11-11"/>',
    down:   '<path d="M12 4v15"/><path d="M6 13.5l6 6 6-6"/>',
    clock:  '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.5l3.5 2"/>',
    // the eight trades. Line marks in the same weight as the rest — each one is
    // the object a person in that trade actually has in their hands, not an
    // abstraction of the industry.
    trade:  '<path d="M4 9l8-5 8 5v10H4z"/><path d="M9.5 19v-6h5v6"/>',
    mould:  '<path d="M4 6h16v5H4z"/><path d="M4 15h16v4H4z"/><path d="M12 11v4"/>',
    chip:   '<path d="M7.5 7.5h9v9h-9z"/><path d="M10 4v3.5M14 4v3.5M10 16.5V20M14 16.5V20M4 10h3.5M4 14h3.5M16.5 10H20M16.5 14H20"/>',
    tools:  '<path d="M14.5 6.5a3.5 3.5 0 0 0 4.6 4.6L21 20l-1.5 1.5-8.9-1.9"/><path d="M9.5 4.5 4 10l3 3 5.5-5.5"/>',
    gear:   '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6"/>',
    food:   '<path d="M6 3v7a2 2 0 0 0 4 0V3"/><path d="M8 10v11"/><path d="M17 3c-1.5 2-2 4-2 6.5 0 1.5.7 2.5 2 2.5V3z"/><path d="M17 12v9"/>',
    thread: '<circle cx="12" cy="7" r="3.5"/><path d="M12 10.5c-4 2.5-6 5-6 7.5a6 6 0 0 0 12 0"/>',
    flask:  '<path d="M10 3v6.5L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.5V3"/><path d="M9 3h6"/><path d="M7.2 14.5h9.6"/>',
    wood:   '<path d="M4 7.5h11v9H4z"/><ellipse cx="18.5" cy="12" rx="3.5" ry="4.5"/><path d="M4 7.5c2 0 2 9 0 9"/>',
  }[name] || '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = p;
  return svg;
}
