import {
  AudioManager,
  FrameScheduler,
  GameLoop,
  InputManager,
  KeyEventSource,
  Renderer,
  SceneStack,
  animationFrameScheduler,
  createRng,
  timeSeed,
} from '@jouster/game/engine';
import { Art } from './art/art';
import { GameContext } from './scenes/context';
import { TitleScene } from './scenes/title-scene';
import { SaveStorage, memoryStorage } from './state/game-state';

export interface JousterQuestOptions {
  /** Where saves go; defaults to `window.localStorage` (or an in-memory store if unavailable). */
  storage?: SaveStorage;
  /** Keyboard event source; defaults to `window`. Pass the canvas to only react while it has focus. */
  keySource?: KeyEventSource;
  /** Notified with the active scene id whenever the scene stack changes. */
  onSceneChange?(sceneId: string | undefined): void;
  scheduler?: FrameScheduler;
  seed?: number;
}

/** Scenes that consume raw typing, where the mute hotkey must not fire. */
const TEXT_ENTRY_SCENES = new Set(['name-entry']);

function defaultStorage(): SaveStorage {
  try {
    return window.localStorage;
  } catch {
    return memoryStorage();
  }
}

/** Boots Jouster Quest onto a 256x240 canvas. Call `start()` to show the title and `destroy()` to clean up. */
export class JousterQuestGame {
  private readonly renderer: Renderer;
  private readonly input: InputManager;
  private readonly ctx: GameContext;
  private readonly loop: GameLoop;

  constructor(canvas: HTMLCanvasElement, options: JousterQuestOptions = {}) {
    const context2d = canvas.getContext('2d');
    if (!context2d) {
      throw new Error('Canvas 2D context is not available');
    }
    context2d.imageSmoothingEnabled = false;
    this.renderer = new Renderer(context2d);
    this.input = new InputManager(options.keySource ?? window);
    this.ctx = {
      stack: new SceneStack((scene) => options.onSceneChange?.(scene?.id)),
      audio: new AudioManager(),
      art: new Art(),
      rng: createRng(options.seed ?? timeSeed()),
      storage: options.storage ?? defaultStorage(),
      state: null,
    };
    this.loop = new GameLoop(
      (dt) => this.update(dt),
      () => this.render(),
      options.scheduler ?? animationFrameScheduler,
    );
  }

  public get context(): GameContext {
    return this.ctx;
  }

  public start(): void {
    this.input.attach();
    this.ctx.stack.reset(new TitleScene(this.ctx));
    this.loop.start();
  }

  public destroy(): void {
    this.loop.stop();
    this.input.detach();
    this.ctx.stack.clear();
    this.ctx.audio.dispose();
  }

  private update(dt: number): void {
    const top = this.ctx.stack.top;
    if (this.input.wasPressed('mute') && !(top && TEXT_ENTRY_SCENES.has(top.id))) {
      this.ctx.audio.toggleMute();
    }
    this.ctx.stack.update(dt, this.input);
    this.input.endFrame();
    if (this.ctx.state) {
      this.ctx.state.playSeconds += dt;
    }
  }

  private render(): void {
    this.renderer.clear('#000000');
    this.ctx.stack.render(this.renderer);
  }
}
