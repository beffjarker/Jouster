# game-quest (`@jouster/game/quest`)

Content and scenes for **Jouster Quest**, a top-down retro RPG hosted at `/jouster-quest` in `jouster-ui`.

- `data/` — classes, abilities, equipment, monsters, encounter tables, randomly rolled companions (never the hero's class), seeded 96x72 overworld generator, maps (all balance numbers live here)
- `art/` — original procedural pixel art, upscaled to 32x32 per tile at 2x density (no third-party assets)
- `scenes/` — title, name entry, world, battle, menus
- `state/` — party, save/load (versioned JSON in `localStorage`)
- `sim/` — seeded battle simulator that enforces class balance targets
- `JousterQuestGame` — entry point: `new JousterQuestGame(canvas, { keySource }).start()`

## Commands

```bash
npx nx test game-quest   # includes balance simulator and headless scene-flow tests
npx nx lint game-quest
```

Design notes: `docs/JOUSTER-QUEST-GAME-PLAN.md`.
