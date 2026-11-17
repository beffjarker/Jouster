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
  actions: 'actions.png',
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
 * Objects on top of the ground are drawn procedurally over it, except those listed in {@link LPC_OBJECTS}.
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
/**
 * Warm taupe flagstones: the town floor must read apart from the cool grey brick walls. Only the centre
 * of the LPC 3x3 flagstone patch: the cells around it are edge pieces with a grout border on the outside,
 * which doubled up into thick seams and cut-off cracks when mixed into a floor.
 */
const FLAGSTONE = [t(17, 27)];

/**
 * Tile ids with LPC ground art. Ids not listed keep the procedural look. Ground cells in one list are mixed
 * freely, so they must share their edge profile (no border pieces), or seams appear between them.
 */
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
  // One brick course: o(4, 14) carries the frame's dark bottom line, which showed as random dark bars.
  ['wall', { ground: [o(4, 13)] }],
  ['cobble', { ground: FLAGSTONE }],
  ['fountain', { ground: FLAGSTONE }],
  // The middle plank cell: t(16, 20) has dark board ends on both sides, doubling seams next to it.
  ['wood', { ground: [t(17, 20)] }],
  ['caveFloor', { ground: CAVE_FLOOR }],
  ['caveExit', { ground: CAVE_FLOOR }],
  ['rock', { ground: CAVE_ROCK }],
  ['torch', { ground: CAVE_ROCK }],
  ['caveWater', { ground: [t(13, 3), t(13, 5), t(14, 5)], animatedGround: true }],
]);

/** A rectangle of a sheet (real pixels), pasted at (`dx`, `dy`) into an {@link LpcObject}. */
export interface LpcPiece {
  sheet: LpcSheetId;
  x: number;
  y: number;
  w: number;
  h: number;
  dx: number;
  dy: number;
}

/**
 * A landscape object (tree, cave mouth) cut from the LPC atlases. It is drawn 1:1 at 4x density, i.e. at half
 * its native LPC size, like the procedural object overlays, so a 96 px LPC tree is 24 logical px and overlaps
 * its neighbours the way a forest canopy should. `width` x `height` is the composed size in sheet pixels and
 * `base` the row (from the top) that stands on the tile's bottom edge; shadows may hang below it.
 */
export interface LpcObject {
  width: number;
  height: number;
  base: number;
  pieces: readonly LpcPiece[];
}

const piece = (x: number, y: number, w: number, h: number, dx = 0, dy = 0): LpcPiece => ({ sheet: 'terrain', x, y, w, h, dx, dy });

/** A pine: the trunk piece goes under the canopy, overlapping it by `TRUNK_OVERLAP` rows. */
const TRUNK_OVERLAP = 12;
function pine(canopy: LpcPiece, trunk: LpcPiece): LpcObject {
  const width = Math.max(canopy.w, trunk.w);
  const top = canopy.h - TRUNK_OVERLAP;
  return {
    width,
    height: top + trunk.h,
    base: top + trunk.h - 10,
    pieces: [
      { ...trunk, dx: Math.floor((width - trunk.w) / 2), dy: top },
      { ...canopy, dx: Math.floor((width - canopy.w) / 2), dy: 0 },
    ],
  };
}

const PINE = pine(piece(772, 485, 85, 91), piece(816, 608, 64, 41));
const PINE_DARK = pine(piece(870, 501, 85, 91), piece(915, 608, 59, 39));
const OAK: LpcObject = { width: 95, height: 117, base: 112, pieces: [piece(929, 902, 95, 117)] };
const SAPLING: LpcObject = { width: 60, height: 90, base: 88, pieces: [piece(867, 931, 60, 90)] };
const CAVE_MOUTH: LpcObject = { width: 64, height: 75, base: 75, pieces: [piece(32, 160, 64, 75)] };

/**
 * LPC objects that replace a tile's procedural object overlay, indexed by the tile's art variant (`tileVariant`).
 * Tiles not listed (mountains, hills, towns, ruins, torches, Act II/III scenery) keep the procedural objects:
 * the LPC atlases have no overworld-sized mountains or houses, only cliff and building pieces.
 */
export const LPC_OBJECTS: ReadonlyMap<string, readonly LpcObject[]> = new Map<string, readonly LpcObject[]>([
  ['forest', [OAK, PINE, PINE_DARK]],
  ['tree', [OAK, PINE, SAPLING]],
  ['caveEntrance', [CAVE_MOUTH]],
]);

/** The LPC object drawn on tile `id` with art variant `variant`, if the tile has one. */
export function lpcObjectFor(id: string, variant: number): LpcObject | undefined {
  const looks = LPC_OBJECTS.get(id);
  return looks?.[variant % looks.length];
}

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
