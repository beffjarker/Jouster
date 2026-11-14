import { SceneStack, createRng } from '@jouster/game/engine';
import { Art } from '../art/art';
import { memoryStorage, newGameState, saveGame } from '../state/game-state';
import { InputDriver } from '../testing/input-driver';
import { GameContext } from './context';
import { NAME_KEYS, NameEntryScene, TitleScene, nameKeyAt } from './title-scene';

function setup(): { ctx: GameContext; driver: InputDriver } {
  const ctx: GameContext = {
    stack: new SceneStack(),
    audio: { play: jest.fn(), toggleMute: jest.fn(), muted: false, dispose: jest.fn() } as never,
    art: {} as Art,
    rng: createRng(3),
    storage: memoryStorage(),
    state: null,
  };
  const driver = new InputDriver((dt, input) => ctx.stack.update(dt, input));
  return { ctx, driver };
}

describe('title flow', () => {
  it('starts a new game: class select, name entry, then the world with an intro', () => {
    const { ctx, driver } = setup();
    ctx.stack.push(new TitleScene(ctx));
    driver.tap('confirm');
    driver.run(0.6);
    expect(ctx.stack.top?.id).toBe('class-select');
    driver.tap('down');
    driver.tap('confirm');
    driver.run(0.6);
    expect(ctx.stack.top?.id).toBe('name-entry');
    ['Backspace', 'Backspace', 'Backspace', 'Backspace', 'a', 'n', 'a', 'Enter'].forEach((k) => driver.type(k));
    driver.run(0.6);
    expect(ctx.state?.party[0].name).toBe('ANA');
    expect(ctx.state?.mapId).toBe('aldmere');
    expect(ctx.stack.top?.id).toBe('message');
  });

  it('continues a saved game', () => {
    const { ctx, driver } = setup();
    const saved = newGameState('SAVED', 'paladin');
    saved.mapId = 'overworld';
    saved.x = 10;
    saved.y = 15;
    saveGame(ctx.storage, saved);
    ctx.stack.push(new TitleScene(ctx));
    driver.tap('confirm');
    driver.run(0.6);
    expect(ctx.stack.top?.id).toBe('world');
    expect(ctx.state?.party[0].name).toBe('SAVED');
  });
});

describe('name entry by mouse or touch', () => {
  const tapKey = (driver: InputDriver, value: string): void => {
    const k = NAME_KEYS.find((key) => key.value === value);
    if (!k) {
      throw new Error(`no key ${value}`);
    }
    driver.tapAt(k.x + k.w / 2, k.y + k.h / 2);
  };

  it('lays out every letter on screen without overlapping keys', () => {
    const letters = NAME_KEYS.filter((k) => k.value.length === 1).map((k) => k.value);
    expect(letters).toEqual(expect.arrayContaining([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ' ', '-', "'"]));
    for (const k of NAME_KEYS) {
      expect(k.x).toBeGreaterThanOrEqual(0);
      expect(k.x + k.w).toBeLessThanOrEqual(480);
      expect(k.y + k.h).toBeLessThanOrEqual(270);
      expect(nameKeyAt({ x: k.x + k.w / 2, y: k.y + k.h / 2 })).toBe(k);
    }
  });

  it('types, deletes and starts the game with on-screen keys', () => {
    const { ctx, driver } = setup();
    const scene = new NameEntryScene(ctx, 'warrior');
    ctx.stack.push(scene);
    for (let i = 0; i < 8; i++) {
      tapKey(driver, 'DEL');
    }
    expect(scene.typedName).toBe('');
    ['B', 'O', 'X', 'DEL', 'B'].forEach((v) => tapKey(driver, v));
    expect(scene.typedName).toBe('BOB');
    tapKey(driver, 'OK');
    driver.run(0.6);
    expect(ctx.state?.party[0].name).toBe('BOB');
  });

  it('BACK returns to class select', () => {
    const { ctx, driver } = setup();
    ctx.stack.push(new NameEntryScene(ctx, 'warrior'));
    tapKey(driver, 'BACK');
    driver.run(0.6);
    expect(ctx.stack.top?.id).toBe('class-select');
  });
});
