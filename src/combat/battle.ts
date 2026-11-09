/**
 * Deterministic creature-only battle (SD-04). Implements CR-002 REV1 rules and schema creature-combat/2
 * (adds damage over time, shields, evasion, blindness, root, stun, teleport, chain targeting and team
 * skill damage). Every rule here is a builder proposal awaiting owner review, and none uses randomness.
 *
 * Geometry (assumption): attacker army row r sits on field row 2 - r; defender army row r on field row 3 + r.
 * Provisional: MAX_ROUNDS = 20, timeout tiebreak by HP share, turn order fixed at battle start.
 * Not implemented: element/family matchups (K4, off), commanders, troops (removed by design).
 */

import { CombatCreature, ArmySpec, Side, validateArmy, footprintCells, SkillDef, SIZE_FOOTPRINTS } from './schema.ts';
import { calculateCreatureSynergies } from '../game/creatureBalance.ts';
import { durationForLevel } from './skills.ts';
import type { CreatureCard } from '../game/types.ts';

export const MAX_ROUNDS = 20;
const DIRS: Array<[number, number]> = [[0, -1], [0, 1], [-1, 0], [1, 0]];

type StatKey = 'atk' | 'def' | 'spd' | 'skill';
interface Mod { stat: StatKey; bps: number; expiresRound: number; source: string; }
interface Dot { amount: number; expiresRound: number; }
interface Unit extends CombatCreature {
  side: Side;
  maxHp: number;
  base: { atk: number; def: number; spd: number };
  mods: Mod[];
  cooldowns: Record<string, number>;
  alive: boolean;
  shield: number;
  shieldUntil: number;
  skillPowerBps: number;
  synergyBps: number;
  evade: number;
  blind: number;
  rootedUntil: number;
  stunnedUntil: number;
  dots: Dot[];
}

export type ActionKind = 'move' | 'attack' | 'skill' | 'passive' | 'death' | 'victory' | 'timeout' | 'miss' | 'dot' | 'status';

export interface BattleEvent {
  round: number;
  actor: string;
  action: ActionKind;
  target: string | null;
  amount: number;
  from?: { col: number; row: number };
  to?: { col: number; row: number };
}

export interface BattleResult {
  winner: Side;
  reason: 'annihilation' | 'timeout';
  rounds: number;
  events: BattleEvent[];
  roundHashes: string[];
  finalHp: Record<string, number>;
  finalAnchors: Record<string, { col: number; row: number }>;
}

/** Effective stat: base value with each active modifier applied in order, integer math. */
function eff(u: Unit, stat: 'atk' | 'def' | 'spd'): number {
  let v = u.base[stat];
  for (const m of u.mods) if (m.stat === stat) v = Math.floor((v * m.bps) / 10000);
  return v;
}

/** Team skill damage multiplier in basis points, from skill-stat modifiers. */
function skillBps(u: Unit): number {
  let v = 10000;
  for (const m of u.mods) if (m.stat === 'skill') v = Math.floor((v * m.bps) / 10000);
  return v;
}

function fieldRowFor(side: Side, armyRow: number): number {
  return side === 'attacker' ? 2 - armyRow : 3 + armyRow;
}

function fieldCells(u: Unit): Array<{ col: number; row: number }> {
  return footprintCells(u).map((c) => ({ col: c.col, row: fieldRowFor(u.side, c.row) }));
}

function distance(a: Unit, b: Unit): number {
  let best = Infinity;
  for (const p of fieldCells(a)) for (const q of fieldCells(b)) best = Math.min(best, Math.abs(p.col - q.col) + Math.abs(p.row - q.row));
  return best;
}

function fnv(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function byId(a: { instanceId: string }, b: { instanceId: string }): number {
  return a.instanceId < b.instanceId ? -1 : a.instanceId > b.instanceId ? 1 : 0;
}

export function createBattle(attacker: ArmySpec, defender: ArmySpec): { units: Unit[] } {
  const errors = [...validateArmy(attacker), ...validateArmy(defender)];
  if (errors.length) throw new Error('invalid army: ' + errors.join('; '));
  const make = (c: CombatCreature, side: Side): Unit => ({
    ...c, side, maxHp: c.hp, base: { atk: c.atk, def: c.def, spd: c.spd }, mods: [], cooldowns: {}, alive: true,
    shield: 0, shieldUntil: 0, evade: 0, blind: 0, rootedUntil: 0, stunnedUntil: 0, dots: [],
    skillPowerBps: c.skillPowerBps ?? 10000, synergyBps: c.synergyBps ?? 10000,
  });
  return { units: [...attacker.creatures.map((c) => make(c, 'attacker')), ...defender.creatures.map((c) => make(c, 'defender'))] };
}

function order(units: Unit[]): Unit[] {
  return [...units].sort((a, b) => eff(b, 'spd') - eff(a, 'spd') || byId(a, b));
}

function enemiesOf(units: Unit[], u: Unit): Unit[] { return units.filter((x) => x.alive && x.side !== u.side); }
function alliesInRange(units: Unit[], u: Unit): Unit[] { return units.filter((x) => x.alive && x.side === u.side && distance(u, x) <= u.range); }
function enemiesInRange(units: Unit[], u: Unit): Unit[] {
  return enemiesOf(units, u).filter((x) => distance(u, x) <= u.range).sort((a, b) => distance(u, a) - distance(u, b) || byId(a, b));
}

/** Nearest living enemy. Ties: anchor row asc, anchor column asc, instance id asc. */
function nearestEnemy(units: Unit[], u: Unit): Unit | null {
  const cands = enemiesOf(units, u);
  if (!cands.length) return null;
  return cands.reduce((best, t) => {
    const dt = distance(u, t), db = distance(u, best);
    if (dt !== db) return dt < db ? t : best;
    if (t.anchor.row !== best.anchor.row) return t.anchor.row < best.anchor.row ? t : best;
    if (t.anchor.col !== best.anchor.col) return t.anchor.col < best.anchor.col ? t : best;
    return t.instanceId < best.instanceId ? t : best;
  });
}

function damageFrom(atk: number, def: number, percent = 100): number {
  const raw = Math.max(0, Math.floor((atk * percent) / 100) - def);
  return Math.max(1, raw);
}

function conditionMet(cond: SkillDef['condition'], u: Unit, units: Unit[]): boolean {
  if (cond === 'always') return true;
  if (cond === 'hp_below_half') return u.hp * 2 < u.maxHp;
  const t = nearestEnemy(units, u);
  return !!t && distance(u, t) <= u.range;
}

function cellsForAnchor(u: Unit, col: number, row: number): Array<{ col: number; row: number }> {
  return SIZE_FOOTPRINTS[u.sizeClass].cells.map(([dc, dr]) => ({ col: col + dc, row: fieldRowFor(u.side, row + dr) }));
}

function inBounds(u: Unit, col: number, row: number): boolean {
  return SIZE_FOOTPRINTS[u.sizeClass].cells.every(([dc, dr]) => {
    const c = col + dc, r = row + dr;
    return c >= 0 && c < 5 && r >= 0 && r < 3;
  });
}

function occupiedByOthers(units: Unit[], self: Unit, cells: Array<{ col: number; row: number }>): boolean {
  for (const x of units) {
    if (!x.alive || x === self) continue;
    for (const c of fieldCells(x)) if (cells.some((p) => p.col === c.col && p.row === c.row)) return true;
  }
  return false;
}

/** Moves toward the nearest enemy by at most `movement` steps. Deterministic BFS. */
function moveToward(units: Unit[], u: Unit, target: Unit): { col: number; row: number } | null {
  const start = { col: u.anchor.col, row: u.anchor.row };
  const key = (c: number, r: number) => `${c},${r}`;
  const seen = new Set<string>([key(start.col, start.row)]);
  let frontier = [start];
  let best: { col: number; row: number; d: number; steps: number } | null = null;
  const targetCells = fieldCells(target);
  const scoreOf = (c: number, r: number) => {
    let d = Infinity;
    for (const p of cellsForAnchor(u, c, r)) for (const q of targetCells) d = Math.min(d, Math.abs(p.col - q.col) + Math.abs(p.row - q.row));
    return d;
  };
  const consider = (c: number, r: number, steps: number) => {
    const d = scoreOf(c, r);
    const better = !best || d < best.d || (d === best.d && (steps < best.steps || (steps === best.steps && (r < best.row || (r === best.row && c < best.col)))));
    if (better) best = { col: c, row: r, d, steps };
  };
  consider(start.col, start.row, 0);
  for (let step = 1; step <= u.movement; step++) {
    const next: Array<{ col: number; row: number }> = [];
    for (const f of frontier) for (const [dc, dr] of DIRS) {
      const c = f.col + dc, r = f.row + dr;
      if (seen.has(key(c, r)) || !inBounds(u, c, r)) continue;
      if (occupiedByOthers(units, u, cellsForAnchor(u, c, r))) continue;
      seen.add(key(c, r));
      next.push({ col: c, row: r });
      consider(c, r, step);
    }
    frontier = next;
  }
  if (!best) return null;
  const chosen = best as { col: number; row: number; d: number; steps: number };
  if (chosen.col === start.col && chosen.row === start.row) return null;
  return { col: chosen.col, row: chosen.row };
}

/** Pushes the target one cell away from the source along the axis of greater separation. */
function knockback(units: Unit[], src: Unit, tgt: Unit, round: number): { from: { col: number; row: number }; to: { col: number; row: number } } | null {
  if (tgt.rootedUntil >= round) return null;
  const s = fieldCells(src), t = fieldCells(tgt);
  const sCol = s.reduce((a, p) => a + p.col, 0), sRow = s.reduce((a, p) => a + p.row, 0);
  const tCol = t.reduce((a, p) => a + p.col, 0), tRow = t.reduce((a, p) => a + p.row, 0);
  const colDiff = tCol * s.length - sCol * t.length;
  const rowDiff = tRow * s.length - sRow * t.length;
  let stepCol = 0, stepRow = 0;
  if (Math.abs(colDiff) >= Math.abs(rowDiff)) stepCol = colDiff >= 0 ? 1 : -1;
  else stepRow = rowDiff >= 0 ? 1 : -1;
  const armyRowStep = tgt.side === 'attacker' ? -stepRow : stepRow;
  const nc = tgt.anchor.col + stepCol, nr = tgt.anchor.row + armyRowStep;
  if (!inBounds(tgt, nc, nr)) return null;
  if (occupiedByOthers(units, tgt, cellsForAnchor(tgt, nc, nr))) return null;
  const from = { ...tgt.anchor };
  tgt.anchor = { col: nc, row: nr };
  return { from, to: { ...tgt.anchor } };
}

/** Teleport: move to the free legal square within two steps that is closest to the nearest enemy. */
function teleport(units: Unit[], u: Unit, round: number): { from: { col: number; row: number }; to: { col: number; row: number } } | null {
  const target = nearestEnemy(units, u);
  if (!target || u.rootedUntil >= round) return null;
  const start = { col: u.anchor.col, row: u.anchor.row };
  let best: { col: number; row: number; d: number } | null = null;
  for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
    const steps = Math.abs(col - start.col) + Math.abs(row - start.row);
    if (steps === 0 || steps > 2 || !inBounds(u, col, row)) continue;
    if (occupiedByOthers(units, u, cellsForAnchor(u, col, row))) continue;
    let d = Infinity;
    for (const p of cellsForAnchor(u, col, row)) for (const q of fieldCells(target)) d = Math.min(d, Math.abs(p.col - q.col) + Math.abs(p.row - q.row));
    if (!best || d < best.d || (d === best.d && (row < best.row || (row === best.row && col < best.col)))) best = { col, row, d };
  }
  if (!best) return null;
  const from = { ...u.anchor };
  u.anchor = { col: best.col, row: best.row };
  return { from, to: { ...u.anchor } };
}

/** Targets for a skill, or null when the skill has no legal target right now. */
function skillTargets(units: Unit[], u: Unit, s: SkillDef): Unit[] | null {
  switch (s.targeting) {
    case 'self': return [u];
    case 'nearest_enemy': {
      const t = nearestEnemy(units, u);
      return t && distance(u, t) <= u.range ? [t] : null;
    }
    case 'chain': {
      const list = enemiesInRange(units, u);
      if (!list.length) return null;
      return list.slice(0, 2);
    }
    case 'all_enemies': {
      const list = enemiesInRange(units, u);
      return list.length ? list : null;
    }
    case 'all_allies': return alliesInRange(units, u);
    case 'ally_in_range': {
      const list = alliesInRange(units, u);
      if (!list.length) return null;
      return [list.reduce((best, x) => {
        const lhs = x.hp * best.maxHp, rhs = best.hp * x.maxHp;
        if (lhs !== rhs) return lhs < rhs ? x : best;
        return byId(x, best) < 0 ? x : best;
      })];
    }
  }
  return null;
}

export function runBattle(attacker: ArmySpec, defender: ArmySpec): BattleResult {
  const { units } = createBattle(attacker, defender);
  const events: BattleEvent[] = [];
  const roundHashes: string[] = [];

  // Team synergy bonuses (prototype rules, creatureBalance.calculateCreatureSynergies), per side, at battle start.
  // Element tiers add ATK (powerBonusPercent) and DEF (defenseBonusPercent). Family bonuses add ATK, DEF or SPD.
  for (const side of ['attacker', 'defender'] as Side[]) {
    const members = units.filter((u) => u.side === side && u.element && u.family);
    if (!members.length) continue;
    const report = calculateCreatureSynergies(members.map((m) => ({ element: m.element, family: m.family } as unknown as CreatureCard)));
    // Each member's synergy multiplier scales the percentage before it becomes a modifier.
    const pct = (p: number, m: Unit) => 10000 + Math.floor((p * 100 * m.synergyBps) / 10000);
    for (const es of report.elementSynergies) {
      for (const m of members.filter((x) => x.element === es.element)) {
        if (es.powerBonusPercent) m.mods.push({ stat: 'atk', bps: pct(es.powerBonusPercent, m), expiresRound: Infinity, source: 'synergy' });
        if (es.defenseBonusPercent) m.mods.push({ stat: 'def', bps: pct(es.defenseBonusPercent, m), expiresRound: Infinity, source: 'synergy' });
      }
    }
    for (const fs of report.familySynergies) {
      for (const m of members.filter((x) => x.family === fs.family)) {
        const sb = fs.statBonus;
        if (sb.atkPercent) m.mods.push({ stat: 'atk', bps: pct(sb.atkPercent, m), expiresRound: Infinity, source: 'synergy' });
        if (sb.defPercent) m.mods.push({ stat: 'def', bps: pct(sb.defPercent, m), expiresRound: Infinity, source: 'synergy' });
        if (sb.spdPercent) m.mods.push({ stat: 'spd', bps: pct(sb.spdPercent, m), expiresRound: Infinity, source: 'synergy' });
      }
    }
  }

  // battle_start passives: permanent stat buffs, and evade charges.
  for (const u of [...units].sort(byId)) {
    for (const p of u.passives) {
      if (p.trigger !== 'battle_start') continue;
      for (const e of p.effects) {
        if (e.type === 'evade') { u.evade += e.amount; events.push({ round: 0, actor: u.instanceId, action: 'passive', target: u.instanceId, amount: e.amount }); continue; }
        if (e.type !== 'buff' || !e.stat || e.stat === 'none') continue;
        u.mods.push({ stat: e.stat as StatKey, bps: e.amount, expiresRound: Infinity, source: 'passive' });
        events.push({ round: 0, actor: u.instanceId, action: 'passive', target: u.instanceId, amount: e.amount });
      }
    }
  }

  let turnOrder = order(units);
  let round = 0;
  const finish = (winner: Side, reason: BattleResult['reason']): BattleResult => {
    const finalHp: Record<string, number> = {};
    const finalAnchors: Record<string, { col: number; row: number }> = {};
    for (const u of units) { finalHp[u.instanceId] = u.hp; finalAnchors[u.instanceId] = { ...u.anchor }; }
    return { winner, reason, rounds: round, events, roundHashes, finalHp, finalAnchors };
  };

  // Damage to a unit: evasion first, then shield, then HP. `ignoreEvasion` is for damage over time.
  const hit = (src: Unit, t: Unit, amount: number, emit: (e: BattleEvent) => void, opts: { evadable: boolean }) => {
    if (opts.evadable) {
      if (src.blind > 0) { src.blind -= 1; emit({ round, actor: src.instanceId, action: 'miss', target: t.instanceId, amount: 0 }); return; }
      if (t.evade > 0) { t.evade -= 1; emit({ round, actor: src.instanceId, action: 'miss', target: t.instanceId, amount: 0 }); return; }
    }
    let rest = amount;
    if (t.shield > 0 && round <= t.shieldUntil) {
      const absorbed = Math.min(t.shield, rest);
      t.shield -= absorbed; rest -= absorbed;
    }
    t.hp = Math.max(0, t.hp - rest);
  };

  while (round < MAX_ROUNDS) {
    round++;
    const roundEvents: BattleEvent[] = [];
    const emit = (e: BattleEvent) => { roundEvents.push({ ...e, round }); events.push({ ...e, round }); };

    // 1. Round start: expire modifiers, cooldowns fall by 1, shields lapse.
    for (const u of units) {
      u.mods = u.mods.filter((m) => m.expiresRound >= round && !m.source.startsWith('aura:'));
      u.dots = u.dots.filter((d) => d.expiresRound >= round);
      if (round > u.shieldUntil) u.shield = 0;
      if (u.alive) for (const k of Object.keys(u.cooldowns)) u.cooldowns[k] = Math.max(0, u.cooldowns[k] - 1);
    }
    // Aura passives: each living source buffs living allies in its range, renewed every round.
    for (const u of [...units].sort(byId)) {
      if (!u.alive) continue;
      for (const p of u.passives) {
        if (p.trigger !== 'aura') continue;
        for (const e of p.effects) {
          if (e.type !== 'buff' || !e.stat || e.stat === 'none') continue;
          for (const ally of alliesInRange(units, u)) {
            if (ally === u) continue;
            ally.mods.push({ stat: e.stat as StatKey, bps: e.amount, expiresRound: round, source: `aura:${u.instanceId}` });
          }
        }
      }
    }
    // Round-start passives (self heal) and damage over time, in instance order.
    for (const u of [...units].sort(byId)) {
      if (!u.alive) continue;
      for (const p of u.passives) {
        if (p.trigger !== 'round_start') continue;
        for (const e of p.effects) {
          if (e.type !== 'heal') continue;
          const healed = Math.min(u.maxHp - u.hp, Math.floor((u.maxHp * e.amount) / 100));
          if (healed > 0) { u.hp += healed; emit({ round, actor: u.instanceId, action: 'passive', target: u.instanceId, amount: healed }); }
        }
      }
      for (const d of u.dots) {
        if (!u.alive) break;
        hit(u, u, d.amount, emit, { evadable: false });
        emit({ round, actor: u.instanceId, action: 'dot', target: u.instanceId, amount: d.amount });
      }
      if (u.hp <= 0 && u.alive) { u.alive = false; emit({ round, actor: u.instanceId, action: 'death', target: null, amount: 0 }); }
    }
    if (!units.some((x) => x.alive && x.side === 'attacker') || !units.some((x) => x.alive && x.side === 'defender')) {
      roundHashes.push(fnv(roundEvents.map((e) => [e.round, e.actor, e.action, e.target ?? '-', e.amount].join('|')).join('\n')));
      if (!units.some((x) => x.alive && x.side === 'attacker') && !units.some((x) => x.alive && x.side === 'defender')) return finish('defender', 'annihilation');
      return finish(units.some((x) => x.alive && x.side === 'attacker') ? 'attacker' : 'defender', 'annihilation');
    }

    // 2. Turns in the fixed initiative order.
    for (const u of turnOrder) {
      if (!u.alive) continue;
      const target = nearestEnemy(units, u);
      if (!target) break;
      if (u.stunnedUntil >= round) { emit({ round, actor: u.instanceId, action: 'status', target: null, amount: 0 }); continue; }

      let acted = false;
      for (const s of u.skills) {
        if ((u.cooldowns[s.skillId] ?? 0) > 0) continue;
        if (!conditionMet(s.condition, u, units)) continue;
        const targets = skillTargets(units, u, s);
        if (!targets) continue;
        for (const e of s.effects) {
          if (e.type === 'move') {
            if (u.rootedUntil >= round) continue;
            const t = targets[0];
            const res = knockback(units, u, t, round);
            if (res) emit({ round, actor: u.instanceId, action: 'move', target: t.instanceId, amount: 0, from: res.from, to: res.to });
            continue;
          }
          if (e.type === 'teleport') {
            const res = teleport(units, u, round);
            if (res) emit({ round, actor: u.instanceId, action: 'move', target: null, amount: 0, from: res.from, to: res.to });
            continue;
          }
          for (let i = 0; i < targets.length; i++) {
            const t = targets[i];
            if (e.type === 'damage') {
              const percent = Math.floor((Math.floor((e.amount * skillBps(u)) / 10000) * u.skillPowerBps) / 10000);
              const scaled = s.targeting === 'chain' && i > 0 ? Math.floor(percent / 2) : percent;
              const amount = damageFrom(eff(u, 'atk'), eff(t, 'def'), scaled);
              hit(u, t, amount, emit, { evadable: true });
              emit({ round, actor: u.instanceId, action: 'skill', target: t.instanceId, amount });
            } else if (e.type === 'heal') {
              const healed = Math.min(t.maxHp - t.hp, Math.floor((t.maxHp * e.amount) / 100));
              t.hp += healed;
              emit({ round, actor: u.instanceId, action: 'skill', target: t.instanceId, amount: healed });
            } else if (e.type === 'buff' || e.type === 'debuff') {
              // Applied in this round; lasts N rounds after it is applied (N = skill level, or the effect's duration).
              t.mods.push({ stat: e.stat as StatKey, bps: e.amount, expiresRound: round + (s.level ? durationForLevel(s.level) : (e.durationRounds ?? 1)), source: `skill:${u.instanceId}` });
              emit({ round, actor: u.instanceId, action: 'skill', target: t.instanceId, amount: e.amount });
            } else if (e.type === 'dot') {
              // Ticks at the start of each of the next durationRounds rounds.
              t.dots.push({ amount: Math.floor((t.maxHp * e.amount) / 100), expiresRound: round + (s.level ? durationForLevel(s.level) : (e.durationRounds ?? 1)) });
              emit({ round, actor: u.instanceId, action: 'skill', target: t.instanceId, amount: e.amount });
            } else if (e.type === 'shield') {
              t.shield = Math.floor((t.maxHp * e.amount) / 100);
              t.shieldUntil = round + (s.level ? durationForLevel(s.level) : (e.durationRounds ?? 1)) - 1;
              emit({ round, actor: u.instanceId, action: 'skill', target: t.instanceId, amount: t.shield });
            } else if (e.type === 'evade') {
              t.evade += e.amount;
              emit({ round, actor: u.instanceId, action: 'skill', target: t.instanceId, amount: e.amount });
            } else if (e.type === 'blind') {
              t.blind += e.amount;
              emit({ round, actor: u.instanceId, action: 'skill', target: t.instanceId, amount: e.amount });
            } else if (e.type === 'root') {
              t.rootedUntil = Math.max(t.rootedUntil, round + (s.level ? durationForLevel(s.level) : (e.durationRounds ?? 1)) - 1);
              emit({ round, actor: u.instanceId, action: 'skill', target: t.instanceId, amount: e.durationRounds ?? 1 });
            } else if (e.type === 'stun') {
              t.stunnedUntil = Math.max(t.stunnedUntil, round + (s.level ? durationForLevel(s.level) : (e.durationRounds ?? 1)) - 1);
              emit({ round, actor: u.instanceId, action: 'skill', target: t.instanceId, amount: e.durationRounds ?? 1 });
            }
          }
        }
        u.cooldowns[s.skillId] = s.cooldownRounds;
        acted = true;
        break;
      }

      if (!acted) {
        if (distance(u, target) <= u.range) {
          const amount = damageFrom(eff(u, 'atk'), eff(target, 'def'));
          hit(u, target, amount, emit, { evadable: true });
          emit({ round, actor: u.instanceId, action: 'attack', target: target.instanceId, amount });
        } else if (u.rootedUntil < round) {
          const dest = moveToward(units, u, target);
          if (dest) {
            const from = { col: u.anchor.col, row: u.anchor.row };
            u.anchor = { col: dest.col, row: dest.row };
            emit({ round, actor: u.instanceId, action: 'move', target: null, amount: 0, from, to: { ...u.anchor } });
            const t2 = nearestEnemy(units, u);
            if (t2 && distance(u, t2) <= u.range) {
              const amount = damageFrom(eff(u, 'atk'), eff(t2, 'def'));
              hit(u, t2, amount, emit, { evadable: true });
              emit({ round, actor: u.instanceId, action: 'attack', target: t2.instanceId, amount });
            }
          }
        }
      }

      for (const x of units) {
        if (x.alive && x.hp <= 0) { x.alive = false; emit({ round, actor: x.instanceId, action: 'death', target: null, amount: 0 }); }
      }
      if (!units.some((x) => x.alive && x.side === 'attacker') || !units.some((x) => x.alive && x.side === 'defender')) break;
    }

    roundHashes.push(fnv(roundEvents.map((e) => [e.round, e.actor, e.action, e.target ?? '-', e.amount].join('|')).join('\n')));

    const atkAlive = units.some((x) => x.alive && x.side === 'attacker');
    const defAlive = units.some((x) => x.alive && x.side === 'defender');
    if (!atkAlive && !defAlive) return finish('defender', 'annihilation');
    if (!defAlive) return finish('attacker', 'annihilation');
    if (!atkAlive) return finish('defender', 'annihilation');
  }

  const share = (side: Side) => {
    const mine = units.filter((x) => x.side === side);
    return { hp: mine.reduce((s, x) => s + x.hp, 0), max: mine.reduce((s, x) => s + x.maxHp, 0) };
  };
  const a = share('attacker'), d = share('defender');
  const winner: Side = a.hp * d.max > d.hp * a.max ? 'attacker' : 'defender';
  events.push({ round, actor: 'battle', action: 'timeout', target: null, amount: 0 });
  return finish(winner, 'timeout');
}
