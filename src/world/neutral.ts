/**
 * Neutral territory rosters (SD-03). Rule approved by the owner: each neutral territory type is
 * garrisoned by a fixed roster. The roster DATA is a draft pending approval (src/data/neutralRosters.draft.ts).
 * Stats come from the prototype's own formulas (creatureBalance.calculateCreatureStatsAtLevel).
 */
import { calculateCreatureStatsAtLevel } from '../game/creatureBalance.ts';
import { CombatCreature, SizeClass } from '../combat/schema.ts';
import { NEUTRAL_ROSTER_DRAFT } from '../data/neutralRosters.draft.ts';

export type NeutralKind = keyof typeof NEUTRAL_ROSTER_DRAFT;

/** Maps a world tile type to its neutral roster type (one roster per type). Null for non-neutral tiles. */
export function neutralKindFor(tileType: string): NeutralKind | null {
  return (Object.keys(NEUTRAL_ROSTER_DRAFT) as NeutralKind[]).includes(tileType as NeutralKind) ? (tileType as NeutralKind) : null;
}

/** Builds a neutral roster for a territory of the given level. Uses the draft roster and prototype stats. */
export function neutralRoster(kind: NeutralKind, territoryLevel: number): CombatCreature[] {
  const draft = NEUTRAL_ROSTER_DRAFT[kind];
  const level = Math.min(50, Math.max(1, 5 * territoryLevel));
  return draft.members.map((m, i) => {
    const st = calculateCreatureStatsAtLevel({ tier: m.tier, rarity: m.rarity, stars: m.tier } as any, level);
    return {
      instanceId: `${kind}_${i}`,
      creatureId: m.creature_id,
      sizeClass: m.size_class as SizeClass,
      anchor: { col: draft.anchors[i][0], row: draft.anchors[i][1] },
      level,
      hp: st.hp,
      atk: st.atk,
      def: st.def,
      spd: st.spd,
      movement: m.movement,
      range: m.range,
      skills: [],
      passives: [],
    };
  });
}
