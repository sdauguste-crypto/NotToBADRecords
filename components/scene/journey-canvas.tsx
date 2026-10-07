'use client';

// The R3F <Canvas>: transparent, fixed full-viewport, scene fog, the
// first-frame readiness flag, and (high tier) the post-processing chain that
// gives neon its real glow. Resolution and effects are governed by measured
// frame rate, and every shader is compiled up front so no world stalls on
// first sight.

import { PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import type { BloomEffect, EffectComposer as ComposerImpl } from 'postprocessing';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { journeyState } from '@/lib/journey-state';

import {
  BLEND_AB,
  BLEND_BC,
  FOG_FAR,
  FOG_NEAR,
  HEX,
  smoothstep,
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

/**
 * three.js compiles a shader the first time its object is drawn, and it only
 * pre-compiles visible objects — so the city, the boats and space each froze
 * the page for a beat the first time they scrolled into view. This briefly
 * reveals everything to the compiler (and uploads its textures), then
 * restores visibility before the frame renders. It runs again as the lazily
 * loaded models arrive.
 *
 * With post-processing on, the scene is drawn into the composer's offscreen
 * buffer, and three.js keys a different shader variant for an offscreen
 * target than for the screen (linear output, no tone mapping) — so the
 * warm-up has to compile against an offscreen target too, or it builds
 * variants nothing uses.
 */
// ~2s, 6s and 15s at 60fps catch the models on slow connections too
const WARMUP_FRAMES = new Set([2, 120, 360, 900]);

function ShaderWarmup({ offscreen }: { offscreen: boolean }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const frame = useRef(0);
  const target = useMemo(
    () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }),
    [],
  );
  useFrame(() => {
    frame.current += 1;
    if (!WARMUP_FRAMES.has(frame.current)) return;
    const hidden: THREE.Object3D[] = [];
    const textures = new Set<THREE.Texture>();
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
      const material = (o as THREE.Mesh).material;
      for (const m of Array.isArray(material) ? material : material ? [material] : []) {
        for (const value of Object.values(m)) if (value instanceof THREE.Texture) textures.add(value);
        const uniforms = (m as THREE.ShaderMaterial).uniforms;
        if (uniforms) for (const u of Object.values(uniforms)) if (u.value instanceof THREE.Texture) textures.add(u.value);
      }
    });
    const previous = gl.getRenderTarget();
    if (offscreen) gl.setRenderTarget(target);
    // compileAsync gathers every program synchronously, then lets the driver
    // link them in the background where parallel compile is supported
    gl.compileAsync(scene, camera).catch(() => {});
    gl.setRenderTarget(previous);
    for (const t of textures) gl.initTexture(t);
    for (const o of hidden) o.visible = false;
  });
  return null;
}

// The sunset wants its whole sky to haze into glow; the city wants only its
// neon to, or the bright dusk sky veils every tower in milk.
const THRESHOLD_SUNSET = 0.28;
const THRESHOLD_CITY = 0.7;

function StageBloom({ lite }: { lite: boolean }) {
  const bloom = useRef<BloomEffect>(null);
  const composer = useRef<ComposerImpl>(null);
  // The composer sizes its buffers from the window size, which doesn't change
  // when only the pixel ratio does — resize it explicitly, or a lower ratio
  // shrinks the canvas while the expensive buffers stay full size.
  const dpr = useThree((s) => s.viewport.dpr);
  const size = useThree((s) => s.size);
  useEffect(() => {
    composer.current?.setSize(size.width, size.height);
  }, [dpr, size]);

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
    // 4x MSAA: the composer's default 8x doubled the cost for edges the eye
    // cannot tell apart at this resolution. Lite drops MSAA and shortens the
    // glow's blur chain but keeps rendering through the composer, so no
    // scene shader changes variant and the look holds.
    <EffectComposer ref={composer} multisampling={lite ? 0 : 4}>
      {/* HDR glow: the city's neon strips run past 1.0 and bloom into light */}
      <Bloom
        ref={bloom}
        intensity={0.9}
        luminanceThreshold={THRESHOLD_SUNSET}
        luminanceSmoothing={0.35}
        mipmapBlur
        levels={lite ? 5 : 8}
      />
      <Vignette eskil={false} offset={0.22} darkness={0.5} />
    </EffectComposer>
  );
}

/**
 * A full-screen scene at a Retina 2x is four times the pixels of 1x, and the
 * difference behind glass panels and bloom is hard to see — 1.5x is the
 * ceiling. Below that, the frame rate decides.
 */
const MAX_DPR = 1.5;

/**
 * Steps quality down when the frame rate can't hold, and never back up.
 *
 * Every step is visible for a moment, so it must be rare: a governor that
 * raised quality again on a good sample would oscillate on a borderline
 * machine, flashing each time (the drei monitor counts every good sample
 * as a flip, so even a smooth laptop tripped its fallback). Two steps at
 * most, in order: drop to 1x, then lighten the effects.
 *
 * The resolution change goes through R3F's store from inside the frame, so
 * the canvas is resized and redrawn in the same animation frame — changing
 * the Canvas prop resized it from React's commit instead, and the browser
 * showed the blank, freshly cleared canvas for a frame.
 */
function QualityGovernor({ sharpest, onLite }: { sharpest: number; onLite: () => void }) {
  const setDpr = useThree((s) => s.setDpr);
  const step = useRef(sharpest > 1 ? 0 : 1);
  const decline = useCallback(() => {
    if (step.current === 0) {
      step.current = 1;
      setDpr(1);
    } else if (step.current === 1) {
      step.current = 2;
      onLite();
    }
  }, [setDpr, onLite]);
  return <PerformanceMonitor onDecline={decline} flipflops={Infinity} />;
}

export default function JourneyCanvas() {
  const tier = useMemo(() => detectTier(), []);
  const sharpest = useMemo(
    () => (tier === 'high' ? Math.min(window.devicePixelRatio || 1, MAX_DPR) : 1),
    [tier],
  );
  const effects = tier === 'high';
  const [lite, setLite] = useState(false);
  const goLite = useCallback(() => setLite(true), []);

  return (
    <Canvas
      style={{ position: 'fixed', inset: 0 }}
      frameloop="always"
      dpr={sharpest}
      gl={{
        // the composer renders into its own multisampled target, so an
        // antialiased canvas would only add a second, unseen resolve
        antialias: !effects,
        alpha: true,
        powerPreference: 'high-performance',
      }}
      camera={{ fov: 55, near: 0.1, far: 600, position: [0, 2.5, 10] }}
    >
      {/* scene.background stays null (transparent canvas); fog color is
          re-lerped every frame by JourneyScene. */}
      <fog attach="fog" args={[HEX.fogA, FOG_NEAR, FOG_FAR]} />
      {effects && <QualityGovernor sharpest={sharpest} onLite={goLite} />}
      <ReadyFlag />
      <ShaderWarmup offscreen={effects} />
      <JourneyScene tier={tier} />
      {effects && <StageBloom lite={lite} />}
    </Canvas>
  );
}
