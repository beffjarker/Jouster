import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ActivatedRoute } from '@angular/router';
import { JousterQuestComponent, integerScale } from './jouster-quest.component';

const mockStart = jest.fn();
const mockDestroy = jest.fn();
let mockShouldThrow = false;
let mockLastOptions:
  | { keySource?: EventTarget; onSceneChange?(id: string | undefined): void }
  | undefined;

jest.mock('@jouster/game/quest', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors the exported constant name
  CONTROLS: [
    { keys: ['Arrows', 'WASD'], codes: ['ArrowUp'], label: 'move and choose' },
    { keys: ['X', 'Esc', 'Backspace'], codes: ['KeyX'], label: 'open the menu and go back' },
  ],
  // eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors the exported constant name
  TEXT_ENTRY_SCENES: ['name-entry'],
  // eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors the exported constant name
  POINTER_CONTROLS: [
    { input: 'Click / tap the map', label: 'walk there' },
    { input: 'Right-click', label: 'open the menu and go back' },
  ],
  // eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors the exported constant name
  TOUCH_BUTTONS: [
    { id: 'up', label: 'U', name: 'Up', code: 'ArrowUp', key: 'ArrowUp', repeat: true },
    { id: 'a', label: 'A', name: 'A: confirm', code: 'Enter', key: 'Enter' },
    { id: 'b', label: 'B', name: 'B: menu and back', code: 'Escape', key: 'Escape' },
    { id: 'map', label: 'MAP', name: 'World map', code: 'KeyM', key: 'Unidentified' },
  ],
  // eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors the exported class name
  JousterQuestGame: jest.fn().mockImplementation((_canvas: HTMLCanvasElement, options: typeof mockLastOptions) => {
    if (mockShouldThrow) {
      throw new Error('Canvas 2D context is not available');
    }
    mockLastOptions = options;
    return { start: mockStart, destroy: mockDestroy };
  }),
}));

describe('JousterQuestComponent', () => {
  let spectator: Spectator<JousterQuestComponent>;

  const createComponent = createComponentFactory({
    component: JousterQuestComponent,
    providers: [{ provide: ActivatedRoute, useValue: { snapshot: { data: {} } } }],
  });

  beforeEach(() => {
    mockStart.mockClear();
    mockDestroy.mockClear();
    mockShouldThrow = false;
    mockLastOptions = undefined;
  });

  it('starts the game on a pixel canvas and tears it down on destroy', () => {
    spectator = createComponent();
    const canvas = spectator.query<HTMLCanvasElement>('canvas.game-screen');
    expect(canvas?.width).toBe(1920);
    expect(canvas?.height).toBe(1080);
    expect(mockLastOptions?.keySource).toBe(canvas);
    expect(mockStart).toHaveBeenCalledTimes(1);
    spectator.fixture.destroy();
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it('exposes the active scene for e2e tests', () => {
    spectator = createComponent();
    mockLastOptions?.onSceneChange?.('title');
    expect(spectator.query('canvas')?.getAttribute('data-scene')).toBe('title');
  });

  it('shows a fallback message when the game cannot start', () => {
    mockShouldThrow = true;
    spectator = createComponent();
    spectator.detectChanges();
    expect(spectator.query('.unsupported')).toHaveText('does not support');
  });

  it('renders one controls row per CONTROLS entry, with every key label', () => {
    spectator = createComponent();
    expect(spectator.query('.controls')).toHaveText('Controls');
    const rows = spectator.queryAll('.key-controls li');
    expect(rows.length).toBe(2);
    expect(rows[1].querySelectorAll('kbd').length).toBe(3);
    expect(rows[1]).toHaveText('Backspace');
    expect(rows[1]).toHaveText('open the menu and go back');
  });

  it('lists the mouse and touch controls', () => {
    spectator = createComponent();
    const rows = spectator.queryAll('.pointer-controls li');
    expect(rows.length).toBe(2);
    expect(rows[1]).toHaveText('Right-click');
    expect(spectator.query('.hint')).not.toHaveText('not supported');
  });

  describe('touch pad', () => {
    const keys: Array<{ type: string; code: string; key: string; repeat: boolean }> = [];
    const listen = (canvas: HTMLCanvasElement): void => {
      const record = (e: Event): void => {
        const k = e as KeyboardEvent;
        keys.push({ type: k.type, code: k.code, key: k.key, repeat: k.repeat });
      };
      canvas.addEventListener('keydown', record);
      canvas.addEventListener('keyup', record);
    };
    const pointer = (el: Element, type: string): void => {
      el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
    };

    beforeEach(() => {
      keys.length = 0;
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const showPad = (): HTMLCanvasElement => {
      spectator = createComponent();
      expect(spectator.query('.touch-pad')).toBeNull();
      spectator.click('.touch-toggle');
      spectator.detectChanges();
      const canvas = spectator.query<HTMLCanvasElement>('canvas') as HTMLCanvasElement;
      listen(canvas);
      return canvas;
    };

    it('is hidden on mouse devices until toggled on', () => {
      showPad();
      expect(spectator.queryAll('.touch-key').length).toBe(4);
      expect(spectator.query('.touch-toggle')).toHaveText('Hide touch buttons');
    });

    it('sends the button key to the game as keydown, then keyup on release', () => {
      showPad();
      const a = spectator.query('.touch-a') as HTMLElement;
      pointer(a, 'pointerdown');
      pointer(a, 'pointerup');
      expect(keys).toEqual([
        { type: 'keydown', code: 'Enter', key: 'Enter', repeat: false },
        { type: 'keyup', code: 'Enter', key: 'Enter', repeat: false },
      ]);
    });

    it('sends shortcut keys without typing letters', () => {
      showPad();
      pointer(spectator.query('.touch-map') as HTMLElement, 'pointerdown');
      expect(keys[0]).toEqual({ type: 'keydown', code: 'KeyM', key: 'Unidentified', repeat: false });
    });

    it('repeats a held direction like a held key and stops on release', () => {
      showPad();
      const up = spectator.query('.touch-up') as HTMLElement;
      pointer(up, 'pointerdown');
      jest.advanceTimersByTime(350 + 120 * 2);
      pointer(up, 'pointerleave');
      jest.advanceTimersByTime(1000);
      expect(keys.map((k) => `${k.type}${k.repeat ? '*' : ''}`)).toEqual(['keydown', 'keydown*', 'keydown*', 'keydown*', 'keyup']);
    });

    it('keeps the canvas focused when a button is pressed', () => {
      const canvas = showPad();
      canvas.focus();
      const down = new Event('pointerdown', { bubbles: true, cancelable: true });
      (spectator.query('.touch-b') as HTMLElement).dispatchEvent(down);
      expect(down.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(canvas);
    });
  });

  describe('full screen', () => {
    let request: jest.Mock;

    beforeEach(() => {
      request = jest.fn().mockResolvedValue(undefined);
    });

    const press = (canvas: HTMLCanvasElement, code: string): void => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    };

    it('F asks the browser to show the game frame full screen', () => {
      spectator = createComponent();
      const frame = spectator.query<HTMLElement>('.game-frame');
      if (!frame) {
        throw new Error('frame missing');
      }
      frame.requestFullscreen = request;
      press(spectator.query<HTMLCanvasElement>('canvas') as HTMLCanvasElement, 'KeyF');
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('ignores F while the player is typing a name', () => {
      spectator = createComponent();
      const frame = spectator.query<HTMLElement>('.game-frame') as HTMLElement;
      frame.requestFullscreen = request;
      mockLastOptions?.onSceneChange?.('name-entry');
      press(spectator.query<HTMLCanvasElement>('canvas') as HTMLCanvasElement, 'KeyF');
      expect(request).not.toHaveBeenCalled();
    });

    it('has a full screen button', () => {
      spectator = createComponent();
      (spectator.query<HTMLElement>('.game-frame') as HTMLElement).requestFullscreen = request;
      spectator.click('.fullscreen-toggle');
      expect(request).toHaveBeenCalledTimes(1);
      expect(spectator.query('.fullscreen-toggle')).toHaveText('Full screen');
    });
  });

  describe('integerScale', () => {
    it('uses the largest whole scale that fits', () => {
      expect(integerScale(1920, 1080)).toBe(2);
      expect(integerScale(2560, 1440)).toBe(2);
      expect(integerScale(3840, 2160)).toBe(4);
      expect(integerScale(1280, 1024)).toBe(1);
    });

    it('fits (fractional) when even 1x is too big', () => {
      expect(integerScale(480, 800)).toBeCloseTo(0.5);
    });
  });
});
