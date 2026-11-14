/**
 * @jest-environment jsdom
 */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { inflateSync } from 'zlib';
import { Art } from './art';
import { ART_SCALE } from './hd-paint';
import { LPC_CELL, LPC_SHEETS, LPC_SHEET_SIZE, LPC_TILES, LpcCell, LpcSheetId, groundVariant, lpcGroundCell, lpcSheetUrl } from './lpc-manifest';
import { ImageLoader, loadLpcSheets } from './sheet-loader';

const assetDir = resolve(__dirname, '../../../../../../apps/jouster-ui/public/game-assets/lpc');

interface Rgba {
  width: number;
  data: Uint8Array;
}

/** Minimal decoder for the LPC atlases (8-bit RGBA, non-interlaced PNG). */
function readRgbaPng(file: string): Rgba {
  const buf = readFileSync(file);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  expect([buf[24], buf[25], buf[28]]).toEqual([8, 6, 0]);
  const idat: Uint8Array[] = [];
  for (let at = 8; at < buf.length; ) {
    const len = buf.readUInt32BE(at);
    if (buf.toString('ascii', at + 4, at + 8) === 'IDAT') {
      idat.push(Uint8Array.from(buf.subarray(at + 8, at + 8 + len)));
    }
    at += len + 12;
  }
  const joined = new Uint8Array(idat.reduce((n, c) => n + c.length, 0));
  idat.reduce((offset, c) => (joined.set(c, offset), offset + c.length), 0);
  const raw = inflateSync(joined);
  const stride = width * 4;
  const data = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= 4 ? data[y * stride + x - 4] : 0;
      const b = y > 0 ? data[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y > 0 ? data[(y - 1) * stride + x - 4] : 0;
      const p = a + b - c;
      const paeth = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c;
      const pred = [0, a, b, (a + b) >> 1, paeth][filter];
      data[y * stride + x] = (v + pred) & 255;
    }
  }
  return { width, data };
}

/** Brightness of each cell edge (top, bottom, left, right) relative to the cell's mean; dark border lines go strongly negative. */
function edgeProfile(sheet: Rgba, cell: LpcCell): number[] {
  const lum = (x: number, y: number): number => {
    const i = ((cell.row * LPC_CELL + y) * sheet.width + cell.col * LPC_CELL + x) * 4;
    return 0.3 * sheet.data[i] + 0.59 * sheet.data[i + 1] + 0.11 * sheet.data[i + 2];
  };
  const n = LPC_CELL;
  const range = Array.from({ length: n }, (_, i) => i);
  const mean = range.reduce((s, y) => s + range.reduce((r, x) => r + lum(x, y), 0), 0) / (n * n);
  const avg = (f: (i: number) => number): number => range.reduce((s, i) => s + f(i), 0) / n - mean;
  return [avg((x) => lum(x, 0)), avg((x) => lum(x, n - 1)), avg((y) => lum(0, y)), avg((y) => lum(n - 1, y))];
}

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

  it('only mixes ground cells that tile seamlessly (no border pieces from a patch edge)', () => {
    const sheets = new Map<LpcSheetId, Rgba>();
    const sheet = (id: LpcSheetId): Rgba => {
      const loaded = sheets.get(id) ?? readRgbaPng(resolve(assetDir, LPC_SHEETS[id]));
      sheets.set(id, loaded);
      return loaded;
    };
    const problems: string[] = [];
    LPC_TILES.forEach((tile, id) => {
      const profiles = tile.ground.map((cell) => ({ cell, edges: edgeProfile(sheet(cell.sheet), cell) }));
      profiles.forEach(({ cell, edges: [top, bottom, left, right] }) => {
        // A dark line on both opposite edges doubles up against a copy of itself.
        if ((top < -30 && bottom < -30) || (left < -30 && right < -30)) {
          problems.push(`${id} ${cell.col},${cell.row} is framed on opposite edges`);
        }
      });
      const [first, ...rest] = profiles;
      rest.forEach(({ cell, edges }) => {
        if (edges.some((e, i) => Math.abs(e - first.edges[i]) > 15)) {
          problems.push(`${id} ${cell.col},${cell.row} has different edges than ${first.cell.col},${first.cell.row}`);
        }
      });
    });
    expect(problems).toEqual([]);
  });

  it('cycles ground cells with the animation frame', () => {
    const water = LPC_TILES.get('water');
    expect(water).toBeDefined();
    if (water) {
      expect(lpcGroundCell(water, 0, 1)).toBe(lpcGroundCell(water, 1, 0));
      expect(lpcGroundCell(water, 0, water.ground.length)).toBe(lpcGroundCell(water, 0, 0));
    }
  });

  it('animates only water-like ground; object-only animations keep a fixed floor cell', () => {
    const animated = [...LPC_TILES].filter(([, tile]) => tile.animatedGround).map(([id]) => id);
    expect(animated.sort()).toEqual(['bridge', 'caveWater', 'water']);
    ['fountain', 'torch', 'cobble'].forEach((id) => {
      const tile = LPC_TILES.get(id);
      expect(tile).toBeDefined();
      if (tile) {
        for (let seed = 0; seed < 10; seed++) {
          expect(lpcGroundCell(tile, seed, 1)).toBe(lpcGroundCell(tile, seed, 0));
        }
      }
    });
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

describe('Art sheets', () => {
  it('is procedural until sheets are supplied, and can switch back', () => {
    const art = new Art();
    expect(art.hasSheets).toBe(false);
    const sheets = new Map<LpcSheetId, CanvasImageSource>();
    art.useSheets(sheets);
    expect(art.hasSheets).toBe(true);
    art.useSheets(null);
    expect(art.hasSheets).toBe(false);
  });

  it('draws sheet tiles at 4x density (2x upscaled LPC cell) and caches per ground cell', () => {
    const art = new Art(new Map<LpcSheetId, CanvasImageSource>());
    const a = art.tile('grass', 0, 0, 0);
    expect(a.width).toBe(LPC_CELL * ART_SCALE);
    expect(art.tile('grass', 0, 0, 0)).toBe(a);
    expect(art.tile('grass', 0, 0, 1)).not.toBe(a);
  });

  it('drops cached tiles when the sheets arrive', () => {
    const art = new Art();
    const procedural = art.tile('grass');
    art.useSheets(new Map<LpcSheetId, CanvasImageSource>());
    expect(art.tile('grass')).not.toBe(procedural);
  });

  it('keeps the fountain and torch floor cell steady across animation frames, but ripples water', () => {
    type SheetTile = (sheets: unknown, id: string, sheet: LpcSheetId, col: number, row: number) => HTMLCanvasElement;
    const spy = jest.spyOn(Art.prototype as unknown as { sheetTile: SheetTile }, 'sheetTile');
    const art = new Art(new Map<LpcSheetId, CanvasImageSource>());
    const cellAt = (id: string, frame: number): string => {
      spy.mockClear();
      art.tile(id, frame, 0, 3);
      const [, , sheet, col, row] = spy.mock.calls[0];
      return `${sheet}:${col}:${row}`;
    };
    expect(cellAt('fountain', 1)).toBe(cellAt('fountain', 0));
    expect(cellAt('torch', 1)).toBe(cellAt('torch', 0));
    expect(cellAt('water', 1)).not.toBe(cellAt('water', 0));
    spy.mockRestore();
  });
});
