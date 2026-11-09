import { describe, it } from 'node:test';
import assert from 'node:assert';
import { applyLevelUp, POINTS_PER_LEVEL, BaseStats } from '../src/combat/stats.ts';
import { applySkillPoints, durationForLevel, activeSkillSlots, SKILL_MAX_LEVEL } from '../src/combat/skills.ts';
import { runBattle } from '../src/combat/battle.ts';
import { CombatCreature, SkillDef } from '../src/combat/schema.ts';

const base: BaseStats = { hp: 100, attack: 20, defense: 10, speed: 30, movement: 2, range: 1, skill_power: 10000, synergy: 10000 };
const mk = (id: string, col: number, row: number, hp: number, atk: number, def: number, spd: number, extra: Partial<CombatCreature> = {}): CombatCreature =>
  ({ instanceId: id, creatureId: 'SYNTH', sizeClass: 'small', anchor: { col, row }, level: 1, hp, atk, def, spd, movement: 1, range: 1, skills: [], passives: [], ...extra });

describe('PROG-01 / Level-up points (5 per level)', () => {
  it('grants 5 points per level', () => {
    assert.strictEqual(POINTS_PER_LEVEL, 5);
    const next = applyLevelUp(base, { attack: 3, hp: 2 });
    assert.strictEqual(next.attack, 23);
    assert.strictEqual(next.hp, 102);
  });
  it('requires all 5 points to be spent', () => {
    assert.throws(() => applyLevelUp(base, { attack: 4 }), /spends 4 of 5/);
  });
});

describe('PROG-02 / Skills level with their own points', () => {
  it('a skill gains a level per point and stops at the maximum', () => {
    assert.deepStrictEqual(applySkillPoints({ level: 1, points: 0 }, 3), { level: 4, points: 0 });
    assert.strictEqual(applySkillPoints({ level: 1, points: 0 }, 99).level, SKILL_MAX_LEVEL);
  });
  it('duration in rounds equals the skill level', () => {
    assert.strictEqual(durationForLevel(1), 1);
    assert.strictEqual(durationForLevel(2), 2);
    assert.strictEqual(durationForLevel(4), 3);
    assert.strictEqual(durationForLevel(10), 6);
  });
  it('a level-4 buff lasts three rounds in battle (1 + 4/2)', () => {
    const rage: SkillDef = { skillId: 'rage', level: 4, kind: 'active', cooldownRounds: 100, targeting: 'self', condition: 'always',
      effects: [{ type: 'buff', stat: 'atk', amount: 20000, durationRounds: 1 }] };
    const r = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 500, 20, 0, 99, { skills: [rage] })] },
      { side: 'defender', creatures: [mk('d', 0, 0, 10000, 0, 0, 1)] }
    );
    const hits = (round: number) => r.events.find(e => e.actor === 'a' && e.action === 'attack' && e.round === round)?.amount;
    assert.strictEqual(hits(2), 40);
    assert.strictEqual(hits(4), 40, 'still buffed in round 4');
    assert.strictEqual(hits(5), 20, 'buff ends after three rounds');
  });
});

describe('PROG-03 / Active skill slots by rarity', () => {
  it('high-rarity creatures get two active slots, others one', () => {
    assert.strictEqual(activeSkillSlots('common'), 1);
    assert.strictEqual(activeSkillSlots('rare'), 1);
    assert.strictEqual(activeSkillSlots('epic'), 2);
    assert.strictEqual(activeSkillSlots('mythical'), 2);
  });
});
