import { InputAction, Renderer, SceneStack, createRng } from '@jouster/game/engine';
import { Art, TILE } from '../art/art';
import { INN_RESPAWN, mapDef } from '../data/maps';
import { ENCOUNTER_TABLES } from '../data/monsters';
import { NORTH_LANDMARKS } from '../data/frostpeaks-gen';
import { LANDMARKS } from '../data/overworld-gen';
import { SOUTH_LANDMARKS } from '../data/southlands-gen';
import { CAVE_FOG_RADIUS, isExplored } from '../state/fog';
import { ITEMS } from '../data/equipment';
import { BAG_LIMIT, createGear } from '../state/equipment';
import { GameState, addItem, hasSave, loadGame, memoryStorage, newGameState, recruitCompanion } from '../state/game-state';
import { GearItem, gearSellPrice } from '../state/loot';
import { createMember } from '../state/party';
import { SUNNY_SIGHT_RADIUS, weatherAt, weatherSeed, weatherSightRadius } from '../state/weather';
import { InputDriver } from '../testing/input-driver';
import { SCREEN_H, SCREEN_W } from '../ui/widgets';
import { GameContext } from './context';
import { ShopScene } from './menu-scenes';
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
    audio: {
      play: jest.fn(),
      toggleMute: jest.fn(),
      muted: false,
      dispose: jest.fn(),
      getChannelVolume: jest.fn(() => 1),
      setChannelVolume: jest.fn(),
    } as never,
    art: { characterAction: () => undefined } as Partial<Art> as Art,
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
function grassRun(length = 3): { x: number; y: number } {
  const rows = mapDef('overworld').rows;
  for (let y = 0; y < rows.length; y++) {
    const x = rows[y].indexOf('.'.repeat(length));
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

  it('follows the leader without rounding, so the leader holds still on screen mid-step', () => {
    expect(cameraAxis(800.3, 60, 480)).toBeCloseTo(800.3 - (480 - 16) / 2);
  });
});

describe('WorldScene', () => {
  it('plays the town theme in towns, keeping it under dialog boxes (plan 22)', () => {
    const h = setup({ mapId: 'aldmere', x: 6, y: 3, facing: 'up' });
    expect(h.ctx.stack.music).toBe('town');
    h.tap('confirm');
    expect(h.ctx.stack.top?.id).toBe('message');
    expect(h.ctx.stack.music).toBe('town');
  });

  it('walks one tile per step and blocks on solid tiles', () => {
    const h = setup({ mapId: 'aldmere', x: 6, y: 5, facing: 'up' });
    h.hold('up', STEP_TIME);
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

  it('lets the cave prisoner talk through the bars before the Goblin King falls, without a quest yet', () => {
    const h = setup({ mapId: 'goblinCave', x: 19, y: 4, facing: 'up' });
    h.tap('confirm');
    const pages = (h.ctx.stack.top as unknown as { pages: string[][] }).pages.flat().join(' ');
    expect(pages).toContain('behind the bars');
    expect(pages).toContain('Bring him down');
    h.confirmUntilWorld();
    expect(h.state.quests['cave']).toBeUndefined();
    expect(h.state.party).toHaveLength(1);
  });

  it('warps between maps', () => {
    const h = setup({ mapId: 'overworld', x: LANDMARKS.aldmere.x, y: LANDMARKS.aldmere.y + 1, facing: 'up' });
    h.hold('up', STEP_TIME);
    h.run(1);
    expect(h.state.mapId).toBe('aldmere');
    expect(h.ctx.stack.top).not.toBe(h.world);
    expect(h.ctx.stack.top?.id).toBe('world');
  });

  it('bars the southern pass until Act I is complete (plan 17)', () => {
    const at = { mapId: 'overworld', x: LANDMARKS.southPass.x, y: LANDMARKS.southPass.y - 1, facing: 'down' as const };
    const locked = setup(at);
    locked.hold('down', STEP_TIME);
    locked.run(1);
    expect(locked.state.mapId).toBe('overworld');
    expect(locked.ctx.stack.top?.id).toBe('message');
    const pages = (locked.ctx.stack.top as unknown as { pages: string[][] }).pages.flat().join(' ');
    expect(pages).toContain('southern pass is barred');

    const open = setup(at);
    open.state.flags['actOneComplete'] = true;
    open.hold('down', STEP_TIME);
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

  it('bars the northern pass until Act II is complete (plan 19)', () => {
    const at = { mapId: 'overworld', x: LANDMARKS.northPass.x, y: LANDMARKS.northPass.y + 1, facing: 'up' as const };
    const locked = setup(at);
    locked.hold('up', STEP_TIME);
    locked.run(1);
    expect(locked.state.mapId).toBe('overworld');
    expect(locked.ctx.stack.top?.id).toBe('message');
    const pages = (locked.ctx.stack.top as unknown as { pages: string[][] }).pages.flat().join(' ');
    expect(pages).toContain('northern pass');

    const open = setup(at);
    open.state.flags['actTwoComplete'] = true;
    open.hold('up', STEP_TIME);
    open.run(1);
    expect(open.state.mapId).toBe('frostpeaks');
  });

  it('ends Act III and forges Dragonbane once the Wyvern Matriarch is slain (plan 19)', () => {
    const h = setup({ mapId: 'aldmere', x: 6, y: 3, facing: 'up' });
    Object.assign(h.state.flags, {
      metKing: true,
      bossDefeated: true,
      actOneComplete: true,
      sandWyrmDefeated: true,
      marshWitchDefeated: true,
      actTwoComplete: true,
    });
    h.tap('confirm');
    h.confirmUntilWorld();
    expect(h.state.flags['actThreeComplete']).toBeUndefined();
    h.state.flags['wyvernMatriarchDefeated'] = true;
    const gold = h.state.gold;
    h.tap('confirm');
    const pages = (h.ctx.stack.top as unknown as { pages: string[][] }).pages.flat().join(' ');
    expect(pages).toContain('END OF ACT III');
    expect(h.state.flags['actThreeComplete']).toBe(true);
    expect(h.state.flags['dragonbaneForged']).toBe(true);
    expect(h.state.gold).toBe(gold + 900);
    h.confirmUntilWorld();
    h.tap('confirm');
    h.confirmUntilWorld();
    expect(h.state.gold).toBe(gold + 900);
  });

  it('fights in the snow outdoors in the Frost Peaks but in the cave inside the roost (plan 19)', () => {
    const backdropAfterStep = (place: Partial<GameState>, dir: InputAction): string | undefined => {
      const h = setup({ ...place, stepsSinceBattle: 50 }, true);
      h.hold(dir, STEP_TIME);
      h.run(1);
      expect(h.ctx.stack.top?.id).toBe('battle');
      expect(h.ctx.stack.music).toBe('battle');
      return (h.ctx.stack.top as unknown as { options: { backdrop: string } }).options.backdrop;
    };
    const { pass } = NORTH_LANDMARKS;
    expect(backdropAfterStep({ mapId: 'frostpeaks', x: pass.x, y: pass.y - 1, facing: 'up' }, 'up')).toBe('snow');
    expect(backdropAfterStep({ mapId: 'wyvernRoost', x: 10, y: 13, facing: 'up' }, 'up')).toBe('cave');
  });

  it('bars the ember pass until Dragonbane is forged (plan 21)', () => {
    const { emberPass } = NORTH_LANDMARKS;
    const at = { mapId: 'frostpeaks', x: emberPass.x, y: emberPass.y + 1, facing: 'up' as const };
    const locked = setup(at);
    locked.hold('up', STEP_TIME);
    locked.run(1);
    expect(locked.state.mapId).toBe('frostpeaks');
    expect(locked.ctx.stack.top?.id).toBe('message');

    const open = setup(at);
    open.state.flags['dragonbaneForged'] = true;
    open.hold('up', STEP_TIME);
    open.run(1);
    expect(open.state.mapId).toBe('embermountains');
  });

  it('fights Vyrmorth in two phases back to back, and only marks him slain after the second (plan 21)', () => {
    const lair = mapDef('vyrmorthLair');
    const npc = lair.npcs.find((n) => n.role === 'boss');
    if (!npc?.boss) {
      throw new Error('no lair boss');
    }
    const h = setup({ mapId: 'vyrmorthLair', x: npc.x, y: npc.y + 1, facing: 'up' });
    interface BattleTop { id: string; options: { monsterIds: string[]; onEnd(outcome: string): void } }
    const top = (): BattleTop => h.ctx.stack.top as unknown as BattleTop;
    h.tap('confirm');
    for (let i = 0; i < 10 && h.ctx.stack.top?.id === 'message'; i++) {
      h.tap('confirm');
    }
    h.run(1);
    expect(top().id).toBe('battle');
    expect(top().options.monsterIds).toEqual(['vyrmorth']);
    expect(h.ctx.stack.music).toBe('finalBoss');
    top().options.onEnd('victory');
    expect(h.state.flags['vyrmorthDefeated']).toBeUndefined();
    h.run(1);
    expect(h.ctx.stack.top?.id).toBe('message');
    for (let i = 0; i < 10 && h.ctx.stack.top?.id === 'message'; i++) {
      h.tap('confirm');
    }
    h.run(1);
    expect(top().id).toBe('battle');
    expect(top().options.monsterIds).toEqual(['vyrmorthUnbound']);
    top().options.onEnd('victory');
    expect(h.state.flags['vyrmorthDefeated']).toBe(true);
  });

  it('ends the game once Vyrmorth is slain (plan 21)', () => {
    const h = setup({ mapId: 'aldmere', x: 6, y: 3, facing: 'up' });
    Object.assign(h.state.flags, {
      metKing: true,
      bossDefeated: true,
      actOneComplete: true,
      sandWyrmDefeated: true,
      marshWitchDefeated: true,
      actTwoComplete: true,
      wyvernMatriarchDefeated: true,
      actThreeComplete: true,
      dragonbaneForged: true,
      vyrmorthDefeated: true,
    });
    const gold = h.state.gold;
    h.tap('confirm');
    const pages = (h.ctx.stack.top as unknown as { pages: string[][] }).pages.flat().join(' ');
    expect(pages).toContain('THE END');
    expect(h.state.flags['gameComplete']).toBe(true);
    expect(h.state.gold).toBe(gold + 2000);
    h.confirmUntilWorld();
    h.tap('confirm');
    h.confirmUntilWorld();
    expect(h.state.gold).toBe(gold + 2000);
  });

  it('fights amid lava and ash in the Ember Mountains (plan 21)', () => {
    const rows = mapDef('embermountains').rows;
    const y = rows.findIndex((r, i) => i > 2 && r.indexOf('...') > 0);
    const x = rows[y].indexOf('...');
    const h = setup({ mapId: 'embermountains', x, y, facing: 'right', stepsSinceBattle: 50 }, true);
    h.hold('right', STEP_TIME);
    h.run(1);
    expect(h.ctx.stack.top?.id).toBe('battle');
    expect((h.ctx.stack.top as unknown as { options: { backdrop: string } }).options.backdrop).toBe('volcano');
  });

  it('fights on desert sand outdoors but in the cave inside the shrines (plan 17)', () => {
    const backdropAfterStep = (place: Partial<GameState>, dir: InputAction): string | undefined => {
      const h = setup({ ...place, stepsSinceBattle: 50 }, true);
      h.hold(dir, STEP_TIME);
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
    h.hold('right', STEP_TIME);
    h.run(1);
    expect(h.ctx.stack.top?.id).toBe('battle');
  });

  it('plays a battle through to the end and returns to the world', () => {
    const h = setup({ mapId: 'overworld', ...grassRun(), facing: 'right', stepsSinceBattle: 50 }, true);
    h.hold('right', STEP_TIME);
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
    addItem(h.state, 'leatherArmor');
    h.tap('equip');
    expect(h.ctx.stack.top?.id).toBe('field-menu');
    h.tap('confirm'); // hero
    h.tap('down');
    h.tap('confirm'); // ARMOR
    h.tap('confirm'); // Leather Armor
    expect(h.state.party[0].armorId).toBe('leatherArmor');
    expect(h.state.gear.some((g) => g.baseId === 'leatherArmor')).toBe(false);
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
    h.tap('confirm'); // BUY
    h.tap('confirm'); // Cloth Robe
    tapUntil('shop'); // "Equip it now?" -> first choice is the hero
    expect(h.state.party[0].armorId).toBe('clothRobe');
    expect(h.state.gold).toBe(470);
    expect(h.state.gear).toEqual([]);
  });

  describe('shop and bag (plan 33.5)', () => {
    const openShop = (gold = 500): Harness & { shop: ShopScene; choose(i: number): void } => {
      const h = setup({ mapId: 'aldmere', x: 26, y: 13, facing: 'up', gold });
      for (let i = 0; i < 12 && h.ctx.stack.top?.id !== 'shop'; i++) {
        h.tap('confirm');
      }
      const choose = (i: number): void => {
        h.run(3);
        for (let k = 0; k < i; k++) {
          h.tap('down');
        }
        h.tap('confirm');
      };
      return { ...h, shop: h.ctx.stack.top as ShopScene, choose };
    };

    it('buys into the bag with LATER and sells the piece back at its sell price', () => {
      const h = openShop();
      h.tap('confirm'); // BUY
      h.tap('confirm'); // Cloth Robe
      h.choose(1); // LATER
      h.run(3);
      h.tap('confirm');
      expect(h.ctx.stack.top?.id).toBe('shop');
      expect(h.state.gear.map((g) => g.baseId)).toEqual(['clothRobe']);
      expect(h.state.party[0].armorId).toBeUndefined();
      expect(h.state.gold).toBe(470);
      h.tap('cancel'); // back to BUY / SELL / LEAVE
      expect(h.shop.shopMode).toBe('top');
      h.tap('down');
      h.tap('confirm'); // SELL
      expect(h.shop.shopMode).toBe('sell');
      expect(h.shop.view).toBe('sell');
      const consumables = [...ITEMS.keys()].filter((id) => (h.state.inventory[id] ?? 0) > 0).length;
      for (let i = 0; i < consumables; i++) {
        h.tap('down');
      }
      h.tap('confirm'); // the robe
      expect(h.state.gear).toEqual([]);
      expect(h.state.gold).toBe(470 + gearSellPrice({ baseId: 'clothRobe', rarity: 'common', bonus: {} }));
      expect(h.state.gold).toBeGreaterThan(470);
    });

    it('sells consumables one at a time for half their price', () => {
      const h = openShop();
      const herbs = h.state.inventory['herb'] ?? 0;
      const first = [...ITEMS.keys()].find((id) => (h.state.inventory[id] ?? 0) > 0);
      expect(first).toBe('herb');
      h.tap('down');
      h.tap('confirm'); // SELL
      h.tap('confirm'); // herb
      expect(h.state.inventory['herb'] ?? 0).toBe(herbs - 1);
      expect(h.state.gold).toBe(500 + Math.max(1, Math.floor((ITEMS.get('herb')?.price ?? 0) / 2)));
    });

    it('offers to sell first when the bag is full, and never trades in', () => {
      const h = openShop();
      while (h.state.gear.length < BAG_LIMIT) {
        addItem(h.state, 'leatherArmor');
      }
      h.tap('confirm'); // BUY
      h.tap('confirm'); // Cloth Robe
      expect(h.ctx.stack.top?.id).toBe('message');
      h.choose(0); // SELL
      expect(h.ctx.stack.top?.id).toBe('shop');
      expect(h.shop.shopMode).toBe('sell');
      expect(h.state.gold).toBe(500);
      expect(h.state.gear).toHaveLength(BAG_LIMIT);
    });
  });

  describe('bag-full finds (plan 33.4)', () => {
    const withFind = (find: Omit<GearItem, 'uid'>): Harness & { found: GearItem; choose(i: number): void } => {
      const h = setup({ mapId: 'aldmere', x: 6, y: 5, facing: 'up' });
      while (h.state.gear.length < BAG_LIMIT) {
        addItem(h.state, 'clothRobe');
      }
      const found = createGear(h.state, find);
      h.state.pendingGear = [found];
      const choose = (i: number): void => {
        h.run(3);
        for (let k = 0; k < i; k++) {
          h.tap('down');
        }
        h.tap('confirm');
      };
      h.run(0.05);
      return { ...h, found, choose };
    };

    it('drops a bag piece to take the find', () => {
      const h = withFind({ baseId: 'chainMail', rarity: 'rare', bonus: { agi: 2, hp: 8 } });
      expect(h.ctx.stack.top?.id).toBe('message');
      h.choose(0); // DROP AN ITEM
      expect(h.ctx.stack.top?.id).toBe('gear-pick');
      h.tap('confirm'); // a plain Cloth Robe, no confirmation needed
      h.confirmUntilWorld();
      expect(h.state.gear).toHaveLength(BAG_LIMIT);
      expect(h.state.gear).toContainEqual(h.found);
      expect(h.state.gear.filter((g) => g.baseId === 'clothRobe')).toHaveLength(BAG_LIMIT - 1);
      expect(h.state.pendingGear).toBeUndefined();
    });

    it('asks again when the drop list is cancelled', () => {
      const h = withFind({ baseId: 'chainMail', rarity: 'uncommon', bonus: { atk: 1 } });
      h.choose(0);
      h.tap('cancel');
      expect(h.ctx.stack.top?.id).toBe('message');
      expect(h.state.pendingGear).toEqual([h.found]);
    });

    it('confirms before leaving a Legendary behind, and can keep it', () => {
      const h = withFind({ baseId: 'chainMail', rarity: 'legendary', bonus: { atk: 3, def: 3, agi: 3, hp: 12 } });
      h.choose(1); // LEAVE IT
      expect(h.ctx.stack.top?.id).toBe('message');
      h.choose(1); // KEEP -> asked again
      expect(h.state.pendingGear).toEqual([h.found]);
      h.choose(1); // LEAVE IT
      h.choose(0); // LEAVE
      h.confirmUntilWorld();
      expect(h.state.pendingGear).toBeUndefined();
      expect(h.state.gear).not.toContainEqual(h.found);
      expect(h.state.gear).toHaveLength(BAG_LIMIT);
    });

    it('leaves a Common find without asking twice', () => {
      const h = withFind({ baseId: 'leatherArmor', rarity: 'common', bonus: {} });
      h.choose(1);
      h.confirmUntilWorld();
      expect(h.state.pendingGear).toBeUndefined();
      expect(h.ctx.stack.top?.id).toBe('world');
    });
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
    h.hold('right', STEP_TIME);
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
      h.hold('right', STEP_TIME);
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

  it('chains held steps without pausing at each tile', () => {
    const start = grassRun(12);
    const h = setup({ mapId: 'overworld', ...start, facing: 'right' });
    const steps = h.state.steps;
    // 96 updates at 60 Hz: a pause of one update per tile would only finish 8 steps.
    h.hold('right', STEP_TIME * 10);
    expect(h.state.steps).toBe(steps + 9);
    expect(h.state.x).toBe(start.x + 10);
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

  it('brings the grind-dungeon wardens back after an inn rest, naming where they stir', () => {
    const h = setup({ mapId: INN_RESPAWN.mapId, x: INN_RESPAWN.x, y: INN_RESPAWN.y, facing: 'up' });
    h.state.flags['slimeMatronDefeated'] = true;
    h.state.flags['goblinForemanDefeated'] = true;
    h.state.flags['slagGolemDefeated'] = true;
    h.state.flags['bossDefeated'] = true;
    h.tap('confirm');
    const pagesOf = (): string =>
      ((h.ctx.stack.top as unknown as { pages?: string[][] }).pages ?? []).flat().join(' ');
    for (let i = 0; i < 10 && !pagesOf().includes('Good morning'); i++) {
      h.tap('confirm');
    }
    expect(pagesOf()).toContain('Deep in the Old Mine and the Slag Pits, something stirs again');
    h.confirmUntilWorld();
    expect(h.state.flags['slimeMatronDefeated']).toBeUndefined();
    expect(h.state.flags['goblinForemanDefeated']).toBeUndefined();
    expect(h.state.flags['slagGolemDefeated']).toBeUndefined();
    expect(h.state.flags['bossDefeated']).toBe(true);
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

  it('enters the Thornwick ruins from the overworld', () => {
    const h = setup({ mapId: 'overworld', x: LANDMARKS.thornwick.x - 1, y: LANDMARKS.thornwick.y, facing: 'right' });
    h.hold('right', STEP_TIME);
    h.run(1);
    expect(h.state.mapId).toBe('thornwick');
  });

  it('marks the Thornwick ruins when first walking in', () => {
    const h = setup({ mapId: 'thornwick', x: 12, y: 13, facing: 'up' });
    h.hold('up', STEP_TIME);
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

describe('WorldScene landscape objects', () => {
  /** The first overworld forest tile, a walkable spot to stand on. */
  function forestTile(): { x: number; y: number } {
    const rows = mapDef('overworld').rows;
    for (let y = 0; y < rows.length; y++) {
      const x = rows[y].indexOf('fff');
      if (x > 0) {
        return { x: x + 1, y };
      }
    }
    throw new Error('no forest');
  }

  it('depth-sorts LPC trees with the party: trees behind them first, trees in front of them after', () => {
    const at = forestTile();
    const h = setup({ mapId: 'overworld', ...at, facing: 'down' });
    const art = new Proxy(
      {
        characterAction: () => undefined,
        tinted: (sprite: unknown) => sprite,
        tileObject: (id: string) => (id === 'forest' ? { sprite: { kind: 'object' }, x: -2, y: -14 } : null),
      },
      {
        get: (t, k) =>
          (t as Record<string | symbol, unknown>)[k] ?? ((): { kind: string | symbol } => ({ kind: k })),
      },
    );
    h.ctx.art = art as unknown as Art;
    const camY = cameraAxis(at.y * TILE, mapDef('overworld').rows.length, SCREEN_H);
    const draws: Array<{ kind: string; y: number; party: boolean }> = [];
    const r = new Proxy(
      {
        // Only party walkers pass draw options (their alpha), which tells them apart from NPCs.
        draw: (image: { kind: string }, _x: number, y: number, opts?: object) =>
          draws.push({ kind: image.kind, y, party: opts !== undefined }),
      },
      { get: (t, k) => (t as Record<string | symbol, unknown>)[k] ?? jest.fn() },
    ) as unknown as Renderer;
    h.world.render(r);
    const kinds = draws.map((d) => d.kind);
    const party = draws.map((d, i) => (d.party ? i : -1)).filter((i) => i >= 0);
    const objects = draws
      .map((d, i) => ({ ...d, i, row: (d.y + 14 + camY) / TILE }))
      .filter((d) => d.kind === 'object');
    const rows = (h.world as unknown as { walkers: Array<{ y: number }> }).walkers.map((w) => w.y);
    const behind = objects.filter((d) => d.row <= Math.min(...rows));
    const inFront = objects.filter((d) => d.row > Math.max(...rows));
    expect(party.length).toBeGreaterThan(0);
    expect(party[0]).toBeGreaterThan(kinds.lastIndexOf('tile'));
    expect(behind.length).toBeGreaterThan(0);
    expect(inFront.length).toBeGreaterThan(0);
    behind.forEach((d) => expect(d.i).toBeLessThan(party[0]));
    inFront.forEach((d) => expect(d.i).toBeGreaterThan(party[party.length - 1]));
    expect(objects.map((d) => d.y)).toEqual([...objects.map((d) => d.y)].sort((a, b) => a - b));
  });

  it("paves a town's exit road through the trees and off screen, with no tree drawn on it", () => {
    const h = setup({ mapId: 'aldmere', x: 16, y: 27, facing: 'down' });
    const art = new Proxy(
      {
        characterAction: () => undefined,
        tinted: (sprite: unknown) => sprite,
        tile: (id: string) => ({ kind: 'tile', id }),
        tileObject: (id: string) => (id === 'tree' ? { sprite: { kind: 'object', id }, x: 0, y: 0 } : null),
      },
      {
        get: (t, k) =>
          (t as Record<string | symbol, unknown>)[k] ?? ((): { kind: string | symbol } => ({ kind: k })),
      },
    );
    h.ctx.art = art as unknown as Art;
    const camX = cameraAxis(16 * TILE, 34, SCREEN_W);
    const camY = cameraAxis(27 * TILE, 30, SCREEN_H);
    const draws: Array<{ kind: string; id?: string; tx: number; ty: number }> = [];
    const r = new Proxy(
      {
        draw: (image: { kind: string; id?: string }, x: number, y: number) =>
          draws.push({ kind: image.kind, id: image.id, tx: (x + camX) / TILE, ty: (y + camY) / TILE }),
      },
      { get: (t, k) => (t as Record<string | symbol, unknown>)[k] ?? jest.fn() },
    ) as unknown as Renderer;
    h.world.render(r);
    const at = (kind: string, tx: number, ty: number): string | undefined =>
      draws.find((d) => d.kind === kind && d.tx === tx && d.ty === ty)?.id;
    const bottom = Math.floor((camY + SCREEN_H) / TILE);
    expect(bottom).toBeGreaterThan(31);
    for (let ty = 28; ty <= bottom; ty++) {
      [16, 17].forEach((tx) => {
        const drawn = { tx, ty, tile: at('tile', tx, ty), tree: at('object', tx, ty) };
        expect(drawn).toEqual({ tx, ty, tile: 'cobble', tree: undefined });
      });
    }
    expect(at('tile', 15, 30)).toBe('tree');
    expect(at('object', 15, 30)).toBe('tree');
  });
});
