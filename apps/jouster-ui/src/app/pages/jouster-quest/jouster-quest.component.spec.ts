import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ActivatedRoute } from '@angular/router';
import { JousterQuestComponent } from './jouster-quest.component';

const mockStart = jest.fn();
const mockDestroy = jest.fn();
let mockShouldThrow = false;
let mockLastOptions:
  | { keySource?: EventTarget; onSceneChange?(id: string | undefined): void }
  | undefined;

jest.mock('@jouster/game/quest', () => ({
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
    expect(canvas?.width).toBe(256);
    expect(canvas?.height).toBe(240);
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

  it('lists the keyboard controls', () => {
    spectator = createComponent();
    expect(spectator.query('.controls')).toHaveText('Controls');
    expect(spectator.queryAll('.controls li').length).toBe(4);
  });
});
