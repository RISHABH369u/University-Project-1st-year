import * as THREE from 'three';
import { scene } from '../scene.js';
import { getMat, getRandomShade } from '../materials.js';

// 🌳 REALISTIC TREE
export function mkTree(x, z, s = 1, leaf = 0x2e7d32) {
  const g = new THREE.Group();

  // 🔥 random scale (no same trees)
  const scale = s * (0.8 + Math.random() * 0.4);

  // 🌲 TRUNK (slightly uneven)
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2 * scale, 0.3 * scale, 3 * scale, 8),
    new THREE.MeshLambertMaterial({
      color: getRandomShade(0x6b3a18, 30)
    })
  );
  trunk.position.y = 1.5 * scale;
  trunk.castShadow = true;
  g.add(trunk);

  // 🌿 LEAF LAYER 1 (bottom)
  const leaf1 = new THREE.Mesh(
    new THREE.SphereGeometry(1.8 * scale, 10, 8),
    new THREE.MeshLambertMaterial({
      color: getRandomShade(leaf, 40)
    })
  );
  leaf1.position.y = 4 * scale;
  leaf1.scale.y = 0.8; // flatten for realism
  g.add(leaf1);

  // 🌿 LEAF LAYER 2 (middle)
  const leaf2 = new THREE.Mesh(
    new THREE.SphereGeometry(1.5 * scale, 10, 8),
    new THREE.MeshLambertMaterial({
      color: getRandomShade(leaf, 30)
    })
  );
  leaf2.position.set(
    (Math.random() - 0.5) * 0.5,
    5.2 * scale,
    (Math.random() - 0.5) * 0.5
  );
  g.add(leaf2);

  // 🌿 LEAF LAYER 3 (top)
  const leaf3 = new THREE.Mesh(
    new THREE.SphereGeometry(1.2 * scale, 10, 8),
    new THREE.MeshLambertMaterial({
      color: getRandomShade(leaf, 25)
    })
  );
  leaf3.position.y = 6.2 * scale;
  g.add(leaf3);

  // 🎯 slight tilt (natural feel)
  g.rotation.z = (Math.random() - 0.5) * 0.1;
  g.rotation.x = (Math.random() - 0.5) * 0.05;

  g.position.set(x, 0, z);
  scene.add(g);

  return g;
}



export function mkPalm(x, z, s = 1) {
  const g = new THREE.Group();

  const scale = s * (0.9 + Math.random() * 0.3);

  // trunk
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15 * scale, 0.25 * scale, 7 * scale, 8),
    new THREE.MeshLambertMaterial({
      color: getRandomShade(0x9b7530, 30)
    })
  );
  trunk.position.y = 3.5 * scale;
  trunk.castShadow = true;
  g.add(trunk);

  // leaves (curved feel)
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.15 * scale, 4 * scale, 6),
      new THREE.MeshLambertMaterial({
        color: getRandomShade(0x2e7d32, 40)
      })
    );

    leaf.position.y = 6.5 * scale;
    leaf.rotation.z = 0.8;
    leaf.rotation.y = (Math.PI * 2 / 6) * i;

    g.add(leaf);
  }

  g.rotation.z = (Math.random() - 0.5) * 0.1;

  g.position.set(x, 0, z);
  scene.add(g);

  return g;
}