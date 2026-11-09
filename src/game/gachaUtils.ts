/**
 * Kingdom Conquest III - Gacha & Card Pack Drop Rate Engine
 * Shattered Dominion Rarity Distribution:
 * - Mythical: 0.5% (Personal / standard pull)
 * - Legendary: 2.0%
 * - Epic: 6.0%
 * - Rare: 14.0%
 * - Uncommon: 27.0%
 * - Common: 50.5%
 * 
 * Global Altar Rates:
 * - Mythical: 1.0%
 * - Legendary: 5.0%
 * - Epic: 24.0%
 * - Rare / Uncommon: 70.0%
 */

export type PullSourceType = 'global_altar' | 'personal_event' | 'personal_quest' | 'personal_dungeon';

export interface DropRates {
  mythical: number;
  legendary: number;
  epic: number;
  rare: number;
  uncommon: number;
  common: number;
}

export function getDropRates(sourceType: PullSourceType): DropRates {
  if (sourceType === 'global_altar') {
    return {
      mythical: 0.01,   // 1%
      legendary: 0.05,  // 5%
      epic: 0.24,       // 24%
      rare: 0.40,       // 40%
      uncommon: 0.20,   // 20%
      common: 0.10,     // 10%
    };
  } else {
    // Personal pull rates from events, large quests, and first pass of dungeons (0.5% Mythical)
    return {
      mythical: 0.005,  // 0.5%
      legendary: 0.02,  // 2.0%
      epic: 0.06,       // 6.0%
      rare: 0.14,       // 14.0%
      uncommon: 0.27,   // 27.0%
      common: 0.505,    // 50.5%
    };
  }
}

export function rollCardRarity(sourceType: PullSourceType = 'personal_event'): 'mythical' | 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common' {
  const rates = getDropRates(sourceType);
  const roll = Math.random();

  let cumulative = 0;
  cumulative += rates.mythical;
  if (roll < cumulative) return 'mythical';

  cumulative += rates.legendary;
  if (roll < cumulative) return 'legendary';

  cumulative += rates.epic;
  if (roll < cumulative) return 'epic';

  cumulative += rates.rare;
  if (roll < cumulative) return 'rare';

  cumulative += rates.uncommon;
  if (roll < cumulative) return 'uncommon';

  return 'common';
}
