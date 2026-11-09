import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  calculateTroopCapacity, 
  calculateLineupPoints, 
  MAX_LINEUP_POINTS, 
  BASE_TROOP_CAP 
} from '../src/game/lineupUtils.ts';
import { CommanderCard, UnitUpgradeCard } from '../src/game/types.ts';

describe('SD-04 / Combat Budget & 15-Point Lineup Invariant', () => {
  const dummyCommander: CommanderCard = {
    id: 'test_cmd_1',
    name: 'Valerius Test',
    title: 'High General',
    cost: 6,
    rarity: 'legendary',
    element: 'sol',
    level: 1,
    maxLevel: 50,
    stars: 3,
    exp: 0,
    maxExp: 1000,
    atk: 800,
    def: 700,
    spd: 500,
    intel: 1200,
    troopCapacity: 9999,
    currentTroops: 100,
    troopGeneration: { troopType: 'legionnaire', yieldPerCycle: 20 },
    image: '',
    signatureSkill: {
      id: 'sig_1',
      name: 'Test Aura',
      type: 'passive',
      element: 'sol',
      level: 1,
      maxLevel: 10,
      cooldown: 0,
      description: 'Aura',
      effect: '',
      synergyTags: [],
      troopCapBonus: 500,
    },
    equippedSkills: [],
    bio: '',
  };

  const dummyBattalion: UnitUpgradeCard = {
    id: 'test_bat_1',
    name: 'Iron Vanguard',
    cost: 4,
    category: 'unit_upgrade',
    rarity: 'rare',
    targetUnitType: 'legionnaire',
    bonusAtkPercent: 15,
    bonusDefPercent: 10,
    bonusSpeedPercent: 5,
    specialPerk: 'Shield Wall',
    troopGeneration: { troopType: 'legionnaire', yieldPerCycle: 15 },
    image: '',
    description: '',
    level: 1,
    isEquipped: true,
  };

  const dummySupport: UnitUpgradeCard = {
    id: 'test_sup_1',
    name: 'Apothecary Banner',
    cost: 4,
    category: 'unit_upgrade',
    rarity: 'epic',
    targetUnitType: 'all',
    bonusAtkPercent: 10,
    bonusDefPercent: 15,
    bonusSpeedPercent: 0,
    specialPerk: 'Heal',
    troopGeneration: { troopType: 'archer', yieldPerCycle: 10 },
    image: '',
    description: '',
    level: 1,
    isEquipped: true,
  };

  it('validates lineup budget under 15 points (6 + 4 + 4 = 14 pts)', () => {
    const budget = calculateLineupPoints(dummyCommander, dummyBattalion, dummySupport);
    assert.strictEqual(budget.totalPoints, 14);
    assert.strictEqual(budget.maxPoints, MAX_LINEUP_POINTS);
    assert.strictEqual(budget.isOverBudget, false);
    assert.strictEqual(budget.remainingPoints, 1);
  });

  it('flags over-budget when points exceed 15 (6 + 5 + 5 = 16 pts)', () => {
    const expensiveBat: UnitUpgradeCard = { ...dummyBattalion, cost: 5 };
    const expensiveSup: UnitUpgradeCard = { ...dummySupport, cost: 5 };
    const budget = calculateLineupPoints(dummyCommander, expensiveBat, expensiveSup);
    assert.strictEqual(budget.totalPoints, 16);
    assert.strictEqual(budget.isOverBudget, true);
    assert.strictEqual(budget.remainingPoints, 0);
  });

  it('calculates troop capacity starting from exact base cap of 9,999', () => {
    const breakdown = calculateTroopCapacity(dummyCommander, []);
    assert.strictEqual(breakdown.baseCap, BASE_TROOP_CAP);
    assert.strictEqual(breakdown.baseCap, 9999);
    // 1200 intel: Math.round((1200/100) * 85) = 1020
    assert.strictEqual(breakdown.intelBonus, 1020);
    // skillBonus: 500 from signatureSkill
    assert.strictEqual(breakdown.skillBonus, 500);
    assert.strictEqual(breakdown.totalCap, 9999 + 1020 + 500);
  });
});
