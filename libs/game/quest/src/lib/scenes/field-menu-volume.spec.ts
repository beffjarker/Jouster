import { AudioChannel, AudioManager, DEFAULT_CHANNEL_VOLUMES } from '@jouster/game/engine';
import { SceneStack, createRng } from '@jouster/game/engine';
import { Art } from '../art/art';
import { loadGame, memoryStorage, newGameState, saveGame } from '../state/game-state';
import { InputDriver } from '../testing/input-driver';
import { GameContext } from './context';
import { FieldMenuScene } from './menu-scenes';

/** Audio stand-in that keeps channel volumes in 0..1 like the real AudioManager. */
function fakeAudio(): { audio: AudioManager; volumes: Record<AudioChannel, number> } {
  const volumes: Record<AudioChannel, number> = { ...DEFAULT_CHANNEL_VOLUMES };
  const audio = {
    play: jest.fn(),
    toggleMute: jest.fn(),
    muted: false,
    dispose: jest.fn(),
    getChannelVolume: (channel: AudioChannel) => volumes[channel],
    setChannelVolume: (channel: AudioChannel, v: number) => {
      volumes[channel] = Math.min(1, Math.max(0, Math.round(v * 10) / 10));
    },
  };
  return { audio: audio as unknown as AudioManager, volumes };
}

function setup(): { ctx: GameContext; driver: InputDriver; volumes: Record<AudioChannel, number> } {
  const { audio, volumes } = fakeAudio();
  const ctx: GameContext = {
    stack: new SceneStack(),
    audio,
    art: {} as Art,
    rng: createRng(3),
    storage: memoryStorage(),
    state: newGameState('ANA', 'warrior'),
  };
  const driver = new InputDriver((dt, input) => ctx.stack.update(dt, input));
  return { ctx, driver, volumes };
}

describe('field menu VOLUME submenu', () => {
  it('starts music at 5% and everything else at 100%', () => {
    const { volumes } = setup();
    expect(volumes.music).toBe(0.05);
    expect(volumes.master).toBe(1);
    expect(volumes.ambient).toBe(1);
    expect(volumes.battle).toBe(1);
    expect(volumes.dialogue).toBe(1);
    expect(volumes.ui).toBe(1);
  });

  it('opens from the main menu and steps the highlighted channel with left and right', () => {
    const { ctx, driver, volumes } = setup();
    ctx.stack.push(new FieldMenuScene(ctx));
    // VOLUME is the 6th main menu entry (index 5).
    for (let i = 0; i < 5; i++) {
      driver.tap('down');
    }
    driver.tap('confirm');
    driver.run(0.1);
    // The cursor starts on MASTER; step it down then up again.
    driver.tap('left');
    expect(volumes.master).toBeCloseTo(0.9);
    driver.tap('right');
    expect(volumes.master).toBeCloseTo(1);
  });

  it('clamps each channel between 0% and 100%', () => {
    const { ctx, driver, volumes } = setup();
    ctx.stack.push(new FieldMenuScene(ctx));
    for (let i = 0; i < 5; i++) {
      driver.tap('down');
    }
    driver.tap('confirm');
    driver.run(0.1);
    driver.tap('right');
    expect(volumes.master).toBe(1);
    // Move down to MUSIC (row 1) and push it past both ends.
    driver.tap('down');
    for (let i = 0; i < 10; i++) {
      driver.tap('left');
    }
    expect(volumes.music).toBe(0);
    for (let i = 0; i < 12; i++) {
      driver.tap('right');
    }
    expect(volumes.music).toBe(1);
  });

  it('adjusts only the highlighted channel', () => {
    const { ctx, driver, volumes } = setup();
    ctx.stack.push(new FieldMenuScene(ctx));
    for (let i = 0; i < 5; i++) {
      driver.tap('down');
    }
    driver.tap('confirm');
    driver.run(0.1);
    driver.tap('down');
    driver.tap('down');
    driver.tap('left');
    expect(volumes.ambient).toBeCloseTo(0.9);
    expect(volumes.music).toBe(0.05);
    expect(volumes.master).toBe(1);
  });

  it('cancel returns to the main menu', () => {
    const { ctx, driver } = setup();
    ctx.stack.push(new FieldMenuScene(ctx));
    for (let i = 0; i < 5; i++) {
      driver.tap('down');
    }
    driver.tap('confirm');
    driver.run(0.1);
    driver.tap('cancel');
    driver.run(0.1);
    expect(ctx.stack.top?.id).toBe('field-menu');
    // Back on the main menu, CANCEL closes the field menu itself.
    driver.tap('cancel');
    driver.run(0.1);
    expect(ctx.stack.top?.id).not.toBe('field-menu');
  });
});

describe('field menu volume persistence', () => {
  it('writes a changed level into the game in progress and the stored save, without saving progress', () => {
    const { ctx, driver } = setup();
    const state = ctx.state;
    if (!state) {
      throw new Error('no state');
    }
    saveGame(ctx.storage, state);
    state.gold = 9999;
    ctx.stack.push(new FieldMenuScene(ctx));
    for (let i = 0; i < 5; i++) {
      driver.tap('down');
    }
    driver.tap('confirm');
    driver.run(0.1);
    driver.tap('down');
    driver.tap('right');
    expect(state.volumes?.music).toBeCloseTo(0.2);
    const stored = loadGame(ctx.storage);
    expect(stored?.volumes?.music).toBeCloseTo(0.2);
    expect(stored?.volumes?.master).toBe(1);
    expect(stored?.gold).not.toBe(9999);
  });

  it('keeps the levels in the game state when there is no save yet', () => {
    const { ctx, driver } = setup();
    ctx.stack.push(new FieldMenuScene(ctx));
    for (let i = 0; i < 5; i++) {
      driver.tap('down');
    }
    driver.tap('confirm');
    driver.run(0.1);
    driver.tap('left');
    expect(ctx.state?.volumes?.master).toBeCloseTo(0.9);
    expect(loadGame(ctx.storage)).toBeNull();
  });
});
