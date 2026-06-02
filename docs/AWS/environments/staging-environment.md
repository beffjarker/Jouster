# Staging Environment Setup Guide (Green Environment)

## Overview
The staging environment automatically deploys from the `main` branch to `stg.jouster.org` whenever a pull request is merged. This represents your **GREEN environment** for blue-green deployment strategy.

## Architecture
- **Domain**: stg.jouster.org
- **AWS Region**: us-west-2
- **S3 Bucket**: stg.jouster.org
- **Deployment Trigger**: PR merge to `main` branch
- **Build Tool**: GitHub Actions + AWS CLI
- **Environment Type**: GREEN (Pre-production staging)

## Automated Deployment
When a PR is merged into the `main` branch:
1. GitHub Actions triggers the staging deployment workflow
2. Application is built using `npm run build:prod` (production build)
3. Built files are deployed to S3 bucket `stg.jouster.org`
4. DNS record is created/updated for stg.jouster.org
5. Staging environment is accessible at https://stg.jouster.org

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
- **GREEN Environment**: stg.jouster.org (main branch) ← **This is staging**
- **BLUE Environment**: jouster.org / www.jouster.org (production)

### Deployment Flow:
1. **Feature Development** → `develop` branch → **QA** (qa.jouster.org)
2. **Release Candidate** → `main` branch → **GREEN** (stg.jouster.org) ← **Staging**
3. **Production Release** → Manual promotion → **BLUE** (jouster.org)

## Configuration Files
- **Workflow**: `.github/workflows/staging-deploy.yml`
- **Scripts**: `aws/scripts/deploy-staging.{bat,sh}`
- **Policies**: `aws/policies/staging-bucket-policy.json`
- **DNS Config**: `aws/configs/staging-dns-record.json`
- **Environment Config**: `aws/configs/environment-config.json`

## GitHub Secrets Required
For automated deployment, ensure these secrets are set in GitHub:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Branch Strategy
- **`develop`** → QA Environment (qa.jouster.org)
- **`main`** → GREEN Environment (stg.jouster.org) ← **This staging**
- **Manual promotion** → BLUE Environment (jouster.org)

## Development Workflow
1. Create feature branch from `develop`
2. Create PR to merge into `develop` → Deploys to **QA**
3. When QA testing passes, create PR from `develop` to `main` → Deploys to **GREEN (Staging)**
4. When staging testing passes, manually promote to **BLUE (Production)**

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
After staging testing is complete, promote to production by:
1. Testing thoroughly on stg.jouster.org
2. Running production deployment scripts
3. Switching DNS from BLUE to GREEN environment
