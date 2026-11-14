import { Battle, Combatant, createRng } from '@jouster/game/engine';
import { ABILITIES } from '../data/abilities';
import { ITEMS } from '../data/equipment';
import { MONSTERS } from '../data/monsters';
import { createMember, memberToCombatant, monstersToCombatants } from './party';

function setup(monsterIds: string[], seed = 1): Battle {
  const defs = monsterIds.map((id) => {
    const def = MONSTERS.get(id);
    if (!def) {
      throw new Error(id);
    }
    return def;
  });
  const party = [createMember('h', 'Hero', 'warrior', 5), createMember('c', 'Cleo', 'cleric', 5)].map(memberToCombatant);
  return new Battle(party, monstersToCombatants(defs), {
    abilities: ABILITIES,
    items: ITEMS,
    inventory: {},
    rng: createRng(seed),
    canRun: true,
  });
}

/** Plays one turn: party members defend, enemies use their AI. */
function playTurn(battle: Battle, actor: Combatant): void {
  battle.act(actor.side === 'party' ? { kind: 'defend', actorId: actor.id } : undefined);
}

describe('turn-by-turn battles', () => {
  it('gives every living combatant exactly one turn per round, in initiative order', () => {
    const battle = setup(['slime', 'goblin']);
    battle.all.forEach((c) => (c.hp = c.maxHp = 999));
    battle.beginRound();
    const order: Combatant[] = [];
    for (let c = battle.nextActor(); c; c = battle.nextActor()) {
      expect(battle.currentActor).toBe(c);
      order.push(c);
      playTurn(battle, c);
    }
    expect(order.map((c) => c.id).sort()).toEqual(battle.all.map((c) => c.id).sort());
    expect(battle.round).toBe(1);
    expect(battle.nextActor()).toBeUndefined();
  });

  it('asks a party member for their action only on their own turn and shows who is next', () => {
    const battle = setup(['slime']);
    battle.beginRound();
    let actor = battle.nextActor();
    while (actor?.side === 'enemy') {
      battle.act();
      actor = battle.nextActor();
    }
    expect(actor?.side).toBe('party');
    expect(() => battle.act()).toThrow();
    expect(battle.upcoming).not.toContain(actor);
    expect(battle.upcoming.length).toBeLessThan(battle.all.length);
  });

  it('keeps a defender guarded until their next turn starts, even across rounds', () => {
    const battle = setup(['goblin']);
    const hero = battle.party[0];
    battle.beginRound();
    for (let c = battle.nextActor(); c; c = battle.nextActor()) {
      playTurn(battle, c);
    }
    battle.endRound();
    expect(hero.defending).toBe(true);
    battle.beginRound();
    for (let c = battle.nextActor(); c && c !== hero; c = battle.nextActor()) {
      expect(hero.defending).toBe(true);
      playTurn(battle, c);
    }
    expect(battle.currentActor).toBe(hero);
    expect(hero.defending).toBe(false);
  });

  it('skips fallen combatants and stops handing out turns once the battle is won', () => {
    const battle = setup(['slime', 'slime']);
    battle.beginRound();
    battle.enemies[1].hp = 0;
    const seen: string[] = [];
    for (let c = battle.nextActor(); c; c = battle.nextActor()) {
      seen.push(c.id);
      if (c.side === 'party') {
        battle.enemies[0].hp = 0;
        battle.act({ kind: 'defend', actorId: c.id });
      } else {
        battle.act();
      }
    }
    expect(seen).not.toContain(battle.enemies[1].id);
    expect(battle.outcome).toBe('victory');
    expect(battle.endRound()).toEqual([]);
  });

  it('ticks cooldowns and buffs once per round in endRound', () => {
    const battle = setup(['slime']);
    const hero = battle.party[0];
    hero.cooldowns['x'] = 2;
    hero.buffs = [{ stat: 'def', multiplier: 2, turnsLeft: 1 }];
    battle.beginRound();
    battle.endRound();
    expect(hero.cooldowns['x']).toBe(1);
    expect(hero.buffs).toEqual([]);
  });
});
