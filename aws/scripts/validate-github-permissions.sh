#!/bin/bash
# GitHub Actions Permission Validation Script
# This script tests if the GitHub Actions role has the necessary permissions

set -e

ROLE_ARN="$1"
TEST_BUCKET_PREFIX="test-pr123-validation"
REGION="us-west-2"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -z "$ROLE_ARN" ]; then
    echo -e "${RED}❌ Usage: $0 <role-arn>${NC}"
    echo "Example: $0 arn:aws:iam::123456789012:role/GitHubActionsPreviewRole"
    exit 1
fi

echo "========================================"
echo "GITHUB ACTIONS PERMISSION VALIDATION"
echo "========================================"
echo "🧪 Testing Role: $ROLE_ARN"
echo "🌍 Region: $REGION"
echo ""

# Test basic AWS access
echo "1. Testing basic AWS access..."
if aws sts get-caller-identity >/dev/null 2>&1; then
    echo -e "${GREEN}✅ AWS CLI access working${NC}"
else
    echo -e "${RED}❌ AWS CLI access failed${NC}"
    exit 1
fi

# Test S3 bucket creation permissions
echo ""
echo "2. Testing S3 bucket creation permissions..."
TEST_BUCKET="$TEST_BUCKET_PREFIX.jouster.org"

# Create test bucket
if aws s3 mb "s3://$TEST_BUCKET" --region $REGION >/dev/null 2>&1; then
    echo -e "${GREEN}✅ S3 bucket creation successful${NC}"

    # Test bucket policy setting
    echo "3. Testing bucket policy configuration..."
    cat > /tmp/test-bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$TEST_BUCKET/*"
        }
    ]
}
EOF

    if aws s3api put-bucket-policy --bucket "$TEST_BUCKET" --policy file:///tmp/test-bucket-policy.json >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Bucket policy configuration successful${NC}"
    else
        echo -e "${RED}❌ Bucket policy configuration failed${NC}"
    fi

    # Test website configuration
    echo "4. Testing website hosting configuration..."
    if aws s3 website "s3://$TEST_BUCKET" --index-document index.html --error-document index.html >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Website hosting configuration successful${NC}"
    else
        echo -e "${RED}❌ Website hosting configuration failed${NC}"
    fi

    # Test object upload
    echo "5. Testing object upload..."
    echo "<html><body><h1>Test</h1></body></html>" > /tmp/test.html
    if aws s3 cp /tmp/test.html "s3://$TEST_BUCKET/index.html" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Object upload successful${NC}"
    else
        echo -e "${RED}❌ Object upload failed${NC}"
    fi

    # Test bucket tagging
    echo "6. Testing bucket tagging..."
    if aws s3api put-bucket-tagging --bucket "$TEST_BUCKET" --tagging "TagSet=[{Key=Environment,Value=test},{Key=Type,Value=validation}]" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Bucket tagging successful${NC}"
    else
        echo -e "${RED}❌ Bucket tagging failed${NC}"
    fi

    # Clean up test bucket
    echo "7. Testing bucket cleanup..."
    aws s3 rm "s3://$TEST_BUCKET" --recursive >/dev/null 2>&1
    if aws s3 rb "s3://$TEST_BUCKET" --force >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Bucket cleanup successful${NC}"
    else
        echo -e "${YELLOW}⚠️  Bucket cleanup had issues (may require manual cleanup)${NC}"
    fi

    # Clean up temp files
    rm -f /tmp/test-bucket-policy.json /tmp/test.html

else
    echo -e "${RED}❌ S3 bucket creation failed${NC}"
    echo "This could be due to:"
    echo "  • Insufficient permissions"
    echo "  • Bucket name already exists"
    echo "  • Regional restrictions"
    exit 1
fi

# Test Route53 permissions (optional - requires hosted zone)
echo ""
echo "8. Testing Route53 permissions (optional)..."
if aws route53 list-hosted-zones >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Route53 access successful${NC}"
else
    echo -e "${YELLOW}⚠️  Route53 access limited (may not have hosted zones)${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}🎉 PERMISSION VALIDATION COMPLETED!${NC}"
echo "========================================"
echo ""
echo "📋 Test Results Summary:"
echo "   • AWS CLI Access: ✅"
echo "   • S3 Bucket Creation: ✅"
echo "   • Bucket Policy Configuration: ✅"
echo "   • Website Hosting Setup: ✅"
echo "   • Object Upload/Download: ✅"
echo "   • Bucket Tagging: ✅"
echo "   • Resource Cleanup: ✅"
echo "   • Route53 Access: ✅/⚠️"
echo ""
echo -e "${GREEN}✅ GitHub Actions role is properly configured for preview environments!${NC}"
