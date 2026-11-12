import { Rng } from '../core/rng';
import { AbilityDef, AbilityTarget, ItemDef } from '../core/types';
import {
  Combatant,
  effectiveStat,
  healAmount,
  initiative,
  isAlive,
  magicalHit,
  physicalHit,
  runChance,
} from './combat';

export interface AttackAction {
  kind: 'attack';
  actorId: string;
  targetId: string;
}

export interface AbilityAction {
  kind: 'ability';
  actorId: string;
  abilityId: string;
  targetId?: string;
}

export interface ItemAction {
  kind: 'item';
  actorId: string;
  itemId: string;
  targetId: string;
}

export interface DefendAction {
  kind: 'defend';
  actorId: string;
}

export interface RunAction {
  kind: 'run';
  actorId: string;
}

export type BattleAction = AttackAction | AbilityAction | ItemAction | DefendAction | RunAction;

export type BattleOutcome = 'ongoing' | 'victory' | 'defeat' | 'fled';

export type BattleSound = 'hit' | 'crit' | 'miss' | 'heal' | 'spell' | 'ko' | 'run' | 'buff';

export interface CombatantUpdate {
  id: string;
  hp: number;
  mp: number;
}

/** A step of battle narration. `updates` lets the UI animate HP/MP as messages appear. */
export interface BattleEvent {
  text: string;
  sound?: BattleSound;
  updates: CombatantUpdate[];
}

export interface BattleConfig {
  abilities: ReadonlyMap<string, AbilityDef>;
  items: ReadonlyMap<string, ItemDef>;
  /** Shared inventory (item id -> count). Used items are removed from it. */
  inventory: Record<string, number>;
  rng: Rng;
  canRun: boolean;
}

export interface BattleRewards {
  xp: number;
  gold: number;
  items: string[];
}

/**
 * Turn-based battle state machine.
 *
 * The UI (or the balance simulator) chooses one action per living party member, then calls
 * `resolveRound`. Enemies choose actions from their AI tables; everyone acts in initiative order.
 */
export class Battle {
  public outcome: BattleOutcome = 'ongoing';
  public round = 0;
  public readonly party: Combatant[];
  public readonly enemies: Combatant[];

  private readonly stolenItems: string[] = [];
  private stolenGold = 0;
  private cachedRewards?: BattleRewards;

  constructor(party: Combatant[], enemies: Combatant[], private readonly config: BattleConfig) {
    if (party.length === 0 || enemies.length === 0) {
      throw new Error('A battle needs at least one party member and one enemy');
    }
    this.party = party;
    this.enemies = enemies;
  }

  public get all(): Combatant[] {
    return [...this.party, ...this.enemies];
  }

  public find(id: string): Combatant | undefined {
    return this.all.find((c) => c.id === id);
  }

  public ability(id: string): AbilityDef {
    const def = this.config.abilities.get(id);
    if (!def) {
      throw new Error(`Unknown ability: ${id}`);
    }
    return def;
  }

  /** True when the actor knows the ability, has the MP and it is off cooldown. */
  public canUseAbility(actor: Combatant, abilityId: string): boolean {
    if (!actor.abilityIds.includes(abilityId)) {
      return false;
    }
    const def = this.ability(abilityId);
    if (actor.mp < def.mpCost || (actor.cooldowns[abilityId] ?? 0) > 0) {
      return false;
    }
    if (def.effect === 'revive') {
      return this.sideOf(actor).some((c) => !isAlive(c));
    }
    return true;
  }

  /** Candidate targets for an ability target type, from the actor's point of view. */
  public targetsFor(actor: Combatant, target: AbilityTarget): Combatant[] {
    switch (target) {
      case 'enemy':
      case 'allEnemies':
        return this.opponentsOf(actor).filter(isAlive);
      case 'ally':
        return this.sideOf(actor).filter(isAlive);
      case 'deadAlly':
        return this.sideOf(actor).filter((c) => !isAlive(c));
      case 'self':
        return [actor];
    }
  }

  public resolveRound(partyActions: BattleAction[]): BattleEvent[] {
    if (this.outcome !== 'ongoing') {
      return [];
    }
    this.round++;
    const { rng } = this.config;
    const events: BattleEvent[] = [];

    this.all.forEach((c) => (c.defending = false));
    const actions: BattleAction[] = [
      ...partyActions.filter((a) => {
        const actor = this.find(a.actorId);
        return actor !== undefined && actor.side === 'party' && isAlive(actor);
      }),
      ...this.enemies.filter(isAlive).map((e) => this.chooseEnemyAction(e)),
    ];
    actions.forEach((a) => {
      const actor = this.find(a.actorId);
      if (a.kind === 'defend' && actor) {
        actor.defending = true;
      }
    });

    const order = actions
      .map((action) => ({ action, init: initiative(this.mustFind(action.actorId), rng) }))
      .sort((a, b) => b.init - a.init);

    for (const { action } of order) {
      if (this.outcome !== 'ongoing') {
        break;
      }
      const actor = this.mustFind(action.actorId);
      if (!isAlive(actor)) {
        continue;
      }
      this.execute(actor, action, events);
      actor.actionsTaken++;
      this.updateOutcome();
    }

    if (this.outcome === 'ongoing') {
      this.endOfRound(events);
    }
    return events;
  }

  /** Rewards for a victory (rolled once). */
  public rewards(): BattleRewards {
    if (!this.cachedRewards) {
      const { rng } = this.config;
      const items = [...this.stolenItems];
      this.enemies.forEach((e) => {
        e.drops.forEach((d) => {
          if (rng.chance(d.chance)) {
            items.push(d.itemId);
          }
        });
      });
      this.cachedRewards = {
        xp: this.enemies.reduce((s, e) => s + e.xp, 0),
        gold: this.enemies.reduce((s, e) => s + e.gold, 0) + this.stolenGold,
        items,
      };
    }
    return this.cachedRewards;
  }

  /** Gold/items stolen so far (kept even if the party flees). */
  public stolenLoot(): { gold: number; items: string[] } {
    return { gold: this.stolenGold, items: [...this.stolenItems] };
  }

  private mustFind(id: string): Combatant {
    const c = this.find(id);
    if (!c) {
      throw new Error(`Unknown combatant: ${id}`);
    }
    return c;
  }

  private sideOf(c: Combatant): Combatant[] {
    return c.side === 'party' ? this.party : this.enemies;
  }

  private opponentsOf(c: Combatant): Combatant[] {
    return c.side === 'party' ? this.enemies : this.party;
  }

  private updateOutcome(): void {
    if (this.party.every((c) => !isAlive(c))) {
      this.outcome = 'defeat';
    } else if (this.enemies.every((c) => !isAlive(c))) {
      this.outcome = 'victory';
    }
  }

  private update(c: Combatant): { id: string; hp: number; mp: number } {
    return { id: c.id, hp: c.hp, mp: c.mp };
  }

  /** Picks a living opponent, honouring taunts, and retargeting if the chosen one fell. */
  private opponentTarget(actor: Combatant, preferredId?: string): Combatant | undefined {
    const alive = this.opponentsOf(actor).filter(isAlive);
    if (alive.length === 0) {
      return undefined;
    }
    const preferred = preferredId ? alive.find((c) => c.id === preferredId) : undefined;
    if (preferred) {
      return preferred;
    }
    const taunters = alive.filter((c) => c.tauntTurns > 0);
    return this.config.rng.pick(taunters.length > 0 ? taunters : alive);
  }

  private damage(target: Combatant, amount: number, events: BattleEvent[], crit: boolean): void {
    target.hp = Math.max(0, target.hp - amount);
    events.push({
      text: `${crit ? 'Critical hit! ' : ''}${target.name} takes ${amount} damage.`,
      sound: crit ? 'crit' : 'hit',
      updates: [this.update(target)],
    });
    if (!isAlive(target)) {
      target.buffs = [];
      target.tauntTurns = 0;
      events.push({
        text: target.side === 'enemy' ? `${target.name} is defeated!` : `${target.name} has fallen!`,
        sound: 'ko',
        updates: [this.update(target)],
      });
    }
  }

  private execute(actor: Combatant, action: BattleAction, events: BattleEvent[]): void {
    switch (action.kind) {
      case 'attack':
        this.executeAttack(actor, action.targetId, events);
        return;
      case 'ability':
        this.executeAbility(actor, action.abilityId, action.targetId, events);
        return;
      case 'item':
        this.executeItem(actor, action.itemId, action.targetId, events);
        return;
      case 'defend':
        events.push({ text: `${actor.name} is defending.`, updates: [] });
        return;
      case 'run':
        this.executeRun(actor, events);
        return;
    }
  }

  private executeAttack(actor: Combatant, targetId: string | undefined, events: BattleEvent[]): void {
    const target = this.opponentTarget(actor, targetId);
    if (!target) {
      return;
    }
    events.push({ text: `${actor.name} attacks!`, updates: [] });
    for (let i = 0; i < actor.hits && isAlive(target); i++) {
      const hit = physicalHit(actor, target, this.config.rng, { multiplier: actor.hitMultiplier });
      if (hit.missed) {
        events.push({ text: `${target.name} dodges!`, sound: 'miss', updates: [] });
      } else {
        this.damage(target, hit.damage, events, hit.crit);
      }
    }
  }

  private executeAbility(actor: Combatant, abilityId: string, targetId: string | undefined, events: BattleEvent[]): void {
    const def = this.ability(abilityId);
    if (actor.mp < def.mpCost || (actor.cooldowns[abilityId] ?? 0) > 0) {
      events.push({ text: `${actor.name} can't use ${def.name} right now.`, updates: [] });
      return;
    }
    actor.mp -= def.mpCost;
    if (def.cooldown > 0) {
      actor.cooldowns[abilityId] = def.cooldown + 1;
    }
    events.push({
      text: `${actor.name} uses ${def.name}!`,
      sound: def.category === 'magic' ? 'spell' : undefined,
      updates: [this.update(actor)],
    });

    switch (def.effect) {
      case 'damage':
        this.abilityDamage(actor, def, targetId, events);
        return;
      case 'heal':
        this.abilityHeal(actor, def, targetId, events);
        return;
      case 'buff':
        this.abilityBuff(actor, def, targetId, events);
        return;
      case 'revive':
        this.revive(actor, targetId, def.revivePercent ?? 0.25, events);
        return;
      case 'steal':
        this.steal(actor, targetId, events);
        return;
      case 'taunt':
        actor.tauntTurns = 3;
        events.push({ text: `Enemies turn their rage on ${actor.name}!`, sound: 'buff', updates: [] });
        return;
    }
  }

  private abilityDamage(actor: Combatant, def: AbilityDef, targetId: string | undefined, events: BattleEvent[]): void {
    const { rng } = this.config;
    let targets: Combatant[];
    if (def.target === 'allEnemies') {
      targets = this.opponentsOf(actor).filter(isAlive);
    } else {
      const single = this.opponentTarget(actor, targetId);
      targets = single ? [single] : [];
    }
    for (const target of targets) {
      const element = def.element ?? 'physical';
      const hit =
        def.damageType === 'magical'
          ? magicalHit(actor, target, rng, def.power, element, def.magScale ?? 1)
          : physicalHit(actor, target, rng, {
              multiplier: def.power,
              magScale: def.magScale,
              element,
              accuracy: def.accuracy,
              critBonus: (def.critBonus ?? 0) + (actor.actionsTaken === 0 ? def.firstTurnCritBonus ?? 0 : 0),
            });
      if (hit.missed) {
        events.push({ text: `${target.name} dodges!`, sound: 'miss', updates: [] });
      } else {
        this.damage(target, hit.damage, events, hit.crit);
      }
    }
  }

  private allyTarget(actor: Combatant, targetId: string | undefined): Combatant | undefined {
    const allies = this.sideOf(actor);
    const chosen = targetId ? allies.find((c) => c.id === targetId) : undefined;
    if (chosen && isAlive(chosen)) {
      return chosen;
    }
    const alive = allies.filter(isAlive);
    return alive.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  }

  private abilityHeal(actor: Combatant, def: AbilityDef, targetId: string | undefined, events: BattleEvent[]): void {
    const target = def.target === 'self' ? actor : this.allyTarget(actor, targetId);
    if (!target) {
      return;
    }
    const amount = Math.min(target.maxHp - target.hp, healAmount(actor, this.config.rng, def.power, def.magScale ?? 2));
    target.hp += amount;
    events.push({ text: `${target.name} recovers ${amount} HP.`, sound: 'heal', updates: [this.update(target)] });
  }

  private abilityBuff(actor: Combatant, def: AbilityDef, targetId: string | undefined, events: BattleEvent[]): void {
    const target = def.target === 'self' ? actor : this.allyTarget(actor, targetId);
    if (!target || !def.buff) {
      return;
    }
    const { stat, multiplier, turns } = def.buff;
    target.buffs = target.buffs.filter((b) => b.stat !== stat);
    target.buffs.push({ stat, multiplier, turnsLeft: turns });
    events.push({
      text: `${target.name}'s ${stat === 'def' ? 'defense' : 'attack'} rises!`,
      sound: 'buff',
      updates: [],
    });
  }

  private revive(actor: Combatant, targetId: string | undefined, percent: number, events: BattleEvent[]): void {
    const allies = this.sideOf(actor);
    const target =
      allies.find((c) => c.id === targetId && !isAlive(c)) ?? allies.find((c) => !isAlive(c));
    if (!target) {
      events.push({ text: 'But nothing happens.', updates: [] });
      return;
    }
    target.hp = Math.max(1, Math.floor(target.maxHp * percent));
    events.push({ text: `${target.name} is revived!`, sound: 'heal', updates: [this.update(target)] });
  }

  private steal(actor: Combatant, targetId: string | undefined, events: BattleEvent[]): void {
    const target = this.opponentTarget(actor, targetId);
    if (!target) {
      return;
    }
    if (target.stolen) {
      events.push({ text: `${target.name} has nothing left to steal.`, updates: [] });
      return;
    }
    const chance = Math.max(0.2, Math.min(0.9, 0.5 + (actor.agi - target.agi) * 0.02));
    if (!this.config.rng.chance(chance)) {
      events.push({ text: `${actor.name} couldn't steal anything.`, sound: 'miss', updates: [] });
      return;
    }
    target.stolen = true;
    const drop = target.drops[0];
    if (drop) {
      this.stolenItems.push(drop.itemId);
      const name = this.config.items.get(drop.itemId)?.name ?? drop.itemId;
      events.push({ text: `${actor.name} stole a ${name}!`, sound: 'buff', updates: [] });
    } else {
      const gold = Math.floor(target.gold / 2) + 1;
      this.stolenGold += gold;
      events.push({ text: `${actor.name} stole ${gold} gold!`, sound: 'buff', updates: [] });
    }
  }

  private executeItem(actor: Combatant, itemId: string, targetId: string, events: BattleEvent[]): void {
    const item = this.config.items.get(itemId);
    const count = this.config.inventory[itemId] ?? 0;
    if (!item || count <= 0) {
      events.push({ text: `${actor.name} has no ${item?.name ?? 'item'} left!`, updates: [] });
      return;
    }
    this.config.inventory[itemId] = count - 1;
    events.push({ text: `${actor.name} uses a ${item.name}.`, updates: [] });
    if (item.effect === 'revive') {
      this.revive(actor, targetId, item.amount, events);
      return;
    }
    const target = this.allyTarget(actor, targetId);
    if (!target) {
      return;
    }
    if (item.effect === 'healHp') {
      const amount = Math.min(target.maxHp - target.hp, item.amount);
      target.hp += amount;
      events.push({ text: `${target.name} recovers ${amount} HP.`, sound: 'heal', updates: [this.update(target)] });
    } else {
      const amount = Math.min(target.maxMp - target.mp, item.amount);
      target.mp += amount;
      events.push({ text: `${target.name} recovers ${amount} MP.`, sound: 'heal', updates: [this.update(target)] });
    }
  }

  private executeRun(actor: Combatant, events: BattleEvent[]): void {
    if (!this.config.canRun) {
      events.push({ text: `${actor.name} can't escape this fight!`, updates: [] });
      return;
    }
    if (this.config.rng.chance(runChance(this.party, this.enemies))) {
      this.outcome = 'fled';
      events.push({ text: 'The party escapes!', sound: 'run', updates: [] });
    } else {
      events.push({ text: "Couldn't escape!", sound: 'miss', updates: [] });
    }
  }

  private chooseEnemyAction(enemy: Combatant): BattleAction {
    const { rng } = this.config;
    const options = enemy.ai.filter((o) => o.action === 'attack' || this.canUseAbility(enemy, o.action));
    const choice = options.length > 0 ? rng.weighted(options, (o) => o.weight) : { action: 'attack', weight: 1 };
    if (choice.action === 'attack') {
      return { kind: 'attack', actorId: enemy.id, targetId: this.opponentTarget(enemy)?.id ?? '' };
    }
    const def = this.ability(choice.action);
    const targetId =
      def.target === 'enemy'
        ? this.opponentTarget(enemy)?.id
        : def.target === 'ally'
          ? this.allyTarget(enemy, undefined)?.id
          : undefined;
    return { kind: 'ability', actorId: enemy.id, abilityId: choice.action, targetId };
  }

  private endOfRound(events: BattleEvent[]): void {
    const regenUpdates: CombatantUpdate[] = [];
    this.all.forEach((c) => {
      if (isAlive(c) && c.battleHpRegen > 0 && c.hp < c.maxHp) {
        c.hp = Math.min(c.maxHp, c.hp + c.battleHpRegen);
        regenUpdates.push(this.update(c));
      }
      c.buffs = c.buffs
        .map((b) => ({ ...b, turnsLeft: b.turnsLeft - 1 }))
        .filter((b) => b.turnsLeft > 0);
      Object.keys(c.cooldowns).forEach((k) => {
        c.cooldowns[k] = Math.max(0, c.cooldowns[k] - 1);
      });
      c.tauntTurns = Math.max(0, c.tauntTurns - 1);
    });
    if (regenUpdates.length > 0) {
      events.push({ text: '', updates: regenUpdates });
    }
  }
}

/** Convenience: current effective DEF/ATK for UI display. */
export function displayStat(c: Combatant, stat: 'atk' | 'def'): number {
  return Math.floor(effectiveStat(c, stat));
}
