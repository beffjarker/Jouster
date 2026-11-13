import { MAPS } from '../data/maps';
import { CHARACTER_LOOK_IDS, TILE_VARIANT_COUNTS } from './art';
import { HD_MONSTER_SHAPES, HD_SPRITE, LOOKS, paintHumanoid, paintMonster } from './hd-characters';
import { Paint } from './hd-paint';
import { HD_TILE, HD_TILES, paintTile } from './hd-tiles';

function opaque(p: Paint): number {
  let n = 0;
  for (let i = 3; i < p.data.length; i += 4) {
    n += p.data[i] === 255 ? 1 : 0;
  }
  return n;
}

describe('HD tiles', () => {
  it('paints every map tile at 32x32 real pixels, fully opaque', () => {
    const ids = new Set<string>();
    MAPS.forEach((m) => m.legend.forEach((t) => ids.add(t.id)));
    ids.forEach((id) => {
      for (let v = 0; v < (TILE_VARIANT_COUNTS.get(id) ?? 1); v++) {
        const p = paintTile(id, 0, v);
        expect(p).not.toBeNull();
        expect([p?.width, p?.height]).toEqual([HD_TILE, HD_TILE]);
        expect(p && opaque(p)).toBe(HD_TILE * HD_TILE);
      }
    });
  });

  it('is deterministic and gives variants and animation frames distinct looks', () => {
    const data = (id: string, f: number, v: number): string => Array.from(paintTile(id, f, v)?.data ?? []).join();
    expect(data('grass', 0, 0)).toBe(data('grass', 0, 0));
    expect(data('mountain', 0, 0)).not.toBe(data('mountain', 0, 1));
    expect(data('water', 0, 0)).not.toBe(data('water', 1, 0));
    expect(data('torch', 0, 0)).not.toBe(data('torch', 1, 0));
  });

  it('paints object overlays without ground (transparent around the object)', () => {
    [...HD_TILES.entries()]
      .filter(([, t]) => t.object)
      .forEach(([id]) => {
        const p = paintTile(id, 0, 0, false);
        expect(p).not.toBeNull();
        const n = p ? opaque(p) : 0;
        expect(n).toBeGreaterThan(0);
        expect(n).toBeLessThan(HD_TILE * HD_TILE);
      });
    expect(paintTile('grass', 0, 0, false)).toBeNull();
    expect(paintTile('nope', 0, 0)).toBeNull();
  });
});

describe('HD characters and monsters', () => {
  it('has a look for every character id and paints all facings at 64x64 with feet near the bottom', () => {
    expect([...LOOKS.keys()]).toEqual(CHARACTER_LOOK_IDS);
    LOOKS.forEach((look) => {
      (['down', 'up', 'right', 'left'] as const).forEach((facing) => {
        const p = paintHumanoid(look, facing, 0);
        expect([p.width, p.height]).toEqual([HD_SPRITE, HD_SPRITE]);
        let bottom = 0;
        for (let y = 0; y < HD_SPRITE; y++) {
          for (let x = 0; x < HD_SPRITE; x++) {
            if (p.get(x, y)[3] === 255) {
              bottom = y;
            }
          }
        }
        expect(bottom).toBeGreaterThanOrEqual(60);
        // Nothing wraps around the left/right edges.
        for (let y = 0; y < HD_SPRITE; y++) {
          expect(p.get(0, y)[3]).toBe(0);
          expect(p.get(HD_SPRITE - 1, y)[3]).toBe(0);
        }
      });
    });
  });

  it('mirrors right for left and animates walking', () => {
    const look = LOOKS.get('warrior');
    expect(look).toBeDefined();
    if (look) {
      expect(Array.from(paintHumanoid(look, 'left', 1).data)).toEqual(Array.from(paintHumanoid(look, 'right', 1).mirror().data));
      expect(Array.from(paintHumanoid(look, 'down', 0).data)).not.toEqual(Array.from(paintHumanoid(look, 'down', 1).data));
    }
  });

  it('paints every monster shape at 64x64 and recolours from the palette', () => {
    HD_MONSTER_SHAPES.forEach((shape) => {
      const p = paintMonster(shape, new Map([['g', '#3a8ae8'], ['p', '#6a3a9a'], ['w', '#f0f0e0']]));
      expect([p.width, p.height]).toEqual([HD_SPRITE, HD_SPRITE]);
      expect(opaque(p)).toBeGreaterThan(200);
    });
    const blue = Array.from(paintMonster('slime', new Map([['g', '#3a8ae8']])).data).join();
    const red = Array.from(paintMonster('slime', new Map([['g', '#e04848']])).data).join();
    expect(blue).not.toBe(red);
  });
});
