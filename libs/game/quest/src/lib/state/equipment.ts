import { Stats } from '@jouster/game/engine';
import { classDef } from '../data/classes';
import { WEAPONS } from '../data/equipment';
import { ArmorSlot, GEAR, gearUsableBy } from '../data/gear';
import type { GameState } from './game-state';
import { PartyMember, memberStats } from './party';

/** Every equipment slot, in menu order (plan 15.4). */
export type GearSlot = 'weapon' | ArmorSlot;
export const GEAR_SLOTS: readonly GearSlot[] = ['weapon', 'armor', 'shield', 'accessory'];

const SLOT_FIELD: Readonly<Record<ArmorSlot, 'armorId' | 'shieldId' | 'accessoryId'>> = {
  armor: 'armorId',
  shield: 'shieldId',
  accessory: 'accessoryId',
};

/** The id worn in a slot, or undefined when empty. */
export function equippedId(m: PartyMember, slot: GearSlot): string | undefined {
  return slot === 'weapon' ? m.weaponId : m[SLOT_FIELD[slot]];
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

/** True when the class can use anything at all in this slot (shields are Warrior/Paladin only). */
export function slotUsable(m: PartyMember, slot: GearSlot): boolean {
  return slot === 'weapon' || [...GEAR.values()].some((g) => g.slot === slot && gearUsableBy(g, m.classId));
}

/** Carried items this member could put in the slot. */
export function equipChoices(state: GameState, m: PartyMember, slot: GearSlot): string[] {
  return Object.keys(state.inventory).filter(
    (id) => (state.inventory[id] ?? 0) > 0 && slotOf(id) === slot && canEquip(m, id) && equippedId(m, slot) !== id,
  );
}

function setSlot(m: PartyMember, slot: GearSlot, id: string | undefined): void {
  if (slot === 'weapon') {
    if (id) {
      m.weaponId = id;
    }
    return;
  }
  if (id) {
    m[SLOT_FIELD[slot]] = id;
  } else {
    delete m[SLOT_FIELD[slot]];
  }
}

/** Stats this member would have with `id` in the slot (undefined = slot emptied). */
export function previewStats(m: PartyMember, slot: GearSlot, id: string | undefined): Stats {
  const copy = { ...m };
  setSlot(copy, slot, id);
  return memberStats(copy);
}

/** Keeps HP/MP within the (possibly lower) maximums after a gear change. */
function clampToMax(m: PartyMember): void {
  const s = memberStats(m);
  m.hp = Math.min(m.hp, s.hp);
  m.mp = Math.min(m.mp, s.mp);
}

function addItem(state: Pick<GameState, 'inventory'>, id: string, count = 1): void {
  state.inventory[id] = (state.inventory[id] ?? 0) + count;
}

function removeOne(state: GameState, id: string): void {
  addItem(state, id, -1);
  if ((state.inventory[id] ?? 0) <= 0) {
    delete state.inventory[id];
  }
}

/**
 * Equips a carried item; the piece it replaces goes back into the bag. Returns the replaced id (or null when the
 * slot was empty), or false when the member cannot use it or it is not carried.
 */
export function equipItem(state: GameState, m: PartyMember, id: string): string | null | false {
  const slot = slotOf(id);
  if (!slot || (state.inventory[id] ?? 0) <= 0 || !canEquip(m, id)) {
    return false;
  }
  const old = equippedId(m, slot);
  removeOne(state, id);
  if (old) {
    addItem(state, old);
  }
  setSlot(m, slot, id);
  clampToMax(m);
  return old ?? null;
}

/** Takes off armor, shield or accessory into the bag (a weapon can only be swapped). */
export function unequipSlot(state: GameState, m: PartyMember, slot: GearSlot): boolean {
  const old = equippedId(m, slot);
  if (slot === 'weapon' || !old) {
    return false;
  }
  addItem(state, old);
  setSlot(m, slot, undefined);
  clampToMax(m);
  return true;
}

/**
 * When a companion leaves the party their bought gear returns to the bag (their class's starting weapon stays
 * with them), so nothing paid for is lost.
 */
export function returnGear(state: GameState, m: PartyMember): void {
  (['armor', 'shield', 'accessory'] as const).forEach((slot) => unequipSlot(state, m, slot));
  if (m.weaponId !== classDef(m.classId).startingWeaponId) {
    addItem(state, m.weaponId);
    m.weaponId = classDef(m.classId).startingWeaponId;
  }
}

/** Short "ATK 9>12 DEF 4>6" text of the stats that change. */
export function statChangeText(before: Stats, after: Stats): string {
  return (Object.keys(before) as Array<keyof Stats>)
    .filter((k) => before[k] !== after[k])
    .map((k) => `${k.toUpperCase()} ${before[k]}>${after[k]}`)
    .join(' ');
}
