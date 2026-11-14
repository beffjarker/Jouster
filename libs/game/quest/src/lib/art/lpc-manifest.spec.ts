/**
 * @jest-environment jsdom
 */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { Art } from './art';
import { ART_SCALE } from './hd-paint';
import { LPC_CELL, LPC_SHEETS, LPC_SHEET_SIZE, LPC_TILES, LpcSheetId, groundVariant, lpcGroundCell, lpcSheetUrl } from './lpc-manifest';
import { ImageLoader, loadLpcSheets } from './sheet-loader';

const assetDir = resolve(__dirname, '../../../../../../apps/jouster-ui/public/game-assets/lpc');

describe('LPC manifest', () => {
  it('only references cells inside the 1024 px sheets', () => {
    LPC_TILES.forEach((tile) => {
      expect(tile.ground.length).toBeGreaterThan(0);
      tile.ground.forEach((cell) => {
        expect(Object.keys(LPC_SHEETS)).toContain(cell.sheet);
        expect((cell.col + 1) * LPC_CELL).toBeLessThanOrEqual(LPC_SHEET_SIZE);
        expect((cell.row + 1) * LPC_CELL).toBeLessThanOrEqual(LPC_SHEET_SIZE);
      });
    });
  });

  it('ships every sheet with a CREDITS.md entry', () => {
    const credits = readFileSync(resolve(assetDir, 'CREDITS.md'), 'utf8');
    expect(credits).toContain('CC-BY-SA 3.0');
    Object.values(LPC_SHEETS).forEach((file) => {
      expect(existsSync(resolve(assetDir, file))).toBe(true);
      expect(credits).toContain(file);
    });
  });

  it('never reuses wall cells for the town floor', () => {
    const key = (c: { sheet: string; col: number; row: number }): string => `${c.sheet}:${c.col}:${c.row}`;
    const walls = new Set((LPC_TILES.get('wall')?.ground ?? []).map(key));
    const floor = LPC_TILES.get('cobble')?.ground ?? [];
    expect(floor.length).toBeGreaterThan(0);
    floor.forEach((c) => expect(walls.has(key(c))).toBe(false));
  });

  it('cycles ground cells with the animation frame', () => {
    const water = LPC_TILES.get('water');
    expect(water).toBeDefined();
    if (water) {
      expect(lpcGroundCell(water, 0, 1)).toBe(lpcGroundCell(water, 1, 0));
      expect(lpcGroundCell(water, 0, water.ground.length)).toBe(lpcGroundCell(water, 0, 0));
    }
  });

  it('picks a deterministic, varied ground per position', () => {
    expect(groundVariant(7, 9)).toBe(groundVariant(7, 9));
    const seen = new Set<number>();
    for (let x = 0; x < 30; x++) {
      seen.add(groundVariant(x, 3) % 3);
    }
    expect(seen.size).toBe(3);
  });

  it('builds sheet URLs under the asset folder', () => {
    expect(lpcSheetUrl('terrain')).toBe('game-assets/lpc/terrain_atlas.png');
    expect(lpcSheetUrl('outside', '/x/')).toBe('/x/base_out_atlas.png');
  });
});

describe('sheet loader', () => {
  it('loads every sheet into a map keyed by sheet id', async () => {
    const urls: string[] = [];
    const load: ImageLoader = (url) => {
      urls.push(url);
      return Promise.resolve({ url } as unknown as CanvasImageSource);
    };
    const sheets = await loadLpcSheets('/a/', load);
    expect([...sheets.keys()].sort()).toEqual((Object.keys(LPC_SHEETS) as LpcSheetId[]).sort());
    expect(urls).toEqual(expect.arrayContaining(['/a/terrain_atlas.png', '/a/base_out_atlas.png']));
  });

  it('rejects when any sheet fails, so procedural art stays', async () => {
    const load: ImageLoader = (url) =>
      url.includes('terrain') ? Promise.reject(new Error('404')) : Promise.resolve({} as CanvasImageSource);
    await expect(loadLpcSheets(undefined, load)).rejects.toThrow('404');
  });
});

describe('Art style', () => {
  it('is classic until sheets are supplied, and can switch back', () => {
    const art = new Art();
    expect(art.style).toBe('classic');
    const sheets = new Map<LpcSheetId, CanvasImageSource>();
    art.useSheets(sheets);
    expect(art.style).toBe('lpc');
    art.useSheets(null);
    expect(art.style).toBe('classic');
  });

  it('draws sheet tiles at 4x density (2x upscaled LPC cell) and caches per ground cell', () => {
    const art = new Art(new Map<LpcSheetId, CanvasImageSource>());
    const a = art.tile('grass', 0, 0, 0);
    expect(a.width).toBe(LPC_CELL * ART_SCALE);
    expect(art.tile('grass', 0, 0, 0)).toBe(a);
    expect(art.tile('grass', 0, 0, 1)).not.toBe(a);
  });

  it('drops cached tiles when the style changes', () => {
    const art = new Art();
    const classic = art.tile('grass');
    art.useSheets(new Map<LpcSheetId, CanvasImageSource>());
    expect(art.tile('grass')).not.toBe(classic);
  });
});
