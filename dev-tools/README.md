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
| `confluence/` | Confluence API utilities and page management | [README](confluence/README.md) |
| `contacts/` | Contact enrichment, carrier intel, phone/email verification | [README](contacts/README.md) |
| `content/` | Content conversion/crawling (Gutenberg, Uutter → markdown) | [README](content/README.md) |
| `docs/` | General reference docs (Angular, Docker, best practices) | — |
| `epstein/` | Epstein document research (download, parse, search) | [README](epstein/README.md) |
| `evidence/` | Bodycam & evidence processing (transcription, GPS) | [README](evidence/README.md) |
| `facebook/` | Facebook export parsing and contact extraction | — |
| `genealogy/` | GEDCOM / ancestry parsing | [README](genealogy/README.md) |
| `git/` | Git & workspace utilities (sync, branches, hooks, status) | [README](git/README.md) |
| `github/` | GitHub API utilities and PR management | [README](github/README.md) |
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
| `rally/` | Rally API clients and work item utilities | [README](rally/README.md) |
| `research/` | Reference data and analysis notes | — |
| `sessions/` | Copilot session analysis notes | — |
| `system/` | System utilities (file search, temp cleanup, Node install) | [README](system/README.md) |
| `templates/` | Code and doc templates | — |
| `utils/` | Shared utility functions (logger, config) | — |
| `_review/` | Items pending manual review after the reorg | [README](_review/README.md) |

---

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `.env` | API keys and credentials (**never commit**) |
| `.env.example` | Template for required environment variables |
| `copilot-personal-instructions.md` | Copilot-specific personal instructions |
| `AI-ASSISTANT-INSTRUCTIONS.md` | Personal AI/Copilot preferences and rules |
| `QUICKREF.md` | Quick reference commands and shortcuts |
| `BEST-PRACTICES.md` | Guidelines for maintaining dev-tools |
| `DOCKER-REFERENCE.md` | Docker commands and patterns |
| `package.json` | Node.js dependencies for all scripts |
| `journal.bat` | Quick launcher for dev-journal |
| `search-confluence.js` | Standalone Confluence search utility |

---

## 🚀 Quick Start

```powershell
cd dev-tools
npm install
copy .env.example .env   # Then fill in your API keys
```

---

## 📜 Where the scripts live now

The former `scripts/` folder (60+ mixed scripts) was reorganized into focused folders on 2026-06-12. Each folder has its own README with a usage table.

| Domain | Folder | Highlights |
|--------|--------|-----------|
| Court / public records | [`public-records/`](public-records/README.md) | **`index.js`** entry point (`--federal` / `--state`); providers + sources (iCourt, BOP, LLC, statutes) |
| Life-map / timeline | [`life-map/`](life-map/README.md) | event/residence/career inserts, date verification |
| Image & document | [`images/`](images/README.md) | OCR, orientation, uploads, SVG/page fixes |
| Music & Last.fm | [`music/`](music/) | scrobble audit, dedupe, Plex/Beets tooling |
| Bodycam / evidence | [`evidence/`](evidence/README.md) | transcription, GPS extraction |
| Epstein research | [`epstein/`](epstein/README.md) | download, parse, search local DB |
| Genealogy | [`genealogy/`](genealogy/README.md) | GEDCOM parsing |
| Git & workspace | [`git/`](git/README.md) | branch cleanup, hooks, status, Nx info |
| Network & API | [`network/`](network/README.md) | health checks, connectivity, proxy |
| Content conversion | [`content/`](content/README.md) | Gutenberg / Uutter → markdown |
| Frontend icons | [`icons/`](icons/README.md) | icon registry tooling (was `icon-utils/`) |
| Contacts | [`contacts/`](contacts/README.md) | enrichment + `list-no-contact.js` |
| System utilities | [`system/`](system/README.md) | file search, temp cleanup, Node install, secret scan |
| Pending review | [`_review/`](_review/README.md) | duplicates / ambiguous items to triage |

> 🏛️ **Court & public records usage** (iCourt cookies, BOP scoring, PACER plans) now lives in **[`public-records/README.md`](public-records/README.md)**.


## 🔒 Security

- `.env` contains API keys — **never commit or expose**
- This folder is in `.gitignore` of the parent project
- Never reference dev-tools content in public PRs/docs
- iCourt cookies are session-only — do not persist them

---

## 📦 Dependencies

Core packages (via `npm install`):
- `dotenv` — Environment variable management
- `axios` — HTTP client
- `commander` — CLI argument parsing
- `chalk` — Terminal styling
- `sharp` — Image processing
- `better-sqlite3` — Local SQLite databases
- `tesseract.js` — OCR text extraction
- `@octokit/rest` — GitHub API client

---

*Last Updated: 2026-06-12*
