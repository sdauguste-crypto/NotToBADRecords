/**
 * Quality tier detection for the NotToBAD Records WebGL scene.
 * Returns 'high' | 'med' | 'low' | 'none'. Never throws.
 */
export function detectQuality() {
  // 1. WebGL availability check
  let gl = null;
  try {
    const probe = document.createElement('canvas');
    gl =
      probe.getContext('webgl2') ||
      probe.getContext('webgl') ||
      probe.getContext('experimental-webgl');
  } catch (e) {
    gl = null;
  }
  if (!gl) return 'none';

  try {
    // 2. Software renderer check
    let rendererString = '';
    try {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        rendererString = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
      }
    } catch (e) {
      rendererString = '';
    }

    // Release the probe context if possible.
    try {
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch (e) {
      /* noop */
    }

    if (/swiftshader|software|llvmpipe|microsoft basic/i.test(rendererString)) {
      return 'low';
    }

    // 3. Mid-tier heuristics
    let coarse = false;
    try {
      coarse =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(pointer: coarse)').matches;
    } catch (e) {
      coarse = false;
    }

    const small =
      typeof window !== 'undefined' && typeof window.innerWidth === 'number'
        ? window.innerWidth < 900
        : false;

    const mem =
      typeof navigator !== 'undefined' ? navigator.deviceMemory : undefined;
    const lowMem = typeof mem === 'number' && mem <= 4;

    if (coarse || small || lowMem) return 'med';

    return 'high';
  } catch (e) {
    // Context exists but heuristics failed somewhere unexpected — play it safe.
    return 'med';
  }
}

export default detectQuality;
