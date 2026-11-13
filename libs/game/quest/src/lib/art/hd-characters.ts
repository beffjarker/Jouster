import { Facing, Palette } from '@jouster/game/engine';
import { Paint, Shape, box, clip, cut, ell, poly, seg, tone, union } from './hd-paint';

/** Real pixels per character frame edge (32 logical pixels at density 2, the same as an LPC frame). */
export const HD_SPRITE = 64;

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

function eye(p: Paint, x: number, y: number, iris: string): void {
  p.px(x, y, '#1c1824');
  p.px(x, y + 1, tone(iris, 0));
  p.px(x + 1, y, '#f4f4f4');
  p.px(x + 1, y + 1, tone(iris, -2));
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
    p.fill(ell(f.cx + 2.5 + stride, f.foot - 2 - (frame === 0 ? 0 : 1), 3.8, 2.2), BOOT, { rim: true });
    return;
  }
  const lift = [frame === 0 ? 0 : 2, frame === 0 ? 2 : 0];
  [-1, 1].forEach((s, i) => {
    const x = f.cx + s * 3.5;
    const bottom = f.foot - lift[i];
    p.fill(box(Math.round(x - 2.5), f.hip - 1, 5, bottom - f.hip - 2), look.legs, { rim: true, gradX: 0.5 });
    p.fill(box(Math.round(x - 3), bottom - Math.min(6, len / 2), 6, Math.min(6, len / 2)), BOOT, { rim: true, grad: 0.6 });
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
  if (!look.robe) {
    p.fill(box(f.cx - half + 1, f.hip - 2, half * 2 - 2, 2), look.body, { shade: -1.5, bevel: 0 });
  }
  p.fill(box(f.cx - half + 1, f.waist, half * 2 - 2, 2), look.trim, { bevel: 0, grad: 0.8 });
  if (facing === 'down') {
    p.fill(box(f.cx - 1, f.waist, 3, 2), GOLD, { bevel: 0 });
    p.fill(poly([f.cx - 4, f.top + 1, f.cx + 4, f.top + 1, f.cx, f.top + 6]), look.trim, { bevel: 0, grad: 0.6 });
    p.fill(poly([f.cx - 2, f.top + 1, f.cx + 2, f.top + 1, f.cx, f.top + 3.5]), look.skin, { bevel: 0, shade: -1 });
  } else if (side) {
    p.fill(box(f.cx + half - 3, f.top + 1, 2, f.waist - f.top - 1), look.trim, { bevel: 0, shade: -0.5 });
  }
}

function hand(p: Paint, look: HumanoidLook, x: number, y: number): void {
  p.fill(ell(x, y, 2.4, 2.2), look.skin, { rim: true, sphere: true });
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
    hand(p, look, f.cx + s, handY);
    return;
  }
  const dy = frame === 0 ? [0, 1] : [1, 0];
  [-1, 1].forEach((sd, i) => {
    const sx = f.cx + sd * (f.half + 1.5);
    const hx = f.cx + sd * (f.half + 2.5);
    p.fill(seg(sx, f.top + 4, hx, handY - 2 + dy[i], 2.5), sleeve, { rim: true, gradX: -sd * 0.5 });
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
    [-3, 3].forEach((dx) => p.flat(seg(f.cx + dx, f.top + 5, f.cx + dx * 1.6, hem - 2, 0.5), tone(color, -2), 0.7));
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
    // A few strands catch the light.
    for (let i = 0; i < 4; i++) {
      p.px(Math.round(cx - 4 + i * 2), Math.round(hy - ry + 2 + (i % 2)), tone(hair, 2));
    }
  } else if (!back) {
    p.px(Math.round(cx - 3), Math.round(hy - ry + 2), tone(look.skin, 2));
  }
  // Face.
  if (facing === 'down') {
    eye(p, Math.round(cx - 4), Math.round(hy), iris);
    eye(p, Math.round(cx + 2), Math.round(hy), iris);
    p.px(Math.round(cx), Math.round(hy + 3), tone(look.skin, -1));
    p.flat(box(Math.round(cx - 1), Math.round(hy + 5), 3, 1), tone(look.skin, -2));
  } else if (side) {
    eye(p, Math.round(cx + 4), Math.round(hy), iris);
    p.px(Math.round(cx + rx + 1), Math.round(hy + 2), tone(look.skin, -1));
    p.px(Math.round(cx + 6), Math.round(hy + 5), tone(look.skin, -2));
  }
  if (look.beard && !back) {
    const beard = side
      ? union(ell(cx + 4, hy + 6, 4.5, 4.5), ell(cx + 3, hy + 9, 3, 4))
      : union(clip(ell(cx, hy + 4, rx - 0.5, ry - 1), box(0, hy + 3, 64, 20)), ell(cx, hy + 9, 4.5, 5));
    p.fill(beard, look.beard, { rim: true, tex: 0.5, seed: 9, grad: 0.6 });
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
      if (facing === 'down') {
        p.fill(box(cx - 1, hy - 3, 2, 5), hc, { shade: -0.5, bevel: 0 });
      }
      p.flat(seg(cx - 3, hy - ry + 1, cx - 5, hy - 5, 0.5), '#ffffff', 0.6);
      break;
    }
    case 'hood': {
      const outer = union(ell(cx, hy, rx + 2.5, ry + 2.5), box(cx - rx - 2.5, hy, (rx + 2.5) * 2, ry + 1));
      const opening = side ? ell(cx + 4, hy + 2, rx - 2.5, ry - 1.5) : ell(cx, hy + 2, rx - 1.5, ry - 1);
      p.fill(back ? outer : cut(outer, opening), hc, { sphere: true, rim: true, tex: 0.2 });
      break;
    }
    case 'crown': {
      const pts = [cx - 6, hy - 6, cx - 6, hy - 13, cx - 3, hy - 9, cx, hy - 14, cx + 3, hy - 9, cx + 6, hy - 13, cx + 6, hy - 6];
      p.fill(poly(pts), hc, { gradX: 0.8, grad: 0.6 });
      p.fill(box(cx - 6, hy - 8, 12, 2), hc, { shade: -1, bevel: 0 });
      if (!back) {
        p.fill(ell(cx, hy - 7.5, 1.6), '#e02020', { sphere: true, bevel: 0 });
      }
      break;
    }
    case 'cap': {
      p.fill(clip(ell(cx, hy - 3, rx + 0.5, 6.5), box(0, 0, 64, hy - 1)), hc, { sphere: true, rim: true });
      if (side) {
        p.fill(ell(cx + 7, hy - 2, 5, 1.8), hc, { shade: -1 });
      } else if (!back) {
        p.fill(ell(cx, hy - 1.5, rx + 1.5, 2), hc, { shade: -1 });
      }
      p.fill(seg(cx + 3, hy - 6, cx + 8, hy - 12, 1), '#d04030', { bevel: 0, gradX: 0.8 });
      break;
    }
    case 'mitre': {
      const shape = poly([cx - 6, hy - 4, cx + 6, hy - 4, cx + 5, hy - 14, cx, hy - 19, cx - 5, hy - 14]);
      p.fill(shape, hc, { gradX: 0.9, rim: true });
      p.fill(clip(shape, union(box(cx - 1, hy - 18, 2, 14), box(cx - 6, hy - 6, 12, 2))), GOLD, { bevel: 0 });
      break;
    }
    case 'bandana':
      p.fill(box(cx - rx, hy - 6, rx * 2, 3), hc, { grad: 0.8 });
      p.fill(poly([cx - rx, hy - 5, cx - rx - 4, hy - 1, cx - rx - 1, hy - 1]), hc, {});
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
      p.fill(box(Math.round(hx - 3), Math.round(hy - 3), 7, 2), GOLD, {});
      p.fill(box(Math.round(hx - 0.5), Math.round(hy - 1), 2, 4), WOOD, { bevel: 0 });
      break;
    case 'staff':
      p.fill(seg(hx, 9, hx, f.foot - 1, 1.1), WOOD, { gradX: 1, bevel: 0, tex: 0.3 });
      p.fill(ell(hx, 7, 3.5), '#40e0ff', { sphere: true });
      p.px(Math.round(hx - 1), 5, '#ffffff');
      break;
    case 'mace':
      p.fill(seg(hx, hy - 8, hx, hy + 5, 1), WOOD, { bevel: 0 });
      p.fill(ell(hx, hy - 10, 3.6), STEEL, { sphere: true });
      [[0, -4.5], [-4.5, 0], [4.5, 0]].forEach(([dx, dy]) => p.px(Math.round(hx + dx), Math.round(hy - 10 + dy), tone(STEEL, -2)));
      break;
    case 'dagger':
      p.fill(seg(hx, hy + 2, hx, hy + 9, 0.9), STEEL, { gradX: 1, bevel: 0 });
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
      }
      p.flat(seg(hx + 1, hy - 14, hx + 1, hy + 14, 0.4), '#e8e8e8');
      break;
    }
    case 'shield': {
      const sx = side ? f.cx + 4 : f.cx - f.half - 3;
      const sy = f.top + 4;
      const s = poly([sx - 6, sy, sx + 6, sy, sx + 6, sy + 8, sx, sy + 15, sx - 6, sy + 8]);
      p.fill(s, '#3060c0', { rim: true, gradX: 0.8, grad: 0.4 });
      p.fill(clip(s, union(box(sx - 1, sy + 1, 2, 13), box(sx - 5, sy + 4, 10, 2))), GOLD, { bevel: 0 });
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
  const p = new Paint(HD_SPRITE, HD_SPRITE);
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
  // Wet highlight.
  p.flat(ell(25, eyeY - 8, 4, 2.5), col(c, 'l', '#ffffff'), 0.8);
  p.px(23, eyeY - 9, '#ffffff');
  p.px(24, eyeY - 9, '#ffffff');
  const w = col(c, 'w', '#ffffff');
  const k = col(c, 'k', '#101010');
  [27, 37].forEach((x) => {
    p.fill(ell(x, eyeY, 3, 3.5), w, { bevel: 0 });
    p.fill(ell(x - 0.5, eyeY + 0.5, 1.6, 2.2), k, { bevel: 0 });
    p.px(x - 1, eyeY - 1, '#ffffff');
  });
  p.flat(seg(29, eyeY + 6, 35, eyeY + 6, 0.6), tone(g, -3));
}

function bat(p: Paint, c: Colors): void {
  const body = col(c, 'p');
  const wing = (dir: number): void => {
    const x = (v: number): number => 32 + dir * v;
    const pts = [x(5), 27, x(16), 18, x(28), 20, x(30), 30, x(25), 29, x(22), 35, x(17), 31, x(13), 38, x(8), 33];
    p.fill(poly(pts), body, { shade: -0.8, grad: 0.6, tex: 0.2 });
    p.flat(seg(x(6), 27, x(16), 19, 0.6), col(c, 'l', body));
    p.flat(seg(x(16), 19, x(22), 34, 0.5), col(c, 'l', body), 0.7);
    p.flat(seg(x(16), 19, x(13), 37, 0.5), col(c, 'l', body), 0.7);
  };
  wing(-1);
  wing(1);
  p.fill(ell(32, 32, 6, 8), body, { sphere: true, tex: 0.3 });
  p.fill(ell(32, 23, 6, 5.5), body, { sphere: true });
  p.fill(poly([27, 21, 26, 12, 31, 19]), body, { gradX: 0.8 });
  p.fill(poly([37, 21, 38, 12, 33, 19]), body, { gradX: 0.8 });
  const r = col(c, 'r', '#ff3030');
  p.fill(box(28, 22, 2, 2), r, { bevel: 0 });
  p.fill(box(34, 22, 2, 2), r, { bevel: 0 });
  p.px(28, 22, '#ffffff');
  p.px(34, 22, '#ffffff');
  const w = col(c, 'w', '#ffffff');
  p.px(30, 27, w);
  p.px(30, 28, w);
  p.px(33, 27, w);
  p.px(33, 28, w);
  p.fill(seg(29, 39, 28, 43, 0.8), tone(body, -2), { bevel: 0 });
  p.fill(seg(35, 39, 36, 43, 0.8), tone(body, -2), { bevel: 0 });
}

function wolf(p: Paint, c: Colors): void {
  const g = col(c, 'g');
  const d = col(c, 'd', g);
  const l = col(c, 'l', g);
  p.flat(ell(34, 59, 22, 2.5), '#000000', 0.25);
  const leg = (ax: number, ay: number, bx: number, by: number, back: boolean): void => {
    p.fill(seg(ax, ay, bx, by, 2.4), back ? d : g, { rim: true, gradX: 0.5 });
    p.fill(ell(bx - 1, by + 1, 3, 1.8), back ? d : g, { rim: true });
  };
  leg(47, 42, 50, 57, true);
  leg(25, 44, 27, 57, true);
  p.fill(union(seg(50, 34, 57, 27, 3.2), seg(57, 27, 59, 20, 2.4)), g, { rim: true, gradX: 0.4, tex: 0.4 });
  p.px(59, 18, l);
  const body = union(ell(37, 38, 15, 8.5), ell(23, 37, 8, 9));
  p.fill(body, g, { sphere: true, rim: true, tex: 0.5, seed: 2 });
  p.fill(clip(ell(22, 41, 6, 6), body), l, { bevel: 0, tex: 0.4, seed: 3 });
  leg(42, 42, 43, 57, false);
  leg(21, 44, 20, 57, false);
  p.fill(poly([12, 22, 15, 14, 19, 23]), g, { rim: true, gradX: 0.8 });
  p.fill(poly([18, 23, 21, 15, 23, 25]), d, { rim: true });
  const headShape = union(ell(17, 29, 8, 7), poly([12, 26, 2, 30, 2, 35, 13, 36]));
  p.fill(headShape, g, { sphere: true, rim: true, tex: 0.3, seed: 4 });
  p.fill(poly([4, 33, 13, 33, 13, 36, 4, 36]), l, { bevel: 0 });
  p.fill(ell(3, 31, 1.6, 1.4), col(c, 'k', '#101010'), { bevel: 0 });
  p.px(5, 36, col(c, 'w', '#ffffff'));
  p.px(8, 36, col(c, 'w', '#ffffff'));
  p.fill(box(13, 27, 3, 2), col(c, 'r', '#ff4040'), { bevel: 0 });
  p.px(13, 27, '#ffffff');
}

function toad(p: Paint, c: Colors): void {
  const g = col(c, 'g');
  const d = col(c, 'd', g);
  p.flat(ell(32, 59, 24, 2.5), '#000000', 0.25);
  p.fill(ell(47, 51, 10, 7.5), d, { sphere: true, rim: true });
  const body = clip(union(ell(35, 45, 21, 14), ell(20, 41, 13, 10)), box(0, 0, 64, 59));
  p.fill(body, g, { sphere: true, rim: true, tex: 0.3, seed: 6 });
  p.fill(clip(ell(26, 54, 15, 8), body), col(c, 'l', g), { bevel: 0, grad: 0.5 });
  [[38, 36], [46, 40], [42, 46], [32, 34], [50, 47]].forEach(([x, y]) => {
    p.px(x, y, tone(d, -1));
    p.px(x - 1, y - 1, tone(g, 2));
  });
  [[15, 31], [26, 30]].forEach(([x, y]) => {
    p.fill(ell(x, y, 5, 4.5), g, { sphere: true, rim: true });
    p.fill(ell(x, y, 3, 2.8), col(c, 'y', '#f0c020'), { sphere: true, bevel: 0 });
    p.fill(box(x - 0.5, y - 2, 1, 4), col(c, 'k', '#101010'), { bevel: 0 });
  });
  p.flat(union(seg(7, 42, 18, 46, 0.6), seg(18, 46, 26, 45, 0.6)), tone(d, -3));
  p.fill(seg(20, 50, 15, 57, 3), g, { rim: true });
  p.fill(ell(13, 58, 4.5, 1.8), g, { rim: true });
}

function skeleton(p: Paint, c: Colors): void {
  const w = col(c, 'w');
  const l = col(c, 'l', w);
  const k = col(c, 'k', '#101010');
  p.flat(ell(32, 62, 12, 2.2), '#000000', 0.25);
  const bone = (ax: number, ay: number, bx: number, by: number, r = 1.4): void =>
    p.fill(seg(ax, ay, bx, by, r), w, { rim: true, bevel: 0.6 });
  // Legs and feet.
  bone(28, 46, 27, 54);
  bone(27, 54, 27, 60);
  bone(36, 46, 37, 54);
  bone(37, 54, 37, 60);
  p.fill(ell(25.5, 61, 3, 1.5), w, { rim: true });
  p.fill(ell(38.5, 61, 3, 1.5), w, { rim: true });
  // Pelvis and spine.
  p.fill(ell(32, 45, 6, 3), w, { rim: true, sphere: true });
  bone(32, 28, 32, 44, 1.2);
  // Ribs.
  for (let i = 0; i < 4; i++) {
    const y = 31 + i * 3;
    const hw = 7 - i * 0.8;
    p.fill(seg(32 - hw, y + 1, 31, y, 1), w, { rim: true, bevel: 0 });
    p.fill(seg(33, y, 32 + hw, y + 1, 1), w, { rim: true, bevel: 0 });
  }
  // Arms.
  bone(24, 30, 22, 38);
  bone(22, 38, 22, 44);
  bone(40, 30, 42, 38);
  bone(42, 38, 42, 44);
  p.fill(ell(22, 45, 2, 1.8), w, { rim: true });
  // Rusty sword.
  p.fill(seg(43, 26, 43, 43, 1.1), '#a8a090', { gradX: 1, bevel: 0, tex: 0.6 });
  p.fill(box(40, 43, 7, 2), '#6a4a2a', {});
  p.fill(ell(42, 45, 2, 1.8), w, { rim: true });
  // Skull.
  p.fill(union(ell(32, 18, 8, 7.5), box(27, 21, 10, 6)), w, { sphere: true, rim: true });
  p.fill(box(28, 25, 8, 2), l, { bevel: 0 });
  [29, 31, 33, 35].forEach((x) => p.px(x, 26, tone(l, -3)));
  [28.5, 35.5].forEach((x) => {
    p.fill(ell(x, 19, 2.5, 2.4), k, { bevel: 0 });
    p.px(Math.round(x), 19, col(c, 'r', '#ff4040'));
  });
  p.px(32, 22, k);
  p.px(31, 23, k);
  p.px(32, 23, k);
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
]);

/** Shapes that {@link paintMonster} can draw. */
export const HD_MONSTER_SHAPES: readonly string[] = [...MONSTER_PAINTERS.keys()];

/** A monster at native 64x64 in shape `shape` coloured from `colors` (palette letter -> colour). */
export function paintMonster(shape: string, colors: Palette | Colors): Paint {
  const p = new Paint(HD_SPRITE, HD_SPRITE);
  (MONSTER_PAINTERS.get(shape) ?? MONSTER_PAINTERS.get('slime'))?.(p, colors as Colors);
  return shape.startsWith('goblin') ? p : p.outline();
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
    p.fill(cut(ell(21, 17, 3.5, 3.5), ell(21, 17, 1.6, 1.8)), '#c08010', {});
  }],
  ['item', (p) => {
    p.fill(box(14, 9, 4, 4), '#c8c8d0', {});
    p.fill(box(13, 8, 6, 2), '#8a5a2a', {});
    p.fill(ell(16, 18, 6, 5), '#3ac060', { sphere: true, rim: true });
    p.px(13, 16, '#d0ffd8');
  }],
  ['weapon', (p) => {
    p.fill(seg(9, 9, 21, 21, 1), STEEL, { bevel: 0, gradX: 1 });
    p.fill(seg(23, 9, 11, 21, 1), STEEL, { bevel: 0, gradX: 1 });
    p.fill(seg(8, 22, 12, 18, 1.2), WOOD, {});
    p.fill(seg(24, 22, 20, 18, 1.2), WOOD, {});
  }],
  ['armor', (p) => {
    const s = poly([10, 9, 22, 9, 22, 16, 16, 23, 10, 16]);
    p.fill(s, '#3a6ac8', { rim: true, gradX: 0.8 });
    p.fill(clip(s, union(box(15, 10, 2, 12), box(11, 13, 10, 2))), GOLD, { bevel: 0 });
  }],
  ['chapel', (p) => {
    p.fill(union(box(14, 8, 4, 15), box(10, 12, 12, 4)), '#f0e0a0', { rim: true, gradX: 0.8 });
  }],
  ['castle', (p) => {
    p.fill(poly([9, 21, 9, 11, 12, 15, 16, 9, 20, 15, 23, 11, 23, 21]), '#f0c020', { rim: true, grad: 0.8 });
    p.fill(ell(16, 17, 1.8), '#c0392b', { sphere: true, bevel: 0 });
  }],
]);

/** A hanging wooden shop sign (bracket, chains, board) with the icon for service `kind`. */
export function paintSign(kind: string): Paint {
  const p = new Paint(HD_SIGN, HD_SIGN);
  const iron = '#3a3a44';
  p.fill(box(2, 1, 28, 2), iron, {});
  p.fill(box(2, 0, 2, 6), iron, {});
  [8, 23].forEach((x) => {
    for (let y = 3; y < 8; y += 2) {
      p.px(x, y, '#7a7a88');
      p.px(x, y + 1, '#4a4a54');
    }
  });
  p.fill(box(4, 7, 24, 19), '#8a5a2a', { rim: true, grad: 0.6, tex: 0.4, seed: 2 });
  p.flat(box(5, 8, 22, 1), tone('#8a5a2a', 2));
  (SIGN_ICONS.get(kind) ?? SIGN_ICONS.get('item'))?.(p);
  return p.outline();
}
