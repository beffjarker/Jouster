import { GameState } from './game-state';

/** Sight radius (tiles) on a clear, sunny day. Worse weather subtracts its severity. */
export const SUNNY_SIGHT_RADIUS = 8;
/** Steps the party walks before the season turns (a full year is 4 seasons). */
export const STEPS_PER_SEASON = 300;
/** Steps between weather changes. */
export const STEPS_PER_WEATHER = 40;

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog' | 'blizzard' | 'sandstorm' | 'ashfall';
/**
 * The kind of sky a region has (plan §38). Each outdoor map takes it from its backdrop, and a map may split into
 * zones (the Southlands' marsh). Caves have none.
 */
export type Climate = 'temperate' | 'desert' | 'marsh' | 'alpine' | 'volcanic';

export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const CLIMATES: readonly Climate[] = ['temperate', 'desert', 'marsh', 'alpine', 'volcanic'];

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
  sandstorm: { name: 'Sandstorm', severity: 4, message: 'A sandstorm whips up!' },
  ashfall: { name: 'Ashfall', severity: 3, message: 'Ash begins to fall.' },
};

type WeatherTable = ReadonlyArray<[WeatherKind, number]>;

/**
 * Relative chance of each weather per climate and season. Temperate lands (Act I) keep the original year; deserts
 * get sandstorms and never snow; the marsh is wet and foggy but too warm for snow; the high north snows instead of
 * raining; the volcanic lands rain ash. Every table sums to 100 and runs roughly from fair to foul, so the period's
 * single roll is a percentile shared by all climates: crossing into another region keeps a similar sky where the
 * tables allow.
 */
export const CLIMATE_WEATHER: Readonly<Record<Climate, Readonly<Record<Season, WeatherTable>>>> = {
  temperate: {
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
  },
  desert: {
    spring: [
      ['clear', 55],
      ['cloudy', 20],
      ['sandstorm', 20],
      ['storm', 5],
    ],
    summer: [
      ['clear', 70],
      ['cloudy', 10],
      ['sandstorm', 20],
    ],
    autumn: [
      ['clear', 55],
      ['cloudy', 20],
      ['rain', 5],
      ['sandstorm', 20],
    ],
    winter: [
      ['clear', 45],
      ['cloudy', 30],
      ['rain', 15],
      ['sandstorm', 10],
    ],
  },
  marsh: {
    spring: [
      ['clear', 25],
      ['cloudy', 25],
      ['rain', 25],
      ['fog', 20],
      ['storm', 5],
    ],
    summer: [
      ['clear', 35],
      ['cloudy', 20],
      ['rain', 15],
      ['fog', 10],
      ['storm', 20],
    ],
    autumn: [
      ['clear', 20],
      ['cloudy', 25],
      ['rain', 25],
      ['fog', 25],
      ['storm', 5],
    ],
    winter: [
      ['clear', 20],
      ['cloudy', 30],
      ['rain', 25],
      ['fog', 25],
    ],
  },
  alpine: {
    spring: [
      ['clear', 30],
      ['cloudy', 25],
      ['snow', 30],
      ['fog', 10],
      ['blizzard', 5],
    ],
    summer: [
      ['clear', 50],
      ['cloudy', 25],
      ['snow', 15],
      ['fog', 10],
    ],
    autumn: [
      ['clear', 25],
      ['cloudy', 25],
      ['snow', 30],
      ['fog', 10],
      ['blizzard', 10],
    ],
    winter: [
      ['clear', 15],
      ['cloudy', 20],
      ['snow', 30],
      ['fog', 10],
      ['blizzard', 25],
    ],
  },
  volcanic: {
    spring: [
      ['clear', 35],
      ['cloudy', 25],
      ['ashfall', 30],
      ['storm', 10],
    ],
    summer: [
      ['clear', 40],
      ['cloudy', 20],
      ['ashfall', 30],
      ['storm', 10],
    ],
    autumn: [
      ['clear', 30],
      ['cloudy', 25],
      ['ashfall', 35],
      ['storm', 10],
    ],
    winter: [
      ['clear', 25],
      ['cloudy', 30],
      ['ashfall', 35],
      ['storm', 10],
    ],
  },
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

/**
 * Weather for a given step count in a climate. Deterministic, so reloading a save keeps the same sky.
 */
export function weatherAt(steps: number, seed: number, climate: Climate): WeatherKind {
  const period = Math.floor(Math.max(0, steps) / STEPS_PER_WEATHER);
  if (period === 0) {
    return 'clear';
  }
  const table = CLIMATE_WEATHER[climate][seasonAt(steps)];
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

/** Current weather for a journey, in the climate the party is standing in. */
export function currentWeather(state: Pick<GameState, 'steps' | 'companions' | 'party'>, climate: Climate): WeatherKind {
  return weatherAt(state.steps, weatherSeed(state), climate);
}

/** Outdoor sight radius for a weather: 8 when sunny, minus the weather's severity. */
export function weatherSightRadius(kind: WeatherKind): number {
  return SUNNY_SIGHT_RADIUS - WEATHER[kind].severity;
}
