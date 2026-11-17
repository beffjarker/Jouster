import { GLYPHS, createRng } from '@jouster/game/engine';
import { WEAPONS } from '../data/equipment';
import { GEAR } from '../data/gear';
import { MONSTERS } from '../data/monsters';
import { LEGENDARY_BOSS_IDS, LOOT_TIER, RARITY_ODDS, RARITY_ORDER, Rarity, lootSource } from '../data/rarity';
import {
  BONUS_STATS,
  GearRoll,
  bonusCount,
  bonusRange,
  bonusText,
  baseInfo,
  gearSellPrice,
  gearValue,
  isPlain,
  isPrecious,
  isValidGearItem,
  itemLabel,
  itemName,
  legendaryFlag,
  pickBase,
  rarityName,
  rollBonus,
  rollLoot,
  rollRarity,
} from './loot';

const ROLLS = 10000;

function counts(roll: () => Rarity): Record<Rarity, number> {
  const c: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
  for (let i = 0; i < ROLLS; i++) {
    c[roll()]++;
  }
  return c;
}

describe('loot and rarity (plan 33)', () => {
  it.each(['common', 'miniBoss', 'boss'] as const)('rolls %s rarities at the planned odds (within 2%%)', (source) => {
    const rng = createRng(11);
    const c = counts(() => rollRarity(rng, RARITY_ODDS[source], true));
    for (const r of RARITY_ORDER) {
      expect(Math.abs(c[r] / ROLLS - (RARITY_ODDS[source][r] ?? 0) / 100)).toBeLessThan(0.02);
    }
  });

  it('turns a Legendary into an Epic when it is not allowed', () => {
    const rng = createRng(5);
    const c = counts(() => rollRarity(rng, RARITY_ODDS.boss, false));
    expect(c.legendary).toBe(0);
    expect(Math.abs(c.epic / ROLLS - 0.4)).toBeLessThan(0.02);
  });

  it('rolls the right number of distinct bonuses within range', () => {
    const rng = createRng(7);
    for (const rarity of RARITY_ORDER) {
      for (let i = 0; i < 300; i++) {
        const baseId = i % 2 ? 'ironSword' : 'chainMail';
        const bonus = rollBonus(rng, baseId, rarity);
        const n = bonusCount({ baseId, rarity, bonus });
        const expected = { common: [0, 1], uncommon: [1], rare: [2], epic: [3], legendary: [4] }[rarity];
        expect(expected).toContain(n);
        expect(Object.keys(bonus)).toHaveLength(n);
        const tier = baseInfo(baseId)?.tier ?? 1;
        for (const stat of BONUS_STATS) {
          const v = bonus[stat];
          if (v === undefined) {
            continue;
          }
          const [lo, hi] = bonusRange(stat, tier);
          expect(v).toBeGreaterThanOrEqual(lo);
          expect(v).toBeLessThanOrEqual(hi);
          if (rarity === 'legendary') {
            expect(v).toBe(hi);
          }
        }
      }
    }
  });

  it('gives about 30% of dropped Commons one bonus', () => {
    const rng = createRng(9);
    let withBonus = 0;
    for (let i = 0; i < ROLLS; i++) {
      withBonus += Object.keys(rollBonus(rng, 'chainMail', 'common')).length;
    }
    expect(Math.abs(withBonus / ROLLS - 0.3)).toBeLessThan(0.02);
  });

  it('has a loot tier for every monster and something to drop at every tier', () => {
    for (const id of Object.keys(LOOT_TIER)) {
      expect(MONSTERS.has(id)).toBe(true);
    }
    for (const m of MONSTERS.values()) {
      expect(LOOT_TIER[m.id]).toBeGreaterThanOrEqual(1);
      expect(LOOT_TIER[m.id]).toBeLessThanOrEqual(5);
    }
    const rng = createRng(2);
    for (let tier = 1; tier <= 5; tier++) {
      const id = pickBase(rng, tier, ['warrior']);
      expect(baseInfo(id)?.tier).toBe(tier);
    }
  });

  it('favours pieces the party can use', () => {
    const rng = createRng(4);
    let swords = 0;
    for (let i = 0; i < 2000; i++) {
      const id = pickBase(rng, 2, ['warrior']);
      swords += WEAPONS.get(id)?.family === 'sword' ? 1 : 0;
    }
    const tier2 = [...WEAPONS.values(), ...GEAR.values()].filter((x) => x.tier === 2);
    const share = tier2.filter((x) => WEAPONS.get(x.id)?.family === 'sword').length / tier2.length;
    expect(swords / 2000).toBeGreaterThan(share);
  });

  it('gives each boss its Legendary only once', () => {
    const boss = LEGENDARY_BOSS_IDS[0];
    const flags: Record<string, boolean> = {};
    let legendaries = 0;
    const rng = createRng(13);
    for (let i = 0; i < 400; i++) {
      const roll = rollLoot(rng, boss, ['warrior', 'wizard'], flags);
      legendaries += roll.rarity === 'legendary' ? 1 : 0;
      expect(RARITY_ORDER.indexOf(roll.rarity)).toBeGreaterThanOrEqual(RARITY_ORDER.indexOf('rare'));
    }
    expect(legendaries).toBe(1);
    expect(flags[legendaryFlag(boss)]).toBe(true);
  });

  it('never gives a Legendary from common monsters or mini-bosses', () => {
    const rng = createRng(17);
    for (const id of ['slime', 'goblin', 'alphaWolf']) {
      for (let i = 0; i < 500; i++) {
        expect(rollLoot(rng, id, ['cleric'], {}).rarity).not.toBe('legendary');
      }
    }
    expect(lootSource('alphaWolf')).toBe('miniBoss');
    expect(lootSource('slime')).toBe('common');
  });

  it('names pieces by their largest bonus', () => {
    const item: GearRoll = { baseId: 'ironSword', rarity: 'rare', bonus: { agi: 3, hp: 8 } };
    expect(itemName(item)).toBe('Iron Sword of Haste');
    expect(itemLabel(item)).toBe('[R] IRON SWORD OF HASTE');
    expect(rarityName(item)).toBe('Rare Iron Sword of Haste');
    expect(bonusText(item.bonus)).toBe('AGI+3 HP+8');
    expect(itemName({ baseId: 'ironSword', rarity: 'common', bonus: {} })).toBe('Iron Sword');
    expect(itemName({ baseId: 'vigorRing', rarity: 'uncommon', bonus: { mp: 12 } })).toContain('of Spirit');
  });

  it('draws every gear label with real glyphs (no ? for missing characters)', () => {
    const missingGlyphs = new Set<string>();
    [...GEAR.keys(), ...WEAPONS.keys()].forEach((baseId) =>
      RARITY_ORDER.forEach((rarity) =>
        BONUS_STATS.forEach((stat) => {
          const label = itemLabel({ baseId, rarity, bonus: { [stat]: 1 } });
          [...label].filter((ch) => !GLYPHS.has(ch)).forEach((ch) => missingGlyphs.add(ch));
        }),
      ),
    );
    expect([...missingGlyphs]).toEqual([]);
  });

  it('flags plain and precious pieces', () => {
    expect(isPlain({ baseId: 'chainMail', rarity: 'common', bonus: {} })).toBe(true);
    expect(isPlain({ baseId: 'chainMail', rarity: 'common', bonus: { def: 1 } })).toBe(false);
    expect(isPrecious({ baseId: 'chainMail', rarity: 'uncommon', bonus: {} })).toBe(false);
    expect(isPrecious({ baseId: 'chainMail', rarity: 'rare', bonus: {} })).toBe(true);
  });

  it('values pieces by rarity and bonuses, and sells them for half', () => {
    const price = baseInfo('chainMail')?.price ?? 0;
    const tier = baseInfo('chainMail')?.tier ?? 1;
    const common: GearRoll = { baseId: 'chainMail', rarity: 'common', bonus: {} };
    expect(gearValue(common)).toBe(price);
    expect(gearSellPrice(common)).toBe(Math.floor(price / 2));
    const epic: GearRoll = { baseId: 'chainMail', rarity: 'epic', bonus: { atk: 1, agi: 1, hp: 4 } };
    expect(gearValue(epic)).toBe(price * 4 + 15 * tier * 3);
    expect(gearSellPrice({ baseId: 'bronzeSword', rarity: 'common', bonus: {} })).toBeGreaterThan(0);
  });

  it('checks the shape of saved pieces', () => {
    expect(isValidGearItem({ uid: 1, baseId: 'chainMail', rarity: 'rare', bonus: { atk: 2 } })).toBe(true);
    expect(isValidGearItem({ uid: 1, baseId: 'nope', rarity: 'rare', bonus: {} })).toBe(false);
    expect(isValidGearItem({ uid: 1, baseId: 'chainMail', rarity: 'mythic', bonus: {} })).toBe(false);
    expect(isValidGearItem({ uid: 1, baseId: 'chainMail', rarity: 'rare', bonus: { luck: 2 } })).toBe(false);
    expect(isValidGearItem({ baseId: 'chainMail', rarity: 'rare', bonus: {} })).toBe(false);
    expect(isValidGearItem(null)).toBe(false);
  });
});
