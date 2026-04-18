import * as THREE from 'three';
import { resizeRenderer, camera, scene } from './scene.js'; 
import { createGround } from './world/ground.js';
import { createRoads } from './world/roads.js';
import { createParking } from './world/parking.js';
import { createBuildings } from './world/buildings.js';
import { createGate } from './world/gate.js';
import { mkGulmohar, mkPeepal } from './utils/trees.js';
import { mkStreetLight } from './utils/lights.js';
import { mkBench, mkCar } from './utils/props.js';
import { setupInteraction } from './interaction.js';
import { animate } from './animate.js';
import { mkPlane } from './helpers.js';
import { mkWall } from './utils/wall.js';
import { createBoundary } from './world/boundary.js';

createGround();
createRoads();
createParking();
createBoundary();

// lawns & open areas
mkPlane(0, 3, 9, 8, 0x4caf50, 0.01); 
mkPlane(-10, 18, 10, 14, 0x4caf50, 0.01); 
mkPlane(-26, 5, 16, 8, 0x4caf50, 0.01);
mkPlane(10, 50, 16, 14, 0x4caf50, 0.01);
mkPlane(-20, 62, 10, 12, 0x4caf50, 0.01);
mkPlane(4, 76, 28, 8, 0x4caf50, 0.01);
mkPlane(40, 62, 22, 24, 0x45a049, 0.01);
mkPlane(40, 62, 3, 14, 0xc2b260, 0.02);

// compound walls
// (Tumhara generated code yahan aayega jab tum final copy-paste karoge)

createBuildings();
createGate();

// trees
for (let z = -12; z <= 80; z += 4.8) {
  mkGulmohar(-5.8, z, 0.82);
  mkGulmohar(5.8, z, 0.82);
}
for (let x = -46; x <= -14; x += 5.5) {
  mkGulmohar(x, 4, 0.9, 0x276b27);
  mkGulmohar(x, 32, 0.88, 0x276b27);
}
for (let x = 28; x <= 44; x += 5) {
  mkGulmohar(x, 18, 0.9);
  mkGulmohar(x, 50, 0.9);
}
for (let x = -55; x <= 55; x += 7) mkGulmohar(x, 84, 1.15, 0x1a5c1a);
for (let z = 0; z <= 80; z += 10) {
  mkGulmohar(-58, z, 1.0, 0x1f5c1f);
  mkGulmohar(58, z, 1.0, 0x1f5c1f);
}
mkPeepal(-8, -8, 1.0); mkPeepal(8, -8, 1.0);
mkPeepal(-11, 2, 0.9); mkPeepal(11, 2, 0.9);
for (let i = 0; i < 5; i++) {
  mkGulmohar(8 + Math.cos(i * 1.25) * 5, 50 + Math.sin(i * 1.25) * 4, 0.78, 0x388E3C);
}

// street lights
for (let z = -12; z <= 80; z += 12) {
  mkStreetLight(-7.5, z);
  mkStreetLight(7.5, z);
}

// extra props
mkBench(-7, 8, 0); mkBench(7, 8, 0);
mkBench(-6, 30, Math.PI / 2); mkBench(6, 30, Math.PI / 2);
mkBench(12, 50, 0); mkBench(-12, 50, 0);

const carColors = [0xcc3333, 0x3355cc, 0xffffff, 0x333333, 0xddbb44, 0x228833];
const carSpots = [
  [18, 3], [18, 6.5], [18, 10], [18, 13.5], [22, 3], [22, 6.5],
  [-14, 18], [-14, 21.5], [-18, 18], [-18, 21.5], [-22, 18]
];
carSpots.forEach(([x, z], i) => mkCar(x, z, carColors[i % 6]));

setupInteraction();


// ======================================================================
// 🛠️ PRO DEVELOPER TOOL: IN-BROWSER LEVEL EDITOR
// ======================================================================

// 1. UI Overlay for Instructions
const editorUI = document.createElement('div');
editorUI.innerHTML = `
  <div style="position:fixed; top:20px; left:20px; background:rgba(10, 22, 40, 0.85); color:#88b8ff; padding:15px; border-radius:12px; font-family:sans-serif; font-size:13px; z-index:9999; pointer-events:none; border: 1px solid rgba(100, 160, 255, 0.3); backdrop-filter: blur(5px);">
    <h3 style="margin:0 0 10px 0; color:#fff; font-size:15px;">🛠️ Editor Mode</h3>
    <p style="margin:5px 0;"><b>Double Click:</b> Start / End Wall</p>
    <p style="margin:5px 0;"><b>Shift + Dbl Click:</b> Snap to Straight Line</p>
    <p style="margin:5px 0;"><b>Single Click:</b> Select Wall</p>
    <p style="margin:5px 0;"><b>Del / Backspace:</b> Remove Selected</p>
    <p style="margin:5px 0;"><b>Z key:</b> Undo Last Wall</p>
    <p style="margin:5px 0;"><b>Esc key:</b> Cancel / Unselect</p>
    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.2); margin:10px 0;">
    <p style="margin:0; color:#4caf50; font-weight:bold;">Press F12 for Code</p>
  </div>
`;
document.body.appendChild(editorUI);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let clickCount = 0;
let startX = 0, startZ = 0;

// Editor State
const drawnWalls = []; // Banayi hui walls store karne ke liye
let selectedWall = null;

// Bounding Box for Highlighting Selected Wall
const selectionBox = new THREE.BoxHelper(new THREE.Mesh(), 0xffff00);
selectionBox.visible = false;
scene.add(selectionBox);

// Start point marker (Red dot)
const markerGeom = new THREE.SphereGeometry(0.5);
const markerMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const tempMarker = new THREE.Mesh(markerGeom, markerMat);
tempMarker.visible = false;
scene.add(tempMarker);

// Helper function: Console mein sab code ek sath print karne ke liye
function printAllCode() {
  console.clear();
  console.log("%c✅ COPY THIS ENTIRE BLOCK TO main.js:", "color: #00ffff; font-size: 16px; font-weight: bold;");
  drawnWalls.forEach(wall => console.log(wall.userData.code));
  console.log("%c---------------------------------------", "color: #00ffff;");
}

// Single Click -> Selection
window.addEventListener('click', (event) => {
  if (event.detail > 1) return; // Double click ignore karo
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  let found = false;
  // Har drawn wall ke andar check karo click hua hai kya
  for (const wall of drawnWalls) {
    const intersects = raycaster.intersectObjects(wall.children, true);
    if (intersects.length > 0) {
      selectedWall = wall;
      selectionBox.setFromObject(wall); // Highlight box lagao
      selectionBox.visible = true;
      found = true;
      break;
    }
  }
  if (!found) {
    selectedWall = null;
    selectionBox.visible = false;
  }
});

// Double Click -> Draw
window.addEventListener('dblclick', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersectPoint = new THREE.Vector3();
  
  if (raycaster.ray.intersectPlane(groundPlane, intersectPoint)) {
    // Agar Shift daba hai toh 0.5 ke multiple pe round off (Snapping)
    let x = event.shiftKey ? Math.round(intersectPoint.x * 2) / 2 : Math.round(intersectPoint.x * 10) / 10;
    let z = event.shiftKey ? Math.round(intersectPoint.z * 2) / 2 : Math.round(intersectPoint.z * 10) / 10;

    if (clickCount === 0) {
      startX = x; startZ = z;
      tempMarker.position.set(startX, 0.5, startZ);
      tempMarker.visible = true;
      clickCount = 1;
    } else {
      // Wall banao aur array mein daalo
      const wallGroup = mkWall(startX, startZ, x, z);
      wallGroup.userData = { code: `mkWall(${startX}, ${startZ}, ${x}, ${z});` };
      drawnWalls.push(wallGroup);
      
      tempMarker.visible = false;
      clickCount = 0;
      printAllCode();
    }
  }
});

// Keyboard Shortcuts (Delete, Undo, Esc)
window.addEventListener('keydown', (event) => {
  // ESC: Cancel drawing
  if (event.key === 'Escape') {
    clickCount = 0;
    tempMarker.visible = false;
    selectedWall = null;
    selectionBox.visible = false;
  }
  
  // Delete / Backspace: Remove selected wall
  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedWall) {
    scene.remove(selectedWall); // Screen se hatao
    const index = drawnWalls.indexOf(selectedWall);
    if (index > -1) drawnWalls.splice(index, 1); // Array se hatao
    
    selectedWall = null;
    selectionBox.visible = false;
    printAllCode(); // Naya code print karo jisme ye wall nahi hogi
  }

  // 'Z' (Undo): Remove last drawn wall
  if ((event.key === 'z' || event.key === 'Z') && clickCount === 0 && drawnWalls.length > 0) {
    const lastWall = drawnWalls.pop();
    scene.remove(lastWall);
    if (selectedWall === lastWall) {
      selectedWall = null;
      selectionBox.visible = false;
    }
    printAllCode();
  }
});
// ======================================================================

window.addEventListener('resize', resizeRenderer);
animate();