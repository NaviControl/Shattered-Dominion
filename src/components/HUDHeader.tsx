import React from 'react';
import { 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  Flame, 
  Gem, 
  Coins, 
  Trees, 
  Wheat, 
  Boxes, 
  Anvil, 
  Sparkles,
  Maximize2,
  Compass
} from 'lucide-react';
import { sound } from '../game/audio';
import { WorldEvent } from '../game/types';

interface ResourcesState {
  food: number;
  timber: number;
  stone: number;
  iron: number;
  mana: number;
  gold: number;
  rubies: number;
}

interface HUDHeaderProps {
  resources: ResourcesState;
  productionRates: { [key: string]: number };
  activeEvent: WorldEvent | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenEventModal: () => void;
  onOpenGuide?: () => void;
  playerLevel: number;
  territoriesCount: number;
}

export const HUDHeader: React.FC<HUDHeaderProps> = ({
  resources,
  productionRates,
  activeEvent,
  isMuted,
  onToggleMute,
  onOpenEventModal,
  onOpenGuide,
  playerLevel,
  territoriesCount,
}) => {
  const toggleFullscreen = () => {
    sound.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="pointer-events-none fixed top-0 left-0 right-0 z-30 flex flex-col p-2 sm:p-3 safe-top">
      <div className="flex flex-wrap items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        {/* Left: Player Profile & Realm Status */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 shadow-lg">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-black text-sm font-cinzel shadow">
              {playerLevel}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <span>Lord Commander</span>
              <span className="text-[10px] text-amber-400 font-mono-nums">Lv.{playerLevel}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono-nums">
              <span>Territories: <strong className="text-slate-200">{territoriesCount}</strong></span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">Order: DRG</span>
            </div>
          </div>
        </div>

        {/* Center: Dynamic Resource Meters (Tabular Readouts) */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-3 bg-slate-900/90 backdrop-blur-md px-2.5 sm:px-4 py-1.5 rounded-xl border border-slate-800 shadow-lg overflow-x-auto max-w-full">
          {/* Food */}
          <div className="flex items-center gap-1.5 text-xs text-amber-200 font-mono-nums" title={`Food (+${productionRates.food || 0}/s)`}>
            <Wheat className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="tabular-nums font-semibold">{Math.floor(resources.food).toLocaleString()}</span>
          </div>

          <div className="w-px h-3.5 bg-slate-800 shrink-0" />

          {/* Timber */}
          <div className="flex items-center gap-1.5 text-xs text-emerald-200 font-mono-nums" title={`Timber (+${productionRates.timber || 0}/s)`}>
            <Trees className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="tabular-nums font-semibold">{Math.floor(resources.timber).toLocaleString()}</span>
          </div>

          <div className="w-px h-3.5 bg-slate-800 shrink-0" />

          {/* Stone */}
          <div className="flex items-center gap-1.5 text-xs text-stone-200 font-mono-nums" title={`Stone (+${productionRates.stone || 0}/s)`}>
            <Boxes className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="tabular-nums font-semibold">{Math.floor(resources.stone).toLocaleString()}</span>
          </div>

          <div className="w-px h-3.5 bg-slate-800 shrink-0" />

          {/* Iron */}
          <div className="flex items-center gap-1.5 text-xs text-sky-200 font-mono-nums" title={`Iron (+${productionRates.iron || 0}/s)`}>
            <Anvil className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="tabular-nums font-semibold">{Math.floor(resources.iron).toLocaleString()}</span>
          </div>

          <div className="w-px h-3.5 bg-slate-800 shrink-0" />

          {/* Mana / Aether */}
          <div className="flex items-center gap-1.5 text-xs text-purple-200 font-mono-nums" title={`Mana (+${productionRates.mana || 0}/s)`}>
            <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="tabular-nums font-semibold">{Math.floor(resources.mana).toLocaleString()}</span>
          </div>

          <div className="w-px h-3.5 bg-slate-800 shrink-0" />

          {/* Gold */}
          <div className="flex items-center gap-1.5 text-xs text-yellow-300 font-mono-nums" title="Imperial Gold Coins">
            <Coins className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            <span className="tabular-nums font-bold">{Math.floor(resources.gold).toLocaleString()}</span>
          </div>

          <div className="w-px h-3.5 bg-slate-800 shrink-0" />

          {/* Rubies / Gems */}
          <div className="flex items-center gap-1 text-xs text-rose-300 font-mono-nums" title="Sacred Rubies">
            <Gem className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="tabular-nums font-bold text-rose-200">{Math.floor(resources.rubies).toLocaleString()}</span>
          </div>
        </div>

        {/* Right: Active Event Button & Sound / Fullscreen */}
        <div className="pointer-events-auto flex items-center gap-2">
          {onOpenGuide && (
            <button
              onClick={() => {
                sound.playClick();
                onOpenGuide();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-semibold shadow-lg shadow-amber-950/40 transition-colors cursor-pointer"
              title="Open Sovereign Quests & Gameplay Guide"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Codex & Quests</span>
              <span className="sm:hidden">Codex</span>
            </button>
          )}

          {activeEvent && (
            <button
              onClick={() => {
                sound.playClick();
                onOpenEventModal();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 text-xs font-semibold shadow-lg shadow-rose-950/40 transition-colors cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span className="hidden sm:inline">{activeEvent.name}</span>
              <span className="sm:hidden">Event</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                onToggleMute();
                sound.playClick();
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
