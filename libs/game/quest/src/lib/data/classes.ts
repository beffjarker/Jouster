import { ClassDef, ClassId } from '@jouster/game/engine';

const LIST: ClassDef[] = [
  {
    id: 'warrior',
    name: 'Warrior',
    role: 'Tank / damage',
    description: 'Hits hard and takes hits. Power Strike and Taunt.',
    base: { hp: 32, mp: 0, atk: 12, def: 10, agi: 6, mag: 0 },
    growth: { hp: 8, mp: 0, atk: 2, def: 1.5, agi: 0.5, mag: 0 },
    startingWeaponId: 'bronzeSword',
    weaponFamily: 'sword',
    critChance: 1 / 32,
    abilities: [
      { level: 1, abilityId: 'powerStrike' },
      { level: 4, abilityId: 'taunt' },
    ],
    bonusHerbs: 2,
  },
  {
    id: 'wizard',
    name: 'Wizard',
    role: 'Attack magic',
    description: 'Fire, Ice and Bolt. Staff blows boosted by magic.',
    base: { hp: 20, mp: 16, atk: 6, def: 4, agi: 6, mag: 11 },
    growth: { hp: 4, mp: 6, atk: 0.5, def: 0.5, agi: 0.5, mag: 2 },
    startingWeaponId: 'oakStaff',
    weaponFamily: 'staff',
    critChance: 1 / 32,
    abilities: [
      { level: 1, abilityId: 'fire' },
      { level: 1, abilityId: 'arcaneStrike' },
      { level: 2, abilityId: 'ice' },
      { level: 5, abilityId: 'bolt' },
    ],
    bonusHerbs: 0,
  },
  {
    id: 'paladin',
    name: 'Paladin',
    role: 'Hybrid',
    description: 'Sword and shield, holy strikes and healing.',
    base: { hp: 28, mp: 8, atk: 10, def: 9, agi: 4, mag: 4 },
    growth: { hp: 6, mp: 2, atk: 1.5, def: 1.5, agi: 0.5, mag: 0.5 },
    startingWeaponId: 'knightBlade',
    weaponFamily: 'swordShield',
    critChance: 1 / 32,
    abilities: [
      { level: 1, abilityId: 'holyStrike' },
      { level: 2, abilityId: 'heal' },
      { level: 6, abilityId: 'protect' },
    ],
    bonusHerbs: 0,
  },
  {
    id: 'cleric',
    name: 'Cleric',
    role: 'Holy fighter / support',
    description: 'Mace, Holy Strike, Heal. Blessed: regen in battle and on the road.',
    base: { hp: 24, mp: 16, atk: 8, def: 7, agi: 5, mag: 6 },
    growth: { hp: 6, mp: 4, atk: 1, def: 1, agi: 0.5, mag: 1 },
    startingWeaponId: 'woodMace',
    weaponFamily: 'mace',
    critChance: 1 / 32,
    abilities: [
      { level: 1, abilityId: 'holyStrike' },
      { level: 1, abilityId: 'heal' },
      { level: 3, abilityId: 'protect' },
      { level: 4, abilityId: 'smite' },
      { level: 7, abilityId: 'revive' },
    ],
    passive: {
      id: 'blessed',
      name: 'Blessed',
      description: '+1 HP each battle round, +1 MP every 4 steps.',
      battleHpRegen: 1,
      fieldMpStepInterval: 4,
    },
    bonusHerbs: 0,
  },
  {
    id: 'rogue',
    name: 'Rogue',
    role: 'Speed / utility',
    description: 'Twin daggers strike twice. Backstab and Steal.',
    base: { hp: 24, mp: 0, atk: 11, def: 6, agi: 13, mag: 0 },
    growth: { hp: 6, mp: 0, atk: 1.5, def: 0.5, agi: 2.5, mag: 0 },
    startingWeaponId: 'twinDaggers',
    weaponFamily: 'daggers',
    critChance: 1 / 8,
    abilities: [
      { level: 1, abilityId: 'backstab' },
      { level: 2, abilityId: 'steal' },
    ],
    bonusHerbs: 2,
  },
  {
    id: 'ranger',
    name: 'Ranger',
    role: 'Skirmisher',
    description: 'Knife up close, bow for Aimed Shot and Volley.',
    base: { hp: 24, mp: 4, atk: 10, def: 6, agi: 10, mag: 3 },
    growth: { hp: 6, mp: 2, atk: 1.5, def: 1, agi: 1.5, mag: 0 },
    startingWeaponId: 'huntKnife',
    weaponFamily: 'knife',
    critChance: 1 / 32,
    abilities: [
      { level: 1, abilityId: 'aimedShot' },
      { level: 3, abilityId: 'volley' },
    ],
    bonusHerbs: 0,
  },
];

export const CLASSES: ReadonlyMap<ClassId, ClassDef> = new Map(LIST.map((c) => [c.id, c]));
export const CLASS_ORDER: readonly ClassId[] = LIST.map((c) => c.id);

export function classDef(id: ClassId): ClassDef {
  const def = CLASSES.get(id);
  if (!def) {
    throw new Error(`Unknown class: ${id}`);
  }
  return def;
}
