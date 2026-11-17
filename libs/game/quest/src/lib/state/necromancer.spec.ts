import { AbilityDef, Battle, BattleEvent, Combatant, createRng } from '@jouster/game/engine';
import { ABILITIES } from '../data/abilities';
import { CLASS_ORDER, classDef } from '../data/classes';
import { ITEMS, WEAPONS } from '../data/equipment';
import { GEAR, gearUsableBy } from '../data/gear';
import { MONSTERS } from '../data/monsters';
import { GameState, SAVE_KEY, SAVE_VERSION, loadGame, memoryStorage, newGameState, startingInventory } from './game-state';
import { createMember, memberToCombatant, monstersToCombatants } from './party';

function setup(monsterIds: string[], abilities: ReadonlyMap<string, AbilityDef> = ABILITIES): Battle {
  const defs = monsterIds.map((id) => MONSTERS.get(id) ?? missing(id));
  const party = [memberToCombatant(createMember('n', 'Necro', 'necromancer', 10))];
  const enemies = monstersToCombatants(defs);
  enemies.forEach((e) => (e.hp = e.maxHp = 9999));
  return new Battle(party, enemies, { abilities, items: ITEMS, inventory: {}, rng: createRng(3), canRun: true });
}

/** Lets everyone before the necromancer act (enemies use their AI), then casts `abilityId` at `target`. */
function cast(
  battle: Battle,
  abilityId: string,
  target: Combatant,
  prep: (necro: Combatant) => void = () => undefined,
): { events: BattleEvent[]; hpBefore: number } {
  const necro = battle.party[0];
  necro.hp = necro.maxHp = 999;
  battle.beginRound();
  for (let c = battle.nextActor(); c; c = battle.nextActor()) {
    if (c === necro) {
      prep(necro);
      const hpBefore = necro.hp;
      return { events: battle.act({ kind: 'ability', actorId: necro.id, abilityId, targetId: target.id }), hpBefore };
    }
    battle.act(undefined);
  }
  throw new Error('necromancer never acted');
}

function missing(id: string): never {
  throw new Error(`missing ${id}`);
}

const texts = (events: BattleEvent[]): string[] => events.map((e) => e.text);

describe('Necromancer (plan 31)', () => {
  it('replaces the Paladin as the third class and uses scythes', () => {
    expect(CLASS_ORDER).toEqual(['warrior', 'wizard', 'necromancer', 'cleric', 'rogue', 'ranger']);
    const cls = classDef('necromancer');
    expect(WEAPONS.get(cls.startingWeaponId)?.family).toBe('scythe');
    expect([...WEAPONS.values()].filter((w) => w.family === 'scythe').map((w) => w.tier)).toEqual([1, 2, 3, 4, 5]);
    expect(cls.abilities.map((a) => a.abilityId)).toEqual(['drainLife', 'curse', 'blight']);
  });

  it('wears robes and leather but no plate or shields', () => {
    const can = (id: string): boolean => gearUsableBy(GEAR.get(id) ?? missing(id), 'necromancer');
    expect(can('sageRobe')).toBe(true);
    expect(can('leatherArmor')).toBe(true);
    expect(can('plateArmor')).toBe(false);
    expect(can('buckler')).toBe(false);
  });

  it('Drain Life heals the caster for half the damage dealt', () => {
    const battle = setup(['goblin']);
    const necro = battle.party[0];
    const goblin = battle.enemies[0];
    necro.hp = 5;
    const { events, hpBefore } = cast(battle, 'drainLife', goblin, (n) => (n.hp = 5));
    const dealt = 9999 - goblin.hp;
    expect(dealt).toBeGreaterThan(0);
    const healed = Math.min(necro.maxHp - hpBefore, Math.max(1, Math.floor(dealt / 2)));
    expect(necro.hp).toBe(hpBefore + healed);
    expect(texts(events)).toContain(`Necro drains ${healed} HP.`);
  });

  it('Curse lowers an enemy\'s attack for a few rounds', () => {
    const battle = setup(['goblin']);
    const goblin = battle.enemies[0];
    const { events } = cast(battle, 'curse', goblin);
    expect(goblin.buffs).toContainEqual(expect.objectContaining({ stat: 'atk', multiplier: 0.7 }));
    expect(texts(events).some((t) => t.endsWith("'s attack falls!"))).toBe(true);
    expect(events.some((e) => e.fx?.type === 'debuff' && e.fx.targetId === goblin.id)).toBe(true);
  });

  it('Blight hits every enemy and poisons the rank and file, never bosses', () => {
    const blight = ABILITIES.get('blight') ?? missing('blight');
    const sure = new Map(ABILITIES).set('blight', { ...blight, poisonChance: 1 });
    const battle = setup(['goblin', 'goblin', 'goblinKing'], sure);
    cast(battle, 'blight', battle.enemies[0], (n) => (n.mp = 99));
    const [a, b, king] = battle.enemies;
    [a, b, king].forEach((e) => expect(e.hp).toBeLessThan(9999));
    expect(a.poisoned).toBe(true);
    expect(b.poisoned).toBe(true);
    expect(king.boss).toBe(true);
    expect(king.poisoned).toBeFalsy();
  });

  it('Soul Harvest restores MP when an enemy falls', () => {
    const battle = setup(['goblin']);
    const necro = battle.party[0];
    const goblin = battle.enemies[0];
    const { events } = cast(battle, 'drainLife', goblin, (n) => {
      goblin.hp = 1;
      n.mp = 3;
    });
    expect(goblin.hp).toBe(0);
    expect(necro.mp).toBe(2);
    expect(texts(events)).toContain('Necro harvests 2 MP.');
    expect(memberToCombatant(createMember('w', 'W', 'warrior', 1)).mpOnKill ?? 0).toBe(0);
  });
});

describe('starting kits', () => {
  it('gives the Wizard 2 extra Herbs and 2 Tonics for solo play', () => {
    expect(newGameState('A', 'wizard', createRng(1)).inventory).toEqual({ herb: 5, tonic: 2 });
  });

  it.each(CLASS_ORDER.filter((id) => id !== 'wizard'))('gives the %s Herbs only', (id) => {
    expect(startingInventory(id)).toEqual({ herb: 3 + classDef(id).bonusHerbs });
  });
});

describe('save v5 migration (Paladin -> Necromancer)', () => {
  it('turns Paladins into Necromancers, swaps blades for scythes and bags gear they cannot wear', () => {
    const storage = memoryStorage();
    const s = newGameState('ANA', 'warrior', createRng(2));
    const hero = { ...s.party[0], classId: 'paladin', weaponId: 'oathBlade', armorId: 'plateArmor', shieldId: 'buckler' };
    const ally = { ...createMember('tavern', 'Bren', 'warrior', 4), classId: 'paladin', weaponId: 'knightBlade' };
    const v4 = {
      ...s,
      version: 4,
      party: [hero, ally],
      inventory: { herb: 2, aegisBlade: 1, knightBlade: 1 },
      companions: { ...s.companions, tavern: { name: 'Bren', classId: 'paladin' } },
      quests: { tavern: 'done' },
    };
    storage.setItem(SAVE_KEY, JSON.stringify(v4));
    const loaded = loadGame(storage) as GameState;
    expect(loaded).not.toBeNull();
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.party.map((m) => [m.classId, m.weaponId])).toEqual([
      ['necromancer', 'graveScythe'],
      ['necromancer', 'boneScythe'],
    ]);
    expect(loaded.party[0].armorId).toBeUndefined();
    expect(loaded.party[0].shieldId).toBeUndefined();
    // v6 moves bagged gear out of the item counts into plain Common pieces (plan 33).
    expect(loaded.inventory).toEqual({ herb: 2 });
    expect(loaded.gear.map((g) => g.baseId).sort()).toEqual(['boneScythe', 'buckler', 'duneReaper', 'plateArmor']);
    expect(loaded.gear.every((g) => g.rarity === 'common' && g.uid < loaded.nextGearUid)).toBe(true);
    expect(loaded.companions['tavern'].classId).toBe('necromancer');
    expect(Object.values(loaded.companions).some((c) => (c.classId as string) === 'paladin')).toBe(false);
  });

  it('leaves other classes and their gear alone', () => {
    const storage = memoryStorage();
    const s = newGameState('ANA', 'warrior', createRng(2));
    s.party[0].armorId = 'plateArmor';
    storage.setItem(SAVE_KEY, JSON.stringify({ ...s, version: 4 }));
    const loaded = loadGame(storage);
    expect(loaded?.party[0]).toMatchObject({ classId: 'warrior', armorId: 'plateArmor', weaponId: s.party[0].weaponId });
  });
});
