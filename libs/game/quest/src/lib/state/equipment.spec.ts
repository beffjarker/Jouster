import { createRng } from '@jouster/game/engine';
import { ARMOR_SHOP_STOCK, GEAR, NORTH_ARMOR_STOCK, SOUTH_ARMOR_STOCK, gearDef } from '../data/gear';
import {
  canEquip,
  equipChoices,
  equipItem,
  equippedId,
  previewStats,
  returnGear,
  slotUsable,
  statChangeText,
  unequipSlot,
} from './equipment';
import { GameState, hasSave, loadGame, memoryStorage, newGameState, recruitCompanion, saveGame } from './game-state';
import { createMember, memberStats } from './party';

function state(): GameState {
  return newGameState('A', 'warrior', createRng(3));
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
    s.inventory['clothRobe'] = 1;
    s.inventory['chainMail'] = 1;
    expect(equipItem(s, hero, 'clothRobe')).toBeNull();
    expect(s.inventory['clothRobe']).toBeUndefined();
    expect(equipItem(s, hero, 'chainMail')).toBe('clothRobe');
    expect(equippedId(hero, 'armor')).toBe('chainMail');
    expect(s.inventory['clothRobe']).toBe(1);
    expect(equipChoices(s, hero, 'armor')).toEqual(['clothRobe']);
  });

  it('refuses gear the class cannot use or that is not carried', () => {
    const s = newGameState('W', 'wizard', createRng(1));
    const wiz = s.party[0];
    s.inventory['buckler'] = 1;
    s.inventory['leatherArmor'] = 1;
    expect(canEquip(wiz, 'buckler')).toBe(false);
    expect(equipItem(s, wiz, 'buckler')).toBe(false);
    expect(equipItem(s, wiz, 'leatherArmor')).toBe(false);
    expect(equipItem(s, wiz, 'sageRobe')).toBe(false);
    expect(slotUsable(wiz, 'shield')).toBe(false);
    expect(slotUsable(wiz, 'armor')).toBe(true);
  });

  it('clamps HP when +HP gear comes off', () => {
    const s = state();
    const hero = s.party[0];
    s.inventory['vigorRing'] = 1;
    equipItem(s, hero, 'vigorRing');
    hero.hp = memberStats(hero).hp;
    expect(unequipSlot(s, hero, 'accessory')).toBe(true);
    expect(hero.hp).toBe(memberStats(hero).hp);
    expect(s.inventory['vigorRing']).toBe(1);
    expect(unequipSlot(s, hero, 'weapon')).toBe(false);
  });

  it('previews the stat change without touching the member', () => {
    const hero = createMember('h', 'H', 'warrior', 1);
    const before = memberStats(hero);
    const after = previewStats(hero, 'armor', 'chainMail');
    expect(statChangeText(before, after)).toBe(`DEF ${before.def}>${before.def + 3}`);
    expect(hero.armorId).toBeUndefined();
  });

  it('returns bought gear to the bag when a companion leaves', () => {
    const s = state();
    const m = createMember('tavern', 'B', 'paladin', 4);
    m.armorId = 'plateArmor';
    m.weaponId = 'oathBlade';
    returnGear(s, m);
    expect(m.armorId).toBeUndefined();
    expect(s.inventory['plateArmor']).toBe(1);
    expect(s.inventory['oathBlade']).toBe(1);
    expect(m.weaponId).toBe('knightBlade');
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
    expect(s.inventory['sageCharm']).toBe(1);
  });

  it('saves and loads worn gear, and rejects unknown gear ids', () => {
    const s = state();
    s.party[0].armorId = 'chainMail';
    const store = memoryStorage();
    saveGame(store, s);
    expect(loadGame(store)?.party[0].armorId).toBe('chainMail');
    s.party[0].armorId = 'nope';
    saveGame(store, s);
    expect(hasSave(store)).toBe(false);
  });

  it('has a sane catalogue sold by the armorer', () => {
    expect(ARMOR_SHOP_STOCK.length + SOUTH_ARMOR_STOCK.length + NORTH_ARMOR_STOCK.length).toBe(GEAR.size);
    for (const g of GEAR.values()) {
      expect(g.price).toBeGreaterThan(0);
      expect(g.description.length).toBeGreaterThan(0);
      expect(g.description.length).toBeLessThanOrEqual(58);
      const { hp = 0, ...stats } = g.bonus;
      expect(hp).toBeLessThanOrEqual(12);
      expect(Math.max(0, ...Object.values(stats))).toBeLessThanOrEqual(9);
    }
    expect(gearDef('buckler').classes).toEqual(['warrior', 'paladin']);
  });
});
