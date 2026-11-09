import React, { useState } from 'react';
import { 
  CampaignMission, 
  LeaderboardEntry, 
  MarketItem, 
  WorldEvent 
} from '../game/types';
import { sound } from '../game/audio';
import { 
  BookOpen, 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Coins, 
  Wheat, 
  Trees, 
  Boxes, 
  Anvil, 
  Sparkles, 
  CheckCircle, 
  Swords, 
  Smartphone, 
  Monitor, 
  Apple, 
  Globe 
} from 'lucide-react';

interface ChroniclesAndLeaderboardProps {
  missions: CampaignMission[];
  leaderboard: LeaderboardEntry[];
  marketItems: MarketItem[];
  worldEvents: WorldEvent[];
  gold: number;
  resources: {
    food: number;
    timber: number;
    stone: number;
    iron: number;
    mana: number;
    gold: number;
  };
  onCompleteMission: (missionId: string, choiceAlignment?: string) => void;
  onTradeMarket: (resource: 'food' | 'timber' | 'stone' | 'iron' | 'mana', type: 'buy' | 'sell', amount: number) => void;
  onPvPDuel: (opponentName: string) => void;
}

export const ChroniclesAndLeaderboard: React.FC<ChroniclesAndLeaderboardProps> = ({
  missions,
  leaderboard,
  marketItems,
  worldEvents,
  gold,
  resources,
  onCompleteMission,
  onTradeMarket,
  onPvPDuel,
}) => {
  const [activeTab, setActiveTab] = useState<'campaign' | 'market' | 'leaderboard'>('campaign');
  const [selectedMission, setSelectedMission] = useState<CampaignMission>(missions[1] || missions[0]);
  const [tradeAmounts, setTradeAmounts] = useState<{ [key: string]: number }>({
    food: 1000,
    timber: 1000,
    stone: 1000,
    iron: 500,
    mana: 250,
  });
  const [duelResult, setDuelResult] = useState<string | null>(null);

  const getPlatformIcon = (platform: LeaderboardEntry['platform']) => {
    switch (platform) {
      case 'iOS':
        return <Apple className="w-3.5 h-3.5 text-slate-300" />;
      case 'Android':
        return <Smartphone className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Steam':
        return <Monitor className="w-3.5 h-3.5 text-sky-400" />;
      case 'Web':
        return <Globe className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const handleSelectMission = (m: CampaignMission) => {
    sound.playClick();
    setSelectedMission(m);
  };

  const handleChoice = (alignment: string) => {
    sound.playFanfare();
    onCompleteMission(selectedMission.id, alignment);
  };

  const handleDuel = (opponent: LeaderboardEntry) => {
    sound.playClash();
    onPvPDuel(opponent.name);
    setDuelResult(`Victory over ${opponent.name}! +45 Seasonal Trophies awarded.`);
    setTimeout(() => setDuelResult(null), 4000);
  };

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] pt-14 pb-16 overflow-y-auto bg-slate-950 p-3 sm:p-6 select-none">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-0.5">
              <BookOpen className="w-4 h-4" />
              <span>Historical Chronicles & Global Nexus</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 font-cinzel tracking-wide">
              Campaign & Global Economy
            </h2>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('campaign');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'campaign'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Story Campaign
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('market');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'market'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Dynamic Market</span>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('leaderboard');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Cross-Play Rank</span>
            </button>
          </div>
        </div>

        {duelResult && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-xl text-xs text-amber-300 font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{duelResult}</span>
          </div>
        )}

        {/* Tab 1: Single-Player Story Campaign */}
        {activeTab === 'campaign' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Missions Chapter Tree */}
            <div className="space-y-3">
              {missions.map((m) => {
                const isSelected = selectedMission.id === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMission(m)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-950/20 border-amber-500 ring-1 ring-amber-500 shadow-xl'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        Chapter {m.chapter} · Mission {m.missionNumber}
                      </span>
                      {m.completed && (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Conquered
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-slate-100">{m.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{m.narrativeContext}</p>
                    <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono-nums flex items-center justify-between">
                      <span>Enemy: {m.enemyCommander}</span>
                      <span className="text-amber-400 font-bold">⚔ {m.enemyPower.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mission Story Dialogue & Strategic Choice */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="pb-3 border-b border-slate-800">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    {selectedMission.chapterTitle}
                  </span>
                  <h3 className="text-xl font-bold text-slate-100 font-cinzel">{selectedMission.title}</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {selectedMission.narrativeContext}
                  </p>
                </div>

                {/* Dialogues */}
                <div className="space-y-3 my-4">
                  {selectedMission.dialogue.map((d, i) => (
                    <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                      <span className="text-xs font-bold text-amber-300">{d.speaker}</span>
                      <p className="text-xs text-slate-200 mt-0.5 italic">"{d.text}"</p>
                    </div>
                  ))}
                </div>

                {/* Alignment Choice Prompt */}
                {selectedMission.choicePrompt && !selectedMission.completed && (
                  <div className="mt-5 p-4 rounded-xl bg-amber-950/20 border border-amber-600/40">
                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
                      Strategic Sovereignty Decision
                    </h4>
                    <p className="text-xs text-slate-200 mb-3 font-semibold">
                      {selectedMission.choicePrompt.question}
                    </p>
                    <div className="space-y-2">
                      {selectedMission.choicePrompt.options.map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleChoice(opt.alignment)}
                          className="w-full p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/60 rounded-xl text-left transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-slate-100">
                            <span>{opt.text}</span>
                            <span className="text-[10px] text-amber-400 capitalize">Path of the {opt.alignment}</span>
                          </div>
                          <div className="text-[11px] text-emerald-400 mt-1 font-mono-nums">{opt.rewardText}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rewards */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono-nums">
                <span className="text-slate-400">Chapter Spoils:</span>
                <span className="text-amber-300 font-bold">
                  🪙 {selectedMission.rewards.gold.toLocaleString()} Gold · 💎 {selectedMission.rewards.rubies} Rubies · ✨ {selectedMission.rewards.cardExp} EXP
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Dynamic World Economy Market */}
        {activeTab === 'market' && (
          <div className="space-y-5">
            {/* Active Persistent Events Affecting Prices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {worldEvents.map((evt) => (
                <div key={evt.id} className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 to-slate-900 border border-red-700/50 shadow-xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-400 mb-1">
                    <Flame className="w-4 h-4 animate-pulse" />
                    <span>Global Realm Event Active</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-100">{evt.name}</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{evt.description}</p>
                </div>
              ))}
            </div>

            {/* Live Trading Post Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-base font-bold text-slate-100 mb-4 font-cinzel">
                Imperial Trading Exchange
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketItems.map((item) => {
                  const amt = tradeAmounts[item.resource] || 500;
                  const totalCost = Math.round(amt * item.currentPrice);
                  const playerStock = resources[item.resource] || 0;

                  return (
                    <div key={item.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <h4 className="text-sm font-bold text-slate-100">{item.name}</h4>
                          <div className={`flex items-center gap-1 text-xs font-mono-nums font-bold ${
                            item.trend === 'up' ? 'text-emerald-400' : item.trend === 'down' ? 'text-rose-400' : 'text-slate-400'
                          }`}>
                            {item.trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            <span>{item.changePercent > 0 ? `+${item.changePercent}%` : `${item.changePercent}%`}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between my-3 text-xs font-mono-nums">
                          <span className="text-slate-400">Spot Exchange Rate</span>
                          <strong className="text-yellow-400 font-bold">{item.currentPrice.toFixed(2)} Gold / Unit</strong>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono-nums mb-3">
                          <span>Your Stockpile:</span>
                          <span className="text-slate-200 font-semibold">{Math.floor(playerStock).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Buy & Sell Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                        <button
                          disabled={gold < totalCost}
                          onClick={() => {
                            sound.playCoins();
                            onTradeMarket(item.resource, 'buy', amt);
                          }}
                          className={`py-2 rounded-lg font-bold transition-colors cursor-pointer ${
                            gold >= totalCost
                              ? 'bg-amber-600 hover:bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          Buy {amt} (🪙{totalCost})
                        </button>

                        <button
                          disabled={playerStock < amt}
                          onClick={() => {
                            sound.playCoins();
                            onTradeMarket(item.resource, 'sell', amt);
                          }}
                          className={`py-2 rounded-lg font-bold transition-colors cursor-pointer ${
                            playerStock >= amt
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                              : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          Sell {amt} (+🪙{totalCost})
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Cross-Platform Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Cross-Platform Global Matchmaking
                </span>
                <h3 className="text-xl font-bold text-slate-100 font-cinzel">
                  Season 3: Age of the Dragon Sovereign
                </h3>
              </div>
              <div className="text-xs text-slate-400 font-mono-nums">
                Season Closes in: <strong className="text-slate-200">14 Days · Apex Conqueror Tier</strong>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="space-y-2">
              {leaderboard.map((player) => (
                <div
                  key={player.rank}
                  className={`p-3 sm:p-4 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                    player.isPlayer
                      ? 'bg-amber-950/30 border-amber-500/80 ring-1 ring-amber-500'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-sm font-mono-nums font-bold text-amber-400">
                      #{player.rank}
                    </span>
                    <span className="text-xl">{player.avatar}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-100">{player.name}</h4>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800 font-mono-nums">
                          [{player.guildTag}]
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono-nums mt-0.5">
                        <span className="flex items-center gap-1">
                          {getPlatformIcon(player.platform)} {player.platform}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Territories: {player.territories}</span>
                        <span aria-hidden="true">·</span>
                        <span>Win Rate: {player.winRate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right font-mono-nums">
                      <span className="text-[10px] text-slate-400 block">Trophies</span>
                      <strong className="text-amber-300 font-bold text-sm sm:text-base">
                        🏆 {player.trophies.toLocaleString()}
                      </strong>
                    </div>

                    {!player.isPlayer && (
                      <button
                        onClick={() => handleDuel(player)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Duel</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
