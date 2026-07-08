# Dev-Tools

> **Purpose:** Development utilities, scripts, API clients, and reference documentation for local use.
> **Privacy:** This folder is git-ignored by parent repos. It has its own private GitHub repo.

---

## 📂 Structure

> **Reorganized 2026-06-12:** The old catch-all `scripts/` folder was split into focused, domain-specific folders (each a mini node app with its own README). See `_review/` for anything pending manual review.

| Folder | Purpose | README |
|--------|---------|--------|
| `api-clients/` | API client scripts (Rally, Confluence, etc.) | [README](api-clients/README.md) |
| `aws/` | AWS utilities (SES, resource discovery) | — |
| `backup/` | Backup files and snapshots | — |
| `cleanup/` | Cleanup and migration scripts | — |
| `configs/` | Local configuration files | — |
| `confluence/` | Confluence API utilities and page management | [README](confluence/README.md) · [Skill index](skills/confluence-integration/SKILL.md) |
| `contacts/` | Contact enrichment, carrier intel, phone/email verification | [README](contacts/README.md) |
| `content/` | Content conversion/crawling (Gutenberg, Uutter → markdown) | [README](content/README.md) |
| `docs/` | General reference docs (Angular, Docker, best practices) | — |
| `epstein/` | Epstein document research (download, parse, search) | [README](epstein/README.md) |
| `evidence/` | Bodycam & evidence processing (transcription, GPS) | [README](evidence/README.md) |
| `facebook/` | Facebook export parsing and contact extraction | — |
| `genealogy/` | GEDCOM / ancestry parsing | [README](genealogy/README.md) |
| `git/` | Git & workspace utilities (sync, branches, hooks, status) | [README](git/README.md) |
| `github/` | GitHub API utilities and PR management | [README](github/README.md) · [Skill index](skills/github-pr-ops/SKILL.md) |
| `google/` | Google Contacts API (sync, enrich, manage) | [README](google/README.md) |
| `icons/` | Frontend icon registry tooling (was `scripts/icon-utils/`) | [README](icons/README.md) |
| `images/` | Image & document processing (OCR, orientation, uploads) | [README](images/README.md) |
| `life-map/` | Life-map / timeline data (events, residences, career) | [README](life-map/README.md) |
| `models/` | AI/ML model files (Tesseract, Whisper) | — |
| `music/` | Music library management (Beets, Plex, Last.fm) | — |
| `network/` | Network & API connectivity/health utilities | [README](network/README.md) |
| `plans/` | Portable implementation plans (by repo, with templates) | — |
| `pr-notes/` | PR description drafts and notes | — |
| `public-records/` | **Court records (iCourt/PACER), BOP, LLC lookups** | [README](public-records/README.md) |
| `rally/` | Rally API clients and work item utilities | [README](rally/README.md) · [Skill index](skills/rally-integration/SKILL.md) |
| `research/` | Reference data and analysis notes | — |
| `sessions/` | Copilot session analysis notes | — |
| `skills/` | Copilot CLI "thin index" skills — map intents to existing scripts (see `dev-journal/knowledge/ai-tooling/skills-vs-scripts.md` for the pattern) | — |
| `system/` | System utilities (file search, temp cleanup, Node install) | [README](system/README.md) |
| `templates/` | Code and doc templates | — |
| `utils/` | Shared utility functions (logger, config) | — |
| `_review/` | Items pending manual review after the reorg | [README](_review/README.md) |

---

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

*Last Updated: 2026-05-07*
