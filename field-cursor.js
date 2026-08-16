/**
 * Optional custom cursor artifact for the typography field.
 *
 * This module is deliberately not imported by field.js. Keeping the cursor in
 * a self-contained opt-in module preserves the experiment without replacing
 * the browser cursor in the portfolio's active experience.
 */
export function createFieldCursorArtifact(root = document.documentElement) {
  const cursor = document.createElement('span');
  cursor.className = 'field-cursor-artifact';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = `
    <svg class="field-cursor-arrow" viewBox="0 0 32 42" aria-hidden="true" focusable="false">
      <path d="M3 2.5 29.1 22.7 17.8 24.8 25.1 37.5 18 41 10.8 28.1 3 35.2Z"
        fill="#050505" stroke="#fff" stroke-width="2.6" stroke-linejoin="round" />
    </svg>`;
  document.body.append(cursor);
  root.classList.add('field-custom-cursor');

  let idleTimer = 0;
  function update(pointer) {
    const speed = Math.min(Math.hypot(pointer.vx, pointer.vy), 5000);
    cursor.style.setProperty('--field-cursor-x', `${pointer.x}px`);
    cursor.style.setProperty('--field-cursor-y', `${pointer.y}px`);
    cursor.style.setProperty('--field-cursor-vx', `${pointer.vx * 0.02}deg`);
    cursor.style.setProperty('--field-cursor-vy', `${pointer.vy * 0.02}deg`);
    cursor.style.setProperty('--field-cursor-energy', `${Math.min(speed / 1600, 1)}`);
    cursor.classList.add('field-cursor-active');
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => cursor.classList.remove('field-cursor-active'), 190);
  }

  function destroy() {
    window.clearTimeout(idleTimer);
    cursor.remove();
    root.classList.remove('field-custom-cursor');
  }

  return { node: cursor, update, destroy };
}

export default createFieldCursorArtifact;
