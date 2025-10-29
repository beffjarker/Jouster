# Copilot Verification Protocol

**Last Updated:** October 28, 2025  
**Purpose:** Ensure AI assistants verify project state before making assumptions

---

## 🚨 STEP 0: DETECT ENVIRONMENT FIRST (CRITICAL)

**BEFORE doing ANYTHING, detect and confirm the operating environment.**

### For This Project (Confirmed):
```
Operating System: Windows
Default Shell: cmd.exe (Command Prompt)
Alternative Shell: PowerShell (available)
Path Separator: Backslash (\)
Command Syntax: Windows-specific
Output Handling: MUST pipe to temp files
Credential Storage: .env files (git-ignored)
```

### Environment Detection Commands:
```bash
# Check OS
echo %OS% > temp-os.txt 2>&1
type temp-os.txt

# Check shell
echo %COMSPEC% > temp-shell.txt 2>&1
type temp-shell.txt

# Verify we're in project root
dir /B package.json > temp-root-check.txt 2>&1
type temp-root-check.txt
```

### Why This Matters:
- **Windows vs Unix:** Different command syntax (`dir` vs `ls`, `del` vs `rm`, `type` vs `cat`)
- **Path separators:** Windows uses `\`, Unix uses `/`
- **Output visibility:** JetBrains Copilot bug requires temp file redirection
- **Credential access:** Know where .env files are located and how to read them

---

## 🚨 CRITICAL PRINCIPLE

### **NEVER ASSUME - ALWAYS VERIFY**

Before making ANY statement about what exists or doesn't exist in the project, you MUST verify it with actual commands.

---

## Why This Matters

**Problem:**
AI assistants often make assumptions based on common patterns:
- "You need to set up GitHub" (when GitHub is already configured)
- "Your token needs permissions" (when permissions are already correct)
- "You don't have deployment scripts" (when blue/green system exists)

**Solution:**
Run verification commands FIRST, read the output, THEN make informed statements.

---

## Standard Verification Commands

### 0. Credential Management (Use Silently)

**CRITICAL: Credentials are stored in git-ignored files. Use them automatically, never expose them.**

**Where Credentials Live:**
```
.env                    # Local development credentials
.env.qa                 # QA environment credentials
.env.staging            # Staging credentials
.env.production         # Production credentials
aws/credentials         # AWS IAM credentials
aws/config              # AWS region configuration
dev-tools/.env          # GitHub tokens, API keys
```

**How to Use Credentials:**
```bash
# CORRECT - Scripts read from .env automatically
node script.js > temp-output.txt 2>&1
type temp-output.txt

# CORRECT - AWS CLI reads from aws/credentials automatically
aws s3 ls > temp-buckets.txt 2>&1
type temp-buckets.txt

# WRONG - Never ask user for credentials
echo "Enter your API key:"

# WRONG - Never echo credentials
type .env

# WRONG - Never include in examples
echo "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE"
```

**Credential Rules:**
✅ **DO:**
- Read from .env files silently in the background
- Use credentials automatically for connections
- Keep credential access implicit
- Trust that .env files exist and are configured

❌ **DON'T:**
- Ask user for credentials that are in .env
- Echo or display credential values
- Commit credentials to git
- Mention credential values in responses
- Include credentials in documentation
- Expose credentials in temp files that might be shared

**Checking Credentials Exist (Without Exposing Values):**
```bash
# Check if .env files exist
dir /B .env* > temp-env-files.txt 2>&1
type temp-env-files.txt

# Check if AWS credentials configured
aws sts get-caller-identity > temp-aws-identity.txt 2>&1
type temp-aws-identity.txt
# This shows WHO you are, not the credentials themselves
```

---

### 1. Git & GitHub Configuration

**Check Git Remote:**
```bash
git remote -v > temp-git-remote.txt 2>&1
type temp-git-remote.txt
del temp-git-remote.txt
```

**Check Git Branches:**
```bash
git branch -a > temp-git-branches.txt 2>&1
type temp-git-branches.txt
del temp-git-branches.txt
```

**Check Git Status:**
```bash
git status > temp-git-status.txt 2>&1
type temp-git-status.txt
del temp-git-status.txt
```

**Verify GitHub Connection:**
```bash
git ls-remote --heads origin > temp-github-check.txt 2>&1
type temp-github-check.txt
del temp-github-check.txt
```

**Check Git Configuration:**
```bash
git config --list > temp-git-config.txt 2>&1
type temp-git-config.txt
del temp-git-config.txt
```

---

### 2. Deployment Infrastructure

**List Deployment Scripts (Windows):**
```bash
dir /B aws\scripts\deploy-*.bat aws\scripts\deploy-*.sh > temp-deploy-scripts.txt 2>&1
type temp-deploy-scripts.txt
del temp-deploy-scripts.txt
```

**List Deployment Scripts (Unix/Linux/Mac):**
```bash
ls -1 aws/scripts/deploy-*.{bat,sh} > temp-deploy-scripts.txt 2>&1
cat temp-deploy-scripts.txt
rm temp-deploy-scripts.txt
```

**Check Package.json Deployment Commands:**
```bash
type package.json | findstr "deploy" > temp-deploy-commands.txt 2>&1
type temp-deploy-commands.txt
del temp-deploy-commands.txt
```

**Check AWS Configuration:**
```bash
dir /B aws\scripts > temp-aws-scripts.txt 2>&1
type temp-aws-scripts.txt
del temp-aws-scripts.txt
```

---

### 3. Environment Files

**List Environment Files:**
```bash
dir /B .env* > temp-env-files.txt 2>&1
type temp-env-files.txt
del temp-env-files.txt
```

**Check Specific Environment File Exists:**
```bash
if exist .env (echo EXISTS) else (echo NOT FOUND) > temp-env-check.txt 2>&1
type temp-env-check.txt
del temp-env-check.txt
```

**List All Environment-Related Files:**
```bash
dir /B .env* aws\credentials aws\config > temp-all-env.txt 2>&1
type temp-all-env.txt
del temp-all-env.txt
```

---

### 4. Running Processes & Ports

**Check Running Servers:**
```bash
netstat -ano | findstr ":4200 :3000 :8000 :8001" > temp-ports.txt 2>&1
type temp-ports.txt
del temp-ports.txt
```

**Check Specific Port (e.g., 4200):**
```bash
netstat -ano | findstr ":4200" > temp-port-4200.txt 2>&1
type temp-port-4200.txt
del temp-port-4200.txt
```

**Check Node Processes:**
```bash
tasklist | findstr "node.exe" > temp-node-processes.txt 2>&1
type temp-node-processes.txt
del temp-node-processes.txt
```

---

### 5. Build & Project State

**Check Build Output:**
```bash
dir /B dist > temp-dist-check.txt 2>&1
type temp-dist-check.txt
del temp-dist-check.txt
```

**Check Node Modules:**
```bash
if exist node_modules (echo EXISTS) else (echo NOT FOUND) > temp-deps-check.txt 2>&1
type temp-deps-check.txt
del temp-deps-check.txt
```

**Check Package Version:**
```bash
type package.json | findstr "version" > temp-version.txt 2>&1
type temp-version.txt
del temp-version.txt
```

**Check Node Version:**
```bash
node --version > temp-node-version.txt 2>&1
type temp-node-version.txt
del temp-node-version.txt
```

---

### 6. GitHub Token & Permissions

**Check Token Scopes (if dev-tools configured):**
```bash
cd dev-tools
node github/check-token-scopes.js > temp-scopes.txt 2>&1
type temp-scopes.txt
del temp-scopes.txt
cd ..
```

**Test GitHub API Access:**
```bash
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user > temp-github-user.txt 2>&1
type temp-github-user.txt
del temp-github-user.txt
```

---

### 7. Documentation Files

**Check Key Documentation:**
```bash
dir /B README.md CHANGELOG.md CONTRIBUTING.md LICENSE > temp-docs.txt 2>&1
type temp-docs.txt
del temp-docs.txt
```

**Check Developer Journal:**
```bash
dir /B dev-journal\sessions > temp-journal.txt 2>&1
type temp-journal.txt
del temp-journal.txt
```

---

## Verification Workflow Template

When asked to help with ANY task, follow this workflow:

### Step 1: Understand the Request
- What is the user asking for?
- What components might be involved?

### Step 2: Verify Current State
Run relevant verification commands:
```bash
# Example for deployment task
git remote -v > temp-remote.txt 2>&1
type temp-remote.txt

dir /B aws\scripts\deploy-*.bat > temp-deploy.txt 2>&1
type temp-deploy.txt

# Clean up
del temp-remote.txt temp-deploy.txt
```

### Step 3: Analyze Results
- What actually exists?
- What is already configured?
- What truly needs to be done?

### Step 4: Provide Accurate Guidance
Based on VERIFIED information:
- ✅ "I can see you have X configured..."
- ✅ "Your deployment scripts include..."
- ✅ "Based on git remote output, you're connected to..."

NOT based on assumptions:
- ❌ "You need to set up X..."
- ❌ "You don't have Y configured..."
- ❌ "You should create Z..."

---

## Examples

### ❌ WRONG Approach:

```
User: "Help me prepare for release"

AI: "First, you need to set up GitHub repository and configure 
     your deployment scripts. You'll also need to add your token 
     permissions and create deployment infrastructure."
```

**Problem:** Assumed nothing exists without checking.

### ✅ CORRECT Approach:

```
User: "Help me prepare for release"

AI: Let me check your current setup first.

[Runs verification commands]

git remote -v > temp-remote.txt 2>&1
dir /B aws\scripts\deploy-*.bat > temp-deploy.txt 2>&1
git status > temp-status.txt 2>&1

[Reads outputs]

AI: "I can see you have:
     ✅ GitHub repository configured (origin: github.com/user/repo)
     ✅ Deployment scripts: deploy-qa.bat, deploy-staging.bat, deploy-aws.bat
     ✅ Blue/green deployment system ready
     
     What we need to do for release:
     1. Commit current changes
     2. Create release tag
     3. Deploy using your existing scripts"
```

**Why Better:** Based on verified facts, not assumptions.

---

## Common Verification Patterns

### Pattern 1: Before Suggesting GitHub Setup

```bash
# ALWAYS CHECK FIRST
git remote -v > temp-remote.txt 2>&1
type temp-remote.txt

# If output shows remote:
# ✅ "You have GitHub remote configured at [URL]"

# If output is empty:
# ✅ "I don't see a Git remote configured. Would you like to add one?"
```

### Pattern 2: Before Suggesting Deployment Setup

```bash
# ALWAYS CHECK FIRST
dir /B aws\scripts\deploy-*.bat > temp-deploy.txt 2>&1
type temp-deploy.txt

# If output shows scripts:
# ✅ "You have these deployment scripts: [list them]"

# If output is empty:
# ✅ "I don't see deployment scripts in aws/scripts. Would you like to create them?"
```

### Pattern 3: Before Suggesting Token Configuration

```bash
# ALWAYS CHECK FIRST
cd dev-tools
node github/check-token-scopes.js > temp-scopes.txt 2>&1
type temp-scopes.txt

# If output shows scopes:
# ✅ "Your token has these scopes: [list them]"

# If tool doesn't exist or fails:
# ✅ "Let me check if you have GitHub token configured..."
```

---

## Checklist for Every Response

Before providing guidance, ask yourself:

- [ ] Have I verified what exists?
- [ ] Have I read the command outputs?
- [ ] Am I basing my response on facts, not assumptions?
- [ ] Have I cleaned up temp files?
- [ ] Did I acknowledge what's already working?
- [ ] Am I only suggesting what's actually needed?

---

## When to Skip Verification

**ONLY skip verification when:**
1. User explicitly tells you the state ("I already have X")
2. You're explaining general concepts, not project-specific state
3. User asks hypothetical questions ("What if I wanted to...")

**Otherwise: ALWAYS VERIFY FIRST**

---

## Temp File Naming Convention

Use descriptive names that indicate what you're checking:

- `temp-git-remote.txt` - Git remote configuration
- `temp-deploy-scripts.txt` - Deployment scripts list
- `temp-env-files.txt` - Environment files list
- `temp-ports.txt` - Running processes/ports
- `temp-git-status.txt` - Git status
- `temp-node-version.txt` - Node version
- `temp-github-check.txt` - GitHub connectivity

**Always clean up after reading:**
```bash
del temp-*.txt
```

---

## Summary

### The Golden Rule

> **"If you haven't verified it with a command that outputs to a temp file and read that file, you don't know it."**

### Three-Step Process

1. **VERIFY** - Run commands, read outputs
2. **ANALYZE** - Understand what actually exists
3. **RESPOND** - Provide accurate, fact-based guidance

### Remember

- Users may have more infrastructure than you think
- Always check before assuming
- Base responses on verified facts
- Acknowledge what's working
- Only suggest what's actually needed

---

**Document Created:** 2025-10-28  
**Status:** Active Protocol  
**Applies To:** All Copilot/LLM interactions with this project

