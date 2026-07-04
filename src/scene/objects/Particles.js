import * as THREE from 'three';

const VERTEX = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;

  uniform float uTime;
  uniform float uScroll;
  uniform float uSwirl;
  uniform float uFlatten;
  uniform float uPixelRatio;

  varying float vDepth;

  void main() {
    vec3 p = position;

    // Slow curl-ish drift seeded per particle.
    p.x += sin(uTime * 0.30 + aSeed * 17.0) * 0.6;
    p.y += cos(uTime * 0.23 + aSeed * 29.0) * 0.45;
    p.z += sin(uTime * 0.19 + aSeed * 41.0) * 0.5;

    // Vortex around Y axis: angle grows with uSwirl and proximity to axis.
    float dist = length(p.xz);
    float ang = uSwirl * (1.8 + 5.0 / (1.0 + dist)) + uSwirl * uTime * 0.35;
    float ca = cos(ang);
    float sa = sin(ang);
    p.xz = mat2(ca, -sa, sa, ca) * p.xz;

    // Collapse vertical spread into quantized horizontal bands (Events).
    float band = (floor(position.y / 2.0) + 0.5) * 2.0 * 0.3;
    p.y = mix(p.y, band, uFlatten);

    // Counter-parallax: particles rise as the page scrolls.
    p.y += uScroll * 6.0;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = max(1.0, aSize * uPixelRatio * (26.0 / max(0.001, -mv.z)));
    vDepth = clamp((-mv.z - 4.0) / 14.0, 0.0, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uGoldMix;
  uniform float uFade;

  varying float vDepth;

  void main() {
    // Soft round sprite.
    float d = distance(gl_PointCoord, vec2(0.5));
    float alpha = smoothstep(0.5, 0.08, d);
    if (alpha < 0.002) discard;

    vec3 silver = vec3(0.910, 0.910, 0.925);
    vec3 gold   = vec3(0.941, 0.839, 0.478);
    float mixF = clamp(vDepth * 0.55 + uGoldMix, 0.0, 1.0);
    vec3 col = mix(silver, gold, mixF);

    gl_FragColor = vec4(col, alpha * uFade * 0.85);
  }
`;

/**
 * Ambient chrome-dust particle field. Additive Points with a custom shader.
 * Count by tier: 1500 high / 500 med / 200 low / 0 reducedMotion.
 * When count is 0, `points` is null and all methods are safe no-ops.
 */
export default class Particles {
  constructor(quality = 'high', reducedMotion = false) {
    this.count = reducedMotion
      ? 0
      : quality === 'high'
        ? 1500
        : quality === 'med'
          ? 500
          : 200;

    this.points = null;
    this._geometry = null;
    this._material = null;

    this.uniforms = {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uSwirl: { value: 0 },
      uFlatten: { value: 0 },
      uGoldMix: { value: 0 },
      uFade: { value: 1 },
      uPixelRatio: { value: 1 },
    };

    if (this.count === 0) return;

    const positions = new Float32Array(this.count * 3);
    const seeds = new Float32Array(this.count);
    const sizes = new Float32Array(this.count);

    // Box ~16 x 10 x 8, centered slightly behind origin.
    for (let i = 0; i < this.count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
      seeds[i] = Math.random() * 100;
      sizes[i] = 0.8 + Math.random() * 2.4;
    }

    this._geometry = new THREE.BufferGeometry();
    this._geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this._geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    this._geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    this._material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this._geometry, this._material);
    this.points.frustumCulled = false;
  }

  setPixelRatio(pr) {
    this.uniforms.uPixelRatio.value = pr;
  }

  update(t) {
    this.uniforms.uTime.value = t;
  }

  dispose() {
    if (this._geometry) this._geometry.dispose();
    if (this._material) this._material.dispose();
  }
}
