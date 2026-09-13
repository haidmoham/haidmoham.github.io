import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const exporter = await readFile(new URL('./export-homepage.mjs', import.meta.url), 'utf8');
const script = await readFile(new URL('../portfolio-enhancement.js', import.meta.url), 'utf8');
const stylesheet = await readFile(new URL('../portfolio-enhancement.css', import.meta.url), 'utf8');

test('the exported homepage defers every production runtime script and module preload', () => {
  assert.match(exporter, /runtimeScripts/);
  assert.match(exporter, /replace\(\/<script\\b/);
  assert.match(exporter, /modulepreload/);
  assert.match(exporter, /<template id="portfolio-runtime">/);
  assert.match(exporter, /portfolio-enhancement\.js/);
  assert.match(exporter, /<input\(\?!\[\^>\]\*\\bdisabled/);
  assert.match(exporter, /project preview · open the full app for audio response/);
});

test('capable browsers automatically restore the original runtime while older browsers retain the fallback', () => {
  assert.match(script, /supportsModules\) restoreRuntime\(\)/);
  assert.doesNotMatch(exporter, /enable-interactive-previews/);
  assert.match(script, /template\.content\.querySelectorAll\('script'\)/);
  assert.match(script, /document\.body\.appendChild\(restoredScript\)/);
  assert.match(script, /restoreStaticCopy\(\)/);
  assert.doesNotMatch(script, /=>|\bconst\b|\blet\b|`/);
});

test('the unenhanced phone view retains an image fallback', () => {
  assert.match(stylesheet, /jelly\.svg/);
  assert.match(stylesheet, /@media \(max-width: 44rem\)/);
});
