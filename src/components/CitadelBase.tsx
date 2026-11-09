import React, { useState } from 'react';
import { 
  Building, 
  TroopUnit, 
  ResearchTech 
} from '../game/types';
import { sound } from '../game/audio';
import { 
  Castle, 
  Hammer, 
  Users, 
  GraduationCap, 
  Wheat, 
  Trees, 
  Boxes, 
  Anvil, 
  Sparkles, 
  Coins, 
  Gem, 
  Clock, 
  ArrowUpCircle, 
  Zap, 
  ShieldCheck,
  ChevronRight,
  Plus
} from 'lucide-react';

interface CitadelBaseProps {
  buildings: Building[];
  troops: TroopUnit[];
  techs: ResearchTech[];
  resources: {
    food: number;
    timber: number;
    stone: number;
    iron: number;
    mana: number;
    gold: number;
    rubies: number;
  };
  onUpgradeBuilding: (buildingId: string) => void;
  onInstantCompleteUpgrade: (buildingId: string) => void;
  onTrainTroops: (troopId: string, count: number) => void;
  onResearchTech: (techId: string) => void;
}

export const CitadelBase: React.FC<CitadelBaseProps> = ({
  buildings,
  troops,
  techs,
  resources,
  onUpgradeBuilding,
  onInstantCompleteUpgrade,
  onTrainTroops,
  onResearchTech,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'structures' | 'troops' | 'research'>('structures');
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(buildings[0]);
  const [trainAmounts, setTrainAmounts] = useState<{ [key: string]: number }>({
    tr_legion: 100,
    tr_archer: 100,
    tr_gryphon: 50,
    tr_catapult: 10,
  });

  const handleSelectBuilding = (b: Building) => {
    sound.playClick(600);
    setSelectedBuilding(b);
  };

  const canAffordUpgrade = (cost: Building['upgradeCost']) => {
    return (
      resources.food >= cost.food &&
      resources.timber >= cost.timber &&
      resources.stone >= cost.stone &&
      resources.iron >= cost.iron &&
      resources.gold >= cost.gold
    );
  };

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] pt-14 pb-16 overflow-y-auto bg-slate-950 p-3 sm:p-6 select-none">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Citadel Header & Viewport Banner */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl p-5 sm:p-6">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-slate-950 pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
                <Castle className="w-4 h-4" />
                <span>Imperial Sovereign Bastion</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-100 font-cinzel tracking-wide">
                Citadel of the Eternal Vanguard
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Upgrade production nodes, recruit elite battalions, and research military tactics to expand sovereign dominion across Aethelgard.
              </p>
            </div>

            {/* Sub-tab Navigation (Structures, Troops, Research) */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 shrink-0">
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveSubTab('structures');
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeSubTab === 'structures'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Hammer className="w-3.5 h-3.5" />
                <span>Structures</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setActiveSubTab('troops');
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeSubTab === 'troops'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Troops</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setActiveSubTab('research');
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeSubTab === 'research'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Academy Tech</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Structures & Upgrades */}
        {activeSubTab === 'structures' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left 2 Cols: Building Grid */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {buildings.map((b) => {
                const isSelected = selectedBuilding?.id === b.id;
                const affordable = canAffordUpgrade(b.upgradeCost);

                return (
                  <div
                    key={b.id}
                    onClick={() => handleSelectBuilding(b)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-950/30 border-amber-500 ring-1 ring-amber-500 shadow-lg'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400 shadow">
                          <Castle className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-100">{b.name}</h4>
                          <span className="text-xs text-amber-400 font-mono-nums font-semibold">
                            Level {b.level} / {b.maxLevel}
                          </span>
                        </div>
                      </div>

                      {b.isUpgrading ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          Upgrading
                        </span>
                      ) : (
                        affordable && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400" title="Ready to Upgrade" />
                        )
                      )}
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 mt-3">
                      {b.description}
                    </p>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300 font-mono-nums">
                      <span className="text-[11px] text-emerald-400 truncate max-w-[200px]">{b.benefit}</span>
                      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right 1 Col: Selected Building Upgrade Inspector */}
            {selectedBuilding && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between h-fit">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                        Structure Blueprint
                      </span>
                      <h3 className="text-lg font-bold text-slate-100">{selectedBuilding.name}</h3>
                    </div>
                    <div className="text-right font-mono-nums">
                      <span className="text-xs text-slate-400">Current</span>
                      <div className="text-base font-black text-amber-300">Lv.{selectedBuilding.level}</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 my-4 leading-relaxed">
                    {selectedBuilding.description}
                  </p>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 my-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Next Level Benefit (Lv.{selectedBuilding.level + 1})
                    </span>
                    <div className="text-xs text-emerald-400 font-semibold">
                      {selectedBuilding.benefit}
                    </div>
                  </div>

                  {/* Upgrade Costs */}
                  <div className="my-4">
                    <span className="text-xs font-semibold text-slate-300 block mb-2">
                      Required Upgrade Provisions
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono-nums">
                      <div className={`p-2 rounded-lg border flex items-center justify-between ${resources.food >= selectedBuilding.upgradeCost.food ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-red-950/30 border-red-800/50 text-red-300'}`}>
                        <span className="flex items-center gap-1.5"><Wheat className="w-3.5 h-3.5 text-amber-400" /> Food</span>
                        <span className="tabular-nums font-bold">{selectedBuilding.upgradeCost.food.toLocaleString()}</span>
                      </div>
                      <div className={`p-2 rounded-lg border flex items-center justify-between ${resources.timber >= selectedBuilding.upgradeCost.timber ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-red-950/30 border-red-800/50 text-red-300'}`}>
                        <span className="flex items-center gap-1.5"><Trees className="w-3.5 h-3.5 text-emerald-400" /> Timber</span>
                        <span className="tabular-nums font-bold">{selectedBuilding.upgradeCost.timber.toLocaleString()}</span>
                      </div>
                      <div className={`p-2 rounded-lg border flex items-center justify-between ${resources.stone >= selectedBuilding.upgradeCost.stone ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-red-950/30 border-red-800/50 text-red-300'}`}>
                        <span className="flex items-center gap-1.5"><Boxes className="w-3.5 h-3.5 text-stone-400" /> Stone</span>
                        <span className="tabular-nums font-bold">{selectedBuilding.upgradeCost.stone.toLocaleString()}</span>
                      </div>
                      <div className={`p-2 rounded-lg border flex items-center justify-between ${resources.iron >= selectedBuilding.upgradeCost.iron ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-red-950/30 border-red-800/50 text-red-300'}`}>
                        <span className="flex items-center gap-1.5"><Anvil className="w-3.5 h-3.5 text-sky-400" /> Iron</span>
                        <span className="tabular-nums font-bold">{selectedBuilding.upgradeCost.iron.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upgrade Button / Instant Rush */}
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  {selectedBuilding.isUpgrading ? (
                    <button
                      onClick={() => onInstantCompleteUpgrade(selectedBuilding.id)}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95 transition-all cursor-pointer"
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      <span>Instant Rush (30 Rubies)</span>
                    </button>
                  ) : (
                    <button
                      disabled={!canAffordUpgrade(selectedBuilding.upgradeCost)}
                      onClick={() => {
                        sound.playClash();
                        onUpgradeBuilding(selectedBuilding.id);
                      }}
                      className={`w-full py-3 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                        canAffordUpgrade(selectedBuilding.upgradeCost)
                          ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 shadow-amber-500/20 active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <ArrowUpCircle className="w-4 h-4" />
                      <span>Upgrade to Level {selectedBuilding.level + 1} ({selectedBuilding.upgradeDuration}s)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Troop Recruitment */}
        {activeSubTab === 'troops' && (
          <div className="space-y-4">
            <div className="bg-amber-950/40 border border-amber-500/40 p-3.5 rounded-2xl flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  <strong>Imperial Military Doctrine:</strong> Standing legions must be recruited and trained in the barracks. Hero commanders begin with 100 vanguard troops until sent into battle.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {troops.map((unit) => {
              const currentAmt = trainAmounts[unit.id] || 25;
              const totalCost = {
                food: unit.cost.food * currentAmt,
                timber: unit.cost.timber * currentAmt,
                iron: unit.cost.iron * currentAmt,
                gold: unit.cost.gold * currentAmt,
              };
              const canAfford =
                resources.food >= totalCost.food &&
                resources.timber >= totalCost.timber &&
                resources.iron >= totalCost.iron &&
                resources.gold >= totalCost.gold;

              return (
                <div key={unit.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div>
                        <h3 className="text-base font-bold text-slate-100">{unit.name}</h3>
                        <p className="text-xs text-slate-400">{unit.description}</p>
                      </div>
                      <div className="text-right font-mono-nums">
                        <span className="text-xs text-slate-400">Standing Force</span>
                        <div className="text-base font-black text-amber-300">{unit.count.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-3 text-xs font-mono-nums">
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[10px] block">Combat ATK</span>
                        <strong className="text-rose-400 font-bold">{unit.atk}</strong>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[10px] block">Defense Armor</span>
                        <strong className="text-sky-400 font-bold">{unit.def}</strong>
                      </div>
                    </div>

                    {/* Quantity Selector */}
                    <div className="my-3">
                      <div className="flex items-center justify-between text-xs font-mono-nums mb-1">
                        <span className="text-slate-300">Recruit Batch:</span>
                        <span className="font-bold text-amber-300">{currentAmt.toLocaleString()} Units</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {[25, 50, 100, 250].map((amt) => (
                          <button
                            key={amt}
                            onClick={() => {
                              sound.playClick();
                              setTrainAmounts({ ...trainAmounts, [unit.id]: amt });
                            }}
                            className={`flex-1 py-1 text-xs font-mono-nums rounded-lg border transition-colors cursor-pointer ${
                              currentAmt === amt
                                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            +{amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs font-mono-nums flex items-center justify-between text-slate-300">
                      <span>Provisions:</span>
                      <span className="text-amber-300 font-semibold">
                        🌾 {totalCost.food.toLocaleString()} · 🌲 {totalCost.timber.toLocaleString()} · ⚙ {totalCost.iron.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    disabled={!canAfford}
                    onClick={() => {
                      sound.playDrum();
                      onTrainTroops(unit.id, currentAmt);
                    }}
                    className={`w-full mt-4 py-3 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                      canAfford
                        ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 shadow-amber-500/20 active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Conscript {currentAmt} {unit.name}</span>
                  </button>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* Tab 3: Academy Tech Tree */}
        {activeSubTab === 'research' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {techs.map((tech) => {
              const canAffordMana = resources.mana >= tech.cost.mana && resources.gold >= tech.cost.gold;

              return (
                <div key={tech.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-100">{tech.name}</h3>
                          <span className="text-xs text-purple-400 font-mono-nums font-semibold uppercase">
                            {tech.category} · Level {tech.level} / {tech.maxLevel}
                          </span>
                        </div>
                      </div>
                      {tech.isResearching && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                          In Progress
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 my-3 leading-relaxed">
                      {tech.description}
                    </p>

                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs font-mono-nums text-emerald-400 font-semibold mb-3">
                      Active Mastery: {tech.effect}
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs font-mono-nums flex items-center justify-between text-slate-400">
                      <span>Research Cost:</span>
                      <span className="text-purple-300 font-bold">
                        🔮 {tech.cost.mana} Aether · 🪙 {tech.cost.gold} Gold
                      </span>
                    </div>
                  </div>

                  <button
                    disabled={tech.isResearching || !canAffordMana}
                    onClick={() => {
                      sound.playMagic();
                      onResearchTech(tech.id);
                    }}
                    className={`w-full mt-4 py-3 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                      !tech.isResearching && canAffordMana
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30 active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{tech.isResearching ? 'Synthesizing Blueprint...' : `Research Level ${tech.level + 1}`}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
