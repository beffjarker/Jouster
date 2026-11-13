import { ClassId, createRng, statBudget, totalXpForLevel } from '@jouster/game/engine';
import { CLASS_ORDER, classDef } from '../data/classes';
import { ENCOUNTER_TABLES, BOSS_HP_SCALE, SOLO_MAX_ENEMIES } from '../data/monsters';
import { ITEMS, WEAPONS } from '../data/equipment';
import { pickEncounter } from '@jouster/game/engine';
import { DEFAULT_GOLD_CHANCE, PartyMember, createMember, memberToCombatant } from '../state/party';
import { STARTING_GOLD } from '../state/game-state';
import { ABILITIES } from '../data/abilities';
import { expectedDamage, runMany, simulateFight } from './simulator';
import { MONSTERS } from '../data/monsters';
import { monstersToCombatants } from '../state/party';
import { mapDef } from '../data/maps';

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

  it('solo economy: Greenwood fights up to level 6 pay for a tier-2 weapon plus Herbs (plan 15.2)', () => {
    const table = ENCOUNTER_TABLES.get('greenwood') ?? fail();
    const rng = createRng(77);
    let xp = 0;
    let gold = 0;
    const fights = 2000;
    for (let i = 0; i < fights; i++) {
      pickEncounter(table, rng, SOLO_MAX_ENEMIES).forEach((id) => {
        const m = MONSTERS.get(id) ?? fail();
        xp += m.xp;
        gold += m.gold * (m.goldChance ?? (m.boss ? 1 : DEFAULT_GOLD_CHANCE));
      });
    }
    const fightsToL6 = totalXpForLevel(6) / (xp / fights);
    const earned = STARTING_GOLD + fightsToL6 * (gold / fights);
    const tier2Price = Math.max(...[...WEAPONS.values()].filter((w) => w.tier === 2).map((w) => w.price));
    const herbs = 10 * (ITEMS.get('herb')?.price ?? 0);
    expect(earned).toBeGreaterThanOrEqual(tier2Price + herbs);
    // ...but gold should not be so plentiful that the shop is trivial.
    expect(earned).toBeLessThanOrEqual((tier2Price + herbs) * 2.5);
  });

  // Plan 15.3: a dearer attack of the same class must clearly out-damage a cheaper one.
  const goblin = (): ReturnType<typeof monstersToCombatants>[0] => monstersToCombatants([MONSTERS.get('goblin') ?? fail()])[0];
  const ability = (id: string): NonNullable<ReturnType<typeof ABILITIES.get>> => ABILITIES.get(id) ?? fail();
  const levels = Array.from({ length: 17 }, (_, i) => i + 4);

  it.each(levels)('cleric level %i with the best mace: Smite >= 1.2x Holy Strike > Attack', (level) => {
    const c = memberToCombatant(tier2(createMember('h', 'Hero', 'cleric', level)));
    const holy = expectedDamage(c, goblin(), ability('holyStrike'));
    expect(expectedDamage(c, goblin(), ability('smite'))).toBeGreaterThanOrEqual(holy * 1.2);
    expect(holy).toBeGreaterThan(expectedDamage(c, goblin()));
  });

  it.each(levels)('paladin level %i: Holy Strike beats a plain Attack', (level) => {
    const c = memberToCombatant(tier2(createMember('h', 'Hero', 'paladin', level)));
    expect(expectedDamage(c, goblin(), ability('holyStrike'))).toBeGreaterThan(expectedDamage(c, goblin()));
  });

  it.each(levels)('wizard level %i with the best staff: Fire >= 1.2x Arcane Strike; Bolt on 2 foes > Fire', (level) => {
    const c = memberToCombatant(tier2(createMember('h', 'Hero', 'wizard', level)));
    const fire = expectedDamage(c, goblin(), ability('fire'));
    expect(fire).toBeGreaterThanOrEqual(expectedDamage(c, goblin(), ability('arcaneStrike')) * 1.2);
    expect(expectedDamage(c, goblin(), ability('bolt')) * 2).toBeGreaterThan(fire);
  });

  it.each(CLASS_ORDER)('%s solo beats the Goblin King >= 60%% at level 6 with shop gear', (id) => {
    const stats = runMany(N, (i) =>
      simulateFight([tier2(createMember('h', 'Hero', id, 6))], ['goblinKing'], { herb: 6, tonic: 1 }, createRng(9000 + i), {
        bossHpScale: BOSS_HP_SCALE[0],
      }),
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.6);
  });

  // Side-quest mini-bosses (with their minions) as placed in the world.
  const miniBossFights = ['overworld', 'goblinCave', 'wolfDen']
    .flatMap((id) => mapDef(id).npcs)
    .flatMap((n) => (n.boss && !n.boss.monsterIds.includes('goblinKing') ? [n.boss.monsterIds] : []));

  it('places all four mini-boss fights', () => {
    expect(miniBossFights.map((f) => f[0]).sort()).toEqual(['alphaWolf', 'boneCaptain', 'giantToad', 'goblinChief']);
  });

  const miniCases = CLASS_ORDER.flatMap((id) => miniBossFights.map((fight) => [id, fight.join('+'), fight] as const));
  it.each(miniCases)('%s solo beats %s >= 60%% at level 7 with shop gear', (id, _name, fight) => {
    const stats = runMany(N, (i) =>
      simulateFight([tier2(createMember('h', 'Hero', id, 7))], [...fight], { herb: 6, tonic: 1 }, createRng(11000 + i), {
        bossHpScale: BOSS_HP_SCALE[0],
      }),
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.6);
  });

  // Companions are rolled per game: any class except the hero's, never repeated. So every hero is
  // tested with every other class as a single companion, and every three-class party.
  const pairs = CLASS_ORDER.flatMap((hero) => CLASS_ORDER.filter((c) => c !== hero).map((ally) => [hero, ally] as const));
  const trios = CLASS_ORDER.flatMap((a, i) =>
    CLASS_ORDER.slice(i + 1).flatMap((b, j) => CLASS_ORDER.slice(i + j + 2).map((c) => [a, b, c] as const)),
  );

  it.each(pairs)('a %s hero + %s companion at level 5 beats the Goblin King >= 70%% of the time', (a, b) => {
    const party = [tier2(createMember('a', 'A', a, 5)), tier2(createMember('b', 'B', b, 5))];
    const stats = runMany(N, (i) =>
      simulateFight(party, ['goblinKing'], { herb: 3 }, createRng(15000 + i), { bossHpScale: BOSS_HP_SCALE[1] }),
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.7);
  });

  it.each(trios)('a %s + %s + %s party at level 5 beats the Goblin King >= 70%% of the time', (...classes) => {
    const party = classes.map((c, i) => tier2(createMember(`m${i}`, `M${i}`, c, 5)));
    const stats = runMany(N, (i) =>
      simulateFight(party, ['goblinKing'], { herb: 3 }, createRng(12000 + i), { bossHpScale: BOSS_HP_SCALE[2] }),
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.7);
  });
});
function fail(): never {
  throw new Error('missing data');
}
