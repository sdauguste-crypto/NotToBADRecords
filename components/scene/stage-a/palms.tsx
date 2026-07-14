'use client';

// Neon-rimmed palm silhouettes. The silhouette is drawn once into a 256x512
// offscreen canvas (near-black ink + pink glow re-stroke), shared as one
// CanvasTexture across 7 billboarded planes with pointer parallax.

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { journeyState } from '@/lib/journey-state';

import { HEX, type SharedUniforms } from '../journey-config';

type PalmPlacement = {
  x: number;
  z: number;
  height: number;
  flip: boolean;
  /** Pointer parallax multiplier (nearer palms move more). */
  parallax: number;
};

const PLACEMENTS: PalmPlacement[] = [
  { x: -13, z: 2, height: 9, flip: false, parallax: 1.0 },
  { x: -9, z: 4, height: 11, flip: true, parallax: 1.2 },
  { x: -5, z: -2, height: 7, flip: false, parallax: 0.7 },
  { x: 5, z: 3, height: 10, flip: true, parallax: 1.1 },
  { x: 8, z: -4, height: 6, flip: false, parallax: 0.55 },
  { x: 12, z: -8, height: 8, flip: true, parallax: 0.35 },
  { x: 15, z: 0, height: 9.5, flip: false, parallax: 0.9 },
];

const INK = HEX.voidDeep; // #05030a
const CROWN_X = 172;
const CROWN_Y = 148;

type Quad = { from: [number, number]; cp: [number, number]; to: [number, number] };

const TRUNK_STROKES: Array<Quad & { width: number }> = [
  { from: [116, 512], cp: [148, 320], to: [166, 152], width: 10 },
  { from: [123, 512], cp: [153, 320], to: [169, 153], width: 8 },
  { from: [130, 512], cp: [158, 322], to: [172, 154], width: 6 },
  { from: [137, 512], cp: [163, 324], to: [175, 156], width: 4 },
];

function frondGeometry(index: number): {
  tip: [number, number];
  mid: [number, number];
} {
  // Fan the 8 fronds across the top, arching up then drooping down.
  const angle = -Math.PI * (0.04 + (index / 7) * 0.92);
  const length = 82 + (index % 3) * 16;
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const tip: [number, number] = [
    CROWN_X + dirX * length,
    CROWN_Y + dirY * length * 0.55 + 40,
  ];
  const mid: [number, number] = [
    CROWN_X + dirX * length * 0.55,
    CROWN_Y + dirY * length * 0.55 - 16,
  ];
  return { tip, mid };
}

function drawPalmCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, 256, 512);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Trunk: offset quadratic beziers, lineWidth tapering 10 -> 4.
  ctx.strokeStyle = INK;
  for (const stroke of TRUNK_STROKES) {
    ctx.lineWidth = stroke.width;
    ctx.beginPath();
    ctx.moveTo(stroke.from[0], stroke.from[1]);
    ctx.quadraticCurveTo(stroke.cp[0], stroke.cp[1], stroke.to[0], stroke.to[1]);
    ctx.stroke();
  }

  // Crown: 8 tapered drooping fronds (filled bezier shapes).
  ctx.fillStyle = INK;
  for (let i = 0; i < 8; i++) {
    const { tip, mid } = frondGeometry(i);
    ctx.beginPath();
    ctx.moveTo(CROWN_X, CROWN_Y);
    ctx.quadraticCurveTo(mid[0], mid[1] - 7, tip[0], tip[1]);
    ctx.quadraticCurveTo(mid[0] + 6, mid[1] + 11, CROWN_X, CROWN_Y + 7);
    ctx.closePath();
    ctx.fill();
  }

  // Coconuts.
  for (const [cx, cy, r] of [
    [162, 160, 7],
    [180, 164, 6],
    [171, 171, 6],
  ] as const) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Neon rim: re-stroke outlines with pink glow.
  ctx.save();
  ctx.shadowColor = HEX.sunsetPink;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = 'rgba(255, 46, 136, 0.85)';
  ctx.lineWidth = 1.5;
  // Trunk edge.
  ctx.beginPath();
  ctx.moveTo(116, 512);
  ctx.quadraticCurveTo(148, 320, 166, 152);
  ctx.stroke();
  // Frond spines.
  for (let i = 0; i < 8; i++) {
    const { tip, mid } = frondGeometry(i);
    ctx.beginPath();
    ctx.moveTo(CROWN_X, CROWN_Y);
    ctx.quadraticCurveTo(mid[0], mid[1] - 7, tip[0], tip[1]);
    ctx.stroke();
  }
  ctx.restore();

  return canvas;
}

export default function Palms({ shared }: { shared: SharedUniforms }) {
  const groupRef = useRef<THREE.Group>(null);

  const { texture, material } = useMemo(() => {
    const tex = new THREE.CanvasTexture(drawPalmCanvas());
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    // Shared by all 7 planes; opacity is identical across the group, so one
    // material suffices.
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.02,
      depthWrite: true,
      side: THREE.DoubleSide,
      fog: true,
    });
    return { texture: tex, material: mat };
  }, []);

  useEffect(() => {
    return () => {
      texture.dispose();
      material.dispose();
    };
  }, [texture, material]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const blendAB = shared.uBlendAB.value;
    const blendBC = shared.uBlendBC.value;
    const opacity = ((1 - blendAB) * 1.0 + blendAB * 0.3) * (1 - blendBC);
    material.opacity = opacity;
    group.visible = opacity > 0.005;

    // Pointer parallax per palm — poll the contract directly (read-only).
    const pointerX = journeyState.pointerX;
    group.children.forEach((child, index) => {
      const placement = PLACEMENTS[index];
      if (placement) {
        child.position.x = placement.x + pointerX * placement.parallax;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {PLACEMENTS.map((palm, index) => {
        const width = palm.height * 0.5; // texture aspect 256:512
        return (
          <mesh
            key={index}
            material={material}
            position={[palm.x, palm.height / 2, palm.z]}
            scale={[palm.flip ? -width : width, palm.height, 1]}
          >
            <planeGeometry args={[1, 1]} />
          </mesh>
        );
      })}
    </group>
  );
}
