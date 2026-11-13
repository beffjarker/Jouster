import { Pixels, pixelsToCanvas, setImageDensity } from '@jouster/game/engine';

/**
 * Native-resolution pixel painting for the procedural ("classic") art, drawn directly at high density
 * (see {@link ART_SCALE}) instead of being upscaled.
 *
 * Shapes are filled with a hue-shifted colour ramp (warm lights, cool darks), lit from the top-left,
 * with optional sphere shading, texture and a light ordered dither; `outline` adds a selective
 * (colour-aware) outline around the silhouette, like hand-made 32-bit-era sprites.
 */

/** An RGB triple. */
export type Rgb = readonly [number, number, number];

/** A colour: `#rrggbb` or an RGB triple. */
export type Color = string | Rgb;

/** A paintable region: inclusive-exclusive bounds plus a point test (pixel centres). */
export interface Shape {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  test(x: number, y: number): boolean;
}

/** Number of shades below and above the base colour in a ramp. */
const DARK_STEPS = 3;
const LIGHT_STEPS = 2;

/** Deterministic per-pixel noise in [0, 1). */
export function hash(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Smooth value noise in [0, 1) on a `cell`-pixel lattice that wraps every `wrap` pixels, so tiles
 * built from it join seamlessly with their neighbours.
 */
export function valueNoise(x: number, y: number, cell: number, seed = 0, wrap = 32): number {
  const n = Math.max(1, Math.round(wrap / cell));
  const gx = x / cell;
  const gy = y / cell;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const fx = gx - ix;
  const fy = gy - iy;
  const at = (i: number, j: number): number => hash(((i % n) + n) % n, ((j % n) + n) % n, seed);
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx;
  const bottom = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx;
  return top + (bottom - top) * sy;
}

export function rgb(c: Color): Rgb {
  if (typeof c !== 'string') {
    return c;
  }
  const v = parseInt(c.slice(1, 7), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function toHsl([r, g, b]: Rgb): [number, number, number] {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) {
    return [0, 0, l];
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rr) {
    h = (gg - bb) / d + (gg < bb ? 6 : 0);
  } else if (max === gg) {
    h = (bb - rr) / d + 2;
  } else {
    h = (rr - gg) / d + 4;
  }
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hh < 1 ? [c, x, 0] : hh < 2 ? [x, c, 0] : hh < 3 ? [0, c, x] : hh < 4 ? [0, x, c] : hh < 5 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** Moves hue `h` towards `target` by fraction `t` along the shorter way round. */
function towards(h: number, target: number, t: number): number {
  const d = ((((target - h) % 360) + 540) % 360) - 180;
  return h + d * t;
}

const WARM = 50;
const COOL = 250;

/** One shade of `base`: `k` below zero darkens towards cool blues, above zero lightens towards warm yellows. */
export function tone(base: Color, k: number): Rgb {
  if (k === 0) {
    return rgb(base);
  }
  const hsl = toHsl(rgb(base));
  let [h, s] = hsl;
  const l = hsl[2];
  if (k < 0) {
    if (s < 0.08) {
      h = 235;
      s = 0.1;
    }
    const t = -k;
    return fromHsl(towards(h, COOL, 0.06 * t), Math.min(1, s * (1 + 0.06 * t)), l * (1 - 0.19 * t));
  }
  return fromHsl(towards(h, WARM, 0.07 * k), s * (1 - 0.07 * k), Math.min(0.97, l + (1 - l) * 0.24 * k));
}

/** Dark, slightly saturated colour used to outline pixels of `base`. */
export function outlineOf(base: Color): Rgb {
  const [h, s, l] = toHsl(rgb(base));
  return fromHsl(towards(s < 0.08 ? 235 : h, COOL, 0.25), Math.min(1, Math.max(0.2, s) * 1.1), Math.min(0.16, l * 0.3));
}

const ramps = new Map<string, Rgb[]>();

/** Shades `-DARK_STEPS..+LIGHT_STEPS` of `base` (index `k + DARK_STEPS`). */
export function ramp(base: Color): Rgb[] {
  const key = typeof base === 'string' ? base : base.join(',');
  let r = ramps.get(key);
  if (!r) {
    r = [];
    for (let k = -DARK_STEPS; k <= LIGHT_STEPS; k++) {
      r.push(tone(base, k));
    }
    ramps.set(key, r);
  }
  return r;
}

const shades = new Map<string, Rgb>();

/** {@link tone} of `base` at shade `k` (any step, e.g. half shades), cached. */
export function shadeOf(base: Color, k: number): Rgb {
  const key = `${typeof base === 'string' ? base : base.join(',')}|${k}`;
  let c = shades.get(key);
  if (!c) {
    c = tone(base, k);
    shades.set(key, c);
  }
  return c;
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Ordered-dither threshold in [-0.5, 0.5) for pixel (x, y). */
export function bayer(x: number, y: number): number {
  return (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5;
}

// --- Shapes -----------------------------------------------------------------------------------

/** Ellipse centred on (cx, cy) with radii rx, ry. */
export function ell(cx: number, cy: number, rx: number, ry = rx): Shape {
  return {
    x0: Math.floor(cx - rx),
    y0: Math.floor(cy - ry),
    x1: Math.ceil(cx + rx),
    y1: Math.ceil(cy + ry),
    test: (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1,
  };
}

/** Axis-aligned rectangle. */
export function box(x: number, y: number, w: number, h: number): Shape {
  return {
    x0: Math.floor(x),
    y0: Math.floor(y),
    x1: Math.ceil(x + w),
    y1: Math.ceil(y + h),
    test: (px, py) => px + 0.5 >= x && px + 0.5 < x + w && py + 0.5 >= y && py + 0.5 < y + h,
  };
}

/** Polygon from flat `[x0, y0, x1, y1, ...]` vertex coordinates (even-odd rule). */
export function poly(pts: readonly number[]): Shape {
  const xs = pts.filter((_, i) => i % 2 === 0);
  const ys = pts.filter((_, i) => i % 2 === 1);
  const n = xs.length;
  return {
    x0: Math.floor(Math.min(...xs)),
    y0: Math.floor(Math.min(...ys)),
    x1: Math.ceil(Math.max(...xs)),
    y1: Math.ceil(Math.max(...ys)),
    test: (x, y) => {
      const px = x + 0.5;
      const py = y + 0.5;
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        if (ys[i] > py !== ys[j] > py && px < ((xs[j] - xs[i]) * (py - ys[i])) / (ys[j] - ys[i]) + xs[i]) {
          inside = !inside;
        }
      }
      return inside;
    },
  };
}

/** Thick line (capsule) from (ax, ay) to (bx, by) with radius `r`. */
export function seg(ax: number, ay: number, bx: number, by: number, r: number): Shape {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  return {
    x0: Math.floor(Math.min(ax, bx) - r),
    y0: Math.floor(Math.min(ay, by) - r),
    x1: Math.ceil(Math.max(ax, bx) + r),
    y1: Math.ceil(Math.max(ay, by) + r),
    test: (x, y) => {
      const px = x + 0.5 - ax;
      const py = y + 0.5 - ay;
      const t = Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
      const ex = px - dx * t;
      const ey = py - dy * t;
      return ex * ex + ey * ey <= r * r;
    },
  };
}

/** Pixels in any of `shapes`. */
export function union(...shapes: Shape[]): Shape {
  return {
    x0: Math.min(...shapes.map((s) => s.x0)),
    y0: Math.min(...shapes.map((s) => s.y0)),
    x1: Math.max(...shapes.map((s) => s.x1)),
    y1: Math.max(...shapes.map((s) => s.y1)),
    test: (x, y) => shapes.some((s) => s.test(x, y)),
  };
}

/** Pixels in `a` but not in `b`. */
export function cut(a: Shape, b: Shape): Shape {
  return { ...a, test: (x, y) => a.test(x, y) && !b.test(x, y) };
}

/** Pixels in both `a` and `b`. */
export function clip(a: Shape, b: Shape): Shape {
  return {
    x0: Math.max(a.x0, b.x0),
    y0: Math.max(a.y0, b.y0),
    x1: Math.min(a.x1, b.x1),
    y1: Math.min(a.y1, b.y1),
    test: (x, y) => a.test(x, y) && b.test(x, y),
  };
}

/** Options for {@link Paint.fill}. */
export interface FillOptions {
  /** Edge light: top/left boundary pixels brighten and bottom/right ones darken by this many shades (default 1). */
  bevel?: number;
  /** Round shading as if the shape's bounding box were a sphere lit from the top-left. */
  sphere?: boolean;
  /** Vertical gradient: the top is `grad` shades lighter and the bottom `grad` shades darker. */
  grad?: number;
  /** Horizontal gradient: the left is `gradX` shades lighter and the right darker. */
  gradX?: number;
  /** Random texture amplitude in shades. */
  tex?: number;
  /** Seed for `tex`. */
  seed?: number;
  /** Constant shade offset. */
  shade?: number;
  /** Draws the shape's boundary in its outline colour (separates overlapping parts). */
  rim?: boolean;
  /** When set, `rim` uses this shade of the base colour instead of the dark outline colour. */
  rimShade?: number;
  /** Strength of `sphere` shading (default 1). */
  sphereAmount?: number;
  /** Ordered dither strength (0 = none, default 0.4). */
  dither?: number;
}

const LIGHT = ((): [number, number, number] => {
  const v: [number, number, number] = [-0.5, -0.7, 0.9];
  const m = Math.hypot(...v);
  return [v[0] / m, v[1] / m, v[2] / m];
})();

/**
 * Supersampling factor for the procedural art: painters work in a 2x-density coordinate space
 * (32 per tile, 64 per character) and every shape, gradient, texture, dither and outline is
 * evaluated on a grid `ART_SCALE` times finer, so art is stored at 4 real pixels per logical pixel.
 */
export const ART_SCALE = 2;

/** Shape `s` moved by (dx, dy) (e.g. to repeat details across a seamless tile edge). */
export function shift(s: Shape, dx: number, dy: number): Shape {
  return { x0: s.x0 + dx, y0: s.y0 + dy, x1: s.x1 + dx, y1: s.y1 + dy, test: (x, y) => s.test(x - dx, y - dy) };
}

/**
 * An RGBA pixel buffer with shape-filling, shading and outlining helpers.
 *
 * Coordinates passed to the drawing methods are in "paint units"; the buffer holds `scale` x
 * `scale` real pixels per unit (`width`/`height` are real pixels). Shapes may use fractional
 * coordinates, so details finer than one unit are drawn at the full resolution.
 */
export class Paint implements Pixels {
  public readonly data: Uint8ClampedArray;
  /** Real (buffer) width and height. */
  public readonly width: number;
  public readonly height: number;

  constructor(
    width: number,
    height: number,
    /** Real pixels per paint unit. */
    public readonly scale = 1,
  ) {
    this.width = Math.round(width * scale);
    this.height = Math.round(height * scale);
    this.data = new Uint8ClampedArray(this.width * this.height * 4);
  }

  /** RGBA of the real pixel (x, y); transparent outside the buffer. */
  public get(x: number, y: number): [number, number, number, number] {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      return [0, 0, 0, 0];
    }
    const i = (y * this.width + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  /** Blends `color` over the real pixel (x, y) with opacity `alpha`. */
  public fpx(x: number, y: number, color: Color, alpha = 1): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height || alpha <= 0) {
      return;
    }
    const [r, g, b] = rgb(color);
    const i = (y * this.width + x) * 4;
    const da = this.data[i + 3] / 255;
    const oa = alpha + da * (1 - alpha);
    if (oa <= 0) {
      return;
    }
    this.data[i] = (r * alpha + this.data[i] * da * (1 - alpha)) / oa;
    this.data[i + 1] = (g * alpha + this.data[i + 1] * da * (1 - alpha)) / oa;
    this.data[i + 2] = (b * alpha + this.data[i + 2] * da * (1 - alpha)) / oa;
    this.data[i + 3] = oa * 255;
  }

  /** Blends `color` over the whole paint unit (x, y) (a `scale` x `scale` block). */
  public px(x: number, y: number, color: Color, alpha = 1): void {
    const s = this.scale;
    const fx = Math.round(x * s);
    const fy = Math.round(y * s);
    for (let j = 0; j < s; j++) {
      for (let i = 0; i < s; i++) {
        this.fpx(fx + i, fy + j, color, alpha);
      }
    }
  }

  /** Blends `color` over the single real pixel containing the paint-space point (x, y). */
  public spot(x: number, y: number, color: Color, alpha = 1): void {
    this.fpx(Math.floor(x * this.scale), Math.floor(y * this.scale), color, alpha);
  }

  /**
   * Calls `fn` for every real pixel with its centre in paint units (u, v) (so that `Math.floor(u + 0.5)`
   * is the paint unit) and its real coordinates (fx, fy).
   */
  public pixels(fn: (u: number, v: number, fx: number, fy: number) => void): void {
    const s = this.scale;
    for (let fy = 0; fy < this.height; fy++) {
      for (let fx = 0; fx < this.width; fx++) {
        fn((fx + 0.5) / s - 0.5, (fy + 0.5) / s - 0.5, fx, fy);
      }
    }
  }

  /** Fills `shape` with one flat colour. */
  public flat(shape: Shape, color: Color, alpha = 1): void {
    this.each(shape, (_u, _v, fx, fy) => this.fpx(fx, fy, color, alpha));
  }

  /** Fills `shape` with shades of `base`, lit from the top-left (see {@link FillOptions}). */
  public fill(shape: Shape, base: Color, o: FillOptions = {}): void {
    const r = ramp(base);
    const outline = o.rimShade === undefined ? outlineOf(base) : tone(base, o.rimShade);
    const bevel = o.bevel ?? 1;
    const dither = o.dither ?? 0.4;
    const w = Math.max(1, shape.x1 - shape.x0);
    const h = Math.max(1, shape.y1 - shape.y0);
    const cx = (shape.x0 + shape.x1) / 2;
    const cy = (shape.y0 + shape.y1) / 2;
    const d = 1 / this.scale;
    this.each(shape, (x, y, fx, fy) => {
      const up = shape.test(x, y - d);
      const down = shape.test(x, y + d);
      const left = shape.test(x - d, y);
      const right = shape.test(x + d, y);
      if (o.rim && !(up && down && left && right)) {
        this.fpx(fx, fy, outline);
        return;
      }
      let v = o.shade ?? 0;
      if (o.sphere) {
        const nx = (x + 0.5 - cx) / (w / 2);
        const ny = (y + 0.5 - cy) / (h / 2);
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        v += ((nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) - 0.72) * 4.5 * (o.sphereAmount ?? 1);
      }
      if (o.grad) {
        v += o.grad * (1 - (2 * (y + 0.5 - shape.y0)) / h);
      }
      if (o.gradX) {
        v += o.gradX * (1 - (2 * (x + 0.5 - shape.x0)) / w);
      }
      if (o.tex) {
        v += (hash(fx, fy, o.seed ?? 0) - 0.5) * 2 * o.tex;
      }
      if (bevel) {
        if (!up || !left) {
          v += bevel;
        } else if (!down || !right) {
          v -= bevel;
        }
      }
      if (this.scale > 1) {
        // Supersampled art gets half-step shades for smoother, richer shading.
        const k = Math.max(-DARK_STEPS, Math.min(LIGHT_STEPS, Math.round((v + bayer(fx, fy) * dither * 0.5) * 2) / 2));
        this.fpx(fx, fy, Number.isInteger(k) ? r[k + DARK_STEPS] : shadeOf(base, k));
        return;
      }
      const k = Math.max(-DARK_STEPS, Math.min(LIGHT_STEPS, Math.round(v + bayer(fx, fy) * dither)));
      this.fpx(fx, fy, r[k + DARK_STEPS]);
    });
  }

  /** One paint unit in shade `k` of `base`. */
  public dot(x: number, y: number, base: Color, k = 0): void {
    this.px(x, y, tone(base, k));
  }

  /** Draws `src` (same scale) over this buffer with its top-left at paint units (dx, dy). */
  public draw(src: Paint, dx = 0, dy = 0): void {
    const ox = Math.round(dx * this.scale);
    const oy = Math.round(dy * this.scale);
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        const [r, g, b, a] = src.get(x, y);
        if (a > 0) {
          this.fpx(x + ox, y + oy, [r, g, b], a / 255);
        }
      }
    }
  }

  /**
   * Selective outline `thickness` real pixels wide (default one paint unit): every transparent pixel
   * near the silhouette takes a dark, saturated version of the nearest colour (not plain black), as
   * in hand-made sprites.
   */
  public outline(thickness = this.scale): this {
    const src = new Uint8ClampedArray(this.data);
    const alpha = (x: number, y: number): number =>
      x < 0 || y < 0 || x >= this.width || y >= this.height ? 0 : src[(y * this.width + x) * 4 + 3];
    const offsets: Array<[number, number]> = [];
    for (let j = -thickness; j <= thickness; j++) {
      for (let i = -thickness; i <= thickness; i++) {
        if ((i || j) && Math.abs(i) + Math.abs(j) <= thickness + (thickness > 1 && i && j ? 1 : 0)) {
          offsets.push([i, j]);
        }
      }
    }
    offsets.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (alpha(x, y) > 127) {
          continue;
        }
        const n = offsets.find(([i, j]) => alpha(x + i, y + j) > 127);
        if (n) {
          const i = ((y + n[1]) * this.width + x + n[0]) * 4;
          this.fpx(x, y, outlineOf([src[i], src[i + 1], src[i + 2]]));
        }
      }
    }
    return this;
  }

  /** A horizontally mirrored copy. */
  public mirror(): Paint {
    const out = new Paint(this.width / this.scale, this.height / this.scale, this.scale);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const s = (y * this.width + x) * 4;
        const d = (y * this.width + (this.width - 1 - x)) * 4;
        out.data.set(this.data.subarray(s, s + 4), d);
      }
    }
    return out;
  }

  /** True when every pixel is fully transparent. */
  public get empty(): boolean {
    for (let i = 3; i < this.data.length; i += 4) {
      if (this.data[i] > 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * A canvas of these pixels marked with `density` real pixels per logical pixel (default `2 * scale`:
   * paint units are half a logical pixel).
   */
  public toCanvas(density = 2 * this.scale): HTMLCanvasElement {
    return setImageDensity(pixelsToCanvas(this), density);
  }

  /** Calls `fn` with paint-space centre (u, v) and real (fx, fy) for every real pixel inside `shape`. */
  private each(shape: Shape, fn: (u: number, v: number, fx: number, fy: number) => void): void {
    const s = this.scale;
    const x0 = Math.max(0, Math.floor(shape.x0 * s));
    const y0 = Math.max(0, Math.floor(shape.y0 * s));
    const x1 = Math.min(this.width, Math.ceil(shape.x1 * s));
    const y1 = Math.min(this.height, Math.ceil(shape.y1 * s));
    for (let fy = y0; fy < y1; fy++) {
      const v = (fy + 0.5) / s - 0.5;
      for (let fx = x0; fx < x1; fx++) {
        const u = (fx + 0.5) / s - 0.5;
        if (shape.test(u, v)) {
          fn(u, v, fx, fy);
        }
      }
    }
  }
}
