import { AudioManager } from './audio';
import { MusicTrack, noteFrequency, parseTrack, parseVoice, stepDuration } from './music';

class FakeParam {
  public value = 1;
  public setValueAtTime = jest.fn();
  public linearRampToValueAtTime = jest.fn();
  public exponentialRampToValueAtTime = jest.fn();
  public cancelScheduledValues = jest.fn();
}

class FakeNode {
  public connect = jest.fn((next: FakeNode) => next);
  public disconnect = jest.fn();
}

class FakeGain extends FakeNode {
  public gain = new FakeParam();
}

class FakeSource extends FakeNode {
  public type = '';
  public buffer: unknown = null;
  public frequency = new FakeParam();
  public start = jest.fn();
  public stop = jest.fn();
}

class FakeAudioContext {
  public static instances: FakeAudioContext[] = [];
  public currentTime = 0;
  public sampleRate = 8000;
  public state = 'running';
  public destination = new FakeNode();
  public oscillators: FakeSource[] = [];
  public sources: FakeSource[] = [];
  public gains: FakeGain[] = [];

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  public createOscillator(): FakeSource {
    const osc = new FakeSource();
    this.oscillators.push(osc);
    return osc;
  }

  public createBufferSource(): FakeSource {
    const src = new FakeSource();
    this.sources.push(src);
    return src;
  }

  public createGain(): FakeGain {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }

  public createBuffer(_channels: number, length: number): { getChannelData(): Float32Array } {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }

  public resume(): Promise<void> {
    return Promise.resolve();
  }

  public close(): Promise<void> {
    return Promise.resolve();
  }
}

const TRACK: MusicTrack = {
  id: 'test',
  bpm: 120,
  voices: [
    { wave: 'square', volume: 0.04, notes: 'C4 . E4 - | G4 . . -' },
    { wave: 'noise', volume: 0.02, notes: 'x - x - | x - x -' },
  ],
};
const OTHER: MusicTrack = { id: 'other', bpm: 90, voices: [{ wave: 'triangle', volume: 0.04, notes: 'A3 B3' }] };

describe('music notation', () => {
  it('maps note names to equal-tempered frequencies', () => {
    expect(noteFrequency('A4')).toBeCloseTo(440, 6);
    expect(noteFrequency('A5')).toBeCloseTo(880, 6);
    expect(noteFrequency('C4')).toBeCloseTo(261.63, 1);
    expect(noteFrequency('C#4')).toBeCloseTo(noteFrequency('Db4'), 6);
    expect(noteFrequency('Bb2')).toBeCloseTo(116.54, 1);
    expect(() => noteFrequency('H4')).toThrow();
  });

  it('parses holds, rests, noise hits and bar lines', () => {
    const voice = parseVoice('C4 . E4 - | G4 . . -');
    expect(voice.length).toBe(8);
    expect(voice.notes.map((n) => [n.step, n.steps])).toEqual([
      [0, 2],
      [2, 1],
      [4, 3],
    ]);
    expect(parseVoice('x - x').notes.map((n) => n.freq)).toEqual([0, 0]);
    expect(() => parseVoice('C4 Q9')).toThrow();
  });

  it('validates tracks and derives the step length', () => {
    expect(parseTrack(TRACK)).toHaveLength(2);
    expect(stepDuration(TRACK)).toBeCloseTo(0.25, 6);
    expect(() => parseTrack({ ...TRACK, voices: [TRACK.voices[0], { ...TRACK.voices[1], notes: 'x -' }] })).toThrow();
  });
});

describe('AudioManager music', () => {
  // The engine tests run in node, so provide a minimal `window` with a fake WebAudio context.
  const host = globalThis as unknown as { window?: Record<string, unknown> };
  const original = host.window;
  const win: Record<string, unknown> = {};

  beforeEach(() => {
    jest.useFakeTimers();
    FakeAudioContext.instances = [];
    win['AudioContext'] = FakeAudioContext;
    host.window = win;
  });

  afterEach(() => {
    jest.useRealTimers();
    host.window = original;
  });

  const ctx = (): FakeAudioContext => FakeAudioContext.instances[0];

  it('schedules notes ahead and keeps looping as time advances', () => {
    const audio = new AudioManager();
    audio.playMusic(TRACK);
    expect(audio.musicId).toBe('test');
    // 0.25 s lookahead at 0.25 s per step: only the first step (C4 + a hat) is queued.
    expect(ctx().oscillators).toHaveLength(1);
    expect(ctx().oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(expect.closeTo(261.63, 1), 0.05);
    expect(ctx().sources).toHaveLength(1);

    for (let i = 0; i < 20; i++) {
      ctx().currentTime += 0.1;
      jest.advanceTimersByTime(50);
    }
    // One full loop (8 steps) plus the first step again: C4, E4, G4, C4.
    expect(ctx().oscillators).toHaveLength(4);
    expect(ctx().sources).toHaveLength(5);
    audio.dispose();
  });

  it('skips ahead instead of bursting stale notes after falling behind', () => {
    const audio = new AudioManager();
    audio.playMusic(TRACK);
    ctx().currentTime = 60;
    jest.advanceTimersByTime(50);
    const starts = ctx().oscillators.flatMap((o) => o.start.mock.calls.map((c) => c[0] as number));
    expect(starts.every((t) => t < 1 || t >= 60)).toBe(true);
    expect(ctx().sources.length).toBeLessThanOrEqual(2);
    audio.dispose();
  });

  it('ignores repeated requests for the current track and crossfades to a new one', () => {
    const audio = new AudioManager();
    audio.playMusic(TRACK);
    const first = ctx().gains[0];
    audio.playMusic(TRACK);
    expect(ctx().gains.filter((g) => g.connect.mock.calls[0]?.[0] === ctx().destination)).toHaveLength(1);

    audio.playMusic(OTHER);
    expect(audio.musicId).toBe('other');
    expect(first.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.0001, expect.any(Number));
    jest.advanceTimersByTime(1000);
    expect(first.disconnect).toHaveBeenCalled();
    audio.playMusic(null);
    expect(audio.musicId).toBeNull();
    audio.dispose();
  });

  it('stops scheduling while muted and resumes the same track when unmuted', () => {
    const audio = new AudioManager();
    audio.playMusic(TRACK);
    audio.toggleMute();
    const before = ctx().oscillators.length;
    ctx().currentTime = 5;
    jest.advanceTimersByTime(500);
    expect(ctx().oscillators).toHaveLength(before);

    audio.playMusic(OTHER);
    expect(audio.musicId).toBe('other');
    expect(ctx().oscillators).toHaveLength(before);

    audio.toggleMute();
    expect(ctx().oscillators.length).toBeGreaterThan(before);
    expect(ctx().oscillators[ctx().oscillators.length - 1].type).toBe('triangle');
    audio.dispose();
  });

  it('is silent without WebAudio', () => {
    win['AudioContext'] = undefined;
    const audio = new AudioManager();
    expect(() => audio.playMusic(TRACK)).not.toThrow();
    expect(audio.musicId).toBe('test');
    audio.dispose();
  });
});

