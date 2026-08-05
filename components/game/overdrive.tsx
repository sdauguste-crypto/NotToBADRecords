"use client";

// OVERDRIVE — Grand Prix of the Silver Surfer multiverse.
// A real circuit racer: five cars off a grid start, two laps around curved
// spline tracks, live position + lap + time, a checkered finish arch, and a
// minimap — three unlockable levels themed to the singles.
//
// Driving model: cars are parameterized by distance along a closed
// CatmullRom spline plus a lateral offset. Corners push the car outward
// (centrifugal drift), so turns must actually be steered. Off the road
// edge the car grinds and loses speed.
//
// Self-contained: mounts only after START ENGINE. Physical key codes +
// touch steering. Post-processing on capable GPUs only.

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Vignette,
} from "@react-three/postprocessing";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";

import { detectTier } from "@/components/scene/quality";

const CAR_URL = "/models/hover-car.glb";
const PALM_URL = "/models/palm-set.glb";
useGLTF.preload(CAR_URL, false, true);
useGLTF.preload(PALM_URL, false, true);

// ---------------------------------------------------------------------------
// Race tunables
// ---------------------------------------------------------------------------
const HALF_W = 5.5;
const LAPS = 2;
const AI_N = 4;
const TOP_SPEED = 46; // m/s
const AI_TOP = [40, 41.5, 43, 44.5];
const STEER_RATE = 8;
const DRIFT_K = 0.055;
const UNLOCK_KEY = "ntb-overdrive-unlocked";

const NEON = ["#5dbcd9", "#ffb84a", "#b06bff", "#f2f6ff"];

type TrackDef = {
  name: string;
  sub: string;
  pts: [number, number][];
  scale: number;
  fog: string;
  sky: string;
  ground: string;
  props: "palms" | "city" | "space";
};

// Hand-authored circuits — sweeping first track, technical second, fast third.
export const TRACKS: TrackDef[] = [
  {
    name: "NO LIGHTS",
    sub: "SUNSET SHORELINE GP",
    pts: [
      [0, 0], [70, -18], [110, -70], [95, -140], [30, -170],
      [-40, -150], [-60, -95], [-110, -70], [-115, -20], [-60, 8],
    ],
    scale: 1.25,
    fog: "#3a1245",
    sky: "#2b0f3d",
    ground: "#160a24",
    props: "palms",
  },
  {
    name: "ROCKIN WITH MY",
    sub: "MIDNIGHT CITY CIRCUIT",
    pts: [
      [0, 0], [55, -10], [80, -50], [55, -85], [80, -125],
      [45, -165], [-15, -150], [-30, -105], [-75, -95], [-95, -45],
      [-55, -8],
    ],
    scale: 1.3,
    fog: "#131f45",
    sky: "#070e24",
    ground: "#090a14",
    props: "city",
  },
  {
    name: "THE PRINCESS",
    sub: "ORBITAL SPEEDWAY",
    pts: [
      [0, 0], [85, -25], [130, -85], [100, -160], [10, -185],
      [-80, -160], [-70, -95], [-125, -60], [-95, -5],
    ],
    scale: 1.35,
    fog: "#06030f",
    sky: "#020208",
    ground: "#05060d",
    props: "space",
  },
];

type HudRefs = {
  pos: HTMLElement | null;
  lap: HTMLElement | null;
  time: HTMLElement | null;
  speed: HTMLElement | null;
  count: HTMLElement | null;
};

// ---------------------------------------------------------------------------
// Procedural textures
// ---------------------------------------------------------------------------
function roadTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0b0b13";
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = "rgba(255,255,255,0.05)";
  for (let i = 0; i < 60; i++) g.fillRect(Math.random() * 128, Math.random() * 256, 2, 2);
  g.fillStyle = "#d9dbe6";
  g.fillRect(61, 20, 6, 90); // center dash
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function checkerTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d")!;
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 16; x++) {
      g.fillStyle = (x + y) % 2 === 0 ? "#f2f2f2" : "#0a0a0a";
      g.fillRect(x * 16, y * 16, 16, 16);
    }
  return new THREE.CanvasTexture(c);
}

function signTexture(text: string, color: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#07070d";
  g.fillRect(0, 0, 512, 128);
  g.font = "bold 58px Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.shadowColor = color;
  g.shadowBlur = 24;
  g.fillStyle = color;
  g.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

function windowTexture(hue: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#04040a";
  g.fillRect(0, 0, 64, 128);
  for (let y = 2; y < 126; y += 7)
    for (let x = 2; x < 62; x += 7)
      if (Math.random() < 0.5) {
        g.fillStyle = Math.random() < 0.75 ? hue : "#f2f6ff";
        g.globalAlpha = 0.5 + Math.random() * 0.5;
        g.fillRect(x, y, 4, 4);
      }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

let glowTex: THREE.CanvasTexture | null = null;
function radialGlowTexture(): THREE.CanvasTexture {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 6, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,0.85)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.3)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

// ---------------------------------------------------------------------------
// Spline helpers
// ---------------------------------------------------------------------------
function buildCurve(def: TrackDef): THREE.CatmullRomCurve3 {
  const pts = def.pts.map(
    ([x, z]) => new THREE.Vector3(x * def.scale, 0, z * def.scale),
  );
  return new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.5);
}

/** Flat ribbon that follows the curve at a lateral offset. */
function ribbonGeometry(
  curve: THREE.CatmullRomCurve3,
  offset: number,
  width: number,
  y: number,
  segments = 420,
  vScale = 0.12,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const L = curve.getLength();
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    const nx = t.z;
    const nz = -t.x;
    const cx = p.x + nx * offset;
    const cz = p.z + nz * offset;
    pos.push(cx + nx * (width / 2), y, cz + nz * (width / 2));
    pos.push(cx - nx * (width / 2), y, cz - nz * (width / 2));
    uv.push(0, u * L * vScale, 1, u * L * vScale);
    if (i < segments) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Low wall following the curve. */
function wallGeometry(
  curve: THREE.CatmullRomCurve3,
  offset: number,
  height: number,
  segments = 420,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    const nx = t.z;
    const nz = -t.x;
    pos.push(p.x + nx * offset, 0, p.z + nz * offset);
    pos.push(p.x + nx * offset, height, p.z + nz * offset);
    if (i < segments) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Signed curvature at u (rad per meter, positive = left turn). */
function curvatureAt(curve: THREE.CatmullRomCurve3, u: number, L: number): number {
  const e = 2 / L;
  const t1 = curve.getTangentAt(((u % 1) + 1) % 1);
  const t2 = curve.getTangentAt((((u + e) % 1) + 1) % 1);
  const a1 = Math.atan2(t1.x, t1.z);
  const a2 = Math.atan2(t2.x, t2.z);
  let d = a2 - a1;
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d / (e * L);
}

// ---------------------------------------------------------------------------
// Neon-dressed car
// ---------------------------------------------------------------------------
function dressCar(base: THREE.Group, glow: string, tail: string): THREE.Group {
  const group = new THREE.Group();
  group.add(base);
  const tailBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.1, 0.05),
    new THREE.MeshBasicMaterial({ color: tail, toneMapped: false }),
  );
  tailBar.position.set(0, 0.48, 1.3);
  group.add(tailBar);
  const under = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 3.4),
    new THREE.MeshBasicMaterial({
      color: glow,
      map: radialGlowTexture(),
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  under.rotation.x = -Math.PI / 2;
  under.position.y = 0.05;
  group.add(under);
  return group;
}

type Racer = {
  sCum: number;
  d: number;
  v: number;
  top: number;
  finished: boolean;
  finishT: number;
  bumpT: number;
  phase: number;
};

type RaceResult = { place: number; time: number; unlocked: boolean };

type WorldProps = {
  trackIndex: number;
  hud: React.MutableRefObject<HudRefs>;
  minimap: React.RefObject<HTMLCanvasElement | null>;
  paused: boolean;
  onFinish: (r: RaceResult) => void;
};

// ---------------------------------------------------------------------------
// Race world
// ---------------------------------------------------------------------------
function RaceWorld({ trackIndex, hud, minimap, paused, onFinish }: WorldProps) {
  const def = TRACKS[trackIndex];
  const { scene: carScene } = useGLTF(CAR_URL, false, true);
  const { scene: palmScene } = useGLTF(PALM_URL, false, true);
  const { camera, scene } = useThree();

  const curve = useMemo(() => buildCurve(def), [def]);
  const L = useMemo(() => curve.getLength(), [curve]);

  // -- race state --
  const st = useRef({
    raceT: -3.6, // countdown
    input: { left: false, right: false, brake: false },
    player: { sCum: 0, d: 1.6, v: 0, top: TOP_SPEED, finished: false, finishT: 0, bumpT: 0, phase: 0 } as Racer,
    ai: Array.from({ length: AI_N }, (_, i) => ({
      sCum: 6 + i * 5,
      d: i % 2 === 0 ? -1.6 : 1.6,
      v: 0,
      top: AI_TOP[i],
      finished: false,
      finishT: 0,
      bumpT: 0,
      phase: rand(0, Math.PI * 2),
    })) as Racer[],
    frame: 0,
    done: false,
  });

  // -- cars --
  const baseBody = useMemo(() => {
    const obj = carScene.clone(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const k = 2.4 / Math.max(size.x, size.y, size.z);
    obj.scale.setScalar(k);
    const box2 = new THREE.Box3().setFromObject(obj);
    obj.position.set(
      -(box2.min.x + box2.max.x) / 2,
      -box2.min.y + 0.25,
      -(box2.min.z + box2.max.z) / 2,
    );
    obj.rotation.y = Math.PI;
    obj.traverse((n) => {
      if (n instanceof THREE.Mesh && n.material) {
        const m = n.material as THREE.MeshStandardMaterial;
        m.envMapIntensity = 1.4;
      }
    });
    return obj;
  }, [carScene]);

  const playerCar = useMemo(() => dressCar(baseBody.clone(true), "#ff2e88", "#ff2e88"), [baseBody]);
  const aiCars = useMemo(
    () =>
      Array.from({ length: AI_N }, (_, i) => {
        const b = baseBody.clone(true);
        b.traverse((n) => {
          if (n instanceof THREE.Mesh && n.material)
            n.material = (n.material as THREE.MeshStandardMaterial).clone();
        });
        return dressCar(b, NEON[i], i % 2 === 0 ? "#ff3b30" : NEON[i]);
      }),
    [baseBody],
  );
  const carRefs = useRef<(THREE.Group | null)[]>([]);

  // -- track meshes --
  const roadTex = useMemo(() => {
    const t = roadTexture();
    t.repeat.set(1, 1);
    return t;
  }, []);
  const roadGeo = useMemo(() => ribbonGeometry(curve, 0, HALF_W * 2, 0, 480, 0.1), [curve]);
  const edgeL = useMemo(() => ribbonGeometry(curve, HALF_W - 0.2, 0.3, 0.02), [curve]);
  const edgeR = useMemo(() => ribbonGeometry(curve, -(HALF_W - 0.2), 0.3, 0.02), [curve]);
  const wallLGeo = useMemo(() => wallGeometry(curve, HALF_W + 1.6, 0.9), [curve]);
  const wallRGeo = useMemo(() => wallGeometry(curve, -(HALF_W + 1.6), 0.9), [curve]);
  const wallTopL = useMemo(() => ribbonGeometry(curve, HALF_W + 1.6, 0.25, 0.92), [curve]);
  const wallTopR = useMemo(() => ribbonGeometry(curve, -(HALF_W + 1.6), 0.25, 0.92), [curve]);

  // -- props along the track --
  const winTex = useMemo(() => [windowTexture("#ffb46a"), windowTexture("#ff2e88"), windowTexture("#5dbcd9")], []);
  const props = useMemo(() => {
    const list: { pos: THREE.Vector3; rotY: number; kind: number; s: number }[] = [];
    const N = def.props === "city" ? 44 : 34;
    for (let i = 0; i < N; i++) {
      const u = i / N;
      const p = curve.getPointAt(u);
      const t = curve.getTangentAt(u);
      const nx = t.z;
      const nz = -t.x;
      const side = i % 2 === 0 ? 1 : -1;
      const off = side * rand(HALF_W + 6, HALF_W + 16);
      list.push({
        pos: new THREE.Vector3(p.x + nx * off, 0, p.z + nz * off),
        rotY: Math.atan2(t.x, t.z),
        kind: i % 3,
        s: rand(0.8, 1.5),
      });
    }
    return list;
  }, [curve, def.props]);

  const palms = useMemo(() => {
    if (def.props !== "palms") return [];
    const base = palmScene.clone(true);
    const box = new THREE.Box3().setFromObject(base);
    const size = box.getSize(new THREE.Vector3());
    const k = 14 / Math.max(size.x, size.y, size.z);
    return props.map((pr) => {
      const o = base.clone(true);
      o.scale.setScalar(k * pr.s * 0.5);
      o.position.copy(pr.pos);
      o.rotation.y = pr.rotY;
      return o;
    });
  }, [def.props, palmScene, props]);

  // -- billboards --
  const billboardTex = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return [
      loader.load("/logo-crest.webp"),
      signTexture("WE REALLY OUT HERE", "#ff2e88"),
      loader.load("/covers/the-princess.webp"),
      signTexture("NOT TO B.A.D", "#5dbcd9"),
      loader.load("/covers/no-lights.webp"),
      signTexture("NOU PA PI MAL", "#ffb84a"),
    ];
  }, []);
  const billboards = useMemo(() => {
    const list: { pos: THREE.Vector3; rotY: number; tex: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const u = (i + 0.5) / 6;
      const p = curve.getPointAt(u);
      const t = curve.getTangentAt(u);
      const nx = t.z;
      const nz = -t.x;
      const side = i % 2 === 0 ? 1 : -1;
      list.push({
        pos: new THREE.Vector3(p.x + nx * side * (HALF_W + 5), 8, p.z + nz * side * (HALF_W + 5)),
        rotY: Math.atan2(t.x, t.z) + (side > 0 ? -0.5 : 0.5),
        tex: i,
      });
    }
    return list;
  }, [curve]);

  // -- finish arch --
  const checker = useMemo(() => checkerTexture(), []);
  const arch = useMemo(() => {
    const p = curve.getPointAt(0);
    const t = curve.getTangentAt(0);
    return { pos: p, rotY: Math.atan2(t.x, t.z) };
  }, [curve]);

  const starGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = def.props === "space" ? 900 : 300;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = rand(-400, 400);
      pos[i * 3 + 1] = rand(10, 160);
      pos[i * 3 + 2] = rand(-400, 400);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [def.props]);

  useEffect(() => {
    scene.fog = new THREE.Fog(new THREE.Color(def.fog), 40, 260);
    scene.background = new THREE.Color(def.sky);
    return () => {
      scene.fog = null;
      scene.background = null;
    };
  }, [scene, def]);

  // -- input --
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const inp = st.current.input;
      switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
          inp.left = true;
          e.preventDefault();
          break;
        case "ArrowRight":
        case "KeyD":
          inp.right = true;
          e.preventDefault();
          break;
        case "ArrowDown":
        case "KeyS":
        case "Space":
          inp.brake = true;
          e.preventDefault();
          break;
      }
    };
    const up = (e: KeyboardEvent) => {
      const inp = st.current.input;
      if (["ArrowLeft", "KeyA"].includes(e.code)) inp.left = false;
      if (["ArrowRight", "KeyD"].includes(e.code)) inp.right = false;
      if (["ArrowDown", "KeyS", "Space"].includes(e.code)) inp.brake = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  useEffect(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("[data-overdrive] canvas");
    if (!canvas) return;
    const inp = st.current.input;
    const downH = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const fx = (e.clientX - rect.left) / rect.width;
      if (fx < 0.45) inp.left = true;
      else if (fx > 0.55) inp.right = true;
      else inp.brake = true;
    };
    const upH = () => {
      inp.left = inp.right = inp.brake = false;
    };
    canvas.addEventListener("pointerdown", downH);
    window.addEventListener("pointerup", upH);
    return () => {
      canvas.removeEventListener("pointerdown", downH);
      window.removeEventListener("pointerup", upH);
    };
  }, []);

  // minimap path cache
  const mapPts = useMemo(() => {
    const pts: [number, number][] = [];
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (let i = 0; i <= 120; i++) {
      const p = curve.getPointAt(i / 120);
      pts.push([p.x, p.z]);
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
    }
    const span = Math.max(maxX - minX, maxZ - minZ);
    return { pts, minX, minZ, span };
  }, [curve]);

  const placeAt = (r: Racer, obj: THREE.Group, yaw: number) => {
    const u = ((r.sCum % L) + L) % L / L;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    const nx = t.z;
    const nz = -t.x;
    obj.position.set(p.x + nx * r.d, 0.14, p.z + nz * r.d);
    obj.rotation.y = Math.atan2(t.x, t.z) + Math.PI + yaw;
  };

  // ---------------------------------------------------------------------
  // Loop
  // ---------------------------------------------------------------------
  useFrame((_, rawDelta) => {
    const s = st.current;
    if (paused || s.done) return;
    const delta = Math.min(rawDelta, 0.05);
    s.frame++;
    s.raceT += delta;
    const running = s.raceT > 0;

    // countdown HUD
    if (hud.current.count) {
      const c = hud.current.count;
      if (s.raceT < 0) {
        const n = Math.min(3, Math.ceil(-s.raceT));
        if (c.textContent !== String(n)) c.textContent = String(n);
        c.style.opacity = "1";
      } else if (s.raceT < 1) {
        if (c.textContent !== "GO!") c.textContent = "GO!";
      } else if (c.style.opacity !== "0") {
        c.style.opacity = "0";
      }
    }

    const P = s.player;
    const u = (((P.sCum % L) + L) % L) / L;
    const kappa = curvatureAt(curve, u, L);

    if (running && !P.finished) {
      // throttle: auto-accelerate, brake on demand
      const target = s.input.brake ? P.top * 0.45 : P.top;
      const accel = s.input.brake ? 30 : 9;
      P.v += (target - P.v) * Math.min(1, delta * (accel / Math.max(P.v, 8)) * 4);
      // corner drift pushes outward; steering counters
      P.d += -kappa * P.v * P.v * DRIFT_K * delta;
      if (s.input.left) P.d += STEER_RATE * delta;
      if (s.input.right) P.d -= STEER_RATE * delta;
      // off-road grind
      if (Math.abs(P.d) > HALF_W - 0.6) {
        P.v *= 1 - 1.6 * delta;
        P.d = THREE.MathUtils.clamp(P.d, -(HALF_W + 1.0), HALF_W + 1.0);
      }
      P.bumpT = Math.max(0, P.bumpT - delta);
      P.sCum += P.v * delta;
      // lap / finish
      if (P.sCum >= LAPS * L) {
        P.finished = true;
        P.finishT = s.raceT;
      }
    }

    // AI
    s.ai.forEach((A) => {
      if (!running || A.finished) return;
      const au = (((A.sCum % L) + L) % L) / L;
      const ak = curvatureAt(curve, au, L);
      // rubber band toward the player so races stay close
      const band = THREE.MathUtils.clamp((P.sCum - A.sCum) / 260, -0.05, 0.09);
      const target = A.top * (1 + band) * (1 - Math.min(0.5, Math.abs(ak) * 26));
      A.v += (target - A.v) * Math.min(1, delta * 1.6);
      // racing line: hug the inside of corners
      const wantD = THREE.MathUtils.clamp(ak * 150, -(HALF_W - 1.4), HALF_W - 1.4)
        + Math.sin(A.sCum * 0.015 + A.phase) * 0.7;
      A.d += (wantD - A.d) * Math.min(1, delta * 1.4);
      A.sCum += A.v * delta;
      if (A.sCum >= LAPS * L) {
        A.finished = true;
        A.finishT = s.raceT;
      }
      // bump: contact costs the player speed
      const ds = A.sCum - P.sCum;
      if (!P.finished && P.bumpT <= 0 && Math.abs(ds) < 2.3 && Math.abs(A.d - P.d) < 1.7) {
        P.v *= 0.62;
        P.bumpT = 1;
        P.d += P.d > A.d ? 0.9 : -0.9;
      }
    });

    // player finished -> results (rank at the moment of crossing)
    if (P.finished && !s.done) {
      s.done = true;
      const ahead = s.ai.filter((A) => A.finished && A.finishT <= P.finishT).length;
      const place = ahead + 1;
      let unlocked = false;
      if (place <= 3 && trackIndex < TRACKS.length - 1) {
        try {
          const cur = Number(localStorage.getItem(UNLOCK_KEY) || 0);
          if (trackIndex + 1 > cur) {
            localStorage.setItem(UNLOCK_KEY, String(trackIndex + 1));
            unlocked = true;
          }
        } catch {
          /* storage unavailable */
        }
      }
      onFinish({ place, time: P.finishT, unlocked });
      return;
    }

    // place cars
    const pObj = carRefs.current[0];
    if (pObj) {
      const steer = (s.input.left ? 1 : 0) - (s.input.right ? 1 : 0);
      placeAt(P, pObj, steer * 0.16 + (P.bumpT > 0 ? Math.sin(s.raceT * 40) * 0.05 : 0));
    }
    s.ai.forEach((A, i) => {
      const o = carRefs.current[i + 1];
      if (o) placeAt(A, o, 0);
    });

    // chase camera along the spline
    const camS = P.sCum - 7.5;
    const cu = (((camS % L) + L) % L) / L;
    const cp = curve.getPointAt(cu);
    const ct = curve.getTangentAt(cu);
    const cnx = ct.z;
    const cnz = -ct.x;
    camera.position.set(
      cp.x + cnx * P.d * 0.6,
      3.4 + (P.bumpT > 0 ? Math.sin(s.raceT * 50) * 0.12 : 0),
      cp.z + cnz * P.d * 0.6,
    );
    const lu = ((((P.sCum + 6) % L) + L) % L) / L;
    const lp = curve.getPointAt(lu);
    camera.lookAt(lp.x, 1.3, lp.z);
    const cam = camera as THREE.PerspectiveCamera;
    const wantFov = 60 + (P.v / TOP_SPEED) * 14;
    if (Math.abs(cam.fov - wantFov) > 0.1) {
      cam.fov += (wantFov - cam.fov) * delta * 3;
      cam.updateProjectionMatrix();
    }

    // HUD
    if (s.frame % 5 === 0) {
      const rank =
        1 + s.ai.filter((A) => A.sCum > P.sCum || (A.finished && !P.finished)).length;
      if (hud.current.pos) hud.current.pos.textContent = `P${rank}/5`;
      if (hud.current.lap)
        hud.current.lap.textContent = `LAP ${Math.min(LAPS, 1 + Math.floor(P.sCum / L))}/${LAPS}`;
      if (hud.current.speed) hud.current.speed.textContent = `${Math.round(P.v * 2.2)} MPH`;
      if (hud.current.time && running) {
        const t = Math.max(0, s.raceT);
        const m = Math.floor(t / 60);
        const sec = (t % 60).toFixed(1).padStart(4, "0");
        hud.current.time.textContent = `${m}:${sec}`;
      }
    }

    // minimap
    if (s.frame % 8 === 0 && minimap.current) {
      const ctx = minimap.current.getContext("2d");
      if (ctx) {
        const W = minimap.current.width;
        const pad = 10;
        const k = (W - pad * 2) / mapPts.span;
        ctx.clearRect(0, 0, W, W);
        ctx.strokeStyle = "rgba(235,238,241,0.55)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        mapPts.pts.forEach(([x, z], i) => {
          const mx = pad + (x - mapPts.minX) * k;
          const my = pad + (z - mapPts.minZ) * k;
          if (i === 0) ctx.moveTo(mx, my);
          else ctx.lineTo(mx, my);
        });
        ctx.closePath();
        ctx.stroke();
        const dot = (r: Racer, color: string, size: number) => {
          const du = (((r.sCum % L) + L) % L) / L;
          const p = curve.getPointAt(du);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(pad + (p.x - mapPts.minX) * k, pad + (p.z - mapPts.minZ) * k, size, 0, Math.PI * 2);
          ctx.fill();
        };
        s.ai.forEach((A, i) => dot(A, NEON[i], 3));
        dot(P, "#ff2e88", 4.5);
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.55} color="#9db6ff" />
      <hemisphereLight args={["#5dbcd9", "#1a0b22", 0.5]} />
      <directionalLight position={[60, 90, 40]} intensity={1.0} color="#ffd6f2" />
      <Environment files="/env/sunset-env.hdr" />

      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, -90]}>
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial color={def.ground} roughness={0.9} metalness={0.1} />
      </mesh>

      {/* road + edges + walls */}
      <mesh geometry={roadGeo}>
        <meshStandardMaterial map={roadTex} color="#c9c9d6" metalness={0.55} roughness={0.4} envMapIntensity={0.35} />
      </mesh>
      <mesh geometry={edgeL}>
        <meshBasicMaterial color="#ff2e88" toneMapped={false} />
      </mesh>
      <mesh geometry={edgeR}>
        <meshBasicMaterial color="#5dbcd9" toneMapped={false} />
      </mesh>
      {[wallLGeo, wallRGeo].map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#0d0d16" metalness={0.7} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {[wallTopL, wallTopR].map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color={i === 0 ? "#ff2e88" : "#5dbcd9"} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* cars */}
      <group ref={(el) => void (carRefs.current[0] = el)}>
        <primitive object={playerCar} />
      </group>
      {aiCars.map((c, i) => (
        <group key={i} ref={(el) => void (carRefs.current[i + 1] = el)}>
          <primitive object={c} />
        </group>
      ))}

      {/* props */}
      {def.props === "palms" && palms.map((p, i) => <primitive key={i} object={p} />)}
      {def.props === "city" &&
        props.map((pr, i) => (
          <mesh key={i} position={[pr.pos.x, 9 * pr.s, pr.pos.z]} rotation={[0, pr.rotY, 0]}>
            <boxGeometry args={[7 * pr.s, 18 * pr.s, 7 * pr.s]} />
            <meshStandardMaterial
              color="#060609"
              emissive="#ffffff"
              emissiveMap={winTex[pr.kind]}
              emissiveIntensity={1.3}
            />
          </mesh>
        ))}
      {def.props === "space" &&
        props.map((pr, i) => (
          <group key={i} position={[pr.pos.x, 0, pr.pos.z]}>
            <mesh position={[0, 4 * pr.s, 0]}>
              <boxGeometry args={[0.5, 8 * pr.s, 0.5]} />
              <meshStandardMaterial color="#101018" metalness={0.8} roughness={0.4} />
            </mesh>
            <mesh position={[0, 8 * pr.s, 0]}>
              <sphereGeometry args={[0.55, 12, 12]} />
              <meshBasicMaterial color={NEON[i % NEON.length]} toneMapped={false} />
            </mesh>
          </group>
        ))}

      {/* billboards */}
      {billboards.map((b, i) => (
        <mesh key={i} position={b.pos} rotation={[0, b.rotY, 0]}>
          <planeGeometry args={[10, 6.6]} />
          <meshBasicMaterial map={billboardTex[b.tex % billboardTex.length]} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* finish arch */}
      <group position={arch.pos} rotation={[0, arch.rotY, 0]}>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * (HALF_W + 1.2), 3, 0]}>
            <boxGeometry args={[0.8, 6, 0.8]} />
            <meshStandardMaterial color="#101018" metalness={0.8} roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, 6.4, 0]}>
          <boxGeometry args={[2 * HALF_W + 4, 1.5, 1]} />
          <meshStandardMaterial color="#101018" metalness={0.8} roughness={0.4} />
        </mesh>
        <mesh position={[0, 6.4, 0.55]}>
          <planeGeometry args={[2 * HALF_W + 3, 1.1]} />
          <meshBasicMaterial map={checker} toneMapped={false} />
        </mesh>
        <mesh position={[0, 6.4, -0.55]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[2 * HALF_W + 3, 1.1]} />
          <meshBasicMaterial map={checker} toneMapped={false} />
        </mesh>
        {/* checkered strip on the tarmac */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <planeGeometry args={[2 * HALF_W, 2.4]} />
          <meshBasicMaterial map={checker} toneMapped={false} />
        </mesh>
      </group>

      <points geometry={starGeo}>
        <pointsMaterial color="#cfeaff" size={0.5} transparent opacity={def.props === "space" ? 0.95 : 0.4} depthWrite={false} />
      </points>
    </>
  );
}

// ---------------------------------------------------------------------------
// Shell: track select -> race -> results
// ---------------------------------------------------------------------------
export default function OverdriveGame() {
  const hud = useRef<HudRefs>({ pos: null, lap: null, time: null, speed: null, count: null });
  const minimap = useRef<HTMLCanvasElement | null>(null);
  const [screen, setScreen] = useState<"select" | "race">("select");
  const [trackIndex, setTrackIndex] = useState(0);
  const [raceKey, setRaceKey] = useState(0);
  const [result, setResult] = useState<RaceResult | null>(null);
  const [paused, setPaused] = useState(false);
  const [unlockedMax, setUnlockedMax] = useState(0);
  const tier = useMemo(() => detectTier(), []);

  useEffect(() => {
    try {
      setUnlockedMax(Number(localStorage.getItem(UNLOCK_KEY) || 0));
    } catch {
      /* storage unavailable */
    }
  }, [result]);

  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") setPaused((p) => !p);
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const startRace = (i: number) => {
    setTrackIndex(i);
    setResult(null);
    setRaceKey((k) => k + 1);
    setScreen("race");
  };

  const fmt = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;

  return (
    <div data-overdrive className="relative h-full w-full overflow-hidden rounded-xl bg-[#05030c]">
      {screen === "select" ? (
        <div className="scanlines absolute inset-0 flex flex-col items-center justify-center gap-6 bg-[radial-gradient(ellipse_at_50%_120%,rgba(180,28,37,0.25),transparent_60%),linear-gradient(180deg,#0b0716,#05030c)] p-6">
          <p className="font-body text-[0.6rem] tracking-[0.45em] text-[#5dbcd9]">SELECT CIRCUIT</p>
          <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-3">
            {TRACKS.map((t, i) => {
              const locked = i > unlockedMax;
              return (
                <button
                  key={t.name}
                  type="button"
                  disabled={locked}
                  onClick={() => startRace(i)}
                  className={
                    "group rounded-xl border p-4 text-left transition " +
                    (locked
                      ? "cursor-not-allowed border-white/10 opacity-45"
                      : "border-blood/50 hover:border-blood hover:bg-blood/10")
                  }
                >
                  <p className="font-body text-[0.55rem] tracking-[0.3em] text-[#ebeef1]/50">
                    LEVEL {i + 1} {locked ? "· LOCKED" : ""}
                  </p>
                  <p className="font-display mt-1 text-sm font-bold text-[#ebeef1]">{t.name}</p>
                  <p className="font-body mt-1 text-[0.6rem] tracking-[0.15em] text-[#5dbcd9]">{t.sub}</p>
                  <p className="font-body mt-3 text-[0.6rem] tracking-[0.2em] text-[#ebeef1]/45">
                    {locked ? "FINISH TOP 3 TO UNLOCK" : "2 LAPS · 4 RIVALS"}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="font-body text-[0.6rem] tracking-[0.25em] text-[#ebeef1]/40">
            ◀ ▶ STEER · ▼ BRAKE · AUTO THROTTLE · ESC PAUSE
          </p>
        </div>
      ) : (
        <>
          <Canvas
            key={raceKey}
            dpr={[1, 1.5]}
            gl={{ antialias: tier === "high", powerPreference: "high-performance" }}
            camera={{ fov: 60, near: 0.1, far: 500, position: [0, 3.4, 8] }}
          >
            <Suspense fallback={null}>
              <RaceWorld
                trackIndex={trackIndex}
                hud={hud}
                minimap={minimap}
                paused={paused || result !== null}
                onFinish={setResult}
              />
              {tier === "high" && (
                <EffectComposer>
                  <Bloom intensity={0.75} luminanceThreshold={0.45} luminanceSmoothing={0.3} mipmapBlur />
                  <ChromaticAberration offset={new THREE.Vector2(0.0007, 0.0005)} />
                  <Vignette eskil={false} offset={0.2} darkness={0.65} />
                </EffectComposer>
              )}
            </Suspense>
          </Canvas>

          {/* racing HUD */}
          <div className="pointer-events-none absolute inset-0 p-4 font-body">
            <div className="flex items-start justify-between text-[#ebeef1]">
              <p ref={(el) => void (hud.current.speed = el)} className="text-xl font-bold tracking-widest">0 MPH</p>
              <p ref={(el) => void (hud.current.pos = el)} className="text-2xl font-black tracking-[0.2em] text-blood">P5/5</p>
              <div className="text-right">
                <p ref={(el) => void (hud.current.lap = el)} className="text-sm font-bold tracking-[0.25em]">LAP 1/{LAPS}</p>
                <p ref={(el) => void (hud.current.time = el)} className="mt-1 text-xs tracking-[0.25em] text-[#ebeef1]/70">0:00.0</p>
              </div>
            </div>
            <p
              ref={(el) => void (hud.current.count = el)}
              className="font-display absolute left-1/2 top-1/3 -translate-x-1/2 text-7xl font-black text-[#ebeef1] transition-opacity duration-300 [text-shadow:0_0_30px_rgba(180,28,37,.8)]"
            >
              3
            </p>
            <canvas
              ref={minimap}
              width={140}
              height={140}
              className="absolute bottom-4 right-4 rounded-lg bg-black/45"
            />
            <p className="absolute bottom-4 left-4 text-[0.6rem] tracking-[0.2em] text-[#ebeef1]/45">
              ◀ ▶ STEER · ▼ BRAKE · ESC PAUSE
            </p>
          </div>

          {paused && !result ? (
            <div className="absolute inset-0 grid place-items-center bg-black/60">
              <p className="font-display text-2xl tracking-[0.3em] text-[#ebeef1]">PAUSED</p>
            </div>
          ) : null}

          {result ? (
            <div className="absolute inset-0 grid place-items-center bg-black/80">
              <div className="text-center">
                <p className="font-body text-[0.6rem] tracking-[0.4em] text-[#5dbcd9]">
                  {TRACKS[trackIndex].name} — RACE COMPLETE
                </p>
                <p className="font-display text-neon-pink mt-3 text-5xl font-black md:text-7xl">
                  P{result.place}
                </p>
                <p className="font-body mt-3 text-sm tracking-[0.25em] text-[#ebeef1]">
                  TIME {fmt(result.time)}
                </p>
                {result.unlocked ? (
                  <p className="font-body mt-2 animate-blink text-xs tracking-[0.3em] text-[#ffb84a] motion-reduce:animate-none">
                    NEW CIRCUIT UNLOCKED
                  </p>
                ) : null}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => startRace(trackIndex)}
                    className="btn-blood font-body rounded-full px-7 py-3 text-xs font-bold tracking-[0.25em]"
                  >
                    ▸ RETRY
                  </button>
                  {result.place <= 3 && trackIndex < TRACKS.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => startRace(trackIndex + 1)}
                      className="btn-blood font-body rounded-full px-7 py-3 text-xs font-bold tracking-[0.25em]"
                    >
                      ▸ NEXT CIRCUIT
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setResult(null);
                      setScreen("select");
                    }}
                    className="font-body rounded-full border border-white/20 px-7 py-3 text-xs font-bold tracking-[0.25em] text-[#ebeef1]/80 transition hover:border-blood hover:text-blood"
                  >
                    CIRCUITS
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
