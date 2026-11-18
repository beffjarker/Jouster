import { QUEST_KEYS, QUEST_SAVE_KEY } from '../support/commands';

/** The fixture's party stands on the inn rug in Aldmere, one step south of the counter, facing it. */
const INN_SAVE_FIXTURE = 'quest-save-aldmere-inn.json';
/** Same party (with 3 Herbs), one step south of the Aldmere item shop counter, facing it. */
const SHOP_SAVE_FIXTURE = 'quest-save-aldmere-shop.json';
const SEEDED_GOLD = 50;
const SEEDED_HP = 5;
const scene = (id: string) => (_win: Cypress.AUTWindow, current: string) =>
  current === id;
/** Checks the top scene's sub-view (the canvas `data-view`, e.g. a shop's `sell` list). */
const view = (id: string) => (win: Cypress.AUTWindow) =>
  win.document
    .querySelector('[data-automation-id="jouster-quest-screen"]')
    ?.getAttribute('data-view') === id;

/** Visits the game with `fixture` as the save and continues it into the world. */
const continueFrom = (fixture: string) => {
  cy.fixture(fixture).then((save: Record<string, unknown>) => {
    cy.visit('/jouster-quest', {
      onBeforeLoad: (win) =>
        win.localStorage.setItem(QUEST_SAVE_KEY, JSON.stringify(save)),
    });
  });
  cy.questScreen().should('have.attr', 'data-scene', 'title');
  // With a save, the title cursor starts on CONTINUE.
  cy.questPressUntil(QUEST_KEYS.enter, (_win, s) => s !== 'title');
  cy.questScreen().should('have.attr', 'data-scene', 'world');
};

describe('Jouster Quest @smoke @CI', () => {
  beforeEach(() => {
    cy.clearAllLocalStorage();
  });

  it('starts a new game: title, class select, name entry, intro, then the world and its menu', () => {
    cy.visit('/jouster-quest');
    cy.questScreen().should('have.attr', 'data-scene', 'title');

    cy.questPressUntil(QUEST_KEYS.enter, scene('class-select'));
    cy.questPressUntil(QUEST_KEYS.enter, scene('name-entry'));
    cy.questPressUntil(QUEST_KEYS.enter, (_win, s) => s !== 'name-entry');
    cy.questScreen().should('have.attr', 'data-scene', 'message');
    cy.questPressUntil(QUEST_KEYS.confirm, scene('world'));

    cy.questPressUntil(QUEST_KEYS.cancel, scene('field-menu'));
    cy.questPressUntil(QUEST_KEYS.cancel, scene('world'));
    cy.questSave().should('be.null');
  });

  it('continues a save, rests at the inn (which saves), and continues again after a reload', () => {
    continueFrom(INN_SAVE_FIXTURE);

    // Step up to the counter and talk to the innkeeper; repeat both in case a key lands during the fade-in.
    cy.questPressUntil([QUEST_KEYS.up, QUEST_KEYS.confirm], scene('message'));
    // Skip the typing, then choose YES (the default) until the inn takes the gold and saves.
    cy.questPressUntil(QUEST_KEYS.confirm, (win) => {
      const raw = win.localStorage.getItem(QUEST_SAVE_KEY);
      return (
        raw !== null && (JSON.parse(raw) as { gold: number }).gold < SEEDED_GOLD
      );
    });
    cy.questPressUntil(QUEST_KEYS.confirm, scene('world'));

    cy.questSave().then((save) => {
      const s = save as {
        gold: number;
        x: number;
        y: number;
        mapId: string;
        party: { hp: number }[];
      };
      expect(s.mapId).to.eq('aldmere');
      expect([s.x, s.y]).to.deep.eq([21, 24]);
      expect(s.gold).to.be.lessThan(SEEDED_GOLD);
      expect(s.party[0].hp).to.be.greaterThan(SEEDED_HP);
    });

    cy.reload();
    cy.questScreen().should('have.attr', 'data-scene', 'title');
    cy.questPressUntil(QUEST_KEYS.enter, (_win, s) => s !== 'title');
    cy.questScreen().should('have.attr', 'data-scene', 'world');
  });

  it('opens the SELL list at a shop and backs out to the world', () => {
    continueFrom(SHOP_SAVE_FIXTURE);

    // Step up to the counter and talk to the merchant, then skip the greeting until the shop opens on BUY.
    cy.questPressUntil([QUEST_KEYS.up, QUEST_KEYS.confirm], scene('message'));
    cy.questPressUntil(QUEST_KEYS.confirm, view('top'));
    cy.questScreen().should('have.attr', 'data-scene', 'shop');

    // One step down to SELL (pressed once: repeating it would wrap to LEAVE), then open the list.
    cy.questPress(QUEST_KEYS.down);
    cy.questPressUntil(QUEST_KEYS.confirm, view('sell'));

    // Back to BUY / SELL / LEAVE, then leave: the merchant says goodbye before the world returns.
    cy.questPressUntil(QUEST_KEYS.cancel, view('top'));
    cy.questPressUntil(QUEST_KEYS.cancel, scene('message'));
    cy.questPressUntil(QUEST_KEYS.confirm, scene('world'));
    cy.questScreen().should('have.attr', 'data-view', '');
  });
});
