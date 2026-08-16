import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const moduleUrl = `${pathToFileURL(new URL('../field-color.js', import.meta.url).pathname).href}?test=${Date.now()}`;
const {
  advanceColorProgress,
  createFieldColor,
  smoothRandomHue,
  shouldInjectPigment,
  surfaceTensionEdge,
  INITIAL_PIGMENT_RGB,
} = await import(moduleUrl);

test('height-only viewport preservation keeps the color backing store alive', () => {
  const context = {
    clearRect() {},
    setTransform(...values) { this.transform = values; },
  };
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    getBoundingClientRect() { return { width: 390, height: 844 }; },
    getContext(type) { return type === '2d' ? context : null; },
  };
  const color = createFieldColor(canvas, { devicePixelRatio: 2 });
  const initialBacking = { width: canvas.width, height: canvas.height };
  color.resize(390, 780, 2, { preserve: true });
  assert.deepEqual({ width: canvas.width, height: canvas.height }, initialBacking);
  assert.equal(canvas.style.height, '780px');
  assert.equal(context.transform[0], canvas.width / 390);
  assert.equal(context.transform[3], canvas.height / 780);

  color.resize(844, 390, 2);
  assert.notDeepEqual({ width: canvas.width, height: canvas.height }, initialBacking);
  color.destroy();
});

const circularStep = (from, to) => Math.abs(((to - from + 1.5) % 1) - 0.5);

test('session-seeded hue evolves smoothly across realistic gesture samples', () => {
  let progress = 0;
  let hue = smoothRandomHue(progress, 314159);
  let largestStep = 0;
  for (let index = 0; index < 120; index += 1) {
    const nextProgress = advanceColorProgress(progress, {
      velocity: { x: index % 2 ? 2400 : -2400, y: 0 },
      energy: 1,
    }, 1 / 60, { width: 1440, height: 900 });
    const nextHue = smoothRandomHue(nextProgress, 314159);
    largestStep = Math.max(largestStep, circularStep(hue, nextHue));
    progress = nextProgress;
    hue = nextHue;
  }
  assert.ok(largestStep > 0 && largestStep < 0.012,
    `expected no frame-sized hue jump, largest step was ${largestStep}`);
});

test('random hue progress is invariant to gesture direction at equal speed', () => {
  const forward = advanceColorProgress(0.2, {
    velocity: { x: 1800, y: 0 }, energy: 0.8,
  }, 1 / 60, { width: 1024, height: 768 });
  const reverse = advanceColorProgress(0.2, {
    velocity: { x: -1800, y: 0 }, energy: 0.8,
  }, 1 / 60, { width: 1024, height: 768 });
  const vertical = advanceColorProgress(0.2, {
    velocity: { x: 0, y: 1800 }, energy: 0.8,
  }, 1 / 60, { width: 1024, height: 768 });
  assert.equal(forward, reverse);
  assert.equal(forward, vertical);
});

test('invalid or stale-like progress inputs remain finite and bounded per frame', () => {
  const progress = advanceColorProgress(Number.NaN, {
    velocity: { x: Number.POSITIVE_INFINITY, y: 0 },
    energy: Number.POSITIVE_INFINITY,
  }, 5, { width: 0, height: 0 });
  assert.ok(Number.isFinite(progress));
  assert.ok(progress >= 0 && progress < 0.01);
});

test('seeded hue targets are deterministic, non-linear, and non-monotonic', () => {
  const first = Array.from({ length: 16 }, (_, index) => smoothRandomHue(index, 8675309));
  const repeat = Array.from({ length: 16 }, (_, index) => smoothRandomHue(index, 8675309));
  const other = Array.from({ length: 16 }, (_, index) => smoothRandomHue(index, 42));
  const signedSteps = first.slice(1).map((value, index) =>
    ((value - first[index] + 1.5) % 1) - 0.5);
  assert.deepEqual(first, repeat);
  assert.notDeepEqual(first, other);
  assert.ok(signedSteps.some((step) => step > 0));
  assert.ok(signedSteps.some((step) => step < 0));
  assert.ok(new Set(signedSteps.map((step) => step.toFixed(4))).size > 10,
    'expected an irregular target sequence rather than a fixed linear step');
});

test('every session begins in a warm light-vermilion family before random meandering', () => {
  assert.deepEqual(INITIAL_PIGMENT_RGB, [236, 88, 72]);
  assert.equal(smoothRandomHue(0, 1), 0);
  assert.equal(smoothRandomHue(0, 8675309), 0);
  assert.ok(circularStep(0, smoothRandomHue(0.08, 8675309)) < 0.02,
    'expected the first visible marks to remain near the warm-red baseline');
});

test('residual spring energy cannot inject pigment after physical input stops', () => {
  assert.equal(shouldInjectPigment({ enabled: true, inject: false, energy: 0.9 }), false);
  assert.equal(shouldInjectPigment({ enabled: true, inject: true, energy: 0.9 }), true);
  assert.equal(shouldInjectPigment({ enabled: true, inject: true, energy: 0 }), false);
  assert.equal(shouldInjectPigment({ enabled: false, inject: true, energy: 0.9 }), false);
});

test('surface-tension edge is absent in uniform fluid, positive at boundaries, and bounded', () => {
  assert.equal(surfaceTensionEdge(0.7, 0.7, 0.7, 0.7, 0.7), 0);
  assert.equal(surfaceTensionEdge(0, 1, 0, 1, 0), 0,
    'transparent exterior pixels must not expand the contour');
  const boundary = surfaceTensionEdge(0.45, 0.8, 0.1, 0.7, 0.2);
  assert.ok(boundary > 0 && boundary <= 1, `expected bounded boundary signal, got ${boundary}`);
  for (const values of [[2, -1, 4, 0, 1], [0.1, 1, 0, 1, 0], [1, 0, 1, 0, 1]]) {
    const edge = surfaceTensionEdge(...values);
    assert.ok(edge >= 0 && edge <= 1);
  }
});
