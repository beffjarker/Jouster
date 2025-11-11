---
applyTo: '**/*-e2e/**'
---

# Cypress UI Testing Guidelines for Nx Monorepo

> **Purpose:**  
> Universal Cypress testing patterns for all e2e projects in the monorepo. Project-specific extensions are covered in dedicated instruction files (e.g., `cypress-unified-wp.instructions.md`).

---

## How to Use This File

_Instructions for both AI assistants and developers on applying these guidelines._

- **Copilot/LLMs:** These are mandatory patterns for all e2e test generation. Use semantic search to find project-specific patterns before creating tests. Always follow Nx workspace conventions.
- **Humans:** Follow these guidelines for all UI tests. Use as a checklist for PR reviews.

---

## Copilot/LLM Usage Guidelines

_AI-specific rules for generating and working with Cypress tests in this workspace._

- **Always** use semantic search before creating new test patterns or commands
- **Always** check for existing test utilities in `libs/cypress-shared/cypress-commands`
- Use Nx tools and generators for creating new e2e test projects
- If unsure about a testing pattern or convention, use semantic search to find examples in the codebase
- Review generated tests for correctness, security, and adherence to these patterns
- When external documentation links are provided, use them for context but do not fetch them automatically

---

## Nx Integration

_How to properly use Nx tools and conventions for e2e testing projects._

- **Must** use Nx generators for creating new e2e test projects: `npx nx g @nx/cypress:e2e-project`
- Reference `.github/instructions/nx.instructions.md` for Nx-specific flows and automation
- Use the Nx MCP server and tools for workspace analysis when available
- Follow Nx naming conventions for test projects: `{app-name}-e2e`
- Leverage Nx's affected testing: `npx nx affected --target=e2e --base=origin/master`

---

## Quick Reference Checklist

_Essential items to verify before submitting e2e test code._

- [ ] Used `cy.session()` for authentication to prevent Auth0 rate limiting
- [ ] Used `cy.getAutoId()` for all element selection
- [ ] Used `cy.navigateToPage()` for navigation via relative-urls.json
- [ ] Included proper test tags for filtering (@smoke, @regression, @CI)
- [ ] Kept test files clean with direct Cypress commands only
- [ ] Added API intercepts where needed

---

## 🚨 **CRITICAL: Authentication Best Practices**

_Mandatory authentication patterns to prevent CI/CD failures and rate limiting._

**MANDATORY: Always use `cy.session()` for login/authentication**

```typescript
beforeEach(() => {
  cy.session('test-user-key', () => {
    cy.navigateToPage('Home');
    cy.getAutoId('Login-button').click();
    cy.universalLoginWithCredentials('user@email.com', 'password');
    cy.url().should('not.include', '/login');
  });
});
```

**Why:** Auth0 enforces rate limits (429 errors) that will break CI/CD without session management.

---

## 📁 **Standard E2E Project Structure**

_Required folder structure and file organization for all e2e test projects._

```
apps/{project}-e2e/
  src/
    e2e/**/*.cy.ts          // Test files
    support/commands.ts     // Project-specific commands
    fixtures/
      relative-urls.json    // Page navigation mapping
      test-users.json       // Test user data
```

---

## 🎯 **Shared Cypress Commands Reference**

_Pre-built commands available from the shared library - use these instead of creating new ones._

**From `libs/cypress-shared/cypress-commands`:**

_Essential commands from the shared library that should be used instead of creating custom implementations._

```typescript
// Element selection (MANDATORY)
cy.getAutoId('element-id'); // Selects by [data-automation-id]

// Navigation (MANDATORY)
cy.navigateToPage('PageName'); // Uses relative-urls.json

// Authentication (MANDATORY)
cy.universalLoginWithCredentials(username, password);
cy.universalLogin(user); // Uses auth0-test-users.json

// Waiting utilities
cy.waitForPageLoad(); // Wait for page to fully load
cy.waitForLoadingSpinner(); // Wait for loading indicators to disappear
```

**relative-urls.json example:**

```json
{
  "Home": "/",
  "Login": "/login",
  "Dashboard": "/dashboard"
}
```

---

## 🚫 **Do's and Don'ts for Clean Test Code**

_Rules to maintain readable, maintainable test files without bloat or duplication._

### ❌ **NEVER Do These:**

- Create page object classes or helper functions inside test files
- Create functions like `fillLoginForm()`, `navigateToSection()` in test specs
- Use raw selectors like `cy.get('[data-automation-id="..."]')`

### ✅ **Always Do These:**

- Keep test files clean with direct Cypress commands only
- Use `cy.getAutoId()` for all element selection
- Use `cy.navigateToPage()` for all navigation
- Use `cy.session()` for authentication

---

## ✍️ **Recommended Test Structure & Patterns**

_Standard template showing proper test organization, authentication, and API handling._

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // CRITICAL: Session management for Auth0
    cy.session('user-session', () => {
      cy.navigateToPage('Home');
      cy.getAutoId('Login-button').click();
      cy.universalLoginWithCredentials('user@email.com', 'password');
      cy.url().should('not.include', '/login');
    });

    // API mocks
    cy.intercept('GET', '**/api/endpoint**').as('apiCall');
  });

  it('should test feature', { tags: ['@smoke', '@regression'] }, () => {
    cy.navigateToPage('Dashboard');
    cy.getAutoId('form-input').type('test data');
    cy.getAutoId('submit-button').click();

    cy.wait('@apiCall').then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
    });

    cy.getAutoId('success-message').should('be.visible');
  });
});
```

---

## 🛠️ **When to Create Custom Commands**

_Guidelines for determining when custom commands are necessary and how to implement them properly._

**Only create custom commands in `src/support/commands.ts` if:**

- Used 3+ times across different test files
- Encapsulates complex logic that would clutter tests
- Provides reusable abstraction for common workflows

**Documentation pattern:**

_Required JSDoc format for custom commands to ensure proper documentation and type support._

```typescript
/**
 * @function myCommand - Brief description
 * @param param1 - Description
 * @example cy.myCommand('value')
 */
Cypress.Commands.add('myCommand', (param1: string) => {
  // Implementation
});
```

---

## 🏷️ **Test Organization & Tag Usage**

_Standard tags for categorizing tests and organizing test execution in CI/CD pipelines._

**Common tags:**

- `@smoke` - Critical functionality
- `@regression` - Full regression suite
- `@CI` - Tests for continuous integration
- `@skipCI` - Skip in CI (flaky/slow)
- @US###### - User story traceability
- @DE##### - Defect traceability

**Usage:**

_How to apply tags to individual test cases for filtering and organization in test execution._

```typescript
it('should work', { tags: ['@smoke', '@CI'] }, () => {
  // Test implementation
});
```

---

## 🚀 **Running Tests in Different Modes**

_Commands for executing tests in various scenarios - local development, CI/CD, and debugging._

```bash
# Interactive mode
npx nx e2e <app-name>-e2e --watch

# Specific test
npx nx e2e <app-name>-e2e --spec=**/my-test.cy.ts

# Only affected tests
npx nx affected --target=e2e --base=master

# With tags (using @cypress/grep)
npx nx e2e <app-name>-e2e --grepTags=@CI
```

---

## 🔧 **Common Testing Implementation Patterns**

_Ready-to-use code snippets for typical testing scenarios like API calls, forms, and environment handling._

**API Interception & Testing:**

`cy.intercept()` serves multiple purposes beyond just testing API endpoints:

```typescript
// 1. API Testing - Verify actual API calls
cy.intercept('GET', '**/api/users/**').as('getUser');
cy.wait('@getUser').then((interception) => {
  expect(interception.response.statusCode).to.eq(200);
  expect(interception.response.body).to.have.property('users');
});

// 2. Waiting for API calls to complete
cy.intercept('POST', '**/api/submit/**').as('submitData');
cy.getAutoId('submit-button').click();
cy.wait('@submitData'); // Wait for API call before proceeding

// 3. Capturing data from API responses
cy.intercept('GET', '**/api/user-profile/**').as('getUserProfile');
cy.wait('@getUserProfile').then((interception) => {
  const userId = interception.response.body.id;
  cy.wrap(userId).as('currentUserId'); // Store for later use
});

// 4. Mocking API responses for controlled testing
cy.intercept('GET', '**/api/features/**', {
  statusCode: 200,
  body: { features: ['feature1', 'feature2'] },
}).as('mockedFeatures');

// 5. Simulating different API states (error handling)
cy.intercept('POST', '**/api/save/**', {
  statusCode: 500,
  body: { error: 'Server error' },
}).as('saveError');

// 6. Modifying API responses dynamically
cy.intercept('GET', '**/api/config/**', (req) => {
  req.reply((res) => {
    res.body.testMode = true; // Modify response
    return res;
  });
}).as('modifiedConfig');
```

**Form Testing:**

_Best practices for testing form interactions, validation, and submissions using standardized element selection._

```typescript
// Basic form interaction
cy.getAutoId('username-input').type('test@example.com');
cy.getAutoId('password-input').type('password123');
cy.getAutoId('login-button').click();

// Form validation testing
cy.getAutoId('email-input').type('invalid-email');
cy.getAutoId('submit-button').click();
cy.getAutoId('email-error').should('contain', 'Invalid email format');

// Multi-step forms
cy.getAutoId('step1-next').click();
cy.getAutoId('step2-input').type('data');
cy.getAutoId('step2-next').click();
cy.getAutoId('final-submit').click();

// Form with file uploads
cy.getAutoId('file-input').selectFile('cypress/fixtures/test-file.pdf');
cy.getAutoId('upload-button').click();
cy.getAutoId('upload-success').should('be.visible');
```

**Environment Handling:**

_Conditional logic for tests that need to behave differently across development, staging, and production environments._

```typescript
// Handle different environments
if (!(Cypress.config('baseUrl') ?? '').includes('localhost')) {
  cy.navigateToPage('SpecificPage');
}

// Environment-specific configurations
const isLocal = Cypress.config('baseUrl')?.includes('localhost');
const isProd = Cypress.env('ENVIRONMENT') === 'production';

if (isLocal) {
  cy.intercept('GET', '**/api/config', { fixture: 'local-config.json' });
}
```

**Test Data Management:**

_Best practices for managing test data, fixtures, and avoiding data dependencies between tests._

```typescript
// Using fixtures for consistent test data
cy.fixture('user-data').then((userData) => {
  cy.getAutoId('username-input').type(userData.validUser.email);
  cy.getAutoId('password-input').type(userData.validUser.password);
});

// Dynamic test data generation
const timestamp = Date.now();
const testEmail = `test+${timestamp}@example.com`;
cy.getAutoId('email-input').type(testEmail);

// Avoid data dependencies between tests
beforeEach(() => {
  // Clean slate for each test
  cy.clearAllLocalStorage();
  cy.clearAllCookies();
});
```

**Waiting Strategies & Best Practices:**

_Proper waiting patterns to ensure test reliability without unnecessary delays._

```typescript
// ✅ Smart waiting for elements
cy.getAutoId('loading-spinner').should('not.exist');
cy.getAutoId('content').should('be.visible');

// ✅ Wait for API calls
cy.intercept('GET', '**/api/data').as('getData');
cy.wait('@getData');

// ✅ Wait for specific conditions
cy.getAutoId('status').should('contain', 'Completed');

// ❌ Avoid hard-coded waits
cy.wait(5000); // Don't do this

// ✅ Wait for animations/transitions
cy.getAutoId('modal').should('be.visible');
cy.getAutoId('modal').should('not.have.class', 'animating');
```

---

## � **Assertions & Expectations Patterns**

_Standard patterns for making reliable assertions and handling different types of validations._

**Element State Assertions:**

```typescript
// Visibility and existence
cy.getAutoId('element').should('be.visible');
cy.getAutoId('element').should('exist');
cy.getAutoId('element').should('not.exist');

// Content validation
cy.getAutoId('title').should('contain.text', 'Welcome');
cy.getAutoId('title').should('have.text', 'Exact Title');

// Attribute validation
cy.getAutoId('input').should('have.attr', 'placeholder', 'Enter email');
cy.getAutoId('button').should('be.disabled');
cy.getAutoId('checkbox').should('be.checked');

// CSS and styling
cy.getAutoId('element').should('have.class', 'active');
cy.getAutoId('element').should('have.css', 'color', 'rgb(255, 0, 0)');
```

**URL and Navigation Assertions:**

```typescript
// URL validation
cy.url().should('include', '/dashboard');
cy.url().should('eq', 'https://example.com/page');

// Location validation
cy.location('pathname').should('eq', '/dashboard');
cy.location('search').should('include', '?tab=profile');
```

**API Response Assertions:**

```typescript
cy.wait('@apiCall').then((interception) => {
  expect(interception.response.statusCode).to.eq(200);
  expect(interception.response.body).to.have.property('data');
  expect(interception.response.body.data).to.be.an('array');
  expect(interception.response.body.data.length).to.be.greaterThan(0);
});
```

---

## �🆘 **Common Issues & Solutions**

_Troubleshooting guide for frequent problems with authentication, element selection, and test reliability._

**Authentication Issues:**

_Common authentication mistakes that cause rate limiting and test failures, with correct implementations._

```typescript
// ❌ Wrong - causes rate limiting
beforeEach(() => {
  cy.universalLoginWithCredentials('user', 'pass');
});

// ✅ Correct - uses session caching
beforeEach(() => {
  cy.session('user-key', () => {
    cy.universalLoginWithCredentials('user', 'pass');
  });
});
```

**Element Selection:**

_Proper element selection patterns using shared commands vs raw selectors for maintainable tests._

```typescript
// ❌ Wrong
cy.get('[data-automation-id="button"]').click();

// ✅ Correct
cy.getAutoId('button').click();

// ❌ Wrong - using CSS selectors
cy.get('.submit-button').click();

// ✅ Correct - using automation IDs
cy.getAutoId('submit-button').click();

// ❌ Wrong - fragile text-based selection
cy.contains('Submit').click();

// ✅ Correct - reliable automation ID
cy.getAutoId('submit-action').click();
```

---

## 📊 **Environment Configuration & Reporting**

_Setup instructions for environment variables, test reporting, and shared command integration._

**Environment Variables:**

```typescript
// Access environment variables
const apiUrl = Cypress.env('API_URL') || 'http://localhost:3000';
const testUser = Cypress.env('TEST_USER_EMAIL');

// Set in cypress.config.ts
env: {
  API_URL: 'https://api.example.com',
  TEST_USER_EMAIL: 'test@example.com'
}
```

**Test Reporting:**

- Use `cypress-mochawesome-reporter` for HTML reports
- Configure in `cypress.config.ts`:

```typescript
reporter: 'cypress-mochawesome-reporter',
reporterOptions: {
  charts: true,
  reportPageTitle: 'E2E Test Results',
  embeddedScreenshots: true,
  inlineAssets: true
}
```

**Shared Commands Integration:**

- Add custom commands to `libs/cypress-shared/cypress-commands`
- Import in `support/commands.ts`: `import 'libs/cypress-shared/cypress-commands';`
- Follow JSDoc patterns for proper documentation

---

## 🔍 **Debugging & Troubleshooting**

_Tools and techniques for debugging failing tests and investigating issues._

**Debug Commands:**

```typescript
// Pause test execution
cy.debug();

// Log values for inspection
cy.getAutoId('element').then(($el) => {
  cy.log('Element text:', $el.text());
});

// Take screenshots for debugging
cy.screenshot('debug-screenshot');

// Inspect network requests
cy.intercept('GET', '**/api/**').as('apiCall');
cy.wait('@apiCall').then((interception) => {
  cy.log('API Response:', interception.response.body);
});
```

**Common Debugging Scenarios:**

```typescript
// Element not found - check if element exists
cy.getAutoId('button')
  .should('exist')
  .then(() => {
    cy.log('Element exists');
  })
  .catch(() => {
    cy.log('Element does not exist');
  });

// Timing issues - add explicit waits
cy.getAutoId('submit-button').click();
cy.getAutoId('success-message', { timeout: 10000 }).should('be.visible');

// Flaky tests - add retry logic
cy.get('[data-automation-id="dynamic-content"]')
  .should('be.visible')
  .and('contain', 'Expected text');
```

---

## 🎯 **Basic Test Template for Quick Start**

_Copy-paste template for creating new test files with proper structure and authentication._

```typescript
describe('My Feature', () => {
  beforeEach(() => {
    cy.session('user', () => {
      cy.navigateToPage('Home');
      cy.getAutoId('Login-button').click();
      cy.universalLoginWithCredentials('user@email.com', 'password');
      cy.url().should('not.include', '/login');
    });
  });

  it('should work', { tags: ['@regression'] }, () => {
    cy.navigateToPage('Dashboard');
    cy.getAutoId('element').should('be.visible');
  });
});
```

---

## Common Pitfalls & Anti-Patterns to Avoid

_Mistakes that lead to flaky tests, maintenance issues, and security problems._

- **Never** duplicate test logic; always check for reusable commands in `libs/cypress-shared/cypress-commands`
- **Never** use `any` in TypeScript test code unless absolutely necessary
- **Never** create hard-coded waits; use smart waiting patterns
- **Never** test implementation details; focus on user behavior
- **Never** commit test credentials or sensitive data; use environment variables

---

## Copilot/LLM Live Testing Workflow for Agent Mode

_Step-by-step process for AI agents to generate, test, and validate e2e tests in autonomous mode._

When working with e2e tests in agent mode:

1. **Generate tests** following these instruction patterns
2. **Run tests locally** to verify they pass: `npx nx e2e {project}-e2e`
3. **Fix any failures** before considering the task complete
4. **Use affected testing** for efficiency: `npx nx affected --target=e2e`
5. **Validate test artifacts** are properly generated and stored

Always ensure tests pass locally before considering the implementation complete.

**For project-specific patterns, see `cy-{project}.instructions.md` files.**
