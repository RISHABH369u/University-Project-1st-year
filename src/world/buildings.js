import * as THREE from 'three';
import { scene } from '../scene.js';
import { getMat } from '../materials.js';

export const clickable = [];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MATERIAL CACHE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const MAT = {
  wall:        new THREE.MeshLambertMaterial({ color: 0xf2f2f0 }),   // white-ish campus wall
  wallShade:   new THREE.MeshLambertMaterial({ color: 0xe0dedd }),   // slightly darker wall
  concrete:    new THREE.MeshLambertMaterial({ color: 0xd0cfc8 }),   // grey concrete
  roofTop:     new THREE.MeshLambertMaterial({ color: 0xc8c8c0 }),   // flat roof slab
  parapet:     new THREE.MeshLambertMaterial({ color: 0xdeded8 }),   // parapet wall
  column:      new THREE.MeshLambertMaterial({ color: 0xe8e8e4 }),   // white columns
  window:      new THREE.MeshLambertMaterial({ color: 0x6a9ec0, emissive: 0x1a3050, emissiveIntensity: 0.15 }),
  windowDark:  new THREE.MeshLambertMaterial({ color: 0x4a7090, emissive: 0x0a1828, emissiveIntensity: 0.2 }),
  door:        new THREE.MeshLambertMaterial({ color: 0x3a3028 }),
  steel:       new THREE.MeshLambertMaterial({ color: 0x999990 }),
  corridor:    new THREE.MeshLambertMaterial({ color: 0xb8b8b0 }),   // covered corridor band
  sunshade:    new THREE.MeshLambertMaterial({ color: 0xccccb8 }),   // window sun shade
  tankGrey:    new THREE.MeshLambertMaterial({ color: 0x8a8a80 }),
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  FLOOR HEIGHT  (realistic for Indian university)
//  Ground + floors: each floor ~3.6m clear height
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const FLOOR_H = 3.8;   // height per floor in units

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CORE BUILDING GENERATOR
//  Realistic Indian government university style:
//  - White walls, horizontal window bands
//  - Sun shades above every window row
//  - Vertical pilaster columns
//  - Exposed corridor slab bands between floors
//  - Detailed rooftop (parapet + water tanks)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function addBuilding({
  x, z,
  w, d,                      // width (X), depth (Z)
  floors = 3,
  name = 'Building',
  desc  = '',
  icon  = '🏢',
  rotY  = 0,                 // rotate whole building
  wallMat = MAT.wall,
  hasPortico = false,        // covered front entrance
  hasTower   = false,        // taller central tower element
}) {
  const totalH = floors * FLOOR_H;
  const group  = new THREE.Group();

  // ── 1. MAIN BODY ──────────────────────────────
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, totalH, d),
    wallMat
  );
  body.position.y = totalH / 2;
  body.castShadow  = true;
  body.receiveShadow = true;
  body.userData = { name, desc, icon };
  group.add(body);
  clickable.push(body);

  // ── 2. FLOOR SLAB BANDS (corridor look) ──────
  //  Each floor has a slightly darker slab band at the ceiling level
  for (let f = 1; f <= floors; f++) {
    const slabY = f * FLOOR_H;
    // Slab overhang (projects out slightly on front & back)
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.5, 0.55, d + 0.6),
      MAT.corridor
    );
    slab.position.y = slabY;
    slab.castShadow = true;
    group.add(slab);
  }

  // ── 3. WINDOW BANDS per floor ─────────────────
  const winW    = 1.4;   // window width
  const winH    = 1.6;   // window height
  const winGap  = 0.55;  // gap between windows
  const shadeD  = 0.35;  // sun-shade depth

  // Front (positive Z face) and back windows
  for (let face of ['front', 'back']) {
    const faceZ   = face === 'front' ? d / 2 : -d / 2;
    const faceDir = face === 'front' ? 1 : -1;

    const cols = Math.max(2, Math.floor(w / (winW + winGap)));
    const spacing = w / cols;

    for (let f = 0; f < floors; f++) {
      const wy = f * FLOOR_H + FLOOR_H * 0.48;

      for (let c = 0; c < cols; c++) {
        const wx = -w / 2 + spacing * (c + 0.5);

        // Window pane
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(winW, winH),
          f === 0 ? MAT.windowDark : MAT.window
        );
        win.position.set(wx, wy, faceZ + 0.02 * faceDir);
        if (face === 'back') win.rotation.y = Math.PI;
        group.add(win);

        // Sun shade (chajja) above window
        const shade = new THREE.Mesh(
          new THREE.BoxGeometry(winW + 0.25, 0.1, shadeD),
          MAT.sunshade
        );
        shade.position.set(
          wx,
          wy + winH / 2 + 0.12,
          faceZ + (shadeD / 2 + 0.05) * faceDir
        );
        group.add(shade);
      }
    }
  }

  // Side windows
  for (let face of ['left', 'right']) {
    const faceX   = face === 'left' ? -w / 2 : w / 2;
    const faceDir = face === 'left' ? -1 : 1;
    const cols = Math.max(1, Math.floor(d / (winW + winGap)));
    const spacing = d / cols;

    for (let f = 0; f < floors; f++) {
      const wy = f * FLOOR_H + FLOOR_H * 0.48;
      for (let c = 0; c < cols; c++) {
        const wz = -d / 2 + spacing * (c + 0.5);
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(winW, winH),
          MAT.window
        );
        win.rotation.y = face === 'left' ? -Math.PI / 2 : Math.PI / 2;
        win.position.set(faceX + 0.02 * faceDir, wy, wz);
        group.add(win);

        const shade = new THREE.Mesh(
          new THREE.BoxGeometry(shadeD, 0.1, winW + 0.2),
          MAT.sunshade
        );
        shade.position.set(
          faceX + (shadeD / 2 + 0.05) * faceDir,
          wy + winH / 2 + 0.12,
          wz
        );
        group.add(shade);
      }
    }
  }

  // ── 4. VERTICAL PILASTERS ─────────────────────
  //  Thin vertical strips every ~4m for classic look
  const pilCols = Math.max(2, Math.floor(w / 4));
  for (let i = 0; i <= pilCols; i++) {
    const px = -w / 2 + (w / pilCols) * i;
    // Front pilaster
    const pil = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, totalH + 0.6, 0.32),
      MAT.column
    );
    pil.position.set(px, totalH / 2, d / 2 + 0.16);
    group.add(pil);
    // Back pilaster
    const pilB = pil.clone();
    pilB.position.z = -d / 2 - 0.16;
    group.add(pilB);
  }
  // Side pilasters
  const pilRows = Math.max(1, Math.floor(d / 4));
  for (let i = 0; i <= pilRows; i++) {
    const pz = -d / 2 + (d / pilRows) * i;
    for (let side of [-1, 1]) {
      const pil = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, totalH + 0.6, 0.32),
        MAT.column
      );
      pil.position.set(side * (w / 2 + 0.16), totalH / 2, pz);
      group.add(pil);
    }
  }

  // ── 5. ENTRANCE DOOR + PORTICO ────────────────
  const doorW = 2.4, doorH = 3.0;
  const doorPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(doorW, doorH),
    MAT.door
  );
  doorPanel.position.set(0, doorH / 2, d / 2 + 0.03);
  group.add(doorPanel);

  // Door frame
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.4, 0.2, 0.18), MAT.column);
  frameTop.position.set(0, doorH + 0.1, d / 2 + 0.03); group.add(frameTop);

  if (hasPortico) {
    // Covered portico / porch in front of entrance
    const porticoW = Math.min(w * 0.55, 18);
    const porticoD = 3.5;
    const porticoH = FLOOR_H * 0.9;

    // Portico roof slab
    const pRoof = new THREE.Mesh(
      new THREE.BoxGeometry(porticoW, 0.4, porticoD),
      MAT.corridor
    );
    pRoof.position.set(0, porticoH, d / 2 + porticoD / 2);
    pRoof.castShadow = true;
    group.add(pRoof);

    // Portico columns
    const numPCols = Math.max(2, Math.round(porticoW / 4));
    for (let i = 0; i <= numPCols; i++) {
      const px = -porticoW / 2 + (porticoW / numPCols) * i;
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.34, porticoH, 8),
        MAT.column
      );
      col.position.set(px, porticoH / 2, d / 2 + porticoD);
      col.castShadow = true;
      group.add(col);

      // Column base plinth
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.35, 0.72), MAT.column);
      plinth.position.set(px, 0.18, d / 2 + porticoD);
      group.add(plinth);
      // Column cap
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.28, 0.72), MAT.column);
      cap.position.set(px, porticoH - 0.14, d / 2 + porticoD);
      group.add(cap);
    }

    // Portico beam connecting columns to wall
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(porticoW + 0.5, 0.35, 0.28),
      MAT.column
    );
    beam.position.set(0, porticoH - 0.18, d / 2 + 0.14);
    group.add(beam);
  }

  // ── 6. OPTIONAL CENTRAL TOWER ─────────────────
  if (hasTower) {
    const twW = Math.min(w * 0.25, 10), twD = d * 0.55;
    const twH = FLOOR_H * 1.5; // 1.5 floors taller
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(twW, twH, twD),
      MAT.wallShade
    );
    tower.position.y = totalH + twH / 2;
    tower.castShadow = true;
    group.add(tower);

    // Tower slab
    const twSlab = new THREE.Mesh(
      new THREE.BoxGeometry(twW + 0.5, 0.5, twD + 0.5),
      MAT.corridor
    );
    twSlab.position.y = totalH + twH + 0.25;
    group.add(twSlab);
  }

  // ── 7. ROOFTOP ────────────────────────────────
  // Main roof slab (slight overhang)
  const roofSlab = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6),
    MAT.roofTop
  );
  roofSlab.position.y = totalH + 0.25;
  roofSlab.castShadow = true;
  group.add(roofSlab);

  // Parapet wall (low wall around roof edge)
  const parapetH = 1.1;
  const parFront = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, parapetH, 0.28), MAT.parapet);
  parFront.position.set(0, totalH + parapetH / 2 + 0.5, d / 2 + 0.46);
  group.add(parFront);
  const parBack = parFront.clone(); parBack.position.z = -d / 2 - 0.46; group.add(parBack);
  const parLeft = new THREE.Mesh(new THREE.BoxGeometry(0.28, parapetH, d + 0.6), MAT.parapet);
  parLeft.position.set(-w / 2 - 0.46, totalH + parapetH / 2 + 0.5, 0);
  group.add(parLeft);
  const parRight = parLeft.clone(); parRight.position.x = w / 2 + 0.46; group.add(parRight);

  // Parapet notch gaps (decorative crenels)
  const notchCount = Math.floor(w / 3);
  for (let i = 0; i < notchCount; i++) {
    const nx = -w / 2 + (w / notchCount) * (i + 0.5);
    const notch = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, parapetH + 0.1, 0.35),
      new THREE.MeshLambertMaterial({ color: 0xd8d8d0 })
    );
    notch.position.set(nx, totalH + parapetH / 2 + 0.5, d / 2 + 0.47);
    group.add(notch);
    const notchB = notch.clone();
    notchB.position.z = -d / 2 - 0.47;
    group.add(notchB);
  }

  // Water tank(s) on roof
  const tankCount = Math.max(1, Math.floor(w / 20));
  for (let t = 0; t < tankCount; t++) {
    const tx = -w / 3 + (w / Math.max(2, tankCount)) * t;
    const tankBody = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 2.4, 10),
      MAT.tankGrey
    );
    tankBody.position.set(tx, totalH + 2, -d / 4);
    group.add(tankBody);
    const tankLid = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.35, 0.25, 10),
      MAT.steel
    );
    tankLid.position.set(tx, totalH + 3.3, -d / 4);
    group.add(tankLid);

    // Tank support legs
    for (let leg = 0; leg < 4; leg++) {
      const lx = tx + Math.cos((Math.PI / 2) * leg) * 0.9;
      const lz = -d / 4 + Math.sin((Math.PI / 2) * leg) * 0.9;
      const legMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 1.1, 4),
        MAT.steel
      );
      legMesh.position.set(lx, totalH + 0.55, lz);
      group.add(legMesh);
    }
  }

  // AC / utility boxes on roof (scattered)
  for (let ac = 0; ac < Math.floor(w / 7); ac++) {
    const acMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.55, 0.8),
      MAT.steel
    );
    acMesh.position.set(
      -w / 2 + 3 + ac * 7 + Math.random() * 2,
      totalH + 0.78,
      d / 4 + (Math.random() - 0.5) * d * 0.3
    );
    group.add(acMesh);
  }

  // ── 8. GROUND FLOOR PLINTH ────────────────────
  // Raised plinth around base (common in Indian buildings)
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.9, 0.55, d + 0.9),
    MAT.concrete
  );
  plinth.position.y = 0.28;
  plinth.receiveShadow = true;
  group.add(plinth);

  // ── 9. STEPS at main entrance ─────────────────
  for (let s = 0; s < 3; s++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(3.5 - s * 0.5, 0.18, 0.55),
      MAT.concrete
    );
    step.position.set(0, s * 0.18, d / 2 + 0.55 + s * 0.55);
    group.add(step);
  }

  group.position.set(x, 0, z);
  group.rotation.y = rotY;
  scene.add(group);
  return group;
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  L-SHAPED BUILDING HELPER
//  Creates two connected wings as one logical building
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function addLBuilding({
  x, z,
  wing1: w1,    // { w, d, floors, offsetX, offsetZ }
  wing2: w2,    // same
  name, desc, icon = '🏢',
}) {
  // Wing 1 (usually the long horizontal one)
  addBuilding({
    x: x + (w1.offsetX || 0),
    z: z + (w1.offsetZ || 0),
    w: w1.w, d: w1.d,
    floors: w1.floors,
    name, desc, icon,
    hasPortico: w1.hasPortico || false,
    hasTower:   w1.hasTower   || false,
  });

  // Wing 2 (perpendicular or offset wing)
  addBuilding({
    x: x + (w2.offsetX || 0),
    z: z + (w2.offsetZ || 0),
    w: w2.w, d: w2.d,
    floors: w2.floors,
    name: name + ' (Wing B)',
    desc, icon,
    hasPortico: false,
    hasTower:   false,
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SPORTS COURT  (matches real green/red court)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function addSportsCourt(x, z) {
  const g = new THREE.Group();

  // Court base (green)
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(24, 0.12, 14),
    new THREE.MeshLambertMaterial({ color: 0x2d8a4e })
  );
  base.position.y = 0.06;
  base.receiveShadow = true;
  g.add(base);

  // Red border strip
  const borderMat = new THREE.MeshLambertMaterial({ color: 0xcc2222 });
  for (let [bx, bz, bw, bd] of [
    [0,        -6.5,   24,   1  ],  // front border
    [0,         6.5,   24,   1  ],  // back border
    [-11.5,     0,      1,  14  ],  // left border
    [ 11.5,     0,      1,  14  ],  // right border
  ]) {
    const border = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.13, bd), borderMat);
    border.position.set(bx, 0.065, bz);
    g.add(border);
  }

  // Court lines (white)
  const lineMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  // Center line
  const cl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 12), lineMat);
  cl.position.y = 0.07; g.add(cl);
  // Center circle
  const cc = new THREE.Mesh(new THREE.TorusGeometry(2, 0.08, 4, 20), lineMat);
  cc.rotation.x = Math.PI / 2; cc.position.y = 0.14; g.add(cc);
  // 3-point line approximation (box arcs)
  for (let side of [-1, 1]) {
    const threeP = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.08, 4, 20, Math.PI), lineMat);
    threeP.rotation.x = Math.PI / 2;
    threeP.rotation.z = side === 1 ? 0 : Math.PI;
    threeP.position.set(side * 8.5, 0.14, 0);
    g.add(threeP);
  }

  // Boundary fence / low wall
  const fenceMat = new THREE.MeshLambertMaterial({ color: 0x888880 });
  for (let [fx, fz, fw, fd] of [
    [0, -8, 26, 0.2],
    [0,  8, 26, 0.2],
    [-13, 0, 0.2, 16],
    [ 13, 0, 0.2, 16],
  ]) {
    const fence = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.8, fd), fenceMat);
    fence.position.set(fx, 0.4, fz);
    g.add(fence);
  }

  // Flood lights (poles)
  for (let [lx, lz] of [[-11, -7], [11, -7], [-11, 7], [11, 7]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 9, 6), fenceMat);
    pole.position.set(lx, 4.5, lz); g.add(pole);
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.3, 0.6),
      new THREE.MeshLambertMaterial({ color: 0xffffcc, emissive: 0xffff88, emissiveIntensity: 0.5 })
    );
    light.position.set(lx, 9.2, lz); g.add(light);
  }

  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CANTEEN  (separate detailed version)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function addCanteen(x, z) {
  const g = new THREE.Group();

  // Main structure — single floor but tall
  const h = 4.5;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(18, h, 12),
    MAT.wall
  );
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  body.userData = { name: 'University Canteen', icon: '🍽️', desc: 'Main canteen serving affordable vegetarian meals, snacks, samosas, tea, coffee. Open 8 AM – 7 PM on working days.' };
  clickable.push(body);
  g.add(body);

  // Flat roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(18.6, 0.4, 12.6), MAT.roofTop);
  roof.position.y = h + 0.2; roof.castShadow = true; g.add(roof);

  // Parapet
  const par = new THREE.Mesh(new THREE.BoxGeometry(18.6, 0.8, 0.22), MAT.parapet);
  par.position.set(0, h + 0.9, 6.4); g.add(par);
  const parB = par.clone(); parB.position.z = -6.4; g.add(parB);

  // Large open front (like a dhaba — open-air counter)
  const counterMat = new THREE.MeshLambertMaterial({ color: 0xc0b090 });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(14, 1.05, 1.2), counterMat);
  counter.position.set(0, 0.52, 7.5); g.add(counter);

  // Signboard
  const signMat = new THREE.MeshLambertMaterial({ color: 0x1a6e2a });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(10, 1.0, 0.18), signMat);
  sign.position.set(0, h - 0.6, 6.1); g.add(sign);

  // Shade canopy over front
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(20, 0.18, 3.5),
    new THREE.MeshLambertMaterial({ color: 0x228833 })
  );
  canopy.position.set(0, h, 8); g.add(canopy);

  // Canopy poles
  for (let cx of [-8, -3, 3, 8]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, h, 6), MAT.steel);
    pole.position.set(cx, h / 2, 9.5); g.add(pole);
  }

  // Plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(18.9, 0.45, 12.9), MAT.concrete);
  plinth.position.y = 0.22; plinth.receiveShadow = true; g.add(plinth);

  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LIBRARY  (grand 2-floor, bigger, prominent)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function addLibrary(x, z) {
  // Use main addBuilding but with prominent details
  const g = addBuilding({
    x, z,
    w: 28, d: 16,
    floors: 2,
    name: 'Central Library',
    icon: '📚',
    desc: '2-floor central library. 50,000+ books, digital resources, reading hall, e-library, reference section, and periodical area.',
    hasPortico: true,
    hasTower: false,
  });

  // Prominent name plaque on front
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.9, 0.2),
    new THREE.MeshLambertMaterial({ color: 0x1a3a6a })
  );
  plaque.position.set(x, FLOOR_H + 0.5, z + 8.12);
  scene.add(plaque);

  return g;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MAIN GATE  (improved realistic version)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function addMainGate(x, z) {
  const g = new THREE.Group();
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f2 });
  const blueMat   = new THREE.MeshLambertMaterial({ color: 0x1a3a8a });
  const goldMat   = new THREE.MeshLambertMaterial({ color: 0xc8960a });

  // Main pillars (2 large, 4 medium)
  for (let [px, pw] of [[-12, 3.5], [12, 3.5]]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(pw, 11, pw), pillarMat);
    pillar.position.set(px, 5.5, 0);
    pillar.castShadow = true; g.add(pillar);

    // Pillar cap
    const cap = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.8, 0.7, pw + 0.8), pillarMat);
    cap.position.set(px, 11.35, 0); g.add(cap);

    // Decorative gold band on pillar
    const band = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.1, 0.55, pw + 0.1), goldMat);
    band.position.set(px, 4, 0); g.add(band);
    const band2 = band.clone(); band2.position.y = 8; g.add(band2);

    // Emblem disk on pillar
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.35, 16), goldMat);
    disk.rotation.z = Math.PI / 2; disk.position.set(px, 9, pw / 2 + 0.18); g.add(disk);
  }

  // Arch / name board between pillars
  const arch = new THREE.Mesh(new THREE.BoxGeometry(30, 3.0, 1.0), blueMat);
  arch.position.set(0, 10, 0); arch.castShadow = true; g.add(arch);

  // Gold trim on arch
  const archGold = new THREE.Mesh(new THREE.BoxGeometry(30.2, 0.35, 1.1), goldMat);
  archGold.position.set(0, 8.6, 0); g.add(archGold);
  const archGold2 = archGold.clone(); archGold2.position.y = 11.65; g.add(archGold2);

  // Arch top crest
  const crest = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 0.8), goldMat);
  crest.position.set(0, 11.8, 0); g.add(crest);

  // University emblem (star/diamond on top center)
  const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), goldMat);
  emblem.position.set(0, 12.8, 0); g.add(emblem);
  const emblemBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.2, 8), pillarMat);
  emblemBase.position.set(0, 12.0, 0); g.add(emblemBase);

  // Pedestrian side pillars (smaller)
  for (let [px] of [[-24], [24]]) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 6, 1.6), pillarMat);
    sp.position.set(px, 3, 0); g.add(sp);
    const spc = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 2.1), pillarMat);
    spc.position.set(px, 6.25, 0); g.add(spc);
  }

  // Iron gate bars (main opening)
  const gateMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  for (let side of [-1, 1]) {
    // 5 vertical bars per gate leaf
    for (let b = 0; b < 5; b++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 8, 5), gateMat);
      bar.position.set(side * (3 + b * 1.6), 4, 0); g.add(bar);
      // Pointed top spear
      const spear = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 4), goldMat);
      spear.position.set(side * (3 + b * 1.6), 8.35, 0); g.add(spear);
    }
    // Horizontal gate rails
    for (let ry of [1.5, 4, 7]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(8, 0.18, 0.18), gateMat);
      rail.position.set(side * 6.5, ry, 0); g.add(rail);
    }
  }

  // Compound wall sections on each side of gate
  const wallMat2 = new THREE.MeshLambertMaterial({ color: 0xeeeeea });
  for (let [wx, wlen] of [[-40, 22], [40, 22]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(wlen, 2.8, 0.5), wallMat2);
    wall.position.set(wx, 1.4, 0); g.add(wall);
    const wallTop = new THREE.Mesh(new THREE.BoxGeometry(wlen + 0.2, 0.35, 0.7), MAT.concrete);
    wallTop.position.set(wx, 2.98, 0); g.add(wallTop);
  }

  // Security cabin (right)
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(4, 4.5, 4), pillarMat);
  cabin.position.set(20, 2.25, -5); cabin.castShadow = true; g.add(cabin);
  const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.4, 4.6), MAT.roofTop);
  cabinRoof.position.set(20, 4.7, -5); g.add(cabinRoof);
  const cabinSign = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 0.15), blueMat);
  cabinSign.position.set(20, 3.8, -2.93); g.add(cabinSign);
  cabin.userData = { name: 'Security Cabin', icon: '👮', desc: '24/7 security post. Visitor register, vehicle entry log, campus security management.' };
  clickable.push(cabin);

  // Road markings (zebra crossing)
  for (let i = 0; i < 6; i++) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.05, 2.2),
      new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    stripe.position.set(-7 + i * 2.5, 0.025, 4); g.add(stripe);
  }

  // Flag poles at gate
  for (let fx of [-8, 0, 8]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 14, 6),
      new THREE.MeshLambertMaterial({ color: 0xcccccc }));
    pole.position.set(fx, 7, -7); g.add(pole);
    // Indian tricolor
    const colors = [0xFF9933, 0xffffff, 0x138808];
    colors.forEach((c, i) => {
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 0.65),
        new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide })
      );
      stripe.position.set(fx + 1.6, 13.5 - i * 0.65, -7);
      g.add(stripe);
    });
    // Chakra ring
    const chakra = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 4, 14), new THREE.MeshLambertMaterial({ color: 0x000080 }));
    chakra.position.set(fx + 1.6, 13.18, -7); g.add(chakra);
  }

  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ALL CAMPUS BUILDINGS  — place them all here
//  Layout based on real drone footage
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function createBuildings() {

  // ── MAIN GATE ─────────────────────────────────
  addMainGate(0, -14);

  // ══════════════════════════════════════════════
  //  MAIN ACADEMIC COMPLEX  (the HUGE building)
  //  L-shaped, 4 floors, center-right of campus
  //  This is what dominates the drone shot
  // ══════════════════════════════════════════════

  // Wing A — long horizontal main block
  addBuilding({
    x: 12, z: 32,
    w: 58, d: 18,
    floors: 4,
    name: 'Main Academic Block (Wing A)',
    icon: '🎓',
    desc: 'The primary academic building — 4 floors, housing Arts, Commerce, Science departments, major lecture halls, and the Dean\'s office.',
    hasPortico: true,
    hasTower: true,
  });

  // Wing B — perpendicular connecting wing (forms the L)
  addBuilding({
    x: 32, z: 52,
    w: 18, d: 22,
    floors: 4,
    name: 'Main Academic Block (Wing B)',
    icon: '🎓',
    desc: 'Connected wing of the main academic block. Houses additional classrooms, labs, and departmental offices.',
    hasPortico: false,
  });

  // ══════════════════════════════════════════════
  //  LEFT CLUSTER  (2-floor buildings, left of road)
  //  Visible in drone shot behind the main road
  // ══════════════════════════════════════════════

  addBuilding({
    x: -22, z: 20,
    w: 28, d: 14,
    floors: 3,
    name: 'Administrative Block',
    icon: '🏛️',
    desc: 'Registrar, Accounts, Examination Cell, Scholarship Wing, and Student Affairs offices.',
    hasPortico: true,
  });

  addBuilding({
    x: -22, z: 42,
    w: 24, d: 13,
    floors: 2,
    name: 'Multipurpose Hall (Sabhagaar)',
    icon: '🎭',
    desc: 'Grand auditorium for convocations, cultural events, seminars, and guest lectures. 500+ seating capacity.',
    hasPortico: true,
  });

  // ══════════════════════════════════════════════
  //  SCIENCE & IT BLOCK  (right side, near hostel)
  // ══════════════════════════════════════════════

  addBuilding({
    x: 18, z: 60,
    w: 20, d: 12,
    floors: 3,
    name: 'Science Block',
    icon: '🔬',
    desc: 'Physics, Chemistry, Botany, Zoology departments. Modern laboratories, fume hoods, research benches.',
    hasPortico: false,
  });

  addBuilding({
    x: -5, z: 60,
    w: 16, d: 11,
    floors: 2,
    name: 'IT Cell',
    icon: '💻',
    desc: 'IT Department: Computer labs, internet infrastructure, digital resources, university website.',
    hasPortico: false,
  });

  // ══════════════════════════════════════════════
  //  LIBRARY  (prominent, central location)
  // ══════════════════════════════════════════════
  addLibrary(-8, 78);

  // ══════════════════════════════════════════════
  //  CANTEEN
  // ══════════════════════════════════════════════
  addCanteen(25, 75);

  // ══════════════════════════════════════════════
  //  HOSTEL BLOCK  (tall, far right)
  // ══════════════════════════════════════════════
  addBuilding({
    x: 48, z: 38,
    w: 16, d: 14,
    floors: 4,
    name: 'Student Hostel',
    icon: '🏠',
    desc: '4-floor hostel. Single/double rooms, common room, study hall, warden cabin, kitchen.',
  });

  // ══════════════════════════════════════════════
  //  VC RESIDENCE + FACULTY BLOCK  (far left)
  // ══════════════════════════════════════════════
  addBuilding({
    x: -46, z: 58,
    w: 16, d: 12,
    floors: 2,
    name: "Vice Chancellor's Residence",
    icon: '🏡',
    desc: 'Official VC bungalow. Private garden, security post, peaceful campus corner.',
  });

  addBuilding({
    x: -46, z: 30,
    w: 12, d: 10,
    floors: 2,
    name: 'Faculty Block',
    icon: '👨‍🏫',
    desc: 'Faculty offices, staff rooms, departmental head cabins, tutorial rooms.',
  });

  addBuilding({
    x: -46, z: 44,
    w: 10, d: 9,
    floors: 1,
    name: 'NCC / NSS Block',
    icon: '🎖️',
    desc: 'NCC/NSS facility: drill practice, training, community service coordination.',
  });

  // Agriculture block
  addBuilding({
    x: 48, z: 60,
    w: 18, d: 12,
    floors: 1,
    name: 'Agriculture Block',
    icon: '🌾',
    desc: 'Agriculture Department: classrooms, soil science lab, botanical garden access, herbarium.',
  });

  // ══════════════════════════════════════════════
  //  SPORTS COURT  (visible in drone shot, center)
  //  Green with red border basketball/volleyball
  // ══════════════════════════════════════════════
  addSportsCourt(18, 14);
}