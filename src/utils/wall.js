import * as THREE from 'three';
import { scene } from '../scene.js';
import { getMat, getRandomShade } from '../materials.js';

export function mkWall(x1, z1, x2, z2, h = 2.6, color = 0xd2cfc0) {
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);

  const group = new THREE.Group();
  const baseHeight = h * 0.65;
  const grillHeight = h - baseHeight;

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(len, baseHeight, 0.6),
    new THREE.MeshLambertMaterial({ color: getRandomShade(color) })
  );
  base.position.y = baseHeight / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const segmentWidth = 2;
  const segments = Math.floor(len / segmentWidth);
  for (let i = 0; i < segments; i++) {
    const gx = -len / 2 + segmentWidth * i + segmentWidth / 2;
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, grillHeight, 0.08),
      getMat(0x444444)
    );
    bar.position.set(gx, baseHeight + grillHeight / 2, 0);
    group.add(bar);
  }

  const topBeam = new THREE.Mesh(
    new THREE.BoxGeometry(len, 0.15, 0.2),
    new THREE.MeshLambertMaterial({ color: getRandomShade(color) })
  );
  topBeam.position.y = h + 0.05;
  group.add(topBeam);

  const pillarGap = 4;
  const pillarCount = Math.floor(len / pillarGap);
  for (let i = 0; i <= pillarCount; i++) {
    const px = -len / 2 + i * pillarGap;
    const pillarHeight = h + 0.4;
    const pillarScaleY = 1 + Math.random() * 0.08;
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, pillarHeight, 0.8),
      new THREE.MeshLambertMaterial({ color: getRandomShade(color) })
    );
    pillar.scale.y = pillarScaleY;
    pillar.position.set(px, (pillarHeight * pillar.scale.y) / 2, 0);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);
  }

  group.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
  group.rotation.y = angle;
  scene.add(group);
  return group;
}
