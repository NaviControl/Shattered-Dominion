import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { generateWorldTiles, WORLD_SEED } from '../src/game/worldGenerator.ts';
import {
  createSimState, applyCommand, step, stateHash, factionForWorldTile, startingGarrison, stagingPool,
  SIM_CONFIG, PLAYER_ID, SimState, SimTile,
} from '../src/sim/engine.ts';
import { botAct } from '../src/sim/bot.ts';

const tile = (over: Partial<SimTile> & { id: string; x: number; y: number }): SimTile => ({
  biome: 'sol_heights', tower: false, owner: null, troops: 0, maxTroops: 0, power: 0, ...over,
});
const custom = (tiles: SimTile[], extra: Partial<SimState> = {}): SimState => ({
  tick: 0, status: 'ongoing', tiles, armies: [], factions: ['npc_test'], nextArmyNumber: 1, ...extra,
});

function playBot(seed: string, ticks: number) {
  let s = createSimState(generateWorldTiles(seed));
  const checkpoints: Array<{ tick: number; hash: string }> = [{ tick: 0, hash: stateHash(s) }];
  while (s.status === 'ongoing' && s.tick < ticks) {
    const cmd = botAct(s);
    if (cmd) { const r = applyCommand(s, cmd); if (r.ok) s = r.state; }
    s = step(s);
    if (s.tick % 50 === 0) checkpoints.push({ tick: s.tick, hash: stateHash(s) });
  }
  return { s, checkpoints };
}

describe('SIM-01 / Initial state', () => {
  const s = createSimState(generateWorldTiles());

  it('creates 100 tiles with the starting owners', () => {
    assert.strictEqual(s.tiles.length, 10000);
    assert.strictEqual(s.tiles.filter(t => t.owner === PLAYER_ID).length, 9);
    // Neutral = everything not owned by the player or an NPC: 6 towers, 100 lairs, 50 ruins, wild nodes.
    assert.strictEqual(s.tiles.filter(t => t.owner === null).length, 9986);
    assert.strictEqual(s.tiles.filter(t => t.tower).length, 6);
  });

  it('gives each NPC citadel its own faction, sorted', () => {
    assert.deepStrictEqual(s.factions, ['npc_iron_vipers', 'npc_order_of_crimson_dragon', 'npc_shadow_syndicate']);
    const rival = generateWorldTiles().find(t => t.ownerName === 'Iron Vipers')!;
    assert.strictEqual(factionForWorldTile(rival), 'npc_iron_vipers');
  });

  it('uses the starting garrison table', () => {
    assert.deepStrictEqual(startingGarrison({ type: 'player_citadel', level: 1 } as any, PLAYER_ID), { troops: 30, power: 40 });
    assert.deepStrictEqual(startingGarrison({ type: 'rival_citadel', level: 7 } as any, 'npc_x'), { troops: 28, power: 70 });
  });
});

describe('SIM-02 / Command validation', () => {
  const base = custom([
    tile({ id: 'a', x: 0, y: 0, owner: PLAYER_ID, troops: 10, maxTroops: 10 }),
    tile({ id: 'b', x: 1, y: 0, owner: null, troops: 2, maxTroops: 2, power: 1 }),
    tile({ id: 'c', x: 2, y: 0, owner: null, troops: 2, maxTroops: 2, power: 1 }),
    tile({ id: 'd', x: 0, y: 1, owner: PLAYER_ID, troops: 5, maxTroops: 5 }),
  ]);
  const march = (over: object = {}) => ({
    type: 'march' as const, playerId: PLAYER_ID, from: 'a', to: 'b', troops: 4, formation: 'balanced' as const, ...over,
  });

  it('accepts a legal march and removes the troops from the source', () => {
    const r = applyCommand(base, march());
    assert.ok(r.ok);
    assert.strictEqual(r.state.tiles.find(t => t.id === 'a')!.troops, 6);
    assert.strictEqual(r.state.armies.length, 1);
    assert.strictEqual(r.state.armies[0].arriveTick, SIM_CONFIG.MARCH_TICKS);
  });

  it('rejects non-adjacent targets', () => {
    const r = applyCommand(base, march({ to: 'c' }));
    assert.ok(!r.ok && /not adjacent/.test(r.error));
  });

  it('rejects a source the player does not own', () => {
    const r = applyCommand(base, march({ from: 'b', to: 'a' }));
    assert.ok(!r.ok && /not yours/.test(r.error));
  });

  it('rejects targets the player already owns', () => {
    const r = applyCommand(base, march({ to: 'd' }));
    assert.ok(!r.ok && /already yours/.test(r.error));
  });

  it('limits troops to the staging pool, which keeps one troop on each owned tile', () => {
    // a has 10 (9 usable) and d, within radius 2, has 5 (4 usable): pool = 13.
    assert.ok(applyCommand(base, march({ troops: 13 })).ok);
    assert.ok(!applyCommand(base, march({ troops: 14 })).ok);
  });

  it('rejects non-integer, zero, and unknown-formation orders', () => {
    assert.ok(!applyCommand(base, march({ troops: 2.5 })).ok);
    assert.ok(!applyCommand(base, march({ troops: 0 })).ok);
    assert.ok(!applyCommand(base, march({ formation: 'reckless' })).ok);
  });

  it('rejects commands after the match has ended', () => {
    const ended = { ...base, status: 'victory' as const };
    assert.ok(!applyCommand(ended, march()).ok);
  });
});

describe('SIM-02b / Staging pool', () => {
  const state = custom([
    tile({ id: 'a', x: 0, y: 0, owner: PLAYER_ID, troops: 10, maxTroops: 10 }),
    tile({ id: 'p1', x: 2, y: 0, owner: PLAYER_ID, troops: 6, maxTroops: 6 }),
    tile({ id: 'p2', x: 3, y: 0, owner: PLAYER_ID, troops: 9, maxTroops: 9 }),
    tile({ id: 'e', x: 1, y: 0, owner: 'npc_test', troops: 9, maxTroops: 9 }),
    tile({ id: 'b', x: 0, y: 1, owner: null, troops: 1, maxTroops: 1 }),
    tile({ id: 'n', x: 9, y: 9, owner: 'npc_test', troops: 5, maxTroops: 5 }),
  ]);

  it('counts owned tiles within radius 2, excludes radius 3 and other factions', () => {
    const origin = state.tiles.find(t => t.id === 'a')!;
    // a: 9 usable, p1 (distance 2): 5 usable, p2 (distance 3) excluded, e is not owned.
    assert.strictEqual(stagingPool(state, origin, PLAYER_ID), 14);
  });

  it('draws nearest tiles first and keeps one troop on each', () => {
    const r = applyCommand(state, { type: 'march', playerId: PLAYER_ID, from: 'a', to: 'b', troops: 12, formation: 'balanced' });
    assert.ok(r.ok);
    assert.strictEqual(r.state.tiles.find(t => t.id === 'a')!.troops, 1);
    assert.strictEqual(r.state.tiles.find(t => t.id === 'p1')!.troops, 3);
    assert.strictEqual(r.state.tiles.find(t => t.id === 'p2')!.troops, 9);
  });
});

describe('SIM-03 / Combat resolution', () => {
  it('captures a weak tile and sets the new owner and survivors', () => {
    // A distant NPC tile keeps the match ongoing while the march is in transit.
    let s = custom([
      tile({ id: 'a', x: 0, y: 0, owner: PLAYER_ID, troops: 20, maxTroops: 20 }),
      tile({ id: 'b', x: 1, y: 0, owner: null, troops: 1, maxTroops: 1, power: 0 }),
      tile({ id: 'n', x: 9, y: 9, owner: 'npc_test', troops: 5, maxTroops: 5 }),
    ]);
    s = applyCommand(s, { type: 'march', playerId: PLAYER_ID, from: 'a', to: 'b', troops: 9, formation: 'balanced' }).state as SimState;
    for (let i = 0; i < SIM_CONFIG.MARCH_TICKS; i++) s = step(s);
    const b = s.tiles.find(t => t.id === 'b')!;
    assert.strictEqual(b.owner, PLAYER_ID);
    assert.ok(b.troops >= 1);
    assert.strictEqual(s.armies.length, 0);
  });

  it('a failed attack destroys the army and wears down defenders', () => {
    let s = custom([
      tile({ id: 'a', x: 0, y: 0, owner: PLAYER_ID, troops: 10, maxTroops: 10 }),
      tile({ id: 'b', x: 1, y: 0, owner: 'npc_test', troops: 20, maxTroops: 20, power: 500 }),
    ]);
    s = applyCommand(s, { type: 'march', playerId: PLAYER_ID, from: 'a', to: 'b', troops: 4, formation: 'balanced' }).state as SimState;
    for (let i = 0; i < SIM_CONFIG.MARCH_TICKS; i++) s = step(s);
    const b = s.tiles.find(t => t.id === 'b')!;
    assert.strictEqual(b.owner, 'npc_test');
    assert.ok(b.troops < 20);
    assert.strictEqual(s.armies.length, 0);
  });
});

describe('SIM-04 / Regeneration', () => {
  it('owned tiles regrow toward their maximum on the growth interval', () => {
    // An NPC tile keeps the match ongoing; with no opponents the match ends and ticks stop.
    let s = custom([
      tile({ id: 'a', x: 0, y: 0, owner: PLAYER_ID, troops: 3, maxTroops: 10 }),
      tile({ id: 'n', x: 9, y: 9, owner: 'npc_test', troops: 5, maxTroops: 5 }),
    ]);
    for (let i = 0; i < SIM_CONFIG.GROWTH_INTERVAL; i++) s = step(s);
    assert.strictEqual(s.tiles[0].troops, 3 + SIM_CONFIG.GROWTH_AMOUNT);
  });

  it('never exceeds the maximum and ignores neutral tiles', () => {
    let s = custom([
      tile({ id: 'a', x: 0, y: 0, owner: PLAYER_ID, troops: 10, maxTroops: 10 }),
      tile({ id: 'b', x: 1, y: 0, owner: null, troops: 1, maxTroops: 1 }),
    ]);
    for (let i = 0; i < 40; i++) s = step(s);
    assert.strictEqual(s.tiles.find(t => t.id === 'a')!.troops, 10);
    assert.strictEqual(s.tiles.find(t => t.id === 'b')!.troops, 1);
  });
});

describe('SIM-05 / NPC behaviour', () => {
  it('an NPC with a strong tile sends an army at a weak neighbour on its decision tick', () => {
    // A player tile far away keeps the match ongoing; without it the match ends and step() stops advancing.
    let s = custom([
      tile({ id: 'p', x: 9, y: 9, owner: PLAYER_ID, troops: 5, maxTroops: 5 }),
      tile({ id: 'a', x: 0, y: 0, owner: 'npc_test', troops: 30, maxTroops: 30, power: 0 }),
      tile({ id: 'b', x: 1, y: 0, owner: null, troops: 1, maxTroops: 1, power: 0 }),
    ]);
    for (let i = 0; i < SIM_CONFIG.NPC_INTERVAL; i++) s = step(s);
    assert.strictEqual(s.tick, SIM_CONFIG.NPC_INTERVAL);
    const npcArmies = s.armies.filter(a => a.owner === 'npc_test');
    assert.strictEqual(npcArmies.length, 1, 'the NPC should have sent exactly one army');
    assert.strictEqual(npcArmies[0].to, 'b');
    assert.strictEqual(s.tiles.find(t => t.id === 'a')!.troops, 30 - npcArmies[0].troops);
  });
});

describe('SIM-06 / Integer-only state', () => {
  it('every numeric field stays a non-negative integer through a long match', () => {
    const { s } = playBot(WORLD_SEED, 400);
    for (const t of s.tiles) {
      for (const v of [t.x, t.y, t.troops, t.maxTroops, t.power]) {
        assert.ok(Number.isInteger(v) && v >= 0, `tile ${t.id} has a non-integer or negative value ${v}`);
      }
    }
    for (const a of s.armies) {
      assert.ok(Number.isInteger(a.troops) && a.troops >= 1);
      assert.ok(Number.isInteger(a.arriveTick));
    }
  });
});

describe('SIM-08 / Mythical towers and victory (CR-001)', () => {
  const towers = (n: number, owner: string | null) =>
    Array.from({ length: n }, (_, i) => tile({ id: `tw${i}`, x: 2 * i, y: 0, tower: true, owner, troops: 5, maxTroops: 5, power: 1 }));

  it('wins when the player holds 4 of the 6 towers', () => {
    const tiles = [...towers(4, PLAYER_ID), ...towers(2, null).map((t, i) => ({ ...t, id: `x${i}`, x: 2 * i, y: 9 })),
      tile({ id: 'n', x: 9, y: 0, owner: 'npc_test', troops: 5, maxTroops: 5 })];
    const s = step(custom(tiles));
    assert.strictEqual(s.status, 'victory');
  });

  it('does not win with only 3 towers, even if every NPC is gone', () => {
    const tiles = [...towers(3, PLAYER_ID), ...towers(3, null).map((t, i) => ({ ...t, id: `y${i}`, x: 2 * i, y: 9 }))];
    const s = step(custom(tiles));
    assert.strictEqual(s.status, 'ongoing');
  });
});

describe('SIM-07 / Determinism and golden replay', () => {
  it('the same seed and bot produce identical checkpoints on every run', () => {
    const a = playBot(WORLD_SEED, 300).checkpoints;
    const b = playBot(WORLD_SEED, 300).checkpoints;
    assert.deepStrictEqual(a, b);
  });

  it('matches the committed golden replay checkpoint for checkpoint', () => {
    const golden = JSON.parse(readFileSync(new URL('./golden/sim_match.json', import.meta.url), 'utf8'));
    const { checkpoints, s } = playBot(golden.seed, golden.final.tick);
    assert.deepStrictEqual(checkpoints, golden.checkpoints);
    assert.strictEqual(stateHash(s), golden.final.hash);
  });
});
