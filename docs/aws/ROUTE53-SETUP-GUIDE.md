# Route 53 IAM Permissions Setup Guide

## Current Status
- **AWS Account**: 924677642513
- **Current User**: arn:aws:iam::924677642513:user/jouster-dev
- **Issue**: User lacks IAM management permissions

## Manual Setup Required

Since the current user doesn't have IAM policy management permissions, you'll need to apply the Route 53 permissions manually through the AWS Console.

### Option 1: Apply via AWS Console (Recommended)

1. **Login to AWS Console** as an administrator or user with IAM permissions
2. **Navigate to IAM** → Policies
3. **Create Policy**:
   - Click "Create policy"
   - Select "JSON" tab
   - Copy the contents from `../policies/route53-permissions-policy.json`
   - Name it: `JousterRoute53Policy`
   - Description: `IAM policy for Jouster Route 53 operations`
   - Click "Create policy"

4. **Attach Policy to User**:
   - Navigate to IAM → Users
   - Find and click on `jouster-dev`
   - Click "Add permissions" → "Attach policies directly"
   - Search for `JousterRoute53Policy`
   - Select it and click "Add permissions"

### Option 2: Apply via AWS CLI (If you have admin credentials)

If you have access to AWS CLI with administrator permissions, run:

```bash
# Create the policy
aws iam create-policy \
    --policy-name JousterRoute53Policy \
    --policy-document file://../policies/route53-permissions-policy.json \
    --description "IAM policy for Jouster Route 53 operations"

# Attach to user
aws iam attach-user-policy \
    --user-name jouster-dev \
    --policy-arn arn:aws:iam::924677642513:policy/JousterRoute53Policy
```

### Verification

After applying the permissions, run:
```
verify-route53-permissions.cmd
```

This will test that all Route 53, CloudFront, and Certificate Manager permissions are working correctly.

## Next Steps

Once permissions are applied:
1. Run `verify-route53-permissions.cmd` to confirm access
2. Run `setup-route53.cmd` to configure DNS for jouster.org
3. Set up SSL certificates and CloudFront distribution

## Permissions Included

The policy grants access to:
- **Route 53**: DNS management, hosted zones, health checks
- **CloudFront**: CDN distribution management and invalidations  
- **Certificate Manager**: SSL certificate operations

## Security Note

These permissions are scoped appropriately for DNS and CDN management. The policy follows AWS security best practices with minimal required permissions.
