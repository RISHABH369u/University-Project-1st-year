/**
 * roads.js — PTSNS Campus-accurate road assets
 *
 * All "drawable" functions accept (sx, sz, ex, ez) — start & end points,
 * just like mkWall — so the DevTool road-draw tool works out of the box.
 *
 * Static props still use (x, z, rotY).
 */

import * as THREE from 'three';
import { scene }  from '../scene.js';
import { getMat } from '../materials.js';

// ─── Geometry helpers ────────────────────────────────────────────────────────

function box(w, h, d, col, x=0, y=0, z=0, rx=0, ry=0, rz=0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), getMat(col));
  m.position.set(x,y,z); m.rotation.set(rx,ry,rz);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function cyl(rt, rb, h, segs, col, x=0, y=0, z=0, rx=0, ry=0, rz=0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segs), getMat(col));
  m.position.set(x,y,z); m.rotation.set(rx,ry,rz);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function sph(r, segs, col, x=0, y=0, z=0) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r,segs,segs), getMat(col));
  m.position.set(x,y,z); m.castShadow = true;
  return m;
}
function add(g, ...ms) { ms.forEach(m => g.add(m)); }

// ─── Shared colours (tuned from photo) ───────────────────────────────────────
const C = {
  asphalt:    0x2e2e2e,   // dark road surface
  asphaltLt:  0x3a3a3a,
  concrete:   0xbeb8a8,   // light campus concrete pavement
  concreteDk: 0xa8a298,
  lineWh:     0xffffff,
  lineYe:     0xf5d020,
  curbBase:   0xdddddd,   // unpainted curb
  curbBlack:  0x101010,   // painted black block (from photo)
  curbWhite:  0xf0f0f0,   // painted white block
  hedgeDark:  0x4e7a1e,   // deep green hedge shadow
  hedgeMid:   0x6aab28,   // main hedge green
  hedgeLite:  0xa0d040,   // top highlight — bright yellow-green from photo
  dirt:       0x7a5c30,
  steel:      0x8899aa,   // galvanized pole colour
  lampYellow: 0xffee99,   // sodium lamp glow
  lampGlass:  0x446677,
  grass:      0x4a8c28,
  grassLt:    0x62b030,
  sidewalk:   0xc8c0b0,
  sidewalkDk: 0xb0a898,
  kerb:       0xcccccc,
};


// ════════════════════════════════════════════════════════════════════════════
// INTERNAL: build a road group of given length, centred at origin, along X
// ════════════════════════════════════════════════════════════════════════════

function _roadGroup(len, laneW = 6.5) {
  const g = new THREE.Group();
  const hw = laneW;   // half total road width = one lane each side

  // ── Road surface ──────────────────────────────────────────────────────────
  add(g, box(len, 0.10, hw*2, C.asphalt, 0, 0, 0));

  // ── Edge white lines ──────────────────────────────────────────────────────
  add(g, box(len, 0.01, 0.16, C.lineWh, 0, 0.056, -(hw - 0.12)));
  add(g, box(len, 0.01, 0.16, C.lineWh, 0, 0.056,  (hw - 0.12)));

  // ── Centre dashed yellow line (every 3 u) ─────────────────────────────────
  const dashCount = Math.max(2, Math.floor(len / 3));
  const step = len / dashCount;
  for (let i = 0; i < dashCount; i++) {
    const ox = -len/2 + step/2 + i * step;
    add(g, box(step * 0.55, 0.01, 0.14, C.lineYe, ox, 0.056, 0));
  }

  // ── Micro texture: tyre tracks ────────────────────────────────────────────
  add(g, box(len, 0.005, 0.22, C.asphaltLt, 0, 0.052, -hw/2));
  add(g, box(len, 0.005, 0.22, C.asphaltLt, 0, 0.052,  hw/2));
  add(g, box(len, 0.005, 0.22, C.asphaltLt, 0, 0.052, -hw * 1.5));
  add(g, box(len, 0.005, 0.22, C.asphaltLt, 0, 0.052,  hw * 1.5));

  // ── Sidewalk strips (each side) ───────────────────────────────────────────
  const swW = 3.0;
  add(g, box(len, 0.13, swW, C.sidewalk, 0, 0.055, -(hw + swW/2)));
  add(g, box(len, 0.13, swW, C.sidewalk, 0, 0.055,  (hw + swW/2)));

  // Sidewalk tile joints
  const tjStep = 2.0;
  const tjCount = Math.floor(len / tjStep);
  for (let i = 0; i <= tjCount; i++) {
    const ox = -len/2 + i * tjStep;
    add(g, box(0.05, 0.005, swW, C.sidewalkDk, ox, 0.125, -(hw + swW/2)));
    add(g, box(0.05, 0.005, swW, C.sidewalkDk, ox, 0.125,  (hw + swW/2)));
  }

  // ── Kerb between road & sidewalk ─────────────────────────────────────────
  add(g, box(len, 0.16, 0.22, C.kerb, 0, 0.08,  -(hw + 0.11)));
  add(g, box(len, 0.16, 0.22, C.kerb, 0, 0.08,   (hw + 0.11)));

  // ── Outer grass margin ────────────────────────────────────────────────────
  const gmW = 2.5;
  add(g, box(len, 0.09, gmW, C.grass, 0, 0.04, -(hw + swW + gmW/2)));
  add(g, box(len, 0.09, gmW, C.grass, 0, 0.04,  (hw + swW + gmW/2)));

  return g;
}


// ════════════════════════════════════════════════════════════════════════════
// 1.  CAMPUS ROAD  — draw between two points (like wall)
//     mkCampusRoad(sx, sz, ex, ez)
// ════════════════════════════════════════════════════════════════════════════
export function mkCampusRoad(sx, sz, ex, ez) {
  const dx = ex - sx, dz = ez - sz;
  const len   = Math.sqrt(dx*dx + dz*dz);
  const angle = Math.atan2(dx, dz);          // rotation around Y

  const g = _roadGroup(len);

  g.position.set((sx+ex)/2, 0, (sz+ez)/2);
  g.rotation.y = angle;
  scene.add(g);
  return g;
}


// ════════════════════════════════════════════════════════════════════════════
// 2.  CAMPUS ROAD — fixed-length tile  (16 u long, rotY for orientation)
//     Use in objects-registry for quick placement
// ════════════════════════════════════════════════════════════════════════════
export function mkRoadTile(x, z, rotY = 0) {
  const g = _roadGroup(16);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
  return g;
}


// ════════════════════════════════════════════════════════════════════════════
// 3.  CAMPUS DIVIDER — PTSNS-accurate
//     Alternating black/white painted curb blocks at base + dense trimmed hedge
//     mkCampusDivider(sx, sz, ex, ez)
// ════════════════════════════════════════════════════════════════════════════
export function mkCampusDivider(sx, sz, ex, ez) {
  const dx = ex - sx, dz = ez - sz;
  const len   = Math.sqrt(dx*dx + dz*dz);
  const angle = Math.atan2(dx, dz);

  const g = new THREE.Group();

  // ── Concrete base plinth ──────────────────────────────────────────────────
  add(g, box(len, 0.14, 1.60, C.concreteDk, 0, 0.07, 0));

  // ── Alternating black/white painted curb blocks ───────────────────────────
  // Each block: 0.40 wide × 0.26 tall × 1.62 deep
  // This matches the photo: chunky square painted blocks at base
  const blockW = 0.40;
  const count  = Math.floor(len / blockW);
  for (let i = 0; i < count; i++) {
    const bx  = -len/2 + blockW/2 + i * blockW;
    const col = i % 2 === 0 ? C.curbBlack : C.curbWhite;
    // Front face block
    add(g, box(blockW - 0.01, 0.28, 0.22, col, bx, 0.28, 0.71));
    // Back face block
    add(g, box(blockW - 0.01, 0.28, 0.22, col, bx, 0.28, -0.71));
  }

  // ── Top cap concrete strip ────────────────────────────────────────────────
  add(g, box(len, 0.06, 1.62, C.concrete, 0, 0.43, 0));

  // ── Dense hedge body (from photo: bright yellow-green, box-trimmed) ───────
  // Main bulk — dark green for depth
  add(g, box(len, 0.70, 1.55, C.hedgeDark, 0, 0.82, 0));
  // Mid layer
  add(g, box(len, 0.68, 1.45, C.hedgeMid,  0, 0.87, 0));
  // Top face — bright yellow-green (the well-lit top surface from photo)
  add(g, box(len, 0.10, 1.44, C.hedgeLite, 0, 1.20, 0));
  // Front face highlight
  add(g, box(len, 0.65, 0.08, C.hedgeLite, 0, 0.84, 0.74));
  // Back face
  add(g, box(len, 0.65, 0.08, C.hedgeMid,  0, 0.84, -0.74));

  // Small irregular bumps on top for organic feel
  const bumpStep = 1.5;
  const bumpCount = Math.floor(len / bumpStep);
  for (let i = 0; i < bumpCount; i++) {
    const bx = -len/2 + bumpStep/2 + i * bumpStep;
    const bump = sph(0.32, 6, C.hedgeLite, bx, 1.25, 0);
    g.add(bump);
    const bump2 = sph(0.24, 6, C.hedgeMid, bx + 0.6, 1.22, 0.2);
    g.add(bump2);
  }

  g.position.set((sx+ex)/2, 0, (sz+ez)/2);
  g.rotation.y = angle;
  scene.add(g);
  return g;
}


// ════════════════════════════════════════════════════════════════════════════
// 4.  DIVIDER TILE — fixed length for quick placement
// ════════════════════════════════════════════════════════════════════════════
export function mkDividerTile(x, z, rotY = 0) {
  return mkCampusDivider(
    x - Math.sin(rotY)*8, z - Math.cos(rotY)*8,
    x + Math.sin(rotY)*8, z + Math.cos(rotY)*8
  );
}


// ════════════════════════════════════════════════════════════════════════════
// 5.  HIGH-MAST STREET LIGHT — PTSNS-accurate
//     Tall galvanized octagonal pole, single outreach arm, cobra-head lamp
// ════════════════════════════════════════════════════════════════════════════
export function mkHighMastLight(x, z, rotY = 0) {
  const g = new THREE.Group();

  // ── Concrete foundation base ──────────────────────────────────────────────
  add(g, box(0.60, 0.22, 0.60, C.concrete, 0, 0.11, 0));
  add(g, box(0.50, 0.10, 0.50, C.concreteDk, 0, 0.27, 0));

  // ── Main pole — tapered octagonal, 11 units tall ──────────────────────────
  add(g, cyl(0.085, 0.13, 11.0, 8, C.steel, 0, 5.82, 0));

  // Pole weld rings (detail)
  add(g, cyl(0.16, 0.16, 0.09, 8, C.steel, 0, 1.0, 0));
  add(g, cyl(0.14, 0.14, 0.08, 8, C.steel, 0, 3.5, 0));
  add(g, cyl(0.12, 0.12, 0.07, 8, C.steel, 0, 6.5, 0));
  add(g, cyl(0.10, 0.10, 0.06, 8, C.steel, 0, 9.8, 0));

  // ── Outreach arm (horizontal + slight upward angle) ───────────────────────
  // Lower diagonal section (rises at ~15°)
  const armBase = box(2.8, 0.09, 0.09, C.steel, 1.4, 11.40, 0);
  armBase.rotation.z = -0.15;
  g.add(armBase);

  // Upper horizontal reach
  add(g, box(1.6, 0.07, 0.07, C.steel, 2.85, 11.70, 0));

  // Arm junction detail
  add(g, cyl(0.10, 0.10, 0.06, 6, C.steel, 0, 11.32, 0));
  add(g, cyl(0.07, 0.07, 0.04, 6, C.steel, 3.7, 11.74, 0));

  // ── Lamp head — cobra-head style ─────────────────────────────────────────
  const lampX = 3.65;
  const lampY = 11.62;

  // Housing shell (slightly squashed box + rounded front)
  add(g, box(0.72, 0.18, 0.52, C.steel,    lampX,        lampY,       0));
  add(g, box(0.68, 0.14, 0.50, 0x667788,   lampX,        lampY-0.08,  0));

  // Lens / glass cover (flat underside)
  add(g, box(0.60, 0.04, 0.44, C.lampGlass,lampX,        lampY-0.12,  0));

  // Lamp glow core (emissive-looking sodium yellow)
  const glowMat = new THREE.MeshStandardMaterial({
    color: C.lampYellow,
    emissive: new THREE.Color(C.lampYellow),
    emissiveIntensity: 0.9,
  });
  const glowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.03, 0.36), glowMat);
  glowMesh.position.set(lampX, lampY - 0.10, 0);
  g.add(glowMesh);

  // Actual point light (small range for perf — increase if you need area lighting)
  const light = new THREE.PointLight(0xffe8a0, 1.2, 28, 1.5);
  light.position.set(lampX, lampY - 0.3, 0);
  light.castShadow = false;  // set true if shadow perf allows
  g.add(light);

  // Back of housing (finned heat-sink look)
  for (let f = 0; f < 4; f++) {
    add(g, box(0.66, 0.02, 0.50, 0x556677, lampX, lampY + 0.08 + f*0.028, 0));
  }

  // Cable from arm to lamp housing
  add(g, box(0.04, 0.38, 0.04, 0x333333, lampX - 0.34, lampY + 0.20, 0));

  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
  return g;
}


// ════════════════════════════════════════════════════════════════════════════
// 6.  DOUBLE HIGH-MAST — arms both sides (for centre island / wide roads)
// ════════════════════════════════════════════════════════════════════════════
export function mkDoubleHighMast(x, z, rotY = 0) {
  const g = new THREE.Group();

  // Foundation
  add(g, box(0.70, 0.24, 0.70, C.concrete, 0, 0.12, 0));
  add(g, box(0.55, 0.10, 0.55, C.concreteDk, 0, 0.29, 0));

  // Pole
  add(g, cyl(0.09, 0.14, 11.0, 8, C.steel, 0, 5.82, 0));
  add(g, cyl(0.17, 0.17, 0.10, 8, C.steel, 0, 1.0, 0));
  add(g, cyl(0.11, 0.11, 0.07, 8, C.steel, 0, 9.8, 0));

  // Both arms (mirrored)
  for (const side of [-1, 1]) {
    const lx = side * 3.65;

    const armBase = box(2.8, 0.09, 0.09, C.steel, side*1.4, 11.40, 0);
    armBase.rotation.z = side * 0.15;
    g.add(armBase);
    add(g, box(1.6, 0.07, 0.07, C.steel, side*2.85, 11.70, 0));
    add(g, cyl(0.07, 0.07, 0.04, 6, C.steel, side*3.7, 11.74, 0));

    // Lamp head
    add(g, box(0.72, 0.18, 0.52, C.steel,    lx, 11.62, 0));
    add(g, box(0.60, 0.04, 0.44, C.lampGlass, lx, 11.50, 0));

    const glowMat = new THREE.MeshStandardMaterial({
      color: C.lampYellow, emissive: new THREE.Color(C.lampYellow), emissiveIntensity: 0.9,
    });
    const gm = new THREE.Mesh(new THREE.BoxGeometry(0.50,0.03,0.36), glowMat);
    gm.position.set(lx, 11.50, 0); g.add(gm);

    const light = new THREE.PointLight(0xffe8a0, 1.0, 24, 1.5);
    light.position.set(lx, 11.2, 0);
    g.add(light);
  }

  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
  return g;
}


// ════════════════════════════════════════════════════════════════════════════
// 7.  PAINTED CURB ROW — alternating black/white, 8 u long
//     (standalone, for parking bays, pedestrian areas, etc.)
// ════════════════════════════════════════════════════════════════════════════
export function mkPaintedCurbRow(x, z, rotY = 0, numBlocks = 20) {
  const g = new THREE.Group();
  const bw = 0.40;
  const total = bw * numBlocks;

  // Back support ledge
  add(g, box(total, 0.28, 0.22, C.curbBase, 0, 0.14, 0));

  for (let i = 0; i < numBlocks; i++) {
    const bx  = -total/2 + bw/2 + i * bw;
    const col = i % 2 === 0 ? C.curbBlack : C.curbWhite;
    add(g, box(bw - 0.015, 0.26, 0.21, col, bx, 0.14, 0));
  }

  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
  return g;
}


// ════════════════════════════════════════════════════════════════════════════
// 8.  ROAD INTERSECTION  (campus-accurate, 14×14)
// ════════════════════════════════════════════════════════════════════════════
export function mkCampusIntersection(x, z) {
  const g = new THREE.Group();
  const hw = 6.5;

  // Main slab
  add(g, box(hw*2*2, 0.10, hw*2, C.asphalt, 0, 0, 0));
  add(g, box(hw*2, 0.10, hw*2*2, C.asphalt, 0, 0.001, 0));

  // Stop lines
  add(g, box(hw*1.8, 0.01, 0.20, C.lineWh,  0, 0.056,   hw*0.85));
  add(g, box(hw*1.8, 0.01, 0.20, C.lineWh,  0, 0.056,  -hw*0.85));
  add(g, box(0.20, 0.01, hw*1.8, C.lineWh,  hw*0.85, 0.056, 0));
  add(g, box(0.20, 0.01, hw*1.8, C.lineWh, -hw*0.85, 0.056, 0));

  // Corner kerbs
  for (const sx of [-1,1]) for (const sz of [-1,1]) {
    add(g, box(0.22, 0.16, 0.22, C.kerb, sx*(hw+0.11), 0.08, sz*(hw+0.11)));
  }

  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}


// ════════════════════════════════════════════════════════════════════════════
// 9.  ZEBRA CROSSING — wide campus style
// ════════════════════════════════════════════════════════════════════════════
export function mkCampusZebra(x, z, rotY = 0) {
  const g = new THREE.Group();

  add(g, box(7.0, 0.103, 5.5, C.asphaltLt, 0, 0, 0));

  const stripes = 9;
  const gapZ = 5.5 / stripes;
  for (let i = 0; i < stripes; i++) {
    const zz = -5.5/2 + gapZ/2 + i * gapZ;
    if (i%2===0) add(g, box(7.0, 0.01, gapZ*0.72, C.lineWh, 0, 0.058, zz));
  }

  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
  return g;
}


// ════════════════════════════════════════════════════════════════════════════
// 10. SPEED BUMP — wide campus style
// ════════════════════════════════════════════════════════════════════════════
export function mkCampusSpeedBump(x, z, rotY = 0) {
  const g = new THREE.Group();

  // Bump (half-cylinder profile)
  add(g, cyl(0.10, 0.10, 13, 8, C.asphaltLt, 0, 0.06, 0, 0, 0, Math.PI/2));

  // Yellow warning stripes
  const stripes = 6;
  const total = 13;
  const sw = total / (stripes * 2 - 1);
  for (let i = 0; i < stripes; i++) {
    add(g, box(sw * 0.9, 0.01, 13.02, C.lineYe, -total/2 + sw/2 + i*(sw*2), 0.11, 0));
  }

  // End reflectors
  add(g, box(0.15, 0.13, 0.15, 0xff3300, -total/2, 0.10, 0));
  add(g, box(0.15, 0.13, 0.15, 0xff3300,  total/2, 0.10, 0));

  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
  return g;
}