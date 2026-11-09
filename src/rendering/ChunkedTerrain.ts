/**
 * Chunked terrain renderer for the 100 x 100 world (CR-001 section 6).
 *
 * UNVERIFIED: this module has not been type-checked or run in a browser. The sandbox used to
 * build it has no three.js package and no browser. It needs a browser run before it is trusted.
 *
 * Design:
 *  - 49 chunks (7 x 7), each 16 x 16 territories (edge chunks are smaller).
 *  - Per chunk: three terrain LOD meshes; only one is visible at a time.
 *  - Per chunk: one InstancedMesh of territory plates, coloured by owner.
 *  - Biome is blended per vertex from biomeBlend(), so there is no per-tile biome mesh.
 *  - Picking maps a ray hit to a territory with worldToTile(). Game logic never reads geometry.
 */

import * as THREE from 'three';
import {
  CHUNK_TILES, Chunk, Lod, allChunks, biomeBlend, chunkWorldRect, segmentsPerAxis,
  tileCenter, tileRangeOf, worldToTile, LOD_THRESHOLDS, SQUARE,
} from './chunking.ts';

export interface TerrainOptions {
  /** Terrain height in world units at a world point. Injected so the height field can change. */
  heightAt: (wx: number, wz: number) => number;
  /** Colour per biome, in the order used by biomeBlend(). */
  biomeColors?: [THREE.Color, THREE.Color, THREE.Color, THREE.Color];
  /** Owner colours for territory plates. */
  ownerColors?: Record<string, THREE.Color>;
  lodThresholds?: readonly [number, number];
}

export interface TileState { x: number; y: number; owner: string | null; tower: boolean; }

const DEFAULT_BIOME_COLORS: [THREE.Color, THREE.Color, THREE.Color, THREE.Color] = [
  new THREE.Color(0x4f7a3a), // Sol Heights
  new THREE.Color(0x7a3b2e), // Ignis Caldera
  new THREE.Color(0xa9c3cf), // Frost Wastes
  new THREE.Color(0x3f5a48), // Abyssal Marshes
];

const DEFAULT_OWNER_COLORS: Record<string, THREE.Color> = {
  player: new THREE.Color(0x52c97a),
  neutral: new THREE.Color(0x8b8b8b),
};

const NPC_COLOR = new THREE.Color(0xc4553a);

interface ChunkRecord {
  chunk: Chunk;
  lods: [THREE.Mesh, THREE.Mesh, THREE.Mesh];
  plates: THREE.InstancedMesh;
  /** plate index -> territory (x, y) */
  plateTiles: Array<{ x: number; y: number }>;
}

export class ChunkedTerrain {
  readonly group = new THREE.Group();
  private records: ChunkRecord[] = [];
  private material: THREE.MeshStandardMaterial;
  private plateMaterial: THREE.MeshStandardMaterial;
  private plateGeometry: THREE.BoxGeometry;
  private ownerColors: Record<string, THREE.Color>;
  private opts: TerrainOptions;

  constructor(opts: TerrainOptions) {
    this.opts = opts;
    this.ownerColors = { ...DEFAULT_OWNER_COLORS, ...(opts.ownerColors ?? {}) };
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.02 });
    this.plateMaterial = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1 });
    this.plateGeometry = new THREE.BoxGeometry(SQUARE * 0.92, 0.6, SQUARE * 0.92);
    this.build(opts.biomeColors ?? DEFAULT_BIOME_COLORS);
  }

  private build(biomeColors: [THREE.Color, THREE.Color, THREE.Color, THREE.Color]) {
    for (const chunk of allChunks()) {
      const range = tileRangeOf(chunk);
      const nx = range.x1 - range.x0 + 1;
      const ny = range.y1 - range.y0 + 1;
      const rect = chunkWorldRect(chunk);
      const lods = [0, 1, 2].map((lod) =>
        new THREE.Mesh(
          this.terrainGeometry(rect, segmentsPerAxis(lod as Lod, nx), segmentsPerAxis(lod as Lod, ny), biomeColors),
          this.material
        )
      ) as [THREE.Mesh, THREE.Mesh, THREE.Mesh];

      const plateTiles: Array<{ x: number; y: number }> = [];
      for (let y = range.y0; y <= range.y1; y++) for (let x = range.x0; x <= range.x1; x++) plateTiles.push({ x, y });
      const plates = new THREE.InstancedMesh(this.plateGeometry, this.plateMaterial, plateTiles.length);
      const m = new THREE.Matrix4();
      plateTiles.forEach((t, i) => {
        const c = tileCenter(t.x, t.y);
        const h = this.opts.heightAt(c.x, c.z) + 0.3;
        m.makeTranslation(c.x, h, c.z);
        plates.setMatrixAt(i, m);
        plates.setColorAt(i, this.ownerColors.neutral);
      });
      plates.instanceMatrix.needsUpdate = true;

      const group = new THREE.Group();
      group.add(...lods, plates);
      this.group.add(group);
      this.records.push({ chunk, lods, plates, plateTiles });
    }
  }

  private terrainGeometry(
    rect: { minX: number; maxX: number; minZ: number; maxZ: number },
    segX: number,
    segZ: number,
    biomeColors: [THREE.Color, THREE.Color, THREE.Color, THREE.Color]
  ): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const cols = segX + 1;
    for (let j = 0; j <= segZ; j++) {
      for (let i = 0; i <= segX; i++) {
        const wx = rect.minX + ((rect.maxX - rect.minX) * i) / segX;
        const wz = rect.minZ + ((rect.maxZ - rect.minZ) * j) / segZ;
        positions.push(wx, this.opts.heightAt(wx, wz), wz);
        const w = biomeBlend(wx, wz);
        const c = new THREE.Color(0, 0, 0);
        c.setRGB(
          biomeColors[0].r * w[0] + biomeColors[1].r * w[1] + biomeColors[2].r * w[2] + biomeColors[3].r * w[3],
          biomeColors[0].g * w[0] + biomeColors[1].g * w[1] + biomeColors[2].g * w[2] + biomeColors[3].g * w[3],
          biomeColors[0].b * w[0] + biomeColors[1].b * w[1] + biomeColors[2].b * w[2] + biomeColors[3].b * w[3]
        );
        colors.push(c.r, c.g, c.b);
      }
    }
    for (let j = 0; j < segZ; j++) {
      for (let i = 0; i < segX; i++) {
        const a = j * cols + i;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /** Chooses the LOD per chunk from the camera position. Returns the number of chunks at each LOD. */
  update(camera: THREE.Camera): { lod0: number; lod1: number; lod2: number; culled: number } {
    const frustum = new THREE.Frustum();
    const pv = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pv);
    const counts = { lod0: 0, lod1: 0, lod2: 0, culled: 0 };
    const cam = camera.position;
    const box = new THREE.Box3();
    for (const rec of this.records) {
      const r = chunkWorldRect(rec.chunk);
      box.min.set(r.minX, -50, r.minZ);
      box.max.set(r.maxX, 200, r.maxZ);
      const visible = frustum.intersectsBox(box);
      rec.lods.forEach((m) => (m.visible = false));
      rec.plates.visible = false;
      if (!visible) { counts.culled++; continue; }
      const cx = (r.minX + r.maxX) / 2;
      const cz = (r.minZ + r.maxZ) / 2;
      const d = Math.hypot(cx - cam.x, cz - cam.z);
      const lod = this.lodFor(d);
      rec.lods[lod].visible = true;
      rec.plates.visible = lod === 0; // plates only at full detail
      counts[`lod${lod}` as 'lod0' | 'lod1' | 'lod2']++;
    }
    return counts;
  }

  private lodFor(d: number): Lod {
    const [a, b] = this.opts.lodThresholds ?? LOD_THRESHOLDS;
    return d < a ? 0 : d < b ? 1 : 2;
  }

  /** Colours plates by owner. Only the chunks whose tiles changed are touched. */
  setTiles(tiles: TileState[]): void {
    const byKey = new Map<string, TileState>();
    for (const t of tiles) byKey.set(`${t.x},${t.y}`, t);
    for (const rec of this.records) {
      let dirty = false;
      rec.plateTiles.forEach((p, i) => {
        const t = byKey.get(`${p.x},${p.y}`);
        if (!t) return;
        const col = t.tower ? this.ownerColors.neutral.clone().multiplyScalar(1.3)
          : t.owner === null ? this.ownerColors.neutral
          : t.owner === 'player' ? this.ownerColors.player
          : t.owner === 'neutral' ? this.ownerColors.neutral
          : NPC_COLOR;
        rec.plates.setColorAt(i, col);
        dirty = true;
      });
      if (dirty && rec.plates.instanceColor) rec.plates.instanceColor.needsUpdate = true;
    }
  }

  /** Territory under a ray, or null. Test against the terrain meshes only. */
  pick(raycaster: THREE.Raycaster): { x: number; y: number } | null {
    const meshes = this.records.flatMap((r) => r.lods.filter((m) => m.visible));
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (!hit) return null;
    return worldToTile(hit.point.x, hit.point.z);
  }

  /** Releases every geometry and material. Call on unmount. */
  dispose(): void {
    for (const rec of this.records) {
      rec.lods.forEach((m) => m.geometry.dispose());
      rec.plates.dispose();
      this.group.remove(...rec.lods, rec.plates);
    }
    this.material.dispose();
    this.plateMaterial.dispose();
    this.plateGeometry.dispose();
    this.records = [];
  }
}
