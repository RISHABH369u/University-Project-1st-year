import * as THREE from 'three';
import { scene } from '../scene.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  UTILS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function randBetween(a, b) {
  return a + Math.random() * (b - a);
}

/** Shift a hex color by ±amount in each RGB channel */
function shadeColor(hex, amount = 30) {
  const r = Math.min(255, Math.max(0, ((hex >> 16) & 0xff) + Math.floor((Math.random() - 0.5) * amount * 2)));
  const g = Math.min(255, Math.max(0, ((hex >> 8)  & 0xff) + Math.floor((Math.random() - 0.5) * amount * 2)));
  const b = Math.min(255, Math.max(0, ((hex)       & 0xff) + Math.floor((Math.random() - 0.5) * amount * 2)));
  return (r << 16) | (g << 8) | b;
}

/** Build a wavy organic trunk using TubeGeometry along a CatmullRomCurve */
function makeTrunk(height, baseRadius, topRadius, color, segments = 6) {
  // Create a slightly curved path for the trunk
  const points = [];
  const numPts = 6;
  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts;
    points.push(new THREE.Vector3(
      Math.sin(t * Math.PI * 0.6) * height * 0.06 * (Math.random() - 0.5),
      t * height,
      Math.sin(t * Math.PI * 0.8) * height * 0.05 * (Math.random() - 0.5)
    ));
  }
  const curve = new THREE.CatmullRomCurve3(points);

  // Taper by using custom geometry instead — TubeGeometry radius varies
  // We simulate taper via CylinderGeometry for performance but with the curve's
  // midpoint applied as a positional offset on the group
  const geo = new THREE.CylinderGeometry(topRadius, baseRadius, height, segments, 3);

  // Wiggle the cylinder verts slightly for organic look
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = y / height;
    pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * baseRadius * 0.18 * (1 - t));
    pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * baseRadius * 0.18 * (1 - t));
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({ color: shadeColor(color, 20) });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = height / 2;
  mesh.castShadow = true;
  return mesh;
}

/** One blob of foliage — randomised IcosahedronGeometry */
function makeLeafBlob(radius, color, detail = 1) {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  // Displace each vertex randomly for organic lumpy look
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const r = 1 + (Math.random() - 0.5) * 0.38;
    pos.setX(i, pos.getX(i) * r);
    pos.setY(i, pos.getY(i) * r);
    pos.setZ(i, pos.getZ(i) * r);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ color: shadeColor(color, 35) })
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  1. NEEM TREE  🌳  (most common on Indian campuses)
//     Wide spreading, medium height, light green canopy
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function mkNeem(x, z, s = 1) {
  const g = new THREE.Group();
  const sc = s * randBetween(0.85, 1.15);

  // Trunk
  g.add(makeTrunk(4.5 * sc, 0.32 * sc, 0.18 * sc, 0x5a3410, 7));

  // Wide spreading canopy — 7 blobs arranged in umbrella
  const canopyY  = 5.5 * sc;
  const leafColor = 0x3a7d1e;
  const spread   = 2.2 * sc;

  // Central blob
  const center = makeLeafBlob(2.1 * sc, leafColor);
  center.position.y = canopyY;
  center.scale.y = 0.72;
  g.add(center);

  // Surrounding blobs — offset outward and slightly lower
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 / 6) * i + Math.random() * 0.4;
    const blob = makeLeafBlob(randBetween(1.4, 1.8) * sc, leafColor);
    blob.position.set(
      Math.cos(angle) * spread,
      canopyY - randBetween(0.3, 0.9) * sc,
      Math.sin(angle) * spread
    );
    blob.scale.y = randBetween(0.65, 0.85);
    blob.castShadow = true;
    g.add(blob);
  }

  // Top wispy blob
  const top = makeLeafBlob(1.3 * sc, shadeColor(leafColor, 20));
  top.position.y = canopyY + 1.8 * sc;
  top.scale.y = 0.9;
  g.add(top);

  // Tiny ground shadow patch (dark circle under tree)
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(2.8 * sc, 12),
    new THREE.MeshLambertMaterial({ color: 0x2a5010, transparent: true, opacity: 0.18 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  g.add(shadow);

  g.rotation.y = Math.random() * Math.PI * 2;
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  2. MANGO TREE  🥭  (dense, dark, iconic)
//     Tall, compact, very dark green crown
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function mkMango(x, z, s = 1) {
  const g = new THREE.Group();
  const sc = s * randBetween(0.9, 1.2);

  // Tall, thick trunk
  g.add(makeTrunk(5.5 * sc, 0.38 * sc, 0.22 * sc, 0x4a2c0a, 8));

  const leafColor = 0x1b5e20;  // very dark green
  const canopyY   = 7 * sc;

  // Dense central mass — two overlapping large blobs
  for (let i = 0; i < 2; i++) {
    const blob = makeLeafBlob(2.4 * sc, leafColor, 1);
    blob.position.set(
      (Math.random() - 0.5) * 0.8 * sc,
      canopyY + (Math.random() - 0.5) * 0.6 * sc,
      (Math.random() - 0.5) * 0.8 * sc
    );
    blob.scale.set(1, 0.78, 1);
    blob.castShadow = true;
    g.add(blob);
  }

  // 5 side blobs tightly packed
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 / 5) * i;
    const blob = makeLeafBlob(randBetween(1.5, 2.0) * sc, leafColor);
    blob.position.set(
      Math.cos(angle) * 1.7 * sc,
      canopyY - 0.5 * sc,
      Math.sin(angle) * 1.7 * sc
    );
    blob.scale.y = 0.7;
    blob.castShadow = true;
    g.add(blob);
  }

  // Drooping lower skirt blobs
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI * 2 / 4) * i + 0.3;
    const blob = makeLeafBlob(1.1 * sc, shadeColor(0x2e7d32, 20));
    blob.position.set(
      Math.cos(angle) * 2.6 * sc,
      canopyY - 1.8 * sc,
      Math.sin(angle) * 2.6 * sc
    );
    blob.scale.set(1.1, 0.55, 1.1);
    g.add(blob);
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(3 * sc, 12),
    new THREE.MeshLambertMaterial({ color: 0x1a4010, transparent: true, opacity: 0.2 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  g.add(shadow);

  g.rotation.y = Math.random() * Math.PI * 2;
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  3. PEEPAL TREE  🍃  (sacred fig — often near entrances)
//     Very wide, heart-shaped leaves (blob clusters)
//     Distinctive white-grey bark
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function mkPeepal(x, z, s = 1) {
  const g = new THREE.Group();
  const sc = s * randBetween(1.0, 1.3); // Peepal grows big

  // Wide, light-grey trunk
  g.add(makeTrunk(5 * sc, 0.55 * sc, 0.28 * sc, 0x9e9e8a, 8));

  // Exposed roots at base — small wedge boxes
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 / 5) * i;
    const root = new THREE.Mesh(
      new THREE.BoxGeometry(0.18 * sc, 0.5 * sc, 1.2 * sc),
      new THREE.MeshLambertMaterial({ color: 0x8a7a6a })
    );
    root.rotation.y = angle;
    root.position.set(
      Math.cos(angle) * 0.8 * sc,
      0.25 * sc,
      Math.sin(angle) * 0.8 * sc
    );
    g.add(root);
  }

  const leafColor = 0x558b2f;
  const canopyY   = 7 * sc;
  const spread    = 3 * sc;

  // Huge spreading canopy — Peepal is WIDE
  const center = makeLeafBlob(2.8 * sc, leafColor, 1);
  center.position.y = canopyY;
  center.scale.set(1.2, 0.65, 1.2);
  g.add(center);

  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.25;
    const r = randBetween(0.55, 1.0) * spread;
    const blob = makeLeafBlob(randBetween(1.6, 2.2) * sc, shadeColor(leafColor, 40));
    blob.position.set(
      Math.cos(angle) * r,
      canopyY - randBetween(0.5, 1.5) * sc,
      Math.sin(angle) * r
    );
    blob.scale.set(
      randBetween(0.9, 1.2),
      randBetween(0.55, 0.75),
      randBetween(0.9, 1.2)
    );
    blob.castShadow = true;
    g.add(blob);
  }

  // Dangling outer wisps
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 / 5) * i + 0.2;
    const blob = makeLeafBlob(1.0 * sc, 0x689f38);
    blob.position.set(
      Math.cos(angle) * spread * 1.2,
      canopyY - 2.5 * sc,
      Math.sin(angle) * spread * 1.2
    );
    blob.scale.y = 0.45;
    g.add(blob);
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(3.8 * sc, 14),
    new THREE.MeshLambertMaterial({ color: 0x1a3a08, transparent: true, opacity: 0.22 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  g.add(shadow);

  g.rotation.y = Math.random() * Math.PI * 2;
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  4. GULMOHAR / FLAMBOYANT  🔴  (flame tree)
//     Flat umbrella canopy, bright orange-red colour
//     Very common on Indian campuses — extremely beautiful
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function mkGulmohar(x, z, s = 1) {
  const g = new THREE.Group();
  const sc = s * randBetween(0.85, 1.1);

  // Slender trunk
  g.add(makeTrunk(5 * sc, 0.28 * sc, 0.14 * sc, 0x5d4037, 6));

  // Flat umbrella canopy — squashed blobs spread wide
  // Use reddish-orange for flowering season look
  const leafColor = 0xd84315; // fiery orange-red
  const greenUnderbelly = 0x558b2f;

  const canopyY = 6 * sc;
  const spread  = 3.5 * sc;

  // Wide flat center disk
  const center = makeLeafBlob(3.2 * sc, leafColor, 1);
  center.position.y = canopyY;
  center.scale.set(1.1, 0.28, 1.1); // very flat!
  g.add(center);

  // Ring of side blobs at same height — gives umbrella effect
  for (let i = 0; i < 9; i++) {
    const angle = (Math.PI * 2 / 9) * i + Math.random() * 0.2;
    const blob = makeLeafBlob(randBetween(1.3, 1.9) * sc, shadeColor(leafColor, 50));
    blob.position.set(
      Math.cos(angle) * spread * randBetween(0.7, 1.0),
      canopyY - randBetween(0.1, 0.4) * sc,
      Math.sin(angle) * spread * randBetween(0.7, 1.0)
    );
    blob.scale.set(1.0, 0.3, 1.0);
    blob.castShadow = true;
    g.add(blob);
  }

  // Slight green underside layer
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI * 2 / 4) * i;
    const blob = makeLeafBlob(1.4 * sc, greenUnderbelly);
    blob.position.set(
      Math.cos(angle) * 2 * sc,
      canopyY - 0.8 * sc,
      Math.sin(angle) * 2 * sc
    );
    blob.scale.set(1, 0.4, 1);
    g.add(blob);
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(3.5 * sc, 14),
    new THREE.MeshLambertMaterial({ color: 0x3a0a00, transparent: true, opacity: 0.18 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  g.add(shadow);

  g.rotation.y = Math.random() * Math.PI * 2;
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  5. COCONUT PALM  🌴  (much better than old version)
//     Tall curved trunk, realistic frond droop
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function mkPalm(x, z, s = 1) {
  const g = new THREE.Group();
  const sc = s * randBetween(0.9, 1.15);

  const trunkH = 9 * sc;
  const lean   = randBetween(-0.12, 0.12);  // random lean direction

  // Segmented trunk — multiple stacked cylinders, each slightly offset (coconut ring effect)
  const segments = 7;
  let curY = 0;
  const segH = trunkH / segments;
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const radius = (0.28 - t * 0.12) * sc;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.9, radius, segH, 7, 1),
      new THREE.MeshLambertMaterial({ color: shadeColor(0x8d6e2a, 25) })
    );
    seg.position.set(
      lean * segH * i * 0.4,   // progressive lean
      curY + segH / 2,
      lean * segH * i * 0.2
    );
    seg.castShadow = true;
    g.add(seg);

    // Ring band between segments
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.025 * sc, 4, 10),
      new THREE.MeshLambertMaterial({ color: 0x5d4012 })
    );
    band.rotation.x = Math.PI / 2;
    band.position.set(lean * segH * i * 0.4, curY, lean * segH * i * 0.2);
    g.add(band);

    curY += segH;
  }

  const topX = lean * segH * (segments - 1) * 0.4;
  const topZ = lean * segH * (segments - 1) * 0.2;
  const topY = trunkH;

  // Crown — 8 drooping fronds
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.2;
    const droopAngle = randBetween(0.55, 0.82); // how much they droop
    const frondLen   = randBetween(3.5, 5) * sc;

    const frondGroup = new THREE.Group();

    // Main frond spine — tapered cone
    const spine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03 * sc, 0.07 * sc, frondLen, 4),
      new THREE.MeshLambertMaterial({ color: shadeColor(0x5d8c2a, 20) })
    );
    spine.rotation.z = droopAngle;
    spine.position.set(
      Math.sin(droopAngle) * frondLen / 2,
      -Math.cos(droopAngle) * frondLen / 2 + 0.3 * sc,
      0
    );
    frondGroup.add(spine);

    // Leaf blades along the frond
    const bladeCount = 8;
    for (let b = 0; b < bladeCount; b++) {
      const t = b / bladeCount;
      const blade = new THREE.Mesh(
        new THREE.PlaneGeometry(randBetween(0.4, 0.7) * sc, 0.12 * sc),
        new THREE.MeshLambertMaterial({
          color: shadeColor(0x4a7c1a, 30),
          side: THREE.DoubleSide
        })
      );
      const bx = Math.sin(droopAngle) * frondLen * t;
      const by = -Math.cos(droopAngle) * frondLen * t + 0.3 * sc;
      blade.position.set(bx, by, (b % 2 === 0 ? 1 : -1) * 0.3 * sc);
      blade.rotation.x = (b % 2 === 0 ? -0.5 : 0.5);
      blade.rotation.z = droopAngle + 0.1;
      frondGroup.add(blade);
    }

    frondGroup.rotation.y = angle;
    frondGroup.position.set(topX, topY, topZ);
    g.add(frondGroup);
  }

  // Coconuts cluster at crown base
  for (let i = 0; i < 3; i++) {
    const nut = new THREE.Mesh(
      new THREE.SphereGeometry(0.22 * sc, 6, 5),
      new THREE.MeshLambertMaterial({ color: 0x5d4a1a })
    );
    const angle = (Math.PI * 2 / 3) * i;
    nut.position.set(
      topX + Math.cos(angle) * 0.5 * sc,
      topY - 0.5 * sc,
      topZ + Math.sin(angle) * 0.5 * sc
    );
    g.add(nut);
  }

  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  6. BAMBOO CLUSTER  🎋  (decorative, near buildings)
//     Many thin tall stalks with node rings
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function mkBamboo(x, z, s = 1) {
  const g = new THREE.Group();

  const count = Math.floor(randBetween(5, 9));
  for (let i = 0; i < count; i++) {
    const sc   = s * randBetween(0.7, 1.2);
    const h    = randBetween(6, 11) * sc;
    const lean = randBetween(-0.08, 0.08);

    // Stalk
    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07 * sc, 0.1 * sc, h, 6),
      new THREE.MeshLambertMaterial({ color: shadeColor(0x7cb342, 25) })
    );
    stalk.position.set(
      (Math.random() - 0.5) * 1.6,
      h / 2,
      (Math.random() - 0.5) * 1.6
    );
    stalk.rotation.z = lean;
    stalk.castShadow = true;
    g.add(stalk);

    // Node rings
    const nodes = Math.floor(h / 1.4);
    for (let n = 0; n < nodes; n++) {
      const node = new THREE.Mesh(
        new THREE.TorusGeometry(0.09 * sc, 0.018 * sc, 4, 8),
        new THREE.MeshLambertMaterial({ color: 0x558b2f })
      );
      node.rotation.x = Math.PI / 2;
      node.position.set(stalk.position.x, n * 1.4 + 1, stalk.position.z);
      g.add(node);
    }

    // Leaf tufts at top
    for (let l = 0; l < 3; l++) {
      const leafAngle = (Math.PI * 2 / 3) * l + Math.random();
      const leaf = new THREE.Mesh(
        new THREE.PlaneGeometry(randBetween(0.8, 1.4) * sc, 0.1 * sc),
        new THREE.MeshLambertMaterial({
          color: shadeColor(0x558b2f, 30),
          side: THREE.DoubleSide
        })
      );
      leaf.position.set(
        stalk.position.x + Math.cos(leafAngle) * 0.7 * sc,
        h - 0.5 + (Math.random() - 0.5) * 1,
        stalk.position.z + Math.sin(leafAngle) * 0.7 * sc
      );
      leaf.rotation.y = leafAngle;
      leaf.rotation.z = 0.4;
      g.add(leaf);
    }
  }

  g.rotation.y = Math.random() * Math.PI * 2;
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  7. CYPRESS / ASHOKA TREE  🌲  (tall, narrow, formal)
//     Often planted in lines near paths & entrances
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function mkAshoka(x, z, s = 1) {
  const g = new THREE.Group();
  const sc = s * randBetween(0.9, 1.2);

  // Thin trunk
  g.add(makeTrunk(7 * sc, 0.2 * sc, 0.12 * sc, 0x5a3a10, 6));

  const leafColor = 0x1b5e20;

  // Tall narrow stacked cone layers
  const layers = 7;
  for (let i = 0; i < layers; i++) {
    const t = i / layers;
    const layerRadius = (1.5 - t * 1.1) * sc;
    const layerY      = 2.5 * sc + t * 6 * sc;

    const layer = new THREE.Mesh(
      new THREE.ConeGeometry(layerRadius, 1.6 * sc, 8),
      new THREE.MeshLambertMaterial({ color: shadeColor(leafColor, 30) })
    );
    layer.position.y = layerY;
    layer.castShadow = true;
    g.add(layer);
  }

  // Pointy top
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.18 * sc, 0.8 * sc, 6),
    new THREE.MeshLambertMaterial({ color: shadeColor(0x2e7d32, 20) })
  );
  tip.position.y = 10.5 * sc;
  g.add(tip);

  g.rotation.y = Math.random() * Math.PI * 2;
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  8. BANYAN TREE  🌳  (massive, aerial roots, iconic)
//     For placing near library / historic spots
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function mkBanyan(x, z, s = 1) {
  const g = new THREE.Group();
  const sc = s * randBetween(1.0, 1.3);

  // Massive main trunk
  g.add(makeTrunk(5 * sc, 0.7 * sc, 0.45 * sc, 0x6d5a3a, 10));

  // Aerial roots hanging down from branches
  const rootCount = 8;
  for (let i = 0; i < rootCount; i++) {
    const angle = (Math.PI * 2 / rootCount) * i + Math.random() * 0.4;
    const dist  = randBetween(1.2, 2.8) * sc;
    const rootH = randBetween(2, 4) * sc;
    const root  = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035 * sc, 0.06 * sc, rootH, 4),
      new THREE.MeshLambertMaterial({ color: shadeColor(0x8d7a5a, 20) })
    );
    root.position.set(
      Math.cos(angle) * dist,
      rootH / 2 + 0.5,
      Math.sin(angle) * dist
    );
    g.add(root);
  }

  const leafColor = 0x2e7d32;
  const canopyY   = 7 * sc;

  // Massive wide canopy
  const center = makeLeafBlob(3.5 * sc, leafColor, 1);
  center.position.y = canopyY;
  center.scale.set(1.2, 0.6, 1.2);
  g.add(center);

  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 / 10) * i + Math.random() * 0.3;
    const r = randBetween(2, 4) * sc;
    const blob = makeLeafBlob(randBetween(1.8, 2.6) * sc, shadeColor(leafColor, 45));
    blob.position.set(
      Math.cos(angle) * r,
      canopyY - randBetween(0.4, 1.6) * sc,
      Math.sin(angle) * r
    );
    blob.scale.set(1, randBetween(0.5, 0.75), 1);
    blob.castShadow = true;
    g.add(blob);
  }

  // Hanging low outer skirt
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 / 6) * i;
    const blob = makeLeafBlob(1.3 * sc, 0x388e3c);
    blob.position.set(
      Math.cos(angle) * 4.5 * sc,
      canopyY - 2.5 * sc,
      Math.sin(angle) * 4.5 * sc
    );
    blob.scale.y = 0.4;
    g.add(blob);
  }

  // Big shadow
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(5 * sc, 14),
    new THREE.MeshLambertMaterial({ color: 0x0d2a04, transparent: true, opacity: 0.25 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  g.add(shadow);

  g.rotation.y = Math.random() * Math.PI * 2;
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CONVENIENCE: place a random Indian campus tree
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const treeFns = [mkNeem, mkMango, mkNeem, mkPeepal, mkNeem]; // neem is most common

export function mkRandomTree(x, z, s = 1) {
  const fn = treeFns[Math.floor(Math.random() * treeFns.length)];
  return fn(x, z, s);
}