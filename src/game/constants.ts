/**
 * Kingdom Conquest III / Shattered Dominion
 * Immutable Game Constants & Spatial Geometry Specifications
 */

export const WORLD_CONSTANTS = {
  // Grid Specifications (CR-001: 100 x 100 = 10,000 territories, coordinates 0..99)
  GRID_ROWS: 100,
  GRID_COLS: 100,
  TOTAL_TERRITORIES: 10000,
  SQUARE_SIZE: 12.0,

  // Continuous Mesh Dimensions
  // Placeholder terrain resolution. A 100 x 100 world needs chunked terrain (CR-001 section 6).
  MESH_WIDTH: 1212.0,
  MESH_DEPTH: 1212.0,
  SUBDIVISIONS_X: 200,
  SUBDIVISIONS_Z: 200,

  // Biome Coordinate Centers
  BIOME_CENTERS: {
    solHeights: { x: -300, z: -300 },
    ignisCaldera: { x: 300, z: -300 },
    frostWastes: { x: -300, z: 300 },
    abyssalMarshes: { x: 300, z: 300 },
  },

  // Lineup & Balance Bounds
  MAX_LINEUP_POINTS: 15,
  BASE_TROOP_CAP: 9999,
  BASE_COMMANDER_STARTING_TROOPS: 100,

  // Save Keys
  SAVE_KEY_V6: 'kc3_sovereign_save_v6',
  SAVE_KEY_V5: 'kc3_sovereign_save_v5',
} as const;

export type BiomeType = 'sol_heights' | 'ignis_caldera' | 'frost_wastes' | 'abyssal_marshes';
