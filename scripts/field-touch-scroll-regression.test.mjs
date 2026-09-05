import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const inputUrl = `${new URL('../field-input.js', import.meta.url).href}?touchScrollRegression=${Date.now()}`;
const colorUrl = `${new URL('../field-color.js', import.meta.url).href}?touchGeometryRegression=${Date.now()}`;
const input = await import(inputUrl);
const color = await import(colorUrl);

function requireFunction(module, name) {
  assert.equal(typeof module[name], 'function', `${name} must be exported as a pure contract helper`);
  return module[name];
}

test('touch movement below the slop threshold remains a radial tap/hold, not a directional drag', () => {
  const classify = requireFunction(input, 'classifyTouchColorPhase');
  assert.equal(classify({ distance: 0 }), 'tap');
  assert.equal(classify({ distance: 4, slop: 8 }), 'tap');
  assert.equal(classify({ distance: 8, slop: 8 }), 'tap');
  assert.equal(classify({ distance: 8.01, slop: 8 }), 'drag');
  assert.equal(classify({ distance: 32, slop: 8 }), 'drag');

  // Pen input is an intentional drawing tool: its first move is directional
  // even before it has accumulated the touch slop distance.
  assert.equal(classify({ pointerType: 'pen', distance: 0, slop: 8 }), 'drag');
  assert.equal(classify({ pointerType: 'pen', distance: 2, slop: 8 }), 'drag');
});

test('pointercancel hands native scrolling a bounded recent-touch session', () => {
  const begin = requireFunction(input, 'touchScrollSessionFromPointerEnd');
  const session = begin({
    pointerType: 'touch',
    eventType: 'pointercancel',
    now: 1000,
    position: { x: 240, y: 320 },
  });
  assert.equal(session.activePointer, false);
  assert.equal(session.scrollSessionActive, true);
  assert.equal(session.startedAt, 1000);
  assert.deepEqual(session.anchor, { x: 240, y: 320 });

  const ordinaryUp = begin({
    pointerType: 'touch',
    eventType: 'pointerup',
    now: 1000,
    position: { x: 240, y: 320 },
  });
  assert.equal(ordinaryUp.scrollSessionActive, false);
});

test('pen pointercancel is not mistaken for a native touch-scroll session', () => {
  const begin = requireFunction(input, 'touchScrollSessionFromPointerEnd');
  const session = begin({
    pointerType: 'pen',
    eventType: 'pointercancel',
    now: 1000,
    position: { x: 240, y: 320 },
  });
  assert.equal(session.scrollSessionActive, false);
});

test('native scroll remains color-authorized after cancel only inside the recent-touch window', () => {
  const shouldQueue = requireFunction(input, 'shouldQueueScrollColorCommand');
  const base = {
    activePointer: false,
    pointerType: 'touch',
    recentlyDirect: true,
    scrollSessionActive: true,
    sessionStartedAt: 1000,
    now: 1200,
    sessionDurationMs: 1500,
    distance: 18,
  };
  assert.equal(shouldQueue(base), true);
  assert.equal(shouldQueue({ ...base, now: 2499 }), true);
  assert.equal(shouldQueue({ ...base, now: 2500 }), false);
  assert.equal(shouldQueue({ ...base, now: 1200, scrollSessionActive: false }), false);
  assert.equal(shouldQueue({ ...base, now: 1200, pointerType: 'mouse' }), false);
});

function fallbackContext(drawCalls) {
  return {
    clearRect() {},
    setTransform() {},
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
    beginPath() {},
    arc() {},
    moveTo() {},
    lineTo() { drawCalls.tails += 1; },
    fill() {},
    stroke() {},
  };
}

test('fallback rendering keeps ordinary tap, hold, and scroll marks free of filament tails', () => {
  const createFieldColor = requireFunction(color, 'createFieldColor');
  for (const phase of ['tap', 'hold', 'scroll']) {
    const drawCalls = { tails: 0 };
    const context = fallbackContext(drawCalls);
    const canvas = {
      width: 0,
      height: 0,
      style: {},
      getBoundingClientRect() { return { width: 640, height: 360 }; },
      getContext(type) { return type === '2d' ? context : null; },
    };
    const renderer = createFieldColor(canvas, { colorSeed: 23, maxSamples: 18 });
    renderer.render({ enabled: true, commands: [{
      phase,
      position: { x: 200, y: 120 },
      velocity: { x: 900, y: -200 },
      // A stale directional wake must not turn an ordinary gesture into a
      // tail. Intentional drag is tested separately below.
      wake: { x: 1, y: 0 },
      energy: 0.7,
    }] }, 1 / 60);
    renderer.render({ enabled: true }, 1 / 60);
    assert.equal(drawCalls.tails, 0, `${phase} should not draw directional line geometry`);
    renderer.destroy();
  }
});

test('ordinary touch geometry is radial while intentional drag remains separately directional', () => {
  const geometry = requireFunction(color, 'touchColorGeometry');
  for (const phase of ['tap', 'hold', 'scroll']) {
    assert.deepEqual(geometry({ phase, wake: { x: 1, y: 0 } }), {
      directional: false,
      filamentCount: 0,
      tailLength: 0,
    });
  }
  const drag = geometry({ phase: 'drag', wake: { x: 1, y: 0 } });
  assert.equal(drag.directional, true);
  assert.ok(drag.filamentCount > 0);
  assert.ok(drag.tailLength > 0);
});

test('pointer policy keeps pen drawing directional while touch remains radial and scroll-authorized', () => {
  const policy = requireFunction(input, 'touchColorPointerPolicy');
  assert.deepEqual(policy({ pointerType: 'touch', phase: 'drag' }), {
    radial: true,
    intentionalDrag: false,
    scrollSession: true,
  });
  assert.deepEqual(policy({ pointerType: 'pen', phase: 'drag' }), {
    radial: false,
    intentionalDrag: true,
    scrollSession: false,
  });
});

test('WebGL shader source contains an explicit ordinary-touch tail gate', async () => {
  const source = await readFile(new URL('../field-color.js', import.meta.url), 'utf8');
  assert.match(
    source,
    /(?:touchColorGeometry|uGesture(?:Phase|Kind)|intentionalDrag|ordinaryTouch)/,
    'WebGL color geometry must receive an explicit gesture-phase gate, not infer tails from velocity alone',
  );
});
