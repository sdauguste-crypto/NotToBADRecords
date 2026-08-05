"use client";

// OVERDRIVE — Silver Surfer Run.
// Endless chase-cam lane racer through the label's lore: three stages named
// after the singles (NO LIGHTS sunset -> ROCKIN WITH MY neon city ->
// THE PRINCESS deep space), driving the site's hover-car past billboards
// carrying the crest, the covers, and the catch-phrases.
//
// Self-contained: mounts only after START ENGINE, so the page pays nothing
// until a visitor actually plays. Inputs are physical key codes (WASD works
// on any layout) plus touch zones. Score persists to localStorage.

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";

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
const BUILDING_N = 26; // per side
const STAGE_2_AT = 2600; // meters
const STAGE_3_AT = 6200;
const BEST_KEY = "ntb-overdrive-best";

export const STAGES = [
  { name: "NO LIGHTS", fog: "#3a1245", sky: "#2b0f3d", win: "#ffd27a" },
  { name: "ROCKIN WITH MY", fog: "#131f45", sky: "#080f26", win: "#ff2e88" },
  { name: "THE PRINCESS", fog: "#05030c", sky: "#020208", win: "#5dbcd9" },
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
  runId: number; // bump to restart
};

// ---------------------------------------------------------------------------
// Canvas-texture helpers (procedural signage in the locked style formula)
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
  g.fillStyle = "#05060b";
  g.fillRect(0, 0, 64, 128);
  for (let y = 4; y < 124; y += 10) {
    for (let x = 4; x < 60; x += 10) {
      if (Math.random() < 0.42) {
        g.fillStyle = Math.random() < 0.82 ? hue : "#ffffff";
        g.globalAlpha = 0.35 + Math.random() * 0.65;
        g.fillRect(x, y, 5, 6);
      }
    }
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pickLane = () => (Math.random() * 3) | 0;

// ---------------------------------------------------------------------------
// The world
// ---------------------------------------------------------------------------
function GameWorld({ hud, onGameOver, paused, runId }: GameProps) {
  const { scene: carScene } = useGLTF(CAR_URL, false, true);
  const { camera, scene } = useThree();

  // -- mutable game state (never React state — the loop owns it) --
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

  // restart support
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
      t.p = -40 - i * 22 - rand(0, 10);
      t.lane = pickLane();
    });
    recordsRef.current.forEach((r, i) => {
      r.p = -70 - i * 34;
      r.lane = pickLane();
      r.taken = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  // -- player + traffic cars (clones of the site's hover-car) --
  const player = useMemo(() => {
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
    obj.rotation.y = Math.PI; // nose toward -z
    const group = new THREE.Group();
    group.add(obj);
    return group;
  }, [carScene]);

  const trafficMeshes = useMemo(
    () =>
      Array.from({ length: TRAFFIC_N }, () => {
        const obj = player.clone(true);
        obj.traverse((n) => {
          if (n instanceof THREE.Mesh && n.material) {
            n.material = (n.material as THREE.MeshStandardMaterial).clone();
            (n.material as THREE.MeshStandardMaterial).color.multiplyScalar(0.55);
          }
        });
        return obj;
      }),
    [player],
  );

  const trafficRef = useRef(
    Array.from({ length: TRAFFIC_N }, (_, i) => ({
      p: -40 - i * 22 - rand(0, 10), // absolute road position (negative = ahead)
      lane: pickLane(),
      speed: rand(14, 22),
    })),
  );

  // -- collectible records (real cover art) --
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

  // -- city canyon --
  const winTexA = useMemo(() => windowTexture("#ffb46a"), []);
  const winTexB = useMemo(() => windowTexture("#ff2e88"), []);
  const winTexC = useMemo(() => windowTexture("#5dbcd9"), []);
  const buildingTex = [winTexA, winTexB, winTexC];
  const buildingsRef = useRef(
    Array.from({ length: BUILDING_N * 2 }, (_, i) => ({
      side: i < BUILDING_N ? -1 : 1,
      p: -((i % BUILDING_N) * 15) - rand(0, 8),
      w: rand(6, 11),
      h: rand(10, 34),
      off: rand(9, 15),
    })),
  );
  const buildingMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  // -- billboards (crest, covers, catch-phrases) --
  const billboardTex = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return [
      loader.load("/logo-crest.webp"),
      signTexture("WE REALLY OUT HERE", "#ff2e88"),
      loader.load("/covers/the-princess.webp"),
      signTexture("NOT TO B.A.D", "#5dbcd9"),
      loader.load("/covers/no-lights.webp"),
      signTexture("MISSION CONTROL 88.3", "#ffd27a"),
      loader.load("/covers/rockin-with-my.webp"),
      signTexture("NOU PA PI MAL", "#ff2e88"),
    ];
  }, []);
  const billboardsRef = useRef(
    Array.from({ length: 8 }, (_, i) => ({
      side: i % 2 === 0 ? -1 : 1,
      p: -i * 46 - 20,
      y: rand(7, 15),
    })),
  );
  const billboardMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  // -- road dashes --
  const dashesRef = useRef<(THREE.Mesh | null)[]>([]);

  // -- stars for stage 3 --
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
    scene.fog = new THREE.Fog(fogColor.current, 26, 170);
    scene.background = skyColor.current;
    return () => {
      scene.fog = null;
      scene.background = null;
    };
  }, [scene]);

  // -- input: physical key codes + touch zones --
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

  const onPointer = useCallback((e: { point?: unknown; clientX: number; target: unknown }) => {
    const s = st.current;
    if (s.phase !== "running") return;
    const el = e.target as HTMLElement;
    const rect = el.getBoundingClientRect?.();
    if (!rect) return;
    const fx = (e.clientX - rect.left) / rect.width;
    if (fx < 0.38) s.lane = Math.max(0, s.lane - 1);
    else if (fx > 0.62) s.lane = Math.min(2, s.lane + 1);
    else s.boostT = Math.max(s.boostT, 0.8);
  }, []);
  useEffect(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("[data-overdrive] canvas");
    if (!canvas) return;
    const handler = (e: PointerEvent) =>
      onPointer({ clientX: e.clientX, target: canvas, point: undefined });
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

    // speed model
    const ramp = BASE_SPEED + Math.min(1, s.dist / 9000) * (MAX_SPEED - BASE_SPEED);
    let target = ramp;
    if (s.boost || s.boostT > 0) target *= 1.4;
    if (s.brake) target *= 0.55;
    s.speed += (target - s.speed) * Math.min(1, delta * 2.2);
    s.boostT = Math.max(0, s.boostT - delta);
    s.invulnT = Math.max(0, s.invulnT - delta);
    s.dist += s.speed * delta;
    s.score += s.speed * delta * 1.6;

    // stage transitions
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

    // player steering
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
      glowRef.current.intensity = 3.2 + (s.boost || s.boostT > 0 ? 2.4 : 0);

    // camera chase + shake
    s.shakeT = Math.max(0, s.shakeT - delta);
    const shake = s.shakeT > 0 ? s.shakeT * 0.5 : 0;
    camera.position.set(
      s.x * 0.55 + (Math.random() - 0.5) * shake,
      3.1 + (Math.random() - 0.5) * shake,
      7.2,
    );
    camera.lookAt(s.x * 0.75, 1.1, -14);
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
        t.p = -rand(150, 220);
        t.lane = pickLane();
        t.speed = rand(14, 24);
      }
      const mesh = trafficMeshes[i];
      mesh.position.set(LANES[t.lane], 0.15, t.p);
      // collision
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

    // buildings recycle
    buildingsRef.current.forEach((b, i) => {
      b.p += s.speed * delta;
      if (b.p > 30) b.p -= BUILDING_N * 15;
      const mesh = buildingMeshRefs.current[i];
      if (mesh) mesh.position.set(b.side * b.off, b.h / 2, b.p);
    });

    // billboards recycle
    billboardsRef.current.forEach((b, i) => {
      b.p += s.speed * delta;
      if (b.p > 30) b.p -= 8 * 46;
      const mesh = billboardMeshRefs.current[i];
      if (mesh) mesh.position.set(b.side * 8.2, b.y, b.p);
    });

    // road dashes
    dashesRef.current.forEach((d, i) => {
      if (!d) return;
      d.position.z += s.speed * delta;
      if (d.position.z > 10) d.position.z -= 24 * 8;
    });

    // HUD (direct DOM writes, throttled)
    if (s.frame % 5 === 0) {
      if (hud.current.score)
        hud.current.score.textContent = String(Math.floor(s.score)).padStart(7, "0");
      if (hud.current.speed)
        hud.current.speed.textContent = `${Math.round(s.speed * 2.2)} MPH`;
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} color="#8fb4ff" />
      <directionalLight position={[8, 20, 10]} intensity={0.9} color="#ffd6f2" />

      {/* player */}
      <group ref={playerRef}>
        <primitive object={player} />
        {/* magenta underglow + amber wheel glow, per the style formula */}
        <pointLight ref={glowRef} position={[0, 0.4, 0]} color="#ff2e88" intensity={3.2} distance={9} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <planeGeometry args={[2.6, 4.2]} />
          <meshBasicMaterial color="#ff2e88" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>

      {/* traffic */}
      {trafficMeshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}

      {/* records */}
      {Array.from({ length: RECORD_N }, (_, i) => (
        <group key={i} ref={(el) => void (recordGroups.current[i] = el)}>
          <mesh rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.9, 0.9, 0.08, 32]} />
            <meshStandardMaterial color="#0a0a10" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <circleGeometry args={[0.45, 24]} />
            <meshBasicMaterial map={covers[i % covers.length]} />
          </mesh>
          <pointLight color="#5dbcd9" intensity={1.2} distance={5} />
        </group>
      ))}

      {/* road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -80]}>
        <planeGeometry args={[ROAD_W, 320]} />
        <meshStandardMaterial color="#0b0b12" metalness={0.75} roughness={0.35} />
      </mesh>
      {/* neon road edges */}
      {[-1, 1].map((side) => (
        <mesh key={side} rotation={[-Math.PI / 2, 0, 0]} position={[side * (ROAD_W / 2), 0.02, -80]}>
          <planeGeometry args={[0.18, 320]} />
          <meshBasicMaterial color={side < 0 ? "#ff2e88" : "#5dbcd9"} toneMapped={false} />
        </mesh>
      ))}
      {/* lane dashes */}
      {Array.from({ length: 24 }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => void (dashesRef.current[i] = el)}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[i % 2 === 0 ? -1.5 : 1.5, 0.015, -((i >> 1) * 16)]}
        >
          <planeGeometry args={[0.14, 3]} />
          <meshBasicMaterial color="#e9e9f2" transparent opacity={0.5} />
        </mesh>
      ))}

      {/* city canyon */}
      {buildingsRef.current.map((b, i) => (
        <mesh key={i} ref={(el) => void (buildingMeshRefs.current[i] = el)} position={[b.side * b.off, b.h / 2, b.p]}>
          <boxGeometry args={[b.w, b.h, 10]} />
          <meshStandardMaterial
            color="#07070d"
            emissive="#ffffff"
            emissiveMap={buildingTex[i % 3]}
            emissiveIntensity={1.1}
          />
        </mesh>
      ))}

      {/* billboards */}
      {billboardsRef.current.map((b, i) => (
        <mesh
          key={i}
          ref={(el) => void (billboardMeshRefs.current[i] = el)}
          position={[b.side * 8.2, b.y, b.p]}
          rotation={[0, b.side * -0.9, 0]}
        >
          <planeGeometry args={[6.4, 4.2]} />
          <meshBasicMaterial map={billboardTex[i % billboardTex.length]} toneMapped={false} />
        </mesh>
      ))}

      {/* stars (fade in through the stages) */}
      <points geometry={starGeo}>
        <pointsMaterial ref={starMat} color="#cfeaff" size={0.35} transparent opacity={0} depthWrite={false} />
      </points>
    </>
  );
}

// ---------------------------------------------------------------------------
// Shell: canvas + HUD + title/game-over overlays
// ---------------------------------------------------------------------------
export default function OverdriveGame() {
  const hud = useRef<HudRefs>({ score: null, speed: null, stage: null, shields: null });
  const [over, setOver] = useState<null | { score: number; best: number }>(null);
  const [paused, setPaused] = useState(false);
  const [runId, setRunId] = useState(0);

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
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 64, near: 0.1, far: 260, position: [0, 3.1, 7.2] }}
      >
        <Suspense fallback={null}>
          <GameWorld
            hud={hud}
            paused={paused || over !== null}
            runId={runId}
            onGameOver={(score, best) => setOver({ score, best })}
          />
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

      {/* pause veil */}
      {paused && !over ? (
        <div className="absolute inset-0 grid place-items-center bg-black/60">
          <p className="font-display text-2xl tracking-[0.3em] text-[#ebeef1]">PAUSED</p>
        </div>
      ) : null}

      {/* game over */}
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
