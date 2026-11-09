import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runBattle } from '../src/combat/battle.ts';
import { validateArmy, CombatCreature, PassiveDef } from '../src/combat/schema.ts';

const mk = (id: string, col: number, row: number, hp: number, atk: number, def: number, spd: number, extra: Partial<CombatCreature> = {}): CombatCreature =>
  ({ instanceId: id, creatureId: 'SYNTH', sizeClass: 'small', anchor: { col, row }, level: 1, hp, atk, def, spd, movement: 1, range: 1, skills: [], passives: [], ...extra });

describe('PASS-01 / Passive categories', () => {
  it('a battle-start passive raises a stat for the whole battle', () => {
    const p: PassiveDef = { passiveId: 'heavy', trigger: 'battle_start', condition: 'always', effects: [{ type: 'buff', stat: 'atk', amount: 15000 }] };
    const r = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 500, 20, 0, 99, { passives: [p] })] },
      { side: 'defender', creatures: [mk('d', 0, 0, 10000, 0, 0, 1)] }
    );
    const hits = r.events.filter(e => e.actor === 'a' && e.action === 'attack').map(e => e.amount);
    assert.ok(hits.length > 0);
    assert.ok(hits.every(h => h === 30), 'ATK 20 x 1.5 = 30 every round');
  });

  it('an aura buffs living allies in range, and not allies out of range', () => {
    const aura: PassiveDef = { passiveId: 'rally', trigger: 'aura', condition: 'always', effects: [{ type: 'buff', stat: 'atk', amount: 12000 }] };
    const r = runBattle(
      { side: 'attacker', creatures: [
        mk('lead', 0, 0, 500, 1, 0, 99, { range: 1, passives: [aura] }),
        mk('near', 1, 0, 500, 20, 0, 50),
        // Out of the aura's range, but able to attack the defender from where it stands.
        mk('far', 4, 2, 500, 20, 0, 40, { range: 10 }),
      ] },
      { side: 'defender', creatures: [mk('d', 1, 0, 10000, 0, 0, 1)] }
    );
    const nearHit = r.events.find(e => e.actor === 'near' && e.action === 'attack');
    const farHit = r.events.find(e => e.actor === 'far' && e.action === 'attack');
    assert.strictEqual(nearHit?.amount, 24, 'ally in range: ATK 20 x 1.2');
    assert.strictEqual(farHit?.amount, 20, 'ally out of range: no buff');
  });

  it('a round-start heal restores HP each round, up to the maximum', () => {
    const regen: PassiveDef = { passiveId: 'regen', trigger: 'round_start', condition: 'always', effects: [{ type: 'heal', amount: 10 }] };
    const r = runBattle(
      { side: 'attacker', creatures: [mk('a', 0, 0, 100, 1, 0, 99, { passives: [regen] })] },
      { side: 'defender', creatures: [mk('d', 0, 0, 500, 60, 0, 1)] }
    );
    const heals = r.events.filter(e => e.actor === 'a' && e.action === 'passive' && e.round > 0);
    assert.ok(heals.length > 0);
    assert.ok(heals.every(h => h.amount <= 10), 'heal is 10% of max HP per round');
  });

  it('refuses passive triggers and effects outside the approved set', () => {
    const onDeath: PassiveDef = { passiveId: 'x', trigger: 'on_death', condition: 'always', effects: [{ type: 'buff', stat: 'atk', amount: 11000 }] };
    assert.ok(validateArmy({ side: 'attacker', creatures: [mk('a', 0, 0, 1, 1, 0, 1, { passives: [onDeath] })] }).some(m => m.includes('unsupported passive trigger')));
    const badHeal: PassiveDef = { passiveId: 'y', trigger: 'round_start', condition: 'always', effects: [{ type: 'buff', stat: 'atk', amount: 11000 }] };
    assert.ok(validateArmy({ side: 'attacker', creatures: [mk('a', 0, 0, 1, 1, 0, 1, { passives: [badHeal] })] }).some(m => m.includes('round_start passive')));
  });
});
