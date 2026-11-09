/**
 * Kingdom Conquest III - LocalStorage Persistence Engine
 * Saves and loads all sovereign empire progress, username, resources, cards, creatures, and map state.
 */

import { 
  Building, 
  CommanderCard, 
  UnitUpgradeCard, 
  EconomicCard, 
  CardSkill, 
  WorldTile, 
  MarchingArmy, 
  TroopUnit, 
  ResearchTech, 
  DiplomaticFaction, 
  WorldEvent, 
  MarketItem, 
  CampaignMission, 
  LeaderboardEntry,
  CreatureCard
} from './types';

const STORAGE_KEY = 'kc3_sovereign_save_v6';

export interface GameSaveData {
  username: string;
  hasCompletedOnboarding: boolean;
  resources: {
    food: number;
    timber: number;
    stone: number;
    iron: number;
    mana: number;
    gold: number;
    rubies: number;
  };
  productionRates: {
    food: number;
    timber: number;
    stone: number;
    iron: number;
    mana: number;
  };
  worldTiles: WorldTile[];
  marches: MarchingArmy[];
  buildings: Building[];
  troops: TroopUnit[];
  techs: ResearchTech[];
  cards: CommanderCard[];
  unitCards: UnitUpgradeCard[];
  economicCards: EconomicCard[];
  skills: CardSkill[];
  creatures: CreatureCard[];
  factions: DiplomaticFaction[];
  worldEvents: WorldEvent[];
  marketItems: MarketItem[];
  campaignMissions: CampaignMission[];
  leaderboard: LeaderboardEntry[];
  playerLevel: number;
  claimedQuestIds?: string[];
}

export function saveGameData(data: GameSaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save game data to localStorage', err);
  }
}

export function loadGameData(): GameSaveData | null {
  try {
    // Try loading v6 first
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Try migrating from v5 if present
      const v5Raw = localStorage.getItem('kc3_sovereign_save_v5');
      if (v5Raw) {
        const v5Data = JSON.parse(v5Raw);
        v5Data.creatures = v5Data.creatures || [];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(v5Data));
        raw = JSON.stringify(v5Data);
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameSaveData;
    if (!parsed.creatures) parsed.creatures = [];
    if (!parsed.claimedQuestIds) parsed.claimedQuestIds = [];
    return parsed;
  } catch (err) {
    console.error('Failed to load game data from localStorage', err);
    return null;
  }
}

export function clearGameData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('kc3_sovereign_save_v5');
  } catch (err) {
    console.error('Failed to clear game data', err);
  }
}
