import { TILE, fitScale } from '../art/art';
import { InputAction, InputManager, ItemEffect, Renderer, Scene, Stats, cappedRestore, healAmount, totalXpForLevel, MAX_LEVEL } from '@jouster/game/engine';
import { ABILITIES } from '../data/abilities';
import { classDef } from '../data/classes';
import { ITEMS, WEAPONS } from '../data/equipment';
import { GEAR, gearUsersText } from '../data/gear';
import { RARITIES } from '../data/rarity';
import {
  GEAR_SLOTS,
  BAG_LIMIT,
  GearSlot,
  bagFull,
  buyGear,
  canEquip,
  equipChoices,
  equipItem,
  equippedItem,
  previewStats,
  removeFromBag,
  slotOf,
  slotUsable,
  unequipSlot,
} from '../state/equipment';
import { GameState, addItem } from '../state/game-state';
import { GearItem, gearSellPrice, isPrecious, itemName, rarityName } from '../state/loot';
import { PartyMember, memberAbilities, memberStats, memberToCombatant, setPoisoned } from '../state/party';
import {
  COLORS,
  ListMenu,
  MESSAGE_Y,
  MenuItem,
  SCREEN_H,
  SCREEN_W,
  ask,
  charsFit,
  drawHint,
  drawPartyStatus,
  say,
} from '../ui/widgets';
import { VOLUME_ROWS, adjustVolumeRow, rememberVolumes, volumeLabel } from '../ui/volume-rows';
import { GameContext, memberStatus, requireState } from './context';
import { drawGearCompare } from './gear-compare';
import { GearGroup, gearDescription, gearMenuItem, gearStatsText, groupGear } from './gear-pick-scene';
import { MapScene, questLog } from './map-scene';

type FieldMode =
  | 'main'
  | 'statusWho'
  | 'status'
  | 'item'
  | 'itemWho'
  | 'gear'
  | 'gearWho'
  | 'equipWho'
  | 'equipSlot'
  | 'equipPick'
  | 'magicWho'
  | 'magic'
  | 'magicWho2'
  | 'volume';

const MAIN_MENU = ['STATUS', 'ITEM', 'EQUIP', 'MAGIC', 'QUESTS', 'VOLUME', 'MAP', 'CLOSE'] as const;
const SLOT_LABELS: Readonly<Record<GearSlot, string>> = {
  weapon: 'WEAPON',
  armor: 'ARMOR',
  shield: 'SHIELD',
  accessory: 'ACCESSORY',
};
/** Name of the piece worn in a slot ('-' when empty). */
function wornName(m: PartyMember, slot: GearSlot): string {
  const item = equippedItem(m, slot);
  return item ? itemName(item).toUpperCase() : '-';
}

/** Party status row position while a message window is open over the menu. */
const FIELD_STATUS_Y_WITH_MESSAGE = MESSAGE_Y - 48;
/** Field-menu submenu (items, magic, equipment) beside the main menu. */
const SUB_X = 88;
const SUB_W = Math.min(220, SCREEN_W - SUB_X - 8);
/** Gear lists are wider, for rarity tags and bonus suffixes. */
const GEAR_W = SCREEN_W - SUB_X - 8;
/** Characters that fit on one line of the shop's description window. */
const SHOP_CHARS = charsFit(SCREEN_W - 32);

/**
 * Field menu (X / Esc, or I / E straight to ITEM / EQUIP): status, items, equipment and healing magic.
 * The key that opened it closes it again from any submenu (X / Esc still steps back one level, as everywhere).
 */
export class FieldMenuScene implements Scene {
  public readonly id = 'field-menu';
  public readonly overlay = true;
  private readonly state: GameState;
  private readonly main: ListMenu;
  private sub: ListMenu | null = null;
  private mode: FieldMode = 'main';
  private member: PartyMember | null = null;
  private itemId = '';
  private spellId = '';
  private slot: GearSlot = 'weapon';
  private subIds: string[] = [];
  /** Cursor of the ITEMS and GEAR tabs, kept while switching between them. */
  private readonly tabCursor = { item: 0, gear: 0 };
  /** Lines of the GEAR tab. */
  private gearGroups: GearGroup[] = [];
  /** Lines of the equip pick list (null = REMOVE). */
  private pick: Array<GearGroup | null> = [];
  /** Bag piece chosen on the GEAR tab. */
  private gearItem: GearItem | null = null;
  /** Action that opened the menu and closes it again (`cancel` already backs out level by level). */
  private readonly opener: InputAction | null;

  constructor(private readonly ctx: GameContext, open?: 'item' | 'equip') {
    this.state = requireState(ctx);
    this.opener = open === 'item' ? 'items' : open === 'equip' ? 'equip' : null;
    this.main = new ListMenu(MAIN_MENU.map((label) => ({ label })), ctx.audio);
    if (open === 'item') {
      this.main.cursor = MAIN_MENU.indexOf('ITEM');
      if (this.hasConsumables() || this.state.gear.length > 0) {
        this.openItems();
      }
    } else if (open === 'equip') {
      this.main.cursor = MAIN_MENU.indexOf('EQUIP');
      this.openMembers('equipWho');
    }
  }

  public update(_dt: number, input: InputManager): void {
    // On a status page E means "equip this member", so it does not close the menu there.
    if (this.opener && input.wasPressed(this.opener) && !(this.mode === 'status' && this.opener === 'equip')) {
      this.ctx.audio.play('cancel');
      this.ctx.stack.pop();
      return;
    }
    // Clicking the main menu while a sub-list is open jumps straight to the clicked entry.
    if (this.mode !== 'main' && this.main.itemAt(input.tap) >= 0) {
      this.mode = 'main';
      this.sub = null;
    }
    if (this.mode === 'main') {
      const res = this.main.update(input);
      const entry = res?.kind === 'select' ? MAIN_MENU[res.index] : undefined;
      if (res?.kind === 'cancel' || entry === 'CLOSE') {
        this.ctx.stack.pop();
      } else if (entry === 'STATUS') {
        this.openMembers('statusWho');
      } else if (entry === 'ITEM') {
        this.openItems();
      } else if (entry === 'EQUIP') {
        this.openMembers('equipWho');
      } else if (entry === 'MAGIC') {
        this.openMembers('magicWho');
      } else if (entry === 'QUESTS') {
        say(this.ctx.stack, this.ctx.audio, questLog(this.state));
      } else if (entry === 'VOLUME') {
        this.openVolume();
      } else if (entry === 'MAP') {
        this.ctx.stack.pop();
        this.ctx.stack.push(new MapScene(this.ctx));
      }
      return;
    }
    if (this.mode === 'status') {
      if (input.wasPressed('equip') && this.member) {
        this.ctx.audio.play('confirm');
        this.openSlots(this.member);
      } else if (input.wasPressed('confirm') || input.wasPressed('cancel') || input.tap) {
        this.ctx.audio.play('cancel');
        this.openMembers('statusWho');
      }
      return;
    }
    if (this.mode === 'volume') {
      this.updateVolume(input);
      return;
    }
    if ((this.mode === 'item' || this.mode === 'gear') && (input.wasPressed('left') || input.wasPressed('right'))) {
      const other = this.mode === 'item' ? this.state.gear.length > 0 : this.hasConsumables();
      if (other) {
        this.ctx.audio.play('cursor');
        this.toggleTab();
      }
      return;
    }
    const res = this.sub?.update(input);
    if (this.sub && (this.mode === 'item' || this.mode === 'gear')) {
      this.tabCursor[this.mode] = this.sub.cursor;
    }
    if (res?.kind === 'cancel') {
      this.back();
      return;
    }
    if (res?.kind !== 'select') {
      return;
    }
    this.select(res.index);
  }

  public render(r: Renderer): void {
    this.main.render(r, 8, 8, 72, this.mode === 'main', 'MENU');
    const goldY = 8 + this.main.height() + 4;
    r.window(8, goldY, 72, 20);
    r.text(`${this.state.gold}G`, 16, goldY + 6, COLORS.gold);
    if (this.mode === 'status' && this.member) {
      this.renderStatus(r, this.member);
      return;
    }
    if (this.sub) {
      const titles: Partial<Record<FieldMode, string>> = {
        item: 'ITEMS',
        gear: `GEAR ${this.state.gear.length}/${BAG_LIMIT}`,
        magic: 'MAGIC',
        equipSlot: 'EQUIP',
        volume: 'VOLUME',
      };
      const title = this.mode === 'equipPick' ? SLOT_LABELS[this.slot] : titles[this.mode] ?? 'WHO?';
      const w = this.mode === 'gear' || this.mode === 'equipPick' ? GEAR_W : SUB_W;
      this.sub.render(r, SUB_X, 8, w, true, title);
      const hint = this.subHint();
      if (this.mode === 'equipPick' && this.member) {
        drawGearCompare(r, this.member, this.slot, this.pick[this.sub.cursor]?.item, SUB_X, 8 + this.sub.height() + 4, w);
      } else if (hint) {
        drawHint(r, hint, SUB_X, 8 + this.sub.height() + 4, w);
      }
    }
    // Messages (e.g. spell results) cover the bottom of the screen, so lift the status above them.
    const statusY = this.ctx.stack.top === this ? SCREEN_H - 48 : FIELD_STATUS_Y_WITH_MESSAGE;
    drawPartyStatus(r, this.state.party.map(memberStatus), statusY);
  }

  /** Description of the highlighted item or spell. */
  private subHint(): string | undefined {
    const cursor = this.sub?.cursor ?? 0;
    const id = this.subIds[cursor];
    if (this.mode === 'item') {
      return id ? ITEMS.get(id)?.description : 'Show the gear in your bag (left / right).';
    }
    if (this.mode === 'gear') {
      const item = this.gearGroups[cursor]?.item;
      return item ? `${gearStatsText(item)}. ${gearDescription(item.baseId)}` : 'Show your items (left / right).';
    }
    return this.mode === 'magic' ? ABILITIES.get(id)?.description : undefined;
  }

  private openMembers(mode: FieldMode, effect?: ItemEffect, cures = false): void {
    this.mode = mode;
    this.sub = new ListMenu(
      this.state.party.map((m) => ({
        label: m.name.toUpperCase(),
        right: classDef(m.classId).name.toUpperCase(),
        enabled: effect === undefined || canRestore(m, effect, cures),
      })),
      this.ctx.audio,
    );
  }

  /** Volume submenu: one row per audio channel, showing its level; left/right adjust it. */
  private openVolume(): void {
    this.mode = 'volume';
    this.sub = new ListMenu(
      VOLUME_ROWS.map((row) => ({ label: row.label, right: volumeLabel(this.ctx.audio.getChannelVolume(row.channel)) })),
      this.ctx.audio,
    );
  }

  private updateVolume(input: InputManager): void {
    const menu = this.sub;
    if (!menu) {
      this.mode = 'main';
      return;
    }
    if (input.wasPressed('cancel')) {
      this.ctx.audio.play('cancel');
      this.mode = 'main';
      this.sub = null;
      return;
    }
    const row = VOLUME_ROWS[menu.cursor];
    if (adjustVolumeRow(this.ctx.audio, row.channel, input)) {
      rememberVolumes(this.ctx.audio, this.ctx.storage, this.ctx.state);
    }
    menu.items[menu.cursor] = { ...menu.items[menu.cursor], right: volumeLabel(this.ctx.audio.getChannelVolume(row.channel)) };
    if (input.wasPressed('up')) {
      menu.cursor = (menu.cursor - 1 + menu.items.length) % menu.items.length;
      this.ctx.audio.play('cursor');
    } else if (input.wasPressed('down')) {
      menu.cursor = (menu.cursor + 1) % menu.items.length;
      this.ctx.audio.play('cursor');
    }
  }

  private hasConsumables(): boolean {
    return [...ITEMS.keys()].some((id) => (this.state.inventory[id] ?? 0) > 0);
  }

  private toggleTab(): void {
    if (this.mode === 'item') {
      this.openGear();
    } else {
      this.openItems();
    }
  }

  /** ITEMS tab: consumables, plus a row to switch to the GEAR tab (plan 33.7). */
  private openItems(): void {
    this.subIds = [...ITEMS.values()].filter((i) => (this.state.inventory[i.id] ?? 0) > 0).map((i) => i.id);
    if (this.subIds.length === 0) {
      if (this.state.gear.length > 0) {
        this.openGear();
        return;
      }
      say(this.ctx.stack, this.ctx.audio, ['You are not carrying any items.']);
      this.mode = 'main';
      this.sub = null;
      return;
    }
    this.mode = 'item';
    const items: MenuItem[] = this.subIds.map((id) => {
      const def = ITEMS.get(id);
      return {
        label: (def?.name ?? id).toUpperCase(),
        right: `x${this.state.inventory[id]}`,
        enabled: def?.usableInField !== false,
      };
    });
    if (this.state.gear.length > 0) {
      items.push({ label: 'GEAR >', right: `${this.state.gear.length}/${BAG_LIMIT}` });
    }
    this.setSub(items);
  }

  /** GEAR tab: bag pieces by slot, tier and rarity, plus a row back to the ITEMS tab. */
  private openGear(): void {
    this.gearGroups = groupGear(this.state.gear);
    if (this.gearGroups.length === 0) {
      this.openItems();
      return;
    }
    this.mode = 'gear';
    const items = this.gearGroups.map((g) => gearMenuItem(g));
    if (this.hasConsumables()) {
      items.push({ label: '< ITEMS' });
    }
    this.setSub(items);
  }

  /** Opens a tab's list with the cursor where it was last left. */
  private setSub(items: MenuItem[]): void {
    this.sub = new ListMenu(items, this.ctx.audio);
    const tab = this.mode === 'gear' ? 'gear' : 'item';
    this.sub.cursor = Math.max(0, Math.min(this.tabCursor[tab], items.length - 1));
  }

  /** What to do with a bag piece: equip it on someone or drop it. */
  private gearAction(item: GearItem): void {
    const { stack, audio } = this.ctx;
    ask(stack, audio, [`${rarityName(item)}. ${gearStatsText(item)}.`], ['EQUIP', 'DROP', 'CANCEL'], (i) => {
      if (i === 0) {
        const users = this.state.party.map((m) => canEquip(m, item.baseId));
        if (!users.some(Boolean)) {
          say(stack, audio, ['No one in your party can use that.']);
          return;
        }
        this.gearItem = item;
        this.mode = 'gearWho';
        this.sub = new ListMenu(
          this.state.party.map((m, k) => ({
            label: m.name.toUpperCase(),
            right: statDelta(memberStats(m), previewStats(m, slotOf(item.baseId) ?? 'weapon', item)),
            enabled: users[k],
          })),
          audio,
        );
      } else if (i === 1) {
        const drop = (): void => {
          removeFromBag(this.state, item.uid);
          audio.play('cancel');
          say(stack, audio, [`Dropped the ${itemName(item)}.`]);
          this.openGear();
        };
        if (isPrecious(item)) {
          ask(stack, audio, [`Drop the ${rarityName(item)}? It will be gone for good.`], ['DROP IT', 'KEEP IT'], (c) => {
            if (c === 0) {
              drop();
            }
          });
        } else {
          drop();
        }
      }
    });
  }

  /** Slots of one member with what they wear (shields grey out for classes that cannot use one). */
  private openSlots(m: PartyMember): void {
    this.member = m;
    this.mode = 'equipSlot';
    this.sub = new ListMenu(
      GEAR_SLOTS.map((slot) => {
        const item = equippedItem(m, slot);
        return {
          label: SLOT_LABELS[slot],
          right: wornName(m, slot),
          enabled: slotUsable(m, slot),
          color: item && slotUsable(m, slot) ? RARITIES[item.rarity].color : undefined,
        };
      }),
      this.ctx.audio,
    );
  }

  /** Bag pieces for the slot (rarity colour, stat change), plus REMOVE for non-weapons. */
  private openPick(m: PartyMember, slot: GearSlot): void {
    const choices: Array<GearGroup | null> = groupGear(equipChoices(this.state, m, slot));
    if (slot !== 'weapon' && equippedItem(m, slot)) {
      choices.push(null);
    }
    if (choices.length === 0) {
      say(this.ctx.stack, this.ctx.audio, ['Nothing in your bag fits that slot. Shops sell more gear.']);
      return;
    }
    this.slot = slot;
    this.pick = choices;
    this.mode = 'equipPick';
    const before = memberStats(m);
    this.sub = new ListMenu(
      choices.map((g) =>
        g ? gearMenuItem(g, statDelta(before, previewStats(m, slot, g.item))) : { label: 'REMOVE', right: statDelta(before, previewStats(m, slot, undefined)) },
      ),
      this.ctx.audio,
    );
  }

  private equip(m: PartyMember, group: GearGroup | null): void {
    if (!group) {
      const worn = equippedItem(m, this.slot);
      if (bagFull(this.state)) {
        say(this.ctx.stack, this.ctx.audio, ['Your bag is full.']);
        return;
      }
      unequipSlot(this.state, m, this.slot);
      say(this.ctx.stack, this.ctx.audio, [`${m.name} takes off the ${worn ? itemName(worn) : 'gear'}.`]);
    } else if (equipItem(this.state, m, group.item.uid) !== false) {
      this.ctx.audio.play('confirm');
      say(this.ctx.stack, this.ctx.audio, [`${m.name} equips the ${itemName(group.item)}.`]);
    }
    this.openSlots(m);
  }

  private fieldSpells(m: PartyMember): string[] {
    return memberAbilities(m).filter((id) => {
      const def = ABILITIES.get(id);
      return def !== undefined && (def.effect === 'heal' || def.effect === 'revive');
    });
  }

  private back(): void {
    if (this.mode === 'itemWho') {
      this.openItems();
    } else if (this.mode === 'gearWho') {
      this.openGear();
    } else if (this.mode === 'equipSlot') {
      this.openMembers('equipWho');
    } else if (this.mode === 'equipPick' && this.member) {
      this.openSlots(this.member);
    } else if (this.mode === 'magic') {
      this.openMembers('magicWho');
    } else if (this.mode === 'magicWho2' && this.member) {
      this.openSpells(this.member);
    } else {
      this.mode = 'main';
      this.sub = null;
    }
  }

  private openSpells(m: PartyMember): void {
    this.member = m;
    this.subIds = this.fieldSpells(m);
    if (this.subIds.length === 0) {
      say(this.ctx.stack, this.ctx.audio, [`${m.name} knows no magic that helps outside battle.`]);
      return;
    }
    this.mode = 'magic';
    const items: MenuItem[] = this.subIds.map((id) => {
      const def = ABILITIES.get(id);
      return {
        label: (def?.name ?? id).toUpperCase(),
        right: `${def?.mpCost ?? 0}MP`,
        enabled: m.hp > 0 && m.mp >= (def?.mpCost ?? 0),
      };
    });
    this.sub = new ListMenu(items, this.ctx.audio);
  }

  private select(index: number): void {
    switch (this.mode) {
      case 'statusWho':
        this.member = this.state.party[index];
        this.mode = 'status';
        this.sub = null;
        return;
      case 'item':
        if (index >= this.subIds.length) {
          this.openGear();
          return;
        }
        this.itemId = this.subIds[index];
        this.openMembers('itemWho', ITEMS.get(this.itemId)?.effect);
        return;
      case 'gear': {
        const group = this.gearGroups[index];
        if (group) {
          this.gearAction(group.item);
        } else {
          this.openItems();
        }
        return;
      }
      case 'gearWho': {
        const m = this.state.party[index];
        const item = this.gearItem;
        if (m && item && equipItem(this.state, m, item.uid) !== false) {
          this.ctx.audio.play('confirm');
          say(this.ctx.stack, this.ctx.audio, [`${m.name} equips the ${itemName(item)}.`]);
        }
        this.openGear();
        return;
      }
      case 'itemWho':
        this.useItem(this.state.party[index]);
        return;
      case 'equipWho':
        this.openSlots(this.state.party[index]);
        return;
      case 'equipSlot':
        if (this.member) {
          this.openPick(this.member, GEAR_SLOTS[index]);
        }
        return;
      case 'equipPick':
        if (this.member) {
          this.equip(this.member, this.pick[index] ?? null);
        }
        return;
      case 'magicWho':
        this.openSpells(this.state.party[index]);
        return;
      case 'magic': {
        this.spellId = this.subIds[index];
        const spell = ABILITIES.get(this.spellId);
        this.openMembers('magicWho2', spell?.effect === 'revive' ? 'revive' : 'healHp', !!spell?.curesPoison);
        return;
      }
      case 'magicWho2':
        this.castSpell(this.state.party[index]);
        return;
      default:
        return;
    }
  }

  private useItem(target: PartyMember): void {
    const def = ITEMS.get(this.itemId);
    if (!def || (this.state.inventory[def.id] ?? 0) <= 0) {
      return;
    }
    const msg = applyRestore(target, def.effect, def.amount);
    if (!msg) {
      say(this.ctx.stack, this.ctx.audio, ['It would have no effect.']);
      return;
    }
    addItem(this.state, def.id, -1);
    if ((this.state.inventory[def.id] ?? 0) <= 0) {
      delete this.state.inventory[def.id];
    }
    this.ctx.audio.play('heal');
    say(this.ctx.stack, this.ctx.audio, [`Used a ${def.name}. ${msg}`]);
    this.openItems();
  }

  private castSpell(target: PartyMember): void {
    const caster = this.member;
    const def = ABILITIES.get(this.spellId);
    if (!caster || !def || caster.mp < def.mpCost) {
      return;
    }
    const amount =
      def.effect === 'revive' ? def.revivePercent ?? 0.25 : healAmount(memberToCombatant(caster), this.ctx.rng, def.power, def.magScale ?? 2);
    const msg = applyRestore(target, def.effect === 'revive' ? 'revive' : 'healHp', amount, !!def.curesPoison);
    if (!msg) {
      say(this.ctx.stack, this.ctx.audio, ['It would have no effect.']);
      return;
    }
    caster.mp -= def.mpCost;
    this.ctx.audio.play('heal');
    say(this.ctx.stack, this.ctx.audio, [`${caster.name} casts ${def.name}. ${msg}`]);
    this.openSpells(caster);
  }

  private renderStatus(r: Renderer, m: PartyMember): void {
    const s = memberStats(m);
    const cls = classDef(m.classId);
    const x = 88;
    r.window(x, 8, SCREEN_W - x - 8, SCREEN_H - 16);
    const portrait = this.ctx.art.character(m.classId, 'down', 0);
    r.draw(portrait, x + 8, 14, { scale: fitScale(portrait, TILE * 2) });
    r.text(m.name.toUpperCase(), x + 44, 16, COLORS.gold);
    r.text(`${cls.name.toUpperCase()} L${m.level}`, x + 44, 28);
    if (m.poisoned && m.hp > 0) {
      r.text('POISONED', x + 44, 38, COLORS.poison);
    }
    const next = m.level >= MAX_LEVEL ? '-' : String(Math.max(0, totalXpForLevel(m.level + 1) - m.xp));
    const rows: Array<[string, string]> = [
      ['HP', `${m.hp}/${s.hp}`],
      ['MP', `${m.mp}/${s.mp}`],
      ['ATK', String(s.atk)],
      ['DEF', String(s.def)],
      ['AGI', String(s.agi)],
      ['MAG', String(s.mag)],
      ['XP', String(m.xp)],
      ['NEXT', next],
    ];
    rows.forEach(([k, v], i) => {
      r.text(k, x + 10, 50 + i * 10, COLORS.dim);
      r.textRight(v, x + 150, 50 + i * 10);
    });
    const col = x + 170;
    r.text('GEAR', col, 16, COLORS.dim);
    GEAR_SLOTS.forEach((slot, i) => {
      const item = equippedItem(m, slot);
      r.text(wornName(m, slot), col, 26 + i * 10, item ? RARITIES[item.rarity].color : COLORS.text);
    });
    r.text('ABILITIES', col, 72, COLORS.dim);
    memberAbilities(m)
      .slice(0, 10)
      .forEach((id, i) => {
        r.text((ABILITIES.get(id)?.name ?? id).toUpperCase(), col, 82 + i * 10);
      });
    if (cls.passive) {
      r.text(cls.passive.name.toUpperCase(), x + 10, 140, COLORS.mp);
    }
    r.text('E: EQUIP', x + 10, SCREEN_H - 26, COLORS.dim);
  }
}

/** Compact change of the first changed stat, e.g. 'DEF+3' (blank when nothing changes). */
function statDelta(before: Stats, after: Stats): string {
  const keys = ['atk', 'def', 'mag', 'agi', 'hp', 'mp'] as const;
  const k = keys.find((key) => before[key] !== after[key]);
  if (!k) {
    return '';
  }
  const d = after[k] - before[k];
  return `${k.toUpperCase()}${d > 0 ? '+' : ''}${d}`;
}

/**
 * True when a restore effect would do something for this member (used to grey out targets). `cures` marks heals
 * that also cure poison (Heal), so a poisoned member at full HP is still a valid target.
 */
export function canRestore(target: PartyMember, effect: ItemEffect, cures = false): boolean {
  const s = memberStats(target);
  if (effect === 'revive') {
    return target.hp <= 0;
  }
  if (target.hp <= 0) {
    return false;
  }
  if (effect === 'curePoison') {
    return !!target.poisoned;
  }
  if (effect === 'healHp') {
    return target.hp < s.hp || (cures && !!target.poisoned);
  }
  return target.mp < s.mp;
}

/** Applies a restore effect to a party member; returns a message or null if it does nothing. */
export function applyRestore(target: PartyMember, effect: ItemEffect, amount: number, cures = false): string | null {
  const s = memberStats(target);
  if (effect === 'revive') {
    if (target.hp > 0) {
      return null;
    }
    target.hp = Math.max(1, Math.floor(s.hp * amount));
    setPoisoned(target, false);
    return `${target.name} is revived!`;
  }
  if (target.hp <= 0) {
    return null;
  }
  if (effect === 'curePoison') {
    if (!target.poisoned) {
      return null;
    }
    setPoisoned(target, false);
    return `${target.name} is cured of poison.`;
  }
  if (effect === 'healHp') {
    const gained = cappedRestore(target.hp, s.hp, amount);
    const cured = cures && !!target.poisoned;
    if (gained <= 0 && !cured) {
      return null;
    }
    target.hp += gained;
    if (cured) {
      setPoisoned(target, false);
    }
    const healed = gained > 0 ? `${target.name} recovers ${gained} HP.` : '';
    return cured ? `${healed} ${target.name} is cured of poison.`.trim() : healed;
  }
  const gained = cappedRestore(target.mp, s.mp, amount);
  if (gained <= 0) {
    return null;
  }
  target.mp += gained;
  return `${target.name} recovers ${gained} MP.`;
}

/** Display name and price of anything a shop can sell. */
function shopEntry(id: string): { name: string; price: number } {
  const def = ITEMS.get(id) ?? WEAPONS.get(id) ?? GEAR.get(id);
  return { name: def?.name ?? id, price: def?.price ?? 0 };
}

/** What a shop pays for a consumable: half its price, at least 1. */
export function itemSellPrice(id: string): number {
  return Math.max(1, Math.floor((ITEMS.get(id)?.price ?? 0) / 2));
}

type ShopMode = 'top' | 'buy' | 'sell';
const SHOP_TOP = ['BUY', 'SELL', 'LEAVE'] as const;
/** A line of the SELL list: a consumable id or a group of bag gear. */
type SellLine = { id: string } | { group: GearGroup };
const SHOP_LIST_X = 104;

/**
 * Item shop, weapon shop and armorer: BUY, SELL or LEAVE (plan 33.5). Bought gear goes into the bag as a plain
 * Common, then the shop offers to equip it; the piece it replaces goes into the bag too (nothing is sold
 * automatically). Every shop buys anything: consumables and bag gear, for half their value.
 */
export class ShopScene implements Scene {
  public readonly id = 'shop';
  public readonly overlay = true;
  private readonly state: GameState;
  private readonly top: ListMenu;
  private readonly menu: ListMenu;
  private readonly sellMenu: ListMenu;
  private sellLines: SellLine[] = [];
  private mode: ShopMode = 'top';

  constructor(
    private readonly ctx: GameContext,
    private readonly kind: 'item' | 'weapon' | 'armor',
    private readonly stock: readonly string[],
  ) {
    this.state = requireState(ctx);
    this.top = new ListMenu(SHOP_TOP.map((label) => ({ label })), ctx.audio);
    this.menu = new ListMenu([], ctx.audio, 6);
    this.sellMenu = new ListMenu([], ctx.audio, 6);
    this.refresh();
  }

  /** Current mode, for tests. */
  public get shopMode(): ShopMode {
    return this.mode;
  }

  /** The mode (`top`, `buy` or `sell`) as the canvas `data-view`, for e2e. */
  public get view(): string {
    return this.mode;
  }

  public update(_dt: number, input: InputManager): void {
    if (this.mode === 'top') {
      const res = this.top.update(input);
      const entry = res?.kind === 'select' ? SHOP_TOP[res.index] : undefined;
      if (res?.kind === 'cancel' || entry === 'LEAVE') {
        this.ctx.stack.pop();
        say(this.ctx.stack, this.ctx.audio, ['Come again!']);
      } else if (entry === 'BUY') {
        this.mode = 'buy';
        this.refresh();
      } else if (entry === 'SELL') {
        this.openSell();
      }
      return;
    }
    if (this.mode === 'buy') {
      const res = this.menu.update(input);
      if (res?.kind === 'cancel' || (res?.kind === 'select' && res.index === this.stock.length)) {
        this.mode = 'top';
      } else if (res?.kind === 'select') {
        this.buy(this.stock[res.index]);
      }
      return;
    }
    const res = this.sellMenu.update(input);
    if (res?.kind === 'cancel' || (res?.kind === 'select' && res.index === this.sellLines.length)) {
      this.mode = 'top';
    } else if (res?.kind === 'select') {
      this.sell(this.sellLines[res.index]);
    }
  }

  public render(r: Renderer): void {
    const title = this.kind === 'item' ? 'ITEM SHOP' : this.kind === 'weapon' ? 'WEAPONS' : 'ARMORER';
    this.top.render(r, 8, 8, SHOP_LIST_X - 16, this.mode === 'top', title);
    r.window(SCREEN_W - 80, 8, 72, 20);
    r.textRight(`${this.state.gold}G`, SCREEN_W - 16, 14, COLORS.gold);
    const y = SCREEN_H - 60;
    if (this.mode === 'buy') {
      this.menu.render(r, SHOP_LIST_X, 8, 200, true, 'BUY');
    } else if (this.mode === 'sell') {
      const bag = `SELL  BAG ${this.state.gear.length}/${BAG_LIMIT}`;
      this.sellMenu.render(r, SHOP_LIST_X, 8, SCREEN_W - SHOP_LIST_X - 88, true, bag);
    }
    r.window(8, y - 8, SCREEN_W - 16, 56);
    if (this.mode === 'top') {
      r.text('WELCOME! BUY, OR SELL WHAT YOU CARRY.', 16, y);
      return;
    }
    if (this.mode === 'sell') {
      this.renderSellInfo(r, y);
      return;
    }
    const id = this.stock[this.menu.cursor];
    if (!id) {
      r.text('BACK TO THE COUNTER.', 16, y);
      return;
    }
    if (this.kind === 'item') {
      const def = ITEMS.get(id);
      r.text((def?.description ?? '').toUpperCase().slice(0, SHOP_CHARS), 16, y);
      r.text(`YOU HAVE ${this.state.inventory[id] ?? 0}`, 16, y + 14, COLORS.dim);
      return;
    }
    const g = GEAR.get(id);
    r.text(gearDescription(id).toUpperCase().slice(0, SHOP_CHARS), 16, y);
    const stats = gearStatsText({ baseId: id, rarity: 'common', bonus: {} });
    const bonus = g ? `${stats}  WORN BY: ${gearUsersText(g)}` : stats;
    r.text(bonus.slice(0, SHOP_CHARS), 16, y + 12, COLORS.dim);
    const users = this.state.party.filter((m) => canEquip(m, id));
    r.text(
      users.length ? `FOR: ${users.map((m) => m.name.toUpperCase()).join(', ')}` : 'NO ONE IN YOUR PARTY CAN USE THIS',
      16,
      y + 26,
      users.length ? COLORS.text : COLORS.hpLow,
    );
  }

  private renderSellInfo(r: Renderer, y: number): void {
    const line = this.sellLines[this.sellMenu.cursor];
    if (!line) {
      r.text('BACK TO THE COUNTER.', 16, y);
      return;
    }
    if ('id' in line) {
      r.text((ITEMS.get(line.id)?.description ?? '').toUpperCase().slice(0, SHOP_CHARS), 16, y);
      r.text(`YOU HAVE ${this.state.inventory[line.id] ?? 0}`, 16, y + 14, COLORS.dim);
      return;
    }
    const item = line.group.item;
    r.text(rarityName(item).toUpperCase().slice(0, SHOP_CHARS), 16, y, RARITIES[item.rarity].color);
    r.text(gearStatsText(item).slice(0, SHOP_CHARS), 16, y + 12, COLORS.dim);
    r.text(gearDescription(item.baseId).toUpperCase().slice(0, SHOP_CHARS), 16, y + 26);
  }

  private refresh(): void {
    const items: MenuItem[] = this.stock.map((id) => {
      const { name, price } = shopEntry(id);
      return { label: name.toUpperCase(), right: `${price}G`, enabled: price <= this.state.gold };
    });
    items.push({ label: 'BACK' });
    this.menu.setItems(items);
  }

  /** SELL list: consumables, then bag gear (grouped plain Commons), each with what the shop pays. */
  private openSell(): void {
    const ids = [...ITEMS.keys()].filter((id) => (this.state.inventory[id] ?? 0) > 0);
    this.sellLines = [...ids.map((id) => ({ id })), ...groupGear(this.state.gear).map((group) => ({ group }))];
    if (this.sellLines.length === 0) {
      this.mode = 'top';
      say(this.ctx.stack, this.ctx.audio, ['You have nothing to sell.']);
      return;
    }
    const items: MenuItem[] = this.sellLines.map((line) =>
      'id' in line
        ? {
            label: `${(ITEMS.get(line.id)?.name ?? line.id).toUpperCase()} x${this.state.inventory[line.id]}`,
            right: `${itemSellPrice(line.id)}G`,
          }
        : gearMenuItem(line.group, `${gearSellPrice(line.group.item)}G`),
    );
    items.push({ label: 'BACK' });
    this.sellMenu.setItems(items);
    this.mode = 'sell';
  }

  private sell(line: SellLine): void {
    const { stack, audio } = this.ctx;
    if ('id' in line) {
      if ((this.state.inventory[line.id] ?? 0) <= 0) {
        return;
      }
      this.state.gold += itemSellPrice(line.id);
      addItem(this.state, line.id, -1);
      if ((this.state.inventory[line.id] ?? 0) <= 0) {
        delete this.state.inventory[line.id];
      }
      audio.play('coin');
      this.openSell();
      return;
    }
    const item = line.group.item;
    const price = gearSellPrice(item);
    const done = (): void => {
      if (removeFromBag(this.state, item.uid)) {
        this.state.gold += price;
        audio.play('coin');
      }
      this.refresh();
      this.openSell();
    };
    if (isPrecious(item)) {
      ask(stack, audio, [`Sell the ${rarityName(item)} for ${price}G?`], ['SELL', 'KEEP'], (i) => {
        if (i === 0) {
          done();
        }
      });
    } else {
      done();
    }
  }

  private buy(id: string): void {
    const { stack, audio } = this.ctx;
    const { name, price } = shopEntry(id);
    if (price > this.state.gold) {
      return;
    }
    if (this.kind === 'item' && ITEMS.has(id)) {
      this.state.gold -= price;
      addItem(this.state, id);
      audio.play('coin');
      this.refresh();
      return;
    }
    const users = this.state.party.filter((m) => canEquip(m, id));
    if (!slotOf(id) || users.length === 0) {
      say(stack, audio, ['No one in your party can make use of that.']);
      return;
    }
    if (bagFull(this.state)) {
      ask(stack, audio, ['Your bag is full. Sell something first?'], ['SELL', 'NO'], (i) => {
        if (i === 0) {
          this.openSell();
        }
      });
      return;
    }
    const item = buyGear(this.state, id);
    if (!item) {
      return;
    }
    this.state.gold -= price;
    audio.play('coin');
    this.refresh();
    ask(stack, audio, [`Bought the ${name}. Equip it now?`], [...users.map((m) => m.name.toUpperCase()), 'LATER'], (i) => {
      const user = users[i];
      if (!user) {
        say(stack, audio, [`The ${name} is in your bag. Equip it from the menu (E).`]);
        return;
      }
      const old = equipItem(this.state, user, item.uid);
      const note = old ? ` The ${itemName(old)} is in your bag.` : '';
      say(stack, audio, [`${user.name} equips the ${name}!${note}`]);
    });
  }
}
