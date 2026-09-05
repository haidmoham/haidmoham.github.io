import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const stylesheet = await readFile(new URL('../style.css', import.meta.url), 'utf8').then(text => text.replaceAll('\r\n', '\n'));

test('a primary coarse pointer retains one persistent, touch-sized field control', () => {
  const coarseControls = stylesheet.slice(stylesheet.indexOf('@media (pointer: coarse) {\n  .field-table-stage .hero'));

  assert.match(coarseControls, /^@media\s*\(\s*pointer:\s*coarse\s*\)/);
  assert.match(coarseControls, /\.field-table-dock\s*\{[^}]*display:\s*none\s*;/s);
  assert.match(coarseControls, /\.field-table-desktop-toggle\s*\{[^}]*display:\s*inline-flex\s*;/s);
  assert.match(stylesheet, /\.field-toggle\s*\{[^}]*position:\s*fixed\s*;/s);
  assert.match(coarseControls, /\.field-table-desktop-toggle\s*\{[^}]*min-height:\s*3\.25rem\s*;/s);
  assert.match(coarseControls, /env\(safe-area-inset-(?:right|bottom)\)/);
  assert.doesNotMatch(stylesheet, /@media\s*\(\s*any-pointer:\s*coarse\s*\)\s*\{\s*\.field-table-stage\s+\.hero[\s\S]*?\.field-mode-color\s+\.field-table-desktop-toggle::after/s);
});

test('the compact touch treatment labels color as beta without changing desktop copy', () => {
  assert.match(stylesheet, /\.field-mode-color\s+\.field-table-desktop-toggle::after\s*\{\s*content:\s*"COLOR · BETA"\s*;\s*\}/);
  assert.match(stylesheet, /\.field-mode-magnetic\s+\.field-table-desktop-toggle::after\s*\{\s*content:\s*"MAGNET"\s*;\s*\}/);
  assert.match(stylesheet, /\.field-mode-still\s+\.field-table-desktop-toggle::after\s*\{\s*content:\s*"STILL"\s*;\s*\}/);
  assert.match(stylesheet, /@media\s*\(\s*hover:\s*hover\s*\)\s*and\s*\(\s*pointer:\s*fine\s*\)[\s\S]*?\.field-table-desktop-toggle\s*\{[^}]*display:\s*inline-flex\s*;/);
});
