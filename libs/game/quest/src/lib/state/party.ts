import {
  ClassId,
  Combatant,
  MAX_LEVEL,
  MonsterDef,
  Stats,
  WeaponDef,
  abilitiesAtLevel,
  cappedRestore,
  levelForXp,
  statsAtLevel,
  totalXpForLevel,
} from '@jouster/game/engine';
import { classDef, fieldHpStepInterval } from '../data/classes';
import { WEAPONS } from '../data/equipment';
import { GEAR } from '../data/gear';

export interface PartyMember {
  id: string;
  name: string;
  classId: ClassId;
  level: number;
  xp: number;
  hp: number;
  mp: number;
  weaponId: string;
  /** Worn gear ids (plan 15.4); missing = empty slot. */
  armorId?: string;
  shieldId?: string;
  accessoryId?: string;
  /** Poisoned members lose HP while walking and in battle until cured (plan 28); missing = healthy. */
  poisoned?: boolean;
}

export function weaponDef(id: string): WeaponDef {
  const w = WEAPONS.get(id);
  if (!w) {
    throw new Error(`Unknown weapon: ${id}`);
  }
  return w;
}

/** Creates a party member at full HP/MP with the class's starting weapon. */
export function createMember(id: string, name: string, classId: ClassId, level = 1): PartyMember {
  const cls = classDef(classId);
  const stats = statsAtLevel(cls, level);
  return {
    id,
    name,
    classId,
    level,
    xp: totalXpForLevel(level),
    hp: stats.hp,
    mp: stats.mp,
    weaponId: cls.startingWeaponId,
  };
}

/** Stats including weapon bonuses (ATK, MAG, DEF) and worn armor, shield and accessory. */
export function memberStats(m: PartyMember): Stats {
  const base = statsAtLevel(classDef(m.classId), m.level);
  const w = weaponDef(m.weaponId);
  const s: Stats = {
    ...base,
    atk: base.atk + w.atk,
    def: base.def + (w.def ?? 0),
    mag: base.mag + (w.mag ?? 0),
  };
  for (const id of [m.armorId, m.shieldId, m.accessoryId]) {
    const g = id ? GEAR.get(id) : undefined;
    for (const [k, v] of Object.entries(g?.bonus ?? {})) {
      s[k as keyof Stats] += v;
    }
  }
  return s;
}

export function memberAbilities(m: PartyMember): string[] {
  return abilitiesAtLevel(classDef(m.classId), m.level);
}

export function restoreMember(m: PartyMember): void {
  const s = memberStats(m);
  m.hp = s.hp;
  m.mp = s.mp;
  delete m.poisoned;
}

/** Poisoned members lose 1 HP every this many steps on any map (never below 1 HP). */
export const POISON_FIELD_STEP_INTERVAL = 4;

/**
 * Walking regen for one step (plan 15.9/15.10): +1 HP every `fieldHpStepInterval` steps for every class and
 * +1 MP every `fieldMpStepInterval` steps for classes with that passive. Only on maps with encounters, never for
 * KO'd members and never above max. Poison (plan 28) blocks HP regen and instead takes 1 HP every
 * `POISON_FIELD_STEP_INTERVAL` steps on any map, stopping at 1 HP.
 *
 * @returns true when poison took HP this step.
 */
export function applyFieldRegen(m: PartyMember, steps: number, encounterMap: boolean): boolean {
  if (m.hp <= 0) {
    return false;
  }
  let poisonTick = false;
  if (m.poisoned && steps % POISON_FIELD_STEP_INTERVAL === 0 && m.hp > 1) {
    m.hp -= 1;
    poisonTick = true;
  }
  if (!encounterMap) {
    return poisonTick;
  }
  const s = memberStats(m);
  if (!m.poisoned && steps % fieldHpStepInterval(m.classId) === 0) {
    m.hp += cappedRestore(m.hp, s.hp, 1);
  }
  const mpInterval = classDef(m.classId).passive?.fieldMpStepInterval;
  if (mpInterval && steps % mpInterval === 0) {
    m.mp += cappedRestore(m.mp, s.mp, 1);
  }
  return poisonTick;
}

export function memberToCombatant(m: PartyMember): Combatant {
  const cls = classDef(m.classId);
  const s = memberStats(m);
  const w = weaponDef(m.weaponId);
  return {
    id: m.id,
    name: m.name,
    side: 'party',
    hp: Math.min(m.hp, s.hp),
    maxHp: s.hp,
    mp: Math.min(m.mp, s.mp),
    maxMp: s.mp,
    atk: s.atk,
    def: s.def,
    agi: s.agi,
    mag: s.mag,
    critChance: cls.critChance,
    hits: w.hits ?? 1,
    hitMultiplier: w.hitMultiplier ?? 1,
    undeadMultiplier: w.undeadMultiplier ?? 1,
    undead: false,
    boss: false,
    weaknesses: [],
    resistances: [],
    abilityIds: memberAbilities(m),
    cooldowns: {},
    buffs: [],
    defending: false,
    tauntTurns: 0,
    battleHpRegen: cls.passive?.battleHpRegen ?? 0,
    actionsTaken: 0,
    ai: [],
    sourceId: m.classId,
    xp: 0,
    gold: 0,
    drops: [],
    stolen: false,
    poisoned: !!m.poisoned,
  };
}

/** Chance that a common (non-boss) monster drops gold when defeated. */
export const DEFAULT_GOLD_CHANCE = 0.55;

/** Builds enemy combatants, naming duplicates "Slime A", "Slime B"... */
export function monstersToCombatants(defs: MonsterDef[], hpScale = 1): Combatant[] {
  const counts = new Map<string, number>();
  defs.forEach((d) => counts.set(d.id, (counts.get(d.id) ?? 0) + 1));
  const seen = new Map<string, number>();
  return defs.map((d, i) => {
    const n = seen.get(d.id) ?? 0;
    seen.set(d.id, n + 1);
    const suffix = (counts.get(d.id) ?? 0) > 1 ? ` ${String.fromCharCode(65 + n)}` : '';
    const hp = Math.max(1, Math.round(d.stats.hp * (d.boss ? hpScale : 1)));
    return {
      id: `e${i}`,
      name: `${d.name}${suffix}`,
      side: 'enemy',
      hp,
      maxHp: hp,
      mp: d.stats.mp,
      maxMp: d.stats.mp,
      atk: d.stats.atk,
      def: d.stats.def,
      agi: d.stats.agi,
      mag: d.stats.mag,
      critChance: d.critChance ?? 1 / 64,
      hits: 1,
      hitMultiplier: 1,
      undeadMultiplier: 1,
      undead: d.undead ?? false,
      boss: d.boss ?? false,
      weaknesses: [...d.weaknesses],
      resistances: [...d.resistances],
      abilityIds: d.actions.map((a) => a.action).filter((a) => a !== 'attack'),
      cooldowns: {},
      buffs: [],
      defending: false,
      tauntTurns: 0,
      battleHpRegen: 0,
      actionsTaken: 0,
      ai: d.actions.map((a) => ({ ...a })),
      sourceId: d.id,
      xp: d.xp,
      gold: d.gold,
      goldChance: d.goldChance ?? (d.boss ? 1 : DEFAULT_GOLD_CHANCE),
      drops: d.drops.map((x) => ({ ...x })),
      stolen: false,
      poisonChance: d.poisonChance ?? 0,
    };
  });
}

export interface LevelUp {
  memberId: string;
  name: string;
  level: number;
  learned: string[];
}

/**
 * Adds XP to a member and applies level-ups (gained HP/MP are added to current values).
 */
export function grantXp(m: PartyMember, xp: number): LevelUp | null {
  const before = m.level;
  const beforeStats = memberStats(m);
  const beforeAbilities = memberAbilities(m);
  m.xp += xp;
  const level = Math.min(MAX_LEVEL, levelForXp(m.xp));
  if (level <= before) {
    return null;
  }
  m.level = level;
  const after = memberStats(m);
  m.hp = Math.min(after.hp, m.hp + (after.hp - beforeStats.hp));
  m.mp = Math.min(after.mp, m.mp + (after.mp - beforeStats.mp));
  const learned = memberAbilities(m).filter((a) => !beforeAbilities.includes(a));
  return { memberId: m.id, name: m.name, level, learned };
}

/** Copies HP/MP and poison back from battle combatants into party members. */
export function syncFromCombatants(members: PartyMember[], combatants: Combatant[]): void {
  members.forEach((m) => {
    const c = combatants.find((x) => x.id === m.id);
    if (c) {
      m.hp = c.hp;
      m.mp = c.mp;
      setPoisoned(m, !!c.poisoned && c.hp > 0);
    }
  });
}

/** Sets or clears poison, keeping healthy members free of the optional save field. */
export function setPoisoned(m: PartyMember, poisoned: boolean): void {
  if (poisoned) {
    m.poisoned = true;
  } else {
    delete m.poisoned;
  }
}
