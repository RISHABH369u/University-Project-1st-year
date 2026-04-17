import * as THREE from 'three';
import { scene } from '../scene.js';
import { getMat } from '../materials.js';

export function mkStreetLight(x, z) {
  const pMat = getMat(0x6a6a6a);
  const lMat = new THREE.MeshLambertMaterial({ color: 0xffff88, emissive: 0xffee44, emissiveIntensity: 0.6 });

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 8, 6), pMat);
  pole.position.set(x, 4, z);
  scene.add(pole);

  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 4), pMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(x + 0.9, 8, z);
  scene.add(arm);

  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 4), lMat);
  lamp.position.set(x + 2, 8, z);
  scene.add(lamp);

  return { pole, arm, lamp };
}
