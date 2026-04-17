import { mkPlane } from '../helpers.js';

export function createRoads() {
  const ROAD = 0xb5a898;
  const ROAD_SIDE = 0xc8b870;

  mkPlane(0, 5, 10, 38, ROAD, 0.02);
  mkPlane(0, 35, 10, 30, ROAD, 0.02);
  mkPlane(0, 63, 10, 34, ROAD, 0.02);

  mkPlane(-14, 20, 4.5, 24, ROAD, 0.02);
  mkPlane(-25, 10, 4.5, 4, ROAD, 0.02);

  mkPlane(15, 40, 5, 20, ROAD, 0.02);
  mkPlane(-8, 52, 5, 14, ROAD, 0.02);

  for (let z = -12; z <= 78; z += 5) {
    mkPlane(-5.2, z, 0.4, 4.5, ROAD_SIDE, 0.025);
    mkPlane(5.2, z, 0.4, 4.5, ROAD_SIDE, 0.025);
  }
}
