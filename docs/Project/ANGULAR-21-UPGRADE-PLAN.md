# Angular 21 Upgrade Plan

> **Branch:** `jb-op-angular-21-upgrade` (from `main`)
> **Date:** 2026-04-23
> **Status:** ⏳ Planning

---

## Overview

Upgrade the Jouster Nx monorepo from **Angular 20.3.3 → 21.2.10** and align all Nx packages to **22.6.5**.

### Current Versions (on `main`)

| Package | Current | Target |
|---------|---------|--------|
| `@angular/core` | 20.3.3 | 21.2.10 |
| `@angular/cli` | 20.3.3 | 21.2.8 |
| `nx` | 21.6.3 | 22.6.5 |
| `@nx/angular` | 22.0.3 | 22.6.5 |
| `@nx/*` (other) | 21.6.2 | 22.6.5 |
| `typescript` | ~5.9.2 | ~5.9.2 or ~6.0 |
| `rxjs` | 7.8.1 | 7.8.2 |
| `zone.js` | ^0.15.1 | ^0.16.0 |
| `@angular-eslint/*` | 20.3.0 | 21.x |
| `jest-preset-angular` | ~14.6.1 | ~15.x |

### Key Compatibility Notes

- Angular 21 requires TypeScript `>=5.9 <6.1` — current `~5.9.2` is compatible
- Angular 21 requires Node.js 20.x or 22.x — current `engines` field requires `>=20.19.0` ✅
- Nx 22.6.5 supports Angular 21.x

---

## Phase 1: Pre-Upgrade Baseline

### Steps

1. **Ensure clean working tree** on `jb-op-angular-21-upgrade`
2. **Run baseline tests** to document pre-existing state:
   ```bash
   nx build jouster-ui
   nx test
   nx lint
   ```
3. **Create checkpoint commit** before starting any changes
4. **Back up** `package-lock.json` (copy to `package-lock.json.bak`)

### Acceptance

- [ ] All builds pass (or pre-existing failures documented)
- [ ] All tests pass (or pre-existing failures documented)
- [ ] Checkpoint commit created

---

## Phase 2: Align & Upgrade Nx to 22.6.5

> **Why first?** Nx must support the target Angular version. The current Nx packages
> are misaligned (`@nx/angular@22.0.3` vs `@nx/*@21.6.2`), which should be fixed first.

### Steps

1. Run the Nx migration generator:
   ```bash
   npx nx migrate nx@22.6.5
   ```
   This generates `migrations.json` and updates `package.json`.

2. Install updated dependencies:
   ```bash
   npm install
   ```

3. Run Nx migrations:
   ```bash
   npx nx migrate --run-migrations
   ```

4. **Verify** all `@nx/*` packages in `package.json` are at `22.6.5`:
   - `@nx/angular` → 22.6.5
   - `@nx/cypress` → 22.6.5
   - `@nx/eslint` → 22.6.5
   - `@nx/eslint-plugin` → 22.6.5
   - `@nx/jest` → 22.6.5
   - `@nx/js` → 22.6.5
   - `@nx/web` → 22.6.5
   - `@nx/workspace` → 22.6.5
   - `nx` → 22.6.5

5. **Check lib executors** — Verify `@nx/angular:ng-packagr-lite` in:
   - `libs/shared/services/project.json`
   - `libs/shared/ui/project.json`
   
   Nx 22 may have renamed this to `@nx/angular:package`.

6. **Validate build:**
   ```bash
   nx build jouster-ui
   nx test
   ```

7. **Commit** Nx upgrade as isolated checkpoint:
   ```
   chore(workspace): upgrade nx to 22.6.5
   ```

### Acceptance

- [ ] All `@nx/*` packages aligned at 22.6.5
- [ ] `nx build jouster-ui` passes
- [ ] `nx test` passes
- [ ] Committed as checkpoint

---

## Phase 3: Upgrade Angular 20 → 21

### Steps

1. Run Angular update:
   ```bash
   npx ng update @angular/core@21 @angular/cli@21
   ```
   This updates all `@angular/*` packages and runs migration schematics.

2. **Update companion DevKit packages** in `package.json`:
   - `@angular-devkit/build-angular` → 21.x
   - `@angular-devkit/core` → 21.x
   - `@angular-devkit/schematics` → 21.x
   - `@angular/build` → 21.x
   - `@schematics/angular` → 21.x

3. **Update `overrides` section** in `package.json` to match new versions:
   ```json
   {
     "@angular/animations": "21.2.10",
     "@angular/common": "21.2.10",
     "@angular/compiler": "21.2.10",
     "@angular/core": "21.2.10",
     "@angular/forms": "21.2.10",
     "@angular/platform-browser": "21.2.10",
     "@angular/platform-browser-dynamic": "21.2.10",
     "@angular/router": "21.2.10",
     "@angular/build": "21.2.8",
     "@angular/cli": "21.2.8",
     "@angular/compiler-cli": "21.2.10",
     "@angular/language-service": "21.2.10",
     "@angular-devkit/build-angular": "21.2.8",
     "@angular-devkit/core": "21.2.8",
     "@angular-devkit/schematics": "21.2.8",
     "@schematics/angular": "21.2.8"
   }
   ```

4. Run install and validate:
   ```bash
   npm install
   nx build jouster-ui
   ```

5. **Commit** Angular upgrade:
   ```
   feat(workspace): upgrade angular to 21.2.10
   ```

### Acceptance

- [ ] All `@angular/*` packages at 21.x
- [ ] `overrides` updated
- [ ] `nx build jouster-ui` passes
- [ ] Committed as checkpoint

---

## Phase 4: Upgrade Supporting Dependencies

### Steps

| # | Package | From | To | Notes |
|---|---------|------|----|-------|
| 1 | `zone.js` | ^0.15.1 | ^0.16.0 | Verify polyfills still resolve |
| 2 | `rxjs` | 7.8.1 | 7.8.2 | Minor update, update overrides |
| 3 | `@angular-eslint/*` | 20.3.0 | 21.x | Run `ng update angular-eslint` |
| 4 | `angular-eslint` | ^20.3.0 | ^21.x | Companion package |
| 5 | `jest-preset-angular` | ~14.6.1 | ~15.x | Check snapshot serializer paths |
| 6 | `@ngneat/spectator` | ^21.0.1 | Verify | May need update for Angular 21 |
| 7 | TypeScript | ~5.9.2 | ~5.9.2 or ~6.0 | Both in Angular 21 range |
| 8 | `@swc/core` | ~1.13.3 | Verify | Check compatibility, update overrides |
| 9 | Cypress | ^14.2.1 | Verify | Should be fine with Nx 22.6.5 |

**For each dependency:**

```bash
npm install <package>@<version>
nx build jouster-ui
nx test
```

**Commit** supporting dependency upgrades:
```
chore(workspace): upgrade supporting dependencies for angular 21
```

### Acceptance

- [ ] All supporting deps updated
- [ ] `zone.js` polyfills work
- [ ] ESLint rules pass with new `angular-eslint`
- [ ] Jest tests pass with new `jest-preset-angular`
- [ ] Build passes

---

## Phase 5: Code Migrations & Breaking Changes

### Angular 21 Migration Items

Review the Angular 21 migration guide for:

1. **Removed deprecated APIs** — Check for deprecated APIs that were removed
2. **Signal-based updates** — Angular 21 likely promotes more signal-based patterns
3. **HttpClient changes** — Check for stricter typing or API changes
4. **Template type checking** — May be stricter in Angular 21
5. **Standalone component defaults** — Angular 21 may change defaults

### Workspace-Specific Checks

1. **`tsconfig.base.json`** — Consider removing `emitDecoratorMetadata` and
   `experimentalDecorators` if all components are standalone/signal-based
   (optional, non-breaking)

2. **`eslint.config.mjs`** — Verify `@nx/eslint-plugin` flat configs
   (`flat/angular`, `flat/angular-template`) are compatible with `angular-eslint` 21.x

3. **`@angular-devkit/build-angular` vs `@angular/build`** — Angular 21 continues
   the migration toward `@angular/build` as primary builder. Consider whether
   `@angular-devkit/build-angular` can be dropped entirely since `project.json`
   already uses `@angular/build:application`.

4. **Auth MFE** (`apps/auth-mfe/`) — Ensure module federation config is
   compatible with Angular 21 build system changes

### Steps

1. Review `ng update` migration output for automatic fixes
2. Search codebase for deprecated API usage
3. Fix any TypeScript compilation errors
4. Fix any ESLint violations
5. Update any affected unit tests

**Commit:**
```
refactor(workspace): apply angular 21 migration changes
```

### Acceptance

- [ ] No deprecated API usage
- [ ] All TypeScript errors resolved
- [ ] ESLint passes
- [ ] All tests pass

---

## Phase 6: Validate & Finalize

### Full Validation Suite

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Build all apps
nx build jouster-ui
nx build auth-mfe

# Run all tests
nx test --all

# Lint all projects
nx lint --all

# E2E tests
nx e2e jouster-ui-e2e
```

### Documentation Updates

1. Update `CHANGELOG.md` with version bump details
2. Update `README.md` if Angular version is mentioned
3. Update any CI/CD config if Node.js version constraints changed

### Final Commit & PR

```
docs(workspace): update changelog for angular 21 upgrade
```

Create PR against `main` with:
- Summary of all version changes
- Test results
- Any breaking changes encountered

### Acceptance

- [ ] Clean `npm install` works
- [ ] All builds pass
- [ ] All tests pass
- [ ] All lint checks pass
- [ ] E2E tests pass
- [ ] Documentation updated
- [ ] PR created and ready for review

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Nx migration breaks build | Medium | High | Checkpoint commits, rollback possible |
| Angular 21 removes used APIs | Low | Medium | Review migration guide beforehand |
| `jest-preset-angular` incompatibility | Medium | Medium | Check changelog before upgrading |
| `angular-eslint` rule changes | Low | Low | Can temporarily disable rules |
| Auth MFE module federation issues | Medium | High | Test auth-mfe build separately |
| `zone.js` 0.16 breaking changes | Low | Medium | Test polyfill loading |

---

## Rollback Plan

If the upgrade fails at any phase:

1. **Reset to checkpoint commit:** `git reset --hard <checkpoint-commit>`
2. **Clean install:** Delete `node_modules` and `package-lock.json`, run `npm install`
3. **Verify rollback:** Run `nx build jouster-ui` and `nx test`

Each phase creates a checkpoint commit, so rollback is granular.

---

## References

- [Angular Update Guide](https://angular.dev/update-guide)
- [Nx Migration Guide](https://nx.dev/features/automate-updating-dependencies)
- [Angular 21 Blog Post](https://blog.angular.dev/) (check for release post)
- [Nx 22 Changelog](https://github.com/nrwl/nx/releases)

