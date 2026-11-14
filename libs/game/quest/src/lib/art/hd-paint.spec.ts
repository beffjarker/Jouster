import { Paint, box, clip, cut, ell, poly, ramp, rgb, seg, tone, union } from './hd-paint';

const lum = ([r, g, b]: readonly number[]): number => 0.299 * r + 0.587 * g + 0.114 * b;

describe('hd-paint colours', () => {
  it('orders ramp shades from dark to light around the base colour', () => {
    const r = ramp('#3a8ae8');
    expect(r).toHaveLength(6);
    expect(r[3]).toEqual(rgb('#3a8ae8'));
    for (let i = 1; i < r.length; i++) {
      expect(lum(r[i])).toBeGreaterThan(lum(r[i - 1]));
    }
  });

  it('hue-shifts shadows cooler and highlights warmer', () => {
    const hue = ([r, g, b]: readonly number[]): number => {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    const base = hue(rgb('#4a9a3a'));
    expect(hue(tone('#4a9a3a', -2))).toBeGreaterThan(base);
    expect(hue(tone('#4a9a3a', 2))).toBeLessThan(base);
  });
});

describe('hd-paint shapes', () => {
  it('tests pixels inside ellipses, boxes, polygons and capsules', () => {
    expect(ell(8, 8, 4).test(8, 8)).toBe(true);
    expect(ell(8, 8, 4).test(13, 8)).toBe(false);
    expect(box(2, 2, 3, 3).test(4, 4)).toBe(true);
    expect(box(2, 2, 3, 3).test(5, 4)).toBe(false);
    expect(poly([0, 0, 10, 0, 0, 10]).test(1, 1)).toBe(true);
    expect(poly([0, 0, 10, 0, 0, 10]).test(8, 8)).toBe(false);
    expect(seg(0, 0, 10, 0, 1.5).test(5, 0)).toBe(true);
    expect(seg(0, 0, 10, 0, 1.5).test(5, 4)).toBe(false);
  });

  it('combines shapes', () => {
    const a = box(0, 0, 4, 4);
    const b = box(2, 2, 4, 4);
    expect(union(a, b).test(5, 5)).toBe(true);
    expect(cut(a, b).test(3, 3)).toBe(false);
    expect(cut(a, b).test(0, 0)).toBe(true);
    expect(clip(a, b).test(3, 3)).toBe(true);
    expect(clip(a, b).test(0, 0)).toBe(false);
  });
});

describe('Paint', () => {
  it('fills only inside the canvas, even for fractional bounds', () => {
    const p = new Paint(8, 8);
    p.fill(box(-2, 2.5, 4, 3), '#ff0000');
    expect(p.get(0, 3)[3]).toBe(255);
    expect(p.get(7, 2)[3]).toBe(0);
    expect(p.get(7, 3)[3]).toBe(0);
  });

  it('outlines a silhouette with a dark version of its colour', () => {
    const p = new Paint(8, 8);
    p.flat(box(3, 3, 2, 2), '#40c040');
    p.outline();
    const [r, g, b, a] = p.get(2, 3);
    expect(a).toBe(255);
    expect(lum([r, g, b])).toBeLessThan(lum(rgb('#40c040')) / 2);
    expect(p.get(0, 0)[3]).toBe(0);
  });

  it('mirrors horizontally', () => {
    const p = new Paint(4, 1);
    p.px(0, 0, '#ffffff');
    const m = p.mirror();
    expect(m.get(3, 0)[3]).toBe(255);
    expect(m.get(0, 0)[3]).toBe(0);
  });

  it('composites one paint over another', () => {
    const a = new Paint(4, 4);
    const b = new Paint(2, 2);
    b.flat(box(0, 0, 2, 2), '#0000ff');
    a.draw(b, 2, 2);
    expect(a.get(3, 3)).toEqual([0, 0, 255, 255]);
    expect(a.empty).toBe(false);
    expect(new Paint(2, 2).empty).toBe(true);
  });
});
