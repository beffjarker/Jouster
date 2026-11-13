import { KEY_BINDINGS } from '@jouster/game/engine';
import { CONTROLS } from './controls';

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
