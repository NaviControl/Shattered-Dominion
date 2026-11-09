import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  WORLD_N, SQUARE, CHUNK_TILES, CHUNKS_PER_AXIS, tileCenter, worldToTile, chunkOf, tileRangeOf,
  chunkWorldRect, allChunks, lodForDistance, segmentsPerAxis, visibleChunks, biomeBlend, LOD_THRESHOLDS,
} from '../src/rendering/chunking.ts';

describe('REND-01 / Chunk layout', () => {
  it('splits the 100 x 100 world into 7 x 7 chunks of at most 16 x 16 territories', () => {
    assert.strictEqual(WORLD_N, 100);
    assert.strictEqual(CHUNK_TILES, 16);
    assert.strictEqual(CHUNKS_PER_AXIS, 7);
    assert.strictEqual(allChunks().length, 49);
  });

  it('assigns every territory to exactly one chunk', () => {
    const counts = new Map<string, number>();
    for (let y = 0; y < WORLD_N; y++) {
      for (let x = 0; x < WORLD_N; x++) {
        const c = chunkOf(x, y);
        const key = `${c.cx},${c.cy}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
        const r = tileRangeOf(c);
        assert.ok(x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1, `(${x},${y}) outside its chunk`);
      }
    }
    assert.strictEqual(counts.size, 49);
    assert.strictEqual([...counts.values()].reduce((a, b) => a + b, 0), 10000);
  });

  it('gives edge chunks the remaining 4 territories', () => {
    assert.deepStrictEqual(tileRangeOf({ cx: 6, cy: 6 }), { x0: 96, x1: 99, y0: 96, y1: 99 });
    assert.deepStrictEqual(tileRangeOf({ cx: 0, cy: 0 }), { x0: 0, x1: 15, y0: 0, y1: 15 });
  });

  it('chunk world rectangles tile the world without gaps', () => {
    const rects = allChunks().map(chunkWorldRect);
    const minX = Math.min(...rects.map(r => r.minX));
    const maxX = Math.max(...rects.map(r => r.maxX));
    // Tile centres run from -594 to 594; chunk edges extend half a square further.
    assert.strictEqual(minX, -600);
    assert.strictEqual(maxX, 600);
    const adjacent = chunkWorldRect({ cx: 0, cy: 0 });
    const next = chunkWorldRect({ cx: 1, cy: 0 });
    assert.strictEqual(adjacent.maxX, next.minX);
  });
});

describe('REND-02 / Picking maps world points back to territories', () => {
  it('round-trips every territory centre', () => {
    for (let y = 0; y < WORLD_N; y++) {
      for (let x = 0; x < WORLD_N; x++) {
        const c = tileCenter(x, y);
        assert.deepStrictEqual(worldToTile(c.x, c.z), { x, y });
      }
    }
  });

  it('maps points near a territory edge to that territory', () => {
    const c = tileCenter(30, 40);
    assert.deepStrictEqual(worldToTile(c.x + SQUARE * 0.45, c.z - SQUARE * 0.45), { x: 30, y: 40 });
  });

  it('returns null off the map', () => {
    assert.strictEqual(worldToTile(700, 0), null);
    assert.strictEqual(worldToTile(0, -700), null);
  });
});

describe('REND-03 / Level of detail', () => {
  it('picks LOD 0 near, 1 mid, 2 far using the default thresholds', () => {
    const [a, b] = LOD_THRESHOLDS;
    assert.strictEqual(lodForDistance(a - 1), 0);
    assert.strictEqual(lodForDistance(a), 1);
    assert.strictEqual(lodForDistance(b), 2);
  });

  it('halves segment count per LOD step and never drops below one segment', () => {
    assert.strictEqual(segmentsPerAxis(0, 16), 32);
    assert.strictEqual(segmentsPerAxis(1, 16), 16);
    assert.strictEqual(segmentsPerAxis(2, 16), 8);
    assert.strictEqual(segmentsPerAxis(2, 4), 2);
    assert.strictEqual(segmentsPerAxis(2, 1), 1);
  });

  it('culls chunks beyond the radius and assigns each kept chunk a LOD', () => {
    const near = visibleChunks(0, 0, 200);
    assert.ok(near.length > 0 && near.length < 49);
    assert.ok(near.every(v => v.lod === 0), 'close chunks are full detail');
    const all = visibleChunks(0, 0, 5000);
    assert.strictEqual(all.length, 49);
    // From the centre, the farthest chunk is about 810 units away, inside the LOD 1 band.
    assert.ok(all.every(v => v.lod !== 2), 'no chunk reaches LOD 2 from the centre');
    // From a corner the far chunks reach LOD 2.
    const fromCorner = visibleChunks(-594, -594, 5000);
    assert.ok(fromCorner.some(v => v.lod === 2), 'far chunks drop to LOD 2 when the camera is at a corner');
  });
});

describe('REND-04 / Biome blending', () => {
  it('weights sum to 1 everywhere', () => {
    for (let wx = -700; wx <= 700; wx += 37) {
      for (let wz = -700; wz <= 700; wz += 41) {
        const w = biomeBlend(wx, wz);
        const sum = w[0] + w[1] + w[2] + w[3];
        assert.ok(Math.abs(sum - 1) < 1e-9, `sum ${sum} at ${wx},${wz}`);
      }
    }
  });

  it('is pure to one biome deep inside each quadrant', () => {
    assert.deepStrictEqual(biomeBlend(-300, -300).map(v => Math.round(v)), [1, 0, 0, 0]);
    assert.deepStrictEqual(biomeBlend(300, -300).map(v => Math.round(v)), [0, 1, 0, 0]);
    assert.deepStrictEqual(biomeBlend(-300, 300).map(v => Math.round(v)), [0, 0, 1, 0]);
    assert.deepStrictEqual(biomeBlend(300, 300).map(v => Math.round(v)), [0, 0, 0, 1]);
  });

  it('splits evenly across the boundary at the axes', () => {
    const w = biomeBlend(0, 0);
    assert.ok(Math.abs(w[0] - 0.25) < 1e-9 && Math.abs(w[3] - 0.25) < 1e-9);
  });
});
