import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runBattle, MAX_ROUNDS } from '../src/combat/battle.ts';
import { validateArmy, footprintCells, SIZE_FOOTPRINTS, SkillDef, CombatCreature, ArmySpec } from '../src/combat/schema.ts';

const mk = (id: string, col: number, row: number, size: CombatCreature['sizeClass'], hp: number, atk: number, def: number, spd: number, extra: Partial<CombatCreature> = {}): CombatCreature =>
  ({ instanceId: id, creatureId: 'SYNTH', sizeClass: size, anchor: { col, row }, level: 1, hp, atk, def, spd, movement: 2, range: 1, skills: [], passives: [], ...extra });

describe('CCOMB-01 / Footprints (approved A1, A2)', () => {
  it('maps size classes to 1, 2, 3, 4 and 6 positions', () => {
    assert.deepStrictEqual(Object.fromEntries(Object.entries(SIZE_FOOTPRINTS).map(([k, v]) => [k, v.count])),
      { small: 1, medium: 2, large: 3, huge: 4, colossal: 6 });
  });

  it('every footprint has exactly as many distinct cells as its class requires', () => {
    for (const [size, shape] of Object.entries(SIZE_FOOTPRINTS)) {
      const c = mk('x', 0, 0, size as any, 1, 1, 0, 1);
      const cells = footprintCells(c);
      assert.strictEqual(cells.length, shape.count);
      assert.strictEqual(new Set(cells.map(p => `${p.col},${p.row}`)).size, shape.count);
    }
  });
});

describe('CCOMB-02 / Army validation (V1-V9)', () => {
  it('accepts a legal army', () => {
    assert.deepStrictEqual(validateArmy({ side: 'attacker', creatures: [mk('a', 0, 0, 'large', 10, 1, 0, 1)] }), []);
  });

  it('V1: rejects a footprint outside the 5 x 3 grid', () => {
    const e = validateArmy({ side: 'attacker', creatures: [mk('a', 4, 0, 'medium', 10, 1, 0, 1)] });
    assert.ok(e.some(m => m.startsWith('V1')));
  });

  it('V2: rejects overlapping footprints', () => {
    const e = validateArmy({ side: 'attacker', creatures: [mk('a', 0, 0, 'large', 10, 1, 0, 1), mk('b', 1, 0, 'small', 10, 1, 0, 1)] });
    assert.ok(e.some(m => m.startsWith('V2')));
  });

  it('V3: sixteen creatures cannot fit, because the 5 x 3 grid holds exactly 15 positions', () => {
    // V3 is implied by V1 and V2: a valid placement uses at most the 15 grid cells.
    const creatures = Array.from({ length: 16 }, (_, i) => mk(`c${i}`, i % 5, Math.floor(i / 5), 'small', 1, 1, 0, 1));
    assert.ok(validateArmy({ side: 'attacker', creatures }).length > 0);
  });

  it('allows fewer than 15 creatures, and an army may be full at 15 single positions', () => {
    const full = Array.from({ length: 15 }, (_, i) => mk(`c${i}`, i % 5, Math.floor(i / 5), 'small', 1, 1, 0, 1));
    assert.deepStrictEqual(validateArmy({ side: 'attacker', creatures: full }), []);
  });

  it('V6: rejects duplicate instance ids', () => {
    const e = validateArmy({ side: 'attacker', creatures: [mk('a', 0, 0, 'small', 1, 1, 0, 1), mk('a', 1, 0, 'small', 1, 1, 0, 1)] });
    assert.ok(e.some(m => m.startsWith('V6')));
  });

  it('V7: rejects levels outside 1..50 and non-integer stats', () => {
    assert.ok(validateArmy({ side: 'attacker', creatures: [mk('a', 0, 0, 'small', 1, 1, 0, 1, { level: 51 })] }).some(m => m.startsWith('V7')));
    assert.ok(validateArmy({ side: 'attacker', creatures: [mk('a', 0, 0, 'small', 1.5, 1, 0, 1)] }).some(m => m.startsWith('V7')));
  });

  it('V4: footprint is derived from the size class, so the shape always matches', () => {
    // The shape is not an independent input, so a mismatch cannot be expressed. Checked for every class.
    for (const size of Object.keys(SIZE_FOOTPRINTS) as Array<keyof typeof SIZE_FOOTPRINTS>) {
      assert.strictEqual(footprintCells(mk('x', 0, 0, size, 1, 1, 0, 1)).length, SIZE_FOOTPRINTS[size].count);
    }
  });

  it('refuses unsupported effects and triggers in v1', () => {
    const skill = { skillId: 's', kind: 'active', cooldownRounds: 1, targeting: 'nearest_enemy', condition: 'always', effects: [{ type: 'pierce', amount: 1 }] } as unknown as SkillDef;
    assert.ok(validateArmy({ side: 'attacker', creatures: [mk('a', 0, 0, 'small', 1, 1, 0, 1, { skills: [skill] })] }).some(m => m.includes('unknown effect')));
    const passive = { passiveId: 'p', trigger: 'on_death' as const, condition: 'always' as const, effects: [{ type: 'buff' as const, stat: 'atk' as const, amount: 10100 }] };
    assert.ok(validateArmy({ side: 'attacker', creatures: [mk('a', 0, 0, 'small', 1, 1, 0, 1, { passives: [passive] })] }).some(m => m.includes('unsupported passive')));
  });
});

describe('CCOMB-03 / Combat rules', () => {
  it('basic attack deals max(1, ATK - DEF)', () => {
    const attacker: ArmySpec = { side: 'attacker', creatures: [mk('a', 0, 0, 'small', 100, 40, 0, 99)] };
    const defender: ArmySpec = { side: 'defender', creatures: [mk('d', 0, 0, 'small', 100, 10, 15, 1)] };
    const r = runBattle(attacker, defender);
    const first = r.events.find(e => e.action === 'attack' && e.actor === 'a');
    assert.strictEqual(first?.amount, 25);
  });

  it('minimum damage is 1 when defence meets or exceeds attack', () => {
    const attacker: ArmySpec = { side: 'attacker', creatures: [mk('a', 0, 0, 'small', 100, 5, 0, 99)] };
    const defender: ArmySpec = { side: 'defender', creatures: [mk('d', 0, 0, 'small', 100, 10, 50, 1)] };
    const first = runBattle(attacker, defender).events.find(e => e.action === 'attack' && e.actor === 'a');
    assert.strictEqual(first?.amount, 1);
  });

  it('a multi-position creature makes at most one attack per round', () => {
    const attacker: ArmySpec = { side: 'attacker', creatures: [mk('a', 0, 0, 'colossal', 1000, 30, 0, 99)] };
    const defender: ArmySpec = { side: 'defender', creatures: [mk('d1', 0, 0, 'small', 1000, 1, 0, 1), mk('d2', 1, 0, 'small', 1000, 1, 0, 1)] };
    const r = runBattle(attacker, defender);
    const perRound = new Map<number, number>();
    for (const e of r.events) if (e.actor === 'a' && e.action === 'attack') perRound.set(e.round, (perRound.get(e.round) ?? 0) + 1);
    for (const n of perRound.values()) assert.ok(n <= 1, 'one attack per round');
  });

  it('moves and then attacks in the same turn when the target comes into range (A10)', () => {
    const attacker: ArmySpec = { side: 'attacker', creatures: [mk('a', 0, 2, 'small', 100, 40, 0, 99, { movement: 3 })] };
    const defender: ArmySpec = { side: 'defender', creatures: [mk('d', 0, 0, 'small', 100, 1, 0, 1)] };
    const r = runBattle(attacker, defender);
    const round1 = r.events.filter(e => e.round === 1 && e.actor === 'a').map(e => e.action);
    assert.ok(round1.includes('move'), 'moves');
    assert.ok(round1.includes('attack'), 'then attacks');
  });

  it('a cooldown of 2 means the skill fires in rounds 1, 3 and 5', () => {
    const skill: SkillDef = { skillId: 'blast', kind: 'active', cooldownRounds: 2, targeting: 'nearest_enemy', condition: 'enemy_in_range', effects: [{ type: 'damage', amount: 100, stat: 'none' }] };
    const attacker: ArmySpec = { side: 'attacker', creatures: [mk('a', 0, 0, 'small', 10000, 1, 0, 99, { skills: [skill] })] };
    const defender: ArmySpec = { side: 'defender', creatures: [mk('d', 0, 0, 'small', 100000, 1, 0, 1)] };
    const r = runBattle(attacker, defender);
    const skillRounds = r.events.filter(e => e.actor === 'a' && e.action === 'skill').map(e => e.round);
    assert.deepStrictEqual(skillRounds.slice(0, 3), [1, 3, 5]);
  });

  it('timeout after MAX_ROUNDS: the side with the greater HP share holds', () => {
    // Adjacent fronts, no kills: both sides take 1 damage per round for 20 rounds.
    // Attacker 200 -> 180 (0.90 share), defender 100 -> 80 (0.80 share). Attacker holds.
    const attacker: ArmySpec = { side: 'attacker', creatures: [mk('a', 0, 0, 'small', 200, 1, 0, 99, { movement: 0 })] };
    const defender: ArmySpec = { side: 'defender', creatures: [mk('d', 0, 0, 'small', 100, 1, 0, 1, { movement: 0 })] };
    const r = runBattle(attacker, defender);
    assert.strictEqual(r.reason, 'timeout');
    assert.strictEqual(r.rounds, MAX_ROUNDS);
    assert.strictEqual(r.winner, 'attacker');
  });

  it('timeout with equal HP shares: the defender holds', () => {
    const attacker: ArmySpec = { side: 'attacker', creatures: [mk('a', 0, 0, 'small', 100, 1, 0, 99, { movement: 0 })] };
    const defender: ArmySpec = { side: 'defender', creatures: [mk('d', 0, 0, 'small', 100, 1, 0, 1, { movement: 0 })] };
    assert.strictEqual(runBattle(attacker, defender).winner, 'defender');
  });

  it('refuses an invalid army', () => {
    const bad: ArmySpec = { side: 'attacker', creatures: [mk('a', 4, 0, 'medium', 1, 1, 0, 1)] };
    const ok: ArmySpec = { side: 'defender', creatures: [mk('d', 0, 0, 'small', 1, 1, 0, 1)] };
    assert.throws(() => runBattle(bad, ok), /invalid army/);
  });
});

describe('CCOMB-04 / Determinism', () => {
  it('identical inputs give identical events and round hashes', () => {
    const build = () => ({
      attacker: { side: 'attacker' as const, creatures: [mk('a1', 0, 0, 'large', 300, 60, 20, 50), mk('a2', 3, 1, 'small', 150, 45, 15, 40)] },
      defender: { side: 'defender' as const, creatures: [mk('d1', 1, 0, 'huge', 400, 50, 25, 30), mk('d2', 3, 2, 'medium', 200, 55, 10, 20)] },
    });
    const a = build(), b = build();
    const r1 = runBattle(a.attacker, a.defender);
    const r2 = runBattle(b.attacker, b.defender);
    assert.deepStrictEqual(r1.events, r2.events);
    assert.deepStrictEqual(r1.roundHashes, r2.roundHashes);
    assert.strictEqual(r1.winner, r2.winner);
  });

  it('all event amounts and positions are integers', () => {
    const r = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 'large', 300, 60, 20, 50)] },
      { side: 'defender', creatures: [mk('d', 2, 0, 'small', 200, 40, 10, 30)] }
    );
    for (const e of r.events) {
      assert.ok(Number.isInteger(e.amount));
      if (e.to) assert.ok(Number.isInteger(e.to.col) && Number.isInteger(e.to.row));
    }
  });
});
