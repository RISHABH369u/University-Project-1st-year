import * as THREE from 'three';
import { scene } from '../scene.js';
import { getMat } from '../materials.js';

export function mkBench(x, z, rotY = 0) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.55), getMat(0x8b5e3c));
  seat.position.y = 0.5; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 0.12), getMat(0x8b5e3c));
  back.position.set(0, 0.88, 0.22); g.add(back);
  for (let xi of [-0.85, 0.85]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.55), getMat(0x555555));
    leg.position.set(xi, 0.25, 0); g.add(leg);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
  return g;
}

export function mkCar(x, z, color, rotY = 0) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1, 1.8), getMat(color));
  body.position.y = 0.7; g.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.75, 1.6), getMat(color));
  top.position.set(-0.3, 1.58, 0); g.add(top);
  for (let wx of [-1.4, 1.4]) {
    for (let wz of [-0.85, 0.85]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.22, 8), getMat(0x222222));
      wh.rotation.z = Math.PI / 2; wh.position.set(wx, 0.38, wz); g.add(wh);
    }
  }
  g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g);
  return g;
}
