/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  devtool.js v4  —  Minecraft Creative Mode Style                    ║
 * ║──────────────────────────────────────────────────────────────────────║
 * ║  E         → Open / Close Inventory                                  ║
 * ║  1–9       → Select hotbar slot                                      ║
 * ║  Click     → Place / Select object                                   ║
 * ║  W/D/R/S   → Draw Wall / Road / Divider / Scale tool                 ║
 * ║  G/T/Y     → Move / Rotate / …                                       ║
 * ║  Ctrl+Z/Y  → Undo / Redo                                             ║
 * ║  Ctrl+D    → Clone   Del → Delete   F → Focus   Tab → Snap           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * SETUP in main.js:
 *   import { initDevTool, updateDevTool } from './devtool.js';
 *   // in animate(): updateDevTool();
 *   initDevTool();
 *
 * CAMERA FIX — interaction.js orbit handlers TOP pe yeh add karo:
 *   import { isPlayerActive } from './player.js';
 *   // pointerdown / mousemove / wheel handlers mein:
 *   if (isPlayerActive() || !window._dtCanOrbit()) return;
 */

import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { scene, camera, renderer, controls } from './scene.js';
import { mkWall }          from './utils/wall.js';
import { mkCampusRoad }    from './utils/roads.js';
import { mkCampusDivider } from './utils/roads.js';
import { buildObjDefs }    from './objects-registry.js';
import { isPlayerActive }  from './player.js';

const OBJ_DEFS = buildObjDefs();

// ══════════════════════════════════════════════════════════════════════════════
// §1  HOTBAR DEFINITION  (9 slots — fixed tools + draw tools)
// ══════════════════════════════════════════════════════════════════════════════

const HOTBAR_SLOTS = [
  { id: 'select',    icon: '↖', label: 'Select',   color: '#4d9eff', type: 'tool' },
  { id: 'translate', icon: '✥', label: 'Move',     color: '#4d9eff', type: 'tool' },
  { id: 'rotate',    icon: '↻', label: 'Rotate',   color: '#ff9f43', type: 'tool' },
  { id: 'scale',     icon: '⊞', label: 'Scale',    color: '#ff9f43', type: 'tool' },
  { id: 'wall',      icon: '█', label: 'Wall',     color: '#c8c8c8', type: 'draw' },
  { id: 'road',      icon: '🛣', label: 'Road',     color: '#6aab28', type: 'draw' },
  { id: 'divider',   icon: '🟩', label: 'Divider', color: '#6aab28', type: 'draw' },
  { id: null,        icon: '',  label: '',          color: '',        type: 'empty' },
  { id: null,        icon: '',  label: '',          color: '',        type: 'empty' },
];

// ══════════════════════════════════════════════════════════════════════════════
// §2  STATE
// ══════════════════════════════════════════════════════════════════════════════

const STATE = {
  tool:           'select',
  activeSlot:     0,          // 0-8 hotbar slot
  objects:        [],
  selected:       [],
  undoStack:      [],
  redoStack:      [],
  snapSize:       0.5,
  drawStart:      null,
  drawMode:       null,
  pendingType:    null,       // object type to place on click
  fileHandle:     null,
  isDraggingTC:   false,
  transformSpace: 'world',
  showGrid:       true,
  inventoryOpen:  false,
  invTab:         null,       // active inventory tab (group name)
  _uid:           0,
};

// Camera lock API — interaction.js mein add karo: if (!window._dtCanOrbit()) return;
window._dtCanOrbit = () => !STATE.isDraggingTC && !isPlayerActive();

const DRAW_TOOLS  = ['wall', 'road', 'divider'];
const DRAW_HEX    = { wall: 0x4d9eff, road: 0x6aab28, divider: 0xd4a017 };

// ══════════════════════════════════════════════════════════════════════════════
// §3  HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const _ray   = new THREE.Raycaster();
const _mouse = new THREE.Vector2();
const _gnd   = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _iPt   = new THREE.Vector3();

function _gndPt(e) {
  camera.updateMatrixWorld(true);
  const r = renderer.domElement.getBoundingClientRect();
  _mouse.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
  _mouse.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
  _ray.setFromCamera(_mouse, camera);
  return _ray.ray.intersectPlane(_gnd, _iPt) ? _iPt.clone() : new THREE.Vector3();
}

function snap(v) { return Math.round(v / STATE.snapSize) * STATE.snapSize; }
function fmt(n)  { return +parseFloat(n).toFixed(2); }
function uid()   { return `o${++STATE._uid}_${Date.now()}`; }

// ══════════════════════════════════════════════════════════════════════════════
// §4  GRID
// ══════════════════════════════════════════════════════════════════════════════

const _grid = new THREE.GridHelper(400, 200, 0x444455, 0x252535);
_grid.material.opacity = 0.25; _grid.material.transparent = true;
scene.add(_grid);

// ══════════════════════════════════════════════════════════════════════════════
// §5  TRANSFORM CONTROLS + CAMERA LOCK
// ══════════════════════════════════════════════════════════════════════════════

const TC = new TransformControls(camera, renderer.domElement);
TC.setSize(0.85);
TC.setSpace(STATE.transformSpace);

TC.addEventListener('dragging-changed', e => {
  STATE.isDraggingTC = e.value;
  if (controls) controls.enabled = !e.value;
  _blocker(e.value);
});
TC.addEventListener('objectChange', () => {
  _refreshSel(); _renderProps(); _schedSave(); _updateHierList();
});
scene.add(TC);

// Capture-phase killer — stops orbit events reaching interaction.js while TC active
function _tcKill(e) { if (STATE.isDraggingTC) e.stopImmediatePropagation(); }
for (const ev of ['mousemove','mousedown','pointermove','pointerdown']) {
  renderer.domElement.addEventListener(ev, _tcKill, true);
  window.addEventListener(ev, _tcKill, true);
}

let _blk = null;
function _blocker(on) {
  if (on && !_blk) {
    _blk = document.createElement('div');
    _blk.style.cssText = 'position:fixed;inset:0;z-index:8000;cursor:grabbing;';
    document.body.appendChild(_blk);
  } else if (!on && _blk) { _blk.remove(); _blk = null; }
}

window.addEventListener('pointerup', () => {
  if (!TC.dragging) {
    STATE.isDraggingTC = false;
    if (controls) controls.enabled = true;
    _blocker(false);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// §6  SELECTION
// ══════════════════════════════════════════════════════════════════════════════

const _selBox = new THREE.BoxHelper(new THREE.Mesh(), 0x4d9eff);
_selBox.visible = false;
scene.add(_selBox);

function _refreshSel() {
  if (!STATE.selected.length) { _selBox.visible = false; return; }
  if (STATE.selected.length === 1) {
    _selBox.setFromObject(STATE.selected[0]);
  } else {
    const b = new THREE.Box3();
    STATE.selected.forEach(m => b.expandByObject(m));
    const t = new THREE.Mesh(new THREE.BoxGeometry());
    b.getCenter(t.position); b.getSize(t.scale);
    _selBox.setFromObject(t);
  }
  _selBox.visible = true;
}

function selObj(mesh, additive = false) {
  if (!additive) { STATE.selected = []; TC.detach(); }
  if (mesh) {
    let r = mesh;
    while (r.parent && !STATE.objects.find(e => e.mesh === r)) r = r.parent;
    if (!STATE.selected.includes(r)) STATE.selected.push(r);
    if (STATE.selected.length === 1) TC.attach(STATE.selected[0]); else TC.detach();
  }
  _refreshSel(); _renderProps(); _updateHierList();
}

function clrSel() {
  STATE.selected = []; TC.detach(); _selBox.visible = false;
  _renderProps(); _updateHierList();
}

// ══════════════════════════════════════════════════════════════════════════════
// §7  OBJECT REGISTRY
// ══════════════════════════════════════════════════════════════════════════════

function reg(mesh, type, params = {}, label = null) {
  const e = { mesh, type, params, id: uid(),
              label: label || OBJ_DEFS[type]?.label || type, hidden: false };
  STATE.objects.push(e);
  _updateCode(); _updateSB(); _updateHierList();
  return e;
}

function unreg(mesh) {
  const i = STATE.objects.findIndex(e => e.mesh === mesh);
  if (i > -1) STATE.objects.splice(i, 1);
  scene.remove(mesh);
  _updateCode(); _updateSB(); _updateHierList();
}

function spawnObj(type, x, z) {
  const def = OBJ_DEFS[type]; if (!def) return null;
  const m = def.spawn(fmt(x), fmt(z));
  reg(m, type, { sx: fmt(x), sz: fmt(z) });
  return m;
}

// ══════════════════════════════════════════════════════════════════════════════
// §8  DRAW TOOL  (wall / road / divider)
// ══════════════════════════════════════════════════════════════════════════════

let _drawLine = null, _drawMarker = null;

function _drawStart(mode, pt) {
  STATE.drawMode  = mode;
  STATE.drawStart = pt.clone();
  const col = DRAW_HEX[mode];
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  _drawLine   = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: col }));
  _drawMarker = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: col }));
  _drawMarker.position.set(pt.x, 0.5, pt.z);
  scene.add(_drawLine); scene.add(_drawMarker);
  _setHUD(`${mode === 'wall' ? '█' : mode === 'road' ? '🛣' : '🟩'} Dbl-click to finish · Shift=straight`);
}

function _drawUpdate(end) {
  if (!_drawLine || !STATE.drawStart) return;
  const pos = _drawLine.geometry.attributes.position;
  pos.setXYZ(0, STATE.drawStart.x, 0.3, STATE.drawStart.z);
  pos.setXYZ(1, end.x, 0.3, end.z); pos.needsUpdate = true;
  const dx = end.x - STATE.drawStart.x, dz = end.z - STATE.drawStart.z;
  _setHUD(`📏 ${Math.sqrt(dx * dx + dz * dz).toFixed(2)} u · Dbl-click to finish`);
}

function _drawClear() {
  if (_drawLine)   { scene.remove(_drawLine);   _drawLine   = null; }
  if (_drawMarker) { scene.remove(_drawMarker); _drawMarker = null; }
  STATE.drawStart = null; STATE.drawMode = null; _setHUD('');
}

function _drawFinish(end) {
  const { x: sx, z: sz } = STATE.drawStart, { x: ex, z: ez } = end;
  const len = fmt(Math.sqrt((ex-sx)**2 + (ez-sz)**2));
  _pushUndo();
  let mesh, label, type;
  if (STATE.drawMode === 'wall') {
    mesh = mkWall(sx, sz, ex, ez); type = 'wall';
    label = `Wall ${STATE.objects.filter(o => o.type === 'wall').length + 1}`;
    toast('✅ Wall placed  ' + len + ' u');
  } else if (STATE.drawMode === 'road') {
    mesh = mkCampusRoad(sx, sz, ex, ez); type = '_road';
    label = `Road ${STATE.objects.filter(o => o.type === '_road').length + 1}`;
    toast('✅ Road placed  ' + len + ' u');
  } else {
    mesh = mkCampusDivider(sx, sz, ex, ez); type = '_divider';
    label = `Divider ${STATE.objects.filter(o => o.type === '_divider').length + 1}`;
    toast('✅ Divider placed  ' + len + ' u');
  }
  reg(mesh, type, { sx, sz, ex, ez, length: len }, label);
  _drawClear();
  if (mesh) selObj(mesh);
}

// ══════════════════════════════════════════════════════════════════════════════
// §9  UNDO / REDO
// ══════════════════════════════════════════════════════════════════════════════

function _snapState() {
  return STATE.objects.map(({ id, type, params, label, hidden, mesh }) => ({
    id, type, params: { ...params }, label, hidden,
    pos:   [...mesh.position.toArray()],
    rot:   [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
    scale: [...mesh.scale.toArray()],
  }));
}

function _pushUndo() {
  STATE.undoStack.push(_snapState());
  if (STATE.undoStack.length > 60) STATE.undoStack.shift();
  STATE.redoStack = [];
}

function undo() {
  if (!STATE.undoStack.length) return;
  STATE.redoStack.push(_snapState()); _restoreSnap(STATE.undoStack.pop()); toast('↩ Undo');
}

function redo() {
  if (!STATE.redoStack.length) return;
  STATE.undoStack.push(_snapState()); _restoreSnap(STATE.redoStack.pop()); toast('↪ Redo');
}

function _restoreSnap(snap) {
  const ids = new Set(snap.map(s => s.id));
  [...STATE.objects].forEach(e => { if (!ids.has(e.id)) unreg(e.mesh); });
  snap.forEach(s => {
    let e = STATE.objects.find(o => o.id === s.id);
    if (e) {
      e.mesh.position.fromArray(s.pos); e.mesh.rotation.set(...s.rot); e.mesh.scale.fromArray(s.scale);
      e.mesh.visible = !s.hidden; e.hidden = s.hidden; e.label = s.label;
    } else {
      let mesh = null;
      if (s.type === 'wall')     mesh = mkWall(s.params.sx, s.params.sz, s.params.ex, s.params.ez);
      else if (s.type === '_road')    mesh = mkCampusRoad(s.params.sx, s.params.sz, s.params.ex, s.params.ez);
      else if (s.type === '_divider') mesh = mkCampusDivider(s.params.sx, s.params.sz, s.params.ex, s.params.ez);
      else { const def = OBJ_DEFS[s.type]; if (def) mesh = def.spawn(s.params.sx, s.params.sz); }
      if (mesh) {
        mesh.position.fromArray(s.pos); mesh.rotation.set(...s.rot); mesh.scale.fromArray(s.scale);
        const ne = reg(mesh, s.type, s.params, s.label); ne.id = s.id;
        if (s.hidden) { mesh.visible = false; ne.hidden = true; }
      }
    }
  });
  clrSel(); _updateCode(); _updateHierList(); _updateSB();
}

// ══════════════════════════════════════════════════════════════════════════════
// §10  ALIGN
// ══════════════════════════════════════════════════════════════════════════════

const ALIGN = {
  minX:()=>_aa('x','min'),  maxX:()=>_aa('x','max'),  centerX:()=>_aa('x','center'),
  minZ:()=>_aa('z','min'),  maxZ:()=>_aa('z','max'),  centerZ:()=>_aa('z','center'),
  groundY() { if (!STATE.selected.length) return; _pushUndo(); STATE.selected.forEach(m => m.position.y = 0); _schedSave(); toast('⬇ Y=0'); },
  distributeX: () => _dist('x'), distributeZ: () => _dist('z'),
};

function _aa(ax, mo) {
  if (STATE.selected.length < 2) { toast('⚠ Select 2+ objects'); return; }
  _pushUndo();
  const vs = STATE.selected.map(m => m.position[ax]);
  const t = mo === 'min' ? Math.min(...vs) : mo === 'max' ? Math.max(...vs) : (Math.min(...vs)+Math.max(...vs))/2;
  STATE.selected.forEach(m => m.position[ax] = t);
  _updateCode(); toast(`Aligned ${ax.toUpperCase()}`);
}

function _dist(ax) {
  if (STATE.selected.length < 3) { toast('⚠ Select 3+ objects'); return; }
  _pushUndo();
  const s = [...STATE.selected].sort((a, b) => a.position[ax] - b.position[ax]);
  const f = s[0].position[ax], l = s[s.length-1].position[ax];
  s.forEach((m, i) => m.position[ax] = f + ((l-f)/(s.length-1))*i);
  _updateCode(); toast(`Distributed ${ax.toUpperCase()}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// §11  CODE GENERATION
// ══════════════════════════════════════════════════════════════════════════════

const BS = '// ── DevTool: Generated Objects START ──';
const BE = '// ── DevTool: Generated Objects END ──';

function _generateCode() {
  const lines = [BS];
  for (const { mesh, type, params } of STATE.objects) {
    const p = { x:fmt(mesh.position.x), y:fmt(mesh.position.y), z:fmt(mesh.position.z) };
    if      (type === 'wall')     lines.push(`mkWall(${params.sx},${params.sz},${params.ex},${params.ez});`);
    else if (type === '_road')    lines.push(`mkCampusRoad(${params.sx},${params.sz},${params.ex},${params.ez});`);
    else if (type === '_divider') lines.push(`mkCampusDivider(${params.sx},${params.sz},${params.ex},${params.ez});`);
    else { const def = OBJ_DEFS[type]; if (def) lines.push(def.code(p, mesh.rotation, mesh.scale)); }
  }
  lines.push(BE);
  return lines.join('\n');
}

function _updateCode() {
  const el = document.getElementById('mc-code-pre');
  if (el) el.textContent = _generateCode();
  _schedSave();
}

// ══════════════════════════════════════════════════════════════════════════════
// §12  PERSISTENCE
// ══════════════════════════════════════════════════════════════════════════════

const LS_KEY = 'devtool_v4_scene';
let _saveT = null;
function _schedSave() {
  clearTimeout(_saveT);
  _saveT = setTimeout(() => {
    const data = STATE.objects.map(({ type, params, mesh, label, hidden }) => ({
      type, params, label, hidden,
      pos:   mesh.position.toArray(),
      rot:   [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
      scale: mesh.scale.toArray(),
    }));
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    _flashStatus('💾 Saved');
  }, 800);
}

async function _linkFile() {
  if (!window.showOpenFilePicker) { toast('❌ Chrome/Edge needed'); return; }
  try {
    [STATE.fileHandle] = await window.showOpenFilePicker({ types: [{ description: 'JS', accept: { 'text/javascript': ['.js'] } }] });
    document.getElementById('mc-link-btn').textContent = `📎 ${STATE.fileHandle.name}`;
    toast('✅ Linked: ' + STATE.fileHandle.name);
  } catch {}
}

async function _saveToFile() {
  if (!STATE.fileHandle) { toast('⚠ Link a .js file first'); return; }
  try {
    const f = await STATE.fileHandle.getFile(); let c = await f.text();
    const nb = _generateCode();
    const eS = BS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const eE = BE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pat = new RegExp(`${eS}[\\s\\S]*?${eE}`, 'g');
    c = c.match(pat) ? c.replace(pat, nb) : c + '\n\n' + nb + '\n';
    const w = await STATE.fileHandle.createWritable(); await w.write(c); await w.close();
    _flashStatus('✅ Saved to file'); toast('✅ Saved!');
  } catch (err) { toast('❌ ' + err.message); }
}

function _flashStatus(msg) {
  const el = document.getElementById('mc-status-msg');
  if (el) { el.textContent = msg; setTimeout(() => el.textContent = '', 3000); }
}

// ══════════════════════════════════════════════════════════════════════════════
// §13  TOOL / SLOT SWITCHING
// ══════════════════════════════════════════════════════════════════════════════

function setSlot(idx) {
  STATE.activeSlot = idx;
  const slot = HOTBAR_SLOTS[idx];

  // Update hotbar visual
  document.querySelectorAll('.mc-hb-slot').forEach((el, i) => {
    el.classList.toggle('mc-hb-selected', i === idx);
  });

  if (!slot || slot.type === 'empty') {
    // Empty slot — if we have a pending type from inventory, keep it
    if (!STATE.pendingType) setTool('select');
    return;
  }

  if (slot.type === 'tool' || slot.type === 'draw') {
    STATE.pendingType = null;
    setTool(slot.id);
  }
}

function setTool(tool) {
  STATE.tool = tool;

  // Update toolbar buttons
  document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('mc-active', b.dataset.tool === tool));

  if      (tool === 'translate') { TC.setMode('translate'); if (STATE.selected.length) TC.attach(STATE.selected[0]); }
  else if (tool === 'rotate')    { TC.setMode('rotate');    if (STATE.selected.length) TC.attach(STATE.selected[0]); }
  else if (tool === 'scale')     { TC.setMode('scale');     if (STATE.selected.length) TC.attach(STATE.selected[0]); }
  else if (tool === 'select')    { TC.setMode('translate'); if (!STATE.selected.length) TC.detach(); }
  else                           { TC.detach(); }

  if (!DRAW_TOOLS.includes(tool) && STATE.drawStart) _drawClear();
  if (!DRAW_TOOLS.includes(tool)) _setHUD('');
  _updateSB();
}

// ══════════════════════════════════════════════════════════════════════════════
// §14  INVENTORY
// ══════════════════════════════════════════════════════════════════════════════

function openInventory() {
  STATE.inventoryOpen = true;
  const inv = document.getElementById('mc-inventory');
  if (inv) { inv.classList.add('mc-inv-open'); inv.classList.remove('mc-inv-closed'); }
  // Focus first tab if none selected
  if (!STATE.invTab) {
    const firstTab = document.querySelector('.mc-tab');
    if (firstTab) { STATE.invTab = firstTab.dataset.group; _renderInvGrid(); _updateTabs(); }
  }
}

function closeInventory() {
  STATE.inventoryOpen = false;
  const inv = document.getElementById('mc-inventory');
  if (inv) { inv.classList.remove('mc-inv-open'); inv.classList.add('mc-inv-closed'); }
}

function toggleInventory() {
  STATE.inventoryOpen ? closeInventory() : openInventory();
}

function _renderInvGrid() {
  const grid = document.getElementById('mc-inv-grid'); if (!grid) return;
  const group = STATE.invTab;
  const items = Object.entries(OBJ_DEFS).filter(([, def]) => def.group === group);
  grid.innerHTML = items.map(([key, def]) => `
    <div class="mc-inv-item" data-key="${key}" title="${def.label}">
      <div class="mc-inv-icon">${def.icon || '⬛'}</div>
      <div class="mc-inv-name">${def.label}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.mc-inv-item').forEach(el => {
    el.addEventListener('click', () => {
      const key = el.dataset.key;
      STATE.pendingType = key;
      // Put in last hotbar slot as "held item"
      HOTBAR_SLOTS[7] = { id: key, icon: OBJ_DEFS[key]?.icon || '⬛', label: OBJ_DEFS[key]?.label || key, color: '#fff', type: 'place' };
      _rebuildHotbar();
      setSlot(7);
      setTool('add');
      closeInventory();
      toast(`🖐 Holding: ${OBJ_DEFS[key]?.label}  — Click ground to place`);
    });
  });
}

function _updateTabs() {
  document.querySelectorAll('.mc-tab').forEach(t => t.classList.toggle('mc-tab-active', t.dataset.group === STATE.invTab));
}

// ══════════════════════════════════════════════════════════════════════════════
// §15  STATUS BAR & HUD
// ══════════════════════════════════════════════════════════════════════════════

function _updateSB() {
  const tool = document.getElementById('mc-sb-tool');
  if (tool) {
    const names = { select:'SELECT ↖', translate:'MOVE ✥', rotate:'ROTATE ↻', scale:'SCALE ⊞', wall:'WALL █', road:'ROAD 🛣', divider:'DIVIDER 🟩', add:'PLACE' };
    tool.textContent = names[STATE.tool] || STATE.tool.toUpperCase();
  }
  const objs = document.getElementById('mc-sb-objs'); if (objs) objs.textContent = `${STATE.objects.length} objects`;
  const snp  = document.getElementById('mc-sb-snap'); if (snp)  snp.textContent  = `Snap: ${STATE.snapSize}`;
  const sp   = document.getElementById('mc-sb-space'); if (sp)  sp.textContent   = STATE.transformSpace === 'world' ? '🌐 World' : '📦 Local';

  if (STATE.pendingType) {
    const held = document.getElementById('mc-held');
    if (held) held.textContent = `🖐 ${OBJ_DEFS[STATE.pendingType]?.label || STATE.pendingType}`;
  } else {
    const held = document.getElementById('mc-held'); if (held) held.textContent = '';
  }
}

function _updateCursor(x, z) {
  const el = document.getElementById('mc-sb-cursor'); if (el) el.textContent = `${fmt(x)}, ${fmt(z)}`;
}

function _setHUD(t) {
  const el = document.getElementById('mc-hud'); if (!el) return;
  el.textContent = t; el.style.display = t ? 'block' : 'none';
}

// ══════════════════════════════════════════════════════════════════════════════
// §16  PROPERTIES PANEL
// ══════════════════════════════════════════════════════════════════════════════

function _renderProps() {
  const panel = document.getElementById('mc-props');
  if (!panel) return;

  if (!STATE.selected.length) {
    panel.style.display = 'none'; return;
  }
  panel.style.display = 'block';

  const mesh = STATE.selected[0];
  const entry = STATE.objects.find(e => e.mesh === mesh);
  const p = mesh.position, r = mesh.rotation, s = mesh.scale;
  const bbox = new THREE.Box3().setFromObject(mesh), dim = new THREE.Vector3();
  bbox.getSize(dim);

  const DRAWN = ['wall','_road','_divider'];
  const icon  = DRAWN.includes(entry?.type) ? (entry.type==='wall'?'█':entry.type==='_road'?'🛣':'🟩') : OBJ_DEFS[entry?.type]?.icon||'⬛';
  const label = DRAWN.includes(entry?.type) ? (entry.type==='wall'?'Wall':entry.type==='_road'?'Road':'Divider') : OBJ_DEFS[entry?.type]?.label||entry?.type||'Object';

  panel.innerHTML = `
    <div class="mc-props-head">
      <span class="mc-props-icon">${icon}</span>
      <input class="mc-props-label" id="mc-prop-label" value="${entry?.label||''}" placeholder="Label">
      <button class="mc-props-close" onclick="document.getElementById('mc-props').style.display='none'">×</button>
    </div>
    <div class="mc-props-type">${label}${entry?.params?.length?' · '+entry.params.length+' u':''}</div>
    <div class="mc-prop-dim">
      <span>W ${fmt(dim.x)}</span><span>H ${fmt(dim.y)}</span><span>D ${fmt(dim.z)}</span>
    </div>
    ${_mkXYZ('pos',fmt(p.x),fmt(p.y),fmt(p.z),'Position')}
    ${_mkXYZ('rot',fmt(THREE.MathUtils.radToDeg(r.x)),fmt(THREE.MathUtils.radToDeg(r.y)),fmt(THREE.MathUtils.radToDeg(r.z)),'Rotation °')}
    ${_mkXYZ('scale',fmt(s.x),fmt(s.y),fmt(s.z),'Scale')}
    ${STATE.selected.length >= 2 ? `
    <div class="mc-props-section-head">Align</div>
    <div class="mc-align-row">
      <button onclick="window._dt.align.minX()">←X</button>
      <button onclick="window._dt.align.centerX()">·X</button>
      <button onclick="window._dt.align.maxX()">X→</button>
      <button onclick="window._dt.align.minZ()">←Z</button>
      <button onclick="window._dt.align.centerZ()">·Z</button>
      <button onclick="window._dt.align.maxZ()">Z→</button>
      <button onclick="window._dt.align.groundY()">⬇Y0</button>
      <button onclick="window._dt.align.distributeX()">↔X</button>
      <button onclick="window._dt.align.distributeZ()">↔Z</button>
    </div>` : ''}
    <div class="mc-action-row">
      <button onclick="window._dt.duplicate()">⧉ Clone</button>
      <button onclick="window._dt.toggleHide()">👁</button>
      <button onclick="window._dt.focusSelected()">🎯</button>
      <button class="mc-delete" onclick="window._dt.deleteSelected()">🗑</button>
    </div>
  `;

  document.getElementById('mc-prop-label')?.addEventListener('change', e => {
    if (entry) { entry.label = e.target.value; _updateHierList(); }
  });

  panel.querySelectorAll('.mc-xyz-inp').forEach(inp => {
    inp.addEventListener('change', () => {
      const val = parseFloat(inp.value); if (isNaN(val)) return;
      const { prop, axis } = inp.dataset;
      _pushUndo();
      STATE.selected.forEach(m => {
        if (prop==='pos') m.position[axis] = val;
        if (prop==='rot') m.rotation[axis] = THREE.MathUtils.degToRad(val);
        if (prop==='scale') m.scale[axis] = val;
      });
      _refreshSel(); _updateCode();
    });
  });
}

function _mkXYZ(prop, x, y, z, lbl) {
  return `<div class="mc-xyz">
    <div class="mc-xyz-lbl">${lbl}</div>
    <div class="mc-xyz-row">
      ${['x','y','z'].map((a,i)=>`<label><span class="mc-ax-${a}">${a.toUpperCase()}</span><input class="mc-xyz-inp" data-prop="${prop}" data-axis="${a}" type="number" value="${[x,y,z][i]}" step="${prop==='rot'?1:0.1}"></label>`).join('')}
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// §17  HIERARCHY LIST
// ══════════════════════════════════════════════════════════════════════════════

function _updateHierList() {
  const list = document.getElementById('mc-hier-list'); if (!list) return;
  if (!STATE.objects.length) { list.innerHTML = '<div class="mc-hier-empty">No objects in scene</div>'; return; }
  list.innerHTML = STATE.objects.map((entry, i) => {
    const isSel = STATE.selected.includes(entry.mesh);
    const DRAWN = ['wall','_road','_divider'];
    const icon = DRAWN.includes(entry.type) ? (entry.type==='wall'?'█':entry.type==='_road'?'🛣':'🟩') : OBJ_DEFS[entry.type]?.icon||'⬛';
    return `<div class="mc-hier-row${isSel?' mc-hier-sel':''}${entry.hidden?' mc-hier-hid':''}" data-idx="${i}">
      <span>${icon}</span>
      <span class="mc-hier-name">${entry.label}</span>
      <div class="mc-hier-acts">
        <button class="mc-hier-eye" data-idx="${i}">${entry.hidden?'🚫':'👁'}</button>
        <button class="mc-hier-del" data-idx="${i}">×</button>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.mc-hier-row').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('.mc-hier-acts')) return;
      const en = STATE.objects[+el.dataset.idx]; if (en) selObj(en.mesh, e.ctrlKey || e.metaKey);
    });
  });
  list.querySelectorAll('.mc-hier-eye').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); const en=STATE.objects[+btn.dataset.idx]; if(en){en.hidden=!en.hidden;en.mesh.visible=!en.hidden;_updateHierList();} });
  });
  list.querySelectorAll('.mc-hier-del').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); const en=STATE.objects[+btn.dataset.idx]; if(en){_pushUndo();STATE.selected=STATE.selected.filter(m=>m!==en.mesh);if(!STATE.selected.length)TC.detach();unreg(en.mesh);_renderProps();toast('🗑');} });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// §18  EVENTS
// ══════════════════════════════════════════════════════════════════════════════

function _onMove(e) {
  if (isPlayerActive() || STATE.isDraggingTC) return;
  const pt = _gndPt(e);
  _updateCursor(snap(pt.x), snap(pt.z));
  if (DRAW_TOOLS.includes(STATE.tool) && STATE.drawStart) {
    let ex = snap(pt.x), ez = snap(pt.z);
    if (e.shiftKey) { const dx=Math.abs(ex-STATE.drawStart.x),dz=Math.abs(ez-STATE.drawStart.z); dx>dz?ez=STATE.drawStart.z:ex=STATE.drawStart.x; }
    _drawUpdate(new THREE.Vector3(ex, 0, ez));
  }
  if (STATE.selected.length === 1 && !TC.dragging) _refreshSel();
}

function _onClick(e) {
  if (isPlayerActive() || STATE.inventoryOpen) return;
  if (e.detail > 1 || TC.dragging || STATE.isDraggingTC) return;

  // Close props if clicking outside
  const props = document.getElementById('mc-props');
  if (props && !props.contains(e.target) && !renderer.domElement.contains(e.target)) return;

  const tool = STATE.tool; const pt = _gndPt(e);

  if (['select','translate','rotate','scale'].includes(tool)) {
    camera.updateMatrixWorld(true);
    const rc = renderer.domElement.getBoundingClientRect();
    _mouse.x = ((e.clientX-rc.left)/rc.width)*2-1;
    _mouse.y = -((e.clientY-rc.top)/rc.height)*2+1;
    _ray.setFromCamera(_mouse, camera);
    const hits = _ray.intersectObjects(STATE.objects.map(o => o.mesh), true);
    if (hits.length) {
      let root = hits[0].object;
      while (root.parent && !STATE.objects.find(en => en.mesh === root)) root = root.parent;
      selObj(root, e.ctrlKey || e.metaKey);
      if (tool === 'select') setTool('translate');
    } else { clrSel(); }
  }

  if (tool === 'add' && STATE.pendingType) {
    _pushUndo();
    const m = spawnObj(STATE.pendingType, snap(pt.x), snap(pt.z));
    if (m) { selObj(m); toast(`✅ ${OBJ_DEFS[STATE.pendingType]?.label} placed`); }
  }
}

function _onDblClick(e) {
  if (isPlayerActive() || !DRAW_TOOLS.includes(STATE.tool)) return;
  const pt = _gndPt(e);
  let ex = snap(pt.x), ez = snap(pt.z);
  if (e.shiftKey && STATE.drawStart) {
    const dx=Math.abs(ex-STATE.drawStart.x),dz=Math.abs(ez-STATE.drawStart.z); dx>dz?ez=STATE.drawStart.z:ex=STATE.drawStart.x;
  }
  if (!STATE.drawStart) { _drawStart(STATE.tool, new THREE.Vector3(ex,0,ez)); }
  else                  { _drawFinish(new THREE.Vector3(ex,0,ez)); }
}

function _onKey(e) {
  if (isPlayerActive()) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const k = e.key.toLowerCase();

  // Inventory
  if (k === 'e' && !e.ctrlKey) { toggleInventory(); return; }
  if (k === 'escape') { if (STATE.inventoryOpen) { closeInventory(); return; } _drawClear(); clrSel(); STATE.pendingType=null; setTool('select'); return; }

  // Hotbar number keys
  if (!e.ctrlKey && k >= '1' && k <= '9') { setSlot(parseInt(k)-1); return; }

  // Undo/Redo/Clone
  if (e.ctrlKey && k==='z') { e.preventDefault(); undo(); return; }
  if (e.ctrlKey && k==='y') { e.preventDefault(); redo(); return; }
  if (e.ctrlKey && k==='d') { e.preventDefault(); window._dt.duplicate(); return; }

  // Delete
  if (k==='delete'||k==='backspace') { window._dt.deleteSelected(); return; }

  // Snap cycle
  if (k==='tab') { e.preventDefault(); const sz=[0.1,0.25,0.5,1.0,2.0]; STATE.snapSize=sz[(sz.indexOf(STATE.snapSize)+1)%sz.length]; toast(`Snap: ${STATE.snapSize}`); _updateSB(); return; }

  // Focus / Grid / Space
  if (k==='f') { window._dt.focusSelected(); return; }
  if (k==='g'&&!e.ctrlKey) { STATE.showGrid=!STATE.showGrid; _grid.visible=STATE.showGrid; toast(STATE.showGrid?'Grid ON':'Grid OFF'); return; }
  if (k==='l') { STATE.transformSpace=STATE.transformSpace==='world'?'local':'world'; TC.setSpace(STATE.transformSpace); _updateSB(); return; }
  if (k==='h') { window._dt.toggleHide(); return; }
  if (k===' ') { e.preventDefault(); TC.visible=!TC.visible; return; }

  // Axis lock
  if (['x','y','z'].includes(k)&&!e.ctrlKey) { TC.showX=k==='x'; TC.showY=k==='y'; TC.showZ=k==='z'; return; }
  if (k==='q') { TC.showX=true; TC.showY=true; TC.showZ=true; }
}

// ══════════════════════════════════════════════════════════════════════════════
// §19  GLOBAL API
// ══════════════════════════════════════════════════════════════════════════════

window._dt = {
  deleteSelected() {
    if (!STATE.selected.length) return; _pushUndo();
    STATE.selected.forEach(m => unreg(m)); STATE.selected=[]; TC.detach(); _selBox.visible=false;
    _renderProps(); toast('🗑 Deleted');
  },
  duplicate() {
    if (!STATE.selected.length) return;
    const mesh=STATE.selected[0], entry=STATE.objects.find(e=>e.mesh===mesh);
    if (!entry||['wall','_road','_divider'].includes(entry.type)){toast('⚠ Cannot clone draw objects');return;}
    _pushUndo();
    const m = spawnObj(entry.type, mesh.position.x+STATE.snapSize*2, mesh.position.z+STATE.snapSize*2);
    if (m) { m.rotation.copy(mesh.rotation); m.scale.copy(mesh.scale); selObj(m); toast('⧉ Cloned'); }
  },
  toggleHide() {
    if (!STATE.selected.length) return;
    STATE.selected.forEach(m=>{const e=STATE.objects.find(o=>o.mesh===m);if(e){e.hidden=!e.hidden;m.visible=!e.hidden;}});
    _updateHierList(); toast('👁 Toggled');
  },
  focusSelected() {
    if (!STATE.selected.length) return;
    const t=new THREE.Vector3(); STATE.selected.forEach(m=>t.add(m.position)); t.divideScalar(STATE.selected.length);
    if (controls){controls.target.copy(t);controls.update();} toast('🎯 Focused');
  },
  align: ALIGN, undo, redo,
  getCode: _generateCode, getState: ()=>STATE, getObjects: ()=>STATE.objects,
};

// ══════════════════════════════════════════════════════════════════════════════
// §20  TOAST
// ══════════════════════════════════════════════════════════════════════════════

let _toastT = null;
function toast(msg) {
  const el = document.getElementById('mc-toast'); if (!el) return;
  el.textContent = msg; el.classList.add('mc-toast-show');
  clearTimeout(_toastT); _toastT = setTimeout(()=>el.classList.remove('mc-toast-show'), 2400);
}

// ══════════════════════════════════════════════════════════════════════════════
// §21  HOTBAR REBUILD  (when inventory selection changes)
// ══════════════════════════════════════════════════════════════════════════════

function _rebuildHotbar() {
  const hb = document.getElementById('mc-hotbar'); if (!hb) return;
  hb.innerHTML = HOTBAR_SLOTS.map((slot, i) => {
    const key = i+1;
    const isEmpty = slot.type === 'empty';
    return `<div class="mc-hb-slot${i===STATE.activeSlot?' mc-hb-selected':''}" data-slot="${i}" title="${slot.label||''}">
      <span class="mc-hb-key">${key}</span>
      <span class="mc-hb-icon" style="${slot.color?'color:'+slot.color:''}">${slot.icon||''}</span>
      ${!isEmpty?`<span class="mc-hb-label">${slot.label}</span>`:''}
    </div>`;
  }).join('');
  hb.querySelectorAll('.mc-hb-slot').forEach(el => {
    el.addEventListener('click', () => setSlot(+el.dataset.slot));
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// §22  UI CONSTRUCTION
// ══════════════════════════════════════════════════════════════════════════════

function _buildUI() {

  // Build inventory groups from OBJ_DEFS
  const groups = {};
  for (const [k, def] of Object.entries(OBJ_DEFS))
    (groups[def.group] = groups[def.group] || []).push({ k, def });
  STATE.invTab = Object.keys(groups)[0] || null;

  const tabsHTML = Object.keys(groups).map(g =>
    `<button class="mc-tab${g===STATE.invTab?' mc-tab-active':''}" data-group="${g}">${g}</button>`
  ).join('');

  // CSS ──────────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');

    :root {
      --mc-bg:      #1a1a1a;
      --mc-panel:   #2d2416;
      --mc-slot:    #8b8b8b;
      --mc-slotdk:  #373737;
      --mc-slotlt:  #dbdbdb;
      --mc-accent:  #ffff55;
      --mc-green:   #55ff55;
      --mc-red:     #ff5555;
      --mc-blue:    #5588ff;
      --mc-text:    #e0e0e0;
      --mc-text2:   #aaaaaa;
      --mc-border:  #555;
      --mc-font:    'VT323', 'Courier New', monospace;
    }

    #mc-root * { box-sizing: border-box; margin: 0; }
    #mc-root { font-family: var(--mc-font); color: var(--mc-text); }

    /* ── HOTBAR ───────────────────────────────────── */
    #mc-hotbar {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      display: flex; gap: 3px; padding: 5px;
      background: rgba(0,0,0,0.72);
      border: 3px solid; border-color: var(--mc-slotlt) var(--mc-slotdk) var(--mc-slotdk) var(--mc-slotlt);
      box-shadow: inset -2px -2px 0 #000, inset 2px 2px 0 rgba(255,255,255,0.15);
      z-index: 9990; image-rendering: pixelated;
    }
    .mc-hb-slot {
      width: 54px; height: 54px;
      background: var(--mc-slot);
      border: 3px solid; border-color: var(--mc-slotlt) var(--mc-slotdk) var(--mc-slotdk) var(--mc-slotlt);
      box-shadow: inset -2px -2px 0 #333, inset 2px 2px 0 #ccc;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      cursor: pointer; position: relative; transition: background 0.05s;
      user-select: none;
    }
    .mc-hb-slot:hover { background: #9e9e9e; }
    .mc-hb-selected {
      border-color: var(--mc-accent) !important;
      box-shadow: 0 0 0 2px var(--mc-accent), inset -2px -2px 0 #333, inset 2px 2px 0 #ccc !important;
      background: #a0a060 !important;
    }
    .mc-hb-key {
      position: absolute; top: 2px; left: 4px; font-size: 11px; color: var(--mc-text2);
      font-family: var(--mc-font); line-height: 1;
    }
    .mc-hb-icon { font-size: 22px; line-height: 1; }
    .mc-hb-label { font-size: 9px; color: var(--mc-text2); margin-top: 1px; text-align: center; max-width: 50px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

    /* ── STATUS BAR ──────────────────────────────── */
    #mc-statusbar {
      position: fixed; bottom: 0; left: 0; right: 0; height: 22px;
      background: rgba(0,0,0,0.85);
      display: flex; align-items: center; gap: 16px; padding: 0 12px;
      font-family: var(--mc-font); font-size: 14px; color: var(--mc-text2);
      z-index: 9989; border-top: 1px solid #333;
    }
    #mc-sb-tool { color: var(--mc-accent); font-weight: bold; }
    #mc-held { color: var(--mc-green); }

    /* ── HUD (draw length) ───────────────────────── */
    #mc-hud {
      position: fixed; top: 36%; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.82); color: var(--mc-accent);
      padding: 6px 24px; font-family: var(--mc-font); font-size: 22px;
      border: 2px solid var(--mc-accent); border-radius: 2px;
      pointer-events: none; display: none; z-index: 9999; letter-spacing: 1px;
    }

    /* ── PROPERTIES PANEL ────────────────────────── */
    #mc-props {
      position: fixed; right: 12px; top: 50%; transform: translateY(-50%);
      width: 228px; background: rgba(18,14,8,0.95);
      border: 2px solid; border-color: var(--mc-slotlt) var(--mc-slotdk) var(--mc-slotdk) var(--mc-slotlt);
      box-shadow: 4px 4px 0 rgba(0,0,0,0.6); z-index: 9985; display: none;
      font-family: var(--mc-font);
    }
    .mc-props-head {
      display: flex; align-items: center; gap: 6px; padding: 6px 8px;
      background: var(--mc-panel); border-bottom: 1px solid #3a3020;
    }
    .mc-props-icon { font-size: 18px; }
    .mc-props-label {
      flex: 1; background: #1a1208; border: 1px solid #554; color: var(--mc-text);
      font-family: var(--mc-font); font-size: 14px; padding: 2px 6px; outline: none;
    }
    .mc-props-label:focus { border-color: var(--mc-accent); }
    .mc-props-close {
      background: none; border: none; color: var(--mc-text2); cursor: pointer;
      font-size: 18px; line-height: 1; padding: 0 4px;
    }
    .mc-props-close:hover { color: var(--mc-red); }
    .mc-props-type { padding: 3px 8px; font-size: 13px; color: var(--mc-text2); background: #1a1208; border-bottom: 1px solid #3a3020; }
    .mc-prop-dim {
      display: flex; gap: 4px; padding: 4px 8px; background: #111008; border-bottom: 1px solid #2a2010;
    }
    .mc-prop-dim span { flex: 1; text-align: center; font-size: 13px; color: var(--mc-text2); background: #1c1408; padding: 2px; }
    .mc-xyz { padding: 5px 8px; border-bottom: 1px solid #2a2010; }
    .mc-xyz-lbl { font-size: 11px; color: var(--mc-text2); margin-bottom: 3px; }
    .mc-xyz-row { display: flex; gap: 3px; }
    .mc-xyz-row label { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 1px; }
    .mc-xyz-row label > span { font-size: 11px; font-family: var(--mc-font); font-weight: bold; }
    .mc-ax-x { color: #ff6666; } .mc-ax-y { color: #66ff66; } .mc-ax-z { color: #6699ff; }
    .mc-xyz-inp {
      width: 100%; background: #1a1208; border: 1px solid #554; color: var(--mc-text);
      font-family: var(--mc-font); font-size: 13px; padding: 2px 3px; text-align: center; outline: none;
    }
    .mc-xyz-inp:focus { border-color: var(--mc-accent); }
    .mc-props-section-head { padding: 4px 8px; font-size: 11px; color: var(--mc-text2); background: #1a1208; border-bottom: 1px solid #2a2010; }
    .mc-align-row { display: flex; flex-wrap: wrap; gap: 3px; padding: 5px 8px; background: #111008; border-bottom: 1px solid #2a2010; }
    .mc-align-row button { background: #3a2e18; border: 1px solid #665; color: var(--mc-text); font-family: var(--mc-font); font-size: 12px; padding: 2px 6px; cursor: pointer; }
    .mc-align-row button:hover { background: #4a3e28; border-color: var(--mc-accent); }
    .mc-action-row { display: flex; gap: 3px; padding: 6px 8px; }
    .mc-action-row button { flex: 1; background: #3a2e18; border: 1px solid #665; color: var(--mc-text); font-family: var(--mc-font); font-size: 13px; padding: 4px 2px; cursor: pointer; }
    .mc-action-row button:hover { background: #4a3e28; border-color: var(--mc-accent); }
    .mc-action-row .mc-delete { color: var(--mc-red); } .mc-action-row .mc-delete:hover { background: #4a1010; border-color: var(--mc-red); }

    /* ── INVENTORY ────────────────────────────────── */
    #mc-inventory {
      position: fixed; inset: 0; z-index: 9995;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.65);
      font-family: var(--mc-font);
      pointer-events: none; opacity: 0; transition: opacity 0.12s;
    }
    #mc-inventory.mc-inv-open { opacity: 1; pointer-events: all; }
    #mc-inventory.mc-inv-closed { opacity: 0; pointer-events: none; }

    #mc-inv-box {
      width: 580px; max-width: 95vw;
      background: var(--mc-bg);
      border: 4px solid; border-color: var(--mc-slotlt) var(--mc-slotdk) var(--mc-slotdk) var(--mc-slotlt);
      box-shadow: 8px 8px 0 rgba(0,0,0,0.8);
      display: flex; flex-direction: column;
      max-height: 80vh;
    }

    #mc-inv-title {
      background: var(--mc-panel); padding: 10px 16px;
      font-size: 22px; color: var(--mc-accent);
      border-bottom: 3px solid var(--mc-slotdk);
      display: flex; align-items: center; justify-content: space-between;
      text-shadow: 2px 2px 0 #000;
    }
    #mc-inv-title button {
      background: var(--mc-red); border: 2px solid; border-color: #ff9999 #880000 #880000 #ff9999;
      color: white; font-family: var(--mc-font); font-size: 16px; padding: 2px 10px; cursor: pointer;
    }

    #mc-tabs {
      display: flex; flex-wrap: wrap; gap: 2px; padding: 8px;
      background: #111; border-bottom: 2px solid var(--mc-slotdk);
    }
    .mc-tab {
      padding: 4px 14px; background: var(--mc-slot); cursor: pointer;
      border: 2px solid; border-color: var(--mc-slotlt) var(--mc-slotdk) var(--mc-slotdk) var(--mc-slotlt);
      font-family: var(--mc-font); font-size: 15px; color: #111;
      box-shadow: inset -1px -1px 0 #555, inset 1px 1px 0 #ddd;
    }
    .mc-tab:hover { background: #9e9e9e; }
    .mc-tab-active {
      background: #c8c850; border-color: var(--mc-accent) !important;
      box-shadow: 0 0 0 1px var(--mc-accent), inset -1px -1px 0 #666, inset 1px 1px 0 #ffe !important;
    }

    #mc-inv-grid {
      flex: 1; overflow-y: auto; display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 4px; padding: 10px;
      background: #0d0d0d;
      scrollbar-width: thin; scrollbar-color: #444 #111;
    }
    .mc-inv-item {
      background: var(--mc-slot); cursor: pointer;
      border: 2px solid; border-color: var(--mc-slotlt) var(--mc-slotdk) var(--mc-slotdk) var(--mc-slotlt);
      box-shadow: inset -2px -2px 0 #333, inset 2px 2px 0 #ccc;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 8px 4px; gap: 4px; transition: background 0.08s; min-height: 70px;
    }
    .mc-inv-item:hover { background: #9e9e9e; box-shadow: 0 0 0 2px var(--mc-accent), inset -2px -2px 0 #333, inset 2px 2px 0 #ccc; }
    .mc-inv-icon { font-size: 26px; line-height: 1; }
    .mc-inv-name { font-size: 11px; color: #111; text-align: center; line-height: 1.2; }

    #mc-inv-search {
      padding: 6px 10px; border-top: 2px solid var(--mc-slotdk);
      background: #111; display: flex; gap: 6px; align-items: center;
    }
    #mc-inv-search input {
      flex: 1; background: #1a1a1a; border: 2px solid #555; color: var(--mc-text);
      font-family: var(--mc-font); font-size: 15px; padding: 4px 10px; outline: none;
    }
    #mc-inv-search input:focus { border-color: var(--mc-accent); }
    #mc-inv-search span { color: var(--mc-text2); font-size: 13px; white-space: nowrap; }

    /* ── SCENE PANEL (hierarchy + code) ─────────── */
    #mc-scene-panel {
      position: fixed; left: 10px; top: 50%; transform: translateY(-50%);
      width: 200px; background: rgba(18,14,8,0.95);
      border: 2px solid; border-color: var(--mc-slotlt) var(--mc-slotdk) var(--mc-slotdk) var(--mc-slotlt);
      box-shadow: 4px 4px 0 rgba(0,0,0,0.6); z-index: 9980; max-height: 65vh; display: flex; flex-direction: column;
      font-family: var(--mc-font);
    }
    #mc-scene-panel-hdr {
      background: var(--mc-panel); padding: 6px 10px;
      font-size: 15px; color: var(--mc-accent); border-bottom: 1px solid #3a3020;
      display: flex; justify-content: space-between; align-items: center;
    }
    #mc-scene-panel-hdr button {
      background: none; border: 1px solid #554; color: var(--mc-text2); cursor: pointer;
      font-family: var(--mc-font); font-size: 12px; padding: 1px 6px;
    }
    #mc-scene-panel-hdr button:hover { border-color: var(--mc-accent); color: var(--mc-accent); }
    #mc-hier-list { flex: 1; overflow-y: auto; min-height: 0; }
    .mc-hier-empty { padding: 12px; text-align: center; color: var(--mc-text2); font-size: 13px; }
    .mc-hier-row {
      display: flex; align-items: center; gap: 5px; padding: 3px 8px;
      font-size: 13px; cursor: pointer; border-bottom: 1px solid #1a1408;
      white-space: nowrap; overflow: hidden;
    }
    .mc-hier-row:hover { background: #2a2010; }
    .mc-hier-sel { background: rgba(255,255,85,0.1); color: var(--mc-accent); }
    .mc-hier-hid { opacity: 0.35; }
    .mc-hier-name { flex: 1; overflow: hidden; text-overflow: ellipsis; }
    .mc-hier-acts { display: flex; gap: 2px; opacity: 0; }
    .mc-hier-row:hover .mc-hier-acts { opacity: 1; }
    .mc-hier-eye, .mc-hier-del {
      background: none; border: none; cursor: pointer; font-size: 11px; padding: 0 3px; color: var(--mc-text2);
    }
    .mc-hier-del:hover { color: var(--mc-red); }

    /* ── DRAW TOOLS STRIP ─────────────────────────── */
    #mc-draw-strip {
      position: fixed; left: 10px; bottom: 90px;
      background: rgba(18,14,8,0.92);
      border: 2px solid; border-color: var(--mc-slotlt) var(--mc-slotdk) var(--mc-slotdk) var(--mc-slotlt);
      padding: 6px; display: flex; flex-direction: column; gap: 4px; z-index: 9980;
      font-family: var(--mc-font);
    }
    #mc-draw-strip-lbl { font-size: 11px; color: var(--mc-text2); text-align: center; padding-bottom: 3px; border-bottom: 1px solid #333; margin-bottom: 2px; }
    .mc-draw-btn {
      display: flex; align-items: center; gap: 6px; padding: 5px 10px;
      background: var(--mc-slot); cursor: pointer;
      border: 2px solid; border-color: var(--mc-slotlt) var(--mc-slotdk) var(--mc-slotdk) var(--mc-slotlt);
      font-family: var(--mc-font); font-size: 14px; color: #111;
      box-shadow: inset -1px -1px 0 #555, inset 1px 1px 0 #ddd; min-width: 120px;
      transition: background 0.08s;
    }
    .mc-draw-btn:hover { background: #9e9e9e; }
    .mc-draw-btn.mc-active {
      background: #c8c850; border-color: var(--mc-accent);
      box-shadow: 0 0 0 1px var(--mc-accent), inset -1px -1px 0 #555, inset 1px 1px 0 #ffe;
    }
    .mc-draw-key { font-size: 11px; color: #555; margin-left: auto; }

    /* ── FILE STRIP ───────────────────────────────── */
    #mc-file-strip {
      position: fixed; right: 12px; bottom: 90px;
      background: rgba(18,14,8,0.92);
      border: 2px solid; border-color: var(--mc-slotlt) var(--mc-slotdk) var(--mc-slotdk) var(--mc-slotlt);
      padding: 6px; display: flex; flex-direction: column; gap: 4px; z-index: 9980;
      font-family: var(--mc-font);
    }
    #mc-file-strip button, #mc-link-btn {
      background: var(--mc-slot); cursor: pointer;
      border: 2px solid; border-color: var(--mc-slotlt) var(--mc-slotdk) var(--mc-slotdk) var(--mc-slotlt);
      font-family: var(--mc-font); font-size: 13px; color: #111; padding: 4px 10px;
      box-shadow: inset -1px -1px 0 #555, inset 1px 1px 0 #ddd; cursor: pointer;
    }
    #mc-file-strip button:hover, #mc-link-btn:hover { background: #9e9e9e; }
    #mc-status-msg { font-size: 11px; color: var(--mc-green); text-align: center; min-height: 14px; }

    /* ── CODE PANEL ───────────────────────────────── */
    #mc-code-panel {
      position: fixed; bottom: 90px; left: 220px; right: 240px;
      background: rgba(8,8,4,0.92);
      border: 2px solid; border-color: var(--mc-slotlt) var(--mc-slotdk) var(--mc-slotdk) var(--mc-slotlt);
      z-index: 9978; overflow: hidden; display: none; flex-direction: column;
      font-family: var(--mc-font);
    }
    #mc-code-panel.mc-code-open { display: flex; height: 160px; }
    #mc-code-hdr { display: flex; justify-content: space-between; align-items: center; padding: 4px 10px; background: #1a1208; border-bottom: 1px solid #333; }
    #mc-code-hdr span { font-size: 13px; color: var(--mc-accent); }
    #mc-code-hdr button { background: #3a2e18; border: 1px solid #665; color: var(--mc-text2); font-family: var(--mc-font); font-size: 12px; padding: 2px 8px; cursor: pointer; }
    #mc-code-hdr button:hover { border-color: var(--mc-accent); color: var(--mc-text); }
    #mc-code-pre { flex: 1; overflow: auto; padding: 6px 10px; font-family: 'Courier New', monospace; font-size: 11px; color: #7ec8e3; white-space: pre; line-height: 1.5; }

    /* ── TOAST ────────────────────────────────────── */
    #mc-toast {
      position: fixed; bottom: 95px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.88); color: var(--mc-text); padding: 6px 18px;
      font-family: var(--mc-font); font-size: 16px; border: 1px solid #444;
      z-index: 99999; opacity: 0; transition: opacity 0.2s; pointer-events: none;
      text-shadow: 1px 1px 0 #000;
    }
    #mc-toast.mc-toast-show { opacity: 1; }

    /* ── CROSSHAIR (shown in edit mode) ──────────── */
    #mc-crosshair {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
      pointer-events: none; z-index: 9970; display: none;
    }
    #mc-crosshair::before, #mc-crosshair::after {
      content: ''; position: absolute; background: rgba(255,255,255,0.7);
    }
    #mc-crosshair::before { width: 2px; height: 16px; left: -1px; top: -8px; }
    #mc-crosshair::after  { width: 16px; height: 2px; left: -8px; top: -1px; }
  `;
  document.head.appendChild(style);

  // HTML ─────────────────────────────────────────────────────────────────────
  const root = document.createElement('div'); root.id = 'mc-root';

  root.innerHTML = `
    <!-- Hotbar -->
    <div id="mc-hotbar"></div>

    <!-- Status bar -->
    <div id="mc-statusbar">
      <span id="mc-sb-tool">SELECT ↖</span>
      <span id="mc-sb-cursor" style="color:#666">0, 0</span>
      <span id="mc-held"></span>
      <span id="mc-sb-objs" style="color:#666">0 objects</span>
      <span id="mc-sb-snap" style="color:#666">Snap: 0.5</span>
      <span id="mc-sb-space" style="color:#666">🌐 World</span>
      <span style="margin-left:auto;color:#444;font-size:12px">E=Inventory  1-9=Slots  Tab=Snap  F=Focus  Ctrl+Z/Y</span>
    </div>

    <!-- Draw length HUD -->
    <div id="mc-hud"></div>

    <!-- Scene / Hierarchy panel -->
    <div id="mc-scene-panel">
      <div id="mc-scene-panel-hdr">
        🗂 Scene
        <div style="display:flex;gap:4px">
          <button onclick="document.getElementById('mc-code-panel').classList.toggle('mc-code-open')">{}</button>
          <button onclick="window._dt.undo()">↩</button>
          <button onclick="window._dt.redo()">↪</button>
        </div>
      </div>
      <div id="mc-hier-list"><div class="mc-hier-empty">No objects in scene</div></div>
    </div>

    <!-- Draw tools strip -->
    <div id="mc-draw-strip">
      <div id="mc-draw-strip-lbl">DRAW TOOLS</div>
      <button class="mc-draw-btn" data-tool="wall">█ Wall<span class="mc-draw-key">W</span></button>
      <button class="mc-draw-btn" data-tool="road">🛣 Road<span class="mc-draw-key">D</span></button>
      <button class="mc-draw-btn" data-tool="divider">🟩 Divider<span class="mc-draw-key">I</span></button>
    </div>

    <!-- File strip -->
    <div id="mc-file-strip">
      <div id="mc-status-msg"></div>
      <button id="mc-link-btn">📎 Link .js</button>
      <button id="mc-save-btn">💾 Save File</button>
      <button id="mc-copy-btn">📋 Copy Code</button>
    </div>

    <!-- Properties panel -->
    <div id="mc-props"></div>

    <!-- Code panel -->
    <div id="mc-code-panel">
      <div id="mc-code-hdr">
        <span>{ } Generated Code</span>
        <div style="display:flex;gap:4px">
          <button onclick="navigator.clipboard.writeText(window._dt.getCode());window._dt.toast&&window._dt.toast('📋 Copied')">📋 Copy</button>
          <button onclick="document.getElementById('mc-code-panel').classList.remove('mc-code-open')">×</button>
        </div>
      </div>
      <pre id="mc-code-pre">// Draw or place objects to generate code</pre>
    </div>

    <!-- Inventory -->
    <div id="mc-inventory" class="mc-inv-closed">
      <div id="mc-inv-box">
        <div id="mc-inv-title">
          🎒 Creative Inventory
          <button onclick="closeInventory ? closeInventory() : void(0)">✕ Close [E]</button>
        </div>
        <div id="mc-tabs">${tabsHTML}</div>
        <div id="mc-inv-grid"></div>
        <div id="mc-inv-search">
          <input id="mc-inv-search-inp" type="text" placeholder="Search objects...">
          <span>ESC or E to close</span>
        </div>
      </div>
    </div>

    <!-- Crosshair -->
    <div id="mc-crosshair"></div>

    <!-- Toast -->
    <div id="mc-toast"></div>
  `;

  document.body.appendChild(root);

  // ── Bind draw tool buttons ─────────────────────────────────────────────────
  root.querySelectorAll('.mc-draw-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      setTool(tool);
      // Sync hotbar highlight too
      const slotIdx = HOTBAR_SLOTS.findIndex(s => s.id === tool);
      if (slotIdx >= 0) setSlot(slotIdx);
    });
  });

  // ── Inventory tabs ─────────────────────────────────────────────────────────
  root.querySelectorAll('.mc-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      STATE.invTab = tab.dataset.group;
      _updateTabs(); _renderInvGrid();
    });
  });

  // ── Inventory search ───────────────────────────────────────────────────────
  document.getElementById('mc-inv-search-inp')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    const grid = document.getElementById('mc-inv-grid'); if (!grid) return;
    if (!q) { _renderInvGrid(); return; }
    const items = Object.entries(OBJ_DEFS).filter(([k, def]) =>
      def.label.toLowerCase().includes(q) || def.group.toLowerCase().includes(q) || k.includes(q)
    );
    grid.innerHTML = items.map(([key, def]) => `
      <div class="mc-inv-item" data-key="${key}" title="${def.label}">
        <div class="mc-inv-icon">${def.icon||'⬛'}</div>
        <div class="mc-inv-name">${def.label}</div>
      </div>
    `).join('');
    grid.querySelectorAll('.mc-inv-item').forEach(el => {
      el.addEventListener('click', () => {
        STATE.pendingType = el.dataset.key;
        HOTBAR_SLOTS[7] = { id: el.dataset.key, icon: OBJ_DEFS[el.dataset.key]?.icon||'⬛', label: OBJ_DEFS[el.dataset.key]?.label||el.dataset.key, color:'#fff', type:'place' };
        _rebuildHotbar(); setSlot(7); setTool('add'); closeInventory();
        toast(`🖐 Holding: ${OBJ_DEFS[el.dataset.key]?.label}`);
      });
    });
  });

  // ── Inventory close button ─────────────────────────────────────────────────
  document.getElementById('mc-inv-title')?.querySelector('button')?.addEventListener('click', closeInventory);

  // ── Click outside inventory box to close ──────────────────────────────────
  document.getElementById('mc-inventory')?.addEventListener('click', e => {
    if (e.target === document.getElementById('mc-inventory')) closeInventory();
  });

  // ── File controls ──────────────────────────────────────────────────────────
  document.getElementById('mc-link-btn')?.addEventListener('click', _linkFile);
  document.getElementById('mc-save-btn')?.addEventListener('click', _saveToFile);
  document.getElementById('mc-copy-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(_generateCode()); toast('📋 Copied!');
  });

  // ── Build hotbar ───────────────────────────────────────────────────────────
  _rebuildHotbar();

  // ── Render initial inventory grid ──────────────────────────────────────────
  _renderInvGrid();
}

// ══════════════════════════════════════════════════════════════════════════════
// §23  ANIMATE HOOK
// ══════════════════════════════════════════════════════════════════════════════

export function updateDevTool() {
  const root = document.getElementById('mc-root');
  const inPlayer = isPlayerActive();

  // Hide devtool UI in player mode
  if (root) root.style.display = inPlayer ? 'none' : 'block';
  TC.visible = !inPlayer && STATE.selected.length > 0;

  if (inPlayer) return;

  if (STATE.selected.length === 1 && TC.dragging) {
    _selBox.setFromObject(STATE.selected[0]);
    _renderProps();
  }

  // Sync draw tool buttons
  document.querySelectorAll('.mc-draw-btn').forEach(btn => {
    btn.classList.toggle('mc-active', btn.dataset.tool === STATE.tool);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// §24  INIT
// ══════════════════════════════════════════════════════════════════════════════

export function initDevTool() {
  _buildUI();

  const cv = renderer.domElement;
  cv.addEventListener('mousemove', _onMove);
  cv.addEventListener('click',     _onClick);
  cv.addEventListener('dblclick',  _onDblClick);
  window.addEventListener('keydown', _onKey);

  _grid.visible = STATE.showGrid;

  // Expose toast for code panel button
  window._dt.toast = toast;

  console.log(
    '%c🎮 DevTool v4  —  Minecraft Creative Mode\n' +
    'E=Inventory  1-9=Hotbar  W=Wall  D=Road  I=Divider\n' +
    'Ctrl+Z=Undo  Ctrl+Y=Redo  F=Focus  Tab=Snap  Del=Delete\n\n' +
    '⚠️ CAMERA FIX — interaction.js orbit handlers mein add karo:\n' +
    '   import { isPlayerActive } from \'./player.js\';\n' +
    '   if (isPlayerActive() || !window._dtCanOrbit()) return;',
    'color:#ffff55;background:#1a1a1a;font-size:13px;font-weight:bold;padding:4px 8px;'
  );

  toast('🎮 DevTool v4  ·  E = Open Inventory');
}