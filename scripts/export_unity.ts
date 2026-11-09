/**
 * Exports the Unity handoff package: game data, the simulation spec inputs, and golden replays.
 * Run:  npm run export:unity
 * Output: unity_handoff/ (data/, golden/). Deterministic: rerunning produces identical files.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseCsv } from './csv.ts';
import { generateWorldTiles, WORLD_SEED } from '../src/game/worldGenerator.ts';
import { WORLD_CONSTANTS } from '../src/game/constants.ts';
import {
  createSimState, step, applyCommand, stateHash, startingGarrison, factionForWorldTile,
  SIM_CONFIG, PLAYER_ID, SimState, Command,
} from '../src/sim/engine.ts';
import { botAct } from '../src/sim/bot.ts';
import {
  calculateCreatureStatsAtLevel, calculateCreatureSynergies, TIER_BASE_FACTORS, RARITY_STAT_MULTIPLIERS, RARITY_GROWTH_MULTIPLIERS,
  MAX_CREATURE_LEVEL,
} from '../src/game/creatureBalance.ts';
import type { CreatureCard, CreatureRarity, CreatureFamily, CreatureElement } from '../src/game/types.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'unity_handoff');
const DATA = join(ROOT, 'public/assets/aistudio');
const CHECKPOINT_EVERY = 50;

function write(rel: string, value: unknown) {
  const path = join(OUT, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
  console.log('wrote', rel);
}

function findOne(prefix: string): string {
  const m = readdirSync(DATA).filter((f) => f.startsWith(prefix) && f.endsWith('.csv'));
  if (m.length !== 1) throw new Error(`expected one ${prefix}*.csv`);
  return join(DATA, m[0]);
}

function exportWorld() {
  const tiles = generateWorldTiles(WORLD_SEED).map((t) => {
    const owner = factionForWorldTile(t);
    return {
      id: t.id, x: t.x, y: t.y, biome: t.biome, type: t.type, name: t.name, level: t.level,
      owner, startingGarrison: startingGarrison(t, owner),
    };
  });
  write('data/world_tiles.json', {
    seed: WORLD_SEED,
    gridCols: WORLD_CONSTANTS.GRID_COLS,
    gridRows: WORLD_CONSTANTS.GRID_ROWS,
    tiles,
  });
}

function exportConfig() {
  write('data/sim_config.json', {
    note: 'PLACEHOLDER BALANCE. All values are integers. Percentages are basis points (1/10000).',
    config: SIM_CONFIG,
  });
}

function exportBalance() {
  const creatures = parseCsv(readFileSync(findOne('Shattered_Dominion_432_Creatures_'), 'utf8'));
  const [header, ...rows] = creatures;
  const records = rows.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
  write('data/creatures.json', { count: records.length, columns: header, creatures: records });

  const rarity = parseCsv(readFileSync(findOne('rarity_pull_rates_'), 'utf8'));
  write('data/rarity_table.json', { rows: rarity.slice(0, 7) });

  const matrix = (prefix: string) => {
    const rows2 = parseCsv(readFileSync(findOne(prefix), 'utf8'));
    const labels = rows2[0].slice(1);
    return { labels, rows: rows2.slice(1).map((r) => ({ attacker: r[0], values: r.slice(1).map(Number) })) };
  };
  write('data/element_matchups.json', matrix('element_matchups_'));
  write('data/family_matchups.json', matrix('family_matchups_'));
  write('data/combat_rules.json', { rules: parseCsv(readFileSync(findOne('combat_rules_'), 'utf8')).slice(1).map(([rule, value]) => ({ rule, value })) });
}

/** Plays the scripted bot and records a checkpoint hash every CHECKPOINT_EVERY ticks plus the command log. */
function recordMatch(seed: string) {
  let state: SimState = createSimState(generateWorldTiles(seed));
  const log: Array<Command & { tick: number }> = [];
  const checkpoints: Array<{ tick: number; hash: string }> = [{ tick: 0, hash: stateHash(state) }];
  while (state.status === 'ongoing') {
    const cmd = botAct(state);
    if (cmd) {
      const r = applyCommand(state, cmd);
      if (r.ok) { log.push({ ...cmd, tick: state.tick }); state = r.state; }
    }
    state = step(state);
    if (state.tick % CHECKPOINT_EVERY === 0) checkpoints.push({ tick: state.tick, hash: stateHash(state) });
  }
  const finalHash = stateHash(state);
  return {
    seed,
    player: PLAYER_ID,
    botVersion: 'bot-v2: send the full staging pool from the strongest tile to the weakest beatable neighbour (10% margin), every 3 ticks',
    config: SIM_CONFIG,
    commands: log,
    checkpoints,
    final: {
      tick: state.tick,
      status: state.status,
      hash: finalHash,
      playerTiles: state.tiles.filter((t) => t.owner === PLAYER_ID).length,
      npcTiles: state.tiles.filter((t) => t.owner !== null && t.owner !== PLAYER_ID).length,
    },
  };
}

function exportGolden() {
  const record = recordMatch(WORLD_SEED);
  write('golden/sim_match_canonical.json', record);
  writeFileSync(join(ROOT, 'tests/golden/sim_match.json'), JSON.stringify(record, null, 2) + '\n', 'utf8');
  console.log('wrote tests/golden/sim_match.json');
}

function exportCreatureTables() {
  // Stat curves come straight from the prototype's creatureBalance.ts. Stars are not in the CSV,
  // so the table assumes stars = tier (the prototype's default when stars is unset).
  const rarities: CreatureRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];
  const table: Array<Record<string, unknown>> = [];
  for (let tier = 1; tier <= 6; tier++) {
    for (const rarity of rarities) {
      const levels = [];
      for (let level = 1; level <= MAX_CREATURE_LEVEL; level++) {
        const st = calculateCreatureStatsAtLevel({ tier, rarity, stars: tier }, level);
        levels.push({
          level: st.level, hp: st.hp, atk: st.atk, def: st.def, spd: st.spd,
          combatRating: st.combatRating, expNeededNext: st.expNeededNext, goldCostNext: st.goldCostNext,
        });
      }
      table.push({ tier, rarity, stars: tier, levels });
    }
  }
  write('data/creature_stat_table.json', {
    source: 'src/game/creatureBalance.ts (prototype), exported verbatim',
    note: 'Integer values. Look up by (tier, rarity); level is 1..50. Stars assumed equal to tier.',
    tierBaseFactors: TIER_BASE_FACTORS,
    rarityStatMultipliers: RARITY_STAT_MULTIPLIERS,
    rarityGrowthMultipliers: RARITY_GROWTH_MULTIPLIERS,
    table,
  });

  // Synergy rules, read through the prototype's public function using synthetic creatures.
  const elements: CreatureElement[] = ['Fire','Water','Earth','Wind','Lightning','Frost','Nature','Shadow','Light','Arcane','Poison','Void'];
  const families: CreatureFamily[] = ['Dragons','Undead','Elementals','Demons','Beasts','Celestials','Swarmkin','Abyssals','Humanoids','Giants','Fae','Mechanicals'];
  const mk = (element: CreatureElement, family: CreatureFamily) => ({ element, family } as unknown as CreatureCard);
  const elementRules = [2, 3, 4].map((n) => {
    const r = calculateCreatureSynergies(Array.from({ length: n }, () => mk('Fire', 'Dragons')));
    const e = r.elementSynergies[0];
    return { count: n, tier: e.tier, title: e.title, powerBonusPercent: e.powerBonusPercent, defenseBonusPercent: e.defenseBonusPercent };
  });
  const familyRules = families.map((f) => {
    const r = calculateCreatureSynergies([mk('Fire', f), mk('Water', f)]);
    const fs = r.familySynergies[0];
    return { family: f, title: fs.title, effect: fs.effectDescription, statBonus: fs.statBonus, threshold: 2 };
  });
  write('data/creature_synergy_rules.json', {
    source: 'src/game/creatureBalance.ts (prototype), read through calculateCreatureSynergies()',
    elementRules,
    familyRules,
    note: 'Element tiers are by count of the same element; the prototype also awards no bonus for 1. Family bonuses need 2+ of a family. Commander-creature bonds are not exported yet.',
  });
}

exportWorld();
exportConfig();
exportBalance();
exportGolden();
exportCreatureTables();
