import { Paint, box, clip, cut, ell, hash, poly, ramp, seg, tone, union, valueNoise } from './hd-paint';

/** Real pixels per tile edge (16 logical pixels at density 2, the same as an LPC tile). */
export const HD_TILE = 32;

type Draw = (p: Paint, frame: number, variant: number) => void;

/** A tile's ground layer and its object layer (drawn on its own layer, outlined, then composited). */
export interface HdTile {
  ground?: Draw;
  object?: Draw;
  /** Outline the object layer (default true; off for light effects). */
  outline?: boolean;
}

const S = HD_TILE;
const wrap = (n: number): number => ((n % S) + S) % S;

function dither(x: number, y: number): number {
  return ((x & 1) ^ (y & 1)) * 0.5 - 0.25;
}

/** Soft patchy ground in shades of `base`, seamless across tiles. */
function ground(p: Paint, base: string, seed: number, patch = 1, grain = 0.35): void {
  const r = ramp(base);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const v = (valueNoise(x, y, 8, seed) - 0.5) * 2 * patch + (hash(x, y, seed) - 0.5) * 2 * grain;
      const k = Math.max(-2, Math.min(1, Math.round(v + dither(x, y))));
      p.px(x, y, r[k + 3]);
    }
  }
}

/** Short grass blades: a lit tip over a shaded root. */
function blades(p: Paint, base: string, seed: number, density: number): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const n = hash(x, y, seed + 17);
      if (n < density) {
        p.px(x, y, tone(base, 2));
        p.px(x, wrap(y + 1), tone(base, 1));
        p.px(wrap(x + 1), wrap(y + 1), tone(base, -2));
      } else if (n < density * 2) {
        p.px(x, y, tone(base, -2));
      }
    }
  }
}

/** Little stones with a lit top and a shadow. */
function pebbles(p: Paint, stone: string, seed: number, density: number): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (hash(x, y, seed + 31) < density) {
        p.px(x, y, tone(stone, 1));
        p.px(wrap(x + 1), y, tone(stone, 0));
        p.px(x, wrap(y + 1), tone(stone, -2));
        p.px(wrap(x + 1), wrap(y + 1), tone(stone, -3));
      }
    }
  }
}

const GRASS = '#3c9a3c';
const TOWN_GRASS = '#48a648';

function grass(p: Paint): void {
  ground(p, GRASS, 1, 0.8);
  blades(p, GRASS, 1, 0.035);
}

function townGrass(p: Paint): void {
  ground(p, TOWN_GRASS, 2, 0.7);
  blades(p, TOWN_GRASS, 2, 0.03);
}

/**
 * Staggered blocks (bricks, cobbles): `rowH` x `blockW` blocks separated by mortar, each block
 * bevelled and slightly varied, seamless across tiles.
 */
function masonry(p: Paint, base: string, mortar: string, rowH: number, blockW: number, seed: number, round = false): void {
  const r = ramp(base);
  const m = ramp(mortar);
  for (let y = 0; y < S; y++) {
    const row = Math.floor(y / rowH);
    const ly = y % rowH;
    const shift = row % 2 === 0 ? 0 : blockW / 2;
    for (let x = 0; x < S; x++) {
      const sx = wrap(x + shift);
      const col = Math.floor(sx / blockW);
      const lx = sx % blockW;
      const corner = round && (lx === 1 || lx === blockW - 1) && (ly === 1 || ly === rowH - 1);
      if (lx === 0 || ly === 0 || corner) {
        p.px(x, y, m[ly === 0 ? 2 : 3]);
        continue;
      }
      let v = (hash(col, row, seed) - 0.5) * 1.2 + (hash(x, y, seed) - 0.5) * 0.7;
      if (ly === 1 || lx === 1) {
        v += 1;
      } else if (ly === rowH - 1 || lx === blockW - 1) {
        v -= 1.2;
      }
      const k = Math.max(-3, Math.min(2, Math.round(v + dither(x, y) * 0.6)));
      p.px(x, y, r[k + 3]);
    }
  }
}

function cobble(p: Paint): void {
  masonry(p, '#bea47e', '#76624a', 8, 8, 7, true);
}

const WALL = '#8a8a9a';

/** Town wall: all variants share one brick bond so neighbours join; they differ by small details. */
function wall(p: Paint, _f: number, variant: number): void {
  masonry(p, WALL, '#4a4a58', 8, 16, 3);
  if (variant === 1) {
    // A cracked brick.
    [
      [20, 10],
      [21, 11],
      [21, 12],
      [22, 13],
      [23, 13],
      [24, 14],
      [22, 12],
    ].forEach(([x, y]) => p.px(x, y, tone(WALL, -3)));
    p.px(21, 10, tone(WALL, 1));
  } else if (variant === 2) {
    // Moss creeping along a mortar line.
    for (let x = 2; x < 14; x++) {
      const h = 1 + Math.floor(hash(x, 0, 9) * 3);
      for (let y = 0; y < h; y++) {
        p.px(x, 24 - y, tone('#5e8a3a', y === h - 1 ? 1 : -1 + (x % 2)));
      }
    }
    p.px(5, 20, tone('#5e8a3a', 2));
  }
}

/** Plank floor: boards with grain, staggered joints and nail heads. */
function planks(p: Paint, base: string, seed: number): void {
  const r = ramp(base);
  for (let y = 0; y < S; y++) {
    const row = Math.floor(y / 8);
    const ly = y % 8;
    const joint = (row * 13 + 5) % S;
    for (let x = 0; x < S; x++) {
      let v = (hash(row, 0, seed) - 0.5) * 0.8;
      v += (valueNoise(x, y * 6, 8, seed + row) - 0.5) * 1.6;
      if (ly === 0) {
        v = -3;
      } else if (ly === 1) {
        v += 1;
      } else if (ly === 7) {
        v -= 1;
      }
      if (x === joint && ly > 0) {
        v = -3;
      } else if (x === wrap(joint + 1) && ly > 0) {
        v += 1;
      }
      const k = Math.max(-3, Math.min(2, Math.round(v + dither(x, y) * 0.5)));
      p.px(x, y, r[k + 3]);
    }
    if (ly === 4) {
      p.px(wrap(joint - 2), y, r[0]);
      p.px(wrap(joint + 3), y, r[0]);
    }
  }
}

function carpet(p: Paint): void {
  const red = '#a02030';
  const gold = '#d8a830';
  ground(p, red, 11, 0.3, 0.25);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const lx = x % 16;
      const ly = y % 16;
      const d = Math.abs(lx - 8) + Math.abs(ly - 9);
      if (d === 5) {
        p.px(x, y, tone(red, -2));
      } else if (d === 4) {
        p.px(x, y, tone(gold, -1));
      } else if (d === 0) {
        p.px(x, y, tone(gold, 1));
      }
    }
  }
  p.fill(box(0, 0, S, 3), gold, { bevel: 0, grad: 1, dither: 0 });
  p.flat(box(0, 3, S, 1), tone(red, -3));
}

function counter(p: Paint): void {
  planks(p, '#6a4020', 21);
  p.fill(box(0, 0, S, 8), '#b07a40', { bevel: 0, grad: 1, tex: 0.3, seed: 4 });
  p.flat(box(0, 0, S, 1), tone('#b07a40', 2));
  p.flat(box(0, 8, S, 1), tone('#6a4020', -3));
  p.flat(box(0, 9, S, 1), tone('#6a4020', -2));
}

// --- Water --------------------------------------------------------------------------------------

/** Rippling water; `frame` shifts the highlights and `phase` varies the pattern per variant. */
function water(p: Paint, frame: number, base = '#2a5fc8', phase = 0): void {
  const r = ramp(base);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const v =
        (valueNoise(x + frame * 2, y, 8, 40 + phase) - 0.5) * 1.8 +
        (valueNoise(x - frame, y, 4, 41 + phase) - 0.5) * 0.8 -
        0.45;
      const k = Math.max(-2, Math.min(0, Math.round(v + dither(x, y) * 0.5)));
      p.px(x, y, r[k + 3]);
    }
  }
  for (let cy = 0; cy < 4; cy++) {
    for (let cx = 0; cx < 4; cx++) {
      const n = hash(cx, cy, 50 + phase);
      const wy = cy * 8 + Math.floor(n * 6) + 1;
      const wx = cx * 8 + Math.floor(hash(cy, cx, 51 + phase) * 8) + frame * 3;
      const len = 3 + Math.floor(n * 3);
      for (let i = 0; i < len; i++) {
        p.px(wrap(wx + i), wy, r[i === 0 || i === len - 1 ? 4 : 5]);
      }
      p.px(wrap(wx + 1), wrap(wy + 1), r[1]);
    }
  }
}

function waterTile(p: Paint, frame: number, variant: number): void {
  water(p, frame, '#2a5fc8', variant * 5);
  if (variant === 1) {
    const pad = cut(ell(11, 12, 7, 4.5), poly([11, 12, 18, 9, 18, 13]));
    p.fill(pad, '#3a8a3a', { sphere: true, rim: false });
    p.flat(seg(11, 12, 7, 10, 0.5), tone('#3a8a3a', -2));
    p.fill(ell(23, 22, 3, 2.5), '#f0a8c8', { sphere: true });
    p.px(23, 21, '#fff0a0');
    p.flat(ell(23, 25, 4, 1), tone('#2a5fc8', -2), 0.6);
  } else if (variant === 2) {
    p.flat(ell(17, 20, 9, 3), tone('#2a5fc8', 2), 0.7);
    p.fill(clip(ell(17, 18, 7, 6), box(0, 0, S, 20)), '#7a7a82', { sphere: true, tex: 0.3, seed: 2 });
  }
}

function caveWaterTile(p: Paint, frame: number, variant: number): void {
  water(p, frame, '#1a3a7a', variant * 6);
  if (variant === 2) {
    p.flat(ell(16, 26, 7, 2.5), tone('#1a3a7a', 2), 0.7);
    p.fill(poly([10, 26, 22, 26, 18, 12, 16, 4, 14, 12]), '#4a3c36', { gradX: 1.2, tex: 0.4, seed: 5 });
  }
}

function bridgeDeck(p: Paint): void {
  const wood = '#a0703a';
  for (let x = 0; x < S; x += 8) {
    p.fill(box(x, 5, 8, 22), wood, { tex: 0.5, seed: x, shade: (hash(x, 0, 3) - 0.5) * 0.8 });
    p.px(x + 3, 8, tone(wood, -3));
    p.px(x + 3, 23, tone(wood, -3));
  }
  const rail = '#6a4520';
  p.fill(box(0, 2, S, 4), rail, { tex: 0.3 });
  p.fill(box(0, 26, S, 4), rail, { tex: 0.3 });
  [3, 19].forEach((x) => {
    p.fill(box(x, 0, 4, 7), '#5a3a1a', {});
    p.fill(box(x, 24, 4, 7), '#5a3a1a', {});
  });
}

// --- Trees --------------------------------------------------------------------------------------

/** Canopy colours: forest trees are a little brighter than tended town trees. */
interface TreeColors {
  leaf: string;
  trunk: string;
}

const FOREST_TREE: TreeColors = { leaf: '#2f7a32', trunk: '#6b4320' };
const TOWN_TREE: TreeColors = { leaf: '#25682a', trunk: '#5e3a1c' };

function shadow(p: Paint, cx: number, cy: number, rx: number, ry: number): void {
  p.flat(ell(cx, cy, rx, ry), '#0a1a10', 0.32);
}

function trunk(p: Paint, c: TreeColors, top: number): void {
  p.fill(union(box(14, top, 5, 29 - top), poly([12, 29, 21, 29, 18, 26, 15, 26])), c.trunk, { gradX: 1, tex: 0.4, seed: 8 });
}

/** Round broadleaf tree built from lit leaf clumps. */
function roundTree(p: Paint, c: TreeColors): void {
  shadow(p, 16, 28, 12, 3.5);
  trunk(p, c, 18);
  const canopy = union(ell(16, 12, 12, 9.5), ell(9, 15, 6.5, 6), ell(23, 15, 6.5, 6), ell(16, 6, 8, 5.5));
  p.fill(canopy, c.leaf, { sphere: true, tex: 0.5, seed: 3, bevel: 0 });
  const clumps: ReadonlyArray<[number, number]> = [
    [11, 6], [18, 4], [24, 9], [7, 11], [14, 10], [21, 13], [10, 17], [17, 17], [25, 17], [5, 16],
  ];
  clumps.forEach(([x, y]) => {
    const shade = 0.8 - (x - 4) / 14 - (y - 4) / 12;
    p.fill(clip(ell(x, y, 3.6, 3), canopy), c.leaf, { sphere: true, shade, bevel: 0, dither: 0.3 });
  });
}

/** Three-tier conifer, lit from the left. */
function pineTree(p: Paint, c: TreeColors): void {
  shadow(p, 16, 28, 10, 3);
  p.fill(box(14, 22, 4, 7), c.trunk, { gradX: 1 });
  const tiers: ReadonlyArray<[number, number, number]> = [
    [1, 11, 6],
    [6, 18, 9],
    [11, 25, 12],
  ];
  const leaf = tone(c.leaf, -1);
  tiers.forEach(([top, bottom, half]) => {
    const pts = [16, top];
    for (let i = 0; i <= 4; i++) {
      const x = 16 + half - (i * half * 2) / 4;
      pts.push(x, i % 2 === 0 ? bottom : bottom - 3);
    }
    p.fill(poly(pts), leaf, { gradX: 1.4, grad: 0.5, tex: 0.6, seed: top, bevel: 0 });
    p.flat(seg(16, top + 2, 16, bottom - 3, 0.4), tone(leaf, -1), 0.5);
  });
}

function fruitTree(p: Paint, c: TreeColors): void {
  roundTree(p, c);
  const fruit: ReadonlyArray<[number, number]> = [[9, 12], [19, 7], [23, 14], [14, 18], [13, 6]];
  fruit.forEach(([x, y]) => {
    p.fill(ell(x, y, 1.8), '#d03a2a', { sphere: true, bevel: 0, dither: 0 });
    p.px(x - 1, y - 1, '#ffd0b0');
  });
}

function treeVariant(p: Paint, variant: number, c: TreeColors): void {
  if (variant === 1) {
    pineTree(p, c);
  } else if (variant === 2) {
    fruitTree(p, c);
  } else {
    roundTree(p, c);
  }
}

// --- Landmarks ----------------------------------------------------------------------------------

function hills(p: Paint): void {
  const green = '#6fa84a';
  const mound = (cx: number, base: number, rx: number, ry: number): void => {
    shadow(p, cx + 1, base, rx, 2);
    const s = clip(ell(cx, base, rx, ry), box(0, 0, S, base + 1));
    p.fill(s, green, { sphere: true, tex: 0.5, seed: cx, bevel: 0 });
    for (let i = 0; i < 4; i++) {
      const x = cx - rx / 2 + i * (rx / 3);
      p.px(Math.round(x), base - 2 - (i % 2), tone(green, 2));
    }
  };
  mound(10, 15, 9.5, 8);
  mound(22, 28, 9.5, 8);
}

/** A jagged peak; the left face is lit, the right in shade, the top `snow` fraction snow-capped. */
function peak(p: Paint, cx: number, top: number, half: number, bottom: number, rock: string, snow: number): void {
  const h = bottom - top;
  const shape = poly([
    cx, top,
    cx + half * 0.3, top + h * 0.25,
    cx + half * 0.55, top + h * 0.45,
    cx + half, bottom,
    cx - half, bottom,
    cx - half * 0.6, top + h * 0.5,
    cx - half * 0.3, top + h * 0.22,
  ]);
  const shade = poly([cx, top, cx + 2, bottom, cx + half + 2, bottom, cx + half + 2, top]);
  p.fill(shape, rock, { gradX: 0.5, grad: 0.5, tex: 0.5, seed: cx, bevel: 1 });
  p.fill(clip(shape, shade), rock, { shade: -1.4, tex: 0.5, seed: cx + 1, bevel: 0 });
  p.flat(seg(cx - half * 0.4, top + h * 0.6, cx - half * 0.2, top + h * 0.8, 0.5), tone(rock, -2));
  p.flat(seg(cx + half * 0.5, top + h * 0.7, cx + half * 0.35, bottom - 1, 0.5), tone(rock, -3));
  if (snow > 0) {
    const sy = top + h * snow;
    const cap = clip(shape, poly([cx - half, top - 1, cx + half, top - 1, cx + half, sy, cx + half * 0.4, sy - 2,
      cx + 1, sy + 1, cx - half * 0.4, sy - 2.5, cx - half, sy + 1]));
    p.fill(cap, '#eef0f6', { bevel: 0, tex: 0.2 });
    p.fill(clip(cap, shade), '#eef0f6', { shade: -1.3, bevel: 0 });
  }
}

const ROCK_GREY = '#8a8478';

function mountain(p: Paint, _f: number, variant: number): void {
  if (variant === 1) {
    shadow(p, 16, 29, 15, 2.5);
    peak(p, 21, 2, 11, 29, ROCK_GREY, 0.3);
    peak(p, 9, 9, 9, 30, '#958e80', 0.22);
  } else if (variant === 2) {
    shadow(p, 16, 29, 14, 2.5);
    peak(p, 17, 7, 13, 29, '#8a7a64', 0);
    p.fill(ell(6, 26, 5, 4), '#7a7268', { sphere: true, tex: 0.3 });
  } else {
    shadow(p, 16, 29, 15, 2.5);
    peak(p, 16, 1, 15, 30, ROCK_GREY, 0.32);
  }
}

function caveEntrance(p: Paint): void {
  mountain(p, 0, 0);
  const mouth = union(ell(16, 21, 6.5, 6.5), box(9.5, 21, 13, 9));
  const arch = cut(union(ell(16, 21, 9, 9), box(7, 21, 18, 9)), mouth);
  p.fill(clip(arch, box(0, 0, S, 30)), '#6a645c', { tex: 0.6, seed: 12 });
  p.fill(mouth, '#2a2028', { grad: 1.5, bevel: 0 });
  p.flat(clip(mouth, box(0, 14, S, 16)), '#08060a', 0.6);
}

function ruins(p: Paint): void {
  const stone = '#8a8a8a';
  shadow(p, 16, 28, 14, 2.5);
  p.fill(box(4, 8, 6, 19), stone, { gradX: 0.8, tex: 0.5, seed: 1 });
  p.fill(poly([3, 5, 16, 5, 15, 8, 13, 10, 3, 10]), stone, { grad: 0.6, tex: 0.5, seed: 2 });
  p.fill(box(21, 13, 6, 15), '#7a7a7a', { gradX: 0.8, tex: 0.5, seed: 3 });
  p.fill(poly([20, 10, 30, 10, 30, 14, 26, 15, 20, 15]), '#7a7a7a', { grad: 0.6, tex: 0.5, seed: 4 });
  [[5, 12], [8, 20], [22, 18], [25, 24]].forEach(([x, y]) => p.px(x, y, tone('#5e8a3a', 0)));
  [[6, 27, 2], [28, 28, 1.5], [17, 28, 1.6]].forEach(([x, y, r]) => p.fill(ell(x, y, r * 1.4, r), stone, { sphere: true }));
  // Campfire.
  p.fill(seg(12, 26, 19, 24, 1.2), '#6a4020', {});
  p.fill(seg(12, 24, 19, 26, 1.2), '#5a3818', {});
  p.fill(poly([13, 25, 15.5, 16, 17, 19, 18.5, 17, 19, 25]), '#e07020', { grad: 1.6, bevel: 0 });
  p.fill(ell(16, 23, 1.8, 2.2), '#ffe070', { bevel: 0 });
}

function town(p: Paint): void {
  const house = (x: number, y: number, roof: string): void => {
    shadow(p, x + 6, y + 14, 7, 1.6);
    p.fill(box(x, y + 6, 12, 8), '#e8d8b0', { tex: 0.25, seed: x });
    p.fill(poly([x - 1, y + 7, x + 2, y, x + 10, y, x + 13, y + 7]), roof, { grad: 0.8, bevel: 1 });
    for (let ry = y + 2; ry < y + 7; ry += 2) {
      p.flat(clip(box(x - 1, ry, 14, 1), poly([x - 1, y + 7, x + 2, y, x + 10, y, x + 13, y + 7])), tone(roof, -1), 0.6);
    }
    p.fill(box(x + 5, y + 9, 3, 5), '#5a3a1a', { bevel: 0, grad: 0.6 });
    p.fill(box(x + 1, y + 9, 3, 3), '#ffd870', { bevel: 0, dither: 0 });
    p.fill(box(x + 9, y + 9, 2, 3), '#ffd870', { bevel: 0, dither: 0 });
  };
  house(2, 1, '#c0392b');
  house(18, 4, '#2b6cc0');
  house(9, 16, '#c0392b');
}

function fountain(p: Paint, frame: number): void {
  p.fill(ell(16, 17, 14, 12), '#8a8a9a', { sphere: true, tex: 0.3 });
  p.fill(ell(16, 17, 10.5, 8.5), '#3a7ae0', { grad: 0.8, bevel: 0, dither: 0.6 });
  p.flat(cut(ell(16, 17, 10.5, 8.5), ell(16, 18, 10.5, 8.5)), tone('#3a7ae0', -3));
  const ringR = 4 + frame * 2.5;
  p.flat(cut(ell(16, 18, ringR + 1, (ringR + 1) * 0.75), ell(16, 18, ringR, ringR * 0.75)), tone('#3a7ae0', 2), 0.7);
  p.fill(ell(16, 15, 2.5, 3.5), '#9a9aaa', { sphere: true });
  for (let y = 5 + frame; y < 13; y += 2) {
    p.px(16, y, '#e0f0ff');
    p.px(15 - frame, y + 1, '#b0d8ff');
    p.px(17 + frame, y + 1, '#b0d8ff');
  }
}

function torch(p: Paint, frame: number): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x + 0.5 - 16, (y + 0.5 - 10) * 1.1) / 15;
      if (d < 1) {
        p.px(x, y, '#ffaa3c', (1 - d) ** 1.6 * 0.38);
      }
    }
  }
  const iron = '#3a3a40';
  p.fill(seg(16, 18, 16, 26, 1.3), iron, {});
  p.fill(box(12, 16, 8, 3), iron, {});
  p.fill(box(14, 10, 4, 8), '#6a4420', { gradX: 1 });
  const lean = frame === 0 ? 0 : 1.5;
  p.fill(poly([16 + lean, 1, 20, 7, 19.5, 11, 12.5, 11, 12, 7]), '#e8641c', { grad: 1.4, bevel: 0, dither: 0.3 });
  p.fill(ell(16 + lean / 2, 8, 2, 3), '#ffd060', { bevel: 0 });
  p.fill(ell(16, 9, 1, 1.5), '#fff8d0', { bevel: 0 });
}

function caveExitGlow(p: Paint): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 16) / 14;
      if (d < 1) {
        p.px(x, y, d < 0.35 ? '#fffbe8' : '#ffe8a0', Math.min(1, (1 - d) ** 1.3 * 1.15));
      }
    }
  }
}

// --- Cave rock ----------------------------------------------------------------------------------

/** Cave wall of packed rocks (a seamless Voronoi pattern), each rock lit from the top-left. */
function rockWall(p: Paint, seed: number): void {
  const base = '#3a2e2c';
  const r = ramp(base);
  const n = 4;
  const cell = S / n;
  const pts: Array<[number, number]> = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      pts.push([i * cell + 1 + hash(i, j, seed) * (cell - 2), j * cell + 1 + hash(j, i, seed + 1) * (cell - 2)]);
    }
  }
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let d1 = Infinity;
      let d2 = Infinity;
      let near: [number, number] = [0, 0];
      pts.forEach(([px, py]) => {
        for (let oy = -S; oy <= S; oy += S) {
          for (let ox = -S; ox <= S; ox += S) {
            const dx = x + 0.5 - (px + ox);
            const dy = y + 0.5 - (py + oy);
            const d = Math.hypot(dx, dy);
            if (d < d1) {
              d2 = d1;
              d1 = d;
              near = [dx, dy];
            } else if (d < d2) {
              d2 = d;
            }
          }
        }
      });
      if (d2 - d1 < 1.1) {
        p.px(x, y, r[0]);
        continue;
      }
      const v = -(near[0] + near[1]) / 6 + (d2 - d1 < 2.2 ? -0.8 : 0.3) + (hash(x, y, seed) - 0.5) * 0.6;
      const k = Math.max(-2, Math.min(2, Math.round(v + dither(x, y) * 0.6)));
      p.px(x, y, r[k + 3]);
    }
  }
}

function rock(p: Paint, _f: number, variant: number): void {
  rockWall(p, 5 + variant);
  if (variant === 1) {
    shadow(p, 16, 25, 11, 3);
    p.fill(ell(16, 17, 10.5, 8.5), '#5a4a44', { sphere: true, tex: 0.4, seed: 6 });
  } else if (variant === 2) {
    const crystal = (x: number, y: number, h: number, c: string): void => {
      p.fill(poly([x, y - h, x + 2.5, y - h + 3, x + 2, y, x - 2, y, x - 2.5, y - h + 3]), c, { gradX: 1.2, bevel: 0, dither: 0 });
      p.px(x - 1, y - h + 2, '#ffffff');
    };
    crystal(7, 13, 8, '#5ac8d8');
    crystal(23, 25, 9, '#8a6ae0');
    crystal(26, 23, 5, '#b8a0ff');
    crystal(12, 27, 5, '#5ac8d8');
  }
}

function caveFloor(p: Paint): void {
  ground(p, '#6a5a4a', 6, 0.8);
  pebbles(p, '#8a7a68', 6, 0.01);
}

/** Every procedural tile at native 32x32 resolution (see {@link paintTile}). */
export const HD_TILES: ReadonlyMap<string, HdTile> = new Map<string, HdTile>([
  ['grass', { ground: grass }],
  ['townGrass', { ground: townGrass }],
  [
    'road',
    {
      ground: (p) => {
        ground(p, '#c8a165', 4, 0.8, 0.3);
        pebbles(p, '#a08a68', 4, 0.012);
      },
    },
  ],
  ['forest', { ground: grass, object: (p, _f, v) => treeVariant(p, v, FOREST_TREE) }],
  ['tree', { ground: townGrass, object: (p, _f, v) => treeVariant(p, v, TOWN_TREE) }],
  ['hills', { ground: grass, object: hills }],
  ['mountain', { ground: grass, object: mountain }],
  ['water', { ground: waterTile }],
  ['bridge', { ground: (p, f) => water(p, f), object: bridgeDeck }],
  ['town', { ground: grass, object: town }],
  ['caveEntrance', { ground: grass, object: caveEntrance }],
  [
    'ruins',
    {
      ground: (p) => {
        ground(p, '#4a6a3a', 3, 0.9);
        pebbles(p, '#6a6a6a', 3, 0.02);
      },
      object: ruins,
    },
  ],
  ['wall', { ground: wall }],
  ['cobble', { ground: cobble }],
  ['carpet', { ground: carpet }],
  ['wood', { ground: (p) => planks(p, '#9a6a3a', 9) }],
  ['counter', { ground: counter }],
  ['fountain', { ground: cobble, object: fountain }],
  ['rock', { ground: rock }],
  ['torch', { ground: (p) => rockWall(p, 5), object: torch }],
  ['caveFloor', { ground: caveFloor }],
  ['caveWater', { ground: caveWaterTile }],
  ['caveExit', { ground: caveFloor, object: caveExitGlow, outline: false }],
]);

/**
 * Paints tile `id` at 32x32. With `withGround` false only the object layer is painted (to sit on
 * sheet ground art); returns null when there is nothing to paint (unknown tile or no object).
 */
export function paintTile(id: string, frame: number, variant: number, withGround = true): Paint | null {
  const t = HD_TILES.get(id);
  if (!t || (!withGround && !t.object)) {
    return null;
  }
  const p = new Paint(S, S);
  if (withGround) {
    t.ground?.(p, frame, variant);
  }
  if (t.object) {
    const layer = new Paint(S, S);
    t.object(layer, frame, variant);
    if (t.outline !== false) {
      layer.outline();
    }
    p.draw(layer);
  }
  return p;
}

/** Tall solid tiles (town walls, cave rock) that cast a short shadow onto the tile below them. */
export const SHADOW_CASTERS: ReadonlySet<string> = new Set(['wall', 'rock', 'torch']);

/** Rows of the soft shadow a {@link SHADOW_CASTERS} tile drops onto the top of the tile below it. */
export const WALL_SHADOW_ROWS = 10;

/**
 * Transparent tile with a soft shadow along its top edge, drawn over a floor tile that sits directly below a
 * wall so the wall's base reads clearly against the floor.
 */
export function paintWallShadow(): Paint {
  const p = new Paint(S, S);
  for (let y = 0; y < WALL_SHADOW_ROWS; y++) {
    const fade = 1 - y / WALL_SHADOW_ROWS;
    for (let x = 0; x < S; x++) {
      const a = 0.5 * fade * fade + ((x + y) % 2 === 0 ? 0.04 : 0);
      p.px(x, y, '#140c24', a);
    }
  }
  return p;
}
