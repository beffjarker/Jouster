import { createRng, pickEncounter, statsAtLevel, totalXpForLevel } from '@jouster/game/engine';
import { classDef } from '../data/classes';
import { WEAPONS } from '../data/equipment';
import { GEAR, GearSlot, gearUsableBy } from '../data/gear';
import { ENCOUNTER_TABLES, MONSTERS } from '../data/monsters';
import { COMMON_DROP_BONUS_CHANCE, GEAR_DROP_CHANCE, RARITIES, RARITY_ODDS, RARITY_ORDER, Rarity, lootSource, lootTier } from '../data/rarity';
import { BonusStat, GearBonus, GearItem, baseInfo, bonusRange, usableByAny } from '../state/loot';
import { PartyMember } from '../state/party';

/**
 * One stretch of the expected path (plan 33.8): random fights in an area from one level to the next, or one boss
 * fight whose drop is shared by `partySize` members.
 */
export type LootStep =
  | { table: string; fromLevel: number; toLevel: number; maxEnemies: number }
  | { boss: readonly string[]; partySize: number };

/** Expected pieces per slot, indexed by bonus rolls (0-4), and the highest loot tier seen. */
export interface ExpectedHaul {
  counts: Record<GearSlot, number[]>;
  tier: number;
}

export const LOOT_SLOTS: readonly GearSlot[] = ['weapon', 'armor', 'shield', 'accessory'];

/** Rarity worn for a piece with this many bonus rolls (a Common with one roll is the same as an Uncommon). */
const RARITY_BY_ROLLS: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/** Chance that one drop of a `tier` piece, rolled for a solo `classId`, lands in `slot` and is usable. */
function slotShare(tier: number, classId: PartyMember['classId'], slot: GearSlot): number {
  const ids = [...WEAPONS.values()].filter((w) => w.tier === tier).map((w) => w.id);
  ids.push(...[...GEAR.values()].filter((g) => g.tier === tier).map((g) => g.id));
  const weight = (id: string): number => (usableByAny(id, [classId]) ? 3 : 1);
  const total = ids.reduce((sum, id) => sum + weight(id), 0);
  const mine = ids.filter((id) => baseInfo(id)?.slot === slot && usableByAny(id, [classId]));
  return total ? mine.reduce((sum, id) => sum + weight(id), 0) / total : 0;
}

/** Adds `times` kills of a monster to the haul: drop chance x rarity odds x slot share. */
function addKills(haul: ExpectedHaul, monsterId: string, times: number, classId: PartyMember['classId']): void {
  const def = MONSTERS.get(monsterId);
  const source = lootSource(monsterId);
  const chance = def?.gearChance ?? GEAR_DROP_CHANCE[source];
  const tier = lootTier(monsterId);
  haul.tier = Math.max(haul.tier, tier);
  const odds = RARITY_ODDS[source];
  for (const rarity of RARITY_ORDER) {
    const p = (odds[rarity] ?? 0) / 100;
    if (!p) {
      continue;
    }
    const split: [number, number][] =
      rarity === 'common' ? [[0, 1 - COMMON_DROP_BONUS_CHANCE], [1, COMMON_DROP_BONUS_CHANCE]] : [[RARITIES[rarity].rolls, 1]];
    for (const slot of LOOT_SLOTS) {
      const share = slotShare(tier, classId, slot);
      split.forEach(([rolls, q]) => (haul.counts[slot][rolls] += times * chance * p * q * share));
    }
  }
}

/**
 * The expected loot one member collects along `steps`. Random fights count by XP: a party of n fights n times as
 * often for the same XP each and splits the drops n ways, so the per-member haul doesn't depend on party size.
 */
export function expectedHaul(steps: readonly LootStep[], classId: PartyMember['classId'], seed = 33): ExpectedHaul {
  const haul: ExpectedHaul = { counts: { weapon: [0, 0, 0, 0, 0], armor: [0, 0, 0, 0, 0], shield: [0, 0, 0, 0, 0], accessory: [0, 0, 0, 0, 0] }, tier: 0 };
  for (const step of steps) {
    if ('boss' in step) {
      step.boss.forEach((id) => addKills(haul, id, 1 / step.partySize, classId));
      continue;
    }
    const table = ENCOUNTER_TABLES.get(step.table);
    if (!table) {
      throw new Error(`Unknown encounter table: ${step.table}`);
    }
    const rng = createRng(seed);
    const kills = new Map<string, number>();
    let xp = 0;
    for (let i = 0; i < 1000; i++) {
      pickEncounter(table, rng, step.maxEnemies).forEach((id) => {
        kills.set(id, (kills.get(id) ?? 0) + 1);
        xp += MONSTERS.get(id)?.xp ?? 0;
      });
    }
    const scale = (totalXpForLevel(step.toLevel) - totalXpForLevel(step.fromLevel)) / xp;
    kills.forEach((n, id) => addKills(haul, id, n * scale, classId));
  }
  return haul;
}

/** Most bonus rolls the member has probably found in a slot (expected count of that or better >= 1); -1 for none. */
export function expectedRolls(haul: ExpectedHaul, slot: GearSlot): number {
  let atLeast = 0;
  for (let rolls = 4; rolls >= 0; rolls--) {
    atLeast += haul.counts[slot][rolls];
    if (atLeast >= 1) {
      return rolls;
    }
  }
  return -1;
}

/** A mid-range bonus value for a piece with this many rolls (Rare+ roll from the upper half, Legendary the top). */
export function midBonus(stat: BonusStat, tier: number, rolls: number): number {
  const [lo, hi] = bonusRange(stat, tier);
  if (rolls >= 4) {
    return hi;
  }
  const min = rolls >= 2 ? Math.ceil((lo + hi) / 2) : lo;
  return Math.round((min + hi) / 2);
}

/** Stats a player would keep first: the class's attack stat, then DEF, HP, AGI, the other attack stat, MP. */
function statPriority(classId: PartyMember['classId']): BonusStat[] {
  const s = statsAtLevel(classDef(classId), 1);
  const [main, other]: BonusStat[] = s.mag > s.atk ? ['mag', 'atk'] : ['atk', 'mag'];
  return [main, 'def', 'hp', 'agi', other, 'mp'];
}

function slotId(m: PartyMember, slot: GearSlot): string | undefined {
  return slot === 'weapon' ? m.weaponId : slot === 'armor' ? m.armorId : slot === 'shield' ? m.shieldId : m.accessoryId;
}

/**
 * Loot mode (plan 33.8): the member keeps its shop gear and, in every slot where the expected haul says it has
 * probably found a piece, wears that piece's bonuses on top (the rolls it most likely reached, mid-range values,
 * on the stats it wants most). An empty slot gets the best piece of the loot tier the class can use. This leans
 * generous on purpose, so "still a fight" checks run against a well-looted party.
 */
export function withExpectedLoot(m: PartyMember, haul: ExpectedHaul): PartyMember {
  const out: PartyMember = { ...m, worn: { ...m.worn } };
  const stats = statPriority(m.classId);
  LOOT_SLOTS.forEach((slot, i) => {
    const rolls = expectedRolls(haul, slot);
    if (rolls < 0) {
      return;
    }
    let baseId = slotId(out, slot);
    if (!baseId && slot !== 'weapon') {
      baseId = [...GEAR.values()]
        .filter((g) => g.slot === slot && g.tier <= haul.tier && gearUsableBy(g, m.classId))
        .sort((x, y) => y.price - x.price)[0]?.id;
      if (!baseId) {
        return;
      }
      out[`${slot}Id` as 'armorId' | 'shieldId' | 'accessoryId'] = baseId;
    }
    if (!baseId || rolls === 0) {
      return;
    }
    const bonus: GearBonus = {};
    stats.slice(0, rolls).forEach((stat) => (bonus[stat] = midBonus(stat, haul.tier, rolls)));
    const item: GearItem = { uid: -1 - i, baseId, rarity: RARITY_BY_ROLLS[rolls], bonus };
    (out.worn ?? {})[slot] = item;
  });
  return out;
}
