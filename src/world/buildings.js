import * as THREE from 'three';
import { scene, camera } from '../scene.js';
import { getMat } from '../materials.js';

export const clickable = [];
const winMat = new THREE.MeshLambertMaterial({ color: 0x90c0d8, emissive: 0x1a3a5a, emissiveIntensity: 0.12 });
const doorMat = new THREE.MeshLambertMaterial({ color: 0x4a3218 });

function floorHeight(floors) {
  return floors === 1 ? 4 : floors === 2 ? 7.5 : floors === 3 ? 11 : floors === 4 ? 14.5 : 18;
}

export function addBuilding({ x, z, w, d, floors, color, name, desc, icon = '🏢', roofColor = 0x888888 }) {
  const h = floorHeight(floors);
  const perFloor = h / floors;
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  body.userData = { name, desc, icon };
  group.add(body);
  clickable.push(body);

  const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.6, d + 0.6), getMat(roofColor));
  roofSlab.position.y = h + 0.3;
  roofSlab.castShadow = true;
  group.add(roofSlab);

  const parW = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.8, 0.3), getMat(0x999999));
  parW.position.y = h + 1;
  parW.position.z = d / 2 + 0.45;
  group.add(parW);
  const parW2 = parW.clone(); parW2.position.z = -d / 2 - 0.45; group.add(parW2);

  const parD = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, d + 0.6), getMat(0x999999));
  parD.position.y = h + 1; parD.position.x = w / 2 + 0.45; group.add(parD);
  const parD2 = parD.clone(); parD2.position.x = -w / 2 - 0.45; group.add(parD2);

  for (let f = 1; f < floors; f++) {
    const sep = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, 0.25, d + 0.15), getMat(0xaaaaaa));
    sep.position.y = perFloor * f;
    group.add(sep);
  }

  const colMat = getMat(0xbbbbbb);
  for (let cx of [-w / 2, w / 2]) {
    for (let cz of [-d / 2, d / 2]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.6, h + 0.6, 0.6), colMat);
      col.position.set(cx, h / 2, cz);
      group.add(col);
    }
  }

  const nWX = Math.max(2, Math.floor(w / 2.0));
  const nWZ = Math.max(1, Math.floor(d / 2.4));
  for (let fl = 0; fl < floors; fl++) {
    const wy = perFloor * fl + perFloor * 0.52;
    for (let col = 0; col < nWX; col++) {
      const wx = -w / 2 + (w / nWX) * (col + 0.5);
      const wf = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.78), winMat);
      wf.position.set(wx, wy, d / 2 + 0.01);
      group.add(wf);
      const wb = wf.clone(); wb.rotation.y = Math.PI; wb.position.z = -d / 2 - 0.01; group.add(wb);
    }
    for (let col = 0; col < nWZ; col++) {
      const wz = -d / 2 + (d / nWZ) * (col + 0.5);
      const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.78), winMat);
      wl.rotation.y = -Math.PI / 2; wl.position.set(-w / 2 - 0.01, wy, wz); group.add(wl);
      const wr = wl.clone(); wr.rotation.y = Math.PI / 2; wr.position.x = w / 2 + 0.01; group.add(wr);
    }
  }

  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.5), doorMat);
  door.position.set(0, 1.25, d / 2 + 0.02);
  group.add(door);

  const dfMat = getMat(0x6a5030);
  const dfL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.6, 0.08), dfMat);
  dfL.position.set(-0.75, 1.3, d / 2 + 0.02); group.add(dfL);
  const dfR = dfL.clone(); dfR.position.x = 0.75; group.add(dfR);
  const dfT = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.15, 0.08), dfMat);
  dfT.position.set(0, 2.6, d / 2 + 0.02); group.add(dfT);

  group.position.set(x, 0, z);
  scene.add(group);
  return group;
}

export function createBuildings() {
  addBuilding({
    x: 15, z: 25, w: 14, d: 9, floors: 2, color: 0xcdd8e8,
    name: 'IT Cell', icon: '💻',
    desc: '2-floor building housing the University IT Department. Manages computer labs, internet infrastructure, digital resources, university website, and all technical services for the campus.'
  });

  addBuilding({
    x: -28, z: 17, w: 30, d: 17, floors: 3, color: 0xc8d4e6, roofColor: 0x7a8a99,
    name: 'Main Academic Building', icon: '🎓',
    desc: 'The largest building on campus with 3 floors. Houses primary lecture halls, major departments (Arts, Commerce, Science), Examination Cell, and core administrative offices. Most regular classes are conducted here.'
  });

  addBuilding({
    x: 18, z: 42, w: 20, d: 11, floors: 1, color: 0xd0e8c8,
    name: 'Agriculture Block', icon: '🌾',
    desc: 'Single-floor building dedicated to the Agriculture Department. Features modern classrooms, soil science lab, botanical garden access, agronomy practical rooms, and a herbarium section.'
  });

  addBuilding({
    x: -13, z: 54, w: 24, d: 15, floors: 2, color: 0xe8d8ba, roofColor: 0x8a7a5a,
    name: 'Multipurpose Hall (Sabhagaar)', icon: '🎭',
    desc: 'Grand multipurpose auditorium. Used for Annual Convocations, cultural festivals, seminars, guest lectures, and university events. Features a large stage, podium, and seating capacity for 500+ attendees.'
  });

  addBuilding({
    x: 6, z: 67, w: 16, d: 11, floors: 2, color: 0xc5d4ee,
    name: 'Central Library', icon: '📚',
    desc: '2-floor central library with over 50,000 books, research journals, periodicals, and digital resources. Features a spacious reading hall, e-library section, reference section, and a separate newspaper/magazine area.'
  });

  addBuilding({
    x: 20, z: 65, w: 12, d: 8, floors: 1, color: 0xf0e4c0,
    name: 'University Canteen', icon: '🍽️',
    desc: 'Main canteen serving affordable vegetarian meals, snacks, samosas, tea, coffee, and cold drinks. A popular hangout spot for students. Open from 8 AM to 7 PM on working days.'
  });

  addBuilding({
    x: 40, z: 34, w: 12, d: 10, floors: 4, color: 0xd8cce4,
    name: 'Student Hostel', icon: '🏠',
    desc: '4-floor hostel building providing accommodation for outstation students. Features single and double occupancy rooms, common room, study hall, reading area, warden cabin, and basic kitchen facilities.'
  });

  addBuilding({
    x: -42, z: 62, w: 14, d: 11, floors: 2, color: 0xf0e8d5, roofColor: 0x8a7a5a,
    name: "Vice Chancellor's Residence", icon: '🏡',
    desc: 'Official bungalow of the Honourable Vice Chancellor. Located in a peaceful, well-landscaped corner of the campus with a private garden and security post.'
  });

  addBuilding({
    x: -28, z: 38, w: 18, d: 10, floors: 2, color: 0xd2dcea,
    name: 'Administrative Block', icon: '🏛️',
    desc: 'Houses Registrar office, Accounts & Finance department, Examination Cell, Scholarship Wing, Student Affairs office, and other key administrative services of the university.'
  });

  addBuilding({
    x: 22, z: 56, w: 13, d: 9, floors: 2, color: 0xd0e8da,
    name: 'Science Block', icon: '🔬',
    desc: 'Dedicated to Physics, Chemistry, Botany, and Zoology departments. Equipped with modern laboratories, fume hoods, research benches, and departmental faculty cabins.'
  });

  addBuilding({
    x: -42, z: 22, w: 9, d: 9, floors: 2, color: 0xe4d8c8,
    name: 'Faculty Block', icon: '👨‍🏫',
    desc: 'Houses faculty offices, staff rooms, and departmental head cabins. Staff can meet students, conduct tutorials, and hold departmental meetings here.'
  });

  addBuilding({
    x: -42, z: 40, w: 9, d: 8, floors: 1, color: 0xdde0d0,
    name: 'NCC / NSS Block', icon: '🎖️',
    desc: 'Dedicated facility for NCC and NSS units of the university. Used for drill practice, training sessions, community service coordination, and cadet activities.'
  });
}
