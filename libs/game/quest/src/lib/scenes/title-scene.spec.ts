import { CELL_WIDTH, Renderer, SceneStack, createRng } from '@jouster/game/engine';
import { Art } from '../art/art';
import { CLASS_ORDER } from '../data/classes';
import { loadGame, memoryStorage, newGameState, saveGame } from '../state/game-state';
import { InputDriver } from '../testing/input-driver';
import { SCREEN_W } from '../ui/widgets';
import { GameContext } from './context';
import { ClassSelectScene, NAME_KEYS, NameEntryScene, TitleScene, nameKeyAt } from './title-scene';

function setup(): { ctx: GameContext; driver: InputDriver } {
  const ctx: GameContext = {
    stack: new SceneStack(),
    audio: {
      play: jest.fn(),
      toggleMute: jest.fn(),
      muted: false,
      dispose: jest.fn(),
      getChannelVolume: jest.fn(() => 1),
      setChannelVolume: jest.fn(),
    } as never,
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
    const saved = newGameState('SAVED', 'necromancer');
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

describe('class select layout', () => {
  interface Span {
    s: string;
    x0: number;
    x1: number;
    y: number;
  }

  /** Renders the scene with a recorder and returns every text run and window. */
  function capture(scene: ClassSelectScene): { spans: Span[]; windows: Array<{ x: number; w: number }> } {
    const spans: Span[] = [];
    const windows: Array<{ x: number; w: number }> = [];
    const width = (s: string): number => s.length * CELL_WIDTH;
    const r = new Proxy(
      {
        text: (s: string, x: number, y: number) => spans.push({ s, x0: x, x1: x + width(s), y }),
        textRight: (s: string, x: number, y: number) => spans.push({ s, x0: x - width(s), x1: x, y }),
        textCentered: (s: string, x: number, y: number) =>
          spans.push({ s, x0: x - width(s) / 2, x1: x + width(s) / 2, y }),
        window: (x: number, _y: number, w: number) => windows.push({ x, w }),
      },
      { get: (t, k) => (t as Record<string | symbol, unknown>)[k] ?? jest.fn() },
    ) as unknown as Renderer;
    scene.render(r);
    return { spans, windows };
  }

  it('fits every class name in the list and never overlaps text on a row', () => {
    const { ctx, driver } = setup();
    ctx.art = { titleBackdrop: () => ({}), character: () => ({ width: 32, height: 32 }) } as unknown as Art;
    const scene = new ClassSelectScene(ctx);
    ctx.stack.push(scene);
    CLASS_ORDER.forEach((id, i) => {
      if (i > 0) {
        driver.tap('down');
      }
      const { spans, windows } = capture(scene);
      const [list, detail] = windows;
      expect(list.x + list.w).toBeLessThanOrEqual(detail.x);
      spans
        .filter((sp) => sp.x0 < detail.x)
        .forEach((sp) => expect({ id, s: sp.s, right: sp.x1 <= list.x + list.w - 4 }).toEqual({ id, s: sp.s, right: true }));
      spans.forEach((a, ai) => {
        expect(a.x1).toBeLessThanOrEqual(SCREEN_W);
        spans.slice(ai + 1).forEach((b) => {
          const sameRow = Math.abs(a.y - b.y) < 8;
          const clash = sameRow && a.x0 < b.x1 && b.x0 < a.x1;
          expect({ id, a: a.s, b: b.s, clash }).toEqual({ id, a: a.s, b: b.s, clash: false });
        });
      });
    });
  });
});

describe('title OPTIONS volume menu', () => {
  it('opens VOLUME from the title menu and steps the highlighted channel', () => {
    const { ctx, driver } = setup();
    const volumes: Record<string, number> = { master: 1, music: 0.05 };
    ctx.audio = {
      ...ctx.audio,
      getChannelVolume: (c: string) => volumes[c] ?? 1,
      setChannelVolume: (c: string, v: number) => {
        volumes[c] = Math.min(1, Math.max(0, Math.round(v * 10) / 10));
      },
    } as never;
    ctx.stack.push(new TitleScene(ctx));
    driver.tap('down');
    driver.tap('down');
    driver.tap('confirm');
    driver.run(0.1);
    driver.tap('left');
    expect(volumes.master).toBeCloseTo(0.9);
    driver.tap('cancel');
    driver.run(0.1);
    expect(ctx.stack.top?.id).toBe('title');
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

describe('saved volume settings', () => {
  function withVolumes(ctx: GameContext): Record<string, number> {
    const volumes: Record<string, number> = { master: 1, music: 0.05, ambient: 1, battle: 1, dialogue: 1, ui: 1 };
    ctx.audio = {
      ...ctx.audio,
      getChannelVolume: (c: string) => volumes[c],
      setChannelVolume: (c: string, v: number) => {
        volumes[c] = Math.min(1, Math.max(0, Math.round(v * 100) / 100));
      },
    } as never;
    return volumes;
  }

  it('restores the saved levels on the title screen and keeps them on CONTINUE', () => {
    const { ctx, driver } = setup();
    const volumes = withVolumes(ctx);
    const saved = newGameState('SAVED', 'wizard');
    saved.volumes = { music: 0.3, battle: 0.5 };
    saveGame(ctx.storage, saved);
    ctx.stack.push(new TitleScene(ctx));
    expect(volumes.music).toBeCloseTo(0.3);
    expect(volumes.battle).toBeCloseTo(0.5);
    expect(volumes.master).toBe(1);
    driver.tap('confirm');
    driver.run(0.6);
    expect(ctx.stack.top?.id).toBe('world');
    expect(ctx.state?.volumes).toMatchObject({ music: 0.3, battle: 0.5, master: 1 });
  });

  it('stores a level changed in title OPTIONS into the existing save', () => {
    const { ctx, driver } = setup();
    const volumes = withVolumes(ctx);
    saveGame(ctx.storage, newGameState('SAVED', 'cleric'));
    ctx.stack.push(new TitleScene(ctx));
    driver.tap('down');
    driver.tap('confirm');
    driver.run(0.1);
    driver.tap('left');
    expect(volumes.master).toBeCloseTo(0.9);
    expect(loadGame(ctx.storage)?.volumes?.master).toBeCloseTo(0.9);
    expect(loadGame(ctx.storage)?.party[0].name).toBe('SAVED');
  });

  it('starts a new game with the current levels', () => {
    const { ctx, driver } = setup();
    const volumes = withVolumes(ctx);
    volumes.music = 0.4;
    ctx.stack.push(new TitleScene(ctx));
    driver.tap('confirm');
    driver.run(0.6);
    driver.tap('confirm');
    driver.run(0.6);
    driver.type('Enter');
    driver.run(0.6);
    expect(ctx.state?.volumes?.music).toBeCloseTo(0.4);
  });
});
