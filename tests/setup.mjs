// Just enough of a browser for the app's modules to load under `node --test`.
// Import this BEFORE any module from src/js: store.js reads localStorage and
// adds listeners the moment it is imported.
//
// fetch is served from the repo on disk, so data.js loads the real content —
// and a test can make one file fail by naming it in `failing`.

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: (k) => { mem.delete(k); },
  clear: () => mem.clear(),
};
globalThis.document = { addEventListener() {}, hidden: false };
globalThis.window = { addEventListener() {} };

export const failing = new Set();
globalThis.fetch = async (path) => {
  if (failing.has(path)) throw new TypeError('Failed to fetch');
  try {
    const body = await readFile(join(ROOT, path), 'utf8');
    return { ok: true, json: async () => JSON.parse(body) };
  } catch {
    return { ok: false, json: async () => null };
  }
};
