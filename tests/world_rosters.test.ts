import { describe, it } from 'node:test';
import assert from 'node:assert';
import { World, Territory, stagingCandidates, assembleArmy, attackTerritory, STAGING_RADIUS } from '../src/world/rosters.ts';
import { CombatCreature } from '../src/combat/schema.ts';

const cre = (id: string, col = 0, row = 0, hp = 100, atk = 30, def = 5, spd = 10): CombatCreature =>
  ({ instanceId: id, creatureId: 'SYNTH', sizeClass: 'small', anchor: { col, row }, level: 1, hp, atk, def, spd, movement: 1, range: 1, skills: [], passives: [] });

const tile = (id: string, x: number, y: number, owner: string | null, roster: CombatCreature[] = []): Territory =>
  ({ id, x, y, owner, roster });

const world = (...ts: Territory[]): World => ({ territories: new Map(ts.map((t) => [t.id, t])) });

describe('WORLD-01 / Staging (A8, radius 2)', () => {
  const w = world(
    tile('t_0_0', 0, 0, 'player', [cre('a1'), cre('a2')]),
    tile('t_1_0', 1, 0, 'player', [cre('b1'), cre('b2')]),
    tile('t_2_0', 2, 0, 'player', [cre('c1'), cre('c2')]),
    tile('t_3_0', 3, 0, 'player', [cre('d1')]),   // distance 3: outside radius
    tile('t_0_1', 0, 1, 'npc', [cre('n1')]),       // not owned by the player
  );
  const origin = w.territories.get('t_0_0')!;

  it('includes owned creatures within radius 2 only, nearest territory first', () => {
    const ids = stagingCandidates(w, origin, 'player').map((s) => s.instanceId);
    assert.deepStrictEqual(ids, ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']);
    assert.strictEqual(STAGING_RADIUS, 2);
  });

  it('allows a territory to be emptied by staging (owner decision)', () => {
    const lone = world(tile('t_0_0', 0, 0, 'player', [cre('a1'), cre('a2')]), tile('t_1_0', 1, 0, 'player', [cre('b1')]));
    const army = assembleArmy(lone, 't_0_0', 'player', [{ instanceId: 'b1', anchor: { col: 0, row: 0 } }]);
    assert.deepStrictEqual(army.creatures.map(c => c.instanceId), ['b1']);
    assert.strictEqual(lone.territories.get('t_1_0')!.owner, 'player', 'an emptied territory keeps its owner');
  });

  it('assembles an army from staged creatures, keeping one per territory', () => {
    const army = assembleArmy(w, 't_0_0', 'player', [
      { instanceId: 'a1', anchor: { col: 0, row: 0 } },
      { instanceId: 'b1', anchor: { col: 1, row: 0 } },
    ]);
    assert.deepStrictEqual(army.creatures.map((c) => c.instanceId), ['a1', 'b1']);
  });

  it('refuses creatures outside staging range', () => {
    assert.throws(() => assembleArmy(w, 't_0_0', 'player', [{ instanceId: 'd1', anchor: { col: 0, row: 0 } }]), /not in staging range/);
  });
});

describe('WORLD-02 / Attacks, capture and survivors', () => {
  it('a won attack captures the territory and the survivors become its roster (A8)', () => {
    const w = world(
      tile('t_0_0', 0, 0, 'player', [cre('a1', 0, 0, 500, 200, 5, 50), cre('a2', 1, 0, 500, 200, 5, 40), cre('a3', 2, 0, 500, 200, 5, 30)]),
      tile('t_1_0', 1, 0, 'npc', [cre('n1', 0, 0, 40, 10, 0, 5)]),
    );
    // a2 and a3 are not on t_0_0's staging list for the army below; use a1 and a2 from the origin.
    const army = assembleArmy(w, 't_0_0', 'player', [
      { instanceId: 'a1', anchor: { col: 0, row: 0 } },
      { instanceId: 'a2', anchor: { col: 1, row: 0 } },
    ]);
    const out = attackTerritory(w, 't_0_0', 't_1_0', army);
    assert.strictEqual(out.captured, true);
    const target = w.territories.get('t_1_0')!;
    assert.strictEqual(target.owner, 'player');
    assert.ok(target.roster.length >= 1 && target.roster.every(c => c.hp > 0));
    assert.ok(target.roster.every(c => ['a1', 'a2'].includes(c.instanceId)));
  });

  it('a failed attack returns survivors to the origin (owner decision)', () => {
    const w = world(
      tile('t_0_0', 0, 0, 'player', [cre('a1', 0, 0, 30, 5, 0, 5), cre('a2', 1, 0, 500, 5, 0, 4)]),
      tile('t_1_0', 1, 0, 'npc', [cre('n1', 0, 0, 900, 50, 40, 10)]),
    );
    const army = assembleArmy(w, 't_0_0', 'player', [{ instanceId: 'a1', anchor: { col: 0, row: 0 } }]);
    const out = attackTerritory(w, 't_0_0', 't_1_0', army);
    assert.strictEqual(out.captured, false);
    assert.strictEqual(w.territories.get('t_1_0')!.owner, 'npc');
    assert.ok(w.territories.get('t_0_0')!.roster.length >= 1, 'survivors return to origin');
  });

  it('an emptied enemy territory is taken without a battle', () => {
    const w = world(
      tile('t_0_0', 0, 0, 'player', [cre('a1'), cre('a2')]),
      tile('t_1_0', 1, 0, 'npc', []),
    );
    const army = assembleArmy(w, 't_0_0', 'player', [{ instanceId: 'a1', anchor: { col: 0, row: 0 } }]);
    const out = attackTerritory(w, 't_0_0', 't_1_0', army);
    assert.strictEqual(out.result, null);
    assert.strictEqual(out.captured, true);
    assert.strictEqual(w.territories.get('t_1_0')!.owner, 'player');
    assert.deepStrictEqual(w.territories.get('t_1_0')!.roster.map(c => c.instanceId), ['a1']);
  });

  it('attacks a garrisoned neutral territory: the roster defends it (approved rule)', () => {
    const w = world(
      tile('t_0_0', 0, 0, 'player', [cre('a1', 0, 0, 500, 300, 5, 50), cre('a2', 1, 0, 500, 300, 5, 40)]),
      tile('t_1_0', 1, 0, null, [cre('n1', 0, 0, 40, 10, 0, 5)]),
    );
    const army = assembleArmy(w, 't_0_0', 'player', [{ instanceId: 'a1', anchor: { col: 0, row: 0 } }, { instanceId: 'a2', anchor: { col: 1, row: 0 } }]);
    const out = attackTerritory(w, 't_0_0', 't_1_0', army);
    assert.ok(out.result, 'a battle occurred');
    assert.strictEqual(out.captured, true);
    assert.strictEqual(w.territories.get('t_1_0')!.owner, 'player');
  });

  it('an empty neutral territory is taken without a battle', () => {
    const w = world(tile('t_0_0', 0, 0, 'player', [cre('a1'), cre('a2')]), tile('t_1_0', 1, 0, null, []));
    const army = assembleArmy(w, 't_0_0', 'player', [{ instanceId: 'a1', anchor: { col: 0, row: 0 } }]);
    const out = attackTerritory(w, 't_0_0', 't_1_0', army);
    assert.strictEqual(out.result, null);
    assert.strictEqual(w.territories.get('t_1_0')!.owner, 'player');
  });
});
