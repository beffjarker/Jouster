import { Rng } from '../core/rng';

export interface EncounterGroup {
  monsterIds: string[];
  weight: number;
}

export interface EncounterTable {
  id: string;
  /** Chance of a fight per step (e.g. 1/16). */
  rate: number;
  /** Level the area is tuned for; parties far above it are attacked much less often. */
  level?: number;
  groups: EncounterGroup[];
}

/** Steps after a battle during which no new encounter can start. */
export const ENCOUNTER_GRACE_STEPS = 4;

/** Levels a party can be above an area before monsters start avoiding it. */
export const OUTLEVEL_MARGIN = 3;

/** Lowest fraction of the base rate once the party far out-levels an area. */
export const OUTLEVEL_MIN_FACTOR = 1 / 32;

/**
 * Encounter rate adjusted for how far the party out-levels the area: unchanged up to
 * {@link OUTLEVEL_MARGIN} levels above, then a quarter, halving per extra level down to
 * {@link OUTLEVEL_MIN_FACTOR} of the base rate.
 */
export function scaledEncounterRate(rate: number, partyLevel: number, areaLevel?: number): number {
  const over = areaLevel === undefined ? 0 : partyLevel - areaLevel - OUTLEVEL_MARGIN;
  if (over <= 0) {
    return rate;
  }
  return rate * Math.max(OUTLEVEL_MIN_FACTOR, 0.25 / 2 ** (over - 1));
}

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
