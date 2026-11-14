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
function rockWall(p: Paint, seed: number, base = '#3a2e2c'): void {
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

// --- Southlands (Act II) ------------------------------------------------------------------------

const SAND = '#e0c47a';
const MARSH = '#4e6a32';
const MESA_ROCK = '#b0683e';

/** Wind ripples: wavy bands of lit and shaded sand, seamless across tiles. */
function ripples(p: Paint, base: string, seed: number, period: number, amount: number): void {
  const r = ramp(base);
  fine(p, (x, y, fx, fy) => {
    const w = Math.sin(((y + Math.sin((x / S) * Math.PI * 2 + seed) * 1.6) / period) * Math.PI * 2);
    if (w > 0.82) {
      p.fpx(fx, fy, r[4], amount);
    } else if (w < -0.9) {
      p.fpx(fx, fy, r[2], amount * 0.8);
    }
  });
}

function sand(p: Paint, _f = 0, variant = 0): void {
  ground(p, SAND, 21, 0.6, 0.3);
  ripples(p, SAND, 1, 8, 0.5);
  if (variant === 1) {
    pebbles(p, '#a8885a', 21, 0.01);
  } else if (variant === 2) {
    // A bleached bone half-buried in the sand.
    p.flat(seg(9, 21.6, 19, 18.6, 0.9), '#0a0806', 0.2);
    p.fill(seg(9, 21, 19, 18, 0.8), '#f0e8d8', { bevel: 0 });
    [[9, 21], [19, 18]].forEach(([x, y]) => {
      p.fill(ell(x - 0.6, y - 0.7, 1.2), '#f4ecdc', { sphere: true, bevel: 0, dither: 0 });
      p.fill(ell(x + 0.6, y + 0.7, 1.2), '#e0d4bc', { sphere: true, bevel: 0, dither: 0 });
    });
  }
}

function dunes(p: Paint): void {
  ground(p, SAND, 22, 0.7, 0.25);
  // A dune crest: lit windward slope above a shaded lee slope.
  fine(p, (x, y, fx, fy) => {
    const c = 15 + Math.sin((x / S) * Math.PI * 2) * 5;
    const d = y - c;
    if (d > 0 && d < 7) {
      p.fpx(fx, fy, tone(SAND, -1.5), 0.55 * (1 - d / 7) + 0.1);
    } else if (d <= 0 && d > -5) {
      p.fpx(fx, fy, tone(SAND, 1.5), 0.35 * (1 + d / 5));
    }
  });
  ripples(p, SAND, 2, 5, 0.35);
}

function sandRoad(p: Paint): void {
  ground(p, '#c89a5a', 23, 0.6, 0.35);
  pebbles(p, '#9a7a52', 23, 0.016);
  crack(p, [4, 10, 7, 11, 9, 10.4], tone('#c89a5a', -2), tone('#c89a5a', 1), 0.2);
}

function cactus(p: Paint, _f: number, variant: number): void {
  const green = '#4a8a3a';
  const arm = (x0: number, y0: number, x1: number, top: number): void => {
    p.fill(union(box(Math.min(x0, x1), y0 - 1.3, Math.abs(x1 - x0), 2.6), ell(x1, y0, 1.3)), green, { gradX: 1, bevel: 0 });
    p.fill(union(box(x1 - 1.3, top, 2.6, y0 - top), ell(x1, top, 1.3)), green, { gradX: 1.4, rim: true });
  };
  shadow(p, 17, 28.5, 8, 2);
  if (variant === 1) {
    // A squat barrel cactus with a flower.
    const body = ell(16, 22, 6.5, 6.5);
    p.fill(body, green, { sphere: true, tex: 0.3 });
    for (let i = -2; i <= 2; i++) {
      p.flat(clip(seg(16 + i * 2.4, 15.5, 16 + i * 3.2, 28.5, 0.22), body), tone(green, -2), 0.7);
    }
    p.fill(ell(16, 15.6, 2, 1.3), '#f05a7a', { sphere: true, bevel: 0 });
    p.spot(16, 15.4, '#ffe070');
  } else {
    const trunkShape = union(box(13.8, 6, 4.4, 23), ell(16, 6, 2.2));
    arm(14, 18, 8.5, 11 + variant);
    arm(18, 14, 23.5, 8);
    p.fill(trunkShape, green, { gradX: 1.4, tex: 0.3, rim: true });
    [15, 17].forEach((x) => p.flat(clip(seg(x, 5, x, 29, 0.2), trunkShape), tone(green, -2), 0.7));
  }
  // Spines.
  for (let i = 0; i < 22; i++) {
    const x = 7 + hash(i, 1, 31) * 18;
    const y = 6 + hash(i, 2, 31) * 22;
    p.fpx(Math.floor(x * F), Math.floor(y * F), '#f4f0d0', 0.85);
  }
}

function mesa(p: Paint, _f: number, variant: number): void {
  shadow(p, 16, 29, 15, 2.5);
  if (variant === 1) {
    peak(p, 21, 4, 11, 29, MESA_ROCK, 0);
    peak(p, 9, 10, 9, 30, '#c07a4a', 0);
  } else if (variant === 2) {
    const rock = '#a86a44';
    p.fill(ell(10, 24, 7, 5.5), rock, { sphere: true, tex: 0.4 });
    p.fill(ell(22, 21, 8, 7.5), MESA_ROCK, { sphere: true, tex: 0.4, seed: 3 });
    crack(p, [19, 16, 21, 19, 20.4, 23], tone(MESA_ROCK, -2.5), tone(MESA_ROCK, 1), 0.22);
  } else {
    // A flat-topped butte with sandstone strata.
    const butte = poly([4, 30, 6, 8, 9, 5, 23, 4.5, 26, 8, 28, 30]);
    p.fill(butte, MESA_ROCK, { gradX: 1.2, tex: 0.5, seed: 5, bevel: 1 });
    p.fill(clip(butte, box(18, 0, 14, S)), MESA_ROCK, { shade: -1.2, tex: 0.5, seed: 6, bevel: 0 });
    p.fill(clip(butte, box(0, 0, S, 7.5)), '#d08a5a', { bevel: 0, tex: 0.3 });
    for (let y = 11; y < 30; y += 4) {
      p.flat(clip(seg(3, y + 0.8, 29, y - 0.5, 0.3), butte), tone(MESA_ROCK, -2), 0.6);
      p.flat(clip(seg(3, y + 1.6, 29, y + 0.3, 0.2), butte), tone(MESA_ROCK, 1), 0.4);
    }
    crack(p, [11, 9, 12, 14, 11, 19, 12.5, 25], tone(MESA_ROCK, -3), tone(MESA_ROCK, 1));
  }
}

function marsh(p: Paint, _f = 0, variant = 0): void {
  ground(p, MARSH, 24, 0.9, 0.35);
  // Muddy puddles and reed clumps.
  fine(p, (x, y, fx, fy) => {
    const n = valueNoise(x, y, 8, 25);
    if (n < 0.26) {
      p.fpx(fx, fy, n < 0.2 ? '#2e3a22' : '#3a4628', 0.85);
    }
  });
  blades(p, '#5e7a3a', 24, 0.02);
  if (variant === 1) {
    const reed = (x: number): void => {
      p.flat(seg(x, 26, x + 0.6, 14, 0.25), '#6a7a3a');
      p.fill(ell(x + 0.6, 14, 0.75, 2), '#6a4a2a', { sphere: true, bevel: 0 });
    };
    [9, 10.6, 12, 21, 22.4].forEach(reed);
  } else if (variant === 2) {
    p.fill(ell(17, 18, 4, 1.8), '#3a4a2a', { bevel: 0, grad: -0.8 });
    p.fill(ell(16, 17.6, 1.6, 0.9), '#6a9a4a', { bevel: 0, rim: true });
  }
}

function boardwalk(p: Paint): void {
  marsh(p);
  const wood = '#8a6a44';
  [3, 25].forEach((y) => p.fill(box(0, y, S, 2), tone(wood, -2), { bevel: 0 }));
  for (let x = 0; x < S; x += 4) {
    const board = box(x + 0.2, 4, 3.6, 22);
    p.fill(board, wood, { tex: 0.6, seed: x + 50, shade: (hash(x, 1, 51) - 0.5) * 0.9, grad: 0.4 });
    p.flat(clip(seg(x + 1.4, 4, x + 1.6, 26, 0.18), board), tone(wood, -1.5), 0.5);
    p.spot(x + 2, 6, '#3a3a40');
    p.spot(x + 2, 24, '#3a3a40');
  }
  p.flat(box(0, 26, S, 1), '#0a1206', 0.35);
}

function mireTree(p: Paint, _f: number, variant: number): void {
  const bark = '#4a3a24';
  shadow(p, 16, 28.5, 10, 2.5);
  const lean = variant === 1 ? 2 : 0;
  const trunkShape = union(poly([12, 29, 20, 29, 18 + lean, 9, 15 + lean, 9]), ell(16 + lean, 29, 4, 1));
  p.fill(trunkShape, bark, { gradX: 1.2, tex: 0.6, seed: 61 });
  [14.5, 16.5].forEach((x) => p.flat(clip(seg(x, 28, x + lean + 0.6, 10, 0.2), trunkShape), tone(bark, -2), 0.7));
  const branch = (x0: number, y0: number, x1: number, y1: number): void => p.fill(seg(x0, y0, x1, y1, 0.8), bark, { bevel: 0, gradX: 1 });
  branch(16 + lean, 12, 7, 6);
  branch(17 + lean, 10, 26, 4);
  branch(16.5 + lean, 16, 24, 13);
  if (variant !== 2) {
    // Sparse drooping canopy and hanging moss.
    const canopy = union(ell(9, 6, 5, 3), ell(16 + lean, 5, 6, 3.5), ell(24, 5, 5, 3));
    p.fill(canopy, '#3a5a2a', { sphere: true, tex: 0.6, seed: 62, bevel: 0 });
    leaves(p, canopy, '#3a5a2a', 50, 63);
  }
  [[8, 8, 6], [12, 7, 4], [22, 7, 7], [25, 6, 4]].forEach(([x, y, l]) => {
    p.flat(seg(x, y, x + 0.3, y + l, 0.3), '#7a8a5a', 0.85);
    p.flat(seg(x + 0.8, y, x + 0.9, y + l * 0.7, 0.22), '#6a7a4a', 0.75);
  });
}

function bog(p: Paint, frame: number, variant: number): void {
  water(p, frame, '#3e4a26', variant * 4);
  if (variant === 1) {
    p.fill(ell(10, 12, 3, 1.4), '#5a8a3a', { bevel: 0, rim: true });
    p.fill(ell(22, 22, 2.4, 1.1), '#5a8a3a', { bevel: 0, rim: true });
  } else if (variant === 2) {
    // Rising swamp gas.
    const r = 1 + frame * 0.6;
    p.flat(cut(ell(17, 18, r + 0.5), ell(17, 18, r)), '#9ab06a', 0.7);
    p.fill(ell(12, 22, 0.9), '#7a8a4a', { sphere: true, bevel: 0, dither: 0 });
  }
}

/** Mossy grey boulders that wall in the Mire Shrine. */
function mireRock(p: Paint, _f: number, variant: number): void {
  const stone = '#6a7064';
  shadow(p, 16, 29, 14, 2.5);
  const rocks =
    variant === 1
      ? union(ell(11, 22, 8, 7), ell(22, 24, 6.5, 5.5))
      : variant === 2
        ? union(ell(16, 20, 11, 9), ell(8, 26, 5, 3.5))
        : union(ell(16, 17, 9, 12), ell(24, 25, 5, 4.5));
  p.fill(rocks, stone, { sphere: true, tex: 0.6, seed: 80 + variant, rim: true });
  crack(p, [14, 10, 15.5, 15, 14.5, 21], tone(stone, -3), tone(stone, 1));
  // Moss creeping over the tops.
  fine(p, (x, y, fx, fy) => {
    if (rocks.test(x, y) && rocks.test(x, y + 3) && !rocks.test(x, y - 1.5) && valueNoise(x, y, 3, 81) > 0.3) {
      p.fpx(fx, fy, valueNoise(x, y, 2, 82) > 0.5 ? '#5a7a34' : '#4a6a2c', 0.9);
    }
  });
}

function shrineEntrance(p: Paint): void {
  shrineFront(p, '#c8a878', '#f0c040');
}

/** The Mire Shrine: the same temple front, in sunken mossy stone with a green lamp. */
function mireEntrance(p: Paint): void {
  shrineFront(p, '#6e7468', '#8ae070');
  fine(p, (x, y, fx, fy) => {
    if (y > 9 && y < 29 && (x < 11 || x > 21) && valueNoise(x, y, 3, 83) > 0.62) {
      p.fpx(fx, fy, '#4a6a2c', 0.85);
    }
  });
}

function shrineFront(p: Paint, stone: string, lamp: string): void {
  shadow(p, 16, 29, 15, 2.5);
  const front = box(4, 10, 24, 19);
  p.fill(front, stone, { gradX: 0.8, tex: 0.4, seed: 71 });
  for (let y = 13; y < 29; y += 3) {
    p.flat(clip(box(4, y, 24, 0.4), front), tone(stone, -2), 0.6);
  }
  p.fill(poly([2, 11, 16, 2, 30, 11]), tone(stone, -0.5), { grad: 0.8, bevel: 1, tex: 0.3 });
  p.fill(ell(16, 7.5, 2, 2), lamp, { sphere: true, bevel: 0 });
  [5, 23].forEach((x) => {
    p.fill(box(x, 11, 4, 18), tone(stone, 0.5), { gradX: 1.2, tex: 0.3, seed: x });
    p.fill(box(x - 0.5, 27.5, 5, 1.5), tone(stone, -1), { bevel: 0 });
  });
  const door = union(ell(16, 18, 4.5, 4.5), box(11.5, 18, 9, 11));
  p.fill(door, '#2a1e18', { grad: 1.4, bevel: 0 });
  p.flat(clip(door, box(0, 22, S, 8)), '#08060a', 0.6);
}

function pass(p: Paint): void {
  // Cliffs either side of a narrow gap.
  shadow(p, 4, 29, 6, 2);
  shadow(p, 28, 29, 6, 2);
  peak(p, 3, 2, 8, 30, ROCK_GREY, 0.25);
  peak(p, 29, 4, 8, 30, '#958e80', 0.2);
}

const SUN_STONE = '#c8a46a';
const MIRE_STONE = '#5a6a52';

function sunWall(p: Paint, _f: number, variant: number): void {
  masonry(p, SUN_STONE, '#6a4a2a', 8, 16, 41);
  if (variant === 1) {
    // A carved sun glyph.
    p.fill(ell(16, 12, 3, 3), '#e8b840', { sphere: true, bevel: 0 });
    for (let a = 0; a < 8; a++) {
      const t = (a / 8) * Math.PI * 2;
      p.flat(seg(16 + Math.cos(t) * 3.8, 12 + Math.sin(t) * 3.8, 16 + Math.cos(t) * 5.5, 12 + Math.sin(t) * 5.5, 0.3), '#c89830');
    }
  } else if (variant === 2) {
    crack(p, [6, 17.5, 8, 19, 8.6, 21, 10.5, 22], tone(SUN_STONE, -3), tone(SUN_STONE, 1));
  }
}

function sunFloor(p: Paint, _f = 0, variant = 0): void {
  masonry(p, '#d8be8a', '#8a6a42', 16, 16, 42);
  fine(p, (x, y, fx, fy) => {
    if (valueNoise(x, y, 6, 43) > 0.72) {
      p.fpx(fx, fy, SAND, 0.6);
    }
  });
  if (variant === 1) {
    p.flat(cut(ell(16, 16, 5, 5), ell(16, 16, 4.2, 4.2)), '#a87a3a', 0.6);
  }
}

function mireWall(p: Paint, _f: number, variant: number): void {
  masonry(p, MIRE_STONE, '#2a3226', 8, 12, 44);
  const moss = '#4a7a2a';
  for (let i = 0; i < 10 + variant * 6; i++) {
    const x = hash(i, 1, 45 + variant) * S;
    const y = hash(i, 2, 45 + variant) * S;
    p.fill(ell(x, y, 1.1, 0.8), moss, { sphere: true, bevel: 0, dither: 0, shade: hash(i, 3, 45) - 0.5 });
  }
  if (variant === 2) {
    [6, 11, 24].forEach((x, i) => p.flat(seg(x, 8, x + 0.3, 14 + i * 2, 0.25), tone(moss, -1)));
  }
}

function mireFloor(p: Paint, _f = 0, variant = 0): void {
  masonry(p, '#6a7258', '#323a2a', 16, 16, 46, true);
  fine(p, (x, y, fx, fy) => {
    const n = valueNoise(x, y, 8, 47);
    if (n < 0.24) {
      p.fpx(fx, fy, '#2e3a22', 0.7);
    }
  });
  if (variant === 1) {
    pebbles(p, '#5a5a4a', 46, 0.01);
  }
}

// --- Frost Peaks (Act III) ----------------------------------------------------------------------

const SNOW = '#e2eaf4';
const GLACIER_ROCK = '#7a889e';
const ICE = '#a8d0ea';

/** Sparkling ice crystals catching the light. */
function glints(p: Paint, seed: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const fx = Math.floor(hash(i, 1, seed) * FS);
    const fy = Math.floor(hash(i, 2, seed) * FS);
    p.fpx(fx, fy, '#ffffff');
    if (hash(i, 3, seed) > 0.6) {
      p.fpx(fwrap(fx + 1), fy, '#d8ecff', 0.6);
      p.fpx(fx, fwrap(fy + 1), '#d8ecff', 0.6);
    }
  }
}

function snow(p: Paint, _f = 0, variant = 0): void {
  ground(p, SNOW, 90, 0.55, 0.22);
  // Cold blue hollows between the drifts.
  fine(p, (x, y, fx, fy) => {
    if (valueNoise(x, y, 8, 91) < 0.3) {
      p.fpx(fx, fy, '#b8c8e0', 0.45 + dither(fx, fy) * 0.4);
    }
  });
  glints(p, 92, 6);
  if (variant === 1) {
    // A rock poking through the snow.
    p.flat(ell(16.5, 19, 5, 1.4), '#8a9ab8', 0.5);
    const stone = clip(ell(16, 17.5, 4.5, 3.5), box(0, 0, S, 19));
    p.fill(stone, '#6a7488', { sphere: true, tex: 0.4, seed: 93 });
    p.fill(clip(ell(15.5, 15, 4, 1.6), stone), SNOW, { bevel: 0, dither: 0.4 });
  } else if (variant === 2) {
    // Footprints of some beast wandering by.
    [[8, 24], [11, 20], [14, 16], [17, 12], [20, 8]].forEach(([x, y], i) => {
      const dx = i % 2 ? 1.8 : -1.8;
      p.flat(ell(x + dx, y, 1.1, 1.5), '#9aaccc', 0.75);
      p.flat(ell(x + dx, y - 0.4, 0.9, 1), '#b8c8e0', 0.6);
    });
  }
}

function drifts(p: Paint): void {
  ground(p, SNOW, 94, 0.5, 0.2);
  // A drift crest: lit windward slope above a blue lee shadow.
  fine(p, (x, y, fx, fy) => {
    const c = 15 + Math.sin((x / S) * Math.PI * 2 + 1) * 5;
    const d = y - c;
    if (d > 0 && d < 7) {
      p.fpx(fx, fy, '#a8bcd8', 0.6 * (1 - d / 7) + dither(fx, fy) * 0.3);
    } else if (d <= 0 && d > -4) {
      p.fpx(fx, fy, '#ffffff', 0.45 * (1 + d / 4));
    }
  });
  glints(p, 95, 5);
}

function snowRoad(p: Paint): void {
  ground(p, '#c4ccda', 96, 0.6, 0.3);
  // Packed wheel ruts and grit thrown on the ice.
  [9, 23].forEach((x) => {
    p.flat(box(x, 0, 2.5, S), '#a4b0c4', 0.65);
    p.flat(box(x + 0.4, 0, 0.6, S), '#8a96ac', 0.5);
  });
  pebbles(p, '#7a7a80', 96, 0.012);
}

/** A snow-laden pine: the forest pine with snow piled on every tier. */
function snowPine(p: Paint, _f: number, variant: number): void {
  pineTree(p, { leaf: variant === 1 ? '#2a5a4a' : '#1e4a3a', trunk: '#5a3a24' });
  const tiers: ReadonlyArray<[number, number, number]> = [
    [1, 11, 6],
    [6, 18, 9],
    [11, 25, 12],
  ];
  tiers.forEach(([top, bottom, half], i) => {
    const y = top + (bottom - top) * 0.5;
    const cap = poly([16, top - 0.5, 16 + half * 0.55, y, 16 + half * 0.15, y - 1.2, 16 - half * 0.3, y + 0.6, 16 - half * 0.75, y + 1.4]);
    p.fill(cap, SNOW, { bevel: 0, grad: 0.6, dither: 0.5, seed: 97 + i });
    p.flat(seg(16 - half * 0.75, y + 1.5, 16 + half * 0.5, y + 0.2, 0.25), '#a8bcd8', 0.6);
  });
  if (variant === 2) {
    for (let i = 0; i < 8; i++) {
      p.spot(6 + hash(i, 1, 98) * 20, 4 + hash(i, 2, 98) * 22, '#ffffff');
    }
  }
}

function glacier(p: Paint, _f: number, variant: number): void {
  shadow(p, 16, 29, 15, 2.5);
  if (variant === 1) {
    peak(p, 21, 2, 11, 29, GLACIER_ROCK, 0.55);
    peak(p, 9, 8, 9, 30, '#8494aa', 0.45);
  } else if (variant === 2) {
    // A tumbled ice block beside a low crag.
    peak(p, 20, 8, 11, 29, GLACIER_ROCK, 0.5);
    const block = poly([3, 29, 4, 20, 10, 18, 13, 22, 12, 29]);
    p.fill(block, ICE, { gradX: 1.4, bevel: 1, dither: 0.5 });
    p.flat(clip(seg(5, 21, 11, 27, 0.25), block), '#e8f8ff', 0.8);
    crack(p, [8, 19, 8.5, 23, 7.6, 27], tone(ICE, -2.5), undefined, 0.22);
  } else {
    peak(p, 16, 1, 15, 30, GLACIER_ROCK, 0.5);
  }
}

function iceWater(p: Paint, frame: number, variant: number): void {
  water(p, frame, '#2a5a8a', variant * 7);
  if (variant >= 1) {
    // Drifting floes.
    const floe = variant === 1 ? poly([6, 10, 13, 8, 16, 12, 12, 15, 5, 14]) : poly([17, 20, 25, 19, 27, 23, 21, 26, 16, 24]);
    p.flat(clip(floe, box(0, 0, S, S)), '#0a1a30', 0.3);
    p.fill(floe, '#d8ecf8', { bevel: 1, grad: 0.6, dither: 0.4 });
    p.flat(cut(floe, poly([0, 0, S, 0, S, 18, 0, 22])), ICE, 0.5);
  }
}

function frozenLake(p: Paint, _f = 0, variant = 0): void {
  const r = ramp(ICE);
  fine(p, (x, y, fx, fy) => {
    const v = (valueNoise(x, y, 8, 100) - 0.5) * 1.6 + (valueNoise(x, y, 3, 101) - 0.5) * 0.6;
    p.fpx(fx, fy, r[clampK(v + dither(fx, fy) * 0.5, -2, 1) + 3]);
  });
  // Diagonal sheen streaks and cracks in the ice.
  [[2, 14, 12, 4], [14, 30, 28, 16]].forEach(([x0, y0, x1, y1]) => p.flat(seg(x0, y0, x1, y1, 0.4), '#f0faff', 0.55));
  crack(p, [4, 22, 9, 20, 12, 23, 17, 21], tone(ICE, -2.5), '#f0faff', 0.2);
  if (variant === 1) {
    crack(p, [20, 6, 22, 9, 26, 10, 27, 13], tone(ICE, -2.5), '#f0faff', 0.2);
  } else if (variant === 2) {
    // A fish frozen just under the surface.
    p.fill(ell(17, 11, 3.5, 1.4), '#5a7a8a', { bevel: 0, dither: 0.6 });
    p.fill(poly([20, 11, 23, 9.4, 23, 12.6]), '#5a7a8a', { bevel: 0, dither: 0.6 });
  }
  glints(p, 102, 4);
}

/** The Wyvern Roost: a cave mouth in a glacier crag, hung with icicles and littered with bones. */
function roostEntrance(p: Paint): void {
  caveEntrance(p);
  [10.5, 13, 15.5, 18.5, 21].forEach((x, i) => {
    const len = 2.5 + (i % 2) * 2;
    p.fill(poly([x - 0.8, 12.5, x + 0.8, 12.5, x, 12.5 + len]), '#d8f0ff', { gradX: 1.2, bevel: 0, dither: 0 });
  });
  p.fill(seg(8, 29, 12, 27.5, 0.6), '#f0e8d8', { bevel: 0 });
  p.fill(ell(22, 28.5, 1.6, 1.2), '#f0e8d8', { sphere: true, bevel: 0 });
  p.spot(21.5, 28.4, '#2a2028');
}

function iceWall(p: Paint, _f: number, variant: number): void {
  rockWall(p, 60 + variant, '#3e5470');
  // Frost rimes the top edge of every rock.
  fine(p, (x, y, fx, fy) => {
    if (valueNoise(x, y, 3, 103 + variant) > 0.68) {
      p.fpx(fx, fy, '#c8e4f8', 0.55);
    }
  });
  if (variant === 2) {
    [8, 15, 23].forEach((x, i) => {
      const len = 5 + i * 2;
      p.fill(poly([x - 1.2, 0, x + 1.2, 0, x, len]), '#d8f0ff', { gradX: 1.2, bevel: 0, dither: 0 });
    });
  }
}

function iceFloor(p: Paint, _f = 0, variant = 0): void {
  ground(p, '#8aa0bc', 104, 0.7, 0.3);
  fine(p, (x, y, fx, fy) => {
    if (valueNoise(x, y, 6, 105) > 0.7) {
      p.fpx(fx, fy, '#c8dcf0', 0.7);
    }
  });
  crack(p, [4, 8, 7, 9.5, 9, 8.6, 12, 10], tone('#8aa0bc', -2.5), '#d8ecff', 0.2);
  if (variant === 1) {
    pebbles(p, '#6a7488', 104, 0.012);
  } else if (variant === 2) {
    // A shed wyvern scale.
    p.fill(ell(18, 20, 2.6, 1.8), '#e0e8f0', { sphere: true, bevel: 0, rim: true });
    p.flat(seg(16, 20, 20, 20, 0.2), '#8a9ab0', 0.7);
  }
}

// --- Furniture and decor (composite `object@floor` tiles) ---------------------------------------

const OAK = '#8a5a2e';
const DARK_OAK = '#5a3a1e';
const IRON = '#4e4e5a';
const STEEL = '#b8bcc8';
const GOLD = '#d8a838';
const BRASS = '#c8963a';
const LINEN = '#ece4d2';
const BOOKS = ['#8a2a2a', '#2a4a8a', '#2a6a3a', '#7a5a2a', '#5a2a6a', '#a8783a', '#3a3a4a', '#6a8a9a'];

/** Wood with dark grain streaks running across (or, with `vertical`, down) the shape. */
function woodFill(p: Paint, s: Shape, base: Color, seed: number, vertical = false, gap = 2.2): void {
  p.fill(s, base, vertical ? { gradX: 0.7, tex: 0.25, seed } : { grad: 0.7, tex: 0.25, seed });
  const from = vertical ? s.x0 : s.y0;
  const to = vertical ? s.x1 : s.y1;
  for (let i = 0, a = from + gap * 0.6; a < to - 0.4; a += gap, i++) {
    const wob = (hash(i, 1, seed) - 0.5) * 0.8;
    const line = vertical ? seg(a, s.y0, a + wob, s.y1, 0.2) : seg(s.x0, a, s.x1, a + wob, 0.2);
    p.flat(clip(line, s), tone(base, -1), 0.55);
    if (hash(i, 2, seed) < 0.5) {
      const k = from + hash(i, 3, seed) * (to - from);
      const knot = vertical ? ell(a + 0.6, s.y0 + hash(i, 4, seed) * (s.y1 - s.y0), 0.5, 0.9) : ell(k, a + 0.6, 0.9, 0.5);
      p.flat(clip(knot, s), tone(base, -2), 0.6);
    }
  }
}

/** Small round rivet or nail head. */
function rivet(p: Paint, x: number, y: number, color: Color = IRON, r = 0.55): void {
  p.fill(ell(x, y, r), color, { sphere: true, bevel: 0, dither: 0 });
  p.spot(x - r * 0.4, y - r * 0.4, tone(color, 2));
}

/** A candle with a small flame whose top is at `top`; `lean` sways the flame. */
function candle(p: Paint, x: number, top: number, bottom: number, lean = 0): void {
  p.fill(box(x - 0.9, top, 1.8, bottom - top), '#f4ecd8', { gradX: 1, bevel: 0, dither: 0 });
  p.spot(x + 0.5, top + 1.2, '#d8ccb0');
  p.fill(ell(x + lean * 0.4, top - 1.7, 0.95, 1.7), '#ff9a30', { bevel: 0, dither: 0 });
  p.fill(ell(x + lean * 0.2, top - 1.2, 0.45, 0.95), '#fff6c8', { bevel: 0, dither: 0 });
}

/** Warm radial glow centred on (cx, cy). */
function glow(p: Paint, cx: number, cy: number, r: number, color: Color, amount: number): void {
  fine(p, (x, y, fx, fy) => {
    const d = Math.hypot(x - cx, y - cy) / r;
    if (d < 1) {
      p.fpx(fx, fy, color, (1 - d) ** 1.8 * amount);
    }
  });
}

/** Wall hanging: a royal red banner with gold trim and a crown. */
function banner(p: Paint): void {
  const cloth = '#a82828';
  p.flat(box(10, 5, 14, 22), '#140c24', 0.25);
  p.fill(seg(6.5, 3.5, 25.5, 3.5, 0.8), DARK_OAK, { bevel: 0 });
  [6.5, 25.5].forEach((x) => p.fill(ell(x, 3.5, 1.4), GOLD, { sphere: true, bevel: 0, dither: 0 }));
  [10.5, 21.5].forEach((x) => p.fill(ell(x, 4.4, 0.9, 1.1), GOLD, { bevel: 0, dither: 0 }));
  const flag = poly([9, 4.5, 23, 4.5, 23, 27.5, 16, 23.5, 9, 27.5]);
  p.fill(flag, cloth, { gradX: 1.2, tex: 0.25, seed: 61 });
  [11.8, 16.4, 20.6].forEach((x, i) => p.flat(clip(seg(x, 5, x + (i - 1) * 0.3, 27, 0.5), flag), tone(cloth, -1), 0.65));
  [13.6, 18.4].forEach((x) => p.flat(clip(seg(x, 5, x, 25, 0.35), flag), tone(cloth, 1), 0.55));
  const trim = cut(flag, poly([10.2, 4.5, 21.8, 4.5, 21.8, 25.4, 16, 22, 10.2, 25.4]));
  p.fill(trim, GOLD, { bevel: 0, dither: 0, grad: 0.6 });
  const crown = poly([12.4, 16, 12.4, 10.6, 14.2, 12.6, 16, 9.4, 17.8, 12.6, 19.6, 10.6, 19.6, 16]);
  p.fill(crown, GOLD, { grad: 1, dither: 0 });
  [
    [12.4, 10.4],
    [16, 9.2],
    [19.6, 10.4],
  ].forEach(([x, y]) => p.fill(ell(x, y, 0.75), '#fff0a0', { bevel: 0, dither: 0 }));
  p.fill(ell(16, 13.8, 1), '#3a7ad8', { sphere: true, bevel: 0, dither: 0 });
  [13.8, 18.2].forEach((x) => p.fill(ell(x, 14.4, 0.6), '#c83030', { sphere: true, bevel: 0, dither: 0 }));
  p.flat(box(12.4, 16.4, 7.2, 1), tone(GOLD, -1));
  [18.5, 20].forEach((y) => p.flat(box(14, y, 4, 0.5), tone(GOLD, -1), 0.8));
}

/** Gilded royal throne with a tufted red velvet back; wide enough that its arms show beside a seated king. */
function throne(p: Paint): void {
  shadow(p, 16, 29.5, 15, 2.5);
  const frame = '#c8952e';
  const velvet = '#8a1a2e';
  // The tall back and its crest continue in the tile above (see throneTop).
  p.fill(box(3, -1, 26, 21), frame, { gradX: 1, tex: 0.2, seed: 62 });
  p.fill(box(6, -1, 20, 20), velvet, { sphere: true, sphereAmount: 0.5, tex: 0.2, seed: 63 });
  [4, 12].forEach((y) =>
    [10, 16, 22].forEach((x) => {
      p.flat(seg(x, y - 1.2, x, y + 1.2, 0.18), tone(velvet, -1), 0.6);
      p.fill(ell(x, y, 0.55), GOLD, { sphere: true, bevel: 0, dither: 0 });
    }),
  );
  p.fill(box(3, 18.5, 26, 6), velvet, { grad: 0.8, tex: 0.2, seed: 64 });
  p.flat(box(3.5, 18.7, 25, 0.6), tone(velvet, 2), 0.7);
  p.fill(box(3, 24, 26, 2.8), frame, { grad: 0.6 });
  [8, 16, 24].forEach((x) => p.fill(ell(x, 25.4, 0.8), '#c83030', { sphere: true, bevel: 0, dither: 0 }));
  [0.4, 27.4].forEach((x) => {
    p.fill(box(x, 13, 4.2, 14), frame, { gradX: 0.8, tex: 0.2, seed: 66 });
    p.fill(ell(x + 2.1, 13.2, 2.6, 1.6), frame, { sphere: true, bevel: 0 });
    p.fill(ell(x + 2.1, 13, 1, 0.9), '#3ac8e8', { sphere: true, bevel: 0, dither: 0 });
  });
  [4, 26].forEach((x) => p.fill(box(x, 26.5, 2.5, 3.3), tone(frame, -1), { gradX: 0.6 }));
}

/** A goblin's throne of lashed logs, side skulls and a fur seat. */
function crudeThrone(p: Paint): void {
  shadow(p, 16, 29.5, 15, 2.5);
  const wood = '#6a4a2a';
  CRUDE_LOGS.forEach((x, i) => p.fill(box(x, -1, 4.4, 23), wood, { gradX: 1, tex: 0.4, seed: 65 + i }));
  [6, 14].forEach((y) => {
    p.fill(box(1.5, y, 29, 1.3), '#b89a5a', { grad: 0.6, bevel: 0 });
    [5, 10, 15, 20, 25].forEach((x) => p.flat(seg(x, y, x + 0.8, y + 1.3, 0.2), '#7a6234'));
  });
  const fur = '#8a6a48';
  p.fill(ell(16, 22.5, 14, 4.8), fur, { sphere: true, tex: 0.6, seed: 70 });
  for (let i = 0; i < 60; i++) {
    const x = 2.5 + hash(i, 1, 70) * 27;
    const y = 18.5 + hash(i, 2, 70) * 8;
    if (ell(16, 22.5, 13.5, 4.5).test(x, y)) {
      p.flat(seg(x, y, x + (hash(i, 3, 70) - 0.5) * 1.6, y + 1, 0.18), tone(fur, hash(i, 4, 70) < 0.5 ? -2 : 1), 0.8);
    }
  }
  [4, 25].forEach((x) => p.fill(box(x, 25.5, 3, 4.5), tone(wood, -1), { gradX: 0.8 }));
}

/** Left edges of the lashed logs of {@link crudeThrone} and {@link crudeThroneTop}. */
const CRUDE_LOGS = [1.8, 6.4, 11, 15.6, 20.2, 24.8];

/** Small horned skull centred on (`x`, `y`). */
function hornedSkull(p: Paint, x: number, y: number): void {
  [
    [x - 2.2, y - 0.6, x - 4.6, y - 3.8, x - 3.2, y - 3.6, x - 1, y - 1.6],
    [x + 2.2, y - 0.6, x + 4.6, y - 3.8, x + 3.2, y - 3.6, x + 1, y - 1.6],
  ].forEach((pts) => p.fill(poly(pts), '#ece2c4', { grad: 0.8, bevel: 0 }));
  p.fill(ell(x, y, 2.6, 2.3), '#e8dcc0', { sphere: true });
  p.fill(box(x - 1.6, y + 1.2, 3.2, 1.6), '#d8ccac', { bevel: 0 });
  [x - 1, x + 1].forEach((ex) => p.fill(ell(ex, y + 0.2, 0.7, 0.8), '#1a1210', { bevel: 0, dither: 0 }));
  [x - 1.1, x - 0.1, x + 0.9].forEach((tx) => p.flat(box(tx, y + 2.2, 0.4, 0.5), '#1a1210'));
}

/** Tall arched back and crest of {@link throne}, drawn over the tile above so it rises behind the seated king. */
function throneTop(p: Paint): void {
  const frame = '#c8952e';
  const velvet = '#8a1a2e';
  p.fill(poly([3, 33, 3, 9, 8, 5, 16, 3, 24, 5, 29, 9, 29, 33]), frame, { gradX: 1, tex: 0.2, seed: 62 });
  p.fill(poly([6, 33, 6, 10.5, 10, 7.6, 16, 6, 22, 7.6, 26, 10.5, 26, 33]), velvet, {
    sphere: true,
    sphereAmount: 0.4,
    tex: 0.2,
    seed: 63,
  });
  [12, 20, 28].forEach((y) =>
    [10, 16, 22].forEach((x) => {
      p.flat(seg(x, y - 1.2, x, y + 1.2, 0.18), tone(velvet, -1), 0.6);
      p.fill(ell(x, y, 0.55), GOLD, { sphere: true, bevel: 0, dither: 0 });
    }),
  );
  p.fill(poly([16, -1, 18, 2, 16, 5, 14, 2]), GOLD, { grad: 0.8, bevel: 0 });
  p.fill(ell(16, 4, 1.5, 1.7), '#3ac8e8', { sphere: true, bevel: 0, dither: 0 });
  p.spot(15.5, 3.4, '#ffffff');
  [3, 29].forEach((x) => {
    p.fill(ell(x, 8.4, 2), frame, { sphere: true, bevel: 0 });
    p.fill(ell(x, 5.8, 0.9, 1.4), GOLD, { sphere: true, bevel: 0, dither: 0 });
  });
}

/** Log tips and horned skulls of {@link crudeThrone}, drawn over the tile above it. */
function crudeThroneTop(p: Paint): void {
  const wood = '#6a4a2a';
  CRUDE_LOGS.forEach((x, i) => {
    const top = 4 + Math.abs(2.5 - i) * 1.6 + (i % 2) * 1.2;
    p.fill(box(x, top, 4.4, 33 - top), wood, { gradX: 1, tex: 0.4, seed: 65 + i });
    p.fill(ell(x + 2.2, top, 2.2, 1), tone(wood, 1), { bevel: 0 });
    p.flat(ell(x + 2.2, top, 1.2, 0.5), tone(wood, -1));
  });
  [16, 27].forEach((y) => {
    p.fill(box(1.5, y, 29, 1.3), '#b89a5a', { grad: 0.6, bevel: 0 });
    [5, 10, 15, 20, 25].forEach((x) => p.flat(seg(x, y, x + 0.8, y + 1.3, 0.2), '#7a6234'));
  });
  hornedSkull(p, 4, 12);
  hornedSkull(p, 28, 12);
  hornedSkull(p, 16, 4.5);
}

/** Tall brass candelabra with three lit candles. */
function candles(p: Paint): void {
  glow(p, 16, 6, 13, '#ffc860', 0.3);
  shadow(p, 16, 29.3, 6.5, 1.6);
  p.fill(poly([16, 24, 9.5, 29.6, 12, 29.6, 16, 26.6, 20, 29.6, 22.5, 29.6]), BRASS, {});
  p.fill(box(15, 10, 2, 15), BRASS, { gradX: 1 });
  [14, 19.5].forEach((y) => p.fill(ell(16, y, 1.8, 1), BRASS, { sphere: true, bevel: 0 }));
  p.fill(seg(9, 11, 23, 11, 0.7), BRASS, { bevel: 0 });
  p.fill(seg(9, 11, 9, 9, 0.6), BRASS, { bevel: 0 });
  p.fill(seg(23, 11, 23, 9, 0.6), BRASS, { bevel: 0 });
  [
    [9, 5.5],
    [16, 3.5],
    [23, 5.5],
  ].forEach(([x, top]) => {
    p.fill(ell(x, 9.3, 2, 0.9), BRASS, { sphere: true, bevel: 0, dither: 0 });
    candle(p, x, top, 9);
  });
}

/** Potted fern in a terracotta pot. */
function plant(p: Paint): void {
  shadow(p, 16, 29, 7.5, 2);
  const leaf = '#3a8a3a';
  const fronds = 11;
  const order = [...Array(fronds).keys()].sort((a, b) => Math.abs(b - (fronds - 1) / 2) - Math.abs(a - (fronds - 1) / 2));
  order.forEach((i) => {
    const a = -Math.PI * 0.94 + (i / (fronds - 1)) * Math.PI * 0.88;
    const len = 8 + hash(i, 1, 71) * 4 - Math.abs(i - (fronds - 1) / 2) * 0.3;
    const tx = 16 + Math.cos(a) * len;
    const ty = 18 + Math.sin(a) * len;
    const mx = (16 + tx) / 2;
    const my = (18 + ty) / 2;
    const nx = -Math.sin(a) * 1.9;
    const ny = Math.cos(a) * 1.9;
    const k = Math.abs(i - (fronds - 1) / 2) > 3 ? -1 : hash(i, 2, 71) < 0.5 ? 0 : 1;
    p.fill(poly([16, 18.5, mx + nx, my + ny, tx, ty, mx - nx, my - ny]), shadeOf(leaf, k), { bevel: 1, dither: 0.2 });
    p.flat(seg(16, 18.5, tx, ty, 0.18), tone(leaf, k + 1), 0.7);
  });
  const pot = '#b0583a';
  p.fill(poly([10.2, 19.5, 21.8, 19.5, 20.4, 28.8, 11.6, 28.8]), pot, { gradX: 1.2, tex: 0.2, seed: 72 });
  p.fill(box(9.4, 18, 13.2, 2.6), pot, { grad: 0.8, shade: 0.5 });
  p.flat(box(11, 23.4, 10, 0.5), tone(pot, -1), 0.7);
  [13, 16, 19].forEach((x) => p.fill(ell(x, 25.4, 0.6), tone(pot, 1), { bevel: 0, dither: 0 }));
}

/** Frame shared by shelves: dark wood case with a recessed back. */
function shelfCase(p: Paint, seed: number): void {
  shadow(p, 16, 30.6, 14.5, 1.4);
  woodFill(p, box(2, 1, 28, 30), DARK_OAK, seed, true, 4);
  p.fill(box(3.6, 2.6, 24.8, 26.8), tone(DARK_OAK, -2), { bevel: 0, tex: 0.2, seed });
  p.flat(box(3.6, 2.6, 24.8, 0.8), '#0a0606', 0.6);
}

/** One shelf board whose top is at `y`. */
function shelfBoard(p: Paint, y: number): void {
  p.fill(box(2.6, y, 26.8, 1.6), OAK, { grad: 0.8, bevel: 0 });
  p.flat(box(3.6, y + 1.6, 24.8, 0.8), '#0a0606', 0.45);
}

/** Bookcase packed with books, plus the odd candle or skull. */
function bookshelf(p: Paint): void {
  shelfCase(p, 73);
  [10.6, 19.8, 29].forEach((yb, row) => {
    let x = 3.8;
    let i = row * 40;
    while (x < 27.6) {
      const n = hash(i, 1, 73);
      if (n < 0.06 && x < 23) {
        p.fill(ell(x + 2, yb - 2, 2.1, 1.9), '#e8dcc0', { sphere: true, bevel: 0 });
        [x + 1.3, x + 2.7].forEach((ex) => p.fill(ell(ex, yb - 2, 0.5, 0.6), '#1a1210', { bevel: 0, dither: 0 }));
        x += 4.4;
      } else if (n < 0.1 && x < 24.5) {
        p.fill(ell(x + 1.6, yb - 1.2, 1.7, 1.2), '#5a7a8a', { sphere: true, bevel: 0 });
        p.fill(box(x + 1, yb - 3.6, 1.2, 1.4), '#5a7a8a', { bevel: 0, dither: 0 });
        x += 3.6;
      } else {
        const w = Math.min(27.8 - x, 1.2 + hash(i, 2, 73) * 1.4);
        const h = 5 + hash(i, 3, 73) * 2.6;
        const lean = hash(i, 4, 73) < 0.1 && x > 6;
        const col = BOOKS[Math.floor(hash(i, 5, 73) * BOOKS.length)];
        const book = lean ? poly([x, yb, x + w, yb, x + w + 1.8, yb - h, x + 1.8, yb - h]) : box(x, yb - h, w, h);
        p.fill(book, col, { gradX: 0.8, bevel: 0, dither: 0 });
        if (!lean && w > 1.5) {
          p.flat(box(x + 0.2, yb - h + 1, w - 0.4, 0.4), GOLD, 0.8);
          p.flat(box(x + 0.2, yb - 1.6, w - 0.4, 0.4), GOLD, 0.6);
        }
        p.flat(box(x + w - 0.15, yb - h, 0.15, h), '#0a0606', 0.6);
        x += w + (lean ? 1.8 : 0.1);
      }
      i++;
    }
    shelfBoard(p, yb);
  });
}

/** Apothecary shelf of coloured potions, jars and a mortar. */
function potionShelf(p: Paint): void {
  shelfCase(p, 74);
  const liquids = ['#d83a3a', '#3a7ad8', '#3ac85a', '#c858d8', '#e8c040', '#40c8c8'];
  [10.6, 19.8, 29].forEach((yb, row) => {
    for (let i = 0; i < 4; i++) {
      const x = 6.2 + i * 6.3 + (hash(i, row, 74) - 0.5) * 1.4;
      const col = liquids[Math.floor(hash(i, row + 9, 74) * liquids.length)];
      const kind = hash(i, row + 20, 74);
      if (kind < 0.55) {
        const r = 1.9 + hash(i, row + 30, 74) * 0.5;
        p.fill(ell(x, yb - r, r, r), '#d8e8f0', { sphere: true, bevel: 0, dither: 0 });
        p.fill(clip(ell(x, yb - r, r - 0.4, r - 0.4), box(x - r, yb - r * 1.1, r * 2, r * 2)), col, {
          sphere: true,
          bevel: 0,
          dither: 0,
        });
        p.fill(box(x - 0.6, yb - r * 2 - 2, 1.2, 2.2), '#d8e8f0', { bevel: 0, dither: 0 });
        p.fill(box(x - 0.7, yb - r * 2 - 2.8, 1.4, 1), '#a87a4a', { bevel: 0, dither: 0 });
        p.spot(x - r * 0.45, yb - r * 1.4, '#ffffff');
      } else if (kind < 0.85) {
        p.fill(box(x - 1.6, yb - 5, 3.2, 5), '#c8d8e0', { gradX: 1, bevel: 0, dither: 0 });
        p.fill(box(x - 1.3, yb - 3.6, 2.6, 3.4), col, { gradX: 1, bevel: 0, dither: 0 });
        p.fill(box(x - 1.9, yb - 5.6, 3.8, 1), '#6a4a2a', { bevel: 0, dither: 0 });
        p.spot(x - 1, yb - 4.4, '#ffffff');
      } else {
        p.fill(ell(x, yb - 1.4, 2.3, 1.6), '#9a948a', { sphere: true, bevel: 0 });
        p.flat(ell(x, yb - 2.6, 1.8, 0.5), '#4a4640');
        p.fill(seg(x + 0.4, yb - 2.8, x + 1.8, yb - 5.2, 0.4), '#bab4a8', { bevel: 0, dither: 0 });
      }
    }
    shelfBoard(p, yb);
  });
}

/** Stone altar draped in white with a chalice, a holy book and candles. */
function altar(p: Paint): void {
  glow(p, 24, 4, 9, '#ffd880', 0.25);
  shadow(p, 16, 29.5, 15, 2);
  const stone = '#a8a49a';
  const front = box(3, 13, 26, 15.5);
  p.fill(front, stone, { grad: 0.8, tex: 0.3, seed: 75 });
  [17.5, 22.5].forEach((y) => p.flat(clip(box(3, y, 26, 0.4), front), tone(stone, -2), 0.7));
  [8, 24].forEach((x) => p.flat(box(x, 17.9, 0.4, 4.6), tone(stone, -2), 0.7));
  p.fill(box(2.5, 7, 27, 6.2), LINEN, { grad: 0.5, bevel: 0 });
  p.fill(box(2.5, 13, 27, 3.2), LINEN, { grad: 0.8 });
  const runner = poly([11, 13, 21, 13, 21, 25.5, 16, 27.5, 11, 25.5]);
  p.fill(runner, '#3a4aa8', { gradX: 0.6, bevel: 0 });
  p.fill(cut(runner, poly([12, 13, 20, 13, 20, 24.8, 16, 26.5, 12, 24.8])), GOLD, { bevel: 0, dither: 0 });
  p.fill(ell(16, 19, 2.6), GOLD, { sphere: true, bevel: 0 });
  [0, 1, 2, 3].forEach((i) => {
    const a = (i * Math.PI) / 4;
    p.flat(seg(16 - Math.cos(a) * 4, 19 - Math.sin(a) * 4, 16 + Math.cos(a) * 4, 19 + Math.sin(a) * 4, 0.25), GOLD);
  });
  p.flat(box(2.5, 15.6, 27, 0.6), GOLD, 0.8);
  p.fill(poly([5.2, 7.8, 8.6, 7.8, 8, 4.8, 7.6, 3.8, 6.2, 3.8, 5.8, 4.8]), GOLD, { gradX: 1, bevel: 0 });
  p.fill(box(6.5, 7.8, 0.9, 2.4), GOLD, { bevel: 0, dither: 0 });
  p.fill(ell(6.9, 10.3, 2, 0.7), GOLD, { bevel: 0, dither: 0 });
  p.fill(poly([11.2, 8, 16, 7.2, 16, 11.4, 11.6, 11.8]), '#f8f0dc', { gradX: 0.6, bevel: 0 });
  p.fill(poly([16, 7.2, 20.8, 8, 20.4, 11.8, 16, 11.4]), '#e8dcc4', { gradX: 0.6, bevel: 0 });
  [8.6, 9.6, 10.6].forEach((y) => {
    p.flat(seg(12.4, y, 15.2, y - 0.3, 0.15), '#7a7060', 0.7);
    p.flat(seg(16.8, y - 0.3, 19.6, y, 0.15), '#7a7060', 0.7);
  });
  p.flat(seg(16, 7.2, 16, 11.4, 0.2), '#a8783a');
  p.flat(seg(16.4, 11.4, 16.4, 13.6, 0.3), '#c83030');
  candle(p, 23.5, 4.5, 10);
  candle(p, 26.5, 6, 10.4);
}

/** Wooden church pew seen from behind. */
function pew(p: Paint): void {
  shadow(p, 16, 29.6, 15.5, 1.5);
  [3.5, 26.5].forEach((x) => p.fill(box(x, 22, 2, 7), DARK_OAK, { gradX: 0.8 }));
  woodFill(p, box(1, 14, 30, 7), OAK, 76, false, 2.4);
  p.fill(box(1, 20.5, 30, 2.4), tone(OAK, -1), { grad: 0.6 });
  woodFill(p, box(1, 5.5, 30, 8.5), OAK, 77, false, 2.8);
  p.fill(box(0.5, 4, 31, 2.2), OAK, { grad: 1, shade: 0.5 });
  p.flat(box(1, 13.6, 30, 0.8), '#0a0606', 0.5);
  [1, 30].forEach((x) => p.fill(box(x - 0.5, 4, 1.5, 19), DARK_OAK, { gradX: 0.8, bevel: 0 }));
  [8, 16, 24].forEach((x) => p.flat(seg(x, 6.5, x, 13, 0.25), tone(OAK, -2), 0.7));
}

/** Upright barrel with iron hoops and a lid. */
function barrel(p: Paint): void {
  shadow(p, 16, 29.3, 10.5, 2.2);
  const wood = '#94622e';
  const body = clip(ell(16, 18, 10.6, 12.5), box(5, 7.5, 22, 21.8));
  p.fill(body, wood, { sphere: true, sphereAmount: 0.7, tex: 0.2, seed: 78 });
  [9.2, 12.6, 16, 19.4, 22.8].forEach((x) => {
    const bow = (x - 16) * 0.08;
    p.flat(clip(union(seg(x - bow, 7.5, x + bow, 18, 0.22), seg(x + bow, 18, x - bow, 29.3, 0.22)), body), tone(wood, -2), 0.7);
  });
  [11, 25].forEach((y) => {
    p.fill(clip(box(4, y, 24, 1.8), body), IRON, { grad: 0.8, bevel: 0 });
    [7, 25].forEach((x) => rivet(p, x, y + 0.9, IRON, 0.4));
  });
  p.fill(ell(16, 7.6, 8.6, 3), tone(wood, 0.5), { tex: 0.3, seed: 79 });
  p.flat(cut(ell(16, 7.6, 8.6, 3), ell(16, 7.8, 7.4, 2.3)), tone(wood, -2), 0.8);
  [13.5, 18.5].forEach((x) => p.flat(seg(x, 5.8, x, 9.5, 0.18), tone(wood, -1), 0.7));
}

/** Ale keg on a wooden cradle, end-on with a brass tap. */
function keg(p: Paint): void {
  shadow(p, 16, 29.4, 13, 1.8);
  [6, 24].forEach((x) => p.fill(box(x, 22, 2.4, 7.5), DARK_OAK, { gradX: 0.8 }));
  p.fill(box(3.5, 25, 25, 2), DARK_OAK, { grad: 0.6 });
  const wood = '#a06a32';
  const face = ell(16, 14.5, 11, 11);
  p.fill(face, wood, { sphere: true, sphereAmount: 0.5, tex: 0.25, seed: 80 });
  [10, 13.4, 16.8, 20.2].forEach((x) => p.flat(clip(seg(x, 3, x, 26, 0.2), face), tone(wood, -2), 0.7));
  p.fill(cut(face, ell(16, 14.5, 9.4, 9.4)), IRON, { sphere: true, bevel: 0 });
  p.flat(cut(ell(16, 14.5, 9.4, 9.4), ell(16, 14.5, 8.8, 8.8)), tone(wood, -3), 0.8);
  [0, 1, 2, 3, 4, 5].forEach((i) => {
    const a = (i * Math.PI) / 3 + 0.3;
    rivet(p, 16 + Math.cos(a) * 10.2, 14.5 + Math.sin(a) * 10.2, IRON, 0.4);
  });
  p.fill(box(14.8, 18, 2.4, 2.6), BRASS, { gradX: 1, bevel: 0 });
  p.fill(poly([15.2, 20.6, 16.8, 20.6, 16.6, 23.6, 15.4, 23.6]), BRASS, { gradX: 1, bevel: 0 });
  p.fill(box(13.5, 17, 5, 1.2), BRASS, { grad: 0.6, bevel: 0 });
  p.fill(ell(16, 24.6, 0.5, 0.7), '#e8a830', { bevel: 0, dither: 0 });
}

/** Nailed wooden crate with a diagonal brace. */
function crate(p: Paint): void {
  shadow(p, 16, 29.6, 13.5, 1.8);
  const wood = '#b07e40';
  woodFill(p, box(4, 5.5, 24, 6), tone(wood, 1), 81, true, 3);
  const front = box(4, 11.5, 24, 17.5);
  woodFill(p, front, wood, 82, false, 4.4);
  const brace = clip(seg(6.5, 26.5, 25.5, 14, 1.3), front);
  p.fill(brace, tone(wood, -1), { bevel: 1, dither: 0 });
  [box(4, 11.5, 2.6, 17.5), box(25.4, 11.5, 2.6, 17.5), box(4, 11.5, 24, 2.4), box(4, 26.6, 24, 2.4)].forEach((s) =>
    p.fill(s, tone(wood, -0.5), { grad: 0.6, bevel: 1, dither: 0 }),
  );
  [
    [5.3, 12.7],
    [26.7, 12.7],
    [5.3, 27.8],
    [26.7, 27.8],
    [5.3, 20],
    [26.7, 20],
  ].forEach(([x, y]) => rivet(p, x, y, '#5a5a62', 0.45));
  p.flat(box(4, 11.2, 24, 0.5), tone(wood, -3));
}

/** Two tied burlap grain sacks with a little spilled grain. */
function sacks(p: Paint): void {
  shadow(p, 16, 29.2, 13.5, 2);
  const burlap = '#c8a870';
  const sack = (cx: number, cy: number, rx: number, ry: number, seed: number): void => {
    const body = union(ell(cx, cy, rx, ry), ell(cx, cy + ry * 0.35, rx * 1.05, ry * 0.7));
    p.fill(body, burlap, { sphere: true, tex: 0.5, seed });
    fine(p, (x, y, fx, fy) => {
      if (body.test(x - 0.5, y - 0.5) && (fx + fy * 3) % 5 === 0) {
        p.fpx(fx, fy, tone(burlap, -1), 0.35);
      }
    });
    const neck = poly([cx - 1.6, cy - ry + 0.6, cx + 1.6, cy - ry + 0.6, cx + 1, cy - ry - 1.6, cx - 1, cy - ry - 1.6]);
    p.fill(neck, burlap, { gradX: 0.8, bevel: 0 });
    p.fill(box(cx - 1.8, cy - ry - 0.2, 3.6, 0.9), '#7a5a32', { bevel: 0, dither: 0 });
    p.fill(poly([cx - 1.4, cy - ry - 1.6, cx - 2.4, cy - ry - 3.4, cx + 2.4, cy - ry - 3.4, cx + 1.4, cy - ry - 1.6]), burlap, {
      bevel: 0,
    });
    p.flat(seg(cx - 2, cy + 0.5, cx + 2, cy - 0.5, 0.3), tone(burlap, -2), 0.6);
  };
  sack(11, 18, 6.5, 7.5, 83);
  sack(21.5, 20.5, 6, 6.5, 84);
  for (let i = 0; i < 9; i++) {
    p.fill(ell(14 + hash(i, 1, 85) * 6, 27.5 + hash(i, 2, 85) * 2, 0.45, 0.3), '#e8d088', { bevel: 0, dither: 0 });
  }
}

/** Rectangular tavern table with a mug, a plate of food and a candle stub. */
function table(p: Paint): void {
  shadow(p, 16, 29.4, 14.5, 2);
  [4.5, 25.5].forEach((x) => p.fill(box(x, 18, 2.2, 11), DARK_OAK, { gradX: 0.8 }));
  woodFill(p, box(1.5, 8.5, 29, 10.5), '#a8743c', 86, false, 2.6);
  p.fill(box(1.5, 18.5, 29, 2.4), tone('#a8743c', -1), { grad: 0.6 });
  p.flat(box(1.5, 20.9, 29, 0.6), '#0a0606', 0.6);
  p.fill(ell(17.5, 13.5, 4.5, 2.2), '#e8e0d0', { sphere: true, sphereAmount: 0.5, bevel: 0 });
  p.flat(ell(17.5, 13.3, 3.2, 1.4), '#d0c8b8');
  p.fill(ell(16.5, 13, 2, 1.1), '#c8883a', { sphere: true, bevel: 0 });
  p.flat(seg(15.4, 12.8, 17.4, 12.4, 0.15), '#8a5a22');
  p.fill(ell(19.4, 13.6, 1.2), '#c83030', { sphere: true, bevel: 0, dither: 0 });
  p.spot(19, 13.1, '#ffffff');
  p.fill(box(6.5, 9, 3.6, 4.6), '#8a6a4a', { gradX: 1, bevel: 0 });
  [10.3, 12].forEach((y) => p.flat(box(6.5, y, 3.6, 0.35), IRON));
  p.fill(cut(ell(10.6, 11.4, 1.4, 1.4), ell(10.6, 11.4, 0.6, 0.6)), '#8a6a4a', { bevel: 0, dither: 0 });
  p.fill(ell(8.3, 9, 1.9, 0.8), '#f8f0d8', { sphere: true, bevel: 0, dither: 0 });
  p.fill(ell(26, 12.2, 1.6, 0.7), '#c8c0a8', { bevel: 0, dither: 0 });
  candle(p, 26, 9.6, 12);
}

/** Round three-legged stool (walkable). */
function stool(p: Paint): void {
  shadow(p, 16, 25, 7, 1.6);
  [
    [11, 24],
    [21, 24],
    [16, 25],
  ].forEach(([x, y]) => p.fill(seg(16 + (x - 16) * 0.5, 18, x, y, 0.7), DARK_OAK, { bevel: 0 }));
  p.fill(ell(16, 17, 6.5, 3), OAK, { sphere: true, sphereAmount: 0.6, tex: 0.3, seed: 87 });
  p.flat(cut(ell(16, 17, 6.5, 3), ell(16, 16.6, 6.2, 2.6)), tone(OAK, -2), 0.8);
  p.flat(seg(12, 16.6, 19, 16.2, 0.18), tone(OAK, -1), 0.6);
}

/** Inn bed with a quilt, sheet, pillow and posts. */
function bed(p: Paint): void {
  shadow(p, 16, 30.2, 13.5, 1.4);
  woodFill(p, box(3.5, 1.5, 25, 7), DARK_OAK, 88, true, 3);
  [4.2, 27.8].forEach((x) => p.fill(ell(x, 1.8, 1.6), DARK_OAK, { sphere: true, bevel: 0 }));
  p.fill(box(4.5, 5, 23, 24), LINEN, { grad: 0.4, bevel: 0 });
  p.fill(ell(16, 8.5, 7.5, 2.8), '#f8f4ec', { sphere: true, sphereAmount: 0.6 });
  p.flat(seg(10, 8.6, 22, 8.6, 0.2), '#d8d0c0', 0.7);
  const quilt = box(4.5, 13, 23, 15);
  const a = '#3a5aa8';
  const b = '#c8a040';
  fine(p, (x, y, fx, fy) => {
    if (quilt.test(x - 0.5, y - 0.5)) {
      const cell = (Math.floor((x - 4.5) / 4) + Math.floor((y - 13) / 4)) % 2;
      const seam = (x - 4.5) % 4 < 0.4 || (y - 13) % 4 < 0.4;
      const fold = Math.sin((x - 4.5) * 0.9) * 0.3 - (y - 13) / 30;
      p.fpx(fx, fy, seam ? tone(cell ? a : b, -2) : tone(cell ? a : b, Math.round(fold + dither(fx, fy) * 0.6)));
    }
  });
  p.fill(box(4.5, 12, 23, 2), '#f8f4ec', { grad: 0.6, bevel: 0 });
  [box(3, 5, 1.6, 25), box(27.4, 5, 1.6, 25)].forEach((s) => p.fill(s, DARK_OAK, { gradX: 0.8, bevel: 0 }));
  woodFill(p, box(3, 27.5, 26, 2.5), DARK_OAK, 89, false, 3);
}

/** Wall rack of swords, a spear and an axe. */
function weaponRack(p: Paint): void {
  shadow(p, 16, 30.2, 14.5, 1.4);
  [3, 26.5].forEach((x) => woodFill(p, box(x, 3, 2.5, 27), DARK_OAK, 90, true, 3));
  [6, 24].forEach((y) => woodFill(p, box(2, y, 28, 2), OAK, 91, false, 4));
  const sword = (x: number, len: number): void => {
    p.fill(poly([x - 0.9, 21, x - 0.9, 21 - len, x, 20 - len - 1.4, x + 0.9, 21 - len, x + 0.9, 21]), STEEL, {
      gradX: 1,
      bevel: 0,
    });
    p.flat(seg(x, 20.5, x, 21.5 - len, 0.18), tone(STEEL, -2), 0.8);
    p.fill(seg(x - 2.6, 21.6, x + 2.6, 21.6, 0.6), BRASS, { bevel: 0 });
    p.fill(box(x - 0.6, 22.2, 1.2, 4), '#5a3a22', { bevel: 0, dither: 0 });
    [23, 24.4].forEach((y) => p.flat(box(x - 0.6, y, 1.2, 0.3), '#3a2414'));
    p.fill(ell(x, 27, 1.1), BRASS, { sphere: true, bevel: 0, dither: 0 });
  };
  sword(8, 15);
  sword(12.6, 12);
  p.fill(seg(18, 4, 18, 29, 0.55), OAK, { bevel: 0 });
  p.fill(poly([18, 0.6, 19.4, 4.4, 18, 6, 16.6, 4.4]), STEEL, { gradX: 1, bevel: 0 });
  p.fill(box(17.2, 6, 1.6, 1.2), '#5a3a22', { bevel: 0, dither: 0 });
  p.fill(seg(23, 9, 23, 29, 0.6), OAK, { bevel: 0 });
  p.fill(poly([23, 9, 27.4, 7.4, 28.2, 11, 27.4, 14.6, 23, 13]), STEEL, { gradX: 1, bevel: 1 });
  p.flat(seg(27.6, 7.8, 28, 14, 0.3), '#f0f4ff', 0.8);
}

/** Armor stand wearing a plumed helm and plate. */
function armorStand(p: Paint): void {
  shadow(p, 16, 29.6, 8.5, 1.8);
  p.fill(box(10, 27.4, 12, 2), DARK_OAK, { grad: 0.6 });
  p.fill(box(15.2, 22, 1.6, 6), DARK_OAK, { gradX: 0.8, bevel: 0 });
  p.fill(poly([10.6, 20, 21.4, 20, 22.4, 25.2, 9.6, 25.2]), tone(STEEL, -1), { gradX: 1 });
  [22.4, 23.8].forEach((y) => p.flat(seg(10, y, 22, y, 0.2), tone(STEEL, -3), 0.7));
  const chest = poly([9.6, 10, 22.4, 10, 21.4, 19, 16, 21.4, 10.6, 19]);
  p.fill(chest, STEEL, { sphere: true, sphereAmount: 0.8 });
  p.flat(seg(16, 10.5, 16, 20.5, 0.25), tone(STEEL, -2), 0.6);
  p.flat(seg(13, 12, 12.4, 16, 0.4), '#ffffff', 0.5);
  [9.2, 22.8].forEach((x) => p.fill(ell(x, 11, 3.2, 2.4), STEEL, { sphere: true }));
  p.fill(box(10.6, 18.6, 10.8, 1.5), '#6a4422', { grad: 0.5, bevel: 0 });
  p.fill(box(15, 18.4, 2, 1.9), GOLD, { bevel: 0, dither: 0 });
  p.fill(ell(16, 6, 4.2, 4.4), STEEL, { sphere: true });
  p.fill(box(12.2, 7, 7.6, 0.9), '#14141c', { bevel: 0, dither: 0 });
  p.flat(seg(16, 7.9, 16, 10, 0.3), tone(STEEL, -2));
  p.fill(poly([16, 1.8, 18, 0.4, 22, 1, 23.5, 4, 19, 3]), '#c83030', { grad: 0.8, bevel: 0 });
}

/** Anvil on a stump with a glowing bar and a hammer. */
function anvil(p: Paint): void {
  glow(p, 15, 10, 8, '#ff8030', 0.3);
  shadow(p, 16, 29.6, 11.5, 2);
  const stump = '#7a5232';
  woodFill(p, box(9, 19, 14, 10), stump, 92, true, 2.4);
  p.fill(ell(16, 19.2, 7, 2), tone(stump, 1), { bevel: 0 });
  p.flat(cut(ell(16, 19.2, 5, 1.4), ell(16, 19.2, 4, 1)), tone(stump, -1), 0.7);
  const iron = '#5a5a66';
  const body = poly([6, 11, 26, 11, 26, 13.4, 22, 14.4, 20.4, 16.4, 21.4, 19.6, 10.6, 19.6, 11.6, 16.4, 10, 14.4, 6, 13.4]);
  p.fill(body, iron, { grad: 1 });
  p.fill(poly([6, 11, 1.8, 11.8, 6, 13.4]), iron, { grad: 0.8 });
  p.flat(box(6, 11, 20, 0.6), tone(iron, 2));
  p.fill(seg(11, 10.2, 19, 10.2, 0.6), '#ff8030', { bevel: 0, dither: 0 });
  p.flat(seg(12, 10, 18, 10, 0.25), '#fff0a0');
  p.fill(seg(24, 28.5, 28.5, 19.5, 0.6), OAK, { bevel: 0 });
  p.fill(seg(26.6, 18, 30, 20, 1.3), iron, { bevel: 1 });
}

/** Stone fireplace with a crackling fire (two frames) and a few things on the mantel. */
function hearth(p: Paint, frame: number): void {
  const stone = '#8a8078';
  const body = box(1, 3, 30, 27.5);
  p.fill(body, stone, { tex: 0.25, seed: 93 });
  fine(p, (x, y, fx, fy) => {
    if (!body.test(x - 0.5, y - 0.5)) {
      return;
    }
    const row = Math.floor((y - 3) / 4.5);
    const ly = (y - 3) % 4.5;
    const lx = (x + (row % 2) * 3.5) % 7;
    if (ly < 0.5 || lx < 0.5) {
      p.fpx(fx, fy, tone(stone, -2));
    } else if (ly < 1 || lx < 1) {
      p.fpx(fx, fy, tone(stone, 1), 0.5);
    }
  });
  woodFill(p, box(0, 7, 32, 3), OAK, 94, false, 3);
  p.flat(box(0, 10, 32, 0.8), '#0a0606', 0.5);
  p.fill(poly([4, 7, 6.5, 7, 6.5, 3.6, 5.2, 2.8, 4, 3.6]), '#7a8a9a', { gradX: 1, bevel: 0 });
  candle(p, 26.5, 3.2, 7, frame);
  const mouth = union(box(7, 15, 18, 15.5), ell(16, 15, 9, 4.5));
  p.fill(mouth, '#1a100c', { bevel: 0 });
  fine(p, (x, y, fx, fy) => {
    if (mouth.test(x - 0.5, y - 0.5)) {
      const d = Math.hypot(x - 16, (y - 28) * 1.2) / 13;
      if (d < 1) {
        p.fpx(fx, fy, '#ff7a20', (1 - d) ** 1.4 * 0.75);
      }
    }
  });
  p.fill(seg(9.5, 28, 22.5, 26, 1.4), '#5a3a1e', { bevel: 1 });
  p.fill(seg(9.5, 26, 22.5, 28, 1.4), '#6a4422', { bevel: 1 });
  [
    [9.5, 28],
    [22.5, 28],
  ].forEach(([x, y]) => p.fill(ell(x, y, 1.3), '#c89a5a', { bevel: 0, dither: 0 }));
  const lean = frame === 0 ? 0 : 1.2;
  [
    [12.5, 20, 2.4],
    [16, 16.5, 3.2],
    [19.5, 19.5, 2.4],
  ].forEach(([x, top, w], i) => {
    const l = i === 1 ? lean : -lean * 0.6;
    p.fill(poly([x + l, top, x + w, top + 5, x + w * 0.8, 27, x - w * 0.8, 27, x - w, top + 5]), '#e8641c', {
      grad: 1.2,
      bevel: 0,
      dither: 0.3,
    });
    p.fill(ell(x + l * 0.5, 24.5, w * 0.55, 3), '#ffb040', { bevel: 0 });
    p.fill(ell(x, 25.5, w * 0.3, 1.6), '#fff4c0', { bevel: 0 });
  });
  [
    [13, 15],
    [18.5, 13.5],
    [15, 12.5],
  ].forEach(([x, y]) => p.spot(x + lean, y - frame, '#ffd060'));
}

/** Woven rug with a medallion and fringe (walkable). */
function rug(p: Paint): void {
  const red = '#8a2a3a';
  const body = box(3, 6, 26, 20);
  p.fill(body, red, { bevel: 0, tex: 0.15, seed: 95 });
  p.fill(cut(box(4.6, 7.6, 22.8, 16.8), box(6.4, 9.4, 19.2, 13.2)), '#c89a4a', { bevel: 0, dither: 0 });
  fine(p, (x, y, fx, fy) => {
    if (cut(box(4.6, 7.6, 22.8, 16.8), box(6.4, 9.4, 19.2, 13.2)).test(x - 0.5, y - 0.5) && (fx + fy) % 6 < 2) {
      p.fpx(fx, fy, '#6a1a2a');
    }
  });
  p.fill(poly([16, 10.2, 23, 16, 16, 21.8, 9, 16]), '#2a3a6a', { bevel: 0, dither: 0 });
  p.fill(poly([16, 12.6, 20, 16, 16, 19.4, 12, 16]), '#c89a4a', { bevel: 0, dither: 0 });
  p.fill(ell(16, 16, 1.4), red, { bevel: 0, dither: 0 });
  for (let x = 3.6; x < 29; x += 1.2) {
    p.flat(seg(x, 4.4, x, 6, 0.2), '#e8d8b0');
    p.flat(seg(x, 26, x, 27.6, 0.2), '#e8d8b0');
  }
}

/** Banded treasure chest. */
function chest(p: Paint): void {
  shadow(p, 16, 29.3, 12.5, 2);
  const wood = '#8a5228';
  woodFill(p, box(5, 15, 22, 13.5), wood, 96, true, 3.6);
  const lid = union(box(5, 10, 22, 5.5), clip(ell(16, 10.5, 11, 4), box(5, 6, 22, 5)));
  woodFill(p, lid, tone(wood, 1), 97, true, 3.6);
  [8, 22].forEach((x) => {
    p.fill(clip(box(x, 6, 2, 22.5), union(lid, box(5, 15, 22, 13.5))), IRON, { gradX: 0.8, bevel: 0 });
    [9, 13, 18, 23, 27].forEach((y) => rivet(p, x + 1, y, IRON, 0.35));
  });
  p.fill(box(5, 14.6, 22, 1.4), IRON, { grad: 0.6, bevel: 0 });
  p.fill(box(13.8, 13.6, 4.4, 5.2), GOLD, { grad: 0.8 });
  p.fill(ell(16, 15.6, 0.6), '#1a1210', { bevel: 0, dither: 0 });
  p.flat(box(15.7, 15.8, 0.6, 1.6), '#1a1210');
}

/** A row of iron cell bars set into the floor (talk across them). */
function jailBars(p: Paint): void {
  for (let x = 2; x < 32; x += 4) {
    p.flat(seg(x + 1.2, 29.5, x + 3.4, 31.8, 0.5), '#0a0806', 0.3);
  }
  p.fill(box(0, 1, 32, 2.2), IRON, { grad: 0.8 });
  p.fill(box(0, 26.8, 32, 2.4), IRON, { grad: 0.8 });
  for (let x = 2; x < 32; x += 4) {
    p.fill(box(x - 0.8, 1, 1.6, 28.2), IRON, { gradX: 1.2, bevel: 0 });
    p.flat(box(x - 0.6, 1, 0.4, 28), tone(IRON, 2), 0.7);
  }
  p.fill(box(0, 13.6, 32, 1.6), IRON, { grad: 0.8, bevel: 0 });
  for (let x = 2; x < 32; x += 4) {
    [2.1, 14.4, 28].forEach((y) => rivet(p, x, y, IRON, 0.5));
  }
  for (let i = 0; i < 14; i++) {
    const x = 2 + Math.floor(hash(i, 1, 98) * 8) * 4 + (hash(i, 2, 98) - 0.5);
    const y = 3 + hash(i, 3, 98) * 24;
    p.flat(ell(x, y, 0.5, 0.8), '#8a4a2a', 0.8);
  }
}

/** A skull and scattered bones (walkable). */
function bones(p: Paint): void {
  const bone = '#e8dcc0';
  const long = (ax: number, ay: number, bx: number, by: number): void => {
    p.flat(seg(ax + 0.4, ay + 0.6, bx + 0.4, by + 0.6, 0.8), '#0a0806', 0.25);
    p.fill(seg(ax, ay, bx, by, 0.6), bone, { bevel: 0, dither: 0 });
    [
      [ax, ay],
      [bx, by],
    ].forEach(([x, y]) => p.fill(ell(x, y, 1), bone, { sphere: true, bevel: 0, dither: 0 }));
  };
  long(5, 22, 13, 25);
  long(20, 26, 27, 21);
  long(8, 9, 11, 15);
  [0, 1, 2].forEach((i) => p.fill(seg(22 + i * 1.6, 9, 24 + i * 1.6, 14, 0.4), bone, { bevel: 0, dither: 0 }));
  shadow(p, 17, 19.5, 4.5, 1.4);
  p.fill(ell(16.5, 15.5, 3.6, 3.2), bone, { sphere: true });
  p.fill(box(14.4, 17.2, 4.2, 2), tone(bone, -1), { bevel: 0 });
  [15.2, 17.8].forEach((x) => p.fill(ell(x, 15.6, 0.9, 1), '#1a1210', { bevel: 0, dither: 0 }));
  p.flat(poly([16.5, 16.8, 17.1, 17.8, 15.9, 17.8]), '#1a1210');
  [14.9, 15.9, 16.9, 17.9].forEach((x) => p.flat(box(x, 18.6, 0.4, 0.6), '#1a1210'));
}

/** Heap of gold coins with a few gems. */
function goldPile(p: Paint): void {
  glow(p, 16, 20, 13, '#ffe080', 0.18);
  shadow(p, 16, 26, 12, 3);
  p.fill(union(ell(16, 21, 11, 5.5), ell(15, 17, 7, 5), ell(18, 14.5, 4, 3)), GOLD, { sphere: true, tex: 0.3, seed: 99 });
  for (let i = 0; i < 46; i++) {
    const x = 6 + hash(i, 1, 99) * 20;
    const y = 12 + hash(i, 2, 99) * 14;
    if (union(ell(16, 21, 10.6, 5), ell(15, 17, 6.6, 4.6), ell(18, 14.5, 3.6, 2.6)).test(x, y)) {
      const lit = (y - 12) / 14 + (x - 6) / 40 < 0.7;
      p.fill(ell(x, y, 1, 0.6), tone(GOLD, lit ? 1 : -1), { bevel: 0, dither: 0 });
      p.flat(ell(x, y + 0.3, 0.8, 0.25), tone(GOLD, -2), 0.6);
    }
  }
  [
    [11, 21, '#d83040'],
    [20, 18, '#3a8ad8'],
    [15, 14, '#40c860'],
  ].forEach(([x, y, c]) => {
    p.fill(poly([+x, +y - 1.2, +x + 1, +y, +x, +y + 1.2, +x - 1, +y]), c as string, { bevel: 0, dither: 0 });
    p.spot(+x - 0.3, +y - 0.4, '#ffffff');
  });
  p.fill(box(23, 22, 4, 4), '#6a4a2a', { grad: 0.6 });
  p.fill(ell(25, 22, 2, 0.8), GOLD, { bevel: 0, dither: 0 });
}

/** Goblin campfire in a ring of stones (two frames). */
function campfire(p: Paint, frame: number): void {
  glow(p, 16, 18, 16, '#ff9a40', 0.32);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const x = 16 + Math.cos(a) * 8.5;
    const y = 21 + Math.sin(a) * 4.5;
    p.fill(ell(x, y, 1.9, 1.4), '#7a7068', { sphere: true, bevel: 0 });
  }
  p.flat(ell(16, 21, 6.5, 3), '#1a1210');
  p.fill(seg(10.5, 23, 21.5, 19.5, 1.3), '#5a3a1e', { bevel: 1 });
  p.fill(seg(10.5, 19.5, 21.5, 23, 1.3), '#6a4422', { bevel: 1 });
  const lean = frame === 0 ? 0 : 1.2;
  p.fill(poly([16 + lean, 6, 20.5, 14, 20, 21, 12, 21, 11.5, 14]), '#e8641c', { grad: 1.3, bevel: 0, dither: 0.3 });
  p.fill(poly([16 + lean * 0.6, 10, 18.8, 15, 18.4, 21, 13.6, 21, 13.2, 15]), '#ffa030', { grad: 1, bevel: 0 });
  p.fill(ell(16, 18.5, 1.8, 2.6), '#fff4c0', { bevel: 0 });
  [
    [12, 5],
    [19.5, 3.5],
    [15, 2],
  ].forEach(([x, y]) => p.spot(x + lean, y + frame, '#ffd060'));
}

/** Straw bedding (walkable). */
function straw(p: Paint): void {
  const hay = '#d8b860';
  const patch = union(ell(16, 17, 12, 8), ell(10, 13, 6, 4), ell(22, 21, 6, 4));
  p.fill(patch, hay, { tex: 0.5, seed: 100, bevel: 0 });
  for (let i = 0; i < 90; i++) {
    const x = 4 + hash(i, 1, 100) * 24;
    const y = 8 + hash(i, 2, 100) * 18;
    if (patch.test(x, y)) {
      const a = hash(i, 3, 100) * Math.PI;
      const l = 1.2 + hash(i, 4, 100) * 1.8;
      p.flat(seg(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l * 0.6, 0.18), tone(hay, hash(i, 5, 100) < 0.5 ? -2 : 1));
    }
  }
}

/** A torn fishing net snagged in lakeside reeds, slick with slime (a clue tile, walkable). */
function tornNet(p: Paint): void {
  const reed = (x: number, h: number, lean: number, i: number): void => {
    const c = tone('#5a7a2a', (i % 3) - 1);
    p.fill(seg(x, 29, x + lean, 29 - h, 0.45), c, { bevel: 0, dither: 0 });
    if (i % 2 === 0) {
      p.fill(ell(x + lean * 0.92, 29 - h * 0.86, 0.9, 2), '#6a4220', { bevel: 0, dither: 0 });
    }
  };
  [
    [3, 17, -1.5],
    [5, 21, 0.8],
    [7, 14, 2],
    [26, 19, -1],
    [28, 23, 1.2],
    [30, 15, -2],
  ].forEach(([x, h, l], i) => reed(x, h, l, i));
  shadow(p, 16, 25, 10, 2.4);
  const node = (c: number, r: number): [number, number] => [
    7 + c * 3.6 + (hash(c, r, 120) - 0.5) * 1.2,
    12 + r * 3.2 + Math.sin(c * 0.9) * 1.2 + (hash(c, r, 121) - 0.5) * 0.8,
  ];
  const hole = ell(18.5, 19.5, 3.6, 2.8);
  const rope = '#d8c49a';
  const strand = (a: [number, number], b: [number, number]): void => {
    if (hole.test((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) {
      return;
    }
    p.flat(seg(a[0] + 0.3, a[1] + 0.5, b[0] + 0.3, b[1] + 0.5, 0.3), '#0a0806', 0.35);
    p.flat(seg(a[0], a[1], b[0], b[1], 0.28), rope);
  };
  for (let c = 0; c <= 5; c++) {
    for (let r = 0; r <= 4; r++) {
      if (c < 5) strand(node(c, r), node(c + 1, r));
      if (r < 4) strand(node(c, r), node(c, r + 1));
    }
  }
  [[17, 18.2], [20, 21.4], [16.4, 21]].forEach(([x, y], i) =>
    p.flat(seg(x, y, x + (i - 1) * 1.4, y + 1.6, 0.25), tone(rope, -1)),
  );
  for (let c = 0; c <= 5; c += 2) {
    const [x, y] = node(c, 0);
    p.fill(ell(x, y - 0.4, 1.3, 0.9), '#d86a2a', { sphere: true, bevel: 0 });
  }
  for (let i = 0; i < 7; i++) {
    const x = 8 + hash(i, 1, 122) * 17;
    const y = 13 + hash(i, 2, 122) * 12;
    p.flat(ell(x, y, 1 + hash(i, 3, 122) * 1.4, 0.7), '#8ad04a', 0.45);
    p.spot(x - 0.4, y - 0.2, '#e0ffb0');
  }
}

/** The Alpha Wolf's nest: a ring of twigs and black fur around gnawed bones, with huge paw prints. */
function boneNest(p: Paint): void {
  const ring = ell(16, 19, 11.5, 6.5);
  p.fill(ring, '#3a2c20', { tex: 0.5, seed: 123, bevel: 0 });
  for (let i = 0; i < 40; i++) {
    const a = hash(i, 1, 124) * Math.PI * 2;
    const r = 0.75 + hash(i, 2, 124) * 0.3;
    const x = 16 + Math.cos(a) * 11 * r;
    const y = 19 + Math.sin(a) * 6 * r;
    const t = a + Math.PI / 2 + (hash(i, 3, 124) - 0.5);
    p.fill(seg(x - Math.cos(t) * 2.2, y - Math.sin(t) * 1.2, x + Math.cos(t) * 2.2, y + Math.sin(t) * 1.2, 0.35), tone('#6a4a2a', (i % 3) - 1), { bevel: 0, dither: 0 });
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const x = 16 + Math.cos(a) * 8.5;
    const y = 19 + Math.sin(a) * 4.6;
    p.fill(ell(x, y, 2, 1.2), '#1e1e24', { tex: 0.6, seed: 125 + i, bevel: 0 });
    p.flat(seg(x - 1.4, y, x - 2.4, y - 0.8, 0.2), '#3a3a44');
  }
  p.flat(ell(16, 19.5, 6.5, 3.2), '#120c08', 0.7);
  const bone = '#e8dcc0';
  const long = (ax: number, ay: number, bx: number, by: number): void => {
    p.fill(seg(ax, ay, bx, by, 0.55), bone, { bevel: 0, dither: 0 });
    [
      [ax, ay],
      [bx, by],
    ].forEach(([x, y]) => p.fill(ell(x, y, 0.9), bone, { sphere: true, bevel: 0, dither: 0 }));
    p.flat(seg(ax + (bx - ax) * 0.4, ay + (by - ay) * 0.4 - 0.4, ax + (bx - ax) * 0.55, ay + (by - ay) * 0.55 - 0.4, 0.2), '#8a6a4a');
  };
  long(11, 20, 18, 18);
  long(15, 22, 21, 19.5);
  p.fill(ell(19.5, 17.6, 2.2, 1.6), bone, { sphere: true });
  [18.8, 20.3].forEach((x) => p.flat(ell(x, 17.6, 0.5, 0.45), '#1a1210'));
  const paw = (x: number, y: number): void => {
    p.flat(ell(x, y + 0.8, 1.3, 1.1), '#120c08', 0.55);
    [-1.4, -0.5, 0.5, 1.4].forEach((dx, i) => p.flat(ell(x + dx, y - 1 - (i === 1 || i === 2 ? 0.5 : 0), 0.45, 0.55), '#120c08', 0.55));
  };
  paw(12, 6);
  paw(18, 3.5);
  paw(23, 8);
}

interface DecorDef {
  draw: Draw;
  /** Outline the object (default true). */
  outline?: boolean;
}

/**
 * Furniture and knick-knacks painted over a floor tile: tile id `object@floor` (e.g. `barrel@wood`) is the
 * floor tile's ground with the named object on top.
 */
const DECOR: ReadonlyMap<string, DecorDef> = new Map<string, DecorDef>([
  ['banner', { draw: banner }],
  ['throne', { draw: throne }],
  ['crudeThrone', { draw: crudeThrone }],
  ['candles', { draw: candles }],
  ['plant', { draw: plant }],
  ['bookshelf', { draw: bookshelf }],
  ['potionShelf', { draw: potionShelf }],
  ['altar', { draw: altar }],
  ['pew', { draw: pew }],
  ['barrel', { draw: barrel }],
  ['keg', { draw: keg }],
  ['crate', { draw: crate }],
  ['sacks', { draw: sacks }],
  ['table', { draw: table }],
  ['stool', { draw: stool }],
  ['bed', { draw: bed }],
  ['weaponRack', { draw: weaponRack }],
  ['armorStand', { draw: armorStand }],
  ['anvil', { draw: anvil }],
  ['hearth', { draw: hearth }],
  ['rug', { draw: rug }],
  ['chest', { draw: chest }],
  ['jailBars', { draw: jailBars }],
  ['bones', { draw: bones }],
  ['goldPile', { draw: goldPile }],
  ['campfire', { draw: campfire }],
  ['straw', { draw: straw }],
  ['tornNet', { draw: tornNet }],
  ['boneNest', { draw: boneNest }],
]);

/** Decor objects that flicker (two animation frames). */
export const ANIMATED_DECOR: ReadonlySet<string> = new Set(['hearth', 'campfire']);

/** Splits a composite decor tile id `object@floor` into its parts (null for a plain tile id). */
export function decorParts(id: string): { decor: string; floor: string } | null {
  const at = id.indexOf('@');
  return at < 0 ? null : { decor: id.slice(0, at), floor: id.slice(at + 1) };
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
  ['sand', { ground: sand }],
  ['dunes', { ground: dunes }],
  ['sandRoad', { ground: sandRoad }],
  ['cactus', { ground: sand, object: cactus }],
  ['mesa', { ground: sand, object: mesa }],
  ['marsh', { ground: marsh }],
  ['boardwalk', { ground: boardwalk }],
  ['mireTree', { ground: marsh, object: mireTree }],
  ['bog', { ground: bog }],
  ['shrineEntrance', { ground: sand, object: shrineEntrance }],
  ['mireEntrance', { ground: marsh, object: mireEntrance }],
  ['mireRock', { ground: marsh, object: mireRock }],
  ['pass', { ground: (p) => ground(p, '#c8a165', 4, 0.8, 0.3), object: pass }],
  ['sunWall', { ground: sunWall }],
  ['sunFloor', { ground: sunFloor }],
  ['mireWall', { ground: mireWall }],
  ['mireFloor', { ground: mireFloor }],
  ['snow', { ground: snow }],
  ['drifts', { ground: drifts }],
  ['snowRoad', { ground: snowRoad }],
  ['snowPine', { ground: snow, object: snowPine }],
  ['glacier', { ground: snow, object: glacier }],
  ['iceWater', { ground: iceWater }],
  ['frozenLake', { ground: frozenLake }],
  ['roostEntrance', { ground: snow, object: roostEntrance }],
  ['iceWall', { ground: iceWall }],
  ['iceFloor', { ground: iceFloor }],
]);

/**
 * Paints tile `id` ({@link HD_TILE} paint units square at {@link ART_SCALE}). With `withGround` false only the
 * object layer is painted (to sit on sheet ground art); returns null when there is nothing to paint (unknown
 * tile or no object).
 */
export function paintTile(id: string, frame: number, variant: number, withGround = true): Paint | null {
  const parts = decorParts(id);
  const t: HdTile | undefined = parts ? composite(parts.decor, parts.floor) : HD_TILES.get(id);
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
export const SHADOW_CASTERS: ReadonlySet<string> = new Set(['wall', 'rock', 'torch', 'sunWall', 'mireWall', 'iceWall']);

/** True when tile `id` (or the floor under a decor tile such as `banner@wall`) is a {@link SHADOW_CASTERS} tile. */
export function castsShadow(id: string): boolean {
  return SHADOW_CASTERS.has(decorParts(id)?.floor ?? id);
}

/** The floor tile's ground (variant 0) with decor object `decor` on top; undefined if either is unknown. */
function composite(decor: string, floor: string): HdTile | undefined {
  const d = DECOR.get(decor);
  const f = HD_TILES.get(floor);
  if (!d || !f?.ground) {
    return undefined;
  }
  const ground = f.ground;
  return { ground: (p, frame) => ground(p, frame, 0), object: d.draw, outline: d.outline };
}

/** Painters for the upper part of tall decor, which rises into the tile above the decor tile. */
const DECOR_TOPS: ReadonlyMap<string, (p: Paint) => void> = new Map([
  ['throne', throneTop],
  ['crudeThrone', crudeThroneTop],
]);

/** Decor id of tile `id` when it is tall decor with a top drawn in the tile above (see {@link paintDecorTop}). */
export function decorTopOf(id: string): string | null {
  const decor = decorParts(id)?.decor;
  return decor && DECOR_TOPS.has(decor) ? decor : null;
}

/** Transparent tile holding the upper part of tall decor `decor`, drawn over the tile above it. */
export function paintDecorTop(decor: string): Paint {
  const layer = new Paint(S, S, F);
  DECOR_TOPS.get(decor)?.(layer);
  layer.outline();
  return layer;
}

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
