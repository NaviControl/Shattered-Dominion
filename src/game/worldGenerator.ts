/**
 * Shattered Dominion — Deterministic World Generator (CR-001: 100 x 100 territories)
 *
 * Coordinates are integers 0..99 on each axis. The axes sit between squares, so each
 * quadrant is exactly 50 x 50 and holds 2,500 territories. Same seed = same map.
 * Pure module: no Math.random, no Date, no I/O.
 *
 * Territory ID: t_<x>_<y>. Legacy IDs tile_<row>_<col> map to t_<col>_<row>.
 */

import { WORLD_CONSTANTS, BiomeType } from './constants';
import { WorldTile, TileType } from './types';

export const WORLD_SIZE = WORLD_CONSTANTS.GRID_COLS; // 100: coordinates 0..99
export const QUADRANT_SIZE = WORLD_SIZE / 2;         // 50
export const WORLD_TILE_COUNT = WORLD_CONSTANTS.TOTAL_TERRITORIES; // 10,000
export const WORLD_SEED = 'shattered-dominion-world-v2';

/** Player citadel. Kept at (4,4) so legacy saves keep their starting squares. */
export const CITADEL = { x: 4, y: 4 };

/** Six mythical towers: symmetric about the centre (49.5, 49.5). */
export const TOWER_COORDS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 22, y: 22 },
  { x: 77, y: 22 },
  { x: 22, y: 77 },
  { x: 77, y: 77 },
  { x: 46, y: 49 },
  { x: 53, y: 49 },
];

/** Placeholder special-tile counts for the 10,000-territory world. */
export const SPECIAL_COUNTS = { rival: 2, outpost: 3, lair: 100, ruin: 50 } as const;

export const BIOME_IDS: readonly BiomeType[] = [
  'sol_heights',
  'ignis_caldera',
  'frost_wastes',
  'abyssal_marshes',
];

export const BIOME_LABELS: Record<BiomeType, string> = {
  sol_heights: 'Sol Heights',
  ignis_caldera: 'Ignis Caldera',
  frost_wastes: 'Frost Wastes',
  abyssal_marshes: 'Abyssal Marshes',
};

// Wild resource nodes per biome (design proposal; balance not yet validated).
const BIOME_NODE_TYPES: Record<BiomeType, TileType[]> = {
  sol_heights: ['farmland', 'lumber_mill', 'farmland', 'stone_quarry'],
  ignis_caldera: ['iron_vein', 'stone_quarry', 'iron_vein', 'mana_monolith'],
  frost_wastes: ['mana_monolith', 'stone_quarry', 'lumber_mill', 'mana_monolith'],
  abyssal_marshes: ['mana_monolith', 'iron_vein', 'lumber_mill', 'farmland'],
};

const CLUSTER_TYPES: TileType[] = ['farmland', 'lumber_mill', 'stone_quarry', 'iron_vein'];
const MONSTER_NAMES = ['Wyvern Roost', 'Abyssal Hive', 'Gorgon Cavern', 'Infernal Hellmouth'];

type Cell = { x: number; y: number };
type SpecialKind = 'rival' | 'outpost' | 'lair' | 'ruin';

/** FNV-1a 32-bit hash of a seed string. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG. Returns floats in [0, 1). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function cheb(a: Cell, b: Cell): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/** Territory ID for integer coordinates. */
export function tileIdFor(x: number, y: number): string {
  return `t_${x}_${y}`;
}

/** Maps a legacy `tile_<row>_<col>` ID to `t_<col>_<row>`. Other IDs are returned unchanged. */
export function migrateTileId(id: string): string {
  const m = /^tile_(\d+)_(\d+)$/.exec(id);
  if (!m) return id;
  return tileIdFor(Number(m[2]), Number(m[1]));
}

/** Quadrant biome. North = low y, west = low x. Matches the terrain split at the axes. */
export function biomeForCell(x: number, y: number): BiomeType {
  const north = y < QUADRANT_SIZE;
  const west = x < QUADRANT_SIZE;
  if (north) return west ? 'sol_heights' : 'ignis_caldera';
  return west ? 'frost_wastes' : 'abyssal_marshes';
}

/** Generates the full 10,000-territory world for a seed. */
export function generateWorldTiles(seed: string = WORLD_SEED): WorldTile[] {
  const rng = createRng(hashSeed(seed));
  const cluster = (c: Cell) => cheb(c, CITADEL) <= 1;
  const isTower = (c: Cell) => TOWER_COORDS.some((t) => t.x === c.x && t.y === c.y);

  const special = new Map<string, SpecialKind | 'tower'>();
  const key = (c: Cell) => `${c.x},${c.y}`;
  for (const t of TOWER_COORDS) special.set(`${t.x},${t.y}`, 'tower');

  const place = (
    kind: SpecialKind,
    count: number,
    accept: (cand: Cell, chosen: Cell[]) => boolean
  ): Cell[] => {
    const candidates: Cell[] = [];
    for (let y = 0; y < WORLD_SIZE; y++) {
      for (let x = 0; x < WORLD_SIZE; x++) {
        const c = { x, y };
        if (cluster(c) || isTower(c) || special.has(key(c))) continue;
        candidates.push(c);
      }
    }
    const chosen: Cell[] = [];
    for (const cand of shuffle(candidates, rng)) {
      if (!accept(cand, chosen)) continue;
      special.set(key(cand), kind);
      chosen.push(cand);
      if (chosen.length === count) break;
    }
    if (chosen.length < count) {
      throw new Error(`World generator could not place ${count} ${kind} tiles for seed "${seed}"`);
    }
    return chosen;
  };

  const rivals = place('rival', SPECIAL_COUNTS.rival, (c, chosen) =>
    cheb(c, CITADEL) >= 30 && chosen.every((p) => cheb(c, p) >= 40)
  );
  const outposts = place('outpost', SPECIAL_COUNTS.outpost, (c, chosen) =>
    cheb(c, CITADEL) >= 8 && chosen.every((p) => cheb(c, p) >= 15)
  );
  place('lair', SPECIAL_COUNTS.lair, (c, chosen) =>
    cheb(c, CITADEL) >= 3 && chosen.every((p) => cheb(c, p) >= 2)
  );
  place('ruin', SPECIAL_COUNTS.ruin, () => true);

  const rivalIndex = new Map(rivals.map((c, i) => [key(c), i] as const));
  const outpostKeys = new Set(outposts.map(key));

  const tiles: WorldTile[] = [];
  for (let y = 0; y < WORLD_SIZE; y++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      const id = tileIdFor(x, y);
      const biome = biomeForCell(x, y);
      const k = `${x},${y}`;
      const dist = Math.hypot(x - CITADEL.x, y - CITADEL.y);
      const base = { id, q: x, r: y, x, y, biome };

      if (x === CITADEL.x && y === CITADEL.y) {
        tiles.push({
          ...base,
          type: 'player_citadel',
          name: 'Your Sovereign Citadel',
          level: 1,
          owner: 'player',
          ownerName: 'Lord Commander',
          garrisonPower: 1200,
          garrisonTroops: 100,
          resourceYield: { food: 50, timber: 50, stone: 50, iron: 40, mana: 25 },
        });
        continue;
      }

      if (cluster({ x, y })) {
        const chosenType = CLUSTER_TYPES[(y * 3 + x) % CLUSTER_TYPES.length];
        tiles.push({
          ...base,
          type: chosenType,
          name: `Imperial ${chosenType.replace(/_/g, ' ').toUpperCase()}`,
          level: 1,
          owner: 'player',
          ownerName: 'Lord Commander',
          garrisonPower: 450,
          garrisonTroops: 50,
          resourceYield: {
            food: chosenType === 'farmland' ? 40 : 10,
            timber: chosenType === 'lumber_mill' ? 40 : 10,
            stone: chosenType === 'stone_quarry' ? 35 : 10,
            iron: chosenType === 'iron_vein' ? 30 : 8,
          },
        });
        continue;
      }

      const kind = special.get(k);

      if (kind === 'tower') {
        tiles.push({
          ...base,
          type: 'mythical_tower',
          name: 'Mythical Tower',
          level: 6,
          owner: 'neutral',
          garrisonPower: 9000,
          garrisonTroops: 2000,
          resourceYield: { mana: 150 },
        });
        continue;
      }

      if (outpostKeys.has(k)) {
        tiles.push({
          ...base,
          type: 'alliance_outpost',
          name: 'Dragon Legion Bastion',
          level: 5,
          owner: 'alliance',
          ownerName: 'Order of Crimson Dragon',
          garrisonPower: 6500,
          garrisonTroops: 1800,
          resourceYield: { food: 50, timber: 50, stone: 50, iron: 50, mana: 40 },
        });
        continue;
      }

      if (rivalIndex.has(k)) {
        const idx = rivalIndex.get(k)!;
        tiles.push({
          ...base,
          type: 'rival_citadel',
          name: idx === 0 ? 'Citadel of Shadow Syndicate' : 'Iron Vipers Stronghold',
          level: 7,
          owner: 'rival',
          ownerName: idx === 0 ? 'Shadow Syndicate' : 'Iron Vipers',
          garrisonPower: 11500,
          garrisonTroops: 3800,
          resourceYield: { food: 120, timber: 120, stone: 120, iron: 120, mana: 90 },
        });
        continue;
      }

      if (kind === 'lair') {
        const lvl = Math.min(6, 1 + Math.floor(dist / 20));
        tiles.push({
          ...base,
          type: 'monster_lair',
          name: MONSTER_NAMES[Math.floor(rng() * MONSTER_NAMES.length)],
          level: lvl,
          owner: 'neutral',
          monsterType: 'Ancient Behemoth',
          garrisonPower: 1800 * lvl,
          garrisonTroops: 400 * lvl,
          resourceYield: { mana: 90, iron: 70 },
          exclusiveCardDrop: 'uc_gryphon_storm',
        });
        continue;
      }

      if (kind === 'ruin') {
        tiles.push({
          ...base,
          type: 'ancient_ruin',
          name: 'Sunken Relic Shrine',
          level: 4,
          owner: 'neutral',
          garrisonPower: 3400,
          garrisonTroops: 900,
          resourceYield: { mana: 120 },
          exclusiveCardDrop: 'ec_cornucopia',
        });
        continue;
      }

      // Wild resource node, drawn from the biome's node table.
      const nodes = BIOME_NODE_TYPES[biome];
      const chosenType = nodes[Math.floor(rng() * nodes.length)];
      const lvl = Math.min(6, 1 + Math.floor(dist / 20));
      tiles.push({
        ...base,
        type: chosenType,
        name: `Wild ${chosenType.replace(/_/g, ' ').toUpperCase()} (Lv.${lvl})`,
        level: lvl,
        owner: 'neutral',
        garrisonPower: 800 * lvl,
        garrisonTroops: 200 * lvl,
        resourceYield: {
          food: chosenType === 'farmland' ? 40 * lvl : 10,
          timber: chosenType === 'lumber_mill' ? 40 * lvl : 10,
          stone: chosenType === 'stone_quarry' ? 35 * lvl : 10,
          iron: chosenType === 'iron_vein' ? 30 * lvl : 10,
          mana: chosenType === 'mana_monolith' ? 50 * lvl : 5,
        },
      });
    }
  }

  return tiles;
}

/**
 * Reconciles a saved world with the current generator.
 * - No save: the fresh world.
 * - Saves with legacy tile_<row>_<col> IDs are renamed to t_<col>_<row>, then every saved
 *   tile is kept with its state and the rest is filled from the generator.
 * - Current-format saves: kept as saved, biome tags backfilled.
 * Marches and other records that reference tile IDs must be translated by the caller with
 * migrateTileId() (not yet wired into the client).
 */
export function reconcileWorldTiles(
  saved: WorldTile[] | null | undefined,
  seed: string = WORLD_SEED
): WorldTile[] {
  const fresh = generateWorldTiles(seed);
  if (!saved || saved.length === 0) return fresh;

  const savedById = new Map<string, WorldTile>();
  for (const t of saved) {
    const id = migrateTileId(t.id);
    savedById.set(id, { ...t, id });
  }
  return fresh.map((f) => {
    const s = savedById.get(f.id);
    if (!s) return f;
    return { ...f, ...s, biome: f.biome };
  });
}
