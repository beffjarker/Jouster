#!/bin/bash
# Preview Environment Deployment Script
# This script deploys a feature branch to a unique S3 bucket for preview

set -e

BUCKET_NAME="$1"
PR_NUMBER="$2"

if [ -z "$BUCKET_NAME" ] || [ -z "$PR_NUMBER" ]; then
    echo "❌ Usage: $0 <bucket-name> <pr-number>"
    exit 1
fi

echo "========================================"
echo "JOUSTER PREVIEW DEPLOYMENT"
echo "========================================"
echo "📦 Bucket: $BUCKET_NAME"
echo "🔢 PR: #$PR_NUMBER"
echo "🌍 Region: us-west-2"
echo "========================================"

# Check if build directory exists
if [ ! -d "dist/apps/jouster-ui" ]; then
    echo "❌ Build directory not found. Make sure 'npm run build:prod' was successful."
    exit 1
fi

echo "[1/6] Creating preview S3 bucket..."
if aws s3api head-bucket --bucket "$BUCKET_NAME" --region us-west-2 2>/dev/null; then
    echo "✅ Bucket $BUCKET_NAME already exists"
else
    echo "🆕 Creating bucket $BUCKET_NAME..."
    aws s3 mb "s3://$BUCKET_NAME" --region us-west-2
fi

echo "[2/6] Configuring bucket for static website hosting..."
aws s3 website "s3://$BUCKET_NAME" \
    --index-document index.html \
    --error-document index.html

echo "[3/6] Configuring public access..."
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

echo "[4/6] Applying bucket policy for public read access..."
cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy \
    --bucket "$BUCKET_NAME" \
    --policy file:///tmp/bucket-policy.json

echo "[5/6] Uploading files to S3..."
aws s3 sync dist/apps/jouster-ui/ "s3://$BUCKET_NAME" \
    --delete \
    --cache-control "max-age=86400" \
    --exclude "*.map"

echo "[6/6] Setting up cache headers for static assets..."
# Set longer cache for static assets
aws s3 cp "s3://$BUCKET_NAME" "s3://$BUCKET_NAME" \
    --recursive \
    --exclude "*" \
    --include "*.js" \
    --include "*.css" \
    --include "*.png" \
    --include "*.jpg" \
    --include "*.jpeg" \
    --include "*.gif" \
    --include "*.svg" \
    --include "*.ico" \
    --cache-control "max-age=31536000" \
    --metadata-directive REPLACE

# Set short cache for HTML files
aws s3 cp "s3://$BUCKET_NAME" "s3://$BUCKET_NAME" \
    --recursive \
    --exclude "*" \
    --include "*.html" \
    --cache-control "max-age=300" \
    --metadata-directive REPLACE

echo ""
echo "🎉 Preview deployment completed successfully!"
echo ""
echo "📍 Preview URLs:"
echo "   • S3 Website: http://$BUCKET_NAME.s3-website-us-west-2.amazonaws.com"
echo "   • Custom Domain: https://$BUCKET_NAME (requires DNS setup)"
echo ""
echo "🏷️  Environment Tags:"
echo "   • Type: preview"
echo "   • PR: #$PR_NUMBER"
echo "   • Region: us-west-2"
echo ""

# Tag the bucket for tracking
aws s3api put-bucket-tagging \
    --bucket "$BUCKET_NAME" \
    --tagging "TagSet=[
        {Key=Environment,Value=preview},
        {Key=PR,Value=$PR_NUMBER},
        {Key=Type,Value=feature-branch},
        {Key=AutoCleanup,Value=true}
    ]"

echo "✅ Deployment completed and tagged for tracking"
