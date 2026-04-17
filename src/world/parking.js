import { mkPlane } from '../helpers.js';

function mkParking(x, z, w, d) {
  mkPlane(x, z, w, d, 0x7a7a6a, 0.03);
  const nLines = Math.floor(d / 3.8);
  for (let i = 0; i <= nLines; i++) {
    const lz = z - d / 2 + i * 3.8;
    mkPlane(x, lz, w - 1, 0.14, 0xffffff, 0.04);
  }
}

export function createParking() {
  mkParking(20, 9, 18, 18);
  mkParking(-16, 24, 14, 12);
}
