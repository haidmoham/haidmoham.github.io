import {
  createFieldPhysics,
  createWordPolarityMetadata,
  derivePointerVelocity,
  fieldPhysicsOptionsForMode,
} from './field-physics.js?v=10';
import { createFieldColor } from './field-color.js?v=12';
import {
  classifyFieldViewportChange,
  DIRECT_TOUCH_CHARGE_SCALE,
  DIRECT_VIEWPORT_GRACE_MS,
  isDirectPointerType,
  pointerActivityDeadline,
  resolveFieldInputModality,
  shouldStartDirectFieldGesture,
  shouldTrackFieldPointerMove,
  clampScrollColorCommand,
  consumeColorCommandBatch,
  shouldQueueScrollColorCommand,
  shouldQueueTouchColorCommand,
  touchColorWake,
  classifyTouchColorPhase,
  touchColorPointerPolicy,
  touchScrollSessionFromPointerEnd,
  TOUCH_COLOR_SLOP_PX,
  TOUCH_SCROLL_SESSION_MS,
  TOUCH_COLOR_HOLD_DELAY_MS,
  TOUCH_COLOR_HOLD_INTERVAL_MS,
  resolveInitialFieldMode,
} from './field-input.js?v=8';

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
const tableStage = document.querySelector('[data-field-stage]');

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

function touchTargetContext(target) {
  const element = target instanceof Element ? target : null;
  return {
    authoredTarget: Boolean(element?.closest('[data-field-target]')),
    interactiveTarget: pointerIsInteractive(element),
  };
}

function collectTargets() {
  return [...document.querySelectorAll('[data-field-target]')].filter((target) =>
    !target.closest('nav, a, button, form, input, textarea, select, [aria-hidden="true"]'));
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
  if (window.__mhaiderFieldTable) return window.__mhaiderFieldTable;
  const targets = collectTargets();
  if (!targets.length) return null;
  const interactionSurface = document.body;
  const dock = tableStage?.querySelector('[data-field-dock]') || null;
  const modeButtons = tableStage ? [...tableStage.querySelectorAll('[data-field-mode]')] : [];
  const resetButton = tableStage?.querySelector('[data-field-reset]') || null;
  const kicker = tableStage?.querySelector('[data-field-kicker]') || null;
  const hint = tableStage?.querySelector('[data-field-hint]') || null;
  const status = tableStage?.querySelector('[data-field-status]') || null;

  const canvas = document.createElement('canvas');
  canvas.className = 'field-color-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const probe = document.createElement('div');
  probe.className = 'field-table-probe field-site-probe';
  probe.setAttribute('data-field-probe', '');
  probe.setAttribute('aria-hidden', 'true');
  probe.innerHTML = '<span class="field-table-probe-ring"></span><span class="field-table-probe-core"></span>';
  document.body.append(probe);

  const desktopModeButton = document.createElement('button');
  desktopModeButton.type = 'button';
  desktopModeButton.className = 'field-toggle field-mode-toggle field-table-desktop-toggle';
  document.body.append(desktopModeButton);

  const systemReducedMotion = reducedMotion();
  const storedMode = readModePreference();
  const primaryFinePointer = window.matchMedia?.('(pointer: fine)');
  const primaryCoarsePointer = window.matchMedia?.('(pointer: coarse)');
  const initialMode = resolveInitialFieldMode({
    storedMode,
    reducedMotion: systemReducedMotion,
    primaryFine: primaryFinePointer?.matches,
    primaryCoarse: primaryCoarsePointer?.matches,
  });
  const state = {
    mode: initialMode.mode,
    explicitMode: initialMode.explicit,
    systemReducedMotion,
    hidden: document.hidden,
    pointerId: null,
    pointerType: '',
    pointerActiveUntil: -Infinity,
    lastPointerSample: null,
    lastDirectInputAt: -Infinity,
    pointer: { x: 0, y: 0, vx: 0, vy: 0, chargeScale: 1, active: false },
    colorCommands: [],
    touchColor: {
      startedAt: -Infinity,
      lastHoldAt: -Infinity,
      startPosition: null,
      scrollSessionActive: false,
      scrollSessionStartedAt: -Infinity,
      scrollAnchor: { x: 0, y: 0 },
      scrollPointerType: '',
      sampleId: 0,
      lastQueuedSampleId: null,
      active: false,
    },
    inputModality: resolveFieldInputModality('', {
      primaryFine: primaryFinePointer?.matches,
      primaryCoarse: primaryCoarsePointer?.matches,
    }),
    hasInteracted: false,
  };

  const preparedGlyphs = prepareGlyphs(targets, sessionSeed('mhaider.field.table.polarity-seed'));
  const color = createFieldColor(canvas, { maxDpr: 2 });
  let physics = null;
  let stageBounds = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  let viewport = { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 };
  let physicsScrollX = window.scrollX;
  let physicsScrollY = window.scrollY;
  let raf = 0;
  let resizeRaf = 0;
  let lastFrameAt = performance.now();
  let lastScrollX = window.scrollX;
  let lastScrollY = window.scrollY;

  const updateProbe = (sample) => {
    probe.style.transform = `translate3d(${sample.x}px, ${sample.y}px, 0)`;
  };

  const enqueueColorCommand = (command, { freshSample = true, sampleId = null, cancelled = false } = {}) => {
    if (state.mode !== 'color' || !shouldQueueTouchColorCommand({
      freshSample,
      sampleId,
      lastQueuedSampleId: state.touchColor.lastQueuedSampleId,
      cancelled,
    })) return false;
    state.colorCommands.push({ ...command, sampleId });
    if (state.colorCommands.length > 48) state.colorCommands.splice(0, state.colorCommands.length - 48);
    state.touchColor.lastQueuedSampleId = sampleId;
    return true;
  };

  const queueTouchSample = (sample, velocity, phase) => {
    if (!isDirectPointerType(state.pointerType) || state.mode !== 'color') return;
    const sampleId = ++state.touchColor.sampleId;
    const speed = Math.hypot(velocity.vx, velocity.vy);
    const policy = touchColorPointerPolicy({ pointerType: state.pointerType, phase });
    // Touch is a radial color brush; pen remains a directional drawing input.
    const wake = policy.intentionalDrag
      ? touchColorWake({ phase, velocity: { x: velocity.vx, y: velocity.vy } })
      : { x: 0, y: 0 };
    enqueueColorCommand({
      phase,
      intentionalDrag: policy.intentionalDrag,
      position: { x: sample.x, y: sample.y },
      velocity: { x: velocity.vx, y: velocity.vy },
      wake,
      energy: phase === 'tap' ? 0.68 : clamp(0.38 + speed / 2600, 0.38, 0.88),
    }, { sampleId });
  };

  const queueTouchHold = (now) => {
    const touch = state.touchColor;
    if (!touch.active || state.pointerId === null || !isDirectPointerType(state.pointerType) || state.mode !== 'color') return;
    if (now - touch.startedAt < TOUCH_COLOR_HOLD_DELAY_MS || now - touch.lastHoldAt < TOUCH_COLOR_HOLD_INTERVAL_MS) return;
    touch.lastHoldAt = now;
    const sampleId = ++touch.sampleId;
    enqueueColorCommand({
      phase: 'hold',
      position: { x: state.pointer.x, y: state.pointer.y },
      velocity: { x: 0, y: 0 },
      wake: { x: 0, y: 0 },
      energy: 0.42,
    }, { sampleId });
  };

  const queueScrollColor = () => {
    const delta = clampScrollColorCommand({
      deltaX: window.scrollX - lastScrollX,
      deltaY: window.scrollY - lastScrollY,
      maxDistance: 80,
    });
    lastScrollX = window.scrollX;
    lastScrollY = window.scrollY;
    const distance = Math.hypot(delta.x, delta.y);
    const now = performance.now();
    const touch = state.touchColor;
    const pointerType = touch.scrollPointerType || state.pointerType;
    if (state.mode !== 'color' || !shouldQueueScrollColorCommand({
      activePointer: touch.active && state.pointerId !== null,
      pointerType,
      recentlyDirect: now - state.lastDirectInputAt <= DIRECT_VIEWPORT_GRACE_MS,
      scrollSessionActive: touch.scrollSessionActive,
      sessionStartedAt: touch.scrollSessionStartedAt,
      now,
      sessionDurationMs: TOUCH_SCROLL_SESSION_MS,
      distance,
    })) return;
    const sampleId = ++state.touchColor.sampleId;
    enqueueColorCommand({
      phase: 'scroll',
      intentionalDrag: false,
      position: { ...touch.scrollAnchor },
      velocity: delta,
      wake: { x: 0, y: 0 },
      energy: clamp(0.24 + distance / 160, 0.24, 0.62),
    }, { sampleId });
    start();
  };

  const resetGlyphs = () => {
    const frame = physics?.reset?.();
    if (frame) applyGlyphFrame(preparedGlyphs, frame);
    else preparedGlyphs.forEach((glyph) => glyph.node.style.removeProperty('transform'));
  };

  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    interactionSurface.classList.remove('field-table-active');
    preparedGlyphs.forEach((glyph) => glyph.node.style.removeProperty('will-change'));
  };

  const settle = ({ clearColor = false } = {}) => {
    stop();
    state.colorCommands.length = 0;
    state.touchColor.active = false;
    state.touchColor.startedAt = -Infinity;
    state.touchColor.lastHoldAt = -Infinity;
    state.touchColor.startPosition = null;
    state.touchColor.scrollSessionActive = false;
    state.touchColor.scrollSessionStartedAt = -Infinity;
    state.touchColor.scrollPointerType = '';
    state.pointer.vx = 0;
    state.pointer.vy = 0;
    state.pointer.active = false;
    state.pointerActiveUntil = -Infinity;
    resetGlyphs();
    if (clearColor) color.clear();
  };

  const rebuildPhysics = () => {
    stageBounds = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const glyphs = preparedGlyphs.map((glyph) => {
      const bounds = glyph.node.getBoundingClientRect();
      return {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
        mass: glyph.mass,
        charge: glyph.charge,
      };
    });
    physicsScrollX = window.scrollX;
    physicsScrollY = window.scrollY;
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
      stageBounds = { left: 0, top: 0, width: nextViewport.width, height: nextViewport.height };
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
    queueTouchHold(now);
    const physicallyActive = state.pointerId !== null || now < state.pointerActiveUntil;
    physics.setPointer({
      ...state.pointer,
      x: state.pointer.x + (window.scrollX - physicsScrollX),
      y: state.pointer.y + (window.scrollY - physicsScrollY),
      active: physicallyActive,
    });
    const frame = physics.update(dt);
    applyGlyphFrame(preparedGlyphs, frame);
    if (state.mode === 'color') {
      const cursorIsActive = state.pointerType === 'mouse' && now < state.pointerActiveUntil;
      const batch = consumeColorCommandBatch(state.colorCommands, 8);
      state.colorCommands = batch.remaining;
      color.render({
        ...frame,
        enabled: true,
        commands: batch.commands,
        inject: cursorIsActive,
        pointer: state.pointer,
        reducedMotion: false,
      }, dt);
    }
    state.pointer.vx *= Math.exp(-10 * dt);
    state.pointer.vy *= Math.exp(-10 * dt);
    if (!physicallyActive && !state.colorCommands.length && (frame?.energy || 0) <= 0.002) {
      stop();
      return;
    }
    raf = requestAnimationFrame(loop);
  };

  const start = () => {
    if (!state.hidden && state.mode !== 'still' && !raf) {
      lastFrameAt = performance.now();
      interactionSurface.classList.add('field-table-active');
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
    if (tableStage) tableStage.dataset.fieldInput = state.inputModality;
    if (kicker) kicker.textContent = inputCopy.kicker;
    if (status) status.textContent = labels[state.mode];
    if (hint) {
      hint.textContent = state.mode === 'still'
        ? 'Motion is off. Choose Color or Magnet to explore.'
        : state.hasInteracted
          ? 'Move slowly for pull. Flick for a wider wake.'
          : inputCopy.idle;
    }
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
    ROOT.classList.add('field-enabled', 'field-table-enabled');
    FIELD_MODES.forEach((mode) => ROOT.classList.toggle(`field-mode-${mode}`, state.mode === mode));
    ROOT.classList.toggle('field-motion-opt-in', state.explicitMode && state.mode !== 'still');
    if (tableStage) tableStage.dataset.fieldMode = state.mode;
    modeButtons.forEach((button) => {
      const selected = button.dataset.fieldMode === state.mode;
      button.setAttribute('aria-checked', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    if (resetButton) {
      resetButton.textContent = state.mode === 'color' ? 'Clear color' : 'Reset type';
      resetButton.disabled = state.mode === 'still';
    }
    desktopModeButton.textContent = desktopLabels[state.mode];
    desktopModeButton.title = `${desktopDescriptions[state.mode]}. Select to cycle modes.`;
    const mobileColorBeta = state.mode === 'color' && (
      primaryCoarsePointer?.matches || state.inputModality === 'touch'
    );
    const accessibleModeDescription = mobileColorBeta
      ? `${desktopDescriptions[state.mode]} (mobile beta)`
      : desktopDescriptions[state.mode];
    desktopModeButton.setAttribute('aria-label', `${accessibleModeDescription}. Cycle typography field mode.`);
    modeButtons.forEach((button) => {
      if (button.dataset.fieldMode === 'color') {
        button.setAttribute('aria-label', mobileColorBeta ? 'Color (mobile beta)' : 'Color');
      }
    });
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
    stageBounds = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
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
      if (isDirectPointerType(state.pointerType)) {
        if (phase === 'down') {
          state.touchColor.startPosition = { x: sample.x, y: sample.y };
          queueTouchSample(sample, velocity, 'tap');
        } else if (phase === 'move') {
          const start = state.touchColor.startPosition || sample;
          const distance = Math.hypot(sample.x - start.x, sample.y - start.y);
          const colorPhase = classifyTouchColorPhase({
            pointerType: state.pointerType,
            distance,
            slop: TOUCH_COLOR_SLOP_PX,
          });
          if (colorPhase === 'drag') queueTouchSample(sample, velocity, colorPhase);
        }
      }
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
    const directPointer = isDirectPointerType(event.pointerType);
    if (state.mode === 'still' || state.pointerId !== null || event.isPrimary === false) return;
    if (directPointer && !shouldStartDirectFieldGesture({
      pointerType: event.pointerType,
      mode: state.mode,
      ...touchTargetContext(event.target),
    })) return;
    if (!directPointer && pointerIsInteractive(event.target)) return;
    state.pointerId = event.pointerId;
    state.pointerType = event.pointerType || 'mouse';
    state.lastPointerSample = null;
    if (directPointer) {
      state.touchColor.active = true;
      state.touchColor.startedAt = performance.now();
      state.touchColor.lastHoldAt = -Infinity;
      state.touchColor.startPosition = null;
      state.touchColor.scrollSessionActive = false;
      state.touchColor.scrollSessionStartedAt = -Infinity;
      state.touchColor.scrollPointerType = '';
    }
    interactionSurface.setPointerCapture(event.pointerId);
    interactionSurface.classList.add('field-table-interacting');
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
    const cancelled = event.type === 'pointercancel';
    const directPointer = isDirectPointerType(state.pointerType);
    const scrollSession = touchScrollSessionFromPointerEnd({
      pointerType: state.pointerType,
      eventType: event.type,
      now: performance.now(),
      position: state.pointer,
    });
    if (cancelled && directPointer) {
      state.colorCommands.length = 0;
      state.touchColor.lastQueuedSampleId = null;
    }
    if (interactionSurface.hasPointerCapture?.(event.pointerId)) interactionSurface.releasePointerCapture(event.pointerId);
    state.pointerId = null;
    state.lastPointerSample = null;
    state.pointer.active = false;
    state.touchColor.active = false;
    state.touchColor.startedAt = -Infinity;
    state.touchColor.lastHoldAt = -Infinity;
    state.touchColor.startPosition = null;
    state.touchColor.scrollSessionActive = scrollSession.scrollSessionActive;
    state.touchColor.scrollSessionStartedAt = scrollSession.startedAt;
    state.touchColor.scrollAnchor = scrollSession.anchor;
    state.touchColor.scrollPointerType = scrollSession.scrollSessionActive ? state.pointerType : '';
    state.pointerType = '';
    state.hasInteracted = true;
    interactionSurface.classList.remove('field-table-interacting');
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
    if (status) status.textContent = state.mode === 'color' ? 'Color cleared.' : 'Type reset.';
  };

  const visibilityChanged = () => {
    state.hidden = document.hidden;
    if (state.hidden) settle();
  };

  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const motionPreferenceChanged = (event) => {
    state.systemReducedMotion = event.matches;
    if (!state.explicitMode) {
      const next = resolveInitialFieldMode({
        reducedMotion: state.systemReducedMotion,
        primaryFine: primaryFinePointer?.matches,
        primaryCoarse: primaryCoarsePointer?.matches,
      });
      if (next.mode !== state.mode) selectMode(next.mode, { explicit: false });
    }
  };

  const inputCapabilityChanged = () => {
    routeInputModality('');
    if (!state.explicitMode) {
      const next = resolveInitialFieldMode({
        reducedMotion: state.systemReducedMotion,
        primaryFine: primaryFinePointer?.matches,
        primaryCoarse: primaryCoarsePointer?.matches,
      });
      if (next.mode !== state.mode) selectMode(next.mode, { explicit: false });
    }
  };
  const pointerEntered = (event) => routeInputModality(event.pointerType);
  const cycleDesktopMode = () => {
    const currentIndex = FIELD_MODES.indexOf(state.mode);
    selectMode(FIELD_MODES[(currentIndex + 1) % FIELD_MODES.length]);
  };

  interactionSurface.addEventListener('pointerover', pointerEntered, { passive: true });
  interactionSurface.addEventListener('pointerdown', pointerDown, { passive: true });
  interactionSurface.addEventListener('pointermove', pointerMove, { passive: true });
  interactionSurface.addEventListener('pointerup', pointerEnd, { passive: true });
  interactionSurface.addEventListener('pointercancel', pointerEnd, { passive: true });
  window.addEventListener('scroll', queueScrollColor, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', visibilityChanged);
  media?.addEventListener?.('change', motionPreferenceChanged);
  primaryFinePointer?.addEventListener?.('change', inputCapabilityChanged);
  primaryCoarsePointer?.addEventListener?.('change', inputCapabilityChanged);
  modeButtons.forEach((button) => {
    button.addEventListener('click', () => selectMode(button.dataset.fieldMode));
    button.addEventListener('keydown', keyDown);
  });
  resetButton?.addEventListener('click', resetField);
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
      interactionSurface.removeEventListener('pointerdown', pointerDown);
      interactionSurface.removeEventListener('pointerover', pointerEntered);
      interactionSurface.removeEventListener('pointermove', pointerMove);
      interactionSurface.removeEventListener('pointerup', pointerEnd);
      interactionSurface.removeEventListener('pointercancel', pointerEnd);
      window.removeEventListener('scroll', queueScrollColor);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibilityChanged);
      media?.removeEventListener?.('change', motionPreferenceChanged);
      primaryFinePointer?.removeEventListener?.('change', inputCapabilityChanged);
      primaryCoarsePointer?.removeEventListener?.('change', inputCapabilityChanged);
      modeButtons.forEach((button) => button.removeEventListener('keydown', keyDown));
      resetButton?.removeEventListener('click', resetField);
      desktopModeButton.removeEventListener('click', cycleDesktopMode);
      color.destroy();
      canvas.remove();
      probe.remove();
      desktopModeButton.remove();
      ROOT.classList.remove('field-enabled', 'field-table-enabled', 'field-motion-opt-in', ...FIELD_MODES.map((mode) => `field-mode-${mode}`));
      delete window.__mhaiderFieldTable;
    },
  };
  return window.__mhaiderFieldTable;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
