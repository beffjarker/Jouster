import { ClassId } from '@jouster/game/engine';
import { MAPS, mapHasEncounters } from '../data/maps';
import { applyFieldRegen, createMember, memberStats } from './party';

function walk(classId: ClassId, steps: number, encounterMap: boolean): { hp: number; mp: number } {
  const m = createMember('h', 'Hero', classId, 5);
  const s = memberStats(m);
  m.hp = 1;
  m.mp = 0;
  for (let i = 1; i <= steps; i++) {
    applyFieldRegen(m, i, encounterMap);
  }
  expect(m.hp).toBeLessThanOrEqual(s.hp);
  expect(m.mp).toBeLessThanOrEqual(s.mp);
  return { hp: m.hp - 1, mp: m.mp };
}

describe('field regen (plan 15.9 / 15.10)', () => {
  it.each<[ClassId, number, number]>([
    ['warrior', 2, 0],
    ['wizard', 2, 0],
    ['rogue', 2, 0],
    ['ranger', 2, 0],
    ['paladin', 3, 0],
    ['cleric', 4, 4],
  ])('%s gains +%i HP and +%i MP over 48 overworld steps', (classId, hp, mp) => {
    expect(walk(classId, 48, true)).toEqual({ hp, mp });
  });

  it('gives nothing in towns', () => {
    expect(walk('cleric', 48, false)).toEqual({ hp: 0, mp: 0 });
  });

  it('never exceeds max and leaves KO-d members at 0', () => {
    const m = createMember('h', 'Hero', 'cleric', 3);
    const s = memberStats(m);
    for (let i = 1; i <= 240; i++) {
      applyFieldRegen(m, i, true);
    }
    expect(m.hp).toBe(s.hp);
    expect(m.mp).toBe(s.mp);
    m.hp = 0;
    m.mp = 0;
    for (let i = 1; i <= 240; i++) {
      applyFieldRegen(m, i, true);
    }
    expect(m.hp).toBe(0);
    expect(m.mp).toBe(0);
  });

  it('treats towns as safe and wilds, caves and dens as encounter maps', () => {
    expect(mapHasEncounters(MAPS.get('aldmere') ?? fail())).toBe(false);
    expect(mapHasEncounters(MAPS.get('brookhollow') ?? fail())).toBe(false);
    expect(mapHasEncounters(MAPS.get('overworld') ?? fail())).toBe(true);
    expect(mapHasEncounters(MAPS.get('goblinCave') ?? fail())).toBe(true);
  });
});
