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
uniform float uMapReady;
uniform sampler2D uNormalMap;
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

  // Photo-derived ripple normals, two scales scrolling against each other
  // (mirrored wrap hides the photo's seams). uMapReady gates until loaded.
  vec2 rip = (texture2D(uNormalMap, p * 0.045 + vec2(uTime * 0.010, uTime * 0.014)).xy * 2.0 - 1.0)
           + (texture2D(uNormalMap, p * 0.11  + vec2(-uTime * 0.016, uTime * 0.008)).xy * 2.0 - 1.0) * 0.6;
  rip *= uMapReady;
  color += rip.y * 0.05 * mix(MAGENTA, PINK, uBlendAB);

  // Gold sun streak toward the horizon (stage A only), wobbled by ripples.
  float streak = exp(-pow((vWorld.x + rip.x * 2.2) / (1.5 + n * 1.2), 2.0))
               * (1.0 - smoothstep(-110.0, 10.0, vWorld.z));
  color += streak * mix(GOLD, PINK, 0.4) * (1.0 - uBlendAB);

  // Specular glints off the ripple normals — gold under the sun, pink
  // under the city neon.
  vec3 N = normalize(vec3(rip.x * 0.8, 1.0, rip.y * 0.8));
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(vec3(0.12, 0.3, -1.0));
  float spec = pow(max(dot(N, normalize(L + V)), 0.0), 90.0);
  // fade glints near the camera so foreground sparkle doesn't fight the UI
  spec *= 1.0 - smoothstep(-30.0, -6.0, vWorld.z);
  color += spec * mix(mix(GOLD, PINK, 0.4), PINK, uBlendAB) * 0.9 * uMapReady;

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

  const material = useMemo(() => {
    const uMapReady = { value: 0 };
    const normalMap = new THREE.TextureLoader().load(
      '/textures/water-normal.webp',
      () => {
        uMapReady.value = 1;
      },
    );
    normalMap.wrapS = THREE.MirroredRepeatWrapping;
    normalMap.wrapT = THREE.MirroredRepeatWrapping;
    normalMap.colorSpace = THREE.NoColorSpace;
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: true,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        uTime: shared.uTime,
        uBlendAB: shared.uBlendAB,
        uBlendBC: shared.uBlendBC,
        uGrid: { value: TIERS[tier].waterGrid ? 1 : 0 },
        uMapReady,
        uNormalMap: { value: normalMap },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
    });
  }, [shared, tier]);

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
