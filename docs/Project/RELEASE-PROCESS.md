# Jouster Release Process

**Status**: Active

Jouster uses **trunk-based development** with **build once, promote many** deployments.

- `main` is the only long-lived branch. There is no `develop` or `release/*` branch.
- Every merge to `main` is built once and deployed to QA.
- That same artifact is promoted, unchanged, to staging and then to production.

This replaces the earlier Git Flow process, which had `develop`, release branches, and merging `main` back to `develop`.

---

## Environments

| Environment | URL | Source | Deployed by |
|-------------|-----|--------|-------------|
| Preview | `http://jouster-preview-prXX.s3-website-us-west-2.amazonaws.com` | PR branch | `build-preview-artifact.yml` (PR opened/updated) |
| QA | https://qa.jouster.org | `main`, built here | `qa-deploy.yml` (push to `main`) |
| Staging (GREEN) | https://stg.jouster.org | promoted from QA | **Promote Frontend: QA → Staging** (manual) |
| Production (BLUE) | https://jouster.org | promoted from staging | **Promote Frontend: Staging → Production** (manual) |

Every environment serves `/build-info.json` with the `main` commit it is running.

```
feature branch ──PR──▶ main ──build──▶ QA ──promote──▶ Staging ──promote──▶ Production
                 (preview)          (qa.jouster.org)  (stg.jouster.org)     (jouster.org)
```

See [GitHub Actions Structure](../CICD/GITHUB-ACTIONS-STRUCTURE.md) for the full workflow inventory and runbook.

---

## Day-to-day development

```bash
git checkout main
git pull origin main
git checkout -b jb-OP-short-description   # or [initials]-[ticket]-[description]

# commit using Conventional Commits
git commit -m "feat(jouster-ui): add something"

git push -u origin jb-OP-short-description
gh pr create --base main
```

- Keep branches short-lived and rebase on `main` instead of merging it in.
- The PR runs CI and deploys a preview environment.
- Merges use rebase or merge commits; squash merging is disabled.
- Hide unfinished features behind a flag or route guard. Do not use long-lived branches for them.

---

## Releasing

1. **QA.** After a merge, `qa-deploy.yml` builds `main` and deploys it to https://qa.jouster.org. Test there.
2. **Staging.** Run **Promote Frontend: QA → Staging** with `confirm` = `promote`. Use `dry_run` first.
   - QA is copied to stg.jouster.org.
   - The staging cache is invalidated.
   - The workflow checks that staging's `build-info.json` matches QA's.
3. **Human verification.** Test stg.jouster.org. Do not skip this step: v1.0.0 was released without
   staging verification and had to be reverted to 0.5.0.
4. **Production.** Run **Promote Frontend: Staging → Production** with `confirm` = `promote`.
   - Production is snapshotted first.
   - The staging artifact is published to jouster.org.
5. **Roll back if needed.** Run **Rollback Frontend Production**. It restores a snapshot.

The backend follows the same trunk:

- `deploy-backend-nonprod.yml` deploys on push to `main`.
- `deploy-backend-prod.yml` deploys on `v*` tags.

### Versioning

- Versions follow [Semantic Versioning](https://semver.org/).
- Bump `package.json` in a PR to `main` before the release.
- After production is promoted, tag the promoted commit and create a GitHub Release:

  ```bash
  git tag -a vX.Y.Z <sha-from-build-info.json> -m "Release vX.Y.Z"
  git push origin vX.Y.Z
  gh release create vX.Y.Z --generate-notes
  ```

> ⚠️ Pushing a `v*` tag also triggers the backend production deploy (`deploy-backend-prod.yml`).

---

## Hotfixes

If `main` has no unreleased changes, fix forward:

1. Open a PR to `main`.
2. Merge it, then promote QA → staging → production as usual.

If `main` has changes that must not ship yet:

1. Branch from the commit in production (production's `build-info.json` shows the sha).
2. Fix the bug and open a PR to `main`.
3. Run **Rebuild Frontend: Staging (fallback)** (`staging-deploy.yml`) on the hotfix branch.
4. Verify on staging, then promote staging → production.
5. Merge the hotfix PR into `main` so it is not lost.

---

## Rules

### Do ✅

- Branch from `main` and open PRs against `main`
- Test on QA and staging before promoting to production
- Promote artifacts; never rebuild for staging or production
- Check `build-info.json` to confirm what each environment runs

### Don't ❌

- Create long-lived branches (`develop`, `release/*`)
- Force push to `main`
- Deploy to production without staging verification

---

## References

- Trunk-based development: https://trunkbaseddevelopment.com/
- GitHub Flow: https://docs.github.com/en/get-started/using-github/github-flow
- Semantic Versioning: https://semver.org/
- Conventional Commits: https://www.conventionalcommits.org/
