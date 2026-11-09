/**
 * Builds combat definitions for roster creatures from the approved data files:
 *  - SD-05 assignments (size class, movement, range, combat role, signature ability, family specialty)
 *  - approved ability effects (signature_abilities_DRAFT_effects.csv, approved by the owner)
 *  - approved family-specialty passives (family_specialty_passives_DRAFT.csv, approved by the owner)
 *
 * Only abilities and passives the v1 engine can run are included. The rest wait for schema v2.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from '../../scripts/csv.ts';
import type { SkillDef, PassiveDef, SizeClass } from './schema.ts';
import { activeSkillSlots } from './skills.ts';

export interface CatalogEntry {
  creatureId: string;
  name: string;
  sizeClass: SizeClass;
  movement: number;
  range: number;
  skills: SkillDef[];
  passives: PassiveDef[];
}

export interface Catalog {
  entries: Map<string, CatalogEntry>;
  excludedAbilities: string[];   // abilities awaiting schema v2
}

function table(path: string): Array<Record<string, string>> {
  const rows = parseCsv(readFileSync(path, 'utf8'));
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

export function loadCatalog(dataDir: string): Catalog {
  const sd05 = table(join(dataDir, 'sd05_draft_assignments.csv'));
  const effects = table(join(dataDir, 'signature_abilities_DRAFT_effects.csv'));
  const passives = table(join(dataDir, 'family_specialty_passives_DRAFT.csv'));

  // Ability effects the engine can run (approved, not waiting for schema v2).
  const skillByAbility = new Map<string, SkillDef | null>();
  const excluded: string[] = [];
  for (const e of effects) {
    if (e.needs_schema_v2) { excluded.push(e.ability); skillByAbility.set(e.ability, null); continue; }
    const type = e.type as SkillDef['effects'][number]['type'];
    const stat = (e.stat || undefined) as SkillDef['effects'][number]['stat'];
    skillByAbility.set(e.ability, {
      skillId: slug(e.ability),
      kind: 'active',
      cooldownRounds: Number(e.cooldown_rounds),
      targeting: e.targeting as SkillDef['targeting'],
      condition: e.condition as SkillDef['condition'],
      effects: [{ type, stat, amount: Number(e.amount), durationRounds: Number(e.duration_rounds) || undefined }],
    });
  }

  // Passive per family specialty (approved category set; "none" rows give no passive).
  const passiveBySpecialty = new Map<string, PassiveDef | null>();
  for (const p of passives) {
    if (p.trigger === 'none') { passiveBySpecialty.set(p.family_specialty, null); continue; }
    const isHeal = p.stat_or_effect === 'heal';
    passiveBySpecialty.set(p.family_specialty, {
      passiveId: slug(p.family_specialty),
      trigger: p.trigger as PassiveDef['trigger'],
      condition: 'always',
      effects: [p.stat_or_effect === 'evade'
        ? { type: 'evade', amount: Number(p.amount) }
        : isHeal
          ? { type: 'heal', amount: Number(p.amount) }
          : { type: 'buff', stat: p.stat_or_effect as 'atk' | 'def' | 'spd', amount: Number(p.amount) }],
    });
  }

  // The SD-05 file records each creature's family specialty in its passives column.
  // Archetype pools: each creature's runnable active skill, in creature-ID order.
  const archetypeOf = new Map(sd05.map((r) => [r.creature_id, r.archetype] as const));
  const abilityOf = new Map(sd05.map((r) => [r.creature_id, r.active_skill_draft ? (JSON.parse(r.active_skill_draft).source_ability as string) : ''] as const));
  const pools = new Map<string, Array<{ creatureId: string; ability: string }>>();
  for (const row of [...sd05].sort((a, b) => (a.creature_id < b.creature_id ? -1 : 1))) {
    const pool = pools.get(row.archetype) ?? [];
    pool.push({ creatureId: row.creature_id, ability: abilityOf.get(row.creature_id) ?? '' });
    pools.set(row.archetype, pool);
  }

  const entries = new Map<string, CatalogEntry>();
  for (const row of sd05) {
    const ability = abilityOf.get(row.creature_id) ?? '';
    const skill = skillByAbility.get(ability);
    const slots = activeSkillSlots(row.rarity);
    const extra: SkillDef[] = [];
    if (slots === 2) {
      // Second active: the first runnable ability in the same archetype that differs from this creature's own.
      for (const other of pools.get(row.archetype) ?? []) {
        if (other.creatureId === row.creature_id || other.ability === ability) continue;
        const s2 = skillByAbility.get(other.ability);
        if (s2) { extra.push({ ...s2, skillId: s2.skillId + '_2' }); break; }
      }
    }
    const specialty = (row.passives.match(/family specialty recorded for review: (.+)\)$/) ?? [])[1] ?? '';
    const passive = passiveBySpecialty.get(specialty) ?? null;
    entries.set(row.creature_id, {
      creatureId: row.creature_id,
      name: row.name,
      sizeClass: row.size_class as SizeClass,
      movement: Number(row.movement),
      range: Number(row.range),
      skills: [...(skill ? [skill] : []), ...extra],
      passives: passive ? [passive] : [],
    });
  }
  return { entries, excludedAbilities: [...new Set(excluded)] };
}
