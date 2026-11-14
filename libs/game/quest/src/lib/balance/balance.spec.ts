import { ClassId, createRng, statBudget, totalXpForLevel } from '@jouster/game/engine';
import { CLASS_ORDER, classDef } from '../data/classes';
import { ACT_THREE_BOSS_IDS, ACT_TWO_BOSS_IDS, ENCOUNTER_TABLES, BOSS_HP_SCALE, SOLO_MAX_ENEMIES } from '../data/monsters';
import { ITEMS, WEAPONS } from '../data/equipment';
import { pickEncounter } from '@jouster/game/engine';
import { DEFAULT_GOLD_CHANCE, PartyMember, applyFieldRegen, createMember, grantXp, memberToCombatant } from '../state/party';
import { MAX_PARTY, STARTING_GOLD, companionJoinLevel } from '../state/game-state';
import { ABILITIES } from '../data/abilities';
import { expectedDamage, runMany, simulateFight } from './simulator';
import { MONSTERS } from '../data/monsters';
import { monstersToCombatants } from '../state/party';
import { mapDef } from '../data/maps';
import { GEAR, gearUsableBy } from '../data/gear';

const N = 400;

function startKit(classId: ClassId): Record<string, number> {
  return { herb: 3 + classDef(classId).bonusHerbs };
}

function armed(m: PartyMember, tier: number): PartyMember {
  const family = classDef(m.classId).weaponFamily;
  const w = [...WEAPONS.values()].find((x) => x.family === family && x.tier === tier);
  return { ...m, weaponId: w?.id ?? m.weaponId };
}

function tier2(m: PartyMember): PartyMember {
  return armed(m, 2);
}

/** Weapon of `tier` plus the best armor, shield and accessory of up to `tier` this class can wear (plan 15.4). */
function geared(m: PartyMember, tier = 2): PartyMember {
  const best = (slot: string): string | undefined =>
    [...GEAR.values()]
      .filter((g) => g.slot === slot && g.tier <= tier && gearUsableBy(g, m.classId))
      .sort((x, y) => y.price - x.price)[0]?.id;
  return { ...armed(m, tier), armorId: best('armor'), shieldId: best('shield'), accessoryId: best('accessory') };
}

/** The smallest post-unlock party: the hero at `level` and one companion a level behind, both fully geared. */
function duo(hero: ClassId, ally: ClassId, level: number, tier: number): PartyMember[] {
  return [geared(createMember('a', 'A', hero, level), tier), geared(createMember('b', 'B', ally, level - 1), tier)];
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

  const shrineFights = ['sunShrine', 'mireShrine'].flatMap((id) => mapDef(id).npcs).flatMap((n) => (n.boss ? [n.boss.monsterIds] : []));
  const shrinePairs = pairs.flatMap(([a, b]) => shrineFights.map((fight) => [a, b, fight.join('+'), fight] as const));
  it.each(shrinePairs)('a level-11 %s + level-10 %s beat %s >= 70%% with tier-3 gear', (a, b, _name, fight) => {
    const stats = runMany(N, (i) =>
      simulateFight(duo(a, b, 11, 3), [...fight], actTwoKit, createRng(33000 + i), { bossHpScale: BOSS_HP_SCALE[1] }),
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.7);
  });

  const shrineTrios = trios.flatMap((t) => shrineFights.map((fight) => [...t, fight.join('+'), fight] as const));
  it.each(shrineTrios)('a %s + %s + %s party at level 10 beats %s >= 70%%', (a, b, c, _name, fight) => {
    const party = [a, b, c].map((cls, i) => geared(createMember(`m${i}`, `M${i}`, cls, 10), 3));
    const stats = runMany(N, (i) =>
      simulateFight(party, [...fight], { herb: 4 }, createRng(34000 + i), { bossHpScale: BOSS_HP_SCALE[2] }),
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.7);
  });

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
    const stats = runMany(N, (i) =>
      simulateFight(duo(a, b, 14, 4), [...fight], actThreeKit, createRng(43000 + i), { bossHpScale: BOSS_HP_SCALE[1] }),
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.7);
  });

  const roostTrios = trios.flatMap((t) => roostFights.map((fight) => [...t, fight.join('+'), fight] as const));
  it.each(roostTrios)('a %s + %s + %s party at level 13 beats %s >= 70%%', (a, b, c, _name, fight) => {
    const party = [a, b, c].map((cls, i) => geared(createMember(`m${i}`, `M${i}`, cls, 13), 4));
    const stats = runMany(N, (i) =>
      simulateFight(party, [...fight], { herb: 4, potion: 2 }, createRng(44000 + i), { bossHpScale: BOSS_HP_SCALE[2] }),
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.7);
  });

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
/** Every boss fight placed on the given maps (minus excluded leads), as solo stages. */
const bossStages = (maps: string[], level: number, tier: number, kit: Record<string, number>, skip: string[] = []): Stage[] =>
  maps
    .flatMap((id) => mapDef(id).npcs)
    .flatMap((n) => (n.boss && !skip.includes(n.boss.monsterIds[0]) ? [n.boss.monsterIds] : []))
    .map((ids) => ({ name: ids.join('+'), level, tier, kit, fight: () => [...ids], bossHpScale: BOSS_HP_SCALE[0] }));
const soloKitI = { herb: 6, tonic: 1 };
const soloKitII = { herb: 8, tonic: 2 };
const soloKitIII = { herb: 8, tonic: 2, potion: 2 };
/** Plan 4.4b: everything the hero must clear alone, up to the companion mini-bosses (their recruit quests). */
const STAGES: Stage[] = [
  tableStage('greenwood', 3, 1),
  tableStage('forest', 4, 1, soloKitI),
  tableStage('hills', 5, 2, soloKitI),
  tableStage('cave', 6, 2, soloKitI),
  { name: 'goblinKing', level: 6, tier: 2, kit: soloKitI, fight: () => ['goblinKing'], bossHpScale: BOSS_HP_SCALE[0] },
  ...bossStages(['overworld', 'goblinCave', 'wolfDen'], 7, 2, soloKitI, ['goblinKing']),
];
/** Plan 4.4c: post-unlock content, reported for a hero who stays alone but not asserted (a party is expected). */
const POST_UNLOCK: Stage[] = [
  ...['desert', 'marsh', 'shrine'].map((id) => tableStage(id, 10, 3, soloKitII)),
  ...bossStages(['sunShrine', 'mireShrine'], 12, 3, soloKitII),
  ...['snowfield', 'pines', 'roost'].map((id) => tableStage(id, 13, 4, soloKitIII)),
  ...bossStages(['wyvernRoost'], 15, 4, soloKitIII),
];

function hero(classId: ClassId, level: number, tier: number): PartyMember {
  const m = createMember('h', 'Hero', classId, level);
  return tier === 1 ? m : tier === 2 ? tier2(m) : geared(m, tier);
}

function stageStats(classId: ClassId, stage: Stage, levelOffset = 0): { winRate: number; avgRounds: number } {
  const m = hero(classId, stage.level + levelOffset, stage.tier);
  const kit = stage.kit ?? startKit(classId);
  return runMany(N, (i) =>
    simulateFight([m], stage.fight(createRng(51000 + i)), kit, createRng(52000 + i), { bossHpScale: stage.bossHpScale }),
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

/** What a careful player does between fights: patch HP up to 60% (Heal spell first, then Herbs, then Potions). */
function fieldTopUp(m: PartyMember, inv: Record<string, number>): void {
  const c = memberToCombatant(m);
  const healCost = ABILITIES.get('heal')?.mpCost ?? 3;
  const canHeal = c.abilityIds.includes('heal');
  while (m.hp < c.maxHp * 0.6) {
    if (canHeal && m.mp >= healCost * 2) {
      m.mp -= healCost;
      m.hp += 10 + c.mag * 2;
    } else if ((inv['herb'] ?? 0) > 0) {
      inv['herb']--;
      m.hp += ITEMS.get('herb')?.amount ?? 25;
    } else if ((inv['potion'] ?? 0) > 0) {
      inv['potion']--;
      m.hp += ITEMS.get('potion')?.amount ?? 70;
    } else {
      break;
    }
  }
  m.hp = Math.min(m.hp, c.maxHp);
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
