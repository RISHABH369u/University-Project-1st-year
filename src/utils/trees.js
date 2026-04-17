import * as THREE from 'three';
import { scene } from '../scene.js';
import { getMat } from '../materials.js';

export function mkTree(x, z, s = 1, leaf = 0x2e7d32) {
  const g = new THREE.Group();

  const t = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22 * s, 0.3 * s, 2.8 * s, 6),
    getMat(0x6b3a18)
  );
  t.position.y = 1.4 * s;
  t.castShadow = true;
  g.add(t);

  const f1 = new THREE.Mesh(new THREE.SphereGeometry(1.7 * s, 7, 5), getMat(leaf));
  f1.position.y = 4.5 * s;
  f1.castShadow = true;
  g.add(f1);

  const f2 = new THREE.Mesh(
    new THREE.SphereGeometry(1.2 * s, 6, 4),
    getMat(leaf === 0x2e7d32 ? 0x388e3c : leaf)
  );
  f2.position.set(0.7 * s, 5.5 * s, 0.4 * s);
  f2.castShadow = true;
  g.add(f2);

  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

export function mkPalm(x, z, s = 1) {
  const g = new THREE.Group();

  const t = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15 * s, 0.22 * s, 7 * s, 6),
    getMat(0x9b7530)
  );
  t.position.y = 3.5 * s;
  t.castShadow = true;
  g.add(t);

  for (let i = 0; i < 6; i++) {
    const fr = new THREE.Mesh(
      new THREE.ConeGeometry(0.12 * s, 4 * s, 5),
      getMat(0x3a8820)
    );
    fr.position.y = 6.5 * s;
    fr.rotation.z = 0.65;
    fr.rotation.y = (Math.PI * 2 / 6) * i;
    g.add(fr);
  }

  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}
