import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { 
  WorldTile, 
  MarchingArmy, 
  CommanderCard, 
  TroopUnit, 
  TileType,
  UnitUpgradeCard,
  ResearchTech,
  TroopFormation
} from '../game/types';
import { sound } from '../game/audio';
import { getProceduralTerrainTexture } from '../game/proceduralTextures';
import { 
  calculateTroopCapacity, 
  calculateLineupPoints, 
  MAX_LINEUP_POINTS, 
  BASE_TROOP_CAP 
} from '../game/lineupUtils';
import { WORLD_CONSTANTS } from '../game/constants';
import { getWorldTerrainHeight, gridToWorldPos } from '../game/mathUtils';
import { isTerritoryAdjacentToPlayer } from '../game/territorySystem';
import { 
  preloadSolHeightsAssets, 
  getModelInstance, 
  getAssetLoadStatus, 
  AssetLoadStatus 
} from '../game/assetManifest';
import { 
  Shield, 
  Wheat, 
  Trees, 
  Boxes, 
  Anvil, 
  Sparkles, 
  Flame, 
  Flag, 
  Compass, 
  Swords, 
  X, 
  Crosshair, 
  Send, 
  Eye, 
  Camera, 
  Layers, 
  ChevronDown, 
  ChevronUp,
  Grid,
  Maximize2,
  AlertTriangle,
  Award,
  Zap,
  CheckCircle2,
  Brain,
  GraduationCap,
  Pickaxe
} from 'lucide-react';

interface RealmMapProps {
  tiles: WorldTile[];
  marches: MarchingArmy[];
  cards: CommanderCard[];
  unitCards: UnitUpgradeCard[];
  techs: ResearchTech[];
  troops: TroopUnit[];
  onDispatchMarch: (
    commanderId: string,
    targetTileId: string,
    troopType: 'legionnaire' | 'archer' | 'gryphon' | 'catapult',
    troopCount: number,
    action: 'attack' | 'capture' | 'reinforce' | 'scout',
    lineupCards?: (CommanderCard | UnitUpgradeCard)[],
    formation?: TroopFormation
  ) => void;
  onTileCaptured: (tileId: string) => void;
  onSelectCommander: (cardId: string) => void;
}

// WebGL resource disposal helper to prevent GPU leaks during long campaign play
function disposeHierarchy(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    }
  });
}

export const RealmMap: React.FC<RealmMapProps> = ({
  tiles,
  marches,
  cards,
  unitCards,
  techs,
  troops,
  onDispatchMarch,
  onTileCaptured,
  onSelectCommander,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Tactical selection state
  const [selectedTile, setSelectedTile] = useState<WorldTile | null>(null);
  const [hoveredTile, setHoveredTile] = useState<WorldTile | null>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isScoutModalOpen, setIsScoutModalOpen] = useState(false);
  const [scoutedTile, setScoutedTile] = useState<WorldTile | null>(null);

  // 15-Point Lineup Selection State for March
  const [selectedCommanderId, setSelectedCommanderId] = useState<string>(cards[0]?.id || '');
  const [selectedBattalionCardId, setSelectedBattalionCardId] = useState<string | null>(unitCards[0]?.id || null);
  const [selectedSupportCardId, setSelectedSupportCardId] = useState<string | null>(null);

  // Tactical Troop Formation Stance ('aggressive' | 'defensive' | 'balanced')
  const [selectedFormation, setSelectedFormation] = useState<TroopFormation>('balanced');

  const [selectedTroopType, setSelectedTroopType] = useState<'legionnaire' | 'archer' | 'gryphon' | 'catapult'>('legionnaire');
  const [troopCount, setTroopCount] = useState<number>(100);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState<boolean>(false);
  const [viewPreset, setViewPreset] = useState<'tactical' | 'topdown' | 'cinematic'>('tactical');

  // Square size on the connected flat grid
  const SQUARE_SIZE = 12.0;
  const GRID_COLS = WORLD_CONSTANTS.GRID_COLS;
  const GRID_ROWS = WORLD_CONSTANTS.GRID_ROWS;

  // 3D GLB Model Asset Loading Status
  const [assetStatus, setAssetStatus] = useState<AssetLoadStatus>(getAssetLoadStatus());

  // Preload Continental 3D GLB Assets on Mount
  useEffect(() => {
    preloadSolHeightsAssets().then(() => {
      setAssetStatus(getAssetLoadStatus());
      const t = threeRef.current;
      if (t) {
        tiles.forEach((tile) => {
          const group = t.tileMeshes.get(tile.id);
          if (group) {
            const existing = group.children.find((c) => c.name === 'landmark_group');
            if (existing) {
              existing.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                  const mesh = child as THREE.Mesh;
                  mesh.geometry?.dispose();
                  if (Array.isArray(mesh.material)) {
                    mesh.material.forEach((m) => m.dispose());
                  } else if (mesh.material) {
                    mesh.material.dispose();
                  }
                }
              });
              group.remove(existing);
            }
            const newLandmark = buildSquareLandmarkGroup(tile, t.isSoftwareGl);
            newLandmark.name = 'landmark_group';
            newLandmark.position.y = 0.1;
            group.add(newLandmark);
          }
        });
      }
    });
  }, []);

  // Selected card entities
  const selectedCommander = useMemo(() => {
    return cards.find((c) => c.id === selectedCommanderId) || cards[0];
  }, [cards, selectedCommanderId]);

  const selectedBattalionCard = useMemo(() => {
    return unitCards.find((u) => u.id === selectedBattalionCardId) || null;
  }, [unitCards, selectedBattalionCardId]);

  const selectedSupportCard = useMemo(() => {
    return unitCards.find((u) => u.id === selectedSupportCardId) || null;
  }, [unitCards, selectedSupportCardId]);

  // Compute Lineup Points Budget (Max 15 Points)
  const lineupPoints = useMemo(() => {
    return calculateLineupPoints(selectedCommander, selectedBattalionCard, selectedSupportCard);
  }, [selectedCommander, selectedBattalionCard, selectedSupportCard]);

  // Compute Troop Capacity (Base 9999 + Intel + Research + Skills)
  const troopCapacity = useMemo(() => {
    return calculateTroopCapacity(selectedCommander, techs);
  }, [selectedCommander, techs]);

  // Commander begins with 100 troops until sent into battle
  const commanderStandingTroops = selectedCommander ? (selectedCommander.currentTroops ?? 100) : 100;

  // Trained reserves in barracks for selected unit type
  const barracksReserveCount = useMemo(() => {
    const unit = troops.find((t) => t.type === selectedTroopType);
    return unit ? unit.count : 0;
  }, [troops, selectedTroopType]);

  // Total available troops = Commander's standing troops (100 until sent into battle) + trained barracks reserves
  const maxTroopsAvailable = useMemo(() => {
    return commanderStandingTroops + barracksReserveCount;
  }, [commanderStandingTroops, barracksReserveCount]);

  // Upper deploy limit is min(available, effective troop capacity)
  const deployableLimit = useMemo(() => {
    return Math.min(maxTroopsAvailable, troopCapacity.totalCap);
  }, [maxTroopsAvailable, troopCapacity.totalCap]);

  // Keep troopCount clamped within valid limits and default to commander's standing 100 troops
  useEffect(() => {
    if (deployableLimit > 0) {
      if (troopCount > deployableLimit || troopCount === 0) {
        setTroopCount(Math.min(deployableLimit, commanderStandingTroops > 0 ? commanderStandingTroops : deployableLimit));
      }
    } else {
      setTroopCount(0);
    }
  }, [deployableLimit, commanderStandingTroops]);

  // Calculate world coordinates for any connected square (c, r)
  const getSquareWorldPos = (c: number, r: number) => {
    const x = (c - (GRID_COLS - 1) / 2) * SQUARE_SIZE;
    const z = (r - (GRID_ROWS - 1) / 2) * SQUARE_SIZE;
    return { x, y: 0, z };
  };

  // Determine if a tile is adjacent (connected) to player territory
  const isAdjacentToPlayer = (targetTile: WorldTile) => {
    return isTerritoryAdjacentToPlayer(targetTile, tiles);
  };

  // Three.js References
  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    tileMeshes: Map<string, THREE.Group>;
    squarePlates: Map<string, THREE.Mesh>;
    borderLines: Map<string, THREE.LineSegments>;
    roadMeshes: THREE.Group;
    marchMeshes: Map<string, THREE.Group>;
    selectionBox: THREE.LineSegments;
    hoverBox: THREE.LineSegments;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    animFrameId: number;
    clock: THREE.Clock;
    isSoftwareGl: boolean;
  } | null>(null);

  // Build 3D landmarks for connected squares using continental GLB models
  const buildSquareLandmarkGroup = (tile: WorldTile, isSoftwareGl: boolean): THREE.Group => {
    const group = new THREE.Group();
    group.name = 'landmark_group';

    if (tile.type === 'player_citadel') {
      const fortressGlb = getModelInstance('fortress');
      if (fortressGlb) {
        fortressGlb.position.set(0, 0, 0);
        fortressGlb.scale.set(0.95, 0.95, 0.95);
        group.add(fortressGlb);
        return group;
      }
    } else if (tile.type === 'alliance_outpost') {
      const outpostGlb = getModelInstance('allianceOutpost');
      if (outpostGlb) {
        outpostGlb.position.set(0, 0, 0);
        outpostGlb.scale.set(1.1, 1.1, 1.1);
        group.add(outpostGlb);
        return group;
      }
    } else if (tile.type === 'farmland') {
      const farmlandGlb = getModelInstance('farmland');
      if (farmlandGlb) {
        farmlandGlb.position.set(0, 0, 0);
        farmlandGlb.scale.set(1.15, 1.15, 1.15);
        group.add(farmlandGlb);
        return group;
      }
    } else if (tile.type === 'lumber_mill') {
      const lumberGlb = getModelInstance('lumberMill');
      if (lumberGlb) {
        lumberGlb.position.set(0, 0, 0);
        lumberGlb.scale.set(1.15, 1.15, 1.15);
        group.add(lumberGlb);
        return group;
      }
    } else if (tile.type === 'stone_quarry') {
      const quarryGlb = getModelInstance('quarry');
      if (quarryGlb) {
        quarryGlb.position.set(0, 0, 0);
        quarryGlb.scale.set(1.18, 1.18, 1.18);
        group.add(quarryGlb);
        return group;
      }
    } else if (tile.type === 'iron_vein') {
      const forgeGlb = getModelInstance('ironForge');
      if (forgeGlb) {
        forgeGlb.position.set(0, 0, 0);
        forgeGlb.scale.set(1.2, 1.2, 1.2);
        group.add(forgeGlb);
        return group;
      }
    } else if (tile.type === 'monster_lair') {
      const lairGlb = getModelInstance('monsterLair');
      if (lairGlb) {
        lairGlb.position.set(0, 0, 0);
        lairGlb.scale.set(1.1, 1.1, 1.1);
        group.add(lairGlb);
        return group;
      }
    } else if (tile.type === 'ancient_ruin') {
      const ruinGlb = getModelInstance('ancientRuin');
      if (ruinGlb) {
        ruinGlb.position.set(0, 0, 0);
        ruinGlb.scale.set(1.1, 1.1, 1.1);
        group.add(ruinGlb);
        return group;
      }
    } else if (tile.type === 'rival_citadel') {
      const rivalGlb = getModelInstance('rivalCitadel');
      if (rivalGlb) {
        rivalGlb.position.set(0, 0, 0);
        rivalGlb.scale.set(1.1, 1.1, 1.1);
        group.add(rivalGlb);
        return group;
      }
    } else if (tile.type === 'mana_monolith') {
      const ruinGlb = getModelInstance('ancientRuin');
      if (ruinGlb) {
        ruinGlb.position.set(0, 0, 0);
        ruinGlb.scale.set(1.15, 1.15, 1.15);
        group.add(ruinGlb);
        return group;
      }
    }

    // Procedural Fallbacks if GLB instance unavailable
    const keepGeo = new THREE.BoxGeometry(3.6, 4.4, 3.6);
    const keepMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.2 });
    const keep = new THREE.Mesh(keepGeo, keepMat);
    keep.position.y = 2.4;
    group.add(keep);
    return group;
  };

  // Build 3D Marching Formation Actor with realistic stance-specific unit tokens & banners
  const buildMarchSquadActor = (march: MarchingArmy): THREE.Group => {
    const group = new THREE.Group();
    const formation = march.formation || 'balanced';

    // Formation Base styling reflecting stance
    const baseColor = formation === 'aggressive' ? 0x991b1b : formation === 'defensive' ? 0x0369a1 : 0x1e3a8a;
    const baseGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.3, 16);
    const baseMat = new THREE.MeshStandardMaterial({ color: baseColor, metalness: 0.5 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.2;
    group.add(base);

    // Standard Flag Pole
    const bannerPoleGeo = new THREE.CylinderGeometry(0.08, 0.08, 4.4, 6);
    const bannerPoleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9 });
    const pole = new THREE.Mesh(bannerPoleGeo, bannerPoleMat);
    pole.position.set(0.6, 2.4, 0);
    group.add(pole);

    // Heraldic Imperial War Banner with stance color & glow
    const bannerColor = formation === 'aggressive' ? 0xef4444 : formation === 'defensive' ? 0x38bdf8 : 0xf59e0b;
    const bannerEmissive = formation === 'aggressive' ? 0xdc2626 : formation === 'defensive' ? 0x0284c7 : 0xd97706;
    const flagGeo = new THREE.BoxGeometry(1.8, 1.1, 0.06);
    const flagMat = new THREE.MeshStandardMaterial({
      color: bannerColor,
      roughness: 0.3,
      emissive: bannerEmissive,
      emissiveIntensity: 0.5,
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(1.5, 3.8, 0);
    group.add(flag);

    // Miniatures positioned dynamically according to formation stance!
    const riderGeo = new THREE.CylinderGeometry(0.35, 0.45, 1.3, 8);
    const riderColor = formation === 'aggressive' ? 0xf87171 : formation === 'defensive' ? 0x7dd3fc : 0xfacc15;
    const riderMat = new THREE.MeshStandardMaterial({
      color: riderColor,
      metalness: 0.5,
      roughness: 0.3,
    });

    // Stance-specific troop pawn formation layout:
    let pawnOffsets: [number, number][] = [];
    if (formation === 'aggressive') {
      // V-Wedge Spearhead pointing forward
      pawnOffsets = [
        [0, 1.0],      // Spearhead point
        [-0.6, 0.3],   // Left flank
        [0.6, 0.3],    // Right flank
        [-1.0, -0.4],  // Left wing
        [1.0, -0.4],   // Right wing
      ];
    } else if (formation === 'defensive') {
      // Interlocking Phalanx Box / Turtle Shield Wall
      pawnOffsets = [
        [-0.5, 0.5],
        [0.5, 0.5],
        [-0.5, -0.5],
        [0.5, -0.5],
      ];
      // Defensive shield perimeter ring
      const shieldRingGeo = new THREE.TorusGeometry(1.4, 0.08, 6, 16);
      const shieldRingMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.8,
      });
      const shieldRing = new THREE.Mesh(shieldRingGeo, shieldRingMat);
      shieldRing.rotation.x = Math.PI / 2;
      shieldRing.position.y = 0.8;
      group.add(shieldRing);
    } else {
      // Balanced Dual-Rank Ranks
      pawnOffsets = [
        [-0.6, 0.4],
        [0.6, 0.4],
        [-0.6, -0.4],
        [0.6, -0.4],
      ];
    }

    pawnOffsets.forEach(([ox, oz]) => {
      const rider = new THREE.Mesh(riderGeo, riderMat);
      rider.position.set(ox, 1.0, oz);
      group.add(rider);
    });

    return group;
  };

  // Rebuild connected roadways between player-owned squares
  const buildConnectedRoadways = (scene: THREE.Scene, tileList: WorldTile[]): THREE.Group => {
    const roadGroup = new THREE.Group();
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.5,
      metalness: 0.2,
    });

    const playerTiles = tileList.filter((t) => t.owner === 'player');
    const playerCoords = new Set(playerTiles.map((t) => `${t.x},${t.y}`));

    playerTiles.forEach((tile) => {
      const p1 = getSquareWorldPos(tile.x, tile.y);

      // Check right neighbor
      if (playerCoords.has(`${tile.x + 1},${tile.y}`)) {
        const midX = p1.x + SQUARE_SIZE / 2;
        const midZ = p1.z;
        const roadY = getWorldTerrainHeight(midX, midZ) + 0.12;
        const roadGeo = new THREE.BoxGeometry(SQUARE_SIZE, 0.08, 2.0);
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.position.set(midX, roadY, midZ);
        roadGroup.add(road);
      }

      // Check bottom neighbor
      if (playerCoords.has(`${tile.x},${tile.y + 1}`)) {
        const midX = p1.x;
        const midZ = p1.z + SQUARE_SIZE / 2;
        const roadY = getWorldTerrainHeight(midX, midZ) + 0.12;
        const roadGeo = new THREE.BoxGeometry(2.0, 0.08, SQUARE_SIZE);
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.position.set(midX, roadY, midZ);
        roadGroup.add(road);
      }
    });

    return roadGroup;
  };

  // Deterministic terrain height is imported from ../game/mathUtils (NAVI-SD-OMEGA-001)

  // Procedural Continuous Biome Terrain Texture Generator (NAVI-GAME-TERRAIN-007)
  const generateBiomeTerrainTexture = (): THREE.CanvasTexture => {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    // Terrain geometry dimensions in world coordinates
    const mapWidth = 120;
    const mapDepth = 108;

    for (let y = 0; y < size; y++) {
      const v = y / size;
      const worldZ = (v - 0.5) * mapDepth;

      for (let x = 0; x < size; x++) {
        const u = x / size;
        const worldX = (u - 0.5) * mapWidth;

        // Continuous domain-warping noise to eliminate straight-line boundaries
        const warpX = Math.sin(worldZ * 0.08) * 8.5 + Math.cos((worldX + worldZ) * 0.045) * 4.5;
        const warpZ = Math.cos(worldX * 0.08) * 8.5 + Math.sin((worldX - worldZ) * 0.045) * 4.5;
        const wx = worldX + warpX;
        const wz = worldZ + warpZ;

        // Biome attraction centers
        const dSol = Math.hypot(wx - (-28), wz - (-25));
        const dIgnis = Math.hypot(wx - 28, wz - (-25));
        const dFrost = Math.hypot(wx - (-28), wz - 25);
        const dAbyss = Math.hypot(wx - 28, wz - 25);

        // Softmax smooth continuous weighting
        const decay = 0.042;
        const wSolRaw = Math.exp(-dSol * decay);
        const wIgnisRaw = Math.exp(-dIgnis * decay);
        const wFrostRaw = Math.exp(-dFrost * decay);
        const wAbyssRaw = Math.exp(-dAbyss * decay);
        const sumWeights = wSolRaw + wIgnisRaw + wFrostRaw + wAbyssRaw || 1.0;

        const wSol = wSolRaw / sumWeights;
        const wIgnis = wIgnisRaw / sumWeights;
        const wFrost = wFrostRaw / sumWeights;
        const wAbyss = wAbyssRaw / sumWeights;

        // Sub-harmonic micro color variation per biome
        const microNoise = Math.sin(worldX * 0.4 + worldZ * 0.3) * 0.5 + 0.5;

        // Sol Heights: Lush Highland Meadow (Emerald to Olive)
        const solR = 48 + microNoise * 14;
        const solG = 96 + microNoise * 18;
        const solB = 34 + microNoise * 8;

        // Ignis Caldera: Volcanic Basalt & Scorched Terracotta
        const ignisR = 76 + microNoise * 26;
        const ignisG = 34 + microNoise * 14;
        const ignisB = 26 + microNoise * 10;

        // Frost Wastes: Glacial Firn & Powder Snow
        const frostR = 214 + microNoise * 22;
        const frostG = 228 + microNoise * 18;
        const frostB = 244 + microNoise * 10;

        // Abyssal Marshes: Gloomy Mire, Peat & Bioluminescent Teal
        const abyssR = 40 + microNoise * 16;
        const abyssG = 32 + microNoise * 12;
        const abyssB = 56 + microNoise * 20;

        // Blend base regional colors continuously across space
        let r = wSol * solR + wIgnis * ignisR + wFrost * frostR + wAbyss * abyssR;
        let g = wSol * solG + wIgnis * ignisG + wFrost * frostG + wAbyss * abyssG;
        let b = wSol * solB + wIgnis * ignisB + wFrost * frostB + wAbyss * abyssB;

        // Terrain Elevation & Slope Awareness
        const height = getWorldTerrainHeight(worldX, worldZ);
        const hE = getWorldTerrainHeight(worldX + 1.5, worldZ);
        const hW = getWorldTerrainHeight(worldX - 1.5, worldZ);
        const hS = getWorldTerrainHeight(worldX, worldZ + 1.5);
        const hN = getWorldTerrainHeight(worldX, worldZ - 1.5);
        const slope = Math.hypot((hE - hW) / 3.0, (hS - hN) / 3.0);

        // 1. Steep Slopes: Expose weathered rock, granite shale & cliff strata
        if (slope > 0.28) {
          const rockBlend = Math.min(0.85, (slope - 0.28) * 3.2);
          const rockR = 75 + Math.sin(worldX * 0.8) * 12;
          const rockG = 78 + Math.cos(worldZ * 0.8) * 10;
          const rockB = 84 + Math.sin((worldX + worldZ) * 0.5) * 8;
          r = r * (1 - rockBlend) + rockR * rockBlend;
          g = g * (1 - rockBlend) + rockG * rockBlend;
          b = b * (1 - rockBlend) + rockB * rockBlend;
        }

        // 2. High Elevation Snowcaps in cold / elevated peaks
        if (height > 1.65 && (wFrost > 0.2 || wSol > 0.3)) {
          const snowBlend = Math.min(0.9, (height - 1.65) * 1.8);
          r = r * (1 - snowBlend) + 242 * snowBlend;
          g = g * (1 - snowBlend) + 246 * snowBlend;
          b = b * (1 - snowBlend) + 255 * snowBlend;
        }

        // 3. Volcanic Fissures & Cinder in high Ignis peaks
        if (wIgnis > 0.45 && height > 1.2) {
          const cinderBlend = Math.min(0.65, (height - 1.2) * 1.2);
          r = r * (1 - cinderBlend) + 120 * cinderBlend;
          g = g * (1 - cinderBlend) + 42 * cinderBlend;
          b = b * (1 - cinderBlend) + 24 * cinderBlend;
        }

        // 4. Low Wetland Basins & Peat in Abyssal
        if (wAbyss > 0.4 && height < 0.25) {
          const mireBlend = Math.min(0.6, (0.25 - height) * 3.0);
          r = r * (1 - mireBlend) + 28 * mireBlend;
          g = g * (1 - mireBlend) + 24 * mireBlend;
          b = b * (1 - mireBlend) + 36 * mireBlend;
        }

        // Subtle fine grain noise to prevent color banding
        const fineNoise = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * 6 - 3;
        r = Math.max(0, Math.min(255, Math.round(r + fineNoise)));
        g = Math.max(0, Math.min(255, Math.round(g + fineNoise)));
        b = Math.max(0, Math.min(255, Math.round(b + fineNoise)));

        const idx = (y * size + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(1, 1);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  // Build unified continuous terrain surface across the entire 10x10 world with biome-aware materials (Unit 3)
  const buildWorldContinuousTerrain = (isSoftwareGl: boolean): THREE.Group => {
    const terrainGroup = new THREE.Group();
    terrainGroup.name = 'World_Continuous_Terrain';

    const width = WORLD_CONSTANTS.MESH_WIDTH;
    const depth = WORLD_CONSTANTS.MESH_DEPTH;
    const segX = WORLD_CONSTANTS.SUBDIVISIONS_X;
    const segZ = WORLD_CONSTANTS.SUBDIVISIONS_Z;
    const geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const height = getWorldTerrainHeight(vx, vz);
      posAttr.setY(i, height);
    }
    geo.computeVertexNormals();

    const biomeTexture = generateBiomeTerrainTexture();
    const terrainMat = new THREE.MeshStandardMaterial({
      map: biomeTexture,
      roughness: 0.8,
      metalness: 0.04,
      flatShading: false,
    });

    const terrainMesh = new THREE.Mesh(geo, terrainMat);
    terrainMesh.position.set(0, 0.02, 0);
    terrainMesh.receiveShadow = !isSoftwareGl;
    terrainGroup.add(terrainMesh);

    // Global environmental GLB asset scattering across all 4 biomes
    const environmentalSpawns = [
      // Sol Heights (NW) - Highland pine groves & limestone crags
      { pos: [-42, -36], type: 'rock', treeType: 'pineTreeA' },
      { pos: [-20, -40], type: 'rock', treeType: 'pineTreeB' },
      { pos: [-32, -22], type: 'tuft', treeType: 'pineTreeA' },
      { pos: [-14, -34], type: 'rock', treeType: 'pineTreeB' },
      
      // Ignis Caldera (NE) - Volcanic basalt crags & obsidian vents
      { pos: [18, -38], type: 'rock', treeType: 'monsterLair' },
      { pos: [40, -32], type: 'rock', treeType: 'rock' },
      { pos: [26, -16], type: 'rock', treeType: 'monsterLair' },
      { pos: [44, -10], type: 'rock', treeType: 'rock' },

      // Frost Wastes (SW) - Glacial ice crags & frosted pines
      { pos: [-45, 12], type: 'rock', treeType: 'pineTreeA' },
      { pos: [-38, 36], type: 'rock', treeType: 'pineTreeB' },
      { pos: [-18, 28], type: 'rock', treeType: 'pineTreeA' },
      { pos: [-28, 42], type: 'tuft', treeType: 'pineTreeB' },

      // Abyssal Marshes (SE) - Mire peat hummocks & ancient monolith pillars
      { pos: [42, 16], type: 'tuft', treeType: 'ancientRuin' },
      { pos: [20, 36], type: 'tuft', treeType: 'rock' },
      { pos: [42, 38], type: 'rock', treeType: 'ancientRuin' },
      { pos: [28, 22], type: 'tuft', treeType: 'tuft' },
    ];

    environmentalSpawns.forEach((spawn, idx) => {
      const rx = spawn.pos[0];
      const rz = spawn.pos[1];
      const ridgeHeight = getWorldTerrainHeight(rx, rz);

      // Primary geology/foliage
      if (spawn.type === 'rock') {
        const rock = getModelInstance('rockOutcrop');
        if (rock) {
          rock.position.set(rx, ridgeHeight + 0.1, rz);
          rock.scale.set(1.4, 1.6, 1.4);
          rock.rotation.y = idx * 0.9;
          terrainGroup.add(rock);
        }
      } else if (spawn.type === 'tuft') {
        const tuft = getModelInstance('foliageTuft');
        if (tuft) {
          tuft.position.set(rx, ridgeHeight + 0.05, rz);
          tuft.scale.set(1.3, 1.3, 1.3);
          terrainGroup.add(tuft);
        }
      }

      // Secondary feature (Trees, Vents, Ruins)
      if (spawn.treeType === 'pineTreeA' || spawn.treeType === 'pineTreeB') {
        const tree = getModelInstance(spawn.treeType as 'pineTreeA' | 'pineTreeB');
        if (tree) {
          tree.position.set(rx + 2.0, ridgeHeight + 0.1, rz + 1.5);
          tree.scale.set(0.9, 0.9, 0.9);
          terrainGroup.add(tree);
        }
      } else if (spawn.treeType === 'monsterLair') {
        const vent = getModelInstance('monsterLair');
        if (vent) {
          vent.position.set(rx + 2.5, ridgeHeight + 0.1, rz + 1.8);
          vent.scale.set(0.55, 0.55, 0.55);
          terrainGroup.add(vent);
        }
      } else if (spawn.treeType === 'ancientRuin') {
        const pillar = getModelInstance('ancientRuin');
        if (pillar) {
          pillar.position.set(rx + 2.2, ridgeHeight + 0.1, rz + 2.0);
          pillar.scale.set(0.6, 0.6, 0.6);
          terrainGroup.add(pillar);
        }
      }
    });

    return terrainGroup;
  };

  // Initialize Three.js WebGL Scene with Realistic Lighting & Procedural PBR Textures
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth;
    const height = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090b10);
    scene.fog = new THREE.FogExp2(0x090b10, 0.0055);

    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {
      // Fallback
    }

    // Camera setup for connected tactical grid with topography perspective
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 600);
    camera.position.set(0, 64, 84);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.18;
    controls.minDistance = 20;
    controls.maxDistance = 180;
    controls.target.set(0, 2, 0);

    // Warm Sun Directional Light + Soft Shadows
    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.5);
    sunLight.position.set(45, 95, 45);
    sunLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 260;
      sunLight.shadow.camera.left = -90;
      sunLight.shadow.camera.right = 90;
      sunLight.shadow.camera.top = 90;
      sunLight.shadow.camera.bottom = -90;
      sunLight.shadow.bias = -0.0004;
    }
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x090d16, 1.3);
    scene.add(hemiLight);

    // War Table base border plane
    const tableGeo = new THREE.PlaneGeometry(360, 360);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x06080d,
      roughness: 0.95,
      metalness: 0.1,
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.rotation.x = -Math.PI / 2;
    table.position.y = -0.05;
    table.receiveShadow = !isSoftwareGl;
    scene.add(table);

    // World Continuity Continuous Landscape (Unit 1)
    const worldTerrain = buildWorldContinuousTerrain(isSoftwareGl);
    scene.add(worldTerrain);

    // Connected Territory Tiles Grid
    const tileMeshes = new Map<string, THREE.Group>();
    const squarePlates = new Map<string, THREE.Mesh>();
    const borderLines = new Map<string, THREE.LineSegments>();

    tiles.forEach((tile) => {
      const pos = getSquareWorldPos(tile.x, tile.y);
      const tileY = getWorldTerrainHeight(pos.x, pos.z);

      const group = new THREE.Group();
      group.position.set(pos.x, tileY, pos.z);
      group.userData = { tileId: tile.id, tileData: tile };

      // Encapsulating 1.2-unit thick collision proxy volume centered at terrain elevation
      const plateGeo = new THREE.BoxGeometry(SQUARE_SIZE, 1.2, SQUARE_SIZE);
      const plateMat = new THREE.MeshStandardMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });

      const plateMesh = new THREE.Mesh(plateGeo, plateMat);
      plateMesh.position.y = 0.1;
      plateMesh.receiveShadow = false;
      plateMesh.castShadow = false;
      plateMesh.userData = { tileId: tile.id, tileData: tile };
      group.add(plateMesh);
      squarePlates.set(tile.id, plateMesh);

      // Connected border lines (hidden for seamless continuous world terrain)
      const edgesGeo = new THREE.EdgesGeometry(plateGeo);
      const edgesMat = new THREE.LineBasicMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0,
        visible: false,
      });
      const edges = new THREE.LineSegments(edgesGeo, edgesMat);
      edges.position.y = 0.05;
      edges.visible = false;
      group.add(edges);
      borderLines.set(tile.id, edges);

      // Add 3D Landmark structure on top of square
      const landmarkGroup = buildSquareLandmarkGroup(tile, isSoftwareGl);
      landmarkGroup.position.y = 0.1;
      group.add(landmarkGroup);

      scene.add(group);
      tileMeshes.set(tile.id, group);
    });

    // Build connected roadways
    const roadMeshes = buildConnectedRoadways(scene, tiles);
    scene.add(roadMeshes);

    // Selection Box Indicator
    const selBoxGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(SQUARE_SIZE + 0.3, 0.6, SQUARE_SIZE + 0.3));
    const selBoxMat = new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 3 });
    const selectionBox = new THREE.LineSegments(selBoxGeo, selBoxMat);
    selectionBox.position.y = 0.4;
    selectionBox.visible = false;
    scene.add(selectionBox);

    // Hover Box Indicator
    const hoverBoxGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(SQUARE_SIZE + 0.1, 0.4, SQUARE_SIZE + 0.1));
    const hoverBoxMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
    const hoverBox = new THREE.LineSegments(hoverBoxGeo, hoverBoxMat);
    hoverBox.position.y = 0.35;
    hoverBox.visible = false;
    scene.add(hoverBox);

    const marchMeshes = new Map<string, THREE.Group>();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const clock = new THREE.Clock();

    threeRef.current = {
      renderer,
      scene,
      camera,
      controls,
      tileMeshes,
      squarePlates,
      borderLines,
      roadMeshes,
      marchMeshes,
      selectionBox,
      hoverBox,
      raycaster,
      mouse,
      animFrameId: 0,
      clock,
      isSoftwareGl,
    };

    const handleResize = () => {
      if (!container || !threeRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      threeRef.current.camera.aspect = w / h;
      threeRef.current.camera.updateProjectionMatrix();
      threeRef.current.renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    const animate = () => {
      const t = threeRef.current;
      if (!t) return;

      const time = t.clock.getElapsedTime();

      // 1. Dynamic Marching Army Gait & War Banner Flutter
      if (t.marchMeshes.size > 0) {
        let marchIdx = 0;
        t.marchMeshes.forEach((squad) => {
          marchIdx++;
          // Walking step cadence
          const bob = Math.sin(time * 6 + marchIdx) * 0.08;
          const sway = Math.cos(time * 6 + marchIdx) * 0.03;
          squad.position.y += bob * 0.02;
          squad.rotation.z = sway;

          // Heraldic banner ripple
          squad.children.forEach((child) => {
            if ((child as THREE.Mesh).isMesh && child.position.y > 3.0) {
              child.rotation.y = Math.sin(time * 5 + marchIdx) * 0.14;
            }
          });
        });
      }

      // 2. Selection Box Indicator Breathing Pulse
      if (t.selectionBox && t.selectionBox.visible) {
        const pulse = 1.0 + Math.sin(time * 3.5) * 0.02;
        t.selectionBox.scale.set(pulse, 1, pulse);
      }

      // 3. Hover Box Indicator Soft Pulse
      if (t.hoverBox && t.hoverBox.visible) {
        const hPulse = 1.0 + Math.sin(time * 4.0) * 0.015;
        t.hoverBox.scale.set(hPulse, 1, hPulse);
      }

      t.controls.update();
      t.renderer.render(t.scene, t.camera);

      t.animFrameId = requestAnimationFrame(animate);
    };

    if (threeRef.current) {
      threeRef.current.animFrameId = requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (threeRef.current) {
        cancelAnimationFrame(threeRef.current.animFrameId);
        disposeHierarchy(threeRef.current.scene);
        threeRef.current.renderer.dispose();
      }
      container.innerHTML = '';
      threeRef.current = null;
    };
  }, []);

  // Update roadways when tile ownership updates (keeping plates invisible)
  useEffect(() => {
    const t = threeRef.current;
    if (!t) return;

    // Rebuild roadways with memory cleanup
    if (t.roadMeshes) {
      t.scene.remove(t.roadMeshes);
      disposeHierarchy(t.roadMeshes);
    }
    t.roadMeshes = buildConnectedRoadways(t.scene, tiles);
    t.scene.add(t.roadMeshes);
  }, [tiles]);

  // Update selection box
  useEffect(() => {
    const t = threeRef.current;
    if (!t) return;

    if (selectedTile) {
      const pos = getSquareWorldPos(selectedTile.x, selectedTile.y);
      const h = getWorldTerrainHeight(pos.x, pos.z);
      t.selectionBox.position.set(pos.x, h + 0.35, pos.z);
      t.selectionBox.visible = true;
      t.controls.target.set(pos.x, h, pos.z);
    } else {
      t.selectionBox.visible = false;
    }
  }, [selectedTile]);

  // Synchronize 3D Marching Squads moving across flat connected squares
  useEffect(() => {
    const t = threeRef.current;
    if (!t) return;

    const currentMarchIds = new Set(marches.map((m) => m.id));

    t.marchMeshes.forEach((mesh, id) => {
      if (!currentMarchIds.has(id)) {
        t.scene.remove(mesh);
        disposeHierarchy(mesh);
        t.marchMeshes.delete(id);
      }
    });

    marches.forEach((march) => {
      const p1 = getSquareWorldPos(march.sourceCoords.x, march.sourceCoords.y);
      const p2 = getSquareWorldPos(march.targetCoords.x, march.targetCoords.y);

      const currX = p1.x + (p2.x - p1.x) * march.progress;
      const currZ = p1.z + (p2.z - p1.z) * march.progress;

      const currY = getWorldTerrainHeight(currX, currZ) + 0.18;
      const targetY = getWorldTerrainHeight(p2.x, p2.z) + 0.18;

      let squad = t.marchMeshes.get(march.id);
      if (!squad) {
        squad = buildMarchSquadActor(march);
        t.scene.add(squad);
        t.marchMeshes.set(march.id, squad);
      }

      squad.position.set(currX, currY, currZ);
      squad.lookAt(p2.x, targetY, p2.z);
    });
  }, [marches]);

  // Raycaster click / pointer interaction
  const handlePointerClick = (e: React.PointerEvent<HTMLDivElement>) => {
    const t = threeRef.current;
    if (!t) return;

    const rect = e.currentTarget.getBoundingClientRect();
    t.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    t.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    t.raycaster.setFromCamera(t.mouse, t.camera);

    const interactables: THREE.Object3D[] = [];
    t.tileMeshes.forEach((group) => {
      group.children.forEach((c) => interactables.push(c));
    });

    const intersects = t.raycaster.intersectObjects(interactables, false);

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.userData?.tileData) {
        obj = obj.parent;
      }

      if (obj && obj.userData?.tileData) {
        sound.playClick(680);
        setSelectedTile(obj.userData.tileData as WorldTile);
      }
    }
  };

  // Raycaster hover interaction
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const t = threeRef.current;
    if (!t) return;

    const rect = e.currentTarget.getBoundingClientRect();
    t.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    t.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    t.raycaster.setFromCamera(t.mouse, t.camera);

    const interactables: THREE.Object3D[] = [];
    t.tileMeshes.forEach((group) => {
      group.children.forEach((c) => interactables.push(c));
    });

    const intersects = t.raycaster.intersectObjects(interactables, false);

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.userData?.tileData) {
        obj = obj.parent;
      }

      if (obj && obj.userData?.tileData) {
        const hovered = obj.userData.tileData as WorldTile;
        setHoveredTile(hovered);
        const pos = getSquareWorldPos(hovered.x, hovered.y);
        const h = getWorldTerrainHeight(pos.x, pos.z);
        t.hoverBox.position.set(pos.x, h + 0.3, pos.z);
        t.hoverBox.visible = true;
        return;
      }
    }

    t.hoverBox.visible = false;
    setHoveredTile(null);
  };

  // Camera presets
  const handleSetCameraPreset = (preset: 'tactical' | 'topdown' | 'cinematic') => {
    const t = threeRef.current;
    if (!t) return;
    sound.playClick();
    setViewPreset(preset);

    if (preset === 'topdown') {
      t.camera.position.set(0, 122, 0.1);
      t.controls.target.set(0, 0, 0);
    } else if (preset === 'cinematic') {
      t.camera.position.set(42, 33, 58);
      t.controls.target.set(0, 2, 0);
    } else {
      t.camera.position.set(0, 64, 84);
      t.controls.target.set(0, 2, 0);
    }
  };

  const handleCenterCitadel = () => {
    const t = threeRef.current;
    if (!t) return;
    sound.playClick();
    const playerCitadel = tiles.find((x) => x.type === 'player_citadel') || tiles[0];
    const pos = getSquareWorldPos(playerCitadel.x, playerCitadel.y);
    t.controls.target.set(pos.x, 0, pos.z);
    t.camera.position.set(pos.x, 50, pos.z + 55);
    setSelectedTile(playerCitadel);
  };

  const handleFocusQuarry = () => {
    const t = threeRef.current;
    if (!t) return;
    sound.playClick();
    const quarryTile = tiles.find((x) => x.type === 'stone_quarry' && x.x <= 4 && x.y <= 4) || tiles.find(x => x.type === 'stone_quarry') || tiles[0];
    const pos = getSquareWorldPos(quarryTile.x, quarryTile.y);
    t.controls.target.set(pos.x, 0, pos.z);
    t.camera.position.set(pos.x + 14, 20, pos.z + 18);
    setSelectedTile(quarryTile);
  };

  const handleOpenDispatch = () => {
    if (!selectedTile) return;
    sound.playClick();
    setIsDispatchModalOpen(true);
  };

  const handleConfirmDispatch = (action: 'attack' | 'capture' | 'reinforce' | 'scout') => {
    if (!selectedTile || lineupPoints.isOverBudget) return;
    sound.playDrum();

    const lineupCards = [
      selectedCommander,
      ...(selectedBattalionCard ? [selectedBattalionCard] : []),
      ...(selectedSupportCard ? [selectedSupportCard] : []),
    ];

    onDispatchMarch(
      selectedCommanderId,
      selectedTile.id,
      selectedTroopType,
      troopCount,
      action,
      lineupCards,
      selectedFormation
    );
    setIsDispatchModalOpen(false);
  };

  const adjacentToPlayer = selectedTile ? isAdjacentToPlayer(selectedTile) : false;

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] pt-14 pb-16 overflow-hidden bg-slate-950 select-none">
      {/* 3D WebGL Canvas for Flat Connected Grid */}
      <div
        ref={mountRef}
        onPointerUp={handlePointerClick}
        onPointerMove={handlePointerMove}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none relative"
      />

      {/* Camera & Tactical View Controls (Top Right) */}
      <div className="absolute top-18 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleCenterCitadel}
          className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-amber-400 flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
          title="Center 3D Citadel"
        >
          <Flag className="w-5 h-5" />
        </button>

        <button
          onClick={handleFocusQuarry}
          className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-amber-300 flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
          title="Inspect Detailed Stone Quarry"
        >
          <Pickaxe className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleSetCameraPreset('tactical')}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer ${
            viewPreset === 'tactical'
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
              : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:bg-slate-800'
          }`}
          title="3D Tactical View"
        >
          <Camera className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleSetCameraPreset('topdown')}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer ${
            viewPreset === 'topdown'
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
              : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:bg-slate-800'
          }`}
          title="Orthogonal Top-Down Strategic Map"
        >
          <Grid className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleSetCameraPreset('cinematic')}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer ${
            viewPreset === 'cinematic'
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
              : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:bg-slate-800'
          }`}
          title="Cinematic Low-Angle View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Active Marching Armies & Sol Heights 3D Asset Status (Top Left) */}
      <div className="absolute top-18 left-4 z-20 flex flex-col gap-2 max-w-xs">
        {/* Sol Heights Realism & Asset Status */}
        <div className="bg-slate-900/90 border border-amber-500/50 rounded-xl px-3 py-1.5 shadow-xl backdrop-blur-md flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${assetStatus.loaded ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
            <span className="font-bold text-amber-400">Shattered Realm:</span>
            <span className="text-slate-200 text-[11px] font-semibold">3D GLB Landscape</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
            {assetStatus.loaded ? `${assetStatus.loadedAssets}/${assetStatus.totalAssets} PBR GLB` : 'Loading...'}
          </span>
        </div>

        {assetStatus.failedAssets.length > 0 && (
          <div className="bg-amber-950/90 border border-amber-500/50 text-amber-300 rounded-xl p-2 text-[10px]">
            Notice: Procedural fallback active for {assetStatus.failedAssets.join(', ')}
          </div>
        )}

        {marches.length > 0 && (
          <div className="bg-slate-900/95 border border-amber-500/50 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5" />
                Active Expeditions ({marches.length})
              </span>
              <span className="text-[10px] text-slate-400 font-mono-nums">Real-time</span>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {marches.map((m) => {
                const target = tiles.find((t) => t.id === m.targetTileId);
                return (
                  <div key={m.id} className="bg-slate-950/80 p-2 rounded-xl border border-slate-800 text-[11px]">
                    <div className="flex justify-between items-center font-semibold text-slate-200">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{m.commander.name} ({m.troopCount.toLocaleString()} {m.troopType})</span>
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase font-mono shrink-0 ${
                          m.formation === 'aggressive' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          m.formation === 'defensive' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' :
                          'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {m.formation || 'balanced'}
                        </span>
                      </div>
                      <span className="text-amber-400 font-mono-nums shrink-0">{Math.round(m.progress * 100)}%</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mb-1">
                      Marching to: <span className="text-slate-300">{target?.name || 'Frontier'}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-200"
                        style={{ width: `${m.progress * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Tile Action Sheet (Bottom Floating Dock) */}
      <div className="absolute bottom-20 left-4 right-4 z-20 max-w-md mx-auto pointer-events-auto">
        {selectedTile ? (
          <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Grid className="w-4 h-4" />
                </span>
                <div className="overflow-hidden">
                  <h4 className="text-sm font-bold text-slate-100 truncate">{selectedTile.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono-nums">
                    Sector [{selectedTile.x}, {selectedTile.y}] · Level {selectedTile.level}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTile(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 my-2.5 text-xs">
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Sovereignty</span>
                <strong className="text-slate-200 font-semibold capitalize">{selectedTile.owner}</strong>
                <div className="text-[10px] text-slate-400 font-mono-nums truncate">
                  {selectedTile.ownerName || 'Unclaimed Wilds'}
                </div>
              </div>

              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Garrison Power</span>
                <strong className="text-amber-300 font-mono-nums font-bold">
                  ⚔ {selectedTile.garrisonPower.toLocaleString()}
                </strong>
                <div className="text-[10px] text-slate-400 font-mono-nums">
                  {selectedTile.garrisonTroops.toLocaleString()} Troops
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {selectedTile.owner === 'player' ? (
                <button
                  onClick={() => {
                    sound.playClick();
                    handleOpenDispatch();
                  }}
                  className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  <span>Reinforce Garrison</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={handleOpenDispatch}
                    className="flex-1 py-2.5 px-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Swords className="w-4 h-4" />
                    <span>
                      {selectedTile.type === 'monster_lair'
                        ? 'Raid Monster Den'
                        : adjacentToPlayer
                        ? 'Conquer Frontier Square'
                        : 'Dispatch March Army'}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      sound.playClick(800);
                      setScoutedTile(selectedTile);
                      setIsScoutModalOpen(true);
                    }}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1 border border-slate-700 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">Scout</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl text-center text-xs text-slate-400">
            <span>3D Flat Connected World Map · Click or tap any connected square to conquer. Enforces 15-Point Lineups & 9,999 Base Troop Cap.</span>
          </div>
        )}
      </div>

      {/* In-App Scout Reconnaissance Modal */}
      {isScoutModalOpen && scoutedTile && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-slate-100">Scout Reconnaissance</h3>
              </div>
              <button
                onClick={() => setIsScoutModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="my-3 space-y-2 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Target Name</span>
                <strong className="text-amber-400 text-sm">{scoutedTile.name}</strong>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px]">Fortress Defense</span>
                  <strong className="text-slate-200">⚔ {scoutedTile.garrisonPower.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Enemy Garrison</span>
                  <strong className="text-slate-200">{scoutedTile.garrisonTroops.toLocaleString()} Troops</strong>
                </div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Tactical Recommendation</span>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  Deploy at least <strong className="text-amber-300 font-mono-nums">{Math.floor(scoutedTile.garrisonPower * 1.15).toLocaleString()}</strong> combat power with a high-Intel commander to overcome garrison fortification.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsScoutModalOpen(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl"
            >
              Close Intel Report
            </button>
          </div>
        </div>
      )}

      {/* Modal: 15-Point Tactical Lineup & March Dispatcher */}
      {isDispatchModalOpen && selectedTile && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl animate-in fade-in zoom-in-95 my-auto max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Swords className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Tactical Lineup & March Dispatch</h3>
                  <p className="text-[10px] text-slate-400 font-mono-nums">
                    Max 15 Points Budget · Base 9,999 Troop Cap + Intel/Research Scaling
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Brief */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 my-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Target Objective</span>
                <div className="text-sm font-bold text-amber-300">{selectedTile.name}</div>
                <div className="text-[10px] text-slate-400 capitalize">Owner: {selectedTile.owner}</div>
              </div>
              <div className="text-right font-mono-nums">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Garrison Power</span>
                <div className="text-sm font-bold text-rose-400">⚔ {selectedTile.garrisonPower.toLocaleString()}</div>
                <div className="text-[10px] text-slate-400">{selectedTile.garrisonTroops.toLocaleString()} troops</div>
              </div>
            </div>

            {/* 15-POINT LINEUP BUDGET METER */}
            <div className={`p-3 rounded-2xl border mb-3 transition-colors ${
              lineupPoints.isOverBudget 
                ? 'bg-rose-950/40 border-rose-500/80 ring-1 ring-rose-500' 
                : 'bg-slate-950 border-amber-500/40'
            }`}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold flex items-center gap-1.5 text-slate-200">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Lineup Cost Budget
                </span>
                <span className={`font-mono-nums font-bold text-xs ${
                  lineupPoints.isOverBudget ? 'text-rose-400' : 'text-amber-300'
                }`}>
                  {lineupPoints.totalPoints} / {MAX_LINEUP_POINTS} Points
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    lineupPoints.isOverBudget
                      ? 'bg-rose-500'
                      : lineupPoints.totalPoints >= 13
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, (lineupPoints.totalPoints / MAX_LINEUP_POINTS) * 100)}%` }}
                />
              </div>
              {lineupPoints.isOverBudget ? (
                <div className="flex items-center gap-1.5 text-[11px] text-rose-300 font-semibold mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Cost exceeds 15 points limit! Deselect a card to launch march.</span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono-nums">
                  <span>{lineupPoints.remainingPoints} budget points available</span>
                  <span className="text-emerald-400">✓ Valid Formation</span>
                </div>
              )}
            </div>

            {/* SLOT 1: COMMANDER HERO (COST + INTEL FACTOR) */}
            <div className="my-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] flex items-center justify-center font-mono font-bold">1</span>
                  Commander Hero (Slot 1)
                </label>
                <span className="text-[10px] text-amber-400 font-mono-nums">
                  Cost: {selectedCommander.cost} Pts · INT: {selectedCommander.intel}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                {cards.map((card) => {
                  const isHeroActive = selectedCommanderId === card.id;
                  return (
                    <button
                      key={card.id}
                      onClick={() => {
                        sound.playClick();
                        setSelectedCommanderId(card.id);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left cursor-pointer ${
                        isHeroActive
                          ? 'bg-amber-950/60 border-amber-500 ring-1 ring-amber-500'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <img
                        src={card.image}
                        alt={card.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0"
                      />
                      <div className="overflow-hidden flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-100 truncate">{card.name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 font-mono">
                            {card.cost}p
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono-nums flex items-center gap-1">
                          <span>INT {card.intel}</span>
                          <span>·</span>
                          <span className="text-amber-400">⚔{card.atk}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SLOT 2: VANGUARD BATTALION CARD */}
            <div className="my-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] flex items-center justify-center font-mono font-bold">2</span>
                  Vanguard Battalion Card (Slot 2)
                </label>
                <span className="text-[10px] text-slate-400 font-mono-nums">
                  Cost: {selectedBattalionCard?.cost || 0} Pts
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {unitCards.map((unitCard) => {
                  const isActive = selectedBattalionCardId === unitCard.id;
                  return (
                    <button
                      key={unitCard.id}
                      onClick={() => {
                        sound.playClick();
                        setSelectedBattalionCardId(isActive ? null : unitCard.id);
                        if (!isActive) {
                          setSelectedTroopType(unitCard.targetUnitType === 'all' ? 'legionnaire' : unitCard.targetUnitType);
                        }
                      }}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                        isActive
                          ? 'bg-amber-950/60 border-amber-500 ring-1 ring-amber-500'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-slate-100 truncate">{unitCard.name}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300 font-mono">
                          {unitCard.cost}p
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-400 font-mono-nums">
                        +{unitCard.bonusAtkPercent}% ATK · Musters +{unitCard.troopGeneration.yieldPerCycle}/cyc
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SLOT 3: TACTICAL SUPPORT CARD (OPTIONAL) */}
            <div className="my-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] flex items-center justify-center font-mono font-bold">3</span>
                  Support Unit Card (Slot 3 - Optional)
                </label>
                <span className="text-[10px] text-slate-400 font-mono-nums">
                  {selectedSupportCard ? `Cost: ${selectedSupportCard.cost} Pts` : 'None equipped'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    sound.playClick();
                    setSelectedSupportCardId(null);
                  }}
                  className={`p-2 rounded-xl border text-center text-xs font-semibold cursor-pointer ${
                    selectedSupportCardId === null
                      ? 'bg-slate-800 border-slate-600 text-slate-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Empty Slot
                </button>
                {unitCards.filter((u) => u.id !== selectedBattalionCardId).map((unitCard) => {
                  const isActive = selectedSupportCardId === unitCard.id;
                  return (
                    <button
                      key={unitCard.id}
                      onClick={() => {
                        sound.playClick();
                        setSelectedSupportCardId(unitCard.id);
                      }}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                        isActive
                          ? 'bg-amber-950/60 border-amber-500 ring-1 ring-amber-500'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[11px] font-bold text-slate-200 truncate">{unitCard.name}</div>
                      <div className="text-[9px] text-sky-400 font-mono-nums">{unitCard.cost} Points</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TROOP CAPACITY SYSTEM (9,999 BASE CAP + INTEL + RESEARCH + SKILLS) */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 my-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-sky-400" />
                  Lineup Troop Capacity Breakdown
                </span>
                <span className="text-xs font-bold text-amber-300 font-mono-nums">
                  Max {troopCapacity.totalCap.toLocaleString()} Troops
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono-nums">
                <div className="bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">Base Hard Cap</span>
                  <strong className="text-slate-200 font-bold">{BASE_TROOP_CAP.toLocaleString()}</strong>
                </div>

                <div className="bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
                  <span className="text-sky-400 block text-[9px] flex items-center justify-center gap-0.5">
                    <Brain className="w-2.5 h-2.5" /> Intel Factor
                  </span>
                  <strong className="text-sky-300 font-bold">+{troopCapacity.intelBonus.toLocaleString()}</strong>
                </div>

                <div className="bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
                  <span className="text-purple-400 block text-[9px] flex items-center justify-center gap-0.5">
                    <GraduationCap className="w-2.5 h-2.5" /> Academy
                  </span>
                  <strong className="text-purple-300 font-bold">+{troopCapacity.researchBonus.toLocaleString()}</strong>
                </div>

                <div className="bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
                  <span className="text-amber-400 block text-[9px] flex items-center justify-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> Skills Aura
                  </span>
                  <strong className="text-amber-300 font-bold">+{troopCapacity.skillBonus.toLocaleString()}</strong>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 mt-2 text-center">
                Commander INT ({selectedCommander.intel}) & Academy research expand troop command above standard 9,999 ceiling.
              </div>
            </div>

            {/* VISUAL TROOP FORMATION STANCE SELECTOR */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 my-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-amber-400" />
                  Tactical Troop Formation Stance
                </label>
                <span className="text-[10px] text-slate-400 font-mono-nums">
                  Active Stance: <strong className={`capitalize ${
                    selectedFormation === 'aggressive' ? 'text-rose-400' :
                    selectedFormation === 'defensive' ? 'text-sky-400' :
                    'text-amber-300'
                  }`}>{selectedFormation}</strong>
                </span>
              </div>

              {/* 3 Interactive Stance Cards */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {/* Aggressive Stance */}
                <button
                  type="button"
                  onClick={() => {
                    sound.playClash();
                    setSelectedFormation('aggressive');
                  }}
                  className={`p-2.5 rounded-2xl border text-left cursor-pointer transition-all ${
                    selectedFormation === 'aggressive'
                      ? 'bg-rose-950/60 border-rose-500 ring-2 ring-rose-500 shadow-lg shadow-rose-950/50'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-rose-300 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                      Aggressive
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-rose-500/20 text-rose-300">
                      Wedge
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-200 font-semibold truncate">
                    V-Spearhead Rush
                  </div>
                  <div className="text-[9px] text-rose-400 font-mono-nums mt-1 space-y-0.5">
                    <div>⚔ +25% Power</div>
                    <div>⚡ +20% Speed</div>
                    <div className="text-slate-500">🛡 -10% Defense</div>
                  </div>
                </button>

                {/* Balanced Stance */}
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setSelectedFormation('balanced');
                  }}
                  className={`p-2.5 rounded-2xl border text-left cursor-pointer transition-all ${
                    selectedFormation === 'balanced'
                      ? 'bg-amber-950/60 border-amber-500 ring-2 ring-amber-500 shadow-lg shadow-amber-950/50'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                      <Swords className="w-3.5 h-3.5 text-amber-400" />
                      Balanced
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/20 text-amber-300">
                      Cohort
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-200 font-semibold truncate">
                    Dual-Rank Ranks
                  </div>
                  <div className="text-[9px] text-amber-400 font-mono-nums mt-1 space-y-0.5">
                    <div>⚔ +8% Power</div>
                    <div>🛡 +8% Defense</div>
                    <div className="text-slate-400">⚡ Normal Speed</div>
                  </div>
                </button>

                {/* Defensive Stance */}
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(400);
                    setSelectedFormation('defensive');
                  }}
                  className={`p-2.5 rounded-2xl border text-left cursor-pointer transition-all ${
                    selectedFormation === 'defensive'
                      ? 'bg-sky-950/60 border-sky-500 ring-2 ring-sky-500 shadow-lg shadow-sky-950/50'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-sky-300 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-sky-400" />
                      Defensive
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-sky-500/20 text-sky-300">
                      Phalanx
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-200 font-semibold truncate">
                    Turtle Shieldwall
                  </div>
                  <div className="text-[9px] text-sky-400 font-mono-nums mt-1 space-y-0.5">
                    <div>🛡 +30% Defense</div>
                    <div>🛡 -35% Casualties</div>
                    <div className="text-slate-500">⚡ -12% Speed</div>
                  </div>
                </button>
              </div>

              {/* Tactical Visual Formation Preview Radar / Diagram */}
              <div className="bg-slate-900/90 rounded-2xl p-2.5 border border-slate-800 flex items-center gap-3">
                {/* 5x5 Mini Formation Field */}
                <div className="w-24 h-24 bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden shrink-0 flex items-center justify-center p-1">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 pointer-events-none opacity-20">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} className="border border-slate-700" />
                    ))}
                  </div>

                  {/* Directional March Arrow at top */}
                  <div className="absolute top-1 text-[8px] font-bold tracking-widest text-slate-500 flex items-center gap-0.5">
                    <span>▲</span> FRONT <span>▲</span>
                  </div>

                  {/* Animated Formation Pawns Layout */}
                  {selectedFormation === 'aggressive' && (
                    <div className="relative w-full h-full flex flex-col items-center justify-center pt-2">
                      {/* Spearhead point */}
                      <div className="w-3 h-3 rounded-full bg-rose-500 shadow-md shadow-rose-500/80 ring-2 ring-rose-300 animate-pulse" />
                      {/* Flank row */}
                      <div className="flex gap-4 my-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      </div>
                      {/* Rear wings */}
                      <div className="flex gap-7">
                        <div className="w-2 h-2 rounded-full bg-rose-300" />
                        <div className="w-2 h-2 rounded-full bg-rose-300" />
                      </div>
                    </div>
                  )}

                  {selectedFormation === 'balanced' && (
                    <div className="relative w-full h-full flex flex-col items-center justify-center pt-3 gap-2.5">
                      {/* Front Rank */}
                      <div className="flex gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-1 ring-amber-300" />
                        <div className="w-3 h-3 rounded-full bg-amber-300 shadow-md shadow-amber-500/60 ring-2 ring-amber-200" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-1 ring-amber-300" />
                      </div>
                      {/* Support Rank */}
                      <div className="flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-amber-500/80" />
                        <div className="w-2 h-2 rounded-full bg-amber-500/80" />
                        <div className="w-2 h-2 rounded-full bg-amber-500/80" />
                      </div>
                    </div>
                  )}

                  {selectedFormation === 'defensive' && (
                    <div className="relative w-full h-full flex items-center justify-center pt-2">
                      {/* Outer Shieldwall Ring */}
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-sky-400/80 bg-sky-500/10 flex items-center justify-center animate-pulse">
                        {/* 4 Corner Clustered Phalanx Pawns */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-sky-300 shadow-sm shadow-sky-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-sky-300 shadow-sm shadow-sky-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-sky-300 shadow-sm shadow-sky-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-sky-300 shadow-sm shadow-sky-400" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stance Tactical Description */}
                <div className="flex-1 text-[11px] leading-tight">
                  <div className="font-bold text-slate-100 flex items-center gap-1.5 mb-1">
                    <span className="capitalize">{selectedFormation} Stance Deployment</span>
                    {selectedFormation === 'aggressive' && <span className="text-rose-400 font-mono text-[10px]">Shock Doctrine</span>}
                    {selectedFormation === 'balanced' && <span className="text-amber-400 font-mono text-[10px]">Standard Doctrine</span>}
                    {selectedFormation === 'defensive' && <span className="text-sky-400 font-mono text-[10px]">Fortress Doctrine</span>}
                  </div>
                  <p className="text-slate-400 text-[10px]">
                    {selectedFormation === 'aggressive' && 'Frontline spearhead forces deep wedge penetration to fracture garrison defenses and seize critical structures quickly.'}
                    {selectedFormation === 'balanced' && 'Disciplined dual ranks offering steady cohesion, balanced offensive output, and reliable defense against counter-flanking.'}
                    {selectedFormation === 'defensive' && 'Interlocking tower shields and lowered pikes form an impenetrable phalanx, cutting casualties by 35% when assaulting fortified titans.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Troop Deployment Type and Count */}
            <div className="my-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-200">Deploy Troop Type</label>
                <div className="text-[10px] text-slate-400 font-mono-nums flex items-center gap-2">
                  <span className="text-amber-300 font-semibold">Commander Vanguard: {commanderStandingTroops}</span>
                  <span>·</span>
                  <span>Trained Reserves: {barracksReserveCount}</span>
                </div>
              </div>

              {/* Informational Guidance on Troop Training and 100 Initial Troops */}
              <div className="mb-2 p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-300 flex items-center justify-between">
                <span>⚔ Commander begins with 100 vanguard troops until sent into battle. Additional battalions must be trained in the Barracks.</span>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3">
                {troops.map((unit) => {
                  const isActive = selectedTroopType === unit.type;
                  return (
                    <button
                      key={unit.id}
                      onClick={() => {
                        sound.playClick();
                        setSelectedTroopType(unit.type);
                      }}
                      className={`p-2 rounded-xl border text-center cursor-pointer transition-all ${
                        isActive
                          ? 'bg-amber-950/60 border-amber-500 ring-1 ring-amber-500'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-200 capitalize">{unit.type}</div>
                      <div className="text-[10px] text-slate-400 font-mono-nums">Trained: {unit.count.toLocaleString()}</div>
                    </button>
                  );
                })}
              </div>

              {/* Slider & Quick Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono-nums">
                  <span className="text-slate-400">Troops Assigned to March:</span>
                  <span className="font-bold text-amber-300 tabular-nums text-sm">
                    {troopCount.toLocaleString()} / {deployableLimit.toLocaleString()}
                  </span>
                </div>

                {deployableLimit > 0 ? (
                  <>
                    <input
                      type="range"
                      min={1}
                      max={deployableLimit}
                      step={deployableLimit > 200 ? 10 : 1}
                      value={troopCount}
                      onChange={(e) => setTroopCount(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />

                    {/* Quick preset buttons */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: '10 Troops', count: Math.min(10, deployableLimit) },
                        { label: '50 Troops', count: Math.min(50, deployableLimit) },
                        { label: '100 Troops', count: Math.min(100, deployableLimit) },
                        { label: 'MAX', count: deployableLimit },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => {
                            sound.playClick(600);
                            setTroopCount(preset.count);
                          }}
                          className="py-1 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono-nums text-slate-300 transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-2 text-xs text-rose-400 bg-rose-950/30 rounded-xl border border-rose-900/50">
                    No troops currently ready for battle! Train recruits in the Citadel Barracks.
                  </div>
                )}
              </div>
            </div>

            {/* Launch Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={lineupPoints.isOverBudget || deployableLimit === 0}
                onClick={() => handleConfirmDispatch('attack')}
                className={`flex-2 py-3 font-bold text-xs rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  lineupPoints.isOverBudget || deployableLimit === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 shadow-amber-500/20'
                }`}
              >
                <Send className="w-4 h-4 fill-current" />
                <span>
                  {lineupPoints.isOverBudget 
                    ? 'Budget Exceeded (Max 15 Pts)' 
                    : 'Launch Imperial March'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
