import { Battle, createRng } from '@jouster/game/engine';
import { ABILITIES } from '../data/abilities';
import { ITEMS } from '../data/equipment';
import { MONSTERS } from '../data/monsters';
import { DEFAULT_GOLD_CHANCE, createMember, memberToCombatant, monstersToCombatants } from './party';

function rewardsFor(monsterId: string, seed: number): { gold: number } {
  const def = MONSTERS.get(monsterId);
  if (!def) {
    throw new Error(monsterId);
  }
  const battle = new Battle([memberToCombatant(createMember('h', 'Hero', 'warrior', 1))], monstersToCombatants([def]), {
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
