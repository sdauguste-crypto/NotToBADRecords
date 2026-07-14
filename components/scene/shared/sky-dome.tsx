'use client';

// Full-sky gradient dome. Three color ramps (sunset / night / space) blended
// by the stage uniforms, plus a 1/255 dither to kill banding.

import { useMemo } from 'react';
import * as THREE from 'three';

import {
  GLSL_NOISE,
  glslColor,
  HEX,
  type SharedUniforms,
} from '../journey-config';

const VERTEX = /* glsl */ `
varying vec3 vWorldPos;
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const FRAGMENT = /* glsl */ `
uniform float uBlendAB;
uniform float uBlendBC;
varying vec3 vWorldPos;

${GLSL_NOISE}

const vec3 ORANGE  = ${glslColor(HEX.sunsetOrange)};
const vec3 PINK    = ${glslColor(HEX.sunsetPink)};
const vec3 MAGENTA = ${glslColor(HEX.sunsetMagenta)};
const vec3 HORIZON = ${glslColor(HEX.deepPurpleHorizon)};
const vec3 INDIGO  = ${glslColor(HEX.indigoNight)};
const vec3 VOID    = ${glslColor(HEX.void)};
const vec3 SPACE   = ${glslColor(HEX.spaceBase)};

vec3 rampA(float h) {
  vec3 c = mix(ORANGE, PINK, smoothstep(0.0, 0.25, h));
  c = mix(c, MAGENTA, smoothstep(0.25, 0.5, h));
  c = mix(c, HORIZON, smoothstep(0.5, 1.0, h));
  return c;
}

vec3 rampB(float h) {
  vec3 c = mix(INDIGO, VOID, smoothstep(0.08, 0.8, h));
  c += PINK * 0.12 * (1.0 - smoothstep(0.0, 0.12, h));
  return c;
}

vec3 rampC(vec2 p) {
  return SPACE + 0.06 * MAGENTA * vnoise(p * 2.5);
}

void main() {
  float h = clamp(vWorldPos.y / 300.0, 0.0, 1.0);
  vec3 a = rampA(h);
  vec3 b = rampB(h);
  vec3 c = rampC(normalize(vWorldPos).xy * 4.0 + vec2(0.0, h * 3.0));
  vec3 color = mix(mix(a, b, uBlendAB), c, uBlendBC);
  color += (hash21(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(color, 1.0);
}
`;

export default function SkyDome({ shared }: { shared: SharedUniforms }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uBlendAB: shared.uBlendAB,
          uBlendBC: shared.uBlendBC,
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
      }),
    [shared],
  );

  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[300, 32, 16]} />
    </mesh>
  );
}
