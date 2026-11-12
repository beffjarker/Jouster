import { ItemDef, WeaponDef } from '@jouster/game/engine';

const WEAPON_LIST: WeaponDef[] = [
  { id: 'bronzeSword', name: 'Bronze Sword', family: 'sword', tier: 1, atk: 6, price: 0, description: 'A sturdy blade.' },
  { id: 'ironSword', name: 'Iron Sword', family: 'sword', tier: 2, atk: 10, price: 120, description: 'Heavier, sharper.' },
  {
    id: 'knightBlade',
    name: 'Knight Blade',
    family: 'swordShield',
    tier: 1,
    atk: 4,
    def: 2,
    price: 0,
    description: 'Sword and kite shield.',
  },
  {
    id: 'oathBlade',
    name: 'Oath Blade',
    family: 'swordShield',
    tier: 2,
    atk: 7,
    def: 4,
    price: 130,
    description: 'Blessed sword and tower shield.',
  },
  {
    id: 'oakStaff',
    name: 'Oak Staff',
    family: 'staff',
    tier: 1,
    atk: 3,
    mag: 2,
    price: 0,
    description: 'A knotted walking staff.',
  },
  {
    id: 'runeStaff',
    name: 'Rune Staff',
    family: 'staff',
    tier: 2,
    atk: 5,
    mag: 5,
    price: 110,
    description: 'Hums with power.',
  },
  {
    id: 'woodMace',
    name: 'Wooden Mace',
    family: 'mace',
    tier: 1,
    atk: 4,
    undeadMultiplier: 1.5,
    price: 0,
    description: 'Blessed oak. 1.5x vs undead.',
  },
  {
    id: 'ironMace',
    name: 'Iron Mace',
    family: 'mace',
    tier: 2,
    atk: 8,
    undeadMultiplier: 1.5,
    price: 110,
    description: 'Flanged iron. 1.5x vs undead.',
  },
  {
    id: 'twinDaggers',
    name: 'Twin Daggers',
    family: 'daggers',
    tier: 1,
    atk: 3,
    hits: 2,
    hitMultiplier: 0.6,
    price: 0,
    description: 'Strikes twice.',
  },
  {
    id: 'steelDaggers',
    name: 'Steel Daggers',
    family: 'daggers',
    tier: 2,
    atk: 6,
    hits: 2,
    hitMultiplier: 0.6,
    price: 120,
    description: 'Keen pair. Strikes twice.',
  },
  { id: 'huntKnife', name: 'Hunting Knife', family: 'knife', tier: 1, atk: 4, price: 0, description: 'Bow on the back, knife in hand.' },
  { id: 'longKnife', name: 'Long Knife', family: 'knife', tier: 2, atk: 8, price: 110, description: 'A woodsman\'s seax.' },
];

export const WEAPONS: ReadonlyMap<string, WeaponDef> = new Map(WEAPON_LIST.map((w) => [w.id, w]));

const ITEM_LIST: ItemDef[] = [
  {
    id: 'herb',
    name: 'Herb',
    description: 'Restores 25 HP.',
    effect: 'healHp',
    amount: 25,
    price: 8,
    usableInBattle: true,
    usableInField: true,
  },
  {
    id: 'tonic',
    name: 'Tonic',
    description: 'Restores 10 MP.',
    effect: 'healMp',
    amount: 10,
    price: 20,
    usableInBattle: true,
    usableInField: true,
  },
  {
    id: 'phoenixFeather',
    name: 'Phoenix Feather',
    description: 'Revives an ally with 50% HP.',
    effect: 'revive',
    amount: 0.5,
    price: 60,
    usableInBattle: true,
    usableInField: true,
  },
];

export const ITEMS: ReadonlyMap<string, ItemDef> = new Map(ITEM_LIST.map((i) => [i.id, i]));

/** Weapon ids sold in Aldmere's weapon shop. */
export const WEAPON_SHOP_STOCK: readonly string[] = WEAPON_LIST.filter((w) => w.tier === 2).map((w) => w.id);
/** Item ids sold in Aldmere's item shop. */
export const ITEM_SHOP_STOCK: readonly string[] = ['herb', 'tonic', 'phoenixFeather'];
