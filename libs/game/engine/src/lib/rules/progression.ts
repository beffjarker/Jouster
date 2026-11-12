import { ClassDef, Stats } from '../core/types';

/** Highest reachable level. */
export const MAX_LEVEL = 30;

/**
 * Weighted stat budget used to keep classes balanced:
 * `HP/4 + MP/4 + ATK + DEF + AGI + MAG`.
 */
export function statBudget(stats: Stats): number {
  return stats.hp / 4 + stats.mp / 4 + stats.atk + stats.def + stats.agi + stats.mag;
}

/** Class stats at a level (weapon bonuses not included). Fractional growth accumulates. */
export function statsAtLevel(classDef: ClassDef, level: number): Stats {
  const gained = Math.max(0, Math.min(level, MAX_LEVEL) - 1);
  const grow = (base: number, perLevel: number): number => base + Math.floor(perLevel * gained);
  return {
    hp: grow(classDef.base.hp, classDef.growth.hp),
    mp: grow(classDef.base.mp, classDef.growth.mp),
    atk: grow(classDef.base.atk, classDef.growth.atk),
    def: grow(classDef.base.def, classDef.growth.def),
    agi: grow(classDef.base.agi, classDef.growth.agi),
    mag: grow(classDef.base.mag, classDef.growth.mag),
  };
}

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return Math.floor(11 * Math.pow(level, 1.5));
}

/** Total XP required to reach `level` from level 1. */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += xpToNext(l);
  }
  return total;
}

/** Level reached with `totalXp` experience. */
export function levelForXp(totalXp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && totalXp >= totalXpForLevel(level + 1)) {
    level++;
  }
  return level;
}

/** Ability ids a class knows at a level, in learn order. */
export function abilitiesAtLevel(classDef: ClassDef, level: number): string[] {
  return classDef.abilities.filter((a) => a.level <= level).map((a) => a.abilityId);
}

/** Abilities newly learned when going from `fromLevel` to `toLevel`. */
export function abilitiesLearned(classDef: ClassDef, fromLevel: number, toLevel: number): string[] {
  return classDef.abilities
    .filter((a) => a.level > fromLevel && a.level <= toLevel)
    .map((a) => a.abilityId);
}
