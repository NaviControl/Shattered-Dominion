/**
 * Builds a playable match from the approved data: the 100 x 100 world, neutral garrisons, NPC citadel
 * rosters, and the player's starter creature. Uses only approved or built rules.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from '../../scripts/csv.ts';
import { generateWorldTiles, WORLD_SEED, TOWER_COORDS } from '../game/worldGenerator.ts';
import { factionForWorldTile, PLAYER_ID } from '../sim/engine.ts';
import { loadCatalog, Catalog } from '../combat/catalog.ts';
import { calculateCreatureStatsAtLevel } from '../game/creatureBalance.ts';
import { CombatCreature } from '../combat/schema.ts';
import { World, Territory } from '../world/rosters.ts';
import { neutralKindFor, neutralRoster } from '../world/neutral.ts';
import { starterPull, RosterEntry } from './starter.ts';
import { citadelRosterIds } from './npc.ts';
import { packArmy, Match, PLAYER } from './match.ts';

export interface CreatureRecord extends RosterEntry { element: string; family: string; sizeClass: CombatCreature['sizeClass']; }

export function loadRoster(dataDir: string): CreatureRecord[] {
  const rows = parseCsv(readFileSync(join(dataDir, 'sd05_draft_assignments.csv'), 'utf8'));
  const [hdr, ...body] = rows;
  return body.map((r) => {
    const d = Object.fromEntries(hdr.map((h, i) => [h, r[i] ?? '']));
    return { creatureId: d.creature_id, rarity: d.rarity, tier: Number(d.tier), element: d.element, family: d.family, sizeClass: d.size_class as CreatureRecord['sizeClass'] };
  });
}

/** Builds a combat creature for a roster entry, using the catalogue's skills and the prototype stats. */
export function combatCreature(rec: CreatureRecord, catalog: Catalog, level: number, instanceId: string): Omit<CombatCreature, 'anchor'> {
  const e = catalog.entries.get(rec.creatureId);
  if (!e) throw new Error(`creature ${rec.creatureId} is missing from the catalogue`);
  const st = calculateCreatureStatsAtLevel({ tier: rec.tier, rarity: rec.rarity, stars: rec.tier } as any, level);
  return {
    instanceId, creatureId: rec.creatureId, element: rec.element, family: rec.family,
    sizeClass: e.sizeClass, level, hp: st.hp, atk: st.atk, def: st.def, spd: st.spd,
    movement: e.movement, range: e.range, skills: e.skills, passives: e.passives,
  };
}

export function createMatch(playerSeed: string, dataDir: string, worldSeed = WORLD_SEED): Match {
  const catalog = loadCatalog(dataDir);
  const roster = loadRoster(dataDir);
  const tiles = generateWorldTiles(worldSeed);
  const towerIds = new Set(TOWER_COORDS.map((c) => `t_${c.x}_${c.y}`));
  const territories = new Map<string, Territory>();
  const starter = starterPull(playerSeed, roster);
  const starterRec = roster.find((r) => r.creatureId === starter.creatureId)!;
  const withLevel = (rec: CreatureRecord, i: number, prefix: string) => combatCreature(rec, catalog, 1, `${prefix}${i}`);

  for (const t of tiles) {
    const owner = factionForWorldTile(t);
    const id = t.id;
    let rosterOut: CombatCreature[] = [];
    if (owner === PLAYER_ID) {
      if (t.type === 'player_citadel') {
        const packed = packArmy([withLevel(starterRec, 0, 'start-')]);
        rosterOut = packed;
      }
    } else if (owner === null) {
      const kind = neutralKindFor(t.type);
      if (kind) rosterOut = neutralRoster(kind, t.level);
    } else {
      const ids = citadelRosterIds(roster as Array<RosterEntry & { element: string }>, t.level, t.biome ?? 'sol_heights');
      const recs = ids.map((cid) => roster.find((r) => r.creatureId === cid)!).filter(Boolean);
      // Keep only the creatures that fit the 15-position formation, in roster order.
      const fitted: Array<Omit<CombatCreature, 'anchor'>> = [];
      for (const [i, rec] of recs.entries()) {
        const candidate = withLevel(rec, i, `${owner}-`);
        try { packArmy([...fitted, candidate]); fitted.push(candidate); } catch { /* does not fit */ }
      }
      rosterOut = packArmy(fitted);
    }
    territories.set(id, { id, x: t.x, y: t.y, owner, roster: rosterOut });
  }
  const world: World = { territories };
  return { world, towers: towerIds, turn: 0, status: 'ongoing', log: [] };
}

export function loadCatalogFor(dataDir: string): Catalog { return loadCatalog(dataDir); }
