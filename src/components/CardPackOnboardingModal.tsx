/**
 * Kingdom Conquest III - Card Pack Onboarding Modal with Guaranteed Rare & Random Creatures
 */

import React, { useState } from 'react';
import { Sparkles, Shield, Award, ChevronRight, CheckCircle2, Package, X, Compass, MapPin } from 'lucide-react';
import { sound } from '../game/audio';
import { CommanderCard, UnitUpgradeCard, EconomicCard, CreatureCard } from '../game/types';
import { rollCardRarity } from '../game/gachaUtils';
import { generateStarterCreatures } from '../game/creaturesLoader';

interface CardPackOnboardingModalProps {
  onCompleteOnboarding: (starterData: {
    commander: CommanderCard;
    unitCard: UnitUpgradeCard;
    econCard: EconomicCard;
    starterCreatures: CreatureCard[];
  }, selectedRegion: string, initialCoords: { x: number; y: number }) => void;
  onSkipOnboarding: () => void;
  sampleCards: CommanderCard[];
  sampleUnitCards: UnitUpgradeCard[];
  sampleEconCards: EconomicCard[];
  allCreatures: CreatureCard[];
}

export const CardPackOnboardingModal: React.FC<CardPackOnboardingModalProps> = ({
  onCompleteOnboarding,
  onSkipOnboarding,
  sampleCards,
  sampleUnitCards,
  sampleEconCards,
  allCreatures,
}) => {
  const [step, setStep] = useState<'welcome' | 'region_select' | 'pack_sealed' | 'revealing' | 'claimed'>('welcome');
  
  // Selected Region & Initial Placement Coords
  const [selectedRegion, setSelectedRegion] = useState<{
    id: string;
    name: string;
    coords: { x: number; y: number };
    desc: string;
    color: string;
  }>({
    id: 'sol_heights',
    name: 'Sol Heights (North-West)',
    coords: { x: 2, y: 1 },
    desc: 'Radiant plains & holy shrines with balanced food and gold yields.',
    color: 'border-amber-500/60 bg-amber-500/10 text-amber-300',
  });

  const regions = [
    {
      id: 'sol_heights',
      name: 'Sol Heights',
      quadrant: 'North-West Sector',
      coords: { x: 2, y: 1 },
      desc: 'Radiant plains & holy shrines. +15% Gold & Food yield.',
      color: 'border-amber-500/60 bg-amber-500/10 text-amber-300',
    },
    {
      id: 'ignis_caldera',
      name: 'Ignis Caldera',
      quadrant: 'North-East Sector',
      coords: { x: 6, y: 1 },
      desc: 'Volcanic mountain forge. +20% Iron & Military ATK.',
      color: 'border-rose-500/60 bg-rose-500/10 text-rose-300',
    },
    {
      id: 'frost_wastes',
      name: 'Frost Wastes',
      quadrant: 'South-West Sector',
      coords: { x: 2, y: 6 },
      desc: 'Glacial mountain redoubts. +20% Stone & DEF phalanx.',
      color: 'border-sky-500/60 bg-sky-500/10 text-sky-300',
    },
    {
      id: 'abyssal_marshes',
      name: 'Abyssal Marshes',
      quadrant: 'South-East Sector',
      coords: { x: 6, y: 6 },
      desc: 'Shadow catacombs & ruins. +25% Aether Mana & Research.',
      color: 'border-purple-500/60 bg-purple-500/10 text-purple-300',
    },
  ];

  const [revealedCards, setRevealedCards] = useState<{
    commander: CommanderCard;
    unitCard: UnitUpgradeCard;
    econCard: EconomicCard;
    starterCreatures: CreatureCard[];
  } | null>(null);

  const [pulledRarity, setPulledRarity] = useState<string>('legendary');

  const starterCommander = sampleCards[0];
  const starterUnitCard = sampleUnitCards[0];
  const starterEconCard = sampleEconCards[0];

  const handleOpenPack = () => {
    sound.playFanfare();
    const rolled = rollCardRarity('global_altar');
    setPulledRarity(rolled);

    // Generate starter creatures (1 guaranteed Rare + 2 random using rarity table)
    const starterCreatures = generateStarterCreatures(allCreatures);

    setStep('revealing');
    setTimeout(() => {
      setRevealedCards({
        commander: starterCommander,
        unitCard: starterUnitCard,
        econCard: starterEconCard,
        starterCreatures,
      });
      setStep('claimed');
    }, 1600);
  };

  const handleFinish = () => {
    sound.playClick();
    if (revealedCards) {
      onCompleteOnboarding(revealedCards, selectedRegion.name, selectedRegion.coords);
    }
  };

  const handleSkip = () => {
    sound.playClick();
    onSkipOnboarding();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-500/10 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
        
        {/* Pathway to leave / skip pack opening screen */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          title="Skip to Realm"
        >
          <span>Skip to Realm</span>
          <X className="w-4 h-4" />
        </button>

        {step === 'welcome' && (
          <div className="space-y-6 w-full mt-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-500/20">
              <Shield className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold text-amber-400 tracking-widest uppercase font-cinzel">
                Imperial Induction
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-100 font-cinzel mt-1">
                Welcome, Lord Commander
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto mt-2 leading-relaxed">
                The realm of Aethelgard is divided into 4 elemental regions surrounding the central <strong className="text-amber-400">Monolith Citadel</strong>. First, select your sovereign home region and initial kingdom placement.
              </p>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setStep('region_select');
              }}
              className="w-full py-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-sm rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 font-cinzel tracking-wider"
            >
              <span>Choose Kingdom Territory</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 'region_select' && (
          <div className="space-y-5 w-full mt-2 text-left">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest font-cinzel">
                Geographic Domain
              </span>
              <h3 className="text-xl font-black text-slate-100 font-cinzel">
                Select Your Citadel Region
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Your sovereign fortress will be established in your chosen sector with 1 initial farmlands tile.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
              {regions.map((reg) => {
                const isSelected = selectedRegion.id === reg.id;
                return (
                  <div
                    key={reg.id}
                    onClick={() => {
                      sound.playClick(720);
                      setSelectedRegion(reg);
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/15 shadow-lg shadow-amber-500/10'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-amber-400 uppercase">{reg.quadrant}</span>
                      {isSelected && <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded">Selected</span>}
                    </div>
                    <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" /> {reg.name}
                    </h4>
                    <p className="text-[10px] text-slate-300 mt-1">{reg.desc}</p>
                    <div className="text-[10px] text-slate-400 font-mono mt-2">
                      Coordinates: [{reg.coords.x}, {reg.coords.y}]
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setStep('pack_sealed');
              }}
              className="w-full py-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-sm rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 font-cinzel tracking-wider"
            >
              <span>Confirm Region & Open Pack</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {(step === 'pack_sealed' || step === 'revealing') && (
          <div className="space-y-4 w-full py-4 flex flex-col items-center mt-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest font-cinzel">
              Region: {selectedRegion.name}
            </span>
            <h3 className="text-xl font-bold text-slate-100 font-cinzel">
              Imperial Sovereign Booster Pack
            </h3>
            <div className="text-[11px] text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              Drop Rates: <span className="text-amber-400 font-bold">Mythical 0.5%</span> · <span className="text-amber-300 font-bold">Guaranteed Rare Bestiary</span>
            </div>

            {/* Glowing Card Pack Graphic */}
            <div
              onClick={step === 'pack_sealed' ? handleOpenPack : undefined}
              className={`relative w-40 h-56 rounded-2xl bg-gradient-to-b from-amber-600 via-amber-700 to-amber-950 border-2 border-amber-300 p-4 shadow-[0_0_50px_rgba(245,158,11,0.4)] flex flex-col justify-between items-center cursor-pointer transition-transform hover:scale-105 active:scale-95 ${
                step === 'revealing' ? 'animate-pulse scale-105' : ''
              }`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)] pointer-events-none" />
              <div className="w-full flex justify-between items-center text-amber-200 text-xs">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span className="font-mono font-bold">RARITY ROLLS</span>
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>

              <div className="flex flex-col items-center my-auto">
                <Package className="w-12 h-12 text-amber-200 mb-1 drop-shadow-lg" />
                <h4 className="text-xs font-black text-amber-100 font-cinzel uppercase tracking-wider">
                  Shattered Pack
                </h4>
                <span className="text-[9px] text-amber-300 font-mono">3 Creatures Unlocked</span>
              </div>

              <div className="w-full py-1.5 bg-slate-950/80 rounded-xl border border-amber-500/40 text-[10px] font-bold text-amber-300 uppercase">
                {step === 'revealing' ? 'Rolling Rarity...' : 'Tap to Open'}
              </div>
            </div>
          </div>
        )}

        {step === 'claimed' && revealedCards && (
          <div className="space-y-5 w-full mt-2">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-cinzel flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Unboxed 3 Initial Creatures in {selectedRegion.name}!
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-100 font-cinzel mt-1">
                Starter Bestiary Collection
              </h3>
            </div>

            {/* Revealed Creatures Display Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {revealedCards.starterCreatures.map((creature, idx) => (
                <div key={creature.id + idx} className="bg-slate-900 border border-amber-500/60 rounded-2xl p-3 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
                  <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase">
                    {creature.rarity}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-amber-500/40 flex items-center justify-center text-sm font-black text-amber-400 my-2">
                    {creature.id.replace('SD-', '')}
                  </div>
                  <h4 className="font-bold text-xs text-white line-clamp-1">{creature.name}</h4>
                  <div className="text-[10px] text-amber-400 mt-0.5">{creature.family} ({creature.element})</div>
                  <div className="text-[9px] text-slate-400 mt-2 font-mono">Ability: {creature.signatureAbility}</div>
                </div>
              ))}
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-sm rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 font-cinzel tracking-wider"
            >
              <span>Establish Citadel & Enter Realm</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
