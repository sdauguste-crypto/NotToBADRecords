'use client';

// The big retro sunset disc: vertical gold->orange->pink gradient with
// animated scanline bands over the lower half, plus two glow halos.
// Fades out as stage A blends into stage B.

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { glslColor, HEX, type SharedUniforms } from '../journey-config';
import GlowSprite from '../shared/glow-sprite';

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uBlendAB;
varying vec2 vUv;

// Local sun gradient (not the shared palette): white-hot crown sinking into
// deep violet, so the disc reads against the hot-pink sky band behind it.
const vec3 TOP = ${glslColor('#fff2fc')};
const vec3 MID = ${glslColor('#ff5ad1')};
const vec3 BOT = ${glslColor('#7a2ff0')};

void main() {
  vec2 uv = vUv;
  float d = length(uv - 0.5);
  float disc = 1.0 - smoothstep(0.46, 0.475, d);

  vec3 color = mix(BOT, MID, smoothstep(0.0, 0.5, uv.y));
  color = mix(color, TOP, smoothstep(0.5, 1.0, uv.y));

  float stripe = 1.0;
  if (uv.y < 0.48) {
    float k = (0.48 - uv.y) / 0.48;
    stripe = step(mix(0.12, 0.55, k), fract(uv.y * 26.0 + uTime * 0.15));
  }

  float alpha = disc * stripe * (1.0 - uBlendAB);
  gl_FragColor = vec4(color, alpha);
}
`;

const SUN_POSITION: [number, number, number] = [0, 7, -110];

export default function RetroSun({ shared }: { shared: SharedUniforms }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTime: shared.uTime,
          uBlendAB: shared.uBlendAB,
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
      }),
    [shared],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (mesh) {
      mesh.visible = shared.uBlendAB.value < 0.999;
    }
  });

  const glowOpacity = () => 1 - shared.uBlendAB.value;

  return (
    <group>
      <mesh ref={meshRef} material={material} position={SUN_POSITION}>
        <planeGeometry args={[44, 44]} />
      </mesh>
      <GlowSprite
        position={[0, 7, -111]}
        scale={70}
        color={HEX.sunsetPink}
        intensity={0.25}
        getOpacity={glowOpacity}
      />
      <GlowSprite
        position={[0, 7, -112]}
        scale={100}
        color={HEX.sunsetOrange}
        intensity={0.12}
        getOpacity={glowOpacity}
      />
    </group>
  );
}
