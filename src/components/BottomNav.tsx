import React from 'react';
import { 
  Map, 
  Castle, 
  Swords, 
  Layers, 
  ScrollText, 
  Trophy 
} from 'lucide-react';
import { sound } from '../game/audio';

export type ActiveTab = 'map' | 'citadel' | 'dungeon' | 'cards' | 'diplomacy' | 'chronicles';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  activeMarchesCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  activeMarchesCount,
}) => {
  interface NavItem {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | null;
  }

  const tabs: NavItem[] = [
    { id: 'map', label: 'Realm Map', icon: Map, badge: activeMarchesCount > 0 ? activeMarchesCount : null },
    { id: 'citadel', label: 'Citadel Base', icon: Castle },
    { id: 'dungeon', label: 'Dungeon Raids', icon: Swords },
    { id: 'cards', label: 'War Cards', icon: Layers },
    { id: 'diplomacy', label: 'Diplomacy & Guild', icon: ScrollText },
    { id: 'chronicles', label: 'Campaign & Events', icon: Trophy },
  ];

  const handleSelect = (id: ActiveTab) => {
    sound.playClick(700);
    onTabChange(id);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 safe-bottom">
      <div className="max-w-4xl mx-auto grid grid-cols-6 items-center h-14 sm:h-16 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleSelect(tab.id as ActiveTab)}
              className={`relative flex flex-col items-center justify-center h-full min-h-[44px] transition-all cursor-pointer ${
                isActive 
                  ? 'text-amber-400' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Active ambient glow pill behind icon */}
              {isActive && (
                <div className="absolute top-1 w-8 h-1 bg-gradient-to-r from-amber-500 to-amber-300 rounded-full" />
              )}

              <div className="relative mt-1">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.7]'}`} />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-rose-600 text-white font-mono-nums">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10px] sm:text-[11px] font-semibold tracking-tight mt-1 truncate max-w-full px-1 ${
                isActive ? 'text-amber-300 font-bold' : 'text-slate-400'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
