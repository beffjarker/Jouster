# AWS IAM OIDC Setup - Quick Reference

## Prerequisites
- AWS CLI installed and configured
- Administrator access to AWS account
- GitHub repository: `beffjarker/Jouster`

## Quick Start Commands

```bash
# Run the automated setup script
cd aws/scripts
chmod +x manual-setup-commands.sh
./manual-setup-commands.sh
```

## Manual Step-by-Step

### 1. Get AWS Account ID
```bash
aws sts get-caller-identity --query Account --output text
```

### 2. Create IAM Policy
```bash
aws iam create-policy \
    --policy-name GitHubActionsPreviewPolicy \
    --policy-document file://aws/policies/github-actions-preview-policy.json \
    --description "Policy for GitHub Actions to manage Jouster preview environments"
```

### 3. Create IAM Role with Trust Policy
```bash
# Trust policy is generated dynamically in the script
# Allows GitHub Actions from beffjarker/Jouster repository
aws iam create-role \
    --role-name GitHubActionsPreviewRole \
    --assume-role-policy-document file:///tmp/github-trust-policy.json
```

### 4. Attach Policy to Role
```bash
aws iam attach-role-policy \
    --role-name GitHubActionsPreviewRole \
    --policy-arn "arn:aws:iam::ACCOUNT_ID:policy/GitHubActionsPreviewPolicy"
```

### 5. Create OIDC Provider
```bash
# Recommended: Use established thumbprint
aws iam create-open-id-connect-provider \
    --url "https://token.actions.githubusercontent.com" \
    --client-id-list "sts.amazonaws.com" \
    --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1"

# Alternative: Let AWS auto-detect thumbprint
aws iam create-open-id-connect-provider \
    --url "https://token.actions.githubusercontent.com" \
    --client-id-list "sts.amazonaws.com"
```

## Verification

### Check OIDC Provider
```bash
# List all OIDC providers
aws iam list-open-id-connect-providers

# Get specific provider details
aws iam get-open-id-connect-provider \
    --open-id-connect-provider-arn arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com
```

### Check IAM Role
```bash
# Get role details
aws iam get-role --role-name GitHubActionsPreviewRole

# Get role's trust policy
aws iam get-role --role-name GitHubActionsPreviewRole \
    --query 'Role.AssumeRolePolicyDocument' \
    --output json
```

### Check Policy Attachment
```bash
# List attached policies
aws iam list-attached-role-policies --role-name GitHubActionsPreviewRole

# Get policy document
aws iam get-policy-version \
    --policy-arn arn:aws:iam::ACCOUNT_ID:policy/GitHubActionsPreviewPolicy \
    --version-id v1
```

## GitHub Secrets Configuration

After running the setup, add this secret to your GitHub repository:

1. Go to: `https://github.com/beffjarker/Jouster/settings/secrets/actions`
2. Click "New repository secret"
3. Name: `AWS_ROLE_ARN`
4. Value: `arn:aws:iam::ACCOUNT_ID:role/GitHubActionsPreviewRole`

## Troubleshooting

### Error: Provider Already Exists
```bash
# Delete existing provider
aws iam delete-open-id-connect-provider \
    --open-id-connect-provider-arn arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com
```

### Error: Role Already Exists
```bash
# Delete existing role (detach policies first)
aws iam detach-role-policy \
    --role-name GitHubActionsPreviewRole \
    --policy-arn arn:aws:iam::ACCOUNT_ID:policy/GitHubActionsPreviewPolicy

aws iam delete-role --role-name GitHubActionsPreviewRole
```

### Error: Policy Already Exists
```bash
# List policy versions
aws iam list-policy-versions \
    --policy-arn arn:aws:iam::ACCOUNT_ID:policy/GitHubActionsPreviewPolicy

# Delete policy (detach from all roles first)
aws iam delete-policy \
    --policy-arn arn:aws:iam::ACCOUNT_ID:policy/GitHubActionsPreviewPolicy
```

### Test OIDC Authentication
Create a test GitHub Actions workflow:

```yaml
name: Test AWS OIDC
on: workflow_dispatch

permissions:
  id-token: write
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1
      
      - name: Test AWS Access
        run: |
          aws sts get-caller-identity
          aws s3 ls
```

## Important Notes

1. **Thumbprint**: The value `6938fd4d98bab03faadb97b34396831e3780aea1` is verified and widely used
2. **Trust Policy**: Restricts access to `beffjarker/Jouster` repository only
3. **Permissions**: Policy grants minimum required permissions for preview environments
4. **Region**: Default region is `us-east-1` (can be changed in workflow)

## Security Considerations

- The role can only be assumed by GitHub Actions from your specific repository
- The `sub` claim in the trust policy restricts which workflows can assume the role
- Consider adding environment-specific conditions for production deployments
- Regularly review and rotate IAM permissions
- Monitor CloudTrail logs for unexpected AssumeRoleWithWebIdentity calls

## Resources

- [GitHub OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS IAM OIDC Documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [aws-actions/configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials)
- [Thumbprint Research](./THUMBPRINT-RESEARCH.md)

