import { ClassId } from '@jouster/game/engine';
import { classDef } from '../data/classes';
import { WEAPONS } from '../data/equipment';
import { GEAR, gearUsableBy } from '../data/gear';
import { PartyMember, createMember } from '../state/party';

/** The member with its class family's weapon of `tier`. */
export function armed(m: PartyMember, tier: number): PartyMember {
  const family = classDef(m.classId).weaponFamily;
  const w = [...WEAPONS.values()].find((x) => x.family === family && x.tier === tier);
  return { ...m, weaponId: w?.id ?? m.weaponId };
}

export function tier2(m: PartyMember): PartyMember {
  return armed(m, 2);
}

/** Weapon of `tier` plus the best armor, shield and accessory of up to `tier` this class can wear (plan 15.4). */
export function geared(m: PartyMember, tier = 2): PartyMember {
  const best = (slot: string): string | undefined =>
    [...GEAR.values()]
      .filter((g) => g.slot === slot && g.tier <= tier && gearUsableBy(g, m.classId))
      .sort((x, y) => y.price - x.price)[0]?.id;
  return { ...armed(m, tier), armorId: best('armor'), shieldId: best('shield'), accessoryId: best('accessory') };
}

/** The smallest post-unlock party: the hero at `level` and one companion a level behind, both fully geared. */
export function duo(hero: ClassId, ally: ClassId, level: number, tier: number): PartyMember[] {
  return [geared(createMember('a', 'A', hero, level), tier), geared(createMember('b', 'B', ally, level - 1), tier)];
}
