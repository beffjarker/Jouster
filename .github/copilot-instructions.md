# Copilot & LLM Instructions for Nx Monorepo

> **Purpose:**
> This file provides explicit, actionable rules for Copilot, LLMs, and human contributors working in this Nx-based monorepo. Follow these instructions to ensure code quality, consistency, and effective AI assistance.

---

## Quick Reference Checklist

- Analyze the workspace/project structure before any change
- Use semantic search to find code, docs, and patterns—never assume
- Never duplicate logic; always reuse or reference code in `libs/`
- Follow Nx conventions and use Nx tools/generators for project/config changes
- Use clear, consistent naming and coding standards
- Write and update tests and documentation with every change
- Use Conventional Commits and proper branch naming
- Never commit secrets or sensitive data
- Always review Copilot/LLM suggestions for correctness, security, and style
- When in doubt, search the workspace or ask for clarification
- Use GitHub CLI for repository operations when available
- **NEVER commit or push code without explicit user permission**

---

## 1. How to Use This File

- **LLMs (Copilot, ChatGPT, etc.):** Treat every rule as mandatory. Use semantic search and Nx tools before generating or editing code. If unsure, search for examples or ask for clarification. **ALWAYS ask for permission before committing or pushing any changes.**
- **Humans:** Review and follow these rules for all code, config, and documentation changes. Use as a checklist for PRs and reviews.

---

## 2. Workspace & Project Structure

- **Monorepo:** Nx-managed, with top-level folders:
  - `apps/`: Application entry points (APIs, frontends, etc.)
  - `libs/`: Shared libraries (UI, utilities, services, domain models, etc.)
  - `infrastructure/`: Terraform or other infrastructure-as-code modules
  - `tools/`: Custom scripts and Nx plugins
  - `docs/`: **Obsidian Documentation Vault** - Organized project documentation with cross-references
    - `AI/`: AI integration and conversation history
    - `Architecture/`: System and component architecture
    - `Development/`: Development guides and setup
    - `Features/`: Feature-specific documentation
    - `Integrations/`: API and service integrations
    - `Project/`: Project overview and management
    - `Tools/`: Development tools and workflows
    - `aws/`: AWS deployment and infrastructure
  - `bin/`: Executable scripts
- Each app/lib may have its own `src/` with `lib/`, `assets/`, `environments/`.
- **Nx conventions:** Use `project.json` in app/lib roots, and centralized config in `nx.json`, `workspace.json`, `tsconfig.base.json`.
- **Reuse:** Reference shared code from `libs/`—never duplicate logic in `apps/`.
- **Infrastructure:** Follow `modules/`, `nonprod/`, `prod/` folder patterns.
- **Naming:** Use consistent naming for files, folders, and symbols. Example: `user-profile.service.ts` (kebab-case).

---

## 3. Code Generation & Semantic Search

- **Always** analyze the workspace and project structure before making suggestions or changes.
- **Always** use semantic search to:
  - Find code, comments, or docs before making assumptions.
  - Discover conventions, types, and patterns to ensure consistency.
- **Never** duplicate logic—reuse or reference existing code.
- **If unsure:** Use semantic search to find examples in the codebase.
- **For config/infrastructure:** Find and follow similar files/modules.
- **If in doubt:** Ask for clarification or use semantic search to reduce ambiguity.

---

## 4. Coding Standards & Style

- Indentation: 2 spaces, never tabs.
- Max line length: 120 characters.
- Strings: Use single quotes in TypeScript/JavaScript unless the string contains a single quote.
- Trailing commas: Always in multi-line objects/arrays.
- Semicolons: Always in TypeScript/JavaScript.
- Naming:
  - camelCase for variables/functions
  - PascalCase for classes/interfaces
  - kebab-case for file names

**Example:**

```ts
// Good
const userName = 'Alice';
class UserProfile {}
// File: user-profile.service.ts
```

---

## 5. Testing Guidelines

- Place test files alongside code, using `.spec.ts` or `.spec.js` suffix.
- Use Jest for unit/integration, Cypress for e2e.
- Mock external dependencies/services.
- Name test cases clearly.
- **Target:** ≥80% code coverage on new code.

---

## 6. Documentation Standards

- Use JSDoc/TSDoc for functions, classes, interfaces.
- Comment complex logic/business rules.
- Each app/lib must have a `README.md` (purpose, usage, setup).
- **Always** update docs with code changes.

---

## 7. Pull Request & Review Process

- **Commit messages:** Use Conventional Commits, reference affected app/lib in parentheses.
  - **Example:** `feat(unified-wp-common): add new login endpoint`
- **Branch names:** `[initials]-[rallyticketnumber]-[short-description]`
  - **Example:** `pd-US2234-update-roles`
- All code must pass lint, test, and build checks before merging.
- **GitHub CLI:** Use `gh` commands for efficient repository operations:
  - Create branches: `gh repo create` or work with existing repos
  - Create PRs: `gh pr create --title "feat: description" --body "Details"`
  - Review PRs: `gh pr review` with appropriate comments
  - Merge PRs: `gh pr merge` with appropriate merge strategy
  - Check CI status: `gh run list` and `gh run view`
- **CRITICAL:** Never commit or push without explicit user permission. Always stop and ask before executing `git commit`, `git push`, or equivalent GitHub CLI commands.

---

## 8. Dependency Management

- Add dependencies with `npm install --save` or `--save-dev`.
- Remove unused dependencies promptly.
- Prefer internal `libs/` over external packages.
- Regularly update dependencies for security.

---

## 9. Error Handling & Logging

- Use shared logger utility; **never** use `console.log` in production.
- Handle errors gracefully; provide meaningful messages.
- **Never** expose sensitive info in logs/errors.

---

## 10. Security & Compliance

- **Never** commit secrets or sensitive data.
- Use environment variables for config/secrets.
- Validate all user input; sanitize outputs.
- Run dependency vulnerability scans regularly.

---

## 11. Performance & Optimization

- Avoid unnecessary computations/re-renders in UI.
- Use memoization/caching where appropriate.
- Lazy load modules/assets when possible.

---

## 12. CI/CD & Automation

- All code must pass CI checks before merging.
- CI/CD config files are in `.github/` or `tools/`.
- Use status checks to enforce code quality/test coverage.

---

## 13. Platform-Specific Conventions

- **Frontend:** Follow accessibility (ARIA, keyboard nav) and i18n best practices.
- **Backend:** Structure/document API endpoints consistently.
- **Infrastructure:** Use module/environment folder patterns as above.

---

## 14. Internationalization & Accessibility

- Use i18n libraries for all user-facing text.
- Ensure all UI components are accessible.

---

## 15. Common Pitfalls & Anti-Patterns

- **Never** use `any` in TypeScript unless absolutely necessary.
- **Never** manipulate the DOM directly; use framework abstractions.
- **Never** duplicate logic; always check for reusable code in `libs/`.

---

## 16. Copilot & LLM Usage

- Use Copilot/LLM suggestions as a starting point—**always** review and edit code.
- Prompt Copilot/LLMs with clear, specific instructions.
- Use semantic search to find examples/patterns before generating code.
- Review Copilot/LLM-generated code for correctness, security, and style before committing.
- **MANDATORY:** Always ask for explicit user permission before committing or pushing any changes.

---

## 17. Nx-Specific Guidance

- **Always** use Nx tools and generators for project/config changes.
- Refer to `.github/instructions/nx.instructions.md` for Nx-specific rules and flows.
- Use the Nx MCP server and tools as available.
- If your workspace is configured with MCP servers, see `.vscode/mcp.json` for server details and endpoints. Use these for advanced Nx automation, code generation, and workspace analysis.

---

## 18. GitHub CLI Integration

- **GitHub CLI is available** and should be used for repository operations
- **IMPORTANT:** Before using any commit or push commands, always ask for user permission first
- **Common GitHub CLI commands for this workflow:**
  - `gh repo view` - Get repository information
  - `gh branch create feature-branch-name` - Create and switch to new branch
  - `gh pr create --draft` - Create draft PR for work in progress
  - `gh pr create --title "Title" --body "Description"` - Create PR with details
  - `gh pr list` - List open PRs
  - `gh pr view` - View PR details
  - `gh pr review --approve` - Approve PR
  - `gh pr merge --squash` - Merge PR with squash
  - `gh run list` - View workflow runs
  - `gh run view` - View specific workflow run details
  - `gh issue create` - Create issues for bugs or features
- **Use GitHub CLI for automation:**
  - Check CI/CD status before merging
  - Create PRs with proper templates and labels
  - Link issues to PRs automatically
  - Set up branch protection and status checks
- **CRITICAL SAFETY RULE:** Never execute commit or push operations without explicit user consent. Always ask: "Should I commit and push these changes?" before proceeding.

---

## 19. Git Safety & Permission Protocol

- **ABSOLUTE RULE:** Never commit or push code without explicit user permission
- **Before any commit operation:**
  1. Show a summary of changes to be committed
  2. Ask: "Should I commit these changes with message: [commit message]?"
  3. Wait for explicit approval before proceeding
- **Before any push operation:**
  1. Show what will be pushed (branch, commits)
  2. Ask: "Should I push these commits to [branch name]?"
  3. Wait for explicit approval before proceeding
- **Safe operations that don't require permission:**
  - Reading files
  - Editing files (without committing)
  - Running tests
  - Building the project
  - Checking git status
  - Creating branches (local only)
- **Operations requiring permission:**
  - `git commit` or equivalent
  - `git push` or equivalent
  - `gh pr create` (creates remote branch)
  - Any operation that creates or modifies remote repository state
