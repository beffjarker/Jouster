import { Renderer, SceneStack } from '@jouster/game/engine';
import { InputDriver } from '../testing/input-driver';
import { LINE_H, ListMenu, MenuResult, MessageScene, inRect } from './widgets';

/** Renderer double: every drawing call is a no-op. */
const nullRenderer = (): Renderer => new Proxy({}, { get: () => jest.fn() }) as unknown as Renderer;

/** Centre of row `i` (0 = first visible) of a menu drawn at (x, y). */
const rowY = (y: number, i: number): number => y + 7 + i * LINE_H + 3;

function menuHarness(labels: string[], visible = 8): { menu: ListMenu; driver: InputDriver; results: MenuResult[] } {
  const menu = new ListMenu(
    labels.map((label) => ({ label, enabled: label !== 'OFF' })),
    undefined,
    visible,
  );
  const results: MenuResult[] = [];
  const r = nullRenderer();
  const driver = new InputDriver((_dt, input) => {
    const res = menu.update(input);
    if (res) {
      results.push(res);
    }
    menu.render(r, 100, 50, 120);
  });
  driver.frame();
  return { menu, driver, results };
}

describe('inRect', () => {
  it('includes the top-left edge and excludes the bottom-right edge', () => {
    expect(inRect({ x: 10, y: 10 }, 10, 10, 5, 5)).toBe(true);
    expect(inRect({ x: 15, y: 12 }, 10, 10, 5, 5)).toBe(false);
    expect(inRect(null, 10, 10, 5, 5)).toBe(false);
  });
});

describe('ListMenu pointer input', () => {
  it('selects a row when it is tapped', () => {
    const { menu, driver, results } = menuHarness(['ONE', 'TWO', 'THREE']);
    driver.tapAt(150, rowY(50, 2));
    expect(menu.cursor).toBe(2);
    expect(results).toEqual([{ kind: 'select', index: 2 }]);
  });

  it('does not select a disabled row, but moves the cursor to it', () => {
    const { menu, driver, results } = menuHarness(['ONE', 'OFF']);
    driver.tapAt(150, rowY(50, 1));
    expect(menu.cursor).toBe(1);
    expect(results).toEqual([]);
  });

  it('ignores taps outside the menu', () => {
    const { menu, driver, results } = menuHarness(['ONE', 'TWO']);
    driver.tapAt(20, rowY(50, 1));
    expect(menu.cursor).toBe(0);
    expect(results).toEqual([]);
  });

  it('moves the cursor when the mouse hovers over a row', () => {
    const { menu, driver, results } = menuHarness(['ONE', 'TWO', 'THREE']);
    driver.hover(150, rowY(50, 1));
    expect(menu.cursor).toBe(1);
    expect(results).toEqual([]);
  });

  it('scrolls through a long list when the bottom edge is tapped', () => {
    const { menu, driver, results } = menuHarness(['A', 'B', 'C', 'D', 'E', 'F'], 3);
    // The window is 3 rows tall: the bottom margin maps to the first hidden item.
    driver.tapAt(150, 50 + menu.height() - 2);
    expect(menu.cursor).toBe(3);
    expect(results).toEqual([]);
    driver.tapAt(150, rowY(50, 2));
    expect(results).toEqual([{ kind: 'select', index: 3 }]);
  });
});

describe('MessageScene pointer input', () => {
  it('shows the whole page on the first tap and closes on the next', () => {
    const stack = new SceneStack();
    const onClose = jest.fn();
    const audio = { play: jest.fn() } as never;
    stack.push(new MessageScene(stack, audio, ['HELLO THERE, TRAVELLER.'], { onClose }));
    const driver = new InputDriver((dt, input) => stack.update(dt, input));
    driver.tapAt(240, 230);
    expect(stack.top?.id).toBe('message');
    driver.tapAt(240, 230);
    expect(stack.top).toBeUndefined();
    expect(onClose).toHaveBeenCalledWith(-1);
  });
});
