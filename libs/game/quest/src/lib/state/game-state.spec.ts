import { ClassId, createRng } from '@jouster/game/engine';
import { CLASS_ORDER } from '../data/classes';
import { COMPANION_NAMES, COMPANION_SLOTS, companionIntro, rollCompanions } from '../data/companions';
import {
  GameState,
  MAX_PARTY,
  SAVE_KEY,
  addItem,
  advanceCompanionQuest,
  companionAvailable,
  companionPresent,
  hasSave,
  loadGame,
  memoryStorage,
  newGameState,
  recruitCompanion,
  saveGame,
} from './game-state';
import { applyRestore } from '../scenes/menu-scenes';
import { grantXp, memberStats, restoreMember } from './party';

describe('game state', () => {
  it('starts a new game in Aldmere with a solo hero', () => {
    const s = newGameState('ANA', 'cleric');
    expect(s.mapId).toBe('aldmere');
    expect(s.party).toHaveLength(1);
    expect(s.party[0].classId).toBe('cleric');
    expect(s.inventory['herb']).toBeGreaterThan(0);
  });

  it('saves and loads, rejecting corrupt data', () => {
    const storage = memoryStorage();
    expect(hasSave(storage)).toBe(false);
    const s = newGameState('ANA', 'wizard');
    s.gold = 123;
    expect(saveGame(storage, s)).toBe(true);
    expect(loadGame(storage)?.gold).toBe(123);
    storage.setItem(SAVE_KEY, '{not json');
    expect(loadGame(storage)).toBeNull();
    storage.setItem(SAVE_KEY, JSON.stringify({ ...s, version: 999 }));
    expect(loadGame(storage)).toBeNull();
  });

  it('migrates version 2 saves (no fog or quests; met companions stay recruited)', () => {
    const storage = memoryStorage();
    const s = newGameState('ANA', 'wizard', createRng(2));
    s.flags['bossDefeated'] = true;
    s.quests['thornwick'] = 'done';
    recruitCompanion(s, 'thornwick');
    const v2: Partial<GameState> = { ...s, version: 2 };
    delete v2.explored;
    delete v2.quests;
    storage.setItem(SAVE_KEY, JSON.stringify(v2));
    const loaded = loadGame(storage);
    expect(loaded?.version).toBe(3);
    expect(loaded?.explored).toEqual({});
    expect(loaded?.quests).toEqual({ thornwick: 'done' });
  });

  it('reports a failed save when storage throws', () => {
    const storage = memoryStorage();
    storage.setItem = (): void => {
      throw new Error('quota');
    };
    expect(saveGame(storage, newGameState('A', 'warrior'))).toBe(false);
  });

  it('adds and removes items', () => {
    const s = newGameState('A', 'warrior');
    addItem(s, 'tonic', 2);
    addItem(s, 'tonic', -1);
    expect(s.inventory['tonic']).toBe(1);
  });
});

describe('companion roster', () => {
  it.each(CLASS_ORDER)('a %s hero never meets a companion of the same class, and none repeat', (hero) => {
    for (let seed = 1; seed <= 40; seed++) {
      const roster = rollCompanions(hero, createRng(seed));
      const classes = COMPANION_SLOTS.map((slot) => roster[slot.id].classId);
      expect(classes).not.toContain(hero);
      expect(new Set(classes).size).toBe(classes.length);
      COMPANION_SLOTS.forEach((slot) => {
        expect(COMPANION_NAMES[roster[slot.id].classId]).toContain(roster[slot.id].name);
      });
    }
  });

  it('varies between new games', () => {
    const rosters = new Set(
      Array.from({ length: 20 }, (_, i) => JSON.stringify(newGameState('A', 'warrior', createRng(i + 1)).companions)),
    );
    expect(rosters.size).toBeGreaterThan(5);
  });

  it('stores the roster in the save', () => {
    const storage = memoryStorage();
    const s = newGameState('A', 'rogue', createRng(3));
    saveGame(storage, s);
    expect(loadGame(storage)?.companions).toEqual(s.companions);
    storage.setItem(SAVE_KEY, JSON.stringify({ ...s, companions: undefined }));
    expect(loadGame(storage)).toBeNull();
  });

  it('builds an intro from the slot story and the class pitch', () => {
    const intro = companionIntro('tavern', { name: 'Vex', classId: 'rogue' });
    expect(intro[0]).toContain('VEX:');
    expect(intro[intro.length - 1]).toContain('I am Vex, a rogue.');
  });
});

describe('recruiting', () => {
  /** A fixed roster so the tests do not depend on the roll. */
  function withRoster(hero: ClassId): GameState {
    const s = newGameState('A', hero, createRng(1));
    s.companions = {
      tavern: { name: 'Bren', classId: 'warrior' },
      thornwick: { name: 'Sera', classId: 'cleric' },
      brookhollow: { name: 'Fenn', classId: 'ranger' },
      cave: { name: 'Ilya', classId: 'wizard' },
    };
    return s;
  }

  /** Boss beaten and every side quest finished. */
  function unlocked(s: GameState): GameState {
    s.flags['bossDefeated'] = true;
    COMPANION_SLOTS.forEach((slot) => (s.quests[slot.id] = 'done'));
    return s;
  }

  it('nobody joins before the Goblin King falls, even if their quest is done', () => {
    const s = withRoster('paladin');
    COMPANION_SLOTS.forEach((slot) => (s.quests[slot.id] = 'done'));
    expect(companionPresent(s, 'tavern')).toBe(true);
    expect(companionPresent(s, 'cave')).toBe(false);
    expect(recruitCompanion(s, 'tavern')).toBe(false);
    expect(advanceCompanionQuest(s, 'thornwick')).toBe('done');
    delete s.quests['thornwick'];
    expect(advanceCompanionQuest(s, 'thornwick')).toBe('locked');
  });

  it('runs the side quest: offer, reminder, turn in with reward, then join', () => {
    const s = withRoster('paladin');
    s.flags['bossDefeated'] = true;
    expect(advanceCompanionQuest(s, 'tavern')).toBe('offered');
    expect(advanceCompanionQuest(s, 'tavern')).toBe('active');
    expect(recruitCompanion(s, 'tavern')).toBe(false);
    s.flags['alphaWolfDefeated'] = true;
    const gold = s.gold;
    expect(advanceCompanionQuest(s, 'tavern')).toBe('completed');
    expect(s.gold).toBe(gold + COMPANION_SLOTS[0].quest.reward.gold);
    expect(advanceCompanionQuest(s, 'tavern')).toBe('done');
    expect(recruitCompanion(s, 'tavern')).toBe(true);
  });

  it('completes immediately when the mini-boss was already beaten', () => {
    const s = withRoster('warrior');
    s.flags['bossDefeated'] = true;
    s.flags['giantToadDefeated'] = true;
    const herbs = s.inventory['herb'] ?? 0;
    expect(advanceCompanionQuest(s, 'brookhollow')).toBe('completed');
    expect(s.inventory['herb']).toBe(herbs + 4);
  });

  it('shows the cave companion only after the Goblin King is defeated', () => {
    const s = withRoster('paladin');
    expect(companionPresent(s, 'cave')).toBe(false);
    unlocked(s);
    expect(recruitCompanion(s, 'cave')).toBe(true);
    expect(s.party[1]).toMatchObject({ id: 'cave', name: 'Ilya', classId: 'wizard' });
  });

  it('allows any order and swaps when the party is full', () => {
    const s = unlocked(withRoster('paladin'));
    expect(recruitCompanion(s, 'thornwick')).toBe(true);
    expect(recruitCompanion(s, 'tavern')).toBe(true);
    expect(s.party).toHaveLength(MAX_PARTY);
    expect(recruitCompanion(s, 'cave')).toBe(false);
    expect(recruitCompanion(s, 'cave', 'hero')).toBe(false);
    expect(recruitCompanion(s, 'cave', 'thornwick')).toBe(true);
    expect(s.party.map((m) => m.id)).toEqual(['hero', 'tavern', 'cave']);
    expect(companionAvailable(s, 'thornwick')).toBe(true);
    expect(recruitCompanion(s, 'tavern')).toBe(false);
  });

  it('companions join at least at the hero level and keep their own level', () => {
    const s = unlocked(withRoster('rogue'));
    grantXp(s.party[0], 500);
    recruitCompanion(s, 'thornwick');
    expect(s.party[1].level).toBe(s.party[0].level);
    grantXp(s.party[1], 5000);
    const seraLevel = s.party[1].level;
    recruitCompanion(s, 'tavern');
    recruitCompanion(s, 'brookhollow', 'thornwick');
    recruitCompanion(s, 'thornwick', 'tavern');
    expect(s.party.find((m) => m.id === 'thornwick')?.level).toBe(seraLevel);
  });
});

describe('field restoration', () => {
  it('heals, restores MP and revives within limits', () => {
    const s = newGameState('A', 'cleric');
    const m = s.party[0];
    const max = memberStats(m);
    m.hp = 1;
    expect(applyRestore(m, 'healHp', 5)).not.toBeNull();
    expect(m.hp).toBe(Math.min(max.hp, 6));
    m.hp = 0;
    expect(applyRestore(m, 'healHp', 5)).toBeNull();
    expect(applyRestore(m, 'revive', 0.5)).not.toBeNull();
    expect(m.hp).toBeGreaterThan(0);
    restoreMember(m);
    expect(m.hp).toBe(max.hp);
    expect(applyRestore(m, 'healHp', 5)).toBeNull();
  });
});
