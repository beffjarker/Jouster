import { InputAction, InputManager, KeyEventSource } from '@jouster/game/engine';

const CODES: Record<InputAction, string> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  confirm: 'KeyZ',
  cancel: 'KeyX',
  mute: 'KeyM',
};

/** Keyboard double for headless scene tests. */
export class FakeKeys implements KeyEventSource {
  private readonly listeners = new Map<string, Array<(e: Event) => void>>();

  public addEventListener(type: string, listener: (event: Event) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  public removeEventListener(type: string, listener: (event: Event) => void): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((l) => l !== listener),
    );
  }

  public emit(type: 'keydown' | 'keyup', code: string, key = ''): void {
    const event = { code, key, repeat: false, preventDefault: () => undefined, target: null } as unknown as Event;
    (this.listeners.get(type) ?? []).forEach((l) => l(event));
  }

  public down(action: InputAction): void {
    this.emit('keydown', CODES[action]);
  }

  public up(action: InputAction): void {
    this.emit('keyup', CODES[action]);
  }
}

/** Drives an update function at 60 Hz with fake keyboard input. */
export class InputDriver {
  public readonly keys = new FakeKeys();
  public readonly input = new InputManager(this.keys);

  constructor(private readonly step: (dt: number, input: InputManager) => void) {
    this.input.attach();
  }

  public frame(): void {
    this.step(1 / 60, this.input);
    this.input.endFrame();
  }

  public run(seconds: number): void {
    for (let t = 0; t < seconds; t += 1 / 60) {
      this.frame();
    }
  }

  public tap(action: InputAction): void {
    this.keys.down(action);
    this.frame();
    this.keys.up(action);
    this.run(0.1);
  }

  public hold(action: InputAction, seconds: number): void {
    this.keys.down(action);
    this.run(seconds);
    this.keys.up(action);
  }

  /** Types a character or a named key (`Enter`, `Backspace`, `Escape`). */
  public type(key: string): void {
    const code = key.length === 1 ? `Key${key.toUpperCase()}` : key;
    this.keys.emit('keydown', code, key);
    this.frame();
    this.keys.emit('keyup', code, key);
    this.run(0.05);
  }
}
