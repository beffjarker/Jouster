# Dev-Tools

> **Purpose:** Development utilities, scripts, API clients, and reference documentation for local use.
> **Privacy:** This folder is git-ignored by parent repos. It has its own private GitHub repo.

---

## 📂 Structure

| Folder/File | Purpose |
|-------------|---------|
| `api-clients/` | API client scripts (Rally, Confluence, etc.) |
| `backup/` | Backup files and snapshots |
| `cleanup/` | Cleanup and migration scripts |
| `configs/` | Local configuration files |
| `confluence/` | Confluence API utilities and page management |
| `docs/` | General reference docs (Angular upgrade, Docker, best practices) |
| `git/` | Git utilities (sync scripts, commit templates) |
| `github/` | GitHub API utilities and PR management |
| `rally/` | Rally API clients and work item utilities |
| `research/` | Reference data and analysis notes (fact-checks, test data) |
| `scripts/` | General-purpose utility scripts |
| `templates/` | Code and doc templates |
| `utils/` | Shared utility functions |

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `.env` | API keys and credentials (never commit) |
| `.env.example` | Template for required environment variables |
| `AI-ASSISTANT-INSTRUCTIONS.md` | Personal AI/Copilot preferences and rules |
| `copilot-personal-instructions.md` | Copilot-specific personal instructions |
| `QUICKREF.md` | Quick reference commands and shortcuts |
| `BEST-PRACTICES.md` | Guidelines for maintaining dev-tools |

## 🔒 Security

- `.env` contains API keys — **never commit or expose**
- This folder is in `.gitignore` of the parent project
- Never reference dev-tools content in public PRs/docs

---

*Last Updated: 2026-04-28*
