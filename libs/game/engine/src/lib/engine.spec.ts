import { createRng } from './core/rng';
import { MAX_LEVEL, levelForXp, totalXpForLevel, xpToNext } from './rules/progression';
import {
  ENCOUNTER_GRACE_STEPS,
  EncounterTable,
  OUTLEVEL_MARGIN,
  OUTLEVEL_MIN_FACTOR,
  pickEncounter,
  rollEncounter,
  scaledEncounterRate,
} from './rules/encounter';
import { TileMap } from './world/tilemap';
import { firstStepToward } from './world/pathfind';
import { cappedRestore } from './rules/combat';
import { wrapText } from './runtime/pixel-font';
import { InputManager, KeyEventSource } from './runtime/input';
import { FrameScheduler, GameLoop } from './runtime/game-loop';
import { Scene, SceneStack } from './runtime/scene';
import { Pixels, imageDensity, scale2xPixels, setImageDensity, shadePixels } from './runtime/sprite';
import { Renderer } from './runtime/renderer';

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

  it('keeps the rate until the party out-levels the area, then cuts it sharply', () => {
    expect(scaledEncounterRate(0.1, 20)).toBe(0.1);
    expect(scaledEncounterRate(0.1, 2, 4)).toBe(0.1);
    expect(scaledEncounterRate(0.1, 4 + OUTLEVEL_MARGIN, 4)).toBe(0.1);
    expect(scaledEncounterRate(0.1, 5 + OUTLEVEL_MARGIN, 4)).toBeCloseTo(0.025);
    expect(scaledEncounterRate(0.1, 6 + OUTLEVEL_MARGIN, 4)).toBeCloseTo(0.0125);
    expect(scaledEncounterRate(0.1, 99, 4)).toBeCloseTo(0.1 * OUTLEVEL_MIN_FACTOR);
  });

  it('respects the enemy cap', () => {
    const rng = createRng(2);
    for (let i = 0; i < 50; i++) {
      expect(pickEncounter(table, rng, 2).length).toBeLessThanOrEqual(2);
    }
  });
});

describe('cappedRestore', () => {
  it('never takes a value above its maximum or below where it started', () => {
    const rng = createRng(11);
    for (let i = 0; i < 2000; i++) {
      const max = rng.int(1, 300);
      const current = rng.int(0, max);
      const amount = rng.int(0, 400);
      const gained = cappedRestore(current, max, amount);
      expect(gained).toBeGreaterThanOrEqual(0);
      expect(current + gained).toBeLessThanOrEqual(max);
      expect(gained).toBeLessThanOrEqual(amount);
    }
    expect(cappedRestore(10, 10, 50)).toBe(0);
    expect(cappedRestore(5, 10, 3)).toBe(3);
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

  it('records pointer taps for one frame and tracks the held pointer', () => {
    const input = new InputManager(new FakeKeys());
    expect(input.pointer).toBeNull();
    input.pointerDown(10, 20);
    input.pointerMove(12, 22);
    expect(input.tap).toEqual({ x: 10, y: 20 });
    expect(input.pointer).toEqual({ x: 12, y: 22, down: true });
    expect(input.pointerMovedThisFrame).toBe(true);
    input.endFrame();
    expect(input.tap).toBeNull();
    expect(input.pointerMovedThisFrame).toBe(false);
    expect(input.pointer?.down).toBe(true);
    input.pointerUp();
    expect(input.pointer).toEqual({ x: 12, y: 22, down: false });
  });

  it('lets on-screen buttons press and release actions', () => {
    const input = new InputManager(new FakeKeys());
    input.press('left');
    expect(input.wasPressed('left')).toBe(true);
    expect(input.isDown('left')).toBe(true);
    input.endFrame();
    expect(input.isDown('left')).toBe(true);
    input.release('left');
    expect(input.isDown('left')).toBe(false);
    input.pointerDown(1, 1);
    input.reset();
    expect(input.pointer?.down).toBe(false);
  });
});

describe('firstStepToward', () => {
  // S = start, G = goal, # = wall: the only way round is down the left column.
  const rows = ['S.#G', '..#.', '....'];
  const passable = (x: number, y: number): boolean => rows[y]?.[x] !== undefined && rows[y][x] !== '#';
  const goal = (x: number, y: number): boolean => rows[y]?.[x] === 'G';

  it('steps along a shortest path around walls', () => {
    expect(firstStepToward({ x: 0, y: 0 }, goal, passable)).toBe('down');
    expect(firstStepToward({ x: 1, y: 2 }, goal, passable)).toBe('right');
    expect(firstStepToward({ x: 3, y: 1 }, goal, passable)).toBe('up');
  });

  it('returns null when already there or unreachable', () => {
    expect(firstStepToward({ x: 3, y: 0 }, goal, passable)).toBeNull();
    expect(firstStepToward({ x: 0, y: 0 }, goal, (x, y) => passable(x, y) && y < 1)).toBeNull();
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

  it('reports the music of the topmost scene that defines one', () => {
    const stack = new SceneStack();
    const withMusic = (id: string, music?: string): Scene => ({ ...testScene(id, true), music });
    expect(stack.music).toBeNull();
    for (const [scene, expected] of [
      [withMusic('world', 'town'), 'town'],
      [withMusic('menu'), 'town'],
      [withMusic('battle', 'battle'), 'battle'],
      [withMusic('quiet', ''), null],
    ] as const) {
      stack.push(scene);
      stack.update(0, input);
      expect(stack.music).toBe(expected);
    }
  });

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

/** Builds pixels from rows of single-character colour keys ('.' = transparent). */
function px(rows: string[], colors: Record<string, [number, number, number]>): Pixels {
  const width = rows[0].length;
  const data = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const c = colors[ch];
      if (c) {
        data.set([c[0], c[1], c[2], 255], (y * width + x) * 4);
      }
    }),
  );
  return { width, height: rows.length, data };
}

function rgba(p: Pixels, x: number, y: number): number[] {
  const i = (y * p.width + x) * 4;
  return [...p.data.slice(i, i + 4)];
}

describe('hi-res pixel pipeline', () => {
  const colors: Record<string, [number, number, number]> = { a: [200, 0, 0], b: [0, 0, 200] };

  it('scale2x doubles size and keeps flat areas as solid blocks', () => {
    const out = scale2xPixels(px(['aa', 'aa'], colors));
    expect(out.width).toBe(4);
    expect(out.height).toBe(4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(rgba(out, x, y)).toEqual([200, 0, 0, 255]);
      }
    }
  });

  it('scale2x rounds a diagonal edge instead of producing 2x2 steps', () => {
    // b a
    // a a  -> the top-left output pixel of the 'b' block takes neighbour colour, not plain 'b'.
    const src = px(['ba', 'aa'], colors);
    const out = scale2xPixels(src);
    expect(rgba(out, 0, 0)).toEqual([0, 0, 200, 255]);
    expect(rgba(out, 1, 1)).toEqual([200, 0, 0, 255]);
  });

  it('shadePixels outlines the silhouette and lights the top edge', () => {
    const p = px(['....', '.aa.', '.aa.', '.aa.', '.aa.', '.aa.', '....'], colors);
    shadePixels(p, { outline: [1, 2, 3] });
    expect(rgba(p, 0, 1)).toEqual([1, 2, 3, 255]);
    expect(rgba(p, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(rgba(p, 1, 1)[0]).toBeGreaterThan(200);
    expect(rgba(p, 1, 5)[0]).toBeLessThan(200);
    expect(rgba(p, 1, 3)).toEqual([200, 0, 0, 255]);
  });

  it('tracks image density and the renderer divides it out of the draw size', () => {
    const img = { width: 32, height: 32 };
    expect(imageDensity(img)).toBe(1);
    setImageDensity(img, 2);
    expect(imageDensity(img)).toBe(2);

    const drawImage = jest.fn();
    const setTransform = jest.fn();
    const ctx = {
      canvas: { width: 512, height: 480 },
      setTransform,
      drawImage,
      save: jest.fn(),
      restore: jest.fn(),
      imageSmoothingEnabled: true,
    } as unknown as CanvasRenderingContext2D;
    const r = new Renderer(ctx, { pixelRatio: 2 });
    expect(r.width).toBe(256);
    expect(r.height).toBe(240);
    expect(setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    r.draw(img as unknown as HTMLCanvasElement, 10.3, 4, { scale: 2 });
    expect(drawImage).toHaveBeenCalledWith(img, 10.5, 4, 32, 32);
  });
});