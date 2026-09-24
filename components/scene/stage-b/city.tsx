'use client';

// Neon waterfront city. Sculptural glass towers (one instanced mesh per
// archetype) under a shader that does the work a lit, reflective material
// would: sky reflections with fresnel, a fine antialiased window grid that
// resolves to an average glow with distance instead of shimmering, and HDR
// neon strips the bloom pass turns into light. Around them: a lit promenade
// edge, two holo-screens, sky traffic, and aviation beacons on the tallest
// crowns. Fades in with blendAB, out with blendBC.

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import {
  GLSL_NOISE,
  glslColor,
  HEX,
  mulberry32,
  type SharedUniforms,
} from '../journey-config';
import type { QualityTier } from '../quality';
import GlowSprite from '../shared/glow-sprite';
import { BILLBOARDS, cityLayout, promenadeZ, type Tower } from './city-layout';
import { ARCHETYPES, buildArchetype, type Archetype } from './tower-geometry';

// Dusk the glass reflects — matches the stage-B sky ramp in sky-dome.tsx.
const SKY = {
  glow: '#ff5a8a',
  violet: '#8a3fd1',
  indigo: '#241f7a',
  zenith: '#080b24',
  ground: '#0a0c1e',
};

const TOWER_VERTEX = /* glsl */ `
attribute float aSeed;
attribute float aStyle;
attribute vec3 aNeon;
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vSize;
varying vec3 vNeon;
varying float vSeed;
varying float vStyle;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vSeed = aSeed;
  vStyle = aStyle;
  vNeon = aNeon;
  vec3 s = vec3(
    length(instanceMatrix[0].xyz),
    length(instanceMatrix[1].xyz),
    length(instanceMatrix[2].xyz)
  );
  vSize = s;
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  // inverse-transpose of rotate*scale is rotate*scale^-1 = (rotate*scale) * scale^-2
  vWorldNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * (normal / (s * s)));
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const TOWER_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uReduced;
uniform float uGroupOpacity;
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vSize;
varying vec3 vNeon;
varying float vSeed;
varying float vStyle;
#include <fog_pars_fragment>

${GLSL_NOISE}

const vec3 GLOW   = ${glslColor(SKY.glow)};
const vec3 VIOLET = ${glslColor(SKY.violet)};
const vec3 INDIGO = ${glslColor(SKY.indigo)};
const vec3 ZENITH = ${glslColor(SKY.zenith)};
const vec3 GROUND = ${glslColor(SKY.ground)};
const vec3 GLASS  = ${glslColor('#070a18')};
const vec3 WARM   = vec3(1.0, 0.84, 0.62);
const vec3 COOL   = vec3(0.70, 0.86, 1.0);
const float FLOOR_H = 0.78;
const float PI = 3.14159265;

vec3 skyReflection(float ry) {
  vec3 c = mix(GLOW, VIOLET, smoothstep(0.0, 0.12, ry));
  c = mix(c, INDIGO, smoothstep(0.12, 0.36, ry));
  c = mix(c, ZENITH, smoothstep(0.36, 0.85, ry));
  // below the horizon the glass sees the dark water and the city opposite
  return mix(GROUND + GLOW * 0.08, c, smoothstep(-0.18, 0.02, ry));
}

// Antialiased line at distance d (world units). Below a pixel it widens to
// one pixel and dims to match, so thin strips far away hold steady instead
// of crawling; the halo is the soft light around a real tube.
float neonLine(float d, float halfW) {
  float aa = fwidth(d);
  float hw = max(halfW, aa * 0.75);
  float core = (1.0 - smoothstep(hw - aa, hw + aa, abs(d))) * (halfW / hw);
  return core + exp(-abs(d) / (halfW * 3.5)) * 0.1;
}

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  vec3 R = reflect(-V, N);
  float roof = step(0.7, N.y);

  // --- glass -------------------------------------------------------------
  // the seed arrives as an interpolated varying; left unrounded, its last-bit
  // wobble is amplified by the hash into per-pixel static inside every window
  float seed = floor(vSeed + 0.5);

  vec3 sky = skyReflection(R.y);
  float fres = 0.06 + 0.94 * pow(1.0 - ndv, 5.0);
  // dark glass facing you, the sky flaring in along the curves
  vec3 glass = GLASS + sky * mix(0.05, 0.85, fres);
  // a long soft highlight from the bright horizon — reads as curved glass
  vec3 L = normalize(vec3(0.25, 0.28, 1.0));
  glass += mix(GLOW, vec3(1.0), 0.35) * pow(max(dot(N, normalize(L + V)), 0.0), 36.0) * 0.4;

  // --- facade grid ---------------------------------------------------------
  float perim = PI * max(vSize.x, vSize.z);
  float cols = max(6.0, floor(perim / 0.62));
  vec2 g = vec2(vUv.x * cols, vWorldPos.y / FLOOR_H);
  vec2 cell = floor(g);
  vec2 f = fract(g);
  vec2 w = fwidth(g);
  // once a floor is under a pixel the grid can only alias — fade it out and
  // let the facade carry its average brightness instead
  float detail = 1.0 - smoothstep(0.3, 0.75, max(w.x, w.y));
  float px = clamp(smoothstep(0.08 - w.x, 0.08 + w.x, f.x) - smoothstep(0.92 - w.x, 0.92 + w.x, f.x), 0.0, 1.0);
  float py = clamp(smoothstep(0.16 - w.y, 0.16 + w.y, f.y) - smoothstep(0.88 - w.y, 0.88 + w.y, f.y), 0.0, 1.0);
  float pane = px * py;

  vec3 frame = GLASS * 0.7 + sky * 0.07;
  vec3 facade = mix(frame, glass, mix(0.9, pane, detail));
  // contact shadow toward the podium
  facade *= mix(0.5, 1.0, smoothstep(0.0, 7.0, vWorldPos.y));

  // each tower keeps its own hours: from nearly dark to about a third lit
  float litCut = 0.68 + 0.3 * hash21(vec2(seed, 7.3));
  float rnd = hash21(cell + vec2(seed * 0.137, seed * 0.071));
  float occupied = step(0.22, hash21(vec2(cell.y * 0.91, seed)));
  float lit = step(litCut, rnd) * occupied;
  float tone = hash21(cell.yx + seed);
  vec3 wc = mix(WARM, COOL, step(0.62, tone));
  wc = mix(wc, vNeon, step(0.9, tone) * 0.6);
  float level = 0.3 + 0.5 * hash21(cell * 1.7 + seed);
  vec3 windowsNear = wc * lit * pane * level;
  // the same light, averaged: lit share x occupied floors x pane area x level
  vec3 windowsFar = mix(WARM, COOL, 0.35) * (1.0 - litCut) * 0.78 * 0.6 * 0.55;
  vec3 windows = mix(windowsFar, windowsNear, detail) * (1.0 - roof);

  // --- neon ---------------------------------------------------------------
  float corners = neonLine((fract(vUv.x * 4.0) - 0.5) * perim * 0.25, 0.07);
  float blade = neonLine((fract(vUv.x + 0.25) - 0.5) * perim, 0.1);
  float rings = neonLine((fract(g.y / 5.0) - 0.5) * 5.0 * FLOOR_H, 0.06);
  float strips =
      corners * step(vStyle, 0.5)
    + blade * step(0.5, vStyle) * step(vStyle, 1.5)
    + rings * step(1.5, vStyle) * step(vStyle, 2.5);
  strips *= 1.0 - roof;
  float crown = neonLine(vSize.y * (1.0 - vUv.y) - 0.9, 0.14);
  float spill = exp(-vWorldPos.y / 1.2) * 0.55;
  float breathe = 1.0 - 0.12 * (1.0 - uReduced) * (0.5 + 0.5 * sin(uTime * 0.9 + seed));

  vec3 color = facade + windows + vNeon * (strips * 2.3 * breathe + crown * 1.6 + spill);

  // The city leaves by de-rezzing rather than going translucent: a hundred
  // overlapping half-transparent towers cannot be depth-sorted and ghost
  // through one another, while an opaque dissolve stays correct. The
  // dissolve runs through world-space noise so towers break up in patches,
  // and the front of it burns in the tower's neon.
  if (uGroupOpacity < 0.999) {
    float n = vnoise(vWorldPos.xz * 0.45 + vWorldPos.y * 0.21) * 0.6
            + vnoise(vWorldPos.xy * 1.7 + seed) * 0.4;
    float front = uGroupOpacity * 1.1 - 0.05;
    if (n > front) discard;
    color += vNeon * (1.0 - smoothstep(0.0, 0.05, front - n)) * 2.6;
  }

  gl_FragColor = vec4(color, 1.0);
  #include <fog_fragment>
}
`;

const BEACON_VERTEX = /* glsl */ `
attribute float aPhase;
uniform float uDpr;
varying float vPhase;
void main() {
  vPhase = aPhase;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = 3.0 * uDpr * (120.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Aviation red, slow double-blink like a real obstruction light.
const BEACON_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uReduced;
uniform float uGroupOpacity;
varying float vPhase;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  if (length(c) > 0.5) discard;
  float t = fract((uTime * (1.0 - uReduced) + vPhase) * 0.5);
  float blink = 0.25 + 0.75 * (step(t, 0.08) + step(0.16, t) * step(t, 0.24));
  float soft = 1.0 - smoothstep(0.1, 0.5, length(c));
  gl_FragColor = vec4(vec3(1.0, 0.16, 0.2) * 2.0, soft * blink * uGroupOpacity);
}
`;

const PROMENADE_Z_GLSL = /* glsl */ `
float promenadeZ(float x) {
  return -52.0 - 2.2 * sin(x * 0.045) - 0.6 * sin(x * 0.13);
}
`;

const DECK_VERTEX = /* glsl */ `
varying vec3 vWorldPos;
varying vec3 vNormal;
#include <fog_pars_vertex>
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

// Polished stone deck, lit cyan along its lip the way the references light
// every waterfront edge.
const DECK_FRAGMENT = /* glsl */ `
uniform float uGroupOpacity;
varying vec3 vWorldPos;
varying vec3 vNormal;
#include <fog_pars_fragment>
${PROMENADE_Z_GLSL}
const vec3 STONE = ${glslColor('#0d1330')};
const vec3 CYAN  = ${glslColor(HEX.sunsetGold)};
const vec3 PINK  = ${glslColor(HEX.sunsetPink)};
void main() {
  vec3 V = normalize(cameraPosition - vWorldPos);
  float fres = pow(1.0 - clamp(dot(normalize(vNormal), V), 0.0, 1.0), 4.0);
  float back = promenadeZ(vWorldPos.x) - vWorldPos.z; // metres behind the lip
  vec3 color = STONE + mix(PINK, CYAN, 0.6) * fres * 0.06;
  color += CYAN * exp(-max(back, 0.0) / 1.1) * 0.3;
  gl_FragColor = vec4(color, uGroupOpacity);
  #include <fog_fragment>
}
`;

const TUBE_VERTEX = /* glsl */ `
#include <fog_pars_vertex>
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const TUBE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uGroupOpacity;
#include <fog_pars_fragment>
void main() {
  gl_FragColor = vec4(uColor, uGroupOpacity);
  #include <fog_fragment>
}
`;

const TRAFFIC_VERTEX = /* glsl */ `
attribute vec4 aLane; // y, z, speed (signed), phase
attribute vec3 aColor;
uniform float uTime;
uniform float uSpan;
varying vec2 vUv;
varying vec3 vColor;
varying float vFade;
#include <fog_pars_vertex>
void main() {
  float dir = sign(aLane.z);
  float x = mod(aLane.w + aLane.z * uTime, uSpan) - uSpan * 0.5;
  // uv.x = 1 is always the leading end, so the head leads either way
  vec3 world = vec3(x + position.x * 4.2 * dir, aLane.x + position.y * 0.16, aLane.y);
  vUv = uv;
  vColor = aColor;
  vFade = 1.0 - smoothstep(uSpan * 0.38, uSpan * 0.5, abs(x));
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

// Additive, so it fades to nothing in fog rather than to the fog color.
const TRAFFIC_FRAGMENT = /* glsl */ `
uniform float uGroupOpacity;
varying vec2 vUv;
varying vec3 vColor;
varying float vFade;
#include <fog_pars_fragment>
void main() {
  float across = exp(-pow((vUv.y - 0.5) / 0.22, 2.0));
  float trail = pow(vUv.x, 2.5);
  float head = exp(-(1.0 - vUv.x) * 18.0);
  vec3 color = vColor * trail * 1.6 + vec3(1.0) * head * 2.2;
  float a = (trail * 0.8 + head) * across * vFade * uGroupOpacity;
  #ifdef USE_FOG
    a *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
  #endif
  gl_FragColor = vec4(color, a);
}
`;

const opacityOf = (s: SharedUniforms) => s.uBlendAB.value * (1 - s.uBlendBC.value);

// ---------------------------------------------------------------------------

function TowerSet({
  kind,
  towers,
  material,
  detail,
}: {
  kind: Archetype;
  towers: Tower[];
  material: THREE.ShaderMaterial;
  detail: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  const geometry = useMemo(() => {
    const g = buildArchetype(kind, detail);
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(Float32Array.from(towers, (t) => t.seed), 1));
    g.setAttribute('aStyle', new THREE.InstancedBufferAttribute(Float32Array.from(towers, (t) => t.style), 1));
    const neon = new Float32Array(towers.length * 3);
    towers.forEach((t, i) => t.neon.toArray(neon, i * 3));
    g.setAttribute('aNeon', new THREE.InstancedBufferAttribute(neon, 3));
    return g;
  }, [kind, towers, detail]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    towers.forEach((t, i) => {
      dummy.position.set(t.x, 0, t.z);
      dummy.rotation.set(0, t.rotation, 0);
      dummy.scale.set(t.width, t.height, t.depth);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [towers]);

  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  if (towers.length === 0) return null;
  return <instancedMesh ref={ref} args={[geometry, material, towers.length]} frustumCulled={false} />;
}

function Promenade({ opacity }: { opacity: THREE.IUniform<number> }) {
  const { deck, lip, waterline, deckMaterial, lipMaterial, waterlineMaterial } = useMemo(() => {
    // top view: x across, distance-behind-the-lip down the page
    const shape = new THREE.Shape();
    shape.moveTo(-160, -promenadeZ(-160));
    for (let x = -158; x <= 160; x += 2) shape.lineTo(x, -promenadeZ(x));
    shape.lineTo(160, 150);
    shape.lineTo(-160, 150);
    shape.closePath();
    const deck = new THREE.ExtrudeGeometry(shape, { depth: 0.55, bevelEnabled: false });
    deck.rotateX(-Math.PI / 2);

    const edge = (y: number, forward: number) =>
      new THREE.CatmullRomCurve3(
        Array.from({ length: 81 }, (_, i) => {
          const x = -160 + i * 4;
          return new THREE.Vector3(x, y, promenadeZ(x) + forward);
        }),
      );
    const lip = new THREE.TubeGeometry(edge(0.58, 0.05), 400, 0.07, 6, false);
    const waterline = new THREE.TubeGeometry(edge(0.08, 0.3), 400, 0.05, 6, false);

    const fog = () => THREE.UniformsUtils.clone(THREE.UniformsLib.fog);
    const tube = (hex: string, gain: number) =>
      new THREE.ShaderMaterial({
        transparent: true,
        fog: true,
        uniforms: {
          ...fog(),
          uColor: { value: new THREE.Color(hex).multiplyScalar(gain) },
          uGroupOpacity: opacity,
        },
        vertexShader: TUBE_VERTEX,
        fragmentShader: TUBE_FRAGMENT,
      });

    return {
      deck,
      lip,
      waterline,
      deckMaterial: new THREE.ShaderMaterial({
        transparent: true,
        fog: true,
        uniforms: { ...fog(), uGroupOpacity: opacity },
        vertexShader: DECK_VERTEX,
        fragmentShader: DECK_FRAGMENT,
      }),
      lipMaterial: tube(HEX.sunsetGold, 2.6),
      waterlineMaterial: tube(HEX.sunsetPink, 2.2),
    };
  }, [opacity]);

  return (
    <group>
      <mesh geometry={deck} material={deckMaterial} />
      <mesh geometry={lip} material={lipMaterial} />
      <mesh geometry={waterline} material={waterlineMaterial} />
    </group>
  );
}

/** A promenade holo-screen: gradient panel with a brand mark, on a pylon. */
function Billboard({
  spec,
  shared,
}: {
  spec: (typeof BILLBOARDS)[number];
  shared: SharedUniforms;
}) {
  const { screen, pylon } = useMemo(() => {
    const canvas = document.createElement('canvas');
    const aspect = spec.width / spec.height;
    canvas.width = 1024;
    canvas.height = Math.round(1024 / aspect);
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;

    if (ctx) {
      const { width: W, height: H } = canvas;
      const grad = ctx.createLinearGradient(0, 0, W, H);
      spec.gradient.forEach((c, i) => grad.addColorStop(i / (spec.gradient.length - 1), c));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      // a soft sheen across the panel
      const sheen = ctx.createLinearGradient(0, 0, 0, H);
      sheen.addColorStop(0, 'rgba(255,255,255,0.18)');
      sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, W - 6, H - 6);

      const image = new Image();
      image.onload = () => {
        const scale = Math.min((W * 0.86) / image.width, (H * 0.86) / image.height);
        const w = image.width * scale;
        const h = image.height * scale;
        ctx.drawImage(image, (W - w) / 2, (H - h) / 2, w, h);
        texture.needsUpdate = true;
      };
      image.src = spec.image;
    }

    const screen = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      toneMapped: false,
      fog: true,
      // pushed past 1 so the composer's HDR bloom lets the panel glow
      color: new THREE.Color(1.55, 1.55, 1.55),
    });
    const pylon = new THREE.MeshBasicMaterial({ color: '#05070f', transparent: true, fog: true });
    return { screen, pylon };
  }, [spec]);

  useFrame(() => {
    const o = opacityOf(shared);
    screen.opacity = o;
    pylon.opacity = o;
  });

  const z = promenadeZ(spec.x) - 1.3;
  const bottom = spec.y - spec.height / 2;
  return (
    <group position={[spec.x, 0, z]} rotation={[0, spec.rotation, 0]}>
      <mesh position={[0, spec.y, 0]} material={screen}>
        <planeGeometry args={[spec.width, spec.height]} />
      </mesh>
      <mesh position={[0, 0.55 + (bottom - 0.55) / 2, -0.06]} material={pylon}>
        <boxGeometry args={[0.36, bottom - 0.55, 0.36]} />
      </mesh>
    </group>
  );
}

function SkyTraffic({
  count,
  shared,
  opacity,
}: {
  count: number;
  shared: SharedUniforms;
  opacity: THREE.IUniform<number>;
}) {
  const { geometry, material } = useMemo(() => {
    const rand = mulberry32(0x7a_ff1c);
    const lanes = new Float32Array(count * 4);
    const colors = new Float32Array(count * 3);
    const palette = [HEX.sunsetGold, HEX.sunsetPink, '#fff1dc', '#8b5cf6'].map((h) => new THREE.Color(h));
    const LANE_Z = [-49, -66, -88];
    for (let i = 0; i < count; i++) {
      const dir = rand() < 0.5 ? -1 : 1;
      lanes.set([10 + rand() * 24, LANE_Z[i % LANE_Z.length] + (rand() - 0.5) * 3, dir * (6 + rand() * 9), rand() * 300], i * 4);
      palette[Math.floor(rand() * palette.length)].toArray(colors, i * 3);
    }
    const plane = new THREE.PlaneGeometry(1, 1);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = plane.index;
    geometry.setAttribute('position', plane.getAttribute('position'));
    geometry.setAttribute('uv', plane.getAttribute('uv'));
    geometry.instanceCount = count;
    geometry.setAttribute('aLane', new THREE.InstancedBufferAttribute(lanes, 4));
    geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: true,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        uTime: shared.uTime,
        uSpan: { value: 300 },
        uGroupOpacity: opacity,
      },
      vertexShader: TRAFFIC_VERTEX,
      fragmentShader: TRAFFIC_FRAGMENT,
    });
    return { geometry, material };
  }, [count, shared, opacity]);

  if (count === 0) return null;
  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}

// ---------------------------------------------------------------------------

export default function City({
  shared,
  tier,
}: {
  shared: SharedUniforms;
  tier: QualityTier;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const opacity = useMemo<THREE.IUniform<number>>(() => ({ value: 0 }), []);

  const towers = useMemo(() => cityLayout(tier), [tier]);
  const byKind = useMemo(
    () => new Map(ARCHETYPES.map((k) => [k, towers.filter((t) => t.kind === k)])),
    [towers],
  );

  const towerMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        fog: true,
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          uTime: shared.uTime,
          uReduced: shared.uReduced,
          uGroupOpacity: opacity,
        },
        vertexShader: TOWER_VERTEX,
        fragmentShader: TOWER_FRAGMENT,
      }),
    [shared, opacity],
  );

  const beacons = useMemo(() => {
    if (tier !== 'high') return null;
    const tallest = [...towers].sort((a, b) => b.height - a.height).slice(0, 24);
    const positions = new Float32Array(tallest.length * 3);
    const phases = new Float32Array(tallest.length);
    tallest.forEach((t, i) => {
      positions.set([t.x, t.height + 0.35, t.z], i * 3);
      phases[i] = (t.seed % 97) / 97;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: shared.uTime,
        uReduced: shared.uReduced,
        uDpr: shared.uDpr,
        uGroupOpacity: opacity,
      },
      vertexShader: BEACON_VERTEX,
      fragmentShader: BEACON_FRAGMENT,
    });
    return { geometry, material };
  }, [tier, towers, shared, opacity]);

  useFrame(() => {
    const o = opacityOf(shared);
    opacity.value = o;
    if (groupRef.current) groupRef.current.visible = o > 0.002;
  });

  const hazeOpacity = () => opacityOf(shared);

  return (
    <group ref={groupRef}>
      {ARCHETYPES.map((kind) => (
        <TowerSet
          key={kind}
          kind={kind}
          towers={byKind.get(kind) ?? []}
          material={towerMaterial}
          detail={tier === 'high' ? 1 : 0.6}
        />
      ))}
      {beacons && <points geometry={beacons.geometry} material={beacons.material} />}
      <Promenade opacity={opacity} />
      {BILLBOARDS.map((spec) => (
        <Billboard key={spec.image} spec={spec} shared={shared} />
      ))}
      <SkyTraffic count={tier === 'high' ? 30 : 10} shared={shared} opacity={opacity} />
      {/* light pollution rising off the city into the dusk */}
      <GlowSprite position={[-30, 10, -135]} scale={90} color={HEX.sunsetPink} intensity={0.12} getOpacity={hazeOpacity} />
      <GlowSprite position={[10, 16, -140]} scale={120} color="#8b5cf6" intensity={0.1} getOpacity={hazeOpacity} />
      <GlowSprite position={[48, 8, -132]} scale={80} color={HEX.sunsetGold} intensity={0.07} getOpacity={hazeOpacity} />
    </group>
  );
}
