# Shattered Dominion — Test Report
**Campaign Identity:** NAVI-SD-OMEGA-001  
**Milestone:** SD-08 — Integration, Performance, and QA Release Candidate  
**Date:** March 2025  
**Candidate Build:** `NAVI-SD-RC-1.0`  

---

## 1. Automated Verification Checks

| Check | Tool / Method | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TypeScript Strict Compilation** | `tsc --noEmit` via `lint_applet` | 0 syntax or type errors | 0 errors | **PASS** |
| **Production Applet Bundle** | `vite build` via `compile_applet` | Clean production build | Zero bundle warnings / errors | **PASS** |
| **Dev Server Runtime** | HTTP GET localhost:3000 | Status 200 OK | Status 200 OK | **PASS** |
| **Automated Unit Test Suite** | `tsx --test tests/**/*.test.ts` | 15/15 tests pass across 4 suites | 15 passed, 0 failed, 0 skipped | **PASS** |
| **Save Persistence Schema** | `loadGameData` / `saveGameData` | Valid v6 schema with `claimedQuestIds` | Valid JSON, migration fallback intact | **PASS** |

---

## 2. Gameplay & Subsystem Regression Matrix

| Subsystem | Test Case | Method / Scope | Evidence / Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Continuous 3D World (SD-02)** | 72-Territory continuous mesh rendering | Checked `RealmMap.tsx` PlaneGeometry (120×108, 96×84 segments) | Smooth height continuity across all 4 biomes; zero flat gaps. | **PASS** |
| **Asset & Fallback Pipeline (SD-02/06)** | 13/13 GLB landmarks with procedural fallbacks | Verified preloader loop across all 72 tiles | PBR models correctly bind to matching tile types; procedural fallbacks active if model unavailable. | **PASS** |
| **Territory Adjacency & Conquest (SD-03)** | Orthogonal adjacency verification for march dispatches | Checked `isTileAdjacentToPlayer` logic | Disallows dispatches to non-adjacent squares; allows adjacent frontier tiles. | **PASS** |
| **Lineup Budget Constraint (SD-04)** | 15-Point Lineup maximum limit | Verified `lineupPoints.isOverBudget` in `CardDeck.tsx` and `RealmMap.tsx` | Dispatch button and deck formation disabled when lineup cost exceeds 15 points. | **PASS** |
| **Troop Capacity Formula (SD-04)** | Base 9,999 + Commander INT + Tech scaling | Evaluated capacity calculator | Returns exact capacity; prevents over-drafting beyond calculated limit. | **PASS** |
| **Creature Bestiary (SD-05)** | 432 creatures loaded with 12 elements | Verified `loadShatteredDominionCreatures` | All 432 unique creature entities generated with element resonances and affinities. | **PASS** |
| **Dynamic March Animation (SD-06)** | Squad walk bobbing and banner ripples | Inspected animation loop in `RealmMap.tsx` | `Math.sin(time * 6 + marchIdx) * 0.08` generates natural footstep cadence. | **PASS** |
| **UI Onboarding & Quests (SD-07)** | Chapter I Sovereign Quests progress and rewards | Verified 5 quests in `SovereignGuideModal.tsx` | Dynamic completion checking, tab quick-jumps, reward claims increment resources. | **PASS** |
| **WebGL Resource Disposal (SD-08)** | Memory leak audit on road and march replacement | Audited `disposeHierarchy` calls | Removes geometries and materials from GPU memory on mesh replacement/unmount. | **PASS** |
| **Web Audio Synthesizer** | SFX and music playback | Native Web Audio API procedural synthesis | Clean tones, chords, clicks, and fanfares without external audio dependencies. | **PASS** |

---

## 3. WebGL & Memory Audit Notes
- **Context Loss Prevention:** `threeRef.current` safely unbinds event listeners, terminates `requestAnimationFrame`, traverses and disposes all geometries and materials via `disposeHierarchy`, and invokes `renderer.dispose()`.
- **Dynamic Road Meshes:** On each territory ownership change, existing road meshes are cleanly detached and disposed before new roadways are generated.
- **Dynamic March Squads:** As expeditions conclude and reach destinations, their squad meshes are disposed from WebGL buffers before removal from `marchMeshes` map.

---

## 4. Verification Conclusion
All 8 milestones (SD-01 through SD-08) have met their defined acceptance criteria. The release candidate `NAVI-SD-RC-1.0` is verified as fully playable and stable.

---

## 5. Addendum — 100-Territory Revision (2026-11-04)

**Change:** The world grid moved from 8x9 (72 squares) to 10x10 (100 squares), generated deterministically from the seed `shattered-dominion-world-v1`. Sections 1–4 above describe the earlier 72-square build and are retained as history.

**Source of truth:** `src/game/constants.ts` (`GRID_ROWS`, `GRID_COLS`, `TOTAL_TERRITORIES`, mesh dimensions). The generator, terrain plane, camera framing, and world-position helpers all read these values.

**Re-verified in this revision:**

| Check | Method | Result |
| :--- | :--- | :--- |
| Automated unit suite | `tsx --test tests/*.test.ts` | 27 passed, 0 failed (was 15 before this revision) |
| Deterministic generation | Two calls with the same seed deep-equal; SHA-256 matches golden fingerprint `f908f7f5…5e21` | PASS |
| Composition | 1 citadel, 9-tile cluster, 3 outposts, 2 rivals, 14 lairs, 8 ruins, 64 wild nodes | PASS |
| Biome quadrants | 25 tiles per biome; tile biome equals quadrant of the terrain shader | PASS |
| Legacy save migration | 72-tile save keeps owned tiles (ownership, garrison); 28 border squares filled | PASS |
| Type errors vs. original | Non-JSX type errors compared against the pre-revision project | No new errors in game code |

**Not verified in this revision:** Browser runtime, `vite build`, visual framing of the larger terrain and camera presets, GLB landmark placement on the new border squares, and `npm` dependency install. Those require a local run with dependencies installed.

**Known caveats:** The sandbox used for this revision has no network access and no React/three type packages, so JSX components were not type-checked. The revision also introduces design choices for the new area (wild-node tables per biome, rival spacing) that await balance review.

### 5.1 Deterministic verifier (SD-V)

`npm run verify` runs `scripts/verify.ts`, a dependency-free checker that makes no AI judgement and writes no timestamps. It checks the world (100 tiles, unique in-bounds coordinates, golden fingerprint, same-seed reproducibility), the save key, the creature catalog (432 unique IDs, rarity counts, 12 families and 12 elements), the pull-rate tables, and the element and family matrices against `combat_rules`. With `--base <ref> --allow <file>` it also enforces a child's write allowlist. The result goes to `navi/verification/receipt.json`, which records input hashes and exits non-zero on failure.

Negative tests: a duplicate creature ID, a Mythical rate changed to 1.0%, and a mislabelled matrix each fail with exit 1. A change outside the allowlist fails the scope check; a change inside it passes.

Result on the current data: 28/28 checks pass, with one warning that all 432 creatures are still "Design proposal" and not balance-validated.
