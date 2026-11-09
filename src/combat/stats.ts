/**
 * The eight baseline creature stats (owner request). Each level-up grants points that the player
 * allocates freely across these stats. The points-per-level value is not yet decided, so callers pass it.
 *
 * HP, attack, defense and speed come from the prototype stat formulas (creatureBalance.ts).
 * Movement and range come from the SD-05 assignments. Skill power and team synergy are new
 * multipliers in basis points (10000 = 100%).
 */

export const BASE_STAT_KEYS = ['hp', 'attack', 'defense', 'speed', 'movement', 'range', 'skill_power', 'synergy'] as const;
export type BaseStatKey = typeof BASE_STAT_KEYS[number];
export type BaseStats = Record<BaseStatKey, number>;

/** Applies a level-up allocation. Every point must be spent exactly; values stay non-negative integers. */
/** Points granted per creature level (owner decision). */
export const POINTS_PER_LEVEL = 5;

export function applyLevelUp(current: BaseStats, allocation: Partial<Record<BaseStatKey, number>>, pointsGranted: number = POINTS_PER_LEVEL): BaseStats {
  if (!Number.isInteger(pointsGranted) || pointsGranted < 0) throw new Error('pointsGranted must be a non-negative integer');
  let spent = 0;
  for (const [k, v] of Object.entries(allocation)) {
    if (!(BASE_STAT_KEYS as readonly string[]).includes(k)) throw new Error(`unknown stat ${k}`);
    if (!Number.isInteger(v) || (v as number) < 0) throw new Error(`points for ${k} must be a non-negative integer`);
    spent += v as number;
  }
  if (spent !== pointsGranted) throw new Error(`allocation spends ${spent} of ${pointsGranted} points`);
  const next = { ...current };
  for (const k of BASE_STAT_KEYS) next[k] = current[k] + (allocation[k] ?? 0);
  return next;
}

/** Default multipliers for a creature with no skill-power or synergy investment. */
export const DEFAULT_MULTIPLIER_BPS = 10000;
