/**
 * User/device preference helpers. Pure, side-effect free.
 */

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function hasFinePointer() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(pointer: fine)').matches;
}

export function saveData() {
  if (typeof navigator === 'undefined') return false;
  return navigator.connection?.saveData ?? false;
}
