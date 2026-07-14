'use client';

// Neon city skyline: one InstancedMesh of boxes with a window-cell shader,
// pink haze glows behind the skyline, and (high tier) blinking antenna
// lights on the tallest rooftops. Fades in with blendAB, out with blendBC.

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import {
  GLSL_NOISE,
  glslColor,
  HEX,
  mulberry32,
  type SharedUniforms,
  TIERS,
} from '../journey-config';
import type { QualityTier } from '../quality';
import GlowSprite from '../shared/glow-sprite';

const BUILDING_VERTEX = /* glsl */ `
attribute float aSeed;
varying vec2 vUv;
varying vec3 vObjNormal;
varying float vSeed;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vObjNormal = normal;
  vSeed = aSeed;
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const BUILDING_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uGroupOpacity;
varying vec2 vUv;
varying vec3 vObjNormal;
varying float vSeed;
#include <fog_pars_fragment>

${GLSL_NOISE}

const vec3 BODY = ${glslColor(HEX.cityBody)};
const vec3 GOLD = ${glslColor(HEX.sunsetGold)};
const vec3 PINK = ${glslColor(HEX.sunsetPink)};

void main() {
  vec2 grid = vUv * vec2(6.0, 24.0);
  vec2 cell = floor(grid);
  vec2 f = fract(grid);

  float litHash = hash21(cell + vSeed);
  float lit = step(0.72, litHash);
  // Side faces only — skip top/bottom faces.
  lit *= step(abs(vObjNormal.y), 0.5);
  // Window pane inside the cell.
  float pane = step(0.22, f.x) * step(f.x, 0.78) * step(0.28, f.y) * step(f.y, 0.82);

  vec3 emit = mix(GOLD, PINK, hash21(cell.yx + vSeed))
            * (0.75 + 0.25 * sin(uTime * 0.7 + litHash * 6.28));

  vec3 color = BODY + emit * lit * pane;
  gl_FragColor = vec4(color, uGroupOpacity);
  #include <fog_fragment>
}
`;

const ANTENNA_VERTEX = /* glsl */ `
attribute float aPhase;
uniform float uDpr;
varying float vPhase;
void main() {
  vPhase = aPhase;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = 2.5 * uDpr * (120.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const ANTENNA_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uReduced;
uniform float uGroupOpacity;
varying float vPhase;
const vec3 PINK = ${glslColor(HEX.sunsetPink)};
void main() {
  vec2 c = gl_PointCoord - 0.5;
  if (length(c) > 0.5) discard;
  float blink = 0.35 + 0.65 * step(0.0, sin(uTime * (1.0 - uReduced) * 2.0 + vPhase));
  float soft = 1.0 - smoothstep(0.15, 0.5, length(c));
  gl_FragColor = vec4(PINK, soft * blink * uGroupOpacity);
}
`;

type CityLayout = {
  matrices: THREE.Matrix4[];
  seeds: Float32Array;
  rooftops: Float32Array;
  antennaPhases: Float32Array;
  antennaCount: number;
};

function buildLayout(count: number, antennaLights: boolean): CityLayout {
  const rand = mulberry32(0x5eed_c17);
  const dummy = new THREE.Object3D();
  const matrices: THREE.Matrix4[] = [];
  const seeds = new Float32Array(count);
  const tops: Array<{ x: number; y: number; z: number }> = [];

  for (let i = 0; i < count; i++) {
    const row = i % 2;
    const z = (row === 0 ? -65 : -80) + (rand() - 0.5) * 4;
    const x = -50 + rand() * 100;
    const inBand = x > -10 && x < 15;
    const height = 4 + rand() * 12 + (inBand ? rand() * 10 : 0); // 4..26
    const width = 2 + rand() * 3;
    const depth = 2 + rand() * 3;

    dummy.position.set(x, height / 2, z);
    dummy.scale.set(width, height, depth);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    matrices.push(dummy.matrix.clone());
    seeds[i] = Math.floor(rand() * 1000);
    tops.push({ x, y: height, z });
  }

  // Antenna lights on the 30 tallest rooftops.
  const antennaCount = antennaLights ? Math.min(30, count) : 0;
  const tallest = [...tops].sort((a, b) => b.y - a.y).slice(0, antennaCount);
  const rooftops = new Float32Array(antennaCount * 3);
  const antennaPhases = new Float32Array(antennaCount);
  tallest.forEach((top, i) => {
    rooftops[i * 3] = top.x;
    rooftops[i * 3 + 1] = top.y + 0.6;
    rooftops[i * 3 + 2] = top.z;
    antennaPhases[i] = rand() * Math.PI * 2;
  });

  return { matrices, seeds, rooftops, antennaPhases, antennaCount };
}

export default function City({
  shared,
  tier,
}: {
  shared: SharedUniforms;
  tier: QualityTier;
}) {
  const tierConfig = TIERS[tier];
  const count = tierConfig.cityCount;

  const groupRef = useRef<THREE.Group>(null);
  const instancedRef = useRef<THREE.InstancedMesh>(null);

  const layout = useMemo(
    () => buildLayout(count, tierConfig.antennaLights),
    [count, tierConfig.antennaLights],
  );

  const buildingGeometry = useMemo(() => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.setAttribute(
      'aSeed',
      new THREE.InstancedBufferAttribute(layout.seeds, 1),
    );
    return geometry;
  }, [layout]);

  const buildingMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: true,
        fog: true,
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          uTime: shared.uTime,
          uGroupOpacity: { value: 0 },
        },
        vertexShader: BUILDING_VERTEX,
        fragmentShader: BUILDING_FRAGMENT,
      }),
    [shared],
  );

  const antennaGeometry = useMemo(() => {
    if (layout.antennaCount === 0) return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(layout.rooftops, 3),
    );
    geometry.setAttribute(
      'aPhase',
      new THREE.BufferAttribute(layout.antennaPhases, 1),
    );
    return geometry;
  }, [layout]);

  const antennaMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        uniforms: {
          uTime: shared.uTime,
          uReduced: shared.uReduced,
          uDpr: shared.uDpr,
          uGroupOpacity: { value: 0 },
        },
        vertexShader: ANTENNA_VERTEX,
        fragmentShader: ANTENNA_FRAGMENT,
      }),
    [shared],
  );

  useLayoutEffect(() => {
    const instanced = instancedRef.current;
    if (!instanced) return;
    layout.matrices.forEach((matrix, i) => instanced.setMatrixAt(i, matrix));
    instanced.instanceMatrix.needsUpdate = true;
    instanced.computeBoundingSphere();
  }, [layout]);

  useFrame(() => {
    const opacity =
      shared.uBlendAB.value * (1 - shared.uBlendBC.value);
    buildingMaterial.uniforms.uGroupOpacity.value = opacity;
    antennaMaterial.uniforms.uGroupOpacity.value = opacity;
    if (groupRef.current) {
      groupRef.current.visible = opacity > 0.002;
    }
  });

  const hazeOpacity = () =>
    shared.uBlendAB.value * (1 - shared.uBlendBC.value);

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={instancedRef}
        args={[buildingGeometry, buildingMaterial, count]}
        frustumCulled={false}
      />
      {antennaGeometry && (
        <points geometry={antennaGeometry} material={antennaMaterial} />
      )}
      {/* Haze glows behind the skyline. */}
      <GlowSprite
        position={[-22, 8, -92]}
        scale={60}
        color={HEX.sunsetPink}
        intensity={0.15}
        getOpacity={hazeOpacity}
      />
      <GlowSprite
        position={[8, 10, -94]}
        scale={80}
        color={HEX.sunsetMagenta}
        intensity={0.12}
        getOpacity={hazeOpacity}
      />
      <GlowSprite
        position={[34, 6, -90]}
        scale={50}
        color={HEX.sunsetPink}
        intensity={0.1}
        getOpacity={hazeOpacity}
      />
    </group>
  );
}
