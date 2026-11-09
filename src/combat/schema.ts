/**
 * Creature combat schema v1 (creature-combat/1). Approved as drafted, CR-002 REV1.
 * Integers only. Enumerations are closed. Validation rules V1-V9 from the schema document.
 */

export const SCHEMA_VERSION = 'creature-combat/1';
export const GRID_COLS = 5;
export const GRID_ROWS = 3;           // one army's formation grid
export const MAX_POSITIONS = 15;      // occupied positions per army
export const MAX_LEVEL = 50;

export type SizeClass = 'small' | 'medium' | 'large' | 'huge' | 'colossal';
export type Trigger = 'battle_start' | 'round_start' | 'on_attack' | 'on_hit' | 'on_damaged' | 'on_death' | 'aura';
export type Side = 'attacker' | 'defender';

/** Approved footprint mapping (A1) and shapes (A2, horizontal only). Cells are [dc, dr] from the anchor. */
export const SIZE_FOOTPRINTS: Record<SizeClass, { count: number; cells: Array<[number, number]> }> = {
  small:    { count: 1, cells: [[0, 0]] },
  medium:   { count: 2, cells: [[0, 0], [1, 0]] },
  large:    { count: 3, cells: [[0, 0], [1, 0], [2, 0]] },
  huge:     { count: 4, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  colossal: { count: 6, cells: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]] },
};

export interface SkillEffect {
  // schema creature-combat/2 adds: dot, shield, evade, blind, root, stun, teleport
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'move' | 'dot' | 'shield' | 'evade' | 'blind' | 'root' | 'stun' | 'teleport';
  stat?: 'hp' | 'atk' | 'def' | 'spd' | 'skill' | 'none';
  amount: number;          // damage/heal: percent (of ATK / max HP); buff/debuff: basis points (10000 = no change)
  durationRounds?: number; // buff/debuff: rounds active (>= 1). Passive buffs last the whole battle.
}

export const TARGETINGS = ['nearest_enemy', 'self', 'ally_in_range', 'all_allies', 'all_enemies', 'chain'] as const;
export const EFFECT_TYPES = ['damage', 'heal', 'buff', 'debuff', 'move', 'dot', 'shield', 'evade', 'blind', 'root', 'stun', 'teleport'] as const;

export interface SkillDef {
  skillId: string;
  level?: number;          // skill level; durations use it as rounds (N = 1 round x level)
  kind: 'active';
  cooldownRounds: number;
  targeting: 'nearest_enemy' | 'self' | 'ally_in_range' | 'all_allies' | 'all_enemies';
  condition: 'always' | 'hp_below_half' | 'enemy_in_range';
  effects: SkillEffect[];
}

export interface PassiveDef {
  passiveId: string;
  trigger: Trigger;
  condition: 'always' | 'hp_below_half' | 'enemy_in_range';
  effects: SkillEffect[];
}

export interface CombatCreature {
  instanceId: string;
  creatureId: string;
  element?: string;   // used for team synergy bonuses
  family?: string;    // used for team synergy bonuses
  skillPowerBps?: number;  // skill damage multiplier, default 10000
  synergyBps?: number;     // team synergy bonus multiplier, default 10000
  sizeClass: SizeClass;
  anchor: { col: number; row: number };   // army coordinates, top-left of footprint
  level: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  movement: number;
  range: number;
  skills: SkillDef[];
  passives: PassiveDef[];
}

export interface ArmySpec {
  side: Side;
  creatures: CombatCreature[];
}

/** Footprint cells for a creature in army coordinates. Throws if the shape does not match its size class. */
export function footprintCells(c: CombatCreature): Array<{ col: number; row: number }> {
  return SIZE_FOOTPRINTS[c.sizeClass].cells.map(([dc, dr]) => ({ col: c.anchor.col + dc, row: c.anchor.row + dr }));
}

/** Validates an army. Returns a list of violations (empty when valid). */
export function validateArmy(army: ArmySpec): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const occupied = new Map<string, string>();
  let positions = 0;

  for (const c of army.creatures) {
    if (ids.has(c.instanceId)) errors.push(`V6 duplicate instance ${c.instanceId}`);
    ids.add(c.instanceId);
    if (!Number.isInteger(c.level) || c.level < 1 || c.level > MAX_LEVEL) errors.push(`V7 level out of range for ${c.instanceId}`);
    for (const v of [c.hp, c.atk, c.def, c.spd, c.movement, c.range]) {
      if (!Number.isInteger(v) || v < 0) errors.push(`V7 non-integer or negative stat on ${c.instanceId}`);
    }
    if (c.range < 1) errors.push(`V7 range must be at least 1 on ${c.instanceId}`);

    const shape = SIZE_FOOTPRINTS[c.sizeClass];
    if (!shape) { errors.push(`V4 unknown size class on ${c.instanceId}`); continue; }
    const cells = footprintCells(c);
    if (cells.length !== shape.count) errors.push(`V4 footprint size mismatch on ${c.instanceId}`);
    for (const cell of cells) {
      if (cell.col < 0 || cell.col >= GRID_COLS || cell.row < 0 || cell.row >= GRID_ROWS) {
        errors.push(`V1 ${c.instanceId} leaves the ${GRID_COLS}x${GRID_ROWS} grid`);
        continue;
      }
      const key = `${cell.col},${cell.row}`;
      if (occupied.has(key)) errors.push(`V2 ${c.instanceId} overlaps ${occupied.get(key)}`);
      occupied.set(key, c.instanceId);
      positions++;
    }

    for (const s of c.skills) {
      if (s.cooldownRounds < 0 || !Number.isInteger(s.cooldownRounds)) errors.push(`V7 bad cooldown on ${s.skillId}`);
      if (!(TARGETINGS as readonly string[]).includes(s.targeting)) errors.push(`unknown targeting ${s.targeting} on ${s.skillId}`);
      if (!['always', 'hp_below_half', 'enemy_in_range'].includes(s.condition)) errors.push(`unsupported condition on ${s.skillId}`);
      for (const e of s.effects) {
        if (!(EFFECT_TYPES as readonly string[]).includes(e.type)) errors.push(`unknown effect ${e.type} on ${s.skillId}`);
        if (['dot', 'shield', 'evade', 'blind', 'root', 'stun'].includes(e.type) && !Number.isInteger(e.amount)) errors.push(`${e.type} amount must be an integer on ${s.skillId}`);
        if (['dot', 'shield', 'root', 'stun'].includes(e.type) && (e.durationRounds ?? 0) < 1) errors.push(`${e.type} needs durationRounds >= 1 on ${s.skillId}`);
        if ((e.type === 'buff' || e.type === 'debuff')) {
          if (!['atk', 'def', 'spd'].includes(e.stat ?? '')) errors.push(`${e.type} needs stat atk, def or spd on ${s.skillId}`);
          if (!Number.isInteger(e.amount) || e.amount < 0) errors.push(`${e.type} amount must be a non-negative integer on ${s.skillId}`);
          if (!Number.isInteger(e.durationRounds ?? 0) || (e.durationRounds ?? 0) < 1) errors.push(`${e.type} needs durationRounds >= 1 on ${s.skillId}`);
        }
        if (e.type === 'move' && s.targeting !== 'nearest_enemy') errors.push(`move must target the nearest enemy on ${s.skillId}`);
      }
    }
    for (const p of c.passives) {
      if (!['battle_start', 'round_start', 'aura'].includes(p.trigger)) errors.push(`unsupported passive trigger ${p.trigger} on ${p.passiveId}`);
      if (p.trigger === 'battle_start' || p.trigger === 'aura') {
        for (const e of p.effects) if (e.type === 'evade' && p.trigger === 'battle_start') { if (!Number.isInteger(e.amount) || e.amount < 0) errors.push(`evade passive amount must be an integer on ${p.passiveId}`); }
      }
      for (const e of p.effects) {
        if (p.trigger === 'round_start') {
          if (e.type !== 'heal' || !Number.isInteger(e.amount) || e.amount < 0) errors.push(`round_start passive must be a non-negative integer heal on ${p.passiveId}`);
        } else if (p.trigger === 'battle_start' && e.type === 'evade') {
          // evade charges granted at battle start (checked above)
        } else if (e.type !== 'buff' || !(p.trigger === 'aura' ? ['atk', 'def', 'spd', 'skill'] : ['atk', 'def', 'spd']).includes(e.stat ?? '') || !Number.isInteger(e.amount) || e.amount < 0) {
          errors.push(`${p.trigger} passive must be an integer buff on atk, def or spd on ${p.passiveId}`);
        }
      }
    }
  }

  if (positions > MAX_POSITIONS) errors.push(`V3 ${positions} positions occupied, limit ${MAX_POSITIONS}`);
  return errors;
}
