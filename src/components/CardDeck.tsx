import React, { useState, useMemo } from 'react';
import { 
  CommanderCard, 
  CardSkill, 
  UnitUpgradeCard, 
  EconomicCard, 
  ElementAffinity, 
  CardRarity,
  ResearchTech
} from '../game/types';
import { sound } from '../game/audio';
import { 
  calculateTroopCapacity, 
  calculateLineupPoints, 
  calculateCollectedCardTroopYields,
  MAX_LINEUP_POINTS, 
  BASE_TROOP_CAP 
} from '../game/lineupUtils';
import { evaluateCommanderBalance } from '../game/creatureBalance';
import { 
  Layers, 
  Sparkles, 
  Flame, 
  Shield, 
  Zap, 
  Star, 
  ArrowUp, 
  Plus, 
  X, 
  Gem, 
  Swords, 
  Heart, 
  Info,
  CheckCircle,
  Award,
  Crown,
  Hammer,
  TrendingUp,
  FlaskConical,
  Check,
  ChevronRight,
  BookOpen,
  Wheat,
  Trees,
  Anvil,
  Send,
  Brain,
  GraduationCap,
  Users,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface CardDeckProps {
  cards: CommanderCard[];
  unitCards: UnitUpgradeCard[];
  economicCards: EconomicCard[];
  skills: CardSkill[];
  techs?: ResearchTech[];
  rubies: number;
  gold: number;
  onLevelUpCard: (cardId: string) => void;
  onAscendCard: (cardId: string) => void;
  onEquipSkill: (cardId: string, slotIndex: number, skillId: string) => void;
  onToggleEconomicCard: (cardId: string) => void;
  onToggleUnitCard: (cardId: string) => void;
  onSummonCard: (pulls: 1 | 10) => void;
  onCraftCard: (recipeType: string) => void;
  onMusterCards?: () => void;
  selectedCardId: string;
  onSelectCard: (cardId: string) => void;
  onOpenBestiary?: () => void;
}

export const CardDeck: React.FC<CardDeckProps> = ({
  cards,
  unitCards,
  economicCards,
  skills,
  techs = [],
  rubies,
  gold,
  onLevelUpCard,
  onAscendCard,
  onEquipSkill,
  onToggleEconomicCard,
  onToggleUnitCard,
  onSummonCard,
  onCraftCard,
  onMusterCards,
  selectedCardId,
  onSelectCard,
  onOpenBestiary,
}) => {
  type DeckCategory = 'lineup' | 'commanders' | 'units' | 'economic' | 'skills' | 'altar' | 'forge';
  const [activeCategory, setActiveCategory] = useState<DeckCategory>('lineup');

  // Selected card for detail inspection
  const [inspectCommander, setInspectCommander] = useState<CommanderCard | null>(
    cards.find((c) => c.id === selectedCardId) || cards[0]
  );
  const [inspectUnitCard, setInspectUnitCard] = useState<UnitUpgradeCard | null>(unitCards[0]);
  const [inspectEconomicCard, setInspectEconomicCard] = useState<EconomicCard | null>(economicCards[0]);

  // Active 15-Point Lineup Deck Configuration State
  const [lineupCommanderId, setLineupCommanderId] = useState<string>(cards[0]?.id || '');
  const [lineupBattalionId, setLineupBattalionId] = useState<string | null>(unitCards[0]?.id || null);
  const [lineupSupportId, setLineupSupportId] = useState<string | null>(unitCards[1]?.id || null);

  // Skill equip modal state
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [isEquipSkillModalOpen, setIsEquipSkillModalOpen] = useState(false);

  // Summon reveal state
  const [summonResult, setSummonResult] = useState<{
    cardName: string;
    cardRarity: string;
    cardType: string;
    image: string;
  }[] | null>(null);

  // Forge state
  const [craftSuccess, setCraftSuccess] = useState<string | null>(null);
  const [musterSuccess, setMusterSuccess] = useState<string | null>(null);

  // Calculate live lineup configuration values
  const currentLineupCommander = useMemo(() => {
    return cards.find((c) => c.id === lineupCommanderId) || cards[0];
  }, [cards, lineupCommanderId]);

  const currentLineupBattalion = useMemo(() => {
    return unitCards.find((u) => u.id === lineupBattalionId) || null;
  }, [unitCards, lineupBattalionId]);

  const currentLineupSupport = useMemo(() => {
    return unitCards.find((u) => u.id === lineupSupportId) || null;
  }, [unitCards, lineupSupportId]);

  const lineupPoints = useMemo(() => {
    return calculateLineupPoints(currentLineupCommander, currentLineupBattalion, currentLineupSupport);
  }, [currentLineupCommander, currentLineupBattalion, currentLineupSupport]);

  const lineupTroopCap = useMemo(() => {
    return calculateTroopCapacity(currentLineupCommander, techs);
  }, [currentLineupCommander, techs]);

  const totalTroopYields = useMemo(() => {
    return calculateCollectedCardTroopYields(cards, unitCards);
  }, [cards, unitCards]);

  const getElementBadge = (elem: ElementAffinity) => {
    switch (elem) {
      case 'sol':
        return <span className="text-amber-400 font-bold">☀ Sol</span>;
      case 'ignis':
        return <span className="text-red-400 font-bold">🔥 Ignis</span>;
      case 'void':
        return <span className="text-purple-400 font-bold">🌑 Void</span>;
      case 'gaia':
        return <span className="text-emerald-400 font-bold">🌿 Gaia</span>;
      case 'frost':
        return <span className="text-cyan-400 font-bold">❄ Frost</span>;
    }
  };

  const getRarityBadge = (rarity: CardRarity) => {
    switch (rarity) {
      case 'legendary':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">5★ Legendary</span>;
      case 'epic':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase">4★ Epic</span>;
      case 'rare':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 uppercase">3★ Rare</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">2★ Uncommon</span>;
    }
  };

  const handleOpenEquipSkillModal = (slotIdx: number) => {
    sound.playClick();
    setSelectedSlotIndex(slotIdx);
    setIsEquipSkillModalOpen(true);
  };

  const handleSelectSkillToEquip = (skill: CardSkill) => {
    if (!inspectCommander || selectedSlotIndex === null) return;
    sound.playMagic();
    onEquipSkill(inspectCommander.id, selectedSlotIndex, skill.id);
    setIsEquipSkillModalOpen(false);
  };

  const handleTriggerSummon = (pulls: 1 | 10) => {
    sound.playSummon();
    onSummonCard(pulls);

    const pool = [
      ...cards.map((c) => ({ cardName: c.name, cardRarity: c.rarity, cardType: 'Commander Hero', image: c.image })),
      ...unitCards.map((u) => ({ cardName: u.name, cardRarity: u.rarity, cardType: 'Unit Upgrade', image: u.image })),
      ...economicCards.map((e) => ({ cardName: e.name, cardRarity: e.rarity, cardType: 'Realm Doctrine', image: e.image })),
    ];

    const results = Array.from({ length: pulls }, () => pool[Math.floor(Math.random() * pool.length)]);
    setSummonResult(results);
  };

  const handleCraft = (recipe: string, name: string) => {
    sound.playFanfare();
    onCraftCard(recipe);
    setCraftSuccess(`Transmutation Complete! Synthesized [${name}].`);
    setTimeout(() => setCraftSuccess(null), 4000);
  };

  const handleManualMuster = () => {
    if (onMusterCards) {
      onMusterCards();
    } else {
      sound.playFanfare();
    }
    setMusterSuccess(`Mustered +${totalTroopYields.totalPerCycle.toLocaleString()} Troops from Collected Cards!`);
    setTimeout(() => setMusterSuccess(null), 4500);
  };

  const activeCouncilCount = economicCards.filter((e) => e.isCouncilActive).length;

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] pt-14 pb-16 overflow-y-auto bg-slate-950 p-3 sm:p-6 select-none">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Top Header & Category Selector */}
        <div className="flex flex-col gap-3 bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-0.5">
                <Layers className="w-4 h-4" />
                <span>Card Collection & Tactical Grimoire</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-100 font-cinzel tracking-wide">
                Codex of War & Sovereign Doctrines
              </h2>
            </div>

            {/* Balances & Troop Generation Speed */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono-nums">
              <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-emerald-400">
                <Users className="w-3.5 h-3.5" />
                <span>Cards Muster: <strong className="font-bold">+{totalTroopYields.totalPerCycle}/cyc</strong></span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-rose-300">
                <Gem className="w-3.5 h-3.5 text-rose-400" />
                <span className="font-bold">{rubies.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Interactive Category Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 overflow-x-auto">
            <button
              onClick={() => {
                sound.playClick();
                setActiveCategory('lineup');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === 'lineup'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>War Lineup (15 Pts)</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setActiveCategory('commanders');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === 'commanders'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Commanders ({cards.length})</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setActiveCategory('units');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === 'units'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Battalions ({unitCards.length})</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setActiveCategory('economic');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === 'economic'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Doctrines ({economicCards.length})</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setActiveCategory('skills');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === 'skills'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Skills ({skills.length})</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setActiveCategory('forge');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === 'forge'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Transmutation</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setActiveCategory('altar');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === 'altar'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md font-bold'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Altar Gate</span>
            </button>

            {onOpenBestiary && (
              <button
                onClick={() => {
                  sound.playClick();
                  onOpenBestiary();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer bg-purple-950/80 text-purple-300 border border-purple-500/50 hover:bg-purple-900/80"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Bestiary (432)</span>
              </button>
            )}
          </div>
        </div>

        {craftSuccess && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{craftSuccess}</span>
          </div>
        )}

        {musterSuccess && (
          <div className="p-3 bg-amber-950/60 border border-amber-500/50 rounded-xl text-xs text-amber-300 font-semibold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{musterSuccess}</span>
            </div>
            <span className="font-mono-nums text-[11px] text-slate-400">Added to Barracks</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* Category: 15-Point Tactical Lineup & Troop Engine        */}
        {/* ======================================================== */}
        {activeCategory === 'lineup' && (
          <div className="space-y-5">
            {/* Top Tactical Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
                  <Swords className="w-4 h-4" />
                  <span>15-Point Lineup Point System & Troop Capacity</span>
                </div>
                <h3 className="text-xl font-bold text-slate-100 mb-1">
                  Imperial Expeditionary Lineup
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Lineups are capped at <strong className="text-amber-300 font-mono">15 Points</strong> maximum. Deploying troops has a hard base cap of <strong className="text-amber-300 font-mono">9,999</strong>, scaled dynamically higher by commander <strong className="text-sky-300">Intelligence (INT)</strong>, Academy military research, and equippable skill traits.
                </p>
              </div>

              {/* Instant Muster Action */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                    Troop Creation from Cards
                  </span>
                  <div className="text-sm font-bold text-emerald-400 font-mono-nums mt-0.5">
                    +{totalTroopYields.totalPerCycle.toLocaleString()} Troops / Cycle
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Generated continuously by collected commander and battalion cards.
                  </div>
                </div>

                <button
                  onClick={handleManualMuster}
                  className="mt-3 w-full py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Muster All Troops Now</span>
                </button>
              </div>
            </div>

            {/* Lineup Budget & Troop Capacity Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: 15-Point Budget Meter */}
              <div className={`p-4 rounded-3xl border transition-all ${
                lineupPoints.isOverBudget
                  ? 'bg-rose-950/40 border-rose-500/80 shadow-rose-950/30'
                  : 'bg-slate-900 border-slate-800 shadow-xl'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Lineup Point Budget
                  </span>
                  <span className={`font-mono-nums font-bold text-sm ${
                    lineupPoints.isOverBudget ? 'text-rose-400' : 'text-amber-300'
                  }`}>
                    {lineupPoints.totalPoints} / {MAX_LINEUP_POINTS} Points
                  </span>
                </div>

                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800 mb-2">
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
                  <div className="text-xs text-rose-300 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Exceeds maximum 15 points! Please swap cards to fit budget.</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono-nums">
                    <span>{lineupPoints.remainingPoints} budget points remaining</span>
                    <span className="text-emerald-400 font-semibold">✓ Formation Valid</span>
                  </div>
                )}
              </div>

              {/* Card 2: 9,999 Base Cap + Intel + Research + Skills */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-sky-400" />
                    Troop Capacity Breakdown
                  </span>
                  <span className="text-sm font-bold text-amber-300 font-mono-nums">
                    {lineupTroopCap.totalCap.toLocaleString()} Troops Max
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center font-mono-nums text-xs">
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Base Cap</span>
                    <strong className="text-slate-100 font-bold">{BASE_TROOP_CAP.toLocaleString()}</strong>
                  </div>

                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-sky-400 block text-[10px] flex items-center justify-center gap-0.5">
                      <Brain className="w-2.5 h-2.5" /> Intel
                    </span>
                    <strong className="text-sky-300 font-bold">+{lineupTroopCap.intelBonus.toLocaleString()}</strong>
                  </div>

                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-purple-400 block text-[10px] flex items-center justify-center gap-0.5">
                      <GraduationCap className="w-2.5 h-2.5" /> Research
                    </span>
                    <strong className="text-purple-300 font-bold">+{lineupTroopCap.researchBonus.toLocaleString()}</strong>
                  </div>

                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-amber-400 block text-[10px] flex items-center justify-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> Skills
                    </span>
                    <strong className="text-amber-300 font-bold">+{lineupTroopCap.skillBonus.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Lineup Slots Builder */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Slot 1: Commander Hero */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-mono font-bold">1</span>
                      <h4 className="text-sm font-bold text-slate-100">Commander Hero</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 font-mono">
                      Cost: {currentLineupCommander.cost} Pts
                    </span>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800 mb-3">
                    <img
                      src={currentLineupCommander.image}
                      alt={currentLineupCommander.name}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0"
                    />
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-100 truncate">{currentLineupCommander.name}</span>
                        {getElementBadge(currentLineupCommander.element)}
                      </div>
                      <span className="text-[10px] text-amber-400 font-semibold block">{currentLineupCommander.title}</span>
                      <div className="text-[10px] text-sky-400 font-mono-nums flex items-center gap-1 mt-0.5">
                        <Brain className="w-3 h-3" />
                        <span>INT {currentLineupCommander.intel} (+{lineupTroopCap.intelBonus.toLocaleString()} cap)</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 mb-3">
                    <span className="text-slate-300 font-semibold block mb-0.5">Card Troop Generation:</span>
                    <span className="text-emerald-400 font-mono-nums">
                      Musters +{currentLineupCommander.troopGeneration.yieldPerCycle} {currentLineupCommander.troopGeneration.troopType}s per cycle
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Swap Commander:</label>
                  <select
                    value={lineupCommanderId}
                    onChange={(e) => {
                      sound.playClick();
                      setLineupCommanderId(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl p-2 cursor-pointer font-mono-nums"
                  >
                    {cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.cost} Pts · INT {c.intel} · {c.rarity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Slot 2: Vanguard Battalion Card */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 text-xs flex items-center justify-center font-mono font-bold">2</span>
                      <h4 className="text-sm font-bold text-slate-100">Vanguard Battalion</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 font-mono">
                      Cost: {currentLineupBattalion?.cost || 0} Pts
                    </span>
                  </div>

                  {currentLineupBattalion ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                        <img
                          src={currentLineupBattalion.image}
                          alt={currentLineupBattalion.name}
                          className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0"
                        />
                        <div className="overflow-hidden">
                          <span className="text-sm font-bold text-slate-100 block truncate">{currentLineupBattalion.name}</span>
                          <span className="text-[10px] text-amber-400 font-mono-nums">
                            +{currentLineupBattalion.bonusAtkPercent}% ATK · +{currentLineupBattalion.bonusDefPercent}% DEF
                          </span>
                          <div className="text-[10px] text-emerald-400 font-mono-nums mt-0.5">
                            Musters +{currentLineupBattalion.troopGeneration.yieldPerCycle}/cyc
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-emerald-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                        {currentLineupBattalion.specialPerk}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-950 p-6 rounded-2xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                      No battalion equipped
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Swap Battalion:</label>
                  <select
                    value={lineupBattalionId || ''}
                    onChange={(e) => {
                      sound.playClick();
                      setLineupBattalionId(e.target.value || null);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl p-2 cursor-pointer font-mono-nums"
                  >
                    <option value="">None</option>
                    {unitCards.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.cost} Pts · +{u.bonusAtkPercent}% ATK)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Slot 3: Tactical Support Card */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-mono font-bold">3</span>
                      <h4 className="text-sm font-bold text-slate-100">Tactical Support</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 font-mono">
                      Cost: {currentLineupSupport?.cost || 0} Pts
                    </span>
                  </div>

                  {currentLineupSupport ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                        <img
                          src={currentLineupSupport.image}
                          alt={currentLineupSupport.name}
                          className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0"
                        />
                        <div className="overflow-hidden">
                          <span className="text-sm font-bold text-slate-100 block truncate">{currentLineupSupport.name}</span>
                          <span className="text-[10px] text-amber-400 font-mono-nums">
                            +{currentLineupSupport.bonusSpeedPercent}% SPD · {currentLineupSupport.targetUnitType}
                          </span>
                          <div className="text-[10px] text-emerald-400 font-mono-nums mt-0.5">
                            Musters +{currentLineupSupport.troopGeneration.yieldPerCycle}/cyc
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-emerald-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                        {currentLineupSupport.specialPerk}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-950 p-6 rounded-2xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                      Empty Support Slot (0 Pts)
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Swap Support:</label>
                  <select
                    value={lineupSupportId || ''}
                    onChange={(e) => {
                      sound.playClick();
                      setLineupSupportId(e.target.value || null);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl p-2 cursor-pointer font-mono-nums"
                  >
                    <option value="">None (Empty Slot)</option>
                    {unitCards.filter((u) => u.id !== lineupBattalionId).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.cost} Pts)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Troops Created by Collected Cards Roster */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">Troops Created by Collected Cards</h4>
                    <span className="text-[11px] text-slate-400">All unlocked cards continuously muster troops into imperial reserves</span>
                  </div>
                </div>
                <span className="text-xs font-mono-nums font-bold text-emerald-400">
                  +{totalTroopYields.totalPerCycle.toLocaleString()} Total / Cycle
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono-nums text-xs">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Legionnaires</span>
                  <strong className="text-emerald-400 font-bold text-sm">+{totalTroopYields.legionnaire}</strong>
                  <div className="text-[10px] text-slate-500 mt-0.5">Heavy Infantry</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Marksmen</span>
                  <strong className="text-emerald-400 font-bold text-sm">+{totalTroopYields.archer}</strong>
                  <div className="text-[10px] text-slate-500 mt-0.5">Composite Bows</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Gryphon Cavalry</span>
                  <strong className="text-emerald-400 font-bold text-sm">+{totalTroopYields.gryphon}</strong>
                  <div className="text-[10px] text-slate-500 mt-0.5">Winged Knights</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Siege Trebuchets</span>
                  <strong className="text-emerald-400 font-bold text-sm">+{totalTroopYields.catapult}</strong>
                  <div className="text-[10px] text-slate-500 mt-0.5">Wall Breakers</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* Category 1: Hero Commanders                              */}
        {/* ======================================================== */}
        {activeCategory === 'commanders' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Card Roster Grid */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {cards.map((card) => {
                const isSelected = inspectCommander?.id === card.id;

                return (
                  <div
                    key={card.id}
                    onClick={() => {
                      sound.playClick();
                      setInspectCommander(card);
                      onSelectCard(card.id);
                    }}
                    className={`relative rounded-2xl overflow-hidden border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-400 ring-2 ring-amber-400 shadow-xl scale-[1.02]'
                        : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-slate-950">
                      <img
                        src={card.image}
                        alt={card.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/40" />

                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                        {getElementBadge(card.element)}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                          COST {card.cost}p
                        </span>
                      </div>

                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs font-mono-nums">
                        <span className="font-bold text-amber-300">Lv.{card.level}</span>
                        <span className="text-[10px] text-sky-300">INT {card.intel}</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate">{card.name}</h4>
                      <span className="text-[10px] text-slate-400 block truncate">{card.title}</span>
                      <div className="mt-1.5 flex items-center justify-between">
                        {getRarityBadge(card.rarity)}
                        <span className="text-[10px] text-emerald-400 font-mono-nums">+{card.troopGeneration.yieldPerCycle}/cyc</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Commander Detail Inspector & Skill Slots */}
            {inspectCommander && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-slate-100 font-cinzel">{inspectCommander.name}</h3>
                        {getElementBadge(inspectCommander.element)}
                      </div>
                      <span className="text-xs text-amber-400 font-semibold">{inspectCommander.title}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getRarityBadge(inspectCommander.rarity)}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 font-mono">
                        COST {inspectCommander.cost} PTS
                      </span>
                      {(() => {
                        const bal = evaluateCommanderBalance(inspectCommander);
                        return (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/40">
                            TIER {bal.balanceTier} · {bal.pointEfficiency} PTS/PT
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 my-3 leading-relaxed">
                    {inspectCommander.bio}
                  </p>

                  <div className="grid grid-cols-2 gap-2 my-3 text-xs font-mono-nums">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">Combat ATK</span>
                      <strong className="text-rose-400 font-bold">{inspectCommander.atk}</strong>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">Intelligence (INT)</span>
                      <strong className="text-sky-400 font-bold">{inspectCommander.intel}</strong>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">Standing Vanguard</span>
                      <strong className="text-amber-300 font-bold">{inspectCommander.currentTroops ?? 100} Troops</strong>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">Muster Yield</span>
                      <strong className="text-emerald-400 font-bold">+{inspectCommander.troopGeneration.yieldPerCycle}/cyc</strong>
                    </div>
                  </div>

                  {/* Skills Loadout */}
                  <div className="my-4">
                    <span className="text-xs font-bold text-slate-200 block mb-2">
                      Active Skill Loadout (1 Innate + 2 Customizable)
                    </span>

                    <div className="bg-slate-950 p-3 rounded-xl border border-amber-600/40 mb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                          Signature Innate Skill
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono-nums">
                          CD: {inspectCommander.signatureSkill.cooldown}s
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-100 mt-0.5">
                        {inspectCommander.signatureSkill.name} (Lv.{inspectCommander.signatureSkill.level})
                      </h5>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {inspectCommander.signatureSkill.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[0, 1].map((slotIdx) => {
                        const equipped = inspectCommander.equippedSkills[slotIdx];

                        return (
                          <div
                            key={slotIdx}
                            onClick={() => handleOpenEquipSkillModal(slotIdx)}
                            className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-amber-500/60 cursor-pointer transition-all flex flex-col justify-between min-h-[90px]"
                          >
                            <span className="text-[10px] text-slate-500 font-semibold uppercase">
                              Custom Slot {slotIdx + 1}
                            </span>
                            {equipped ? (
                              <div>
                                <div className="text-xs font-bold text-amber-300">{equipped.name}</div>
                                <div className="text-[10px] text-slate-400 line-clamp-1">{equipped.effect}</div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                                <Plus className="w-3.5 h-3.5" />
                                <span>Equip Skill</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      sound.playFanfare();
                      onLevelUpCard(inspectCommander.id);
                    }}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <ArrowUp className="w-4 h-4 text-emerald-400" />
                    <span>Train (+EXP)</span>
                  </button>

                  <button
                    onClick={() => {
                      sound.playMagic();
                      onAscendCard(inspectCommander.id);
                    }}
                    className="py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <Star className="w-4 h-4 fill-slate-950" />
                    <span>Ascend Star</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* Category 2: Unit Upgrade Cards                           */}
        {/* ======================================================== */}
        {activeCategory === 'units' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {unitCards.map((card) => {
                const isSelected = inspectUnitCard?.id === card.id;

                return (
                  <div
                    key={card.id}
                    onClick={() => {
                      sound.playClick();
                      setInspectUnitCard(card);
                    }}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-950/20 border-amber-500 ring-1 ring-amber-500 shadow-xl'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono-nums">
                          {card.targetUnitType.toUpperCase()} BATTALION
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 font-mono">
                            COST {card.cost}p
                          </span>
                          {getRarityBadge(card.rarity)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={card.image}
                          alt={card.name}
                          className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-slate-100">{card.name}</h4>
                          <span className="text-xs text-slate-400 font-mono-nums">Tier Lv.{card.level}</span>
                          <div className="text-[10px] text-emerald-400 font-mono-nums mt-0.5">
                            Musters +{card.troopGeneration.yieldPerCycle} {card.troopGeneration.troopType}s/cycle
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                        {card.description}
                      </p>

                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs font-mono-nums text-emerald-400 font-semibold mb-3">
                        {card.specialPerk}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <div className="flex items-center gap-3 text-xs font-mono-nums">
                        <span className="text-rose-400 font-bold">+{card.bonusAtkPercent}% ATK</span>
                        <span className="text-sky-400 font-bold">+{card.bonusDefPercent}% DEF</span>
                        <span className="text-emerald-400 font-bold">+{card.bonusSpeedPercent}% SPD</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          sound.playClash();
                          onToggleUnitCard(card.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          card.isEquipped
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {card.isEquipped ? 'Equipped ✓' : 'Equip Card'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Unit Battalions Synergy Inspector */}
            {inspectUnitCard && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="pb-3 border-b border-slate-800 flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                        Battalion Specialization
                      </span>
                      <h3 className="text-lg font-bold text-slate-100">{inspectUnitCard.name}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 font-mono">
                      COST {inspectUnitCard.cost} PTS
                    </span>
                  </div>

                  <div className="my-4">
                    <img
                      src={inspectUnitCard.image}
                      alt={inspectUnitCard.name}
                      className="w-full h-44 rounded-2xl object-cover border border-slate-800 mb-3"
                    />

                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono-nums">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Target Formation</span>
                        <strong className="text-slate-200 capitalize">{inspectUnitCard.targetUnitType}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Troop Muster Production</span>
                        <strong className="text-emerald-400 font-bold">
                          +{inspectUnitCard.troopGeneration.yieldPerCycle} {inspectUnitCard.troopGeneration.troopType}s/cyc
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Assigned Lineup Cost</span>
                        <strong className="text-amber-300 font-bold">{inspectUnitCard.cost} Points (Max 15)</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    sound.playClash();
                    onToggleUnitCard(inspectUnitCard.id);
                  }}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {inspectUnitCard.isEquipped ? 'Unequip Battalion' : 'Equip into Active Formation'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* Category 3: Economic Doctrines                           */}
        {/* ======================================================== */}
        {activeCategory === 'economic' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {economicCards.map((card) => {
              return (
                <div
                  key={card.id}
                  className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
                    card.isCouncilActive
                      ? 'bg-amber-950/20 border-amber-500 ring-1 ring-amber-500 shadow-xl'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono-nums">
                        {card.doctrineCategory.replace('_', ' ')}
                      </span>
                      {getRarityBadge(card.rarity)}
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={card.image}
                        alt={card.name}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{card.name}</h4>
                        <span className="text-xs text-emerald-400 font-semibold">
                          {card.isCouncilActive ? 'Active on Imperial Council' : 'Available Doctrine'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      {card.description}
                    </p>

                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs font-mono-nums text-emerald-400 font-semibold mb-3">
                      {card.productionBoost.food && <span>+{card.productionBoost.food}% Food · </span>}
                      {card.productionBoost.timber && <span>+{card.productionBoost.timber}% Timber · </span>}
                      {card.productionBoost.mana && <span>+{card.productionBoost.mana}% Mana · </span>}
                      {card.marchSpeedBoost && <span>+{card.marchSpeedBoost}% March Speed</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      sound.playFanfare();
                      onToggleEconomicCard(card.id);
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      card.isCouncilActive
                        ? 'bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/60'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                    }`}
                  >
                    {card.isCouncilActive ? 'Remove from Council' : 'Appoint to Imperial Council'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ======================================================== */}
        {/* Category 4: Skill Tomes                                  */}
        {/* ======================================================== */}
        {activeCategory === 'skills' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono-nums">
                      {skill.type.toUpperCase()} SKILL TIER {skill.level}
                    </span>
                    {getElementBadge(skill.element)}
                  </div>

                  <h4 className="text-base font-bold text-slate-100">{skill.name}</h4>
                  <p className="text-xs text-slate-300 my-2 leading-relaxed">
                    {skill.description}
                  </p>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs font-mono-nums text-amber-300 mb-3">
                    Effect: {skill.effect}
                    {skill.troopCapBonus && (
                      <span className="block text-sky-400 mt-0.5">
                        Expanded Troop Command: +{skill.troopCapBonus.toLocaleString()} Troops
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {skill.synergyTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-950 text-slate-400 border border-slate-800 font-semibold"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ======================================================== */}
        {/* Category 5: Card Transmutation Forge                     */}
        {/* ======================================================== */}
        {activeCategory === 'forge' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Alchemical Transmutation Crucible
              </span>
              <h3 className="text-xl font-bold text-slate-100 mt-1">
                Synthesize Elite Cards & Ascended Tomes
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Combine surplus arcana, materials, and gold to synthesize high-tier cards and upgrade seals.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Hero Ascendancy Seal</h4>
                  <p className="text-xs text-slate-400 mt-1">Required to awaken 5★ star limits on legendary commanders.</p>
                  <div className="text-xs font-mono-nums text-amber-300 mt-3">Cost: 🪙 5,000 Gold + 💎 50 Rubies</div>
                </div>
                <button
                  onClick={() => handleCraft('ascend_seal', 'Hero Ascendancy Seal')}
                  className="mt-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Synthesize Seal
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Tempest Battletome</h4>
                  <p className="text-xs text-slate-400 mt-1">Imbues battalions with +25% lightning strike damage.</p>
                  <div className="text-xs font-mono-nums text-amber-300 mt-3">Cost: 🪙 3,500 Gold + 💎 30 Rubies</div>
                </div>
                <button
                  onClick={() => handleCraft('battletome', 'Tempest Battletome')}
                  className="mt-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Transmute Tome
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Golden Harvest Seal</h4>
                  <p className="text-xs text-slate-400 mt-1">Unlocks double production yields on active council doctrines.</p>
                  <div className="text-xs font-mono-nums text-amber-300 mt-3">Cost: 🪙 4,000 Gold + 💎 40 Rubies</div>
                </div>
                <button
                  onClick={() => handleCraft('awaken_seal', 'Golden Harvest Doctrine')}
                  className="mt-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Awaken Doctrine
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* Category 6: Ancient Altar Summon Gate                    */}
        {/* ======================================================== */}
        {activeCategory === 'altar' && (
          <div className="relative rounded-3xl overflow-hidden border border-amber-500/40 bg-slate-900 p-6 sm:p-10 shadow-2xl text-center">
            <div className="max-w-xl mx-auto">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-4 shadow-xl">
                <Sparkles className="w-10 h-10 animate-pulse" />
              </div>

              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Primordial Summoning Nexus
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-100 font-cinzel my-1">
                Altar of the Ancient Titans
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                Channel crystallized Rubies into the Aether Gate to summon legendary 5★ commanders, battalion upgrade cards, and rare economic doctrines.
              </p>

              <div className="flex items-center justify-center gap-6 mb-8 text-xs font-mono-nums">
                <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                  <Gem className="w-4 h-4 text-rose-400" />
                  <span className="text-slate-300">Your Rubies:</span>
                  <strong className="text-rose-400 font-bold">{rubies.toLocaleString()}</strong>
                </div>
                <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-300">Pity Counter:</span>
                  <strong className="text-amber-400 font-bold">8 / 10</strong>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  disabled={rubies < 150}
                  onClick={() => handleTriggerSummon(1)}
                  className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    rubies >= 150
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 active:scale-95 shadow-md'
                      : 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed'
                  }`}
                >
                  <Gem className="w-4 h-4 text-rose-400" />
                  <span>Summon 1x (150 Rubies)</span>
                </button>

                <button
                  disabled={rubies < 1350}
                  onClick={() => handleTriggerSummon(10)}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    rubies >= 1350
                      ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 shadow-xl shadow-amber-500/25 active:scale-95'
                      : 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  <span>Summon 10x (1,350 Rubies · 10% Off)</span>
                </button>
              </div>

              {/* Reveal Modal */}
              {summonResult && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                  <div className="max-w-md w-full bg-slate-900 border border-amber-500/80 rounded-3xl p-6 text-center shadow-2xl animate-in zoom-in-95">
                    <Sparkles className="w-12 h-12 text-amber-400 mx-auto mb-3 animate-spin" />
                    <h3 className="text-xl font-black text-amber-300 font-cinzel">Summoning Ritual Concluded</h3>
                    <p className="text-xs text-slate-300 mb-4">You have forged destiny with new card spirits!</p>

                    <div className="grid grid-cols-2 gap-2 mb-5">
                      {summonResult.slice(0, 4).map((c, i) => (
                        <div key={i} className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-left flex items-center gap-2">
                          <img src={c.image} alt={c.cardName} className="w-9 h-9 rounded-lg object-cover" />
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-slate-100 truncate">{c.cardName}</div>
                            <div className="text-[10px] text-amber-400">{c.cardType}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setSummonResult(null)}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Collect All Cards
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Equip Skill to Slot */}
      {isEquipSkillModalOpen && inspectCommander && selectedSlotIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">
                Equip Skill into Slot {selectedSlotIndex + 1}
              </h3>
              <button
                onClick={() => setIsEquipSkillModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 my-4 max-h-72 overflow-y-auto">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  onClick={() => handleSelectSkillToEquip(skill)}
                  className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-100">{skill.name}</div>
                    <div className="text-[11px] text-slate-400">{skill.effect}</div>
                    {skill.troopCapBonus && (
                      <span className="text-[10px] text-sky-400 font-mono-nums block mt-0.5">
                        +{skill.troopCapBonus.toLocaleString()} Troops Command Limit
                      </span>
                    )}
                  </div>
                  {getElementBadge(skill.element)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
