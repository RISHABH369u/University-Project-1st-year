/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                  objects-registry.js                                    ║
 * ║  Yahan apne SAARE objects add karo.                                     ║
 * ║  DevTool automatically inhe library panel mein show karega.             ║
 * ║                                                                          ║
 * ║  Har object mein ye fields honi chahiye:                                ║
 * ║    key    → unique string id  (e.g. 'my_building')                      ║
 * ║    icon   → emoji for library  (e.g. '🏢')                             ║
 * ║    label  → display name       (e.g. 'Office Block')                    ║
 * ║    group  → panel group name   (e.g. 'Buildings')                       ║
 * ║    spawn  → (x, z) => mesh     actually places object in scene          ║
 * ║    code   → (pos, rot, scale) => string  generates save code            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import * as THREE from 'three';
import { scene } from './scene.js';

// ── Apne utility/builder functions yahan import karo ──────────────────────
import { mkGulmohar, 
  mkPeepal, 
  mkNeem, 
  mkMango, 
  mkPalm, 
  mkBamboo, 
  mkAshoka, 
  mkBanyan}  from './utils/trees.js';

import { mkStreetLight }         from './utils/lights.js';
import { 
  mkBench, 
  mkCar, 
  mkStreetLamp, 
  mkBin, 
  mkBulletinBoard, 
  mkFountain, 
  mkTree, 
  mkBikeRack, 
  mkBike, 
  mkFlagPole, 
  mkPicnicTable, 
  mkVendingMachine, 
  mkBusShelter, 
  mkStatue, 
  mkFireHydrant, 
  mkBollard, 
  mkSignpost, 
  mkPaperStand, 
  mkBusStopPole, 
  mkAutoRickshaw, 
  mkWaterCooler, 
  mkSpeedBump,  }        from './utils/props.js';
  
import { mkWall }                from './utils/wall.js';


import {
  mkRoadTile,
  mkDividerTile,
  mkHighMastLight,
  mkDoubleHighMast,
  mkPaintedCurbRow,
  mkCampusIntersection,
  mkCampusZebra,
  mkCampusSpeedBump,
} from './utils/roads.js';
 


// ── Apne custom buildings/objects import karo (examples) ──────────────────
 import { addHollowBuilding, addAdminBuilding, addRightBlock, addMainGate, addSportsCourt, addCanteen,createBuildings, addMainAcademicBlock }     from './utils/buildings.js';
// import { mkBus, mkTruck, mkScooter }     from './utils/vehicles.js';
// import { mkLamp, mkSignBoard, mkFence }  from './utils/street.js';
// import { mkPark, mkFountain, mkBench2 }  from './utils/park.js';


// ════════════════════════════════════════════════════════════════════════════
//  REGISTRY — apne objects yahan add karte jao
//  Ek entry ka format:
//
//  {
//    key:   'unique_id',           // sirf lowercase letters, underscore allowed
//    icon:  '🏢',                 // emoji jo library mein dikhega
//    label: 'My Building',        // naam jo panel mein dikhega
//    group: 'Buildings',          // category (Trees / Vehicles / Buildings / etc.)

//    spawn: (x, z) => {
//      // object banao aur scene mein add karo (tumhara existing function call)
//      // ZARURI: ek THREE.Object3D / THREE.Group return karo
//      return mkMyBuilding(x, z);
//    },

//    code: (pos, rot, scale) => {
//      // Woh code string return karo jo file mein save hogi
//      pos   = { x, y, z }  (snapped & formatted position)
//      rot   = THREE.Euler  (radians)
//      scale = THREE.Vector3
//      return `mkMyBuilding(${pos.x}, ${pos.z});`;
//    },
//  }
// //
// ════════════════════════════════════════════════════════════════════════════

export const OBJECT_REGISTRY = [

  // ──────────────────────────────────────────────────────────────────────────
  // 🌳  TREES
  // ──────────────────────────────────────────────────────────────────────────
  {
    key:   'gulmohar',
    icon:  '🌳',
    label: 'Gulmohar',
    group: 'Trees',
    spawn: (x, z) => mkGulmohar(x, z, 0.85),
    code:  (pos, rot, scale) => `mkGulmohar(${pos.x}, ${pos.z}, ${scale.x.toFixed(2)});`,
  },
  {
    key:   'peepal',
    icon:  '🌲',
    label: 'Peepal',
    group: 'Trees',
    spawn: (x, z) => mkPeepal(x, z, 0.9),
    code:  (pos, rot, scale) => `mkPeepal(${pos.x}, ${pos.z}, ${scale.x.toFixed(2)});`,
  },
  {
    key:   'neem',
    icon:  '🌿',
    label: 'Neem',
    group: 'Trees',
    spawn: (x, z) => mkNeem(x, z, 0.9),
    code:  (pos, rot, scale) => `mkNeem(${pos.x}, ${pos.z}, ${scale.x.toFixed(2)});`,
  },
    {
    key:   'mango',
    icon:  '🥭',
    label: 'Mango',
    group: 'Trees',
    spawn: (x, z) => mkMango(x, z, 0.9),
    code:  (pos, rot, scale) => `mkMango(${pos.x}, ${pos.z}, ${scale.x.toFixed(2)});`,
  },
    {
    key:   'palm',
    icon:  '🌴',
    label: 'Palm',
    group: 'Trees',
    spawn: (x, z) => mkPalm(x, z, 0.9),
    code:  (pos, rot, scale) => `mkPalm(${pos.x}, ${pos.z}, ${scale.x.toFixed(2)});`,
  },
    {
    key:   'bamboo',
    icon:  '🎍',
    label: 'Bamboo',
    group: 'Trees',
    spawn: (x, z) => mkBamboo(x, z, 0.9),
    code:  (pos, rot, scale) => `mkBamboo(${pos.x}, ${pos.z}, ${scale.x.toFixed(2)});`,
  },
    {
    key:   'ashoka',
    icon:  '🌸',
    label: 'Ashoka',
    group: 'Trees',
    spawn: (x, z) => mkAshoka(x, z, 0.9),
    code:  (pos, rot, scale) => `mkAshoka(${pos.x}, ${pos.z}, ${scale.x.toFixed(2)});`,
  },
    {
    key:   'banyan',
    icon:  '🌳',
    label: 'Banyan',
    group: 'Trees',
    spawn: (x, z) => mkBanyan(x, z, 0.9),
    code:  (pos, rot, scale) => `mkBanyan(${pos.x}, ${pos.z}, ${scale.x.toFixed(2)});`,
  },


  // ── Roads ─────────────────────────────────────────────────────────────────
  {
    key:'road_tile', icon:'🛣', label:'Road (16u)', group:'Roads',
    spawn:(x,z)=>mkRoadTile(x,z,0),
    code:(pos,rot)=>`mkRoadTile(${pos.x},${pos.z},${rot.y.toFixed(3)});`,
  },
  {
    key:'road_tile_h', icon:'↔', label:'Road Horizontal', group:'Roads',
    spawn:(x,z)=>mkRoadTile(x,z,Math.PI/2),
    code:(pos,rot)=>`mkRoadTile(${pos.x},${pos.z},${rot.y.toFixed(3)});`,
  },
  {
    key:'road_intersection', icon:'✛', label:'Intersection', group:'Roads',
    spawn:(x,z)=>mkCampusIntersection(x,z),
    code:(pos)=>`mkCampusIntersection(${pos.x},${pos.z});`,
  },
  {
    key:'road_zebra', icon:'🦓', label:'Zebra Crossing', group:'Roads',
    spawn:(x,z)=>mkCampusZebra(x,z,0),
    code:(pos,rot)=>`mkCampusZebra(${pos.x},${pos.z},${rot.y.toFixed(3)});`,
  },
  {
    key:'road_speedbump', icon:'〰', label:'Speed Bump', group:'Roads',
    spawn:(x,z)=>mkCampusSpeedBump(x,z,0),
    code:(pos,rot)=>`mkCampusSpeedBump(${pos.x},${pos.z},${rot.y.toFixed(3)});`,
  },
 
  // ── Dividers ──────────────────────────────────────────────────────────────
  {
    key:'divider_tile', icon:'🟩', label:'Divider (16u)', group:'Dividers',
    spawn:(x,z)=>mkDividerTile(x,z,0),
    code:(pos,rot)=>`mkDividerTile(${pos.x},${pos.z},${rot.y.toFixed(3)});`,
  },
  {
    key:'divider_tile_h', icon:'↔', label:'Divider Horiz', group:'Dividers',
    spawn:(x,z)=>mkDividerTile(x,z,Math.PI/2),
    code:(pos,rot)=>`mkDividerTile(${pos.x},${pos.z},${rot.y.toFixed(3)});`,
  },
  {
    key:'curb_row', icon:'▪', label:'Painted Curb Row', group:'Dividers',
    spawn:(x,z)=>mkPaintedCurbRow(x,z,0),
    code:(pos,rot)=>`mkPaintedCurbRow(${pos.x},${pos.z},${rot.y.toFixed(3)});`,
  },
 
  // ── Lights ────────────────────────────────────────────────────────────────
  {
    key:'high_mast_light', icon:'🏮', label:'High-Mast Light', group:'Lights',
    spawn:(x,z)=>mkHighMastLight(x,z,0),
    code:(pos,rot)=>`mkHighMastLight(${pos.x},${pos.z},${rot.y.toFixed(3)});`,
  },
  {
    key:'double_mast_light', icon:'💡', label:'Double Mast Light', group:'Lights',
    spawn:(x,z)=>mkDoubleHighMast(x,z,0),
    code:(pos,rot)=>`mkDoubleHighMast(${pos.x},${pos.z},${rot.y.toFixed(3)});`,
  },
  {
    key:'streetlight', icon:'🕯', label:'Street Light', group:'Lights',
    spawn:(x,z)=>mkStreetLight(x,z),
    code:(pos)=>`mkStreetLight(${pos.x},${pos.z});`,
  },
  // ──────────────────────────────────────────────────────────────────────────
  // 💡  LIGHTS / STREET FURNITURE
  // ──────────────────────────────────────────────────────────────────────────
  {
    key:   'streetlight',
    icon:  '💡',
    label: 'Street Light',
    group: 'Street',
    spawn: (x, z) => mkStreetLight(x, z),
    code:  (pos) => `mkStreetLight(${pos.x}, ${pos.z});`,
  },
  {
    key:   'bench',
    icon:  '🪑',
    label: 'Bench',
    group: 'Street',
    spawn: (x, z) => mkBench(x, z, 0),
    code:  (pos, rot) => `mkBench(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
  {
    key:   'streetlamp',
    icon:  '💡',
    label: 'Street Lamp',
    group: 'Street',
    spawn: (x, z) => mkStreetLamp(x, z, 0),
    code:  (pos, rot) => `mkStreetLamp(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
    {
    key:   'bin',
    icon:  '🗑',
    label: 'Dust Bin',
    group: 'Street',
    spawn: (x, z) => mkBin(x, z, 0),
    code:  (pos, rot) => `mkBin(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
    },
    {
    key:   'bulletin_board',
    icon:  '📋',
    label: 'Bulletin Board',
    group: 'Street',
    spawn: (x, z) => mkBulletinBoard(x, z, 0),
    code:  (pos, rot) => `mkBulletinBoard(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
    {
    key:   'fountain',
    icon:  '⛲',
    label: 'Fountain',
    group: 'Street',
    spawn: (x, z) => mkFountain(x, z, 0),
    code:  (pos, rot) => `mkFountain(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
    {
    key:   'bike_rack',
    icon:  '🚲',
    label: 'Bike Rack',
    group: 'Street',
    spawn: (x, z) => mkBikeRack(x, z, 0),
    code:  (pos, rot) => `mkBikeRack(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
    {
    key:   'bike',
    icon:  '🚲',
    label: 'Bike',
    group: 'Street',
    spawn: (x, z) => mkBike(x, z, 0),
    code:  (pos, rot) => `mkBike(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
    {
    key:   'flag_pole',
    icon:  '🚩',
    label: 'Flag Pole',
    group: 'Street',
    spawn: (x, z) => mkFlagPole(x, z, 0),
    code:  (pos, rot) => `mkFlagPole(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
    {
    key:   'picnic_table',
    icon:  '🪑',
    label: 'Picnic Table',
    group: 'Street',
    spawn: (x, z) => mkPicnicTable(x, z, 0),
    code:  (pos, rot) => `mkPicnicTable(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
    {
    key:   'vending_machine',
    icon:  '🥤',
    label: 'Vending Machine',
    group: 'Street',
    spawn: (x, z) => mkVendingMachine(x, z, 0),
    code:  (pos, rot) => `mkVendingMachine(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
    {
    key:   'bus_shelter',
    icon:  '🚏',
    label: 'Bus Shelter',
    group: 'Street',
    spawn: (x, z) => mkBusShelter(x, z, 0),
    code:  (pos, rot) => `mkBusShelter(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
    {
    key:   'statue',
    icon:  '🗿',
    label: 'Statue',
    group: 'Street',
    spawn: (x, z) => mkStatue(x, z, 0),
    code:  (pos, rot) => `mkStatue(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
    {
    key:   'fire_hydrant',
    icon:  '🚒',
    label: 'Fire Hydrant',
    group: 'Street',
    spawn: (x, z) => mkFireHydrant(x, z, 0),
    code:  (pos, rot) => `mkFireHydrant(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
    {
    key:   'bollard',
    icon:  '🟤',
    label: 'Bollard',
    group: 'Street',
    spawn: (x, z) => mkBollard(x, z, 0),
    code:  (pos, rot) => `mkBollard(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
    {
    key:   'signpost',
    icon:  '🪧',
    label: 'Signpost',
    group: 'Street',
    spawn: (x, z) => mkSignpost(x, z, 0),
    code:  (pos, rot) => `mkSignpost(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
    {
    key:   'paper_stand',
    icon:  '🗞',
    label: 'Paper Stand',
    group: 'Street',
    spawn: (x, z) => mkPaperStand(x, z, 0),
    code:  (pos, rot) => `mkPaperStand(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
    {
    key:   'bus_stop_pole',
    icon:  '🚏',
    label: 'Bus Stop Pole',
    group: 'Street',
    spawn: (x, z) => mkBusStopPole(x, z, 0),
    code:  (pos, rot) => `mkBusStopPole(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
    {
    key:   'auto_rickshaw',
    icon:  '🛺',
    label: 'Auto Rickshaw',
    group: 'Street',
    spawn: (x, z) => mkAutoRickshaw(x, z, 0),
    code:  (pos, rot) => `mkAutoRickshaw(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
    {

    key:   'water_cooler',
    icon:  '💧',
    label: 'Water Cooler',
    group: 'Street',
    spawn: (x, z) => mkWaterCooler(x, z, 0),
    code:  (pos, rot) => `mkWaterCooler(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
    
  
// ────────────────────────────────────────────────────────────────────
  // 🛣  ROADS
  // ────────────────────────────────────────────────────────────────────
  {
    key:   'road_straight',
    icon:  '🛣',
    label: 'Road (Straight)',
    group: 'Roads',
    spawn: (x, z) => mkRoadStraight(x, z, 0),
    code:  (pos, rot) => `mkRoadStraight(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
  {
    key:   'road_intersection',
    icon:  '✛',
    label: 'Road (4-Way)',
    group: 'Roads',
    spawn: (x, z) => mkRoadIntersection(x, z),
    code:  (pos) => `mkRoadIntersection(${pos.x}, ${pos.z});`,
  },
  {
    key:   'road_t_intersection',
    icon:  '⊤',
    label: 'Road (T-Junction)',
    group: 'Roads',
    spawn: (x, z) => mkRoadTIntersection(x, z, 0),
    code:  (pos, rot) => `mkRoadTIntersection(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
  {
    key:   'road_corner',
    icon:  '↰',
    label: 'Road (Corner)',
    group: 'Roads',
    spawn: (x, z) => mkRoadCorner(x, z, 0),
    code:  (pos, rot) => `mkRoadCorner(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
  {
    key:   'footpath',
    icon:  '🚶',
    label: 'Footpath',
    group: 'Roads',
    spawn: (x, z) => mkFootpath(x, z, 0),
    code:  (pos, rot) => `mkFootpath(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
  {
    key:   'zebra_crossing',
    icon:  '🦓',
    label: 'Zebra Crossing',
    group: 'Roads',
    spawn: (x, z) => mkZebraCrossing(x, z, 0),
    code:  (pos, rot) => `mkZebraCrossing(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
  {
    key:   'speed_bump',
    icon:  '〰',
    label: 'Speed Bump',
    group: 'Roads',
    spawn: (x, z) => mkSpeedBump(x, z, 0),
    code:  (pos, rot) => `mkSpeedBump(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
  {
    key:   'road_divider',
    icon:  '🌿',
    label: 'Road Divider',
    group: 'Roads',
    spawn: (x, z) => mkRoadDivider(x, z, 0),
    code:  (pos, rot) => `mkRoadDivider(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
  {
    key:   'roundabout',
    icon:  '🔄',
    label: 'Roundabout',
    group: 'Roads',
    spawn: (x, z) => mkRoundabout(x, z),
    code:  (pos) => `mkRoundabout(${pos.x}, ${pos.z});`,
  },
  {
    key:   'lane_arrow',
    icon:  '⬆',
    label: 'Lane Arrow',
    group: 'Roads',
    spawn: (x, z) => mkLaneArrow(x, z, 0),
    code:  (pos, rot) => `mkLaneArrow(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
  {
    key:   'curb_row',
    icon:  '🟥',
    label: 'Curb (Red/White)',
    group: 'Roads',
    spawn: (x, z) => mkCurbRow(x, z, 0),
    code:  (pos, rot) => `mkCurbRow(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
  {
    key:   'manhole',
    icon:  '⭕',
    label: 'Manhole Cover',
    group: 'Roads',
    spawn: (x, z) => mkManhole(x, z),
    code:  (pos) => `mkManhole(${pos.x}, ${pos.z});`,
  },
 
  // ────────────────────────────────────────────────────────────────────
  // 🌿  GREENERY
  // ────────────────────────────────────────────────────────────────────
  {
    key:   'grass_strip',
    icon:  '🌿',
    label: 'Grass Strip',
    group: 'Greenery',
    spawn: (x, z) => mkGrassStrip(x, z, 0),
    code:  (pos, rot) => `mkGrassStrip(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
  {
    key:   'hedge_row',
    icon:  '🌳',
    label: 'Hedge Row',
    group: 'Greenery',
    spawn: (x, z) => mkHedgeRow(x, z, 0),
    code:  (pos, rot) => `mkHedgeRow(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
  {
    key:   'bush',
    icon:  '🌿',
    label: 'Bush',
    group: 'Greenery',
    spawn: (x, z) => mkBush(x, z, 1.0),
    code:  (pos, rot, scale) => `mkBush(${pos.x}, ${pos.z}, ${scale.x.toFixed(2)});`,
  },
  {
    key:   'flower_bed',
    icon:  '🌸',
    label: 'Flower Bed',
    group: 'Greenery',
    spawn: (x, z) => mkFlowerBed(x, z, 0),
    code:  (pos, rot) => `mkFlowerBed(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
 
  // ────────────────────────────────────────────────────────────────────
  // 🚧  ROAD SAFETY / BARRIERS
  // ────────────────────────────────────────────────────────────────────
  {
    key:   'traffic_cone',
    icon:  '🚧',
    label: 'Traffic Cone',
    group: 'Safety',
    spawn: (x, z) => mkTrafficCone(x, z),
    code:  (pos) => `mkTrafficCone(${pos.x}, ${pos.z});`,
  },
  {
    key:   'road_barrier',
    icon:  '🚧',
    label: 'Jersey Barrier',
    group: 'Safety',
    spawn: (x, z) => mkRoadBarrier(x, z, 0),
    code:  (pos, rot) => `mkRoadBarrier(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
  {
    key:   'barrier_row',
    icon:  '🚧',
    label: 'Barrier Row (x4)',
    group: 'Safety',
    spawn: (x, z) => mkBarrierRow(x, z, 0),
    code:  (pos, rot) => `mkBarrierRow(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },
  {
    key:   'guard_booth',
    icon:  '🛂',
    label: 'Guard Booth',
    group: 'Safety',
    spawn: (x, z) => mkGuardBooth(x, z, 0),
    code:  (pos, rot) => `mkGuardBooth(${pos.x}, ${pos.z}, ${rot.y.toFixed(3)});`,
  },



  // ──────────────────────────────────────────────────────────────────────────
  // 🚗  VEHICLES
  // ──────────────────────────────────────────────────────────────────────────
  {
    key:   'car_red',
    icon:  '🚗',
    label: 'Car (Red)',
    group: 'Vehicles',
    spawn: (x, z) => mkCar(x, z, 0xcc3333),
    code:  (pos) => `mkCar(${pos.x}, ${pos.z}, 0xcc3333);`,
  },
  {
    key:   'car_blue',
    icon:  '🚙',
    label: 'Car (Blue)',
    group: 'Vehicles',
    spawn: (x, z) => mkCar(x, z, 0x3355cc),
    code:  (pos) => `mkCar(${pos.x}, ${pos.z}, 0x3355cc);`,
  },
  {
    key:   'car_white',
    icon:  '🚐',
    label: 'Car (White)',
    group: 'Vehicles',
    spawn: (x, z) => mkCar(x, z, 0xffffff),
    code:  (pos) => `mkCar(${pos.x}, ${pos.z}, 0xffffff);`,
  },


  // ══════════════════════════════════════════════════════════════════════════
  //  APNE OBJECTS YAHAN NEECHE ADD KARO
  //  Bas ek block copy karo, apna function naam aur params badlo
  // ══════════════════════════════════════════════════════════════════════════

  // ──────────────────────────────────────────────────────────────────────────
  // 🏠  BUILDINGS  (import uncomment karo upar se pehle)
  // ──────────────────────────────────────────────────────────────────────────

    // ──────────────────────────────────────────────────────────────────────────
  // 🏠  BUILDINGS
  // ──────────────────────────────────────────────────────────────────────────
  {
    key: 'hollow_building',
    icon: '🏠',
    label: 'Hollow Building',
    group: 'Buildings',
    spawn: (x, z) => {
      const g = new THREE.Group();
      // Provide default dimensions for a hollow building (e.g., ow=72, od=55, ww=11, floors=4)
      addHollowBuilding(g, x, z, 72, 55, 11, 4, { name: 'Hollow Building' });
      scene.add(g);
      return g;
    },
    code: (pos) => `addHollowBuilding(g, ${pos.x}, ${pos.z}, 72, 55, 11, 4);`,
  },
    {
    key: 'main_academic_block',
    icon: '🏫',
    label: 'Main Academic Block',
    group: 'Buildings',
    spawn: (x, z) => {
      const g = new THREE.Group();
      addMainAcademicBlock(g, x, z);
      scene.add(g);
      return g;
    },
    code: (pos) => `addMainAcademicBlock(g, ${pos.x}, ${pos.z});`,
  },
    {
    key: 'admin_building',
    icon: '🏢',
    label: 'Admin Building',
    group: 'Buildings',
    spawn: (x, z) => {
      const g = new THREE.Group();
      addAdminBuilding(g, x, z);
      scene.add(g);
      return g;
    },
    code: (pos) => `addAdminBuilding(g, ${pos.x}, ${pos.z});`,
  },
    {
    key: 'right_block',
    icon: '🏢',
    label: 'Right Block',
    group: 'Buildings',
    spawn: (x, z) => {
      const g = new THREE.Group();
      addRightBlock(g, x, z);
      scene.add(g);
      return g;
    },
    code: (pos) => `addRightBlock(g, ${pos.x}, ${pos.z});`,
  },
    {
    key: 'main_gate',
    icon: '🚪',
    label: 'Main Gate',
    group: 'Buildings',
    spawn: (x, z) => {
      const g = new THREE.Group();
      addMainGate(g, x, z);
      scene.add(g);
      return g;
    },
    code: (pos) => `addMainGate(g, ${pos.x}, ${pos.z});`,
  },
    {
    key: 'sports_court',
    icon: '🏀',
    label: 'Sports Court',
    group: 'Buildings',
    spawn: (x, z) => {
      const g = new THREE.Group();
      addSportsCourt(g, x, z);
      scene.add(g);
      return g;
    },
    code: (pos) => `addSportsCourt(g, ${pos.x}, ${pos.z});`,
  },
    {
    key: 'canteen',
    icon: '🍽',
    label: 'Canteen',
    group: 'Buildings',
    spawn: (x, z) => {
      const g = new THREE.Group();
      addCanteen(g, x, z);
      scene.add(g);
      return g;
    },
    code: (pos) => `addCanteen(g, ${pos.x}, ${pos.z});`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 🚌  MORE VEHICLES
  // ──────────────────────────────────────────────────────────────────────────

  // {
  //   key:   'bus',
  //   icon:  '🚌',
  //   label: 'Bus',
  //   group: 'Vehicles',
  //   spawn: (x, z) => mkBus(x, z),
  //   code:  (pos, rot) => `mkBus(${pos.x}, ${pos.z});`,
  // },

  // {
  //   key:   'truck',
  //   icon:  '🚚',
  //   label: 'Truck',
  //   group: 'Vehicles',
  //   spawn: (x, z) => mkTruck(x, z),
  //   code:  (pos, rot) => `mkTruck(${pos.x}, ${pos.z});`,
  // },

  // {
  //   key:   'scooter',
  //   icon:  '🛵',
  //   label: 'Scooter',
  //   group: 'Vehicles',
  //   spawn: (x, z) => mkScooter(x, z),
  //   code:  (pos, rot) => `mkScooter(${pos.x}, ${pos.z});`,
  // },

  // ──────────────────────────────────────────────────────────────────────────
  // 🌳  MORE NATURE / PARK
  // ──────────────────────────────────────────────────────────────────────────

  // {
  //   key:   'fountain',
  //   icon:  '⛲',
  //   label: 'Fountain',
  //   group: 'Park',
  //   spawn: (x, z) => mkFountain(x, z),
  //   code:  (pos) => `mkFountain(${pos.x}, ${pos.z});`,
  // },

  // {
  //   key:   'park_lamp',
  //   icon:  '🕯',
  //   label: 'Park Lamp',
  //   group: 'Park',
  //   spawn: (x, z) => mkLamp(x, z),
  //   code:  (pos) => `mkLamp(${pos.x}, ${pos.z});`,
  // },

  // ──────────────────────────────────────────────────────────────────────────
  // 🚧  MISC / PROPS
  // ──────────────────────────────────────────────────────────────────────────

  // {
  //   key:   'sign_board',
  //   icon:  '🪧',
  //   label: 'Sign Board',
  //   group: 'Props',
  //   spawn: (x, z) => mkSignBoard(x, z, 'STOP'),
  //   code:  (pos, rot) => `mkSignBoard(${pos.x}, ${pos.z}, 'STOP');`,
  // },

  // {
  //   key:   'fence_wood',
  //   icon:  '🪵',
  //   label: 'Wooden Fence',
  //   group: 'Props',
  //   spawn: (x, z) => mkFence(x, z, 'wood'),
  //   code:  (pos, rot, scale) => `mkFence(${pos.x}, ${pos.z}, 'wood');`,
  // },

];

export const DRAWABLE_TYPES = {
  road: {
    icon: '🛣', label: 'Draw Road',
    color: 0x4d9eff,
    fn: 'mkCampusRoad',
    // Import karo apne devtool ya main.js mein
    // import { mkCampusRoad } from './utils/roads.js';
  },
  divider: {
    icon: '🟩', label: 'Draw Divider',
    color: 0x6aab28,
    fn: 'mkCampusDivider',
  },
};


// ════════════════════════════════════════════════════════════════════════════
//  HELPER: registry ko key-based map mein convert karta hai (devtool use karta hai)
// ════════════════════════════════════════════════════════════════════════════

export function buildObjDefs() {
  const map = {};
  for (const entry of OBJECT_REGISTRY) {
    if (!entry.key || !entry.spawn || !entry.code) {
      console.warn(`[Registry] Object missing required fields:`, entry);
      continue;
    }
    map[entry.key] = {
      icon:  entry.icon  || '⬛',
      label: entry.label || entry.key,
      group: entry.group || 'Misc',
      spawn: entry.spawn,
      code:  entry.code,
    };
  }
  return map;
}
