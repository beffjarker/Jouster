# Preview Environments for Pull Requests

This document describes the automated preview environment system for testing pull request changes before merging.

---

## 🎯 Overview

Every pull request automatically gets its own preview environment deployed to AWS S3, allowing you to:

- **Test changes** in a production-like environment
- **Share with stakeholders** for early feedback
- **Verify functionality** before merging
- **Catch issues early** in the development cycle

---

## 🚀 How It Works

### Automatic Deployment

When you open or update a pull request:

1. **GitHub Actions triggers** the `pull-request-deploy-preview.yml` workflow
2. **Application is built** using production configuration
3. **Unique S3 bucket is created** named `jouster-preview-pr{NUMBER}-{BRANCH}`
4. **Files are deployed** to the S3 bucket
5. **Comment is posted** on the PR with the preview URL
6. **Label is added** `preview-deployed` to the PR

### Preview URL Format

```
http://jouster-preview-pr{NUMBER}-{BRANCH-NAME}.s3-website-us-west-2.amazonaws.com
```

**Example:**
```
http://jouster-preview-pr42-fix-email-search.s3-website-us-west-2.amazonaws.com
```

---

## 📋 Finding Your Preview URL

### Option 1: PR Comments (Recommended)

After your PR is created or updated, look for a comment from GitHub Actions:

```
🎉 Preview Environment Deployed!

Your preview environment is ready for testing:

🔗 Preview URL: http://jouster-preview-pr42-fix-email-search.s3-website-us-west-2.amazonaws.com

📦 Bucket: jouster-preview-pr42-fix-email-search
🔢 PR: #42
⏰ Deployed: 2025-10-30T12:34:56.789Z
```

### Option 2: GitHub Actions Tab

1. Go to your PR
2. Click **"Checks"** or **"Actions"** tab
3. Find the **"Deploy PR Preview Environment"** workflow
4. Check the workflow logs for the preview URL

### Option 3: AWS Console

1. Log into AWS Console
2. Go to S3 service
3. Look for bucket named `jouster-preview-pr{NUMBER}-*`
4. Navigate to bucket properties → Static website hosting

---

## 🧪 Testing Your Changes

1. **Click the preview URL** from the PR comment
2. **Verify your changes** work as expected
3. **Test edge cases** and different scenarios
4. **Check browser compatibility** if needed
5. **Report any issues** in PR comments

### What to Test

- ✅ New features work correctly
- ✅ Bug fixes resolve the issue
- ✅ No regressions in existing functionality
- ✅ UI/UX changes look good
- ✅ Performance is acceptable
- ✅ Error handling works properly

---

## 🧹 Cleanup

Preview environments are **automatically deleted** when:

- ✅ The PR is **merged** into main
- ✅ The PR is **closed** without merging
- ✅ Manual cleanup is triggered (see below)

A cleanup comment will be posted on the PR:

```
🧹 Preview Environment Cleaned Up

The preview environment for this PR has been deleted.

📦 Bucket: jouster-preview-pr42-fix-email-search
🔢 PR: #42
⏰ Deleted: 2025-10-30T14:56:12.345Z
```

### Manual Cleanup (if needed)

If automatic cleanup fails, you can manually delete a preview:

```bash
# Using the cleanup script
./aws/scripts/cleanup-preview.sh jouster-preview-pr42-fix-email-search

# Or using AWS CLI directly
aws s3 rm s3://jouster-preview-pr42-fix-email-search --recursive
aws s3api delete-bucket --bucket jouster-preview-pr42-fix-email-search --region us-west-2
```

---

## 🔧 Configuration

### Required GitHub Secrets

The following secrets must be configured in your GitHub repository:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key with S3 permissions |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |

### Required AWS Permissions

The IAM user needs these S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
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
        "s3:PutBucketTagging"
      ],
      "Resource": [
        "arn:aws:s3:::jouster-preview-*",
        "arn:aws:s3:::jouster-preview-*/*"
      ]
    }
  ]
}
```

---

## 📁 Files and Workflows

### GitHub Actions Workflows

- **`.github/workflows/pull-request-deploy-preview.yml`**
  - Deploys preview environment on PR open/update
  - Posts preview URL comment
  - Adds `preview-deployed` label

- **`.github/workflows/pull-request-delete-preview.yml`**
  - Cleans up preview when PR is closed/merged
  - Posts cleanup confirmation comment
  - Removes `preview-deployed` label

### Deployment Scripts

- **`aws/scripts/deploy-preview.sh`**
  - Creates S3 bucket
  - Configures static website hosting
  - Uploads built files
  - Sets appropriate cache headers

- **`aws/scripts/cleanup-preview.sh`**
  - Deletes all objects in bucket
  - Removes the S3 bucket

- **`aws/scripts/manage-previews.sh`**
  - Lists all preview environments
  - Shows detailed information
  - Bulk cleanup operations

---

## 🛠️ Troubleshooting

### Preview URL Not Posted

**Problem:** No comment appears on your PR with the preview URL.

**Solutions:**
1. Check the GitHub Actions tab for errors
2. Verify AWS credentials are configured in GitHub Secrets
3. Ensure the workflow file exists and is not disabled
4. Check repository permissions for GitHub Actions

### Preview Shows Old Version

**Problem:** Preview doesn't reflect latest changes.

**Solutions:**
1. Wait 1-2 minutes for changes to propagate
2. Hard refresh browser (Ctrl+F5 / Cmd+Shift+R)
3. Check if workflow completed successfully
4. Clear browser cache

### Deployment Failed

**Problem:** GitHub Actions workflow fails.

**Solutions:**
1. Check workflow logs for specific error
2. Verify AWS permissions are correct
3. Ensure build command succeeds (`npm run build:prod`)
4. Check for AWS service outages

### Preview Not Accessible

**Problem:** Preview URL returns 403 or 404 error.

**Solutions:**
1. Verify bucket policy allows public read access
2. Check that `index.html` exists in bucket
3. Ensure static website hosting is enabled
4. Verify bucket name is correct

---

## 📊 Cost Management

Preview environments are designed to be cost-effective:

- **S3 Storage:** ~$0.023 per GB/month
- **Data Transfer:** First 1GB free, then ~$0.09 per GB
- **Requests:** ~$0.0004 per 1,000 GET requests

**Typical costs per preview:** < $0.10/month

**Cost optimization:**
- Old previews auto-delete after 7 days
- Previews are removed when PRs close
- Only PR changes are deployed (not entire project history)

---

## 🔒 Security

### Public Access

Preview environments are **publicly accessible** by default:
- Anyone with the URL can access
- No authentication required
- Suitable for public projects or stakeholder review

### Private Previews (Future Enhancement)

To restrict access:
1. Use CloudFront with signed URLs
2. Implement basic auth in application
3. Use VPN or IP allowlisting

---

## 🚦 Best Practices

### For Developers

1. ✅ **Test thoroughly** before requesting review
2. ✅ **Share preview URL** with stakeholders early
3. ✅ **Document test scenarios** in PR description
4. ✅ **Clean up manually** if automatic cleanup fails
5. ✅ **Verify preview** reflects your changes

### For Reviewers

1. ✅ **Use preview environment** to test functionality
2. ✅ **Test on multiple browsers** if UI changes
3. ✅ **Verify edge cases** and error handling
4. ✅ **Report issues** in PR comments
5. ✅ **Confirm preview URL** works before approving

---

## 📈 Monitoring Previews

### List All Active Previews

```bash
./aws/scripts/manage-previews.sh list
```

Output:
```
========================================
PREVIEW ENVIRONMENTS
========================================
📦 Bucket: jouster-preview-pr42-fix-email-search
   Tags: PR=42 Branch=fix-email-search
   Created: 2025-10-30

📦 Bucket: jouster-preview-pr43-add-dashboard
   Tags: PR=43 Branch=add-dashboard
   Created: 2025-10-30
```

### Get Preview Details

```bash
./aws/scripts/manage-previews.sh info jouster-preview-pr42-fix-email-search
```

### Cleanup Old Previews

```bash
# Remove previews older than 7 days
./aws/scripts/manage-previews.sh cleanup-old 7

# Remove all previews (use with caution!)
./aws/scripts/manage-previews.sh cleanup-all
```

---

## 🆘 Support

If you encounter issues with preview environments:

1. **Check this documentation** for troubleshooting steps
2. **Review GitHub Actions logs** for errors
3. **Verify AWS console** for bucket status
4. **Ask in PR comments** for team assistance
5. **Check AWS service status** for outages

---

**Last Updated:** October 30, 2025  
**Status:** ✅ Active and ready to use

