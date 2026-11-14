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
- **Build Tool**: none at promotion time (the QA build from `develop` is copied)
- **Environment Type**: GREEN (Pre-production staging)

## Promotion from QA
1. Run **Promote Frontend: QA → Staging** in GitHub Actions (`confirm` = `promote`; try `dry_run` first)
2. `s3://qa.jouster.org` is synced to `s3://stg.jouster.org`
3. The staging CloudFront cache is invalidated
4. The workflow checks that https://stg.jouster.org/build-info.json reports the QA commit

## Fallback rebuild
**Rebuild Frontend: Staging from main (fallback)** (`staging-deploy.yml`) rebuilds staging from a
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
- **S3 Direct**: http://stg.jouster.org.s3-website-us-west-2.amazonaws.com

## Blue-Green Deployment Strategy

### Environment Mapping:
- **QA Environment**: qa.jouster.org (develop branch)
- **GREEN Environment**: stg.jouster.org (promoted from QA) ← **This is staging**
- **BLUE Environment**: jouster.org / www.jouster.org (production)

### Deployment Flow:
1. **Feature Development** → `develop` branch → **QA** (qa.jouster.org), built once here
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
- **`develop`** → QA Environment (qa.jouster.org); the only branch that builds the frontend
- **Manual promotion** → GREEN Environment (stg.jouster.org) ← **This staging**
- **Manual promotion** → BLUE Environment (jouster.org)

## Development Workflow
1. Create feature branch from `develop`
2. Create PR to merge into `develop` → Deploys to **QA**
3. When QA testing passes, run **Promote Frontend: QA → Staging** → **GREEN (Staging)**
4. When staging testing passes, run **Promote Frontend: Staging → Production** → **BLUE (Production)**
5. Fast-forward `main` to the promoted commit so `main` records what is in production

## Monitoring & Logs
- GitHub Actions logs: Repository → Actions tab
- AWS CloudWatch: Monitor S3 access logs
- DNS propagation: Use DNS checker tools

## Troubleshooting
- **Build failures**: Check GitHub Actions logs
- **DNS issues**: Verify Route 53 hosted zone exists
- **Access issues**: Check S3 bucket policy and public access settings
- **SSL**: Staging uses HTTP (no SSL) for simplicity, production uses HTTPS

## Next Steps
After staging testing is complete, promote to production:
1. Test thoroughly on stg.jouster.org (`/build-info.json` shows the deployed commit)
2. Run the **Promote Frontend: Staging → Production** workflow (`confirm` = `promote`; try `dry_run` first)
3. If needed, run **Rollback Frontend Production** to restore the previous release

See [GitHub Actions Structure](../../CICD/GITHUB-ACTIONS-STRUCTURE.md) for details.
