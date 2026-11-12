# Jouster Quest — Game Plan

> **Status:** Act I vertical slice implemented (see [Implementation status](#12-implementation-status-act-i-slice))
> **Genre:** Top-down 2D fantasy RPG, inspired by NES *Dragon Warrior* and *The Legend of Zelda*
> **Platform:** Browser (HTML5 Canvas), hosted in the `jouster-ui` Angular app at `/jouster-quest`

---

## 1. Vision

A small single-player, top-down RPG with 16–32-bit-style pixel art. The player explores an overworld, visits
friendly towns, and fights turn-based battles against monsters and dragons. Outside towns, each step has a small
chance of a random encounter. At the start, the player picks a character class and can later recruit up to two
companions, for a party of three, all controlled by the player.

---

## 2. Tech Approach

| Concern | Decision |
| --- | --- |
| Language | TypeScript (strict, no `any`) |
| Rendering | HTML5 Canvas 2D; no game engine dependency |
| Resolution | Internal 256×240 (NES-like), integer-scaled with `image-rendering: pixelated` |
| Tile size | 16×16 map/character tiles; 32×32 (or larger) battle monster sprites |
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

- **Mace:** basic Attack with ATK 8 + mace 4. Kills a Slime (8 HP) in 1 hit and a Goblin (18 HP, DEF 6) in 2–3 hits.
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

If a class misses a target, tune its numbers in `game-content` (growth curve, weapon stats, skill costs) instead
of changing the engine.

### 4.7 Party

- **Class select:** at the start, the player chooses a class and enters a name.
- **Party:** the player recruits companions through the story. Maximum party size is 3, and the player controls
  every member.
- **Tavern:** in the capital, the player can swap recruited companions in and out of the active party.
- Party members follow the leader on the overworld in a snake-style trail.

---

## 5. Battle System

- **Transition:** a screen flash or wipe leads to the battle scene: backdrop by region, 1–4 enemies, and party
  status windows.
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

- **Palette:** a limited 16–32 color palette inspired by NES/SNES games, used across all assets.
- **Sprites:** 16×16 overworld characters (4 directions × 2 frames); 32×32 to 64×64 battle monsters; 8×8 font.
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
4. **Companions:** each companion has a **fixed class**. The world is **open**: companions can be met in any order
   and at any time, gated only by bosses or items (not by story order). With a full party, a new companion can be
   swapped in; the one who leaves goes back to their home spot and keeps their level.

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
