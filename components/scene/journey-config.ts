// ALL tunables for the journey scene: palette, camera keyframes, blend
// breakpoints, fog, per-tier counts, plus tiny shared helpers (smoothstep,
// GLSL noise snippet, shared uniform factory).
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Palette (hex source of truth — do not import CSS)
// ---------------------------------------------------------------------------
// Miami Vice / cyberpunk regrade: hot pink against electric cyan over a
// navy-black night. The legacy slot names are kept so every shader keeps
// compiling — only the values moved (the old "gold" accent is now cyan,
// the old purple mid-tone is now electric blue).
export const HEX = {
  sunsetPink: '#ff2e88', // hot Miami pink
  sunsetMagenta: '#1e6fff', // electric blue (was purple)
  sunsetOrange: '#ff54b8', // pink mid (was orange)
  sunsetGold: '#22d3ee', // electric cyan (was lavender/gold)
  sunGoldTop: '#dffbff', // pale cyan sun crown
  void: '#04070f',
  voidDeep: '#02040a',
  deepPurpleHorizon: '#0a1533', // deep navy
  indigoNight: '#060c1f',
  fogA: '#12224d',
  fogB: '#08122b',
  fogC: '#03050c',
  waterBaseA: '#07143a',
  waterBaseB: '#040c22',
  cityBody: '#04060f',
  moonGold: '#c8f3ff', // pale cyan moon
  starPink: '#8fe6ff',
  cloudValley: '#12224d',
  cloudCrest: '#ff9ad5',
  spaceBase: '#03060f',
} as const;

/** THREE.Color from hex WITHOUT color-space conversion (raw sRGB numbers),
 * matching our raw-output ShaderMaterials. */
export function srgbColor(hex: string): THREE.Color {
  return new THREE.Color().setHex(parseInt(hex.slice(1), 16), THREE.NoColorSpace);
}

export const PALETTE = {
  sunsetPink: srgbColor(HEX.sunsetPink),
  sunsetMagenta: srgbColor(HEX.sunsetMagenta),
  sunsetOrange: srgbColor(HEX.sunsetOrange),
  sunsetGold: srgbColor(HEX.sunsetGold),
  void: srgbColor(HEX.void),
  voidDeep: srgbColor(HEX.voidDeep),
  deepPurpleHorizon: srgbColor(HEX.deepPurpleHorizon),
  indigoNight: srgbColor(HEX.indigoNight),
  moonGold: srgbColor(HEX.moonGold),
} as const;

/** GLSL vec3 literal from a hex string (raw sRGB values). */
export function glslColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return `vec3(${r.toFixed(4)}, ${g.toFixed(4)}, ${b.toFixed(4)})`;
}

// ---------------------------------------------------------------------------
// Fog
// ---------------------------------------------------------------------------
export const FOG_A = srgbColor(HEX.fogA);
export const FOG_B = srgbColor(HEX.fogB);
export const FOG_C = srgbColor(HEX.fogC);
export const FOG_NEAR = 30;
export const FOG_FAR = 160;

// ---------------------------------------------------------------------------
// Stage blend breakpoints (in sectionProgress units 0..7)
// ---------------------------------------------------------------------------
export const BLEND_AB: readonly [number, number] = [1.25, 2.25]; // sunset -> city
// finishes before the events section so the manifest reads against clean space
// (in sectionProgress units — store is now index 5, events 6, with games at 4)
export const BLEND_BC: readonly [number, number] = [5.0, 5.9]; // city -> space

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------------------
// Camera keyframes — one per section index 0..8
// (hero, music, videos, gallery, games, store, events, about, contact)
// ---------------------------------------------------------------------------
export type CameraKeyframe = {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
};

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export const CAMERA_KEYFRAMES: readonly CameraKeyframe[] = [
  { position: v(0, 2.5, 10), lookAt: v(0, 6, -110) }, // hero
  { position: v(1.5, 3, 6), lookAt: v(-2, 6, -110) }, // music
  { position: v(5, 4, -10), lookAt: v(-10, 8, -75) }, // videos
  { position: v(-4, 5, -22), lookAt: v(10, 10, -75) }, // gallery
  // street-level swoop through the towers — the racing-game section
  { position: v(4, 3.6, -26), lookAt: v(-8, 8, -78) }, // games
  { position: v(0, 7, -30), lookAt: v(0, 14, -80) }, // store
  // y stays above the cloud-sea plane (y=18) so it never slices the view edge-on
  { position: v(0, 23, -38), lookAt: v(0, 32, -120) }, // events
  { position: v(2, 26, -45), lookAt: v(-32, 46, -110) }, // about
  { position: v(0, 32, -50), lookAt: v(0, 34, -120) }, // contact
];

export const POINTER_PARALLAX_X = 0.5;
export const POINTER_PARALLAX_Y = 0.3;
export const CAMERA_DAMP_LAMBDA = 3;
export const CAMERA_DAMP_LAMBDA_REDUCED = 12;

// ---------------------------------------------------------------------------
// Per-tier counts / toggles
// ---------------------------------------------------------------------------
export type TierConfig = {
  dpr: number | [number, number];
  cityCount: number;
  starCount: number;
  nebulaCount: number;
  cloudSegments: number;
  antennaLights: boolean;
  waterGrid: boolean;
};

export const TIERS: Record<'high' | 'low', TierConfig> = {
  high: {
    dpr: [1, 2],
    cityCount: 240,
    starCount: 6500,
    nebulaCount: 7,
    cloudSegments: 128,
    antennaLights: true,
    waterGrid: true,
  },
  low: {
    dpr: 1,
    cityCount: 80,
    starCount: 1500,
    nebulaCount: 3,
    cloudSegments: 48,
    antennaLights: false,
    waterGrid: false,
  },
};

// ---------------------------------------------------------------------------
// Shared per-frame uniforms — single IUniform instances referenced by many
// materials. journey-scene.tsx is the sole writer (priority -1 useFrame).
// ---------------------------------------------------------------------------
export type SharedUniforms = {
  uTime: THREE.IUniform<number>;
  uBlendAB: THREE.IUniform<number>;
  uBlendBC: THREE.IUniform<number>;
  uReduced: THREE.IUniform<number>;
  uDpr: THREE.IUniform<number>;
};

export function createSharedUniforms(): SharedUniforms {
  return {
    uTime: { value: 0 },
    uBlendAB: { value: 0 },
    uBlendBC: { value: 0 },
    uReduced: { value: 0 },
    uDpr: { value: 1 },
  };
}

// ---------------------------------------------------------------------------
// GLSL helpers shared by inline shaders (hash / value noise / fbm)
// ---------------------------------------------------------------------------
export const GLSL_NOISE = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm2(vec2 p) {
  return vnoise(p) * 0.65 + vnoise(p * 2.13 + 17.7) * 0.35;
}
float fbm3(vec2 p) {
  return vnoise(p) * 0.5 + vnoise(p * 2.02 + 9.1) * 0.3 + vnoise(p * 4.07 + 31.3) * 0.2;
}
`;

/** Deterministic PRNG for instance layouts (stable across reloads). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
