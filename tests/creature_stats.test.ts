import { describe, it } from 'node:test';
import assert from 'node:assert';
import { applyLevelUp, BASE_STAT_KEYS, BaseStats } from '../src/combat/stats.ts';
import { runBattle } from '../src/combat/battle.ts';
import { CombatCreature, SkillDef } from '../src/combat/schema.ts';

const base: BaseStats = { hp: 100, attack: 20, defense: 10, speed: 30, movement: 2, range: 1, skill_power: 10000, synergy: 10000 };
const mk = (id: string, col: number, row: number, hp: number, atk: number, def: number, spd: number, extra: Partial<CombatCreature> = {}): CombatCreature =>
  ({ instanceId: id, creatureId: 'SYNTH', sizeClass: 'small', anchor: { col, row }, level: 1, hp, atk, def, spd, movement: 1, range: 1, skills: [], passives: [], ...extra });

describe('STAT-01 / Eight baseline stats and level-up allocation', () => {
  it('has exactly eight baseline stats', () => {
    assert.deepStrictEqual([...BASE_STAT_KEYS], ['hp', 'attack', 'defense', 'speed', 'movement', 'range', 'skill_power', 'synergy']);
  });

  it('a level-up spends every granted point across any stats', () => {
    const next = applyLevelUp(base, { attack: 2, hp: 1 }, 3);
    assert.strictEqual(next.attack, 22);
    assert.strictEqual(next.hp, 101);
    assert.strictEqual(next.speed, 30);
  });

  it('refuses an allocation that does not spend exactly the granted points', () => {
    assert.throws(() => applyLevelUp(base, { attack: 2 }, 3), /spends 2 of 3/);
    assert.throws(() => applyLevelUp(base, { attack: 4 }, 3), /spends 4 of 3/);
  });

  it('refuses unknown stats and negative or fractional points', () => {
    assert.throws(() => applyLevelUp(base, { luck: 1 } as any, 1), /unknown stat/);
    assert.throws(() => applyLevelUp(base, { attack: -1, hp: 2 }, 1), /non-negative/);
    assert.throws(() => applyLevelUp(base, { attack: 1.5 }, 1.5), /non-negative integer/);
  });
});

describe('STAT-02 / Skill power and team synergy act in battle', () => {
  const burst: SkillDef = { skillId: 'burst', kind: 'active', cooldownRounds: 100, targeting: 'nearest_enemy', condition: 'enemy_in_range', effects: [{ type: 'damage', amount: 100 }] };

  it('skill power scales skill damage', () => {
    const r = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 500, 20, 0, 99, { skills: [burst], skillPowerBps: 15000 })] },
      { side: 'defender', creatures: [mk('d', 0, 0, 9000, 0, 0, 1)] }
    );
    assert.strictEqual(r.events.find(e => e.actor === 'a' && e.action === 'skill')?.amount, 30, '20 ATK x 100% x 150% skill power');
  });

  it('team synergy scales the element bonus', () => {
    const r = runBattle(
      { side: 'attacker', creatures: [
        mk('a', 0, 0, 500, 20, 0, 99, { element: 'Fire', family: 'Fae', synergyBps: 20000 }),
        mk('b', 1, 0, 500, 1, 0, 1, { element: 'Fire', family: 'Mechanicals', synergyBps: 20000 }),
      ] },
      { side: 'defender', creatures: [mk('d', 0, 0, 9000, 0, 0, 1)] }
    );
    // Minor element bonus is +10%; synergy 200% doubles it to +20%: 20 x 1.20 = 24.
    assert.strictEqual(r.events.find(e => e.actor === 'a' && e.action === 'attack')?.amount, 24);
  });
});
