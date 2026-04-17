import { renderer, scene, camera } from './scene.js';
import { handleControls } from './controls.js';

export function animate() {
  let frameCount = 0;

  function loop() {
    requestAnimationFrame(loop);
    handleControls();
    renderer.render(scene, camera);
    frameCount++;
    if (frameCount === 2) {
      const loading = document.getElementById('loading');
      if (loading) loading.style.display = 'none';
    }
  }

  loop();
}
