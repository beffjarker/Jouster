import { Rng } from '../core/rng';
import { BuffStat, Element } from '../core/types';

export type Side = 'party' | 'enemy';

export interface ActiveBuff {
  stat: BuffStat;
  multiplier: number;
  turnsLeft: number;
}

/** A participant in a battle. Party members and monsters share this shape. */
export interface Combatant {
  id: string;
  name: string;
  side: Side;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  /** Includes weapon bonus. */
  atk: number;
  /** Includes shield bonus. */
  def: number;
  agi: number;
  /** Includes staff bonus. */
  mag: number;
  critChance: number;
  /** Strikes per basic Attack. */
  hits: number;
  /** Damage multiplier for each basic strike. */
  hitMultiplier: number;
  /** Damage multiplier vs. undead for physical attacks. */
  undeadMultiplier: number;
  undead: boolean;
  boss: boolean;
  weaknesses: Element[];
  resistances: Element[];
  abilityIds: string[];
  cooldowns: Record<string, number>;
  buffs: ActiveBuff[];
  defending: boolean;
  tauntTurns: number;
  battleHpRegen: number;
  actionsTaken: number;
  /** Enemy behaviour table (`attack` or ability id, with weight). */
  ai: { action: string; weight: number }[];
  /** Monster id for enemies, class id for party members. */
  sourceId: string;
  /** Rewards (enemies only). */
  xp: number;
  gold: number;
  /** Chance (0–1) that this enemy drops gold at all; default 1. The amount then varies ±25%. */
  goldChance?: number;
  drops: { itemId: string; chance: number }[];
  stolen: boolean;
  /** Loses `poisonDamage` HP at the end of every round until cured (never below 1 HP). */
  poisoned?: boolean;
  /** Chance (0–1) that a landed basic attack poisons the target (enemies only). */
  poisonChance?: number;
}

export const BASE_ACCURACY = 0.97;
export const BASE_CRIT_MULTIPLIER = 1.5;

export function isAlive(c: Combatant): boolean {
  return c.hp > 0;
}

/** Stat value after active buffs. */
export function effectiveStat(c: Combatant, stat: BuffStat): number {
  const base = stat === 'atk' ? c.atk : c.def;
  return c.buffs.filter((b) => b.stat === stat).reduce((v, b) => v * b.multiplier, base);
}

/** Weakness = x1.5, resistance = x0.5, otherwise x1. */
export function elementMultiplier(defender: Combatant, element: Element): number {
  if (defender.weaknesses.includes(element)) {
    return 1.5;
  }
  if (defender.resistances.includes(element)) {
    return 0.5;
  }
  return 1;
}

export interface PhysicalOptions {
  /** Damage multiplier (e.g. Power Strike 1.5). */
  multiplier?: number;
  /** Fraction of MAG added to ATK (Holy Strike, Arcane Strike). */
  magScale?: number;
  element?: Element;
  accuracy?: number;
  critBonus?: number;
}

export interface HitResult {
  damage: number;
  crit: boolean;
  missed: boolean;
}

/**
 * One physical strike:
 * `max(1, ATK * rand(0.85..1.15) - DEF / 2)`, crits ignore DEF and deal x1.5.
 */
export function physicalHit(attacker: Combatant, defender: Combatant, rng: Rng, opts: PhysicalOptions = {}): HitResult {
  const accuracy = opts.accuracy ?? BASE_ACCURACY;
  if (!rng.chance(accuracy)) {
    return { damage: 0, crit: false, missed: true };
  }
  const attack = effectiveStat(attacker, 'atk') + attacker.mag * (opts.magScale ?? 0);
  const roll = attack * rng.float(0.85, 1.15);
  const crit = rng.chance(Math.min(0.95, attacker.critChance + (opts.critBonus ?? 0)));
  let damage = crit ? roll * BASE_CRIT_MULTIPLIER : roll - effectiveStat(defender, 'def') / 2;
  damage *= opts.multiplier ?? 1;
  damage *= elementMultiplier(defender, opts.element ?? 'physical');
  if (defender.undead) {
    damage *= attacker.undeadMultiplier;
  }
  if (defender.defending) {
    damage *= 0.5;
  }
  return { damage: Math.max(1, Math.floor(damage)), crit, missed: false };
}

/** Spell damage: `(power + MAG * magScale) * rand(0.9..1.1) * element`. Ignores DEF. */
export function magicalHit(
  attacker: Combatant,
  defender: Combatant,
  rng: Rng,
  power: number,
  element: Element,
  magScale = 1,
): HitResult {
  let damage = (power + attacker.mag * magScale) * rng.float(0.9, 1.1);
  damage *= elementMultiplier(defender, element);
  if (defender.defending) {
    damage *= 0.5;
  }
  return { damage: Math.max(1, Math.floor(damage)), crit: false, missed: false };
}

/** Healing: `power + MAG * magScale + rand(-2..2)`. */
export function healAmount(caster: Combatant, rng: Rng, power: number, magScale = 2): number {
  return Math.max(1, Math.floor(power + caster.mag * magScale + rng.int(-2, 2)));
}

/**
 * Amount a restore can actually add: never pushes `current` above `max` and never negative.
 * Every heal path (spells, items, regen) must go through this so overheal is impossible.
 */
export function cappedRestore(current: number, max: number, amount: number): number {
  return Math.max(0, Math.min(max - current, Math.floor(amount)));
}

/** Poison takes 1/12 of max HP (at least 1) per battle round. */
export const POISON_BATTLE_FRACTION = 1 / 12;

/**
 * HP poison takes this tick: `max(1, maxHp * POISON_BATTLE_FRACTION)`, but poison never knocks anyone out, so
 * it stops at 1 HP (0 when already at 1).
 */
export function poisonDamage(hp: number, maxHp: number): number {
  return Math.max(0, Math.min(hp - 1, Math.max(1, Math.floor(maxHp * POISON_BATTLE_FRACTION))));
}

/**
 * Chance to flee: 50% + 3% per point of average AGI advantage, plus a solo bonus.
 * Clamped to 20%..95%.
 */
export function runChance(party: Combatant[], enemies: Combatant[], soloBonus = 0.1): number {
  const avg = (cs: Combatant[]): number => cs.reduce((s, c) => s + c.agi, 0) / Math.max(1, cs.length);
  const alive = party.filter(isAlive);
  const bonus = alive.length === 1 ? soloBonus : 0;
  const chance = 0.5 + (avg(alive) - avg(enemies.filter(isAlive))) * 0.03 + bonus;
  return Math.max(0.2, Math.min(0.95, chance));
}

/** Initiative for one round: `AGI + rand(0..AGI/4)`. */
export function initiative(c: Combatant, rng: Rng): number {
  return c.agi + rng.int(0, Math.floor(c.agi / 4)) + rng.next() * 0.01;
}
