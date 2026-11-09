import React, { useState, useEffect } from 'react';
import { Gift, Sparkles, CheckCircle2, Award, Calendar, ChevronRight, X } from 'lucide-react';
import { sound } from '../game/audio';

interface DailyLoginModalProps {
  onClaimReward: (reward: { gold: number; mana: number; rubies: number; rewardName: string }) => void;
  onClose: () => void;
}

export interface DailyRewardDay {
  day: number;
  gold: number;
  mana: number;
  rubies: number;
  title: string;
  icon: string;
}

export const DAILY_REWARDS: DailyRewardDay[] = [
  { day: 1, gold: 1500, mana: 200, rubies: 10, title: 'Day 1: Sovereign Rations', icon: '🪙' },
  { day: 2, gold: 2500, mana: 400, rubies: 20, title: 'Day 2: Alchemical Tithe', icon: '🧪' },
  { day: 3, gold: 4000, mana: 600, rubies: 35, title: 'Day 3: Vanguard Shards', icon: '⚔️' },
  { day: 4, gold: 5500, mana: 800, rubies: 50, title: 'Day 4: Imperial Reserves', icon: '🛡️' },
  { day: 5, gold: 7500, mana: 1200, rubies: 80, title: 'Day 5: Arcane Spire Leyline', icon: '🔮' },
  { day: 6, gold: 10000, mana: 1800, rubies: 120, title: 'Day 6: Dragon Hoard Vault', icon: '🐉' },
  { day: 7, gold: 20000, mana: 3000, rubies: 250, title: 'Day 7: Mythic Sovereign Tribute', icon: '👑' },
];

const LAST_LOGIN_KEY = 'kc3_last_login_timestamp';
const LOGIN_STREAK_KEY = 'kc3_login_streak_day';

export function checkDailyLoginStatus(): { canClaim: boolean; currentStreak: number; nextReward: DailyRewardDay } {
  try {
    const lastLogin = localStorage.getItem(LAST_LOGIN_KEY);
    const streakStr = localStorage.getItem(LOGIN_STREAK_KEY);
    const currentStreak = streakStr ? parseInt(streakStr, 10) : 0;

    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    if (!lastLogin) {
      return { canClaim: true, currentStreak: 0, nextReward: DAILY_REWARDS[0] };
    }

    const lastTime = parseInt(lastLogin, 10);
    const diff = now - lastTime;

    if (diff >= TWENTY_FOUR_HOURS) {
      const nextDayIndex = Math.min(DAILY_REWARDS.length - 1, currentStreak % DAILY_REWARDS.length);
      return { canClaim: true, currentStreak, nextReward: DAILY_REWARDS[nextDayIndex] };
    }

    const nextDayIndex = Math.min(DAILY_REWARDS.length - 1, (currentStreak - 1 + DAILY_REWARDS.length) % DAILY_REWARDS.length);
    return { canClaim: false, currentStreak, nextReward: DAILY_REWARDS[nextDayIndex] };
  } catch (err) {
    return { canClaim: true, currentStreak: 0, nextReward: DAILY_REWARDS[0] };
  }
}

export function recordDailyClaim(streak: number): void {
  try {
    localStorage.setItem(LAST_LOGIN_KEY, Date.now().toString());
    localStorage.setItem(LOGIN_STREAK_KEY, (streak + 1).toString());
  } catch (err) {
    console.error('Failed to save daily login timestamp', err);
  }
}

interface DailyLoginModalComponentProps {
  onClaim: (reward: DailyRewardDay) => void;
  onClose: () => void;
}

export const DailyLoginModal: React.FC<DailyLoginModalComponentProps> = ({ onClaim, onClose }) => {
  const status = checkDailyLoginStatus();
  const [claimed, setClaimed] = useState(!status.canClaim);

  const handleClaim = () => {
    sound.playFanfare();
    recordDailyClaim(status.currentStreak);
    setClaimed(true);
    onClaim(status.nextReward);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/60 rounded-3xl p-6 shadow-2xl shadow-amber-500/15 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
        
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20 mb-3">
          <Gift className="w-7 h-7 animate-bounce" />
        </div>

        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest font-cinzel">
          Daily Sovereign Tribute
        </span>
        <h3 className="text-2xl font-black text-slate-100 font-cinzel mt-1">
          Daily Login Reward
        </h3>
        <p className="text-xs text-slate-300 max-w-sm mt-1 mb-5">
          Log in every 24 hours to claim escalating imperial resources, mana crystals, and rare card shards.
        </p>

        {/* 7-Day Rewards Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 w-full mb-6">
          {DAILY_REWARDS.map((item, idx) => {
            const isToday = item.day === (status.currentStreak % 7) + 1;
            const isPast = item.day <= (status.currentStreak % 7) && !isToday;

            return (
              <div
                key={item.day}
                className={`p-2.5 rounded-2xl border flex flex-col items-center justify-between text-center relative ${
                  isToday
                    ? 'border-amber-400 bg-amber-500/20 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/50'
                    : isPast
                    ? 'border-slate-800 bg-slate-950/40 opacity-60'
                    : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                <span className="text-[10px] font-bold text-slate-400 font-mono">Day {item.day}</span>
                <span className="text-2xl my-1">{item.icon}</span>
                <div className="text-[10px] font-bold text-amber-300 font-mono-nums">
                  +{item.gold >= 1000 ? `${item.gold / 1000}k` : item.gold}
                </div>
                {isPast && (
                  <div className="absolute inset-0 bg-slate-950/60 rounded-2xl flex items-center justify-center text-emerald-400 font-bold text-xs">
                    ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Claim CTA */}
        {!claimed && status.canClaim ? (
          <button
            onClick={handleClaim}
            className="w-full py-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-sm rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Claim {status.nextReward.title}</span>
          </button>
        ) : (
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-2xl border border-slate-700 transition-colors cursor-pointer"
          >
            {claimed ? 'Reward Claimed! Return Tomorrow' : 'Already Claimed Today · Return in 24h'}
          </button>
        )}

      </div>
    </div>
  );
};
