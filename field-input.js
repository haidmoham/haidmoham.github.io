export const POINTER_ACTIVE_MS = 160;
export const DIRECT_TOUCH_ACTIVE_MS = 220;
export const DIRECT_TOUCH_CHARGE_SCALE = 1600;
export const DIRECT_VIEWPORT_GRACE_MS = 1500;

const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

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
