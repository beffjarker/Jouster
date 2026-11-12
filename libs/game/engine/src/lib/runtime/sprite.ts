/** Creates an off-screen canvas (browser only). */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Builds full rows from left halves by mirroring them, so symmetric sprites only need
 * half the data. `'..kk'` -> `'..kkkk..'`.
 */
export function mirrorRows(halves: readonly string[]): string[] {
  return halves.map((h) => h + [...h].reverse().join(''));
}

/** Flips rows horizontally. */
export function flipRows(rows: readonly string[]): string[] {
  return rows.map((r) => [...r].reverse().join(''));
}

/**
 * Palette: character -> CSS colour. `.` (or any unmapped character) is transparent.
 */
export type Palette = ReadonlyMap<string, string>;

export function palette(entries: ReadonlyArray<[string, string]>): Palette {
  return new Map(entries);
}

/** Renders pixel-art rows into a new canvas, optionally scaled up by an integer factor. */
export function pixelArtToCanvas(rows: readonly string[], colors: Palette, scale = 1): HTMLCanvasElement {
  const height = rows.length;
  const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
  const canvas = createCanvas(width * scale, height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return canvas;
  }
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = colors.get(row[x]);
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  });
  return canvas;
}

// --- Hi-res pixel pipeline -------------------------------------------------------------------

/** Raw RGBA pixels (same shape as `ImageData`, so it can be tested without a canvas). */
export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

const densities = new WeakMap<object, number>();

/** Records that an image holds `density` real pixels per logical pixel (e.g. 2 for 32x32 art on a 16 grid). */
export function setImageDensity<T extends object>(image: T, density: number): T {
  densities.set(image, density);
  return image;
}

/** Real pixels per logical pixel for an image (1 unless set with `setImageDensity`). */
export function imageDensity(image: object): number {
  return densities.get(image) ?? 1;
}

function pixelAt(p: Pixels, x: number, y: number): number {
  const cx = Math.min(p.width - 1, Math.max(0, x));
  const cy = Math.min(p.height - 1, Math.max(0, y));
  const i = (cy * p.width + cx) * 4;
  return ((p.data[i] << 24) | (p.data[i + 1] << 16) | (p.data[i + 2] << 8) | p.data[i + 3]) >>> 0;
}

function writePixel(p: Pixels, x: number, y: number, v: number): void {
  const i = (y * p.width + x) * 4;
  p.data[i] = (v >>> 24) & 255;
  p.data[i + 1] = (v >>> 16) & 255;
  p.data[i + 2] = (v >>> 8) & 255;
  p.data[i + 3] = v & 255;
}

/**
 * EPX / Scale2x: doubles the resolution while rounding diagonal edges, so chunky pixel art
 * gains smooth curves instead of plain 2x2 blocks.
 */
export function scale2xPixels(src: Pixels): Pixels {
  const out: Pixels = { width: src.width * 2, height: src.height * 2, data: new Uint8ClampedArray(src.data.length * 4) };
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const p = pixelAt(src, x, y);
      const a = pixelAt(src, x, y - 1);
      const b = pixelAt(src, x + 1, y);
      const c = pixelAt(src, x - 1, y);
      const d = pixelAt(src, x, y + 1);
      let e0 = p;
      let e1 = p;
      let e2 = p;
      let e3 = p;
      if (a !== d && c !== b) {
        if (c === a) e0 = a;
        if (a === b) e1 = b;
        if (c === d) e2 = c;
        if (d === b) e3 = d;
      }
      writePixel(out, x * 2, y * 2, e0);
      writePixel(out, x * 2 + 1, y * 2, e1);
      writePixel(out, x * 2, y * 2 + 1, e2);
      writePixel(out, x * 2 + 1, y * 2 + 1, e3);
    }
  }
  return out;
}

export interface ShadeOptions {
  /** Colour drawn around the sprite silhouette (`[r, g, b]`). */
  outline?: readonly [number, number, number];
  /** Brightness boost for top-edge pixels (0..1). */
  light?: number;
  /** Darkening for bottom-edge pixels (0..1). */
  shadow?: number;
}

/**
 * Adds 32-bit-era polish in place: highlights the top edge of each shape, shades the bottom
 * edge, and draws a 1-pixel outline around the silhouette.
 */
export function shadePixels(p: Pixels, opts: ShadeOptions = {}): Pixels {
  const { outline = [18, 14, 28], light = 0.22, shadow = 0.28 } = opts;
  const src = new Uint8ClampedArray(p.data);
  const srcAlpha = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= p.width || y >= p.height ? 0 : src[(y * p.width + x) * 4 + 3];
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      const i = (y * p.width + x) * 4;
      if (srcAlpha(x, y) > 0) {
        const top = srcAlpha(x, y - 1) === 0 || srcAlpha(x, y - 2) === 0;
        const bottom = srcAlpha(x, y + 1) === 0 || srcAlpha(x, y + 2) === 0;
        const k = top && !bottom ? 1 + light : bottom && !top ? 1 - shadow : 1;
        if (k !== 1) {
          for (let c = 0; c < 3; c++) {
            p.data[i + c] = k > 1 ? src[i + c] + (255 - src[i + c]) * (k - 1) : src[i + c] * k;
          }
        }
      } else if (srcAlpha(x - 1, y) || srcAlpha(x + 1, y) || srcAlpha(x, y - 1) || srcAlpha(x, y + 1)) {
        p.data[i] = outline[0];
        p.data[i + 1] = outline[1];
        p.data[i + 2] = outline[2];
        p.data[i + 3] = 255;
      }
    }
  }
  return p;
}

/** Copies a canvas into raw pixels (browser only). */
export function canvasPixels(canvas: HTMLCanvasElement): Pixels | null {
  const ctx = canvas.getContext('2d');
  return ctx ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
}

/** Creates a canvas holding the given pixels (browser only). */
export function pixelsToCanvas(p: Pixels): HTMLCanvasElement {
  const canvas = createCanvas(p.width, p.height);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(p.width, p.height);
    img.data.set(p.data);
    ctx.putImageData(img, 0, 0);
  }
  return canvas;
}

/**
 * Upscales low-res art 2x with EPX and optionally shades and outlines it. The result is marked
 * with density 2 so the renderer draws it at its original logical size.
 */
export function hiResSprite(lowRes: HTMLCanvasElement, shade?: ShadeOptions | false): HTMLCanvasElement {
  const src = canvasPixels(lowRes);
  if (!src) {
    return setImageDensity(lowRes, 1);
  }
  const big = scale2xPixels(src);
  if (shade !== false) {
    shadePixels(big, shade);
  }
  return setImageDensity(pixelsToCanvas(big), 2);
}