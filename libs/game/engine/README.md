# game-engine (`@jouster/game/engine`)

Framework-agnostic 2D RPG engine used by Jouster Quest. No Angular imports.

- `SeededRng`, fixed-step `GameLoop`, `InputManager` (keyboard), `SceneStack` with fades
- `Renderer` (pixel canvas + bitmap font, optional `pixelRatio` for 2x-density art), `Tilemap`, `wrapText`, Web Audio SFX
- Hi-res sprite pipeline: EPX/Scale2x upscale, edge shading and outlines (`hiResSprite`, `setImageDensity`)
- Rules: battle resolution, XP/level curve, random encounters

## Commands

```bash
npx nx test game-engine
npx nx lint game-engine
```
