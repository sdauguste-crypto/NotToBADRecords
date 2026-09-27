'use client';

// Boats on the harbour: a superyacht cruising slowly across and jet skis
// weaving past at speed, each dragging a foam wake. Everything is built
// procedurally and shaded by one paint shader that lights it from the sun at
// dusk and from the sky and skyline at night, so it sits in both worlds the
// water crosses. Leaves with the water when the journey climbs to space.

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { GLSL_NOISE, glslColor, HEX, type SharedUniforms } from '../journey-config';
import type { QualityTier } from '../quality';

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** Flat plan (x along the length, y across) extruded upward to height h. */
function extrudePlan(shape: THREE.Shape, h: number, steps = 1) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, steps, curveSegments: 10 });
  g.rotateX(-Math.PI / 2); // extrusion now runs up +y; plan y becomes -z
  return g;
}

type HullSpec = {
  length: number;
  beam: number;
  height: number;
  /** How far below the waterline the deepest point sits. */
  draft: number;
  /** 0 = slab sides, 1 = the bottom pinches to a knife keel. */
  deadrise: number;
  /** How far the deck line climbs toward the bow. */
  sheer: number;
};

/**
 * A planing hull, bow toward +x: a pointed plan extruded upward, then
 * pinched toward the keel, its forefoot swept up and its sheer raised toward
 * the bow.
 */
function hullGeometry({ length: L, beam: B, height: H, draft, deadrise, sheer }: HullSpec) {
  const N = 28;
  const half = (s: number) => {
    const taper = s < 0.5 ? 1 : Math.cos(((s - 0.5) / 0.5) * (Math.PI / 2)) ** 0.75;
    return (B / 2) * taper;
  };
  const shape = new THREE.Shape();
  shape.moveTo(-L / 2, half(0) * 0.94);
  for (let i = 1; i <= N; i++) shape.lineTo(-L / 2 + (i / N) * L, half(i / N));
  for (let i = N - 1; i >= 0; i--) shape.lineTo(-L / 2 + (i / N) * L, -half(i / N) * (i === 0 ? 0.94 : 1));
  shape.closePath();

  const g = extrudePlan(shape, H, 4);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    // extrusion leaves points a rounding error outside 0..1, and a negative
    // base under the fractional powers below is NaN — clamp both
    const t = Math.min(1, Math.max(0, p.getY(i) / H)); // 0 keel .. 1 deck
    const s = Math.min(1, Math.max(0, (x + L / 2) / L)); // 0 stern .. 1 bow
    p.setZ(i, p.getZ(i) * (1 - deadrise * (1 - t) ** 1.5));
    const y = p.getY(i) + sheer * s ** 2.5 * t + (1 - t) * 0.55 * H * s ** 3;
    p.setY(i, y - draft);
  }
  return toCreasedNormals(g, 0.6);
}

/** Lean a part aft with height — the raked profile of a modern yacht. */
function rake(g: THREE.BufferGeometry, k: number, baseY: number) {
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) - (p.getY(i) + baseY) * k);
  g.computeVertexNormals();
  return g;
}

/** Superstructure deck plan: square-cornered aft, a streamlined round nose. */
function deckPlan(length: number, width: number, nose: number) {
  const r = width * 0.14;
  const w = width / 2;
  const s = new THREE.Shape();
  s.moveTo(-length / 2 + r, -w);
  s.lineTo(length / 2 - nose, -w);
  s.absellipse(length / 2 - nose, 0, nose, w, -Math.PI / 2, Math.PI / 2, false, 0);
  s.lineTo(-length / 2 + r, w);
  s.quadraticCurveTo(-length / 2, w, -length / 2, w - r);
  s.lineTo(-length / 2, -w + r);
  s.quadraticCurveTo(-length / 2, -w, -length / 2 + r, -w);
  return s;
}

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const PAINT_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
#include <fog_pars_vertex>
void main() {
  vLocal = position;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

// Lit by the sun behind the harbour at dusk (so craft read as silhouettes
// with a warm rim) and by the sky and the neon skyline at night.
const PAINT_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uEmissive;
uniform float uGloss;
uniform float uWindows;
uniform float uBoot;
uniform vec3 uLed;
uniform float uLedY;
uniform float uBlendAB;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
#include <fog_pars_fragment>
${GLSL_NOISE}

vec3 sky(float ry) {
  vec3 horizon = mix(${glslColor('#ff6a7a')}, ${glslColor('#ff5a8a')}, uBlendAB);
  vec3 zenith = mix(${glslColor('#3a3fb8')}, ${glslColor('#241f7a')}, uBlendAB);
  vec3 c = mix(horizon, zenith, smoothstep(0.0, 0.55, ry));
  return mix(${glslColor('#0a1433')}, c, smoothstep(-0.2, 0.02, ry));
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorld);
  float ndv = clamp(dot(N, V), 0.0, 1.0);

  vec3 L = normalize(mix(vec3(0.0, 0.12, -1.0), vec3(-0.35, 0.85, 0.3), uBlendAB));
  vec3 Lc = mix(vec3(1.0, 0.6, 0.42), vec3(0.45, 0.5, 0.95) * 0.7, uBlendAB);
  vec3 ambient = mix(vec3(0.42, 0.3, 0.5), vec3(0.2, 0.18, 0.4), uBlendAB);
  float diffuse = max(dot(N, L), 0.0);

  vec3 color = uColor * (ambient + Lc * diffuse);
  // the neon skyline behind the harbour washes the sterns and sides pink
  color += uColor * vec3(1.0, 0.25, 0.65) * 0.28 * max(dot(N, vec3(0.0, 0.2, -1.0)), 0.0) * uBlendAB;
  // rim of light where the surface turns away — the sunset silhouette
  float fres = pow(1.0 - ndv, 4.0);
  color += Lc * fres * 0.35 * (1.0 - uBlendAB);
  color += sky(reflect(-V, N).y) * mix(0.12, 0.9, fres) * uGloss;

  // panoramic cabin glass, in the craft's own space so it rides with it:
  // long panes with hairline mullions, a few cabins lit warm, and a faint
  // interior glow behind the rest once it is dark
  if (uWindows > 0.5) {
    vec2 g = vec2(vLocal.x / 0.95, vLocal.y / 0.42);
    vec2 cell = floor(g);
    vec2 f = fract(g);
    float pane = step(0.035, f.x) * step(f.x, 0.965) * smoothstep(0.12, 0.2, f.y) * (1.0 - smoothstep(0.8, 0.88, f.y));
    float lit = step(0.6, hash21(cell + 3.7)) * (0.55 + 0.45 * hash21(cell * 1.9 + 1.3));
    vec3 warm = vec3(1.0, 0.76, 0.5);
    color += warm * pane * (lit * mix(0.12, 0.9, uBlendAB) + 0.05 * uBlendAB);
  }

  // painted in the hull's own space so the stripes follow the bow's taper:
  // a dark boot-top at the waterline, and a neon line above it
  if (uBoot > 0.5) {
    color *= mix(0.6, 1.08, smoothstep(0.1, 1.2, vLocal.y));
    float boot = smoothstep(-0.12, -0.1, vLocal.y) * (1.0 - smoothstep(0.17, 0.19, vLocal.y));
    color = mix(color, ${glslColor('#0d1226')} * (0.4 + Lc * diffuse) + sky(reflect(-V, N).y) * fres * 0.8, boot);
  }
  color += uLed * exp(-pow((vLocal.y - uLedY) / 0.018, 2.0)) * mix(0.35, 1.0, uBlendAB);

  gl_FragColor = vec4(color + uEmissive, 1.0);
  #include <fog_fragment>
}
`;

const WAKE_VERTEX = /* glsl */ `
attribute float aAlong;
attribute float aAcross;
varying float vAlong;
varying float vAcross;
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vAlong = aAlong;
  vAcross = aAcross;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

// A Kelvin wake: foam concentrated on the two arms of the V, churned prop
// wash down the middle close behind the craft, all broken up by noise and
// thinning out with distance.
const WAKE_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uStrength;
uniform float uBlendAB;
uniform float uOpacity;
varying float vAlong;
varying float vAcross;
varying vec3 vWorld;
#include <fog_pars_fragment>
${GLSL_NOISE}
void main() {
  float arms = exp(-pow((abs(vAcross) - 0.82) / 0.2, 2.0));
  float wash = exp(-pow(vAcross / 0.38, 2.0)) * (1.0 - smoothstep(0.0, 0.5, vAlong));
  float n = vnoise(vWorld.xz * 2.6 + vec2(uTime * 0.4, -uTime * 0.3));
  float foam = (arms * 0.85 + wash * 1.3) * (0.35 + 0.9 * n);
  foam *= (1.0 - vAlong) * smoothstep(0.0, 0.03, vAlong);
  vec3 color = mix(vec3(1.0, 0.9, 0.86), vec3(0.85, 0.9, 1.0), uBlendAB);
  gl_FragColor = vec4(color, clamp(foam * uStrength, 0.0, 1.0) * uOpacity);
  #include <fog_fragment>
}
`;

const SPRAY_VERTEX = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uDpr;
varying float vLife;
void main() {
  // rooster tail thrown up and back off the jet ski's stern, in its frame
  float life = fract(uTime * 1.6 + aSeed);
  vLife = life;
  float side = fract(aSeed * 91.7) - 0.5;
  float lift = 0.75 + 0.5 * fract(aSeed * 57.3);
  vec3 p = vec3(-0.6 - life * 2.6, (life * 1.7 - life * life * 1.9) * lift, side * life * 1.8);
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = (10.0 + life * 30.0) * uDpr * (12.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const SPRAY_FRAGMENT = /* glsl */ `
uniform float uOpacity;
uniform float uBlendAB;
varying float vLife;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float soft = 1.0 - smoothstep(0.1, 0.5, d);
  vec3 color = mix(vec3(1.0, 0.88, 0.8), vec3(0.9, 0.94, 1.0), uBlendAB);
  gl_FragColor = vec4(color, soft * (1.0 - vLife) * 0.32 * uOpacity);
}
`;

const GLOW_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float glow = exp(-dot(p, p) * 2.6);
  gl_FragColor = vec4(uColor, glow * uOpacity);
}
`;

const GLOW_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// ---------------------------------------------------------------------------

type Paint = {
  color: string;
  emissive?: [string, number];
  gloss?: number;
  windows?: boolean;
  boot?: boolean;
  /** Neon line painted along the hull at local height y. */
  led?: [string, number];
};

function usePaints(shared: SharedUniforms) {
  return useMemo(() => {
    const make = ({ color, emissive, gloss = 0.5, windows = false, boot = false, led }: Paint) =>
      new THREE.ShaderMaterial({
        fog: true,
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          uColor: { value: new THREE.Color(color) },
          uEmissive: {
            value: emissive ? new THREE.Color(emissive[0]).multiplyScalar(emissive[1]) : new THREE.Color(0, 0, 0),
          },
          uGloss: { value: gloss },
          uWindows: { value: windows ? 1 : 0 },
          uBoot: { value: boot ? 1 : 0 },
          uLed: { value: led ? new THREE.Color(led[0]).multiplyScalar(2.4) : new THREE.Color(0, 0, 0) },
          uLedY: { value: led ? led[1] : 0 },
          uBlendAB: shared.uBlendAB,
        },
        vertexShader: PAINT_VERTEX,
        fragmentShader: PAINT_FRAGMENT,
      });
    return {
      hull: make({ color: '#e8ecf2', gloss: 0.55 }),
      yachtHull: make({ color: '#e8ecf2', gloss: 0.55, boot: true, led: [HEX.sunsetPink, 0.27] }),
      skiPink: make({ color: '#eef1f6', gloss: 0.6, led: [HEX.sunsetPink, 0.16] }),
      skiCyan: make({ color: '#eef1f6', gloss: 0.6, led: [HEX.sunsetGold, 0.16] }),
      glass: make({ color: '#0a0f1f', gloss: 1.0, windows: true }),
      deck: make({ color: '#d9dde6', gloss: 0.3 }),
      dark: make({ color: '#12141c', gloss: 0.25 }),
      pink: make({ color: '#ffffff', emissive: [HEX.sunsetPink, 2.4], gloss: 0 }),
      cyan: make({ color: '#ffffff', emissive: [HEX.sunsetGold, 2.4], gloss: 0 }),
      navRed: make({ color: '#000000', emissive: ['#ff2a2a', 3], gloss: 0 }),
      navGreen: make({ color: '#000000', emissive: ['#2aff7a', 3], gloss: 0 }),
      navWhite: make({ color: '#000000', emissive: ['#ffffff', 3], gloss: 0 }),
    };
  }, [shared]);
}

type Paints = ReturnType<typeof usePaints>;

// ---------------------------------------------------------------------------
// Craft
// ---------------------------------------------------------------------------

const YACHT_LENGTH = 12;
const YACHT_BEAM = 2.6;
/** Aft lean of the decks per unit of height. */
const RAKE = 0.55;

function YachtModel({ paints, uOpacity }: { paints: Paints; uOpacity: THREE.IUniform<number> }) {
  const parts = useMemo(() => {
    const hull = hullGeometry({ length: YACHT_LENGTH, beam: YACHT_BEAM, height: 1.5, draft: 0.45, deadrise: 0.55, sheer: 0.55 });
    // three decks stepping back, each a white base, a band of tinted glass,
    // and an overhanging roof plate
    const tiers = [
      // each tier is 0.82 tall and sits on the roof of the one below
      { len: 7.4, width: 2.2, x: -0.9, base: 1.05, nose: 2.2 },
      { len: 5.4, width: 1.9, x: -1.5, base: 1.87, nose: 1.8 },
      { len: 3.2, width: 1.5, x: -2.0, base: 2.69, nose: 1.2 },
    ].map((t) => ({
      ...t,
      body: rake(extrudePlan(deckPlan(t.len, t.width, t.nose), 0.32), RAKE, 0),
      glass: rake(extrudePlan(deckPlan(t.len * 0.97, t.width * 0.97, t.nose * 0.97), 0.42), RAKE, 0.32),
      roof: rake(extrudePlan(deckPlan(t.len * 1.05, t.width * 1.05, t.nose * 1.02), 0.08), RAKE, 0.74),
    }));
    const glow = new THREE.PlaneGeometry(YACHT_LENGTH * 1.5, YACHT_BEAM * 3).rotateX(-Math.PI / 2);
    const glowMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(HEX.sunsetGold).multiplyScalar(1.6) }, uOpacity },
      vertexShader: GLOW_VERTEX,
      fragmentShader: GLOW_FRAGMENT,
    });
    return { hull, tiers, glow, glowMaterial };
  }, [uOpacity]);

  return (
    <group>
      <mesh geometry={parts.hull} material={paints.yachtHull} />
      {parts.tiers.map((t, i) => (
        <group key={i} position={[t.x, t.base, 0]}>
          <mesh geometry={t.body} material={paints.hull} />
          <mesh geometry={t.glass} material={paints.glass} position={[0, 0.32, 0]} />
          <mesh geometry={t.roof} material={paints.hull} position={[0, 0.74, 0]} />
        </group>
      ))}
      {/* radar arch and mast */}
      <mesh position={[-2.2, 3.68, 0]} material={paints.hull}>
        <boxGeometry args={[0.5, 0.35, 1.3]} />
      </mesh>
      <mesh position={[-2.2, 4.25, 0]} material={paints.dark}>
        <cylinderGeometry args={[0.04, 0.05, 0.8, 8]} />
      </mesh>
      {/* running lights: red to port, green to starboard, white masthead */}
      <mesh position={[1.6, 1.3, -1.1]} material={paints.navRed}>
        <sphereGeometry args={[0.07, 8, 6]} />
      </mesh>
      <mesh position={[1.6, 1.3, 1.1]} material={paints.navGreen}>
        <sphereGeometry args={[0.07, 8, 6]} />
      </mesh>
      <mesh position={[-2.2, 4.7, 0]} material={paints.navWhite}>
        <sphereGeometry args={[0.07, 8, 6]} />
      </mesh>
      {/* underwater lights pooling cyan in the water around the hull */}
      <mesh geometry={parts.glow} material={parts.glowMaterial} position={[0, 0.03, 0]} renderOrder={3} />
    </group>
  );
}

function JetSkiModel({
  paints,
  hull: hullPaint,
  livery,
}: {
  paints: Paints;
  hull: THREE.ShaderMaterial;
  livery: THREE.ShaderMaterial;
}) {
  const hull = useMemo(
    () => hullGeometry({ length: 1.35, beam: 0.52, height: 0.36, draft: 0.1, deadrise: 0.6, sheer: 0.12 }),
    [],
  );
  return (
    <group>
      <mesh geometry={hull} material={hullPaint} />
      {/* seat and handlebars */}
      <mesh position={[-0.2, 0.33, 0]} rotation={[0, 0, Math.PI / 2]} material={paints.dark}>
        <capsuleGeometry args={[0.1, 0.45, 4, 8]} />
      </mesh>
      <mesh position={[0.28, 0.46, 0]} material={paints.dark}>
        <boxGeometry args={[0.05, 0.05, 0.42]} />
      </mesh>
      {/* rider, leaning into the bars */}
      <group position={[-0.12, 0.44, 0]} rotation={[0, 0, -0.55]}>
        <mesh position={[0, 0.2, 0]} material={paints.dark}>
          <capsuleGeometry args={[0.11, 0.24, 4, 8]} />
        </mesh>
        <mesh position={[0, 0.2, 0]} material={livery}>
          <capsuleGeometry args={[0.125, 0.12, 4, 8]} />
        </mesh>
        <mesh position={[0, 0.47, 0]} material={paints.dark}>
          <sphereGeometry args={[0.09, 10, 8]} />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Wakes
// ---------------------------------------------------------------------------

const WAKE_POINTS = 48;

/** A foam ribbon laid along the path a craft has actually travelled. */
class Wake {
  readonly geometry = new THREE.BufferGeometry();
  private readonly trail: THREE.Vector3[] = [];
  private readonly positions = new Float32Array(WAKE_POINTS * 2 * 3);

  constructor(
    private readonly spacing: number,
    private readonly startHalfWidth: number,
    /** Half-angle of the V, as a tangent (a Kelvin wake is about 0.35). */
    private readonly spread: number,
  ) {
    const along = new Float32Array(WAKE_POINTS * 2);
    const across = new Float32Array(WAKE_POINTS * 2);
    const index: number[] = [];
    for (let i = 0; i < WAKE_POINTS; i++) {
      along[i * 2] = along[i * 2 + 1] = i / (WAKE_POINTS - 1);
      across[i * 2] = -1;
      across[i * 2 + 1] = 1;
      if (i < WAKE_POINTS - 1) {
        const a = i * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
    this.geometry.setAttribute('aAcross', new THREE.BufferAttribute(across, 1));
    this.geometry.setIndex(index);
    this.geometry.drawRange.count = 0;
  }

  update(at: THREE.Vector3) {
    const head = this.trail[0];
    // a craft that wrapped around the scene starts a fresh wake
    if (head && head.distanceToSquared(at) > 100) this.trail.length = 0;
    if (!this.trail[0] || this.trail[0].distanceTo(at) >= this.spacing) {
      this.trail.unshift(new THREE.Vector3(at.x, 0.035, at.z));
      if (this.trail.length > WAKE_POINTS) this.trail.pop();
    } else {
      this.trail[0].set(at.x, 0.035, at.z);
    }

    const n = this.trail.length;
    const dir = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const a = this.trail[Math.max(0, i - 1)];
      const b = this.trail[Math.min(n - 1, i + 1)];
      dir.subVectors(a, b);
      if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
      dir.normalize();
      const half = this.startHalfWidth + i * this.spacing * this.spread;
      const p = this.trail[i];
      // perpendicular on the water: (dz, -dx)
      this.positions.set([p.x + dir.z * half, p.y, p.z - dir.x * half], i * 6);
      this.positions.set([p.x - dir.z * half, p.y, p.z + dir.x * half], i * 6 + 3);
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.drawRange.count = Math.max(0, n - 1) * 6;
    this.geometry.computeBoundingSphere();
  }
}

function useWakeMaterial(shared: SharedUniforms, strength: number, uOpacity: THREE.IUniform<number>) {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: true,
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          uTime: shared.uTime,
          uStrength: { value: strength },
          uBlendAB: shared.uBlendAB,
          uOpacity,
        },
        vertexShader: WAKE_VERTEX,
        fragmentShader: WAKE_FRAGMENT,
      }),
    [shared, strength, uOpacity],
  );
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** x wraps across the harbour, well outside every camera's view. */
const SPAN = 190;
const wrapX = (t: number, speed: number, offset: number, dir: 1 | -1) => {
  const u = (((t * speed + offset) % SPAN) + SPAN) % SPAN;
  return dir === 1 ? -SPAN / 2 + u : SPAN / 2 - u;
};

type SkiRoute = { z: number; speed: number; dir: 1 | -1; offset: number; weave: number; k: number; phase: number; livery: 'pink' | 'cyan' };

// Offsets put the skis already in frame on page load (a pair riding
// together from the left, a single crossing back from the right).
const SKI_ROUTES: SkiRoute[] = [
  { z: -34, speed: 12, dir: 1, offset: 65, weave: 2.6, k: 0.09, phase: 0, livery: 'pink' },
  { z: -35.5, speed: 12, dir: 1, offset: 56, weave: 2.6, k: 0.09, phase: 0.6, livery: 'cyan' },
  { z: -39, speed: 14, dir: -1, offset: 75, weave: 2.0, k: 0.12, phase: 2.1, livery: 'cyan' },
];

function JetSki({
  route,
  shared,
  paints,
  uOpacity,
}: {
  route: SkiRoute;
  shared: SharedUniforms;
  paints: Paints;
  uOpacity: THREE.IUniform<number>;
}) {
  const ref = useRef<THREE.Group>(null);
  const wake = useMemo(() => new Wake(0.45, 0.25, 0.32), []);
  const wakeMaterial = useWakeMaterial(shared, 1.1, uOpacity);
  const spray = useMemo(() => {
    const COUNT = 72;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    // golden-ratio seeds spread the particles evenly through their lifetimes
    g.setAttribute('aSeed', new THREE.BufferAttribute(Float32Array.from({ length: COUNT }, (_, i) => (i * 0.618034) % 1), 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: shared.uTime, uDpr: shared.uDpr, uOpacity, uBlendAB: shared.uBlendAB },
      vertexShader: SPRAY_VERTEX,
      fragmentShader: SPRAY_FRAGMENT,
    });
    return { g, m };
  }, [shared, uOpacity]);
  const work = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const t = shared.uTime.value;
    const group = ref.current;
    if (!group) return;
    const x = wrapX(t, route.speed, route.offset, route.dir);
    const z = route.z + route.weave * Math.sin(x * route.k + route.phase);
    const slope = route.weave * route.k * Math.cos(x * route.k + route.phase); // dz/dx
    group.position.set(x, 0.05 + Math.abs(Math.sin(t * 5.3 + route.phase)) * 0.07, z);
    // heading along the path; bank into the turn, nose bouncing on the chop
    group.rotation.set(
      -slope * 0.6 * route.dir,
      -Math.atan2(slope * route.dir, route.dir),
      0.08 + Math.sin(t * 7.1 + route.phase) * 0.05,
      'YXZ',
    );
    wake.update(work.set(x, 0, z));
  });

  return (
    <>
      <group ref={ref}>
        <JetSkiModel
          paints={paints}
          hull={route.livery === 'pink' ? paints.skiPink : paints.skiCyan}
          livery={paints[route.livery]}
        />
        <points geometry={spray.g} material={spray.m} frustumCulled={false} />
      </group>
      <mesh geometry={wake.geometry} material={wakeMaterial} frustumCulled={false} renderOrder={2} />
    </>
  );
}

function Yacht({
  shared,
  paints,
  uOpacity,
  glow,
}: {
  shared: SharedUniforms;
  paints: Paints;
  uOpacity: THREE.IUniform<number>;
  /** Underwater lights: faint at dusk, full at night. */
  glow: THREE.IUniform<number>;
}) {
  const ref = useRef<THREE.Group>(null);
  const wake = useMemo(() => new Wake(1.1, 1.4, 0.3), []);
  const wakeMaterial = useWakeMaterial(shared, 0.9, uOpacity);
  const work = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const t = shared.uTime.value;
    const group = ref.current;
    if (!group) return;
    // slow enough to read as heavy; starts mid-harbour so it is in frame
    const x = wrapX(t, 1.9, 70, 1);
    group.position.set(x, Math.sin(t * 0.55) * 0.06, -46);
    group.rotation.set(Math.sin(t * 0.43) * 0.012, 0, Math.sin(t * 0.37) * 0.01);
    wake.update(work.set(x - YACHT_LENGTH * 0.35, 0, -46));
  });

  return (
    <>
      <group ref={ref}>
        <YachtModel paints={paints} uOpacity={glow} />
      </group>
      <mesh geometry={wake.geometry} material={wakeMaterial} frustumCulled={false} renderOrder={2} />
    </>
  );
}

// ---------------------------------------------------------------------------

export default function Watercraft({ shared, tier }: { shared: SharedUniforms; tier: QualityTier }) {
  const groupRef = useRef<THREE.Group>(null);
  const paints = usePaints(shared);
  // wakes, spray and the yacht's underwater lights share one fade
  const uOpacity = useMemo<THREE.IUniform<number>>(() => ({ value: 1 }), []);
  const nightGlow = useMemo<THREE.IUniform<number>>(() => ({ value: 0 }), []);

  useLayoutEffect(
    () => () => Object.values(paints).forEach((m) => m.dispose()),
    [paints],
  );

  useFrame(() => {
    // the water fades out as the journey climbs into space; so do its boats
    const water = 1 - shared.uBlendBC.value;
    uOpacity.value = water;
    nightGlow.value = water * (0.25 + 0.75 * shared.uBlendAB.value);
    if (groupRef.current) groupRef.current.visible = water > 0.45;
  });

  const routes = tier === 'high' ? SKI_ROUTES : SKI_ROUTES.slice(0, 2);
  return (
    <group ref={groupRef}>
      <Yacht shared={shared} paints={paints} uOpacity={uOpacity} glow={nightGlow} />
      {routes.map((route, i) => (
        <JetSki key={i} route={route} shared={shared} paints={paints} uOpacity={uOpacity} />
      ))}
    </group>
  );
}
