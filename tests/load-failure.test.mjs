// Its own file, so data.js starts with an empty cache: node --test runs each
// file in a separate process.
import { failing } from './setup.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const D = await import('../src/js/data.js');

test('a file that fails to load is named, and its keys are not declared gone', async () => {
  failing.add('data/course-3.json');
  // The two content shelves ship empty on purpose and are never "missing".
  failing.add('content/listening/manifest.json');
  failing.add('content/images/manifest.json');
  const d = await D.load();
  assert.deepEqual(d.missing, ['data/course-3.json']);
  const key = 'u:g13:0';
  assert.equal(D.resolve(key), null);
  // The unit is not gone — it just did not arrive. Its review history must stay.
  assert.equal(D.gone(key), false);
});

test('a partial load is not cached: the next load tries again', async () => {
  failing.clear();
  const d = await D.load();
  assert.deepEqual(d.missing, []);
  assert.ok(D.resolve('u:g13:0'));
  assert.equal(D.gone('u:g13:0'), false);
  assert.equal(D.gone('u:g13:9999'), true);
});
