/**
 * Shattered Dominion - Creature, Commander, and Synergy Balance Engine
 *
 * Implements deterministic progression curves, stat calculations,
 * element/family synergy models, and commander bonding factors.
 */

import {
  CreatureCard,
  CreatureRarity,
  CreatureFamily,
  CreatureElement,
  CommanderCard,
  ElementAffinity,
} from './types';

// ==========================================
// CONSTANTS & MULTIPLIERS
// ==========================================

export const MAX_CREATURE_LEVEL = 50;
export const MAX_CREATURE_STARS = 6;

export const RARITY_STAT_MULTIPLIERS: Record<CreatureRarity, number> = {
  common: 1.0,
  uncommon: 1.3,
  rare: 1.7,
  epic: 2.2,
  legendary: 2.85,
  mythical: 3.6,
};

export const RARITY_GROWTH_MULTIPLIERS: Record<CreatureRarity, number> = {
  common: 1.0,
  uncommon: 1.25,
  rare: 1.55,
  epic: 1.9,
  legendary: 2.35,
  mythical: 3.0,
};

export const TIER_BASE_FACTORS: Record<number, { hp: number; atk: number; def: number; spd: number }> = {
  1: { hp: 350, atk: 45, def: 35, spd: 48 },
  2: { hp: 520, atk: 68, def: 52, spd: 54 },
  3: { hp: 750, atk: 98, def: 74, spd: 60 },
  4: { hp: 1050, atk: 136, def: 104, spd: 66 },
  5: { hp: 1450, atk: 188, def: 142, spd: 74 },
  6: { hp: 1980, atk: 254, def: 190, spd: 82 },
};

// ==========================================
// STAT CURVES & LEVEL PROGRESSION
// ==========================================

export interface CreatureStatBlock {
  level: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  combatRating: number;
  expNeededNext: number;
  goldCostNext: number;
}

/**
 * Calculates EXP required to advance from `level` to `level + 1`.
 */
export function calculateRequiredExpForLevel(level: number, rarity: CreatureRarity = 'rare'): number {
  if (level >= MAX_CREATURE_LEVEL) return 0;
  const baseExp = 120;
  const growthRate = 1.08;
  const rarityFactor = RARITY_STAT_MULTIPLIERS[rarity] || 1.0;
  return Math.round(baseExp * Math.pow(growthRate, level - 1) * (0.8 + 0.2 * rarityFactor));
}

/**
 * Calculates Gold cost to level up from `level` to `level + 1`.
 */
export function calculateLevelUpGoldCost(level: number, rarity: CreatureRarity = 'rare'): number {
  if (level >= MAX_CREATURE_LEVEL) return 0;
  const baseGold = 80;
  const rarityMult = RARITY_STAT_MULTIPLIERS[rarity] || 1.0;
  return Math.round(baseGold * level * 1.4 * rarityMult);
}

/**
 * Computes exact stats for a creature at any level between 1 and 50.
 */
export function calculateCreatureStatsAtLevel(
  creature: Pick<CreatureCard, 'tier' | 'rarity' | 'stars'>,
  targetLevel: number
): CreatureStatBlock {
  const level = Math.max(1, Math.min(MAX_CREATURE_LEVEL, targetLevel));
  const tier = Math.max(1, Math.min(6, creature.tier || 1));
  const rarity = creature.rarity || 'common';
  const stars = Math.max(1, Math.min(MAX_CREATURE_STARS, creature.stars || tier));

  const baseConfig = TIER_BASE_FACTORS[tier] || TIER_BASE_FACTORS[1];
  const rarityMult = RARITY_STAT_MULTIPLIERS[rarity] || 1.0;
  const growthMult = RARITY_GROWTH_MULTIPLIERS[rarity] || 1.0;

  // Star ascension bonus: +12% per star beyond 1
  const starBonus = 1 + (stars - 1) * 0.12;

  // Base stats at Level 1
  const baseHp = Math.round(baseConfig.hp * rarityMult * starBonus);
  const baseAtk = Math.round(baseConfig.atk * rarityMult * starBonus);
  const baseDef = Math.round(baseConfig.def * rarityMult * starBonus);
  const baseSpd = Math.round(baseConfig.spd * (1 + (tier - 1) * 0.05));

  // Level scaling: smooth progressive curve
  const levelDelta = level - 1;
  const hpGain = Math.round((baseConfig.hp * 0.08) * growthMult * levelDelta);
  const atkGain = Math.round((baseConfig.atk * 0.075) * growthMult * levelDelta);
  const defGain = Math.round((baseConfig.def * 0.07) * growthMult * levelDelta);
  const spdGain = Math.floor(levelDelta * 0.35);

  const hp = baseHp + hpGain;
  const atk = baseAtk + atkGain;
  const def = baseDef + defGain;
  const spd = baseSpd + spdGain;

  // Holistic combat rating formula
  const combatRating = Math.round((hp * 0.25) + (atk * 1.6) + (def * 1.3) + (spd * 2.1));

  return {
    level,
    hp,
    atk,
    def,
    spd,
    combatRating,
    expNeededNext: calculateRequiredExpForLevel(level, rarity),
    goldCostNext: calculateLevelUpGoldCost(level, rarity),
  };
}

// ==========================================
// ELEMENTAL & FAMILY SYNERGY ENGINE
// ==========================================

export interface ElementalSynergy {
  element: CreatureElement;
  count: number;
  tier: 'none' | 'minor' | 'major' | 'primal';
  title: string;
  description: string;
  powerBonusPercent: number;
  defenseBonusPercent: number;
}

export interface FamilySynergy {
  family: CreatureFamily;
  count: number;
  active: boolean;
  title: string;
  effectDescription: string;
  statBonus: {
    atkPercent?: number;
    defPercent?: number;
    spdPercent?: number;
    critPercent?: number;
    lifestealPercent?: number;
  };
}

export interface SynergyReport {
  elementSynergies: ElementalSynergy[];
  familySynergies: FamilySynergy[];
  totalSynergyScore: number;
  activeBuffSummaries: string[];
}

const FAMILY_DEFINITIONS: Record<CreatureFamily, { title: string; desc: string; stats: FamilySynergy['statBonus'] }> = {
  Dragons: {
    title: 'Draconic Might',
    desc: 'Empowers fiery fury: +15% ATK and +20% Critical Damage.',
    stats: { atkPercent: 15, critPercent: 20 },
  },
  Undead: {
    title: "Lich King's Grasp",
    desc: 'Unwavering undeath: +12% DEF and +10% Lifesteal.',
    stats: { defPercent: 12, lifestealPercent: 10 },
  },
  Elementals: {
    title: 'Primal Convergence',
    desc: 'Harnesses raw world essence: +14% ATK and +10% Skill Potency.',
    stats: { atkPercent: 14, spdPercent: 5 },
  },
  Demons: {
    title: 'Infernal Wrath',
    desc: 'Blood pact of destruction: +22% ATK and -5% DEF.',
    stats: { atkPercent: 22, defPercent: -5 },
  },
  Beasts: {
    title: 'Primal Pack Hunt',
    desc: 'Swift instinctual unity: +18% SPD and +10% ATK.',
    stats: { spdPercent: 18, atkPercent: 10 },
  },
  Celestials: {
    title: 'Aegis of the Heavens',
    desc: 'Radiant divine barrier: +20% DEF and holy warding.',
    stats: { defPercent: 20 },
  },
  Swarmkin: {
    title: 'Chitinous Surge',
    desc: 'Overwhelming horde velocity: +24% SPD and +8% Dodge.',
    stats: { spdPercent: 24 },
  },
  Abyssals: {
    title: 'Tide of the Deep',
    desc: 'Crushing deep trench pressure: +16% Armor Piercing.',
    stats: { atkPercent: 16 },
  },
  Humanoids: {
    title: 'Tactical Discipline',
    desc: 'Disciplined military formation: +10% ATK, +10% DEF, +10% SPD.',
    stats: { atkPercent: 10, defPercent: 10, spdPercent: 10 },
  },
  Giants: {
    title: 'Titan Stride',
    desc: 'Immense physical bulk: +25% DEF and stagger immunity.',
    stats: { defPercent: 25 },
  },
  Fae: {
    title: 'Glamour Veil',
    desc: 'Ethereal trickery: +15% Dodge and +12% Magic Resistance.',
    stats: { spdPercent: 15, defPercent: 12 },
  },
  Mechanicals: {
    title: 'Clockwork Precision',
    desc: 'Gear-driven synchrony: +15% DEF and +12% Critical Chance.',
    stats: { defPercent: 15, critPercent: 12 },
  },
};

/**
 * Evaluates active team lineup synergies for creatures.
 */
export function calculateCreatureSynergies(creatures: CreatureCard[]): SynergyReport {
  if (!creatures || creatures.length === 0) {
    return {
      elementSynergies: [],
      familySynergies: [],
      totalSynergyScore: 0,
      activeBuffSummaries: [],
    };
  }

  // 1. Element Resonances
  const elementCounts: Partial<Record<CreatureElement, number>> = {};
  creatures.forEach((c) => {
    if (c.element) {
      elementCounts[c.element] = (elementCounts[c.element] || 0) + 1;
    }
  });

  const elementSynergies: ElementalSynergy[] = [];
  const activeBuffs: string[] = [];
  let synergyScore = 0;

  (Object.entries(elementCounts) as [CreatureElement, number][]).forEach(([element, count]) => {
    if (count >= 4) {
      elementSynergies.push({
        element,
        count,
        tier: 'primal',
        title: `Primal ${element} Conflux`,
        description: `4+ ${element}: +30% Element Mastery, +20% Resistance & Status Immunity`,
        powerBonusPercent: 30,
        defenseBonusPercent: 20,
      });
      activeBuffs.push(`Primal ${element} Conflux (+30% DMG)`);
      synergyScore += 35;
    } else if (count === 3) {
      elementSynergies.push({
        element,
        count,
        tier: 'major',
        title: `Major ${element} Resonance`,
        description: `3 ${element}: +20% Element Mastery & +15% Resistance`,
        powerBonusPercent: 20,
        defenseBonusPercent: 15,
      });
      activeBuffs.push(`Major ${element} Resonance (+20% DMG)`);
      synergyScore += 20;
    } else if (count === 2) {
      elementSynergies.push({
        element,
        count,
        tier: 'minor',
        title: `Minor ${element} Harmony`,
        description: `2 ${element}: +10% Element Mastery`,
        powerBonusPercent: 10,
        defenseBonusPercent: 5,
      });
      activeBuffs.push(`Minor ${element} Harmony (+10% DMG)`);
      synergyScore += 10;
    }
  });

  // 2. Family Synergies (threshold: 2+ of the same family)
  const familyCounts: Partial<Record<CreatureFamily, number>> = {};
  creatures.forEach((c) => {
    if (c.family) {
      familyCounts[c.family] = (familyCounts[c.family] || 0) + 1;
    }
  });

  const familySynergies: FamilySynergy[] = [];
  (Object.entries(familyCounts) as [CreatureFamily, number][]).forEach(([family, count]) => {
    const def = FAMILY_DEFINITIONS[family];
    if (count >= 2 && def) {
      familySynergies.push({
        family,
        count,
        active: true,
        title: def.title,
        effectDescription: def.desc,
        statBonus: def.stats,
      });
      activeBuffs.push(`${def.title} (${family} x${count})`);
      synergyScore += 15 * Math.min(count, 4);
    }
  });

  return {
    elementSynergies,
    familySynergies,
    totalSynergyScore: synergyScore,
    activeBuffSummaries: activeBuffs,
  };
}

// ==========================================
// COMMANDER - CREATURE BONDING ENGINE
// ==========================================

export interface CommanderCreatureBond {
  affinityMatchCount: number;
  bondTier: 'none' | 'harmonic' | 'resonant' | 'transcendent';
  title: string;
  description: string;
  troopEffectivenessBonusPercent: number;
  creatureStatBonusPercent: number;
}

const COMMANDER_ELEMENT_MAP: Record<ElementAffinity, CreatureElement[]> = {
  sol: ['Light', 'Arcane'],
  ignis: ['Fire', 'Lightning'],
  void: ['Shadow', 'Void', 'Poison'],
  gaia: ['Earth', 'Nature'],
  frost: ['Water', 'Frost', 'Wind'],
};

/**
 * Calculates harmony and stat bonuses when a Commander commands matching affinity creatures.
 */
export function calculateCommanderCreatureBond(
  commander: CommanderCard,
  creatures: CreatureCard[]
): CommanderCreatureBond {
  if (!commander || !creatures || creatures.length === 0) {
    return {
      affinityMatchCount: 0,
      bondTier: 'none',
      title: 'Neutral Array',
      description: 'No elemental harmony formed.',
      troopEffectivenessBonusPercent: 0,
      creatureStatBonusPercent: 0,
    };
  }

  const matchingAffinityElements = COMMANDER_ELEMENT_MAP[commander.element] || [];
  const matches = creatures.filter((c) => matchingAffinityElements.includes(c.element)).length;

  if (matches >= 3) {
    return {
      affinityMatchCount: matches,
      bondTier: 'transcendent',
      title: 'Transcendent Symphony',
      description: `${commander.name}'s ${commander.element.toUpperCase()} affinity harmonizes seamlessly with ${matches} elemental creatures.`,
      troopEffectivenessBonusPercent: 20,
      creatureStatBonusPercent: 18,
    };
  } else if (matches === 2) {
    return {
      affinityMatchCount: matches,
      bondTier: 'resonant',
      title: 'Resonant Attunement',
      description: `${commander.name} shares elemental resonance with ${matches} creatures.`,
      troopEffectivenessBonusPercent: 12,
      creatureStatBonusPercent: 10,
    };
  } else if (matches === 1) {
    return {
      affinityMatchCount: matches,
      bondTier: 'harmonic',
      title: 'Harmonic Alignment',
      description: `${commander.name} aligns with 1 creature in tactical resonance.`,
      troopEffectivenessBonusPercent: 6,
      creatureStatBonusPercent: 5,
    };
  }

  return {
    affinityMatchCount: 0,
    bondTier: 'none',
    title: 'Independent Host',
    description: 'No elemental affinity overlap between commander and creatures.',
    troopEffectivenessBonusPercent: 0,
    creatureStatBonusPercent: 0,
  };
}

// ==========================================
// COMMANDER BALANCE & PROGRESSION
// ==========================================

export interface CommanderBalanceScore {
  commanderId: string;
  name: string;
  cost: number;
  combatRating: number;
  troopYieldIndex: number;
  pointEfficiency: number; // Rating per lineup cost point
  balanceTier: 'S' | 'A' | 'B' | 'C';
}

/**
 * Calculates Commander stat scaling per level.
 */
export function calculateCommanderStatsAtLevel(
  commander: CommanderCard,
  targetLevel: number
): {
  level: number;
  atk: number;
  def: number;
  spd: number;
  intel: number;
  troopCapacity: number;
} {
  const level = Math.max(1, Math.min(commander.maxLevel || 50, targetLevel));
  const delta = level - 1;

  // Base commander growth
  const atk = commander.atk + delta * 24;
  const def = commander.def + delta * 18;
  const spd = commander.spd + Math.floor(delta * 0.4);
  const intel = commander.intel + delta * 12;
  const troopCapacity = commander.troopCapacity + delta * 85;

  return { level, atk, def, spd, intel, troopCapacity };
}

/**
 * Evaluates Commander cost efficiency to guarantee competitive lineup balance.
 */
export function evaluateCommanderBalance(commander: CommanderCard): CommanderBalanceScore {
  const cost = commander.cost || 4;
  const combatRating = Math.round(commander.atk * 1.5 + commander.def * 1.2 + commander.spd * 2.0 + commander.intel * 0.4);
  const yieldPerCycle = commander.troopGeneration?.yieldPerCycle || 10;
  const troopYieldIndex = Math.round(yieldPerCycle * 5);

  const totalValue = combatRating + troopYieldIndex + commander.troopCapacity * 0.1;
  const pointEfficiency = Math.round(totalValue / cost);

  let balanceTier: 'S' | 'A' | 'B' | 'C' = 'B';
  if (pointEfficiency >= 500) balanceTier = 'S';
  else if (pointEfficiency >= 400) balanceTier = 'A';
  else if (pointEfficiency >= 300) balanceTier = 'B';
  else balanceTier = 'C';

  return {
    commanderId: commander.id,
    name: commander.name,
    cost,
    combatRating,
    troopYieldIndex,
    pointEfficiency,
    balanceTier,
  };
}
