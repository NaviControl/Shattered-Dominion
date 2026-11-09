/**
 * Territory rosters, staging and capture (SD-03), per CR-002 REV1 section 12 and 13 (approved A8).
 *
 * - An army is assembled from creatures stationed on owned territories within STAGING_RADIUS
 *   (Manhattan) of its origin. Nearest territories first, then by id.
 * - A territory may be emptied by staging. An emptied territory stays with its owner until conquered.
 * - Capture: if the attacker wins, the territory changes owner and the surviving attackers become
 *   its roster (A8, approved). Dead creatures are removed.
 * - Survivors of a failed attack return to the origin territory (owner decision).
 * - An attack on an emptied enemy territory meets no defenders: the attacker takes it.
 * - Neutral territories are garrisoned by their fixed roster (rule approved; roster data is a draft).
 */

import { runBattle, BattleResult } from '../combat/battle.ts';
import { ArmySpec, CombatCreature, Side, validateArmy, GRID_COLS, GRID_ROWS } from '../combat/schema.ts';

export const STAGING_RADIUS = 2;

export interface Territory {
  id: string;
  x: number;
  y: number;
  owner: string | null;   // faction id, or null for neutral
  roster: CombatCreature[];  // creatures stationed here, with anchors in this territory's formation
}

export interface World {
  territories: Map<string, Territory>;
}

export interface StagedCreature { instanceId: string; tileId: string; }

const manhattan = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const byStr = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Creatures available for an army from `origin`, nearest territory first, then by territory id, then instance id. */
export function stagingCandidates(world: World, origin: Territory, owner: string): StagedCreature[] {
  const near = [...world.territories.values()]
    .filter((t) => t.owner === owner && manhattan(t, origin) <= STAGING_RADIUS)
    .sort((a, b) => manhattan(a, origin) - manhattan(b, origin) || byStr(a.id, b.id));
  const out: StagedCreature[] = [];
  for (const t of near) {
    for (const c of [...t.roster].sort((a, b) => byStr(a.instanceId, b.instanceId))) out.push({ instanceId: c.instanceId, tileId: t.id });
  }
  return out;
}

/**
 * Builds an attacking army from chosen creatures. Each chosen creature must come from the staging
 * candidates, and no territory may be left empty. `placements` gives each creature's anchor in the army grid.
 */
export function assembleArmy(
  world: World,
  originId: string,
  owner: string,
  picks: Array<{ instanceId: string; anchor: { col: number; row: number } }>
): ArmySpec {
  const origin = world.territories.get(originId);
  if (!origin || origin.owner !== owner) throw new Error('origin territory is not owned by this faction');
  const candidates = new Map(stagingCandidates(world, origin, owner).map((s) => [s.instanceId, s.tileId] as const));

  const creatures: CombatCreature[] = [];
  for (const pick of picks) {
    const tileId = candidates.get(pick.instanceId);
    if (!tileId) throw new Error(`creature ${pick.instanceId} is not in staging range`);
    const tile = world.territories.get(tileId)!;
    const c = tile.roster.find((x) => x.instanceId === pick.instanceId)!;
    creatures.push({ ...c, anchor: pick.anchor });
  }

  const army: ArmySpec = { side: 'attacker', creatures };
  const errors = validateArmy(army);
  if (errors.length) throw new Error('invalid army: ' + errors.join('; '));
  return army;
}

export interface AttackOutcome {
  result: BattleResult | null;   // null when the target was empty and no battle occurred
  captured: boolean;
}

/**
 * Resolves an attack from `originId` into the adjacent `targetId`. The attacking creatures are
 * removed from their staging territories and fight. On capture, survivors become the target's
 * roster. On failure, survivors return to the origin territory.
 */
export function attackTerritory(
  world: World,
  originId: string,
  targetId: string,
  army: ArmySpec
): AttackOutcome {
  const origin = world.territories.get(originId)!;
  const target = world.territories.get(targetId)!;
  if (origin.owner === target.owner) throw new Error('target is already owned by the attacker');
  if (manhattan(origin, target) !== 1) throw new Error('target is not adjacent to origin');

  // Remove the marching creatures from their staging territories.
  const marching = new Set(army.creatures.map((c) => c.instanceId));
  for (const t of world.territories.values()) {
    if (t.owner === origin.owner) t.roster = t.roster.filter((c) => !marching.has(c.instanceId));
  }

  if (target.roster.length === 0) {
    // Emptied territory: no defenders, the attacker takes it.
    target.owner = origin.owner;
    target.roster = army.creatures.map((c) => ({ ...c }));
    return { result: null, captured: true };
  }

  const defender: ArmySpec = { side: 'defender' as Side, creatures: target.roster.map((c) => ({ ...c })) };
  const attackerSide: ArmySpec = { ...army, side: 'attacker' as Side };
  const result = runBattle(attackerSide, defender);

  const survivors = army.creatures
    .filter((c) => (result.finalHp[c.instanceId] ?? 0) > 0)
    .map((c) => ({ ...c, hp: result.finalHp[c.instanceId], anchor: result.finalAnchors[c.instanceId] }));

  if (result.winner === 'attacker') {
    target.owner = origin.owner;
    target.roster = survivors;
    return { result, captured: true };
  }
  origin.roster = [...origin.roster, ...survivors];
  return { result, captured: false };
}

export { GRID_COLS, GRID_ROWS };
