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