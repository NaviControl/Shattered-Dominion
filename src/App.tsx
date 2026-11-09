import React, { useState, useEffect, useMemo } from 'react';
import { TitleScreen } from './components/TitleScreen';
import { HUDHeader } from './components/HUDHeader';
import { BottomNav, ActiveTab } from './components/BottomNav';
import { RealmMap } from './components/RealmMap';
import { SovereignGuideModal, SovereignQuest } from './components/SovereignGuideModal';
import { Compass } from 'lucide-react';
import { CitadelBase } from './components/CitadelBase';
import { DungeonCrawler } from './components/DungeonCrawler';
import { CardDeck } from './components/CardDeck';
import { DiplomacyAlliance } from './components/DiplomacyAlliance';
import { ChroniclesAndLeaderboard } from './components/ChroniclesAndLeaderboard';
import { sound } from './game/audio';
import { 
  Building, 
  CommanderCard, 
  CardSkill, 
  UnitUpgradeCard,
  EconomicCard,
  DiplomaticFaction, 
  LeaderboardEntry, 
  MarchingArmy, 
  MarketItem, 
  ResearchTech, 
  TroopUnit, 
  WorldEvent, 
  WorldTile, 
  TreatyType,
  TroopFormation,
  CreatureCard
} from './game/types';
import { 
  INITIAL_BUILDINGS, 
  INITIAL_CARDS, 
  INITIAL_UNIT_CARDS,
  INITIAL_ECONOMIC_CARDS,
  INITIAL_FACTIONS, 
  INITIAL_LEADERBOARD, 
  INITIAL_MARKET_ITEMS, 
  INITIAL_SKILLS, 
  INITIAL_TECHS, 
  INITIAL_TROOPS, 
  INITIAL_WORLD_EVENTS, 
  CAMPAIGN_CHAPTERS 
} from './game/initialData';
import { generateWorldTiles, reconcileWorldTiles } from './game/worldGenerator';
import { calculateCollectedCardTroopYields } from './game/lineupUtils';
import { CardPackOnboardingModal } from './components/CardPackOnboardingModal';
import { DailyLoginModal, checkDailyLoginStatus } from './components/DailyLoginModal';
import { loadGameData, saveGameData } from './game/gameStorage';
import { loadShatteredDominionCreatures } from './game/creaturesLoader';
import { BestiaryModal } from './components/BestiaryModal';
import { 
  calculateEmpireProductionRates, 
  resolveTerritoryCombat, 
  calculateMarchDuration 
} from './game/territorySystem';

const savedData = loadGameData();

export default function App() {
  // Game lifecycle state
  const [gameState, setGameState] = useState<'TITLE_SCREEN' | 'ONBOARDING' | 'PLAYING'>(
    savedData?.hasCompletedOnboarding ? 'PLAYING' : 'TITLE_SCREEN'
  );
  const [username, setUsername] = useState<string>(savedData?.username || 'Lord Commander');
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [claimedQuestIds, setClaimedQuestIds] = useState<string[]>(() => (savedData as any)?.claimedQuestIds || []);
  const [isDailyModalOpen, setIsDailyModalOpen] = useState<boolean>(() => {
    return gameState === 'PLAYING' && checkDailyLoginStatus().canClaim;
  });

  useEffect(() => {
    if (gameState === 'PLAYING') {
      const status = checkDailyLoginStatus();
      if (status.canClaim) {
        setIsDailyModalOpen(true);
      }
    }
  }, [gameState]);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Empire Resources & Production State
  const [resources, setResources] = useState(savedData?.resources || {
    food: 3500,
    timber: 3000,
    stone: 2800,
    iron: 2000,
    mana: 1200,
    gold: 2500,
    rubies: 150,
  });

  const [productionRates, setProductionRates] = useState(savedData?.productionRates || {
    food: 6,
    timber: 5,
    stone: 4,
    iron: 3,
    mana: 2,
  });

  // World & Domain Data
  const [worldTiles, setWorldTiles] = useState<WorldTile[]>(() =>
    savedData?.worldTiles ? reconcileWorldTiles(savedData.worldTiles) : generateWorldTiles()
  );
  const [marches, setMarches] = useState<MarchingArmy[]>(savedData?.marches || []);
  const [buildings, setBuildings] = useState<Building[]>(savedData?.buildings || INITIAL_BUILDINGS);
  const [troops, setTroops] = useState<TroopUnit[]>(savedData?.troops || INITIAL_TROOPS);
  const [techs, setTechs] = useState<ResearchTech[]>(savedData?.techs || INITIAL_TECHS);
  
  // Cards & Skills State
  const [cards, setCards] = useState<CommanderCard[]>(savedData?.cards || INITIAL_CARDS);
  const [unitCards, setUnitCards] = useState<UnitUpgradeCard[]>(savedData?.unitCards || INITIAL_UNIT_CARDS);
  const [economicCards, setEconomicCards] = useState<EconomicCard[]>(savedData?.economicCards || INITIAL_ECONOMIC_CARDS);
  const [skills, setSkills] = useState<CardSkill[]>(savedData?.skills || INITIAL_SKILLS);
  const [selectedCommanderId, setSelectedCommanderId] = useState<string>(cards[0]?.id || INITIAL_CARDS[0].id);

  // Shattered Dominion 432 Creatures State
  const [allCreatures, setAllCreatures] = useState<CreatureCard[]>([]);
  const [creatures, setCreatures] = useState<CreatureCard[]>(savedData?.creatures || []);
  const [isBestiaryOpen, setIsBestiaryOpen] = useState<boolean>(false);

  useEffect(() => {
    loadShatteredDominionCreatures().then(list => setAllCreatures(list));
  }, []);

  // Factions, Events, Market, Campaign, Leaderboard
  const [factions, setFactions] = useState<DiplomaticFaction[]>(savedData?.factions || INITIAL_FACTIONS);
  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>(savedData?.worldEvents || INITIAL_WORLD_EVENTS);
  const [marketItems, setMarketItems] = useState<MarketItem[]>(savedData?.marketItems || INITIAL_MARKET_ITEMS);
  const [campaignMissions, setCampaignMissions] = useState(savedData?.campaignMissions || CAMPAIGN_CHAPTERS);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(savedData?.leaderboard || INITIAL_LEADERBOARD);

  // Player Stats
  const [playerLevel, setPlayerLevel] = useState<number>(savedData?.playerLevel || 1);

  // Auto-save game state to localStorage on updates
  useEffect(() => {
    if (gameState === 'PLAYING') {
      saveGameData({
        username,
        hasCompletedOnboarding: true,
        resources,
        productionRates,
        worldTiles,
        marches,
        buildings,
        troops,
        techs,
        cards,
        unitCards,
        economicCards,
        skills,
        creatures,
        factions,
        worldEvents,
        marketItems,
        campaignMissions,
        leaderboard,
        playerLevel,
        claimedQuestIds,
      });
    }
  }, [
    username,
    gameState,
    resources,
    productionRates,
    worldTiles,
    marches,
    buildings,
    troops,
    techs,
    cards,
    unitCards,
    economicCards,
    skills,
    creatures,
    factions,
    worldEvents,
    marketItems,
    campaignMissions,
    leaderboard,
    playerLevel,
    claimedQuestIds,
  ]);

  // Toggle Mute
  const handleToggleMute = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
  };

  // Calculate dynamic production rates based on buildings + active economic council cards
  const calculateRates = (
    currentBuildings: Building[],
    currentEconomicCards: EconomicCard[]
  ) => {
    return calculateEmpireProductionRates(currentBuildings, currentEconomicCards);
  };

  // Resource accretion loop (ticks every 1 second)
  useEffect(() => {
    const interval = setInterval(() => {
      setResources((prev) => ({
        ...prev,
        food: prev.food + productionRates.food,
        timber: prev.timber + productionRates.timber,
        stone: prev.stone + productionRates.stone,
        iron: prev.iron + productionRates.iron,
        mana: prev.mana + productionRates.mana,
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [productionRates]);

  // Troop Creation / Muster Accretion Loop from Collected Cards (ticks every 12 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const yields = calculateCollectedCardTroopYields(cards, unitCards);
      setTroops((prev) =>
        prev.map((u) => ({
          ...u,
          count: u.count + (yields[u.type] || 0),
        }))
      );
    }, 12000);
    return () => clearInterval(interval);
  }, [cards, unitCards]);

  // On-demand manual muster from all collected cards in deck
  const handleMusterAllCards = () => {
    sound.playFanfare();
    const yields = calculateCollectedCardTroopYields(cards, unitCards);
    setTroops((prev) =>
      prev.map((u) => ({
        ...u,
        count: u.count + (yields[u.type] || 0),
      }))
    );
    showToast(
      `CARDS MUSTERED! Collected +${yields.legionnaire} Legionnaires, +${yields.archer} Marksmen, +${yields.gryphon} Gryphons, +${yields.catapult} Catapults into imperial reserves.`
    );
  };

  // Real-time Marches simulation loop (ticks every 200ms)
  useEffect(() => {
    const interval = setInterval(() => {
      setMarches((prevMarches) => {
        if (prevMarches.length === 0) return prevMarches;
        const now = Date.now();
        const nextMarches: MarchingArmy[] = [];

        prevMarches.forEach((march) => {
          const elapsed = now - march.startTime;
          const progress = Math.min(1, elapsed / march.duration);

          if (progress >= 1 && !march.completed) {
            handleMarchArrival(march);
          } else {
            nextMarches.push({ ...march, progress });
          }
        });

        return nextMarches;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [worldTiles, unitCards, economicCards]);

  // Handle march arrival and combat resolution
  const handleMarchArrival = (march: MarchingArmy) => {
    const target = worldTiles.find((t) => t.id === march.targetTileId);
    if (!target) return;

    const resolution = resolveTerritoryCombat(march, target, unitCards);

    if (resolution.isVictorious) {
      sound.playFanfare();

      // Transfer tile to player
      setWorldTiles((prev) =>
        prev.map((t) =>
          t.id === target.id
            ? {
                ...t,
                owner: 'player',
                ownerName: 'Lord Commander',
                garrisonPower: resolution.newGarrisonPower,
                garrisonTroops: march.troopCount,
              }
            : t
        )
      );

      // Reward spoils
      setResources((r) => ({
        ...r,
        food: r.food + resolution.spoils.food,
        timber: r.timber + resolution.spoils.timber,
        gold: r.gold + resolution.spoils.gold,
        rubies: r.rubies + resolution.spoils.rubies,
      }));

      // Check for exclusive card drop reward from tile!
      if (resolution.spoils.exclusiveDrop) {
        if (resolution.spoils.exclusiveDrop === 'uc_gryphon_storm') {
          showToast(`TERRITORY CARD SPOIL! Unlocked [Thunderstrike Gryphon Vanguard] from ${target.name}!`);
        } else if (resolution.spoils.exclusiveDrop === 'ec_cornucopia') {
          showToast(`ANCIENT CARD DISCOVERY! Unlocked [Aetherium Cornucopia] from ${target.name}!`);
        }
      } else {
        const stanceLabel = march.formation ? `${march.formation.toUpperCase()} STANCE` : 'MARCH';
        showToast(`VICTORY! ${target.name} conquered via ${stanceLabel} led by ${march.commander.name}! (+${resolution.spoils.gold} Gold, +${resolution.spoils.rubies} Rubies).`);
      }
    } else {
      sound.playClash();
      showToast(`DEFEAT! Imperial march overwhelmed at ${target.name}. Survivors retreated.`);
    }

    // Commander returns to citadel and reconstitutes their 100 vanguard troops
    setCards((prev) =>
      prev.map((c) => (c.id === march.commander.id ? { ...c, currentTroops: 100 } : c))
    );
  };

  // Dispatch March with 15-Point Lineup & Visual Troop Formation Stance
  const handleDispatchMarch = (
    commanderId: string,
    targetTileId: string,
    troopType: 'legionnaire' | 'archer' | 'gryphon' | 'catapult',
    troopCount: number,
    action: 'attack' | 'capture' | 'reinforce' | 'scout',
    lineupCards?: (CommanderCard | UnitUpgradeCard)[],
    formation: TroopFormation = 'balanced'
  ) => {
    const commander = cards.find((c) => c.id === commanderId) || cards[0];
    const target = worldTiles.find((t) => t.id === targetTileId);
    const playerCitadel = worldTiles.find((t) => t.type === 'player_citadel') || worldTiles[0];

    if (!target) return;

    // Commanders begin with 100 troops until sent into battle.
    // Commit the commander's standing troops to battle first, and draw any additional from barracks reserves.
    const standingTroops = commander.currentTroops ?? 100;
    const fromStanding = Math.min(standingTroops, troopCount);
    const fromReserves = Math.max(0, troopCount - fromStanding);

    // Deduct standing troops from commander (set to 0 while deployed into battle)
    setCards((prev) =>
      prev.map((c) =>
        c.id === commanderId
          ? { ...c, currentTroops: Math.max(0, (c.currentTroops ?? 100) - fromStanding) }
          : c
      )
    );

    // Deduct any additional troops above the commander's standing 100 from trained barracks reserves
    if (fromReserves > 0) {
      setTroops((prev) =>
        prev.map((u) => (u.type === troopType ? { ...u, count: Math.max(0, u.count - fromReserves) } : u))
      );
    }

    const duration = calculateMarchDuration(
      { x: playerCitadel.x, y: playerCitadel.y },
      { x: target.x, y: target.y },
      economicCards,
      formation
    );
    const now = Date.now();
    const newMarch: MarchingArmy = {
      id: `march_${now}`,
      commander,
      lineupCards,
      formation,
      troopType,
      troopCount,
      sourceTileId: playerCitadel.id,
      targetTileId,
      sourceCoords: { x: playerCitadel.x, y: playerCitadel.y },
      targetCoords: { x: target.x, y: target.y },
      currentCoords: { x: playerCitadel.x, y: playerCitadel.y },
      action,
      startTime: now,
      duration,
      arriveTime: now + duration,
      progress: 0,
      completed: false,
    };

    setMarches((prev) => [...prev, newMarch]);
    showToast(`March dispatched in [${formation.toUpperCase()} STANCE]! ${commander.name} leading ${troopCount.toLocaleString()} troops to ${target.name}.`);
  };

  // Base Building Upgrades
  const handleUpgradeBuilding = (buildingId: string) => {
    const b = buildings.find((x) => x.id === buildingId);
    if (!b) return;

    // Deduct resources
    setResources((r) => ({
      ...r,
      food: r.food - b.upgradeCost.food,
      timber: r.timber - b.upgradeCost.timber,
      stone: r.stone - b.upgradeCost.stone,
      iron: r.iron - b.upgradeCost.iron,
      gold: r.gold - b.upgradeCost.gold,
    }));

    const nextBuildings = buildings.map((item) =>
      item.id === buildingId
        ? {
            ...item,
            level: item.level + 1,
            upgradeCost: {
              food: Math.floor(item.upgradeCost.food * 1.3),
              timber: Math.floor(item.upgradeCost.timber * 1.3),
              stone: Math.floor(item.upgradeCost.stone * 1.3),
              iron: Math.floor(item.upgradeCost.iron * 1.3),
              gold: Math.floor(item.upgradeCost.gold * 1.3),
            },
          }
        : item
    );

    setBuildings(nextBuildings);
    setProductionRates(calculateRates(nextBuildings, economicCards));

    sound.playFanfare();
    showToast(`${b.name} upgraded to Level ${b.level + 1}!`);
  };

  const handleInstantCompleteUpgrade = (buildingId: string) => {
    if (resources.rubies < 30) {
      showToast('Insufficient Rubies for instant rush!');
      return;
    }
    setResources((r) => ({ ...r, rubies: r.rubies - 30 }));
    handleUpgradeBuilding(buildingId);
  };

  // Troop Training
  const handleTrainTroops = (troopId: string, count: number) => {
    const unit = troops.find((u) => u.id === troopId);
    if (!unit) return;

    const foodCost = unit.cost.food * count;
    const timberCost = unit.cost.timber * count;
    const ironCost = unit.cost.iron * count;
    const goldCost = unit.cost.gold * count;

    setResources((r) => ({
      ...r,
      food: r.food - foodCost,
      timber: r.timber - timberCost,
      iron: r.iron - ironCost,
      gold: r.gold - goldCost,
    }));

    setTroops((prev) =>
      prev.map((u) => (u.id === troopId ? { ...u, count: u.count + count } : u))
    );

    showToast(`Recruitment complete: +${count} ${unit.name} enlisted.`);
  };

  // Tech Research
  const handleResearchTech = (techId: string) => {
    const tech = techs.find((t) => t.id === techId);
    if (!tech) return;

    setResources((r) => ({
      ...r,
      mana: r.mana - tech.cost.mana,
      gold: r.gold - tech.cost.gold,
    }));

    setTechs((prev) =>
      prev.map((t) => (t.id === techId ? { ...t, level: t.level + 1 } : t))
    );

    showToast(`Arcane Blueprint researched: ${tech.name} (Lv.${tech.level + 1}).`);
  };

  // Dungeon Victory Rewards with Card Pack Drop
  const handleDungeonVictory = (rewards: { gold: number; rubies: number; mana: number }) => {
    setResources((r) => ({
      ...r,
      gold: r.gold + rewards.gold,
      rubies: r.rubies + rewards.rubies,
      mana: r.mana + rewards.mana,
    }));

    // Dungeon guaranteed reward card drop
    showToast(`DUNGEON BOSS SLAIN! Looted +${rewards.gold} Gold, +${rewards.rubies} Rubies, and [Void Abyssal Grimoire] Card Shard!`);
  };

  // Card Level Up & Ascension
  const handleLevelUpCard = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              level: Math.min(c.maxLevel, c.level + 1),
              atk: c.atk + 45,
              def: c.def + 35,
              troopCapacity: c.troopCapacity + 120,
            }
          : c
      )
    );
    showToast('Commander trained! ATK, DEF, and Troop capacity elevated.');
  };

  const handleAscendCard = (cardId: string) => {
    if (resources.rubies < 100) {
      showToast('Need 100 Rubies to ascend Commander Star!');
      return;
    }
    setResources((r) => ({ ...r, rubies: r.rubies - 100 }));
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              stars: Math.min(6, c.stars + 1),
              atk: Math.floor(c.atk * 1.15),
              def: Math.floor(c.def * 1.15),
            }
          : c
      )
    );
    showToast('Star Ascension Successful! Commander combat stats boosted by +15%.');
  };

  // Equip Skill
  const handleEquipSkill = (cardId: string, slotIndex: number, skillId: string) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;

    setCards((prev) =>
      prev.map((c) => {
        if (c.id === cardId) {
          const nextSlots = [...c.equippedSkills];
          nextSlots[slotIndex] = skill;
          return { ...c, equippedSkills: nextSlots };
        }
        return c;
      })
    );
    showToast(`Equipped ${skill.name} to ${cards.find((c) => c.id === cardId)?.name}!`);
  };

  // Toggle Economic Doctrine Card in Council
  const handleToggleEconomicCard = (cardId: string) => {
    const card = economicCards.find((c) => c.id === cardId);
    if (!card) return;

    const currentActiveCount = economicCards.filter((c) => c.isCouncilActive).length;

    if (!card.isCouncilActive && currentActiveCount >= 4) {
      showToast('Council capacity full! Unequip a doctrine first (max 4).');
      return;
    }

    const nextEconomicCards = economicCards.map((c) =>
      c.id === cardId ? { ...c, isCouncilActive: !c.isCouncilActive } : c
    );

    setEconomicCards(nextEconomicCards);
    setProductionRates(calculateRates(buildings, nextEconomicCards));

    if (!card.isCouncilActive) {
      showToast(`Enacted [${card.name}] in Sovereign Council! Realm bonuses active.`);
    } else {
      showToast(`Retired [${card.name}] from Sovereign Council.`);
    }
  };

  // Toggle Unit Upgrade Card on Battalions
  const handleToggleUnitCard = (cardId: string) => {
    const card = unitCards.find((u) => u.id === cardId);
    if (!card) return;

    const nextUnitCards = unitCards.map((u) =>
      u.id === cardId ? { ...u, isEquipped: !u.isEquipped } : u
    );

    setUnitCards(nextUnitCards);

    // Apply stat bonus to matching troop battalion
    setTroops((prevTroops) =>
      prevTroops.map((unit) => {
        if (unit.type === card.targetUnitType) {
          const mult = !card.isEquipped ? 1 + card.bonusAtkPercent / 100 : 1;
          return {
            ...unit,
            atk: Math.round(unit.atk * mult),
          };
        }
        return unit;
      })
    );

    if (!card.isEquipped) {
      showToast(`Equipped [${card.name}] to ${card.targetUnitType.toUpperCase()} Battalion!`);
    } else {
      showToast(`Unequipped [${card.name}] from Battalion.`);
    }
  };

  // Summon Card (Ancient Altar)
  const handleSummonCard = (pulls: 1 | 10) => {
    const cost = pulls === 1 ? 150 : 1350;
    setResources((r) => ({ ...r, rubies: r.rubies - cost }));
  };

  // Craft / Transmute Card in Forge
  const handleCraftCard = (recipeType: string) => {
    setResources((r) => ({
      ...r,
      gold: Math.max(0, r.gold - 2000),
      rubies: Math.max(0, r.rubies - 40),
    }));
  };

  // Diplomacy Treaty Update
  const handleUpdateTreaty = (factionId: string, treatyType: TreatyType) => {
    setFactions((prev) =>
      prev.map((f) =>
        f.id === factionId
          ? {
              ...f,
              status: treatyType === 'war' ? 'hostile' : treatyType === 'coalition' ? 'allied' : 'pact',
              activeTreaty: {
                type: treatyType,
                signedAt: 'Epoch 3 · Day 20',
                turnsRemaining: 30,
              },
            }
          : f
      )
    );
  };

  // Espionage
  const handleLaunchEspionage = (factionId: string, missionType: string) => {
    setResources((r) => ({ ...r, gold: Math.max(0, r.gold - 1200) }));
  };

  // Alliance Rally
  const handleStartAllianceRally = (targetFactionId: string) => {
    showToast('Mass Rally Launched! 42,500 Allied troops converging on Monolith Citadel!');
  };

  // Complete Campaign Mission with Card Reward
  const handleCompleteMission = (missionId: string) => {
    setCampaignMissions((prev) =>
      prev.map((m) => (m.id === missionId ? { ...m, completed: true } : m))
    );
    setResources((r) => ({ ...r, gold: r.gold + 3000, rubies: r.rubies + 100 }));
    showToast('Campaign Chapter Conquered! Reward Doctrine Card added to Grimoire.');
  };

  // Market Trading
  const handleTradeMarket = (
    resource: 'food' | 'timber' | 'stone' | 'iron' | 'mana',
    type: 'buy' | 'sell',
    amount: number
  ) => {
    const item = marketItems.find((m) => m.resource === resource);
    if (!item) return;

    const totalCost = Math.round(amount * item.currentPrice);

    if (type === 'buy') {
      setResources((r) => ({
        ...r,
        gold: r.gold - totalCost,
        [resource]: r[resource] + amount,
      }));
      showToast(`Purchased ${amount} ${item.name} for 🪙${totalCost} Gold.`);
    } else {
      setResources((r) => ({
        ...r,
        gold: r.gold + totalCost,
        [resource]: r[resource] - amount,
      }));
      showToast(`Sold ${amount} ${item.name} for +🪙${totalCost} Gold.`);
    }
  };

  // PvP Duel
  const handlePvPDuel = (opponentName: string) => {
    setLeaderboard((prev) =>
      prev.map((p) =>
        p.isPlayer
          ? { ...p, trophies: p.trophies + 45, territories: p.territories + 1 }
          : p
      )
    );
  };

  // Sovereign Onboarding & Chapter Quests
  const quests: SovereignQuest[] = useMemo(() => [
    {
      id: 'quest_citadel',
      title: 'Foundations of the Citadel',
      description: 'Upgrade your Citadel Keep or Resource Mills to strengthen imperial dominion.',
      targetTab: 'citadel',
      reward: { gold: 1500, rubies: 50 },
      isCompleted: buildings.some((b) => b.level >= 2),
      isClaimed: claimedQuestIds.includes('quest_citadel'),
    },
    {
      id: 'quest_troops',
      title: 'Muster the Imperial Cohort',
      description: 'Train at least 150 infantry, marksmen, gryphons, or siege engines in the Barracks.',
      targetTab: 'citadel',
      reward: { gold: 2000, rubies: 60 },
      isCompleted: troops.reduce((s, u) => s + u.count, 0) >= 150,
      isClaimed: claimedQuestIds.includes('quest_troops'),
    },
    {
      id: 'quest_lineup',
      title: 'Sovereign Grimoire & Lineup',
      description: 'Form your strategic lineup with Commander Hero & Support under the 15-point budget.',
      targetTab: 'cards',
      reward: { gold: 2500, rubies: 75 },
      isCompleted: cards.some((c) => c.level >= 2 || c.stars >= 2) || unitCards.some((u) => u.isEquipped),
      isClaimed: claimedQuestIds.includes('quest_lineup'),
    },
    {
      id: 'quest_conquest',
      title: 'Frontier Expansion',
      description: 'Dispatch a march army to conquer an adjacent frontier square on the Continental Map.',
      targetTab: 'map',
      reward: { gold: 3000, rubies: 100 },
      isCompleted: worldTiles.filter((t) => t.owner === 'player').length >= 3 || marches.length > 0,
      isClaimed: claimedQuestIds.includes('quest_conquest'),
    },
    {
      id: 'quest_dungeon',
      title: 'Delve the Void Rift',
      description: 'Venture into the Dungeon Raids and claim dungeon boss loot.',
      targetTab: 'dungeon',
      reward: { gold: 3500, rubies: 120 },
      isCompleted: playerLevel >= 2 || campaignMissions.some((m) => m.completed),
      isClaimed: claimedQuestIds.includes('quest_dungeon'),
    },
  ], [buildings, troops, cards, unitCards, worldTiles, marches, playerLevel, campaignMissions, claimedQuestIds]);

  const handleClaimQuestReward = (questId: string) => {
    const quest = quests.find((q) => q.id === questId);
    if (!quest || quest.isClaimed) return;
    setResources((r) => ({
      ...r,
      gold: r.gold + quest.reward.gold,
      rubies: r.rubies + quest.reward.rubies,
    }));
    setClaimedQuestIds((prev) => [...prev, questId]);
    showToast(`Sovereign Milestone Accomplished! Claimed +${quest.reward.gold.toLocaleString()} Gold and +${quest.reward.rubies} Rubies.`);
  };

  const activeCommander = cards.find((c) => c.id === selectedCommanderId) || cards[0];
  const playerTerritories = worldTiles.filter((t) => t.owner === 'player').length;

  if (gameState === 'TITLE_SCREEN') {
    return (
      <TitleScreen
        initialUsername={username}
        onStartGame={(name) => {
          setUsername(name);
          setGameState('ONBOARDING');
        }}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />
    );
  }

  if (gameState === 'ONBOARDING') {
    return (
      <CardPackOnboardingModal
        sampleCards={cards}
        sampleUnitCards={unitCards}
        sampleEconCards={economicCards}
        allCreatures={allCreatures}
        onCompleteOnboarding={(starterData, regionName, coords) => {
          if (starterData.starterCreatures && starterData.starterCreatures.length > 0) {
            setCreatures(starterData.starterCreatures);
          }
          setWorldTiles((prev) =>
            prev.map((t) => {
              if (t.x === coords.x && t.y === coords.y) {
                return {
                  ...t,
                  type: 'player_citadel',
                  name: `Sovereign Citadel (${regionName})`,
                  owner: 'player',
                  ownerName: username,
                  garrisonPower: 9200,
                  garrisonTroops: 2800,
                };
              }
              if (t.type === 'player_citadel' && (t.x !== coords.x || t.y !== coords.y)) {
                return {
                  ...t,
                  type: 'farmland',
                  name: 'Imperial Farmland',
                  owner: 'player',
                  garrisonPower: 2200,
                  garrisonTroops: 600,
                };
              }
              return t;
            })
          );
          setGameState('PLAYING');
          showToast(`Kingdom established by ${username} in ${regionName} at Sector [${coords.x}, ${coords.y}]! (${starterData.starterCreatures?.length || 0} Creatures Claimed)`);
        }}
        onSkipOnboarding={() => {
          setGameState('PLAYING');
          showToast(`Welcome back, ${username}! Realm progress loaded.`);
        }}
      />
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top HUD Status & Resource cluster */}
      <HUDHeader
        resources={resources}
        productionRates={productionRates}
        activeEvent={worldEvents[0] || null}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenEventModal={() => setIsEventModalOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        playerLevel={playerLevel}
        territoriesCount={playerTerritories}
      />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-amber-500/80 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-semibold text-amber-300 flex items-center gap-2 animate-in fade-in slide-in-from-top-3 max-w-md w-full mx-4">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Main Viewport Routing */}
      <main className="w-full h-full relative">
        {activeTab === 'map' && (
          <RealmMap
            tiles={worldTiles}
            marches={marches}
            cards={cards}
            unitCards={unitCards}
            techs={techs}
            troops={troops}
            onDispatchMarch={handleDispatchMarch}
            onTileCaptured={(tileId) => {}}
            onSelectCommander={(cardId) => setSelectedCommanderId(cardId)}
          />
        )}

        {activeTab === 'citadel' && (
          <CitadelBase
            buildings={buildings}
            troops={troops}
            techs={techs}
            resources={resources}
            onUpgradeBuilding={handleUpgradeBuilding}
            onInstantCompleteUpgrade={handleInstantCompleteUpgrade}
            onTrainTroops={handleTrainTroops}
            onResearchTech={handleResearchTech}
          />
        )}

        {activeTab === 'dungeon' && (
          <DungeonCrawler
            heroCard={activeCommander}
            onDungeonVictory={handleDungeonVictory}
            onExit={() => setActiveTab('map')}
          />
        )}

        {activeTab === 'cards' && (
          <CardDeck
            cards={cards}
            unitCards={unitCards}
            economicCards={economicCards}
            skills={skills}
            techs={techs}
            rubies={resources.rubies}
            gold={resources.gold}
            onLevelUpCard={handleLevelUpCard}
            onAscendCard={handleAscendCard}
            onEquipSkill={handleEquipSkill}
            onToggleEconomicCard={handleToggleEconomicCard}
            onToggleUnitCard={handleToggleUnitCard}
            onSummonCard={handleSummonCard}
            onCraftCard={handleCraftCard}
            onMusterCards={handleMusterAllCards}
            selectedCardId={selectedCommanderId}
            onSelectCard={(id) => setSelectedCommanderId(id)}
            onOpenBestiary={() => setIsBestiaryOpen(true)}
          />
        )}

        {/* Bestiary Codex Modal */}
        {isBestiaryOpen && (
          <BestiaryModal
            creatures={allCreatures}
            playerCreatures={creatures}
            onClose={() => setIsBestiaryOpen(false)}
          />
        )}

        {activeTab === 'diplomacy' && (
          <DiplomacyAlliance
            factions={factions}
            gold={resources.gold}
            onUpdateTreaty={handleUpdateTreaty}
            onLaunchEspionage={handleLaunchEspionage}
            onStartAllianceRally={handleStartAllianceRally}
          />
        )}

        {activeTab === 'chronicles' && (
          <ChroniclesAndLeaderboard
            missions={campaignMissions}
            leaderboard={leaderboard}
            marketItems={marketItems}
            worldEvents={worldEvents}
            gold={resources.gold}
            resources={resources}
            onCompleteMission={handleCompleteMission}
            onTradeMarket={handleTradeMarket}
            onPvPDuel={handlePvPDuel}
          />
        )}
      </main>

      {/* Mobile-First Fixed Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        activeMarchesCount={marches.length}
      />

      {/* Global World Event Details Modal */}
      {isEventModalOpen && worldEvents[0] && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/60 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                Live World Event
              </span>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg"
              >
                Close
              </button>
            </div>

            <h3 className="text-xl font-black text-slate-100 font-cinzel my-2">
              {worldEvents[0].name}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              {worldEvents[0].description}
            </p>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 mb-5 text-xs font-mono-nums space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Monster Lair Loot:</span>
                <strong className="text-emerald-400">+50% Gold & Shards</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Aether Mana Market:</span>
                <strong className="text-purple-400">+120% Price Spike</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Troop March Speed:</span>
                <strong className="text-amber-400">+20% Accelerated</strong>
              </div>
            </div>

            <button
              onClick={() => setIsEventModalOpen(false)}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer"
            >
              Acknowledge Directive
            </button>
          </div>
        </div>
      )}

      {/* Daily Login Reward Modal */}
      {isDailyModalOpen && (
        <DailyLoginModal
          onClaim={(reward) => {
            setResources((r) => ({
              ...r,
              gold: r.gold + reward.gold,
              mana: r.mana + reward.mana,
              rubies: r.rubies + reward.rubies,
            }));
            setIsDailyModalOpen(false);
            showToast(`Claimed Daily Login Reward! +${reward.gold.toLocaleString()} Gold, +${reward.mana.toLocaleString()} Mana, +${reward.rubies} Rubies.`);
          }}
          onClose={() => setIsDailyModalOpen(false)}
        />
      )}

      {/* Floating Sovereign Quest Tracker */}
      {quests.some((q) => !q.isClaimed) && (
        <div className="fixed bottom-18 right-3 sm:right-5 z-30 pointer-events-auto">
          <button
            onClick={() => {
              sound.playClick();
              setIsGuideOpen(true);
            }}
            className="bg-slate-900/95 border border-amber-500/60 hover:border-amber-400 p-2 sm:p-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 transition-all text-xs group cursor-pointer active:scale-95"
            title="View Active Sovereign Quests & Codex"
          >
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Compass className="w-4 h-4" />
            </div>
            <div className="text-left hidden xs:block sm:block">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                Sovereign Quest ({quests.filter((q) => q.isCompleted).length}/{quests.length})
              </div>
              <div className="text-slate-200 font-semibold truncate max-w-[150px]">
                {quests.find((q) => !q.isClaimed)?.title || 'All Complete'}
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Sovereign Guide & Codex Modal */}
      {isGuideOpen && (
        <SovereignGuideModal
          quests={quests}
          onClaimQuestReward={handleClaimQuestReward}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onClose={() => setIsGuideOpen(false)}
        />
      )}
    </div>
  );
}
