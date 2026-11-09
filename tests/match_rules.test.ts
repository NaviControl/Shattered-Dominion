import { describe, it } from 'node:test';
import assert from 'node:assert';
import { starterPull, RARITY_PER_MILLE, RosterEntry } from '../src/match/starter.ts';
import { citadelRosterIds, factionActs, withinPowerCap, BIOME_ELEMENT, NPC_EVERY } from '../src/match/npc.ts';

const roster: Array<RosterEntry & { element: string }> = [];
for (const [rarity] of RARITY_PER_MILLE) for (let i = 0; i < 6; i++) roster.push({ creatureId: `SD-${rarity}-${i}`, rarity, tier: 1 + (i % 6), element: i % 2 ? 'Fire' : 'Light' });

describe('RULE-01 / Starter pull', () => {
  it('is deterministic for a player seed', () => {
    assert.deepStrictEqual(starterPull('player-1', roster), starterPull('player-1', roster));
  });
  it('rarity frequencies follow the approved table over many seeds', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 4000; i++) { const r = starterPull('seed-' + i, roster).rarity; counts[r] = (counts[r] ?? 0) + 1; }
    assert.ok(counts.common > 1800 && counts.common < 2200, 'about 50.5% common');
    assert.ok(RARITY_PER_MILLE.reduce((s, [, w]) => s + w, 0) === 1000);
  });
});

describe('RULE-02 / NPC citadel rosters', () => {
  it('field creatures of the land tier, preferring the terrain element', () => {
    const ids = citadelRosterIds(roster, 3, 'ignis_caldera');
    const byId = new Map(roster.map(c => [c.creatureId, c]));
    assert.ok(ids.length > 0);
    for (const id of ids) assert.strictEqual(byId.get(id)!.tier, 3);
    const fire = roster.filter(c => c.tier === 3 && c.element === 'Fire');
    if (fire.length >= 3) for (const id of ids) assert.strictEqual(byId.get(id)!.element, 'Fire');
  });
});

describe('RULE-03 / NPC schedule and power cap', () => {
  it('a faction acts once every NPC_EVERY turns, staggered by index', () => {
    const acts = [0, 1, 2, 3, 4, 5].filter(t => factionActs(t, 0));
    assert.strictEqual(NPC_EVERY, 3);
    assert.deepStrictEqual(acts, [0, 3]);
    assert.ok(factionActs(1, 2));
  });
  it('a roster far stronger than the player cannot attack', () => {
    assert.strictEqual(withinPowerCap(1000, 1000), true);
    assert.strictEqual(withinPowerCap(1600, 1000), false);
  });
});
