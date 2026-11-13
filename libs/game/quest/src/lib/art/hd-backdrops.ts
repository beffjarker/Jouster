import { Backdrop } from '../data/maps';
import { ART_SCALE, Color, Paint, Rgb, Shape, bayer, box, cut, ell, hash, poly, rgb, seg, tone, union, valueNoise } from './hd-paint';

/**
 * Painted battle backdrops: a dithered sky (or cave wall), distant ridges, per-backdrop scenery and
 * a textured ground strewn with perspective-scaled detail. Painted once per backdrop at the same
 * density as the rest of the procedural art and cached by {@link Art}.
 */

/** Sky top, sky bottom, far ground, near ground, scenery. */
export type BackdropColors = readonly [string, string, string, string, string];

export const BACKDROP_COLORS: ReadonlyMap<Backdrop, BackdropColors> = new Map<Backdrop, BackdropColors>([
  ['field', ['#2c5cb0', '#78b0e8', '#4a9a3a', '#3a8a30', '#2e6e28']],
  ['forest', ['#1e3e70', '#4a7aa8', '#2a6a2a', '#1f5a22', '#123a16']],
  ['hills', ['#3a64a0', '#90b8d8', '#8a7a48', '#7a6a3a', '#5a4e2c']],
  ['cave', ['#0a080e', '#1e1822', '#463830', '#3a2e28', '#241c1c']],
]);

/** Paint units per logical pixel (matching the tiles' and sprites' 2x paint space). */
const U = 2;
/** Noise wrap large enough that nothing visibly repeats across the screen. */
const NO_WRAP = 1 << 20;

function mix(a: Color, b: Color, t: number): Rgb {
  const x = rgb(a);
  const y = rgb(b);
  return [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t];
}

function scaled(c: Rgb, f: number): Rgb {
  return [c[0] * f, c[1] * f, c[2] * f];
}

/** Smooth ridge height (paint units above the baseline) at x. */
function ridge(x: number, seed: number, amp: number): number {
  return (
    amp *
    (0.55 * Math.sin(x / 61 + seed) +
      0.3 * Math.sin(x / 23 + seed * 2.3) +
      0.15 * Math.sin(x / 9 + seed * 4.1) +
      0.35 * (valueNoise(x, seed * 31, 40, seed, NO_WRAP) - 0.5))
  );
}

function cloud(p: Paint, cx: number, cy: number, s: number, seed: number): void {
  const puffs: Shape[] = [ell(cx, cy, s, s * 0.42)];
  for (let i = 0; i < 5; i++) {
    const t = (i - 2) / 2;
    const r = s * (0.32 + hash(i, seed, 5) * 0.22);
    puffs.push(ell(cx + t * s * 0.75, cy - r * 0.55 - hash(seed, i, 6) * s * 0.15, r, r * 0.85));
  }
  const body = cut(union(...puffs), box(cx - s * 2, cy + s * 0.3, s * 4, s));
  p.fill(body, '#eef2fa', { sphere: true, sphereAmount: 0.35, grad: 1.2, rim: true, rimShade: -1.5, dither: 0.7 });
  // Grey underbelly and a few bright highlights on the tops of the puffs.
  p.flat(cut(body, box(cx - s * 2, cy - s * 2, s * 4, s * 2.1)), '#aab4c8', 0.45);
  for (let i = 0; i < 3; i++) {
    p.flat(ell(cx + (i - 1) * s * 0.6, cy - s * 0.55, s * 0.18, s * 0.08), '#ffffff', 0.55);
  }
}

function conifer(p: Paint, x: number, base: number, h: number, color: Color, seed: number): void {
  const w = h * 0.42;
  p.fill(box(x - h * 0.04, base - h * 0.16, h * 0.08, h * 0.16), '#4a3020', { bevel: 0, tex: 0.6, seed });
  const tiers: Shape[] = [];
  for (let i = 0; i < 4; i++) {
    const top = base - h + (i * h * 0.22);
    const half = w * (0.45 + i * 0.2);
    const bottom = top + h * 0.34;
    tiers.push(poly([x, top, x + half, bottom, x + half * 0.35, bottom - h * 0.03, x - half * 0.35, bottom - h * 0.03, x - half, bottom]));
  }
  const tree = union(...tiers);
  p.fill(tree, color, { gradX: 1.4, grad: 0.6, tex: 0.7, seed, rim: true });
  // Needle strokes catching the light on the left of each tier.
  for (let i = 0; i < 9; i++) {
    const tx = x - w * 0.3 * hash(i, seed, 2);
    const ty = base - h * (0.2 + 0.7 * hash(seed, i, 3));
    p.flat(seg(tx, ty, tx - h * 0.06, ty + h * 0.04, 0.2), tone(color, 1.5), 0.7);
  }
}

function roundTree(p: Paint, x: number, base: number, r: number, color: Color, seed: number): void {
  p.fill(box(x - r * 0.12, base - r * 0.7, r * 0.24, r * 0.7), '#5a3a22', { bevel: 0 });
  const crown = union(ell(x, base - r * 1.3, r, r * 0.85), ell(x - r * 0.55, base - r * 0.95, r * 0.6), ell(x + r * 0.55, base - r * 0.95, r * 0.6));
  p.fill(crown, color, { sphere: true, sphereAmount: 0.6, tex: 0.6, seed, rim: true });
  if (hash(seed, 3, 9) > 0.5) {
    for (let i = 0; i < 4; i++) {
      p.spot(x + (hash(i, seed, 1) - 0.5) * r * 1.4, base - r * (0.9 + hash(seed, i, 2) * 0.8), '#d83a2a');
    }
  }
}

function rock(p: Paint, x: number, y: number, r: number, color: Color, seed: number): void {
  const s = poly([x - r, y, x - r * 0.8, y - r * 0.6, x - r * 0.2, y - r * (0.9 + hash(seed, 1, 4) * 0.3), x + r * 0.6, y - r * 0.7, x + r, y]);
  p.flat(ell(x + r * 0.2, y, r * 1.2, r * 0.25), '#000000', 0.25);
  p.fill(s, color, { sphere: true, sphereAmount: 0.7, tex: 0.5, seed, rim: true });
  p.flat(seg(x - r * 0.3, y - r * 0.55, x + r * 0.1, y - r * 0.2, Math.max(0.15, r * 0.06)), tone(color, -2), 0.6);
}

function grassTuft(p: Paint, x: number, y: number, sc: number, color: Color, seed: number): void {
  const blades = 3 + Math.floor(hash(seed, 0, 7) * 3);
  for (let i = 0; i < blades; i++) {
    const lean = (hash(i, seed, 8) - 0.5) * 3 * sc;
    const h = (2.5 + hash(seed, i, 9) * 3.5) * sc;
    const bx = x + (i - blades / 2) * 0.8 * sc;
    p.flat(seg(bx, y, bx + lean, y - h, 0.12 + 0.12 * sc), tone(color, i % 2 ? 1.5 : -1), 0.9);
  }
}

function crystal(p: Paint, x: number, y: number, h: number, seed: number): void {
  const glow = ell(x, y - h * 0.4, h * 0.9, h * 0.7);
  p.flat(glow, '#4ac8e8', 0.12);
  for (let i = 0; i < 3; i++) {
    const dx = (i - 1) * h * 0.28;
    const hh = h * (i === 1 ? 1 : 0.6 + hash(i, seed, 3) * 0.2);
    const lean = (i - 1) * h * 0.15;
    const s = poly([x + dx - h * 0.12, y, x + dx + lean, y - hh, x + dx + h * 0.12, y]);
    p.fill(s, '#5ad0f0', { gradX: 2, rim: true, rimShade: -3 });
    p.flat(seg(x + dx - h * 0.04, y - hh * 0.2, x + dx + lean * 0.7, y - hh * 0.8, 0.15), '#e8fcff', 0.8);
  }
}

/**
 * Battle backdrop `kind` of `width` x `height` logical pixels with the horizon at `horizon`.
 * Stored at {@link ART_SCALE} x 2 real pixels per logical pixel.
 */
export function paintBackdrop(kind: Backdrop, width: number, height: number, horizon: number): Paint {
  const [skyTop, skyLow, far, near, scenery] = BACKDROP_COLORS.get(kind) ?? (BACKDROP_COLORS.get('field') as BackdropColors);
  const W = width * U;
  const H = height * U;
  const HZ = horizon * U;
  const p = new Paint(W, H, ART_SCALE);
  const cave = kind === 'cave';
  const sunX = W * 0.78;
  const sunY = HZ * 0.28;
  const sunR = HZ * 0.09;

  // Sky (or the cave's rock wall), the far ridge and the ground, in one pass over the real pixels.
  // Colours are parsed and the ridge line computed once per column up front to keep this fast.
  const [cTop, cLow, cFar, cNear] = [skyTop, skyLow, far, near].map((c) => rgb(c));
  const ridgeRgb = mix(scenery, skyLow, cave ? 0.2 : 0.55);
  const haze = rgb('#f4f0e8');
  const sunCore = rgb('#fff8d8');
  const sunGlow = rgb('#fff4c8');
  const snow = rgb('#f4f8ff');
  const dirt = rgb('#b89a62');
  const black: Rgb = [0, 0, 0];
  const s = p.scale;
  const ridgeTop: number[] = [];
  for (let fx = 0; fx <= p.width; fx++) {
    const u = (fx + 0.5) / s - 0.5;
    ridgeTop.push(HZ - (kind === 'hills' ? 70 : 42) - ridge(u, 1.7, kind === 'hills' ? 34 : 20));
  }
  const data = p.data;
  const lerp = (x: Rgb, y: Rgb, t: number): Rgb => [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t];
  for (let fy = 0; fy < p.height; fy++) {
    const v = (fy + 0.5) / s - 0.5;
    const tg = (v - HZ) / Math.max(1, H - HZ);
    const pathCentre = W * 0.46 + Math.sin(v / 17) * W * 0.06 + (v - HZ) * 0.9;
    const stripe = kind === 'field' && v >= HZ && Math.sin(18 / (tg + 0.12)) > 0.55 ? 1.06 : 1;
    for (let fx = 0; fx < p.width; fx++) {
      const u = (fx + 0.5) / s - 0.5;
      const d = bayer(fx, fy);
      let c: Rgb;
      if (v < HZ) {
        const t = Math.max(0, Math.min(1, v / HZ + d * 0.05));
        c = lerp(cTop, cLow, t * t);
        if (cave) {
          const n = valueNoise(u, v, 26, 3, NO_WRAP) * 0.65 + valueNoise(u, v, 7, 5, NO_WRAP) * 0.35;
          c = scaled(c, 0.75 + n * 0.9 + d * 0.08);
          if (valueNoise(u, v * 2.2, 11, 9, NO_WRAP) > 0.78) {
            c = scaled(c, 0.7);
          }
        } else {
          // Haze towards the horizon and the sun's glow.
          c = lerp(c, haze, Math.max(0, t - 0.7) * 0.6);
          const ds = Math.hypot(u - sunX, v - sunY);
          if (ds < sunR) {
            c = lerp(sunCore, [255, 255, 255], 1 - ds / sunR);
          } else if (ds < sunR * 6) {
            c = lerp(c, sunGlow, (1 - ds / (sunR * 6)) ** 2 * 0.55 + d * 0.04);
          }
        }
        const rTop = ridgeTop[fx];
        if (v >= rTop) {
          const slope = (ridgeTop[Math.min(p.width, fx + 12)] - ridgeTop[Math.max(0, fx - 12)]) * (s / 24);
          let rc = scaled(ridgeRgb, 1 + Math.max(-0.12, Math.min(0.12, slope * 0.25)) + d * 0.04);
          if (kind === 'hills' && v < rTop + 8 && rTop < HZ - 82) {
            rc = lerp(rc, snow, 0.85);
          }
          c = lerp(rc, cLow, cave ? 0 : Math.max(0, (HZ - v) / 120) * 0.25);
        }
      } else {
        c = lerp(cFar, cNear, Math.min(1, tg * 2.5));
        const n = valueNoise(u, v * (2.2 - tg), 34, 11, NO_WRAP) * 0.6 + valueNoise(u, v, 6, 13, NO_WRAP) * 0.4;
        const grain = (hash(fx, fy, 17) - 0.5) * 0.1;
        c = scaled(c, (0.82 + n * 0.32 + valueNoise(u, v, 2, 15, NO_WRAP) * 0.08 + grain + d * 0.04) * stripe);
        if (kind === 'hills' && Math.abs(u - pathCentre) < 4 + tg * 36) {
          c = lerp(c, dirt, 0.75);
        }
        // Atmospheric haze right at the horizon.
        c = lerp(c, cave ? black : cLow, Math.max(0, 0.08 - tg) * (cave ? 6 : 4));
      }
      const i = (fy * p.width + fx) * 4;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
    }
  }

  if (cave) {
    // Stalactites from the ceiling, stalagmites and crystals along the back wall.
    for (let i = 0; i < 26; i++) {
      const x = (i + hash(i, 1, 21)) * (W / 26);
      const h = 18 + hash(i, 2, 21) * 60;
      const w = 5 + hash(i, 3, 21) * 9;
      p.fill(poly([x - w, -1, x + w, -1, x + w * 0.2, h * 0.7, x, h]), scenery, { gradX: 1.6, tex: 0.6, seed: i, rim: true });
      p.spot(x, h + 3 + hash(i, 4, 21) * 6, '#6a8ab0');
    }
    for (let i = 0; i < 18; i++) {
      const x = (i + hash(i, 5, 22)) * (W / 18);
      const h = 14 + hash(i, 6, 22) * 40;
      const w = 6 + hash(i, 7, 22) * 8;
      p.fill(poly([x - w, HZ + 2, x - w * 0.2, HZ - h * 0.7, x, HZ - h, x + w * 0.3, HZ - h * 0.6, x + w, HZ + 2]), tone(scenery, 0.5), {
        gradX: 1.4,
        tex: 0.6,
        seed: i + 40,
        rim: true,
      });
    }
    for (let i = 0; i < 5; i++) {
      crystal(p, (i + 0.3 + hash(i, 8, 23) * 0.4) * (W / 5), HZ + 4, 10 + hash(i, 9, 23) * 8, i);
    }
  } else {
    for (let i = 0; i < 6; i++) {
      const s = 14 + hash(i, 1, 31) * 20;
      cloud(p, (i + hash(i, 2, 31) * 0.8) * (W / 6), HZ * (0.12 + hash(i, 3, 31) * 0.3), s, i);
    }
    // A flock of distant birds.
    for (let i = 0; i < 4; i++) {
      const bx = W * 0.3 + i * 9 + hash(i, 4, 32) * 6;
      const by = HZ * 0.22 + hash(i, 5, 32) * 10;
      p.flat(seg(bx - 2, by - 1, bx, by, 0.25), '#2a2a3a');
      p.flat(seg(bx, by, bx + 2, by - 1, 0.25), '#2a2a3a');
    }
  }

  // Middle distance.
  if (kind === 'forest') {
    const back = mix(scenery, skyLow, 0.35);
    for (let x = -10; x < W + 20; x += 15) {
      conifer(p, x + hash(x, 1, 41) * 8, HZ + 3, 38 + hash(x, 2, 41) * 26, back, x);
    }
    for (let x = -14; x < W + 20; x += 21) {
      conifer(p, x + hash(x, 3, 42) * 10, HZ + 8, 50 + hash(x, 4, 42) * 30, scenery, x + 1000);
    }
  } else if (kind === 'field' || kind === 'hills') {
    const mid = kind === 'hills' ? mix(scenery, far, 0.35) : mix(scenery, far, 0.5);
    const midRidge = (x: number): number => HZ - 8 - ridge(x, 4.2, kind === 'hills' ? 16 : 7) - (kind === 'hills' ? 10 : 0);
    const pts: number[] = [-2, HZ + 2];
    for (let x = -2; x <= W + 2; x += 4) {
      pts.push(x, midRidge(x));
    }
    pts.push(W + 2, HZ + 2);
    p.fill(poly(pts), mid, { grad: 0.8, tex: 0.6, seed: 7, rim: true, rimShade: -1.5 });
    if (kind === 'field') {
      for (let i = 0; i < 22; i++) {
        const x = (i + hash(i, 1, 43)) * (W / 22);
        roundTree(p, x, midRidge(x) + 4, 5 + hash(i, 2, 43) * 3, tone(scenery, 0.5), i);
      }
    } else {
      for (let i = 0; i < 10; i++) {
        const x = (i + hash(i, 3, 44)) * (W / 10);
        rock(p, x, midRidge(x) + 6, 6 + hash(i, 4, 44) * 6, '#8a8070', i);
      }
    }
  }

  // Foreground detail, denser and larger towards the bottom (nearer the viewer).
  const ground = H - HZ;
  const count = Math.round(W / (cave ? 9 : 4));
  for (let i = 0; i < count; i++) {
    const t = Math.pow(hash(i, 1, 51), 0.8);
    const x = hash(i, 2, 51) * W;
    const y = HZ + 4 + t * (ground - 6);
    const sc = 0.45 + t * 1.4;
    const r = hash(i, 3, 51);
    if (cave) {
      if (r < 0.5) {
        rock(p, x, y, 2 + sc * 3, tone(scenery, 1), i);
      } else {
        p.flat(seg(x, y, x + (r - 0.75) * 30 * sc, y + 2 * sc, 0.25), tone(near, -2.5), 0.8);
      }
    } else if (r < 0.72) {
      grassTuft(p, x, y, sc, kind === 'hills' ? '#7a8a3a' : near, i);
    } else if (r < 0.86 && kind === 'field') {
      const petals = ['#f0e040', '#f07090', '#ffffff', '#a080f0'][i % 4];
      p.flat(seg(x, y, x, y - 2.5 * sc, 0.15), tone(near, -1));
      p.flat(ell(x, y - 2.5 * sc, 0.9 * sc, 0.7 * sc), petals);
      p.spot(x, y - 2.5 * sc, '#c08020');
    } else if (r < 0.86 && kind === 'forest') {
      p.flat(seg(x, y, x, y - 2 * sc, 0.35 * sc), '#e8e0c8');
      p.fill(ell(x, y - 2.2 * sc, 1.6 * sc, 1 * sc), '#c83a2a', { sphere: true, bevel: 0 });
      p.spot(x - 0.5 * sc, y - 2.6 * sc, '#ffffff');
    } else {
      rock(p, x, y, 1.2 + sc * (kind === 'hills' ? 3.5 : 2), '#8a8478', i);
    }
  }
  if (cave) {
    // Still pools reflecting the crystals' glow.
    for (let i = 0; i < 3; i++) {
      const x = (i + 0.2 + hash(i, 1, 61) * 0.6) * (W / 3);
      const y = HZ + ground * (0.35 + hash(i, 2, 61) * 0.5);
      const rx = 18 + hash(i, 3, 61) * 22;
      p.fill(ell(x, y, rx, rx * 0.22), '#1a2a3e', { bevel: 0, grad: -0.8, rim: true, rimShade: -2 });
      p.flat(seg(x - rx * 0.5, y - 1, x - rx * 0.1, y - 1, 0.2), '#7ad8f0', 0.7);
      p.flat(seg(x + rx * 0.1, y + 1.5, x + rx * 0.4, y + 1.5, 0.2), '#7ad8f0', 0.4);
    }
  }
  return p;
}
