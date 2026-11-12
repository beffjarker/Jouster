import { ClassId, createRng, statBudget } from '@jouster/game/engine';
import { CLASS_ORDER, classDef } from '../data/classes';
import { COMPANION_LIST } from '../data/companions';
import { ENCOUNTER_TABLES, BOSS_HP_SCALE, SOLO_MAX_ENEMIES } from '../data/monsters';
import { WEAPONS } from '../data/equipment';
import { pickEncounter } from '@jouster/game/engine';
import { PartyMember, createMember, memberToCombatant } from '../state/party';
import { expectedDamage, runMany, simulateFight } from './simulator';
import { MONSTERS } from '../data/monsters';
import { monstersToCombatants } from '../state/party';

const N = 400;

function startKit(classId: ClassId): Record<string, number> {
  return { herb: 3 + classDef(classId).bonusHerbs };
}

function tier2(m: PartyMember): PartyMember {
  const family = classDef(m.classId).weaponFamily;
  const w = [...WEAPONS.values()].find((x) => x.family === family && x.tier === 2);
  return { ...m, weaponId: w?.id ?? m.weaponId };
}

function killRounds(classId: ClassId, level: number, monsterId: string): number {
  return runMany(N, (i) => simulateFight([createMember('h', 'Hero', classId, level)], [monsterId], {}, createRng(1000 + i)))
    .avgRounds;
}

describe('Jouster Quest balance (plan section 4.6)', () => {
  it.each(CLASS_ORDER)('%s has a 36 point budget and +6 growth', (id) => {
    const cls = classDef(id);
    expect(statBudget(cls.base)).toBe(36);
    expect(statBudget(cls.growth)).toBeCloseTo(6, 5);
  });

  it.each(CLASS_ORDER)('%s basic melee deals >= 6 vs DEF 4 at level 1', (id) => {
    const hero = memberToCombatant(createMember('h', 'Hero', id, 1));
    const dummy = monstersToCombatants([{ ...(MONSTERS.get('wolf') ?? fail()), stats: { hp: 99, mp: 0, atk: 1, def: 4, agi: 1, mag: 0 } }])[0];
    expect(expectedDamage(hero, dummy) / 0.97).toBeGreaterThanOrEqual(6);
  });

  it.each(CLASS_ORDER)('%s kills a Slime in <= 2 rounds at level 1', (id) => {
    expect(killRounds(id, 1, 'slime')).toBeLessThanOrEqual(2);
  });

  it.each(CLASS_ORDER)('%s kills a Goblin in <= 4 rounds at level 2', (id) => {
    expect(killRounds(id, 2, 'goblin')).toBeLessThanOrEqual(4);
  });

  const greenwood = new Map<ClassId, { winRate: number; avgRounds: number }>();
  it.each(CLASS_ORDER)('%s wins >= 90%% of solo Greenwood fights at level 3', (id) => {
    const table = ENCOUNTER_TABLES.get('greenwood') ?? fail();
    const stats = runMany(N, (i) => {
      const rng = createRng(5000 + i);
      return simulateFight([createMember('h', 'Hero', id, 3)], pickEncounter(table, rng, SOLO_MAX_ENEMIES), startKit(id), rng);
    });
    greenwood.set(id, stats);
    expect(stats.winRate).toBeGreaterThanOrEqual(0.9);
  });

  it('fight length gap between classes is <= 2x', () => {
    const rounds = CLASS_ORDER.map((id) => greenwood.get(id)?.avgRounds ?? 0);
    expect(Math.max(...rounds) / Math.min(...rounds)).toBeLessThanOrEqual(2);
  });

  it.each(CLASS_ORDER)('%s solo beats the Goblin King >= 60%% at level 6 with shop gear', (id) => {
    const stats = runMany(N, (i) =>
      simulateFight([tier2(createMember('h', 'Hero', id, 6))], ['goblinKing'], { herb: 6, tonic: 1 }, createRng(9000 + i), {
        bossHpScale: BOSS_HP_SCALE[0],
      }),
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.6);
  });

  // Companions have fixed classes. Before the boss only Bren (warrior) and Sera (cleric) can join,
  // so every hero class is tested with each of them, and as the full pre-boss trio.
  const preBossCompanions: ClassId[] = COMPANION_LIST.filter((c) => !c.requiresFlag).map((c) => c.classId);

  it.each(CLASS_ORDER.flatMap((hero) => preBossCompanions.map((ally) => [hero, ally] as const)))(
    'a %s hero + %s companion at level 5 beats the Goblin King >= 70%% of the time',
    (a, b) => {
      const party = [tier2(createMember('a', 'A', a, 5)), tier2(createMember('b', 'B', b, 5))];
      const stats = runMany(N, (i) =>
        simulateFight(party, ['goblinKing'], { herb: 3 }, createRng(15000 + i), { bossHpScale: BOSS_HP_SCALE[1] }),
      );
      expect(stats.winRate).toBeGreaterThanOrEqual(0.7);
    },
  );

  it.each(CLASS_ORDER)('a %s hero + Bren + Sera at level 5 beats the Goblin King >= 70%% of the time', (hero) => {
    const party = [hero, ...preBossCompanions].map((c, i) => tier2(createMember(`m${i}`, `M${i}`, c, 5)));
    const stats = runMany(N, (i) =>
      simulateFight(party, ['goblinKing'], { herb: 3 }, createRng(12000 + i), { bossHpScale: BOSS_HP_SCALE[2] }),
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.7);
  });
});

function fail(): never {
  throw new Error('missing data');
}
