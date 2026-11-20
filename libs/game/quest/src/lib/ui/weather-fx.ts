import { Renderer, createCanvas } from '@jouster/game/engine';
import { Climate, Season, WeatherKind } from '../state/weather';
import { SCREEN_H, SCREEN_W } from './widgets';

/**
 * Colour wash over outdoor ground for each climate and season (spring is the natural palette). Only temperate
 * and alpine winters frost the land white; the desert cools, the marsh greys and the volcanic lands darken.
 */
const SEASON_TINT: Readonly<Record<Climate, Readonly<Record<Season, string | undefined>>>> = {
  temperate: {
    spring: undefined,
    summer: 'rgba(255,214,120,0.07)',
    autumn: 'rgba(214,110,30,0.16)',
    winter: 'rgba(228,238,255,0.3)',
  },
  desert: {
    spring: undefined,
    summer: 'rgba(255,190,90,0.12)',
    autumn: 'rgba(230,150,70,0.07)',
    winter: 'rgba(190,205,235,0.1)',
  },
  marsh: {
    spring: undefined,
    summer: 'rgba(210,220,120,0.07)',
    autumn: 'rgba(170,120,50,0.14)',
    winter: 'rgba(170,185,200,0.16)',
  },
  alpine: {
    spring: undefined,
    summer: 'rgba(255,230,170,0.05)',
    autumn: 'rgba(210,180,150,0.06)',
    winter: 'rgba(228,238,255,0.3)',
  },
  volcanic: {
    spring: undefined,
    summer: 'rgba(255,140,60,0.08)',
    autumn: 'rgba(170,90,40,0.1)',
    winter: 'rgba(90,90,110,0.14)',
  },
};

/**
 * Scales a colour's opacity by `strength` (0..1), so effects can fade in and out without touching the canvas
 * alpha. Accepts `rgba(r,g,b,a)` and `#rrggbb`.
 */
export function fadeColor(color: string, strength: number): string {
  if (strength >= 1) {
    return color;
  }
  const s = Math.max(0, strength);
  const rgba = /^rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)$/.exec(color.replace(/\s/g, ''));
  if (rgba) {
    return `rgba(${rgba[1]},${rgba[2]},${rgba[3]},${(parseFloat(rgba[4]) * s).toFixed(3)})`;
  }
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (hex) {
    return `rgba(${parseInt(hex[1], 16)},${parseInt(hex[2], 16)},${parseInt(hex[3], 16)},${s.toFixed(3)})`;
  }
  return color;
}

/**
 * The season's ground wash in a climate at `strength` (0..1), or undefined when that season has none there or it
 * has faded out.
 */
export function seasonTint(season: Season, strength = 1, climate: Climate = 'temperate'): string | undefined {
  const tint = SEASON_TINT[climate][season];
  return tint && strength > 0 ? fadeColor(tint, strength) : undefined;
}

/** Tints the outdoor ground for the season (draw after tiles, before sprites). `strength` fades it in or out. */
export function drawSeasonTint(r: Renderer, season: Season, strength = 1, climate: Climate = 'temperate'): void {
  const tint = seasonTint(season, strength, climate);
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

/** Camera position in logical px; weather is anchored to the world, so it is drawn relative to this. */
export interface WeatherCamera {
  x: number;
  y: number;
}

/** Spans (logical px) over which world-anchored clouds repeat; 3×3 screens holds 9× the per-screen count. */
const CLOUD_SPAN_X = SCREEN_W * 3;
const CLOUD_SPAN_Y = SCREEN_H * 3;

/**
 * Drifting cloud shapes (shadows on the ground, or fog banks with `flat`). Each cloud has a fixed spot in the
 * world plus its own wind drift, so walking makes clouds slide the opposite way instead of following the party.
 */
function clouds(
  r: Renderer,
  time: number,
  cam: WeatherCamera,
  perScreen: number,
  color: string,
  alpha: number,
  flat: boolean,
  speed: number,
): void {
  const count = perScreen * 9;
  for (let i = 0; i < count; i++) {
    const shape = cloudShape(i % CLOUD_SHAPES, color, flat);
    if (!shape) {
      continue;
    }
    const scale = 0.8 + rand(i, 10) * 0.7;
    const w = shape.width * scale;
    const v = speed * (0.6 + rand(i, 11) * 0.8);
    const h = shape.height * scale;
    const x = wrap(rand(i, 12) * CLOUD_SPAN_X + time * v - cam.x, CLOUD_SPAN_X) - w;
    const y = wrap(rand(i, 13) * CLOUD_SPAN_Y - cam.y, CLOUD_SPAN_Y) - h + Math.sin(time * 0.2 + i) * 3;
    if (x >= SCREEN_W || y >= SCREEN_H || x + w <= 0 || y + h <= 0) {
      continue;
    }
    const a = alpha * (0.7 + rand(i, 14) * 0.6) * (flat ? 0.8 + Math.sin(time * 0.5 + i * 2) * 0.2 : 1);
    r.draw(shape, x, y, { scale, alpha: a });
  }
}

// --- Rain and snow cells --------------------------------------------------------------------

/** Size (logical px) of one rain or snow cell: the heavier and lighter patches that sit over the ground. */
const CELL = 110;

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Smooth value noise in [0, 1) over a lattice with unit spacing. */
function cellNoise(x: number, y: number, salt: number): number {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  const fx = smoothstep(x - gx);
  const fy = smoothstep(y - gy);
  const at = (i: number, j: number): number => rand(Math.imul(gx + i, 73856093) ^ Math.imul(gy + j, 19349663), salt);
  const top = at(0, 0) + (at(1, 0) - at(0, 0)) * fx;
  const bottom = at(0, 1) + (at(1, 1) - at(0, 1)) * fx;
  return top + (bottom - top) * fy;
}

/**
 * How hard it rains or snows (`floor`..1) at a world point. The cells are fixed to the ground and drift with the
 * wind like the clouds, so walking carries the party into and out of heavier patches.
 */
function cellDensity(wx: number, wy: number, time: number, drift: number, floor: number): number {
  const n = cellNoise((wx - time * drift) / CELL, wy / CELL, 50);
  return floor + (1 - floor) * smoothstep(Math.min(1, Math.max(0, (n - 0.3) / 0.4)));
}

// --- Rain, snow and lightning ---------------------------------------------------------------

/**
 * Rain streaks with per-drop length, speed and shade, a swaying wind angle and splashes. Each drop sits at a
 * fixed spot in the world (its slant follows its own fall, not the screen), and drops thin out between rain cells.
 */
function rain(
  r: Renderer,
  time: number,
  cam: WeatherCamera,
  count: number,
  speed: number,
  heavy: boolean,
  strength: number,
  drift: number,
): void {
  const wind = (heavy ? -0.35 : -0.18) + Math.sin(time * 0.4) * 0.08;
  const floor = heavy ? 0.3 : 0.15;
  const span = SCREEN_H + 24;
  for (let i = 0; i < count; i++) {
    const v = speed * (0.75 + rand(i, 20) * 0.5);
    const len = 3 + Math.floor(rand(i, 21) * (heavy ? 5 : 3));
    const fall = wrap(rand(i, 22) * span + time * v, span);
    const y = wrap(fall - cam.y, span) - 12;
    const x = wrap(rand(i, 23) * SCREEN_W + fall * wind - cam.x, SCREEN_W);
    if (rand(i, 29) >= cellDensity(x + cam.x, y + cam.y, time, drift, floor)) {
      continue;
    }
    const shade = rand(i, 24);
    const color = shade < 0.3 ? 'rgba(220,235,255,0.7)' : shade < 0.7 ? 'rgba(170,200,255,0.55)' : 'rgba(130,160,220,0.4)';
    const dx = wind < -0.25 ? -1 : 0;
    r.fillRect(x, y, 1, Math.ceil(len / 2), color);
    r.fillRect(x + dx, y + Math.ceil(len / 2), 1, Math.floor(len / 2), color);
  }
  // Splashes: short-lived rings at fixed-but-shuffled spots on the ground.
  const splashes = Math.round((heavy ? 26 : 16) * strength);
  for (let i = 0; i < splashes; i++) {
    const period = 0.45 + rand(i, 25) * 0.5;
    const cycle = Math.floor((time + rand(i, 26) * period) / period);
    const t = ((time + rand(i, 26) * period) % period) / period;
    if (t > 0.35) {
      continue;
    }
    const x = wrap(rand(cycle * 97 + i, 27) * SCREEN_W - cam.x, SCREEN_W);
    const y = wrap(rand(cycle * 89 + i, 28) * SCREEN_H - cam.y, SCREEN_H);
    if (rand(cycle * 83 + i, 29) >= cellDensity(x + cam.x, y + cam.y, time, drift, floor)) {
      continue;
    }
    const w = 2 + Math.floor(t * 10);
    r.fillRect(x - w / 2, y, w, 1, 'rgba(210,225,255,0.45)');
    if (t < 0.15) {
      r.fillRect(x, y - 2, 1, 1, 'rgba(230,240,255,0.6)');
    }
  }
}

/**
 * Snowflakes with depth: big near flakes fall faster and brighter; some are little crosses. Like rain, they thin
 * out between snow cells fixed to the ground (`floor` is the lightest a gap gets). `rgb` recolours the flakes, so
 * the same drift carries blown sand and falling ash.
 */
function snow(
  r: Renderer,
  time: number,
  cam: WeatherCamera,
  count: number,
  speed: number,
  drift: number,
  floor: number,
  rgb = '255,255,255',
): void {
  const span = SCREEN_H + 16;
  const gust = drift === 0 ? 0 : drift * (0.75 + Math.sin(time * 0.7) * 0.35);
  for (let i = 0; i < count; i++) {
    const depth = rand(i, 30);
    const v = speed * (0.5 + depth * 0.9);
    const y = wrap(rand(i, 31) * span + time * v - cam.y, span) - 8;
    const sway = Math.sin(time * (0.8 + rand(i, 32) * 1.4) + i) * (2 + rand(i, 33) * 6);
    const x = wrap(rand(i, 34) * SCREEN_W + time * gust * (0.6 + depth * 0.6) + sway - cam.x, SCREEN_W);
    if (rand(i, 35) >= cellDensity(x + cam.x, y + cam.y, time, drift * 0.5, floor)) {
      continue;
    }
    const alpha = 0.45 + depth * 0.5;
    const color = `rgba(${rgb},${alpha.toFixed(2)})`;
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

/** Strikes land over a field a little wider than the screen, so some hit just out of view (flash only). */
const STRIKE_SPAN_X = SCREEN_W + 160;
const STRIKE_SPAN_Y = SCREEN_H + 80;

/**
 * Irregular lightning, a few times a minute: a screen-wide flash (the sky lighting up) and a jagged bolt with a
 * branch that comes down onto a fixed spot on the ground, where it glows.
 */
function lightning(r: Renderer, time: number, cam: WeatherCamera, strength: number): void {
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
  const bolt = fadeColor('#fffbe0', strength);
  r.fillRect(0, 0, SCREEN_W, SCREEN_H, fadeColor('rgba(255,255,255,0.35)', strength));
  // The ground spot the bolt hits, fixed in the world.
  const groundX = wrap(rand(k, 42) * STRIKE_SPAN_X - cam.x, STRIKE_SPAN_X) - 80;
  const groundY = wrap(rand(k, 43) * STRIKE_SPAN_Y - cam.y, STRIKE_SPAN_Y) - 40;
  // Jag the bolt from the sky down, then slide it sideways so it ends on that spot.
  const top = groundY - SCREEN_H * (0.45 + rand(k, 47) * 0.3);
  const steps: Array<{ x: number; nx: number; y: number; h: number }> = [];
  for (let x = 0, y = top, seg = 0; y < groundY; seg++) {
    const nx = x + (rand(k * 31 + seg, 44) - 0.5) * 14;
    const h = Math.min(6 + rand(k * 31 + seg, 45) * 8, groundY - y);
    steps.push({ x, nx, y, h });
    x = nx;
    y += h;
  }
  const shift = groundX - (steps.length > 0 ? steps[steps.length - 1].nx : 0);
  steps.forEach((st, seg) => {
    const x = st.x + shift;
    const nx = st.nx + shift;
    r.fillRect(Math.min(x, nx), st.y, Math.abs(nx - x) + 2, 2, bolt);
    r.fillRect(nx, st.y, 2, st.h, bolt);
    if (seg === 2) {
      let bx = nx;
      for (let b = 0; b < 3; b++) {
        bx += 5 + rand(k + b, 46) * 4;
        r.fillRect(bx, st.y + st.h + b * 6, 1, 6, fadeColor('rgba(255,250,220,0.8)', strength));
      }
    }
  });
  // Glow where it lands.
  r.fillRect(groundX - 6, groundY - 1, 14, 3, fadeColor('rgba(255,250,200,0.55)', strength));
  r.fillRect(groundX - 2, groundY - 2, 6, 5, fadeColor('rgba(255,255,235,0.8)', strength));
}

/**
 * Draws the weather over the outdoor scene (call before the fog of war and HUD). Clouds, fog banks, rain and snow
 * cells, splashes and lightning strikes are anchored to the world through `cam`; only the tint and the lightning
 * flash (the whole sky lighting up) stay screen-wide.
 * `strength` (0..1) fades the weather in or out: tints and clouds grow more opaque while rain and snow thicken
 * drop by drop, so a change of weather rolls in instead of popping.
 */
export function drawWeather(
  r: Renderer,
  kind: WeatherKind,
  time: number,
  cam: WeatherCamera = { x: 0, y: 0 },
  strength = 1,
): void {
  const s = Math.min(1, strength);
  if (s <= 0) {
    return;
  }
  const tint = (color: string): void => r.fillRect(0, 0, SCREEN_W, SCREEN_H, fadeColor(color, s));
  const n = (count: number): number => Math.round(count * s);
  switch (kind) {
    case 'cloudy':
      tint('rgba(30,40,60,0.12)');
      clouds(r, time, cam, 5, '#141a2c', 0.22 * s, false, 9);
      break;
    case 'rain':
      tint('rgba(30,40,70,0.2)');
      clouds(r, time, cam, 4, '#101626', 0.18 * s, false, 14);
      rain(r, time, cam, n(140), 220, false, s, 14);
      break;
    case 'storm':
      tint('rgba(15,20,40,0.32)');
      clouds(r, time, cam, 5, '#080c18', 0.25 * s, false, 24);
      rain(r, time, cam, n(200), 320, true, s, 24);
      lightning(r, time, cam, s);
      break;
    case 'snow':
      tint('rgba(200,210,230,0.1)');
      clouds(r, time, cam, 3, '#2a3040', 0.12 * s, false, 6);
      snow(r, time, cam, n(110), 22, 0, 0.2);
      break;
    case 'blizzard':
      tint(`rgba(225,232,245,${(0.3 + Math.sin(time * 0.9) * 0.06).toFixed(3)})`);
      clouds(r, time, cam, 5, '#f0f4ff', 0.3 * s, true, -60);
      snow(r, time, cam, n(220), 90, -140, 0.45);
      break;
    case 'fog':
      tint('rgba(205,210,220,0.26)');
      clouds(r, time, cam, 8, '#eef0f4', 0.35 * s, true, 7);
      break;
    case 'sandstorm':
      // A blizzard's gusts carrying sand: a flickering ochre haze, pale dust banks racing low and streaking grains.
      tint(`rgba(176,116,54,${(0.4 + Math.sin(time * 1.1) * 0.06).toFixed(3)})`);
      clouds(r, time, cam, 7, '#ecd09a', 0.38 * s, true, -90);
      snow(r, time, cam, n(260), 30, -200, 0.4, '250,232,192');
      break;
    case 'ashfall':
      // Grey flakes drifting down slowly under a dim, smoky sky.
      tint('rgba(70,45,40,0.22)');
      clouds(r, time, cam, 4, '#1e1818', 0.2 * s, false, 6);
      snow(r, time, cam, n(170), 16, 0, 0.25, '196,190,184');
      break;
    default:
      break;
  }
}
