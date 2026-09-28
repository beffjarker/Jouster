# QA Environment Setup Guide

## Overview
The QA environment automatically deploys from the `develop` branch to `qa.jouster.org` whenever a pull request is merged.

## Architecture
- **Domain**: qa.jouster.org
- **AWS Region**: us-west-2
- **S3 Bucket**: qa.jouster.org
- **Deployment Trigger**: PR merge to `develop` branch
- **Build Tool**: GitHub Actions + AWS CLI

## Automated Deployment
When a PR is merged into the `develop` branch:
1. GitHub Actions triggers the QA deployment workflow
2. Application is built using `npm run build`
3. Built files are deployed to S3 bucket `qa.jouster.org`
4. DNS record is created/updated for qa.jouster.org
5. QA environment is accessible at https://qa.jouster.org

## Manual Deployment
You can also deploy manually using:

**Windows:**
```bash
cd aws/scripts
deploy-qa.bat
```

**Linux/Mac:**
```bash
cd aws/scripts
./deploy-qa.sh
```

## Environment URLs
- **QA Domain**: https://qa.jouster.org
- **S3 Direct**: http://qa.jouster.org.s3-website-us-west-2.amazonaws.com

## Configuration Files
- **Workflow**: `.github/workflows/qa-deploy.yml`
- **Infrastructure**: `aws/infrastructure/qa-environment.yml`
- **Scripts**: `aws/scripts/deploy-qa.{bat,sh}`
- **Policies**: `aws/policies/qa-bucket-policy.json`
- **DNS Config**: `aws/configs/qa-dns-record.json`
- **Environment Config**: `aws/configs/environment-config.json`

## GitHub Secrets Required
For automated deployment, ensure these secrets are set in GitHub:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Branch Strategy
- **`main`** → Production (jouster.org)
- **`develop`** → QA Environment (qa.jouster.org)
- **Feature branches** → Create PRs to `develop`

## Development Workflow
1. Create feature branch from `develop`
2. Make changes and commit
3. Create PR to merge into `develop`
4. After PR approval and merge, QA deployment automatically triggers
5. Test changes on qa.jouster.org
6. When ready, create PR from `develop` to `main` for production release

## Monitoring & Logs
- GitHub Actions logs: Repository → Actions tab
- AWS CloudWatch: Monitor S3 access logs
- DNS propagation: Use DNS checker tools

## Troubleshooting
- **Build failures**: Check GitHub Actions logs
- **DNS issues**: Verify Route 53 hosted zone exists
- **Access issues**: Check S3 bucket policy and public access settings
- **SSL**: QA uses HTTP (no SSL) for simplicity, production uses HTTPS
