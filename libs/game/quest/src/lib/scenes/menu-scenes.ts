import { InputManager, Renderer, Scene, healAmount, totalXpForLevel, MAX_LEVEL } from '@jouster/game/engine';
import { ABILITIES } from '../data/abilities';
import { classDef } from '../data/classes';
import { ITEMS, WEAPONS } from '../data/equipment';
import { GameState, addItem } from '../state/game-state';
import { PartyMember, memberAbilities, memberStats, memberToCombatant, weaponDef } from '../state/party';
import { COLORS, ListMenu, MESSAGE_Y, MenuItem, SCREEN_H, SCREEN_W, drawHint, drawPartyStatus, say } from '../ui/widgets';
import { GameContext, memberStatus, requireState } from './context';
import { MapScene, questLog } from './map-scene';

type FieldMode = 'main' | 'statusWho' | 'status' | 'item' | 'itemWho' | 'magicWho' | 'magic' | 'magicWho2';

/** Party status row position while a message window is open over the menu. */
const FIELD_STATUS_Y_WITH_MESSAGE = MESSAGE_Y - 48;

/** Field menu (X / Esc): party status, items and healing magic outside battle. */
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
  private subIds: string[] = [];

  constructor(private readonly ctx: GameContext) {
    this.state = requireState(ctx);
    this.main = new ListMenu(
      ['STATUS', 'ITEM', 'MAGIC', 'QUESTS', 'MAP', 'CLOSE'].map((label) => ({ label })),
      ctx.audio,
    );
  }

  public update(_dt: number, input: InputManager): void {
    if (this.mode === 'main') {
      const res = this.main.update(input);
      if (res?.kind === 'cancel' || (res?.kind === 'select' && res.index === 5)) {
        this.ctx.stack.pop();
      } else if (res?.kind === 'select') {
        if (res.index === 0) {
          this.openMembers('statusWho');
        } else if (res.index === 1) {
          this.openItems();
        } else if (res.index === 2) {
          this.openMembers('magicWho');
        } else if (res.index === 3) {
          say(this.ctx.stack, this.ctx.audio, questLog(this.state));
        } else {
          this.ctx.stack.pop();
          this.ctx.stack.push(new MapScene(this.ctx));
        }
      }
      return;
    }
    if (this.mode === 'status') {
      if (input.wasPressed('confirm') || input.wasPressed('cancel')) {
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
    r.window(8, 96, 72, 20);
    r.text(`${this.state.gold}G`, 16, 102, COLORS.gold);
    if (this.mode === 'status' && this.member) {
      this.renderStatus(r, this.member);
      return;
    }
    if (this.sub) {
      const title = this.mode === 'item' ? 'ITEMS' : this.mode === 'magic' ? 'MAGIC' : 'WHO?';
      this.sub.render(r, 88, 8, 160, true, title);
      const hint = this.subHint();
      if (hint) {
        drawHint(r, hint, 88, 8 + this.sub.height() + 4, 160);
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
    return this.mode === 'magic' ? ABILITIES.get(id)?.description : undefined;
  }

  private openMembers(mode: FieldMode): void {
    this.mode = mode;
    this.sub = new ListMenu(
      this.state.party.map((m) => ({ label: m.name.toUpperCase(), right: classDef(m.classId).name.toUpperCase() })),
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

  private fieldSpells(m: PartyMember): string[] {
    return memberAbilities(m).filter((id) => {
      const def = ABILITIES.get(id);
      return def !== undefined && (def.effect === 'heal' || def.effect === 'revive');
    });
  }

  private back(): void {
    if (this.mode === 'itemWho') {
      this.openItems();
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
        this.openMembers('itemWho');
        return;
      case 'itemWho':
        this.useItem(this.state.party[index]);
        return;
      case 'magicWho':
        this.openSpells(this.state.party[index]);
        return;
      case 'magic':
        this.spellId = this.subIds[index];
        this.openMembers('magicWho2');
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
    r.window(x, 8, SCREEN_W - x - 8, 200);
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
    r.text('WEAPON', col, 16, COLORS.dim);
    r.text(weaponDef(m.weaponId).name.toUpperCase(), col, 26);
    r.text('ABILITIES', col, 44, COLORS.dim);
    memberAbilities(m)
      .slice(0, 10)
      .forEach((id, i) => {
        r.text((ABILITIES.get(id)?.name ?? id).toUpperCase(), col, 54 + i * 10);
      });
    if (cls.passive) {
      r.text(cls.passive.name.toUpperCase(), x + 10, 140, COLORS.mp);
    }
  }
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
    const gained = Math.min(s.hp - target.hp, amount);
    if (gained <= 0) {
      return null;
    }
    target.hp += gained;
    return `${target.name} recovers ${gained} HP.`;
  }
  const gained = Math.min(s.mp - target.mp, amount);
  if (gained <= 0) {
    return null;
  }
  target.mp += gained;
  return `${target.name} recovers ${gained} MP.`;
}

/** Item shop / weapon shop. Weapons are equipped on the party member whose class uses them. */
export class ShopScene implements Scene {
  public readonly id = 'shop';
  public readonly overlay = true;
  private readonly state: GameState;
  private readonly menu: ListMenu;

  constructor(
    private readonly ctx: GameContext,
    private readonly kind: 'item' | 'weapon',
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
    const title = this.kind === 'item' ? 'ITEM SHOP' : 'WEAPONS';
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
      r.text((def?.description ?? '').toUpperCase().slice(0, 58), 16, y);
      r.text(`YOU HAVE ${this.state.inventory[id] ?? 0}`, 16, y + 14, COLORS.dim);
      return;
    }
    const w = weaponDef(id);
    r.text(w.description.toUpperCase().slice(0, 58), 16, y);
    const bonus = [`ATK+${w.atk}`, w.mag ? `MAG+${w.mag}` : '', w.def ? `DEF+${w.def}` : ''].filter(Boolean).join(' ');
    r.text(bonus, 16, y + 12, COLORS.dim);
    const users = this.state.party.filter((m) => classDef(m.classId).weaponFamily === w.family);
    r.text(
      users.length ? `FOR: ${users.map((m) => m.name.toUpperCase()).join(', ')}` : 'NO ONE IN YOUR PARTY CAN USE THIS',
      16,
      y + 26,
      users.length ? COLORS.text : COLORS.hpLow,
    );
  }

  private refresh(): void {
    const items: MenuItem[] = this.stock.map((id) => {
      const name = this.kind === 'item' ? ITEMS.get(id)?.name : WEAPONS.get(id)?.name;
      const price = this.kind === 'item' ? ITEMS.get(id)?.price : WEAPONS.get(id)?.price;
      return { label: (name ?? id).toUpperCase(), right: `${price ?? 0}G`, enabled: (price ?? 0) <= this.state.gold };
    });
    items.push({ label: 'LEAVE' });
    this.menu.setItems(items);
  }

  private buy(id: string): void {
    const { stack, audio } = this.ctx;
    if (this.kind === 'item') {
      const def = ITEMS.get(id);
      if (!def || def.price > this.state.gold) {
        return;
      }
      this.state.gold -= def.price;
      addItem(this.state, id);
      audio.play('coin');
      this.refresh();
      return;
    }
    const w = weaponDef(id);
    const user = this.state.party.find((m) => classDef(m.classId).weaponFamily === w.family && m.weaponId !== id);
    if (!user) {
      say(stack, audio, ['No one in your party can make use of that.']);
      return;
    }
    const old = weaponDef(user.weaponId);
    const tradeIn = Math.floor(old.price / 2);
    this.state.gold -= w.price - tradeIn;
    user.weaponId = id;
    audio.play('coin');
    this.refresh();
    say(stack, audio, [
      `${user.name} equips the ${w.name}!${tradeIn > 0 ? ` (Traded in the ${old.name} for ${tradeIn}G.)` : ''}`,
    ]);
  }
}
