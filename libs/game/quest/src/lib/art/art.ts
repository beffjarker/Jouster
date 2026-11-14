import {
  Facing,
  Palette,
  canvasPixels,
  createCanvas,
  imageDensity,
  palette,
  pixelsToCanvas,
  scale2xPixels,
  setImageDensity,
} from '@jouster/game/engine';
import { Backdrop } from '../data/maps';
import { paintBackdrop, paintShadow, paintTitleBackdrop } from './hd-backdrops';
import { HumanoidLook, LOOKS, paintHumanoid, paintMonster, paintSign } from './hd-characters';
import { ART_SCALE, Paint, box } from './hd-paint';
import { ANIMATED_DECOR, decorParts, paintDecorTop, paintTile, paintWallShadow } from './hd-tiles';

/** Logical width of {@link Art.shadow}. */
export const SHADOW_W = 32;

export { SHADOW_CASTERS, castsShadow, decorTopOf } from './hd-tiles';
import { LPC_CELL, LpcSheetId, lpcGroundCell, lpcTileFor } from './lpc-manifest';
import {
  LPC_CHARACTER_CELL,
  LPC_CHARACTER_FACINGS,
  LPC_CHARACTER_ROWS,
  LPC_CHARACTER_STEPS,
  LPC_MONSTERS,
  LPC_MONSTER_CELL,
} from './lpc-sprites.generated';

/** Logical tile size. Procedural art is stored at 4x density (64x64 real pixels per tile), LPC sprites at 2x. */
export const TILE = 16;

/** Anything `Renderer.draw` accepts; sizes are in real pixels (see `imageDensity`). */
type Sized = CanvasImageSource & { width: number; height: number };

/** Logical (on-screen at scale 1) size of a sprite. LPC sprites are bigger than one tile. */
export function spriteSize(image: Sized): { width: number; height: number } {
  const d = imageDensity(image);
  return { width: image.width / d, height: image.height / d };
}

/** Scale that fits a sprite's frame into a `size` x `size` logical box (procedural 16px sprites: `size / 16`). */
export function fitScale(image: Sized, size: number): number {
  const s = spriteSize(image);
  return size / Math.max(s.width, s.height);
}

/** Logical size of one LPC art pixel (64x64 frames at 2x density): the pixel density all art aims to match. */
export const ART_PIXEL = 0.5;

/**
 * Pixel-art upscale (1, 2 or 4) that keeps `image`, drawn at `scale`, near {@link ART_PIXEL} density, so an
 * enlarged sprite (e.g. a boss) shows pixels as fine as everything else instead of big blocks.
 */
export function sharpFactor(image: Sized, scale: number): number {
  const k = Math.round(Math.log2(scale / imageDensity(image) / ART_PIXEL));
  return k > 0 ? 2 ** Math.min(k, 2) : 1;
}

/**
 * Logical offset to subtract from a tile's top-left so a sprite drawn at `scale` stands on that tile:
 * centred horizontally, bottoms aligned. Zero for tile-sized sprites.
 */
export function tileAnchor(image: Sized, scale = 1): { x: number; y: number } {
  const s = spriteSize(image);
  return { x: (s.width * scale - TILE) / 2, y: s.height * scale - TILE };
}

/** Every humanoid look id (classes and NPCs); each has a row in the LPC `characters.png`. */
export const CHARACTER_LOOK_IDS: readonly string[] = [...LOOKS.keys()];

// --- Monsters ---------------------------------------------------------------------------------

const MONSTER_PALETTES: ReadonlyMap<string, Palette> = new Map([
  ['slime', palette([['o', '#103a6a'], ['g', '#3a8ae8'], ['l', '#9ad0ff'], ['w', '#ffffff'], ['k', '#101010'], ['d', '#2a5aa8']])],
  ['bat', palette([['o', '#1a0a2a'], ['p', '#6a3a9a'], ['l', '#a070d0'], ['r', '#ff3030'], ['w', '#ffffff']])],
  ['wolf', palette([['o', '#202028'], ['g', '#8a8a98'], ['l', '#c0c0cc'], ['d', '#5a5a68'], ['r', '#ff4040'], ['w', '#f0f0f0'], ['k', '#101010']])],
  ['goblin', palette([['o', '#102a10'], ['g', '#5aa040'], ['d', '#3a7a2a'], ['r', '#ff3030'], ['b', '#8a5a2a'], ['n', '#5a3a1a'], ['w', '#ffffff'], ['y', '#f0d040']])],
  ['skeleton', palette([['o', '#303040'], ['w', '#f0f0e0'], ['l', '#b0b0a0'], ['k', '#101010'], ['r', '#ff4040']])],
  ['goblinKing', palette([['o', '#102a10'], ['g', '#5aa040'], ['d', '#3a7a2a'], ['r', '#ff3030'], ['b', '#7a2a8a'], ['n', '#4a1a5a'], ['w', '#ffffff'], ['y', '#f0d040']])],
  ['alphaWolf', palette([['o', '#08080c'], ['g', '#3a3a48'], ['l', '#6a6a7a'], ['d', '#24242e'], ['r', '#ffd020'], ['w', '#f0f0f0'], ['k', '#000000']])],
  ['boneCaptain', palette([['o', '#3a2010'], ['w', '#e8dca0'], ['l', '#b09a60'], ['k', '#401010'], ['r', '#ff2020']])],
  ['goblinChief', palette([['o', '#102010'], ['g', '#7a9a3a'], ['d', '#4a6a2a'], ['r', '#ffa020'], ['b', '#6a4a2a'], ['n', '#8a2a1a'], ['w', '#ffffff'], ['y', '#b8b8c8']])],
  ['giantToad', palette([['o', '#102a18'], ['g', '#4a8a3a'], ['d', '#2a5a2a'], ['l', '#d8d890'], ['y', '#f0c020'], ['k', '#101010']])],
  ['scorpion', palette([['g', '#b07a3a'], ['d', '#6a4220'], ['l', '#e0b070'], ['r', '#ff3030']])],
  ['sandWorm', palette([['g', '#c89a6a'], ['d', '#8a5a3a'], ['l', '#f0d0a8'], ['r', '#8a2030'], ['w', '#f0e8d0'], ['s', '#e0c47a']])],
  ['sandWyrm', palette([['g', '#a8784a'], ['d', '#4a2a14'], ['l', '#f0e0b0'], ['r', '#c84010'], ['w', '#fff4c0'], ['s', '#d8b468']])],
  ['lizardman', palette([['g', '#5a8a3a'], ['d', '#2e5a26'], ['b', '#8a6a3a'], ['n', '#5a4020'], ['r', '#f0d020']])],
  ['wraith', palette([['g', '#4a5a7a'], ['d', '#1e2438'], ['l', '#a8b8d8'], ['r', '#60f0ff']])],
  ['marshWitch', palette([['g', '#8aa860'], ['d', '#1e1e1e'], ['b', '#3a4a2a'], ['n', '#22281a'], ['y', '#2a3a20'], ['r', '#e0ff40']])],
  ['iceTroll', palette([['g', '#7aa0b8'], ['d', '#3a5470'], ['l', '#c8e0f0'], ['b', '#5a4a3a'], ['r', '#40e0ff'], ['w', '#f0f8ff']])],
  ['wyvern', palette([['g', '#4a7a9a'], ['d', '#1e3a54'], ['l', '#a8d0e8'], ['p', '#2a5a7a'], ['r', '#ffd020'], ['w', '#f0f0e8']])],
  ['yeti', palette([['g', '#e8eef4'], ['d', '#9aaac0'], ['l', '#ffffff'], ['b', '#5a6a8a'], ['r', '#3060ff'], ['w', '#f8f8f0']])],
  ['frostMage', palette([['g', '#c8d8e8'], ['d', '#101828'], ['b', '#2a4a8a'], ['n', '#1a2a5a'], ['y', '#e0f0ff'], ['r', '#60e0ff']])],
  ['wyvernMatriarch', palette([['g', '#6a4a8a'], ['d', '#2a1a40'], ['l', '#d0b8f0'], ['p', '#4a2a6a'], ['r', '#ff4020'], ['w', '#fff8e0']])],
  ['fireDrake', palette([['g', '#c84a20'], ['d', '#5a1a10'], ['l', '#f0a050'], ['p', '#8a2a14'], ['r', '#ffe040'], ['w', '#fff0d0']])],
  ['magmaGolem', palette([['g', '#4a3a38'], ['d', '#1e1618'], ['l', '#ff8a30'], ['b', '#3a2a28'], ['r', '#ffd040'], ['w', '#fff0c0']])],
  ['dragonCultist', palette([['g', '#d8b098'], ['d', '#1a0a0a'], ['b', '#8a1a1a'], ['n', '#4a0a0a'], ['y', '#f0c040'], ['r', '#ff6020']])],
  ['vyrmorth', palette([['g', '#a8201a'], ['d', '#3a0a0a'], ['l', '#f0b070'], ['p', '#6a1010'], ['r', '#ffd020'], ['w', '#fff8e0']])],
  ['vyrmorthUnbound', palette([['g', '#e04a10'], ['d', '#2a0606'], ['l', '#ffe080'], ['p', '#a01a0a'], ['r', '#ffffff'], ['w', '#fff8e0']])],
]);

interface MonsterVariant {
  /** Palette overrides on top of the monster's base palette. */
  colors?: ReadonlyArray<[string, string]>;
  /** Alternate body shape (see `paintMonster`). */
  shape?: string;
}

/**
 * Look variants for common monsters (index 0 is the base look). Bosses have none, so they
 * always look the same. Variants are cosmetic only.
 */
const MONSTER_VARIANTS: ReadonlyMap<string, readonly MonsterVariant[]> = new Map<string, readonly MonsterVariant[]>([
  [
    'slime',
    [
      {},
      { shape: 'slimeTall', colors: [['o', '#1a4a10'], ['g', '#5ac040'], ['l', '#b8f0a0'], ['d', '#3a8a2a']] },
      { shape: 'slimeFlat', colors: [['o', '#5a1010'], ['g', '#e04848'], ['l', '#ffa8a8'], ['d', '#a02828']] },
      { colors: [['o', '#3a1050'], ['g', '#a050e0'], ['l', '#e0b0ff'], ['d', '#6a2a9a']] },
      { shape: 'slimeTall', colors: [['o', '#5a4010'], ['g', '#e8b830'], ['l', '#fff0a0'], ['d', '#a87a18']] },
      { shape: 'slimeFlat', colors: [['o', '#0a4048'], ['g', '#30c0c0'], ['l', '#a8f8f0'], ['d', '#1a8088']] },
    ],
  ],
  [
    'bat',
    [
      {},
      { colors: [['o', '#2a1408'], ['p', '#7a5030'], ['l', '#b08860']] },
      { colors: [['o', '#2a0810'], ['p', '#9a2a3a'], ['l', '#d06070'], ['r', '#ffe040']] },
    ],
  ],
  [
    'wolf',
    [
      {},
      { colors: [['g', '#9a6a3a'], ['l', '#d0a070'], ['d', '#6a4020']] },
      { colors: [['g', '#d8d8e0'], ['l', '#ffffff'], ['d', '#9a9aa8'], ['r', '#40a0ff']] },
    ],
  ],
  [
    'goblin',
    [
      {},
      { colors: [['g', '#a8b040'], ['d', '#7a8028'], ['b', '#3a5a9a'], ['n', '#203a6a']] },
      { colors: [['o', '#2a1008'], ['g', '#c86040'], ['d', '#8a3a28'], ['b', '#5a5a5a'], ['n', '#3a3a3a'], ['r', '#ffe040']] },
    ],
  ],
  [
    'skeleton',
    [
      {},
      { colors: [['w', '#e0d090'], ['l', '#a89860']] },
      { colors: [['o', '#20202a'], ['w', '#a8b0c0'], ['l', '#707888'], ['r', '#40c0ff']] },
    ],
  ],
  [
    'scorpion',
    [
      {},
      { colors: [['g', '#3a3a44'], ['d', '#1a1a22'], ['l', '#6a6a7a'], ['r', '#40ff60']] },
      { colors: [['g', '#c04a2a'], ['d', '#7a2414'], ['l', '#f08a5a']] },
    ],
  ],
  ['sandWorm', [{}, { colors: [['g', '#a07aa0'], ['d', '#5a3a5a'], ['l', '#e0c0e0']] }]],
  [
    'lizardman',
    [
      {},
      { colors: [['g', '#3a7a7a'], ['d', '#1e4a4a'], ['b', '#6a4a3a']] },
      { colors: [['g', '#8a7a3a'], ['d', '#5a4a1a'], ['r', '#ff6020']] },
    ],
  ],
  ['wraith', [{}, { colors: [['g', '#5a4a6a'], ['d', '#24182e'], ['l', '#c8a8d8'], ['r', '#ff60c0']] }]],
]);

/** Number of looks a monster sprite has (1 for bosses). */
export function monsterVariantCount(spriteId: string): number {
  return MONSTER_VARIANTS.get(spriteId)?.length ?? 1;
}

/** Deterministic look for a monster from `seed` (no game RNG, so battles are unaffected). */
export function monsterVariant(spriteId: string, seed: number): number {
  const count = monsterVariantCount(spriteId);
  let h = Math.imul(seed ^ hashSeed(spriteId), 2654435761);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return (h >>> 0) % count;
}

/** Recoloured monsters that reuse another monster's body shape. */
const MONSTER_SHAPE: ReadonlyMap<string, string> = new Map([
  ['alphaWolf', 'wolf'],
  ['boneCaptain', 'skeleton'],
  ['goblinChief', 'goblinKing'],
  ['sandWyrm', 'sandWorm'],
  ['wyvernMatriarch', 'wyvern'],
  ['fireDrake', 'wyvern'],
  ['vyrmorth', 'dragon'],
  ['vyrmorthUnbound', 'dragonUnbound'],
]);

/** Number of art variants for tiles that have more than one look (all solid landscape tiles). */
export const TILE_VARIANT_COUNTS: ReadonlyMap<string, number> = new Map<string, number>([
  ['mountain', 3],
  ['forest', 3],
  ['tree', 3],
  ['wall', 3],
  ['rock', 3],
  ['water', 3],
  ['caveWater', 3],
  ['sand', 3],
  ['cactus', 3],
  ['mesa', 3],
  ['mireRock', 3],
  ['marsh', 3],
  ['mireTree', 3],
  ['bog', 3],
  ['sunWall', 3],
  ['sunFloor', 2],
  ['mireWall', 3],
  ['mireFloor', 2],
  ['snow', 3],
  ['snowPine', 3],
  ['glacier', 3],
  ['iceWater', 3],
  ['frozenLake', 3],
  ['iceWall', 3],
  ['iceFloor', 3],
  ['ash', 2],
  ['charredTree', 3],
  ['basalt', 3],
  ['lava', 3],
  ['obsidianWall', 3],
  ['obsidianFloor', 3],
]);

/**
 * Deterministic pseudo-random variant for the tile at (x, y) on `mapId`, so the same spot
 * always looks the same across frames, reloads and saves without touching the game RNG.
 */
export function tileVariant(mapId: string, tileId: string, x: number, y: number): number {
  const count = TILE_VARIANT_COUNTS.get(tileId) ?? 1;
  if (count <= 1) {
    return 0;
  }
  let h = hashSeed(mapId) ^ Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) % count;
}

function hashSeed(id: string): number {
  let h = 7;
  for (const ch of id) {
    h = (h * 31 + ch.charCodeAt(0)) | 0;
  }
  return h;
}

const ANIMATED_TILES: ReadonlySet<string> = new Set(['water', 'bridge', 'caveWater', 'fountain', 'torch', 'bog', 'iceWater', 'lava']);

/** Loaded art sheets (LPC atlases) by id; see `loadLpcSheets`. */
export type ArtSheets = ReadonlyMap<LpcSheetId, CanvasImageSource>;

/** Placeholder for an unknown tile id. */
function magenta(): Paint {
  const p = new Paint(TILE * 2, TILE * 2, ART_SCALE);
  p.flat(box(0, 0, TILE * 2, TILE * 2), '#ff00ff');
  return p;
}

/** A horizontally mirrored copy of a sprite, keeping its image density. */
function mirrored(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = createCanvas(source.width, source.height);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.translate(source.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(source, 0, 0);
  }
  return setImageDensity(canvas, imageDensity(source));
}

/** Art style toggle (`?art=` on the page): procedural only, or LPC sheets with procedural fallback. */
export type ArtStyle = 'classic' | 'lpc';

/**
 * Lazily rendered and cached 2x-density art (tiles, humanoid sprites, monster sprites).
 * With sheets (see {@link useSheets}) tiles listed in `LPC_TILES` use LPC ground art drawn 1:1,
 * with any not-yet-converted object drawn procedurally on top; everything else stays procedural.
 */
export class Art {
  private readonly cache = new Map<string, HTMLCanvasElement>();
  private readonly sharpened = new WeakMap<HTMLCanvasElement, Map<number, HTMLCanvasElement>>();
  private sheets: ArtSheets | null = null;

  constructor(sheets?: ArtSheets) {
    this.sheets = sheets ?? null;
  }

  /** Which style is in use right now. */
  public get style(): ArtStyle {
    return this.sheets ? 'lpc' : 'classic';
  }

  /** Switches to sheet art (or back to procedural with `null`) and drops cached art. */
  public useSheets(sheets: ArtSheets | null): void {
    this.sheets = sheets;
    this.cache.clear();
  }

  /**
   * Tile art; `variant` (see {@link tileVariant}) picks an alternate look where one exists, and
   * `ground` (see `groundVariant`) picks among look-alike sheet ground cells.
   */
  public tile(id: string, frame = 0, variant = 0, ground = 0): HTMLCanvasElement {
    const animated = ANIMATED_TILES.has(id) || ANIMATED_DECOR.has(decorParts(id)?.decor ?? '');
    const f = animated ? frame % 2 : 0;
    const v = variant % (TILE_VARIANT_COUNTS.get(id) ?? 1);
    const lpc = this.sheets ? lpcTileFor(id) : undefined;
    if (lpc && this.sheets) {
      const sheets = this.sheets;
      const cell = lpcGroundCell(lpc, ground, decorParts(id) ? 0 : f);
      return this.cached(`lpc:${id}:${f}:${v}:${cell.sheet}:${cell.col}:${cell.row}`, () =>
        this.sheetTile(sheets, id, cell.sheet, cell.col, cell.row, f, v),
      );
    }
    return this.cached(`tile:${id}:${f}:${v}`, () => (paintTile(id, f, v) ?? magenta()).toCanvas());
  }

  /** True when `spriteId` is a humanoid look (otherwise it is drawn as a monster). */
  public isCharacter(spriteId: string): boolean {
    return LOOKS.has(spriteId);
  }

  /**
   * Humanoid sprite for any facing. LPC sheets give a 32x32 logical frame (stand it on a tile with
   * {@link tileAnchor}); procedural art is one tile, with `left` mirrored from `right`.
   */
  public character(spriteId: string, facing: Facing, frame = 0): HTMLCanvasElement {
    const f = frame % 2;
    const row = this.sheets?.get('characters') ? LPC_CHARACTER_ROWS.get(spriteId) : undefined;
    if (row !== undefined) {
      const { width, height } = LPC_CHARACTER_CELL;
      const col = LPC_CHARACTER_FACINGS.indexOf(facing) * LPC_CHARACTER_STEPS + (f % LPC_CHARACTER_STEPS);
      return this.cached(`lpcchr:${spriteId}:${facing}:${f}`, () =>
        this.sheetSprite('characters', col * width, row * height, width, height),
      );
    }
    if (facing === 'left') {
      return this.cached(`chr:${spriteId}:left:${f}`, () => mirrored(this.character(spriteId, 'right', f)));
    }
    return this.cached(`chr:${spriteId}:${facing}:${f}`, () =>
      paintHumanoid(LOOKS.get(spriteId) ?? (LOOKS.get('villager') as HumanoidLook), facing, f).toCanvas(),
    );
  }

  /**
   * Monster sprite; `variant` (see {@link monsterVariant}) picks an alternate colour/shape. LPC monsters
   * face left (towards the party); humanoid ones are 32x32 logical frames, the rest one tile.
   */
  public monster(spriteId: string, variant = 0): HTMLCanvasElement {
    const v = variant % monsterVariantCount(spriteId);
    const lpc = LPC_MONSTERS.get(`${spriteId}:${v}`);
    if (lpc && this.sheets?.get(lpc.sheet)) {
      const { width, height } = LPC_CHARACTER_CELL;
      return this.cached(`lpcmon:${spriteId}:${v}`, () =>
        lpc.sheet === 'characters'
          ? this.sheetSprite('characters', 0, lpc.index * height, width, height)
          : this.sheetSprite('monsters', lpc.index * LPC_MONSTER_CELL, 0, LPC_MONSTER_CELL, LPC_MONSTER_CELL),
      );
    }
    return this.cached(`mon:${spriteId}:${v}`, () => {
      const look = MONSTER_VARIANTS.get(spriteId)?.[v] ?? {};
      const shape = look.shape ?? MONSTER_SHAPE.get(spriteId) ?? spriteId;
      const colors = new Map([...(MONSTER_PALETTES.get(spriteId) ?? new Map<string, string>()), ...(look.colors ?? [])]);
      return paintMonster(shape, colors).toCanvas();
    });
  }

  /**
   * `sprite` ready to draw at `scale`: when that would enlarge its pixels past {@link ART_PIXEL}, a Scale2x
   * (EPX) copy at higher density (same logical size), so edges are re-drawn at the finer grid rather than
   * blown up into blocks. Cached per sprite.
   */
  public sharp(sprite: HTMLCanvasElement, scale: number): HTMLCanvasElement {
    const factor = sharpFactor(sprite, scale);
    if (factor === 1) {
      return sprite;
    }
    let byFactor = this.sharpened.get(sprite);
    if (!byFactor) {
      byFactor = new Map();
      this.sharpened.set(sprite, byFactor);
    }
    let out = byFactor.get(factor);
    if (!out) {
      let pixels = canvasPixels(sprite);
      if (!pixels) {
        return sprite;
      }
      for (let f = 1; f < factor; f *= 2) {
        pixels = scale2xPixels(pixels);
      }
      out = setImageDensity(pixelsToCanvas(pixels), imageDensity(sprite) * factor);
      byFactor.set(factor, out);
    }
    return out;
  }

  /** Soft shadow drawn over a tile that sits directly below a wall or rock (see SHADOW_CASTERS). */
  public wallShadow(): HTMLCanvasElement {
    return this.cached('wallShadow', () => paintWallShadow().toCanvas());
  }

  /** Upper part of tall decor `decor` (e.g. a throne's back), drawn over the tile above the decor tile. */
  public decorTop(decor: string): HTMLCanvasElement {
    return this.cached(`decorTop:${decor}`, () => paintDecorTop(decor).toCanvas());
  }

  /** Painted battle backdrop `kind` of `width` x `height` logical pixels with the horizon at `horizon`. */
  public backdrop(kind: Backdrop, width: number, height: number, horizon: number): HTMLCanvasElement {
    return this.cached(`backdrop:${kind}:${width}x${height}:${horizon}`, () => paintBackdrop(kind, width, height, horizon).toCanvas());
  }

  /** Painted night scene behind the title, class and name screens, with the horizon at `horizon`. */
  public titleBackdrop(width: number, height: number, horizon: number): HTMLCanvasElement {
    return this.cached(`title:${width}x${height}:${horizon}`, () => paintTitleBackdrop(width, height, horizon).toCanvas());
  }

  /** Soft elliptical ground shadow, {@link SHADOW_W} logical pixels wide. */
  public shadow(): HTMLCanvasElement {
    return this.cached('shadow', () => paintShadow(SHADOW_W).toCanvas());
  }

  /** Town sign sprite (transparent background) advertising the service `kind` (see SignKind). */
  public sign(kind: string): HTMLCanvasElement {
    return this.cached(`sign:${kind}`, () => paintSign(kind).toCanvas());
  }

  /** A real-pixel region of a sprite sheet, copied 1:1 into a 2x-density canvas. */
  private sheetSprite(sheet: LpcSheetId, sx: number, sy: number, w: number, h: number): HTMLCanvasElement {
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    const image = this.sheets?.get(sheet);
    if (ctx && image) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, sx, sy, w, h, 0, 0, w, h);
    }
    return setImageDensity(canvas, 2);
  }

  private sheetTile(sheets: ArtSheets, id: string, sheet: LpcSheetId, col: number, row: number, f: number, v: number): HTMLCanvasElement {
    // LPC ground (2x density) is doubled up to the procedural overlay's 4x density so both stay crisp.
    const density = 2 * ART_SCALE;
    const size = TILE * density;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const image = sheets.get(sheet);
    if (ctx && image) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, col * LPC_CELL, row * LPC_CELL, LPC_CELL, LPC_CELL, 0, 0, size, size);
      const overlay = paintTile(id, f, v, false);
      if (overlay) {
        ctx.drawImage(overlay.toCanvas(), 0, 0);
      }
    }
    return setImageDensity(canvas, density);
  }

  private cached(key: string, build: () => HTMLCanvasElement): HTMLCanvasElement {
    let c = this.cache.get(key);
    if (!c) {
      c = build();
      this.cache.set(key, c);
    }
    return c;
  }
}
