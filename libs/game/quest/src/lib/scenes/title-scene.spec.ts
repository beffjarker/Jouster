import { SceneStack, createRng } from '@jouster/game/engine';
import { Art } from '../art/art';
import { memoryStorage, newGameState, saveGame } from '../state/game-state';
import { InputDriver } from '../testing/input-driver';
import { GameContext } from './context';
import { TitleScene } from './title-scene';

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
