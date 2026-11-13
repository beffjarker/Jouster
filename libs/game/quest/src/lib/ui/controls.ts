/** One row of the controls list shown on the game page and used by tests to keep it in sync with the bindings. */
export interface ControlEntry {
  /** Key labels as shown to players, e.g. `['Z', 'Enter', 'Space']`. */
  readonly keys: readonly string[];
  /** `KeyboardEvent.code` values covered by this row. */
  readonly codes: readonly string[];
  /** What the keys do. */
  readonly label: string;
  /** `page` keys are handled by the hosting page, not the game's input manager. */
  readonly scope?: 'game' | 'page';
}

/** Single source of truth for the controls list; every bound key must appear here. */
export const CONTROLS: readonly ControlEntry[] = [
  {
    keys: ['Arrows', 'WASD'],
    codes: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'],
    label: 'move and choose',
  },
  { keys: ['Z', 'Enter', 'Space'], codes: ['KeyZ', 'Enter', 'Space'], label: 'talk, read signs and confirm' },
  {
    keys: ['X', 'Esc', 'Backspace'],
    codes: ['KeyX', 'Escape', 'Backspace'],
    label: 'open the menu and go back',
  },
  { keys: ['I'], codes: ['KeyI'], label: 'items' },
  { keys: ['E'], codes: ['KeyE'], label: 'equipment (weapons, armor, shields, accessories)' },
  { keys: ['M'], codes: ['KeyM'], label: 'world map (explored areas)' },
  { keys: ['N'], codes: ['KeyN'], label: 'mute sound' },
];
