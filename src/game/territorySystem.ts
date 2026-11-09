/**
 * Kingdom Conquest III / Shattered Dominion
 * Territory Conquest & Resource Production Engine (SD-03)
 * Provides deterministic simulation of resource production, territory adjacency, and spoils calculation.
 */

import { 
  Building, 
  EconomicCard, 
  WorldTile, 
  MarchingArmy, 
  TroopFormation, 
  UnitUpgradeCard 
} from './types';
import { generateWorldTiles } from './worldGenerator';
import { WORLD_CONSTANTS } from './constants';

export { generateWorldTiles };

/**
 * Calculates continuous 3D world coordinates for a tile given its grid coordinates.
 */
export function getSquareWorldPos(x: number, y: number): { x: number; z: number } {
  const tileSize = WORLD_CONSTANTS.SQUARE_SIZE;
  const startX = -((WORLD_CONSTANTS.GRID_COLS - 1) * tileSize) / 2;
  const startZ = -((WORLD_CONSTANTS.GRID_ROWS - 1) * tileSize) / 2;
  return {
    x: startX + x * tileSize,
    z: startZ + y * tileSize,
  };
}

export interface EmpireProductionRates {
  food: number;
  timber: number;
  stone: number;
  iron: number;
  mana: number;
}

export interface TerritorySpoils {
  food: number;
  timber: number;
  gold: number;
  rubies: number;
  exclusiveDrop?: string;
}

/**
 * Calculates continuous empire resource generation rates from citadel structures and active economic doctrines.
 */
export function calculateEmpireProductionRates(
  buildings: Building[],
  economicCards: EconomicCard[]
): EmpireProductionRates {
  let baseFood = 14;
  let baseTimber = 12;
  let baseStone = 10;
  let baseIron = 8;
  let baseMana = 6;

  buildings.forEach((b) => {
    if (b.type === 'farm') baseFood += b.level * 4;
    if (b.type === 'mill') baseTimber += b.level * 4;
    if (b.type === 'quarry') baseStone += b.level * 3;
    if (b.type === 'forge') baseIron += b.level * 3;
    if (b.type === 'spire') baseMana += b.level * 2;
  });

  economicCards.forEach((ec) => {
    if (ec.isCouncilActive) {
      if (ec.productionBoost.food) baseFood *= (1 + ec.productionBoost.food / 100);
      if (ec.productionBoost.timber) baseTimber *= (1 + ec.productionBoost.timber / 100);
      if (ec.productionBoost.stone) baseStone *= (1 + ec.productionBoost.stone / 100);
      if (ec.productionBoost.iron) baseIron *= (1 + ec.productionBoost.iron / 100);
      if (ec.productionBoost.mana) baseMana *= (1 + ec.productionBoost.mana / 100);
    }
  });

  return {
    food: Math.round(baseFood),
    timber: Math.round(baseTimber),
    stone: Math.round(baseStone),
    iron: Math.round(baseIron),
    mana: Math.round(baseMana),
  };
}

/**
 * Determines whether a target territory is adjacent (connected) to currently player-held territories.
 */
export function isTerritoryAdjacentToPlayer(
  targetTile: WorldTile,
  allTiles: WorldTile[]
): boolean {
  if (targetTile.owner === 'player') return false;
  return allTiles.some(
    (t) =>
      t.owner === 'player' &&
      Math.abs(t.x - targetTile.x) + Math.abs(t.y - targetTile.y) === 1
  );
}

export function isTileAdjacentToPlayer(
  targetTileId: string,
  allTiles: WorldTile[]
): boolean {
  const target = allTiles.find((t) => t.id === targetTileId);
  if (!target) return false;
  return isTerritoryAdjacentToPlayer(target, allTiles);
}

/**
 * Calculates combat power and resolution for an army march arriving at a target territory.
 */
export function resolveTerritoryCombat(
  march: MarchingArmy,
  targetTile: WorldTile,
  unitCards: UnitUpgradeCard[]
): {
  isVictorious: boolean;
  playerPower: number;
  newGarrisonPower: number;
  spoils: TerritorySpoils;
} {
  const activeUnitCard = unitCards.find(
    (u) => u.targetUnitType === march.troopType && u.isEquipped
  );
  const unitBonusAtk = activeUnitCard ? 1 + activeUnitCard.bonusAtkPercent / 100 : 1;

  let formationPowerMult = 1.0;
  if (march.formation === 'aggressive') {
    formationPowerMult = 1.25;
  } else if (march.formation === 'defensive') {
    formationPowerMult = 0.95;
  } else if (march.formation === 'balanced') {
    formationPowerMult = 1.08;
  }

  const playerPower = (march.commander.atk * 3 + march.troopCount * 12) * unitBonusAtk * formationPowerMult;
  const defenseThreshold = targetTile.garrisonPower * (march.formation === 'defensive' ? 0.65 : 0.75);
  const isVictorious = playerPower >= defenseThreshold;

  const newGarrisonPower = Math.floor(playerPower * (march.formation === 'defensive' ? 0.75 : 0.6));

  const spoils: TerritorySpoils = {
    food: 2500 * targetTile.level,
    timber: 2000 * targetTile.level,
    gold: 800 * targetTile.level,
    rubies: 15 * targetTile.level,
    exclusiveDrop: targetTile.exclusiveCardDrop,
  };

  return {
    isVictorious,
    playerPower: Math.round(playerPower),
    newGarrisonPower,
    spoils,
  };
}

/**
 * Computes travel duration in milliseconds for an army expedition based on distance, doctrines, and formation.
 */
export function calculateMarchDuration(
  sourceCoords: { x: number; y: number },
  targetCoords: { x: number; y: number },
  economicCards: EconomicCard[],
  formation: TroopFormation = 'balanced'
): number {
  const dist = Math.hypot(targetCoords.x - sourceCoords.x, targetCoords.y - sourceCoords.y);
  const baseTimePerTile = 2400; // ms per grid unit

  let speedMult = 1.0;
  economicCards.forEach((ec) => {
    if (ec.isCouncilActive && ec.marchSpeedBoost) {
      speedMult += ec.marchSpeedBoost / 100;
    }
  });

  let formationSpeedMult = 1.0;
  if (formation === 'aggressive') formationSpeedMult = 1.20;
  else if (formation === 'defensive') formationSpeedMult = 0.88;

  const duration = Math.round((Math.max(1, dist) * baseTimePerTile) / (speedMult * formationSpeedMult));
  return Math.max(3000, duration);
}
