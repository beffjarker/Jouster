# AWS Credentials Security Guide

## 🚨 CRITICAL: Never Commit Credentials to Git!

This guide explains how to securely manage AWS credentials for the Jouster project.

---

## ✅ Safe Credential Storage

### **Primary Method: Use .env Files (Recommended)**

All AWS credentials should be stored in **git-ignored `.env` files** at the project root:

```env
# Development credentials (IAM User: jouster-dev)
AWS_ACCESS_KEY_ID=your_dev_access_key_here
AWS_SECRET_ACCESS_KEY=your_dev_secret_key_here
AWS_REGION=us-west-2

# Admin credentials (IAM User: jouster-admin - infrastructure setup ONLY)
AWS_ADMIN_ACCESS_KEY_ID=your_admin_access_key_here
AWS_ADMIN_SECRET_ACCESS_KEY=your_admin_secret_key_here
AWS_ADMIN_REGION=us-west-2
```

**How to set up:**
1. Copy `.env.example` to `.env` at project root
2. Get credentials from AWS Console → IAM → Users → Security Credentials
3. Fill in your actual credential values in `.env`
4. **NEVER commit `.env` to git** (already in `.gitignore`)

### **Alternative: AWS CLI Configuration Files**

You can also use standard AWS CLI credential files:

**Location:** `aws/credentials` (git-ignored)

```ini
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY

[profile jouster-dev]
aws_access_key_id = YOUR_DEV_ACCESS_KEY_ID
aws_secret_access_key = YOUR_DEV_SECRET_ACCESS_KEY
region = us-west-2

[profile admin]
aws_access_key_id = YOUR_ADMIN_ACCESS_KEY_ID
aws_secret_access_key = YOUR_ADMIN_SECRET_ACCESS_KEY
region = us-west-2
```

**How to set up:**
1. Copy `aws/credentials.example` to `aws/credentials`
2. Fill in your actual credential values
3. **NEVER commit `aws/credentials` to git** (already in `.gitignore`)

---

## ❌ What NOT to Do

### **Never Store Credentials In:**
- ✗ CSV files (e.g., `jouster-dev_accessKeys.csv`) - Delete after downloading from AWS
- ✗ PowerShell/Bash scripts with hardcoded values
- ✗ JSON configuration files
- ✗ Source code files
- ✗ Documentation or README files
- ✗ Slack messages or emails
- ✗ Screenshots or screen recordings

### **Never Commit These Files:**
- ✗ `aws/credentials` (actual credentials file)
- ✗ `aws/config` (may contain account IDs)
- ✗ `.env`, `.env.local`, `.env.qa`, `.env.staging`, `.env.production`
- ✗ `*_accessKeys.csv`, `*accessKeys.csv` (AWS-generated CSV files)
- ✗ Any file with `AKIA` strings (AWS access key prefix)

---

## 🔒 Security Best Practices

### **1. Credential Rotation**
- Rotate credentials every **90 days** maximum
- Use AWS Console → IAM → Users → Security Credentials → Create Access Key
- Delete old credentials after creating new ones

### **2. Principle of Least Privilege**
- Use **jouster-dev** credentials for development (limited permissions)
- Use **jouster-admin** credentials ONLY for infrastructure setup
- Never use admin credentials in application code

### **3. Environment Separation**
- **Local Development:** Use jouster-dev IAM user
- **QA/Preview:** Use separate jouster-qa IAM user (future)
- **Staging:** Use separate jouster-staging IAM user (future)
- **Production:** Use separate jouster-prod IAM user (future)

### **4. Multi-Factor Authentication (MFA)**
- Enable MFA on AWS Console access for all IAM users
- Use hardware tokens or authenticator apps (not SMS)

### **5. Audit & Monitoring**
- Review IAM access in AWS Console → IAM → Credential Report
- Monitor CloudTrail logs for unauthorized access
- Set up AWS CloudWatch alerts for suspicious activity

---

## 🛠️ How Scripts Use Credentials

### **PowerShell Scripts (Windows)**

All PowerShell scripts load credentials from `.env`:

```powershell
# Load environment variables from .env
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

# Use credentials
$env:AWS_ACCESS_KEY_ID = $env:AWS_ADMIN_ACCESS_KEY_ID
$env:AWS_SECRET_ACCESS_KEY = $env:AWS_ADMIN_SECRET_ACCESS_KEY
```

### **Bash Scripts (Unix/Linux/Mac)**

Bash scripts should use `dotenv` or source the `.env` file:

```bash
# Load .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Use credentials
export AWS_ACCESS_KEY_ID=$AWS_ADMIN_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY=$AWS_ADMIN_SECRET_ACCESS_KEY
```

### **Node.js/JavaScript**

Use `dotenv` package (already installed):

```javascript
require('dotenv').config();

const AWS = require('aws-sdk');
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});
```

---

## 🧹 Cleanup Checklist

If you find credentials in unsafe locations:

- [ ] **Delete CSV files** immediately after use
- [ ] **Move credentials** to `.env` file at project root
- [ ] **Update scripts** to load from `.env` instead of hardcoded values
- [ ] **Verify `.gitignore`** includes credential files
- [ ] **Check git history** for accidentally committed credentials:
  ```cmd
  git log --all --full-history --source -- aws/credentials
  git log --all --full-history --source -- "*accessKeys.csv"
  ```
- [ ] **Rotate credentials** if they were committed to git (even in a local repo)
- [ ] **Update documentation** to reference secure methods

---

## 📚 Additional Resources

- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS Security Credentials Documentation](https://docs.aws.amazon.com/general/latest/gr/aws-security-credentials.html)
- [Git-Secrets Tool](https://github.com/awslabs/git-secrets) - Prevent committing credentials
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/) - Production credential management

---

## 🆘 What to Do If Credentials Are Exposed

If credentials are accidentally committed or exposed:

1. **Immediately rotate credentials** in AWS Console
2. **Delete exposed access keys** in IAM → Users → Security Credentials
3. **Create new access keys** and update `.env` file
4. **Review CloudTrail logs** for unauthorized access
5. **Check AWS billing** for unexpected charges
6. **Update git history** if committed (complex - see git-filter-repo)
7. **Report incident** to team lead or security officer

---

**Last Updated:** October 29, 2025
**Maintained By:** Jouster Development Team

