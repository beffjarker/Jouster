import { EncounterTable, MonsterDef } from '@jouster/game/engine';

const LIST: MonsterDef[] = [
  {
    id: 'slime',
    name: 'Slime',
    stats: { hp: 10, mp: 0, atk: 8, def: 2, agi: 3, mag: 0 },
    xp: 3,
    gold: 3,
    weaknesses: ['fire'],
    resistances: [],
    actions: [{ action: 'attack', weight: 1 }],
    drops: [{ itemId: 'herb', chance: 0.1 }],
    spriteId: 'slime',
  },
  {
    id: 'giantBat',
    name: 'Giant Bat',
    stats: { hp: 12, mp: 0, atk: 9, def: 3, agi: 9, mag: 0 },
    xp: 4,
    gold: 4,
    weaknesses: ['lightning'],
    resistances: [],
    actions: [{ action: 'attack', weight: 1 }],
    drops: [{ itemId: 'herb', chance: 0.1 }],
    spriteId: 'bat',
  },
  {
    id: 'wolf',
    name: 'Grey Wolf',
    stats: { hp: 16, mp: 0, atk: 11, def: 4, agi: 8, mag: 0 },
    xp: 6,
    gold: 5,
    weaknesses: ['fire'],
    resistances: [],
    actions: [{ action: 'attack', weight: 1 }],
    drops: [{ itemId: 'herb', chance: 0.15 }],
    spriteId: 'wolf',
  },
  {
    id: 'goblin',
    name: 'Goblin',
    stats: { hp: 21, mp: 0, atk: 12, def: 6, agi: 5, mag: 0 },
    xp: 8,
    gold: 8,
    weaknesses: ['ice'],
    resistances: [],
    actions: [{ action: 'attack', weight: 1 }],
    drops: [
      { itemId: 'herb', chance: 0.2 },
      { itemId: 'tonic', chance: 0.05 },
    ],
    spriteId: 'goblin',
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    stats: { hp: 23, mp: 0, atk: 13, def: 7, agi: 4, mag: 0 },
    xp: 10,
    gold: 9,
    undead: true,
    weaknesses: ['holy'],
    resistances: ['ice', 'dark'],
    actions: [{ action: 'attack', weight: 1 }],
    drops: [{ itemId: 'tonic', chance: 0.1 }],
    spriteId: 'skeleton',
  },
  {
    id: 'goblinKing',
    name: 'Goblin King',
    stats: { hp: 180, mp: 0, atk: 22, def: 12, agi: 7, mag: 0 },
    xp: 80,
    gold: 100,
    boss: true,
    weaknesses: ['ice'],
    resistances: [],
    actions: [
      { action: 'attack', weight: 6 },
      { action: 'cleave', weight: 2 },
      { action: 'warcry', weight: 1 },
    ],
    drops: [{ itemId: 'phoenixFeather', chance: 1 }],
    critChance: 1 / 32,
    spriteId: 'goblinKing',
  },
  // --- Companion side-quest mini-bosses (about 60-70% of the Goblin King) -------------------
  {
    id: 'alphaWolf',
    name: 'Alpha Wolf',
    stats: { hp: 110, mp: 0, atk: 18, def: 8, agi: 12, mag: 0 },
    xp: 50,
    gold: 40,
    boss: true,
    weaknesses: ['fire'],
    resistances: [],
    actions: [
      { action: 'attack', weight: 6 },
      { action: 'warcry', weight: 1 },
    ],
    drops: [{ itemId: 'tonic', chance: 1 }],
    critChance: 1 / 24,
    spriteId: 'alphaWolf',
  },
  {
    id: 'giantToad',
    name: 'Giant Toad',
    stats: { hp: 130, mp: 0, atk: 17, def: 10, agi: 4, mag: 0 },
    xp: 50,
    gold: 30,
    boss: true,
    weaknesses: ['lightning'],
    resistances: ['ice'],
    actions: [
      { action: 'attack', weight: 5 },
      { action: 'cleave', weight: 1 },
    ],
    drops: [{ itemId: 'herb', chance: 1 }],
    spriteId: 'giantToad',
  },
  {
    id: 'boneCaptain',
    name: 'Bone Captain',
    stats: { hp: 120, mp: 0, atk: 19, def: 11, agi: 6, mag: 0 },
    xp: 55,
    gold: 45,
    boss: true,
    undead: true,
    weaknesses: ['holy', 'fire'],
    resistances: ['ice', 'dark'],
    actions: [
      { action: 'attack', weight: 5 },
      { action: 'cleave', weight: 1 },
      { action: 'warcry', weight: 1 },
    ],
    drops: [{ itemId: 'tonic', chance: 1 }],
    spriteId: 'boneCaptain',
  },
  {
    id: 'goblinChief',
    name: 'Goblin Jailer',
    stats: { hp: 125, mp: 0, atk: 18, def: 10, agi: 7, mag: 0 },
    xp: 55,
    gold: 50,
    boss: true,
    weaknesses: ['ice'],
    resistances: [],
    actions: [
      { action: 'attack', weight: 6 },
      { action: 'cleave', weight: 1 },
      { action: 'warcry', weight: 1 },
    ],
    drops: [{ itemId: 'herb', chance: 1 }],
    spriteId: 'goblinChief',
  },
];

/** Side-quest mini-bosses (fought after the Goblin King, usually solo or as a pair). */
export const MINI_BOSS_IDS: readonly string[] = ['alphaWolf', 'giantToad', 'boneCaptain', 'goblinChief'];

export const MONSTERS: ReadonlyMap<string, MonsterDef> = new Map(LIST.map((m) => [m.id, m]));

/** Goblin King HP multiplier by party size (1, 2, 3 members). */
export const BOSS_HP_SCALE: readonly number[] = [0.75, 1.7, 2.4];

/** Max enemies per random encounter while the hero is alone. */
export const SOLO_MAX_ENEMIES = 2;

const TABLE_LIST: EncounterTable[] = [
  {
    id: 'greenwood',
    rate: 1 / 18,
    groups: [
      { monsterIds: ['slime'], weight: 4 },
      { monsterIds: ['slime', 'slime'], weight: 3 },
      { monsterIds: ['giantBat'], weight: 3 },
      { monsterIds: ['wolf'], weight: 2 },
      { monsterIds: ['slime', 'giantBat'], weight: 2 },
      { monsterIds: ['slime', 'slime', 'slime'], weight: 1 },
    ],
  },
  {
    id: 'forest',
    rate: 1 / 12,
    groups: [
      { monsterIds: ['wolf'], weight: 4 },
      { monsterIds: ['giantBat', 'giantBat'], weight: 2 },
      { monsterIds: ['goblin'], weight: 3 },
      { monsterIds: ['wolf', 'slime'], weight: 2 },
      { monsterIds: ['wolf', 'wolf', 'giantBat'], weight: 1 },
    ],
  },
  {
    id: 'hills',
    rate: 1 / 14,
    groups: [
      { monsterIds: ['goblin'], weight: 4 },
      { monsterIds: ['wolf', 'wolf'], weight: 2 },
      { monsterIds: ['goblin', 'slime'], weight: 2 },
      { monsterIds: ['skeleton'], weight: 1 },
      { monsterIds: ['goblin', 'goblin', 'wolf'], weight: 1 },
    ],
  },
  {
    id: 'cave',
    rate: 1 / 12,
    groups: [
      { monsterIds: ['goblin'], weight: 3 },
      { monsterIds: ['skeleton'], weight: 3 },
      { monsterIds: ['giantBat', 'giantBat'], weight: 2 },
      { monsterIds: ['goblin', 'skeleton'], weight: 2 },
      { monsterIds: ['goblin', 'goblin', 'giantBat'], weight: 1 },
    ],
  },
  {
    id: 'den',
    rate: 1 / 12,
    groups: [
      { monsterIds: ['wolf'], weight: 3 },
      { monsterIds: ['wolf', 'wolf'], weight: 3 },
      { monsterIds: ['giantBat', 'wolf'], weight: 2 },
      { monsterIds: ['wolf', 'wolf', 'giantBat'], weight: 1 },
    ],
  },
];

export const ENCOUNTER_TABLES: ReadonlyMap<string, EncounterTable> = new Map(TABLE_LIST.map((t) => [t.id, t]));
