import { GameState } from './game-state';

/** Sight radius (tiles) on a clear, sunny day. Worse weather subtracts its severity. */
export const SUNNY_SIGHT_RADIUS = 8;
/** Steps the party walks before the season turns (a full year is 4 seasons). */
export const STEPS_PER_SEASON = 300;
/** Steps between weather changes. */
export const STEPS_PER_WEATHER = 40;

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog' | 'blizzard';

export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];

export interface WeatherDef {
  name: string;
  /** How much the weather limits sight: radius = SUNNY_SIGHT_RADIUS - severity. */
  severity: number;
  /** Shown when this weather rolls in. */
  message: string;
}

export const WEATHER: Readonly<Record<WeatherKind, WeatherDef>> = {
  clear: { name: 'Sunny', severity: 0, message: 'The sky clears.' },
  cloudy: { name: 'Cloudy', severity: 1, message: 'Clouds roll in.' },
  rain: { name: 'Rain', severity: 2, message: 'It starts to rain.' },
  snow: { name: 'Snow', severity: 2, message: 'Snow begins to fall.' },
  storm: { name: 'Storm', severity: 3, message: 'Thunder rumbles. A storm!' },
  fog: { name: 'Fog', severity: 4, message: 'A thick fog creeps in.' },
  blizzard: { name: 'Blizzard', severity: 5, message: 'A blizzard howls!' },
};

/** Relative chance of each weather per season. */
export const SEASON_WEATHER: Readonly<Record<Season, ReadonlyArray<[WeatherKind, number]>>> = {
  spring: [
    ['clear', 35],
    ['cloudy', 25],
    ['rain', 30],
    ['fog', 5],
    ['storm', 5],
  ],
  summer: [
    ['clear', 55],
    ['cloudy', 20],
    ['rain', 10],
    ['storm', 15],
  ],
  autumn: [
    ['clear', 25],
    ['cloudy', 30],
    ['rain', 25],
    ['fog', 15],
    ['storm', 5],
  ],
  winter: [
    ['clear', 25],
    ['cloudy', 25],
    ['snow', 30],
    ['fog', 10],
    ['blizzard', 10],
  ],
};

export const SEASON_NAMES: Readonly<Record<Season, string>> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
};

/** Season after `steps` steps; every journey starts in spring. */
export function seasonAt(steps: number): Season {
  return SEASONS[Math.floor(Math.max(0, steps) / STEPS_PER_SEASON) % SEASONS.length];
}

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) {
    h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  }
  return h >>> 0;
}

/**
 * Per-playthrough weather seed. Derived from the rolled companion roster and hero name so it
 * needs no extra save field and never draws from the game RNG (battle rolls stay unchanged).
 */
export function weatherSeed(state: Pick<GameState, 'companions' | 'party'>): number {
  const roster = Object.keys(state.companions)
    .sort()
    .map((k) => `${k}:${state.companions[k].classId}:${state.companions[k].name}`)
    .join('|');
  return hash(`${state.party[0]?.name ?? ''}|${roster}`);
}

/** Weather for a given step count. Deterministic, so reloading a save keeps the same sky. */
export function weatherAt(steps: number, seed: number): WeatherKind {
  const period = Math.floor(Math.max(0, steps) / STEPS_PER_WEATHER);
  if (period === 0) {
    return 'clear';
  }
  const table = SEASON_WEATHER[seasonAt(steps)];
  const total = table.reduce((sum, [, w]) => sum + w, 0);
  let roll = hash(`${seed}:${period}`) % total;
  for (const [kind, weight] of table) {
    if (roll < weight) {
      return kind;
    }
    roll -= weight;
  }
  return 'clear';
}

/** Current weather for a journey. */
export function currentWeather(state: Pick<GameState, 'steps' | 'companions' | 'party'>): WeatherKind {
  return weatherAt(state.steps, weatherSeed(state));
}

/** Outdoor sight radius for a weather: 8 when sunny, minus the weather's severity. */
export function weatherSightRadius(kind: WeatherKind): number {
  return SUNNY_SIGHT_RADIUS - WEATHER[kind].severity;
}
