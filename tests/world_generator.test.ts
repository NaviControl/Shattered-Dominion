import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createHash } from 'node:crypto';
import {
  generateWorldTiles, reconcileWorldTiles, biomeForCell, migrateTileId, tileIdFor,
  WORLD_SEED, WORLD_SIZE, TOWER_COORDS, CITADEL,
} from '../src/game/worldGenerator.ts';
import { WorldTile } from '../src/game/types.ts';

// Golden fingerprint of the WORLD_SEED map (CR-001, 10,000 territories).
// Change only as a deliberate, reviewed content change.
const GOLDEN_MAP_SHA256 = 'faf16574710b5b880926f45fc78cfbec5fae2eb21233d2b6765c8231459dfa81';

const sha = (tiles: WorldTile[]) => createHash('sha256').update(JSON.stringify(tiles)).digest('hex');
const count = (tiles: WorldTile[], type: string) => tiles.filter(t => t.type === type).length;

describe('SD-02 / Deterministic 10,000-territory world generator (CR-001)', () => {
  it('uses a 100 x 100 grid with integer coordinates 0..99', () => {
    assert.strictEqual(WORLD_SIZE, 100);
    const tiles = generateWorldTiles();
    assert.ok(tiles.every(t => Number.isInteger(t.x) && Number.isInteger(t.y)));
    assert.ok(tiles.every(t => t.x >= 0 && t.x <= 99 && t.y >= 0 && t.y <= 99));
  });

  it('uses t_<x>_<y> territory IDs', () => {
    for (const t of generateWorldTiles()) assert.strictEqual(t.id, tileIdFor(t.x, t.y));
  });

  it('same seed always yields an identical map', () => {
    assert.deepStrictEqual(generateWorldTiles(), generateWorldTiles(WORLD_SEED));
  });

  it('matches the golden fingerprint for the canonical seed', () => {
    assert.strictEqual(sha(generateWorldTiles(WORLD_SEED)), GOLDEN_MAP_SHA256);
  });

  it('a different seed produces a different map of the same size', () => {
    const alt = generateWorldTiles('alt-seed-check');
    assert.strictEqual(alt.length, 10000);
    assert.notStrictEqual(sha(alt), sha(generateWorldTiles(WORLD_SEED)));
  });

  it('places exactly six mythical towers at the agreed coordinates', () => {
    const tiles = generateWorldTiles();
    assert.strictEqual(count(tiles, 'mythical_tower'), 6);
    for (const c of TOWER_COORDS) {
      const t = tiles.find(x => x.x === c.x && x.y === c.y);
      assert.strictEqual(t?.type, 'mythical_tower', `tower missing at ${c.x},${c.y}`);
    }
  });

  it('places towers symmetrically about the centre (49.5, 49.5)', () => {
    const at = (x: number, y: number) => TOWER_COORDS.some(c => c.x === x && c.y === y);
    // Point symmetry: each corner tower has its opposite corner.
    assert.ok(at(22, 22) && at(77, 77), 'NW and SE corner towers mirror through the centre');
    assert.ok(at(77, 22) && at(22, 77), 'NE and SW corner towers mirror through the centre');
    // Mirror in x: the centre pair sums to 99.
    assert.ok(at(46, 49) && at(53, 49) && 46 + 53 === 99, 'centre pair mirrors across the vertical axis');
  });

  it('has the expected special-tile composition', () => {
    const tiles = generateWorldTiles();
    assert.strictEqual(count(tiles, 'player_citadel'), 1);
    assert.strictEqual(tiles.filter(t => t.owner === 'player').length, 9);
    assert.strictEqual(count(tiles, 'rival_citadel'), 2);
    assert.strictEqual(count(tiles, 'alliance_outpost'), 3);
    assert.strictEqual(count(tiles, 'monster_lair'), 100);
    assert.strictEqual(count(tiles, 'ancient_ruin'), 50);
  });

  it('places exactly 2,500 territories in each quadrant, with axes between squares', () => {
    const tiles = generateWorldTiles();
    const perBiome: Record<string, number> = {};
    for (const t of tiles) {
      perBiome[t.biome!] = (perBiome[t.biome!] ?? 0) + 1;
      assert.strictEqual(t.biome, biomeForCell(t.x, t.y));
    }
    assert.deepStrictEqual(perBiome, { sol_heights: 2500, ignis_caldera: 2500, frost_wastes: 2500, abyssal_marshes: 2500 });
    assert.strictEqual(biomeForCell(49, 49), 'sol_heights');
    assert.strictEqual(biomeForCell(50, 50), 'abyssal_marshes');
  });

  it('keeps the citadel at (4,4) with its 8-neighbour cluster player-owned', () => {
    const tiles = generateWorldTiles();
    const c = tiles.find(t => t.x === CITADEL.x && t.y === CITADEL.y)!;
    assert.strictEqual(c.type, 'player_citadel');
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const t = tiles.find(x => x.x === CITADEL.x + dx && x.y === CITADEL.y + dy)!;
      assert.strictEqual(t.owner, 'player');
    }
  });

  it('keeps specials clear of the starting cluster and spaces the rivals apart', () => {
    const tiles = generateWorldTiles();
    const cheb = (a: WorldTile, b: { x: number; y: number }) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    const rivals = tiles.filter(t => t.type === 'rival_citadel');
    assert.ok(rivals.every(r => cheb(r, CITADEL) >= 30));
    assert.ok(cheb(rivals[0], rivals[1]) >= 40);
    for (const t of tiles.filter(x => x.type === 'monster_lair' || x.type === 'alliance_outpost')) {
      assert.ok(cheb(t, CITADEL) >= 3, `${t.id} sits in the starting cluster`);
    }
  });

  describe('legacy ID migration', () => {
    it('maps tile_<row>_<col> to t_<col>_<row>', () => {
      assert.strictEqual(migrateTileId('tile_3_7'), 't_7_3');
      assert.strictEqual(migrateTileId('t_7_3'), 't_7_3');
    });

    it('reconciles a legacy 100-tile save without losing owned state', () => {
      const fresh = generateWorldTiles();
      const legacy = fresh
        .filter(t => t.x < 10 && t.y < 10)
        .map(t => ({ ...t, id: `tile_${t.y}_${t.x}`, biome: undefined }));
      assert.strictEqual(legacy.length, 100);
      const target = legacy.find(t => t.owner === 'neutral')!;
      target.owner = 'player';
      target.garrisonTroops = 77;

      const merged = reconcileWorldTiles(legacy as WorldTile[]);
      assert.strictEqual(merged.length, 10000);
      assert.strictEqual(new Set(merged.map(t => t.id)).size, 10000);
      const kept = merged.find(t => t.x === target.x && t.y === target.y)!;
      assert.strictEqual(kept.owner, 'player');
      assert.strictEqual(kept.garrisonTroops, 77);
      assert.ok(merged.every(t => t.id === tileIdFor(t.x, t.y)));
    });

    it('no save returns the full fresh world', () => {
      assert.deepStrictEqual(reconcileWorldTiles(null), generateWorldTiles());
    });
  });
});
