# Copilot Instructions for Jouster

> **Purpose:**
> Core AI behavior rules and essential guidelines for GitHub Copilot working in the Jouster project.
> 
> **Note:** This file is optimized for GitHub Copilot's 3000 token limit. For detailed guidance:
> - Full AI policy → [.github/instructions/ai-usage-guide.md](./instructions/ai-usage-guide.md)
> - Development workflows → [.github/instructions/development.md](./instructions/development.md)
> - Contribution guidelines → [CONTRIBUTING.md](../CONTRIBUTING.md)
> - Nx-specific rules → [.github/instructions/nx.instructions.md](./instructions/nx.instructions.md)

---

## 🚨 Core AI Behavior Rules

**CRITICAL:** AI must NEVER claim 100% certainty. Maximum confidence is 99%.

**Required approach:**
- ✅ Use tentative language ("appears", "suggests", "likely", "should")
- ✅ State confidence levels explicitly (70-90% = High, 40-70% = Moderate, <40% = Low)
- ✅ Always include verification steps
- ✅ Request user confirmation before declaring completion
- ✅ Acknowledge AI limitations (cannot test, cannot verify, cannot guarantee)

**Example format:**
```
Based on [evidence], this appears to be [conclusion].

Confidence: ~80% (High)
Verification: Please test by [specific action]
```

**Full policy:** See [.github/instructions/ai-usage-guide.md](./instructions/ai-usage-guide.md)

---

## Project Context

**Workspace:** Nx monorepo (v16.10.0, npm, TypeScript/Angular)

**Structure:**
- `apps/` - jouster-ui (Angular), backend (Node.js)
- `libs/` - Shared code (always reuse, never duplicate)
- `docs/` - Documentation
- `infrastructure/` - Terraform/IaC
- `.github/` - CI/CD, workflows

**Key Rule:** Always use semantic search before coding to find existing patterns.

---

## Coding Standards

- **Style:** 2 spaces, 120 char lines, single quotes, always semicolons
- **Naming:** camelCase (vars), PascalCase (classes), kebab-case (files)
- **TypeScript:** Never use `any`, always type everything
- **Tests:** Jest/Cypress, 80% coverage, `.spec.ts` files alongside code
- **Docs:** JSDoc for public APIs, update README with changes

---

## Git Workflow

**Branches:**
- `[initials]-[ticket]-[description]` (e.g., `jb-US1234-add-login`)
- `[initials]-OP-[description]` (operational/non-ticket work)

**Commits:** Conventional Commits format
```
feat(app-name): add feature
fix(lib-name): resolve bug
docs: update guide
```

**PRs:** Against `develop`, must pass lint/test/build, 1+ review required

---

## Security Critical

- **Never commit:** secrets, API keys, credentials (.env only)
- **Never reference:** dev-journal/ or dev-tools/ in public PRs/docs (may contain PII)
- **Never expose:** API keys in logs or console output
- **Always validate:** user input, sanitize output

---

## Nx Usage

- **Generate code:** `nx generate @nx/angular:component` (use generators, not manual files)
- **Commands:** `nx serve`, `nx build`, `nx test`, `nx affected --target=test`
- **Cache:** `nx reset` to clear cache
- **Details:** See [.github/instructions/nx.instructions.md](./instructions/nx.instructions.md)

---

## Terminal & Shell Commands

**CRITICAL:** Always detect the shell type before running commands. Check environment info for shell indicators.

**Shell Detection:**
- **cmd.exe** (Windows): Look for `C:\>` prompt or environment info showing cmd.exe
- **PowerShell** (Windows): Look for `PS C:\>` prompt or pwsh/powershell in environment
- **bash/zsh/sh** (Linux/macOS): Look for `$` or `#` prompt, or environment showing bash/zsh

**Output Redirection (MANDATORY for all shells):**

```cmd
REM cmd.exe (Windows):
git status > tmp\git-status.txt 2>&1 && type tmp\git-status.txt
dir /s /b *.ts > tmp\files.txt && type tmp\files.txt

REM PowerShell (Windows):
git status | Out-File tmp\git-status.txt; Get-Content tmp\git-status.txt
Get-ChildItem -Recurse *.ts | Out-File tmp\files.txt; Get-Content tmp\files.txt

# bash/zsh/sh (Linux/macOS):
git status > tmp/git-status.txt 2>&1 && cat tmp/git-status.txt
find . -name "*.ts" > tmp/files.txt && cat tmp/files.txt
```

**Why:** Terminal output can be invisible/empty without redirection, especially in cmd.exe. Always redirect to tmp/ files you can read.

**If output appears empty:** Always double-check by redirecting to a temp file and reading that file.

---

## Quick Reference Checklist

- **NEVER claim 100% certainty** - Always use tentative language and require human verification
- **NEVER say "complete" or "verified"** - Always await explicit user confirmation
- **Always include confidence levels** - State your certainty percentage and verification steps
- **Use the scientific method for problem-solving:** Observe, research, hypothesize, experiment, analyze, solve, verify
- **Never claim completion without user verification:** Always await user confirmation before marking work as complete
- **Cite sources for all claims:** Reference GitHub (PRs/commits), documentation, or other verifiable sources for achievements and facts
- Analyze the workspace/project structure before any change
- Use semantic search to find code, docs, and patterns—never assume
- Never duplicate logic; always reuse or reference code in `libs/`
- Follow Nx conventions and use Nx tools/generators for project/config changes
- Use clear, consistent naming and coding standards
- Write and update tests and documentation with every change
- Use Conventional Commits and proper branch naming
- Never commit secrets or sensitive data (API keys in .env only)
- Never reference dev-journal/ or dev-tools/ in public PRs or documentation (exception: these instructions only - may contain PII/credentials)
- Always review Copilot/LLM suggestions for correctness, security, and style
- **Always include verification recommendations in responses**
- When debugging, document your investigation process and findings
- When in doubt, search the workspace or ask for clarification

---

## 1. How to Use This File

- **LLMs (Copilot, ChatGPT, etc.):** Treat every rule as mandatory. **NEVER claim 100% certainty about anything.** Use tentative language ("appears to", "suggests", "likely", "should") in all responses. Always include confidence levels, verification steps, and explicitly request user confirmation. Use semantic search and Nx tools before generating or editing code. If unsure, search for examples or ask for clarification. **Never declare work "complete", "verified", "ready", or "guaranteed" without explicit user confirmation.** Always cite sources (GitHub PRs/commits, documentation) when referencing facts or decisions. **Express all conclusions with appropriate confidence levels (percentage or qualitative) and acknowledge limitations.**
- **Humans:** Review and follow these rules for all code, config, and documentation changes. Use as a checklist for PRs and reviews. **ALWAYS verify AI-generated content before using or submitting it.** Never trust AI claims of 100% certainty - always test and validate yourself.

---

## 2. Workspace & Project Structure

- **Monorepo:** Nx-managed, with top-level folders:
  - `apps/`: Application entry points (APIs, frontends, etc.)
  - `libs/`: Shared libraries (UI, utilities, services, domain models, etc.)
  - `infrastructure/`: Terraform or other infrastructure-as-code modules
  - `tools/`: Custom scripts and Nx plugins
  - `docs/`: Documentation
  - `bin/`: Executable scripts
  - `tmp/`: Temporary files for command output (gitignored)
  - `dev-journal/`: Personal notes, work tracking, internal documentation (gitignored, local only)
  - `dev-tools/`: Development tools and utilities (gitignored, local only)
- Each app/lib may have its own `src/` with `lib/`, `assets/`, `environments/`.
- **Nx conventions:** Use `project.json` in app/lib roots, and centralized config in `nx.json`, `workspace.json`, `tsconfig.base.json`.
- **Reuse:** Reference shared code from `libs/`—never duplicate logic in `apps/`.
- **Infrastructure:** Follow `modules/`, `nonprod/`, `prod/` folder patterns.
- **Naming:** Use consistent naming for files, folders, and symbols. Example: `user-profile.service.ts` (kebab-case).
- **Local-only folders:** Always use relative paths for `tmp/`, `dev-journal/`, and `dev-tools/` - never absolute paths

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
- **Branch names:**
  - **Feature/Bug branches:** `[initials]-[rallyticketnumber]-[short-description]`
    - **Example:** `pd-US2234-update-roles`
  - **Operational branches:** `[initials]-OP-[optional-description]`
    - **Example:** `jb-OP-copilot-instructions` or `jb-OP`
    - Use for non-Rally work: documentation updates, tooling, configurations
  - **Official Strategy:** See [RS.com Branching Strategy](https://republicservices.atlassian.net/wiki/spaces/WMD/pages/886014943/RS.com+Branching+Strategy) on Confluence for complete guidelines
- All code must pass lint, test, and build checks before merging.
- At least one code review required for all PRs.
- **Code reviews:** Must be performed by code owners as defined in `.github/CODEOWNERS`.

### Rally Integration Best Practices

**⚠️ CRITICAL RULE: Rally and Confluence updates require explicit user consent**

- **NEVER** create, update, or modify Rally items without pausing for user approval
- **NEVER** create, update, or modify Confluence pages without pausing for user approval
- **ALWAYS** provide a brief summary of what will be updated/created/modified
- **WAIT** for explicit user consent before proceeding with any Rally or Confluence operations

**🔒 SECURITY: Rally and Confluence API Access**

- **ALWAYS** use API keys from `.env` file for Rally and Confluence access
- **NEVER** commit `.env` file or expose API keys in code
- **NEVER** reference API keys, tokens, or credentials in public PRs, documentation, or commit messages
- **NEVER** log or display API keys in console output
- API keys are for local development and CI/CD only - keep them secure

- **Reference Rally IDs** in commits for features and bug fixes: `feat(rs-shop): add authentication [US12345]`
- **Rally Item Types:**
  - `US####` - User Stories (new features, enhancements)
  - `DE####` - Defects (bug fixes, issues)
  - `TA####` - Tasks (technical work, maintenance, refactoring)
- **PR Requirements:**
  - Include Rally ID in PR title
  - Link to Rally item in PR description
  - Update Rally status when PR is merged
- **Target Metrics:**
  - Rally reference rate >80% for feat/fix commits
  - Commit-to-Rally traceability >70%

### Confluence Integration Best Practices

**Atlassian Confluence** is the team's wiki and knowledge management platform for documentation.

**Confluence Terminology:**

- **Space** - A collection of related pages (e.g., "Engineering", "Digital Platform")
- **Page** - A single wiki page with content (equivalent to a document)
- **Parent/Child Pages** - Hierarchical page organization
- **Labels** - Tags for categorizing and discovering pages
- **Page Tree** - The hierarchical navigation structure
- **Macros** - Dynamic content modules (e.g., code blocks, diagrams, tables of contents)
- **Attachments** - Files linked to pages
- **Comments** - Discussion threads on pages
- **Restrictions** - Page-level access controls

**When to Create Confluence Pages:**

- New features requiring setup or configuration
- Breaking changes or major refactors
- Cross-team integrations or dependencies
- Production incidents and their resolutions (Post-Mortems)
- Team processes and standards
- Architectural Decision Records (ADRs)
- API documentation and integration guides

**Page Organization:**

- **Use Page Hierarchy:** Create parent pages for major topics, child pages for details
- **Consistent Naming:** Use clear, descriptive titles (e.g., "RS Shop - Direct Bill Configuration")
- **Space Structure:** Organize pages within appropriate spaces
- **Breadcrumbs:** Leverage parent-child relationships for navigation

**Documentation Types:**

- **Technical Design Documents (TDDs):** Architecture decisions, API designs, data models
- **How-To Guides:** Setup instructions, configuration guides, deployment procedures
- **Troubleshooting Guides:** Common issues, debugging steps, error resolutions
- **Runbooks:** Operational procedures, incident response, maintenance tasks
- **Post-Mortems:** Production incident analysis and lessons learned
- **ADRs (Architectural Decision Records):** Document architectural choices and rationale

**Confluence Best Practices:**

- **Use Page Templates:** Leverage Confluence templates for consistency (TDD, API Doc, Runbook, ADR)
- **Add Table of Contents:** Use the TOC macro for long pages
- **Include Diagrams:** Use draw.io integration or attach architecture diagrams
- **Code Snippets:** Use code block macros with syntax highlighting
- **Keep Current:** Add "Last Updated" dates, archive outdated pages
- **Cross-Link:** Link to related pages, PRs, Rally items, and GitHub repositories
- **Use Labels Consistently:** Apply standard labels for discoverability (e.g., #api, #architecture, #troubleshooting)
- **Page Restrictions:** Use sparingly - prefer open access for team collaboration
- **Watch Pages:** Set up notifications for pages you own or contribute to

**Rally-Confluence Integration:**

- **Bi-directional Links:** Add Confluence page URLs in Rally items, reference Rally IDs (US####, DE####) in pages
- **Traceability Chain:** Rally Item → PR → Code → Confluence Documentation
- **When to Link:**
  - Link Technical Design Documents to related User Stories
  - Link Troubleshooting Guides to related Defects
  - Link Post-Mortems to incident Tasks
  - Link API documentation to feature Stories

**Page Maintenance:**

- **Review Quarterly:** Check for outdated information
- **Archive Old Content:** Move obsolete pages to an "Archive" space
- **Update Ownership:** Ensure pages have current owners/contacts
- **Version History:** Use Confluence's built-in version control, don't duplicate pages for versions

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
- **Atlassian API keys:** Use from .env for Rally/Confluence access, never commit or expose publicly
- Validate all user input; sanitize outputs.
- Run dependency vulnerability scans regularly.
- **Never** reference `dev-journal/` or `dev-tools/` in public PRs, documentation, or external communications.
  - `dev-journal/` and `dev-tools/` are private workspace folders (in `.gitignore`)
  - Used for personal notes, work tracking, internal documentation, and development utilities only
  - **EXCEPTION:** These instructions (`.github/copilot-instructions.md`) are the ONLY place where dev-journal/dev-tools may be referenced
    - _Yes, we see the irony of documenting "never reference dev-journal" while referencing it here_ 😄
    - Instructions are internal documentation for the team
    - Instructions are in source control, not in public-facing docs or PRs
  - **SECURITY CRITICAL:** Do NOT include dev-journal or dev-tools content in:
    - PR titles or descriptions
    - Commit messages
    - Public documentation (README, wiki, external docs)
    - Code comments
    - Log files or error messages
  - **Why this matters:** Dev folders may contain:
    - Personal information (PII)
    - API keys or credentials during testing
    - Customer names or sensitive business data
    - Unreviewed thoughts or incomplete analysis
    - Proprietary tooling or scripts
  - Always use relative paths (e.g., `dev-journal/notes.md` or `dev-tools/scripts/analyze.js`, not `C:\dev\digital-platform\dev-journal\notes.md`)
- **Never** expose API keys, tokens, or credentials in logs, console output, or error messages

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
- **NEVER claim 100% confidence** - Always recommend verification of:
  - Code functionality (test it)
  - Data accuracy (check sources)
  - Metrics and statistics (verify calculations)
  - Documentation claims (cite sources)
  - Architecture recommendations (validate assumptions)
- **Include verification steps** in all responses involving:
  - Performance data or metrics
  - Code analysis or refactoring suggestions
  - Documentation or technical writing
  - Bug fixes or troubleshooting
- **Cite sources** when providing factual information (Rally tickets, GitHub commits, documentation)
- **Mark confidence levels** (High/Medium/Low) when uncertain
- **Encourage human validation** - AI can hallucinate, misinterpret context, or make logical errors

---

## 17. Nx-Specific Guidance

- **Always** use Nx tools and generators for project/config changes.
- Refer to `.github/instructions/nx.instructions.md` for Nx-specific rules and flows.
- Use the Nx MCP server and tools as available.
- If your workspace is configured with MCP servers, see `.vscode/mcp.json` for server details and endpoints. Use these for advanced Nx automation, code generation, and workspace analysis.

---

## 18. If Unsure

- **If you are unsure about a pattern, convention, or implementation:**
  - Use semantic search to find examples in the codebase.
  - Review Nx documentation and `.github/instructions/nx.instructions.md`.
  - Ask for clarification if ambiguity remains.

---

## 19. Terminal Commands & Shell Detection

**CRITICAL RULE:** Always detect the user's shell before executing terminal commands. Apply shell-specific syntax based on detection.

### Shell Detection Strategy

1. **Check environment info** provided at the start of the session
2. **Look for shell indicators** in command outputs (e.g., `C:\>` for cmd.exe, `PS C:\>` for PowerShell, `$` for bash)
3. **Use appropriate syntax** for the detected shell
4. **Default to cmd.exe** on Windows unless PowerShell is explicitly indicated
5. **Default to bash** if shell cannot be determined on Unix-like systems

### Command Execution Strategy (All Shells)

1. **ALWAYS redirect large or complex output to temporary files** for reading
2. **Use proper path syntax** for the shell (backslashes for Windows, forward slashes for Unix)
3. **Verify commands work** in the user's actual shell environment

### cmd.exe-Specific Patterns (Windows Command Prompt)

**✅ Use these patterns for cmd.exe:**

```cmd
REM For directory listings with potential large output:
dir /s /b "C:\path\with spaces" > tmp\dir-output.txt

REM For git commands with large output:
git log --oneline --author="name" > tmp\git-output.txt

REM For npm/node commands:
npm list > tmp\npm-list.txt

REM For finding files:
dir /s /b *.ts > tmp\ts-files.txt

REM Then read the temporary file with read_file tool
```

**❌ NEVER do this in cmd.exe:**

```
Get-ChildItem -Path "path"    # PowerShell syntax - FAILS in cmd.exe
ls -la /path                  # bash syntax - FAILS in cmd.exe
```

### PowerShell-Specific Patterns (When PowerShell Detected)

**✅ Use these patterns for PowerShell:**

```powershell
# For directory listings with potential large output:
Get-ChildItem -Path "C:\path\with spaces" -Recurse | Out-File -FilePath "tmp\dir-output.txt"

# For searching/filtering:
Get-ChildItem -Path "C:\path" -Filter "*.ts" | Out-File -FilePath "tmp\search-output.txt"

# For git commands with large output:
git log --oneline --author="name" | Out-File -FilePath "tmp\git-output.txt"
```

### Bash-Specific Patterns (Unix/Linux/Mac)

**✅ Use standard Unix patterns:**

```bash
# For directory listings with potential large output:
ls -la /path/to/directory > tmp/dir-output.txt

# For searching/filtering:
find /path -name "*.ts" > tmp/search-output.txt

# For git commands with large output:
git log --oneline --author="name" > tmp/git-output.txt
```

### Temporary File Management

**Windows (cmd.exe or PowerShell):**

- **Location:** Always use `tmp\` (relative path with backslash from project root)
- **Naming:** Use descriptive names: `dir-output.txt`, `git-log-output.txt`, `search-results.txt`
- **Cleanup:** Temporary output files are gitignored and can be overwritten

**Unix/Linux/Mac (bash/zsh/sh):**

- **Location:** Use `tmp/` (relative path with forward slash) or `/tmp/`
- **Naming:** Use descriptive names: `dir-output.txt`, `git-log-output.txt`, `search-results.txt`
- **Cleanup:** Files in `/tmp/` are typically cleaned automatically; project temp files should be gitignored

### Common Commands by Shell

**cmd.exe (Windows Command Prompt):**

| Task           | cmd.exe Command                           |
| -------------- | ----------------------------------------- |
| List directory | `dir "path"`                              |
| Recursive list | `dir /s /b "path"`                        |
| Filter files   | `dir /s /b "path\*.ts"`                   |
| Output to file | `command > path\file.txt`                 |
| Search content | `findstr /s /i "pattern" "path\*.ts"`     |

**PowerShell:**

| Task           | PowerShell Command                              |
| -------------- | ----------------------------------------------- |
| List directory | `Get-ChildItem -Path "path"` or `ls`            |
| Recursive list | `Get-ChildItem -Path "path" -Recurse`           |
| Filter files   | `Get-ChildItem -Path "path" -Filter "*.ts"`     |
| Output to file | `command | Out-File -FilePath "path"`           |
| Search content | `Select-String -Path "path" -Pattern "pattern"` |

**Bash/Unix:**

| Task           | Bash Command             |
| -------------- | ------------------------ |
| List directory | `ls -la path`            |
| Recursive list | `find path -type f`      |
| Filter files   | `find path -name "*.ts"` |
| Output to file | `command > path`         |
| Search content | `grep -r "pattern" path` |

### Why This Matters

- **Prevents command failures** due to shell-specific syntax issues
- **Handles large outputs** that exceed terminal buffer limits
- **Enables reliable data analysis** by reading structured file content
- **Avoids cross-shell syntax confusion** (cmd.exe vs PowerShell vs bash)
- **Works consistently** across different development environments

---

## 20. Example Prompts & Responses

**Prompt:**

> Add a new shared date utility to the monorepo.

**Ideal LLM Response:**

- Use semantic search to check for existing date utilities in `libs/`.
- If none exist, generate a new library in `libs/` using Nx generators.
- Place the utility in the new/existing shared lib, following naming and code style conventions.
- Add tests alongside the utility with `.spec.ts` suffix.
- Update or create `README.md` for the lib.

---

**Summary:**

- Follow these rules for all code, config, and documentation changes.
- Prioritize reuse, clarity, and security.
- When in doubt, search the workspace or ask for clarification.
- These instructions are for both Copilot/LLMs and human contributors.
