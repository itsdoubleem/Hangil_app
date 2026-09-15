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
    hangeul:'<path d="M4 6h10M9 6v5M4.5 11h9"/><path d="M19 4v16"/><path d="M4 16.5h10v4H4z"/>',
    vocab:  '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M8 7.5h7M8 11h5"/>',
    play:   '<path d="M7 4.5l12 7.5-12 7.5z"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    spark:  '<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>',
    check:  '<path d="M4 12.5l5 5 11-11"/>',
    clock:  '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.5l3.5 2"/>',
  }[name] || '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = p;
  return svg;
}
