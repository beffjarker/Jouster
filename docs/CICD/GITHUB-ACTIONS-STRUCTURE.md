# GitHub Actions Structure

Inventory of the workflows in `.github/workflows/` and the runbook for promoting the frontend
from QA through staging (GREEN) to production (BLUE).

The frontend is built **once**, when a change merges to `develop`. The same artifact is then promoted
QA → staging → production by copying S3 objects, so each environment runs exactly what the previous one tested.

## Environments

| Environment | URL | Source | Deployed by |
| ----------- | --- | ------ | ----------- |
| QA | https://qa.jouster.org | `develop` (built here) | `qa-deploy.yml` (push to `develop`) |
| GREEN / staging | https://stg.jouster.org | promoted from QA | `promote-frontend-staging.yml` (manual) |
| BLUE / production | https://jouster.org | promoted from staging | `promote-frontend-production.yml` (manual) |

## Recommended pinned workflows

Pinning is only available in the GitHub UI. In **Actions**, select the workflow and choose
**…** → **Pin workflow**.

1. **Promote Frontend: QA → Staging** (`promote-frontend-staging.yml`)
2. **Promote Frontend: Staging → Production** (`promote-frontend-production.yml`)
3. **Rollback Frontend Production** (`rollback-frontend-production.yml`)
4. **Deploy Backend (prod) — Lambda Blue/Green Canary** (`deploy-backend-prod.yml`)

## Workflow inventory

| Workflow | Trigger | Purpose |
| -------- | ------- | ------- |
| `promote-frontend-staging.yml` | manual | Copy the QA artifact to staging (sync → invalidate → verify `build-info.json`) |
| `promote-frontend-production.yml` | manual | Copy the staging artifact to production (snapshot → publish → invalidate → verify) |
| `rollback-frontend-production.yml` | manual | Restore a production snapshot |
| `staging-deploy.yml` | manual | Fallback only: rebuild GREEN from a ref (e.g. a hotfix); writes `build-info.json` |
| `qa-deploy.yml` | push `develop`, manual | Build and deploy QA; writes `build-info.json` |
| `ci.yml` | push `main` / `develop` | Lint, test, build |
| `build-preview-artifact.yml` | pull request | Build the PR preview artifact |
| `pull-request-delete-preview.yml` | PR closed | Remove PR preview resources |
| `branch-delete-cleanup.yml` | branch deleted | Remove branch preview resources |
| `scheduled-cleanup.yml` | weekly, manual | Remove orphaned preview resources |
| `codeql-monorepo.yml` | push, pull request | CodeQL scanning |
| `dependency-review.yml` | pull request, merge group | Dependency vulnerability review |
| `deploy-backend-nonprod.yml` | push `develop`, manual | Backend Lambda blue/green (nonprod) |
| `deploy-backend-prod.yml` | `v*` tag, manual | Backend Lambda blue/green canary (prod) |

## Frontend promotion (QA → GREEN)

1. Confirm qa.jouster.org is good. `https://qa.jouster.org/build-info.json` shows the deployed commit.
2. Run **Promote Frontend: QA → Staging** with `confirm` = `promote` (try `dry_run` = `true` first).
3. The workflow syncs `s3://qa.jouster.org` to `s3://stg.jouster.org`, invalidates the staging
   CloudFront distribution, and checks that `https://stg.jouster.org/build-info.json` reports the QA commit.

It runs in the `staging` GitHub environment as `GitHubActionsPreviewRole`, which needs read access to
`qa.jouster.org`, write access to `stg.jouster.org`, and `cloudfront:ListDistributions` /
`CreateInvalidation` / `GetInvalidation` on the staging distribution
(see `aws/policies/github-actions-preview-policy.json`).

## Frontend promotion (GREEN → BLUE)

Production is the S3 bucket behind the default origin of the CloudFront distribution aliased to
`jouster.org`. It is discovered at runtime by `.github/scripts/frontend-release.sh resolve`.
Promotion copies the exact staging build into that bucket; it does not rebuild.

### Promote

1. Confirm stg.jouster.org is good. `http://stg.jouster.org/build-info.json` shows the deployed commit.
2. Run **Promote Frontend: Staging → Production** with `confirm` = `promote`.
   Run with `dry_run` = `true` first to see the S3 diff without changing anything. Dry runs are titled
   "(dry run)" in the run list and show a warning banner, because nothing is deployed.
3. The workflow then:
   1. snapshots current production to `s3://jouster-org-releases/frontend/<timestamp>-pre-promote-<sha>/`
   2. publishes the staging build. `*.html` and `build-info.json` get `Cache-Control: no-cache, no-store,
      must-revalidate` so browsers always fetch the latest app shell.
   3. clears the CloudFront cache (`/*` invalidation) and waits for it to finish
   4. checks that `https://jouster.org/index.html` matches the staging copy

### Roll back

Run **Rollback Frontend Production** with `confirm` = `rollback`. Leave `snapshot` blank to restore
the most recent snapshot, or enter a snapshot ID from a previous job summary. The rollback
snapshots the current state first, so it can itself be undone. The 10 newest snapshots are kept.

### Configuration

| Name | Kind | Required | Notes |
| ---- | ---- | -------- | ----- |
| `AWS_PROD_FRONTEND_ROLE_ARN` | secret | no | OIDC role to assume. Falls back to `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` |
| `PROD_FRONTEND_BUCKET` | variable | no | Override the auto-discovered production bucket |
| `PROD_CLOUDFRONT_DISTRIBUTION_ID` | variable | no | Override the auto-discovered distribution |
| `FRONTEND_RELEASES_BUCKET` | variable | no | Snapshot bucket (default `jouster-org-releases`) |

Both workflows run in the `production` GitHub environment, so a required reviewer can gate them.

IAM permissions needed by the credentials:

- `s3:ListBucket` and `s3:GetObject` on `stg.jouster.org`
- `s3:ListBucket`, `s3:GetObject`, `s3:PutObject`, and `s3:DeleteObject` on the production bucket and on `jouster-org-releases`
- `s3:CreateBucket` and `s3:PutBucketPublicAccessBlock` on `jouster-org-releases`, needed only on the first run when the bucket is created
- `cloudfront:ListDistributions`, `cloudfront:GetDistributionConfig`, `cloudfront:CreateInvalidation`, and `cloudfront:GetInvalidation`
