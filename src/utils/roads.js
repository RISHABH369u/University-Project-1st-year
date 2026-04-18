import * as THREE from 'three';
import { scene } from '../scene.js';
import { getMat } from '../materials.js';

// ─── Helpers (same pattern as props.js) ─────────────────────────────────────

function box(w, h, d, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), getMat(color));
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

function cyl(rt, rb, h, segs, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), getMat(color));
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

function sph(r, segs, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, segs, segs), getMat(color));
  m.position.set(x, y, z);
  return m;
}

function tor(r, tube, rSegs, tSegs, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, rSegs, tSegs), getMat(color));
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

function add(g, ...meshes) { meshes.forEach(m => g.add(m)); }

function place(g, x, z, rotY = 0) {
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
  return g;
}

// ─── COLOR PALETTE ───────────────────────────────────────────────────────────
const ASPHALT     = 0x2a2a2a;
const ASPHALT_LT  = 0x3d3d3d;
const CONCRETE    = 0xc0b89a;
const CURB        = 0xaaaaaa;
const LINE_WHITE  = 0xffffff;
const LINE_YELLOW = 0xffdd00;
const DIVIDER     = 0xbbbbbb;
const GRASS       = 0x3a7d44;
const BUSH_DARK   = 0x2d6b38;
const BUSH_LITE   = 0x4a9e58;
const DIRT        = 0x8b6b3a;
const CONE_ORG    = 0xff6600;
const BARRIER_WHT = 0xeeeeee;
const BARRIER_RED = 0xcc1111;
const PAINT_RED   = 0xdd2222;


// ════════════════════════════════════════════════════════════════════════════
// 1. STRAIGHT ROAD SEGMENT  (8 units wide, 16 units long — 2-lane)
//    rotY = 0  → runs along Z axis
//    rotY = Math.PI/2 → runs along X axis
// ════════════════════════════════════════════════════════════════════════════
export function mkRoadStraight(x, z, rotY = 0) {
  const g = new THREE.Group();

  // Asphalt slab
  add(g, box(16, 0.08, 8, ASPHALT, 0, 0, 0));

  // Centre dashed yellow line  (5 dashes)
  for (let i = -4; i <= 4; i += 2) {
    add(g, box(1.2, 0.01, 0.1, LINE_YELLOW, i, 0.045, 0));
  }

  // Edge white lines
  add(g, box(16, 0.01, 0.14, LINE_WHITE, 0, 0.045, -3.8));
  add(g, box(16, 0.01, 0.14, LINE_WHITE, 0, 0.045,  3.8));

  return place(g, x, z, rotY);
}


// ════════════════════════════════════════════════════════════════════════════
// 2. ROAD INTERSECTION (4-way, 8×8)
// ════════════════════════════════════════════════════════════════════════════
export function mkRoadIntersection(x, z) {
  const g = new THREE.Group();

  // Base slab
  add(g, box(16, 0.08, 16, ASPHALT, 0, 0, 0));

  // Stop lines (all 4 approaches)
  add(g, box(7.8, 0.01, 0.18, LINE_WHITE,  0, 0.045,  3.6));
  add(g, box(7.8, 0.01, 0.18, LINE_WHITE,  0, 0.045, -3.6));
  add(g, box(0.18, 0.01, 7.8, LINE_WHITE,  3.6, 0.045, 0));
  add(g, box(0.18, 0.01, 7.8, LINE_WHITE, -3.6, 0.045, 0));

  // Centre circle markings
  tor(0.6, 0.07, 8, 20, LINE_WHITE, 0, 0.046, 0, Math.PI / 2);
  add(g, tor(0.6, 0.07, 8, 20, LINE_WHITE, 0, 0.046, 0, Math.PI / 2));

  return place(g, x, z);
}


// ════════════════════════════════════════════════════════════════════════════
// 3. T-INTERSECTION
// ════════════════════════════════════════════════════════════════════════════
export function mkRoadTIntersection(x, z, rotY = 0) {
  const g = new THREE.Group();

  add(g, box(16, 0.08, 8, ASPHALT, 0, 0, 0));        // main road
  add(g, box(8,  0.08, 8, ASPHALT, -4, 0, -7.99));   // branch leg (north)

  // Lines
  add(g, box(16, 0.01, 0.14, LINE_WHITE, 0, 0.045,  3.8));
  add(g, box(8,  0.01, 0.14, LINE_WHITE, -4, 0.045, -3.8));
  add(g, box(0.14, 0.01, 8, LINE_WHITE, 0, 0.045, -4));

  for (let i = -4; i <= 4; i += 2)
    add(g, box(1.2, 0.01, 0.1, LINE_YELLOW, i, 0.045, 0));

  return place(g, x, z, rotY);
}


// ════════════════════════════════════════════════════════════════════════════
// 4. CURVED ROAD CORNER (90°)
// ════════════════════════════════════════════════════════════════════════════
export function mkRoadCorner(x, z, rotY = 0) {
  const g = new THREE.Group();

  // Two overlapping slabs forming an L
  add(g, box(8, 0.08, 16, ASPHALT, -4, 0,  0));
  add(g, box(8, 0.08,  8, ASPHALT,  0, 0, -4));

  // Edge lines
  add(g, box(0.14, 0.01, 16, LINE_WHITE, -7.9, 0.045,  0));
  add(g, box(8,    0.01, 0.14, LINE_WHITE, -4,  0.045, -7.9));
  add(g, box(8,    0.01, 0.14, LINE_WHITE,  0,  0.045,  3.9));

  return place(g, x, z, rotY);
}


// ════════════════════════════════════════════════════════════════════════════
// 5. FOOTPATH / PAVEMENT  (16 × 2.5 units)
// ════════════════════════════════════════════════════════════════════════════
export function mkFootpath(x, z, rotY = 0) {
  const g = new THREE.Group();

  // Concrete slab
  add(g, box(16, 0.1, 2.5, CONCRETE, 0, 0.01, 0));

  // Paving tile joints  (horizontal)
  for (let i = -7; i <= 7; i += 2) {
    add(g, box(0.04, 0.01, 2.5, 0x999988, i, 0.065, 0));
  }

  // Kerb edge
  add(g, box(16, 0.12, 0.18, CURB, 0, 0.01, 1.15));
  add(g, box(16, 0.12, 0.18, CURB, 0, 0.01, -1.15));

  return place(g, x, z, rotY);
}


// ════════════════════════════════════════════════════════════════════════════
// 6. ZEBRA CROSSING  (6 × 5 units)
// ════════════════════════════════════════════════════════════════════════════
export function mkZebraCrossing(x, z, rotY = 0) {
  const g = new THREE.Group();

  // Base asphalt patch
  add(g, box(6, 0.085, 5, ASPHALT_LT, 0, 0, 0));

  // White stripes (8 stripes)
  for (let i = 0; i < 8; i++) {
    add(g, box(6, 0.01, 0.38, LINE_WHITE, 0, 0.046, -2.2 + i * 0.6));
  }

  return place(g, x, z, rotY);
}


// ════════════════════════════════════════════════════════════════════════════
// 7. SPEED BUMP
// ════════════════════════════════════════════════════════════════════════════
export function mkSpeedBump(x, z, rotY = 0) {
  const g = new THREE.Group();

  // The bump (flattened cylinder)
  add(g, cyl(0.12, 0.12, 7.8, 8, ASPHALT_LT, 0, 0.06, 0, 0, 0, Math.PI / 2));

  // Yellow warning stripes
  for (let i = -3; i <= 3; i++) {
    add(g, box(0.28, 0.01, 7.82, LINE_YELLOW, i * 0.9, 0.13, 0));
  }

  return place(g, x, z, rotY);
}


// ════════════════════════════════════════════════════════════════════════════
// 8. ROAD DIVIDER — Concrete median with bushes  (16 × 1.5 units)
// ════════════════════════════════════════════════════════════════════════════
export function mkRoadDivider(x, z, rotY = 0) {
  const g = new THREE.Group();

  // Concrete base
  add(g, box(16, 0.28, 1.5, CONCRETE, 0, 0.14, 0));

  // Kerb caps
  add(g, box(16, 0.08, 0.14, CURB, 0, 0.32, 0.71));
  add(g, box(16, 0.08, 0.14, CURB, 0, 0.32, -0.71));

  // Alternating yellow/white reflective strips
  for (let i = -7; i <= 7; i += 2) {
    const col = ((i + 7) / 2) % 2 === 0 ? LINE_YELLOW : DIVIDER;
    add(g, box(0.9, 0.01, 1.5, col, i, 0.33, 0));
  }

  // Bush row on top
  for (let i = -7; i <= 7; i += 3) {
    const w = 0.5 + Math.random() * 0.4;
    add(g, sph(w * 0.5, 6, BUSH_DARK, i, 0.62, 0));
    add(g, sph(w * 0.42, 6, BUSH_LITE, i + 0.2, 0.72, 0.1));
  }

  return place(g, x, z, rotY);
}


// ════════════════════════════════════════════════════════════════════════════
// 9. GRASS STRIP  (16 × 3 units — park-road buffer)
// ════════════════════════════════════════════════════════════════════════════
export function mkGrassStrip(x, z, rotY = 0) {
  const g = new THREE.Group();

  add(g, box(16, 0.1, 3, GRASS, 0, 0, 0));

  // Kerb on each long edge
  add(g, box(16, 0.14, 0.2, CURB, 0, 0.05, 1.4));
  add(g, box(16, 0.14, 0.2, CURB, 0, 0.05, -1.4));

  // Scattered small bushes
  const positions = [-6, -2, 1, 4, 7, -7.5];
  for (const xi of positions) {
    add(g, sph(0.35, 6, BUSH_DARK, xi, 0.3, 0));
    add(g, sph(0.28, 6, BUSH_LITE, xi + 0.3, 0.38, 0.2));
  }

  return place(g, x, z, rotY);
}


// ════════════════════════════════════════════════════════════════════════════
// 10. HEDGE ROW  (8 units long, trimmed square hedge)
// ════════════════════════════════════════════════════════════════════════════
export function mkHedgeRow(x, z, rotY = 0) {
  const g = new THREE.Group();

  // Soil base
  add(g, box(8, 0.1, 0.7, DIRT, 0, 0.05, 0));

  // Main hedge body
  add(g, box(8, 0.65, 0.65, BUSH_DARK, 0, 0.45, 0));

  // Top lighter layer (trimmed)
  add(g, box(7.8, 0.15, 0.6, BUSH_LITE, 0, 0.84, 0));

  // Side face highlights
  add(g, box(8, 0.65, 0.05, 0x3d8848, 0, 0.45, 0.32));
  add(g, box(8, 0.65, 0.05, 0x245930, 0, 0.45, -0.32));

  return place(g, x, z, rotY);
}


// ════════════════════════════════════════════════════════════════════════════
// 11. ROUND BUSH (standalone decorative shrub)
// ════════════════════════════════════════════════════════════════════════════
export function mkBush(x, z, scale = 1.0) {
  const g = new THREE.Group();

  // Dirt mound
  add(g, cyl(0.3 * scale, 0.35 * scale, 0.12, 8, DIRT, 0, 0.06, 0));

  // Layered spheres for volume
  add(g, sph(0.44 * scale, 7, BUSH_DARK,   0,        0.42 * scale, 0));
  add(g, sph(0.38 * scale, 7, BUSH_LITE,   0.2*scale, 0.54 * scale, 0.15*scale));
  add(g, sph(0.32 * scale, 7, BUSH_DARK,  -0.2*scale, 0.52 * scale, -0.1*scale));
  add(g, sph(0.28 * scale, 7, 0x5cb86a,    0.1*scale, 0.62 * scale, 0.1*scale));

  return place(g, x, z);
}


// ════════════════════════════════════════════════════════════════════════════
// 12. FLOWER BED  (2×2 colourful patch)
// ════════════════════════════════════════════════════════════════════════════
export function mkFlowerBed(x, z, rotY = 0) {
  const g = new THREE.Group();
  const FLOWERS = [0xff3366, 0xff9900, 0xffdd00, 0xcc44ff, 0xff6688, 0xffffff];

  // Soil patch
  add(g, box(2, 0.08, 2, DIRT, 0, 0.04, 0));

  // Low grass base
  add(g, box(1.9, 0.06, 1.9, GRASS, 0, 0.1, 0));

  // Flower clumps
  let fi = 0;
  for (let xi = -0.65; xi <= 0.65; xi += 0.44) {
    for (let zi = -0.65; zi <= 0.65; zi += 0.44) {
      // Stem
      add(g, cyl(0.015, 0.015, 0.22, 4, 0x2d8b3a, xi, 0.22, zi));
      // Bloom
      add(g, sph(0.085, 6, FLOWERS[fi % FLOWERS.length], xi, 0.35, zi));
      fi++;
    }
  }

  // Low border stones
  for (let i = -4; i <= 4; i++) {
    add(g, box(0.12, 0.08, 0.12, CURB, i * 0.25, 0.04,  1.04));
    add(g, box(0.12, 0.08, 0.12, CURB, i * 0.25, 0.04, -1.04));
    add(g, box(0.12, 0.08, 0.12, CURB,  1.04, 0.04, i * 0.25));
    add(g, box(0.12, 0.08, 0.12, CURB, -1.04, 0.04, i * 0.25));
  }

  return place(g, x, z, rotY);
}


// ════════════════════════════════════════════════════════════════════════════
// 13. TRAFFIC CONE
// ════════════════════════════════════════════════════════════════════════════
export function mkTrafficCone(x, z) {
  const g = new THREE.Group();

  // Base plate
  add(g, box(0.38, 0.04, 0.38, ASPHALT_LT, 0, 0.02, 0));

  // Cone body
  add(g, cyl(0.02, 0.16, 0.52, 10, CONE_ORG, 0, 0.3, 0));

  // White reflective bands
  add(g, cyl(0.09, 0.1, 0.055, 10, LINE_WHITE, 0, 0.14, 0));
  add(g, cyl(0.055, 0.07, 0.055, 10, LINE_WHITE, 0, 0.26, 0));

  // Tip
  add(g, sph(0.025, 6, CONE_ORG, 0, 0.56, 0));

  return place(g, x, z);
}


// ════════════════════════════════════════════════════════════════════════════
// 14. ROAD BARRIER / JERSEY BARRIER
// ════════════════════════════════════════════════════════════════════════════
export function mkRoadBarrier(x, z, rotY = 0) {
  const g = new THREE.Group();

  // Main concrete body (New Jersey profile approximated)
  add(g, box(2.4, 0.44, 0.62, DIVIDER, 0, 0.22, 0));   // wide base
  add(g, box(2.4, 0.3,  0.42, DIVIDER, 0, 0.59, 0));    // upper taper
  add(g, box(2.4, 0.12, 0.26, DIVIDER, 0, 0.8, 0));     // top cap

  // Red/white hazard stripes on ends
  for (let xi of [-1.2, 1.2]) {
    for (let s = 0; s < 3; s++) {
      const col = s % 2 === 0 ? BARRIER_RED : BARRIER_WHT;
      add(g, box(0.04, 0.26, 0.63, col, xi, 0.35 + s * 0.14, 0));
    }
  }

  return place(g, x, z, rotY);
}


// ════════════════════════════════════════════════════════════════════════════
// 15. TRAFFIC BARRIER ROW  (chain of 4 barriers)
// ════════════════════════════════════════════════════════════════════════════
export function mkBarrierRow(x, z, rotY = 0) {
  const g = new THREE.Group();

  for (let i = 0; i < 4; i++) {
    const offset = -3.6 + i * 2.4;
    // Body
    add(g, box(2.36, 0.44, 0.62, DIVIDER, offset, 0.22, 0));
    add(g, box(2.36, 0.3,  0.42, DIVIDER, offset, 0.59, 0));
    add(g, box(2.36, 0.12, 0.26, DIVIDER, offset, 0.8,  0));
    // Hazard end caps
    const col = i % 2 === 0 ? BARRIER_RED : LINE_YELLOW;
    add(g, box(0.06, 0.86, 0.64, col, offset - 1.18, 0.43, 0));
    add(g, box(0.06, 0.86, 0.64, col, offset + 1.18, 0.43, 0));
  }

  return place(g, x, z, rotY);
}


// ════════════════════════════════════════════════════════════════════════════
// 16. MANHOLE COVER
// ════════════════════════════════════════════════════════════════════════════
export function mkManhole(x, z) {
  const g = new THREE.Group();

  // Outer ring
  add(g, cyl(0.32, 0.32, 0.03, 16, 0x555555, 0, 0.015, 0));

  // Cover plate
  add(g, cyl(0.28, 0.28, 0.02, 16, 0x444444, 0, 0.02, 0));

  // Grid pattern (4 cross bars)
  for (let a = 0; a < 4; a++) {
    const gr = box(0.56, 0.018, 0.04, 0x555555, 0, 0.03, 0, 0, (a * Math.PI) / 4, 0);
    g.add(gr);
  }

  return place(g, x, z);
}


// ════════════════════════════════════════════════════════════════════════════
// 17. CURB STONE ROW  (decorative painted curb, 8 units)
// ════════════════════════════════════════════════════════════════════════════
export function mkCurbRow(x, z, rotY = 0) {
  const g = new THREE.Group();

  for (let i = 0; i < 16; i++) {
    const col = i % 2 === 0 ? LINE_WHITE : PAINT_RED;
    add(g, box(0.48, 0.16, 0.22, col, -3.75 + i * 0.5, 0.08, 0));
  }

  return place(g, x, z, rotY);
}


// ════════════════════════════════════════════════════════════════════════════
// 18. GUARD / SECURITY BOOTH  (small entrance booth)
// ════════════════════════════════════════════════════════════════════════════
export function mkGuardBooth(x, z, rotY = 0) {
  const g = new THREE.Group();
  const WALL = 0xe8e0d0, ROOF = 0x5a3a1a, GLASS = 0x99ccdd;

  // Floor
  add(g, box(1.8, 0.08, 1.8, CONCRETE, 0, 0.04, 0));

  // Walls
  add(g, box(1.8, 2.2, 0.12, WALL, 0, 1.18, -0.84));  // back
  add(g, box(0.12, 2.2, 1.8, WALL, -0.84, 1.18, 0));   // left
  add(g, box(0.12, 2.2, 1.8, WALL,  0.84, 1.18, 0));   // right

  // Front wall (with window opening)
  add(g, box(1.8, 0.58, 0.12, WALL, 0, 0.29, 0.84));   // lower
  add(g, box(1.8, 0.6,  0.12, WALL, 0, 1.98, 0.84));   // upper
  add(g, box(0.3, 0.9,  0.12, WALL, -0.75, 1.23, 0.84)); // side strip L
  add(g, box(0.3, 0.9,  0.12, WALL,  0.75, 1.23, 0.84)); // side strip R

  // Window glass
  add(g, box(1.1, 0.85, 0.06, GLASS, 0, 1.23, 0.84));

  // Sliding window frame
  add(g, box(1.1, 0.06, 0.07, 0x888888, 0, 0.82, 0.84));
  add(g, box(1.1, 0.06, 0.07, 0x888888, 0, 1.64, 0.84));

  // Roof (slight overhang)
  add(g, box(2.1, 0.16, 2.1, ROOF, 0, 2.28, 0));

  // Door (front opening side)
  add(g, box(0.6, 1.9, 0.06, WALL, 0.55, 1.02, 0.85));

  // Step
  add(g, box(0.8, 0.1, 0.4, CONCRETE, 0, 0.05, 1.1));

  // Striped barrier arm
  add(g, cyl(0.03, 0.03, 0.9, 6, 0x555555, 1.2, 1.1, 1.0)); // post
  const arm = box(3.5, 0.08, 0.08, BARRIER_RED, 1.75, 1.6, 1.0);
  // Alternating white stripes on arm
  for (let s = 0; s < 6; s++) {
    if (s % 2 === 0)
      g.add(box(0.5, 0.09, 0.09, LINE_WHITE, 0.25 + s * 0.6, 1.6, 1.0));
  }
  g.add(arm);

  return place(g, x, z, rotY);
}


// ════════════════════════════════════════════════════════════════════════════
// 19. ROAD LANE MARKING — Arrow (straight ↑)
// ════════════════════════════════════════════════════════════════════════════
export function mkLaneArrow(x, z, rotY = 0) {
  const g = new THREE.Group();

  // Shaft
  add(g, box(0.18, 0.01, 1.4, LINE_WHITE, 0, 0.046, 0));

  // Arrowhead (two diagonal lines)
  const l1 = box(0.18, 0.01, 0.62, LINE_WHITE, 0, 0.046, -0.65);
  l1.rotation.y =  0.55;
  g.add(l1);
  const l2 = box(0.18, 0.01, 0.62, LINE_WHITE, 0, 0.046, -0.65);
  l2.rotation.y = -0.55;
  g.add(l2);

  return place(g, x, z, rotY);
}


// ════════════════════════════════════════════════════════════════════════════
// 20. ROUNDABOUT  (radius ~6 units)
// ════════════════════════════════════════════════════════════════════════════
export function mkRoundabout(x, z) {
  const g = new THREE.Group();

  // Outer road ring
  add(g, cyl(8, 8, 0.08, 32, ASPHALT, 0, 0, 0));

  // Inner island (raised concrete + grass)
  add(g, cyl(4.5, 4.5, 0.16, 32, CONCRETE, 0, 0.08, 0));
  add(g, cyl(4.2, 4.2, 0.1, 32, GRASS, 0, 0.22, 0));

  // White dashed circle on road
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    const rx = Math.cos(angle) * 6.0;
    const rz = Math.sin(angle) * 6.0;
    const dash = box(0.9, 0.01, 0.15, LINE_WHITE, rx, 0.046, rz);
    dash.rotation.y = -angle;
    g.add(dash);
  }

  // Centre decorative bushes
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const bx = Math.cos(angle) * 2.5;
    const bz = Math.sin(angle) * 2.5;
    g.add(sph(0.55, 7, BUSH_DARK, bx, 0.5, bz));
    g.add(sph(0.44, 7, BUSH_LITE, bx + 0.2, 0.65, bz + 0.2));
  }
  // Centre feature (small fountain-like stub)
  add(g, cyl(0.35, 0.4, 0.55, 12, CONCRETE, 0, 0.52, 0));
  add(g, sph(0.3, 8, 0x9e9e8e, 0, 0.9, 0));

  return place(g, x, z);
}