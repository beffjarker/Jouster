import { KEY_BINDINGS } from '@jouster/game/engine';
import { CONTROLS, POINTER_CONTROLS, TOUCH_BUTTONS } from './controls';

describe('CONTROLS (page controls list)', () => {
  const listed = CONTROLS.filter((c) => (c.scope ?? 'game') === 'game').flatMap((c) => c.codes);
  const bound = KEY_BINDINGS.map(([code]) => code);

  it('lists every key the game binds', () => {
    expect(bound.filter((code) => !listed.includes(code))).toEqual([]);
  });

  it('lists only keys the game actually binds', () => {
    expect(listed.filter((code) => !bound.includes(code))).toEqual([]);
  });

  it('lists each key once, with a label and at least one key name', () => {
    const all = CONTROLS.flatMap((c) => c.codes);
    expect(new Set(all).size).toBe(all.length);
    for (const c of CONTROLS) {
      expect(c.keys.length).toBeGreaterThan(0);
      expect(c.label.length).toBeGreaterThan(0);
    }
  });

  it('includes Backspace as a way to go back', () => {
    expect(CONTROLS.find((c) => c.codes.includes('Backspace'))?.keys).toContain('Backspace');
  });
});

describe('POINTER_CONTROLS and TOUCH_BUTTONS', () => {
  const bound = new Map(KEY_BINDINGS);

  it('lists mouse and touch gestures with labels', () => {
    expect(POINTER_CONTROLS.length).toBeGreaterThan(0);
    for (const c of POINTER_CONTROLS) {
      expect(c.input.length).toBeGreaterThan(0);
      expect(c.label.length).toBeGreaterThan(0);
    }
  });

  it('gives every game action a touch button that sends a bound key', () => {
    const actions = TOUCH_BUTTONS.map((b) => bound.get(b.code));
    expect(actions).not.toContain(undefined);
    expect(new Set(actions)).toEqual(new Set(KEY_BINDINGS.map(([, action]) => action)));
  });

  it('never types letters from shortcut buttons', () => {
    for (const b of TOUCH_BUTTONS.filter((t) => t.code.startsWith('Key'))) {
      expect(b.key).toBe('Unidentified');
    }
  });
});
