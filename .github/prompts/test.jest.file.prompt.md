````prompt
---
mode: agent
---

# Jest Unit Test Generator

## Purpose

Create a comprehensive Jest unit test file (`spec.ts`) for a given source file, ensuring at least 90% code coverage and proper isolation from external dependencies. For Angular components and services, Spectator MUST be used.

## Input Parameters

- `fileName`: The path to the TypeScript file to test (e.g., `/path/to/source/file.ts`)

## Change Detection Strategy

Before generating tests, analyze the file against the master branch:

1. **New File**: If the file doesn't exist in master, generate complete unit tests for the entire file
2. **Modified File**: If the file exists in master:
   - Compare the current file with the master branch version using git diff
   - Identify added, modified, or removed functions, methods, and code blocks
   - Generate or update tests specifically for the changed code sections
   - Preserve existing tests for unchanged code (unless they need updates for compatibility)
   - Ensure the updated test suite maintains at least 90% coverage for the entire file

## Analysis Steps

1. Check if the file exists in the master branch
2. If it exists, get the git diff between current branch and master for the specific file
3. Parse the diff to identify:
   - New functions/methods/classes added
   - Modified functions/methods/classes
   - Removed functions/methods/classes
   - Changed imports or dependencies
4. Based on the analysis, determine testing strategy:
   - **New file**: Full test suite
   - **Changes detected**: Incremental test updates focusing on changed areas
   - **No changes**: Verify existing tests are adequate

## Output

A properly structured Jest test file that:

1. Has the same name as the original file with a `.spec.ts` suffix
2. Contains test cases for all functions, methods, and code paths (prioritizing changed code)
3. Achieves at least 90% code coverage for the entire file
4. Properly mocks all external dependencies
5. Uses Spectator for all Angular components and services
6. Follows TypeScript best practices for type safety in tests
7. Maintains compatibility with existing tests when making incremental updates

## Workflow Steps

1. **File Analysis**:
   ```bash
   # Check if file exists in master
   git show master:${fileName} 2>/dev/null

   # Get diff if file exists in master
   git diff master..HEAD -- ${fileName}
````

2. **Test Strategy Decision**:

   - If file is new → Generate complete test suite
   - If file has changes → Focus on changed sections + ensure overall coverage
   - Document what changed and why specific tests were added/modified

3. **Test Generation**:

   - Analyze the source file structure (classes, functions, methods, exports)
   - Identify all code paths that need testing
   - Generate tests with proper mocking and isolation
   - Ensure edge cases and error conditions are covered

4. **Coverage Validation**:
   - Run the generated tests
   - Verify coverage meets the 90% threshold
   - Iterate on tests if coverage is insufficient

## General Jest & Angular Testing Guidance

For all general Jest and Angular (Spectator) testing best practices, patterns, and troubleshooting tips, see:

- [.github/instructions/testing-best-practices.instructions.md](../instructions/testing-best-practices.instructions.md)

This prompt focuses on workflow-specific and project-specific instructions only.
