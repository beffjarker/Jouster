import { ACT_THREE_BOSS_IDS, ACT_TWO_BOSS_IDS, FINALE_BOSS_IDS, MINI_BOSS_IDS, MONSTERS } from './monsters';

/** Item rarity, lowest first (plan 33.2). */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface RarityDef {
  id: Rarity;
  name: string;
  /** One-letter tag shown beside the name, so rarity never depends on colour alone. */
  tag: string;
  color: string;
  /** Random bonus rolls (Common drops roll 0 or 1, see `COMMON_DROP_BONUS_CHANCE`). */
  rolls: number;
  /**
   * Multiplier on the base price when working out what a piece is worth. Commons are worth little, so selling drops
   * doesn't outpace fight gold (plan 33.8); Rare and better are still a good sale.
   */
  valueMultiplier: number;
}

export const RARITIES: Readonly<Record<Rarity, RarityDef>> = {
  common: { id: 'common', name: 'Common', tag: 'C', color: '#ffffff', rolls: 0, valueMultiplier: 0.15 },
  uncommon: { id: 'uncommon', name: 'Uncommon', tag: 'U', color: '#50e070', rolls: 1, valueMultiplier: 0.3 },
  rare: { id: 'rare', name: 'Rare', tag: 'R', color: '#60a8ff', rolls: 2, valueMultiplier: 0.75 },
  epic: { id: 'epic', name: 'Epic', tag: 'E', color: '#c080ff', rolls: 3, valueMultiplier: 1.5 },
  legendary: { id: 'legendary', name: 'Legendary', tag: 'L', color: '#ffa040', rolls: 4, valueMultiplier: 2.5 },
};

export const RARITY_ORDER: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/** Chance that a dropped Common gets one bonus roll (shop Commons never do). */
export const COMMON_DROP_BONUS_CHANCE = 0.3;

/** Who dropped a piece, which picks the rarity odds. */
export type LootSource = 'common' | 'miniBoss' | 'boss';

/** Rarity odds per source (plan 33.6); weights add up to 100. */
export const RARITY_ODDS: Readonly<Record<LootSource, Readonly<Partial<Record<Rarity, number>>>>> = {
  common: { common: 75, uncommon: 20, rare: 5 },
  miniBoss: { uncommon: 50, rare: 38, epic: 12 },
  boss: { rare: 60, epic: 35, legendary: 5 },
};

/** Default gear drop chance per source; a monster's `gearChance` overrides it. */
export const GEAR_DROP_CHANCE: Readonly<Record<LootSource, number>> = { common: 0.15, miniBoss: 0.6, boss: 1 };

/** Bosses that may drop a Legendary (once each, on the first win); other bosses roll Epic instead. */
export const LEGENDARY_BOSS_IDS: readonly string[] = ['goblinKing', ...ACT_TWO_BOSS_IDS, ...ACT_THREE_BOSS_IDS, ...FINALE_BOSS_IDS];

/**
 * Item tier of the gear a monster drops: the tier sold where it lives (plan 33.6). Greenwood beasts drop tier 1,
 * the Goblin Cave and Act I mini-bosses tier 2, then one tier per act.
 */
export const LOOT_TIER: Readonly<Record<string, number>> = {
  slime: 1,
  giantBat: 1,
  wolf: 1,
  goblin: 2,
  skeleton: 2,
  goblinKing: 2,
  alphaWolf: 2,
  giantToad: 2,
  boneCaptain: 2,
  goblinChief: 2,
  scorpion: 3,
  sandWorm: 3,
  lizardman: 3,
  wraith: 3,
  sandWyrm: 3,
  marshWitch: 3,
  iceTroll: 4,
  wyvern: 4,
  yeti: 4,
  frostMage: 4,
  wyvernMatriarch: 4,
  fireDrake: 5,
  magmaGolem: 5,
  dragonCultist: 5,
  vyrmorth: 5,
  vyrmorthUnbound: 5,
};

/** The tier of gear a monster drops (1 for anything unlisted). */
export function lootTier(monsterId: string): number {
  return LOOT_TIER[monsterId] ?? 1;
}

/** Common monster, mini-boss or boss. */
export function lootSource(monsterId: string): LootSource {
  if (MINI_BOSS_IDS.includes(monsterId)) {
    return 'miniBoss';
  }
  return MONSTERS.get(monsterId)?.boss ? 'boss' : 'common';
}
