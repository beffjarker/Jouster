import {
  ClassId,
  Combatant,
  MAX_LEVEL,
  MonsterDef,
  Stats,
  WeaponDef,
  abilitiesAtLevel,
  levelForXp,
  statsAtLevel,
  totalXpForLevel,
} from '@jouster/game/engine';
import { classDef } from '../data/classes';
import { WEAPONS } from '../data/equipment';

export interface PartyMember {
  id: string;
  name: string;
  classId: ClassId;
  level: number;
  xp: number;
  hp: number;
  mp: number;
  weaponId: string;
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

/** Stats including weapon bonuses (ATK, MAG, DEF). */
export function memberStats(m: PartyMember): Stats {
  const base = statsAtLevel(classDef(m.classId), m.level);
  const w = weaponDef(m.weaponId);
  return {
    ...base,
    atk: base.atk + w.atk,
    def: base.def + (w.def ?? 0),
    mag: base.mag + (w.mag ?? 0),
  };
}

export function memberAbilities(m: PartyMember): string[] {
  return abilitiesAtLevel(classDef(m.classId), m.level);
}

export function restoreMember(m: PartyMember): void {
  const s = memberStats(m);
  m.hp = s.hp;
  m.mp = s.mp;
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
  };
}

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
      drops: d.drops.map((x) => ({ ...x })),
      stolen: false,
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

/** Copies HP/MP back from battle combatants into party members. */
export function syncFromCombatants(members: PartyMember[], combatants: Combatant[]): void {
  members.forEach((m) => {
    const c = combatants.find((x) => x.id === m.id);
    if (c) {
      m.hp = c.hp;
      m.mp = c.mp;
    }
  });
}
