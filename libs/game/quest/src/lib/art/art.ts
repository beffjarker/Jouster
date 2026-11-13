import {
  Facing,
  Palette,
  canvasPixels,
  createCanvas,
  hiResSprite,
  mirrorRows,
  palette,
  pixelArtToCanvas,
  pixelsToCanvas,
  scale2xPixels,
  setImageDensity,
} from '@jouster/game/engine';

/** Logical tile size. Art is rendered at 2x density (32x32 real pixels per tile). */
export const TILE = 16;

type Ctx = CanvasRenderingContext2D;

/** Deterministic per-pixel noise so procedural tiles look textured but stable. */
function noise(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function speckle(ctx: Ctx, base: string, dots: ReadonlyArray<[string, number]>, seed: number): void {
  rect(ctx, 0, 0, TILE, TILE, base);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const n = noise(x, y, seed);
      let acc = 0;
      for (const [color, p] of dots) {
        acc += p;
        if (n < acc) {
          rect(ctx, x, y, 1, 1, color);
          break;
        }
      }
    }
  }
}

const GRASS = '#3c9a3c';

function grass(ctx: Ctx): void {
  speckle(ctx, GRASS, [['#2f7d2f', 0.08], ['#5cbc4c', 0.06]], 1);
}

interface TreeColors {
  dark: string;
  mid: string;
  light: string;
}

const FOREST_TREE: TreeColors = { dark: '#1d5a25', mid: '#2f7a32', light: '#4fa04a' };
const TOWN_TREE: TreeColors = { dark: '#15451c', mid: '#25682a', light: '#3e8e3e' };

/** Round broadleaf tree. */
function tree(ctx: Ctx, { dark, mid, light }: TreeColors = FOREST_TREE): void {
  rect(ctx, 7, 11, 2, 4, '#6b4320');
  rect(ctx, 3, 3, 10, 9, dark);
  rect(ctx, 2, 5, 12, 5, dark);
  rect(ctx, 4, 3, 8, 7, mid);
  rect(ctx, 3, 5, 10, 4, mid);
  rect(ctx, 5, 4, 3, 2, light);
  rect(ctx, 4, 6, 2, 1, light);
  rect(ctx, 1, 13, 14, 1, 'rgba(0,0,0,0.25)');
}

/** Three-tier conifer, lit from the left. */
function pine(ctx: Ctx, { dark, mid, light }: TreeColors): void {
  rect(ctx, 7, 12, 2, 3, '#5a3818');
  const tiers: ReadonlyArray<[number, number]> = [
    [1, 5],
    [4, 8],
    [7, 12],
  ];
  tiers.forEach(([top, bottom], t) => {
    for (let y = top; y < bottom; y++) {
      const half = Math.min(6, 1 + (y - top) + t);
      rect(ctx, 8 - half, y, half, 1, mid);
      rect(ctx, 8, y, half, 1, dark);
      rect(ctx, 8 - half, y, 1, 1, light);
    }
  });
  rect(ctx, 2, 14, 12, 1, 'rgba(0,0,0,0.25)');
}

/** Broadleaf tree with fruit and a forked trunk. */
function fruitTree(ctx: Ctx, colors: TreeColors): void {
  tree(ctx, colors);
  rect(ctx, 6, 11, 1, 2, '#6b4320');
  rect(ctx, 9, 11, 1, 2, '#6b4320');
  const fruit: ReadonlyArray<[number, number]> = [
    [5, 7],
    [9, 4],
    [11, 7],
    [7, 9],
  ];
  fruit.forEach(([x, y]) => rect(ctx, x, y, 1, 1, '#d03a2a'));
}

function treeVariant(ctx: Ctx, variant: number, colors: TreeColors): void {
  if (variant === 1) {
    pine(ctx, colors);
  } else if (variant === 2) {
    fruitTree(ctx, colors);
  } else {
    tree(ctx, colors);
  }
}

function water(ctx: Ctx, frame: number, base = '#2a5fc8', wave = '#7fb0ff', phase = 0): void {
  rect(ctx, 0, 0, TILE, TILE, base);
  for (let y = 2; y < TILE; y += 5) {
    const off = (y * 3 + frame * 4 + phase) % TILE;
    rect(ctx, off, y, 4, 1, wave);
    rect(ctx, (off + 9) % TILE, y + 2, 3, 1, wave);
  }
}

/** Water tile: plain, with a lily pad, or with a rock breaking the surface. */
function waterVariant(ctx: Ctx, frame: number, variant: number): void {
  water(ctx, frame, '#2a5fc8', '#7fb0ff', variant * 5);
  if (variant === 1) {
    rect(ctx, 4, 5, 5, 3, '#3a8a3a');
    rect(ctx, 5, 4, 3, 1, '#3a8a3a');
    rect(ctx, 6, 6, 1, 2, '#2a5fc8');
    rect(ctx, 5, 5, 1, 1, '#6cc05a');
    rect(ctx, 10, 10, 2, 2, '#f0c0d8');
  } else if (variant === 2) {
    rect(ctx, 8, 8, 5, 3, '#6a6a72');
    rect(ctx, 9, 7, 3, 1, '#8a8a92');
    rect(ctx, 9, 8, 2, 1, '#a8a8b0');
    rect(ctx, 7, 11, 7, 1, '#b8d8ff');
  }
}

/** Underground water: plain, offset ripples, or a stalagmite rising out of it. */
function caveWaterVariant(ctx: Ctx, frame: number, variant: number): void {
  water(ctx, frame, '#1a3a7a', '#4a70b0', variant * 6);
  if (variant === 2) {
    rect(ctx, 6, 5, 4, 7, '#4a3c36');
    rect(ctx, 7, 3, 2, 2, '#4a3c36');
    rect(ctx, 6, 5, 1, 7, '#6a5a50');
    rect(ctx, 5, 12, 6, 1, '#6a90c8');
  }
}

/** One triangular peak; the left face is lit and the top `snow` rows are snow-capped. */
function peak(ctx: Ctx, cx: number, top: number, slope: number, snow: number, rock: [string, string]): void {
  for (let y = top; y < 15; y++) {
    const half = Math.max(1, Math.floor((y - top + 1) * slope));
    const snowy = y < top + snow;
    rect(ctx, cx - half, y, half, 1, snowy ? '#f0f0f0' : rock[0]);
    rect(ctx, cx, y, half, 1, snowy ? '#c8c8d8' : rock[1]);
  }
}

/** Mountain tile: tall snowy peak, twin peaks, or a low bare crag with a boulder. */
function mountain(ctx: Ctx, variant = 0): void {
  grass(ctx);
  const grey: [string, string] = ['#8a8478', '#635e55'];
  if (variant === 1) {
    peak(ctx, 11, 2, 0.5, 3, grey);
    peak(ctx, 5, 5, 0.5, 2, ['#958e80', '#6c665c']);
  } else if (variant === 2) {
    const brown: [string, string] = ['#8a7a64', '#5e5244'];
    peak(ctx, 8, 4, 0.7, 0, brown);
    rect(ctx, 6, 8, 1, 3, '#433a30');
    rect(ctx, 7, 10, 1, 2, '#433a30');
    rect(ctx, 10, 7, 1, 2, '#433a30');
    rect(ctx, 1, 12, 4, 3, '#7a7268');
    rect(ctx, 2, 11, 2, 1, '#9a9288');
  } else {
    peak(ctx, 8, 1, 0.5, 4, grey);
  }
  rect(ctx, 0, 15, 16, 1, '#4a463f');
}

function hills(ctx: Ctx): void {
  grass(ctx);
  const mound = (cx: number, cy: number, w: number): void => {
    for (let i = 0; i < 4; i++) {
      const ww = w - i * 2;
      rect(ctx, cx - ww / 2, cy - i, ww, 1, i === 3 ? '#9ad070' : '#6fa84a');
    }
    rect(ctx, cx - w / 2, cy + 1, w, 1, '#2f6a28');
  };
  mound(5, 7, 8);
  mound(11, 13, 8);
}

function bricks(ctx: Ctx, base: string, line: string): void {
  rect(ctx, 0, 0, TILE, TILE, base);
  for (let y = 0; y < TILE; y += 4) {
    rect(ctx, 0, y + 3, TILE, 1, line);
    const off = (y / 4) % 2 === 0 ? 0 : 4;
    for (let x = off; x < TILE; x += 8) {
      rect(ctx, x, y, 1, 3, line);
    }
  }
}

/**
 * Town wall. All variants share the same brick colours and bond so neighbouring tiles join
 * seamlessly; they differ only by small details inside individual bricks.
 */
function wallVariant(ctx: Ctx, variant: number): void {
  bricks(ctx, '#8a8a9a', '#5a5a6a');
  if (variant === 1) {
    rect(ctx, 9, 4, 6, 3, '#7c7c8c');
    rect(ctx, 2, 9, 1, 1, '#5a5a6a');
    rect(ctx, 3, 10, 2, 1, '#5a5a6a');
  } else if (variant === 2) {
    rect(ctx, 1, 0, 5, 3, '#7c7c8c');
    rect(ctx, 11, 11, 2, 1, '#5e7a4a');
    rect(ctx, 12, 10, 1, 1, '#5e7a4a');
  }
}

/** Cave rock: plain stone, a boulder, or a crystal-veined wall. */
function rockVariant(ctx: Ctx, variant: number): void {
  speckle(ctx, '#3a2e2c', [['#55443e', 0.18], ['#241c1a', 0.1]], 5 + variant);
  if (variant === 1) {
    rect(ctx, 3, 5, 10, 8, '#5a4a44');
    rect(ctx, 4, 4, 8, 1, '#5a4a44');
    rect(ctx, 4, 5, 4, 3, '#76645c');
    rect(ctx, 3, 13, 10, 1, '#1a1412');
  } else if (variant === 2) {
    rect(ctx, 2, 3, 1, 3, '#5ac8d8');
    rect(ctx, 3, 5, 1, 2, '#5ac8d8');
    rect(ctx, 10, 9, 1, 4, '#8a6ae0');
    rect(ctx, 11, 8, 1, 2, '#b8a0ff');
    rect(ctx, 6, 12, 2, 1, '#5ac8d8');
  }
}

/** Cave wall with a lit torch in an iron bracket; the flame flickers between two frames. */
function torch(ctx: Ctx, frame: number): void {
  rockVariant(ctx, 0);
  rect(ctx, 5, 4, 6, 8, 'rgba(255,170,60,0.18)');
  rect(ctx, 7, 8, 2, 5, '#5a3a1a');
  rect(ctx, 6, 8, 4, 1, '#3a3a40');
  rect(ctx, 6, 12, 4, 1, '#3a3a40');
  const lean = frame === 0 ? 0 : 1;
  rect(ctx, 6 + lean, 4, 3, 4, '#e8641c');
  rect(ctx, 7, 3 - lean, 2, 2, '#ffb030');
  rect(ctx, 7, 5, 2, 2, '#fff0a0');
}

function cobble(ctx: Ctx): void {
  speckle(ctx, '#b0aa98', [['#8f8a7a', 0.12], ['#c8c2b0', 0.06]], 7);
}

function planks(ctx: Ctx, base: string, line: string): void {
  rect(ctx, 0, 0, TILE, TILE, base);
  for (let y = 3; y < TILE; y += 4) {
    rect(ctx, 0, y, TILE, 1, line);
  }
  rect(ctx, 5, 0, 1, 3, line);
  rect(ctx, 11, 4, 1, 3, line);
  rect(ctx, 3, 8, 1, 3, line);
  rect(ctx, 13, 12, 1, 3, line);
}

function town(ctx: Ctx): void {
  grass(ctx);
  const house = (x: number, y: number, roof: string): void => {
    rect(ctx, x, y + 3, 6, 4, '#e8d8b0');
    for (let i = 0; i < 3; i++) {
      rect(ctx, x + 2 - i, y + i, 2 + i * 2, 1, roof);
    }
    rect(ctx, x + 2, y + 5, 2, 2, '#5a3a1a');
  };
  house(1, 1, '#c0392b');
  house(9, 2, '#2b6cc0');
  house(5, 8, '#c0392b');
}

function caveEntrance(ctx: Ctx): void {
  mountain(ctx);
  rect(ctx, 5, 8, 6, 7, '#101010');
  rect(ctx, 6, 7, 4, 1, '#101010');
}

function ruins(ctx: Ctx): void {
  speckle(ctx, '#4a6a3a', [['#2a2a2a', 0.15], ['#6a5a3a', 0.08]], 3);
  rect(ctx, 2, 4, 2, 8, '#8a8a8a');
  rect(ctx, 2, 4, 5, 2, '#8a8a8a');
  rect(ctx, 10, 6, 2, 7, '#7a7a7a');
  rect(ctx, 10, 6, 4, 2, '#7a7a7a');
  rect(ctx, 6, 11, 3, 2, '#e07020');
  rect(ctx, 7, 10, 1, 1, '#ffd040');
}

function fountain(ctx: Ctx, frame: number): void {
  cobble(ctx);
  rect(ctx, 1, 1, 14, 14, '#7a7a8a');
  rect(ctx, 3, 3, 10, 10, '#3a7ae0');
  rect(ctx, 6 + frame, 6, 2, 2, '#b0d8ff');
  rect(ctx, 9 - frame, 9, 2, 1, '#b0d8ff');
}

type TileDrawer = (ctx: Ctx, frame: number, variant: number) => void;

const TILE_DRAWERS: ReadonlyMap<string, TileDrawer> = new Map<string, TileDrawer>([
  ['grass', (c) => grass(c)],
  ['townGrass', (c) => speckle(c, '#48a648', [['#3a8a3a', 0.07], ['#70c860', 0.05]], 2)],
  ['road', (c) => speckle(c, '#c8a165', [['#a98450', 0.12], ['#dcbc84', 0.05]], 4)],
  [
    'forest',
    (c, _f, v) => {
      grass(c);
      treeVariant(c, v, FOREST_TREE);
    },
  ],
  [
    'tree',
    (c, _f, v) => {
      speckle(c, '#48a648', [['#3a8a3a', 0.07]], 2);
      treeVariant(c, v, TOWN_TREE);
    },
  ],
  ['hills', (c) => hills(c)],
  ['mountain', (c, _f, v) => mountain(c, v)],
  ['water', (c, f, v) => waterVariant(c, f, v)],
  [
    'bridge',
    (c, f) => {
      water(c, f);
      rect(c, 0, 2, 16, 12, '#a0703a');
      for (let x = 3; x < 16; x += 4) {
        rect(c, x, 2, 1, 12, '#6a4520');
      }
      rect(c, 0, 2, 16, 1, '#5a3a1a');
      rect(c, 0, 13, 16, 1, '#5a3a1a');
    },
  ],
  ['town', (c) => town(c)],
  ['caveEntrance', (c) => caveEntrance(c)],
  ['ruins', (c) => ruins(c)],
  ['wall', (c, _f, v) => wallVariant(c, v)],
  ['cobble', (c) => cobble(c)],
  [
    'carpet',
    (c) => {
      rect(c, 0, 0, 16, 16, '#a02030');
      rect(c, 0, 0, 16, 1, '#d8a830');
      rect(c, 0, 8, 16, 1, '#7a1020');
    },
  ],
  ['wood', (c) => planks(c, '#9a6a3a', '#7a4a22')],
  [
    'counter',
    (c) => {
      planks(c, '#6a4020', '#4a2810');
      rect(c, 0, 0, 16, 4, '#b07a40');
      rect(c, 0, 4, 16, 1, '#3a2010');
    },
  ],
  ['fountain', (c, f) => fountain(c, f)],
  ['rock', (c, _f, v) => rockVariant(c, v)],
  ['torch', (c, f) => torch(c, f)],
  ['caveFloor', (c) => speckle(c, '#6a5a4a', [['#5a4a3c', 0.14], ['#7d6c5a', 0.06]], 6)],
  ['caveWater', (c, f, v) => caveWaterVariant(c, f, v)],
  [
    'caveExit',
    (c) => {
      speckle(c, '#6a5a4a', [['#5a4a3c', 0.14]], 6);
      rect(c, 3, 3, 10, 10, '#d8c890');
      rect(c, 5, 5, 6, 6, '#fff8d0');
    },
  ],
]);

/** Look of a humanoid sprite (heroes, companions and townsfolk). */
interface HumanoidLook {
  skin: string;
  hair: string;
  body: string;
  trim: string;
  legs: string;
  hat?: 'wizard' | 'helmet' | 'hood' | 'crown' | 'cap' | 'mitre' | 'bandana';
  hatColor?: string;
  cape?: string;
  weapon?: 'sword' | 'staff' | 'bow' | 'mace' | 'dagger' | 'shield';
  child?: boolean;
  beard?: string;
}

const LOOKS: ReadonlyMap<string, HumanoidLook> = new Map<string, HumanoidLook>([
  ['warrior', { skin: '#f0c090', hair: '#7a3a10', body: '#a03020', trim: '#c0c0c0', legs: '#5a3a20', hat: 'helmet', hatColor: '#a8a8b8', weapon: 'sword' }],
  ['wizard', { skin: '#f0c090', hair: '#d8d8d8', body: '#3040a8', trim: '#e0c040', legs: '#202060', hat: 'wizard', hatColor: '#3040a8', weapon: 'staff', beard: '#e0e0e0' }],
  ['paladin', { skin: '#f0c090', hair: '#e0c040', body: '#d8d8e8', trim: '#3060c0', legs: '#8080a0', hat: 'helmet', hatColor: '#e0e0f0', cape: '#3060c0', weapon: 'shield' }],
  ['cleric', { skin: '#f0c090', hair: '#a06030', body: '#f0f0f0', trim: '#d8a830', legs: '#c0c0c0', hat: 'mitre', hatColor: '#f0f0f0', weapon: 'mace' }],
  ['rogue', { skin: '#e0b080', hair: '#202020', body: '#404048', trim: '#802020', legs: '#2a2a30', hat: 'hood', hatColor: '#303038', weapon: 'dagger' }],
  ['ranger', { skin: '#e0b080', hair: '#a05a20', body: '#3a7a30', trim: '#8a5a2a', legs: '#5a4020', hat: 'cap', hatColor: '#2a6a2a', weapon: 'bow' }],
  ['king', { skin: '#f0c090', hair: '#c0c0c0', body: '#8a1a8a', trim: '#e0c040', legs: '#5a105a', hat: 'crown', hatColor: '#f0d040', cape: '#c02020', beard: '#d8d8d8' }],
  ['guard', { skin: '#f0c090', hair: '#5a3a1a', body: '#2a5ab0', trim: '#c0c0c0', legs: '#404060', hat: 'helmet', hatColor: '#909098', weapon: 'sword' }],
  ['priest', { skin: '#f0c090', hair: '#909090', body: '#f8f8f8', trim: '#d8a830', legs: '#e0e0e0', hat: 'mitre', hatColor: '#f8f8f8' }],
  ['merchant', { skin: '#f0c090', hair: '#5a3a1a', body: '#2a8a6a', trim: '#e0c040', legs: '#3a3a3a', hat: 'cap', hatColor: '#8a2a2a' }],
  ['smith', { skin: '#d8a070', hair: '#202020', body: '#6a4a2a', trim: '#3a3a3a', legs: '#3a2a1a', beard: '#202020' }],
  ['innkeeper', { skin: '#f0c090', hair: '#c06030', body: '#e0e0c0', trim: '#a04040', legs: '#6a4a2a' }],
  ['recruit', { skin: '#f0c090', hair: '#7a3a10', body: '#a03020', trim: '#c0c0c0', legs: '#5a3a20', weapon: 'sword' }],
  ['villager', { skin: '#f0c090', hair: '#8a5a2a', body: '#c08040', trim: '#6a4020', legs: '#5a4a3a' }],
  ['elder', { skin: '#e8b888', hair: '#e0e0e0', body: '#6a5a8a', trim: '#4a3a6a', legs: '#4a3a5a', beard: '#f0f0f0', hat: 'hood', hatColor: '#5a4a7a' }],
  ['child', { skin: '#f0c090', hair: '#e0a030', body: '#e05050', trim: '#ffffff', legs: '#3050a0', child: true }],
  ['prisoner', { skin: '#e0b080', hair: '#5a3a1a', body: '#8a8070', trim: '#6a6050', legs: '#5a5040' }],
  ['goblinKingNpc', { skin: '#5aa040', hair: '#2a5a20', body: '#7a2a8a', trim: '#e0c040', legs: '#4a1a5a', hat: 'crown', hatColor: '#f0d040', cape: '#5a1a6a' }],
]);

function drawHumanoid(ctx: Ctx, look: HumanoidLook, facing: Facing, frame: number): void {
  const side = facing === 'left' || facing === 'right';
  const back = facing === 'up';
  const k = '#181818';
  const top = look.child ? 3 : 1;
  // Cape behind the body.
  if (look.cape && !side) {
    rect(ctx, 3, top + 7, 10, back ? 7 : 6, look.cape);
  }
  // Legs (walk frame alternates).
  const legY = 12;
  const l1 = frame === 0 ? 3 : 2;
  const l2 = frame === 0 ? 2 : 3;
  if (side) {
    rect(ctx, 6, legY, 2, l1 + 1, look.legs);
    rect(ctx, 8, legY, 2, l2 + 1, look.legs);
    rect(ctx, 5 + (frame === 0 ? 0 : 1), legY + l1, 3, 1, k);
    rect(ctx, 8, legY + l2, 3, 1, k);
  } else {
    rect(ctx, 5, legY, 2, l1 + 1, look.legs);
    rect(ctx, 9, legY, 2, l2 + 1, look.legs);
    rect(ctx, 5, legY + l1, 2, 1, k);
    rect(ctx, 9, legY + l2, 2, 1, k);
  }
  // Body.
  if (side) {
    rect(ctx, 5, top + 7, 6, 5 + (look.child ? -2 : 0) + 1, look.body);
    rect(ctx, 5, top + 10, 6, 1, look.trim);
    if (look.cape) {
      rect(ctx, 4, top + 7, 2, 6, look.cape);
    }
    // Arm swings with the walk cycle.
    rect(ctx, 7 + (frame === 0 ? 1 : -1), top + 8, 2, 4, look.body);
    rect(ctx, 7 + (frame === 0 ? 1 : -1), top + 11, 2, 1, look.skin);
  } else {
    rect(ctx, 4, top + 7, 8, 5 + 1 + (look.child ? -2 : 0), look.body);
    rect(ctx, 4, top + 10, 8, 1, look.trim);
    rect(ctx, 7, top + 7, 2, 3, back ? look.body : look.trim);
    rect(ctx, 3, top + 8, 1, 3, look.body);
    rect(ctx, 12, top + 8, 1, 3, look.body);
    rect(ctx, 3, top + 11, 1, 1, look.skin);
    rect(ctx, 12, top + 11, 1, 1, look.skin);
  }
  // Head.
  rect(ctx, 5, top + 1, 6, 6, look.skin);
  rect(ctx, 4, top + 2, 8, 4, look.skin);
  rect(ctx, 4, top, 8, 3, look.hair);
  if (back) {
    rect(ctx, 4, top, 8, 6, look.hair);
  } else if (side) {
    rect(ctx, 4, top, 4, 6, look.hair);
    rect(ctx, 10, top + 3, 1, 1, k);
    if (look.beard) {
      rect(ctx, 8, top + 5, 4, 2, look.beard);
    }
  } else {
    rect(ctx, 4, top + 3, 1, 2, look.hair);
    rect(ctx, 11, top + 3, 1, 2, look.hair);
    rect(ctx, 6, top + 3, 1, 1, k);
    rect(ctx, 9, top + 3, 1, 1, k);
    if (look.beard) {
      rect(ctx, 5, top + 5, 6, 2, look.beard);
    }
  }
  // Headgear.
  const hc = look.hatColor ?? look.hair;
  switch (look.hat) {
    case 'wizard':
      rect(ctx, 3, top + 1, 10, 1, hc);
      rect(ctx, 5, top - 1, 6, 2, hc);
      rect(ctx, 6, top - 2, 4, 1, hc);
      rect(ctx, 7, 0, 2, 1, hc);
      rect(ctx, 5, top, 6, 1, '#e0c040');
      break;
    case 'helmet':
      rect(ctx, 4, top - 1, 8, 3, hc);
      rect(ctx, 4, top + 2, 1, 3, hc);
      rect(ctx, 11, top + 2, 1, 3, hc);
      rect(ctx, 7, top - 1, 2, 1, '#ffffff');
      break;
    case 'hood':
      rect(ctx, 3, top - 1, 10, 3, hc);
      rect(ctx, 3, top + 2, 2, 5, hc);
      rect(ctx, 11, top + 2, 2, 5, hc);
      if (back) {
        rect(ctx, 3, top - 1, 10, 8, hc);
      }
      break;
    case 'crown':
      rect(ctx, 4, top - 1, 8, 2, hc);
      rect(ctx, 4, top - 2, 1, 1, hc);
      rect(ctx, 7, top - 2, 2, 1, hc);
      rect(ctx, 11, top - 2, 1, 1, hc);
      rect(ctx, 7, top - 1, 2, 1, '#e02020');
      break;
    case 'cap':
      rect(ctx, 4, top - 1, 8, 2, hc);
      rect(ctx, side ? 10 : 3, top + 1, 3, 1, hc);
      break;
    case 'mitre':
      rect(ctx, 5, top - 2, 6, 3, hc);
      rect(ctx, 6, top - 3, 4, 1, hc);
      rect(ctx, 7, top - 2, 2, 3, '#d8a830');
      break;
    default:
      break;
  }
  // Held item (front/side only).
  if (!back) {
    const hx = side ? 9 : 12;
    switch (look.weapon) {
      case 'sword':
        rect(ctx, hx, top + 4, 1, 7, '#d8d8e8');
        rect(ctx, hx - 1, top + 10, 3, 1, '#8a5a2a');
        break;
      case 'staff':
        rect(ctx, hx, top + 1, 1, 13, '#8a5a2a');
        rect(ctx, hx - 1, top, 3, 2, '#40e0ff');
        break;
      case 'mace':
        rect(ctx, hx, top + 7, 1, 5, '#8a5a2a');
        rect(ctx, hx - 1, top + 5, 3, 3, '#c0c0c8');
        break;
      case 'dagger':
        rect(ctx, hx, top + 8, 1, 4, '#d8d8e8');
        break;
      case 'bow':
        rect(ctx, hx, top + 3, 1, 10, '#8a5a2a');
        rect(ctx, hx + 1, top + 4, 1, 8, '#e0e0e0');
        break;
      case 'shield':
        rect(ctx, side ? 8 : 2, top + 7, 4, 5, '#3060c0');
        rect(ctx, side ? 9 : 3, top + 8, 2, 3, '#e0c040');
        break;
      default:
        break;
    }
  }
}

// --- Monsters (16x16; halves are mirrored) -------------------------------------------------

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
]);

const MONSTER_ROWS: ReadonlyMap<string, readonly string[]> = new Map<string, readonly string[]>([
  [
    'slime',
    mirrorRows([
      '........', '........', '........', '........', '.......o', '......og', '.....ogg', '....oggl',
      '...ogglg', '..oggwkg', '..oggkkg', '.ogggggg', '.ogggggg', '.oddgggg', '..oddddd', '...ooooo',
    ]),
  ],
  [
    'bat',
    mirrorRows([
      '........', '........', '........', '........', '......o.', 'o.....oo', 'oo...opp', 'opo..orp',
      'oppo.opp', 'opppoppp', 'opllpppp', 'oplppopw', 'oppo..op', 'oo.....o', 'o.......', '........',
    ]),
  ],
  [
    'wolf',
    [
      '................', '................', '...o.o..........', '..ogogo.........', '.ogggggo........',
      'oggrggggo.......', 'kgggggggooooooo.', 'owlgggggggggggdo', '.owwlggggggggggo', '..oowlggggggggdo',
      '....olgggggggddo', '....oglgoooogldo', '....ogo..ogo.ogo', '...ogo...ogo.ogo', '...oo....oo..oo.',
      '................',
    ],
  ],
  [
    'goblin',
    mirrorRows([
      '........', '........', '.....ooo', 'o...oggg', 'goo.oggg', '.oggggrg', '..oogggg', '....ogwg',
      '.....ooo', '...onbbb', '..ogobbb', '..ogonbb', '....obbb', '....odoo', '....odo.', '...ooo..',
    ]),
  ],
  [
    'skeleton',
    mirrorRows([
      '........', '.....ooo', '....owww', '...owwww', '...owkkw', '...owkrw', '...owwww', '....owwk',
      '....owkw', '......ow', '...oowww', '..ow.wkw', '..ow.wkw', '....owww', '....ow.o', '...oww..',
    ]),
  ],
  [
    'goblinKing',
    mirrorRows([
      '....y..y', '....yyyy', '.....ooo', 'o...oggg', 'goo.oggg', '.oggggrg', '..oogggg', '....ogwg',
      '..nnnooo', '.nnonbbb', '.nogobyb', '.nogonbb', '.nn.obbb', '.n..obbb', '....odo.', '...ooo..',
    ]),
  ],
  [
    'giantToad',
    mirrorRows([
      '........', '........', '........', '..ooo...', '.oyko...', '.ogggo..', 'ogggggoo', 'oggggggg',
      'ogdggggg', 'odggglll', 'oddgllll', '.oddglll', '.oodggll', 'odgo.odd', 'ooo...oo', '........',
    ]),
  ],
  [
    'slimeTall',
    mirrorRows([
      '........', '........', '.......o', '......og', '......ol', '.....ogl', '.....ogg', '....oggg',
      '....oglg', '...ogwkg', '...ogkkg', '..oggggg', '..oggggg', '..oddggg', '...odddd', '....oooo',
    ]),
  ],
  [
    'slimeFlat',
    mirrorRows([
      '........', '........', '........', '........', '........', '........', '........', '........',
      '.....ooo', '...ooggg', '..ogglgg', '.oggwkgg', 'ogggkkgg', 'ogdggggg', 'oddddddd', '.ooooooo',
    ]),
  ],
]);

interface MonsterVariant {
  /** Palette overrides on top of the monster's base palette. */
  colors?: ReadonlyArray<[string, string]>;
  /** Alternate pixel rows (key in `MONSTER_ROWS`). */
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

/** Recoloured monsters that reuse another monster's pixel rows. */
const MONSTER_SHAPE: ReadonlyMap<string, string> = new Map([
  ['alphaWolf', 'wolf'],
  ['boneCaptain', 'skeleton'],
  ['goblinChief', 'goblinKing'],
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

/**
 * Upscales a 16x16 tile to 32x32 with EPX (smooth diagonals) and adds fine-grain texture
 * plus a soft top-left light so ground reads with 32-bit-era depth.
 */
function hiResTile(low: HTMLCanvasElement, seed: number): HTMLCanvasElement {
  const src = canvasPixels(low);
  if (!src) {
    return low;
  }
  const big = scale2xPixels(src);
  const { width, height, data } = big;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = noise(x, y, seed);
      const grain = n < 0.12 ? 0.9 : n > 0.92 ? 1.08 : 1;
      const light = 1.04 - ((x + y) / (width + height)) * 0.08;
      const k = grain * light;
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        data[i + c] = Math.min(255, data[i + c] * k);
      }
    }
  }
  return setImageDensity(pixelsToCanvas(big), 2);
}

const ANIMATED_TILES: ReadonlySet<string> = new Set(['water', 'bridge', 'caveWater', 'fountain', 'torch']);

type SignIcon = (ctx: Ctx) => void;

const SIGN_ICONS: ReadonlyMap<string, SignIcon> = new Map<string, SignIcon>([
  ['inn', (ctx) => {
    rect(ctx, 4, 8, 8, 2, '#c0392b');
    rect(ctx, 4, 7, 3, 1, '#f0f0f0');
    rect(ctx, 4, 10, 1, 1, '#3a2410');
    rect(ctx, 11, 10, 1, 1, '#3a2410');
  }],
  ['tavern', (ctx) => {
    rect(ctx, 5, 6, 5, 5, '#e0a020');
    rect(ctx, 5, 6, 5, 1, '#fff6d8');
    rect(ctx, 10, 7, 2, 1, '#e0a020');
    rect(ctx, 11, 7, 1, 3, '#e0a020');
    rect(ctx, 10, 9, 1, 1, '#e0a020');
  }],
  ['item', (ctx) => {
    rect(ctx, 7, 5, 2, 2, '#c8c8d0');
    rect(ctx, 6, 7, 4, 1, '#c8c8d0');
    rect(ctx, 5, 8, 6, 3, '#3ac060');
    rect(ctx, 6, 8, 1, 1, '#a0f0b0');
  }],
  ['weapon', (ctx) => {
    for (let i = 0; i < 6; i++) {
      rect(ctx, 5 + i, 5 + i, 1, 1, '#d8d8e0');
      rect(ctx, 10 - i, 5 + i, 1, 1, '#d8d8e0');
    }
    rect(ctx, 4, 10, 2, 1, '#8a5a20');
    rect(ctx, 10, 10, 2, 1, '#8a5a20');
  }],
  ['armor', (ctx) => {
    rect(ctx, 5, 5, 6, 4, '#3a6ac8');
    rect(ctx, 6, 9, 4, 1, '#3a6ac8');
    rect(ctx, 7, 10, 2, 1, '#3a6ac8');
    rect(ctx, 7, 5, 2, 5, '#e0c040');
  }],
  ['chapel', (ctx) => {
    rect(ctx, 7, 5, 2, 6, '#f0e0a0');
    rect(ctx, 5, 7, 6, 2, '#f0e0a0');
  }],
  ['castle', (ctx) => {
    rect(ctx, 4, 8, 8, 3, '#f0c020');
    rect(ctx, 4, 6, 1, 2, '#f0c020');
    rect(ctx, 7, 5, 2, 3, '#f0c020');
    rect(ctx, 11, 6, 1, 2, '#f0c020');
    rect(ctx, 7, 9, 2, 1, '#c0392b');
  }],
]);

/** A hanging wooden shop sign: iron bracket, two chains and a board with the service icon. */
export function drawSign(ctx: Ctx, kind: string): void {
  rect(ctx, 1, 1, 14, 1, '#2a2a30');
  rect(ctx, 1, 0, 1, 3, '#2a2a30');
  rect(ctx, 4, 2, 1, 2, '#5a5a64');
  rect(ctx, 11, 2, 1, 2, '#5a5a64');
  rect(ctx, 2, 4, 12, 9, '#3a2410');
  rect(ctx, 3, 4, 10, 8, '#8a5a2a');
  rect(ctx, 3, 4, 10, 1, '#a8743a');
  (SIGN_ICONS.get(kind) ?? SIGN_ICONS.get('item') as SignIcon)(ctx);
}

/** Lazily rendered and cached 2x-density art (tiles, humanoid sprites, monster sprites). */
export class Art {
  private readonly cache = new Map<string, HTMLCanvasElement>();

  /** Tile art; `variant` (see {@link tileVariant}) picks an alternate look where one exists. */
  public tile(id: string, frame = 0, variant = 0): HTMLCanvasElement {
    const animated = ANIMATED_TILES.has(id);
    const f = animated ? frame % 2 : 0;
    const v = variant % (TILE_VARIANT_COUNTS.get(id) ?? 1);
    return this.cached(`tile:${id}:${f}:${v}`, () => {
      const canvas = createCanvas(TILE, TILE);
      const ctx = canvas.getContext('2d');
      const drawer = TILE_DRAWERS.get(id);
      if (ctx) {
        if (drawer) {
          drawer(ctx, f, v);
        } else {
          rect(ctx, 0, 0, TILE, TILE, '#ff00ff');
        }
      }
      return hiResTile(canvas, id === 'wall' ? hashSeed(id) : hashSeed(id) + v * 101);
    });
  }

  /** True when `spriteId` is a humanoid look (otherwise it is drawn as a monster). */
  public isCharacter(spriteId: string): boolean {
    return LOOKS.has(spriteId);
  }

  /** Humanoid sprite facing down/up/right (draw `left` by flipping `right`). */
  public character(spriteId: string, facing: Facing, frame = 0): HTMLCanvasElement {
    const dir = facing === 'left' ? 'right' : facing;
    return this.cached(`chr:${spriteId}:${dir}:${frame % 2}`, () => {
      const canvas = createCanvas(TILE, TILE);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawHumanoid(ctx, LOOKS.get(spriteId) ?? (LOOKS.get('villager') as HumanoidLook), dir, frame % 2);
      }
      return hiResSprite(canvas);
    });
  }

  /** Monster sprite; `variant` (see {@link monsterVariant}) picks an alternate colour/shape. */
  public monster(spriteId: string, variant = 0): HTMLCanvasElement {
    const v = variant % monsterVariantCount(spriteId);
    return this.cached(`mon:${spriteId}:${v}`, () => {
      const look = MONSTER_VARIANTS.get(spriteId)?.[v] ?? {};
      const shape = look.shape ?? MONSTER_SHAPE.get(spriteId) ?? spriteId;
      const rows = (MONSTER_ROWS.get(shape) ?? MONSTER_ROWS.get('slime') ?? []).map((r) => r.padEnd(16, '.').slice(0, 16));
      const colors = new Map([...(MONSTER_PALETTES.get(spriteId) ?? new Map<string, string>()), ...(look.colors ?? [])]);
      return hiResSprite(pixelArtToCanvas(rows, colors));
    });
  }

  /** Town sign sprite (transparent background) advertising the service `kind` (see SignKind). */
  public sign(kind: string): HTMLCanvasElement {
    return this.cached(`sign:${kind}`, () => {
      const canvas = createCanvas(TILE, TILE);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawSign(ctx, kind);
      }
      return hiResSprite(canvas);
    });
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
