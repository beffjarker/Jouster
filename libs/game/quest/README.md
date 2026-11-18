# game-quest (`@jouster/game/quest`)

Content and scenes for **Jouster Quest**, a top-down retro RPG hosted at `/jouster-quest` in `jouster-ui`.

- `data/` — classes, abilities, equipment, monsters, encounter tables, randomly rolled companions (never the hero's class), seeded 96x72 overworld generator, maps (all balance numbers live here)
- `art/` — original procedural pixel art, upscaled to 32x32 per tile at 2x density (no third-party assets)
- `scenes/` — title, name entry, world, battle, menus
- `state/` — party, save/load (versioned JSON in `localStorage`, including volume settings), gear bag and loot rolls
- `balance/` — seeded battle simulator that enforces class balance targets, plus a loot mode and drop-economy check
- `JousterQuestGame` — entry point: `new JousterQuestGame(canvas, { keySource, onSceneChange, onViewChange }).start()`;
  the host mirrors the top scene id and its sub-view (e.g. a shop's `sell` list) onto the canvas as `data-scene` /
  `data-view` for e2e tests

## Gear and loot

- Shop gear is **common** and goes into a 40-slot gear bag; equip it from the EQUIP menu, which shows the worn item's
  stats next to the one you are looking at.
- Monsters can drop weapons, armor, shields and accessories in five rarities (common, uncommon, rare, epic,
  legendary), each with random stat bonuses. With a full bag you choose what to drop: a bag item or the new one.
- Shops buy items and gear back through **SELL** for half their value; drops are priced low so they top up fight
  gold rather than replace it.

## Commands

```bash
npx nx test game-quest   # includes balance simulator and headless scene-flow tests
npx nx lint game-quest
```

Design notes: `docs/JOUSTER-QUEST-GAME-PLAN.md`.
