import { describe, it } from 'node:test';
import assert from 'node:assert';
import { join } from 'node:path';
import { loadCatalog } from '../src/combat/catalog.ts';
import { runBattle } from '../src/combat/battle.ts';
import { validateArmy, CombatCreature } from '../src/combat/schema.ts';
import { calculateCreatureStatsAtLevel } from '../src/game/creatureBalance.ts';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../scripts/csv.ts';

const DATA = join(process.cwd(), 'unity_handoff/data');
const catalog = loadCatalog(DATA);

describe('CAT-01 / Creature catalogue from approved data', () => {
  it('covers all 432 creatures', () => {
    assert.strictEqual(catalog.entries.size, 432);
  });

  it('every creature becomes a legal, battle-ready combatant', () => {
    for (const e of catalog.entries.values()) {
      const stats = calculateCreatureStatsAtLevel({ tier: 1, rarity: 'common', stars: 1 } as any, 1);
      const c: CombatCreature = {
        instanceId: e.creatureId, creatureId: e.creatureId, sizeClass: e.sizeClass,
        anchor: { col: 0, row: 0 }, level: 1, hp: stats.hp, atk: stats.atk, def: stats.def, spd: stats.spd,
        movement: e.movement, range: e.range, skills: e.skills, passives: e.passives,
      };
      assert.deepStrictEqual(validateArmy({ side: 'attacker', creatures: [c] }), [], e.creatureId);
      const r = runBattle({ side: 'attacker', creatures: [c] },
        { side: 'defender', creatures: [{ ...c, instanceId: 'dummy', anchor: { col: 0, row: 0 }, sizeClass: 'small', skills: [], passives: [] }] });
      assert.ok(r.rounds >= 1, e.creatureId);
    }
  });

  it('gives a creature its ability only when the ability is runnable now', () => {
    const withSkill = [...catalog.entries.values()].filter(e => e.skills.length > 0).length;
    const withoutSkill = [...catalog.entries.values()].filter(e => e.skills.length === 0).length;
    assert.strictEqual(withSkill, 432, 'every creature now has a runnable signature ability');
    assert.strictEqual(withoutSkill, 0);
  });

  it('uses only approved size classes and footprints', () => {
    const sizes = new Set([...catalog.entries.values()].map(e => e.sizeClass));
    for (const s of sizes) assert.ok(['small', 'medium', 'large', 'huge', 'colossal'].includes(s));
  });
});

describe('CAT-02 / Second active skill for high-rarity creatures', () => {
  const rows = parseCsv(readFileSync(join(DATA, 'sd05_draft_assignments.csv'), 'utf8'));
  const [hdr, ...body] = rows;
  const data = body.map(r => Object.fromEntries(hdr.map((h, i) => [h, r[i] ?? ''])));
  const HIGH = ['epic', 'legendary', 'mythical'];

  it('epic, legendary and mythical creatures carry two actives; others carry one', () => {
    for (const d of data) {
      const e = catalog.entries.get(d.creature_id)!;
      const want = HIGH.includes(d.rarity) ? 2 : 1;
      assert.strictEqual(e.skills.length, want, `${d.creature_id} (${d.rarity})`);
    }
  });

  it('a high-rarity creature\'s second active comes from its own archetype', () => {
    const byArchetype = new Map<string, Set<string>>();
    for (const d of data) {
      const set = byArchetype.get(d.archetype) ?? new Set<string>();
      set.add(JSON.parse(d.active_skill_draft).source_ability);
      byArchetype.set(d.archetype, set);
    }
    for (const d of data.filter(x => HIGH.includes(x.rarity))) {
      const second = catalog.entries.get(d.creature_id)!.skills[1];
      assert.ok(second, d.creature_id);
      const pool = byArchetype.get(d.archetype)!;
      const ability = second.skillId.replace(/_2$/, '');
      assert.ok([...pool].some(a => a.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') === ability), d.creature_id);
    }
  });
});
