# GitHub Actions Structure

Inventory of the workflows in `.github/workflows/` and the runbook for promoting the frontend
from staging (GREEN) to production (BLUE).

## Environments

| Environment | URL | Source | Deployed by |
| ----------- | --- | ------ | ----------- |
| QA | http://qa.jouster.org | `develop` | `qa-deploy.yml` (push to `develop`) |
| GREEN / staging | http://stg.jouster.org | `main` | `staging-deploy.yml` (push to `main`) |
| BLUE / production | https://jouster.org | promoted from staging | `promote-frontend-production.yml` (manual) |

## Recommended pinned workflows

Pinning is only available in the GitHub UI. In **Actions**, select the workflow and choose
**…** → **Pin workflow**.

1. **Promote Frontend: Staging → Production** (`promote-frontend-production.yml`)
2. **Rollback Frontend Production** (`rollback-frontend-production.yml`)
3. **Deploy Frontend: Staging (stg.jouster.org)** (`staging-deploy.yml`)
4. **Deploy Backend (prod) — Lambda Blue/Green Canary** (`deploy-backend-prod.yml`)

## Workflow inventory

| Workflow | Trigger | Purpose |
| -------- | ------- | ------- |
| `promote-frontend-production.yml` | manual | Copy the staging artifact to production (snapshot → publish → invalidate → verify) |
| `rollback-frontend-production.yml` | manual | Restore a production snapshot |
| `staging-deploy.yml` | push `main`, manual | Build and deploy GREEN; writes `build-info.json` |
| `qa-deploy.yml` | push `develop`, manual | Build and deploy QA |
| `ci.yml` | push `main` / `develop` | Lint, test, build |
| `build-preview-artifact.yml` | pull request | Build the PR preview artifact |
| `pull-request-delete-preview.yml` | PR closed | Remove PR preview resources |
| `branch-delete-cleanup.yml` | branch deleted | Remove branch preview resources |
| `scheduled-cleanup.yml` | weekly, manual | Remove orphaned preview resources |
| `codeql-monorepo.yml` | push, pull request | CodeQL scanning |
| `dependency-review.yml` | pull request, merge group | Dependency vulnerability review |
| `deploy-backend-nonprod.yml` | push `develop`, manual | Backend Lambda blue/green (nonprod) |
| `deploy-backend-prod.yml` | `v*` tag, manual | Backend Lambda blue/green canary (prod) |

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
