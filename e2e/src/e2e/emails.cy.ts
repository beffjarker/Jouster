describe('Email List Component', () => {
  beforeEach(() => {
    // Visit the emails page before each test
    cy.visit('/emails');
  });

  it('should load and display the emails page structure', () => {
    // Verify page elements are present
    cy.get('[data-cy="emails-page"]').should('be.visible');
    cy.get('[data-cy="emails-title"]').should('be.visible').and('contain.text', 'Email Files');
    cy.get('[data-cy="emails-subtitle"]').should('be.visible').and('contain.text', 'Browse and download your email files from S3');
    cy.get('[data-cy="emails-controls"]').should('be.visible');
  });

  it('should show loading state initially', () => {
    // Verify loading state appears while emails are being fetched
    cy.get('[data-cy="loading-state"]').should('be.visible');
    cy.get('[data-cy="loading-state"]').should('contain.text', 'Loading emails...');
  });

  it('should handle API response and display results', () => {
    // Wait for loading to complete (either success or error)
    cy.get('[data-cy="loading-state"]', { timeout: 10000 }).should('not.exist');

    // Check if we have emails or empty state
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="emails-list"]').length > 0) {
        // Emails loaded successfully
        cy.get('[data-cy="emails-list"]').should('be.visible');
        cy.get('[data-cy="list-header"]').should('be.visible');
        cy.get('[data-cy="results-info"]').should('be.visible');

        // Check if there are email items or empty state
        cy.get('[data-cy="emails-list"]').within(() => {
          cy.get('body').then(($listBody) => {
            if ($listBody.find('[data-cy^="email-item-"]').length > 0) {
              // Has email items
              cy.get('[data-cy^="email-item-"]').should('have.length.at.least', 1);
              cy.get('[data-cy^="email-name-"]').first().should('be.visible');
              cy.get('[data-cy^="display-button-"]').first().should('be.visible').and('contain.text', 'Display');
            } else {
              // Empty state
              cy.get('[data-cy="empty-state"]').should('be.visible');
              cy.get('[data-cy="empty-state"]').should('contain.text', 'No emails found');
            }
          });
        });
      } else if ($body.find('[data-cy="error-state"]').length > 0) {
        // Error state displayed
        cy.get('[data-cy="error-state"]').should('be.visible');
        cy.get('[data-cy="error-message"]').should('be.visible');
        cy.get('[data-cy="retry-button"]').should('be.visible').and('contain.text', 'Retry');
      }
    });
  });

  it('should handle error state gracefully', () => {
    // Wait for loading to complete
    cy.get('[data-cy="loading-state"]', { timeout: 10000 }).should('not.exist');

    // If there's an error, verify error handling
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="error-state"]').length > 0) {
        cy.get('[data-cy="error-state"]').should('be.visible');
        cy.get('[data-cy="error-message"]').should('be.visible').and('not.be.empty');
        cy.get('[data-cy="retry-button"]').should('be.visible').and('not.be.disabled');

        // Test retry functionality
        cy.get('[data-cy="retry-button"]').click();
        cy.get('[data-cy="loading-state"]').should('be.visible');
      }
    });
  });

  it('should have functional page size controls', () => {
    // Wait for page to load
    cy.get('[data-cy="loading-state"]', { timeout: 10000 }).should('not.exist');

    // Test page size input
    cy.get('[data-cy="page-size-input"]').should('be.visible').and('have.value', '100');

    // Change page size
    cy.get('[data-cy="page-size-input"]').clear().type('50');
    cy.get('[data-cy="page-size-input"]').should('have.value', '50');
  });

  it('should display pagination controls when emails exist', () => {
    // Wait for loading to complete
    cy.get('[data-cy="loading-state"]', { timeout: 10000 }).should('not.exist');

    // Check if pagination controls are present when there are emails
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="emails-list"]').length > 0 && $body.find('[data-cy^="email-item-"]').length > 0) {
        // Pagination should be visible when there are emails
        cy.get('[data-cy="previous-page-button"]').should('exist');
        cy.get('[data-cy="next-page-button"]').should('exist');
      }
    });
  });

  it('should handle navigation to and from emails page', () => {
    // Verify we can navigate to emails page from navigation menu
    cy.get('[data-cy="nav-link-emails"]').should('be.visible').click();
    cy.url().should('include', '/emails');
    cy.get('[data-cy="emails-page"]').should('be.visible');

    // Navigate away and back
    cy.get('[data-cy="nav-link-home"]').click();
    cy.url().should('not.include', '/emails');

    cy.get('[data-cy="nav-link-emails"]').click();
    cy.url().should('include', '/emails');
    cy.get('[data-cy="emails-page"]').should('be.visible');
  });

  it('should test email display functionality if emails exist', () => {
    // Wait for loading to complete
    cy.get('[data-cy="loading-state"]', { timeout: 10000 }).should('not.exist');

    // Test email display if there are emails
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy^="display-button-"]').length > 0) {
        // Click the first display button
        cy.get('[data-cy^="display-button-"]').first().click();

        // Verify modal or display functionality works
        // Note: This may show loading, error, or success state depending on backend
        cy.get('body').should('not.contain.text', 'undefined');
      }
    });
  });

  it('should verify API connectivity', () => {
    // Intercept the API call to verify it's being made to the correct endpoint
    cy.intercept('GET', '/api/emails*').as('getEmails');

    // Reload the page to trigger API call
    cy.reload();

    // Wait for the API call
    cy.wait('@getEmails', { timeout: 10000 }).then((interception) => {
      // Verify the API call was made
      expect(interception.request.url).to.include('/api/emails');

      // Verify response (should be either success or failure, but not network error)
      expect(interception.response).to.exist;
    });
  });

  it('should maintain responsive design and accessibility', () => {
    // Wait for page to load
    cy.get('[data-cy="loading-state"]', { timeout: 10000 }).should('not.exist');

    // Test responsive behavior
    cy.viewport(320, 568); // Mobile
    cy.get('[data-cy="emails-page"]').should('be.visible');

    cy.viewport(768, 1024); // Tablet
    cy.get('[data-cy="emails-page"]').should('be.visible');

    cy.viewport(1920, 1080); // Desktop
    cy.get('[data-cy="emails-page"]').should('be.visible');

    // Test keyboard navigation
    cy.get('[data-cy="page-size-input"]').focus().should('be.focused');
  });
});

// Additional test for API error simulation
describe('Email List API Error Handling', () => {
  it('should handle network errors gracefully', () => {
    // Intercept and force network error
    cy.intercept('GET', '/api/emails*', { forceNetworkError: true }).as('getEmailsError');

    cy.visit('/emails');

    // Wait for the failed API call
    cy.wait('@getEmailsError');

    // Verify error state is displayed
    cy.get('[data-cy="error-state"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-cy="error-message"]').should('contain.text', 'Failed to load emails');
    cy.get('[data-cy="retry-button"]').should('be.visible');
  });

  it('should handle server errors gracefully', () => {
    // Intercept and return server error
    cy.intercept('GET', '/api/emails*', { statusCode: 500, body: { error: 'Internal Server Error' } }).as('getEmails500');

    cy.visit('/emails');

    // Wait for the failed API call
    cy.wait('@getEmails500');

    // Verify error state is displayed
    cy.get('[data-cy="error-state"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-cy="retry-button"]').should('be.visible');
  });
});
