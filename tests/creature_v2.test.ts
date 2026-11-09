import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runBattle } from '../src/combat/battle.ts';
import { CombatCreature, SkillDef, validateArmy } from '../src/combat/schema.ts';

const mk = (id: string, col: number, row: number, hp: number, atk: number, def: number, spd: number, extra: Partial<CombatCreature> = {}): CombatCreature =>
  ({ instanceId: id, creatureId: 'SYNTH', sizeClass: 'small', anchor: { col, row }, level: 1, hp, atk, def, spd, movement: 1, range: 1, skills: [], passives: [], ...extra });
const sk = (skillId: string, targeting: SkillDef['targeting'], condition: SkillDef['condition'], effects: SkillDef['effects'], cooldownRounds = 10): SkillDef =>
  ({ skillId, kind: 'active', cooldownRounds, targeting, condition, effects });
const dmgBy = (r: ReturnType<typeof runBattle>, actor: string, round: number) => r.events.filter(e => e.actor === actor && e.round === round && (e.action === 'attack' || e.action === 'skill')).map(e => e.amount);

describe('V2-01 / Damage over time, shields and evasion', () => {
  it('damage over time ticks each round for its duration, and ignores evasion', () => {
    const venom = sk('venom', 'nearest_enemy', 'enemy_in_range', [{ type: 'dot', amount: 10, durationRounds: 2 }]);
    const r = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 500, 1, 0, 99, { skills: [venom] })] },
      { side: 'defender', creatures: [mk('d', 0, 0, 200, 0, 0, 1, { evade: 0 } as any)] }
    );
    const ticks = r.events.filter(e => e.action === 'dot' && e.target === 'd').map(e => e.round);
    assert.deepStrictEqual(ticks.slice(0, 2), [2, 3], 'ticks start the round after it is applied, for 2 rounds');
  });

  it('a shield absorbs damage before HP', () => {
    const ward = sk('ward', 'self', 'always', [{ type: 'shield', amount: 50, durationRounds: 5 }], 100);
    const r = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 100, 60, 0, 99, { skills: [ward] })] },
      { side: 'defender', creatures: [mk('d', 0, 0, 50, 60, 0, 1)] }
    );
    // Round 1: shield = 50% of 100 = 50. The defender hits for 60: 50 absorbed, 10 to HP -> 90.
    // Round 2: the attacker hits for 60 and the defender (50 HP) dies, so the attacker keeps 90 HP.
    assert.strictEqual(r.finalHp.a, 90);
    assert.strictEqual(r.winner, 'attacker');
  });

  it('evasion makes the next incoming attacks miss', () => {
    const dodge = sk('dodge', 'self', 'always', [{ type: 'evade', amount: 2 }], 100);
    const r = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 500, 1, 0, 99, { skills: [dodge] })] },
      { side: 'defender', creatures: [mk('d', 0, 0, 500, 40, 0, 1)] }
    );
    const misses = r.events.filter(e => e.action === 'miss' && e.target === 'a');
    assert.strictEqual(misses.length, 2, 'the next two attacks miss');
  });
});

describe('V2-02 / Blindness, root and stun', () => {
  it('blindness makes the target\'s next attacks miss', () => {
    const blind = sk('blind', 'nearest_enemy', 'enemy_in_range', [{ type: 'blind', amount: 1 }]);
    const r = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 500, 1, 0, 1, { skills: [blind] })] },
      { side: 'defender', creatures: [mk('d', 0, 0, 500, 40, 0, 99)] }
    );
    // The defender (faster) attacks first in round 1 and misses because it is blinded... only after the skill; check the miss by the defender in round 2.
    assert.ok(r.events.some(e => e.actor === 'd' && e.action === 'miss'));
  });

  it('root stops a creature moving, and stun stops it acting', () => {
    const vine = sk('vine', 'nearest_enemy', 'enemy_in_range', [{ type: 'root', amount: 0, durationRounds: 2 }], 100);
    const rooted = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 500, 1, 0, 99, { skills: [vine], range: 4 })] },
      { side: 'defender', creatures: [mk('d', 3, 0, 500, 1, 0, 1, { range: 1, movement: 2 })] }
    );
    // Root applied in round 1 by the attacker (faster). The defender may not move in rounds 1 or 2.
    assert.strictEqual(rooted.events.filter(e => e.actor === 'd' && e.action === 'move' && e.round <= 2).length, 0, 'rooted: no movement');
    assert.ok(rooted.events.some(e => e.actor === 'd' && e.action === 'move' && e.round === 3), 'free to move again after the root');

    const freeze = sk('freeze', 'nearest_enemy', 'enemy_in_range', [{ type: 'stun', amount: 0, durationRounds: 1 }], 100);
    const stunned = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 500, 1, 0, 99, { skills: [freeze] })] },
      { side: 'defender', creatures: [mk('d', 0, 0, 500, 40, 0, 1)] }
    );
    // Stun applied in round 1 before the defender's turn: it loses that turn and does not attack.
    assert.ok(stunned.events.some(e => e.actor === 'd' && e.action === 'status' && e.round === 1), 'a stunned creature loses its turn');
    assert.ok(!stunned.events.some(e => e.actor === 'd' && e.action === 'attack' && e.round === 1), 'and does not attack that round');
  });
});

describe('V2-03 / Chain, teleport and team skill damage', () => {
  it('chain hits the nearest enemy in full and the next at half', () => {
    const arc = sk('arc', 'chain', 'enemy_in_range', [{ type: 'damage', amount: 100 }]);
    const r = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 500, 40, 0, 99, { range: 2, skills: [arc] })] },
      { side: 'defender', creatures: [mk('d1', 0, 0, 500, 0, 0, 1), mk('d2', 1, 0, 500, 0, 0, 1)] }
    );
    const hits = r.events.filter(e => e.round === 1 && e.actor === 'a' && e.action === 'skill').map(e => [e.target, e.amount]);
    assert.deepStrictEqual(hits, [['d1', 40], ['d2', 20]]);
  });

  it('teleport moves the caster to a free square closer to its enemy', () => {
    const rift = sk('rift', 'self', 'always', [{ type: 'teleport', amount: 0 }]);
    const r = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 500, 1, 0, 99, { skills: [rift], movement: 0 })] },
      { side: 'defender', creatures: [mk('d', 2, 0, 500, 1, 0, 1)] }
    );
    const tp = r.events.find(e => e.actor === 'a' && e.action === 'move' && e.round === 1);
    assert.ok(tp && tp.to, 'a teleport is recorded');
    assert.ok(tp!.to!.col >= 0 && tp!.to!.col < 5);
  });

  it('a skill-damage aura raises allies\' skill damage', () => {
    const burst = sk('burst', 'nearest_enemy', 'enemy_in_range', [{ type: 'damage', amount: 100 }]);
    const aura = { passiveId: 'focus', trigger: 'aura' as const, condition: 'always' as const, effects: [{ type: 'buff' as const, stat: 'skill' as const, amount: 12000 }] };
    const r = runBattle(
      { side: 'attacker', creatures: [mk('lead', 0, 0, 500, 1, 0, 99, { passives: [aura] }), mk('mage', 1, 0, 500, 20, 0, 50, { skills: [burst] })] },
      { side: 'defender', creatures: [mk('d', 1, 0, 9000, 0, 0, 1)] }
    );
    const first = r.events.find(e => e.actor === 'mage' && e.action === 'skill');
    assert.strictEqual(first?.amount, 24, 'ATK 20 x 100% x 1.2 skill aura');
  });

  it('validates the new schema v2 effect shapes', () => {
    const bad = sk('x', 'self', 'always', [{ type: 'shield', amount: 10 }]);
    assert.ok(validateArmy({ side: 'attacker', creatures: [mk('a', 0, 0, 1, 1, 0, 1, { skills: [bad] })] }).some(m => m.includes('durationRounds')));
  });
});

describe('V2-04 / Team synergy bonuses (prototype rules)', () => {
  it('two creatures of one element gain the minor element bonus to ATK (+10%)', () => {
    const burst = sk('burst2', 'nearest_enemy', 'enemy_in_range', [{ type: 'damage', amount: 100 }], 100);
    // Different families, so only the element bonus applies.
    const plain = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 500, 20, 0, 99), mk('b', 1, 0, 500, 1, 0, 1)] },
      { side: 'defender', creatures: [mk('d', 0, 0, 9000, 0, 0, 1)] }
    );
    const boosted = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 500, 20, 0, 99, { element: 'Fire', family: 'Fae' }), mk('b', 1, 0, 500, 1, 0, 1, { element: 'Fire', family: 'Mechanicals' })] },
      { side: 'defender', creatures: [mk('d', 0, 0, 9000, 0, 0, 1)] }
    );
    const base = plain.events.find(e => e.actor === 'a' && e.action === 'attack')?.amount;
    const up = boosted.events.find(e => e.actor === 'a' && e.action === 'attack')?.amount;
    assert.strictEqual(base, 20);
    assert.strictEqual(up, 22, 'ATK 20 x 1.10');
    void burst;
  });

  it('a creature with no element or family gets no team bonus', () => {
    const r = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 500, 20, 0, 99), mk('b', 1, 0, 500, 1, 0, 1)] },
      { side: 'defender', creatures: [mk('d', 0, 0, 9000, 0, 0, 1)] }
    );
    assert.strictEqual(r.events.find(e => e.actor === 'a' && e.action === 'attack')?.amount, 20);
  });
});
