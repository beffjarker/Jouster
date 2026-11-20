import { ClassId, EncounterTable, createRng, statBudget, totalXpForLevel } from '@jouster/game/engine';
import { CLASS_ORDER, classDef } from '../data/classes';
import { ACT_THREE_BOSS_IDS, ACT_TWO_BOSS_IDS, FINALE_BOSS_IDS, ENCOUNTER_TABLES, BOSS_HP_SCALE, SOLO_MAX_ENEMIES } from '../data/monsters';
import { ITEMS, WEAPONS } from '../data/equipment';
import { pickEncounter } from '@jouster/game/engine';
import { DEFAULT_GOLD_CHANCE, PartyMember, applyFieldRegen, createMember, grantXp, memberToCombatant } from '../state/party';
import { MAX_PARTY, STARTING_GOLD, companionJoinLevel, startingInventory } from '../state/game-state';
import { ABILITIES } from '../data/abilities';
import { FightResult, expectedDamage, runMany, simulateFight } from './simulator';
import { MONSTERS } from '../data/monsters';
import { monstersToCombatants } from '../state/party';
import { mapDef } from '../data/maps';
import { armed, duo, geared, tier2 } from './kits';
import { arrivalFight, bossNpc, bossTrek, fieldTopUp, findSightRoute, sightRoute, trekTables, walkIn } from './arrival';

const N = 400;

function startKit(classId: ClassId): Record<string, number> {
  return startingInventory(classId);
}

function killRounds(classId: ClassId, level: number, monsterId: string): number {
  return runMany(N, (i) => simulateFight([createMember('h', 'Hero', classId, level)], [monsterId], {}, createRng(1000 + i)))
    .avgRounds;
}

/** Plan §37: steps from the entrance until each warden (by lead monster id) comes into sight. */
function sightSteps(mapId: string, ids: string[]): number[] {
  return ids.map((id) => sightRoute(mapId, bossNpc(mapId, id).id).steps);
}

function expectRising(values: number[]): void {
  values.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(values[i]));
}

/** The walk-in fights before each of a dungeon's wardens taken back to back: entrance to the first, then onwards. */
function gauntletTreks(mapId: string, ids: string[], level: number): EncounterTable[][] {
  return ids.map((id, i) => bossTrek(mapId, id, level, i === 0 ? undefined : bossNpc(mapId, ids[i - 1])));
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

  it.each(levels)('necromancer level %i: Drain Life beats a plain Attack; Blight on 2 foes > Drain Life', (level) => {
    const c = memberToCombatant(tier2(createMember('h', 'Hero', 'necromancer', level)));
    const drain = expectedDamage(c, goblin(), ability('drainLife'));
    expect(drain).toBeGreaterThan(expectedDamage(c, goblin()));
    expect(expectedDamage(c, goblin(), ability('blight')) * 2).toBeGreaterThan(drain);
  });

  it.each(levels)('wizard level %i with the best staff: Fire >= 1.2x Arcane Strike; Bolt on 2 foes > Fire', (level) => {
    const c = memberToCombatant(tier2(createMember('h', 'Hero', 'wizard', level)));
    const fire = expectedDamage(c, goblin(), ability('fire'));
    expect(fire).toBeGreaterThanOrEqual(expectedDamage(c, goblin(), ability('arcaneStrike')) * 1.2);
    expect(expectedDamage(c, goblin(), ability('bolt')) * 2).toBeGreaterThan(fire);
  });

  // Plan §37: bosses attack on sight, so every boss fight below starts with the random fights on the way in.
  it.each(CLASS_ORDER)('%s solo beats the Goblin King >= 60%% at level 6 with shop gear', (id) => {
    const trek = bossTrek('goblinCave', 'goblinKing', 6);
    const stats = runMany(N, (i) =>
      arrivalFight([tier2(createMember('h', 'Hero', id, 6))], trek, ['goblinKing'], { herb: 6, tonic: 1 }, createRng(9000 + i), {
        bossHpScale: BOSS_HP_SCALE[0],
      }),
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.6);
  });

  // Plan 15.4: armor helps but must not make the first boss a formality for a solo hero.
  it.each(CLASS_ORDER)('%s solo vs the Goblin King at level 6 with full tier-2 gear: helps, stays a fight', (id) => {
    const fight = (m: PartyMember): ReturnType<typeof runMany> =>
      runMany(N, (i) => simulateFight([m], ['goblinKing'], { herb: 6, tonic: 1 }, createRng(9000 + i), { bossHpScale: BOSS_HP_SCALE[0] }));
    const plain = fight(tier2(createMember('h', 'Hero', id, 6)));
    const armored = fight(geared(createMember('h', 'Hero', id, 6)));
    expect(armored.winRate).toBeGreaterThanOrEqual(plain.winRate - 0.02);
    expect(armored.avgRounds).toBeGreaterThanOrEqual(4);
  });

  // Side-quest mini-bosses (with their minions) as placed in the world.
  const miniBossFights = ['overworld', 'thornwick', 'goblinCave', 'wolfDen'].flatMap((mapId) =>
    mapDef(mapId).npcs.flatMap((n) => (n.boss && !n.boss.monsterIds.includes('goblinKing') ? [[mapId, n.boss.monsterIds] as const] : [])),
  );

  it('places all four mini-boss fights', () => {
    expect(miniBossFights.map(([, f]) => f[0]).sort()).toEqual(['alphaWolf', 'boneCaptain', 'giantToad', 'goblinChief']);
  });

  const miniCases = CLASS_ORDER.flatMap((id) => miniBossFights.map(([mapId, fight]) => [id, fight.join('+'), mapId, fight] as const));
  it.each(miniCases)('%s solo beats %s >= 60%% at level 7 with shop gear', (id, _name, mapId, fight) => {
    const trek = bossTrek(mapId, fight[0], 7);
    const stats = runMany(N, (i) =>
      arrivalFight([tier2(createMember('h', 'Hero', id, 7))], trek, fight, { herb: 6, tonic: 1 }, createRng(11000 + i), {
        bossHpScale: BOSS_HP_SCALE[0],
      }),
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.6);
  });

  // Grind wardens in the Old Mine (plan §36): each is a solo hero's next rung toward the Goblin King.
  const wardenFights = mapDef('oldMine').npcs.flatMap((n) => (n.boss ? [n.boss.monsterIds] : []));
  const wardenRungs: Record<string, { level: number; tier: number }> = {
    slimeMatron: { level: 3, tier: 1 },
    batBroodmother: { level: 4, tier: 1 },
    goblinForeman: { level: 5, tier: 2 },
  };

  it('places the three Old Mine wardens', () => {
    expect(wardenFights.map((f) => f[0]).sort()).toEqual(Object.keys(wardenRungs).sort());
  });

  it('sights the Old Mine wardens in rung order (plan §37)', () => {
    expectRising(sightSteps('oldMine', Object.keys(wardenRungs)));
  });

  const wardenCases = CLASS_ORDER.flatMap((id) => wardenFights.map((fight) => [id, fight.join('+'), fight] as const));
  it.each(wardenCases)('%s solo beats %s >= 70%% at its rung with shop gear', (id, _name, fight) => {
    const { level, tier } = wardenRungs[fight[0]];
    const hero = armed(createMember('h', 'Hero', id, level), tier);
    const kit = { ...startKit(id), herb: 4 };
    const trek = bossTrek('oldMine', fight[0], level);
    const stats = runMany(N, (i) =>
      arrivalFight([hero], trek, fight, kit, createRng(70000 + i), { bossHpScale: BOSS_HP_SCALE[0] }),
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.7);
  });

  // Companions are rolled per game: any class except the hero's, never repeated. So every hero is
  // tested with every other class as a single companion, and every three-class party.
  const pairs = CLASS_ORDER.flatMap((hero) => CLASS_ORDER.filter((c) => c !== hero).map((ally) => [hero, ally] as const));
  const trios = CLASS_ORDER.flatMap((a, i) =>
    CLASS_ORDER.slice(i + 1).flatMap((b, j) => CLASS_ORDER.slice(i + j + 2).map((c) => [a, b, c] as const)),
  );

  /** A grinding party has spent some supplies: half the act kit, rounded up. */
  const grindKit = (kit: Record<string, number>): Record<string, number> =>
    Object.fromEntries(Object.entries(kit).map(([k, v]) => [k, Math.ceil(v / 2)]));

  /**
   * All of a dungeon's wardens back to back, one inn trip, with the random fights on the way to each (plan §37):
   * HP, MP and consumables carry over throughout.
   */
  const gauntlet = (
    party: PartyMember[],
    fights: string[][],
    treks: EncounterTable[][],
    kit: Record<string, number>,
    seed: number,
  ): FightResult => {
    const rng = createRng(seed);
    let members = party;
    let inventory = kit;
    let rounds = 0;
    let last: FightResult | undefined;
    for (const [k, fight] of fights.entries()) {
      const arrival = walkIn(members, treks[k], inventory, rng);
      if (arrival.lost) {
        return { ...arrival.lost, rounds: rounds + arrival.lost.rounds };
      }
      const r = simulateFight(arrival.party, [...fight], arrival.inventory, rng, { bossHpScale: BOSS_HP_SCALE[1] });
      rounds += r.rounds;
      last = r;
      if (r.outcome !== 'victory') {
        break;
      }
      members = arrival.party.map((m, i) => ({ ...m, hp: Math.max(0, r.hp[i]), mp: r.mp[i] }));
      inventory = r.inventory;
    }
    return { ...(last ?? fail()), rounds };
  };

  /**
   * Plan §36: from Act II on, each act has a grind dungeon of three respawning wardens. Each warden is a party's
   * rung toward the act boss (gear a tier behind, since that tier is bought during the act), every pair can clear
   * the whole dungeon in one inn trip at the top rung, and no warden outclasses the act's bosses. Plan §37: the
   * wardens attack on sight, so the top one is sighted last and only past the first, and every fight is measured
   * after the walk in.
   */
  function grindDungeon(
    mapId: string,
    rungs: Record<string, { level: number; tier: number }>,
    actKit: Record<string, number>,
    bossIds: readonly string[],
    seed: number,
  ): void {
    const name = mapDef(mapId).name;
    const order = Object.keys(rungs).sort((a, b) => rungs[a].level - rungs[b].level);
    const fights = order.map((id) => [...(bossNpc(mapId, id).boss?.monsterIds ?? fail())]);
    const kit = grindKit(actKit);

    it(`places the three ${name} wardens`, () => {
      const placed = mapDef(mapId).npcs.flatMap((n) => (n.boss ? [n.boss.monsterIds[0]] : []));
      expect(placed.sort()).toEqual([...order].sort());
    });

    it(`sights the ${name} wardens in rung order, the top one only past the first`, () => {
      expectRising(sightSteps(mapId, order));
      const top = bossNpc(mapId, order[order.length - 1]).id;
      expect(findSightRoute(mapId, top, undefined, [bossNpc(mapId, order[0]).id])).toBeUndefined();
    });

    const pairCases = pairs.flatMap(([a, b]) => fights.map((fight) => [a, b, fight.join('+'), fight] as const));
    it.each(pairCases)(`a %s + %s pair beats ${name}'s %s >= 70%% at its rung`, (a, b, _name, fight) => {
      const { level, tier } = rungs[fight[0]];
      const trek = bossTrek(mapId, fight[0], level);
      const stats = runMany(N, (i) =>
        arrivalFight(duo(a, b, level, tier), trek, fight, kit, createRng(seed + i), { bossHpScale: BOSS_HP_SCALE[1] }),
      );
      expect(stats.winRate).toBeGreaterThanOrEqual(0.7);
    });

    const trioCases = trios.flatMap((t) => fights.map((fight) => [...t, fight.join('+'), fight] as const));
    it.each(trioCases)(`a %s + %s + %s party one level under its rung beats ${name}'s %s >= 70%%`, (a, b, c, _name, fight) => {
      const { level, tier } = rungs[fight[0]];
      const party = [a, b, c].map((cls, i) => geared(createMember(`m${i}`, `M${i}`, cls, level - 1), tier));
      const trek = bossTrek(mapId, fight[0], level - 1);
      const stats = runMany(N, (i) =>
        arrivalFight(party, trek, fight, kit, createRng(seed + 1000 + i), { bossHpScale: BOSS_HP_SCALE[2] }),
      );
      expect(stats.winRate).toBeGreaterThanOrEqual(0.7);
    });

    it.each(pairs)(`a %s + %s pair at the top rung clears the whole ${name} in one trip >= 50%%`, (a, b) => {
      const top = rungs[order[order.length - 1]];
      const treks = gauntletTreks(mapId, order, top.level);
      const stats = runMany(N / 2, (i) => gauntlet(duo(a, b, top.level, top.tier), fights, treks, kit, seed + 2000 + i));
      expect(stats.winRate).toBeGreaterThanOrEqual(0.5);
    });

    it(`keeps the ${name} wardens below the act's bosses`, () => {
      const bosses = bossIds.map((id) => MONSTERS.get(id) ?? fail());
      const wardens = fights.map((f) => MONSTERS.get(f[0]) ?? fail());
      wardens.forEach((w) => {
        expect(w.stats.hp).toBeLessThan(Math.min(...bosses.map((b) => b.stats.hp)));
        expect(w.stats.atk).toBeLessThanOrEqual(Math.max(...bosses.map((b) => b.stats.atk)));
      });
    });
  }

  it.each(pairs)('a %s hero + %s companion at level 5 beats the Goblin King >= 70%% of the time', (a, b) => {
    const party = [tier2(createMember('a', 'A', a, 5)), tier2(createMember('b', 'B', b, 5))];
    const trek = bossTrek('goblinCave', 'goblinKing', 5);
    const stats = runMany(N, (i) =>
      arrivalFight(party, trek, ['goblinKing'], { herb: 3 }, createRng(15000 + i), { bossHpScale: BOSS_HP_SCALE[1] }),
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.7);
  });

  it.each(trios)('a %s + %s + %s party at level 5 beats the Goblin King >= 70%% of the time', (...classes) => {
    const party = classes.map((c, i) => tier2(createMember(`m${i}`, `M${i}`, c, 5)));
    const trek = bossTrek('goblinCave', 'goblinKing', 5);
    const stats = runMany(N, (i) =>
      arrivalFight(party, trek, ['goblinKing'], { herb: 3 }, createRng(12000 + i), { bossHpScale: BOSS_HP_SCALE[2] }),
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.7);
  });

  // Plan 16.1: a new companion joins below the hero (companionJoinLevel) and catches up through shared XP.
  // Fights start at full HP (the simulator does not carry damage between fights).
  const catchUp = CLASS_ORDER.map((hero, i) => [hero, CLASS_ORDER[(i + 1) % CLASS_ORDER.length]] as const);
  it.each(catchUp)('a level-6 %s with a new %s companion wins Forest/Hills and the ally catches up', (hero, ally) => {
    const runs = 10;
    let wins = 0;
    let fightsToFour = 0;
    for (let run = 0; run < runs; run++) {
      const party = [tier2(createMember('h', 'H', hero, 6)), createMember('c', 'C', ally, companionJoinLevel(6))];
      const rng = createRng(21000 + run);
      let reached = 0;
      for (let fight = 0; fight < 20; fight++) {
        const ids = pickEncounter(ENCOUNTER_TABLES.get(fight % 2 ? 'hills' : 'forest') ?? fail(), rng);
        const result = simulateFight(party, ids, { herb: 3 }, rng);
        if (result.outcome !== 'victory') {
          continue;
        }
        wins++;
        const xp = ids.reduce((sum, id) => sum + (MONSTERS.get(id)?.xp ?? 0), 0);
        const survivors = party.filter((_, k) => result.alive[k]);
        survivors.forEach((m) => grantXp(m, Math.ceil(xp / survivors.length)));
        if (!reached && party[1].level >= 4) {
          reached = fight + 1;
        }
      }
      fightsToFour += reached || 99;
    }
    expect(wins / (runs * 20)).toBeGreaterThanOrEqual(0.9);
    expect(fightsToFour / runs).toBeLessThanOrEqual(15);
  });

  // --- Act II: the Southlands (plan 17) --------------------------------------------------------
  const actTwoKit = { herb: 8, tonic: 2 };

  it('places both shrine bosses in their shrines', () => {
    const bosses = ['sunShrine', 'mireShrine'].flatMap((id) => mapDef(id).npcs).flatMap((n) => (n.boss ? [n.boss.monsterIds[0]] : []));
    expect(bosses.sort()).toEqual([...ACT_TWO_BOSS_IDS].sort());
  });

  // Plan 4.1/4.4c: from Act II on a party is expected, so the floor is a hero with one companion a level
  // behind (the smallest party), against full-size encounters. Solo is not a target here.
  const southPairs = pairs.flatMap(([a, b]) => ['desert', 'marsh', 'shrine'].map((t) => [a, b, t] as const));
  it.each(southPairs)('a level-10 %s + level-9 %s win >= 90%% of %s fights with tier-3 gear', (a, b, tableId) => {
    const table = ENCOUNTER_TABLES.get(tableId) ?? fail();
    const party = duo(a, b, 10, 3);
    const stats = runMany(N, (i) => simulateFight(party, pickEncounter(table, createRng(31000 + i), MAX_PARTY), actTwoKit, createRng(32000 + i)));
    expect(stats.winRate).toBeGreaterThanOrEqual(0.9);
  });

  const shrineFights = ['sunShrine', 'mireShrine'].flatMap((mapId) =>
    mapDef(mapId).npcs.flatMap((n) => (n.boss ? [[mapId, n.boss.monsterIds] as const] : [])),
  );
  const shrinePairs = pairs.flatMap(([a, b]) => shrineFights.map(([mapId, fight]) => [a, b, fight.join('+'), mapId, fight] as const));
  it.each(shrinePairs)('a level-11 %s + level-10 %s beat %s >= 70%% with tier-3 gear', (a, b, _name, mapId, fight) => {
    const trek = bossTrek(mapId, fight[0], 11);
    const stats = runMany(N, (i) =>
      arrivalFight(duo(a, b, 11, 3), trek, fight, actTwoKit, createRng(33000 + i), { bossHpScale: BOSS_HP_SCALE[1] }),
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.7);
  });

  const shrineTrios = trios.flatMap((t) => shrineFights.map(([mapId, fight]) => [...t, fight.join('+'), mapId, fight] as const));
  it.each(shrineTrios)('a %s + %s + %s party at level 10 beats %s >= 70%%', (a, b, c, _name, mapId, fight) => {
    const party = [a, b, c].map((cls, i) => geared(createMember(`m${i}`, `M${i}`, cls, 10), 3));
    const trek = bossTrek(mapId, fight[0], 10);
    const stats = runMany(N, (i) =>
      arrivalFight(party, trek, fight, { herb: 4 }, createRng(34000 + i), { bossHpScale: BOSS_HP_SCALE[2] }),
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.7);
  });

  grindDungeon(
    'sunkenCistern',
    { scorpionQueen: { level: 8, tier: 2 }, cisternWorm: { level: 9, tier: 2 }, drownedWraith: { level: 10, tier: 3 } },
    actTwoKit,
    ACT_TWO_BOSS_IDS,
    35000,
  );

  it('desert fights from level 8 to 11 pay for a tier-3 weapon (plan 17)', () => {
    const table = ENCOUNTER_TABLES.get('desert') ?? fail();
    const rng = createRng(78);
    let xp = 0;
    let gold = 0;
    const fights = 2000;
    for (let i = 0; i < fights; i++) {
      pickEncounter(table, rng, SOLO_MAX_ENEMIES).forEach((id) => {
        const m = MONSTERS.get(id) ?? fail();
        xp += m.xp;
        gold += m.gold * (m.goldChance ?? DEFAULT_GOLD_CHANCE);
      });
    }
    const fightsNeeded = (totalXpForLevel(11) - totalXpForLevel(8)) / (xp / fights);
    const tier3Price = Math.max(...[...WEAPONS.values()].filter((w) => w.tier === 3).map((w) => w.price));
    expect(fightsNeeded * (gold / fights)).toBeGreaterThanOrEqual(tier3Price);
  });

  // --- Act III: the Frost Peaks (plan 19) ------------------------------------------------------
  const actThreeKit = { herb: 8, tonic: 2, potion: 2 };

  it('places the Wyvern Matriarch in the Wyvern Roost', () => {
    const bosses = mapDef('wyvernRoost').npcs.flatMap((n) => (n.boss ? [n.boss.monsterIds[0]] : []));
    expect(bosses).toEqual([...ACT_THREE_BOSS_IDS]);
  });

  const northPairs = pairs.flatMap(([a, b]) => ['snowfield', 'pines', 'roost'].map((t) => [a, b, t] as const));
  it.each(northPairs)('a level-13 %s + level-12 %s win >= 90%% of %s fights with tier-4 gear', (a, b, tableId) => {
    const table = ENCOUNTER_TABLES.get(tableId) ?? fail();
    const party = duo(a, b, 13, 4);
    const stats = runMany(N, (i) => simulateFight(party, pickEncounter(table, createRng(41000 + i), MAX_PARTY), actThreeKit, createRng(42000 + i)));
    expect(stats.winRate).toBeGreaterThanOrEqual(0.9);
  });

  const roostFights = mapDef('wyvernRoost').npcs.flatMap((n) => (n.boss ? [n.boss.monsterIds] : []));
  const roostPairs = pairs.flatMap(([a, b]) => roostFights.map((fight) => [a, b, fight.join('+'), fight] as const));
  it.each(roostPairs)('a level-14 %s + level-13 %s beat %s >= 70%% with tier-4 gear', (a, b, _name, fight) => {
    const trek = bossTrek('wyvernRoost', fight[0], 14);
    const stats = runMany(N, (i) =>
      arrivalFight(duo(a, b, 14, 4), trek, fight, actThreeKit, createRng(43000 + i), { bossHpScale: BOSS_HP_SCALE[1] }),
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.7);
  });

  const roostTrios = trios.flatMap((t) => roostFights.map((fight) => [...t, fight.join('+'), fight] as const));
  it.each(roostTrios)('a %s + %s + %s party at level 13 beats %s >= 70%%', (a, b, c, _name, fight) => {
    const party = [a, b, c].map((cls, i) => geared(createMember(`m${i}`, `M${i}`, cls, 13), 4));
    const trek = bossTrek('wyvernRoost', fight[0], 13);
    const stats = runMany(N, (i) =>
      arrivalFight(party, trek, fight, { herb: 4, potion: 2 }, createRng(44000 + i), { bossHpScale: BOSS_HP_SCALE[2] }),
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.7);
  });

  grindDungeon(
    'frozenQuarry',
    { yetiMatron: { level: 11, tier: 3 }, frostHexer: { level: 12, tier: 3 }, trollQuarrymaster: { level: 13, tier: 4 } },
    actThreeKit,
    ACT_THREE_BOSS_IDS,
    45000,
  );

  it('snowfield fights from level 11 to 14 pay for a tier-4 weapon (plan 19)', () => {
    const table = ENCOUNTER_TABLES.get('snowfield') ?? fail();
    const rng = createRng(79);
    let xp = 0;
    let gold = 0;
    const fights = 2000;
    for (let i = 0; i < fights; i++) {
      pickEncounter(table, rng, SOLO_MAX_ENEMIES).forEach((id) => {
        const m = MONSTERS.get(id) ?? fail();
        xp += m.xp;
        gold += m.gold * (m.goldChance ?? DEFAULT_GOLD_CHANCE);
      });
    }
    const fightsNeeded = (totalXpForLevel(14) - totalXpForLevel(11)) / (xp / fights);
    const tier4Price = Math.max(...[...WEAPONS.values()].filter((w) => w.tier === 4).map((w) => w.price));
    expect(fightsNeeded * (gold / fights)).toBeGreaterThanOrEqual(tier4Price);
  });

  // --- Finale: the Ember Mountains and Vyrmorth (plan 21) ---------------------------------------
  const finaleKit = { herb: 8, tonic: 3, potion: 3 };

  it('places both of Vyrmorth\'s forms in his lair', () => {
    const boss = mapDef('vyrmorthLair').npcs.find((n) => n.boss)?.boss ?? fail();
    expect([boss.monsterIds[0], boss.phaseTwo?.monsterIds[0]]).toEqual([...FINALE_BOSS_IDS]);
  });

  const emberPairs = pairs.flatMap(([a, b]) => ['ashfield', 'cinderwood', 'lair'].map((t) => [a, b, t] as const));
  it.each(emberPairs)('a level-16 %s + level-15 %s win >= 90%% of %s fights with tier-5 gear', (a, b, tableId) => {
    const table = ENCOUNTER_TABLES.get(tableId) ?? fail();
    const party = duo(a, b, 16, 5);
    const stats = runMany(N, (i) => simulateFight(party, pickEncounter(table, createRng(61000 + i), MAX_PARTY), finaleKit, createRng(62000 + i)));
    expect(stats.winRate).toBeGreaterThanOrEqual(0.9);
  });

  /**
   * The walk in, then Vyrmorth, then with no rest Vyrmorth Unbound: HP, MP and consumables carry over throughout.
   */
  const vyrmorth = (party: PartyMember[], kit: Record<string, number>, seed: number, scale: number): FightResult => {
    const boss = mapDef('vyrmorthLair').npcs.find((n) => n.boss)?.boss ?? fail();
    const rng = createRng(seed);
    const level = Math.max(...party.map((m) => m.level));
    const first = arrivalFight(party, bossTrek('vyrmorthLair', 'vyrmorth', level), boss.monsterIds, kit, rng, {
      bossHpScale: scale,
    });
    if (first.outcome !== 'victory') {
      return first;
    }
    const worn = party.map((m, i) => ({ ...m, hp: Math.max(0, first.hp[i]), mp: first.mp[i] }));
    const second = simulateFight(worn, [...(boss.phaseTwo?.monsterIds ?? [])], first.inventory, rng, { bossHpScale: scale });
    return { ...second, rounds: first.rounds + second.rounds };
  };

  it.each(pairs)('a level-18 %s + level-17 %s beat both of Vyrmorth\'s forms >= 70%% with tier-5 gear', (a, b) => {
    const stats = runMany(N, (i) => vyrmorth(duo(a, b, 18, 5), finaleKit, 63000 + i, BOSS_HP_SCALE[1]));
    expect(stats.winRate).toBeGreaterThanOrEqual(0.7);
  });

  it.each(trios)('a %s + %s + %s party at level 17 beats both of Vyrmorth\'s forms >= 70%%', (a, b, c) => {
    const party = [a, b, c].map((cls, i) => geared(createMember(`m${i}`, `M${i}`, cls, 17), 5));
    const stats = runMany(N, (i) => vyrmorth(party, { herb: 6, tonic: 2, potion: 3 }, 64000 + i, BOSS_HP_SCALE[2]));
    expect(stats.winRate).toBeGreaterThanOrEqual(0.7);
  });

  grindDungeon(
    'slagPits',
    { cultistOverseer: { level: 14, tier: 4 }, slagGolem: { level: 15, tier: 4 }, cinderDrake: { level: 16, tier: 5 } },
    finaleKit,
    FINALE_BOSS_IDS,
    65000,
  );

  it('ashfield fights from level 14 to 17 pay for a tier-5 weapon (plan 21)', () => {
    const table = ENCOUNTER_TABLES.get('ashfield') ?? fail();
    const rng = createRng(80);
    let xp = 0;
    let gold = 0;
    const fights = 2000;
    for (let i = 0; i < fights; i++) {
      pickEncounter(table, rng, SOLO_MAX_ENEMIES).forEach((id) => {
        const m = MONSTERS.get(id) ?? fail();
        xp += m.xp;
        gold += m.gold * (m.goldChance ?? DEFAULT_GOLD_CHANCE);
      });
    }
    const fightsNeeded = (totalXpForLevel(17) - totalXpForLevel(14)) / (xp / fights);
    const tier5Price = Math.max(...[...WEAPONS.values()].filter((w) => w.tier === 5).map((w) => w.price));
    expect(fightsNeeded * (gold / fights)).toBeGreaterThanOrEqual(tier5Price);
  });
});

// --- The Wizard playing alone (plan 4.4b) -------------------------------------------------------
// The Wizard is the frailest class (lowest HP/DEF, no healing, no field MP regen), so it is the
// second reference case next to the Cleric: every checkpoint of the solo path, one level under it,
// and how many fights in a row it lasts before it must rest.
interface Stage {
  name: string;
  level: number;
  tier: number;
  /** Consumables carried; undefined = the class's starting kit. */
  kit?: Record<string, number>;
  fight(rng: ReturnType<typeof createRng>): string[];
  bossHpScale?: number;
  /** Plan §37: random fights on the way in to a boss, which attacks on sight. */
  trek?: EncounterTable[];
}

const fromTable = (id: string): ((rng: ReturnType<typeof createRng>) => string[]) => {
  const t = ENCOUNTER_TABLES.get(id) ?? fail();
  return (rng) => pickEncounter(t, rng, SOLO_MAX_ENEMIES);
};
const tableStage = (id: string, level: number, tier: number, kit?: Record<string, number>): Stage => ({
  name: id,
  level,
  tier,
  kit,
  fight: fromTable(id),
});
/** Every boss fight placed on the given maps (minus excluded leads), as solo stages reached on foot. */
const bossStages = (maps: string[], level: number, tier: number, kit: Record<string, number>, skip: string[] = []): Stage[] =>
  maps.flatMap((mapId) =>
    mapDef(mapId)
      .npcs.flatMap((n) => (n.boss && !skip.includes(n.boss.monsterIds[0]) ? [n] : []))
      .map((n) => {
        const ids = n.boss?.monsterIds ?? fail();
        const trek = trekTables(sightRoute(mapId, n.id), level);
        return { name: ids.join('+'), level, tier, kit, fight: () => [...ids], bossHpScale: BOSS_HP_SCALE[0], trek };
      }),
  );
const soloKitI = { herb: 6, tonic: 1 };
const soloKitII = { herb: 8, tonic: 2 };
const soloKitIII = { herb: 8, tonic: 2, potion: 2 };
/** Plan 4.4b: everything the hero must clear alone, up to the companion mini-bosses (their recruit quests). */
const STAGES: Stage[] = [
  tableStage('greenwood', 3, 1),
  tableStage('forest', 4, 1, soloKitI),
  tableStage('hills', 5, 2, soloKitI),
  tableStage('cave', 6, 2, soloKitI),
  {
    name: 'goblinKing',
    level: 6,
    tier: 2,
    kit: soloKitI,
    fight: () => ['goblinKing'],
    bossHpScale: BOSS_HP_SCALE[0],
    trek: bossTrek('goblinCave', 'goblinKing', 6),
  },
  ...bossStages(['overworld', 'thornwick', 'goblinCave', 'wolfDen'], 7, 2, soloKitI, ['goblinKing']),
];
/** Plan 4.4c: post-unlock content, reported for a hero who stays alone but not asserted (a party is expected). */
const POST_UNLOCK: Stage[] = [
  ...['desert', 'marsh', 'shrine'].map((id) => tableStage(id, 10, 3, soloKitII)),
  ...bossStages(['sunkenCistern'], 10, 3, soloKitII),
  ...bossStages(['sunShrine', 'mireShrine'], 12, 3, soloKitII),
  ...['snowfield', 'pines', 'roost'].map((id) => tableStage(id, 13, 4, soloKitIII)),
  ...bossStages(['frozenQuarry'], 13, 4, soloKitIII),
  ...bossStages(['wyvernRoost'], 15, 4, soloKitIII),
  ...['ashfield', 'cinderwood', 'lair'].map((id) => tableStage(id, 16, 5, soloKitIII)),
  ...bossStages(['slagPits'], 16, 5, soloKitIII),
  ...bossStages(['vyrmorthLair'], 18, 5, soloKitIII),
];

function hero(classId: ClassId, level: number, tier: number): PartyMember {
  const m = createMember('h', 'Hero', classId, level);
  return tier === 1 ? m : tier === 2 ? tier2(m) : geared(m, tier);
}

function stageStats(classId: ClassId, stage: Stage, levelOffset = 0): { winRate: number; avgRounds: number } {
  const m = hero(classId, stage.level + levelOffset, stage.tier);
  const kit = stage.kit ?? startKit(classId);
  return runMany(N, (i) =>
    arrivalFight([m], stage.trek ?? [], stage.fight(createRng(51000 + i)), kit, createRng(52000 + i), {
      bossHpScale: stage.bossHpScale,
    }),
  );
}

/** Fights won in a row (no inn, field regen between fights) before the first loss, capped at `cap`. */
function streak(classId: ClassId, stage: Stage, seed: number, cap = 25): number {
  const m = hero(classId, stage.level, stage.tier);
  const rng = createRng(seed);
  let inv = { ...(stage.kit ?? startKit(classId)) };
  let steps = 0;
  for (let won = 0; won < cap; won++) {
    const r = simulateFight([m], stage.fight(rng), inv, rng, { bossHpScale: stage.bossHpScale });
    if (r.outcome !== 'victory') {
      return won;
    }
    m.hp = r.hp[0];
    m.mp = r.mp[0];
    inv = r.inventory;
    fieldTopUp(m, inv);
    // About 16 steps between random encounters (4 grace steps + ~1/12 per step after).
    for (let s = 0; s < 16; s++) {
      applyFieldRegen(m, ++steps, true);
    }
  }
  return cap;
}

function avgStreak(classId: ClassId, stage: Stage): number {
  const runs = 60;
  let total = 0;
  for (let r = 0; r < runs; r++) {
    total += streak(classId, stage, 61000 + r);
  }
  return total / runs;
}

describe('Jouster Quest: solo play before companions unlock (plan 4.4b)', () => {
  const pct = (x: number): string => `${(x * 100).toFixed(0)}%`;
  const report: string[] = [];
  afterAll(() => {
    if (process.env['BALANCE_REPORT']) {
       
      console.log(report.join('\n'));
    }
  });

  // The Wizard is the frailest class (lowest HP/DEF, no healing, no field MP regen): the solo reference case.
  it.each(STAGES.map((s) => [s.name, s.level, s] as const))('the Wizard wins %s at level %i >= 70%%, and >= 50%% one level under', (_n, _l, stage) => {
    const at = stageStats('wizard', stage);
    const under = stageStats('wizard', stage, -1);
    const warrior = stageStats('warrior', stage);
    report.push(
      `${stage.name.padEnd(24)} L${stage.level} wizard ${pct(at.winRate)} ${at.avgRounds.toFixed(1)}r, L-1 ${pct(under.winRate)}; ` +
        `warrior ${pct(warrior.winRate)} ${warrior.avgRounds.toFixed(1)}r`,
    );
    expect(at.winRate).toBeGreaterThanOrEqual(0.7);
    expect(under.winRate).toBeGreaterThanOrEqual(0.5);
    // Glass cannon: never slower than the Warrior by more than 1.5x.
    expect(at.avgRounds).toBeLessThanOrEqual(warrior.avgRounds * 1.5);
  });

  // Enough staying power to cross a pre-unlock area between inns, for every class.
  const areas = STAGES.filter((s) => !s.bossHpScale);
  const streakCases = areas.flatMap((s) => CLASS_ORDER.map((c) => [c, s.name, s] as const));
  it.each(streakCases)('a solo %s wins %s fights in a row on items and field regen alone', (classId, _n, stage) => {
    const avg = avgStreak(classId, stage);
    report.push(`${stage.name.padEnd(10)} ${classId.padEnd(8)} streak ${avg.toFixed(1)} fights (cap 25)`);
    expect(avg).toBeGreaterThanOrEqual(stage.level <= 3 ? 10 : 4);
  });

  // Plan 4.4c: after the unlock a lone hero is expected to struggle; recorded for the report only.
  it('reports how a hero who stays alone fares after the unlock (not asserted)', () => {
    if (!process.env['BALANCE_REPORT']) {
      return;
    }
    POST_UNLOCK.forEach((stage) => {
      const row = CLASS_ORDER.map((c) => `${c} ${pct(stageStats(c, stage).winRate)}`).join(', ');
      report.push(`post-unlock solo ${stage.name.padEnd(22)} L${stage.level}: ${row}`);
    });
    expect(POST_UNLOCK.length).toBeGreaterThan(0);
  });
});
function fail(): never {
  throw new Error('missing data');
}
