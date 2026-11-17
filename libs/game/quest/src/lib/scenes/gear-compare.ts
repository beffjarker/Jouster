import { Renderer, StatKey } from '@jouster/game/engine';
import { RARITIES } from '../data/rarity';
import { GearSlot, equippedItem, previewStats } from '../state/equipment';
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
