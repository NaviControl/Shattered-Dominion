/**
 * Chunked terrain math for the 100 x 100 world (CR-001 section 6).
 * Pure module: no three.js, no DOM. Runs under Node tests and in the browser.
 *
 * Coordinates: territory (x, y) with x, y in 0..99. World units: 12 per territory.
 * Tile centre: ((x - 49.5) * 12, (y - 49.5) * 12). The quadrant boundary sits at world x = 0 and z = 0,
 * matching getWorldTerrainHeight() and biomeForCell().
 */

import { WORLD_CONSTANTS } from '../game/constants.ts';

export const WORLD_N = WORLD_CONSTANTS.GRID_COLS;     // 100
export const SQUARE = WORLD_CONSTANTS.SQUARE_SIZE;    // 12
export const CHUNK_TILES = 16;                        // territories per chunk side
export const CHUNKS_PER_AXIS = Math.ceil(WORLD_N / CHUNK_TILES); // 7

const HALF = (WORLD_N - 1) / 2; // 49.5

export interface Chunk { cx: number; cy: number; }
export interface TileRange { x0: number; x1: number; y0: number; y1: number; }

/** World-space centre of a territory. */
export function tileCenter(x: number, y: number): { x: number; z: number } {
  return { x: (x - HALF) * SQUARE, z: (y - HALF) * SQUARE };
}

/** Territory covering a world point, or null if the point is off the map. Ties round toward +infinity. */
export function worldToTile(wx: number, wz: number): { x: number; y: number } | null {
  const x = Math.round(wx / SQUARE + HALF);
  const y = Math.round(wz / SQUARE + HALF);
  if (x < 0 || x >= WORLD_N || y < 0 || y >= WORLD_N) return null;
  return { x, y };
}

export function chunkOf(x: number, y: number): Chunk {
  return { cx: Math.floor(x / CHUNK_TILES), cy: Math.floor(y / CHUNK_TILES) };
}

export function tileRangeOf(chunk: Chunk): TileRange {
  const x0 = chunk.cx * CHUNK_TILES;
  const y0 = chunk.cy * CHUNK_TILES;
  return {
    x0,
    x1: Math.min(WORLD_N - 1, x0 + CHUNK_TILES - 1),
    y0,
    y1: Math.min(WORLD_N - 1, y0 + CHUNK_TILES - 1),
  };
}

/** World-space rectangle covering a chunk's territories, edge to edge. */
export function chunkWorldRect(chunk: Chunk): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const r = tileRangeOf(chunk);
  const a = tileCenter(r.x0, r.y0);
  const b = tileCenter(r.x1, r.y1);
  return { minX: a.x - SQUARE / 2, maxX: b.x + SQUARE / 2, minZ: a.z - SQUARE / 2, maxZ: b.z + SQUARE / 2 };
}

export function allChunks(): Chunk[] {
  const out: Chunk[] = [];
  for (let cy = 0; cy < CHUNKS_PER_AXIS; cy++) for (let cx = 0; cx < CHUNKS_PER_AXIS; cx++) out.push({ cx, cy });
  return out;
}

export type Lod = 0 | 1 | 2;

/** Default distance thresholds (world units) for LOD 0 -> 1 -> 2. */
export const LOD_THRESHOLDS: readonly [number, number] = [420, 840];

export function lodForDistance(distance: number, thresholds: readonly [number, number] = LOD_THRESHOLDS): Lod {
  if (distance < thresholds[0]) return 0;
  if (distance < thresholds[1]) return 1;
  return 2;
}

/** Vertex grid segments per axis for a chunk with `tiles` territories along that axis. */
export function segmentsPerAxis(lod: Lod, tiles: number): number {
  const perTile = [2, 1, 0.5][lod];
  return Math.max(1, Math.round(tiles * perTile));
}

/**
 * Chunks inside `radius` of the camera's ground point, each with its level of detail.
 * Frustum culling is applied on top of this by the renderer.
 */
export function visibleChunks(
  camX: number,
  camZ: number,
  radius: number,
  thresholds: readonly [number, number] = LOD_THRESHOLDS
): Array<{ chunk: Chunk; lod: Lod }> {
  const out: Array<{ chunk: Chunk; lod: Lod }> = [];
  for (const chunk of allChunks()) {
    const r = chunkWorldRect(chunk);
    const cx = (r.minX + r.maxX) / 2;
    const cz = (r.minZ + r.maxZ) / 2;
    const d = Math.hypot(cx - camX, cz - camZ);
    if (d > radius) continue;
    out.push({ chunk, lod: lodForDistance(d, thresholds) });
  }
  return out;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/**
 * Biome weights at a world point, blended across the quadrant boundaries over `blend` world units.
 * Order: [sol_heights (NW), ignis_caldera (NE), frost_wastes (SW), abyssal_marshes (SE)]. Sums to 1.
 * Visual only. Gameplay biome stays one value per territory (biomeForCell).
 */
export function biomeBlend(wx: number, wz: number, blend = 24): [number, number, number, number] {
  const h = blend / 2;
  const sx = smoothstep(-h, h, wx); // 0 = west, 1 = east
  const sz = smoothstep(-h, h, wz); // 0 = north, 1 = south
  return [(1 - sx) * (1 - sz), sx * (1 - sz), (1 - sx) * sz, sx * sz];
}
