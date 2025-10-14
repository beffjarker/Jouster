#!/bin/bash
# GitHub Actions AWS IAM Setup Script
# This script sets up the necessary AWS IAM permissions for preview environments

set -e

ACCOUNT_ID=""
GITHUB_REPO="beffjarker/Jouster"
ROLE_NAME="GitHubActionsPreviewRole"
POLICY_NAME="GitHubActionsPreviewPolicy"
REGION="us-west-2"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "GITHUB ACTIONS AWS IAM SETUP"
echo "========================================"

# Get AWS Account ID
echo "🔍 Getting AWS Account ID..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$ACCOUNT_ID" ]; then
    echo -e "${RED}❌ Failed to get AWS Account ID. Make sure AWS CLI is configured.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ AWS Account ID: $ACCOUNT_ID${NC}"

# Create IAM policy
echo ""
echo "📋 Creating IAM policy for GitHub Actions..."
POLICY_ARN="arn:aws:iam::$ACCOUNT_ID:policy/$POLICY_NAME"

# Check if policy already exists
if aws iam get-policy --policy-arn "$POLICY_ARN" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Policy $POLICY_NAME already exists. Updating...${NC}"

    # Get current policy version
    CURRENT_VERSION=$(aws iam get-policy --policy-arn "$POLICY_ARN" --query 'Policy.DefaultVersionId' --output text)

    # Create new version
    aws iam create-policy-version \
        --policy-arn "$POLICY_ARN" \
        --policy-document file://aws/policies/github-actions-preview-policy.json \
        --set-as-default

    # Delete old version if it's not v1
    if [ "$CURRENT_VERSION" != "v1" ]; then
        aws iam delete-policy-version \
            --policy-arn "$POLICY_ARN" \
            --version-id "$CURRENT_VERSION"
    fi

    echo -e "${GREEN}✅ Policy updated successfully${NC}"
else
    # Create new policy
    aws iam create-policy \
        --policy-name "$POLICY_NAME" \
        --policy-document file://aws/policies/github-actions-preview-policy.json \
        --description "Policy for GitHub Actions to manage Jouster preview environments"

    echo -e "${GREEN}✅ Policy created successfully${NC}"
fi

# Create trust policy for GitHub Actions OIDC
echo ""
echo "🔐 Creating trust policy for GitHub Actions OIDC..."
cat > /tmp/github-trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::$ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                },
                "StringLike": {
                    "token.actions.githubusercontent.com:sub": "repo:$GITHUB_REPO:*"
                }
            }
        }
    ]
}
EOF

# Create IAM role
echo "👤 Creating IAM role for GitHub Actions..."
ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME"

if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Role $ROLE_NAME already exists. Updating trust policy...${NC}"

    # Update trust policy
    aws iam update-assume-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-document file:///tmp/github-trust-policy.json

    echo -e "${GREEN}✅ Role trust policy updated${NC}"
else
    # Create new role
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document file:///tmp/github-trust-policy.json \
        --description "Role for GitHub Actions to deploy Jouster preview environments"

    echo -e "${GREEN}✅ Role created successfully${NC}"
fi

# Attach policy to role
echo ""
echo "🔗 Attaching policy to role..."
aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "$POLICY_ARN"

echo -e "${GREEN}✅ Policy attached to role${NC}"

# Setup GitHub OIDC provider if it doesn't exist
echo ""
echo "🌐 Setting up GitHub OIDC provider..."
OIDC_PROVIDER_ARN="arn:aws:iam::$ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"

if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_PROVIDER_ARN" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  GitHub OIDC provider already exists${NC}"
else
    # Get GitHub's OIDC thumbprint
    THUMBPRINT="6938fd4d98bab03faadb97b34396831e3780aea1"

    aws iam create-open-id-connect-provider \
        --url "https://token.actions.githubusercontent.com" \
        --client-id-list "sts.amazonaws.com" \
        --thumbprint-list "$THUMBPRINT"

    echo -e "${GREEN}✅ GitHub OIDC provider created${NC}"
fi

# Clean up temporary files
rm -f /tmp/github-trust-policy.json

echo ""
echo "========================================"
echo -e "${GREEN}🎉 SETUP COMPLETED SUCCESSFULLY!${NC}"
echo "========================================"
echo ""
echo "📋 Summary:"
echo "   • AWS Account ID: $ACCOUNT_ID"
echo "   • IAM Role ARN: $ROLE_ARN"
echo "   • IAM Policy ARN: $POLICY_ARN"
echo "   • GitHub Repository: $GITHUB_REPO"
echo "   • AWS Region: $REGION"
echo ""
echo "🔧 Next Steps:"
echo ""
echo "1. Add the following secret to your GitHub repository:"
echo "   Name: AWS_ROLE_ARN"
echo -e "   Value: ${YELLOW}$ROLE_ARN${NC}"
echo ""
echo "2. Go to: https://github.com/$GITHUB_REPO/settings/secrets/actions"
echo ""
echo "3. Click 'New repository secret' and add:"
echo "   • Name: AWS_ROLE_ARN"
echo "   • Value: $ROLE_ARN"
echo ""
echo "4. Your preview environment system is now ready!"
echo ""
echo "🧪 Test the system by:"
echo "   • Creating a new PR against develop branch"
echo "   • The GitHub Action should automatically deploy a preview environment"
echo "   • Check PR comments for deployment URLs"
echo ""
echo -e "${GREEN}✅ Preview environment CI/CD system is ready!${NC}"
