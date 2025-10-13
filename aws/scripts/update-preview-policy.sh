#!/bin/bash
# Update the GitHub Actions Preview Role IAM Policy

echo "Updating GitHubActionsPreviewRole IAM policy..."

# Get the role's attached policies
echo "Fetching current policy ARN..."
POLICY_ARN=$(aws iam list-attached-role-policies \
    --role-name GitHubActionsPreviewRole \
    --query "AttachedPolicies[?contains(PolicyName, 'Preview')].PolicyArn" \
    --output text)

if [ -z "$POLICY_ARN" ]; then
    echo "ERROR: Could not find preview policy attached to GitHubActionsPreviewRole"
    echo "Please check the role name and policy attachment"
    exit 1
fi

echo "Found policy: $POLICY_ARN"

# Create a new policy version with the updated permissions
echo "Creating new policy version..."
aws iam create-policy-version \
    --policy-arn "$POLICY_ARN" \
    --policy-document file://aws/policies/github-actions-preview-policy.json \
    --set-as-default

if [ $? -eq 0 ]; then
    echo "SUCCESS: IAM policy updated successfully!"
    echo "The new permissions include:"
    echo "  - s3:PutBucketPublicAccessBlock"
    echo "  - s3:GetBucketPublicAccessBlock"
    echo "  - s3:DeleteBucketPublicAccessBlock"
    echo ""
    echo "The GitHub Actions workflow can now modify public access settings on preview buckets."
else
    echo "ERROR: Failed to update IAM policy"
    echo "Please check your AWS credentials and permissions"
    exit 1
fi

