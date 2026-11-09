/**
 * Skill levels and slots (owner decisions).
 *  - Skills level up separately, through their own points (1 point per level).
 *  - A skill's duration in rounds: N = 1 + floor(skill level / 2). Rounded down to whole rounds (builder choice).
 *  - High-rarity creatures may carry two active skills. The high-rarity tiers and the source of the
 *    second skill are still open; see activeSkillSlots().
 *
 * ASSUMPTIONS (to confirm): one skill point per skill level, and a skill starts at level 1.
 */

export const SKILL_POINTS_PER_LEVEL = 1;   // owner decision: one point per skill level
export const SKILL_MAX_LEVEL = 10;         // assumption

export interface SkillProgress { level: number; points: number; }

export function applySkillPoints(progress: SkillProgress, points: number): SkillProgress {
  if (!Number.isInteger(points) || points < 0) throw new Error('points must be a non-negative integer');
  let level = progress.level, pool = progress.points + points;
  while (pool >= SKILL_POINTS_PER_LEVEL && level < SKILL_MAX_LEVEL) { pool -= SKILL_POINTS_PER_LEVEL; level += 1; }
  return { level, points: pool };
}

/** Duration in rounds for a duration-based effect: N = 1 + floor(level / 2). */
export function durationForLevel(level: number): number {
  return 1 + Math.floor(Math.max(1, level) / 2);
}

/** Active skill slots by rarity. Assumption: epic, legendary and mythical count as high-rarity. */
export const HIGH_RARITY = ['epic', 'legendary', 'mythical'] as const;
export function activeSkillSlots(rarity: string): 1 | 2 {
  return (HIGH_RARITY as readonly string[]).includes(rarity) ? 2 : 1;
}
