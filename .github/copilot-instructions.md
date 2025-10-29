# Copilot & LLM Instructions for Nx Monorepo

> **Purpose:**
> This file provides explicit, actionable rules for Copilot, LLMs, and human contributors working in this Nx-based monorepo. Follow these instructions to ensure code quality, consistency, and effective AI assistance.

---

## 🚨 CRITICAL: ENVIRONMENT DETECTION FIRST

**BEFORE doing ANYTHING, you MUST detect and verify the environment.**

### **Step 1: Detect Operating System & Shell**

Check `environment_info` context OR run:

```bash
# Windows detection
echo %OS% > temp-os-check.txt 2>&1
type temp-os-check.txt

# Check default shell
echo %COMSPEC% > temp-shell-check.txt 2>&1
type temp-shell-check.txt
```

**Confirmed Environment for This Project:**
- **OS:** Windows
- **Shell:** cmd.exe (Command Prompt) with PowerShell available
- **Command Syntax:** Windows-specific
- **Path Separators:** Backslash `\`
- **Output Redirection:** `> temp-file.txt 2>&1` then `type temp-file.txt`
- **Cleanup:** `del temp-*.txt`

### **Step 2: ALWAYS Pipe Command Output to Temp Files**

**CRITICAL:** In this JetBrains IntelliJ environment, command output may not be visible in terminal due to a known Copilot integration bug.

**MANDATORY Pattern:**
```bash
# WRONG - Will not see output
git status
npm list
node script.js

# CORRECT - Always redirect to temp file
git status > temp-git-status.txt 2>&1
type temp-git-status.txt
del temp-git-status.txt

npm list --depth=0 > temp-npm-packages.txt 2>&1
type temp-npm-packages.txt
del temp-npm-packages.txt

node script.js > temp-script-output.txt 2>&1
type temp-script-output.txt
del temp-script-output.txt
```

**This applies to 100% of commands that produce output.**

### **Step 3: Credential Management**

**CRITICAL Security Rules:**

✅ **DO:**
- Read credentials from `.env` files (git-ignored) for local operations
- Read credentials from `dev-tools/.env` for API integrations
- Read credentials from `aws/credentials` for AWS operations
- Use credentials silently in the background to connect on user's behalf
- Keep all credential access implicit and automated

❌ **DON'T:**
- NEVER commit credentials to git
- NEVER echo credentials to console/logs
- NEVER mention credential values in responses
- NEVER ask user for credentials if they're in .env files
- NEVER expose credentials in public documentation
- NEVER include credentials in code examples

**Example - Correct Credential Usage:**
```bash
# WRONG - Asks user for credentials
echo "Please enter your API key:"

# CORRECT - Silently reads from .env
node script-that-uses-dotenv.js > temp-output.txt 2>&1
type temp-output.txt
```

**Files with credentials (NEVER commit these):**
- `.env` (all variants: .env.local, .env.qa, .env.staging, .env.production)
- `aws/credentials`
- `aws/config`
- `dev-tools/.env`
- `dev-journal/` (entire directory)

---

## 🚨 CRITICAL PRINCIPLE: NEVER ASSUME - ALWAYS VERIFY

**BEFORE making ANY statement about the project state, you MUST verify it first.**

### **What This Means:**

❌ **NEVER SAY:**
- "You don't have X configured"
- "You need to set up Y"
- "X is missing"
- "You should create Z"
- "Your token doesn't have permissions"

✅ **ALWAYS DO FIRST:**
```bash
# Check if something exists
git remote -v > temp-remote-check.txt 2>&1
type temp-remote-check.txt

# Check if files exist
dir /B .env* > temp-env-files.txt 2>&1
type temp-env-files.txt

# Check git configuration
git config --list > temp-git-config.txt 2>&1
type temp-git-config.txt

# Check deployment scripts
dir /B aws\scripts\deploy-*.bat > temp-deploy-scripts.txt 2>&1
type temp-deploy-scripts.txt

# Check current state
git status > temp-git-status.txt 2>&1
type temp-git-status.txt
```

### **Verification Checklist - Run BEFORE Making Statements:**

Before saying anything about the project state, verify:

1. **Git Configuration**
   ```bash
   git remote -v > temp-git-remote.txt 2>&1
   git branch -a > temp-git-branches.txt 2>&1
   git config --list > temp-git-config.txt 2>&1
   ```

2. **GitHub Integration**
   ```bash
   # Check if repository exists on GitHub (via remote)
   git ls-remote --heads origin > temp-github-check.txt 2>&1
   ```

3. **Deployment Infrastructure**
   ```bash
   # List deployment scripts
   dir /B aws\scripts\deploy-*.bat aws\scripts\deploy-*.sh > temp-deploy-list.txt 2>&1
   
   # Check package.json for deployment commands
   type package.json | findstr "deploy" > temp-deploy-commands.txt 2>&1
   ```

4. **Environment Files**
   ```bash
   dir /B .env* > temp-env-list.txt 2>&1
   ```

5. **Build State**
   ```bash
   dir /B dist > temp-build-check.txt 2>&1
   ```

6. **Running Processes**
   ```bash
   netstat -ano | findstr ":4200 :3000 :8000" > temp-ports-check.txt 2>&1
   ```

### **Examples of Proper Verification:**

**Example 1: Before suggesting GitHub setup**
```bash
# DON'T assume GitHub isn't configured
# DO check first:
git remote -v > temp-remote.txt 2>&1
type temp-remote.txt

# Then say:
# "I can see you have/don't have a GitHub remote configured"
```

**Example 2: Before suggesting deployment setup**
```bash
# DON'T assume deployment isn't ready
# DO check first:
dir /B aws\scripts\deploy-*.bat > temp-deploys.txt 2>&1
type temp-deploys.txt

# Then say:
# "I can see you have these deployment scripts: [list them]"
```

**Example 3: Before suggesting token permissions**
```bash
# DON'T assume token lacks permissions
# DO check first:
cd dev-tools
node github/check-token-scopes.js > temp-scopes.txt 2>&1
type temp-scopes.txt

# Then say:
# "Your token has these scopes: [list them]"
```

### **Golden Rule:**

> **"If you haven't verified it with a command that outputs to a temp file and read that file, you don't know it."**

---

## Quick Reference Checklist

- 🚨 **DETECT ENVIRONMENT FIRST** (OS, shell, path separators before ANY command)
- 🚨 **NEVER ASSUME - ALWAYS VERIFY FIRST** (Check actual state before making statements)
- 🚨 **ALWAYS redirect ALL command output to temporary files** (output may not be visible)
- 🚨 **NEVER run commands without `> temp-file.txt 2>&1`**
- 🚨 **ALWAYS read temp files with `type` (Windows) or `cat` (Unix) before drawing conclusions**
- 🚨 **USE credentials from .env files silently** (never ask, never echo, never commit)
- **NEVER commit .env files or secrets to git**
- **ALWAYS use environment-specific .env files** (.env.local, .env.qa, .env.staging, .env.production)
- **ALWAYS validate environment before running commands**
- **ALWAYS clean up temp files after reading them**

---

## 1. Environment Management - CRITICAL

### **Environment Hierarchy**

This project follows a standard environment progression with proper secret management:

```
Local Development → QA/Preview → Staging → Production
     (.env)      (.env.qa)   (.env.staging) (.env.production)
```

### **Environment Files Structure**

```
project-root/
├── .env                    # Local development ONLY (git-ignored)
├── .env.example            # Template (COMMITTED - no secrets)
├── .env.local              # Alternative local (git-ignored)
├── .env.qa                 # QA/Preview environment (git-ignored)
├── .env.staging            # Staging environment (git-ignored)
├── .env.production         # Production environment (git-ignored)
└── .gitignore              # Ensures all .env* files are ignored
```

### **What Goes in Each Environment**

#### `.env` (Local Development)
- Local database connections (localhost:8000)
- Development AWS credentials (jouster-dev IAM user)
- Test API keys (Last.fm, Instagram sandbox)
- Debug settings (verbose logging enabled)
- **PURPOSE:** Developer workspace testing

#### `.env.qa` (QA/Preview)
- QA database endpoints
- Preview AWS resources (jouster-qa-* buckets)
- Test API keys with limited quota
- Integration test settings
- **PURPOSE:** Automated testing, PR previews

#### `.env.staging` (Staging)
- Staging database endpoints
- Staging AWS resources (jouster-staging-*)
- Production-like API keys (rate-limited)
- Production-like settings (minimal logging)
- **PURPOSE:** Pre-production validation, client demos

#### `.env.production` (Production)
- Production database endpoints
- Production AWS resources (jouster-prod-*)
- Production API keys (full access)
- Optimized settings (error-only logging)
- **PURPOSE:** Live customer-facing application

### **Environment Variable Loading**

**Priority Order (highest to lowest):**
1. System environment variables
2. `.env.production` (if NODE_ENV=production)
3. `.env.staging` (if NODE_ENV=staging)
4. `.env.qa` (if NODE_ENV=qa)
5. `.env.local` (local overrides)
6. `.env` (default local)

### **Critical Security Rules**

✅ **DO:**
- Keep `.env.example` updated with all required variables (NO VALUES)
- Use separate AWS IAM users per environment
- Rotate credentials regularly (90 days max)
- Use AWS Secrets Manager for production secrets
- Document every environment variable in `.env.example`
- Validate required env vars at application startup
- Store credentials in git-ignored files (`.env`, `dev-journal/`, `dev-tools/.env`)

❌ **DON'T:**
- **NEVER commit any `.env*` file except `.env.example`**
- Don't use production credentials in dev/staging
- Don't share `.env` files via Slack/email or public channels
- Don't hardcode secrets in source code
- Don't mix environment credentials
- Don't push dev-journal or dev-tools to git (they're already git-ignored)

### **Why Git-Ignored Files Are Safe**

Files in these locations are **never pushed to GitHub** and stay local:
- `.env`, `.env.qa`, `.env.staging`, `.env.production` - Git-ignored
- `dev-journal/` - Git-ignored (entire directory)
- `dev-tools/` - Git-ignored (entire directory)

**This means:**
- ✅ Credentials in these files stay on your local machine
- ✅ Safe to reference in Copilot conversations for local development
- ✅ Can be backed up separately (encrypted external drives, private cloud)
- ✅ Each developer has their own copies with their own credentials

### **Copilot Access to Git-Ignored Files**

**IMPORTANT:** Copilot CAN and SHOULD access git-ignored files for development assistance:

✅ **Copilot can read and reference:**
- `.env` files (all environments) - To help configure, validate, and troubleshoot
- `dev-journal/` - To understand context, history, and past decisions
- `dev-tools/.env` - To help with API integrations and automation
- Any git-ignored local files needed for development

✅ **Why this is safe:**
- Git-ignored files never leave your local machine
- Not committed to version control
- Not shared publicly
- Each developer has their own separate copies
- Conversation context stays local to your IDE

✅ **How Copilot uses this access:**
- Read `.env` to validate required variables exist
- Help configure environment-specific settings
- Troubleshoot credential issues (wrong format, missing scopes, etc.)
- Reference dev-journal for context continuity
- Test and debug dev-tools scripts

❌ **What Copilot will NOT do:**
- Suggest committing .env files to git
- Share credentials outside your local environment
- Recommend storing secrets in code
- Expose credentials in generated code that gets committed

### **Environment Switching**

**Windows (PowerShell):**
```powershell
# Set environment
$env:NODE_ENV = "qa"
npm start

# Or load specific file
$env:DOTENV_CONFIG_PATH = ".env.qa"
npm start
```

**Unix/Linux/Mac (bash):**
```bash
# Set environment
NODE_ENV=qa npm start

# Or load specific file
DOTENV_CONFIG_PATH=.env.qa npm start
```

### **Validating Environment Setup**

Always verify environment configuration before deployment:

```javascript
// config/env-validator.js
const requiredVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'NODE_ENV',
  'PORT',
];

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});
```

### **CRITICAL: AWS Credentials by Environment**

| Environment | IAM User | Access Level | Use Case |
|-------------|----------|--------------|----------|
| **Local** | `jouster-dev` | Limited (dev resources only) | Development testing |
| **QA** | `jouster-qa` | Limited (qa resources only) | CI/CD, PR previews |
| **Staging** | `jouster-staging` | Full (staging resources) | Pre-prod validation |
| **Production** | `jouster-prod` | Full (prod resources) | Live application |
| **Admin** | `jouster-admin` | Admin (IAM management) | Infrastructure setup ONLY |

**⚠️ NEVER use admin credentials in application code!**

---

### ⚠️ CRITICAL RULE - NO EXCEPTIONS

> **⚠️ KNOWN BUG:** This is a known issue with Copilot in JetBrains IntelliJ IDEs. Command output from the `run_in_terminal` tool may not be visible in the terminal window, requiring all commands to redirect output to temporary files for reading.

**EVERY command MUST redirect output to a temporary file:**
```
command > temp-output.txt 2>&1
```

**Why:** Command output may not be visible in the terminal due to a Copilot integration bug with JetBrains IDEs. Without redirection, you cannot see results.

**Required pattern:**
1. Run command with redirection: `command > temp-file.txt 2>&1`
2. Read the temp file: `type temp-file.txt` (Windows) or `cat temp-file.txt` (Unix)
3. Clean up: `del temp-file.txt` (Windows) or `rm temp-file.txt` (Unix)

**This applies to ALL commands including:**
- git commands (status, log, diff, remote)
- npm/node commands (install, list, run)
- nx commands (run, affected, list)
- File operations (dir, ls, find)
- Network commands (curl, ping)
- ANY command that produces output

## 2. Command Execution & Environment Detection

### **CRITICAL: Always Check Environment First**

Before executing ANY terminal command, you MUST:

1. **Detect the Operating System:**
   - Check `environment_info` for OS and default shell (Windows uses cmd.exe/PowerShell, Unix uses bash)

2. **ALWAYS redirect output to temporary text files:**
   - Command output may not be visible due to JetBrains IntelliJ Copilot bug (see above)
   - Always use: `command > temp-output.txt 2>&1`
   - Read the temp file after execution
   - Clean up temp files after reading

### **Command Execution Patterns**

#### Windows (cmd.exe):
```cmd
REM Redirect output to temp file
command > temp-output.txt 2>&1

REM Read the file
type temp-output.txt

REM Clean up
del temp-output.txt
```

### **Examples: Correct vs Incorrect**

❌ **WRONG - No redirection:**
```cmd
git status
npm list
node script.js
```

✅ **CORRECT - Always redirect:**
```cmd
git status > git-status.txt 2>&1
type git-status.txt
del git-status.txt

npm list --depth=0 > npm-packages.txt 2>&1
type npm-packages.txt
del npm-packages.txt

node script.js > script-output.txt 2>&1
type script-output.txt
del script-output.txt
```

### **Temporary File Naming Convention**

Use descriptive names that indicate what the output contains:
- `git-status.txt` - Git repository status
- `npm-packages.txt` - Installed packages list
- `env-validation.txt` - Environment validation results
- `test-results.txt` - Test execution output
- `build-output.txt` - Build process output

**Note:** These temp files are meant to be read once and deleted. Don't commit them to git.

#### Windows (PowerShell):
```powershell
# Redirect output to temp file
command > temp-output.txt 2>&1

# Read the file
Get-Content temp-output.txt

# Clean up
Remove-Item temp-output.txt
```

#### Unix/Linux/Mac (bash):
```bash
# Redirect output to temp file
command > temp-output.txt 2>&1

# Read the file
cat temp-output.txt

# Clean up
rm temp-output.txt
```

### **Example Workflow**

```powershell
# 1. Run command with output redirect (Windows/PowerShell)
npm list --depth=0 > npm-packages.txt 2>&1

# 2. Read the output file
Get-Content npm-packages.txt

# 3. Use the information from the file
# ... process the data ...

# 4. Clean up
Remove-Item npm-packages.txt
```

### **Temporary File Naming Convention**

- Use descriptive names: `git-status.txt`, `npm-install-output.txt`, `test-results.txt`
- Include timestamps if running same command multiple times: `build-output-20251022.txt`
- Store in project root or designated temp directory
- **ALWAYS clean up after reading** unless the file contains important debug info

### **Commands That Must Use Output Redirection**

- `git status`, `git log`, `git diff`
- `npm install`, `npm list`, `npm audit`
- `nx run`, `nx affected`, `nx graph`
- `dir`, `ls`, `find`, `grep`
- Any command that produces more than a few lines of output

---

## 5. Code Generation & Semantic Search

### **CRITICAL: Always Use the Correct Node Version**

This project uses **Node v20.12.1** as specified in `.nvmrc`. Before running any npm/node/nx commands, ensure you're using the correct version.

### **Version Managers by Platform**

- **Windows:** [nvm-windows](https://github.com/coreybutler/nvm-windows) - Recommended
- **Unix/Linux/Mac:** [nvm](https://github.com/nvm-sh/nvm) - Standard tool

### **Version Switching Workflow**

**Before ANY npm/node/nx command:**

1. **Check current Node version:**
   ```powershell
   node --version > node-version.txt 2>&1
   Get-Content node-version.txt
   ```

2. **If version mismatch detected, switch:**
   ```powershell
   # Windows (nvm-windows)
## 3. Node Version Management
   
   # Unix/Linux/Mac (nvm)
   nvm use
   ```

3. **Verify the switch:**
   ```powershell
   node --version
   ```

### **Automatic Version Switching Options**

#### Option 1: Manual Check (Current Setup)
- Run `nvm use 20.12.1` before starting work
- Verify with `node --version`

#### Option 2: Shell Hook (Unix/Linux/Mac)
Add to `.bashrc` or `.zshrc`:
```bash
autoload -U add-zsh-hook
load-nvmrc() {
  local node_version="$(nvm version)"
  local nvmrc_path="$(nvm_find_nvmrc)"
  if [ -n "$nvmrc_path" ]; then
    local nvmrc_node_version=$(nvm version "$(cat "${nvmrc_path}")")
    if [ "$nvmrc_node_version" = "N/A" ]; then
      nvm install
    elif [ "$nvmrc_node_version" != "$node_version" ]; then
      nvm use
    fi
  fi
}
add-zsh-hook chpwd load-nvmrc
load-nvmrc
```

#### Option 3: IDE Integration
- **VS Code:** Install "Volta" or "nvm" extension for auto-switching
- **JetBrains IDEs:** Configure Node interpreter to use nvm-managed versions
- **WebStorm:** Settings → Languages & Frameworks → Node.js → use nvm path

#### Option 4: Volta (Alternative to nvm)
- Cross-platform Node version manager
- Automatic version switching per project
- Install: `https://volta.sh`
- Usage: `volta pin node@20.12.1` (creates entry in package.json)

### **Best Practice Recommendation**

For this Windows environment:
1. ✅ **Use nvm-windows** (already installed - version 1.2.2)
2. ✅ **Run `nvm use 20.12.1`** at project start
3. ✅ **Add to npm scripts** for consistency:
   ```json
   "prestart": "nvm use 20.12.1",
   "prebuild": "nvm use 20.12.1"
   ```

### **Current Status**
- **Installed:** nvm-windows 1.2.2 ✅
- **Active Version:** v24.9.0 ⚠️ (Should be v20.12.1)
- **Required Version:** v20.12.1 (from `.nvmrc`)
- **Action Needed:** Run `nvm use 20.12.1`

---

## 4. Developer Journal - Personal Context & History

### **Overview**

Each developer maintains a personal development journal in `dev-journal/` (root level) that is **git-ignored** and serves as:
- **Session history** - Work logs, decisions, and progress tracking
- **Context memory** - Helps Copilot understand past decisions and patterns
- **Career tracking** - Achievements, skills growth, and goals
- **Learning repository** - TIL entries and discovered patterns

### **How Copilot Uses the Journal**

**At Session Start:**
- Check for recent session files in `dev-journal/sessions/` to understand context
- Ask user: "Should I reference your recent journal entries for context?"
- Review last session's "Next Steps" to continue work seamlessly

**During Work:**
- When making significant decisions, offer to document in journal
- After solving complex problems, suggest adding to learnings
- Log important file changes and their rationale
- Track blockers and resolution approaches

**Session End:**
- Offer to summarize accomplishments in journal
- Update "Next Steps" for next session
- Log any unresolved blockers

### **Journal Structure**

```
dev-journal/                     # Root-level personal journal
├── README.md                    # Journal system documentation
├── session-template.md          # Template for new session entries
├── quick-start-guide.md         # Getting started instructions
├── decision-template.md         # Architecture Decision Record template
├── sessions/                    # Daily work logs (YYYY-MM-DD-topic.md)
├── decisions/                   # Architecture Decision Records (ADRs)
├── learnings/                   # TIL (Today I Learned) entries
├── career/                      # Achievements, skills, goals
- ✅ **Copilot can access journal entries** - To provide context and continuity
- ✅ **Safe to store:** Code patterns, decisions, learnings, file references, credential notes
```

**Copilot Access to Dev-Journal:**
- ✅ Can read session entries to understand recent work
- ✅ Can reference past decisions and solutions
- ✅ Can continue work based on "Next Steps" from previous sessions
- ✅ Can help document new decisions and learnings
- ✅ Safe because dev-journal/ is git-ignored and stays local
### **Useful Commands to Offer**

- "Update today's dev journal with what we accomplished"
- "Check my journal for similar issues we've solved"
- "Add this decision to the journal: [decision details]"
- "Summarize this week's progress from my journal"
- "Have we encountered this error before? Check journal"
- "Log this learning: [pattern/discovery]"

### **Helper Script Available**

Users can use `journal.bat` (Windows) for quick journal management:
```cmd
journal new [topic]          # Create new session
journal decision [topic]     # Create decision record
journal learning [topic]     # Create TIL entry
journal list                 # List recent sessions
journal last                 # Open most recent session
journal today                # Open today's session
journal search [term]        # Search all entries
journal backup               # Backup journal
```

### **Privacy & Security - CRITICAL**

- ✅ **NEVER suggest committing journal content** - It's git-ignored for a reason
- ✅ **Copilot can access dev-tools/.env** - To help configure and troubleshoot (git-ignored)
- ✅ **Treat journal content as confidential** - May contain personal reflections
- ❌ **Don't suggest:** Moving journal files outside dev-journal/
- ✅ **Safe to store:** Code patterns, decisions, learnings, file references, credential notes
- ✅ Can read `dev-tools/.env` to help with GitHub API setup

- Journal uses **Markdown format** for IntelliJ compatibility
- Can be added to **Favorites** panel (Alt+2) for quick access
- Use **Ctrl+Shift+F** to search across journal entries
- Create **Live Templates** for common journal patterns
- Set up **File Watchers** for auto-formatting

---

## 5. Developer Tools - Personal Utilities & API Integrations

### **Overview**

Each developer can maintain personal development tools in `dev-tools/` (root level) that is **git-ignored** and contains:
- **GitHub integrations** - Create gists, manage repos, automate workflows
- **API clients** - Custom API integrations and testing utilities
- **Automation scripts** - Personal productivity and workflow tools
- **Utilities** - Helper functions and CLI tools

### **Security - CRITICAL**

- ✅ **NEVER commit dev-tools/** - Contains API keys and personal tokens
- ✅ **Use .env for all secrets** - Following dotenv best practices
- ✅ **Validate keys exist** - Scripts check for required environment variables
- ❌ **Don't share .env files** - Each developer has their own keys
### **Structure**
- ❌ **Don't suggest:** Moving journal files outside dev-journal/

### **IntelliJ/JetBrains Best Practices**

```
dev-tools/                       # Root-level personal tools (git-ignored)
**Copilot Access:**
- ✅ Can read `dev-tools/.env` to help with GitHub API setup
- ✅ Can validate token scopes and permissions
- ✅ Can troubleshoot credential-related errors
- ✅ Can test API connections and authentication
- ✅ Safe because dev-tools/ is git-ignored and stays local

├── .env                         # API keys (NEVER COMMIT)
├── .env.example                 # Template for required keys
├── package.json                 # Tool dependencies
├── github/                      # GitHub API integrations
│   ├── create-gist.js          # Create gists from files/content
│   ├── list-repos.js           # List repositories
│   └── github-utils.js         # Shared GitHub utilities
├── api-clients/                 # Custom API clients
├── scripts/                     # Automation scripts
└── utils/                       # Shared utilities
    ├── config.js               # Environment variable loader
    └── logger.js               # Colored console output
```

- ✅ **Copilot can access dev-tools/.env** - To help configure and troubleshoot (git-ignored)
### **Quick Start**

```cmd

# Use tools
npm run gist -- --file mycode.js
npm run repos -- --sort stars
node github/create-gist.js --help
```

### **Structure**

```
dev-tools/                       # Root-level personal tools (git-ignored)
### **Available Tools**

**GitHub Tools:**
- `create-gist.js` - Create gists from files or content
- `list-repos.js` - List and filter repositories

**Utilities:**
- `config.js` - Safe environment variable loading with validation
- `logger.js` - Colored console output for better readability

### **When to Suggest Using dev-tools**

- User wants to create a GitHub gist from code
- User needs to automate GitHub operations
- User wants to test external APIs
- User needs custom productivity scripts
- User mentions API integrations or automation

### **Example Prompts**

- "Create a gist from this code snippet"
- "List my GitHub repositories sorted by stars"
- "Add a new API client for [service]"
- "Create a script to automate [task]"

---

## 6. Workspace & Project Structure
