export const POINTER_ACTIVE_MS = 160;
export const DIRECT_TOUCH_ACTIVE_MS = 220;
export const DIRECT_TOUCH_CHARGE_SCALE = 1600;
export const DIRECT_VIEWPORT_GRACE_MS = 1500;
export const TOUCH_COLOR_HOLD_DELAY_MS = 280;
export const TOUCH_COLOR_HOLD_INTERVAL_MS = 150;
export const TOUCH_COLOR_SLOP_PX = 8;
export const TOUCH_SCROLL_SESSION_MS = 1500;

const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

/**
 * Color commands are consumed once by the renderer. A physical pointer
 * sample may be rendered across several animation frames, so the sample id
 * is the idempotency boundary rather than the frame cadence.
 */
export function shouldQueueTouchColorCommand({
  phase = '',
  freshSample = false,
  sampleId = null,
  lastQueuedSampleId = null,
  cancelled = false,
  touchActive,
  scrollEligible,
} = {}) {
  if (phase === 'scroll' && touchActive === false && scrollEligible === false) return false;
  if (cancelled || !freshSample || !Number.isFinite(sampleId)) return false;
  return sampleId !== lastQueuedSampleId;
}

export function shouldQueueTouchPointerEnd({
  moved = false,
  freshSample = false,
  cancelled = false,
} = {}) {
  return !cancelled && Boolean(moved) && Boolean(freshSample);
}

export function shouldQueueScrollColorCommand({
  activePointer = false,
  pointerType = '',
  recentlyDirect = false,
  distance = 0,
  scrollSessionActive = false,
  sessionStartedAt = -Infinity,
  now = 0,
  sessionDurationMs = TOUCH_SCROLL_SESSION_MS,
} = {}) {
  if (!isDirectPointerType(pointerType) || !recentlyDirect || finite(distance) <= 0) return false;
  if (activePointer) return true;
  if (!scrollSessionActive) return false;
  const started = finite(sessionStartedAt, -Infinity);
  const current = finite(now);
  const duration = Math.max(0, finite(sessionDurationMs, TOUCH_SCROLL_SESSION_MS));
  return current - started >= 0 && current - started < duration;
}

export function classifyTouchColorPhase({ pointerType = '', distance = 0, slop = TOUCH_COLOR_SLOP_PX } = {}) {
  if (pointerType === 'pen') return 'drag';
  return finite(distance) <= Math.max(0, finite(slop, TOUCH_COLOR_SLOP_PX)) ? 'tap' : 'drag';
}

export function touchScrollSessionFromPointerEnd({
  pointerType = '',
  eventType = '',
  now = 0,
  position = {},
} = {}) {
  const direct = pointerType === 'touch';
  const cancelled = eventType === 'pointercancel';
  return {
    activePointer: false,
    scrollSessionActive: direct && cancelled,
    startedAt: direct && cancelled ? finite(now) : -Infinity,
    anchor: { x: finite(position.x), y: finite(position.y) },
  };
}

export function touchColorPointerPolicy({ pointerType = '', phase = '' } = {}) {
  const touch = pointerType === 'touch';
  return {
    radial: touch,
    intentionalDrag: !touch && phase === 'drag',
    scrollSession: touch,
  };
}

export function consumeColorCommandBatch(commands = [], maximum = 8) {
  const queue = Array.isArray(commands) ? commands : [];
  const limit = Math.max(0, Math.floor(finite(maximum, 8)));
  return {
    commands: queue.slice(0, limit),
    remaining: queue.slice(limit),
  };
}

/** Stationary touch gestures deliberately produce a dab/bloom, never a wake. */
export function touchColorWake({ phase = '', velocity = {} } = {}) {
  if (phase !== 'drag' && phase !== 'scroll') return { x: 0, y: 0 };
  const x = finite(velocity?.x);
  const y = finite(velocity?.y);
  const distance = Math.hypot(x, y);
  if (distance <= 1e-8) return { x: 0, y: 0 };
  return { x: x / distance, y: y / distance };
}

/** Bound scroll-derived color to a small local displacement. */
export function clampScrollColorCommand({ deltaX = 0, deltaY = 0, maxDistance = 80 } = {}) {
  const x = finite(deltaX);
  const y = finite(deltaY);
  const limit = Math.max(0, finite(maxDistance, 80));
  const distance = Math.hypot(x, y);
  if (distance <= limit || distance <= 1e-8) return { x, y };
  const scale = limit / distance;
  return { x: x * scale, y: y * scale };
}

export function classifyFieldViewportChange(previous = {}, next = {}, {
  recentDirectInput = false,
} = {}) {
  const previousWidth = finite(previous.width);
  const previousHeight = finite(previous.height);
  const previousDpr = finite(previous.dpr, 1);
  const nextWidth = finite(next.width);
  const nextHeight = finite(next.height);
  const nextDpr = finite(next.dpr, 1);
  const widthChanged = Math.abs(nextWidth - previousWidth) >= 1;
  const heightChanged = Math.abs(nextHeight - previousHeight) >= 1;
  const dprChanged = Math.abs(nextDpr - previousDpr) >= 0.01;
  if (!widthChanged && !heightChanged && !dprChanged) return 'none';
  if (recentDirectInput && heightChanged && !widthChanged && !dprChanged) {
    return 'transient-height';
  }
  return 'layout';
}

export function isDirectPointerType(pointerType) {
  return pointerType === 'touch' || pointerType === 'pen';
}

export function resolveFieldInputModality(pointerType, {
  primaryFine = false,
  primaryCoarse = false,
} = {}) {
  if (pointerType === 'mouse') return 'cursor';
  if (pointerType === 'touch') return 'touch';
  if (pointerType === 'pen') return 'pen';
  if (primaryFine) return 'cursor';
  if (primaryCoarse) return 'touch';
  return 'pointer';
}

export function shouldTrackFieldPointerMove({
  pointerType,
  pointerId,
  ownedPointerId = null,
  interactiveTarget = false,
  isPrimary = true,
} = {}) {
  if (isPrimary === false) return false;
  if (ownedPointerId !== null) return pointerId === ownedPointerId;
  return pointerType === 'mouse' && !interactiveTarget;
}

export function shouldStartDirectFieldGesture({
  pointerType,
  mode,
  authoredTarget = false,
  interactiveTarget = false,
} = {}) {
  return isDirectPointerType(pointerType) && mode !== 'still' &&
    Boolean(authoredTarget) && !interactiveTarget;
}

export function pointerActivityDeadline(now, pointerType, phase = 'move') {
  const timestamp = Number.isFinite(now) ? now : 0;
  const directPress = phase === 'down' && isDirectPointerType(pointerType);
  return timestamp + (directPress ? DIRECT_TOUCH_ACTIVE_MS : POINTER_ACTIVE_MS);
}
