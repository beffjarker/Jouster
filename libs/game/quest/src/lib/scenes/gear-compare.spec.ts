import { CELL_WIDTH, Renderer, SceneStack, createRng } from '@jouster/game/engine';
import { Art } from '../art/art';
import { RARITIES } from '../data/rarity';
import { addToBag, buyGear, createGear, equipItem, equippedItem } from '../state/equipment';
import { GameState, memoryStorage, newGameState } from '../state/game-state';
import { GearItem, itemLabel } from '../state/loot';
import { memberStats } from '../state/party';
import { InputDriver } from '../testing/input-driver';
import { COLORS, SCREEN_H, SCREEN_W } from '../ui/widgets';
import { GameContext } from './context';
import { ARMOR_SHOP_STOCK } from '../data/gear';
import {
  GEAR_COMPARE_H,
  SHOP_VERDICTS,
  changesText,
  compareColor,
  gearCompareRows,
  shopCompare,
  shopCompareH,
} from './gear-compare';
import { FieldMenuScene, ShopScene } from './menu-scenes';

interface Span {
  s: string;
  x0: number;
  x1: number;
  y: number;
  color?: string;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function give(s: GameState, id: string): GearItem {
  const item = buyGear(s, id);
  if (!item) {
    throw new Error(`cannot give ${id}`);
  }
  return item;
}

function setup(): { ctx: GameContext; state: GameState; driver: InputDriver } {
  const state = newGameState('ANA', 'warrior', createRng(3));
  const ctx: GameContext = {
    stack: new SceneStack(),
    audio: { play: jest.fn(), getChannelVolume: jest.fn(() => 1), setChannelVolume: jest.fn() } as never,
    art: {} as Art,
    rng: createRng(3),
    storage: memoryStorage(),
    state,
  };
  const driver = new InputDriver((dt, input) => ctx.stack.update(dt, input));
  return { ctx, state, driver };
}

/** Renders the scene with a recorder and returns every text run and window. */
function capture(scene: { render(r: Renderer): void }): { spans: Span[]; windows: Box[] } {
  const spans: Span[] = [];
  const windows: Box[] = [];
  const width = (s: string): number => s.length * CELL_WIDTH;
  const r = new Proxy(
    {
      text: (s: string, x: number, y: number, color?: string) => spans.push({ s, x0: x, x1: x + width(s), y, color }),
      textRight: (s: string, x: number, y: number, color?: string) =>
        spans.push({ s, x0: x - width(s), x1: x, y, color }),
      window: (x: number, y: number, w: number, h: number) => windows.push({ x, y, w, h }),
    },
    { get: (t, k) => (t as Record<string | symbol, unknown>)[k] ?? jest.fn() },
  ) as unknown as Renderer;
  scene.render(r);
  return { spans, windows };
}

/** Opens EQUIP > hero > ARMOR. */
function openArmorPick(ctx: GameContext, driver: InputDriver): FieldMenuScene {
  const scene = new FieldMenuScene(ctx, 'equip');
  ctx.stack.push(scene);
  driver.tap('confirm');
  driver.tap('down');
  driver.tap('confirm');
  return scene;
}

describe('equip comparison', () => {
  it('lists every stat now and with the candidate piece', () => {
    const { state } = setup();
    const hero = state.party[0];
    const mail = createGear(state, { baseId: 'chainMail', rarity: 'rare', bonus: { agi: 2 } });
    const rows = gearCompareRows(hero, 'armor', mail);
    const now = memberStats(hero);
    expect(rows.map((r) => r.key)).toEqual(['atk', 'def', 'mag', 'agi', 'hp', 'mp']);
    rows.forEach((r) => expect(r.before).toBe(now[r.key]));
    const by = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(by['def'].after).toBeGreaterThan(by['def'].before);
    expect(by['agi'].after).toBe(by['agi'].before + 2);
    expect(by['atk'].after).toBe(by['atk'].before);
  });

  it('shows the loss when a piece is taken off', () => {
    const { state } = setup();
    const hero = state.party[0];
    equipItem(state, hero, give(state, 'chainMail').uid);
    const def = gearCompareRows(hero, 'armor', undefined).find((r) => r.key === 'def');
    expect(def && def.after).toBeLessThan(def?.before ?? 0);
  });

  it('colours gains green, losses red and no change dim', () => {
    expect(compareColor(4, 6)).toBe(COLORS.hp);
    expect(compareColor(6, 4)).toBe(COLORS.hpLow);
    expect(compareColor(5, 5)).toBe(COLORS.dim);
  });

  it('draws the worn piece, the highlighted piece and before > after stats in the equip menu', () => {
    const { ctx, state, driver } = setup();
    const hero = state.party[0];
    equipItem(state, hero, give(state, 'leatherArmor').uid);
    const rare = createGear(state, { baseId: 'chainMail', rarity: 'rare', bonus: { agi: 2 } });
    addToBag(state, rare);
    const scene = openArmorPick(ctx, driver);
    const { spans, windows } = capture(scene);
    const texts = spans.map((sp) => sp.s);
    const worn = equippedItem(hero, 'armor');
    if (!worn) {
      throw new Error('nothing worn');
    }
    expect(texts).toEqual(expect.arrayContaining(['NOW', itemLabel(worn), 'NEW', itemLabel(rare)]));
    expect(spans.find((sp) => sp.s === itemLabel(rare))?.color).toBe(RARITIES.rare.color);
    const rows = gearCompareRows(hero, 'armor', rare);
    const def = rows.find((r) => r.key === 'def');
    const defLabel = spans.find((sp) => sp.s === 'DEF');
    expect(def && defLabel).toBeTruthy();
    const defRow = spans.filter((sp) => defLabel && sp.y === defLabel.y && sp.x0 >= defLabel.x0 && sp.x0 < defLabel.x0 + 120);
    expect(defRow.map((sp) => sp.s)).toEqual(
      expect.arrayContaining([String(def?.before), '>', String(def?.after), `+${(def?.after ?? 0) - (def?.before ?? 0)}`]),
    );
    expect(defRow.find((sp) => sp.s.startsWith('+'))?.color).toBe(COLORS.hp);

    // The panel sits under the pick list, above the party status, and its text stays inside it without overlaps.
    const panel = windows.find((w) => w.h === GEAR_COMPARE_H);
    if (!panel) {
      throw new Error('no comparison panel');
    }
    expect(panel.x + panel.w).toBeLessThanOrEqual(SCREEN_W);
    expect(panel.y + panel.h).toBeLessThanOrEqual(SCREEN_H - 48);
    const inside = spans.filter((sp) => sp.y >= panel.y && sp.y < panel.y + panel.h && sp.x0 >= panel.x);
    inside.forEach((sp) => expect({ s: sp.s, fits: sp.x1 <= panel.x + panel.w - 4 }).toEqual({ s: sp.s, fits: true }));
    inside.forEach((a, i) =>
      inside.slice(i + 1).forEach((b) => {
        const clash = Math.abs(a.y - b.y) < 8 && a.x0 < b.x1 && b.x0 < a.x1;
        expect({ a: a.s, b: b.s, clash }).toEqual({ a: a.s, b: b.s, clash: false });
      }),
    );
  });

  it('compares against an empty slot on REMOVE', () => {
    const { ctx, state, driver } = setup();
    const hero = state.party[0];
    equipItem(state, hero, give(state, 'leatherArmor').uid);
    const scene = openArmorPick(ctx, driver);
    driver.tap('up'); // wraps to REMOVE (the bag has no other armor)
    const texts = capture(scene).spans.map((sp) => sp.s);
    expect(texts).toEqual(expect.arrayContaining(['NEW', 'REMOVE']));
  });
});

describe('shop comparison', () => {
  /** Adds a Wizard to the party (it cannot wear mail or leather). */
  function withWizard(state: GameState): void {
    state.party.push(newGameState('ZED', 'wizard', createRng(4)).party[0]);
  }

  it('calls a piece BETTER when it only gains on what the member wears', () => {
    const { state } = setup();
    const c = shopCompare(state.party[0], 'chainMail');
    expect(c.worn).toBeUndefined();
    expect(c.verdict).toBe('better');
    expect(changesText(c.changes)).toBe('DEF+3');
  });

  it('calls a piece WORSE, MIXED, WORN or CANNOT USE against the worn one', () => {
    const { state } = setup();
    withWizard(state);
    const [hero, wiz] = state.party;
    equipItem(state, hero, give(state, 'chainMail').uid);
    expect(shopCompare(hero, 'leatherArmor').verdict).toBe('worse');
    expect(shopCompare(hero, 'chainMail').verdict).toBe('worn');
    expect(shopCompare(wiz, 'chainMail')).toEqual(expect.objectContaining({ verdict: 'cannot', changes: [] }));
    const quick = createGear(state, { baseId: 'leatherArmor', rarity: 'rare', bonus: { agi: 3 } });
    addToBag(state, quick);
    equipItem(state, hero, quick.uid);
    const mixed = shopCompare(hero, 'chainMail');
    expect(mixed.verdict).toBe('mixed');
    expect(changesText(mixed.changes)).toBe('DEF+1 AGI-3');
  });

  it('draws each member, what they wear and the verdict under the BUY list', () => {
    const { ctx, state, driver } = setup();
    withWizard(state);
    state.gold = 500;
    const hero = state.party[0];
    equipItem(state, hero, give(state, 'leatherArmor').uid);
    const shop = new ShopScene(ctx, 'armor', ARMOR_SHOP_STOCK);
    ctx.stack.push(shop);
    driver.tap('confirm'); // BUY
    while (ARMOR_SHOP_STOCK[shop['menu'].cursor] !== 'chainMail') {
      driver.tap('down');
    }
    const { spans, windows } = capture(shop);
    const texts = spans.map((sp) => sp.s);
    expect(texts).toEqual(expect.arrayContaining(['PARTY', 'ANA', 'ZED', 'LEATHER ARMOR', 'NOTHING', 'BETTER', "CAN'T USE"]));
    expect(spans.find((sp) => sp.s === 'BETTER')?.color).toBe(SHOP_VERDICTS.better.color);
    const def = spans.find((sp) => sp.s === 'DEF' && sp.y > 96);
    const row = spans.filter((sp) => def && sp.y === def.y && sp.x0 > def.x0);
    expect(row.map((sp) => sp.s)).toEqual(expect.arrayContaining(['>', '+1']));
    expect(row.find((sp) => sp.s === '+1')?.color).toBe(COLORS.hp);
    expect(texts).toContain('UPGRADE FOR: ANA');
    // The buy list marks upgrades in green with a '+' before the price.
    expect(spans.find((sp) => sp.s === 'CHAIN MAIL')?.color).toBe(COLORS.hp);
    expect(texts).toContain('+ 160G');

    const panel = windows.find((w) => w.h === shopCompareH(2));
    if (!panel) {
      throw new Error('no party panel');
    }
    const info = windows.find((w) => w.y > panel.y);
    expect(panel.y + panel.h).toBeLessThanOrEqual(info?.y ?? SCREEN_H);
    const inside = spans.filter((sp) => sp.y >= panel.y && sp.y < panel.y + panel.h);
    inside.forEach((sp) => expect({ s: sp.s, fits: sp.x1 <= panel.x + panel.w - 4 }).toEqual({ s: sp.s, fits: true }));
    inside.forEach((a, i) =>
      inside.slice(i + 1).forEach((b) => {
        const clash = Math.abs(a.y - b.y) < 8 && a.x0 < b.x1 && b.x0 < a.x1;
        expect({ a: a.s, b: b.s, clash }).toEqual({ a: a.s, b: b.s, clash: false });
      }),
    );
  });

  it('shows the gain next to each name when offering to equip a purchase', () => {
    const { ctx, state, driver } = setup();
    state.gold = 500;
    const shop = new ShopScene(ctx, 'armor', ARMOR_SHOP_STOCK);
    ctx.stack.push(shop);
    driver.tap('confirm'); // BUY
    while (ARMOR_SHOP_STOCK[shop['menu'].cursor] !== 'chainMail') {
      driver.tap('down');
    }
    driver.tap('confirm');
    const msg = ctx.stack.top as unknown as { menu: { items: { label: string }[] } };
    expect(msg.menu.items.map((i) => i.label)).toEqual(['ANA DEF+3', 'LATER']);
  });
});