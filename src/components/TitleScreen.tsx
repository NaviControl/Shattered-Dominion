import React, { useState, useEffect } from 'react';
import { sound } from '../game/audio';
import { Volume2, VolumeX, Shield, Play, Crosshair, Sparkles, User } from 'lucide-react';

interface TitleScreenProps {
  onStartGame: (username: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  initialUsername: string;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  isMuted,
  onToggleMute,
  initialUsername,
}) => {
  const [username, setUsername] = useState<string>(initialUsername || 'Lord Commander');

  // Listen for Enter or Space key to start game per Game Craft Guidelines
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        sound.playFanfare();
        onStartGame(username.trim() || 'Lord Commander');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame, username]);

  const handleStart = () => {
    sound.playFanfare();
    onStartGame(username.trim() || 'Lord Commander');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* Cinematic Live Artwork Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
        style={{
          backgroundImage: `url('/src/assets/images/kc3_title_hero_1793475624855.jpg')`,
        }}
      >
        {/* Gradients to ensure text contrast and dramatic vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/40" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.7)_100%)]" />
      </div>

      {/* Top Bar Status & Audio */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/5">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Realm of Aethelgard</span>
            <span className="text-[11px] text-slate-400 font-mono-nums">Global Server · Season 3: Age of the Dragon Sovereign</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              onToggleMute();
              sound.playClick();
            }}
            className="w-10 h-10 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Centerpiece Hero Title Lockup over negative space */}
      <div className="relative z-10 flex flex-col items-center justify-center max-w-4xl mx-auto text-center my-auto px-4">
        {/* Subtle decorative crest badge */}
        <div className="flex items-center gap-2 px-3 py-1 mb-4 rounded-md bg-amber-950/60 border border-amber-600/40 text-amber-300 text-xs tracking-widest uppercase font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Next-Gen Strategy · Deep Diplomacy · Action Dungeons</span>
        </div>

        {/* Bespoke Inline SVG Title Lockup */}
        <div className="w-full max-w-xl mx-auto mb-3">
          <svg viewBox="0 0 700 130" className="w-full h-auto drop-shadow-[0_8px_24px_rgba(0,0,0,0.9)]">
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fffbeb" />
                <stop offset="35%" stopColor="#fef08a" />
                <stop offset="70%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#854d0e" />
              </linearGradient>
              <linearGradient id="rubyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fecdd3" />
                <stop offset="50%" stopColor="#e11d48" />
                <stop offset="100%" stopColor="#881337" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* Title Text */}
            <text
              x="350"
              y="60"
              textAnchor="middle"
              className="font-cinzel"
              fill="url(#goldGrad)"
              fontSize="52"
              fontWeight="900"
              letterSpacing="6"
              filter="url(#glow)"
            >
              KINGDOM CONQUEST
            </text>
            <text
              x="350"
              y="114"
              textAnchor="middle"
              className="font-cinzel"
              fill="url(#rubyGrad)"
              fontSize="44"
              fontWeight="900"
              letterSpacing="12"
            >
              III
            </text>
            {/* Decorative filigree flourishes */}
            <path d="M 120 75 Q 220 85 300 85" stroke="#ca8a04" strokeWidth="2" fill="none" opacity="0.6" />
            <path d="M 580 75 Q 480 85 400 85" stroke="#ca8a04" strokeWidth="2" fill="none" opacity="0.6" />
            <circle cx="350" cy="85" r="3" fill="#facc15" />
          </svg>
        </div>

        <p className="text-slate-300 text-sm sm:text-base max-w-xl font-normal leading-relaxed mb-6 drop-shadow">
          Forge alliances, seize continental territories in real-time, command legendary hero squads, and delve into subterranean dungeon depths.
        </p>

        {/* Username Input & Start Game CTA */}
        <div className="w-full max-w-sm mx-auto mb-6 flex flex-col gap-2">
          <label className="text-left text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Lord Commander Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={24}
            placeholder="Enter your commander name..."
            className="w-full px-4 py-3 bg-slate-900/90 border border-amber-500/50 rounded-xl text-slate-100 text-sm font-semibold focus:outline-none focus:border-amber-400 shadow-lg"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={handleStart}
            className="group relative px-8 py-3.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-base sm:text-lg rounded-xl shadow-2xl shadow-amber-500/30 flex items-center gap-3 transition-all transform active:scale-95 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>Enter Sovereign Realm</span>
          </button>
        </div>

        {/* Cross-platform badges */}
        <div className="flex items-center gap-4 mt-6 text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Local Progress Storage
          </span>
          <span aria-hidden="true">·</span>
          <span>iOS / Android / Web / PC</span>
          <span aria-hidden="true">·</span>
          <span>60 FPS Tactical Sim</span>
        </div>
      </div>

      {/* Flat Single Control Hint Line per Guidelines */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-800/60 font-mono-nums">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-amber-500" />
          <span>WASD / Touch Joystick to Move · Space / Tap Action · Drag Map to Pan · Esc Pause</span>
        </div>
        <div className="mt-2 sm:mt-0 text-slate-500">
          Public Launch Edition v3.5.0 · 2026 Sovereign Edition
        </div>
      </div>
    </div>
  );
};
