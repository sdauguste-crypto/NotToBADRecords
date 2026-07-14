'use client';

// The R3F <Canvas>: transparent, fixed full-viewport, dpr/AA by device tier,
// scene fog, the first-frame readiness flag, and (high tier) the cinematic
// post-processing chain that gives neon its real glow.

import { Canvas, useFrame } from '@react-three/fiber';
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Vignette,
} from '@react-three/postprocessing';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { FOG_FAR, FOG_NEAR, HEX, TIERS } from './journey-config';
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

const CHROMATIC_OFFSET = new THREE.Vector2(0.0006, 0.0004);

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
      {tier === 'high' && (
        <EffectComposer>
          {/* real HDR-style glow on the sun, neon rims, windows, and stars */}
          <Bloom
            intensity={0.85}
            luminanceThreshold={0.22}
            luminanceSmoothing={0.3}
            mipmapBlur
          />
          {/* subtle lens fringe — the "shot on a camera" cue */}
          <ChromaticAberration offset={CHROMATIC_OFFSET} />
          <Vignette eskil={false} offset={0.18} darkness={0.62} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
