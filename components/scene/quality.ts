// Device-tier detection + WebGL capability probe.
// Pure functions, safe to call only in the browser (guarded for SSR anyway).

export type QualityTier = 'high' | 'low';

/**
 * 'low' if hardwareConcurrency<=4 || deviceMemory<=4 || (coarse pointer && width<900).
 */
export function detectTier(): QualityTier {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'low';
  }
  try {
    // Explicit override for debugging/testing: ?ntb-tier=high|low
    const forced = new URLSearchParams(window.location.search).get('ntb-tier');
    if (forced === 'high' || forced === 'low') return forced;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const cores = nav.hardwareConcurrency ?? 8;
    const memory = nav.deviceMemory ?? 8;
    const coarse = window.matchMedia
      ? window.matchMedia('(pointer: coarse)').matches
      : false;
    if (cores <= 4 || memory <= 4 || (coarse && window.innerWidth < 900)) {
      return 'low';
    }
    return 'high';
  } catch {
    return 'low';
  }
}

/**
 * Try webgl2 then webgl on a scratch canvas. Never throws.
 */
export function probeWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    return gl !== null && gl !== undefined;
  } catch {
    return false;
  }
}
