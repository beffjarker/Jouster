/** Oscillator shape of a music voice, or `noise` for a short percussive hiss (hats and snares). */
export type MusicWave = 'square' | 'triangle' | 'sawtooth' | 'noise';

/**
 * One channel of a looping chiptune track. `notes` is a space separated list with one token per step:
 * a note (`C4`, `F#3`, `Bb2`), `-` for a rest, `.` to hold the previous note or rest one more step, and `x`
 * for a noise hit. `|` may be used as a bar separator and is ignored.
 */
export interface MusicVoice {
  readonly wave: MusicWave;
  /** Peak gain of the channel (0..1; keep it small, around 0.02 to 0.05). */
  readonly volume: number;
  readonly notes: string;
}

/** A looping track. Every voice must have the same number of steps. */
export interface MusicTrack {
  readonly id: string;
  readonly bpm: number;
  /** Steps per beat; defaults to 2 (eighth notes). */
  readonly stepsPerBeat?: number;
  readonly voices: readonly MusicVoice[];
}

/** A note (or noise hit, with `freq` 0) starting at `step` and lasting `steps` steps. */
export interface MusicNote {
  readonly step: number;
  readonly steps: number;
  readonly freq: number;
}

export interface ParsedVoice {
  /** Total steps in the voice (its loop length). */
  readonly length: number;
  readonly notes: readonly MusicNote[];
}

const LETTERS = 'CDEFGAB';
const SEMITONES = [0, 2, 4, 5, 7, 9, 11];
const NOTE_RE = /^([A-G])([#b]?)(-?\d)$/;

/** Frequency in Hz of a note name such as `A4` (440), `C#5` or `Bb2`. Throws on anything else. */
export function noteFrequency(name: string): number {
  const m = NOTE_RE.exec(name);
  if (!m) {
    throw new Error(`Bad note "${name}"`);
  }
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const midi = (Number(m[3]) + 1) * 12 + SEMITONES[LETTERS.indexOf(m[1])] + accidental;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Parses one voice's note string into timed notes. Throws on unknown tokens. */
export function parseVoice(notes: string): ParsedVoice {
  const out: Array<{ step: number; steps: number; freq: number }> = [];
  let step = 0;
  let holding: { steps: number } | null = null;
  for (const token of notes.split(/\s+/)) {
    if (!token || token === '|') {
      continue;
    }
    if (token === '.') {
      if (holding) {
        holding.steps++;
      }
    } else if (token === '-') {
      holding = null;
    } else {
      const note = { step, steps: 1, freq: token === 'x' ? 0 : noteFrequency(token) };
      out.push(note);
      holding = note;
    }
    step++;
  }
  return { length: step, notes: out };
}

/** Seconds per step. */
export function stepDuration(track: MusicTrack): number {
  return 60 / track.bpm / (track.stepsPerBeat ?? 2);
}

/** Parses every voice of a track; throws if the voices have different lengths or the track is empty. */
export function parseTrack(track: MusicTrack): ParsedVoice[] {
  const voices = track.voices.map((v) => parseVoice(v.notes));
  const length = voices[0]?.length ?? 0;
  if (!length || voices.some((v) => v.length !== length)) {
    throw new Error(`Track "${track.id}" voices must be non-empty and the same length`);
  }
  return voices;
}
