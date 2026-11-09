/**
 * NPC citadel rosters and schedule (owner rules).
 *  - A citadel's roster is set by its land level and terrain (biome).
 *  - Factions spread on a fixed schedule: each acts every NPC_EVERY turns, staggered by faction index.
 *  - Not overpowering: a faction only attacks with a roster whose power is within NPC_POWER_CAP_PCT
 *    of the player's strongest roster power.
 * ASSUMPTIONS (builder draft, to confirm): biome -> element mapping, and the power cap percentage.
 */
import { CombatCreature } from '../combat/schema.ts';
import { RosterEntry } from './starter.ts';

export const NPC_EVERY = 3;
export const NPC_POWER_CAP_PCT = 150;

export const BIOME_ELEMENT: Record<string, string> = {
  sol_heights: 'Light', ignis_caldera: 'Fire', frost_wastes: 'Frost', abyssal_marshes: 'Shadow',
};

/** Citadel roster: creatures of the land's tier (level, capped at 6) and the biome's element. Falls back to tier only. */
export function citadelRosterIds(roster: Array<RosterEntry & { element: string }>, level: number, biome: string): string[] {
  const tier = Math.min(6, Math.max(1, level));
  const element = BIOME_ELEMENT[biome];
  const sorted = [...roster].sort((a, b) => (a.creatureId < b.creatureId ? -1 : 1));
  let pick = sorted.filter((c) => c.tier === tier && c.element === element);
  if (pick.length < 3) pick = sorted.filter((c) => c.tier === tier);
  return pick.slice(0, 3).map((c) => c.creatureId);
}

/** True if a faction acts this turn (fixed schedule, staggered by index). */
export function factionActs(turn: number, factionIndex: number): boolean {
  return (turn + factionIndex) % NPC_EVERY === 0;
}

/** True if the faction's roster power is within the cap of the player's strongest roster power. */
export function withinPowerCap(npcPower: number, playerStrongest: number): boolean {
  return npcPower * 100 <= playerStrongest * NPC_POWER_CAP_PCT;
}
