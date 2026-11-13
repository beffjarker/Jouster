export type InputAction = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'map' | 'mute' | 'items' | 'equip';

const KEY_BINDINGS: ReadonlyArray<[string, InputAction]> = [
  ['ArrowUp', 'up'],
  ['KeyW', 'up'],
  ['ArrowDown', 'down'],
  ['KeyS', 'down'],
  ['ArrowLeft', 'left'],
  ['KeyA', 'left'],
  ['ArrowRight', 'right'],
  ['KeyD', 'right'],
  ['KeyZ', 'confirm'],
  ['Enter', 'confirm'],
  ['Space', 'confirm'],
  ['KeyX', 'cancel'],
  ['Escape', 'cancel'],
  ['Backspace', 'cancel'],
  ['KeyM', 'map'],
  ['KeyN', 'mute'],
  ['KeyI', 'items'],
  ['KeyE', 'equip'],
];

const ACTION_BY_CODE = new Map<string, InputAction>(KEY_BINDINGS);

/** Minimal event-target shape so the input can be attached to `window` or a test double. */
export interface KeyEventSource {
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
}

/**
 * Keyboard input mapped to game actions.
 *
 * - `isDown` = held this frame (movement).
 * - `wasPressed` = pressed since the last `endFrame` (menus). Auto-repeat counts as a press for
 *   direction keys so menu cursors can scroll.
 * - `typed` = printable characters and `Backspace`/`Enter`/`Escape` codes for text entry.
 */
export class InputManager {
  private readonly down = new Set<InputAction>();
  private readonly pressed = new Set<InputAction>();
  private readonly typedKeys: string[] = [];
  private attached = false;

  private readonly onKeyDown = (event: Event): void => this.handleKeyDown(event as KeyboardEvent);
  private readonly onKeyUp = (event: Event): void => this.handleKeyUp(event as KeyboardEvent);
  private readonly onBlur = (): void => this.reset();

  constructor(private readonly source: KeyEventSource) {}

  public attach(): void {
    if (this.attached) {
      return;
    }
    this.source.addEventListener('keydown', this.onKeyDown);
    this.source.addEventListener('keyup', this.onKeyUp);
    this.source.addEventListener('blur', this.onBlur);
    this.attached = true;
  }

  public detach(): void {
    this.source.removeEventListener('keydown', this.onKeyDown);
    this.source.removeEventListener('keyup', this.onKeyUp);
    this.source.removeEventListener('blur', this.onBlur);
    this.attached = false;
    this.reset();
  }

  public isDown(action: InputAction): boolean {
    return this.down.has(action);
  }

  public wasPressed(action: InputAction): boolean {
    return this.pressed.has(action);
  }

  /** Keys typed since the last frame (single characters, or `Backspace`/`Enter`/`Escape`). */
  public get typed(): readonly string[] {
    return this.typedKeys;
  }

  /** Clears per-frame state; call once at the end of every update. */
  public endFrame(): void {
    this.pressed.clear();
    this.typedKeys.length = 0;
  }

  public reset(): void {
    this.down.clear();
    this.endFrame();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (isEditableTarget(event.target)) {
      return;
    }
    const action = ACTION_BY_CODE.get(event.code);
    if (event.key.length === 1 || ['Backspace', 'Enter', 'Escape'].includes(event.key)) {
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        this.typedKeys.push(event.key);
      }
    }
    if (!action) {
      return;
    }
    event.preventDefault();
    const isDirection = action === 'up' || action === 'down' || action === 'left' || action === 'right';
    if (!event.repeat || isDirection) {
      this.pressed.add(action);
    }
    this.down.add(action);
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const action = ACTION_BY_CODE.get(event.code);
    if (action) {
      this.down.delete(action);
    }
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as { tagName?: string; isContentEditable?: boolean } | null;
  if (!el || typeof el.tagName !== 'string') {
    return false;
  }
  return el.isContentEditable === true || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}
