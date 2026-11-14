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
  { keys: ['I'], codes: ['KeyI'], label: 'items (press again to close)' },
  { keys: ['E'], codes: ['KeyE'], label: 'equipment: weapons, armor, shields, accessories (press again to close)' },
  { keys: ['M'], codes: ['KeyM'], label: 'world map of explored areas (press again to close)' },
  { keys: ['N'], codes: ['KeyN'], label: 'mute sound' },
  { keys: ['F'], codes: ['KeyF'], label: 'full screen (not while typing a name)', scope: 'page' },
];

/** Scene ids where letter keys are typed text, so page shortcuts such as full screen must be ignored. */
export const TEXT_ENTRY_SCENES: readonly string[] = ['name-entry'];

/** One row of the mouse and touch controls list shown on the game page. */
export interface PointerControlEntry {
  /** Gesture as shown to players, e.g. `'Click / tap'`. */
  readonly input: string;
  /** What the gesture does. */
  readonly label: string;
}

/** Mouse and touch controls; the game maps clicks and taps on the canvas to these actions. */
export const POINTER_CONTROLS: readonly PointerControlEntry[] = [
  { input: 'Click / tap the map', label: 'walk there (hold and drag to steer)' },
  { input: 'Click / tap a person or sign', label: 'walk up to it and talk or read' },
  { input: 'Click / tap your hero', label: 'talk to or check what is in front of you' },
  { input: 'Click / tap a menu row', label: 'choose it (hover moves the cursor)' },
  { input: 'Click / tap a monster or ally', label: 'choose the target in battle' },
  { input: 'Click / tap a message', label: 'show the rest of the text and go on' },
  { input: 'Hold the button', label: 'speed up battle messages' },
  { input: 'Right-click', label: 'open the menu and go back' },
  { input: 'Mouse wheel', label: 'scroll lists' },
  { input: 'On-screen keys', label: "type the hero's name" },
  { input: 'Touch buttons', label: 'D-pad, A (confirm), B (menu / back), items, equipment, map and mute' },
];

/** On-screen touch button: pressing it sends this key to the game, exactly like the keyboard. */
export interface TouchButton {
  readonly id: string;
  /** Text on the button. */
  readonly label: string;
  /** Accessible name. */
  readonly name: string;
  /** `KeyboardEvent.code` sent while the button is held. */
  readonly code: string;
  /** `KeyboardEvent.key` sent; `'Unidentified'` keeps shortcut buttons from typing letters. */
  readonly key: string;
  /** Direction buttons repeat while held, like a held key. */
  readonly repeat?: boolean;
}

/** Touch buttons shown under the game on touch screens. */
export const TOUCH_BUTTONS: readonly TouchButton[] = [
  { id: 'up', label: '\u25B2', name: 'Up', code: 'ArrowUp', key: 'ArrowUp', repeat: true },
  { id: 'left', label: '\u25C0', name: 'Left', code: 'ArrowLeft', key: 'ArrowLeft', repeat: true },
  { id: 'right', label: '\u25B6', name: 'Right', code: 'ArrowRight', key: 'ArrowRight', repeat: true },
  { id: 'down', label: '\u25BC', name: 'Down', code: 'ArrowDown', key: 'ArrowDown', repeat: true },
  { id: 'a', label: 'A', name: 'A: confirm', code: 'Enter', key: 'Enter' },
  { id: 'b', label: 'B', name: 'B: menu and back', code: 'Escape', key: 'Escape' },
  { id: 'items', label: 'ITEMS', name: 'Items', code: 'KeyI', key: 'Unidentified' },
  { id: 'equip', label: 'EQUIP', name: 'Equipment', code: 'KeyE', key: 'Unidentified' },
  { id: 'map', label: 'MAP', name: 'World map', code: 'KeyM', key: 'Unidentified' },
  { id: 'mute', label: 'MUTE', name: 'Mute sound', code: 'KeyN', key: 'Unidentified' },
];
