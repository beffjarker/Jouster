/**
 * Shared data types for game content (classes, monsters, abilities, items).
 *
 * Content lives in data files (see `@jouster/game/quest`); the engine only knows these shapes.
 */

export type Element = 'physical' | 'fire' | 'ice' | 'lightning' | 'holy' | 'dark';

/** Core character statistics. */
export interface Stats {
  hp: number;
  mp: number;
  atk: number;
  def: number;
  agi: number;
  mag: number;
}

export type StatKey = keyof Stats;

export type WeaponFamily = 'sword' | 'swordShield' | 'staff' | 'mace' | 'daggers' | 'knife';

/** Every class has a melee weapon; `atk` is added to the wielder's ATK for the basic Attack. */
export interface WeaponDef {
  id: string;
  name: string;
  family: WeaponFamily;
  tier: number;
  atk: number;
  /** Bonus MAG while equipped (staves). */
  mag?: number;
  /** Bonus DEF while equipped (shields). */
  def?: number;
  /** Number of strikes per basic Attack (daggers strike twice). */
  hits?: number;
  /** Damage multiplier applied to each strike. */
  hitMultiplier?: number;
  /** Damage multiplier against undead enemies (maces). */
  undeadMultiplier?: number;
  price: number;
  description: string;
}

export type AbilityCategory = 'magic' | 'skill';
export type AbilityTarget = 'enemy' | 'allEnemies' | 'ally' | 'self' | 'deadAlly';
export type AbilityEffect = 'damage' | 'heal' | 'buff' | 'revive' | 'steal' | 'taunt';
export type DamageType = 'physical' | 'magical';
export type BuffStat = 'atk' | 'def';

export interface BuffDef {
  stat: BuffStat;
  multiplier: number;
  turns: number;
}

export interface AbilityDef {
  id: string;
  name: string;
  description: string;
  category: AbilityCategory;
  target: AbilityTarget;
  effect: AbilityEffect;
  mpCost: number;
  /** Rounds before the ability can be used again (0 = every round). */
  cooldown: number;
  damageType?: DamageType;
  /**
   * Physical: multiplier on weapon damage. Magical: base spell power (added to MAG).
   * Heal: base amount healed.
   */
  power: number;
  /** Physical: fraction of MAG added to ATK. Magical/heal: multiplier on MAG. */
  magScale?: number;
  element?: Element;
  /** Hit chance for physical abilities (default: normal attack accuracy). */
  accuracy?: number;
  critBonus?: number;
  /** Extra crit chance if this is the user's first action of the battle. */
  firstTurnCritBonus?: number;
  buff?: BuffDef;
  /** Fraction of max HP restored by revive effects. */
  revivePercent?: number;
  /** Heals that also cure poison (Heal). */
  curesPoison?: boolean;
}

export interface LearnedAbility {
  level: number;
  abilityId: string;
}

export interface ClassPassive {
  id: string;
  name: string;
  description: string;
  /** HP regained at the end of every battle round. */
  battleHpRegen?: number;
  /** Regain 1 MP every N steps on maps with encounters (not in towns). */
  fieldMpStepInterval?: number;
}

export type ClassId = 'warrior' | 'wizard' | 'paladin' | 'cleric' | 'rogue' | 'ranger';

export interface ClassDef {
  id: ClassId;
  name: string;
  role: string;
  description: string;
  /** Level 1 stats (before weapon bonuses). */
  base: Stats;
  /** Stat gain per level; fractional values accumulate. */
  growth: Stats;
  startingWeaponId: string;
  weaponFamily: WeaponFamily;
  critChance: number;
  abilities: LearnedAbility[];
  passive?: ClassPassive;
  /** Regain 1 HP every N steps on maps with encounters (default 24). */
  fieldHpStepInterval?: number;
  /** Extra Herbs in the starting kit (classes without healing magic). */
  bonusHerbs: number;
}

export interface MonsterAction {
  /** `attack` or an ability id. */
  action: string;
  weight: number;
}

export interface MonsterDrop {
  itemId: string;
  chance: number;
}

export interface MonsterDef {
  id: string;
  name: string;
  stats: Stats;
  xp: number;
  gold: number;
  /** Chance (0–1) of dropping gold; defaults to 1 for bosses and DEFAULT_GOLD_CHANCE for others. */
  goldChance?: number;
  undead?: boolean;
  boss?: boolean;
  weaknesses: Element[];
  resistances: Element[];
  actions: MonsterAction[];
  drops: MonsterDrop[];
  critChance?: number;
  /** Chance (0–1) that a landed basic attack poisons the target. */
  poisonChance?: number;
  spriteId: string;
}

export type ItemEffect = 'healHp' | 'healMp' | 'revive' | 'curePoison';

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  effect: ItemEffect;
  /** HP/MP restored, or fraction of max HP for revive (unused by curePoison). */
  amount: number;
  price: number;
  usableInBattle: boolean;
  usableInField: boolean;
}
