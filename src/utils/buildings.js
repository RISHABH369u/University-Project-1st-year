import * as THREE from 'three';
import { scene } from '../scene.js';

export const clickable = [];

// ═══════════════════════════════════════════════════════════════════
//  MATERIALS  — matched exactly to PTSNS photos
// ═══════════════════════════════════════════════════════════════════
const M = {
  wall:    new THREE.MeshLambertMaterial({ color: 0xf0eeea }),
  wallB:   new THREE.MeshLambertMaterial({ color: 0xe8e6e0 }),
  slab:    new THREE.MeshLambertMaterial({ color: 0xc4c2bc }),   // dark slab band
  iFloor:  new THREE.MeshLambertMaterial({ color: 0xdddad4 }),   // interior floor tile
  col:     new THREE.MeshLambertMaterial({ color: 0xf5f3ef }),   // pilasters / columns
  win:     new THREE.MeshLambertMaterial({ color: 0x7ab0d0, transparent:true, opacity:0.75,
                                           emissive:0x1a3548, emissiveIntensity:0.15 }),
  winDk:   new THREE.MeshLambertMaterial({ color: 0x3a6888, transparent:true, opacity:0.85,
                                           emissive:0x0a1828, emissiveIntensity:0.25 }),
  winBig:  new THREE.MeshLambertMaterial({ color: 0x5a9ec8, transparent:true, opacity:0.65,
                                           emissive:0x102838, emissiveIntensity:0.2  }),
  shade:   new THREE.MeshLambertMaterial({ color: 0xc5c3bc }),   // chajja sun-shade
  roof:    new THREE.MeshLambertMaterial({ color: 0xb5b3ac }),
  parapet: new THREE.MeshLambertMaterial({ color: 0xd5d3ce }),
  solar:   new THREE.MeshLambertMaterial({ color: 0x182028, emissive:0x061018, emissiveIntensity:0.5 }),
  sFrame:  new THREE.MeshLambertMaterial({ color: 0x787870 }),
  tank:    new THREE.MeshLambertMaterial({ color: 0x888880 }),
  steel:   new THREE.MeshLambertMaterial({ color: 0x909088 }),
  conc:    new THREE.MeshLambertMaterial({ color: 0xc2c0b8 }),   // concrete plinth
  tile:    new THREE.MeshLambertMaterial({ color: 0xd5d0c5 }),   // courtyard tile
  door:    new THREE.MeshLambertMaterial({ color: 0x18140e, side:THREE.DoubleSide }),
  blue:    new THREE.MeshLambertMaterial({ color: 0x1a3a8a }),   // sign boards
  gold:    new THREE.MeshLambertMaterial({ color: 0xb8880a }),
  gate:    new THREE.MeshLambertMaterial({ color: 0xf5f4f0 }),
  iron:    new THREE.MeshLambertMaterial({ color: 0x1a1a18 }),
  tarp:    new THREE.MeshLambertMaterial({ color: 0x2255aa, side:THREE.DoubleSide }),
  court:   new THREE.MeshLambertMaterial({ color: 0x2d8044 }),
  courtB:  new THREE.MeshLambertMaterial({ color: 0xaa2222 }),
  white:   new THREE.MeshLambertMaterial({ color: 0xfafafa }),
  canopy:  new THREE.MeshLambertMaterial({ color: 0x228033 }),
};

// ═══════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const FH = 3.8;    // floor height (m)
const WT = 0.38;   // wall thickness (m)

// ═══════════════════════════════════════════════════════════════════
//  PRIMITIVE HELPERS
// ═══════════════════════════════════════════════════════════════════
const bx  = (w,h,d,m)     => { const me=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); me.castShadow=me.receiveShadow=true; return me; };
const cy  = (rt,rb,h,s,m) => { const me=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,s),m); me.castShadow=me.receiveShadow=true; return me; };
const pl  = (w,h,m)       => new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);
const con = (r,h,s,m)     => new THREE.Mesh(new THREE.ConeGeometry(r,h,s),m);
const sph = (r,s,m)       => new THREE.Mesh(new THREE.SphereGeometry(r,s,s),m);
const tor = (r,t,rs,ts,m) => new THREE.Mesh(new THREE.TorusGeometry(r,t,rs,ts),m);
const oct = (r,m)         => new THREE.Mesh(new THREE.OctahedronGeometry(r),m);

function at(g, mesh, x, y, z, rx=0, ry=0, rz=0) {
  mesh.position.set(x,y,z);
  if(rx||ry||rz) mesh.rotation.set(rx,ry,rz);
  mesh.castShadow = mesh.receiveShadow = true;
  g.add(mesh); return mesh;
}
function push(...meshes) { meshes.forEach(m => { if(m.userData) clickable.push(m); }); }

// ═══════════════════════════════════════════════════════════════════
//  WINDOW + CHAJJA (sun shade)
//  normal: 'pz' | 'nz' | 'px' | 'nx'
// ═══════════════════════════════════════════════════════════════════
function addWin(g, cx, cy2, cz, wW, wH, normal, mat=M.win) {
  let ry=0, ox=0, oz=0;
  const e=0.05;
  if(normal==='pz') {ry=0;          oz= e; }
  if(normal==='nz') {ry=Math.PI;    oz=-e; }
  if(normal==='px') {ry= Math.PI/2; ox= e; }
  if(normal==='nx') {ry=-Math.PI/2; ox=-e; }

  // Glass pane
  const glass=pl(wW,wH,mat);
  glass.position.set(cx+ox, cy2, cz+oz);
  glass.rotation.y=ry; g.add(glass);

  // Concrete frame (slightly proud)
  const frame=bx(
    (normal==='px'||normal==='nx') ? 0.07 : wW+0.22,
    wH+0.22,
    (normal==='px'||normal==='nx') ? wW+0.22 : 0.07,
    M.col
  );
  frame.position.set(cx+ox*0.3, cy2, cz+oz*0.3);
  frame.castShadow=false; g.add(frame);

  // Chajja (sun-shade slab above window) — 0.44m projection
  const chD=0.44;
  const chW = (normal==='px'||normal==='nx') ? chD : wW+0.4;
  const chDep= (normal==='px'||normal==='nx') ? wW+0.4 : chD;
  const ch=bx(chW, 0.1, chDep, M.shade);
  ch.castShadow=true;
  const chY=cy2+wH/2+0.16;
  if(normal==='pz') ch.position.set(cx,    chY, cz+chD/2+e);
  if(normal==='nz') ch.position.set(cx,    chY, cz-chD/2-e);
  if(normal==='px') ch.position.set(cx+chD/2+e, chY, cz);
  if(normal==='nx') ch.position.set(cx-chD/2-e, chY, cz);
  g.add(ch);
}

// ═══════════════════════════════════════════════════════════════════
//  WINDOW ROW  — distributes windows across a wall span
//  axis  : 'x' = wall runs in X direction, 'z' = runs in Z
//  wallP : position of wall in perpendicular axis
//  center: span center
//  span  : wall length to cover
//  floorY: floor base Y
//  skip  : [{c, r}] skip zones (door areas)
// ═══════════════════════════════════════════════════════════════════
function winRow(g, axis, wallP, center, span, floorY, normal, skip=[], nW=0) {
  const wW=1.45, wH=1.72;
  const n = nW || Math.max(2, Math.floor(span/3.1));
  const sp=span/n;
  for(let i=0;i<n;i++) {
    const t = center - span/2 + sp*(i+0.5);
    if(skip.some(s=>Math.abs(t-s.c)<s.r)) continue;
    const wy = floorY + FH*0.52;
    if(axis==='x') addWin(g, t, wy, wallP, wW, wH, normal);
    else           addWin(g, wallP, wy, t, wW, wH, normal);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  VERTICAL PILASTERS on a wall face
// ═══════════════════════════════════════════════════════════════════
function pilasters(g, axis, wallP, center, span, h, spacing=4.0) {
  const n=Math.ceil(span/spacing)+1;
  const sp=span/(n-1||1);
  for(let i=0;i<n;i++) {
    const t=center-span/2+sp*i;
    const px=axis==='x'?t:wallP;
    const pz=axis==='x'?wallP:t;
    const p=bx(0.3, h+0.55, 0.3, M.col);
    p.position.set(px, h/2, pz); p.castShadow=true; g.add(p);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  FLOOR SLAB BAND — overhanging slab at floor level
// ═══════════════════════════════════════════════════════════════════
function slabAt(g, cx, cz, w, d, y) {
  const sl=bx(w+0.55, 0.48, d+0.55, M.slab);
  sl.position.set(cx, y, cz); sl.castShadow=true; g.add(sl);
}

// ═══════════════════════════════════════════════════════════════════
//  SOLAR PANEL GRID (matches satellite image density)
// ═══════════════════════════════════════════════════════════════════
function solarGrid(g, cx, cz, w, d, roofY, count=12) {
  const pw=1.55, pd=0.88;
  const cols=Math.min(count, Math.floor(w/1.85));
  const rows=Math.ceil(count/cols);
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
    if(r*cols+c>=count) break;
    const p=bx(pw,0.06,pd,M.solar);
    p.rotation.x=-0.18;
    p.position.set(cx-w/2+1.0+c*1.85, roofY+0.82, cz-d/4+r*1.1);
    g.add(p);
    const fr=bx(pw+0.06,0.03,pd+0.06,M.sFrame);
    fr.rotation.x=-0.18;
    fr.position.set(cx-w/2+1.0+c*1.85, roofY+0.80, cz-d/4+r*1.1);
    g.add(fr);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  WING ROOFTOP  — parapet + notches + solar panels + tank
// ═══════════════════════════════════════════════════════════════════
function wingRoof(g, cx, cz, w, d, topY, nSolar=8) {
  const pH=1.05, rY=topY+0.25, pY=rY+0.5+pH/2;

  at(g, bx(w+0.55, 0.45, d+0.55, M.roof),   cx, rY, cz);

  // 4 parapet walls
  at(g, bx(w+0.55, pH, 0.26, M.parapet), cx, pY,  cz+d/2+0.4);
  at(g, bx(w+0.55, pH, 0.26, M.parapet), cx, pY,  cz-d/2-0.4);
  at(g, bx(0.26, pH, d+0.55, M.parapet), cx-w/2-0.4, pY, cz);
  at(g, bx(0.26, pH, d+0.55, M.parapet), cx+w/2+0.4, pY, cz);

  // Parapet notch merlons (decorative — match real building)
  const nc=Math.max(2,Math.floor(w/3.5));
  for(let i=0;i<nc;i++) {
    const nx=cx-w/2+(w/nc)*(i+0.5);
    at(g, bx(1.0,pH+0.06,0.32,M.wallB), nx, pY,  cz+d/2+0.41);
    at(g, bx(1.0,pH+0.06,0.32,M.wallB), nx, pY,  cz-d/2-0.41);
  }

  // Solar panels matching satellite
  solarGrid(g, cx, cz, w, d, rY, nSolar);
}

// ═══════════════════════════════════════════════════════════════════
//  INTERIOR GALLERY COLUMNS (verandah along courtyard inner face)
// ═══════════════════════════════════════════════════════════════════
function galleryColumns(g, cx, cz, spanLen, spanCenter, colH, spacing=4.5) {
  const n=Math.floor(spanLen/spacing);
  const sp=spanLen/n;
  for(let i=0;i<n;i++) {
    const t=spanCenter-spanLen/2+sp*(i+0.5);
    const px=(cx===undefined) ? t : cx;
    const pz=(cz===undefined) ? t : cz;
    const col=cy(0.22,0.26,colH,10,M.col);
    col.position.set(px, colH/2, pz); g.add(col);
    const base=bx(0.56,0.3,0.56,M.col);
    base.position.set(px,0.15,pz); g.add(base);
    const cap=bx(0.56,0.22,0.56,M.col);
    cap.position.set(px,colH-0.11,pz); g.add(cap);
    // Beam connecting to next
    if(i<n-1) {
      const nt=spanCenter-spanLen/2+sp*(i+1.5);
      const bm=bx(
        (cx===undefined)?sp:0.28, 0.28,
        (cz===undefined)?sp:0.28, M.col
      );
      bm.position.set(
        (cx===undefined)?(t+nt)/2:px,
        colH-0.14,
        (cz===undefined)?(t+nt)/2:pz
      );
      g.add(bm);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  ██████  HOLLOW RECTANGLE BUILDING  ██████
//  This is the accurate PTSNS quadrangle style:
//  4 wings around an open courtyard — WALKABLE INTERIOR
//
//  ow = outer width (X),  od = outer depth (Z)
//  ww = wing width (how deep each wing is, ~10-12m)
//  floors = number of floors
//
//  Player enters through south entrance gap into the open courtyard
// ═══════════════════════════════════════════════════════════════════
export function addHollowBuilding(g, cx, cz, ow, od, ww, floors, meta={}) {
  const h = floors * FH;
  const iW = ow - ww*2;   // inner courtyard width
  const iD = od - ww*2;   // inner courtyard depth

  const SOUTH_Z = cz - od/2;
  const NORTH_Z = cz + od/2;
  const WEST_X  = cx - ow/2;
  const EAST_X  = cx + ow/2;

  // ─── SOUTH WING (front face — main entrance) ──────────────────────
  {
    const dW=5.5, dH=3.2;  // entrance opening

    // Left wall panel (east of door)
    const lW=(ow-dW)/2;
    at(g, bx(lW, h, ww, M.wall), cx-ow/2+lW/2, h/2, SOUTH_Z+ww/2);
    // Right wall panel
    at(g, bx(lW, h, ww, M.wall), cx+ow/2-lW/2, h/2, SOUTH_Z+ww/2);
    // Lintel above entrance
    at(g, bx(dW+0.4, h-dH, ww, M.wall), cx, dH+(h-dH)/2, SOUTH_Z+ww/2);

    // Glass entrance door (walkable — just a decorative pane)
    at(g, bx(dW, dH, 0.14, M.winBig), cx, dH/2, SOUTH_Z+0.08);

    // "अकादमिक भवन" blue sign board above door
    at(g, bx(dW*1.4, 0.92, 0.22, M.blue), cx, dH+0.62, SOUTH_Z-0.14);

    // Portico over entrance (covered porch)
    const pW=dW+3.5, pD=3.2, pH2=FH*0.88;
    at(g, bx(pW+0.4, 0.4, pD, M.slab), cx, pH2, SOUTH_Z-pD/2+0.1);
    // Portico columns
    for(let px of [cx-pW/2+0.4, cx+pW/2-0.4]) {
      at(g, cy(0.3,0.36,pH2,10,M.col), px, pH2/2, SOUTH_Z-pD+0.4);
      at(g, bx(0.72,0.35,0.72,M.col), px, 0.18, SOUTH_Z-pD+0.4);
    }

    // Entrance steps (4 steps, each 0.18m rise)
    for(let s=0;s<4;s++) {
      at(g, bx(dW+1.8-s*0.5, 0.18, 0.52, M.conc), cx, s*0.18, SOUTH_Z-0.3-s*0.52);
    }

    // Windows south exterior face (skip door zone)
    for(let f=0;f<floors;f++) {
      winRow(g,'x',SOUTH_Z,cx, ow, f*FH,'nz',[{c:cx,r:dW/2+0.8}]);
    }
    // Pilasters south
    pilasters(g,'x',SOUTH_Z-0.17,cx,ow,h,4);
  }

  // ─── NORTH WING ───────────────────────────────────────────────────
  at(g, bx(ow, h, ww, M.wall), cx, h/2, NORTH_Z-ww/2);
  for(let f=0;f<floors;f++) winRow(g,'x',NORTH_Z,cx,ow,f*FH,'pz');
  pilasters(g,'x',NORTH_Z+0.17,cx,ow,h,4);

  // ─── WEST WING ────────────────────────────────────────────────────
  at(g, bx(ww, h, iD, M.wall), WEST_X+ww/2, h/2, cz);
  for(let f=0;f<floors;f++) winRow(g,'z',WEST_X,cz,iD,f*FH,'nx',[],Math.max(2,Math.floor(iD/3.1)));
  pilasters(g,'z',WEST_X-0.17,cz,iD,h,4);

  // ─── EAST WING ────────────────────────────────────────────────────
  at(g, bx(ww, h, iD, M.wall), EAST_X-ww/2, h/2, cz);
  for(let f=0;f<floors;f++) winRow(g,'z',EAST_X,cz,iD,f*FH,'px',[],Math.max(2,Math.floor(iD/3.1)));
  pilasters(g,'z',EAST_X+0.17,cz,iD,h,4);

  // ─── INNER COURTYARD FACE windows (upper floors only — ground is gallery) ─
  for(let f=1;f<floors;f++) {
    winRow(g,'x',SOUTH_Z+ww,cx,ow,f*FH,'pz');
    winRow(g,'x',NORTH_Z-ww,cx,ow,f*FH,'nz');
    winRow(g,'z',WEST_X+ww,cz,iD,f*FH,'px',[],Math.max(2,Math.floor(iD/3.1)));
    winRow(g,'z',EAST_X-ww,cz,iD,f*FH,'nx',[],Math.max(2,Math.floor(iD/3.1)));
  }

  // ─── COURTYARD FLOOR ──────────────────────────────────────────────
  // Floor tiles
  at(g, bx(iW,0.15,iD,M.tile), cx, 0.08, cz);
  // Cross-path paving
  at(g, bx(iW*0.14,0.16,iD, M.conc), cx, 0.09, cz);
  at(g, bx(iW,0.16,iD*0.12, M.conc), cx, 0.09, cz);
  // Small central fountain plinth
  at(g, cy(1.5,1.5,0.4,12,M.conc), cx, 0.2, cz);
  at(g, cy(1.3,1.3,0.15,12,M.winBig), cx, 0.38, cz);
  at(g, cy(0.15,0.15,0.9,8,M.steel), cx, 0.85, cz);

  // ─── INTERIOR GALLERY COLUMNS (verandah along all 4 inner faces) ──
  // South inner face gallery
  galleryColumns(g, undefined, SOUTH_Z+ww-1.2, iW, cx, FH);
  // North inner face gallery
  galleryColumns(g, undefined, NORTH_Z-ww+1.2, iW, cx, FH);
  // West inner face gallery (Z-axis)
  galleryColumns(g, WEST_X+ww-1.2, undefined, iD, cz, FH);
  // East inner face gallery
  galleryColumns(g, EAST_X-ww+1.2, undefined, iD, cz, FH);

  // ─── FLOOR SLAB BANDS ─────────────────────────────────────────────
  for(let f=1;f<=floors;f++) {
    const y=f*FH;
    slabAt(g, cx, SOUTH_Z+ww/2, ow, ww, y);
    slabAt(g, cx, NORTH_Z-ww/2, ow, ww, y);
    slabAt(g, WEST_X+ww/2, cz, ww, iD, y);
    slabAt(g, EAST_X-ww/2, cz, ww, iD, y);
  }

  // ─── PLINTHS (raised base around all wings) ────────────────────────
  at(g, bx(ow+0.9,0.55,ww+0.9,M.conc), cx,0.28,SOUTH_Z+ww/2);
  at(g, bx(ow+0.9,0.55,ww+0.9,M.conc), cx,0.28,NORTH_Z-ww/2);
  at(g, bx(ww+0.9,0.55,iD+0.9,M.conc), WEST_X+ww/2,0.28,cz);
  at(g, bx(ww+0.9,0.55,iD+0.9,M.conc), EAST_X-ww/2,0.28,cz);

  // ─── ROOFTOPS on each wing ────────────────────────────────────────
  wingRoof(g, cx,        SOUTH_Z+ww/2, ow,  ww,  h, Math.floor(ow/1.9));
  wingRoof(g, cx,        NORTH_Z-ww/2, ow,  ww,  h, Math.floor(ow/2.2));
  wingRoof(g, WEST_X+ww/2, cz,         ww,  iD,  h, Math.floor(iD/2.0));
  wingRoof(g, EAST_X-ww/2, cz,         ww,  iD,  h, Math.floor(iD/2.0));

  // Water tank on north wing
  at(g, cy(1.1,1.1,2.2,10,M.tank), cx-ow/4, h+1.5, NORTH_Z-ww/2);
  at(g, cy(1.25,1.25,0.22,10,M.steel), cx-ow/4, h+2.72, NORTH_Z-ww/2);
  for(let i=0;i<4;i++) {
    at(g, cy(0.07,0.07,1.1,4,M.steel),
      cx-ow/4+Math.cos(i*Math.PI/2)*0.82, h+0.55, NORTH_Z-ww/2+Math.sin(i*Math.PI/2)*0.82);
  }

  // ─── CLICKABLE PHANTOM ────────────────────────────────────────────
  if(meta.name) {
    const ph = bx(ow, 0.1, od, new THREE.MeshBasicMaterial({visible:false}));
    ph.position.set(cx, h+1, cz);
    ph.userData = { name:meta.name, icon:meta.icon||'🏛️', desc:meta.desc||'' };
    g.add(ph); clickable.push(ph);
  }

}

// ═══════════════════════════════════════════════════════════════════
//  ██████  L-SHAPED ADMIN BUILDING  ██████
//  Accurate to satellite: two rectangular wings joined at one corner
//  Main block: ~38m wide × 12m deep (horizontal)
//  Side wing:  ~12m wide × 20m deep (extends north from west end)
//  3 floors
// ═══════════════════════════════════════════════════════════════════
export function addAdminBuilding(g, cx, cz) {
  const floors=3, h=floors*FH;

  // ── MAIN HORIZONTAL BLOCK ─────────────────────────────────────────
  {
    const W=38, D=12;
    // Body
    at(g, bx(W,h,D,M.wall), cx, h/2, cz);

    // South face (front) windows + pilasters + entrance
    const dW=3.8, dH=3.0;
    // Wall left of door
    at(g, bx((W-dW)/2-0.2, h, WT, M.wall), cx-(W+dW)/4, h/2, cz-D/2);
    // Wall right of door
    at(g, bx((W-dW)/2-0.2, h, WT, M.wall), cx+(W+dW)/4, h/2, cz-D/2);
    // Lintel
    at(g, bx(dW+0.4, h-dH, WT, M.wall), cx, dH+(h-dH)/2, cz-D/2);
    // Door leaf
    at(g, bx(dW-0.3, dH-0.1, 0.1, M.door), cx, dH/2, cz-D/2+0.05);
    // Sign board
    at(g, bx(dW*1.5, 0.82, 0.2, M.blue), cx, dH+0.55, cz-D/2-0.12);
    // Steps
    for(let s=0;s<3;s++) at(g, bx(dW+1.2-s*0.4, 0.17, 0.5, M.conc), cx, s*0.17, cz-D/2-0.25-s*0.5);

    // Windows south face (skip door)
    for(let f=0;f<floors;f++) winRow(g,'x',cz-D/2,cx,W,f*FH,'nz',[{c:cx,r:dW/2+0.8}]);
    // Windows north face
    for(let f=0;f<floors;f++) winRow(g,'x',cz+D/2,cx,W,f*FH,'pz');
    // Side windows
    for(let f=0;f<floors;f++) {
      winRow(g,'z',cx-W/2,cz,D,f*FH,'nx',[],Math.max(1,Math.floor(D/3.2)));
      winRow(g,'z',cx+W/2,cz,D,f*FH,'px',[],Math.max(1,Math.floor(D/3.2)));
    }

    // Pilasters
    pilasters(g,'x',cz-D/2-0.16,cx,W,h,4);
    pilasters(g,'x',cz+D/2+0.16,cx,W,h,4);

    // Slab bands
    for(let f=1;f<=floors;f++) slabAt(g, cx, cz, W, D, f*FH);

    // Plinth
    at(g, bx(W+0.9,0.55,D+0.9,M.conc), cx,0.28,cz);

    // Interior columns (ground floor corridor feel)
    const nc=Math.floor(W/5.5);
    for(let i=1;i<nc;i++) {
      const colX=cx-W/2+W/nc*i;
      at(g, cy(0.22,0.26,h,8,M.col), colX, h/2, cz-D/2+1.8);
      at(g, cy(0.22,0.26,h,8,M.col), colX, h/2, cz+D/2-1.8);
    }

    // Rooftop
    wingRoof(g, cx, cz, W, D, h, Math.floor(W/1.9));
    at(g, cy(1.0,1.0,2.0,10,M.tank), cx+W/3, h+1.3, cz);
    at(g, cy(1.12,1.12,0.2,10,M.steel), cx+W/3, h+2.42, cz);
  }

  // ── SIDE WING (north-south, connects at west end of main block) ───
  {
    const W=12, D=20;
    const wingX=cx-19; // aligns with left end of main block
    const wingZ=cz+D/2+6; // extends north

    at(g, bx(W,h,D,M.wall), wingX, h/2, wingZ);

    // Windows
    for(let f=0;f<floors;f++) {
      winRow(g,'x',wingZ-D/2,wingX,W,f*FH,'nz',[],Math.max(2,Math.floor(W/3.1)));
      winRow(g,'x',wingZ+D/2,wingX,W,f*FH,'pz',[],Math.max(2,Math.floor(W/3.1)));
      winRow(g,'z',wingX-W/2,wingZ,D,f*FH,'nx',[],Math.max(2,Math.floor(D/3.2)));
      winRow(g,'z',wingX+W/2,wingZ,D,f*FH,'px',[],Math.max(2,Math.floor(D/3.2)));
    }

    pilasters(g,'z',wingX-W/2-0.16,wingZ,D,h,4);
    pilasters(g,'z',wingX+W/2+0.16,wingZ,D,h,4);

    for(let f=1;f<=floors;f++) slabAt(g, wingX, wingZ, W, D, f*FH);

    at(g, bx(W+0.9,0.55,D+0.9,M.conc), wingX,0.28,wingZ);
    wingRoof(g, wingX, wingZ, W, D, h, Math.floor(D/2));
  }

  // Clickable
  const ph=bx(38,0.1,32,new THREE.MeshBasicMaterial({visible:false}));
  ph.position.set(cx,h+1,cz+6);
  ph.userData={name:'Administrative Building', icon:'🏛️',
    desc:'Registrar, Accounts, Examination Cell, Scholarship Wing, Student Affairs. 3 floors.'};
  g.add(ph); clickable.push(ph);

  
}

// ═══════════════════════════════════════════════════════════════════
//  ██████  RIGHT BLOCK (newer building, under construction feel) ██████
//  From satellite: large hollow rectangle, blue tarps visible
//  Outer ~65m × 50m, wing ~11m, 3 floors
// ═══════════════════════════════════════════════════════════════════
export function addRightBlock(g, cx, cz) {
  const ow=65, od=50, ww=11, floors=3;
  const h=floors*FH;

  // Use the same hollow building system
  addHollowBuilding(g, cx, cz, ow, od, ww, floors, {
    name:'New Academic Complex',
    icon:'🔬',
    desc:'Science Block, Computer Labs, and new departmental wing. Under completion.',
  });

  // Blue tarps inside courtyard (construction material — visible in satellite!)
  const iW=ow-ww*2, iD=od-ww*2;
  for(let i=0;i<3;i++) {
    const tw=8+i*2, td=5;
    const tx=cx-iW/4+i*9, tz=cz+iD/4-i*4;
    const tarp=bx(tw, 0.08, td, M.tarp);
    tarp.position.set(tx, 0.12, tz); g.add(tarp);
  }

  // Construction scaffolding on east face
  for(let fy=0;fy<floors;fy++) for(let fx=0;fx<5;fx++) {
    at(g, cy(0.06,0.06,FH,4,M.steel), cx+ow/2+0.5+fx*1.2, fy*FH+FH/2, cz-od/4);
    at(g, bx(1.2,0.06,0.06,M.steel), cx+ow/2+0.5+fx*1.2+0.6, fy*FH+FH*0.75, cz-od/4);
  }

 
}

// ═══════════════════════════════════════════════════════════════════
//  PTSNS UNIVERSITY — ACCURATE MAIN GATE
//  Photo analysis:
//   • Two MASSIVE wide rectangular pillars (not thin columns)
//   • Flat horizontal connecting beam at top (carries the blue sign)
//   • Blue sign: white Hindi text + circular emblems on both ends
//   • Two white metal gate LEAVES with many horizontal slats (not iron bars)
//   • Clean modern portal architecture, light grey concrete
//   • Low hedge bushes at pillar bases
// ═══════════════════════════════════════════════════════════════════

export function addMainGate(g, cx, cz) {

  // ── Materials ─────────────────────────────────────────────────────
  const concM   = new THREE.MeshLambertMaterial({ color: 0xeceae5 });  // concrete off-white
  const concSdM = new THREE.MeshLambertMaterial({ color: 0xdedcd6 });  // shadowed recess
  const blueM   = new THREE.MeshLambertMaterial({ color: 0x1a82c4 });  // university blue
  const whiteM  = new THREE.MeshLambertMaterial({ color: 0xfafafa });  // gate white
  const emblWM  = new THREE.MeshLambertMaterial({ color: 0xffffff });  // emblem white
  const hedgeM  = new THREE.MeshLambertMaterial({ color: 0x2a5c2e });  // dark hedge
  const hedgeLM = new THREE.MeshLambertMaterial({ color: 0x3d8040 });  // light hedge top
  const groundM = new THREE.MeshLambertMaterial({ color: 0xc8bfa8 });  // driveway concrete

  // ── Key dimensions (matched to photo proportions) ─────────────────
  const PW  = 6.0;   // pillar width  (X) — very wide per photo
  const PD  = 4.0;   // pillar depth  (Z)
  const PH  = 10.0;  // pillar height
  const GAP = 22.0;  // clear opening between inner pillar faces
  const PCX = GAP / 2 + PW / 2;  // pillar centre offset from gate centre = 14

  const BH  = 3.5;   // beam height
  const BD  = PD;    // beam depth same as pillar
  const BW  = GAP + PW;     // beam spans pillar-centre to pillar-centre = 28
  const BY  = PH + BH / 2;  // beam centre Y

  const GH  = 7.2;   // gate leaf height
  const GLW = GAP / 2 - 0.4; // gate leaf width (each half) ≈ 10.6

  // ══ 1. MAIN PILLARS (left + right) ═══════════════════════════════
  for (const side of [-1, 1]) {
    const px = cx + side * PCX;

    // ── Pillar main body
    at(g, bx(PW, PH, PD, concM), px, PH / 2, cz);

    // ── Top cornice cap (slightly wider)
    at(g, bx(PW + 0.8, 0.55, PD + 0.8, concM), px, PH + 0.27, cz);

    // ── Front face decorative recess panel (subtle shadow indent)
    at(g, bx(PW - 1.6, PH - 2.0, 0.09, concSdM),
      px, PH / 2, cz + PD / 2 + 0.05);

    // ── Bottom chamfer / plinth
    at(g, bx(PW + 0.5, 0.55, PD + 0.5, concM), px, 0.27, cz);

    // ── Hedge row in front of each pillar
    at(g, bx(PW, 0.95, 1.1, hedgeM),  px, 0.47, cz + PD / 2 + 0.55);
    at(g, bx(PW, 0.42, 1.0, hedgeLM), px, 1.06, cz + PD / 2 + 0.55);

    // ── Side hedge (wraps around pillar sides)
    at(g, bx(1.2, 0.85, PD, hedgeM),  px + side * (PW / 2 + 0.6), 0.42, cz);
    at(g, bx(1.2, 0.38, PD, hedgeLM), px + side * (PW / 2 + 0.6), 0.98, cz);
  }

  // ══ 2. TOP CONNECTING BEAM ═══════════════════════════════════════
  at(g, bx(BW, BH, BD, concM), cx, BY, cz);

  // Bottom ledge visible when looking up through gate
  at(g, bx(BW + 0.2, 0.4, BD + 0.3, concM), cx, PH + 0.2, cz);

  // Top cap of full portal structure
  at(g, bx(BW + 0.6, 0.5, BD + 0.6, concM), cx, PH + BH + 0.25, cz);

  // ══ 3. BLUE UNIVERSITY SIGN PANEL ════════════════════════════════
  const SW = BW - 0.7;   // sign width
  const SH = 2.7;        // sign height
  const SZ = cz + BD / 2 + 0.14; // sign sits on front face of beam

  // Blue panel
  at(g, bx(SW, SH, 0.24, blueM), cx, BY, SZ);

  // White border strips top & bottom
  at(g, bx(SW + 0.4, 0.14, 0.18, whiteM), cx, BY + SH / 2 + 0.07, SZ);
  at(g, bx(SW + 0.4, 0.14, 0.18, whiteM), cx, BY - SH / 2 - 0.07, SZ);
  // White border strips left & right
  at(g, bx(0.14, SH + 0.3, 0.18, whiteM), cx - SW / 2 - 0.07, BY, SZ);
  at(g, bx(0.14, SH + 0.3, 0.18, whiteM), cx + SW / 2 + 0.07, BY, SZ);

  // ── Circular emblems on sign (one each side, like photo) ──────────
  for (const side of [-1, 1]) {
    const ex = cx + side * (SW / 2 - 1.5);

    // Outer white ring
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 0.2, 24),
      emblWM
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(ex, BY, SZ + 0.06);
    g.add(ring);

    // Blue inner fill
    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.82, 0.82, 0.22, 24),
      blueM
    );
    inner.rotation.x = Math.PI / 2;
    inner.position.set(ex, BY, SZ + 0.12);
    g.add(inner);

    // White inner symbol (simplified university seal dot)
    const dot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.24, 12),
      emblWM
    );
    dot.rotation.x = Math.PI / 2;
    dot.position.set(ex, BY, SZ + 0.16);
    g.add(dot);

    // Tiny ring detail
    const ringSmall = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.06, 6, 18),
      emblWM
    );
    ringSmall.rotation.x = Math.PI / 2;
    ringSmall.position.set(ex, BY, SZ + 0.18);
    g.add(ringSmall);
  }

  // ══ 4. WHITE GATE LEAVES (left + right) ══════════════════════════
  //  Photo shows: many horizontal slats filling the opening,
  //  framed by thick stile on the outside edge
  for (const side of [-1, 1]) {
    const lx = cx + side * (GLW / 2 + 0.35); // leaf centre X

    // Outer (pillar-side) thick stile
    at(g, bx(0.32, GH + 0.6, 0.26, whiteM),
      lx + side * (GLW / 2), GH / 2 + 0.05, cz);

    // Inner (centre-meeting) stile
    at(g, bx(0.26, GH + 0.6, 0.24, whiteM),
      lx - side * (GLW / 2), GH / 2 + 0.05, cz);

    // Top rail
    at(g, bx(GLW + 0.2, 0.3, 0.24, whiteM), lx, GH + 0.15, cz);

    // Bottom rail
    at(g, bx(GLW + 0.2, 0.3, 0.24, whiteM), lx, 0.15, cz);

    // Centre mid-rail
    at(g, bx(GLW - 0.2, 0.24, 0.2, whiteM), lx, GH * 0.52, cz);

    // ── Horizontal slats (dense, matching photo) ───────────────────
    const N_SLATS = 22;
    const slotTop = GH - 0.35;
    const slotBot = 0.35;
    const gap = (slotTop - slotBot) / (N_SLATS + 1);
    for (let i = 1; i <= N_SLATS; i++) {
      const sy = slotBot + i * gap;
      at(g, bx(GLW - 0.25, 0.11, 0.14, whiteM), lx, sy, cz);
    }

    // ── Vertical pickets (thin uprights between slats) ─────────────
    const N_PICKETS = 16;
    const pStart = lx - GLW / 2 + 0.45;
    const pStep  = (GLW - 0.7) / (N_PICKETS - 1);
    for (let i = 0; i < N_PICKETS; i++) {
      at(g, bx(0.09, GH - 0.4, 0.1, whiteM), pStart + i * pStep, GH / 2, cz);
    }
  }

  // ══ 5. GROUND PLATFORM / DRIVEWAY APRON ══════════════════════════
  const apronW = BW + PW + 2;
  at(g, bx(apronW, 0.24, PD + 2.5, groundM), cx, 0.12, cz);

  // Road approach lines
  at(g, bx(apronW, 0.04, 0.22, concM), cx, 0.24, cz + PD / 2 + 1.25);

  // ══ 6. ZEBRA CROSSING IN FRONT ════════════════════════════════════
  for (let i = 0; i < 7; i++) {
    at(g, bx(1.5, 0.03, 2.5, whiteM),
      cx - 7.5 + i * 2.5, 0.015, cz + PD / 2 + 3.5);
  }

  // ══ 7. SECURITY CABIN (right side, matching photo layout) ════════
  const cabM   = concM;
  const roofM  = new THREE.MeshLambertMaterial({ color: 0x4a3828 });
  const signBM = blueM;
  const winM   = new THREE.MeshLambertMaterial({ color: 0x88bbcc, transparent: true, opacity: 0.75 });

  const cabX = cx + PCX + PW / 2 + 3.5;
  const cabZ = cz - 5.5;

  at(g, bx(4.5, 4.8, 4.5, cabM),          cabX, 2.4,  cabZ);
  at(g, bx(5.1, 0.45, 5.1, roofM),        cabX, 4.95, cabZ);
  // Roof overhang
  at(g, bx(5.4, 0.18, 5.4, roofM),        cabX, 4.72, cabZ);
  // Door
  at(g, bx(1.4, 3.0, 0.09, concSdM),      cabX - 0.5, 1.5, cabZ + 2.27);
  // Window
  at(g, bx(1.5, 1.1, 0.08, winM),         cabX + 0.8, 2.9, cabZ + 2.27);
  // Blue name strip
  at(g, bx(3.5, 0.55, 0.1, signBM),       cabX, 4.1, cabZ + 2.28);

  // Barrier arm from security cabin
  const armPostX = cabX - 2.0;
  at(g, bx(0.18, 2.2, 0.18, concM), armPostX, 1.1, cz + 1.5);  // post
  // Arm (horizontal, red+white striped)
  at(g, bx(8.5, 0.14, 0.14,
    new THREE.MeshLambertMaterial({ color: 0xdd2222 })),
    armPostX + 4.25, 2.35, cz + 1.5);
  for (let s = 0; s < 7; s++) {
    if (s % 2 === 0)
      at(g, bx(1.1, 0.15, 0.15, whiteM), armPostX + 0.8 + s * 1.2, 2.35, cz + 1.5);
  }

  // ══ 8. CLICKABLE INVISIBLE BOUNDING BOX ══════════════════════════
  const hitBox = bx(
    BW + PW, PH + BH, BD,
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitBox.position.set(cx, (PH + BH) / 2, cz);
  hitBox.userData = {
    name: 'Main Gate — PTSNS University',
    icon: '🚪',
    desc: 'Grand entrance gate of Pandit S.N. Shukla University, Shahdol (M.P.)'
  };
  g.add(hitBox);
  if (typeof clickable !== 'undefined') clickable.push(hitBox);
}

// ═══════════════════════════════════════════════════════════════════
//  SPORTS COURT  (basketball/volleyball — green + red border)
// ═══════════════════════════════════════════════════════════════════
export function addSportsCourt(g, cx, cz) {
  // Court surface
  at(g, bx(26,0.12,15,M.court), cx, 0.06, cz);
  // Red border
  const bM=M.courtB;
  at(g, bx(26,0.13,1,bM), cx, 0.065, cz-7);
  at(g, bx(26,0.13,1,bM), cx, 0.065, cz+7);
  at(g, bx(1,0.13,15,bM), cx-12.5, 0.065, cz);
  at(g, bx(1,0.13,15,bM), cx+12.5, 0.065, cz);

  // Court lines
  at(g, bx(0.1,0.14,13,M.white), cx, 0.07, cz);  // center line
  const cc=tor(2,0.08,4,20,M.white); cc.rotation.x=Math.PI/2; cc.position.set(cx,0.14,cz); g.add(cc);

  // 3-point arcs
  for(let side of [-1,1]) {
    const arc=tor(4.5,0.08,4,20,M.white);
    arc.rotation.x=Math.PI/2;
    arc.position.set(cx+side*8.5, 0.14, cz); g.add(arc);
  }

  // Boundary fence
  const fM=new THREE.MeshLambertMaterial({color:0x888880});
  at(g, bx(27,0.85,0.22,fM), cx, 0.43, cz-8.1);
  at(g, bx(27,0.85,0.22,fM), cx, 0.43, cz+8.1);
  at(g, bx(0.22,0.85,16.5,fM), cx-13.1, 0.43, cz);
  at(g, bx(0.22,0.85,16.5,fM), cx+13.1, 0.43, cz);

  // Floodlight poles
  const lM=new THREE.MeshLambertMaterial({color:0xffffaa,emissive:0xffff66,emissiveIntensity:0.4});
  for(let [lx,lz] of [[-11,-7],[11,-7],[-11,7],[11,7]]) {
    at(g, cy(0.1,0.13,9,6,fM), cx+lx, 4.5, cz+lz);
    at(g, bx(1.2,0.3,0.55,lM), cx+lx, 9.2, cz+lz);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  CANTEEN  (open-front dhaba style with green canopy)
// ═══════════════════════════════════════════════════════════════════
export function addCanteen(g, cx, cz) {
  const W=20, D=13, h=4.5;

  // Main body
  const body=bx(W,h,D,M.wall);
  body.position.set(cx,h/2,cz); body.castShadow=body.receiveShadow=true;
  body.userData={name:'University Canteen',icon:'🍽️',desc:'Affordable meals, snacks, samosas, chai. Open 8AM–7PM.'};
  g.add(body); clickable.push(body);

  // Flat roof + parapet
  at(g, bx(W+0.6,0.4,D+0.6,M.roof), cx, h+0.2, cz);
  at(g, bx(W+0.6,0.8,0.22,M.parapet), cx, h+0.9, cz+D/2+0.38);
  at(g, bx(W+0.6,0.8,0.22,M.parapet), cx, h+0.9, cz-D/2-0.38);

  // Open counter at front
  at(g, bx(16,1.05,1.2,M.wallB), cx, 0.52, cz+D/2+1.4);
  // Sign
  at(g, bx(11,1.0,0.18,M.canopy), cx, h-0.55, cz+D/2+0.12);

  // Green canopy over front seating
  at(g, bx(22,0.18,4.0,M.canopy), cx, h, cz+D/2+2.2);
  for(let px of [-8,-3,3,8]) at(g, cy(0.1,0.12,h,6,M.steel), cx+px, h/2, cz+D/2+4.0);

  // Windows
  for(let f=0;f<1;f++) {
    winRow(g,'x',cz-D/2,cx,W,f*FH,'nz',[],6);
    winRow(g,'z',cx-W/2,cz,D,f*FH,'nx',[],3);
    winRow(g,'z',cx+W/2,cz,D,f*FH,'px',[],3);
  }

  at(g, bx(W+0.9,0.55,D+0.9,M.conc), cx,0.28,cz);
  wingRoof(g, cx, cz, W, D, h, 8);
}

// ═══════════════════════════════════════════════════════════════════
//  CREATEBUILDINGS — places all buildings at accurate campus positions
//  Based on satellite image analysis (20m scale bar)
// ═══════════════════════════════════════════════════════════════════
export function createBuildings() {
  const g = new THREE.Group();
  scene.add(g);

  // ── Main Gate ──────────────────────────────────────────────────────
  addMainGate(g, 0, -10);

  // ── Admin Building  (left of main road, L-shaped, satellite top-left)
  //    Positioned west of the main academic block
  addAdminBuilding(g, -42, 28);

  // ── MAIN ACADEMIC BLOCK (THE BIG ONE — center of campus)
  //    Satellite: large hollow rectangle, ~72m × 55m outer, wing ~11m deep
  //    4 floors, south entrance facing the main road
  {
    const g2=new THREE.Group(); scene.add(g2);
    addHollowBuilding(g2, 0, 0, 72, 55, 11, 4, {
      name:'Main Academic Block — अकादमिक भवन',
      icon:'🎓',
      desc:'4-floor main academic building. Arts, Commerce, Science departments, lecture halls, Dean\'s office, open inner courtyard.',
    });
  }

  // ── RIGHT BLOCK (east / bottom-right in satellite)
  //    Newer construction, ~65m × 50m, 3 floors
  addRightBlock(g, 88, 8);

  // ── Sports Court  (between admin and main block)
  addSportsCourt(g, -22, -18);

  // ── Canteen  (behind right block)
  addCanteen(g, 88, -28);
}

