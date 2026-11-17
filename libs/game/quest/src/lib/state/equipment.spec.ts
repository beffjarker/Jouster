import { createRng } from '@jouster/game/engine';
import { ARMOR_SHOP_STOCK, EMBER_ARMOR_STOCK, GEAR, NORTH_ARMOR_STOCK, SOUTH_ARMOR_STOCK, gearDef } from '../data/gear';
import {
  BAG_LIMIT,
  addToBag,
  bagFull,
  buyGear,
  canEquip,
  createGear,
  equipChoices,
  equipItem,
  equippedId,
  equippedItem,
  previewStats,
  returnGear,
  slotUsable,
  stashGear,
  statChangeText,
  unequipSlot,
} from './equipment';
import { GameState, hasSave, loadGame, memoryStorage, newGameState, recruitCompanion, saveGame } from './game-state';
import { GearItem } from './loot';
import { createMember, memberStats } from './party';

function state(): GameState {
  return newGameState('A', 'warrior', createRng(3));
}

/** A plain Common in the bag. */
function give(s: GameState, id: string): GearItem {
  const item = buyGear(s, id);
  if (!item) {
    throw new Error(`cannot give ${id}`);
  }
  return item;
}

function fillBag(s: GameState): void {
  while (!bagFull(s)) {
    give(s, 'clothRobe');
  }
}

function baseIds(s: GameState): string[] {
  return s.gear.map((g) => g.baseId);
}

describe('equipment (plan 15.4)', () => {
  it('adds worn gear bonuses to stats', () => {
    const m = createMember('h', 'H', 'warrior', 3);
    const base = memberStats(m);
    m.armorId = 'plateArmor';
    m.shieldId = 'kiteShield';
    m.accessoryId = 'swiftBoots';
    const s = memberStats(m);
    expect(s.def).toBe(base.def + 6);
    expect(s.hp).toBe(base.hp + 6);
    expect(s.agi).toBe(base.agi + 2);
  });

  it('equips from the bag and puts the old piece back', () => {
    const s = state();
    const hero = s.party[0];
    const robe = give(s, 'clothRobe');
    const mail = give(s, 'chainMail');
    expect(equipItem(s, hero, robe.uid)).toBeNull();
    expect(baseIds(s)).toEqual(['chainMail']);
    // A worn plain Common keeps no uid; it gets a fresh one when it comes off.
    const back = { baseId: 'clothRobe', rarity: 'common', bonus: {} };
    expect(equipItem(s, hero, mail.uid)).toMatchObject(back);
    expect(equippedId(hero, 'armor')).toBe('chainMail');
    expect(equipChoices(s, hero, 'armor')).toMatchObject([back]);
    expect(equipChoices(s, hero, 'armor')[0].uid).not.toBe(robe.uid);
    expect(hero.worn).toBeUndefined();
  });

  it('refuses gear the class cannot use or that is not carried', () => {
    const s = newGameState('W', 'wizard', createRng(1));
    const wiz = s.party[0];
    const buckler = give(s, 'buckler');
    expect(canEquip(wiz, 'buckler')).toBe(false);
    expect(equipItem(s, wiz, buckler.uid)).toBe(false);
    expect(equipItem(s, wiz, 999)).toBe(false);
    expect(slotUsable(wiz, 'shield')).toBe(false);
    expect(slotUsable(wiz, 'armor')).toBe(true);
  });

  it('clamps HP when +HP gear comes off', () => {
    const s = state();
    const hero = s.party[0];
    equipItem(s, hero, give(s, 'vigorRing').uid);
    hero.hp = memberStats(hero).hp;
    expect(unequipSlot(s, hero, 'accessory')).toBe(true);
    expect(hero.hp).toBe(memberStats(hero).hp);
    expect(baseIds(s)).toEqual(['vigorRing']);
    expect(unequipSlot(s, hero, 'weapon')).toBe(false);
    expect(unequipSlot(s, hero, 'accessory')).toBe(false);
  });

  it('previews the stat change without touching the member', () => {
    const s = state();
    const hero = createMember('h', 'H', 'warrior', 1);
    const before = memberStats(hero);
    const after = previewStats(hero, 'armor', give(s, 'chainMail'));
    expect(statChangeText(before, after)).toBe(`DEF ${before.def}>${before.def + 3}`);
    expect(hero.armorId).toBeUndefined();
    expect(previewStats(hero, 'armor', undefined)).toEqual(before);
  });

  it('adds rarity bonuses of worn pieces and keeps them when taken off (plan 33)', () => {
    const s = state();
    const hero = s.party[0];
    const base = memberStats(hero);
    const rare = createGear(s, { baseId: 'chainMail', rarity: 'rare', bonus: { def: 2, agi: 3 } });
    addToBag(s, rare);
    expect(equipItem(s, hero, rare.uid)).toBeNull();
    expect(equippedItem(hero, 'armor')).toEqual(rare);
    const worn = memberStats(hero);
    expect(worn.def).toBe(base.def + 3 + 2);
    expect(worn.agi).toBe(base.agi + 3);
    expect(unequipSlot(s, hero, 'armor')).toBe(true);
    expect(s.gear).toEqual([rare]);
    expect(hero.worn).toBeUndefined();
    expect(memberStats(hero)).toEqual(base);
  });

  it('ignores a worn entry that no longer matches the slot', () => {
    const hero = createMember('h', 'H', 'warrior', 3);
    const base = memberStats(hero);
    hero.worn = { armor: { uid: 1, baseId: 'chainMail', rarity: 'epic', bonus: { atk: 5 } } };
    expect(memberStats(hero)).toEqual(base);
    expect(equippedItem(hero, 'armor')).toBeUndefined();
  });

  it('gives a fresh uid to a plain piece taken off', () => {
    const s = state();
    const hero = s.party[0];
    const before = s.nextGearUid;
    const sword = give(s, 'ironSword');
    const old = equipItem(s, hero, sword.uid);
    expect(old).toMatchObject({ baseId: 'bronzeSword', rarity: 'common', uid: before + 1 });
    expect(s.nextGearUid).toBe(before + 2);
  });

  it('keeps the bag at its limit', () => {
    const s = state();
    const hero = s.party[0];
    equipItem(s, hero, give(s, 'vigorRing').uid);
    fillBag(s);
    expect(s.gear).toHaveLength(BAG_LIMIT);
    expect(buyGear(s, 'chainMail')).toBeNull();
    expect(addToBag(s, createGear(s, { baseId: 'chainMail', rarity: 'common', bonus: {} }))).toBe(false);
    expect(unequipSlot(s, hero, 'accessory')).toBe(false);
    const extra = createGear(s, { baseId: 'leatherArmor', rarity: 'uncommon', bonus: { hp: 4 } });
    stashGear(s, extra);
    expect(s.pendingGear).toEqual([extra]);
    expect(s.gear).toHaveLength(BAG_LIMIT);
  });

  it('swaps pieces when the bag is full', () => {
    const s = state();
    const hero = s.party[0];
    fillBag(s);
    s.gear[0] = createGear(s, { baseId: 'chainMail', rarity: 'common', bonus: {} });
    expect(equipItem(s, hero, s.gear[0].uid)).toBeNull();
    expect(s.gear).toHaveLength(BAG_LIMIT - 1);
  });

  it('returns gear to the bag when a companion leaves', () => {
    const s = state();
    const m = createMember('tavern', 'B', 'warrior', 4);
    m.armorId = 'plateArmor';
    m.weaponId = 'ironSword';
    returnGear(s, m);
    expect(m.armorId).toBeUndefined();
    expect(baseIds(s).sort()).toEqual(['ironSword', 'plateArmor']);
    expect(m.weaponId).toBe('bronzeSword');
  });

  it('keeps a rare starting weapon when a companion leaves', () => {
    const s = state();
    const m = createMember('tavern', 'B', 'warrior', 4);
    m.worn = { weapon: createGear(s, { baseId: 'bronzeSword', rarity: 'rare', bonus: { atk: 2 } }) };
    returnGear(s, m);
    expect(s.gear).toMatchObject([{ baseId: 'bronzeSword', rarity: 'rare' }]);
    expect(m.weaponId).toBe('bronzeSword');
    expect(m.worn).toBeUndefined();
  });

  it('strips gear from the member swapped out of a full party', () => {
    const s = state();
    s.flags['bossDefeated'] = true;
    for (const id of Object.keys(s.companions)) {
      s.quests[id] = 'done';
    }
    const [a, b, c] = Object.keys(s.companions);
    expect(recruitCompanion(s, a)).toBe(true);
    expect(recruitCompanion(s, b)).toBe(true);
    s.party[1].accessoryId = 'sageCharm';
    expect(recruitCompanion(s, c, a)).toBe(true);
    expect(baseIds(s)).toContain('sageCharm');
  });

  it('saves and loads worn gear, and rejects unknown gear ids', () => {
    const s = state();
    s.party[0].armorId = 'chainMail';
    const store = memoryStorage();
    const epic = createGear(s, { baseId: 'vigorRing', rarity: 'epic', bonus: { atk: 2, def: 1, hp: 6 } });
    addToBag(s, epic);
    saveGame(store, s);
    const loaded = loadGame(store);
    expect(loaded?.party[0].armorId).toBe('chainMail');
    expect(loaded?.gear).toEqual([epic]);
    s.gear.push({ ...epic, uid: s.nextGearUid + 5 });
    saveGame(store, s);
    expect(hasSave(store)).toBe(false);
    s.gear.pop();
    s.party[0].armorId = 'nope';
    saveGame(store, s);
    expect(hasSave(store)).toBe(false);
  });

  it('has a sane catalogue sold by the armorer', () => {
    expect(ARMOR_SHOP_STOCK.length + SOUTH_ARMOR_STOCK.length + NORTH_ARMOR_STOCK.length + EMBER_ARMOR_STOCK.length).toBe(
      GEAR.size,
    );
    for (const g of GEAR.values()) {
      expect(g.price).toBeGreaterThan(0);
      expect(g.description.length).toBeGreaterThan(0);
      expect(g.description.length).toBeLessThanOrEqual(58);
      const { hp = 0, ...stats } = g.bonus;
      expect(hp).toBeLessThanOrEqual(12);
      expect(Math.max(0, ...Object.values(stats))).toBeLessThanOrEqual(9);
    }
    expect(gearDef('buckler').classes).toEqual(['warrior']);
  });
});
