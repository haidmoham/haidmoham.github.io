import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// The site is a static module without package.json/module metadata. Loading it
// through its URL keeps the test faithful to browser ES-module semantics.
const moduleUrl = `${pathToFileURL(new URL('../field-physics.js', import.meta.url).pathname).href}?test=${Date.now()}`;
const { createFieldPhysics } = await import(moduleUrl);

test('bounds displacement even under a strong pointer charge', () => {
  const physics = createFieldPhysics({
    glyphs: [{ x: 0, y: 0 }],
    chargeStrength: 100000,
    maxDisplacement: 18,
  });
  physics.setPointer({ x: -1, y: 0, active: true });
  for (let index = 0; index < 240; index += 1) physics.update(1 / 60);
  const glyph = physics.getFrame().glyphs[0];
  assert.ok(Math.hypot(glyph.dx, glyph.dy) <= 18 + 1e-8);
});

test('home spring and damping return a displaced glyph to equilibrium', () => {
  const physics = createFieldPhysics({ glyphs: [{ x: 100, y: 100 }] });
  physics.setPointer({ x: 0, y: 100, active: true });
  for (let index = 0; index < 90; index += 1) physics.update(1 / 60);
  physics.setPointer({ active: false });
  for (let index = 0; index < 360; index += 1) physics.update(1 / 60);
  const glyph = physics.getFrame().glyphs[0];
  assert.ok(Math.hypot(glyph.dx, glyph.dy) < 0.1);
  assert.ok(Math.hypot(glyph.vx, glyph.vy) < 0.1);
});

test('energy decays after the pointer leaves', () => {
  const physics = createFieldPhysics({ glyphs: [{ x: 0, y: 0 }] });
  physics.setPointer({ x: 80, y: 0, active: true });
  for (let index = 0; index < 30; index += 1) physics.update(1 / 60);
  const activeEnergy = physics.getFrame().energy;
  physics.setPointer({ active: false });
  for (let index = 0; index < 180; index += 1) physics.update(1 / 60);
  assert.ok(physics.getFrame().energy < activeEnergy);
});

test('a fast nearby pointer sweep creates visible but bounded displacement', () => {
  const physics = createFieldPhysics({
    glyphs: [{ x: 0, y: 0 }],
    maxDisplacement: 24,
  });
  physics.setPointer({ x: 2, y: 0, vx: 180, vy: 0, active: true });
  for (let index = 0; index < 8; index += 1) physics.update(1 / 60);
  const glyph = physics.getFrame().glyphs[0];
  const displacement = Math.hypot(glyph.dx, glyph.dy);
  assert.ok(displacement > 1, `expected visible displacement, got ${displacement}`);
  assert.ok(displacement <= 24 + 1e-8);
});

test('fast pointer velocity contributes materially to normalized frame energy', () => {
  const stationary = createFieldPhysics({ glyphs: [{ x: 0, y: 0 }] });
  stationary.setPointer({ x: 2, y: 0, active: true });
  stationary.update(1 / 60);
  const stationaryEnergy = stationary.getFrame().energy;

  const fast = createFieldPhysics({ glyphs: [{ x: 0, y: 0 }] });
  fast.setPointer({ x: 2, y: 0, vx: 180, vy: 0, active: true });
  fast.update(1 / 60);
  const fastEnergy = fast.getFrame().energy;
  assert.ok(fastEnergy > stationaryEnergy + 0.15,
    `expected fast energy ${fastEnergy} to exceed stationary ${stationaryEnergy}`);
  assert.ok(fastEnergy <= 1);
});

test('reduced motion removes idle movement and applies a smaller bound', () => {
  const physics = createFieldPhysics({
    glyphs: [{ x: 0, y: 0 }],
    reducedMotion: true,
    reducedMotionMaxDisplacement: 6,
  });
  const initial = physics.getFrame().glyphs[0];
  physics.update(1);
  const idle = physics.getFrame().glyphs[0];
  assert.equal(idle.x, initial.x);
  assert.equal(idle.y, initial.y);
  physics.setPointer({ x: -100, y: 0, active: true });
  for (let index = 0; index < 120; index += 1) physics.update(1 / 60);
  const displaced = physics.getFrame().glyphs[0];
  assert.ok(Math.hypot(displaced.dx, displaced.dy) <= 6 + 1e-8);
});
