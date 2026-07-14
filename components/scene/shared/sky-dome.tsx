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
uniform float uCloudReady;
uniform sampler2D uCloudMap;
varying vec3 vWorldPos;

${GLSL_NOISE}

const vec3 PINK    = ${glslColor(HEX.sunsetPink)};
const vec3 MAGENTA = ${glslColor(HEX.sunsetMagenta)};
const vec3 HORIZON = ${glslColor(HEX.deepPurpleHorizon)};
const vec3 INDIGO  = ${glslColor(HEX.indigoNight)};
const vec3 VOID    = ${glslColor(HEX.void)};
const vec3 SPACE   = ${glslColor(HEX.spaceBase)};

// Sunset ramp runs deeper than the shared palette so the bright sun disc
// pops out of it: rose horizon -> muted magenta -> violet -> near-black zenith.
const vec3 A_HORIZON = ${glslColor('#c9308f')};
const vec3 A_LOW     = ${glslColor('#8b2fd6')};
const vec3 A_MID     = ${glslColor('#4a1a8f')};

vec3 rampA(float h) {
  vec3 c = mix(A_HORIZON, A_LOW, smoothstep(0.0, 0.28, h));
  c = mix(c, A_MID, smoothstep(0.28, 0.55, h));
  c = mix(c, HORIZON, smoothstep(0.55, 1.0, h));
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

  // Photographic sunset clouds wrapped around the dome by azimuth (mirrored
  // repeat hides the photo's edges), blended into the ramp near the horizon
  // and dissolving toward the zenith so the palette stays coherent.
  vec3 dir = normalize(vWorldPos);
  float az = atan(dir.x, -dir.z);
  vec2 cuv = vec2(az * 0.477 + 0.72, clamp(h * 1.45, 0.02, 0.98));
  vec3 cloud = texture2D(uCloudMap, cuv).rgb * vec3(0.95, 0.72, 1.05);
  float cw = uCloudReady * 0.55 * (1.0 - smoothstep(0.22, 0.6, h));
  a = mix(a, cloud, cw);
  vec3 b = rampB(h);
  vec3 c = rampC(normalize(vWorldPos).xy * 4.0 + vec2(0.0, h * 3.0));
  vec3 color = mix(mix(a, b, uBlendAB), c, uBlendBC);
  color += (hash21(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(color, 1.0);
}
`;

export default function SkyDome({ shared }: { shared: SharedUniforms }) {
  const material = useMemo(() => {
    const uCloudReady = { value: 0 };
    const cloudMap = new THREE.TextureLoader().load(
      '/textures/sunset-clouds.webp',
      () => {
        uCloudReady.value = 1;
      },
    );
    cloudMap.wrapS = THREE.MirroredRepeatWrapping;
    cloudMap.wrapT = THREE.ClampToEdgeWrapping;
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uBlendAB: shared.uBlendAB,
        uBlendBC: shared.uBlendBC,
        uCloudReady,
        uCloudMap: { value: cloudMap },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
    });
  }, [shared]);

  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[300, 32, 16]} />
    </mesh>
  );
}
