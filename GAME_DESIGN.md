# Shattered Dominion — Game Design Document
**Candidate Version:** 1.0 (Release Candidate)  
**Engine:** React 19 + TypeScript + Vite + Tailwind CSS + Three.js (WebGL PBR & Procedural)  
**Audio:** Web Audio API Native Synthesizer  
**Governance:** NAVI Game Studio Orchestrator V3.0  

---

## 1. Executive Summary & Core Pillars
*Shattered Dominion* is a fantasy 4X grand strategy game combining continuous 3D continental exploration, square-based territorial conquest, card-based lineup assembly, creature synergy bonding, base construction, and real-time tactical dungeon delves.

### Core Pillars
1. **Continuous 3D Continental Geography:** A 10x10 (100-territory) continuous heightfield generated from a fixed seed with distinct biomes, natural elevation ridges, dynamic roadways, and real-time march formations.
2. **Strict Tactical Budgeting:** A 15-Point Lineup Point cap governing Commander Hero, Battalion, and Support cards for balanced, deep army composition.
3. **Deep Creature Bestiary:** 432 unique elemental creatures (12 Elements × 12 Families × 3 Tiers) delivering elemental resonance bonuses and Commander-Creature bonding affinities.
4. **Autonomous Persistence:** Complete local state synchronization (`kc3_sovereign_save_v6`) preserving resources, buildings, marches, deck builds, bestiary roster, diplomacy, and quest progress.

---

## 2. World Geography & 100-Territory Conquest
The continent is structured as a 10x10 grid of 100 interactive territory squares across 4 major biomes. Each biome occupies one 5x5 quadrant:

| Biome | Coordinates | Elevation & Terrain Character | Resource Emphasis |
| :--- | :--- | :--- | :--- |
| **Sol Heights** | Northwest (`x: 0..4, y: 0..4`) | High plateaus (Y: 1.2 to 2.4), pine groves, limestone crags | Timber, Stone, Gold |
| **Ignis Caldera** | Northeast (`x: 5..9, y: 0..4`) | Volcanic basalts, cinder beds, lava vents (Y: 0.6 to 1.8) | Iron, Mana, Rubies |
| **Frost Wastes** | Southwest (`x: 0..4, y: 5..9`) | Glacial snowfields, frosted pines, frozen ridges (Y: 0.8 to 2.0) | Food, Stone, Iron |
| **Abyssal Marshes**| Southeast (`x: 5..9, y: 5..9`) | Lowland mire, peat bogs, ancient monolith ruins (Y: 0.0 to 0.9) | Mana, Timber, Rubies |

### World Generation
- The map is generated deterministically from the seed `shattered-dominion-world-v1`. The same seed always produces the same map. A golden fingerprint test guards this.
- Composition: 1 player citadel with an 8-tile starting cluster, 3 alliance outposts, 2 rival citadels, 14 monster lairs, 8 ancient ruins, and 64 wild resource nodes.
- Saves from the previous 72-tile map keep every tile they already hold, including ownership, garrisons and buildings. The new border squares are filled in from the generator.

### Conquest & Marching Rules
- **Orthogonal Adjacency:** A territory can only be invaded if it shares an edge with an existing player-owned square or player Citadel.
- **Formations & Stances:**
  - *Balanced:* Standard attack and defense distribution.
  - *Aggressive:* +20% Attack bonus, -10% Defense penalty.
  - *Defensive:* +25% Defense bonus, -15% Attack penalty.
- **March Traversal:** Marches travel in real time with visual infantry, marksmen, gryphons, or siege engines. Squad actors bob in walking cadence with rippling squad banners.

---

## 3. Deck Building & The 15-Point Lineup System
Armies dispatched on expeditions and dungeon runs are led by a tactical lineup strictly governed by the **15-Point Lineup Budget**:

```
Total Lineup Points = Hero Card Points + Battalion Card Points + Support Card Points <= 15
```

### Component Roles & Costs
1. **Commander Hero (3 to 7 Points):**
   - High-impact warlords with active and passive aura skills.
   - Example: *Valerius Stormcaller* (Cost: 6 pts, Element: Lightning, Atk: 840, Def: 720, Int: 950).
2. **Battalion Unit Card (2 to 5 Points):**
   - Direct unit empowerment cards providing statistical multipliers to Legionnaires, Marksmen, Gryphons, or Catapults.
3. **Support / Aura Card (2 to 4 Points):**
   - Empire buffs, economic accelerants, or crowd-control charms.

### Troop Capacity Formula
Army size under a commander is determined by:
```
Troop Capacity = 9,999 (Base) + Math.floor((Commander INT / 100) * 85) + Academy Military Research + Card Skill Bonuses
```

---

## 4. Bestiary — 432 Shattered Dominion Creatures
A comprehensive bestiary spanning 12 Elements and 12 Creature Families across 3 Tiers (Tier I: Awakened, Tier II: Ancient, Tier III: Primordial Mythic):

- **12 Elements:** Fire, Water, Earth, Air, Lightning, Ice, Nature, Shadow, Light, Arcane, Void, Cosmic.
- **12 Families:** Dragonkin, Beasts, Elementals, Undead, Celestials, Fiends, Giants, Insectoids, Avians, Reptilians, Aquatic, Constructs.
- **Elemental Resonance:** Fielding multiple creatures of the same element unlocks compounding combat auras (e.g., 2× Fire = +15% Flame Strike; 4× Fire = +35% Burn Aura).
- **Commander Bonding Affinity:** Matching a Commander's elemental affinity with creatures confers an additional 20% synergy bonus.

---

## 5. Citadel Base & Economy
- **8 Constructible Buildings:** Citadel Keep, Lumber Mill, Quarry, Iron Mine, Mana Spire, Farm Estate, Barracks, Grand Academy.
- **Resource Accretion:** Continuous production calculated every second based on building tiers + active Sovereign Council economic cards + territory yields.
- **Academy Tech Tree:** 6 research branches across Military Tactics, Masonry, Metallurgy, Arcane Harvesting, Cartography, and Imperial Logistics.
- **Construction Queues:** Standard timed upgrades or instant completion rush using Rubies.

---

## 6. Action Dungeon Crawler (Delves & Raids)
- **Room Progression:** Real-time party crawl through dungeon sectors with health pools, skill cooldowns, minion waves, and elite boss encounters.
- **Skills System:** 4 active hero skills (Cleave, Arcane Shield, Meteor Surge, Rejuvenation) with visual particle feedback and dynamic cooldown recovery.
- **Loot Table:** Substantial Gold, Rubies, and rare card craft materials upon dungeon completion.

---

## 7. Diplomacy, Chronicles & Global Systems
- **3 Rival Factions:** Northern Concordat, Obsidian Dynasty, and Emerald Enclave with independent standing (-100 Hostile to +100 Allied), non-aggression pacts, trade tributes, and covert espionage.
- **Chronicles Campaign:** 4 sequential story chapters with tactical encounter simulations.
- **Fluctuating Market:** Dynamic buy/sell commodity exchange with live price swings.
- **Global World Events:** Rotating realm modifiers (e.g., Blood Moon, Harvest Bloom, Arcane Tempest) with timed effects.
