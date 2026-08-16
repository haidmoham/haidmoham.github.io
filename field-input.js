export const POINTER_ACTIVE_MS = 160;
export const DIRECT_TOUCH_ACTIVE_MS = 220;
export const DIRECT_TOUCH_CHARGE_SCALE = 1600;

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
