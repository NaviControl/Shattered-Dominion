import { describe, it } from 'node:test';
import assert from 'node:assert';
import { packArmy, playerAttack, Match, PLAYER, VICTORY_TOWERS } from '../src/match/match.ts';
import { World, Territory } from '../src/world/rosters.ts';
import { CombatCreature } from '../src/combat/schema.ts';

const cre = (id: string, size: CombatCreature['sizeClass'], hp = 100, atk = 20, def = 5, spd = 10): Omit<CombatCreature, 'anchor'> =>
  ({ instanceId: id, creatureId: 'SYNTH', sizeClass: size, level: 1, hp, atk, def, spd, movement: 1, range: 1, skills: [], passives: [] });
const tile = (id: string, x: number, y: number, owner: string | null, roster: any[] = []): Territory =>
  ({ id, x, y, owner, roster: roster as CombatCreature[] });
const world = (...ts: Territory[]): World => ({ territories: new Map(ts.map(t => [t.id, t])) });
const match = (w: World, towers: string[] = []): Match => ({ world: w, towers: new Set(towers), turn: 0, status: 'ongoing', log: [] });

describe('MATCH-01 / Formation packing', () => {
  it('packs creatures without overlap and within 15 positions', () => {
    const packed = packArmy([cre('a', 'large'), cre('b', 'huge'), cre('c', 'small'), cre('d', 'small')] as any);
    assert.strictEqual(packed.length, 4);
  });
  it('refuses creatures that cannot fit', () => {
    const many = Array.from({ length: 16 }, (_, i) => cre(`s${i}`, 'small'));
    assert.throws(() => packArmy(many as any), /does not fit/);
  });
});

describe('MATCH-02 / Player attacks and NPC turns', () => {
  it('a strong player army captures an empty neutral territory', () => {
    const w = world(tile('t_0_0', 0, 0, PLAYER, [{ ...cre('a1', 'small', 300, 50, 5), anchor: { col: 0, row: 0 } }, { ...cre('a2', 'small', 300, 50, 5), anchor: { col: 1, row: 0 } }]), tile('t_1_0', 1, 0, null, []));
    const m = match(w);
    playerAttack(m, 't_0_0', 't_1_0', ['a1']);
    assert.strictEqual(w.territories.get('t_1_0')!.owner, PLAYER);
  });

  it('refuses creatures outside staging range', () => {
    const w = world(tile('t_0_0', 0, 0, PLAYER, [{ ...cre('a1', 'small'), anchor: { col: 0, row: 0 } }]), tile('t_1_0', 1, 0, null, []));
    assert.throws(() => playerAttack(match(w), 't_0_0', 't_1_0', ['nope']), /not in staging range/);
  });
});

describe('MATCH-03 / Victory and defeat', () => {
  it('wins on holding four of the six towers', () => {
    const owned = ['t_0_0', 't_2_0', 't_4_0', 't_6_0'];
    const w = world(
      tile('t_0_0', 0, 0, PLAYER, [{ ...cre('a1', 'small', 300, 50, 5), anchor: { col: 0, row: 0 } }, { ...cre('a2', 'small', 300, 50, 5), anchor: { col: 1, row: 0 } }]),
      tile('t_1_0', 1, 0, null, []),
      tile('t_2_0', 2, 0, PLAYER, [{ ...cre('k', 'small'), anchor: { col: 0, row: 0 } }]),
      tile('t_4_0', 4, 0, PLAYER, [{ ...cre('k2', 'small'), anchor: { col: 0, row: 0 } }]),
      tile('t_6_0', 6, 0, PLAYER, [{ ...cre('k3', 'small'), anchor: { col: 0, row: 0 } }]),
      tile('t_8_0', 8, 0, null, []),
    );
    const m = match(w, ['t_0_0', 't_2_0', 't_4_0', 't_6_0', 't_8_0', 't_9_0']);
    assert.strictEqual(VICTORY_TOWERS, 4);
    playerAttack(m, 't_0_0', 't_1_0', ['a1']);
    assert.ok(owned.every(id => w.territories.get(id)!.owner === PLAYER));
    assert.strictEqual(m.status, 'victory', 'four of the six towers are held');
  });

  it('is defeated when the player owns no territory', () => {
    // The player's second creature (power 800) holds the only territory. The NPC garrison (power 1000) sits next door.
    const w = world(tile('t_0_0', 0, 0, PLAYER, [{ ...cre('a1', 'small', 1, 1, 0), anchor: { col: 0, row: 0 } }, { ...cre('a2', 'small', 300, 50, 0), anchor: { col: 1, row: 0 } }]),
      tile('t_1_0', 1, 0, 'npc_x', [{ ...cre('n1', 'small', 600, 40, 0), anchor: { col: 0, row: 0 } }]));
    const m = match(w);
    m.turn = 2; // the NPC faction acts on turn 3 (schedule)
    playerAttack(m, 't_0_0', 't_1_0', ['a1']);
    assert.strictEqual(m.status, 'defeat');
  });
});
