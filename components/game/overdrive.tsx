"use client";

// OVERDRIVE — Silver Surfer Run.
// Endless chase-cam lane racer through the label's lore, art-directed to the
// reference footage: wet obsidian road with mirrored neon, dense sign-lit
// canyon walls, amber overpass gantries, blooming taillights and underglow.
//
// Self-contained: mounts only after START ENGINE. Physical key codes + touch
// zones. Post-processing runs on capable GPUs and steps down gracefully.

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
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";

import { detectTier } from "@/components/scene/quality";

const CAR_URL = "/models/hover-car.glb";
useGLTF.preload(CAR_URL, false, true);

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------
const LANES = [-3, 0, 3];
const ROAD_W = 11;
const BASE_SPEED = 30;
const MAX_SPEED = 66;
const TRAFFIC_N = 7;
const RECORD_N = 5;
const BUILDING_N = 30; // per side
const B_SPACING = 12;
const GANTRY_N = 5;
const STREAK_N = 16;
const STAGE_2_AT = 2600;
const STAGE_3_AT = 6200;
const BEST_KEY = "ntb-overdrive-best";

const NEON = ["#5dbcd9", "#ffb84a", "#ff2e88", "#b06bff"];

export const STAGES = [
  { name: "NO LIGHTS", fog: "#3a1245", sky: "#2b0f3d" },
  { name: "ROCKIN WITH MY", fog: "#131f45", sky: "#080f26" },
  { name: "THE PRINCESS", fog: "#05030c", sky: "#020208" },
] as const;

type Phase = "running" | "over";

export type HudRefs = {
  score: HTMLElement | null;
  speed: HTMLElement | null;
  stage: HTMLElement | null;
  shields: HTMLElement | null;
};

type GameProps = {
  hud: React.MutableRefObject<HudRefs>;
  onGameOver: (score: number, best: number) => void;
  paused: boolean;
  runId: number;
};

// ---------------------------------------------------------------------------
// Procedural textures (in the locked style formula)
// ---------------------------------------------------------------------------
function signTexture(text: string, color: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#07070d";
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = color;
  g.lineWidth = 10;
  g.strokeRect(14, 14, 484, 228);
  g.font = "bold 64px Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.shadowColor = color;
  g.shadowBlur = 26;
  g.fillStyle = color;
  const words = text.split(" ");
  if (words.length > 2) {
    const mid = Math.ceil(words.length / 2);
    g.fillText(words.slice(0, mid).join(" "), 256, 92);
    g.fillText(words.slice(mid).join(" "), 256, 172);
  } else {
    g.fillText(text, 256, 132);
  }
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
  for (let y = 2; y < 126; y += 7) {
    for (let x = 2; x < 62; x += 7) {
      if (Math.random() < 0.55) {
        g.fillStyle = Math.random() < 0.75 ? hue : "#f2f6ff";
        g.globalAlpha = 0.5 + Math.random() * 0.5;
        g.fillRect(x, y, 4, 4);
      }
    }
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
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pickLane = () => (Math.random() * 3) | 0;

// ---------------------------------------------------------------------------
// Neon-dressed car: body + taillight bar + underglow + wheel glows
// ---------------------------------------------------------------------------
function dressCar(base: THREE.Group, glow: string, tail: string): THREE.Group {
  const group = new THREE.Group();
  group.add(base);

  const tailMat = new THREE.MeshBasicMaterial({ color: tail, toneMapped: false });
  const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.1, 0.05), tailMat);
  tailBar.position.set(0, 0.48, 1.3);
  group.add(tailBar);

  const glowMat = new THREE.MeshBasicMaterial({
    color: glow,
    map: radialGlowTexture(),
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const under = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 3.4), glowMat);
  under.rotation.x = -Math.PI / 2;
  under.position.y = 0.04;
  group.add(under);

  // amber wheel glows, the reference car's signature
  const wheelMat = new THREE.MeshBasicMaterial({
    color: "#ffb84a",
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (const [wx, wz] of [
    [-0.52, 0.95],
    [0.52, 0.95],
    [-0.52, -0.95],
    [0.52, -0.95],
  ]) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), wheelMat);
    disc.rotation.y = Math.PI / 2;
    disc.position.set(wx, 0.38, wz);
    group.add(disc);
  }
  return group;
}

// ---------------------------------------------------------------------------
// The world
// ---------------------------------------------------------------------------
function GameWorld({ hud, onGameOver, paused, runId }: GameProps) {
  const { scene: carScene } = useGLTF(CAR_URL, false, true);
  const { camera, scene } = useThree();

  const st = useRef({
    dist: 0,
    speed: BASE_SPEED,
    lane: 1,
    x: 0,
    shields: 3,
    score: 0,
    boostT: 0,
    brake: false,
    boost: false,
    invulnT: 0,
    stage: 0,
    phase: "running" as Phase,
    shakeT: 0,
    frame: 0,
  });

  useEffect(() => {
    const s = st.current;
    s.dist = 0;
    s.speed = BASE_SPEED;
    s.lane = 1;
    s.shields = 3;
    s.score = 0;
    s.boostT = 0;
    s.invulnT = 0;
    s.stage = 0;
    s.phase = "running";
    trafficRef.current.forEach((t, i) => {
      t.p = -26 - i * 18 - rand(0, 8);
      t.lane = pickLane();
    });
    recordsRef.current.forEach((r, i) => {
      r.p = -70 - i * 34;
      r.lane = pickLane();
      r.taken = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  // -- player (dressed hover-car) --
  const playerBody = useMemo(() => {
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
        m.envMapIntensity = 1.6;
        m.metalness = Math.min(1, (m.metalness ?? 0.5) + 0.2);
      }
    });
    return obj;
  }, [carScene]);
  const player = useMemo(
    () => dressCar(playerBody, "#ff2e88", "#ff2e88"),
    [playerBody],
  );

  // -- traffic: visible, neon-lit, each its own color --
  const trafficMeshes = useMemo(
    () =>
      Array.from({ length: TRAFFIC_N }, (_, i) => {
        const body = playerBody.clone(true);
        body.traverse((n) => {
          if (n instanceof THREE.Mesh && n.material) {
            const m = (n.material as THREE.MeshStandardMaterial).clone();
            m.envMapIntensity = 1.3;
            n.material = m;
          }
        });
        const hue = NEON[i % NEON.length];
        return dressCar(body, hue, i % 2 === 0 ? "#ff3b30" : hue);
      }),
    [playerBody],
  );
  const trafficRef = useRef(
    Array.from({ length: TRAFFIC_N }, (_, i) => ({
      p: -26 - i * 18 - rand(0, 8),
      lane: pickLane(),
      speed: rand(14, 22),
    })),
  );

  // -- records --
  const covers = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return [
      "/covers/the-princess.webp",
      "/covers/rockin-with-my.webp",
      "/covers/no-lights.webp",
    ].map((u) => loader.load(u));
  }, []);
  const recordsRef = useRef(
    Array.from({ length: RECORD_N }, (_, i) => ({
      p: -70 - i * 34,
      lane: pickLane(),
      taken: false,
    })),
  );
  const recordGroups = useRef<(THREE.Group | null)[]>([]);

  // -- city canyon (+ mirrored wet reflection) --
  const winTexA = useMemo(() => windowTexture("#ffb46a"), []);
  const winTexB = useMemo(() => windowTexture("#ff2e88"), []);
  const winTexC = useMemo(() => windowTexture("#5dbcd9"), []);
  const buildingTex = [winTexA, winTexB, winTexC];
  const buildingsRef = useRef(
    Array.from({ length: BUILDING_N * 2 }, (_, i) => ({
      side: i < BUILDING_N ? -1 : 1,
      p: -((i % BUILDING_N) * B_SPACING) - rand(0, 6),
      w: rand(6, 11),
      h: rand(12, 40),
      off: rand(7.5, 12.5),
      neon: NEON[i % NEON.length],
      stripY: rand(0.25, 0.6),
    })),
  );
  const buildingMeshRefs = useRef<(THREE.Group | null)[]>([]);

  // -- billboards --
  const billboardTex = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return [
      loader.load("/logo-crest.webp"),
      signTexture("WE REALLY OUT HERE", "#ff2e88"),
      loader.load("/covers/the-princess.webp"),
      signTexture("NOT TO B.A.D", "#5dbcd9"),
      loader.load("/covers/no-lights.webp"),
      signTexture("MISSION CONTROL 88.3", "#ffb84a"),
      loader.load("/covers/rockin-with-my.webp"),
      signTexture("NOU PA PI MAL", "#ff2e88"),
    ];
  }, []);
  const billboardsRef = useRef(
    Array.from({ length: 8 }, (_, i) => ({
      side: i % 2 === 0 ? -1 : 1,
      p: -i * 42 - 18,
      y: rand(6, 13),
    })),
  );
  const billboardMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  // -- overhead gantries (the reference's amber overpasses) --
  const gantriesRef = useRef(
    Array.from({ length: GANTRY_N }, (_, i) => ({ p: -i * 88 - 46 })),
  );
  const gantryRefs = useRef<(THREE.Group | null)[]>([]);

  // -- speed streaks --
  const streaksRef = useRef(
    Array.from({ length: STREAK_N }, () => ({
      x: (Math.random() < 0.5 ? -1 : 1) * rand(5.4, 7.2),
      y: rand(0.6, 7),
      p: -rand(0, 160),
      len: rand(4, 9),
      c: NEON[(Math.random() * NEON.length) | 0],
    })),
  );
  const streakRefs = useRef<(THREE.Mesh | null)[]>([]);

  const dashesRef = useRef<(THREE.Mesh | null)[]>([]);

  const starGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 700;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = rand(-140, 140);
      pos[i * 3 + 1] = rand(6, 90);
      pos[i * 3 + 2] = rand(-190, -30);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  const starMat = useRef<THREE.PointsMaterial>(null);

  const playerRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const fogColor = useRef(new THREE.Color(STAGES[0].fog));
  const skyColor = useRef(new THREE.Color(STAGES[0].sky));

  useEffect(() => {
    scene.fog = new THREE.Fog(fogColor.current, 30, 190);
    scene.background = skyColor.current;
    return () => {
      scene.fog = null;
      scene.background = null;
    };
  }, [scene]);

  // -- input --
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const s = st.current;
      if (s.phase !== "running") return;
      switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
          s.lane = Math.max(0, s.lane - 1);
          e.preventDefault();
          break;
        case "ArrowRight":
        case "KeyD":
          s.lane = Math.min(2, s.lane + 1);
          e.preventDefault();
          break;
        case "ArrowUp":
        case "KeyW":
        case "Space":
          s.boost = true;
          e.preventDefault();
          break;
        case "ArrowDown":
        case "KeyS":
          s.brake = true;
          e.preventDefault();
          break;
      }
    };
    const up = (e: KeyboardEvent) => {
      const s = st.current;
      if (["ArrowUp", "KeyW", "Space"].includes(e.code)) s.boost = false;
      if (["ArrowDown", "KeyS"].includes(e.code)) s.brake = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const onPointer = useCallback((clientX: number, el: HTMLElement) => {
    const s = st.current;
    if (s.phase !== "running") return;
    const rect = el.getBoundingClientRect();
    const fx = (clientX - rect.left) / rect.width;
    if (fx < 0.38) s.lane = Math.max(0, s.lane - 1);
    else if (fx > 0.62) s.lane = Math.min(2, s.lane + 1);
    else s.boostT = Math.max(s.boostT, 0.8);
  }, []);
  useEffect(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("[data-overdrive] canvas");
    if (!canvas) return;
    const handler = (e: PointerEvent) => onPointer(e.clientX, canvas);
    canvas.addEventListener("pointerdown", handler);
    return () => canvas.removeEventListener("pointerdown", handler);
  }, [onPointer]);

  // ---------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------
  useFrame((_, rawDelta) => {
    const s = st.current;
    const delta = Math.min(rawDelta, 0.05);
    if (paused || s.phase === "over") return;
    s.frame++;

    const ramp = BASE_SPEED + Math.min(1, s.dist / 9000) * (MAX_SPEED - BASE_SPEED);
    let target = ramp;
    if (s.boost || s.boostT > 0) target *= 1.4;
    if (s.brake) target *= 0.55;
    s.speed += (target - s.speed) * Math.min(1, delta * 2.2);
    s.boostT = Math.max(0, s.boostT - delta);
    s.invulnT = Math.max(0, s.invulnT - delta);
    s.dist += s.speed * delta;
    s.score += s.speed * delta * 1.6;

    const stage = s.dist > STAGE_3_AT ? 2 : s.dist > STAGE_2_AT ? 1 : 0;
    if (stage !== s.stage) {
      s.stage = stage;
      if (hud.current.stage)
        hud.current.stage.textContent = `STAGE ${stage + 1} — ${STAGES[stage].name}`;
    }
    fogColor.current.lerp(new THREE.Color(STAGES[s.stage].fog), delta * 0.8);
    skyColor.current.lerp(new THREE.Color(STAGES[s.stage].sky), delta * 0.8);
    if (starMat.current)
      starMat.current.opacity +=
        ((s.stage === 2 ? 0.9 : s.stage === 1 ? 0.25 : 0.0) - starMat.current.opacity) *
        delta;

    const targetX = LANES[s.lane];
    const prevX = s.x;
    s.x += (targetX - s.x) * Math.min(1, delta * 7);
    const vx = (s.x - prevX) / Math.max(delta, 1e-4);
    if (playerRef.current) {
      playerRef.current.position.x = s.x;
      playerRef.current.position.y = 0.15 + Math.sin(s.dist * 0.09) * 0.06;
      playerRef.current.rotation.z = THREE.MathUtils.clamp(-vx * 0.05, -0.4, 0.4);
      playerRef.current.rotation.y = THREE.MathUtils.clamp(-vx * 0.03, -0.3, 0.3);
      playerRef.current.visible = s.invulnT <= 0 || (s.frame >> 2) % 2 === 0;
    }
    if (glowRef.current)
      glowRef.current.intensity = 4 + (s.boost || s.boostT > 0 ? 3 : 0);

    s.shakeT = Math.max(0, s.shakeT - delta);
    const shake = s.shakeT > 0 ? s.shakeT * 0.5 : 0;
    camera.position.set(
      s.x * 0.55 + (Math.random() - 0.5) * shake,
      2.9 + (Math.random() - 0.5) * shake,
      6.8,
    );
    camera.lookAt(s.x * 0.75, 1.15, -14);
    const cam = camera as THREE.PerspectiveCamera;
    const wantFov = 62 + (s.speed / MAX_SPEED) * 16;
    if (Math.abs(cam.fov - wantFov) > 0.1) {
      cam.fov += (wantFov - cam.fov) * delta * 3;
      cam.updateProjectionMatrix();
    }

    // traffic
    trafficRef.current.forEach((t, i) => {
      t.p += (s.speed - t.speed) * delta;
      if (t.p > 14) {
        t.p = -rand(120, 190);
        t.lane = pickLane();
        t.speed = rand(14, 24);
      }
      const mesh = trafficMeshes[i];
      mesh.position.set(LANES[t.lane], 0.15, t.p);
      if (
        s.invulnT <= 0 &&
        Math.abs(t.p) < 2.4 &&
        Math.abs(LANES[t.lane] - s.x) < 1.7
      ) {
        s.shields -= 1;
        s.invulnT = 2;
        s.shakeT = 0.7;
        s.speed *= 0.45;
        if (hud.current.shields)
          hud.current.shields.textContent = "▮".repeat(Math.max(0, s.shields));
        if (s.shields <= 0) {
          s.phase = "over";
          const score = Math.floor(s.score);
          let best = 0;
          try {
            best = Math.max(score, Number(localStorage.getItem(BEST_KEY) || 0));
            localStorage.setItem(BEST_KEY, String(best));
          } catch {
            best = score;
          }
          onGameOver(score, best);
        }
      }
    });

    // records
    recordsRef.current.forEach((r, i) => {
      r.p += s.speed * delta;
      if (r.p > 12) {
        r.p = -rand(160, 260);
        r.lane = pickLane();
        r.taken = false;
      }
      const g = recordGroups.current[i];
      if (g) {
        g.position.set(LANES[r.lane], 1.5, r.p);
        g.rotation.y += delta * 4;
        g.visible = !r.taken;
      }
      if (!r.taken && Math.abs(r.p) < 1.8 && Math.abs(LANES[r.lane] - s.x) < 1.6) {
        r.taken = true;
        s.score += 500;
        s.boostT = Math.max(s.boostT, 1.1);
      }
    });

    // buildings (group carries tower + mirror + neon strip)
    buildingsRef.current.forEach((b, i) => {
      b.p += s.speed * delta;
      if (b.p > 30) b.p -= BUILDING_N * B_SPACING;
      const g = buildingMeshRefs.current[i];
      if (g) g.position.set(b.side * b.off, 0, b.p);
    });

    billboardsRef.current.forEach((b, i) => {
      b.p += s.speed * delta;
      if (b.p > 30) b.p -= 8 * 42;
      const mesh = billboardMeshRefs.current[i];
      if (mesh) mesh.position.set(b.side * 8.0, b.y, b.p);
    });

    gantriesRef.current.forEach((gd, i) => {
      gd.p += s.speed * delta;
      if (gd.p > 24) gd.p -= GANTRY_N * 88;
      const g = gantryRefs.current[i];
      if (g) g.position.z = gd.p;
    });

    streaksRef.current.forEach((sd, i) => {
      sd.p += s.speed * delta * 1.6;
      if (sd.p > 12) {
        sd.p = -rand(120, 180);
        sd.y = rand(0.6, 7);
        sd.x = (Math.random() < 0.5 ? -1 : 1) * rand(5.4, 7.2);
      }
      const m = streakRefs.current[i];
      if (m) m.position.set(sd.x, sd.y, sd.p);
    });

    dashesRef.current.forEach((d) => {
      if (!d) return;
      d.position.z += s.speed * delta;
      if (d.position.z > 10) d.position.z -= 24 * 8;
    });

    if (s.frame % 5 === 0) {
      if (hud.current.score)
        hud.current.score.textContent = String(Math.floor(s.score)).padStart(7, "0");
      if (hud.current.speed)
        hud.current.speed.textContent = `${Math.round(s.speed * 2.2)} MPH`;
    }
  });

  return (
    <>
      <ambientLight intensity={0.55} color="#9db6ff" />
      <hemisphereLight args={["#5dbcd9", "#1a0b22", 0.5]} />
      <directionalLight position={[8, 20, 10]} intensity={1.0} color="#ffd6f2" />
      {/* real reflections on the car bodies */}
      <Environment files="/env/sunset-env.hdr" />

      {/* player */}
      <group ref={playerRef}>
        <primitive object={player} />
        <pointLight ref={glowRef} position={[0, 0.5, 0]} color="#ff2e88" intensity={4} distance={11} />
      </group>

      {/* traffic */}
      {trafficMeshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}

      {/* records */}
      {Array.from({ length: RECORD_N }, (_, i) => (
        <group key={i} ref={(el) => void (recordGroups.current[i] = el)}>
          <mesh>
            <cylinderGeometry args={[0.9, 0.9, 0.08, 32]} />
            <meshStandardMaterial color="#0a0a10" metalness={0.7} roughness={0.3} envMapIntensity={1.2} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <circleGeometry args={[0.45, 24]} />
            <meshBasicMaterial map={covers[i % covers.length]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.051, 0]}>
            <ringGeometry args={[0.88, 0.95, 32]} />
            <meshBasicMaterial color="#5dbcd9" toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* wet road: glossy asphalt + blooming edge lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -80]}>
        <planeGeometry args={[ROAD_W, 340]} />
        <meshStandardMaterial color="#0a0a11" metalness={0.9} roughness={0.18} envMapIntensity={0.7} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} rotation={[-Math.PI / 2, 0, 0]} position={[side * (ROAD_W / 2), 0.02, -80]}>
          <planeGeometry args={[0.16, 340]} />
          <meshBasicMaterial color={side < 0 ? "#ff2e88" : "#5dbcd9"} toneMapped={false} />
        </mesh>
      ))}
      {/* sidewalk aprons so the road doesn't float in void */}
      {[-1, 1].map((side) => (
        <mesh key={`walk${side}`} rotation={[-Math.PI / 2, 0, 0]} position={[side * (ROAD_W / 2 + 2.6), -0.01, -80]}>
          <planeGeometry args={[5.2, 340]} />
          <meshStandardMaterial color="#07070d" metalness={0.6} roughness={0.5} transparent opacity={0.68} />
        </mesh>
      ))}
      {Array.from({ length: 24 }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => void (dashesRef.current[i] = el)}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[i % 2 === 0 ? -1.5 : 1.5, 0.015, -((i >> 1) * 16)]}
        >
          <planeGeometry args={[0.14, 3]} />
          <meshBasicMaterial color="#e9e9f2" transparent opacity={0.6} />
        </mesh>
      ))}

      {/* city canyon: tower + mirrored wet reflection + neon strip */}
      {buildingsRef.current.map((b, i) => (
        <group key={i} ref={(el) => void (buildingMeshRefs.current[i] = el)} position={[b.side * b.off, 0, b.p]}>
          <mesh position={[0, b.h / 2, 0]}>
            <boxGeometry args={[b.w, b.h, 9]} />
            <meshStandardMaterial
              color="#060609"
              emissive="#ffffff"
              emissiveMap={buildingTex[i % 3]}
              emissiveIntensity={1.5}
            />
          </mesh>
          {/* reflection in the wet street */}
          <mesh position={[0, -b.h / 2, 0]} scale={[1, -1, 1]}>
            <boxGeometry args={[b.w, b.h, 9]} />
            <meshStandardMaterial
              color="#060609"
              emissive="#ffffff"
              emissiveMap={buildingTex[i % 3]}
              emissiveIntensity={0.5}
              transparent
              opacity={0.35}
            />
          </mesh>
          {/* vertical neon sign strip on the road face */}
          <mesh position={[b.side * -(b.w / 2 + 0.06), b.h * b.stripY, 0]} rotation={[0, b.side * -Math.PI / 2, 0]}>
            <planeGeometry args={[0.5, b.h * 0.45]} />
            <meshBasicMaterial color={b.neon} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* billboards */}
      {billboardsRef.current.map((b, i) => (
        <mesh
          key={i}
          ref={(el) => void (billboardMeshRefs.current[i] = el)}
          position={[b.side * 8.0, b.y, b.p]}
          rotation={[0, b.side * -0.9, 0]}
        >
          <planeGeometry args={[6.4, 4.2]} />
          <meshBasicMaterial map={billboardTex[i % billboardTex.length]} toneMapped={false} />
        </mesh>
      ))}

      {/* amber overpass gantries */}
      {gantriesRef.current.map((gd, i) => (
        <group key={i} ref={(el) => void (gantryRefs.current[i] = el)} position={[0, 0, gd.p]}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 7.4, 4.5, 0]}>
              <boxGeometry args={[0.7, 9, 0.7]} />
              <meshStandardMaterial color="#101018" metalness={0.8} roughness={0.4} />
            </mesh>
          ))}
          <mesh position={[0, 9.2, 0]}>
            <boxGeometry args={[16, 1.6, 1.2]} />
            <meshStandardMaterial color="#101018" metalness={0.8} roughness={0.4} />
          </mesh>
          <mesh position={[0, 9.2, 0.62]}>
            <planeGeometry args={[15, 1.1]} />
            <meshBasicMaterial color="#ff9d2e" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* speed streaks */}
      {streaksRef.current.map((sd, i) => (
        <mesh
          key={i}
          ref={(el) => void (streakRefs.current[i] = el)}
          position={[sd.x, sd.y, sd.p]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <planeGeometry args={[sd.len, 0.07]} />
          <meshBasicMaterial color={sd.c} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}

      <points geometry={starGeo}>
        <pointsMaterial ref={starMat} color="#cfeaff" size={0.35} transparent opacity={0} depthWrite={false} />
      </points>
    </>
  );
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------
export default function OverdriveGame() {
  const hud = useRef<HudRefs>({ score: null, speed: null, stage: null, shields: null });
  const [over, setOver] = useState<null | { score: number; best: number }>(null);
  const [paused, setPaused] = useState(false);
  const [runId, setRunId] = useState(0);
  const tier = useMemo(() => detectTier(), []);

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

  const restart = () => {
    setOver(null);
    setRunId((r) => r + 1);
  };

  return (
    <div data-overdrive className="relative h-full w-full overflow-hidden rounded-xl bg-[#05030c]">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: tier === "high", powerPreference: "high-performance" }}
        camera={{ fov: 64, near: 0.1, far: 280, position: [0, 2.9, 6.8] }}
      >
        <Suspense fallback={null}>
          <GameWorld
            hud={hud}
            paused={paused || over !== null}
            runId={runId}
            onGameOver={(score, best) => setOver({ score, best })}
          />
          {tier === "high" && (
            <EffectComposer>
              {/* the neon: taillights, strips, gantries and edge lines glow */}
              <Bloom intensity={0.9} luminanceThreshold={0.38} luminanceSmoothing={0.3} mipmapBlur />
              <ChromaticAberration offset={new THREE.Vector2(0.0009, 0.0006)} />
              <Vignette eskil={false} offset={0.2} darkness={0.7} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 font-body">
        <div className="flex items-start justify-between text-[#ebeef1]">
          <div>
            <p className="text-[0.6rem] tracking-[0.3em] text-[#ebeef1]/60">SCORE</p>
            <p ref={(el) => void (hud.current.score = el)} className="text-xl font-bold tracking-widest">0000000</p>
          </div>
          <p
            ref={(el) => void (hud.current.stage = el)}
            className="font-display mt-1 text-xs tracking-[0.25em] text-[#5dbcd9]"
          >
            STAGE 1 — NO LIGHTS
          </p>
          <div className="text-right">
            <p className="text-[0.6rem] tracking-[0.3em] text-[#ebeef1]/60">SHIELDS</p>
            <p ref={(el) => void (hud.current.shields = el)} className="text-xl font-bold text-blood">▮▮▮</p>
          </div>
        </div>
        <div className="flex items-end justify-between">
          <p ref={(el) => void (hud.current.speed = el)} className="text-lg font-bold tracking-widest text-[#ebeef1]/90">
            0 MPH
          </p>
          <p className="text-[0.6rem] tracking-[0.2em] text-[#ebeef1]/45">
            ◀ ▶ STEER · ▲ BOOST · ▼ BRAKE · ESC PAUSE
          </p>
        </div>
      </div>

      {paused && !over ? (
        <div className="absolute inset-0 grid place-items-center bg-black/60">
          <p className="font-display text-2xl tracking-[0.3em] text-[#ebeef1]">PAUSED</p>
        </div>
      ) : null}

      {over ? (
        <div className="absolute inset-0 grid place-items-center bg-black/75">
          <div className="text-center">
            <p className="font-display text-neon-pink text-3xl font-black tracking-wide md:text-5xl">RUN OVER</p>
            <p className="font-body mt-4 text-sm tracking-[0.25em] text-[#ebeef1]">
              SCORE {String(over.score).padStart(7, "0")}
            </p>
            <p className="font-body mt-1 text-xs tracking-[0.25em] text-[#ebeef1]/60">
              BEST {String(over.best).padStart(7, "0")}
            </p>
            <button
              type="button"
              onClick={restart}
              className="btn-blood font-body mt-8 rounded-full px-8 py-3 text-xs font-bold tracking-[0.3em]"
            >
              ▸ RUN IT BACK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
