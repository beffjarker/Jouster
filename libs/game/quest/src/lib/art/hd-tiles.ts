import {
  ART_SCALE,
  Color,
  Paint,
  Shape,
  box,
  clip,
  cut,
  ell,
  hash,
  poly,
  ramp,
  seg,
  shadeOf,
  tone,
  union,
  valueNoise,
} from './hd-paint';

/**
 * Paint units per tile edge (16 logical pixels at 2 units each, the same layout as an LPC tile). Tiles are
 * stored at {@link ART_SCALE} real pixels per unit, i.e. 4 real pixels per logical pixel.
 */
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
const F = ART_SCALE;
/** Real pixels per tile edge. */
const FS = S * F;
const fwrap = (n: number): number => ((n % FS) + FS) % FS;
/** Signed distance from `a` to `b` around a wrapping tile edge. */
const wrapDelta = (a: number, b: number): number => {
  let d = a - b;
  if (d > S / 2) {
    d -= S;
  } else if (d < -S / 2) {
    d += S;
  }
  return d;
};

function dither(fx: number, fy: number): number {
  return ((fx & 1) ^ (fy & 1)) * 0.5 - 0.25;
}

function clampK(v: number, lo = -3, hi = 2): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

/** Calls `fn` for every real pixel with its centre (x, y) in paint units and its real coordinates. */
function fine(p: Paint, fn: (x: number, y: number, fx: number, fy: number) => void): void {
  p.pixels((u, v, fx, fy) => fn(u + 0.5, v + 0.5, fx, fy));
}

/** Thin line through `pts` ([x0, y0, x1, y1, ...]) in `color`, optionally with a lit lip underneath. */
function crack(p: Paint, pts: readonly number[], color: Color, lip?: Color, r = 0.28): void {
  for (let i = 0; i + 3 < pts.length; i += 2) {
    if (lip) {
      p.flat(seg(pts[i], pts[i + 1] + 0.5, pts[i + 2], pts[i + 3] + 0.5, r), lip, 0.7);
    }
  }
  for (let i = 0; i + 3 < pts.length; i += 2) {
    p.flat(seg(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], r), color);
  }
}

/** Soft patchy ground in shades of `base` with fine grit, seamless across tiles. */
function ground(p: Paint, base: string, seed: number, patch = 1, grain = 0.35): void {
  const r = ramp(base);
  fine(p, (x, y, fx, fy) => {
    const v =
      (valueNoise(x, y, 8, seed) - 0.5) * 2 * patch +
      (valueNoise(x, y, 2, seed + 7) - 0.5) * 1.4 * grain +
      (hash(fx, fy, seed) - 0.5) * 2 * grain;
    p.fpx(fx, fy, r[clampK(v + dither(fx, fy), -2, 1) + 3]);
  });
}

/** Grass blades: curved strokes from a shaded root to a lit tip, plus dark gaps between them. */
function blades(p: Paint, base: string, seed: number, density: number): void {
  const r = ramp(base);
  const count = Math.round(S * S * density * 2.5);
  for (let i = 0; i < count; i++) {
    const bx = Math.floor(hash(i, 1, seed) * FS);
    const by = Math.floor(hash(i, 2, seed) * FS);
    const len = 3 + Math.floor(hash(i, 3, seed) * 5);
    const lean = (hash(i, 4, seed) - 0.5) * 3;
    p.fpx(fwrap(bx + 1), fwrap(by + 1), r[0], 0.7);
    p.fpx(fwrap(bx + 2), fwrap(by + 1), r[1], 0.4);
    for (let j = 0; j < len; j++) {
      const t = j / (len - 1);
      const k = j === len - 1 ? 2 : clampK(-2 + t * 3.6, -2, 1);
      p.fpx(fwrap(bx + Math.round(lean * t * t)), fwrap(by - j), r[k + 3]);
    }
  }
  for (let i = 0; i < count / 2; i++) {
    p.fpx(Math.floor(hash(i, 5, seed) * FS), Math.floor(hash(i, 6, seed) * FS), r[1]);
  }
}

/** A few tiny flowers: four petals round a bright centre. */
function flowers(p: Paint, seed: number, count: number, petal: string): void {
  for (let i = 0; i < count; i++) {
    const fx = 6 + Math.floor(hash(i, 7, seed) * (FS - 12));
    const fy = 6 + Math.floor(hash(i, 8, seed) * (FS - 12));
    p.fpx(fx + 1, fy + 2, '#1e4a1e', 0.6);
    [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ].forEach(([dx, dy]) => p.fpx(fx + dx, fy + dy, dx < 0 || dy < 0 ? tone(petal, 1) : petal));
    p.fpx(fx, fy, '#ffe070');
  }
}

/** Little stones, each a lit sphere with a soft contact shadow. */
function pebbles(p: Paint, stone: string, seed: number, density: number): void {
  const count = Math.round(S * S * density);
  for (let i = 0; i < count; i++) {
    const x = 2 + hash(i, 5, seed) * (S - 4);
    const y = 2 + hash(i, 6, seed) * (S - 4);
    const rx = 0.6 + hash(i, 7, seed) * 1.1;
    const ry = rx * (0.6 + hash(i, 8, seed) * 0.3);
    p.flat(ell(x + 0.4, y + 0.45, rx, ry), '#0a0806', 0.3);
    p.fill(ell(x, y, rx, ry), shadeOf(stone, Math.round((hash(i, 9, seed) - 0.5) * 3) / 2), {
      sphere: true,
      bevel: 0,
      dither: 0.3,
    });
  }
}

const GRASS = '#3c9a3c';
const TOWN_GRASS = '#48a648';

function grass(p: Paint, _f = 0, variant = 0): void {
  ground(p, GRASS, 1, 0.8);
  blades(p, GRASS, 1, 0.035);
  if (variant === 2) {
    flowers(p, 3, 3, '#f0f0ff');
  }
}

function townGrass(p: Paint, _f = 0, variant = 0): void {
  ground(p, TOWN_GRASS, 2, 0.7);
  blades(p, TOWN_GRASS, 2, 0.03);
  if (variant === 2) {
    flowers(p, 4, 2, '#f8d040');
  }
}

/**
 * Staggered blocks (bricks, cobbles): `rowH` x `blockW` blocks separated by mortar, each block bevelled,
 * mottled, sometimes chipped or cracked, seamless across tiles.
 */
function masonry(p: Paint, base: string, mortar: string, rowH: number, blockW: number, seed: number, round = false): void {
  const r = ramp(base);
  const m = ramp(mortar);
  fine(p, (x, y, fx, fy) => {
    const row = Math.floor(y / rowH);
    const ly = y - row * rowH;
    const sx = (x + (row % 2 === 0 ? 0 : blockW / 2)) % S;
    const col = Math.floor(sx / blockW);
    const lx = sx - col * blockW;
    const dl = lx - 1;
    const dt = ly - 1;
    const dr = blockW - lx;
    const db = rowH - ly;
    const bh = hash(col, row, seed);
    let inside = dl >= 0 && dt >= 0;
    if (inside && round) {
      const ex = Math.min(dl, dr);
      const ey = Math.min(dt, db);
      if (ex < 1.8 && ey < 1.8 && Math.hypot(1.8 - ex, 1.8 - ey) > 1.8) {
        inside = false;
      }
    }
    if (inside && bh < 0.35) {
      const cx = bh < 0.17 ? dl : dr;
      const cy = hash(col, row, seed + 9) < 0.5 ? dt : db;
      if (cx + cy < 0.9 + bh * 3) {
        inside = false;
      }
    }
    if (!inside) {
      // Mortar: deeper in the shadow under the block above, gritty.
      const k = (dt < 0 && ly < 0.5 ? 1 : 2) - (hash(fx, fy, seed + 2) < 0.2 ? 1 : 0);
      p.fpx(fx, fy, m[k]);
      return;
    }
    let v =
      (bh - 0.5) * 1.2 +
      (valueNoise(x, y, 2, seed + col * 7 + row * 13) - 0.5) * 1.1 +
      (hash(fx, fy, seed) - 0.5) * 0.7;
    const near = Math.min(dt, dl);
    const far = Math.min(db, dr);
    if (near < 0.6) {
      v += 1.2;
    } else if (near < 1.2) {
      v += 0.5;
    }
    if (far < 0.6) {
      v -= 1.4;
    } else if (far < 1.2) {
      v -= 0.6;
    }
    if (hash(col, row, seed + 5) < 0.25) {
      const from = blockW * (0.2 + hash(col, row, seed + 8) * 0.3);
      const cy =
        1 +
        1.5 +
        hash(col, row, seed + 6) * (rowH - 4) +
        (lx - blockW / 2) * (hash(col, row, seed + 7) - 0.5) * 0.5 +
        Math.sin(lx * 2.1 + bh * 9) * 0.4;
      if (lx > from && lx < blockW - 1.5) {
        if (Math.abs(ly - cy) < 0.3) {
          v = -3;
        } else if (ly - cy >= 0.3 && ly - cy < 0.8) {
          v += 0.8;
        }
      }
    }
    p.fpx(fx, fy, r[clampK(v + dither(fx, fy) * 0.6) + 3]);
  });
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
    crack(p, [19.5, 9.5, 20.8, 11, 21.2, 12.4, 22.8, 13.3, 24.6, 14.6], tone(WALL, -3), tone(WALL, 1));
    crack(p, [21.2, 12.4, 22.6, 11.4, 23.4, 11.6], tone(WALL, -3), undefined, 0.22);
  } else if (variant === 2) {
    // Moss creeping along a mortar line, with a few hanging strands.
    const moss = '#5e8a3a';
    for (let i = 0; i < 16; i++) {
      const x = 2 + i * 0.8;
      const h = 1 + hash(i, 0, 9) * 2.4;
      p.fill(ell(x, 24.6 - h / 2, 0.95, h / 2 + 0.35), moss, { sphere: true, bevel: 0, tex: 0.5, seed: i });
    }
    [
      [4, 25.2, 2.5],
      [8, 25, 3.5],
      [11.5, 25.2, 2],
    ].forEach(([x, y, l]) => p.flat(seg(x, y, x + 0.4, y + l, 0.25), tone(moss, -1)));
    p.spot(5, 21.5, tone(moss, 2));
    p.spot(9.5, 22, tone(moss, 2));
  }
}

/** Plank floor: boards with flowing grain, knots, staggered joints and nail heads. */
function planks(p: Paint, base: string, seed: number): void {
  const r = ramp(base);
  fine(p, (x, y, fx, fy) => {
    const row = Math.floor(y / 8);
    const ly = y - row * 8;
    const dj = wrapDelta(x, ((row * 13 + 5) % S) + 0.5);
    let v = (hash(row, 0, seed) - 0.5) * 0.8;
    const warp = valueNoise(x, y, 8, seed + row) * 3;
    v += Math.sin((ly + warp) * 2.4) * 0.45 + (valueNoise(x, y * 4, 4, seed + 50 + row, 128) - 0.5) * 1.1;
    v += (hash(fx, fy, seed) - 0.5) * 0.4;
    const dk = Math.hypot(wrapDelta(x, hash(row, 3, seed) * S) / 1.8, y - row * 8 - 4);
    if (dk < 2.2) {
      v += Math.cos(dk * 4.5) * 0.9 - 0.6;
    }
    if (ly < 0.5) {
      v = -3;
    } else if (ly < 1) {
      v = -2;
    } else if (ly < 1.6) {
      v += 1;
    } else if (ly > 7.4) {
      v -= 1;
    }
    if (ly >= 0.5) {
      if (dj >= -0.5 && dj < 0.5) {
        v = dj < 0 ? -3 : -2;
      } else if (dj >= 0.5 && dj < 1.1) {
        v += 1;
      } else if (dj >= -1.1 && dj < -0.5) {
        v -= 0.7;
      }
    }
    p.fpx(fx, fy, r[clampK(v + dither(fx, fy) * 0.5) + 3]);
  });
  for (let row = 0; row < 4; row++) {
    const joint = ((row * 13 + 5) % S) + 0.5;
    [-2, 2.5].forEach((o) =>
      [3, 6].forEach((ny) => {
        const nx = (joint + o + S) % S;
        p.fill(ell(nx, row * 8 + ny, 0.65), '#5a5a62', { sphere: true, bevel: 0, dither: 0 });
      }),
    );
  }
}

function carpet(p: Paint): void {
  const red = '#a02030';
  const gold = '#d8a830';
  const rr = ramp(red);
  const gg = ramp(gold);
  fine(p, (x, y, fx, fy) => {
    // Basket weave: alternate 2x2 blocks of horizontal and vertical threads.
    const across = ((fx >> 1) + (fy >> 1)) % 2 === 0;
    const weave = (across ? fy : fx) % 2 ? -0.4 : 0.4;
    let v = (valueNoise(x, y, 8, 11) - 0.5) * 0.6 + weave + (hash(fx, fy, 11) - 0.5) * 0.3;
    const d = Math.abs((x % 16) - 8.5) + Math.abs((y % 16) - 9.5);
    let c = rr;
    if (d >= 4.5 && d < 5.5) {
      v -= 2;
    } else if (d >= 3.5 && d < 4.5) {
      c = gg;
      v -= 0.6;
    } else if (d >= 1.6 && d < 2.3) {
      c = gg;
      v -= 1.2;
    } else if (d < 1) {
      c = gg;
      v += 1;
    }
    p.fpx(fx, fy, c[clampK(v) + 3]);
  });
  p.fill(box(0, 0, S, 3), gold, { bevel: 0, grad: 1, dither: 0 });
  for (let x = 0; x < S; x += 2) {
    p.fill(ell(x + 1, 1.5, 0.6, 0.6), red, { bevel: 0, dither: 0, shade: -0.5 });
  }
  p.flat(box(0, 3, S, 0.5), tone(red, -3));
  for (let fx = 0; fx < FS; fx += 2) {
    p.fpx(fx, 3 * F + 1, tone(gold, -1));
    p.fpx(fx, 3 * F + 2, tone(gold, -2), 0.7);
  }
}

function counter(p: Paint): void {
  planks(p, '#6a4020', 21);
  const top = '#b07a40';
  p.fill(box(0, 0, S, 8), top, { bevel: 0, grad: 1, tex: 0.3, seed: 4 });
  for (let i = 0; i < 5; i++) {
    const y = 1.6 + i * 1.3 + hash(i, 0, 4) * 0.4;
    p.flat(seg(0, y, S, y + (hash(i, 1, 4) - 0.5) * 0.8, 0.22), tone(top, -1), 0.6);
  }
  p.flat(box(0, 0, S, 0.5), tone(top, 2));
  p.flat(box(0, 7.5, S, 0.5), tone(top, -1));
  p.flat(box(0, 8, S, 1), tone('#6a4020', -3));
  p.flat(box(0, 9, S, 1), tone('#6a4020', -2));
}

// --- Water --------------------------------------------------------------------------------------

/** Rippling water; `frame` shifts the ripples and glints and `phase` varies the pattern per variant. */
function water(p: Paint, frame: number, base = '#2a5fc8', phase = 0): void {
  const r = ramp(base);
  fine(p, (x, y, fx, fy) => {
    const v =
      (valueNoise(x + frame * 2, y, 8, 40 + phase) - 0.5) * 1.8 +
      (valueNoise(x - frame, y, 4, 41 + phase) - 0.5) * 0.8 +
      (valueNoise(x + frame, y * 2, 2, 42 + phase, 64) - 0.5) * 0.6 -
      0.45;
    p.fpx(fx, fy, r[clampK(v + dither(fx, fy) * 0.5, -2, 0) + 3]);
  });
  for (let cy = 0; cy < 4; cy++) {
    for (let cx = 0; cx < 4; cx++) {
      const n = hash(cx, cy, 50 + phase);
      const wy = Math.round((cy * 8 + n * 6 + 1.5) * F);
      const wx = Math.round((cx * 8 + hash(cy, cx, 51 + phase) * 8 + frame * 3) * F);
      const len = Math.round((3 + n * 3) * F);
      for (let i = 0; i < len; i++) {
        const t = i / (len - 1);
        const fy = fwrap(wy - Math.round(Math.sin(t * Math.PI) * 1.5));
        const fx = fwrap(wx + i);
        p.fpx(fx, fy, r[t < 0.15 || t > 0.85 ? 4 : 5]);
        if (i > 1 && i < len - 2) {
          p.fpx(fx, fwrap(fy + 2), r[1], 0.7);
        }
      }
    }
  }
  for (let i = 0; i < 3; i++) {
    const gx = Math.floor(hash(i, frame, 60 + phase) * FS);
    const gy = Math.floor(hash(frame, i, 61 + phase) * FS);
    p.fpx(gx, gy, '#ffffff');
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].forEach(([dx, dy]) => p.fpx(fwrap(gx + dx), fwrap(gy + dy), '#dcefff', 0.5));
  }
}

function waterTile(p: Paint, frame: number, variant: number): void {
  water(p, frame, '#2a5fc8', variant * 5);
  if (variant === 1) {
    const leaf = '#3a8a3a';
    const pad = cut(ell(11, 12, 7, 4.5), poly([11, 12, 18, 9, 18, 13]));
    p.flat(ell(11.5, 13, 7, 4.5), tone('#2a5fc8', -2), 0.5);
    p.fill(pad, leaf, { sphere: true, rim: false });
    [
      [5, 10],
      [5.5, 14.5],
      [9, 16],
      [14, 16],
      [8, 8],
      [13, 8],
    ].forEach(([x, y]) => p.flat(clip(seg(11, 12, x, y, 0.22), pad), tone(leaf, -1.5), 0.8));
    p.flat(clip(cut(ell(11, 12, 7, 4.5), ell(11, 11.6, 6.6, 4.2)), pad), tone(leaf, 1.5));
    p.flat(ell(23, 25, 4, 1), tone('#2a5fc8', -2), 0.6);
    const petal = '#f0a8c8';
    [
      [21, 22.5, -0.4],
      [25, 22.5, 0.4],
      [23, 23.4, 0],
      [21.8, 21, -0.2],
      [24.2, 21, 0.2],
    ].forEach(([x, y]) => p.fill(ell(x, y, 1.5, 1.1), petal, { sphere: true, bevel: 0, dither: 0.2 }));
    p.fill(ell(23, 20.6, 1, 1.6), tone(petal, 0.5), { sphere: true, bevel: 0, dither: 0 });
    p.fill(ell(23, 22, 0.8), '#fff0a0', { sphere: true, bevel: 0, dither: 0 });
  } else if (variant === 2) {
    p.flat(ell(17, 20, 9, 3), tone('#2a5fc8', 2), 0.7);
    p.flat(cut(ell(17, 20.5, 10.5, 3.6), ell(17, 20.3, 9.5, 3.1)), tone('#2a5fc8', 1), 0.6);
    const stone = '#7a7a82';
    const boulder = clip(ell(17, 18, 7, 6), box(0, 0, S, 20));
    p.fill(boulder, stone, { sphere: true, tex: 0.3, seed: 2 });
    crack(p, [13, 14, 15, 15.5, 15.5, 18], tone(stone, -2.5), tone(stone, 1), 0.22);
    p.fill(clip(ell(13.5, 13.5, 3, 1.4), boulder), '#5e8a3a', { sphere: true, bevel: 0, tex: 0.4 });
  }
}

function caveWaterTile(p: Paint, frame: number, variant: number): void {
  water(p, frame, '#1a3a7a', variant * 6);
  if (variant === 2) {
    p.flat(ell(16, 26, 7, 2.5), tone('#1a3a7a', 2), 0.7);
    const rock = '#4a3c36';
    const shape = poly([10, 26, 22, 26, 18, 12, 16, 4, 14, 12]);
    p.fill(shape, rock, { gradX: 1.2, tex: 0.4, seed: 5 });
    for (let y = 9; y < 26; y += 2.5) {
      p.flat(clip(seg(10, y, 22, y + 0.8, 0.2), shape), tone(rock, -1.5), 0.6);
    }
    p.flat(clip(seg(16, 4, 15, 25, 0.3), shape), tone(rock, 1), 0.5);
  }
}

function bridgeDeck(p: Paint): void {
  const wood = '#a0703a';
  for (let x = 0; x < S; x += 8) {
    const plank = box(x, 5, 8, 22);
    p.fill(plank, wood, { tex: 0.5, seed: x, shade: (hash(x, 0, 3) - 0.5) * 0.8 });
    for (let g = 0; g < 3; g++) {
      const gx = x + 2 + g * 2 + hash(x, g, 5);
      p.flat(clip(seg(gx, 6, gx + (hash(g, x, 6) - 0.5) * 1.5, 26, 0.2), plank), tone(wood, -1.5), 0.55);
    }
    [8, 23].forEach((y) => {
      p.fill(ell(x + 2, y, 0.65), '#4a4a50', { sphere: true, bevel: 0, dither: 0 });
      p.fill(ell(x + 6, y, 0.65), '#4a4a50', { sphere: true, bevel: 0, dither: 0 });
    });
  }
  const rail = '#6a4520';
  [2, 26].forEach((y) => {
    p.fill(box(0, y, S, 4), rail, { tex: 0.3, grad: 0.8 });
    p.flat(seg(0, y + 2, S, y + 1.6, 0.2), tone(rail, -1.5), 0.6);
  });
  [3, 19].forEach((x) => {
    p.fill(box(x, 0, 4, 7), '#5a3a1a', { gradX: 0.8 });
    p.fill(box(x, 24, 4, 7), '#5a3a1a', { gradX: 0.8 });
    p.fill(box(x - 0.5, 23.5, 5, 1.5), tone('#5a3a1a', 1), { bevel: 0 });
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
  const shape = union(box(14, top, 5, 29 - top), poly([12, 29, 21, 29, 18, 26, 15, 26]));
  p.fill(shape, c.trunk, { gradX: 1, tex: 0.4, seed: 8 });
  [14.8, 16.2, 17.6].forEach((x, i) =>
    p.flat(clip(seg(x, top, x + (i - 1) * 0.6, 29, 0.2), shape), tone(c.trunk, -2), 0.7),
  );
  p.flat(ell(16.5, 24, 0.8, 0.6), tone(c.trunk, -3));
}

/** Small lit leaves scattered over `canopy`, brighter towards the top-left. */
function leaves(p: Paint, canopy: Shape, leaf: string, count: number, seed: number): void {
  const w = canopy.x1 - canopy.x0;
  const h = canopy.y1 - canopy.y0;
  for (let i = 0; i < count; i++) {
    const x = canopy.x0 + hash(i, 1, seed) * w;
    const y = canopy.y0 + hash(i, 2, seed) * h;
    if (!canopy.test(x - 0.5, y - 0.5)) {
      continue;
    }
    const light = 1.3 - ((x - canopy.x0) / w) * 1.6 - ((y - canopy.y0) / h) * 1.8;
    const k = Math.max(-2.5, Math.min(2, Math.round(light * 2) / 2));
    const lean = hash(i, 3, seed) < 0.5 ? -0.5 : 0.5;
    p.fill(clip(seg(x - lean, y - 0.4, x + lean, y + 0.4, 0.55), canopy), shadeOf(leaf, k), { bevel: 0, dither: 0 });
    if (k > 0) {
      p.spot(x - lean * 0.6, y - 0.5, shadeOf(leaf, Math.min(2, k + 1)));
    }
  }
}

/** Round broadleaf tree built from lit leaf clumps covered in individual leaves. */
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
    p.flat(clip(cut(ell(x, y + 0.6, 3.6, 3), ell(x, y, 3.6, 3)), canopy), tone(c.leaf, -2.5), 0.6);
  });
  leaves(p, canopy, c.leaf, 140, 7);
}

/** Three-tier conifer of needle strokes, lit from the left. */
function pineTree(p: Paint, c: TreeColors): void {
  shadow(p, 16, 28, 10, 3);
  const bark = box(14, 22, 4, 7);
  p.fill(bark, c.trunk, { gradX: 1, tex: 0.4 });
  p.flat(clip(seg(15.5, 22, 15.8, 29, 0.2), bark), tone(c.trunk, -2), 0.7);
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
    const tier = poly(pts);
    p.fill(tier, leaf, { gradX: 1.4, grad: 0.5, tex: 0.6, seed: top, bevel: 0 });
    for (let i = 0; i < 34; i++) {
      const t = hash(i, top, 4);
      const y = top + 2 + t * (bottom - top - 3);
      const reach = ((y - top) / (bottom - top)) * half;
      const x = 16 + (hash(top, i, 5) * 2 - 1) * reach;
      const dir = x < 16 ? -1 : 1;
      const k = x < 16 ? 1 - (y - top) / (bottom - top) : -1.5;
      p.flat(clip(seg(x, y, x + dir * 1.6, y + 1.3, 0.25), tier), shadeOf(leaf, Math.round(k * 2) / 2));
    }
    p.flat(seg(16, top + 2, 16, bottom - 3, 0.3), tone(leaf, -1.5), 0.6);
  });
}

function fruitTree(p: Paint, c: TreeColors): void {
  roundTree(p, c);
  const fruit: ReadonlyArray<[number, number]> = [[9, 12], [19, 7], [23, 14], [14, 18], [13, 6]];
  fruit.forEach(([x, y]) => {
    p.fill(ell(x, y, 1.8), '#d03a2a', { sphere: true, bevel: 0, dither: 0 });
    p.flat(seg(x, y - 1.8, x + 0.3, y - 2.5, 0.2), '#4a2a10');
    p.fill(ell(x + 1, y - 2.2, 0.8, 0.45), '#4aa040', { bevel: 0, dither: 0 });
    p.spot(x - 0.8, y - 0.8, '#ffd0b0');
    p.spot(x - 0.3, y - 1, '#ffffff');
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
    for (let i = 0; i < 26; i++) {
      const x = cx - rx + hash(i, cx, 2) * rx * 2;
      const y = base - hash(cx, i, 3) * ry;
      if (!s.test(x, y + 1)) {
        continue;
      }
      const k = x < cx ? 1.5 : -1;
      p.flat(seg(x, y, x + (hash(i, 9, cx) - 0.5) * 1.2, y - 1.4, 0.22), shadeOf(green, k));
    }
    p.flat(clip(cut(ell(cx - 0.6, base - 0.6, rx, ry), ell(cx, base, rx - 0.6, ry - 0.6)), s), tone(green, 1.5), 0.5);
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
  // Strata and gullies.
  for (let i = 1; i < 6; i++) {
    const y = top + (h * i) / 6 + 1;
    p.flat(clip(seg(cx - half, y + 1.5, cx + half, y - 1, 0.2), shape), tone(rock, -2), 0.55);
  }
  crack(p, [cx - half * 0.4, top + h * 0.6, cx - half * 0.3, top + h * 0.7, cx - half * 0.2, top + h * 0.8], tone(rock, -2.5), tone(rock, 1));
  crack(p, [cx + half * 0.5, top + h * 0.7, cx + half * 0.42, top + h * 0.82, cx + half * 0.35, bottom - 1], tone(rock, -3));
  crack(p, [cx - 1, top + h * 0.35, cx - 1.6, top + h * 0.5, cx - 1.2, top + h * 0.62], tone(rock, -2.5), tone(rock, 1), 0.22);
  if (snow > 0) {
    const sy = top + h * snow;
    const cap = clip(shape, poly([cx - half, top - 1, cx + half, top - 1, cx + half, sy, cx + half * 0.4, sy - 2,
      cx + 1, sy + 1, cx - half * 0.4, sy - 2.5, cx - half, sy + 1]));
    p.fill(cap, '#eef0f6', { bevel: 0, tex: 0.2 });
    p.fill(clip(cap, shade), '#eef0f6', { shade: -1.3, bevel: 0 });
    for (let i = 0; i < 6; i++) {
      const x = cx - half * 0.3 + hash(i, cx, 4) * half * 0.6;
      const y = top + 1 + hash(cx, i, 5) * (sy - top - 1);
      if (cap.test(x, y)) {
        p.spot(x, y, '#ffffff');
      }
    }
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
    crack(p, [4, 24, 5.5, 25.5, 5, 28], tone('#7a7268', -2.5), tone('#7a7268', 1), 0.22);
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
  for (let a = 0; a < 7; a++) {
    const t = Math.PI * (1 + (a + 0.5) / 7);
    p.flat(clip(seg(16 + Math.cos(t) * 6.5, 21 + Math.sin(t) * 6.5, 16 + Math.cos(t) * 9, 21 + Math.sin(t) * 9, 0.22), arch), tone('#6a645c', -2.5));
  }
  p.fill(mouth, '#2a2028', { grad: 1.5, bevel: 0 });
  p.flat(clip(mouth, box(0, 14, S, 16)), '#08060a', 0.6);
  [11, 14, 17.5, 20.5].forEach((x, i) => {
    const len = 2 + (i % 2) * 1.5;
    p.fill(poly([x - 0.9, 15.5 - Math.abs(x - 16) * 0.3, x + 0.9, 15.5 - Math.abs(x - 16) * 0.3, x, 15.5 + len]), '#6a645c', {
      gradX: 1,
      bevel: 0,
    });
  });
}

function ruins(p: Paint): void {
  const stone = '#8a8a8a';
  shadow(p, 16, 28, 14, 2.5);
  const brickLines = (shape: Shape, x0: number, x1: number, y0: number, y1: number, c: string): void => {
    for (let y = y0 + 2.5; y < y1; y += 2.5) {
      p.flat(clip(box(x0, y, x1 - x0, 0.4), shape), tone(c, -2), 0.7);
      const off = Math.round((y - y0) / 2.5) % 2 ? 1.5 : 3;
      for (let x = x0 + off; x < x1; x += 3) {
        p.flat(clip(box(x, y - 2.5, 0.4, 2.5), shape), tone(c, -2), 0.6);
      }
    }
  };
  const left = box(4, 8, 6, 19);
  p.fill(left, stone, { gradX: 0.8, tex: 0.5, seed: 1 });
  brickLines(left, 4, 10, 8, 27, stone);
  p.fill(poly([3, 5, 16, 5, 15, 8, 13, 10, 3, 10]), stone, { grad: 0.6, tex: 0.5, seed: 2 });
  const right = box(21, 13, 6, 15);
  p.fill(right, '#7a7a7a', { gradX: 0.8, tex: 0.5, seed: 3 });
  brickLines(right, 21, 27, 13, 28, '#7a7a7a');
  p.fill(poly([20, 10, 30, 10, 30, 14, 26, 15, 20, 15]), '#7a7a7a', { grad: 0.6, tex: 0.5, seed: 4 });
  // Ivy.
  [[5, 12], [8, 20], [22, 18], [25, 24], [6, 15], [9, 9.5], [23, 21]].forEach(([x, y], i) => {
    p.fill(ell(x, y, 0.9, 0.7), '#5e8a3a', { sphere: true, bevel: 0, dither: 0, shade: i % 2 ? 0.5 : -0.5 });
  });
  p.flat(seg(5, 12, 6, 15, 0.18), '#3e5a2a');
  [[6, 27, 2], [28, 28, 1.5], [17, 28, 1.6]].forEach(([x, y, r]) => p.fill(ell(x, y, r * 1.4, r), stone, { sphere: true }));
  // Campfire.
  p.fill(seg(12, 26, 19, 24, 1.2), '#6a4020', { tex: 0.4 });
  p.fill(seg(12, 24, 19, 26, 1.2), '#5a3818', { tex: 0.4 });
  p.fill(poly([13, 25, 15.5, 16, 17, 19, 18.5, 17, 19, 25]), '#e07020', { grad: 1.6, bevel: 0 });
  p.fill(poly([14.5, 25, 16, 19, 17.5, 21, 18, 25]), '#f8a030', { grad: 1, bevel: 0 });
  p.fill(ell(16, 23, 1.8, 2.2), '#ffe070', { bevel: 0 });
  [[14.5, 14], [17.5, 13], [16, 11.5]].forEach(([x, y]) => p.spot(x, y, '#ffd060'));
}

function town(p: Paint): void {
  const house = (x: number, y: number, roof: string): void => {
    const plaster = '#e8d8b0';
    const beam = '#6a4424';
    shadow(p, x + 6, y + 14, 7, 1.6);
    p.fill(box(x, y + 6, 12, 8), plaster, { tex: 0.25, seed: x });
    p.flat(box(x, y + 6.8, 12, 0.5), beam);
    p.flat(box(x + 4.5, y + 7, 0.5, 7), beam);
    const roofShape = poly([x - 1, y + 7, x + 2, y, x + 10, y, x + 13, y + 7]);
    p.fill(roofShape, roof, { grad: 0.8, bevel: 1 });
    for (let ry = y + 1.5; ry < y + 7; ry += 1.4) {
      p.flat(clip(box(x - 1, ry, 14, 0.4), roofShape), tone(roof, -1.5), 0.8);
      const off = Math.round((ry - y) / 1.4) % 2 ? 0 : 0.9;
      for (let sx = x - 1 + off; sx < x + 13; sx += 1.8) {
        p.flat(clip(box(sx, ry - 1, 0.35, 1), roofShape), tone(roof, -1), 0.6);
      }
    }
    p.fill(box(x + 9, y - 1.5, 1.8, 3), '#8a5a4a', { gradX: 0.8, bevel: 0 });
    p.fill(box(x + 5, y + 9, 3, 5), '#5a3a1a', { bevel: 0, grad: 0.6 });
    p.flat(box(x + 6.3, y + 9, 0.35, 5), tone('#5a3a1a', -2));
    p.spot(x + 7.4, y + 11.6, '#e0c060');
    [
      [x + 1, 3],
      [x + 9, 2],
    ].forEach(([wx, ww]) => {
      p.fill(box(wx, y + 9, ww, 3), '#ffd870', { bevel: 0, grad: 0.8, dither: 0 });
      p.flat(box(wx + ww / 2 - 0.2, y + 9, 0.4, 3), beam);
      p.flat(box(wx, y + 10.3, ww, 0.4), beam);
      p.flat(box(wx - 0.3, y + 12, ww + 0.6, 0.5), tone(plaster, -2));
    });
  };
  house(2, 1, '#c0392b');
  house(18, 4, '#2b6cc0');
  house(9, 16, '#c0392b');
}

function fountain(p: Paint, frame: number): void {
  const stone = '#8a8a9a';
  const rim = ell(16, 17, 14, 12);
  p.fill(rim, stone, { sphere: true, tex: 0.3 });
  for (let a = 0; a < 12; a++) {
    const t = (a / 12) * Math.PI * 2;
    p.flat(
      clip(seg(16 + Math.cos(t) * 10.5, 17 + Math.sin(t) * 8.5, 16 + Math.cos(t) * 14, 17 + Math.sin(t) * 12, 0.2), rim),
      tone(stone, -2.5),
    );
  }
  p.fill(ell(16, 17, 10.5, 8.5), '#3a7ae0', { grad: 0.8, bevel: 0, dither: 0.6 });
  p.flat(cut(ell(16, 17, 10.5, 8.5), ell(16, 18, 10.5, 8.5)), tone('#3a7ae0', -3));
  const ringR = 4 + frame * 2.5;
  p.flat(cut(ell(16, 18, ringR + 0.7, (ringR + 0.7) * 0.75), ell(16, 18, ringR, ringR * 0.75)), tone('#3a7ae0', 2), 0.7);
  const ring2 = 2 + ((frame + 1) % 2) * 2.5;
  p.flat(cut(ell(16, 18, ring2 + 0.5, (ring2 + 0.5) * 0.75), ell(16, 18, ring2, ring2 * 0.75)), tone('#3a7ae0', 1), 0.5);
  p.fill(ell(16, 15, 2.5, 3.5), '#9a9aaa', { sphere: true });
  p.fill(ell(16, 11.6, 1.2, 0.8), '#9a9aaa', { sphere: true, bevel: 0 });
  for (let y = 5 + frame; y < 13; y += 2) {
    p.flat(seg(16, y, 16, y + 0.8, 0.25), '#e0f0ff');
    p.flat(seg(15 - frame, y + 1, 14.6 - frame, y + 1.8, 0.22), '#b0d8ff');
    p.flat(seg(17 + frame, y + 1, 17.4 + frame, y + 1.8, 0.22), '#b0d8ff');
  }
}

function torch(p: Paint, frame: number): void {
  fine(p, (x, y, fx, fy) => {
    const d = Math.hypot(x - 16, (y - 10) * 1.1) / 15;
    if (d < 1) {
      p.fpx(fx, fy, '#ffaa3c', (1 - d) ** 1.6 * 0.38);
    }
  });
  const iron = '#3a3a40';
  p.fill(seg(16, 18, 16, 26, 1.3), iron, {});
  p.fill(box(12, 16, 8, 3), iron, {});
  [13, 16, 19].forEach((x) => p.fill(ell(x, 17.5, 0.5), tone(iron, 1.5), { bevel: 0, dither: 0 }));
  const handle = box(14, 10, 4, 8);
  p.fill(handle, '#6a4420', { gradX: 1 });
  p.flat(box(14, 12, 4, 0.6), '#3a2410');
  p.flat(box(14, 14.5, 4, 0.6), '#3a2410');
  const lean = frame === 0 ? 0 : 1.5;
  p.fill(poly([16 + lean, 1, 20, 7, 19.5, 11, 12.5, 11, 12, 7]), '#e8641c', { grad: 1.4, bevel: 0, dither: 0.3 });
  p.fill(poly([16 + lean * 0.7, 3.5, 18.8, 8, 18.2, 11, 13.8, 11, 13.2, 8]), '#f89030', { grad: 1, bevel: 0, dither: 0.3 });
  p.fill(ell(16 + lean / 2, 8, 2, 3), '#ffd060', { bevel: 0 });
  p.fill(ell(16, 9, 1, 1.5), '#fff8d0', { bevel: 0 });
  [[13, 2], [19.5, 3.5]].forEach(([x, y]) => p.spot(x + lean, y - frame, '#ffd060'));
}

function caveExitGlow(p: Paint): void {
  fine(p, (x, y, fx, fy) => {
    const d = Math.hypot(x - 16, y - 16) / 14;
    if (d < 1) {
      p.fpx(fx, fy, d < 0.35 ? '#fffbe8' : '#ffe8a0', Math.min(1, (1 - d) ** 1.3 * 1.15));
    }
  });
}

// --- Cave rock ----------------------------------------------------------------------------------

/** Cave wall of packed rocks (a seamless Voronoi pattern), each rock lit from the top-left and veined. */
function rockWall(p: Paint, seed: number): void {
  const base = '#3a2e2c';
  const r = ramp(base);
  const n = 4;
  const cell = S / n;
  const pts: Array<[number, number, number]> = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const px = i * cell + 1 + hash(i, j, seed) * (cell - 2);
      const py = j * cell + 1 + hash(j, i, seed + 1) * (cell - 2);
      for (let oy = -S; oy <= S; oy += S) {
        for (let ox = -S; ox <= S; ox += S) {
          pts.push([px + ox, py + oy, j * n + i]);
        }
      }
    }
  }
  fine(p, (x, y, fx, fy) => {
    let d1 = Infinity;
    let d2 = Infinity;
    let near: [number, number] = [0, 0];
    let id = 0;
    pts.forEach(([px, py, k]) => {
      const dx = x - px;
      const dy = y - py;
      const d = Math.hypot(dx, dy);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        near = [dx, dy];
        id = k;
      } else if (d < d2) {
        d2 = d;
      }
    });
    const gap = d2 - d1;
    if (gap < 0.8) {
      p.fpx(fx, fy, r[0]);
      return;
    }
    let v = -(near[0] + near[1]) / 6 + (hash(fx, fy, seed) - 0.5) * 0.5;
    v += (valueNoise(x, y, 2, seed + id) - 0.5) * 0.9;
    v += Math.sin((x * 0.5 + y) * 1.6 + hash(id, 0, seed) * 6) * 0.3;
    if (gap < 1.5) {
      v += near[0] + near[1] < 0 ? 0.9 : -1;
    }
    if (hash(fx, fy, seed + 3) < 0.006) {
      p.fpx(fx, fy, r[5]);
      return;
    }
    p.fpx(fx, fy, r[clampK(v + dither(fx, fy) * 0.6, -2, 2) + 3]);
  });
}

function rock(p: Paint, _f: number, variant: number): void {
  rockWall(p, 5 + variant);
  if (variant === 1) {
    const stone = '#5a4a44';
    shadow(p, 16, 25, 11, 3);
    p.fill(ell(16, 17, 10.5, 8.5), stone, { sphere: true, tex: 0.4, seed: 6 });
    crack(p, [10, 13, 12.5, 15, 12, 18, 14, 21], tone(stone, -2.5), tone(stone, 1));
    crack(p, [20, 11, 21, 14, 23.5, 15], tone(stone, -2.5), tone(stone, 1), 0.22);
  } else if (variant === 2) {
    const crystal = (x: number, y: number, h: number, c: string): void => {
      const shape = poly([x, y - h, x + 2.5, y - h + 3, x + 2, y, x - 2, y, x - 2.5, y - h + 3]);
      p.fill(shape, c, { gradX: 1.2, bevel: 0, dither: 0 });
      p.flat(clip(seg(x, y - h, x, y, 0.22), shape), tone(c, 1.5));
      p.flat(clip(seg(x - 2.5, y - h + 3, x, y - h + 3.8, 0.2), shape), tone(c, 1), 0.7);
      p.flat(clip(seg(x, y - h + 3.8, x + 2.5, y - h + 3, 0.2), shape), tone(c, -1.5), 0.7);
      p.spot(x - 1, y - h + 2, '#ffffff');
      p.spot(x - 1.2, y - h + 4.5, '#ffffff');
    };
    crystal(7, 13, 8, '#5ac8d8');
    crystal(23, 25, 9, '#8a6ae0');
    crystal(26, 23, 5, '#b8a0ff');
    crystal(12, 27, 5, '#5ac8d8');
  }
}

function caveFloor(p: Paint): void {
  const dirt = '#6a5a4a';
  ground(p, dirt, 6, 0.8);
  crack(p, [3, 6, 5, 7.2, 6, 9, 8.5, 9.6], tone(dirt, -2), tone(dirt, 1), 0.22);
  crack(p, [20, 22, 22.5, 21.4, 24, 23, 26.5, 23.6], tone(dirt, -2), tone(dirt, 1), 0.22);
  pebbles(p, '#8a7a68', 6, 0.012);
}

/** Every procedural tile at native resolution (see {@link paintTile}). */
export const HD_TILES: ReadonlyMap<string, HdTile> = new Map<string, HdTile>([
  ['grass', { ground: grass }],
  ['townGrass', { ground: townGrass }],
  [
    'road',
    {
      ground: (p) => {
        ground(p, '#c8a165', 4, 0.8, 0.3);
        pebbles(p, '#a08a68', 4, 0.014);
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
 * Paints tile `id` ({@link HD_TILE} paint units square at {@link ART_SCALE}). With `withGround` false only the
 * object layer is painted (to sit on sheet ground art); returns null when there is nothing to paint (unknown
 * tile or no object).
 */
export function paintTile(id: string, frame: number, variant: number, withGround = true): Paint | null {
  const t = HD_TILES.get(id);
  if (!t || (!withGround && !t.object)) {
    return null;
  }
  const p = new Paint(S, S, F);
  if (withGround) {
    t.ground?.(p, frame, variant);
  }
  if (t.object) {
    const layer = new Paint(S, S, F);
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

/** Paint-unit rows of the soft shadow a {@link SHADOW_CASTERS} tile drops onto the top of the tile below it. */
export const WALL_SHADOW_ROWS = 10;

/**
 * Transparent tile with a soft shadow along its top edge, drawn over a floor tile that sits directly below a
 * wall so the wall's base reads clearly against the floor.
 */
export function paintWallShadow(): Paint {
  const p = new Paint(S, S, F);
  fine(p, (_x, y, fx, fy) => {
    if (y < WALL_SHADOW_ROWS) {
      const fade = 1 - y / WALL_SHADOW_ROWS;
      p.fpx(fx, fy, '#140c24', 0.5 * fade * fade + ((fx + fy) % 2 === 0 ? 0.03 : 0));
    }
  });
  return p;
}
