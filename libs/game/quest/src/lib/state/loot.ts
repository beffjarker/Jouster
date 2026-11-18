import { ClassId, Rng } from '@jouster/game/engine';
import { classDef } from '../data/classes';
import { WEAPONS } from '../data/equipment';
import { GEAR, GearSlot, gearUsableBy } from '../data/gear';
import {
  COMMON_DROP_BONUS_CHANCE,
  LEGENDARY_BOSS_IDS,
  RARITIES,
  RARITY_ODDS,
  RARITY_ORDER,
  Rarity,
  lootSource,
  lootTier,
} from '../data/rarity';

/** Stats a random bonus can raise (plan 33.3). */
export type BonusStat = 'hp' | 'mp' | 'atk' | 'def' | 'agi' | 'mag';
export const BONUS_STATS: readonly BonusStat[] = ['atk', 'def', 'agi', 'mag', 'hp', 'mp'];
export type GearBonus = Partial<Record<BonusStat, number>>;

/** One piece of gear in the bag or worn (plan 33.4). Shop pieces are Common with no bonus. */
export interface GearItem {
  uid: number;
  baseId: string;
  rarity: Rarity;
  bonus: GearBonus;
}

/** A rolled piece before it gets a uid. */
export type GearRoll = Omit<GearItem, 'uid'>;

const SUFFIX: Readonly<Record<BonusStat, string>> = {
  atk: 'of Might',
  def: 'of Warding',
  agi: 'of Haste',
  mag: 'of Sorcery',
  hp: 'of Vigor',
  mp: 'of Spirit',
};

/** Value added per bonus roll per item tier (plan 33.5). */
const BONUS_VALUE_PER_TIER = 5;

/** Starting gear has no price; it's valued at a tenth of the tier above, so it sells for a few gold. */
const STARTING_GEAR_VALUE_DIVISOR = 10;

interface BaseInfo {
  name: string;
  slot: GearSlot;
  tier: number;
  price: number;
}

/** Name, slot, tier and price of a weapon or gear id (undefined when unknown). */
export function baseInfo(baseId: string): BaseInfo | undefined {
  const w = WEAPONS.get(baseId);
  if (w) {
    return { name: w.name, slot: 'weapon', tier: w.tier, price: w.price };
  }
  const g = GEAR.get(baseId);
  return g ? { name: g.name, slot: g.slot, tier: g.tier, price: g.price } : undefined;
}

/** True when any of these classes could use the piece. */
export function usableByAny(baseId: string, classes: readonly ClassId[]): boolean {
  const w = WEAPONS.get(baseId);
  if (w) {
    return classes.some((c) => classDef(c).weaponFamily === w.family);
  }
  const g = GEAR.get(baseId);
  return g !== undefined && classes.some((c) => gearUsableBy(g, c));
}

/** Smallest and largest bonus for a stat on an item of this tier. */
export function bonusRange(stat: BonusStat, tier: number): [number, number] {
  return stat === 'hp' || stat === 'mp' ? [4, 4 * (tier + 1)] : [1, tier + 1];
}

function rollValue(rng: Rng, stat: BonusStat, tier: number, rarity: Rarity): number {
  const [lo, hi] = bonusRange(stat, tier);
  if (rarity === 'legendary') {
    return hi;
  }
  const min = RARITY_ORDER.indexOf(rarity) >= RARITY_ORDER.indexOf('rare') ? Math.ceil((lo + hi) / 2) : lo;
  return rng.int(min, hi);
}

/**
 * Random bonuses for a dropped piece: one stat per roll, never the same stat twice, and stats the slot already
 * gives (ATK on weapons, DEF on armor and shields) half as likely.
 */
export function rollBonus(rng: Rng, baseId: string, rarity: Rarity): GearBonus {
  const info = baseInfo(baseId);
  if (!info) {
    return {};
  }
  const count = rarity === 'common' ? (rng.chance(COMMON_DROP_BONUS_CHANCE) ? 1 : 0) : RARITIES[rarity].rolls;
  const native: BonusStat | null = info.slot === 'weapon' ? 'atk' : info.slot === 'accessory' ? null : 'def';
  const pool = [...BONUS_STATS];
  const bonus: GearBonus = {};
  for (let i = 0; i < count && pool.length > 0; i++) {
    const stat = rng.weighted(pool, (s) => (s === native ? 1 : 2));
    pool.splice(pool.indexOf(stat), 1);
    bonus[stat] = rollValue(rng, stat, info.tier, rarity);
  }
  return bonus;
}

/** Rarity from a source's odds; a Legendary that isn't allowed becomes Epic. */
export function rollRarity(rng: Rng, odds: Readonly<Partial<Record<Rarity, number>>>, legendaryOk: boolean): Rarity {
  const entries = RARITY_ORDER.filter((r) => (odds[r] ?? 0) > 0);
  const rarity = rng.weighted(entries, (r) => odds[r] ?? 0);
  return rarity === 'legendary' && !legendaryOk ? 'epic' : rarity;
}

/** A random weapon or gear id of the tier; pieces someone in the party can use are 3x as likely. */
export function pickBase(rng: Rng, tier: number, classes: readonly ClassId[]): string {
  const ids = [...WEAPONS.values()].filter((w) => w.tier === tier).map((w) => w.id);
  ids.push(...[...GEAR.values()].filter((g) => g.tier === tier).map((g) => g.id));
  return rng.weighted(ids, (id) => (usableByAny(id, classes) ? 3 : 1));
}

/** Flag set once a boss has given its one Legendary (plan 33.8). */
export function legendaryFlag(monsterId: string): string {
  return `loot:${monsterId}`;
}

/**
 * Rolls the piece a defeated monster dropped (plan 33.6): rarity from the monster's kind, a base item of its loot
 * tier, then the bonuses. A Legendary sets the boss's flag in `flags`, so it is given only once.
 */
export function rollLoot(rng: Rng, monsterId: string, classes: readonly ClassId[], flags: Record<string, boolean>): GearRoll {
  const legendaryOk = LEGENDARY_BOSS_IDS.includes(monsterId) && flags[legendaryFlag(monsterId)] !== true;
  const rarity = rollRarity(rng, RARITY_ODDS[lootSource(monsterId)], legendaryOk);
  if (rarity === 'legendary') {
    flags[legendaryFlag(monsterId)] = true;
  }
  const baseId = pickBase(rng, lootTier(monsterId), classes);
  return { baseId, rarity, bonus: rollBonus(rng, baseId, rarity) };
}

/** The bonus that names the piece: the largest one, with HP and MP counted at a quarter. */
function mainBonus(bonus: GearBonus): BonusStat | undefined {
  const score = (s: BonusStat): number => (bonus[s] ?? 0) / (s === 'hp' || s === 'mp' ? 4 : 1);
  return BONUS_STATS.filter((s) => (bonus[s] ?? 0) > 0).sort((a, b) => score(b) - score(a))[0];
}

/** "Iron Sword of Haste" (plain name when there is no bonus). */
export function itemName(item: GearRoll): string {
  const name = baseInfo(item.baseId)?.name ?? item.baseId;
  const main = mainBonus(item.bonus);
  return main ? `${name} ${SUFFIX[main]}` : name;
}

/** "[R] IRON SWORD OF HASTE" */
export function itemLabel(item: GearRoll): string {
  return `[${RARITIES[item.rarity].tag}] ${itemName(item).toUpperCase()}`;
}

/** "Rare Iron Sword of Haste" (for battle and message text). */
export function rarityName(item: GearRoll): string {
  return `${RARITIES[item.rarity].name} ${itemName(item)}`;
}

/** "AGI+2 MP+6" (blank when there is no bonus). */
export function bonusText(bonus: GearBonus): string {
  return BONUS_STATS.filter((s) => (bonus[s] ?? 0) > 0)
    .map((s) => `${s.toUpperCase()}+${bonus[s]}`)
    .join(' ');
}

/** Number of bonus rolls on a piece. */
export function bonusCount(item: GearRoll): number {
  return BONUS_STATS.filter((s) => (item.bonus[s] ?? 0) > 0).length;
}

/** True for a Common with no bonus (identical pieces group into one line). */
export function isPlain(item: GearRoll): boolean {
  return item.rarity === 'common' && bonusCount(item) === 0;
}

/** True for Rare and better, which ask before being sold or left behind. */
export function isPrecious(item: GearRoll): boolean {
  return RARITY_ORDER.indexOf(item.rarity) >= RARITY_ORDER.indexOf('rare');
}

/** Base price; starting gear (price 0) is worth a tenth of the cheapest weapon of the tier above in its family. */
function basePrice(baseId: string): number {
  const info = baseInfo(baseId);
  if (!info) {
    return 0;
  }
  if (info.price > 0) {
    return info.price;
  }
  const family = WEAPONS.get(baseId)?.family;
  const above = [...WEAPONS.values()]
    .filter((w) => w.tier === info.tier + 1 && (family === undefined || w.family === family))
    .map((w) => w.price);
  return above.length ? Math.round(Math.min(...above) / STARTING_GEAR_VALUE_DIVISOR) : 0;
}

/** What a piece is worth: base price x rarity multiplier + 5 x tier per bonus roll (plan 33.5, tuned in 33.8). */
export function gearValue(item: GearRoll): number {
  const tier = baseInfo(item.baseId)?.tier ?? 1;
  return Math.round(basePrice(item.baseId) * RARITIES[item.rarity].valueMultiplier) + BONUS_VALUE_PER_TIER * tier * bonusCount(item);
}

/** Gold a shop pays for a piece: half its value, at least 1. */
export function gearSellPrice(item: GearRoll): number {
  return Math.max(1, Math.floor(gearValue(item) / 2));
}

/** True when a saved piece is well formed (known base, rarity and stats). */
export function isValidGearItem(x: unknown): x is GearItem {
  if (typeof x !== 'object' || x === null) {
    return false;
  }
  const item = x as Partial<GearItem>;
  return (
    Number.isInteger(item.uid) &&
    typeof item.baseId === 'string' &&
    baseInfo(item.baseId) !== undefined &&
    typeof item.rarity === 'string' &&
    RARITY_ORDER.includes(item.rarity) &&
    typeof item.bonus === 'object' &&
    item.bonus !== null &&
    Object.entries(item.bonus).every(([k, v]) => BONUS_STATS.includes(k as BonusStat) && Number.isFinite(v))
  );
}
