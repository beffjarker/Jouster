import { InputAction, SceneStack, createRng } from '@jouster/game/engine';
import { Art } from '../art/art';
import { INN_RESPAWN } from '../data/maps';
import { GameState, hasSave, loadGame, memoryStorage, newGameState } from '../state/game-state';
import { InputDriver } from '../testing/input-driver';
import { GameContext } from './context';
import { STEP_TIME, WorldScene } from './world-scene';

interface Harness {
  ctx: GameContext;
  state: GameState;
  world: WorldScene;
  run(seconds: number): void;
  tap(action: InputAction): void;
  hold(action: InputAction, seconds: number): void;
  /** Taps confirm until the world is the active scene again. */
  confirmUntilWorld(max?: number): void;
}

function setup(place: Partial<GameState>, alwaysEncounter = false): Harness {
  const rng = createRng(11);
  rng.chance = (): boolean => alwaysEncounter;
  const state = Object.assign(newGameState('TEST', 'cleric'), place);
  const ctx: GameContext = {
    stack: new SceneStack(),
    audio: { play: jest.fn(), toggleMute: jest.fn(), muted: false, dispose: jest.fn() } as never,
    art: {} as Art,
    rng,
    storage: memoryStorage(),
    state,
  };
  const world = new WorldScene(ctx);
  ctx.stack.push(world);
  const driver = new InputDriver((dt, input) => ctx.stack.update(dt, input));
  const confirmUntilWorld = (max = 40): void => {
    for (let i = 0; i < max && ctx.stack.top?.id !== 'world'; i++) {
      driver.tap('confirm');
    }
  };
  return {
    ctx,
    state,
    world,
    run: (s) => driver.run(s),
    tap: (a) => driver.tap(a),
    hold: (a, s) => driver.hold(a, s),
    confirmUntilWorld,
  };
}

describe('WorldScene', () => {
  it('walks one tile per step and blocks on solid tiles', () => {
    const h = setup({ mapId: 'aldmere', x: 4, y: 5, facing: 'up' });
    h.hold('up', STEP_TIME + 0.02);
    h.run(0.3);
    expect(h.state.y).toBe(4);
    expect(h.state.steps).toBe(1);
    h.hold('up', 2);
    h.run(0.3);
    // The king (4,2) blocks the way.
    expect(h.state.y).toBe(3);
  });

  it('receives the quest and gold from the king once', () => {
    const h = setup({ mapId: 'aldmere', x: 4, y: 3, facing: 'up' });
    h.tap('confirm');
    expect(h.ctx.stack.top?.id).toBe('message');
    expect(h.state.flags['metKing']).toBe(true);
    expect(h.state.gold).toBe(100);
    h.confirmUntilWorld();
    expect(h.ctx.stack.top?.id).toBe('world');
    h.tap('confirm');
    h.confirmUntilWorld();
    expect(h.state.gold).toBe(100);
  });

  it('rests at the inn, restoring the party and saving', () => {
    const h = setup({ mapId: INN_RESPAWN.mapId, x: INN_RESPAWN.x, y: INN_RESPAWN.y, facing: 'up' });
    h.state.party[0].hp = 1;
    h.tap('confirm');
    h.confirmUntilWorld();
    expect(h.state.party[0].hp).toBeGreaterThan(1);
    expect(h.state.gold).toBe(44);
    expect(hasSave(h.ctx.storage)).toBe(true);
    expect(loadGame(h.ctx.storage)?.party[0].name).toBe('TEST');
  });

  it('recruits a companion in the tavern', () => {
    const h = setup({ mapId: 'aldmere', x: 15, y: 13, facing: 'up' });
    h.tap('confirm');
    h.confirmUntilWorld();
    expect(h.state.party.map((m) => m.id)).toEqual(['hero', 'bren']);
    expect(h.state.party[1].classId).toBe('warrior');
  });

  it('warps between maps', () => {
    const h = setup({ mapId: 'overworld', x: 10, y: 15, facing: 'up' });
    h.hold('up', STEP_TIME + 0.02);
    h.run(1);
    expect(h.state.mapId).toBe('aldmere');
    expect(h.ctx.stack.top).not.toBe(h.world);
    expect(h.ctx.stack.top?.id).toBe('world');
  });

  it('starts a random battle on encounter tiles', () => {
    const h = setup({ mapId: 'overworld', x: 5, y: 14, facing: 'right', stepsSinceBattle: 50 }, true);
    h.hold('right', STEP_TIME + 0.02);
    h.run(1);
    expect(h.ctx.stack.top?.id).toBe('battle');
  });

  it('plays a battle through to the end and returns to the world', () => {
    const h = setup({ mapId: 'overworld', x: 5, y: 14, facing: 'right', stepsSinceBattle: 50 }, true);
    h.hold('right', STEP_TIME + 0.02);
    h.run(1);
    h.ctx.rng = createRng(5);
    for (let i = 0; i < 600 && h.ctx.stack.top?.id !== 'world'; i++) {
      h.tap('confirm');
      h.run(0.2);
    }
    h.run(1);
    h.confirmUntilWorld();
    expect(h.ctx.stack.top?.id).toBe('world');
    const hero = h.state.party[0];
    const won = hero.xp > 0;
    if (won) {
      expect(hero.hp).toBeGreaterThan(0);
    } else {
      expect(h.state.mapId).toBe(INN_RESPAWN.mapId);
      expect(hero.hp).toBeGreaterThan(0);
    }
    expect(h.state.stepsSinceBattle).toBe(0);
  });

  it('opens the field menu on cancel', () => {
    const h = setup({ mapId: 'aldmere', x: 4, y: 5, facing: 'up' });
    h.tap('cancel');
    expect(h.ctx.stack.top?.id).toBe('field-menu');
  });

  it('marks the Thornwick ruins when visited', () => {
    const h = setup({ mapId: 'overworld', x: 26, y: 21, facing: 'right' });
    h.hold('right', STEP_TIME + 0.02);
    h.run(0.2);
    expect(h.state.flags['sawRuins']).toBe(true);
    expect(h.ctx.stack.top?.id).toBe('message');
  });
});
