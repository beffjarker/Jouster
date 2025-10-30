# GitHub Repository Setup for Jouster

This guide walks you through setting up the GitHub repository and enabling preview environments.

---

## 📋 Prerequisites

- GitHub account
- AWS account with S3 access
- Local Jouster repository (already exists)

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. **Repository name:** `Jouster`
3. **Description:** "AI-powered email assistant with conversation management"
4. **Visibility:** Choose Public or Private
5. Click **"Create repository"**

### Step 2: Add Remote and Push

```bash
# Add GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/Jouster.git

# Push existing code
git branch -M main
git push -u origin main
```

### Step 3: Configure AWS Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add these secrets:

| Secret Name | Value |
|------------|-------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key |

**How to get AWS credentials:**
```bash
# View your AWS credentials
cat ~/.aws/credentials

# Or create new IAM user specifically for GitHub Actions
aws iam create-user --user-name github-actions-jouster
aws iam create-access-key --user-name github-actions-jouster
```

### Step 4: Test Preview Environment

1. Create a new branch:
   ```bash
   git checkout -b test/preview-setup
   ```

2. Make a small change (e.g., update README)

3. Push the branch:
   ```bash
   git push origin test/preview-setup
   ```

4. Create a Pull Request on GitHub

5. Wait ~2-3 minutes for the preview workflow to run

6. Look for a comment on your PR with the preview URL! 🎉

---

## 🔒 AWS IAM Policy Setup

Create an IAM user with these permissions for GitHub Actions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3PreviewEnvironments",
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:DeleteBucket",
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:PutBucketWebsite",
        "s3:PutBucketPolicy",
        "s3:PutPublicAccessBlock",
        "s3:GetBucketTagging",
        "s3:PutBucketTagging",
        "s3:GetBucketLocation",
        "s3:ListAllMyBuckets"
      ],
      "Resource": [
        "arn:aws:s3:::jouster-preview-*",
        "arn:aws:s3:::jouster-preview-*/*",
        "arn:aws:s3:::qa.jouster.org",
        "arn:aws:s3:::qa.jouster.org/*",
        "arn:aws:s3:::stg.jouster.org",
        "arn:aws:s3:::stg.jouster.org/*",
        "arn:aws:s3:::jouster.org",
        "arn:aws:s3:::jouster.org/*"
      ]
    }
  ]
}
```

**Create the IAM user and policy:**

```bash
# Create IAM user
aws iam create-user --user-name github-actions-jouster

# Create policy
aws iam put-user-policy \
  --user-name github-actions-jouster \
  --policy-name S3DeploymentPolicy \
  --policy-document file://aws/policies/github-actions-s3-policy.json

# Create access key
aws iam create-access-key --user-name github-actions-jouster
```

Save the `AccessKeyId` and `SecretAccessKey` from the output!

---

## ✅ Verification Checklist

After setup, verify these work:

- [ ] Repository exists on GitHub
- [ ] Local repo connected to remote (`git remote -v`)
- [ ] AWS secrets configured in GitHub
- [ ] Test PR created successfully
- [ ] Preview workflow runs without errors
- [ ] Preview URL posted as PR comment
- [ ] Preview URL is accessible
- [ ] `preview-deployed` label added to PR
- [ ] Cleanup workflow runs when PR closes

---

## 🎯 What You Get

Once setup is complete, every PR will automatically have:

✅ **Unique preview URL** posted as a comment  
✅ **Automatic deployment** on every push  
✅ **Automatic cleanup** when PR closes  
✅ **Production-like environment** for testing  
✅ **Easy sharing** with stakeholders  

---

## 📝 Example PR Comment

After setup, you'll see comments like this on your PRs:

```markdown
## 🎉 Preview Environment Deployed!

Your preview environment is ready for testing:

🔗 **Preview URL:** http://jouster-preview-pr42-fix-email-search.s3-website-us-west-2.amazonaws.com

📦 **Bucket:** jouster-preview-pr42-fix-email-search
🔢 **PR:** #42
⏰ **Deployed:** 2025-10-30T12:34:56.789Z

---

### 🧪 Testing Instructions

1. Click the preview URL above to test your changes
2. Verify all functionality works as expected
3. Test on different browsers if needed
4. Report any issues in PR comments

### 🧹 Cleanup

This preview environment will be automatically deleted when:
- The PR is merged
- The PR is closed
- The preview is older than 7 days
```

---

## 🛠️ Troubleshooting

### "No such file or directory" errors

**Problem:** Workflow can't find deployment scripts.

**Solution:** Make scripts executable:
```bash
chmod +x aws/scripts/*.sh
git add aws/scripts/*.sh
git commit -m "fix: make deployment scripts executable"
git push
```

### AWS credentials invalid

**Problem:** Workflow fails with authentication errors.

**Solutions:**
1. Verify secrets are set correctly in GitHub
2. Check AWS credentials haven't expired
3. Verify IAM user has correct permissions
4. Try recreating access key

### Build fails

**Problem:** `npm run build:prod` fails in workflow.

**Solutions:**
1. Test build locally: `npm run build:prod`
2. Check for TypeScript errors: `npm run lint`
3. Verify all dependencies installed: `npm install`
4. Check Node version matches (20.x)

---

## 📚 Next Steps

After setup:

1. Read [Preview Environments Documentation](./preview-environments.md)
2. Create your first feature branch and PR
3. Test the preview environment
4. Share preview URLs with team/stakeholders
5. Enjoy automated deployments! 🎉

---

## 🆘 Need Help?

- **Documentation:** See `docs/aws/preview-environments.md`
- **GitHub Actions:** Check the Actions tab in your repo
- **AWS Console:** Verify S3 buckets in us-west-2 region
- **Logs:** Review workflow logs for detailed errors

---

**Ready to set up?** Follow the steps above and you'll have preview environments running in minutes! 🚀

