/**
 * @jest-environment jsdom
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createCanvas, setImageDensity } from '@jouster/game/engine';
import { CLASS_ORDER, classDef } from '../data/classes';
import { WEAPONS } from '../data/equipment';
import { GEAR, gearUsableBy } from '../data/gear';
import { createMember } from '../state/party';
import {
  Art,
  CHARACTER_LOOK_IDS,
  TILE,
  fitScale,
  monsterVariantCount,
  sharpFactor,
  spriteSize,
  tileAnchor,
} from './art';
import { LpcSheetId } from './lpc-manifest';
import {
  PAPERDOLL_CELL,
  PAPERDOLL_CLASS_POSES,
  PAPERDOLL_PARTS,
  PAPERDOLL_POSE_CELL,
  PAPERDOLL_POSE_ORIGIN,
  PAPERDOLL_STRIPS,
} from './lpc-paperdoll.generated';
import {
  LPC_CHARACTER_CELL,
  LPC_CHARACTER_FACINGS,
  LPC_CHARACTER_ROWS,
  LPC_CHARACTER_STEPS,
  LPC_CHARACTER_STEP_POSE,
  LPC_MONSTERS,
  LPC_MONSTER_CELL,
} from './lpc-sprites.generated';
import { Outfit, isClassId, outfitLook, outfitOf, showcaseOutfit, startingOutfit } from './outfit';

const assetDir = resolve(__dirname, '../../../../../../apps/jouster-ui/public/game-assets/lpc');

/** Width and height of a PNG, read from its IHDR chunk. */
function pngSize(file: string): { width: number; height: number } {
  const data = readFileSync(resolve(assetDir, file));
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

/** Sheets that exist (so sheet art is used) but draw nothing, which is enough to check sizes and caching. */
function fakeSheets(): Map<LpcSheetId, CanvasImageSource> {
  const img = {} as CanvasImageSource;
  return new Map<LpcSheetId, CanvasImageSource>([
    ['terrain', img],
    ['outside', img],
    ['characters', img],
    ['monsters', img],
    ['paperdoll', img],
  ]);
}

type DollCall = [cell: { width: number; height: number }, strips: number[], frame: number];

/** Spies on Art's layer compositor (`dollSprite`), which gets the cell, the strips low to high and the frame. */
function spyDoll(art: Art): jest.SpyInstance<HTMLCanvasElement, DollCall> {
  return jest.spyOn(art as unknown as { dollSprite(...a: DollCall): HTMLCanvasElement }, 'dollSprite');
}

function lastDoll(spy: jest.SpyInstance<HTMLCanvasElement, DollCall>): DollCall {
  return spy.mock.calls[spy.mock.calls.length - 1];
}

describe('LPC sprite layout', () => {
  it('has a characters.png row for every NPC look, and a paperdoll base for every class', () => {
    CHARACTER_LOOK_IDS.filter((id) => !isClassId(id)).forEach((id) => expect(LPC_CHARACTER_ROWS.has(id)).toBe(true));
    CLASS_ORDER.forEach((id) => {
      expect(LPC_CHARACTER_ROWS.has(id)).toBe(false);
      expect(PAPERDOLL_PARTS.get(`base@${id}`)?.walk.length).toBeGreaterThanOrEqual(5);
    });
  });

  it('covers every variant of each converted monster, and nothing more', () => {
    const ids = new Set([...LPC_MONSTERS.keys()].map((k) => k.split(':')[0]));
    ids.forEach((id) => {
      for (let v = 0; v < monsterVariantCount(id); v++) {
        expect(LPC_MONSTERS.has(`${id}:${v}`)).toBe(true);
      }
    });
    [...LPC_MONSTERS.keys()].forEach((k) => {
      const [id, v] = k.split(':');
      expect(Number(v)).toBeLessThan(monsterVariantCount(id));
    });
  });

  it('only references cells inside the shipped sheets', () => {
    const chars = pngSize('characters.png');
    const mons = pngSize('monsters.png');
    expect(chars.width).toBeGreaterThanOrEqual(LPC_CHARACTER_FACINGS.length * LPC_CHARACTER_STEPS * LPC_CHARACTER_CELL.width);
    const rows = [...LPC_CHARACTER_ROWS.values()];
    LPC_MONSTERS.forEach((m) => {
      if (m.sheet === 'characters') {
        rows.push(m.index);
        expect(m.frames).toBe(1);
      } else {
        expect((m.index + 1) * LPC_MONSTER_CELL).toBeLessThanOrEqual(mons.width);
        expect(m.frames * LPC_MONSTER_CELL).toBeLessThanOrEqual(mons.height);
      }
    });
    expect((Math.max(...rows) + 1) * LPC_CHARACTER_CELL.height).toBeLessThanOrEqual(chars.height);
  });

  it('gives every class an attack pose and the spell casters a cast pose, on every layer of their plain look', () => {
    const casters = ['wizard', 'necromancer', 'cleric'];
    CLASS_ORDER.forEach((id) => {
      const poses = PAPERDOLL_CLASS_POSES.get(id);
      expect(poses?.attack).toBeDefined();
      expect(poses?.cast !== undefined).toBe(casters.includes(id));
      const base = PAPERDOLL_PARTS.get(`base@${id}`);
      [poses?.attack, poses?.cast].forEach((anim) => {
        if (anim) {
          expect(base?.poses[anim]?.length).toBe(base?.walk.length);
        }
      });
    });
  });

  it('only references strips inside paperdoll.png, with 36 walk frames each', () => {
    const sheet = pngSize('paperdoll.png');
    PAPERDOLL_STRIPS.forEach(([x, y, w, h, , , frames]) => {
      expect(x + w * frames).toBeLessThanOrEqual(sheet.width);
      expect(y + h).toBeLessThanOrEqual(sheet.height);
    });
    PAPERDOLL_PARTS.forEach((part) => {
      part.walk.forEach(([, s]) => {
        const [, , w, h, dx, dy, frames] = PAPERDOLL_STRIPS[s];
        expect(frames).toBe(LPC_CHARACTER_FACINGS.length * LPC_CHARACTER_STEPS);
        expect(dx + w).toBeLessThanOrEqual(PAPERDOLL_CELL.width);
        expect(dy + h).toBeLessThanOrEqual(PAPERDOLL_CELL.height);
      });
      Object.values(part.poses).forEach((layers) =>
        layers.forEach(([, s]) => {
          const [, , w, h, dx, dy, frames] = PAPERDOLL_STRIPS[s];
          expect(frames).toBeGreaterThan(1);
          expect(dx + w).toBeLessThanOrEqual(PAPERDOLL_POSE_CELL.width);
          expect(dy + h).toBeLessThanOrEqual(PAPERDOLL_POSE_CELL.height);
        }),
      );
    });
  });

  it('keeps cells and the pose offset on whole logical pixels', () => {
    [PAPERDOLL_CELL, PAPERDOLL_POSE_CELL].forEach((c) => [c.width, c.height].forEach((n) => expect(n % 2).toBe(0)));
    [PAPERDOLL_POSE_ORIGIN.x, PAPERDOLL_POSE_ORIGIN.y].forEach((n) => expect(Math.abs(n % 2)).toBe(0));
    expect(PAPERDOLL_CELL).toEqual(LPC_CHARACTER_CELL);
  });

  it('credits the generated sheets', () => {
    const credits = readFileSync(resolve(assetDir, 'CREDITS.md'), 'utf8');
    expect(credits).toContain('lpc-sprites:start');
    expect(credits).toContain('characters.png');
    expect(credits).toContain('monsters.png');
    expect(credits).toContain('paperdoll.png');
  });
});

describe('paperdoll parts (plan §39)', () => {
  /** The class whose starting weapon shares a family with `weaponId` (each family belongs to one class). */
  const wielder = (weaponId: string): string | undefined =>
    CLASS_ORDER.find((c) => WEAPONS.get(classDef(c).startingWeaponId)?.family === WEAPONS.get(weaponId)?.family);

  it('draws every weapon for the class that wields it, and only that class', () => {
    WEAPONS.forEach((w) =>
      CLASS_ORDER.forEach((c) => {
        const part = PAPERDOLL_PARTS.get(`${w.id}@${c}`);
        expect(part ? `${w.id}@${c}` : undefined).toBe(c === wielder(w.id) ? `${w.id}@${c}` : undefined);
        if (part) {
          expect(part.walk.length).toBeGreaterThan(0);
        }
      }),
    );
  });

  it('draws every armour, shield and accessory for each class that can wear it, and only those', () => {
    GEAR.forEach((g) =>
      CLASS_ORDER.forEach((c) => {
        const key = `${g.id}@${c}`;
        expect(PAPERDOLL_PARTS.has(key) ? key : undefined).toBe(gearUsableBy(g, c) ? key : undefined);
      }),
    );
  });

  it('shows all worn armour and shields; only a ring is too small to see', () => {
    const unseen = [...GEAR.values()].flatMap((g) =>
      CLASS_ORDER.filter((c) => gearUsableBy(g, c) && !PAPERDOLL_PARTS.get(`${g.id}@${c}`)?.walk.length).map(
        (c) => `${g.id}@${c}`,
      ),
    );
    expect(unseen).toEqual(CLASS_ORDER.map((c) => `vigorRing@${c}`));
  });

  it('lists no part that is not a base, weapon or gear id', () => {
    PAPERDOLL_PARTS.forEach((_, key) => {
      const [id, cls] = key.split('@');
      expect(isClassId(cls)).toBe(true);
      expect(id === 'base' || WEAPONS.has(id) || GEAR.has(id)).toBe(true);
    });
  });

  it('dresses the title screen line-up only in gear each class can use', () => {
    CLASS_ORDER.forEach((c) => {
      const o = showcaseOutfit(c);
      [o.weapon, o.armor, o.shield, o.accessory].filter(Boolean).forEach((id) =>
        expect(PAPERDOLL_PARTS.has(`${id}@${c}`)).toBe(true),
      );
    });
  });
});

describe('sprite placement helpers', () => {
  const lpcFrame = setImageDensity(createCanvas(64, 64), 2);
  const tileSprite = setImageDensity(createCanvas(32, 32), 2);

  it('reports logical sizes', () => {
    expect(spriteSize(lpcFrame)).toEqual({ width: 32, height: 32 });
    expect(spriteSize(tileSprite)).toEqual({ width: TILE, height: TILE });
  });

  it('stands big sprites on their tile (centred, bottoms aligned)', () => {
    expect(tileAnchor(tileSprite)).toEqual({ x: 0, y: 0 });
    expect(tileAnchor(lpcFrame)).toEqual({ x: 8, y: 16 });
    expect(tileAnchor(lpcFrame, 2)).toEqual({ x: 24, y: 48 });
  });

  it('fits any sprite into a box', () => {
    expect(fitScale(tileSprite, 32)).toBe(2);
    expect(fitScale(lpcFrame, 32)).toBe(1);
    expect(fitScale(lpcFrame, 64)).toBe(2);
  });

  it('upscales only sprites drawn coarser than the LPC pixel grid', () => {
    const procedural = setImageDensity(createCanvas(128, 128), 4);
    expect(sharpFactor(lpcFrame, 1)).toBe(1);
    expect(sharpFactor(lpcFrame, 1.5)).toBe(2);
    expect(sharpFactor(lpcFrame, 2)).toBe(2);
    expect(sharpFactor(lpcFrame, 4)).toBe(4);
    expect(sharpFactor(lpcFrame, 8)).toBe(4);
    expect(sharpFactor(tileSprite, 2)).toBe(2);
    expect(sharpFactor(procedural, 2)).toBe(1);
    expect(sharpFactor(procedural, 4)).toBe(2);
  });

  it('sharpens a boss sprite to a denser copy of the same logical size, cached', () => {
    const art = new Art(fakeSheets());
    const boss = setImageDensity(createCanvas(4, 4), 2);
    const data = new Uint8ClampedArray(4 * 4 * 4).fill(255);
    Object.defineProperty(boss, 'getContext', {
      value: () => ({ getImageData: () => ({ width: 4, height: 4, data }) }),
    });
    expect(art.sharp(boss, 1)).toBe(boss);
    const sharp = art.sharp(boss, 2);
    expect(sharp).not.toBe(boss);
    expect(sharp.width).toBe(8);
    expect(spriteSize(sharp)).toEqual(spriteSize(boss));
    expect(art.sharp(boss, 2)).toBe(sharp);
    expect(spriteSize(art.sharp(boss, 4))).toEqual(spriteSize(boss));
  });

  it('tints a sprite with each wash over its own pixels, keeping its size and caching the latest tint', () => {
    const art = new Art(fakeSheets());
    const tree = setImageDensity(createCanvas(4, 8), 2);
    const fills: Array<{ op: string; style: string }> = [];
    const ctx = {
      globalCompositeOperation: 'source-over',
      fillStyle: '',
      drawImage: jest.fn(),
      fillRect(): void {
        fills.push({ op: this.globalCompositeOperation, style: this.fillStyle });
      },
    };
    const spy = jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => ctx as unknown as CanvasRenderingContext2D);
    expect(art.tinted(tree, [])).toBe(tree);
    const autumn = art.tinted(tree, ['rgba(214,110,30,0.16)', 'rgba(228,238,255,0.1)']);
    expect(autumn).not.toBe(tree);
    expect(spriteSize(autumn)).toEqual(spriteSize(tree));
    expect(ctx.drawImage).toHaveBeenCalledWith(tree, 0, 0);
    expect(fills).toEqual([
      { op: 'source-atop', style: 'rgba(214,110,30,0.16)' },
      { op: 'source-atop', style: 'rgba(228,238,255,0.1)' },
    ]);
    expect(art.tinted(tree, ['rgba(214,110,30,0.16)', 'rgba(228,238,255,0.1)'])).toBe(autumn);
    expect(art.tinted(tree, ['rgba(228,238,255,0.3)'])).not.toBe(autumn);
    spy.mockRestore();
  });
});

describe('Art sprites', () => {
  it('uses 32x32 logical LPC frames for characters and humanoid monsters', () => {
    const art = new Art(fakeSheets());
    const hero = art.character('warrior', 'left', 1);
    expect(spriteSize(hero)).toEqual({ width: LPC_CHARACTER_CELL.width / 2, height: LPC_CHARACTER_CELL.height / 2 });
    expect(art.character('warrior', 'left', 1)).toBe(hero);
    expect(art.character('warrior', 'right', 1)).not.toBe(hero);
    expect(spriteSize(art.monster('goblin', 1)).width).toBe(LPC_CHARACTER_CELL.width / 2);
    expect(spriteSize(art.monster('slime', 2))).toEqual({ width: TILE, height: TILE });
  });

  it('keeps procedural monsters that have no LPC art yet', () => {
    const art = new Art(fakeSheets());
    expect(LPC_MONSTERS.has('giantToad:0')).toBe(false);
    expect(spriteSize(art.monster('giantToad'))).toEqual({ width: TILE * 2, height: TILE * 2 });
  });

  it('draws every wolf look, and the Alpha Wolf, from its own LPC frame', () => {
    const art = new Art(fakeSheets());
    const keys = ['wolf:0', 'wolf:1', 'wolf:2', 'alphaWolf:0'];
    const rows = keys.map((k) => LPC_MONSTERS.get(k));
    rows.forEach((m) => expect(m?.sheet).toBe('characters'));
    expect(new Set(rows.map((m) => m?.index)).size).toBe(keys.length);
    expect(spriteSize(art.monster('wolf', 2))).toEqual({ width: LPC_CHARACTER_CELL.width / 2, height: LPC_CHARACTER_CELL.height / 2 });
    expect(art.monster('wolf', 2)).not.toBe(art.monster('wolf', 0));
    expect(spriteSize(art.monster('alphaWolf')).width).toBe(LPC_CHARACTER_CELL.width / 2);
  });

  it('animates every slime and bat look from its monsters.png column', () => {
    ['slime', 'bat'].forEach((id) => {
      for (let v = 0; v < monsterVariantCount(id); v++) {
        const m = LPC_MONSTERS.get(`${id}:${v}`);
        expect(m?.sheet).toBe('monsters');
        expect(m?.frames).toBeGreaterThan(1);
        expect(m?.fps).toBeGreaterThan(0);
      }
    });
  });

  it('loops slime frames down the column over time, cached per frame', () => {
    const art = new Art(fakeSheets());
    const crop = jest.spyOn(art as unknown as { sheetSprite(...a: unknown[]): HTMLCanvasElement }, 'sheetSprite');
    const slime = LPC_MONSTERS.get('slime:2');
    const frames = slime?.frames ?? 0;
    const fps = slime?.fps ?? 0;
    const rows = Array.from({ length: frames }, (_, f) => {
      art.monster('slime', 2, (f + 0.5) / fps);
      const [sheet, sx, sy] = crop.mock.calls[crop.mock.calls.length - 1];
      expect(sheet).toBe('monsters');
      expect(sx).toBe((slime?.index ?? 0) * LPC_MONSTER_CELL);
      return (sy as number) / LPC_MONSTER_CELL;
    });
    expect(rows).toEqual(Array.from({ length: frames }, (_, f) => f));
    const at = (f: number): number => (f + 0.5) / fps;
    expect(art.monster('slime', 2, at(0))).toBe(art.monster('slime', 2, at(frames)));
    expect(art.monster('slime', 2, at(0))).not.toBe(art.monster('slime', 2, at(1)));
    expect(art.monster('slime', 2, at(-1))).toBe(art.monster('slime', 2, at(frames - 1)));
    expect(art.monster('slime', 2)).toBe(art.monster('slime', 2, at(0)));
    expect(crop).toHaveBeenCalledTimes(frames);
  });

  it('only reports sheet monsters with several frames as animated', () => {
    const art = new Art(fakeSheets());
    expect(art.isAnimatedMonster('slime')).toBe(true);
    expect(art.isAnimatedMonster('bat', 2)).toBe(true);
    expect(art.isAnimatedMonster('goblin', 1)).toBe(false);
    expect(art.isAnimatedMonster('wolf')).toBe(false);
    expect(art.isAnimatedMonster('giantToad')).toBe(false);
    expect(art.monster('wolf', 0, 0)).toBe(art.monster('wolf', 0, 3.7));
    const procedural = new Art();
    expect(procedural.isAnimatedMonster('slime')).toBe(false);
    expect(procedural.monster('slime', 0, 0)).toBe(procedural.monster('slime', 0, 3.7));
  });

  it('mirrors procedural right-facing art for left, so callers never flip', () => {
    const art = new Art();
    const left = art.character('warrior', 'left');
    expect(left).not.toBe(art.character('warrior', 'right'));
    expect(spriteSize(left)).toEqual({ width: TILE * 2, height: TILE * 2 });
  });

  it('walks through the full LPC cycle over two tiles, never the standing frame', () => {
    const art = new Art(fakeSheets());
    const crop = jest.spyOn(art as unknown as { sheetSprite(...a: unknown[]): HTMLCanvasElement }, 'sheetSprite');
    const base = LPC_CHARACTER_FACINGS.indexOf('down') * LPC_CHARACTER_STEPS;
    const cols = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      art.characterWalk('guard', 'down', i / 8);
      return (crop.mock.calls[crop.mock.calls.length - 1][1] as number) / LPC_CHARACTER_CELL.width - base;
    });
    expect(cols).toEqual([2, 3, 4, 5, 6, 7, 8, 1]);
    expect(art.characterWalk('guard', 'down', 1.25)).toBe(art.characterWalk('guard', 'down', 0.25));
    art.character('guard', 'up', 1);
    const upBase = LPC_CHARACTER_FACINGS.indexOf('up') * LPC_CHARACTER_STEPS;
    expect((crop.mock.calls[crop.mock.calls.length - 1][1] as number) / LPC_CHARACTER_CELL.width - upBase).toBe(
      LPC_CHARACTER_STEP_POSE,
    );
  });

  it('walks party members through the same cycle from their layers', () => {
    const art = new Art(fakeSheets());
    const doll = spyDoll(art);
    const base = LPC_CHARACTER_FACINGS.indexOf('down') * LPC_CHARACTER_STEPS;
    const cols = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      art.characterWalk('warrior', 'down', i / 8);
      return lastDoll(doll)[2] - base;
    });
    expect(cols).toEqual([2, 3, 4, 5, 6, 7, 8, 1]);
    expect(art.characterWalk('warrior', 'down', 1.25)).toBe(art.characterWalk('warrior', 'down', 0.25));
    art.character('warrior', 'up', 1);
    expect(lastDoll(doll)[2]).toBe(LPC_CHARACTER_FACINGS.indexOf('up') * LPC_CHARACTER_STEPS + LPC_CHARACTER_STEP_POSE);
    expect(lastDoll(doll)[0]).toBe(PAPERDOLL_CELL);
  });

  it('swaps procedural walk frames mid-tile, as before', () => {
    const art = new Art();
    const stand = art.character('warrior', 'down', 0);
    const step = art.character('warrior', 'down', 1);
    expect([0, 0.2, 0.3, 0.7, 0.8].map((p) => art.characterWalk('warrior', 'down', p))).toEqual([
      stand,
      stand,
      step,
      step,
      stand,
    ]);
  });

  it('plays battle poses frame by frame from the layers, offset so the body lines up', () => {
    const art = new Art(fakeSheets());
    const doll = spyDoll(art);
    const parts = ['base@warrior', 'bronzeSword@warrior'].map((k) => PAPERDOLL_PARTS.get(k));
    const frames = Math.max(...parts.flatMap((p) => p?.poses['slash'] ?? []).map(([, s]) => PAPERDOLL_STRIPS[s][6]));
    const pose = art.characterAction('warrior', 'attack', 0.55);
    expect(pose).toBeDefined();
    expect(lastDoll(doll)[0]).toBe(PAPERDOLL_POSE_CELL);
    expect(lastDoll(doll)[2]).toBe(Math.floor(0.55 * frames));
    expect(spriteSize(pose?.sprite as HTMLCanvasElement)).toEqual({
      width: PAPERDOLL_POSE_CELL.width / 2,
      height: PAPERDOLL_POSE_CELL.height / 2,
    });
    expect(pose?.offsetX).toBe(-PAPERDOLL_POSE_ORIGIN.x / 2);
    expect(pose?.offsetY).toBe(-PAPERDOLL_POSE_ORIGIN.y / 2);
    expect(art.characterAction('warrior', 'attack', 0)?.sprite).not.toBe(pose?.sprite);
    expect(art.characterAction('warrior', 'attack', 1)?.sprite).toBe(art.characterAction('warrior', 'attack', 0.99)?.sprite);
  });

  it('has no battle pose without sheets, for non-casters casting, or for NPC looks', () => {
    expect(new Art().characterAction('warrior', 'attack', 0)).toBeUndefined();
    const art = new Art(fakeSheets());
    expect(art.characterAction('warrior', 'cast', 0)).toBeUndefined();
    expect(art.characterAction('king', 'attack', 0)).toBeUndefined();
    expect(art.characterAction('wizard', 'cast', 0.5)).toBeDefined();
  });
});

describe('party members drawn in their gear (plan §39)', () => {
  /** Walk strips of the given parts for a class, in the order Art layers them (z, then part and layer order). */
  const layered = (cls: string, ids: string[]): number[] =>
    ids
      .flatMap((id) => PAPERDOLL_PARTS.get(`${id}@${cls}`)?.walk ?? [])
      .map(([z, strip], i) => ({ z, i, strip }))
      .sort((a, b) => a.z - b.z || a.i - b.i)
      .map((l) => l.strip);

  it('starts every class plain: its base and starting weapon, nothing else', () => {
    const art = new Art(fakeSheets());
    const doll = spyDoll(art);
    CLASS_ORDER.forEach((c) => {
      art.character(c, 'down');
      expect(lastDoll(doll)[1]).toEqual(layered(c, ['base', classDef(c).startingWeaponId]));
    });
  });

  it('layers armour, shield, accessory and weapon over the base in ULPC z-order', () => {
    const art = new Art(fakeSheets());
    const doll = spyDoll(art);
    const outfit: Outfit = {
      classId: 'warrior',
      weapon: 'ironSword',
      armor: 'plateArmor',
      shield: 'kiteShield',
      accessory: 'swiftBoots',
    };
    art.character(outfit, 'right');
    const strips = lastDoll(doll)[1];
    expect(strips).toEqual(layered('warrior', ['base', 'plateArmor', 'kiteShield', 'swiftBoots', 'ironSword']));
    expect(strips.length).toBeGreaterThan(layered('warrior', ['base', 'ironSword']).length + 4);
  });

  it('poses in the same gear', () => {
    const art = new Art(fakeSheets());
    const doll = spyDoll(art);
    art.characterAction({ classId: 'cleric', weapon: 'ironMace', armor: 'sageRobe' }, 'cast', 0);
    const robe = PAPERDOLL_PARTS.get('sageRobe@cleric')?.poses['spellcast'] ?? [];
    expect(robe.length).toBeGreaterThan(0);
    robe.forEach(([, s]) => expect(lastDoll(doll)[1]).toContain(s));
  });

  it('changes the sprite when the gear changes, and caches each outfit', () => {
    const art = new Art(fakeSheets());
    const plain = art.character('warrior', 'down');
    expect(art.character(startingOutfit('warrior'), 'down')).toBe(plain);
    const mail = art.character({ ...startingOutfit('warrior'), armor: 'chainMail' }, 'down');
    expect(mail).not.toBe(plain);
    expect(art.character({ ...startingOutfit('warrior'), armor: 'chainMail' }, 'down')).toBe(mail);
    expect(art.character({ ...startingOutfit('warrior'), armor: 'chainMail', shield: 'buckler' }, 'down')).not.toBe(mail);
  });

  it('reads the outfit off a party member', () => {
    const m = createMember('h', 'Hero', 'cleric', 3);
    expect(outfitOf(m)).toEqual({ classId: 'cleric', weapon: 'woodMace' });
    m.armorId = 'chainMail';
    m.accessoryId = 'sageCharm';
    expect(outfitOf(m)).toEqual({ classId: 'cleric', weapon: 'woodMace', armor: 'chainMail', accessory: 'sageCharm' });
  });

  it('draws a plain procedural look until armour is worn, when the sheets are missing', () => {
    const plain = outfitLook(startingOutfit('wizard'));
    expect(plain.hat).toBeUndefined();
    expect(plain.robe).toBe(false);
    expect(plain.weapon).toBe('staff');
    expect(outfitLook({ ...startingOutfit('wizard'), armor: 'sageRobe' }).hat).toBe('wizard');
    expect(outfitLook(startingOutfit('ranger')).weapon).toBe('bow');
    const art = new Art();
    const robed = art.character({ ...startingOutfit('wizard'), armor: 'sageRobe' }, 'down');
    expect(art.character('wizard', 'down')).not.toBe(robed);
  });
});
