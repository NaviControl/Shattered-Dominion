/**
 * Kingdom Conquest III - Domain Models & Types
 */

export type ElementAffinity = 'sol' | 'ignis' | 'void' | 'gaia' | 'frost';
export type CardRarity = 'uncommon' | 'rare' | 'epic' | 'legendary';
export type CardCategory = 'commander' | 'unit_upgrade' | 'hero_ability' | 'economic_boost';
export type BiomeType = 'sol_heights' | 'ignis_caldera' | 'frost_wastes' | 'abyssal_marshes';

export interface CardSkill {
  id: string;
  name: string;
  type: 'active' | 'passive';
  element: ElementAffinity;
  level: number;
  maxLevel: number;
  cooldown: number; // in seconds
  description: string;
  damageMultiplier?: number;
  effect: string;
  synergyTags: string[];
  troopCapBonus?: number; // Skills increasing troop numbers
}

export interface CommanderCard {
  id: string;
  name: string;
  title: string;
  cost: number; // Lineup Cost Point (e.g., 3-7 pts)
  rarity: CardRarity;
  element: ElementAffinity;
  level: number;
  maxLevel: number;
  stars: number;
  exp: number;
  maxExp: number;
  atk: number;
  def: number;
  spd: number;
  intel: number; // Intelligence factor scaling troop capacity above 9999!
  troopCapacity: number;
  currentTroops: number; // Standing troops assigned to commander (begins at 100 until sent into battle)
  troopGeneration: {
    troopType: 'legionnaire' | 'archer' | 'gryphon' | 'catapult';
    yieldPerCycle: number;
  };
  image: string;
  signatureSkill: CardSkill;
  equippedSkills: (CardSkill | null)[];
  bio: string;
  category?: 'commander';
}

export interface UnitUpgradeCard {
  id: string;
  name: string;
  cost: number; // Lineup Cost Point (e.g., 2-5 pts)
  category: 'unit_upgrade';
  rarity: CardRarity;
  targetUnitType: 'legionnaire' | 'archer' | 'gryphon' | 'catapult' | 'all';
  bonusAtkPercent: number;
  bonusDefPercent: number;
  bonusSpeedPercent: number;
  specialPerk: string;
  troopGeneration: {
    troopType: 'legionnaire' | 'archer' | 'gryphon' | 'catapult';
    yieldPerCycle: number;
  };
  image: string;
  description: string;
  level: number;
  isEquipped: boolean;
}

export interface EconomicCard {
  id: string;
  name: string;
  cost?: number;
  category: 'economic_boost';
  rarity: CardRarity;
  doctrineCategory: 'agriculture' | 'military_logistics' | 'arcane_trade' | 'civil_engineering';
  productionBoost: {
    food?: number;
    timber?: number;
    stone?: number;
    iron?: number;
    mana?: number;
    gold?: number;
  };
  marchSpeedBoost?: number;
  combatPowerBoost?: number;
  image: string;
  description: string;
  isCouncilActive: boolean;
}

export interface LineupDeck {
  id: string;
  name: string;
  slots: (CommanderCard | UnitUpgradeCard | null)[];
  totalPoints: number; // Maximum 15 points
  baseCap: number; // 9999 Max prior to skills, intelligence, research
  intBonus: number;
  researchBonus: number;
  skillBonus: number;
  effectiveTroopCap: number;
}

export type CreatureRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythical';
export type CreatureFamily = 'Dragons' | 'Undead' | 'Elementals' | 'Demons' | 'Beasts' | 'Celestials' | 'Swarmkin' | 'Abyssals' | 'Humanoids' | 'Giants' | 'Fae' | 'Mechanicals';
export type CreatureElement = 'Fire' | 'Water' | 'Earth' | 'Wind' | 'Lightning' | 'Frost' | 'Nature' | 'Shadow' | 'Light' | 'Arcane' | 'Poison' | 'Void';

export interface CreatureCard {
  id: string; // e.g. SD-0001
  name: string;
  family: CreatureFamily;
  element: CreatureElement;
  rarity: CreatureRarity;
  tier: number;
  combatRole: string;
  archetype: string;
  signatureAbility: string;
  familySpecialty: string;
  singlePullChance: number;
  level: number;
  maxLevel: number;
  stars: number;
  exp: number;
  maxExp: number;
  atk: number;
  def: number;
  spd: number;
  isEquipped?: boolean;
  image?: string;
}

export type AnyGameCard = CommanderCard | UnitUpgradeCard | EconomicCard | CardSkill | CreatureCard;

export type TileType = 
  | 'player_citadel'
  | 'alliance_outpost'
  | 'farmland'
  | 'lumber_mill'
  | 'stone_quarry'
  | 'iron_vein'
  | 'mana_monolith'
  | 'monster_lair'
  | 'ancient_ruin'
  | 'rival_citadel'
  | 'mythical_tower';

export interface WorldTile {
  id: string;
  q: number; // Hex axial coordinate q
  r: number; // Hex axial coordinate r
  x: number; // screen/grid x
  y: number; // screen/grid y
  type: TileType;
  name: string;
  level: number;
  owner: 'player' | 'alliance' | 'neutral' | 'rival';
  ownerName?: string;
  biome?: BiomeType;
  garrisonPower: number;
  garrisonTroops: number;
  resourceYield?: {
    food?: number;
    timber?: number;
    stone?: number;
    iron?: number;
    mana?: number;
  };
  monsterType?: string;
  capturedAt?: number;
  exclusiveCardDrop?: string; // ID of card reward on first conquest
}

export type TroopFormation = 'aggressive' | 'defensive' | 'balanced';

export interface MarchingArmy {
  id: string;
  commander: CommanderCard;
  lineupCards?: (CommanderCard | UnitUpgradeCard)[];
  formation?: TroopFormation;
  totalLineupPoints?: number;
  effectiveTroopCap?: number;
  troopType: 'legionnaire' | 'archer' | 'gryphon' | 'catapult';
  troopCount: number;
  sourceTileId: string;
  targetTileId: string;
  sourceCoords: { x: number; y: number };
  targetCoords: { x: number; y: number };
  currentCoords: { x: number; y: number };
  action: 'attack' | 'capture' | 'reinforce' | 'scout';
  startTime: number;
  duration: number; // ms
  arriveTime: number;
  progress: number; // 0 to 1
  completed: boolean;
}

export interface Building {
  id: string;
  name: string;
  type: 'keep' | 'barracks' | 'archery' | 'lab' | 'farm' | 'mill' | 'quarry' | 'forge' | 'spire' | 'walls';
  level: number;
  maxLevel: number;
  description: string;
  upgradeCost: {
    food: number;
    timber: number;
    stone: number;
    iron: number;
    gold: number;
  };
  upgradeDuration: number; // seconds
  isUpgrading: boolean;
  upgradeEndTime?: number;
  benefit: string;
}

export interface TroopUnit {
  id: string;
  name: string;
  type: 'legionnaire' | 'archer' | 'gryphon' | 'catapult';
  count: number;
  atk: number;
  def: number;
  cost: { food: number; timber: number; iron: number; gold: number };
  trainingTime: number; // seconds
  description: string;
  equippedCardId?: string;
}

export interface ResearchTech {
  id: string;
  name: string;
  category: 'military' | 'economy' | 'conquest';
  level: number;
  maxLevel: number;
  cost: { mana: number; gold: number };
  researchTime: number;
  isResearching: boolean;
  researchEndTime?: number;
  description: string;
  effect: string;
  troopCapBonus?: number; // Increases troop cap above 9999
}

export type TreatyType = 'nap' | 'coalition' | 'trade' | 'vassal' | 'war';

export interface DiplomaticFaction {
  id: string;
  name: string;
  tag: string;
  bannerColor: string;
  leader: string;
  membersCount: number;
  territoryCount: number;
  totalPower: number;
  status: 'allied' | 'neutral' | 'hostile' | 'pact';
  activeTreaty?: {
    type: TreatyType;
    signedAt: string;
    turnsRemaining: number;
  };
  attitude: number; // -100 (Hostile) to +100 (Friendly)
  description: string;
}

export interface WorldEvent {
  id: string;
  name: string;
  type: 'eclipse' | 'caravan' | 'mana_surge' | 'frost' | 'crusade';
  description: string;
  durationSeconds: number;
  timeRemaining: number;
  modifiers: {
    resourceMultiplier?: { [key: string]: number };
    troopSpeed?: number;
    dungeonExp?: number;
    marketShift?: { [key: string]: number };
  };
}

export interface MarketItem {
  id: string;
  resource: 'food' | 'timber' | 'stone' | 'iron' | 'mana';
  name: string;
  basePrice: number; // in gold
  currentPrice: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export interface CampaignMission {
  id: string;
  chapter: number;
  chapterTitle: string;
  missionNumber: number;
  title: string;
  narrativeContext: string;
  enemyCommander: string;
  enemyPower: number;
  dialogue: {
    speaker: string;
    text: string;
    avatar?: string;
  }[];
  choicePrompt?: {
    question: string;
    options: {
      text: string;
      alignment: 'noble' | 'conqueror' | 'shadow';
      rewardText: string;
      effect: () => void;
    }[];
  };
  rewards: {
    gold: number;
    rubies: number;
    cardExp: number;
    unlockedCardId?: string;
  };
  completed: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  guildTag: string;
  platform: 'iOS' | 'Android' | 'Steam' | 'Web';
  territories: number;
  trophies: number;
  winRate: string;
  avatar: string;
  isPlayer?: boolean;
}
