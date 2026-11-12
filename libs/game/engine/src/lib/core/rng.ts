/**
 * Deterministic pseudo-random number generator (mulberry32).
 *
 * Every random roll in the game goes through an `Rng` so battles, encounters and the
 * balance simulator are reproducible from a seed.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  /** Float in [min, max). */
  float(min: number, max: number): number;
  /** True with probability `p` (0..1). */
  chance(p: number): boolean;
  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** Random element chosen by relative weight. */
  weighted<T>(items: readonly T[], weightOf: (item: T) => number): T;
}

/**
 * Creates a seeded RNG. The same seed always produces the same sequence.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    float: (min, max) => next() * (max - min) + min,
    chance: (p) => next() < p,
    pick: (items) => {
      if (items.length === 0) {
        throw new Error('Rng.pick called with an empty array');
      }
      return items[Math.floor(next() * items.length)];
    },
    weighted: (items, weightOf) => {
      const total = items.reduce((sum, item) => sum + Math.max(0, weightOf(item)), 0);
      if (items.length === 0 || total <= 0) {
        throw new Error('Rng.weighted needs at least one positive weight');
      }
      let roll = next() * total;
      for (const item of items) {
        roll -= Math.max(0, weightOf(item));
        if (roll < 0) {
          return item;
        }
      }
      return items[items.length - 1];
    },
  };
}

/** Seed derived from the current time, for normal play. */
export function timeSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}
