/**
 * Scroll choreography keyframes + blending for the NotToBAD Records scene.
 *
 * Every keyframe is a flat map of numbers so blending is a plain normalized
 * weighted average. Scene.js damps its "current" state toward the blended
 * target every frame for a liquid feel.
 */

export const SECTIONS = [
  'hero',
  'music',
  'videos',
  'gallery',
  'store',
  'events',
  'about',
  'contact',
];

// Baseline state — every section keyframe is DEFAULTS + overrides.
const DEFAULTS = {
  // Camera
  camX: 0, camY: 0, camZ: 8,
  lookX: 0, lookY: 0, lookZ: 0,
  roll: 0,
  // Vinyl record group
  vinylX: 0, vinylY: 0, vinylZ: 0,
  vinylRotX: -0.35, vinylRotY: 0,
  vinylScale: 1,
  vinylSpin: 0.15,
  labelPulse: 0,
  // Waveform group
  waveX: 0, waveY: -6, waveSpread: 1,
  // Chrome shards group
  shardX: 0, shardY: 0, shardZ: -14,
  shardSpheresScale: 1,
  shardOrbit: 0,
  // Particle uniforms
  swirl: 0, flatten: 0, goldMix: 0, fade: 1,
  // Gold point light
  goldLight: 0.6,
};

const OVERRIDES = {
  hero: {},

  music: {
    camX: 2.2, camY: 0.4, camZ: 6.5,
    lookX: 1,
    vinylX: -2.8, vinylRotY: 1.2,
    waveX: 1.5, waveY: -1.8,
  },

  videos: {
    camX: 0, camY: -0.5, camZ: 7,
    roll: 0.05,
    vinylX: -6, vinylY: 3, vinylZ: 0, vinylRotY: 1.4,
    waveX: 0, waveY: -1.6, waveSpread: 1.6,
  },

  gallery: {
    camX: 0, camY: 0, camZ: 5.5,
    vinylX: -6, vinylY: 3,
    waveY: -6,
    shardX: 2.5, shardY: 0, shardZ: -2,
    shardOrbit: 1,
    swirl: 1,
  },

  store: {
    camX: -1.5, camY: 0.3, camZ: 6,
    vinylX: -6, vinylY: 3,
    shardX: -3, shardY: 0, shardZ: -3,
    shardSpheresScale: 1.3,
    shardOrbit: 1,
    goldMix: 0.8,
    goldLight: 1.4,
  },

  events: {
    camX: 0, camY: -1, camZ: 7,
    lookY: 1.5,
    vinylX: -6, vinylY: 3,
    shardX: 0, shardY: 0, shardZ: -12,
    flatten: 1, swirl: 0,
  },

  about: {
    camX: 0, camY: 0, camZ: 9,
    vinylX: 0, vinylY: 0, vinylZ: -4,
    vinylScale: 0.55, vinylSpin: 0.05,
    fade: 0.5, flatten: 0,
  },

  contact: {
    camX: 0, camY: 0.2, camZ: 8,
    vinylX: 0, vinylY: 0, vinylZ: -4,
    vinylScale: 0.55, vinylSpin: 0.05,
    labelPulse: 1,
    waveX: 0, waveY: -3, waveSpread: 1.5,
    fade: 0.7,
  },
};

export const KEYFRAMES = {};
for (const name of SECTIONS) {
  KEYFRAMES[name] = Object.assign({}, DEFAULTS, OVERRIDES[name]);
}

export const KEYFRAME_KEYS = Object.keys(DEFAULTS);

export function getKeyframe(name) {
  return KEYFRAMES[name] || KEYFRAMES.hero;
}

/**
 * Blend keyframes by a { sectionName: weight } map (normalized weighted
 * average). Falls back to the hero keyframe when total weight is ~0.
 * Writes into `out` if provided (avoids per-frame allocation).
 */
export function blendKeyframes(weights, out = {}) {
  let total = 0;
  for (const name in weights) {
    if (KEYFRAMES[name]) total += weights[name];
  }

  if (total < 1e-5) {
    Object.assign(out, KEYFRAMES.hero);
    return out;
  }

  for (const key of KEYFRAME_KEYS) {
    let v = 0;
    for (const name in weights) {
      const kf = KEYFRAMES[name];
      if (kf) v += kf[key] * weights[name];
    }
    out[key] = v / total;
  }
  return out;
}

/**
 * Weight curve for a section's local progress: peaks at p = 0.5.
 */
export function progressWeight(p) {
  const c = Math.min(1, Math.max(0, p));
  return Math.sin(c * Math.PI);
}
