/**
 * Shattered Dominion - Bestiary & Creature Codex UI
 */

import React, { useState, useMemo } from 'react';
import { CreatureCard, CreatureFamily, CreatureElement, CreatureRarity } from '../game/types';
import { Shield, Zap, Sparkles, Search, Filter, X, Award, Flame, Eye, ArrowUpDown, Layers, Heart, Swords, ChevronRight } from 'lucide-react';
import { calculateCreatureStatsAtLevel, calculateCreatureSynergies } from '../game/creatureBalance';

interface BestiaryModalProps {
  creatures: CreatureCard[]; // All 432 loaded creatures
  playerCreatures: CreatureCard[]; // Creatures owned by player
  onClose: () => void;
  onSelectCreature?: (creature: CreatureCard) => void;
}

const FAMILIES: CreatureFamily[] = [
  'Dragons', 'Undead', 'Elementals', 'Demons', 'Beasts', 'Celestials', 
  'Swarmkin', 'Abyssals', 'Humanoids', 'Giants', 'Fae', 'Mechanicals'
];

const ELEMENTS: CreatureElement[] = [
  'Fire', 'Water', 'Earth', 'Wind', 'Lightning', 'Frost', 
  'Nature', 'Shadow', 'Light', 'Arcane', 'Poison', 'Void'
];

const RARITIES: CreatureRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];

const RARITY_COLORS: Record<CreatureRarity, { bg: string; text: string; border: string; glow: string }> = {
  common: { bg: 'bg-slate-800/80', text: 'text-slate-300', border: 'border-slate-600', glow: '' },
  uncommon: { bg: 'bg-emerald-950/80', text: 'text-emerald-300', border: 'border-emerald-600', glow: '' },
  rare: { bg: 'bg-blue-950/80', text: 'text-blue-300', border: 'border-blue-500', glow: 'shadow-blue-500/20' },
  epic: { bg: 'bg-purple-950/80', text: 'text-purple-300', border: 'border-purple-500', glow: 'shadow-purple-500/30' },
  legendary: { bg: 'bg-amber-950/90', text: 'text-amber-300', border: 'border-amber-500', glow: 'shadow-amber-500/40' },
  mythical: { bg: 'bg-rose-950/90', text: 'text-rose-300', border: 'border-rose-500', glow: 'shadow-rose-500/50 shadow-lg animate-pulse' },
};

export const BestiaryModal: React.FC<BestiaryModalProps> = ({
  creatures,
  playerCreatures,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<string>('all');
  const [selectedElement, setSelectedElement] = useState<string>('all');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [selectedCreature, setSelectedCreature] = useState<CreatureCard | null>(null);
  const [previewLevel, setPreviewLevel] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'catalog' | 'synergies'>('catalog');

  const ownedIds = new Set(playerCreatures.map(c => c.id));
  const playerSynergies = useMemo(() => calculateCreatureSynergies(playerCreatures), [playerCreatures]);

  const filteredCreatures = creatures.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.id.toLowerCase().includes(searchQuery.toLowerCase()) || c.signatureAbility.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFamily = selectedFamily === 'all' || c.family === selectedFamily;
    const matchesElement = selectedElement === 'all' || c.element === selectedElement;
    const matchesRarity = selectedRarity === 'all' || c.rarity === selectedRarity;
    const matchesOwned = !ownedOnly || ownedIds.has(c.id);
    return matchesSearch && matchesFamily && matchesElement && matchesRarity && matchesOwned;
  });

  const collectedCount = creatures.filter(c => ownedIds.has(c.id)).length;
  const totalCount = creatures.length || 432;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/40 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 p-5 border-b border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-amber-400 tracking-wider flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              SHATTERED DOMINION BESTIARY CODEX
            </h2>
            <p className="text-sm text-slate-400">
              Discovered: <span className="text-amber-300 font-bold">{collectedCount}</span> / {totalCount} Creatures ({Math.round((collectedCount / totalCount) * 100)}% Collection Rate) • Active Synergy Score: <span className="text-emerald-400 font-bold">+{playerSynergies.totalSynergyScore} pts</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${activeTab === 'catalog' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'}`}
              >
                Codex ({filteredCreatures.length})
              </button>
              <button
                onClick={() => setActiveTab('synergies')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${activeTab === 'synergies' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'}`}
              >
                <Layers className="w-3.5 h-3.5" />
                Resonances ({playerSynergies.activeBuffSummaries.length})
              </button>
            </div>
            <button 
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors border border-slate-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Filters Bar (Only on catalog tab) */}
        {activeTab === 'catalog' && (
          <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              {/* Search */}
              <div className="relative min-w-[240px] flex-1 max-w-xs">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, ID, ability..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Family Filter */}
              <select
                value={selectedFamily}
                onChange={(e) => setSelectedFamily(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Families (12)</option>
                {FAMILIES.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>

              {/* Element Filter */}
              <select
                value={selectedElement}
                onChange={(e) => setSelectedElement(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Elements (12)</option>
                {ELEMENTS.map(el => (
                  <option key={el} value={el}>{el}</option>
                ))}
              </select>

              {/* Rarity Filter */}
              <select
                value={selectedRarity}
                onChange={(e) => setSelectedRarity(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Rarities (6)</option>
                {RARITIES.map(r => (
                  <option key={r} value={r}>{r.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Owned Toggle */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700 text-sm text-slate-300 hover:border-amber-500/50">
              <input
                type="checkbox"
                checked={ownedOnly}
                onChange={(e) => setOwnedOnly(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
              />
              Owned Only
            </label>
          </div>
        )}

        {/* Tab 1: Codex Catalog Grid */}
        {activeTab === 'catalog' && (
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredCreatures.map(creature => {
              const isOwned = ownedIds.has(creature.id);
              const style = RARITY_COLORS[creature.rarity] || RARITY_COLORS.common;

              return (
                <div
                  key={creature.id}
                  onClick={() => {
                    setSelectedCreature(creature);
                    setPreviewLevel(creature.level || 1);
                  }}
                  className={`group relative rounded-xl border p-3 flex flex-col justify-between transition-all duration-200 cursor-pointer hover:scale-102 hover:shadow-lg ${style.bg} ${style.border} ${style.glow} ${!isOwned ? 'opacity-60 grayscale-[40%]' : ''}`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-mono text-slate-400">{creature.id}</span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${style.text} bg-slate-900/60 border border-slate-700`}>
                        {creature.rarity}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-white group-hover:text-amber-300 line-clamp-1">
                      {creature.name}
                    </h3>
                    
                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <span className="text-amber-400">{creature.family}</span> • <span>{creature.element}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Tier {creature.tier}</span>
                    {isOwned ? (
                      <span className="text-emerald-400 font-bold text-[10px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">OWNED</span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">LOCKED</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Synergy & Resonance Chamber */}
        {activeTab === 'synergies' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="bg-slate-950/70 border border-amber-500/30 rounded-2xl p-5">
              <h3 className="text-lg font-black text-amber-400 flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Active Realm Resonances & Squad Harmonies
              </h3>
              <p className="text-sm text-slate-400">
                Resonances activate when multiple creatures sharing an element or family belong to your deployed forces.
              </p>
              {playerSynergies.activeBuffSummaries.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-3">
                  {playerSynergies.activeBuffSummaries.map((buff, idx) => (
                    <span key={idx} className="bg-emerald-950/80 text-emerald-300 border border-emerald-700 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      {buff}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-xs text-slate-500 italic bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  No squad resonances active yet. Collect duplicate elemental affinities (2+) or matching families (2+) to unlock team buffs!
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Elemental Conflux */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
                  <Flame className="w-4 h-4 text-rose-400" />
                  Elemental Resonance Confluxes
                </h4>
                <div className="space-y-2 text-xs">
                  {ELEMENTS.map(el => {
                    const ownedMatching = playerCreatures.filter(c => c.element === el).length;
                    return (
                      <div key={el} className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{el}</span>
                          <span className="text-[10px] text-slate-400">({ownedMatching} Deployed)</span>
                        </div>
                        <div className="text-[11px]">
                          {ownedMatching >= 4 ? (
                            <span className="text-amber-400 font-bold">Primal (+30% DMG)</span>
                          ) : ownedMatching === 3 ? (
                            <span className="text-sky-400 font-bold">Major (+20% DMG)</span>
                          ) : ownedMatching === 2 ? (
                            <span className="text-emerald-400 font-semibold">Minor (+10% DMG)</span>
                          ) : (
                            <span className="text-slate-500">Requires 2+</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Family Specialties */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-amber-400" />
                  Creature Family Convocations
                </h4>
                <div className="space-y-2 text-xs">
                  {FAMILIES.map(fam => {
                    const count = playerCreatures.filter(c => c.family === fam).length;
                    return (
                      <div key={fam} className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{fam}</span>
                            <span className="text-[10px] text-slate-400">({count} Owned)</span>
                          </div>
                        </div>
                        <div>
                          {count >= 2 ? (
                            <span className="text-emerald-400 font-bold">Active Buff</span>
                          ) : (
                            <span className="text-slate-500">Need 2+</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Creature Details Modal */}
        {selectedCreature && (() => {
          const stats = calculateCreatureStatsAtLevel(selectedCreature, previewLevel);

          return (
            <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button
                  onClick={() => setSelectedCreature(null)}
                  className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-800 border border-amber-500/40 flex items-center justify-center text-2xl font-black text-amber-400 shadow-inner shrink-0">
                    {selectedCreature.id.replace('SD-', '')}
                  </div>
                  <div>
                    <div className="text-xs font-mono text-slate-400">{selectedCreature.id} • Tier {selectedCreature.tier}</div>
                    <h3 className="text-xl font-black text-white">{selectedCreature.name}</h3>
                    <div className="text-sm text-amber-400 mt-0.5">{selectedCreature.family} ({selectedCreature.element})</div>
                  </div>
                </div>

                {/* Level Progression Curve Inspector */}
                <div className="bg-slate-950/90 p-4 rounded-xl border border-amber-500/30 mb-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Stat Curve Inspector
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">
                      Level {previewLevel} / 50 • Power {stats.combatRating.toLocaleString()}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={previewLevel}
                    onChange={(e) => setPreviewLevel(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-500 cursor-pointer mb-2"
                  />

                  <div className="flex justify-between items-center text-[10px]">
                    <div className="flex gap-1">
                      <button onClick={() => setPreviewLevel(1)} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 cursor-pointer">Lv.1</button>
                      <button onClick={() => setPreviewLevel(25)} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 cursor-pointer">Lv.25</button>
                      <button onClick={() => setPreviewLevel(50)} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 cursor-pointer">Lv.50 (Max)</button>
                    </div>
                    <span className="text-slate-400">Next EXP: {stats.expNeededNext.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-2 bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rarity:</span>
                    <span className="font-bold uppercase text-amber-300">{selectedCreature.rarity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Combat Role & Archetype:</span>
                    <span className="text-white">{selectedCreature.combatRole} / {selectedCreature.archetype}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Signature Ability:</span>
                    <span className="text-amber-400 font-semibold">{selectedCreature.signatureAbility}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Family Specialty:</span>
                    <span className="text-slate-300">{selectedCreature.familySpecialty}</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700">
                    <div className="text-[10px] text-slate-400">HP</div>
                    <div className="text-base font-bold text-rose-400">{stats.hp}</div>
                  </div>
                  <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700">
                    <div className="text-[10px] text-slate-400">Attack</div>
                    <div className="text-base font-bold text-amber-400">{stats.atk}</div>
                  </div>
                  <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700">
                    <div className="text-[10px] text-slate-400">Defense</div>
                    <div className="text-base font-bold text-blue-400">{stats.def}</div>
                  </div>
                  <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700">
                    <div className="text-[10px] text-slate-400">Speed</div>
                    <div className="text-base font-bold text-emerald-400">{stats.spd}</div>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => setSelectedCreature(null)}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-lg transition-colors text-sm cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
};
