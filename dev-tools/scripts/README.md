# Scripts

Personal automation scripts and utilities.

## Structure

```
scripts/
├── README.md                    # This file
├── gutenberg-downloader.js      # Download & convert Project Gutenberg works to Obsidian Markdown
├── backup-journal.js            # Backup dev-journal to cloud/external
├── clean-temp.js                # Clean temporary files
└── [your-script].js             # Your custom scripts
```

---

## `gutenberg-downloader.js`

Downloads public-domain works from [Project Gutenberg](https://www.gutenberg.org/) and converts them
to Obsidian-compatible Markdown files split by chapter.

**Output structure:**

```
dev-journal/references/literature/
  {author-slug}/
    _index.md              ← Author overview
    {title-slug}/
      _index.md            ← Book overview with chapter list
      ch-01.md             ← Chapter 1
      ch-02.md             ← Chapter 2
      ...
```

**Quick start:**

```bash
# Install dependencies (first time only)
cd dev-tools && npm install

# List all catalog works
npm run gutenberg:list

# Dry-run (preview without writing)
npm run gutenberg:dry-run

# Download the full catalog (skips already-downloaded books)
npm run gutenberg:all

# Download a single book by Gutenberg ID
npm run gutenberg -- --id 11

# Download all works by an author slug
npm run gutenberg -- --author lewis-carroll
```

**All options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--id <id>` | Download single book by Gutenberg ID | — |
| `--author <slug>` | Download all works for author slug | — |
| `--all` | Process entire catalog | — |
| `--list` | List catalog without downloading | — |
| `--output <path>` | Output directory | `dev-journal/references/literature` |
| `--dry-run` | Preview without writing | `false` |
| `--skip-existing` | Skip already-downloaded books | `false` |
| `--delay <ms>` | Politeness delay between requests (ms) | `2000` |
| `--verbose` | Show detailed output | `false` |

**Catalog size:** 47 works across 22 authors (Lewis Carroll, Poe, Dostoevsky, Doyle, Baum, Thompson,
Shakespeare, Twain, Austen, Shelley, Stoker, Homer, Wells, Verne, Burroughs, Smith, Lindsay,
Nietzsche, Plato, Sun Tzu, Machiavelli, Marcus Aurelius).

See `dev-journal/references/literature/README.md` for the full catalog with Gutenberg IDs.

## Creating a New Script

1. Create a `.js` file in this folder
2. Add shebang if you want to run directly: `#!/usr/bin/env node`
3. Use utilities from `../utils/`
4. Document usage in comments
5. Add to `package.json` scripts if commonly used

## Example Template

```javascript
#!/usr/bin/env node

/**
 * My Script
 * Description of what this script does
 * 
 * Usage:
 *   node my-script.js [options]
 */

const { program } = require('commander');
const Logger = require('../utils/logger');

program
  .name('my-script')
  .description('Script description')
  .option('-v, --verbose', 'Verbose output')
  .parse(process.argv);

const options = program.opts();

async function main() {
  Logger.header('My Script');
  
  try {
    // Your script logic here
    Logger.info('Starting...');
    
    // Do work
    
    Logger.success('Complete!');
  } catch (error) {
    Logger.error('Script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
```

## Common Use Cases

- File processing and transformation
- Batch operations on dev-journal entries
- Automated backups
- Data migration scripts
- Report generation
- Cleanup tasks
# Developer Tools

> **Purpose:** Personal development utilities and scripts for API integrations and automation.  
> **Privacy:** This folder is git-ignored. API keys and personal tools stay on your local machine.

---

## 📋 Overview

The **dev-tools** directory contains personal utilities for:

- **GitHub Integration** - Create gists, manage repos, automate workflows
- **API Testing** - Quick scripts to test external services
- **Automation** - Personal productivity scripts and tools
- **Utilities** - Helper functions and CLI tools

---

## 📂 Folder Structure

```
dev-tools/                       # Root-level developer tools (git-ignored)
├── README.md                    # This file
├── .env                         # Local API keys (NEVER COMMIT)
├── .env.example                 # Template for required keys
├── package.json                 # Node dependencies for tools
├── github/                      # GitHub API integrations
│   ├── create-gist.js           # Create GitHub gists
│   ├── list-repos.js            # List repositories
│   └── github-utils.js          # Shared GitHub utilities
├── api-clients/                 # API client utilities
│   └── README.md                # API client documentation
├── scripts/                     # Automation scripts
│   └── README.md                # Scripts documentation
└── utils/                       # Shared utilities
    ├── config.js                # Configuration loader
    └── logger.js                # Simple logger
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```cmd
cd dev-tools
npm install
```

### 2. Configure API Keys

Copy the example environment file and fill in your keys:

```cmd
copy .env.example .env
```

Edit `.env` with your actual API keys (see below for required keys).

### 3. Run a Tool

```cmd
# Create a GitHub gist
node github/create-gist.js

# List your repositories
node github/list-repos.js
```

---

## 🔑 Required API Keys

### GitHub Personal Access Token

**Required Scopes:**
- `gist` - Create and manage gists
- `repo` - Access repositories (if needed)
- `read:user` - Read user profile

**How to Create:**
1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Select required scopes
4. Copy token immediately (you won't see it again!)
5. Add to `.env` as `GITHUB_TOKEN=your_token_here`

### Other API Keys

Add additional API keys to `.env` as needed:
```env
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
SLACK_WEBHOOK_URL=your_webhook_here
```

---

## 🛠️ Available Tools

### GitHub Tools

#### Create Gist
Creates a new GitHub gist from a file or text input.

```cmd
node github/create-gist.js --file path/to/file.js --description "My code snippet"
node github/create-gist.js --content "console.log('hello')" --filename "test.js"
```

**Options:**
- `--file` - Path to file to upload
- `--content` - Direct text content
- `--filename` - Name for the gist file
- `--description` - Gist description
- `--public` - Make gist public (default: false)

#### List Repositories
Lists your GitHub repositories with details.

```cmd
node github/list-repos.js
node github/list-repos.js --sort stars
node github/list-repos.js --filter jouster
```

---

## 🔒 Security Best Practices

### ✅ DO:
- Store API keys in `.env` file only
- Use `.env.example` as a template (no real keys)
- Rotate tokens periodically
- Use minimal required scopes for tokens
- Check `.gitignore` includes `dev-tools/`

### ❌ DON'T:
- Commit `.env` file to git
- Share your `.env` file
- Use production keys in dev tools
- Hardcode API keys in scripts
- Leave unused tokens active

### Environment Variable Loading

All tools use `dotenv` to load configuration:

```javascript
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.error('Error: GITHUB_TOKEN not found in .env file');
  process.exit(1);
}
```

---

## 📝 Creating New Tools

### Template Structure

```javascript
// my-tool.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const logger = require('../utils/logger');
const config = require('../utils/config');

async function myTool() {
  try {
    const apiKey = config.get('MY_API_KEY');
    
    // Your tool logic here
    logger.info('Tool started');
    
    // Do work...
    
    logger.success('Tool completed');
  } catch (error) {
    logger.error('Tool failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  myTool();
}

module.exports = { myTool };
```

### Best Practices

1. **Load environment variables first**
2. **Validate required keys exist**
3. **Use logger for output**
4. **Handle errors gracefully**
5. **Make functions reusable (export them)**
6. **Add CLI argument support**
7. **Document usage in comments**

---

## 🎯 Common Use Cases

### Quick Gist from Clipboard
```cmd
# Windows PowerShell
Get-Clipboard | node github/create-gist.js --stdin --filename "clipboard.txt"
```

### Backup Code Snippets
```cmd
node github/create-gist.js --file dev-journal/sessions/2025-10-24-solution.md --description "Solution to auth bug"
```

### Test API Endpoints
```javascript
// Create a quick test script
node -e "require('./api-clients/test-endpoint.js')('https://api.example.com')"
```

---

## 🔄 Integration with Dev Journal

You can reference dev-tools output in your journal:

```markdown
## Solution Implemented

Created gist with full solution:
https://gist.github.com/yourusername/abc123

Tool used: `dev-tools/github/create-gist.js`
```

---

## 🧪 Testing Tools

Each tool should include basic error handling and validation:

```javascript
// Test your tool
node github/create-gist.js --help
node github/create-gist.js --dry-run --content "test"
```

---

## 📦 Dependencies

Core dependencies (installed via `npm install`):
- `dotenv` - Environment variable management
- `@octokit/rest` - GitHub API client
- `axios` - HTTP client
- `commander` - CLI argument parsing
- `chalk` - Terminal styling

---

## 🤝 Extending Tools

Feel free to add:
- New API integrations (GitLab, Bitbucket, etc.)
- Automation scripts (deployment helpers, file processors)
- Database tools (query builders, data migrators)
- Testing utilities (mock data generators, API testers)

---

## 🐛 Troubleshooting

### "GITHUB_TOKEN not found"
- Check `.env` file exists in `dev-tools/` directory
- Verify token is properly set: `GITHUB_TOKEN=ghp_...`
- No quotes needed around the token value

### "Bad credentials" Error
- Token may have expired - regenerate on GitHub
- Check token has required scopes
- Ensure no extra whitespace in `.env`

### "Module not found"
- Run `npm install` in `dev-tools/` directory
- Check you're running from correct directory

---

## 📖 Resources

- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Octokit.js Documentation](https://github.com/octokit/octokit.js)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Remember:** These tools are personal utilities. Keep them simple, secure, and useful! 🚀

