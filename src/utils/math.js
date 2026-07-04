/**
 * Tiny pure math helpers for the DOM/scroll side.
 */

export function clamp(value, min = 0, max = 1) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function mapRange(value, inMin, inMax, outMin, outMax, clampOutput = false) {
  if (inMax === inMin) return outMin;
  const t = (value - inMin) / (inMax - inMin);
  const out = outMin + (outMax - outMin) * t;
  if (!clampOutput) return out;
  const lo = Math.min(outMin, outMax);
  const hi = Math.max(outMin, outMax);
  return clamp(out, lo, hi);
}
