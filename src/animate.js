import { renderer, scene, camera } from './scene.js';
import { handleControls } from './controls.js';
import { updateDevTool } from './devtool.js';
import { updatePlayer, isPlayerActive } from './player.js';

export function animate() {
  let frameCount = 0;

  function loop() {
    requestAnimationFrame(loop);

    if (isPlayerActive()) {
      updatePlayer();
    } else {
      handleControls();
      updateDevTool();
    }

    renderer.render(scene, camera);

    frameCount++;
    if (frameCount === 2) {
      const loading = document.getElementById('loading');
      if (loading) loading.style.display = 'none';
    }
  }

  loop();
}