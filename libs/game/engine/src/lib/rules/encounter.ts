import { Rng } from '../core/rng';

export interface EncounterGroup {
  monsterIds: string[];
  weight: number;
}

export interface EncounterTable {
  id: string;
  /** Chance of a fight per step (e.g. 1/16). */
  rate: number;
  groups: EncounterGroup[];
}

/** Steps after a battle during which no new encounter can start. */
export const ENCOUNTER_GRACE_STEPS = 4;

/** Rolls whether a step triggers a random encounter. */
export function rollEncounter(rate: number, stepsSinceLastBattle: number, rng: Rng): boolean {
  if (stepsSinceLastBattle < ENCOUNTER_GRACE_STEPS) {
    return false;
  }
  return rng.chance(rate);
}

/**
 * Picks a monster group from a table. Groups larger than `maxEnemies` are skipped
 * (used to cap fights at 2 enemies while the hero is alone).
 */
export function pickEncounter(table: EncounterTable, rng: Rng, maxEnemies = 4): string[] {
  const allowed = table.groups.filter((g) => g.monsterIds.length <= maxEnemies);
  if (allowed.length > 0) {
    return [...rng.weighted(allowed, (g) => g.weight).monsterIds];
  }
  return rng.weighted(table.groups, (g) => g.weight).monsterIds.slice(0, Math.max(1, maxEnemies));
}
