import { MusicTrack, MusicWave, parseTrack, stepDuration } from './music';

export type SoundId =
  | 'cursor'
  | 'confirm'
  | 'cancel'
  | 'hit'
  | 'crit'
  | 'miss'
  | 'magic'
  | 'heal'
  | 'encounter'
  | 'victory'
  | 'defeat'
  | 'levelUp'
  | 'step'
  | 'door'
  | 'coin';

interface Tone {
  freq: number;
  dur: number;
  type: OscillatorType;
  slideTo?: number;
  delay?: number;
  volume?: number;
}

const SOUNDS: Readonly<Record<SoundId, readonly Tone[]>> = {
  cursor: [{ freq: 880, dur: 0.03, type: 'square', volume: 0.05 }],
  confirm: [
    { freq: 660, dur: 0.05, type: 'square' },
    { freq: 990, dur: 0.06, type: 'square', delay: 0.05 },
  ],
  cancel: [{ freq: 330, dur: 0.08, type: 'square', slideTo: 220 }],
  hit: [{ freq: 200, dur: 0.1, type: 'sawtooth', slideTo: 60 }],
  crit: [
    { freq: 400, dur: 0.08, type: 'sawtooth', slideTo: 80 },
    { freq: 300, dur: 0.12, type: 'sawtooth', slideTo: 40, delay: 0.06 },
  ],
  miss: [{ freq: 500, dur: 0.1, type: 'triangle', slideTo: 900 }],
  magic: [{ freq: 300, dur: 0.3, type: 'triangle', slideTo: 1200 }],
  heal: [
    { freq: 523, dur: 0.1, type: 'triangle' },
    { freq: 659, dur: 0.1, type: 'triangle', delay: 0.1 },
    { freq: 784, dur: 0.15, type: 'triangle', delay: 0.2 },
  ],
  encounter: [
    { freq: 220, dur: 0.1, type: 'square' },
    { freq: 233, dur: 0.1, type: 'square', delay: 0.1 },
    { freq: 247, dur: 0.1, type: 'square', delay: 0.2 },
    { freq: 262, dur: 0.2, type: 'square', delay: 0.3 },
  ],
  victory: [
    { freq: 523, dur: 0.12, type: 'square' },
    { freq: 523, dur: 0.12, type: 'square', delay: 0.13 },
    { freq: 523, dur: 0.12, type: 'square', delay: 0.26 },
    { freq: 698, dur: 0.4, type: 'square', delay: 0.4 },
  ],
  defeat: [{ freq: 300, dur: 0.8, type: 'triangle', slideTo: 60 }],
  levelUp: [
    { freq: 523, dur: 0.08, type: 'square' },
    { freq: 659, dur: 0.08, type: 'square', delay: 0.08 },
    { freq: 784, dur: 0.08, type: 'square', delay: 0.16 },
    { freq: 1047, dur: 0.25, type: 'square', delay: 0.24 },
  ],
  step: [{ freq: 90, dur: 0.02, type: 'triangle', volume: 0.03 }],
  door: [{ freq: 150, dur: 0.15, type: 'square', slideTo: 300 }],
  coin: [
    { freq: 988, dur: 0.05, type: 'square' },
    { freq: 1319, dur: 0.15, type: 'square', delay: 0.05 },
  ],
};

/** How far ahead (seconds) music notes are scheduled, and how often (ms) the scheduler runs. */
const MUSIC_LOOKAHEAD = 0.25;
const MUSIC_TICK_MS = 50;
/** Crossfade time (seconds) when the music changes or stops. */
const MUSIC_FADE = 0.4;

interface StepNote {
  readonly wave: MusicWave;
  readonly volume: number;
  readonly freq: number;
  readonly steps: number;
}

interface MusicPlayback {
  readonly track: MusicTrack;
  readonly gain: GainNode;
  /** Notes starting on each step, across all voices. */
  readonly steps: readonly (readonly StepNote[])[];
  readonly stepDur: number;
  step: number;
  nextTime: number;
  timer: ReturnType<typeof setInterval>;
}

/**
 * Tiny chiptune SFX and music player using WebAudio oscillators. The AudioContext is created lazily on
 * first use (browsers require a user gesture), and failures are silently ignored. Muting silences both.
 */
export class AudioManager {
  public muted = false;
  private ctx: AudioContext | null = null;
  private track: MusicTrack | null = null;
  private playback: MusicPlayback | null = null;
  private noise: AudioBuffer | null = null;

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopPlayback();
    } else {
      this.startPlayback();
    }
    return this.muted;
  }

  /** Id of the track that should be playing (even while muted), or null. */
  public get musicId(): string | null {
    return this.track?.id ?? null;
  }

  /**
   * Loops `track` (crossfading from the current one), or fades the music out for `null`. Asking for the
   * track that is already playing does nothing, so this is safe to call every frame.
   */
  public playMusic(track: MusicTrack | null): void {
    if ((track?.id ?? null) === this.musicId) {
      return;
    }
    this.track = track;
    this.stopPlayback();
    if (!this.muted) {
      this.startPlayback();
    }
  }

  public play(id: SoundId): void {
    if (this.muted) {
      return;
    }
    const ctx = this.context();
    if (!ctx) {
      return;
    }
    const now = ctx.currentTime;
    for (const tone of SOUNDS[id]) {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + (tone.delay ?? 0);
        osc.type = tone.type;
        osc.frequency.setValueAtTime(tone.freq, start);
        if (tone.slideTo) {
          osc.frequency.exponentialRampToValueAtTime(tone.slideTo, start + tone.dur);
        }
        gain.gain.setValueAtTime(tone.volume ?? 0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + tone.dur + 0.02);
      } catch {
        return;
      }
    }
  }

  public dispose(): void {
    this.stopPlayback();
    this.track = null;
    this.noise = null;
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }

  private startPlayback(): void {
    const track = this.track;
    const ctx = track ? this.context() : null;
    if (!track || !ctx) {
      return;
    }
    try {
      const voices = parseTrack(track);
      const steps: StepNote[][] = Array.from({ length: voices[0].length }, () => []);
      voices.forEach((voice, i) => {
        const { wave, volume } = track.voices[i];
        for (const n of voice.notes) {
          steps[n.step].push({ wave, volume, freq: n.freq, steps: n.steps });
        }
      });
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(1, now + MUSIC_FADE);
      gain.connect(ctx.destination);
      const playback: MusicPlayback = {
        track,
        gain,
        steps,
        stepDur: stepDuration(track),
        step: 0,
        nextTime: now + 0.05,
        timer: setInterval(() => this.schedule(playback), MUSIC_TICK_MS),
      };
      this.playback = playback;
      this.schedule(playback);
    } catch {
      this.playback = null;
    }
  }

  private stopPlayback(): void {
    const playback = this.playback;
    if (!playback) {
      return;
    }
    this.playback = null;
    clearInterval(playback.timer);
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }
    try {
      const now = ctx.currentTime;
      const gain = playback.gain.gain;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value, now);
      gain.linearRampToValueAtTime(0.0001, now + MUSIC_FADE);
      setTimeout(() => playback.gain.disconnect(), (MUSIC_FADE + MUSIC_LOOKAHEAD) * 1000 + 100);
    } catch {
      return;
    }
  }

  /** Queues every step that starts within the lookahead window. */
  private schedule(playback: MusicPlayback): void {
    const ctx = this.ctx;
    if (!ctx || this.playback !== playback) {
      return;
    }
    const now = ctx.currentTime;
    if (playback.nextTime < now) {
      // Fell behind (e.g. a background tab): skip ahead instead of playing a burst of stale notes.
      playback.nextTime = now + 0.05;
    }
    while (playback.nextTime < now + MUSIC_LOOKAHEAD) {
      for (const note of playback.steps[playback.step]) {
        this.playNote(ctx, playback, note, playback.nextTime);
      }
      playback.nextTime += playback.stepDur;
      playback.step = (playback.step + 1) % playback.steps.length;
    }
  }

  private playNote(ctx: AudioContext, playback: MusicPlayback, note: StepNote, start: number): void {
    try {
      const gain = ctx.createGain();
      if (note.wave === 'noise') {
        const dur = Math.min(0.08, playback.stepDur);
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer(ctx);
        gain.gain.setValueAtTime(note.volume, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        src.connect(gain).connect(playback.gain);
        src.start(start);
        src.stop(start + dur + 0.01);
        return;
      }
      const dur = note.steps * playback.stepDur;
      const osc = ctx.createOscillator();
      osc.type = note.wave;
      osc.frequency.setValueAtTime(note.freq, start);
      gain.gain.setValueAtTime(note.volume, start);
      gain.gain.setValueAtTime(note.volume, start + dur * 0.7);
      gain.gain.linearRampToValueAtTime(0.0001, start + dur * 0.95);
      osc.connect(gain).connect(playback.gain);
      osc.start(start);
      osc.stop(start + dur);
    } catch {
      return;
    }
  }

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noise) {
      const length = Math.floor(ctx.sampleRate * 0.1);
      this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return this.noise;
  }

  private context(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => undefined);
      }
      return this.ctx;
    }
    const audioContextCtor = typeof window !== 'undefined' ? window.AudioContext : undefined;
    if (!audioContextCtor) {
      return null;
    }
    try {
      this.ctx = new audioContextCtor();
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }
}
