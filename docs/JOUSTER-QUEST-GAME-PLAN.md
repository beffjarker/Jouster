# Jouster Quest — Game Plan

> **Status:** Act I vertical slice implemented (see [Implementation status](#12-implementation-status-act-i-slice));
> play-test revision 2 implemented (see [Revision 2](#13-revision-2-play-test-feedback)); revision 3 planned
> (see [Revision 3](#14-revision-3-exploration-pacing-widescreen-and-battle-presentation))
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
| Resolution | **Widescreen 16:9** (revision 3): logical 384×216 layout rendered at 2× pixel density (768×432 backing canvas), integer-scaled with `image-rendering: pixelated`. Revision 2 used 256×240 (512×480) |
| Tile size | 16×16 logical grid; tiles, characters and monsters are drawn with 32×32 pixels of detail |
| Maps | Authored in [Tiled](https://www.mapeditor.org/), exported as JSON |
| Save data | `localStorage` (versioned JSON schema) |
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
| **Scene manager** | Stack of scenes: Title, ClassSelect, Overworld, Town, Dungeon, Battle, Menu, Dialogue, GameOver |
| **Input** | Arrows/WASD move; Z/Enter confirm; X/Esc cancel; Space opens the menu; optional Gamepad API |
| **Tilemap** | Layers: ground, decoration, collision, encounter zones, warps, NPC spawns |
| **Movement** | 4-direction, grid-locked, smooth movement between tiles, 2-frame walk cycle |
| **Camera** | Follows the player and clamps to map bounds |
| **Dialogue** | Typewriter text box, portraits (optional), yes/no prompts, sets and reads story flags |
| **Encounters** | Step counter in danger tiles; per-region rate (default ~1/16 per step); towns are safe |
| **Battle** | Turn-based combat (section 5) |
| **Inventory/Equipment** | Weapon, armor, shield, and accessory slots; consumables; key items; gold |
| **Progression** | XP curve, level-ups, per-class stat growth, spells learned by level |
| **Save/Load** | Save at inns or the church; 3 save slots; schema version for migrations |
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
  a Cleric keep fighting without resting at the inn after every few fights.
- **Protect** (2 MP): +50% DEF for 3 turns. Strong against bosses.
- **Expected difference:** fights last about 1.5–2× longer than for a Warrior. The Cleric uses more MP but fewer
  potions.

### 4.5 Help for solo play (before the first companion)

- In the Prologue and Act I, random encounters have **at most 2 enemies** until the first companion joins.
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

If a class misses a target, tune its numbers in `game-content` (growth curve, weapon stats, skill costs) instead
of changing the engine.

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
- Party members follow the leader on the overworld in a snake-style trail.

---

## 5. Battle System

- **Transition:** a screen flash or wipe leads to the battle scene: backdrop by region, 1–4 enemies, and party
  status windows.
- **Presentation (revision 3):** side-view layout with the party on the left and enemies on the right, every
  action animated (see 14.4).
- **Commands:** Attack · Magic · Skill · Item · Defend · Run
- **Attack** is available to every class and always uses the equipped melee weapon. It costs no MP and has no
  cooldown, so no class is left without a damage option when it runs out of MP.
- **Turn order:** sort by `AGI + random(0..AGI/4)` each round; the player picks commands for all members, then
  the round resolves.
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

The ancient dragon **Vharzul** wakes beneath the Ember Mountains and burns the border village of Thornwick. The
King of **Aldmere** calls on a lone hero to find the three **Dragon Seals** and forge **Dragonbane**, the only
weapon that can end the dragon's reign.

### Acts

| Act | Region | Enemies | Key events |
| --- | --- | --- | --- |
| **Prologue** | Aldmere Castle & Thornwick | Tutorial slimes | Class select; the King's quest; Thornwick in ashes |
| **Act I** | Greenwood | Slime, Wolf, Goblin, Giant Bat | Recruit companion #1; clear the Goblin Cave; boss: **Goblin King** |
| **Act II** | Sunscar Desert & Mirewood Marsh | Scorpion, Sand Worm, Lizardman, Wraith | Two Dragon Seals from shrines; bosses: **Sand Wyrm**, **Marsh Witch** |
| **Act III** | Frost Peaks | Ice Troll, Wyvern, Yeti, Frost Mage | Recruit companion #2; third seal; forge Dragonbane; boss: **Wyvern Matriarch** |
| **Finale** | Ember Mountains (volcano lair) | Fire Drake, Magma Golem, Dragon Cultist | Two-phase final boss: **Vharzul the Ashen** |

### Content scope (target)

- 3 towns (Aldmere, Sandhollow, Frostgate) plus the ruins of Thornwick
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
- **Tools:** Aseprite or LibreSprite for sprites; Tiled for maps.
- **Placeholders:** CC0 assets (for example from OpenGameArt or Kenney) until custom art is ready; track licenses
  in `CREDITS.md`.
- **Audio:** procedural chiptune SFX with Web Audio; optional looping tracks per region and battle.

---

## 8. Phased Roadmap

| Phase | Goal | Deliverables |
| --- | --- | --- |
| **1. Foundation** | Engine skeleton | Nx libs, `/game` route, canvas scaling, game loop, input, one test map with collision |
| **2. Overworld** | Exploration | Tiled map loader, grid movement, camera, warps, a town, NPC dialogue |
| **3. Characters** | Class select | Class data, title screen, class-select screen, stats model |
| **4. Battle** | Core combat | Encounter rolls, battle scene, turn system, enemy AI, XP and level-ups, defeat handling |
| **5. Party & Economy** | RPG depth | Recruiting, party menu, inventory, equipment, shops, inns, save/load |
| **6. Act I slice** | Playable vertical slice | Prologue and Act I content through the Goblin King |
| **7. Acts II–Finale** | Full story | Remaining regions, dungeons, bosses, ending |
| **8. Polish** | Feel & quality | Transitions, SFX/music, balancing pass, accessibility, mobile touch controls (stretch) |

**Milestone gate:** Phase 6 (Act I slice) must be fun and stable before Phase 7 starts.

---

## 9. Testing Strategy

- **Unit (Jest, `libs/game-engine`, `libs/game-content`):** damage formula, turn order, encounter-rate RNG
  (with a seeded RNG), XP curve and level-ups, inventory and equipment, save-schema migration, content validation
  (every monster or item referenced by a map exists).
- **Balance (Jest, `libs/game-content`):** a seeded battle simulator runs each class alone and in a full party
  through the encounters in section 4.6, then fails if any target is missed. It also checks that every class's
  level 1 stats add up to 36 points and that every class has a melee basic Attack.
- **E2E (Cypress, `apps/jouster-ui-e2e`):** smoke test: load `/game` → pick a class → move → trigger a seeded
  encounter → win a battle → save → reload.
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
6. **Screen:** 16:9 widescreen (384×216 logical, 768×432 canvas).

---

## 12. Implementation status (Act I slice)

| Area | Implemented |
| --- | --- |
| Engine | Seeded RNG, fixed-step loop, keyboard input, scene stack with fades, renderer + 5×7 pixel font, tilemap, Web Audio SFX |
| Rules | Battle (turn order, attack/ability/item/defend/run, elements, status, crits), XP curve, encounters with grace steps |
| Classes | Warrior, Paladin, Cleric, Wizard, Rogue, Ranger — equal stat budget, every class has a melee Attack |
| World | Greenwood Vale overworld, Aldmere (castle, inn, chapel, shops, tavern), Thornwick ruins, Goblin Cave |
| Companions | Bren (Warrior, Aldmere tavern), Sera (Cleric, Thornwick ruins), Ilya (Wizard, Goblin Cave — after the Goblin King) |
| Story | King's quest → Goblin King boss → epilogue teasing **Vyrmorth**; the world stays open afterwards |
| Economy | Gold, item shop, weapon shop with trade-in, inn (heal + save), chapel (revive + save) |
| Saves | Versioned JSON in `localStorage` with validation |
| Tests | Engine unit tests, content validation, seeded balance simulator, headless scene-flow tests, Angular page spec |

**Deviations from the plan**

- The dragon is named **Vyrmorth** (the plan's draft name was Vharzul).
- Maps are authored as character grids in TypeScript instead of Tiled JSON (small maps, no extra tooling).
- Field menu opens with X/Esc (not Space); Space is an extra confirm key.
- Keyboard input is only read while the game canvas has focus.
- Full parties may beat the trio balance targets slightly; solo and duo targets are enforced by the simulator.
- Armor/shield/accessory slots, status-curing at the chapel, and music loops are deferred to later phases.

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
- **UI:** windows get a dark-blue vertical gradient fill; text stays the chunky bitmap font for readability.
- Everything is still original, procedurally drawn pixel art (no third-party files).

### 13.4 Difficulty and progression

| Change | Before | After |
| --- | --- | --- |
| XP to next level | `floor(8 × L^1.5)` | `floor(11 × L^1.5)` (about 38% more XP per level) |
| Slime (HP / ATK) | 8 / 7 | 10 / 8 |
| Giant Bat | 10 / 8 | 12 / 9 |
| Grey Wolf | 14 / 10 | 16 / 11 |
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
| Sight radius | **Tunable constant, default 4 tiles** (circle). Planned to try 3, 4 and 5 in play-testing; dungeons use radius − 1 (darker inside) |
| Reveal | Each step marks every tile within the radius as explored. Explored tiles stay visible permanently |
| Look | Unexplored tiles are solid fog with a soft 1-tile dithered edge; explored tiles outside the current radius are drawn slightly dimmed so the "live" area reads clearly |
| Line of sight | Not in the first pass (a plain radius). Possible later: mountains/forest block sight, hills extend it |
| Encounters/NPCs | Monsters and NPCs inside fog are not drawn |
| Save | One bitset per map (1 bit per tile; 96×72 = 864 bytes), stored base64 in the save. Save version → 3; older saves start with only the area around the party revealed instead of being discarded |

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

| Spot | Side quest (first pass) | Reward besides the companion |
| --- | --- | --- |
| Aldmere tavern | **Lost heirloom:** recover a ring from a wolf den in the eastern hills (a new small cave; mini-boss Alpha Wolf) | 50 G |
| Brookhollow | **Poisoned well:** bring a Moonpetal from the southern lakeshore, guarded by a Giant Toad | Antidote ×3 |
| Thornwick ruins | **Restless dead:** defeat the Bone Captain haunting the ruins at night (talk to them after resting at an inn) | Iron charm (accessory, later) |
| Goblin Cave | **Captive:** the companion is locked in the cave's lower cells; find the cell key on a goblin chieftain remnant deeper in the cave | Key opens a side treasure room |

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

### 14.5 Work breakdown

1. Plan update (this section).
2. Widescreen: constants, canvas/CSS, re-layout of all scenes, page spec; screenshot every screen.
3. Fog of war: explored bitsets, reveal on step, fog rendering, save v3 migration, tests.
4. World map overlay on `M` plus field-menu entry, markers, controls text.
5. Companion pacing: recruit lock until the boss, quest state, quest log, four side quests (new small cave,
   lakeshore area, night event at Thornwick, lower cells in the Goblin Cave), mini-bosses, simulator checks.
6. Battle presentation: side-view layout, battle poses, animation timeline, effects, speed option, tests.
7. Verify: unit, balance and scene tests, lint, production build, browser screenshots; push to the open PR.

**Assumptions to confirm in play-testing:** sight radius 4 (try 3–5), explored-but-out-of-sight tiles dimmed
rather than re-fogged, towns never fogged, one side quest per companion.
