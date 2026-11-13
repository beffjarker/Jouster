import { ClassId, Rng } from '@jouster/game/engine';
import { CLASS_ORDER, classDef } from './classes';
import { LANDMARKS } from './overworld-gen';

/**
 * Companion spots are fixed places in the open world. Which companion waits at each spot is
 * rolled per new game (see `rollCompanions`): a random class that is never the hero's class
 * and never repeated, plus a random name for that class. Nobody joins before the Goblin King
 * falls; after that each companion asks for a favour (a side quest) before joining.
 */
export interface CompanionSlot {
  id: string;
  /** Where the companion waits when not in the party. */
  mapId: string;
  x: number;
  y: number;
  /** Where to find the companion again, for messages ("Return to Bren in Aldmere."). */
  home: string;
  /** Story flag that must be set before the companion appears. */
  requiresFlag?: string;
  /** Why the companion is here (`{name}` is replaced). */
  intro: string[];
  /** Favour the companion asks before joining (offered after the Goblin King falls). */
  quest: CompanionQuest;
}

/**
 * A companion's side quest. Companions cannot join until the first boss is defeated; after that
 * each one asks for help first. `{name}` in lines is replaced with the companion's name.
 */
export interface CompanionQuest {
  title: string;
  /** Short objective shown in the quest log. */
  objective: string;
  /** Story flag that completes the quest (set by defeating its mini-boss). */
  doneFlag: string;
  /** Where the objective is (shown on the world map once that spot is explored). */
  pin: { mapId: string; x: number; y: number };
  offer: string[];
  reminder: string[];
  thanks: string[];
  /** Said before the thanks when the mini-boss was already beaten before the quest was accepted. */
  already: string[];
  /** Includes a starter kit of at least 2 Herbs for the companion who joins (plan 16.1). */
  reward: { gold: number; items?: Record<string, number> };
}

/** What a companion says before the Goblin King is defeated (they will not join yet). */
export const PRE_BOSS_HINT = '{name}: Prove yourself against the Goblin King first. Then come find me - I may need your help.';

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
    home: 'the Aldmere tavern',
    intro: ['{name}: Coin is scarce and the goblins are many. I could use honest work.'],
    quest: {
      title: 'The Wolf Den',
      objective: 'Slay the Alpha Wolf in its den in the eastern hills.',
      doneFlag: 'alphaWolfDefeated',
      pin: { mapId: 'overworld', ...LANDMARKS.wolfDen },
      offer: [
        '{name}: A pack led by a huge black wolf has been savaging the eastern farms.',
        'Its den is a cave in the far eastern hills, past Thornwick. Kill the alpha and I will ride with you.',
      ],
      reminder: ['{name}: The Alpha Wolf still hunts from its den in the eastern hills.'],
      thanks: ['{name}: The alpha is dead? The farmers will sleep tonight. Here - the bounty is yours.'],
      already: ['{name}: Wait - you already slew the alpha? Then I owe you twice.'],
      reward: { gold: 60, items: { herb: 2 } },
    },
  },
  {
    id: 'thornwick',
    mapId: 'overworld',
    x: 70,
    y: 53,
    home: 'the Thornwick ruins',
    intro: [
      '{name}: I was passing through Thornwick when the goblins came... I could not save it.',
      'They came from a cave in the north-eastern hills. Let me help you end this.',
    ],
    quest: {
      title: 'Restless Bones',
      objective: 'Rest at an inn, then face the Bone Captain in the Thornwick ruins at night.',
      doneFlag: 'boneCaptainDefeated',
      pin: { mapId: 'overworld', ...LANDMARKS.thornwick },
      offer: [
        "{name}: The dead of Thornwick don't rest. Each night a Bone Captain rises among the ruins.",
        'Rest at an inn and return after dark. Put it down and I will join you.',
      ],
      reminder: ['{name}: The Bone Captain rises at night. Rest at an inn, then come back.'],
      thanks: ['{name}: Thornwick can finally rest. Take this - I found it in the ashes.'],
      already: ['{name}: The Bone Captain is already dust? You work fast.'],
      reward: { gold: 40, items: { herb: 2, tonic: 2 } },
    },
  },
  {
    id: 'brookhollow',
    mapId: 'brookhollow',
    x: 14,
    y: 4,
    home: 'Brookhollow',
    intro: ['{name}: Brookhollow is quiet - too quiet for me. I hear you hunt goblins?'],
    quest: {
      title: 'The Lake Beast',
      objective: 'Drive off the Giant Toad on the west shore of the southern lake.',
      doneFlag: 'giantToadDefeated',
      pin: { mapId: 'overworld', x: LANDMARKS.lakeshore.x + 1, y: LANDMARKS.lakeshore.y },
      offer: [
        '{name}: A giant toad has taken the west shore of the lake east of here. Nobody can fish.',
        'Drive it off and I am yours.',
      ],
      reminder: ['{name}: The Giant Toad still squats on the west shore of the lake.'],
      thanks: ['{name}: Ha! The lake is ours again. The fishers sent these for you.'],
      already: ['{name}: You already chased off the toad? Then I owe you twice.'],
      reward: { gold: 30, items: { herb: 6 } },
    },
  },
  {
    id: 'cave',
    mapId: 'goblinCave',
    x: 25,
    y: 2,
    home: 'the cell in the Goblin Cave',
    requiresFlag: 'bossDefeated',
    intro: [
      '{name}: Over here, behind the bars! The goblins caught me poking around the dragon seal.',
      'The seal IS weakening. Get me out and I will fight beside you.',
    ],
    quest: {
      title: 'The Cell Key',
      objective: 'Take the cell key from the Goblin Jailer in the east chamber of the cave.',
      doneFlag: 'goblinChiefDefeated',
      pin: { mapId: 'goblinCave', x: 23, y: 8 },
      offer: [
        "{name}: You beat the king! But I'm still locked in. The Goblin Jailer has the key.",
        'He hides in the eastern chamber of this cave. Get the key and let me out!',
      ],
      reminder: ['{name}: The Jailer is in the eastern chamber. Please hurry!'],
      thanks: ['{name}: The key! Free at last. The goblins hoarded some gold - take it.'],
      already: ['{name}: You already have the key? Bless you!'],
      reward: { gold: 80, items: { herb: 2 } },
    },
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

/** Replaces {name} in companion lines. */
export function companionLines(lines: readonly string[], info: CompanionInfo): string[] {
  const tag = info.name.toUpperCase();
  return lines.map((l) => l.replace('{name}', tag));
}

/** Full intro for a rolled companion: the slot's story line(s) plus the class pitch. */
export function companionIntro(slotId: string, info: CompanionInfo): string[] {
  const tag = info.name.toUpperCase();
  return [
    ...companionSlot(slotId).intro.map((l) => l.replace('{name}', tag)),
    `I am ${info.name}, a ${classDef(info.classId).name.toLowerCase()}. ${COMPANION_PITCH[info.classId]}`,
  ];
}