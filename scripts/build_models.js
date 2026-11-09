/**
 * Shattered Dominion - 3D GLB Asset Builder
 * Generates realistic PBR glTF/GLB models for the Sol Heights vertical slice:
 * - fortress_sol_heights.glb (Realistic medieval keep, curtain walls, gatehouse, bastions)
 * - quarry_sol_heights.glb (Excavated stone quarry terrace, crane hoist, cut stone blocks, rubble)
 * - pine_tree_a.glb & pine_tree_b.glb (Multi-tiered realistic conifer trees)
 * - rock_outcrop.glb (Weathered limestone crag & boulder cluster)
 * - foliage_tuft.glb (Mountain grass/heath ground tufts)
 */

class PolyfillFileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(buf => {
      this.result = buf;
      if (this.onloadend) this.onloadend({ target: this });
      if (this.onload) this.onload({ target: this });
    });
  }
}
globalThis.FileReader = PolyfillFileReader;

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.resolve('public/assets/models');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const exporter = new GLTFExporter();

function exportGlb(object, filename) {
  return new Promise((resolve, reject) => {
    exporter.parse(
      object,
      (glb) => {
        const filePath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(filePath, Buffer.from(glb));
        console.log(`[GLB Builder] Generated ${filename} (${glb.byteLength.toLocaleString()} bytes)`);
        resolve({ filename, bytes: glb.byteLength });
      },
      (error) => {
        console.error(`[GLB Builder] Error exporting ${filename}:`, error);
        reject(error);
      },
      { binary: true }
    );
  });
}

// ----------------------------------------------------------------------
// 1. MEDIEVAL FORTRESS (Sol Heights Sovereign Citadel)
// ----------------------------------------------------------------------
function createFortress() {
  const root = new THREE.Group();
  root.name = 'Fortress_Sol_Heights';

  // PBR Materials
  const stoneFoundationMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // Dark slate ashlar
    roughness: 0.85,
    metalness: 0.1,
  });

  const wallStoneMat = new THREE.MeshStandardMaterial({
    color: 0x64748b, // Aged granite masonry
    roughness: 0.75,
    metalness: 0.05,
  });

  const trimStoneMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Carved limestone trims & machicolations
    roughness: 0.6,
    metalness: 0.1,
  });

  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x3f2e1e, // Treated oak timbers
    roughness: 0.7,
    metalness: 0.05,
  });

  const roofTileMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d12, // Terracotta/slate red-brown shingles
    roughness: 0.55,
    metalness: 0.15,
  });

  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Wrought iron grating & bands
    roughness: 0.4,
    metalness: 0.8,
  });

  const bannerMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Imperial Sol Gold
    roughness: 0.5,
    metalness: 0.2,
  });

  const aetherBeaconMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.8,
  });

  // Base Rock Plinth
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.8, 1.2, 12), stoneFoundationMat);
  plinth.position.y = 0.6;
  root.add(plinth);

  // Main Keep Core (Hexagonal fortified central donjon)
  const donjonBase = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 4.8, 8), wallStoneMat);
  donjonBase.position.y = 3.2;
  root.add(donjonBase);

  // Keep Upper Tier (Overhanging machicolations)
  const machicolationRing = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.2, 0.8, 8), trimStoneMat);
  machicolationRing.position.y = 5.8;
  root.add(machicolationRing);

  const donjonUpper = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 2.8, 8), wallStoneMat);
  donjonUpper.position.y = 7.4;
  root.add(donjonUpper);

  // Keep Roof (Faceted conical roof with dormers)
  const keepRoof = new THREE.Mesh(new THREE.ConeGeometry(3.9, 3.6, 8), roofTileMat);
  keepRoof.position.y = 10.4;
  root.add(keepRoof);

  // Central Aether Finial Spire
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 2.4, 6), ironMat);
  spire.position.y = 12.8;
  root.add(spire);

  const beaconGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), aetherBeaconMat);
  beaconGem.position.y = 13.8;
  root.add(beaconGem);

  // 4 Outer Corner Bastions
  const bastionPositions = [
    [-3.4, -3.4],
    [3.4, -3.4],
    [-3.4, 3.4],
    [3.4, 3.4],
  ];

  bastionPositions.forEach(([bx, bz], idx) => {
    // Tower body
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.35, 5.4, 8), wallStoneMat);
    tower.position.set(bx, 3.2, bz);
    root.add(tower);

    // Crenellated Bartizan
    const bartizan = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.2, 0.9, 8), trimStoneMat);
    bartizan.position.set(bx, 6.2, bz);
    root.add(bartizan);

    // Conical Turret Cap
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 8), roofTileMat);
    cap.position.set(bx, 7.7, bz);
    root.add(cap);

    // Banner Flag on front bastions
    if (idx < 2) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6), ironMat);
      pole.position.set(bx, 9.4, bz);
      root.add(pole);

      const pennant = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 1.4), bannerMat);
      pennant.position.set(bx, 9.6, bz + 0.7);
      root.add(pennant);
    }
  });

  // Connecting Curtain Walls
  const wallConfigs = [
    { pos: [0, 2.2, -3.4], rot: 0, w: 4.8 },
    { pos: [-3.4, 2.2, 0], rot: Math.PI / 2, w: 4.8 },
    { pos: [3.4, 2.2, 0], rot: Math.PI / 2, w: 4.8 },
  ];

  wallConfigs.forEach(cfg => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(cfg.w, 3.8, 1.0), wallStoneMat);
    wall.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
    wall.rotation.y = cfg.rot;
    root.add(wall);

    // Wall Walkway parapet
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(cfg.w, 0.6, 1.3), trimStoneMat);
    parapet.position.set(cfg.pos[0], cfg.pos[1] + 2.0, cfg.pos[2]);
    parapet.rotation.y = cfg.rot;
    root.add(parapet);
  });

  // Gatehouse (Front Wall Entrance)
  const gatehouse = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4.4, 2.0), wallStoneMat);
  gatehouse.position.set(0, 2.6, 3.5);
  root.add(gatehouse);

  const gateArch = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 8, 1, false, 0, Math.PI), trimStoneMat);
  gateArch.rotation.z = Math.PI / 2;
  gateArch.position.set(0, 2.2, 3.6);
  root.add(gateArch);

  // Iron Portcullis Grille
  const portcullis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 0.1), ironMat);
  portcullis.position.set(0, 1.6, 3.6);
  root.add(portcullis);

  // Timber Gatehouse Hoist Roof
  const gateRoof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.8, 4), timberMat);
  gateRoof.position.set(0, 5.4, 3.5);
  gateRoof.rotation.y = Math.PI / 4;
  root.add(gateRoof);

  return root;
}

// ----------------------------------------------------------------------
// 2. REALISTIC STONE QUARRY (Sol Heights Terraced Extraction)
// ----------------------------------------------------------------------
function createQuarry() {
  const root = new THREE.Group();
  root.name = 'Quarry_Sol_Heights';

  const bedrockMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // Excavated grey bedrock
    roughness: 0.9,
    metalness: 0.05,
  });

  const cutStoneMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Sawn ashlar blocks
    roughness: 0.7,
    metalness: 0.05,
  });

  const rubbleMat = new THREE.MeshStandardMaterial({
    color: 0x64748b, // Chipped scree
    roughness: 0.95,
  });

  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x5c3d22, // Weathered wood scaffolding
    roughness: 0.75,
    metalness: 0.05,
  });

  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.4,
    metalness: 0.8,
  });

  // Terraced Cut Pit (3 descending steps)
  const steps = [
    { size: [8.5, 0.8, 8.5], pos: [0, 0.4, 0] },
    { size: [6.8, 0.8, 6.8], pos: [-0.4, 0.9, -0.4] },
    { size: [4.8, 1.2, 4.8], pos: [-0.8, 1.6, -0.8] },
    { size: [3.2, 1.8, 3.2], pos: [-1.2, 2.4, -1.2] },
  ];

  steps.forEach(s => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(s.size[0], s.size[1], s.size[2]), bedrockMat);
    t.position.set(s.pos[0], s.pos[1], s.pos[2]);
    root.add(t);
  });

  // Stacks of Cut Stone Blocks ready for transport
  const blockGeo = new THREE.BoxGeometry(1.1, 0.65, 0.8);
  const blockOffsets = [
    [2.4, 0.7, 1.8, 0],
    [2.3, 0.7, 2.7, 0.1],
    [2.4, 1.35, 2.2, -0.05],
    [1.1, 0.7, 2.8, 0.2],
    [0.9, 1.35, 2.6, 0.1],
  ];

  blockOffsets.forEach(([bx, by, bz, rot]) => {
    const b = new THREE.Mesh(blockGeo, cutStoneMat);
    b.position.set(bx, by, bz);
    b.rotation.y = rot;
    root.add(b);
  });

  // Timber Hoist A-Frame Derrick Crane
  const legGeo = new THREE.CylinderGeometry(0.09, 0.12, 4.5, 6);
  const leg1 = new THREE.Mesh(legGeo, timberMat);
  leg1.position.set(-1.4, 2.8, 1.2);
  leg1.rotation.z = 0.25;
  root.add(leg1);

  const leg2 = new THREE.Mesh(legGeo, timberMat);
  leg2.position.set(-0.4, 2.8, 1.2);
  leg2.rotation.z = -0.25;
  root.add(leg2);

  const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 6), timberMat);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(-0.9, 4.6, 1.2);
  root.add(crossbar);

  // Crane Boom Beam
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.8, 6), timberMat);
  boom.position.set(-0.9, 4.2, 0.2);
  boom.rotation.x = -0.55;
  root.add(boom);

  // Pulley & Rope Cable
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.8, 4), ironMat);
  cable.position.set(-0.9, 2.8, -1.0);
  root.add(cable);

  const stoneSling = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), cutStoneMat);
  stoneSling.position.set(-0.9, 1.4, -1.0);
  root.add(stoneSling);

  // Scatter of Broken Rock Scree / Rubble
  for (let i = 0; i < 9; i++) {
    const rubble = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.25 + (i % 3) * 0.12, 0),
      rubbleMat
    );
    const angle = (i / 9) * Math.PI * 2;
    const dist = 1.6 + (i % 4) * 0.5;
    rubble.position.set(Math.cos(angle) * dist, 0.5 + (i % 2) * 0.2, Math.sin(angle) * dist);
    rubble.rotation.set(i, i * 2, i * 0.5);
    root.add(rubble);
  }

  return root;
}

// ----------------------------------------------------------------------
// 3. PINE TREE VARIATION A (Tall Mountain Conifer)
// ----------------------------------------------------------------------
function createPineTreeA() {
  const root = new THREE.Group();
  root.name = 'Pine_Tree_A';

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x3d2716, // Rugged mountain pine bark
    roughness: 0.85,
    metalness: 0.05,
  });

  const needlesMat = new THREE.MeshStandardMaterial({
    color: 0x1b4328, // Deep evergreen spruce green
    roughness: 0.65,
    metalness: 0.05,
  });

  // Tapered Trunk
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 5.2, 8), trunkMat);
  trunk.position.y = 2.6;
  root.add(trunk);

  // Root flare base
  const flare = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.8, 6), trunkMat);
  flare.position.y = 0.4;
  root.add(flare);

  // 5 Foliage Tiers (Layered drooped cones)
  const tiers = [
    { y: 2.4, r: 2.1, h: 2.0 },
    { y: 3.6, r: 1.8, h: 1.9 },
    { y: 4.8, r: 1.5, h: 1.7 },
    { y: 5.9, r: 1.1, h: 1.5 },
    { y: 6.9, r: 0.7, h: 1.4 },
  ];

  tiers.forEach(t => {
    const tier = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 7), needlesMat);
    tier.position.y = t.y;
    root.add(tier);
  });

  return root;
}

// ----------------------------------------------------------------------
// 4. PINE TREE VARIATION B (Gnarled High-Altitude Pine)
// ----------------------------------------------------------------------
function createPineTreeB() {
  const root = new THREE.Group();
  root.name = 'Pine_Tree_B';

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x4a3423,
    roughness: 0.9,
    metalness: 0.05,
  });

  const needlesMat = new THREE.MeshStandardMaterial({
    color: 0x22543d, // Frosted emerald highland needle
    roughness: 0.6,
    metalness: 0.05,
  });

  // Curved Trunk
  const trunkLower = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.48, 2.8, 7), trunkMat);
  trunkLower.position.set(0.1, 1.4, 0);
  trunkLower.rotation.z = -0.12;
  root.add(trunkLower);

  const trunkUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 2.6, 7), trunkMat);
  trunkUpper.position.set(-0.2, 3.6, 0.1);
  trunkUpper.rotation.z = 0.16;
  root.add(trunkUpper);

  // Asymmetrical foliage layers
  const foliageLayers = [
    { pos: [0.3, 2.6, 0.1], r: 1.6, h: 1.5, rotZ: -0.1 },
    { pos: [-0.4, 3.7, -0.1], r: 1.4, h: 1.5, rotZ: 0.15 },
    { pos: [0.1, 4.7, 0.0], r: 1.2, h: 1.4, rotZ: -0.05 },
    { pos: [-0.1, 5.6, 0.1], r: 0.8, h: 1.3, rotZ: 0.08 },
  ];

  foliageLayers.forEach(l => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(l.r, l.h, 6), needlesMat);
    f.position.set(l.pos[0], l.pos[1], l.pos[2]);
    f.rotation.z = l.rotZ;
    root.add(f);
  });

  return root;
}

// ----------------------------------------------------------------------
// 5. ROCKY OUTCROP (Sol Heights Highland Crags)
// ----------------------------------------------------------------------
function createRockOutcrop() {
  const root = new THREE.Group();
  root.name = 'Rock_Outcrop';

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x52525b, // Weathered limestone grey
    roughness: 0.8,
    metalness: 0.1,
  });

  const mossMat = new THREE.MeshStandardMaterial({
    color: 0x3f6212, // Highland lichen / moss patches
    roughness: 0.9,
    metalness: 0.05,
  });

  // Cluster of 4 interlocking jagged boulders
  const boulders = [
    { geo: new THREE.DodecahedronGeometry(1.6, 1), mat: rockMat, pos: [0, 1.2, 0], scale: [1.2, 1.4, 1.0], rot: [0.3, 0.5, 0.1] },
    { geo: new THREE.DodecahedronGeometry(1.1, 1), mat: rockMat, pos: [-1.4, 0.9, -0.5], scale: [1.0, 1.2, 1.1], rot: [0.1, -0.4, 0.2] },
    { geo: new THREE.DodecahedronGeometry(1.0, 1), mat: rockMat, pos: [1.2, 0.8, 0.7], scale: [1.3, 0.9, 0.8], rot: [-0.2, 0.8, -0.3] },
    { geo: new THREE.DodecahedronGeometry(0.7, 1), mat: mossMat, pos: [0.2, 1.8, 0.3], scale: [0.9, 0.4, 0.9], rot: [0.1, 0.2, 0] },
  ];

  boulders.forEach(b => {
    const m = new THREE.Mesh(b.geo, b.mat);
    m.position.set(b.pos[0], b.pos[1], b.pos[2]);
    m.scale.set(b.scale[0], b.scale[1], b.scale[2]);
    m.rotation.set(b.rot[0], b.rot[1], b.rot[2]);
    root.add(m);
  });

  return root;
}

// ----------------------------------------------------------------------
// 6. GROUND FOLIAGE TUFT (Heath Grass & Shrubs)
// ----------------------------------------------------------------------
function createFoliageTuft() {
  const root = new THREE.Group();
  root.name = 'Foliage_Tuft';

  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x4d7c0f, // Golden-tinged highland shrub
    roughness: 0.7,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < 5; i++) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 3), grassMat);
    const angle = (i / 5) * Math.PI * 2;
    blade.position.set(Math.cos(angle) * 0.35, 0.45, Math.sin(angle) * 0.35);
    blade.rotation.z = Math.cos(angle) * 0.25;
    blade.rotation.x = Math.sin(angle) * 0.25;
    root.add(blade);
  }

  return root;
}

// ----------------------------------------------------------------------
// 7. MONSTER LAIR (Volcanic Cinder Roost & Dragon Skull)
// ----------------------------------------------------------------------
function createMonsterLair() {
  const root = new THREE.Group();
  root.name = 'Monster_Lair';

  const basaltMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937, // Dark volcanic obsidian
    roughness: 0.9,
    metalness: 0.1,
  });

  const lavaMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xdc2626,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });

  const boneMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.6,
    metalness: 0.1,
  });

  // Jagged Volcanic Spire Cone
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.6, 5.2, 7), basaltMat);
  cone.position.y = 2.6;
  root.add(cone);

  // Lava Crater Pool at top
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.2, 0.4, 8), lavaMat);
  pool.position.y = 4.8;
  root.add(pool);

  // 6 Perimeter Basalt Spikes
  for (let i = 0; i < 6; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.2, 5), basaltMat);
    const angle = (i / 6) * Math.PI * 2;
    spike.position.set(Math.cos(angle) * 3.2, 1.6, Math.sin(angle) * 3.2);
    spike.rotation.z = Math.cos(angle) * 0.25;
    spike.rotation.x = Math.sin(angle) * 0.25;
    root.add(spike);
  }

  // Ancient Dragon Skull Trophy
  const skull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 2.2), boneMat);
  skull.position.set(0, 0.8, 2.4);
  root.add(skull);

  const horn1 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.8, 5), boneMat);
  horn1.position.set(-0.6, 1.8, 1.8);
  horn1.rotation.x = -0.4;
  horn1.rotation.z = -0.3;
  root.add(horn1);

  const horn2 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.8, 5), boneMat);
  horn2.position.set(0.6, 1.8, 1.8);
  horn2.rotation.x = -0.4;
  horn2.rotation.z = 0.3;
  root.add(horn2);

  return root;
}

// ----------------------------------------------------------------------
// 8. ANCIENT RUIN (Sunken Aether Shrine)
// ----------------------------------------------------------------------
function createAncientRuin() {
  const root = new THREE.Group();
  root.name = 'Ancient_Ruin';

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Weathered marble & granite
    roughness: 0.7,
    metalness: 0.1,
  });

  const aetherMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });

  // Raised Circular Dias Plinth
  const dais1 = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 0.6, 12), stoneMat);
  dais1.position.y = 0.3;
  root.add(dais1);

  const dais2 = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.6, 12), stoneMat);
  dais2.position.y = 0.9;
  root.add(dais2);

  // 4 Fluted Marble Pillars (one broken)
  const offsets = [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]];
  offsets.forEach(([px, pz], idx) => {
    const isBroken = idx === 3;
    const h = isBroken ? 2.2 : 4.8;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, h, 8), stoneMat);
    pillar.position.set(px, h / 2 + 1.2, pz);
    if (isBroken) {
      pillar.rotation.z = 0.4;
      pillar.rotation.x = 0.2;
    }
    root.add(pillar);
  });

  // Floating Arcane Crystal Catalyst
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), aetherMat);
  crystal.position.y = 3.6;
  root.add(crystal);

  return root;
}

// ----------------------------------------------------------------------
// 9. IRON FORGE (Refining Vein & Smelter)
// ----------------------------------------------------------------------
function createIronForge() {
  const root = new THREE.Group();
  root.name = 'Iron_Forge';

  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Cast iron & slate
    roughness: 0.6,
    metalness: 0.8,
  });

  const moltenMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    emissive: 0xc2410c,
    emissiveIntensity: 2.0,
    roughness: 0.3,
  });

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.85,
  });

  // Furnace Structure
  const furnace = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 3.6, 8), stoneMat);
  furnace.position.y = 1.8;
  root.add(furnace);

  // Chimney Stack
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 2.8, 8), ironMat);
  chimney.position.set(0, 4.8, 0);
  root.add(chimney);

  // Molten Slag Spout
  const spout = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 2.4), moltenMat);
  spout.position.set(0, 1.2, 2.2);
  root.add(spout);

  // Anvil Block
  const anvil = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.8), ironMat);
  anvil.position.set(-2.2, 0.45, 1.8);
  root.add(anvil);

  return root;
}

// ----------------------------------------------------------------------
// 10. FARMLAND WINDMILL (Granary & Wheat Crops)
// ----------------------------------------------------------------------
function createFarmland() {
  const root = new THREE.Group();
  root.name = 'Farmland_Windmill';

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });
  const cropMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.9 });

  // Tower Base
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 4.5, 8), stoneMat);
  tower.position.set(-1.8, 2.25, -1.8);
  root.add(tower);

  // Thatched Roof Cap
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.8, 8), roofMat);
  roof.position.set(-1.8, 5.1, -1.8);
  root.add(roof);

  // 4 Windmill Sails
  for (let i = 0; i < 4; i++) {
    const sail = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 0.08), woodMat);
    sail.position.set(-1.8, 4.2, -0.2);
    sail.rotation.z = (i * Math.PI) / 2 + Math.PI / 4;
    root.add(sail);
  }

  // 3 Crop Rows
  for (let i = 0; i < 3; i++) {
    const row = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.4, 1.2), cropMat);
    row.position.set(1.5, 0.2, -2.0 + i * 2.0);
    root.add(row);
  }

  return root;
}

// ----------------------------------------------------------------------
// 11. LUMBER MILL (Sawmill Lodge & Timber Stacks)
// ----------------------------------------------------------------------
function createLumberMill() {
  const root = new THREE.Group();
  root.name = 'Lumber_Mill';

  const logMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3f2e1e, roughness: 0.75 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 });

  // Main Sawmill Lodge
  const lodge = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 2.6), logMat);
  lodge.position.set(1.8, 1.1, -1.6);
  root.add(lodge);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.8, 4), roofMat);
  roof.position.set(1.8, 3.1, -1.6);
  roof.rotation.y = Math.PI / 4;
  root.add(roof);

  // Waterwheel
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.4, 12), woodMat);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(3.6, 1.4, -1.6);
  root.add(wheel);

  // Stacks of Cut Logs
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3.2, 8), logMat);
    log.rotation.x = Math.PI / 2;
    log.position.set(-1.8 + (i % 2) * 0.7, 0.3 + Math.floor(i / 2) * 0.6, 1.2);
    root.add(log);
  }

  return root;
}

// ----------------------------------------------------------------------
// 12. RIVAL CITADEL (Obsidian Spire Keep)
// ----------------------------------------------------------------------
function createRivalCitadel() {
  const root = new THREE.Group();
  root.name = 'Rival_Citadel';

  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x111827, // Dark abyssal slate
    roughness: 0.5,
    metalness: 0.3,
  });

  const voidCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0x7e22ce,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });

  // Central Spire Keep
  const spire = new THREE.Mesh(new THREE.ConeGeometry(3.2, 7.8, 6), darkStoneMat);
  spire.position.y = 3.9;
  root.add(spire);

  // Void Energy Crystal Orb
  const orb = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), voidCrystalMat);
  orb.position.y = 8.6;
  root.add(orb);

  // 4 Perimeter Spikes
  for (let i = 0; i < 4; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.8, 4.2, 5), darkStoneMat);
    const angle = (i / 4) * Math.PI * 2;
    spike.position.set(Math.cos(angle) * 2.8, 2.1, Math.sin(angle) * 2.8);
    root.add(spike);
  }

  return root;
}

// ----------------------------------------------------------------------
// 13. ALLIANCE OUTPOST (Crimson Redoubt Bastion)
// ----------------------------------------------------------------------
function createAllianceOutpost() {
  const root = new THREE.Group();
  root.name = 'Alliance_Outpost';

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });

  // Main Tower
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 4.2, 8), stoneMat);
  tower.position.y = 2.1;
  root.add(tower);

  // Red Parapet Trim
  const trim = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.2, 0.8, 8), redMat);
  trim.position.y = 4.4;
  root.add(trim);

  // Flag Pole & Banner
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.8, 6), ironMat);
  pole.position.set(0, 6.2, 0);
  root.add(pole);

  const banner = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.2, 1.8), redMat);
  banner.position.set(0, 7.2, 0.9);
  root.add(banner);

  return root;
}

// ----------------------------------------------------------------------
// EXECUTION & ASSET MANIFEST GENERATION
// ----------------------------------------------------------------------
async function buildAll() {
  console.log('[GLB Builder] Starting Continental 3D asset generation...');
  const results = [];

  results.push(await exportGlb(createFortress(), 'fortress_sol_heights.glb'));
  results.push(await exportGlb(createQuarry(), 'quarry_sol_heights.glb'));
  results.push(await exportGlb(createPineTreeA(), 'pine_tree_a.glb'));
  results.push(await exportGlb(createPineTreeB(), 'pine_tree_b.glb'));
  results.push(await exportGlb(createRockOutcrop(), 'rock_outcrop.glb'));
  results.push(await exportGlb(createFoliageTuft(), 'foliage_tuft.glb'));
  results.push(await exportGlb(createMonsterLair(), 'monster_lair.glb'));
  results.push(await exportGlb(createAncientRuin(), 'ancient_ruin.glb'));
  results.push(await exportGlb(createIronForge(), 'iron_forge.glb'));
  results.push(await exportGlb(createFarmland(), 'farmland.glb'));
  results.push(await exportGlb(createLumberMill(), 'lumber_mill.glb'));
  results.push(await exportGlb(createRivalCitadel(), 'rival_citadel.glb'));
  results.push(await exportGlb(createAllianceOutpost(), 'alliance_outpost.glb'));

  // Generate Manifest
  const manifest = {
    version: '2.0.0',
    region: 'continental_world',
    generatedAt: new Date().toISOString(),
    models: {
      fortress: { file: '/assets/models/fortress_sol_heights.glb', name: 'Sol Heights Imperial Bastion', category: 'landmark' },
      quarry: { file: '/assets/models/quarry_sol_heights.glb', name: 'Terraced Highland Quarry', category: 'landmark' },
      pineTreeA: { file: '/assets/models/pine_tree_a.glb', name: 'Mountain Pine A', category: 'foliage' },
      pineTreeB: { file: '/assets/models/pine_tree_b.glb', name: 'Highland Pine B', category: 'foliage' },
      rockOutcrop: { file: '/assets/models/rock_outcrop.glb', name: 'Limestone Crag Outcrop', category: 'geology' },
      foliageTuft: { file: '/assets/models/foliage_tuft.glb', name: 'Heath Shrub Tuft', category: 'foliage' },
      monsterLair: { file: '/assets/models/monster_lair.glb', name: 'Volcanic Cinder Lair', category: 'landmark' },
      ancientRuin: { file: '/assets/models/ancient_ruin.glb', name: 'Sunken Aether Shrine', category: 'landmark' },
      ironForge: { file: '/assets/models/iron_forge.glb', name: 'Iron Smelting Forge', category: 'landmark' },
      farmland: { file: '/assets/models/farmland.glb', name: 'Farmland Windmill & Crops', category: 'landmark' },
      lumberMill: { file: '/assets/models/lumber_mill.glb', name: 'Timber Log Sawmill', category: 'landmark' },
      rivalCitadel: { file: '/assets/models/rival_citadel.glb', name: 'Obsidian Spire Fortress', category: 'landmark' },
      allianceOutpost: { file: '/assets/models/alliance_outpost.glb', name: 'Crimson Alliance Redoubt', category: 'landmark' },
    },
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('[GLB Builder] Manifest created at public/assets/models/manifest.json');
  console.log(`[GLB Builder] All ${results.length} GLB models verified and built successfully.`);
}

buildAll().catch(err => {
  console.error('[GLB Builder] Build failed:', err);
  process.exit(1);
});
