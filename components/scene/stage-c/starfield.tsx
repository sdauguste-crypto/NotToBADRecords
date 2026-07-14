'use client';

// Twinkling starfield on an upper-hemisphere-biased shell (radius 150..250).
// Slightly visible at night in stage B (0.15), full strength in stage C.

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import {
  glslColor,
  HEX,
  mulberry32,
  type SharedUniforms,
  TIERS,
} from '../journey-config';
import type { QualityTier } from '../quality';

const VERTEX = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute float aTint;
uniform float uDpr;
varying float vPhase;
varying float vTint;
void main() {
  vPhase = aPhase;
  vTint = aTint;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uDpr * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uReduced;
uniform float uOpacity;
varying float vPhase;
varying float vTint;

const vec3 GOLD = ${glslColor(HEX.sunsetGold)};
const vec3 PINK = ${glslColor(HEX.starPink)};

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float soft = 1.0 - smoothstep(0.2, 0.5, d);
  float twinkle = 0.6 + 0.4 * sin(uTime * (1.0 - uReduced) * 1.5 + vPhase);
  vec3 color = vec3(1.0);
  if (vTint > 1.5) {
    color = PINK;
  } else if (vTint > 0.5) {
    color = GOLD;
  }
  gl_FragColor = vec4(color, soft * twinkle * uOpacity);
}
`;

function buildStars(count: number) {
  const rand = mulberry32(0x57a2_f1e1);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const tints = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Upper-hemisphere biased direction.
    const azimuth = rand() * Math.PI * 2;
    const y = rand() * 1.2 - 0.2; // mostly positive
    const horizontal = Math.sqrt(Math.max(0, 1 - y * y));
    const radius = 150 + rand() * 100;
    positions[i * 3] = Math.cos(azimuth) * horizontal * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = Math.sin(azimuth) * horizontal * radius;

    sizes[i] = 0.5 + rand() * 1.5;
    phases[i] = rand() * Math.PI * 2;
    // 80% white, then split the remaining 20% between gold and pink.
    const roll = rand();
    tints[i] = roll < 0.8 ? 0 : roll < 0.9 ? 1 : 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aTint', new THREE.BufferAttribute(tints, 1));
  return geometry;
}

export default function Starfield({
  shared,
  tier,
}: {
  shared: SharedUniforms;
  tier: QualityTier;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = TIERS[tier].starCount;

  const geometry = useMemo(() => buildStars(count), [count]);

  const material = useMemo(
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
          uOpacity: { value: 0 },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
      }),
    [shared],
  );

  useFrame(() => {
    const opacity =
      0.15 * shared.uBlendAB.value + 0.85 * shared.uBlendBC.value;
    material.uniforms.uOpacity.value = opacity;
    if (pointsRef.current) {
      pointsRef.current.visible = opacity > 0.002;
    }
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
}
