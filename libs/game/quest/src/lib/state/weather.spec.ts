import { MAPS } from '../data/maps';
import {
  SEASON_WEATHER,
  STEPS_PER_SEASON,
  STEPS_PER_WEATHER,
  SUNNY_SIGHT_RADIUS,
  WEATHER,
  WeatherKind,
  seasonAt,
  weatherAt,
  weatherSeed,
  weatherSightRadius,
} from './weather';
import { newGameState } from './game-state';
import { createRng } from '@jouster/game/engine';

describe('seasons and weather', () => {
  it('starts in spring and cycles through the year', () => {
    expect(seasonAt(0)).toBe('spring');
    expect(seasonAt(STEPS_PER_SEASON)).toBe('summer');
    expect(seasonAt(STEPS_PER_SEASON * 2)).toBe('autumn');
    expect(seasonAt(STEPS_PER_SEASON * 3)).toBe('winter');
    expect(seasonAt(STEPS_PER_SEASON * 4)).toBe('spring');
  });

  it('is sunny with radius 8 and shrinks by severity', () => {
    expect(SUNNY_SIGHT_RADIUS).toBe(8);
    expect(weatherSightRadius('clear')).toBe(8);
    expect(weatherSightRadius('cloudy')).toBe(7);
    expect(weatherSightRadius('rain')).toBe(6);
    expect(weatherSightRadius('storm')).toBe(5);
    expect(weatherSightRadius('fog')).toBe(4);
    expect(weatherSightRadius('blizzard')).toBe(3);
    (Object.keys(WEATHER) as WeatherKind[]).forEach((k) => expect(weatherSightRadius(k)).toBeGreaterThanOrEqual(3));
  });

  it('opens every journey with clear skies and is deterministic', () => {
    expect(weatherAt(0, 123)).toBe('clear');
    expect(weatherAt(STEPS_PER_WEATHER - 1, 123)).toBe('clear');
    for (let s = 0; s < 2000; s += 37) {
      expect(weatherAt(s, 99)).toBe(weatherAt(s, 99));
    }
  });

  it('only rolls weather allowed in the season, and every allowed kind shows up', () => {
    const seen = new Map<string, Set<WeatherKind>>();
    for (let seed = 0; seed < 40; seed++) {
      for (let s = STEPS_PER_WEATHER; s < STEPS_PER_SEASON * 4; s += STEPS_PER_WEATHER) {
        const season = seasonAt(s);
        const kind = weatherAt(s, seed);
        expect(SEASON_WEATHER[season].map(([k]) => k)).toContain(kind);
        const set = seen.get(season) ?? new Set<WeatherKind>();
        set.add(kind);
        seen.set(season, set);
      }
    }
    seen.forEach((set, season) => expect(set.size).toBe(SEASON_WEATHER[season as keyof typeof SEASON_WEATHER].length));
  });

  it('derives a per-journey seed without using the game RNG', () => {
    const rng = createRng(1);
    const a = newGameState('Ann', 'warrior', rng);
    const before = rng.next();
    const rng2 = createRng(1);
    newGameState('Ann', 'warrior', rng2);
    weatherSeed(a);
    expect(rng2.next()).toBe(before);
    expect(weatherSeed(a)).toBe(weatherSeed(JSON.parse(JSON.stringify(a))));
    expect(weatherSeed(a)).not.toBe(weatherSeed({ ...a, party: [{ ...a.party[0], name: 'Bob' }] }));
  });

  it('keeps caves torch-lit only where goblins live', () => {
    const torches = (id: string): number => MAPS.get(id)?.rows.join('').split('t').length ?? 1;
    expect(torches('goblinCave') - 1).toBeGreaterThan(0);
    expect(torches('wolfDen') - 1).toBe(0);
  });
});
