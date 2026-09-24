// Deterministic layout for the neon city — where every tower stands, its
// archetype, size and neon. Pure data so the water can read the same towers
// to lay their reflections, and so the skyline is identical on every load.
//
// The skyline reads front to back as separate planes with sky between them:
// a waterfront row of mid-rise, a landmark cluster at center, a taller back
// row, and a far silhouette row that the fog mostly swallows.

import * as THREE from 'three';

import { HEX, mulberry32 } from '../journey-config';
import type { QualityTier } from '../quality';
import type { Archetype } from './tower-geometry';

export type Tower = {
  kind: Archetype;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  /** 0 corner strips · 1 single front blade · 2 floor rings · 3 crown only */
  style: number;
  neon: THREE.Color;
  seed: number;
};

/** Neon accents, weighted toward the Miami pair. */
const NEON: Array<[string, number]> = [
  [HEX.sunsetPink, 0.34],
  [HEX.sunsetGold, 0.3], // electric cyan
  ['#8b5cf6', 0.2], // violet
  ['#d946ef', 0.1], // magenta
  ['#fff1dc', 0.06], // warm white
];

/** Front edge of the waterfront promenade, as a function of x. */
export const promenadeZ = (x: number) => -52 - 2.2 * Math.sin(x * 0.045) - 0.6 * Math.sin(x * 0.13);

/** Holo-screens on the promenade; the waterfront row leaves room for them. */
export const BILLBOARDS = [
  {
    x: -40,
    y: 5.2,
    width: 9.6,
    height: 4.2,
    rotation: 0.16,
    image: '/label/banner.webp',
    gradient: ['#ff2e88', '#7b3bff', '#1e1b5e'],
  },
  {
    x: 47,
    y: 6.2,
    width: 5.6,
    height: 5.6,
    rotation: -0.22,
    image: '/label/seal.webp',
    gradient: ['#22d3ee', '#1e3a8a', '#0b1030'],
  },
] as const;

/** Moon position (see moon.tsx) and the eye it must stay visible from. */
const MOON = new THREE.Vector3(-28, 34, -105);
const EYE = new THREE.Vector3(2, 5, -12);

type Row = {
  zNear: number;
  zFar: number;
  xFrom: number;
  xTo: number;
  gap: [number, number];
  height: [number, number];
  width: [number, number];
  kinds: Array<[Archetype, number]>;
  /** Rows beyond this tier are dropped. */
  tier: QualityTier;
};

const ROWS: Row[] = [
  // waterfront: mid-rise, spaced so the promenade and sky show through
  {
    zNear: -57, zFar: -63, xFrom: -95, xTo: 95, gap: [5.5, 9.5], height: [7, 20], width: [3.2, 5.6],
    kinds: [['capsule', 0.3], ['slab', 0.3], ['sail', 0.2], ['stepped', 0.2]], tier: 'low',
  },
  // mid city
  {
    zNear: -69, zFar: -80, xFrom: -110, xTo: 110, gap: [5, 8.5], height: [14, 32], width: [3.8, 6.4],
    kinds: [['twist', 0.25], ['slab', 0.25], ['capsule', 0.2], ['stepped', 0.15], ['sail', 0.15]], tier: 'low',
  },
  // back row, taller
  {
    zNear: -94, zFar: -116, xFrom: -130, xTo: 130, gap: [5.5, 9], height: [20, 44], width: [4.5, 7.5],
    kinds: [['slab', 0.3], ['twist', 0.3], ['capsule', 0.2], ['stepped', 0.2]], tier: 'low',
  },
  // far silhouette — mostly fog
  {
    zNear: -122, zFar: -142, xFrom: -160, xTo: 160, gap: [4, 7], height: [12, 30], width: [4, 7],
    kinds: [['slab', 0.6], ['capsule', 0.4]], tier: 'high',
  },
];

/** Hand-placed landmark supertalls at the center of the skyline. */
const LANDMARKS: Array<Omit<Tower, 'neon' | 'seed' | 'style'> & { neon: string; style: number }> = [
  { kind: 'twist', x: 4, z: -84, width: 8.2, depth: 8.2, height: 58, rotation: 0.2, style: 0, neon: HEX.sunsetGold },
  { kind: 'sail', x: 16, z: -88, width: 11, depth: 11, height: 52, rotation: -0.35, style: 1, neon: HEX.sunsetPink },
  { kind: 'stepped', x: -9, z: -90, width: 8.8, depth: 8.8, height: 48, rotation: 0, style: 2, neon: '#8b5cf6' },
  { kind: 'capsule', x: 27, z: -80, width: 7, depth: 7, height: 42, rotation: 0, style: 2, neon: HEX.sunsetPink },
  { kind: 'sail', x: -19, z: -82, width: 9, depth: 9, height: 38, rotation: 0.5, style: 1, neon: HEX.sunsetGold },
];

function pick<T>(rand: () => number, weighted: Array<[T, number]>): T {
  let r = rand() * weighted.reduce((sum, [, w]) => sum + w, 0);
  for (const [value, w] of weighted) {
    r -= w;
    if (r <= 0) return value;
  }
  return weighted[weighted.length - 1][0];
}

/** Height the moon's line of sight passes at a given z, or null if not near. */
function moonCeiling(x: number, z: number, halfWidth: number): number | null {
  const t = (z - EYE.z) / (MOON.z - EYE.z);
  if (t <= 0 || t >= 1) return null;
  const sightX = EYE.x + (MOON.x - EYE.x) * t;
  const sightY = EYE.y + (MOON.y - EYE.y) * t;
  return Math.abs(x - sightX) < halfWidth + 5 ? sightY - 5 : null;
}

const cache = new Map<QualityTier, Tower[]>();

export function cityLayout(tier: QualityTier): Tower[] {
  const hit = cache.get(tier);
  if (hit) return hit;

  const rand = mulberry32(0x5eed_c17);
  const towers: Tower[] = [];

  for (const l of LANDMARKS) {
    towers.push({ ...l, neon: new THREE.Color(l.neon), seed: Math.floor(rand() * 1000) });
  }

  const clearOfLandmarks = (x: number, z: number, w: number) =>
    LANDMARKS.every((l) => Math.hypot(l.x - x, l.z - z) > (l.width + w) * 0.62) &&
    BILLBOARDS.every((b) => z < -66 || Math.abs(b.x - x) > (b.width + w) / 2 + 1.5);

  for (const row of ROWS) {
    if (tier === 'low' && row.tier === 'high') continue;
    let x = row.xFrom + rand() * row.gap[1];
    while (x < row.xTo) {
      const width = row.width[0] + rand() * (row.width[1] - row.width[0]);
      const z = row.zNear + rand() * (row.zFar - row.zNear);
      // landmarks own the center; nearer rows stay lower in front of them
      const central = Math.abs(x - 5) < 30;
      let height = row.height[0] + rand() * (row.height[1] - row.height[0]);
      if (central && row.zNear > -75) height *= 0.72;

      const ceiling = moonCeiling(x, z, width / 2);
      if (ceiling !== null) height = Math.min(height, ceiling);

      let kind = pick(rand, row.kinds);
      // domes, blades and setbacks only read as towers when tall; squat, they
      // turn into jars — those become slabs or twists instead
      if (kind !== 'slab' && kind !== 'twist' && height < width * 3.2) {
        kind = rand() < 0.5 ? 'slab' : 'twist';
      }
      const style = Math.floor(rand() * 4);
      const neon = new THREE.Color(pick(rand, NEON));
      const rotation = kind === 'sail' ? (rand() - 0.5) * 1.6 : (rand() - 0.5) * 0.7;
      const seed = Math.floor(rand() * 1000);

      if (height > 5 && clearOfLandmarks(x, z, width)) {
        towers.push({
          kind,
          x,
          z,
          width,
          depth: kind === 'slab' ? width * 0.9 : width,
          height,
          rotation,
          style,
          neon,
          seed,
        });
      }

      const gap = row.gap[0] + rand() * (row.gap[1] - row.gap[0]);
      // low tier keeps the same skyline, just sparser
      x += width * 0.5 + gap * (tier === 'low' ? 1.5 : 1);
    }
  }

  cache.set(tier, towers);
  return towers;
}

/**
 * The brightest vertical neon in the skyline — the lights the water reflects.
 * Towers with blade or corner strips, nearest and tallest first.
 */
export function reflectionSources(tier: QualityTier, max: number) {
  return cityLayout(tier)
    .filter((t) => t.style <= 1 && t.z > -100)
    .map((t) => ({ t, score: t.height / Math.max(20, -t.z - 30) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ t }) => t);
}
