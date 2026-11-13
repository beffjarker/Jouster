import { Facing, Palette } from '@jouster/game/engine';
import { ART_SCALE, Color, Paint, Shape, box, clip, cut, ell, hash, poly, seg, shift, tone, union } from './hd-paint';

/**
 * Paint units per character frame edge (32 logical pixels at 2 units each, the same layout as an LPC frame);
 * frames are stored at {@link ART_SCALE} real pixels per unit.
 */
export const HD_SPRITE = 64;

const F = ART_SCALE;

/** Look of a humanoid sprite (heroes, companions, townsfolk and humanoid monsters). */
export interface HumanoidLook {
  skin: string;
  hair: string;
  body: string;
  trim: string;
  legs: string;
  hat?: 'wizard' | 'helmet' | 'hood' | 'crown' | 'cap' | 'mitre' | 'bandana';
  hatColor?: string;
  cape?: string;
  weapon?: 'sword' | 'staff' | 'bow' | 'mace' | 'dagger' | 'shield';
  child?: boolean;
  beard?: string;
  /** Ankle-length robe instead of trousers. */
  robe?: boolean;
  /** No hair (the scalp shows). */
  bald?: boolean;
  /** Long pointed ears (goblins). */
  pointyEars?: boolean;
  /** Eye colour (default blue). */
  eyes?: string;
}

/** Looks of every hero class and NPC (each also has a row in the LPC `characters.png`). */
export const LOOKS: ReadonlyMap<string, HumanoidLook> = new Map<string, HumanoidLook>([
  ['warrior', { skin: '#f0c090', hair: '#7a3a10', body: '#a03020', trim: '#c0c0c0', legs: '#5a3a20', hat: 'helmet', hatColor: '#a8a8b8', weapon: 'sword' }],
  ['wizard', { skin: '#f0c090', hair: '#d8d8d8', body: '#3040a8', trim: '#e0c040', legs: '#202060', hat: 'wizard', hatColor: '#3040a8', weapon: 'staff', beard: '#e0e0e0' }],
  ['paladin', { skin: '#f0c090', hair: '#e0c040', body: '#d8d8e8', trim: '#3060c0', legs: '#8080a0', hat: 'helmet', hatColor: '#e0e0f0', cape: '#3060c0', weapon: 'shield' }],
  ['cleric', { skin: '#f0c090', hair: '#a06030', body: '#f0f0f0', trim: '#d8a830', legs: '#c0c0c0', hat: 'mitre', hatColor: '#f0f0f0', weapon: 'mace' }],
  ['rogue', { skin: '#e0b080', hair: '#202020', body: '#404048', trim: '#802020', legs: '#2a2a30', hat: 'hood', hatColor: '#303038', weapon: 'dagger' }],
  ['ranger', { skin: '#e0b080', hair: '#a05a20', body: '#3a7a30', trim: '#8a5a2a', legs: '#5a4020', hat: 'cap', hatColor: '#2a6a2a', weapon: 'bow' }],
  ['king', { skin: '#f0c090', hair: '#c0c0c0', body: '#8a1a8a', trim: '#e0c040', legs: '#5a105a', hat: 'crown', hatColor: '#f0d040', cape: '#c02020', beard: '#d8d8d8' }],
  ['guard', { skin: '#f0c090', hair: '#5a3a1a', body: '#2a5ab0', trim: '#c0c0c0', legs: '#404060', hat: 'helmet', hatColor: '#909098', weapon: 'sword' }],
  ['priest', { skin: '#f0c090', hair: '#909090', body: '#f8f8f8', trim: '#d8a830', legs: '#e0e0e0', hat: 'mitre', hatColor: '#f8f8f8' }],
  ['merchant', { skin: '#f0c090', hair: '#5a3a1a', body: '#2a8a6a', trim: '#e0c040', legs: '#3a3a3a', hat: 'cap', hatColor: '#8a2a2a' }],
  ['smith', { skin: '#d8a070', hair: '#202020', body: '#6a4a2a', trim: '#3a3a3a', legs: '#3a2a1a', beard: '#202020' }],
  ['innkeeper', { skin: '#f0c090', hair: '#c06030', body: '#e0e0c0', trim: '#a04040', legs: '#6a4a2a' }],
  ['recruit', { skin: '#f0c090', hair: '#7a3a10', body: '#a03020', trim: '#c0c0c0', legs: '#5a3a20', weapon: 'sword' }],
  ['villager', { skin: '#f0c090', hair: '#8a5a2a', body: '#c08040', trim: '#6a4020', legs: '#5a4a3a' }],
  ['elder', { skin: '#e8b888', hair: '#e0e0e0', body: '#6a5a8a', trim: '#4a3a6a', legs: '#4a3a5a', beard: '#f0f0f0', hat: 'hood', hatColor: '#5a4a7a' }],
  ['child', { skin: '#f0c090', hair: '#e0a030', body: '#e05050', trim: '#ffffff', legs: '#3050a0', child: true }],
  ['prisoner', { skin: '#e0b080', hair: '#5a3a1a', body: '#8a8070', trim: '#6a6050', legs: '#5a5040' }],
  ['goblinKingNpc', { skin: '#5aa040', hair: '#2a5a20', body: '#7a2a8a', trim: '#e0c040', legs: '#4a1a5a', hat: 'crown', hatColor: '#f0d040', cape: '#5a1a6a' }],
]);

const BOOT = '#4a3424';
const STEEL = '#c8c8d8';
const WOOD = '#8a5a2a';
const GOLD = '#e0b830';

/** Body landmarks for a figure; children are shorter with a relatively larger head. */
interface Frame {
  cx: number;
  hy: number;
  rx: number;
  ry: number;
  top: number;
  waist: number;
  hip: number;
  foot: number;
  half: number;
}

function frameFor(look: HumanoidLook, side: boolean): Frame {
  const c = look.child;
  return {
    cx: side ? 33 : 32,
    hy: c ? 31 : 20,
    rx: c ? 8 : 8.5,
    ry: c ? 7.5 : 8,
    top: c ? 39 : 29,
    waist: c ? 47 : 41,
    hip: c ? 50 : 45,
    foot: 62,
    half: c ? 7 : 8,
  };
}

/**
 * A 2x2-unit eye drawn in real pixels: upper lid, white, iris with a dark pupil and a catch-light, and an
 * eyebrow in `brow` above it. `dir` 1 looks right (side view), 0 straight ahead.
 */
function eye(p: Paint, x: number, y: number, iris: string, brow: Color, dir = 0): void {
  const X = Math.round(x * F);
  const Y = Math.round(y * F);
  const lid = '#1c1824';
  const white = '#f4f0ec';
  const w = 2 * F;
  for (let i = 0; i < w; i++) {
    p.fpx(X + i, Y - 2, tone(brow, -1), i === 0 && dir === 0 ? 0.5 : 0.95);
    p.fpx(X + i, Y, lid);
  }
  const ix = X + (dir ? 2 : 1);
  for (let j = 1; j < w; j++) {
    for (let i = 0; i < w; i++) {
      p.fpx(X + i, Y + j, white);
    }
  }
  p.fpx(ix, Y + 1, tone(iris, 0));
  p.fpx(ix + 1, Y + 1, tone(iris, -1));
  p.fpx(ix, Y + 2, tone(iris, -1));
  p.fpx(ix + 1, Y + 2, '#141018');
  p.fpx(ix, Y + 3, tone(iris, -2));
  p.fpx(ix + 1, Y + 3, tone(iris, -1));
  p.fpx(ix, Y + 1, '#ffffff');
}

/** Legs or robe hem with boots; `frame` lifts alternate feet for the walk cycle. */
function legs(p: Paint, look: HumanoidLook, f: Frame, facing: Facing, frame: number): void {
  const side = facing === 'right';
  if (look.robe) {
    const hem = f.foot - 2;
    if (side) {
      const sw = frame === 0 ? 3 : 0;
      p.fill(ell(f.cx + 3 + sw, f.foot - 1.5, 3, 1.8), BOOT, {});
      p.fill(ell(f.cx - 3 - sw, f.foot - 1.5, 3, 1.8), tone(BOOT, -1), {});
      p.fill(poly([f.cx - 6, f.waist, f.cx + 6, f.waist, f.cx + 8 + sw / 2, hem, f.cx - 8 - sw / 2, hem]), look.body, { gradX: 0.8, tex: 0.2 });
    } else {
      const lift = frame === 0 ? 0 : 1;
      p.fill(ell(f.cx - 4, f.foot - 1.5 - lift, 3, 1.8), BOOT, {});
      p.fill(ell(f.cx + 4, f.foot - 1.5 - (1 - lift), 3, 1.8), BOOT, {});
      p.fill(poly([f.cx - f.half, f.waist, f.cx + f.half, f.waist, f.cx + f.half + 2, hem, f.cx - f.half - 2, hem]), look.body, {
        gradX: 0.6,
        tex: 0.2,
      });
      p.flat(seg(f.cx, f.waist + 3, f.cx, hem - 1, 0.4), tone(look.body, -2), 0.6);
    }
    return;
  }
  const len = f.foot - f.hip;
  if (side) {
    const stride = frame === 0 ? 4.5 : 0.5;
    const back = seg(f.cx - 1, f.hip, f.cx - 1 - stride, f.foot - 3, 2.6);
    const front = seg(f.cx + 1, f.hip, f.cx + 1 + stride, f.foot - 3 - (frame === 0 ? 0 : 1), 2.6);
    p.fill(back, tone(look.legs, -1), { rim: true });
    p.fill(ell(f.cx - stride, f.foot - 2, 3.5, 2.2), tone(BOOT, -1), { rim: true });
    p.fill(front, look.legs, { rim: true });
    const toeY = f.foot - 2 - (frame === 0 ? 0 : 1);
    p.fill(ell(f.cx + 2.5 + stride, toeY, 3.8, 2.2), BOOT, { rim: true });
    p.flat(seg(f.cx - 0.5 + stride, toeY + 1.4, f.cx + 5.5 + stride, toeY + 1.4, 0.25), tone(BOOT, -2.5));
    p.spot(f.cx + 3 + stride, toeY - 1, tone(BOOT, 2));
    return;
  }
  const lift = [frame === 0 ? 0 : 2, frame === 0 ? 2 : 0];
  [-1, 1].forEach((s, i) => {
    const x = f.cx + s * 3.5;
    const bottom = f.foot - lift[i];
    const bootH = Math.min(6, len / 2);
    const bx = Math.round(x - 3);
    p.fill(box(Math.round(x - 2.5), f.hip - 1, 5, bottom - f.hip - 2), look.legs, { rim: true, gradX: 0.5 });
    // Knee crease and a seam down the leg.
    p.flat(seg(x - 1.2, f.hip + (bottom - f.hip) * 0.45, x + 1, f.hip + (bottom - f.hip) * 0.5, 0.22), tone(look.legs, -2), 0.6);
    p.flat(box(Math.round(x - 2.5) + 1, f.hip, 0.5, bottom - f.hip - bootH - 1), tone(look.legs, 1), 0.4);
    p.fill(box(bx, bottom - bootH, 6, bootH), BOOT, { rim: true, grad: 0.6 });
    // Turned-down cuff, laces and a sole.
    p.flat(box(bx + 0.5, bottom - bootH + 0.5, 5, 1), tone(BOOT, 1));
    for (let ly = bottom - bootH + 2; ly < bottom - 1.5; ly += 1) {
      p.spot(bx + 2.6, ly + 0.2, tone(BOOT, 2));
      p.spot(bx + 3.4, ly + 0.7, tone(BOOT, 2));
    }
    p.flat(box(bx + 0.5, bottom - 1, 5, 0.5), tone(BOOT, -2.5));
  });
}

function torso(p: Paint, look: HumanoidLook, f: Frame, facing: Facing): void {
  const side = facing === 'right';
  const half = side ? f.half - 2 : f.half;
  const shape = union(
    box(f.cx - half, f.top + 2, half * 2, f.hip - f.top - 1),
    ell(f.cx, f.top + 3, half, 3.5),
  );
  p.fill(shape, look.body, { rim: true, gradX: 0.6, grad: 0.4, tex: 0.15 });
  // Cloth folds pulled towards the belt, and shoulder seams.
  const folds = side ? [-1.5, 1.5] : [-half + 2.5, -2.5, 2.5, half - 2.5];
  folds.forEach((dx, i) => {
    const x = f.cx + dx;
    p.flat(clip(seg(x, f.top + 5 + (i % 2), x + dx * 0.15, f.waist - 0.5, 0.22), shape), tone(look.body, -1.5), 0.55);
    p.flat(clip(seg(x + 0.5, f.top + 5.5 + (i % 2), x + 0.5 + dx * 0.15, f.waist - 1.5, 0.18), shape), tone(look.body, 1), 0.4);
  });
  if (!side) {
    [-1, 1].forEach((sd) =>
      p.flat(clip(seg(f.cx + sd * (half - 3), f.top + 0.5, f.cx + sd * (half - 0.5), f.top + 4, 0.2), shape), tone(look.body, -2), 0.6),
    );
  }
  if (!look.robe) {
    p.fill(box(f.cx - half + 1, f.hip - 2, half * 2 - 2, 2), look.body, { shade: -1.5, bevel: 0 });
  }
  p.fill(box(f.cx - half + 1, f.waist, half * 2 - 2, 2), look.trim, { bevel: 0, grad: 0.8 });
  p.flat(box(f.cx - half + 1, f.waist + 1.5, half * 2 - 2, 0.5), tone(look.trim, -2));
  if (facing === 'down') {
    // Buckle with a pin.
    p.fill(box(f.cx - 1.5, f.waist - 0.25, 3.5, 2.5), GOLD, { bevel: 1, dither: 0 });
    p.flat(box(f.cx - 0.5, f.waist + 0.5, 1.5, 1), tone(look.trim, -1));
    p.flat(box(f.cx, f.waist + 0.5, 0.5, 1), tone(GOLD, -2));
    p.fill(poly([f.cx - 4, f.top + 1, f.cx + 4, f.top + 1, f.cx, f.top + 6]), look.trim, { bevel: 0, grad: 0.6 });
    p.fill(poly([f.cx - 2, f.top + 1, f.cx + 2, f.top + 1, f.cx, f.top + 3.5]), look.skin, { bevel: 0, shade: -1 });
    // Buttons down the front.
    for (let y = f.top + 7.5; y < f.waist - 1; y += 2.5) {
      p.fill(ell(f.cx + 0.5, y, 0.55), look.trim, { sphere: true, bevel: 0, dither: 0 });
    }
  } else if (side) {
    p.fill(box(f.cx + half - 3, f.top + 1, 2, f.waist - f.top - 1), look.trim, { bevel: 0, shade: -0.5 });
    p.flat(box(f.cx + half - 1.5, f.top + 1, 0.5, f.waist - f.top - 1), tone(look.trim, 1.5), 0.6);
  } else {
    p.flat(clip(seg(f.cx + 0.5, f.top + 3, f.cx + 0.5, f.waist, 0.2), shape), tone(look.body, -2), 0.5);
  }
}

function hand(p: Paint, look: HumanoidLook, x: number, y: number): void {
  p.fill(ell(x, y, 2.4, 2.2), look.skin, { rim: true, sphere: true });
  p.flat(seg(x - 1, y + 0.6, x + 1, y + 0.6, 0.18), tone(look.skin, -2), 0.6);
}

/** Arms; front/back views show both, side views one in front (`which`). */
function arms(p: Paint, look: HumanoidLook, f: Frame, facing: Facing, frame: number, which: 'back' | 'front' | 'both'): void {
  const sleeve = look.body;
  const handY = f.waist + 2;
  if (facing === 'right') {
    const swing = frame === 0 ? 3 : -2;
    const s = which === 'back' ? -swing : swing;
    const shade = which === 'back' ? -1 : 0;
    p.fill(seg(f.cx, f.top + 4, f.cx + s, handY - 2, 2.5), sleeve, { rim: true, shade });
    p.flat(seg(f.cx + s * 0.5 - 1.6, (f.top + handY) / 2, f.cx + s * 0.5 + 1.6, (f.top + handY) / 2 + 0.6, 0.2), tone(sleeve, -2), 0.6);
    p.flat(seg(f.cx + s - 2, handY - 3, f.cx + s + 2, handY - 3, 0.35), look.trim);
    hand(p, look, f.cx + s, handY);
    return;
  }
  const dy = frame === 0 ? [0, 1] : [1, 0];
  [-1, 1].forEach((sd, i) => {
    const sx = f.cx + sd * (f.half + 1.5);
    const hx = f.cx + sd * (f.half + 2.5);
    p.fill(seg(sx, f.top + 4, hx, handY - 2 + dy[i], 2.5), sleeve, { rim: true, gradX: -sd * 0.5 });
    p.flat(seg(hx - 2, handY - 3 + dy[i], hx + 2, handY - 3 + dy[i], 0.35), look.trim);
    p.flat(seg(sx - sd * 1.2, f.top + 6, hx - sd * 1.2, handY - 4 + dy[i], 0.2), tone(sleeve, -1.5), 0.5);
    hand(p, look, hx, handY + dy[i]);
  });
}

function cape(p: Paint, look: HumanoidLook, f: Frame, facing: Facing, frame: number): void {
  const color = look.cape;
  if (!color) {
    return;
  }
  const hem = f.foot - 4;
  if (facing === 'right') {
    const flap = frame === 0 ? 0 : 2;
    p.fill(poly([f.cx - 2, f.top + 1, f.cx - 6, f.top + 2, f.cx - 11 - flap, hem, f.cx - 1, hem - 1]), color, { gradX: 0.6, grad: 0.4 });
    return;
  }
  const s = poly([f.cx - f.half - 1, f.top + 1, f.cx + f.half + 1, f.top + 1, f.cx + f.half + 4, hem, f.cx - f.half - 4, hem]);
  p.fill(s, color, { gradX: 0.6, grad: 0.4, tex: 0.1 });
  if (facing === 'up') {
    [-5, -2, 2, 5].forEach((dx) => {
      p.flat(clip(seg(f.cx + dx, f.top + 4, f.cx + dx * 1.5, hem - 1, 0.35), s), tone(color, -2), 0.7);
      p.flat(clip(seg(f.cx + dx + 0.8, f.top + 5, f.cx + dx * 1.5 + 0.8, hem - 2, 0.2), s), tone(color, 1), 0.5);
    });
    p.flat(clip(box(f.cx - f.half - 4, hem - 1, f.half * 2 + 8, 1), s), tone(color, -1.5));
  } else {
    p.flat(clip(box(f.cx - f.half - 4, hem - 1, f.half * 2 + 8, 1), s), tone(color, 1));
  }
}

function head(p: Paint, look: HumanoidLook, f: Frame, facing: Facing): void {
  const { cx, hy, rx, ry } = f;
  const side = facing === 'right';
  const back = facing === 'up';
  const iris = look.eyes ?? '#3a6ad0';
  p.fill(box(cx - 2, hy + ry - 3, 4, 5), look.skin, { shade: -1, bevel: 0 });
  // Ears.
  if (look.pointyEars) {
    const ear = (dir: number, x: number): void =>
      p.fill(poly([x, hy - 1, x + dir * 9, hy - 5, x + dir * 2, hy + 3]), look.skin, { rim: true, shade: -0.3 });
    if (side) {
      ear(-1, cx - 3);
    } else {
      ear(-1, cx - rx + 1);
      ear(1, cx + rx - 1);
    }
  } else if (!back && !side) {
    p.fill(ell(cx - rx, hy + 1, 1.8, 2.4), look.skin, { rim: true });
    p.fill(ell(cx + rx, hy + 1, 1.8, 2.4), look.skin, { rim: true });
  } else if (side) {
    p.fill(ell(cx - 1.5, hy + 1, 1.8, 2.4), look.skin, { rim: true });
  }
  const face: Shape = side ? union(ell(cx, hy, rx, ry), ell(cx + 4, hy + 2, rx - 3, ry - 2)) : ell(cx, hy, rx, ry);
  p.fill(face, look.skin, { sphere: true, sphereAmount: 0.45, rim: true, rimShade: -2 });
  // Hair.
  if (!look.bald) {
    const hair = look.hair;
    let s: Shape;
    if (back) {
      s = union(ell(cx, hy - 0.5, rx + 1, ry + 0.5), box(cx - rx, hy, rx * 2, ry - 1));
    } else if (side) {
      s = union(clip(ell(cx - 0.5, hy - 1, rx + 1, ry + 0.5), poly([cx - rx - 2, hy - ry - 2, cx + rx + 3, hy - ry - 2, cx + rx + 3, hy - 3, cx + 1, hy - 2, cx - 1, hy + ry])), box(cx - rx - 0.5, hy, 5, ry - 1));
    } else {
      s = union(
        clip(ell(cx, hy - 1, rx + 1, ry + 0.5), poly([0, 0, 64, 0, 64, hy - 3, cx + 4, hy - 2, cx, hy - 4, cx - 4, hy - 2, 0, hy - 3])),
        box(cx - rx - 1, hy - 3, 3, 7),
        box(cx + rx - 2, hy - 3, 3, 7),
      );
    }
    p.fill(s, hair, { sphere: true, rim: true, tex: 0.5, seed: 4 });
    // Individual strands: dark partings and light-catching locks combed from the crown.
    const crownY = hy - ry - 0.5;
    for (let i = 0; i < 11; i++) {
      const t = (i - 5) / 5;
      const r = hash(i, 7, 31);
      const x0 = cx + t * 2.5 + (side ? -1 : 0);
      const x1 = cx + t * (rx + 0.5) + (side ? -2 : 0);
      const y1 = back ? hy + ry - 2 - r * 3 : hy - 2 - Math.abs(t) * 1.5 + r * 2;
      p.flat(clip(seg(x0, crownY + 1, x1, y1, 0.16), s), tone(hair, i % 2 ? -1.5 : 1.5), 0.75);
    }
    p.flat(clip(seg(cx - 4, hy - ry + 2, cx - 1, hy - ry + 1.2, 0.3), s), tone(hair, 2.5), 0.8);
  } else if (!back) {
    p.fill(ell(cx - 3, hy - ry + 2.5, 1.5, 0.8), tone(look.skin, 2), { bevel: 0, dither: 0 });
  }
  // Face.
  if (facing === 'down') {
    const brow = look.bald ? tone(look.skin, -2) : look.hair;
    eye(p, Math.round(cx - 4), Math.round(hy), iris, brow);
    eye(p, Math.round(cx + 2), Math.round(hy), iris, brow);
    // Nose bridge and nostrils, cheeks and a two-tone mouth.
    p.flat(seg(cx + 0.4, hy + 1, cx + 0.6, hy + 3, 0.15), tone(look.skin, -1), 0.6);
    p.spot(cx - 0.25, hy + 3.4, tone(look.skin, -2));
    p.spot(cx + 1.25, hy + 3.4, tone(look.skin, -2));
    p.flat(ell(cx - 4, hy + 3.5, 1.3, 0.7), '#e06060', 0.25);
    p.flat(ell(cx + 5, hy + 3.5, 1.3, 0.7), '#e06060', 0.25);
    p.flat(box(Math.round(cx - 1), Math.round(hy + 5), 3, 0.5), tone(look.skin, -2.5));
    p.flat(box(Math.round(cx - 0.5), Math.round(hy + 5) + 0.5, 2, 0.5), tone(look.skin, -1));
  } else if (side) {
    const brow = look.bald ? tone(look.skin, -2) : look.hair;
    eye(p, Math.round(cx + 4), Math.round(hy), iris, brow, 1);
    p.px(Math.round(cx + rx + 1), Math.round(hy + 2), tone(look.skin, -1));
    p.spot(cx + rx + 1, hy + 3.4, tone(look.skin, -2.5));
    p.flat(box(Math.round(cx + 5), Math.round(hy + 5), 2, 0.5), tone(look.skin, -2.5));
    p.flat(ell(cx + 3, hy + 3.5, 1.2, 0.7), '#e06060', 0.25);
    // Ear detail.
    if (!look.pointyEars) {
      p.flat(seg(cx - 1.8, hy, cx - 1.2, hy + 2, 0.2), tone(look.skin, -2), 0.7);
    }
  }
  if (look.beard && !back) {
    const beard = side
      ? union(ell(cx + 4, hy + 6, 4.5, 4.5), ell(cx + 3, hy + 9, 3, 4))
      : union(clip(ell(cx, hy + 4, rx - 0.5, ry - 1), box(0, hy + 3, 64, 20)), ell(cx, hy + 9, 4.5, 5));
    p.fill(beard, look.beard, { rim: true, tex: 0.5, seed: 9, grad: 0.6 });
    // Wavy beard strands.
    for (let i = 0; i < 9; i++) {
      const x = (side ? cx + 1 : cx - 4) + i * (side ? 0.8 : 1);
      p.flat(clip(seg(x, hy + 5, x + Math.sin(i * 1.7) * 0.8, hy + 12.5, 0.15), beard), tone(look.beard, i % 2 ? -2 : 1.5), 0.7);
    }
    if (!side) {
      p.flat(box(Math.round(cx - 1), Math.round(hy + 5), 3, 1), tone(look.beard, -3));
    }
  }
}

function hat(p: Paint, look: HumanoidLook, f: Frame, facing: Facing): void {
  const { cx, hy, rx, ry } = f;
  const hc = look.hatColor ?? look.hair;
  const side = facing === 'right';
  const back = facing === 'up';
  switch (look.hat) {
    case 'wizard': {
      p.fill(ell(cx, hy - 4, rx + 5, 2.8), hc, { gradX: 0.5 });
      const lean = side ? 4 : 0;
      p.fill(poly([cx - 7, hy - 5, cx + 7, hy - 5, cx + 3 + lean, hy - 14, cx + 8 + lean, hy - 19, cx - 1 + lean, hy - 15]), hc, {
        gradX: 1,
        grad: 0.4,
      });
      p.fill(clip(poly([cx - 7, hy - 5, cx + 7, hy - 5, cx + 3 + lean, hy - 14, cx - 1 + lean, hy - 15]), box(0, hy - 8, 64, 2)), GOLD, {
        bevel: 0,
      });
      // Stars and a crescent embroidered on the cone, and a crumpled fold.
      p.spot(cx - 2 + lean / 3, hy - 10, '#fff6a0');
      p.spot(cx + 2 + lean / 2, hy - 12.5, '#fff6a0');
      p.flat(cut(ell(cx + 2 + lean / 3, hy - 10, 1.4), ell(cx + 2.6 + lean / 3, hy - 10.4, 1.2)), '#fff6a0', 0.9);
      p.flat(seg(cx + 1 + lean, hy - 14.5, cx + 3.5 + lean, hy - 14, 0.2), tone(hc, -2.5), 0.8);
      p.flat(seg(cx - 6, hy - 4.5, cx + 6, hy - 4.5, 0.2), tone(hc, 1.5), 0.6);
      p.px(Math.round(cx + 1 + lean / 2), Math.round(hy - 11), '#fff6a0');
      break;
    }
    case 'helmet': {
      const dome = clip(ell(cx, hy - 1, rx + 1.5, ry + 1.5), box(0, 0, 64, back ? hy + 3 : hy - 2));
      const guards = side
        ? box(cx - rx - 1.5, hy - 3, 5, 9)
        : back
          ? box(0, 0, 0, 0)
          : union(box(cx - rx - 1.5, hy - 3, 3, 9), box(cx + rx - 1.5, hy - 3, 3, 9));
      p.fill(union(dome, guards), hc, { sphere: true, rim: true });
      p.fill(box(cx - rx - 1, hy - 4, rx * 2 + 2, 2), hc, { shade: -1, bevel: 0 });
      // Rivets along the brow band and a central ridge.
      for (let x = cx - rx + 0.5; x < cx + rx; x += 2.5) {
        p.fill(ell(x, hy - 3, 0.45), hc, { sphere: true, bevel: 0, dither: 0, shade: 1 });
      }
      p.flat(clip(seg(cx + 0.5, hy - ry - 1, cx + 0.5, hy - 4, 0.3), dome), tone(hc, 1.5), 0.8);
      if (facing === 'down') {
        p.fill(box(cx - 1, hy - 3, 2, 5), hc, { shade: -0.5, bevel: 0 });
      }
      p.flat(seg(cx - 3, hy - ry + 1, cx - 5, hy - 5, 0.5), '#ffffff', 0.6);
      break;
    }
    case 'hood': {
      const outer = union(ell(cx, hy, rx + 2.5, ry + 2.5), box(cx - rx - 2.5, hy, (rx + 2.5) * 2, ry + 1));
      const opening = side ? ell(cx + 4, hy + 2, rx - 2.5, ry - 1.5) : ell(cx, hy + 2, rx - 1.5, ry - 1);
      const hood = back ? outer : cut(outer, opening);
      p.fill(hood, hc, { sphere: true, rim: true, tex: 0.2 });
      // Fabric folds and a stitched seam.
      [-3, 0, 3].forEach((dx) => p.flat(clip(seg(cx + dx, hy - ry, cx + dx * 1.6, hy + ry, 0.2), hood), tone(hc, -1.5), 0.5));
      for (let y = hy - ry - 1; y < hy + ry; y += 1.5) {
        p.flat(clip(box(cx + 0.25, y, 0.5, 0.75), hood), tone(hc, 1.5), 0.6);
      }
      break;
    }
    case 'crown': {
      const pts = [cx - 6, hy - 6, cx - 6, hy - 13, cx - 3, hy - 9, cx, hy - 14, cx + 3, hy - 9, cx + 6, hy - 13, cx + 6, hy - 6];
      p.fill(poly(pts), hc, { gradX: 0.8, grad: 0.6 });
      p.fill(box(cx - 6, hy - 8, 12, 2), hc, { shade: -1, bevel: 0 });
      [cx - 6, cx, cx + 6].forEach((x, i) => p.fill(ell(x, i === 1 ? hy - 14 : hy - 13, 0.8), '#fff0c0', { sphere: true, bevel: 0 }));
      if (!back) {
        p.fill(ell(cx, hy - 7.5, 1.6), '#e02020', { sphere: true, bevel: 0 });
        p.fill(ell(cx - 4, hy - 7, 0.8), '#30a0ff', { sphere: true, bevel: 0 });
        p.fill(ell(cx + 4, hy - 7, 0.8), '#30d060', { sphere: true, bevel: 0 });
      }
      break;
    }
    case 'cap': {
      const capShape = clip(ell(cx, hy - 3, rx + 0.5, 6.5), box(0, 0, 64, hy - 1));
      p.fill(capShape, hc, { sphere: true, rim: true });
      [-3, 0, 3].forEach((dx) => p.flat(clip(seg(cx + dx * 0.4, hy - 9, cx + dx, hy - 2, 0.18), capShape), tone(hc, -2), 0.6));
      if (side) {
        p.fill(ell(cx + 7, hy - 2, 5, 1.8), hc, { shade: -1 });
      } else if (!back) {
        p.fill(ell(cx, hy - 1.5, rx + 1.5, 2), hc, { shade: -1 });
      }
      p.fill(seg(cx + 3, hy - 6, cx + 8, hy - 12, 1), '#d04030', { bevel: 0, gradX: 0.8 });
      // Feather barbs.
      for (let i = 1; i < 6; i++) {
        const fx = cx + 3 + i;
        const fy = hy - 6 - i * 1.2;
        p.flat(seg(fx, fy, fx - 1.2, fy - 1.5, 0.15), tone('#d04030', i % 2 ? 1.5 : -1.5), 0.8);
      }
      break;
    }
    case 'mitre': {
      const shape = poly([cx - 6, hy - 4, cx + 6, hy - 4, cx + 5, hy - 14, cx, hy - 19, cx - 5, hy - 14]);
      p.fill(shape, hc, { gradX: 0.9, rim: true });
      p.fill(clip(shape, union(box(cx - 1, hy - 18, 2, 14), box(cx - 6, hy - 6, 12, 2))), GOLD, { bevel: 0 });
      p.fill(ell(cx, hy - 11, 1), '#e02020', { sphere: true, bevel: 0 });
      p.flat(clip(seg(cx - 4, hy - 13, cx - 5, hy - 6, 0.2), shape), tone(hc, 1.5), 0.6);
      break;
    }
    case 'bandana':
      p.fill(box(cx - rx, hy - 6, rx * 2, 3), hc, { grad: 0.8 });
      p.fill(poly([cx - rx, hy - 5, cx - rx - 4, hy - 1, cx - rx - 1, hy - 1]), hc, {});
      for (let x = cx - rx + 1; x < cx + rx; x += 2) {
        p.spot(x, hy - 4.5, tone(hc, 2));
      }
      break;
    default:
      break;
  }
}

/** Weapon (or shield) held in the front/right hand. */
function weapon(p: Paint, look: HumanoidLook, f: Frame, facing: Facing, frame: number): void {
  const side = facing === 'right';
  const handY = f.waist + 2;
  const hx = side ? f.cx + (frame === 0 ? 3 : -2) : f.cx + f.half + 2.5;
  const hy = side ? handY : handY + (frame === 0 ? 1 : 0);
  switch (look.weapon) {
    case 'sword':
      p.fill(seg(hx, hy - 18, hx, hy - 3, 1.1), STEEL, { gradX: 1, bevel: 0 });
      p.px(Math.round(hx), Math.round(hy - 19), STEEL);
      // Fuller groove, bright edge and a glint.
      p.flat(seg(hx, hy - 16, hx, hy - 4, 0.2), tone(STEEL, -2), 0.8);
      p.flat(seg(hx - 0.8, hy - 18, hx - 0.8, hy - 4, 0.15), '#ffffff', 0.7);
      p.flat(seg(hx - 1, hy - 14, hx + 1, hy - 15, 0.12), '#ffffff', 0.9);
      p.fill(box(Math.round(hx - 3), Math.round(hy - 3), 7, 2), GOLD, {});
      p.fill(ell(hx - 3, hy - 2, 0.8), GOLD, { sphere: true, bevel: 0 });
      p.fill(ell(hx + 4, hy - 2, 0.8), GOLD, { sphere: true, bevel: 0 });
      p.fill(box(Math.round(hx - 0.5), Math.round(hy - 1), 2, 4), WOOD, { bevel: 0 });
      for (let y = Math.round(hy - 1); y < hy + 3; y += 1) {
        p.flat(seg(hx - 0.5, y + 0.2, hx + 1.5, y + 0.8, 0.12), tone(WOOD, -2), 0.8);
      }
      p.fill(ell(hx + 0.5, hy + 3.5, 1.1), GOLD, { sphere: true, bevel: 0 });
      break;
    case 'staff':
      p.fill(seg(hx, 9, hx, f.foot - 1, 1.1), WOOD, { gradX: 1, bevel: 0, tex: 0.3 });
      for (let y = 12; y < f.foot - 2; y += 3) {
        p.flat(seg(hx - 0.3, y, hx + 0.2, y + 2, 0.12), tone(WOOD, -2), 0.7);
      }
      [12, 22].forEach((y) => p.fill(box(hx - 1.4, y, 2.8, 1), GOLD, { bevel: 0, grad: 0.5 }));
      // Claw prongs gripping the orb.
      [-1, 1].forEach((sd) => p.flat(seg(hx + sd * 1, 10, hx + sd * 3.2, 5.5, 0.35), tone(WOOD, -1)));
      p.fill(ell(hx, 7, 3.5), '#40e0ff', { sphere: true });
      p.flat(cut(ell(hx, 7, 2.6), ell(hx + 0.5, 7.4, 2.2)), '#c0ffff', 0.6);
      p.flat(ell(hx, 7, 1.2), '#ffffff', 0.35);
      p.px(Math.round(hx - 1), 5, '#ffffff');
      break;
    case 'mace':
      p.fill(seg(hx, hy - 8, hx, hy + 5, 1), WOOD, { bevel: 0 });
      for (let y = hy + 1; y < hy + 5; y += 1) {
        p.flat(seg(hx - 1, y, hx + 1, y + 0.5, 0.15), tone('#704020', -1), 0.9);
      }
      p.fill(ell(hx, hy - 10, 3.6), STEEL, { sphere: true });
      [[0, -4.5], [-4.5, 0], [4.5, 0], [-3.2, -3.2], [3.2, -3.2]].forEach(([dx, dy]) =>
        p.fill(seg(hx + dx * 0.6, hy - 10 + dy * 0.6, hx + dx, hy - 10 + dy, 0.6), tone(STEEL, -1), { bevel: 0, dither: 0 }),
      );
      p.flat(seg(hx - 2, hy - 10, hx + 2, hy - 10, 0.2), tone(STEEL, -2), 0.6);
      break;
    case 'dagger':
      p.fill(seg(hx, hy + 2, hx, hy + 9, 0.9), STEEL, { gradX: 1, bevel: 0 });
      p.flat(seg(hx - 0.5, hy + 2.5, hx - 0.5, hy + 8.5, 0.12), '#ffffff', 0.7);
      p.fill(box(Math.round(hx - 2), Math.round(hy + 1), 5, 1), GOLD, { bevel: 0 });
      break;
    case 'bow': {
      const pts: number[] = [];
      for (let i = 0; i <= 8; i++) {
        const t = -1 + i / 4;
        pts.push(hx + 1 + (1 - t * t) * 4, hy + t * 14);
      }
      for (let i = 0; i < 8; i++) {
        p.fill(seg(pts[i * 2], pts[i * 2 + 1], pts[i * 2 + 2], pts[i * 2 + 3], 1), WOOD, { bevel: 0 });
        p.flat(seg(pts[i * 2] - 0.4, pts[i * 2 + 1], pts[i * 2 + 2] - 0.4, pts[i * 2 + 3], 0.15), tone(WOOD, 1.5), 0.6);
      }
      // Leather grip wrap.
      for (let y = hy - 2; y < hy + 2; y += 0.75) {
        p.flat(seg(hx + 4, y, hx + 6, y + 0.4, 0.15), '#5a3418');
      }
      p.flat(seg(hx + 1, hy - 14, hx + 1, hy + 14, 0.4), '#e8e8e8');
      break;
    }
    case 'shield': {
      const sx = side ? f.cx + 4 : f.cx - f.half - 3;
      const sy = f.top + 4;
      const s = poly([sx - 6, sy, sx + 6, sy, sx + 6, sy + 8, sx, sy + 15, sx - 6, sy + 8]);
      p.fill(s, '#3060c0', { rim: true, gradX: 0.8, grad: 0.4 });
      // Steel rim, quartered cross, boss and rivets.
      p.flat(cut(s, poly([sx - 5, sy + 1, sx + 5, sy + 1, sx + 5, sy + 7.6, sx, sy + 13.6, sx - 5, sy + 7.6])), STEEL, 0.85);
      p.fill(clip(s, union(box(sx - 1, sy + 1, 2, 13), box(sx - 5, sy + 4, 10, 2))), GOLD, { bevel: 0 });
      p.fill(ell(sx, sy + 5, 1.6), GOLD, { sphere: true, bevel: 0 });
      [[-4, 1.8], [4, 1.8], [-4, 7.5], [4, 7.5]].forEach(([dx, dy]) => p.spot(sx + dx, sy + dy, '#e8e8f0'));
      break;
    }
    default:
      break;
  }
}

/**
 * A humanoid frame at native 64x64 (feet at the bottom, so `tileAnchor` stands it on a tile).
 * `left` is a mirrored `right`.
 */
export function paintHumanoid(look: HumanoidLook, facing: Facing, frame: number): Paint {
  const p = new Paint(HD_SPRITE, HD_SPRITE, F);
  const dir: Facing = facing === 'left' ? 'right' : facing;
  const f = frameFor(look, dir === 'right');
  p.flat(ell(f.cx, f.foot, f.half + 4, 2.2), '#000000', 0.25);
  if (dir === 'up') {
    legs(p, look, f, dir, frame);
    torso(p, look, f, dir);
    arms(p, look, f, dir, frame, 'both');
    head(p, look, f, dir);
    hat(p, look, f, dir);
    cape(p, look, f, dir, frame);
  } else if (dir === 'right') {
    cape(p, look, f, dir, frame);
    arms(p, look, f, dir, frame, 'back');
    legs(p, look, f, dir, frame);
    torso(p, look, f, dir);
    head(p, look, f, dir);
    hat(p, look, f, dir);
    if (look.weapon === 'shield') {
      weapon(p, look, f, dir, frame);
    }
    arms(p, look, f, dir, frame, 'front');
    if (look.weapon !== 'shield') {
      weapon(p, look, f, dir, frame);
    }
  } else {
    cape(p, look, f, dir, frame);
    legs(p, look, f, dir, frame);
    torso(p, look, f, dir);
    arms(p, look, f, dir, frame, 'both');
    head(p, look, f, dir);
    hat(p, look, f, dir);
    weapon(p, look, f, dir, frame);
  }
  p.outline();
  return facing === 'left' ? p.mirror() : p;
}

// --- Monsters (64x64 cells, facing left towards the party) ---------------------------------------

type Colors = ReadonlyMap<string, string>;

function col(c: Colors, key: string, fallback = '#ff00ff'): string {
  return c.get(key) ?? fallback;
}

function slime(p: Paint, c: Colors, shape: 'round' | 'tall' | 'flat'): void {
  const g = col(c, 'g');
  let body: Shape;
  let eyeY: number;
  if (shape === 'tall') {
    body = union(ell(32, 47, 15, 12), ell(32, 34, 11, 14), ell(32, 20, 4, 6));
    eyeY = 36;
  } else if (shape === 'flat') {
    body = union(ell(32, 53, 24, 8), ell(32, 48, 15, 8));
    eyeY = 48;
  } else {
    body = union(ell(32, 47, 20, 12.5), ell(32, 39, 15, 13));
    eyeY = 41;
  }
  body = clip(body, box(0, 0, 64, 60));
  p.fill(body, g, { sphere: true, dither: 0.6 });
  p.fill(clip(body, box(0, 56, 64, 4)), col(c, 'd', g), { bevel: 0, shade: -0.5 });
  // A dark nucleus and suspended bubbles inside the jelly, each with a rim and a glint.
  p.flat(clip(ell(36, eyeY + 9, 6, 3.5), body), tone(g, -2), 0.35);
  [[22, eyeY + 7, 1.6], [42, eyeY + 4, 1.1], [31, eyeY + 12, 0.9], [45, eyeY + 10, 1.4], [18, eyeY + 2, 0.8]].forEach(([x, y, r]) => {
    const b = clip(ell(x, y, r), body);
    p.flat(cut(b, ell(x, y, r - 0.5)), tone(g, 2), 0.7);
    p.spot(x - r * 0.4, y - r * 0.4, '#ffffff');
  });
  // Wet highlight with a secondary reflection along the bottom edge.
  p.flat(ell(25, eyeY - 8, 4, 2.5), col(c, 'l', '#ffffff'), 0.8);
  p.flat(ell(23.5, eyeY - 9, 1.6, 0.9), '#ffffff', 0.95);
  p.flat(clip(cut(body, shift(body, 1.5, -1.5)), box(30, 0, 34, 57)), col(c, 'l', '#ffffff'), 0.35);
  const w = col(c, 'w', '#ffffff');
  const k = col(c, 'k', '#101010');
  [27, 37].forEach((x) => {
    p.fill(ell(x, eyeY, 3, 3.5), w, { bevel: 0 });
    p.fill(ell(x - 0.5, eyeY + 0.5, 1.6, 2.2), k, { bevel: 0 });
    p.flat(cut(ell(x - 0.5, eyeY + 0.5, 1.6, 2.2), ell(x - 0.5, eyeY + 0.2, 1.4, 1.9)), tone(g, 1), 0.8);
    p.flat(ell(x - 1.2, eyeY - 0.8, 0.7, 0.8), '#ffffff');
    p.spot(x + 0.3, eyeY + 1.6, '#ffffff');
  });
  p.flat(seg(29, eyeY + 6, 35, eyeY + 6, 0.6), tone(g, -3));
  p.flat(seg(29.5, eyeY + 5.2, 34.5, eyeY + 5.2, 0.2), tone(g, -1.5), 0.6);
}

function bat(p: Paint, c: Colors): void {
  const body = col(c, 'p');
  const wing = (dir: number): void => {
    const x = (v: number): number => 32 + dir * v;
    const pts = [x(5), 27, x(16), 18, x(28), 20, x(30), 30, x(25), 29, x(22), 35, x(17), 31, x(13), 38, x(8), 33];
    const membrane = poly(pts);
    p.fill(membrane, body, { shade: -0.8, grad: 0.6, tex: 0.2 });
    // Fine capillaries between the finger bones.
    [[16, 19, 26, 29], [16, 19, 19, 33], [10, 24, 9, 32], [20, 21, 28, 22]].forEach(([ax, ay, bx, by]) => {
      p.flat(clip(seg(x(ax), ay, x((ax + bx) / 2 + 1.5), (ay + by) / 2 - 1, 0.12), membrane), tone(body, -2.5), 0.7);
      p.flat(clip(seg(x((ax + bx) / 2 + 1.5), (ay + by) / 2 - 1, x(bx), by, 0.12), membrane), tone(body, -2.5), 0.7);
    });
    p.flat(seg(x(6), 27, x(16), 19, 0.6), col(c, 'l', body));
    p.flat(seg(x(16), 19, x(22), 34, 0.5), col(c, 'l', body), 0.7);
    p.flat(seg(x(16), 19, x(13), 37, 0.5), col(c, 'l', body), 0.7);
    p.flat(seg(x(16), 19, x(28), 20.5, 0.45), col(c, 'l', body), 0.7);
    p.flat(seg(x(16), 19, x(29), 29.5, 0.4), col(c, 'l', body), 0.6);
    // Thumb claw.
    p.flat(seg(x(16), 19, x(15), 16.5, 0.35), '#f0e8d8');
  };
  wing(-1);
  wing(1);
  const torso = ell(32, 32, 6, 8);
  p.fill(torso, body, { sphere: true, tex: 0.3 });
  // Fur tufts.
  for (let i = 0; i < 14; i++) {
    const fx = 27.5 + hash(i, 3, 9) * 9;
    const fy = 26 + hash(i, 5, 9) * 12;
    p.flat(clip(seg(fx, fy, fx + 0.5, fy + 1.6, 0.13), torso), tone(body, i % 2 ? 1.5 : -1.5), 0.8);
  }
  p.fill(ell(32, 23, 6, 5.5), body, { sphere: true });
  p.fill(poly([27, 21, 26, 12, 31, 19]), body, { gradX: 0.8 });
  p.fill(poly([37, 21, 38, 12, 33, 19]), body, { gradX: 0.8 });
  p.flat(poly([27.6, 19.5, 27, 14.5, 29.8, 18.6]), '#e08090', 0.6);
  p.flat(poly([36.4, 19.5, 37, 14.5, 34.2, 18.6]), '#e08090', 0.6);
  const r = col(c, 'r', '#ff3030');
  p.fill(ell(29, 23, 1.3, 1.1), r, { bevel: 0, sphere: true });
  p.fill(ell(35, 23, 1.3, 1.1), r, { bevel: 0, sphere: true });
  p.spot(28.6, 22.5, '#ffffff');
  p.spot(34.6, 22.5, '#ffffff');
  // Snout.
  p.fill(ell(32, 25.5, 1.8, 1.1), tone(body, 1), { bevel: 0 });
  p.spot(31.4, 25.3, '#100810');
  p.spot(32.6, 25.3, '#100810');
  const w = col(c, 'w', '#ffffff');
  p.fill(poly([29.6, 26.8, 30.8, 26.8, 30.2, 29.2]), w, { bevel: 0, dither: 0 });
  p.fill(poly([33.2, 26.8, 34.4, 26.8, 33.8, 29.2]), w, { bevel: 0, dither: 0 });
  p.fill(seg(29, 39, 28, 43, 0.8), tone(body, -2), { bevel: 0 });
  p.fill(seg(35, 39, 36, 43, 0.8), tone(body, -2), { bevel: 0 });
  [[27.5, 43.5], [28.5, 44], [35.5, 44], [36.5, 43.5]].forEach(([x, y]) => p.spot(x, y, '#f0e8d8'));
}

function wolf(p: Paint, c: Colors): void {
  const g = col(c, 'g');
  const d = col(c, 'd', g);
  const l = col(c, 'l', g);
  /** Short fur strokes clipped to `s`, following direction (dx, dy). */
  const fur = (s: Shape, n: number, x0: number, y0: number, w: number, h: number, dx: number, dy: number, seed: number): void => {
    for (let i = 0; i < n; i++) {
      const fx = x0 + hash(i, seed, 41) * w;
      const fy = y0 + hash(seed, i, 43) * h;
      p.flat(clip(seg(fx, fy, fx + dx, fy + dy, 0.13), s), i % 3 === 0 ? tone(g, 2) : tone(g, -2), 0.75);
    }
  };
  p.flat(ell(34, 59, 22, 2.5), '#000000', 0.25);
  const leg = (ax: number, ay: number, bx: number, by: number, back: boolean): void => {
    p.fill(seg(ax, ay, bx, by, 2.4), back ? d : g, { rim: true, gradX: 0.5 });
    p.fill(ell(bx - 1, by + 1, 3, 1.8), back ? d : g, { rim: true });
    [-1.8, -0.6, 0.6].forEach((t) => p.flat(seg(bx - 1 + t, by + 2.2, bx - 1.6 + t, by + 3, 0.15), '#e8e0d0'));
  };
  leg(47, 42, 50, 57, true);
  leg(25, 44, 27, 57, true);
  const tail = union(seg(50, 34, 57, 27, 3.2), seg(57, 27, 59, 20, 2.4));
  p.fill(tail, g, { rim: true, gradX: 0.4, tex: 0.4 });
  fur(tail, 14, 49, 18, 12, 18, 1.2, -1.6, 11);
  p.px(59, 18, l);
  const body = union(ell(37, 38, 15, 8.5), ell(23, 37, 8, 9));
  p.fill(body, g, { sphere: true, rim: true, tex: 0.5, seed: 2 });
  fur(body, 70, 15, 29, 37, 16, 2.2, 0.6, 5);
  // Dark saddle along the back.
  p.flat(clip(ell(36, 31.5, 12, 3), body), tone(d, -1), 0.45);
  p.fill(clip(ell(22, 41, 6, 6), body), l, { bevel: 0, tex: 0.4, seed: 3 });
  for (let i = 0; i < 8; i++) {
    const x = 18 + i * 1.3;
    p.flat(clip(seg(x, 39, x - 0.5, 46, 0.15), ell(22, 41, 6, 6)), tone(l, -1.5), 0.7);
  }
  leg(42, 42, 43, 57, false);
  leg(21, 44, 20, 57, false);
  p.fill(poly([12, 22, 15, 14, 19, 23]), g, { rim: true, gradX: 0.8 });
  p.flat(poly([13.8, 21.5, 15.2, 16.5, 17.2, 22]), '#c08080', 0.6);
  p.fill(poly([18, 23, 21, 15, 23, 25]), d, { rim: true });
  const headShape = union(ell(17, 29, 8, 7), poly([12, 26, 2, 30, 2, 35, 13, 36]));
  p.fill(headShape, g, { sphere: true, rim: true, tex: 0.3, seed: 4 });
  fur(headShape, 26, 9, 22, 15, 10, 1.6, 0.4, 7);
  // Brow ridge and cheek ruff.
  p.flat(seg(11, 26, 16, 25.2, 0.3), tone(d, -1.5));
  for (let i = 0; i < 5; i++) {
    p.flat(clip(seg(21 + i * 0.4, 30 + i, 24 + i * 0.4, 32 + i, 0.18), headShape), tone(l, 1), 0.8);
  }
  p.fill(poly([4, 33, 13, 33, 13, 36, 4, 36]), l, { bevel: 0 });
  p.fill(ell(3, 31, 1.6, 1.4), col(c, 'k', '#101010'), { bevel: 0, sphere: true });
  p.spot(2.6, 30.5, '#ffffff');
  // Whisker dots and lip line.
  [[6, 32], [7.5, 32.5], [9, 32]].forEach(([x, y]) => p.spot(x, y, tone(g, -3)));
  p.flat(seg(3, 33, 13, 33, 0.2), tone(d, -3));
  const teeth = col(c, 'w', '#ffffff');
  [5, 8, 10.5].forEach((x) => p.fill(poly([x - 0.6, 33, x + 0.6, 33, x, 35.4]), teeth, { bevel: 0, dither: 0 }));
  p.fill(ell(14.5, 28, 1.8, 1.1), col(c, 'r', '#ff4040'), { bevel: 0, sphere: true });
  p.flat(ell(14.5, 28.2, 0.4, 0.9), '#100808');
  p.spot(13.8, 27.6, '#ffffff');
}

function toad(p: Paint, c: Colors): void {
  const g = col(c, 'g');
  const d = col(c, 'd', g);
  p.flat(ell(32, 59, 24, 2.5), '#000000', 0.25);
  p.fill(ell(47, 51, 10, 7.5), d, { sphere: true, rim: true });
  const body = clip(union(ell(35, 45, 21, 14), ell(20, 41, 13, 10)), box(0, 0, 64, 59));
  p.fill(body, g, { sphere: true, rim: true, tex: 0.3, seed: 6 });
  // Mottled blotches.
  [[40, 40, 3.5, 2.2], [49, 44, 2.5, 2], [30, 38, 2.2, 1.5], [44, 50, 3, 1.8], [24, 36, 1.8, 1.4]].forEach(([x, y, rx, ry]) =>
    p.fill(clip(ell(x, y, rx, ry), body), d, { bevel: 0, tex: 0.5, dither: 0.5 }),
  );
  const belly = clip(ell(26, 54, 15, 8), body);
  p.fill(belly, col(c, 'l', g), { bevel: 0, grad: 0.5 });
  for (let y = 48; y < 60; y += 1.5) {
    p.flat(clip(seg(12, y, 40, y + 0.5, 0.12), belly), tone(col(c, 'l', g), -1.5), 0.6);
  }
  // Warts: lit top, shadowed base, hundreds of fine skin pores.
  for (let i = 0; i < 26; i++) {
    const x = 18 + hash(i, 2, 61) * 36;
    const y = 32 + hash(2, i, 61) * 18;
    const r = 0.5 + hash(i, i, 61) * 0.7;
    const wart = clip(ell(x, y, r), body);
    p.fill(wart, g, { sphere: true, bevel: 0, dither: 0, shade: 0.5 });
    p.flat(clip(ell(x + 0.3, y + r + 0.2, r, 0.35), body), tone(d, -1.5), 0.6);
  }
  [[15, 31], [26, 30]].forEach(([x, y]) => {
    p.fill(ell(x, y, 5, 4.5), g, { sphere: true, rim: true });
    p.fill(ell(x, y, 3, 2.8), col(c, 'y', '#f0c020'), { sphere: true, bevel: 0 });
    for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * Math.PI * 2;
      p.flat(seg(x + Math.cos(ang) * 1.2, y + Math.sin(ang) * 1.2, x + Math.cos(ang) * 2.6, y + Math.sin(ang) * 2.4, 0.1), tone(col(c, 'y', '#f0c020'), -2), 0.6);
    }
    p.fill(box(x - 0.5, y - 2, 1, 4), col(c, 'k', '#101010'), { bevel: 0 });
    p.spot(x - 1.2, y - 1.4, '#ffffff');
    p.flat(clip(ell(x, y - 2.5, 5, 1.6), ell(x, y, 5, 4.5)), tone(d, -1), 0.5);
  });
  p.flat(union(seg(7, 42, 18, 46, 0.6), seg(18, 46, 26, 45, 0.6)), tone(d, -3));
  p.flat(union(seg(8, 41.2, 18, 45.2, 0.2), seg(18, 45.2, 25, 44.2, 0.2)), tone(g, 1.5), 0.6);
  p.spot(6, 37, tone(d, -3));
  p.spot(8, 36.5, tone(d, -3));
  p.fill(seg(20, 50, 15, 57, 3), g, { rim: true });
  p.fill(ell(13, 58, 4.5, 1.8), g, { rim: true });
  [9.5, 12.5, 15.5].forEach((x) => p.fill(ell(x, 59.2, 0.9, 0.6), tone(g, 1), { bevel: 0, dither: 0 }));
}

function skeleton(p: Paint, c: Colors): void {
  const w = col(c, 'w');
  const l = col(c, 'l', w);
  const k = col(c, 'k', '#101010');
  p.flat(ell(32, 62, 12, 2.2), '#000000', 0.25);
  const bone = (ax: number, ay: number, bx: number, by: number, r = 1.4): void => {
    p.fill(seg(ax, ay, bx, by, r), w, { rim: true, bevel: 0.6 });
    // Knobbly joints at both ends and a shadow down one side.
    p.fill(ell(ax, ay, r * 1.25), w, { sphere: true, bevel: 0, dither: 0 });
    p.fill(ell(bx, by, r * 1.25), w, { sphere: true, bevel: 0, dither: 0 });
    p.flat(seg(ax + r * 0.5, ay + 0.5, bx + r * 0.5, by - 0.5, 0.2), tone(w, -2), 0.6);
  };
  // Legs and feet.
  bone(28, 46, 27, 54);
  bone(27, 54, 27, 60);
  bone(36, 46, 37, 54);
  bone(37, 54, 37, 60);
  p.fill(ell(25.5, 61, 3, 1.5), w, { rim: true });
  p.fill(ell(38.5, 61, 3, 1.5), w, { rim: true });
  [24, 25.5, 27].forEach((x) => p.flat(seg(x, 60.2, x, 62, 0.12), tone(w, -2.5)));
  [37, 38.5, 40].forEach((x) => p.flat(seg(x, 60.2, x, 62, 0.12), tone(w, -2.5)));
  // Pelvis and spine.
  p.fill(ell(32, 45, 6, 3), w, { rim: true, sphere: true });
  p.fill(ell(29.5, 45, 1.3, 1), k, { bevel: 0 });
  p.fill(ell(34.5, 45, 1.3, 1), k, { bevel: 0 });
  bone(32, 28, 32, 44, 1.2);
  for (let y = 29; y < 44; y += 1.5) {
    p.flat(seg(31, y, 33, y, 0.15), tone(w, -2.5), 0.8);
  }
  // Ribs.
  for (let i = 0; i < 4; i++) {
    const y = 31 + i * 3;
    const hw = 7 - i * 0.8;
    p.fill(seg(32 - hw, y + 1, 31, y, 1), w, { rim: true, bevel: 0 });
    p.fill(seg(33, y, 32 + hw, y + 1, 1), w, { rim: true, bevel: 0 });
    p.flat(seg(32 - hw + 0.5, y + 1.6, 31, y + 0.6, 0.2), tone(w, -2), 0.7);
    p.flat(seg(33, y + 0.6, 32 + hw - 0.5, y + 1.6, 0.2), tone(w, -2), 0.7);
  }
  // Arms.
  bone(24, 30, 22, 38);
  bone(22, 38, 22, 44);
  bone(40, 30, 42, 38);
  bone(42, 38, 42, 44);
  p.fill(ell(22, 45, 2, 1.8), w, { rim: true });
  // Rusty, notched sword.
  const blade = cut(seg(43, 26, 43, 43, 1.1), union(ell(44.4, 31, 0.7), ell(41.7, 36, 0.6)));
  p.fill(blade, '#a8a090', { gradX: 1, bevel: 0, tex: 0.6 });
  [[43, 29], [42.6, 33.5], [43.4, 38], [43, 41]].forEach(([x, y]) => p.flat(ell(x, y, 0.6, 0.9), '#8a4a20', 0.7));
  p.fill(box(40, 43, 7, 2), '#6a4a2a', {});
  p.fill(ell(42, 45, 2, 1.8), w, { rim: true });
  // Skull: cranial sutures, a crack, cheekbones, individual teeth.
  const skull = union(ell(32, 18, 8, 7.5), box(27, 21, 10, 6));
  p.fill(skull, w, { sphere: true, rim: true });
  p.flat(clip(union(seg(32, 10.5, 31, 14, 0.15), seg(31, 14, 33, 15.5, 0.15), seg(25, 15, 29, 13, 0.15)), skull), tone(w, -2.5), 0.8);
  p.flat(clip(union(seg(36, 11.5, 37.5, 14.5, 0.18), seg(37.5, 14.5, 36.8, 16.5, 0.15)), skull), tone(w, -3));
  p.flat(seg(25.5, 22, 28, 22.8, 0.25), tone(w, -1.5), 0.7);
  p.flat(seg(38.5, 22, 36, 22.8, 0.25), tone(w, -1.5), 0.7);
  p.fill(box(28, 25, 8, 2), l, { bevel: 0 });
  [29, 31, 33, 35].forEach((x) => p.px(x, 26, tone(l, -3)));
  for (let x = 28.5; x < 36; x += 1) {
    p.flat(box(x, 25, 0.5, 1), tone(l, -2.5), 0.8);
  }
  [28.5, 35.5].forEach((x) => {
    p.fill(ell(x, 19, 2.5, 2.4), k, { bevel: 0 });
    p.fill(ell(Math.round(x) + 0.5, 19.5, 1, 1), col(c, 'r', '#ff4040'), { bevel: 0, sphere: true });
    p.flat(ell(Math.round(x) + 0.5, 19.5, 2, 2), col(c, 'r', '#ff4040'), 0.2);
    p.spot(Math.round(x) + 0.1, 19.1, '#ffffff');
  });
  p.flat(poly([31, 23.8, 33, 23.8, 32, 21.6]), k);
}

function scorpion(p: Paint, c: Colors): void {
  const g = col(c, 'g');
  const d = col(c, 'd', g);
  const l = col(c, 'l', g);
  p.flat(ell(34, 58, 24, 2.5), '#000000', 0.25);
  // Four pairs of jointed legs.
  for (let i = 0; i < 4; i++) {
    const x = 26 + i * 6;
    const knee = 42 - (i % 2);
    p.fill(seg(x, 47, x - 3, knee, 1), d, { rim: true, bevel: 0 });
    p.fill(seg(x - 3, knee, x - 5, 57, 0.8), d, { rim: true, bevel: 0 });
    p.fill(seg(x + 2, 48, x + 6, knee + 2, 1), d, { rim: true, bevel: 0 });
    p.fill(seg(x + 6, knee + 2, x + 7, 57, 0.8), d, { rim: true, bevel: 0 });
  }
  // Segmented tail arching over the back to a stinger.
  const tail: ReadonlyArray<[number, number, number]> = [
    [46, 46, 4.2], [52, 42, 3.8], [56, 35, 3.5], [56, 27, 3.2], [52, 20, 3], [46, 16, 2.8],
  ];
  tail.forEach(([x, y, r], i) => {
    p.fill(ell(x, y, r, r * 0.95), i % 2 ? g : tone(g, 0.5), { sphere: true, rim: true, tex: 0.3, seed: i });
    p.flat(cut(ell(x, y, r, r * 0.95), ell(x - 0.6, y - 0.6, r - 0.7, r * 0.95 - 0.7)), tone(d, -1), 0.5);
  });
  p.fill(ell(41, 16, 3, 2.6), l, { sphere: true, rim: true });
  p.fill(poly([39, 15, 33, 20, 39.5, 18]), '#2a1a10', { bevel: 0, gradX: 1 });
  p.spot(34.5, 19.2, '#f0e8d0');
  // Armoured body plates.
  const body = union(ell(34, 46, 15, 6.5), ell(20, 45, 7, 5.5));
  p.fill(body, g, { sphere: true, rim: true, tex: 0.4, seed: 7 });
  for (let x = 24; x < 48; x += 4.5) {
    p.flat(clip(seg(x, 40, x + 0.6, 52, 0.3), body), tone(d, -1.5), 0.8);
    p.flat(clip(seg(x + 0.8, 40, x + 1.2, 52, 0.2), body), tone(l, 1), 0.5);
  }
  // Pincers reaching forward.
  const claw = (y: number, open: number): void => {
    p.fill(seg(20, y + 2, 12, y, 1.6), g, { rim: true, bevel: 0 });
    p.fill(ell(8, y, 4.5, 2.8), g, { sphere: true, rim: true });
    p.fill(poly([5, y - 1.5, 0.5, y - 3 - open, 4, y - 0.2]), l, { gradX: 1, rim: true, bevel: 0 });
    p.fill(poly([5, y + 1.5, 1, y + 2.5 + open, 4.5, y + 0.4]), d, { gradX: 1, rim: true, bevel: 0 });
  };
  claw(40, 1.2);
  claw(50, 0.5);
  // Eyes.
  [[16, 42.5], [18.5, 42]].forEach(([x, y]) => {
    p.fill(ell(x, y, 1, 0.9), col(c, 'r', '#ff3030'), { sphere: true, bevel: 0 });
    p.spot(x - 0.3, y - 0.3, '#ffffff');
  });
}

function sandWorm(p: Paint, c: Colors): void {
  const g = col(c, 'g');
  const d = col(c, 'd', g);
  const l = col(c, 'l', g);
  const sand = col(c, 's', '#e0c47a');
  p.flat(ell(36, 59, 24, 3), '#000000', 0.25);
  // Body rising from a burst of sand and curling forward.
  const rings: Array<[number, number, number]> = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    rings.push([44 - Math.sin(t * Math.PI * 0.9) * 10 - t * 16, 56 - t * 40, 9 - t * 2.5]);
  }
  rings.forEach(([x, y, r], i) => {
    p.fill(ell(x, y, r, r * 0.8), g, { sphere: true, rim: true, tex: 0.4, seed: i });
    p.flat(clip(cut(ell(x, y, r, r * 0.8), ell(x, y - 1, r, r * 0.8)), ell(x, y, r, r * 0.8)), tone(d, -1), 0.7);
    p.flat(clip(ell(x - r * 0.4, y, r * 0.4, r * 0.7), ell(x, y, r, r * 0.8)), l, 0.45);
  });
  // Spined ridge down the back.
  rings.slice(2).forEach(([x, y, r], i) => {
    p.fill(poly([x + r * 0.6, y - 1, x + r * 1.25, y - 2.5, x + r * 0.7, y + 1]), d, { bevel: 0, rim: true, shade: i % 2 ? 0.3 : -0.3 });
  });
  // Round maw full of teeth.
  const [hx, hy, hr] = rings[rings.length - 1];
  const maw = ell(hx - 3, hy + 1, hr * 0.85, hr * 0.95);
  p.fill(maw, col(c, 'r', '#8a2030'), { grad: -1, bevel: 0 });
  p.flat(ell(hx - 3, hy + 1.5, hr * 0.4, hr * 0.5), '#1a0808');
  for (let a = 0; a < 10; a++) {
    const t = (a / 10) * Math.PI * 2;
    const ox = hx - 3 + Math.cos(t) * hr * 0.8;
    const oy = hy + 1 + Math.sin(t) * hr * 0.9;
    const ix = hx - 3 + Math.cos(t) * hr * 0.45;
    const iy = hy + 1 + Math.sin(t) * hr * 0.5;
    p.fill(poly([ox + Math.sin(t) * 0.8, oy - Math.cos(t) * 0.8, ix, iy, ox - Math.sin(t) * 0.8, oy + Math.cos(t) * 0.8]), col(c, 'w', '#f0e8d0'), {
      bevel: 0,
      dither: 0,
    });
  }
  // Sand spray around the base.
  const mound = clip(ell(40, 59, 20, 6), box(0, 0, 64, 60));
  p.fill(mound, sand, { sphere: true, rim: true, tex: 0.6, seed: 9 });
  for (let i = 0; i < 14; i++) {
    p.fill(ell(22 + hash(i, 1, 71) * 36, 44 + hash(i, 2, 71) * 12, 0.6 + hash(i, 3, 71)), sand, { sphere: true, bevel: 0, dither: 0 });
  }
}

function wraith(p: Paint, c: Colors): void {
  const g = col(c, 'g');
  const d = col(c, 'd', g);
  const l = col(c, 'l', g);
  const glow = col(c, 'r', '#60f0ff');
  p.flat(ell(33, 60, 12, 1.8), '#000000', 0.18);
  p.flat(ell(32, 32, 24, 26), l, 0.08);
  // Tattered shroud tapering to wisps.
  const pts = [32, 6, 42, 12, 46, 26, 48, 42];
  for (let i = 0; i <= 6; i++) {
    const x = 48 - i * 5;
    pts.push(x, 54 + (i % 2 ? -4 : 3) + hash(i, 1, 81) * 3);
  }
  pts.push(16, 40, 19, 24, 23, 12);
  const shroud = poly(pts);
  p.fill(shroud, g, { gradX: 1.4, grad: 0.8, tex: 0.6, seed: 81, rim: true });
  for (let i = 0; i < 7; i++) {
    const x = 21 + i * 4;
    p.flat(clip(seg(x, 22, x + (i - 3) * 0.8, 58, 0.3), shroud), tone(d, -1), 0.6);
  }
  p.flat(clip(ell(32, 60, 20, 10), shroud), l, 0.3);
  // Hood and a void face.
  const hood = union(ell(31, 17, 9, 10), poly([22, 20, 40, 20, 38, 28, 24, 28]));
  p.fill(hood, tone(g, 0.5), { sphere: true, rim: true, tex: 0.4, seed: 82 });
  p.fill(ell(29, 19, 5.5, 6.5), '#08060c', { bevel: 0 });
  [[27, 18.5], [31.5, 18.5]].forEach(([x, y]) => {
    p.flat(ell(x, y, 2.4, 1.8), glow, 0.3);
    p.fill(ell(x, y, 1, 0.8), glow, { bevel: 0, sphere: true });
    p.spot(x - 0.3, y - 0.3, '#ffffff');
  });
  // Bony reaching hands.
  [[18, 34, 9, 30], [42, 36, 50, 32]].forEach(([ax, ay, bx, by]) => {
    p.fill(seg(ax, ay, bx, by, 2.2), g, { rim: true, gradX: 1 });
    for (let k = -1; k <= 1; k++) {
      p.fill(seg(bx, by, bx + (bx < ax ? -3 : 3), by + k * 1.6 - 1, 0.35), '#d8d8c8', { bevel: 0 });
    }
  });
}

function lizardLook(c: Colors): HumanoidLook {
  return {
    skin: col(c, 'g'),
    hair: col(c, 'd'),
    body: col(c, 'b'),
    trim: col(c, 'n'),
    legs: col(c, 'n'),
    eyes: col(c, 'r'),
    bald: true,
    weapon: 'sword',
  };
}

function lizardman(p: Paint, c: Colors): void {
  const g = col(c, 'g');
  // Thick tail behind the figure.
  const tail = union(seg(38, 52, 50, 56, 3), seg(50, 56, 58, 52, 2));
  p.fill(tail, g, { rim: true, tex: 0.4, seed: 91 });
  for (let x = 40; x < 56; x += 2.5) {
    p.flat(clip(seg(x, 50, x + 1, 58, 0.2), tail), tone(g, -2), 0.6);
  }
  p.draw(paintHumanoid(lizardLook(c), 'down', 0));
  // Scaly crest on the head.
  [26, 29, 32, 35, 38].forEach((x, i) =>
    p.fill(poly([x - 1.2, 15 + Math.abs(i - 2) * 0.6, x, 11 + Math.abs(i - 2), x + 1.2, 15 + Math.abs(i - 2) * 0.6]), col(c, 'd', g), {
      bevel: 0,
      rim: true,
    }),
  );
}

function witchLook(c: Colors): HumanoidLook {
  return {
    skin: col(c, 'g'),
    hair: col(c, 'd'),
    body: col(c, 'b'),
    trim: col(c, 'n'),
    legs: col(c, 'n'),
    eyes: col(c, 'r'),
    robe: true,
    hat: 'wizard',
    hatColor: col(c, 'y'),
    cape: col(c, 'n'),
    weapon: 'staff',
  };
}

function marshWitch(p: Paint, c: Colors): void {
  // Will-o'-wisps circling her.
  [[10, 20], [52, 14], [54, 40]].forEach(([x, y]) => {
    p.flat(ell(x, y, 4, 4), '#c8ff60', 0.2);
    p.fill(ell(x, y, 1.6, 1.6), '#e8ff90', { sphere: true, bevel: 0 });
  });
  p.draw(paintHumanoid(witchLook(c), 'down', 0));
}

/** Goblins are drawn as small humanoids with long ears, using the monster's palette. */
function goblinLook(c: Colors, king: boolean): HumanoidLook {
  return {
    skin: col(c, 'g'),
    hair: col(c, 'd'),
    body: col(c, 'b'),
    trim: col(c, 'n'),
    legs: col(c, 'n'),
    eyes: col(c, 'r'),
    bald: true,
    pointyEars: true,
    child: !king,
    weapon: king ? 'mace' : 'dagger',
    ...(king ? { hat: 'crown' as const, hatColor: col(c, 'y'), cape: col(c, 'n') } : {}),
  };
}

const MONSTER_PAINTERS: ReadonlyMap<string, (p: Paint, c: Colors) => void> = new Map<string, (p: Paint, c: Colors) => void>([
  ['slime', (p, c) => slime(p, c, 'round')],
  ['slimeTall', (p, c) => slime(p, c, 'tall')],
  ['slimeFlat', (p, c) => slime(p, c, 'flat')],
  ['bat', bat],
  ['wolf', wolf],
  ['giantToad', toad],
  ['skeleton', skeleton],
  ['goblin', (p, c) => p.draw(paintHumanoid(goblinLook(c, false), 'down', 0))],
  ['goblinKing', (p, c) => p.draw(paintHumanoid(goblinLook(c, true), 'down', 0))],
  ['scorpion', scorpion],
  ['sandWorm', sandWorm],
  ['wraith', wraith],
  ['lizardman', lizardman],
  ['marshWitch', marshWitch],
]);

/** Shapes drawn as (already outlined) humanoids. */
const HUMANOID_SHAPES: ReadonlySet<string> = new Set(['goblin', 'goblinKing', 'lizardman', 'marshWitch']);

/** Shapes that {@link paintMonster} can draw. */
export const HD_MONSTER_SHAPES: readonly string[] = [...MONSTER_PAINTERS.keys()];

/** A monster at native 64x64 in shape `shape` coloured from `colors` (palette letter -> colour). */
export function paintMonster(shape: string, colors: Palette | Colors): Paint {
  const p = new Paint(HD_SPRITE, HD_SPRITE, F);
  (MONSTER_PAINTERS.get(shape) ?? MONSTER_PAINTERS.get('slime'))?.(p, colors as Colors);
  return HUMANOID_SHAPES.has(shape) ? p : p.outline();
}

// --- Town signs (32x32) ---------------------------------------------------------------------------

/** Real pixels per sign edge (one tile). */
export const HD_SIGN = 32;

const SIGN_ICONS: ReadonlyMap<string, (p: Paint) => void> = new Map<string, (p: Paint) => void>([
  ['inn', (p) => {
    p.fill(box(8, 13, 3, 9), '#6a4020', {});
    p.fill(box(10, 16, 14, 4), '#c0392b', { grad: 0.6 });
    p.fill(ell(13, 15.5, 2.5, 1.6), '#f0f0f0', { bevel: 0 });
    p.fill(box(22, 17, 2, 5), '#6a4020', {});
  }],
  ['tavern', (p) => {
    p.fill(box(11, 12, 9, 10), '#e0a020', { gradX: 1, rim: true });
    p.fill(ell(15.5, 12, 5, 2.2), '#fff6d8', { bevel: 0 });
    [[13, 11.5], [17, 11], [15.5, 12.8]].forEach(([x, y]) => p.flat(cut(ell(x, y, 0.8), ell(x, y, 0.4)), '#e0d8b8'));
    p.fill(cut(ell(21, 17, 3.5, 3.5), ell(21, 17, 1.6, 1.8)), '#c08010', {});
    [14, 17].forEach((y) => p.flat(box(11, y, 9, 0.5), '#a06810'));
    p.flat(box(12, 13, 0.75, 8), '#fff0a0', 0.6);
  }],
  ['item', (p) => {
    p.fill(box(14, 9, 4, 4), '#c8c8d0', {});
    p.fill(box(13, 8, 6, 2), '#8a5a2a', {});
    p.fill(ell(16, 18, 6, 5), '#3ac060', { sphere: true, rim: true });
    p.flat(clip(ell(16, 18, 6, 5), box(0, 18, 32, 14)), '#20a040', 0.5);
    p.flat(seg(11, 18.5, 21, 18.5, 0.2), '#a0ffc0', 0.6);
    p.fill(ell(13.5, 16, 1.3, 1), '#d0ffd8', { bevel: 0 });
    p.spot(18, 20, '#ffffff');
  }],
  ['weapon', (p) => {
    p.fill(seg(9, 9, 21, 21, 1), STEEL, { bevel: 0, gradX: 1 });
    p.fill(seg(23, 9, 11, 21, 1), STEEL, { bevel: 0, gradX: 1 });
    p.flat(seg(9.5, 9.5, 20, 20, 0.2), '#ffffff', 0.7);
    p.flat(seg(22.5, 9.5, 12, 20, 0.2), '#ffffff', 0.7);
    p.fill(seg(10, 20, 14, 16, 0.6), GOLD, { bevel: 0 });
    p.fill(seg(22, 20, 18, 16, 0.6), GOLD, { bevel: 0 });
    p.fill(seg(8, 22, 12, 18, 1.2), WOOD, {});
    p.fill(seg(24, 22, 20, 18, 1.2), WOOD, {});
  }],
  ['armor', (p) => {
    const s = poly([10, 9, 22, 9, 22, 16, 16, 23, 10, 16]);
    p.fill(s, '#3a6ac8', { rim: true, gradX: 0.8 });
    p.flat(cut(s, poly([11, 10, 21, 10, 21, 15.6, 16, 21.6, 11, 15.6])), STEEL, 0.85);
    p.fill(clip(s, union(box(15, 10, 2, 12), box(11, 13, 10, 2))), GOLD, { bevel: 0 });
    p.fill(ell(16, 14, 1.2), GOLD, { sphere: true, bevel: 0 });
  }],
  ['chapel', (p) => {
    const cross = union(box(14, 8, 4, 15), box(10, 12, 12, 4));
    p.fill(cross, '#f0e0a0', { rim: true, gradX: 0.8 });
    p.flat(clip(cut(cross, shift(cross, 0.75, 0.75)), cross), '#fffbe0', 0.8);
    p.fill(ell(16, 14, 1.3), '#4080ff', { sphere: true, bevel: 0 });
    // Radiance.
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2 + 0.4;
      p.flat(seg(16 + Math.cos(ang) * 8, 14 + Math.sin(ang) * 8, 16 + Math.cos(ang) * 9.5, 14 + Math.sin(ang) * 9.5, 0.2), '#fff6c0', 0.7);
    }
  }],
  ['castle', (p) => {
    p.fill(poly([9, 21, 9, 11, 12, 15, 16, 9, 20, 15, 23, 11, 23, 21]), '#f0c020', { rim: true, grad: 0.8 });
    p.flat(box(9.5, 19, 13, 0.75), '#c09010');
    [9, 16, 23].forEach((x, i) => p.fill(ell(x, i === 1 ? 9 : 11, 0.8), '#fff6c0', { sphere: true, bevel: 0 }));
    p.fill(ell(16, 17, 1.8), '#c0392b', { sphere: true, bevel: 0 });
    p.fill(ell(12, 17.5, 1), '#3080e0', { sphere: true, bevel: 0 });
    p.fill(ell(20, 17.5, 1), '#30c060', { sphere: true, bevel: 0 });
  }],
]);

/** A hanging wooden shop sign (bracket, chains, board) with the icon for service `kind`. */
export function paintSign(kind: string): Paint {
  const p = new Paint(HD_SIGN, HD_SIGN, F);
  const iron = '#3a3a44';
  const wood = '#8a5a2a';
  p.fill(box(2, 1, 28, 2), iron, {});
  p.fill(box(2, 0, 2, 6), iron, {});
  p.fill(ell(29, 2, 1.2), iron, { sphere: true, bevel: 0 });
  p.spot(2.8, 1.2, '#9a9aa8');
  p.spot(2.8, 4.2, '#9a9aa8');
  // Chain links alternate between face-on rings and edge-on bars.
  [8, 23].forEach((x) => {
    for (let y = 3; y < 7.5; y += 1.5) {
      const ring = Math.round((y - 3) / 1.5) % 2 === 0;
      if (ring) {
        p.flat(cut(ell(x + 0.5, y + 0.75, 0.75, 0.9), ell(x + 0.5, y + 0.75, 0.35, 0.5)), '#7a7a88');
      } else {
        p.flat(box(x + 0.25, y, 0.5, 1.5), '#5a5a64');
      }
    }
  });
  const board = box(4, 7, 24, 19);
  p.fill(board, wood, { rim: true, grad: 0.6, tex: 0.4, seed: 2 });
  // Wood grain, two planks and corner nails.
  for (let i = 0; i < 14; i++) {
    const y = 8 + i * 1.3;
    p.flat(clip(seg(4, y + Math.sin(i) * 0.3, 28, y + Math.sin(i * 2.3) * 0.5, 0.1), board), tone(wood, i % 3 ? -1.5 : 1), 0.6);
  }
  p.flat(box(4.5, 16.25, 23, 0.5), tone(wood, -2.5));
  p.fill(ell(19, 12, 1.2, 0.7), tone(wood, -2), { bevel: 0, dither: 0 });
  p.flat(box(5, 8, 22, 1), tone(wood, 2));
  [[5.5, 8.5], [26.5, 8.5], [5.5, 24.5], [26.5, 24.5]].forEach(([x, y]) => {
    p.fill(ell(x, y, 0.55), '#606068', { sphere: true, bevel: 0, dither: 0 });
  });
  (SIGN_ICONS.get(kind) ?? SIGN_ICONS.get('item'))?.(p);
  return p.outline();
}
