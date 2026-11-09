import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { calculateCreatureStatsAtLevel, calculateCreatureSynergies } from '../src/game/creatureBalance.ts';
import type { CreatureCard } from '../src/game/types.ts';

const table = JSON.parse(readFileSync(new URL('../unity_handoff/data/creature_stat_table.json', import.meta.url), 'utf8'));
const synergy = JSON.parse(readFileSync(new URL('../unity_handoff/data/creature_synergy_rules.json', import.meta.url), 'utf8'));

describe('CREAT-01 / Exported stat table', () => {
  it('covers 6 tiers x 6 rarities x 50 levels', () => {
    assert.strictEqual(table.table.length, 36);
    for (const row of table.table) assert.strictEqual(row.levels.length, 50);
  });

  it('holds integers only', () => {
    for (const row of table.table) {
      for (const l of row.levels) {
        for (const k of ['hp', 'atk', 'def', 'spd', 'combatRating', 'expNeededNext', 'goldCostNext']) {
          assert.ok(Number.isInteger(l[k]) && l[k] >= 0, `${row.tier}/${row.rarity} L${l.level} ${k} = ${l[k]}`);
        }
      }
    }
  });

  it('never decreases HP, attack, defence or speed as level rises', () => {
    for (const row of table.table) {
      for (let i = 1; i < row.levels.length; i++) {
        const a = row.levels[i - 1], b = row.levels[i];
        for (const k of ['hp', 'atk', 'def', 'spd']) assert.ok(b[k] >= a[k], `${row.tier}/${row.rarity} ${k} falls at L${b.level}`);
      }
    }
  });

  it('matches the prototype formula for a tier-1 common creature at level 1', () => {
    const row = table.table.find((r: any) => r.tier === 1 && r.rarity === 'common');
    assert.deepStrictEqual(
      { hp: row.levels[0].hp, atk: row.levels[0].atk, def: row.levels[0].def, spd: row.levels[0].spd },
      { hp: 350, atk: 45, def: 35, spd: 48 }
    );
    // Combat rating: round(350*0.25 + 45*1.6 + 35*1.3 + 48*2.1) = round(305.8) = 306.
    assert.strictEqual(row.levels[0].combatRating, 306);
  });

  it('agrees with the live prototype function for sampled inputs', () => {
    for (const [tier, rarity, level] of [[2, 'rare', 7], [4, 'epic', 23], [6, 'mythical', 50], [3, 'legendary', 1]] as const) {
      const row = table.table.find((r: any) => r.tier === tier && r.rarity === rarity);
      const live = calculateCreatureStatsAtLevel({ tier, rarity, stars: tier } as any, level);
      const exported = row.levels[level - 1];
      assert.deepStrictEqual(
        { hp: exported.hp, atk: exported.atk, def: exported.def, spd: exported.spd, combatRating: exported.combatRating },
        { hp: live.hp, atk: live.atk, def: live.def, spd: live.spd, combatRating: live.combatRating }
      );
    }
  });
});

describe('CREAT-02 / Synergy rules', () => {
  it('element bonuses: 2 minor +10, 3 major +20, 4 primal +30', () => {
    const byCount = Object.fromEntries(synergy.elementRules.map((r: any) => [r.count, r]));
    assert.strictEqual(byCount[2].tier, 'minor');
    assert.strictEqual(byCount[2].powerBonusPercent, 10);
    assert.strictEqual(byCount[3].tier, 'major');
    assert.strictEqual(byCount[3].powerBonusPercent, 20);
    assert.strictEqual(byCount[4].tier, 'primal');
    assert.strictEqual(byCount[4].powerBonusPercent, 30);
  });

  it('defines a family bonus for all 12 families with a threshold of 2', () => {
    assert.strictEqual(synergy.familyRules.length, 12);
    assert.ok(synergy.familyRules.every((f: any) => f.threshold === 2));
  });

  it('agrees with the live prototype for two dragons', () => {
    const cards = [{ element: 'Fire', family: 'Dragons' }, { element: 'Water', family: 'Dragons' }] as unknown as CreatureCard[];
    const live = calculateCreatureSynergies(cards).familySynergies[0];
    const exported = synergy.familyRules.find((f: any) => f.family === 'Dragons');
    assert.strictEqual(exported.title, live.title);
    assert.deepStrictEqual(exported.statBonus, live.statBonus);
  });
});
