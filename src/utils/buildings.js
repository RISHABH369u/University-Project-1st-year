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

export function addMainAcademicBlock(parent, cx, cz) {
  const g = new THREE.Group();
  parent.add(g);

  // ── Local materials (tuned to the photo) ─────────────────────────
  const wallM    = new THREE.MeshLambertMaterial({ color: 0xeae6dc }); // off-white concrete
  const wallSdM  = new THREE.MeshLambertMaterial({ color: 0xd8d3c6 }); // shadowed plane
  const pilM     = new THREE.MeshLambertMaterial({ color: 0xf6f2e8 }); // bright pilaster
  const slabM    = new THREE.MeshLambertMaterial({ color: 0xb8b4a8 }); // grey floor band
  const parapetM = new THREE.MeshLambertMaterial({ color: 0xe2dccf });
  const winM     = new THREE.MeshLambertMaterial({
    color: 0x6f9bb8, transparent: true, opacity: 0.78,
    emissive: 0x132538, emissiveIntensity: 0.18,
  });
  const curtainM = new THREE.MeshLambertMaterial({
    color: 0x223a55, transparent: true, opacity: 0.85,
    emissive: 0x0a1726, emissiveIntensity: 0.35,
  });
  const mullionM = new THREE.MeshLambertMaterial({ color: 0x9c9a92 });
  const concM    = new THREE.MeshLambertMaterial({ color: 0xc6c2b8 });
  const tileM    = new THREE.MeshLambertMaterial({ color: 0xd2cdc0 });
  const pathM    = new THREE.MeshLambertMaterial({ color: 0xb9b3a4 });
  const grassM   = new THREE.MeshLambertMaterial({ color: 0x4a7a3a });
  const blueSign = new THREE.MeshLambertMaterial({ color: 0x1f4f95 });
  const solarM   = new THREE.MeshLambertMaterial({
    color: 0x152030, emissive: 0x05101c, emissiveIntensity: 0.5,
  });
  const sFrameM  = new THREE.MeshLambertMaterial({ color: 0x6e6e66 });
  const tankM    = new THREE.MeshLambertMaterial({ color: 0x8a8a82 });
  const steelM   = new THREE.MeshLambertMaterial({ color: 0x8c8c84 });
  const roofM    = new THREE.MeshLambertMaterial({ color: 0xa8a59c });

  // ── Helpers ──────────────────────────────────────────────────────
  const bx = (w, h, d, m) => {
    const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    me.castShadow = me.receiveShadow = true; return me;
  };
  const cy = (rt, rb, h, s, m) => {
    const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s), m);
    me.castShadow = me.receiveShadow = true; return me;
  };
  const place = (mesh, x, y, z, ry = 0) => {
    mesh.position.set(x, y, z);
    if (ry) mesh.rotation.y = ry;
    g.add(mesh); return mesh;
  };

  // ── Master dimensions (scaled down for game-feel from ~200×110 m) ─
  // Real ~200 × 110, but for camera/walking we use ~120 × 78
  const OW   = 120;        // outer width  (X)
  const OD   = 78;         // outer depth  (Z)
  const WW   = 12;         // wing depth (one side)
  const FLR  = 4;          // floors
  const FH   = 3.6;        // floor height
  const H    = FLR * FH;   // total wall height
  const iW   = OW - WW * 2;
  const iD   = OD - WW * 2;

  const SOUTH = cz - OD / 2;
  const NORTH = cz + OD / 2;
  const WEST  = cx - OW / 2;
  const EAST  = cx + OW / 2;

  // ── Bay geometry (PAIRED windows per bay, repeated) ───────────────
  // Each bay: 4.0 m wide. Inside bay → 2 narrow windows (1.2 m each)
  // Pilaster strip between bays: 0.45 m wide, full height
  const BAY = 4.0;
  const WIN_W = 1.15;
  const WIN_H = 1.55;
  const WIN_GAP = 0.45;       // gap between the paired windows
  const SILL = 1.05;          // sill height above floor
  const PIL_W = 0.45;
  const PIL_DP = 0.18;        // how far pilaster sticks proud of wall

  // Build a single facade panel along an axis, filled with paired-window bays
  // axis: 'x' (wall runs in X, normal is ±Z) or 'z' (wall runs Z, normal ±X)
  // wallP: perpendicular position of the wall plane
  // span:  total length of facade
  // center: centre coord along the axis
  // sign: +1 = facing outward in +Z/+X, -1 = facing -Z/-X
  // skipZones: array of {c, half} ranges along the axis to leave clear
  function facade(axis, wallP, center, span, sign, skipZones = []) {
    const nBays = Math.floor(span / BAY);
    const realBay = span / nBays;
    for (let i = 0; i < nBays; i++) {
      const t = center - span / 2 + realBay * (i + 0.5);
      // Pilaster between bays (skip first to align)
      if (i > 0) {
        const pt = center - span / 2 + realBay * i;
        const pilOX = axis === 'x' ? 0 : sign * PIL_DP * 0.5;
        const pilOZ = axis === 'x' ? sign * PIL_DP * 0.5 : 0;
        const pil = bx(
          axis === 'x' ? PIL_W : PIL_DP,
          H + 0.6,
          axis === 'x' ? PIL_DP : PIL_W,
          pilM
        );
        const px = axis === 'x' ? pt : wallP + pilOX;
        const pz = axis === 'x' ? wallP + pilOZ : pt;
        place(pil, px, H / 2, pz);
      }

      const inSkip = skipZones.some(s => Math.abs(t - s.c) < s.half);
      if (inSkip) continue;

      // Paired windows on every floor of this bay
      for (let f = 0; f < FLR; f++) {
        const wy = f * FH + SILL + WIN_H / 2;
        for (const off of [-1, +1]) {
          const dx = off * (WIN_GAP / 2 + WIN_W / 2);
          const wx = axis === 'x' ? t + dx : wallP + sign * 0.06;
          const wz = axis === 'x' ? wallP + sign * 0.06 : t + dx;
          const win = new THREE.Mesh(
            new THREE.PlaneGeometry(WIN_W, WIN_H), winM
          );
          win.rotation.y = axis === 'x'
            ? (sign > 0 ? 0 : Math.PI)
            : (sign > 0 ? Math.PI / 2 : -Math.PI / 2);
          place(win, wx, wy, wz);

          // Window concrete frame (slightly proud)
          const fr = bx(
            axis === 'x' ? WIN_W + 0.18 : 0.05,
            WIN_H + 0.18,
            axis === 'x' ? 0.05 : WIN_W + 0.18,
            pilM
          );
          place(fr,
            axis === 'x' ? t + dx : wallP + sign * 0.03,
            wy,
            axis === 'x' ? wallP + sign * 0.03 : t + dx);

          // Small chajja sun-shade above each window
          const ch = bx(
            axis === 'x' ? WIN_W + 0.3 : 0.32,
            0.07,
            axis === 'x' ? 0.32 : WIN_W + 0.3,
            slabM
          );
          place(ch,
            axis === 'x' ? t + dx : wallP + sign * 0.18,
            wy + WIN_H / 2 + 0.15,
            axis === 'x' ? wallP + sign * 0.18 : t + dx);
        }
      }
    }

    // Horizontal floor slab band on every floor line
    for (let f = 1; f <= FLR; f++) {
      const y = f * FH;
      const sl = bx(
        axis === 'x' ? span + 0.4 : 0.3,
        0.28,
        axis === 'x' ? 0.3 : span + 0.4,
        slabM
      );
      place(sl,
        axis === 'x' ? center : wallP + sign * 0.12,
        y,
        axis === 'x' ? wallP + sign * 0.12 : center);
    }
  }

  // ── 1. WALLS (4 wings forming the hollow rectangle) ──────────────
  // South wing
  place(bx(OW, H, WW, wallM), cx, H / 2, SOUTH + WW / 2);
  // North wing
  place(bx(OW, H, WW, wallM), cx, H / 2, NORTH - WW / 2);
  // West wing (between south and north wings, so length = iD)
  place(bx(WW, H, iD, wallM), WEST + WW / 2, H / 2, cz);
  // East wing
  place(bx(WW, H, iD, wallM), EAST - WW / 2, H / 2, cz);

  // ── 2. ENTRANCE BAY (left of centre on south face) ───────────────
  // Glass curtain wall, 7 m wide, full height, with porch in front
  const ENT_W = 7.0;
  const ENT_X = cx - 16;            // off-centre LEFT, matches photo
  const ENT_Z = SOUTH;

  // Cut visual: place a tall dark glass plane on the south face
  const curtain = bx(ENT_W, H - 0.2, 0.18, curtainM);
  place(curtain, ENT_X, H / 2, ENT_Z + 0.02);

  // Vertical mullions on the curtain wall (5 mullions)
  for (let i = 0; i <= 5; i++) {
    const mx = ENT_X - ENT_W / 2 + (ENT_W / 5) * i;
    place(bx(0.12, H - 0.2, 0.22, mullionM), mx, H / 2, ENT_Z + 0.05);
  }
  // Horizontal mullions at each floor line
  for (let f = 1; f < FLR; f++) {
    place(bx(ENT_W, 0.12, 0.22, mullionM), ENT_X, f * FH, ENT_Z + 0.05);
  }
  // Heavy concrete frame around the curtain wall
  place(bx(ENT_W + 0.6, 0.4, 0.28, pilM), ENT_X, H - 0.05, ENT_Z + 0.06);
  place(bx(0.4, H + 0.2, 0.28, pilM), ENT_X - ENT_W / 2 - 0.2, H / 2, ENT_Z + 0.06);
  place(bx(0.4, H + 0.2, 0.28, pilM), ENT_X + ENT_W / 2 + 0.2, H / 2, ENT_Z + 0.06);

  // ── Covered porch in front of entrance ───────────────────────────
  const PORCH_W = ENT_W + 4;
  const PORCH_D = 4.2;
  const PORCH_H = FH * 1.05;
  // Porch slab roof
  place(bx(PORCH_W + 0.4, 0.32, PORCH_D, slabM),
    ENT_X, PORCH_H, ENT_Z - PORCH_D / 2 + 0.1);
  // Porch front edge thicker beam
  place(bx(PORCH_W + 0.4, 0.55, 0.4, pilM),
    ENT_X, PORCH_H - 0.05, ENT_Z - PORCH_D + 0.3);
  // Porch columns (4 square columns)
  for (const off of [-PORCH_W / 2 + 0.4, -PORCH_W / 6, PORCH_W / 6, PORCH_W / 2 - 0.4]) {
    place(bx(0.45, PORCH_H, 0.45, pilM), ENT_X + off, PORCH_H / 2, ENT_Z - PORCH_D + 0.4);
    place(bx(0.7, 0.3, 0.7, pilM), ENT_X + off, 0.15, ENT_Z - PORCH_D + 0.4);
  }
  // Blue "अकादमिक भवन" sign on the porch fascia
  place(bx(5.0, 0.7, 0.18, blueSign),
    ENT_X, PORCH_H - 0.6, ENT_Z - PORCH_D + 0.52);
  // White inner stripe on sign
  place(bx(4.6, 0.45, 0.04,
    new THREE.MeshLambertMaterial({ color: 0xf5f0d8 })),
    ENT_X, PORCH_H - 0.6, ENT_Z - PORCH_D + 0.62);

  // Steps up to porch
  for (let s = 0; s < 4; s++) {
    place(bx(PORCH_W - s * 0.6, 0.17, 0.55, concM),
      ENT_X, s * 0.17, ENT_Z - PORCH_D - 0.3 - s * 0.55);
  }

  // ── 3. SOUTH FACADE (skip the entrance bay zone) ─────────────────
  facade('x', SOUTH, cx, OW, -1,
    [{ c: ENT_X, half: ENT_W / 2 + 0.6 }]);

  // ── 4. NORTH, WEST, EAST FACADES ─────────────────────────────────
  facade('x', NORTH, cx, OW, +1);
  facade('z', WEST,  cz, iD, -1);
  facade('z', EAST,  cz, iD, +1);

  // ── 5. INNER COURTYARD FACADES (simpler, single windows) ─────────
  // Use single windows per bay on inner faces, upper floors only;
  // ground floor is open verandah look.
  function innerFacade(axis, wallP, center, span, sign) {
    const nBays = Math.floor(span / BAY);
    const realBay = span / nBays;
    for (let i = 0; i < nBays; i++) {
      const t = center - span / 2 + realBay * (i + 0.5);
      for (let f = 1; f < FLR; f++) {
        const wy = f * FH + SILL + WIN_H / 2;
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(WIN_W * 1.4, WIN_H), winM
        );
        win.rotation.y = axis === 'x'
          ? (sign > 0 ? 0 : Math.PI)
          : (sign > 0 ? Math.PI / 2 : -Math.PI / 2);
        place(win,
          axis === 'x' ? t : wallP + sign * 0.06,
          wy,
          axis === 'x' ? wallP + sign * 0.06 : t);
      }
    }
    // Slabs on inner face too
    for (let f = 1; f <= FLR; f++) {
      const y = f * FH;
      const sl = bx(
        axis === 'x' ? span + 0.4 : 0.3,
        0.22,
        axis === 'x' ? 0.3 : span + 0.4,
        slabM
      );
      place(sl,
        axis === 'x' ? center : wallP + sign * 0.12,
        y,
        axis === 'x' ? wallP + sign * 0.12 : center);
    }
  }
  innerFacade('x', SOUTH + WW, cx, OW - WW * 0.4, +1);
  innerFacade('x', NORTH - WW, cx, OW - WW * 0.4, -1);
  innerFacade('z', WEST  + WW, cz, iD, +1);
  innerFacade('z', EAST  - WW, cz, iD, -1);

  // ── 6. INNER GROUND-FLOOR VERANDAH COLUMNS ───────────────────────
  function verandah(axis, linePos, center, span) {
    const n = Math.floor(span / 4.5);
    const sp = span / n;
    for (let i = 0; i <= n; i++) {
      const t = center - span / 2 + sp * i;
      const px = axis === 'x' ? t : linePos;
      const pz = axis === 'x' ? linePos : t;
      place(cy(0.22, 0.26, FH, 10, pilM), px, FH / 2, pz);
      place(bx(0.55, 0.25, 0.55, pilM), px, 0.12, pz);
      place(bx(0.55, 0.2,  0.55, pilM), px, FH - 0.1, pz);
    }
  }
  verandah('x', SOUTH + WW + 0.6, cx, iW);
  verandah('x', NORTH - WW - 0.6, cx, iW);
  verandah('z', WEST  + WW + 0.6, cz, iD);
  verandah('z', EAST  - WW - 0.6, cz, iD);

  // ── 7. PARAPETS on every wing roof ────────────────────────────────
  function parapet(axis, linePos, center, span, sign) {
    const pH = 0.95;
    const wall = bx(
      axis === 'x' ? span + 0.4 : 0.22,
      pH,
      axis === 'x' ? 0.22 : span + 0.4,
      parapetM
    );
    place(wall,
      axis === 'x' ? center : linePos + sign * 0.11,
      H + pH / 2 + 0.3,
      axis === 'x' ? linePos + sign * 0.11 : center);
  }
  parapet('x', SOUTH,        cx, OW, -1);
  parapet('x', NORTH,        cx, OW, +1);
  parapet('x', SOUTH + WW,   cx, OW, +1);  // inner
  parapet('x', NORTH - WW,   cx, OW, -1);
  parapet('z', WEST,         cz, OD, -1);
  parapet('z', EAST,         cz, OD, +1);

  // Roof slab on each wing
  place(bx(OW + 0.5, 0.3, WW + 0.4, roofM), cx, H + 0.15, SOUTH + WW / 2);
  place(bx(OW + 0.5, 0.3, WW + 0.4, roofM), cx, H + 0.15, NORTH - WW / 2);
  place(bx(WW + 0.4, 0.3, iD + 0.4, roofM), WEST + WW / 2, H + 0.15, cz);
  place(bx(WW + 0.4, 0.3, iD + 0.4, roofM), EAST - WW / 2, H + 0.15, cz);

  // ── 8. SOLAR PANEL FARMS on every wing rooftop ───────────────────
  function solarFarm(rx, rz, rw, rd) {
    const PW2 = 1.55, PD2 = 0.95;
    const cols = Math.floor((rw - 1.0) / 1.75);
    const rows = Math.floor((rd - 0.8) / 1.15);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const px = rx - rw / 2 + 0.9 + c * 1.75;
      const pz = rz - rd / 2 + 0.6 + r * 1.15;
      const panel = bx(PW2, 0.05, PD2, solarM);
      panel.rotation.x = -0.22;
      panel.position.set(px, H + 1.1, pz);
      g.add(panel);
      const fr = bx(PW2 + 0.06, 0.03, PD2 + 0.06, sFrameM);
      fr.rotation.x = -0.22;
      fr.position.set(px, H + 1.07, pz);
      g.add(fr);
      // Mounting legs
      place(cy(0.04, 0.04, 0.7, 4, sFrameM), px - PW2 / 2, H + 0.65, pz + PD2 / 2);
      place(cy(0.04, 0.04, 0.7, 4, sFrameM), px + PW2 / 2, H + 0.65, pz + PD2 / 2);
    }
  }
  solarFarm(cx, SOUTH + WW / 2, OW - 1.5, WW - 1.0);
  solarFarm(cx, NORTH - WW / 2, OW - 1.5, WW - 1.0);
  solarFarm(WEST + WW / 2, cz, WW - 1.0, iD - 1.0);
  solarFarm(EAST - WW / 2, cz, WW - 1.0, iD - 1.0);

  // ── 9. STAIR / LIFT TOWER (rises above roof, centre-left) ────────
  const TOW_W = 6, TOW_D = 5, TOW_H = FH * 1.6;
  const TOW_X = cx - 8, TOW_Z = NORTH - WW / 2;
  place(bx(TOW_W, TOW_H, TOW_D, wallM), TOW_X, H + TOW_H / 2, TOW_Z);
  place(bx(TOW_W + 0.5, 0.35, TOW_D + 0.5, roofM), TOW_X, H + TOW_H + 0.18, TOW_Z);
  // Tower windows
  for (let f = 0; f < 2; f++) {
    const wy = H + 1.0 + f * 2.0;
    place(bx(1.0, 1.4, 0.05, winM), TOW_X - 1.5, wy, TOW_Z + TOW_D / 2 + 0.06);
    place(bx(1.0, 1.4, 0.05, winM), TOW_X + 1.5, wy, TOW_Z + TOW_D / 2 + 0.06);
  }
  // Water tank on top of tower
  place(cy(1.1, 1.1, 1.9, 12, tankM), TOW_X, H + TOW_H + 1.15, TOW_Z);
  place(cy(1.22, 1.22, 0.18, 12, steelM), TOW_X, H + TOW_H + 2.15, TOW_Z);
  for (let i = 0; i < 4; i++) {
    place(cy(0.05, 0.05, 1.1, 4, steelM),
      TOW_X + Math.cos(i * Math.PI / 2) * 0.85,
      H + TOW_H + 0.6,
      TOW_Z + Math.sin(i * Math.PI / 2) * 0.85);
  }
  // Antenna mast on roof
  place(cy(0.05, 0.05, 4.2, 6, steelM), TOW_X + 1.2, H + TOW_H + 2.2, TOW_Z - 0.3);

  // ── 10. PLINTHS around base ───────────────────────────────────────
  place(bx(OW + 0.8, 0.5, WW + 0.8, concM), cx, 0.25, SOUTH + WW / 2);
  place(bx(OW + 0.8, 0.5, WW + 0.8, concM), cx, 0.25, NORTH - WW / 2);
  place(bx(WW + 0.8, 0.5, iD + 0.8, concM), WEST + WW / 2, 0.25, cz);
  place(bx(WW + 0.8, 0.5, iD + 0.8, concM), EAST - WW / 2, 0.25, cz);

  // ── 11. COURTYARD: lawn quadrants + cross paths + central feature ─
  // Base lawn
  place(bx(iW, 0.06, iD, grassM), cx, 0.06, cz);
  // Cross paths (concrete)
  place(bx(iW, 0.08, 2.4, pathM), cx, 0.08, cz);   // E-W path
  place(bx(2.4, 0.08, iD, pathM), cx, 0.08, cz);   // N-S path
  // Diagonal accent paths to corners
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const dp = bx(Math.hypot(iW, iD) * 0.45, 0.08, 1.2, pathM);
    dp.position.set(cx + sx * iW * 0.18, 0.085, cz + sz * iD * 0.18);
    dp.rotation.y = Math.atan2(sz * iD, sx * iW);
    g.add(dp);
  }
  // Central round feature (planter / fountain base)
  place(cy(2.2, 2.4, 0.45, 24, pathM), cx, 0.22, cz);
  place(cy(2.0, 2.0, 0.18, 24, grassM), cx, 0.5, cz);
  place(cy(0.18, 0.18, 1.4, 8, steelM), cx, 1.2, cz);
  place(cy(0.5, 0.05, 0.05, 12, pilM), cx, 1.92, cz);

  // ── 12. CLICKABLE PHANTOM ─────────────────────────────────────────
  const ph = bx(OW, 0.1, OD,
    new THREE.MeshBasicMaterial({ visible: false }));
  ph.position.set(cx, H + 0.5, cz);
  ph.userData = {
    name: 'Main Academic Block — अकादमिक भवन',
    icon: '🎓',
    desc: 'G+3 hollow quadrangle. Arts, Commerce & Science departments, ' +
          'lecture halls, dean\'s office. Glass-front entrance lobby with ' +
          'covered porch, central courtyard, full rooftop solar array.',
  };
  g.add(ph);
  if (typeof clickable !== 'undefined') clickable.push(ph);
}

/* ── In createBuildings(), REPLACE the old block with: ─────────────
 *
 *    addMainAcademicBlock(scene, 0, 0);
 *
 * Remove (or comment out) the previous addHollowBuilding(...) call
 * for the main academic block. Keep addAdminBuilding, addRightBlock,
 * addSportsCourt, addCanteen and addMainGate as-is.
 * ────────────────────────────────────────────────────────────────── */



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

// Drop-in replacement for addMainGate(g, cx, cz)
// Models PTSNS University main gate from the reference photo:
//  - Two tall slim concrete pillars + a CENTRAL divider pillar (double opening)
//  - Big blue banner beam with white border and two circular emblems at far ends
//  - White metal gates made of VERTICAL bars (pickets) with top/mid/bottom rails
//  - Small window in the central pillar
//  - Concrete apron in front

export function addMainGate(g, cx, cz) {
  // ── Materials ──────────────────────────────────────────────────────
  const concM   = new THREE.MeshLambertMaterial({ color: 0xeeece6 }); // concrete off-white
  const concSdM = new THREE.MeshLambertMaterial({ color: 0xd9d6cd }); // shadowed recess
  const blueM   = new THREE.MeshLambertMaterial({ color: 0x2aa6d8 }); // banner sky-blue (per photo)
  const blueDkM = new THREE.MeshLambertMaterial({ color: 0x1c7fa8 }); // banner edge shadow
  const whiteM  = new THREE.MeshLambertMaterial({ color: 0xf6f6f4 }); // gate white
  const emblWM  = new THREE.MeshLambertMaterial({ color: 0xffffff }); // emblem white
  const winM    = new THREE.MeshLambertMaterial({ color: 0x9ec6d6, transparent: true, opacity: 0.7 });
  const groundM = new THREE.MeshLambertMaterial({ color: 0xcfc6b1 }); // driveway concrete
  const hedgeM  = new THREE.MeshLambertMaterial({ color: 0x2f6b34 });

  // ── Dimensions (photo proportions: tall + slim pillars, wide opening) ──
  const PW   = 2.6;   // outer pillar width  (X)  — slim, not wide
  const PD   = 3.2;   // pillar depth (Z)
  const PH   = 11.0;  // pillar height (tall)

  const CPW  = 2.2;   // CENTRAL divider pillar width
  const OPEN = 9.0;   // each gate opening width (there are TWO openings)

  // Total span centre→outer-pillar-centre:
  // [outerL][open][center][open][outerR]
  const halfSpan = OPEN + CPW / 2 + PW / 2;     // distance cx → outer pillar centre
  const PCX = halfSpan;

  const BH   = 3.4;                              // blue banner beam height
  const BD   = PD + 0.2;                         // beam slightly proud of pillars
  const BW   = (PCX + PW / 2) * 2;               // beam spans full width
  const BY   = PH + BH / 2;                      // beam centre Y

  const GH   = 6.6;                              // gate leaf height
  const GLW  = OPEN - 0.2;                       // each gate spans full opening (single leaf per side for simplicity, but we'll do two leaves per opening)

  // ══ 1. THREE PILLARS (outer L, centre, outer R) ═══════════════════
  const buildPillar = (px, w) => {
    // Plinth
    at(g, bx(w + 0.45, 0.5, PD + 0.45, concM), px, 0.25, cz);
    // Main shaft
    at(g, bx(w, PH, PD, concM), px, PH / 2, cz);
    // Subtle front recess panel
    at(g, bx(w - 0.7, PH - 1.8, 0.06, concSdM), px, PH / 2, cz + PD / 2 + 0.03);
    // Top cornice
    at(g, bx(w + 0.55, 0.45, PD + 0.55, concM), px, PH + 0.22, cz);
  };

  buildPillar(cx - PCX, PW);   // outer left
  buildPillar(cx + PCX, PW);   // outer right
  buildPillar(cx,        CPW); // central divider

  // Small window high on the central pillar (visible in photo)
  at(g, bx(CPW - 0.7, 1.2, 0.08, winM), cx, PH * 0.55, cz + PD / 2 + 0.05);
  // Window frame
  at(g, bx(CPW - 0.5, 0.08, 0.1, concSdM), cx, PH * 0.55 + 0.62, cz + PD / 2 + 0.06);
  at(g, bx(CPW - 0.5, 0.08, 0.1, concSdM), cx, PH * 0.55 - 0.62, cz + PD / 2 + 0.06);

  // ══ 2. TOP CONCRETE LINTEL (thin, behind banner) ═══════════════════
  // Slim concrete strip just under the banner & just above (cap)
  at(g, bx(BW + 0.4, 0.35, BD + 0.2, concM), cx, PH + 0.18, cz);              // bottom ledge
  at(g, bx(BW + 0.6, 0.45, BD + 0.4, concM), cx, PH + BH + 0.22, cz);         // top cap

  // ══ 3. BLUE UNIVERSITY BANNER ══════════════════════════════════════
  const SZ = cz + BD / 2 + 0.16;

  // Main blue panel (full beam width, the banner IS the beam face)
  at(g, bx(BW, BH, 0.28, blueM), cx, BY, SZ - 0.08);

  // Slight darker blue trim top & bottom to give depth
  at(g, bx(BW, 0.18, 0.32, blueDkM), cx, BY + BH / 2 - 0.09, SZ);
  at(g, bx(BW, 0.18, 0.32, blueDkM), cx, BY - BH / 2 + 0.09, SZ);

  // ── Two big white circular emblems at FAR ENDS of banner ──────────
  for (const side of [-1, 1]) {
    const ex = cx + side * (BW / 2 - 1.6);
    // Outer white disc
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.25, 0.18, 28),
      emblWM
    );
    disc.rotation.x = Math.PI / 2;
    disc.position.set(ex, BY, SZ + 0.08);
    g.add(disc);

    // Blue inner ring
    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.2, 28),
      blueM
    );
    inner.rotation.x = Math.PI / 2;
    inner.position.set(ex, BY, SZ + 0.13);
    g.add(inner);

    // White centre seal
    const dot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.22, 18),
      emblWM
    );
    dot.rotation.x = Math.PI / 2;
    dot.position.set(ex, BY, SZ + 0.18);
    g.add(dot);
  }

  // ── Faux Hindi text band across centre (suggested by white blocks) ──
  // We can't render Devanagari without a texture, so we add subtle white
  // tick marks to suggest the lettering rhythm without looking fake.
  const textZ = SZ + 0.16;
  const textY = BY - 0.05;
  const textBandW = BW - 4.6; // leaves room for the two emblems
  const N_GLYPHS = 18;
  const step = textBandW / N_GLYPHS;
  for (let i = 0; i < N_GLYPHS; i++) {
    const gx = cx - textBandW / 2 + step * (i + 0.5);
    const h  = 0.55 + (i % 3) * 0.18;       // varied glyph heights
    const w  = 0.28 + ((i * 7) % 3) * 0.06; // varied widths
    at(g, bx(w, h, 0.05, whiteM), gx, textY, textZ);
  }

  // ══ 4. WHITE METAL GATES — VERTICAL BARS (one leaf per opening) ═══
  // The photo shows vertical bars, NOT horizontal slats.
  const buildGateLeaf = (centerX, leafW) => {
    // Frame: top rail, bottom rail, two stiles
    at(g, bx(leafW, 0.28, 0.22, whiteM), centerX, GH - 0.14, cz);          // top rail
    at(g, bx(leafW, 0.28, 0.22, whiteM), centerX, 0.14,       cz);          // bottom rail
    at(g, bx(leafW, 0.18, 0.2,  whiteM), centerX, GH * 0.5,   cz);          // mid rail
    // Stiles
    at(g, bx(0.22, GH, 0.24, whiteM), centerX - leafW / 2, GH / 2, cz);
    at(g, bx(0.22, GH, 0.24, whiteM), centerX + leafW / 2, GH / 2, cz);

    // Vertical pickets — densely packed
    const N = Math.max(14, Math.round(leafW * 2.2));
    const innerW = leafW - 0.5;
    const startX = centerX - innerW / 2;
    const stepX  = innerW / (N - 1);
    for (let i = 0; i < N; i++) {
      at(g, bx(0.09, GH - 0.55, 0.12, whiteM),
         startX + i * stepX, GH / 2, cz);
    }

    // Decorative top spear-tip row (small caps above top rail)
    for (let i = 0; i < N; i += 2) {
      at(g, bx(0.12, 0.22, 0.14, whiteM),
         startX + i * stepX, GH + 0.05, cz);
    }
  };

  // Left opening (between outer-left and centre pillar)
  const leftOpenCenter  = cx - (CPW / 2 + OPEN / 2);
  const rightOpenCenter = cx + (CPW / 2 + OPEN / 2);
  buildGateLeaf(leftOpenCenter,  GLW);
  buildGateLeaf(rightOpenCenter, GLW);

  // ══ 5. GROUND APRON ════════════════════════════════════════════════
  const apronW = BW + 2;
  at(g, bx(apronW, 0.2, PD + 4, groundM), cx, 0.1, cz + 0.5);

  // Subtle expansion joint lines
  at(g, bx(apronW, 0.025, 0.08, concSdM), cx, 0.21, cz + PD / 2 + 0.5);
  at(g, bx(apronW, 0.025, 0.08, concSdM), cx, 0.21, cz + PD / 2 + 2.0);

  // Small hedge tufts at outer pillar bases (visible in photo bottom corners)
  for (const side of [-1, 1]) {
    const hx = cx + side * (PCX + PW / 2 + 0.9);
    at(g, bx(1.4, 0.7, 1.4, hedgeM), hx, 0.35, cz + PD / 2 + 0.3);
  }

  // ══ 6. INVISIBLE CLICK HITBOX ══════════════════════════════════════
  const hitBox = bx(
    BW + 1, PH + BH, BD + 1,
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitBox.position.set(cx, (PH + BH) / 2, cz);
  hitBox.userData = {
    name: 'Main Gate — PTSNS University',
    icon: '🚪',
    desc: 'Grand entrance of Pandit S.N. Shukla University, Shahdol (M.P.)'
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

