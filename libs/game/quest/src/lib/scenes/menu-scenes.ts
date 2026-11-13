import { InputManager, Renderer, Scene, Stats, cappedRestore, healAmount, totalXpForLevel, MAX_LEVEL } from '@jouster/game/engine';
import { ABILITIES } from '../data/abilities';
import { classDef } from '../data/classes';
import { ITEMS, WEAPONS } from '../data/equipment';
import { GEAR, gearBonusText, gearUsersText } from '../data/gear';
import {
  GEAR_SLOTS,
  GearSlot,
  canEquip,
  equipChoices,
  equipItem,
  equippedId,
  previewStats,
  slotOf,
  slotUsable,
  statChangeText,
  unequipSlot,
} from '../state/equipment';
import { GameState, addItem } from '../state/game-state';
import { PartyMember, memberAbilities, memberStats, memberToCombatant } from '../state/party';
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
import { GameContext, memberStatus, requireState } from './context';
import { MapScene, questLog } from './map-scene';

type FieldMode =
  | 'main'
  | 'statusWho'
  | 'status'
  | 'item'
  | 'itemWho'
  | 'equipWho'
  | 'equipSlot'
  | 'equipPick'
  | 'magicWho'
  | 'magic'
  | 'magicWho2';

const MAIN_MENU = ['STATUS', 'ITEM', 'EQUIP', 'MAGIC', 'QUESTS', 'MAP', 'CLOSE'] as const;
const SLOT_LABELS: Readonly<Record<GearSlot, string>> = {
  weapon: 'WEAPON',
  armor: 'ARMOR',
  shield: 'SHIELD',
  accessory: 'ACCESSORY',
};
/** Pseudo-id for the REMOVE row of the equip list. */
const REMOVE = '';

/** Display name of a weapon or gear id ('-' when empty). */
function gearName(id: string | undefined): string {
  return id ? (WEAPONS.get(id)?.name ?? GEAR.get(id)?.name ?? id).toUpperCase() : '-';
}

/** Party status row position while a message window is open over the menu. */
const FIELD_STATUS_Y_WITH_MESSAGE = MESSAGE_Y - 48;
/** Field-menu submenu (items, magic, equipment) beside the main menu. */
const SUB_X = 88;
const SUB_W = Math.min(220, SCREEN_W - SUB_X - 8);
/** Characters that fit on one line of the shop's description window. */
const SHOP_CHARS = charsFit(SCREEN_W - 32);

/** Field menu (X / Esc, or I / E straight to ITEM / EQUIP): status, items, equipment and healing magic. */
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

  constructor(private readonly ctx: GameContext, open?: 'item' | 'equip') {
    this.state = requireState(ctx);
    this.main = new ListMenu(MAIN_MENU.map((label) => ({ label })), ctx.audio);
    if (open === 'item') {
      this.main.cursor = MAIN_MENU.indexOf('ITEM');
      if ([...ITEMS.keys()].some((id) => (this.state.inventory[id] ?? 0) > 0)) {
        this.openItems();
      }
    } else if (open === 'equip') {
      this.main.cursor = MAIN_MENU.indexOf('EQUIP');
      this.openMembers('equipWho');
    }
  }

  public update(_dt: number, input: InputManager): void {
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
      } else if (input.wasPressed('confirm') || input.wasPressed('cancel')) {
        this.ctx.audio.play('cancel');
        this.openMembers('statusWho');
      }
      return;
    }
    const res = this.sub?.update(input);
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
      const titles: Partial<Record<FieldMode, string>> = { item: 'ITEMS', magic: 'MAGIC', equipSlot: 'EQUIP' };
      const title = this.mode === 'equipPick' ? SLOT_LABELS[this.slot] : titles[this.mode] ?? 'WHO?';
      this.sub.render(r, SUB_X, 8, SUB_W, true, title);
      const hint = this.subHint();
      if (hint) {
        drawHint(r, hint, SUB_X, 8 + this.sub.height() + 4, SUB_W);
      }
    }
    // Messages (e.g. spell results) cover the bottom of the screen, so lift the status above them.
    const statusY = this.ctx.stack.top === this ? SCREEN_H - 48 : FIELD_STATUS_Y_WITH_MESSAGE;
    drawPartyStatus(r, this.state.party.map(memberStatus), statusY);
  }

  /** Description of the highlighted item or spell. */
  private subHint(): string | undefined {
    const id = this.subIds[this.sub?.cursor ?? 0];
    if (this.mode === 'item') {
      return ITEMS.get(id)?.description;
    }
    if (this.mode === 'equipPick' && this.member) {
      const m = this.member;
      const change = statChangeText(memberStats(m), previewStats(m, this.slot, id === REMOVE ? undefined : id));
      const desc = id === REMOVE ? 'Take it off.' : WEAPONS.get(id)?.description ?? GEAR.get(id)?.description ?? '';
      return `${change || 'No change.'} ${desc}`;
    }
    return this.mode === 'magic' ? ABILITIES.get(id)?.description : undefined;
  }

  private openMembers(mode: FieldMode, effect?: 'healHp' | 'healMp' | 'revive'): void {
    this.mode = mode;
    this.sub = new ListMenu(
      this.state.party.map((m) => ({
        label: m.name.toUpperCase(),
        right: classDef(m.classId).name.toUpperCase(),
        enabled: effect === undefined || canRestore(m, effect),
      })),
      this.ctx.audio,
    );
  }

  private openItems(): void {
    this.subIds = [...ITEMS.values()].filter((i) => (this.state.inventory[i.id] ?? 0) > 0).map((i) => i.id);
    if (this.subIds.length === 0) {
      say(this.ctx.stack, this.ctx.audio, ['You are not carrying any items.']);
      return;
    }
    this.mode = 'item';
    this.sub = new ListMenu(
      this.subIds.map((id) => {
        const def = ITEMS.get(id);
        return {
          label: (def?.name ?? id).toUpperCase(),
          right: `x${this.state.inventory[id]}`,
          enabled: def?.usableInField !== false,
        };
      }),
      this.ctx.audio,
    );
  }

  /** Slots of one member with what they wear (shields grey out for classes that cannot use one). */
  private openSlots(m: PartyMember): void {
    this.member = m;
    this.mode = 'equipSlot';
    this.sub = new ListMenu(
      GEAR_SLOTS.map((slot) => ({
        label: SLOT_LABELS[slot],
        right: gearName(equippedId(m, slot)),
        enabled: slotUsable(m, slot),
      })),
      this.ctx.audio,
    );
  }

  /** Carried pieces for the slot, each with the stat change, plus REMOVE for non-weapons. */
  private openPick(m: PartyMember, slot: GearSlot): void {
    const choices = equipChoices(this.state, m, slot);
    if (slot !== 'weapon' && equippedId(m, slot)) {
      choices.push(REMOVE);
    }
    if (choices.length === 0) {
      say(this.ctx.stack, this.ctx.audio, ['Nothing in your bag fits that slot. Shops sell more gear.']);
      return;
    }
    this.slot = slot;
    this.subIds = choices;
    this.mode = 'equipPick';
    const before = memberStats(m);
    this.sub = new ListMenu(
      choices.map((id) => ({
        label: id === REMOVE ? 'REMOVE' : gearName(id),
        right: statDelta(before, previewStats(m, slot, id === REMOVE ? undefined : id)),
      })),
      this.ctx.audio,
    );
  }

  private equip(m: PartyMember, id: string): void {
    if (id === REMOVE) {
      const name = gearName(equippedId(m, this.slot)).toLowerCase();
      unequipSlot(this.state, m, this.slot);
      say(this.ctx.stack, this.ctx.audio, [`${m.name} takes off the ${name}.`]);
    } else if (equipItem(this.state, m, id) !== false) {
      this.ctx.audio.play('confirm');
      say(this.ctx.stack, this.ctx.audio, [`${m.name} equips the ${gearName(id).toLowerCase()}.`]);
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
        this.itemId = this.subIds[index];
        this.openMembers('itemWho', ITEMS.get(this.itemId)?.effect);
        return;
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
          this.equip(this.member, this.subIds[index]);
        }
        return;
      case 'magicWho':
        this.openSpells(this.state.party[index]);
        return;
      case 'magic':
        this.spellId = this.subIds[index];
        this.openMembers('magicWho2', ABILITIES.get(this.spellId)?.effect === 'revive' ? 'revive' : 'healHp');
        return;
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
    const msg = applyRestore(target, def.effect === 'revive' ? 'revive' : 'healHp', amount);
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
    r.draw(this.ctx.art.character(m.classId, 'down', 0), x + 8, 14, { scale: 2 });
    r.text(m.name.toUpperCase(), x + 44, 16, COLORS.gold);
    r.text(`${cls.name.toUpperCase()} L${m.level}`, x + 44, 28);
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
    GEAR_SLOTS.forEach((slot, i) => r.text(gearName(equippedId(m, slot)), col, 26 + i * 10));
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

/** True when a restore effect would do something for this member (used to grey out targets). */
export function canRestore(target: PartyMember, effect: 'healHp' | 'healMp' | 'revive'): boolean {
  const s = memberStats(target);
  if (effect === 'revive') {
    return target.hp <= 0;
  }
  if (target.hp <= 0) {
    return false;
  }
  return effect === 'healHp' ? target.hp < s.hp : target.mp < s.mp;
}

/** Applies a restore effect to a party member; returns a message or null if it does nothing. */
export function applyRestore(target: PartyMember, effect: 'healHp' | 'healMp' | 'revive', amount: number): string | null {
  const s = memberStats(target);
  if (effect === 'revive') {
    if (target.hp > 0) {
      return null;
    }
    target.hp = Math.max(1, Math.floor(s.hp * amount));
    return `${target.name} is revived!`;
  }
  if (target.hp <= 0) {
    return null;
  }
  if (effect === 'healHp') {
    const gained = cappedRestore(target.hp, s.hp, amount);
    if (gained <= 0) {
      return null;
    }
    target.hp += gained;
    return `${target.name} recovers ${gained} HP.`;
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

/**
 * Item shop, weapon shop and armorer. Gear goes into the bag, then the shop offers to equip it on a member who can
 * use it, trading in the piece it replaces for half its price (plan 15.4).
 */
export class ShopScene implements Scene {
  public readonly id = 'shop';
  public readonly overlay = true;
  private readonly state: GameState;
  private readonly menu: ListMenu;

  constructor(
    private readonly ctx: GameContext,
    private readonly kind: 'item' | 'weapon' | 'armor',
    private readonly stock: readonly string[],
  ) {
    this.state = requireState(ctx);
    this.menu = new ListMenu([], ctx.audio, 6);
    this.refresh();
  }

  public update(_dt: number, input: InputManager): void {
    const res = this.menu.update(input);
    if (res?.kind === 'cancel' || (res?.kind === 'select' && res.index === this.stock.length)) {
      this.ctx.stack.pop();
      say(this.ctx.stack, this.ctx.audio, ['Come again!']);
      return;
    }
    if (res?.kind === 'select') {
      this.buy(this.stock[res.index]);
    }
  }

  public render(r: Renderer): void {
    const title = this.kind === 'item' ? 'ITEM SHOP' : this.kind === 'weapon' ? 'WEAPONS' : 'ARMORER';
    this.menu.render(r, 8, 8, 200, true, title);
    r.window(SCREEN_W - 80, 8, 72, 20);
    r.textRight(`${this.state.gold}G`, SCREEN_W - 16, 14, COLORS.gold);
    const id = this.stock[this.menu.cursor];
    const y = SCREEN_H - 60;
    r.window(8, y - 8, SCREEN_W - 16, 56);
    if (!id) {
      r.text('THANK YOU!', 16, y);
      return;
    }
    if (this.kind === 'item') {
      const def = ITEMS.get(id);
      r.text((def?.description ?? '').toUpperCase().slice(0, SHOP_CHARS), 16, y);
      r.text(`YOU HAVE ${this.state.inventory[id] ?? 0}`, 16, y + 14, COLORS.dim);
      return;
    }
    const w = WEAPONS.get(id);
    const g = GEAR.get(id);
    const description = w?.description ?? g?.description ?? '';
    r.text(description.toUpperCase().slice(0, SHOP_CHARS), 16, y);
    const bonus = w
      ? [`ATK+${w.atk}`, w.mag ? `MAG+${w.mag}` : '', w.def ? `DEF+${w.def}` : ''].filter(Boolean).join(' ')
      : g
      ? `${gearBonusText(g)}  WORN BY: ${gearUsersText(g)}`
      : '';
    r.text(bonus.slice(0, SHOP_CHARS), 16, y + 12, COLORS.dim);
    const users = this.state.party.filter((m) => canEquip(m, id));
    r.text(
      users.length ? `FOR: ${users.map((m) => m.name.toUpperCase()).join(', ')}` : 'NO ONE IN YOUR PARTY CAN USE THIS',
      16,
      y + 26,
      users.length ? COLORS.text : COLORS.hpLow,
    );
  }

  private refresh(): void {
    const items: MenuItem[] = this.stock.map((id) => {
      const { name, price } = shopEntry(id);
      return { label: name.toUpperCase(), right: `${price}G`, enabled: price <= this.state.gold };
    });
    items.push({ label: 'LEAVE' });
    this.menu.setItems(items);
  }

  private buy(id: string): void {
    const { stack, audio } = this.ctx;
    const { name, price } = shopEntry(id);
    if (price > this.state.gold) {
      return;
    }
    if (this.kind === 'item') {
      this.state.gold -= price;
      addItem(this.state, id);
      audio.play('coin');
      this.refresh();
      return;
    }
    const slot = slotOf(id);
    const users = this.state.party.filter((m) => canEquip(m, id) && slot !== null && equippedId(m, slot) !== id);
    if (!slot || users.length === 0) {
      say(stack, audio, ['No one in your party can make use of that.']);
      return;
    }
    this.state.gold -= price;
    addItem(this.state, id);
    audio.play('coin');
    this.refresh();
    ask(stack, audio, [`Bought the ${name}. Equip it now?`], [...users.map((m) => m.name.toUpperCase()), 'LATER'], (i) => {
      const user = users[i];
      if (!user) {
        say(stack, audio, [`The ${name} is in your bag. Equip it from the menu (E).`]);
        return;
      }
      say(stack, audio, [`${user.name} equips the ${name}!${this.tradeIn(user, id)}`]);
    });
  }

  /** Equips a bought piece and sells the replaced one for half price; returns the trade-in note. */
  private tradeIn(user: PartyMember, id: string): string {
    const old = equipItem(this.state, user, id);
    if (!old) {
      return '';
    }
    const { name, price } = shopEntry(old);
    const value = Math.floor(price / 2);
    addItem(this.state, old, -1);
    if ((this.state.inventory[old] ?? 0) <= 0) {
      delete this.state.inventory[old];
    }
    this.state.gold += value;
    this.refresh();
    return value > 0 ? ` (Traded in the ${name} for ${value}G.)` : '';
  }
}