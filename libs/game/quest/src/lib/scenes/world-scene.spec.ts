import { InputAction, SceneStack, createRng } from '@jouster/game/engine';
import { Art } from '../art/art';
import { INN_RESPAWN, mapDef } from '../data/maps';
import { LANDMARKS } from '../data/overworld-gen';
import { CAVE_FOG_RADIUS, isExplored } from '../state/fog';
import { GameState, hasSave, loadGame, memoryStorage, newGameState, recruitCompanion } from '../state/game-state';
import { createMember } from '../state/party';
import { SUNNY_SIGHT_RADIUS, weatherAt, weatherSeed, weatherSightRadius } from '../state/weather';
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

  it('only recruits a companion after the first boss and their side quest', () => {
    const h = setup({ mapId: 'aldmere', x: 15, y: 13, facing: 'up' });
    const rolled = h.state.companions['tavern'];
    // Before the Goblin King falls companions only chat.
    h.tap('confirm');
    h.confirmUntilWorld();
    expect(h.state.party).toHaveLength(1);
    expect(h.state.quests['tavern']).toBeUndefined();

    // After the boss they ask a favour first.
    h.state.flags['bossDefeated'] = true;
    h.tap('confirm');
    h.confirmUntilWorld();
    expect(h.state.party).toHaveLength(1);
    expect(h.state.quests['tavern']).toBe('active');

    // With the Alpha Wolf slain they hand over the reward and offer to join.
    h.state.flags['alphaWolfDefeated'] = true;
    const gold = h.state.gold;
    h.tap('confirm');
    h.confirmUntilWorld();
    expect(h.state.quests['tavern']).toBe('done');
    expect(h.state.gold).toBe(gold + 60);
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
    h.state.flags['bossDefeated'] = true;
    h.state.quests['thornwick'] = 'done';
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
  it('opens the world map with M', () => {
    const h = setup({ mapId: 'overworld', x: LANDMARKS.aldmere.x, y: LANDMARKS.aldmere.y + 1, facing: 'down' });
    h.tap('map');
    expect(h.ctx.stack.top?.id).toBe('world-map');
    h.tap('map');
    expect(h.ctx.stack.top?.id).toBe('world');
  });

  it('reveals the fog of war around the party as it walks', () => {
    const start = grassRun();
    const h = setup({ mapId: 'overworld', ...start, facing: 'right' });
    const width = mapDef('overworld').rows[0].length;
    const bits = (): number[] => h.state.explored['overworld'];
    const edge = start.x + SUNNY_SIGHT_RADIUS + 1;
    expect(isExplored(bits(), width, start.x, start.y)).toBe(true);
    expect(isExplored(bits(), width, start.x + SUNNY_SIGHT_RADIUS, start.y)).toBe(true);
    expect(isExplored(bits(), width, edge, start.y)).toBe(false);
    h.hold('right', STEP_TIME + 0.02);
    h.run(0.3);
    expect(isExplored(bits(), width, edge, start.y)).toBe(true);
    expect(isExplored(bits(), width, start.x + 30, start.y)).toBe(false);
  });

  it('sees less far in bad weather', () => {
    const start = grassRun();
    const probe = newGameState('TEST', 'cleric');
    const seed = weatherSeed(probe);
    let steps = 0;
    while (steps < 100000 && weatherAt(steps, seed) !== 'fog' && weatherAt(steps, seed) !== 'blizzard') {
      steps += 40;
    }
    const radius = weatherSightRadius(weatherAt(steps, seed));
    expect(radius).toBeLessThanOrEqual(4);
    const h = setup({ ...probe, mapId: 'overworld', ...start, facing: 'right', steps });
    const width = mapDef('overworld').rows[0].length;
    expect(isExplored(h.state.explored['overworld'], width, start.x + radius, start.y)).toBe(true);
    expect(isExplored(h.state.explored['overworld'], width, start.x + radius + 1, start.y)).toBe(false);
  });

  it('keeps cave sight fixed, with one extra tile near a wall torch', () => {
    const width = mapDef('goblinCave').rows[0].length;
    const dark = setup({ mapId: 'goblinCave', x: 13, y: 10, facing: 'right' });
    const darkBits = dark.state.explored['goblinCave'];
    expect(isExplored(darkBits, width, 13 + CAVE_FOG_RADIUS, 10)).toBe(true);
    expect(isExplored(darkBits, width, 13 + CAVE_FOG_RADIUS + 1, 10)).toBe(false);
    const lit = setup({ mapId: 'goblinCave', x: 3, y: 17, facing: 'right' });
    const litBits = lit.state.explored['goblinCave'];
    expect(isExplored(litBits, width, 3 + CAVE_FOG_RADIUS + 1, 17)).toBe(true);
    expect(isExplored(litBits, width, 3 + CAVE_FOG_RADIUS + 2, 17)).toBe(false);
  });

  it('lets the Bone Captain rise after an inn rest during the Thornwick quest', () => {
    const h = setup({ mapId: INN_RESPAWN.mapId, x: INN_RESPAWN.x, y: INN_RESPAWN.y, facing: 'up' });
    h.tap('confirm');
    h.confirmUntilWorld();
    expect(h.state.flags['thornwickNight']).toBeUndefined();
    h.state.quests['thornwick'] = 'active';
    h.tap('confirm');
    h.confirmUntilWorld();
    expect(h.state.flags['thornwickNight']).toBe(true);
  });

  it('fights a mini-boss NPC and sets its defeat flag on victory', () => {
    const den = mapDef('wolfDen');
    const wolf = den.npcs.find((n) => n.role === 'boss');
    if (!wolf?.boss) {
      throw new Error('no den boss');
    }
    const h = setup({ mapId: 'wolfDen', x: wolf.x, y: wolf.y + 1, facing: 'up' });
    h.ctx.rng = createRng(5);
    h.tap('confirm');
    expect(h.ctx.stack.top?.id).toBe('message');
    for (let i = 0; i < 10 && h.ctx.stack.top?.id === 'message'; i++) {
      h.tap('confirm');
    }
    h.run(1);
    expect(h.ctx.stack.top?.id).toBe('battle');
    const battle = h.ctx.stack.top as unknown as {
      battle: { enemies: Array<{ hp: number }>; party: Array<{ hp: number; maxHp: number }> };
    };
    battle.battle.enemies.forEach((e) => (e.hp = 1));
    battle.battle.party.forEach((m) => (m.hp = m.maxHp = 999));
    for (let i = 0; i < 200 && h.ctx.stack.top?.id !== 'world'; i++) {
      h.tap('confirm');
      h.run(0.2);
    }
    h.confirmUntilWorld();

    expect(h.state.flags[wolf.boss.defeatFlag]).toBe(true);
  });

  it('marks the Thornwick ruins when visited', () => {
    const h = setup({ mapId: 'overworld', x: LANDMARKS.thornwick.x - 1, y: LANDMARKS.thornwick.y, facing: 'right' });
    h.hold('right', STEP_TIME + 0.02);
    h.run(0.2);
    expect(h.state.flags['sawRuins']).toBe(true);
    expect(h.ctx.stack.top?.id).toBe('message');
  });
});
