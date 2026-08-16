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
const MAX_SAMPLES = 18;
const SAMPLE_LIFE = 2.8;
const REDUCED_MARK_LIFE = 0.2;
const COLORS = [
  [20, 220, 255], // cyan
  [255, 30, 185], // magenta
  [255, 155, 34], // orange
];

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const point = (value) => ({ x: finite(value && value.x), y: finite(value && value.y) });
const magnitude = (value) => Math.hypot(value.x, value.y);

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
  uniform vec3 uCyan;
  uniform vec3 uMagenta;
  uniform vec3 uOrange;

  void main() {
    float energy = clamp(uEnergy, 0.0, 1.0);
    vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
    vec2 cursor = (uPointer - 0.5) * vec2(uAspect, 1.0);
    vec2 radial = q - cursor;
    float dist2 = dot(radial, radial);
    float nearCursor = exp(-dist2 / 0.16);
    float directionLength = max(length(uDirection), 0.001);
    vec2 direction = uDirection / directionLength;
    vec2 directionQ = normalize(vec2(direction.x * uAspect, direction.y) + vec2(0.0001));

    vec2 curl = vec2(
      sin(q.y * 17.0 + uTime * 0.55) + cos(q.x * 9.0 - uTime * 0.31),
      cos(q.x * 15.0 - uTime * 0.43) - sin(q.y * 11.0 + uTime * 0.37)
    ) * 0.0015;
    vec2 swirl = vec2(-radial.y, radial.x) * nearCursor * (0.002 + energy * 0.014);
    vec2 drift = directionQ * (0.001 + energy * 0.014) *
      clamp(length(uVelocity) / 240.0, 0.0, 1.0);
    float motionScale = mix(1.0, 0.08, uReduced);
    vec2 advectedUv = clamp(vUv - (curl + swirl + drift) * (uDt * 60.0) * motionScale, 0.001, 0.999);
    vec4 previous = texture2D(uDye, advectedUv);
    float fadeRate = mix(0.56, 7.5, uReduced);
    float fade = exp(-uDt * fadeRate);
    vec3 dye = previous.rgb * fade;
    float alpha = previous.a * fade;

    if (uActive > 0.5 && energy > 0.003) {
      float radius = mix(0.035, 0.14, energy) * mix(1.0, 0.72, uReduced);
      float trail = mix(0.025, 0.19, energy);
      vec2 side = vec2(-directionQ.y, directionQ.x);
      vec2 p0 = cursor;
      vec2 p1 = cursor - directionQ * trail * 0.82 + side * radius * 0.38;
      vec2 p2 = cursor - directionQ * trail * 1.55 - side * radius * 0.48;
      float g0 = exp(-dot(q - p0, q - p0) / (radius * radius));
      float g1 = exp(-dot(q - p1, q - p1) / (radius * radius * 1.45));
      float g2 = exp(-dot(q - p2, q - p2) / (radius * radius * 1.9));
      float impulse = (0.24 + energy * 1.25) * mix(1.0, 0.24, uReduced);
      dye += (uCyan * g0 + uMagenta * g1 + uOrange * g2) * impulse;
      alpha = min(1.0, alpha + (g0 + g1 + g2) * (0.22 + energy * 0.72) * mix(1.0, 0.3, uReduced));
    }
    gl_FragColor = vec4(clamp(dye, 0.0, 1.0), clamp(alpha, 0.0, 1.0));
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
    vec3 bloom = (north.rgb + south.rgb + east.rgb + west.rgb) * 0.085;
    float alpha = clamp(center.a + (north.a + south.a + east.a + west.a) * 0.035, 0.0, 1.0);
    gl_FragColor = vec4(clamp(center.rgb + bloom, 0.0, 1.0), alpha);
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
  let destroyed = false;

  function resize(nextWidth, nextHeight, nextDpr) {
    if (destroyed || !canvas) return;
    const bounds = canvas.getBoundingClientRect?.() || { width: canvas.clientWidth, height: canvas.clientHeight };
    width = Math.max(0, finite(nextWidth, bounds.width || canvas.width || 0));
    height = Math.max(0, finite(nextHeight, bounds.height || canvas.height || 0));
    dpr = clamp(finite(nextDpr, finite(options.devicePixelRatio, globalThis.devicePixelRatio || 1)), 1, maxDpr);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    if (canvas.style) { canvas.style.width = `${width}px`; canvas.style.height = `${height}px`; }
    context?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function clear() {
    if (destroyed || !context) return;
    context.clearRect(0, 0, width, height);
    samples.length = 0;
    reducedMark = null;
  }

  function drawSample(sample, alpha, reduced) {
    if (!context || alpha <= 0.002) return;
    const [red, green, blue] = sample.color;
    const speed = Math.hypot(sample.vx, sample.vy);
    const radius = clamp((reduced ? 18 : 28) + sample.energy * (reduced ? 18 : 115) + speed * 0.08, 12, reduced ? 45 : 180);
    const direction = sample.direction;
    const length = reduced ? 0 : clamp(radius * (0.55 + sample.energy * 1.2), 16, 170);
    const gradient = context.createRadialGradient(sample.x, sample.y, 0, sample.x, sample.y, radius);
    gradient.addColorStop(0, `rgba(${red},${green},${blue},${(reduced ? 0.17 : 0.32) * alpha})`);
    gradient.addColorStop(0.32, `rgba(${red},${green},${blue},${(reduced ? 0.08 : 0.18) * alpha})`);
    gradient.addColorStop(1, `rgba(${red},${green},${blue},0)`);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(sample.x, sample.y, radius, 0, Math.PI * 2);
    context.fill();
    if (length <= 0) return;
    context.lineCap = 'round';
    context.lineWidth = clamp(radius * 0.28, 2, 12);
    const wake = context.createLinearGradient(sample.x, sample.y, sample.x - direction.x * length, sample.y - direction.y * length);
    wake.addColorStop(0, `rgba(${red},${green},${blue},${0.28 * alpha})`);
    wake.addColorStop(0.5, `rgba(${red},${green},${blue},${0.12 * alpha})`);
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
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = 'lighter';
    for (let index = samples.length - 1; index >= 0; index -= 1) {
      const sample = samples[index];
      sample.age += dt;
      const life = clamp(1 - sample.age / sampleLife, 0, 1);
      drawSample(sample, life * life, false);
      if (life <= 0) samples.splice(index, 1);
    }
    if (reduced) {
      if (enabled && energy > 0.003) reducedMark = { x: pointer.x, y: pointer.y, vx: velocity.x, vy: velocity.y, energy: energy * 0.42, direction, color: colorAt(1.1), age: 0 };
      if (reducedMark) {
        reducedMark.age += dt;
        drawSample(reducedMark, clamp(1 - reducedMark.age / REDUCED_MARK_LIFE, 0, 1), true);
        if (reducedMark.age >= REDUCED_MARK_LIFE) reducedMark = null;
      }
    } else if (enabled && energy > 0.003) {
      samples.unshift({ x: clamp(pointer.x, -width * 0.1, width * 1.1), y: clamp(pointer.y, -height * 0.1, height * 1.1), vx: velocity.x, vy: velocity.y, direction, energy, color: colorAt((Math.atan2(direction.y, direction.x) / (Math.PI * 2)) * 3 + energy * 0.7), age: 0 });
      if (samples.length > maxSamples) samples.length = maxSamples;
    }
    context.globalCompositeOperation = 'source-over';
  }

  function destroy() { if (!destroyed) { clear(); destroyed = true; } }
  resize();
  return { resize, render, clear, destroy };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{maxDpr?: number, maxSamples?: number, sampleLife?: number}} [options]
 * @returns {{resize: Function, render: Function, clear: Function, destroy: Function}}
 */
export function createFieldColor(canvas, options = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') return { resize() {}, render() {}, clear() {}, destroy() {} };
  let gl = null;
  try {
    // The shaders intentionally target WebGL 1's broadly available GLSL ES
    // 1.00 syntax. This also works on WebGL 2 browsers without requiring a
    // second shader source or a build step.
    gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false }) ||
      canvas.getContext('experimental-webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  } catch (_) { gl = null; }
  if (!gl) return createFallback(canvas, options);

  const maxDpr = clamp(finite(options.maxDpr, MAX_DPR), 1, MAX_DPR);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const dyeProgram = makeProgram(gl, VERTEX_SHADER, DYE_SHADER);
  const compositeProgram = makeProgram(gl, VERTEX_SHADER, COMPOSITE_SHADER);
  if (!dyeProgram || !compositeProgram) return { resize() {}, render() {}, clear() {}, destroy() {} };

  const dye = {
    program: dyeProgram,
    position: gl.getAttribLocation(dyeProgram, 'aPosition'),
    uniforms: Object.fromEntries(['uDye', 'uPointer', 'uVelocity', 'uDirection', 'uEnergy', 'uDt', 'uTime', 'uAspect', 'uActive', 'uReduced', 'uCyan', 'uMagenta', 'uOrange'].map((name) => [name, gl.getUniformLocation(dyeProgram, name)])),
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
  let destroyed = false;
  let frameCount = 0;
  let slowFrames = 0;
  let fastFrames = 0;
  let quality = 1;

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

  function resize(nextWidth, nextHeight, nextDpr) {
    if (destroyed) return;
    const bounds = canvas.getBoundingClientRect?.() || { width: canvas.clientWidth, height: canvas.clientHeight };
    width = Math.max(0, finite(nextWidth, bounds.width || canvas.width || 0));
    height = Math.max(0, finite(nextHeight, bounds.height || canvas.height || 0));
    dpr = clamp(finite(nextDpr, finite(options.devicePixelRatio, globalThis.devicePixelRatio || 1)), 1, maxDpr);
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
  }

  function render(frame = {}, deltaSeconds = 1 / 60) {
    if (destroyed || targets.length !== 2 || !width || !height) return;
    const dt = clamp(finite(deltaSeconds, 1 / 60), 0, 0.1);
    const pointer = point(frame.pointer || frame.position);
    const velocity = point(frame.velocity);
    const direction = point(frame.direction);
    const energy = clamp(finite(frame.energy), 0, 1);
    const reduced = Boolean(frame.reducedMotion);
    const enabled = frame.enabled !== false;
    const active = enabled && energy > 0.003;
    time += dt;
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
      gl.uniform3f(dye.uniforms.uCyan, COLORS[0][0] / 255, COLORS[0][1] / 255, COLORS[0][2] / 255);
      gl.uniform3f(dye.uniforms.uMagenta, COLORS[1][0] / 255, COLORS[1][1] / 255, COLORS[1][2] / 255);
      gl.uniform3f(dye.uniforms.uOrange, COLORS[2][0] / 255, COLORS[2][1] / 255, COLORS[2][2] / 255);
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

  resize();
  return { resize, render, clear, destroy };
}

export default createFieldColor;
