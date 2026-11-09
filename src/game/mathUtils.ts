/**
 * Kingdom Conquest III / Shattered Dominion
 * Shared Deterministic Mathematical & Spatial Utilities
 */

import { WORLD_CONSTANTS, BiomeType } from './constants';

export interface WorldVector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Calculates world-space coordinates (x, y, z) for any grid coordinate (c, r)
 */
export function gridToWorldPos(c: number, r: number): WorldVector3 {
  const x = (c - (WORLD_CONSTANTS.GRID_COLS - 1) / 2) * WORLD_CONSTANTS.SQUARE_SIZE;
  const z = (r - (WORLD_CONSTANTS.GRID_ROWS - 1) / 2) * WORLD_CONSTANTS.SQUARE_SIZE;
  const y = getWorldTerrainHeight(x, z);
  return { x, y, z };
}

/**
 * Deterministic World Height Function covering all 100 territories and 4 biomes.
 * Shared across terrain mesh generation, landmark positioning, army pathing, and raycasting.
 */
export function getWorldTerrainHeight(worldX: number, worldZ: number): number {
  const isNorth = worldZ < 0;
  const isWest = worldX < 0;

  const globalHarmonics = 
    Math.sin(worldX * 0.05) * 0.6 +
    Math.cos(worldZ * 0.05) * 0.6;

  let regionalElevation = 0.5;

  if (isNorth && isWest) {
    // Sol Heights (NW): Highland ridge, Citadel plateau, Quarry terrace
    const ridgeDist = Math.abs((worldX * 0.707 + worldZ * 0.707 + 38) + Math.sin(worldX * 0.1) * 4.5);
    const greatRidge = Math.max(0, 4.4 * Math.exp(-(ridgeDist ** 2) / 80));

    const distToCitadel = Math.hypot(worldX - (-24), worldZ - (-30));
    const citadelHill = Math.max(0, 3.2 * Math.exp(-(distToCitadel ** 2) / 120));

    const distToQuarry = Math.hypot(worldX - (-36), worldZ - (-18));
    const quarryTerrace = Math.max(0, 2.2 * Math.exp(-(distToQuarry ** 2) / 85));

    const valleyDist = Math.abs((worldX * 0.707 - worldZ * 0.707 + 8));
    const valleyCarve = -1.8 * Math.exp(-(valleyDist ** 2) / 95);

    regionalElevation = 1.4 + greatRidge + citadelHill + quarryTerrace + valleyCarve;
  } else if (isNorth && !isWest) {
    // Ignis Caldera (NE): Shield volcano & crater depression
    const distToVolcano = Math.hypot(worldX - 30, worldZ - (-24));
    const volcanoCone = Math.max(0, 7.2 * Math.exp(-(distToVolcano ** 2) / 240));
    const calderaDepression = -3.4 * Math.exp(-(distToVolcano ** 2) / 65);
    regionalElevation = 1.5 + volcanoCone + calderaDepression;
  } else if (!isNorth && isWest) {
    // Frost Wastes (SW): Glacial peaks & valleys
    const distToGlacier = Math.hypot(worldX - (-30), worldZ - 26);
    const glacialRange = Math.abs(Math.sin(worldX * 0.08) * 2.6 + Math.cos(worldZ * 0.07) * 2.2);
    const glacialPeaks = Math.max(0, 4.6 * Math.exp(-(distToGlacier ** 2) / 190));
    regionalElevation = 1.6 + glacialRange + glacialPeaks;
  } else {
    // Abyssal Marshes (SE): Low wetland basin & hummocks
    const distToTrench = Math.hypot(worldX - 26, worldZ - 26);
    const swampBasin = -1.4 * Math.exp(-(distToTrench ** 2) / 160);
    const hummocks = Math.sin(worldX * 0.12) * Math.cos(worldZ * 0.12) * 0.9;
    regionalElevation = 0.6 + swampBasin + hummocks;
  }

  const edgeDistX = Math.max(0, Math.abs(worldX) - 58);
  const edgeDistZ = Math.max(0, Math.abs(worldZ) - 56);
  const edgeDrop = (edgeDistX ** 1.5 + edgeDistZ ** 1.5) * 0.06;

  return Math.max(0.1, regionalElevation + globalHarmonics - edgeDrop);
}

/**
 * Returns primary biome classification for given world coordinates
 */
export function getBiomeAtWorldPos(worldX: number, worldZ: number): BiomeType {
  if (worldZ < 0) {
    return worldX < 0 ? 'sol_heights' : 'ignis_caldera';
  } else {
    return worldX < 0 ? 'frost_wastes' : 'abyssal_marshes';
  }
}
