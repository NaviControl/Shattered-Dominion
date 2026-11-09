/**
 * Shattered Dominion - Sovereign Quest & Game Codex Guide
 * Provides interactive milestone onboarding, quest tracking with rewards,
 * and comprehensive gameplay mechanics explanations.
 */

import React, { useState } from 'react';
import {
  Compass,
  CheckCircle2,
  Circle,
  Award,
  ChevronRight,
  BookOpen,
  X,
  Swords,
  Castle,
  Layers,
  Sparkles,
  Map,
  Shield,
  Gem,
  Coins,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { sound } from '../game/audio';
import { ActiveTab } from './BottomNav';

export interface SovereignQuest {
  id: string;
  title: string;
  description: string;
  targetTab: ActiveTab;
  reward: { gold: number; rubies: number };
  isCompleted: boolean;
  isClaimed: boolean;
}

interface SovereignGuideModalProps {
  quests: SovereignQuest[];
  onClaimQuestReward: (questId: string) => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onClose: () => void;
}

export const SovereignGuideModal: React.FC<SovereignGuideModalProps> = ({
  quests,
  onClaimQuestReward,
  onNavigateTab,
  onClose,
}) => {
  const [activeView, setActiveView] = useState<'quests' | 'codex'>('quests');
  const [selectedCodexTopic, setSelectedCodexTopic] = useState<string>('conquest');

  const completedCount = quests.filter((q) => q.isCompleted).length;
  const totalCount = quests.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const codexTopics = [
    {
      id: 'conquest',
      title: '100-Territory Realm Map & Square Conquest',
      icon: Map,
      content: [
        'Shattered Dominion spans a 10 x 10 continental landscape with 100 discrete territory sectors across 4 biomes: Sol Heights (Emerald), Ignis Caldera (Volcanic), Frost Wastes (Glacial), and Abyssal Marshes (Wetland).',
        'Territories can only be conquered if they are directly adjacent (North, South, East, West) to an existing player-controlled territory or citadel.',
        'Capturing resource tiles (farms, lumber mills, quarries, iron veins, mana monoliths) expands hourly realm yield rates, funding empire research and troop drafts.',
      ],
    },
    {
      id: 'lineup',
      title: '15-Point Lineup & Troop Capacity',
      icon: Layers,
      content: [
        'Each march army is governed by a strict 15-Point Lineup Point budget combining your Commander Hero (3-7 pts), Vanguard Battalion (2-5 pts), and Tactical Support (2-4 pts).',
        'Troop capacity has a hard base ceiling of 9,999 soldiers before scaling factors.',
        'Commander Intelligence (INT) scales effective troop capacity dramatically (+85 cap per 100 INT), while Academy Military Research and Card Skills expand capacity beyond.',
      ],
    },
    {
      id: 'stances',
      title: 'Tactical Formations & Stances',
      icon: Swords,
      content: [
        'Balanced Stance: Standard army disposition with 0% penalty and even stat distribution.',
        'Aggressive Stance: +15% March Velocity, +12% Attack rating, at the cost of -10% Defense.',
        'Defensive Stance: +20% Garrison Armor and -15% Troop Casualties, with -10% March Speed.',
      ],
    },
    {
      id: 'bestiary',
      title: '432 Creature Codex & Resonances',
      icon: Sparkles,
      content: [
        'Commanders can synergize with creatures collected across 12 elements and 12 distinct families.',
        'Deploying 2+ creatures of the same element unlocks Elemental Resonances (Minor +10%, Major +20%, Primal +30% element mastery).',
        'Matching a Commander’s elemental affinity with creature elements grants Harmonic, Resonant, or Transcendent Bonding (+20% Troop Effectiveness).',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-amber-500/40 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 p-4 sm:p-5 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/40 shadow-inner">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-amber-400 tracking-wide font-cinzel">
                SOVEREIGN CODEX & REALM GUIDE
              </h2>
              <p className="text-xs text-slate-400">
                Chapter I: Rise of the Sovereign · {completedCount}/{totalCount} Milestones Reached
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors border border-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="px-5 pt-3 bg-slate-900 flex gap-2 border-b border-slate-800 text-xs">
          <button
            onClick={() => {
              sound.playClick();
              setActiveView('quests');
            }}
            className={`px-4 py-2 font-bold rounded-t-xl transition-colors flex items-center gap-2 cursor-pointer ${
              activeView === 'quests'
                ? 'bg-slate-800 text-amber-400 border-t border-x border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Sovereign Quests ({completedCount}/{totalCount})</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveView('codex');
            }}
            className={`px-4 py-2 font-bold rounded-t-xl transition-colors flex items-center gap-2 cursor-pointer ${
              activeView === 'codex'
                ? 'bg-slate-800 text-amber-400 border-t border-x border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Gameplay Mechanics Codex</span>
          </button>
        </div>

        {/* Tab 1: Quests */}
        {activeView === 'quests' && (
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
            {/* Progress Bar */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center text-xs mb-1.5 font-mono-nums">
                <span className="text-slate-300 font-semibold">Chapter I Milestone Progress</span>
                <span className="text-amber-400 font-bold">{progressPercent}% Completed</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Quests Roster */}
            <div className="space-y-3">
              {quests.map((quest, index) => (
                <div
                  key={quest.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    quest.isClaimed
                      ? 'bg-slate-950/60 border-slate-800/80 opacity-70'
                      : quest.isCompleted
                      ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-950/20'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {quest.isClaimed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : quest.isCompleted ? (
                          <Award className="w-5 h-5 text-amber-400 animate-pulse" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-amber-400 font-bold">
                            STEP 0{index + 1}
                          </span>
                          <h4 className="text-sm font-bold text-slate-100">{quest.title}</h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                          {quest.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] font-mono-nums">
                          <span className="flex items-center gap-1 text-yellow-300">
                            <Coins className="w-3.5 h-3.5 text-yellow-400" />
                            +{quest.reward.gold} Gold
                          </span>
                          <span className="flex items-center gap-1 text-rose-300">
                            <Gem className="w-3.5 h-3.5 text-rose-400" />
                            +{quest.reward.rubies} Rubies
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {quest.isClaimed ? (
                        <span className="text-xs text-emerald-400 font-bold px-3 py-1 bg-emerald-950/60 rounded-xl border border-emerald-800">
                          COMPLETED
                        </span>
                      ) : quest.isCompleted ? (
                        <button
                          onClick={() => {
                            sound.playFanfare();
                            onClaimQuestReward(quest.id);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
                        >
                          Claim Reward
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            sound.playClick();
                            onNavigateTab(quest.targetTab);
                            onClose();
                          }}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span>Go to {quest.targetTab.toUpperCase()}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Codex */}
        {activeView === 'codex' && (
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Topic Menu */}
            <div className="space-y-1.5">
              {codexTopics.map((topic) => {
                const Icon = topic.icon;
                const isSelected = selectedCodexTopic === topic.id;
                return (
                  <button
                    key={topic.id}
                    onClick={() => {
                      sound.playClick();
                      setSelectedCodexTopic(topic.id);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-semibold truncate">{topic.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Topic Details */}
            <div className="md:col-span-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {(() => {
                const topic = codexTopics.find((t) => t.id === selectedCodexTopic) || codexTopics[0];
                const Icon = topic.icon;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                      <Icon className="w-5 h-5 text-amber-400" />
                      <h3 className="text-sm font-bold text-slate-100">{topic.title}</h3>
                    </div>
                    <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                      {topic.content.map((paragraph, idx) => (
                        <p key={idx} className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs">
          <span className="text-slate-400">
            Shattered Dominion Sovereign Roadmap · V3.0
          </span>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
