/**
 * Scripted player used for golden vectors and smoke tests. It is not the game's AI.
 * Every 3 ticks it sends its whole staging pool from the strongest tile at the weakest adjacent
 * target it can beat with a 10% margin.
 */
import { Command, PLAYER_ID, SimState, neighborsOf, attackValue, defenseValue, stagingPool } from './engine.ts';

export function botAct(state: SimState): Command | null {
  if (state.tick % 3 !== 0) return null;
  const sources = state.tiles
    .filter((t) => t.owner === PLAYER_ID)
    .map((t) => ({ t, pool: stagingPool(state, t, PLAYER_ID) }))
    .filter((x) => x.pool >= 2)
    .sort((a, b) => b.pool - a.pool || (a.t.id < b.t.id ? -1 : a.t.id > b.t.id ? 1 : 0));
  for (const { t: src, pool } of sources) {
    const send = pool;
    const attack = attackValue(send, 'balanced');
    const targets = neighborsOf(state, src)
      .filter((t) => t.owner !== PLAYER_ID)
      .sort((a, b) => defenseValue(a) - defenseValue(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    for (const tgt of targets) {
      if (attack * 100 >= defenseValue(tgt) * 110) {
        return { type: 'march', playerId: PLAYER_ID, from: src.id, to: tgt.id, troops: send, formation: 'balanced' };
      }
    }
  }
  return null;
}
