import { Renderer } from '@jouster/game/engine';
import { WeatherKind } from '../state/weather';
import { WeatherCamera, drawSeasonTint, drawWeather, fadeColor } from './weather-fx';
import { SCREEN_H, SCREEN_W } from './widgets';

interface Call {
  kind: 'rect' | 'image';
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  image?: unknown;
}

/** Records draw calls instead of painting (node test environment has no canvas). */
function recorder(): { r: Renderer; calls: Call[] } {
  const calls: Call[] = [];
  const r = {
    fillRect: (x: number, y: number, w: number, h: number, color: string) => calls.push({ kind: 'rect', x, y, w, h, color }),
    draw: (image: { width: number; height: number }, x: number, y: number) =>
      calls.push({ kind: 'image', x, y, w: image.width, h: image.height, image }),
  } as unknown as Renderer;
  return { r, calls };
}

function frame(kind: WeatherKind, time: number, cam: WeatherCamera): Call[] {
  const { r, calls } = recorder();
  drawWeather(r, kind, time, cam);
  return calls;
}

const near = (a: number, b: number): boolean => Math.abs(a - b) < 0.01;

beforeAll(() => {
  const ctx = new Proxy({}, { get: () => () => undefined, set: () => true });
  (globalThis as { document?: unknown }).document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
  };
});

afterAll(() => {
  delete (globalThis as { document?: unknown }).document;
});

describe('world-anchored weather', () => {
  it('moves cloud shapes opposite to the camera, not with the party', () => {
    const before = frame('fog', 3, { x: 0, y: 0 }).filter((c) => c.kind === 'image');
    const after = frame('fog', 3, { x: 32, y: 32 }).filter((c) => c.kind === 'image');
    const inside = before.filter((c) => c.x > 40 && c.y > 40 && c.x < SCREEN_W - 40 && c.y < SCREEN_H - 40);
    expect(inside.length).toBeGreaterThan(0);
    inside.forEach((c) =>
      expect(after.some((a) => a.image === c.image && near(a.x, c.x - 32) && near(a.y, c.y - 32))).toBe(true),
    );
  });

  const tint = (c: Call): boolean => c.w === SCREEN_W && c.h === SCREEN_H;
  const small = (calls: Call[]): Call[] => calls.filter((c) => c.kind === 'rect' && !tint(c));
  /** World positions (camera added back) of the particles drawn well inside the screen. */
  const worldSpots = (calls: Call[], cam: WeatherCamera, margin: number): string[] =>
    small(calls)
      .filter((c) => c.x >= margin && c.y >= margin && c.x < SCREEN_W - margin && c.y < SCREEN_H - margin)
      .map((c) => `${(c.x + cam.x).toFixed(2)},${(c.y + cam.y).toFixed(2)}`);

  it.each(['rain', 'storm', 'snow', 'blizzard'] as WeatherKind[])(
    'keeps %s fixed to the ground as the camera moves, in either direction',
    (kind) => {
      const a = { x: 400, y: 300 };
      const b = { x: 437, y: 277 };
      const before = worldSpots(frame(kind, 2, a), a, 40);
      const after = new Set(worldSpots(frame(kind, 2, b), b, 0));
      expect(before.length).toBeGreaterThan(10);
      before.forEach((spot) => expect(after.has(spot) ? spot : `${spot} moved`).toBe(spot));
    },
  );

  it('rains harder in some patches of ground than others', () => {
    const counts = [0, 1, 2, 3, 4, 5].map((i) => small(frame('rain', 2, { x: i * 700, y: i * 450 })).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeGreaterThan(20);
  });

  it('brings lightning down onto a fixed spot on the ground', () => {
    const bolt = (calls: Call[]): Call[] => calls.filter((c) => c.color === '#fffbe0');
    const a = { x: 0, y: 0 };
    const b = { x: 9, y: -6 };
    let checked = 0;
    for (let t = 0; t < 120 && checked < 3; t += 0.02) {
      const first = bolt(frame('storm', t, a));
      const inside = first.length > 0 && first.every((c) => c.x > 20 && c.x < SCREEN_W - 20);
      if (!inside) {
        continue;
      }
      const second = bolt(frame('storm', t, b));
      expect(second.map((c) => [(c.x + b.x).toFixed(2), (c.y + b.y).toFixed(2)])).toEqual(
        first.map((c) => [(c.x + a.x).toFixed(2), (c.y + a.y).toFixed(2)]),
      );
      checked++;
      t += 1;
    }
    expect(checked).toBe(3);
  });

  it('keeps the screen tint full-screen whatever the camera', () => {
    const calls = frame('cloudy', 1, { x: 500, y: 700 });
    expect(calls[0]).toMatchObject({ x: 0, y: 0, w: SCREEN_W, h: SCREEN_H });
  });
});

describe('weather fading', () => {
  const alphaOf = (color = ''): number => Number(/,([\d.]+)\)$/.exec(color)?.[1] ?? 1);
  const draw = (kind: WeatherKind, strength: number): Call[] => {
    const { r, calls } = recorder();
    drawWeather(r, kind, 2, { x: 0, y: 0 }, strength);
    return calls;
  };

  it('scales colour opacity for rgba and hex colours', () => {
    expect(fadeColor('rgba(30,40,60,0.2)', 0.5)).toBe('rgba(30,40,60,0.100)');
    expect(fadeColor('#ff8000', 0.25)).toBe('rgba(255,128,0,0.250)');
    expect(fadeColor('#ff8000', 1)).toBe('#ff8000');
  });

  it('draws nothing at zero strength', () => {
    expect(draw('storm', 0)).toEqual([]);
    const { r, calls } = recorder();
    drawSeasonTint(r, 'winter', 0);
    expect(calls).toEqual([]);
  });

  it('thins the rain and lightens the tint while the weather rolls in', () => {
    const full = draw('rain', 1);
    const half = draw('rain', 0.5);
    expect(alphaOf(half[0].color)).toBeCloseTo(alphaOf(full[0].color) / 2, 2);
    const drops = (calls: Call[]): number => calls.filter((c) => c.kind === 'rect' && c.w === 1).length;
    expect(drops(half)).toBeLessThan(drops(full) * 0.7);
    expect(drops(half)).toBeGreaterThan(0);
  });
});
