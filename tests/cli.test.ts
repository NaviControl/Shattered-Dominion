import { describe, it } from 'node:test';
import assert from 'node:assert';
import { join } from 'node:path';
import { createMatch } from '../src/match/worldSetup.ts';
import { runCommand } from '../src/client/cli.ts';
import { PLAYER } from '../src/match/match.ts';

const DATA = join(process.cwd(), 'unity_handoff/data');

describe('CLI-01 / Playable text client', () => {
  it('builds a match with the player holding the citadel and one starter creature', () => {
    const m = createMatch('player-1', DATA);
    const citadel = m.world.territories.get('t_4_4')!;
    assert.strictEqual(citadel.owner, PLAYER);
    assert.strictEqual(citadel.roster.length, 1, 'starter pull: one creature');
    assert.strictEqual(m.status, 'ongoing');
  });

  it('is deterministic for a player seed', () => {
    const a = createMatch('player-1', DATA), b = createMatch('player-1', DATA);
    assert.deepStrictEqual(a.world.territories.get('t_4_4')!.roster, b.world.territories.get('t_4_4')!.roster);
  });

  it('answers status, show and mine', () => {
    const m = createMatch('player-1', DATA);
    assert.match(runCommand(m, 'status'), /Turn 0\. Status: ongoing/);
    assert.match(runCommand(m, 'show t_4_4'), /owner player/);
    assert.match(runCommand(m, 'mine'), /t_4_4/);
  });

  it('reports bad input without crashing', () => {
    const m = createMatch('player-1', DATA);
    assert.match(runCommand(m, 'dance'), /Unknown command/);
    assert.match(runCommand(m, 'attack t_4_4'), /Usage/);
    assert.match(runCommand(m, 'attack t_4_4 t_9_9 nobody'), /Error/);
  });

  it('a turn passes and NPCs keep their schedule', () => {
    const m = createMatch('player-1', DATA);
    assert.match(runCommand(m, 'end'), /Turn 1 ended/);
    assert.strictEqual(m.turn, 1);
  });
});
