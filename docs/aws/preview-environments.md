# Preview Environment CI/CD System

This document describes the automated preview environment system for feature branch testing.

## 🎯 Overview

When you create or update a pull request against `develop` or `main`, the system automatically:

1. **Deploys** your feature branch to a unique AWS environment
2. **Comments** on the PR with access URLs and details
3. **Cleans up** the environment when the PR is closed/merged

## 🚀 How It Works

### Automatic Deployment Trigger
- **When**: PR opened, updated, or synchronized
- **Target Branches**: PRs against `develop` or `main`
- **Environment Name**: `pr{number}-{clean-branch-name}.jouster.org`

### Example Flow
1. Create PR from `feature/user-profile-updates` → `develop`
2. GitHub Actions automatically:
   - Builds the application
   - Creates S3 bucket: `pr123-user-profile-updates.jouster.org`
   - Deploys code to AWS
   - Comments on PR with URLs

### Access URLs
Each preview environment provides two URLs:

1. **Direct S3 URL** (immediate access): 
   ```
   http://pr123-user-profile-updates.jouster.org.s3-website-us-west-2.amazonaws.com
   ```

2. **Custom Domain** (requires DNS setup):
   ```
   https://pr123-user-profile-updates.jouster.org
   ```

## 🔧 Technical Details

### AWS Resources Created
- **S3 Bucket**: Static website hosting enabled
- **Public Access**: Configured for web access
- **Cache Headers**: Optimized for static assets
- **Tags**: Environment tracking and auto-cleanup

### GitHub Actions Workflows
- **`.github/workflows/preview-deploy.yml`**: Main preview deployment
- **`.github/workflows/ci.yml`**: Enhanced CI with dependency validation

### Deployment Scripts
- **`aws/scripts/deploy-preview.sh`**: Creates and deploys preview environment
- **`aws/scripts/cleanup-preview.sh`**: Removes preview environment
- **`aws/scripts/manage-previews.sh`**: Management and monitoring tools

## 📋 PR Comment Features

When deployed, you'll see a comprehensive comment with:

- ✅ **Preview URLs** (both direct S3 and custom domain)
- 📊 **Environment Details** (PR number, branch, commit SHA)
- 🔧 **AWS Resources** (region, bucket name, configuration)
- 🧪 **Testing Instructions** and guidelines

## 🛠️ Management Commands

Use the management script for advanced operations:

```bash
# List all preview environments
./aws/scripts/manage-previews.sh list

# Clean up environments older than 7 days
./aws/scripts/manage-previews.sh cleanup-old 7

# Get detailed info about specific environment
./aws/scripts/manage-previews.sh info pr123-feature-branch.jouster.org

# Remove all preview environments (use with caution)
./aws/scripts/manage-previews.sh cleanup-all
```

## 🔒 Security & Access

### AWS Permissions Required
- **S3**: Create/delete buckets, manage objects, set policies
- **Route53**: DNS management (for custom domains)
- **CloudFormation**: Stack management (future enhancement)

### Environment Isolation
- Each PR gets a completely isolated environment
- No shared resources between previews
- Automatic cleanup prevents resource accumulation

## 🎯 Best Practices

### For Developers
1. **Test thoroughly** in preview environment before requesting review
2. **Share preview URL** with stakeholders for feedback
3. **Check both URLs** - S3 direct URL is always immediately available

### For Reviewers
1. **Use preview environment** to test functionality
2. **Verify responsive design** across devices
3. **Test edge cases** in isolated environment

### For DevOps
1. **Monitor costs** with the management script
2. **Clean up old environments** regularly
3. **Review access logs** for security

## 🔄 Integration with Main Environments

### Environment Hierarchy
```
Production (prod.jouster.org)
    ↑
Staging (stg.jouster.org) 
    ↑
QA (qa.jouster.org)
    ↑
Preview (pr{N}-{branch}.jouster.org)
```

### Promotion Flow
1. **Feature Branch** → Preview Environment (automatic)
2. **Merge to Develop** → QA Environment (automatic)
3. **Merge to Main** → Staging Environment (automatic)
4. **Manual Deploy** → Production Environment

## 🚨 Troubleshooting

### Common Issues

1. **Build Failure**
   - Check GitHub Actions logs
   - Verify dependencies are properly installed
   - Ensure build command succeeds locally

2. **Deployment Failure**
   - Check AWS credentials and permissions
   - Verify S3 bucket naming constraints
   - Check regional availability

3. **Access Issues**
   - Use direct S3 URL first (always works)
   - Custom domain requires DNS configuration
   - Check bucket policy for public access

### Getting Help

1. Check GitHub Actions logs for detailed error messages
2. Use management script to inspect environment state
3. Review AWS CloudTrail for permission issues

## 📈 Monitoring & Analytics

### Tracking
- All preview environments are tagged for cost tracking
- Automatic cleanup prevents runaway costs
- Usage metrics available in AWS Console

### Cost Optimization
- Static assets cached with long TTL
- HTML files cached with short TTL
- Automatic cleanup after PR closure
- Management script for bulk operations

---

*For questions or issues, please create an issue in the repository or contact the DevOps team.*
