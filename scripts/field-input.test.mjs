import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const moduleUrl = `${pathToFileURL(new URL('../field-input.js', import.meta.url).pathname).href}?test=${Date.now()}`;
const {
  classifyFieldViewportChange,
  DIRECT_TOUCH_ACTIVE_MS,
  DIRECT_TOUCH_CHARGE_SCALE,
  POINTER_ACTIVE_MS,
  isDirectPointerType,
  pointerActivityDeadline,
  shouldStartDirectFieldGesture,
} = await import(moduleUrl);

test('touch-driven browser chrome resizes preserve the field while layout changes reflow', () => {
  const previous = { width: 390, height: 844, dpr: 3 };
  assert.equal(classifyFieldViewportChange(previous, { ...previous, height: 780 }, {
    recentDirectInput: true,
  }), 'transient-height');
  assert.equal(classifyFieldViewportChange(previous, { ...previous, height: 780 }, {
    recentDirectInput: false,
  }), 'layout');
  assert.equal(classifyFieldViewportChange(previous, { ...previous, width: 844, height: 390 }, {
    recentDirectInput: true,
  }), 'layout');
  assert.equal(classifyFieldViewportChange(previous, { ...previous, dpr: 2 }, {
    recentDirectInput: true,
  }), 'layout');
  assert.equal(classifyFieldViewportChange(previous, previous, { recentDirectInput: true }), 'none');
});

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

test('Field Table scopes direct manipulation to its stage and preserves native touch gestures', async () => {
  const [controller, stylesheet, inputModule] = await Promise.all([
    readFile(new URL('../field.js', import.meta.url), 'utf8'),
    readFile(new URL('../style.css', import.meta.url), 'utf8'),
    readFile(new URL('../field-input.js', import.meta.url), 'utf8'),
  ]);

  const stageBinding = controller.match(
    /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*document\.querySelector\(\s*(['"])\[data-field-stage\]\2\s*\)/,
  );
  assert.ok(stageBinding, 'the controller should bind the authored Field Table stage');
  const stageName = stageBinding[1].replace(/[$]/g, '\\$&');
  for (const eventName of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
    assert.match(
      controller,
      new RegExp(`${stageName}\\.addEventListener\\(\\s*['"]${eventName}['"]`),
      `${eventName} should be stage-scoped`,
    );
  }
  assert.doesNotMatch(
    controller,
    /window\.(?:add|remove)EventListener\(\s*['"]pointer(?:down|move|up|cancel)['"]/,
    'pointer listeners must not take over the window',
  );
  assert.match(
    controller,
    /\.setPointerCapture\(\s*event\.pointerId\s*\)/,
    'a claimed direct-manipulation pointer should be captured by the stage',
  );
  assert.match(controller, /preserve: true/);
  assert.doesNotMatch(inputModule, /innerWidth|screen\.width|max-width/);
  assert.match(
    stylesheet,
    /\[data-field-stage\][^{]*\{[^}]*touch-action:\s*pan-y\s+pinch-zoom\s*;/s,
  );
});

test('Field Table exposes explicit modes and keeps visual feedback decorative', async () => {
  const [controller, stylesheet, page] = await Promise.all([
    readFile(new URL('../field.js', import.meta.url), 'utf8'),
    readFile(new URL('../style.css', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
  ]);

  assert.match(page, /role="radiogroup"[^>]*aria-label="Field mode"/);
  for (const mode of ['color', 'magnetic', 'still']) {
    assert.match(
      page,
      new RegExp(`<button[^>]+role="radio"[^>]+data-field-mode="${mode}"[^>]+aria-checked="(?:true|false)"`),
      `${mode} should have its own radio-like button`,
    );
  }
  assert.match(controller, /querySelectorAll\(\s*(['"])\[data-field-mode\]\1\s*\)/);
  assert.match(controller, /setAttribute\(\s*(['"])aria-checked\1\s*,/);
  assert.doesNotMatch(controller, /cycleMode|cycle typography field mode|select to cycle/i);

  assert.match(controller, /field-table-probe/);
  assert.match(controller, /data-field-probe/);
  assert.match(controller, /canvas\.setAttribute\(\s*(['"])aria-hidden\1\s*,\s*(['"])true\2\s*\)/);
  assert.match(controller, /probe\.setAttribute\(\s*(['"])aria-hidden\1\s*,\s*(['"])true\2\s*\)/);
  assert.match(stylesheet, /\.field-(?:color|table)-canvas[^{]*\{[^}]*pointer-events:\s*none\s*;/s);
  assert.match(stylesheet, /\.field-table-probe[^{]*\{[^}]*pointer-events:\s*none\s*;/s);
});

test('Field Table controls retain touch sizing, safe areas, and fine-pointer hover', async () => {
  const stylesheet = await readFile(new URL('../style.css', import.meta.url), 'utf8');

  assert.match(stylesheet, /field-table-(?:modes|reset)[^{]*\{[^}]*min-height:\s*48px\s*;/s);
  assert.match(stylesheet, /env\(safe-area-inset-(?:bottom|left|right)\)/);
  assert.match(
    stylesheet,
    /@media\s*\(\s*hover:\s*hover\s*\)\s*and\s*\(\s*pointer:\s*fine\s*\)/,
  );
});

test('Field Table suppresses text selection only while direct manipulation is active', async () => {
  const stylesheet = await readFile(new URL('../style.css', import.meta.url), 'utf8');
  const baseStageRule = stylesheet.match(/\[data-field-stage\][^{]*\{([^}]*)\}/s);
  const interactingRule = stylesheet.match(/\.field-table-interacting[^{]*\{([^}]*)\}/s);

  assert.ok(baseStageRule, 'the Field Table stage should have a base rule');
  assert.doesNotMatch(
    baseStageRule[1],
    /(?:^|[;\s])-?(?:webkit-)?user-select\s*:/,
    'the resting stage must leave text selectable',
  );
  assert.ok(interactingRule, 'direct manipulation should have a temporary interaction rule');
  assert.match(interactingRule[1], /(?:^|[;\s])user-select:\s*none\s*;/);
  assert.match(interactingRule[1], /(?:^|[;\s])-webkit-user-select:\s*none\s*;/);
});
