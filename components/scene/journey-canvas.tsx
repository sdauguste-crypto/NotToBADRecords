'use client';

// The R3F <Canvas>: transparent, fixed full-viewport, dpr/AA by device tier,
// scene fog, and the first-frame readiness flag.

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';

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
    </Canvas>
  );
}
