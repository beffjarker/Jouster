# AWS Security Best Practices

## Overview

This document outlines security best practices for managing AWS credentials, configuration, and resources in the Jouster project.

---

## 🔒 Credential Management

### **CRITICAL RULES**

1. **NEVER commit credentials to git**
   - ❌ No access keys in code
   - ❌ No secret keys in configuration files
   - ❌ No passwords in scripts
   - ❌ No IAM user credentials anywhere in the repository

2. **Use git-ignored files for credentials**
   - ✅ `aws/credentials` - AWS CLI credentials (git-ignored)
   - ✅ `.env` files - Application environment variables (git-ignored)

3. **Use templates for sharing configuration**
   - ✅ `aws/credentials.example` - Template for team setup
   - ✅ `aws/config.example` - Safe region/output configuration
   - ✅ `*.template.*` files - Scripts with placeholders

---

## 📁 File Organization

### **Git-Ignored (Local Only)**
```
aws/
├── credentials          # AWS CLI credentials (NEVER COMMIT)
├── config               # AWS CLI config (NEVER COMMIT - contains profile names)
```

### **Git-Tracked (Safe to Commit)**
```
aws/
├── credentials.example  # Template for credentials setup
├── config.example       # Template for config setup
├── policies/            # IAM policy JSON files (no secrets)
├── infrastructure/      # CloudFormation/Terraform configs (no secrets)
└── scripts/
    ├── deploy-*.sh      # Deployment scripts (use env vars for credentials)
    └── *-template.ps1   # Script templates with placeholders
```

### **Git-Ignored Scripts (Contains Credentials)**
```
aws/scripts/
├── setup-github-actions.ps1     # Uses hardcoded credentials (NEVER COMMIT)
└── init-tables.bat              # Database init with credentials (NEVER COMMIT)
```

---

## 🔑 AWS Credentials Setup

### **1. Install AWS CLI**
Download from: https://aws.amazon.com/cli/

### **2. Create IAM Users**

Create separate IAM users for different purposes:

| IAM User | Purpose | Permissions |
|----------|---------|-------------|
| `jouster-dev` | Local development | Limited (dev resources only) |
| `jouster-qa` | QA environment | Limited (QA resources only) |
| `jouster-staging` | Staging environment | Full (staging resources) |
| `jouster-prod` | Production | Full (production resources) |
| `jouster-admin` | Infrastructure setup | Admin (IAM, policies, OIDC) |

### **3. Configure AWS CLI Profiles**

1. Copy template:
   ```cmd
   copy aws\credentials.example aws\credentials
   copy aws\config.example aws\config
   ```

2. Edit `aws/credentials` and add your access keys:
   ```ini
   [default]
   aws_access_key_id = YOUR_DEV_ACCESS_KEY_HERE
   aws_secret_access_key = YOUR_DEV_SECRET_KEY_HERE

   [profile admin]
   aws_access_key_id = YOUR_ADMIN_ACCESS_KEY_HERE
   aws_secret_access_key = YOUR_ADMIN_SECRET_KEY_HERE
   ```

3. Verify configuration:
   ```cmd
   aws sts get-caller-identity --profile admin
   aws sts get-caller-identity --profile default
   ```

---

## 🛡️ Security Incident Response

### **If Credentials are Exposed**

**IMMEDIATE ACTIONS (within 1 hour):**

1. **Rotate credentials immediately**
   - Go to AWS Console → IAM → Users
   - Find user by access key ID
   - Deactivate old key
   - Create new key
   - Update local `aws/credentials` file

2. **Remove from git history**
   ```cmd
   git rm --cached aws/credentials
   git commit -m "security: remove exposed credentials"
   git push origin develop
   ```

3. **Check for unauthorized activity**
   - AWS CloudTrail: Check for suspicious API calls
   - AWS Billing: Look for unexpected charges
   - EC2: Check for unknown instances

4. **Enable monitoring**
   - Enable AWS GuardDuty
   - Set up billing alerts
   - Enable MFA on all IAM users

**DOCUMENTATION:**
- Create incident report in `dev-journal/sessions/`
- Create incident report for security team
- Document actions taken
- Update this guide if needed

---

## 🔐 Environment Variables (.env files)

### **Environment-Specific Credentials**

```
.env                    # Local development (git-ignored)
.env.qa                 # QA environment (git-ignored)
.env.staging            # Staging environment (git-ignored)
.env.production         # Production environment (git-ignored)
.env.example            # Template (COMMITTED - no secrets)
```

### **Loading Environment Variables**

**Node.js Applications:**
```javascript
// Use dotenv package
require('dotenv').config();

// Or environment-specific
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });
```

**PowerShell Scripts:**
```powershell
# Load from .env file
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $env:($matches[1]) = $matches[2]
    }
}
```

### **Required Environment Variables**

See `.env.example` for complete list. Key variables:

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-west-2

# Application Settings
NODE_ENV=development
PORT=3000

# API Keys (if applicable)
LASTFM_API_KEY=your_lastfm_key_here
INSTAGRAM_API_KEY=your_instagram_key_here
```

---

## 📋 Pre-Commit Security Checks

### **Automated Prevention**

Install pre-commit hooks to prevent credential commits:

```cmd
REM Windows
scripts\install-pre-commit-hook.bat

REM Unix/Linux/Mac
chmod +x scripts/install-pre-commit-hook.sh
./scripts/install-pre-commit-hook.sh
```

### **What Pre-Commit Hooks Check**

- ❌ Blocks commits with AWS access keys
- ❌ Blocks commits with `aws/credentials` file
- ❌ Blocks commits with `.env` files (except `.env.example`)
- ❌ Blocks commits with `*accessKeys.csv` files
- ✅ Allows `.example` template files

---

## 🔄 Credential Rotation

### **Rotation Schedule**

| Credential Type | Rotation Frequency |
|-----------------|-------------------|
| Development keys | Every 90 days |
| Production keys | Every 60 days |
| Admin keys | Every 30 days |
| Root account password | Every 30 days |

### **Rotation Process**

1. Create new access key in AWS Console
2. Update local `aws/credentials` file
3. Test new credentials
4. Deactivate old key
5. Wait 24 hours (ensure nothing breaks)
6. Delete old key
7. Update team if shared access

---

## 🎯 IAM Best Practices

### **Principle of Least Privilege**

- ✅ Grant minimum permissions required
- ✅ Use IAM policies to restrict access
- ✅ Separate dev/staging/production access
- ❌ Don't use admin credentials in application code

### **MFA (Multi-Factor Authentication)**

- ✅ Enable MFA on all IAM users
- ✅ Especially critical for admin users
- ✅ Use virtual MFA (Google Authenticator, Authy)

### **Policy Examples**

See `aws/policies/` for:
- `jouster-deployment-policy.json` - Deployment permissions
- `github-actions-preview-policy.json` - CI/CD permissions
- `bucket-policy.json` - S3 bucket access

---

## 📚 Additional Resources

### **AWS Documentation**
- [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS CLI Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)

### **Project Documentation**
- `SECURITY-INCIDENT-CREDENTIALS-EXPOSED.md` - Incident response example
- `aws/credentials.example` - Credentials template
- `aws/scripts/SETUP-QUICKREF.md` - Setup quickstart

### **Security Scanning Tools**
- [git-secrets](https://github.com/awslabs/git-secrets) - Prevent credential commits
- [truffleHog](https://github.com/trufflesecurity/trufflehog) - Find exposed secrets
- [AWS IAM Access Analyzer](https://aws.amazon.com/iam/access-analyzer/) - Audit permissions

---

## ✅ Security Checklist

Before deploying or committing code:

- [ ] No credentials in code
- [ ] `.env` files are git-ignored
- [ ] `aws/credentials` is not tracked
- [ ] Templates have placeholders, not real values
- [ ] Pre-commit hooks are installed
- [ ] MFA is enabled on AWS accounts
- [ ] Credentials are rotated regularly
- [ ] IAM policies follow least privilege
- [ ] Billing alerts are configured
- [ ] CloudTrail logging is enabled

---

## 📞 Contact & Support

**Security Issues:**
- Report immediately to project lead
- Create incident report in `dev-journal/sessions/`
- Create incident report for security team

**Questions:**
- Check project documentation in `docs/`
- Review `.env.example` for required variables
- See `aws/scripts/SETUP-QUICKREF.md` for setup help

---

**Last Updated:** October 29, 2025  
**Version:** 1.0  
**Maintainer:** Project Security Team

