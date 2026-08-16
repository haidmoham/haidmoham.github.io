/**
 * A small, deterministic spring/charge simulation for the typography field.
 *
 * This module intentionally has no knowledge of the DOM or of rendering. A
 * controller can bind the returned glyph positions to spans and pass the
 * normalized frame to a separate visual layer.
 */

const DEFAULTS = {
  homeStiffness: 28,
  damping: 10,
  // Kept deliberately modest at rest; pointer velocity supplies the visible
  // wake during a fast sweep rather than making a stationary cursor tug text.
  chargeStrength: 4800,
  pointerVelocityStrength: 3.2,
  pointerEnergySpeed: 220,
  pointerEnergyWeight: 0.55,
  pointerCharge: 1,
  softening: 72,
  maxDisplacement: 42,
  maxSpeed: 900,
  idleStrength: 0.42,
  idleFrequency: 0.7,
  reducedMotionMaxDisplacement: 9,
  reducedMotionDamping: 18,
  reducedMotionChargeStrength: 280,
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

function normalize(valueX, valueY, fallbackX = 0, fallbackY = 0) {
  const length = Math.hypot(valueX, valueY);
  if (length < 1e-8) return { x: fallbackX, y: fallbackY };
  return { x: valueX / length, y: valueY / length };
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
        energy: clamp((Math.hypot(dx, dy) / maxDisplacement() + speed / config.maxSpeed) * 0.5, 0, 1),
      };
    });
    const count = Math.max(1, glyphs.length);
    const rawEnergy = clamp((kinetic / count / (config.maxSpeed * config.maxSpeed * 0.5)) +
      (displacement / count / maxDisplacement()) * 0.35, 0, 1);
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
      energy: pointer.active ? Math.max(activity, rawEnergy, pointerEnergy) : activity,
      enabled: pointer.active,
      reducedMotion,
      elapsed,
      glyphs: renderedGlyphs,
    };
  }

  function maxDisplacement() {
    return reducedMotion ? config.reducedMotionMaxDisplacement : config.maxDisplacement;
  }

  function setPointer(next = {}) {
    const x = finite(next.x, pointer.x);
    const y = finite(next.y, pointer.y);
    if (Number.isFinite(next.vx) || Number.isFinite(next.vy)) {
      pointer.vx = finite(next.vx);
      pointer.vy = finite(next.vy);
    } else {
      pointer.vx = x - pointer.x;
      pointer.vy = y - pointer.y;
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
    // Reduced motion is event-driven: it does not create idle motion.
    const idle = reducedMotion ? 0 : config.idleStrength;
    const chargeStrength = reducedMotion ? config.reducedMotionChargeStrength : config.chargeStrength;
    const damping = reducedMotion ? config.reducedMotionDamping : config.damping;
    const limit = maxDisplacement();
    const substeps = Math.max(1, Math.ceil(dt / 0.016));
    const step = dt / substeps;

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
          forceX += pointer.vx * config.pointerVelocityStrength * proximity;
          forceY += pointer.vy * config.pointerVelocityStrength * proximity;
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
      activity *= Math.exp(-5 * dt);
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
