import { Renderer, createCanvas } from '@jouster/game/engine';
import { Season, WeatherKind } from '../state/weather';
import { SCREEN_H, SCREEN_W } from './widgets';

/** Colour wash over outdoor ground for each season (spring is the natural palette). */
const SEASON_TINT: Readonly<Record<Season, string | undefined>> = {
  spring: undefined,
  summer: 'rgba(255,214,120,0.07)',
  autumn: 'rgba(214,110,30,0.16)',
  winter: 'rgba(228,238,255,0.3)',
};

/** Tints the outdoor ground for the season (draw after tiles, before sprites). */
export function drawSeasonTint(r: Renderer, season: Season): void {
  const tint = SEASON_TINT[season];
  if (tint) {
    r.fillRect(0, 0, SCREEN_W, SCREEN_H, tint);
  }
}

/** Stable pseudo-random number in [0, 1) for index `i` and `salt` (no game RNG). */
function rand(i: number, salt = 0): number {
  let h = Math.imul(i + 1, 374761393) ^ Math.imul(salt + 7, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function wrap(v: number, span: number): number {
  return ((v % span) + span) % span;
}

// --- Cloud and fog shapes -------------------------------------------------------------------

/** Size of one chunky "pixel" in a cloud mask, in logical px. */
const CLOUD_BLOCK = 2;
const CLOUD_SHAPES = 5;
const cloudCache = new Map<string, HTMLCanvasElement | null>();

/**
 * Builds a lumpy cloud silhouette from overlapping circles on a coarse grid, so it reads as
 * pixel art. Edge blocks are drawn softer than the core. `flat` makes long, low fog banks.
 */
function cloudShape(index: number, color: string, flat: boolean): HTMLCanvasElement | null {
  const key = `${index}:${color}:${flat}`;
  if (cloudCache.has(key)) {
    return cloudCache.get(key) ?? null;
  }
  const cols = flat ? 80 + Math.floor(rand(index, 1) * 32) : 44 + Math.floor(rand(index, 1) * 28);
  const rows = flat ? 14 + Math.floor(rand(index, 2) * 6) : 20 + Math.floor(rand(index, 2) * 10);
  const blobs: Array<{ x: number; y: number; r: number }> = [
    { x: cols / 2, y: rows * 0.65, r: rows * 0.42 },
  ];
  const lumps = 3 + Math.floor(rand(index, 3) * 4);
  for (let i = 0; i < lumps; i++) {
    const t = (i + 0.5) / lumps;
    const r = (flat ? rows * 0.32 : rows * 0.28) + rand(index * 13 + i, 4) * rows * 0.22;
    blobs.push({ x: cols * (0.15 + t * 0.7), y: rows - r - rand(index * 7 + i, 5) * rows * 0.25, r });
  }
  const inBlob = (x: number, y: number): boolean =>
    blobs.some((b) => (x + 0.5 - b.x) ** 2 + ((y + 0.5 - b.y) * 1.2) ** 2 <= b.r ** 2);
  const filled = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < cols && y < rows && inBlob(x, y);
  const nearEdge = (x: number, y: number, d: number): boolean =>
    !filled(x - d, y) || !filled(x + d, y) || !filled(x, y - d) || !filled(x, y + d);
  const canvas = createCanvas(cols * CLOUD_BLOCK, rows * CLOUD_BLOCK);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    cloudCache.set(key, null);
    return null;
  }
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!filled(x, y)) {
        continue;
      }
      // Dithered outer ring and a half-strength inner ring keep the outline round.
      if (nearEdge(x, y, 1)) {
        if ((x + y) % 2 === 1) {
          continue;
        }
        ctx.globalAlpha = 0.45;
      } else {
        ctx.globalAlpha = nearEdge(x, y, 2) ? 0.7 : 1;
      }
      ctx.fillStyle = color;
      ctx.fillRect(x * CLOUD_BLOCK, y * CLOUD_BLOCK, CLOUD_BLOCK, CLOUD_BLOCK);
    }
  }
  cloudCache.set(key, canvas);
  return canvas;
}

/** Drifting cloud shapes (shadows on the ground, or fog banks with `flat`). */
function clouds(r: Renderer, time: number, count: number, color: string, alpha: number, flat: boolean, speed: number): void {
  for (let i = 0; i < count; i++) {
    const shape = cloudShape(i % CLOUD_SHAPES, color, flat);
    if (!shape) {
      continue;
    }
    const scale = 0.8 + rand(i, 10) * 0.7;
    const w = shape.width * scale;
    const v = speed * (0.6 + rand(i, 11) * 0.8);
    const x = wrap(rand(i, 12) * (SCREEN_W + w) + time * v, SCREEN_W + w) - w;
    const y = rand(i, 13) * (SCREEN_H - 20) - 20 + Math.sin(time * 0.2 + i) * 3;
    const a = alpha * (0.7 + rand(i, 14) * 0.6) * (flat ? 0.8 + Math.sin(time * 0.5 + i * 2) * 0.2 : 1);
    r.draw(shape, x, y, { scale, alpha: a });
  }
}

// --- Rain, snow and lightning ---------------------------------------------------------------

/** Rain streaks with per-drop length, speed and shade, a swaying wind angle and splashes. */
function rain(r: Renderer, time: number, count: number, speed: number, heavy: boolean): void {
  const wind = (heavy ? -0.35 : -0.18) + Math.sin(time * 0.4) * 0.08;
  const span = SCREEN_H + 24;
  for (let i = 0; i < count; i++) {
    const v = speed * (0.75 + rand(i, 20) * 0.5);
    const len = 3 + Math.floor(rand(i, 21) * (heavy ? 5 : 3));
    const y = wrap(rand(i, 22) * span + time * v, span) - 12;
    const x = wrap(rand(i, 23) * SCREEN_W + y * wind, SCREEN_W);
    const shade = rand(i, 24);
    const color = shade < 0.3 ? 'rgba(220,235,255,0.7)' : shade < 0.7 ? 'rgba(170,200,255,0.55)' : 'rgba(130,160,220,0.4)';
    const dx = wind < -0.25 ? -1 : 0;
    r.fillRect(x, y, 1, Math.ceil(len / 2), color);
    r.fillRect(x + dx, y + Math.ceil(len / 2), 1, Math.floor(len / 2), color);
  }
  // Splashes: short-lived rings at fixed-but-shuffled spots on the ground.
  const splashes = heavy ? 26 : 16;
  for (let i = 0; i < splashes; i++) {
    const period = 0.45 + rand(i, 25) * 0.5;
    const cycle = Math.floor((time + rand(i, 26) * period) / period);
    const t = ((time + rand(i, 26) * period) % period) / period;
    if (t > 0.35) {
      continue;
    }
    const x = rand(cycle * 97 + i, 27) * SCREEN_W;
    const y = rand(cycle * 89 + i, 28) * SCREEN_H;
    const w = 2 + Math.floor(t * 10);
    r.fillRect(x - w / 2, y, w, 1, 'rgba(210,225,255,0.45)');
    if (t < 0.15) {
      r.fillRect(x, y - 2, 1, 1, 'rgba(230,240,255,0.6)');
    }
  }
}

/** Snowflakes with depth: big near flakes fall faster and brighter; some are little crosses. */
function snow(r: Renderer, time: number, count: number, speed: number, drift: number): void {
  const span = SCREEN_H + 16;
  const gust = drift === 0 ? 0 : drift * (0.75 + Math.sin(time * 0.7) * 0.35);
  for (let i = 0; i < count; i++) {
    const depth = rand(i, 30);
    const v = speed * (0.5 + depth * 0.9);
    const y = wrap(rand(i, 31) * span + time * v, span) - 8;
    const sway = Math.sin(time * (0.8 + rand(i, 32) * 1.4) + i) * (2 + rand(i, 33) * 6);
    const x = wrap(rand(i, 34) * SCREEN_W + time * gust * (0.6 + depth * 0.6) + sway, SCREEN_W);
    const alpha = 0.45 + depth * 0.5;
    const color = `rgba(255,255,255,${alpha.toFixed(2)})`;
    if (drift !== 0 && depth > 0.5) {
      r.fillRect(x, y, 3 + Math.floor(depth * 3), 1, color);
    } else if (depth > 0.85) {
      r.fillRect(x - 1, y, 3, 1, color);
      r.fillRect(x, y - 1, 1, 3, color);
    } else {
      const size = depth > 0.55 ? 2 : 1;
      r.fillRect(x, y, size, size, color);
    }
  }
}

/** Irregular lightning: a jagged bolt with a branch plus a screen flash, a few times a minute. */
function lightning(r: Renderer, time: number): void {
  const period = 4.5;
  const k = Math.floor(time / period);
  if (rand(k, 40) > 0.6) {
    return;
  }
  const t = time - k * period - rand(k, 41) * 2;
  const lit = (t >= 0 && t < 0.1) || (t > 0.18 && t < 0.26);
  if (!lit) {
    return;
  }
  r.fillRect(0, 0, SCREEN_W, SCREEN_H, 'rgba(255,255,255,0.35)');
  let x = 40 + rand(k, 42) * (SCREEN_W - 80);
  let y = 0;
  const end = SCREEN_H * (0.45 + rand(k, 43) * 0.3);
  let seg = 0;
  while (y < end) {
    const nx = x + (rand(k * 31 + seg, 44) - 0.5) * 14;
    const h = 6 + rand(k * 31 + seg, 45) * 8;
    r.fillRect(Math.min(x, nx), y, Math.abs(nx - x) + 2, 2, '#fffbe0');
    r.fillRect(nx, y, 2, h, '#fffbe0');
    if (seg === 2) {
      let bx = nx;
      for (let b = 0; b < 3; b++) {
        bx += 5 + rand(k + b, 46) * 4;
        r.fillRect(bx, y + h + b * 6, 1, 6, 'rgba(255,250,220,0.8)');
      }
    }
    x = nx;
    y += h;
    seg++;
  }
}

/** Draws the weather over the outdoor scene (call before the fog of war and HUD). */
export function drawWeather(r: Renderer, kind: WeatherKind, time: number): void {
  switch (kind) {
    case 'cloudy':
      r.fillRect(0, 0, SCREEN_W, SCREEN_H, 'rgba(30,40,60,0.12)');
      clouds(r, time, 5, '#141a2c', 0.22, false, 9);
      break;
    case 'rain':
      r.fillRect(0, 0, SCREEN_W, SCREEN_H, 'rgba(30,40,70,0.2)');
      clouds(r, time, 4, '#101626', 0.18, false, 14);
      rain(r, time, 80, 220, false);
      break;
    case 'storm':
      r.fillRect(0, 0, SCREEN_W, SCREEN_H, 'rgba(15,20,40,0.32)');
      clouds(r, time, 5, '#080c18', 0.25, false, 24);
      rain(r, time, 130, 320, true);
      lightning(r, time);
      break;
    case 'snow':
      r.fillRect(0, 0, SCREEN_W, SCREEN_H, 'rgba(200,210,230,0.1)');
      clouds(r, time, 3, '#2a3040', 0.12, false, 6);
      snow(r, time, 70, 22, 0);
      break;
    case 'blizzard':
      r.fillRect(0, 0, SCREEN_W, SCREEN_H, `rgba(225,232,245,${(0.3 + Math.sin(time * 0.9) * 0.06).toFixed(3)})`);
      clouds(r, time, 5, '#f0f4ff', 0.3, true, -60);
      snow(r, time, 170, 90, -140);
      break;
    case 'fog':
      r.fillRect(0, 0, SCREEN_W, SCREEN_H, 'rgba(205,210,220,0.26)');
      clouds(r, time, 8, '#eef0f4', 0.35, true, 7);
      break;
    default:
      break;
  }
}
