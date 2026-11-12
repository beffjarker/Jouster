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

/**
 * Tiny chiptune SFX player using WebAudio oscillators. The AudioContext is created lazily on
 * first use (browsers require a user gesture), and failures are silently ignored.
 */
export class AudioManager {
  public muted = false;
  private ctx: AudioContext | null = null;

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
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
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
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
