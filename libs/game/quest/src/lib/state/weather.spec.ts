import { SOUTHLANDS_H, SOUTH_MARSH_LINE } from '../data/southlands-gen';
import { MAPS, climateAt, mapDef } from '../data/maps';
import {
  CLIMATES,
  CLIMATE_WEATHER,
  Climate,
  SEASONS,
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
    expect(weatherSightRadius('sandstorm')).toBe(4);
    expect(weatherSightRadius('ashfall')).toBe(5);
    (Object.keys(WEATHER) as WeatherKind[]).forEach((k) => expect(weatherSightRadius(k)).toBeGreaterThanOrEqual(3));
  });

  it('opens every journey with clear skies and is deterministic', () => {
    CLIMATES.forEach((climate) => {
      expect(weatherAt(0, 123, climate)).toBe('clear');
      expect(weatherAt(STEPS_PER_WEATHER - 1, 123, climate)).toBe('clear');
      for (let s = 0; s < 2000; s += 37) {
        expect(weatherAt(s, 99, climate)).toBe(weatherAt(s, 99, climate));
      }
    });
  });

  it.each(CLIMATES)('only rolls %s weather allowed in the season, and every allowed kind shows up', (climate) => {
    const seen = new Map<string, Set<WeatherKind>>();
    for (let seed = 0; seed < 40; seed++) {
      for (let s = STEPS_PER_WEATHER; s < STEPS_PER_SEASON * 4; s += STEPS_PER_WEATHER) {
        const season = seasonAt(s);
        const kind = weatherAt(s, seed, climate);
        expect(CLIMATE_WEATHER[climate][season].map(([k]) => k)).toContain(kind);
        const set = seen.get(season) ?? new Set<WeatherKind>();
        set.add(kind);
        seen.set(season, set);
      }
    }
    SEASONS.forEach((season) => expect(seen.get(season)?.size).toBe(CLIMATE_WEATHER[climate][season].length));
  });
});

describe('regional weather (plan §38)', () => {
  const kinds = (climate: Climate): Set<WeatherKind> =>
    new Set(SEASONS.flatMap((season) => CLIMATE_WEATHER[climate][season].map(([k]) => k)));

  it('never snows in the desert, the marsh or the volcanic lands', () => {
    (['desert', 'marsh', 'volcanic'] as Climate[]).forEach((climate) => {
      expect(kinds(climate).has('snow')).toBe(false);
      expect(kinds(climate).has('blizzard')).toBe(false);
    });
  });

  it('snows instead of raining in the high north', () => {
    expect(kinds('alpine').has('rain')).toBe(false);
    expect(kinds('alpine').has('storm')).toBe(false);
    SEASONS.forEach((season) => expect(CLIMATE_WEATHER.alpine[season].map(([k]) => k)).toContain('snow'));
  });

  it('keeps sandstorms to the desert and ashfall to the volcanic lands', () => {
    CLIMATES.forEach((climate) => {
      expect(kinds(climate).has('sandstorm')).toBe(climate === 'desert');
      expect(kinds(climate).has('ashfall')).toBe(climate === 'volcanic');
    });
  });

  it('keeps the temperate year: snow and blizzards only in winter', () => {
    SEASONS.forEach((season) => {
      const table = CLIMATE_WEATHER.temperate[season].map(([k]) => k);
      expect(table.includes('snow')).toBe(season === 'winter');
      expect(table.includes('blizzard')).toBe(season === 'winter');
    });
  });

  it('weights every table to 100, so one roll is a percentile shared by every climate', () => {
    CLIMATES.forEach((climate) =>
      SEASONS.forEach((season) => {
        const table = CLIMATE_WEATHER[climate][season];
        expect(table.reduce((sum, [, w]) => sum + w, 0)).toBe(100);
        expect(table[0][0]).toBe('clear');
      }),
    );
  });

  it('gives each outdoor map the climate of its land, and caves none', () => {
    const climates = Object.fromEntries([...MAPS.values()].map((m) => [m.id, climateAt(m, 1, 1)]));
    expect(climates).toMatchObject({
      overworld: 'temperate',
      aldmere: 'temperate',
      brookhollow: 'temperate',
      thornwick: 'temperate',
      southlands: 'desert',
      sandhollow: 'desert',
      frostpeaks: 'alpine',
      frostgate: 'alpine',
      embermountains: 'volcanic',
      emberwatch: 'volcanic',
    });
    [...MAPS.values()]
      .filter((m) => m.backdrop === 'cave')
      .forEach((m) => expect(climateAt(m, 1, 1)).toBeUndefined());
  });

  it('splits the Southlands into desert in the west and marsh in the east', () => {
    const south = mapDef('southlands');
    for (let y = 0; y < SOUTHLANDS_H; y++) {
      expect(climateAt(south, SOUTH_MARSH_LINE - 1, y)).toBe('desert');
      expect(climateAt(south, SOUTH_MARSH_LINE, y)).toBe('marsh');
    }
    // Nearly every walkable tile is under its own land's sky.
    const legend = new Map(south.legend.map((t) => [t.char, t]));
    let wrong = 0;
    let total = 0;
    south.rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        const table = legend.get(ch)?.encounterTableId;
        if (table === 'desert' || table === 'marsh') {
          total++;
          wrong += climateAt(south, x, y) === table ? 0 : 1;
        }
      }),
    );
    expect(wrong / total).toBeLessThan(0.02);
  });
});

describe('weather seed and caves', () => {
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
