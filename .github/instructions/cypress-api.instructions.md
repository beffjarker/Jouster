# Cypress API Testing Instructions

> **Purpose:**
> This file provides explicit, actionable rules for writing, organizing, and maintaining Cypress API (end-to-end) tests in this Nx monorepo. Follow these instructions to ensure consistency, maintainability, and code quality.

---

## 1. General Principles

- **Reuse:** Always use or extend shared commands from `libs/cypress-shared`—never duplicate logic.
- **Docs:** Reference the main Cypress doc at `docs/CY-README.md` for setup, running, and advanced usage.
- **Structure:** Place all API E2E tests in the appropriate `apps/<app-name>-e2e/` folder.
- **Naming:** Use `.cy.ts` suffix for Cypress test files.

---

- Test files: `apps/<app-name>-e2e/src/e2e/**/*.cy.ts`
- Support files: `apps/<app-name>-e2e/src/support/`
- Fixtures: `apps/<app-name>-e2e/src/fixtures/`
- Schemas: Place all JSON schema files for API validation in `apps/<app-name>-e2e/src/schemas/`. Organize by endpoint or resource as needed. Reference these schemas in your tests for AJV validation.
- Custom commands: Extend via `libs/cypress-shared` or `src/support/commands.ts`

---

## 3. Writing API Tests

- Use `describe` and `it` blocks for test organization.
- Use `cy.api()` over `cy.request()` for API calls.
- Use AJV for JSON schema validation (see `docs/CY-README.md`).
- Use custom commands for authentication, setup, and repeated API flows.
- Use `expect` for assertions (not `assert`).
- Use tags (e.g., `@CI`) for test selection and grouping.

---

## 4. Running & Debugging

- Run locally: `npx nx e2e <app-name>-e2e --watch` for interactive mode.
- Run specific test: `npx nx e2e <app-name>-e2e --spec=**/my-test.cy.ts` for headless mode.
- Use VSCode launch configs for debugging.
- Use `cypress open` for interactive mode.
- Use `cypress run` for headless mode.

---

## 5. Reporting

- Use built-in reporters and `cypress-mochawesome-reporter` for HTML/JSON reports.
- Reports are output to the `reports/` directory by default.

---

## 6. Best Practices

- Use shared custom commands for authentication, setup, and common API flows.
- Use AJV for validating API responses against schemas.
- Use `expect` for all assertions.
- Keep tests isolated and independent.
- Clean up state between tests.
- Document complex flows with comments.

---

## 7. References

- Main Cypress doc: `docs/CY-README.md`
- Shared commands: `libs/cypress-shared/README.md`
- Nx/Copilot instructions: `.github/copilot-instructions.md`, `.github/instructions/nx.instructions.md`

---

## 8. If Unsure

- Search the workspace for examples.
- Ask for clarification or review the main docs.

---

## 9. Example Prompts & Responses

**Prompt:**

> Generate a Cypress test for a login API that validates a 200 response and checks the token in the body.
> **Ideal Response:**

```ts
// Note: Use the second argument of cy.api for endpoint tracking/reporting (e.g., '/users/access-check')
describe('Login API', () => {
  it('should return a token on success', () => {
    cy.api(
      {
        method: 'POST',
        url: `${Cypress.config('baseUrl')}`.replace(/\/?$/, '') + '/api/login',
        body: { username: 'user', password: 'pass' },
        failOnStatusCode: false,
        timeout: Cypress.config('pageLoadTimeout'),
      },
      '/api/login' // endpoint for reporting/tracking
    ).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('token');
    });
  });
});
```

---

## 10. Troubleshooting & FAQ

- **Schema validation fails:** Ensure your schema matches the response structure and is imported correctly from `src/schemas/`.
- **Test flakiness:** Use proper cleanup, avoid relying on test order, and use retries if needed.
- **Selector not found:** Double-check endpoint, payload, and schema paths.
- **AJV errors:** Validate your schema syntax and reference.

---

## 11. Environment Variables & Secrets

- Use `.env` files or Nx environment configs for API URLs, credentials, and secrets.
- Never commit secrets to source control.
- Reference variables in tests using `Cypress.env('VAR_NAME')`.

---

## 12. Tagging & Selective Test Execution

- Use tags like `@smoke`, `@regression`, `@CI` in test titles or comments.
- Run only tagged tests with plugins like `@cypress/grep` or custom logic.

---

## 13. Parallelization & CI Integration

- Use Cypress Dashboard or CI features to parallelize tests if supported.
- Example GitHub Actions step:
  ```yaml
  - name: Run Cypress API E2E
  	run: npx nx e2e <app-name>-e2e --watch
  ```

---

## 14. Test Data Management

- Use `src/fixtures/` for static data.
- For dynamic data, create setup/teardown helpers in `src/support/`.
- Clean up test data after each test to avoid state leakage.

---

## 15. Custom Command Patterns

- Place reusable API helpers in `libs/cypress-shared`.
- Document each custom command with JSDoc.
- Example:
  ```ts
  /**
   * Logs in a user and returns the token
   */
  Cypress.Commands.add('loginApi', (user, pass) => { ... });
  ```

---

## 16. Upgrading Cypress

- Check Nx and Cypress compatibility before upgrading.
- Review changelogs for breaking changes.
- Test all API E2E projects after upgrade.
- Notify all teams and update docs as needed.

---

## 17. Folder Structure Example

```text
apps/
	my-api-e2e/
		src/
			e2e/
				login.cy.ts
				user.cy.ts
			support/
				commands.ts
			fixtures/
				user.json
			schemas/
				login-response.schema.json
				user-response.schema.json
```
