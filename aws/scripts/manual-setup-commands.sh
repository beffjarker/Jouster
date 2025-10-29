# Manual AWS IAM Setup Commands
# Run these commands in your local terminal with AWS CLI configured

# 1. Get your AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account ID: $ACCOUNT_ID"

# 2. Create the IAM policy
aws iam create-policy \
    --policy-name GitHubActionsPreviewPolicy \
    --policy-document file://aws/policies/github-actions-preview-policy.json \
    --description "Policy for GitHub Actions to manage Jouster preview environments"

# 3. Create the trust policy file
cat > /tmp/github-trust-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
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
EOF

# Replace ACCOUNT_ID in the trust policy
sed -i "s/ACCOUNT_ID/$ACCOUNT_ID/g" /tmp/github-trust-policy.json

# 4. Create the IAM role
aws iam create-role \
    --role-name GitHubActionsPreviewRole \
    --assume-role-policy-document file:///tmp/github-trust-policy.json \
    --description "Role for GitHub Actions to deploy Jouster preview environments"

# 5. Attach the policy to the role
aws iam attach-role-policy \
    --role-name GitHubActionsPreviewRole \
    --policy-arn "arn:aws:iam::$ACCOUNT_ID:policy/GitHubActionsPreviewPolicy"

# 6. Create GitHub OIDC provider (if it doesn't exist)
#
# THUMBPRINT NOTES:
# - AWS now validates the entire certificate chain (as of June 2022)
# - The thumbprint 6938fd4d98bab03faadb97b34396831e3780aea1 is widely verified and working
# - Alternative: Let AWS CLI auto-detect by omitting --thumbprint-list
# - See THUMBPRINT-RESEARCH.md for detailed information
#
# Option A: Use established thumbprint (current approach - RECOMMENDED for consistency)
aws iam create-open-id-connect-provider \
    --url "https://token.actions.githubusercontent.com" \
    --client-id-list "sts.amazonaws.com" \
    --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1"

# Option B: Let AWS CLI auto-detect thumbprint (uncomment to use)
# aws iam create-open-id-connect-provider \
#     --url "https://token.actions.githubusercontent.com" \
#     --client-id-list "sts.amazonaws.com"

# Option C: Get current thumbprint dynamically (uncomment to use)
# THUMBPRINT=$(echo | openssl s_client -servername token.actions.githubusercontent.com \
#     -connect token.actions.githubusercontent.com:443 2>/dev/null \
#     | openssl x509 -fingerprint -sha1 -noout \
#     | sed 's/://g' | awk -F= '{print tolower($2)}')
# echo "Detected thumbprint: $THUMBPRINT"
# aws iam create-open-id-connect-provider \
#     --url "https://token.actions.githubusercontent.com" \
#     --client-id-list "sts.amazonaws.com" \
#     --thumbprint-list "$THUMBPRINT"

# 7. Display the Role ARN (you'll need this for GitHub secrets)
echo "Role ARN: arn:aws:iam::$ACCOUNT_ID:role/GitHubActionsPreviewRole"

# Clean up
rm -f /tmp/github-trust-policy.json
