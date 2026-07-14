'use client';

// Three stylized planets for deep space: a large banded gas giant, a ringed
// planet, and a tiny distant dot — each with a glow halo. All fade in with
// blendBC.

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

const PLANET_VERTEX = /* glsl */ `
varying vec3 vObjPos;
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vObjPos = normalize(position);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const PLANET_FRAGMENT = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uRimColor;
uniform float uBandFreq;
uniform float uNoiseAmt;
uniform float uOpacity;
varying vec3 vObjPos;
varying vec3 vNormal;
varying vec3 vViewDir;

${GLSL_NOISE}

void main() {
  // 2-octave noise to soften the latitude bands.
  float n = vnoise(vObjPos.xy * 4.0 + 7.3) * 0.6
          + vnoise(vObjPos.zy * 8.0 + 2.1) * 0.4;
  float band = 0.5 + 0.5 * sin(vObjPos.y * uBandFreq + n * 2.0 * uNoiseAmt);
  vec3 color = mix(uColorA, uColorB, band);
  color *= 0.85 + 0.3 * mix(0.5, n, uNoiseAmt);

  float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 3.0);
  color += uRimColor * fresnel;

  gl_FragColor = vec4(color, uOpacity);
}
`;

const RING_VERTEX = /* glsl */ `
varying vec3 vObjPos;
void main() {
  vObjPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const RING_FRAGMENT = /* glsl */ `
uniform float uInner;
uniform float uOuter;
uniform float uOpacity;
varying vec3 vObjPos;

const vec3 GOLD    = ${glslColor(HEX.sunsetGold)};
const vec3 MAGENTA = ${glslColor(HEX.sunsetMagenta)};

void main() {
  float r = length(vObjPos.xy);
  float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);

  // Radial gradient with soft edges and two gaps.
  float alpha = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.85, 1.0, t));
  alpha *= 1.0 - 0.85 * (smoothstep(0.3, 0.34, t) * (1.0 - smoothstep(0.42, 0.46, t)));
  alpha *= 1.0 - 0.7 * (smoothstep(0.6, 0.63, t) * (1.0 - smoothstep(0.7, 0.74, t)));

  vec3 color = mix(GOLD, MAGENTA, t);
  gl_FragColor = vec4(color, alpha * 0.8 * uOpacity);
}
`;

type PlanetUniforms = {
  uColorA: THREE.IUniform<THREE.Color>;
  uColorB: THREE.IUniform<THREE.Color>;
  uRimColor: THREE.IUniform<THREE.Color>;
  uBandFreq: THREE.IUniform<number>;
  uNoiseAmt: THREE.IUniform<number>;
  uOpacity: THREE.IUniform<number>;
};

function makePlanetMaterial(
  colorA: string,
  colorB: string,
  rim: string,
  bandFreq: number,
  noiseAmt: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true,
    fog: false,
    uniforms: {
      uColorA: { value: new THREE.Color().setHex(parseInt(colorA.slice(1), 16), THREE.NoColorSpace) },
      uColorB: { value: new THREE.Color().setHex(parseInt(colorB.slice(1), 16), THREE.NoColorSpace) },
      uRimColor: { value: new THREE.Color().setHex(parseInt(rim.slice(1), 16), THREE.NoColorSpace) },
      uBandFreq: { value: bandFreq },
      uNoiseAmt: { value: noiseAmt },
      uOpacity: { value: 0 },
    } satisfies PlanetUniforms,
    vertexShader: PLANET_VERTEX,
    fragmentShader: PLANET_FRAGMENT,
  });
}

const RING_INNER = 3.5 * 1.4;
const RING_OUTER = 3.5 * 2.3;

export default function Planets({ shared }: { shared: SharedUniforms }) {
  const groupRef = useRef<THREE.Group>(null);

  const materials = useMemo(
    () => ({
      giant: makePlanetMaterial(
        HEX.sunsetOrange,
        HEX.sunsetMagenta,
        HEX.sunsetPink,
        8,
        1,
      ),
      ringed: makePlanetMaterial(
        HEX.sunsetMagenta,
        HEX.sunsetGold,
        HEX.sunsetPink,
        10,
        0.8,
      ),
      dot: makePlanetMaterial(
        HEX.sunsetGold,
        HEX.sunsetPink,
        HEX.sunsetMagenta,
        1.6,
        0,
      ),
      ring: new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        fog: false,
        uniforms: {
          uInner: { value: RING_INNER },
          uOuter: { value: RING_OUTER },
          uOpacity: { value: 0 },
        },
        vertexShader: RING_VERTEX,
        fragmentShader: RING_FRAGMENT,
      }),
    }),
    [],
  );

  const opacityNow = () => shared.uBlendBC.value;

  useFrame(() => {
    const opacity = opacityNow();
    materials.giant.uniforms.uOpacity.value = opacity;
    materials.ringed.uniforms.uOpacity.value = opacity;
    materials.dot.uniforms.uOpacity.value = opacity;
    materials.ring.uniforms.uOpacity.value = opacity;
    if (groupRef.current) {
      groupRef.current.visible = opacity > 0.002;
    }
  });

  const haloOpacity = () => shared.uBlendBC.value * 0.8;

  return (
    <group ref={groupRef}>
      {/* (a) large banded gas giant */}
      <mesh material={materials.giant} position={[-38, 50, -110]}>
        <sphereGeometry args={[7, 48, 32]} />
      </mesh>
      <GlowSprite
        position={[-38, 50, -110]}
        scale={30}
        color={HEX.sunsetMagenta}
        intensity={0.18}
        getOpacity={haloOpacity}
      />

      {/* (b) ringed planet */}
      <group position={[22, 40, -130]}>
        <mesh material={materials.ringed}>
          <sphereGeometry args={[3.5, 40, 24]} />
        </mesh>
        <mesh
          material={materials.ring}
          rotation={[
            -Math.PI / 2 + THREE.MathUtils.degToRad(25),
            THREE.MathUtils.degToRad(8),
            0,
          ]}
        >
          <ringGeometry args={[RING_INNER, RING_OUTER, 96]} />
        </mesh>
      </group>
      <GlowSprite
        position={[22, 40, -130]}
        scale={16}
        color={HEX.sunsetGold}
        intensity={0.16}
        getOpacity={haloOpacity}
      />

      {/* (c) tiny distant dot */}
      <mesh material={materials.dot} position={[8, 52, -180]}>
        <sphereGeometry args={[1.5, 24, 16]} />
      </mesh>
      <GlowSprite
        position={[8, 52, -180]}
        scale={6}
        color={HEX.sunsetPink}
        intensity={0.2}
        getOpacity={haloOpacity}
      />
    </group>
  );
}
