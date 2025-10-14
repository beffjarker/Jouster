describe('Jouster App E2E', () => {
  it('should display the page title', () => {
    // Visit the homepage
    cy.visit('/');

    // Check that the page title is visible and contains "Jouster"
    cy.title().should('contain', 'Jouster');

    // Verify the main heading is visible on the page
    cy.get('h1').should('be.visible').and('contain.text', 'Jouster');
  });

  describe('Navigation Menu', () => {
    beforeEach(() => {
      cy.visit('/');
    });

    it('should display the navigation menu with all expected links', () => {
      // Verify navigation menu is visible
      cy.get('[data-cy="navigation-menu"]').should('be.visible');

      // Verify navigation menu list is present
      cy.get('[data-cy="nav-menu-list"]').should('be.visible');

      // Verify logo link is present and functional
      cy.get('[data-cy="nav-logo-link"]')
        .should('be.visible')
        .and('contain.text', 'Jouster');

      // Verify all navigation links are present
      const expectedNavLinks = [
        'nav-link-home',
        'nav-link-about',
        'nav-link-contact',
        'nav-link-emails',
        'nav-link-fibonacci',
        'nav-link-highlights',
        'nav-link-listening-history',
        'nav-link-conversation-history',
        'nav-link-music',
        'nav-link-timeline',
        'nav-link-flash-experiments'
      ];

      expectedNavLinks.forEach(linkId => {
        cy.get(`[data-cy="${linkId}"]`).should('be.visible');
      });
    });

    it('should navigate to Flash Experiments page when clicking the Flash Experiments link', () => {
      // Click on the Flash Experiments navigation link
      cy.get('[data-cy="nav-link-flash-experiments"]')
        .should('be.visible')
        .click();

      // Verify URL changed to flash-experiments
      cy.url().should('include', '/flash-experiments');

      // Verify we're on the Flash Experiments page
      cy.get('[data-cy="flash-experiments-page"]').should('be.visible');

      // Verify page title
      cy.get('[data-cy="flash-experiments-title"]')
        .should('be.visible')
        .and('contain.text', 'Old Flash Experiments');

      // Verify page introduction text is present
      cy.get('[data-cy="flash-experiments-intro"]')
        .should('be.visible')
        .and('contain.text', 'A collection of Flash experiments from 2001-2002');

      // Verify filter section is present
      cy.get('[data-cy="filter-section"]').should('be.visible');

      // Verify category filter select is present and functional
      cy.get('[data-cy="category-filter-select"]')
        .should('be.visible')
        .and('not.be.disabled');

      // Verify experiments grid is present
      cy.get('[data-cy="experiments-grid"]').should('be.visible');
    });

    it('should interact with Flash Experiments page elements', () => {
      // Navigate to Flash Experiments page
      cy.get('[data-cy="nav-link-flash-experiments"]').click();

      // Wait for page to load
      cy.get('[data-cy="flash-experiments-page"]').should('be.visible');

      // Test category filter functionality
      cy.get('[data-cy="category-filter-select"]')
        .select('particles')
        .should('have.value', 'particles');

      // Reset filter to show all categories
      cy.get('[data-cy="category-filter-select"]')
        .select('')
        .should('have.value', '');

      // Verify at least one experiment card exists (if there are experiments)
      cy.get('[data-cy="experiments-grid"]').then(($grid) => {
        if ($grid.find('[data-cy^="experiment-card-"]').length > 0) {
          // If experiments exist, verify the first experiment card elements
          cy.get('[data-cy^="experiment-card-"]').first().within(() => {
            // Verify experiment has a title
            cy.get('[data-cy^="experiment-title-"]').should('be.visible');

            // Verify experiment has a category tag
            cy.get('[data-cy^="experiment-category-"]').should('be.visible');

            // Verify experiment has a description
            cy.get('[data-cy^="experiment-description-"]').should('be.visible');

            // Verify experiment has a canvas
            cy.get('[data-cy^="experiment-canvas-"]').should('be.visible');

            // Verify experiment has control buttons
            cy.get('[data-cy^="experiment-controls-"]').should('be.visible');
            cy.get('[data-cy^="start-btn-"]').should('be.visible').and('contain.text', 'Start');
            cy.get('[data-cy^="stop-btn-"]').should('be.visible').and('contain.text', 'Stop');
            cy.get('[data-cy^="reset-btn-"]').should('be.visible').and('contain.text', 'Reset');
          });
        }
      });
    });

    it('should maintain active navigation state on Flash Experiments page', () => {
      // Navigate to Flash Experiments page
      cy.get('[data-cy="nav-link-flash-experiments"]').click();

      // Verify the Flash Experiments nav link has active class
      cy.get('[data-cy="nav-link-flash-experiments"]').should('have.class', 'active');

      // Verify other nav links don't have active class (except home which might be exact match)
      cy.get('[data-cy="nav-link-about"]').should('not.have.class', 'active');
      cy.get('[data-cy="nav-link-contact"]').should('not.have.class', 'active');
      cy.get('[data-cy="nav-link-music"]').should('not.have.class', 'active');
    });

    it('should allow navigation back to home from Flash Experiments page', () => {
      // Navigate to Flash Experiments page first
      cy.get('[data-cy="nav-link-flash-experiments"]').click();
      cy.get('[data-cy="flash-experiments-page"]').should('be.visible');

      // Navigate back to home using logo
      cy.get('[data-cy="nav-logo-link"]').click();
      cy.url().should('eq', Cypress.config().baseUrl + '/');

      // Navigate to Flash Experiments again
      cy.get('[data-cy="nav-link-flash-experiments"]').click();

      // Navigate back to home using home link
      cy.get('[data-cy="nav-link-home"]').click();
      cy.url().should('eq', Cypress.config().baseUrl + '/');
    });
  });
});
