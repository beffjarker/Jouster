import { ClassId, Stats } from '@jouster/game/engine';

/** Body slots besides the weapon (plan 15.4). */
export type ArmorSlot = 'armor' | 'shield' | 'accessory';

/** Armor, shields and accessories. Bonuses are added to the wearer's stats. */
export interface GearDef {
  id: string;
  name: string;
  slot: ArmorSlot;
  tier: number;
  bonus: Partial<Pick<Stats, 'hp' | 'mp' | 'atk' | 'def' | 'agi' | 'mag'>>;
  /** Classes that can wear it; omitted = everyone. */
  classes?: readonly ClassId[];
  price: number;
  description: string;
}

const HEAVY: readonly ClassId[] = ['warrior', 'paladin'];

/**
 * Enemy damage was tuned without armor, so DEF stays modest (tier 1 up to +2, tier 2 up to +4,
 * tier 3 - sold in Sandhollow - up to +6).
 */
const GEAR_LIST: GearDef[] = [
  { id: 'clothRobe', name: 'Cloth Robe', slot: 'armor', tier: 1, bonus: { def: 1 }, price: 30, description: 'Padded cloth. Anyone can wear it.' },
  {
    id: 'leatherArmor',
    name: 'Leather Armor',
    slot: 'armor',
    tier: 1,
    bonus: { def: 2 },
    classes: ['warrior', 'paladin', 'cleric', 'rogue', 'ranger'],
    price: 70,
    description: 'Boiled leather. Light and quiet.',
  },
  {
    id: 'sageRobe',
    name: 'Sage Robe',
    slot: 'armor',
    tier: 2,
    bonus: { def: 2, mag: 2 },
    classes: ['wizard', 'cleric'],
    price: 140,
    description: 'Woven with runes. Wizards and clerics.',
  },
  {
    id: 'chainMail',
    name: 'Chain Mail',
    slot: 'armor',
    tier: 2,
    bonus: { def: 3 },
    classes: ['warrior', 'paladin', 'cleric', 'ranger'],
    price: 160,
    description: 'Riveted rings over a padded coat.',
  },
  {
    id: 'plateArmor',
    name: 'Plate Armor',
    slot: 'armor',
    tier: 2,
    bonus: { def: 4, hp: 6 },
    classes: HEAVY,
    price: 240,
    description: 'Full steel plate. Warriors and paladins.',
  },
  { id: 'buckler', name: 'Buckler', slot: 'shield', tier: 1, bonus: { def: 1 }, classes: HEAVY, price: 40, description: 'A small round shield.' },
  {
    id: 'kiteShield',
    name: 'Kite Shield',
    slot: 'shield',
    tier: 2,
    bonus: { def: 2 },
    classes: HEAVY,
    price: 120,
    description: 'Tall shield that guards the legs.',
  },
  { id: 'vigorRing', name: 'Ring of Vigor', slot: 'accessory', tier: 1, bonus: { hp: 8 }, price: 90, description: 'A warm red stone.' },
  { id: 'swiftBoots', name: 'Swift Boots', slot: 'accessory', tier: 1, bonus: { agi: 2 }, price: 90, description: 'Soft boots that never slip.' },
  { id: 'sageCharm', name: 'Sage Charm', slot: 'accessory', tier: 2, bonus: { mag: 2 }, price: 100, description: 'An owl feather on a cord.' },
  // --- Tier 3: Sandhollow (Act II) -------------------------------------------------------------
  {
    id: 'mirageRobe',
    name: 'Mirage Robe',
    slot: 'armor',
    tier: 3,
    bonus: { def: 3, mag: 3 },
    classes: ['wizard', 'cleric'],
    price: 260,
    description: 'Silk that bends the light. Wizards and clerics.',
  },
  {
    id: 'shadowLeather',
    name: 'Shadow Leather',
    slot: 'armor',
    tier: 3,
    bonus: { def: 4, agi: 2 },
    classes: ['rogue', 'ranger'],
    price: 280,
    description: 'Dyed black, stitched silent. Rogues and rangers.',
  },
  {
    id: 'scaleMail',
    name: 'Scale Mail',
    slot: 'armor',
    tier: 3,
    bonus: { def: 5 },
    classes: ['warrior', 'paladin', 'cleric', 'ranger'],
    price: 300,
    description: 'Overlapping sunsteel scales.',
  },
  {
    id: 'sunPlate',
    name: 'Sun Plate',
    slot: 'armor',
    tier: 3,
    bonus: { def: 6, hp: 8 },
    classes: HEAVY,
    price: 420,
    description: 'Gilded plate. Warriors and paladins.',
  },
  {
    id: 'towerShield',
    name: 'Tower Shield',
    slot: 'shield',
    tier: 3,
    bonus: { def: 3 },
    classes: HEAVY,
    price: 240,
    description: 'A wall of oak and bronze.',
  },
  { id: 'scarabAmulet', name: 'Scarab Amulet', slot: 'accessory', tier: 3, bonus: { def: 2, hp: 8 }, price: 220, description: 'A blue beetle in gold.' },
  // --- Tier 4: Frostgate (Act III) -------------------------------------------------------------
  {
    id: 'auroraRobe',
    name: 'Aurora Robe',
    slot: 'armor',
    tier: 4,
    bonus: { def: 5, mag: 4 },
    classes: ['wizard', 'cleric'],
    price: 440,
    description: 'Fur-lined silk that glows faintly. Wizards and clerics.',
  },
  {
    id: 'snowcatLeather',
    name: 'Snowcat Leather',
    slot: 'armor',
    tier: 4,
    bonus: { def: 6, agi: 3 },
    classes: ['rogue', 'ranger'],
    price: 460,
    description: 'Pale hide, silent on snow. Rogues and rangers.',
  },
  {
    id: 'frostMail',
    name: 'Frost Mail',
    slot: 'armor',
    tier: 4,
    bonus: { def: 7, hp: 6 },
    classes: ['warrior', 'paladin', 'cleric', 'ranger'],
    price: 480,
    description: 'Cold-hammered rings over wool.',
  },
  {
    id: 'glacierPlate',
    name: 'Glacier Plate',
    slot: 'armor',
    tier: 4,
    bonus: { def: 9, hp: 12 },
    classes: HEAVY,
    price: 640,
    description: 'Blue-white plate. Warriors and paladins.',
  },
  {
    id: 'wyvernShield',
    name: 'Wyvern Shield',
    slot: 'shield',
    tier: 4,
    bonus: { def: 4, hp: 6 },
    classes: HEAVY,
    price: 380,
    description: 'Faced with wyvern scale.',
  },
  { id: 'frostCharm', name: 'Frost Charm', slot: 'accessory', tier: 4, bonus: { def: 3, hp: 12 }, price: 360, description: 'A snowflake in clear quartz.' },
];

export const GEAR: ReadonlyMap<string, GearDef> = new Map(GEAR_LIST.map((g) => [g.id, g]));

/** Gear ids sold by Aldmere's armorer. */
export const ARMOR_SHOP_STOCK: readonly string[] = GEAR_LIST.filter((g) => g.tier <= 2).map((g) => g.id);
/** Tier-3 gear ids sold by Sandhollow's armorer (Act II). */
export const SOUTH_ARMOR_STOCK: readonly string[] = GEAR_LIST.filter((g) => g.tier === 3).map((g) => g.id);
/** Tier-4 gear ids sold by Frostgate's armorer (Act III). */
export const NORTH_ARMOR_STOCK: readonly string[] = GEAR_LIST.filter((g) => g.tier === 4).map((g) => g.id);

export function gearDef(id: string): GearDef {
  const g = GEAR.get(id);
  if (!g) {
    throw new Error(`Unknown gear: ${id}`);
  }
  return g;
}

/** True when a class can wear this gear. */
export function gearUsableBy(def: GearDef, classId: ClassId): boolean {
  return def.classes === undefined || def.classes.includes(classId);
}

/** "DEF+2 MAG+2" */
export function gearBonusText(def: GearDef): string {
  return Object.entries(def.bonus)
    .map(([k, v]) => `${k.toUpperCase()}+${v}`)
    .join(' ');
}

/** "WIZARD, CLERIC" or "ANYONE". */
export function gearUsersText(def: GearDef): string {
  return def.classes ? def.classes.map((c) => c.toUpperCase()).join(', ') : 'ANYONE';
}
