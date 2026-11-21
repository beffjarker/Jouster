import { ClassId } from '@jouster/game/engine';
import { CLASS_ORDER, classDef } from '../data/classes';
import { WEAPONS } from '../data/equipment';
import type { PartyMember } from '../state/party';
import { HumanoidLook, LOOKS } from './hd-characters';

/**
 * What a party member is drawn wearing (plan §39): their class, weapon and any armour, shield and accessory. Art
 * layers each piece over the class's plain look, so changing gear changes the sprite.
 */
export interface Outfit {
  classId: ClassId;
  weapon: string;
  armor?: string;
  shield?: string;
  accessory?: string;
}

/** True for the six playable class ids (their sprite is an outfit, not a fixed NPC look). */
export function isClassId(id: string): id is ClassId {
  return (CLASS_ORDER as readonly string[]).includes(id);
}

/** The gear a party member wears right now. */
export function outfitOf(m: PartyMember): Outfit {
  return { classId: m.classId, weapon: m.weaponId, armor: m.armorId, shield: m.shieldId, accessory: m.accessoryId };
}

/** A new member of a class: the starting weapon and nothing else (also how waiting companions look). */
export function startingOutfit(classId: ClassId): Outfit {
  return { classId, weapon: classDef(classId).startingWeaponId };
}

/** Each class in typical Act I gear, for the title screen's line-up (a new hero starts plain: {@link startingOutfit}). */
const SHOWCASE: Readonly<Record<ClassId, Omit<Outfit, 'classId'>>> = {
  warrior: { weapon: 'ironSword', armor: 'plateArmor', shield: 'kiteShield' },
  wizard: { weapon: 'runeStaff', armor: 'sageRobe' },
  necromancer: { weapon: 'graveScythe', armor: 'sageRobe' },
  cleric: { weapon: 'ironMace', armor: 'chainMail' },
  rogue: { weapon: 'steelDaggers', armor: 'leatherArmor' },
  ranger: { weapon: 'longKnife', armor: 'leatherArmor' },
};

export function showcaseOutfit(classId: ClassId): Outfit {
  return { classId, ...SHOWCASE[classId] };
}

/** Stable cache key for an outfit. */
export function outfitKey(o: Outfit): string {
  return `${o.classId}|${o.weapon}|${o.armor ?? ''}|${o.shield ?? ''}|${o.accessory ?? ''}`;
}

/** Procedural weapon per weapon family (rangers carry their bow). */
const FAMILY_WEAPON: Readonly<Record<string, HumanoidLook['weapon']>> = {
  sword: 'sword',
  scythe: 'scythe',
  staff: 'staff',
  mace: 'mace',
  daggers: 'dagger',
  knife: 'bow',
};

/** Undyed shirt per class, matching the LPC plain look (tools/game-assets/build-lpc-sprites.py PARTY_BASES). */
const PLAIN_SHIRT: Readonly<Record<ClassId, string>> = {
  warrior: '#b89a6a',
  wizard: '#e8e4dc',
  necromancer: '#8a8a90',
  cleric: '#e8e4dc',
  rogue: '#4a4a50',
  ranger: '#b89a6a',
};

/**
 * Procedural stand-in when the LPC sheets are not loaded: a plain shirt and trousers with no hat until armour is
 * worn, then the class's familiar outfit; the weapon always shows.
 */
export function outfitLook(o: Outfit): HumanoidLook {
  const look = LOOKS.get(o.classId) ?? (LOOKS.get('villager') as HumanoidLook);
  const weapon = FAMILY_WEAPON[WEAPONS.get(o.weapon)?.family ?? ''] ?? look.weapon;
  if (o.armor) {
    return { ...look, weapon };
  }
  return {
    ...look,
    body: PLAIN_SHIRT[o.classId],
    trim: '#8a6a40',
    legs: '#6a4a2a',
    hat: undefined,
    hatColor: undefined,
    cape: undefined,
    robe: false,
    weapon,
  };
}
