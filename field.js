import { createFieldPhysics } from './field-physics.js';
import { createFieldColor } from './field-color.js';

const STORAGE_KEY = 'mhaider.field.enabled';
const ROOT = document.documentElement;

function finePointer() {
  return window.matchMedia?.('(pointer: fine)').matches ?? true;
}

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function makeButton(enabled) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'field-toggle';
  button.setAttribute('aria-label', 'Toggle typography field');
  button.setAttribute('aria-pressed', String(enabled));
  button.textContent = `FIELD: ${enabled ? 'ON' : 'OFF'}`;
  return button;
}

function readPreference() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === 'on') return true;
    if (value === 'off') return false;
  } catch (_) { /* Storage can be unavailable in private or embedded contexts. */ }
  return finePointer();
}

function writePreference(enabled) {
  try { window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch (_) { /* no-op */ }
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
    target.style.setProperty('--field-x', `${Number.isFinite(x) ? x : 0}px`);
    target.style.setProperty('--field-y', `${Number.isFinite(y) ? y : 0}px`);
  });
}

function prepareGlyphs(targets) {
  const glyphs = [];
  targets.forEach((target) => {
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
        Array.from(part).forEach((character) => {
          const span = document.createElement('span');
          span.className = 'field-glyph';
          span.textContent = character;
          word.append(span);
          glyphs.push(span);
        });
        fragment.append(word);
      });
      node.replaceWith(fragment);
    });
  });
  return glyphs;
}

function mount() {
  if (window.__mhaiderField) return window.__mhaiderField;
  const targets = [...document.querySelectorAll('[data-field-target]')];
  if (!targets.length) return null;

  const enabledInitially = readPreference();
  const reduced = reducedMotion();
  const state = { enabled: enabledInitially, reducedMotion: reduced, hidden: false, lastPointerAt: -Infinity, pointer: { x: 0, y: 0, vx: 0, vy: 0, active: false } };
  const button = makeButton(state.enabled);
  document.body.append(button);

  const canvas = document.createElement('canvas');
  canvas.className = 'field-color-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const glyphTargets = prepareGlyphs(targets);
  const glyphs = glyphTargets.map((target) => {
    const rect = target.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
  const physics = createFieldPhysics({ glyphs, reducedMotion: reduced });
  const color = createFieldColor(canvas, { reducedMotion: reduced });
  const cursor = document.createElement('span');
  cursor.className = 'field-cursor-artifact';
  cursor.setAttribute('aria-hidden', 'true');
  document.body.append(cursor);

  let raf = 0;
  let last = performance.now();
  let resizeFrame = 0;
  let reducedClearTimer = 0;
  const resize = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      color?.resize?.(window.innerWidth, window.innerHeight, dpr);
      physics?.resize?.(window.innerWidth, window.innerHeight);
    });
  };

  const pointerMove = (event) => {
    const previous = state.pointer;
    const x = event.clientX;
    const y = event.clientY;
    state.pointer = { x, y, vx: x - previous.x, vy: y - previous.y, active: true };
    state.lastPointerAt = performance.now();
    cursor.style.setProperty('--field-cursor-x', `${x}px`);
    cursor.style.setProperty('--field-cursor-y', `${y}px`);
    if (reduced && state.enabled) {
      const frame = frameFromPhysics(physics, 0.016, { ...state.pointer, active: true });
      applyTargets(glyphTargets, frame);
      color?.render?.({ ...(frame || {}), enabled: true, reducedMotion: true, pointer: state.pointer }, 0.016);
      window.clearTimeout(reducedClearTimer);
      reducedClearTimer = window.setTimeout(() => {
        color?.clear?.();
        const settled = physics?.reset?.();
        applyTargets(glyphTargets, settled);
      }, 240);
    }
  };

  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
  const loop = (now) => {
    raf = 0;
    if (state.hidden || !state.enabled || state.reducedMotion) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const active = now - state.lastPointerAt < 160;
    const frame = frameFromPhysics(physics, dt, { ...state.pointer, active });
    applyTargets(glyphTargets, frame);
    color?.render?.({ ...(frame || {}), enabled: state.enabled && (active || (frame?.energy || 0) > 0.006), reducedMotion: false, pointer: state.pointer }, dt);
    state.pointer.vx *= 0.82; state.pointer.vy *= 0.82;
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (!state.hidden && state.enabled && !state.reducedMotion && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  };
  const updateControl = () => {
    button.textContent = `FIELD: ${state.enabled ? 'ON' : 'OFF'}`;
    button.setAttribute('aria-pressed', String(state.enabled));
    ROOT.classList.toggle('field-enabled', state.enabled);
    ROOT.classList.toggle('field-disabled', !state.enabled);
    if (!state.enabled) {
      stop();
      state.pointer.active = false;
      physics?.setPointer?.({ ...state.pointer, active: false });
      glyphTargets.forEach((target) => { target.style.setProperty('--field-x', '0px'); target.style.setProperty('--field-y', '0px'); });
      color?.clear?.();
    } else start();
  };
  const toggle = () => { state.enabled = !state.enabled; writePreference(state.enabled); updateControl(); };
  const visibility = () => { state.hidden = document.hidden; if (state.hidden) stop(); else start(); };

  button.addEventListener('click', toggle);
  window.addEventListener('pointermove', pointerMove, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', visibility);
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  media?.addEventListener?.('change', (event) => { state.reducedMotion = event.matches; stop(); if (!state.reducedMotion) start(); });
  resize(); updateControl();

  window.__mhaiderField = { destroy() { stop(); window.clearTimeout(reducedClearTimer); button.remove(); canvas.remove(); cursor.remove(); window.removeEventListener('pointermove', pointerMove); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', visibility); physics?.destroy?.(); color?.destroy?.(); delete window.__mhaiderField; } };
  return window.__mhaiderField;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
