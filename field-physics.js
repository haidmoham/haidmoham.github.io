/**
 * A small, deterministic spring/charge simulation for the typography field.
 *
 * This module intentionally has no knowledge of the DOM or of rendering. A
 * controller can bind the returned glyph positions to spans and pass the
 * normalized frame to a separate visual layer.
 */

const DEFAULTS = {
  homeStiffness: 24,
  damping: 8.5,
  // Kept deliberately modest at rest; pointer velocity supplies the visible
  // wake during a fast sweep rather than making a stationary cursor tug text.
  // The cursor is the field's hero: a fast sweep should kick the type into a
  // visible wake, while a stationary cursor remains composed around home.
  chargeStrength: 7200,
  pointerVelocityStrength: 1.4,
  pointerEnergySpeed: 1200,
  pointerEnergyWeight: 0.72,
  pointerCharge: 1,
  softening: 58,
  pointerVelocityFloor: 0,
  maxDisplacement: 32,
  maxSpeed: 720,
  idleStrength: 0.42,
  idleFrequency: 0.7,
};

const POINTER_SAMPLE_DEFAULTS = {
  maxIntervalMs: 100,
  maxSpeed: 5000,
};

const MODE_PROFILES = {
  color: {
    maxDisplacement: 18,
    pointerVelocityStrength: 0.82,
    chargeStrength: 6000,
    damping: 9.2,
    softening: 140,
    pointerVelocityFloor: 0.3,
  },
  magnetic: {
    maxDisplacement: 32,
    pointerVelocityStrength: 2,
    chargeStrength: 9000,
    damping: 8,
    softening: 140,
    pointerVelocityFloor: 0.3,
  },
  still: { reducedMotion: true },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

function normalize(valueX, valueY, fallbackX = 0, fallbackY = 0) {
  const length = Math.hypot(valueX, valueY);
  if (length < 1e-8) return { x: fallbackX, y: fallbackY };
  return { x: valueX / length, y: valueY / length };
}

/**
 * Convert two browser pointer samples into an event-rate-independent velocity.
 * Timestamps are DOMHighResTimeStamp values in milliseconds; velocity is px/s.
 * Missing, non-monotonic, or stale samples intentionally produce no impulse.
 *
 * @param {{x:number,y:number,timestamp:number}|null} previous
 * @param {{x:number,y:number,timestamp:number}|null} current
 * @param {{maxIntervalMs?:number,maxSpeed?:number}} [options]
 * @returns {{vx:number,vy:number,speed:number,dt:number}}
 */
export function derivePointerVelocity(previous, current, options = {}) {
  const maxIntervalMs = Math.max(1, finite(options.maxIntervalMs,
    POINTER_SAMPLE_DEFAULTS.maxIntervalMs));
  const maxSpeed = Math.max(0, finite(options.maxSpeed, POINTER_SAMPLE_DEFAULTS.maxSpeed));
  if (!previous || !current) return { vx: 0, vy: 0, speed: 0, dt: 0 };

  const previousX = finite(previous.x, NaN);
  const previousY = finite(previous.y, NaN);
  const currentX = finite(current.x, NaN);
  const currentY = finite(current.y, NaN);
  const previousTimestamp = finite(previous.timestamp, NaN);
  const currentTimestamp = finite(current.timestamp, NaN);
  const deltaMs = currentTimestamp - previousTimestamp;
  if (![previousX, previousY, currentX, currentY, deltaMs].every(Number.isFinite) ||
      deltaMs <= 0 || deltaMs > maxIntervalMs) {
    return { vx: 0, vy: 0, speed: 0, dt: 0 };
  }

  const dt = deltaMs / 1000;
  let vx = (currentX - previousX) / dt;
  let vy = (currentY - previousY) / dt;
  const measuredSpeed = Math.hypot(vx, vy);
  if (measuredSpeed > maxSpeed && measuredSpeed > 0) {
    const scale = maxSpeed / measuredSpeed;
    vx *= scale;
    vy *= scale;
  }
  return { vx, vy, speed: Math.hypot(vx, vy), dt };
}

/**
 * Return the calibrated physics profile for a public field mode. Keeping the
 * profiles beside the simulation makes the 150–2400 px/s interaction contract
 * directly testable without mounting the page.
 */
export function fieldPhysicsOptionsForMode(mode) {
  return { ...(MODE_PROFILES[mode] || MODE_PROFILES.color) };
}

function seededUnit(seed, salt) {
  let value = Math.imul((finite(seed) | 0) ^ (finite(salt) | 0), 0x45d9f3b);
  value = Math.imul((value >>> 16) ^ value, 0x45d9f3b);
  value = (value >>> 16) ^ value;
  return (value >>> 0) / 4294967296;
}

/**
 * Assign stable word-level polarity and charge magnitude, plus a small amount
 * of character mass variation. No character can disagree with its word's
 * attract/repel sign.
 */
export function createWordPolarityMetadata(glyphs = [], seed = 0, options = {}) {
  const minimumCharge = clamp(finite(options.minimumCharge, 0.76), 0.1, 1);
  const maximumCharge = clamp(finite(options.maximumCharge, 1), minimumCharge, 1.25);
  const massVariation = clamp(finite(options.massVariation, 0.08), 0, 0.08);
  const wordIds = [...new Set(glyphs.map((glyph) => finite(glyph.wordIndex) | 0))];
  const startingSign = seededUnit(seed, 0x13579bdf) < 0.5 ? -1 : 1;
  const signs = wordIds.map((_, index) => index % 2 === 0 ? startingSign : -startingSign);

  // Shuffle the balanced sign pool so polarity does not simply alternate in
  // reading order while preserving both signs whenever at least two words exist.
  for (let index = signs.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(seededUnit(seed, 0x2468ace + index) * (index + 1));
    [signs[index], signs[swap]] = [signs[swap], signs[index]];
  }

  const words = new Map(wordIds.map((wordId, index) => {
    const magnitude = minimumCharge +
      (maximumCharge - minimumCharge) * seededUnit(seed, 0x3141592 + wordId * 97);
    return [wordId, { sign: signs[index], magnitude }];
  }));

  return glyphs.map((glyph, glyphIndex) => {
    const wordIndex = finite(glyph.wordIndex) | 0;
    const characterIndex = finite(glyph.characterIndex, glyphIndex) | 0;
    const word = words.get(wordIndex) || { sign: startingSign, magnitude: minimumCharge };
    const variation = (seededUnit(seed, 0x2718281 + wordIndex * 131 + characterIndex * 17) * 2 - 1) * massVariation;
    return {
      wordIndex,
      characterIndex,
      sign: word.sign,
      chargeMagnitude: word.magnitude,
      charge: word.sign * word.magnitude,
      massScale: 1 + variation,
    };
  });
}

/**
 * @param {object} [options]
 * @param {Array<{x:number,y:number,mass?:number,charge?:number}>} options.glyphs
 * @returns {{setPointer, update, getFrame, reset, setReducedMotion, glyphs}}
 */
export function createFieldPhysics(options = {}) {
  const config = { ...DEFAULTS, ...options };
  const sourceGlyphs = Array.isArray(options.glyphs) ? options.glyphs : [];
  const glyphs = sourceGlyphs.map((glyph, index) => {
    const x = finite(glyph.x);
    const y = finite(glyph.y);
    return {
      index,
      homeX: x,
      homeY: y,
      x,
      y,
      vx: 0,
      vy: 0,
      mass: Math.max(0.05, finite(glyph.mass, 1)),
      charge: finite(glyph.charge, 1),
    };
  });

  const pointer = { x: 0, y: 0, active: false, vx: 0, vy: 0 };
  let reducedMotion = Boolean(options.reducedMotion);
  let elapsed = 0;
  let activity = 0;
  let frame = makeFrame();

  function makeFrame() {
    let kinetic = 0;
    let displacement = 0;
    let velocity = 0;
    const renderedGlyphs = glyphs.map((glyph) => {
      const dx = glyph.x - glyph.homeX;
      const dy = glyph.y - glyph.homeY;
      const speed = Math.hypot(glyph.vx, glyph.vy);
      kinetic += 0.5 * glyph.mass * speed * speed;
      displacement += Math.hypot(dx, dy);
      velocity += speed;
      return {
        index: glyph.index,
        x: glyph.x,
        y: glyph.y,
        homeX: glyph.homeX,
        homeY: glyph.homeY,
        dx,
        dy,
        vx: glyph.vx,
        vy: glyph.vy,
        energy: reducedMotion ? 0 : clamp((Math.hypot(dx, dy) / maxDisplacement() +
          speed / config.maxSpeed) * 0.5, 0, 1),
      };
    });
    const count = Math.max(1, glyphs.length);
    const rawEnergy = reducedMotion ? 0 : clamp(
      (kinetic / count / (config.maxSpeed * config.maxSpeed * 0.5)) +
      (displacement / count / maxDisplacement()) * 0.35,
      0,
      1,
    );
    const pointerEnergy = clamp(pointer.vx * pointer.vx + pointer.vy * pointer.vy, 0,
      config.pointerEnergySpeed * config.pointerEnergySpeed) /
      (config.pointerEnergySpeed * config.pointerEnergySpeed) * config.pointerEnergyWeight;
    const direction = normalize(pointer.vx, pointer.vy);
    return {
      position: { x: pointer.x, y: pointer.y },
      velocity: { x: pointer.vx, y: pointer.vy, magnitude: Math.hypot(pointer.vx, pointer.vy) },
      direction,
      // Activity is intentionally separate from idle equilibrium. This lets
      // the color layer decay to black while glyphs retain a barely perceptible
      // resting motion.
      energy: reducedMotion ? 0 : (pointer.active ? Math.max(activity, rawEnergy, pointerEnergy) : activity),
      enabled: pointer.active,
      reducedMotion,
      elapsed,
      glyphs: renderedGlyphs,
    };
  }

  function maxDisplacement() {
    return reducedMotion ? 0 : config.maxDisplacement;
  }

  function setPointer(next = {}) {
    const x = finite(next.x, pointer.x);
    const y = finite(next.y, pointer.y);
    if (Number.isFinite(next.vx) || Number.isFinite(next.vy)) {
      pointer.vx = finite(next.vx);
      pointer.vy = finite(next.vy);
    } else {
      // Velocity is an explicit px/s input. A coordinate delta has no useful
      // speed meaning without the sample interval, so omission means rest.
      pointer.vx = 0;
      pointer.vy = 0;
    }
    pointer.x = x;
    pointer.y = y;
    if (typeof next.active === 'boolean') pointer.active = next.active;
    frame = makeFrame();
    return frame;
  }

  function update(deltaSeconds = 1 / 60) {
    const dt = clamp(finite(deltaSeconds, 1 / 60), 0, 0.05);
    elapsed += dt;
    if (reducedMotion) {
      glyphs.forEach((glyph) => {
        glyph.x = glyph.homeX;
        glyph.y = glyph.homeY;
        glyph.vx = 0;
        glyph.vy = 0;
      });
      pointer.vx = 0;
      pointer.vy = 0;
      activity = 0;
      frame = makeFrame();
      return frame;
    }
    const idle = config.idleStrength;
    const chargeStrength = config.chargeStrength;
    const damping = config.damping;
    const limit = maxDisplacement();
    const substeps = Math.max(1, Math.ceil(dt / 0.016));
    const step = dt / substeps;
    const pointerSpeed = Math.hypot(pointer.vx, pointer.vy);
    // Nonlinear velocity gain makes a rapid sweep feel explosive without
    // turning slow, deliberate movement into a constant shove. The cap keeps
    // pathological pointer deltas bounded before the glyph speed clamp.
    const velocityRatio = clamp(pointerSpeed / config.pointerEnergySpeed, 0, 2.5);
    const velocityGain = 0.25 + velocityRatio * 0.75;

    for (let iteration = 0; iteration < substeps; iteration += 1) {
      glyphs.forEach((glyph) => {
        let forceX = (glyph.homeX - glyph.x) * config.homeStiffness;
        let forceY = (glyph.homeY - glyph.y) * config.homeStiffness;
        if (idle) {
          const phase = elapsed * config.idleFrequency + glyph.index * 1.71;
          forceX += Math.cos(phase) * idle;
          forceY += Math.sin(phase * 0.83) * idle;
        }
        if (pointer.active) {
          const dx = glyph.x - pointer.x;
          const dy = glyph.y - pointer.y;
          const radiusSquared = dx * dx + dy * dy + config.softening * config.softening;
          const inverseRadius = 1 / Math.sqrt(radiusSquared);
          const force = chargeStrength * glyph.charge * config.pointerCharge / radiusSquared;
          forceX += dx * inverseRadius * force;
          forceY += dy * inverseRadius * force;
          // A sweep carries momentum through the field. Proximity attenuates
          // this wake while preserving a material response for fast input.
          const proximity = config.softening * inverseRadius;
          // A mode may give the velocity wake a non-zero far-field floor. The
          // magnetic profile uses this to recruit a coordinated span of type,
          // while COLOR retains the local falloff and lets pigment lead.
          const velocityFloor = clamp(config.pointerVelocityFloor, 0, 1);
          const wakeInfluence = velocityFloor + (1 - velocityFloor) * proximity;
          forceX += pointer.vx * config.pointerVelocityStrength * velocityGain * wakeInfluence * glyph.charge;
          forceY += pointer.vy * config.pointerVelocityStrength * velocityGain * wakeInfluence * glyph.charge;
        }
        glyph.vx += (forceX / glyph.mass - damping * glyph.vx) * step;
        glyph.vy += (forceY / glyph.mass - damping * glyph.vy) * step;
        const speed = Math.hypot(glyph.vx, glyph.vy);
        if (speed > config.maxSpeed) {
          glyph.vx = glyph.vx / speed * config.maxSpeed;
          glyph.vy = glyph.vy / speed * config.maxSpeed;
        }
        glyph.x += glyph.vx * step;
        glyph.y += glyph.vy * step;
        const offsetX = glyph.x - glyph.homeX;
        const offsetY = glyph.y - glyph.homeY;
        const offset = Math.hypot(offsetX, offsetY);
        if (offset > limit) {
          glyph.x = glyph.homeX + offsetX / offset * limit;
          glyph.y = glyph.homeY + offsetY / offset * limit;
          // Remove outward velocity at the boundary while retaining tangential motion.
          const outward = glyph.vx * offsetX / offset + glyph.vy * offsetY / offset;
          if (outward > 0) {
            glyph.vx -= outward * offsetX / offset;
            glyph.vy -= outward * offsetY / offset;
          }
        }
      });
    }
    if (pointer.active) {
      const displacementSignal = glyphs.reduce((sum, glyph) => sum +
        Math.hypot(glyph.x - glyph.homeX, glyph.y - glyph.homeY), 0) /
        Math.max(1, glyphs.length) / maxDisplacement();
      const speedSignal = glyphs.reduce((sum, glyph) => sum +
        Math.hypot(glyph.vx, glyph.vy), 0) / Math.max(1, glyphs.length) / config.maxSpeed;
      activity = Math.max(activity, clamp((displacementSignal + speedSignal) * 0.5, 0, 1));
    } else {
      activity *= Math.exp(-3.2 * dt);
    }
    // Pointer velocity is an input impulse, not a second persistent force.
    pointer.vx *= Math.exp(-18 * dt);
    pointer.vy *= Math.exp(-18 * dt);
    frame = makeFrame();
    return frame;
  }

  function reset() {
    glyphs.forEach((glyph) => {
      glyph.x = glyph.homeX;
      glyph.y = glyph.homeY;
      glyph.vx = 0;
      glyph.vy = 0;
    });
    elapsed = 0;
    activity = 0;
    pointer.vx = 0;
    pointer.vy = 0;
    frame = makeFrame();
    return frame;
  }

  function setReducedMotion(value) {
    reducedMotion = Boolean(value);
    reset();
    return frame;
  }

  return {
    glyphs,
    setPointer,
    update,
    getFrame: () => frame,
    reset,
    setReducedMotion,
  };
}

export default createFieldPhysics;
