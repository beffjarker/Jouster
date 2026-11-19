# Staging Environment Setup Guide (Green Environment)

## Overview
Staging (`stg.jouster.org`) is the **GREEN environment** in the blue-green strategy. It is not built
from a branch: the artifact already tested on QA is promoted to it unchanged with the
**Promote Frontend: QA → Staging** workflow.

## Architecture
- **Domain**: stg.jouster.org (served through CloudFront)
- **AWS Region**: us-west-2
- **S3 Bucket**: stg.jouster.org
- **Deployment Trigger**: manual promotion from QA
- **Build Tool**: none at promotion time (the QA build from `main` is copied)
- **Environment Type**: GREEN (Pre-production staging)

## Promotion from QA
1. Run **Promote Frontend: QA → Staging** in GitHub Actions (`confirm` = `promote`; try `dry_run` first)
2. `s3://qa.jouster.org` is synced to `s3://stg.jouster.org`
3. The staging CloudFront cache is invalidated
4. The workflow checks that https://stg.jouster.org/build-info.json reports the QA commit

## Fallback rebuild
**Rebuild Frontend: Staging (fallback)** (`staging-deploy.yml`) rebuilds staging from a
selected ref. Use it only for recovery or hotfixes; it does not run automatically.

## Manual Deployment
You can also deploy manually using:

**Windows:**
```bash
npm run deploy:staging
# or directly
cd aws/scripts
deploy-staging.bat
```

**Linux/Mac:**
```bash
npm run deploy:staging:sh
# or directly
cd aws/scripts
./deploy-staging.sh
```

## Environment URLs
- **Staging Domain**: https://stg.jouster.org
- **S3 website endpoint**: http://stg.jouster.org.s3-website-us-west-2.amazonaws.com (redirects to HTTPS
  once the bucket is secured, see [HTTPS only](#https-only))

## HTTPS only

Staging and production buckets are made private with the **Secure Frontend Origins (HTTPS only)** workflow
(`.github/workflows/secure-frontend-origins.yml`). It moves each CloudFront origin to the S3 REST endpoint
with Origin Access Control, attaches the managed `SecurityHeadersPolicy` (HSTS and other security headers),
verifies it, removes public read and turns the S3 website endpoint into a redirect to HTTPS. It is safe to
re-run. See [QA HTTPS](../../QA-HTTPS-ISSUE.md#private-s3-origins-s3-origin-httpssh)
for the steps it performs.

1. Run it with `target` = `staging` and `dry_run` = `true`; review the planned changes in the log.
2. Run it again with `dry_run` = `false`.
3. Check: `curl -I http://stg.jouster.org.s3-website-us-west-2.amazonaws.com/` returns
   `301 Location: https://stg.jouster.org/`, `https://stg.jouster.org` still loads, and
   `curl -I https://stg.jouster.org/` shows `strict-transport-security: max-age=31536000`.
4. Repeat with `target` = `production`.

The `legacy-www-bucket` target handles the old `www.jouster.org` bucket, which no CloudFront distribution
uses (production is served from `jouster-org-west`). It runs the script's `retire` command: public read is
removed, Block Public Access is turned on and the website endpoint redirects to `https://jouster.org`. It
uses the production approval gate.

## Blue-Green Deployment Strategy

### Environment Mapping:
- **QA Environment**: qa.jouster.org (main branch)
- **GREEN Environment**: stg.jouster.org (promoted from QA) ← **This is staging**
- **BLUE Environment**: jouster.org / www.jouster.org (production)

### Deployment Flow:
1. **Feature Development** → `main` branch → **QA** (qa.jouster.org), built once here
2. **Release Candidate** → Promote QA → **GREEN** (stg.jouster.org) ← **Staging**
3. **Production Release** → Promote staging → **BLUE** (jouster.org)

## Configuration Files
- **Workflows**: `.github/workflows/promote-frontend-staging.yml` (normal), `.github/workflows/staging-deploy.yml` (fallback)
- **Scripts**: `aws/scripts/deploy-staging.{bat,sh}`
- **Policies**: `aws/policies/staging-bucket-policy.json`
- **DNS Config**: `aws/configs/staging-dns-record.json`
- **Environment Config**: `aws/configs/environment-config.json`

## GitHub Secrets Required
For automated deployment, ensure these secrets are set in GitHub:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Branch Strategy
- **`main`** (trunk) → QA Environment (qa.jouster.org); the only branch that builds the frontend
- **Manual promotion** → GREEN Environment (stg.jouster.org) ← **This staging**
- **Manual promotion** → BLUE Environment (jouster.org)

## Development Workflow
1. Create a short-lived feature branch from `main`
2. Create PR to merge into `main` → Deploys to **QA**
3. When QA testing passes, run **Promote Frontend: QA → Staging** → **GREEN (Staging)**
4. When staging testing passes, run **Promote Frontend: Staging → Production** → **BLUE (Production)**

`https://<env>/build-info.json` records which `main` commit each environment is running.

## Monitoring & Logs
- GitHub Actions logs: Repository → Actions tab
- AWS CloudWatch: Monitor S3 access logs
- DNS propagation: Use DNS checker tools

## Troubleshooting
- **Build failures**: Check GitHub Actions logs
- **DNS issues**: Verify Route 53 hosted zone exists
- **Access issues**: Once secured, the bucket is private; check that its policy allows `cloudfront.amazonaws.com`
  for the staging distribution and that the origin uses the `jouster-s3-oac` Origin Access Control
- **SSL**: Staging and production are served over HTTPS through CloudFront; HTTP redirects to HTTPS

## Next Steps
After staging testing is complete, promote to production:
1. Test thoroughly on stg.jouster.org (`/build-info.json` shows the deployed commit)
2. Run the **Promote Frontend: Staging → Production** workflow (`confirm` = `promote`; try `dry_run` first)
3. If needed, run **Rollback Frontend Production** to restore the previous release

See [GitHub Actions Structure](../../CICD/GITHUB-ACTIONS-STRUCTURE.md) for details.
