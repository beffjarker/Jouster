import { Backdrop } from '../data/maps';
import { BACKDROP_COLORS, paintBackdrop } from './hd-backdrops';
import { ART_SCALE, Paint } from './hd-paint';

const W = 60;
const H = 40;
const HORIZON = 24;
const KINDS: Backdrop[] = ['field', 'forest', 'hills', 'cave'];

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
    expect(paintBackdrop('hills', W, H, HORIZON).data).toEqual(painted.get('hills')?.data);
  });

  it('differs per backdrop', () => {
    const data = KINDS.map((k) => (painted.get(k) as Paint).data.join(','));
    expect(new Set(data).size).toBe(KINDS.length);
  });

  it('darkens the sky towards the top outdoors', () => {
    // Large enough that the far ridge stays well below the upper sky.
    const p = paintBackdrop('field', 200, 120, 100);
    expect(darkest(p, 0)).toBeLessThan(darkest(p, Math.floor(p.height * 0.25)));
  });
});
