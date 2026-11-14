/**
 * @jest-environment jsdom
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createCanvas, setImageDensity } from '@jouster/game/engine';
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
  LPC_CHARACTER_CELL,
  LPC_CHARACTER_FACINGS,
  LPC_CHARACTER_ROWS,
  LPC_CHARACTER_STEPS,
  LPC_CHARACTER_STEP_POSE,
  LPC_MONSTERS,
  LPC_MONSTER_CELL,
} from './lpc-sprites.generated';

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
  ]);
}

describe('LPC sprite layout', () => {
  it('has a characters.png row for every humanoid look', () => {
    CHARACTER_LOOK_IDS.forEach((id) => expect(LPC_CHARACTER_ROWS.has(id)).toBe(true));
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
      } else {
        expect((m.index + 1) * LPC_MONSTER_CELL).toBeLessThanOrEqual(mons.width);
      }
    });
    expect((Math.max(...rows) + 1) * LPC_CHARACTER_CELL.height).toBeLessThanOrEqual(chars.height);
  });

  it('credits the generated sheets', () => {
    const credits = readFileSync(resolve(assetDir, 'CREDITS.md'), 'utf8');
    expect(credits).toContain('lpc-sprites:start');
    expect(credits).toContain('characters.png');
    expect(credits).toContain('monsters.png');
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
    expect(LPC_MONSTERS.has('wolf:0')).toBe(false);
    expect(spriteSize(art.monster('wolf'))).toEqual({ width: TILE * 2, height: TILE * 2 });
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
      art.characterWalk('warrior', 'down', i / 8);
      return (crop.mock.calls[crop.mock.calls.length - 1][1] as number) / LPC_CHARACTER_CELL.width - base;
    });
    expect(cols).toEqual([2, 3, 4, 5, 6, 7, 8, 1]);
    expect(art.characterWalk('warrior', 'down', 1.25)).toBe(art.characterWalk('warrior', 'down', 0.25));
    art.character('warrior', 'up', 1);
    const upBase = LPC_CHARACTER_FACINGS.indexOf('up') * LPC_CHARACTER_STEPS;
    expect((crop.mock.calls[crop.mock.calls.length - 1][1] as number) / LPC_CHARACTER_CELL.width - upBase).toBe(
      LPC_CHARACTER_STEP_POSE,
    );
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
});
