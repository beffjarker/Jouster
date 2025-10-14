#!/bin/bash
# Staging Environment Deployment Script for stg.jouster.org
# This script deploys the application to the staging environment (green)

echo "========================================"
echo "JOUSTER STAGING DEPLOYMENT (GREEN)"
echo "========================================"

echo "[1/5] Building application for staging..."
npm run build:prod
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "[2/5] Creating staging S3 bucket if needed..."
if ! aws s3api head-bucket --bucket stg.jouster.org --region us-west-2 2>/dev/null; then
    echo "Creating staging S3 bucket..."
    aws s3 mb s3://stg.jouster.org --region us-west-2

    # Configure bucket for static website hosting
    aws s3 website s3://stg.jouster.org --index-document index.html --error-document index.html

    # Remove public access blocks
    aws s3api put-public-access-block \
        --bucket stg.jouster.org \
        --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

    # Apply public read policy
    aws s3api put-bucket-policy \
        --bucket stg.jouster.org \
        --policy file://aws/policies/staging-bucket-policy.json

    echo "✅ Staging S3 bucket created and configured"
else
    echo "Staging S3 bucket already exists"
fi

echo "[3/5] Deploying application to staging S3 bucket (green environment)..."
aws s3 sync dist/jouster/browser/ s3://stg.jouster.org --delete --region us-west-2
if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo "[4/5] Setting up staging DNS record..."
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='jouster.org.'].Id" --output text | sed 's|/hostedzone/||')

if [ -n "$HOSTED_ZONE_ID" ]; then
    echo "Checking DNS record for stg.jouster.org..."
    RECORD_EXISTS=$(aws route53 list-resource-record-sets \
        --hosted-zone-id $HOSTED_ZONE_ID \
        --query "ResourceRecordSets[?Name=='stg.jouster.org.' && Type=='CNAME']" \
        --output text)

    if [ -z "$RECORD_EXISTS" ]; then
        echo "Creating DNS record for stg.jouster.org..."
        aws route53 change-resource-record-sets \
            --hosted-zone-id $HOSTED_ZONE_ID \
            --change-batch file://aws/configs/staging-dns-record.json
        echo "✅ DNS record created for stg.jouster.org"
    else
        echo "DNS record for stg.jouster.org already exists"
    fi
else
    echo "⚠️ No hosted zone found for jouster.org - staging accessible via S3 endpoint only"
fi

echo "[5/5] Deployment complete!"
echo
echo "========================================"
echo "STAGING DEPLOYMENT COMPLETE (GREEN)"
echo "========================================"
echo "Staging Environment URLs:"
echo "- Custom Domain: https://stg.jouster.org"
echo "- S3 Direct: http://stg.jouster.org.s3-website-us-west-2.amazonaws.com"
echo
echo "Build deployed from main branch to GREEN environment"
echo "Timestamp: $(date)"
echo
