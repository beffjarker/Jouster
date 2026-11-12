import { createRng } from './core/rng';
import { MAX_LEVEL, levelForXp, totalXpForLevel, xpToNext } from './rules/progression';
import { ENCOUNTER_GRACE_STEPS, EncounterTable, pickEncounter, rollEncounter } from './rules/encounter';
import { TileMap } from './world/tilemap';
import { wrapText } from './runtime/pixel-font';
import { InputManager, KeyEventSource } from './runtime/input';
import { FrameScheduler, GameLoop } from './runtime/game-loop';
import { Scene, SceneStack } from './runtime/scene';

class FakeKeys implements KeyEventSource {
  private readonly listeners = new Map<string, Array<(e: Event) => void>>();

  public addEventListener(type: string, listener: (event: Event) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  public removeEventListener(type: string, listener: (event: Event) => void): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((l) => l !== listener),
    );
  }

  public emit(type: 'keydown' | 'keyup', code: string, key = ''): void {
    const event = { code, key, repeat: false, preventDefault: jest.fn(), target: null } as unknown as Event;
    (this.listeners.get(type) ?? []).forEach((l) => l(event));
  }

  public count(type: string): number {
    return this.listeners.get(type)?.length ?? 0;
  }
}

function testScene(id: string, overlay = false): Scene & { updates: number; renders: number } {
  return {
    id,
    overlay,
    updates: 0,
    renders: 0,
    update(): void {
      this.updates++;
    },
    render(): void {
      this.renders++;
    },
  };
}

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
    seqA.forEach((n) => {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    });
  });

  it('produces ints within inclusive bounds', () => {
    const rng = createRng(7);
    for (let i = 0; i < 200; i++) {
      const n = rng.int(2, 5);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it('honours weights', () => {
    const rng = createRng(3);
    const picks = Array.from({ length: 500 }, () => rng.weighted(['a', 'b'], (x) => (x === 'a' ? 0 : 1)));
    expect(picks.every((p) => p === 'b')).toBe(true);
  });
});

describe('progression', () => {
  it('has increasing xp requirements', () => {
    for (let l = 1; l < MAX_LEVEL; l++) {
      expect(xpToNext(l + 1)).toBeGreaterThanOrEqual(xpToNext(l));
    }
  });

  it('round-trips level and total xp', () => {
    for (let l = 1; l <= MAX_LEVEL; l++) {
      expect(levelForXp(totalXpForLevel(l))).toBe(l);
    }
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(Number.MAX_SAFE_INTEGER)).toBe(MAX_LEVEL);
  });
});

describe('encounters', () => {
  const table: EncounterTable = {
    id: 't',
    rate: 1,
    groups: [
      { monsterIds: ['a', 'a', 'a'], weight: 1 },
      { monsterIds: ['b'], weight: 1 },
    ],
  };

  it('never triggers during the grace period', () => {
    const rng = createRng(1);
    for (let s = 0; s < ENCOUNTER_GRACE_STEPS; s++) {
      expect(rollEncounter(1, s, rng)).toBe(false);
    }
    expect(rollEncounter(1, ENCOUNTER_GRACE_STEPS + 10, rng)).toBe(true);
  });

  it('respects the enemy cap', () => {
    const rng = createRng(2);
    for (let i = 0; i < 50; i++) {
      expect(pickEncounter(table, rng, 2).length).toBeLessThanOrEqual(2);
    }
  });
});

describe('TileMap', () => {
  const map = new TileMap(
    ['#.#', '...'],
    [
      { char: '#', id: 'wall', solid: true },
      { char: '.', id: 'floor', solid: false },
    ],
  );

  it('reads tiles and solidity', () => {
    expect(map.width).toBe(3);
    expect(map.height).toBe(2);
    expect(map.tileAt(1, 0)?.id).toBe('floor');
    expect(map.isSolid(0, 0)).toBe(true);
    expect(map.isSolid(1, 1)).toBe(false);
  });

  it('treats out of bounds as solid', () => {
    expect(map.inBounds(-1, 0)).toBe(false);
    expect(map.isSolid(-1, 0)).toBe(true);
    expect(map.isSolid(3, 1)).toBe(true);
  });
});

describe('wrapText', () => {
  it('wraps on word boundaries within the limit', () => {
    const lines = wrapText('the quick brown fox jumps over the lazy dog', 10);
    expect(lines.length).toBeGreaterThan(1);
    lines.forEach((l) => expect(l.length).toBeLessThanOrEqual(10));
    expect(lines.join(' ')).toBe('the quick brown fox jumps over the lazy dog');
  });
});

describe('InputManager', () => {
  it('maps keys to actions and clears presses each frame', () => {
    const keys = new FakeKeys();
    const input = new InputManager(keys);
    input.attach();
    keys.emit('keydown', 'KeyZ', 'z');
    expect(input.wasPressed('confirm')).toBe(true);
    expect(input.isDown('confirm')).toBe(true);
    input.endFrame();
    expect(input.wasPressed('confirm')).toBe(false);
    expect(input.isDown('confirm')).toBe(true);
    keys.emit('keyup', 'KeyZ', 'z');
    expect(input.isDown('confirm')).toBe(false);
    input.detach();
    expect(keys.count('keydown')).toBe(0);
  });
});

describe('GameLoop', () => {
  it('runs fixed updates and renders once per frame', () => {
    let callback: ((t: number) => void) | null = null;
    const scheduler: FrameScheduler = {
      request: (cb) => {
        callback = cb;
        return 1;
      },
      cancel: () => {
        callback = null;
      },
    };
    const update = jest.fn();
    const render = jest.fn();
    const loop = new GameLoop(update, render, scheduler);
    loop.start();
    callback?.(0);
    callback?.(100);
    expect(render).toHaveBeenCalledTimes(2);
    expect(update.mock.calls.length).toBeGreaterThanOrEqual(6);
    loop.stop();
    expect(loop.running).toBe(false);
  });
});

describe('SceneStack', () => {
  const input = new InputManager(new FakeKeys());

  it('only updates the top scene and renders overlays over the scene below', () => {
    const onChange = jest.fn();
    const stack = new SceneStack(onChange);
    const world = testScene('world');
    const menu = testScene('menu', true);
    stack.push(world);
    stack.push(menu);
    stack.update(0.1, input);
    expect(world.updates).toBe(0);
    expect(menu.updates).toBe(1);
    stack.render({ fade: jest.fn() } as never);
    expect(world.renders).toBe(1);
    expect(menu.renders).toBe(1);
    expect(onChange).toHaveBeenLastCalledWith(menu);
  });

  it('applies faded operations after the fade out', () => {
    const stack = new SceneStack();
    stack.push(testScene('a'));
    stack.replace(testScene('b'), true);
    expect(stack.top?.id).toBe('a');
    expect(stack.transitioning).toBe(true);
    stack.update(1, input);
    expect(stack.top?.id).toBe('b');
    stack.update(1, input);
    expect(stack.transitioning).toBe(false);
  });

  it('reset leaves a single scene', () => {
    const stack = new SceneStack();
    stack.push(testScene('a'));
    stack.push(testScene('b'));
    stack.reset(testScene('c'));
    expect(stack.size).toBe(1);
    expect(stack.top?.id).toBe('c');
  });
});
