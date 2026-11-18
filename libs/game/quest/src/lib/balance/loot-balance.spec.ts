import { createRng, pickEncounter, totalXpForLevel } from '@jouster/game/engine';
import { CLASS_ORDER } from '../data/classes';
import { ACT_THREE_BOSS_IDS, ACT_TWO_BOSS_IDS, BOSS_HP_SCALE, ENCOUNTER_TABLES, MONSTERS, SOLO_MAX_ENEMIES } from '../data/monsters';
import { ITEMS, WEAPONS } from '../data/equipment';
import { GEAR_DROP_CHANCE, lootSource } from '../data/rarity';
import { mapDef } from '../data/maps';
import { DEFAULT_GOLD_CHANCE, PartyMember, createMember } from '../state/party';
import { MAX_PARTY, STARTING_GOLD } from '../state/game-state';
import { gearSellPrice, rollLoot } from '../state/loot';
import { FightResult, runMany, simulateFight } from './simulator';
import { duo, geared, tier2 } from './kits';
import { LOOT_SLOTS, LootStep, expectedHaul, expectedRolls, withExpectedLoot } from './loot-mode';

// Plan 33.8: drops add power and gold, and the 4.6 targets were tuned without them. These checks re-run the key
// checkpoints with the loot a player has probably found by then (see `withExpectedLoot`), and check that selling
// drops doesn't make the next shop weapon affordable much earlier.

const N = 200;
const S = SOLO_MAX_ENEMIES;

/** The expected path (plan 4.4b/4.4c): random fights level to level, then each boss once. */
const TO_KING: LootStep[] = [
  { table: 'greenwood', fromLevel: 1, toLevel: 3, maxEnemies: S },
  { table: 'forest', fromLevel: 3, toLevel: 4, maxEnemies: S },
  { table: 'hills', fromLevel: 4, toLevel: 5, maxEnemies: S },
  { table: 'cave', fromLevel: 5, toLevel: 6, maxEnemies: S },
];
const TO_MINI: LootStep[] = [...TO_KING, { boss: ['goblinKing'], partySize: 1 }, { table: 'cave', fromLevel: 6, toLevel: 7, maxEnemies: S }];
const TO_SOUTH: LootStep[] = [
  ...TO_MINI,
  ...['alphaWolf', 'giantToad', 'boneCaptain', 'goblinChief'].map((id) => ({ boss: [id], partySize: 1 })),
  { table: 'desert', fromLevel: 7, toLevel: 9, maxEnemies: MAX_PARTY },
  { table: 'marsh', fromLevel: 9, toLevel: 10, maxEnemies: MAX_PARTY },
];
const TO_SHRINE: LootStep[] = [...TO_SOUTH, { table: 'shrine', fromLevel: 10, toLevel: 11, maxEnemies: MAX_PARTY }];
const TO_NORTH: LootStep[] = [
  ...TO_SHRINE,
  ...ACT_TWO_BOSS_IDS.map((id) => ({ boss: [id], partySize: 2 })),
  { table: 'snowfield', fromLevel: 11, toLevel: 12, maxEnemies: MAX_PARTY },
  { table: 'pines', fromLevel: 12, toLevel: 13, maxEnemies: MAX_PARTY },
];
const TO_ROOST: LootStep[] = [...TO_NORTH, { table: 'roost', fromLevel: 13, toLevel: 14, maxEnemies: MAX_PARTY }];
const TO_EMBER: LootStep[] = [
  ...TO_ROOST,
  ...ACT_THREE_BOSS_IDS.map((id) => ({ boss: [id], partySize: 2 })),
  { table: 'ashfield', fromLevel: 14, toLevel: 15, maxEnemies: MAX_PARTY },
  { table: 'cinderwood', fromLevel: 15, toLevel: 16, maxEnemies: MAX_PARTY },
];
const TO_LAIR: LootStep[] = [...TO_EMBER, { table: 'lair', fromLevel: 16, toLevel: 18, maxEnemies: MAX_PARTY }];

const looted = (steps: LootStep[]) => (m: PartyMember): PartyMember => withExpectedLoot(m, expectedHaul(steps, m.classId));
const bossFights = (map: string): string[][] => mapDef(map).npcs.flatMap((n) => (n.boss ? [[...n.boss.monsterIds]] : []));

/** Loot may shorten an act boss fight, but not by more than a third, and it must last at least 4 rounds. */
function expectStillAFight(plain: { avgRounds: number }, loot: { winRate: number; avgRounds: number }, minWin: number): void {
  expect(loot.winRate).toBeGreaterThanOrEqual(minWin);
  expect(loot.avgRounds).toBeGreaterThanOrEqual(Math.max(4, (plain.avgRounds * 2) / 3));
}

const pairs = CLASS_ORDER.flatMap((hero) => CLASS_ORDER.filter((c) => c !== hero).map((ally) => [hero, ally] as const));
/** One companion per hero (the next class), to keep the slower checks quick. */
const somePairs = CLASS_ORDER.map((hero, i) => [hero, CLASS_ORDER[(i + 1) % CLASS_ORDER.length]] as const);

describe('Jouster Quest balance with expected loot (plan 33.8)', () => {
  it.each(CLASS_ORDER)('%s expects average loot, never a jackpot: at most Rare bonuses in any slot by the finale', (id) => {
    const early = expectedHaul(TO_KING, id);
    const late = expectedHaul(TO_LAIR, id);
    LOOT_SLOTS.forEach((slot) => {
      expect(expectedRolls(late, slot)).toBeLessThanOrEqual(2);
      expect(expectedRolls(late, slot)).toBeGreaterThanOrEqual(expectedRolls(early, slot));
    });
    expect(LOOT_SLOTS.some((slot) => expectedRolls(late, slot) >= 1)).toBe(true);
  });

  it.each(CLASS_ORDER)('%s solo vs the Goblin King at level 6 with full tier-2 gear and loot: still a fight', (id) => {
    const fight = (m: PartyMember): ReturnType<typeof runMany> =>
      runMany(N, (i) => simulateFight([m], ['goblinKing'], { herb: 6, tonic: 1 }, createRng(9000 + i), { bossHpScale: BOSS_HP_SCALE[0] }));
    const m = geared(createMember('h', 'Hero', id, 6));
    expectStillAFight(fight(m), fight(looted(TO_KING)(m)), 0.6);
  });

  const miniFights = ['overworld', 'goblinCave', 'wolfDen'].flatMap(bossFights).filter((f) => !f.includes('goblinKing'));
  const miniCases = CLASS_ORDER.flatMap((id) => miniFights.map((fight) => [id, fight.join('+'), fight] as const));
  // Side-quest mini-bosses already fall in 4-6 rounds without loot, so only the 4.6 win-rate target applies. With
  // this generous model a Wizard's fights shrink from about 4 rounds to 2 (MAG on every slot); see plan 33.8.
  it.each(miniCases)('%s solo still beats %s >= 60%% at level 7 with tier-2 weapon and loot', (id, _name, fight) => {
    const m = looted(TO_MINI)(tier2(createMember('h', 'Hero', id, 7)));
    const stats = runMany(N, (i) => simulateFight([m], [...fight], { herb: 6, tonic: 1 }, createRng(11000 + i), { bossHpScale: BOSS_HP_SCALE[0] }));
    expect(stats.winRate).toBeGreaterThanOrEqual(0.6);
  });

  const areaCases: [string, LootStep[], number, number][] = [
    ...['desert', 'marsh', 'shrine'].map((t) => [t, TO_SOUTH, 10, 3] as [string, LootStep[], number, number]),
    ...['snowfield', 'pines', 'roost'].map((t) => [t, TO_NORTH, 13, 4] as [string, LootStep[], number, number]),
    ...['ashfield', 'cinderwood', 'lair'].map((t) => [t, TO_EMBER, 16, 5] as [string, LootStep[], number, number]),
  ];
  const areaPairs = somePairs.flatMap(([a, b]) => areaCases.map(([t, steps, level, tier]) => [a, b, t, steps, level, tier] as const));
  it.each(areaPairs)('a %s + %s pair with loot still wins >= 90%% of %s fights', (a, b, tableId, steps, level, tier) => {
    const table = ENCOUNTER_TABLES.get(tableId) ?? fail();
    const party = duo(a, b, level, tier).map(looted(steps));
    const kit = { herb: 8, tonic: 2, potion: 2 };
    const stats = runMany(N, (i) => simulateFight(party, pickEncounter(table, createRng(31000 + i), MAX_PARTY), kit, createRng(32000 + i)));
    expect(stats.winRate).toBeGreaterThanOrEqual(0.9);
  });

  /** Both of Vyrmorth's forms with no rest between them, as in the main balance spec. */
  const vyrmorth = (party: PartyMember[], seed: number): FightResult => {
    const [first, second] = [bossFights('vyrmorthLair')[0], [...(mapDef('vyrmorthLair').npcs.find((n) => n.boss)?.boss?.phaseTwo?.monsterIds ?? [])]];
    const rng = createRng(seed);
    const kit = { herb: 8, tonic: 2, potion: 2 };
    const one = simulateFight(party, first, kit, rng, { bossHpScale: BOSS_HP_SCALE[1] });
    if (one.outcome !== 'victory') {
      return one;
    }
    const worn = party.map((m, i) => ({ ...m, hp: one.hp[i], mp: one.mp[i] }));
    const two = simulateFight(worn, second, one.inventory, rng, { bossHpScale: BOSS_HP_SCALE[1] });
    return { ...two, rounds: one.rounds + two.rounds };
  };
  type BossCase = readonly [string, LootStep[], number, number, (party: PartyMember[], seed: number) => FightResult];
  const bossCases: BossCase[] = [
    ...[...bossFights('sunShrine'), ...bossFights('mireShrine')].map(
      (fight) =>
        [fight.join('+'), TO_SHRINE, 11, 3, (party: PartyMember[], seed: number) =>
          simulateFight(party, fight, { herb: 8, tonic: 2 }, createRng(seed), { bossHpScale: BOSS_HP_SCALE[1] })] as const,
    ),
    ...bossFights('wyvernRoost').map(
      (fight) =>
        [fight.join('+'), TO_ROOST, 14, 4, (party: PartyMember[], seed: number) =>
          simulateFight(party, fight, { herb: 8, tonic: 2, potion: 2 }, createRng(seed), { bossHpScale: BOSS_HP_SCALE[1] })] as const,
    ),
    ['both forms of Vyrmorth', TO_LAIR, 18, 5, vyrmorth],
  ];
  const bossPairs = pairs.flatMap(([a, b]) => bossCases.map(([name, steps, level, tier, run]) => [a, b, name, steps, level, tier, run] as const));
  it.each(bossPairs)('a %s + %s pair with loot vs %s: still a fight', (a, b, _name, steps, level, tier, run) => {
    const party = duo(a, b, level, tier);
    const stats = (p: PartyMember[]): ReturnType<typeof runMany> => runMany(N, (i) => run(p, 33000 + i));
    expectStillAFight(stats(party), stats(party.map(looted(steps))), 0.7);
  });
});

// --- Economy with drop income (plan 15.2 / 33.8) ------------------------------------------------

/** Average gold a shop pays for one piece this monster drops, over seeded rolls for every class. */
function avgSale(monsterId: string): number {
  const rng = createRng(3308);
  let total = 0;
  let n = 0;
  for (const cls of CLASS_ORDER) {
    for (let i = 0; i < 200; i++) {
      total += gearSellPrice(rollLoot(rng, monsterId, [cls], {}));
      n++;
    }
  }
  return total / n;
}

/** XP, gold and expected gear sale gold per fight in an area. */
function areaIncome(tableId: string, seed: number): { xp: number; gold: number; sales: number } {
  const table = ENCOUNTER_TABLES.get(tableId) ?? fail();
  const rng = createRng(seed);
  const sale = new Map<string, number>();
  let xp = 0;
  let gold = 0;
  let sales = 0;
  const fights = 2000;
  for (let i = 0; i < fights; i++) {
    pickEncounter(table, rng, S).forEach((id) => {
      const m = MONSTERS.get(id) ?? fail();
      xp += m.xp;
      gold += m.gold * (m.goldChance ?? (m.boss ? 1 : DEFAULT_GOLD_CHANCE));
      if (!sale.has(id)) {
        sale.set(id, avgSale(id));
      }
      sales += (m.gearChance ?? GEAR_DROP_CHANCE[lootSource(id)]) * (sale.get(id) ?? 0);
    });
  }
  return { xp: xp / fights, gold: gold / fights, sales: sales / fights };
}

/** Level (with a fraction) a hero has reached after `xp` total XP. */
function levelAt(xp: number): number {
  let level = 1;
  while (totalXpForLevel(level + 1) <= xp) {
    level++;
  }
  return level + (xp - totalXpForLevel(level)) / (totalXpForLevel(level + 1) - totalXpForLevel(level));
}

/** Level at which a solo hero fighting in `tableId` from `fromLevel` with `startGold` can afford `price`. */
function affordLevel(tableId: string, seed: number, fromLevel: number, startGold: number, price: number, sell: boolean): number {
  const income = areaIncome(tableId, seed);
  const perFight = income.gold + (sell ? income.sales : 0);
  const fights = Math.max(0, price - startGold) / perFight;
  return levelAt(totalXpForLevel(fromLevel) + fights * income.xp);
}

const weaponPrice = (tier: number): number => Math.max(...[...WEAPONS.values()].filter((w) => w.tier === tier).map((w) => w.price));

describe('Jouster Quest economy with drop income (plan 33.8)', () => {
  const herbs = 10 * (ITEMS.get('herb')?.price ?? 0);
  const cases: [string, number, number, number, number][] = [
    // area, seed, from level, starting gold, price
    ['greenwood', 77, 1, STARTING_GOLD, weaponPrice(2) + herbs],
    ['desert', 78, 8, 0, weaponPrice(3)],
    ['snowfield', 79, 11, 0, weaponPrice(4)],
    ['ashfield', 80, 14, 0, weaponPrice(5)],
  ];
  it.each(cases)('selling %s drops buys the next weapon no more than one level earlier', (tableId, seed, from, startGold, price) => {
    const without = affordLevel(tableId, seed, from, startGold, price, false);
    const withSales = affordLevel(tableId, seed, from, startGold, price, true);
    expect(withSales).toBeLessThanOrEqual(without);
    expect(without - withSales).toBeLessThanOrEqual(1);
  });

  it('drop income is real but stays below fight gold in Greenwood', () => {
    const income = areaIncome('greenwood', 77);
    expect(income.sales).toBeGreaterThan(0);
    expect(income.sales).toBeLessThan(income.gold);
  });
});

function fail(): never {
  throw new Error('missing data');
}
