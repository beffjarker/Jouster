import { MAPS } from '../data/maps';
import { CHARACTER_LOOK_IDS, TILE_VARIANT_COUNTS } from './art';
import { HD_MONSTER_SHAPES, HD_SPRITE, LOOKS, paintHumanoid, paintMonster } from './hd-characters';
import { ART_SCALE, Paint } from './hd-paint';
import {
  HD_TILE,
  HD_TILES,
  SHADOW_CASTERS,
  WALKWAY_TILES,
  WALK_E,
  WALK_N,
  WALK_NE,
  WALK_NW,
  WALK_S,
  WALK_SE,
  WALK_SW,
  WALK_W,
  WALL_SHADOW_ROWS,
  decorTopOf,
  paintDecorTop,
  paintTile,
  paintWallShadow,
  walkwayArms,
  walkwayMask,
} from './hd-tiles';

/** Real (stored) pixels per tile and per sprite edge. */
const T = HD_TILE * ART_SCALE;
const S = HD_SPRITE * ART_SCALE;
const R = WALL_SHADOW_ROWS * ART_SCALE;

function opaque(p: Paint): number {
  let n = 0;
  for (let i = 3; i < p.data.length; i += 4) {
    n += p.data[i] === 255 ? 1 : 0;
  }
  return n;
}

describe('HD tiles', () => {
  it('paints every map tile at 32x32 paint units (supersampled), fully opaque', () => {
    const ids = new Set<string>();
    MAPS.forEach((m) => m.legend.forEach((t) => ids.add(t.id)));
    ids.forEach((id) => {
      for (let v = 0; v < (TILE_VARIANT_COUNTS.get(id) ?? 1); v++) {
        const p = paintTile(id, 0, v);
        expect(p).not.toBeNull();
        expect([p?.width, p?.height]).toEqual([T, T]);
        expect(p && opaque(p)).toBe(T * T);
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
        expect(n).toBeLessThan(T * T);
      });
    expect(paintTile('grass', 0, 0, false)).toBeNull();
    expect(paintTile('nope', 0, 0)).toBeNull();
  });

  it('keeps the town floor clearly apart from the walls (warmer and lighter)', () => {
    const avg = (id: string): number[] => {
      const d = paintTile(id, 0, 0)?.data ?? new Uint8ClampedArray(4);
      const sum = [0, 0, 0];
      for (let i = 0; i < d.length; i += 4) {
        sum[0] += d[i];
        sum[1] += d[i + 1];
        sum[2] += d[i + 2];
      }
      return sum.map((c) => c / (d.length / 4));
    };
    const [fr, fg, fb] = avg('cobble');
    const [wr, wg, wb] = avg('wall');
    expect(fr - fb).toBeGreaterThan(wr - wb + 30);
    expect(fr + fg + fb).toBeGreaterThan(wr + wg + wb);
  });

  it('paints a soft shadow along the top edge only, for the tile below a wall', () => {
    expect(SHADOW_CASTERS.has('wall')).toBe(true);
    expect(SHADOW_CASTERS.has('cobble')).toBe(false);
    const p = paintWallShadow();
    expect([p.width, p.height]).toEqual([T, T]);
    expect(p.get(10, 0)[3]).toBeGreaterThan(p.get(10, R - 4)[3]);
    expect(p.get(10, R - 4)[3]).toBeGreaterThan(0);
    expect(p.get(10, R)[3]).toBe(0);
    expect(p.get(T - 1, T - 1)[3]).toBe(0);
  });
});

describe('walkways (bridges and boardwalks)', () => {
  /** walkwayMask for the centre of a 3x3 `rows` patch, using `legend` for tile ids. */
  const maskOf = (rows: string[], legend: Map<string, string>): number =>
    walkwayMask((dx, dy) => legend.get(rows[1 + dy][1 + dx]) ?? '');
  const bridgeKey = new Map([
    ['~', 'water'],
    ['=', 'bridge'],
    ['r', 'road'],
    ['.', 'grass'],
  ]);
  const boardKey = new Map([
    [',', 'marsh'],
    ['#', 'boardwalk'],
    ['b', 'bog'],
  ]);

  it('runs a deck out to each linked neighbour (other decks, roads)', () => {
    expect(maskOf(['~~~', '===', '~~~'], bridgeKey)).toBe(WALK_E | WALK_W);
    expect(maskOf(['~=~', '~=~', '~=~'], bridgeKey)).toBe(WALK_N | WALK_S);
    expect(maskOf(['~r~', '~=~', '~=~'], bridgeKey)).toBe(WALK_N | WALK_S);
    expect(maskOf([',,,', ',##', ',#,'], boardKey)).toBe(WALK_E | WALK_S);
    expect(maskOf([',#,', '##,', ',,,'], boardKey)).toBe(WALK_N | WALK_W);
    expect(maskOf([',#,', '###', ',,,'], boardKey)).toBe(WALK_N | WALK_E | WALK_W);
  });

  it('runs a dead end straight through, and a lone deck across the water around it', () => {
    expect(maskOf([',#,', ',#,', ',,,'], boardKey)).toBe(WALK_N | WALK_S);
    expect(maskOf([',,,', ',##', ',,,'], boardKey)).toBe(WALK_E | WALK_W);
    expect(maskOf(['...', '~=~', '...'], bridgeKey)).toBe(WALK_N | WALK_S);
    expect(maskOf(['.~.', '.=.', '.~.'], bridgeKey)).toBe(WALK_E | WALK_W);
    expect(maskOf([',,,', 'b#b', ',,,'], boardKey)).toBe(WALK_N | WALK_S);
    expect(maskOf([',,,', ',#,', ',,,'], boardKey)).toBe(WALK_E | WALK_W);
    expect(walkwayArms(0)).toBe(WALK_E | WALK_W);
  });

  it('fills the inner corner of a 2x2 block of decks so it has no hole', () => {
    expect(maskOf([',,,', '###', ',##'], boardKey)).toBe(WALK_E | WALK_S | WALK_W | WALK_SE);
    expect(maskOf(['##,', '##,', ',,,'], boardKey)).toBe(WALK_N | WALK_W | WALK_NW);
    expect(maskOf([',##', ',##', ',,,'], boardKey)).toBe(WALK_N | WALK_E | WALK_NE);
    expect(maskOf([',,,', '##,', '##,'], boardKey)).toBe(WALK_S | WALK_W | WALK_SW);
    // A road on the diagonal does not fill the corner.
    expect(maskOf(['...', '.==', '.=r'], bridgeKey)).toBe(WALK_E | WALK_S);
  });

  it('meets its neighbour exactly along every joined edge, in every orientation', () => {
    /** Which pixels along each edge are deck: drawn on the bridge's overlay, different from bare marsh on a boardwalk. */
    const edges = (id: string, mask: number): Record<'top' | 'bottom' | 'left' | 'right', string> => {
      const p = id === 'bridge' ? paintTile(id, 0, mask, false) : paintTile(id, 0, mask);
      const bare = paintTile('marsh', 0, 0);
      if (!p || !bare) {
        throw new Error(`no art for ${id}`);
      }
      const deck = (x: number, y: number): string =>
        (id === 'bridge' ? p.get(x, y)[3] > 0 : p.get(x, y).join() !== bare.get(x, y).join()) ? '#' : '.';
      const line = (f: (i: number) => string): string => Array.from({ length: T }, (_, i) => f(i)).join('');
      return {
        top: line((i) => deck(i, 0)),
        bottom: line((i) => deck(i, T - 1)),
        left: line((i) => deck(0, i)),
        right: line((i) => deck(T - 1, i)),
      };
    };
    expect([...WALKWAY_TILES].sort()).toEqual(['boardwalk', 'bridge']);
    WALKWAY_TILES.forEach((id) => {
      const masks = [...new Set(Array.from({ length: 16 }, (_, m) => walkwayArms(m)))];
      const art = new Map(masks.map((m) => [m, edges(id, m)]));
      masks.forEach((a) =>
        masks.forEach((b) => {
          if (a & WALK_E && b & WALK_W) {
            expect(`${id} ${a}>${b} ${art.get(a)?.right}`).toBe(`${id} ${a}>${b} ${art.get(b)?.left}`);
          }
          if (a & WALK_S && b & WALK_N) {
            expect(`${id} ${a}v${b} ${art.get(a)?.bottom}`).toBe(`${id} ${a}v${b} ${art.get(b)?.top}`);
          }
        }),
      );
      expect(art.get(WALK_N | WALK_S)?.top).toContain('#');
      // In a 2x2 block the filled corners line up too.
      const upper = edges(id, WALK_E | WALK_S | WALK_W | WALK_SE).bottom;
      expect(upper).toBe(edges(id, WALK_N | WALK_E | WALK_W | WALK_NE).top);
      expect(upper).not.toBe(art.get(WALK_E | WALK_S | WALK_W)?.bottom);
    });
  });
});

describe('HD characters and monsters', () => {
  it('has a look for every character id and paints all facings at 64x64 with feet near the bottom', () => {
    expect([...LOOKS.keys()]).toEqual(CHARACTER_LOOK_IDS);
    LOOKS.forEach((look) => {
      (['down', 'up', 'right', 'left'] as const).forEach((facing) => {
        const p = paintHumanoid(look, facing, 0);
        expect([p.width, p.height]).toEqual([S, S]);
        let bottom = 0;
        for (let y = 0; y < S; y++) {
          for (let x = 0; x < S; x++) {
            if (p.get(x, y)[3] === 255) {
              bottom = y;
            }
          }
        }
        expect(bottom).toBeGreaterThanOrEqual(60 * ART_SCALE);
        // Nothing wraps around the left/right edges.
        for (let y = 0; y < S; y++) {
          expect(p.get(0, y)[3]).toBe(0);
          expect(p.get(S - 1, y)[3]).toBe(0);
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
      expect([p.width, p.height]).toEqual([S, S]);
      expect(opaque(p)).toBeGreaterThan(200 * ART_SCALE * ART_SCALE);
    });
    const blue = Array.from(paintMonster('slime', new Map([['g', '#3a8ae8']])).data).join();
    const red = Array.from(paintMonster('slime', new Map([['g', '#e04848']])).data).join();
    expect(blue).not.toBe(red);
  });
});

describe('tall decor', () => {
  it('gives thrones a top drawn in the tile above and nothing else', () => {
    expect(decorTopOf('throne@carpet')).toBe('throne');
    expect(decorTopOf('crudeThrone@caveFloor')).toBe('crudeThrone');
    expect(decorTopOf('barrel@wood')).toBeNull();
    expect(decorTopOf('carpet')).toBeNull();
  });

  it('paints a visible throne back over a transparent tile', () => {
    ['throne', 'crudeThrone'].forEach((decor) => {
      const top = paintDecorTop(decor);
      expect(top.width).toBe(T);
      expect(opaque(top)).toBeGreaterThan(T * T * 0.3);
      expect(opaque(top)).toBeLessThan(T * T);
    });
  });
});
