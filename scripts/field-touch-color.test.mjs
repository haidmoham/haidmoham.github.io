import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

// These tests describe the COLOR touch-command boundary. They deliberately do
// not import field-physics.js: mobile magnet behavior is outside this change.
const moduleUrl = `${pathToFileURL(new URL('../field-input.js', import.meta.url).pathname).href}?touchColorTest=${Date.now()}`;
const {
  clampScrollColorCommand,
  shouldQueueTouchColorCommand,
  touchColorWake,
} = await import(moduleUrl);
const colorModuleUrl = `${pathToFileURL(new URL('../field-color.js', import.meta.url).pathname).href}?touchColorBurstTest=${Date.now()}`;
const { createFieldColor } = await import(colorModuleUrl);

test('a fresh touch sample queues exactly one color command', () => {
  assert.equal(shouldQueueTouchColorCommand({
    freshSample: true,
    sampleId: 1,
    lastQueuedSampleId: null,
    cancelled: false,
  }), true);

  // A second animation frame for the same physical sample is not a new dab.
  assert.equal(shouldQueueTouchColorCommand({
    freshSample: false,
    sampleId: 1,
    lastQueuedSampleId: 1,
    cancelled: false,
  }), false);

  // Replaying the same sample must remain idempotent even if the caller marks
  // it fresh again after a render retry.
  assert.equal(shouldQueueTouchColorCommand({
    freshSample: true,
    sampleId: 1,
    lastQueuedSampleId: 1,
    cancelled: false,
  }), false);

  assert.equal(shouldQueueTouchColorCommand({
    freshSample: true,
    sampleId: 2,
    lastQueuedSampleId: 1,
    cancelled: false,
  }), true);
});

test('a held touch without fresh samples does not re-stamp color', () => {
  assert.equal(shouldQueueTouchColorCommand({
    phase: 'hold',
    freshSample: false,
    sampleId: 7,
    lastQueuedSampleId: 7,
    cancelled: false,
  }), false);
});

test('a stationary pointerup does not duplicate the tap color command', () => {
  assert.equal(shouldQueueTouchColorCommand({
    phase: 'up',
    freshSample: false,
    sampleId: 21,
    lastQueuedSampleId: 21,
    cancelled: false,
  }), false);

  // Even if a browser reports the terminal sample again, the same sample id
  // remains idempotent at pointerup.
  assert.equal(shouldQueueTouchColorCommand({
    phase: 'up',
    freshSample: true,
    sampleId: 21,
    lastQueuedSampleId: 21,
    cancelled: false,
  }), false);
});

test('tap and hold have zero directional wake while drag preserves direction', () => {
  assert.deepEqual(
    touchColorWake({ phase: 'tap', velocity: { x: 2400, y: -600 } }),
    { x: 0, y: 0 },
  );
  assert.deepEqual(
    touchColorWake({ phase: 'hold', velocity: { x: 2400, y: -600 } }),
    { x: 0, y: 0 },
  );
  assert.deepEqual(
    touchColorWake({ phase: 'hold', velocity: { x: 0, y: 0 }, delta: { x: 999, y: -999 } }),
    { x: 0, y: 0 },
  );

  const dragWake = touchColorWake({ phase: 'drag', velocity: { x: 2400, y: -600 } });
  assert.ok(dragWake.x > 0);
  assert.ok(dragWake.y < 0);
  assert.ok(Math.abs(Math.hypot(dragWake.x, dragWake.y) - 1) < 1e-8);
});

test('cancel clears pending color injection', () => {
  assert.equal(shouldQueueTouchColorCommand({
    freshSample: true,
    sampleId: 12,
    lastQueuedSampleId: 11,
    cancelled: true,
  }), false);
});

test('ended touch cannot authorize an unrelated later scroll color command', () => {
  assert.equal(shouldQueueTouchColorCommand({
    phase: 'scroll',
    freshSample: true,
    sampleId: 30,
    lastQueuedSampleId: 29,
    cancelled: false,
    touchActive: false,
    scrollEligible: false,
  }), false);
});

test('scroll-color commands stay bounded while preserving small scroll deltas', () => {
  assert.deepEqual(
    clampScrollColorCommand({ deltaX: 12, deltaY: -9, maxDistance: 80 }),
    { x: 12, y: -9 },
  );

  const bounded = clampScrollColorCommand({
    deltaX: 100000,
    deltaY: -100000,
    maxDistance: 80,
  });
  assert.ok(Math.hypot(bounded.x, bounded.y) <= 80 + 1e-8);
});

test('a burst of more than eight color commands is not silently dropped', () => {
  const drawCalls = { fills: 0, strokes: 0 };
  const context = {
    clearRect() {},
    setTransform() {},
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
    beginPath() {},
    arc() {},
    moveTo() {},
    lineTo() {},
    fill() { drawCalls.fills += 1; },
    stroke() { drawCalls.strokes += 1; },
  };
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    getBoundingClientRect() { return { width: 640, height: 360 }; },
    getContext(type) { return type === '2d' ? context : null; },
  };
  const color = createFieldColor(canvas, { colorSeed: 17, maxSamples: 18 });
  const commands = Array.from({ length: 12 }, (_, index) => ({
    phase: 'drag',
    position: { x: 40 + index * 36, y: 80 },
    velocity: { x: 420, y: 0 },
    wake: { x: 1, y: 0 },
    energy: 0.7,
  }));
  color.render({ enabled: true, commands }, 1 / 60);
  // Commands enter the persistent sample pool after the command pass; the
  // next frame must draw every queued sample, not only a first-frame subset.
  color.render({ enabled: true }, 1 / 60);
  assert.ok(drawCalls.fills >= commands.length,
    `expected all ${commands.length} commands to render, saw ${drawCalls.fills} fill calls`);
  color.destroy();
});

test('interactive pages use a coherent bumped asset-query set', () => {
  const repoRoot = new URL('..', import.meta.url);
  const htmlFiles = fs.readdirSync(repoRoot).filter((file) => file.endsWith('.html'));
  const fieldVersions = [];
  const styleVersions = [];
  for (const file of htmlFiles) {
    const source = fs.readFileSync(new URL(file, repoRoot), 'utf8');
    if (!source.includes('field.js?v=')) continue;
    const fieldMatch = source.match(/field\.js\?v=(\d+)/);
    const styleMatch = source.match(/style\.css\?v=(\d+)/);
    assert.ok(fieldMatch, `${file} must version field.js`);
    assert.ok(styleMatch, `${file} must version style.css`);
    fieldVersions.push(Number(fieldMatch[1]));
    styleVersions.push(Number(styleMatch[1]));
  }
  assert.ok(fieldVersions.length > 0, 'expected at least one interactive page');
  assert.equal(new Set(fieldVersions).size, 1, 'interactive pages must share one field.js query version');
  assert.equal(new Set(styleVersions).size, 1, 'interactive pages must share one style.css query version');

  const fieldSource = fs.readFileSync(new URL('../field.js', import.meta.url), 'utf8');
  const physicsVersion = Number(fieldSource.match(/field-physics\.js\?v=(\d+)/)?.[1]);
  const colorVersion = Number(fieldSource.match(/field-color\.js\?v=(\d+)/)?.[1]);
  const inputVersion = Number(fieldSource.match(/field-input\.js\?v=(\d+)/)?.[1]);
  assert.ok(fieldVersions[0] >= 17, 'field.js query must advance after the mobile-default change');
  assert.ok(styleVersions[0] >= 36, 'style.css query must advance after the mobile beta label');
  assert.ok(colorVersion >= 11, 'field-color.js query must advance after the touch-color change');
  assert.ok(inputVersion >= 8, 'field-input.js query must advance after the mobile-default change');
  assert.ok(physicsVersion >= 10, 'field-physics.js query must remain explicitly versioned');
});
