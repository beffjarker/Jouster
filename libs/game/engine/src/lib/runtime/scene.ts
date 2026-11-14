import { InputManager } from './input';
import { Renderer } from './renderer';

/** A game screen (title, world, battle...). */
export interface Scene {
  /** Stable id used for debugging / e2e (`data-scene`). */
  readonly id: string;
  enter?(): void;
  exit?(): void;
  update(dt: number, input: InputManager): void;
  render(r: Renderer): void;
  /** When true, the scene below is rendered first (e.g. menus over the world). */
  readonly overlay?: boolean;
  /**
   * Music track id for this scene. Scenes that leave it undefined (menus, dialogs) keep the music of the
   * scene below; an empty string means silence.
   */
  readonly music?: string;
}

type PendingOp = { kind: 'push'; scene: Scene } | { kind: 'pop' } | { kind: 'replace'; scene: Scene };

const FADE_TIME = 0.25;

/**
 * Stack of scenes with optional fade-to-black transitions. Only the top scene updates.
 */
export class SceneStack {
  private readonly stack: Scene[] = [];
  private pending: PendingOp | null = null;
  private fadeOut = 0;
  private fadeIn = 0;

  constructor(private readonly onChange?: (scene: Scene | undefined) => void) {}

  public get top(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  /** Music id of the topmost scene that defines one (see {@link Scene.music}), or null if none does. */
  public get music(): string | null {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const music = this.stack[i].music;
      if (music !== undefined) {
        return music || null;
      }
    }
    return null;
  }

  public get size(): number {
    return this.stack.length;
  }

  public get transitioning(): boolean {
    return this.pending !== null || this.fadeIn > 0;
  }

  public push(scene: Scene, fade = false): void {
    this.queue({ kind: 'push', scene }, fade);
  }

  public pop(fade = false): void {
    this.queue({ kind: 'pop' }, fade);
  }

  public replace(scene: Scene, fade = false): void {
    this.queue({ kind: 'replace', scene }, fade);
  }

  /** Replaces the whole stack with a single scene. */
  public reset(scene: Scene, fade = false): void {
    while (this.stack.length > 1) {
      this.stack.pop()?.exit?.();
    }
    this.replace(scene, fade);
  }

  public update(dt: number, input: InputManager): void {
    if (this.pending) {
      this.fadeOut -= dt;
      if (this.fadeOut <= 0) {
        const op = this.pending;
        this.pending = null;
        this.apply(op);
        this.fadeIn = FADE_TIME;
        this.fadeOut = 0;
      }
      return;
    }
    if (this.fadeIn > 0) {
      this.fadeIn = Math.max(0, this.fadeIn - dt);
    }
    this.top?.update(dt, input);
  }

  public render(r: Renderer): void {
    let start = this.stack.length - 1;
    while (start > 0 && this.stack[start].overlay) {
      start--;
    }
    for (let i = Math.max(0, start); i < this.stack.length; i++) {
      this.stack[i].render(r);
    }
    if (this.pending) {
      r.fade(1 - Math.max(0, this.fadeOut) / FADE_TIME);
    } else if (this.fadeIn > 0) {
      r.fade(this.fadeIn / FADE_TIME);
    }
  }

  public clear(): void {
    while (this.stack.length) {
      this.stack.pop()?.exit?.();
    }
    this.pending = null;
  }

  private queue(op: PendingOp, fade: boolean): void {
    if (fade) {
      this.pending = op;
      this.fadeOut = FADE_TIME;
    } else {
      this.apply(op);
    }
  }

  private apply(op: PendingOp): void {
    if (op.kind === 'pop' || op.kind === 'replace') {
      this.stack.pop()?.exit?.();
    }
    if (op.kind === 'push' || op.kind === 'replace') {
      this.stack.push(op.scene);
      op.scene.enter?.();
    }
    this.onChange?.(this.top);
  }
}
