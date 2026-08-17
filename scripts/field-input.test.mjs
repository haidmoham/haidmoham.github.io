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
  resolveFieldInputModality,
  resolveInitialFieldMode,
  shouldTrackFieldPointerMove,
  shouldStartDirectFieldGesture,
  shouldQueueTouchPointerEnd,
  shouldQueueScrollColorCommand,
  consumeColorCommandBatch,
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

test('field presentation follows the primary capability until an actual pointer takes over', () => {
  assert.equal(resolveFieldInputModality('', { primaryFine: true, primaryCoarse: false }), 'cursor');
  assert.equal(resolveFieldInputModality('', { primaryFine: true, primaryCoarse: true }), 'cursor');
  assert.equal(resolveFieldInputModality('', { primaryFine: false, primaryCoarse: true }), 'touch');
  assert.equal(resolveFieldInputModality('', { primaryFine: false, primaryCoarse: false }), 'pointer');

  assert.equal(resolveFieldInputModality('mouse', { primaryCoarse: true }), 'cursor');
  assert.equal(resolveFieldInputModality('touch', { primaryFine: true }), 'touch');
  assert.equal(resolveFieldInputModality('pen', { primaryFine: true }), 'pen');
});

test('coarse touch capability defaults to Magnet while fine pointers retain Color', () => {
  assert.deepEqual(resolveInitialFieldMode({ primaryCoarse: true }), {
    mode: 'magnetic', explicit: false,
  });
  assert.deepEqual(resolveInitialFieldMode({ primaryFine: true, primaryCoarse: true }), {
    mode: 'color', explicit: false,
  });
  assert.deepEqual(resolveInitialFieldMode({ primaryFine: true }), {
    mode: 'color', explicit: false,
  });
});

test('saved mode is explicit and survives capability and reduced-motion changes', () => {
  assert.deepEqual(resolveInitialFieldMode({
    storedMode: 'color',
    reducedMotion: true,
    primaryCoarse: true,
  }), { mode: 'color', explicit: true });
  assert.deepEqual(resolveInitialFieldMode({
    storedMode: 'magnetic',
    primaryFine: true,
  }), { mode: 'magnetic', explicit: true });
  assert.deepEqual(resolveInitialFieldMode({
    storedMode: 'not-a-mode',
    reducedMotion: true,
    primaryCoarse: true,
  }), { mode: 'still', explicit: false });
});

test('mouse hover drives the field while touch and pen still require ownership', () => {
  assert.equal(shouldTrackFieldPointerMove({
    pointerType: 'mouse', pointerId: 4, ownedPointerId: null,
  }), true);
  assert.equal(shouldTrackFieldPointerMove({
    pointerType: 'mouse', pointerId: 4, ownedPointerId: null, interactiveTarget: true,
  }), false);
  assert.equal(shouldTrackFieldPointerMove({
    pointerType: 'touch', pointerId: 8, ownedPointerId: null,
  }), false);
  assert.equal(shouldTrackFieldPointerMove({
    pointerType: 'pen', pointerId: 9, ownedPointerId: null,
  }), false);
  assert.equal(shouldTrackFieldPointerMove({
    pointerType: 'touch', pointerId: 8, ownedPointerId: 8,
  }), true);
  assert.equal(shouldTrackFieldPointerMove({
    pointerType: 'touch', pointerId: 7, ownedPointerId: 8,
  }), false);
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

test('stationary pointerup does not create a duplicate color command', () => {
  assert.equal(shouldQueueTouchPointerEnd({
    moved: false,
    freshSample: false,
    cancelled: false,
  }), false);
  assert.equal(shouldQueueTouchPointerEnd({
    moved: true,
    freshSample: true,
    cancelled: false,
  }), true);
  assert.equal(shouldQueueTouchPointerEnd({
    moved: true,
    freshSample: true,
    cancelled: true,
  }), false);
});

test('a burst command batch retains every command beyond the WebGL pass budget', () => {
  const burst = Array.from({ length: 12 }, (_, index) => ({ sampleId: index + 1 }));
  const first = consumeColorCommandBatch(burst, 8);
  assert.equal(first.commands.length, 8);
  assert.equal(first.remaining.length, 4);
  assert.deepEqual(
    [...first.commands, ...first.remaining],
    burst,
    'consumption must not silently discard commands above the per-frame pass budget',
  );
  const second = consumeColorCommandBatch(first.remaining, 8);
  assert.deepEqual(second.commands, burst.slice(8));
  assert.deepEqual(second.remaining, []);
});

test('ended touch cannot authorize unrelated later scroll color', () => {
  assert.equal(shouldQueueScrollColorCommand({
    activePointer: false,
    pointerType: 'touch',
    recentlyDirect: true,
    distance: 12,
  }), false);
  assert.equal(shouldQueueScrollColorCommand({
    activePointer: true,
    pointerType: 'touch',
    recentlyDirect: true,
    distance: 12,
  }), true);
  assert.equal(shouldQueueScrollColorCommand({
    activePointer: false,
    pointerType: 'mouse',
    recentlyDirect: true,
    distance: 12,
  }), false);
});

test('the site-wide field owns input from the document body and preserves native touch gestures', async () => {
  const [controller, stylesheet, inputModule] = await Promise.all([
    readFile(new URL('../field.js', import.meta.url), 'utf8'),
    readFile(new URL('../style.css', import.meta.url), 'utf8'),
    readFile(new URL('../field-input.js', import.meta.url), 'utf8'),
  ]);

  const surfaceBinding = controller.match(
    /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*document\.body\s*;/,
  );
  assert.ok(surfaceBinding, 'the controller should bind the document-wide interaction surface');
  const surfaceName = surfaceBinding[1].replace(/[$]/g, '\\$&');
  for (const eventName of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
    assert.match(
      controller,
      new RegExp(`${surfaceName}\\.addEventListener\\(\\s*['"]${eventName}['"]`),
      `${eventName} should cover the authored site-wide field`,
    );
  }
  assert.doesNotMatch(
    controller,
    /window\.(?:add|remove)EventListener\(\s*['"]pointer(?:down|move|up|cancel)['"]/,
    'pointer listeners must not take over the window',
  );
  assert.match(
    controller,
    /interactionSurface\.setPointerCapture\(\s*event\.pointerId\s*\)/,
    'a claimed direct-manipulation pointer should be captured by the stage',
  );
  assert.match(controller, /preserve: true/);
  assert.doesNotMatch(inputModule, /innerWidth|screen\.width|max-width/);
  assert.match(
    stylesheet,
    /\[data-field-stage\][^{]*\{[^}]*touch-action:\s*pan-y\s+pinch-zoom\s*;/s,
  );
});

test('the site probe stays fixed instead of extending native scroll range', async () => {
  const stylesheet = await readFile(new URL('../style.css', import.meta.url), 'utf8');
  const broadChildRule = stylesheet.match(/(body:not\(\.robotics-page\)\s*>\s*\*\s*)\{([^}]*)\}/s);
  assert.ok(broadChildRule, 'the site-wide child stacking rule should remain explicit');
  const broadSelector = broadChildRule[1];
  const broadDeclarations = broadChildRule[2];
  const probeFixedImportant = /\.field-site-probe\s*\{[^}]*position:\s*fixed\s*!important\s*;/s.test(stylesheet);
  const broadRuleExcludesProbe = /:not\(\s*\.field-site-probe\s*\)/.test(broadSelector);

  assert.ok(
    !/position:\s*relative\s*;/.test(broadDeclarations) || broadRuleExcludesProbe || probeFixedImportant,
    'the body child position rule must not override the fixed field-site-probe and add phantom scroll height',
  );
});

test('interaction assets bump their cache versions when the touch contract changes', async () => {
  const [controller, stylesheet, page] = await Promise.all([
    readFile(new URL('../field.js', import.meta.url), 'utf8'),
    readFile(new URL('../style.css', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
  ]);
  const importedColorVersion = Number(controller.match(/field-color\.js\?v=(\d+)/)?.[1]);
  const importedInputVersion = Number(controller.match(/field-input\.js\?v=(\d+)/)?.[1]);
  const controllerVersion = Number(page.match(/field\.js\?v=(\d+)/)?.[1]);
  const stylesheetVersion = Number(page.match(/style\.css\?v=(\d+)/)?.[1]);

  assert.ok(importedColorVersion > 10, 'field-color.js cache version must advance');
  assert.ok(importedInputVersion > 7, 'field-input.js cache version must advance for the mobile default');
  assert.ok(controllerVersion > 16, 'field.js cache version must advance for the mobile default');
  assert.ok(stylesheetVersion > 35, 'style.css cache version must advance for the mobile beta label');
  assert.match(stylesheet, /\.notes-practice\s*>\s*span\s*\{/);
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

  assert.match(controller, /field-table-probe/);
  assert.match(controller, /data-field-probe/);
  assert.match(controller, /canvas\.setAttribute\(\s*(['"])aria-hidden\1\s*,\s*(['"])true\2\s*\)/);
  assert.match(controller, /probe\.setAttribute\(\s*(['"])aria-hidden\1\s*,\s*(['"])true\2\s*\)/);
  assert.match(stylesheet, /\.field-(?:color|table)-canvas[^{]*\{[^}]*pointer-events:\s*none\s*;/s);
  assert.match(stylesheet, /\.field-table-probe[^{]*\{[^}]*pointer-events:\s*none\s*;/s);
});

test('Field Table starts neutral and routes its instructions by pointer capability', async () => {
  const [controller, page] = await Promise.all([
    readFile(new URL('../field.js', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
  ]);

  assert.match(page, /data-field-kicker[^>]*>Interactive field</);
  assert.doesNotMatch(page, /data-field-kicker[^>]*>Touch field</);
  assert.match(controller, /matchMedia\?\.\(\s*['"]\(pointer: fine\)['"]\s*\)/);
  assert.match(controller, /matchMedia\?\.\(\s*['"]\(pointer: coarse\)['"]\s*\)/);
  assert.match(controller, /resolveFieldInputModality\(\s*pointerType/);
  assert.match(controller, /routeInputModality\(\s*event\.pointerType/);
  assert.match(controller, /dataset\.fieldInput/);
});

test('desktop keeps the compact mode pill while mobile keeps the explicit picker', async () => {
  const [controller, stylesheet] = await Promise.all([
    readFile(new URL('../field.js', import.meta.url), 'utf8'),
    readFile(new URL('../style.css', import.meta.url), 'utf8'),
  ]);

  assert.match(controller, /field-toggle field-mode-toggle field-table-desktop-toggle/);
  assert.match(controller, /MODE: COLOR \+ MAGNET/);
  assert.match(controller, /MODE: MAGNET ONLY/);
  assert.match(controller, /MODE: STILL/);
  assert.match(controller, /Color \(mobile beta\)/);
  assert.match(stylesheet, /\.field-table-desktop-toggle\s*\{[^}]*display:\s*none\s*;/s);
  assert.match(
    stylesheet,
    /@media\s*\(\s*hover:\s*hover\s*\)\s*and\s*\(\s*pointer:\s*fine\s*\)[^{]*\{[\s\S]*?\.field-table-dock\s*\{[^}]*display:\s*none\s*;[\s\S]*?\.field-table-desktop-toggle\s*\{[^}]*display:\s*inline-flex\s*;/,
  );
});

test('the new field retains the authored site-wide scope instead of requiring the home stage', async () => {
  const controller = await readFile(new URL('../field.js', import.meta.url), 'utf8');

  assert.match(controller, /document\.querySelectorAll\(\s*(['"])\[data-field-target\]\1\s*\)/);
  assert.doesNotMatch(controller, /if\s*\(\s*!stage\s*\|\|/);
  assert.match(controller, /document\.body\.prepend\(\s*canvas\s*\)/);
  assert.match(controller, /window\.scroll[XY]\s*-\s*physicsScroll[XY]/);
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
