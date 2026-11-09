/**
 * Starter pull (owner rule): the player's first creature comes from the starter pack on first login.
 * Rarity follows the approved rarity table (per-mille, from rarity_pull_rates.csv: 505/270/140/60/20/5).
 * Within a rarity, every creature of that rarity is equally likely. Deterministic from the player seed.
 * ASSUMPTION (to confirm): the starter pack draws from the full 432-creature roster.
 */
import { createRng, hashSeed } from '../game/worldGenerator.ts';

export const RARITY_PER_MILLE: Array<[string, number]> = [
  ['common', 505], ['uncommon', 270], ['rare', 140], ['epic', 60], ['legendary', 20], ['mythical', 5],
];

export interface RosterEntry { creatureId: string; rarity: string; tier: number; }

export function starterPull(playerSeed: string, roster: RosterEntry[]): RosterEntry {
  const rng = createRng(hashSeed('starter:' + playerSeed));
  const roll = Math.floor(rng() * 1000);
  let acc = 0, rarity = 'common';
  for (const [r, w] of RARITY_PER_MILLE) { acc += w; if (roll < acc) { rarity = r; break; } }
  const pool = roster.filter((c) => c.rarity === rarity).sort((a, b) => (a.creatureId < b.creatureId ? -1 : 1));
  if (!pool.length) throw new Error(`no creatures of rarity ${rarity}`);
  return pool[Math.floor(rng() * pool.length)];
}
