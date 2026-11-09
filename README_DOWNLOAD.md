# Shattered Dominion: build package

## What this package is
Source code, data, tests, and design documents for Shattered Dominion, as of this build.
It is not yet a playable game with a graphical client. The rules engines below run and are tested.

## Requirements
- Node.js 22 or newer
- npm

## Setup and checks
    npm install
    npm test            # unit and rule tests (157 tests)
    npm run verify      # deterministic verifier (34 checks)
    npm run export:unity  # regenerates unity_handoff/ data and the golden replay

## Play it in a terminal
    npx tsx scripts/play.ts <your-seed>
Type `help` for commands. The player's first creature is drawn from the starter pack using the seed.

## What runs today
- World: 100 x 100 territories, four quadrant biomes, six mythical towers (src/game/worldGenerator.ts)
- Creature combat: deterministic battles with the approved rules (src/combat/)
- Creature catalogue: 432 creatures, each with a runnable active skill and passive (src/combat/catalog.ts)
- Stats: eight baseline stats with 5 points per level, skill levels with 1 point per level (src/combat/stats.ts, skills.ts)
- Territory staging, rosters, and capture (src/world/)
- Match loop: formation packing, player and NPC turns, victory and defeat (src/match/)
- Text client: status, show, mine, attack, end (src/client/cli.ts, scripts/play.ts)

## What is not done yet
- A graphical client. The text client is the only playable interface. The React prototype (src/components, src/App.tsx) still builds one mesh per territory and will not run at 10,000 territories. Do not deploy it.
- Chunked terrain rendering (designed in CR-001, section 11; not verified in a browser).
- Save migration from the prototype (deferred until a playable build exists).
- Items marked DRAFT in unity_handoff/ and in the review sheet are pending owner approval.

## Where to read first
- unity_handoff/SPEC.md: Unity handoff specification (troop sections deprecated)
- NAVI-SD-OMEGA-001-CR-002-REV1-creature-only-combat.md: approved combat rules
- NAVI-SD-OMEGA-001-CR-002-REV1-schema.md: creature-combat/2 schema
- NAVI-SD-OMEGA-001-SD05-DRAFT-REVIEW.md: creature assignments and owner decisions
