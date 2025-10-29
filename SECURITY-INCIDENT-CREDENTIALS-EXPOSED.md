# 🚨 SECURITY INCIDENT: AWS Credentials Exposed in Git History

**Date Discovered:** October 29, 2025  
**Severity:** CRITICAL  
**Status:** MITIGATION IN PROGRESS

---

## 🔴 INCIDENT SUMMARY

AWS credentials were committed to the git repository and pushed to GitHub, exposing sensitive access keys in the public repository history.

### Exposed Credentials

**File:** `aws/credentials`  
**First Commit:** `6a5a827` - feat: add GitHub Actions preview deployment workflow and AWS IAM setup  
**Pushed to Remote:** Yes (GitHub)  
**Public Repository:** Yes

**Exposed Keys:**
1. **Default/jouster-dev profile:**
   - Access Key ID: `AKIA5OSYVDEI3YI27VG5`
   - Secret Access Key: `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`

2. **Admin profile:**
   - Access Key ID: `AKIA5OSYVDEIZOT5QP4T`
   - Secret Access Key: `NHQOvtMg1h0xAB2uHQL4db56c7/o+c2MupGzbsWg`

---

## ⚠️ IMPACT ASSESSMENT

### Potential Risks
- ✅ **Unauthorized AWS Access** - Anyone with these keys can access your AWS resources
- ✅ **Data Breach** - Potential access to S3 buckets, databases, etc.
- ✅ **Resource Abuse** - Could be used to spin up expensive EC2 instances, mining operations
- ✅ **Account Takeover** - Admin credentials provide full IAM access
- ✅ **Cost Impact** - Potential for significant AWS charges

### Exposure Window
- **Start:** When first pushed to GitHub (commit `6a5a827`)
- **End:** When credentials are rotated (PENDING)
- **Duration:** Unknown - possibly weeks/months

---

## ✅ IMMEDIATE ACTIONS TAKEN

1. **Removed from Git Tracking** ✅
   - Commit: `57231bc` - security: remove aws/credentials from git tracking
   - File removed from index but preserved locally
   - `.gitignore` already includes `aws/credentials`

2. **Documented Incident** ✅
   - This document created
   - Incident logged

---

## 🔥 CRITICAL ACTIONS REQUIRED (IMMEDIATE)

### 1. Rotate AWS Credentials - PRIORITY 1
```bash
# Login to AWS Console
# Navigate to IAM → Users

# For user with access key: AKIA5OSYVDEI3YI27VG5
1. Go to IAM → Users → [dev user]
2. Security credentials tab
3. Access keys → Deactivate → Delete
4. Create new access key
5. Update local aws/credentials file
6. Update any .env files using these keys

# For user with access key: AKIA5OSYVDEIZOT5QP4T
1. Go to IAM → Users → [admin user]
2. Security credentials tab
3. Access keys → Deactivate → Delete
4. Create new access key
5. Update local aws/credentials file
6. Update any .env files using these keys
```

### 2. Check for Unauthorized AWS Activity
```bash
# Check CloudTrail logs for suspicious activity
# Look for:
- Unusual API calls
- Resource creation from unknown IPs
- Failed authentication attempts
- IAM changes
- S3 bucket access

# AWS Console → CloudTrail → Event history
# Filter by:
- User name
- Access key ID
- Date range (since first commit)
```

### 3. Review AWS Billing
```bash
# Check for unexpected charges
# AWS Console → Billing Dashboard
# Look for:
- Unexpected EC2 instances
- High data transfer costs
- Services you didn't enable
```

### 4. Clean Git History (Advanced)
```bash
# Option 1: BFG Repo-Cleaner (Recommended)
# Download: https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-files credentials --no-blob-protection
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Option 2: git-filter-repo
# Install: pip install git-filter-repo
git filter-repo --path aws/credentials --invert-paths

# ⚠️ WARNING: This rewrites history - coordinate with team!
# ⚠️ All collaborators must re-clone the repository
```

### 5. Force Push to GitHub (After history cleanup)
```bash
git push origin --force --all
git push origin --force --tags
```

---

## 📋 SECONDARY ACTIONS

### 1. Enable AWS Security Features
- [ ] Enable AWS GuardDuty (threat detection)
- [ ] Set up CloudTrail (audit logging)
- [ ] Enable AWS Config (resource tracking)
- [ ] Set up billing alerts
- [ ] Enable MFA on all IAM users
- [ ] Review IAM policies (principle of least privilege)

### 2. Update Security Practices
- [ ] Add pre-commit hooks to prevent credential commits
- [ ] Use AWS Secrets Manager or Parameter Store for secrets
- [ ] Implement credential scanning in CI/CD
- [ ] Train team on security best practices
- [ ] Document credential rotation procedures

### 3. Verify .gitignore
```bash
# Ensure these patterns are in .gitignore:
.env
.env.*
aws/credentials
aws/config
.aws/
*.pem
*.key
secrets/
```

### 4. Add Pre-commit Hook
Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
if git diff --cached --name-only | grep -E "(credentials|\.env$|\.pem$|\.key$)"; then
    echo "🚨 ERROR: Attempting to commit sensitive files!"
    echo "Files blocked: $(git diff --cached --name-only | grep -E '(credentials|\.env$|\.pem$|\.key$)')"
    exit 1
fi
```

---

## 📝 VERIFICATION CHECKLIST

After rotating credentials:

- [ ] Old keys deactivated in AWS IAM
- [ ] Old keys deleted from AWS IAM
- [ ] New keys generated
- [ ] Local `aws/credentials` updated with new keys
- [ ] All `.env` files updated with new keys
- [ ] Application tested with new credentials
- [ ] No unauthorized AWS activity detected
- [ ] No unexpected AWS charges
- [ ] Git history cleaned (optional but recommended)
- [ ] Force pushed to GitHub (if history cleaned)
- [ ] Team notified to re-clone (if history cleaned)
- [ ] Pre-commit hooks installed
- [ ] Security monitoring enabled

---

## 🔍 HOW TO VERIFY CREDENTIALS ARE ROTATED

```bash
# 1. Try using old credentials (should fail)
AWS_ACCESS_KEY_ID=AKIA5OSYVDEI3YI27VG5 \
AWS_SECRET_ACCESS_KEY=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 \
aws sts get-caller-identity
# Expected: Error - InvalidClientTokenId

# 2. Try using new credentials (should work)
aws sts get-caller-identity --profile jouster-dev
# Expected: Shows your account ID and user ARN

# 3. Verify in AWS Console
# IAM → Users → [user] → Security credentials
# Old access keys should show as "Deleted" or not exist
```

---

## 📚 RESOURCES

- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS Security Hub](https://aws.amazon.com/security-hub/)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [git-filter-repo](https://github.com/newren/git-filter-repo)

---

## 🎓 LESSONS LEARNED

1. **Never commit credentials** - Use .gitignore BEFORE first commit
2. **Pre-commit hooks** - Automate prevention of sensitive file commits
3. **Regular audits** - Scan for exposed secrets regularly
4. **Secret management** - Use AWS Secrets Manager or environment variables
5. **MFA everywhere** - Enable multi-factor authentication on all accounts
6. **Principle of least privilege** - Only grant necessary permissions

---

## 📞 SUPPORT

If you need help:
- AWS Support: https://console.aws.amazon.com/support/
- GitHub Support: https://support.github.com/
- Security incident response: Consult security team

---

**Last Updated:** October 29, 2025  
**Document Owner:** Development Team  
**Next Review:** After credential rotation complete

