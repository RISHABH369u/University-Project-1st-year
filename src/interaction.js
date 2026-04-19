import * as THREE from 'three';
import { camera } from './scene.js';
import { clickable } from './utils/buildings.js';
import { isPlayerActive } from './player.js';

const raycaster = new THREE.Raycaster();
const mouseVec = new THREE.Vector2();

const panel = document.getElementById('panel');
const panelIcon = document.getElementById('panel-icon');
const panelName = document.getElementById('panel-name');
const panelDesc = document.getElementById('panel-desc');
const panelClose = document.getElementById('panel-close');

function canOrbit() {
  return typeof window._dtCanOrbit === 'function' ? window._dtCanOrbit() : true;
}

panelClose?.addEventListener('click', () => {
  if (panel) panel.style.display = 'none';
});

export function setupInteraction() {
  window.addEventListener('mouseup', (e) => {
    if (isPlayerActive()) return;
    if (!canOrbit()) return;
    if (!panel || !panelIcon || !panelName || !panelDesc) return;

    mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouseVec, camera);
    const hits = raycaster.intersectObjects(clickable, false);

    if (hits.length && hits[0].object.userData?.name) {
      const { name, desc, icon } = hits[0].object.userData;
      panelIcon.textContent = icon || '🏢';
      panelName.textContent = name || 'Building';
      panelDesc.textContent = desc || 'No description available.';
      panel.style.display = 'block';
    } else {
      panel.style.display = 'none';
    }
  });
}