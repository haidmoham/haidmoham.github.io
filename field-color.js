/**
 * Fluid-like colour layer for the typography field.
 *
 * The simulation is deliberately small: a dye texture is advected through a
 * procedural curl field and receives three overlapping, velocity-oriented
 * splats. It is not intended to model a physical fluid; it is the visual
 * layer's bounded, deterministic response to the normalized field frame.
 * WebGL is used when available, with a visually related Canvas 2D fallback.
 *
 * Directional reference: PavelDoGreat/WebGL-Fluid-Simulation (MIT),
 * https://github.com/PavelDoGreat/WebGL-Fluid-Simulation. This implementation
 * is independently written for this site and does not copy its source.
 */

const MAX_DPR = 2;
const MAX_RENDER_PIXELS = 2073600;
const MAX_SAMPLES = 18;
const SAMPLE_LIFE = 4.0;
const REDUCED_MARK_LIFE = 0.2;
// Ordered around the hue wheel so interpolation always moves through a nearby
// pigment instead of jumping between unrelated warm and cool colors.
export const INITIAL_PIGMENT_RGB = Object.freeze([236, 88, 72]);
const COLORS = [
  INITIAL_PIGMENT_RGB, // light vermilion
  [244, 112, 96], // warm coral
  [235, 112, 30], // burnt orange
  [244, 196, 28], // chrome yellow
  [177, 218, 38], // acid chartreuse
  [34, 165, 137], // verdigris
  [20, 205, 164], // bright teal
  [18, 188, 202], // oxidized turquoise
  [22, 132, 222], // electric cobalt
  [42, 72, 218], // ultramarine
  [111, 42, 214], // deep orchid
  [184, 30, 174], // violet lake
];

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const point = (value) => ({ x: finite(value && value.x), y: finite(value && value.y) });
const magnitude = (value) => Math.hypot(value.x, value.y);

/** New pigment requires an explicit, recent physical pointer sample. */
export function shouldInjectPigment(frame = {}) {
  return frame.enabled !== false && frame.inject === true &&
    clamp(finite(frame.energy), 0, 1) > 0.003;
}

const smoothstep = (minimum, maximum, value) => {
  const t = clamp((finite(value) - minimum) / Math.max(1e-8, maximum - minimum), 0, 1);
  return t * t * (3 - 2 * t);
};

/** CPU mirror of the shader's alpha-gradient surface-tension signal. */
export function surfaceTensionEdge(center, north, south, east, west) {
  const alpha = (value) => clamp(finite(value), 0, 1);
  const centerAlpha = alpha(center);
  const gradient = Math.hypot(alpha(east) - alpha(west), alpha(north) - alpha(south)) * 0.5;
  return clamp(
    smoothstep(0.012, 0.16, gradient) * smoothstep(0.015, 0.30, centerAlpha),
    0,
    1,
  );
}

/** Advance the coordinate sampled by the smooth random hue field. */
export function advanceColorProgress(currentProgress, frame = {}, deltaSeconds = 1 / 60, viewport = {}) {
  const dt = clamp(finite(deltaSeconds, 1 / 60), 0, 0.1);
  const velocity = point(frame.velocity);
  const speed = clamp(magnitude(velocity), 0, 2400);
  const energy = clamp(finite(frame.energy), 0, 1);
  const scale = Math.max(320, finite(viewport.width), finite(viewport.height));
  const timeDrift = dt * (0.035 + energy * 0.04);
  const pathDrift = speed * dt / scale * 0.30;
  return finite(currentProgress) + timeDrift + pathDrift;
}

function randomUnit(index, seed) {
  // Every session begins in the same warm light-red family; subsequent nodes
  // remain session-seeded and unpredictable.
  if (index === 0) return 0;
  let value = Math.imul((index | 0) ^ (seed | 0), 0x45d9f3b);
  value = Math.imul((value >>> 16) ^ value, 0x45d9f3b);
  value = (value >>> 16) ^ value;
  return (value >>> 0) / 4294967296;
}

const circularDelta = (from, to) => ((to - from + 1.5) % 1) - 0.5;

/**
 * Session-seeded value noise over palette space. Each integer coordinate is
 * an unpredictable hue target; cubic easing and shortest-arc interpolation
 * produce a continuous, organic random walk instead of a linear hue march.
 */
export function smoothRandomHue(progress, seed = 0) {
  const coordinate = finite(progress);
  const cell = Math.floor(coordinate);
  const fraction = coordinate - cell;
  const eased = fraction * fraction * (3 - 2 * fraction);
  const from = randomUnit(cell, finite(seed) | 0);
  const to = randomUnit(cell + 1, finite(seed) | 0);
  return from + circularDelta(from, to) * eased;
}

function sessionColorSeed(explicitSeed) {
  if (Number.isFinite(explicitSeed)) return explicitSeed | 0;
  const key = 'mhaider.field.color-seed';
  try {
    const stored = globalThis.sessionStorage?.getItem(key);
    if (stored !== null && Number.isFinite(Number(stored))) return Number(stored) | 0;
    const sample = new Uint32Array(1);
    globalThis.crypto?.getRandomValues?.(sample);
    const seed = sample[0] || Math.floor(Math.random() * 4294967296);
    globalThis.sessionStorage?.setItem(key, String(seed));
    return seed | 0;
  } catch (_) {
    return Math.floor(Math.random() * 4294967296) | 0;
  }
}

// A tiny CPU-side pigment map keeps contrast decisions independent from the
// renderer. It deliberately mirrors the injected marks rather than reading
// pixels back from WebGL, which would synchronize the GPU and cost more than
// the field itself. The fixed mark pool also keeps interaction allocations
// bounded while the visible oil remains persistent.
function createPigmentModel(options = {}) {
  const maxMarks = Math.round(clamp(finite(options.maxPigmentMarks, 36), 12, 64));
  const marks = Array.from({ length: maxMarks }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, energy: 0, radius: 0, age: 0, life: 0 }));
  let cursor = 0;
  let width = 0;
  let height = 0;

  function resize(nextWidth, nextHeight) {
    width = Math.max(0, finite(nextWidth));
    height = Math.max(0, finite(nextHeight));
  }

  function clear() {
    marks.forEach((mark) => { mark.active = false; });
  }

  function update(frame = {}, deltaSeconds = 1 / 60) {
    const dt = clamp(finite(deltaSeconds, 1 / 60), 0, 0.1);
    const enabled = frame.enabled !== false;
    const reduced = Boolean(frame.reducedMotion);
    if (!enabled) { clear(); return; }
    for (const mark of marks) {
      if (!mark.active) continue;
      mark.age += dt;
      if (mark.age >= mark.life) mark.active = false;
    }
    const energy = clamp(finite(frame.energy), 0, 1);
    if (!shouldInjectPigment(frame)) return;
    const pointer = point(frame.pointer || frame.position);
    const velocity = point(frame.velocity);
    const speed = magnitude(velocity);
    const mark = marks[cursor];
    cursor = (cursor + 1) % maxMarks;
    mark.active = true;
    mark.x = clamp(pointer.x, -width * 0.1, width * 1.1);
    mark.y = clamp(pointer.y, -height * 0.1, height * 1.1);
    mark.vx = velocity.x;
    mark.vy = velocity.y;
    mark.energy = energy;
    // Keep the detector precise: fast motion lengthens the wake, while the
    // core remains a small oil mark instead of a full-screen light blob.
    mark.radius = clamp((reduced ? 12 : 14) + energy * (reduced ? 12 : 32) + speed * 0.0045, 8, reduced ? 28 : 54);
    mark.age = 0;
    mark.life = reduced ? REDUCED_MARK_LIFE : clamp(1.8 + energy * 2.2, 1.8, SAMPLE_LIFE);
  }

  function getPigmentAt(x, y) {
    const sampleX = finite(x);
    const sampleY = finite(y);
    let density = 0;
    let weightedEnergy = 0;
    let weightTotal = 0;
    for (const mark of marks) {
      if (!mark.active) continue;
      const ageRatio = clamp(1 - mark.age / Math.max(mark.life, 0.001), 0, 1);
      const dx = sampleX - mark.x;
      const dy = sampleY - mark.y;
      const distance = Math.hypot(dx, dy);
      const core = Math.exp(-(distance * distance) / (mark.radius * mark.radius));
      const speed = Math.hypot(mark.vx, mark.vy);
      const wakeLength = clamp(speed * 0.015 + mark.radius * (0.8 + mark.energy), 18, 180);
      const along = (dx * mark.vx + dy * mark.vy) / Math.max(speed, 1);
      const wake = along < 0 ? Math.exp(-((Math.abs(along) / wakeLength) ** 2)) * Math.exp(-((distance / (mark.radius * 1.45)) ** 2)) : 0;
      const contribution = (core + wake * 0.72) * ageRatio * mark.energy;
      density = Math.max(density, contribution);
      weightedEnergy += contribution * mark.energy;
      weightTotal += contribution;
    }
    density = clamp(density, 0, 1);
    return {
      density,
      // Luminance is intentionally the pigment's own perceptual value, not
      // the canvas brightness, so dark/colourful oil can still trigger ink.
      luminance: clamp(weightTotal ? weightedEnergy / weightTotal : 0, 0, 1),
    };
  }

  return { resize, update, clear, getPigmentAt };
}

function makeShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function makeProgram(gl, vertexSource, fragmentSource) {
  const vertex = makeShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = makeShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

const VERTEX_SHADER = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

// The dye pass keeps the expensive work in one fragment shader. The small
// curl field, pointer swirl, and backwards sample create silky motion without
// requiring a second velocity simulation texture.
const DYE_SHADER = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uDye;
  uniform vec2 uPointer;
  uniform vec2 uVelocity;
  uniform vec2 uDirection;
  uniform float uEnergy;
  uniform float uDt;
  uniform float uTime;
  uniform float uAspect;
  uniform float uActive;
  uniform float uReduced;
  uniform float uHuePhase;
  uniform vec3 uColor0;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform vec3 uColor4;
  uniform vec3 uColor5;
  uniform vec3 uColor6;
  uniform vec3 uColor7;
  uniform vec3 uColor8;
  uniform vec3 uColor9;
  uniform vec3 uColor10;
  uniform vec3 uColor11;

  vec3 palette(float phase) {
    float p = fract(phase) * 12.0;
    if (p < 1.0) return mix(uColor0, uColor1, smoothstep(0.0, 1.0, p));
    if (p < 2.0) return mix(uColor1, uColor2, smoothstep(0.0, 1.0, p - 1.0));
    if (p < 3.0) return mix(uColor2, uColor3, smoothstep(0.0, 1.0, p - 2.0));
    if (p < 4.0) return mix(uColor3, uColor4, smoothstep(0.0, 1.0, p - 3.0));
    if (p < 5.0) return mix(uColor4, uColor5, smoothstep(0.0, 1.0, p - 4.0));
    if (p < 6.0) return mix(uColor5, uColor6, smoothstep(0.0, 1.0, p - 5.0));
    if (p < 7.0) return mix(uColor6, uColor7, smoothstep(0.0, 1.0, p - 6.0));
    if (p < 8.0) return mix(uColor7, uColor8, smoothstep(0.0, 1.0, p - 7.0));
    if (p < 9.0) return mix(uColor8, uColor9, smoothstep(0.0, 1.0, p - 8.0));
    if (p < 10.0) return mix(uColor9, uColor10, smoothstep(0.0, 1.0, p - 9.0));
    if (p < 11.0) return mix(uColor10, uColor11, smoothstep(0.0, 1.0, p - 10.0));
    return mix(uColor11, uColor0, smoothstep(0.0, 1.0, p - 11.0));
  }

  void main() {
    float energy = clamp(uEnergy, 0.0, 1.0);
    vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
    vec2 cursor = (uPointer - 0.5) * vec2(uAspect, 1.0);
    vec2 radial = q - cursor;
    float dist2 = dot(radial, radial);
    // The pointer is the field's source, not a tiny accent. Keep the influence
    // wide enough to read as a living colour event across the composition.
    float nearCursor = exp(-dist2 / 0.18);
    float directionLength = max(length(uDirection), 0.001);
    vec2 direction = uDirection / directionLength;
    vec2 directionQ = normalize(vec2(direction.x * uAspect, direction.y) + vec2(0.0001));

    float speed = clamp(length(uVelocity) / 2200.0, 0.0, 1.0);
    vec2 curl = vec2(
      sin(q.y * 19.0 + uTime * 0.75) + cos(q.x * 13.0 - uTime * 0.44),
      cos(q.x * 21.0 - uTime * 0.62) - sin(q.y * 15.0 + uTime * 0.51)
    ) * (0.0022 + energy * 0.004 + speed * 0.006);
    vec2 swirl = vec2(-radial.y, radial.x) * nearCursor * (0.004 + energy * 0.034 + speed * 0.045);
    vec2 drift = directionQ * (0.002 + energy * 0.026 + speed * 0.035);
    float motionScale = mix(1.0, 0.08, uReduced);
    vec2 advectedUv = clamp(vUv - (curl + swirl + drift) * (uDt * 60.0) * motionScale, 0.001, 0.999);
    vec4 previous = texture2D(uDye, advectedUv);
    float fadeRate = mix(0.30, 7.5, uReduced);
    float fade = exp(-uDt * fadeRate);
    vec3 dye = previous.rgb * fade;
    float alpha = previous.a * fade;

    if (uActive > 0.5 && energy > 0.003) {
      // Saturated, velocity-shaped filaments: energetic but kept close to the
      // cursor path so the composition never turns into a page-sized blob.
      float radius = mix(0.038, 0.13, energy) * mix(1.0, 0.62, uReduced);
      float trail = mix(0.06, 0.32, energy) + speed * 0.12;
      vec2 side = vec2(-directionQ.y, directionQ.x);
      vec2 p0 = cursor;
      vec2 p1 = cursor - directionQ * trail * 0.72 + side * radius * 0.52;
      vec2 p2 = cursor - directionQ * trail * 1.38 - side * radius * 0.68;
      float g0 = exp(-dot(q - p0, q - p0) / (radius * radius));
      float g1 = exp(-dot(q - p1, q - p1) / (radius * radius * 1.7));
      float g2 = exp(-dot(q - p2, q - p2) / (radius * radius * 2.4));
      // A tight ring gives fast gestures a filament/vortex edge instead of a
      // static coloured cursor dot. It remains bounded and decays with dye.
      float ringRadius = radius * (0.82 + speed * 0.62);
      float ring = exp(-abs(length(radial) - ringRadius) / max(0.009, radius * 0.14));
      float impulse = (0.42 + energy * 1.75 + speed * 0.92) * mix(1.0, 0.22, uReduced);
      // Neighboring filaments remain within one pigment family. The host
      // advances uHuePhase slowly from time and path length, never directly
      // from direction or instantaneous speed, so reversals cannot strobe.
      float phase = uHuePhase;
      vec3 pigment0 = palette(phase + q.x * 0.025 + q.y * 0.015);
      vec3 pigment1 = palette(phase + 0.035 + q.y * 0.020);
      vec3 pigment2 = palette(phase + 0.072 - q.x * 0.018);
      dye += (pigment0 * g0 + pigment1 * g1 + pigment2 * g2) * impulse;
      // Keep the ring as dense pigment at the edge of the wake. It should
      // read like oil being pushed through oil, not a white neon halo.
      dye += palette(phase + 0.10) * ring * (0.16 + energy * 0.46) * mix(1.0, 0.18, uReduced);
      alpha = min(0.86, alpha + (g0 + g1 + g2) * (0.30 + energy * 0.55) * mix(1.0, 0.42, uReduced) + ring * 0.1);
    }
    // A restrained pigment curve keeps saturated chroma while removing the
    // high-key glare that made fast gestures read as a strobe.
    gl_FragColor = vec4(clamp(dye * 0.72, 0.0, 1.0), clamp(alpha, 0.0, 1.0));
  }
`;

const COMPOSITE_SHADER = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uDye;
  uniform vec2 uTexel;
  void main() {
    vec4 center = texture2D(uDye, vUv);
    vec4 north = texture2D(uDye, vUv + vec2(0.0, uTexel.y));
    vec4 south = texture2D(uDye, vUv - vec2(0.0, uTexel.y));
    vec4 east = texture2D(uDye, vUv + vec2(uTexel.x, 0.0));
    vec4 west = texture2D(uDye, vUv - vec2(uTexel.x, 0.0));
    // A very small neighbourhood mix gives the pigment a viscous edge while
    // preserving saturated cores. Avoid an emissive wash over the page.
    vec3 pigment = center.rgb * 0.88;
    vec3 bloom = (north.rgb + south.rgb + east.rgb + west.rgb) * 0.009;
    vec3 halo = (center.rgb + north.rgb + south.rgb + east.rgb + west.rgb) * 0.003;
    // Alpha gradient behaves like surface tension: the contour appears only
    // at a pigment boundary and disappears where merged fluid becomes uniform.
    float alphaGradient = length(vec2(east.a - west.a, north.a - south.a)) * 0.5;
    float boundary = smoothstep(0.012, 0.16, alphaGradient) *
      smoothstep(0.015, 0.30, center.a);
    float luminance = dot(center.rgb, vec3(0.299, 0.587, 0.114));
    vec3 boundaryPigment = clamp(vec3(luminance) +
      (center.rgb - vec3(luminance)) * 1.18, 0.0, 1.0);
    vec3 contour = boundaryPigment * boundary * 0.10;
    float alpha = clamp(center.a + (north.a + south.a + east.a + west.a) * 0.018 +
      boundary * 0.055, 0.0, 0.86);
    gl_FragColor = vec4(clamp(pigment + bloom + halo + contour, 0.0, 1.0), alpha);
  }
`;

function blend(first, second, amount) {
  return first.map((value, index) => Math.round(value + (second[index] - value) * amount));
}

function colorAt(position) {
  const wrapped = ((position % COLORS.length) + COLORS.length) % COLORS.length;
  const index = Math.floor(wrapped);
  return blend(COLORS[index], COLORS[(index + 1) % COLORS.length], wrapped - index);
}

function boundedDpr(width, height, requested, maximum) {
  const desired = clamp(finite(requested, 1), 0.25, maximum);
  const byPixelBudget = Math.sqrt(MAX_RENDER_PIXELS / Math.max(1, width * height));
  return clamp(Math.min(desired, byPixelBudget), 0.25, maximum);
}

function createFallback(canvas, options, firstContext) {
  const context = firstContext || canvas.getContext?.('2d', { alpha: true });
  const maxDpr = clamp(finite(options.maxDpr, MAX_DPR), 1, MAX_DPR);
  const maxSamples = Math.round(clamp(finite(options.maxSamples, MAX_SAMPLES), 4, MAX_SAMPLES));
  const sampleLife = clamp(finite(options.sampleLife, SAMPLE_LIFE), 0.5, 4);
  const samples = [];
  let width = 0;
  let height = 0;
  let dpr = 1;
  let reducedMark = null;
  const colorSeed = finite(options.colorSeed) | 0;
  let hueProgress = 0;
  let huePhase = smoothRandomHue(hueProgress, colorSeed);
  let destroyed = false;
  const pigment = createPigmentModel(options);

  function resize(nextWidth, nextHeight, nextDpr, resizeOptions = {}) {
    if (destroyed || !canvas) return;
    const bounds = canvas.getBoundingClientRect?.() || { width: canvas.clientWidth, height: canvas.clientHeight };
    const nextLogicalWidth = Math.max(0, finite(nextWidth, bounds.width || canvas.width || 0));
    const nextLogicalHeight = Math.max(0, finite(nextHeight, bounds.height || canvas.height || 0));
    const nextPixelRatio = boundedDpr(nextLogicalWidth, nextLogicalHeight,
      finite(nextDpr, finite(options.devicePixelRatio, globalThis.devicePixelRatio || 1)), maxDpr);
    const preserve = Boolean(resizeOptions.preserve) && width > 0 && height > 0 &&
      Math.abs(nextLogicalWidth - width) < 1 && Math.abs(nextPixelRatio - dpr) < 0.01;
    width = nextLogicalWidth;
    height = nextLogicalHeight;
    dpr = nextPixelRatio;
    if (!preserve) {
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
    }
    if (canvas.style) { canvas.style.width = `${width}px`; canvas.style.height = `${height}px`; }
    context?.setTransform(
      canvas.width / Math.max(1, width), 0,
      0, canvas.height / Math.max(1, height), 0, 0,
    );
    pigment.resize(width, height);
  }

  function clear() {
    if (destroyed || !context) return;
    context.clearRect(0, 0, width, height);
    samples.length = 0;
    reducedMark = null;
    hueProgress = 0;
    huePhase = smoothRandomHue(hueProgress, colorSeed);
    pigment.clear();
  }

  function drawSample(sample, alpha, reduced) {
    if (!context || alpha <= 0.002) return;
    const [red, green, blue] = sample.color;
    const speed = Math.hypot(sample.vx, sample.vy);
    const radius = clamp((reduced ? 11 : 16) + sample.energy * (reduced ? 14 : 42) + speed * 0.0055, 9, reduced ? 30 : 68);
    const direction = sample.direction;
    const length = reduced ? 0 : clamp(radius * (0.7 + sample.energy * 1.45) + speed * 0.016, 16, 185);
    const gradient = context.createRadialGradient(sample.x, sample.y, 0, sample.x, sample.y, radius);
    gradient.addColorStop(0, `rgba(${red},${green},${blue},${(reduced ? 0.16 : 0.30) * alpha})`);
    gradient.addColorStop(0.32, `rgba(${red},${green},${blue},${(reduced ? 0.08 : 0.14) * alpha})`);
    gradient.addColorStop(1, `rgba(${red},${green},${blue},0)`);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(sample.x, sample.y, radius, 0, Math.PI * 2);
    context.fill();
    // Draw just inside the sample boundary in the pigment's own hue. This is
    // a restrained saturated rim, not a light or dark graphic stroke.
    context.lineWidth = clamp(radius * 0.035, 1, 2.25);
    context.strokeStyle = `rgba(${red},${green},${blue},${(reduced ? 0.045 : 0.10) * alpha})`;
    context.beginPath();
    context.arc(sample.x, sample.y, radius * 0.96, 0, Math.PI * 2);
    context.stroke();
    if (length <= 0) return;
    context.lineCap = 'round';
    const wakeWidth = clamp(radius * 0.34, 2, 20);
    const rim = context.createLinearGradient(sample.x, sample.y, sample.x - direction.x * length, sample.y - direction.y * length);
    rim.addColorStop(0, `rgba(${red},${green},${blue},${0.075 * alpha})`);
    rim.addColorStop(0.5, `rgba(${red},${green},${blue},${0.025 * alpha})`);
    rim.addColorStop(1, `rgba(${red},${green},${blue},0)`);
    context.lineWidth = wakeWidth + 1.5;
    context.strokeStyle = rim;
    context.beginPath();
    context.moveTo(sample.x, sample.y);
    context.lineTo(sample.x - direction.x * length, sample.y - direction.y * length);
    context.stroke();
    context.lineWidth = wakeWidth;
    const wake = context.createLinearGradient(sample.x, sample.y, sample.x - direction.x * length, sample.y - direction.y * length);
    wake.addColorStop(0, `rgba(${red},${green},${blue},${0.28 * alpha})`);
    wake.addColorStop(0.5, `rgba(${red},${green},${blue},${0.10 * alpha})`);
    wake.addColorStop(1, `rgba(${red},${green},${blue},0)`);
    context.strokeStyle = wake;
    context.beginPath();
    context.moveTo(sample.x, sample.y);
    context.lineTo(sample.x - direction.x * length, sample.y - direction.y * length);
    context.stroke();
  }

  function render(frame = {}, deltaSeconds = 1 / 60) {
    if (destroyed || !context || width <= 0 || height <= 0) return;
    const dt = clamp(finite(deltaSeconds, 1 / 60), 0, 0.1);
    const pointer = point(frame.pointer || frame.position);
    const velocity = point(frame.velocity);
    const rawDirection = point(frame.direction);
    const directionLength = magnitude(rawDirection);
    const direction = directionLength > 0.001 ? { x: rawDirection.x / directionLength, y: rawDirection.y / directionLength } : { x: 1, y: 0 };
    const energy = clamp(finite(frame.energy), 0, 1);
    const reduced = Boolean(frame.reducedMotion);
    const enabled = frame.enabled !== false;
    const injecting = shouldInjectPigment(frame);
    hueProgress = advanceColorProgress(hueProgress, { ...frame, velocity, energy }, dt, { width, height });
    huePhase = smoothRandomHue(hueProgress, colorSeed);
    pigment.update(frame, dt);
    context.clearRect(0, 0, width, height);
    // Overlap pigment in normal compositing so colors mix without a white
    // additive flash.
    context.globalCompositeOperation = 'source-over';
    for (let index = samples.length - 1; index >= 0; index -= 1) {
      const sample = samples[index];
      sample.age += dt;
      const life = clamp(1 - sample.age / sampleLife, 0, 1);
      drawSample(sample, life * life, false);
      if (life <= 0) samples.splice(index, 1);
    }
    if (reduced) {
      if (injecting) {
        reducedMark = { x: pointer.x, y: pointer.y, vx: velocity.x, vy: velocity.y, energy: energy * 0.42, direction, color: colorAt(huePhase * COLORS.length), age: 0 };
      }
      if (reducedMark) {
        reducedMark.age += dt;
        drawSample(reducedMark, clamp(1 - reducedMark.age / REDUCED_MARK_LIFE, 0, 1), true);
        if (reducedMark.age >= REDUCED_MARK_LIFE) reducedMark = null;
      }
    } else if (injecting) {
      samples.unshift({ x: clamp(pointer.x, -width * 0.1, width * 1.1), y: clamp(pointer.y, -height * 0.1, height * 1.1), vx: velocity.x, vy: velocity.y, direction, energy, color: colorAt(huePhase * COLORS.length), age: 0 });
      if (samples.length > maxSamples) samples.length = maxSamples;
    }
    context.globalCompositeOperation = 'source-over';
  }

  function getPigmentAt(x, y) { return destroyed ? { density: 0, luminance: 0 } : pigment.getPigmentAt(x, y); }
  function destroy() { if (!destroyed) { clear(); destroyed = true; } }
  resize();
  return { resize, render, clear, destroy, getPigmentAt };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{maxDpr?: number, maxSamples?: number, sampleLife?: number}} [options]
 * @returns {{resize: Function, render: Function, clear: Function, destroy: Function}}
 */
export function createFieldColor(canvas, options = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') return { resize() {}, render() {}, clear() {}, destroy() {}, getPigmentAt() { return { density: 0, luminance: 0 }; } };
  const rendererOptions = { ...options, colorSeed: sessionColorSeed(options.colorSeed) };
  let gl = null;
  try {
    // The shaders intentionally target WebGL 1's broadly available GLSL ES
    // 1.00 syntax. This also works on WebGL 2 browsers without requiring a
    // second shader source or a build step.
    gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false }) ||
      canvas.getContext('experimental-webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  } catch (_) { gl = null; }
  if (!gl) return createFallback(canvas, rendererOptions);

  const maxDpr = clamp(finite(rendererOptions.maxDpr, MAX_DPR), 1, MAX_DPR);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const dyeProgram = makeProgram(gl, VERTEX_SHADER, DYE_SHADER);
  const compositeProgram = makeProgram(gl, VERTEX_SHADER, COMPOSITE_SHADER);
  if (!dyeProgram || !compositeProgram) return { resize() {}, render() {}, clear() {}, destroy() {}, getPigmentAt() { return { density: 0, luminance: 0 }; } };

  const dye = {
    program: dyeProgram,
    position: gl.getAttribLocation(dyeProgram, 'aPosition'),
    uniforms: Object.fromEntries(['uDye', 'uPointer', 'uVelocity', 'uDirection', 'uEnergy', 'uDt', 'uTime', 'uAspect', 'uActive', 'uReduced', 'uHuePhase', ...Array.from({ length: 12 }, (_, index) => `uColor${index}`)].map((name) => [name, gl.getUniformLocation(dyeProgram, name)])),
  };
  const composite = {
    program: compositeProgram,
    position: gl.getAttribLocation(compositeProgram, 'aPosition'),
    uniforms: { uDye: gl.getUniformLocation(compositeProgram, 'uDye'), uTexel: gl.getUniformLocation(compositeProgram, 'uTexel') },
  };
  let targets = [];
  let width = 0;
  let height = 0;
  let pixelWidth = 1;
  let pixelHeight = 1;
  let dpr = 1;
  let time = 0;
  const colorSeed = rendererOptions.colorSeed;
  let hueProgress = 0;
  let huePhase = 0;
  let destroyed = false;
  let frameCount = 0;
  let slowFrames = 0;
  let fastFrames = 0;
  let quality = 1;
  const pigment = createPigmentModel(options);

  function makeTarget() {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, pixelWidth, pixelHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!complete) { gl.deleteTexture(texture); gl.deleteFramebuffer(framebuffer); return null; }
    return { texture, framebuffer };
  }

  function deleteTargets() {
    targets.forEach((target) => { gl.deleteTexture(target.texture); gl.deleteFramebuffer(target.framebuffer); });
    targets = [];
  }

  function resize(nextWidth, nextHeight, nextDpr, resizeOptions = {}) {
    if (destroyed) return;
    const bounds = canvas.getBoundingClientRect?.() || { width: canvas.clientWidth, height: canvas.clientHeight };
    const nextLogicalWidth = Math.max(0, finite(nextWidth, bounds.width || canvas.width || 0));
    const nextLogicalHeight = Math.max(0, finite(nextHeight, bounds.height || canvas.height || 0));
    const nextPixelRatio = boundedDpr(nextLogicalWidth, nextLogicalHeight,
      finite(nextDpr, finite(options.devicePixelRatio, globalThis.devicePixelRatio || 1)), maxDpr);
    const preserve = Boolean(resizeOptions.preserve) && width > 0 && height > 0 &&
      targets.length === 2 && Math.abs(nextLogicalWidth - width) < 1 &&
      Math.abs(nextPixelRatio - dpr) < 0.01;
    width = nextLogicalWidth;
    height = nextLogicalHeight;
    dpr = nextPixelRatio;
    if (preserve) {
      if (canvas.style) { canvas.style.width = `${width}px`; canvas.style.height = `${height}px`; }
      pigment.resize(width, height);
      return;
    }
    pixelWidth = Math.max(1, Math.round(width * dpr));
    pixelHeight = Math.max(1, Math.round(height * dpr));
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    if (canvas.style) { canvas.style.width = `${width}px`; canvas.style.height = `${height}px`; }
    deleteTargets();
    const first = makeTarget();
    const second = makeTarget();
    if (first && second) targets = [first, second];
    gl.viewport(0, 0, pixelWidth, pixelHeight);
    pigment.resize(width, height);
    clear();
  }

  function draw(programInfo) {
    gl.useProgram(programInfo.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(programInfo.position);
    gl.vertexAttribPointer(programInfo.position, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function clear() {
    if (destroyed) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, pixelWidth, pixelHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    targets.forEach((target) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    time = 0;
    hueProgress = 0;
    huePhase = smoothRandomHue(hueProgress, colorSeed);
    pigment.clear();
  }

  function render(frame = {}, deltaSeconds = 1 / 60) {
    if (destroyed || targets.length !== 2 || !width || !height) return;
    const dt = clamp(finite(deltaSeconds, 1 / 60), 0, 0.1);
    const pointer = point(frame.pointer || frame.position);
    const velocity = point(frame.velocity);
    const direction = point(frame.direction);
    const energy = clamp(finite(frame.energy), 0, 1);
    const reduced = Boolean(frame.reducedMotion);
    const active = shouldInjectPigment(frame);
    pigment.update(frame, dt);
    time += dt;
    hueProgress = advanceColorProgress(hueProgress, { ...frame, velocity, energy }, dt, { width, height });
    huePhase = smoothRandomHue(hueProgress, colorSeed);
    frameCount += 1;
    // Start at full fidelity. If measured frame time stays below 30 FPS,
    // skip alternate dye updates; recover only after a long fast run.
    if (dt > 1 / 30) { slowFrames += 1; fastFrames = 0; } else if (dt < 0.024) { fastFrames += 1; slowFrames = 0; }
    if (slowFrames >= 6) { quality = Math.max(0.65, quality - 0.1); slowFrames = 0; }
    if (fastFrames >= 120) { quality = Math.min(1, quality + 0.1); fastFrames = 0; }
    const skipUpdate = !reduced && quality < 0.88 && frameCount % 2 === 0;
    let read = targets[0];
    if (!skipUpdate) {
      const write = targets[1];
      gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer);
      gl.viewport(0, 0, pixelWidth, pixelHeight);
      gl.useProgram(dye.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read.texture);
      gl.uniform1i(dye.uniforms.uDye, 0);
      gl.uniform2f(dye.uniforms.uPointer, clamp(pointer.x / Math.max(1, width), -0.2, 1.2), clamp(1 - pointer.y / Math.max(1, height), -0.2, 1.2));
      gl.uniform2f(dye.uniforms.uVelocity, velocity.x, -velocity.y);
      gl.uniform2f(dye.uniforms.uDirection, direction.x, -direction.y);
      gl.uniform1f(dye.uniforms.uEnergy, energy * quality);
      gl.uniform1f(dye.uniforms.uDt, dt);
      gl.uniform1f(dye.uniforms.uTime, time);
      gl.uniform1f(dye.uniforms.uAspect, width / Math.max(1, height));
      gl.uniform1f(dye.uniforms.uActive, active ? 1 : 0);
      gl.uniform1f(dye.uniforms.uReduced, reduced ? 1 : 0);
      gl.uniform1f(dye.uniforms.uHuePhase, huePhase);
      COLORS.forEach((color, index) => {
        gl.uniform3f(dye.uniforms[`uColor${index}`], color[0] / 255, color[1] / 255, color[2] / 255);
      });
      draw(dye);
      targets[0] = write;
      targets[1] = read;
      read = targets[0];
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, pixelWidth, pixelHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(composite.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, read.texture);
    gl.uniform1i(composite.uniforms.uDye, 0);
    gl.uniform2f(composite.uniforms.uTexel, 1 / pixelWidth, 1 / pixelHeight);
    draw(composite);
  }

  function destroy() {
    if (destroyed) return;
    clear();
    deleteTargets();
    gl.deleteBuffer(quad);
    gl.deleteProgram(dyeProgram);
    gl.deleteProgram(compositeProgram);
    destroyed = true;
  }

  function getPigmentAt(x, y) {
    return destroyed ? { density: 0, luminance: 0 } : pigment.getPigmentAt(x, y);
  }

  resize();
  return { resize, render, clear, destroy, getPigmentAt };
}

export default createFieldColor;
