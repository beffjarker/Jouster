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
  ['desert', ['#3a6ab8', '#f0d8a8', '#e0c07a', '#d0a860', '#a8603a']],
  ['marsh', ['#3a4a5a', '#a8b8a0', '#4a5a30', '#3a4a26', '#2a3a20']],
  ['snow', ['#3a5a8a', '#c8d8ec', '#e4ecf6', '#d4e0ee', '#4a5a72']],
  ['volcano', ['#1a0a10', '#b0482a', '#4a3a36', '#3a2e2c', '#2a1e1e']],
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

/** Snow resting on each tier of a {@link conifer} of height `h`. */
function snowLoad(p: Paint, x: number, base: number, h: number, seed: number): void {
  const w = h * 0.42;
  for (let i = 0; i < 4; i++) {
    const top = base - h + i * h * 0.22;
    const half = w * (0.45 + i * 0.2);
    const y = top + h * 0.3;
    p.fill(poly([x - half * 0.85, y, x - half * 0.3, y - h * 0.12, x + half * 0.2, y - h * 0.1, x + half * 0.7, y]), '#eef4fc', {
      bevel: 0,
      rim: true,
      rimShade: -1,
      dither: 0.6,
      seed: seed + i,
    });
  }
  p.fill(poly([x - w * 0.12, base - h * 0.98, x, base - h - 1, x + w * 0.12, base - h * 0.9]), '#ffffff', { bevel: 0 });
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
  const volcano = kind === 'volcano';
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
  const lavaRgb = rgb('#ff7a20');
  const lavaHot = rgb('#ffd060');
  const black: Rgb = [0, 0, 0];
  const s = p.scale;
  const ridgeTop: number[] = [];
  for (let fx = 0; fx <= p.width; fx++) {
    const u = (fx + 0.5) / s - 0.5;
    const tall = kind === 'hills' || kind === 'snow' || volcano ? 70 : kind === 'desert' ? 34 : kind === 'marsh' ? 26 : 42;
    ridgeTop.push(HZ - tall - ridge(u, 1.7, kind === 'hills' || kind === 'snow' || volcano ? 34 : kind === 'marsh' ? 10 : 20));
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
        } else if (volcano) {
          // Smoke-choked sky: drifting ash bands, lit red from below.
          const smoke = valueNoise(u, v * 2.4, 30, 71, NO_WRAP);
          c = scaled(c, 0.82 + smoke * 0.3 + d * 0.06);
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
        // The far ridge is pixel art, not a gradient: one texel per paint unit, a stepped silhouette,
        // rock grain in a few flat shade bands mixed by ordered dither, and stepped haze.
        const mu = Math.floor(u);
        const mv = Math.floor(v);
        const col = Math.min(p.width, Math.max(0, Math.round((mu + 0.5) * s)));
        const rTop = Math.floor(ridgeTop[col]);
        if (mv >= rTop) {
          const slope = (ridgeTop[Math.min(p.width, col + 12)] - ridgeTop[Math.max(0, col - 12)]) * (s / 24);
          const lit = Math.max(-1, Math.min(1, slope * 1.2));
          const md = bayer(mu, mv);
          const grain =
            valueNoise(u + lit * (mv - rTop) * 0.6, v * 1.7, 9, 31, NO_WRAP) * 0.45 +
            valueNoise(u, v, 3, 33, NO_WRAP) * 0.25 +
            hash(mu, mv, 35) * 0.3;
          const speck = hash(mu, mv, 36);
          const shade =
            0.5 + lit * 0.35 + (grain - 0.5) * 1.1 + (mv - rTop < 2 ? 0.25 : 0) +
            (speck > 0.93 ? 0.3 : speck < 0.07 ? -0.3 : 0);
          const band = Math.max(0, Math.min(4, Math.floor(shade * 4 + 0.5 + md * 0.8)));
          let rc = scaled(ridgeRgb, 0.66 + band * 0.13);
          if (kind === 'snow' && (mv < rTop + 9 + hash(mu, 0, 37) * 8 || hash(mu >> 1, mv >> 1, 38) > 0.62 - lit * 0.3)) {
            rc = lerp(rc, snow, band >= 2 ? 0.92 : 0.72);
          } else if (volcano && valueNoise(u * 0.6, v * 3, 7, 72, NO_WRAP) > 0.72 && hash(mu >> 2, 0, 73) > 0.55) {
            // Lava runnels streaking down the far slopes.
            rc = lerp(lavaRgb, lavaHot, band >= 3 ? 0.6 : 0);
          } else if (kind === 'hills' && rTop < HZ - 82 && mv < rTop + 5 + hash(mu, 0, 37) * 5) {
            rc = lerp(rc, snow, band >= 2 ? 0.9 : 0.7);
          }
          const hazeAmt = cave || volcano ? 0 : Math.max(0, (HZ - v) / 120) * 0.25;
          c = lerp(rc, cLow, Math.max(0, Math.round(hazeAmt * 10 + md)) / 10);
        }
      } else {
        c = lerp(cFar, cNear, Math.min(1, tg * 2.5));
        const n = valueNoise(u, v * (2.2 - tg), 34, 11, NO_WRAP) * 0.6 + valueNoise(u, v, 6, 13, NO_WRAP) * 0.4;
        const grain = (hash(fx, fy, 17) - 0.5) * 0.1;
        const ripple = kind === 'desert' && Math.sin(v / (1.5 + tg * 3) + Math.sin(u / 23) * 2.4) > 0.75 ? 1.07 : 1;
        c = scaled(c, (0.82 + n * 0.32 + valueNoise(u, v, 2, 15, NO_WRAP) * 0.08 + grain + d * 0.04) * stripe * ripple);
        if (kind === 'hills' && Math.abs(u - pathCentre) < 4 + tg * 36) {
          c = lerp(c, dirt, 0.75);
        }
        if (volcano && valueNoise(u, v * (3 - tg * 2), 14, 74, NO_WRAP) > 0.8) {
          // Glowing cracks in the ash plain.
          c = lerp(lavaRgb, lavaHot, hash(fx >> 1, fy >> 1, 75) > 0.7 ? 0.7 : 0.1);
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
  } else if (volcano) {
    // Black smoke billowing across the sky.
    for (let i = 0; i < 7; i++) {
      const cx = (i + hash(i, 1, 76) * 0.8) * (W / 7);
      const cy = HZ * (0.1 + hash(i, 2, 76) * 0.35);
      const r = 12 + hash(i, 3, 76) * 16;
      p.fill(union(ell(cx, cy, r * 1.6, r * 0.6), ell(cx + r * 0.6, cy - r * 0.3, r, r * 0.55)), '#2a1a1c', {
        sphere: true,
        tex: 0.5,
        seed: i + 80,
        dither: 0.8,
      });
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
  if (volcano) {
    // A smouldering volcano with lava spilling from its crater, and a jagged basalt ridge.
    const vx = W * 0.62;
    const top = HZ - 78;
    const cone = poly([vx - 70, HZ + 2, vx - 12, top, vx + 12, top + 1, vx + 72, HZ + 2]);
    p.fill(cone, mix(scenery, skyLow, 0.15), { gradX: 1.4, tex: 0.6, seed: 77, rim: true, rimShade: -1.5, dither: 0.8 });
    p.flat(ell(vx, top - 4, 18, 8), '#ff8030', 0.25);
    p.fill(ell(vx, top + 1, 11, 2.2), '#ffb040', { bevel: 0 });
    [[-6, 0.6], [3, 1], [8, 0.4]].forEach(([dx, wob], i) => {
      const pts = [vx + dx, top + 1];
      for (let k = 1; k <= 6; k++) {
        pts.push(vx + dx * (1 + k * 0.9) + Math.sin(k * 1.7 + i) * 4 * wob, top + k * ((HZ - top) / 6));
      }
      for (let k = 0; k < pts.length - 2; k += 2) {
        p.flat(seg(pts[k], pts[k + 1], pts[k + 2], pts[k + 3], 1.1 - k * 0.05), '#ff6a20', 0.85);
        p.flat(seg(pts[k], pts[k + 1], pts[k + 2], pts[k + 3], 0.4), '#ffd060', 0.8);
      }
    });
    const crag = (x: number): number => HZ - 6 - ridge(x, 6.7, 12) - (hash(Math.floor(x / 6), 0, 78) > 0.8 ? 6 : 0);
    const pts: number[] = [-2, HZ + 2];
    for (let x = -2; x <= W + 2; x += 3) {
      pts.push(x, crag(x));
    }
    pts.push(W + 2, HZ + 2);
    p.fill(poly(pts), mix(far, '#000000', 0.3), { grad: 0.8, tex: 0.6, seed: 79, rim: true, rimShade: -1.5, dither: 0.8 });
  } else if (kind === 'desert') {
    // Flat-topped mesas and a line of dunes.
    for (let i = 0; i < 4; i++) {
      const x = (i + 0.2 + hash(i, 1, 45) * 0.6) * (W / 4);
      const w = 22 + hash(i, 2, 45) * 30;
      const h = 22 + hash(i, 3, 45) * 26;
      const mesa = poly([x - w, HZ + 2, x - w * 0.7, HZ - h, x + w * 0.65, HZ - h - 2, x + w, HZ + 2]);
      p.fill(mesa, mix(scenery, skyLow, 0.25), { gradX: 1.6, tex: 0.6, seed: i + 70, rim: true, rimShade: -1.5 });
      for (let b = 1; b < 4; b++) {
        p.flat(box(x - w * (0.7 + b * 0.08), HZ - h + b * h * 0.24, w * (1.35 + b * 0.16), 0.6), tone(scenery, -1.5), 0.45);
      }
    }
    const dune = (x: number): number => HZ - 4 - ridge(x, 6.1, 8);
    const pts: number[] = [-2, HZ + 2];
    for (let x = -2; x <= W + 2; x += 4) {
      pts.push(x, dune(x));
    }
    pts.push(W + 2, HZ + 2);
    p.fill(poly(pts), mix(far, skyLow, 0.2), { grad: 0.8, tex: 0.4, seed: 9, rim: true, rimShade: -1 });
  } else if (kind === 'marsh') {
    // Mist-shrouded dead trees.
    const back = mix(scenery, skyLow, 0.5);
    for (let i = 0; i < 9; i++) {
      const x = (i + hash(i, 1, 46)) * (W / 9);
      const h = 30 + hash(i, 2, 46) * 30;
      p.flat(seg(x, HZ + 2, x + (hash(i, 3, 46) - 0.5) * 4, HZ - h, 1.4), back);
      for (let b = 0; b < 3; b++) {
        const by = HZ - h * (0.45 + b * 0.18);
        const dir = b % 2 ? 1 : -1;
        p.flat(seg(x, by, x + dir * (6 + hash(i, b, 47) * 8), by - 6 - b * 2, 0.7), back);
      }
      p.flat(ell(x, HZ - h * 0.5, 14, 5), '#c8d0c0', 0.12);
    }
  } else if (kind === 'snow') {
    // A rolling snowfield ridge lined with snow-laden pines.
    const back = mix(scenery, skyLow, 0.45);
    const drift = (x: number): number => HZ - 6 - ridge(x, 5.3, 9);
    const pts: number[] = [-2, HZ + 2];
    for (let x = -2; x <= W + 2; x += 4) {
      pts.push(x, drift(x));
    }
    pts.push(W + 2, HZ + 2);
    p.fill(poly(pts), mix(far, skyLow, 0.3), { grad: 0.8, tex: 0.5, seed: 11, rim: true, rimShade: -1, dither: 0.8 });
    for (let x = -10; x < W + 20; x += 17) {
      const tx = x + hash(x, 1, 48) * 9;
      const h = 30 + hash(x, 2, 48) * 24;
      conifer(p, tx, drift(tx) + 4, h, back, x + 2000);
      snowLoad(p, tx, drift(tx) + 4, h, x);
    }
  } else if (kind === 'forest') {
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
    } else if (volcano && r < 0.4) {
      rock(p, x, y, 1.4 + sc * 2.6, '#2e2626', i);
    } else if (volcano && r < 0.6) {
      p.flat(seg(x - 3 * sc, y, x + 3 * sc, y - 0.4 * sc, 0.25 * sc), '#ff7a20', 0.8);
      p.spot(x, y - 0.2 * sc, '#ffd060');
    } else if (volcano) {
      p.spot(x, y, '#6a5a56');
      p.spot(x + sc, y - sc, '#8a7a76');
    } else if (kind === 'snow' && r < 0.45) {
      // Wind-carved drift lines with a bright lip and a blue shadow.
      p.flat(seg(x - 4 * sc, y, x + 4 * sc, y - 0.6 * sc, 0.25 * sc), '#a8bcd8', 0.6);
      p.flat(seg(x - 4 * sc, y - 0.7 * sc, x + 4 * sc, y - 1.3 * sc, 0.2 * sc), '#ffffff', 0.7);
    } else if (kind === 'snow' && r < 0.6) {
      // A rock poking through the snow, capped white.
      rock(p, x, y, 1.4 + sc * 2.4, '#6a7488', i);
      p.flat(ell(x - 0.3 * sc, y - (1.4 + sc * 2.4) * 0.75, (1.4 + sc * 2.4) * 0.6, 0.6 + sc * 0.4), '#f4f8ff', 0.95);
    } else if (kind === 'snow' && r < 0.7) {
      grassTuft(p, x, y, sc * 0.8, '#8a8a6a', i);
    } else if (kind === 'snow') {
      p.spot(x, y, '#ffffff');
      p.spot(x + sc, y - sc, '#d8e4f4');
    } else if (kind === 'desert' && r < 0.55) {
      p.flat(seg(x - 3 * sc, y, x + 3 * sc, y - 0.5 * sc, 0.2), tone(near, -2), 0.5);
      p.flat(seg(x - 3 * sc, y - 0.6 * sc, x + 3 * sc, y - 1.1 * sc, 0.15), tone(near, 2), 0.5);
    } else if (kind === 'desert' && r < 0.62) {
      const h = 4 * sc;
      p.fill(box(x - 0.6 * sc, y - h, 1.2 * sc, h), '#4a7a3a', { gradX: 1.4, rim: true, bevel: 0 });
      p.fill(box(x + 0.6 * sc, y - h * 0.65, 1.2 * sc, 0.6 * sc), '#4a7a3a', { bevel: 0 });
      p.fill(box(x + 1.2 * sc, y - h * 0.95, 0.7 * sc, h * 0.35), '#4a7a3a', { gradX: 1.4, bevel: 0 });
    } else if (r < 0.72) {
      grassTuft(p, x, y, kind === 'marsh' ? sc * 1.5 : sc, kind === 'hills' ? '#7a8a3a' : kind === 'desert' ? '#a89a5a' : near, i);
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
      rock(p, x, y, 1.2 + sc * (kind === 'hills' ? 3.5 : 2), kind === 'desert' ? '#b07850' : '#8a8478', i);
    }
  }
  if (kind === 'marsh') {
    // Murky pools with lily pads among the reeds.
    for (let i = 0; i < 4; i++) {
      const x = (i + 0.15 + hash(i, 1, 62) * 0.7) * (W / 4);
      const y = HZ + ground * (0.3 + hash(i, 2, 62) * 0.55);
      const rx = 16 + hash(i, 3, 62) * 26;
      p.fill(ell(x, y, rx, rx * 0.2), '#2a3a2a', { bevel: 0, grad: -0.8, rim: true, rimShade: -2 });
      p.flat(seg(x - rx * 0.6, y - 1, x - rx * 0.1, y - 1, 0.2), '#a8c0a0', 0.5);
      for (let j = 0; j < 3; j++) {
        p.fill(ell(x + (hash(i, j, 63) - 0.5) * rx * 1.2, y + (hash(j, i, 64) - 0.5) * rx * 0.2, 2.2, 1), '#5a8a3a', { bevel: 0, rim: true });
      }
    }
  }
  if (volcano) {
    // Embers drifting up through the air.
    for (let i = 0; i < 60; i++) {
      const x = hash(i, 1, 81) * W;
      const y = hash(i, 2, 81) * H;
      p.spot(x, y, hash(i, 3, 81) > 0.5 ? '#ffb040' : '#ff6020');
    }
  }
  if (kind === 'snow') {
    // Drifting snowflakes in front of everything.
    for (let i = 0; i < 70; i++) {
      const x = hash(i, 1, 66) * W;
      const y = hash(i, 2, 66) * H;
      p.spot(x, y, '#ffffff');
      if (hash(i, 3, 66) > 0.6) {
        p.spot(x + 1, y, '#e8f0fc');
      }
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

/** A dark pine silhouette. */
function nightPine(p: Paint, x: number, base: number, h: number, seed: number): void {
  const w = h * 0.36;
  const tiers: Shape[] = [box(x - h * 0.03, base - h * 0.12, h * 0.06, h * 0.12)];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const ty = base - h * 0.1 - t * h * 0.85;
    const tw = w * (1 - t * 0.8) * (0.9 + hash(i, seed, 3) * 0.2);
    tiers.push(poly([x - tw, ty, x - tw * 0.2, ty - h * 0.24, x, ty - h * 0.3, x + tw * 0.2, ty - h * 0.24, x + tw, ty]));
  }
  p.flat(union(...tiers), '#040a07');
}

/** Moon centre and radius on the title backdrop, as fractions of the width and the horizon height. */
const MOON = { x: 0.15, y: 0.3, r: 0.085 };

function castle(p: Paint, x: number, base: number, sc: number): void {
  const wall = '#151832';
  const lit = '#ffcf5a';
  const parts: Shape[] = [box(x - 34 * sc, base - 26 * sc, 68 * sc, 26 * sc)];
  const towers: Array<[number, number, number]> = [
    [-38, 44, 9],
    [38, 40, 9],
    [-12, 58, 8],
    [14, 66, 10],
  ];
  towers.forEach(([dx, h, w]) => parts.push(box(x + (dx - w / 2) * sc, base - h * sc, w * sc, h * sc)));
  for (let i = 0; i < 9; i++) {
    parts.push(box(x + (-34 + i * 8) * sc, base - 30 * sc, 4 * sc, 4 * sc));
  }
  const body = union(...parts);
  p.fill(body, wall, { gradX: 0.8, tex: 0.12, seed: 77, rim: true, rimShade: -2 });
  towers.forEach(([dx, h, w], i) => {
    const tx = x + dx * sc;
    const top = base - h * sc;
    p.fill(poly([tx - (w / 2 + 2) * sc, top, tx, top - (12 + i * 2) * sc, tx + (w / 2 + 2) * sc, top]), '#2a1e3a', {
      gradX: 1.6,
      rim: true,
      rimShade: -2,
    });
    // Moonlight on the left edge of each tower and roof.
    p.flat(seg(tx - (w / 2) * sc, top, tx - (w / 2) * sc, base - 2, 0.35), '#5a66a8', 0.6);
    p.flat(seg(tx - (w / 2 + 2) * sc, top, tx, top - (12 + i * 2) * sc, 0.35), '#7a86c8', 0.6);
    for (let k = 0; k < 2; k++) {
      const wy = top + (8 + k * 14) * sc;
      p.flat(ell(tx, wy, 3.5 * sc, 3.5 * sc), lit, 0.08);
      p.flat(ell(tx, wy, 2.2 * sc, 2.2 * sc), lit, 0.12);
      p.flat(box(tx - 1 * sc, wy - 2 * sc, 2 * sc, 4 * sc), lit);
    }
  });
  // Flag on the keep.
  const fx = x + 14 * sc;
  const ft = base - (66 + 18) * sc - 8 * sc;
  p.flat(seg(fx, ft, fx, ft + 10 * sc, 0.3), '#8a8aa0');
  p.fill(poly([fx, ft, fx + 9 * sc, ft + 2 * sc, fx, ft + 4.5 * sc]), '#c02838', { bevel: 0, gradX: 1 });
  // Gate with a warm glow.
  p.flat(ell(x, base - 6 * sc, 12 * sc, 9 * sc), lit, 0.12);
  p.flat(union(box(x - 5 * sc, base - 10 * sc, 10 * sc, 10 * sc), ell(x, base - 10 * sc, 5 * sc)), '#e8a040');
  p.flat(box(x - 0.3, base - 14 * sc, 0.6, 14 * sc), '#151832', 0.5);
}

function dragon(p: Paint, x: number, y: number, s: number): void {
  const c = '#0a0a1a';
  const wing = (dir: number): Shape =>
    poly([x, y, x + dir * s * 0.3, y - s * 0.55, x + dir * s * 0.75, y - s * 0.7, x + dir * s * 0.62, y - s * 0.32,
      x + dir * s * 0.5, y - s * 0.15, x + dir * s * 0.35, y - s * 0.05]);
  const body = union(
    ell(x, y, s * 0.28, s * 0.09),
    seg(x + s * 0.22, y - s * 0.02, x + s * 0.42, y - s * 0.14, s * 0.045),
    poly([x + s * 0.4, y - s * 0.18, x + s * 0.56, y - s * 0.13, x + s * 0.42, y - s * 0.09]),
    seg(x - s * 0.24, y, x - s * 0.5, y + s * 0.08, s * 0.04),
    seg(x - s * 0.5, y + s * 0.08, x - s * 0.68, y + s * 0.02, s * 0.025),
    poly([x - s * 0.68, y - s * 0.03, x - s * 0.76, y + s * 0.03, x - s * 0.66, y + s * 0.06]),
    wing(1),
    wing(-1),
  );
  p.flat(body, c);
  // Wing membranes catch a little moonlight.
  p.flat(seg(x, y, x - s * 0.62, y - s * 0.32, 0.3), '#2a2c52');
  p.flat(seg(x, y, x + s * 0.62, y - s * 0.32, 0.3), '#2a2c52');
  p.spot(x + s * 0.5, y - s * 0.15, '#ff5030');
}

/** Pseudo-random twinkling star positions in logical pixels (above `horizon`) for the title scene. */
export function titleTwinkles(width: number, horizon: number, count = 18): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    out.push({ x: Math.floor(hash(i, 1, 91) * width), y: Math.floor(hash(i, 2, 91) * horizon * 0.62) });
  }
  return out;
}

/**
 * The title screen's painted night scene, `width` x `height` logical pixels with the horizon at `horizon`:
 * a moonlit sky with the Milky Way, a dragon crossing the moon, snowy mountains, a castle with lit windows
 * on a hill and a road leading to it, framed by dark pines.
 */
export function paintTitleBackdrop(width: number, height: number, horizon: number): Paint {
  const W = width * U;
  const H = height * U;
  const HZ = horizon * U;
  const p = new Paint(W, H, ART_SCALE);
  const s = p.scale;
  const mx = W * MOON.x;
  const my = HZ * MOON.y;
  const mr = HZ * MOON.r;
  const top = rgb('#04061a');
  const low = rgb('#1e1f4c');
  const dusk = rgb('#4a3268');
  const band = rgb('#7a70b8');
  const halo = rgb('#b8c4ff');
  const farC = rgb('#1c1f46');
  const snow = rgb('#c8d4ff');
  const midC = rgb('#141c34');
  const mist = rgb('#3c3c70');
  const grass = rgb('#13261a');
  const grassNear = rgb('#08120c');
  const road = rgb('#2e2c2a');
  const lerp = (x: Rgb, y: Rgb, t: number): Rgb => [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t];
  const farTop: number[] = [];
  const midTop: number[] = [];
  // The castle hill: a flat top wide enough for the whole castle, sloping down into the mid range.
  const cx = W * 0.8;
  const plateau = HZ - 62;
  const halfTop = 62;
  const hillTop = (u: number): number => plateau + ridge(u, 9.1, 1.5) + Math.max(0, Math.abs(u - cx) - halfTop) ** 2 / 150;
  for (let fx = 0; fx <= p.width; fx++) {
    const u = (fx + 0.5) / s - 0.5;
    farTop.push(HZ - 70 - ridge(u * 0.8, 3.1, 46));
    midTop.push(Math.min(HZ - 24 - ridge(u, 5.3, 16), hillTop(u)));
  }
  // The Milky Way runs diagonally from top left to the right horizon.
  const bx0 = 0;
  const by0 = HZ * 0.05;
  const bdx = W;
  const bdy = HZ * 0.75;
  const blen = Math.hypot(bdx, bdy);
  const data = p.data;
  for (let fy = 0; fy < p.height; fy++) {
    const v = (fy + 0.5) / s - 0.5;
    const tg = (v - HZ) / Math.max(1, H - HZ);
    for (let fx = 0; fx < p.width; fx++) {
      const u = (fx + 0.5) / s - 0.5;
      const d = bayer(fx, fy);
      let c: Rgb;
      if (v < HZ) {
        const t = Math.max(0, Math.min(1, v / HZ + d * 0.04));
        c = lerp(top, low, t);
        c = lerp(c, dusk, Math.max(0, t - 0.6) * 0.9);
        const dist = Math.abs((u - bx0) * bdy - (v - by0) * bdx) / blen;
        const b = Math.exp(-((dist / 70) ** 2));
        if (b > 0.01) {
          const n = valueNoise(u, v, 30, 4, NO_WRAP) * 0.6 + valueNoise(u, v, 9, 6, NO_WRAP) * 0.4;
          const dust = 1 - Math.max(0, valueNoise(u + v * 0.3, v, 22, 8, NO_WRAP) - 0.5) * 1.2;
          c = lerp(c, band, b * (0.25 + n * 0.75) * 0.34 * dust);
        }
        const dm = Math.hypot(u - mx, v - my);
        if (dm < mr * 6) {
          c = lerp(c, halo, (1 - dm / (mr * 6)) ** 2.2 * 0.4 + d * 0.02);
        }
        const fTop = farTop[fx];
        if (v >= fTop) {
          const slope = (farTop[Math.min(p.width, fx + 24)] - farTop[Math.max(0, fx - 24)]) * (s / 48);
          // Lit from the moon on the left: slopes rising to the right face it.
          const rock = valueNoise(u, v * 2, 10, 21, NO_WRAP);
          c = scaled(farC, 0.9 + Math.max(-0.25, Math.min(0.3, -slope * 0.5)) + rock * 0.2 + d * 0.05);
          if (v < fTop + 12 && fTop < HZ - 92) {
            c = lerp(c, snow, (slope < 0 ? 0.75 : 0.35) * (1 - (v - fTop) / 12));
          }
        }
        const mTop = midTop[fx];
        if (v >= mTop) {
          const n = valueNoise(u, v, 8, 12, NO_WRAP);
          c = scaled(midC, 0.85 + n * 0.3 + d * 0.05);
          if (v < mTop + 1.5) {
            c = lerp(c, rgb('#4a5890'), 0.6);
          }
        }
        c = lerp(c, mist, Math.max(0, 1 - (HZ - v) / 34) * 0.45);
      } else {
        c = lerp(grass, grassNear, Math.min(1, tg * 1.6));
        const n = valueNoise(u, v * (2 - tg), 26, 11, NO_WRAP) * 0.6 + valueNoise(u, v, 4, 13, NO_WRAP) * 0.4;
        c = scaled(c, 0.8 + n * 0.4 + (hash(fx, fy, 17) - 0.5) * 0.12 + d * 0.04);
        const roadX = W * 0.8 - (W * 0.32) * Math.pow(tg, 0.8) + Math.sin(tg * 7) * W * 0.04;
        const rw = 2 + tg * 46;
        const off = Math.abs(u - roadX);
        if (off < rw) {
          c = lerp(c, scaled(road, 0.85 + n * 0.3), 0.85 * Math.min(1, (rw - off) / 3));
        }
        c = lerp(c, mist, Math.max(0, 0.12 - tg) * 3);
      }
      const i = (fy * p.width + fx) * 4;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
    }
  }

  // Stars (only where the sky shows: before the mountains would cover them, so test against the ridge).
  const starColors = ['#ffffff', '#cfe0ff', '#fff2c8', '#ffd8d0', '#b8c8ff'];
  for (let i = 0; i < 520; i++) {
    const x = hash(i, 1, 71) * W;
    const y = Math.pow(hash(i, 2, 71), 1.3) * HZ;
    const fx = Math.min(p.width, Math.max(0, Math.floor(x * s)));
    if (y > farTop[fx] - 2 || Math.hypot(x - mx, y - my) < mr * 1.4) {
      continue;
    }
    const m = hash(i, 3, 71);
    const color = starColors[i % starColors.length];
    if (m > 0.97) {
      p.flat(ell(x, y, 2.2, 2.2), color, 0.12);
      p.flat(seg(x - 3, y, x + 3, y, 0.15), color, 0.6);
      p.flat(seg(x, y - 3, x, y + 3, 0.15), color, 0.6);
      p.flat(ell(x, y, 0.6, 0.6), '#ffffff');
    } else if (m > 0.8) {
      p.flat(ell(x, y, 0.45, 0.45), color, 0.9);
    } else {
      p.flat(ell(x, y, 0.28, 0.28), color, 0.35 + m * 0.6);
    }
  }

  // The moon, with craters and a soft terminator.
  const moon = ell(mx, my, mr, mr);
  p.fill(moon, '#eef0ff', { sphere: true, sphereAmount: 0.45, tex: 0.5, seed: 5, rim: true, rimShade: -1 });
  for (let i = 0; i < 7; i++) {
    const a = hash(i, 1, 81) * Math.PI * 2;
    const dd = hash(i, 2, 81) * mr * 0.7;
    const cr = mr * (0.08 + hash(i, 3, 81) * 0.14);
    p.flat(ell(mx + Math.cos(a) * dd, my + Math.sin(a) * dd, cr, cr), '#b8bcd8', 0.6);
    p.flat(ell(mx + Math.cos(a) * dd - cr * 0.25, my + Math.sin(a) * dd - cr * 0.25, cr * 0.6, cr * 0.6), '#d8dcf0', 0.5);
  }
  p.flat(cut(moon, ell(mx - mr * 0.45, my - mr * 0.2, mr * 1.05, mr * 1.05)), '#6a70a0', 0.35);

  dragon(p, mx + mr * 2.6, my + mr * 0.9, 58);

  // Castle on its hill; framing pines go on last, over the grass.
  // The castle stands just behind the hill's front edge: paint it sunk into the hill, then put the hill
  // (as painted above) back in front of its foot, with a moonlit crest and some ground mist.
  const hill = data.slice();
  castle(p, cx, plateau + 6, 1.2);
  const crest = (u: number): number => plateau + 3 + Math.sin((u - cx) / 11) * 0.8 + ridge(u, 2.7, 1);
  const x0 = Math.floor((cx - halfTop - 20) * s);
  const x1 = Math.ceil((cx + halfTop + 20) * s);
  for (let fx = Math.max(0, x0); fx < Math.min(p.width, x1); fx++) {
    const u = (fx + 0.5) / s - 0.5;
    const top = crest(u);
    for (let fy = Math.max(0, Math.floor(top * s)); fy < Math.floor(HZ * s); fy++) {
      const i = (fy * p.width + fx) * 4;
      data[i] = hill[i];
      data[i + 1] = hill[i + 1];
      data[i + 2] = hill[i + 2];
    }
    if (top >= midTop[fx] + 1) {
      p.fpx(fx, Math.floor(top * s), '#4a5890', 0.55);
    }
  }
  p.flat(ell(cx, plateau + 2, halfTop + 10, 4), mist, 0.18);
  // The road climbs the hill to the gate.
  p.flat(poly([cx - 3.5, HZ, cx + 3.5, HZ, cx + 1.6, crest(cx) + 0.5, cx - 1.6, crest(cx) + 0.5]), '#2e2c2a', 0.75);
  // Moonlit grass in the foreground.
  for (let i = 0; i < 260; i++) {
    const t = Math.pow(hash(i, 1, 111), 0.7);
    const x = hash(i, 2, 111) * W;
    const y = HZ + 4 + t * (H - HZ - 6);
    grassTuft(p, x, y, 0.5 + t * 1.5, '#1c3426', i);
  }
  // Fireflies.
  for (let i = 0; i < 24; i++) {
    const x = hash(i, 1, 121) * W;
    const y = HZ + 6 + hash(i, 2, 121) * (H - HZ - 10);
    p.flat(ell(x, y, 2.4, 2.4), '#e8ff80', 0.12);
    p.flat(ell(x, y, 0.5, 0.5), '#f4ffb0');
  }
  const pines: Array<[number, number, number, number]> = [];
  for (let i = 0; i < 7; i++) {
    pines.push([-6 + i * 13 + hash(i, 1, 101) * 6, H * (0.8 + hash(i, 2, 101) * 0.25), 120 + hash(i, 3, 101) * 80, i + 300]);
    pines.push([W + 6 - i * 13 - hash(i, 4, 101) * 6, H * (0.8 + hash(i, 5, 101) * 0.25), 120 + hash(i, 6, 101) * 80, i + 400]);
  }
  pines.sort((a, b) => a[1] - b[1]).forEach(([x, base, h, seed]) => nightPine(p, x, base, h, seed));
  return p;
}

/** Soft elliptical ground shadow, `width` logical pixels wide, fading out towards its rim. */
export function paintShadow(width: number): Paint {
  const W = width * U;
  const H = Math.max(2, width * 0.28) * U;
  const p = new Paint(W, H, ART_SCALE);
  p.pixels((u, v, fx, fy) => {
    const d = Math.hypot((u + 0.5 - W / 2) / (W / 2), (v + 0.5 - H / 2) / (H / 2));
    if (d < 1) {
      p.fpx(fx, fy, '#000000', 0.42 * (1 - d * d));
    }
  });
  return p;
}
