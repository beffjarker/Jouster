import { CELL_HEIGHT, CELL_WIDTH, GLYPH_HEIGHT, GLYPHS, glyphFor, textWidth } from './pixel-font';
import { createCanvas, imageDensity } from './sprite';

export interface DrawOptions {
  flipX?: boolean;
  scale?: number;
  alpha?: number;
}

export interface RendererOptions {
  /**
   * Real canvas pixels per logical pixel. With 2, a 512x480 canvas has a 256x240 logical
   * layout while hi-density art (see `setImageDensity`) renders with full 32-bit-era detail.
   */
  pixelRatio?: number;
}

/**
 * Pixel-art 2D renderer with retro helpers (bitmap text, bordered windows).
 * Coordinates are in logical pixels; the canvas is scaled up with CSS.
 */
export class Renderer {
  public readonly width: number;
  public readonly height: number;
  public readonly pixelRatio: number;
  private readonly glyphCache = new Map<string, HTMLCanvasElement>();

  constructor(public readonly ctx: CanvasRenderingContext2D, opts: RendererOptions = {}) {
    this.pixelRatio = Math.max(1, Math.floor(opts.pixelRatio ?? 1));
    this.width = Math.floor(ctx.canvas.width / this.pixelRatio);
    this.height = Math.floor(ctx.canvas.height / this.pixelRatio);
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  /** Snaps a logical coordinate to the nearest real pixel. */
  private snap(v: number): number {
    return Math.round(v * this.pixelRatio) / this.pixelRatio;
  }

  public clear(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  public fillRect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(this.snap(x), this.snap(y), w, h);
  }

  public strokeRect(x: number, y: number, w: number, h: number, color: string): void {
    this.fillRect(x, y, w, 1, color);
    this.fillRect(x, y + h - 1, w, 1, color);
    this.fillRect(x, y, 1, h, color);
    this.fillRect(x + w - 1, y, 1, h, color);
  }

  public draw(image: CanvasImageSource & { width: number; height: number }, x: number, y: number, opts: DrawOptions = {}): void {
    const scale = (opts.scale ?? 1) / imageDensity(image);
    const w = image.width * scale;
    const h = image.height * scale;
    const ctx = this.ctx;
    ctx.save();
    if (opts.alpha !== undefined) {
      ctx.globalAlpha = opts.alpha;
    }
    if (opts.flipX) {
      ctx.translate(this.snap(x) + w, this.snap(y));
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0, w, h);
    } else {
      ctx.drawImage(image, this.snap(x), this.snap(y), w, h);
    }
    ctx.restore();
  }

  /** Draws bitmap text. Returns the width drawn. */
  public text(text: string, x: number, y: number, color = '#ffffff'): number {
    let cx = Math.round(x);
    const cy = Math.round(y);
    for (const ch of text) {
      if (ch !== ' ') {
        this.ctx.drawImage(this.glyph(ch, color), cx, cy);
      }
      cx += CELL_WIDTH;
    }
    return textWidth(text);
  }

  public textCentered(text: string, centerX: number, y: number, color = '#ffffff'): void {
    this.text(text, centerX - textWidth(text) / 2, y, color);
  }

  public textRight(text: string, rightX: number, y: number, color = '#ffffff'): void {
    this.text(text, rightX - textWidth(text), y, color);
  }

  /**
   * Retro window with a rounded double border. The default fill is a deep-blue vertical
   * gradient (16/32-bit RPG style); pass a colour for a flat fill.
   */
  public window(x: number, y: number, w: number, h: number, border = '#ffffff', fill?: string): void {
    if (fill) {
      this.fillRect(x + 1, y + 1, w - 2, h - 2, fill);
    } else {
      const g = this.ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#2a3a8c');
      g.addColorStop(1, '#0a0f30');
      this.ctx.fillStyle = g;
      this.ctx.fillRect(this.snap(x + 1), this.snap(y + 1), w - 2, h - 2);
    }
    this.fillRect(x + 2, y, w - 4, 1, border);
    this.fillRect(x + 2, y + h - 1, w - 4, 1, border);
    this.fillRect(x, y + 2, 1, h - 4, border);
    this.fillRect(x + w - 1, y + 2, 1, h - 4, border);
    this.fillRect(x + 1, y + 1, 1, 1, border);
    this.fillRect(x + w - 2, y + 1, 1, 1, border);
    this.fillRect(x + 1, y + h - 2, 1, 1, border);
    this.fillRect(x + w - 2, y + h - 2, 1, 1, border);
    this.strokeRect(x + 3, y + 3, w - 6, h - 6, '#5a5a6e');
  }

  /** Horizontal gauge (HP/MP bars). */
  public bar(x: number, y: number, w: number, h: number, ratio: number, color: string, back = '#2a2a3a'): void {
    this.fillRect(x, y, w, h, back);
    this.fillRect(x, y, Math.max(0, Math.round(w * Math.min(1, ratio))), h, color);
  }

  public fade(alpha: number, color = '#000000'): void {
    if (alpha <= 0) {
      return;
    }
    this.ctx.save();
    this.ctx.globalAlpha = Math.min(1, alpha);
    this.clear(color);
    this.ctx.restore();
  }

  private glyph(ch: string, color: string): HTMLCanvasElement {
    const key = `${color}|${ch.toUpperCase()}`;
    const cached = this.glyphCache.get(key);
    if (cached) {
      return cached;
    }
    const rows = GLYPHS.has(ch.toUpperCase()) ? glyphFor(ch) : glyphFor('?');
    const canvas = createCanvas(CELL_WIDTH, CELL_HEIGHT);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = color;
      for (let y = 0; y < GLYPH_HEIGHT; y++) {
        for (let x = 0; x < rows[y].length; x++) {
          if (rows[y][x] === '#') {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    }
    this.glyphCache.set(key, canvas);
    return canvas;
  }
}
