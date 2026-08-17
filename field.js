import {
  createFieldPhysics,
  createWordPolarityMetadata,
  derivePointerVelocity,
  fieldPhysicsOptionsForMode,
} from './field-physics.js?v=10';
import { createFieldColor } from './field-color.js?v=10';
import {
  classifyFieldViewportChange,
  DIRECT_TOUCH_CHARGE_SCALE,
  DIRECT_VIEWPORT_GRACE_MS,
  isDirectPointerType,
  pointerActivityDeadline,
  resolveFieldInputModality,
  shouldTrackFieldPointerMove,
} from './field-input.js?v=4';

const MODE_STORAGE_KEY = 'mhaider.field.table.mode';
const FIELD_MODES = ['color', 'magnetic', 'still'];
const INPUT_COPY = {
  cursor: {
    kicker: 'Cursor field',
    idle: 'Sweep across the title. Speed shapes color and force.',
  },
  touch: {
    kicker: 'Touch field',
    idle: 'Drag through the title. Speed shapes color and force.',
  },
  pen: {
    kicker: 'Pen field',
    idle: 'Draw through the title. Speed shapes color and force.',
  },
  pointer: {
    kicker: 'Interactive field',
    idle: 'Move through the title. Speed shapes color and force.',
  },
};
const ROOT = document.documentElement;
const stage = document.querySelector('[data-field-stage]');

const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
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

function pointerIsInteractive(target) {
  return target instanceof Element && Boolean(target.closest('a, button, input, textarea, select, form, label'));
}

function pointerInStage(event, bounds) {
  return {
    x: clamp(finite(event.clientX) - bounds.left, 0, bounds.width),
    y: clamp(finite(event.clientY) - bounds.top, 0, bounds.height),
    timestamp: Number.isFinite(event.timeStamp) ? event.timeStamp : performance.now(),
  };
}

function applyGlyphFrame(glyphs, frame) {
  if (!frame?.glyphs) return;
  glyphs.forEach((glyph, index) => {
    const position = frame.glyphs[index];
    if (!position) return;
    glyph.node.style.transform = `translate3d(${finite(position.dx)}px, ${finite(position.dy)}px, 0)`;
  });
}

function prepareGlyphs(targets, polaritySeed) {
  const glyphs = [];
  let wordIndex = 0;
  targets.forEach((target) => {
    if (!target.hasAttribute('aria-label')) target.setAttribute('aria-label', target.textContent);
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue) nodes.push(walker.currentNode);
    }
    nodes.reverse().forEach((node) => {
      const fragment = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          fragment.append(document.createTextNode(part));
          return;
        }
        const word = document.createElement('span');
        word.className = 'field-word field-table-word';
        const currentWordIndex = wordIndex;
        wordIndex += 1;
        Array.from(part).forEach((character, characterIndex) => {
          const glyph = document.createElement('span');
          glyph.className = 'field-glyph field-table-glyph';
          glyph.textContent = character;
          word.append(glyph);
          glyphs.push({
            node: glyph,
            word,
            wordIndex: currentWordIndex,
            characterIndex,
            baseMass: target.classList.contains('hero-title') ? 1 : 1.25,
            baseCharge: target.classList.contains('hero-title') ? 1 : 0.62,
          });
        });
        fragment.append(word);
      });
      node.replaceWith(fragment);
    });
  });

  const polarity = createWordPolarityMetadata(glyphs, polaritySeed);
  return glyphs.map((glyph, index) => {
    const charge = glyph.baseCharge * polarity[index].charge;
    glyph.word.dataset.fieldPolarity = charge < 0 ? 'pull' : 'push';
    return {
      ...glyph,
      charge,
      mass: glyph.baseMass * polarity[index].massScale,
    };
  });
}

function mount() {
  if (!stage || window.__mhaiderFieldTable) return window.__mhaiderFieldTable || null;
  const targets = [...stage.querySelectorAll('[data-field-copy]')];
  const dock = stage.querySelector('[data-field-dock]');
  const modeButtons = [...stage.querySelectorAll('[data-field-mode]')];
  const resetButton = stage.querySelector('[data-field-reset]');
  const kicker = stage.querySelector('[data-field-kicker]');
  const hint = stage.querySelector('[data-field-hint]');
  const status = stage.querySelector('[data-field-status]');
  if (!targets.length || !dock || modeButtons.length !== FIELD_MODES.length || !resetButton || !kicker) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'field-table-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  stage.prepend(canvas);

  const probe = document.createElement('div');
  probe.className = 'field-table-probe';
  probe.setAttribute('data-field-probe', '');
  probe.setAttribute('aria-hidden', 'true');
  probe.innerHTML = '<span class="field-table-probe-ring"></span><span class="field-table-probe-core"></span>';
  stage.append(probe);

  const desktopModeButton = document.createElement('button');
  desktopModeButton.type = 'button';
  desktopModeButton.className = 'field-toggle field-mode-toggle field-table-desktop-toggle';
  document.body.append(desktopModeButton);

  const systemReducedMotion = reducedMotion();
  const storedMode = readModePreference();
  const primaryFinePointer = window.matchMedia?.('(pointer: fine)');
  const primaryCoarsePointer = window.matchMedia?.('(pointer: coarse)');
  const state = {
    mode: storedMode || (systemReducedMotion ? 'still' : 'color'),
    explicitMode: Boolean(storedMode),
    systemReducedMotion,
    hidden: document.hidden,
    pointerId: null,
    pointerType: '',
    pointerActiveUntil: -Infinity,
    lastPointerSample: null,
    lastDirectInputAt: -Infinity,
    pointer: { x: 0, y: 0, vx: 0, vy: 0, chargeScale: 1, active: false },
    inputModality: resolveFieldInputModality('', {
      primaryFine: primaryFinePointer?.matches,
      primaryCoarse: primaryCoarsePointer?.matches,
    }),
    hasInteracted: false,
  };

  const preparedGlyphs = prepareGlyphs(targets, sessionSeed('mhaider.field.table.polarity-seed'));
  const color = createFieldColor(canvas, { maxDpr: 2 });
  let physics = null;
  let stageBounds = stage.getBoundingClientRect();
  let viewport = { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 };
  let raf = 0;
  let resizeRaf = 0;
  let lastFrameAt = performance.now();

  const updateProbe = (sample) => {
    probe.style.transform = `translate3d(${sample.x}px, ${sample.y}px, 0)`;
  };

  const resetGlyphs = () => {
    const frame = physics?.reset?.();
    if (frame) applyGlyphFrame(preparedGlyphs, frame);
    else preparedGlyphs.forEach((glyph) => glyph.node.style.removeProperty('transform'));
  };

  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    stage.classList.remove('field-table-active');
    preparedGlyphs.forEach((glyph) => glyph.node.style.removeProperty('will-change'));
  };

  const settle = ({ clearColor = false } = {}) => {
    stop();
    state.pointer.vx = 0;
    state.pointer.vy = 0;
    state.pointer.active = false;
    state.pointerActiveUntil = -Infinity;
    resetGlyphs();
    if (clearColor) color.clear();
  };

  const rebuildPhysics = () => {
    stageBounds = stage.getBoundingClientRect();
    const glyphs = preparedGlyphs.map((glyph) => {
      const bounds = glyph.node.getBoundingClientRect();
      return {
        x: bounds.left - stageBounds.left + bounds.width / 2,
        y: bounds.top - stageBounds.top + bounds.height / 2,
        mass: glyph.mass,
        charge: glyph.charge,
      };
    });
    physics = createFieldPhysics({ glyphs, ...fieldPhysicsOptionsForMode(state.mode) });
  };

  const resize = (forceLayout = false) => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      const nextViewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: window.devicePixelRatio || 1,
      };
      const recentDirectInput = performance.now() - state.lastDirectInputAt <= DIRECT_VIEWPORT_GRACE_MS;
      const change = forceLayout ? 'layout' : classifyFieldViewportChange(viewport, nextViewport, { recentDirectInput });
      viewport = nextViewport;
      if (change === 'none') return;
      stageBounds = stage.getBoundingClientRect();
      if (change === 'transient-height') {
        color.resize(stageBounds.width, stageBounds.height, Math.min(nextViewport.dpr, 2), { preserve: true });
        return;
      }
      settle();
      color.resize(stageBounds.width, stageBounds.height, Math.min(nextViewport.dpr, 2));
      rebuildPhysics();
    });
  };

  const loop = (now) => {
    raf = 0;
    if (state.hidden || state.mode === 'still') return;
    const dt = Math.min((now - lastFrameAt) / 1000, 0.05);
    lastFrameAt = now;
    const physicallyActive = state.pointerId !== null || now < state.pointerActiveUntil;
    physics.setPointer({ ...state.pointer, active: physicallyActive });
    const frame = physics.update(dt);
    applyGlyphFrame(preparedGlyphs, frame);
    if (state.mode === 'color') {
      const cursorIsActive = state.pointerType === 'mouse' && now < state.pointerActiveUntil;
      color.render({
        ...frame,
        enabled: true,
        inject: state.pointerId !== null || cursorIsActive,
        pointer: state.pointer,
        reducedMotion: false,
      }, dt);
    }
    state.pointer.vx *= Math.exp(-10 * dt);
    state.pointer.vy *= Math.exp(-10 * dt);
    if (!physicallyActive && (frame?.energy || 0) <= 0.002) {
      stop();
      return;
    }
    raf = requestAnimationFrame(loop);
  };

  const start = () => {
    if (!state.hidden && state.mode !== 'still' && !raf) {
      lastFrameAt = performance.now();
      stage.classList.add('field-table-active');
      preparedGlyphs.forEach((glyph) => { glyph.node.style.willChange = 'transform'; });
      raf = requestAnimationFrame(loop);
    }
  };

  const announceMode = () => {
    const labels = {
      color: 'Color field. Drag to leave pigment and move the type.',
      magnetic: 'Magnet field. Drag to push and pull the type.',
      still: 'Field motion is off.',
    };
    const inputCopy = INPUT_COPY[state.inputModality] || INPUT_COPY.pointer;
    stage.dataset.fieldInput = state.inputModality;
    kicker.textContent = inputCopy.kicker;
    status.textContent = labels[state.mode];
    hint.textContent = state.mode === 'still'
      ? 'Motion is off. Choose Color or Magnet to explore.'
      : state.hasInteracted
        ? 'Move slowly for pull. Flick for a wider wake.'
        : inputCopy.idle;
  };

  const routeInputModality = (pointerType = '') => {
    const nextModality = resolveFieldInputModality(pointerType, {
      primaryFine: primaryFinePointer?.matches,
      primaryCoarse: primaryCoarsePointer?.matches,
    });
    if (nextModality === state.inputModality) return;
    state.inputModality = nextModality;
    announceMode();
  };

  const updateControls = () => {
    const desktopLabels = {
      color: 'MODE: COLOR + MAGNET',
      magnetic: 'MODE: MAGNET ONLY',
      still: 'MODE: STILL',
    };
    const desktopDescriptions = {
      color: 'Fluid color with broad, restrained magnetic type',
      magnetic: 'Stronger broad magnetic type without the fluid color field',
      still: 'Static field with no motion',
    };
    ROOT.classList.add('field-table-enabled');
    FIELD_MODES.forEach((mode) => ROOT.classList.toggle(`field-mode-${mode}`, state.mode === mode));
    ROOT.classList.toggle('field-motion-opt-in', state.explicitMode && state.mode !== 'still');
    stage.dataset.fieldMode = state.mode;
    modeButtons.forEach((button) => {
      const selected = button.dataset.fieldMode === state.mode;
      button.setAttribute('aria-checked', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    resetButton.textContent = state.mode === 'color' ? 'Clear color' : 'Reset type';
    resetButton.disabled = state.mode === 'still';
    desktopModeButton.textContent = desktopLabels[state.mode];
    desktopModeButton.title = `${desktopDescriptions[state.mode]}. Select to cycle modes.`;
    desktopModeButton.setAttribute('aria-label', `${desktopDescriptions[state.mode]}. Cycle typography field mode.`);
    announceMode();
  };

  const selectMode = (mode, { explicit = true } = {}) => {
    if (!FIELD_MODES.includes(mode)) return;
    state.mode = mode;
    state.explicitMode = explicit;
    if (explicit) writeModePreference(mode);
    settle();
    rebuildPhysics();
    updateControls();
  };

  const updatePointer = (event, phase = 'move') => {
    stageBounds = stage.getBoundingClientRect();
    const samples = event.getCoalescedEvents?.();
    const events = samples?.length ? samples : [event];
    for (const pointerEvent of events) {
      const sample = pointerInStage(pointerEvent, stageBounds);
      const velocity = derivePointerVelocity(state.lastPointerSample, sample);
      state.lastPointerSample = sample;
      state.pointer = {
        x: sample.x,
        y: sample.y,
        vx: velocity.vx,
        vy: velocity.vy,
        chargeScale: isDirectPointerType(state.pointerType) ? DIRECT_TOUCH_CHARGE_SCALE : 1,
        active: true,
      };
      updateProbe(sample);
    }
    const now = performance.now();
    state.pointerActiveUntil = pointerActivityDeadline(now, state.pointerType, phase);
    if (isDirectPointerType(state.pointerType)) state.lastDirectInputAt = now;
    physics.setPointer(state.pointer);
    start();
  };

  const pointerDown = (event) => {
    routeInputModality(event.pointerType);
    if (state.mode === 'still' || state.pointerId !== null || event.isPrimary === false || pointerIsInteractive(event.target)) return;
    state.pointerId = event.pointerId;
    state.pointerType = event.pointerType || 'mouse';
    state.lastPointerSample = null;
    stage.setPointerCapture(event.pointerId);
    stage.classList.add('field-table-interacting');
    updatePointer(event, 'down');
  };

  const pointerMove = (event) => {
    if (!shouldTrackFieldPointerMove({
      pointerType: event.pointerType,
      pointerId: event.pointerId,
      ownedPointerId: state.pointerId,
      interactiveTarget: pointerIsInteractive(event.target),
      isPrimary: event.isPrimary,
    })) return;
    if (state.pointerId === null) {
      routeInputModality(event.pointerType);
      state.pointerType = event.pointerType || 'mouse';
    }
    updatePointer(event, 'move');
  };

  const pointerEnd = (event) => {
    if (event.pointerId !== state.pointerId) return;
    if (event.type === 'pointerup') updatePointer(event, 'up');
    if (stage.hasPointerCapture?.(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    state.pointerId = null;
    state.lastPointerSample = null;
    state.pointer.active = false;
    state.hasInteracted = true;
    stage.classList.remove('field-table-interacting');
    announceMode();
    start();
  };

  const keyDown = (event) => {
    const currentIndex = modeButtons.indexOf(event.currentTarget);
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const nextButton = modeButtons[(currentIndex + direction + modeButtons.length) % modeButtons.length];
    nextButton.focus();
    selectMode(nextButton.dataset.fieldMode);
  };

  const resetField = () => {
    if (state.mode === 'color') color.clear();
    resetGlyphs();
    status.textContent = state.mode === 'color' ? 'Color cleared.' : 'Type reset.';
  };

  const visibilityChanged = () => {
    state.hidden = document.hidden;
    if (state.hidden) settle();
  };

  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const motionPreferenceChanged = (event) => {
    state.systemReducedMotion = event.matches;
    if (!state.explicitMode) selectMode(event.matches ? 'still' : 'color', { explicit: false });
  };

  const inputCapabilityChanged = () => routeInputModality('');
  const pointerEntered = (event) => routeInputModality(event.pointerType);
  const cycleDesktopMode = () => {
    const currentIndex = FIELD_MODES.indexOf(state.mode);
    selectMode(FIELD_MODES[(currentIndex + 1) % FIELD_MODES.length]);
  };

  stage.addEventListener('pointerover', pointerEntered, { passive: true });
  stage.addEventListener('pointerdown', pointerDown, { passive: true });
  stage.addEventListener('pointermove', pointerMove, { passive: true });
  stage.addEventListener('pointerup', pointerEnd, { passive: true });
  stage.addEventListener('pointercancel', pointerEnd, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', visibilityChanged);
  media?.addEventListener?.('change', motionPreferenceChanged);
  primaryFinePointer?.addEventListener?.('change', inputCapabilityChanged);
  primaryCoarsePointer?.addEventListener?.('change', inputCapabilityChanged);
  modeButtons.forEach((button) => {
    button.addEventListener('click', () => selectMode(button.dataset.fieldMode));
    button.addEventListener('keydown', keyDown);
  });
  resetButton.addEventListener('click', resetField);
  desktopModeButton.addEventListener('click', cycleDesktopMode);

  rebuildPhysics();
  updateControls();
  resize(true);
  document.fonts?.ready?.then(() => resize(true));

  window.__mhaiderFieldTable = {
    selectMode,
    reset: resetField,
    destroy() {
      settle({ clearColor: true });
      cancelAnimationFrame(resizeRaf);
      stage.removeEventListener('pointerdown', pointerDown);
      stage.removeEventListener('pointerover', pointerEntered);
      stage.removeEventListener('pointermove', pointerMove);
      stage.removeEventListener('pointerup', pointerEnd);
      stage.removeEventListener('pointercancel', pointerEnd);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibilityChanged);
      media?.removeEventListener?.('change', motionPreferenceChanged);
      primaryFinePointer?.removeEventListener?.('change', inputCapabilityChanged);
      primaryCoarsePointer?.removeEventListener?.('change', inputCapabilityChanged);
      modeButtons.forEach((button) => button.removeEventListener('keydown', keyDown));
      resetButton.removeEventListener('click', resetField);
      desktopModeButton.removeEventListener('click', cycleDesktopMode);
      color.destroy();
      canvas.remove();
      probe.remove();
      desktopModeButton.remove();
      ROOT.classList.remove('field-table-enabled', 'field-motion-opt-in', ...FIELD_MODES.map((mode) => `field-mode-${mode}`));
      delete window.__mhaiderFieldTable;
    },
  };
  return window.__mhaiderFieldTable;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
