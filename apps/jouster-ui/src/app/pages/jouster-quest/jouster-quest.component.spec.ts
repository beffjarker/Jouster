import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ActivatedRoute } from '@angular/router';
import { JousterQuestComponent, integerScale } from './jouster-quest.component';

const mockStart = jest.fn();
const mockDestroy = jest.fn();
let mockShouldThrow = false;
let mockLastOptions:
  | { keySource?: EventTarget; art?: string; onSceneChange?(id: string | undefined): void }
  | undefined;

jest.mock('@jouster/game/quest', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors the exported constant name
  CONTROLS: [
    { keys: ['Arrows', 'WASD'], codes: ['ArrowUp'], label: 'move and choose' },
    { keys: ['X', 'Esc', 'Backspace'], codes: ['KeyX'], label: 'open the menu and go back' },
  ],
  // eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors the exported constant name
  TEXT_ENTRY_SCENES: ['name-entry'],
  artStyleFromQuery: (search: string) => (search.includes('art=classic') ? 'classic' : 'lpc'),
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
    expect(canvas?.width).toBe(960);
    expect(canvas?.height).toBe(540);
    expect(mockLastOptions?.keySource).toBe(canvas);
    expect(mockLastOptions?.art).toBe('lpc');
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
    const rows = spectator.queryAll('.controls li');
    expect(rows.length).toBe(2);
    expect(rows[1].querySelectorAll('kbd').length).toBe(3);
    expect(rows[1]).toHaveText('Backspace');
    expect(rows[1]).toHaveText('open the menu and go back');
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
