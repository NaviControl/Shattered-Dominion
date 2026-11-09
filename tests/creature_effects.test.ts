import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runBattle } from '../src/combat/battle.ts';
import { validateArmy, CombatCreature, SkillDef, ArmySpec } from '../src/combat/schema.ts';

const mk = (id: string, col: number, row: number, hp: number, atk: number, def: number, spd: number, extra: Partial<CombatCreature> = {}): CombatCreature =>
  ({ instanceId: id, creatureId: 'SYNTH', sizeClass: 'small', anchor: { col, row }, level: 1, hp, atk, def, spd, movement: 1, range: 1, skills: [], passives: [], ...extra });

const attacksBy = (r: ReturnType<typeof runBattle>, actor: string) =>
  r.events.filter((e) => e.actor === actor && e.action === 'attack').map((e) => ({ round: e.round, amount: e.amount }));

describe('EFF-01 / Buffs and debuffs with durations', () => {
  it('a self buff raises ATK for its duration, then expires', () => {
    const rage: SkillDef = { skillId: 'rage', kind: 'active', cooldownRounds: 10, targeting: 'self', condition: 'always',
      effects: [{ type: 'buff', stat: 'atk', amount: 20000, durationRounds: 2 }] };
    const r = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 500, 20, 0, 99, { skills: [rage] })] },
      { side: 'defender', creatures: [mk('d', 0, 0, 10000, 0, 0, 1)] }
    );
    const hits = attacksBy(r, 'a');
    assert.deepStrictEqual(hits.find(h => h.round === 2), { round: 2, amount: 40 }, 'buffed ATK doubles the hit');
    assert.deepStrictEqual(hits.find(h => h.round === 3), { round: 3, amount: 40 }, 'still buffed in the second round');
    assert.deepStrictEqual(hits.find(h => h.round === 4), { round: 4, amount: 20 }, 'buff expired after 2 rounds');
  });

  it('a debuff on the target lowers its DEF, so the next hit lands harder', () => {
    const sunder: SkillDef = { skillId: 'sunder', kind: 'active', cooldownRounds: 10, targeting: 'nearest_enemy', condition: 'enemy_in_range',
      effects: [{ type: 'debuff', stat: 'def', amount: 5000, durationRounds: 5 }] };
    const r = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 500, 40, 0, 99, { skills: [sunder] })] },
      { side: 'defender', creatures: [mk('d', 0, 0, 1000, 0, 20, 1)] }
    );
    // Round 1: debuff applied (DEF 20 -> 10). Round 2: 40 - 10 = 30.
    assert.deepStrictEqual(attacksBy(r, 'a').find(h => h.round === 2), { round: 2, amount: 30 });
  });
});

describe('EFF-02 / Knockback', () => {
  it('a move effect pushes the target one cell directly away', () => {
    const shove: SkillDef = { skillId: 'shove', kind: 'active', cooldownRounds: 10, targeting: 'nearest_enemy', condition: 'enemy_in_range',
      effects: [{ type: 'move', amount: 0 }] };
    const r = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 500, 1, 0, 99, { skills: [shove] })] },
      { side: 'defender', creatures: [mk('d', 0, 0, 500, 1, 0, 1)] }
    );
    const push = r.events.find(e => e.action === 'move' && e.round === 1);
    assert.ok(push, 'a knockback event is recorded');
    assert.deepStrictEqual(push!.from, { col: 0, row: 0 });
    assert.deepStrictEqual(push!.to, { col: 0, row: 1 }, 'defender pushed one row back');
  });
});

describe('EFF-03 / Area and self-triggered effects', () => {
  it('an all-enemies skill hits every enemy in range in one use', () => {
    const burst: SkillDef = { skillId: 'burst', kind: 'active', cooldownRounds: 10, targeting: 'all_enemies', condition: 'always',
      effects: [{ type: 'damage', amount: 100 }] };
    const r = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 500, 30, 0, 99, { range: 2, skills: [burst] })] },
      { side: 'defender', creatures: [mk('d1', 0, 0, 1000, 0, 0, 1), mk('d2', 1, 0, 1000, 0, 0, 1)] }
    );
    const hit = r.events.filter(e => e.round === 1 && e.action === 'skill' && e.actor === 'a');
    assert.deepStrictEqual(hit.map(e => [e.target, e.amount]), [['d1', 30], ['d2', 30]]);
  });

  it('a self heal fires when HP is below half, and not before', () => {
    const mend: SkillDef = { skillId: 'mend', kind: 'active', cooldownRounds: 10, targeting: 'self', condition: 'hp_below_half',
      effects: [{ type: 'heal', amount: 25 }] };
    const r = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 100, 1, 0, 1, { skills: [mend] })] },
      { side: 'defender', creatures: [mk('d', 0, 0, 500, 60, 0, 99)] }
    );
    // Defender (faster) hits first for 60 in round 1: 100 -> 40, below half. Attacker then heals 25% of 100 = 25 in the same round.
    const heal = r.events.find(e => e.actor === 'a' && e.action === 'skill');
    assert.ok(heal);
    assert.strictEqual(heal!.round, 1);
    assert.strictEqual(heal!.amount, 25);
  });
});

describe('EFF-04 / Validation of the extensions', () => {
  it('a buff or debuff needs a stat and a duration of at least one round', () => {
    const bad: SkillDef = { skillId: 'b', kind: 'active', cooldownRounds: 1, targeting: 'self', condition: 'always',
      effects: [{ type: 'buff', stat: 'atk', amount: 12000 }] };
    const e = validateArmy({ side: 'attacker', creatures: [mk('a', 0, 0, 1, 1, 0, 1, { skills: [bad] })] });
    assert.ok(e.some(m => m.includes('durationRounds')));
  });

  it('a move must target the nearest enemy', () => {
    const bad: SkillDef = { skillId: 'm', kind: 'active', cooldownRounds: 1, targeting: 'self', condition: 'always',
      effects: [{ type: 'move', amount: 0 }] };
    const e = validateArmy({ side: 'attacker', creatures: [mk('a', 0, 0, 1, 1, 0, 1, { skills: [bad] })] });
    assert.ok(e.some(m => m.includes('move must target')));
  });

  it('accepts area and ally targeting', () => {
    const ok: SkillDef[] = (['all_enemies', 'all_allies', 'ally_in_range'] as const).map((t, i) => ({
      skillId: `s${i}`, kind: 'active' as const, cooldownRounds: 1, targeting: t, condition: 'always' as const,
      effects: [{ type: 'heal' as const, amount: 10 }],
    }));
    assert.deepStrictEqual(validateArmy({ side: 'attacker', creatures: [mk('a', 0, 0, 1, 1, 0, 1, { skills: ok })] }), []);
  });
});
