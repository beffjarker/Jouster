import { QUEST_KEYS, QUEST_SAVE_KEY } from '../support/commands';

/** The fixture's party stands on the inn rug in Aldmere, one step south of the counter, facing it. */
const INN_SAVE_FIXTURE = 'quest-save-aldmere-inn.json';
const SEEDED_GOLD = 50;
const SEEDED_HP = 5;
const scene = (id: string) => (_win: Cypress.AUTWindow, current: string) =>
  current === id;

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
    cy.fixture(INN_SAVE_FIXTURE).then((save: Record<string, unknown>) => {
      cy.visit('/jouster-quest', {
        onBeforeLoad: (win) =>
          win.localStorage.setItem(QUEST_SAVE_KEY, JSON.stringify(save)),
      });
    });
    cy.questScreen().should('have.attr', 'data-scene', 'title');
    // With a save, the title cursor starts on CONTINUE.
    cy.questPressUntil(QUEST_KEYS.enter, (_win, s) => s !== 'title');
    cy.questScreen().should('have.attr', 'data-scene', 'world');

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
});
