# game-quest (`@jouster/game/quest`)

Content and scenes for **Jouster Quest**, a top-down retro RPG hosted at `/jouster-quest` in `jouster-ui`.

- `data/` — classes, abilities, equipment, monsters, encounter tables, companions, maps (all balance numbers live here)
- `art/` — original procedural pixel art (no third-party assets)
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
