import {
  createFieldPhysics,
  createWordPolarityMetadata,
  derivePointerVelocity,
  fieldPhysicsOptionsForMode,
} from './field-physics.js?v=9';
import { createFieldColor } from './field-color.js?v=9';
import {
  DIRECT_TOUCH_CHARGE_SCALE,
  isDirectPointerType,
  pointerActivityDeadline,
  shouldStartDirectFieldGesture,
} from './field-input.js?v=1';

const MODE_STORAGE_KEY = 'mhaider.field.mode';
const FIELD_MODES = ['color', 'magnetic', 'still'];
const ROOT = document.documentElement;

function localDevelopment() {
  const host = String(window.location.hostname || '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
}

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function touchTargetContext(target) {
  const element = target instanceof Element ? target : null;
  return {
    authoredTarget: Boolean(element?.closest('[data-field-target]')),
    interactiveTarget: Boolean(element?.closest('a, button, input, textarea, select, form, label')),
  };
}

function readModePreference() {
  try {
    const mode = window.localStorage.getItem(MODE_STORAGE_KEY);
    return FIELD_MODES.includes(mode) ? mode : null;
  } catch (_) { return null; }
}

function writeModePreference(mode) {
  try { window.localStorage.setItem(MODE_STORAGE_KEY, mode); } catch (_) { /* no-op */ }
}

function sessionSeed(key) {
  try {
    const stored = window.sessionStorage.getItem(key);
    if (stored !== null && Number.isFinite(Number(stored))) return Number(stored) | 0;
    const sample = new Uint32Array(1);
    window.crypto?.getRandomValues?.(sample);
    const seed = sample[0] || Math.floor(Math.random() * 4294967296);
    window.sessionStorage.setItem(key, String(seed));
    return seed | 0;
  } catch (_) {
    return Math.floor(Math.random() * 4294967296) | 0;
  }
}

function frameFromPhysics(physics, dt, pointer) {
  if (!physics) return null;
  if (typeof physics.setPointer === 'function') physics.setPointer(pointer);
  if (typeof physics.update === 'function') return physics.update(dt);
  if (typeof physics.step === 'function') return physics.step(dt, pointer);
  if (typeof physics.tick === 'function') return physics.tick(dt, pointer);
  if (typeof physics.getFrame === 'function') return physics.getFrame();
  return null;
}

function applyTargets(targets, frame) {
  if (!frame) return;
  const positions = frame.targets || frame.glyphs || frame.positions;
  if (!positions) return;
  targets.forEach((target, index) => {
    const position = positions[index] || positions[target.dataset.fieldIndex];
    if (!position) return;
    const x = Number(position.dx ?? position.x ?? 0);
    const y = Number(position.dy ?? position.y ?? 0);
    target.style.transform = `translate3d(${Number.isFinite(x) ? x : 0}px, ${Number.isFinite(y) ? y : 0}px, 0)`;
  });
}

function prepareGlyphs(targets, polaritySeed) {
  const glyphs = [];
  let wordIndex = 0;
  targets.forEach((target) => {
    const hero = target.classList.contains('hero-title');
    // Keep the complete heading as the accessible name after visual text is
    // split into independently transformable glyphs.
    if (!target.hasAttribute('aria-label')) target.setAttribute('aria-label', target.textContent);
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeValue && !node.parentElement?.closest('a,button,input,textarea,select,form')) textNodes.push(node);
    }
    textNodes.reverse().forEach((node) => {
      const fragment = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          fragment.append(document.createTextNode(part));
          return;
        }
        const word = document.createElement('span');
        word.className = 'field-word';
        const currentWordIndex = wordIndex;
        wordIndex += 1;
        Array.from(part).forEach((character, characterIndex) => {
          const span = document.createElement('span');
          span.className = 'field-glyph';
          span.textContent = character;
          word.append(span);
          glyphs.push({
            node: span,
            baseMass: hero ? 1 : 1.35,
            baseCharge: hero ? 1 : 0.58,
            wordIndex: currentWordIndex,
            characterIndex,
          });
        });
        fragment.append(word);
      });
      node.replaceWith(fragment);
    });
  });
  const polarity = createWordPolarityMetadata(glyphs, polaritySeed);
  return glyphs.map((glyph, index) => ({
    ...glyph,
    mass: glyph.baseMass * polarity[index].massScale,
    charge: glyph.baseCharge * polarity[index].charge,
  }));
}

function collectTargets() {
  // The field is an authored signature, not a blanket mutation of every card
  // heading and metadata label. Pages opt in through one explicit title marker.
  return [...document.querySelectorAll('[data-field-target]')].filter((target) =>
    !target.closest('nav, a, button, form, input, textarea, select, [aria-hidden="true"]'));
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((first, second) => first - second);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))];
}

function makeDiagnostics() {
  const output = document.createElement('output');
  output.className = 'field-diagnostics';
  output.setAttribute('aria-hidden', 'true');
  output.textContent = 'INPUT — · MOVE ACROSS HERO';
  return output;
}

function mount() {
  if (window.__mhaiderField) return window.__mhaiderField;
  const targets = collectTargets();
  if (!targets.length) return null;

  const localDev = localDevelopment();
  const systemReducedMotion = reducedMotion();
  const modePreference = readModePreference();
  const state = {
    systemReducedMotion,
    modePreference,
    mode: modePreference || (systemReducedMotion ? 'still' : 'color'),
    hidden: false,
    lastPointerAt: -Infinity,
    pointerActiveUntil: -Infinity,
    lastPointerSample: null,
    directPointerId: null,
    pointer: { x: 0, y: 0, vx: 0, vy: 0, chargeScale: 1, active: false },
  };
  const modeButton = document.createElement('button');
  modeButton.type = 'button';
  modeButton.className = 'field-toggle field-mode-toggle';
  modeButton.setAttribute('aria-label', 'Cycle typography field mode');
  document.body.append(modeButton);
  const diagnostics = localDev ? makeDiagnostics() : null;
  if (diagnostics) document.body.append(diagnostics);

  const canvas = document.createElement('canvas');
  canvas.className = 'field-color-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const preparedGlyphs = prepareGlyphs(targets, sessionSeed('mhaider.field.polarity-seed'));
  const glyphTargets = preparedGlyphs.map((glyph) => glyph.node);
  let physics = null;
  const color = createFieldColor(canvas);

  let raf = 0;
  let last = performance.now();
  let resizeFrame = 0;
  let lastDiagnosticsAt = -Infinity;
  const speedSamples = [];
  const completedSweeps = [];
  let activeSweep = null;
  let peakSpeed = 0;

  const diagnosticsSummary = () => {
    const sweeps = [...completedSweeps];
    if (activeSweep) sweeps.push(activeSweep);
    return {
      mode: state.mode,
      systemReducedMotion: state.systemReducedMotion,
      count: speedSamples.length,
      p50: Math.round(percentile(speedSamples, 0.5)),
      p90: Math.round(percentile(speedSamples, 0.9)),
      p95: Math.round(percentile(speedSamples, 0.95)),
      max: Math.round(peakSpeed),
      sweeps: sweeps.slice(-5).map((sweep) => ({
        speed: Math.round(sweep.speed),
        displacement: Number(sweep.displacement.toFixed(1)),
        participationCount: sweep.participationCount,
        participationRatio: Number(sweep.participationRatio.toFixed(3)),
        totalGlyphs: sweep.totalGlyphs,
      })),
    };
  };
  const updateDiagnosticsOutput = (speed = 0) => {
    if (!diagnostics) return;
    const summary = diagnosticsSummary();
    const sweep = summary.sweeps.at(-1) || {
      speed: 0, displacement: 0, participationCount: 0, participationRatio: 0, totalGlyphs: glyphTargets.length,
    };
    diagnostics.textContent = `INPUT ${Math.round(speed)} PX/S · SWEEP ${sweep.speed} → ${sweep.displacement} PX · FIELD ${sweep.participationCount}/${sweep.totalGlyphs} (${Math.round(sweep.participationRatio * 100)}%)`;
    diagnostics.dataset.summary = JSON.stringify(summary);
  };
  const recordDiagnostics = (speed, now) => {
    if (!diagnostics || speed <= 0) return;
    speedSamples.push(speed);
    if (speedSamples.length > 600) speedSamples.shift();
    peakSpeed = Math.max(peakSpeed, speed);
    if (activeSweep) activeSweep.speed = Math.max(activeSweep.speed, speed);
    if (now - lastDiagnosticsAt < 80) return;
    updateDiagnosticsOutput(speed);
    lastDiagnosticsAt = now;
  };
  const finishSweep = () => {
    if (!activeSweep || activeSweep.speed <= 0) { activeSweep = null; return; }
    completedSweeps.push(activeSweep);
    if (completedSweeps.length > 12) completedSweeps.shift();
    activeSweep = null;
    updateDiagnosticsOutput();
  };
  const resetDiagnostics = () => {
    speedSamples.length = 0;
    completedSweeps.length = 0;
    activeSweep = null;
    peakSpeed = 0;
    if (diagnostics) {
      diagnostics.textContent = 'INPUT — · MOVE ACROSS HERO';
      diagnostics.dataset.summary = JSON.stringify(diagnosticsSummary());
    }
  };

  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    ROOT.classList.remove('field-active');
  };
  const settle = (completeSweep = false, clearColor = true) => {
    stop();
    state.pointer.vx = 0;
    state.pointer.vy = 0;
    state.pointer.chargeScale = 1;
    state.pointer.active = false;
    state.pointerActiveUntil = -Infinity;
    const settled = physics?.reset?.();
    if (settled) applyTargets(glyphTargets, settled);
    else glyphTargets.forEach((target) => target.style.removeProperty('transform'));
    if (clearColor) color?.clear?.();
    if (completeSweep) finishSweep();
  };
  const rebuildPhysics = () => {
    glyphTargets.forEach((target) => target.style.removeProperty('transform'));
    const glyphs = preparedGlyphs.map(({ node, mass, charge }) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, mass, charge };
    });
    physics = createFieldPhysics({ glyphs, ...fieldPhysicsOptionsForMode(state.mode) });
  };
  rebuildPhysics();

  const resize = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      settle();
      color?.resize?.(window.innerWidth, window.innerHeight, dpr);
      rebuildPhysics();
    });
  };

  const beginSweep = (pointerNow) => {
    if (activeSweep && pointerNow - state.lastPointerAt <= 240) return;
    finishSweep();
    activeSweep = {
      speed: 0,
      displacement: 0,
      participationCount: 0,
      participationRatio: 0,
      totalGlyphs: glyphTargets.length,
    };
  };

  const pointerDown = (event) => {
    if (!shouldStartDirectFieldGesture({
      pointerType: event.pointerType,
      mode: state.mode,
      ...touchTargetContext(event.target),
    })) return;
    const pointerNow = performance.now();
    const timestamp = Number.isFinite(event.timeStamp) ? event.timeStamp : pointerNow;
    beginSweep(pointerNow);
    state.directPointerId = event.pointerId;
    state.lastPointerSample = { x: event.clientX, y: event.clientY, timestamp };
    state.pointer = {
      x: event.clientX,
      y: event.clientY,
      vx: 0,
      vy: 0,
      chargeScale: DIRECT_TOUCH_CHARGE_SCALE,
      active: true,
    };
    state.lastPointerAt = pointerNow;
    state.pointerActiveUntil = pointerActivityDeadline(pointerNow, event.pointerType, 'down');
    start();
  };

  const pointerMove = (event) => {
    const isDirect = isDirectPointerType(event.pointerType);
    if (isDirect && state.directPointerId !== event.pointerId) return;
    const pointerNow = performance.now();
    beginSweep(pointerNow);
    const coalesced = event.getCoalescedEvents?.();
    const samples = coalesced?.length ? coalesced : [event];
    for (const sample of samples) {
      const now = Number.isFinite(sample.timeStamp) ? sample.timeStamp : performance.now();
      const current = { x: sample.clientX, y: sample.clientY, timestamp: now };
      const velocity = derivePointerVelocity(state.lastPointerSample, current);
      state.lastPointerSample = current;
      state.pointer = {
        x: current.x,
        y: current.y,
        vx: velocity.vx,
        vy: velocity.vy,
        chargeScale: isDirect ? DIRECT_TOUCH_CHARGE_SCALE : 1,
        active: true,
      };
      recordDiagnostics(velocity.speed, now);
    }
    state.lastPointerAt = pointerNow;
    state.pointerActiveUntil = pointerActivityDeadline(pointerNow, event.pointerType, 'move');
    if (state.mode !== 'still') start();
  };

  const pointerEnd = (event) => {
    if (!isDirectPointerType(event.pointerType) || state.directPointerId !== event.pointerId) return;
    if (event.type === 'pointerup' && state.mode !== 'still') pointerMove(event);
    state.directPointerId = null;
    state.lastPointerSample = null;
    state.pointer.active = false;
    if (event.type === 'pointercancel') state.pointerActiveUntil = -Infinity;
  };

  const loop = (now) => {
    raf = 0;
    if (state.hidden || state.mode === 'still') return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const active = now < state.pointerActiveUntil;
    const frame = frameFromPhysics(physics, dt, { ...state.pointer, active });
    applyTargets(glyphTargets, frame);
    if (activeSweep && frame?.glyphs) {
      const displacements = frame.glyphs.map((glyph) => Math.hypot(glyph.dx, glyph.dy));
      activeSweep.displacement = Math.max(activeSweep.displacement, ...displacements);
      // One CSS pixel is a conservative perceptual threshold: it excludes
      // floating-point spring noise while counting clearly participating type.
      const participationCount = displacements.filter((value) => value >= 1).length;
      if (participationCount > activeSweep.participationCount) {
        activeSweep.participationCount = participationCount;
        activeSweep.participationRatio = participationCount / Math.max(1, glyphTargets.length);
      }
    }
    if (state.mode === 'color') {
      color?.render?.({
        ...(frame || {}),
        // Residual spring energy may keep advection running, but it must never
        // stamp repeated pigment at the pointer endpoint after input stops.
        enabled: true,
        inject: active,
        reducedMotion: false,
        pointer: state.pointer,
      }, dt);
    }
    state.pointer.vx *= Math.exp(-10 * dt);
    state.pointer.vy *= Math.exp(-10 * dt);
    if (!active && (frame?.energy || 0) <= 0.002) {
      // Leave the finished pigment on the canvas. The next gesture continues
      // advecting and fading it, producing a persistent oil-spill memory while
      // the animation loop itself still terminates when the type settles.
      settle(true, state.mode !== 'color');
      return;
    }
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (!state.hidden && state.mode !== 'still' && !raf) {
      last = performance.now();
      ROOT.classList.add('field-active');
      raf = requestAnimationFrame(loop);
    }
  };
  const updateControl = () => {
    ROOT.classList.add('field-enabled');
    ROOT.classList.remove('field-disabled');
    FIELD_MODES.forEach((mode) => ROOT.classList.toggle(`field-mode-${mode}`, state.mode === mode));
    if (state.mode === 'still') settle();
  };
  const updateModeControl = () => {
    const labels = {
      color: 'Fluid color with broad, restrained magnetic type',
      magnetic: 'Stronger broad magnetic type without the fluid color field',
      still: 'Static field with no motion',
    };
    const visibleLabels = {
      color: 'MODE: COLOR + MAGNET',
      magnetic: 'MODE: MAGNET ONLY',
      still: 'MODE: STILL',
    };
    modeButton.textContent = visibleLabels[state.mode];
    modeButton.title = `${labels[state.mode]}. Select to cycle modes.`;
    modeButton.setAttribute('aria-label', `${labels[state.mode]}. Cycle typography field mode.`);
  };
  const cycleMode = () => {
    const currentIndex = FIELD_MODES.indexOf(state.mode);
    state.mode = FIELD_MODES[(currentIndex + 1) % FIELD_MODES.length];
    state.modePreference = state.mode;
    writeModePreference(state.mode);
    settle();
    rebuildPhysics();
    updateModeControl();
    updateControl();
  };
  const visibility = () => {
    state.hidden = document.hidden;
    if (state.hidden) {
      settle();
      state.lastPointerSample = null;
      state.directPointerId = null;
    }
  };

  window.addEventListener('pointerdown', pointerDown, { passive: true });
  window.addEventListener('pointermove', pointerMove, { passive: true });
  window.addEventListener('pointerup', pointerEnd, { passive: true });
  window.addEventListener('pointercancel', pointerEnd, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', visibility);
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const motionPreferenceChanged = (event) => {
    state.systemReducedMotion = event.matches;
    if (state.modePreference) return;
    state.mode = state.systemReducedMotion ? 'still' : 'color';
    settle();
    rebuildPhysics();
    updateModeControl();
    updateControl();
  };
  media?.addEventListener?.('change', motionPreferenceChanged);
  modeButton.addEventListener('click', cycleMode);
  updateModeControl();
  resize(); updateControl();
  if (document.fonts?.ready) document.fonts.ready.then(resize);

  window.__mhaiderField = {
    getDiagnostics: diagnosticsSummary,
    resetDiagnostics,
    destroy() {
      settle();
      cancelAnimationFrame(resizeFrame);
      modeButton.remove();
      diagnostics?.remove();
      canvas.remove();
      window.removeEventListener('pointerdown', pointerDown);
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerEnd);
      window.removeEventListener('pointercancel', pointerEnd);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
      media?.removeEventListener?.('change', motionPreferenceChanged);
      modeButton.removeEventListener('click', cycleMode);
      color?.destroy?.();
      ROOT.classList.remove('field-enabled', 'field-disabled', 'field-active', ...FIELD_MODES.map((mode) => `field-mode-${mode}`));
      delete window.__mhaiderField;
    },
  };
  return window.__mhaiderField;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
