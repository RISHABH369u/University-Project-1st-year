import * as THREE from 'three';
import { scene } from '../scene.js';
import { getMat } from '../materials.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── 1. BENCH (Improved) ────────────────────────────────────────────────────

export function mkBench(x, z, rotY = 0) {
  const g = new THREE.Group();
  const WOOD = 0x9b6b3a, IRON = 0x3a3a3a;

  // Seat planks (3 planks)
  for (let i = 0; i < 3; i++) {
    add(g, box(2.0, 0.06, 0.14, WOOD, 0, 0.52, -0.13 + i * 0.13));
  }

  // Backrest planks (2 planks)
  for (let i = 0; i < 2; i++) {
    add(g, box(2.0, 0.06, 0.14, WOOD, 0, 0.75 + i * 0.15, -0.25, -Math.PI * 0.08));
  }

  // Cast-iron side frames (2 sides)
  for (let xi of [-0.88, 0.88]) {
    // Legs
    add(g, box(0.05, 0.52, 0.08, IRON, xi, 0.26, 0.05));
    add(g, box(0.05, 0.52, 0.08, IRON, xi, 0.26, -0.28));
    // Armrest
    add(g, box(0.05, 0.05, 0.45, IRON, xi, 0.58, -0.12));
    // Cross brace
    add(g, box(0.04, 0.04, 0.42, IRON, xi, 0.18, -0.11));
    // Decorative arc (torus segment faked with small box curve)
    const arc = cyl(0.04, 0.04, 0.32, 8, IRON, xi, 0.35, -0.28);
    arc.rotation.x = Math.PI * 0.35;
    g.add(arc);
  }

  // Ground rail
  add(g, box(1.9, 0.04, 0.04, IRON, 0, 0.04, 0.05));
  add(g, box(1.9, 0.04, 0.04, IRON, 0, 0.04, -0.28));

  return place(g, x, z, rotY);
}

// ─── 2. CAR (Improved) ──────────────────────────────────────────────────────

export function mkCar(x, z, color = 0x1a5faa, rotY = 0) {
  const g = new THREE.Group();
  const DARK = 0x111111, CHROME = 0xcccccc, GLASS = 0x88bbcc, LIGHT_F = 0xffffcc, LIGHT_R = 0xff2200;

  // Body
  add(g, box(4.2, 0.9, 1.9, color, 0, 0.65, 0));

  // Cab (tapered feel via two boxes)
  add(g, box(2.4, 0.72, 1.76, color, -0.2, 1.41, 0));

  // Windshield
  add(g, box(0.05, 0.6, 1.5, GLASS, 0.9, 1.35, 0, 0, 0, -0.3));

  // Rear window
  add(g, box(0.05, 0.6, 1.5, GLASS, -1.35, 1.35, 0, 0, 0, 0.3));

  // Side windows (L & R)
  for (let wz of [-0.88, 0.88]) {
    add(g, box(1.5, 0.4, 0.05, GLASS, -0.2, 1.48, wz));
  }

  // Hood
  add(g, box(1.2, 0.1, 1.88, color, 1.5, 1.12, 0));

  // Bumpers
  add(g, box(0.15, 0.28, 2.0, CHROME, 2.08, 0.35, 0));
  add(g, box(0.15, 0.28, 2.0, CHROME, -2.08, 0.35, 0));

  // Grille
  add(g, box(0.08, 0.22, 0.9, DARK, 2.09, 0.6, 0));

  // Headlights (front)
  for (let wz of [-0.55, 0.55]) {
    add(g, box(0.08, 0.14, 0.28, LIGHT_F, 2.1, 0.65, wz));
  }

  // Taillights (rear)
  for (let wz of [-0.55, 0.55]) {
    add(g, box(0.08, 0.18, 0.28, LIGHT_R, -2.1, 0.65, wz));
  }

  // Wheels (4)
  for (let wx of [-1.35, 1.35]) {
    for (let wz of [-0.98, 0.98]) {
      const tire = cyl(0.38, 0.38, 0.24, 16, DARK, wx, 0.38, wz, 0, 0, Math.PI / 2);
      const rim  = cyl(0.22, 0.22, 0.26, 8, CHROME, wx, 0.38, wz, 0, 0, Math.PI / 2);
      add(g, tire, rim);
    }
  }

  // Roof rack
  add(g, box(1.8, 0.05, 1.5, CHROME, -0.2, 1.79, 0));

  // Door handles (both sides)
  for (let wz of [-0.96, 0.96]) {
    add(g, box(0.2, 0.04, 0.04, CHROME, 0.3, 0.88, wz));
    add(g, box(0.2, 0.04, 0.04, CHROME, -0.6, 0.88, wz));
  }

  // Side mirrors
  for (let wz of [-0.98, 0.98]) {
    add(g, box(0.15, 0.08, 0.04, DARK, 0.95, 1.22, wz));
  }

  return place(g, x, z, rotY);
}

// ─── 3. STREET LAMP ─────────────────────────────────────────────────────────

export function mkStreetLamp(x, z, rotY = 0) {
  const g = new THREE.Group();
  const POLE = 0x555566, LAMP = 0xffffee, BASE = 0x333344;

  // Base
  add(g, cyl(0.18, 0.22, 0.18, 8, BASE, 0, 0.09, 0));

  // Pole
  add(g, cyl(0.055, 0.07, 5.0, 10, POLE, 0, 2.6, 0));

  // Arm curve (horizontal bar)
  add(g, box(0.85, 0.07, 0.07, POLE, 0.42, 5.14, 0));

  // Lamp housing
  add(g, cyl(0.22, 0.14, 0.28, 10, BASE, 0.82, 5.0, 0));

  // Lens / bulb
  add(g, cyl(0.12, 0.12, 0.06, 10, LAMP, 0.82, 4.86, 0));

  // Decorative rings on pole
  for (let y of [0.28, 1.0, 2.0]) {
    add(g, tor(0.07, 0.012, 6, 12, BASE, 0, y, 0, Math.PI / 2));
  }

  return place(g, x, z, rotY);
}



// ─── 5. TRASH / RECYCLE BIN ─────────────────────────────────────────────────

export function mkBin(x, z, type = 'trash', rotY = 0) {
  // type: 'trash' | 'recycle'
  const g = new THREE.Group();
  const BODY  = type === 'recycle' ? 0x1a6b2e : 0x2b2b2b;
  const LID   = type === 'recycle' ? 0x1d7d34 : 0x1a1a1a;
  const LABEL = type === 'recycle' ? 0xffffff : 0xaaaaaa;

  // Bin body (slightly tapered)
  add(g, cyl(0.26, 0.22, 0.72, 12, BODY, 0, 0.46, 0));

  // Lid
  add(g, cyl(0.28, 0.27, 0.06, 12, LID, 0, 0.85, 0));
  add(g, cyl(0.08, 0.08, 0.12, 8, LID, 0, 0.91, 0)); // lid flap hinge

  // Label stripe
  add(g, cyl(0.265, 0.265, 0.1, 12, LABEL, 0, 0.55, 0));

  // Legs
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const leg = box(0.05, 0.1, 0.05, 0x222222,
      Math.cos(angle) * 0.18, 0.05, Math.sin(angle) * 0.18);
    g.add(leg);
  }

  return place(g, x, z, rotY);
}

// ─── 6. NOTICE / BULLETIN BOARD ─────────────────────────────────────────────

export function mkBulletinBoard(x, z, rotY = 0) {
  const g = new THREE.Group();
  const FRAME = 0x6b3f1a, BOARD = 0xc8a86b, POST = 0x555555;
  const PAPER1 = 0xfffdf0, PAPER2 = 0xe8f4e8, PAPER3 = 0xfce4d6;

  // Posts
  add(g, cyl(0.05, 0.05, 1.8, 8, POST, -0.75, 0.9, 0));
  add(g, cyl(0.05, 0.05, 1.8, 8, POST, 0.75, 0.9, 0));

  // Frame
  add(g, box(1.8, 1.1, 0.06, FRAME, 0, 1.5, 0));

  // Cork board surface
  add(g, box(1.65, 0.95, 0.04, BOARD, 0, 1.5, 0.02));

  // Pinned papers (decorative)
  const papers = [
    [PAPER1, -0.5, 1.6, 0.5, 0.3],
    [PAPER2,  0.2, 1.55, 0.4, 0.35],
    [PAPER3, -0.1, 1.35, 0.42, 0.28],
    [PAPER1,  0.55, 1.42, 0.38, 0.32],
    [PAPER2, -0.55, 1.35, 0.35, 0.3],
  ];
  for (const [col, px, py, pw, ph] of papers) {
    add(g, box(pw, ph, 0.01, col, px, py, 0.06));
  }

  // Pin dots
  for (const [, px, py] of papers) {
    add(g, sph(0.025, 6, 0xff3333, px, py + 0.13, 0.07));
  }

  // Header sign
  add(g, box(1.65, 0.2, 0.06, 0x8b1a1a, 0, 2.0, 0));

  return place(g, x, z, rotY);
}

// ─── 7. FOUNTAIN ────────────────────────────────────────────────────────────

export function mkFountain(x, z) {
  const g = new THREE.Group();
  const STONE = 0x9e9e8e, WATER = 0x3a9abf, BRONZE = 0x8c6b2f;

  // Base pool rim
  add(g, tor(1.0, 0.14, 12, 24, STONE, 0, 0.14, 0, Math.PI / 2));

  // Pool floor
  add(g, cyl(0.98, 0.98, 0.08, 20, STONE, 0, 0.04, 0));

  // Water surface
  add(g, cyl(0.92, 0.92, 0.04, 20, WATER, 0, 0.12, 0));

  // Centre pedestal
  add(g, cyl(0.18, 0.22, 0.7, 12, STONE, 0, 0.49, 0));

  // Upper bowl
  add(g, cyl(0.42, 0.18, 0.12, 14, STONE, 0, 0.87, 0));
  add(g, cyl(0.4, 0.4, 0.06, 14, STONE, 0, 0.82, 0)); // rim
  add(g, cyl(0.36, 0.36, 0.04, 14, WATER, 0, 0.9, 0)); // upper water

  // Spout & water jet (elongated sphere for drip)
  add(g, cyl(0.035, 0.035, 0.35, 8, BRONZE, 0, 1.06, 0));
  add(g, sph(0.08, 8, WATER, 0, 1.3, 0));

  // Decorative fish / spouts around pool
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const fx = Math.cos(angle) * 0.62;
    const fz = Math.sin(angle) * 0.62;
    add(g, cyl(0.025, 0.025, 0.28, 6, BRONZE, fx, 0.42, fz, 0.3, angle + Math.PI / 2, 0));
    add(g, sph(0.04, 6, WATER, fx * 1.05, 0.6, fz * 1.05));
  }

  return place(g, x, z);
}

// ─── 8. BICYCLE RACK + BIKE ─────────────────────────────────────────────────

export function mkBikeRack(x, z, rotY = 0) {
  const g = new THREE.Group();
  const STEEL = 0x888899;

  // Rack uprights
  for (let xi of [-0.9, -0.3, 0.3, 0.9]) {
    add(g, cyl(0.03, 0.03, 0.9, 8, STEEL, xi, 0.45, 0));
  }

  // Top rail
  add(g, cyl(0.03, 0.03, 1.92, 8, STEEL, 0, 0.9, 0, 0, 0, Math.PI / 2));

  // Bottom foot rails
  add(g, box(2.0, 0.04, 0.28, STEEL, 0, 0.04, 0));

  return place(g, x, z, rotY);
}

export function mkBike(x, z, color = 0xcc2200, rotY = 0) {
  const g = new THREE.Group();
  const FRAME = color, DARK = 0x222222, CHROME = 0xbbbbbb, RUBBER = 0x111111;

  // Wheels
  for (let wx of [-0.55, 0.55]) {
    add(g, tor(0.3, 0.05, 8, 16, RUBBER, wx, 0.32, 0, Math.PI / 2));
    add(g, cyl(0.14, 0.14, 0.04, 10, CHROME, wx, 0.32, 0, 0, 0, Math.PI / 2));
    // Spokes (4 per wheel)
    for (let s = 0; s < 4; s++) {
      const sa = (s / 4) * Math.PI;
      add(g, box(0.5, 0.018, 0.018, CHROME, wx, 0.32 + Math.sin(sa) * 0.14, Math.cos(sa) * 0.14));
    }
  }

  // Frame triangle
  add(g, box(0.8, 0.05, 0.05, FRAME, -0.07, 0.58, 0, 0, 0, 0.25));  // top tube
  add(g, box(0.62, 0.05, 0.05, FRAME, 0.2, 0.44, 0, 0, 0, -0.55));  // down tube
  add(g, box(0.55, 0.05, 0.05, FRAME, -0.28, 0.44, 0, 0, 0, 0.1));  // seat tube
  add(g, box(0.5, 0.04, 0.04, FRAME, -0.07, 0.32, 0));               // chain stay

  // Fork
  add(g, box(0.05, 0.42, 0.05, CHROME, 0.52, 0.52, 0, 0, 0, 0.15));

  // Handlebar stem + bars
  add(g, cyl(0.025, 0.025, 0.28, 6, CHROME, 0.48, 0.73, 0));
  add(g, box(0.04, 0.04, 0.5, CHROME, 0.48, 0.88, 0));

  // Grips
  for (let gz of [-0.25, 0.25]) {
    add(g, cyl(0.03, 0.03, 0.08, 8, DARK, 0.48, 0.88, gz, Math.PI / 2));
  }

  // Seat post + saddle
  add(g, cyl(0.025, 0.025, 0.3, 6, CHROME, -0.27, 0.74, 0));
  add(g, box(0.35, 0.04, 0.13, DARK, -0.27, 0.9, 0));

  // Pedals
  add(g, box(0.12, 0.03, 0.05, DARK, 0.02, 0.28, 0.15));
  add(g, box(0.12, 0.03, 0.05, DARK, 0.02, 0.36, -0.15));

  return place(g, x, z, rotY);
}

// ─── 9. FLAG POLE ───────────────────────────────────────────────────────────

export function mkFlagPole(x, z, flagColor = 0xcc0000, rotY = 0) {
  const g = new THREE.Group();
  const POLE = 0xcccccc, BASE = 0x555566;

  // Concrete base block
  add(g, box(0.6, 0.25, 0.6, BASE, 0, 0.125, 0));
  add(g, box(0.45, 0.1, 0.45, BASE, 0, 0.3, 0));

  // Pole (tall thin cylinder)
  add(g, cyl(0.04, 0.055, 8.0, 10, POLE, 0, 4.25, 0));

  // Top ball finial
  add(g, sph(0.1, 8, 0xffdd00, 0, 8.3, 0));

  // Flag
  add(g, box(1.4, 0.65, 0.03, flagColor, 0.7, 7.7, 0));

  // White stripe on flag
  add(g, box(1.4, 0.1, 0.04, 0xffffff, 0.7, 7.65, 0));
  add(g, box(1.4, 0.1, 0.04, 0xffffff, 0.7, 7.85, 0));

  // Halyard line (thin wire)
  add(g, cyl(0.008, 0.008, 8.0, 4, 0x888888, 0.04, 4.25, 0));

  return place(g, x, z, rotY);
}

// ─── 10. PICNIC TABLE ───────────────────────────────────────────────────────

export function mkPicnicTable(x, z, rotY = 0) {
  const g = new THREE.Group();
  const WOOD = 0x9b6b3a, METAL = 0x555555;

  // Tabletop (3 planks)
  for (let i = 0; i < 3; i++) {
    add(g, box(2.0, 0.06, 0.26, WOOD, 0, 0.76, -0.26 + i * 0.26));
  }

  // Bench seats (2 sides)
  for (let bz of [-0.82, 0.82]) {
    for (let i = 0; i < 2; i++) {
      add(g, box(1.8, 0.06, 0.22, WOOD, 0, 0.45, bz + (i - 0.5) * 0.22));
    }
  }

  // A-frame supports (2 sets)
  for (let xi of [-0.7, 0.7]) {
    // Table legs (X form)
    const l1 = box(0.06, 0.82, 0.06, METAL, xi, 0.41, 0);
    l1.rotation.z =  0.38;
    g.add(l1);
    const l2 = box(0.06, 0.82, 0.06, METAL, xi, 0.41, 0);
    l2.rotation.z = -0.38;
    g.add(l2);

    // Bench support arms
    for (let bz of [-0.82, 0.82]) {
      const arm = box(0.05, 0.58, 0.05, METAL, xi, 0.28, bz);
      arm.rotation.z = bz > 0 ? 0.28 : -0.28;
      g.add(arm);
    }
  }

  // Cross braces under table
  add(g, box(0.04, 0.04, 1.2, METAL, 0, 0.34, 0));

  return place(g, x, z, rotY);
}

// ─── 11. VENDING MACHINE ────────────────────────────────────────────────────

export function mkVendingMachine(x, z, rotY = 0) {
  const g = new THREE.Group();
  const BODY = 0x1a3a6b, PANEL = 0x112255, GLASS = 0x88ccdd, TRIM = 0xcccccc;
  const COIN = 0xddaa22, BUTTON = 0xff4444;

  // Main body
  add(g, box(0.95, 1.85, 0.65, BODY, 0, 0.925, 0));

  // Glass display window
  add(g, box(0.6, 0.95, 0.08, GLASS, 0, 1.3, 0.31));

  // Product rows inside (colorful items)
  const PRODS = [0xff4422, 0x22aaff, 0xffcc00, 0x22cc66, 0xff88cc, 0xcc44ff];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      add(g, box(0.13, 0.18, 0.04, PRODS[row * 3 + col], -0.2 + col * 0.2, 1.5 - row * 0.25, 0.29));
    }
  }

  // Control panel
  add(g, box(0.6, 0.32, 0.08, PANEL, 0, 0.7, 0.31));

  // Buttons grid
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      add(g, box(0.05, 0.05, 0.03, BUTTON, -0.15 + c * 0.15, 0.8 - r * 0.13, 0.33));
    }
  }

  // Coin slot
  add(g, box(0.1, 0.02, 0.03, COIN, 0.2, 0.7, 0.33));

  // Dispensing tray
  add(g, box(0.5, 0.1, 0.12, TRIM, 0, 0.08, 0.3));

  // Ventilation slots (top)
  for (let i = 0; i < 4; i++) {
    add(g, box(0.6, 0.02, 0.02, PANEL, 0, 1.8 - i * 0.04, 0.31));
  }

  // Trim strips
  add(g, box(0.96, 0.04, 0.66, TRIM, 0, 1.82, 0));
  add(g, box(0.96, 0.04, 0.66, TRIM, 0, 0.01, 0));

  return place(g, x, z, rotY);
}

// ─── 12. BUS SHELTER ────────────────────────────────────────────────────────

export function mkBusShelter(x, z, rotY = 0) {
  const g = new THREE.Group();
  const STEEL = 0x778899, GLASS = 0xaaddee, ROOF = 0x334455, AD = 0xffeedd;

  // Posts (3 vertical)
  for (let px of [-1.5, 0, 1.5]) {
    add(g, cyl(0.045, 0.045, 2.6, 8, STEEL, px, 1.3, -0.7));
  }

  // Roof
  add(g, box(3.3, 0.1, 1.55, ROOF, 0, 2.65, 0));

  // Roof overhang drip edge
  add(g, box(3.45, 0.05, 0.06, STEEL, 0, 2.59, 0.78));
  add(g, box(3.45, 0.05, 0.06, STEEL, 0, 2.59, -0.78));

  // Back glass panel
  add(g, box(3.2, 2.0, 0.06, GLASS, 0, 1.2, -0.7));

  // Side glass panels
  for (let sx of [-1.5, 1.5]) {
    add(g, box(0.06, 2.0, 1.4, GLASS, sx, 1.2, -0.01));
  }

  // Bench inside
  add(g, box(2.6, 0.07, 0.35, 0x8b5e3c, 0, 0.52, -0.4));
  for (let bx of [-1.1, 1.1]) {
    add(g, box(0.08, 0.5, 0.35, STEEL, bx, 0.28, -0.4));
  }

  // Ad panel (on back wall)
  add(g, box(1.2, 1.3, 0.05, AD, 0.8, 1.4, -0.68));

  // Route sign
  add(g, box(0.7, 0.24, 0.06, 0x1a3a8b, -1.1, 2.3, -0.68));

  // Curb edge
  add(g, box(3.6, 0.08, 0.25, 0xbbbbbb, 0, 0.04, 0.6));

  return place(g, x, z, rotY);
}

// ─── 13. STATUE / MONUMENT ──────────────────────────────────────────────────

export function mkStatue(x, z, rotY = 0) {
  const g = new THREE.Group();
  const STONE = 0x9e9e8e, BRONZE = 0x7a5c2a;

  // Multi-step plinth
  add(g, box(1.4, 0.22, 1.4, STONE, 0, 0.11, 0));
  add(g, box(1.1, 0.22, 1.1, STONE, 0, 0.33, 0));
  add(g, box(0.82, 1.1, 0.82, STONE, 0, 1.0, 0));

  // Plaque on base
  add(g, box(0.55, 0.22, 0.04, 0xaa8833, 0, 0.88, 0.42));

  // Figure body
  add(g, cyl(0.12, 0.16, 0.72, 10, BRONZE, 0, 1.92, 0));

  // Torso
  add(g, box(0.32, 0.44, 0.22, BRONZE, 0, 2.44, 0));

  // Head
  add(g, sph(0.155, 10, BRONZE, 0, 2.88, 0));

  // Arms
  const armL = box(0.08, 0.38, 0.08, BRONZE, -0.24, 2.5, 0);
  armL.rotation.z =  0.45;
  g.add(armL);
  const armR = box(0.08, 0.38, 0.08, BRONZE,  0.24, 2.5, 0);
  armR.rotation.z = -0.65;
  g.add(armR);

  // Book prop in right arm
  add(g, box(0.18, 0.22, 0.06, 0xddddcc, 0.42, 2.45, 0));

  return place(g, x, z, rotY);
}

// ─── 14. FIRE HYDRANT ───────────────────────────────────────────────────────

export function mkFireHydrant(x, z) {
  const g = new THREE.Group();
  const RED = 0xcc1111, CHROME = 0xcccccc;

  add(g, cyl(0.1, 0.13, 0.1, 10, RED, 0, 0.05, 0));        // base flange
  add(g, cyl(0.11, 0.11, 0.38, 10, RED, 0, 0.29, 0));       // barrel
  add(g, cyl(0.13, 0.11, 0.08, 10, RED, 0, 0.52, 0));       // shoulder
  add(g, cyl(0.1, 0.1, 0.1, 8, RED, 0, 0.61, 0));           // neck
  add(g, cyl(0.12, 0.12, 0.06, 6, CHROME, 0, 0.68, 0));     // cap ring
  add(g, cyl(0.07, 0.07, 0.09, 6, CHROME, 0, 0.745, 0));    // cap

  // Side outlets (2)
  for (let side of [-1, 1]) {
    const out = cyl(0.045, 0.045, 0.1, 8, CHROME, side * 0.15, 0.36, 0, 0, 0, Math.PI / 2);
    g.add(out);
    add(g, cyl(0.055, 0.055, 0.02, 8, RED, side * 0.21, 0.36, 0, 0, 0, Math.PI / 2));
  }

  // Chain (fake — thin box)
  add(g, box(0.01, 0.14, 0.01, 0x888888, 0.05, 0.6, 0));

  return place(g, x, z);
}

// ─── 15. BOLLARD ────────────────────────────────────────────────────────────

export function mkBollard(x, z, color = 0xcc6600) {
  const g = new THREE.Group();

  add(g, cyl(0.1, 0.12, 0.08, 10, 0x444444, 0, 0.04, 0));   // base
  add(g, cyl(0.085, 0.1, 0.72, 10, color, 0, 0.44, 0));      // post
  add(g, tor(0.09, 0.025, 6, 12, 0x333333, 0, 0.52, 0, Math.PI / 2)); // reflective band
  add(g, tor(0.09, 0.025, 6, 12, 0x333333, 0, 0.35, 0, Math.PI / 2));
  add(g, cyl(0.075, 0.085, 0.06, 10, color, 0, 0.81, 0));    // cap

  return place(g, x, z);
}

// ─── 16. CAMPUS SIGNPOST ────────────────────────────────────────────────────

export function mkSignpost(x, z, labels = ['Library →', 'Cafeteria ↑', 'Parking ←'], rotY = 0) {
  const g = new THREE.Group();
  const POST = 0x555566, SIGN = 0x1a3a6b, TEXT_COL = 0xffffff;

  // Post
  add(g, cyl(0.05, 0.06, 2.4, 8, POST, 0, 1.2, 0));

  // Base plate
  add(g, box(0.3, 0.1, 0.3, POST, 0, 0.05, 0));

  // Sign blades (staggered angles)
  const angles = [0.0, 0.22, -0.22];
  for (let i = 0; i < Math.min(labels.length, 3); i++) {
    const blade = box(0.85, 0.18, 0.04, SIGN, 0.36, 2.1 - i * 0.26, 0);
    blade.rotation.y = angles[i];
    g.add(blade);
    // White face
    const face = box(0.82, 0.15, 0.01, TEXT_COL, 0.36, 2.1 - i * 0.26, 0.025);
    face.rotation.y = angles[i];
    g.add(face);
  }

  return place(g, x, z, rotY);
}

// ─── 17. NEWSPAPER / FLYER STAND ────────────────────────────────────────────

export function mkPaperStand(x, z, rotY = 0) {
  const g = new THREE.Group();
  const BODY = 0x2255aa, CHROME = 0xbbbbbb, PAPER = 0xf5f0e0;

  // Box body
  add(g, box(0.42, 0.52, 0.3, BODY, 0, 0.44, 0));

  // Front door (glass)
  add(g, box(0.38, 0.42, 0.04, 0x88aacc, 0, 0.46, 0.16));

  // Handle
  add(g, box(0.18, 0.03, 0.04, CHROME, 0, 0.38, 0.19));

  // Papers stacked inside
  for (let i = 0; i < 3; i++) {
    add(g, box(0.35, 0.02, 0.24, PAPER, 0, 0.24 + i * 0.06, 0));
  }

  // Legs
  for (let lx of [-0.15, 0.15]) {
    add(g, cyl(0.025, 0.025, 0.2, 6, CHROME, lx, 0.1, 0));
  }

  // Header label strip
  add(g, box(0.42, 0.1, 0.31, 0x113388, 0, 0.73, 0));

  return place(g, x, z, rotY);
}

// ─── 18. CAMPUS BUS STOP POLE ───────────────────────────────────────────────

export function mkBusStopPole(x, z, rotY = 0) {
  const g = new THREE.Group();
  const POLE = 0x2266cc, SIGN = 0xffcc00, FRAME = 0x1144aa;

  // Pole
  add(g, cyl(0.04, 0.05, 3.2, 8, POLE, 0, 1.6, 0));

  // Bus icon sign (square)
  add(g, box(0.45, 0.45, 0.06, SIGN, 0, 2.8, 0));
  add(g, box(0.38, 0.38, 0.05, FRAME, 0, 2.8, 0.03));

  // Bus icon body (tiny boxes)
  add(g, box(0.18, 0.1, 0.03, SIGN, 0, 2.8, 0.06));
  for (let wx of [-0.06, 0.06]) {
    add(g, cyl(0.025, 0.025, 0.02, 6, 0x222222, wx, 2.77, 0.07, 0, 0, Math.PI / 2));
  }

  // Timetable box below sign
  add(g, box(0.38, 0.5, 0.06, 0xffffff, 0, 2.25, 0));
  add(g, box(0.34, 0.46, 0.03, 0xeeeeff, 0, 2.25, 0.04));

  // Base foot
  add(g, box(0.22, 0.08, 0.22, 0x444455, 0, 0.04, 0));

  return place(g, x, z, rotY);
}