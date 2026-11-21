import { Renderer, StatKey } from '@jouster/game/engine';
import { RARITIES } from '../data/rarity';
import { GearSlot, canEquip, equippedItem, previewStats, slotOf } from '../state/equipment';
import { GearRoll, itemLabel } from '../state/loot';
import { PartyMember, memberStats } from '../state/party';
import { COLORS, LINE_H, charsFit } from '../ui/widgets';
import { gearDescription, gearStatsText } from './gear-pick-scene';

/** One stat of the equip comparison: the member's value now and with the highlighted piece. */
export interface StatCompareRow {
  key: StatKey;
  before: number;
  after: number;
}

/** Stats in comparison order (offence first, then pools). */
const COMPARE_STATS: readonly StatKey[] = ['atk', 'def', 'mag', 'agi', 'hp', 'mp'];
const STAT_COLUMNS = 3;
/** Rows of text in the panel: worn name + stats, new name + stats, two stat rows, description. */
const PANEL_ROWS = 7;

/** Height of the comparison panel drawn by `drawGearCompare`. */
export const GEAR_COMPARE_H = PANEL_ROWS * LINE_H + 14;

/** The member's stats with what they wear now vs with `item` in the slot (undefined = slot emptied). */
export function gearCompareRows(m: PartyMember, slot: GearSlot, item: GearRoll | undefined): StatCompareRow[] {
  const before = memberStats(m);
  const after = previewStats(m, slot, item && { ...item, uid: 0 });
  return COMPARE_STATS.map((key) => ({ key, before: before[key], after: after[key] }));
}

/** Colour of a changed value: green when it goes up, red when it goes down, dim when unchanged. */
export function compareColor(before: number, after: number): string {
  return after > before ? COLORS.hp : after < before ? COLORS.hpLow : COLORS.dim;
}

/**
 * Window comparing the piece worn in a slot with a candidate (undefined = take it off): both names in their
 * rarity colours with their own stats, then every member stat as "before > after" with the change coloured.
 */
export function drawGearCompare(
  r: Renderer,
  m: PartyMember,
  slot: GearSlot,
  item: GearRoll | undefined,
  x: number,
  y: number,
  w: number,
): void {
  r.window(x, y, w, GEAR_COMPARE_H);
  const left = x + 8;
  const valueX = left + 30;
  const chars = charsFit(x + w - 8 - valueX);
  const fit = (s: string): string => s.toUpperCase().slice(0, chars);
  const worn = equippedItem(m, slot);
  const rows: Array<[string, string, string]> = [
    ['NOW', worn ? itemLabel(worn) : 'EMPTY', worn ? RARITIES[worn.rarity].color : COLORS.dim],
    ['', worn ? gearStatsText(worn) : '-', COLORS.dim],
    ['NEW', item ? itemLabel(item) : 'REMOVE', item ? RARITIES[item.rarity].color : COLORS.text],
    ['', item ? gearStatsText(item) : 'Leaves the slot empty', COLORS.dim],
  ];
  rows.forEach(([label, text, color], i) => {
    const ty = y + 6 + i * LINE_H;
    if (label) {
      r.text(label, left, ty, COLORS.dim);
    }
    r.text(fit(text), valueX, ty, color);
  });
  const statsY = y + 10 + rows.length * LINE_H;
  const colW = Math.floor((w - 16) / STAT_COLUMNS);
  gearCompareRows(m, slot, item).forEach((row, i) => {
    const cx = left + (i % STAT_COLUMNS) * colW;
    const ty = statsY + Math.floor(i / STAT_COLUMNS) * LINE_H;
    const color = compareColor(row.before, row.after);
    const d = row.after - row.before;
    r.text(row.key.toUpperCase(), cx, ty, COLORS.dim);
    r.textRight(String(row.before), cx + 50, ty);
    r.text('>', cx + 53, ty, COLORS.dim);
    r.textRight(String(row.after), cx + 88, ty, d === 0 ? COLORS.text : color);
    if (d !== 0) {
      r.text(`${d > 0 ? '+' : ''}${d}`, cx + 92, ty, color);
    }
  });
  const desc = item ? gearDescription(item.baseId) : '';
  if (desc) {
    r.text(desc.toUpperCase().slice(0, charsFit(w - 16)), left, statsY + 2 * LINE_H + 4, COLORS.dim);
  }
}

/** How a shop piece compares with what a member wears in its slot. */
export type ShopVerdict = 'better' | 'worse' | 'mixed' | 'same' | 'worn' | 'cannot';

/** One member's side of the shop comparison. */
export interface ShopCompare {
  member: PartyMember;
  /** The piece worn in the slot now (undefined when empty). */
  worn: GearRoll | undefined;
  /** Only the stats that change. */
  changes: StatCompareRow[];
  verdict: ShopVerdict;
}

/** Label and colour of each verdict. */
export const SHOP_VERDICTS: Readonly<Record<ShopVerdict, { text: string; color: string }>> = {
  better: { text: 'BETTER', color: COLORS.hp },
  worse: { text: 'WORSE', color: COLORS.hpLow },
  mixed: { text: 'MIXED', color: COLORS.gold },
  same: { text: 'SAME', color: COLORS.dim },
  worn: { text: 'WORN', color: COLORS.dim },
  cannot: { text: "CAN'T USE", color: COLORS.dim },
};

/** A plain Common of a shop item, as it would arrive in the bag. */
function shopRoll(id: string): GearRoll {
  return { baseId: id, rarity: 'common', bonus: {} };
}

/** Compares buying `id` (a plain Common) with what `m` wears in that slot now. */
export function shopCompare(m: PartyMember, id: string): ShopCompare {
  const slot = slotOf(id);
  const worn = slot ? equippedItem(m, slot) : undefined;
  if (!slot || !canEquip(m, id)) {
    return { member: m, worn, changes: [], verdict: 'cannot' };
  }
  const changes = gearCompareRows(m, slot, shopRoll(id)).filter((row) => row.after !== row.before);
  const up = changes.some((row) => row.after > row.before);
  const down = changes.some((row) => row.after < row.before);
  const verdict: ShopVerdict =
    up && down ? 'mixed' : up ? 'better' : down ? 'worse' : worn?.baseId === id ? 'worn' : 'same';
  return { member: m, worn, changes, verdict };
}

/** Compact list of every change, e.g. 'ATK+3 DEF-1' (blank when nothing changes). */
export function changesText(changes: readonly StatCompareRow[]): string {
  return changes
    .map((row) => {
      const d = row.after - row.before;
      return `${row.key.toUpperCase()}${d > 0 ? '+' : ''}${d}`;
    })
    .join(' ');
}

/** Height of the party panel drawn by `drawShopCompare` for `members` party members. */
export function shopCompareH(members: number): number {
  return (1 + members * 2) * LINE_H + 12;
}

/** Width of one "ATK 12>15 +3" column in the shop panel. */
const SHOP_STAT_W = 90;

/**
 * Party panel under a shop's BUY list: for each member, what they wear in the piece's slot now and a verdict
 * (BETTER / WORSE / MIXED / SAME / WORN / CAN'T USE), then each stat that would change as "before > after".
 */
export function drawShopCompare(
  r: Renderer,
  party: readonly PartyMember[],
  id: string,
  x: number,
  y: number,
  w: number,
): void {
  r.window(x, y, w, shopCompareH(party.length));
  const left = x + 8;
  const right = x + w - 8;
  const nameW = 60;
  const verdictW = 60;
  r.text('PARTY', left, y + 6, COLORS.gold);
  r.text('NOW WEARING', left + nameW, y + 6, COLORS.dim);
  r.textRight('IF BOUGHT', right, y + 6, COLORS.dim);
  const wornChars = charsFit(right - verdictW - (left + nameW));
  party.forEach((m, i) => {
    const c = shopCompare(m, id);
    const ty = y + 6 + (1 + i * 2) * LINE_H;
    const v = SHOP_VERDICTS[c.verdict];
    r.text(m.name.toUpperCase().slice(0, charsFit(nameW - 6)), left, ty);
    const worn = c.worn ? itemLabel(c.worn) : 'NOTHING';
    r.text(worn.toUpperCase().slice(0, wornChars), left + nameW, ty, c.worn ? RARITIES[c.worn.rarity].color : COLORS.dim);
    r.textRight(v.text, right, ty, v.color);
    const sy = ty + LINE_H;
    if (c.verdict === 'cannot') {
      r.text('CANNOT USE THIS', left + nameW, sy, COLORS.dim);
      return;
    }
    if (c.changes.length === 0) {
      r.text('NO CHANGE', left + nameW, sy, COLORS.dim);
      return;
    }
    const cols = Math.max(1, Math.floor((right - (left + nameW)) / SHOP_STAT_W));
    c.changes.slice(0, cols).forEach((row, k) => {
      const cx = left + nameW + k * SHOP_STAT_W;
      const d = row.after - row.before;
      const color = compareColor(row.before, row.after);
      r.text(row.key.toUpperCase(), cx, sy, COLORS.dim);
      r.textRight(String(row.before), cx + 42, sy);
      r.text('>', cx + 44, sy, COLORS.dim);
      r.textRight(String(row.after), cx + 68, sy, color);
      r.text(`${d > 0 ? '+' : ''}${d}`, cx + 70, sy, color);
    });
  });
}