import { MAPS } from '../data/maps';
import { TILE_VARIANT_COUNTS, tileVariant } from './art';

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
