import {
  MAX_PARTY,
  SAVE_KEY,
  addItem,
  companionAvailable,
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

describe('recruiting', () => {
  it('locks Ilya until the Goblin King is defeated', () => {
    const s = newGameState('A', 'paladin');
    expect(companionAvailable(s, 'ilya')).toBe(false);
    expect(recruitCompanion(s, 'ilya')).toBe(false);
    s.flags['bossDefeated'] = true;
    expect(recruitCompanion(s, 'ilya')).toBe(true);
    expect(s.party[1].classId).toBe('wizard');
  });

  it('allows any order and swaps when the party is full', () => {
    const s = newGameState('A', 'cleric');
    s.flags['bossDefeated'] = true;
    expect(recruitCompanion(s, 'sera')).toBe(true);
    expect(recruitCompanion(s, 'bren')).toBe(true);
    expect(s.party).toHaveLength(MAX_PARTY);
    expect(recruitCompanion(s, 'ilya')).toBe(false);
    expect(recruitCompanion(s, 'ilya', 'hero')).toBe(false);
    expect(recruitCompanion(s, 'ilya', 'sera')).toBe(true);
    expect(s.party.map((m) => m.id)).toEqual(['hero', 'bren', 'ilya']);
    expect(companionAvailable(s, 'sera')).toBe(true);
    expect(recruitCompanion(s, 'bren')).toBe(false);
  });

  it('companions join at least at the hero level and keep their own level', () => {
    const s = newGameState('A', 'warrior');
    grantXp(s.party[0], 500);
    recruitCompanion(s, 'sera');
    expect(s.party[1].level).toBe(s.party[0].level);
    grantXp(s.party[1], 5000);
    const seraLevel = s.party[1].level;
    recruitCompanion(s, 'bren');
    s.flags['bossDefeated'] = true;
    recruitCompanion(s, 'ilya', 'sera');
    recruitCompanion(s, 'sera', 'bren');
    expect(s.party.find((m) => m.id === 'sera')?.level).toBe(seraLevel);
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
