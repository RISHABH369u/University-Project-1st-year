import { resizeRenderer } from './scene.js';
import { createGround } from './world/ground.js';
import { createRoads } from './world/roads.js';
import { createParking } from './world/parking.js';
import { createBuildings } from './world/buildings.js';
import { createGate } from './world/gate.js';
import { mkTree, mkPalm } from './utils/trees.js';
import { mkStreetLight } from './utils/lights.js';
import { mkBench, mkCar } from './utils/props.js';
import { setupInteraction } from './interaction.js';
import { animate } from './animate.js';
import { mkPlane } from './helpers.js';
import { mkWall } from './utils/wall.js';

createGround();
createRoads();
createParking();

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
mkWall(-62, -14, -14, -14);
mkWall(14, -14, 62, -14);
mkWall(-62, -14, -62, 88);
mkWall(62, -14, 62, 88);
mkWall(-62, 88, 62, 88);
mkWall(-42, 0, -42, 45, 2, 0xc8c4b0);
mkWall(36, 0, 36, 55, 2, 0xc8c4b0);

createBuildings();
createGate();

// trees
for (let z = -12; z <= 80; z += 4.8) {
  mkTree(-5.8, z, 0.82);
  mkTree(5.8, z, 0.82);
}
for (let x = -46; x <= -14; x += 5.5) {
  mkTree(x, 4, 0.9, 0x276b27);
  mkTree(x, 32, 0.88, 0x276b27);
}
for (let x = 28; x <= 44; x += 5) {
  mkTree(x, 18, 0.9);
  mkTree(x, 50, 0.9);
}
for (let x = -55; x <= 55; x += 7) mkTree(x, 84, 1.15, 0x1a5c1a);
for (let z = 0; z <= 80; z += 10) {
  mkTree(-58, z, 1.0, 0x1f5c1f);
  mkTree(58, z, 1.0, 0x1f5c1f);
}
mkPalm(-8, -8, 1.0); mkPalm(8, -8, 1.0);
mkPalm(-11, 2, 0.9); mkPalm(11, 2, 0.9);
for (let i = 0; i < 5; i++) {
  mkTree(8 + Math.cos(i * 1.25) * 5, 50 + Math.sin(i * 1.25) * 4, 0.78, 0x388E3C);
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
window.addEventListener('resize', resizeRenderer);
animate();
