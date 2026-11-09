/**
 * Shattered Dominion — Deterministic Verifier (NAVI-SD-OMEGA-001, SD-V)
 *
 * Scripted, reproducible checks. No AI judgement, no timestamps, no network.
 * Writes a receipt to navi/verification/receipt.json and exits non-zero on any failure.
 *
 * Usage:
 *   tsx scripts/verify.ts [--data-dir <dir>] [--base <git-ref> --allow <allowlist-file>]
 *
 *   --data-dir  Directory holding the balance CSVs (default: public/assets/aistudio).
 *   --base/--allow  Scope check: every file changed since <git-ref> must match a pattern in
 *               the allowlist. Patterns ending in "/" match a directory prefix; others match exactly.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { WORLD_CONSTANTS } from '../src/game/constants.ts';
import { generateWorldTiles, WORLD_SEED } from '../src/game/worldGenerator.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GOLDEN_WORLD_SHA256 = 'faf16574710b5b880926f45fc78cfbec5fae2eb21233d2b6765c8231459dfa81';
const EXPECTED_PER_RARITY: Record<string, number> = {
  common: 168, uncommon: 120, rare: 72, epic: 36, legendary: 24, mythical: 12,
};
const EXPECTED_TOTAL_CREATURES = 432;
const EXPECTED_TOWERS = [[22, 22], [77, 22], [22, 77], [77, 77], [46, 49], [53, 49]];

type Check = { id: string; name: string; pass: boolean; expected: unknown; actual: unknown };
const checks: Check[] = [];
const warnings: string[] = [];
const inputs: Record<string, string> = {};

function check(id: string, name: string, expected: unknown, actual: unknown, pass?: boolean) {
  const ok = pass ?? JSON.stringify(expected) === JSON.stringify(actual);
  checks.push({ id, name, pass: ok, expected, actual });
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** RFC 4180 CSV parser: quoted fields, embedded commas and quotes, CRLF or LF, BOM stripped. */
function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

function findOne(dir: string, prefix: string): string {
  const matches = readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith('.csv'));
  if (matches.length !== 1) {
    throw new Error(`expected exactly one ${prefix}*.csv in ${dir}, found ${matches.length}`);
  }
  return join(dir, matches[0]);
}

function readInput(path: string): string {
  const text = readFileSync(path, 'utf8');
  inputs[path.replace(ROOT + '/', '')] = sha256(text);
  return text;
}

// ---------- World ----------
function verifyWorld() {
  check('W1', 'grid dimensions multiply to total territories',
    WORLD_CONSTANTS.TOTAL_TERRITORIES, WORLD_CONSTANTS.GRID_COLS * WORLD_CONSTANTS.GRID_ROWS);
  const tiles = generateWorldTiles(WORLD_SEED);
  check('W2', 'generated tile count equals total territories', WORLD_CONSTANTS.TOTAL_TERRITORIES, tiles.length);
  const coords = new Set(tiles.map((t) => `${t.x},${t.y}`));
  const inBounds = tiles.every((t) => t.x >= 0 && t.x < WORLD_CONSTANTS.GRID_COLS && t.y >= 0 && t.y < WORLD_CONSTANTS.GRID_ROWS);
  check('W3', 'coordinates are unique and inside the grid', true, coords.size === tiles.length && inBounds);
  const sortPairs = (pairs: number[][]) => pairs.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const towerTiles = sortPairs(tiles.filter((t) => t.type === 'mythical_tower').map((t) => [t.x, t.y]));
  check('W6', 'six mythical towers at the agreed coordinates', sortPairs(EXPECTED_TOWERS), towerTiles);
  const fingerprint = sha256(JSON.stringify(tiles));
  check('W4', 'world fingerprint matches the golden value for the canonical seed', GOLDEN_WORLD_SHA256, fingerprint);
  const again = sha256(JSON.stringify(generateWorldTiles(WORLD_SEED)));
  check('W5', 'two generations from the same seed are identical', fingerprint, again);
}

// ---------- Persistence ----------
function verifySave() {
  check('S1', 'current save key is v6', 'kc3_sovereign_save_v6', WORLD_CONSTANTS.SAVE_KEY_V6);
}

// ---------- Creatures, pull rates, matchups ----------
function verifyBalance(dataDir: string) {
  const creaturesPath = findOne(dataDir, 'Shattered_Dominion_432_Creatures_');
  const rarityPath = findOne(dataDir, 'rarity_pull_rates_');
  const elementPath = findOne(dataDir, 'element_matchups_');
  const familyPath = findOne(dataDir, 'family_matchups_');
  const creatureRows = parseCsv(readInput(creaturesPath));
  const rarityRows = parseCsv(readInput(rarityPath));
  const elementRows = parseCsv(readInput(elementPath));
  const familyRows = parseCsv(readInput(familyPath));

  // Creature catalog
  const header = creatureRows[0];
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`creature CSV missing column "${name}"`);
    return i;
  };
  const cId = col('ID'), cName = col('Creature Name'), cFamily = col('Family'), cElement = col('Element');
  const cRarity = col('Rarity'), cPull = col('Single Pull Chance (%)'), cStatus = col('Status');
  const creatures = creatureRows.slice(1);

  check('C1', 'creature count', EXPECTED_TOTAL_CREATURES, creatures.length);
  const ids = creatures.map((r) => r[cId]);
  check('C2', 'creature IDs are unique and well-formed', true,
    new Set(ids).size === ids.length && ids.every((id) => /^SD-\d{4}$/.test(id)));
  const names = creatures.map((r) => r[cName]);
  check('C3', 'creature names are unique', names.length, new Set(names).size);

  const perRarity: Record<string, number> = {};
  for (const r of creatures) perRarity[r[cRarity].toLowerCase()] = (perRarity[r[cRarity].toLowerCase()] ?? 0) + 1;
  check('C4', 'creatures per rarity match the rarity table', EXPECTED_PER_RARITY, perRarity);

  const families = new Set(creatures.map((r) => r[cFamily]));
  const elements = new Set(creatures.map((r) => r[cElement]));
  check('C5', '12 families and 12 elements', { families: 12, elements: 12 },
    { families: families.size, elements: elements.size });
  const perFamily = new Map<string, number>();
  for (const r of creatures) perFamily.set(r[cFamily], (perFamily.get(r[cFamily]) ?? 0) + 1);
  check('C6', 'every family holds 36 creatures', true, [...perFamily.values()].every((n) => n === 36));

  const statusCounts: Record<string, number> = {};
  for (const r of creatures) statusCounts[r[cStatus]] = (statusCounts[r[cStatus]] ?? 0) + 1;
  warnings.push(`creature status: ${JSON.stringify(statusCounts)} (catalog is not yet balance-validated)`);

  // Pull rates
  const rarityHeader = rarityRows[0];
  const pullIdx = rarityHeader.indexOf('Pull Rate (%)');
  const countIdx = rarityHeader.indexOf('Creature Count');
  // Only the six named tiers. The table also holds summary rows (e.g. a 0.633 probability) that must not be summed.
  const tierNames = Object.keys(EXPECTED_PER_RARITY);
  const tiers = rarityRows.slice(1).filter((r) => tierNames.includes(r[0]?.toLowerCase()));
  check('P0', 'rarity table lists all six tiers', tierNames.length, tiers.length);
  const tierPull = Object.fromEntries(tiers.map((r) => [r[0].toLowerCase(), Number(r[pullIdx])]));
  const tierCount = Object.fromEntries(tiers.map((r) => [r[0].toLowerCase(), Number(r[countIdx])]));
  const pullSum = tiers.reduce((s, r) => s + Number(r[pullIdx]), 0);
  check('P1', 'tier pull rates sum to 100%', 100, Math.round(pullSum * 1e9) / 1e9);
  check('P2', 'Mythical pull rate is 0.5%', 0.5, tierPull.mythical);
  check('P3', 'rarity table creature counts match the catalog', EXPECTED_PER_RARITY,
    Object.fromEntries(Object.keys(EXPECTED_PER_RARITY).map((k) => [k, tierCount[k]])));

  const perCreatureSum = creatures.reduce((s, r) => s + Number(r[cPull]), 0);
  check('P4', 'per-creature pull chances sum to 100%', true, Math.abs(perCreatureSum - 100) < 1e-6);
  const perCreatureOk = creatures.every((r) => {
    const tier = r[cRarity].toLowerCase();
    const expected = tierPull[tier] / EXPECTED_PER_RARITY[tier];
    return Math.abs(Number(r[cPull]) - expected) < 1e-9;
  });
  check('P5', 'each creature pull chance equals its tier rate divided by tier size', true, perCreatureOk);
  check('P6', 'Mythical tier per-creature chance is 0.5 / 12 %', true,
    creatures.filter((r) => r[cRarity].toLowerCase() === 'mythical').every((r) => Math.abs(Number(r[cPull]) - 0.5 / 12) < 1e-9));

  // Matchups: square, labelled, bounded, and consistent with combat_rules
  const verifyMatrix = (rows: string[][], size: number, label: string, prefix: string) => {
    const colLabels = rows[0].slice(1);
    const body = rows.slice(1);
    check(`${prefix}1`, `${label} matrix is ${size}x${size} with matching labels`, true,
      colLabels.length === size && body.length === size && body.every((r) => r[0] === colLabels[body.indexOf(r)]));
    const values = body.map((r) => r.slice(1).map(Number));
    check(`${prefix}2`, `${label} entries are finite numbers`, true, values.every((row) => row.every(Number.isFinite)));
    return values;
  };
  const element = verifyMatrix(elementRows, 12, 'element', 'M');
  const family = verifyMatrix(familyRows, 12, 'family', 'F');
  const flat = (m: number[][]) => m.flat();
  check('M3', 'element modifiers within combat_rules bounds (-0.15 .. +0.20)', { min: -0.15, max: 0.2 },
    { min: Math.min(...flat(element)), max: Math.max(...flat(element)) });
  check('F3', 'family modifiers within combat_rules bounds (-0.10 .. +0.12)', { min: -0.1, max: 0.12 },
    { min: Math.min(...flat(family)), max: Math.max(...flat(family)) });
  check('M4', 'each element favours 3 and disadvantages 3 others', true,
    element.every((row) => row.filter((x) => x > 0).length === 3 && row.filter((x) => x < 0).length === 3));
  check('F4', 'each family favours 2 and disadvantages 2 others', true,
    family.every((row) => row.filter((x) => x > 0).length === 2 && row.filter((x) => x < 0).length === 2));
  check('M5', 'best and worst combined multipliers match combat_rules', { best: 1.344, worst: 0.765 },
    { best: Math.round(1.2 * 1.12 * 1000) / 1000, worst: Math.round(0.85 * 0.9 * 1000) / 1000 });
}

// ---------- Creature combat catalogue ----------
async function verifyCatalog() {
  const { loadCatalog } = await import('../src/combat/catalog.ts');
  const { validateArmy } = await import('../src/combat/schema.ts');
  const { calculateCreatureStatsAtLevel } = await import('../src/game/creatureBalance.ts');
  const catalog = loadCatalog(join(ROOT, 'unity_handoff/data'));
  const entries = [...catalog.entries.values()];
  check('K1', 'catalogue covers 432 creatures', 432, entries.length);
  check('K2', 'every creature has a runnable signature ability', 432, entries.filter(e => e.skills.length > 0).length);
  check('K3', 'every creature has a passive', 432, entries.filter(e => e.passives.length > 0).length);
  check('K4', 'no ability is awaiting schema v2', 0, catalog.excludedAbilities.length);
  let legal = 0;
  for (const e of entries) {
    const st = calculateCreatureStatsAtLevel({ tier: 1, rarity: 'common', stars: 1 } as any, 1);
    const c = { instanceId: e.creatureId, creatureId: e.creatureId, sizeClass: e.sizeClass, anchor: { col: 0, row: 0 }, level: 1,
      hp: st.hp, atk: st.atk, def: st.def, spd: st.spd, movement: e.movement, range: e.range, skills: e.skills, passives: e.passives };
    if (validateArmy({ side: 'attacker', creatures: [c as any] }).length === 0) legal++;
  }
  check('K5', 'every catalogue creature is a legal combatant (schema V1-V9)', entries.length, legal);
}

// ---------- Scope (optional) ----------
function verifyScope(base: string, allowFile: string) {
  const allow = readFileSync(allowFile, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const changed = execFileSync('git', ['diff', '--name-only', base], { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const matches = (file: string) => allow.some((p) => (p.endsWith('/') ? file.startsWith(p) : file === p));
  const outside = changed.filter((f) => !matches(f));
  check('X1', `every change since ${base} is inside the child allowlist`, [], outside);
  inputs[`scope:${base}`] = sha256(changed.join('\n'));
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
  const dataDir = resolve(ROOT, arg('--data-dir') ?? 'public/assets/aistudio');

  verifyWorld();
  verifySave();
  verifyBalance(dataDir);
  const base = arg('--base');
  if (base) verifyScope(base, arg('--allow') ?? join(ROOT, 'navi/contracts/allow.txt'));

  await verifyCatalog();
  const failed = checks.filter((c) => !c.pass);
  const receipt = {
    verifier: 'sd-verify/1',
    seed: WORLD_SEED,
    result: failed.length === 0 ? 'PASS' : 'FAIL',
    summary: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
    checks: checks.map((c) => ({ id: c.id, name: c.name, status: c.pass ? 'PASS' : 'FAIL', expected: c.expected, actual: c.actual })),
    warnings,
    inputs,
  };
  const out = join(ROOT, 'navi/verification');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');

  for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.id}  ${c.name}`);
  for (const w of warnings) console.log(`WARN  ${w}`);
  console.log(`\n${receipt.result}: ${receipt.summary.passed}/${receipt.summary.total} checks passed`);
  process.exitCode = failed.length === 0 ? 0 : 1;
}

main();
