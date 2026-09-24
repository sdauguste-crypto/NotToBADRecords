// Sculptural tower geometry for the neon city. Every archetype is one sweep:
// a closed cross-section traced at a stack of heights, each ring scaled,
// shifted and twisted by a function of height. Base sits at y=0, the tower is
// one unit tall and about one unit across, so an instance matrix supplies the
// real width/height/depth.
//
// uv.x runs once around the ring (0 and 1 meet at the seam, uv.x = 0.25 faces
// +z before instance rotation); uv.y is height 0..1. The tower shader leans on
// both — windows, neon strips and the crown are all placed in that space.

import * as THREE from 'three';

type Sweep = {
  /** Cross-section at angle t (radians), spanning about -0.5..0.5. */
  shape: (t: number) => [number, number];
  /** Heights (0..1) at which a ring is traced, ascending. */
  ys: number[];
  /** Width multiplier at height y; 0 closes the tower to a point. */
  scale: (y: number) => number;
  /** Center drift at height y. */
  offset?: (y: number) => [number, number];
  /** Rotation of the ring at height y, radians. */
  twist?: (y: number) => number;
  /** Ring height override for the top ring (slanted roofs). */
  topY?: (x: number, z: number) => number;
  segments: number;
  cap: boolean;
};

function sweep(spec: Sweep): THREE.BufferGeometry {
  const { shape, ys, scale, offset, twist, topY, segments, cap } = spec;
  const ring = segments + 1; // the seam is duplicated so uv.x can run 0..1
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  ys.forEach((y, level) => {
    const s = scale(y);
    const [ox, oz] = offset ? offset(y) : [0, 0];
    const a = twist ? twist(y) : 0;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const last = level === ys.length - 1;
    for (let k = 0; k <= segments; k++) {
      const [sx, sz] = shape((k / segments) * Math.PI * 2);
      const x = (sx * ca - sz * sa) * s + ox;
      const z = (sx * sa + sz * ca) * s + oz;
      positions.push(x, last && topY ? topY(x, z) : y, z);
      uvs.push(k / segments, y);
    }
  });

  for (let l = 0; l < ys.length - 1; l++) {
    for (let k = 0; k < segments; k++) {
      const a = l * ring + k;
      const b = a + ring;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();

  if (cap) {
    // The roof gets its own vertices so its normal stays flat and sharp.
    const top = (ys.length - 1) * ring;
    const base = positions.length / 3;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let k = 0; k < segments; k++) {
      cx += positions[(top + k) * 3];
      cy += positions[(top + k) * 3 + 1];
      cz += positions[(top + k) * 3 + 2];
    }
    positions.push(cx / segments, cy / segments, cz / segments);
    uvs.push(0.5, 1);
    for (let k = 0; k <= segments; k++) {
      const i = (top + k) * 3;
      positions.push(positions[i], positions[i + 1], positions[i + 2]);
      uvs.push(k / segments, 1);
    }
    for (let k = 0; k < segments; k++) {
      indices.push(base, base + 2 + k, base + 1 + k);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  // The duplicated seam vertices only see the faces on their own side, which
  // would print a hard vertical crease down every tower — average them.
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const n = new THREE.Vector3();
  for (let l = 0; l < ys.length; l++) {
    const i0 = l * ring;
    const i1 = i0 + segments;
    n.set(
      normal.getX(i0) + normal.getX(i1),
      normal.getY(i0) + normal.getY(i1),
      normal.getZ(i0) + normal.getZ(i1),
    ).normalize();
    normal.setXYZ(i0, n.x, n.y, n.z);
    normal.setXYZ(i1, n.x, n.y, n.z);
  }
  normal.needsUpdate = true;
  geometry.computeBoundingSphere();
  return geometry;
}

// ---------------------------------------------------------------------------
// Cross-sections and height stacks
// ---------------------------------------------------------------------------

const circle = (t: number): [number, number] => [0.5 * Math.cos(t), 0.5 * Math.sin(t)];

/** Superellipse — a rounded square whose corners sit at t = 45°, 135°, … */
function squircle(power: number, aspect = 1) {
  const e = 2 / power;
  return (t: number): [number, number] => {
    const c = Math.cos(t);
    const s = Math.sin(t);
    return [
      0.5 * Math.sign(c) * Math.abs(c) ** e,
      0.5 * aspect * Math.sign(s) * Math.abs(s) ** e,
    ];
  };
}

/** A lens pinched to points at t = 0 and π — the fin/sail footprint. */
const lens = (t: number): [number, number] => {
  const s = Math.sin(t);
  return [0.5 * Math.cos(t), 0.23 * Math.sign(s) * Math.abs(s) ** 0.75];
};

const range = (from: number, to: number, steps: number) =>
  Array.from({ length: steps + 1 }, (_, i) => from + ((to - from) * i) / steps);

/** Union of height stacks, sorted and de-duplicated. */
const stack = (...parts: number[][]) =>
  [...new Set(parts.flat().map((y) => Math.round(y * 1e5) / 1e5))].sort((a, b) => a - b);

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------------------
// Archetypes
// ---------------------------------------------------------------------------

export type Archetype = 'capsule' | 'twist' | 'sail' | 'stepped' | 'slab';

export const ARCHETYPES: Archetype[] = ['capsule', 'twist', 'sail', 'stepped', 'slab'];

/** Build one unit tower. `detail` 1 = full, 0.5 = low tier. */
export function buildArchetype(kind: Archetype, detail = 1): THREE.BufferGeometry {
  const seg = (n: number) => Math.max(8, Math.round(n * detail));

  switch (kind) {
    // Bullet tower: a slow taper into a domed crown.
    case 'capsule': {
      const SHOULDER = 0.84;
      const taper = (y: number) => 1 - 0.14 * y;
      return sweep({
        shape: circle,
        ys: stack(range(0, SHOULDER, seg(12)), range(SHOULDER, 1, seg(9))),
        scale: (y) =>
          y <= SHOULDER
            ? taper(y)
            : taper(SHOULDER) * Math.sqrt(Math.max(0, 1 - ((y - SHOULDER) / (1 - SHOULDER)) ** 2)),
        segments: seg(32),
        cap: false,
      });
    }

    // Rounded-square prism that tapers and turns ~45° as it climbs.
    case 'twist':
      return sweep({
        shape: squircle(5),
        ys: range(0, 1, seg(28)),
        scale: (y) => 1 - 0.32 * y,
        twist: (y) => 0.78 * y,
        segments: seg(36),
        cap: true,
      });

    // Leaf-plan fin that sweeps back and closes to a blade at the top.
    case 'sail':
      return sweep({
        shape: lens,
        ys: stack(range(0, 0.8, seg(16)), range(0.8, 1, seg(10))),
        scale: (y) => Math.max(0, 1 - y ** 3.2) ** 0.55,
        offset: (y) => [-0.34 * y * y, 0],
        segments: seg(32),
        cap: false,
      });

    // Round tower with three setbacks, each a clean ledge.
    case 'stepped': {
      const steps = [0.34, 0.6, 0.8];
      const EDGE = 0.012;
      return sweep({
        shape: circle,
        ys: stack(
          range(0, 1, seg(20)),
          ...steps.map((e) => [e - EDGE, e + EDGE]),
        ),
        scale: (y) => 1 - steps.reduce((acc, e) => acc + 0.14 * smooth(e - EDGE, e + EDGE, y), 0),
        segments: seg(32),
        cap: true,
      });
    }

    // Slim rounded slab with a raked roofline.
    case 'slab':
      return sweep({
        shape: squircle(8, 0.56),
        ys: range(0, 1, seg(18)),
        scale: (y) => 1 - 0.06 * y,
        topY: (x) => 1 - 0.11 * (x + 0.5),
        segments: seg(32),
        cap: true,
      });
  }
}
