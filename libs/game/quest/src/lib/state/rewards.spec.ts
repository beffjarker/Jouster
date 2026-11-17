import { Battle, createRng } from '@jouster/game/engine';
import { ABILITIES } from '../data/abilities';
import { ITEMS } from '../data/equipment';
import { MONSTERS } from '../data/monsters';
import { GEAR_DROP_CHANCE } from '../data/rarity';
import { DEFAULT_GOLD_CHANCE, createMember, memberToCombatant, monstersToCombatants } from './party';

function rewardsFor(monsterId: string, seed: number, gearChance?: number): ReturnType<Battle['rewards']> {
  const def = MONSTERS.get(monsterId);
  if (!def) {
    throw new Error(monsterId);
  }
  const foes = monstersToCombatants([def]).map((c) => (gearChance === undefined ? c : { ...c, gearChance }));
  const battle = new Battle([memberToCombatant(createMember('h', 'Hero', 'warrior', 1))], foes, {
    abilities: ABILITIES,
    items: ITEMS,
    inventory: {},
    rng: createRng(seed),
    canRun: false,
  });
  return battle.rewards();
}

describe('gold drops (plan 15.2)', () => {
  it('common monsters drop gold only some of the time, with a varied amount', () => {
    const base = MONSTERS.get('goblin')?.gold ?? 0;
    const golds = Array.from({ length: 1000 }, (_, i) => rewardsFor('goblin', i).gold);
    const dropRate = golds.filter((g) => g > 0).length / golds.length;
    expect(dropRate).toBeGreaterThan(DEFAULT_GOLD_CHANCE - 0.06);
    expect(dropRate).toBeLessThan(DEFAULT_GOLD_CHANCE + 0.06);
    const dropped = golds.filter((g) => g > 0);
    expect(Math.min(...dropped)).toBeGreaterThanOrEqual(Math.floor(base * 0.75));
    expect(Math.max(...dropped)).toBeLessThanOrEqual(Math.ceil(base * 1.25));
    expect(new Set(dropped).size).toBeGreaterThan(1);
  });

  it('bosses and mini-bosses always drop gold', () => {
    ['goblinKing', 'alphaWolf', 'giantToad', 'boneCaptain', 'goblinChief'].forEach((id) => {
      for (let seed = 0; seed < 50; seed++) {
        expect(rewardsFor(id, seed).gold).toBeGreaterThan(0);
      }
    });
  });
});

describe('gear drops (plan 33.6)', () => {
  it('common monsters drop gear now and then; bosses always do', () => {
    const drops = Array.from({ length: 2000 }, (_, i) => rewardsFor('goblin', i).gearDrops.length);
    const rate = drops.reduce((a, b) => a + b, 0) / drops.length;
    expect(Math.abs(rate - GEAR_DROP_CHANCE.common)).toBeLessThan(0.02);
    for (let seed = 0; seed < 50; seed++) {
      expect(rewardsFor('goblinKing', seed).gearDrops).toEqual(['goblinKing']);
    }
  });

  it('rolls gear last, so gold and items are unchanged by it', () => {
    for (let seed = 0; seed < 200; seed++) {
      const without = rewardsFor('goblin', seed, 0);
      const withGear = rewardsFor('goblin', seed, 1);
      expect(without.gearDrops).toEqual([]);
      expect(withGear.gearDrops).toEqual(['goblin']);
      expect({ gold: withGear.gold, items: withGear.items }).toEqual({ gold: without.gold, items: without.items });
    }
  });
});
