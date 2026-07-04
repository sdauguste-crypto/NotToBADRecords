import * as THREE from 'three';

const GOLD = '#c9a227';
const SILVER = '#e8e8ec';
const NEAR_BLACK = '#0b0b0e';

/**
 * Procedural chrome vinyl record.
 * - Outer `group`: positioned/tilted/scaled by Scene (choreography).
 * - Inner `spinGroup`: spins around the disc's cylinder axis (Y).
 * All textures are generated on 2D canvases — zero downloaded assets.
 */
export default class VinylRecord {
  constructor(quality = 'high') {
    this.group = new THREE.Group();
    this.spinGroup = new THREE.Group();
    this.group.add(this.spinGroup);

    this.spinSpeed = 0.15; // rad/s, driven by Scene
    this.pulseWeight = 0; // 0..1 gold spindle emissive pulse (contact section)
    this._time = 0;

    const isLow = quality === 'low';
    const segments = quality === 'high' ? 128 : isLow ? 48 : 64;

    this._grooveTexture = createGrooveNormalMap();
    this._labelTexture = createLabelTexture();

    // --- Disc: liquid chrome ---
    const discGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.04, segments);
    let discMat;
    if (isLow) {
      discMat = new THREE.MeshStandardMaterial({
        color: SILVER,
        metalness: 1,
        roughness: 0.08,
        envMapIntensity: 1.4,
        normalMap: this._grooveTexture,
        normalScale: new THREE.Vector2(0.3, 0.3),
      });
    } else {
      discMat = new THREE.MeshPhysicalMaterial({
        color: SILVER,
        metalness: 1,
        roughness: 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1.4,
        normalMap: this._grooveTexture,
        normalScale: new THREE.Vector2(0.3, 0.3),
      });
    }
    this.disc = new THREE.Mesh(discGeo, discMat);
    this.spinGroup.add(this.disc);

    // --- Center label: matte near-black with gold NTB print ---
    const labelGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.05, isLow ? 32 : 64);
    const labelMat = new THREE.MeshStandardMaterial({
      color: NEAR_BLACK,
      roughness: 0.9,
      metalness: 0.2,
      map: this._labelTexture,
    });
    this.label = new THREE.Mesh(labelGeo, labelMat);
    this.spinGroup.add(this.label);

    // --- Gold framing ring around the label ---
    const goldMat = new THREE.MeshStandardMaterial({
      color: GOLD,
      metalness: 1,
      roughness: 0.2,
      envMapIntensity: 1.2,
    });
    const ringGeo = new THREE.TorusGeometry(0.76, 0.022, isLow ? 8 : 16, isLow ? 48 : 96);
    this.goldRing = new THREE.Mesh(ringGeo, goldMat);
    this.goldRing.rotation.x = Math.PI / 2;
    this.spinGroup.add(this.goldRing);

    // --- Small gold torus at the spindle hole (emissive pulse target) ---
    this.spindleMaterial = new THREE.MeshStandardMaterial({
      color: GOLD,
      metalness: 1,
      roughness: 0.25,
      emissive: new THREE.Color(GOLD),
      emissiveIntensity: 0.12,
    });
    const spindleGeo = new THREE.TorusGeometry(0.07, 0.025, isLow ? 8 : 12, isLow ? 24 : 48);
    this.spindle = new THREE.Mesh(spindleGeo, this.spindleMaterial);
    this.spindle.rotation.x = Math.PI / 2;
    this.spindle.position.y = 0.02;
    this.spinGroup.add(this.spindle);

    this._geometries = [discGeo, labelGeo, ringGeo, spindleGeo];
    this._materials = [discMat, labelMat, goldMat, this.spindleMaterial];
  }

  /**
   * @param {number} dt seconds
   * @param {number} idle 0..1 — 0 when reducedMotion (freezes spin + pulse)
   */
  update(dt, idle = 1) {
    this._time += dt * idle;
    this.spinGroup.rotation.y += this.spinSpeed * dt * idle;

    // Gentle gold emissive pulse on the spindle (contact section).
    const pulse = 0.12 + this.pulseWeight * (0.5 + 0.45 * Math.sin(this._time * 2.5) * idle);
    this.spindleMaterial.emissiveIntensity = pulse;
  }

  dispose() {
    for (const g of this._geometries) g.dispose();
    for (const m of this._materials) m.dispose();
    this._grooveTexture.dispose();
    this._labelTexture.dispose();
  }
}

/**
 * Procedural groove normal map — concentric sine rings, 512px.
 * Normals tilt radially; encoded as standard tangent-space RGB.
 */
function createGrooveNormalMap() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = size / 2;
  const freq = 0.9; // groove frequency per pixel of radius

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - half;
      const dy = y - half;
      const r = Math.sqrt(dx * dx + dy * dy);
      const i = (y * size + x) * 4;

      // Radial sine wave => derivative gives radial normal tilt.
      const wave = Math.cos(r * freq);
      // Fade grooves out near center (label area) and at very edge.
      const ringMask =
        r > 4 ? Math.min(1, Math.max(0, (r - 90) / 20)) * Math.min(1, Math.max(0, (half - r) / 10)) : 0;
      const amp = 0.55 * wave * ringMask;

      const nx = r > 0.0001 ? (dx / r) * amp : 0;
      const ny = r > 0.0001 ? (dy / r) * amp : 0;

      data[i] = Math.round(128 + nx * 127);
      data[i + 1] = Math.round(128 + ny * 127);
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Center label texture: near-black, "NTB" monogram + "NOTTOBAD RECORDS"
 * curved around it, all in gold.
 */
function createLabelTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  ctx.fillStyle = NEAR_BLACK;
  ctx.fillRect(0, 0, size, size);

  // Subtle gold inner circle
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 150, 0, Math.PI * 2);
  ctx.stroke();

  // Monogram
  ctx.fillStyle = GOLD;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 110px Georgia, "Times New Roman", serif';
  ctx.fillText('NTB', cx, cy + 4);

  // Curved wordmark around the monogram
  const text = 'NOTTOBAD RECORDS • NOTTOBAD RECORDS • ';
  const radius = 196;
  ctx.font = '600 30px Georgia, "Times New Roman", serif';
  const step = (Math.PI * 2) / text.length;
  for (let i = 0; i < text.length; i++) {
    const angle = i * step - Math.PI / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
