import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const moduleUrl = `${pathToFileURL(new URL('../field-input.js', import.meta.url).pathname).href}?test=${Date.now()}`;
const {
  DIRECT_TOUCH_ACTIVE_MS,
  DIRECT_TOUCH_CHARGE_SCALE,
  POINTER_ACTIVE_MS,
  isDirectPointerType,
  pointerActivityDeadline,
  shouldStartDirectFieldGesture,
} = await import(moduleUrl);

test('touch and pen are capability signals independent of viewport size', () => {
  for (const pointerType of ['touch', 'pen']) {
    assert.equal(isDirectPointerType(pointerType), true);
    for (const viewportWidth of [320, 768, 1366, 1920]) {
      assert.equal(shouldStartDirectFieldGesture({
        pointerType,
        mode: 'color',
        authoredTarget: true,
        interactiveTarget: false,
        viewportWidth,
      }), true);
    }
  }
  assert.equal(isDirectPointerType('mouse'), false);
});

test('direct gestures start only on authored non-interactive text in a moving mode', () => {
  const base = { pointerType: 'touch', mode: 'color', authoredTarget: true, interactiveTarget: false };
  assert.equal(shouldStartDirectFieldGesture(base), true);
  assert.equal(shouldStartDirectFieldGesture({ ...base, mode: 'still' }), false);
  assert.equal(shouldStartDirectFieldGesture({ ...base, authoredTarget: false }), false);
  assert.equal(shouldStartDirectFieldGesture({ ...base, interactiveTarget: true }), false);
  assert.equal(shouldStartDirectFieldGesture({ ...base, pointerType: 'mouse' }), false);
});

test('finger-down gets a short visible hold while moves keep the desktop cadence', () => {
  assert.equal(pointerActivityDeadline(1000, 'touch', 'down'), 1000 + DIRECT_TOUCH_ACTIVE_MS);
  assert.equal(pointerActivityDeadline(1000, 'pen', 'down'), 1000 + DIRECT_TOUCH_ACTIVE_MS);
  assert.equal(pointerActivityDeadline(1000, 'touch', 'move'), 1000 + POINTER_ACTIVE_MS);
  assert.equal(pointerActivityDeadline(1000, 'mouse', 'move'), 1000 + POINTER_ACTIVE_MS);
  assert.ok(DIRECT_TOUCH_CHARGE_SCALE > 1);
});

test('controller and CSS wire touch by pointer capability without taking over scroll', async () => {
  const [controller, stylesheet, inputModule] = await Promise.all([
    readFile(new URL('../field.js', import.meta.url), 'utf8'),
    readFile(new URL('../style.css', import.meta.url), 'utf8'),
    readFile(new URL('../field-input.js', import.meta.url), 'utf8'),
  ]);
  assert.match(controller, /addEventListener\('pointerdown', pointerDown, \{ passive: true \}\)/);
  assert.match(controller, /addEventListener\('pointercancel', pointerEnd, \{ passive: true \}\)/);
  assert.match(controller, /shouldStartDirectFieldGesture/);
  assert.doesNotMatch(inputModule, /innerWidth|screen\.width|max-width/);
  assert.match(stylesheet, /touch-action: manipulation/);
  assert.doesNotMatch(stylesheet, /\[data-field-target\][^{]*\{[^}]*touch-action:\s*none/s);
  assert.match(stylesheet, /@media \(any-pointer: coarse\)/);
  assert.match(stylesheet, /padding-bottom: calc\(4\.5rem \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(stylesheet, /@media \(hover: hover\) and \(pointer: fine\)/);
});
