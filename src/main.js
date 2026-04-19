import * as THREE from 'three';
import { resizeRenderer, camera, scene, controls } from './scene.js';
import { createGround } from './world/ground.js';
import { createRoads } from './world/roads.js';
import { createParking } from './world/parking.js';
import { createBuildings } from './utils/buildings.js';
import { createGate } from './world/gate.js';
import { mkGulmohar, mkPeepal } from './utils/trees.js';
import { mkStreetLight } from './utils/lights.js';
import { mkBench, mkCar } from './utils/props.js';
import { setupInteraction } from './interaction.js';
import { animate } from './animate.js';
import { mkPlane } from './helpers.js';
import { mkWall } from './utils/wall.js';
import { createBoundary } from './world/boundary.js';
import { initDevTool } from './devtool.js';
import { initPlayer, enterPlayerMode, exitPlayerMode, isPlayerActive } from './player.js';

// ─── World ───────────────────────────────────────────────────────────────────
createGround();
// createRoads();
// createParking();
// createBoundary();

// Lawns & open areas
// mkPlane(0,   3,  9,  8, 0x4caf50, 0.01);
// mkPlane(-10, 18, 10, 14, 0x4caf50, 0.01);
// mkPlane(-26,  5, 16,  8, 0x4caf50, 0.01);
// mkPlane(10,  50, 16, 14, 0x4caf50, 0.01);
// mkPlane(-20, 62, 10, 12, 0x4caf50, 0.01);
// mkPlane(4,   76, 28,  8, 0x4caf50, 0.01);
// mkPlane(40,  62, 22, 24, 0x45a049, 0.01);
// mkPlane(40,  62,  3, 14, 0xc2b260, 0.02);

// createBuildings();
// createGate();

// ── DevTool Generated Objects START ──
// (Objects placed with the devtool will appear here after "Save to File")
// ── DevTool Generated Objects END ──

// ─── Interaction & Loop ──────────────────────────────────────────────────────
setupInteraction();
initPlayer();

window.addEventListener('resize', resizeRenderer);

// Player buttons
const playerBtn = document.getElementById('player-btn');
const exitBtn = document.getElementById('exit-btn');

playerBtn?.addEventListener('click', () => {
  enterPlayerMode();
  if (controls) controls.enabled = false;
});

exitBtn?.addEventListener('click', () => {
  exitPlayerMode();
  if (controls) controls.enabled = true;
});

// Speed badge update
window.addEventListener('keydown', (e) => {
  if (!isPlayerActive()) return;

  const badge = document.getElementById('speed-badge');
  if (!badge) return;

  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    badge.textContent = '🏃 Running';
  }
});

window.addEventListener('keyup', (e) => {
  if (!isPlayerActive()) return;

  const badge = document.getElementById('speed-badge');
  if (!badge) return;

  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    badge.textContent = '🚶 Walking';
  }
});

// Pointer lock overlay
document.addEventListener('pointerlockchange', () => {
  const overlay = document.getElementById('lock-overlay');
  if (!overlay) return;

  const locked = !!(
    document.pointerLockElement ||
    document.mozPointerLockElement ||
    document.webkitPointerLockElement
  );

  overlay.style.display = isPlayerActive() && !locked ? 'block' : 'none';
});

// Mobile sprint button
const sprintBtn = document.getElementById('mobile-sprint');
sprintBtn?.addEventListener(
  'touchstart',
  (e) => {
    e.preventDefault();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
  },
  { passive: false }
);

sprintBtn?.addEventListener('touchend', () => {
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft' }));
});

initDevTool();
animate();