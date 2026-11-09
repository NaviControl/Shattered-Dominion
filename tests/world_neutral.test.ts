import { describe, it } from 'node:test';
import assert from 'node:assert';
import { neutralKindFor, neutralRoster } from '../src/world/neutral.ts';
import { validateArmy } from '../src/combat/schema.ts';
import { calculateCreatureStatsAtLevel } from '../src/game/creatureBalance.ts';
import { NEUTRAL_ROSTER_DRAFT } from '../src/data/neutralRosters.draft.ts';

describe('NEUTRAL-01 / Neutral rosters (rule approved; data draft)', () => {
  it('maps each neutral tile type to its roster kind', () => {
    for (const t of ['farmland', 'lumber_mill', 'stone_quarry', 'iron_vein', 'mana_monolith', 'monster_lair', 'ancient_ruin', 'mythical_tower']) {
      assert.strictEqual(neutralKindFor(t), t, t);
    }
    assert.strictEqual(neutralKindFor('alliance_outpost'), null);
    assert.strictEqual(neutralKindFor('rival_citadel'), null);
  });

  it('every neutral roster is a legal army at every territory level', () => {
    for (const kind of Object.keys(NEUTRAL_ROSTER_DRAFT) as Array<keyof typeof NEUTRAL_ROSTER_DRAFT>) {
      for (let lvl = 1; lvl <= 6; lvl++) {
        const army = { side: 'defender' as const, creatures: neutralRoster(kind, lvl) };
        assert.deepStrictEqual(validateArmy(army), [], `${kind} at level ${lvl}`);
      }
    }
  });

  it('roster stats come from the prototype formulas', () => {
    const r = neutralRoster('monster_lair', 2);
    const m = NEUTRAL_ROSTER_DRAFT.monster_lair.members[0];
    const live = calculateCreatureStatsAtLevel({ tier: m.tier, rarity: m.rarity, stars: m.tier } as any, r[0].level);
    assert.deepStrictEqual({ hp: r[0].hp, atk: r[0].atk, def: r[0].def, spd: r[0].spd }, { hp: live.hp, atk: live.atk, def: live.def, spd: live.spd });
  });
});
