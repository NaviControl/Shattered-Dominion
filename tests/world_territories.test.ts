import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateWorldTiles, getSquareWorldPos, isTileAdjacentToPlayer } from '../src/game/territorySystem.ts';

describe('SD-02 / World Territories & Continuous Grid Invariant (CR-001)', () => {
  const tiles = generateWorldTiles();

  it('generates exactly 10,000 territories on a 100 x 100 grid', () => {
    assert.strictEqual(tiles.length, 10000);
  });

  it('uses coordinates 0..99 on both axes with no duplicates or gaps', () => {
    const coords = new Set<string>();
    for (const t of tiles) {
      assert.ok(t.x >= 0 && t.x <= 99, `x ${t.x} out of bounds`);
      assert.ok(t.y >= 0 && t.y <= 99, `y ${t.y} out of bounds`);
      coords.add(`${t.x},${t.y}`);
    }
    assert.strictEqual(coords.size, 10000);
  });

  it('contains the player citadel with positive garrison', () => {
    const citadel = tiles.find(t => t.type === 'player_citadel');
    assert.ok(citadel);
    assert.strictEqual(citadel!.owner, 'player');
    assert.ok(citadel!.garrisonPower > 0);
  });

  it('enforces strict orthogonal adjacency for conquest expansion', () => {
    const playerTiles = tiles.filter(t => t.owner === 'player');
    const frontier = tiles.find(
      t => t.owner !== 'player' && playerTiles.some(pt => Math.abs(pt.x - t.x) + Math.abs(pt.y - t.y) === 1)
    );
    assert.ok(frontier, 'adjacent unowned frontier tile must exist');
    assert.strictEqual(isTileAdjacentToPlayer(frontier!.id, tiles), true);
  });

  it('centres the 100 x 100 grid on the origin with 12-unit squares', () => {
    assert.strictEqual(getSquareWorldPos(0, 0).x, -594);
    assert.strictEqual(getSquareWorldPos(99, 99).x, 594);
    assert.strictEqual(getSquareWorldPos(99, 99).z, 594);
    assert.ok(getSquareWorldPos(1, 0).x > getSquareWorldPos(0, 0).x);
  });
});
