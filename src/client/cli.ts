/**
 * Text client for the playable match. Pure: takes a command line, returns the text to show.
 * Commands: help | status | mine | show <tile> | attack <origin> <target> <creatureId> [...] | end
 * Territory ids are t_<x>_<y>.
 */
import { Match, playerAttack, PLAYER, VICTORY_TOWERS, npcTurn } from '../match/match.ts';
import { rosterPower } from '../match/match.ts';

export function helpText(): string {
  return [
    'Commands:',
    '  status                         turn, result, towers held, territories held',
    '  mine                           your territories and their creatures',
    '  show <tile>                    one territory, e.g. show t_4_4',
    '  attack <origin> <target> <creature instance id>...',
    '  end                            pass the turn (NPCs act on their schedule)',
    '  help',
    `Victory: hold ${VICTORY_TOWERS} of the 6 mythical towers. Defeat: no territories left.`,
  ].join('\n');
}

function towersHeld(m: Match): number {
  return [...m.towers].filter((id) => m.world.territories.get(id)?.owner === PLAYER).length;
}

function describe(m: Match, id: string): string {
  const t = m.world.territories.get(id);
  if (!t) return `No territory ${id}.`;
  const owner = t.owner ?? 'neutral';
  const tower = m.towers.has(id) ? ' (mythical tower)' : '';
  const creatures = t.roster.length
    ? t.roster.map((c) => `${c.instanceId} [${c.creatureId}] lv${c.level} hp${c.hp} atk${c.atk} def${c.def}`).join('; ')
    : 'no creatures';
  return `${id}${tower}: owner ${owner}; power ${rosterPower(t.roster)}; ${creatures}`;
}

export function runCommand(m: Match, line: string): string {
  const [cmd, ...args] = line.trim().split(/\s+/);
  try {
    switch (cmd) {
      case '': return '';
      case 'help': return helpText();
      case 'status': {
        const mine = [...m.world.territories.values()].filter((t) => t.owner === PLAYER).length;
        return `Turn ${m.turn}. Status: ${m.status}. Towers held: ${towersHeld(m)}/6. Territories held: ${mine}.`;
      }
      case 'mine': {
        const mine = [...m.world.territories.values()].filter((t) => t.owner === PLAYER).sort((a, b) => (a.id < b.id ? -1 : 1));
        if (!mine.length) return 'You hold no territories.';
        return mine.map((t) => describe(m, t.id)).join('\n');
      }
      case 'show': {
        if (!args[0]) return 'Usage: show <tile>';
        return describe(m, args[0]);
      }
      case 'attack': {
        if (args.length < 3) return 'Usage: attack <origin> <target> <creature instance id>...';
        const [origin, target, ...ids] = args;
        const out = playerAttack(m, origin, target, ids);
        const verdict = out.captured ? 'Captured.' : 'Repelled.';
        return `${verdict} Status: ${m.status}.`;
      }
      case 'end': {
        m.turn += 1;
        npcTurn(m);
        return `Turn ${m.turn} ended. Status: ${m.status}.`;
      }
      default: return `Unknown command "${cmd}". Type help.`;
    }
  } catch (e) {
    return `Error: ${(e as Error).message}`;
  }
}
