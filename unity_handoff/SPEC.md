# Shattered Dominion — Unity Handoff Specification

> **DEPRECATED — CR-002 REV1 (creature-only combat, approved direction, pending approval of rules, schema and migration).**
> The troop-based combat sections below (troop garrisons, the staging pool B1, troops in marches, troop yields, the 9,999 cap, the 15-point card budget) are superseded. The simulation golden replay in this document describes the legacy troop model and remains valid only for that model. See NAVI-SD-OMEGA-001-CR-002-REV1-migration.md.


**Status:** Draft for Unity build. Not yet a finishable game (see Section 2).
**Scope:** Solo world conquest against three NPC factions. Designed so the same rules can later run on a multiplayer server.
**Source of truth:** `src/sim/engine.ts` (TypeScript). The Unity port must reproduce the golden replay exactly.
**Recommended engine:** Unity 6, C#. Rendering and input live in Unity. The React/Three.js client is reference only.

---

## 1. What is ready

| Item | Location | Notes |
| :--- | :--- | :--- |
| World: 10,000 territories (100 x 100, coordinates 0-99), 4 biomes, 6 mythical towers | `data/world_tiles.json` | Seed `shattered-dominion-world-v2`. Quadrants are 50 x 50 (2,500 each). |
| Simulation core | `src/sim/engine.ts` | Integer-only, command-driven, deterministic, staging-pool marching. |
| Scripted test player | `src/sim/bot.ts` | Used for golden replays only. Not a game AI. |
| Golden replay | `golden/sim_match_canonical.json` | Command log plus a hash checkpoint every 50 ticks. |
| Creature catalog and balance tables | `data/creatures.json`, `data/*_matchups.json`, `data/rarity_table.json`, `data/combat_rules.json` | 432 creatures. Not yet used by the simulation. |
| Placeholder balance | `data/sim_config.json` | Every value is a placeholder. |
| Engine tests | `tests/sim_engine.test.ts` | 51 tests across the suite, including golden comparison. |

## 2. What is not ready (blockers)

**B1. Force concentration: resolved (staging pool, radius 2).** An army draws troops from every owned tile within `STAGING_RADIUS` (2) steps of its origin, nearest first, keeping one troop on each tile. The earlier single-tile model could not finish a match. With the pool, the scripted player finishes the canonical replay (see Section 6).

**B2. Balance is placeholder.** Starting garrisons, regeneration, NPC send fraction, NPC attack margin and the bot's margin are all guesses. They are in `sim_config.json` and in `startingGarrison()` in the engine. Do not treat them as balanced.

**B3. Combat is incomplete.** The simulation does not yet use element or family matchups, creature lineups, the 15-point budget, or troop types. The matchup data is exported and ready, but it is not wired in.

**B4. No economy.** Resources, buildings, research and recruitment from the prototype are not in the simulation. Troops regrow on a timer only.

**B5. Multiplayer model not chosen.** Recommended: an authoritative server receiving the same commands, with the same tick order. The alternative, lockstep, needs every client to run identical code and has more failure modes.

**B6. Victory condition: decided and implemented.** The player wins by holding 4 of the 6 mythical towers. Defeat when the player has no territories and no armies. Timeout at tick 1200. Eliminating the NPCs is not a victory.

## 3. Determinism rules (mandatory for the Unity port)

1. **Integers only.** Every quantity is a non-negative integer. Percentages and multipliers are basis points (1/10000). No floats anywhere in simulation code.
2. **Truncating division.** Use integer division. Values are non-negative, so truncation and floor agree.
3. **Ordinal ordering.** Every sort is by id using ordinal comparison (`string.CompareOrdinal` in C#). Never rely on `Dictionary` or `HashSet` enumeration order.
4. **Fixed tick order.** Commands are applied between ticks. Each tick: increment tick; resolve arrivals in army-id order; regenerate on the growth interval; run NPC decisions for factions in id order, staggered by faction index; check victory, defeat and timeout.
5. **Commands are the only input.** State changes only through `applyCommand` and `step`. No wall-clock time, no `Random`, no frame deltas.
6. **Hash.** FNV-1a 32-bit over the canonical text below. The Unity port must produce the same hash for the same state.

Canonical text: one line per item, joined with `\n`:
```
T|<tick>|<status>|<nextArmyNumber>
S|<tileId>|<owner or ->|<troops>|<power>|<maxTroops>     (tiles sorted by id)
A|<armyId>|<owner>|<from>|<to>|<troops>|<formation>|<arriveTick>   (armies sorted by id)
```
FNV-1a: `h = 0x811c9dc5`; for each character code `c`: `h ^= c; h = (h * 0x01000193) mod 2^32`. Output as 8 lowercase hex digits. In C#, use `uint` with `unchecked` multiplication.

## 4. Data model

**Tile** (`SimTile`): `id` ("t_<x>_<y>", coordinates 0-99), `x`, `y`, `biome`, `tower` (true for the six mythical towers), `owner` (faction id or null for neutral), `troops`, `maxTroops`, `power`.

**Army** (`SimArmy`): `id` ("army_<n>"), `owner`, `from`, `to`, `troops`, `formation` (aggressive | balanced | defensive), `arriveTick`.

**Faction ids:** `player` for the human. NPC factions are `npc_order_of_crimson_dragon`, `npc_shadow_syndicate`, `npc_iron_vipers`.

**Formation multipliers (bps):** aggressive 12500, balanced 10800, defensive 9500.

**Combat:** `attack = floor(troops × 12 × formationBps / 10000)`. `defense = power + defenderTroops × 12`.
- If attack ≥ defense: the tile is captured. Survivors = `floor((attack − defense) / 12)`, with a minimum of 1 troop. Power is halved.
- Otherwise: the army is destroyed. Defender troops fall by `floor(attack / 24)`, to a minimum of 0.
- Arriving at a tile the army's own faction already owns reinforces it.

**Growth:** every `GROWTH_INTERVAL` ticks, each owned tile gains `GROWTH_AMOUNT` troops, capped at `maxTroops`.

**NPC decision (per faction, every `NPC_INTERVAL` ticks, staggered):** consider every owned tile with at least 2 troops and every neighbour not owned by the faction. Choose the eligible pair whose target has the lowest defense, with ties going to the first pair in id order. send `floor(pool × NPC_SEND_BPS / 10000)` troops, where the pool is the staging pool of the origin tile. Send only if attack × 10000 ≥ defense × `NPC_ATTACK_BPS`. The NPC sends a balanced formation.

**Staging pool:** (radius `STAGING_RADIUS` = 2) the troops available to a march from origin tile O are the sum of `troops − 1` over every tile the sender owns within `STAGING_RADIUS` (Manhattan distance) of O, including O. Withdrawals draw from tiles nearest first, then by id, and never take a tile below one troop.

**Marching:** a command is valid only if the origin is owned by the sender, the target is not owned by the sender, the target is orthogonally adjacent to the origin, the troop count is an integer from 1 up to the staging pool, the formation is known, and the match is ongoing. Travel takes `MARCH_TICKS`.

## 5. Command protocol (multiplayer-ready)

```
Command { type: "march", playerId, from, to, troops, formation }
Result  { ok: true, state }  |  { ok: false, error, state }
```
- The client sends a command. The server applies it with the same function and returns the result and the tick it was applied at.
- Solo play uses the same code path, with the local state as the server.
- Every rejection carries a reason string. Keep these reasons identical between engines: "not adjacent", "source tile is not yours", "target tile is already yours", "source must keep at least one troop", "troops must be a positive integer", "unknown formation", "match is over".

## 6. Golden replay and acceptance

`golden/sim_match_canonical.json` contains the seed, the configuration used, the command log (each command stamped with its tick), checkpoint hashes every 50 ticks, and the final state.

**Acceptance for the Unity port:**
1. Load the seed, build the initial state, and replay the command log. At every checkpoint tick, the hash must equal the recorded hash.
2. The final state must be `timeout` at tick 1200 with hash `f29861af`, 409 player tiles and 5 NPC tiles.
3. Unit cases in `tests/sim_engine.test.ts` must pass in Unity with the same expected values: command validation (adjacency, ownership, troop limits, formation, match over), capture and failed attack, growth cap, NPC decision on its interval, integer-only state, and the golden replay.

Note: the golden replay will need to be regenerated whenever balance or rules change, so treat its hash as a version marker. Regenerate with `npm run export:unity` and commit the new file along with the balance change.

## 7. Unity scope

- **Map:** build the 10×10 grid from `world_tiles.json`. Four biomes map to quadrants. Existing GLB models are under `public/assets/models/`. Quadrant heights and biome palettes are in `src/game/mathUtils.ts`.
- **Armies:** render from state. Each army moves from `from` to `to` over `MARCH_TICKS`.
- **Input:** select an owned tile, select an adjacent target, choose troops and formation, submit a `march` command.
- **UI:** resource-free HUD for now. Show the tile, troops, power and owner. Show the match status and tick.
- **Not in scope yet:** economy, buildings, research, creature lineups, multiplayer networking.

## 8. Open decisions (need an owner before the next build)

1. Victory condition: definition of the "mythical towers" (B6).
2. Creature combat (element and family matchups, lineups, the 15-point budget) is scheduled for the first playable milestone. Its stats source is open: the creature CSV has no attack, defense or cost columns. Options are porting the prototype's `creatureBalance.ts` formulas, or defining new stats from tier and rarity.
3. Multiplayer model (B5).
4. Balance pass: starting garrisons, growth, NPC aggression.


## 9. Scale and placeholders (CR-001)

- **Grid:** 100 x 100 territories, integer coordinates 0-99, axes between squares. Quadrants are 50 x 50 and hold 2,500 territories each. The design allows expansion to 250 x 250; those territories are not generated.
- **Towers:** (22,22), (77,22), (22,77), (77,77) and the centre pair (46,49) and (53,49), symmetric about the centre. The sketch's positions were translated to the 0-99 grid.
- **Citadel:** (4,4), so legacy saves keep their starting squares.
- **Placeholders, not balance:** special-tile counts (100 lairs, 50 ruins, 2 rival citadels, 3 outposts), wild-node level (1 + distance / 20), and every garrison value.
- **Performance:** the engine uses a coordinate index, so neighbour and staging queries touch at most 13 cells. A full tick at 10,000 territories still copies the full state; a delta-based step is the next optimisation.
- **Not in this build:** chunked terrain and instancing (CR-001 section 6), delta saves, and client-side migration of march records. Until those land, the browser prototype cannot render 10,000 territories and should not be deployed.


## 10. Creature data (exported from the prototype)

- `data/creature_stat_table.json`: integer stat curves by (tier, rarity, level 1-50). Look up; do not recompute. Stars are assumed equal to tier.
- `data/creature_synergy_rules.json`: element tier bonuses and family bonuses.
- Rounding: the prototype's `Math.round` equals `floor(x + 0.5)` for non-negative values. Use that rule if any value is recomputed in C#.
- Creatures have **no lineup point cost** in the prototype. Lineup cost applies to commander, battalion and support cards only.
- Creature combat in the simulation is undecided (see CR-001 section 13).
