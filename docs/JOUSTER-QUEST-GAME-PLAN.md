# Jouster Quest — Game Plan

> **Status:** Act I vertical slice, play-test revision 2 and revision 3 are implemented and in play-testing
> (see [Implementation status](#12-implementation-status-act-i-slice),
> [Revision 2](#13-revision-2-play-test-feedback) and
> [Revision 3](#14-revision-3-exploration-pacing-widescreen-and-battle-presentation)). Mouse and touch controls
> are implemented (see [16.9](#169-mouse-and-touch-controls-implemented)). Acts II–Finale are not
> started.
> **Genre:** Top-down 2D fantasy RPG, inspired by NES *Dragon Warrior* and *The Legend of Zelda*
> **Platform:** Browser (HTML5 Canvas), hosted in the `jouster-ui` Angular app at `/jouster-quest`

---

## 1. Vision

A small single-player, top-down RPG with 32-bit-era pixel art (GBA / late-SNES look). The player explores a
large overworld hidden under a fog of war, visits friendly towns, and fights turn-based battles against monsters
and dragons, shown side-on with the party and enemies animated. Outside towns, each step has a small chance of a
random encounter. At the start, the player picks a character class and adventures alone until the first boss
falls; after that, companions can be won over through side quests, for a party of up to three, all controlled by
the player. The companions on offer are rolled randomly for each new game and never share the hero's class. The
game fills a 16:9 widescreen canvas.

---

## 2. Tech Approach

| Concern | Decision |
| --- | --- |
| Language | TypeScript (strict, no `any`) |
| Rendering | HTML5 Canvas 2D; no game engine dependency |
| Resolution | **Widescreen 16:9** (revision 3): logical 384×216 layout rendered at 2× pixel density (768×432 backing canvas), integer-scaled with `image-rendering: pixelated`. Revision 2 used 256×240 (512×480). **Revision 5 (16.6, implemented):** 960×540 native canvas (480×270 logical), 30×17 tiles of 32×32 art drawn 1:1 |
| Tile size | 16×16 logical grid; tiles, characters and monsters are drawn with 32×32 pixels of detail |
| Maps | Towns and dungeons are character grids in TypeScript; the overworld is generated from a fixed seed with hand-placed landmarks (Tiled was dropped, see 12) |
| Save data | One save in `localStorage` (versioned JSON schema, currently version 3, older versions migrated) |
| Audio | Web Audio API: chiptune-style SFX and optional music loops |

### Nx structure

```text
libs/
  game/engine/        # @jouster/game/engine — framework-agnostic: loop, input, renderer, tilemap, scenes, battle rules
  game/quest/         # @jouster/game/quest — content (classes, monsters, items, maps), art, scenes, save data
apps/
  jouster-ui/
    src/app/pages/jouster-quest/   # Angular route `/jouster-quest` that hosts the <canvas> and boots the game
```

- The libs are Nx projects `game-engine` and `game-quest`.
- `game-engine` must not import Angular, which keeps the logic testable in plain Jest.
- All balance numbers live in `game-quest` data files so tuning doesn't need engine code changes.

---

## 3. Core Systems

| System | Responsibilities |
| --- | --- |
| **Game loop** | Fixed-timestep update (60 Hz) and `requestAnimationFrame` render |
| **Scene manager** | Stack of scenes with fades: Title, ClassSelect, NameEntry, World (overworld, towns, dungeons), Battle, field Menu, Shop, Dialogue, World Map, GameOver |
| **Input** | Arrows/WASD move; Z/Enter/Space confirm; X/Esc cancel and open the field menu; M world map; N sound on/off; I opens Items, E opens Equip (15.4). Read only while the canvas has focus. Gamepad and touch are deferred |
| **Tilemap** | Ground tiles with collision, encounter terrain, warps and NPC spawns |
| **Fog of war** | Hidden overworld and dungeon tiles revealed within a radius of the party; explored tiles saved per map (14.1) |
| **World map** | `M` overlay of the current map's explored tiles, discovered places and quest hints (14.1) |
| **Quests** | Main quest plus one side quest per companion, shown in the field menu's quest log (14.2) |
| **Movement** | 4-direction, grid-locked, smooth movement between tiles, 2-frame walk cycle |
| **Camera** | Follows the player and clamps to map bounds |
| **Dialogue** | Typewriter text box, portraits (optional), yes/no prompts, sets and reads story flags |
| **Encounters** | Step counter in danger tiles; per-region rate (default ~1/16 per step); towns are safe. Each area has a level (Greenwood 2, Forest 4, Hills 5, Cave 6, Den 6); when the highest party level is more than 3 above it, the rate drops to ¼ and halves for each further level (floor 1/32 of the base) |
| **Battle** | Turn-based combat (section 5) |
| **Inventory/Equipment** | Weapon, armor, shield and accessory slots with an EQUIP menu (15.4); consumables; key items; gold |
| **Progression** | XP curve, level-ups, per-class stat growth, spells learned by level |
| **Save/Load** | Save at the inn or chapel; one save slot (more slots deferred); schema version for migrations |
| **Audio** | SFX (step, hit, spell, level-up) and per-scene music |

---

## 4. Character Classes & Party

### 4.1 Design principles

1. **Every class can win alone.** Any class, including the Cleric or Wizard, must be able to clear the Prologue and
   Act I before recruiting a companion. Some classes may find it harder, but none should be stuck.
2. **Every class has a real melee attack.** The basic **Attack** command always uses a melee weapon, never just a
   token hit for 1 damage.
3. **Different, not stronger.** Classes differ in *how* they win (burst damage, staying power, speed), not in
   *whether* they win.
4. **Same stat budget.** Each class starts with the same total stat points (section 4.3). Growth per level is
   equal too.

### 4.2 Class overview

| Class | Role | Melee weapon (basic Attack) | Signature abilities | How it wins alone |
| --- | --- | --- | --- | --- |
| **Warrior** | Tank / damage | Sword or axe | *Power Strike* (×1.5 dmg, 25% miss), *Taunt* | High damage and defense |
| **Wizard** | Attack magic | Staff (+2 MAG when equipped) | Fire, Ice, Bolt, later Meteor; *Arcane Strike* (staff hit + MAG/2) | Hits weaknesses; spells kill groups fast |
| **Paladin** | Hybrid | Sword and shield | *Smite* (holy melee), Heal | Steady damage, can heal itself |
| **Cleric** | Holy fighter / support | Mace or flail (×1.5 vs undead) | *Holy Strike*, Heal, Protect, Revive; passive *Blessed* | Outlasts enemies (see 4.4) |
| **Rogue** | Speed / utility | Daggers (attacks twice at ×0.6 each) | *Steal*, *Backstab* (big crit chance on first turn) | Acts first; frequent crits |
| **Ranger** | Skirmisher | Hunting knife (melee); bow for skills | *Volley* (bow, hits all), *Aimed Shot* | Damages groups, high AGI |

### 4.3 Level 1 stats (equal budget)

Stats: **HP** (hit points), **MP** (magic points), **ATK** (physical attack), **DEF** (defense), **AGI** (speed,
turn order and evasion), **MAG** (spell power and healing).

The budget is **36 points**, counted as `HP/4 + MP/4 + ATK + DEF + AGI + MAG`.

| Class | HP | MP | ATK | DEF | AGI | MAG | Budget |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Warrior | 32 | 0 | 12 | 10 | 6 | 0 | 36 |
| Wizard | 20 | 16 | 6 | 4 | 6 | 11 | 36 |
| Paladin | 28 | 8 | 10 | 9 | 4 | 4 | 36 |
| Cleric | 24 | 16 | 8 | 7 | 5 | 6 | 36 |
| Rogue | 24 | 0 | 11 | 6 | 13 | 0 | 36 |
| Ranger | 24 | 4 | 10 | 6 | 10 | 3 | 36 |

- **Level-up growth:** every class gains the same budget (+6 points per level, weighted the same way), shaped by
  the class's growth curve.
- **No dead stats:** classes with 0 MP get stronger skills that cost no MP and have a cooldown instead (for
  example *Power Strike* and *Backstab*).
- **Lowest melee floor:** at level 1 with the starting weapon, every class's basic Attack deals at least
  **6 damage** to a DEF 4 enemy. The Wizard is the weakest at about 6–8, and the Warrior the strongest at about
  14–18.
- **Starting weapons (ATK bonus):** Sword +6, Mace +4, Sword and shield +4 (shield +2 DEF), Daggers +3,
  Hunting knife +4, Staff +3.

### 4.4 The Cleric playing alone (reference case)

The Cleric is the hardest class to start with, so it sets the minimum viable power for solo play.

- **Mace:** basic Attack with ATK 8 + mace 4. Kills a Slime (10 HP) in 1–2 hits and a Goblin (21 HP, DEF 6) in 3 hits.
  Deals ×1.5 damage against undead, which makes the Wraith-heavy Mirewood Marsh a strong area for the Cleric.
- ***Holy Strike*** (2 MP): melee damage of `ATK + MAG` with the Holy element. It's the Cleric's main damage
  option when facing tough enemies.
- **Heal** (3 MP): restores `MAG×2 + rand(8..12)`, roughly a third to a half of max HP at level 1.
- ***Blessed*** (passive): regains 1 MP every 4 steps on the overworld and 1 HP per turn in battle. This lets
  a Cleric keep fighting without resting at the inn after every few fights. **Being slowed to 1 MP every 12
  steps (15.9).**
- **Protect** (2 MP): +50% DEF for 3 turns. Strong against bosses.
- **Expected difference:** fights last about 1.5–2× longer than for a Warrior. The Cleric uses more MP but fewer
  potions.

### 4.5 Help for solo play (before the first companion)

- While the hero is alone, random encounters have **at most 2 enemies**. Since no one can join before the Goblin
  King, this covers the whole Prologue and Act I.
- The **Goblin King** boss scales with the size of the party (×0.75 HP when alone).
- Starting kit for every class: 3 Herbs and 50 gold. Classes without spells (Warrior, Rogue) get 2 more Herbs.
- Running away is slightly easier when alone (+10%).

### 4.6 Balance targets (checked by the simulator)

| Check | Target |
| --- | --- |
| Turns to kill a Slime (level 1, starting weapon) | ≤ 2 for every class |
| Turns to kill a Goblin (level 2, starting weapon) | ≤ 4 for every class |
| Solo win rate against Greenwood encounters at the expected level (level 3) | ≥ 90% for every class |
| Solo win rate against the Goblin King at the expected level (level 6, shop gear) | ≥ 60% for every class |
| Gap between the best and worst class's average fight length | ≤ 2× |
| Full-party (3 members) win rate against Act bosses at the expected level | 70–90% |
| Any hero + any one companion of a different class at level 5 against the Goblin King | ≥ 70% (revision 3: kept as a regression check only; in play the boss is fought solo) |
| Any hero + any two companions (all classes different) at level 5 against the Goblin King | ≥ 70% (regression check only, as above) |
| Solo hero at level 6 with shop gear against the Goblin King, every class (revision 3: the real path) | ≥ 60%, aim 65–80% |
| Solo hero at level 7 with tier-2 gear against each side-quest mini-boss fight, every class (revision 3) | ≥ 60% |
| Level-6 hero + a newly joined companion (join level 3) in Forest/Hills (16.1) | ≥ 90% wins; ally reaches level 4 in ≤ 15 fights on average |

If a class misses a target, tune its numbers in `game-quest` data files (growth curve, weapon stats, skill costs)
instead of changing the engine.

### 4.7 Party

- **Class select:** at the start, the player chooses a class and enters a name.
- **Party:** the player recruits companions through the story. Maximum party size is 3, and the player controls
  every member.
- **Recruiting is locked until the first boss** (revision 3): the hero travels alone through the Prologue and
  Act I. Companions can be met and talked to before then, but each one joins only after the Goblin King is
  defeated **and** their personal side quest is finished (see 14.2).
- **Random allies:** each new game rolls a companion for every companion spot in the world: a random name and a
  random class. No companion has the same class as the hero, and no two companions share a class. The roll is
  stored in the save, so the roster stays the same for that playthrough.
- **Tavern:** in the capital, the player can swap recruited companions in and out of the active party.
- **Companion levels (16.1, done):** a companion's first join is at half the hero's level (rounded down,
  minimum 1), never at the hero's level. Only party members gain XP; benched companions keep exactly the level and
  XP they left with (`companionProgress`).
- Party members follow the leader on the overworld in a snake-style trail.

---

## 5. Battle System

- **Transition:** a screen flash or wipe leads to the battle scene: backdrop by region, 1–4 enemies, and party
  status windows.
- **Presentation (revision 3):** side-view layout with the party on the left and enemies on the right, every
  action animated (see 14.4).
- **Commands:** Attack · Ability (spells and skills) · Item · Defend · Run
- **Attack** is available to every class and always uses the equipped melee weapon. It costs no MP and has no
  cooldown, so no class is left without a damage option when it runs out of MP.
- **Turn order:** sort by `AGI + random(0..AGI/4)` each round; the player picks commands for all members, then
  the round resolves.
- **Waiting for the player (play-test 1 fix):** every round, the battle stops and waits for a command from each
  living party member; it never resolves a round on its own. When the battle ends, the result text (XP, gold,
  level-ups, drops) stays on screen until the player presses OK (Z/Enter) or Esc.
- **Damage formula (starting point):**

  ```text
  physical = max(1, floor(ATK * rand(0.85, 1.15) - DEF / 2))
  magical  = max(1, floor(spellPower * rand(0.9, 1.1) * elementMultiplier))
  crit     = 1/32 base chance (Rogue 1/8), x1.5 damage, ignores DEF
  ```

- **Elements:** Fire, Ice, Lightning, Holy, Dark; each monster has weaknesses and resistances (×1.5 / ×0.5).
- **Status effects:** Poison, Sleep, Silence, Defend (½ damage for one turn).
- **Enemy AI:** weighted action tables per monster, plus simple rules (for example, heal when HP < 30%).
- **Run:** success chance based on party AGI vs. enemy AGI; not allowed in boss fights.
- **Rewards:** XP split among surviving members, gold, and a chance of an item drop.
- **Defeat:** the party wakes at the last church or inn with half its gold, as in *Dragon Warrior*.

---

## 6. World & Story

### Premise

The ancient dragon **Vyrmorth** (draft name: Vharzul) wakes beneath the Ember Mountains and burns the border village of Thornwick. The
King of **Aldmere** calls on a lone hero to find the three **Dragon Seals** and forge **Dragonbane**, the only
weapon that can end the dragon's reign.

### Acts

| Act | Region | Enemies | Key events |
| --- | --- | --- | --- |
| **Prologue** | Aldmere Castle & Thornwick | Tutorial slimes | Class select; the King's quest; Thornwick in ashes |
| **Act I** | Greenwood | Slime, Wolf, Goblin, Giant Bat, Skeleton | Hero travels alone; clear the Goblin Cave; boss: **Goblin King**. Afterwards, companion side quests open (Alpha Wolf, Giant Toad, Bone Captain, Goblin Jailer) |
| **Act II** | Sunscar Desert & Mirewood Marsh | Scorpion, Sand Worm, Lizardman, Wraith | Two Dragon Seals from shrines; bosses: **Sand Wyrm**, **Marsh Witch** |
| **Act III** | Frost Peaks | Ice Troll, Wyvern, Yeti, Frost Mage | Third seal; forge Dragonbane; boss: **Wyvern Matriarch** |
| **Finale** | Ember Mountains (volcano lair) | Fire Drake, Magma Golem, Dragon Cultist | Two-phase final boss: **Vyrmorth** |

### Content scope (target)

- 4 towns (Aldmere and Brookhollow built; Sandhollow and Frostgate planned) plus the ruins of Thornwick
- 1 overworld map with 5 regions
- 4 dungeons and 1 final lair
- About 25 monster types and 5 bosses
- About 40 items or equipment pieces and about 15 spells

### Town services

Inn (heal and save) · Weapon and armor shop · Item shop · Church (revive, cure) · Tavern (party swap; capital only) ·
NPCs with hints and side quests

---

## 7. Art & Audio Direction

- **Look:** 32-bit-era 2D (GBA / late SNES): richer palette with light and shadow tones, dark outlines around
  characters and monsters, finer texture on ground tiles, and gradient-filled menu windows.
- **Sprites:** 32×32-pixel overworld characters (4 directions × 2 frames); 32×32-pixel monsters shown 2–4× in
  battle; tiles have 32×32 pixels of detail on a 16×16 logical grid. The bitmap font stays chunky for readability.
- **Tools:** all art is currently drawn in code (`Art` class); Aseprite or LibreSprite if hand-made sprites are added.
- **Assets:** the first release uses only original procedural pixel art. **Liberated Pixel Cup (LPC)** 32×32
  sheets (CC-BY-SA 3.0, decided 2026-11-13) are the primary replacement through the `Art` class, with Kenney CC0
  as a secondary source and the procedural art as the fallback; every added file must be credited in
  `CREDITS.md`. CraftPix is deferred; see 16.2 for the licensing notes.
- **Audio:** procedural chiptune SFX with Web Audio; optional looping tracks per region and battle.

---

## 8. Phased Roadmap

| Phase | Goal | Deliverables | Status |
| --- | --- | --- | --- |
| **1. Foundation** | Engine skeleton | Nx libs, `/jouster-quest` route, canvas scaling, game loop, input, one test map with collision | Done |
| **2. Overworld** | Exploration | Map loader, grid movement, camera, warps, a town, NPC dialogue | Done |
| **3. Characters** | Class select | Class data, title screen, class-select screen, stats model | Done |
| **4. Battle** | Core combat | Encounter rolls, battle scene, turn system, enemy AI, XP and level-ups, defeat handling | Done |
| **5. Party & Economy** | RPG depth | Recruiting, party menu, inventory, equipment, shops, inns, save/load | Done: weapon, armor, shield and accessory slots, an EQUIP menu, an armorer and `I`/`E` shortcuts (15.4) |
| **6. Act I slice** | Playable vertical slice | Prologue and Act I content through the Goblin King, plus revisions 2 and 3 | Done; in play-testing (PR #184) |
| **7. Acts II–Finale** | Full story | Remaining regions, dungeons, bosses, ending | Not started |
| **8. Polish** | Feel & quality | Transitions, SFX/music, balancing pass, accessibility, battle poses and spell effects, mobile touch controls (stretch) | Partly done (fades, SFX, battle animations) |

**Milestone gate:** Phase 6 (Act I slice) must be fun and stable before Phase 7 starts.

---

## 9. Testing Strategy

- **Unit (Jest, `libs/game/engine`, `libs/game/quest`):** damage formula, turn order, encounter-rate RNG
  (with a seeded RNG), XP curve and level-ups, inventory and equipment, save-schema migration, fog bitsets,
  content validation (every monster, item, boss and quest pin referenced by a map exists and is in bounds).
- **Balance (Jest, `libs/game/quest`):** a seeded battle simulator runs each class alone and with companions
  through the encounters in section 4.6, including every side-quest mini-boss, then fails if any target is
  missed. It also checks that every class's level 1 stats add up to 36 points and that every class has a melee
  basic Attack.
- **Scenes (Jest, headless):** a scripted input driver plays the title flow, world movement, fog reveal, `M` map,
  companion quest flow, battles (command waits, animations, result screen) and menus without a DOM.
- **Page (Jest, `apps/jouster-ui`):** the `/jouster-quest` component boots the game on a 16:9 canvas.
- **E2E (Cypress, `apps/jouster-ui-e2e`):** planned, not written yet: load `/jouster-quest` → pick a class → move
  → trigger a seeded encounter → win a battle → save → reload.
- **Coverage target:** ≥80% on engine logic.
- Use a seeded RNG everywhere so battle and encounter outcomes are reproducible in tests.

---

## 10. Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Art production time | Start with CC0 placeholders; finalize the palette early |
| Scope creep | Ship the Act I vertical slice first; keep Acts II+ in the backlog |
| Balance issues | All stats in data files; equal stat budget; simulator tests that each class meets the targets in 4.6; debug overlay |
| A class is too weak to play alone | The Cleric is the reference case (4.4); solo help (4.5); simulator fails the build if solo win rates miss targets |
| Input and focus conflicts with the Angular app | Handle keys only while the canvas has focus; pause when the tab is hidden |
| Performance on low-end devices | Pre-render static map layers to offscreen canvases |

---

## 11. Decisions (formerly open questions)

1. **Hosting:** a route in `jouster-ui` (`/jouster-quest`), public, listed in the nav.
2. **Assets:** CC0 or other freely licensed assets for the first release. The Act I slice ships with original
   procedural pixel art drawn in code (no third-party files), so there is nothing to attribute yet. The `Art` class
   is the single swap point for CC0 sprite sheets later; any added sheet must be listed in a `CREDITS.md`.
3. **Mobile:** touch controls are out of scope for the first release (keyboard only).
4. **Companions:** each companion has a **fixed class** for the whole playthrough, but *which* companions exist is
   **rolled randomly per new game** (never the hero's class, no duplicate classes; see 4.7). The world is
   **open**: companions can be met in any order, but (revision 3) none can join before the first boss, and each
   needs their side quest finished. With a full party, a new companion can be swapped in; the one who leaves goes
   back to their home spot and keeps their level.
5. **Fog of war:** the overworld and dungeons start hidden and are revealed around the party; `M` opens a full
   map showing only explored areas (see 14.1). Towns are always fully visible.
6. **Screen:** 16:9 widescreen (384×216 logical, 768×432 canvas); 960×540 since revision 5 (16.6).
7. **Class balance:** every class, including the Cleric, must be able to win alone (possibly with more effort),
   and every class has a real melee Attack (section 4).
8. **Battle input:** each round waits for every party member's command, and the result screen waits for OK/Enter
   or Esc (section 5).
9. **Graphics:** 32-bit-era look (section 13.3).
10. **World size:** much larger overworld, 96×72 tiles (section 13.2).
11. **Difficulty:** early enemies slightly harder and about 38% more XP per level; boss difficulty kept
    (section 13.4).
12. **Companion pacing:** no recruiting before the first boss; companions can be met and talked to earlier, and
    each joins after a side quest (section 14.2).
13. **Battle layout:** side view with the **party on the left and enemies on the right**, every action animated
    (section 14.4).

---

## 12. Implementation status (Act I slice)

| Area | Implemented |
| --- | --- |
| Engine | Seeded RNG, fixed-step loop, keyboard input, scene stack with fades, renderer + 5×7 pixel font, tilemap, Web Audio SFX |
| Rules | Battle (turn order, attack/ability/item/defend/run, elements, status, crits), XP curve, encounters with grace steps |
| Classes | Warrior, Paladin, Cleric, Wizard, Rogue, Ranger — equal stat budget, every class has a melee Attack |
| World | Greenwood Vale overworld (96×72, seeded), Aldmere (castle, inn, chapel, shops, tavern), Brookhollow, Thornwick ruins, Goblin Cave, Wolf Den, southern lakeshore; fog of war and `M` world map |
| Companions | Four spots (Aldmere tavern, Thornwick ruins, Brookhollow, Goblin Cave) with a random name and class per new game; each joins after the Goblin King and their side quest |
| Story | King's quest → Goblin King boss → companion side quests → epilogue teasing **Vyrmorth**; the world stays open afterwards |
| Economy | Gold, item shop, weapon shop with trade-in, inn (heal + save), chapel (revive + save) |
| Saves | Versioned JSON in `localStorage` with validation; version 3 with migration from versions 1 and 2 |
| Battle | Side view (party left, enemies right) with animations; waits for every member's command each round and for OK on the result screen |
| Tests | Engine unit tests, content validation, seeded balance simulator, headless scene-flow tests, Angular page spec |

**Play-test fixes**

- Battles no longer resolve rounds without asking: each living member chooses an action every round, and the
  result screen waits for OK/Enter or Esc.
- Casting a heal from the field menu now spends the caster's MP (Sera's MP bar didn't drop before).

**Deviations from the plan**

- The dragon is named **Vyrmorth** (the plan's draft name was Vharzul).
- Maps are authored as character grids in TypeScript instead of Tiled JSON (small maps, no extra tooling).
- Field menu opens with X/Esc (not Space); Space is an extra confirm key. `M` opens the world map, `N` toggles sound.
- Keyboard input is only read while the game canvas has focus.
- Full parties may beat the trio balance targets slightly; solo and duo targets are enforced by the simulator.
- Armor/shield/accessory slots (built in 15.4); status-curing at the chapel, and music loops are deferred.

---

## 13. Revision 2 (play-test feedback)

Feedback from the first play-test of the Act I slice. Boss difficulty felt right and stays unchanged.

### 13.1 Random allies

| Rule | Detail |
| --- | --- |
| Companion spots | Four fixed home spots: Aldmere tavern, Thornwick ruins, Brookhollow village, Goblin Cave (after the Goblin King) |
| Roll | On **New Game**, each spot gets a random class and a random name from that class's name pool |
| Class limits | Never the hero's class; no two companions share a class (5 eligible classes for 4 spots) |
| Dialogue | Each spot has a location line (why they are there) plus a class line (what they offer) |
| Persistence | The roster is stored in the save (`companions` field), so it is stable within a playthrough |
| Randomness | Uses the game's seeded RNG, so tests can force a roster |

Balance impact: any class can now be a companion before the boss, so the simulator checks every hero class with
every other class as a single companion, and every valid trio (section 4.6).

### 13.2 Bigger world

| Item | Before | After |
| --- | --- | --- |
| Overworld size | 40×30 tiles | **96×72 tiles** (about 5.8× the area) |
| Authoring | Hand-written character grid | Generated from a **fixed seed** at load time (same world for every player), with hand-placed landmarks, a river with bridges, forests, hills, lakes and mountain ranges |
| Landmarks | Aldmere, Thornwick, Goblin Cave | Aldmere, Thornwick ruins, Goblin Cave, **Brookhollow** (new village with an inn, an item shop and a companion spot) |
| Connectivity | Manual | Roads link every landmark; a test checks every landmark is reachable from Aldmere |

Regions keep their encounter tables by terrain (grass, forest, hills, cave). Saves from revision 1 use the old map
coordinates, so the save version is bumped and old saves are not offered on the title screen.

### 13.3 32-bit graphics

- **Pixel density:** the backing canvas becomes 512×480 and the renderer applies a 2× transform. Layout, UI and
  game logic keep the 256×240 logical coordinates; art is drawn at twice the detail.
- **Characters and monsters:** drawn on the existing 16-unit shapes, then upscaled with a smoothing pixel-art
  filter (EPX / Scale2x) for clean curves and diagonals. Each sprite then gets automatic top-light and
  bottom-shadow shading and a 1-pixel dark outline.
- **Tiles:** ground textures (grass, road, sand, cave floor) use full-resolution noise with 3–4 shades. Objects on
  tiles (trees, hills, mountains, houses) go through the same smoothing, shading and outline as sprites.
- **Tile variants:** every impassable landscape tile has 3 looks, picked per map position by a deterministic
  hash (`tileVariant`), so they are scattered randomly but never change between frames, reloads or saves.
  Mountain: snowy peak, twin peaks, bare crag. Tree/forest: broadleaf, pine, fruit tree. Wall: same brick
  bond and colours on every variant (plain, darker brick + crack, darker brick + moss fleck) so walls join
  seamlessly. Cave rock: plain, boulder, crystal vein. Water: plain, lily pad, rock (cave water: stalagmite). The game RNG is not used, so battle and encounter rolls are unchanged.
- **UI:** windows get a dark-blue vertical gradient fill; text stays the chunky bitmap font for readability.
- **Monster looks:** common monsters have several cosmetic looks (palette swaps, and for slimes also tall and
  flat body shapes): slime 6 (blue, green, red, purple, gold, teal), bat, wolf, goblin and skeleton 3 each.
  Bosses keep one look. The look is picked per battle slot by a hash, not the game RNG, and never changes stats.
- **Descriptions:** the highlighted item or field spell shows a short description box in the field menu; in
  battle the ITEM and ABILITY lists show it at the top of the screen so enemies stay visible. Shops already
  showed item descriptions.
- Everything is still original, procedurally drawn pixel art (no third-party files).

### 13.4 Difficulty and progression

| Change | Before | After |
| --- | --- | --- |
| XP to next level | `floor(8 × L^1.5)` | `floor(11 × L^1.5)` (about 38% more XP per level) |
| Slime (HP / ATK) | 8 / 7 | 10 / 8 |
| Giant Bat | 10 / 8 | 12 / 9 |
| Wolf (was Grey Wolf; renamed in 15.8) | 14 / 10 | 16 / 11 |
| Goblin | 18 / 11 | 21 / 12 |
| Skeleton | 20 / 12 | 23 / 13 |
| Goblin King | — | **unchanged** |
| XP and gold rewards | — | unchanged (levelling takes more fights) |

The section 4.6 simulator targets still apply. If a class misses one, tune class or weapon data rather than undoing
the enemy changes.

### 13.5 Work breakdown

1. Plan update (this section).
2. Difficulty: XP curve, enemy stats, balance tests updated for random companions.
3. Random allies: companion spots and name pools, roster roll on New Game, save version 2, dialogue, tests.
4. Bigger world: seeded overworld generator, Brookhollow map, warps, reachability tests.
5. 32-bit graphics: renderer pixel ratio, EPX upscale + shading + outlines, hi-res tiles, gradient windows.
6. Verify: unit, balance and scene tests, lint, production build, browser screenshots; push to the open PR.

---

## 14. Revision 3 (exploration, pacing, widescreen and battle presentation)

Feedback from the second play-test. Boss difficulty still felt right. Because the hero now fights the Goblin King
alone, the solo boss target in 4.6 becomes the one that matters; the boss is only retuned if the simulator shows a
class below it.

### 14.1 Fog of war and world map

| Rule | Detail |
| --- | --- |
| Where | Overworld and dungeons (Goblin Cave, later caves/towers). Towns and castles are always fully visible |
| Start | Every tile is hidden (drawn as dark fog) except the area around the starting point |
| Sight radius | Outdoors (overworld and towns): **8 tiles in clear weather**, minus the weather severity (14.1.1). Caves: fixed **3 tiles**, **+1** when a lit wall torch is in sight within 3 tiles. Circle shape |
| Reveal | Each step marks every tile within the radius as explored. Explored tiles stay visible permanently |
| Look | Unexplored tiles are solid fog with a soft 1-tile dithered edge; explored tiles outside the current radius are drawn slightly dimmed so the "live" area reads clearly |
| Line of sight | Not in the first pass (a plain radius). Possible later: mountains/forest block sight, hills extend it |
| Encounters/NPCs | Monsters and NPCs inside fog are not drawn |
| Save | One bitset per map (1 bit per tile; 96×72 = 864 bytes), stored base64 in the save. Save version → 3; older saves start with only the area around the party revealed instead of being discarded |

#### 14.1.1 Weather and seasons

Weather and seasons apply outdoors only; caves have no weather. Both are derived from the step counter plus a
per-journey seed (hash of the hero name and companion roster), so they need no extra save fields and never use the
battle RNG. Weather does not affect encounters or battles. Clouds, fog banks and precipitation will be anchored
to the world rather than the screen (15.1).

| Season | Steps (repeats every 1200) | Look | Possible weather |
| --- | --- | --- | --- |
| Spring | 0–299 | No tint | clear, cloudy, rain, storm, fog |
| Summer | 300–599 | Warm tint | clear, cloudy, rain, storm |
| Autumn | 600–899 | Orange tint | clear, cloudy, rain, storm, fog |
| Winter | 900–1199 | White wash | clear, cloudy, snow, fog, blizzard |

| Weather | Severity | Sight radius | Effect |
| --- | --- | --- | --- |
| Clear (sunny) | 0 | 8 | — |
| Cloudy | 1 | 7 | Dimmed light, drifting cloud shadows |
| Rain / Snow | 2 | 6 | Falling streaks / flakes |
| Storm | 3 | 5 | Heavy rain with lightning flashes |
| Fog | 4 | 4 | Drifting fog bands |
| Blizzard | 5 | 3 | Dense, wind-driven snow |

- Weather is rolled every 40 steps from the season's weighted table; every journey opens with clear skies.
- A banner announces each change ("Summer has come.", "It starts to rain."). The field HUD and the `M` map
  legend show `SEASON - WEATHER` (or `UNDERGROUND` in caves).
- The Goblin Cave has wall torches (solid, animated tiles); the Wolf Den is unlit.
- Clouds and fog banks are lumpy, rounded pixel shapes (overlapping circles with a dithered, soft edge), varied
  in size, speed and opacity. Rain drops vary in length, speed and shade, sway with the wind and splash on the
  ground; snow falls in depth layers with per-flake sway (blizzards add gust streaks); lightning is a jagged,
  branching bolt with a screen flash.

**World map (`M` key)**

- Opens a full-screen overview of the **current map** (on the overworld, the whole 96×72 world) scaled to fit the
  widescreen (about 2 logical px per tile, 4 real px at 2× density), framed like a parchment.
- Only explored tiles are drawn, in simplified terrain colours; unexplored tiles show parchment/fog.
- Markers: blinking party position, icons for discovered towns/caves with their names, and a pin for the active
  side-quest target if its area has been explored.
- `M`, `X` or `Esc` closes it. Not available during battles, dialogue or menus. Shown in the controls list on
  the page.
- Also reachable as **Map** in the field menu.

### 14.2 Companion pacing and side quests

- **Before the Goblin King:** no one can join. Companions still stand at their home spots, talk, and hint at what
  troubles them ("I'd follow a proven hero — and I've a debt to settle first.").
- **After the Goblin King:** each companion offers a **side quest**; completing it makes them join (or wait at the
  tavern if the party is full). Quests are tied to the **spot**, not the class, so they work with any random roll.
- Recruits are spread out so they don't all arrive at once: each quest sends the player to a different region,
  and the cave companion's quest is the longest.
- **Known gap (to be reworked in 15.6):** the Alpha Wolf and Giant Toad can currently be beaten before their quest
  exists; the companion then skips straight to "quest complete" when first asked.

| Spot | Side quest (as built) | Reward besides the companion |
| --- | --- | --- |
| Aldmere tavern | **The Wolf Den:** slay the Alpha Wolf (with a wolf) in its den in the far eastern hills, past Thornwick | 60 G |
| Brookhollow | **The Lake Beast:** drive off the Giant Toad on the west shore of the southern lake | 30 G, Herb ×4 |
| Thornwick ruins | **Restless Bones:** rest at an inn, then defeat the Bone Captain (with a skeleton) in the ruins that night | 40 G, Tonic ×2 |
| Goblin Cave | **The Cell Key:** the companion is locked in a cell; take the key from the Goblin Jailer (with a goblin) in the cave's east chamber | 80 G |

- New mini-bosses are tuned to be beatable **solo** at the expected level (level 6–8), roughly 60–70% of the
  Goblin King's strength, and get simulator checks.
- A simple **Quest log** in the field menu lists active quests with one-line hints.
- Save adds `quests: Record<questId, 'locked' | 'offered' | 'active' | 'done'>`.

### 14.3 Widescreen

- Logical screen becomes **384×216 (16:9)**; backing canvas **768×432** at 2× density. The page frame and CSS
  aspect ratio change to 16:9.
- World view shows 24×13.5 tiles (was 16×15), so the camera reveals more sideways — this also makes the fog
  radius feel natural.
- All screens are re-laid out from `SCREEN_W`/`SCREEN_H` constants: title, class select, name entry, field menu,
  shops, dialogue box (wider, 3 lines), battle. No hard-coded 256/240 values remain (a test greps for them).

### 14.4 Battle presentation

**Layout (side view, 16-/32-bit RPG style)**

- Region backdrop across the top two-thirds (grassland, forest, hills, cave; gradient sky plus ground strip).
- **Party on the left**, facing right, in a slight diagonal, using the 32×32 character art with battle poses.
- **Enemies on the right**, facing left, at their sprite size (bosses larger).
- Bottom strip: party status (name, HP/MP bars) on the left under the party, command window on the right; the message line sits
  above it.
- The member choosing a command steps forward one half-tile and has a cursor over their head.

**Animations (each action plays before its result text)**

| Action | Animation |
| --- | --- |
| Party melee | Hero steps toward the target, weapon swing pose, slash sprite on the target, target flashes white and shakes, damage number floats up, hero steps back |
| Ranged (Ranger) | Draw pose, arrow projectile flies to the target, hit flash and number |
| Spell | Cast pose with a glow; element effect on the target(s): fire burst, ice shards, lightning bolt, holy light, dark swirl |
| Heal / buff | Sparkles rising over the target, green number for healing; shield glint for Defend/Protect |
| Item | Item icon pops over the user, then the effect |
| Enemy attack | Enemy lunges toward the target, target flashes, shakes and shows the number; crits flash the screen |
| Status | Small icon over the affected unit (poison bubble, sleep "Z", silence mark) |
| Defeat | Enemy flashes and dissolves; a fallen party member drops to a KO pose (greyed) |
| Run | Party turns and runs off to the left; on failure they stumble back |
| Victory | Party victory pose, then the result window (still waits for OK, as in revision 1) |

- **Timing:** each action about 0.6–0.9 s. Holding confirm doubles speed; a "Battle speed" option (normal/fast)
  is stored in the save. Inputs never get skipped: command selection still waits for each member every round.
- **Implementation:** the battle rules already produce an ordered event list per round. A new animation
  **timeline** in the battle scene turns each event into tweens (position, flash, shake, particles, floating
  numbers) and plays them in order; game logic is unchanged and stays deterministic. Sprites gain poses
  (idle, ready, attack, cast, hurt, KO, victory), built from the same procedural art.
- **Tests:** a fake clock steps the timeline; tests assert every event plays exactly once, HP displays update
  only after the hit, and the scene returns to command input afterwards.

### 14.5 Work breakdown (all done in the first pass, except where 14.6 says otherwise)

1. Plan update (this section).
2. Widescreen: constants, canvas/CSS, re-layout of all scenes, page spec; screenshot every screen.
3. Fog of war: explored bitsets, reveal on step, fog rendering, save v3 migration, tests.
4. World map overlay on `M` plus field-menu entry, markers, controls text.
5. Companion pacing: recruit lock until the boss, quest state, quest log, four side quests (new small cave,
   lakeshore area, night event at Thornwick, lower cells in the Goblin Cave), mini-bosses, simulator checks.
6. Battle presentation: side-view layout, battle poses, animation timeline, effects, speed option, tests.
7. Verify: unit, balance and scene tests, lint, production build, browser screenshots; push to the open PR.

**Assumptions to confirm in play-testing:** sight radius (now set by weather, 14.1.1), explored-but-out-of-sight tiles dimmed
rather than re-fogged, towns never fogged, one side quest per companion.

### 14.6 Implementation notes (first pass)

- **Fog:** radius 8 outdoors in clear weather minus weather severity (14.1.1); 3 in caves, +1 near a wall torch;
  towns are never fogged. Explored
  tiles are stored per map as packed 32-bit words (`explored: Record<mapId, number[]>`) in save v3; v1/v2 saves
  migrate with only the area around the party revealed.
- **Keys:** `M` opens/closes the world map (also **Map** in the field menu); `N` toggles sound. The map panel
  lists discovered places and the current quest hints.
- **Side-quest bosses:** Alpha Wolf (Wolf Den, east of Aldmere), Giant Toad (southern lakeshore), Bone Captain
  (Thornwick ruins, appears only after resting at an inn while that quest is active) and the Goblin Jailer, who
  holds the cell key in the Goblin Cave. The simulator requires every class to win each of these fights solo at
  level 7 with tier-2 gear at least 60% of the time.
- **Battle:** side view with the party on the left and enemies on the right. First pass animations: lunge or hop
  for attacks and casts, arrows for ranged attacks, hit shake, floating damage/heal numbers, sparkles and bursts,
  fade-out for defeated enemies, slide-in at the start and a victory bob. Holding confirm plays events 2.5× faster.
  Not done yet: separate battle pose sprites, per-element spell effects, status icons and a saved "Battle speed"
  option.

### 14.7 Polish done after the first pass

These shipped on PR #184 after the first revision 3 pass, in response to play-testing:

- **Tile variants (13.3):** every impassable landscape tile has 3 hashed looks; walls share one brick bond so
  buildings read as one piece.
- **Weather and seasons (14.1.1):** outdoor sight radius 8 in sunshine, minus weather severity; caves fixed at 3,
  +1 near wall torches. Shaped clouds and fog banks, varied rain, snow and lightning.
- **Out-levelled areas (section 3, Encounters):** encounters become rare once the party is more than 3 levels above
  an area.
- **Monster looks (13.3):** cosmetic colour and shape variants for common monsters (slime ×6, others ×3).
- **Descriptions (13.3):** item and spell descriptions in the field menu and battle lists.

---

## 15. Revision 4 (play-test feedback — implemented)

Feedback from the fourth play-test. All items below are built; see 15.12 for where the build differs from the plan.

### 15.1 Weather stays with the land

**Problem:** the weather overlay is drawn in screen space (`drawWeather(r, kind, time)`), so when the party walks
the clouds, fog banks, rain and snow move with the camera and look glued to the player.

**Plan:**

- Pass the camera position (in logical px) to `drawWeather`. Cloud shadows and fog banks are placed in **world
  space** (`worldX - cameraX`) and wrap over a world-sized span, so walking past a cloud makes it slide off-screen
  the opposite way while it keeps its own slow wind drift.
- Rain and snow are also offset by the camera (wrapped to the screen), so the particle field stays fixed to the
  ground and only falls and drifts with the wind. Splashes are anchored to world tiles.
- Lightning flashes and the season tint stay full-screen (they are light, not objects).
- Map changes reset nothing visible; the same weather continues because it is derived from steps.
- **Test:** a unit test draws two frames with the same time and a camera moved by one tile and checks the cloud
  draw positions moved by exactly −1 tile (a recording `Renderer` double).

### 15.2 Gold drops are a chance, not a certainty

**Problem:** every win pays every monster's full gold (`rewards()` sums `e.gold`), so gold is effectively 100%.

**Plan:**

- Monsters get a `goldChance` (0–1) and gold is rolled per monster on victory with the battle RNG.
  Defaults: common monsters **55%** (45% was tried first but failed the economy check), mini-bosses and bosses **100%**.
- When gold drops, the amount varies **75–125%** of the monster's `gold` value (rounded, at least 1).
- The result window says "No gold found." when nothing dropped; the Rogue's Steal still adds its gold as now.
- Expected gold per ordinary fight falls to roughly half. The balance simulator gains an **economy check**: a
  solo hero who fights the expected number of battles can still afford the tier-2 weapon before level 7
  (section 14.6); if not, raise `goldChance` slightly rather than prices.

### 15.3 Smite must beat Holy Strike

**Problem:** Holy Strike (2 MP) is `ATK + MAG` physical damage, while Smite (3 MP) is `7 + MAG` magic damage.
With a mace, Holy Strike out-damages Smite at every level (e.g. Cleric L4 with an Iron Mace: about 25 vs 16), so
the dearer spell is worse.

**Rule:** a higher-MP attack of the same class must do clearly more damage on average than a cheaper one.

**Plan (starting values; the simulator tunes the final numbers):**

| Ability | MP | Now | Planned |
| --- | --- | --- | --- |
| Holy Strike | 2 | ATK + 1.0 × MAG, minus DEF/2, holy | ATK + 0.5 × MAG, ×1.1, minus DEF/2, holy |
| Smite | 3 | 7 + 1.0 × MAG, ignores DEF, holy | 12 + 2.0 × MAG, ignores DEF, holy (still ×weakness vs undead) |

- Expected Cleric results vs a goblin: L4 with an Iron Mace, Attack ≈ 16, Holy Strike ≈ 22, Smite ≈ 30;
  L20, Holy Strike ≈ 50, Smite ≈ 62.
- Holy Strike stays clearly better than a plain Attack, so the solo Cleric (4.4) keeps its early-game tool;
  the Paladin's Holy Strike loses about 2 damage at level 1.
- **Tests:** a new balance test averages 500 seeded hits of each ability for the Cleric at every level 4–20
  with the best mace on sale and requires Smite ≥ 1.2 × Holy Strike and Holy Strike > Attack. Existing solo targets
  in 4.6 must still pass; if the solo Cleric misses one, raise Holy Strike's multiplier, not Smite.
- Add the same "higher cost = more damage" check for Fire/Ice vs Arcane Strike and Bolt.

### 15.4 Equipment: armor slots and how to equip

**Today:** only weapons exist. A weapon is equipped by **buying it** in the weapon shop: it goes on the party
member whose class uses it, and the old one is traded in. There is no equip command and no `I` key; the field
menu opens with `X`/`Esc` and has STATUS, ITEM, MAGIC, QUESTS, MAP and CLOSE.

**Plan (finishes the deferred part of phase 5):**

| Slot | Examples | Stat |
| --- | --- | --- |
| Weapon | (existing, by class family) | ATK (staves also MAG) |
| Armor | Cloth Robe, Leather Armor, Chain Mail, Plate | DEF (heavier armor class-restricted) |
| Shield | Buckler, Kite Shield | DEF (Warrior, Paladin only) |
| Accessory | Ring of Vigor (+HP), Swift Boots (+AGI), Sage Charm (+MAG) | One stat |

- Bought gear goes into the **inventory**, not straight onto a member. Weapons keep their trade-in offer at the
  shop ("Equip now? YES / NO").
- **Field menu:** new **EQUIP** entry: choose member → choose slot → choose an item from the inventory that this
  class can use. The list shows the stat change (e.g. `DEF 9 → 12`) before confirming. Unequipping returns the item
  to the inventory.
- **Keyboard shortcuts (new):**

| Key | Action |
| --- | --- |
| `X` / `Esc` | Field menu (unchanged) |
| `I` | Open the field menu straight on **ITEM** |
| `E` | Open the field menu straight on **EQUIP** |
| `M` | World map (unchanged) |
| `N` | Sound on/off (unchanged) |

  Shortcuts work only on the world screen (not in battle, dialogue or shops). The page's controls list and the
  STATUS screen ("E: EQUIP") show them.
- Shops sell armor, shields and accessories by town tier; the item shop's description box shows the stat and which
  classes can use it.
- **Save:** worn gear is stored as optional `armorId` / `shieldId` / `accessoryId` fields on each member (the
  weapon keeps `weaponId`). Because the new fields are optional, v3 saves load unchanged with empty slots, so the
  save version stays 3; unknown gear ids make a save invalid. *(Implemented this way instead of a v4
  `equipment` object.)*
- **Where to buy:** Aldmere's armorer stall in the east plaza (talk across the counter) sells all ten pieces;
  a companion who leaves the party returns bought gear (and a non-starting weapon) to the bag.
- **Balance:** enemy damage was tuned without armor, so armor DEF is kept modest (tier 1 +2, tier 2 +4) and the
  simulator re-runs all 4.6 targets with "best affordable gear" at each checkpoint.

### 15.5 Healing never exceeds maximum HP

**Audit (current code):** battle Heal, battle items, field Heal/items (`applyRestore`), Cleric regen, level-ups and
the inn all clamp to max HP, and the shown amount is the clamped amount. No over-heal path was found by code
review.

**Plan (make it guaranteed and remove waste):**

- One shared `restoreHp(target, amount)` helper (engine) used by every heal path, returning the actual amount;
  same for MP.
- In battle, a heal or healing item aimed at a full-HP ally is **greyed out** in the target list (as the field
  menu already says "It would have no effect."), so MP and items are not wasted on 0 HP.
- Battle combatants read max HP from `memberStats` including future armor/accessory bonuses, so +HP gear cannot
  leave HP above max after it is removed (unequipping clamps HP/MP).
- **Tests:** a property-style test runs every heal ability and item on members at random HP, including full HP,
  and asserts `hp ≤ maxHp` and that the reported amount equals the HP actually gained.

### 15.6 Companion side quests rework

**What happens today:**

- The Alpha Wolf (Wolf Den) and the Giant Toad (lakeshore) can be fought **at any time**, even before the
  Goblin King or before their quest is offered. Beating one sets its flag and shows only its victory line; nothing
  links it to the companion.
- Later, after the Goblin King, talking to that companion goes straight to **"Quest complete"** with the reward,
  so the player never hears the request and the thanks have no context.
- The Bone Captain only appears while the Thornwick quest is active (after resting at an inn), and the Goblin
  Jailer only after the Goblin King, so those two cannot be done early.

**Plan:**

1. **Mini-bosses are dormant until their quest is active.** The Alpha Wolf and Giant Toad are not on the map
   before the quest is offered; their spots show signs instead (tracks and a mauled cart at the den, a ruined
   fishing net at the shore) with a short description. This matches the Bone Captain and Jailer.
2. **Quest stages are explicit:** `locked` (before the Goblin King) → `available` (companion has something to
   ask) → `active` (accepted) → `ready` (mini-boss beaten) → `done` (turned in). The player can **accept or
   decline** the request (YES/NO), and the quest log shows each stage.
3. **On victory** over a quest mini-boss, a message names the companion ("Return to Bren in Aldmere.") and the map
   pin moves to the companion.
4. **Turning in** plays the thanks, gives the reward and then asks to join (as now).
5. **Old saves:** a save where a mini-boss was beaten early keeps the flag; that quest goes straight to `ready`,
   and the companion says a bridging line ("You already slew the alpha? Then I owe you twice.") before the reward,
   so nothing is lost.
6. Optional later idea (not in this pass): each quest gives a small story reward tied to the companion's class
   (e.g. a ring for a Wizard), so the quests feel personal even with random rolls.

- **Tests:** scene tests check that the wolf/toad are absent before the quest, appear once accepted, that winning
  moves the quest to `ready`, and that turning in rewards once; a save-migration test covers early kills.

### 15.7 Building signs in towns

**Problem:** town buildings look alike, so the player has to walk in and talk to find the inn or a shop.

**Plan:** each service building gets a hanging sign above its door, drawn as a pixel-art icon (no text, so it
reads at any scale and needs no translation):

| Building | Towns | Sign icon |
| --- | --- | --- |
| Inn | Aldmere, Brookhollow | Bed |
| Tavern / bar | Aldmere | Mug of ale |
| Item shop | Aldmere, Brookhollow | Potion bottle |
| Weapon shop | Aldmere | Crossed swords |
| Armor shop (with 15.4) | Aldmere, later towns | Shield |
| Chapel | Aldmere | Holy symbol |
| Castle | Aldmere | Crown banner |

- **Data:** signs are listed per town map as `signs: [{ x, y, kind }]` placed on the wall tile above each door, so
  new towns only add entries. They block movement like the wall they hang on.
- **Art:** 32×32 tile drawn by the same procedural sprite code: a wooden board on an iron bracket with the icon;
  a slight sway (1px, slow) when weather is windy or stormy (14.1.1). Signs never use the random wall variants.
- **Interaction:** facing a sign and pressing confirm shows its name ("ALDMERE INN - rest and recover"). Optional
  later: the world map (`M`) shows the same icons for discovered towns' services.
- **Tests:** a map-data test checks every inn/shop/chapel/tavern NPC has a matching sign within a few tiles and
  that every sign sits on a wall tile; a sprite test checks each sign kind renders.

### 15.8 Generic names for monsters with look variants

**Problem:** "Grey Wolf" can appear brown or black because of the cosmetic looks (13.3), so its name contradicts
what is on screen.

**Decision:** keep the look variants and give every varied monster a **generic name** with no colour, material or
other look-specific words. Monsters without variants (bosses and mini-bosses) keep their unique names.

| Monster | Variants | Name now | Planned name |
| --- | --- | --- | --- |
| Slime | 6 colours, 3 shapes | Slime | Slime (unchanged) |
| Giant Bat | 3 palettes | Giant Bat | Giant Bat (size, not colour; unchanged) |
| Wolf | 3 palettes | Grey Wolf | **Wolf** |
| Goblin | 3 palettes | Goblin | Goblin (unchanged) |
| Skeleton | 3 palettes | Skeleton | Skeleton (unchanged) |
| Goblin King, Alpha Wolf, Giant Toad, Bone Captain, Goblin Jailer | none | (unique) | unchanged |

- **Rule for new monsters:** a monster that gets look variants must have a name that fits all of them; a monster
  that needs a colour in its name (e.g. a future "Red Dragon") gets **no** colour variants, only its own palette.
- Only the display name changes; the monster id (`wolf`), stats, drops and saves are unaffected. Battle text
  ("A Wolf appears!", "Wolf A") and the bestiary-style hints use the new name.
- **Test:** a data test fails if any monster with more than one look has a colour word (grey, gray, red, blue,
  green, black, white, brown, gold, purple, teal) in its name.

### 15.9 Slower Cleric MP regeneration

**Problem:** *Blessed* gives the Cleric +1 MP every 4 steps, on every map including towns. Encounters come about
every 16 steps, so the Cleric regains ~4 MP between fights — more than a full Heal (3 MP). Healing is effectively
free, and MP almost never runs low.

**Plan:**

| Setting | Now | Planned |
| --- | --- | --- |
| Field MP regen | +1 MP every 4 steps | **+1 MP every 12 steps** |
| Where it applies | Every map, including towns | Only on maps with encounters (overworld, caves, dens); not in towns, so pacing in town does not refill MP |
| Battle HP regen | +1 HP per round | Unchanged |
| Class/passive text | "+1 MP every 4 steps" | "+1 MP every 12 steps outside towns" |

- Between average fights this is ~1.3 MP: about one Heal every two to three fights, so the Cleric still needs
  inns and Tonics less often than other classes, but must plan MP.
- The interval stays a data value (`fieldMpStepInterval`) so the simulator can tune it between 10 and 16.
- **Balance check:** the simulator's solo-Cleric runs (4.4, 4.6) model field regen by steps between fights; the
  solo win-rate targets must still pass. If they fail, first make Holy Strike slightly stronger (15.3), not regen.
- **Tests:** a world-scene test walks 24 steps on the overworld (+2 MP) and 24 steps in a town (+0 MP), and
  checks MP never goes above max.

### 15.10 Slow HP regeneration while walking (all classes)

**Goal:** every living party member slowly recovers HP while walking, so a long trek is a little kinder without
replacing inns, Herbs or Heal. The Cleric recovers fastest, the Paladin in between.

| Class | Field HP regen | Approx. per average gap between fights (~16 steps) |
| --- | --- | --- |
| Warrior, Wizard, Rogue, Ranger | **+1 HP every 24 steps** | ~0.7 HP |
| Paladin | **+1 HP every 16 steps** | ~1 HP |
| Cleric | **+1 HP every 10 steps** | ~1.6 HP |

- Same rules as Cleric MP regen (15.9): only on maps with encounters (not in towns), not for KO'd members, never
  above max HP, and uses the shared `restoreHp` helper (15.5).
- Data: a class-level `fieldHpStepInterval` (default 24) overridden by the Paladin and Cleric, so the simulator can
  tune it. Paladin and Cleric passive/class descriptions mention their faster regen.
- Battle HP regen (Cleric +1 HP per round) is unchanged; no class gains battle regen from this.
- **Balance check:** the simulator includes field HP regen between fights; solo win rates must not exceed their
  targets by much (no class should stop needing inns). If they do, lengthen the intervals.
- **Tests:** walking 48 overworld steps gives +2 HP for a Warrior, +3 for a Paladin and +4 for a Cleric (+MP per
  15.9); 48 town steps give +0; HP never exceeds max and KO'd members stay at 0.

### 15.11 Work breakdown

1. Plan update (this section) — done first, before any code.
2. World-anchored weather (15.1) and its renderer test.
3. Gold chance and amount variance, result text, economy check (15.2).
4. Holy Strike / Smite retune and the "cost = power" balance tests (15.3).
5. Heal helper, battle target greying, heal property test (15.5).
6. Side-quest stages, dormant mini-bosses, accept/decline, victory messages, save migration (15.6).
7. Equipment slots, EQUIP menu, `I`/`E` shortcuts, armor shops, save v4 and simulator re-check (15.4) —
   the largest item.
8. Building signs (15.7), including the armor shop sign added with 15.4.
9. Generic monster names and the colour-word test (15.8).
10. Slower Cleric MP regen, town exclusion and simulator re-check (15.9).
11. Field HP regen for all classes (Cleric > Paladin > others) with the same rules (15.10).
12. Verify: unit, balance and scene tests, lint, browser screenshots; push to PR #184.

### 15.12 Implementation notes

- **Signs (15.7):** signs are a transparent sprite drawn over the wall tile they hang on (the wall keeps its
  normal look), between the tiles and the characters. Aldmere has castle, chapel, item, smithy, tavern, inn and
  armorer signs; Brookhollow has inn and item signs.
- **Armorer (15.4):** a stall east of the Aldmere fountain sells all armor, shields and accessories. Bought gear
  goes to the bag and can be equipped on the spot (the replaced piece is traded in for half its price) or later
  with `E`.
- **Saves:** the side-quest stages (15.6) and gear slots (15.4) are optional fields, so the save version did not
  need a bump; older saves load with empty slots and quests derived from flags.
- **Field regen (15.9/15.10):** the balance simulator does not simulate walking regen between fights, so its win
  rates are slightly pessimistic.

---

## 16. Revision 5 (implemented; LPC objects and remaining monsters next)

Three requests after revision 4, plus the art and view follow-ups. Status per subsection: 16.3, 16.1 and 16.6
are implemented; 16.2 LPC tiles, characters and most monsters are in and LPC is the default art (16.7);
16.8 redraws the original (`?art=classic`) art natively at LPC density; 16.5 is not started.

### 16.1 Companions start low and level only in the party (implemented)

**Implemented:** `companionProgress: { level, xp }` replaces `companionLevels`; save version 4 migrates v2 and v3
saves (`{ level, xp: totalXpForLevel(level) }`, no downgrade). Every side-quest reward now includes at least 2
Herbs (companions already bring their class starting weapon). **Simulator result:** with a level-6 hero, a
level-1 companion needed about **21 fights** to reach level 4 (target ~10), a level-2 one about 19, and a level-3
one about **12**; win rate was ~100% in every case. So the fallback below was used: first-time companions join
at `companionJoinLevel(hero) = max(1, floor(hero / 2))`. Early in the game (hero level 1–3) that is level 1.
`simulateFight` now also returns which members survived, so the balance test grants XP like the battle scene.

**Now:** `createCompanion` makes a new companion at the **hero's level** (or their stored level, if higher).
XP is already given only to party members who survive a battle, so benched companions never gain XP.

**Plan:**

- A companion joins at **level 1** the first time. When they leave (tavern swap), their level and XP are stored
  (`companionLevels` becomes `companionProgress: { level, xp }`); when they rejoin they come back exactly as they
  left, never raised to the hero's level.
- Only the hero and companions **in the active party** gain XP (unchanged rule, now covered by a test). Benched
  companions stay frozen.
- **Catch-up stays natural:** battle XP is split equally between survivors and the XP curve is steep, so a level-1
  companion with a level-6 hero gains several levels in the first few fights without any extra rule. Victory text
  shows each level-up as today.
- **Keeping a low-level ally alive:** level-1 companions joining after the Goblin King would be one-shot by later
  monsters. To avoid that:
  - their side quest reward includes a starter kit (2 Herbs) and the companion's class starting weapon;
  - the party-wide encounter scaling (section 3) still uses the **highest** level, so areas don't get easier;
  - balance check: hero level 6 + one level-1 companion must still beat Forest/Hills encounters at ≥ 90%, and
    the companion must reach level 4 within ~10 fights. If not, give companions a small **join bonus** of
    "half the hero's level" (rounded down, minimum 1) instead of level 1 — decided by the simulator, not guessed.
- **Saves:** old saves keep their companions' current levels (no downgrade); `companionLevels` entries migrate
  to `{ level, xp: totalXpForLevel(level) }`. Save version bumps to 4 because the field changes shape.
- **Docs:** section 4.7 and the balance targets for "hero + companion at level 5" are updated to the new rule.
- **Tests:** a new companion is level 1 regardless of hero level; benched companions gain no XP from battles;
  a companion swapped out and back keeps level and XP; an old save with `companionLevels` loads correctly;
  simulator checks above.

### 16.2 Using third-party art (decision: LPC 32×32 primary, Kenney secondary)

**Today:** every tile, character, monster, sign and weather sprite is drawn in code by the `Art` class (16×16
logical, rendered at 2× detail). Scenes only call `art.tile(id, frame, variant)`, `art.character(...)`,
`art.monster(...)` and `art.sign(...)`, which return canvases. That narrow interface is what makes a swap
practical: only `Art` needs to change.

**Decision (2026-11-13, updated):** use **Liberated Pixel Cup (LPC)** art as the **primary** source, at native
32×32. It is top-down 3/4-view fantasy pixel art (SNES-era look, full colour), covers towns, dungeons, characters
with full animation and many monsters, and its license allows committing, sharing and showing the files to AI
tools. **Kenney CC0** packs are the **secondary** source for gaps (scaled 2× from 16×16), and the procedural
`Art` drawers remain the last fallback. The world view stays **top-down** (see 16.5). CraftPix stays a possible
later upgrade; the licensing review below is kept for that.

**Licensing (re-examined after the repository was made private, 2026-11-13):**

| Source | License | Files in this repo? | Notes |
| --- | --- | --- | --- |
| **CraftPix freebies** | CraftPix license §2: personal and commercial games, edits allowed, no attribution required | **Yes, while the repo stays private** | No reselling or redistributing the files or near-copies; no AI use (see below) |
| **CraftPix premium** | CraftPix license §1: same, bought per pack or by subscription; downloads stay usable after the subscription ends | **Yes, while private** | Same restrictions; non-transferable, licensed to the buyer only |
| **LPC (primary)** | CC-BY-SA 3.0 or GPL 3 (dual; we use CC-BY-SA 3.0); some layers CC-BY / OGA-BY / CC0 | Yes, always | 32×32 tiles, 64×64 character frames; credit every author; edited files stay CC-BY-SA |
| **Kenney (secondary)** | CC0 (public domain) | Yes, always | 16×16, scaled 2×; fills gaps LPC doesn't cover |
| **OpenGameArt / itch.io** | Per pack | Depends | Use only CC0/CC-BY (credit it) or licenses at least as permissive as CraftPix's |

**What the CraftPix license allows and forbids for this project:**

- **Allowed:** shipping the art inside the game on the website. Browsers download the PNGs to draw them, and the
  license explicitly says "an app that uses the art as part of the game is fine".
- **Forbidden:** any feature that lets players save or export the art (for example a sprite viewer or a
  "download sheet" button); publishing the raw files (public repo, public bucket listing, public GitHub
  release or artifact); giving the files to other developers to reuse — the license is **non-transferable**, so
  any future collaborator needs their own CraftPix account/license or must work with the procedural fallback.
- **AI clause (license §3):** the assets may not be used for "training, fine-tuning, developing, testing,
  validating, or improving" AI/ML systems. Writing game code with an AI assistant is not training a model, but
  to stay well clear of it: CraftPix images are **not uploaded or shown to AI tools** (including Copilot chat),
  sheet layouts are taken from each pack's file names, readme or Tiled `.tsx` data, and visual review of the
  result is done by a person. If unsure, ask CraftPix support before starting.
- **Account:** downloads require logging in on craftpix.net in a browser (no third-party sign-in), so packs are
  downloaded by the owner by hand, not by scripts or CI.

**If CraftPix is adopted later:** commit its PNGs only while the repo is private, under
`apps/jouster-ui/public/game-assets/craftpix/` (or a private submodule) with a `LICENSE-NOTE.md` per pack; purge
them from git history before the repo is ever made public; keep them out of AI tools; and credit them in
`CREDITS.md`. Its 32×32 packs match our real pixel density with no scaling.

**LPC: what the license requires (CC-BY-SA 3.0):**

- **Attribution:** credit every author of every file used (LPC files often have several authors). `CREDITS.md`
  lists file, authors, license and source URL; the in-game title screen links to it. Sources that ship credit
  files (the character generator's credits export, OpenGameArt `CREDITS` text) are copied as-is.
- **Share-alike:** any edited or recoloured PNG we commit is also CC-BY-SA 3.0 and is marked so in `CREDITS.md`.
  This applies to the art only; the game code keeps its own license (the art is used as separate files, not
  merged into code).
- **No other limits:** no AI clause, no login, no redistribution ban, so downloads can be scripted and the repo can
  go public again without purging history.

**LPC sources to use (coverage to confirm in the spike):**

| Source | Use |
| --- | --- |
| **LPC base assets** (original 2012 contest set) and **LPC Tile Atlas / Tile Atlas 2** (OpenGameArt compilations with credits) | Grass, dirt, water, trees, rocks, mountains/cliffs, houses, castle walls, fences, dungeon/cave floors and walls, torches |
| **Universal LPC Spritesheet Character Generator** (layered bodies, armour, weapons; exports a credits list) | The 6 hero classes, 3 companions and town NPCs |
| **LPC monster sets** on OpenGameArt (slime, bat, snake, bee, ghost, eyeball, worms, plant, and others) | Field and cave monsters; wolves, goblins, skeletons and dragons to be found or kept procedural |

**LPC fit:**

- **Pixel density:** our logical grid is 16 units per tile drawn at 2× (32 real pixels), so LPC 32×32 tiles map
  **1:1 with no scaling**. Colour depth is no constraint: the canvas is full 24-bit colour.
- **Characters:** 64×64 frames with 4-direction walk cycles (9 frames) plus slash, thrust, spellcast, shoot and
  hurt animations. The body is about 1 tile wide and 1.5 tiles tall, drawn bottom-aligned so it overlaps the tile
  above (the y-sorted sprite pass already supports this). The battle scene uses the left-facing attack and cast
  rows as real attack poses instead of our 2-frame placeholders.
- **Monsters:** sheet sprites, drawn at 2× in battle; look variants come from palette swaps at load time
  (share-alike applies only if recoloured PNGs are committed).
- **Rules to keep:** ≥ 3 variants for solid landscape tiles (seamless walls), signs and weather stay procedural or
  are hand-made, and sign/NPC placement still reads clearly against the busier LPC art (screenshot review).

**Larger view:** decided; see 16.6 (960×540 native canvas, 30×17 tiles, LPC art drawn 1:1).

**Kenney packs (secondary, for gaps):**

| Pack | Use | Size |
| --- | --- | --- |
| **Tiny Town** | Overworld and town tiles: grass, trees, water, paths, houses, walls, fences, signs | 16×16 |
| **Tiny Dungeon** | Cave tiles, torches, and heroes/monsters (knight, wizard, slime, goblin, etc.) | 16×16 |
| **Roguelike RPG / Roguelike Characters** | Extra terrain variants and NPC outfits if Tiny packs fall short | 16×16 |

**Kenney fit:** all packs are 16×16, our logical grid; they are scaled 2× (nearest-neighbour) to our real pixel
density, which looks chunkier than LPC, so Kenney is used only where its tiles don't sit next to LPC art in the
same scene. The Tiny series shares one style, so tiles, characters and monsters match.
Tiny packs have single-frame, mostly front-facing characters, so walk cycles (4 directions × 2 frames) are made by
flipping plus a 1px bob, or the procedural characters are kept; monster look variants come from palette swaps of
the sheet sprite at load time.

**What the swap takes:**

1. **Asset pipeline:** PNG sheets under `apps/jouster-ui/public/game-assets/lpc/` (and `.../kenney/` for gaps;
   already served by the `public` assets glob), plus a typed manifest in `@jouster/game/quest` mapping our ids (`grass`, `wall` variants,
   `warrior` facing/frame, `slime` variants, sign kinds) to sheet + cell.
2. **Loading:** a small async loader (Image → canvas) and a **loading screen** before the title, because the
   current `Art` is synchronous. The loader resolves to an `Art` that reads from sheets.
3. **Hybrid `Art`:** each lookup tries LPC, then Kenney, then the procedural drawer, so the switch can
   be done one category at a time (tiles → characters → monsters → UI) and node tests keep working without
   images.
4. **Fit to our rules:** packs must cover ≥ 3 variants for solid landscape tiles (seamless walls), 4-direction ×
   2-frame walk cycles for 6 classes plus NPCs, and recolourable monsters for look variants. Gaps (side-view
   battle poses, signs, weather) stay procedural or are hand-edited in Aseprite/LibreSprite.
5. **Style check:** packs mixed from different artists clash; pick one family per category and do a screenshot
   review before committing.
6. **Credits and tests:** add `CREDITS.md` (per file: authors, license, URL; LPC credits are required, Kenney's
   are given although not required); a test that every committed asset file has a `CREDITS.md` entry; tests that every manifest entry points inside its sheet and every tile/monster/class id has art (sheet or procedural).

**Effort estimate:** loader, manifest and hybrid `Art` ~1–2 days; tiles ~1–2 days; characters/NPCs with the
generator ~2 days (taller 64×64 sprites need draw-offset and battle-pose work); monsters with variants ~2 days;
credits and screenshots ~1 day. Roughly **1.5–2 weeks**, done incrementally; the larger view (16.6) adds
~3–5 days.

**First step (proposed):** download the LPC base assets / Tile Atlas (no login needed, so this can be scripted)
and record their credits, then a spike swaps only the overworld and town tiles behind an
`?art=classic|lpc|kenney` toggle, so the looks can be compared in the browser before converting characters and
monsters.

**Spike, as built (tiles only):**

- `public/game-assets/lpc/` holds the unmodified LPC Tile Atlas (`terrain_atlas.png`, `base_out_atlas.png`, the
  original `Attribution.txt`) and a `CREDITS.md` (authors, CC-BY-SA 3.0 / GPL 3.0, source URL).
- `art/lpc-manifest.ts` maps tile ids to 32 px sheet cells (2 or 3 look-alike ground cells each, chosen by
  `groundVariant(x, y)`; water cycles cells to animate). Objects (trees, mountains, towns, cave mouths, torches,
  bridges, fountains) are still our procedural art, drawn over the sheet ground.
- Loading is **non-blocking** instead of a loading screen: `?art=lpc` starts the game with procedural art and
  swaps tiles in once both sheets load (`loadLpcSheets` + `Art.useSheets`); a failed load keeps procedural art.
- `?art=kenney` is not offered (Kenney packs are not downloaded). After the owner's review LPC became the
  default (`?art=classic` opts out, see 16.7); tests cover cell bounds, credits for every sheet, the loader and the style switch.

### 16.3 Keep the jouster-ui control list in sync

**Problem:** the controls list on the `/jouster-quest` page is hand-written HTML, so new keys can be forgotten
(today `Backspace` = back is bound but not listed).

**Plan:**

- Export a `CONTROLS` list from the game libs (`{ keys: ['I'], action: 'items', label: 'items' }`) next to
  `KEY_BINDINGS`, and render the page's list from it with `@for`, so there is one source of truth.
- Add `Backspace` to the "go back" row.
- **Tests:** every bound `InputAction` appears in `CONTROLS`, every key in `CONTROLS` is actually bound, and the
  page renders one row per entry. A new key without a list entry fails CI.
- **Process:** any revision that adds or changes a key updates `CONTROLS` and section 3 "Input" in the same
  commit (added to the work breakdown checklist below).
- **Toggle keys (implemented):** the key that opens a screen closes it again: `I` (items) and `E` (equipment)
  close the field menu from any submenu, `M` closes the map. `X` / `Esc` open the menu and still step back one
  level at a time (closing it from the main menu). On a status page `E` keeps its meaning (equip that member).

### 16.5 Option: isometric view (evaluated, not committed to)

**Question:** switch the world view from top-down to isometric (diamond tiles), using isometric asset packs.

**What stays the same:** maps, collision, movement, encounters, fog *data*, weather *data* and saves all use grid
coordinates, so the game logic is unchanged. Battles (side view), menus, shops and the title screen are
unaffected.

**What changes:**

| Area | Work |
| --- | --- |
| Projection | World renderer maps grid (x, y) to screen ((x − y)·w/2, (x + y)·h/2); camera follows the projected leader |
| Depth sorting | Tall tiles (trees, walls, mountains, signs) are sorted together with characters by (x + y) so the party can walk behind buildings; today tiles draw first, then sprites |
| Controls | Arrow keys point along diamond diagonals on screen; either rotate input 45° (up = north-east) or accept "screen-diagonal" movement; needs play-testing |
| Fog, weather, signs, map overlay, quest pins | Redrawn in diamond shape / projected positions; world map overlay can stay top-down |
| Viewport | 384×216 shows fewer iso tiles; sight radius (sunny 8) and camera need retuning |
| Art | Every tile and character needs an isometric version with 4 diagonal facings; the procedural top-down art cannot be reused, so there is no fallback per tile |
| Tests | Projection round-trip, depth-order and input-mapping tests; scene tests mostly unchanged |

**Style risk (main concern):** Kenney's isometric packs are mostly smooth 3D-rendered art, not pixel art, which
moves away from the 16–32-bit Dragon Warrior / Zelda look in section 1 and toward a Final Fantasy Tactics feel.
Pixel-art CC0 isometric sets exist (e.g. Screaming Brain Studios on OpenGameArt) but their coverage of towns,
caves, characters and monsters must be checked first.

**Effort:** ~2–3 weeks (vs ~1.5–2 for the top-down LPC swap), mostly in rendering, depth sorting and art.

**Decision (2026-11-13):** stay top-down for now (faster to build); isometric may be revisited later. Do the
top-down LPC tile spike first; then, if wanted, a **one-map isometric
prototype** (Aldmere only, behind `?view=iso`) so both looks can be compared in the browser before committing.

### 16.6 Modern widescreen view at native resolution (implemented)

**Goal:** a larger, modern 16:9 view that shows more of the world, with art drawn at its real resolution (no
upscaled 16×16 pixels), while keeping crisp pixel art.

**Today:** 384×216 logical layout at 2× density = 768×432 canvas, 24×13.5 tiles of 32 real pixels. CSS stretches
it to 1152px wide, a **1.5× non-integer** scale that makes some pixels wider than others.

**Options considered:**

| Canvas | Tiles visible (32×32) | Integer scales | Notes |
| --- | --- | --- | --- |
| 768×432 (today) | 24×13.5 | 2.5× to 1080p (not integer) | Smallest view |
| **960×540 (chosen)** | **30×17** | **2× = 1920×1080, 4× = 3840×2160** | ~56% more world on screen; standard 16:9; LPC art 1:1 |
| 1280×720 | 40×22.5 | 1.5× to 1080p (not integer), 3× = 4K | Very wide view; characters look small; towns would need to be ~2× bigger |
| 1920×1080 with 64×64 tiles | 30×17 | 1× | Needs 64px art (LPC would be upscaled 2× again); far fewer pixel-art packs |

**Decision:** **960×540 canvas** (480×270 logical units at 2× density, so the existing layout code, `TILE = 16`
logical units and the renderer's density handling stay as they are). LPC 32×32 tiles and 64×64 characters are
drawn **1:1, never upscaled**; the full canvas is 24-bit colour, so there is no palette limit beyond the art's
own style.

**Display scaling (suggested):**

- The page shows the canvas at the **largest integer scale that fits** (1× = 960 px wide in the normal page;
  2× = 1920×1080 full screen), letterboxed in black, so pixels stay square and even.
- Add a **full-screen toggle** (`F` key and a page button; Fullscreen API) to get the 2× / 4× sizes on big
  monitors. On screens narrower than 960 px it falls back to fit-to-width (non-integer, acceptable on phones).
- Keep `image-rendering: pixelated`.

**What changes:**

| Area | Work |
| --- | --- |
| Screen constants | `SCREEN_W/H` 384×216 → 480×270 in `ui/widgets.ts`; canvas `width/height` 960×540 in the page; page and canvas tests updated |
| HUD and menus | Replace hard-coded positions/heights (title screen y values, class select window 184, menu window 200, map overlay `MAP_AREA_W` 216, battle panel widths, gold/sky boxes) with values derived from `SCREEN_W/H`, so a future size change is one edit |
| Battle scene | Wider field: spread heroes and up to 4 monsters further apart; LPC heroes use their side-facing attack/cast rows at 1:1; monsters drawn at their native size (larger sheet art where available) rather than scaled up |
| Small maps | Aldmere 24×18, Brookhollow 22×15, Goblin Cave 28×20 and the Den 20×14 are narrower than 30 tiles. Camera centres maps smaller than the view, and the area outside is filled: towns get a 4–6 tile decorative border (fields, forest, river) added to their maps; caves show solid rock / darkness |
| Fog and weather | Sight radius stays sunny 8 (17-tile circle; the wider view shows fog at the left/right edges, which suits exploring); revisit after play-testing. Cloud and particle spans already scale with `SCREEN_W/H` |
| Text | The bitmap font is drawn at logical size, so it shrinks ~20% relative to the window. Option: a crisper 2×-density font (finer glyphs, same layout size) if readability suffers |
| Controls list | Add `F` = full screen to `CONTROLS` (16.3) |

**Tests:** canvas is 960×540; every scene renders within `SCREEN_W/H` (no window drawn off-screen); camera
centring for maps smaller than the view; town border tiles are not walkable and don't trigger encounters.

**Effort:** constants and layout ~1–2 days; battle relayout ~1 day; town borders and camera centring ~1 day;
integer scaling and full screen ~0.5 day. Roughly **3–5 days**. Doing it **before** the LPC character work
avoids laying out sprites twice.

**As built:**

- `SCREEN_W/H` = 480×270 logical (960×540 canvas); scene layouts (title, class select, menus, shop, map
  overlay, battle panels and field) are derived from these constants, and text widths use `charsFit(width)`.
- **Small maps:** instead of adding border tiles to the town and cave maps, the camera (`cameraAxis`) centres
  and freezes any axis where the map is no bigger than the view; the off-map area already draws the map's
  outside tile (forest around towns, rock in caves), which reads as a natural border. Map data is unchanged.
- **Scaling:** the page shows the canvas at 1× (960 px; fit-to-width on narrower screens). Full screen
  (`F` or the page button, Fullscreen API) scales to the largest integer that fits (2× at 1080p), with black
  letterboxing. `F` is ignored while typing a name, and is listed in `CONTROLS`.
- Text kept at its logical size (crisp at 1×); a 2×-density font was not needed.

### 16.4 Work breakdown

1. Plan update (this section) — done first, before any code.
2. Controls single source of truth and sync tests (16.3) — smallest, do first. Done.
3. Companion level 1 / party-only XP, save v4 migration and simulator checks (16.1) — done (join bonus used).
3b. Widescreen 960×540 (16.6): constants, layout derived from screen size, integer scaling and full screen,
   camera centring for small maps; screenshots of every scene reviewed. Done.
4. Art spike (16.2): add LPC base / Tile Atlas sheets and `CREDITS.md`; swap tiles behind an `?art=` toggle
   (LPC → Kenney → procedural fallback); owner reviews screenshots before characters (character generator) and
   monsters are converted, and decides on the optional 480×270 viewport. Tile spike done behind `?art=lpc`
   (non-blocking load, no Kenney yet); reviewed and approved by the owner.
4b. LPC characters and monsters (16.7): build script, generated sheets and layout, credits, sprite anchoring,
   LPC as default. Done.
4b2. HD procedural art (16.8): original art redrawn natively at 2? density. Done.
4c. Next: LPC objects (trees, mountains, town and cave markers), art for wolf / alpha wolf / giant toad,
   attack and cast animations from the ULPC slash / spellcast rows, animated slime and bat frames.
5. Optional (16.5): one-map isometric prototype behind `?view=iso`, only if the owner asks after the LPC
   spike review.
6. Verify: unit, balance and scene tests, lint, browser screenshots; push to PR #184.

### 16.7 LPC phase 2: characters and monsters (implemented)

- **Build script:** `tools/game-assets/build-lpc-sprites.py` downloads layers from the Universal LPC Spritesheet
  Generator (ULPC) and LPC Base Assets (cached in `tmp/lpc-cache`), composites one recipe per look (body, head,
  hair, clothes, armour, weapon), and writes:
  - `public/game-assets/lpc/characters.png`: 64?64 cells; one row per look (6 classes + 12 NPC looks), columns =
    4 facings ? 2 walk steps; then rows for the humanoid monsters (goblin ?3, skeleton ?3, Goblin King, goblin
    chief, bone captain) in a single left-facing frame.
  - `public/game-assets/lpc/monsters.png`: 32 px cells for slime ?6 and bat ?3 (LPC Base Assets, hue-shifted
    per variant), facing left.
  - `art/lpc-sprites.generated.ts` (layout constants) and a generated section of `CREDITS.md` that lists every
    layer's authors and licences (CC0, CC-BY, OGA-BY, CC-BY-SA, GPL); the composited sheets are CC-BY-SA 3.0.
  - Bow walk art exists only as ULPC `walk_128` custom animations; the script centre-crops those to 64 px.
    Missing layers are skipped rather than failing the build.
- **Sizes:** an LPC frame is 64 px drawn at density 2, i.e. 32?32 logical (a figure ~24 px tall on a 16 px
  tile). `tileAnchor(img)` centres a sprite on its tile with the feet on the tile's bottom edge;
  `fitScale(img, box)` scales any sprite into a battle or portrait box, so procedural 16 px and LPC 32 px art
  share the same call sites. `left` is a real frame (LPC) or a mirrored copy (procedural); scenes no longer flip.
- **Monsters face left** because the party stands on the left in battle. Variants keep their stats; only art
  changes. Wolf, alpha wolf and giant toad have no suitable LPC art yet and stay procedural.
- **Default art:** LPC is the default; `?art=classic` keeps the original procedural art. Sheets still load
  non-blockingly, with procedural fallback if a sheet fails.
- **Known limitation:** ULPC has no child hair, so the child NPC is bald.
- **Tests:** every humanoid look has a row, every converted monster has all of its variants (and no extra ones),
  every cell is inside the shipped PNGs, credits list the sheets, anchor / fit helpers, sheet vs procedural
  fallback, and the `?art=` switch.

### 16.8 HD procedural art at LPC density (implemented)

Goal: the original procedural art should be as pixel dense and detailed as the LPC art, instead of 16 px art
upscaled by EPX.

- **Toolkit:** `art/hd-paint.ts` is a small pure raster painter (`Paint`): shapes (ellipse, box, polygon,
  segment, union / cut / clip), shaded fills with a light direction, sphere shading, rim shade, ordered dither and
  value noise, plus `outline()` (dark, hue-matched selective outline) and `mirror()`. `tone(colour, k)` builds
  hue-shifted ramps: shadows shift cooler, highlights warmer, like hand-made pixel art.
- **Tiles** (`art/hd-tiles.ts`): every tile is painted natively at 32?32 real pixels (density 2) with
  3?5 shade ramps, texture noise and per-variant detail; water and lava keep their animation frames.
  Objects (trees, rocks, signs, markers) are separate layers with outlines, so LPC mode can draw them over
  LPC ground (`paintTile(id, frame, variant, false)`).
- **Characters** (`art/hd-characters.ts`): humanoids are 64?64 real cells (32 logical, feet on the bottom
  edge), the same frame size as LPC, so `tileAnchor` / `fitScale` need no special cases. Faces, hair, helmets,
  robes, armour and weapons are layered; `left` is the mirrored `right` frame. Monsters (slime shapes, bat, wolf,
  giant toad, skeleton, goblins, Goblin King) use 64?64 cells facing left; variants keep their colours.
  Shop signs are 32?32 real.
- **Modes:** `?art=classic` uses only the HD procedural art. LPC mode uses LPC sheets plus the HD art for
  object overlays, monsters without LPC art (wolf, alpha wolf, giant toad, bone captain) and shop signs.
- **Walls vs floors:** town floors must read apart from walls at a glance. Floors are warm (classic sandstone cobble; LPC taupe flagstones instead of the grey cobble), walls stay cool grey brick, and every wall / cave-rock tile (`SHADOW_CASTERS`) drops a soft shadow onto the tile below it. Further options if more contrast is needed: a lit top cap on walls, a 3/4 front face where a wall meets floor, or darker wall tops.
- **Unchanged:** battle backdrop, UI, colours, variants and animation frame counts. The engine's EPX
  helpers stay (tested there) but quest no longer uses them.
- **Tests:** paint primitives (shapes, outline, mirror, tone ramps), every tile id paints at 32?32 with opaque
  ground, objects-only layers are transparent around the object, every look / facing / frame paints a 64?64
  figure standing on the bottom edge, every monster shape and sign paints and is distinct.

### 16.9 Mouse and touch controls (implemented)

Goal: the game is fully playable with a mouse, or on a phone or tablet with no keyboard. Keyboard controls are
unchanged and everything below is in addition to them.

- **Engine:** `InputManager` has a pointer API (`pointerDown` / `pointerMove` / `pointerUp`, read through
  `tap`, `pointer`, `pointerMovedThisFrame` and `pointerPresses`) and virtual presses (`press` / `release`) for
  buttons that are not keys. A tap fires when the pointer goes down (more responsive than waiting for release)
  and lasts one frame, so a tap that opens a scene is not also seen by the new scene. `firstStepToward()` is a
  small breadth-first path search that returns the next step towards a goal.
- **Canvas:** the game maps pointer events from page pixels to the 480x270 logical screen
  (`clientToLogical`, which follows the canvas's displayed size, including full screen). Left button / touch is
  the pointer, right-click is cancel (menu / back), the wheel scrolls lists. The canvas has
  `touch-action: none` so drags do not scroll or zoom the page.
- **World:** clicking or tapping a tile walks the party there along the shortest explored, unblocked path
  (warps are only entered if they are the target). Tapping a person, sign or shop counter walks up to it, turns
  to face it and talks or reads; tapping the hero checks the tile in front, like confirm. Holding and dragging
  steers. Gold corner marks show the target. Any direction key, a warp, an event or a battle cancels the walk.
- **Menus:** tapping a row picks it; mouse hover moves the cursor; tapping the top or bottom edge of a scrolled
  list scrolls it. Tapping a message shows the rest of the page, then goes on. In the field menu, tapping the
  main list while a sub-list is open jumps to the tapped entry. Status pages and the world map close on a tap.
- **Battle:** tap a command; tap a monster sprite or an ally's status row to target it. Tapping skips the intro
  and speeds up messages; holding the button fast-forwards like holding confirm. A tap on the result screen
  continues.
- **Name entry:** an on-screen keyboard (A-Z, `-`, `'`, space, delete, BACK and OK) below the name box. Typing
  still works; direction keys do not drive the grid because WASD types letters there.
- **Touch pad (page):** on phones and tablets (coarse pointer and no fine pointer) the page shows a D-pad, A
  (confirm), B (menu / back) and ITEMS, EQUIP, MAP and MUTE buttons; a button under the game shows or hides them
  on any device. Each button sends the matching key to the canvas as a real keyboard event, so the game needs no
  special case; direction buttons repeat while held. Shortcut buttons send `key: 'Unidentified'` so they never
  type letters on the name screen. Buttons prevent the default pointer action so the canvas keeps focus (losing
  focus releases every held key). In full screen the pad floats over the bottom of the screen.
- **Controls list:** `POINTER_CONTROLS` (gestures) and `TOUCH_BUTTONS` (pad buttons) in `ui/controls.ts` are the
  single source of truth for the page's "Mouse and touch" list and pad; tests check that every touch button
  sends a bound key and that together they cover every game action.
- **Tests:** pointer taps and virtual presses, the path search, page-to-screen mapping, menu tap / hover /
  scroll, message taps, tap-to-walk, walking up to an NPC to talk, keys cancelling a walk, tapping the hero, the
  name keyboard layout and typing, and the page's pad (key events, repeat, focus) and lists.
- **Possible follow-ups:** swipe gestures for single steps, a long-press for the field menu, haptics
  (`navigator.vibrate`) on hits, and a saved pad size / position setting.
