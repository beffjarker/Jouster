import {
  AbilityDef,
  Battle,
  BattleAction,
  BattleEvent,
  BattleOutcome,
  BattleSound,
  BattleFx,
  Combatant,
  Element,
  InputManager,
  PointerPoint,
  Renderer,
  Scene,
  SoundId,
  isAlive,
  wrapText,
} from '@jouster/game/engine';
import { fitScale, monsterVariant } from '../art/art';
import { ABILITIES } from '../data/abilities';
import { ITEMS } from '../data/equipment';
import { Backdrop } from '../data/maps';
import { BOSS_HP_SCALE, MINI_BOSS_IDS, MONSTERS } from '../data/monsters';
import { GameState, addItem } from '../state/game-state';
import { PartyMember, grantXp, memberToCombatant, monstersToCombatants, syncFromCombatants } from '../state/party';
import { COLORS, ListMenu, MenuItem, SCREEN_H, SCREEN_W, charsFit, drawCursor, drawHint, inRect } from '../ui/widgets';
import { GameContext, requireState } from './context';

export type BattleEnd = Exclude<BattleOutcome, 'ongoing'>;

export interface BattleOptions {
  monsterIds: string[];
  boss?: boolean;
  backdrop: Backdrop;
  /** Called once the result screen is dismissed; the caller handles scene changes. */
  onEnd(outcome: BattleEnd): void;
}

type Phase = 'intro' | 'command' | 'ability' | 'item' | 'target' | 'events' | 'end';
type PendingKind = 'attack' | 'ability' | 'item';

interface Vitals {
  hp: number;
  mp: number;
}

interface Point {
  x: number;
  y: number;
}

/** Where a combatant stands on the battlefield (top-left of its sprite) and its drawn size. */
interface Spot extends Point {
  size: number;
}

type MotionKind = 'lunge' | 'hop' | 'shake' | 'flee';

interface Motion {
  kind: MotionKind;
  t: number;
  dur: number;
  /** Lunge destination (sprite top-left) for `lunge`. */
  to?: Point;
}

interface Shot {
  from: Point;
  to: Point;
  t: number;
  dur: number;
  color: string;
  arrow: boolean;
}

interface Floater {
  text: string;
  color: string;
  x: number;
  y: number;
  t: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  dur: number;
  color: string;
}

const COMMANDS = ['ATTACK', 'ABILITY', 'ITEM', 'DEFEND', 'RUN'];
const EVENT_DELAY = 0.6;
const MAX_LOG_LINES = 5;
/** Holding confirm plays the round faster. */
const FAST_FORWARD = 2.5;

// Battlefield layout (party on the left facing right, enemies on the right).
// Everything derives from SCREEN_W/H: the panel hugs the bottom, the ground keeps its depth and the sky grows.
const SCREEN_H_PANEL = 72;
const PANEL_Y = SCREEN_H - SCREEN_H_PANEL;
const FIELD_H = PANEL_Y - 2;
const HORIZON_Y = FIELD_H - 80;
const STATUS_X = 4;
const STATUS_W = 164;
const RIGHT_X = STATUS_X + STATUS_W + 4;
const RIGHT_W = SCREEN_W - RIGHT_X - 4;
const LOG_CHARS = charsFit(RIGHT_W - 16);
const COMMAND_W = 74;
const PARTY_X = Math.round(SCREEN_W * 0.135);
const PARTY_Y = HORIZON_Y - 12;
const PARTY_STEP_X = 10;
const PARTY_STEP_Y = 30;
const PARTY_SCALE = 2;
const ACTIVE_STEP = 14;
const ENEMY_LEFT = Math.round(SCREEN_W * 0.51);
const ENEMY_RIGHT = SCREEN_W - 8;
const ENEMY_GROUND = FIELD_H - 4;
const ENEMY_BACK_GROUND = HORIZON_Y + 42;
const SPRITE_PX = 16;
const INTRO_SLIDE = 140;

/** Seconds until the next event plays after an event with this effect (animations keep running). */
const FX_DELAY: Readonly<Record<BattleFx['type'], number>> = {
  act: 0.32,
  hit: 0.5,
  miss: 0.45,
  ko: 0.45,
  heal: 0.5,
  buff: 0.45,
  revive: 0.5,
  run: 0.7,
};
const CAST_LEAD = 0.5;
const FLOAT_TIME = 0.8;
const DISSOLVE_TIME = 0.55;

const ELEMENT_COLORS: Readonly<Record<Element, string>> = {
  physical: '#e8e8e8',
  fire: '#ff7030',
  ice: '#90d8ff',
  lightning: '#ffe840',
  holy: '#fff4b0',
  dark: '#b060e0',
};
const HEAL_COLOR = '#70ff98';
const MP_COLOR = '#70b0ff';
const ARROW_COLOR = '#d8b070';
/** Ignore input briefly when the command menu reappears so text-skipping presses don't pick actions. */
const COMMAND_INPUT_GUARD = 0.35;
/** Result lines per page; the last row is reserved for the OK prompt. */
const END_PAGE_LINES = 4;
const END_INPUT_GUARD = 0.25;

const SOUND_FOR: ReadonlyMap<BattleSound, SoundId> = new Map<BattleSound, SoundId>([
  ['hit', 'hit'],
  ['crit', 'crit'],
  ['miss', 'miss'],
  ['heal', 'heal'],
  ['spell', 'magic'],
  ['ko', 'hit'],
  ['run', 'cancel'],
  ['buff', 'magic'],
]);

/** Sky top, sky bottom, far ground, near ground, scenery. */
const BACKDROP_COLORS: ReadonlyMap<Backdrop, [string, string, string, string, string]> = new Map([
  ['field', ['#2c5cb0', '#78b0e8', '#4a9a3a', '#3a8a30', '#2e6e28']],
  ['forest', ['#1e3e70', '#4a7aa8', '#2a6a2a', '#1f5a22', '#123a16']],
  ['hills', ['#3a64a0', '#90b8d8', '#8a7a48', '#7a6a3a', '#5a4e2c']],
  ['cave', ['#0a080e', '#1e1822', '#463830', '#3a2e28', '#241c1c']],
] as Array<[Backdrop, [string, string, string, string, string]]>);

/** Turn-based battle screen driving the engine's `Battle` state machine. */
export class BattleScene implements Scene {
  public readonly id = 'battle';
  private readonly state: GameState;
  private readonly members: PartyMember[];
  private readonly battle: Battle;
  private readonly shown = new Map<string, Vitals>();
  private readonly flash = new Map<string, number>();
  private phase: Phase = 'intro';
  private log: string[] = [];
  private queue: BattleEvent[] = [];
  private timer = 0;
  private time = 0;
  private inputGuard = 0;
  private actorIndex = 0;
  private actions: BattleAction[] = [];
  private readonly commandMenu: ListMenu;
  private subMenu: ListMenu | null = null;
  private subIds: string[] = [];
  private pendingKind: PendingKind = 'attack';
  private pendingId = '';
  private targets: Combatant[] = [];
  private targetCursor = 0;
  private targetRestore: 'hp' | 'mp' | undefined;
  private endLines: string[] = [];
  private outcomeSound: SoundId | null = null;
  private speed = 1;
  private readonly spots = new Map<string, Spot>();
  private readonly motions = new Map<string, Motion>();
  private readonly dying = new Map<string, number>();
  private readonly gone = new Set<string>();
  /** Cosmetic look variant per enemy (e.g. slime colour). */
  private readonly looks = new Map<string, number>();
  private shots: Shot[] = [];
  private floaters: Floater[] = [];
  private sparks: Spark[] = [];

  constructor(
    private readonly ctx: GameContext,
    private readonly options: BattleOptions,
  ) {
    this.state = requireState(ctx);
    this.members = this.state.party;
    const defs = options.monsterIds.map((id) => {
      const def = MONSTERS.get(id);
      if (!def) {
        throw new Error(`Unknown monster: ${id}`);
      }
      return def;
    });
    const hpScale = options.boss ? BOSS_HP_SCALE[Math.min(BOSS_HP_SCALE.length, this.members.length) - 1] : 1;
    this.battle = new Battle(this.members.map(memberToCombatant), monstersToCombatants(defs, hpScale), {
      abilities: ABILITIES,
      items: ITEMS,
      inventory: this.state.inventory,
      rng: ctx.rng,
      canRun: !options.boss,
    });
    this.battle.all.forEach((c) => this.shown.set(c.id, { hp: c.hp, mp: c.mp }));
    this.battle.enemies.forEach((e, i) => {
      const spriteId = MONSTERS.get(e.sourceId)?.spriteId ?? e.sourceId;
      this.looks.set(e.id, monsterVariant(spriteId, this.state.steps * 31 + i * 7919));
    });
    this.layout();
    this.commandMenu = new ListMenu(
      COMMANDS.map((label) => ({ label, enabled: label !== 'RUN' || !options.boss })),
      ctx.audio,
    );
    const names = this.battle.enemies.map((e) => e.name);
    this.log = options.boss
      ? [`${names[0]} blocks the way!`]
      : names.length === 1
        ? [`A ${names[0]} appears!`]
        : [`${names.length} monsters appear!`];
  }

  public enter(): void {
    this.ctx.audio.play('encounter');
  }

  public update(dt: number, input: InputManager): void {
    this.time += dt;
    const held = input.isDown('confirm') || input.pointer?.down === true;
    this.speed = this.phase === 'events' && held ? FAST_FORWARD : 1;
    this.animate(dt * this.speed);
    if (this.inputGuard > 0) {
      this.inputGuard = Math.max(0, this.inputGuard - dt);
      if (this.phase === 'command') {
        return;
      }
    }
    switch (this.phase) {
      case 'intro':
        this.timer += dt;
        if (this.timer > 1.2 || input.wasPressed('confirm') || input.tap) {
          this.startCommands();
        }
        return;
      case 'command':
        this.updateCommand(input);
        return;
      case 'ability':
      case 'item':
        this.updateSubMenu(input);
        return;
      case 'target':
        this.updateTarget(input);
        return;
      case 'events':
        this.updateEvents(dt, input);
        return;
      case 'end':
        this.updateEnd(dt, input);
        return;
    }
  }

  public render(r: Renderer): void {
    r.clear('#000000');
    this.renderField(r);
    this.renderStatus(r);
    this.renderPanel(r);
  }

  // --- Command input -------------------------------------------------------------------------

  private get actor(): Combatant {
    return this.battle.party[this.actorIndex];
  }

  private startCommands(): void {
    this.actions = [];
    this.actorIndex = this.battle.party.findIndex(isAlive);
    this.commandMenu.cursor = 0;
    this.inputGuard = COMMAND_INPUT_GUARD;
    this.phase = 'command';
  }

  private updateCommand(input: InputManager): void {
    const res = this.commandMenu.update(input);
    if (res?.kind === 'cancel') {
      this.previousActor();
      return;
    }
    if (res?.kind !== 'select') {
      return;
    }
    const actor = this.actor;
    switch (COMMANDS[res.index]) {
      case 'ATTACK':
        this.pendingKind = 'attack';
        this.beginTarget(this.battle.enemies.filter(isAlive));
        return;
      case 'ABILITY':
        this.openAbilities(actor);
        return;
      case 'ITEM':
        this.openItems();
        return;
      case 'DEFEND':
        this.pushAction({ kind: 'defend', actorId: actor.id });
        return;
      case 'RUN':
        this.actions = [{ kind: 'run', actorId: actor.id }];
        this.executeRound();
        return;
    }
  }

  private openAbilities(actor: Combatant): void {
    this.subIds = [...actor.abilityIds];
    if (this.subIds.length === 0) {
      this.ctx.audio.play('cancel');
      return;
    }
    const items: MenuItem[] = this.subIds.map((id) => {
      const def = this.battle.ability(id);
      const cd = actor.cooldowns[id] ?? 0;
      return {
        label: def.name.toUpperCase(),
        right: cd > 0 ? `WAIT${cd - 1 > 0 ? cd - 1 : ''}` : def.mpCost > 0 ? `${def.mpCost}MP` : '',
        enabled: this.battle.canUseAbility(actor, id),
      };
    });
    this.subMenu = new ListMenu(items, this.ctx.audio, 5);
    this.phase = 'ability';
  }

  private reservedItems(itemId: string): number {
    return this.actions.filter((a) => a.kind === 'item' && a.itemId === itemId).length;
  }

  private openItems(): void {
    const anyDead = this.battle.party.some((c) => !isAlive(c));
    this.subIds = [...ITEMS.values()]
      .filter((i) => i.usableInBattle && (this.state.inventory[i.id] ?? 0) - this.reservedItems(i.id) > 0)
      .map((i) => i.id);
    if (this.subIds.length === 0) {
      this.ctx.audio.play('cancel');
      this.log = ['You have no usable items.'];
      return;
    }
    const items = this.subIds.map((id) => {
      const def = ITEMS.get(id);
      return {
        label: (def?.name ?? id).toUpperCase(),
        right: `x${(this.state.inventory[id] ?? 0) - this.reservedItems(id)}`,
        enabled: def?.effect !== 'revive' || anyDead,
      };
    });
    this.subMenu = new ListMenu(items, this.ctx.audio, 5);
    this.phase = 'item';
  }

  private updateSubMenu(input: InputManager): void {
    const res = this.subMenu?.update(input);
    if (res?.kind === 'cancel') {
      this.phase = 'command';
      return;
    }
    if (res?.kind !== 'select') {
      return;
    }
    const id = this.subIds[res.index];
    this.pendingId = id;
    if (this.phase === 'ability') {
      this.pendingKind = 'ability';
      const def: AbilityDef = this.battle.ability(id);
      if (def.target === 'self' || def.target === 'allEnemies') {
        this.pushAction({ kind: 'ability', actorId: this.actor.id, abilityId: id });
      } else {
        this.beginTarget(this.battle.targetsFor(this.actor, def.target), def.effect === 'heal' ? 'hp' : undefined);
      }
      return;
    }
    this.pendingKind = 'item';
    const item = ITEMS.get(id);
    const revive = item?.effect === 'revive';
    const restore = item?.effect === 'healHp' ? 'hp' : item?.effect === 'healMp' ? 'mp' : undefined;
    this.beginTarget(
      this.battle.party.filter((c) => (revive ? !isAlive(c) : isAlive(c))),
      restore,
    );
  }

  /** True when a heal of this kind would do nothing for the target (full HP or MP). */
  private isFull(c: Combatant, restore: 'hp' | 'mp' | undefined): boolean {
    if (restore === 'hp') {
      return c.hp >= c.maxHp;
    }
    return restore === 'mp' ? c.mp >= c.maxMp : false;
  }

  private beginTarget(targets: Combatant[], restore?: 'hp' | 'mp'): void {
    if (targets.length === 0) {
      this.ctx.audio.play('cancel');
      return;
    }
    this.targetRestore = restore;
    if (targets.every((c) => this.isFull(c, restore))) {
      this.ctx.audio.play('cancel');
      this.log = [restore === 'mp' ? 'Everyone has full MP.' : 'Everyone has full HP.'];
      return;
    }
    this.targets = targets;
    this.targetCursor = Math.max(0, targets.findIndex((c) => !this.isFull(c, restore)));
    this.phase = 'target';
  }

  /**
   * Combatant under a logical point among the current targets: enemy and ally sprites on the field, or a
   * party member's row in the status window.
   */
  private targetAt(p: PointerPoint | null): number {
    if (!p) {
      return -1;
    }
    return this.targets.findIndex((c) => {
      const spot = this.spots.get(c.id);
      if (spot) {
        const at = this.pose(c);
        if (inRect(p, at.x, at.y, spot.size, spot.size)) {
          return true;
        }
      }
      const row = c.side === 'party' ? this.battle.party.indexOf(c) : -1;
      return row >= 0 && inRect(p, STATUS_X, PANEL_Y + 4 + row * 21, STATUS_W, 21);
    });
  }

  private updateTarget(input: InputManager): void {
    const n = this.targets.length;
    const tapped = this.targetAt(input.tap);
    const hovered = input.pointerMovedThisFrame && !input.tap ? this.targetAt(input.pointer) : -1;
    if (tapped >= 0) {
      this.targetCursor = tapped;
    } else if (hovered >= 0 && hovered !== this.targetCursor) {
      this.targetCursor = hovered;
      this.ctx.audio.play('cursor');
      return;
    }
    if (tapped < 0 && (input.wasPressed('right') || input.wasPressed('down'))) {
      this.targetCursor = (this.targetCursor + 1) % n;
      this.ctx.audio.play('cursor');
    } else if (input.wasPressed('left') || input.wasPressed('up')) {
      this.targetCursor = (this.targetCursor - 1 + n) % n;
      this.ctx.audio.play('cursor');
    } else if (tapped >= 0 || input.wasPressed('confirm')) {
      const target = this.targets[this.targetCursor];
      if (this.isFull(target, this.targetRestore)) {
        this.ctx.audio.play('cancel');
        return;
      }
      this.ctx.audio.play('confirm');
      this.confirmTarget(target);
    } else if (input.wasPressed('cancel')) {
      this.ctx.audio.play('cancel');
      this.phase = this.pendingKind === 'attack' ? 'command' : this.pendingKind;
    }
  }

  private confirmTarget(target: Combatant): void {
    const actorId = this.actor.id;
    if (this.pendingKind === 'attack') {
      this.pushAction({ kind: 'attack', actorId, targetId: target.id });
    } else if (this.pendingKind === 'ability') {
      this.pushAction({ kind: 'ability', actorId, abilityId: this.pendingId, targetId: target.id });
    } else {
      this.pushAction({ kind: 'item', actorId, itemId: this.pendingId, targetId: target.id });
    }
  }

  private pushAction(action: BattleAction): void {
    this.actions.push(action);
    this.subMenu = null;
    const next = this.battle.party.findIndex((c, i) => i > this.actorIndex && isAlive(c));
    if (next < 0) {
      this.executeRound();
      return;
    }
    this.actorIndex = next;
    this.commandMenu.cursor = 0;
    this.phase = 'command';
  }

  private previousActor(): void {
    for (let i = this.actorIndex - 1; i >= 0; i--) {
      if (isAlive(this.battle.party[i])) {
        this.actorIndex = i;
        this.actions.pop();
        this.phase = 'command';
        return;
      }
    }
  }

  // --- Round playback ------------------------------------------------------------------------

  private executeRound(): void {
    this.queue = this.battle.resolveRound(this.actions);
    this.log = [];
    this.timer = 0;
    this.phase = 'events';
  }

  private updateEvents(dt: number, input: InputManager): void {
    this.timer -= dt * this.speed;
    if (input.wasPressed('confirm') || input.tap) {
      this.timer = Math.min(this.timer, 0.05);
    }
    while (this.timer <= 0 && this.queue.length > 0) {
      const ev = this.queue.shift() as BattleEvent;
      this.applyEvent(ev);
      this.timer = ev.fx ? this.fxDelay(ev.fx) : ev.text ? EVENT_DELAY : 0;
    }
    if (this.timer <= 0 && this.queue.length === 0) {
      if (this.battle.outcome === 'ongoing') {
        this.startCommands();
      } else {
        this.finish();
      }
    }
  }

  private fxDelay(fx: BattleFx): number {
    if (fx.type === 'act' && fx.act !== 'attack' && fx.act !== 'defend') {
      return CAST_LEAD;
    }
    return FX_DELAY[fx.type];
  }

  private applyEvent(ev: BattleEvent): void {
    ev.updates.forEach((u) => {
      const before = this.shown.get(u.id);
      if (before && u.hp < before.hp) {
        this.flash.set(u.id, 0.35);
      }
      this.shown.set(u.id, { hp: u.hp, mp: u.mp });
      const c = this.combatant(u.id);
      if (c?.side === 'enemy' && u.hp <= 0 && !this.dying.has(u.id) && !this.gone.has(u.id)) {
        this.dying.set(u.id, DISSOLVE_TIME);
      }
    });
    if (ev.fx) {
      this.playFx(ev.fx);
    }
    if (ev.text) {
      this.addLog(ev.text);
    }
    if (ev.sound) {
      this.ctx.audio.play(SOUND_FOR.get(ev.sound) ?? 'hit');
    }
  }

  private addLog(text: string): void {
    wrapText(text, LOG_CHARS).forEach((line) => this.log.push(line));
    while (this.log.length > MAX_LOG_LINES) {
      this.log.shift();
    }
  }

  // --- Animation -----------------------------------------------------------------------------

  private combatant(id: string): Combatant | undefined {
    return this.battle.all.find((c) => c.id === id);
  }

  /** Assigns every combatant a home spot: party in a diagonal file on the left, enemies in rows on the right. */
  private layout(): void {
    this.battle.party.forEach((c, i) => {
      this.spots.set(c.id, {
        x: PARTY_X + i * PARTY_STEP_X,
        y: PARTY_Y + i * PARTY_STEP_Y,
        size: SPRITE_PX * PARTY_SCALE,
      });
    });
    const enemies = this.battle.enemies;
    const sizes = enemies.map((e) => SPRITE_PX * this.enemyScale(e));
    const rows = enemies.length >= 4 ? [enemies.slice(0, Math.ceil(enemies.length / 2)), enemies.slice(Math.ceil(enemies.length / 2))] : [enemies];
    rows.forEach((row, r) => {
      const back = rows.length > 1 && r === 0;
      const ground = back ? ENEMY_BACK_GROUND : ENEMY_GROUND;
      const left = ENEMY_LEFT + (back ? 20 : 0);
      const widths = row.map((e) => sizes[enemies.indexOf(e)]);
      const gap = 10;
      const total = widths.reduce((a, b) => a + b, 0) + gap * (row.length - 1);
      let x = Math.round(left + (ENEMY_RIGHT - left - total) / 2);
      row.forEach((e, i) => {
        const size = widths[i];
        const stagger = rows.length === 1 && row.length > 1 && i % 2 === 1 ? -10 : 0;
        this.spots.set(e.id, { x, y: ground - size + stagger, size });
        x += size + gap;
      });
    });
  }

  private enemyScale(e: Combatant): number {
    const def = MONSTERS.get(e.sourceId);
    if (!def?.boss) {
      return 2;
    }
    return MINI_BOSS_IDS.includes(def.id) ? 3 : 4;
  }

  private center(id: string): Point {
    const s = this.spots.get(id) ?? { x: SCREEN_W / 2, y: FIELD_H / 2, size: 0 };
    return { x: s.x + s.size / 2, y: s.y + s.size / 2 };
  }

  /** Current sprite top-left including motion offsets. */
  private pose(c: Combatant): Point {
    const home = this.spots.get(c.id) ?? { x: 0, y: 0, size: 0 };
    let x = home.x;
    let y = home.y;
    if (c.side === 'party' && this.isActing(c)) {
      x += ACTIVE_STEP;
    }
    if (this.phase === 'intro') {
      const ease = Math.min(1, this.timer / 0.6);
      const off = (1 - ease) * (1 - ease) * INTRO_SLIDE;
      x += c.side === 'party' ? -off : off;
    }
    if (this.phase === 'end' && this.battle.outcome === 'victory' && c.side === 'party' && c.hp > 0) {
      y -= Math.floor(this.time * 4) % 2 === 0 ? 2 : 0;
    }
    const m = this.motions.get(c.id);
    if (m) {
      const p = Math.min(1, m.t / m.dur);
      const bump = Math.sin(p * Math.PI);
      switch (m.kind) {
        case 'lunge':
          if (m.to) {
            x += (m.to.x - home.x) * bump;
            y += (m.to.y - home.y) * bump;
          }
          break;
        case 'hop':
          y -= bump * 6;
          break;
        case 'shake':
          x += Math.sin(m.t * 70) * 3 * (1 - p);
          break;
        case 'flee':
          x -= p * p * 160;
          break;
      }
    }
    return { x, y };
  }

  private isActing(c: Combatant): boolean {
    const choosing = this.phase === 'command' || this.phase === 'ability' || this.phase === 'item' || this.phase === 'target';
    return choosing && this.battle.party[this.actorIndex] === c;
  }

  private playFx(fx: BattleFx): void {
    switch (fx.type) {
      case 'act':
        this.playAct(fx);
        return;
      case 'hit': {
        this.motions.set(fx.targetId, { kind: 'shake', t: 0, dur: 0.35 });
        const color = fx.crit ? COLORS.gold : fx.element && fx.element !== 'physical' ? ELEMENT_COLORS[fx.element] : '#ffffff';
        this.float(fx.targetId, `${fx.amount}${fx.crit ? '!' : ''}`, color);
        this.burst(fx.targetId, fx.element && fx.element !== 'physical' ? ELEMENT_COLORS[fx.element] : '#fff0d0', 5);
        return;
      }
      case 'miss':
        this.float(fx.targetId, 'MISS', COLORS.dim);
        return;
      case 'ko':
        return;
      case 'heal':
        this.float(fx.targetId, `+${fx.amount}`, fx.mp ? MP_COLOR : HEAL_COLOR);
        this.sparkle(fx.targetId, fx.mp ? MP_COLOR : HEAL_COLOR);
        return;
      case 'buff':
        this.sparkle(fx.targetId, COLORS.gold);
        return;
      case 'revive':
        this.float(fx.targetId, 'UP', HEAL_COLOR);
        this.sparkle(fx.targetId, '#ffffff');
        return;
      case 'run':
        if (fx.success) {
          this.battle.party.forEach((c) => this.motions.set(c.id, { kind: 'flee', t: 0, dur: 0.8 }));
        } else {
          this.battle.party.forEach((c) => this.motions.set(c.id, { kind: 'hop', t: 0, dur: 0.3 }));
        }
        return;
    }
  }

  private playAct(fx: Extract<BattleFx, { type: 'act' }>): void {
    const actor = this.combatant(fx.actorId);
    if (!actor) {
      return;
    }
    const ranged = actor.side === 'party' && actor.sourceId === 'ranger';
    if (fx.act === 'attack' && fx.targetId && !ranged) {
      const home = this.spots.get(actor.id);
      const target = this.spots.get(fx.targetId);
      if (home && target) {
        const dir = actor.side === 'party' ? 1 : -1;
        // Step to just in front of the target.
        const to = {
          x: dir > 0 ? target.x - home.size * 0.6 : target.x + target.size - home.size * 0.4,
          y: target.y + target.size - home.size,
        };
        this.motions.set(actor.id, { kind: 'lunge', t: 0, dur: 0.6, to: this.lerpPoint(home, to, 0.85) });
      }
      return;
    }
    this.motions.set(actor.id, { kind: 'hop', t: 0, dur: 0.35 });
    if (fx.act === 'defend') {
      this.sparkle(actor.id, '#c0c8d8');
      return;
    }
    if (fx.act === 'item' || !fx.targetId || fx.targetId === actor.id) {
      return;
    }
    const color = ranged && fx.act === 'attack' ? ARROW_COLOR : this.actColor(fx);
    const targets = fx.allTargets
      ? (actor.side === 'party' ? this.battle.enemies : this.battle.party).filter(isAlive).map((c) => c.id)
      : [fx.targetId];
    const from = this.center(actor.id);
    targets.forEach((id) =>
      this.shots.push({ from, to: this.center(id), t: 0, dur: CAST_LEAD, color, arrow: ranged && fx.act === 'attack' }),
    );
  }

  private actColor(fx: Extract<BattleFx, { type: 'act' }>): string {
    if (fx.effect === 'heal' || fx.effect === 'revive') {
      return HEAL_COLOR;
    }
    if (fx.effect === 'buff') {
      return COLORS.gold;
    }
    return ELEMENT_COLORS[fx.element ?? 'physical'];
  }

  private lerpPoint(a: Point, b: Point, t: number): Point {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  private float(id: string, text: string, color: string): void {
    const c = this.center(id);
    const stack = this.floaters.filter((f) => f.t < 0.3 && Math.abs(f.x - c.x) < 8).length;
    this.floaters.push({ text, color, x: c.x, y: c.y - 8 - stack * 9, t: 0 });
  }

  private sparkle(id: string, color: string): void {
    const s = this.spots.get(id);
    if (!s) {
      return;
    }
    for (let i = 0; i < 10; i++) {
      this.sparks.push({
        x: s.x + this.ctx.rng.next() * s.size,
        y: s.y + s.size * (0.5 + this.ctx.rng.next() * 0.5),
        vx: 0,
        vy: -20 - this.ctx.rng.next() * 25,
        t: -i * 0.04,
        dur: 0.6,
        color,
      });
    }
  }

  private burst(id: string, color: string, n: number): void {
    const c = this.center(id);
    for (let i = 0; i < n; i++) {
      const a = this.ctx.rng.next() * Math.PI * 2;
      const v = 40 + this.ctx.rng.next() * 40;
      this.sparks.push({ x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, dur: 0.3, color });
    }
  }

  private animate(dt: number): void {
    this.flash.forEach((t, id) => (t - dt <= 0 ? this.flash.delete(id) : this.flash.set(id, t - dt)));
    this.motions.forEach((m, id) => {
      m.t += dt;
      if (m.t >= m.dur && m.kind !== 'flee') {
        this.motions.delete(id);
      }
    });
    this.dying.forEach((t, id) => {
      if (t - dt <= 0) {
        this.dying.delete(id);
        this.gone.add(id);
      } else {
        this.dying.set(id, t - dt);
      }
    });
    this.shots = this.shots.filter((s) => (s.t += dt) < s.dur);
    this.floaters = this.floaters.filter((f) => (f.t += dt) < FLOAT_TIME);
    this.sparks = this.sparks.filter((s) => {
      s.t += dt;
      if (s.t > 0) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
      }
      return s.t < s.dur;
    });
  }

  private finish(): void {
    syncFromCombatants(this.members, this.battle.party);
    this.state.stepsSinceBattle = 0;
    const outcome = this.battle.outcome;
    const lines: string[] = [];
    if (outcome === 'victory') {
      this.outcomeSound = 'victory';
      const rewards = this.battle.rewards();
      const survivors = this.members.filter((m) => m.hp > 0);
      const share = Math.ceil(rewards.xp / Math.max(1, survivors.length));
      this.state.gold += rewards.gold;
      const goldText = rewards.gold > 0 ? `Found ${rewards.gold} gold.` : 'No gold found.';
      lines.push('Victory!', `Each survivor gains ${share} XP. ${goldText}`);
      rewards.items.forEach((id) => {
        addItem(this.state, id);
        lines.push(`Found a ${ITEMS.get(id)?.name ?? id}!`);
      });
      survivors.forEach((m) => {
        const up = grantXp(m, share);
        if (up) {
          this.outcomeSound = 'levelUp';
          lines.push(`${up.name} is now level ${up.level}!`);
          up.learned.forEach((a) => lines.push(`${up.name} learned ${ABILITIES.get(a)?.name ?? a}!`));
        }
      });
    } else if (outcome === 'defeat') {
      this.outcomeSound = 'defeat';
      lines.push('The party has fallen...');
    } else {
      const loot = this.battle.stolenLoot();
      this.state.gold += loot.gold;
      loot.items.forEach((id) => addItem(this.state, id));
    }
    this.endLines = lines.flatMap((line) => wrapText(line, LOG_CHARS));
    if (this.endLines.length > 0) {
      this.log = [];
    }
    this.timer = 0;
    this.phase = 'end';
    if (this.outcomeSound) {
      this.ctx.audio.play(this.outcomeSound === 'levelUp' ? 'victory' : this.outcomeSound);
    }
  }

  /** True while the result screen is waiting for the player to press OK (next page or close). */
  private get awaitingOk(): boolean {
    return this.phase === 'end' && (this.endLines.length === 0 || this.log.length >= END_PAGE_LINES);
  }

  /**
   * Reveals result lines a page at a time, then waits for Enter/Esc before leaving the battle.
   * Never closes on its own so the player can read the results.
   */
  private updateEnd(dt: number, input: InputManager): void {
    this.timer -= dt;
    const pressed = input.wasPressed('confirm') || input.wasPressed('cancel') || input.tap !== null;
    if (this.awaitingOk) {
      if (!pressed || this.timer > -END_INPUT_GUARD) {
        return;
      }
      this.ctx.audio.play('confirm');
      if (this.endLines.length === 0) {
        this.phase = 'events';
        this.timer = Number.POSITIVE_INFINITY;
        this.options.onEnd(this.battle.outcome as BattleEnd);
        return;
      }
      this.log = [];
      this.timer = 0;
    }
    if (pressed) {
      this.timer = Math.min(this.timer, 0);
    }
    if (this.timer <= 0) {
      const line = this.endLines.shift() as string;
      if (line.includes('level')) {
        this.ctx.audio.play('levelUp');
      }
      this.log.push(line);
      this.timer = this.endLines.length > 0 && this.log.length < END_PAGE_LINES ? EVENT_DELAY : 0;
    }
  }

  // --- Rendering -----------------------------------------------------------------------------

  private renderField(r: Renderer): void {
    const [skyTop, skyLow, far, near, scenery] = BACKDROP_COLORS.get(this.options.backdrop) ?? [
      '#000000',
      '#111111',
      '#222222',
      '#222222',
      '#333333',
    ];
    const bands = 6;
    for (let i = 0; i < bands; i++) {
      r.fillRect(0, (i * HORIZON_Y) / bands, SCREEN_W, HORIZON_Y / bands + 1, i < bands / 2 ? skyTop : skyLow);
    }
    this.renderScenery(r, scenery);
    r.fillRect(0, HORIZON_Y, SCREEN_W, 14, far);
    r.fillRect(0, HORIZON_Y + 14, SCREEN_W, FIELD_H - HORIZON_Y - 14, near);
    for (let i = 0; i < Math.round(SCREEN_W / 16); i++) {
      // Deterministic ground speckles for texture.
      const gx = (i * 97) % SCREEN_W;
      const gy = HORIZON_Y + 18 + ((i * 53) % (FIELD_H - HORIZON_Y - 22));
      r.fillRect(gx, gy, 3, 1, scenery);
    }
    r.fillRect(0, FIELD_H, SCREEN_W, 2, '#000000');

    const drawList: Array<{ y: number; draw(): void }> = [];
    this.battle.party.forEach((c) => {
      const spot = this.spots.get(c.id);
      if (spot) {
        drawList.push({ y: spot.y + spot.size, draw: () => this.drawMember(r, c, spot) });
      }
    });
    this.battle.enemies.forEach((e) => {
      const spot = this.spots.get(e.id);
      if (spot && !this.gone.has(e.id)) {
        drawList.push({ y: spot.y + spot.size, draw: () => this.drawEnemy(r, e, spot) });
      }
    });
    drawList.sort((a, b) => a.y - b.y).forEach((d) => d.draw());
    this.renderEffects(r);
    this.renderTargetCursor(r);
  }

  private renderScenery(r: Renderer, color: string): void {
    switch (this.options.backdrop) {
      case 'forest':
        for (let x = -8; x < SCREEN_W; x += 22) {
          const h = 18 + ((x * 7) % 11);
          for (let row = 0; row < h; row += 2) {
            const w = Math.round((row / h) * 14) + 2;
            r.fillRect(x + 11 - w / 2, HORIZON_Y - h + row, w, 2, color);
          }
        }
        return;
      case 'hills':
        for (let x = 0; x < SCREEN_W; x += 2) {
          const h = 14 + Math.round(Math.sin(x / 34) * 8 + Math.sin(x / 13) * 3);
          r.fillRect(x, HORIZON_Y - h, 2, h, color);
        }
        return;
      case 'cave':
        for (let x = 4; x < SCREEN_W; x += 18) {
          const h = 8 + ((x * 13) % 17);
          for (let row = 0; row < h; row += 2) {
            const w = Math.max(1, Math.round((1 - row / h) * 8));
            r.fillRect(x + 4 - w / 2, row, w, 2, color);
          }
        }
        return;
      default:
        for (let x = 0; x < SCREEN_W; x += 2) {
          const h = 4 + Math.round(Math.sin(x / 50) * 3 + 3);
          r.fillRect(x, HORIZON_Y - h, 2, h, color);
        }
    }
  }

  private shadow(r: Renderer, x: number, y: number, size: number): void {
    r.fillRect(x + size * 0.15, y + size - 2, size * 0.7, 3, 'rgba(0,0,0,0.3)');
  }

  private drawMember(r: Renderer, c: Combatant, spot: Spot): void {
    const p = this.pose(c);
    const v = this.shown.get(c.id);
    const down = (v?.hp ?? c.hp) <= 0;
    this.shadow(r, spot.x, spot.y, spot.size);
    const fleeing = this.motions.get(c.id)?.kind === 'flee';
    const walking = this.motions.has(c.id) || this.phase === 'intro' || this.isActing(c);
    const frame = walking ? Math.floor(this.time * 6) % 2 : 0;
    const sprite = this.ctx.art.character(c.sourceId, fleeing ? 'left' : 'right', frame);
    const scale = fitScale(sprite, spot.size);
    const flashing = this.flash.has(c.id) && Math.floor(this.time * 20) % 2 === 0;
    if (down) {
      r.draw(sprite, p.x, p.y + 6, { scale, alpha: 0.35 });
      return;
    }
    r.draw(sprite, p.x, p.y, { scale, alpha: flashing ? 0.4 : 1 });
  }

  private drawEnemy(r: Renderer, e: Combatant, spot: Spot): void {
    const def = MONSTERS.get(e.sourceId);
    if (!def) {
      return;
    }
    const p = this.pose(e);
    const dying = this.dying.get(e.id);
    const flashing = this.flash.has(e.id) && Math.floor(this.time * 20) % 2 === 0;
    const bob = dying === undefined && this.motions.get(e.id) === undefined ? Math.floor(this.time * 2 + spot.x) % 2 : 0;
    let alpha = flashing ? 0.35 : 1;
    if (dying !== undefined) {
      alpha = Math.max(0, dying / DISSOLVE_TIME);
    } else {
      this.shadow(r, spot.x, spot.y, spot.size);
    }
    const sprite = this.ctx.art.monster(def.spriteId, this.looks.get(e.id));
    r.draw(sprite, p.x, p.y - bob, { scale: fitScale(sprite, spot.size), alpha });
    if (dying !== undefined) {
      // Dissolve: drifting embers as the sprite fades out.
      const k = 1 - dying / DISSOLVE_TIME;
      for (let i = 0; i < 6; i++) {
        const sx = spot.x + ((i * 37) % spot.size);
        const sy = spot.y + spot.size * (1 - k) - ((i * 11) % 10);
        r.fillRect(sx, sy, 2, 2, i % 2 === 0 ? '#c03030' : '#ffffff');
      }
    }
  }

  private renderEffects(r: Renderer): void {
    this.shots.forEach((s) => {
      const p = Math.min(1, s.t / s.dur);
      const x = s.from.x + (s.to.x - s.from.x) * p;
      const y = s.from.y + (s.to.y - s.from.y) * p - Math.sin(p * Math.PI) * (s.arrow ? 10 : 6);
      if (s.arrow) {
        const dir = s.to.x >= s.from.x ? 1 : -1;
        r.fillRect(x - 6 * dir, y, 8, 1, s.color);
        r.fillRect(dir > 0 ? x + 2 : x - 4, y - 1, 2, 3, '#ffffff');
        return;
      }
      for (let i = 3; i >= 1; i--) {
        const tx = s.from.x + (s.to.x - s.from.x) * Math.max(0, p - i * 0.06);
        r.fillRect(tx - 1, y - 1, 2, 2, s.color);
      }
      r.fillRect(x - 3, y - 3, 6, 6, s.color);
      r.fillRect(x - 1, y - 1, 2, 2, '#ffffff');
    });
    this.sparks
      .filter((s) => s.t > 0)
      .forEach((s) => r.fillRect(s.x, s.y, s.t / s.dur > 0.6 ? 1 : 2, s.t / s.dur > 0.6 ? 1 : 2, s.color));
    this.floaters.forEach((f) => {
      const y = f.y - Math.min(1, f.t / 0.3) * 10;
      if (f.t > FLOAT_TIME * 0.8 && Math.floor(f.t * 30) % 2 === 0) {
        return;
      }
      const x = f.x - (f.text.length * 6) / 2;
      r.text(f.text, x + 1, y + 1, '#000000');
      r.text(f.text, x, y, f.color);
    });
  }

  private renderTargetCursor(r: Renderer): void {
    if (this.phase !== 'target' || Math.floor(this.time * 4) % 2 !== 0) {
      return;
    }
    const target = this.targets[this.targetCursor];
    const spot = target && this.spots.get(target.id);
    if (!spot) {
      return;
    }
    const p = this.pose(target);
    const cx = Math.round(p.x + spot.size / 2);
    const top = p.y - 9;
    for (let i = 0; i < 4; i++) {
      r.fillRect(cx - 3 + i, top + i, 7 - i * 2, 1, COLORS.gold);
    }
  }

  private highlightedMember(): number {
    if (this.phase === 'target' && this.targets[this.targetCursor]?.side === 'party') {
      return this.battle.party.indexOf(this.targets[this.targetCursor]);
    }
    if (this.phase === 'command' || this.phase === 'ability' || this.phase === 'item' || this.phase === 'target') {
      return this.actorIndex;
    }
    return -1;
  }

  /** Compact party status: one two-line row per member (name, HP and MP numbers, then bars). */
  private renderStatus(r: Renderer): void {
    const highlight = this.highlightedMember();
    r.window(STATUS_X, PANEL_Y, STATUS_W, SCREEN_H_PANEL);
    this.battle.party.forEach((c, i) => {
      const v = this.shown.get(c.id) ?? { hp: c.hp, mp: c.mp };
      const m = this.members.find((x) => x.id === c.id);
      const y = PANEL_Y + 7 + i * 21;
      const x = STATUS_X + 8;
      const dead = v.hp <= 0;
      const hpColor = dead ? COLORS.hpLow : v.hp <= c.maxHp / 4 ? COLORS.warn : COLORS.text;
      const full = this.phase === 'target' && this.targets.includes(c) && this.isFull(c, this.targetRestore);
      const nameColor = dead ? COLORS.hpLow : full ? COLORS.dim : i === highlight ? COLORS.gold : COLORS.text;
      if (i === highlight) {
        drawCursor(r, x - 6, y, COLORS.gold);
      }
      r.text(c.name.slice(0, 7).toUpperCase(), x + 2, y, nameColor);
      r.textRight(`${v.hp}/${c.maxHp}`, x + 104, y, hpColor);
      r.textRight(`${v.mp}/${c.maxMp}`, x + 150, y, COLORS.text);
      r.text(`L${m?.level ?? 1}`, x + 2, y + 9, COLORS.dim);
      r.bar(x + 58, y + 10, 46, 2, c.maxHp ? v.hp / c.maxHp : 0, dead ? COLORS.hpLow : COLORS.hp);
      r.bar(x + 116, y + 10, 34, 2, c.maxMp ? v.mp / c.maxMp : 0, COLORS.mp);
    });
  }

  private renderPanel(r: Renderer): void {
    const y = PANEL_Y;
    if (this.phase === 'command' || this.phase === 'ability' || this.phase === 'item' || this.phase === 'target') {
      this.commandMenu.render(r, RIGHT_X, y, COMMAND_W, this.phase === 'command', this.actor.name.toUpperCase());
      const subX = RIGHT_X + COMMAND_W + 2;
      const subW = SCREEN_W - subX - 4;
      if ((this.phase === 'ability' || this.phase === 'item') && this.subMenu) {
        this.subMenu.render(r, subX, y, subW, true, this.phase === 'ability' ? 'ABILITY' : 'ITEM');
        const id = this.subIds[this.subMenu.cursor];
        const hint = this.phase === 'ability' ? this.battle.ability(id).description : ITEMS.get(id)?.description;
        if (hint) {
          // Top of the screen (the sky) so the hint never hides the enemy row.
          drawHint(r, hint, subX, 4, subW);
        }
        return;
      }
      r.window(subX, y, subW, SCREEN_H_PANEL);
      const target = this.phase === 'target' ? this.targets[this.targetCursor] : undefined;
      if (target) {
        const v = this.shown.get(target.id) ?? { hp: target.hp, mp: target.mp };
        r.text('TARGET', subX + 8, y + 8, COLORS.dim);
        r.text(target.name.toUpperCase().slice(0, 20), subX + 8, y + 20, this.isFull(target, this.targetRestore) ? COLORS.dim : COLORS.gold);
        if (target.side === 'party') {
          r.text(`HP ${v.hp}/${target.maxHp}`, subX + 8, y + 32);
        }
        if (this.isFull(target, this.targetRestore)) {
          r.text(this.targetRestore === 'mp' ? 'MP FULL' : 'HP FULL', subX + 8, y + 44, COLORS.warn);
        }
        r.text('ARROWS: CHOOSE', subX + 8, y + 56, COLORS.dim);
        return;
      }
      r.text(`${this.actor.name.toUpperCase()}'S TURN`, subX + 8, y + 8, COLORS.gold);
      this.battle.enemies
        .filter(isAlive)
        .slice(0, 3)
        .forEach((e, i) => r.text(e.name.toUpperCase().slice(0, 20), subX + 8, y + 20 + i * 10, COLORS.dim));
      if (this.log.length > 0 && this.phase === 'command') {
        r.text(this.log[this.log.length - 1].toUpperCase().slice(0, 20), subX + 8, y + 56, COLORS.warn);
      }
      return;
    }
    r.window(RIGHT_X, y, RIGHT_W, SCREEN_H_PANEL);
    this.log.forEach((line, i) => r.text(line, RIGHT_X + 8, y + 8 + i * 12));
    if (this.awaitingOk) {
      const label = this.endLines.length > 0 ? 'NEXT' : 'OK';
      const x = RIGHT_X + RIGHT_W - 12 - label.length * 6;
      r.text(label, x, y + 58, COLORS.gold);
      if (Math.floor(this.time * 3) % 2 === 0) {
        drawCursor(r, x - 8, y + 58, COLORS.gold);
      }
    }
  }
}
