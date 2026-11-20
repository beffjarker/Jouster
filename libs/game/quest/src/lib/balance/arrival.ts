import { ENCOUNTER_GRACE_STEPS, EncounterTable, Rng, pickEncounter, scaledEncounterRate } from '@jouster/game/engine';
import { ABILITIES } from '../data/abilities';
import { ITEMS } from '../data/equipment';
import { MapDef, mapDef } from '../data/maps';
import { ENCOUNTER_TABLES, SOLO_MAX_ENEMIES } from '../data/monsters';
import { CAVE_FOG_RADIUS, TORCH_LIGHT_RADIUS, TORCH_SIGHT_BONUS, inSight } from '../state/fog';
import { MAX_PARTY } from '../state/game-state';
import { PartyMember, applyFieldRegen, memberToCombatant } from '../state/party';
import { SUNNY_SIGHT_RADIUS } from '../state/weather';
import { FightResult, FightOptions, simulateFight } from './simulator';

/**
 * Plan §37: bosses attack on sight, so a party meets them worn from the walk in rather than fresh from an inn.
 * These helpers find the shortest walk from a map's entrance until a boss comes into sight, count the random
 * fights expected on the way and play them out before the boss fight.
 */

/** Field steps between two random fights (4 grace steps + ~1/12 per step after), spent regenerating. */
export const STEPS_BETWEEN_FIGHTS = 16;

export interface SightRoute {
  /** Tiles walked from the start until the boss is in sight. */
  steps: number;
  /** The encounter table of every random-encounter tile on the way, in walking order. */
  tables: EncounterTable[];
}

/** Sight radius at (x, y) as the world scene computes it: cave darkness (+ torchlight), else a sunny day. */
function sightAt(def: MapDef, torches: Array<{ x: number; y: number }>, x: number, y: number): number {
  if (def.backdrop !== 'cave') {
    return SUNNY_SIGHT_RADIUS;
  }
  const lit = torches.some((t) => inSight(t.x - x, t.y - y, TORCH_LIGHT_RADIUS));
  return CAVE_FOG_RADIUS + (lit ? TORCH_SIGHT_BONUS : 0);
}

/** Where a boss's approach starts when it is not the map's first warp: the warp leading to this map. */
const APPROACH_FROM: Record<string, string> = { overworld: 'brookhollow' };

/**
 * Shortest walk on `mapId` from `from` (default: the map's entrance) to the first tile where the boss NPC `npcId` is
 * in sight, or undefined when it can't be seen. Sight ignores walls, as the fog does. Tiles within sight of the NPCs
 * in `avoid` are treated as walls, to check that a boss can only be reached past another one.
 */
export function findSightRoute(
  mapId: string,
  npcId: string,
  from?: { x: number; y: number },
  avoid: readonly string[] = [],
): SightRoute | undefined {
  const def = mapDef(mapId);
  const npc = def.npcs.find((n) => n.id === npcId);
  const entry = APPROACH_FROM[mapId];
  const start = from ?? (entry ? def.warps.find((w) => w.toMap === entry) : def.warps[0]);
  if (!npc || !start) {
    throw new Error(`No route to ${npcId} on ${mapId}`);
  }
  const legend = new Map(def.legend.map((t) => [t.char, t]));
  const torches = def.rows.flatMap((row, y) =>
    [...row].flatMap((ch, x) => (legend.get(ch)?.id === 'torch' ? [{ x, y }] : [])),
  );
  const guards = def.npcs.filter((n) => avoid.includes(n.id));
  const guarded = (x: number, y: number): boolean =>
    guards.some((g) => inSight(g.x - x, g.y - y, sightAt(def, torches, x, y)));
  interface Step extends SightRoute {
    x: number;
    y: number;
  }
  const seen = new Set([`${start.x},${start.y}`]);
  let frontier: Step[] = [{ x: start.x, y: start.y, steps: 0, tables: [] }];
  while (frontier.length > 0) {
    const next: Step[] = [];
    for (const p of frontier) {
      if (inSight(npc.x - p.x, npc.y - p.y, sightAt(def, torches, p.x, p.y))) {
        return { steps: p.steps, tables: p.tables };
      }
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const x = p.x + dx;
        const y = p.y + dy;
        const tile = legend.get(def.rows[y]?.[x] ?? '');
        if (!tile || tile.solid || seen.has(`${x},${y}`) || guarded(x, y)) {
          continue;
        }
        seen.add(`${x},${y}`);
        const table = tile.encounterTableId ? ENCOUNTER_TABLES.get(tile.encounterTableId) : undefined;
        next.push({ x, y, steps: p.steps + 1, tables: table ? [...p.tables, table] : p.tables });
      }
    }
    frontier = next;
  }
  return undefined;
}

/** As {@link findSightRoute}, throwing when the boss can't be seen. */
export function sightRoute(mapId: string, npcId: string, from?: { x: number; y: number }): SightRoute {
  const route = findSightRoute(mapId, npcId, from);
  if (!route) {
    throw new Error(`${npcId} is never in sight on ${mapId}`);
  }
  return route;
}

/** The boss NPC on `mapId` whose fight is led by `monsterId`. */
export function bossNpc(mapId: string, monsterId: string): MapDef['npcs'][number] {
  const npc = mapDef(mapId).npcs.find((n) => n.boss?.monsterIds[0] === monsterId);
  if (!npc) {
    throw new Error(`No ${monsterId} on ${mapId}`);
  }
  return npc;
}

/** The random fights a party of `partyLevel` meets walking in to `monsterId`'s boss on `mapId` (see trekTables). */
export function bossTrek(mapId: string, monsterId: string, partyLevel: number, from?: { x: number; y: number }): EncounterTable[] {
  return trekTables(sightRoute(mapId, bossNpc(mapId, monsterId).id, from), partyLevel);
}

/**
 * Expected random fights along a route for a party of `partyLevel`, by the game's rules (a grace period after each
 * fight, out-levelled areas thinned). The walk starts past the grace period, as it does when entering from outside.
 */
export function expectedFights(route: SightRoute, partyLevel: number): number {
  let since = new Map<number, number>([[ENCOUNTER_GRACE_STEPS, 1]]);
  let fights = 0;
  for (const table of route.tables) {
    const rate = scaledEncounterRate(table.rate, partyLevel, table.level);
    const next = new Map<number, number>();
    const add = (k: number, p: number): void => {
      next.set(k, (next.get(k) ?? 0) + p);
    };
    since.forEach((p, s) => {
      const steps = Math.min(s + 1, ENCOUNTER_GRACE_STEPS);
      if (steps < ENCOUNTER_GRACE_STEPS) {
        add(steps, p);
        return;
      }
      fights += p * rate;
      add(0, p * rate);
      add(steps, p * (1 - rate));
    });
    since = next;
  }
  return fights;
}

/**
 * The random fights a party is taken to win before a boss: the expected count rounded, but at least one when the
 * route crosses any encounter tiles. Each is drawn from the table of the stretch of road where it would happen.
 */
export function trekTables(route: SightRoute, partyLevel: number): EncounterTable[] {
  if (route.tables.length === 0) {
    return [];
  }
  const count = Math.max(1, Math.round(expectedFights(route, partyLevel)));
  return Array.from({ length: count }, (_, k) => route.tables[Math.floor(((k + 0.5) * route.tables.length) / count)]);
}

/** What a careful player does between fights: patch HP up to 60% (Heal spell first, then Herbs, then Potions). */
export function fieldTopUp(m: PartyMember, inv: Record<string, number>): void {
  const c = memberToCombatant(m);
  const healCost = ABILITIES.get('heal')?.mpCost ?? 3;
  const canHeal = c.abilityIds.includes('heal');
  while (m.hp < c.maxHp * 0.6) {
    if (canHeal && m.mp >= healCost * 2) {
      m.mp -= healCost;
      m.hp += 10 + c.mag * 2;
    } else if ((inv['herb'] ?? 0) > 0) {
      inv['herb']--;
      m.hp += ITEMS.get('herb')?.amount ?? 25;
    } else if ((inv['potion'] ?? 0) > 0) {
      inv['potion']--;
      m.hp += ITEMS.get('potion')?.amount ?? 70;
    } else {
      break;
    }
  }
  m.hp = Math.min(m.hp, c.maxHp);
}

export interface Arrival {
  /** The party as it reaches the boss: HP and MP after the trek, fallen members at 0 HP. */
  party: PartyMember[];
  inventory: Record<string, number>;
  /** Set when the party lost a random fight on the way (so never reached the boss). */
  lost?: FightResult;
}

/**
 * Walks `party` through the trek fights (random groups from each table, capped like the world scene caps them),
 * Walks `party` through the trek fights (random groups from each table, capped like the world scene caps them),
 * patching HP before setting off and after each fight, and regenerating between fights. Members are copied; the
 * caller's party is not changed.
 */
export function walkIn(party: PartyMember[], trek: readonly EncounterTable[], kit: Record<string, number>, rng: Rng): Arrival {
  let members = party.map((m) => ({ ...m }));
  let inventory = { ...kit };
  const topUp = (): void =>
    members.forEach((m) => {
      if (m.hp > 0) {
        fieldTopUp(m, inventory);
      }
    });
  const max = party.length === 1 ? SOLO_MAX_ENEMIES : MAX_PARTY;
  let steps = 0;
  topUp();
  for (const table of trek) {
    const r = simulateFight(members, pickEncounter(table, rng, max), inventory, rng);
    if (r.outcome !== 'victory') {
      return { party: members, inventory, lost: r };
    }
    members = members.map((m, i) => ({ ...m, hp: Math.max(0, r.hp[i]), mp: r.mp[i] }));
    inventory = { ...r.inventory };
    topUp();
    for (let s = 0; s < STEPS_BETWEEN_FIGHTS; s++) {
      steps++;
      members.forEach((m) => applyFieldRegen(m, steps, true));
    }
  }
  return { party: members, inventory };
}

/** A boss fight as the party meets it on sight: after the trek fights on the way in. */
export function arrivalFight(
  party: PartyMember[],
  trek: readonly EncounterTable[],
  monsterIds: readonly string[],
  kit: Record<string, number>,
  rng: Rng,
  options?: FightOptions,
): FightResult {
  const arrival = walkIn(party, trek, kit, rng);
  return arrival.lost ?? simulateFight(arrival.party, [...monsterIds], arrival.inventory, rng, options);
}
