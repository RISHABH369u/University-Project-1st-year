import { mkWall } from '../utils/wall.js';

const DEG = Math.PI / 180;

function tracePath(startX, startZ, startHeadingDeg, segments) {
  let x = startX;
  let z = startZ;
  let heading = startHeadingDeg * DEG;

  const pts = [{ x, z }];

  for (const seg of segments) {
    x += Math.sin(heading) * seg.len;
    z += Math.cos(heading) * seg.len;
    pts.push({ x, z });

    heading += (seg.turnDeg || 0) * DEG;
  }

  return pts;
}

export function createBoundary({ mirror = false } = {}) {
  // Start from the left side of the gate opening.
  // 1 unit = 1 meter
  const start = { x: -14, z: -14 };

  const rawSegments = [
    { len: 207, turnDeg: 20 },   // gate side + outward taper
    { len: 120, turnDeg: 0 },
    { len: 70, turnDeg: -5 },    // slight left bend
    { len: 833, turnDeg: -28 },  // inward bend
    { len: 65, turnDeg: -28 },   // inward bend
    { len: 173, turnDeg: 90 },   // turn back
    { len: 488, turnDeg: -110 }, // bend outward
    { len: 115, turnDeg: 50 },   // outward bend
    { len: 165, turnDeg: 70 },   // outward bend
    { len: 55, turnDeg: 30 },    // outward bend
    { len: 112, turnDeg: 30 },   // outward bend
    { len: 105, turnDeg: -90 },  // inward bend
    { len: 17, turnDeg: 0 },
    { len: 15, turnDeg: 0 }
  ];

  const segments = mirror
    ? rawSegments.map(s => ({ len: s.len, turnDeg: -(s.turnDeg || 0) }))
    : rawSegments;

  const pts = tracePath(start.x, start.z, 180, segments);

  const total = segments.reduce((sum, s) => sum + s.len, 0);
  console.log(`Boundary perimeter = ${total} m`);

  for (let i = 0; i < pts.length - 1; i++) {
    mkWall(
      pts[i].x, pts[i].z,
      pts[i + 1].x, pts[i + 1].z,
      2.6,
      0xd2cfc0
    );
  }
  console.log("🔥 NEW BOUNDARY LOADED");

  // Close back to the gate opening
  mkWall(
    pts[pts.length - 1].x,
    pts[pts.length - 1].z,
    start.x,
    start.z,
    2.6,
    0xd2cfc0
  );
}