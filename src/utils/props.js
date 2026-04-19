/**
 * props.js — Ultra-realistic university campus props
 * 1 unit = 1 metre  |  y=0 is ground level
 * All props: drop-in via place(g, x, z, rotY)
 */

import * as THREE from 'three';
import { scene }  from '../scene.js';
import { getMat } from '../materials.js';

// ═══════════════════════════════════════════════════════════
//  GEOMETRY HELPERS
// ═══════════════════════════════════════════════════════════
const _G = {
  box  : (w,h,d) => new THREE.BoxGeometry(w,h,d),
  cyl  : (rt,rb,h,s) => new THREE.CylinderGeometry(rt,rb,h,s),
  sph  : (r,s)   => new THREE.SphereGeometry(r,s,s),
  tor  : (r,t,rs,ts) => new THREE.TorusGeometry(r,t,rs,ts),
  plane: (w,h)   => new THREE.PlaneGeometry(w,h),
  cone : (r,h,s) => new THREE.ConeGeometry(r,h,s),
  oct  : (r)     => new THREE.OctahedronGeometry(r),
};

function mk(geo, color, opts={}) {
  const mat = getMat(color);
  if (opts.emissive !== undefined) { mat.emissive = new THREE.Color(opts.emissive); mat.emissiveIntensity = opts.ei ?? 0.4; }
  if (opts.transp)  { mat.transparent = true; mat.opacity = opts.opacity ?? 0.55; }
  if (opts.side2)   { mat.side = THREE.DoubleSide; }
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// Shorthand mesh builders
const B  = (w,h,d, col, opts)        => mk(_G.box(w,h,d),     col, opts);
const C  = (rt,rb,h,s, col, opts)    => mk(_G.cyl(rt,rb,h,s), col, opts);
const S  = (r,s, col, opts)          => mk(_G.sph(r,s),        col, opts);
const T  = (r,t,rs,ts, col, opts)    => mk(_G.tor(r,t,rs,ts),  col, opts);
const CN = (r,h,s, col, opts)        => mk(_G.cone(r,h,s),     col, opts);

function at(mesh, x, y, z, rx=0, ry=0, rz=0) {
  mesh.position.set(x,y,z);
  if(rx||ry||rz) mesh.rotation.set(rx,ry,rz);
  return mesh;
}

function place(g, x, z, rotY=0) {
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
  return g;
}

// ═══════════════════════════════════════════════════════════
//  1.  PARK BENCH  — cast-iron & hardwood slat style
//      Accurate to Victorian-era Indian park benches
// ═══════════════════════════════════════════════════════════
export function mkBench(x, z, rotY=0) {
  const g   = new THREE.Group();
  const OAK = 0x8b5e3c,  // oiled oak slats
        IRN = 0x2a2a2a,  // cast iron (very dark, almost black)
        RUS = 0x3a3030;  // rust tint on base flanges

  // ── 5 seat slats (real bench: 5 planks, not 3) ──────────────
  for (let i=0; i<5; i++) {
    const sl = B(2.05, 0.042, 0.09, OAK);
    at(sl, 0, 0.50, -0.18 + i*0.092); g.add(sl);
  }

  // ── 3 backrest slats (angled back 12°) ───────────────────────
  for (let i=0; i<3; i++) {
    const sl = B(2.05, 0.042, 0.09, OAK);
    sl.position.set(0, 0.74 + i*0.11, -0.30);
    sl.rotation.x = -0.20;
    g.add(sl);
  }

  // ── Cast-iron side frames (2 ends) ───────────────────────────
  for (const sx of [-0.96, 0.96]) {
    // Legs: two angled legs forming an A-shape
    const legF = C(0.028,0.028, 0.52, 8, IRN);
    legF.position.set(sx, 0.26, 0.10); legF.rotation.z = -0.08;
    g.add(legF);
    const legB = C(0.028,0.028, 0.55, 8, IRN);
    legB.position.set(sx, 0.28, -0.22); legB.rotation.z = 0.06;
    g.add(legB);

    // Armrest (flat on top)
    const arm = B(0.055, 0.03, 0.50, IRN);
    at(arm, sx, 0.62, -0.09); g.add(arm);
    // Armrest end rounded cap
    const cap = S(0.028, 8, IRN);
    at(cap, sx, 0.62, -0.34); g.add(cap);

    // Back support brace
    const brace = C(0.018,0.018, 0.60, 6, IRN);
    brace.position.set(sx, 0.72, -0.32);
    brace.rotation.x = -0.35;
    g.add(brace);

    // Scrolled foot (decorative flat oval)
    const foot = T(0.055, 0.018, 6, 10, IRN);
    at(foot, sx, 0.025, 0.06, Math.PI/2, 0, 0.3);
    g.add(foot);

    // Base ground flange
    const fl = B(0.11, 0.04, 0.14, RUS);
    at(fl, sx, 0.02, -0.07); g.add(fl);
  }

  // ── Central cross-brace under seat ───────────────────────────
  const cb = C(0.016,0.016, 1.98, 6, IRN);
  at(cb, 0, 0.26, 0, 0, 0, Math.PI/2); g.add(cb);

  return place(g, x, z, rotY);
}

// ═══════════════════════════════════════════════════════════
//  2.  CAR  — Indian university-style Maruti Suzuki sedan
//      Accurate proportions, full detail
// ═══════════════════════════════════════════════════════════
export function mkCar(x, z, color=0xc8c8c8, rotY=0) {
  const g    = new THREE.Group();
  const BODY = color;
  const DARK = 0x111111,
        GLAS = 0x88b8cc,
        CHRM = 0xd4d4d4,
        LAMP = 0xffffcc,
        TAIL = 0xff2200,
        RBER = 0x181818,
        SEAT = 0x333333,
        EXST = 0x666666;

  // ── Body shell ────────────────────────────────────────────
  // Main body (sill to roof shoulder line)
  g.add(at(B(4.10, 0.75, 1.82, BODY),  0, 0.75, 0));
  // Roofline cab (slightly narrower, taller) 
  g.add(at(B(2.20, 0.72, 1.70, BODY), -0.28, 1.47, 0));

  // Front bonnet slope (wedge via rotation)
  const hood = B(1.10, 0.14, 1.80, BODY);
  hood.position.set(1.35, 1.16, 0); hood.rotation.z = 0.10;
  g.add(hood);

  // Boot / trunk lid
  const boot = B(0.82, 0.12, 1.80, BODY);
  boot.position.set(-1.65, 1.16, 0); boot.rotation.z = -0.08;
  g.add(boot);

  // Wheel-arch flares (4 bulges, squished sphere)
  for (const [wx, wz] of [[-1.25,-0.95],[-1.25,0.95],[1.25,-0.95],[1.25,0.95]]) {
    const flare = S(0.38, 10, BODY);
    flare.scale.set(0.55, 0.38, 0.52);
    flare.position.set(wx, 0.58, wz); g.add(flare);
  }

  // ── Glass ─────────────────────────────────────────────────
  // Windscreen (angled)
  const ws = B(0.05, 0.62, 1.56, GLAS, {transp:true, opacity:0.60});
  ws.position.set(0.82, 1.42, 0); ws.rotation.z = -0.52; g.add(ws);
  // Rear screen
  const rs = B(0.05, 0.58, 1.52, GLAS, {transp:true, opacity:0.55});
  rs.position.set(-1.26, 1.40, 0); rs.rotation.z = 0.48; g.add(rs);
  // Side windows (L/R, front/rear)
  for (const wz of [-0.90, 0.90]) {
    g.add(at(B(0.95, 0.44, 0.04, GLAS, {transp:true, opacity:0.6}),  0.18, 1.48, wz));
    g.add(at(B(0.82, 0.40, 0.04, GLAS, {transp:true, opacity:0.6}), -0.85, 1.45, wz));
    // Window trim
    g.add(at(B(1.00, 0.05, 0.04, DARK), 0.18, 1.72, wz));
    g.add(at(B(0.86, 0.05, 0.04, DARK),-0.85, 1.68, wz));
  }

  // ── Door panels & lines ───────────────────────────────────
  for (const wz of [-0.915, 0.915]) {
    // Door line crease
    g.add(at(B(3.80, 0.025, 0.04, DARK), 0, 0.97, wz));
    // Door handle (2 per side)
    const dh1 = B(0.18, 0.04, 0.04, CHRM); dh1.position.set( 0.35, 0.96, wz); g.add(dh1);
    const dh2 = B(0.18, 0.04, 0.04, CHRM); dh2.position.set(-0.72, 0.96, wz); g.add(dh2);
    // Side mirror
    const mir = B(0.18, 0.10, 0.06, DARK); mir.position.set(0.90, 1.26, wz*1.02); g.add(mir);
  }

  // ── Front detail ──────────────────────────────────────────
  // Bumper
  g.add(at(B(0.14, 0.30, 1.90, CHRM), 2.08, 0.40, 0));
  // Grille shell
  g.add(at(B(0.10, 0.24, 1.10, DARK), 2.10, 0.64, 0));
  // Grille bars (5 horizontal)
  for (let i=0; i<5; i++) g.add(at(B(0.06, 0.025, 1.08, CHRM), 2.12, 0.52+i*0.05, 0));
  // Headlight (L/R) — housing + lens
  for (const hz of [-0.58, 0.58]) {
    g.add(at(B(0.12, 0.20, 0.34, DARK), 2.10, 0.74, hz));
    g.add(at(B(0.08, 0.16, 0.28, LAMP, {emissive:0xffffaa, ei:0.3}), 2.12, 0.74, hz));
  }
  // Fog lamps
  for (const hz of [-0.62, 0.62]) {
    g.add(at(B(0.06, 0.08, 0.14, LAMP, {emissive:0xffffcc, ei:0.2}), 2.10, 0.38, hz));
  }
  // Number plate front
  g.add(at(B(0.04, 0.10, 0.44, 0xffffff), 2.12, 0.38, 0));

  // ── Rear detail ───────────────────────────────────────────
  g.add(at(B(0.14, 0.30, 1.90, CHRM), -2.08, 0.40, 0));
  // Tail lights
  for (const tz of [-0.60, 0.60]) {
    g.add(at(B(0.08, 0.24, 0.34, TAIL, {emissive:0xcc0000, ei:0.25}), -2.10, 0.74, tz));
    g.add(at(B(0.06, 0.06, 0.18, 0xffffff), -2.10, 0.65, tz)); // reverse light
  }
  // Number plate rear
  g.add(at(B(0.04, 0.10, 0.44, 0xffffff), -2.12, 0.36, 0));
  // Exhaust pipe
  const ex = C(0.040,0.044, 0.22, 8, EXST);
  ex.position.set(-2.08, 0.22, -0.60); ex.rotation.z = Math.PI/2; g.add(ex);
  const exR = C(0.042,0.042, 0.04, 8, DARK); // rim
  exR.position.set(-2.20, 0.22, -0.60); exR.rotation.z = Math.PI/2; g.add(exR);

  // ── Wheels (4) ────────────────────────────────────────────
  for (const [wx, wz] of [[-1.25,-0.97],[-1.25,0.97],[1.25,-0.97],[1.25,0.97]]) {
    const side = wz < 0 ? -1 : 1;
    // Tyre
    const tyre = T(0.350, 0.095, 8, 20, RBER);
    tyre.rotation.x = Math.PI/2; tyre.position.set(wx, 0.38, wz); g.add(tyre);
    // Tyre sidewall
    g.add(at(C(0.350,0.350, 0.20, 20, 0x222222), wx, 0.38, wz, 0,0,Math.PI/2));
    // Alloy rim centre disk
    g.add(at(C(0.230,0.230, 0.22, 8, 0xd0d0d0), wx, 0.38, wz, 0,0,Math.PI/2));
    // 5 rim spokes
    for (let sp=0; sp<5; sp++) {
      const spoke = B(0.04, 0.04, 0.28, CHRM);
      spoke.position.set(wx, 0.38 + Math.cos(sp*Math.PI*0.4)*0.15, wz + side*Math.sin(sp*Math.PI*0.4)*0.15);
      spoke.rotation.z = Math.PI/2; g.add(spoke);
    }
    // Centre cap
    g.add(at(C(0.068,0.068, 0.04, 8, DARK), wx, 0.38, wz, 0,0,Math.PI/2));
    // Brake caliper (red)
    g.add(at(B(0.08,0.12,0.12,0xcc2222), wx, 0.38, wz - side*0.14));
  }

  // ── Undercarriage ─────────────────────────────────────────
  g.add(at(B(3.60,0.10,1.70, 0x222222), 0, 0.18, 0));
  // Rocker panels
  for (const wz of [-0.94, 0.94]) g.add(at(B(3.40,0.12,0.06, DARK), 0, 0.38, wz));
  // Roof edge chrome strip
  g.add(at(B(2.18,0.04,0.04, CHRM), -0.28, 1.84, -0.86));
  g.add(at(B(2.18,0.04,0.04, CHRM), -0.28, 1.84,  0.86));

  // ── Sunroof / roof ────────────────────────────────────────
  g.add(at(B(1.30,0.04,1.50, DARK), -0.28, 1.84, 0)); // roof panel

  return place(g, x, z, rotY);
}

// ═══════════════════════════════════════════════════════════
//  3.  STREET LAMP  — modern cobra-head LED street light
// ═══════════════════════════════════════════════════════════
export function mkStreetLamp(x, z, rotY=0) {
  const g    = new THREE.Group();
  const POLE = 0x4a4a55,
        BASE = 0x38383f,
        HSG  = 0x2a2a35,
        LED  = 0xfff5dd,
        BOLT = 0x888888;

  // Concrete footing
  g.add(at(C(0.24,0.28, 0.35, 8, 0xb8b8b0),  0, 0.175, 0));

  // Pole (tapered octagonal — realistic street pole)
  g.add(at(C(0.058,0.080, 5.80, 8, POLE),     0, 3.25, 0));
  // Pole base collar
  g.add(at(C(0.130,0.140, 0.20, 8, BASE),     0, 0.45, 0));
  // Cable entry box
  g.add(at(B(0.16,0.12,0.14, BASE),           0, 0.90, 0.06));

  // Arm: horizontal then curving up
  g.add(at(B(0.88,0.065,0.065, POLE),  0.44, 6.18, 0));
  // Arm taper to head
  g.add(at(C(0.040,0.052, 0.32, 8, POLE, 0.90, 6.14, 0, 0,0,Math.PI/2)));
  g.add(at(B(0.06,0.22,0.06, POLE), 0.93, 6.28, 0));

  // Lamp housing (cobra-head shape)
  const hsg = B(0.65, 0.14, 0.38, HSG);
  hsg.position.set(0.94, 6.14, 0); g.add(hsg);
  // Housing underside taper
  const hsgB = B(0.60,0.06,0.34, 0x333340);
  hsgB.position.set(0.94, 6.06, 0); g.add(hsgB);
  // LED panel (glowing)
  const led = B(0.52, 0.02, 0.30, LED, {emissive:0xffe8aa, ei:0.8});
  led.position.set(0.94, 6.07, 0); g.add(led);
  // Visor overhang
  const visor = B(0.68,0.04,0.40, HSG);
  visor.position.set(0.96, 6.21, 0); g.add(visor);

  // ── Decorative bands on pole (rings every 1.2m) ───────────
  for (const y of [0.72, 1.92, 3.20]) {
    g.add(at(T(0.082, 0.014, 8, 12, BASE), 0, y, 0, Math.PI/2));
  }

  // ── Mounting bolts at base (4) ────────────────────────────
  for (let i=0; i<4; i++) {
    const blt = C(0.012,0.012, 0.14, 6, BOLT);
    blt.position.set(Math.cos(i*Math.PI/2)*0.20, 0.36, Math.sin(i*Math.PI/2)*0.20);
    g.add(blt);
  }

  return place(g, x, z, rotY);
}

// ═══════════════════════════════════════════════════════════
//  4.  TREE  — layered foliage neem/peepal style
// ═══════════════════════════════════════════════════════════
export function mkTree(x, z, scale=1.0) {
  const g    = new THREE.Group();
  const BARK = 0x5c3820,
        BARK2= 0x4a2e14,
        L1   = 0x2d6b1a,  // dark inner
        L2   = 0x3d8522,  // mid
        L3   = 0x4daa2a,  // bright tips
        L4   = 0x28551a;  // shadow underside

  const s = scale;

  // ── Root flares (buttress roots) ─────────────────────────
  for (let i=0; i<6; i++) {
    const a = (i/6)*Math.PI*2;
    const rf = B(0.18*s, 0.28*s, 0.10*s, BARK2);
    rf.position.set(Math.cos(a)*0.22*s, 0.14*s, Math.sin(a)*0.22*s);
    rf.rotation.y = a; g.add(rf);
  }

  // ── Trunk (tapered, slightly irregular) ──────────────────
  g.add(at(C(0.170*s, 0.240*s, 1.80*s, 10, BARK),  0, 0.90*s, 0));
  g.add(at(C(0.135*s, 0.175*s, 0.80*s, 10, BARK),  0, 2.10*s, 0));

  // Bark texture bands
  for (let y=0.3; y<1.9; y+=0.35) {
    g.add(at(T(0.16*s,0.012*s, 6,10, BARK2), 0, y*s, 0, Math.PI/2));
  }

  // ── Lower scaffold branches ───────────────────────────────
  for (let i=0; i<5; i++) {
    const a = (i/5)*Math.PI*2;
    const br = C(0.045*s,0.032*s, 0.85*s, 6, BARK);
    br.position.set(Math.cos(a)*0.28*s, 2.1*s, Math.sin(a)*0.28*s);
    br.rotation.z = Math.cos(a)*0.5; br.rotation.x = Math.sin(a)*0.5;
    g.add(br);
  }

  // ── Foliage (multi-sphere cloud, 3 layers) ────────────────
  // Layer 1: dense inner dark mass
  for (let i=0; i<7; i++) {
    const a = (i/7)*Math.PI*2, r=0.55*s;
    const sp = S(0.72*s, 8, L4);
    sp.position.set(Math.cos(a)*r, 2.55*s, Math.sin(a)*r); g.add(sp);
  }
  // Layer 2: mid canopy
  for (let i=0; i<9; i++) {
    const a = (i/9)*Math.PI*2 + 0.2, r=0.82*s;
    const sp = S(0.68*s, 8, L1);
    sp.position.set(Math.cos(a)*r, 2.9*s+Math.random()*0.2*s, Math.sin(a)*r); g.add(sp);
  }
  // Layer 3: bright top
  for (let i=0; i<6; i++) {
    const a = (i/6)*Math.PI*2, r=0.40*s;
    const sp = S(0.60*s, 8, L2);
    sp.position.set(Math.cos(a)*r, 3.4*s, Math.sin(a)*r); g.add(sp);
  }
  // Crown top
  g.add(at(S(0.65*s, 8, L3), 0, 3.88*s, 0));
  g.add(at(S(0.40*s, 8, L2), 0, 4.38*s, 0));

  return place(g, x, z);
}

// ═══════════════════════════════════════════════════════════
//  5.  TRASH BIN  — realistic municipal swing-lid bin
// ═══════════════════════════════════════════════════════════
export function mkBin(x, z, type='trash', rotY=0) {
  const g    = new THREE.Group();
  const isR  = type==='recycle';
  const BODY = isR ? 0x1e7a38 : 0x1e1e1e,
        LID  = isR ? 0x22903f : 0x141414,
        RING = isR ? 0x55ff88 : 0x444444,
        FOOT = 0x111111;

  // Body (tapered cylinder — wider at top)
  g.add(at(C(0.255,0.215, 0.72, 14, BODY), 0, 0.45, 0));

  // Reinforcement hoops
  for (const y of [0.16, 0.44, 0.72]) {
    g.add(at(T(0.248,0.016, 8,14, 0x333333), 0, y, 0, Math.PI/2));
  }

  // Label / icon band
  g.add(at(C(0.258,0.258, 0.090, 14, RING), 0, 0.52, 0));

  // Lid (domed, with hinge bump at back)
  g.add(at(C(0.268,0.258, 0.055, 14, LID), 0, 0.845, 0));
  const dome = S(0.255, 14, LID); dome.scale.y=0.38;
  dome.position.set(0, 0.87, 0); g.add(dome);
  // Lift handle on lid
  g.add(at(T(0.06,0.012, 6,8, 0x888888), 0, 0.935, 0, Math.PI/2));

  // Hinge at back
  g.add(at(C(0.025,0.025, 0.26, 6, 0x666666), 0, 0.835, -0.245, 0,0,Math.PI/2));

  // Foot ring (rubber anti-slip)
  g.add(at(T(0.20,0.030, 8,14, FOOT), 0, 0.032, 0, Math.PI/2));

  return place(g, x, z, rotY);
}

// ═══════════════════════════════════════════════════════════
//  6.  NOTICE BOARD  — outdoor cork board with wooden frame
// ═══════════════════════════════════════════════════════════
export function mkBulletinBoard(x, z, rotY=0) {
  const g    = new THREE.Group();
  const TEAK = 0x6b4020,
        CORK = 0xc8a06a,
        POST = 0x444444,
        MAROON = 0x6b0a0a;

  // Posts (rectangular steel, not cylinders — matches school boards)
  for (const px of [-0.80, 0.80]) {
    g.add(at(B(0.06,2.05,0.06, POST),  px, 1.025, 0));
    // Post foot anchor
    g.add(at(B(0.12,0.10,0.12, 0x333333), px, 0.05, 0));
  }

  // Outer wooden frame (4 sides)
  g.add(at(B(1.82,0.08,0.06, TEAK), 0, 2.09, 0));    // top
  g.add(at(B(1.82,0.08,0.06, TEAK), 0, 0.94, 0));    // bottom
  g.add(at(B(0.08,1.22,0.06, TEAK),-0.87, 1.515, 0)); // left
  g.add(at(B(0.08,1.22,0.06, TEAK), 0.87, 1.515, 0)); // right

  // Cork surface
  g.add(at(B(1.65,1.10,0.044, CORK), 0, 1.515, 0.02));

  // ── Pinned notices (realistic sizes) ─────────────────────
  const notes = [
    [0xfffff8, -0.48, 1.84, 0.42, 0.28],  // big A4 sheet
    [0xe8f4e8,  0.25, 1.80, 0.36, 0.26],
    [0xfde8d8, -0.10, 1.52, 0.40, 0.30],
    [0xfffff8,  0.52, 1.55, 0.30, 0.40],
    [0xfff0cc, -0.55, 1.26, 0.32, 0.28],
    [0xe8f0ff,  0.20, 1.25, 0.44, 0.24],
  ];
  for (const [c, px, py, pw, ph] of notes) {
    g.add(at(B(pw,ph,0.012, c), px, py, 0.044));
    // Red pushpin
    const pin = S(0.020,6, 0xee2222); pin.position.set(px, py+ph/2-0.03, 0.058); g.add(pin);
    const pinS = C(0.006,0.006,0.025,4, 0xcc1111); pinS.position.set(px, py+ph/2-0.044, 0.048); g.add(pinS);
  }

  // Header sign (maroon with gold text implied)
  g.add(at(B(1.65,0.20,0.06, MAROON), 0, 2.07, 0.01));
  // Gold band under header
  g.add(at(B(1.65,0.025,0.07, 0xaa8822), 0, 1.97, 0.01));

  // Frame shadow rail top/bottom
  g.add(at(B(1.82,0.055,0.08, 0x3a2010), 0, 2.14, -0.01));

  return place(g, x, z, rotY);
}

// ═══════════════════════════════════════════════════════════
//  7.  FOUNTAIN  — stone tiered campus fountain
// ═══════════════════════════════════════════════════════════
export function mkFountain(x, z) {
  const g     = new THREE.Group();
  const STONE = 0x9e9a8e,
        DARK  = 0x7a766e,
        WATER = 0x3a8abf,
        BRONZE= 0x8c6830,
        FOAM  = 0xd0eeff;

  // ── Outer pool ────────────────────────────────────────────
  // Pool floor
  g.add(at(C(1.30,1.30, 0.10, 20, STONE), 0, 0.055, 0));
  // Pool wall ring
  g.add(at(T(1.30, 0.13, 12, 24, STONE), 0, 0.20, 0, Math.PI/2));
  // Pool inner floor (wet stone)
  g.add(at(C(1.16,1.16, 0.08, 20, DARK), 0, 0.095, 0));
  // Water surface
  g.add(at(C(1.13,1.13, 0.04, 20, WATER, {transp:true,opacity:0.75}), 0, 0.22, 0));
  // Pool rim cap
  g.add(at(T(1.30, 0.05, 12, 24, STONE), 0, 0.335, 0, Math.PI/2));

  // ── Central pedestal ─────────────────────────────────────
  g.add(at(C(0.22,0.28, 0.70, 12, STONE), 0, 0.45, 0));
  g.add(at(C(0.28,0.22, 0.06, 12, DARK), 0, 0.82, 0)); // capital

  // ── Upper bowl ────────────────────────────────────────────
  g.add(at(C(0.58,0.22, 0.10, 14, STONE), 0, 0.88, 0)); // dish
  g.add(at(T(0.58,0.04, 10,16, STONE), 0, 0.94, 0, Math.PI/2)); // rim
  g.add(at(C(0.52,0.52, 0.04, 14, WATER,{transp:true,opacity:0.7}), 0, 0.96, 0)); // water
  // Upper bowl pedestal
  g.add(at(C(0.10,0.12, 0.30, 8, BRONZE), 0, 1.12, 0));
  // Tiny top basin
  g.add(at(C(0.22,0.14, 0.06, 10, STONE), 0, 1.30, 0));
  g.add(at(C(0.20,0.20, 0.02, 10, WATER,{transp:true,opacity:0.7}), 0, 1.34, 0));

  // Central spout nozzle
  g.add(at(C(0.020,0.020, 0.25, 6, BRONZE), 0, 1.48, 0));
  // Water jet (elongated foam sphere)
  const jet = S(0.055,8, FOAM,{transp:true,opacity:0.85});
  jet.scale.y=2.8; jet.position.set(0,1.75,0); g.add(jet);

  // ── 4 gargoyle spouts around pool ─────────────────────────
  for (let i=0; i<4; i++) {
    const a  = (i/4)*Math.PI*2;
    const fx = Math.cos(a)*0.72, fz = Math.sin(a)*0.72;
    // Spout body
    const sp = C(0.028,0.028, 0.22, 6, BRONZE);
    sp.position.set(fx, 0.58, fz);
    sp.rotation.x = 0.40; sp.rotation.y = a;
    g.add(sp);
    // Water droplet
    const drop = S(0.038,6, FOAM,{transp:true,opacity:0.8});
    drop.position.set(fx*1.08, 0.38, fz*1.08); g.add(drop);
  }

  // ── Coins on pool floor (decorative) ──────────────────────
  for (let i=0; i<8; i++) {
    const a=i*0.78, r=0.55+Math.random()*0.40;
    const coin = C(0.025,0.025, 0.005, 6, 0xd4a020);
    coin.position.set(Math.cos(a)*r, 0.105, Math.sin(a)*r);
    coin.rotation.x=Math.PI/2; g.add(coin);
  }

  return place(g, x, z);
}

// ═══════════════════════════════════════════════════════════
//  8.  BICYCLE RACK + BICYCLE
// ═══════════════════════════════════════════════════════════
export function mkBikeRack(x, z, rotY=0) {
  const g    = new THREE.Group();
  const STAINLESS = 0xaaaaaa,
        GALV      = 0x909098;

  // Horizontal top rail
  g.add(at(C(0.028,0.028, 2.10, 8, STAINLESS), 0, 0.92, 0, 0,0,Math.PI/2));
  // 4 inverted-U upright pairs
  for (const xi of [-0.75,-0.25,0.25,0.75]) {
    // Front leg
    g.add(at(C(0.022,0.022, 0.72, 8, GALV), xi, 0.56, 0.14));
    // Back leg
    g.add(at(C(0.022,0.022, 0.72, 8, GALV), xi, 0.56,-0.14));
    // Arch connecting them
    const arc = T(0.14,0.022, 8,8, GALV);
    arc.position.set(xi, 0.90, 0); arc.rotation.x=Math.PI/2; arc.rotation.z=Math.PI/2;
    g.add(arc);
  }
  // Ground anchor plates
  for (const xi of [-0.88,0.88]) {
    g.add(at(B(0.10,0.04,0.32, 0x555555), xi, 0.02, 0));
  }

  return place(g, x, z, rotY);
}

export function mkBike(x, z, color=0xcc2200, rotY=0) {
  const g    = new THREE.Group();
  const FRAME = color,
        DARK  = 0x111111,
        CHRM  = 0xd0d0d0,
        RBER  = 0x111111,
        CHAIN = 0x444444;

  // ── Wheels (torus tyre + spoke rim) ──────────────────────
  for (const wx of [-0.56, 0.56]) {
    // Tyre (torus)
    const tyre = T(0.300, 0.055, 8, 18, RBER);
    tyre.rotation.x=Math.PI/2; tyre.position.set(wx,0.32,0); g.add(tyre);
    // Rim disc
    g.add(at(C(0.24,0.24, 0.032, 12, 0xd0d0d0), wx, 0.32, 0, 0,0,Math.PI/2));
    // Hub
    g.add(at(C(0.038,0.038, 0.04, 6, DARK), wx, 0.32, 0, 0,0,Math.PI/2));
    // 8 spokes
    for (let s=0; s<8; s++) {
      const a = s*Math.PI/4;
      const sp = B(0.008,0.008, 0.46, CHRM);
      sp.position.set(wx, 0.32+Math.sin(a)*0.115, Math.cos(a)*0.115);
      sp.rotation.x = a; g.add(sp);
    }
  }

  // ── Frame (accurate diamond frame geometry) ───────────────
  // Top tube: seat to head
  const tt = B(0.72,0.038,0.038, FRAME);
  tt.position.set(-0.04,0.615,0); tt.rotation.z=0.28; g.add(tt);
  // Down tube: head to BB
  const dt = B(0.58,0.038,0.038, FRAME);
  dt.position.set(0.22,0.468,0); dt.rotation.z=-0.52; g.add(dt);
  // Seat tube (vertical)
  g.add(at(B(0.032,0.42,0.032, FRAME), -0.28,0.45,0));
  // Chain stay (L/R, from BB to rear drop-out)
  for (const fz of [-0.056,0.056]) {
    const cs = B(0.52,0.025,0.025, FRAME);
    cs.position.set(-0.14,0.32,fz); cs.rotation.z=0.06; g.add(cs);
  }
  // Seat stay
  for (const fz of [-0.048,0.048]) {
    const ss = B(0.52,0.025,0.025, FRAME);
    ss.position.set(-0.21,0.52,fz); ss.rotation.z=-0.55; g.add(ss);
  }
  // Bottom bracket shell
  g.add(at(C(0.040,0.040, 0.08, 8, DARK), 0.00,0.32,0, 0,0,Math.PI/2));

  // ── Fork ──────────────────────────────────────────────────
  g.add(at(B(0.025,0.40,0.025, CHRM), 0.52,0.50,0, 0,0,0.18));
  // Fork crown
  g.add(at(B(0.065,0.045,0.09, CHRM), 0.50,0.72,0));

  // ── Headset + stem ────────────────────────────────────────
  g.add(at(C(0.030,0.030, 0.24, 6, CHRM), 0.50,0.76,0));   // stem
  g.add(at(B(0.030,0.030, 0.50, CHRM), 0.50,0.88,0));       // handlebar
  // Handlebar grips
  for (const gz of [-0.24,0.24]) {
    g.add(at(C(0.032,0.032, 0.065, 8, DARK), 0.50,0.88,gz, Math.PI/2));
  }
  // Brake levers
  for (const gz of [-0.18,0.18]) {
    g.add(at(B(0.06,0.10,0.02, DARK), 0.52,0.83,gz, -0.4));
  }

  // ── Saddle ────────────────────────────────────────────────
  g.add(at(C(0.022,0.022, 0.26, 6, CHRM), -0.28,0.72,0));  // post
  g.add(at(B(0.30,0.032,0.115, DARK), -0.28,0.87,0));       // saddle body
  // Saddle rails
  for (const gz of [-0.04,0.04]) {
    g.add(at(B(0.30,0.010,0.010, CHRM), -0.28,0.855,gz));
  }

  // ── Chainring + cranks ────────────────────────────────────
  const cring = T(0.108,0.018, 6,14, CHAIN);
  cring.rotation.x=Math.PI/2; cring.position.set(0.04,0.32,0.06); g.add(cring);
  // Cranks
  g.add(at(B(0.20,0.022,0.022, DARK), 0.04,0.32, 0.06, 0.55));
  g.add(at(B(0.20,0.022,0.022, DARK), 0.04,0.32, 0.06,-0.55));
  // Pedals
  g.add(at(B(0.12,0.022,0.058, DARK), 0.05,0.28, 0.158));
  g.add(at(B(0.12,0.022,0.058, DARK), 0.05,0.36,-0.158));

  // ── Mudguards (fenders) ───────────────────────────────────
  for (const [wx,col] of [[-0.56,DARK],[0.56,DARK]]) {
    const fg = C(0.32,0.32, 0.018, 14, 0x333333);
    fg.scale.x=0.12; fg.rotation.z=Math.PI/2;
    fg.position.set(wx, 0.32, 0); g.add(fg);
  }

  // ── Rear rack ────────────────────────────────────────────
  g.add(at(B(0.38,0.020,0.22, 0x888888), -0.34,0.88,0));
  for (const fz of [-0.10,0.10]) {
    g.add(at(C(0.010,0.010,0.22,4,0x888888), -0.42,0.77,fz));
  }

  return place(g, x, z, rotY);
}

// ═══════════════════════════════════════════════════════════
//  9.  FLAG POLE  — with Indian tricolor
// ═══════════════════════════════════════════════════════════
export function mkFlagPole(x, z, rotY=0) {
  const g    = new THREE.Group();
  const POLE = 0xd8d8d8,
        BASE = 0x44444e;

  // Stepped concrete plinth
  g.add(at(B(0.90,0.30,0.90, 0xb8b8b0), 0, 0.15, 0));
  g.add(at(B(0.65,0.18,0.65, 0xc0c0b8), 0, 0.39, 0));
  g.add(at(B(0.42,0.14,0.42, 0xc8c8c0), 0, 0.55, 0));

  // Pole (tapered steel)
  g.add(at(C(0.036,0.055, 9.50, 10, POLE), 0, 5.37, 0));
  // Pole base cap
  g.add(at(C(0.080,0.080, 0.12, 10, BASE), 0, 0.68, 0));
  // Top finial ball
  g.add(at(S(0.085,8, 0xd4a020), 0, 10.37, 0));

  // Halyard pulleys + rope (thin lines)
  g.add(at(C(0.032,0.032, 0.055, 8, 0x888888), 0, 10.20, 0, Math.PI/2));
  g.add(at(C(0.006,0.006, 9.2, 4, 0xccccaa), 0.018, 5.70, 0));  // rope

  // ── Indian Tricolor (three horizontal bands) ──────────────
  const flagW=2.20, bandH=0.38;
  const cols=[0xFF9933, 0xfafafa, 0x138808];
  for (let i=0; i<3; i++) {
    const band = B(flagW, bandH, 0.025, cols[i]);
    band.position.set(flagW/2+0.04, 9.60-i*bandH, 0); g.add(band);
  }
  // Ashoka chakra (24-spoke wheel approximation)
  const chk = T(0.28,0.022, 8,24, 0x000088);
  chk.position.set(flagW/2+0.04, 9.41, 0.018); g.add(chk);
  // Chakra hub
  g.add(at(C(0.042,0.042, 0.03, 8, 0x000088), flagW/2+0.04, 9.41, 0.02, 0,0,Math.PI/2));
  // Chakra spokes (8 major)
  for (let s=0;s<8;s++) {
    const a=s*Math.PI/4;
    const sp=B(0.010,0.010,0.50,0x000088);
    sp.position.set(flagW/2+0.04, 9.41+Math.sin(a)*0.12, 0.02+Math.cos(a)*0.12);
    sp.rotation.x=a; g.add(sp);
  }

  return place(g, x, z, rotY);
}

// ═══════════════════════════════════════════════════════════
// 10.  PICNIC TABLE  — galvanised steel frame + timber top
// ═══════════════════════════════════════════════════════════
export function mkPicnicTable(x, z, rotY=0) {
  const g    = new THREE.Group();
  const WOOD = 0x9b6435,
        GALV = 0x7a7a7a,
        BOLT = 0x888888;

  // ── Tabletop: 4 planks ────────────────────────────────────
  for (let i=0; i<4; i++) {
    g.add(at(B(2.10, 0.050, 0.185, WOOD), 0, 0.78, -0.28+i*0.192));
    // Plank edge chamfer (slightly darker strip on edge)
    g.add(at(B(2.10,0.010,0.185,0x7a4a20), 0, 0.756,-0.28+i*0.192));
  }

  // ── Bench seats: 3 planks each side ──────────────────────
  for (const bz of [-0.95, 0.95]) {
    for (let i=0; i<3; i++) {
      g.add(at(B(1.85,0.045,0.145, WOOD), 0, 0.44, bz+(i-1)*0.152));
    }
  }

  // ── A-frame legs (4 sets, X-crossed) ──────────────────────
  for (const xi of [-0.82, 0.82]) {
    // Table legs cross under top
    const tl1 = B(0.055,0.90,0.055, GALV); tl1.position.set(xi, 0.42, 0); tl1.rotation.z= 0.38; g.add(tl1);
    const tl2 = B(0.055,0.90,0.055, GALV); tl2.position.set(xi, 0.42, 0); tl2.rotation.z=-0.38; g.add(tl2);
    // Footrail between legs
    g.add(at(B(0.055,0.055,1.95, GALV), xi, 0.06, 0));
    // Bench support diagonals
    for (const bz of [-0.95,0.95]) {
      const bl = B(0.045,0.68,0.045, GALV);
      bl.position.set(xi,0.28,bz);
      bl.rotation.z = bz>0 ? 0.28 : -0.28;
      g.add(bl);
    }
    // Bolt heads at crossing point
    g.add(at(C(0.020,0.020,0.08,6, BOLT), xi, 0.42, 0, 0,0,Math.PI/2));
  }

  // ── Centre braces ─────────────────────────────────────────
  g.add(at(B(0.045,0.045,1.95, GALV), 0, 0.55, 0));  // under-top brace
  g.add(at(B(0.045,0.045,1.95, GALV), 0, 0.10, 0));  // foot brace

  return place(g, x, z, rotY);
}

// ═══════════════════════════════════════════════════════════
// 11.  VENDING MACHINE  — realistic Indian canteen machine
// ═══════════════════════════════════════════════════════════
export function mkVendingMachine(x, z, rotY=0) {
  const g    = new THREE.Group();
  const BODY = 0x1a2e5a,
        DARK = 0x0e1e3e,
        GLAS = 0x88ccdd,
        TRIM = 0xcccccc,
        RED  = 0xdd3333,
        PRODS= [0xff4422,0x22aaff,0xffcc00,0x22cc66,0xff88cc,0xdd44ff,0xffaa00,0x44ddff];

  // ── Cabinet body ──────────────────────────────────────────
  g.add(at(B(0.92, 1.90, 0.62, BODY), 0, 0.95, 0));
  // Bevelled corners (4 edge strips)
  for (const [ex,ez] of [[-0.46,0],[ 0.46,0],[0,-0.31],[0, 0.31]]) {
    g.add(at(B(0.025,1.90,0.025,0x112244), ex*0.995, 0.95, ez*0.995));
  }

  // ── Front glass display ───────────────────────────────────
  g.add(at(B(0.58,0.95,0.06, GLAS,{transp:true,opacity:0.55}), 0, 1.36, 0.31));
  // Bezel around glass
  g.add(at(B(0.62,1.00,0.04, 0x112244), 0, 1.36, 0.30));

  // ── Products behind glass (3 rows × 3 cols) ───────────────
  for (let row=0; row<3; row++) {
    for (let col=0; col<3; col++) {
      const prod = B(0.14,0.16,0.04, PRODS[(row*3+col)%PRODS.length]);
      prod.position.set(-0.18+col*0.18, 1.60-row*0.22, 0.29);
      g.add(prod);
      // Label
      g.add(at(B(0.12,0.03,0.02, 0xffffff), -0.18+col*0.18, 1.51-row*0.22, 0.30));
    }
  }

  // ── Control panel (lower right) ───────────────────────────
  g.add(at(B(0.58,0.32,0.06, DARK), 0, 0.76, 0.31));
  // Selection buttons (2 rows × 3)
  for (let r=0; r<2; r++) for (let c=0; c<3; c++) {
    g.add(at(B(0.055,0.055,0.03, r===0?0x22cc66:RED), -0.16+c*0.16, 0.88-r*0.10, 0.33));
  }
  // Digital display
  g.add(at(B(0.22,0.065,0.03, 0x003300,{emissive:0x00ff44,ei:0.5}), -0.12, 0.70, 0.33));
  // Coin slot
  g.add(at(B(0.065,0.015,0.03, TRIM), 0.18, 0.73, 0.33));
  // Note acceptor
  g.add(at(B(0.12,0.018,0.03, 0x888888), 0.18, 0.63, 0.33));

  // ── Dispense tray ─────────────────────────────────────────
  g.add(at(B(0.50,0.12,0.14, DARK), 0, 0.085, 0.31));
  g.add(at(B(0.46,0.08,0.12, 0x222222), 0, 0.090, 0.33));

  // ── Ventilation grill (top) ───────────────────────────────
  for (let i=0; i<5; i++) {
    g.add(at(B(0.58,0.018,0.62,0x0e1a36), 0, 1.80-i*0.04, 0));
  }

  // ── Branding strip ────────────────────────────────────────
  g.add(at(B(0.62,0.18,0.63, 0x1a3a8a), 0, 1.815, 0));
  g.add(at(B(0.50,0.10,0.02, 0xffffff), 0, 1.815, 0.315)); // logo area
  // Trim rails
  g.add(at(B(0.94,0.038,0.64, TRIM), 0, 1.90, 0));
  g.add(at(B(0.94,0.038,0.64, TRIM), 0, 0.008, 0));

  return place(g, x, z, rotY);
}

// ═══════════════════════════════════════════════════════════
// 12.  BUS SHELTER  — modern glass + steel shelter
// ═══════════════════════════════════════════════════════════
export function mkBusShelter(x, z, rotY=0) {
  const g    = new THREE.Group();
  const STL  = 0x7a8898,
        GLS  = 0xaaddee,
        ROOF = 0x3a4a55,
        TRM  = 0x9aaabb;

  // ── Frame posts (rectangular steel) ──────────────────────
  for (const px of [-1.55,-0.55,0.55,1.55]) {
    g.add(at(B(0.06,2.65,0.06, STL), px, 1.325, -0.68));
  }
  // Side posts
  g.add(at(B(0.06,2.65,0.06, STL), -1.55, 1.325,  0.05));
  g.add(at(B(0.06,2.65,0.06, STL),  1.55, 1.325,  0.05));

  // ── Roof panel ────────────────────────────────────────────
  g.add(at(B(3.38,0.08,1.55, ROOF), 0, 2.70, -0.32));
  // Roof edge strip + rain gutter
  g.add(at(B(3.44,0.055,0.06, TRM), 0, 2.66, 0.44));
  g.add(at(B(3.44,0.055,0.06, TRM), 0, 2.66,-1.10));
  // Down the depth
  g.add(at(B(0.06,0.055,1.56, TRM),-1.70, 2.66,-0.32));
  g.add(at(B(0.06,0.055,1.56, TRM), 1.70, 2.66,-0.32));

  // ── Back glass wall ───────────────────────────────────────
  g.add(at(B(3.20,2.20,0.055, GLS,{transp:true,opacity:0.45}), 0, 1.22,-0.68));
  // Frame for back glass
  g.add(at(B(3.22,0.05,0.08, STL), 0, 2.32,-0.68));
  g.add(at(B(3.22,0.05,0.08, STL), 0, 0.12,-0.68));

  // ── Side glass panels ─────────────────────────────────────
  for (const sx of [-1.55, 1.55]) {
    g.add(at(B(0.055,2.10,1.50, GLS,{transp:true,opacity:0.40}), sx, 1.22,-0.10));
  }

  // ── Bench inside ──────────────────────────────────────────
  // Seat
  g.add(at(B(2.70,0.055,0.34, 0x8b5e3c), 0, 0.52,-0.44));
  // Backrest
  g.add(at(B(2.70,0.34,0.055, 0x8b5e3c), 0, 0.71,-0.65));
  // Legs
  for (const bx of [-1.20,1.20]) {
    g.add(at(B(0.06,0.52,0.06, STL), bx, 0.26,-0.44));
  }
  // Armrest divider (anti-homeless bar)
  g.add(at(B(0.038,0.06,0.34, STL), 0, 0.56,-0.44));

  // ── Advertisement panel ───────────────────────────────────
  g.add(at(B(0.96,1.20,0.048, 0xffeedd), 0.70, 1.40,-0.67));
  g.add(at(B(0.92,1.16,0.02, 0xffddaa), 0.70, 1.40,-0.66));  // lighter paper
  // Frame for ad
  g.add(at(B(1.00,1.25,0.06, STL), 0.70, 1.40,-0.68));

  // ── Route information box ──────────────────────────────────
  g.add(at(B(0.64,0.26,0.06, 0x1a3a8a),-1.10, 2.28,-0.68));
  g.add(at(B(0.58,0.18,0.02, 0xffffff),-1.10, 2.28,-0.66));

  // ── Kerb edge ─────────────────────────────────────────────
  g.add(at(B(3.70,0.10,0.24, 0xbbbbbb), 0, 0.05, 0.65));

  return place(g, x, z, rotY);
}

// ═══════════════════════════════════════════════════════════
// 13.  STATUE  — realistic seated scholar monument
// ═══════════════════════════════════════════════════════════
export function mkStatue(x, z, rotY=0) {
  const g     = new THREE.Group();
  const STONE = 0x9a9a8e,
        DARK  = 0x6a6a60,
        BRZ   = 0x7a5c2a,
        BKDARK= 0x4a3818;

  // ── Plinth (3-stepped stone base) ────────────────────────
  g.add(at(B(1.70,0.30,1.70, 0xb0aaa0), 0, 0.15, 0));
  g.add(at(B(1.42,0.30,1.42, STONE),    0, 0.45, 0));
  g.add(at(B(1.10,0.28,1.10, DARK),     0, 0.73, 0));
  g.add(at(B(0.90,1.30,0.90, DARK),     0, 1.52, 0));

  // Plaque (bronze on front)
  g.add(at(B(0.60,0.22,0.045, 0xaa8833), 0, 0.80, 0.56));
  g.add(at(B(0.56,0.18,0.02,  0xcc9944), 0, 0.80, 0.576));

  // ── Figure: seated on a chair ─────────────────────────────
  const FY = 2.18; // figure base
  // Chair/seat
  g.add(at(B(0.48,0.06,0.50, BKDARK), 0, FY,      0));
  g.add(at(B(0.48,0.72,0.06, BKDARK), 0, FY+0.40,-0.24)); // backrest
  // Body / robe
  g.add(at(C(0.14,0.18,0.72,10, BRZ),  0, FY+0.44, 0.04));
  // Torso
  g.add(at(B(0.36,0.44,0.24, BRZ),     0, FY+0.88, 0));
  // Shoulders
  g.add(at(B(0.54,0.10,0.22, BRZ),     0, FY+1.09, 0));
  // Head
  const head = S(0.155, 12, BRZ);
  head.scale.y = 1.15; head.position.set(0, FY+1.32, 0.02); g.add(head);
  // Hair / cap detail on head
  g.add(at(C(0.16,0.13,0.12,10, BKDARK), 0, FY+1.46, -0.01));

  // Left arm: resting on chair arm
  const armL = B(0.09,0.09,0.40, BRZ);
  armL.position.set(-0.24, FY+0.78, 0.08); armL.rotation.z=0.35; g.add(armL);
  // Right arm: raised, holding book
  const armR = B(0.09,0.09,0.40, BRZ);
  armR.position.set( 0.26, FY+0.95, 0.04); armR.rotation.z=-0.70; g.add(armR);

  // Book in raised hand
  g.add(at(B(0.22,0.28,0.04, 0xddddcc), 0.50, FY+1.12, 0.02));
  g.add(at(B(0.20,0.26,0.01, 0xeeeecc), 0.50, FY+1.12, 0.036));

  // Dhoti fold details
  for (let i=0; i<4; i++) {
    g.add(at(B(0.38,0.02,0.40, 0x6a4a18), 0, FY+0.18+i*0.12, 0));
  }

  return place(g, x, z, rotY);
}

// ═══════════════════════════════════════════════════════════
// 14.  FIRE HYDRANT  — accurately proportioned
// ═══════════════════════════════════════════════════════════
export function mkFireHydrant(x, z) {
  const g   = new THREE.Group();
  const RED = 0xcc1515, CHRM= 0xcccccc, DARK=0x222222;

  g.add(at(C(0.115,0.140, 0.08, 12, RED),  0, 0.04, 0));   // base flange
  g.add(at(C(0.105,0.115, 0.35, 12, RED),  0, 0.255, 0));  // lower barrel
  g.add(at(C(0.118,0.108, 0.06, 12, RED),  0, 0.46, 0));   // barrel bulge
  g.add(at(C(0.098,0.110, 0.18, 10, RED),  0, 0.57, 0));   // upper barrel
  g.add(at(C(0.118,0.100, 0.05, 12, RED),  0, 0.69, 0));   // shoulder
  g.add(at(C(0.088,0.096, 0.08, 8, RED),   0, 0.76, 0));   // neck
  g.add(at(C(0.110,0.110, 0.05, 6, CHRM),  0, 0.815, 0));  // cap ring (hex)
  g.add(at(C(0.075,0.075, 0.08, 6, CHRM),  0, 0.86, 0));   // cap

  // Operating nut on top
  g.add(at(C(0.028,0.028, 0.038, 4, DARK), 0, 0.905, 0));

  // Side outlets (2 flanged ports)
  for (const side of [-1,1]) {
    g.add(at(C(0.048,0.048, 0.088, 8, CHRM), side*0.150, 0.38, 0, 0,0,Math.PI/2));
    g.add(at(C(0.060,0.060, 0.018, 8, RED),  side*0.198, 0.38, 0, 0,0,Math.PI/2));
    // Outlet cap (hex)
    g.add(at(C(0.046,0.046, 0.025, 6, CHRM), side*0.210, 0.38, 0, 0,0,Math.PI/2));
  }

  // Safety chain
  g.add(at(B(0.008,0.130,0.008, 0x888888), 0.075, 0.74, 0));

  // Reflective band
  g.add(at(T(0.110,0.016, 8,12, 0xffff00), 0, 0.32, 0, Math.PI/2));

  return place(g, x, z);
}

// ═══════════════════════════════════════════════════════════
// 15.  BOLLARD  — concrete-style campus bollard
// ═══════════════════════════════════════════════════════════
export function mkBollard(x, z, color=0xdd6600) {
  const g    = new THREE.Group();
  const CONC = 0x888880, TOP=0xaaaaaa;

  // Concrete anchor base (buried-looking)
  g.add(at(C(0.130,0.155, 0.08, 10, CONC), 0, 0.04, 0));

  // Post body (slightly tapered)
  g.add(at(C(0.078,0.098, 0.78, 12, color), 0, 0.47, 0));

  // High-vis reflective bands (3 rings)
  for (const y of [0.24, 0.44, 0.64]) {
    g.add(at(T(0.094,0.020, 6,12, 0xffff00), 0, y, 0, Math.PI/2));
  }

  // Domed cap
  const cap = S(0.085,8, color); cap.scale.y=0.6;
  cap.position.set(0, 0.895, 0); g.add(cap);
  // Chrome cap ring
  g.add(at(T(0.082,0.012, 6,10, 0xcccccc), 0, 0.862, 0, Math.PI/2));

  // Anchor bolt heads (4)
  for (let i=0; i<4; i++) {
    g.add(at(C(0.012,0.012,0.05,4, 0x777777),
      Math.cos(i*Math.PI/2)*0.12, 0.025, Math.sin(i*Math.PI/2)*0.12));
  }

  return place(g, x, z);
}

// ═══════════════════════════════════════════════════════════
// 16.  CAMPUS SIGNPOST  — proper wayfinding sign
// ═══════════════════════════════════════════════════════════
export function mkSignpost(x, z, labels=['Library →','Canteen ↑','Gate ←'], rotY=0) {
  const g    = new THREE.Group();
  const POST = 0x444455,
        NAVY = 0x1a3a6b,
        WHT  = 0xf5f5f5;

  // Square steel post
  g.add(at(B(0.065,2.65,0.065, POST), 0, 1.325, 0));
  // Ground flange
  g.add(at(B(0.200,0.06,0.200, 0x333344), 0, 0.03, 0));

  // ── Directional blades (arrow-ended panels) ───────────────
  const angles=[0.0, 0.18, -0.18];
  for (let i=0; i<Math.min(labels.length,3); i++) {
    const bY = 2.30 - i*0.30;
    const ang= angles[i];

    // Main blade
    const blade = B(0.92,0.20,0.044, NAVY);
    blade.position.set(0.44, bY, 0); blade.rotation.y=ang; g.add(blade);

    // Arrow point (triangle effect — wedge on right end)
    const tip = B(0.10,0.20,0.044, NAVY);
    tip.position.set(0.905, bY, 0); tip.rotation.set(0,ang,0.55); g.add(tip);

    // White face (text area)
    const face = B(0.84,0.155,0.015, WHT);
    face.position.set(0.40, bY, 0.03); face.rotation.y=ang; g.add(face);

    // Mounting bolts
    for (const bx of [0.04, 0.84]) {
      g.add(at(C(0.012,0.012,0.05,4, 0x888888), bx, bY, 0.025));
    }
  }

  return place(g, x, z, rotY);
}

// ═══════════════════════════════════════════════════════════
// 17.  NEWSPAPER / FLYER BOX  — realistic street box
// ═══════════════════════════════════════════════════════════
export function mkPaperStand(x, z, rotY=0) {
  const g    = new THREE.Group();
  const BLUE = 0x1e3d8f,
        DARK = 0x0e2060,
        GLAS = 0xaaccdd,
        CHRM = 0xcccccc,
        PAPER= 0xf5f0e0;

  // ── Cabinet ───────────────────────────────────────────────
  g.add(at(B(0.44,0.54,0.30, BLUE), 0, 0.44, 0));
  // Bevelled edge strips
  for (const [ex,ez,ew,ed] of [
    [-0.22,0,0.02,0.30],[0.22,0,0.02,0.30],
    [0,-0.15,0.44,0.02],[0, 0.15,0.44,0.02]]) {
    g.add(at(B(ew,0.54,ed, DARK), ex, 0.44, ez));
  }

  // ── Glass front door ──────────────────────────────────────
  g.add(at(B(0.36,0.42,0.04, GLAS,{transp:true,opacity:0.5}), 0, 0.46, 0.16));
  // Door frame
  g.add(at(B(0.40,0.46,0.04, DARK), 0, 0.46, 0.155));
  // Handle
  g.add(at(B(0.16,0.022,0.04, CHRM), 0.06, 0.38, 0.183));

  // ── Papers visible through glass ──────────────────────────
  for (let i=0; i<4; i++) {
    g.add(at(B(0.33,0.018,0.24, i%2===0?PAPER:0xeeeedd), 0, 0.25+i*0.055, 0.01));
  }
  // Top paper fold/masthead (coloured)
  g.add(at(B(0.33,0.04,0.10, 0xcc2222), 0, 0.44, 0.01));

  // ── Legs ──────────────────────────────────────────────────
  for (const lx of [-0.14, 0.14]) {
    g.add(at(C(0.024,0.024, 0.20, 6, CHRM), lx, 0.10, 0));
    // Rubber foot
    g.add(at(C(0.032,0.032, 0.028, 6, 0x222222), lx, 0.014, 0));
  }

  // ── Header label strip ────────────────────────────────────
  g.add(at(B(0.44,0.10,0.31, 0x0e2266), 0, 0.745, 0));
  g.add(at(B(0.38,0.06,0.02, 0xffffff,{emissive:0xffffff,ei:0.1}), 0, 0.745, 0.16));

  // ── Coin mechanism ────────────────────────────────────────
  g.add(at(B(0.058,0.014,0.028, CHRM), 0.18, 0.56, 0.18));

  return place(g, x, z, rotY);
}

// ═══════════════════════════════════════════════════════════
// 18.  BUS STOP POLE  — proper UPSRTC/MPRTC style pole
// ═══════════════════════════════════════════════════════════
export function mkBusStopPole(x, z, rotY=0) {
  const g    = new THREE.Group();
  const POLE = 0x2266cc,
        YLW  = 0xffcc00,
        DARK = 0x1144aa,
        WHT  = 0xfafafa;

  // Square steel post (more realistic than cylinder)
  g.add(at(B(0.058,3.40,0.058, POLE), 0, 1.70, 0));
  // Ground base plate
  g.add(at(B(0.22,0.065,0.22, 0x334477), 0, 0.033, 0));

  // ── BUS sign (yellow square with bus icon) ────────────────
  // Background plate
  g.add(at(B(0.52,0.52,0.06, YLW),     0, 2.95, 0));
  g.add(at(B(0.46,0.46,0.04, DARK),    0, 2.95, 0.04));

  // Bus silhouette (boxes)
  g.add(at(B(0.20,0.10,0.03, YLW),     0,   2.97, 0.07));  // body
  g.add(at(B(0.18,0.07,0.03, YLW),    -0.01, 3.03, 0.07));  // roof
  for (const wx of [-0.06,0.06]) {
    g.add(at(C(0.028,0.028,0.020,6, 0x111111), wx, 2.925, 0.09, 0,0,Math.PI/2));  // wheels
  }
  // Bus windows
  for (const wx of [-0.07,0.0,0.07]) {
    g.add(at(B(0.040,0.040,0.025, 0x88ccff), wx, 2.98, 0.075));
  }

  // ── Schedule box ──────────────────────────────────────────
  g.add(at(B(0.42,0.56,0.06, WHT),     0, 2.25, 0));
  g.add(at(B(0.38,0.52,0.030, 0xeeeeff),0, 2.25, 0.04));
  // Horizontal rules simulating timetable
  for (let r=0; r<6; r++) {
    g.add(at(B(0.34,0.012,0.02, 0xcccccc), 0, 2.02+r*0.076, 0.056));
  }
  // Route number pill
  g.add(at(B(0.14,0.06,0.025, DARK),  0.12, 2.52, 0.055));
  g.add(at(B(0.10,0.038,0.02, 0xffcc00), 0.12, 2.52, 0.066));

  // ── Frame around sign ─────────────────────────────────────
  for (const [hy,hw,hd] of [[3.22,0.54,0.07],[2.68,0.54,0.07],[2.98,0.06,0.56],[2.98,0.06,0.56]]) {
    // omit — kept clean
  }

  return place(g, x, z, rotY);
}

// ═══════════════════════════════════════════════════════════
// 19.  AUTO RICKSHAW  — iconic Indian 3-wheeler (NEW)
// ═══════════════════════════════════════════════════════════
export function mkAutoRickshaw(x, z, color=0xffd700, rotY=0) {
  const g    = new THREE.Group();
  const BODY = color,
        DARK = 0x111111,
        CHRM = 0xd4d4d4,
        GLAS = 0x88ccdd,
        SEAT = 0x333333,
        BLCK = 0x0a0a0a;

  // ── Passenger cab body ────────────────────────────────────
  // Rear cabin box
  g.add(at(B(2.20,1.05,1.48, BODY), -0.30, 0.98, 0));
  // Cab roof (wider, rounded feel with extra piece)
  g.add(at(B(2.50,0.10,1.58, BODY), -0.30, 1.52, 0));
  // Front hood (short – auto engine is tiny)
  g.add(at(B(0.75,0.65,1.30, BODY),  0.96, 0.78, 0));
  // Engine bay cover
  g.add(at(B(0.55,0.14,1.26, BODY),  1.12, 1.12, 0));

  // ── Stripes / livery ─────────────────────────────────────
  // Horizontal stripe along body
  g.add(at(B(2.22,0.06,1.50, 0x222222), -0.30, 0.68, 0));
  g.add(at(B(2.22,0.06,1.50, 0x222222), -0.30, 1.28, 0));

  // ── Windscreen + open sides ────────────────────────────────
  // Front windscreen (partial — autos are open)
  g.add(at(B(0.045,0.58,1.10, GLAS,{transp:true,opacity:0.5}), 1.12, 1.02, 0));
  // Side canvas flap openings (dark trim)
  for (const sz of [-0.74, 0.74]) {
    g.add(at(B(1.80,0.85,0.04, DARK), -0.30, 1.02, sz));  // side frame
  }

  // ── Passenger bench seat ─────────────────────────────────
  g.add(at(B(1.80,0.08,1.20, SEAT), -0.60, 0.60, 0));  // seat base
  g.add(at(B(1.80,0.42,0.08, SEAT), -1.38, 0.82, 0));  // backrest
  g.add(at(B(1.60,0.06,1.00, 0x555555), -0.60, 0.545, 0));  // cushion

  // ── Driver area ───────────────────────────────────────────
  g.add(at(B(0.42,0.08,0.62, SEAT),  0.72, 0.60, 0));   // driver seat
  g.add(at(B(0.08,0.28,0.60, SEAT),  0.53, 0.78, 0));   // seat back

  // Handlebars
  g.add(at(C(0.018,0.018,0.055,6, CHRM), 1.05, 1.04, 0));  // column
  g.add(at(B(0.040,0.040,0.72, CHRM),    1.05, 1.07, 0));  // bar

  // ── Wheels (3: 1 front, 2 rear) ──────────────────────────
  // Front wheel (centre)
  const fw = T(0.285,0.075, 8,16, BLCK);
  fw.rotation.x=Math.PI/2; fw.position.set(1.22,0.30,0); g.add(fw);
  g.add(at(C(0.185,0.185,0.14,10, 0xcccccc), 1.22,0.30,0, 0,0,Math.PI/2)); // rim

  // Rear wheels (2 sides)
  for (const sz of [-0.68, 0.68]) {
    const rw = T(0.275,0.075, 8,16, BLCK);
    rw.rotation.x=Math.PI/2; rw.position.set(-0.80,0.30,sz); g.add(rw);
    g.add(at(C(0.175,0.175,0.14,10, 0xcccccc), -0.80,0.30,sz, 0,0,Math.PI/2));
  }

  // ── Underframe ────────────────────────────────────────────
  g.add(at(B(2.80,0.10,1.18, DARK), 0, 0.14, 0));

  // ── Meter box (on left of driver) ─────────────────────────
  g.add(at(B(0.10,0.14,0.10, DARK), 0.92, 0.90, -0.32));

  // ── Front lights ─────────────────────────────────────────
  for (const sz of [-0.36,0.36]) {
    g.add(at(B(0.06,0.10,0.14, 0xffffcc,{emissive:0xffff88,ei:0.4}), 1.26, 0.78, sz));
  }

  // ── Tail lights ───────────────────────────────────────────
  for (const sz of [-0.45,0.45]) {
    g.add(at(B(0.05,0.10,0.12, 0xff3300,{emissive:0xcc0000,ei:0.3}), -1.42, 0.78, sz));
  }

  // ── Number plate ──────────────────────────────────────────
  g.add(at(B(0.04,0.08,0.34, 0xfafafa), 1.30, 0.44, 0));
  g.add(at(B(0.04,0.08,0.34, 0xfafafa),-1.44, 0.44, 0));

  // ── Exhaust ───────────────────────────────────────────────
  const exh = C(0.028,0.032, 0.30, 6, 0x555555);
  exh.position.set(-1.18,0.28,-0.58); exh.rotation.x=0.20; g.add(exh);

  return place(g, x, z, rotY);
}

// ═══════════════════════════════════════════════════════════
// 20.  WATER COOLER  — campus drinking water point (NEW)
// ═══════════════════════════════════════════════════════════
export function mkWaterCooler(x, z, rotY=0) {
  const g    = new THREE.Group();
  const BODY = 0x3a6a9e,
        LITE = 0x6090c0,
        CHRM = 0xcccccc,
        STAIN= 0xd0d0d0;

  // ── Cabinet ───────────────────────────────────────────────
  g.add(at(B(0.72,1.20,0.52, BODY), 0, 0.75, 0));
  // Side panel accent (lighter)
  for (const ex of [-0.36,0.36]) {
    g.add(at(B(0.012,1.20,0.52, LITE), ex, 0.75, 0));
  }
  // Top cap
  g.add(at(B(0.74,0.06,0.54, CHRM), 0, 1.38, 0));
  // Base
  g.add(at(B(0.74,0.08,0.54, 0x2a4a6e), 0, 0.04, 0));

  // ── Water bottle (inverted 20L jar) ──────────────────────
  g.add(at(C(0.155,0.155,0.38,14, 0x88ccff,{transp:true,opacity:0.70}), 0, 1.63, 0));
  g.add(at(C(0.068,0.155,0.10,14, 0x88ccff,{transp:true,opacity:0.70}), 0, 1.86, 0));  // neck
  // Bottle collar
  g.add(at(C(0.175,0.175,0.04,14, STAIN), 0, 1.44, 0));

  // ── Dispensing area ───────────────────────────────────────
  // Push tap (cold)
  g.add(at(B(0.08,0.06,0.10, 0x2255cc), -0.14, 0.88, 0.28));
  // Push tap (hot)
  g.add(at(B(0.08,0.06,0.10, 0xcc2222),  0.14, 0.88, 0.28));
  // Drip tray
  g.add(at(B(0.44,0.04,0.14, STAIN), 0, 0.78, 0.28));
  // Drain grille
  g.add(at(B(0.38,0.02,0.10, 0x888888), 0, 0.775, 0.285));

  // ── Cup dispensers (on side) ──────────────────────────────
  g.add(at(C(0.065,0.065,0.24,10, 0xdddddd), -0.40, 0.88, 0));

  // ── Brand panel ───────────────────────────────────────────
  g.add(at(B(0.50,0.14,0.02, 0xffffff), 0, 1.12, 0.265));
  g.add(at(B(0.46,0.10,0.01, 0x2266aa,{emissive:0x2266aa,ei:0.15}), 0, 1.12, 0.270));

  // ── Drain pipe at bottom ──────────────────────────────────
  g.add(at(C(0.020,0.020,0.28,6, 0x555555), 0.30, 0.14, 0.22));

  return place(g, x, z, rotY);
}

// ═══════════════════════════════════════════════════════════
// 21.  SPEED BUMP  — rubber speed-breaker (NEW)
// ═══════════════════════════════════════════════════════════
export function mkSpeedBump(x, z, width=6.0, rotY=0) {
  const g    = new THREE.Group();

  // Main rubber bump (low arch — semicircle approximated with scale)
  const bump = C(0.12,0.12, width, 12, 0x111111);
  bump.scale.y=0.42; bump.position.set(0,0.048,0); bump.rotation.z=Math.PI/2;
  g.add(bump);

  // Yellow reflective strips
  const stripeW = width*0.96;
  for (const fz of [-0.04,0.04]) {
    g.add(at(B(stripeW, 0.015, 0.025, 0xffcc00), 0, 0.10, fz));
  }
  // End caps (yellow)
  for (const ex of [-width/2+0.06, width/2-0.06]) {
    g.add(at(B(0.12,0.10,0.45, 0xffcc00), ex, 0.05, 0));
  }

  return place(g, x, z, rotY);
}

// ═══════════════════════════════════════════════════════════
// 22.  GENERATOR SET  — diesel genset on plinth (NEW)
// ═══════════════════════════════════════════════════════════
export function mkGenerator(x, z, rotY=0) {
  const g    = new THREE.Group();
  const GRN  = 0x2a5a2a,  // typical generator green
        DARK = 0x1a1a1a,
        STAIN= 0x888880,
        RED  = 0xaa2222,
        EXHAUST=0x555555;

  // Concrete plinth
  g.add(at(B(2.40,0.28,0.95, 0xb8b8b0), 0, 0.14, 0));

  // Main cabinet (green powder-coated steel)
  g.add(at(B(2.10,0.90,0.80, GRN), 0, 0.73, 0));
  // Louvered sides
  for (const [ex,ez,ew,ed] of [
    [-1.06,0, 0.04,0.80], [1.06,0, 0.04,0.80],
    [0,-0.40,2.10,0.04],  [0, 0.40,2.10,0.04]]) {
    g.add(at(B(ew,0.90,ed, 0x224422), ex, 0.73, ez));
  }
  // Louvre slats (front only)
  for (let i=0; i<7; i++) {
    g.add(at(B(0.90,0.04,0.04, 0x1a3a1a), -0.40, 0.40+i*0.086, 0.405));
  }

  // Control panel (right end)
  g.add(at(B(0.04,0.90,0.80, 0x1a3a1a), 1.08, 0.73, 0));
  // Panel meters (circles)
  for (const [py,pz] of [[0.90,-0.12],[0.90,0.12],[0.68,-0.12],[0.68,0.12]]) {
    g.add(at(C(0.055,0.055,0.020,10, DARK), 1.105, py, pz, 0,0,Math.PI/2));
    g.add(at(C(0.042,0.042,0.022,10, 0x334433,{emissive:0x00cc44,ei:0.3}), 1.11, py, pz, 0,0,Math.PI/2));
  }
  // Emergency stop (red button)
  g.add(at(C(0.042,0.042,0.030,8, RED,{emissive:0xcc0000,ei:0.4}), 1.11, 0.55, 0, 0,0,Math.PI/2));

  // Exhaust stack
  g.add(at(C(0.058,0.065,0.65, EXHAUST), 0.75, 1.26, -0.28));
  g.add(at(C(0.075,0.058,0.10, EXHAUST), 0.75, 1.60, -0.28));  // rain cap

  // Fuel filler cap
  g.add(at(C(0.050,0.050,0.06,8, STAIN), -0.70, 1.19, 0.38, 0,0,Math.PI/2));

  // Rubber anti-vibration feet
  for (const [fx,fz] of [[-0.90,-0.34],[-0.90,0.34],[0.90,-0.34],[0.90,0.34]]) {
    g.add(at(B(0.12,0.06,0.12, DARK), fx, 0.305, fz));
  }

  // Fuel level sight glass
  g.add(at(B(0.04,0.22,0.048, 0x88aacc,{transp:true,opacity:0.6}), -1.10, 0.72, 0.10));

  return place(g, x, z, rotY);
}