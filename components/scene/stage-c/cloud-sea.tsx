'use client';

// A luminous cloud sea below the space camera: vertex-displaced plane whose
// color runs valley-purple to crest-pink, brightening toward the horizon.

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
uniform float uTime;
uniform float uReduced;
varying float vHeight;
varying vec3 vWorld;

${GLSL_NOISE}

void main() {
  vec3 p = position;
  float t = uTime * (1.0 - uReduced) * 0.05;
  // 2-octave noise displacement, amplitude 2.5 (plane is rotated flat, so
  // object +Z maps to world +Y).
  float n = vnoise(p.xy * 0.045 + vec2(t, t * 0.6)) * 0.65
          + vnoise(p.xy * 0.11 - vec2(t * 1.7, t)) * 0.35;
  p.z += n * 2.5;
  vHeight = n;

  vec4 worldPos = modelMatrix * vec4(p, 1.0);
  vWorld = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const FRAGMENT = /* glsl */ `
uniform float uOpacity;
varying float vHeight;
varying vec3 vWorld;

const vec3 VALLEY = ${glslColor(HEX.cloudValley)};
const vec3 CREST  = ${glslColor(HEX.cloudCrest)};

void main() {
  vec3 color = mix(VALLEY, CREST, smoothstep(0.12, 0.95, vHeight));

  // View-angle brightening toward the horizon (grazing angles glow).
  vec3 toCamera = normalize(cameraPosition - vWorld);
  float grazing = 1.0 - abs(toCamera.y);
  color *= 0.7 + 0.6 * pow(grazing, 3.0);

  gl_FragColor = vec4(color, uOpacity);
}
`;

export default function CloudSea({
  shared,
  tier,
}: {
  shared: SharedUniforms;
  tier: QualityTier;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const segments = TIERS[tier].cloudSegments;

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTime: shared.uTime,
          uReduced: shared.uReduced,
          uOpacity: { value: 0 },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
      }),
    [shared],
  );

  useFrame(() => {
    const opacity = shared.uBlendBC.value;
    material.uniforms.uOpacity.value = opacity;
    if (meshRef.current) {
      meshRef.current.visible = opacity > 0.002;
    }
  });

  return (
    <mesh
      ref={meshRef}
      material={material}
      position={[0, 11, -90]}
      rotation={[-Math.PI / 2, 0, 0]}
      frustumCulled={false}
    >
      <planeGeometry args={[240, 240, segments, segments]} />
    </mesh>
  );
}
