'use client';

// The R3F <Canvas>: transparent, fixed full-viewport, dpr/AA by device tier,
// scene fog, the first-frame readiness flag, and (high tier) the cinematic
// post-processing chain that gives neon its real glow.

import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import type { BloomEffect } from 'postprocessing';
import { useMemo, useRef } from 'react';

import { journeyState } from '@/lib/journey-state';

import {
  BLEND_AB,
  BLEND_BC,
  FOG_FAR,
  FOG_NEAR,
  HEX,
  smoothstep,
  TIERS,
} from './journey-config';
import JourneyScene from './journey-scene';
import { detectTier } from './quality';

/** Flags <html data-journey-ready="true"> on the first rendered frame. */
function ReadyFlag() {
  const flagged = useRef(false);
  useFrame(() => {
    if (!flagged.current) {
      flagged.current = true;
      document.documentElement.dataset.journeyReady = 'true';
    }
  });
  return null;
}

// The sunset wants its whole sky to haze into glow; the city wants only its
// neon to, or the bright dusk sky veils every tower in milk.
const THRESHOLD_SUNSET = 0.28;
const THRESHOLD_CITY = 0.7;

function StageBloom() {
  const bloom = useRef<BloomEffect>(null);
  useFrame(() => {
    const sp = journeyState.sectionProgress;
    const city =
      smoothstep(BLEND_AB[0], BLEND_AB[1], sp) *
      (1 - smoothstep(BLEND_BC[0], BLEND_BC[1], sp));
    if (bloom.current) {
      bloom.current.luminanceMaterial.threshold =
        THRESHOLD_SUNSET + (THRESHOLD_CITY - THRESHOLD_SUNSET) * city;
    }
  });
  return (
    <EffectComposer>
      {/* HDR glow: the city's neon strips run past 1.0 and bloom into light */}
      <Bloom
        ref={bloom}
        intensity={0.9}
        luminanceThreshold={THRESHOLD_SUNSET}
        luminanceSmoothing={0.35}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.22} darkness={0.5} />
    </EffectComposer>
  );
}

export default function JourneyCanvas() {
  const tier = useMemo(() => detectTier(), []);
  const tierConfig = TIERS[tier];

  return (
    <Canvas
      style={{ position: 'fixed', inset: 0 }}
      frameloop="always"
      dpr={tierConfig.dpr}
      gl={{
        antialias: tier === 'high',
        alpha: true,
        powerPreference: 'high-performance',
      }}
      camera={{ fov: 55, near: 0.1, far: 600, position: [0, 2.5, 10] }}
    >
      {/* scene.background stays null (transparent canvas); fog color is
          re-lerped every frame by JourneyScene. */}
      <fog attach="fog" args={[HEX.fogA, FOG_NEAR, FOG_FAR]} />
      <ReadyFlag />
      <JourneyScene tier={tier} />
      {tier === 'high' && <StageBloom />}
    </Canvas>
  );
}
