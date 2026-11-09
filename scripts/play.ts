/** Plays the text client in a terminal: tsx scripts/play.ts <player-seed> */
import { createInterface } from 'node:readline';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMatch } from '../src/match/worldSetup.ts';
import { runCommand, helpText } from '../src/client/cli.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seed = process.argv[2] ?? 'player-1';
const m = createMatch(seed, join(root, 'unity_handoff/data'));
console.log(`Shattered Dominion. Player seed: ${seed}.`);
console.log(helpText());
const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.setPrompt('> ');
rl.prompt();
rl.on('line', (line) => {
  const out = runCommand(m, line);
  if (out) console.log(out);
  if (m.status !== 'ongoing') { console.log('Match over.'); rl.close(); return; }
  rl.prompt();
});
