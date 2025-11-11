---
applyTo: 'app/sm-api-e2e/**'
---

# SM API E2E Testing Instructions

This document provides guidance for writing effective end-to-end tests for the SM API using Cypress. Following these instructions will help ensure consistency, maintainability, and reliability of the test suite.

---

## 1. General Testing Principles

### Test Structure

- Organize tests by API endpoint or functional area
- Use descriptive `describe` blocks that identify the endpoint being tested
- Write focused `it` blocks that test one behavior at a time
- Follow the Arrange-Act-Assert pattern for test clarity
- Add tags for test filtering (e.g., `@regression`, `@CI`)

### Test Coverage

- Validate successful operations (200/201 responses)
- Test error cases and edge conditions
- Verify API contract/schema compliance
- Test business logic and data transformations
- Ensure authentication and authorization are properly tested

---

## 2. Custom Commands

The `sm-api-e2e` project includes many custom Cypress commands designed to simplify testing. Use these commands to maintain consistency and reduce duplication.

### Core API Commands

```typescript
// Making API requests
cy.api({
  method: 'GET',
  url: `${Cypress.config('baseUrl')}/endpoint`,
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
}).then((response) => {
  // assertions here
});

// Using custom commands
cy.customCommand1(param, optionalParam).customCommand2();
```

---

## 3. Data Handling

### Fixtures

- Store test data in fixture files under `src/fixtures/`
- Name fixtures clearly to indicate their purpose
- Use parameterized fixtures for data-driven tests
- Avoid hardcoding test data in test files

### Dynamic Data

- Generate unique IDs for user identification
- Use helper functions for dynamic date/time values
- Create utility functions for common data manipulation tasks

---

## 4. Assertions and Validation

### Response Validation

- Always validate response status codes
- Check response body structure and content
- Include meaningful assertion messages
- Use deep equality checks for complex objects

```typescript
// Example validation
assert.equal(response.status, 200, 'ASSERT STATUS');
assert.equal(response.body.data.property, expectedValue, 'ASSERT PROPERTY');
expect(response.body).to.have.property('data');
```

### Schema Validation

Use the schema validation command for API contract testing:

```typescript
cy.validateSchema(schema, response.body);
```

---

## 5. Error Testing

- Test missing required headers
- Verify error responses for invalid inputs
- Check boundary conditions
- Validate error message content and format

---

## 6. Test Naming and Organization

### File Organization

- Group test files by API endpoint or feature area
- Use consistent file naming: `endpoint-feature.cy.ts`
- Place common test utilities in support files

### Test Descriptions

- Use descriptive test names that explain what is being tested
- Include the HTTP method and expected status in test titles
- Format: `'{METHOD} {endpoint}[{status}_{condition}]: {description}'`

```typescript
// Example
it('GET cart[200_success]: Should return endpoint contents when valid headers provided', () => {
  // test implementation
});
```

---

## 7. Best Practices

- Keep tests independent and isolated
- Clean up test data after tests
- Avoid test interdependencies
- Use meaningful tags for test filtering
- Document complex test scenarios with comments
- Validate both technical correctness and business rules
- Use retry logic for flaky operations
- Add descriptive assertion messages

---

For additional guidance, refer to:

- The main Cypress documentation: https://docs.cypress.io/
- The project-specific custom commands in `src/support/` directory
- Existing tests in the project as reference implementations
