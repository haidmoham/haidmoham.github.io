import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// The site is a static module without package.json/module metadata. Loading it
// through its URL keeps the test faithful to browser ES-module semantics.
const moduleUrl = `${pathToFileURL(new URL('../field-physics.js', import.meta.url).pathname).href}?test=${Date.now()}`;
const {
  createFieldPhysics,
  createWordPolarityMetadata,
  derivePointerVelocity,
  fieldPhysicsOptionsForMode,
} = await import(moduleUrl);

const polarityFixture = Array.from({ length: 20 }, (_, index) => ({
  wordIndex: Math.floor(index / 4),
  characterIndex: index % 4,
}));

test('word polarity is deterministic per seed and varies across sessions', () => {
  const first = createWordPolarityMetadata(polarityFixture, 12345);
  const repeat = createWordPolarityMetadata(polarityFixture, 12345);
  const other = createWordPolarityMetadata(polarityFixture, 54321);
  assert.deepEqual(first, repeat);
  assert.notDeepEqual(first, other);
});

test('each word has one coherent sign and charge magnitude with bounded character mass', () => {
  const metadata = createWordPolarityMetadata(polarityFixture, 24680);
  for (let wordIndex = 0; wordIndex < 5; wordIndex += 1) {
    const word = metadata.filter((glyph) => glyph.wordIndex === wordIndex);
    assert.equal(new Set(word.map((glyph) => glyph.sign)).size, 1);
    assert.equal(new Set(word.map((glyph) => glyph.chargeMagnitude)).size, 1);
    word.forEach((glyph) => {
      assert.equal(Math.sign(glyph.charge), glyph.sign);
      assert.ok(glyph.chargeMagnitude >= 0.76 && glyph.chargeMagnitude <= 1);
      assert.ok(glyph.massScale >= 0.92 && glyph.massScale <= 1.08);
    });
  }
});

test('multi-word polarity stays balanced and contains both signs', () => {
  for (const seed of [1, 2, 3, 998877]) {
    const metadata = createWordPolarityMetadata(polarityFixture, seed);
    const wordSigns = Array.from({ length: 5 }, (_, wordIndex) =>
      metadata.find((glyph) => glyph.wordIndex === wordIndex).sign);
    const positive = wordSigns.filter((sign) => sign > 0).length;
    const negative = wordSigns.filter((sign) => sign < 0).length;
    assert.ok(positive > 0 && negative > 0);
    assert.ok(Math.abs(positive - negative) <= 1);
  }
});

test('seeded polarity respects COLOR and MAGNETIC caps while STILL remains exact zero', () => {
  const descriptors = Array.from({ length: 12 }, (_, index) => ({
    wordIndex: Math.floor(index / 4),
    characterIndex: index % 4,
  }));
  const metadata = createWordPolarityMetadata(descriptors, 112358);
  const glyphs = metadata.map((glyph, index) => ({
    x: index * 28,
    y: 0,
    mass: glyph.massScale,
    charge: glyph.charge,
  }));
  for (const [mode, cap] of [['color', 18], ['magnetic', 32], ['still', 0]]) {
    const physics = createFieldPhysics({ glyphs, ...fieldPhysicsOptionsForMode(mode) });
    let peak = 0;
    for (let frameIndex = 0; frameIndex < 12; frameIndex += 1) {
      physics.setPointer({ x: 120 + frameIndex * 16, y: 0, vx: 2400, vy: 0, active: true });
      physics.update(1 / 60).glyphs.forEach((glyph) => {
        peak = Math.max(peak, Math.hypot(glyph.dx, glyph.dy));
      });
    }
    assert.ok(peak <= cap + 1e-8, `${mode} polarity exceeded ${cap}px: ${peak}`);
    if (mode === 'still') assert.equal(peak, 0);
    else assert.ok(peak > 1, `${mode} polarity should remain visibly responsive`);
  }
});

test('pointer velocity is invariant to event rate for the same physical sweep', () => {
  const sampleSweep = (intervalMs) => {
    let previous = null;
    let velocity = null;
    for (let timestamp = 0; timestamp <= 120; timestamp += intervalMs) {
      const current = { x: timestamp, y: timestamp * 0.5, timestamp };
      velocity = derivePointerVelocity(previous, current);
      previous = current;
    }
    return velocity;
  };

  const highRate = sampleSweep(8);
  const lowRate = sampleSweep(24);
  assert.deepEqual(
    { vx: highRate.vx, vy: highRate.vy, speed: highRate.speed },
    { vx: lowRate.vx, vy: lowRate.vy, speed: lowRate.speed },
  );
  assert.deepEqual(highRate, { vx: 1000, vy: 500, speed: Math.hypot(1000, 500), dt: 0.008 });
  assert.equal(lowRate.dt, 0.024);
});

test('pointer velocity rejects invalid timing and caps implausible outliers', () => {
  assert.deepEqual(derivePointerVelocity(null, { x: 10, y: 10, timestamp: 20 }),
    { vx: 0, vy: 0, speed: 0, dt: 0 });
  assert.deepEqual(
    derivePointerVelocity({ x: 0, y: 0, timestamp: 20 }, { x: 10, y: 10, timestamp: 20 }),
    { vx: 0, vy: 0, speed: 0, dt: 0 },
  );
  assert.deepEqual(
    derivePointerVelocity({ x: 0, y: 0, timestamp: 0 }, { x: 10, y: 10, timestamp: 150 }),
    { vx: 0, vy: 0, speed: 0, dt: 0 },
  );
  const capped = derivePointerVelocity(
    { x: 0, y: 0, timestamp: 0 },
    { x: 1000, y: 0, timestamp: 1 },
  );
  assert.equal(capped.speed, 5000);
  assert.equal(capped.vx, 5000);
  assert.equal(capped.vy, 0);
});

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

test('a plausible fast trackpad sweep creates visible but bounded displacement', () => {
  const physics = createFieldPhysics({
    glyphs: [{ x: 0, y: 0 }],
    maxDisplacement: 24,
  });
  physics.setPointer({ x: 2, y: 0, vx: 1800, vy: 0, active: true });
  for (let index = 0; index < 8; index += 1) physics.update(1 / 60);
  const glyph = physics.getFrame().glyphs[0];
  const displacement = Math.hypot(glyph.dx, glyph.dy);
  assert.ok(displacement > 6, `expected heroic displacement, got ${displacement}`);
  assert.ok(displacement <= 24 + 1e-8);
});

test('slow cursor motion stays composed while a rapid sweep produces a much larger wake', () => {
  const slow = createFieldPhysics({ glyphs: [{ x: 0, y: 0 }] });
  slow.setPointer({ x: 2, y: 0, vx: 150, vy: 0, active: true });
  for (let index = 0; index < 8; index += 1) slow.update(1 / 60);
  const slowDisplacement = Math.hypot(slow.getFrame().glyphs[0].dx, slow.getFrame().glyphs[0].dy);

  const fast = createFieldPhysics({ glyphs: [{ x: 0, y: 0 }] });
  fast.setPointer({ x: 2, y: 0, vx: 1800, vy: 0, active: true });
  for (let index = 0; index < 8; index += 1) fast.update(1 / 60);
  const fastDisplacement = Math.hypot(fast.getFrame().glyphs[0].dx, fast.getFrame().glyphs[0].dy);

  assert.ok(slowDisplacement < 1, `expected composed slow response, got ${slowDisplacement}`);
  assert.ok(fastDisplacement > slowDisplacement * 10,
    `expected fast wake ${fastDisplacement} to dominate slow response ${slowDisplacement}`);
});

test('public color and magnetic modes separate pigment-first and type-first responses', () => {
  const displacementAt = (mode, speed) => {
    const physics = createFieldPhysics({
      glyphs: [{ x: 0, y: 0 }],
      ...fieldPhysicsOptionsForMode(mode),
    });
    physics.setPointer({ x: 2, y: 0, vx: speed, vy: 0, active: true });
    let peak = 0;
    for (let index = 0; index < 8; index += 1) {
      const glyph = physics.update(1 / 60).glyphs[0];
      peak = Math.max(peak, Math.hypot(glyph.dx, glyph.dy));
    }
    return peak;
  };

  const slowColor = displacementAt('color', 150);
  const fastColor = displacementAt('color', 2400);
  const slowMagnetic = displacementAt('magnetic', 150);
  const fastMagnetic = displacementAt('magnetic', 2400);
  assert.ok(slowColor < 0.5, `expected calm color-mode type at 150 px/s, got ${slowColor}`);
  assert.ok(slowMagnetic < 0.75, `expected calm magnetic type at 150 px/s, got ${slowMagnetic}`);
  assert.ok(fastColor >= 6 && fastColor <= 18,
    `expected visible bounded color response at 2400 px/s, got ${fastColor}`);
  assert.ok(fastMagnetic > fastColor * 1.8,
    `expected magnetic response ${fastMagnetic} to clearly exceed color ${fastColor}`);
  assert.ok(fastMagnetic <= 32, `expected bounded magnetic response, got ${fastMagnetic}`);
});

test('color and magnetic modes each recruit a coordinated multi-word field', () => {
  // Three six-letter words with realistic inter-word gaps. A sweep crosses the
  // middle word; recruitment counts glyphs whose peak movement is clearly
  // visible rather than merely non-zero floating-point motion.
  const glyphs = Array.from({ length: 18 }, (_, index) => ({
    x: Math.floor(index / 6) * 180 + (index % 6) * 24,
    y: (index % 3) * 6,
  }));
  const responseAt = (mode, speed = 1200) => {
    const physics = createFieldPhysics({ glyphs, ...fieldPhysicsOptionsForMode(mode) });
    const peaks = Array(glyphs.length).fill(0);
    for (let frameIndex = 0; frameIndex < 8; frameIndex += 1) {
      physics.setPointer({
        x: 170 + frameIndex * 15,
        y: 10,
        vx: speed,
        vy: 0,
        active: true,
      });
      physics.update(1 / 60).glyphs.forEach((glyph, index) => {
        peaks[index] = Math.max(peaks[index], Math.hypot(glyph.dx, glyph.dy));
      });
    }
    return {
      recruited: peaks.filter((peak) => peak >= 1).length,
      peak: Math.max(...peaks),
    };
  };

  const color = responseAt('color');
  const magnetic = responseAt('magnetic');
  const still = responseAt('still', 2400);
  const minimumParticipation = Math.ceil(glyphs.length * 0.4);
  assert.ok(color.recruited >= minimumParticipation,
    `expected COLOR to recruit >=40%, recruited ${color.recruited}/${glyphs.length}`);
  assert.ok(magnetic.recruited >= minimumParticipation,
    `expected MAGNETIC to recruit >=40%, recruited ${magnetic.recruited}/${glyphs.length}`);
  assert.equal(still.recruited, 0);
  assert.equal(still.peak, 0);
  assert.ok(magnetic.peak > color.peak * 1.8,
    `expected magnet-only amplitude ${magnetic.peak} to exceed COLOR ${color.peak}`);
  assert.ok(color.peak <= 18, `expected COLOR legibility cap, got ${color.peak}`);
  assert.ok(magnetic.peak <= 32, `expected MAGNETIC legibility cap, got ${magnetic.peak}`);
});

test('a stationary direct-touch press produces a visible bounded field response', () => {
  const glyphs = Array.from({ length: 30 }, (_, index) => ({
    x: (index % 10) * 24,
    y: Math.floor(index / 10) * 32,
  }));
  for (const [mode, cap] of [['color', 18], ['magnetic', 32]]) {
    const physics = createFieldPhysics({ glyphs, ...fieldPhysicsOptionsForMode(mode) });
    const peaks = Array(glyphs.length).fill(0);
    for (let frameIndex = 0; frameIndex < 13; frameIndex += 1) {
      physics.setPointer({
        x: 96,
        y: 32,
        vx: 0,
        vy: 0,
        chargeScale: 1600,
        active: true,
      });
      physics.update(1 / 60).glyphs.forEach((glyph, index) => {
        peaks[index] = Math.max(peaks[index], Math.hypot(glyph.dx, glyph.dy));
      });
    }
    assert.ok(Math.max(...peaks) >= 2,
      `${mode} touch press should be plainly visible, peak was ${Math.max(...peaks)}`);
    assert.ok(peaks.filter((peak) => peak >= 1).length >= Math.ceil(glyphs.length * 0.4),
      `${mode} touch press should recruit at least 40% of nearby type`);
    assert.ok(Math.max(...peaks) <= cap, `${mode} touch press exceeded ${cap}px cap`);
  }
});

test('unknown modes fall back to color while still explicitly disables motion', () => {
  assert.deepEqual(fieldPhysicsOptionsForMode('unknown'), fieldPhysicsOptionsForMode('color'));
  assert.deepEqual(fieldPhysicsOptionsForMode('still'), { reducedMotion: true });
});

test('fast pointer velocity contributes materially to normalized frame energy', () => {
  const stationary = createFieldPhysics({ glyphs: [{ x: 0, y: 0 }] });
  stationary.setPointer({ x: 2, y: 0, active: true });
  stationary.update(1 / 60);
  const stationaryEnergy = stationary.getFrame().energy;

  const fast = createFieldPhysics({ glyphs: [{ x: 0, y: 0 }] });
  fast.setPointer({ x: 2, y: 0, vx: 1200, vy: 0, active: true });
  fast.update(1 / 60);
  const fastEnergy = fast.getFrame().energy;
  assert.ok(fastEnergy > stationaryEnergy + 0.15,
    `expected fast energy ${fastEnergy} to exceed stationary ${stationaryEnergy}`);
  assert.ok(fastEnergy <= 1);
});

test('reduced motion produces exactly zero displacement, velocity, energy, and idle movement', () => {
  const physics = createFieldPhysics({
    glyphs: [{ x: 0, y: 0 }],
    reducedMotion: true,
  });
  const initial = physics.getFrame().glyphs[0];
  physics.update(1);
  const idle = physics.getFrame().glyphs[0];
  assert.equal(idle.x, initial.x);
  assert.equal(idle.y, initial.y);
  physics.setPointer({ x: -100, y: 0, vx: 5000, vy: 5000, active: true });
  for (let index = 0; index < 120; index += 1) physics.update(1 / 60);
  const displaced = physics.getFrame().glyphs[0];
  assert.deepEqual(
    { dx: displaced.dx, dy: displaced.dy, vx: displaced.vx, vy: displaced.vy },
    { dx: 0, dy: 0, vx: 0, vy: 0 },
  );
  assert.equal(physics.getFrame().energy, 0);
});

test('enabling reduced motion resets an already displaced field exactly to home', () => {
  const physics = createFieldPhysics({ glyphs: [{ x: 0, y: 0 }] });
  physics.setPointer({ x: 2, y: 0, vx: 2400, vy: 0, active: true });
  for (let index = 0; index < 8; index += 1) physics.update(1 / 60);
  assert.ok(Math.abs(physics.getFrame().glyphs[0].dx) > 0);
  physics.setReducedMotion(true);
  const glyph = physics.getFrame().glyphs[0];
  assert.deepEqual({ dx: glyph.dx, dy: glyph.dy, vx: glyph.vx, vy: glyph.vy },
    { dx: 0, dy: 0, vx: 0, vy: 0 });
  assert.equal(physics.getFrame().energy, 0);
});

test('default full-motion displacement stays within the 32px legibility ceiling', () => {
  const physics = createFieldPhysics({ glyphs: [{ x: 0, y: 0 }] });
  physics.setPointer({ x: 1, y: 0, vx: 5000, vy: 0, active: true });
  for (let index = 0; index < 240; index += 1) physics.update(1 / 60);
  const glyph = physics.getFrame().glyphs[0];
  assert.ok(Math.hypot(glyph.dx, glyph.dy) <= 32 + 1e-8);
});
