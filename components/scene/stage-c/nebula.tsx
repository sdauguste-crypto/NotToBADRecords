'use client';

// Soft additive nebula billboards: FBM value noise inside a radial mask,
// slowly rotating (frozen under reduced motion), tinted from the palette.

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
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

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uReduced;
uniform float uOpacity;
uniform vec3 uColor;
uniform float uSeed;
uniform float uRotRate;
varying vec2 vUv;

${GLSL_NOISE}

void main() {
  vec2 uv = vUv - 0.5;
  float angle = uTime * (1.0 - uReduced) * uRotRate;
  float c = cos(angle);
  float s = sin(angle);
  uv = mat2(c, -s, s, c) * uv;

  float d = length(uv);
  float mask = pow(1.0 - smoothstep(0.0, 0.5, d), 1.5);
  float cloud = fbm3(uv * 3.0 + uSeed);

  gl_FragColor = vec4(uColor, cloud * mask * uOpacity);
}
`;

type NebulaSpec = {
  position: [number, number, number];
  size: number;
  color: string;
  baseOpacity: number;
  rotRate: number;
  seed: number;
};

function buildSpecs(count: number): NebulaSpec[] {
  const rand = mulberry32(0xeb01a);
  const palette: Array<{ color: string; opacity: [number, number] }> = [
    { color: HEX.sunsetMagenta, opacity: [0.08, 0.12] },
    { color: HEX.sunsetPink, opacity: [0.07, 0.11] },
    { color: HEX.sunsetOrange, opacity: [0.05, 0.07] }, // orange kept low
    { color: HEX.sunsetMagenta, opacity: [0.06, 0.1] },
    { color: HEX.sunsetPink, opacity: [0.05, 0.09] },
  ];
  const specs: NebulaSpec[] = [];
  for (let i = 0; i < count; i++) {
    const entry = palette[i % palette.length];
    specs.push({
      position: [
        -60 + rand() * 120,
        18 + rand() * 50,
        -120 - rand() * 60, // z in -120..-180
      ],
      size: 60 + rand() * 50, // 60..110
      color: entry.color,
      baseOpacity:
        entry.opacity[0] + rand() * (entry.opacity[1] - entry.opacity[0]),
      rotRate: (rand() * 0.5 + 0.5) * 0.03 * (rand() > 0.5 ? 1 : -1),
      seed: rand() * 40,
    });
  }
  return specs;
}

function NebulaPlane({
  shared,
  spec,
}: {
  shared: SharedUniforms;
  spec: NebulaSpec;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

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
          uColor: {
            value: new THREE.Color().setHex(
              parseInt(spec.color.slice(1), 16),
              THREE.NoColorSpace,
            ),
          },
          uSeed: { value: spec.seed },
          uRotRate: { value: spec.rotRate },
          uOpacity: { value: 0 },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
      }),
    [shared, spec],
  );

  useFrame(({ camera }) => {
    const opacity = spec.baseOpacity * shared.uBlendBC.value;
    material.uniforms.uOpacity.value = opacity;
    const mesh = meshRef.current;
    if (mesh) {
      mesh.visible = opacity > 0.001;
      mesh.quaternion.copy(camera.quaternion); // billboard
    }
  });

  return (
    <mesh ref={meshRef} material={material} position={spec.position}>
      <planeGeometry args={[spec.size, spec.size]} />
    </mesh>
  );
}

export default function Nebula({
  shared,
  tier,
}: {
  shared: SharedUniforms;
  tier: QualityTier;
}) {
  const specs = useMemo(() => buildSpecs(TIERS[tier].nebulaCount), [tier]);
  return (
    <group>
      {specs.map((spec, index) => (
        <NebulaPlane key={index} shared={shared} spec={spec} />
      ))}
    </group>
  );
}
