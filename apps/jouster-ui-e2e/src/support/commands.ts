/// <reference types="cypress" />

/** A keyboard key as the game reads it: `code` picks the action, `key` feeds text entry. */
export interface QuestKey {
  code: string;
  key: string;
}

export const QUEST_KEYS = {
  up: { code: 'ArrowUp', key: 'ArrowUp' },
  confirm: { code: 'KeyZ', key: 'z' },
  cancel: { code: 'KeyX', key: 'x' },
  enter: { code: 'Enter', key: 'Enter' },
} as const satisfies Record<string, QuestKey>;

export const QUEST_SAVE_KEY = 'jouster-quest-save-v1';

/** Long enough for a few game frames, so a held key is seen by `isDown` and a tap by `wasPressed`. */
const KEY_HOLD_MS = 50;
/**
 * After a press, how long to keep re-checking before pressing again. Longer than a scene fade (0.25 s), during which
 * the old scene id stays on the canvas and input is dropped, so a press that already worked is never repeated.
 */
const SETTLE_MS = 600;
const POLL_MS = 50;
const SCREEN = '[data-automation-id="jouster-quest-screen"]';

/** Whether to stop pressing, given the window and the top scene's id (the canvas `data-scene`). */
export type QuestCheck = (win: Cypress.AUTWindow, scene: string) => boolean;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Chainable<Subject> {
      /** The Jouster Quest canvas. */
      questScreen(): Chainable<JQuery<HTMLCanvasElement>>;
      /** Presses and releases a key on the focused game canvas. */
      questPress(key: QuestKey): Chainable<void>;
      /** Presses `keys` in order (re-checking between rounds) until `check` passes; fails after `maxRounds`. */
      questPressUntil(
        keys: QuestKey | readonly QuestKey[],
        check: QuestCheck,
        maxRounds?: number
      ): Chainable<void>;
      /** The parsed Jouster Quest save in localStorage, or null. */
      questSave(): Chainable<Record<string, unknown> | null>;
    }
  }
}

Cypress.Commands.add('questScreen', () => cy.get<HTMLCanvasElement>(SCREEN));

Cypress.Commands.add('questPress', (key: QuestKey) => {
  cy.questScreen().focus();
  cy.questScreen().trigger('keydown', { ...key, bubbles: true });
  // The game samples input once per animation frame, so the key must stay down for at least one frame.
  // eslint-disable-next-line cypress/no-unnecessary-waiting
  cy.wait(KEY_HOLD_MS);
  cy.questScreen().trigger('keyup', { ...key, bubbles: true });
  // eslint-disable-next-line cypress/no-unnecessary-waiting
  cy.wait(KEY_HOLD_MS);
});

Cypress.Commands.add(
  'questPressUntil',
  (keys: QuestKey | readonly QuestKey[], check: QuestCheck, maxRounds = 30) => {
    const sequence: readonly QuestKey[] = Array.isArray(keys)
      ? keys
      : [keys as QuestKey];
    // `waited` starts full so the first round presses at once; after each round the check gets SETTLE_MS to pass.
    const attempt = (left: number, waited: number): void => {
      cy.window().then((win) => {
        cy.questScreen()
          .invoke('attr', 'data-scene')
          .then((scene) => {
            if (check(win, scene ?? '')) {
              return;
            }
            if (waited < SETTLE_MS) {
              // eslint-disable-next-line cypress/no-unnecessary-waiting
              cy.wait(POLL_MS);
              attempt(left, waited + POLL_MS);
              return;
            }
            if (left <= 0) {
              const codes = sequence.map((k) => k.code).join('+');
              throw new Error(
                `Pressed ${codes} ${maxRounds} times; check still fails on scene "${scene}"`
              );
            }
            sequence.forEach((k) => cy.questPress(k));
            attempt(left - 1, 0);
          });
      });
    };
    attempt(maxRounds, SETTLE_MS);
  }
);

Cypress.Commands.add('questSave', () =>
  cy.window().then((win) => {
    const raw = win.localStorage.getItem(QUEST_SAVE_KEY);
    return cy.wrap<Record<string, unknown> | null>(
      raw ? (JSON.parse(raw) as Record<string, unknown>) : null,
      {
        log: false,
      }
    );
  })
);
