import * as THREE from 'three';
import { getMat } from './materials.js';
import { scene } from './scene.js';

export function mkBox(x, y, z, w, h, d, color, castSh = true, recvSh = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), getMat(color));
  m.position.set(x, y + h / 2, z);
  if (castSh) m.castShadow = true;
  if (recvSh) m.receiveShadow = true;
  scene.add(m);
  return m;
}

export function mkPlane(x, z, w, d, color, y = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), getMat(color));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  scene.add(m);
  return m;
}
