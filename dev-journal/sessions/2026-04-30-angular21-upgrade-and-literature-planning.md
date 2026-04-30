# Angular 21 Upgrade Complete + Literature Download Planning

**Date**: 2026-04-30  
**Branch**: `develop`  
**Commit**: `e87ad3a` (post-merge)  
**Status**: ✅ Upgrade merged — 📋 Literature plan in progress

---

## 📝 Summary

Two major work streams completed today:

1. **Angular 21 upgrade** — Nx 21.6.3 → 22.6.5 and Angular 20.3.3 → 21.2.9, merged via PR #33
2. **Literature collection planning** — Identified and documented a queue of 27 public domain works to download from Project Gutenberg, with an automated download/conversion script created in `dev-tools`

---

## 🚀 Angular 21 Upgrade

### What Was Upgraded

| Package | Before | After |
|---------|--------|-------|
| Nx | 21.6.3 | 22.6.5 |
| Angular | 20.3.3 | 21.2.9 |

### PR Details

- **PR**: [#33](https://github.com/beffjarker/Jouster/pull/33) — `chore(workspace): upgrade Nx to 22.6.5 and Angular to 21.2.9`
- **Merged to**: `develop`
- **Post-merge commit**: `e87ad3a`

### Post-Merge Cleanup

```bash
git checkout develop
git pull origin develop
git branch -d [stale-feature-branches]
```

### Files Modified

- `package.json` — Upgraded Angular, Nx, and related dependency versions
- `apps/jouster-ui/eslint.config.cjs` — Updated ESLint configuration for Angular 21 compatibility
- Various `tsconfig`, `project.json` changes for Nx 22 workspace format

---

## 📚 Literature Collection Planning

### Context

Discovered that `dev-journal/references/literature/README.md` contains a "Want More?" section listing 27 public domain works from Project Gutenberg that we want to add to our literature reference collection.

Current collection includes:
- Edgar Allan Poe, Arthur Conan Doyle, Lewis Carroll, Fyodor Dostoevsky, D'Arcy Wentworth Thompson, L. Frank Baum

### Target Works (27 titles)

See full list in [[references/literature/README]] → **"Want More?" section**

Categories:
- 🎭 **Classics & Literature** (9 works): Shakespeare, Mark Twain, Jane Austen, Mary Shelley, Bram Stoker, Homer
- 🚀 **Science Fiction & Space Opera** (13 works): H.G. Wells, Jules Verne, Edgar Rice Burroughs, E.E. Smith, David Lindsay
- 🧠 **Philosophy & Strategy** (5 works): Nietzsche, Plato, Sun Tzu, Machiavelli, Marcus Aurelius

### Download Script Created

Created `dev-tools/scripts/download-gutenberg.js` to automate:

1. Fetching plain-text from `https://www.gutenberg.org/cache/epub/{ID}/pg{ID}.txt`
2. Stripping Gutenberg header/footer boilerplate
3. Splitting text into per-chapter `.md` files
4. Generating an `_index.md` MOC per work

**Usage:**

```bash
# Single book
node dev-tools/scripts/download-gutenberg.js \
  --id 36 \
  --author "hg-wells" \
  --title "war-of-the-worlds"

# Batch (reads Gutenberg IDs from the README table)
node dev-tools/scripts/download-gutenberg.js \
  --batch dev-journal/references/literature/README.md

# Dry run preview
node dev-tools/scripts/download-gutenberg.js --id 1342 --dry-run
```

### Files Added/Updated

| File | Action | Description |
|------|--------|-------------|
| `dev-journal/references/literature/README.md` | ✅ Created | Full literature listing with "Want More?" Gutenberg queue |
| `dev-journal/references/literature/_index.md` | ✅ Created | Master MOC with links to all authors (current + queued) |
| `dev-tools/scripts/download-gutenberg.js` | ✅ Created | Download + markdown conversion script |

---

## ✅ Next Steps

- [ ] Run `npm install` in `dev-tools/` (needs `commander` package for the script's CLI)
- [ ] Test download script on a single small book: `node dev-tools/scripts/download-gutenberg.js --id 132 --author "sun-tzu" --title "art-of-war" --dry-run`
- [ ] Batch download all "Want More?" works when ready: `node dev-tools/scripts/download-gutenberg.js --batch dev-journal/references/literature/README.md`
- [ ] Create author `_index.md` files for each new author folder after download
- [ ] Update `dev-journal/references/literature/_index.md` to remove works from "Queued" and move them to "Currently in Collection" as they are downloaded

---

## 🔧 Technical Notes

### Gutenberg URL Strategy

The script tries multiple URL formats in order, with fallback:
1. `https://www.gutenberg.org/cache/epub/{ID}/pg{ID}.txt` (primary — cached, reliable)
2. `https://www.gutenberg.org/files/{ID}/{ID}-0.txt` (UTF-8 fallback)
3. `https://www.gutenberg.org/files/{ID}/{ID}.txt` (legacy fallback)

### Chapter Detection

Uses regex patterns to detect common heading styles:
- `CHAPTER I`, `Chapter 1`, `CHAPTER ONE`
- `PART I`, `Part One`, `BOOK I`
- `ACT I`, `CANTO I`, `SECTION I`

Works without detectable chapters are saved as a single `.md` file.

### Rate Limiting

A 2-second delay is added between requests in batch mode to be polite to Project Gutenberg's servers.

---

## 🎯 Branch & Repo Status

```
Branch:  develop
Commit:  e87ad3a
Remote:  https://github.com/beffjarker/Jouster
Dev-journal updated to: 19b187b3
```

---

*Created: 2026-04-30*  
*Angular 21 ✅ | Literature queue planned 📚*
