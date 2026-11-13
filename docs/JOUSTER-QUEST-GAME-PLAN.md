# Jouster Quest — Game Plan

> **Status:** Act I vertical slice, play-test revision 2 and revision 3 are implemented and in play-testing
> (see [Implementation status](#12-implementation-status-act-i-slice),
> [Revision 2](#13-revision-2-play-test-feedback) and
> [Revision 3](#14-revision-3-exploration-pacing-widescreen-and-battle-presentation)). Acts II–Finale are not
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
| Resolution | **Widescreen 16:9** (revision 3): logical 384×216 layout rendered at 2× pixel density (768×432 backing canvas), integer-scaled with `image-rendering: pixelated`. Revision 2 used 256×240 (512×480) |
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
| **Input** | Arrows/WASD move; Z/Enter/Space confirm; X/Esc cancel and open the field menu; M world map; N sound on/off. Planned (15.4): I opens Items, E opens Equip. Read only while the canvas has focus. Gamepad and touch are deferred |
| **Tilemap** | Ground tiles with collision, encounter terrain, warps and NPC spawns |
| **Fog of war** | Hidden overworld and dungeon tiles revealed within a radius of the party; explored tiles saved per map (14.1) |
| **World map** | `M` overlay of the current map's explored tiles, discovered places and quest hints (14.1) |
| **Quests** | Main quest plus one side quest per companion, shown in the field menu's quest log (14.2) |
| **Movement** | 4-direction, grid-locked, smooth movement between tiles, 2-frame walk cycle |
| **Camera** | Follows the player and clamps to map bounds |
| **Dialogue** | Typewriter text box, portraits (optional), yes/no prompts, sets and reads story flags |
| **Encounters** | Step counter in danger tiles; per-region rate (default ~1/16 per step); towns are safe. Each area has a level (Greenwood 2, Forest 4, Hills 5, Cave 6, Den 6); when the highest party level is more than 3 above it, the rate drops to ¼ and halves for each further level (floor 1/32 of the base) |
| **Battle** | Turn-based combat (section 5) |
| **Inventory/Equipment** | Weapon slot today (equipped by buying it); armor, shield and accessory slots with an EQUIP menu planned (15.4); consumables; key items; gold |
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
  a Cleric keep fighting without resting at the inn after every few fights.
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
- **Assets:** the first release uses only original procedural pixel art. CC0 sprite sheets (for example from
  OpenGameArt or Kenney) may replace it later through the `Art` class; any added files must be listed in
  `CREDITS.md`.
- **Audio:** procedural chiptune SFX with Web Audio; optional looping tracks per region and battle.

---

## 8. Phased Roadmap

| Phase | Goal | Deliverables | Status |
| --- | --- | --- | --- |
| **1. Foundation** | Engine skeleton | Nx libs, `/jouster-quest` route, canvas scaling, game loop, input, one test map with collision | Done |
| **2. Overworld** | Exploration | Map loader, grid movement, camera, warps, a town, NPC dialogue | Done |
| **3. Characters** | Class select | Class data, title screen, class-select screen, stats model | Done |
| **4. Battle** | Core combat | Encounter rolls, battle scene, turn system, enemy AI, XP and level-ups, defeat handling | Done |
| **5. Party & Economy** | RPG depth | Recruiting, party menu, inventory, equipment, shops, inns, save/load | Done for weapons (equipped by buying them); armor, shield and accessory slots, an EQUIP menu and `I`/`E` shortcuts are planned in 15.4 |
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
6. **Screen:** 16:9 widescreen (384×216 logical, 768×432 canvas).
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
- Armor/shield/accessory slots (now planned in 15.4), status-curing at the chapel, and music loops are deferred.

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

## 15. Revision 4 (play-test feedback, planned — not implemented yet)

Feedback from the fourth play-test. Nothing in this section is built yet; it is the agreed plan.

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
  Defaults: common monsters **45%**, mini-bosses and bosses **100%**.
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
- **Save:** version 4 adds `equipment: { weapon, armor?, shield?, accessory? }` per member; v3 saves migrate with
  the current weapon and empty other slots.
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

### 15.7 Work breakdown

1. Plan update (this section) — done first, before any code.
2. World-anchored weather (15.1) and its renderer test.
3. Gold chance and amount variance, result text, economy check (15.2).
4. Holy Strike / Smite retune and the "cost = power" balance tests (15.3).
5. Heal helper, battle target greying, heal property test (15.5).
6. Side-quest stages, dormant mini-bosses, accept/decline, victory messages, save migration (15.6).
7. Equipment slots, EQUIP menu, `I`/`E` shortcuts, armor shops, save v4 and simulator re-check (15.4) —
   the largest item, done last.
8. Verify: unit, balance and scene tests, lint, browser screenshots; push to PR #184.
