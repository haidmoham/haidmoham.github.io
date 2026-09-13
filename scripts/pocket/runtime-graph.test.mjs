import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
test('the home page module graph initializes exactly one navigation runtime', () => {
  const html = readFileSync(resolve(root, 'index.html'), 'utf8');
  const entry = html.match(/<script[^>]+src="([^" ]*\/index-[^" ]+\.js)"/)[1];
  const pending = [resolve(root, entry.slice(1))];
  const visited = new Set();
  const runtimes = [];
  while (pending.length) {
    const path = pending.pop();
    if (visited.has(path)) continue;
    visited.add(path);
    assert.ok(existsSync(path), `missing module: ${path}`);
    const source = readFileSync(path, 'utf8');
    if (source.includes('vinext.navigationRuntime') && source.includes('hydrateRoot')) runtimes.push(path);
    for (const [, specifier] of source.matchAll(/["'`]((?:\.\/|_next\/static\/)[^"'`]+\.js)["'`]/g)) {
      pending.push(resolve(specifier.startsWith('./') ? dirname(path) : root, specifier));
    }
  }
  assert.equal(runtimes.length, 1, `multiple runtime initializers in the loaded graph:\n${runtimes.join('\n')}`);
});
