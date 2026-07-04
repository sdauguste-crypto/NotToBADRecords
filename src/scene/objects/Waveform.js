import * as THREE from 'three';

const SILVER = new THREE.Color('#e8e8ec');
const GOLD = new THREE.Color('#c9a227');

/**
 * Audio-waveform / equalizer bar field.
 * InstancedMesh of slim metal bars spanning ~8 units, per-instance color
 * lerped silver -> gold across the row. `spread` (1..1.6) widens x spacing
 * (Videos section stretches it into a wide scrubber).
 */
export default class Waveform {
  constructor(quality = 'high') {
    this.count = quality === 'high' ? 96 : quality === 'med' ? 64 : 48;
    this.spread = 1;
    this.group = new THREE.Group();

    this._geometry = new THREE.BoxGeometry(0.12, 1, 0.12);
    this._material = new THREE.MeshStandardMaterial({
      metalness: 1,
      roughness: 0.25,
      envMapIntensity: 1.2,
    });

    this.mesh = new THREE.InstancedMesh(this._geometry, this._material, this.count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const color = new THREE.Color();
    for (let i = 0; i < this.count; i++) {
      color.copy(SILVER).lerp(GOLD, this.count > 1 ? i / (this.count - 1) : 0);
      this.mesh.setColorAt(i, color);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    this._dummy = new THREE.Object3D();
    this._baseSpacing = 8 / Math.max(1, this.count - 1);

    this.group.add(this.mesh);
    this.update(0);
  }

  /**
   * @param {number} t elapsed time in seconds (pass a frozen value for reduced motion)
   */
  update(t) {
    const n = this.count;
    const halfSpan = ((n - 1) * this._baseSpacing * this.spread) / 2;
    for (let i = 0; i < n; i++) {
      const h =
        0.4 +
        0.9 *
          Math.abs(
            Math.sin(i * 0.35 + t * 2) * 0.6 + Math.sin(i * 0.13 - t * 1.3) * 0.4
          );
      this._dummy.position.set(i * this._baseSpacing * this.spread - halfSpan, 0, 0);
      this._dummy.scale.set(1, h, 1);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this._dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this._geometry.dispose();
    this._material.dispose();
    this.mesh.dispose();
  }
}
