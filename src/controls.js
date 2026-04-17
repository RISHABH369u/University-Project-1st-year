import * as THREE from 'three';
import { orbit, updateCam } from './scene.js';

const keys = {};
let isDragging = false, prevX = 0, prevY = 0;
let dragDist = 0;
let lastT = null, pinchDist0 = 0;

window.addEventListener('mousedown', (e) => {
  isDragging = true;
  prevX = e.clientX;
  prevY = e.clientY;
  dragDist = 0;
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - prevX;
  const dy = e.clientY - prevY;
  dragDist += Math.abs(dx) + Math.abs(dy);
  orbit.theta -= dx * 0.0036;
  orbit.phi = Math.max(0.08, Math.min(1.5, orbit.phi + dy * 0.0036));
  prevX = e.clientX;
  prevY = e.clientY;
  updateCam();
});

window.addEventListener('wheel', (e) => {
  orbit.r = Math.max(15, Math.min(240, orbit.r + e.deltaY * 0.075));
  updateCam();
  e.preventDefault();
}, { passive: false });

window.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    lastT = e.touches[0];
    dragDist = 0;
  }
  if (e.touches.length === 2) {
    pinchDist0 = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (e.touches.length === 1 && lastT) {
    const t = e.touches[0];
    const dx = t.clientX - lastT.clientX;
    const dy = t.clientY - lastT.clientY;
    dragDist += Math.abs(dx) + Math.abs(dy);
    orbit.theta -= dx * 0.004;
    orbit.phi = Math.max(0.08, Math.min(1.5, orbit.phi + dy * 0.004));
    lastT = t;
    updateCam();
  } else if (e.touches.length === 2) {
    const d = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    orbit.r = Math.max(15, Math.min(240, orbit.r - (d - pinchDist0) * 0.28));
    pinchDist0 = d;
    updateCam();
  }
}, { passive: false });

window.addEventListener('touchend', () => { lastT = null; });

window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

export function handleControls() {
  const speed = 0.5;
  const dir = new THREE.Vector3();

  if (keys['a']) dir.x -= 1;
  if (keys['d']) dir.x += 1;
  if (keys['w']) dir.z -= 1;
  if (keys['s']) dir.z += 1;

  if (dir.length() > 0) {
    dir.normalize().multiplyScalar(speed);
    dir.applyEuler(new THREE.Euler(0, orbit.theta, 0));
    orbit.tx += dir.x;
    orbit.tz += dir.z;
    updateCam();
  }

  if (keys['q']) { orbit.r = Math.max(15, orbit.r - speed * 1.5); updateCam(); }
  if (keys['e']) { orbit.r = Math.min(240, orbit.r + speed * 1.5); updateCam(); }
}
