import * as THREE from 'three';

/**
 * Liquid-chrome sculpture cluster: one torus knot + three spheres drifting
 * on large slow sine offsets. Scene damps `group.position` toward keyframe
 * targets and drives `orbit` (0..1, Gallery sphere orbits) and
 * `spheresScale` (Store swell).
 *
 * Skipped entirely on 'low' quality (Scene never instantiates it).
 */
export default class ChromeShards {
  constructor(quality = 'high') {
    const high = quality === 'high';
    this.group = new THREE.Group();

    this.orbit = 0; // 0..1 — spheres orbit the knot
    this.spheresScale = 1; // uniform sphere scale multiplier

    this._material = new THREE.MeshPhysicalMaterial({
      color: '#e8e8ec',
      metalness: 1,
      roughness: 0.18,
      clearcoat: 0.6,
      clearcoatRoughness: 0.25,
      envMapIntensity: 1.3,
    });

    this._knotGeo = new THREE.TorusKnotGeometry(1, 0.28, high ? 200 : 100, high ? 32 : 16);
    this.knot = new THREE.Mesh(this._knotGeo, this._material);
    this.group.add(this.knot);

    const radii = [0.5, 0.35, 0.22];
    this._sphereGeos = [];
    this.spheres = [];
    this._sphereBase = [
      new THREE.Vector3(1.8, 0.9, -0.6),
      new THREE.Vector3(-1.5, -0.7, 0.8),
      new THREE.Vector3(0.6, 1.6, 1.1),
    ];

    for (let i = 0; i < 3; i++) {
      const geo = new THREE.SphereGeometry(radii[i], high ? 48 : 24, high ? 32 : 16);
      const mesh = new THREE.Mesh(geo, this._material);
      mesh.position.copy(this._sphereBase[i]);
      this._sphereGeos.push(geo);
      this.spheres.push(mesh);
      this.group.add(mesh);
    }
  }

  /**
   * @param {number} dt seconds
   * @param {number} t  elapsed seconds
   * @param {number} idle 0..1 — 0 when reducedMotion (no drift/spin)
   */
  update(dt, t, idle = 1) {
    // Idle drift: slow rotation + large slow sine wobble.
    this.knot.rotation.x += dt * 0.12 * idle;
    this.knot.rotation.y += dt * (0.18 + this.orbit * 0.25) * idle;
    this.knot.position.y = Math.sin(t * 0.4) * 0.25 * idle;

    for (let i = 0; i < this.spheres.length; i++) {
      const s = this.spheres[i];
      const base = this._sphereBase[i];

      // Drifting rest position on large slow sines.
      const dx = Math.sin(t * 0.27 + i * 2.1) * 0.35 * idle;
      const dy = Math.cos(t * 0.21 + i * 1.7) * 0.3 * idle;
      const dz = Math.sin(t * 0.17 + i * 3.3) * 0.3 * idle;

      // Orbit path around the knot (Gallery).
      const ang = t * (0.35 + i * 0.12) * idle + i * 2.4;
      const orad = 1.7 + i * 0.55;
      const ox = Math.cos(ang) * orad;
      const oz = Math.sin(ang) * orad;
      const oy = Math.sin(ang * 1.4) * 0.5;

      s.position.set(
        THREE.MathUtils.lerp(base.x + dx, ox, this.orbit),
        THREE.MathUtils.lerp(base.y + dy, oy, this.orbit),
        THREE.MathUtils.lerp(base.z + dz, oz, this.orbit)
      );
      s.scale.setScalar(this.spheresScale);
    }
  }

  dispose() {
    this._knotGeo.dispose();
    for (const g of this._sphereGeos) g.dispose();
    this._material.dispose();
  }
}
