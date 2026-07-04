import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Builds the PMREM environment for chrome reflections.
 * RoomEnvironment is augmented with two emissive planes — warm gold on one
 * side, cool white on the other — so reflections carry a gold/silver duality.
 *
 * Generates once, assigns scene.environment, disposes generator + room scene.
 * Returns the environment texture (caller owns disposal).
 */
export function createEnvironment(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const room = new RoomEnvironment();

  // Emissive light panels: for env baking, MeshBasicMaterial color acts as
  // emitted light; values > 1 give HDR intensity.
  const makePanel = (hex, intensity, w, h) => {
    const mat = new THREE.MeshBasicMaterial();
    mat.color.set(hex).multiplyScalar(intensity);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  };

  // Warm gold panel — left side, facing inward.
  const goldPanel = makePanel('#ffd27a', 4, 4, 6);
  goldPanel.position.set(-4.5, 2, 0);
  goldPanel.rotation.y = Math.PI / 2;
  room.add(goldPanel);

  // Cool white panel — right side, facing inward.
  const coolPanel = makePanel('#dfe6ff', 3, 4, 6);
  coolPanel.position.set(4.5, 2, 0);
  coolPanel.rotation.y = -Math.PI / 2;
  room.add(coolPanel);

  const envTexture = pmrem.fromScene(room, 0.04).texture;
  scene.environment = envTexture;

  // Cleanup: dispose room geometry/materials and the generator.
  if (typeof room.dispose === 'function') {
    room.dispose();
  } else {
    room.traverse((obj) => {
      if (obj.isMesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      }
    });
  }
  // Our added panels may not be covered by room.dispose() in all versions.
  goldPanel.geometry.dispose();
  goldPanel.material.dispose();
  coolPanel.geometry.dispose();
  coolPanel.material.dispose();

  pmrem.dispose();

  return envTexture;
}

export default createEnvironment;
