# Updating AWS IAM Policy for Preview Deployments

## Problem
The GitHub Actions preview deployment workflow was failing with permission errors:
- `s3:PutBucketPublicAccessBlock` - permission denied
- `s3:PutBucketPolicy` - blocked by public access settings

## Solution
Updated the `GitHubActionsPreviewRole` IAM policy to include the necessary S3 public access block permissions.

## How to Apply the Fix

### Option 1: Using the Update Script (Recommended)

**Windows:**
```bash
cd H:\projects\Jouster
aws\scripts\update-preview-policy.bat
```

**Linux/Mac:**
```bash
cd /path/to/Jouster
chmod +x aws/scripts/update-preview-policy.sh
./aws/scripts/update-preview-policy.sh
```

### Option 2: Manual Update via AWS Console

1. Go to AWS IAM Console
2. Navigate to Roles → `GitHubActionsPreviewRole`
3. Click on the attached policy (should contain "Preview" in the name)
4. Click "Edit policy"
5. Replace the JSON with the contents of `aws/policies/github-actions-preview-policy.json`
6. Click "Review policy" then "Save changes"

### Option 3: Using AWS CLI Directly

```bash
# Find the policy ARN
POLICY_ARN=$(aws iam list-attached-role-policies \
    --role-name GitHubActionsPreviewRole \
    --query "AttachedPolicies[?contains(PolicyName, 'Preview')].PolicyArn" \
    --output text)

# Update the policy
aws iam create-policy-version \
    --policy-arn "$POLICY_ARN" \
    --policy-document file://aws/policies/github-actions-preview-policy.json \
    --set-as-default
```

## What Changed

Added the following S3 permissions to allow managing public access blocks on preview buckets:
- `s3:DeletePublicAccessBlock`
- `s3:PutBucketPublicAccessBlock`
- `s3:GetBucketPublicAccessBlock`
- `s3:DeleteBucketPublicAccessBlock`

These permissions are required to:
1. Remove the default public access blocks when creating preview buckets
2. Set bucket policies that allow public read access for static website hosting
3. Clean up the buckets when PRs are closed

## Verification

After applying the update, the next GitHub Actions preview deployment should succeed. You can verify by:
1. Pushing a commit to a PR targeting the `develop` branch
2. Checking the GitHub Actions workflow runs
3. The "Create S3 bucket for preview" step should complete without permission errors

## Security Note

The policy is scoped to only affect buckets matching these patterns:
- `jouster-preview-pr-*` (preview environments)
- Other jouster-related buckets for QA/staging

This ensures the role cannot modify public access settings on arbitrary S3 buckets.

