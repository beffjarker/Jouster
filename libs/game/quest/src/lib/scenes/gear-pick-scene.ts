import { InputManager, Renderer, Scene } from '@jouster/game/engine';
import { WEAPONS } from '../data/equipment';
import { GEAR, gearBonusText } from '../data/gear';
import { RARITIES, RARITY_ORDER } from '../data/rarity';
import { GEAR_SLOTS } from '../state/equipment';
import { GearItem, GearRoll, baseInfo, bonusText, isPlain, itemLabel } from '../state/loot';
import { ListMenu, MenuItem, SCREEN_H, SCREEN_W, drawHint } from '../ui/widgets';
import { GameContext } from './context';

/** One line of a gear list: identical plain Commons share a line with a count. */
export interface GearGroup {
  item: GearItem;
  count: number;
}

/** Bag pieces sorted by slot, tier, then rarity (best first), with identical plain Commons grouped (plan 33.7). */
export function groupGear(items: readonly GearItem[]): GearGroup[] {
  const groups: GearGroup[] = [];
  for (const item of items) {
    const same = isPlain(item) ? groups.find((g) => isPlain(g.item) && g.item.baseId === item.baseId) : undefined;
    if (same) {
      same.count++;
    } else {
      groups.push({ item, count: 1 });
    }
  }
  const key = (g: GearGroup): [number, number, number] => {
    const info = baseInfo(g.item.baseId);
    return [GEAR_SLOTS.indexOf(info?.slot ?? 'weapon'), info?.tier ?? 0, -RARITY_ORDER.indexOf(g.item.rarity)];
  };
  return groups.sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2] || a.item.uid - b.item.uid;
  });
}

/** Menu line for a piece: "[U] IRON SWORD OF HASTE" (with "x2" for grouped Commons) in its rarity colour. */
export function gearMenuItem(group: GearGroup, right?: string, enabled?: boolean): MenuItem {
  const count = group.count > 1 ? ` x${group.count}` : '';
  return { label: `${itemLabel(group.item)}${count}`, right, color: RARITIES[group.item.rarity].color, enabled };
}

/** What a piece does: its base stats, then its rolled bonus ("ATK+8  BONUS AGI+2 MP+6"). */
export function gearStatsText(item: GearRoll): string {
  const w = WEAPONS.get(item.baseId);
  const g = GEAR.get(item.baseId);
  const base = w
    ? [`ATK+${w.atk}`, w.mag ? `MAG+${w.mag}` : '', w.def ? `DEF+${w.def}` : ''].filter(Boolean).join(' ')
    : g
    ? gearBonusText(g)
    : '';
  const bonus = bonusText(item.bonus);
  return bonus ? `${base}  BONUS ${bonus}` : base;
}

/** Description of the piece's base item. */
export function gearDescription(baseId: string): string {
  return WEAPONS.get(baseId)?.description ?? GEAR.get(baseId)?.description ?? '';
}

const PICK_W = SCREEN_W - 16;

/**
 * A list of bag pieces to choose from (dropping one to make room, plan 33.4). Choosing pops the list and calls
 * `onPick` with the piece; Esc pops it and calls `onCancel`.
 */
export class GearPickScene implements Scene {
  public readonly id = 'gear-pick';
  public readonly overlay = true;
  private readonly menu: ListMenu;
  private readonly groups: GearGroup[];

  constructor(
    private readonly ctx: GameContext,
    private readonly title: string,
    items: readonly GearItem[],
    private readonly onPick: (item: GearItem) => void,
    private readonly onCancel: () => void,
  ) {
    this.groups = groupGear(items);
    this.menu = new ListMenu(this.groups.map((g) => gearMenuItem(g)), ctx.audio, 12);
  }

  public update(_dt: number, input: InputManager): void {
    const res = this.menu.update(input);
    if (res?.kind === 'select') {
      this.ctx.stack.pop();
      this.onPick(this.groups[res.index].item);
    } else if (res?.kind === 'cancel') {
      this.ctx.stack.pop();
      this.onCancel();
    }
  }

  public render(r: Renderer): void {
    this.menu.render(r, 8, 8, PICK_W, true, this.title);
    const item = this.groups[this.menu.cursor]?.item;
    if (item) {
      drawHint(r, `${gearStatsText(item)}. ${gearDescription(item.baseId)}`, 8, SCREEN_H - 8, PICK_W, 'above');
    }
  }
}
