import * as THREE from 'three';
import { scene } from '../scene.js';
import { getMat } from '../materials.js';

export function createGate() {
  const wMat = getMat(0xf0f0f0);
  const bMat = getMat(0x1a4edd);
  const gMat = getMat(0x888888);

  const lp = new THREE.Mesh(new THREE.BoxGeometry(3.5, 9, 2.8), wMat);
  lp.position.set(-10, 4.5, -14); lp.castShadow = true; scene.add(lp);
  const rp = lp.clone(); rp.position.x = 10; scene.add(rp);

  const cap = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 3.5), wMat);
  const lc = cap.clone(); lc.position.set(-10, 9.35, -14); scene.add(lc);
  const rc = cap.clone(); rc.position.set(10, 9.35, -14); scene.add(rc);

  const banner = new THREE.Mesh(new THREE.BoxGeometry(26, 2.8, 1.4), bMat);
  banner.position.set(0, 9.8, -14); banner.castShadow = true; scene.add(banner);

  const strMat = getMat(0xffffff);
  const strip1 = new THREE.Mesh(new THREE.BoxGeometry(26, 0.28, 1.42), strMat);
  strip1.position.set(0, 8.5, -14); scene.add(strip1);
  const strip2 = strip1.clone(); strip2.position.y = 11.1; scene.add(strip2);

  const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.5, 16), getMat(0xf5f0e0));
  emblem.rotation.z = Math.PI / 2; emblem.position.set(-10, 9.8, -13.4); scene.add(emblem);
  const emblem2 = emblem.clone(); emblem2.position.x = 10; scene.add(emblem2);

  for (let xi of [-1, 1]) {
    for (let i = 1; i <= 5; i++) {
      const fp = new THREE.Mesh(new THREE.BoxGeometry(0.55, 4, 0.55), wMat);
      fp.position.set(xi * (10 + i * 3.2), 2, -14); scene.add(fp);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.18, 0.18), gMat);
      rail.position.set(xi * (10 + i * 3.2 - 1.5), 2.8, -14); scene.add(rail);
      const rail2 = rail.clone(); rail2.position.y = 1.2; scene.add(rail2);
    }
  }

  const cab = new THREE.Mesh(new THREE.BoxGeometry(3.8, 4, 3.8), getMat(0xeaeaea));
  cab.position.set(16, 2, -10); cab.castShadow = true; scene.add(cab);
  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.5, 4.4), getMat(0x777777));
  cabRoof.position.set(16, 4.25, -10); scene.add(cabRoof);
  cab.userData = {
    name: 'Security Cabin',
    icon: '👮',
    desc: '24/7 staffed security cabin at the main gate. All visitors must register here. Manages vehicle entry logs, visitor passes, and overall campus security.'
  };

  const zebra = [];
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.02, 1.4), getMat(0xe8e8e8));
    p.position.set(i * 2.2 - 4.4, 0.03, -8);
    scene.add(p);
    zebra.push(p);
  }

  return { cab, zebra };
}
