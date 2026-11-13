import {
  AbilityDef,
  Battle,
  BattleAction,
  BattleOutcome,
  Combatant,
  Rng,
  elementMultiplier,
  isAlive,
} from '@jouster/game/engine';
import { ABILITIES } from '../data/abilities';
import { ITEMS } from '../data/equipment';
import { MONSTERS } from '../data/monsters';
import { PartyMember, memberToCombatant, monstersToCombatants } from '../state/party';

/** Rough expected damage of an attack/ability against a target (no randomness). */
export function expectedDamage(actor: Combatant, target: Combatant, def?: AbilityDef): number {
  if (!def) {
    const per = Math.max(1, actor.atk - target.def / 2) * actor.hitMultiplier * (target.undead ? actor.undeadMultiplier : 1);
    return per * actor.hits * 0.97;
  }
  const elem = elementMultiplier(target, def.element ?? 'physical');
  if (def.damageType === 'magical') {
    return (def.power + actor.mag * (def.magScale ?? 1)) * elem;
  }
  const atk = actor.atk + actor.mag * (def.magScale ?? 0);
  const per =
    Math.max(1, atk - target.def / 2) * def.power * elem * (target.undead ? actor.undeadMultiplier : 1);
  return per * (def.accuracy ?? 0.97);
}

/**
 * Simple "sensible player" policy used by the balance simulator (and available for an
 * auto-battle option). Heals when low, revives fallen allies, otherwise picks the action with
 * the best expected damage while keeping enough MP for an emergency heal.
 */
export function chooseAction(battle: Battle, actor: Combatant, inventory: Record<string, number>): BattleAction {
  const allies = battle.party;
  const enemies = battle.enemies.filter(isAlive);
  const has = (id: string): boolean => battle.canUseAbility(actor, id);
  const healDef = ABILITIES.get('heal');
  const healMp = healDef?.mpCost ?? 3;
  const canHealSpell = actor.abilityIds.includes('heal');

  const dead = allies.find((c) => !isAlive(c));
  if (dead) {
    if (has('revive')) {
      return { kind: 'ability', actorId: actor.id, abilityId: 'revive', targetId: dead.id };
    }
    if ((inventory['phoenixFeather'] ?? 0) > 0) {
      return { kind: 'item', actorId: actor.id, itemId: 'phoenixFeather', targetId: dead.id };
    }
  }

  const hurt = allies.filter(isAlive).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  const threat = Math.max(...enemies.map((e) => e.atk));
  const lowThreshold = Math.max(0.35, Math.min(0.6, (threat * 1.3) / Math.max(1, hurt.maxHp)));
  if (hurt.hp / hurt.maxHp < lowThreshold) {
    if (has('heal')) {
      return { kind: 'ability', actorId: actor.id, abilityId: 'heal', targetId: hurt.id };
    }
    if ((inventory['herb'] ?? 0) > 0) {
      return { kind: 'item', actorId: actor.id, itemId: 'herb', targetId: hurt.id };
    }
  }

  const boss = enemies.find((e) => e.boss);
  if (boss && has('protect') && !actor.buffs.some((b) => b.stat === 'def') && actor.mp >= healMp * 2) {
    return { kind: 'ability', actorId: actor.id, abilityId: 'protect', targetId: actor.id };
  }
  if (boss && canHealSpell && actor.mp < healMp && (inventory['tonic'] ?? 0) > 0) {
    return { kind: 'item', actorId: actor.id, itemId: 'tonic', targetId: actor.id };
  }

  const target = [...enemies].sort((a, b) => a.hp - b.hp)[0];
  let best: BattleAction = { kind: 'attack', actorId: actor.id, targetId: target.id };
  let bestScore = expectedDamage(actor, target);
  const reserve = canHealSpell ? healMp : 0;
  for (const id of actor.abilityIds) {
    const def = ABILITIES.get(id);
    if (!def || def.effect !== 'damage' || !has(id)) {
      continue;
    }
    if (def.mpCost > 0 && actor.mp - def.mpCost < reserve) {
      continue;
    }
    const score =
      def.target === 'allEnemies'
        ? enemies.reduce((s, e) => s + Math.min(e.hp, expectedDamage(actor, e, def)), 0)
        : Math.min(target.hp, expectedDamage(actor, target, def)) * 1.0001;
    // Small preference for free attacks when MP abilities barely help.
    const adjusted = def.mpCost > 0 ? score - def.mpCost * 0.5 : score;
    if (adjusted > Math.min(target.hp, bestScore)) {
      bestScore = adjusted;
      best = { kind: 'ability', actorId: actor.id, abilityId: id, targetId: target.id };
    }
  }
  return best;
}

export interface FightResult {
  outcome: BattleOutcome;
  rounds: number;
  /** Whether each party member (same order as `members`) is still standing at the end. */
  alive: boolean[];
}

export interface FightOptions {
  bossHpScale?: number;
  maxRounds?: number;
}

/** Runs one auto-played fight. Members' HP/MP are taken as-is (not mutated). */
export function simulateFight(
  members: PartyMember[],
  monsterIds: string[],
  inventory: Record<string, number>,
  rng: Rng,
  opts: FightOptions = {},
): FightResult {
  const party = members.map(memberToCombatant);
  const defs = monsterIds.map((id) => {
    const d = MONSTERS.get(id);
    if (!d) {
      throw new Error(`Unknown monster: ${id}`);
    }
    return d;
  });
  const enemies = monstersToCombatants(defs, opts.bossHpScale ?? 1);
  const inv = { ...inventory };
  const battle = new Battle(party, enemies, { abilities: ABILITIES, items: ITEMS, inventory: inv, rng, canRun: false });
  const maxRounds = opts.maxRounds ?? 60;
  while (battle.outcome === 'ongoing' && battle.round < maxRounds) {
    const actions = party.filter(isAlive).map((c) => chooseAction(battle, c, inv));
    battle.resolveRound(actions);
  }
  return { outcome: battle.outcome, rounds: battle.round, alive: party.map(isAlive) };
}

export interface FightStats {
  winRate: number;
  avgRounds: number;
}

export function runMany(n: number, fight: (i: number) => FightResult): FightStats {
  let wins = 0;
  let rounds = 0;
  for (let i = 0; i < n; i++) {
    const r = fight(i);
    if (r.outcome === 'victory') {
      wins++;
    }
    rounds += r.rounds;
  }
  return { winRate: wins / n, avgRounds: rounds / n };
}
