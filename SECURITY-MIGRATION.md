# 🔒 Security Migration Guide

## ⚠️ URGENT: Credentials Have Been Exposed

The following files contained sensitive credentials and were tracked in git:
- `aws/credentials` - **EXPOSED AWS ACCESS KEYS**
- `.env` - Contains API keys (not committed, but exists locally)

## 🚨 Immediate Actions Required

### 1. Rotate ALL Exposed AWS Credentials

**The following AWS credentials MUST be rotated immediately:**

From `aws/credentials`:
- **Two AWS Access Keys were exposed** (jouster-dev and admin users)
- Keys started with `AKIA5OSYVDEI...` 

**Steps to rotate:**
1. Go to AWS IAM Console: https://console.aws.amazon.com/iam/
2. Navigate to Users → [username] → Security credentials
3. **Deactivate** all access keys for jouster-dev and admin users
4. **Create new access keys**
5. Update your local `.env` and `aws/credentials` files with new keys
6. **Delete** the old access keys from AWS

### 2. Review Last.fm API Keys

Last.fm API credentials were found in `.env` file.

**Action:** Rotate Last.fm API keys if they are production keys:
1. Go to https://www.last.fm/api/accounts
2. Regenerate your API key and shared secret
3. Update your local `.env` file

### 3. Clean Up Local Files

Your local credential files are preserved but should be updated:

```bash
# Your actual credentials are still in these LOCAL files:
# - H:\projects\Jouster\.env
# - H:\projects\Jouster\aws\credentials

# After rotating credentials in AWS/Last.fm, update these files with new values
```

## ✅ Security Improvements Applied

### Files Updated:
1. **`.gitignore`** - Added:
   - `aws/credentials`
   - `aws/config`

2. **`aws/credentials.example`** - Template created for team members

3. **`aws/config.example`** - Template created for AWS CLI config

4. **`.env.example`** - Updated with all required fields

5. **`SECURITY.md`** - Comprehensive security guidelines

6. **Git tracking removed** from `aws/credentials`

## 📋 Next Steps for Your Team

### Before Committing:
1. ✅ Rotate AWS credentials (see above)
2. ✅ Verify `.env` and `aws/credentials` are NOT in git tracking
3. ✅ Review all changes before committing
4. ✅ Ensure no other secrets in code

### After Rotating Credentials:
1. Update your local `.env` file with new credentials
2. Update your local `aws/credentials` file with new AWS keys
3. Test that applications still work with new credentials
4. Notify team members to set up their own credentials using `.env.example`

### To Commit These Security Changes:
```bash
# Review what will be committed
git status

# Stage the security improvements
git add .gitignore .env.example aws/*.example SECURITY.md SECURITY-MIGRATION.md

# Commit with clear message
git commit -m "security: add credential protection and remove exposed AWS keys

- Add aws/credentials and aws/config to .gitignore
- Remove aws/credentials from git tracking
- Create template files for credentials
- Add comprehensive security documentation
- Update .env.example with all required fields

BREAKING: AWS credentials have been rotated due to exposure"

# Push to develop branch
git push origin develop
```

## 🔍 Verify Security

Run these commands to verify nothing sensitive is being committed:

```bash
# Check what files are staged
git diff --cached --name-only

# Verify credentials file is not tracked
git ls-files | grep credentials

# Check for any secrets in staged files
git diff --cached | grep -i "secret\|password\|api_key"
```

## 📚 Team Onboarding

New developers should:
1. Read `SECURITY.md` for guidelines
2. Copy `.env.example` to `.env` and fill in their credentials
3. Copy `aws/credentials.example` to `aws/credentials` and add their IAM keys
4. Request AWS IAM user access from team lead
5. Never commit credential files

## 🛠️ Recommended Tools

Install git-secrets to prevent future accidents:
```bash
npm install -g git-secrets
cd H:\projects\Jouster
git secrets --install
git secrets --register-aws
```

## ⚠️ Important Notes

- **The exposed credentials are in git history** - They need to be rotated even after removing from tracking
- **`.env` files were not committed** - Good! But still verify they're in `.gitignore`
- **Always review before committing** - Use `git status` and `git diff` before every commit
- **Production credentials** - Should use AWS Secrets Manager or Parameter Store in production

## 📞 Questions?

If you're unsure about any step:
1. Do NOT commit until credentials are rotated
2. Reach out to team lead for AWS access
3. Review `SECURITY.md` for detailed guidelines
