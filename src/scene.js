import * as THREE from 'three';

export const canvas = document.getElementById('c');

export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec8e3);
scene.fog = new THREE.Fog(0x9dd8ed, 150, 320);

export const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 600);

export const orbit = { theta: -0.45, phi: 0.68, r: 120, tx: 0, ty: 0, tz: 32 };

export function updateCam() {
  camera.position.set(
    orbit.tx + orbit.r * Math.sin(orbit.phi) * Math.sin(orbit.theta),
    orbit.ty + orbit.r * Math.cos(orbit.phi),
    orbit.tz + orbit.r * Math.sin(orbit.phi) * Math.cos(orbit.theta)
  );
  camera.lookAt(orbit.tx, 0, orbit.tz);
}

updateCam();

// ─── Controls shim ───────────────────────────────────────────────────────────
// This is NOT a real OrbitControls instance — it's a compatibility bridge so
// the devtool's TransformControls can:
//   1. Disable orbit dragging while moving/rotating a gizmo  (controls.enabled)
//   2. Focus camera on a selected object                      (controls.target + controls.update)
// Your interaction.js must check `controls.enabled` before processing mouse input.

export const controls = {
  enabled: true,

  // Mirrors the orbit look-at point so devtool's F-key focus works
  target: new THREE.Vector3(orbit.tx, 0, orbit.tz),

  // Called by devtool after it sets controls.target — applies to your orbit system
  update() {
    orbit.tx = this.target.x;
    orbit.tz = this.target.z;
    updateCam();
  },
};
// ─────────────────────────────────────────────────────────────────────────────

scene.add(new THREE.AmbientLight(0xffeedd, 0.62));
scene.add(new THREE.HemisphereLight(0x87ceeb, 0x3a6820, 0.45));

const sun = new THREE.DirectionalLight(0xfff8e8, 1.18);
sun.position.set(80, 110, 70);
sun.castShadow = true;
sun.shadow.mapSize.width  = 4096;
sun.shadow.mapSize.height = 4096;
sun.shadow.camera.left   = -140;
sun.shadow.camera.right  =  140;
sun.shadow.camera.top    =  140;
sun.shadow.camera.bottom = -140;
sun.shadow.camera.near   = 1;
sun.shadow.camera.far    = 500;
sun.shadow.bias          = -0.001;
scene.add(sun);

export function resizeRenderer() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}