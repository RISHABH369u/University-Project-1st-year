/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  devtool.js v3.2                                                     ║
 * ║  Wall draw (W) · Road draw (D) · Divider draw (I) · Add (A)         ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * SETUP in main.js:
 *   import { initDevTool, updateDevTool } from './devtool.js';
 *   // inside animate(): updateDevTool();
 *   initDevTool();
 *
 * CAMERA FIX in interaction.js — add to every orbit handler:
 *   if (!window._dtCanOrbit()) return;
 */

import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { scene, camera, renderer, controls } from './scene.js';
import { mkWall }           from './utils/wall.js';
import { mkCampusRoad }     from './utils/roads.js';
import { mkCampusDivider }  from './utils/roads.js';
import { buildObjDefs }     from './objects-registry.js';

const OBJ_DEFS = buildObjDefs();


// ═══════════════════════════════════════════════════════════════════════
// §1  STATE
// ═══════════════════════════════════════════════════════════════════════

const STATE = {
  tool:           'select',
  objects:        [],
  selected:       [],
  undoStack:      [],
  redoStack:      [],
  snapSize:       0.5,
  // draw state shared by wall / road / divider tools
  drawStart:      null,   // THREE.Vector3
  drawMode:       null,   // 'wall' | 'road' | 'divider'
  pendingType:    null,
  fileHandle:     null,
  isDragging:     false,
  isDraggingTC:   false,
  transformSpace: 'world',
  showGrid:       true,
  _uid:           0,
};

window._dtCanOrbit = () => !STATE.isDragging && !STATE.isDraggingTC;


// ═══════════════════════════════════════════════════════════════════════
// §2  HELPERS
// ═══════════════════════════════════════════════════════════════════════

const _ray   = new THREE.Raycaster();
const _mouse = new THREE.Vector2();
const _gnd   = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
const _iPt   = new THREE.Vector3();

function _gndPt(e) {
  const r = renderer.domElement.getBoundingClientRect();
  _mouse.x =  ((e.clientX-r.left)/r.width)*2-1;
  _mouse.y = -((e.clientY-r.top)/r.height)*2+1;
  _ray.setFromCamera(_mouse, camera);
  _ray.ray.intersectPlane(_gnd, _iPt);
  return _iPt.clone();
}
function snap(v)  { return Math.round(v/STATE.snapSize)*STATE.snapSize; }
function fmt(n)   { return +parseFloat(n).toFixed(2); }
function uid()    { return `o${++STATE._uid}_${Date.now()}`; }

// Draw preview colours per mode
const DRAW_COLORS = { wall:'0x00d4ff', road:'0x4d9eff', divider:'0x6aab28' };
const DRAW_HEX    = { wall:0x00d4ff,   road:0x4d9eff,   divider:0x6aab28 };


// ═══════════════════════════════════════════════════════════════════════
// §3  GRID
// ═══════════════════════════════════════════════════════════════════════

const _grid = new THREE.GridHelper(400, 200, 0x444455, 0x252535);
_grid.material.opacity = 0.3; _grid.material.transparent = true;
scene.add(_grid);


// ═══════════════════════════════════════════════════════════════════════
// §4  TRANSFORM CONTROLS + CAMERA LOCK
// ═══════════════════════════════════════════════════════════════════════

const TC = new TransformControls(camera, renderer.domElement);
TC.setSize(0.9); TC.setSpace(STATE.transformSpace);
TC.addEventListener('dragging-changed', e => {
  STATE.isDraggingTC = e.value; STATE.isDragging = e.value;
  if (controls) controls.enabled = !e.value;
  _blocker(e.value);
});
TC.addEventListener('objectChange', () => {
  _refreshSel(); _updateProps(); _schedSave(); _updateHier();
});
scene.add(TC);

let _blk = null;
function _blocker(on) {
  if (on && !_blk) { _blk = document.createElement('div'); _blk.style.cssText='position:fixed;inset:0;z-index:8888;'; document.body.appendChild(_blk); }
  else if (!on && _blk) { _blk.remove(); _blk = null; }
}
renderer.domElement.addEventListener('pointerdown', e => {
  const r = renderer.domElement.getBoundingClientRect();
  _mouse.x = ((e.clientX-r.left)/r.width)*2-1;
  _mouse.y = -((e.clientY-r.top)/r.height)*2+1;
  _ray.setFromCamera(_mouse, camera);
  const gz = TC._gizmo ?? TC.getHelper?.();
  if (gz && _ray.intersectObject(gz,true).length) { STATE.isDragging=true; if(controls) controls.enabled=false; }
}, true);


// ═══════════════════════════════════════════════════════════════════════
// §5  SELECTION
// ═══════════════════════════════════════════════════════════════════════

const _selBox = new THREE.BoxHelper(new THREE.Mesh(), 0x4d9eff);
_selBox.visible = false; scene.add(_selBox);

function _refreshSel() {
  if (!STATE.selected.length) { _selBox.visible=false; return; }
  if (STATE.selected.length===1) { _selBox.setFromObject(STATE.selected[0]); }
  else { const b=new THREE.Box3(); STATE.selected.forEach(m=>b.expandByObject(m)); const t=new THREE.Mesh(new THREE.BoxGeometry()); b.getCenter(t.position); b.getSize(t.scale); _selBox.setFromObject(t); }
  _selBox.visible=true;
}
function selObj(mesh, add=false) {
  if (!add) { STATE.selected=[]; TC.detach(); }
  if (mesh) {
    let r=mesh; while(r.parent&&!STATE.objects.find(e=>e.mesh===r)) r=r.parent;
    if (!STATE.selected.includes(r)) STATE.selected.push(r);
    if (STATE.selected.length===1) TC.attach(STATE.selected[0]); else TC.detach();
  }
  _refreshSel(); _updateProps(); _updateHier();
}
function clrSel() { STATE.selected=[]; TC.detach(); _selBox.visible=false; _updateProps(); _updateHier(); }


// ═══════════════════════════════════════════════════════════════════════
// §6  REGISTRY
// ═══════════════════════════════════════════════════════════════════════

function reg(mesh, type, params={}, label=null) {
  const e={mesh,type,params,id:uid(),label:label||OBJ_DEFS[type]?.label||type,hidden:false};
  STATE.objects.push(e); _updateCode(); _updateSB(); _updateHier(); return e;
}
function unreg(mesh) {
  const i=STATE.objects.findIndex(e=>e.mesh===mesh); if(i>-1) STATE.objects.splice(i,1);
  scene.remove(mesh); _updateCode(); _updateSB(); _updateHier();
}
function spawn(type, x, z) {
  const def=OBJ_DEFS[type]; if(!def) return null;
  const m=def.spawn(fmt(x),fmt(z)); reg(m,type,{sx:fmt(x),sz:fmt(z)}); return m;
}


// ═══════════════════════════════════════════════════════════════════════
// §7  DRAW TOOL (wall / road / divider — same two-click system)
// ═══════════════════════════════════════════════════════════════════════

let _drawLine=null, _drawMarker=null;

function _drawStart(mode, pt) {
  STATE.drawMode  = mode;
  STATE.drawStart = pt.clone();

  const col = DRAW_HEX[mode];
  _drawLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),
    new THREE.LineBasicMaterial({color:col})
  );
  scene.add(_drawLine);

  _drawMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 8, 8),
    new THREE.MeshBasicMaterial({color:col})
  );
  _drawMarker.position.set(pt.x, 0.5, pt.z);
  scene.add(_drawMarker);

  const names = {wall:'Wall', road:'Road', divider:'Divider'};
  toast(`🟠 ${names[mode]} started — Dbl-click to finish | Shift: straight`);
}

function _drawUpdate(end) {
  if (!_drawLine||!STATE.drawStart) return;
  const pos = _drawLine.geometry.attributes.position;
  pos.setXYZ(0,STATE.drawStart.x,0.3,STATE.drawStart.z);
  pos.setXYZ(1,end.x,0.3,end.z); pos.needsUpdate=true;
  const dx=end.x-STATE.drawStart.x, dz=end.z-STATE.drawStart.z;
  _setHUD(`📏 ${Math.sqrt(dx*dx+dz*dz).toFixed(2)} u`);
}

function _drawClear() {
  if (_drawLine)   { scene.remove(_drawLine);   _drawLine=null; }
  if (_drawMarker) { scene.remove(_drawMarker); _drawMarker=null; }
  STATE.drawStart=null; STATE.drawMode=null; _setHUD('');
}

function _drawFinish(end) {
  const {x:sx,z:sz}=STATE.drawStart, {x:ex,z:ez}=end;
  const dx=ex-sx, dz=ez-sz, len=fmt(Math.sqrt(dx*dx+dz*dz));
  _pushUndo();

  let mesh, label;
  if (STATE.drawMode==='wall') {
    mesh = mkWall(sx,sz,ex,ez);
    const n=STATE.objects.filter(o=>o.type==='wall').length+1;
    label=`Wall ${n}`;
    reg(mesh,'wall',{sx,sz,ex,ez,length:len},label);
    toast('✅ Wall placed');
  } else if (STATE.drawMode==='road') {
    mesh = mkCampusRoad(sx,sz,ex,ez);
    const n=STATE.objects.filter(o=>o.type==='_road').length+1;
    label=`Road ${n}`;
    reg(mesh,'_road',{sx,sz,ex,ez,length:len},label);
    toast('✅ Road placed  ('+len+' u)');
  } else if (STATE.drawMode==='divider') {
    mesh = mkCampusDivider(sx,sz,ex,ez);
    const n=STATE.objects.filter(o=>o.type==='_divider').length+1;
    label=`Divider ${n}`;
    reg(mesh,'_divider',{sx,sz,ex,ez,length:len},label);
    toast('✅ Divider placed  ('+len+' u)');
  }

  _drawClear();
  if (mesh) selObj(mesh);
}


// ═══════════════════════════════════════════════════════════════════════
// §8  UNDO / REDO
// ═══════════════════════════════════════════════════════════════════════

function _snap() {
  return STATE.objects.map(({id,type,params,label,hidden,mesh})=>({
    id,type,params:{...params},label,hidden,
    pos:[...mesh.position.toArray()],
    rot:[mesh.rotation.x,mesh.rotation.y,mesh.rotation.z],
    scale:[...mesh.scale.toArray()],
  }));
}
function _pushUndo() { STATE.undoStack.push(_snap()); if(STATE.undoStack.length>60) STATE.undoStack.shift(); STATE.redoStack=[]; }
function undo() { if(!STATE.undoStack.length) return; STATE.redoStack.push(_snap()); _applySnap(STATE.undoStack.pop()); toast('↩'); }
function redo() { if(!STATE.redoStack.length) return; STATE.undoStack.push(_snap()); _applySnap(STATE.redoStack.pop()); toast('↪'); }
function _applySnap(snap) {
  const ids=new Set(snap.map(s=>s.id));
  [...STATE.objects].forEach(e=>{ if(!ids.has(e.id)) unreg(e.mesh); });
  snap.forEach(s=>{
    let e=STATE.objects.find(o=>o.id===s.id);
    if (e) {
      e.mesh.position.fromArray(s.pos); e.mesh.rotation.set(...s.rot); e.mesh.scale.fromArray(s.scale);
      e.mesh.visible=!s.hidden; e.hidden=s.hidden; e.label=s.label;
    } else {
      let mesh=null;
      if (s.type==='wall')     mesh=mkWall(s.params.sx,s.params.sz,s.params.ex,s.params.ez);
      else if (s.type==='_road')    mesh=mkCampusRoad(s.params.sx,s.params.sz,s.params.ex,s.params.ez);
      else if (s.type==='_divider') mesh=mkCampusDivider(s.params.sx,s.params.sz,s.params.ex,s.params.ez);
      else { const def=OBJ_DEFS[s.type]; if(def) mesh=def.spawn(s.params.sx,s.params.sz); }
      if (mesh) {
        mesh.position.fromArray(s.pos); mesh.rotation.set(...s.rot); mesh.scale.fromArray(s.scale);
        const ne=reg(mesh,s.type,s.params,s.label); ne.id=s.id;
        if (s.hidden) { mesh.visible=false; ne.hidden=true; }
      }
    }
  });
  clrSel(); _updateCode(); _updateHier(); _updateSB();
}


// ═══════════════════════════════════════════════════════════════════════
// §9  ALIGN
// ═══════════════════════════════════════════════════════════════════════

const ALIGN={
  minX:()=>_aa('x','min'),maxX:()=>_aa('x','max'),centerX:()=>_aa('x','center'),
  minZ:()=>_aa('z','min'),maxZ:()=>_aa('z','max'),centerZ:()=>_aa('z','center'),
  groundY(){if(!STATE.selected.length)return;_pushUndo();STATE.selected.forEach(m=>m.position.y=0);_schedSave();toast('⬇Y=0');},
  distributeX:()=>_dist('x'),distributeZ:()=>_dist('z'),
};
function _aa(ax,mo){
  if(STATE.selected.length<2){toast('⚠️ Select 2+ objects');return;}
  _pushUndo();const vs=STATE.selected.map(m=>m.position[ax]);
  const t=mo==='min'?Math.min(...vs):mo==='max'?Math.max(...vs):(Math.min(...vs)+Math.max(...vs))/2;
  STATE.selected.forEach(m=>m.position[ax]=t);_updateCode();toast(`✅ Align ${ax.toUpperCase()} ${mo}`);
}
function _dist(ax){
  if(STATE.selected.length<3){toast('⚠️ Select 3+ objects');return;}
  _pushUndo();const s=[...STATE.selected].sort((a,b)=>a.position[ax]-b.position[ax]);
  const f=s[0].position[ax],l=s[s.length-1].position[ax];
  s.forEach((m,i)=>m.position[ax]=f+((l-f)/(s.length-1))*i);
  _updateCode();toast(`↔ Distribute ${ax.toUpperCase()}`);
}


// ═══════════════════════════════════════════════════════════════════════
// §10  CODE GENERATION
// ═══════════════════════════════════════════════════════════════════════

const BS='// ── DevTool: Generated Objects START ──';
const BE='// ── DevTool: Generated Objects END ──';

function _generateCode() {
  const lines=[BS];
  for (const {mesh,type,params} of STATE.objects) {
    const p={x:fmt(mesh.position.x),y:fmt(mesh.position.y),z:fmt(mesh.position.z)};
    if      (type==='wall')     lines.push(`mkWall(${params.sx},${params.sz},${params.ex},${params.ez});`);
    else if (type==='_road')    lines.push(`mkCampusRoad(${params.sx},${params.sz},${params.ex},${params.ez});`);
    else if (type==='_divider') lines.push(`mkCampusDivider(${params.sx},${params.sz},${params.ex},${params.ez});`);
    else { const def=OBJ_DEFS[type]; if(def) lines.push(def.code(p,mesh.rotation,mesh.scale)); }
  }
  lines.push(BE);
  return lines.join('\n');
}
function _updateCode() { const el=document.getElementById('dt-code-text'); if(el) el.textContent=_generateCode(); _schedSave(); }


// ═══════════════════════════════════════════════════════════════════════
// §11  PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════

const LS_KEY='devtool_v32_scene';
let _saveT=null;
function _schedSave() {
  clearTimeout(_saveT);
  _saveT=setTimeout(()=>{
    const data=STATE.objects.map(({type,params,mesh,label,hidden})=>({type,params,label,hidden,pos:mesh.position.toArray(),rot:[mesh.rotation.x,mesh.rotation.y,mesh.rotation.z],scale:mesh.scale.toArray()}));
    localStorage.setItem(LS_KEY,JSON.stringify(data));
    _setFS('💾 Auto-saved');
  },800);
}
async function _linkFile() {
  if(!window.showOpenFilePicker){toast('❌ Chrome/Edge required');return;}
  try{[STATE.fileHandle]=await window.showOpenFilePicker({types:[{description:'JS',accept:{'text/javascript':['.js']}}]});document.getElementById('dt-link-btn').textContent=`📎 ${STATE.fileHandle.name}`;toast(`✅ Linked`);}catch{}
}
async function _saveToFile() {
  if(!STATE.fileHandle){toast('⚠️ Link .js first!');return;}
  try{const f=await STATE.fileHandle.getFile();let c=await f.text();const nb=_generateCode();const eS=BS.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),eE=BE.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const pat=new RegExp(`${eS}[\\s\\S]*?${eE}`,'g');c=c.match(pat)?c.replace(pat,nb):c+'\n\n'+nb+'\n';const w=await STATE.fileHandle.createWritable();await w.write(c);await w.close();_setFS('✅ Saved!');toast('✅ Saved!');}catch(err){toast(`❌ ${err.message}`);}
}
function _setFS(m){const el=document.getElementById('dt-file-status');if(el){el.textContent=m;setTimeout(()=>el.textContent='',3000);}}


// ═══════════════════════════════════════════════════════════════════════
// §12  PROPERTIES PANEL
// ═══════════════════════════════════════════════════════════════════════

function _updateProps() { requestAnimationFrame(_renderProps); }
function _renderProps() {
  const panel=document.getElementById('dt-props-body');if(!panel)return;
  if(!STATE.selected.length){
    panel.innerHTML=`<div class="dt-empty">Nothing selected<br><span>Click or draw an object</span></div>`;
    const ap=document.getElementById('dt-align-panel');if(ap)ap.style.display='none';return;
  }
  const mesh=STATE.selected[0],entry=STATE.objects.find(e=>e.mesh===mesh);
  const p=mesh.position,r=mesh.rotation,s=mesh.scale;
  const bbox=new THREE.Box3().setFromObject(mesh),dim=new THREE.Vector3();bbox.getSize(dim);
  const ap=document.getElementById('dt-align-panel');if(ap)ap.style.display=STATE.selected.length>=2?'block':'none';

  const DRAWN=['wall','_road','_divider'];
  const isDrawn=DRAWN.includes(entry?.type);
  const typeIcon = entry?.type==='_road'?'🛣':entry?.type==='_divider'?'🟩':entry?.type==='wall'?'█':OBJ_DEFS[entry?.type]?.icon||'⬛';
  const typeLabel= entry?.type==='_road'?'Road':entry?.type==='_divider'?'Divider':entry?.type==='wall'?'Wall':OBJ_DEFS[entry?.type]?.label||entry?.type||'Object';

  panel.innerHTML=`
    <div class="dt-prop-section">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <div class="dt-prop-tag">${typeIcon} ${typeLabel}</div>
        ${STATE.selected.length>1?`<span style="font-size:10px;color:#666">${STATE.selected.length} sel.</span>`:''}
      </div>
      <input class="dt-label-input" id="dt-label-field" value="${entry?.label||''}" placeholder="Label…">
    </div>
    ${isDrawn?`<div class="dt-prop-section"><div class="dt-dim-badge">📏 Length: <b>${entry?.params?.length??'?'} u</b></div></div>`:''}
    <div class="dt-prop-section">
      <div class="dt-prop-head">DIMENSIONS</div>
      <div class="dt-dim-row">
        <span>W<b>${fmt(dim.x)}</b></span><span>H<b>${fmt(dim.y)}</b></span><span>D<b>${fmt(dim.z)}</b></span>
      </div>
    </div>
    <div class="dt-prop-section"><div class="dt-prop-head">POSITION</div>${_xyz('pos',fmt(p.x),fmt(p.y),fmt(p.z))}</div>
    <div class="dt-prop-section"><div class="dt-prop-head">ROTATION °</div>${_xyz('rot',fmt(THREE.MathUtils.radToDeg(r.x)),fmt(THREE.MathUtils.radToDeg(r.y)),fmt(THREE.MathUtils.radToDeg(r.z)))}</div>
    <div class="dt-prop-section"><div class="dt-prop-head">SCALE</div>${_xyz('scale',fmt(s.x),fmt(s.y),fmt(s.z))}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:10px">
      <button class="dt-btn" onclick="window._dt.duplicate()">⧉ Clone</button>
      <button class="dt-btn" onclick="window._dt.toggleHide()">👁 Hide</button>
      <button class="dt-btn" onclick="window._dt.focusSelected()">🎯 Focus</button>
      <button class="dt-btn dt-btn-danger" onclick="window._dt.deleteSelected()">🗑 Delete</button>
    </div>`;
  document.getElementById('dt-label-field')?.addEventListener('change',e=>{if(entry){entry.label=e.target.value;_updateHier();}});
  panel.querySelectorAll('.dt-xyz-input').forEach(inp=>{
    inp.addEventListener('change',()=>{
      const val=parseFloat(inp.value),{prop,axis}=inp.dataset;if(isNaN(val))return;
      _pushUndo();STATE.selected.forEach(m=>{
        if(prop==='pos')m.position[axis]=val;
        if(prop==='rot')m.rotation[axis]=THREE.MathUtils.degToRad(val);
        if(prop==='scale')m.scale[axis]=val;
      });_refreshSel();_updateCode();
    });
  });
}
function _xyz(prop,x,y,z){return `<div class="dt-xyz-row">${['x','y','z'].map((a,i)=>`<label class="dt-xyz-col"><span class="dt-axis-${a}">${a.toUpperCase()}</span><input class="dt-xyz-input" data-prop="${prop}" data-axis="${a}" type="number" value="${[x,y,z][i]}" step="${prop==='rot'?1:0.1}"></label>`).join('')}</div>`;}


// ═══════════════════════════════════════════════════════════════════════
// §13  HIERARCHY
// ═══════════════════════════════════════════════════════════════════════

function _updateHier() {
  const list=document.getElementById('dt-hierarchy-list');if(!list)return;
  if(!STATE.objects.length){list.innerHTML=`<div class="dt-hier-empty">Scene is empty</div>`;return;}
  list.innerHTML=STATE.objects.map((entry,i)=>{
    const isSel=STATE.selected.includes(entry.mesh);
    const icon=entry.type==='_road'?'🛣':entry.type==='_divider'?'🟩':entry.type==='wall'?'█':OBJ_DEFS[entry.type]?.icon||'⬛';
    return `<div class="dt-hier-item${isSel?' dt-hier-active':''}${entry.hidden?' dt-hier-hidden':''}" data-idx="${i}">
      <span class="dt-hier-icon">${icon}</span>
      <span class="dt-hier-label">${entry.label}</span>
      <div class="dt-hier-actions">
        <button class="dt-hier-vis" data-idx="${i}">${entry.hidden?'🚫':'👁'}</button>
        <button class="dt-hier-del" data-idx="${i}">×</button>
      </div>
    </div>`;
  }).join('');
  list.querySelectorAll('.dt-hier-item').forEach(el=>{
    el.addEventListener('click',e=>{if(e.target.closest('.dt-hier-actions'))return;const entry=STATE.objects[+el.dataset.idx];if(entry)selObj(entry.mesh,e.ctrlKey||e.metaKey);});
  });
  list.querySelectorAll('.dt-hier-vis').forEach(btn=>{btn.addEventListener('click',e=>{e.stopPropagation();const entry=STATE.objects[+btn.dataset.idx];if(entry){entry.hidden=!entry.hidden;entry.mesh.visible=!entry.hidden;_updateHier();}});});
  list.querySelectorAll('.dt-hier-del').forEach(btn=>{btn.addEventListener('click',e=>{e.stopPropagation();const entry=STATE.objects[+btn.dataset.idx];if(entry){_pushUndo();STATE.selected=STATE.selected.filter(m=>m!==entry.mesh);if(!STATE.selected.length)TC.detach();unreg(entry.mesh);_updateProps();toast('🗑');}});});
}


// ═══════════════════════════════════════════════════════════════════════
// §14  TOOL SWITCHING
// ═══════════════════════════════════════════════════════════════════════

const DRAW_TOOLS = ['wall','road','divider'];

function setTool(tool) {
  STATE.tool=tool;
  document.querySelectorAll('.dt-tool-btn').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));

  if      (tool==='translate'){TC.setMode('translate');if(STATE.selected.length)TC.attach(STATE.selected[0]);}
  else if (tool==='rotate')   {TC.setMode('rotate');   if(STATE.selected.length)TC.attach(STATE.selected[0]);}
  else if (tool==='scale')    {TC.setMode('scale');    if(STATE.selected.length)TC.attach(STATE.selected[0]);}
  else if (tool==='select')   {TC.setMode('translate');if(!STATE.selected.length)TC.detach();}
  else                        {TC.detach();}

  // Cancel any active draw
  if (!DRAW_TOOLS.includes(tool) && STATE.drawStart) _drawClear();

  const pal=document.getElementById('dt-add-palette');
  if(pal) pal.style.display=tool==='add'?'flex':'none';
  if(!DRAW_TOOLS.includes(tool)) _setHUD('');
  _updateSB();
}

const KEY_TOOL={v:'select',g:'translate',r:'rotate',s:'scale',w:'wall',d:'road',i:'divider',a:'add'};


// ═══════════════════════════════════════════════════════════════════════
// §15  STATUS BAR & HUD
// ═══════════════════════════════════════════════════════════════════════

function _updateSB() {
  const el=document.getElementById('dt-statusbar');if(!el)return;
  const names={select:'SELECT ↖',translate:'MOVE ✥',rotate:'ROTATE ↻',scale:'SCALE ⊞',wall:'WALL █',road:'ROAD 🛣',divider:'DIVIDER 🟩',add:'ADD ＋'};
  el.querySelector('#dt-sb-tool').textContent=names[STATE.tool]||STATE.tool.toUpperCase();
  el.querySelector('#dt-sb-objects').textContent=`Objects: ${STATE.objects.length}`;
  el.querySelector('#dt-sb-snap').textContent=`Snap:${STATE.snapSize}`;
  el.querySelector('#dt-sb-space').textContent=STATE.transformSpace==='world'?'🌐 World':'📦 Local';
}
function _updateCursor(x,z){const el=document.getElementById('dt-sb-cursor');if(el)el.textContent=`X:${fmt(x)}  Z:${fmt(z)}`;}
function _setHUD(t){const el=document.getElementById('dt-wall-hud');if(!el)return;el.textContent=t;el.style.display=t?'block':'none';}


// ═══════════════════════════════════════════════════════════════════════
// §16  EVENTS
// ═══════════════════════════════════════════════════════════════════════

function _onMove(e) {
  const pt=_gndPt(e),sx=snap(pt.x),sz=snap(pt.z);
  _updateCursor(sx,sz);

  // Live draw preview
  if (DRAW_TOOLS.includes(STATE.tool) && STATE.drawStart) {
    let ex=sx,ez=sz;
    if (e.shiftKey){const dx=Math.abs(ex-STATE.drawStart.x),dz=Math.abs(ez-STATE.drawStart.z);dx>dz?ez=STATE.drawStart.z:ex=STATE.drawStart.x;}
    _drawUpdate(new THREE.Vector3(ex,0,ez));
  }
  if (STATE.selected.length===1&&!TC.dragging) _refreshSel();
}

function _onClick(e) {
  if (e.detail>1||TC.dragging) return;
  const tool=STATE.tool,pt=_gndPt(e);

  if (['select','translate','rotate','scale'].includes(tool)) {
    const rc=renderer.domElement.getBoundingClientRect();
    _mouse.x=((e.clientX-rc.left)/rc.width)*2-1;
    _mouse.y=-((e.clientY-rc.top)/rc.height)*2+1;
    _ray.setFromCamera(_mouse,camera);
    const hits=_ray.intersectObjects(STATE.objects.map(o=>o.mesh),true);
    if (hits.length){
      let root=hits[0].object;while(root.parent&&!STATE.objects.find(en=>en.mesh===root))root=root.parent;
      selObj(root,e.ctrlKey||e.metaKey);if(tool==='select')setTool('translate');
    } else clrSel();
  }
  if (tool==='add'&&STATE.pendingType){
    _pushUndo();const m=spawn(STATE.pendingType,snap(pt.x),snap(pt.z));
    if(m){selObj(m);toast(`✅ ${OBJ_DEFS[STATE.pendingType]?.label} placed`);}
  }
}

function _onDblClick(e) {
  const tool=STATE.tool;
  if (!DRAW_TOOLS.includes(tool)) return;

  const pt=_gndPt(e);
  let ex=snap(pt.x),ez=snap(pt.z);

  if (e.shiftKey&&STATE.drawStart){
    const dx=Math.abs(ex-STATE.drawStart.x),dz=Math.abs(ez-STATE.drawStart.z);
    dx>dz?ez=STATE.drawStart.z:ex=STATE.drawStart.x;
  }

  if (!STATE.drawStart) {
    _drawStart(tool, new THREE.Vector3(ex,0,ez));
  } else {
    _drawFinish(new THREE.Vector3(ex,0,ez));
  }
}

function _onPtrUp() {
  if(!TC.dragging){STATE.isDragging=false;STATE.isDraggingTC=false;if(controls)controls.enabled=true;_blocker(false);}
}

function _onKey(e) {
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
  const k=e.key.toLowerCase();

  if(!e.ctrlKey&&KEY_TOOL[k]){setTool(KEY_TOOL[k]);return;}
  if(e.ctrlKey&&k==='z'){e.preventDefault();undo();return;}
  if(e.ctrlKey&&k==='y'){e.preventDefault();redo();return;}
  if(e.ctrlKey&&k==='d'){e.preventDefault();window._dt.duplicate();return;}
  if(k==='delete'||k==='backspace'){window._dt.deleteSelected();return;}
  if(k==='escape'){_drawClear();clrSel();STATE.pendingType=null;setTool('select');return;}
  if(k==='tab'){
    e.preventDefault();
    const sizes=[0.1,0.25,0.5,1.0,2.0];
    STATE.snapSize=sizes[(sizes.indexOf(STATE.snapSize)+1)%sizes.length];
    toast(`📐 Snap: ${STATE.snapSize}`);_updateSB();return;
  }
  if(k==='f'){window._dt.focusSelected();return;}
  if(k==='g'&&!e.ctrlKey){STATE.showGrid=!STATE.showGrid;_grid.visible=STATE.showGrid;toast(STATE.showGrid?'▦ Grid ON':'▦ Grid OFF');return;}
  if(k==='l'){STATE.transformSpace=STATE.transformSpace==='world'?'local':'world';TC.setSpace(STATE.transformSpace);toast(`🔄 ${STATE.transformSpace.toUpperCase()}`);_updateSB();return;}
  if(k==='h'){window._dt.toggleHide();return;}
  if(k===' '){e.preventDefault();TC.visible=!TC.visible;return;}
  if(['x','y','z'].includes(k)&&!e.ctrlKey){TC.showX=k==='x';TC.showY=k==='y';TC.showZ=k==='z';return;}
  if(k==='q'){TC.showX=true;TC.showY=true;TC.showZ=true;}
}


// ═══════════════════════════════════════════════════════════════════════
// §17  GLOBAL API
// ═══════════════════════════════════════════════════════════════════════

window._dt={
  deleteSelected(){if(!STATE.selected.length)return;_pushUndo();STATE.selected.forEach(m=>unreg(m));STATE.selected=[];TC.detach();_selBox.visible=false;_updateProps();toast('🗑 Deleted');},
  duplicate(){
    if(!STATE.selected.length)return;
    const mesh=STATE.selected[0],entry=STATE.objects.find(e=>e.mesh===mesh);
    if(!entry){return;}
    const DRAWN=['wall','_road','_divider'];
    if(DRAWN.includes(entry.type)){toast('⚠️ Draw types cannot be cloned');return;}
    _pushUndo();const m=spawn(entry.type,mesh.position.x+STATE.snapSize*2,mesh.position.z+STATE.snapSize*2);
    if(m){m.rotation.copy(mesh.rotation);m.scale.copy(mesh.scale);selObj(m);toast('⧉ Cloned');}
  },
  toggleHide(){if(!STATE.selected.length)return;STATE.selected.forEach(m=>{const e=STATE.objects.find(o=>o.mesh===m);if(e){e.hidden=!e.hidden;m.visible=!e.hidden;}});_updateHier();toast('👁');},
  focusSelected(){if(!STATE.selected.length)return;const t=new THREE.Vector3();STATE.selected.forEach(m=>t.add(m.position));t.divideScalar(STATE.selected.length);if(controls){controls.target.copy(t);controls.update();}toast('🎯');},
  align:ALIGN,undo,redo,
  getCode:_generateCode,getState:()=>STATE,getObjects:()=>STATE.objects,getRegistry:()=>OBJ_DEFS,
};


// ═══════════════════════════════════════════════════════════════════════
// §18  TOAST
// ═══════════════════════════════════════════════════════════════════════

let _toastT=null;
function toast(msg){const el=document.getElementById('dt-toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(_toastT);_toastT=setTimeout(()=>el.classList.remove('show'),2500);}


// ═══════════════════════════════════════════════════════════════════════
// §19  UI
// ═══════════════════════════════════════════════════════════════════════

function _buildUI(){
  const style=document.createElement('style');
  style.textContent=`
    :root{--dt-bg:#111113;--dt-panel:#181820;--dt-border:#2c2c3c;--dt-accent:#4d9eff;--dt-accent2:#9b6fff;--dt-rd:#6aab28;--dt-text:#c8c8d4;--dt-text2:#66667a;--dt-hover:#232330;--dt-active:#1a4a88;--dt-danger:#c03040;--dt-success:#2aaa66;--dt-x:#e05050;--dt-y:#50c050;--dt-z:#5080e0}
    #dt-root *{box-sizing:border-box;margin:0}#dt-root{font-family:'Segoe UI',system-ui,sans-serif;font-size:12px;color:var(--dt-text)}
    #dt-root ::-webkit-scrollbar{width:4px}#dt-root ::-webkit-scrollbar-thumb{background:#2c2c3c;border-radius:4px}
    /* Toolbar */
    #dt-toolbar{position:fixed;left:10px;top:50%;transform:translateY(-50%);background:var(--dt-panel);border:1px solid var(--dt-border);border-radius:14px;padding:8px 5px;display:flex;flex-direction:column;gap:2px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,.7)}
    .dt-tool-btn{width:36px;height:36px;border-radius:9px;border:none;background:transparent;color:var(--dt-text2);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;position:relative}
    .dt-tool-btn:hover{background:var(--dt-hover);color:var(--dt-text)}.dt-tool-btn.active{background:var(--dt-active);color:var(--dt-accent);box-shadow:0 0 0 1px var(--dt-accent)}
    .dt-tool-btn[data-tool="road"].active{background:#0d3a12;color:var(--dt-rd);box-shadow:0 0 0 1px var(--dt-rd)}
    .dt-tool-btn[data-tool="divider"].active{background:#1a380d;color:var(--dt-rd);box-shadow:0 0 0 1px var(--dt-rd)}
    .dt-tool-btn .dt-tt{display:none;position:absolute;left:44px;top:50%;transform:translateY(-50%);background:#0c0c14;color:var(--dt-text);padding:4px 10px;border-radius:6px;white-space:nowrap;font-size:11px;pointer-events:none;border:1px solid var(--dt-border);z-index:10000}
    .dt-tool-btn:hover .dt-tt{display:block}.dt-tb-sep{height:1px;background:var(--dt-border);margin:3px 4px}
    /* Right panel */
    #dt-right{position:fixed;right:0;top:0;width:240px;height:100vh;display:flex;flex-direction:column;z-index:9998;overflow:hidden;background:var(--dt-panel);border-left:1px solid var(--dt-border);box-shadow:-6px 0 24px rgba(0,0,0,.5)}
    .dt-panel-hdr{padding:6px 10px 5px;font-size:9px;font-weight:700;color:var(--dt-text2);text-transform:uppercase;letter-spacing:1.4px;border-bottom:1px solid var(--dt-border);flex-shrink:0;background:var(--dt-bg)}
    #dt-props-body{flex:1;overflow-y:auto;padding:8px;min-height:0}
    .dt-empty{color:var(--dt-text2);text-align:center;margin-top:20px;line-height:1.9;font-size:11px}.dt-empty span{font-size:10px;color:#3a3a50}
    .dt-prop-section{margin-bottom:8px}.dt-prop-head{font-size:9px;color:var(--dt-text2);margin-bottom:4px;letter-spacing:.8px;font-weight:600}
    .dt-prop-tag{display:inline-block;background:var(--dt-hover);border:1px solid var(--dt-border);border-radius:5px;padding:2px 8px;font-size:11px;font-weight:600;color:var(--dt-text)}
    .dt-dim-badge{display:inline-block;margin-top:4px;font-size:11px;color:var(--dt-accent);background:rgba(77,158,255,.08);border:1px solid rgba(77,158,255,.2);border-radius:4px;padding:2px 8px}
    .dt-dim-row{display:flex;gap:4px;font-size:11px;color:var(--dt-text2)}.dt-dim-row span{flex:1;background:var(--dt-bg);padding:3px 5px;border-radius:4px;text-align:center;border:1px solid var(--dt-border)}.dt-dim-row b{color:var(--dt-text)}
    .dt-xyz-row{display:flex;gap:3px}.dt-xyz-col{flex:1;display:flex;flex-direction:column;gap:2px}.dt-xyz-col>span{font-size:9px;font-weight:800;text-align:center;letter-spacing:.5px}
    .dt-axis-x{color:var(--dt-x)}.dt-axis-y{color:var(--dt-y)}.dt-axis-z{color:var(--dt-z)}
    .dt-xyz-input,.dt-label-input{width:100%;padding:4px 5px;background:var(--dt-bg);border:1px solid var(--dt-border);color:var(--dt-text);border-radius:5px;font-size:11px;outline:none;text-align:center;transition:border-color .15s}
    .dt-label-input{text-align:left;padding:4px 8px}.dt-xyz-input:focus,.dt-label-input:focus{border-color:var(--dt-accent)}
    /* Align */
    #dt-align-panel{flex-shrink:0;padding:6px;border-top:1px solid var(--dt-border);display:none}
    .dt-align-row{display:flex;gap:4px;margin-bottom:4px;flex-wrap:wrap}
    /* Hierarchy */
    #dt-hierarchy{flex-shrink:0;border-top:1px solid var(--dt-border);display:flex;flex-direction:column}
    #dt-hierarchy-list{overflow-y:auto;max-height:130px;padding:3px 4px}
    .dt-hier-empty{color:var(--dt-text2);text-align:center;font-size:11px;padding:8px}
    .dt-hier-item{display:flex;align-items:center;gap:5px;padding:3px 6px;border-radius:5px;cursor:pointer;font-size:11px;color:var(--dt-text);transition:background .1s;white-space:nowrap;overflow:hidden}
    .dt-hier-item:hover{background:var(--dt-hover)}.dt-hier-item.dt-hier-active{background:rgba(77,158,255,.12);color:var(--dt-accent)}.dt-hier-item.dt-hier-hidden{opacity:.35}
    .dt-hier-icon{flex-shrink:0}.dt-hier-label{flex:1;overflow:hidden;text-overflow:ellipsis}
    .dt-hier-actions{display:flex;gap:2px;opacity:0;flex-shrink:0}.dt-hier-item:hover .dt-hier-actions{opacity:1}
    .dt-hier-vis,.dt-hier-del{background:none;border:none;cursor:pointer;font-size:11px;padding:0 3px;color:var(--dt-text2);border-radius:3px}
    .dt-hier-del:hover{background:var(--dt-danger);color:#fff}
    /* Library */
    #dt-lib-body{overflow-y:auto;max-height:120px;padding:3px 4px;border-top:1px solid var(--dt-border);flex-shrink:0}
    .dt-lib-group-label{font-size:9px;color:#3a3a50;text-transform:uppercase;letter-spacing:1px;padding:4px 6px 2px}
    .dt-lib-item{padding:3px 8px;border-radius:5px;cursor:pointer;font-size:11px;color:var(--dt-text);display:flex;align-items:center;gap:6px;transition:all .1s}
    .dt-lib-item:hover{background:var(--dt-hover);color:var(--dt-accent)}.dt-lib-item.active{background:rgba(77,158,255,.12);color:var(--dt-accent)}
    /* File */
    #dt-file-ctrl{padding:6px;border-top:1px solid var(--dt-border);flex-shrink:0}
    #dt-file-status{font-size:10px;color:var(--dt-success);min-height:13px;text-align:center;margin-bottom:4px}
    /* Buttons */
    .dt-btn{padding:4px 8px;border-radius:5px;border:1px solid var(--dt-border);background:var(--dt-hover);color:var(--dt-text);cursor:pointer;font-size:10px;transition:all .12s;text-align:center;white-space:nowrap}
    .dt-btn:hover{background:var(--dt-active);color:#fff;border-color:var(--dt-accent)}.dt-btn-danger:hover{background:var(--dt-danger)!important;border-color:var(--dt-danger)!important}
    .dt-btn-accent{border-color:var(--dt-accent2)!important;color:var(--dt-accent2)!important}.dt-btn-accent:hover{background:var(--dt-accent2)!important;color:#fff!important}
    /* Code panel */
    #dt-bottom{position:fixed;bottom:22px;left:58px;right:248px;background:var(--dt-bg);border:1px solid var(--dt-border);border-radius:10px 10px 0 0;z-index:9997;overflow:hidden;transition:height .22s cubic-bezier(.4,0,.2,1);box-shadow:0 -4px 20px rgba(0,0,0,.4)}
    #dt-bottom.dt-collapsed{height:28px}#dt-bottom.dt-expanded{height:180px}
    #dt-bottom-hdr{height:28px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;cursor:pointer;background:#13131c;border-bottom:1px solid var(--dt-border);user-select:none}
    #dt-bottom-hdr>span{font-size:9px;color:var(--dt-text2);font-weight:700;text-transform:uppercase;letter-spacing:1px}.dt-code-btns{display:flex;gap:5px;align-items:center}
    #dt-code-text{padding:6px 10px;font-family:'Cascadia Code','Fira Code',Consolas,monospace;font-size:11px;color:#7ec8e3;white-space:pre-wrap;height:calc(100% - 28px);overflow-y:auto;line-height:1.6}
    /* Status */
    #dt-statusbar{position:fixed;bottom:0;left:0;right:0;height:22px;background:#0d2a4a;border-top:1px solid #1a3a6a;display:flex;align-items:center;padding:0 10px;gap:14px;z-index:9999;font-size:10px;color:rgba(180,210,255,.85)}
    #dt-sb-tool{font-weight:800;color:var(--dt-accent)!important;font-size:10px}
    /* Wall/Road/Divider HUD */
    #dt-wall-hud{position:fixed;top:38%;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.88);color:#00d4ff;padding:6px 22px;border-radius:20px;font-size:20px;font-weight:800;pointer-events:none;display:none;z-index:9999;border:1px solid rgba(0,212,255,.3);letter-spacing:2px}
    /* Draw mode hint strip */
    #dt-draw-hint{position:fixed;top:12px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.78);color:#aaa;font-size:11px;padding:4px 16px;border-radius:20px;z-index:9997;pointer-events:none;display:none;border:1px solid #333}
    /* Add palette */
    #dt-add-palette{position:fixed;bottom:48px;left:50%;transform:translateX(-50%);background:var(--dt-panel);border:1px solid var(--dt-border);border-radius:12px;padding:8px;gap:5px;z-index:9999;display:none;flex-wrap:wrap;max-width:640px;box-shadow:0 4px 24px rgba(0,0,0,.6)}
    .dt-palette-item{padding:5px 11px;border-radius:7px;cursor:pointer;font-size:11px;background:var(--dt-hover);color:var(--dt-text);border:1px solid transparent;transition:all .1s;white-space:nowrap}
    .dt-palette-item:hover,.dt-palette-item.active{border-color:var(--dt-accent);color:#fff;background:rgba(77,158,255,.2)}
    .dt-pal-sep{width:100%;height:0;border-top:1px solid var(--dt-border);margin:2px 0}
    /* Toast */
    #dt-toast{position:fixed;bottom:34px;left:50%;transform:translateX(-50%);background:#0c0c18;color:#e8e8f0;padding:6px 16px;border-radius:20px;font-size:11px;z-index:99999;opacity:0;transition:opacity .2s;pointer-events:none;border:1px solid var(--dt-border)}
    #dt-toast.show{opacity:1}
  `;
  document.head.appendChild(style);

  const root=document.createElement('div');root.id='dt-root';

  const TOOL_LIST=[
    {id:'select',    icon:'↖', tip:'Select (V)'},
    {id:'translate', icon:'✥', tip:'Move (G)'},
    {id:'rotate',    icon:'↻', tip:'Rotate (R)'},
    {id:'scale',     icon:'⊞', tip:'Scale (S)'},
    null,
    {id:'wall',      icon:'█', tip:'Draw Wall (W)'},
    {id:'road',      icon:'🛣', tip:'Draw Road (D)'},
    {id:'divider',   icon:'🟩', tip:'Draw Divider (I)'},
    {id:'add',       icon:'＋', tip:'Add Object (A)'},
  ];

  const toolbarHTML=TOOL_LIST.map(t=>t===null?`<div class="dt-tb-sep"></div>`
    :`<button class="dt-tool-btn${t.id===STATE.tool?' active':''}" data-tool="${t.id}">${t.icon}<span class="dt-tt">${t.tip}</span></button>`
  ).join('');

  // Library
  const groups={};
  for(const[k,def]of Object.entries(OBJ_DEFS))(groups[def.group]=groups[def.group]||[]).push({k,def});
  const libHTML=Object.entries(groups).map(([gn,items])=>`<div class="dt-lib-group-label">${gn}</div>${items.map(({k,def})=>`<div class="dt-lib-item" data-libtype="${k}">${def.icon} ${def.label}</div>`).join('')}`).join('');
  const palHTML=Object.entries(groups).map(([,items],gi,arr)=>items.map(({k,def})=>`<div class="dt-palette-item" data-paltype="${k}">${def.icon} ${def.label}</div>`).join('')+(gi<arr.length-1?`<div class="dt-pal-sep"></div>`:'')).join('');

  root.innerHTML=`
    <div id="dt-toolbar">${toolbarHTML}</div>
    <div id="dt-right">
      <div class="dt-panel-hdr">⚙ Properties</div>
      <div id="dt-props-body"><div class="dt-empty">Nothing selected<br><span>Click, or draw Road/Divider/Wall</span></div></div>
      <div id="dt-align-panel" style="display:none">
        <div class="dt-panel-hdr" style="background:transparent;border:none;padding:0 0 5px">⬡ Align &amp; Distribute</div>
        <div class="dt-align-row">
          <button class="dt-btn" onclick="window._dt.align.minX()">←X</button><button class="dt-btn" onclick="window._dt.align.centerX()">·X</button><button class="dt-btn" onclick="window._dt.align.maxX()">X→</button><button class="dt-btn" onclick="window._dt.align.groundY()">⬇Y0</button>
        </div>
        <div class="dt-align-row">
          <button class="dt-btn" onclick="window._dt.align.minZ()">←Z</button><button class="dt-btn" onclick="window._dt.align.centerZ()">·Z</button><button class="dt-btn" onclick="window._dt.align.maxZ()">Z→</button>
        </div>
        <div class="dt-align-row">
          <button class="dt-btn dt-btn-accent" onclick="window._dt.align.distributeX()">↔ Dist X</button>
          <button class="dt-btn dt-btn-accent" onclick="window._dt.align.distributeZ()">↔ Dist Z</button>
        </div>
      </div>
      <div id="dt-hierarchy">
        <div class="dt-panel-hdr">🗂 Hierarchy <span style="float:right;opacity:.35;font-size:8px;font-weight:400">Ctrl+click multi</span></div>
        <div id="dt-hierarchy-list"><div class="dt-hier-empty">Scene is empty</div></div>
      </div>
      <div class="dt-panel-hdr" id="dt-lib-toggle" style="cursor:pointer">📦 Object Library ▾</div>
      <div id="dt-lib-body">${libHTML}</div>
      <div id="dt-file-ctrl">
        <div id="dt-file-status"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:4px">
          <button class="dt-btn" id="dt-link-btn">📎 Link .js</button>
          <button class="dt-btn" id="dt-save-file-btn">💾 Save</button>
        </div>
        <button class="dt-btn" id="dt-copy-btn" style="width:100%">📋 Copy Code</button>
      </div>
    </div>

    <div id="dt-bottom" class="dt-collapsed">
      <div id="dt-bottom-hdr">
        <span>{ } Generated Code</span>
        <div class="dt-code-btns">
          <button class="dt-btn" style="padding:2px 8px;font-size:9px" onclick="navigator.clipboard.writeText(window._dt.getCode())">📋 Copy</button>
          <span id="dt-bottom-toggle" style="font-size:10px;color:#555">▲</span>
        </div>
      </div>
      <pre id="dt-code-text">// Place or draw objects to generate code</pre>
    </div>

    <div id="dt-statusbar">
      <span id="dt-sb-tool">SELECT ↖</span>
      <span id="dt-sb-cursor" style="color:#555">X:0  Z:0</span>
      <span id="dt-sb-objects" style="color:#555">Objects: 0</span>
      <span id="dt-sb-snap" style="color:#555">Snap:0.5</span>
      <span id="dt-sb-space" style="color:#555">🌐 World</span>
      <span style="margin-left:auto;opacity:.35;font-size:9px">V G R S  W=Wall D=Road I=Divider A=Add · Tab:Snap L:Space G:Grid H:Hide F:Focus Ctrl+Z/Y Ctrl+D Del</span>
    </div>

    <div id="dt-wall-hud">📏 0.00 u</div>
    <div id="dt-draw-hint">Dbl-click to start · Dbl-click again to finish · Shift = straight · Esc = cancel</div>
    <div id="dt-add-palette">${palHTML}</div>
    <div id="dt-toast"></div>
  `;
  document.body.appendChild(root);

  // Toolbar
  root.querySelectorAll('.dt-tool-btn[data-tool]').forEach(btn=>btn.addEventListener('click',()=>setTool(btn.dataset.tool)));

  // Draw mode hint strip
  const hint=document.getElementById('dt-draw-hint');
  function _syncHint() {
    if(['wall','road','divider'].includes(STATE.tool)){hint.style.display='block';}else{hint.style.display='none';}
  }
  setInterval(_syncHint, 200);

  // Library toggle
  const lb=document.getElementById('dt-lib-body');
  document.getElementById('dt-lib-toggle').addEventListener('click',()=>{
    const open=lb.style.display!=='none';lb.style.display=open?'none':'block';
    document.getElementById('dt-lib-toggle').textContent=`📦 Object Library ${open?'▸':'▾'}`;
  });
  root.querySelectorAll('.dt-lib-item').forEach(el=>{
    el.addEventListener('click',()=>{STATE.pendingType=el.dataset.libtype;root.querySelectorAll('.dt-lib-item').forEach(x=>x.classList.remove('active'));el.classList.add('active');setTool('add');toast(`Click ground to place ${OBJ_DEFS[el.dataset.libtype]?.label}`);});
  });
  root.querySelectorAll('.dt-palette-item').forEach(el=>{
    el.addEventListener('click',()=>{STATE.pendingType=el.dataset.paltype;root.querySelectorAll('.dt-palette-item').forEach(x=>x.classList.remove('active'));el.classList.add('active');toast(`Click ground to place ${OBJ_DEFS[el.dataset.paltype]?.label}`);});
  });

  // Code panel toggle
  document.getElementById('dt-bottom-hdr').addEventListener('click',e=>{
    if(e.target.tagName==='BUTTON')return;
    const p=document.getElementById('dt-bottom'),cl=p.classList.contains('dt-collapsed');
    p.classList.toggle('dt-collapsed',!cl);p.classList.toggle('dt-expanded',cl);
    document.getElementById('dt-bottom-toggle').textContent=cl?'▼':'▲';
  });

  // File
  document.getElementById('dt-link-btn').addEventListener('click',_linkFile);
  document.getElementById('dt-save-file-btn').addEventListener('click',_saveToFile);
  document.getElementById('dt-copy-btn').addEventListener('click',()=>{navigator.clipboard.writeText(_generateCode());toast('📋 Copied!');});
}


// ═══════════════════════════════════════════════════════════════════════
// §20  ANIMATE HOOK
// ═══════════════════════════════════════════════════════════════════════

export function updateDevTool() {
  if(STATE.selected.length===1&&TC.dragging){_selBox.setFromObject(STATE.selected[0]);_renderProps();}
}


// ═══════════════════════════════════════════════════════════════════════
// §21  INIT
// ═══════════════════════════════════════════════════════════════════════

export function initDevTool() {
  _buildUI();
  const cv=renderer.domElement;
  cv.addEventListener('mousemove',_onMove);
  cv.addEventListener('click',_onClick);
  cv.addEventListener('dblclick',_onDblClick);
  window.addEventListener('keydown',_onKey);
  window.addEventListener('pointerup',_onPtrUp);
  _grid.visible=STATE.showGrid;

  console.log(
    '%c🛠️ DevTool v3.2\n'+
    'V:Select G:Move R:Rotate S:Scale\n'+
    'W:Wall  D:Road  I:Divider  A:Add\n'+
    '(All draw tools: Dbl-click start → Dbl-click finish | Shift=straight | Esc=cancel)\n'+
    'Tab:Snap L:Space G:Grid H:Hide F:Focus Ctrl+Z/Y Ctrl+D Del\n'+
    'Camera fix: add  if(!window._dtCanOrbit())return;  to interaction.js',
    'color:#4d9eff;font-size:13px;font-weight:bold;'
  );
  toast('🛠️ DevTool v3.2 · W=Wall D=Road I=Divider A=Add');
}