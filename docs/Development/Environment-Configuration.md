# Environment Management Guide

## 📋 Overview

This project uses environment-specific configuration files to manage credentials and settings across different deployment stages.

## 🎯 Environment Hierarchy

```
Local Development → QA/Preview → Staging → Production
```

## 📁 Environment Files

| File | Purpose | Committed? | IAM User |
|------|---------|-----------|----------|
| `.env` | Local development | ❌ No | `jouster-dev` |
| `.env.example` | Template (no secrets) | ✅ Yes | N/A |
| `.env.qa` | QA/Preview testing | ❌ No | `jouster-qa` |
| `.env.qa.example` | QA template | ✅ Yes | N/A |
| `.env.staging` | Pre-production | ❌ No | `jouster-staging` |
| `.env.staging.example` | Staging template | ✅ Yes | N/A |
| `.env.production` | Production | ❌ No | `jouster-prod` |
| `.env.production.example` | Production template | ✅ Yes | N/A |

## 🚀 Quick Start

### Initial Setup

```bash
# 1. Copy the template
cp .env.example .env

# 2. Edit .env with your local development credentials
# Use jouster-dev IAM user credentials

# 3. Validate configuration
npm run env:validate
```

### Environment-Specific Setup

```bash
# QA Environment
cp .env.qa.example .env.qa
# Edit .env.qa with QA credentials
npm run env:validate:qa

# Staging Environment
cp .env.staging.example .env.staging
# Edit .env.staging with staging credentials
npm run env:validate:staging

# Production Environment
cp .env.production.example .env.production
# Edit .env.production with production credentials
npm run env:validate:production
```

## 🔒 Security Best Practices

### ✅ DO:
- Keep separate IAM users for each environment
- Use AWS Secrets Manager for production secrets (recommended for prod)
- Rotate credentials every 90 days
- Validate environment before deployment
- Document all environment variables in templates
- Store credentials in git-ignored `.env` files

### ❌ DON'T:
- **NEVER commit .env files to git** (except .example files)
- Don't use production credentials in dev/staging
- Don't share .env files via public channels (Slack, email, forums)
- Don't use admin credentials in application code
- Don't hardcode secrets in source code

### 🛡️ Why Git-Ignored Files Are Safe

These locations are **protected by .gitignore** and never leave your machine:

```
✅ SAFE - Git-Ignored (Local Only):
├── .env                    # Local development credentials
├── .env.qa                 # QA credentials
├── .env.staging            # Staging credentials  
├── .env.production         # Production credentials
└── .env.production         # Production credentials
❌ COMMITTED TO GIT:
├── .env.example            # Templates only (NO SECRETS)
├── .env.qa.example
├── .env.staging.example
└── .env.production.example
```

**This means:**
- ✅ Credentials stay on your local machine only
- ✅ Each developer has their own copies
- ✅ Safe to reference in local documentation (dev-journal)
- ✅ Can discuss with Copilot for local development assistance
## 🔑 AWS IAM Users by Environment

| IAM User | Environment | Access Level | Use Case |
|----------|-------------|--------------|----------|
| `jouster-dev` | Local | Limited (dev resources) | Development testing |
| `jouster-qa` | QA | Limited (qa resources) | CI/CD, PR previews |
| `jouster-staging` | Staging | Full (staging resources) | Pre-prod validation |
| `jouster-prod` | Production | Full (prod resources) | Live application |
| `jouster-admin` | Infrastructure | Admin (IAM management) | Setup ONLY |

**⚠️ CRITICAL:** Never use `jouster-admin` credentials in application code!

## 📊 Environment Variables Reference

### Required for All Environments

```bash
NODE_ENV=development|qa|staging|production
PORT=3000
AWS_ACCESS_KEY_ID=<environment-specific>
AWS_SECRET_ACCESS_KEY=<environment-specific>
AWS_REGION=us-west-2
```

### Local Development Only

```bash
DYNAMODB_ENDPOINT=http://localhost:8000  # Use local DynamoDB
AWS_ADMIN_ACCESS_KEY_ID=<admin-key>      # For infrastructure setup
AWS_ADMIN_SECRET_ACCESS_KEY=<admin-secret>
```

### QA/Staging/Production

```bash
# No DYNAMODB_ENDPOINT (uses AWS DynamoDB service)
S3_BUCKET_NAME=jouster-{env}-bucket
SENTRY_DSN=<environment-specific>
```

## 🔄 Environment Switching

### Windows (PowerShell)

```powershell
# Set environment
$env:NODE_ENV = "qa"
npm start

# Or use specific file
$env:DOTENV_CONFIG_PATH = ".env.qa"
npm start
```

### Unix/Linux/Mac

```bash
# Set environment
NODE_ENV=qa npm start

# Or use specific file
DOTENV_CONFIG_PATH=.env.qa npm start
```

## ✅ Validation

Always validate your environment configuration before deployment:

```bash
# Validate current environment
npm run env:validate

# Validate specific environment
npm run env:validate:qa
npm run env:validate:staging
npm run env:validate:production
```

The validator checks:
- ✅ All required variables are set
- ✅ No placeholder values remain
- ✅ No admin credentials in application config
- ✅ Appropriate DynamoDB endpoint for environment
- ⚠️ Recommended variables (warnings only)

## 🐛 Troubleshooting

### "Missing required environment variable"
→ Check your .env file exists and contains all required variables
→ Compare with .env.example to see what's missing

**Last Updated:** 2025-10-24  
**Next Credential Rotation:** 2026-01-22 (90 days from 2025-10-24)

## 📝 Credential Rotation Log

Track when credentials were last rotated:

| Environment | IAM User | Last Rotated | Next Rotation | Status |
|-------------|----------|--------------|---------------|--------|
| Local | `jouster-dev` | [Date] | [Date] | ⏰ Pending |
| QA | `jouster-qa` | [Date] | [Date] | ⏰ Pending |
| Staging | `jouster-staging` | [Date] | [Date] | ⏰ Pending |
| Production | `jouster-prod` | [Date] | [Date] | ⏰ Pending |

**Note:** Update this table in your `dev-journal/` (git-ignored) when you rotate credentials.
→ Replace with actual credentials

### "Admin credentials detected"
→ Remove AWS_ADMIN_* variables from .env
→ Admin credentials should only be used for infrastructure setup

**Note:** Track credential rotation dates in your local documentation.
→ Remove DYNAMODB_ENDPOINT from production .env
→ Production should use AWS DynamoDB service

## 📚 Additional Resources

- AWS IAM Best Practices: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- Secrets Management: https://docs.aws.amazon.com/secretsmanager/
- dotenv Documentation: https://github.com/motdotla/dotenv

## 🔄 Credential Rotation

Rotate credentials every 90 days:

1. Generate new AWS access keys in IAM Console
2. Update environment-specific .env files
3. Validate with `npm run env:validate`
4. Test deployment
5. Delete old access keys in AWS Console
6. Update documentation with rotation date

---

**Last Updated:** 2025-10-24
**Credential Rotation Due:** [Add date 90 days from now]

