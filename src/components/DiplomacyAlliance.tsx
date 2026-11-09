import React, { useState } from 'react';
import { DiplomaticFaction, TreatyType } from '../game/types';
import { sound } from '../game/audio';
import { 
  ScrollText, 
  Shield, 
  Swords, 
  Flag, 
  Eye, 
  Handshake, 
  Flame, 
  Coins, 
  CheckCircle, 
  X, 
  AlertTriangle,
  Users,
  Send,
  Zap,
  Radio
} from 'lucide-react';

interface DiplomacyAllianceProps {
  factions: DiplomaticFaction[];
  gold: number;
  onUpdateTreaty: (factionId: string, treatyType: TreatyType) => void;
  onLaunchEspionage: (factionId: string, missionType: string) => void;
  onStartAllianceRally: (targetFactionId: string) => void;
}

export const DiplomacyAlliance: React.FC<DiplomacyAllianceProps> = ({
  factions,
  gold,
  onUpdateTreaty,
  onLaunchEspionage,
  onStartAllianceRally,
}) => {
  const [activeTab, setActiveTab] = useState<'diplomacy' | 'alliance_war' | 'espionage'>('diplomacy');
  const [selectedFaction, setSelectedFaction] = useState<DiplomaticFaction>(factions[0]);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const handleSignTreaty = (treaty: TreatyType) => {
    sound.playFanfare();
    onUpdateTreaty(selectedFaction.id, treaty);
    setActionSuccessMsg(`Treaty [${treaty.toUpperCase()}] ratifying with ${selectedFaction.name}. Envoys dispatched!`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleEspionage = (mission: string) => {
    sound.playMagic();
    onLaunchEspionage(selectedFaction.id, mission);
    setActionSuccessMsg(`Covert Operative launched: "${mission}". Intel report arrives shortly!`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleRally = () => {
    sound.playDrum();
    onStartAllianceRally(selectedFaction.id);
    setActionSuccessMsg(`ALLIANCE WAR RALLY INITIATED! Guild horns sound across the continent!`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] pt-14 pb-16 overflow-y-auto bg-slate-950 p-3 sm:p-6 select-none">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Guild Header Banner */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-950/70 border border-red-500/50 flex items-center justify-center text-red-400 font-cinzel text-xl font-black shadow-lg">
                DRG
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-100 font-cinzel tracking-wide">
                    Order of the Crimson Dragon
                  </h2>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-600/40 px-2 py-0.5 rounded">
                    Rank #2
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono-nums mt-0.5">
                  <span>Grandmaster Valen</span>
                  <span aria-hidden="true">·</span>
                  <span>48 Sovereign Lords</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400">Territory Power: 348.5K</span>
                </div>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 shrink-0">
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTab('diplomacy');
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'diplomacy'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Handshake className="w-3.5 h-3.5" />
                <span>Treaty Diplomacy</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTab('alliance_war');
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'alliance_war'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Alliance War Rally</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTab('espionage');
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'espionage'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Covert Espionage</span>
              </button>
            </div>
          </div>
        </div>

        {/* Global Toast / Action success */}
        {actionSuccessMsg && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-xl text-xs text-amber-300 font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Tab 1: Treaty Diplomacy */}
        {activeTab === 'diplomacy' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left 2 Cols: Faction Roster */}
            <div className="lg:col-span-2 space-y-3">
              {factions.map((f) => {
                const isSelected = selectedFaction.id === f.id;

                return (
                  <div
                    key={f.id}
                    onClick={() => {
                      sound.playClick();
                      setSelectedFaction(f);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-950/20 border-amber-500 ring-1 ring-amber-500 shadow-xl'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        style={{ backgroundColor: `${f.bannerColor}20`, borderColor: f.bannerColor }}
                        className="w-12 h-12 rounded-xl border flex items-center justify-center font-bold font-cinzel text-lg shadow shrink-0"
                      >
                        {f.tag}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-100">{f.name}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                            f.status === 'allied' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50' :
                            f.status === 'pact' ? 'bg-amber-950 text-amber-300 border border-amber-700/50' :
                            f.status === 'hostile' ? 'bg-red-950 text-red-300 border border-red-700/50' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {f.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{f.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono-nums shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Territories</span>
                        <strong className="text-slate-200">{f.territoryCount}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Total Power</span>
                        <strong className="text-amber-400">⚔ {f.totalPower.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right 1 Col: Selected Treaty Chamber */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      Diplomatic Embassy
                    </span>
                    <h3 className="text-lg font-bold text-slate-100">{selectedFaction.name}</h3>
                  </div>
                  <span className="text-xs font-mono-nums font-bold text-slate-300">
                    Leader: {selectedFaction.leader}
                  </span>
                </div>

                <p className="text-xs text-slate-300 my-4 leading-relaxed">
                  {selectedFaction.description}
                </p>

                {/* Current Active Accord */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4 text-xs font-mono-nums">
                  <span className="text-slate-400 text-[10px] block">Active Status Accord</span>
                  <div className="text-amber-300 font-bold capitalize mt-0.5">
                    {selectedFaction.activeTreaty ? `Active ${selectedFaction.activeTreaty.type.toUpperCase()} (${selectedFaction.activeTreaty.turnsRemaining} Days Left)` : 'No Formal Accord Signed'}
                  </div>
                </div>

                {/* Available Treaties to Propose */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-200 block mb-1">
                    Available Treaties to Ratify
                  </span>

                  <button
                    onClick={() => handleSignTreaty('nap')}
                    className="w-full p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-amber-300">Non-Aggression Pact (NAP)</div>
                      <div className="text-[10px] text-slate-400">Secures mutual borders, bans border raids.</div>
                    </div>
                    <Handshake className="w-4 h-4 text-amber-400 shrink-0" />
                  </button>

                  <button
                    onClick={() => handleSignTreaty('trade')}
                    className="w-full p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-emerald-300">Open Trade Accord</div>
                      <div className="text-[10px] text-slate-400">+25% Aether exchange & caravan revenue.</div>
                    </div>
                    <Coins className="w-4 h-4 text-emerald-400 shrink-0" />
                  </button>

                  <button
                    onClick={() => handleSignTreaty('coalition')}
                    className="w-full p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-sky-300">Mutual Defense Coalition</div>
                      <div className="text-[10px] text-slate-400">Allies automatically rally if invaded.</div>
                    </div>
                    <Shield className="w-4 h-4 text-sky-400 shrink-0" />
                  </button>

                  <button
                    onClick={() => handleSignTreaty('war')}
                    className="w-full p-2.5 bg-red-950/30 hover:bg-red-950/60 border border-red-800/60 rounded-xl text-left transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-red-400">Declaration of Total War</div>
                      <div className="text-[10px] text-red-300">Authorize siege marches against citadel.</div>
                    </div>
                    <Swords className="w-4 h-4 text-red-400 shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Alliance War Rally */}
        {activeTab === 'alliance_war' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  Global Monolith War
                </span>
                <h3 className="text-xl font-bold text-slate-100 font-cinzel">
                  Siege of the Central Titan Citadel
                </h3>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono-nums">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-slate-300">War Status: Active Battle Stage</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 text-[10px] block">Central Objective</span>
                <strong className="text-base font-bold text-amber-300 font-cinzel">Aethelgard Monolith</strong>
                <p className="text-slate-400 mt-1">Controls 40% continental tax revenue and sovereign title.</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono-nums">
                <span className="text-slate-400 text-[10px] block">Rival Host Occupying</span>
                <strong className="text-base font-bold text-purple-400">Shadow Syndicate</strong>
                <p className="text-slate-400 mt-1">Garrison: 38,000 Dread Vanguard (Lv.8 Citadel)</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono-nums">
                <span className="text-slate-400 text-[10px] block">Alliance Coalition Ready</span>
                <strong className="text-base font-bold text-emerald-400">42,500 Allied Troops</strong>
                <p className="text-slate-400 mt-1">12 Guild commanders standing by to march.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-slate-200 mb-2">Live Alliance War Feed</h4>
              <div className="space-y-1.5 text-xs font-mono-nums text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">[12:38]</span>
                  <span className="text-amber-400">Grandmaster Valen:</span>
                  <span>"Sound all war trumpets. Focus siege trebuchets on the northern gate!"</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">[12:39]</span>
                  <span className="text-sky-400">Archon Aurelia:</span>
                  <span>"Solar barrier deployed over allied vanguard line. Commencing volley."</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleRally}
              className="w-full py-4 bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-xl shadow-red-600/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 font-cinzel"
            >
              <Swords className="w-5 h-5" />
              <span>Join Alliance Mass Rally March</span>
            </button>
          </div>
        )}

        {/* Tab 3: Covert Espionage */}
        {activeTab === 'espionage' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                Shadow Syndicate & Border Operations
              </span>
              <h3 className="text-xl font-bold text-slate-100 font-cinzel">
                Covert Espionage Bureau
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Deploy intelligence agents to weaken rival defenses, sabotage stockpiles, and extract stolen blueprints.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Sabotage City Ramparts</h4>
                  <p className="text-xs text-slate-400 my-2">
                    Plant alchemical firepots to reduce target citadel wall defense by 25% for 4 hours.
                  </p>
                  <span className="text-xs font-mono-nums text-amber-400 font-semibold">Cost: 1,200 Gold</span>
                </div>
                <button
                  onClick={() => handleEspionage('Sabotage City Ramparts')}
                  className="mt-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Dispatch Saboteur
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Infiltrate Resource Granaries</h4>
                  <p className="text-xs text-slate-400 my-2">
                    Siphon up to 18,000 Food and Timber from hostile supply convoys directly to your citadel.
                  </p>
                  <span className="text-xs font-mono-nums text-amber-400 font-semibold">Cost: 1,500 Gold</span>
                </div>
                <button
                  onClick={() => handleEspionage('Infiltrate Resource Granaries')}
                  className="mt-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Dispatch Siphon Team
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Steal Alchemical Blueprint</h4>
                  <p className="text-xs text-slate-400 my-2">
                    Bribe royal scholars to copy proprietary military tactics tech, advancing research by 2 hours.
                  </p>
                  <span className="text-xs font-mono-nums text-amber-400 font-semibold">Cost: 2,500 Gold</span>
                </div>
                <button
                  onClick={() => handleEspionage('Steal Alchemical Blueprint')}
                  className="mt-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Dispatch Master Thief
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
