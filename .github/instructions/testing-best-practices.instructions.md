---
applyTo: '**/*.{ts,spec.ts}'
---

# Jest & Angular Testing Best Practices

This document collects general best practices, patterns, and troubleshooting tips for writing and maintaining Jest unit tests (including Spectator for Angular) in this monorepo. Use this as a reference for all projects and keep prompt files focused on project-specific or workflow-specific instructions.

---

## General Jest Testing Guidelines

### Mocking

- Mock all external dependencies and services.
- Use `jest.mock()` for module-level mocks.
- Use Jest's mock functions (`jest.fn()`) for individual functions.
- Create mock implementations for complex dependencies.
- When mocking TypeScript functions with specific types, use `as unknown as jest.Mock` for proper type casting.

### Test Isolation

- Reset mocks between tests using `beforeEach()`.
- Add `jest.clearAllMocks()` in `beforeEach()` to ensure all mocks are reset.
- Clean up any resources in `afterEach()`.
- Ensure tests don't affect each other.
- Set up default mock return values in `beforeEach()` to establish a clean baseline for each test.

### Coverage

- Test normal/happy paths.
- Test edge cases (empty inputs, null values, etc.).
- Test error handling and exceptions.
- Verify all branches in conditional logic.
- For functions with multiple conditions, explicitly test each branch separately.
- Verify that untaken branches (alternative conditions) were not executed by checking that their dependent functions were not called.

### Best Practices

- Follow AAA pattern (Arrange-Act-Assert).
- Keep tests simple and focused on one behavior.
- Use descriptive test names that explain the expected behavior.
- Group related tests in `describe` blocks.
- Don't test implementation details, test behavior.
- For functions with control flow (if/else, switch), test each branch separately.
- Verify negative cases by ensuring mocked functions were not called when they should not be.

### Code Quality and Linting

- **Always run the linter** on test files to ensure code quality standards are met.
- **Fix lint errors properly** - do not use `eslint-disable-next-line` or similar suppression comments to bypass lint errors.
- Use proper TypeScript types instead of `any` wherever possible.
- Import and use domain-specific types (e.g., interfaces, enums) for better type safety.
- Structure helper functions with appropriate return types and parameter types.
- Ensure all variables are properly typed and used according to their intended purpose.
- When creating mock data, use proper types that match the expected interfaces rather than generic objects.

---

## Angular Testing with Spectator

- Use Spectator for all Angular components, services, directives, and pipes.
- Use `createComponentFactory` for components, `createServiceFactory` for services, etc.
- Use Spectator's DOM/event helpers instead of native DOM queries.
- Use Spectator's matchers for better assertions.
- Use `spectator.inject()` to get service instances.
- Use `spectator.detectChanges()` to trigger change detection.
- Take advantage of Spectator's event helpers for simulating user interactions.

---

## Nx-Specific Considerations

- Use correct import paths (with library names).
- Follow established testing patterns in the monorepo.
- Use appropriate test utilities provided by the framework.
- Properly mock any Nx-specific services or utilities.
- For monorepos, check similar test files in the same library for consistent patterns.
- When testing factory functions or translators, ensure you test all possible branches.
- Use absolute paths for Jest config when running tests in an Nx workspace.

---

## Troubleshooting Common Test Failures

- TypeScript type errors: Use proper type casting and ensure mock data matches expected types.
- Incorrect mock setup: Check all imports and ensure every external dependency is mocked.
- Coverage issues: Add specific tests for each condition and edge case.
- Jest configuration issues: Verify paths and check for module resolver settings in Jest config.
- Test isolation problems: Use `jest.clearAllMocks()` in `beforeEach()` and ensure proper cleanup.
- **Lint errors**: Fix by using proper types instead of suppression comments - import domain interfaces and use `Partial<Type>` for test data.
- **Type safety violations**: Replace `any` types with specific interfaces from the domain layer or create appropriate type definitions.

---

## Running Tests and Iterative Improvement

- After creating a test file, run the tests to verify they pass and provide the expected coverage.
- Use the appropriate Jest command for Nx workspaces, specifying the config and test file as needed.
- Add the `--coverage` flag to verify code coverage.
- **Run the linter** on the test file to ensure no lint errors are present: `npx nx lint <project-name> --files="path/to/test-file.spec.ts"`
- **Fix all lint errors** without using suppression comments like `eslint-disable-next-line`.
- If encountering type-related lint errors, use proper TypeScript types and interfaces rather than suppressing the errors.
- Analyze failures, make necessary adjustments, and repeat until all tests pass with the desired coverage and no lint errors.

### Lint Error Resolution Strategies

- **For `@typescript-eslint/no-explicit-any` errors**: Replace `any` with specific types from domain models or create proper interfaces.
- **For type mismatch errors**: Import and use the correct types from the codebase's domain layer.
- **For helper function typing**: Define proper parameter and return types based on the domain interfaces being tested.
- **For mock data creation**: Use `Partial<InterfaceName>` for creating test data that doesn't need all properties.

---

For Angular-specific and Spectator usage examples, see the relevant library README or the Spectator documentation: https://ngneat.github.io/spectator/
