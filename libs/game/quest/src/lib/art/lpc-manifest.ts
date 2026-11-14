/**
 * Liberated Pixel Cup (LPC) art manifest (plan 16.2). Maps game tile ids to 32x32 cells of the LPC Tile Atlas
 * sheets, which are drawn 1:1 (no scaling). The PNGs and their credits live in
 * `apps/jouster-ui/public/game-assets/lpc/` (CC-BY-SA 3.0; see CREDITS.md there).
 */

/** Real pixels per LPC cell. */
export const LPC_CELL = 32;

/** Sheet ids and their file names (relative to the LPC asset folder). */
export const LPC_SHEETS = {
  terrain: 'terrain_atlas.png',
  outside: 'base_out_atlas.png',
  /** Built by `tools/game-assets/build-lpc-sprites.py`; layout in `lpc-sprites.generated.ts`. */
  characters: 'characters.png',
  monsters: 'monsters.png',
} as const;

export type LpcSheetId = keyof typeof LPC_SHEETS;

/** Size in real pixels of the two tile atlases (`terrain` and `outside` are 1024x1024). */
export const LPC_SHEET_SIZE = 1024;

/** One 32x32 cell of a sheet, by column and row. */
export interface LpcCell {
  sheet: LpcSheetId;
  col: number;
  row: number;
}

/**
 * LPC art for one tile id. `ground` lists look-alike variants (picked by a per-position hash).
 * Objects on top of the ground (trees, peaks, houses, torches) are still drawn procedurally over it
 * until LPC objects are converted.
 */
export interface LpcTile {
  ground: readonly LpcCell[];
  /**
   * True when the ground itself moves (water), so its cell is cycled per animation frame. Tiles that
   * only animate an object (fountain, torch) keep one ground cell, or their floor would flicker.
   */
  animatedGround?: boolean;
}

const t = (col: number, row: number): LpcCell => ({ sheet: 'terrain', col, row });
const o = (col: number, row: number): LpcCell => ({ sheet: 'outside', col, row });

const GRASS = [t(21, 5), t(22, 5), t(23, 5)];
const WATER = [t(21, 17), t(22, 17), t(23, 17)];
const DIRT = [t(16, 3), t(16, 5), t(17, 5)];
const CAVE_FLOOR = [t(19, 3), t(19, 5), t(20, 5)];
const CAVE_ROCK = [t(30, 5), t(31, 5), t(19, 11)];
/** Warm taupe flagstones: the town floor must read apart from the cool grey brick walls. */
const FLAGSTONE = [t(17, 27), t(16, 26), t(18, 26), t(16, 28), t(18, 28)];

/** Tile ids with LPC ground art. Ids not listed keep the procedural look. */
export const LPC_TILES: ReadonlyMap<string, LpcTile> = new Map<string, LpcTile>([
  ['grass', { ground: GRASS }],
  ['townGrass', { ground: [t(21, 5), t(21, 11), t(23, 5)] }],
  ['road', { ground: DIRT }],
  ['forest', { ground: GRASS }],
  ['tree', { ground: GRASS }],
  ['hills', { ground: GRASS }],
  ['mountain', { ground: GRASS }],
  ['town', { ground: GRASS }],
  ['caveEntrance', { ground: GRASS }],
  ['ruins', { ground: GRASS }],
  ['water', { ground: WATER, animatedGround: true }],
  ['bridge', { ground: WATER, animatedGround: true }],
  ['wall', { ground: [o(4, 13), o(4, 14)] }],
  ['cobble', { ground: FLAGSTONE }],
  ['fountain', { ground: FLAGSTONE }],
  ['wood', { ground: [t(16, 20), t(17, 20)] }],
  ['caveFloor', { ground: CAVE_FLOOR }],
  ['caveExit', { ground: CAVE_FLOOR }],
  ['rock', { ground: CAVE_ROCK }],
  ['torch', { ground: CAVE_ROCK }],
  ['caveWater', { ground: [t(13, 3), t(13, 5), t(14, 5)], animatedGround: true }],
]);

/** LPC ground for tile `id`; a decor tile `object@floor` uses its floor's ground. */
export function lpcTileFor(id: string): LpcTile | undefined {
  return LPC_TILES.get(id) ?? LPC_TILES.get(id.slice(id.indexOf('@') + 1));
}

/** Deterministic ground-variant seed for the tile at (x, y), independent of the procedural variant. */
export function groundVariant(x: number, y: number): number {
  let h = Math.imul(x + 11, 2246822519) ^ Math.imul(y + 7, 3266489917);
  h = Math.imul(h ^ (h >>> 15), 668265263);
  h ^= h >>> 13;
  return (h >>> 0) % 997;
}

/** The ground cell to draw for `tile`, given its ground seed and animation frame (used only by animated ground). */
export function lpcGroundCell(tile: LpcTile, seed: number, frame = 0): LpcCell {
  return tile.ground[(seed + (tile.animatedGround ? frame : 0)) % tile.ground.length];
}

/** Public URL of a sheet. `base` is the asset folder URL (default `game-assets/lpc/`). */
export function lpcSheetUrl(sheet: LpcSheetId, base = 'game-assets/lpc/'): string {
  return `${base.endsWith('/') ? base : `${base}/`}${LPC_SHEETS[sheet]}`;
}
