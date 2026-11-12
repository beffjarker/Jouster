import { ClassId } from '@jouster/game/engine';

/**
 * Companions have fixed classes and live in different places of the open world. They can be
 * recruited in any order; some are gated behind a boss (see `requiresFlag`).
 */
export interface CompanionDef {
  id: string;
  name: string;
  classId: ClassId;
  /** Where the companion waits when not in the party. */
  mapId: string;
  x: number;
  y: number;
  /** Story flag that must be set before the companion appears. */
  requiresFlag?: string;
  /** Lines spoken before offering to join. */
  intro: string[];
}

export const COMPANION_LIST: readonly CompanionDef[] = [
  {
    id: 'bren',
    name: 'Bren',
    classId: 'warrior',
    mapId: 'aldmere',
    x: 15,
    y: 12,
    intro: ['BREN: A sellsword with no work is just a drunk with a sword.', 'Need a blade at your side?'],
  },
  {
    id: 'sera',
    name: 'Sera',
    classId: 'cleric',
    mapId: 'overworld',
    x: 27,
    y: 20,
    intro: [
      'SERA: I tend the survivors of Thornwick... the goblins took everything.',
      'They came from a cave in the northern hills. Let me come with you - I can heal.',
    ],
  },
  {
    id: 'ilya',
    name: 'Ilya',
    classId: 'wizard',
    mapId: 'goblinCave',
    x: 25,
    y: 2,
    requiresFlag: 'bossDefeated',
    intro: [
      'ILYA: Free at last! The goblins caught me studying the dragon seal.',
      'The seal IS weakening. Take me with you - my fire is yours.',
    ],
  },
];

export const COMPANIONS: ReadonlyMap<string, CompanionDef> = new Map(COMPANION_LIST.map((c) => [c.id, c]));

export function companionDef(id: string): CompanionDef {
  const c = COMPANIONS.get(id);
  if (!c) {
    throw new Error(`Unknown companion: ${id}`);
  }
  return c;
}
