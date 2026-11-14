import { ClassId, createRng, totalXpForLevel } from '@jouster/game/engine';
import { CLASS_ORDER } from '../data/classes';
import { COMPANION_NAMES, COMPANION_SLOTS, companionIntro, rollCompanions } from '../data/companions';
import {
  GameState,
  MAX_PARTY,
  SAVE_KEY,
  addItem,
  answerCompanionQuest,
  companionAvailable,
  companionPresent,
  completeCompanionQuest,
  hasSave,
  loadGame,
  markQuestReady,
  memoryStorage,
  companionJoinLevel,
  newGameState,
  questStage,
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
    const v2: Partial<GameState> & { companionLevels?: Record<string, number> } = {
      ...s,
      version: 2,
      companionLevels: { tavern: 4 },
    };
    delete v2.explored;
    delete v2.quests;
    delete v2.companionProgress;
    storage.setItem(SAVE_KEY, JSON.stringify(v2));
    const loaded = loadGame(storage);
    expect(loaded?.version).toBe(4);
    expect(loaded?.explored).toEqual({});
    expect(loaded?.quests).toEqual({ thornwick: 'done', tavern: 'done' });
    expect(loaded?.companionProgress).toEqual({ tavern: { level: 4, xp: totalXpForLevel(4) } });
  });

  it('migrates version 3 saves: companion levels become level + XP, with no downgrade', () => {
    const storage = memoryStorage();
    const s = newGameState('ANA', 'wizard', createRng(2));
    const v3: Partial<GameState> & { companionLevels?: Record<string, number> } = {
      ...s,
      version: 3,
      companionLevels: { thornwick: 7, cave: 2 },
    };
    delete v3.companionProgress;
    storage.setItem(SAVE_KEY, JSON.stringify(v3));
    const loaded = loadGame(storage);
    expect(loaded?.version).toBe(4);
    expect(loaded?.companionProgress).toEqual({
      thornwick: { level: 7, xp: totalXpForLevel(7) },
      cave: { level: 2, xp: totalXpForLevel(2) },
    });
    expect(loaded && 'companionLevels' in loaded).toBe(false);
  });

  it('rejects a save with malformed companion progress', () => {
    const storage = memoryStorage();
    const s = newGameState('ANA', 'wizard', createRng(2));
    storage.setItem(SAVE_KEY, JSON.stringify({ ...s, companionProgress: { tavern: { level: 'x' } } }));
    expect(loadGame(storage)).toBeNull();
    storage.setItem(SAVE_KEY, JSON.stringify({ ...s, companionProgress: undefined }));
    expect(loadGame(storage)).toBeNull();
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
    expect(companionPresent(s, 'cave')).toBe(true);
    expect(recruitCompanion(s, 'tavern')).toBe(false);
    expect(recruitCompanion(s, 'cave')).toBe(false);
    expect(questStage(s, 'thornwick')).toBe('done');
    delete s.quests['thornwick'];
    expect(questStage(s, 'thornwick')).toBe('locked');
  });

  it('runs the side quest: offer, decline, accept, kill, turn in with reward, then join', () => {
    const s = withRoster('paladin');
    s.flags['bossDefeated'] = true;
    expect(questStage(s, 'tavern')).toBe('available');
    answerCompanionQuest(s, 'tavern', false);
    expect(s.quests['tavern']).toBe('available');
    expect(questStage(s, 'tavern')).toBe('available');
    answerCompanionQuest(s, 'tavern', true);
    expect(questStage(s, 'tavern')).toBe('active');
    expect(recruitCompanion(s, 'tavern')).toBe(false);
    expect(completeCompanionQuest(s, 'tavern')).toBe(false);
    s.flags['alphaWolfDefeated'] = true;
    expect(markQuestReady(s, 'alphaWolfDefeated')).toBe('tavern');
    expect(questStage(s, 'tavern')).toBe('ready');
    expect(recruitCompanion(s, 'tavern')).toBe(false);
    const gold = s.gold;
    expect(completeCompanionQuest(s, 'tavern')).toBe(true);
    expect(s.gold).toBe(gold + COMPANION_SLOTS[0].quest.reward.gold);
    expect(completeCompanionQuest(s, 'tavern')).toBe(false);
    expect(s.gold).toBe(gold + COMPANION_SLOTS[0].quest.reward.gold);
    expect(questStage(s, 'tavern')).toBe('done');
    expect(recruitCompanion(s, 'tavern')).toBe(true);
  });

  it('only readies a quest that was accepted', () => {
    const s = withRoster('paladin');
    s.flags['bossDefeated'] = true;
    expect(markQuestReady(s, 'alphaWolfDefeated')).toBeNull();
    expect(markQuestReady(s, 'unknownFlag')).toBeNull();
    expect(s.quests['tavern']).toBeUndefined();
  });

  it('treats a mini-boss beaten before the quest (older saves) as ready, rewarding once', () => {
    const s = withRoster('warrior');
    s.flags['bossDefeated'] = true;
    s.flags['giantToadDefeated'] = true;
    expect(questStage(s, 'brookhollow')).toBe('ready');
    const herbs = s.inventory['herb'] ?? 0;
    expect(completeCompanionQuest(s, 'brookhollow')).toBe(true);
    expect(s.inventory['herb']).toBe(herbs + 6);
    expect(completeCompanionQuest(s, 'brookhollow')).toBe(false);
    expect(s.inventory['herb']).toBe(herbs + 6);
  });

  it('gives every companion a home and an early-kill line', () => {
    COMPANION_SLOTS.forEach((slot) => {
      expect(slot.home.length).toBeGreaterThan(0);
      expect(slot.quest.already.length).toBeGreaterThan(0);
    });
  });

  it('includes a starter kit of at least 2 Herbs in every side-quest reward', () => {
    COMPANION_SLOTS.forEach((slot) => expect(slot.quest.reward.items?.['herb'] ?? 0).toBeGreaterThanOrEqual(2));
  });
  it('keeps the cave companion in the cell until the Goblin King is defeated', () => {
    const s = withRoster('paladin');
    expect(companionPresent(s, 'cave')).toBe(true);
    expect(recruitCompanion(s, 'cave')).toBe(false);
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

  it('first-time companions join at half the hero level (minimum 1), not at the hero level', () => {
    expect(companionJoinLevel(1)).toBe(1);
    expect(companionJoinLevel(3)).toBe(1);
    expect(companionJoinLevel(6)).toBe(3);
    expect(companionJoinLevel(11)).toBe(5);
    const s = unlocked(withRoster('rogue'));
    recruitCompanion(s, 'thornwick');
    expect(s.party[1].level).toBe(1);
    expect(s.party[1].xp).toBe(totalXpForLevel(1));
    grantXp(s.party[0], totalXpForLevel(8));
    recruitCompanion(s, 'tavern');
    expect(s.party[0].level).toBeGreaterThanOrEqual(8);
    expect(s.party[2].level).toBe(companionJoinLevel(s.party[0].level));
    expect(s.party[2].level).toBeLessThan(s.party[0].level);
  });

  it('a companion swapped out and back keeps exactly their level and XP; benched ones stay frozen', () => {
    const s = unlocked(withRoster('rogue'));
    recruitCompanion(s, 'thornwick');
    recruitCompanion(s, 'tavern');
    grantXp(s.party[1], 137);
    const sera = { level: s.party[1].level, xp: s.party[1].xp };
    recruitCompanion(s, 'brookhollow', 'thornwick');
    expect(s.companionProgress['thornwick']).toEqual(sera);
    // The hero levels up a lot while Sera is benched; she does not.
    grantXp(s.party[0], totalXpForLevel(12));
    recruitCompanion(s, 'thornwick', 'tavern');
    const back = s.party.find((m) => m.id === 'thornwick');
    expect(back).toMatchObject(sera);
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
