/**
 * Kingdom Conquest III / Shattered Dominion
 * Combat & Army Simulation Engine (SD-04)
 * Provides deterministic calculations for army squad stats, formation modifiers,
 * tactical stance bonuses, and real-time damage curves.
 */

import { CommanderCard, TroopUnit, UnitUpgradeCard, TroopFormation, CardSkill } from './types';

export interface FormationTactics {
  stance: TroopFormation;
  attackMultiplier: number;
  defenseMultiplier: number;
  speedMultiplier: number;
  casualtyRateMultiplier: number;
  description: string;
}

export const FORMATION_TACTICS_DATA: Record<TroopFormation, FormationTactics> = {
  aggressive: {
    stance: 'aggressive',
    attackMultiplier: 1.25,
    defenseMultiplier: 0.85,
    speedMultiplier: 1.20,
    casualtyRateMultiplier: 1.25,
    description: 'V-Wedge Spearhead: +25% burst power, +20% march speed, higher risk of casualties.',
  },
  defensive: {
    stance: 'defensive',
    attackMultiplier: 0.95,
    defenseMultiplier: 1.30,
    speedMultiplier: 0.88,
    casualtyRateMultiplier: 0.65,
    description: 'Interlocking Phalanx: +30% squad DEF, 35% reduced casualties, slower tactical march.',
  },
  balanced: {
    stance: 'balanced',
    attackMultiplier: 1.08,
    defenseMultiplier: 1.08,
    speedMultiplier: 1.0,
    casualtyRateMultiplier: 1.0,
    description: 'Dual-Rank Discipline: +8% ATK and DEF, standard operational speed.',
  },
};

/**
 * Computes squad attack and defense ratings considering commander stats, unit upgrades, and formation stance.
 */
export function calculateArmyCombatRating(
  commander: CommanderCard,
  troopType: 'legionnaire' | 'archer' | 'gryphon' | 'catapult',
  troopCount: number,
  unitCards: UnitUpgradeCard[] = [],
  formation: TroopFormation = 'balanced'
): {
  totalAttack: number;
  totalDefense: number;
  effectivePower: number;
  stance: FormationTactics;
} {
  const stance = FORMATION_TACTICS_DATA[formation] || FORMATION_TACTICS_DATA.balanced;

  const activeUnitCard = unitCards.find(
    (u) => (u.targetUnitType === troopType || u.targetUnitType === 'all') && u.isEquipped
  );
  const unitAtkMult = activeUnitCard ? 1 + activeUnitCard.bonusAtkPercent / 100 : 1.0;
  const unitDefMult = activeUnitCard ? 1 + activeUnitCard.bonusDefPercent / 100 : 1.0;

  // Base troop values
  const baseTroopAtk = troopType === 'catapult' ? 145 : troopType === 'gryphon' ? 88 : troopType === 'archer' ? 64 : 42;
  const baseTroopDef = troopType === 'legionnaire' ? 68 : troopType === 'gryphon' ? 54 : troopType === 'archer' ? 28 : 22;

  const totalAttack = Math.round(
    (commander.atk * 3 + troopCount * (baseTroopAtk * 0.25)) * unitAtkMult * stance.attackMultiplier
  );
  const totalDefense = Math.round(
    (commander.def * 3 + troopCount * (baseTroopDef * 0.25)) * unitDefMult * stance.defenseMultiplier
  );
  const effectivePower = Math.round((totalAttack * 1.2 + totalDefense * 0.8));

  return {
    totalAttack,
    totalDefense,
    effectivePower,
    stance,
  };
}

/**
 * Dungeon crawler skill damage calculation factoring commander element affinity and intelligence.
 */
export function calculateDungeonSkillDamage(
  skillId: string,
  heroCard: CommanderCard,
  baseDamage: number
): {
  damage: number;
  isCrit: boolean;
} {
  const intelMultiplier = 1 + (heroCard.intel || 400) / 1000;
  const isCrit = Math.random() < (heroCard.spd > 80 ? 0.35 : 0.20);
  const critMultiplier = isCrit ? 1.5 : 1.0;

  const damage = Math.round(baseDamage * intelMultiplier * critMultiplier);
  return { damage, isCrit };
}
