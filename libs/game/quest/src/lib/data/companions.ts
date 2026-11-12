import { ClassId, Rng } from '@jouster/game/engine';
import { CLASS_ORDER, classDef } from './classes';

/**
 * Companion spots are fixed places in the open world. Which companion waits at each spot is
 * rolled per new game (see `rollCompanions`): a random class that is never the hero's class
 * and never repeated, plus a random name for that class. Some spots unlock after a boss.
 */
export interface CompanionSlot {
  id: string;
  /** Where the companion waits when not in the party. */
  mapId: string;
  x: number;
  y: number;
  /** Story flag that must be set before the companion appears. */
  requiresFlag?: string;
  /** Why the companion is here (`{name}` is replaced). */
  intro: string[];
}

/** The rolled companion for one slot (stored in the save). */
export interface CompanionInfo {
  name: string;
  classId: ClassId;
}

export const COMPANION_SLOTS: readonly CompanionSlot[] = [
  {
    id: 'tavern',
    mapId: 'aldmere',
    x: 15,
    y: 12,
    intro: ['{name}: Coin is scarce and the goblins are many. I could use honest work.'],
  },
  {
    id: 'thornwick',
    mapId: 'overworld',
    x: 70,
    y: 53,
    intro: [
      '{name}: I was passing through Thornwick when the goblins came... I could not save it.',
      'They came from a cave in the north-eastern hills. Let me help you end this.',
    ],
  },
  {
    id: 'brookhollow',
    mapId: 'brookhollow',
    x: 14,
    y: 4,
    intro: ['{name}: Brookhollow is quiet - too quiet for me. I hear you hunt goblins?'],
  },
  {
    id: 'cave',
    mapId: 'goblinCave',
    x: 25,
    y: 2,
    requiresFlag: 'bossDefeated',
    intro: [
      '{name}: Free at last! The goblins caught me poking around the dragon seal.',
      'The seal IS weakening. Take me with you.',
    ],
  },
];

const SLOTS: ReadonlyMap<string, CompanionSlot> = new Map(COMPANION_SLOTS.map((s) => [s.id, s]));

export function companionSlot(id: string): CompanionSlot {
  const s = SLOTS.get(id);
  if (!s) {
    throw new Error(`Unknown companion slot: ${id}`);
  }
  return s;
}


export const COMPANION_NAMES: Readonly<Record<ClassId, readonly string[]>> = {
  warrior: ['Bren', 'Garrick', 'Hilda', 'Torvald'],
  wizard: ['Ilya', 'Morwen', 'Quill', 'Zephyr'],
  paladin: ['Aldous', 'Cedric', 'Joan', 'Maren'],
  cleric: ['Sera', 'Elin', 'Tamsin', 'Ivo'],
  rogue: ['Vex', 'Nim', 'Kestrel', 'Rook'],
  ranger: ['Fenn', 'Ashe', 'Linden', 'Wren'],
};

/** What each class says it brings to the party. */
export const COMPANION_PITCH: Readonly<Record<ClassId, string>> = {
  warrior: 'My blade and shield are yours - I will stand in front.',
  wizard: 'My fire and ice are yours - I hit hard, but keep me safe.',
  paladin: 'I can fight, and my light can mend wounds. Let me guard you.',
  cleric: 'I can heal and protect you - and my mace still bites.',
  rogue: 'Quick hands, sharp knives. I strike first and I strike twice.',
  ranger: 'My arrows fly true, and I know the wilds well.',
};

/**
 * Rolls one companion per slot: distinct classes, none equal to the hero's class, and a random
 * name from each class's pool.
 */
export function rollCompanions(heroClass: ClassId, rng: Rng): Record<string, CompanionInfo> {
  const pool = CLASS_ORDER.filter((c) => c !== heroClass);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const roster: Record<string, CompanionInfo> = {};
  COMPANION_SLOTS.forEach((slot, i) => {
    const classId = pool[i % pool.length];
    const names = COMPANION_NAMES[classId];
    roster[slot.id] = { classId, name: names[rng.int(0, names.length - 1)] };
  });
  return roster;
}

/** Full intro for a rolled companion: the slot's story line(s) plus the class pitch. */
export function companionIntro(slotId: string, info: CompanionInfo): string[] {
  const tag = info.name.toUpperCase();
  return [
    ...companionSlot(slotId).intro.map((l) => l.replace('{name}', tag)),
    `I am ${info.name}, a ${classDef(info.classId).name.toLowerCase()}. ${COMPANION_PITCH[info.classId]}`,
  ];
}