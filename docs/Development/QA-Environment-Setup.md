# QA Environment Setup

## Overview

The QA environment uses a **Blue/Green deployment strategy** to ensure zero-downtime deployments and quick rollback capabilities. Deployments are automatically triggered when code is merged into the `develop` branch.

## Architecture

### Blue/Green Deployment

- **Two identical environments**: Blue and Green
- **Active/Inactive pattern**: One environment serves traffic while the other is updated
- **CloudFront distribution**: Routes traffic to the active environment
- **Quick rollback**: Switch back to previous environment if issues are detected

### AWS Resources

- **S3 Buckets**:
  - `jouster-qa-blue`: Blue environment bucket
  - `jouster-qa-green`: Green environment bucket
- **CloudFront Distribution**: Single distribution that switches between blue/green origins
- **IAM Role**: `GitHubActionsPreviewRole` with necessary permissions

## Deployment Process

### 1. Automatic Trigger
Deployment is triggered automatically when:
- A PR is merged into the `develop` branch
- A direct push is made to the `develop` branch

### 2. Deployment Steps

1. **Determine Active Slot**: Check CloudFront to see which slot (blue/green) is currently active
2. **Deploy to Inactive Slot**: Build and deploy the new version to the inactive slot
3. **Smoke Tests**: Run automated tests against the newly deployed inactive slot
4. **Switch Traffic**: Update CloudFront to route traffic to the newly deployed slot
5. **Invalidate Cache**: Clear CloudFront cache to serve new content immediately
6. **Health Checks**: Verify the new deployment is healthy

### 3. Rollback Process

If deployment fails at any step:
- **Automatic**: The CloudFront distribution remains pointed at the old (working) slot
- **Manual**: If issues are discovered post-deployment, update CloudFront to point back to the previous slot

## Required Secrets

The following GitHub secrets must be configured:

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `AWS_ROLE_ARN` | ARN of the GitHub Actions IAM role | `arn:aws:iam::924677642513:role/GitHubActionsPreviewRole` |
| `QA_CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID for QA | `E1234567890ABC` |

## AWS IAM Permissions Required

The `GitHubActionsPreviewRole` needs the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:PutBucketWebsite",
        "s3:PutBucketPolicy",
        "s3:PutPublicAccessBlock"
      ],
      "Resource": [
        "arn:aws:s3:::jouster-qa-blue",
        "arn:aws:s3:::jouster-qa-blue/*",
        "arn:aws:s3:::jouster-qa-green",
        "arn:aws:s3:::jouster-qa-green/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:GetDistribution",
        "cloudfront:GetDistributionConfig",
        "cloudfront:UpdateDistribution",
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "arn:aws:cloudfront::924677642513:distribution/*"
    }
  ]
}
```

## Setting Up CloudFront Distribution

### Initial Setup

1. **Create CloudFront Distribution** (if not exists):
   ```bash
   aws cloudfront create-distribution \
     --origin-domain-name jouster-qa-blue.s3-website-us-west-2.amazonaws.com \
     --default-root-object index.html
   ```

2. **Note the Distribution ID** and add it to GitHub secrets as `QA_CLOUDFRONT_DISTRIBUTION_ID`

3. **Configure Custom Error Pages**:
   - 404 errors → `/index.html` (for Angular routing)
   - 403 errors → `/index.html` (for Angular routing)

### CloudFront Configuration

```json
{
  "Origins": {
    "Items": [
      {
        "Id": "blue",
        "DomainName": "jouster-qa-blue.s3-website-us-west-2.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "OriginProtocolPolicy": "http-only"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "blue",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
    "CachedMethods": ["GET", "HEAD"],
    "Compress": true
  }
}
```

## Monitoring and Verification

### Deployment Status

Monitor deployment progress in GitHub Actions:
- Go to: `https://github.com/[org]/Jouster/actions`
- Select the "Deploy QA Environment" workflow
- View real-time logs and status

### Manual Verification

1. **Check which slot is active**:
   ```bash
   aws cloudfront get-distribution-config \
     --id $QA_CLOUDFRONT_DISTRIBUTION_ID \
     --query 'DistributionConfig.Origins.Items[0].Id' \
     --output text
   ```

2. **Access QA environment**:
   ```bash
   aws cloudfront get-distribution \
     --id $QA_CLOUDFRONT_DISTRIBUTION_ID \
     --query 'Distribution.DomainName' \
     --output text
   ```

3. **Check both slots directly**:
   - Blue: `http://jouster-qa-blue.s3-website-us-west-2.amazonaws.com`
   - Green: `http://jouster-qa-green.s3-website-us-west-2.amazonaws.com`

## Smoke Tests

The workflow automatically runs the following smoke tests:

1. **HTTP Status Check**: Ensures the site returns HTTP 200
2. **HTML Content Check**: Verifies valid HTML is returned
3. **Angular App Check**: Confirms Angular application is loaded

## Manual Rollback

If you need to manually rollback to the previous version:

1. **Identify the previous slot**:
   ```bash
   # If current is "blue", previous is "green" and vice versa
   CURRENT_SLOT=$(aws cloudfront get-distribution-config \
     --id $QA_CLOUDFRONT_DISTRIBUTION_ID \
     --query 'DistributionConfig.Origins.Items[0].Id' \
     --output text)
   
   if [ "$CURRENT_SLOT" = "blue" ]; then
     ROLLBACK_SLOT="green"
   else
     ROLLBACK_SLOT="blue"
   fi
   ```

2. **Update CloudFront** to point to the previous slot (use AWS Console or CLI)

3. **Create invalidation**:
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id $QA_CLOUDFRONT_DISTRIBUTION_ID \
     --paths "/*"
   ```

## Troubleshooting

### Deployment Fails at Smoke Test

- **Cause**: New deployment has issues
- **Result**: CloudFront still points to old (working) slot
- **Action**: Fix issues and re-deploy

### Health Check Fails After Deployment

- **Cause**: CloudFront cache not yet propagated
- **Action**: Wait 1-2 minutes and check again
- **Rollback**: Update CloudFront to point back to previous slot

### Both Slots Show Issues

- **Emergency Action**: 
  1. Deploy a known-good version to one slot
  2. Point CloudFront to that slot
  3. Investigate root cause

## Best Practices

1. **Always test in Preview Environment first**: PRs should be tested in preview before merging to develop
2. **Monitor initial deployment**: Watch the first few minutes after deployment for errors
3. **Keep rollback window open**: Don't deploy to the old slot immediately - keep it as a quick rollback option
4. **Regular health checks**: Set up CloudWatch alarms for QA environment
5. **Document issues**: If rollback is needed, document why in the PR or issue

## Next Steps

After QA is stable:
- Set up **Staging environment** (similar blue/green, triggered by merging to `staging` branch)
- Set up **Production environment** (similar blue/green, triggered by releases/tags)
- Add more comprehensive smoke tests
- Set up automated E2E tests in QA
- Configure CloudWatch monitoring and alarms

