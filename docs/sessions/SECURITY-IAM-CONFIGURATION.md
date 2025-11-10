# Security & IAM Configuration

## Overview
This document describes the security configuration for GitHub Actions workflows using AWS OIDC authentication.

## AWS IAM Setup

### Account Information
- **AWS Account ID**: 924677642513
- **Region**: us-west-2

### IAM Role
- **Role Name**: GitHubActionsPreviewRole
- **ARN**: `arn:aws:iam::924677642513:role/GitHubActionsPreviewRole`
- **Authentication Method**: OIDC (OpenID Connect)
- **OIDC Provider**: token.actions.githubusercontent.com

### Trust Policy
The role trusts GitHub Actions from the repository `beffjarker/Jouster` using OIDC federation:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::924677642513:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:beffjarker/Jouster:*"
        }
      }
    }
  ]
}
```

### Attached Policies
- **GitHubActionsPreviewPolicy** (`arn:aws:iam::924677642513:policy/GitHubActionsPreviewPolicy`)

## Permissions

### S3 Bucket Management
The role has permissions to manage the following S3 buckets:
- `jouster-preview-pr-*` (Preview environments)
- `jouster-blue-static` (Blue/Green deployment)
- `jouster-green-static` (Blue/Green deployment)
- `pr*-*.jouster.org` (PR-specific domains)
- `qa.jouster.org` (QA environment)
- `stg.jouster.org` (Staging environment)
- `staging.jouster.org` (Staging environment alias)

### S3 Actions Allowed
**Bucket-level:**
- CreateBucket, DeleteBucket, ListBucket
- GetBucketLocation, GetBucketWebsite, PutBucketWebsite
- PutBucketPolicy, GetBucketPolicy, DeleteBucketPolicy
- Public access block management
- Bucket tagging and versioning

**Object-level:**
- PutObject, GetObject, DeleteObject
- ACL management (PutObjectAcl, GetObjectAcl)
- Multipart upload operations
- Object versioning

**Global:**
- ListAllMyBuckets, HeadBucket

### Route53 DNS Management
Permissions to manage DNS records for:
- `*.jouster.org`
- `jouster.org`

Actions allowed:
- ListHostedZones, GetHostedZone
- ListResourceRecordSets
- ChangeResourceRecordSets
- GetChange

### CloudFormation (if needed)
The role has CloudFormation stack management permissions for infrastructure automation.

## GitHub Actions Workflows

### Workflow Authentication
All workflows use OIDC authentication instead of AWS access keys:

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - name: Configure AWS credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::924677642513:role/GitHubActionsPreviewRole
      aws-region: us-west-2
```

### Workflows Using IAM Role
1. **preview-deploy.yml** - PR preview environments
2. **qa-deploy.yml** - QA environment deployment (develop branch)
3. **staging-deploy.yml** - Staging environment deployment (main branch)

## Security Best Practices

### ✅ What We're Doing Right
1. **OIDC Authentication** - No long-lived AWS credentials stored in GitHub
2. **Least Privilege** - Role limited to specific S3 buckets and actions
3. **Repository Scoped** - Trust policy only allows our specific repository
4. **Short-lived Tokens** - OIDC tokens expire automatically
5. **No Secrets in Code** - No credentials hardcoded anywhere
6. **Audit Trail** - All AWS actions are logged via CloudTrail

### 🔒 Additional Security Measures
1. **Environment Protection** - GitHub environments can require approvals
2. **Branch Protection** - Workflows only run from specific branches
3. **Public Access Block** - S3 buckets configured with explicit public read policies only for static assets
4. **DNS Protection** - Route53 changes limited to jouster.org domain

## Deployment Environments

### Preview Environments
- **Trigger**: Pull requests to `develop` branch
- **Bucket Pattern**: `jouster-preview-pr-{PR_NUMBER}`
- **URL**: `http://jouster-preview-pr-{PR_NUMBER}.s3-website-us-west-2.amazonaws.com`
- **Cleanup**: Automatic when PR is closed

### QA Environment
- **Trigger**: Push to `develop` branch or merged PR
- **Bucket**: `qa.jouster.org`
- **URL**: https://qa.jouster.org
- **Purpose**: Testing before staging

### Staging Environment
- **Trigger**: Push to `main` branch or merged PR
- **Bucket**: `stg.jouster.org`
- **URL**: https://stg.jouster.org
- **Purpose**: Pre-production validation

## Troubleshooting

### Workflow Fails with "Access Denied"
1. Verify the IAM role ARN is correct in the workflow
2. Check the trust policy allows the repository
3. Verify the OIDC provider is configured in AWS
4. Check the bucket name matches the policy permissions

### OIDC Token Errors
1. Ensure `permissions: id-token: write` is set in the workflow
2. Verify the AWS account has the OIDC provider configured
3. Check the trust relationship conditions

### S3 Bucket Access Issues
1. Verify bucket name matches the policy resource patterns
2. Check public access block settings
3. Verify bucket policy is correctly applied

## Maintenance

### Regular Reviews
- Review IAM policies quarterly for least privilege
- Audit CloudTrail logs for unusual activity
- Update trust policies if repository is renamed/moved
- Rotate any backup credentials if they exist

### Updating Permissions
If you need to add new buckets or permissions:
1. Update the `GitHubActionsPreviewPolicy` in AWS IAM
2. Test changes in a preview environment first
3. Document changes in this file
4. Commit policy updates to version control

## References
- [AWS OIDC for GitHub Actions](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)

---

**Last Updated**: October 20, 2025
**Role Last Used**: October 14, 2025 at 06:19:38 UTC

