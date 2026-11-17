import { Stats } from '@jouster/game/engine';
import { classDef } from '../data/classes';
import { WEAPONS } from '../data/equipment';
import { ArmorSlot, GEAR, GearSlot, gearUsableBy } from '../data/gear';
import type { GameState } from './game-state';
import { GearItem, GearRoll, baseInfo } from './loot';
import { PartyMember, memberStats } from './party';

export type { GearSlot } from '../data/gear';
/** Every equipment slot, in menu order (plan 15.4). */
export const GEAR_SLOTS: readonly GearSlot[] = ['weapon', 'armor', 'shield', 'accessory'];

/** Most pieces of gear the bag holds; consumables don't count (plan 33.4). */
export const BAG_LIMIT = 40;

const SLOT_FIELD: Readonly<Record<ArmorSlot, 'armorId' | 'shieldId' | 'accessoryId'>> = {
  armor: 'armorId',
  shield: 'shieldId',
  accessory: 'accessoryId',
};

/** The id worn in a slot, or undefined when empty. */
export function equippedId(m: PartyMember, slot: GearSlot): string | undefined {
  return slot === 'weapon' ? m.weaponId : m[SLOT_FIELD[slot]];
}

/**
 * The piece worn in a slot with its rarity and bonuses; a slot without a matching `worn` entry holds a plain Common
 * (uid 0 until it is taken off). Undefined when the slot is empty.
 */
export function equippedItem(m: PartyMember, slot: GearSlot): GearRoll | undefined {
  const id = equippedId(m, slot);
  if (!id) {
    return undefined;
  }
  const worn = m.worn?.[slot];
  return worn && worn.baseId === id ? worn : { baseId: id, rarity: 'common', bonus: {} };
}

/** Which slot an item id goes in, or null for consumables. */
export function slotOf(id: string): GearSlot | null {
  if (WEAPONS.has(id)) {
    return 'weapon';
  }
  return GEAR.get(id)?.slot ?? null;
}

/** True when this member's class can use the weapon or gear. */
export function canEquip(m: PartyMember, id: string): boolean {
  const w = WEAPONS.get(id);
  if (w) {
    return classDef(m.classId).weaponFamily === w.family;
  }
  const g = GEAR.get(id);
  return g !== undefined && gearUsableBy(g, m.classId);
}

/** True when the class can use anything at all in this slot (shields are Warrior only). */
export function slotUsable(m: PartyMember, slot: GearSlot): boolean {
  return slot === 'weapon' || [...GEAR.values()].some((g) => g.slot === slot && gearUsableBy(g, m.classId));
}

/** True when the bag holds as much gear as it can. */
export function bagFull(state: Pick<GameState, 'gear'>): boolean {
  return state.gear.length >= BAG_LIMIT;
}

/** Gives a rolled piece its uid. */
export function createGear(state: Pick<GameState, 'nextGearUid'>, roll: GearRoll): GearItem {
  return { ...roll, bonus: { ...roll.bonus }, uid: state.nextGearUid++ };
}

/** Puts a piece in the bag; false (and nothing added) when the bag is full. */
export function addToBag(state: Pick<GameState, 'gear'>, item: GearItem): boolean {
  if (bagFull(state)) {
    return false;
  }
  state.gear.push(item);
  return true;
}

/** Puts a piece in the bag, or in `pendingGear` to be sorted out on the field when the bag is full. */
export function stashGear(state: GameState, item: GearItem): void {
  if (!addToBag(state, item)) {
    (state.pendingGear ??= []).push(item);
  }
}

/** Takes a piece out of the bag by uid. */
export function removeFromBag(state: Pick<GameState, 'gear'>, uid: number): GearItem | undefined {
  const i = state.gear.findIndex((g) => g.uid === uid);
  return i < 0 ? undefined : state.gear.splice(i, 1)[0];
}

/** A plain Common bought from a shop, in the bag; null when the bag is full (plan 33.5). */
export function buyGear(state: GameState, baseId: string): GearItem | null {
  if (bagFull(state) || !baseInfo(baseId)) {
    return null;
  }
  const item = createGear(state, { baseId, rarity: 'common', bonus: {} });
  state.gear.push(item);
  return item;
}

/** Bag pieces this member could put in the slot (anything but what is already there). */
export function equipChoices(state: GameState, m: PartyMember, slot: GearSlot): GearItem[] {
  return state.gear.filter((g) => slotOf(g.baseId) === slot && canEquip(m, g.baseId));
}

function setSlot(m: PartyMember, slot: GearSlot, item: GearItem | undefined): void {
  if (slot === 'weapon') {
    if (item) {
      m.weaponId = item.baseId;
    }
  } else if (item) {
    m[SLOT_FIELD[slot]] = item.baseId;
  } else {
    delete m[SLOT_FIELD[slot]];
  }
  if (item && (item.rarity !== 'common' || Object.keys(item.bonus).length > 0)) {
    m.worn = { ...m.worn, [slot]: item };
  } else if (m.worn?.[slot]) {
    const worn = { ...m.worn };
    delete worn[slot];
    if (Object.keys(worn).length > 0) {
      m.worn = worn;
    } else {
      delete m.worn;
    }
  }
}

/** Stats this member would have with `item` in the slot (undefined = slot emptied). */
export function previewStats(m: PartyMember, slot: GearSlot, item: GearItem | undefined): Stats {
  const copy: PartyMember = { ...m, worn: m.worn ? { ...m.worn } : undefined };
  setSlot(copy, slot, item);
  return memberStats(copy);
}

/** Keeps HP/MP within the (possibly lower) maximums after a gear change. */
function clampToMax(m: PartyMember): void {
  const s = memberStats(m);
  m.hp = Math.min(m.hp, s.hp);
  m.mp = Math.min(m.mp, s.mp);
}

/** The worn piece as a bag item, with a fresh uid when it was an implicit plain Common. */
function takeOff(state: GameState, m: PartyMember, slot: GearSlot): GearItem | undefined {
  const worn = equippedItem(m, slot);
  if (!worn) {
    return undefined;
  }
  return 'uid' in worn ? (worn as GearItem) : createGear(state, worn);
}

/**
 * Equips a bag piece by uid; the piece it replaces goes into the bag. Returns the replaced piece (or null when the
 * slot was empty), or false when the member cannot use it or it is not in the bag.
 */
export function equipItem(state: GameState, m: PartyMember, uid: number): GearItem | null | false {
  const item = state.gear.find((g) => g.uid === uid);
  const slot = item ? slotOf(item.baseId) : null;
  if (!item || !slot || !canEquip(m, item.baseId)) {
    return false;
  }
  const old = takeOff(state, m, slot);
  removeFromBag(state, uid);
  if (old) {
    state.gear.push(old);
  }
  setSlot(m, slot, item);
  clampToMax(m);
  return old ?? null;
}

/** Takes off armor, shield or accessory into the bag (a weapon can only be swapped); false when the bag is full. */
export function unequipSlot(state: GameState, m: PartyMember, slot: GearSlot): boolean {
  if (slot === 'weapon' || !equippedId(m, slot) || bagFull(state)) {
    return false;
  }
  const old = takeOff(state, m, slot);
  if (old) {
    state.gear.push(old);
  }
  setSlot(m, slot, undefined);
  clampToMax(m);
  return true;
}

/**
 * When a companion leaves the party their gear returns to the bag (their class's starting weapon stays with them),
 * so nothing is lost; pieces that don't fit wait in `pendingGear`.
 */
export function returnGear(state: GameState, m: PartyMember): void {
  for (const slot of ['armor', 'shield', 'accessory'] as const) {
    const old = takeOff(state, m, slot);
    if (old) {
      stashGear(state, old);
      setSlot(m, slot, undefined);
    }
  }
  const start = classDef(m.classId).startingWeaponId;
  const weapon = takeOff(state, m, 'weapon');
  if (weapon && (m.weaponId !== start || weapon.rarity !== 'common' || Object.keys(weapon.bonus).length > 0)) {
    stashGear(state, weapon);
  }
  m.weaponId = start;
  delete m.worn;
  clampToMax(m);
}

/** Short "ATK 9>12 DEF 4>6" text of the stats that change. */
export function statChangeText(before: Stats, after: Stats): string {
  return (Object.keys(before) as Array<keyof Stats>)
    .filter((k) => before[k] !== after[k])
    .map((k) => `${k.toUpperCase()} ${before[k]}>${after[k]}`)
    .join(' ');
}
