import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { saveGameData, loadGameData, clearGameData, GameSaveData } from '../src/game/gameStorage.ts';

// In-memory mock localStorage for Node test execution
const memoryStore: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => memoryStore[key] || null,
  setItem: (key: string, val: string) => { memoryStore[key] = val; },
  removeItem: (key: string) => { delete memoryStore[key]; },
  clear: () => {
    for (const k of Object.keys(memoryStore)) {
      delete memoryStore[k];
    }
  },
};

describe('SD-01 / Persistence Engine & Migration Invariant', () => {
  beforeEach(() => {
    (global as any).localStorage.clear();
  });

  it('saves and loads valid v6 sovereign game state with claimed quests', () => {
    const mockSave: GameSaveData = {
      username: 'Sovereign Test',
      hasCompletedOnboarding: true,
      resources: {
        food: 5000,
        timber: 4000,
        stone: 3500,
        iron: 2500,
        mana: 1500,
        gold: 3000,
        rubies: 200,
      },
      productionRates: {
        food: 10,
        timber: 8,
        stone: 6,
        iron: 4,
        mana: 3,
      },
      worldTiles: [],
      marches: [],
      buildings: [],
      troops: [],
      techs: [],
      cards: [],
      unitCards: [],
      economicCards: [],
      skills: [],
      creatures: [],
      factions: [],
      worldEvents: [],
      marketItems: [],
      campaignMissions: [],
      leaderboard: [],
      playerLevel: 3,
      claimedQuestIds: ['quest_citadel', 'quest_troops'],
    };

    saveGameData(mockSave);
    const loaded = loadGameData();
    assert.ok(loaded, 'Loaded data must not be null');
    assert.strictEqual(loaded!.username, 'Sovereign Test');
    assert.strictEqual(loaded!.playerLevel, 3);
    assert.deepStrictEqual(loaded!.claimedQuestIds, ['quest_citadel', 'quest_troops']);
  });

  it('migrates legacy v5 save data seamlessly into v6 format without data loss', () => {
    const legacyV5Data = {
      username: 'Old Sovereign',
      hasCompletedOnboarding: true,
      resources: { food: 2000, timber: 2000, stone: 2000, iron: 1000, mana: 500, gold: 1000, rubies: 50 },
      productionRates: { food: 5, timber: 4, stone: 3, iron: 2, mana: 1 },
      worldTiles: [],
      marches: [],
      buildings: [],
      troops: [],
      techs: [],
      cards: [],
      unitCards: [],
      economicCards: [],
      skills: [],
      factions: [],
      worldEvents: [],
      marketItems: [],
      campaignMissions: [],
      leaderboard: [],
      playerLevel: 1,
    };

    // Store in legacy key
    (global as any).localStorage.setItem('kc3_sovereign_save_v5', JSON.stringify(legacyV5Data));

    const loaded = loadGameData();
    assert.ok(loaded, 'Migrated data must be successfully loaded');
    assert.strictEqual(loaded!.username, 'Old Sovereign');
    assert.ok(Array.isArray(loaded!.creatures), 'Must auto-populate empty creatures array if absent in v5');
    assert.ok(Array.isArray(loaded!.claimedQuestIds), 'Must auto-populate empty claimedQuestIds array');

    // Verify it is now saved under v6 key
    const v6Raw = (global as any).localStorage.getItem('kc3_sovereign_save_v6');
    assert.ok(v6Raw, 'Must persist upgraded save to kc3_sovereign_save_v6');
  });
});
