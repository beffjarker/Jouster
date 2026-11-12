import { Renderer } from '@jouster/game/engine';
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

/** Screen position of particle `i` falling at `speed` px/s with `drift` px/s sideways. */
function particle(i: number, time: number, speed: number, drift: number): { x: number; y: number } {
  const span = SCREEN_H + 16;
  const y = (((i * 53.7 + time * speed) % span) + span) % span - 8;
  const x = (((i * 97.3 + time * drift + y * (drift / Math.max(1, speed))) % SCREEN_W) + SCREEN_W) % SCREEN_W;
  return { x, y };
}

function rain(r: Renderer, time: number, count: number, speed: number, color: string): void {
  for (let i = 0; i < count; i++) {
    const p = particle(i, time, speed, -speed * 0.2);
    r.fillRect(p.x, p.y, 1, 4, color);
  }
}

function snow(r: Renderer, time: number, count: number, speed: number, drift: number): void {
  for (let i = 0; i < count; i++) {
    const p = particle(i, time, speed * (0.7 + (i % 3) * 0.15), drift);
    const sway = drift === 0 ? Math.sin(time * 1.5 + i) * 6 : 0;
    const size = i % 4 === 0 ? 2 : 1;
    r.fillRect(p.x + sway, p.y, size, size, 'rgba(255,255,255,0.85)');
  }
}

/** Draws the weather over the outdoor scene (call before the fog of war and HUD). */
export function drawWeather(r: Renderer, kind: WeatherKind, time: number): void {
  switch (kind) {
    case 'cloudy':
      r.fillRect(0, 0, SCREEN_W, SCREEN_H, 'rgba(30,40,60,0.14)');
      for (let i = 0; i < 3; i++) {
        const x = ((i * 160 + time * 8) % (SCREEN_W + 140)) - 140;
        r.fillRect(x, 30 + i * 70, 140, 40, 'rgba(20,25,40,0.1)');
      }
      break;
    case 'rain':
      r.fillRect(0, 0, SCREEN_W, SCREEN_H, 'rgba(30,40,70,0.2)');
      rain(r, time, 70, 220, 'rgba(170,200,255,0.55)');
      break;
    case 'storm': {
      r.fillRect(0, 0, SCREEN_W, SCREEN_H, 'rgba(15,20,40,0.34)');
      rain(r, time, 120, 320, 'rgba(180,205,255,0.6)');
      const t = time % 7;
      if (t < 0.1 || (t > 0.2 && t < 0.27)) {
        r.fillRect(0, 0, SCREEN_W, SCREEN_H, 'rgba(255,255,255,0.45)');
      }
      break;
    }
    case 'snow':
      r.fillRect(0, 0, SCREEN_W, SCREEN_H, 'rgba(200,210,230,0.1)');
      snow(r, time, 60, 22, 0);
      break;
    case 'blizzard':
      r.fillRect(0, 0, SCREEN_W, SCREEN_H, 'rgba(225,232,245,0.32)');
      snow(r, time, 160, 90, -140);
      break;
    case 'fog':
      r.fillRect(0, 0, SCREEN_W, SCREEN_H, 'rgba(205,210,220,0.3)');
      for (let i = 0; i < 7; i++) {
        const x = ((i * 90 + time * (6 + i * 2)) % (SCREEN_W + 160)) - 160;
        r.fillRect(x, i * 36, 160, 18, 'rgba(230,234,240,0.18)');
      }
      break;
    default:
      break;
  }
}
