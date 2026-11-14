import { Backdrop } from '../data/maps';
import { BACKDROP_COLORS, paintBackdrop, paintShadow, paintTitleBackdrop, titleTwinkles } from './hd-backdrops';
import { ART_SCALE, Paint } from './hd-paint';

const W = 60;
const H = 40;
const HORIZON = 24;
const KINDS: Backdrop[] = ['field', 'forest', 'hills', 'cave', 'desert', 'marsh', 'snow', 'volcano'];

/** Byte-wise pixel equality (toEqual on million-entry arrays exhausts Jest's heap). */
const samePixels = (a: Paint, b: Paint | undefined): boolean =>
  !!b && a.data.length === b.data.length && a.data.every((v, i) => v === b.data[i]);

/** Darkest pixel of row y (clouds and the sun only ever brighten the sky). */
const darkest = (p: Paint, y: number): number => {
  let min = Infinity;
  for (let x = 0; x < p.width; x++) {
    const [r, g, b] = p.get(x, y);
    min = Math.min(min, r + g + b);
  }
  return min;
};

describe('paintBackdrop', () => {
  const painted = new Map(KINDS.map((k) => [k, paintBackdrop(k, W, H, HORIZON)]));

  it('has colours for every backdrop', () => {
    KINDS.forEach((k) => expect(BACKDROP_COLORS.get(k)).toHaveLength(5));
  });

  it('is stored at 2 x ART_SCALE real pixels per logical pixel and fully opaque', () => {
    painted.forEach((p) => {
      expect(p.width).toBe(W * 2 * ART_SCALE);
      expect(p.height).toBe(H * 2 * ART_SCALE);
      for (let i = 3; i < p.data.length; i += 4) {
        expect(p.data[i]).toBe(255);
      }
    });
  });

  it('is deterministic', () => {
    expect(samePixels(paintBackdrop('hills', W, H, HORIZON), painted.get('hills'))).toBe(true);
  });

  it('differs per backdrop', () => {
    const data = KINDS.map((k) => Buffer.from((painted.get(k) as Paint).data.buffer).toString('base64'));
    expect(new Set(data).size).toBe(KINDS.length);
  });

  it('darkens the sky towards the top outdoors', () => {
    // Large enough that the far ridge stays well below the upper sky.
    const p = paintBackdrop('field', 200, 120, 100);
    expect(darkest(p, 0)).toBeLessThan(darkest(p, Math.floor(p.height * 0.25)));
  });
});

describe('paintTitleBackdrop', () => {
  const p = paintTitleBackdrop(160, 90, 55);

  it('is stored at 2 x ART_SCALE real pixels per logical pixel and fully opaque', () => {
    expect(p.width).toBe(160 * 2 * ART_SCALE);
    expect(p.height).toBe(90 * 2 * ART_SCALE);
    for (let i = 3; i < p.data.length; i += 4) {
      expect(p.data[i]).toBe(255);
    }
  });

  it('is deterministic', () => {
    expect(samePixels(paintTitleBackdrop(160, 90, 55), p)).toBe(true);
  });

  it('is a night scene with warm lit castle windows', () => {
    expect(darkest(p, 0)).toBeLessThan(120);
    let warm = 0;
    for (let i = 0; i < p.data.length; i += 4) {
      if (p.data[i] > 200 && p.data[i + 1] > 120 && p.data[i + 2] < 120) {
        warm++;
      }
    }
    expect(warm).toBeGreaterThan(0);
  });

  it('places twinkles in the sky', () => {
    titleTwinkles(160, 55).forEach((t) => {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThan(160);
      expect(t.y).toBeLessThan(55);
    });
  });
});

describe('paintShadow', () => {
  it('is darkest in the middle and fades out to transparent corners', () => {
    const p = paintShadow(16);
    const alpha = (x: number, y: number): number => p.data[(y * p.width + x) * 4 + 3];
    const cx = Math.floor(p.width / 2);
    const cy = Math.floor(p.height / 2);
    expect(alpha(0, 0)).toBe(0);
    expect(alpha(p.width - 1, p.height - 1)).toBe(0);
    expect(alpha(cx, cy)).toBeGreaterThan(alpha(Math.floor(p.width * 0.85), cy));
    expect(alpha(Math.floor(p.width * 0.85), cy)).toBeGreaterThan(0);
  });
});
