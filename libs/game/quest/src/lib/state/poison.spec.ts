import { Battle, BattleAction, BattleEvent, Combatant, createRng, poisonDamage } from '@jouster/game/engine';
import { ABILITIES } from '../data/abilities';
import { ITEMS, ITEM_SHOP_STOCK } from '../data/equipment';
import { EMBERWATCH_ITEM_STOCK, FROSTGATE_ITEM_STOCK, SANDHOLLOW_ITEM_STOCK } from '../data/maps';
import { MONSTERS } from '../data/monsters';
import { applyRestore, canRestore } from '../scenes/menu-scenes';
import { SAVE_KEY, loadGame, memoryStorage, newGameState, saveGame } from './game-state';
import {
  POISON_FIELD_STEP_INTERVAL,
  applyFieldRegen,
  createMember,
  memberStats,
  memberToCombatant,
  monstersToCombatants,
  restoreMember,
  syncFromCombatants,
} from './party';

function setup(monsterIds: string[], inventory: Record<string, number> = {}, seed = 1): Battle {
  const defs = monsterIds.map((id) => {
    const def = MONSTERS.get(id);
    if (!def) {
      throw new Error(id);
    }
    return def;
  });
  const party = [createMember('h', 'Hero', 'warrior', 10), createMember('c', 'Cleo', 'cleric', 10)].map(
    memberToCombatant
  );
  return new Battle(party, monstersToCombatants(defs), {
    abilities: ABILITIES,
    items: ITEMS,
    inventory,
    rng: createRng(seed),
    canRun: true,
  });
}

/** Plays turns (party members defend, enemies use their AI) until `who` is up; returns the events seen. */
function playUntil(battle: Battle, who: Combatant | undefined): BattleEvent[] {
  const events: BattleEvent[] = [];
  for (let c = battle.nextActor(); c; c = battle.nextActor()) {
    if (c === who) {
      return events;
    }
    events.push(...battle.act(c.side === 'party' ? { kind: 'defend', actorId: c.id } : undefined));
  }
  return events;
}

/** Runs the cleric's turn with `action`, after letting everyone before them act. */
function clericActs(battle: Battle, action: (cleric: Combatant) => BattleAction): BattleEvent[] {
  const cleric = battle.party[1];
  battle.beginRound();
  playUntil(battle, cleric);
  return battle.act(action(cleric));
}

const texts = (events: BattleEvent[]): string[] => events.map((e) => e.text);

describe('poison (plan 28)', () => {
  describe('in battle', () => {
    it('lets venomous monsters poison a living target on a landed attack', () => {
      const battle = setup(['scorpion']);
      battle.party.forEach((c) => (c.hp = c.maxHp = 999));
      battle.enemies[0].poisonChance = 1;
      battle.enemies[0].hp = battle.enemies[0].maxHp = 999;
      const seen: string[] = [];
      for (let round = 0; round < 6 && !battle.party.some((c) => c.poisoned); round++) {
        battle.beginRound();
        seen.push(...texts(playUntil(battle, undefined)));
        battle.endRound();
      }
      const victim = battle.party.find((c) => c.poisoned);
      expect(victim).toBeDefined();
      expect(seen).toContain(`${victim?.name} is poisoned!`);
    });

    it('never poisons from monsters without a poison chance', () => {
      const battle = setup(['wolf', 'goblin']);
      battle.party.forEach((c) => (c.hp = c.maxHp = 999));
      battle.enemies.forEach((e) => (e.hp = e.maxHp = 999));
      for (let round = 0; round < 10; round++) {
        battle.beginRound();
        playUntil(battle, undefined);
        battle.endRound();
      }
      expect(battle.party.some((c) => c.poisoned)).toBe(false);
    });

    it('takes 1/12 of max HP at the end of each round, but never knocks anyone out', () => {
      const battle = setup(['slime']);
      const hero = battle.party[0];
      hero.maxHp = 120;
      hero.hp = 120;
      hero.poisoned = true;
      battle.beginRound();
      const events = battle.endRound();
      expect(hero.hp).toBe(110);
      expect(texts(events)).toContain('Hero takes 10 poison damage.');
      expect(events.find((e) => e.fx?.type === 'poison')?.fx).toEqual({
        type: 'poison',
        targetId: 'h',
        amount: 10,
      });
      hero.hp = 3;
      battle.beginRound();
      battle.endRound();
      expect(hero.hp).toBe(1);
      battle.beginRound();
      expect(texts(battle.endRound())).toContain('Hero is weakened by poison.');
      expect(hero.hp).toBe(1);
      expect(hero.poisoned).toBe(true);
    });

    it('computes at least 1 damage and stops at 1 HP', () => {
      expect(poisonDamage(50, 5)).toBe(1);
      expect(poisonDamage(240, 240)).toBe(20);
      expect(poisonDamage(4, 240)).toBe(3);
      expect(poisonDamage(1, 240)).toBe(0);
    });

    it('is cured by Heal even at full HP', () => {
      const battle = setup(['slime']);
      const hero = battle.party[0];
      hero.poisoned = true;
      const events = clericActs(battle, (c) => ({
        kind: 'ability',
        actorId: c.id,
        abilityId: 'heal',
        targetId: hero.id,
      }));
      expect(hero.poisoned).toBe(false);
      expect(texts(events)).toContain('Hero is cured of poison.');
      expect(ABILITIES.get('heal')?.curesPoison).toBe(true);
    });

    it('is cured by an Antidote, which does nothing for a healthy ally', () => {
      const inventory = { antidote: 2 };
      const battle = setup(['slime'], inventory);
      const hero = battle.party[0];
      hero.poisoned = true;
      const item = (c: Combatant): BattleAction => ({
        kind: 'item',
        actorId: c.id,
        itemId: 'antidote',
        targetId: hero.id,
      });
      expect(texts(clericActs(battle, item))).toContain('Hero is cured of poison.');
      expect(hero.poisoned).toBe(false);
      playUntil(battle, undefined);
      battle.endRound();
      expect(texts(clericActs(battle, item))).toContain('But nothing happens.');
      expect(inventory.antidote).toBe(0);
    });

    it('clears on revive', () => {
      const battle = setup(['slime'], { phoenixFeather: 1 });
      const hero = battle.party[0];
      hero.hp = 0;
      hero.poisoned = true;
      clericActs(battle, (c) => ({
        kind: 'item',
        actorId: c.id,
        itemId: 'phoenixFeather',
        targetId: hero.id,
      }));
      expect(hero.hp).toBeGreaterThan(0);
      expect(hero.poisoned).toBe(false);
    });
  });

  describe('party state', () => {
    it('carries poison into and out of battle, dropping it on a KO', () => {
      const hero = createMember('h', 'Hero', 'warrior', 5);
      const cleo = createMember('c', 'Cleo', 'cleric', 5);
      hero.poisoned = true;
      const combatants = [hero, cleo].map(memberToCombatant);
      expect(combatants.map((c) => c.poisoned)).toEqual([true, false]);
      combatants[1].poisoned = true;
      syncFromCombatants([hero, cleo], combatants);
      expect(hero.poisoned).toBe(true);
      expect(cleo.poisoned).toBe(true);
      combatants[0].hp = 0;
      combatants[1].poisoned = false;
      syncFromCombatants([hero, cleo], combatants);
      expect('poisoned' in hero).toBe(false);
      expect('poisoned' in cleo).toBe(false);
    });

    it('drains 1 HP every few steps on any map, blocks HP regen and stops at 1 HP', () => {
      const m = createMember('h', 'Hero', 'warrior', 5);
      m.poisoned = true;
      m.hp = 20;
      let ticks = 0;
      for (let i = 1; i <= POISON_FIELD_STEP_INTERVAL * 4; i++) {
        ticks += applyFieldRegen(m, i, false) ? 1 : 0;
      }
      expect(ticks).toBe(4);
      expect(m.hp).toBe(16);
      for (let i = 1; i <= 400; i++) {
        applyFieldRegen(m, i, true);
      }
      expect(m.hp).toBe(1);
      expect(applyFieldRegen(m, POISON_FIELD_STEP_INTERVAL, true)).toBe(false);
    });

    it('is cleared by resting (inn, chapel revive, defeat)', () => {
      const m = createMember('h', 'Hero', 'warrior', 5);
      m.poisoned = true;
      restoreMember(m);
      expect('poisoned' in m).toBe(false);
    });

    it('round-trips in saves and rejects a malformed flag', () => {
      const storage = memoryStorage();
      const s = newGameState('Hero', 'warrior', createRng(1));
      s.party[0].poisoned = true;
      saveGame(storage, s);
      expect(loadGame(storage)?.party[0].poisoned).toBe(true);
      storage.setItem(SAVE_KEY, JSON.stringify({ ...s, party: [{ ...s.party[0], poisoned: 'yes' }] }));
      expect(loadGame(storage)).toBeNull();
    });
  });

  describe('field menu restores', () => {
    it('targets only poisoned members with an Antidote', () => {
      const m = createMember('h', 'Hero', 'warrior', 5);
      expect(canRestore(m, 'curePoison')).toBe(false);
      expect(applyRestore(m, 'curePoison', 0)).toBeNull();
      m.poisoned = true;
      expect(canRestore(m, 'curePoison')).toBe(true);
      expect(applyRestore(m, 'curePoison', 0)).toBe('Hero is cured of poison.');
      expect(m.poisoned).toBeUndefined();
    });

    it('lets Heal cure a poisoned member at full HP, but not a plain HP restore', () => {
      const m = createMember('h', 'Hero', 'warrior', 5);
      m.poisoned = true;
      expect(canRestore(m, 'healHp')).toBe(false);
      expect(canRestore(m, 'healHp', true)).toBe(true);
      expect(applyRestore(m, 'healHp', 20)).toBeNull();
      expect(applyRestore(m, 'healHp', 20, true)).toBe('Hero is cured of poison.');
      m.poisoned = true;
      m.hp = memberStats(m).hp - 5;
      expect(applyRestore(m, 'healHp', 20, true)).toBe('Hero recovers 5 HP. Hero is cured of poison.');
    });
  });

  describe('content', () => {
    it('keeps Act I poison-free (solo balance) and gives venom to a few later monsters', () => {
      const venomous = [...MONSTERS.values()].filter((m) => (m.poisonChance ?? 0) > 0).map((m) => m.id);
      expect(venomous.sort()).toEqual(['marshWitch', 'scorpion', 'wyvern', 'wyvernMatriarch']);
    });

    it('sells Antidotes in every item shop', () => {
      expect(ITEMS.get('antidote')).toMatchObject({
        effect: 'curePoison',
        usableInBattle: true,
        usableInField: true,
      });
      [ITEM_SHOP_STOCK, SANDHOLLOW_ITEM_STOCK, FROSTGATE_ITEM_STOCK, EMBERWATCH_ITEM_STOCK].forEach((stock) =>
        expect(stock).toContain('antidote')
      );
    });
  });
});
