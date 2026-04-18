import * as THREE from 'three';
import { resizeRenderer, camera, scene, controls } from './scene.js';
import { createGround }    from './world/ground.js';
import { createRoads }     from './world/roads.js';
import { createParking }   from './world/parking.js';
import { createBuildings } from './utils/buildings.js';
import { createGate }      from './world/gate.js';
import { mkGulmohar, mkPeepal } from './utils/trees.js';
import { mkStreetLight }   from './utils/lights.js';
import { mkBench, mkCar }  from './utils/props.js';
import { setupInteraction } from './interaction.js';
import { animate }         from './animate.js';
import { mkPlane }         from './helpers.js';
import { mkWall }          from './utils/wall.js';
import { createBoundary }  from './world/boundary.js';
import { initDevTool, updateDevTool } from './devtool.js';  // ← DevTool

// ─── World ───────────────────────────────────────────────────────────────────
createGround();
createRoads();
createParking();
createBoundary();

// Lawns & open areas
mkPlane(0,   3,  9,  8, 0x4caf50, 0.01);
mkPlane(-10, 18, 10, 14, 0x4caf50, 0.01);
mkPlane(-26,  5, 16,  8, 0x4caf50, 0.01);
mkPlane(10,  50, 16, 14, 0x4caf50, 0.01);
mkPlane(-20, 62, 10, 12, 0x4caf50, 0.01);
mkPlane(4,   76, 28,  8, 0x4caf50, 0.01);
mkPlane(40,  62, 22, 24, 0x45a049, 0.01);
mkPlane(40,  62,  3, 14, 0xc2b260, 0.02);

createBuildings();
createGate();

// ─── Trees ───────────────────────────────────────────────────────────────────
for (let z = -12; z <= 80; z += 4.8) {
  mkGulmohar(-5.8, z, 0.82);
  mkGulmohar( 5.8, z, 0.82);
}
for (let x = -46; x <= -14; x += 5.5) {
  mkGulmohar(x,  4, 0.9, 0x276b27);
  mkGulmohar(x, 32, 0.88, 0x276b27);
}
for (let x = 28; x <= 44; x += 5) {
  mkGulmohar(x, 18, 0.9);
  mkGulmohar(x, 50, 0.9);
}
for (let x = -55; x <= 55; x += 7) mkGulmohar(x, 84, 1.15, 0x1a5c1a);
for (let z = 0; z <= 80; z += 10) {
  mkGulmohar(-58, z, 1.0, 0x1f5c1f);
  mkGulmohar( 58, z, 1.0, 0x1f5c1f);
}
mkPeepal(-8, -8, 1.0); mkPeepal( 8, -8, 1.0);
mkPeepal(-11,  2, 0.9); mkPeepal(11,  2, 0.9);
for (let i = 0; i < 5; i++) {
  mkGulmohar(8 + Math.cos(i * 1.25) * 5, 50 + Math.sin(i * 1.25) * 4, 0.78, 0x388E3C);
}

// ─── Street Lights ───────────────────────────────────────────────────────────
for (let z = -12; z <= 80; z += 12) {
  mkStreetLight(-7.5, z);
  mkStreetLight( 7.5, z);
}

// ─── Props ───────────────────────────────────────────────────────────────────
mkBench(-7, 8, 0);           mkBench(7, 8, 0);
mkBench(-6, 30, Math.PI / 2); mkBench(6, 30, Math.PI / 2);
mkBench(12, 50, 0);          mkBench(-12, 50, 0);

const carColors = [0xcc3333, 0x3355cc, 0xffffff, 0x333333, 0xddbb44, 0x228833];
const carSpots  = [
  [18,   3], [18,  6.5], [18, 10], [18, 13.5], [22, 3], [22, 6.5],
  [-14, 18], [-14, 21.5], [-18, 18], [-18, 21.5], [-22, 18],
];
carSpots.forEach(([x, z], i) => mkCar(x, z, carColors[i % 6]));

// ── DevTool Generated Objects START ──
// (Objects placed with the devtool will appear here after "Save to File")
// ── DevTool Generated Objects END ──

// ─── Interaction & Loop ──────────────────────────────────────────────────────
setupInteraction();

window.addEventListener('resize', resizeRenderer);

// NOTE: In animate.js, call updateDevTool() each frame:
//
//   import { updateDevTool } from './devtool.js';
//
//   export function animate() {
//     requestAnimationFrame(animate);
//     updateDevTool();           // ← add this
//     renderer.render(scene, camera);
//   }

initDevTool(); // ← starts the devtool UI & event listeners
animate();