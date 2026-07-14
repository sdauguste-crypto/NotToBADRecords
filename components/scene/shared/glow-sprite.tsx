'use client';

// Reusable additive glow billboard (soft radial falloff, pow 2.2).
// Opacity is driven per frame via the getOpacity callback.

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { srgbColor } from '../journey-config';

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uOpacityFactor;
varying vec2 vUv;
void main() {
  float falloff = pow(1.0 - smoothstep(0.0, 0.5, length(vUv - 0.5)), 2.2);
  gl_FragColor = vec4(uColor, falloff * uIntensity * uOpacityFactor);
}
`;

export type GlowSpriteProps = {
  position: [number, number, number];
  /** World-space diameter of the glow quad. */
  scale: number;
  /** Hex string, e.g. '#ff2e88'. */
  color: string;
  /** Peak alpha at the center (0..1). */
  intensity?: number;
  /** Called every frame; return the current opacity factor (0..1). */
  getOpacity?: () => number;
};

export default function GlowSprite({
  position,
  scale,
  color,
  intensity = 1,
  getOpacity,
}: GlowSpriteProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        uniforms: {
          uColor: { value: srgbColor(color) },
          uIntensity: { value: intensity },
          uOpacityFactor: { value: 1 },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
      }),
    // Static usage: color/intensity are fixed per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (mesh) {
      mesh.quaternion.copy(camera.quaternion); // billboard
    }
    if (getOpacity) {
      const opacity = getOpacity();
      material.uniforms.uOpacityFactor.value = opacity;
      if (mesh) {
        mesh.visible = opacity > 0.002;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale} material={material}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
