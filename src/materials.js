import * as THREE from 'three';

const mats = {};

export function getMat(color) {
  if (!mats[color]) mats[color] = new THREE.MeshLambertMaterial({ color });
  return mats[color];
}

export function getRandomShade(baseColor, variance = 20) {
  const r = ((baseColor >> 16) & 255) + (Math.random() * variance - variance / 2);
  const g = ((baseColor >> 8) & 255) + (Math.random() * variance - variance / 2);
  const b = (baseColor & 255) + (Math.random() * variance - variance / 2);

  return new THREE.Color(
    Math.max(0, Math.min(255, r)) / 255,
    Math.max(0, Math.min(255, g)) / 255,
    Math.max(0, Math.min(255, b)) / 255
  );
}

export function makeLambert(color) {
  return new THREE.MeshLambertMaterial({ color });
}
