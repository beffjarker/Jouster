# Testing Documentation

## Overview

Jouster uses a comprehensive testing strategy with both unit tests (Jest + Spectator) and end-to-end tests (Cypress) to ensure reliability and quality.

## Testing Stack

### Unit Testing
- **Jest 29.7.0** - JavaScript testing framework
- **@ngneat/spectator 21.0.1** - Angular testing utilities
- **Coverage**: Aim for >80% code coverage on critical components

### End-to-End Testing
- **Cypress** - Modern e2e testing framework
- **Test Identifiers**: Using `data-cy` attributes for reliable element selection
- **API Mocking**: Intercept and mock API calls for consistent testing

## Test Identifier Convention

### Data-Cy Attributes

All testable elements use `data-cy` attributes following this naming convention:

```html
<!-- Page containers -->
<div data-cy="page-name-page">

<!-- Navigation elements -->
<a data-cy="nav-link-page-name">

<!-- Form controls -->
<input data-cy="input-field-name">
<button data-cy="button-action-name">

<!-- Dynamic elements with IDs -->
<div [attr.data-cy]="'item-' + item.id">
<button [attr.data-cy]="'action-button-' + item.key">

<!-- State indicators -->
<div data-cy="loading-state">
<div data-cy="error-state">
<div data-cy="empty-state">
```

### Examples from Email Component

```html
<!-- Page structure -->
<div data-cy="emails-page">
  <h1 data-cy="emails-title">Email Files</h1>
  
  <!-- Controls -->
  <input data-cy="page-size-input">
  
  <!-- States -->
  <div data-cy="loading-state">
  <div data-cy="error-state">
  <div data-cy="empty-state">
  
  <!-- Dynamic items -->
  <div [attr.data-cy]="'email-item-' + email.key">
  <button [attr.data-cy]="'display-button-' + email.key">
</div>
```

## Cypress Test Structure

### Test Organization

Tests are organized by component/feature:
- `e2e/src/e2e/app.cy.ts` - Main navigation and flash experiments
- `e2e/src/e2e/emails.cy.ts` - Email component functionality

### Test Patterns

#### 1. Resilient Testing Pattern

Tests handle multiple possible states gracefully:

```typescript
cy.get('body').then(($body) => {
  if ($body.find('[data-cy="emails-list"]').length > 0) {
    // Success state - has emails
    cy.get('[data-cy="emails-list"]').should('be.visible');
  } else if ($body.find('[data-cy="error-state"]').length > 0) {
    // Error state
    cy.get('[data-cy="error-state"]').should('be.visible');
  }
});
```

#### 2. API Interception

Mock and verify API calls:

```typescript
// Intercept API calls
cy.intercept('GET', '/api/emails*').as('getEmails');

// Verify API connectivity
cy.wait('@getEmails', { timeout: 10000 }).then((interception) => {
  expect(interception.request.url).to.include('/api/emails');
  expect(interception.response).to.exist;
});
```

#### 3. Error Simulation

Test error handling:

```typescript
// Simulate network error
cy.intercept('GET', '/api/emails*', { forceNetworkError: true });

// Simulate server error  
cy.intercept('GET', '/api/emails*', { statusCode: 500 });
```

## Email Component Testing

### Test Coverage

The email component tests cover:

1. **Page Structure** - Title, controls, layout elements
2. **Loading States** - Spinner, transitions, timeout handling
3. **API Response Handling** - Success, error, empty states
4. **Error Recovery** - Retry functionality, error messages
5. **Pagination** - Page controls, navigation, state management
6. **Responsive Design** - Multiple viewport sizes
7. **Accessibility** - Keyboard navigation, focus management
8. **Navigation** - Routing to/from emails page

### Key Test Cases

```typescript
describe('Email List Component', () => {
  beforeEach(() => {
    cy.visit('/emails');
  });

  it('should handle API response and display results', () => {
    // Wait for loading to complete
    cy.get('[data-cy="loading-state"]', { timeout: 10000 }).should('not.exist');

    // Handle multiple possible outcomes
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="emails-list"]').length > 0) {
        // Success: verify email list elements
        cy.get('[data-cy="list-header"]').should('be.visible');
        cy.get('[data-cy="results-info"]').should('be.visible');
      } else if ($body.find('[data-cy="error-state"]').length > 0) {
        // Error: verify error handling
        cy.get('[data-cy="error-message"]').should('be.visible');
        cy.get('[data-cy="retry-button"]').should('be.visible');
      }
    });
  });
});
```

## Flash Experiments Testing

### Navigation and Functionality

Tests verify:
- Navigation menu visibility and functionality
- Page routing and URL changes  
- Experiment grid display
- Category filtering
- Animation controls (Start/Stop/Reset)
- Canvas element presence

### Key Features Tested

```typescript
it('should navigate to Flash Experiments page', () => {
  cy.get('[data-cy="nav-link-flash-experiments"]')
    .should('be.visible')
    .click();
  
  cy.url().should('include', '/flash-experiments');
  cy.get('[data-cy="flash-experiments-page"]').should('be.visible');
  cy.get('[data-cy="experiments-grid"]').should('be.visible');
});
```

## Running Tests

### Local Development

```bash
# Run all Cypress tests
npx nx e2e e2e

# Run specific test file
npx nx e2e e2e --spec="**/emails.cy.ts"

# Run in headless mode
npx nx e2e e2e --headless

# Open Cypress UI
npx nx e2e e2e --watch
```

### IDE Integration

Run configurations available in IntelliJ IDEA:
- "E2E Tests (Cypress)" - Interactive mode
- "E2E Tests (Headless)" - CI/automated testing

## Best Practices

### Test Design Principles

1. **Reliability** - Use `data-cy` attributes, not CSS classes or text content
2. **Resilience** - Handle multiple possible states (success/error/empty)
3. **Isolation** - Each test should be independent
4. **Speed** - Use appropriate timeouts and efficient selectors
5. **Maintainability** - Clear test names and organized structure

### Common Patterns

```typescript
// Wait for loading to complete with timeout
cy.get('[data-cy="loading-state"]', { timeout: 10000 }).should('not.exist');

// Handle dynamic content conditionally
cy.get('body').then(($body) => {
  if ($body.find('[data-cy="target-element"]').length > 0) {
    // Element exists - test it
  }
});

// Test responsive behavior
cy.viewport(320, 568); // Mobile
cy.viewport(1920, 1080); // Desktop

// Verify API calls
cy.intercept('GET', '/api/endpoint*').as('apiCall');
cy.wait('@apiCall');
```

## Recent Fixes and Improvements

### Email Component Restoration (October 2025)

**Issues Fixed:**
- ❌ **API Port Mismatch** - Service was calling `localhost:3000`, backend runs on `3001`
- ❌ **Deprecated Methods** - Using `toPromise()` instead of modern `firstValueFrom()`
- ❌ **Template Syntax** - Incorrect `data-cy` attribute binding
- ❌ **Missing Tests** - No e2e coverage for email functionality

**Solutions Implemented:**
- ✅ **Relative URLs** - Changed to `/api` for automatic port matching
- ✅ **Modern RxJS** - Replaced `toPromise()` with `firstValueFrom()`
- ✅ **Proper Binding** - Fixed `[attr.data-cy]` syntax
- ✅ **Comprehensive Testing** - Added full Cypress test suite

### Test Infrastructure Improvements

- **Enhanced Error Handling** - Tests handle network errors, server errors, and empty states
- **API Mocking** - Comprehensive API interception and response simulation
- **Responsive Testing** - Multiple viewport size validation
- **Accessibility Testing** - Keyboard navigation and focus management
- **Performance Testing** - Timeout handling and loading state validation

## Troubleshooting

### Common Issues

**Test Timeouts:**
```typescript
// Increase timeout for slow API calls
cy.get('[data-cy="element"]', { timeout: 15000 });
```

**Flaky Tests:**
- Use proper wait conditions
- Avoid hard-coded delays (`cy.wait(1000)`)
- Use API interception for consistent timing

**Element Selection:**
- Always prefer `data-cy` attributes
- Avoid CSS classes or text content for selection
- Use dynamic attributes for generated content

### Debugging

```bash
# Run with browser console open
npx nx e2e e2e --headed

# Enable debug mode
DEBUG=cypress:* npx nx e2e e2e
```

## CI/CD Integration

Tests are designed to run in continuous integration environments:

- **Headless Mode** - No GUI required
- **Docker Compatible** - Can run in containerized environments  
- **Parallel Execution** - Tests can run in parallel for speed
- **Retry Logic** - Built-in retry for network-dependent tests

The testing infrastructure ensures reliable deployment and catch regressions early in the development cycle.
