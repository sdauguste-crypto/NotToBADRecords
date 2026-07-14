'use client';

// Real 3D models (optimized GLBs under public/models/) layered into the
// journey world. High tier only — low-tier devices keep the lighter
// procedural scene. Each model group scales with its stage blend so it
// arrives/departs with the world crossfades.

import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { SharedUniforms } from '../journey-config';

const BASE = '/models';
const URLS = {
  palms: `${BASE}/palm-set.glb`,
  recordPlayer: `${BASE}/record-player.glb`,
  satellite: `${BASE}/satellite.glb`,
  spaceship: `${BASE}/spaceship.glb`,
  astronaut: `${BASE}/astronaut.glb`,
  hoverCar: `${BASE}/hover-car.glb`,
  lotus: `${BASE}/lotus.glb`,
} as const;

Object.values(URLS).forEach((url) => useGLTF.preload(url, false, true));

/** Clone + normalize a model: longest dimension = size, base centered at y=0. */
function normalize(source: THREE.Object3D, size: number): THREE.Group {
  const obj = source.clone(true);
  const group = new THREE.Group();
  group.add(obj);
  const box = new THREE.Box3().setFromObject(obj);
  const dims = box.getSize(new THREE.Vector3());
  const k = size / Math.max(dims.x, dims.y, dims.z);
  obj.scale.setScalar(k);
  const box2 = new THREE.Box3().setFromObject(obj);
  obj.position.set(
    -(box2.min.x + box2.max.x) / 2,
    -box2.min.y,
    -(box2.min.z + box2.max.z) / 2,
  );
  return group;
}

type Vis = (shared: SharedUniforms) => number;
const stageA: Vis = (s) => 1 - s.uBlendAB.value;
const stageB: Vis = (s) => s.uBlendAB.value * (1 - s.uBlendBC.value);
const stageC: Vis = (s) => s.uBlendBC.value;

/** Toggles a group with its stage weight (visible above a small threshold). */
function useStageVisibility(
  ref: React.RefObject<THREE.Group | null>,
  shared: SharedUniforms,
  vis: Vis,
) {
  useFrame(() => {
    if (ref.current) ref.current.visible = vis(shared) > 0.03;
  });
}

// --------------------------------------------------------------------------

function PalmGrove({ shared }: { shared: SharedUniforms }) {
  const { scene } = useGLTF(URLS.palms, false, true);
  const ref = useRef<THREE.Group>(null);
  const rows = useMemo(() => {
    const back = normalize(scene, 52);
    back.position.set(-8, 0, -26);
    const front = normalize(scene, 26);
    front.position.set(19, 0, -6);
    front.scale.x = -1; // mirrored so the rows don't read as copies
    return { back, front };
  }, [scene]);
  useStageVisibility(ref, shared, stageA);
  return (
    <group ref={ref}>
      <primitive object={rows.back} />
      <primitive object={rows.front} />
    </group>
  );
}

function LotusOnTheShore({ shared }: { shared: SharedUniforms }) {
  const { scene } = useGLTF(URLS.lotus, false, true);
  const ref = useRef<THREE.Group>(null);
  const model = useMemo(() => normalize(scene, 3.4), [scene]);
  useStageVisibility(ref, shared, stageA);
  return (
    <group ref={ref} position={[8.2, 0, 2.6]} rotation={[0, -2.4, 0]}>
      <primitive object={model} />
    </group>
  );
}

function FloatingRecordPlayer({ shared }: { shared: SharedUniforms }) {
  const { scene, animations } = useGLTF(URLS.recordPlayer, false, true);
  const ref = useRef<THREE.Group>(null);
  const model = useMemo(() => normalize(scene, 2.6), [scene]);
  const { actions, mixer } = useAnimations(animations, ref);

  useEffect(() => {
    const first = Object.values(actions)[0];
    first?.reset().setLoop(THREE.LoopRepeat, Infinity).play();
  }, [actions]);

  useFrame(() => {
    const t = shared.uTime.value;
    mixer.timeScale = shared.uReduced.value > 0.5 ? 0 : 1;
    if (ref.current) {
      ref.current.visible = stageA(shared) > 0.03;
      ref.current.position.y = 0.9 + Math.sin(t * 0.7) * 0.18;
      ref.current.rotation.y = 0.8 + Math.sin(t * 0.25) * 0.12;
    }
  });

  return (
    <group ref={ref} position={[-7, 0.9, -3.2]}>
      <primitive object={model} />
    </group>
  );
}

function HoverCarFlyby({ shared }: { shared: SharedUniforms }) {
  const { scene } = useGLTF(URLS.hoverCar, false, true);
  const ref = useRef<THREE.Group>(null);
  const model = useMemo(() => normalize(scene, 4.5), [scene]);

  useFrame(() => {
    const t = shared.uTime.value;
    if (!ref.current) return;
    ref.current.visible = stageB(shared) > 0.03;
    const cycle = (t * 7) % 130;
    ref.current.position.set(-62 + cycle, 9 + Math.sin(t * 1.3) * 1.1, -56);
    ref.current.rotation.set(0, Math.PI / 2, Math.sin(t * 1.3) * 0.12);
  });

  return (
    <group ref={ref}>
      <primitive object={model} />
    </group>
  );
}

function SpaceshipCruise({ shared }: { shared: SharedUniforms }) {
  const { scene } = useGLTF(URLS.spaceship, false, true);
  const ref = useRef<THREE.Group>(null);
  const model = useMemo(() => normalize(scene, 9), [scene]);

  useFrame(() => {
    const t = shared.uTime.value;
    if (!ref.current) return;
    ref.current.visible = stageC(shared) > 0.03;
    const cycle = (t * 4.5) % 170;
    ref.current.position.set(75 - cycle, 42 + Math.sin(t * 0.6) * 1.5, -125);
    ref.current.rotation.set(0.05, -Math.PI / 2, Math.sin(t * 0.6) * 0.06);
  });

  return (
    <group ref={ref}>
      <primitive object={model} />
    </group>
  );
}

function DriftingSatellite({ shared }: { shared: SharedUniforms }) {
  const { scene } = useGLTF(URLS.satellite, false, true);
  const ref = useRef<THREE.Group>(null);
  const model = useMemo(() => normalize(scene, 6), [scene]);

  useFrame(() => {
    const t = shared.uTime.value;
    if (!ref.current) return;
    ref.current.visible = stageC(shared) > 0.03;
    ref.current.rotation.set(t * 0.08, t * 0.12, 0);
    ref.current.position.y = 36 + Math.sin(t * 0.3) * 0.8;
  });

  return (
    <group ref={ref} position={[26, 36, -95]}>
      <primitive object={model} />
    </group>
  );
}

function FloatingAstronaut({ shared }: { shared: SharedUniforms }) {
  const { scene } = useGLTF(URLS.astronaut, false, true);
  const ref = useRef<THREE.Group>(null);
  const model = useMemo(() => normalize(scene, 3), [scene]);

  useFrame(() => {
    const t = shared.uTime.value;
    if (!ref.current) return;
    ref.current.visible = stageC(shared) > 0.03;
    ref.current.position.set(
      7 + Math.sin(t * 0.21) * 1.4,
      32.2 + Math.sin(t * 0.34) * 1.1,
      -72,
    );
    ref.current.rotation.set(Math.sin(t * 0.16) * 0.5, t * 0.1, 0.25);
  });

  return (
    <group ref={ref}>
      <primitive object={model} />
    </group>
  );
}

// --------------------------------------------------------------------------

export default function JourneyModels({ shared }: { shared: SharedUniforms }) {
  return (
    <Suspense fallback={null}>
      {/* lighting for the PBR models (shader-material world ignores these) */}
      <ambientLight intensity={0.45} color="#e7c9ff" />
      <hemisphereLight args={['#b636ff', '#1b0b33', 0.8]} />
      <directionalLight position={[6, 18, 24]} intensity={1.6} color="#ff9ad5" />

      {/* stage A — sunset beach */}
      <PalmGrove shared={shared} />
      <LotusOnTheShore shared={shared} />
      <FloatingRecordPlayer shared={shared} />

      {/* stage B — neon city */}
      <HoverCarFlyby shared={shared} />

      {/* stage C — deep space */}
      <DriftingSatellite shared={shared} />
      <SpaceshipCruise shared={shared} />
      <FloatingAstronaut shared={shared} />
    </Suspense>
  );
}
