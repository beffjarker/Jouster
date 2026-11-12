import { InputAction, SceneStack, createRng } from '@jouster/game/engine';
import { Art } from '../art/art';
import { INN_RESPAWN, mapDef } from '../data/maps';
import { LANDMARKS } from '../data/overworld-gen';
import { GameState, hasSave, loadGame, memoryStorage, newGameState, recruitCompanion } from '../state/game-state';
import { createMember } from '../state/party';
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

/** An overworld grass tile with more grass to its right (for encounter tests). */
function grassRun(): { x: number; y: number } {
  const rows = mapDef('overworld').rows;
  for (let y = 0; y < rows.length; y++) {
    const x = rows[y].indexOf('...');
    if (x > 0) {
      return { x, y };
    }
  }
  throw new Error('no grass');
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
    const rolled = h.state.companions['tavern'];
    h.tap('confirm');
    h.confirmUntilWorld();
    expect(h.state.party.map((m) => m.id)).toEqual(['hero', 'tavern']);
    expect(h.state.party[1]).toMatchObject({ name: rolled.name, classId: rolled.classId });
    expect(rolled.classId).not.toBe('cleric');
  });

  it('warps between maps', () => {
    const h = setup({ mapId: 'overworld', x: LANDMARKS.aldmere.x, y: LANDMARKS.aldmere.y + 1, facing: 'up' });
    h.hold('up', STEP_TIME + 0.02);
    h.run(1);
    expect(h.state.mapId).toBe('aldmere');
    expect(h.ctx.stack.top).not.toBe(h.world);
    expect(h.ctx.stack.top?.id).toBe('world');
  });

  it('starts a random battle on encounter tiles', () => {
    const h = setup({ mapId: 'overworld', ...grassRun(), facing: 'right', stepsSinceBattle: 50 }, true);
    h.hold('right', STEP_TIME + 0.02);
    h.run(1);
    expect(h.ctx.stack.top?.id).toBe('battle');
  });

  it('plays a battle through to the end and returns to the world', () => {
    const h = setup({ mapId: 'overworld', ...grassRun(), facing: 'right', stepsSinceBattle: 50 }, true);
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

  it('spends the caster MP when healing from the field menu', () => {
    const h = setup({ mapId: 'aldmere', x: 4, y: 5, facing: 'up' });
    h.state.party[0] = createMember('hero', 'TEST', 'warrior');
    h.state.companions['thornwick'] = { name: 'Sera', classId: 'cleric' };
    expect(recruitCompanion(h.state, 'thornwick')).toBe(true);
    const [hero, sera] = h.state.party;
    hero.hp = 1;
    sera.hp = 1;
    const startMp = sera.mp;
    expect(startMp).toBeGreaterThanOrEqual(6);
    h.tap('cancel');
    h.tap('down');
    h.tap('down');
    h.tap('confirm'); // MAGIC
    h.tap('down');
    h.tap('confirm'); // caster: Sera
    h.tap('confirm'); // Heal
    h.tap('confirm'); // target: hero
    expect(hero.hp).toBeGreaterThan(1);
    expect(sera.mp).toBe(startMp - 3);

    h.tap('confirm'); // reveal message text
    h.tap('confirm'); // close message, back to the spell list
    h.tap('confirm'); // Heal
    h.tap('down');
    h.tap('confirm'); // target: Sera
    expect(sera.hp).toBeGreaterThan(1);
    expect(sera.mp).toBe(startMp - 6);
  });
  it('marks the Thornwick ruins when visited', () => {
    const h = setup({ mapId: 'overworld', x: LANDMARKS.thornwick.x - 1, y: LANDMARKS.thornwick.y, facing: 'right' });
    h.hold('right', STEP_TIME + 0.02);
    h.run(0.2);
    expect(h.state.flags['sawRuins']).toBe(true);
    expect(h.ctx.stack.top?.id).toBe('message');
  });
});
