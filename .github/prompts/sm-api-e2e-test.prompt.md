# Service Management API Testing Prompt

You are working with an end-to-end testing project for the Service Management API in our Nx monorepo. This prompt will help you generate effective, maintainable, and reliable Cypress tests for the API endpoints and integrations.

---

## 1. Testing Context

- **Project**: The `sm-api-e2e` project tests the Service Management API endpoints
- **Framework**: Cypress with TypeScript
- **Pattern**: Following API testing best practices with custom commands and data-driven tests

## 2. Key Testing Areas

- API endpoint validation
- Request/response schemas
- Error handling
- Authentication and authorization
- Business logic validation
- Integration with other E-commerce systems

## 3. Test Structure Requirements

- Use descriptive `describe` and `it` blocks following the pattern: `'{endpoint}: {behavior being tested}'`
- Group tests by API endpoint or functional area
- Use data-driven testing with fixtures where appropriate
- Follow AAA pattern (Arrange-Act-Assert) in test implementation
- Include appropriate tags for filtering tests (e.g., `@regression`, `@CI`)

## 4. Custom Commands Usage

- Utilize project-specific custom commands for repeated API operations
- Make use of Cypress's API plugin for clean request/response handling
- Chain commands appropriately for complex test flows
- Create new commands when needed, following established patterns

## 5. Response Validation

- Validate response status codes
- Check response schemas against expected structures
- Verify business logic in response data
- Test edge cases and error conditions
- Use assertions with meaningful messages

---

When implementing tests for the Service Management API, focus on creating comprehensive, maintainable tests that validate both technical correctness and business requirements. Follow existing patterns in the codebase and make use of the rich set of custom commands available in the project.
