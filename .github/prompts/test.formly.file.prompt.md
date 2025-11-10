````prompt
# Formly Component Test Prompt

When generating or editing tests for any Formly component, field type, wrapper, or directive, follow these requirements:

---

## 1. Change Detection Strategy

Before generating tests, analyze the file against the master branch:

1. **New File**: If the file doesn't exist in master, generate complete unit tests for the entire Formly component
2. **Modified File**: If the file exists in master:
   - Compare the current file with the master branch version using git diff
   - Identify added, modified, or removed functions, methods, and code blocks
   - Generate or update tests specifically for the changed code sections
   - Preserve existing tests for unchanged code (unless they need updates for compatibility)
   - Ensure the updated test suite maintains at least 90% coverage for the entire file

## 2. Analysis Steps

1. Check if the file exists in the master branch
2. If it exists, get the git diff between current branch and master for the specific file
3. Parse the diff to identify:
   - New functions/methods/classes added
   - Modified functions/methods/classes
   - Removed functions/methods/classes
   - Changed imports or dependencies
   - New or modified Formly field configurations
4. Based on the analysis, determine testing strategy:
   - **New file**: Full Formly test suite
   - **Changes detected**: Incremental test updates focusing on changed areas
   - **No changes**: Verify existing tests are adequate

## 3. Workflow Steps

1. **File Analysis**:
   ```bash
   # Check if file exists in master
   git show master:${fileName} 2>/dev/null

   # Get diff if file exists in master
   git diff master..HEAD -- ${fileName}
````

2. **Test Strategy Decision**:

   - If file is new → Generate complete Formly test suite
   - If file has changes → Focus on changed sections + ensure overall coverage
   - Document what changed and why specific tests were added/modified

3. **Test Generation**:

   - Analyze the Formly component structure (field types, wrappers, props, validation)
   - Identify all code paths that need testing
   - Generate tests with proper Formly test utilities and mocking
   - Ensure edge cases and error conditions are covered

4. **Coverage Validation**:
   - Run the generated tests
   - Verify coverage meets the 90% threshold
   - Iterate on tests if coverage is insufficient

## 4. Respect All Testing Instructions

- **You MUST follow all best practices and requirements in:**
  - `.github/instructions/testing-best-practices.instructions.md`
  - `.github/instructions/formly-testing.instructions.md`
- This includes coverage targets, test structure, mocking, Spectator usage, Formly test utilities, and all other guidance.

## 5. Test Generation and Iteration Workflow

- Generate a comprehensive Jest test file (`.spec.ts`) for the Formly element.
- Use Spectator and Formly's testing utilities as described in the instructions.
- Ensure tests cover:
  - Rendering and input/output bindings
  - Formly config integration
  - Events, validation, and dynamic logic
  - Accessibility and edge cases
- **After generating or editing the test file:**
  1. Run the test(s).
  2. If any test fails, analyze the failure and update the test or code as needed.
  3. Repeat this process until all tests pass and the required coverage is achieved.

## 6. Coverage and Quality

- Target at least 90% code coverage for all `.ts` and `.spec.ts` files.
- Do not stop until all tests pass and coverage requirements are met.
- Maintain compatibility with existing tests when making incremental updates.

## 7. Example Patterns

- Refer to the examples in `.github/instructions/formly-testing.instructions.md` for real-world test patterns using `createFieldComponent`, Spectator, and Formly helpers.
- Use the available test utilities (`query`, `setInputs`, `detectChanges`, etc.) for robust and maintainable tests.

---

**Summary:**

- Always follow both general and Formly-specific testing instructions.
- Use change detection to focus on modified code while maintaining full coverage.
- Use the iterative test-run-fix workflow until all tests pass and coverage is sufficient.
- Prefer real-world, maintainable, and idiomatic test code.
- Maintain compatibility with existing tests when making incremental updates.

```

```
