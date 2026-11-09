/**
 * Playable solo match (builder draft of the match loop). Uses the approved rules:
 * creature armies staged from owned territories (radius 2), tile rosters, capture by survivors,
 * survivors of a failed attack return to origin, empty territories are taken, tower victory (4 of 6).
 *
 * Not decided, so passed in as parameters: the starting roster, NPC citadel rosters, and the NPC policy
 * shipped here (attack when clearly stronger, weakest target first). Those need owner approval.
 */
import { CombatCreature, GRID_COLS, GRID_ROWS, SIZE_FOOTPRINTS, SizeClass } from '../combat/schema.ts';
import { World, Territory, stagingCandidates, attackTerritory, AttackOutcome } from '../world/rosters.ts';
import { runBattle } from '../combat/battle.ts';
import { factionActs, NPC_POWER_CAP_PCT } from './npc.ts';

export const PLAYER = 'player';
export const VICTORY_TOWERS = 4;
export const MATCH_ROUNDS = 40; // provisional cap on player/NPC exchanges

export interface Match {
  world: World;
  towers: Set<string>;        // territory ids of mythical towers
  turn: number;
  status: 'ongoing' | 'victory' | 'defeat' | 'timeout';
  log: string[];
}

/** Places creatures on the 5 x 3 grid, largest first, without overlaps. Throws if they do not fit. */
export function packArmy(creatures: Array<Omit<CombatCreature, 'anchor'>>): CombatCreature[] {
  const order = [...creatures].sort((a, b) => SIZE_FOOTPRINTS[b.sizeClass as SizeClass].count - SIZE_FOOTPRINTS[a.sizeClass as SizeClass].count || (a.instanceId < b.instanceId ? -1 : 1));
  const taken = new Set<string>();
  const out: CombatCreature[] = [];
  for (const c of order) {
    const cells = SIZE_FOOTPRINTS[c.sizeClass as SizeClass].cells;
    let placed = false;
    for (let row = 0; row < GRID_ROWS && !placed; row++) for (let col = 0; col < GRID_COLS && !placed; col++) {
      const ok = cells.every(([dc, dr]) => {
        const cc = col + dc, rr = row + dr;
        return cc < GRID_COLS && rr < GRID_ROWS && !taken.has(`${cc},${rr}`);
      });
      if (ok) {
        cells.forEach(([dc, dr]) => taken.add(`${col + dc},${row + dr}`));
        out.push({ ...c, anchor: { col, row } } as CombatCreature);
        placed = true;
      }
    }
    if (!placed) throw new Error(`creature ${c.instanceId} does not fit the formation`);
  }
  return out;
}

/** Strength used by the NPC policy: integer, combines HP and attack. */
export function rosterPower(roster: CombatCreature[]): number {
  return roster.reduce((s, c) => s + c.hp + c.atk * 10, 0);
}

function logEvent(m: Match, text: string) { m.log.push(`${m.turn}: ${text}`); }

function checkStatus(m: Match): void {
  const towers = [...m.towers].filter((id) => m.world.territories.get(id)?.owner === PLAYER).length;
  if (towers >= VICTORY_TOWERS) { m.status = 'victory'; return; }
  const mine = [...m.world.territories.values()].some((t) => t.owner === PLAYER);
  if (!mine) { m.status = 'defeat'; return; }
  if (m.turn >= MATCH_ROUNDS) m.status = 'timeout';
}

/** Player attack: stages the chosen creatures from owned territories near `originId` and sends them at `targetId`. */
export function playerAttack(m: Match, originId: string, targetId: string, creatureIds: string[]): AttackOutcome {
  if (m.status !== 'ongoing') throw new Error('match is over');
  const origin = m.world.territories.get(originId);
  if (!origin || origin.owner !== PLAYER) throw new Error('origin is not yours');
  const candidates = new Map(stagingCandidates(m.world, origin, PLAYER).map((s) => [s.instanceId, s.tileId] as const));
  const picked: Array<Omit<CombatCreature, 'anchor'>> = [];
  for (const id of creatureIds) {
    const tileId = candidates.get(id);
    if (!tileId) throw new Error(`creature ${id} is not in staging range`);
    const c = m.world.territories.get(tileId)!.roster.find((x) => x.instanceId === id)!;
    picked.push(c);
  }
  const army = { side: 'attacker' as const, creatures: packArmy(picked) };
  const out = attackTerritory(m.world, originId, targetId, army);
  logEvent(m, `${PLAYER} attacks ${targetId} from ${originId}: ${out.captured ? 'captured' : 'repelled'}`);
  m.turn += 1;
  npcTurn(m);
  checkStatus(m);
  return out;
}

/** The NPC army for an attack: staged creatures, weakest first, kept within the power cap. Null if none fits. */
function npcArmy(m: Match, origin: Territory, owner: string, cap: number): CombatCreature[] | null {
  const staged = stagingCandidates(m.world, origin, owner);
  const cands = staged.map((s) => {
    const t = m.world.territories.get(s.tileId)!;
    return t.roster.find((x) => x.instanceId === s.instanceId)!;
  }).sort((a, b) => rosterPower([a]) - rosterPower([b]) || (a.instanceId < b.instanceId ? -1 : 1));
  const chosen: Array<Omit<CombatCreature, 'anchor'>> = [];
  let power = 0;
  for (const c of cands) {
    const p = rosterPower([c as CombatCreature]);
    if (power + p > cap) continue;
    try { packArmy([...chosen, c]); } catch { continue; }
    chosen.push(c);
    power += p;
  }
  return chosen.length ? packArmy(chosen) : null;
}

/** NPC turn: on schedule, each faction attacks its weakest adjacent target with an army under the power cap. */
export function npcTurn(m: Match): void {
  const factions = [...new Set([...m.world.territories.values()].map((t) => t.owner).filter((o): o is string => !!o && o !== PLAYER))].sort();
  const playerStrongest = Math.max(0, ...[...m.world.territories.values()].filter((t) => t.owner === PLAYER).map((t) => rosterPower(t.roster)));
  const cap = Math.floor((playerStrongest * NPC_POWER_CAP_PCT) / 100);
  for (const [index, f] of factions.entries()) {
    if (!factionActs(m.turn, index)) continue;
    let best: { origin: Territory; target: Territory; army: CombatCreature[]; tDef: number } | null = null;
    for (const origin of [...m.world.territories.values()].sort((a, b) => (a.id < b.id ? -1 : 1))) {
      if (origin.owner !== f || origin.roster.length === 0) continue;
      for (const target of m.world.territories.values()) {
        if (target.owner === f || Math.abs(target.x - origin.x) + Math.abs(target.y - origin.y) !== 1) continue;
        const army = npcArmy(m, origin, f, cap);
        if (!army) continue;
        const tDef = rosterPower(target.roster);
        if (rosterPower(army) * 5 < tDef * 6) continue;
        if (!best || tDef < best.tDef || (tDef === best.tDef && target.id < best.target.id)) best = { origin, target, army, tDef };
      }
    }
    if (!best) continue;
    const out = attackTerritory(m.world, best.origin.id, best.target.id, { side: 'attacker', creatures: best.army });
    logEvent(m, `${f} attacks ${best.target.id} from ${best.origin.id}: ${out.captured ? 'captured' : 'repelled'}`);
  }
}

