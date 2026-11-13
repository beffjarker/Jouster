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
import { Art, ArtStyle } from './art/art';
import { loadLpcSheets } from './art/sheet-loader';
import { GameContext } from './scenes/context';
import { TitleScene } from './scenes/title-scene';
import { SaveStorage, memoryStorage } from './state/game-state';
import { SCREEN_H, SCREEN_W } from './ui/widgets';

export interface JousterQuestOptions {
  /** Where saves go; defaults to `window.localStorage` (or an in-memory store if unavailable). */
  storage?: SaveStorage;
  /** Keyboard event source; defaults to `window`. Pass the canvas to only react while it has focus. */
  keySource?: KeyEventSource;
  /** Set false to ignore mouse and touch on the canvas (keyboard only). Defaults to true. */
  pointer?: boolean;
  /** Notified with the active scene id whenever the scene stack changes. */
  onSceneChange?(sceneId: string | undefined): void;
  scheduler?: FrameScheduler;
  seed?: number;
  /**
   * Art style: `classic` (procedural only; the default when omitted) or `lpc`, which loads the LPC sheets in
   * the background and switches tiles, characters and monsters over once they arrive (procedural art until
   * then, or if loading fails). The page passes {@link artStyleFromQuery}, which defaults to `lpc`.
   */
  art?: ArtStyle;
  /** Folder URL of the LPC sheets; defaults to `game-assets/lpc/`. */
  lpcAssetBase?: string;
}

/** Reads the art style from the page URL query: LPC sheet art unless it asks for `?art=classic`. */
export function artStyleFromQuery(search: string): ArtStyle {
  return new URLSearchParams(search).get('art') === 'classic' ? 'classic' : 'lpc';
}

/** Size and position of the canvas on the page, as returned by `getBoundingClientRect`. */
export interface ScreenRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Maps a mouse / touch position (client pixels) to the 480x270 logical screen, whatever size the canvas is
 * shown at (fit to a phone, 1:1, or scaled up in full screen).
 */
export function clientToLogical(clientX: number, clientY: number, rect: ScreenRect): { x: number; y: number } {
  const x = ((clientX - rect.left) / Math.max(1, rect.width)) * SCREEN_W;
  const y = ((clientY - rect.top) / Math.max(1, rect.height)) * SCREEN_H;
  return { x: Math.max(0, Math.min(SCREEN_W - 1, x)), y: Math.max(0, Math.min(SCREEN_H - 1, y)) };
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

/** Boots Jouster Quest onto a 960x540 canvas (480x270 widescreen logical layout at 2x pixel density). Call `start()` to show the title and `destroy()` to clean up. */
export class JousterQuestGame {
  private readonly renderer: Renderer;
  private readonly input: InputManager;
  private readonly ctx: GameContext;
  private readonly loop: GameLoop;
  private readonly pointerCleanup: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement, options: JousterQuestOptions = {}) {
    const context2d = canvas.getContext('2d');
    if (!context2d) {
      throw new Error('Canvas 2D context is not available');
    }
    context2d.imageSmoothingEnabled = false;
    this.renderer = new Renderer(context2d, { pixelRatio: 2 });
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
    if (options.pointer !== false) {
      this.wirePointer(canvas);
    }
    if (options.art === 'lpc') {
      loadLpcSheets(options.lpcAssetBase)
        .then((sheets) => this.ctx.art.useSheets(sheets))
        .catch(() => undefined);
    }
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
    this.pointerCleanup.splice(0).forEach((off) => off());
    this.ctx.stack.clear();
    this.ctx.audio.dispose();
  }

  /**
   * Mouse and touch on the canvas: left button / finger = tap and drag (`input.tap` / `input.pointer`),
   * right click = back (cancel), mouse wheel = up / down in menus.
   */
  private wirePointer(canvas: HTMLCanvasElement): void {
    const at = (e: PointerEvent): { x: number; y: number } => clientToLogical(e.clientX, e.clientY, canvas.getBoundingClientRect());
    const listen = <K extends keyof HTMLElementEventMap>(
      type: K,
      handler: (e: HTMLElementEventMap[K]) => void,
      opts?: AddEventListenerOptions,
    ): void => {
      canvas.addEventListener(type, handler, opts);
      this.pointerCleanup.push(() => canvas.removeEventListener(type, handler, opts));
    };
    listen('pointerdown', (e) => {
      if (e.button === 2) {
        this.input.press('cancel');
        return;
      }
      if (e.button !== 0) {
        return;
      }
      const p = at(e);
      this.input.pointerDown(p.x, p.y);
      canvas.setPointerCapture?.(e.pointerId);
    });
    listen('pointermove', (e) => {
      const p = at(e);
      this.input.pointerMove(p.x, p.y);
    });
    const up = (e: PointerEvent): void => {
      if (e.button === 2) {
        this.input.release('cancel');
        return;
      }
      const p = at(e);
      this.input.pointerUp(p.x, p.y);
    };
    listen('pointerup', up);
    listen('pointercancel', up);
    listen('contextmenu', (e) => e.preventDefault());
    listen(
      'wheel',
      (e) => {
        if (e.deltaY === 0) {
          return;
        }
        e.preventDefault();
        const dir = e.deltaY > 0 ? 'down' : 'up';
        this.input.press(dir);
        this.input.release(dir);
      },
      { passive: false },
    );
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
