'use client';

// Ocean plane: noise shimmer, gold sun streak (stage A), pink shore glow
// (stage B), optional retro grid on high tier. Fades out entirely by stage C.

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import {
  GLSL_NOISE,
  glslColor,
  HEX,
  type SharedUniforms,
  TIERS,
} from '../journey-config';
import type { QualityTier } from '../quality';

const VERTEX = /* glsl */ `
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorld = worldPos.xyz;
  vec4 mvPosition = viewMatrix * worldPos;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uBlendAB;
uniform float uBlendBC;
uniform float uGrid;
varying vec3 vWorld;
#include <fog_pars_fragment>

${GLSL_NOISE}

const vec3 BASE_A  = ${glslColor(HEX.waterBaseA)};
const vec3 BASE_B  = ${glslColor(HEX.waterBaseB)};
const vec3 MAGENTA = ${glslColor(HEX.sunsetMagenta)};
const vec3 GOLD    = ${glslColor(HEX.sunsetGold)};
const vec3 PINK    = ${glslColor(HEX.sunsetPink)};

void main() {
  vec3 color = mix(BASE_A, BASE_B, uBlendAB);

  // 2-octave value noise scrolled in two directions.
  vec2 p = vWorld.xz;
  float n = vnoise(p * 0.15 + vec2(uTime * 0.06, uTime * 0.035)) * 0.65
          + vnoise(p * 0.42 + vec2(-uTime * 0.05, uTime * 0.08)) * 0.35;
  color += n * 0.15 * MAGENTA;

  // Gold sun streak toward the horizon (stage A only).
  float streak = exp(-pow(vWorld.x / (1.5 + n * 1.2), 2.0))
               * (1.0 - smoothstep(-110.0, 10.0, vWorld.z));
  color += streak * mix(GOLD, PINK, 0.4) * (1.0 - uBlendAB);

  // Pink shore glow band (stage B).
  color += exp(-pow((vWorld.z + 62.0) / 8.0, 2.0)) * PINK * 0.35 * uBlendAB;

  // Faint retro grid, high tier only, fading near the camera.
  if (uGrid > 0.5) {
    float grid = step(0.97, fract(vWorld.x * 0.15))
               + step(0.97, fract(vWorld.z * 0.15));
    color += grid * PINK * 0.05 * smoothstep(12.0, 40.0, -vWorld.z);
  }

  float alpha = 1.0 - uBlendBC;
  gl_FragColor = vec4(color, alpha);
  #include <fog_fragment>
}
`;

export default function Water({
  shared,
  tier,
}: {
  shared: SharedUniforms;
  tier: QualityTier;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: true,
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          uTime: shared.uTime,
          uBlendAB: shared.uBlendAB,
          uBlendBC: shared.uBlendBC,
          uGrid: { value: TIERS[tier].waterGrid ? 1 : 0 },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
      }),
    [shared, tier],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (mesh) {
      mesh.visible = shared.uBlendBC.value < 0.999;
    }
  });

  return (
    <mesh
      ref={meshRef}
      material={material}
      position={[0, 0, -50]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[300, 140]} />
    </mesh>
  );
}
