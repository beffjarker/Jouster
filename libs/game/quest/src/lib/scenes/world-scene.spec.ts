import { InputAction, SceneStack, createRng } from '@jouster/game/engine';
import { Art } from '../art/art';
import { INN_RESPAWN, mapDef } from '../data/maps';
import { ENCOUNTER_TABLES } from '../data/monsters';
import { LANDMARKS } from '../data/overworld-gen';
import { SOUTH_LANDMARKS } from '../data/southlands-gen';
import { CAVE_FOG_RADIUS, isExplored } from '../state/fog';
import { GameState, hasSave, loadGame, memoryStorage, newGameState, recruitCompanion } from '../state/game-state';
import { createMember } from '../state/party';
import { SUNNY_SIGHT_RADIUS, weatherAt, weatherSeed, weatherSightRadius } from '../state/weather';
import { InputDriver } from '../testing/input-driver';
import { GameContext } from './context';
import { SKY_FADE_SECONDS, STEP_TIME, WorldScene, cameraAxis } from './world-scene';

interface Harness {
  ctx: GameContext;
  state: GameState;
  world: WorldScene;
  run(seconds: number): void;
  tap(action: InputAction): void;
  /** Clicks / taps the centre of a map tile. */
  tapTile(x: number, y: number): void;
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
    tapTile: (x, y) => {
      const p = world.tileToScreen(x, y);
      driver.tapAt(p.x, p.y);
    },
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

describe('cameraAxis', () => {
  it('centres a map smaller than the view and keeps it still', () => {
    // 22 tiles = 352 units in a 480-unit view: 64 units of border each side.
    expect(cameraAxis(0, 22, 480)).toBe(-64);
    expect(cameraAxis(300, 22, 480)).toBe(-64);
  });

  it('follows the leader on maps larger than the view', () => {
    expect(cameraAxis(800, 60, 480)).toBe(800 - (480 - 16) / 2);
  });
});

describe('WorldScene', () => {
  it('walks one tile per step and blocks on solid tiles', () => {
    const h = setup({ mapId: 'aldmere', x: 6, y: 5, facing: 'up' });
    h.hold('up', STEP_TIME + 0.02);
    h.run(0.3);
    expect(h.state.y).toBe(4);
    expect(h.state.steps).toBe(1);
    h.hold('up', 2);
    h.run(0.3);
    // The king on his throne (6,2) blocks the way.
    expect(h.state.y).toBe(3);
  });

  it('receives the quest and gold from the king once', () => {
    const h = setup({ mapId: 'aldmere', x: 6, y: 3, facing: 'up' });
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

  it('reads a town sign when facing it', () => {
    const h = setup({ mapId: 'aldmere', x: 5, y: 16, facing: 'up' });
    h.tap('confirm');
    expect(h.ctx.stack.top?.id).toBe('message');
    const pages = (h.ctx.stack.top as unknown as { pages: string[][] }).pages.flat().join(' ');
    expect(pages).toContain('ALDMERE ITEM SHOP');
    h.confirmUntilWorld();
    expect(h.ctx.stack.top?.id).toBe('world');
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
    const h = setup({ mapId: 'aldmere', x: 11, y: 24, facing: 'right' });
    const rolled = h.state.companions['tavern'];
    // Before the Goblin King falls companions only chat.
    h.tap('confirm');
    h.confirmUntilWorld();
    expect(h.state.party).toHaveLength(1);
    expect(h.state.quests['tavern']).toBeUndefined();

    // After the boss they ask a favour first; declining (cancel = NO) leaves it on offer.
    h.state.flags['bossDefeated'] = true;
    h.tap('confirm');
    for (let i = 0; i < 40 && h.ctx.stack.top?.id !== 'world'; i++) {
      h.tap('cancel');
    }
    expect(h.state.quests['tavern']).toBe('available');
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

  it('bars the southern pass until Act I is complete (plan 17)', () => {
    const at = { mapId: 'overworld', x: LANDMARKS.southPass.x, y: LANDMARKS.southPass.y - 1, facing: 'down' as const };
    const locked = setup(at);
    locked.hold('down', STEP_TIME + 0.02);
    locked.run(1);
    expect(locked.state.mapId).toBe('overworld');
    expect(locked.ctx.stack.top?.id).toBe('message');
    const pages = (locked.ctx.stack.top as unknown as { pages: string[][] }).pages.flat().join(' ');
    expect(pages).toContain('southern pass is barred');

    const open = setup(at);
    open.state.flags['actOneComplete'] = true;
    open.hold('down', STEP_TIME + 0.02);
    open.run(1);
    expect(open.state.mapId).toBe('southlands');
  });

  it('ends Act II with a reward once both shrine bosses are slain (plan 17)', () => {
    const h = setup({ mapId: 'aldmere', x: 6, y: 3, facing: 'up' });
    Object.assign(h.state.flags, { metKing: true, bossDefeated: true, actOneComplete: true, sandWyrmDefeated: true });
    h.tap('confirm');
    h.confirmUntilWorld();
    expect(h.state.flags['actTwoComplete']).toBeUndefined();
    h.state.flags['marshWitchDefeated'] = true;
    const gold = h.state.gold;
    h.tap('confirm');
    const pages = (h.ctx.stack.top as unknown as { pages: string[][] }).pages.flat().join(' ');
    expect(pages).toContain('END OF ACT II');
    expect(h.state.flags['actTwoComplete']).toBe(true);
    expect(h.state.gold).toBe(gold + 500);
  });

  it('fights on desert sand outdoors but in the cave inside the shrines (plan 17)', () => {
    const backdropAfterStep = (place: Partial<GameState>, dir: InputAction): string | undefined => {
      const h = setup({ ...place, stepsSinceBattle: 50 }, true);
      h.hold(dir, STEP_TIME + 0.02);
      h.run(1);
      expect(h.ctx.stack.top?.id).toBe('battle');
      return (h.ctx.stack.top as unknown as { options: { backdrop: string } }).options.backdrop;
    };
    const { pass } = SOUTH_LANDMARKS;
    expect(backdropAfterStep({ mapId: 'southlands', x: pass.x, y: pass.y + 2, facing: 'down' }, 'down')).toBe('desert');
    expect(backdropAfterStep({ mapId: 'sunShrine', x: 9, y: 12, facing: 'right' }, 'right')).toBe('cave');
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
    const h = setup({ mapId: 'aldmere', x: 6, y: 5, facing: 'up' });
    h.tap('cancel');
    expect(h.ctx.stack.top?.id).toBe('field-menu');
  });

  it('opens the menu straight on EQUIP with E and equips armor from the bag', () => {
    const h = setup({ mapId: 'aldmere', x: 6, y: 5, facing: 'up' });
    h.state.inventory['leatherArmor'] = 1;
    h.tap('equip');
    expect(h.ctx.stack.top?.id).toBe('field-menu');
    h.tap('confirm'); // hero
    h.tap('down');
    h.tap('confirm'); // ARMOR
    h.tap('confirm'); // Leather Armor
    expect(h.state.party[0].armorId).toBe('leatherArmor');
    expect(h.state.inventory['leatherArmor']).toBeUndefined();
  });

  it('opens the menu with I', () => {
    const h = setup({ mapId: 'aldmere', x: 6, y: 5, facing: 'up' });
    h.tap('items');
    expect(h.ctx.stack.top?.id).toBe('field-menu');
  });

  it('closes the menu with the key that opened it, even from a submenu', () => {
    const h = setup({ mapId: 'aldmere', x: 6, y: 5, facing: 'up' });
    h.tap('items');
    h.tap('confirm'); // herb -> who?
    h.tap('items');
    expect(h.ctx.stack.top?.id).toBe('world');
    h.tap('equip');
    h.tap('confirm'); // hero -> slots
    h.tap('equip');
    expect(h.ctx.stack.top?.id).toBe('world');
  });

  it('only closes on the opening key (other menu keys keep it open)', () => {
    const h = setup({ mapId: 'aldmere', x: 6, y: 5, facing: 'up' });
    h.tap('items');
    h.tap('equip');
    expect(h.ctx.stack.top?.id).toBe('field-menu');
    h.tap('cancel'); // item list -> main menu
    h.tap('cancel'); // main menu closes
    expect(h.ctx.stack.top?.id).toBe('world');
    h.tap('cancel');
    h.tap('items');
    expect(h.ctx.stack.top?.id).toBe('field-menu');
  });

  it('buys armor from the Aldmere armorer and equips it now', () => {
    const h = setup({ mapId: 'aldmere', x: 26, y: 13, facing: 'up', gold: 500 });
    const tapUntil = (id: string): void => {
      for (let i = 0; i < 12 && h.ctx.stack.top?.id !== id; i++) {
        h.tap('confirm');
      }
    };
    h.tap('confirm');
    tapUntil('shop');
    expect(h.ctx.stack.top?.id).toBe('shop');
    h.tap('confirm'); // Cloth Robe
    tapUntil('shop'); // "Equip it now?" -> first choice is the hero
    expect(h.state.party[0].armorId).toBe('clothRobe');
    expect(h.state.gold).toBe(470);
  });

  it('spends the caster MP when healing from the field menu', () => {
    const h = setup({ mapId: 'aldmere', x: 6, y: 5, facing: 'up' });
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

  it('makes monsters shy away from a party that far out-levels the area', () => {
    const rateAt = (level: number): number => {
      const h = setup({ mapId: 'overworld', ...grassRun(), facing: 'right', stepsSinceBattle: 50 });
      h.state.party[0].level = level;
      const rates: number[] = [];
      h.ctx.rng.chance = (p: number): boolean => {
        rates.push(p);
        return false;
      };
      h.hold('right', STEP_TIME + 0.02);
      h.run(0.3);
      return rates[rates.length - 1];
    };
    const base = ENCOUNTER_TABLES.get('greenwood')?.rate ?? 0;
    const area = ENCOUNTER_TABLES.get('greenwood')?.level ?? 0;
    expect(rateAt(1)).toBeCloseTo(base);
    expect(rateAt(area + 3)).toBeCloseTo(base);
    expect(rateAt(area + 4)).toBeCloseTo(base / 4);
    expect(rateAt(area + 8)).toBeLessThan(base / 16);
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

  it('fades the sky from the old weather to the new one instead of switching at once', () => {
    const start = grassRun();
    const probe = newGameState('TEST', 'cleric');
    const seed = weatherSeed(probe);
    let steps = 39;
    while (weatherAt(steps, seed) === weatherAt(steps + 1, seed)) {
      steps += 40;
    }
    const before = weatherAt(steps, seed);
    const h = setup({ ...probe, mapId: 'overworld', ...start, facing: 'right', steps });
    const sky = h.world as unknown as { skyFade: number; skyFrom: { weather: string } | null };
    expect(sky.skyFade).toBe(1);
    h.hold('right', STEP_TIME * 1.2);
    expect(h.state.steps).toBe(steps + 1);
    expect(sky.skyFrom?.weather).toBe(before);
    expect(sky.skyFade).toBeGreaterThan(0);
    expect(sky.skyFade).toBeLessThan(1);
    h.run(SKY_FADE_SECONDS);
    expect(sky.skyFade).toBe(1);
  });

  it('keeps cave sight fixed, with one extra tile near a wall torch', () => {
    const width = mapDef('goblinCave').rows[0].length;
    const dark = setup({ mapId: 'goblinCave', x: 3, y: 18, facing: 'right' });
    const darkBits = dark.state.explored['goblinCave'];
    expect(isExplored(darkBits, width, 3 + CAVE_FOG_RADIUS, 18)).toBe(true);
    expect(isExplored(darkBits, width, 3 + CAVE_FOG_RADIUS + 1, 18)).toBe(false);
    const lit = setup({ mapId: 'goblinCave', x: 3, y: 14, facing: 'right' });
    const litBits = lit.state.explored['goblinCave'];
    expect(isExplored(litBits, width, 3 + CAVE_FOG_RADIUS + 1, 14)).toBe(true);
    expect(isExplored(litBits, width, 3 + CAVE_FOG_RADIUS + 2, 14)).toBe(false);
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
    h.state.flags['bossDefeated'] = true;
    h.state.quests['tavern'] = 'active';
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
    expect(h.state.quests['tavern']).toBe('ready');
  });

  it('marks the Thornwick ruins when visited', () => {
    const h = setup({ mapId: 'overworld', x: LANDMARKS.thornwick.x - 1, y: LANDMARKS.thornwick.y, facing: 'right' });
    h.hold('right', STEP_TIME + 0.02);
    h.run(0.2);
    expect(h.state.flags['sawRuins']).toBe(true);
    expect(h.ctx.stack.top?.id).toBe('message');
  });
});

describe('WorldScene mouse and touch', () => {
  it('maps screen points to tiles and back', () => {
    const h = setup({ mapId: 'aldmere', x: 6, y: 5, facing: 'up' });
    const p = h.world.tileToScreen(6, 3);
    expect(h.world.tileAtScreen(p.x, p.y)).toEqual({ x: 6, y: 3 });
  });

  it('walks to a tapped floor tile, then clears the goal', () => {
    const h = setup({ mapId: 'aldmere', x: 6, y: 5, facing: 'up' });
    h.tapTile(6, 3);
    expect(h.world.goal).toMatchObject({ x: 6, y: 3, mode: 'stand', talk: false });
    h.run(1);
    expect({ x: h.state.x, y: h.state.y }).toEqual({ x: 6, y: 3 });
    expect(h.world.goal).toBeNull();
  });

  it('walks up to a tapped NPC and talks to them', () => {
    const h = setup({ mapId: 'aldmere', x: 6, y: 5, facing: 'down' });
    // The king sits on his throne at (6,2).
    h.tapTile(6, 2);
    expect(h.world.goal).toMatchObject({ x: 6, y: 2, mode: 'face', talk: true });
    h.run(1.5);
    expect({ x: h.state.x, y: h.state.y }).toEqual({ x: 6, y: 3 });
    expect(h.state.facing).toBe('up');
    expect(h.ctx.stack.top?.id).toBe('message');
  });

  it('drops the tap goal when a direction key is pressed', () => {
    const h = setup({ mapId: 'aldmere', x: 6, y: 5, facing: 'up' });
    h.tapTile(6, 3);
    h.tap('down');
    expect(h.world.goal).toBeNull();
  });

  it('tapping the hero checks the tile in front, like confirm', () => {
    const h = setup({ mapId: 'aldmere', x: 6, y: 3, facing: 'up' });
    h.tapTile(6, 3);
    expect(h.ctx.stack.top?.id).toBe('message');
  });
});
