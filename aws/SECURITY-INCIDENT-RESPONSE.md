# AWS Security Incident Response

## 🚨 CRITICAL: Exposed AWS Credentials

**Status:** Quarantined by AWS  
**Date Detected:** November 3, 2025  
**Exposed Commit:** `6a5a8279ab95c0631e49f07e9ad5e9f45f67d99f`  
**Exposed File:** `aws/credentials`  
**Quarantine Policy:** AWSCompromisedKeyQuarantineV3

---

## IMMEDIATE ACTION REQUIRED

### 1. Clean Git History (DO THIS FIRST)

Run the cleanup script to remove credentials from ALL git history:

**Windows:**
```cmd
cd aws\scripts
cleanup-git-history.bat
```

**Linux/Mac:**
```bash
cd aws/scripts
chmod +x cleanup-git-history.sh
./cleanup-git-history.sh
```

**Manual method (if scripts fail):**
```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove files from history
git filter-repo --path aws/credentials --invert-paths --force
git filter-repo --path .env --invert-paths --force

# Force push
git push origin --force --all
git push origin --force --tags
```

### 2. Create New AWS IAM User

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Create new user: `jouster-github-actions`
3. Attach policies:
   - `AmazonS3FullAccess` (for deployments)
   - `CloudFrontFullAccess` (if using CDN)
4. Create access key (Security credentials tab)
5. **SAVE CREDENTIALS SECURELY** (never commit!)

### 3. Delete Compromised Keys

```bash
# Delete exposed keys
aws iam delete-access-key \
  --user-name mzzz-console-admin \
  --access-key-id AKIA5OSYVDEIZOT5QP4T

aws iam delete-access-key \
  --user-name jouster-dev \
  --access-key-id AKIA5OSYVDEI3YI27VG5
```

### 4. Detach Quarantine Policy

```bash
# Requires admin privileges
aws iam detach-user-policy \
  --user-name mzzz-console-admin \
  --policy-arn arn:aws:iam::aws:policy/AWSCompromisedKeyQuarantineV3
```

### 5. Check for Unauthorized Activity

**CloudTrail Logs:**
1. Go to [CloudTrail Console](https://console.aws.amazon.com/cloudtrail/)
2. Check Event history for last 7 days
3. Filter by exposed user: `mzzz-console-admin`
4. Look for suspicious API calls

**Account Resources:**
```bash
# Check EC2 instances
aws ec2 describe-instances --region us-west-2

# Check Lambda functions
aws lambda list-functions --region us-west-2

# Check S3 buckets (after regaining access)
aws s3 ls
```

**Billing:**
1. Go to [Billing Dashboard](https://console.aws.amazon.com/billing/)
2. Review charges for unexpected usage
3. Check all regions (use region selector)

### 6. Update GitHub Secrets

1. Go to: https://github.com/beffjarker/Jouster/settings/secrets/actions
2. Update/create secrets:
   - `AWS_ACCESS_KEY_ID` = new key from step 2
   - `AWS_SECRET_ACCESS_KEY` = new secret from step 2
   - `AWS_REGION` = `us-west-2`

### 7. Update Local .env

```bash
# Update .env with new credentials (NEVER commit this file)
AWS_ACCESS_KEY_ID=<new-key>
AWS_SECRET_ACCESS_KEY=<new-secret>
AWS_REGION=us-west-2
```

Verify .env is in .gitignore:
```bash
grep -q "^\.env$" .gitignore && echo "✅ .env is gitignored" || echo "❌ Add .env to .gitignore!"
```

### 8. Respond to AWS Support

Reply to the AWS support case or create new one:

**Template:**
```
Subject: Completed Security Steps - Compromised Key AKIA5OSYVDEIZOT5QP4T

Dear AWS Security Team,

I have completed all required security steps:

✅ Step 1: Deleted exposed access key and created replacement
✅ Step 2: Reviewed CloudTrail - no unauthorized activity detected
✅ Step 3: Reviewed account resources - no unwanted resources found
✅ Step 4: Reviewed billing - no unexpected charges
✅ Step 5: Removed credentials from git history using git-filter-repo
✅ Step 6: Force-pushed to remove from GitHub
✅ Step 7: Updated GitHub Secrets and local environment

The credentials have been completely removed from GitHub history.
Verification: https://github.com/beffjarker/Jouster/commits

Please detach the AWSCompromisedKeyQuarantineV3 policy from 
user mzzz-console-admin or advise if further action is required.

Thank you,
[Your Name]
```

---

## Prevention Measures

### Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Prevent committing sensitive files

FORBIDDEN_FILES=(
    "aws/credentials"
    "aws/config"
    ".env"
    ".env.local"
    ".env.production"
)

for file in "${FORBIDDEN_FILES[@]}"; do
    if git diff --cached --name-only | grep -q "^$file$"; then
        echo "❌ ERROR: Attempting to commit sensitive file: $file"
        echo "This file contains secrets and should never be committed!"
        exit 1
    fi
done

# Check for AWS keys in diff
if git diff --cached | grep -E 'AKIA[0-9A-Z]{16}'; then
    echo "❌ ERROR: AWS Access Key detected in commit!"
    echo "Remove the key and use environment variables instead."
    exit 1
fi
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

### Enable MFA

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Select user → Security credentials
3. Assign MFA device
4. Use authenticator app (Google Authenticator, Authy, etc.)

### Use AWS Secrets Manager (Production)

Instead of .env files in production:

```javascript
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

async function getCredentials() {
    const client = new SecretsManagerClient({ region: "us-west-2" });
    const response = await client.send(
        new GetSecretValueCommand({ SecretId: "jouster/prod/aws-credentials" })
    );
    return JSON.parse(response.SecretString);
}
```

---

## Verification Checklist

- [ ] Git history cleaned (credentials removed from ALL commits)
- [ ] Force-pushed to GitHub
- [ ] Verified removal on GitHub website
- [ ] New IAM user created with proper permissions
- [ ] Old access keys deleted
- [ ] Quarantine policy detached
- [ ] CloudTrail reviewed - no unauthorized activity
- [ ] Account resources reviewed - no unwanted resources
- [ ] Billing reviewed - no unexpected charges
- [ ] GitHub Secrets updated
- [ ] Local .env updated
- [ ] Responded to AWS support case
- [ ] Pre-commit hook installed
- [ ] MFA enabled on IAM users
- [ ] Team notified to re-clone repository

---

## Impact on Project

**Preview Deployment:**
- ❌ Currently blocked by quarantined credentials
- ✅ Will work after new credentials created and secrets updated
- ✅ npm install timeout is separate issue (can be worked around)

**Local Development:**
- ❌ Currently blocked by quarantined credentials  
- ✅ Will work after .env updated with new credentials

**CI/CD:**
- ❌ Currently blocked by quarantined credentials
- ✅ Will work after GitHub Secrets updated

---

## Timeline

1. **Immediate (0-2 hours):** Clean git history, create new credentials
2. **Short-term (2-4 hours):** Delete old keys, update secrets, verify no damage
3. **Medium-term (1-2 days):** AWS support response, quarantine removal
4. **Long-term:** Implement Secrets Manager, enable MFA, improve security practices

---

## Contact

**AWS Support Case:** Check your AWS Console → Support Center
**GitHub Security:** security@github.com (if needed)
**Project Owner:** Jeff Barker (beffjarker@gmail.com)

---

## Additional Resources

- [AWS Compromised Credentials Response](https://aws.amazon.com/premiumsupport/knowledge-center/potential-account-compromise/)
- [git-filter-repo Documentation](https://github.com/newren/git-filter-repo)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

