// Assembles dist/ — copy src, data and content, then stamp the service worker
// with a version and the exact list of files to precache. No bundler: the app is
// ES modules and plain JSON, which a static host serves as-is and a human can
// still read in the deployed build.

import { cp, rm, mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

async function walk(dir, base = dir, out = []) {
  for (const name of await readdir(dir)) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name);
    if ((await stat(p)).isDirectory()) await walk(p, base, out);
    else out.push(relative(base, p).split('\\').join('/'));
  }
  return out;
}

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

await cp(join(ROOT, 'src'), DIST, { recursive: true });
await cp(join(ROOT, 'data'), join(DIST, 'data'), { recursive: true });
await cp(join(ROOT, 'content'), join(DIST, 'content'), { recursive: true });

const files = (await walk(DIST))
  .filter(f => f !== 'sw.js' && !f.endsWith('.md'))
  .sort();

// The version is a hash of everything that ships, so a build with no changes
// produces the same service worker and does not churn caches on the phone.
//
// sw.js itself is NOT in `files` — it is written separately — so it has to be fed
// in by hand. Leaving it out meant a fix to the worker alone produced an identical
// version, the cache name never changed, and phones kept running the old worker:
// exactly the change least likely to reach anyone is the one that most needs to.
const swSource = await readFile(join(ROOT, 'src', 'sw.js'), 'utf8');
const hash = createHash('sha256');
for (const f of files) hash.update(f).update(await readFile(join(DIST, f)));
hash.update('sw.js').update(swSource);
const version = hash.digest('hex').slice(0, 10);

const sw = swSource
  .replaceAll('__VERSION__', version)
  .replaceAll('__FILES__', JSON.stringify(['./', ...files], null, 2));

if (sw.includes('__VERSION__') || sw.includes('__FILES__')) {
  throw new Error('sw.js still holds a placeholder after stamping.');
}
// Parsing the stamped worker here is the cheap version of the bug that shipped
// once: a service worker that does not parse fails silently in the browser and
// the only symptom is that offline stops working.
new Function(sw.replaceAll('self.', 'globalThis.'));
await writeFile(join(DIST, 'sw.js'), sw);

// Official pictures, if this build has any. A manifest that names a file which is
// not there would put a blank box in the middle of an exam question, and nobody
// notices that until a learner does — so it fails the build instead.
let imageCount = 0;
try {
  const manifest = JSON.parse(await readFile(join(DIST, 'content/images/manifest.json'), 'utf8'));
  const entries = Object.entries(manifest.images || {});
  imageCount = entries.length;
  const missing = [];
  for (const [id, def] of entries) {
    if (!def || !def.file) { missing.push(`${id} (no "file")`); continue; }
    const at = join(DIST, 'content/images', def.file);
    if (!(await stat(at).catch(() => null))) missing.push(`${id} -> ${def.file}`);
  }
  if (missing.length) {
    throw new Error(
      'content/images/manifest.json names files that are not in the folder:\n  ' +
      missing.join('\n  ') + '\nAdd them, or take the entries out.');
  }
} catch (e) {
  if (e instanceof SyntaxError) throw new Error('content/images/manifest.json is not valid JSON: ' + e.message);
  if (e.code !== 'ENOENT') throw e;
}

const bytes = (await Promise.all(files.map(async f => (await stat(join(DIST, f))).size)))
  .reduce((a, b) => a + b, 0);

console.log(`HANGIL build ${version}`);
console.log(`${files.length} files, ${(bytes / 1024).toFixed(0)} KB`);
const audio = files.filter(f => /\.(mp3|m4a|ogg|wav)$/i.test(f));
console.log(audio.length ? `${audio.length} audio file(s) in content/listening` : 'no audio in content/listening (the app does not need any)');
console.log(imageCount
  ? `${imageCount} official picture(s) in content/images, replacing the drawings of the same id`
  : 'no official pictures in content/images (the app uses its own drawings)');

// The ids a picture question can use, so whoever fills content/images knows what
// to name a file without going and reading the data by hand.
if (process.argv.includes('--ids')) {
  const pics = JSON.parse(await readFile(join(DIST, 'data/pictures.json'), 'utf8'));
  console.log('\npicture ids:');
  for (const [id, def] of Object.entries(pics.pics)) console.log(`  ${id.padEnd(14)} ${def.ko}  (${def.en})`);
}
