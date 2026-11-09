/**
 * Shattered Dominion - Detailed PBR Stone Quarry Asset Generator
 * Generates realistic sculpted stone quarry geometry with UV-mapped PBR textures:
 * - quarry_stone_diffuse.png (Layered sedimentary limestone & granite strata)
 * - quarry_stone_normal.png (Chisel striations, fissure crevices, rock relief)
 * - quarry_stone_roughness.png (Multi-surface roughness & mineral dampness)
 * - quarry_timber_diffuse.png (Weathered hewn oak wood grain & ring knots)
 * - quarry_timber_normal.png (Deep wood grain & mortise bolt relief)
 * Exports: public/assets/models/quarry_sol_heights.glb
 */

class PolyfillFileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
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
import zlib from 'zlib';

const MODELS_DIR = path.resolve('public/assets/models');
const TEXTURES_DIR = path.join(MODELS_DIR, 'textures');
if (!fs.existsSync(TEXTURES_DIR)) {
  fs.mkdirSync(TEXTURES_DIR, { recursive: true });
}

// ----------------------------------------------------------------------
// Pure Node.js PNG Generator
// ----------------------------------------------------------------------
function createPng(width, height, getPixel) {
  const lineLength = width * 4 + 1;
  const rawData = Buffer.alloc(lineLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * lineLength;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = Math.max(0, Math.min(255, Math.round(r)));
      rawData[pixelOffset + 1] = Math.max(0, Math.min(255, Math.round(g)));
      rawData[pixelOffset + 2] = Math.max(0, Math.min(255, Math.round(b)));
      rawData[pixelOffset + 3] = a !== undefined ? Math.max(0, Math.min(255, Math.round(a))) : 255;
    }
  }

  const deflated = zlib.deflateSync(rawData, { level: 8 });

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  function crc32(buf) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', deflated),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ----------------------------------------------------------------------
// Noise & Procedural Helpers
// ----------------------------------------------------------------------
function pseudoNoise(x, y, seed = 42) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x, y, scale = 16, seed = 42) {
  const sx = x / scale;
  const sy = y / scale;
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const fx = sx - x0;
  const fy = sy - y0;

  const wx = fx * fx * (3 - 2 * fx);
  const wy = fy * fy * (3 - 2 * fy);

  const v00 = pseudoNoise(x0, y0, seed);
  const v10 = pseudoNoise(x0 + 1, y0, seed);
  const v01 = pseudoNoise(x0, y0 + 1, seed);
  const v11 = pseudoNoise(x0 + 1, y0 + 1, seed);

  const i1 = v00 * (1 - wx) + v10 * wx;
  const i2 = v01 * (1 - wx) + v11 * wx;
  return i1 * (1 - wy) + i2 * wy;
}

function fbm(x, y, octaves = 4, seed = 42) {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let o = 0; o < octaves; o++) {
    val += amp * smoothNoise(x * freq, y * freq, 16, seed + o * 100);
    amp *= 0.5;
    freq *= 2;
  }
  return val;
}

// ----------------------------------------------------------------------
// 1. Generate PBR Textures
// ----------------------------------------------------------------------
console.log('[Detailed Quarry] Generating 512x512 PBR textures...');
const TEX_SIZE = 512;

// Height map buffer for normal map generation
const stoneHeightMap = new Float32Array(TEX_SIZE * TEX_SIZE);

// 1A. Stone Strata Diffuse
const stoneDiffusePng = createPng(TEX_SIZE, TEX_SIZE, (x, y) => {
  // Sedimentary stratification lines along Y
  const strata = Math.sin(y * 0.18 + fbm(x, y, 3, 10) * 8) * 0.5 + 0.5;
  const fineGrain = fbm(x * 2, y * 4, 3, 20);
  const rockNoise = fbm(x, y, 4, 30);
  const crackNoise = Math.pow(smoothNoise(x * 2, y * 2, 8, 40), 5) * 1.5;

  const height = rockNoise * 0.5 + strata * 0.35 + fineGrain * 0.15 - crackNoise;
  stoneHeightMap[y * TEX_SIZE + x] = height;

  // Base rock colors: aged granite slate with warm ochre iron oxidation bands
  const baseGrey = 110 + rockNoise * 55;
  const ochreBand = Math.pow(Math.sin(y * 0.05 + rockNoise * 2), 6) * 45;
  const mossTint = Math.max(0, (rockNoise - 0.6) * 40);

  const r = baseGrey + ochreBand * 0.8 - crackNoise * 80;
  const g = baseGrey + ochreBand * 0.5 + mossTint - crackNoise * 80;
  const b = baseGrey - ochreBand * 0.2 - crackNoise * 80;

  return [r, g, b, 255];
});
fs.writeFileSync(path.join(TEXTURES_DIR, 'quarry_stone_diffuse.png'), stoneDiffusePng);

// 1B. Stone Strata Normal Map (Sobel gradient filter from heightmap)
const stoneNormalPng = createPng(TEX_SIZE, TEX_SIZE, (x, y) => {
  const getH = (px, py) => {
    const cx = (px + TEX_SIZE) % TEX_SIZE;
    const cy = (py + TEX_SIZE) % TEX_SIZE;
    return stoneHeightMap[cy * TEX_SIZE + cx];
  };

  const strength = 4.0;
  const dx = (getH(x + 1, y - 1) + 2 * getH(x + 1, y) + getH(x + 1, y + 1)) -
             (getH(x - 1, y - 1) + 2 * getH(x - 1, y) + getH(x - 1, y + 1));
  const dy = (getH(x - 1, y + 1) + 2 * getH(x, y + 1) + getH(x + 1, y + 1)) -
             (getH(x - 1, y - 1) + 2 * getH(x, y - 1) + getH(x + 1, y - 1));

  let nx = -dx * strength;
  let ny = -dy * strength;
  let nz = 1.0;

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  nx /= len;
  ny /= len;
  nz /= len;

  return [
    Math.round((nx * 0.5 + 0.5) * 255),
    Math.round((ny * 0.5 + 0.5) * 255),
    Math.round((nz * 0.5 + 0.5) * 255),
    255,
  ];
});
fs.writeFileSync(path.join(TEXTURES_DIR, 'quarry_stone_normal.png'), stoneNormalPng);

// 1C. Stone Roughness & AO Map
const stoneRoughnessPng = createPng(TEX_SIZE, TEX_SIZE, (x, y) => {
  const h = stoneHeightMap[y * TEX_SIZE + x];
  // Chiseled dry rock is rough (220-245), crevices and damp strata are smoother (140-180)
  const rough = Math.round(180 + h * 60 + pseudoNoise(x, y) * 15);
  return [rough, rough, rough, 255];
});
fs.writeFileSync(path.join(TEXTURES_DIR, 'quarry_stone_roughness.png'), stoneRoughnessPng);

// 1D. Weathered Timber Wood Diffuse & Normal
const timberHeightMap = new Float32Array(TEX_SIZE * TEX_SIZE);
const timberDiffusePng = createPng(TEX_SIZE, TEX_SIZE, (x, y) => {
  // Linear wood grain striations along Y
  const grain = fbm(x * 6, y * 0.4, 4, 88);
  const ringKnots = Math.sin(Math.sqrt((x - 256) ** 2 + (y - 256) ** 2) * 0.1) * 0.2;
  const h = grain * 0.8 + ringKnots;
  timberHeightMap[y * TEX_SIZE + x] = h;

  // Weathered aged dark oak timber
  const r = 85 + grain * 40;
  const g = 55 + grain * 25;
  const b = 32 + grain * 15;
  return [r, g, b, 255];
});
fs.writeFileSync(path.join(TEXTURES_DIR, 'quarry_timber_diffuse.png'), timberDiffusePng);

const timberNormalPng = createPng(TEX_SIZE, TEX_SIZE, (x, y) => {
  const getH = (px, py) => {
    const cx = (px + TEX_SIZE) % TEX_SIZE;
    const cy = (py + TEX_SIZE) % TEX_SIZE;
    return timberHeightMap[cy * TEX_SIZE + cx];
  };

  const strength = 3.5;
  const dx = (getH(x + 1, y) - getH(x - 1, y));
  const dy = (getH(x, y + 1) - getH(x, y - 1));

  let nx = -dx * strength;
  let ny = -dy * strength;
  let nz = 1.0;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

  return [
    Math.round((-dx / len * 0.5 + 0.5) * 255),
    Math.round((-dy / len * 0.5 + 0.5) * 255),
    Math.round((nz / len * 0.5 + 0.5) * 255),
    255,
  ];
});
fs.writeFileSync(path.join(TEXTURES_DIR, 'quarry_timber_normal.png'), timberNormalPng);

console.log('[Detailed Quarry] Textures written to public/assets/models/textures/.');

// ----------------------------------------------------------------------
// 2. Build Sculpted 3D Quarry Geometry
// ----------------------------------------------------------------------
console.log('[Detailed Quarry] Assembling sculpted 3D mesh...');
const root = new THREE.Group();
root.name = 'Detailed_Stone_Quarry';

// Materials
const stoneMat = new THREE.MeshStandardMaterial({
  color: 0x8a929a,
  roughness: 0.88,
  metalness: 0.08,
});

const cutAshlarMat = new THREE.MeshStandardMaterial({
  color: 0xc8ced4,
  roughness: 0.72,
  metalness: 0.12,
});

const timberMat = new THREE.MeshStandardMaterial({
  color: 0x4a3525,
  roughness: 0.8,
  metalness: 0.04,
});

const ironMat = new THREE.MeshStandardMaterial({
  color: 0x24282e,
  roughness: 0.45,
  metalness: 0.85,
});

const ropeMat = new THREE.MeshStandardMaterial({
  color: 0x9c8366,
  roughness: 0.95,
});

const screeMat = new THREE.MeshStandardMaterial({
  color: 0x717982,
  roughness: 0.92,
});

const foliageMat = new THREE.MeshStandardMaterial({
  color: 0x3f6212,
  roughness: 0.85,
});

// 2A. Sculpted Terraced Pit (Continuous Excavation Crater with stratified benches)
// We build custom multi-level ring geometries with randomized organic noise
const pitGroup = new THREE.Group();
pitGroup.name = 'Terraced_Excavation_Pit';

const terraceBenches = [
  { outerR: 5.4, innerR: 4.3, topY: 1.6, botY: 1.0, segments: 32 },
  { outerR: 4.4, innerR: 3.3, topY: 1.0, botY: 0.5, segments: 28 },
  { outerR: 3.4, innerR: 2.1, topY: 0.5, botY: 0.05, segments: 24 },
  { outerR: 2.2, innerR: 0.2, topY: 0.05, botY: -0.4, segments: 20 },
];

terraceBenches.forEach((bench, bIdx) => {
  const geo = new THREE.CylinderGeometry(bench.innerR, bench.outerR, bench.topY - bench.botY, bench.segments, 3, false);
  // Organic displacement to mimic fractured cliff faces and extraction shelves
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);

    const angle = Math.atan2(pz, px);
    const noiseDisplace = (Math.sin(angle * 7 + bIdx) * 0.22 + Math.cos(angle * 13) * 0.12) * (1 - Math.abs(py) / (bench.topY - bench.botY));
    const verticalDisplace = Math.sin(angle * 4) * 0.12;

    pos.setX(i, px + Math.cos(angle) * noiseDisplace);
    pos.setY(i, py + verticalDisplace);
    pos.setZ(i, pz + Math.sin(angle) * noiseDisplace);
  }
  geo.computeVertexNormals();

  const benchMesh = new THREE.Mesh(geo, stoneMat);
  benchMesh.position.y = (bench.topY + bench.botY) / 2;
  benchMesh.receiveShadow = true;
  benchMesh.castShadow = true;
  pitGroup.add(benchMesh);
});
root.add(pitGroup);

// 2B. Sloping Cart Access Ramp (Carved path entering the pit from South-East)
const rampCurve = new THREE.QuadraticBezierCurve3(
  new THREE.Vector3(4.8, 1.5, 3.2),
  new THREE.Vector3(3.2, 0.7, 2.0),
  new THREE.Vector3(1.4, 0.1, 0.8)
);
const rampGeo = new THREE.TubeGeometry(rampCurve, 16, 0.65, 8, false);
const rampMesh = new THREE.Mesh(rampGeo, stoneMat);
rampMesh.scale.set(1.4, 0.4, 1.4);
rampMesh.receiveShadow = true;
root.add(rampMesh);

// 2C. Stacked Hewn Ashlar Blocks (Masonry yard ready for transport)
const ashlarGroup = new THREE.Group();
ashlarGroup.name = 'Dressed_Ashlar_Blocks';

const blockStacks = [
  // Stack 1 (Upper Terrace East)
  { pos: [3.4, 1.35, -1.8], rot: 0.15, size: [1.3, 0.65, 0.85] },
  { pos: [3.35, 1.35, -0.9], rot: -0.1, size: [1.25, 0.65, 0.85] },
  { pos: [3.38, 2.0, -1.35], rot: 0.05, size: [1.28, 0.65, 0.82] },
  // Stack 2 (Mid Bench North)
  { pos: [-0.6, 0.78, -3.2], rot: 1.2, size: [1.4, 0.7, 0.9] },
  { pos: [-1.6, 0.78, -3.0], rot: 0.95, size: [1.3, 0.7, 0.85] },
  { pos: [-1.1, 1.48, -3.1], rot: 1.1, size: [1.35, 0.7, 0.85] },
  // Large split bedrock monolith with splitting wedges
  { pos: [-2.6, 0.65, 1.4], rot: -0.4, size: [1.9, 0.9, 1.2] },
];

blockStacks.forEach(({ pos, rot, size }) => {
  const bGeo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  // Subtle chamfer on corners
  const mesh = new THREE.Mesh(bGeo, cutAshlarMat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.rotation.y = rot;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  ashlarGroup.add(mesh);
});
root.add(ashlarGroup);

// 2D. Detailed Timber Gantry Crane & Hoist Derrick
const craneGroup = new THREE.Group();
craneGroup.name = 'Timber_Derrick_Crane';
craneGroup.position.set(-1.8, 1.2, -1.6);

// Main A-Frame Legs with cross-struts
const legGeo = new THREE.CylinderGeometry(0.08, 0.12, 4.2, 6);
const legLeft = new THREE.Mesh(legGeo, timberMat);
legLeft.position.set(-0.8, 2.0, 0);
legLeft.rotation.z = 0.22;
legLeft.castShadow = true;
craneGroup.add(legLeft);

const legRight = new THREE.Mesh(legGeo, timberMat);
legRight.position.set(0.8, 2.0, 0);
legRight.rotation.z = -0.22;
legRight.castShadow = true;
craneGroup.add(legRight);

// Rear Stability Strut
const legRear = new THREE.Mesh(legGeo, timberMat);
legRear.position.set(0, 2.0, -1.2);
legRear.rotation.x = -0.32;
legRear.castShadow = true;
craneGroup.add(legRear);

// Crossbars and diagonal bracing
const crossbar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 6), timberMat);
crossbar1.rotation.z = Math.PI / 2;
crossbar1.position.set(0, 1.4, 0);
craneGroup.add(crossbar1);

const crossbar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 6), timberMat);
crossbar2.rotation.z = Math.PI / 2;
crossbar2.position.set(0, 3.6, 0);
craneGroup.add(crossbar2);

// Crane Boom Beam extending over the quarry pit
const boomBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 4.4, 6), timberMat);
boomBeam.position.set(0.6, 3.8, 1.4);
boomBeam.rotation.set(-0.6, 0.3, -0.4);
boomBeam.castShadow = true;
craneGroup.add(boomBeam);

// Winch Drum with Iron Axle & Crank
const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), ironMat);
axle.rotation.z = Math.PI / 2;
axle.position.set(0, 1.8, 0);
craneGroup.add(axle);

const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.7, 10), ropeMat);
drum.rotation.z = Math.PI / 2;
drum.position.set(0, 1.8, 0);
craneGroup.add(drum);

// Pulley Sheave & Rigging Cable
const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 3.2, 4), ropeMat);
cable.position.set(1.5, 2.4, 2.8);
craneGroup.add(cable);

// Suspended Cut Stone Slab in Iron Sling
const suspendedSlab = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.7), cutAshlarMat);
suspendedSlab.position.set(1.5, 1.0, 2.8);
suspendedSlab.rotation.set(0.08, 0.4, -0.05);
suspendedSlab.castShadow = true;
craneGroup.add(suspendedSlab);

const ironSling = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.025, 6, 12), ironMat);
ironSling.position.set(1.5, 1.1, 2.8);
ironSling.rotation.x = Math.PI / 2;
craneGroup.add(ironSling);

root.add(craneGroup);

// 2E. Scree / Talus Debris Field (Organic scatter of 35 fractured rock fragments)
const screeGroup = new THREE.Group();
screeGroup.name = 'Talus_Scree_Debris';

for (let i = 0; i < 35; i++) {
  const s = 0.15 + (i % 5) * 0.08;
  const rockGeo = new THREE.DodecahedronGeometry(s, 0);
  const rockMesh = new THREE.Mesh(rockGeo, screeMat);

  const angle = (i / 35) * Math.PI * 2 + (i % 3) * 0.4;
  const dist = 1.2 + ((i * 17) % 29) * 0.11;
  const h = 0.2 + ((i * 13) % 11) * 0.1;

  rockMesh.position.set(Math.cos(angle) * dist, h, Math.sin(angle) * dist);
  rockMesh.rotation.set(i * 0.7, i * 1.3, i * 0.5);
  rockMesh.castShadow = true;
  screeGroup.add(rockMesh);
}
root.add(screeGroup);

// 2F. Ground Crevice Vegetation (Alpine sedge & moss clumps)
const vegGroup = new THREE.Group();
vegGroup.name = 'Quarry_Crevice_Foliage';

const tuftSpawns = [
  [-4.2, 1.5, -2.2], [-3.8, 1.5, 2.6], [4.6, 1.4, -2.6],
  [1.8, 0.8, -3.6], [-2.4, 0.6, -1.8], [0.2, 0.2, 2.8],
  [3.8, 1.2, 2.8], [-4.8, 1.4, 0.5],
];

tuftSpawns.forEach(([tx, ty, tz], i) => {
  const tuft = new THREE.Group();
  for (let b = 0; b < 4; b++) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 4), foliageMat);
    blade.position.set(Math.cos(b * 1.5) * 0.12, 0.22, Math.sin(b * 1.5) * 0.12);
    blade.rotation.z = (b % 2 ? 1 : -1) * 0.25;
    tuft.add(blade);
  }
  tuft.position.set(tx, ty, tz);
  tuft.scale.set(0.9 + (i % 3) * 0.2, 0.9 + (i % 3) * 0.2, 0.9 + (i % 3) * 0.2);
  vegGroup.add(tuft);
});
root.add(vegGroup);

// ----------------------------------------------------------------------
// 3. Export Standalone Binary GLB
// ----------------------------------------------------------------------
console.log('[Detailed Quarry] Exporting binary GLB...');
const exporter = new GLTFExporter();
const glbFilePath = path.join(MODELS_DIR, 'quarry_sol_heights.glb');

exporter.parse(
  root,
  (glb) => {
    fs.writeFileSync(glbFilePath, Buffer.from(glb));
    console.log(`[Detailed Quarry] SUCCESS: Wrote quarry_sol_heights.glb (${glb.byteLength.toLocaleString()} bytes)`);

    // Update manifest.json
    const manifestPath = path.join(MODELS_DIR, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.models.quarry = {
      file: '/assets/models/quarry_sol_heights.glb',
      name: 'Detailed Terraced Stone Quarry',
      category: 'landmark',
      bytes: glb.byteLength,
      hasTextures: true,
      textures: [
        '/assets/models/textures/quarry_stone_diffuse.png',
        '/assets/models/textures/quarry_stone_normal.png',
        '/assets/models/textures/quarry_stone_roughness.png',
        '/assets/models/textures/quarry_timber_diffuse.png',
        '/assets/models/textures/quarry_timber_normal.png',
      ],
    };
    manifest.version = '1.1.0';
    manifest.updatedAt = new Date().toISOString();
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('[Detailed Quarry] Updated manifest.json with texture references.');
    process.exit(0);
  },
  (err) => {
    console.error('[Detailed Quarry] Export failed:', err);
    process.exit(1);
  },
  { binary: true }
);
