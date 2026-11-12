import {
  AbilityDef,
  Battle,
  BattleAction,
  BattleEvent,
  BattleOutcome,
  BattleSound,
  Combatant,
  InputManager,
  Renderer,
  Scene,
  SoundId,
  isAlive,
  wrapText,
} from '@jouster/game/engine';
import { ABILITIES } from '../data/abilities';
import { ITEMS } from '../data/equipment';
import { Backdrop } from '../data/maps';
import { BOSS_HP_SCALE, MONSTERS } from '../data/monsters';
import { GameState, addItem } from '../state/game-state';
import { PartyMember, grantXp, memberToCombatant, monstersToCombatants, syncFromCombatants } from '../state/party';
import { COLORS, ListMenu, MenuItem, SCREEN_W, StatusEntry, drawCursor, drawPartyStatus } from '../ui/widgets';
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

const COMMANDS = ['ATTACK', 'ABILITY', 'ITEM', 'DEFEND', 'RUN'];
const EVENT_DELAY = 0.6;
const MAX_LOG_LINES = 5;
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

const BACKDROP_COLORS: ReadonlyMap<Backdrop, [string, string]> = new Map<Backdrop, [string, string]>([
  ['field', ['#3c78c8', '#3a8a30']],
  ['forest', ['#2c5a8c', '#1f5a22']],
  ['hills', ['#4a7ab0', '#7a6a3a']],
  ['cave', ['#141018', '#3a2e28']],
]);

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
  private endLines: string[] = [];
  private outcomeSound: SoundId | null = null;

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
    this.flash.forEach((t, id) => (t - dt <= 0 ? this.flash.delete(id) : this.flash.set(id, t - dt)));
    if (this.inputGuard > 0) {
      this.inputGuard = Math.max(0, this.inputGuard - dt);
      if (this.phase === 'command') {
        return;
      }
    }
    switch (this.phase) {
      case 'intro':
        this.timer += dt;
        if (this.timer > 1.2 || input.wasPressed('confirm')) {
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
    drawPartyStatus(r, this.statusEntries(), 4, this.highlightedMember());
    this.renderField(r);
    this.renderBottom(r);
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
        this.beginTarget(this.battle.targetsFor(this.actor, def.target));
      }
      return;
    }
    this.pendingKind = 'item';
    const item = ITEMS.get(id);
    const revive = item?.effect === 'revive';
    this.beginTarget(this.battle.party.filter((c) => (revive ? !isAlive(c) : isAlive(c))));
  }

  private beginTarget(targets: Combatant[]): void {
    if (targets.length === 0) {
      this.ctx.audio.play('cancel');
      return;
    }
    this.targets = targets;
    this.targetCursor = 0;
    this.phase = 'target';
  }

  private updateTarget(input: InputManager): void {
    const n = this.targets.length;
    if (input.wasPressed('right') || input.wasPressed('down')) {
      this.targetCursor = (this.targetCursor + 1) % n;
      this.ctx.audio.play('cursor');
    } else if (input.wasPressed('left') || input.wasPressed('up')) {
      this.targetCursor = (this.targetCursor - 1 + n) % n;
      this.ctx.audio.play('cursor');
    } else if (input.wasPressed('confirm')) {
      this.ctx.audio.play('confirm');
      this.confirmTarget(this.targets[this.targetCursor]);
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
    this.timer -= dt;
    if (input.wasPressed('confirm')) {
      this.timer = Math.min(this.timer, 0.05);
    }
    while (this.timer <= 0 && this.queue.length > 0) {
      const ev = this.queue.shift() as BattleEvent;
      this.applyEvent(ev);
      this.timer = ev.text ? EVENT_DELAY : 0;
    }
    if (this.timer <= 0 && this.queue.length === 0) {
      if (this.battle.outcome === 'ongoing') {
        this.startCommands();
      } else {
        this.finish();
      }
    }
  }

  private applyEvent(ev: BattleEvent): void {
    ev.updates.forEach((u) => {
      const before = this.shown.get(u.id);
      if (before && u.hp < before.hp) {
        this.flash.set(u.id, 0.35);
      }
      this.shown.set(u.id, { hp: u.hp, mp: u.mp });
    });
    if (ev.text) {
      this.addLog(ev.text);
    }
    if (ev.sound) {
      this.ctx.audio.play(SOUND_FOR.get(ev.sound) ?? 'hit');
    }
  }

  private addLog(text: string): void {
    wrapText(text, 37).forEach((line) => this.log.push(line));
    while (this.log.length > MAX_LOG_LINES) {
      this.log.shift();
    }
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
      lines.push('Victory!', `Each survivor gains ${share} XP. Found ${rewards.gold} gold.`);
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
    this.endLines = lines.flatMap((line) => wrapText(line, 37));
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
    const pressed = input.wasPressed('confirm') || input.wasPressed('cancel');
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

  private statusEntries(): StatusEntry[] {
    return this.battle.party.map((c) => {
      const v = this.shown.get(c.id) ?? { hp: c.hp, mp: c.mp };
      const m = this.members.find((x) => x.id === c.id);
      return { name: c.name, level: m?.level ?? 1, hp: v.hp, maxHp: c.maxHp, mp: v.mp, maxMp: c.maxMp };
    });
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

  private renderField(r: Renderer): void {
    const x = 8;
    const y = 52;
    const w = SCREEN_W - 16;
    const h = 104;
    const [sky, ground] = BACKDROP_COLORS.get(this.options.backdrop) ?? ['#000000', '#222222'];
    r.window(x, y, w, h);
    r.fillRect(x + 3, y + 3, w - 6, 50, sky);
    r.fillRect(x + 3, y + 53, w - 6, h - 56, ground);
    const enemies = this.battle.enemies;
    const scale = this.options.boss ? 4 : 2;
    const size = 16 * scale;
    const gap = 12;
    const total = enemies.length * size + (enemies.length - 1) * gap;
    let ex = Math.round(SCREEN_W / 2 - total / 2);
    const targetEnemy = this.phase === 'target' ? this.targets[this.targetCursor] : undefined;
    enemies.forEach((e) => {
      const ey = y + h - 12 - size;
      const vitals = this.shown.get(e.id);
      const def = MONSTERS.get(e.sourceId);
      const flashing = this.flash.has(e.id) && Math.floor(this.time * 20) % 2 === 0;
      if ((vitals?.hp ?? 0) > 0 && def && !flashing) {
        r.draw(this.ctx.art.monster(def.spriteId), ex, ey, { scale });
      }
      if (targetEnemy === e && Math.floor(this.time * 4) % 2 === 0) {
        const cx = ex + size / 2;
        for (let i = 0; i < 4; i++) {
          r.fillRect(cx - 3 + i, ey - 10 + i, 7 - i * 2, 1, COLORS.gold);
        }
      }
      ex += size + gap;
    });
  }

  private renderBottom(r: Renderer): void {
    const y = 160;
    if (this.phase === 'command' || this.phase === 'ability' || this.phase === 'item' || this.phase === 'target') {
      this.commandMenu.render(r, 8, y, 84, this.phase === 'command', this.actor.name.toUpperCase());
      if ((this.phase === 'ability' || this.phase === 'item') && this.subMenu) {
        this.subMenu.render(r, 96, y, 152, true, this.phase === 'ability' ? 'ABILITY' : 'ITEM');
      } else {
        r.window(96, y, 152, 72);
        const hint =
          this.phase === 'target'
            ? `TARGET: ${this.targets[this.targetCursor]?.name.toUpperCase() ?? ''}`
            : `${this.actor.name.toUpperCase()}'S TURN`;
        r.text(hint, 104, y + 8);
        this.battle.enemies.filter(isAlive).forEach((e, i) => {
          r.text(e.name.toUpperCase(), 104, y + 24 + i * 10, COLORS.dim);
        });
        if (this.log.length > 0 && this.phase === 'command') {
          r.text(this.log[this.log.length - 1].toUpperCase().slice(0, 23), 104, y + 58, COLORS.warn);
        }
      }
      return;
    }
    r.window(8, y, SCREEN_W - 16, 72);
    this.log.forEach((line, i) => r.text(line, 16, y + 8 + i * 12));
    if (this.awaitingOk) {
      const label = this.endLines.length > 0 ? 'NEXT' : 'OK';
      const x = SCREEN_W - 24 - label.length * 6;
      r.text(label, x, y + 58, COLORS.gold);
      if (Math.floor(this.time * 3) % 2 === 0) {
        drawCursor(r, x - 8, y + 58, COLORS.gold);
      }
    }
  }
}
