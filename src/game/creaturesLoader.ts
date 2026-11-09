/**
 * Shattered Dominion - 432 Creatures CSV Parser, Loader & Starter Generator
 */

import { CreatureCard, CreatureFamily, CreatureElement, CreatureRarity } from './types';
import { rollCardRarity } from './gachaUtils';
import { calculateCreatureStatsAtLevel } from './creatureBalance';

let cachedCreatures: CreatureCard[] | null = null;

export async function loadShatteredDominionCreatures(): Promise<CreatureCard[]> {
  if (cachedCreatures) return cachedCreatures;

  try {
    const res = await fetch('/assets/aistudio/Shattered_Dominion_432_Creatures_e15509ef.csv');
    if (!res.ok) throw new Error('Failed to fetch creatures CSV');
    const text = await res.text();
    cachedCreatures = parseCreaturesCsv(text);
    return cachedCreatures;
  } catch (err) {
    console.warn('Could not load creatures CSV, generating fallback creatures catalog', err);
    cachedCreatures = generateFallbackCreatures();
    return cachedCreatures;
  }
}

export function generateStarterCreatures(allCreatures: CreatureCard[]): CreatureCard[] {
  if (!allCreatures || allCreatures.length === 0) return [];

  // 1. Guaranteed Rare creature (e.g., SD-0061 Rune Gravewalker)
  const rarePool = allCreatures.filter(c => c.rarity === 'rare');
  const guaranteedRare = rarePool.find(c => c.id === 'SD-0061') || rarePool[0] || allCreatures[0];

  const selectedIds = new Set<string>([guaranteedRare.id]);
  const starters: CreatureCard[] = [{ ...guaranteedRare, level: 1, exp: 0 }];

  // 2. Two additional random creatures using authoritative rarity pull rates (0.5% mythical)
  while (starters.length < 3) {
    const rolledRarity = rollCardRarity('global_altar');
    const rarityPool = allCreatures.filter(c => c.rarity === rolledRarity && !selectedIds.has(c.id));
    
    const pool = rarityPool.length > 0 ? rarityPool : allCreatures.filter(c => !selectedIds.has(c.id));
    if (pool.length === 0) break;

    const randomIndex = Math.floor(Math.random() * pool.length);
    const chosen = pool[randomIndex];

    selectedIds.add(chosen.id);
    starters.push({ ...chosen, level: 1, exp: 0 });
  }

  return starters;
}

function parseCreaturesCsv(csvText: string): CreatureCard[] {
  const lines = csvText.split('\n');
  const creatures: CreatureCard[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row = parseCsvLine(line);
    if (row.length < 11) continue;

    const [
      id,
      name,
      family,
      element,
      rarityStr,
      tierStr,
      combatRole,
      archetype,
      signatureAbility,
      familySpecialty,
      singlePullChanceStr
    ] = row;

    const rarity = (rarityStr ? rarityStr.toLowerCase() : 'common') as CreatureRarity;
    const tier = parseInt(tierStr, 10) || 1;
    const singlePullChance = parseFloat(singlePullChanceStr) || 0.3;

    const initialStats = calculateCreatureStatsAtLevel(
      { tier, rarity: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'].includes(rarity) ? rarity : 'common', stars: tier },
      1
    );

    creatures.push({
      id: id || `SD-${String(i).padStart(4, '0')}`,
      name: name || `Creature ${i}`,
      family: (family as CreatureFamily) || 'Dragons',
      element: (element as CreatureElement) || 'Fire',
      rarity: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'].includes(rarity) ? rarity : 'common',
      tier,
      combatRole: combatRole || 'Vanguard',
      archetype: archetype || 'Warrior',
      signatureAbility: signatureAbility || 'Strike',
      familySpecialty: familySpecialty || 'Combat prowess',
      singlePullChance,
      level: 1,
      maxLevel: 50,
      stars: tier,
      exp: 0,
      maxExp: initialStats.expNeededNext,
      atk: initialStats.atk,
      def: initialStats.def,
      spd: initialStats.spd,
      isEquipped: false,
    });
  }

  return creatures;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(currentVal.trim());
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  result.push(currentVal.trim());
  return result;
}

function generateFallbackCreatures(): CreatureCard[] {
  const families: CreatureFamily[] = ['Dragons', 'Undead', 'Elementals', 'Demons', 'Beasts', 'Celestials', 'Swarmkin', 'Abyssals', 'Humanoids', 'Giants', 'Fae', 'Mechanicals'];
  const elements: CreatureElement[] = ['Fire', 'Water', 'Earth', 'Wind', 'Lightning', 'Frost', 'Nature', 'Shadow', 'Light', 'Arcane', 'Poison', 'Void'];
  const rarities: CreatureRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];

  const fallback: CreatureCard[] = [];
  for (let i = 1; i <= 50; i++) {
    const family = families[i % families.length];
    const element = elements[i % elements.length];
    const rarity = rarities[i % rarities.length];
    fallback.push({
      id: `SD-${String(i).padStart(4, '0')}`,
      name: `${element} ${family} Guardian ${i}`,
      family,
      element,
      rarity,
      tier: rarity === 'mythical' ? 6 : rarity === 'legendary' ? 5 : rarity === 'epic' ? 4 : rarity === 'rare' ? 3 : rarity === 'uncommon' ? 2 : 1,
      combatRole: 'Vanguard',
      archetype: 'Guardian',
      signatureAbility: 'Primal Roar',
      familySpecialty: 'Assault',
      singlePullChance: 0.25,
      level: 1,
      maxLevel: 50,
      stars: 1,
      exp: 0,
      maxExp: 1000,
      atk: 100 + i * 5,
      def: 80 + i * 4,
      spd: 60,
    });
  }
  return fallback;
}
