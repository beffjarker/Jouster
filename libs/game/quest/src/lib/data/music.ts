import { MusicTrack, MusicVoice } from '@jouster/game/engine';
import { MapDef, mapHasEncounters } from './maps';

/**
 * Original chiptune loops (composed for Jouster Quest). Notation: one token per eighth note, `.` holds,
 * `-` rests, `x` is a noise hit, `|` separates bars (see `parseVoice` in the engine).
 */
export type MusicId =
  | 'title'
  | 'town'
  | 'overworld'
  | 'southlands'
  | 'frostpeaks'
  | 'embermountains'
  | 'dungeon'
  | 'battle'
  | 'boss'
  | 'finalBoss';

const lead = (notes: string, volume = 0.035): MusicVoice => ({ wave: 'square', volume, notes });
const bass = (notes: string, volume = 0.06): MusicVoice => ({ wave: 'triangle', volume, notes });
const drums = (bar: string, bars = 8, volume = 0.015): MusicVoice => ({
  wave: 'noise',
  volume,
  notes: Array(bars).fill(bar).join(' | '),
});

/** The same note one octave higher (`A1` -> `A2`). */
function octaveUp(note: string): string {
  return note.replace(/-?\d+$/, (o) => String(Number(o) + 1));
}

/** A driving bass bar per root, alternating the root and its octave on every eighth note. */
function pump(roots: readonly string[]): string {
  return roots.map((r) => `${r} ${octaveUp(r)} ${r} ${octaveUp(r)} ${r} ${octaveUp(r)} ${r} ${octaveUp(r)}`).join(' | ');
}

export const TRACKS: Readonly<Record<MusicId, MusicTrack>> = {
  title: {
    id: 'title',
    bpm: 100,
    voices: [
      lead(
        'C5 . . G4 C5 . E5 . | D5 . C5 . B4 . G4 . | A4 . . C5 F5 . E5 D5 | E5 . . . . . - - | ' +
          'C5 . . G4 C5 . E5 . | F5 . E5 . D5 . C5 . | D5 . B4 . G4 . B4 D5 | C5 . . . . . - -',
      ),
      bass(
        'C3 . G3 . C3 . G3 . | G2 . D3 . G2 . D3 . | F2 . C3 . F2 . C3 . | C3 . G3 . C3 . G3 . | ' +
          'C3 . G3 . E3 . G3 . | F2 . C3 . F2 . A2 . | G2 . D3 . G2 . B2 . | C3 . G2 . C3 . - -',
      ),
      drums('x - - - x - x -'),
    ],
  },
  town: {
    id: 'town',
    bpm: 96,
    voices: [
      lead(
        'F4 . A4 . C5 . A4 . | Bb4 . A4 . G4 . . - | G4 . Bb4 . D5 . Bb4 . | A4 . G4 . F4 . . - | ' +
          'F4 . A4 . C5 . F5 . | E5 . D5 . C5 . A4 . | Bb4 . G4 . E4 . G4 . | F4 . . . . . - -',
        0.03,
      ),
      bass(
        'F2 - C3 - F2 - C3 - | Bb2 - F3 - C3 - G3 - | G2 - D3 - Bb2 - D3 - | C3 - G3 - F2 - C3 - | ' +
          'F2 - C3 - F2 - C3 - | C3 - G3 - F2 - C3 - | C3 - G2 - C3 - E3 - | F2 - C3 - F2 - - -',
      ),
      drums('x - - - x - - -', 8, 0.01),
    ],
  },
  overworld: {
    id: 'overworld',
    bpm: 132,
    voices: [
      lead(
        'D5 . A4 . D5 E5 F#5 . | E5 . D5 . A4 . . - | B4 . D5 . G5 . F#5 E5 | F#5 . . . . . - - | ' +
          'D5 . A4 . D5 E5 F#5 . | G5 . F#5 . E5 . D5 . | E5 . C#5 . A4 . C#5 E5 | D5 . . . . . - -',
      ),
      bass(pump(['D2', 'A1', 'G1', 'D2', 'D2', 'G1', 'A1', 'D2'])),
      drums('x - x - x - x x'),
    ],
  },
  southlands: {
    id: 'southlands',
    bpm: 112,
    voices: [
      lead(
        'D4 . Eb4 . F#4 . G4 . | A4 . G4 F#4 Eb4 . D4 . | D4 . Eb4 . F#4 . A4 . | Bb4 . A4 . . . - - | ' +
          'C5 . Bb4 A4 G4 . A4 . | Bb4 . A4 G4 F#4 . G4 . | A4 . G4 F#4 Eb4 . F#4 . | D4 . . . . . - -',
      ),
      bass(
        'D2 . A2 . D2 . A2 . | D2 . A2 . D2 . A2 . | D2 . A2 . D2 . A2 . | D2 . A2 . D2 . A2 . | ' +
          'C2 . G2 . C2 . G2 . | Bb1 . F2 . Bb1 . F2 . | D2 . A2 . D2 . A2 . | D2 . A2 . D2 . - -',
      ),
      drums('x - - x - - x -'),
    ],
  },
  frostpeaks: {
    id: 'frostpeaks',
    bpm: 84,
    voices: [
      { wave: 'triangle', volume: 0.07, notes:
        'E5 . . . B4 . . . | C5 . . . B4 . A4 . | G4 . . . A4 . B4 . | B4 . . . . . - - | ' +
        'E5 . . . D5 . . . | C5 . . . B4 . A4 . | B4 . G4 . F#4 . . . | E4 . . . . . - -' },
      lead(
        'E4 G4 B4 G4 E4 G4 B4 G4 | C4 E4 G4 E4 C4 E4 G4 E4 | G3 B3 D4 B3 G3 B3 D4 B3 | ' +
          'B3 D#4 F#4 D#4 B3 D#4 F#4 D#4 | E4 G4 B4 G4 E4 G4 B4 G4 | A3 C4 E4 C4 A3 C4 E4 C4 | ' +
          'B3 D#4 F#4 D#4 B3 D#4 F#4 D#4 | E4 G4 B4 G4 E4 - - -',
        0.015,
      ),
      bass(
        'E2 . . . . . . . | C2 . . . . . . . | G2 . . . . . . . | B1 . . . . . . . | ' +
          'E2 . . . . . . . | A1 . . . . . . . | B1 . . . . . . . | E2 . . . . . - -',
      ),
    ],
  },
  embermountains: {
    id: 'embermountains',
    bpm: 120,
    voices: [
      lead(
        'C5 . . Bb4 G4 . . - | Ab4 . G4 . F4 . G4 . | C5 . . Bb4 G4 . . - | Ab4 . Bb4 . C5 . . - | ' +
          'Eb5 . . D5 C5 . . - | Bb4 . Ab4 . G4 . . - | Ab4 . G4 . F4 . D4 . | C4 . . . . . - -',
      ),
      bass(pump(['C2', 'F1', 'C2', 'Ab1', 'Eb2', 'Bb1', 'F1', 'G1'])),
      drums('x - x - x - x x'),
    ],
  },
  dungeon: {
    id: 'dungeon',
    bpm: 90,
    voices: [
      lead(
        'A4 . . . C5 . B4 . | A4 . . . E4 . . . | F4 . . . A4 . G4 . | E4 . . . . . - - | ' +
          'A4 . . . C5 . D5 . | E5 . . . D5 . C5 . | B4 . . . G#4 . . . | A4 . . . . . - -',
        0.025,
      ),
      bass(
        'A2 . . E2 . . A2 . | A2 . . E2 . . A2 . | F2 . . C3 . . F2 . | E2 . . B2 . . E2 . | ' +
          'A2 . . E2 . . A2 . | C3 . . G2 . . C3 . | E2 . . B2 . . E2 . | A2 . . E2 . . A2 .',
      ),
      drums('x - - - - - - -', 8, 0.012),
    ],
  },
  battle: {
    id: 'battle',
    bpm: 150,
    voices: [
      lead(
        'A4 A4 C5 A4 E5 . D5 C5 | B4 . G4 . B4 . D5 . | A4 A4 C5 A4 E5 . F5 E5 | D5 . B4 . G#4 . . - | ' +
          'F5 . E5 D5 C5 . D5 E5 | D5 . C5 B4 A4 . B4 C5 | B4 . A4 G#4 A4 . B4 . | A4 . E4 . A4 . - -',
      ),
      bass(pump(['A1', 'G1', 'A1', 'E1', 'F1', 'D1', 'E1', 'A1'])),
      drums('x - x x x - x x'),
    ],
  },
  boss: {
    id: 'boss',
    bpm: 140,
    voices: [
      lead(
        'D5 . . . C#5 . D5 . | F5 . E5 . D5 . C#5 . | D5 . . . A4 . Bb4 . | G4 . . . A4 . . - | ' +
          'D5 . . . C#5 . D5 . | F5 . G5 . A5 . . . | Bb5 . A5 . G5 . F5 . | E5 . C#5 . A4 . . -',
      ),
      bass(pump(['D1', 'Bb0', 'G1', 'A1', 'D1', 'F1', 'G1', 'A1'])),
      drums('x - x - x x x -'),
    ],
  },
  finalBoss: {
    id: 'finalBoss',
    bpm: 156,
    voices: [
      lead(
        'E5 . F5 . E5 . B4 . | C5 . B4 . A4 . B4 . | E5 . F5 . G5 . F5 . | E5 . . . . . - - | ' +
          'B5 . A5 . G5 . F5 . | E5 . F5 . G5 . A5 . | B5 . . . A5 . F5 . | E5 . . . . . - -',
      ),
      bass(pump(['E1', 'A0', 'C1', 'B0', 'E1', 'D1', 'C1', 'B0'])),
      drums('x x x - x x x x'),
    ],
  },
};

/** The track for a scene music id, or null for silence / an unknown id. */
export function musicTrack(id: string | null): MusicTrack | null {
  return id && Object.prototype.hasOwnProperty.call(TRACKS, id) ? TRACKS[id as MusicId] : null;
}

/** Overland maps with their own theme; other wilds fall back to the Greenwood theme. */
const REGION_MUSIC: Readonly<Record<string, MusicId>> = {
  overworld: 'overworld',
  southlands: 'southlands',
  frostpeaks: 'frostpeaks',
  embermountains: 'embermountains',
};

/** Music for exploring a map: caves and lairs share the dungeon theme, safe maps (towns) the town theme. */
export function musicForMap(def: MapDef): MusicId {
  if (def.backdrop === 'cave') {
    return 'dungeon';
  }
  if (!mapHasEncounters(def)) {
    return 'town';
  }
  return REGION_MUSIC[def.id] ?? 'overworld';
}
