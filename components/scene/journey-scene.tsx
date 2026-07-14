'use client';

// Camera rig + stage groups + per-frame blend computation.
// Polls the frozen journeyState contract inside useFrame (priority -1 so the
// shared uniforms are up to date before every child's own useFrame at 0).

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';

import { journeyState } from '@/lib/journey-state';

import {
  BLEND_AB,
  BLEND_BC,
  CAMERA_DAMP_LAMBDA,
  CAMERA_DAMP_LAMBDA_REDUCED,
  CAMERA_KEYFRAMES,
  createSharedUniforms,
  FOG_A,
  FOG_B,
  FOG_C,
  POINTER_PARALLAX_X,
  POINTER_PARALLAX_Y,
  smoothstep,
} from './journey-config';
import type { QualityTier } from './quality';
import GlowSpriteDefaultCheck from './shared/glow-sprite';
import SkyDome from './shared/sky-dome';
import Water from './shared/water';
import Palms from './stage-a/palms';
import RetroSun from './stage-a/retro-sun';
import City from './stage-b/city';
import Moon from './stage-b/moon';
import CloudSea from './stage-c/cloud-sea';
import Nebula from './stage-c/nebula';
import Planets from './stage-c/planets';
import Starfield from './stage-c/starfield';

// (import kept referenced so tree-shaking never drops the shared module)
void GlowSpriteDefaultCheck;

const { damp, clamp } = THREE.MathUtils;

export default function JourneyScene({ tier }: { tier: QualityTier }) {
  const shared = useMemo(createSharedUniforms, []);

  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const gl = useThree((state) => state.gl);

  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        CAMERA_KEYFRAMES.map((k) => k.position.clone()),
        false,
        'centripetal',
      ),
    [],
  );

  const work = useMemo(
    () => ({
      pathPos: CAMERA_KEYFRAMES[0].position.clone(),
      lookTarget: CAMERA_KEYFRAMES[0].lookAt.clone(),
      dampedLook: CAMERA_KEYFRAMES[0].lookAt.clone(),
      fogColor: new THREE.Color(),
    }),
    [],
  );

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1); // guard against tab-switch spikes
    const { sectionProgress, pointerX, pointerY, reducedMotion } = journeyState;

    const sp = clamp(sectionProgress, 0, 7);
    const blendAB = smoothstep(BLEND_AB[0], BLEND_AB[1], sp);
    const blendBC = smoothstep(BLEND_BC[0], BLEND_BC[1], sp);

    // Shared uniforms (referenced by every stage material).
    shared.uBlendAB.value = blendAB;
    shared.uBlendBC.value = blendBC;
    shared.uReduced.value = reducedMotion ? 1 : 0;
    shared.uTime.value += dt * (reducedMotion ? 0 : 1);
    shared.uDpr.value = gl.getPixelRatio();

    // Camera path: Catmull-Rom through the 8 keyframe positions.
    curve.getPoint(sp / 7, work.pathPos);

    // LookAt: piecewise lerp between keyframe lookAts.
    const i = Math.min(6, Math.floor(sp));
    work.lookTarget.lerpVectors(
      CAMERA_KEYFRAMES[i].lookAt,
      CAMERA_KEYFRAMES[i + 1].lookAt,
      sp - i,
    );

    const lambda = reducedMotion
      ? CAMERA_DAMP_LAMBDA_REDUCED
      : CAMERA_DAMP_LAMBDA;
    const tx = work.pathPos.x + pointerX * POINTER_PARALLAX_X;
    const ty = work.pathPos.y + pointerY * POINTER_PARALLAX_Y;
    const tz = work.pathPos.z;

    camera.position.set(
      damp(camera.position.x, tx, lambda, dt),
      damp(camera.position.y, ty, lambda, dt),
      damp(camera.position.z, tz, lambda, dt),
    );

    work.dampedLook.set(
      damp(work.dampedLook.x, work.lookTarget.x, lambda, dt),
      damp(work.dampedLook.y, work.lookTarget.y, lambda, dt),
      damp(work.dampedLook.z, work.lookTarget.z, lambda, dt),
    );
    camera.lookAt(work.dampedLook);

    // Fog color: A -> B by blendAB, then -> C by blendBC.
    work.fogColor.copy(FOG_A).lerp(FOG_B, blendAB).lerp(FOG_C, blendBC);
    if (scene.fog) {
      scene.fog.color.copy(work.fogColor);
    }
  }, -1);

  return (
    <>
      {/* shared world */}
      <SkyDome shared={shared} />
      <Water shared={shared} tier={tier} />

      {/* stage A — retro sunset */}
      <RetroSun shared={shared} />
      <Palms shared={shared} />

      {/* stage B — neon beach city */}
      <City shared={shared} tier={tier} />
      <Moon shared={shared} />

      {/* stage C — deep space */}
      <Starfield shared={shared} tier={tier} />
      <Planets shared={shared} />
      <Nebula shared={shared} tier={tier} />
      <CloudSea shared={shared} tier={tier} />
    </>
  );
}
