'use client';

// Pale gold moon disc billboard with noise blotches + crescent shading,
// and a wide gold glow halo. Appears with stage B, half-fades in stage C.

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import {
  GLSL_NOISE,
  glslColor,
  HEX,
  type SharedUniforms,
} from '../journey-config';
import GlowSprite from '../shared/glow-sprite';

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform float uOpacity;
varying vec2 vUv;

${GLSL_NOISE}

const vec3 MOON = ${glslColor(HEX.moonGold)};

void main() {
  vec2 uv = vUv;
  float d = length(uv - 0.5);
  float disc = 1.0 - smoothstep(0.47, 0.5, d);

  vec3 color = MOON;

  // 3 subtle darker blotches from low-frequency noise.
  float blotch = vnoise(uv * 5.0 + 3.7) * 0.6 + vnoise(uv * 11.0 + 9.2) * 0.4;
  color *= 1.0 - 0.16 * smoothstep(0.55, 0.85, blotch);

  // Crescent shading: darken toward an offset radial center.
  float offsetDist = length(uv - vec2(0.63, 0.57));
  color *= mix(0.4, 1.0, smoothstep(0.18, 0.5, offsetDist));

  gl_FragColor = vec4(color, disc * uOpacity);
}
`;

const MOON_POSITION: [number, number, number] = [-28, 34, -105];

export default function Moon({ shared }: { shared: SharedUniforms }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: false,
        uniforms: {
          uOpacity: { value: 0 },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
      }),
    [],
  );

  const opacityNow = () =>
    shared.uBlendAB.value * (1 - shared.uBlendBC.value);

  useFrame(({ camera }) => {
    const opacity = opacityNow();
    material.uniforms.uOpacity.value = opacity;
    const mesh = meshRef.current;
    if (mesh) {
      mesh.visible = opacity > 0.002;
      mesh.quaternion.copy(camera.quaternion); // billboard
    }
  });

  return (
    <group>
      <mesh ref={meshRef} material={material} position={MOON_POSITION}>
        <planeGeometry args={[6, 6]} />
      </mesh>
      <GlowSprite
        position={[-28, 34, -106]}
        scale={16}
        color={HEX.sunsetGold}
        intensity={0.15}
        getOpacity={opacityNow}
      />
    </group>
  );
}
