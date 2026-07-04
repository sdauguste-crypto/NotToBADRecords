import * as THREE from 'three';
import { createEnvironment } from './environment.js';
import { KEYFRAMES, KEYFRAME_KEYS, blendKeyframes, progressWeight } from './cameraPath.js';
import VinylRecord from './objects/VinylRecord.js';
import Waveform from './objects/Waveform.js';
import Particles from './objects/Particles.js';
import ChromeShards from './objects/ChromeShards.js';

const DPR_CAPS = { high: 2, med: 1.5, low: 1 };

/**
 * NotToBAD Records — dark luxury chrome scene.
 *
 * Fixed fullscreen canvas behind scrolling DOM. Transparent background
 * (page CSS supplies the near-black base). All motion is target-based:
 * setters only write targets; update(dt) damps toward them and renders.
 * No internal requestAnimationFrame — an external ticker calls update(dt).
 */
export default class Scene {
  constructor(canvas, { quality = 'high', reducedMotion = false } = {}) {
    this.quality = quality;
    this.reducedMotion = !!reducedMotion;
    this._disposed = false;
    this._noop = false;

    if (quality === 'none' || !canvas) {
      this._noop = true;
      return;
    }

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: quality !== 'low',
        powerPreference: 'high-performance',
      });
    } catch (e) {
      this._noop = true;
      return;
    }

    this._dprCap = DPR_CAPS[quality] || 1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this._dprCap));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.1,
      100
    );
    this.camera.position.set(0, 0, 8);

    // Environment: PMREM'd RoomEnvironment with gold/silver duality panels.
    this._envTexture = createEnvironment(this.renderer, this.scene);

    // Lights
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.dirLight.position.set(4, 5, 3);
    this.scene.add(this.dirLight);

    this.goldLight = new THREE.PointLight(0xc9a227, 0.6, 0, 2);
    this.goldLight.position.set(-4, -3, 2);
    this.scene.add(this.goldLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    this.scene.add(this.ambientLight);

    // Objects
    this.vinyl = new VinylRecord(quality);
    this.scene.add(this.vinyl.group);
    // On small screens the disc otherwise fills the frame and sits right
    // behind the hero headline — keep it smaller and further back there.
    const smallScreen =
      typeof window !== 'undefined' && window.innerWidth < 900;
    this._vinylScaleMult = smallScreen ? 0.72 : 1;
    this._vinylZOffset = smallScreen ? -2 : 0;

    this.waveform = new Waveform(quality);
    this.waveform.group.position.y = -6;
    this.scene.add(this.waveform.group);

    this.particles = new Particles(quality, this.reducedMotion);
    this.particles.setPixelRatio(this.renderer.getPixelRatio());
    if (this.particles.points) this.scene.add(this.particles.points);

    this.shards = null;
    if (quality !== 'low') {
      this.shards = new ChromeShards(quality);
      this.shards.group.position.set(0, 0, -14);
      this.scene.add(this.shards.group);
    }

    // Choreography state
    this._time = 0;
    this._reports = {}; // sectionName -> { p, age }
    this._weights = {};
    this._target = Object.assign({}, KEYFRAMES.hero);
    this._current = Object.assign({}, KEYFRAMES.hero);

    this._globalTarget = 0;
    this._global = 0;

    this._pointerTarget = new THREE.Vector2(0, 0);
    this._pointer = new THREE.Vector2(0, 0);

    this._look = new THREE.Vector3(0, 0, 0);
  }

  // ---------------------------------------------------------------- setters
  // (targets only — update(dt) does the damping)

  setGlobalProgress(p) {
    if (this._noop || this._disposed) return;
    this._globalTarget = THREE.MathUtils.clamp(Number(p) || 0, 0, 1);
  }

  setSectionProgress(name, p) {
    if (this._noop || this._disposed) return;
    if (!KEYFRAMES[name]) return;
    const clamped = THREE.MathUtils.clamp(Number(p) || 0, 0, 1);
    const rec = this._reports[name];
    if (rec) {
      rec.p = clamped;
      rec.age = 0;
    } else {
      this._reports[name] = { p: clamped, age: 0 };
    }
  }

  setPointer(nx, ny) {
    if (this._noop || this._disposed) return;
    if (this.reducedMotion) return;
    this._pointerTarget.set(
      THREE.MathUtils.clamp(Number(nx) || 0, -1, 1),
      THREE.MathUtils.clamp(Number(ny) || 0, -1, 1)
    );
  }

  // ----------------------------------------------------------------- update

  update(dt) {
    if (this._noop || this._disposed) return;

    dt = Math.min(Math.max(Number(dt) || 0.016, 0.0001), 0.1);
    this._time += dt;
    const t = this._time;

    const idle = this.reducedMotion ? 0 : 1;
    const lambda = this.reducedMotion ? 10 : 4;

    // --- Section weights: peak at p = 0.5, decay when a section stops reporting.
    const weights = this._weights;
    for (const key in weights) delete weights[key];
    let total = 0;
    for (const name in this._reports) {
      const rec = this._reports[name];
      rec.age += dt;
      let w = progressWeight(rec.p);
      if (rec.age > 0.35) w *= Math.max(0, 1 - (rec.age - 0.35) * 3);
      if (w > 1e-4) {
        weights[name] = w;
        total += w;
      } else if (rec.age > 2) {
        delete this._reports[name];
      }
    }
    if (total < 1e-4) {
      // Nothing reporting yet (or everything decayed): hold hero.
      weights.hero = 1;
    }

    blendKeyframes(weights, this._target);

    // --- Damp all choreography values toward targets (liquid feel).
    const cur = this._current;
    const tgt = this._target;
    for (let i = 0; i < KEYFRAME_KEYS.length; i++) {
      const k = KEYFRAME_KEYS[i];
      cur[k] = THREE.MathUtils.damp(cur[k], tgt[k], lambda, dt);
    }
    this._global = THREE.MathUtils.damp(this._global, this._globalTarget, lambda, dt);
    this._pointer.x = THREE.MathUtils.damp(this._pointer.x, this._pointerTarget.x, lambda, dt);
    this._pointer.y = THREE.MathUtils.damp(this._pointer.y, this._pointerTarget.y, lambda, dt);

    // --- Camera: keyframe pos + pointer parallax + ambient idle bob, then lookAt + roll.
    const bobX = Math.cos(t * 0.37) * 0.08 * idle;
    const bobY = Math.sin(t * 0.5) * 0.12 * idle;
    this.camera.position.set(
      cur.camX + this._pointer.x * 0.3 + bobX,
      cur.camY - this._pointer.y * 0.3 + bobY,
      cur.camZ
    );
    this._look.set(cur.lookX, cur.lookY, cur.lookZ);
    this.camera.lookAt(this._look);
    if (Math.abs(cur.roll) > 1e-4) this.camera.rotateZ(cur.roll);

    // --- Vinyl
    this.vinyl.group.position.set(
      cur.vinylX,
      cur.vinylY + Math.sin(t * 0.8) * 0.1 * idle,
      cur.vinylZ + this._vinylZOffset
    );
    this.vinyl.group.rotation.x = cur.vinylRotX + Math.sin(t * 0.6) * 0.04 * idle;
    this.vinyl.group.rotation.y = cur.vinylRotY;
    this.vinyl.group.scale.setScalar(
      Math.max(0.0001, cur.vinylScale * this._vinylScaleMult)
    );
    this.vinyl.spinSpeed = cur.vinylSpin;
    this.vinyl.pulseWeight = cur.labelPulse;
    this.vinyl.update(dt, idle);

    // --- Waveform
    this.waveform.group.position.set(
      cur.waveX,
      cur.waveY + Math.sin(t * 0.9 + 1.3) * 0.08 * idle,
      0
    );
    this.waveform.spread = cur.waveSpread;
    this.waveform.update(idle ? t : 0);

    // --- Chrome shards
    if (this.shards) {
      this.shards.group.position.set(
        cur.shardX,
        cur.shardY + Math.sin(t * 0.33 + 2.1) * 0.15 * idle,
        cur.shardZ
      );
      this.shards.orbit = cur.shardOrbit;
      this.shards.spheresScale = cur.shardSpheresScale;
      this.shards.update(dt, t, idle);
    }

    // --- Particles
    const pu = this.particles.uniforms;
    pu.uScroll.value = this._global;
    pu.uSwirl.value = cur.swirl;
    pu.uFlatten.value = cur.flatten;
    pu.uGoldMix.value = cur.goldMix;
    pu.uFade.value = cur.fade;
    this.particles.update(idle ? t : 0);

    // --- Gold light (Store section swells it 0.6 -> 1.4)
    this.goldLight.intensity = cur.goldLight + Math.sin(t * 1.7) * 0.05 * idle;

    this.renderer.render(this.scene, this.camera);
  }

  // ----------------------------------------------------------------- resize

  resize() {
    if (this._noop || this._disposed) return;
    const w = window.innerWidth;
    const h = Math.max(1, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this._dprCap));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.particles.setPixelRatio(this.renderer.getPixelRatio());
  }

  // ---------------------------------------------------------------- dispose

  dispose() {
    if (this._noop || this._disposed) return;
    this._disposed = true;

    this.vinyl.dispose();
    this.waveform.dispose();
    this.particles.dispose();
    if (this.shards) this.shards.dispose();

    if (this._envTexture) this._envTexture.dispose();
    this.scene.environment = null;

    this.scene.clear();
    this.renderer.dispose();
  }
}
