import { MAPS } from '../data/maps';
import { MINI_BOSS_IDS, MONSTERS } from '../data/monsters';
import { TILE_VARIANT_COUNTS, monsterVariant, monsterVariantCount, tileVariant } from './art';

describe('tile variants', () => {
  it('gives every solid landscape tile at least 3 variants', () => {
    const solidIds = new Set<string>();
    MAPS.forEach((map) =>
      map.legend.filter((t) => t.solid).forEach((t) => solidIds.add(t.id)),
    );
    const landscape = [...solidIds].filter((id) => !['counter', 'fountain', 'torch'].includes(id));
    expect(landscape).toEqual(expect.arrayContaining(['mountain', 'tree', 'wall', 'rock']));
    landscape.forEach((id) => expect(TILE_VARIANT_COUNTS.get(id) ?? 1).toBeGreaterThanOrEqual(3));
  });

  it('is deterministic for the same map position', () => {
    expect(tileVariant('overworld', 'mountain', 12, 34)).toBe(tileVariant('overworld', 'mountain', 12, 34));
  });

  it('stays in range and uses every variant across a region', () => {
    const seen = new Map<number, number>();
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        const v = tileVariant('overworld', 'tree', x, y);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(3);
        seen.set(v, (seen.get(v) ?? 0) + 1);
      }
    }
    expect(seen.size).toBe(3);
    seen.forEach((n) => expect(n).toBeGreaterThan(80));
  });

  it('returns 0 for tiles with a single look', () => {
    expect(tileVariant('overworld', 'grass', 5, 5)).toBe(0);
  });
});

describe('monster variants', () => {
  const common = ['slime', 'giantBat', 'wolf', 'goblin', 'skeleton'];

  it('gives every common monster at least 3 looks and slimes the most', () => {
    common.forEach((id) => expect(monsterVariantCount(MONSTERS.get(id)?.spriteId ?? '')).toBeGreaterThanOrEqual(3));
    expect(monsterVariantCount('slime')).toBeGreaterThanOrEqual(5);
  });

  it('keeps bosses to a single look', () => {
    [...MINI_BOSS_IDS, 'goblinKing'].forEach((id) => expect(monsterVariantCount(MONSTERS.get(id)?.spriteId ?? id)).toBe(1));
    expect(monsterVariant('goblinKing', 1234)).toBe(0);
  });

  it('picks looks deterministically and spreads them across seeds', () => {
    expect(monsterVariant('slime', 99)).toBe(monsterVariant('slime', 99));
    const seen = new Set<number>();
    for (let seed = 0; seed < 200; seed++) {
      const v = monsterVariant('slime', seed * 31);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(monsterVariantCount('slime'));
      seen.add(v);
    }
    expect(seen.size).toBe(monsterVariantCount('slime'));
  });
});