#!/bin/bash
# Manual Preview Deployment Script
# Use this until GitHub Actions npm install issue is resolved

set -e

PR_NUMBER=$1

if [ -z "$PR_NUMBER" ]; then
    echo "❌ Error: PR number required"
    echo "Usage: ./deploy-preview-manual.sh <pr-number>"
    echo "Example: ./deploy-preview-manual.sh 11"
    exit 1
fi

BUCKET_NAME="jouster-preview-pr${PR_NUMBER}-feature-v002-preview-test"
PREVIEW_URL="http://${BUCKET_NAME}.s3-website-us-west-2.amazonaws.com"

echo "========================================"
echo "MANUAL PREVIEW DEPLOYMENT"
echo "========================================"
echo "📦 PR: #${PR_NUMBER}"
echo "🪣 Bucket: ${BUCKET_NAME}"
echo "🌐 URL: ${PREVIEW_URL}"
echo "========================================"

# Check if dist exists
if [ ! -d "dist/apps/jouster-ui/browser" ]; then
    echo ""
    echo "🔨 Building application..."
    npm run build:prod
fi

echo ""
echo "☁️  Creating/updating S3 bucket..."
aws s3 mb "s3://${BUCKET_NAME}" --region us-west-2 || echo "Bucket already exists"

echo ""
echo "🌐 Configuring static website hosting..."
aws s3 website "s3://${BUCKET_NAME}" \
    --index-document index.html \
    --error-document index.html

echo ""
echo "🔓 Configuring public access..."
aws s3api put-public-access-block \
    --bucket "${BUCKET_NAME}" \
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

echo ""
echo "📜 Applying bucket policy..."
cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy \
    --bucket "${BUCKET_NAME}" \
    --policy file:///tmp/bucket-policy.json

echo ""
echo "📤 Uploading files to S3..."
aws s3 sync dist/apps/jouster-ui/browser/ "s3://${BUCKET_NAME}" \
    --delete \
    --cache-control "max-age=300"

echo ""
echo "========================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "🌐 Preview URL:"
echo "   ${PREVIEW_URL}"
echo ""
echo "📝 To post to PR, run:"
echo "   gh pr comment ${PR_NUMBER} --body \"🎉 Preview deployed: ${PREVIEW_URL}\""
echo ""
echo "🧹 To cleanup later, run:"
echo "   aws s3 rb s3://${BUCKET_NAME} --force"
echo ""

