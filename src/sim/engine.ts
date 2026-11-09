/**
 * Shattered Dominion — Deterministic Strategy Simulation (CR-001: 100 x 100 territories)
 *
 * Solo conquest against NPC factions, designed for a later multiplayer server.
 *
 * Rules for portability:
 *  - All quantities are non-negative integers. Percentages and multipliers are basis points (1/10000).
 *  - Division truncates toward zero. Every value stays non-negative, so JS and C# agree.
 *  - No floats, no Date, no Math.random. Same initial state + same commands = same state.
 *  - State changes happen only through applyCommand() and step(). Commands carry a playerId.
 *  - Coordinates are integers 0..99. Lookups go through a coordinate index, never a full scan.
 *
 * Victory: the player holds VICTORY_TOWERS (4) of the 6 mythical towers.
 * Defeat: the player has no territories and no armies.
 * Timeout: MAX_TICKS reached.
 *
 * Tick order (fixed):
 *  1. apply commands (between ticks)
 *  2. tick += 1
 *  3. resolve armies that arrive this tick, in army-id order
 *  4. regeneration on owned tiles (every GROWTH_INTERVAL ticks)
 *  5. NPC decisions, factions in id order, staggered by faction index
 *  6. victory / defeat / timeout check
 */

import type { WorldTile } from '../game/types.ts';

export const PLAYER_ID = 'player';

export type Formation = 'aggressive' | 'balanced' | 'defensive';
export type Status = 'ongoing' | 'victory' | 'defeat' | 'timeout';
export type FactionId = string;

export const SIM_CONFIG = {
  ATTACK_PER_TROOP: 12,
  DEFENSE_PER_TROOP: 12,
  FORMATION_BPS: { aggressive: 12500, balanced: 10800, defensive: 9500 } as Record<Formation, number>,
  MARCH_TICKS: 3,
  GROWTH_INTERVAL: 4,
  GROWTH_AMOUNT: 2,
  NPC_INTERVAL: 5,
  NPC_SEND_BPS: 6000,
  NPC_ATTACK_BPS: 12000,
  STAGING_RADIUS: 2,
  VICTORY_TOWERS: 4,
  MAX_TICKS: 1200,
  DEFENDER_LOSS_DIV: 24,
  CAPTURED_POWER_KEEP_PCT: 50,
} as const;

export interface SimTile {
  id: string;
  x: number;
  y: number;
  biome: string;
  tower: boolean;
  owner: FactionId | null;
  troops: number;
  maxTroops: number;
  power: number;
}

export interface SimArmy {
  id: string;
  owner: FactionId;
  from: string;
  to: string;
  troops: number;
  formation: Formation;
  arriveTick: number;
}

export interface SimState {
  tick: number;
  status: Status;
  tiles: SimTile[];
  armies: SimArmy[];
  factions: FactionId[];
  nextArmyNumber: number;
}

export type Command = {
  type: 'march';
  playerId: FactionId;
  from: string;
  to: string;
  troops: number;
  formation: Formation;
};

export type CommandResult = { ok: true; state: SimState } | { ok: false; error: string; state: SimState };

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/** Maps a generator tile to a faction id. Each NPC citadel becomes its own faction. */
export function factionForWorldTile(t: WorldTile): FactionId | null {
  if (t.owner === 'player') return PLAYER_ID;
  if (t.owner === 'neutral') return null;
  return `npc_${slug(t.ownerName ?? t.owner)}`;
}

/**
 * PLACEHOLDER BALANCE. Starting garrisons keyed by tile type and level. Tune in playtests;
 * regenerate the golden replay after any change.
 */
export function startingGarrison(t: WorldTile, owner: FactionId | null): { troops: number; power: number } {
  if (owner === PLAYER_ID) {
    if (t.type === 'player_citadel') return { troops: 30, power: 40 };
    return { troops: 12, power: 10 };
  }
  switch (t.type) {
    case 'alliance_outpost': return { troops: 20, power: 50 };
    case 'rival_citadel': return { troops: 28, power: 70 };
    case 'ancient_ruin': return { troops: 16, power: 40 };
    case 'mythical_tower': return { troops: 24, power: 60 };
    case 'monster_lair': return { troops: 4 * t.level + 4, power: 10 * t.level + 20 };
    default: return { troops: 4 * t.level, power: 10 * t.level };
  }
}

export function createSimState(worldTiles: WorldTile[]): SimState {
  const tiles: SimTile[] = worldTiles.map((t) => {
    const owner = factionForWorldTile(t);
    const g = startingGarrison(t, owner);
    return {
      id: t.id,
      x: t.x,
      y: t.y,
      biome: t.biome ?? 'unknown',
      tower: t.type === 'mythical_tower',
      owner,
      troops: g.troops,
      maxTroops: g.troops,
      power: g.power,
    };
  });
  tiles.sort(byId);
  const factions = [...new Set(tiles.map((t) => t.owner).filter((o): o is FactionId => o !== null && o !== PLAYER_ID))].sort();
  return { tick: 0, status: 'ongoing', tiles, armies: [], factions, nextArmyNumber: 1 };
}

// ---------- Coordinate index ----------
// Keyed by the tiles array instance. step() and applyCommand() clone the state, so each
// new state builds its index once, on first lookup. Within one state, owner and troop
// changes mutate the same tile objects, so the index stays valid.
const indexCache = new WeakMap<SimTile[], Map<string, SimTile>>();

function indexFor(state: SimState): Map<string, SimTile> {
  let m = indexCache.get(state.tiles);
  if (!m) {
    m = new Map();
    for (const t of state.tiles) m.set(`${t.x},${t.y}`, t);
    indexCache.set(state.tiles, m);
  }
  return m;
}

export function tileAt(state: SimState, x: number, y: number): SimTile | undefined {
  return indexFor(state).get(`${x},${y}`);
}

export function tileById(state: SimState, id: string): SimTile | undefined {
  return state.tiles.find((t) => t.id === id);
}

/** Orthogonal neighbours of a tile, sorted by id. */
export function neighborsOf(state: SimState, tile: SimTile): SimTile[] {
  const out: SimTile[] = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const n = tileAt(state, tile.x + dx, tile.y + dy);
    if (n) out.push(n);
  }
  return out.sort(byId);
}

/** Owned tiles of the faction within STAGING_RADIUS of the origin, nearest first, then by id. */
export function stagingTiles(state: SimState, origin: SimTile, faction: FactionId): SimTile[] {
  const r = SIM_CONFIG.STAGING_RADIUS;
  const out: SimTile[] = [];
  for (let dx = -r; dx <= r; dx++) {
    for (let dy = -r; dy <= r; dy++) {
      const d = Math.abs(dx) + Math.abs(dy);
      if (d > r) continue;
      const t = tileAt(state, origin.x + dx, origin.y + dy);
      if (t && t.owner === faction) out.push(t);
    }
  }
  const dist = (t: SimTile) => Math.abs(t.x - origin.x) + Math.abs(t.y - origin.y);
  return out.sort((a, b) => dist(a) - dist(b) || byId(a, b));
}

/** Troops available to a march from this origin. Every staging tile keeps one troop. */
export function stagingPool(state: SimState, origin: SimTile, faction: FactionId): number {
  return stagingTiles(state, origin, faction).reduce((sum, t) => sum + Math.max(0, t.troops - 1), 0);
}

/** Removes troops from the staging area, nearest tiles first. The caller guarantees availability. */
function drawStaging(state: SimState, origin: SimTile, faction: FactionId, troops: number): void {
  let remaining = troops;
  for (const t of stagingTiles(state, origin, faction)) {
    if (remaining === 0) break;
    const take = Math.min(remaining, Math.max(0, t.troops - 1));
    t.troops -= take;
    remaining -= take;
  }
}

export function attackValue(troops: number, formation: Formation): number {
  return Math.floor((troops * SIM_CONFIG.ATTACK_PER_TROOP * SIM_CONFIG.FORMATION_BPS[formation]) / 10000);
}

export function defenseValue(tile: SimTile): number {
  return tile.power + tile.troops * SIM_CONFIG.DEFENSE_PER_TROOP;
}

export function applyCommand(state: SimState, cmd: Command): CommandResult {
  const fail = (error: string): CommandResult => ({ ok: false, error, state });
  if (state.status !== 'ongoing') return fail('match is over');
  if (cmd.type !== 'march') return fail(`unknown command ${(cmd as { type: string }).type}`);
  if (!Number.isInteger(cmd.troops) || cmd.troops < 1) return fail('troops must be a positive integer');
  if (!['aggressive', 'balanced', 'defensive'].includes(cmd.formation)) return fail('unknown formation');

  const from = tileById(state, cmd.from);
  const to = tileById(state, cmd.to);
  if (!from || !to) return fail('unknown tile');
  if (from.owner !== cmd.playerId) return fail('source tile is not yours');
  if (to.owner === cmd.playerId) return fail('target tile is already yours');
  if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1) return fail('target is not adjacent');
  if (cmd.troops > stagingPool(state, from, cmd.playerId)) return fail('not enough troops within staging range');

  const next = clone(state);
  drawStaging(next, tileById(next, cmd.from)!, cmd.playerId, cmd.troops);
  next.armies.push({
    id: `army_${next.nextArmyNumber}`,
    owner: cmd.playerId,
    from: cmd.from,
    to: cmd.to,
    troops: cmd.troops,
    formation: cmd.formation,
    arriveTick: next.tick + SIM_CONFIG.MARCH_TICKS,
  });
  next.nextArmyNumber += 1;
  return { ok: true, state: next };
}

function resolveArrival(state: SimState, army: SimArmy): void {
  const target = tileById(state, army.to)!;
  const attack = attackValue(army.troops, army.formation);

  if (target.owner === army.owner) {
    target.troops += army.troops;
    return;
  }

  const defense = defenseValue(target);
  if (attack >= defense) {
    const survivors = Math.floor((attack - defense) / SIM_CONFIG.ATTACK_PER_TROOP);
    target.owner = army.owner;
    target.troops = Math.max(1, survivors);
    target.power = Math.floor((target.power * SIM_CONFIG.CAPTURED_POWER_KEEP_PCT) / 100);
  } else {
    const losses = Math.floor(attack / SIM_CONFIG.DEFENDER_LOSS_DIV);
    target.troops = Math.max(0, target.troops - losses);
  }
}

function npcDecide(state: SimState, faction: FactionId): void {
  const owned = state.tiles.filter((t) => t.owner === faction).sort(byId);

  let best: { src: SimTile; tgt: SimTile; send: number; defense: number } | null = null;
  for (const src of owned) {
    const pool = stagingPool(state, src, faction);
    const send = Math.floor((pool * SIM_CONFIG.NPC_SEND_BPS) / 10000);
    if (send < 1) continue;
    const attack = attackValue(send, 'balanced');
    for (const tgt of neighborsOf(state, src)) {
      if (tgt.owner === faction) continue;
      const defense = defenseValue(tgt);
      if (attack * 10000 < defense * SIM_CONFIG.NPC_ATTACK_BPS) continue;
      if (!best || defense < best.defense) best = { src, tgt, send, defense };
    }
  }
  if (!best) return;

  drawStaging(state, best.src, faction, best.send);
  state.armies.push({
    id: `army_${state.nextArmyNumber}`,
    owner: faction,
    from: best.src.id,
    to: best.tgt.id,
    troops: best.send,
    formation: 'balanced',
    arriveTick: state.tick + SIM_CONFIG.MARCH_TICKS,
  });
  state.nextArmyNumber += 1;
}

function checkStatus(state: SimState): void {
  const towersHeld = state.tiles.filter((t) => t.tower && t.owner === PLAYER_ID).length;
  if (towersHeld >= SIM_CONFIG.VICTORY_TOWERS) {
    state.status = 'victory';
    return;
  }
  const playerTiles = state.tiles.some((t) => t.owner === PLAYER_ID);
  const playerArmies = state.armies.some((a) => a.owner === PLAYER_ID);
  if (!playerTiles && !playerArmies) {
    state.status = 'defeat';
    return;
  }
  if (state.tick >= SIM_CONFIG.MAX_TICKS) state.status = 'timeout';
}

/** Advances the match by one tick. Returns a new state; the input is not mutated. */
export function step(input: SimState): SimState {
  if (input.status !== 'ongoing') return input;
  const state = clone(input);
  state.tick += 1;

  const arrivals = state.armies.filter((a) => a.arriveTick <= state.tick).sort(byId);
  for (const army of arrivals) resolveArrival(state, army);
  state.armies = state.armies.filter((a) => a.arriveTick > state.tick);

  if (state.tick % SIM_CONFIG.GROWTH_INTERVAL === 0) {
    for (const t of state.tiles) {
      if (t.owner !== null && t.troops < t.maxTroops) {
        t.troops = Math.min(t.maxTroops, t.troops + SIM_CONFIG.GROWTH_AMOUNT);
      }
    }
  }

  state.factions.forEach((faction, index) => {
    if ((state.tick + index) % SIM_CONFIG.NPC_INTERVAL === 0) npcDecide(state, faction);
  });

  checkStatus(state);
  return state;
}

/** FNV-1a 32-bit over a canonical text form. Easy to reproduce in C#. */
export function stateHash(state: SimState): string {
  const lines: string[] = [
    `T|${state.tick}|${state.status}|${state.nextArmyNumber}`,
    ...[...state.tiles].sort(byId).map((t) => `S|${t.id}|${t.owner ?? '-'}|${t.troops}|${t.power}|${t.maxTroops}`),
    ...[...state.armies].sort(byId).map((a) => `A|${a.id}|${a.owner}|${a.from}|${a.to}|${a.troops}|${a.formation}|${a.arriveTick}`),
  ];
  const text = lines.join('\n');
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
