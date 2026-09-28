# Documentation Reorganization Plan

> **Created:** 2026-05-06
> **Status:** Approved — ready for execution
> **Confidence:** ~85% (High) — based on full directory analysis; verify file relevance before archiving

---

## Problem Statement

The `docs/` folder has ~60+ unorganized markdown files at the root level. Most are one-off status reports, deployment summaries, or session notes that have outlived their usefulness as top-level documents. The existing subdirectory structure is reasonable but underutilized. The `README.md` index is outdated, has duplicate content blocks, and contains broken Obsidian wiki-links.

---

## Proposed Folder Taxonomy

```
docs/
├── README.md                  # Rewritten navigational index
├── CONTRIBUTING-TO-DOCS.md    # Rules for adding/maintaining docs
├── Architecture/              # System design and patterns
├── AWS/                       # All AWS/infrastructure docs
│   ├── environments/          # Preview, QA, staging setup guides
│   └── ssl/                   # SSL, HTTPS, CloudFront config
├── CICD/                      # GitHub Actions, deployment, workflows
├── Development/               # Dev setup, testing, coding guides
├── Features/                  # Feature-specific documentation
├── Integrations/              # API and service integration docs
├── Project/                   # Releases, versioning, upgrade plans
├── Security/                  # Security audits, policies, guides
├── Tools/                     # Dev tools, Git hooks, Nx guides
├── AI/                        # AI/automation documentation
├── templates/                 # Doc templates with required frontmatter
└── .obsidian/                 # Obsidian vault config
```

**No `_archive/` folder.** Git history preserves all deleted files. Stale one-off status docs are simply deleted — they can always be recovered via `git log --diff-filter=D -- docs/FILENAME.md`.

---

## Phase 1: Move Active Reference Docs to Topic Folders

### → `CICD/`

| File | Reason |
|------|--------|
| `DEPLOYMENT.md` | Active deployment guide |
| `MANUAL-DEPLOYMENT-GUIDE.md` | Active reference |
| `BLUE-GREEN-DEPLOYMENT-ANALYSIS.md` | Architecture reference |
| `GITHUB-ACTIONS-INTEGRATION-SUMMARY.md` | CI/CD reference |
| `GITHUB-ACTIONS-STATUS.md` | CI/CD reference |
| `GITHUB-ACTIONS-STRUCTURE.md` | CI/CD reference |
| `DEPLOYMENT-WORKFLOW-STATUS.md` | CI/CD reference |
| `PREVIEW-CLEANUP-WORKFLOW.md` | CI/CD reference |

### → `Project/`

| File | Reason |
|------|--------|
| `RELEASE-PROCESS.md` | Active process doc |
| `PROPER-RELEASE-PROCESS.md` | Consolidate with above |
| `RELEASE-BEST-PRACTICES-SUMMARY.md` | Consolidate with above |
| `RELEASE-v1.0.0-PLAN.md` | Active planning doc |
| `ANGULAR-21-UPGRADE-PLAN.md` | Active upgrade plan |

### → `Security/`

| File | Reason |
|------|--------|
| `SECURITY.md` | Security policy |
| `SECURITY-AUDIT-2025-11-13.md` | Latest security audit |

### → `AWS/ssl/`

| File | Reason |
|------|--------|
| `SSL-CLOUDFRONT-SETUP-GUIDE.md` | Active how-to |
| `SSL-QUICK-REFERENCE.md` | Active reference |
| `SSL-SETUP-SUMMARY.md` | Setup reference |
| `HTTPS-ONLY-MIGRATION.md` | Migration guide |

### → `AWS/environments/`

| File | Reason |
|------|--------|
| `aws/preview-environments.md` | Active guide |
| `aws/qa-environment.md` | Active guide |
| `aws/staging-environment.md` | Active guide |
| `aws/ROUTE53-SETUP-GUIDE.md` | Active guide |
| `aws/GITHUB-SETUP.md` | Active guide |
| `STAGING-DNS-SETUP.md` | Active setup guide |
| `STAGING-HTTPS-SETUP.md` | Active setup guide |

### → `AWS/cleanup/`

| File | Reason |
|------|--------|
| `AWS-CLEANUP-STRATEGY.md` | Reference for future cleanups |

### → `Features/`

| File | Reason |
|------|--------|
| `AUTH-MENU-FEATURE-SUMMARY.md` | Feature doc |
| `AUTH-MFE-SUMMARY.md` | Feature doc |
| `INSTAGRAM-OEMBED-IMPLEMENTATION.md` | Feature doc |

### → `Development/`

| File | Reason |
|------|--------|
| `DIGITAL-PLATFORM-INSTRUCTIONS-INTEGRATION.md` | Dev workflow reference |
| `DIGITAL-PLATFORM-INSTRUCTIONS-QUICK-REF.md` | Dev quick reference |
| `HTTP-REDIRECT-TROUBLESHOOTING.md` | Troubleshooting guide |
| `PREVIEW-TROUBLESHOOTING.md` | Troubleshooting guide |

---

## Phase 2: Delete Stale/Historical Files

These files are one-off status reports, completed task summaries, or session logs that no longer serve as active reference. They will be deleted — git history preserves them if ever needed.

**Recovery:** `git log --diff-filter=D --name-only -- docs/` to find deleted files, `git show <commit>:docs/FILENAME.md` to recover.

### Session summaries (move to `dev-journal/2025/` using `YYYY/MM/DD` structure, then delete from docs)

Move to `dev-journal/` with date-based paths before deleting from `docs/`:
- All 17 files from `sessions/` → `dev-journal/2025/MM-Month/DD/` (based on file dates)
- `SESSION-SUMMARY-2025-11-11.md` → `dev-journal/2025/11-November/11/SESSION-SUMMARY.md`
- `SESSION-SUMMARY-2025-12-03.md` → `dev-journal/2025/12-December/03/SESSION-SUMMARY.md`

**Date path format:** `YYYY/MM-MonthName/DD` (e.g., `2025/10-October/30/`)

### Delete — cleanup reports (historical, no ongoing value)

- `CLEANUP-AURA-REMOVAL.md`
- `CLEANUP-COMPLETE-SUMMARY.md`
- `CLEANUP-COMPLETE.md`
- `CLEANUP-SUMMARY-2025-10-29.md`
- `CLEANUP-VERIFICATION-2025-12-04.md`
- `CLEANUP-WORKFLOWS-REMOVAL.md`
- `COMPREHENSIVE-CLEANUP-2025-12-04.md`
- `AWS-CLEANUP-AUTOMATION-COMPLETE.md`
- `AWS-CLEANUP-PHASE1-COMPLETE.md`
- `AWS-CLEANUP-PHASE1.md`
- `AWS-CLEANUP-PHASE2.md`
- `FINAL-CLEANUP-SUMMARY.md`
- `RS-CLEANUP-SUMMARY.md`
- `S3-BUCKET-CLEANUP-SUMMARY.md`
- `CONSOLIDATION-SUMMARY.md`

### Delete — release/deployment status reports (historical)

- `RELEASE-v0.5.1-COMPLETE.md`
- `RELEASE-v1.0.0-COMPLETE.md`
- `BRANCH-CLEANUP-AND-RELEASE-v0.5.0.md`
- `DEPLOYMENT-COMPLETE.md`
- `DEPLOYMENT-STATUS-v0.5.0.md`
- `PRODUCTION-DEPLOYMENT-v0.5.0-COMPLETE.md`
- `PRODUCTION-v0.5.1-VERIFICATION.md`
- `VERSION-REVERT-SUMMARY.md`
- `PR-CREATED-SUMMARY.md`
- `PR-HTTPS-ONLY-MIGRATION.md`
- `PR11-PREVIEW-STATUS.md`
- `PR19-PR20-VERSION-AND-CI-FIX.md`
- `STAGING-DEPLOYMENT-FIX.md`
- `STAGING-DEPLOYMENT-v0.5.0.md`
- `STAGING-FINAL-STATUS.md`
- `STAGING-HTTPS-COMPLETE.md`
- `HTTPS-MIGRATION-COMPLETE.md`
- `HTTPS-SETUP-COMPLETE.md`
- `REGION-UPDATE-COMPLETE.md`
- `REGION-UPDATE-SUMMARY.md`
- `QA-DEPLOY-FIX-SUMMARY.md`
- `QA-DEPLOYMENT-READINESS.md`
- `QA-DEPLOYMENT-STATUS.md`
- `QA-HTTPS-ISSUE.md`
- `PREVIEW-ENVIRONMENT-STATUS.md`
- `PREVIEW-PR14-DEPLOYED.md`
- `PREVIEW-ACCESS-SOLUTION.md`

### Delete — miscellaneous stale docs

- `COPILOT-INSTRUCTIONS-UPDATE-NO-100-PERCENT.md`
- `NEXT-STEPS.md`
- `WHATS-NEXT-SSL.md`
- `WWW-JOUSTER-ORG-FIX.md`
- `TEARDOWN-AUTOMATION-VERIFICATION.md`
- `AUTH-MENU-TODO.md`
- `AUTH-MFE-TESTING.md`

---

## Phase 3: Consolidate Duplicates

| Target | Sources to Merge |
|--------|-----------------|
| `Project/RELEASE-PROCESS.md` | `RELEASE-PROCESS.md` + `PROPER-RELEASE-PROCESS.md` + `RELEASE-BEST-PRACTICES-SUMMARY.md` |
| `CICD/DEPLOYMENT-GUIDE.md` | `DEPLOYMENT.md` + `MANUAL-DEPLOYMENT-GUIDE.md` |
| `Development/TROUBLESHOOTING.md` | `HTTP-REDIRECT-TROUBLESHOOTING.md` + `PREVIEW-TROUBLESHOOTING.md` |

---

## Phase 4: Rewrite `docs/README.md`

- Remove duplicate directory tree blocks (lines 99–142 in current file)
- Update folder listing to match new structure
- Replace all `[[wiki-links]]` with standard relative links `[text](./path)` (works on both GitHub and Obsidian)
- Add "Last Updated" date at the top
- Keep Obsidian vault framing but ensure GitHub readability
- Use standard markdown only — no Obsidian-specific syntax (embeds, callouts, dataview, etc.)

---

## Phase 5: Establish Maintenance Strategy

### 5.1 Required Frontmatter for All Active Docs

```yaml
---
title: Document Title
last_reviewed: 2026-05-06
status: active        # active | draft | archived
owner: jbarker       # GitHub username of maintainer
---
```

### 5.2 Review Cadence

| Cadence | Action |
|---------|--------|
| Quarterly | Review all `active` docs; flag any not updated in 6+ months |
| Per-release | Update `Project/` and `CICD/` docs with any process changes |
| Per-feature | Create/update `Features/` doc alongside feature work |

### 5.3 Rules for New Documentation

1. **No root-level files** — all new docs go in a subdirectory
2. **Must include frontmatter** — title, status, owner, last_reviewed
3. **One-off status reports** — delete after the event concludes (git preserves history)
4. **Session summaries** belong in `dev-journal/YYYY/MM-MonthName/DD/` (gitignored), not `docs/`
5. **Use templates** — `templates/DOC-TEMPLATE.md` for new docs
6. **Date-based paths** — any temporal content uses `YYYY/MM-MonthName/DD` structure (e.g., `2026/05-May/06/`)

### 5.4 New Template: `templates/DOC-TEMPLATE.md`

```markdown
---
title: [Document Title]
last_reviewed: [YYYY-MM-DD]
status: active
owner: [github-username]
---

# [Document Title]

> Brief description of what this doc covers.

## Overview

[Content here]

## Details

[Content here]

## Related

- [Link to related doc](./path)
```

---

## Phase 6: Create `CONTRIBUTING-TO-DOCS.md`

Short guide explaining:
- Folder taxonomy and where to put new docs
- Frontmatter requirements
- When to archive vs. update existing docs
- Naming conventions (UPPER-KEBAB-CASE for docs)
- **Markdown compatibility rules:**
  - Use standard relative links only: `[Link Text](./Folder/File.md)`
  - No `[[wiki-links]]`, no Obsidian embeds (`![[...]]`), no dataview queries
  - YAML frontmatter is fine (renders on GitHub, used by Obsidian)
  - Use standard markdown tables, code blocks, and headings
  - Images use standard syntax: `![alt](./path/to/image.png)`
- How to open the vault in Obsidian (optional, for local navigation)

---

## Execution Order

1. ⬜ Create new directories (`AWS/environments/`, `AWS/ssl/`, `CICD/`, `Security/`)
2. ⬜ Move active docs to topic folders (Phase 1)
3. ⬜ Move session files to `dev-journal/` with `YYYY/MM-MonthName/DD` structure (Phase 2)
4. ⬜ Delete all stale one-off status files (Phase 2)
5. ⬜ Consolidate duplicate docs (Phase 3)
6. ⬜ Rewrite `docs/README.md` (Phase 4)
7. ⬜ Add frontmatter to active docs (Phase 5.1)
8. ⬜ Create `DOC-TEMPLATE.md` and `CONTRIBUTING-TO-DOCS.md` (Phase 5.4, Phase 6)
9. ⬜ Delete empty `aws/` and `sessions/` directories after moves complete
10. ⬜ Update `.obsidian/` config if needed for new paths

---

## Decisions

1. **Markdown compatibility** — Use standard relative markdown links `[text](path)` everywhere. These render correctly on **both** GitHub and Obsidian. Remove all `[[wiki-links]]` during reorganization. Obsidian handles standard links natively; no functionality is lost.
2. **No archive folder** — Git history is the archive. Stale docs are deleted; `git log --diff-filter=D` recovers them if needed.
3. **Date structure** — Any temporal/historical content (session logs, daily notes) uses `YYYY/MM-MonthName/DD` directory structure (e.g., `2025/10-October/30/`). This matches the existing `dev-journal/` convention.
4. **Session files** — Move from `docs/sessions/` to `dev-journal/` (gitignored, personal), then delete from `docs/`.
5. **Git history preservation** — Use `git mv` for all file moves in Phase 1 to preserve blame history per-file.

---

## Verification Steps

After completing the reorganization:

1. Run `Get-ChildItem docs/ -MaxDepth 1 -Filter *.md` — should return only `README.md` + `CONTRIBUTING-TO-DOCS.md` (≤2 files, plus this plan if not yet deleted)
2. Verify all relative links in `README.md` resolve correctly on GitHub (push to branch, check rendered view)
3. Open in Obsidian and confirm navigation works (links clickable, graph renders)
4. Run `Select-String -Path "docs\**\*.md" -Pattern "\[\["` to audit any remaining wiki-links (should be zero)
5. Confirm no Obsidian-only syntax remains: no `![[embeds]]`, no `> [!callout]`, no dataview blocks
6. Confirm `docs/sessions/` directory is gone
7. Confirm no root-level `.md` files remain other than `README.md` and `CONTRIBUTING-TO-DOCS.md`

---

*This plan is ready for review. Please confirm the taxonomy, archive decisions, and open questions before execution begins.*


















